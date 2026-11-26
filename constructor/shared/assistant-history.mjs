import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export const historyKind = "assistant_chat";
export const historyMarker = "assistantHistoryLocalV1";
export const historyWireBytes = 4 * 1024 * 1024;
export const historyId = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{8,100}$/.test(value);

export function historyFingerprint(rows) {
  const digest = createHash("sha256");
  let count = 0;
  for (const { id, owner, revision, data, updated } of rows) {
    digest.update(JSON.stringify([id, owner, revision, data, updated]) + "\n");
    count++;
  }
  return { count, digest: digest.digest("hex") };
}

const columns = "id, owner, revision, data, updated";
const sorted = "SELECT " + columns + " FROM chats ORDER BY id";
const issue = (code) => Object.assign(new Error(code), { historyCode: code });

function content(data) {
  if (
    typeof data !== "string" ||
    Buffer.byteLength(data) > historyWireBytes - 4096
  )
    throw issue("invalid_history");
  const parsed = JSON.parse(data);
  if (typeof parsed?.title !== "string" || !Array.isArray(parsed.messages))
    throw issue("invalid_history");
  return parsed;
}

export function removeMigratedHistory(db) {
  const find = db.prepare("SELECT value FROM meta WHERE key=?");
  const rows = db.prepare(
    "SELECT " + columns + " FROM objects WHERE kind=? ORDER BY id",
  );
  db.exec("PRAGMA secure_delete=ON; BEGIN IMMEDIATE");
  let result;
  try {
    const marker = JSON.parse(find.get(historyMarker)?.value || "null");
    const initial = historyFingerprint(rows.iterate(historyKind));
    if (
      !marker ||
      (marker.cleaned
        ? initial.count !== 0
        : initial.count !== marker.count || initial.digest !== marker.digest)
    ) {
      throw issue("migration_mismatch");
    }
    if (!marker.cleaned) {
      db.prepare("DELETE FROM objects WHERE kind=?").run(historyKind);
      db.prepare("UPDATE meta SET value=? WHERE key=?").run(
        JSON.stringify({ ...marker, cleaned: true }),
        historyMarker,
      );
    }
    result = {
      migrated: marker.count,
      remaining: historyFingerprint(rows.iterate(historyKind)).count,
    };
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return result;
}

export function openAssistantHistory(file) {
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(file, { timeout: 5000 });
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA synchronous=FULL;
    PRAGMA secure_delete=ON;
    CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS chats(
      id TEXT PRIMARY KEY, owner TEXT NOT NULL, revision INTEGER NOT NULL,
      data TEXT NOT NULL, updated TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS chats_owner_updated ON chats(owner, updated DESC);
  `);
  db.prepare("INSERT OR IGNORE INTO metadata VALUES('identity', ?)").run(
    randomUUID(),
  );
  const identity = db
    .prepare("SELECT value FROM metadata WHERE key='identity'")
    .get().value;
  const current = db.prepare(
    "SELECT " + columns + " FROM chats WHERE id=? AND owner=?",
  );
  const countForOwner = db.prepare(
    "SELECT count(*) AS total FROM chats WHERE owner=?",
  );
  const insert = db.prepare(
    "INSERT INTO chats(id,owner,revision,data,updated) VALUES(?,?,?,?,?)",
  );
  const update = db.prepare(
    "UPDATE chats SET revision=?,data=?,updated=? WHERE id=? AND owner=? AND revision=?",
  );
  const remove = db.prepare(
    "DELETE FROM chats WHERE id=? AND owner=? AND revision=?",
  );
  const list = db.prepare(`
    SELECT id, json_extract(data, '$.title') AS title, updated AS updatedAt
    FROM chats WHERE owner=? ORDER BY updated DESC, id
  `);

  function seal(expected) {
    const actual = historyFingerprint(db.prepare(sorted).iterate());
    if (actual.count !== expected.count || actual.digest !== expected.digest)
      throw issue("migration_mismatch");
    if (db.prepare("PRAGMA quick_check").get().quick_check !== "ok")
      throw issue("invalid_history");
    if (actual.count > 0) {
      const copy = path.join(
        directory,
        "migration-" + actual.digest.slice(0, 16) + ".sqlite",
      );
      if (!fs.existsSync(copy)) db.prepare("VACUUM INTO ?").run(copy);
      const saved = new DatabaseSync(copy, { readOnly: true });
      try {
        const verified = historyFingerprint(saved.prepare(sorted).iterate());
        if (
          saved.prepare("PRAGMA quick_check").get().quick_check !== "ok" ||
          verified.count !== actual.count ||
          verified.digest !== actual.digest
        )
          throw issue("migration_mismatch");
      } finally {
        saved.close();
      }
    }
    return actual;
  }

  function perform({ operation, value }) {
    if (operation === "seal") return seal(value);
    if (!historyId(value?.owner)) throw issue("invalid_history");
    if (operation === "list") return list.all(value.owner);
    if (!historyId(value.id)) throw issue("invalid_history");
    const previous = current.get(value.id, value.owner);
    if (operation === "get") return previous || null;
    if (operation === "remove") {
      if (
        previous &&
        !remove.run(value.id, value.owner, value.revision).changes
      )
        throw issue("revision_conflict");
      return true;
    }
    if (operation !== "put" && operation !== "import")
      throw issue("invalid_history");
    const { id, owner, data } = value;
    content(data);
    if (operation === "import") {
      if (!previous) insert.run(id, owner, value.revision, data, value.updated);
      return historyFingerprint([current.get(id, owner)]).digest;
    }
    const updated = new Date().toISOString();
    if (value.revision === null) {
      if (countForOwner.get(owner).total >= 60) throw issue("history_full");
      if (previous) throw issue("revision_conflict");
      insert.run(id, owner, 0, data, updated);
    } else if (
      !update.run(value.revision + 1, data, updated, id, owner, value.revision)
        .changes
    ) {
      throw issue("revision_conflict");
    }
    return current.get(id, owner);
  }

  return { identity, perform, close: () => db.close() };
}
