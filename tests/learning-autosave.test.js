"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class ApiError extends Error {
  constructor(message, options = {}) { super(message); Object.assign(this, options); }
}

function harness({ storage = new Map(), unavailable = false } = {}) {
  const timers = new Map();
  let timerId = 0;
  const context = vm.createContext({
    ApiError, structuredClone, window: new EventTarget(),
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => { if (unavailable) throw new Error("quota"); storage.set(key, value); },
      removeItem: (key) => storage.delete(key),
    },
    setTimeout: (fn) => { timers.set(++timerId, fn); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  });
  const source = fs.readFileSync(path.join(__dirname, "../public/learning/autosave.js"), "utf8")
    .replace(/^import[^\n]+\n/, "").replace("export class AutosaveQueue", "class AutosaveQueue");
  vm.runInContext(`${source}\nglobalThis.AutosaveQueue = AutosaveQueue;`, context);
  return { Queue: context.AutosaveQueue, storage, window: context.window, timers };
}

function seed(storage, { revision = 3, answers = { table: { cells: { "fish:net": "12,5" } } }, submissionId = "s1" } = {}) {
  storage.set("learning:draft:s1", JSON.stringify({ submissionId, revision, answers }));
}

test("offline answers survive reopening and save only after recovery at the same revision", async () => {
  const { Queue, storage } = harness();
  const first = new Queue({ submissionId: "s1", revision: 3, save: async () => { throw new ApiError("offline", { code: "NETWORK_ERROR" }); } });
  first.schedule("table", { cells: { "fish:net": "12,5" } });
  await assert.rejects(first.flushAll(), /offline/);
  first.destroy();
  const calls = [];
  const next = new Queue({ submissionId: "s1", revision: 3, save: async (...args) => { calls.push(args); return { draftRevision: 4 }; } });
  const recovered = next.recover({ blockIds: ["table"], serverAnswers: {} });
  assert.equal(recovered.state, "restored");
  assert.equal(recovered.answers.table.cells["fish:net"], "12,5");
  assert.equal(calls.length, 0);
  await next.flushAll();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][2], 3);
  assert.equal(next.revision, 4);
  assert.equal(storage.size, 0);
  next.destroy();
});

test("stale and already submitted local drafts never overwrite server answers", async () => {
  for (const options of [{ revision: 4, readOnly: false }, { revision: 3, readOnly: true }]) {
    const { Queue, storage } = harness();
    seed(storage);
    let calls = 0;
    const queue = new Queue({ submissionId: "s1", revision: options.revision, save: async () => { calls++; } });
    const recovery = queue.recover({ blockIds: ["table"], readOnly: options.readOnly });
    assert.equal(recovery.state, "conflict");
    assert.equal(recovery.backup.answers.table.cells["fish:net"], "12,5");
    await queue.flushAll();
    assert.equal(calls, 0);
    assert.equal(queue.pending.size, 0);
    assert.equal(storage.size, 1);
    queue.destroy();
  }
});

test("lost server acknowledgements do not restore an already saved answer", () => {
  const { Queue, storage } = harness();
  seed(storage);
  const queue = new Queue({ submissionId: "s1", revision: 4, save: async () => {} });
  assert.equal(queue.recover({ blockIds: ["table"], serverAnswers: { table: { cells: { "fish:net": "12,5" } } } }).state, "empty");
  assert.equal(storage.size, 0);
  queue.destroy();
});

test("recovery accepts only this submission and known answer blocks", () => {
  const { Queue, storage } = harness();
  const queue = new Queue({ submissionId: "s1", revision: 3, save: async () => {} });
  for (const invalid of ["not-json", "null", JSON.stringify({ submissionId: "s1", revision: 3, answers: [] }), JSON.stringify({ submissionId: "s1", revision: -1, answers: {} })]) {
    storage.set("learning:draft:s1", invalid);
    assert.equal(queue.recover({ blockIds: ["table"] }).state, "empty");
  }
  seed(storage, { submissionId: "another-student-submission" });
  assert.equal(queue.recover({ blockIds: ["table"] }).state, "empty");
  seed(storage, { answers: { table: "valid", unknown: "ignored", instruction: "ignored" } });
  const recovered = queue.recover({ blockIds: ["table"] });
  assert.equal(recovered.state, "restored");
  assert.deepEqual(Object.keys(recovered.answers), ["table"]);
  queue.destroy();
});

test("storage failure does not falsely promise that an offline copy was saved", async () => {
  const { Queue } = harness({ unavailable: true });
  const statuses = [];
  const queue = new Queue({ submissionId: "s1", onStatus: (status) => statuses.push(status), save: async () => { throw new ApiError("offline", { code: "NETWORK_ERROR" }); } });
  queue.schedule("table", "answer");
  await assert.rejects(queue.flushAll());
  assert.match(statuses.at(-1).label, /не закрывайте работу/);
  assert.equal(queue.pending.size, 1);
  queue.destroy();
});

test("a newer edit made during an in-flight save is not dropped", async () => {
  const { Queue, storage } = harness();
  let release;
  const calls = [];
  const queue = new Queue({ submissionId: "s1", save: async (id, value, revision) => {
    calls.push({ id, value, revision });
    if (calls.length === 1) await new Promise((resolve) => { release = resolve; });
    return { revision: revision + 1 };
  } });
  queue.schedule("table", "first");
  const saving = queue.flushAll();
  queue.schedule("table", "second");
  const alsoWaiting = queue.flushAll();
  release();
  await Promise.all([saving, alsoWaiting]);
  assert.deepEqual(calls, [{ id: "table", value: "first", revision: 0 }, { id: "table", value: "second", revision: 1 }]);
  assert.equal(storage.size, 0);
  queue.destroy();
});

test("a revision conflict keeps the local draft and stops automatic retries", async () => {
  const { Queue, storage } = harness();
  let calls = 0;
  const queue = new Queue({ submissionId: "s1", save: async () => { calls++; throw new ApiError("conflict", { status: 409 }); } });
  queue.schedule("table", "my answer");
  await assert.rejects(queue.flushAll(), /conflict/);
  await assert.rejects(queue.flushAll(), /conflict/);
  assert.equal(calls, 1);
  assert.equal(JSON.parse(storage.get("learning:draft:s1")).answers.table, "my answer");
  queue.destroy();
});
