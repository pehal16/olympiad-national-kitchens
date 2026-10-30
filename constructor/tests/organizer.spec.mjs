import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../server/index.mjs";
import { project, question } from "../shared/catalog.js";
import { PDFDocument } from "pdf-lib";
async function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "constructor-organizer-")),
    app = createApp({ storageDir: dir });
  t.after(async () => {
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const login = await app.service.setup({
    setupCode: app.store.meta("setupSecret"),
    login: "owner",
    name: "Образец",
    password: "Organizer-test-123",
  });
  return { ...app, login, user: app.service.authenticate(login.token) };
}
test("nomination and exclusion require reasons, preserve incompleteness and invalidate approval", async (t) => {
  const f = await fixture(t),
    p = project("Номинации");
  p.rounds[0].questions = [question()];
  p.awardRules = [
    {
      id: "nomination",
      mode: "nomination",
      title: "Особое решение",
      templateId: "unused",
    },
  ];
  const saved = f.service.createProject(f.user, { project: p }),
    release = f.service.publish(f.user, saved.id),
    run = f.service.createRun(f.user, {
      releaseId: release.id,
      settings: { status: "open" },
    }),
    [person] = f.service.addParticipants(f.user, run.id, [
      { fullName: "Проверка" },
    ]),
    session = f.service.begin(run.id, { code: person.code });
  assert.throws(
    () =>
      f.service.excludeAttempt(f.user, session.attemptId, { excluded: true }),
    /причину/,
  );
  f.service.excludeAttempt(f.user, session.attemptId, {
    excluded: true,
    reason: "Работа не завершена по решению организатора",
  });
  assert.equal(f.store.get("attempt", session.attemptId).status, "in_progress");
  assert.equal(f.service.awardPreview(f.user, run.id).candidates.length, 0);
  assert.throws(() =>
    f.service.setNominations(f.user, run.id, {
      ruleId: "nomination",
      participantIds: ["foreign"],
      reason: "Проверка",
    }),
  );
  f.service.setNominations(f.user, run.id, {
    ruleId: "nomination",
    participantIds: [person.id],
    reason: "Основание зафиксировано",
  });
  assert.deepEqual(f.store.get("run", run.id).nominations.nomination, [
    person.id,
  ]);
  assert.equal(f.store.get("run", run.id).awardsApproved, false);
  assert.ok(
    f.store.history(run.id).some((e) => e.action === "awards.nominations"),
  );
});
test("changing password verifies current secret and invalidates every previous session", async (t) => {
  const f = await fixture(t),
    second = await f.service.login({
      login: "owner",
      password: "Organizer-test-123",
    });
  await assert.rejects(
    f.service.changePassword(f.user, {
      currentPassword: "incorrect",
      newPassword: "Changed-password-123",
    }),
  );
  assert.ok(f.service.authenticate(f.login.token));
  const changed = await f.service.changePassword(f.user, {
    currentPassword: "Organizer-test-123",
    newPassword: "Changed-password-123",
  });
  assert.equal(f.service.authenticate(f.login.token), null);
  assert.equal(f.service.authenticate(second.token), null);
  assert.ok(f.service.authenticate(changed.token));
  await assert.rejects(
    f.service.login({ login: "owner", password: "Organizer-test-123" }),
  );
});
test("HTTP file evidence stays private, is spooled to disk, and respects pause and manual grading", async (t) => {
  const f = await fixture(t),
    p = project("Файловый ответ"),
    q = question("file_evidence");
  p.rounds[0].questions = [q];
  const saved = f.service.createProject(f.user, { project: p }),
    release = f.service.publish(f.user, saved.id),
    run = f.service.createRun(f.user, {
      releaseId: release.id,
      settings: { status: "open" },
    }),
    [person] = f.service.addParticipants(f.user, run.id, [
      { fullName: "Проверка файла" },
    ]),
    session = f.service.begin(run.id, { code: person.code });
  const invitation = f.service.invite(f.user, {}),
    teacher = await f.service.acceptInvite({
      invitation: invitation.invitation,
      login: "foreign-teacher",
      name: "Другой педагог",
      password: "Foreign-test-123",
    });
  const server = f.app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => new Promise((r) => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}/api/constructor/v1`;
  for (const route of [
    "/projects/" + saved.id,
    "/runs/" + run.id + "/results",
    "/attempts/" + session.attemptId,
  ])
    assert.equal(
      (
        await fetch(base + route, {
          headers: { Cookie: "constructor_session=" + teacher.token },
        })
      ).status,
      404,
    );
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const bytes = await pdf.save(),
    form = () => {
      const data = new FormData();
      data.append("questionId", q.id);
      data.append(
        "file",
        new Blob([bytes], { type: "application/pdf" }),
        "proof.pdf",
      );
      return data;
    };
  assert.equal(
    (
      await fetch(base + `/public/attempts/${session.attemptId}/files`, {
        method: "POST",
        body: form(),
      })
    ).status,
    401,
  );
  f.service.pause(f.user, session.attemptId, {
    paused: true,
    reason: "Проверка паузы",
  });
  assert.equal(
    (
      await fetch(base + `/public/attempts/${session.attemptId}/files`, {
        method: "POST",
        headers: { "X-Participant-Token": session.token },
        body: form(),
      })
    ).status,
    409,
  );
  f.service.pause(f.user, session.attemptId, {
    paused: false,
    reason: "Продолжение",
  });
  const response = await fetch(
    base + `/public/attempts/${session.attemptId}/files`,
    {
      method: "POST",
      headers: { "X-Participant-Token": session.token },
      body: form(),
    },
  );
  assert.equal(response.status, 200);
  const media = (await response.json()).data;
  assert.equal(
    (
      await fetch(base + "/media/" + media.id, {
        headers: { Cookie: "constructor_session=" + teacher.token },
      })
    ).status,
    404,
  );
  const read = await fetch(base + "/media/" + media.id, {
    headers: { "X-Participant-Token": session.token },
  });
  assert.equal(read.status, 200);
  assert.deepEqual(Buffer.from(await read.arrayBuffer()), Buffer.from(bytes));
  assert.equal(
    fs.readdirSync(path.join(f.store.root, "jobs", "uploads")).length,
    0,
  );
  f.service.saveAnswer(f.store.get("attempt", session.attemptId), q.id, {
    answer: [media.id],
    expectedRevision: 0,
    idempotencyKey: "evidence-save",
  });
  f.service.finishRound(f.store.get("attempt", session.attemptId));
  assert.equal(f.service.results(f.user, run.id)[0].summary.score, null);
});
