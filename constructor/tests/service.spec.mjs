import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../server/index.mjs";
import { question, project } from "../shared/catalog.js";
import {
  exportPackage,
  inspectPackage,
  importPackage,
} from "../server/transfer.mjs";
import { correct } from "./helpers.mjs";
async function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "constructor-test-")),
    app = createApp({ storageDir: dir });
  t.after(async () => {
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const login = await app.service.setup({
      setupCode: app.store.meta("setupSecret"),
      login: "owner",
      name: "Проверочный владелец",
      password: "Test-password-123",
    }),
    user = app.service.authenticate(login.token);
  const p = project("Проверочный тест");
  p.rounds[0].questions = [question()];
  const saved = app.service.createProject(user, { project: p }),
    release = app.service.publish(user, saved.id),
    run = app.service.createRun(user, {
      releaseId: release.id,
      settings: { entryMode: "codes", status: "open" },
    }),
    [participant] = app.service.addParticipants(user, run.id, [
      { fullName: "Участник 001" },
    ]);
  return { ...app, user, project: saved, release, run, participant };
}
test("published release is immutable and old attempt survives author edit", async (t) => {
  const f = await fixture(t);
  const session = f.service.begin(f.run.id, { code: f.participant.code });
  const p = f.service.saveProject(f.user, f.project.id, {
    project: { ...f.project, title: "Новая редакция" },
    expectedRevision: 0,
  });
  assert.equal(p.title, "Новая редакция");
  assert.equal(
    f.service.participantAttempt(session.token, session.attemptId).variant
      .title,
    "Проверочный тест",
  );
  assert.throws(
    () => f.store.put("release", f.release.id, f.user.id, {}),
    /immutable/,
  );
});
test("revision conflict never overwrites author draft", async (t) => {
  const f = await fixture(t);
  f.service.saveProject(f.user, f.project.id, {
    project: { ...f.project, title: "Первый" },
    expectedRevision: 0,
  });
  assert.throws(
    () =>
      f.service.saveProject(f.user, f.project.id, {
        project: { ...f.project, title: "Второй" },
        expectedRevision: 0,
      }),
    (e) => e.status === 409,
  );
  assert.equal(f.store.get("project", f.project.id).title, "Первый");
});
test("foreign teacher cannot enumerate or read someone else project", async (t) => {
  const f = await fixture(t);
  const { invitation } = f.service.invite(f.user, {}),
    login = await f.service.acceptInvite({
      invitation,
      login: "teacher",
      name: "Преподаватель",
      password: "Teacher-pass-123",
    }),
    teacher = f.service.authenticate(login.token);
  assert.equal(f.service.visible(teacher, "project").length, 0);
  assert.throws(
    () => f.service.get(teacher, "project", f.project.id),
    (e) => e.status === 404,
  );
  f.service.share(f.user, "project", f.project.id, [teacher.id]);
  assert.equal(
    f.service.get(teacher, "project", f.project.id).title,
    f.project.title,
  );
  assert.throws(
    () => f.service.get(teacher, "project", f.project.id, true),
    (e) => e.status === 404,
  );
});
test("save acknowledgement, retries, conflict and foreign token", async (t) => {
  const f = await fixture(t),
    s = f.service.begin(f.run.id, { code: f.participant.code });
  const a = f.service.participantAttempt(s.token, s.attemptId),
    q = a.variant.rounds[0].questions[0];
  const body = {
    answer: correct(q),
    expectedRevision: 0,
    idempotencyKey: "save-test-123",
  };
  const receipt = f.service.saveAnswer(a, q.id, body);
  assert.equal(receipt.revision, 1);
  assert.deepEqual(f.service.saveAnswer(a, q.id, body), receipt);
  assert.throws(
    () =>
      f.service.saveAnswer(a, q.id, {
        ...body,
        idempotencyKey: "new-save-123",
      }),
    (e) => e.code === "answer_conflict",
  );
  assert.throws(
    () => f.service.participantAttempt("foreign", a.id),
    (e) => e.status === 401,
  );
  const done = f.service.finishRound(f.store.get("attempt", a.id));
  assert.equal(done.status, "completed");
  assert.equal(done.summary, undefined);
  assert.equal(f.service.results(f.user, f.run.id)[0].summary.score, 2);
});
test("repeated start returns active attempt and max attempts stays enforced", async (t) => {
  const f = await fixture(t),
    a = f.service.begin(f.run.id, { code: f.participant.code }),
    b = f.service.begin(f.run.id, { code: f.participant.code });
  assert.equal(a.attemptId, b.attemptId);
  const x = f.service.participantAttempt(a.token, a.attemptId);
  f.service.saveAnswer(x, x.variant.rounds[0].questions[0].id, {
    answer: "o1",
    idempotencyKey: "finish-test",
    expectedRevision: 0,
  });
  f.service.finishRound(f.store.get("attempt", x.id));
  assert.throws(
    () => f.service.begin(f.run.id, { code: f.participant.code }),
    (e) => e.status === 409,
  );
});
test("encrypted material transfer verifies password, preview and repeated import", async (t) => {
  const f = await fixture(t);
  const bytes = exportPackage(f.service, f.user, {
    kind: "materials",
    projectId: f.project.id,
    password: "Package-pass-123",
  });
  assert.ok(!bytes.toString().includes("Проверочный тест"));
  assert.throws(() => inspectPackage(f.service, f.user, bytes, "wrong"));
  const preview = inspectPackage(f.service, f.user, bytes, "Package-pass-123");
  assert.equal(preview.preview.kind, "materials");
  assert.throws(() =>
    importPackage(f.service, f.user, bytes, "Package-pass-123", "changed"),
  );
  const result = importPackage(
    f.service,
    f.user,
    bytes,
    "Package-pass-123",
    preview.packageHash,
  );
  assert.ok(result.imported > 0);
  assert.equal(
    importPackage(
      f.service,
      f.user,
      bytes,
      "Package-pass-123",
      preview.packageHash,
    ).duplicate,
    true,
  );
  assert.equal(f.store.get("project", f.project.id).title, "Проверочный тест");
});
test("HTTP: authentication, CSRF, public start and private media boundaries", async (t) => {
  const f = await fixture(t);
  const server = f.app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/constructor/v1`;
  assert.equal((await fetch(base + "/projects")).status, 401);
  const login = await fetch(base + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: "owner", password: "Test-password-123" }),
  });
  const cookie = login.headers.get("set-cookie").split(";")[0],
    data = (await login.json()).data;
  assert.equal(
    (
      await fetch(base + "/projects", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
    403,
  );
  const create = await fetch(base + "/projects", {
    method: "POST",
    headers: {
      Cookie: cookie,
      "X-CSRF-Token": data.csrf,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: "Создан через HTTP" }),
  });
  assert.equal(create.status, 200);
  assert.equal((await fetch(base + "/media/media_unknown")).status, 404);
});
