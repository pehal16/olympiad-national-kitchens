"use strict";
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
function argument(name, fallback) {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}
function powershell(code) {
  execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", code], {
    stdio: "inherit", timeout: 240000,
    env: { ...process.env, PSModulePath: path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "Modules") }
  });
}
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}
function main() {
  if (process.platform !== "win32") throw new Error("Build this package on Windows with the signed Windows Node.js runtime.");
  const revision = execFileSync("git", ["rev-parse", argument("ref", "HEAD")], { cwd: root, encoding: "utf8" }).trim();
  const destination = path.resolve(argument("output", path.join(root, "output", "olympiad-windows-trial.zip")));
  if (fs.existsSync(destination)) throw new Error("Output already exists. Choose a new archive path.");
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "olympiad-windows-package-"));
  const app = path.join(staging, "OlympiadTrial");
  const sourceZip = path.join(staging, "source.zip");
  const { isOlympiadStatic } = require("../olympiad-server");
  const publicRoots = execFileSync("git", ["ls-tree", "--name-only", revision, "public/"], { cwd: root, encoding: "utf8" })
    .trim().split(/\r?\n/).filter(file => file.startsWith("public/") && !file.slice(7).includes("/") && isOlympiadStatic(`/${file.slice(7)}`));
  const included = ["server.js", "olympiad-server.js", "package.json", "src", ...publicRoots,
    "public/assets/olympiad", "public/assets/runtime", "public/icons", "data", "config/settings.json", "migrations",
    "scripts/windows-trial.js", "scripts/windows-trial", "scripts/backup-olympiad-sqlite.js", "scripts/load-test-olympiad.js"];
  execFileSync("git", ["archive", "--format=zip", `--output=${sourceZip}`, revision, "--", ...included], { cwd: root });
  fs.mkdirSync(app);
  execFileSync("tar.exe", ["-xf", sourceZip, "-C", app], { stdio: "inherit", timeout: 240000 });
  // No private files or historical registrations are distributed.
  fs.writeFileSync(path.join(app, "data", "participants.json"), "[]\n");
  const settingsFile = path.join(app, "config", "settings.json");
  const settings = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
  fs.writeFileSync(settingsFile, JSON.stringify({ adminPassword: "", showParticipantScore: false,
    institutionName: settings.institutionName, developerName: settings.developerName,
    yandexDiskIntegration: { enabled: false, oauthToken: "", folder: "" } }, null, 2));
  const node = path.resolve(argument("node", process.execPath));
  powershell(`$ErrorActionPreference='Stop'; $signature=Get-AuthenticodeSignature -LiteralPath ${quote(node)}; if($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'OpenJS Foundation'){throw 'Invalid Node.js publisher signature'}`);
  const nodeVersion = execFileSync(node, ["--version"], { encoding: "utf8" }).trim();
  const runtime = path.join(app, "runtime");
  fs.mkdirSync(runtime);
  fs.copyFileSync(node, path.join(runtime, "node.exe"));
  fs.copyFileSync(path.join(path.dirname(node), "LICENSE"), path.join(runtime, "NODE-LICENSE.txt"));
  for (const name of ["start-olympiad.cmd", "backup-olympiad.cmd", "test-60.cmd", "ПРОЧИТАЙТЕ.txt"]) {
    const source = path.join(app, "scripts", "windows-trial", name);
    fs.writeFileSync(path.join(app, name), fs.readFileSync(source, "utf8").replace(/\r?\n/g, "\r\n"));
  }
  const manifest = { revision, builtAt: new Date().toISOString(), nodeVersion, nodeSha256: hash(node),
    nodePublisher: "OpenJS Foundation (Authenticode verified)", mode: "isolated-windows-trial", files: {} };
  for (const file of files(app)) manifest.files[path.relative(app, file).replaceAll("\\", "/")] = hash(file);
  fs.writeFileSync(path.join(app, "package-manifest.json"), JSON.stringify(manifest, null, 2));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  execFileSync("tar.exe", ["-a", "-cf", destination, "-C", staging, "OlympiadTrial"], { stdio: "inherit", timeout: 240000 });
  const receipt = { revision, nodeVersion, archive: destination, sha256: hash(destination), bytes: fs.statSync(destination).size, files: Object.keys(manifest.files).length, unpacked: app };
  fs.writeFileSync(`${destination}.json`, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
}
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
