"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync, backup } = require("node:sqlite");

const MIGRATIONS = [
  "0001_cloudflare_initial.sql",
  "0006_olympiad_integrity_events.sql",
  "0007_olympiad_attempt_concurrency.sql"
];

function createSqliteD1(filename) {
  if (!filename || filename === ":memory:") {
    throw new Error("A persistent SQLite database path is required.");
  }

  const resolved = path.resolve(filename);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const database = new DatabaseSync(resolved, { timeout: 5000 });
  database.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON;");
  database.exec(
    "CREATE TABLE IF NOT EXISTS local_schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"
  );

  for (const name of MIGRATIONS) {
    if (database.prepare("SELECT name FROM local_schema_migrations WHERE name = ?1").get(name)) {
      continue;
    }
    const migration = fs.readFileSync(path.join(__dirname, "..", "migrations", name), "utf8");
    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(migration);
      database.prepare(
        "INSERT INTO local_schema_migrations (name, applied_at) VALUES (?1, ?2)"
      ).run(name, new Date().toISOString());
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      database.close();
      throw error;
    }
  }

  function prepare(sql, bindings = []) {
    const compiled = database.prepare(sql);
    return {
      bind(...values) {
        return prepare(sql, values);
      },
      all() {
        return { results: compiled.all(...bindings) };
      },
      first() {
        return compiled.get(...bindings) || null;
      },
      run() {
        const result = compiled.run(...bindings);
        return { meta: { changes: Number(result.changes) } };
      }
    };
  }

  const binding = {
    prepare(sql) {
      return prepare(sql);
    },
    batch(statements) {
      database.exec("BEGIN IMMEDIATE");
      try {
        const results = [];
        for (const statement of statements) {
          results.push(statement.run());
        }
        database.exec("COMMIT");
        return results;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
    async backup(destination) {
      const target = path.resolve(destination);
      if (target === resolved) {
        throw new Error("Backup destination must differ from the live database.");
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      await backup(database, target);
      return target;
    },
    close() {
      database.close();
    }
  };

  return binding;
}

module.exports = { createSqliteD1 };
