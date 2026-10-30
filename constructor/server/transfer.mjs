import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { id, now, fail, hash, safePath } from "./util.mjs";
import {
  attachPortableAssets,
  preparePortableAssets,
} from "./portable-assets.mjs";
const MAGIC = Buffer.from("OLYPACK1");
const MAX_PACKAGE = 512 * 1024 * 1024;
export function encrypt(bytes, password) {
  fail(
    typeof password === "string" && password.length >= 10,
    "Пароль пакета должен содержать минимум 10 символов.",
  );
  const salt = crypto.randomBytes(16),
    iv = crypto.randomBytes(12),
    key = crypto.scryptSync(password, salt, 32),
    cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), data]);
}
export function decrypt(bytes, password) {
  fail(
    bytes.length < MAX_PACKAGE &&
      bytes.length > 60 &&
      bytes.subarray(0, 8).equals(MAGIC),
    "Неверный формат пакета.",
  );
  try {
    const key = crypto.scryptSync(String(password), bytes.subarray(8, 24), 32),
      decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        bytes.subarray(24, 36),
      );
    decipher.setAuthTag(bytes.subarray(36, 52));
    return Buffer.concat([
      decipher.update(bytes.subarray(52)),
      decipher.final(),
    ]);
  } catch {
    fail(
      false,
      "Неверный пароль или повреждённый пакет.",
      400,
      "package_corrupt",
    );
  }
}
function mediaIds(value) {
  return [...new Set(JSON.stringify(value).match(/media_[a-f0-9-]+/g) || [])];
}
export function exportPackage(
  service,
  user,
  { kind, projectId, runId, password },
) {
  const s = service.store;
  let records = [];
  if (kind === "materials") {
    const p = service.get(user, "project", projectId);
    records.push({ kind: "project", value: p });
    for (const r of s.list("release", null, p.id))
      records.push({ kind: "release", value: r });
    for (const t of service.templates(user))
      records.push({ kind: "template", value: t });
  } else {
    fail(kind === "results", "Неизвестный вид пакета.");
    const run = service.get(user, "run", runId);
    const attempts = s.list("attempt", null, runId);
    fail(
      attempts.every((a) => a.status === "completed" || a.excludedFromResults),
      "Сначала завершите все попытки.",
      409,
    );
    records.push(
      { kind: "run", value: run },
      { kind: "release", value: s.get("release", run.releaseId) },
    );
    const project = s.get("project", run.projectId);
    if (project) records.push({ kind: "project", value: project });
    for (const templateId of [
      ...new Set(
        (s.get("release", run.releaseId).awardRules || [])
          .map((r) => r.templateId)
          .filter(Boolean),
      ),
    ]) {
      records.push({
        kind: "template",
        value: service.get(user, "template", templateId),
      });
    }
    for (const a of attempts) records.push({ kind: "attempt", value: a });
    for (const p of s.list("participant", null, runId))
      records.push({ kind: "participant", value: { ...p, codeHash: null } });
    for (const issue of s.list("issue", null, runId))
      records.push({ kind: "issue", value: issue });
  }
  const files = {};
  for (const mid of mediaIds(records)) {
    const m = s.get("media", mid);
    if (m) {
      records.push({ kind: "media", value: m });
      const f = safePath(s.root, m.relativePath);
      if (fs.existsSync(f))
        files[m.relativePath] = new Uint8Array(fs.readFileSync(f));
    }
  }
  for (const record of records.filter((x) => x.kind === "issue")) {
    const f = safePath(s.root, record.value.relativePath);
    if (fs.existsSync(f))
      files[record.value.relativePath] = new Uint8Array(fs.readFileSync(f));
  }
  const portableAssets = attachPortableAssets(service, records, files);
  const manifest = {
    version: 1,
    kind,
    portableAssets,
    sourceInstance: s.meta("instanceId"),
    createdAt: now(),
    records,
    files: Object.fromEntries(
      Object.entries(files).map(([name, bytes]) => [
        name,
        { sha256: hash(bytes), size: bytes.length },
      ]),
    ),
  };
  files["manifest.json"] = strToU8(JSON.stringify(manifest));
  const bytes = zipSync(files, { level: 5 });
  s.audit(user.id, "package.exported", projectId || runId, { kind });
  return encrypt(bytes, password);
}
export function inspectPackage(service, user, buffer, password) {
  const bytes = decrypt(buffer, password);
  let expanded = 0,
    files;
  try {
    files = unzipSync(new Uint8Array(bytes), {
      filter: (entry) => {
        fail(
          entry.originalSize <= 128 * 1024 * 1024,
          "Файл в пакете слишком большой.",
        );
        expanded += entry.originalSize;
        fail(expanded < MAX_PACKAGE, "Распакованный пакет слишком большой.");
        fail(
          !entry.name.includes("..") &&
            !entry.name.startsWith("/") &&
            !entry.name.includes("\\") &&
            !entry.name.includes(":"),
          "Недопустимый путь внутри пакета.",
        );
        return true;
      },
    });
  } catch (e) {
    fail(false, e.message || "Повреждённый архив.");
  }
  const manifest = JSON.parse(
    strFromU8(files["manifest.json"] || new Uint8Array()),
  );
  fail(
    manifest.version === 1 &&
      ["materials", "results"].includes(manifest.kind) &&
      Array.isArray(manifest.records),
    "Версия пакета не поддерживается.",
  );
  fail(
    Object.keys(files).every(
      (name) =>
        name === "manifest.json" || Object.hasOwn(manifest.files || {}, name),
    ),
    "В пакете есть файлы вне проверяемого состава.",
  );
  const allowed = new Set([
    "project",
    "release",
    "template",
    "run",
    "attempt",
    "participant",
    "media",
    "issue",
  ]);
  for (const r of manifest.records) {
    fail(
      allowed.has(r.kind) && typeof r.value?.id === "string",
      "Неверная запись в пакете.",
    );
    if (r.kind === "attempt")
      fail(
        r.value.status === "completed" || r.value.excludedFromResults,
        "Пакет содержит активную попытку.",
      );
  }
  for (const [name, entry] of Object.entries(manifest.files || {})) {
    fail(
      files[name] &&
        files[name].length === entry.size &&
        hash(files[name]) === entry.sha256,
      "Контрольная сумма не совпала.",
    );
  }
  const packageHash = hash(buffer),
    contentHash = hash({
      sourceInstance: manifest.sourceInstance,
      kind: manifest.kind,
      records: manifest.records,
      files: manifest.files,
    }),
    receiptKey = hash(contentHash + ":" + user.id);
  const duplicate = service.store.db
    .prepare("SELECT 1 FROM imports WHERE hash=?")
    .get(receiptKey);
  const conflicts = manifest.records
    .filter((r) => {
      const old = service.store.get(r.kind, r.value.id);
      return (
        old &&
        hash({
          ...old,
          owner: undefined,
          revision: undefined,
          updatedAt: undefined,
        }) !==
          hash({
            ...r.value,
            owner: undefined,
            revision: undefined,
            updatedAt: undefined,
          })
      );
    })
    .map((r) => ({
      id: r.value.id,
      kind: r.kind,
      title: r.value.title || r.value.participant?.fullName || r.value.id,
    }));
  return {
    manifest,
    files,
    packageHash,
    receiptKey,
    preview: {
      kind: manifest.kind,
      createdAt: manifest.createdAt,
      sourceInstance: manifest.sourceInstance,
      records: manifest.records.length,
      files: Object.keys(manifest.files || {}).length,
      conflicts,
      duplicate: Boolean(duplicate),
    },
  };
}
export function importPackage(service, user, buffer, password, confirmedHash) {
  const parsed = inspectPackage(service, user, buffer, password);
  fail(
    parsed.packageHash === confirmedHash,
    "Пакет изменился после предпросмотра.",
  );
  if (parsed.preview.duplicate) return { duplicate: true, imported: 0 };
  const s = service.store,
    map = new Map(),
    portable = preparePortableAssets(parsed, user);
  for (const r of parsed.manifest.records) {
    const old = s.get(r.kind, r.value.id);
    map.set(
      r.value.id,
      old ||
        (r.value.relativePath &&
          fs.existsSync(safePath(s.root, r.value.relativePath)))
        ? id(r.kind)
        : r.value.id,
    );
  }
  const rewrite = (value) => {
    if (typeof value === "string") {
      let text = value;
      for (const [old, next] of portable.replacements)
        text = text.replaceAll(old, next);
      for (const [old, next] of map)
        if (old !== next) text = text.replaceAll(old, next);
      return text;
    }
    if (Array.isArray(value)) return value.map(rewrite);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value)
          .filter(([k]) => !["codeHash"].includes(k))
          .map(([k, v]) => [k, rewrite(v)]),
      );
    return value;
  };
  const written = [];
  try {
    for (const [name, bytes] of Object.entries({
      ...Object.fromEntries(
        Object.entries(parsed.files).filter(
          ([name]) => name !== "manifest.json" && !name.startsWith("portable/"),
        ),
      ),
      ...portable.files,
    })) {
      if (name === "manifest.json") continue;
      const replacement = rewrite(name);
      fail(
        replacement.startsWith("media/") ||
          replacement.startsWith("documents/"),
        "Недопустимая категория файла.",
      );
      const dest = safePath(s.root, replacement);
      fail(!fs.existsSync(dest), "Файл импорта уже существует.");
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, bytes, { mode: 0o600 });
      written.push(dest);
    }
    s.transaction(() => {
      for (const media of portable.records)
        s.put("media", media.id, user.id, media);
      for (const r of parsed.manifest.records) {
        const v = rewrite(r.value),
          key = map.get(r.value.id);
        delete v.id;
        delete v.revision;
        delete v.owner;
        v.sharedWith = [];
        v.importedFrom = parsed.manifest.sourceInstance;
        if (r.kind === "run") {
          v.settings.status = "closed";
          v.importedReadOnly = true;
        }
        s.put(r.kind, key, user.id, v, v.projectId || v.runId || "");
      }
      s.db
        .prepare("INSERT INTO imports VALUES(?,?,?)")
        .run(parsed.receiptKey, now(), user.id);
      s.audit(user.id, "package.imported", parsed.packageHash, {
        records: map.size,
        conflicts: parsed.preview.conflicts.length,
      });
    });
  } catch (e) {
    for (const file of written) fs.rmSync(file, { force: true });
    throw e;
  }
  return {
    imported: map.size,
    conflictsPreserved: parsed.preview.conflicts.length,
    ids: Object.fromEntries(map),
  };
}
