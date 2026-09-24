"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const {
  configureCloudflareStorage,
  createAttemptAtomic,
  updateAttemptWithRevision,
  loadAttemptById,
  appendAttemptEvent,
  loadAttemptEvents
} = require("../src/cloudflare-store");

const root = path.resolve(__dirname, "..");
const migrations = [
  "0001_cloudflare_initial.sql",
  "0006_olympiad_integrity_events.sql",
  "0007_olympiad_attempt_concurrency.sql"
];

class SqliteD1Statement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values) {
    return new SqliteD1Statement(this.database, this.sql, values);
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.values) || null;
  }

  async all() {
    return { results: this.database.prepare(this.sql).all(...this.values) };
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { meta: { changes: Number(result.changes || 0) } };
  }
}

class SqliteD1Database {
  constructor(database) {
    this.database = database;
    this.batchQueue = Promise.resolve();
    this.batchBarrier = null;
  }

  prepare(sql) {
    return new SqliteD1Statement(this.database, sql);
  }

  armBatchBarrier(count = 2) {
    let release;
    const promise = new Promise((resolve) => {
      release = resolve;
    });
    this.batchBarrier = { remaining: count, promise, release };
  }

  executeBatch(statements) {
    this.database.exec("BEGIN IMMEDIATE;");
    try {
      const results = statements.map((item) => {
        const result = this.database.prepare(item.sql).run(...item.values);
        return { meta: { changes: Number(result.changes || 0) } };
      });
      this.database.exec("COMMIT;");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
  }

  async batch(statements) {
    const barrier = this.batchBarrier;
    if (barrier) {
      barrier.remaining -= 1;
      if (barrier.remaining === 0) {
        this.batchBarrier = null;
        barrier.release();
      }
      await barrier.promise;
    }

    const operation = () => this.executeBatch(statements);
    const queued = this.batchQueue.then(operation, operation);
    this.batchQueue = queued.catch(() => {});
    return queued;
  }
}

function makeAttempt(id, marker, overrides = {}) {
  return {
    id,
    marker,
    status: "active",
    startedAt: "2026-09-19T09:00:00.000Z",
    updatedAt: "2026-09-19T09:00:00.000Z",
    answeredCount: 0,
    stateRevision: 0,
    accessTokenHash: `hash-${marker}`,
    variant: {
      id: `variant-${marker}`,
      questions: [{ id: "q1", type: "single" }]
    },
    answers: {},
    questionLog: {},
    ...overrides
  };
}

async function createFixture(t) {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "olympiad-d1-concurrency-"));
  const database = new DatabaseSync(path.join(directory, "olympiad.sqlite"));
  database.exec("PRAGMA foreign_keys=ON;");
  for (const migration of migrations) {
    database.exec(fs.readFileSync(path.join(root, "migrations", migration), "utf8"));
  }

  const d1 = new SqliteD1Database(database);
  configureCloudflareStorage({ DB: d1 });
  t.after(async () => {
    database.close();
    await fs.promises.rm(directory, { recursive: true, force: true });
  });
  return { database, d1 };
}

test("D1 olympiad attempt storage enforces its concurrency contract", async (t) => {
  const { database, d1 } = await createFixture(t);

  await t.test("atomic create reports exactly one creator and returns the persisted winner", async () => {
    const left = makeAttempt("attempt-create-race", "left");
    const right = makeAttempt("attempt-create-race", "right");

    d1.armBatchBarrier(2);
    const results = await Promise.all([
      createAttemptAtomic(left),
      createAttemptAtomic(right)
    ]);

    const created = results.filter((result) => result.created);
    assert.equal(created.length, 1);
    const winningMarker = created[0].attempt.marker;
    assert.ok(["left", "right"].includes(winningMarker));
    assert.deepEqual(results.map((result) => result.attempt.marker), [winningMarker, winningMarker]);

    const persisted = await loadAttemptById(left.id);
    assert.equal(persisted.marker, winningMarker);
    assert.equal(persisted.variant.id, `variant-${winningMarker}`);
    assert.equal(persisted.accessTokenHash, `hash-${winningMarker}`);
    assert.equal(
      database.prepare("SELECT COUNT(*) AS count FROM attempts WHERE id = ?").get(left.id).count,
      1
    );
  });

  await t.test("access token hash stays outside payload_json and is restored on load", async () => {
    const attempt = makeAttempt("attempt-token-storage", "token");
    const result = await createAttemptAtomic(attempt);
    assert.equal(result.created, true);

    const row = database.prepare(
      "SELECT payload_json, state_revision, access_token_hash FROM attempts WHERE id = ?"
    ).get(attempt.id);
    const payload = JSON.parse(row.payload_json);

    assert.equal(Object.hasOwn(payload, "accessTokenHash"), false);
    assert.equal(Object.hasOwn(payload, "stateRevision"), false);
    assert.equal(row.access_token_hash, attempt.accessTokenHash);
    assert.equal(row.state_revision, 0);

    const loaded = await loadAttemptById(attempt.id);
    assert.equal(loaded.accessTokenHash, attempt.accessTokenHash);
    assert.equal(loaded.stateRevision, 0);
  });

  await t.test("CAS accepts one concurrent update and preserves only the winning answer row", async () => {
    const attempt = makeAttempt("attempt-cas-race", "initial");
    assert.equal((await createAttemptAtomic(attempt)).created, true);
    const base = await loadAttemptById(attempt.id);

    const candidate = (marker) => ({
      ...base,
      marker,
      answeredCount: 1,
      answers: {
        ...base.answers,
        q1: { selectedId: marker }
      },
      questionLog: {
        ...base.questionLog,
        q1: { questionId: "q1", score: 1, marker }
      }
    });
    const left = candidate("cas-left");
    const right = candidate("cas-right");

    d1.armBatchBarrier(2);
    const results = await Promise.all([
      updateAttemptWithRevision(left, 0, { changedQuestionIds: ["q1"] }),
      updateAttemptWithRevision(right, 0, { changedQuestionIds: ["q1"] })
    ]);

    assert.equal(results.filter(Boolean).length, 1);
    const winningCandidate = results[0] ? left : right;
    const losingCandidate = results[0] ? right : left;
    assert.equal(winningCandidate.stateRevision, 1);
    assert.equal(losingCandidate.stateRevision, 0);

    const answerPayload = JSON.parse(database.prepare(
      "SELECT payload_json FROM attempt_answers WHERE attempt_id = ? AND question_id = ?"
    ).get(attempt.id, "q1").payload_json);
    assert.equal(answerPayload.answer.selectedId, winningCandidate.marker);
    assert.equal(answerPayload.log.marker, winningCandidate.marker);
    assert.notEqual(answerPayload.answer.selectedId, losingCandidate.marker);

    const persisted = await loadAttemptById(attempt.id);
    assert.equal(persisted.stateRevision, 1);
    assert.equal(persisted.marker, winningCandidate.marker);
    assert.equal(persisted.answers.q1.selectedId, winningCandidate.marker);
    assert.equal(persisted.questionLog.q1.marker, winningCandidate.marker);
  });

  await t.test("stateOnly advances state without rewriting an answer row", async () => {
    const attempt = makeAttempt("attempt-state-only", "before", {
      answers: { q1: { selectedId: "stored-answer" } },
      questionLog: { q1: { questionId: "q1", score: 1, marker: "stored-log" } }
    });
    assert.equal((await createAttemptAtomic(attempt)).created, true);

    const before = database.prepare(
      "SELECT payload_json FROM attempt_answers WHERE attempt_id = ? AND question_id = ?"
    ).get(attempt.id, "q1").payload_json;
    const loaded = await loadAttemptById(attempt.id);
    const next = {
      ...loaded,
      marker: "state-only-update",
      status: "finished",
      answers: { q1: { selectedId: "must-not-be-written" } },
      questionLog: { q1: { questionId: "q1", score: 0, marker: "must-not-be-written" } }
    };

    assert.equal(
      await updateAttemptWithRevision(next, loaded.stateRevision, {
        stateOnly: true,
        changedQuestionIds: ["q1"]
      }),
      true
    );

    const after = database.prepare(
      "SELECT payload_json FROM attempt_answers WHERE attempt_id = ? AND question_id = ?"
    ).get(attempt.id, "q1").payload_json;
    assert.equal(after, before);

    const persisted = await loadAttemptById(attempt.id);
    assert.equal(persisted.status, "finished");
    assert.equal(persisted.stateRevision, 1);
    assert.equal(persisted.answers.q1.selectedId, "stored-answer");
    assert.equal(persisted.questionLog.q1.marker, "stored-log");
  });

  await t.test("attempt events are idempotent and stop at the per-attempt cap", async () => {
    const event = (eventId, second) => ({
      eventId,
      eventType: "window_blur",
      occurredAt: `2026-09-19T09:00:0${second}.000Z`,
      receivedAt: `2026-09-19T09:00:0${second}.100Z`,
      detail: { second }
    });

    assert.deepEqual(
      await appendAttemptEvent("attempt-events", event("event-1", 1), 2),
      {
        stored: true,
        event: { ...event("event-1", 1), attemptId: "attempt-events" }
      }
    );
    assert.deepEqual(
      await appendAttemptEvent("attempt-events", event("event-1", 1), 2),
      { stored: false }
    );
    assert.equal((await appendAttemptEvent("attempt-events", event("event-2", 2), 2)).stored, true);
    assert.deepEqual(
      await appendAttemptEvent("attempt-events", event("event-3", 3), 2),
      { stored: false }
    );

    const stored = await loadAttemptEvents("attempt-events");
    assert.deepEqual(stored.map((item) => item.eventId), ["event-1", "event-2"]);

    const cappedRace = await Promise.all([
      appendAttemptEvent("attempt-events-race", event("race-a", 4), 1),
      appendAttemptEvent("attempt-events-race", event("race-b", 5), 1)
    ]);
    assert.equal(cappedRace.filter((item) => item.stored).length, 1);
    assert.equal((await loadAttemptEvents("attempt-events-race")).length, 1);
  });
});
