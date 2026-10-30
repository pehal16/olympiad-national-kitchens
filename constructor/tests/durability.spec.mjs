import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Store } from "../server/store.mjs";
import { Service } from "../server/service.mjs";
import { AnswerQueue } from "../server/answer-queue.mjs";
import { createApp } from "../server/index.mjs";
import { project, question } from "../shared/catalog.js";

test("FULL group commit survives reopening; a conflicting answer does not roll back neighbours", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "constructor-durable-"));
  let store = new Store(root);
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const service = new Service(store),
    user = { id: "test-owner", role: "owner" },
    p = project("Групповая фиксация");
  p.rounds[0].questions = [question(), question()];
  const saved = service.createProject(user, { project: p }),
    release = service.publish(user, saved.id),
    run = service.createRun(user, {
      releaseId: release.id,
      settings: { status: "open" },
    }),
    [person] = service.addParticipants(user, run.id, [{ fullName: "Образец" }]),
    session = service.begin(run.id, { code: person.code }),
    attempt = store.get("attempt", session.attemptId),
    queue = new AnswerQueue(store, service);
  const [a, b] = p.rounds[0].questions,
    op = { answer: "o1", expectedRevision: 0, idempotencyKey: "durable-first" };
  const results = await Promise.allSettled([
    queue.save(attempt, a.id, op),
    queue.save(attempt, a.id, { ...op, idempotencyKey: "durable-conflict" }),
    queue.save(attempt, b.id, { ...op, idempotencyKey: "durable-neighbour" }),
  ]);
  assert.deepEqual(
    results.map((r) => r.status),
    ["fulfilled", "rejected", "fulfilled"],
  );
  assert.equal(results[1].reason.code, "answer_conflict");
  queue.close();
  store.close();
  store = new Store(root);
  assert.equal(store.get("attempt", attempt.id).answers[a.id].revision, 1);
  assert.equal(store.get("attempt", attempt.id).answers[b.id].revision, 1);
  assert.ok(store.request(attempt.id + ":" + a.id, op.idempotencyKey));
  assert.equal(
    Object.values(store.db.prepare("PRAGMA synchronous").get())[0],
    2,
  );
});
test("SPA and protected files work when the Windows installation is inside a hidden parent folder", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), ".constructor-hidden-")),
    assets = path.join(root, "assets");
  fs.mkdirSync(assets);
  fs.writeFileSync(
    path.join(assets, "index.html"),
    '<!doctype html><html lang="ru">Проверка установки</html>',
  );
  const app = createApp({
      storageDir: path.join(root, "data"),
      assetRoot: assets,
    }),
    server = app.app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    await app.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/constructor/?view=builder`,
  );
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Проверка установки/);
});
