"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");

function option(name, fallback) {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function trialPaths(directory) {
  const root = path.resolve(directory || path.join(process.env.LOCALAPPDATA || os.homedir(), "GKTSOlympiadTrial", "v1"));
  return { root, credentials: path.join(root, "credentials.json"), database: path.join(root, "olympiad.sqlite"),
    report: path.join(root, "launch-report.json"), organizer: path.join(root, "Организатор.txt") };
}

function readCredentials(paths) {
  fs.mkdirSync(paths.root, { recursive: true });
  const generated = { adminPassword: crypto.randomBytes(24).toString("base64url"), attemptIdSecret: crypto.randomBytes(48).toString("base64url") };
  try { fs.writeFileSync(paths.credentials, JSON.stringify(generated), { flag: "wx", mode: 0o600 }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
  const credentials = JSON.parse(fs.readFileSync(paths.credentials, "utf8"));
  if (typeof credentials.adminPassword !== "string" || credentials.adminPassword.length < 16 ||
      typeof credentials.attemptIdSecret !== "string" || credentials.attemptIdSecret.length < 32) {
    throw new Error("Повреждён файл доступа. Сохраните папку данных и обратитесь к организатору; не удаляйте её.");
  }
  return credentials;
}

function configureTrial(paths) {
  process.env.STORAGE_BACKEND = "cloudflare";
  process.env.STORAGE_DIR = paths.root;
  process.env.EXPORTS_DIR = path.join(paths.root, "exports");
  process.env.YANDEX_DISK_ENABLED = "false";
  process.env.LEARNING_ENABLED = "false";
  delete process.env.YDB_CONNECTION_STRING;
  delete process.env.YANDEX_DISK_OAUTH_TOKEN;
}

async function backupTrial(paths) {
  if (!fs.existsSync(paths.database)) throw new Error("Сначала запустите олимпиаду: тестовая база ещё не создана.");
  const destination = path.join(paths.root, "backups", `olympiad-${Date.now()}-${crypto.randomBytes(3).toString("hex")}.sqlite`);
  const result = spawnSync(process.execPath, [path.join(__dirname, "backup-olympiad-sqlite.js"), destination], {
    env: { ...process.env, OLYMPIAD_DB_PATH: paths.database }, encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(result.stderr || "Не удалось проверить резервную копию.");
  const receipt = JSON.parse(result.stdout);
  fs.writeFileSync(`${destination}.json`, JSON.stringify(receipt, null, 2));
  console.log(`Проверенная резервная копия: ${destination}`);
  return receipt;
}

async function startTrial(paths, { port = 3100, openBrowser = true } = {}) {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 24 || (major === 24 && minor < 15)) throw new Error("Нужен комплект с Node.js 24.15 или новее.");
  const credentials = readCredentials(paths);
  const hostingFile=path.join(paths.root,'hosting-settings.json');
  const hosting=fs.existsSync(hostingFile)?JSON.parse(fs.readFileSync(hostingFile,'utf8')):{};
  configureTrial(paths);
  const { createOlympiadServer } = require("../olympiad-server");
  const { server, db } = createOlympiadServer({ dbPath: paths.database, ...credentials, storyEnabled: true, storyAnytimeEntry: true,publicApiOrigin:hosting.publicApiOrigin||'' });
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", resolve);
    });
  } catch (error) {
    db.close();
    if (error.code === "EADDRINUSE") throw new Error(`Порт ${port} занят. Закройте только прежнее окно этого тестового сервера либо выберите другой порт.`);
    throw error;
  }
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const metadataResponse = await fetch(`${baseUrl}/api/public/olympiad`);
    const metadata = await metadataResponse.json();
    if (!metadataResponse.ok || !metadata.ok) throw new Error("Сервер не завершил подготовку олимпиады.");
    const report = {
      startedAt: new Date().toISOString(), machine: os.hostname(), cpu: os.cpus()[0]?.model,
      memoryGB: Math.round(os.totalmem() / 1024 ** 3), node: process.versions.node,
      url: baseUrl, database: paths.database, mode:hosting.publicApiOrigin?'shared-d1-participant-host':"isolated-windows-trial",
      ...(hosting.publicApiOrigin?{publicApiOrigin:hosting.publicApiOrigin,addonVersion:hosting.addonVersion||null}:{}),
      durationMinutes: metadata.data.durationMinutes, totalQuestions: metadata.data.questionCount,
      totalPoints: metadata.data.tours.reduce((sum, tour) => sum + Number(tour.maxScore), 0),
      revision: fs.existsSync(path.join(__dirname, "..", "package-manifest.json"))
        ? JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package-manifest.json"), "utf8")).revision : "development-copy"
    };
    fs.writeFileSync(paths.report, JSON.stringify(report, null, 2));
    fs.writeFileSync(paths.organizer,hosting.publicApiOrigin?`\uFEFFОФИЦИАЛЬНАЯ ОЛИМПИАДА\r\nПанель: ${hosting.publicApiOrigin}/admin.html\r\nДля входа используется существующий пароль организатора Cloudflare.\r\nЛокальная база пробных прохождений и её ключи сохранены отдельно.\r\n`:`\uFEFFПРОБНЫЙ СЕРВЕР ОЛИМПИАДЫ\r\nПанель: ${baseUrl}/admin.html\r\nПароль: ${credentials.adminPassword}\r\n\r\nЛокальные тестовые данные: ${paths.root}\r\nЭтот файл содержит пароль. Не отправляйте его участникам.\r\n`, { mode: 0o600 });
    console.log(`\nПробная олимпиада запущена на ${os.hostname()}.\nОткройте: ${baseUrl}\nПанель организатора: ${baseUrl}/admin.html\nПароль сохранён в: ${paths.organizer}\nОтветы: ${paths.database}\nОтчёт о запуске: ${paths.report}\n\nОставьте это окно открытым. Для остановки нажмите Ctrl+C.\n`);
    if (openBrowser && process.platform === "win32") {
      const browser = spawn("cmd.exe", ["/d", "/c", "start", "", baseUrl], { stdio: "ignore", windowsHide: true });
      browser.on("error", () => console.log(`Откройте ${baseUrl} в браузере вручную.`));
    }
    let closing = false;
    const stop = () => {
      if (closing) return;
      closing = true;
      server.close(() => { console.log("Сервер остановлен. Ответы сохранены."); });
      server.closeIdleConnections();
    };
    for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, stop);
    server.once("close", () => { for (const signal of ["SIGINT", "SIGTERM"]) process.removeListener(signal, stop); });
    return { server, db, baseUrl, report };
  } catch (error) {
    await new Promise(resolve => server.close(resolve));
    throw error;
  }
}

async function loadTrial(paths) {
  // A new directory and port isolate every rehearsal from manual participants.
  const directory = path.join(paths.root, "load-rehearsals", `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`);
  const rehearsal = await startTrial(trialPaths(directory), { port: 0, openBrowser: false });
  try {
    const args = [path.join(__dirname, "load-test-olympiad.js"), `--base-url=${rehearsal.baseUrl}`, "--participants=60", "--answers=all", "--finish=true", "--duplicate-every=10"];
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
      const output = fs.createWriteStream(path.join(directory, "load-report.txt"));
      child.stdout.on("data", value => { process.stdout.write(value); output.write(value); });
      child.stderr.on("data", value => { process.stderr.write(value); output.write(value); });
      child.once("error", reject);
      child.once("close", code => { output.end(() => resolve(code)); });
    });
    console.log(`\nОтчёт репетиции: ${path.join(directory, "load-report.txt")}`);
    if (code !== 0) throw new Error("Репетиция не прошла все критерии. Сохраните отчёт для проверки.");
  } finally { await new Promise(resolve => rehearsal.server.close(resolve)); }
}

async function main() {
  const paths = trialPaths(option("state-dir"));
  if (process.argv.includes("--backup")) await backupTrial(paths);
  else if (process.argv.includes("--load")) await loadTrial(paths);
  else await startTrial(paths, { port: Number(option("port", "3100")), openBrowser: !process.argv.includes("--no-browser") });
}

if (require.main === module) main().catch(error => { console.error(`\n${error.message}`); process.exitCode = 1; });
module.exports = { trialPaths, readCredentials, backupTrial, startTrial };
