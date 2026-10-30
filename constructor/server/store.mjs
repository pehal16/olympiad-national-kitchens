import { DatabaseSync, backup } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { id, now, fail, token, writePrivate } from "./util.mjs";
export class Store {
  constructor(root) {
    this.root = path.resolve(root);
    fs.mkdirSync(this.root, { recursive: true });
    for (const dir of ["media", "documents", "jobs", "backups"])
      fs.mkdirSync(path.join(this.root, dir), { recursive: true });
    this.db = new DatabaseSync(path.join(this.root, "constructor.sqlite"), {
      timeout: 5000,
    });
    this.db
      .exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,login TEXT UNIQUE NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('owner','teacher')),password TEXT NOT NULL,permissions TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS invitations(hash TEXT PRIMARY KEY,data TEXT NOT NULL,expires INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS objects(id TEXT PRIMARY KEY,kind TEXT NOT NULL,owner TEXT NOT NULL,parent TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL,updated TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS objects_kind_owner ON objects(kind,owner,parent);
      CREATE INDEX IF NOT EXISTS objects_parent ON objects(parent,kind);
      CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,action TEXT NOT NULL,entity TEXT NOT NULL,data TEXT NOT NULL,time TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS imports(hash TEXT PRIMARY KEY,time TEXT NOT NULL,owner TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS requests(entity TEXT NOT NULL,key TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(entity,key));
      CREATE TRIGGER IF NOT EXISTS immutable_release_update BEFORE UPDATE ON objects WHEN OLD.kind='release' BEGIN SELECT RAISE(ABORT,'Published release is immutable'); END;
      CREATE TRIGGER IF NOT EXISTS immutable_release_delete BEFORE DELETE ON objects WHEN OLD.kind='release' BEGIN SELECT RAISE(ABORT,'Published release is immutable'); END;`);
    const schemaVersion = Number(
      Object.values(this.db.prepare("PRAGMA user_version").get())[0],
    );
    fail(
      schemaVersion <= 1,
      "База создана более новой версией конструктора. Используйте соответствующее приложение.",
    );
    if (schemaVersion === 0) this.db.exec("PRAGMA user_version=1");
    if (!this.meta("instanceId")) this.meta("instanceId", id("instance"));
    if (!this.meta("setupSecret")) {
      this.meta("setupSecret", token());
      writePrivate(
        path.join(this.root, "Первый вход.txt"),
        `Код первоначальной настройки: ${this.meta("setupSecret")}\nОткройте /constructor/ и создайте владельца. Код действует только до создания первого владельца.\n`,
      );
    }
  }
  meta(key, value) {
    if (value !== undefined)
      this.db
        .prepare("INSERT OR REPLACE INTO meta VALUES(?,?)")
        .run(key, String(value));
    return this.db.prepare("SELECT value FROM meta WHERE key=?").get(key)
      ?.value;
  }
  transaction(fn) {
    if (this.db.isTransaction) {
      const savepoint =
        "nested_" +
        (this.savepointSequence = (this.savepointSequence || 0) + 1);
      this.db.exec("SAVEPOINT " + savepoint);
      try {
        const result = fn();
        this.db.exec("RELEASE " + savepoint);
        return result;
      } catch (error) {
        this.db.exec("ROLLBACK TO " + savepoint);
        this.db.exec("RELEASE " + savepoint);
        throw error;
      }
    }
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  get(kind, key) {
    const row = this.db
      .prepare("SELECT * FROM objects WHERE kind=? AND id=?")
      .get(kind, key);
    return row
      ? {
          ...JSON.parse(row.data),
          id: row.id,
          revision: row.revision,
          owner: row.owner,
          updatedAt: row.updated,
        }
      : null;
  }
  list(kind, owner = null, parent = null) {
    const rows = this.db
      .prepare(
        "SELECT * FROM objects WHERE kind=? AND (? IS NULL OR owner=?) AND (? IS NULL OR parent=?) ORDER BY updated DESC",
      )
      .all(kind, owner, owner, parent, parent);
    return rows.map((r) => ({
      ...JSON.parse(r.data),
      id: r.id,
      revision: r.revision,
      owner: r.owner,
      updatedAt: r.updated,
    }));
  }
  put(kind, key, owner, data, parent = "", expected) {
    const previous = this.get(kind, key);
    if (expected !== undefined)
      fail(
        Number(expected) === Number(previous?.revision ?? 0),
        "Материал изменён в другой вкладке. Сохраните локальную копию и загрузите свежую редакцию.",
        409,
        "revision_conflict",
      );
    const revision = previous ? previous.revision + 1 : 0;
    const stamp = now();
    this.db
      .prepare(
        `INSERT INTO objects VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=excluded.revision,updated=excluded.updated`,
      )
      .run(key, kind, owner, parent, revision, JSON.stringify(data), stamp);
    return { ...data, id: key, owner, revision, updatedAt: stamp };
  }
  remove(kind, key) {
    this.db.prepare("DELETE FROM objects WHERE kind=? AND id=?").run(kind, key);
  }
  audit(actor, action, entity, data = {}) {
    this.db
      .prepare(
        "INSERT INTO audit(actor,action,entity,data,time) VALUES(?,?,?,?,?)",
      )
      .run(actor, action, entity, JSON.stringify(data), now());
  }
  history(entity) {
    return this.db
      .prepare(
        "SELECT actor,action,data,time FROM audit WHERE entity=? ORDER BY id DESC LIMIT 300",
      )
      .all(entity)
      .map((r) => ({ ...r, data: JSON.parse(r.data) }));
  }
  request(entity, key, result) {
    if (result !== undefined)
      this.db
        .prepare("INSERT OR IGNORE INTO requests VALUES(?,?,?)")
        .run(entity, key, JSON.stringify(result));
    return this.db
      .prepare("SELECT data FROM requests WHERE entity=? AND key=?")
      .get(entity, key)?.data;
  }
  user(key) {
    const r = this.db
      .prepare("SELECT * FROM users WHERE id=? OR login=?")
      .get(key, key);
    return r
      ? {
          ...r,
          permissions: JSON.parse(r.permissions),
          active: Boolean(r.active),
        }
      : null;
  }
  async backup() {
    const file = path.join(
      this.root,
      "backups",
      `constructor-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
    );
    await backup(this.db, file);
    return file;
  }
  close() {
    this.db.close();
  }
}
