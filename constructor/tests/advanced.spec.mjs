import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Store } from "../server/store.mjs";
import { Service } from "../server/service.mjs";
import { project, question, round } from "../shared/catalog.js";
import { sanitizedQuestion, summarize } from "../server/domain.mjs";
import {
  validateCompleteAnswer,
  scheduledTime,
  validateTemplate,
  validateRunSettings,
} from "../server/validation.mjs";
test("student serialization removes nested keys and preserves crossword lengths", () => {
  const q = question("crossword");
  q.config.privateKey = { solution: "hidden" };
  q.config.token = "private";
  const safe = sanitizedQuestion(q);
  assert.equal(safe.key, undefined);
  assert.equal(safe.config.privateKey, undefined);
  assert.equal(safe.config.token, undefined);
  assert.equal(safe.config.clues[0].length, q.key.words.w1.length);
});
test("required composite answers cannot be submitted empty or incomplete", () => {
  for (const type of [
    "matching",
    "classification",
    "table",
    "ordering",
    "file_evidence",
    "scheme_builder",
    "ttk_builder",
    "observation_log",
  ])
    assert.throws(
      () => validateCompleteAnswer(question(type), {}),
      (e) => e.status === 422,
    );
  const q = question("restaurant_kitchen");
  assert.throws(
    () =>
      validateCompleteAnswer(q, { selectedIds: ["o1", "o2"], served: false }),
    (e) => e.status === 422,
  );
});
test("schedule uses Moscow timezone identically on Linux and Windows", () => {
  assert.equal(
    scheduledTime("2026-10-30T12:00"),
    Date.parse("2026-10-30T09:00:00Z"),
  );
});
test("invalid publication and page bounds are rejected", () => {
  assert.throws(() => validateRunSettings({ entryMode: "other" }));
  assert.throws(() =>
    validateTemplate({
      width: 297,
      height: 210,
      elements: [
        { id: "bad", type: "text", x: 296, y: 0, width: 20, height: 10 },
      ],
    }),
  );
});
test("manual gate, pause, final review and retry remain consistent", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "constructor-gates-")),
    store = new Store(root),
    s = new Service(store);
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const auth = await s.setup({
      setupCode: store.meta("setupSecret"),
      login: "owner",
      password: "Owner-password-123",
    }),
    user = s.authenticate(auth.token);
  const p = project("Два тура"),
    a = question("long_text");
  p.rounds[0].questions = [a];
  p.rounds[0].transition = "manual";
  p.rounds.push(round("Финал"));
  const b = question();
  p.rounds[1].questions = [b];
  const saved = s.createProject(user, { project: p }),
    release = s.publish(user, saved.id),
    run = s.createRun(user, {
      releaseId: release.id,
      settings: { entryMode: "codes", status: "open" },
    }),
    [person] = s.addParticipants(user, run.id, [{ fullName: "Участник" }]),
    session = s.begin(run.id, { code: person.code });
  let attempt = s.participantAttempt(session.token, session.attemptId);
  s.pause(user, attempt.id, { paused: true, reason: "Проверка паузы" });
  assert.throws(
    () =>
      s.saveAnswer(attempt, a.id, {
        answer: "Ответ",
        expectedRevision: 0,
        idempotencyKey: "paused-save",
      }),
    (e) => e.status === 409,
  );
  s.pause(user, attempt.id, { paused: false });
  attempt = store.get("attempt", attempt.id);
  s.saveAnswer(attempt, a.id, {
    answer: "Развёрнутый ответ",
    expectedRevision: 0,
    idempotencyKey: "first-answer",
  });
  assert.equal(
    s.finishRound(store.get("attempt", attempt.id)).status,
    "waiting",
  );
  s.review(user, attempt.id, {
    questionId: a.id,
    scores: { criterion1: 2 },
    comment: "Проверено",
  });
  s.decision(user, attempt.id, { approved: true });
  attempt = store.get("attempt", attempt.id);
  assert.equal(attempt.currentRound, 1);
  const payload = {
    answer: b.key.optionId,
    expectedRevision: 0,
    idempotencyKey: "final-answer",
  };
  const receipt = s.saveAnswer(attempt, b.id, payload);
  s.finishRound(store.get("attempt", attempt.id));
  assert.equal(summarize(store.get("attempt", attempt.id)).score, 4);
  assert.deepEqual(s.saveAnswer(attempt, b.id, payload), receipt);
});
