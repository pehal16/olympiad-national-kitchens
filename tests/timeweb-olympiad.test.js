"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { createSqliteD1 } = require("../src/sqlite-d1");
const {
  configureCloudflareStorage,
  createAttemptAtomic,
  updateAttemptWithRevision,
  loadAttemptById,
  appendAttemptEvent,
  loadAttemptEvents
} = require("../src/cloudflare-store");
const { createOlympiadServer, isOlympiadApi, isOlympiadStatic } = require("../olympiad-server");

test("SQLite adapter persists atomic attempts and idempotent integrity events", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "olympiad-timeweb-"));
  const dbPath = path.join(directory, "olympiad.sqlite");
  let db = createSqliteD1(dbPath);
  t.after(() => {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  configureCloudflareStorage({ DB: db });

  const attempt = {
    id: "timeweb-attempt-1",
    olympiadId: "test-olympiad",
    startedAt: "2026-09-23T09:00:00.000Z",
    status: "in_progress",
    accessTokenHash: "test-access-hash",
    stateRevision: 0,
    variant: { id: "variant-1", questions: [{ id: "question-1", type: "single" }] },
    answers: {},
    questionLog: {}
  };
  const created = await createAttemptAtomic(attempt);
  assert.equal(created.created, true);
  assert.equal((await createAttemptAtomic(attempt)).created, false);

  const updated = {
    ...created.attempt,
    answeredCount: 1,
    answers: { "question-1": { value: "option-1" } },
    questionLog: { "question-1": { answeredAt: "2026-09-23T09:01:00.000Z" } }
  };
  assert.equal(await updateAttemptWithRevision(updated, 0, { changedQuestionIds: ["question-1"] }), true);
  assert.equal(await updateAttemptWithRevision(updated, 0, { changedQuestionIds: ["question-1"] }), false);
  const event = {
    eventId: "event-1",
    eventType: "visibility_hidden",
    occurredAt: "2026-09-23T09:01:30.000Z",
    receivedAt: "2026-09-23T09:01:31.000Z"
  };
  assert.equal((await appendAttemptEvent(attempt.id, event)).stored, true);
  assert.equal((await appendAttemptEvent(attempt.id, event)).stored, false);

  db.close();
  db = createSqliteD1(dbPath);
  configureCloudflareStorage({ DB: db });
  const reloaded = await loadAttemptById(attempt.id);
  assert.equal(reloaded.stateRevision, 1);
  assert.equal(reloaded.answers["question-1"].value, "option-1");
  assert.equal((await loadAttemptEvents(attempt.id)).length, 1);

  const backupPath = path.join(directory, "backup.sqlite");
  await db.backup(backupPath);
  assert.ok(fs.statSync(backupPath).size > 0);
  const cliBackup = path.join(directory, "verified-backup.sqlite");
  const result = spawnSync(process.execPath, [
    path.join(__dirname, "..", "scripts", "backup-olympiad-sqlite.js"),
    cliBackup
  ], {
    env: { ...process.env, OLYMPIAD_DB_PATH: dbPath },
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.integrity, "ok");
  assert.equal(report.attempts, 1);
  assert.equal(report.events, 1);
  assert.match(report.sha256, /^[a-f0-9]{64}$/);
});

test("standalone server exposes only olympiad routes and files", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "olympiad-http-"));
  const { server } = createOlympiadServer({
    dbPath: path.join(directory, "olympiad.sqlite"),
    adminPassword: "test-admin-password-2026",
    attemptIdSecret: "test-attempt-id-secret-at-least-32-characters"
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const health = await fetch(`${base}/api/health`).then((response) => response.json());
  assert.equal(health.mode, "olympiad-only");
  assert.equal(health.storage, "sqlite");
  assert.equal((await fetch(`${base}/api/public/olympiad`)).status, 200);
  assert.equal((await fetch(`${base}/index.html`)).status, 200);
  assert.equal((await fetch(`${base}/brand-prof-tourism.png`)).status, 200);
  assert.equal((await fetch(`${base}/sw.js`)).status, 200);
  const dish = await fetch(`${base}/assets/olympiad/visual-v1/dishes/caprese.webp`);
  assert.equal(dish.status, 200);
  assert.match(dish.headers.get("content-type"), /^image\/webp/);
  assert.equal((await fetch(`${base}/pm01.html`)).status, 404);
  assert.equal((await fetch(`${base}/learning.html`)).status, 404);
  assert.equal((await fetch(`${base}/api/pm01/public/exam`)).status, 404);
  assert.equal((await fetch(`${base}/api/learning/public/catalog`)).status, 404);
  assert.equal((await fetch(`${base}/assets/pm01/example.png`)).status, 404);
  assert.equal(isOlympiadApi("/api/public/attempts/a/current"), true);
  assert.equal(isOlympiadStatic("/assets/olympiad/visual-v1/dishes/caprese.webp"), true);
});

test("standalone server refuses missing secrets and a public database path", () => {
  assert.throws(() => createOlympiadServer({
    dbPath: path.join(os.tmpdir(), "unused-olympiad.sqlite"),
    adminPassword: "short",
    attemptIdSecret: "short"
  }), /ADMIN_PASSWORD/);
  assert.throws(() => createOlympiadServer({
    dbPath: path.join(__dirname, "..", "public", "exposed.sqlite"),
    adminPassword: "test-admin-password-2026",
    attemptIdSecret: "test-attempt-id-secret-at-least-32-characters"
  }), /public directory/);
});
