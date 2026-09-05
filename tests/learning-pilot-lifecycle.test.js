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

test("pilot supports group and full-name entry, assignment, submission and grade", async (t) => {
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
  assert.equal(pilot.subjects.length, 5);
  assert.equal(pilot.courses.length, 5);
  assert.equal(pilot.works.length, 7);

  const initialFirstWork = pilot.works[0];
  await repository.mutate((state) => {
    const marker = state.workBlocks.find((block) => block.version_id === initialFirstWork.versionId);
    const config = JSON.parse(marker.config_json || "{}");
    delete config.pilotContentRevision;
    marker.config_json = JSON.stringify(config);
  });

  const repeated = await service.seedPilot(admin);
  assert.equal(repeated.seeded, false);
  assert.equal(repeated.works.length, 7);
  assert.equal((await service.listTeacherAssignments(admin)).length, 7);
  assert.equal(repeated.works[0].assignmentId, initialFirstWork.assignmentId);
  assert.notEqual(repeated.works[0].versionId, initialFirstWork.versionId);
  assert.equal(repeated.works[0].upgraded, true);
  for (let i = 1; i < 7; i++) {
    assert.equal(repeated.works[i].upgraded, false);
    assert.equal(repeated.works[i].versionId, pilot.works[i].versionId);
    assert.equal(repeated.works[i].assignmentId, pilot.works[i].assignmentId);
  }

  const obsolete = await service.createAssignment(admin, {
    versionId: repeated.works[0].versionId,
    courseId: repeated.courses[0].id,
    groupIds: [pilot.group.id],
    title: "Промежуточный тест. Оборудование и безопасная работа",
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    allowLate: true,
    maxAttempts: 1
  });
  await service.seedPilot(admin);
  const archivedObsolete = (await service.listTeacherAssignments(admin)).find((item) => item.id === obsolete.id);
  assert.equal(archivedObsolete.status, "archived");

  const directory = await service.studentAccessStudents(pilot.group.id);
  assert.equal(directory.students.length, 4);
  const firstLogin = await service.selectStudent({
    groupId: pilot.group.id,
    studentId: directory.students[0].id
  });
  const student = await service.authenticate(firstLogin.token);
  assert.equal(firstLogin.user.mustChangePassword, false);

  const dashboard = await service.studentDashboard(student);
  assert.equal(dashboard.assignments.length, 7);
  assert.equal(dashboard.assignments.some((item) => item.id === obsolete.id), false);
  const calculationAssignment = dashboard.assignments.find((item) => item.title.includes("Составление заявки на сырьё"));
  assert.ok(calculationAssignment);
  const started = await service.startSubmission(student, calculationAssignment.id);

  const secondLogin = await service.selectStudent({
    groupId: pilot.group.id,
    studentId: directory.students[1].id
  });
  const secondStudent = await service.authenticate(secondLogin.token);
  await assert.rejects(
    () => service.saveAnswer(secondStudent, started.id, "pz1-net", { value: { cells: {} }, expectedRevision: 0 }),
    (error) => error.code === "submission_not_found"
  );
  await assert.rejects(
    () => service.getTeacherSubmission(secondStudent, started.id),
    (error) => error.code === "forbidden"
  );

  const answers = {
    "pz1-net": { cells: {
      "soup-potato:total": 2500, "soup-carrot:total": 500, "soup-onion:total": 375,
      "soup-cabbage:total": 1250, "soup-oil:total": 125, "soup-salt:total": 75,
      "puree-potato:total": 4800, "puree-milk:total": 900, "puree-butter:total": 300,
      "puree-salt:total": 60
    } },
    "pz1-gross": { cells: {
      "soup-potato:gross": 3125, "soup-carrot:gross": 625, "soup-onion:gross": 446.43,
      "soup-cabbage:gross": 1388.89, "puree-potato:gross": 6000
    } },
    "pz1-request": { cells: {
      "potato:amount": 9.125, "carrot:amount": 0.625, "onion:amount": 0.446,
      "cabbage:amount": 1.389, "oil:amount": 0.125, "salt:amount": 0.135,
      "milk:amount": 0.9, "butter:amount": 0.3
    } }
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
    idempotencyKey: "pilot-complete-calculation"
  });
  assert.equal(submitted.submission.status, "submitted");
  assert.equal(submitted.submission.auto_score, 100);
  const cached = await service.submit(student, started.id, {
    expectedRevision: draftRevision,
    idempotencyKey: "pilot-complete-calculation"
  });
  assert.equal(cached.revision.id, submitted.revision.id);

  const detail = await service.getTeacherSubmission(admin, started.id);
  assert.equal(detail.student.id, student.user.id);
  assert.equal(JSON.stringify(await service.getStudentAssignment(student, calculationAssignment.id)).includes("privateKey"), false);
  const graded = await service.gradeSubmission(admin, started.id, {
    rubricScores: [],
    comment: "Работа выполнена верно.",
    publish: true
  });
  assert.equal(graded.status, "accepted");
  assert.equal(graded.grade, "5");


  const finalDashboard = await service.studentDashboard(student);
  const completed = finalDashboard.assignments.find((item) => item.id === calculationAssignment.id);
  assert.equal(completed.status, "accepted");
  assert.equal(completed.grade, "5");

  configureLearningRuntime({ storageDir, enabled: true });
  const practiceAssignment = finalDashboard.assignments.find((item) => item.title.includes("Организация рабочего места"));
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
  // Emulate a started revision-6 pack. Only practices 1–3 need revision 7.
  await repository.mutate((state) => {
    for (const work of repeated.works.slice(0, 3)) {
      const marker = state.workBlocks.find((block) => block.version_id === work.versionId);
      const config = JSON.parse(marker.config_json || "{}");
      config.pilotContentRevision = 6;
      marker.config_json = JSON.stringify(config);
    }
  });
  const studyUpgrade = await service.seedPilot(admin);
  assert.deepEqual(studyUpgrade.works.map((work) => work.upgraded), [true, true, true, false, false, false, false]);
  assert.notEqual(studyUpgrade.works[0].assignmentId, calculationAssignment.id);
  assert.equal((await service.listTeacherAssignments(admin)).find((work) => work.id === calculationAssignment.id).status, "archived");
  const preservedReview = await service.getTeacherSubmission(admin, started.id);
  assert.equal(preservedReview.status, "accepted");
  assert.equal(preservedReview.grade, "5");
  assert.equal((await repository.getSubmission(started.id)).answers["pz1-net"].cells["soup-potato:total"], 2500);
  for (let i = 1; i < 7; i++) {
    assert.equal(studyUpgrade.works[i].assignmentId, repeated.works[i].assignmentId);
    if (i >= 3) assert.equal(studyUpgrade.works[i].versionId, repeated.works[i].versionId);
  }
  const idempotentStudyUpgrade = await service.seedPilot(admin);
  assert.ok(idempotentStudyUpgrade.works.every((work) => !work.upgraded));

  const practiceAnswers = {
    "pz4-flow": { nodes: [
      { id: "potato-sort", type: "operation", label: "Сортировка", lane: "potato", zone: "загрязнённая" },
      { id: "potato-wash", type: "operation", label: "Мойка", lane: "potato", zone: "загрязнённая", control: "Проверить качество мойки" },
      { id: "potato-peel", type: "operation", label: "Очистка", lane: "potato", zone: "переходная", control: "Проверить качество очистки" },
      { id: "potato-trim", type: "operation", label: "Дочистка", lane: "potato", zone: "переходная" },
      { id: "potato-rinse", type: "operation", label: "Промывание", lane: "potato", zone: "чистая" },
      { id: "potato-cut", type: "operation", label: "Нарезка", lane: "potato", zone: "чистая", control: "Проверить форму нарезки" },
      { id: "carrot-sort", type: "operation", label: "Сортировка", lane: "carrot", zone: "загрязнённая" },
      { id: "carrot-wash", type: "operation", label: "Мойка", lane: "carrot", zone: "загрязнённая" },
      { id: "carrot-peel", type: "operation", label: "Очистка", lane: "carrot", zone: "переходная" },
      { id: "carrot-rinse", type: "operation", label: "Промывание", lane: "carrot", zone: "чистая" },
      { id: "carrot-cut", type: "operation", label: "Нарезка", lane: "carrot", zone: "чистая" },
      { id: "mushrooms-inspect", type: "operation", label: "Осмотр", lane: "mushrooms", zone: "загрязнённая" },
      { id: "mushrooms-base", type: "operation", label: "Удаление загрязнённого основания", lane: "mushrooms", zone: "загрязнённая" },
      { id: "mushrooms-water", type: "operation", label: "Обработка водой по технологии", lane: "mushrooms", zone: "переходная" },
      { id: "mushrooms-cut", type: "operation", label: "Нарезка", lane: "mushrooms", zone: "чистая" }
    ] },
    "pz4-workplace": { cells: Object.fromEntries(
      ["sort", "wash", "peel", "trim", "cut", "pack"].flatMap((row) =>
        ["equipment", "error", "prevention"].map((column) => [`${row}:${column}`, `${row} ${column}`])
      )
    ) },
    "practice-file": { files: [{ id: readyFile.id, name: "scheme.pdf", mimeType: "application/pdf", size: pdf.length, status: "stored" }] }
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

test("production learning pack can target a pre-imported real group without storing its roster in code", async (t) => {
  const storageDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "learning-real-group-"));
  t.after(() => fs.promises.rm(storageDir, { recursive: true, force: true }));
  const repository = await new FileLearningRepository({ storageDir }).init();
  const baseOptions = { pepper: "test-pepper", passwordIterations: 10_000 };
  const setupService = new LearningService(repository, baseOptions);
  await setupService.bootstrapAdmin({
    bootstrapSecret: "bootstrap-test",
    login: "teacher-real-group",
    password: "RealGroup2026",
    displayName: "Преподаватель"
  }, "bootstrap-test");
  const login = await setupService.login({ login: "teacher-real-group", password: "RealGroup2026" });
  const admin = await setupService.authenticate(login.token);
  const legacyPilot = await setupService.rosterCommit(admin, {
    groupCode: "ПИЛОТ-1-ПК-24Б",
    groupName: "1-ПК-24Б – пилотная группа",
    students: [{ login: "pilot-pk24b-001", displayName: "Тестовый Студент" }]
  });
  const roster = await setupService.rosterCommit(admin, {
    groupCode: "1-ПК-24Б",
    groupName: "1-ПК-24Б",
    students: [{ login: "pk24b-001", displayName: "Учебный Студент" }]
  });

  const service = new LearningService(repository, { ...baseOptions, pilotGroupCode: "1-ПК-24Б" });
  const result = await service.seedPilot(admin);
  assert.equal(result.group.id, roster.group.id);
  assert.equal(result.group.code, "1-ПК-24Б");
  assert.equal(result.credentials.length, 0);
  assert.equal(result.works.length, 7);
  assert.equal((await service.studentAccessStudents(roster.group.id)).students.length, 1);
  assert.deepEqual((await service.studentAccessGroups()).groups.map((group) => group.code), ["1-ПК-24Б"]);
  await assert.rejects(
    () => service.studentAccessStudents(legacyPilot.group.id),
    (error) => error.code === "group_not_found"
  );
});
