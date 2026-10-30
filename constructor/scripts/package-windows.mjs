import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
if (process.platform !== "win32")
  throw new Error(
    "Комплект Windows собирается на Windows с установленным Chrome.",
  );
const destination = path.resolve(
  process.env.CONSTRUCTOR_RELEASE_DIR || "release/windows",
);
if (fs.existsSync(destination))
  throw new Error(
    "Для сборки задайте новую пустую папку CONSTRUCTOR_RELEASE_DIR.",
  );
const browser =
  process.env.CONSTRUCTOR_BROWSER_DIR ||
  "C:/Program Files/Google/Chrome/Application";
if (!fs.existsSync(path.join(browser, "chrome.exe")))
  throw new Error("Не найден установленный Chrome для автономного PDF.");
for (const file of [
  "dist/server.cjs",
  "dist/restore.cjs",
  "dist/client/index.html",
])
  if (!fs.existsSync(file))
    throw new Error("Сначала выполните npm run build: " + file);
fs.mkdirSync(destination, { recursive: true });
const app = path.join(destination, "app"),
  runtime = path.join(destination, "runtime");
fs.mkdirSync(app);
fs.mkdirSync(runtime);
fs.cpSync("dist/client", path.join(app, "client"), { recursive: true });
for (const name of ["server.cjs", "restore.cjs"])
  fs.copyFileSync("dist/" + name, path.join(app, name));
// Resolve the locked production tree while packaging; the finished installation uses no network.
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
for (const name of ["package.json", "package-lock.json"])
  fs.copyFileSync(name, path.join(app, name));
const result = spawnSync(
  process.env.ComSpec || "cmd.exe",
  [
    "/d",
    "/s",
    "/c",
    "npm.cmd ci --omit=dev --ignore-scripts --no-audit --no-fund",
  ],
  {
    cwd: app,
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
      PLAYWRIGHT_SKIP_BROWSER_GC: "1",
    },
  },
);
if (result.status)
  throw new Error("Не удалось собрать зависимости автономной установки.");
fs.copyFileSync(process.execPath, path.join(runtime, "node.exe"));
const nodeLicense = path.join(path.dirname(process.execPath), "LICENSE");
if (fs.existsSync(nodeLicense))
  fs.copyFileSync(nodeLicense, path.join(runtime, "NODE-LICENSE.txt"));
fs.cpSync(browser, path.join(runtime, "browser"), { recursive: true });
fs.copyFileSync("scripts/launcher.cjs", path.join(destination, "launcher.cjs"));
fs.writeFileSync(
  path.join(destination, "Запустить.cmd"),
  '@echo off\r\nchcp 65001 >nul\r\ncd /d "%~dp0"\r\n"runtime\\node.exe" launcher.cjs\r\npause\r\n',
);
fs.writeFileSync(
  path.join(destination, "Восстановить.cmd"),
  '@echo off\r\nchcp 65001 >nul\r\ncd /d "%~dp0app"\r\nset /p "CONSTRUCTOR_BACKUP_PASSWORD=Пароль резервной копии: "\r\n"..\\runtime\\node.exe" restore.cjs %*\r\nset "CONSTRUCTOR_BACKUP_PASSWORD="\r\npause\r\n',
);
fs.copyFileSync("README.md", path.join(destination, "Инструкция.md"));
const files = {};
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else
      files[path.relative(destination, file).split(path.sep).join("/")] = crypto
        .createHash("sha256")
        .update(fs.readFileSync(file))
        .digest("hex");
  }
}
walk(destination);
fs.writeFileSync(
  path.join(destination, "checksums.json"),
  JSON.stringify({ version: pkg.version, files }, null, 2),
);
console.log(
  JSON.stringify(
    {
      directory: destination,
      files: Object.keys(files).length,
      dependencies: Object.keys(pkg.dependencies).length,
      browser: "Chrome supplied from installed local application",
    },
    null,
    2,
  ),
);
if (process.env.CONSTRUCTOR_ZIP === "1") {
  const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
  const command = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory(${quote(destination)},${quote(destination + ".zip")},[IO.Compression.CompressionLevel]::Fastest,$true)`;
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-WindowStyle",
      "Hidden",
      "-Command",
      command,
    ],
    { stdio: "inherit", windowsHide: true },
  );
  if (result.status) throw new Error("Не удалось упаковать Windows-комплект.");
}
