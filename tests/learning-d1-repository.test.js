"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const { D1LearningRepository } = require("../src/learning/repositories/d1");
const { LearningService } = require("../src/learning/service");
const { hashPassword } = require("../src/learning/auth");

const root = path.resolve(__dirname, "..");
const migrations = [
  "0001_cloudflare_initial.sql",
  "0002_cloudflare_voice_d1_fallback.sql",
  "0003_learning_identity_catalog.sql",
  "0004_learning_works.sql",
  "0005_learning_submissions.sql"
];

class SqliteD1Statement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values) {
    return new SqliteD1Statement(this.database, this.sql, values);
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.values) || null;
  }

  async all() {
    return { results: this.database.prepare(this.sql).all(...this.values) };
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { meta: { changes: Number(result.changes || 0), last_row_id: Number(result.lastInsertRowid || 0) } };
  }
}

class SqliteD1Database {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new SqliteD1Statement(this.database, sql);
  }

  async batch(statements) {
    this.database.exec("BEGIN IMMEDIATE;");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec("COMMIT;");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
  }
}

function createDatabase(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "learning-d1-"));
  const database = new DatabaseSync(path.join(directory, "learning.sqlite"));
  database.exec("PRAGMA foreign_keys=ON;");
  migrations.forEach((name) => database.exec(fs.readFileSync(path.join(root, "migrations", name), "utf8")));
  t.after(() => {
    database.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return database;
}

test("D1 repository runs the complete pilot lifecycle transactionally", async (t) => {
  const database = createDatabase(t);
  const repository = await new D1LearningRepository(new SqliteD1Database(database)).init();
  const service = new LearningService(repository, { pepper: "d1-test", passwordIterations: 10_000 });

  await service.bootstrapAdmin({
    bootstrapSecret: "d1-bootstrap",
    login: "d1-teacher",
    password: "TeacherD12026",
    displayName: "Преподаватель D1"
  }, "d1-bootstrap");
  const teacherLogin = await service.login({ login: "d1-teacher", password: "TeacherD12026" });
  const teacher = await service.authenticate(teacherLogin.token);
  const pilot = await service.seedPilot(teacher);
  assert.equal(pilot.works.length, 6);
  assert.equal((await repository.listAuditEvents()).length > 10, true);

  const sharedBlockDraft = {
    courseId: pilot.courses[0].id,
    kind: "practice",
    title: "Проверка уникальности блока",
    topic: "Проверка идентификаторов",
    blocks: [{
      id: "shared-content-key",
      type: "short_text",
      title: "Ответ",
      prompt: "Введите ответ.",
      required: true,
      maxScore: 1
    }],
    rubric: []
  };
  const firstSharedTemplate = await service.createTemplate(teacher, sharedBlockDraft);
  const secondSharedTemplate = await service.createTemplate(teacher, {
    ...sharedBlockDraft,
    title: "Повторная проверка уникальности блока"
  });
  assert.notEqual(firstSharedTemplate.draft.blocks[0].id, secondSharedTemplate.draft.blocks[0].id);
  assert.equal(firstSharedTemplate.draft.blocks[0].config.contentKey, "shared-content-key");
  assert.equal(secondSharedTemplate.draft.blocks[0].config.contentKey, "shared-content-key");

  const originalWork = pilot.works[0];
  const templateDetail = await service.getTemplate(teacher, originalWork.templateId);
  const savedDraft = await service.saveTemplate(teacher, originalWork.templateId, {
    ...templateDetail.draft,
    title: `${templateDetail.draft.title} – версия 2`,
    expectedRevision: templateDetail.draft_revision
  });
  assert.equal(savedDraft.draft_revision, 1);
  const secondVersion = await service.publishTemplate(teacher, originalWork.templateId);
  assert.notEqual(secondVersion.id, originalWork.versionId);
  assert.equal(secondVersion.version_no, 2);
  const originalAssignment = (await service.listTeacherAssignments(teacher))
    .find((item) => item.id === originalWork.assignmentId);
  assert.equal(originalAssignment.version.id, originalWork.versionId);

  const studentCredentials = pilot.credentials[1];
  const temporaryLogin = await service.login({
    login: studentCredentials.login,
    password: studentCredentials.temporaryPassword
  });
  let student = await service.authenticate(temporaryLogin.token);
  await service.changePassword(student, {
    currentPassword: studentCredentials.temporaryPassword,
    newPassword: "StudentD12026",
    confirmPassword: "StudentD12026"
  });
  const studentLogin = await service.login({ login: studentCredentials.login, password: "StudentD12026" });
  student = await service.authenticate(studentLogin.token);

  const dashboard = await service.studentDashboard(student);
  const testAssignment = dashboard.assignments.find((item) => item.title.includes("Составление заявки на сырьё"));
  assert.ok(testAssignment);
  const testDefinition = await service.getStudentAssignment(student, testAssignment.id);
  const blockId = (contentKey) => testDefinition.work.blocks.find((block) => block.contentKey === contentKey)?.id;
  assert.ok(blockId("pz1-net"));
  assert.ok(blockId("pz1-gross"));
  assert.ok(blockId("pz1-request"));
  const submission = await service.startSubmission(student, testAssignment.id);
  const answers = [
    [blockId("pz1-net"), { cells: {
      "soup-potato:total": 2500, "soup-carrot:total": 500, "soup-onion:total": 375,
      "soup-cabbage:total": 1250, "soup-oil:total": 125, "soup-salt:total": 75,
      "puree-potato:total": 4800, "puree-milk:total": 900, "puree-butter:total": 300, "puree-salt:total": 60
    } }],
    [blockId("pz1-gross"), { cells: {
      "soup-potato:gross": 3125, "soup-carrot:gross": 625, "soup-onion:gross": 446.43,
      "soup-cabbage:gross": 1388.89, "puree-potato:gross": 6000
    } }],
    [blockId("pz1-request"), { cells: {
      "potato:amount": 9.125, "carrot:amount": 0.625, "onion:amount": 0.446,
      "cabbage:amount": 1.389, "oil:amount": 0.125, "salt:amount": 0.135,
      "milk:amount": 0.9, "butter:amount": 0.3
    } }]
  ];
  const firstSaved = await service.saveAnswer(student, submission.id, answers[0][0], {
    value: answers[0][1],
    expectedRevision: 0
  });
  assert.equal(firstSaved.draftRevision, 1);
  await assert.rejects(
    () => service.saveAnswer(student, submission.id, answers[0][0], {
      value: { cells: { "soup-potato:total": 1 } },
      expectedRevision: 0
    }),
    (error) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "revision_conflict");
      assert.deepEqual(error.details, { currentRevision: 1 });
      return true;
    }
  );
  assert.deepEqual((await repository.getSubmission(submission.id)).answers[answers[0][0]], answers[0][1]);

  let expectedRevision = firstSaved.draftRevision;
  for (const [blockId, value] of answers.slice(1)) {
    const saved = await service.saveAnswer(student, submission.id, blockId, { value, expectedRevision });
    expectedRevision = saved.draftRevision;
  }
  const submitted = await service.submit(student, submission.id, {
    expectedRevision,
    idempotencyKey: "d1-pilot-submit"
  });
  assert.equal(submitted.submission.auto_score, 100);
  assert.equal((await service.submit(student, submission.id, {
    expectedRevision,
    idempotencyKey: "d1-pilot-submit"
  })).revision.id, submitted.revision.id);

  const draftReview = await service.gradeSubmission(teacher, submission.id, {
    rubricScores: [], comment: "Черновая проверка.", publish: false
  });
  assert.equal(draftReview.status, "under_review");
  const returned = await service.returnSubmission(teacher, submission.id, {
    comment: "Исправьте после черновой проверки."
  });
  assert.equal(returned.status, "returned");
  const returnedDetail = await service.getTeacherSubmission(teacher, submission.id);
  assert.equal(returnedDetail.reviews.length, 1);
  assert.equal(returnedDetail.reviews[0].status, "returned");

  const resubmitted = await service.submit(student, submission.id, {
    expectedRevision,
    idempotencyKey: "d1-pilot-resubmit"
  });
  assert.equal(resubmitted.submission.current_revision_no, 2);

  const graded = await service.gradeSubmission(teacher, submission.id, {
    rubricScores: [], comment: "Принято.", publish: true
  });
  assert.equal(graded.status, "accepted");
  assert.equal(graded.grade, "5");
  assert.equal((await service.journal(teacher)).some((item) => item.studentId === student.user.id && item.grade === "5"), true);

  const groupRoster = await service.listGroupStudents(teacher, pilot.group.id);
  assert.equal(groupRoster.students.some((item) => item.id === student.user.id), true);
  const reset = await service.resetStudentPassword(teacher, pilot.group.id, student.user.id);
  assert.equal(reset.mustChangePassword, true);
  assert.equal(reset.sessionsRevoked, 1);
  assert.equal(await service.authenticate(studentLogin.token), null);
  assert.equal((await service.login({
    login: studentCredentials.login,
    password: reset.temporaryPassword
  })).user.mustChangePassword, false);
  const resetAudit = (await repository.listAuditEvents())
    .find((item) => item.action === "student.password_reset");
  assert.equal(resetAudit.entity_id, student.user.id);
  assert.equal(JSON.stringify(resetAudit).includes(reset.temporaryPassword), false);
});

test("D1 keeps ordinary teachers inside assigned courses and groups", async (t) => {
  const database = createDatabase(t);
  const repository = await new D1LearningRepository(new SqliteD1Database(database)).init();
  const service = new LearningService(repository, { pepper: "d1-scope-test", passwordIterations: 10_000 });

  await service.bootstrapAdmin({
    bootstrapSecret: "d1-scope-bootstrap",
    login: "d1-scope-admin",
    password: "D1ScopeAdmin2026",
    displayName: "Администратор проверки"
  }, "d1-scope-bootstrap");
  const adminLogin = await service.login({ login: "d1-scope-admin", password: "D1ScopeAdmin2026" });
  const admin = await service.authenticate(adminLogin.token);
  const pilot = await service.seedPilot(admin);
  const foreignGroup = await service.createGroup(admin, { code: "D1-FOREIGN", name: "Чужая группа D1" });
  await service.rosterCommit(admin, {
    groupCode: foreignGroup.code,
    groupName: foreignGroup.name,
    students: [{ displayName: "Чужой студент D1", login: "d1-foreign-student" }]
  });
  const foreignStudent = (await service.listGroupStudents(admin, foreignGroup.id)).students[0];

  const now = new Date().toISOString();
  const password = await hashPassword("D1ScopedTeacher2026", {
    pepper: "d1-scope-test",
    iterations: 10_000
  });
  const ordinaryTeacher = {
    id: "usr_d1_scoped_teacher",
    login: "d1-scoped-teacher",
    display_name: "Обычный преподаватель D1",
    status: "active",
    created_at: now,
    updated_at: now
  };
  await repository.createUserAccount({
    user: ordinaryTeacher,
    credential: {
      user_id: ordinaryTeacher.id,
      password_hash: password.hash,
      password_salt: password.salt,
      password_iterations: password.iterations,
      must_change_password: 0,
      updated_at: now
    },
    roles: ["teacher"]
  });
  const assignedCourse = {
    id: "course_d1_scoped",
    subject_id: pilot.subjects[0].id,
    academic_year: "2026/2027",
    name: "Назначенный курс D1",
    status: "active",
    config_json: "{}",
    created_at: now,
    updated_at: now
  };
  await repository.createCourse(assignedCourse, [pilot.group.id], [ordinaryTeacher.id], admin.user.id);

  const login = await service.login({ login: ordinaryTeacher.login, password: "D1ScopedTeacher2026" });
  const teacher = await service.authenticate(login.token);
  const catalog = await service.catalog(teacher);
  assert.deepEqual(catalog.groups.map((item) => item.id), [pilot.group.id]);
  assert.equal(catalog.groups.some((item) => item.id === foreignGroup.id), false);
  assert.deepEqual(catalog.courses.map((item) => item.id), [assignedCourse.id]);

  await assert.rejects(
    () => service.createCourse(teacher, {
      subjectId: pilot.subjects[0].id,
      groupIds: [foreignGroup.id],
      name: "Запрещённый курс D1"
    }),
    (error) => error.code === "group_not_found" && error.statusCode === 404
  );
  await assert.rejects(
    () => repository.createCourse({
      ...assignedCourse,
      id: "course_d1_direct_escalation",
      name: "Прямая эскалация D1"
    }, [foreignGroup.id], [ordinaryTeacher.id], ordinaryTeacher.id),
    (error) => error.code === "group_not_found" && error.statusCode === 404
  );
  assert.equal(await repository.teacherHasGroupAccess(ordinaryTeacher.id, foreignGroup.id), false);

  const foreignAuth = await repository.getUserAuthById(foreignStudent.id);
  const directReset = await repository.resetStudentCredential({
    studentId: foreignStudent.id,
    groupId: foreignGroup.id,
    actorId: ordinaryTeacher.id,
    login: foreignStudent.login,
    resetAt: new Date().toISOString(),
    credential: { ...foreignAuth.credential, updated_at: new Date().toISOString() }
  });
  assert.equal(directReset, null);
  assert.equal(
    (await repository.getUserAuthById(foreignStudent.id)).credential.password_hash,
    foreignAuth.credential.password_hash
  );
});
