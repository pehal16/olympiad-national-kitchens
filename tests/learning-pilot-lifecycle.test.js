"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { FileLearningRepository } = require("../src/learning/repositories/file");
const { LearningService } = require("../src/learning/service");
const { configureLearningRuntime } = require("../src/learning/repository");
const { LearningFileStore } = require("../src/learning/files");

test("pilot supports bootstrap, forced password change, assignment, submission and grade", async (t) => {
  const storageDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "learning-pilot-"));
  t.after(() => fs.promises.rm(storageDir, { recursive: true, force: true }));

  const repository = await new FileLearningRepository({ storageDir }).init();
  const service = new LearningService(repository, { pepper: "test-pepper", passwordIterations: 10_000 });
  await service.bootstrapAdmin({
    bootstrapSecret: "bootstrap-test",
    login: "teacher-pilot",
    password: "PilotAdmin2026",
    displayName: "Преподаватель Пилота"
  }, "bootstrap-test");

  const adminLogin = await service.login({ login: "teacher-pilot", password: "PilotAdmin2026" });
  const admin = await service.authenticate(adminLogin.token);
  const pilot = await service.seedPilot(admin);
  assert.equal(pilot.seeded, true);
  assert.equal(pilot.credentials.length, 4);
  assert.equal(pilot.subjects.length, 5);
  assert.equal(pilot.courses.length, 5);
  assert.equal(pilot.works.length, 5);

  const repeated = await service.seedPilot(admin);
  assert.equal(repeated.seeded, false);
  assert.equal(repeated.credentials.length, 0);
  assert.equal(repeated.works.length, 5);
  assert.equal((await service.listTeacherAssignments(admin)).length, 5);

  const firstCredential = pilot.credentials[0];
  const firstLogin = await service.login({
    login: firstCredential.login,
    password: firstCredential.temporaryPassword
  });
  let student = await service.authenticate(firstLogin.token);
  assert.equal(student.credential.must_change_password, 1);
  await assert.rejects(() => service.studentDashboard(student), (error) => error.code === "password_change_required");

  await service.changePassword(student, {
    currentPassword: firstCredential.temporaryPassword,
    newPassword: "NewStudent2026",
    confirmPassword: "NewStudent2026"
  });
  const changedLogin = await service.login({ login: firstCredential.login, password: "NewStudent2026" });
  student = await service.authenticate(changedLogin.token);

  const dashboard = await service.studentDashboard(student);
  assert.equal(dashboard.assignments.length, 5);
  const testAssignment = dashboard.assignments.find((item) => item.title.includes("Промежуточный тест"));
  assert.ok(testAssignment);
  const started = await service.startSubmission(student, testAssignment.id);

  const secondCredential = pilot.credentials[1];
  const secondTemporaryLogin = await service.login({
    login: secondCredential.login,
    password: secondCredential.temporaryPassword
  });
  let secondStudent = await service.authenticate(secondTemporaryLogin.token);
  await service.changePassword(secondStudent, {
    currentPassword: secondCredential.temporaryPassword,
    newPassword: "SecondStudent2026",
    confirmPassword: "SecondStudent2026"
  });
  const secondLogin = await service.login({ login: secondCredential.login, password: "SecondStudent2026" });
  secondStudent = await service.authenticate(secondLogin.token);
  await assert.rejects(
    () => service.saveAnswer(secondStudent, started.id, "test-single", { value: "cutter", expectedRevision: 0 }),
    (error) => error.code === "submission_not_found"
  );
  await assert.rejects(
    () => service.getTeacherSubmission(secondStudent, started.id),
    (error) => error.code === "forbidden"
  );

  const answers = {
    "test-single": "cutter",
    "test-multiple": ["inspect", "guard", "idle"],
    "test-match": { cutter: "slice", peeler: "peel", mixer: "whip" },
    "test-classify": { fridge: "cold", stove: "heat", scale: "weight", slicer: "mechanical" },
    "test-order": ["stop", "power", "warn", "report"],
    "test-crossword": { words: { one: "ограждение", two: "стоп" } }
  };
  let draftRevision = 0;
  for (const [blockId, value] of Object.entries(answers)) {
    const saved = await service.saveAnswer(student, started.id, blockId, {
      value,
      expectedRevision: draftRevision
    });
    draftRevision = saved.draftRevision;
  }

  const submitted = await service.submit(student, started.id, {
    expectedRevision: draftRevision,
    idempotencyKey: "pilot-complete-test"
  });
  assert.equal(submitted.submission.status, "submitted");
  assert.equal(submitted.submission.auto_score, 100);
  const cached = await service.submit(student, started.id, {
    expectedRevision: draftRevision,
    idempotencyKey: "pilot-complete-test"
  });
  assert.equal(cached.revision.id, submitted.revision.id);

  const detail = await service.getTeacherSubmission(admin, started.id);
  assert.equal(detail.student.id, student.user.id);
  assert.equal(JSON.stringify(await service.getStudentAssignment(student, testAssignment.id)).includes("optionId"), false);
  const graded = await service.gradeSubmission(admin, started.id, {
    rubricScores: [],
    comment: "Работа выполнена верно.",
    publish: true
  });
  assert.equal(graded.status, "accepted");
  assert.equal(graded.grade, "5");

  const finalDashboard = await service.studentDashboard(student);
  const completed = finalDashboard.assignments.find((item) => item.id === testAssignment.id);
  assert.equal(completed.status, "accepted");
  assert.equal(completed.grade, "5");

  configureLearningRuntime({ storageDir, enabled: true });
  const practiceAssignment = finalDashboard.assignments.find((item) => item.title.includes("Технологическая схема"));
  const practiceSubmission = await service.startSubmission(student, practiceAssignment.id);
  const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n", "utf8");
  const pendingFile = await service.prepareAttachment(student, practiceSubmission.id, {
    blockId: "practice-file",
    fileName: "scheme.pdf",
    mimeType: "application/pdf",
    byteSize: pdf.length,
    storageBackend: "file"
  });
  const attachmentRecord = await repository.getAttachment(pendingFile.id);
  const fileStore = new LearningFileStore();
  await fileStore.put(attachmentRecord.object_key, pdf, {
    mimeType: attachmentRecord.mime_type,
    attachmentId: attachmentRecord.id,
    submissionId: practiceSubmission.id
  });
  const readyFile = await service.verifyAndFinalizeAttachment(student, pendingFile.id, pdf, "file");
  assert.equal(readyFile.status, "ready");
  assert.deepEqual((await fileStore.get(readyFile.object_key)).body, pdf);

  const practiceAnswers = {
    "practice-order": ["receive", "wash", "cook", "cool", "cut", "mix", "serve"],
    "practice-scheme": { nodes: [{ id: "n1", type: "operation", label: "Подготовка сырья" }] },
    "practice-safety": { checks: { uniform: true, hands: true, boards: true } },
    "practice-file": { files: [{ id: readyFile.id, name: "scheme.pdf", mimeType: "application/pdf", size: pdf.length, status: "stored" }] },
    "practice-conclusion": "Чистые и загрязнённые потоки разделены, а инвентарь используется по маркировке."
  };
  let practiceDraftRevision = 0;
  for (const [blockId, value] of Object.entries(practiceAnswers)) {
    const saved = await service.saveAnswer(student, practiceSubmission.id, blockId, {
      value, expectedRevision: practiceDraftRevision
    });
    practiceDraftRevision = saved.draftRevision;
  }
  await service.submit(student, practiceSubmission.id, {
    expectedRevision: practiceDraftRevision,
    idempotencyKey: "pilot-file-submit"
  });
  await service.returnSubmission(admin, practiceSubmission.id, { comment: "Замените схему на уточнённую версию." });
  const preserved = await service.deleteAttachment(student, readyFile.id);
  assert.equal(preserved.preserved_for_revision, true);
  assert.deepEqual((await fileStore.get(readyFile.object_key)).body, pdf);
});
