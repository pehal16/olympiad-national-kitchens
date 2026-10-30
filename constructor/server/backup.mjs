import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { encrypt, decrypt } from "./transfer.mjs";
import { fail, hash, safePath, now, writePrivate } from "./util.mjs";
export async function backupInstallation(store, password) {
  const snapshot = await store.backup();
  const files = {
    "constructor.sqlite": new Uint8Array(fs.readFileSync(snapshot)),
  };
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile())
        files[path.relative(store.root, file).split(path.sep).join("/")] =
          new Uint8Array(fs.readFileSync(file));
    }
  }
  walk(path.join(store.root, "media"));
  walk(path.join(store.root, "documents"));
  const manifest = {
    version: 1,
    kind: "installation-backup",
    createdAt: now(),
    instanceId: store.meta("instanceId"),
    files: Object.fromEntries(
      Object.entries(files).map(([name, data]) => [
        name,
        { size: data.length, sha256: hash(data) },
      ]),
    ),
  };
  files["manifest.json"] = strToU8(JSON.stringify(manifest));
  try {
    return encrypt(zipSync(files, { level: 5 }), password);
  } finally {
    fail(
      path
        .resolve(snapshot)
        .startsWith(path.join(store.root, "backups") + path.sep),
      "Неверный путь временной копии.",
    );
    fs.rmSync(snapshot, { force: true });
  }
}
export function restoreInstallation(buffer, password, target) {
  const root = path.resolve(target);
  fail(
    !fs.existsSync(root) || fs.readdirSync(root).length === 0,
    "Для восстановления выберите новую пустую папку. Исходную установку заменять нельзя.",
  );
  const bytes = decrypt(buffer, password);
  let total = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      total += file.originalSize;
      fail(
        total <= 512 * 1024 * 1024 && file.originalSize <= 128 * 1024 * 1024,
        "Резервная копия слишком большая.",
      );
      fail(
        !file.name.includes("..") &&
          !file.name.includes("\\") &&
          !file.name.includes(":") &&
          !file.name.startsWith("/"),
        "Неверный путь в резервной копии.",
      );
      return true;
    },
  });
  const manifest = JSON.parse(
    strFromU8(files["manifest.json"] || new Uint8Array()),
  );
  fail(
    manifest.version === 1 && manifest.kind === "installation-backup",
    "Это не резервная копия установки.",
  );
  fail(
    Object.keys(files).every(
      (name) =>
        name === "manifest.json" || Object.hasOwn(manifest.files || {}, name),
    ),
    "В копии есть непроверенные файлы.",
  );
  fail(files["constructor.sqlite"], "В копии отсутствует база.");
  for (const [name, entry] of Object.entries(manifest.files)) {
    fail(
      name === "constructor.sqlite" ||
        name.startsWith("media/") ||
        name.startsWith("documents/"),
      "Недопустимый файл резервной копии.",
    );
    fail(
      files[name]?.length === entry.size && hash(files[name]) === entry.sha256,
      "Резервная копия повреждена.",
    );
  }
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  for (const [name, data] of Object.entries(files)) {
    if (name === "manifest.json") continue;
    const file = safePath(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data, { mode: 0o600 });
  }
  const database = new DatabaseSync(path.join(root, "constructor.sqlite"));
  try {
    const integrity = database.prepare("PRAGMA integrity_check").get();
    fail(
      Object.values(integrity)[0] === "ok",
      "Проверка целостности восстановленной базы не пройдена.",
    );
    database.exec("DELETE FROM sessions");
  } finally {
    database.close();
  }
  return {
    restored: true,
    instanceId: manifest.instanceId,
    files: Object.keys(manifest.files).length,
  };
}
export function backupSettings(store) {
  const file = path.join(store.root, "backup-settings.json");
  if (!fs.existsSync(file)) return { enabled: false };
  const settings = JSON.parse(fs.readFileSync(file, "utf8"));
  return {
    enabled: Boolean(settings.enabled),
    lastSuccessAt: settings.lastSuccessAt || null,
    lastError: settings.lastError || null,
  };
}
export function configureBackups(store, body) {
  fail(
    !body.enabled || String(body.password || "").length >= 10,
    "Для автоматических копий задайте пароль минимум из 10 символов.",
  );
  const file = path.join(store.root, "backup-settings.json");
  writePrivate(
    file,
    JSON.stringify({
      enabled: Boolean(body.enabled),
      password: body.password || "",
      lastSuccessAt: null,
    }),
  );
  return backupSettings(store);
}
export function scheduleBackups(store) {
  let running = false;
  const tick = async () => {
    const file = path.join(store.root, "backup-settings.json");
    if (running || !fs.existsSync(file)) return;
    const settings = JSON.parse(fs.readFileSync(file, "utf8"));
    if (
      !settings.enabled ||
      (settings.lastSuccessAt &&
        Date.now() - Date.parse(settings.lastSuccessAt) < 24 * 3600000)
    )
      return;
    running = true;
    try {
      const data = await backupInstallation(store, settings.password);
      const name =
        "backup-" +
        new Date().toISOString().replace(/[:.]/g, "-") +
        ".olybackup";
      writePrivate(path.join(store.root, "backups", name), data);
      settings.lastSuccessAt = now();
      settings.lastError = null;
      const files = fs
        .readdirSync(path.join(store.root, "backups"))
        .filter((x) => /^backup-[0-9TZ.-]+\.olybackup$/.test(x))
        .sort()
        .reverse();
      for (const old of files.slice(7))
        fs.rmSync(safePath(path.join(store.root, "backups"), old));
    } catch (e) {
      settings.lastError = e.message;
    } finally {
      writePrivate(file, JSON.stringify(settings));
      running = false;
    }
  };
  const timer = setInterval(tick, 60000);
  timer.unref();
  return { tick, stop: () => clearInterval(timer) };
}
