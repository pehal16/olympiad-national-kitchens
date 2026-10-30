import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../server/index.mjs";
import { project, question } from "../shared/catalog.js";
test("a score change during PDF rendering stops issuance under the obsolete approval", async (t) => {
  const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "constructor-award-race-"),
    ),
    f = createApp({ storageDir: root });
  t.after(async () => {
    await f.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const s = f.service,
    user = { id: "race-owner", role: "owner" };
  s.ensureTemplates(user);
  const template = s.templates(user)[0],
    p = project("Проверка смены оценки");
  p.rounds[0].questions = [question()];
  p.awardRules = [
    { id: "participation", mode: "participation", templateId: template.id },
  ];
  const saved = s.createProject(user, { project: p }),
    release = s.publish(user, saved.id),
    run = s.createRun(user, {
      releaseId: release.id,
      settings: { status: "open", maxAttempts: 2 },
    }),
    [person] = s.addParticipants(user, run.id, [
      { fullName: "Проверочный участник" },
    ]),
    session = s.begin(run.id, { code: person.code }),
    q = p.rounds[0].questions[0];
  s.saveAnswer(f.store.get("attempt", session.attemptId), q.id, {
    answer: q.key.optionId,
    idempotencyKey: "race-save",
    expectedRevision: 0,
  });
  s.finishRound(f.store.get("attempt", session.attemptId));
  const preview = s.awardPreview(user, run.id);
  s.approveAwards(user, run.id, { resultHash: preview.resultHash });
  let started, finish;
  const began = new Promise((r) => (started = r)),
    gate = new Promise((r) => (finish = r));
  f.documents.render = async () => {
    started();
    await gate;
    return Buffer.from("obsolete PDF");
  };
  const job = f.documents.issue(user, run.id);
  await began;
  s.review(user, session.attemptId, {
    questionId: q.id,
    score: 0,
    comment: "Уточнена оценка",
  });
  finish();
  for (
    let i = 0;
    i < 100 &&
    ["queued", "running"].includes(f.store.get("job", job.id).status);
    i++
  )
    await new Promise((r) => setTimeout(r, 10));
  assert.equal(f.store.get("job", job.id).status, "failed");
  assert.equal(f.store.list("issue", null, run.id).length, 0);
  assert.equal(fs.readdirSync(path.join(root, "documents")).length, 0);
  const updated = s.awardPreview(user, run.id);
  s.approveAwards(user, run.id, { resultHash: updated.resultHash });
  const issuedJob = f.documents.issue(user, run.id);
  while (
    ["queued", "running"].includes(f.store.get("job", issuedJob.id).status)
  )
    await new Promise((r) => setTimeout(r, 10));
  const [document] = f.store.list("issue", null, run.id);
  assert.ok(document);
  f.documents.revoke(user, document.id, "Явное решение организатора");
  const repeated = f.documents.issue(user, run.id);
  while (["queued", "running"].includes(f.store.get("job", repeated.id).status))
    await new Promise((r) => setTimeout(r, 10));
  assert.equal(f.store.list("issue", null, run.id).length, 1);
  assert.equal(f.store.get("issue", document.id).status, "revoked");
  assert.equal(f.store.get("job", repeated.id).result.skippedRevoked.length, 1);
  s.setRun(user, run.id, { publishResults: true });
  s.begin(run.id, { code: person.code });
  assert.equal(f.store.get("run", run.id).awardsApproved, false);
  assert.equal(f.store.get("run", run.id).published, false);
});
