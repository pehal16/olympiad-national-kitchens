import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../server/index.mjs";
import { project, round, question } from "../shared/catalog.js";
test("timed questions and future rounds stay closed; expired answers cannot be edited through the API engine", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "constructor-timers-")),
    app = createApp({ storageDir: dir });
  t.after(async () => {
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const s = app.service,
    u = { id: "timer-owner", role: "owner" },
    p = project("Таймеры");
  p.rounds[0].questions = [
    { ...question(), seconds: 1 },
    { ...question(), seconds: 60 },
  ];
  p.rounds.push({ ...round("Закрытый тур"), questions: [question()] });
  const saved = s.createProject(u, { project: p }),
    release = s.publish(u, saved.id),
    run = s.createRun(u, {
      releaseId: release.id,
      settings: { status: "open" },
    }),
    [person] = s.addParticipants(u, run.id, [{ fullName: "Образец" }]),
    session = s.begin(run.id, { code: person.code });
  let a = app.store.get("attempt", session.attemptId),
    view = s.view(a);
  assert.equal(view.rounds[0].questions[1].type, "instruction");
  assert.equal(view.rounds[1].questions[0].type, "instruction");
  assert.equal(view.rounds[1].questions[0].key, undefined);
  const [first, second] = a.variant.rounds[0].questions;
  a.questionTimes[first.id] = new Date(Date.now() - 2000).toISOString();
  a.questionStartedAt = a.questionTimes[first.id];
  s.persistAttempt(a);
  view = s.view(app.store.get("attempt", a.id));
  assert.equal(view.currentQuestion, 1);
  assert.equal(view.rounds[0].questions[1].type, "single_choice");
  a = app.store.get("attempt", a.id);
  assert.throws(
    () =>
      s.saveAnswer(a, first.id, {
        answer: "o1",
        expectedRevision: 0,
        idempotencyKey: "late-answer",
      }),
    (e) => e.code === "question_expired",
  );
  assert.throws(
    () => s.navigate(a, { index: 0 }),
    (e) => e.code === "question_expired",
  );
  s.saveAnswer(a, second.id, {
    answer: "o1",
    expectedRevision: 0,
    idempotencyKey: "on-time-answer",
  });
  const next = s.finishRound(app.store.get("attempt", a.id));
  assert.equal(next.currentRound, 1);
  assert.equal(next.rounds[1].questions[0].type, "single_choice");
  a = app.store.get("attempt", a.id);
  a.variant.rounds[1].availableUntil = new Date(
    Date.now() - 1000,
  ).toISOString();
  s.persistAttempt(a);
  assert.equal(s.view(app.store.get("attempt", a.id)).status, "completed");
});
