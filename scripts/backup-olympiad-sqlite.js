"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync, backup } = require("node:sqlite");

async function main() {
  const source = process.env.OLYMPIAD_DB_PATH;
  const destination = process.argv[2];
  if (!source || !path.isAbsolute(source) || !destination || !path.isAbsolute(destination)) {
    throw new Error("Set absolute OLYMPIAD_DB_PATH and pass an absolute backup destination.");
  }
  if (path.resolve(source) === path.resolve(destination) || fs.existsSync(destination)) {
    throw new Error("Backup destination must be new and different from the live database.");
  }
  if (!fs.existsSync(source)) {
    throw new Error("Live olympiad database does not exist.");
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const live = new DatabaseSync(source, { readOnly: true });
  try {
    await backup(live, destination);
  } finally {
    live.close();
  }

  const copy = new DatabaseSync(destination, { readOnly: true });
  let attempts;
  let events;
  try {
    const result = copy.prepare("PRAGMA integrity_check").get();
    if (result?.integrity_check !== "ok") {
      throw new Error("Backup failed SQLite integrity_check.");
    }
    attempts = copy.prepare("SELECT COUNT(*) AS count FROM attempts").get().count;
    events = copy.prepare("SELECT COUNT(*) AS count FROM olympiad_attempt_events").get().count;
  } finally {
    copy.close();
  }

  const sha256 = crypto.createHash("sha256").update(fs.readFileSync(destination)).digest("hex");
  console.log(JSON.stringify({
    destination,
    bytes: fs.statSync(destination).size,
    attempts,
    events,
    sha256,
    integrity: "ok"
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
