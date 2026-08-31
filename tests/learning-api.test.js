"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");
const { URL } = require("node:url");

const { handleLearningApi } = require("../src/learning/api");
const { getLearningRepository } = require("../src/learning/repository");
const { hashPassword } = require("../src/learning/auth");

class CaptureResponse {
  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  }

  end(body = "") {
    this.body = Buffer.isBuffer(body) ? body.toString("utf8") : String(body || "");
  }
}

async function request(runtime, method, route, body, headers = {}) {
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
  const req = Readable.from(payload ? [payload] : []);
  req.method = method;
  req.url = route;
  req.headers = {
    host: "college.local",
    origin: "http://college.local",
    ...(payload ? { "content-type": "application/json", "content-length": String(payload.length) } : {}),
    ...headers
  };
  req.socket = { remoteAddress: "127.0.0.1" };
  const res = new CaptureResponse();
  await handleLearningApi(req, res, new URL(route, "http://college.local"), runtime);
  return {
    status: res.statusCode,
    headers: res.headers,
    json: res.body ? JSON.parse(res.body) : null
  };
}

test("learning HTTP API enforces bootstrap, cookie authentication and CSRF", async (t) => {
  const storageDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "learning-api-"));
  t.after(() => fs.promises.rm(storageDir, { recursive: true, force: true }));
  const runtime = {
    enabled: true,
    storageDir,
    authSecret: "api-pepper",
    bootstrapSecret: "api-bootstrap"
  };

  const status = await request(runtime, "GET", "/api/learning/status");
  assert.equal(status.status, 200);
  assert.equal(status.json.data.requiresBootstrap, true);

  const setup = await request(runtime, "POST", "/api/learning/setup", {
    bootstrapSecret: "api-bootstrap",
    login: "api-teacher",
    password: "ApiTeacher2026",
    displayName: "Преподаватель API"
  });
  assert.equal(setup.status, 201);

  const login = await request(runtime, "POST", "/api/learning/auth/login", {
    login: "api-teacher",
    password: "ApiTeacher2026"
  });
  assert.equal(login.status, 200);
  assert.match(login.headers["set-cookie"], /HttpOnly/);
  const cookie = login.headers["set-cookie"].split(";")[0];
  const csrf = login.json.data.csrfToken;

  const me = await request(runtime, "GET", "/api/learning/auth/me", undefined, { cookie });
  assert.equal(me.status, 200);
  assert.equal(me.json.data.authenticated, true);
  assert.deepEqual(me.json.data.user.roles, ["admin", "teacher"]);

  const rejected = await request(runtime, "POST", "/api/learning/teacher/groups", {
    code: "TEST-01", name: "Тестовая группа"
  }, { cookie });
  assert.equal(rejected.status, 403);
  assert.equal(rejected.json.error.code, "csrf_rejected");

  const created = await request(runtime, "POST", "/api/learning/teacher/groups", {
    code: "TEST-01", name: "Тестовая группа"
  }, { cookie, "x-csrf-token": csrf });
  assert.equal(created.status, 201);
  assert.equal(created.json.data.code, "TEST-01");

  const foreignOrigin = await request(runtime, "POST", "/api/learning/teacher/subjects", {
    code: "SUBJ-01", name: "Предмет"
  }, { cookie, "x-csrf-token": csrf, origin: "https://attacker.example" });
  assert.equal(foreignOrigin.status, 403);
  assert.equal(foreignOrigin.json.error.code, "origin_rejected");
});

test("teacher can list and reset only students in assigned groups", async (t) => {
  const storageDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "learning-password-reset-"));
  t.after(() => fs.promises.rm(storageDir, { recursive: true, force: true }));
  const runtime = {
    enabled: true,
    storageDir,
    authSecret: "reset-api-pepper",
    bootstrapSecret: "reset-api-bootstrap"
  };

  const setup = await request(runtime, "POST", "/api/learning/setup", {
    bootstrapSecret: runtime.bootstrapSecret,
    login: "reset-admin",
    password: "ResetAdmin2026",
    displayName: "Администратор"
  });
  assert.equal(setup.status, 201);
  const adminLogin = await request(runtime, "POST", "/api/learning/auth/login", {
    login: "reset-admin", password: "ResetAdmin2026"
  });
  const adminCookie = adminLogin.headers["set-cookie"].split(";")[0];
  const adminCsrf = adminLogin.json.data.csrfToken;
  const adminHeaders = { cookie: adminCookie, "x-csrf-token": adminCsrf };

  const groupA = await request(runtime, "POST", "/api/learning/teacher/groups", {
    code: "ACCESS-A", name: "Доступная группа"
  }, adminHeaders);
  const groupB = await request(runtime, "POST", "/api/learning/teacher/groups", {
    code: "ACCESS-B", name: "Чужая группа"
  }, adminHeaders);
  const rosterA = await request(runtime, "POST", "/api/learning/teacher/rosters/import/commit", {
    groupCode: "ACCESS-A",
    groupName: "Доступная группа",
    students: [{ displayName: "Студент А", login: "student-access-a" }]
  }, adminHeaders);
  const rosterB = await request(runtime, "POST", "/api/learning/teacher/rosters/import/commit", {
    groupCode: "ACCESS-B",
    groupName: "Чужая группа",
    students: [{ displayName: "Студент Б", login: "student-access-b" }]
  }, adminHeaders);
  const subject = await request(runtime, "POST", "/api/learning/teacher/subjects", {
    code: "ACCESS-SUBJECT", name: "Предмет для проверки доступа"
  }, adminHeaders);
  assert.equal(rosterA.status, 201);
  assert.equal(rosterB.status, 201);

  const repository = await getLearningRepository();
  const createdAt = new Date().toISOString();
  const teacherPassword = await hashPassword("AssignedTeacher2026", {
    pepper: runtime.authSecret,
    iterations: 10_000
  });
  const teacher = {
    id: "usr_assigned_teacher",
    login: "assigned-teacher",
    display_name: "Назначенный преподаватель",
    status: "active",
    created_at: createdAt,
    updated_at: createdAt
  };
  await repository.createUserAccount({
    user: teacher,
    credential: {
      user_id: teacher.id,
      password_hash: teacherPassword.hash,
      password_salt: teacherPassword.salt,
      password_iterations: teacherPassword.iterations,
      must_change_password: 0,
      updated_at: createdAt
    },
    roles: ["teacher"]
  });
  const assignedCourse = {
    id: "course_assigned_group",
    subject_id: subject.json.data.id,
    academic_year: "2026/2027",
    name: "Курс назначенного преподавателя",
    status: "active",
    config_json: "{}",
    created_at: createdAt,
    updated_at: createdAt
  };
  await repository.createCourse(
    assignedCourse,
    [groupA.json.data.id],
    [teacher.id],
    setup.json.data.user.id
  );

  const teacherLogin = await request(runtime, "POST", "/api/learning/auth/login", {
    login: teacher.login, password: "AssignedTeacher2026"
  });
  const teacherCookie = teacherLogin.headers["set-cookie"].split(";")[0];
  const teacherCsrf = teacherLogin.json.data.csrfToken;
  const teacherHeaders = { cookie: teacherCookie, "x-csrf-token": teacherCsrf };

  const teacherCatalog = await request(
    runtime, "GET", "/api/learning/teacher/catalog", undefined, { cookie: teacherCookie }
  );
  assert.deepEqual(teacherCatalog.json.data.groups.map((item) => item.id), [groupA.json.data.id]);
  assert.equal(teacherCatalog.json.data.groups.some((item) => item.id === groupB.json.data.id), false);
  assert.deepEqual(teacherCatalog.json.data.courses.map((item) => item.id), [assignedCourse.id]);

  const escalatedCourse = await request(runtime, "POST", "/api/learning/teacher/courses", {
    subjectId: subject.json.data.id,
    groupIds: [groupB.json.data.id],
    name: "Попытка назначить чужую группу"
  }, teacherHeaders);
  assert.equal(escalatedCourse.status, 404);
  assert.equal(escalatedCourse.json.error.code, "group_not_found");
  assert.equal(await repository.teacherHasGroupAccess(teacher.id, groupB.json.data.id), false);

  await assert.rejects(
    () => repository.createCourse({
      ...assignedCourse,
      id: "course_direct_escalation",
      name: "Прямая попытка повышения прав"
    }, [groupB.json.data.id], [teacher.id], teacher.id),
    (error) => error.code === "group_not_found" && error.statusCode === 404
  );

  const teacherCreatedGroup = await request(runtime, "POST", "/api/learning/teacher/groups", {
    code: "TEACHER-ESCALATION", name: "Самоназначенная группа"
  }, teacherHeaders);
  assert.equal(teacherCreatedGroup.status, 403);
  assert.equal(teacherCreatedGroup.json.error.code, "forbidden");

  const foreignRoster = await request(runtime, "POST", "/api/learning/teacher/rosters/import/commit", {
    groupCode: "ACCESS-B",
    groupName: "Чужая группа",
    students: [{ displayName: "Лишний студент", login: "foreign-roster-injection" }]
  }, teacherHeaders);
  assert.equal(foreignRoster.status, 404);
  assert.equal(foreignRoster.json.error.code, "group_not_found");

  const secondAccessibleCourse = await request(runtime, "POST", "/api/learning/teacher/courses", {
    subjectId: subject.json.data.id,
    groupIds: [groupA.json.data.id],
    name: "Второй доступный курс"
  }, teacherHeaders);
  assert.equal(secondAccessibleCourse.status, 201);

  const template = await request(runtime, "POST", "/api/learning/teacher/templates", {
    courseId: assignedCourse.id,
    defaultGroupId: groupA.json.data.id,
    kind: "test",
    title: "Проверка границ назначения",
    topic: "Проверка полномочий",
    blocks: [{
      id: "scope-question",
      type: "single_choice",
      title: "Контрольный вопрос",
      prompt: "Выберите верный вариант.",
      maxScore: 10,
      options: [{ id: "ok", label: "Верно" }, { id: "wrong", label: "Неверно" }],
      privateKey: { optionId: "ok" }
    }],
    rubric: []
  }, teacherHeaders);
  assert.equal(template.status, 201);
  const templateDetail = await request(
    runtime, "GET", `/api/learning/teacher/templates/${template.json.data.id}`, undefined,
    { cookie: teacherCookie }
  );
  const movedTemplate = await request(
    runtime,
    "PUT",
    `/api/learning/teacher/templates/${template.json.data.id}/draft`,
    {
      ...templateDetail.json.data.draft,
      courseId: secondAccessibleCourse.json.data.id,
      expectedRevision: templateDetail.json.data.draft_revision
    },
    teacherHeaders
  );
  assert.equal(movedTemplate.status, 409);
  assert.equal(movedTemplate.json.error.code, "template_course_immutable");
  const published = await request(
    runtime, "POST", `/api/learning/teacher/templates/${template.json.data.id}/publish`, {}, teacherHeaders
  );
  assert.equal(published.status, 200);

  const foreignGroupAssignment = await request(runtime, "POST", "/api/learning/teacher/assignments", {
    versionId: published.json.data.id,
    courseId: assignedCourse.id,
    groupIds: [groupB.json.data.id],
    dueAt: "2026-09-10T12:00:00.000Z"
  }, teacherHeaders);
  assert.equal(foreignGroupAssignment.status, 404);
  assert.equal(foreignGroupAssignment.json.error.code, "group_not_found");

  const mismatchedCourseAssignment = await request(runtime, "POST", "/api/learning/teacher/assignments", {
    versionId: published.json.data.id,
    courseId: secondAccessibleCourse.json.data.id,
    groupIds: [groupA.json.data.id],
    dueAt: "2026-09-10T12:00:00.000Z"
  }, teacherHeaders);
  assert.equal(mismatchedCourseAssignment.status, 409);
  assert.equal(mismatchedCourseAssignment.json.error.code, "assignment_course_mismatch");

  const availableStudents = await request(
    runtime, "GET", `/api/learning/teacher/groups/${groupA.json.data.id}/students`, undefined,
    { cookie: teacherCookie }
  );
  assert.equal(availableStudents.status, 200);
  assert.equal(availableStudents.json.data.students.length, 1);
  assert.equal(availableStudents.json.data.students[0].login, "student-access-a");
  assert.equal(JSON.stringify(availableStudents.json).includes("temporaryPassword"), false);

  const foreignGroup = await request(
    runtime, "GET", `/api/learning/teacher/groups/${groupB.json.data.id}/students`, undefined,
    { cookie: teacherCookie }
  );
  assert.equal(foreignGroup.status, 404);
  assert.equal(foreignGroup.json.error.code, "group_not_found");

  const studentA = availableStudents.json.data.students[0];
  const adminForeignList = await request(
    runtime, "GET", `/api/learning/teacher/groups/${groupB.json.data.id}/students`, undefined,
    { cookie: adminCookie }
  );
  const studentB = adminForeignList.json.data.students[0];
  const foreignDirectStudent = await request(runtime, "POST", "/api/learning/teacher/assignments", {
    versionId: published.json.data.id,
    courseId: assignedCourse.id,
    studentIds: [studentB.id],
    dueAt: "2026-09-10T12:00:00.000Z"
  }, teacherHeaders);
  assert.equal(foreignDirectStudent.status, 404);
  assert.equal(foreignDirectStudent.json.error.code, "student_not_found");

  const foreignCredentialBefore = await repository.getUserAuthById(studentB.id);
  const directForeignReset = await repository.resetStudentCredential({
    studentId: studentB.id,
    groupId: groupB.json.data.id,
    actorId: teacher.id,
    login: studentB.login,
    resetAt: new Date().toISOString(),
    credential: { ...foreignCredentialBefore.credential, updated_at: new Date().toISOString() }
  });
  assert.equal(directForeignReset, null);
  assert.equal(
    (await repository.getUserAuthById(studentB.id)).credential.password_hash,
    foreignCredentialBefore.credential.password_hash
  );
  const foreignReset = await request(
    runtime,
    "POST",
    `/api/learning/teacher/groups/${groupB.json.data.id}/students/${studentB.id}/reset-password`,
    {},
    teacherHeaders
  );
  assert.equal(foreignReset.status, 404);
  assert.equal(foreignReset.json.error.code, "group_not_found");
  const mismatchedStudent = await request(
    runtime,
    "POST",
    `/api/learning/teacher/groups/${groupA.json.data.id}/students/${studentB.id}/reset-password`,
    {},
    teacherHeaders
  );
  assert.equal(mismatchedStudent.status, 404);
  assert.equal(mismatchedStudent.json.error.code, "student_not_found");

  const originalPassword = rosterA.json.data.credentials[0].temporaryPassword;
  const studentLogin = await request(runtime, "POST", "/api/learning/auth/login", {
    login: studentA.login, password: originalPassword
  });
  const studentCookie = studentLogin.headers["set-cookie"].split(";")[0];
  const studentDenied = await request(
    runtime, "GET", `/api/learning/teacher/groups/${groupA.json.data.id}/students`, undefined,
    { cookie: studentCookie }
  );
  assert.equal(studentDenied.status, 403);
  assert.equal(studentDenied.json.error.code, "forbidden");

  const reset = await request(
    runtime,
    "POST",
    `/api/learning/teacher/groups/${groupA.json.data.id}/students/${studentA.id}/reset-password`,
    {},
    teacherHeaders
  );
  assert.equal(reset.status, 200);
  assert.equal(reset.json.data.student.login, studentA.login);
  assert.equal(reset.json.data.mustChangePassword, true);
  assert.equal(reset.json.data.sessionsRevoked, 1);
  assert.match(reset.json.data.temporaryPassword, /^[A-Za-z2-9-]{10,}$/);

  const missingCsrf = await request(
    runtime,
    "POST",
    `/api/learning/teacher/groups/${groupA.json.data.id}/students/${studentA.id}/reset-password`,
    {},
    { cookie: teacherCookie }
  );
  assert.equal(missingCsrf.status, 403);
  assert.equal(missingCsrf.json.error.code, "csrf_rejected");

  const revokedSession = await request(runtime, "GET", "/api/learning/auth/me", undefined, {
    cookie: studentCookie
  });
  assert.equal(revokedSession.json.data.authenticated, false);
  assert.equal((await request(runtime, "POST", "/api/learning/auth/login", {
    login: studentA.login, password: originalPassword
  })).status, 401);
  const temporaryLogin = await request(runtime, "POST", "/api/learning/auth/login", {
    login: studentA.login, password: reset.json.data.temporaryPassword
  });
  assert.equal(temporaryLogin.status, 200);
  assert.equal(temporaryLogin.json.data.user.mustChangePassword, true);

  const adminReset = await request(
    runtime,
    "POST",
    `/api/learning/teacher/groups/${groupB.json.data.id}/students/${studentB.id}/reset-password`,
    {},
    adminHeaders
  );
  assert.equal(adminReset.status, 200);
  assert.equal(adminReset.json.data.student.id, studentB.id);
  assert.equal(adminReset.json.data.mustChangePassword, true);

  const audit = (await repository.listAuditEvents()).find((item) =>
    item.action === "student.password_reset" && item.entity_id === studentA.id
  );
  assert.ok(audit);
  assert.equal(audit.entity_id, studentA.id);
  assert.equal(audit.actor_id, teacher.id);
  assert.equal(JSON.stringify(audit).includes(reset.json.data.temporaryPassword), false);
});
