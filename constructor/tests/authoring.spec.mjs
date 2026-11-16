import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../server/index.mjs";
import { project, question } from "../shared/catalog.js";
import { blankQuestion, convertQuestion } from "../shared/authoring.js";
import { validateProject, sanitizedQuestion } from "../server/domain.mjs";
import { learningSummary } from "../shared/results.js";

test("new choice needs an explicit key; conversion retains content and private labels stay private", () => {
  const q = blankQuestion();
  q.title = "Выберите столицу России";
  q.config.options.forEach(
    (o, i) => (o.label = ["Москва", "Тула", "Омск", "Псков"][i]),
  );
  const p = project("Работа");
  p.rounds[0].questions = [q];
  const issues = [];
  assert.match(validateProject(p, issues).join(), /ключ/);
  assert.equal(issues.find((x) => /ключ/.test(x.message)).questionId, q.id);
  q.key = { optionId: q.config.options[0].id };
  q.internal = { label: "Личный ориентир" };
  assert.deepEqual(validateProject(p), []);
  const multiple = convertQuestion(q, "multiple_choice");
  assert.deepEqual(multiple.config.options, q.config.options);
  assert.deepEqual(multiple.key.optionIds, [q.key.optionId]);
  const short = convertQuestion(q, "short_text");
  assert.equal(short.title, q.title);
  assert.equal(short.id, q.id);
  assert.deepEqual(short.key, {});
  const spatial = question("hotspot");
  spatial.seconds = 75;
  spatial.caseId = "case-1";
  spatial.config.image = "/constructor/example.webp";
  const converted = convertQuestion(spatial, "long_text");
  assert.equal(converted.seconds, 75);
  assert.equal(converted.caseId, "case-1");
  assert.equal(converted.media[0].url, spatial.config.image);
  assert.equal(
    spatial.media.length,
    0,
    "conversion does not mutate the original material list",
  );
  const student = sanitizedQuestion(q);
  assert.equal(student.internal, undefined);
  assert.equal(student.key, undefined);
});

test("prepare-run atomically freezes one version and one closed run; retries, conflicts and rights", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "guided-authoring-"));
  const app = createApp({ storageDir: root });
  t.after(async () => {
    await app.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const login = await app.service.setup({
    setupCode: app.store.meta("setupSecret"),
    login: "owner",
    name: "Проверка",
    password: "Only-test-password-123",
  });
  const user = app.service.authenticate(login.token);
  const p = project("Проверочная работа");
  p.rounds[0].questions = [question()];
  const saved = app.service.createProject(user, { project: p });
  const body = {
    operationId: "repeat_operation_001",
    expectedRevision: saved.revision,
    settings: {
      entryMode: "open",
      registrationFields: ["fullName", "groupName"],
    },
  };
  const result = app.service.prepareRun(user, saved.id, body);
  assert.deepEqual(app.service.prepareRun(user, saved.id, body), result);
  assert.deepEqual(
    app.service.prepareRun(user, saved.id, {
      ...body,
      operationId: "after_reload_004",
    }),
    result,
  );
  assert.equal(app.store.list("run", user.id, saved.id).length, 1);
  assert.equal(app.store.list("release", user.id, saved.id).length, 1);
  const run = app.service.get(user, "run", result.runId);
  assert.equal(run.settings.status, "draft");
  assert.equal(run.settings.entryMode, "open");
  assert.throws(
    () =>
      app.service.prepareRun(user, saved.id, {
        ...body,
        operationId: "different_op_002",
        expectedRevision: 999,
      }),
    /изменилась/,
  );
  assert.throws(
    () =>
      app.service.prepareRun(user, saved.id, {
        ...body,
        operationId: "invalid_setting_003",
        settings: { seconds: -3 },
      }),
    /время|Время|отрицательн/,
  );
  assert.equal(
    app.store.list("release", user.id, saved.id).length,
    1,
    "failed run creation rolls publication back",
  );
  app.service.setRun(user, run.id, { teacherNotes: "Разобрать выбор" });
  assert.equal(app.service.publicRun(run.id).teacherNotes, undefined);
  const invite = app.service.invite(user, {
    name: "Проверочный преподаватель",
    permissions: { conduct: false },
  });
  assert.equal(
    app.service.invitationInfo(invite.invitation).name,
    "Проверочный преподаватель",
  );
  const teacherLogin = await app.service.acceptInvite({
    invitation: invite.invitation,
    login: "teacher",
    password: "Only-test-password-456",
  });
  const teacher = app.service.authenticate(teacherLogin.token);
  assert.throws(
    () => app.service.invitationInfo(invite.invitation),
    /использовано|истёк/,
  );
  const own = app.service.createProject(teacher, { project: p });
  assert.throws(
    () =>
      app.service.prepareRun(teacher, own.id, {
        ...body,
        expectedRevision: own.revision,
      }),
    /прав|доступ|ограничено/i,
  );
  assert.deepEqual(app.service.preferences(teacher), {
    authoringMode: "guided",
  });
  app.service.preferences(teacher, { authoringMode: "full" });
  assert.equal(app.service.preferences(teacher).authoringMode, "full");
  assert.equal(app.service.preferences(user).authoringMode, "guided");
});

test("analysis normalizes different maxima, separates blanks, and excludes trials, pending and incomplete work", () => {
  const row = (score, answer, status = "completed") => ({
    status,
    answers: { q: { answer } },
    summary: {
      pending: false,
      rounds: [
        {
          id: "r",
          title: "Тур",
          score,
          maxScore: 4,
          questions: [{ id: "q", title: "Вопрос", score, maxScore: 4 }],
        },
      ],
    },
  });
  const a = row(2, "Ответ"),
    b = row(0, null),
    pending = { ...row(4, "Да"), summary: { pending: true } };
  const result = learningSummary([
    a,
    b,
    row(4, "Да", "in_progress"),
    pending,
    { ...row(4, "Да"), trial: true },
  ]);
  assert.equal(result.n, 2);
  assert.equal(result.rounds[0].percent, 25);
  assert.equal(result.questions[0].belowMaximum, 1);
  assert.equal(result.questions[0].blank, 1);
  const structured = learningSummary([
    row(0, {}),
    row(0, { selectedIds: [], phase: 0, served: false }),
    row(0, { value: "", unit: "кг" }),
    row(0, []),
    row(0, " "),
    row(4, 0),
    row(4, false),
  ]);
  assert.equal(structured.questions[0].blank, 5);
  assert.equal(structured.questions[0].belowMaximum, 0);
});

test("mentor award names the mentor, deduplicates the same mentor, and never substitutes the student's name when missing", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mentor-award-"));
  const app = createApp({ storageDir: root });
  t.after(async () => {
    await app.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const login = await app.service.setup({
    setupCode: app.store.meta("setupSecret"),
    login: "owner",
    name: "Проверка",
    password: "Only-test-password-123",
  });
  const user = app.service.authenticate(login.token),
    templates = app.service.templates(user);
  assert.equal(templates.length, 12, "first login has ready templates");
  const q = question(),
    p = project("Проверка получателей");
  p.rounds[0].questions = [q];
  p.awardRules = [
    {
      id: "student",
      mode: "participation",
      templateId: templates.find((t) => t.kind === "certificate").id,
    },
    {
      id: "mentor",
      mode: "participation",
      recipient: "mentor",
      templateId: templates.find((t) => t.kind === "thanks").id,
    },
  ];
  const saved = app.service.createProject(user, { project: p });
  const release = app.service.publish(user, saved.id),
    run = app.service.createRun(user, {
      releaseId: release.id,
      settings: { status: "open", entryMode: "codes" },
    });
  async function finish(name, mentorName) {
    const [person] = app.service.addParticipants(user, run.id, [
      { fullName: name, mentorName, institution: "Изолированный стенд" },
    ]);
    const session = app.service.begin(run.id, { code: person.code });
    app.service.saveAnswer(app.store.get("attempt", session.attemptId), q.id, {
      answer: q.key.optionId,
      expectedRevision: 0,
      idempotencyKey: "save-" + person.id,
    });
    app.service.finishRound(app.store.get("attempt", session.attemptId));
  }
  await finish("Участник Первый", "Проверочный Наставник");
  await finish("Участник Второй", "Проверочный Наставник");
  const preview = app.service.awardPreview(user, run.id);
  assert.equal(preview.candidates.length, 3);
  const mentor = preview.candidates.find((x) => x.recipient === "mentor");
  assert.equal(mentor.fullName, "Проверочный Наставник");
  assert.notEqual(mentor.fullName, mentor.participant.fullName);
  assert.equal(
    preview.candidates.filter((x) => x.recipient === "participant").length,
    2,
  );
  await finish("Участник Без Наставника", "");
  assert.throws(
    () => app.service.awardPreview(user, run.id),
    /не указано ФИО наставника/,
  );
});
