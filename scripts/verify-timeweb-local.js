"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createOlympiadServer } = require("../olympiad-server");

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "olympiad-timeweb-rehearsal-"));
  const { server } = createOlympiadServer({
    dbPath: path.join(directory, "olympiad.sqlite"),
    adminPassword: "synthetic-test-admin-password",
    attemptIdSecret: "synthetic-test-attempt-id-secret-2026"
  });

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const participants = process.argv[2] || "40";
    const answers = process.argv[3] || "3";
    const finish = process.argv[4] === "finish";
    const args = [
      path.join(__dirname, "load-test-olympiad.js"),
      `--base-url=${baseUrl}`,
      `--participants=${participants}`,
      `--answers=${answers}`,
      "--duplicate-every=10",
      `--finish=${finish}`
    ];
    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, { stdio: "inherit" });
      child.once("error", reject);
      child.once("exit", (code) => resolve(code));
    });
    if (exitCode !== 0) {
      process.exitCode = exitCode || 1;
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
