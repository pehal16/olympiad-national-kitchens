"use strict";

const crypto = require("crypto");
const {
  hashPassword,
  verifyPassword,
  randomToken,
  hashToken,
  temporaryPassword,
  validateLogin,
  validatePassword,
  normalizeLogin
} = require("./auth");
const { LearningError, assertLearning } = require("./errors");
const { validateAnswer, normalizeAnswer } = require("./validation");
const { validateWorkDraft, publishWorkVersion, publishAssignment } = require("./domain");
const { gradeSubmission, resolveGradingMode } = require("./grading");
const { sanitizeWorkForStudent } = require("./serializers");
const {
  LearningFileStore,
  validateFileDeclaration,
  hasExpectedSignature,
  objectKey,
  sha256
} = require("./files");
const { PILOT_GROUP, PILOT_SUBJECTS, PILOT_CONTENT_REVISION, pilotWorks } = require("./pilot");

const SESSION_HOURS = Number(process.env.LEARNING_SESSION_HOURS || 12);
const LOGIN_FAILURE_LIMIT = Number(process.env.LEARNING_LOGIN_FAILURE_LIMIT || 5);
const LOGIN_LOCK_MINUTES = Number(process.env.LEARNING_LOGIN_LOCK_MINUTES || 15);
const PILOT_LEGACY_TITLES = new Map([
  ["Практическая работа № 2. Ассортимент и правила использования традиционных пряностей и приправ", [
    "Практическая работа № 2. Пряности и приправы"
  ]],
  ["Практическая работа № 3. Порядок пользования сборником рецептур", [
    "Практическая работа № 3. Работа со сборником рецептур"
  ]],
  ["Практическая работа № 4. Организация рабочего места повара по обработке, нарезке овощей и грибов", [
    "Практическая работа № 4. Технологическая схема рабочего места"
  ]],
  ["Практическая работа № 5. Правила использования оборудования для обработки, нарезки овощей и грибов", [
    "Промежуточный тест № 1. Оборудование для обработки овощей и грибов",
    "Промежуточный тест к практической работе № 5. Оборудование для овощей и грибов"
  ]]
]);
const PILOT_DEPRECATED_TITLES = new Set([
  "Промежуточный тест. Оборудование и безопасная работа",
  "Практическая работа. Технологическая схема холодного блюда",
  "Практическая работа. Сборка и санитарная оценка блюда",
  "Лабораторная работа. Оценка качества овощного полуфабриката",
  "Самостоятельная работа. Проект технологической карты"
]);

function newId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso() {
  return new Date().toISOString();
}

function addHours(iso, hours) {
  return new Date(Date.parse(iso) + hours * 60 * 60 * 1000).toISOString();
}

function normalizeCode(value, fallback = "") {
  return String(value || fallback)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-ZА-ЯЁ0-9._-]/gu, "")
    .slice(0, 64);
}

function parseJson(value, fallback = {}) {
  if (value && typeof value === "object") return JSON.parse(JSON.stringify(value));
  try {
    return value ? JSON.parse(value) : JSON.parse(JSON.stringify(fallback));
  } catch (error) {
    return JSON.parse(JSON.stringify(fallback));
  }
}

function pilotRevisionOf(version) {
  for (const block of version?.blocks || []) {
    const config = block.config || parseJson(block.config_json, {});
    const revision = Number(config.pilotContentRevision || 0);
    if (revision > 0) return revision;
  }
  return 0;
}

function scoreCapacities(work) {
  let automaticMaxScore = 0;
  let manualMaxScore = 0;
  for (const block of work?.blocks || []) {
    const maxScore = Math.max(0, Number(block.maxScore ?? block.max_score ?? 0) || 0);
    const mode = resolveGradingMode(block);
    if (mode === "automatic") automaticMaxScore += maxScore;
    if (mode === "manual") manualMaxScore += maxScore;
  }
  const rubricMaxScore = (work?.rubric || []).reduce(
    (sum, criterion) => sum + Math.max(0, Number(criterion.maxScore ?? criterion.max_score ?? 0) || 0),
    0
  );
  return { automaticMaxScore, manualMaxScore, rubricMaxScore };
}

function publicUser(context) {
  const roles = [...context.roles];
  const user = {
    id: context.user.id,
    displayName: context.user.display_name,
    roles,
    mustChangePassword: !roles.includes("student") && Boolean(context.credential?.must_change_password),
    groups: (context.groups || []).map((group) => ({ id: group.id, code: group.code, name: group.name }))
  };
  if (!roles.includes("student")) user.login = context.user.login;
  return user;
}

function hasRole(context, roles) {
  const allowed = new Set(Array.isArray(roles) ? roles : [roles]);
  return (context.roles || []).some((role) => allowed.has(role));
}

class LearningService {
  constructor(repository, options = {}) {
    this.repository = repository;
    this.attachmentFileStore = options.fileStore || null;
    this.pepper = String(options.pepper || process.env.LEARNING_PASSWORD_PEPPER || "");
    this.passwordIterations = Number(options.passwordIterations || process.env.LEARNING_PASSWORD_ITERATIONS || 210_000);
    this.pilotGroupCode = String(options.pilotGroupCode || process.env.LEARNING_PILOT_GROUP_CODE || PILOT_GROUP.code).trim();
  }

  async status() {
    const userCount = await this.repository.countUsers();
    return {
      enabled: true,
      configured: userCount > 0,
      requiresBootstrap: userCount === 0,
      module: "learning",
      version: 1
    };
  }

  async bootstrapAdmin(payload, expectedSecret) {
    assertLearning((await this.repository.countUsers()) === 0, "Первичная настройка уже выполнена.", 409, "already_configured");
    assertLearning(expectedSecret, "На сервере не задан секрет первичной настройки.", 503, "bootstrap_secret_missing");
    const provided = String(payload.bootstrapSecret || "");
    const expected = String(expectedSecret);
    const sameLength = Buffer.byteLength(provided) === Buffer.byteLength(expected);
    const matched = sameLength && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    assertLearning(matched, "Неверный секрет первичной настройки.", 403, "bootstrap_rejected");

    const login = validateLogin(payload.login || "teacher");
    const password = validatePassword(payload.password);
    const displayName = String(payload.displayName || "Преподаватель").trim().slice(0, 160);
    assertLearning(displayName, "Укажите имя преподавателя.", 400, "display_name_required");
    const createdAt = nowIso();
    const user = {
      id: newId("usr"),
      login,
      display_name: displayName,
      status: "active",
      created_at: createdAt,
      updated_at: createdAt
    };
    const passwordData = await hashPassword(password, {
      pepper: this.pepper,
      iterations: this.passwordIterations
    });
    const credential = {
      user_id: user.id,
      password_hash: passwordData.hash,
      password_salt: passwordData.salt,
      password_iterations: passwordData.iterations,
      must_change_password: 0,
      updated_at: createdAt
    };
    await this.repository.createUserAccount({ user, credential, roles: ["admin", "teacher"] });
    return { user: { id: user.id, login: user.login, displayName: user.display_name } };
  }

  async login(payload) {
    const login = normalizeLogin(payload.login);
    const now = nowIso();
    const limit = await this.repository.getLoginLimit(login);
    if (limit?.locked_until && Date.parse(limit.locked_until) > Date.now()) {
      throw new LearningError(
        "Слишком много неудачных попыток. Повторите вход позднее.",
        429,
        "login_locked",
        { lockedUntil: limit.locked_until }
      );
    }

    const auth = login ? await this.repository.getUserAuthByLogin(login) : null;
    const valid = auth?.user?.status === "active" && (await verifyPassword(payload.password, auth.credential, { pepper: this.pepper }));
    if (!valid) {
      const previous = limit && Date.now() - Date.parse(limit.updated_at) < 30 * 60 * 1000
        ? Number(limit.failure_count || 0)
        : 0;
      const failures = previous + 1;
      await this.repository.setLoginLimit({
        login_key: login || "<empty>",
        failure_count: failures,
        locked_until: failures >= LOGIN_FAILURE_LIMIT
          ? new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000).toISOString()
          : null,
        updated_at: now
      });
      throw new LearningError("Неверный логин или пароль.", 401, "invalid_credentials");
    }

    await this.repository.clearLoginLimit(login);
    const token = randomToken(32);
    const session = {
      token_hash: hashToken(token),
      user_id: auth.user.id,
      csrf_token: randomToken(24),
      expires_at: addHours(now, SESSION_HOURS),
      revoked_at: null,
      created_at: now,
      last_seen_at: now
    };
    await this.repository.createSession(session);
    return {
      token,
      maxAgeSeconds: SESSION_HOURS * 60 * 60,
      csrfToken: session.csrf_token,
      user: publicUser({ ...auth, session })
    };
  }

  async studentAccessGroups() {
    const groups = (await this.repository.listStudentAccessGroups())
      .filter((group) => !this.isHiddenLegacyPilotGroup(group));
    return {
      groups: groups.map((group) => ({ id: group.id, code: group.code, name: group.name }))
    };
  }

  isHiddenLegacyPilotGroup(group) {
    return this.pilotGroupCode !== PILOT_GROUP.code && group?.code === PILOT_GROUP.code;
  }

  async studentAccessStudents(groupId) {
    const group = await this.repository.getGroup(String(groupId || ""));
    if (!group || group.status !== "active" || this.isHiddenLegacyPilotGroup(group)) {
      throw new LearningError("Группа не найдена.", 404, "group_not_found");
    }
    const students = await this.repository.listGroupStudents(group.id);
    return {
      group: { id: group.id, code: group.code, name: group.name },
      students: students.map((student) => ({
        id: student.id,
        displayName: student.display_name
      }))
    };
  }

  async selectStudent(payload) {
    const groupId = String(payload.groupId || "");
    const studentId = String(payload.studentId || "");
    const group = groupId ? await this.repository.getGroup(groupId) : null;
    const auth = studentId ? await this.repository.getUserAuthById(studentId) : null;
    const belongsToGroup = auth?.groups?.some((item) => item.id === groupId);
    const isStudent = auth?.roles?.includes("student");
    if (!group || group.status !== "active" || this.isHiddenLegacyPilotGroup(group) || !auth || auth.user.status !== "active" || !belongsToGroup || !isStudent) {
      throw new LearningError("Студент не найден в выбранной группе.", 404, "student_not_found");
    }

    const now = nowIso();
    const token = randomToken(32);
    const session = {
      token_hash: hashToken(token),
      user_id: auth.user.id,
      csrf_token: randomToken(24),
      expires_at: addHours(now, SESSION_HOURS),
      revoked_at: null,
      created_at: now,
      last_seen_at: now
    };
    await this.repository.createSession(session);
    return {
      token,
      maxAgeSeconds: SESSION_HOURS * 60 * 60,
      csrfToken: session.csrf_token,
      user: publicUser({ ...auth, session })
    };
  }

  async authenticate(token) {
    if (!token) return null;
    const context = await this.repository.getSessionContext(hashToken(token));
    if (!context || context.session.revoked_at || Date.parse(context.session.expires_at) <= Date.now()) {
      return null;
    }
    if (context.user.status !== "active") return null;
    if (Date.now() - Date.parse(context.session.last_seen_at || 0) > 5 * 60 * 1000) {
      await this.repository.touchSession(context.session.token_hash, nowIso());
    }
    return context;
  }

  requireRole(context, roles, options = {}) {
    if (!context) throw new LearningError("Требуется вход в систему.", 401, "authentication_required");
    if (!hasRole(context, roles)) throw new LearningError("Недостаточно прав.", 403, "forbidden");
    if (context.credential?.must_change_password && !hasRole(context, "student") && !options.allowPasswordChange) {
      throw new LearningError(
        "Перед началом работы смените временный пароль.",
        403,
        "password_change_required"
      );
    }
    return context;
  }

  assertCsrf(context, token) {
    const actual = String(token || "");
    const expected = String(context?.session?.csrf_token || "");
    const sameLength = Buffer.byteLength(actual) === Buffer.byteLength(expected);
    if (!sameLength || !crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) {
      throw new LearningError("Проверка безопасности запроса не пройдена.", 403, "csrf_rejected");
    }
  }

  async logout(context) {
    if (context?.session?.token_hash) {
      await this.repository.revokeSession(context.session.token_hash, nowIso());
    }
    return { loggedOut: true };
  }

  async changePassword(context, payload) {
    this.requireRole(context, ["admin", "teacher", "student"], { allowPasswordChange: true });
    const validCurrent = await verifyPassword(payload.currentPassword, context.credential, { pepper: this.pepper });
    assertLearning(validCurrent, "Текущий пароль указан неверно.", 400, "current_password_invalid");
    const password = validatePassword(payload.newPassword);
    assertLearning(password === String(payload.confirmPassword || ""), "Пароли не совпадают.", 400, "password_confirmation_mismatch");
    const updatedAt = nowIso();
    const passwordData = await hashPassword(password, {
      pepper: this.pepper,
      iterations: this.passwordIterations
    });
    await this.repository.replaceCredential(context.user.id, {
      user_id: context.user.id,
      password_hash: passwordData.hash,
      password_salt: passwordData.salt,
      password_iterations: passwordData.iterations,
      must_change_password: 0,
      updated_at: updatedAt
    });
    return { changed: true, requiresLogin: true };
  }

  async catalog(context) {
    this.requireRole(context, ["admin", "teacher", "student"]);
    const catalog = await this.repository.listCatalog(context.user.id, context.roles);
    if (hasRole(context, ["admin", "teacher"])) {
      catalog.groups = await Promise.all((catalog.groups || []).map(async (group) => ({
        ...group,
        studentCount: (await this.repository.listGroupStudents(group.id)).length
      })));
    }
    return catalog;
  }

  async createGroup(context, payload) {
    this.requireRole(context, "admin");
    const code = normalizeCode(payload.code || payload.name);
    const name = String(payload.name || code).trim().slice(0, 160);
    assertLearning(code && name, "Укажите код и название группы.", 400, "group_required");
    const now = nowIso();
    return this.repository.createGroup({
      id: newId("grp"), code, name, status: "active", created_at: now, updated_at: now
    }, context.user.id);
  }

  async manageableGroup(context, groupId) {
    this.requireRole(context, ["admin", "teacher"]);
    const id = String(groupId || "");
    const group = id ? await this.repository.getGroup(id) : null;
    const isAdmin = hasRole(context, "admin");
    const allowed = group && (isAdmin || await this.repository.teacherHasGroupAccess(context.user.id, id));
    if (!allowed) throw new LearningError("Группа не найдена.", 404, "group_not_found");
    return group;
  }

  async manageableCourse(context, courseId) {
    this.requireRole(context, ["admin", "teacher"]);
    const id = String(courseId || "");
    const catalog = await this.repository.listCatalog(context.user.id, context.roles);
    const course = (catalog.courses || []).find((item) => item.id === id);
    if (!course) throw new LearningError("Учебный курс не найден.", 404, "course_not_found");
    const groupIds = new Set(
      (catalog.courseGroups || [])
        .filter((item) => item.course_id === id && item.status !== "inactive")
        .map((item) => item.group_id)
    );
    return { course, catalog, groupIds };
  }

  async listGroupStudents(context, groupId) {
    const group = await this.manageableGroup(context, groupId);
    const students = await this.repository.listGroupStudents(group.id);
    return {
      group: { id: group.id, code: group.code, name: group.name },
      students: students.map((student) => ({
        id: student.id,
        login: student.login,
        displayName: student.display_name,
        status: student.status
      }))
    };
  }

  async resetStudentPassword(context, groupId, studentId) {
    const group = await this.manageableGroup(context, groupId);
    const target = await this.repository.getUserAuthById(String(studentId || ""));
    const belongsToGroup = target?.groups?.some((item) => item.id === group.id);
    const isStudent = target?.roles?.includes("student");
    if (!target || target.user.status !== "active" || !belongsToGroup || !isStudent) {
      throw new LearningError("Студент не найден в этой группе.", 404, "student_not_found");
    }

    const password = temporaryPassword();
    const resetAt = nowIso();
    const passwordData = await hashPassword(password, {
      pepper: this.pepper,
      iterations: this.passwordIterations,
      temporary: true
    });
    const result = await this.repository.resetStudentCredential({
      studentId: target.user.id,
      groupId: group.id,
      login: target.user.login,
      actorId: context.user.id,
      resetAt,
      credential: {
        user_id: target.user.id,
        password_hash: passwordData.hash,
        password_salt: passwordData.salt,
        password_iterations: passwordData.iterations,
        must_change_password: 1,
        updated_at: resetAt
      }
    });
    if (!result?.updated) {
      throw new LearningError("Студент не найден в этой группе.", 404, "student_not_found");
    }
    return {
      student: {
        id: target.user.id,
        login: target.user.login,
        displayName: target.user.display_name
      },
      temporaryPassword: password,
      mustChangePassword: true,
      sessionsRevoked: Number(result.sessionsRevoked || 0),
      note: "Временный пароль показан один раз. Студент должен сменить его при входе."
    };
  }

  async createSubject(context, payload) {
    this.requireRole(context, ["admin", "teacher"]);
    const code = normalizeCode(payload.code || payload.name);
    const name = String(payload.name || code).trim().slice(0, 200);
    assertLearning(code && name, "Укажите код и название предмета.", 400, "subject_required");
    const now = nowIso();
    return this.repository.createSubject({
      id: newId("subj"), code, name, status: "active", created_at: now, updated_at: now
    }, context.user.id);
  }

  async createCourse(context, payload) {
    this.requireRole(context, ["admin", "teacher"]);
    const subjectId = String(payload.subjectId || "");
    const groupIds = [...new Set((payload.groupIds || []).map(String).filter(Boolean))];
    assertLearning(subjectId && groupIds.length, "Выберите предмет и хотя бы одну группу.", 400, "course_targets_required");
    await Promise.all(groupIds.map((groupId) => this.manageableGroup(context, groupId)));
    const now = nowIso();
    const course = {
      id: newId("course"),
      subject_id: subjectId,
      academic_year: String(payload.academicYear || "2026/2027").trim(),
      name: String(payload.name || "Учебный курс").trim().slice(0, 200),
      status: "active",
      config_json: JSON.stringify({ timezone: "Europe/Moscow" }),
      created_at: now,
      updated_at: now
    };
    return this.repository.createCourse(course, groupIds, [context.user.id], context.user.id);
  }

  rosterPreview(context, payload) {
    this.requireRole(context, ["admin", "teacher"]);
    const groupCode = normalizeCode(payload.groupCode || payload.groupName);
    const groupName = String(payload.groupName || groupCode).trim().slice(0, 160);
    const rawStudents = Array.isArray(payload.students) ? payload.students : [];
    assertLearning(groupCode && groupName, "Укажите группу.", 400, "group_required");
    assertLearning(rawStudents.length > 0 && rawStudents.length <= 60, "Добавьте от 1 до 60 студентов.", 400, "roster_size");
    const logins = new Set();
    const students = rawStudents.map((item, index) => {
      const displayName = String(item.displayName || item.fullName || item.name || "").trim().slice(0, 160);
      assertLearning(displayName, `Не указано имя студента в строке ${index + 1}.`, 400, "student_name_required");
      const code = normalizeCode(item.code || String(index + 1));
      const internalKey = crypto.createHash("sha256")
        .update(`${groupCode}:${code}:${displayName}`, "utf8")
        .digest("hex")
        .slice(0, 16);
      let login = normalizeLogin(item.login || `student-${internalKey}`);
      login = validateLogin(login);
      assertLearning(!logins.has(login), `Логин ${login} повторяется.`, 400, "duplicate_login");
      logins.add(login);
      return { row: index + 1, code, displayName, login };
    });
    return { group: { code: groupCode, name: groupName }, students };
  }

  async rosterCommit(context, payload) {
    const preview = this.rosterPreview(context, payload);
    if (!hasRole(context, "admin")) {
      const catalog = await this.repository.listCatalog(context.user.id, context.roles);
      const group = (catalog.groups || []).find((item) => item.code === preview.group.code);
      if (!group || !(await this.repository.teacherHasGroupAccess(context.user.id, group.id))) {
        throw new LearningError("Группа не найдена.", 404, "group_not_found");
      }
    }
    const now = nowIso();
    const accounts = [];
    const credentials = [];
    for (const item of preview.students) {
      const password = temporaryPassword();
      const passwordData = await hashPassword(password, {
        pepper: this.pepper,
        iterations: this.passwordIterations,
        temporary: true
      });
      const user = {
        id: newId("usr"), login: item.login, display_name: item.displayName,
        status: "active", created_at: now, updated_at: now
      };
      accounts.push({
        user,
        roles: ["student"],
        credential: {
          user_id: user.id,
          password_hash: passwordData.hash,
          password_salt: passwordData.salt,
          password_iterations: passwordData.iterations,
          must_change_password: 1,
          updated_at: now
        }
      });
      credentials.push({ login: item.login, displayName: item.displayName, temporaryPassword: password });
    }
    const group = {
      id: newId("grp"), code: preview.group.code, name: preview.group.name,
      status: "active", created_at: now, updated_at: now
    };
    const result = await this.repository.importRoster({ group, accounts, actorId: context.user.id, now });
    return { group: result.group, credentials };
  }

  async seedPilot(context) {
    this.requireRole(context, "admin");
    let catalog = await this.repository.listCatalog(context.user.id, context.roles);
    const targetGroup = this.pilotGroupCode === PILOT_GROUP.code
      ? PILOT_GROUP
      : { code: this.pilotGroupCode, name: this.pilotGroupCode, students: [] };
    let group = catalog.groups.find((item) => item.code === targetGroup.code);
    let credentials = [];
    if (!group) {
      const roster = await this.rosterCommit(context, {
        groupCode: targetGroup.code,
        groupName: targetGroup.name,
        students: targetGroup.students
      });
      group = roster.group;
      credentials = roster.credentials;
    }

    const subjects = [];
    for (const definition of PILOT_SUBJECTS) {
      let subject = catalog.subjects.find((item) => item.code === definition.code);
      if (!subject) subject = await this.createSubject(context, definition);
      subjects.push(subject);
    }

    catalog = await this.repository.listCatalog(context.user.id, context.roles);
    const courses = [];
    for (const subject of subjects) {
      const linkedIds = new Set(
        catalog.courseGroups.filter((item) => item.group_id === group.id).map((item) => item.course_id)
      );
      let course = catalog.courses.find((item) => item.subject_id === subject.id && linkedIds.has(item.id));
      if (!course) {
        course = await this.createCourse(context, {
          subjectId: subject.id,
          groupIds: [group.id],
          academicYear: "2026/2027",
          name: `${subject.code} · ${subject.name}`
        });
      }
      courses.push(course);
    }

    const workDefinitions = pilotWorks(courses.map((item) => item.id), group.id);
    const existingTemplates = await this.repository.listTemplates(context.user.id, true);
    let assignments = await this.repository.listAssignmentsForTeacher(context.user.id);
    for (const obsolete of assignments.filter((item) => item.status === "published" && PILOT_DEPRECATED_TITLES.has(item.title))) {
      await this.repository.archiveAssignment({ assignmentId: obsolete.id, actorId: context.user.id, archivedAt: nowIso() });
    }
    assignments = assignments.map((item) => PILOT_DEPRECATED_TITLES.has(item.title) ? { ...item, status: "archived" } : item);
    const prepared = [];
    for (const definition of workDefinitions) {
      const matchingTitles = new Set([definition.title, ...(PILOT_LEGACY_TITLES.get(definition.title) || [])]);
      let template = existingTemplates.find((item) => matchingTitles.has(item.title) && item.course_id === definition.courseId);
      let version = null;
      let upgraded = false;
      if (!template) {
        template = await this.createTemplate(context, definition);
      }
      const detail = await this.repository.getTemplate(template.id, context.user.id);
      if (detail?.current_version_id) {
        version = await this.repository.getWorkVersion(detail.current_version_id, true);
        if (pilotRevisionOf(version) < PILOT_CONTENT_REVISION) {
          await this.saveTemplate(context, template.id, {
            ...definition,
            expectedRevision: Number(detail.draft_revision || 0)
          });
          version = await this.publishTemplate(context, template.id);
          upgraded = true;
        }
      } else {
        version = await this.publishTemplate(context, template.id);
      }
      let assignment = assignments.find((item) => item.status === "published" && matchingTitles.has(item.title) && item.course_id === definition.courseId);
      const needsAssignmentUpgrade = assignment && (assignment.version_id !== version.id || assignment.title !== definition.title);
      if (needsAssignmentUpgrade && Number(assignment.submittedCount || 0) > 0) {
        await this.repository.archiveAssignment({ assignmentId: assignment.id, actorId: context.user.id, archivedAt: nowIso() });
        assignments = assignments.map((item) => item.id === assignment.id ? { ...item, status: "archived" } : item);
        assignment = null;
        upgraded = true;
      }
      if (!assignment) {
        assignment = await this.createAssignment(context, {
          versionId: version.id,
          courseId: definition.courseId,
          groupIds: [group.id],
          title: definition.title,
          availableFrom: nowIso(),
          dueAt: definition.defaultDueAt,
          allowLate: true,
          maxAttempts: 2,
          feedbackPolicy: "after_review"
        });
        assignments = [...assignments, assignment];
      } else if ((assignment.version_id !== version.id || assignment.title !== definition.title) && Number(assignment.submittedCount || 0) === 0) {
        assignment = await this.repository.replaceAssignmentVersion({
          assignmentId: assignment.id,
          versionId: version.id,
          title: definition.title,
          actorId: context.user.id,
          updatedAt: nowIso()
        });
        assignments = assignments.map((item) => item.id === assignment.id ? { ...item, ...assignment } : item);
        upgraded = true;
      }
      prepared.push({
        templateId: template.id,
        versionId: version.id,
        assignmentId: assignment.id,
        title: definition.title,
        kind: definition.kind,
        upgraded,
        upgradeDeferred: false
      });
    }

    return {
      seeded: credentials.length > 0,
      group: { id: group.id, code: group.code, name: group.name },
      subjects: subjects.map((item) => ({ id: item.id, code: item.code, name: item.name })),
      courses: courses.map((item) => ({ id: item.id, name: item.name })),
      works: prepared,
      credentials,
      note: credentials.length
        ? "Временные пароли показываются один раз. Сохраните их в защищённом месте."
        : "Пилот уже существует. Временные пароли повторно не отображаются."
    };
  }

  normalizeDraft(payload, existing = null) {
    const source = payload.draft || payload;
    const blocks = (Array.isArray(source.blocks) ? source.blocks : []).map((block, index) => {
      const id = String(block.id || newId("block"));
      const type = String(block.type || "instruction");
      const reserved = new Set([
        "id", "type", "title", "prompt", "required", "maxScore", "max_score",
        "answerKey", "privateKey", "gradingKey", "position"
      ]);
      const config = { ...(block.config || {}) };
      Object.entries(block).forEach(([key, value]) => {
        if (!reserved.has(key)) config[key] = value;
      });
      return {
        id,
        type,
        title: String(block.title || "").trim().slice(0, 240),
        prompt: String(block.prompt || "").trim().slice(0, 5000),
        required: block.required !== false,
        maxScore: Math.max(0, Number(block.maxScore ?? block.max_score ?? 0) || 0),
        position: index,
        config,
        privateKey: parseJson(block.privateKey || block.answerKey || block.gradingKey, {})
      };
    });
    const rubric = (Array.isArray(source.rubric) ? source.rubric : []).map((item, index) => ({
      id: String(item.id || newId("rubric")),
      title: String(item.title || `Критерий ${index + 1}`).trim().slice(0, 240),
      description: String(item.description || "").trim().slice(0, 3000),
      maxScore: Math.max(0, Number(item.maxScore ?? item.max_score ?? 0) || 0),
      critical: Boolean(item.critical),
      position: index
    }));
    return {
      courseId: String(source.courseId || existing?.course_id || ""),
      topicId: String(source.topicId || existing?.topic_id || "") || null,
      kind: String(source.kind || source.activityKind || existing?.activity_kind || "practice"),
      title: String(source.title || existing?.title || "Новая работа").trim().slice(0, 240),
      topic: String(source.topic || source.title || existing?.title || "").trim().slice(0, 500),
      instructions: String(source.instructions || "").trim().slice(0, 10_000),
      estimatedMinutes: Math.max(0, Number(source.estimatedMinutes || 0) || 0),
      defaultGroupId: String(source.defaultGroupId || existing?.default_group_id || "") || null,
      defaultDueAt: String(source.defaultDueAt || existing?.default_due_at || "") || null,
      blocks,
      rubric
    };
  }

  async createTemplate(context, payload) {
    this.requireRole(context, ["admin", "teacher"]);
    const draft = this.normalizeDraft(payload);
    assertLearning(draft.courseId, "Выберите учебный курс.", 400, "course_required");
    const courseAccess = await this.manageableCourse(context, draft.courseId);
    if (draft.defaultGroupId && !courseAccess.groupIds.has(draft.defaultGroupId)) {
      throw new LearningError("Группа не найдена в выбранном курсе.", 404, "group_not_found");
    }
    const now = nowIso();
    const template = {
      id: newId("work"),
      course_id: draft.courseId,
      topic_id: draft.topicId,
      created_by: context.user.id,
      title: draft.title,
      activity_kind: draft.kind,
      status: "draft",
      config_json: JSON.stringify({ draftRevision: 0, estimatedMinutes: draft.estimatedMinutes }),
      draft_json: JSON.stringify(draft),
      draft_revision: 0,
      draft_version_id: newId("workv"),
      default_group_id: draft.defaultGroupId,
      default_due_at: draft.defaultDueAt,
      created_at: now,
      updated_at: now
    };
    return this.repository.createTemplate(template, context.user.id);
  }

  async listTemplates(context) {
    this.requireRole(context, ["admin", "teacher"]);
    return this.repository.listTemplates(context.user.id);
  }

  async getTemplate(context, templateId) {
    this.requireRole(context, ["admin", "teacher"]);
    const template = await this.repository.getTemplate(templateId, context.user.id);
    if (!template) throw new LearningError("Работа не найдена.", 404, "work_not_found");
    return template;
  }

  async saveTemplate(context, templateId, payload) {
    this.requireRole(context, ["admin", "teacher"]);
    const existing = await this.repository.getTemplate(templateId, context.user.id);
    if (!existing) throw new LearningError("Работа не найдена.", 404, "work_not_found");
    const draft = this.normalizeDraft(payload, existing);
    if (draft.courseId !== existing.course_id) {
      throw new LearningError(
        "Нельзя изменить учебный курс уже созданной работы.",
        409,
        "template_course_immutable"
      );
    }
    const courseAccess = await this.manageableCourse(context, existing.course_id);
    if (draft.defaultGroupId && !courseAccess.groupIds.has(draft.defaultGroupId)) {
      throw new LearningError("Группа не найдена в выбранном курсе.", 404, "group_not_found");
    }
    return this.repository.saveTemplateDraft(
      templateId,
      context.user.id,
      Number(payload.expectedRevision ?? existing.draft_revision ?? 0),
      draft,
      nowIso()
    );
  }

  buildVersion(template) {
    const draft = template.draft || parseJson(template.draft_json, {});
    const blocks = draft.blocks || [];
    const publicBlocks = blocks.map((block) => ({
      id: block.id,
      type: block.type,
      title: block.title,
      prompt: block.prompt,
      required: block.required,
      maxScore: block.maxScore,
      ...(block.config || {})
    }));
    const privateKeys = Object.fromEntries(
      blocks.filter((block) => Object.keys(block.privateKey || {}).length).map((block) => [block.id, block.privateKey])
    );
    const publicRubric = (draft.rubric || []).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      maxScore: item.maxScore,
      critical: item.critical
    }));
    const total = publicBlocks.reduce((sum, block) => sum + Number(block.maxScore || 0), 0);
    return {
      id: template.draft_version_id || newId("workv"),
      workId: template.id,
      template_id: template.id,
      versionNo: Number(template.next_version_no || 1),
      version_no: Number(template.next_version_no || 1),
      status: "draft",
      title: draft.title || template.title,
      topic: draft.topic || draft.title || template.title,
      instructions: draft.instructions || "",
      contentJson: { schemaVersion: 1, blocks: publicBlocks },
      privateKeyJson: privateKeys,
      publicRubric,
      maxScore: total,
      createdBy: template.created_by,
      createdAt: template.updated_at || nowIso()
    };
  }

  async publishTemplate(context, templateId) {
    this.requireRole(context, ["admin", "teacher"]);
    const template = await this.repository.getTemplate(templateId, context.user.id);
    if (!template) throw new LearningError("Работа не найдена.", 404, "work_not_found");
    const rawVersion = this.buildVersion(template);
    const check = validateWorkDraft(rawVersion);
    if (!check.valid) {
      throw new LearningError("Работа не готова к публикации.", 422, "work_not_publishable", check.errors);
    }
    const publishedAt = nowIso();
    const published = publishWorkVersion(rawVersion, { actorId: context.user.id, now: publishedAt });
    const draft = template.draft || parseJson(template.draft_json, {});
    const blocks = (draft.blocks || []).map((block, position) => ({
      id: block.id,
      version_id: published.id,
      position,
      block_type: block.type,
      title: block.title,
      prompt: block.prompt,
      required: block.required ? 1 : 0,
      max_score: Number(block.maxScore || 0),
      config_json: JSON.stringify(block.config || {}),
      created_at: publishedAt,
      updated_at: publishedAt
    }));
    const keys = (draft.blocks || [])
      .filter((block) => Object.keys(block.privateKey || {}).length)
      .map((block) => ({
        id: newId("key"), version_id: published.id, block_id: block.id,
        key_json: JSON.stringify(block.privateKey), created_at: publishedAt, updated_at: publishedAt
      }));
    const rubric = (draft.rubric || []).map((item, position) => ({
      id: item.id || newId("rubric"), version_id: published.id, position,
      title: item.title, description: item.description || "", max_score: Number(item.maxScore || 0),
      config_json: JSON.stringify({ critical: Boolean(item.critical) }),
      created_at: publishedAt, updated_at: publishedAt
    }));
    const versionRow = {
      id: published.id,
      template_id: template.id,
      version_no: published.versionNo,
      status: "published",
      schema_version: 1,
      title: published.title,
      topic: published.topic,
      instructions: published.instructions,
      content_json: JSON.stringify(published.contentJson),
      public_rubric_json: JSON.stringify(published.publicRubric),
      private_key_json: JSON.stringify(published.privateKeyJson),
      max_score: published.maxScore,
      created_by: context.user.id,
      created_at: template.created_at,
      updated_at: publishedAt,
      published_at: publishedAt
    };
    return this.repository.publishTemplate({
      templateId, teacherId: context.user.id, version: versionRow, blocks, keys, rubric, publishedAt
    });
  }

  workDefinition(work, includeKeys = false) {
    const keyMap = parseJson(work?.private_key_json, {});
    const blocks = (work?.blocks || []).map((row) => {
      const config = row.config || parseJson(row.config_json, {});
      const definition = {
        id: row.id,
        type: row.type || row.block_type,
        title: row.title || "",
        prompt: row.prompt || "",
        required: Boolean(row.required),
        maxScore: Number(row.maxScore ?? row.max_score ?? 0),
        ...config
      };
      if (includeKeys) {
        const key = row.key || keyMap[row.id];
        if (key && Object.keys(key).length) definition.privateKey = parseJson(key, {});
      }
      return definition;
    });
    return {
      id: work.id,
      title: work.title,
      topic: work.topic,
      instructions: work.instructions || "",
      status: work.status,
      maxScore: Number(work.max_score ?? work.maxScore ?? 0),
      blocks,
      rubric: (work.rubric || []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description || "",
        maxScore: Number(item.max_score ?? item.maxScore ?? 0),
        ...parseJson(item.config_json, {})
      }))
    };
  }

  async createAssignment(context, payload) {
    this.requireRole(context, ["admin", "teacher"]);
    const versionId = String(payload.versionId || payload.workVersionId || "");
    const version = await this.repository.getWorkVersion(versionId, true);
    assertLearning(version?.status === "published", "Выберите опубликованную версию работы.", 400, "published_version_required");
    if (!hasRole(context, "admin") && version.template?.created_by !== context.user.id) {
      throw new LearningError("Работа не найдена.", 404, "work_not_found");
    }
    const courseId = String(payload.courseId || version.course_id || version.template?.course_id || "");
    assertLearning(courseId, "Не определён учебный курс.", 400, "course_required");
    if (String(version.course_id || version.template?.course_id || "") !== courseId) {
      throw new LearningError(
        "Опубликованная версия работы относится к другому учебному курсу.",
        409,
        "assignment_course_mismatch"
      );
    }
    const courseAccess = await this.manageableCourse(context, courseId);
    const groupIds = [...new Set((payload.groupIds || []).map(String).filter(Boolean))];
    const directStudentIds = [...new Set((payload.studentIds || []).map(String).filter(Boolean))];
    const recipientIds = new Set(directStudentIds);
    for (const groupId of groupIds) {
      if (!courseAccess.groupIds.has(groupId)) {
        throw new LearningError("Группа не найдена в выбранном курсе.", 404, "group_not_found");
      }
      const students = await this.repository.listGroupStudents(groupId);
      students.forEach((student) => recipientIds.add(student.id));
    }
    for (const studentId of directStudentIds) {
      const target = await this.repository.getUserAuthById(studentId);
      const isStudent = target?.roles?.includes("student") && target.user.status === "active";
      const belongsToCourse = target?.groups?.some((group) => courseAccess.groupIds.has(group.id));
      if (!isStudent || !belongsToCourse) {
        throw new LearningError("Студент не найден в выбранном курсе.", 404, "student_not_found");
      }
    }
    assertLearning(recipientIds.size > 0, "В выбранных группах нет студентов.", 400, "assignment_recipients_required");
    const dueAt = String(payload.dueAt || "");
    const availableFrom = String(payload.availableFrom || payload.availableAt || nowIso());
    const publishedDomain = publishAssignment({
      id: newId("assign"),
      workVersionId: version.id,
      targetGroupIds: groupIds,
      targetStudentIds: directStudentIds,
      dueAt,
      availableAt: availableFrom
    }, { id: version.id, status: version.status }, { actorId: context.user.id, now: nowIso() });
    const createdAt = nowIso();
    const assignment = {
      id: publishedDomain.id,
      course_id: courseId,
      version_id: version.id,
      work_version_id: version.id,
      created_by: context.user.id,
      title: String(payload.title || version.title).trim().slice(0, 240),
      status: "published",
      available_from: availableFrom,
      due_at: dueAt,
      allow_late: payload.allowLate === false ? 0 : 1,
      max_attempts: Math.max(1, Math.min(10, Number(payload.maxAttempts || 2) || 2)),
      config_json: JSON.stringify({
        feedbackPolicy: payload.feedbackPolicy || "after_deadline",
        gradeScale: payload.gradeScale || "default-5"
      }),
      created_at: createdAt,
      updated_at: createdAt,
      published_at: createdAt,
      closed_at: null
    };
    return this.repository.createAssignment({
      assignment,
      groupIds,
      recipientIds: [...recipientIds],
      actorId: context.user.id
    });
  }

  async listTeacherAssignments(context) {
    this.requireRole(context, ["admin", "teacher"]);
    return this.repository.listAssignmentsForTeacher(context.user.id);
  }

  assignmentSummary(item) {
    const submission = item.submission || null;
    const now = Date.now();
    const due = Date.parse(item.due_at || "");
    let status = submission?.status || "not_started";
    if (!submission && Number.isFinite(due) && due < now) status = "overdue";
    return {
      id: item.id,
      title: item.title,
      kind: item.version?.activity_kind || item.template?.activity_kind || item.version?.kind || "practice",
      subject: item.subject?.name || "",
      course: item.course?.name || "",
      availableFrom: item.available_from || null,
      dueAt: item.due_at || null,
      allowLate: Boolean(item.allow_late),
      status,
      progress: submission ? Math.min(100, Number(submission.progress || 0)) : 0,
      autoScore: submission?.auto_score ?? null,
      finalScore: submission?.final_score ?? null,
      grade: submission?.grade || "",
      submittedAt: submission?.submitted_at || null
    };
  }

  async studentDashboard(context) {
    this.requireRole(context, "student");
    const assignments = (await this.repository.listAssignmentsForStudent(context.user.id)).map((item) => this.assignmentSummary(item));
    return {
      student: publicUser(context),
      assignments,
      counters: {
        active: assignments.filter((item) => ["not_started", "in_progress", "returned"].includes(item.status)).length,
        review: assignments.filter((item) => ["submitted", "under_review"].includes(item.status)).length,
        returned: assignments.filter((item) => item.status === "returned").length,
        completed: assignments.filter((item) => item.status === "accepted").length
      }
    };
  }

  async getStudentAssignment(context, assignmentId, includeKeys = false) {
    this.requireRole(context, "student");
    const item = await this.repository.getAssignmentForStudent(assignmentId, context.user.id, includeKeys);
    if (!item) throw new LearningError("Работа не найдена или не назначена вам.", 404, "assignment_not_found");
    const definition = this.workDefinition(item.work, includeKeys);
    const safeDefinition = includeKeys ? definition : sanitizeWorkForStudent(definition);
    return {
      assignment: this.assignmentSummary(item),
      work: safeDefinition,
      submission: item.submission
        ? {
            id: item.submission.id,
            status: item.submission.status,
            draftRevision: Number(item.submission.draft_revision || 0),
            currentRevisionNo: Number(item.submission.current_revision_no || 0),
            answers: item.submission.answers || {},
            attachments: (item.submission.attachments || []).map((attachment) => ({
              id: attachment.id,
              blockId: attachment.block_id,
              name: attachment.original_name,
              mimeType: attachment.mime_type,
              size: Number(attachment.byte_size ?? attachment.byte_length ?? 0),
              status: attachment.status
            })),
            submittedAt: item.submission.submitted_at || null,
            finalScore: item.submission.final_score ?? null,
            grade: item.submission.grade || ""
          }
        : null
    };
  }

  assertAssignmentOpen(item) {
    const now = Date.now();
    if (item.status !== "published") throw new LearningError("Назначение закрыто.", 409, "assignment_closed");
    if (item.available_from && Date.parse(item.available_from) > now) {
      throw new LearningError("Работа ещё не открыта.", 409, "assignment_not_open");
    }
    if (item.due_at && Date.parse(item.due_at) < now && !Boolean(item.allow_late)) {
      throw new LearningError("Срок сдачи завершён.", 409, "assignment_due");
    }
  }

  async startSubmission(context, assignmentId) {
    this.requireRole(context, "student");
    const item = await this.repository.getAssignmentForStudent(assignmentId, context.user.id, false);
    if (!item) throw new LearningError("Работа не найдена.", 404, "assignment_not_found");
    this.assertAssignmentOpen(item);
    const now = nowIso();
    return this.repository.startSubmission({
      id: newId("submission"),
      assignment_id: assignmentId,
      student_id: context.user.id,
      status: "in_progress",
      draft_revision: 0,
      current_revision_no: 0,
      auto_score: null,
      manual_score: null,
      final_score: null,
      grade: "",
      created_at: now,
      started_at: now,
      submitted_at: null,
      reviewed_at: null,
      accepted_at: null,
      grade_published_at: null,
      updated_at: now
    }, context.user.id);
  }

  async saveAnswer(context, submissionId, blockId, payload) {
    this.requireRole(context, "student");
    const submission = await this.repository.getSubmission(submissionId);
    if (!submission || submission.student_id !== context.user.id) {
      throw new LearningError("Сдача не найдена.", 404, "submission_not_found");
    }
    const item = await this.repository.getAssignmentForStudent(submission.assignment_id, context.user.id, false);
    if (!item) throw new LearningError("Работа не найдена.", 404, "assignment_not_found");
    this.assertAssignmentOpen(item);
    const definition = this.workDefinition(item.work, false);
    const block = definition.blocks.find((entry) => entry.id === blockId);
    if (!block) throw new LearningError("Блок не найден.", 404, "block_not_found");
    const value = normalizeAnswer(block, payload.value);
    const result = await this.repository.saveDraftAnswer({
      submissionId,
      studentId: context.user.id,
      blockId,
      answer: value,
      expectedRevision: Number(payload.expectedRevision),
      updatedAt: nowIso()
    });
    return {
      submissionId,
      blockId,
      value,
      draftRevision: Number(result.submission.draft_revision || 0),
      savedAt: result.submission.updated_at
    };
  }

  async trustedFileAnswer(context, submission, block, normalized) {
    const files = Array.isArray(normalized?.files) ? normalized.files : [];
    const canonicalFiles = [];
    const references = [];
    const errors = [];
    const seen = new Set();
    const fileStore = this.attachmentFileStore || new LearningFileStore();
    const issue = (index, code, message) => {
      errors.push({ path: `answer.files[${index}]`, code, message });
    };

    for (const [index, file] of files.entries()) {
      const attachmentId = String(file?.id || "").trim();
      if (!attachmentId) {
        issue(index, "attachment_reference_invalid", "Файл не найден среди завершённых загрузок.");
        continue;
      }
      if (seen.has(attachmentId)) {
        issue(index, "duplicate_attachment", "Один и тот же файл нельзя приложить дважды.");
        continue;
      }
      seen.add(attachmentId);

      const attachment = await this.repository.getAttachment(attachmentId);
      const owned = attachment
        && attachment.status === "ready"
        && !attachment.deleted_at
        && attachment.submission_id === submission.id
        && attachment.uploaded_by === context.user.id
        && attachment.block_id === block.id;
      if (!owned) {
        issue(index, "attachment_reference_invalid", "Файл не найден среди завершённых загрузок.");
        continue;
      }

      const expectedPrefix = `learning/${encodeURIComponent(submission.id)}/${attachment.id}.`;
      if (!String(attachment.object_key || "").startsWith(expectedPrefix)) {
        issue(index, "attachment_object_invalid", "Сохранённый файл не прошёл проверку целостности.");
        continue;
      }

      const storedObject = await fileStore.get(attachment.object_key);
      if (!storedObject) {
        issue(index, "attachment_object_missing", "Загруженный файл отсутствует в хранилище. Загрузите его повторно.");
        continue;
      }
      const body = Buffer.isBuffer(storedObject.body)
        ? storedObject.body
        : Buffer.from(storedObject.body || []);
      const declaredSize = Number(attachment.byte_size ?? attachment.byte_length ?? 0);
      const expectedHash = String(attachment.sha256 || "").toLowerCase();
      const actualHash = sha256(body);
      const storedType = String(storedObject.contentType || "")
        .toLowerCase()
        .split(";")[0]
        .trim();
      const backend = typeof fileStore.backend === "function" ? fileStore.backend() : "";
      const metadata = storedObject.customMetadata || {};
      const invalidObject = body.length !== declaredSize
        || !/^[a-f0-9]{64}$/.test(expectedHash)
        || actualHash !== expectedHash
        || !hasExpectedSignature(body, attachment.mime_type)
        || (storedType && storedType !== "application/octet-stream" && storedType !== attachment.mime_type)
        || (backend && attachment.storage_backend && backend !== attachment.storage_backend)
        || (attachment.storage_backend === "r2" && (
          metadata.attachmentId !== attachment.id
          || metadata.submissionId !== submission.id
        ));
      if (invalidObject) {
        issue(index, "attachment_object_invalid", "Сохранённый файл не прошёл проверку целостности.");
        continue;
      }

      canonicalFiles.push({
        id: attachment.id,
        name: attachment.original_name,
        mimeType: attachment.mime_type,
        size: declaredSize,
        status: "stored"
      });
      references.push({ id: attachment.id, blockId: block.id });
    }

    return { normalized: { files: canonicalFiles }, references, errors };
  }

  async submit(context, submissionId, payload = {}) {
    this.requireRole(context, "student");
    const submission = await this.repository.getSubmission(submissionId);
    if (!submission || submission.student_id !== context.user.id) {
      throw new LearningError("Сдача не найдена.", 404, "submission_not_found");
    }
    const item = await this.repository.getAssignmentForStudent(submission.assignment_id, context.user.id, true);
    if (!item) throw new LearningError("Работа не найдена.", 404, "assignment_not_found");
    this.assertAssignmentOpen(item);
    if (Number(payload.expectedRevision) !== Number(submission.draft_revision || 0)) {
      throw new LearningError("Черновик изменён в другой вкладке.", 409, "revision_conflict", {
        currentRevision: Number(submission.draft_revision || 0)
      });
    }
    const definition = this.workDefinition(item.work, true);
    const errors = [];
    const normalizedAnswers = {};
    const attachmentReferences = [];
    for (const block of definition.blocks) {
      let answer = normalizeAnswer(block, submission.answers?.[block.id]);
      if (block.type === "file_evidence" && answer?.files?.length) {
        const trusted = await this.trustedFileAnswer(context, submission, block, answer);
        answer = trusted.normalized;
        attachmentReferences.push(...trusted.references);
        trusted.errors.forEach((entry) => errors.push({ blockId: block.id, ...entry }));
      }
      const validation = validateAnswer(block, answer);
      normalizedAnswers[block.id] = validation.normalized;
      if (!validation.valid) {
        validation.errors.forEach((entry) => errors.push({ blockId: block.id, ...entry }));
      }
    }
    if (errors.length) {
      throw new LearningError("Заполните обязательные части работы.", 422, "submission_incomplete", errors);
    }
    const grading = gradeSubmission(definition, normalizedAnswers);
    const submittedAt = nowIso();
    const versionNo = Number(submission.current_revision_no || 0) + 1;
    const revision = {
      id: newId("revision"),
      submission_id: submissionId,
      version_no: versionNo,
      work_version_id: item.work.id,
      state: "sealed",
      submitted_by: context.user.id,
      auto_score: grading.autoScore,
      max_score: grading.maxScore,
      submitted_at: submittedAt,
      sealed_at: submittedAt,
      created_at: submittedAt
    };
    const scores = Object.fromEntries(
      Object.entries(grading.blockResults).map(([id, result]) => [id, {
        score: result.score,
        maxScore: result.maxScore,
        feedback: result.validation?.errors || []
      }])
    );
    return this.repository.submitRevision({
      submissionId,
      studentId: context.user.id,
      revision,
      answers: normalizedAnswers,
      scores,
      submittedAt,
      expectedRevision: Number(payload.expectedRevision),
      attachmentReferences,
      idempotencyKey: String(payload.idempotencyKey || "")
    });
  }

  async teacherDashboard(context) {
    this.requireRole(context, ["admin", "teacher"]);
    const [assignments, submissions, catalog] = await Promise.all([
      this.repository.listAssignmentsForTeacher(context.user.id),
      this.repository.listSubmissionsForTeacher(context.user.id, {}),
      this.catalog(context)
    ]);
    const pending = submissions.filter((item) => ["submitted", "under_review"].includes(item.status));
    const rows = assignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      kind: assignment.version?.activity_kind || assignment.template?.activity_kind || "practice",
      groupIds: assignment.groupIds || [],
      subject: assignment.subject?.name || "",
      dueAt: assignment.due_at,
      status: assignment.status,
      reviewCount: pending.filter((submission) => submission.assignment_id === assignment.id).length,
      submittedCount: submissions.filter((submission) => submission.assignment_id === assignment.id).length
    }));
    return {
      teacher: publicUser(context),
      summary: {
        groups: catalog.groups.length,
        courses: catalog.courses.length,
        assignments: assignments.length,
        pendingReview: pending.length
      },
      today: rows.slice(0, 10),
      pending: pending.slice(0, 20),
      catalog
    };
  }

  async listTeacherSubmissions(context, filters = {}) {
    this.requireRole(context, ["admin", "teacher"]);
    return this.repository.listSubmissionsForTeacher(context.user.id, filters);
  }

  async getTeacherSubmission(context, submissionId) {
    this.requireRole(context, ["admin", "teacher"]);
    const result = await this.repository.getSubmissionForTeacher(submissionId, context.user.id);
    if (!result) throw new LearningError("Сдача не найдена.", 404, "submission_not_found");
    return result;
  }

  async returnSubmission(context, submissionId, payload) {
    this.requireRole(context, ["admin", "teacher"]);
    const comment = String(payload.comment || "").trim().slice(0, 5000);
    assertLearning(comment, "Укажите, что студенту нужно исправить.", 400, "comment_required");
    const detail = await this.repository.getSubmissionForTeacher(submissionId, context.user.id);
    if (!detail) throw new LearningError("Сдача не найдена.", 404, "submission_not_found");
    const returnedAt = nowIso();
    const review = {
      id: newId("review"),
      submission_id: submissionId,
      revision_id: detail.current_revision_id || detail.revisions?.at(-1)?.id,
      reviewer_id: context.user.id,
      status: "returned",
      summary_comment: comment,
      comment,
      created_at: returnedAt,
      updated_at: returnedAt,
      completed_at: returnedAt
    };
    return this.repository.returnSubmission({ submissionId, teacherId: context.user.id, review, returnedAt });
  }

  async gradeSubmission(context, submissionId, payload) {
    this.requireRole(context, ["admin", "teacher"]);
    const detail = await this.repository.getSubmissionForTeacher(submissionId, context.user.id);
    if (!detail) throw new LearningError("Сдача не найдена.", 404, "submission_not_found");
    const rubricInput = Array.isArray(payload.rubricScores) ? payload.rubricScores : [];
    const criteria = detail.work?.rubric || [];
    const capacities = scoreCapacities(this.workDefinition(detail.work, true));
    assertLearning(
      Math.abs(capacities.rubricMaxScore - capacities.manualMaxScore) <= 0.0001,
      "Сумма критериев проверки не совпадает с максимальным ручным баллом работы. Создайте исправленную версию работы.",
      409,
      "rubric_capacity_mismatch"
    );
    const byId = new Map(rubricInput.map((item) => [String(item.criterionId || item.id), item]));
    const normalized = criteria.map((criterion) => {
      const input = byId.get(String(criterion.id)) || {};
      const max = Number(criterion.max_score ?? criterion.maxScore ?? 0);
      const score = Number(input.score);
      assertLearning(Number.isFinite(score) && score >= 0 && score <= max, `Проверьте балл по критерию «${criterion.title}».`, 400, "rubric_score_invalid");
      const config = parseJson(criterion.config_json, {});
      if (config.critical && score <= 0) {
        throw new LearningError(`Критический критерий «${criterion.title}» не выполнен. Верните работу на исправление.`, 422, "critical_criterion_failed");
      }
      return { criterion, input, score, max };
    });
    const manualScore = normalized.reduce((sum, item) => sum + item.score, 0);
    const autoScore = Number(detail.auto_score || 0);
    assertLearning(
      Number.isFinite(autoScore) && autoScore >= 0 && autoScore <= capacities.automaticMaxScore + 0.0001,
      "Автоматический балл выходит за пределы опубликованной версии работы.",
      409,
      "automatic_score_out_of_bounds"
    );
    const finalScore = Math.round((autoScore + manualScore) * 100) / 100;
    const maxScore = Number(detail.work?.max_score ?? detail.work?.maxScore ?? 100) || 100;
    assertLearning(
      finalScore <= maxScore + 0.0001,
      "Итоговый балл выходит за максимальный балл работы.",
      409,
      "final_score_out_of_bounds"
    );
    const percent = maxScore ? (finalScore / maxScore) * 100 : 0;
    const grade = percent >= 90 ? "5" : percent >= 75 ? "4" : percent >= 60 ? "3" : "2";
    const acceptedAt = nowIso();
    const reviewId = newId("review");
    const revisionId = detail.current_revision_id || detail.revisions?.at(-1)?.id;
    const review = {
      id: reviewId,
      submission_id: submissionId,
      revision_id: revisionId,
      reviewer_id: context.user.id,
      status: "accepted",
      summary_comment: String(payload.comment || "").trim().slice(0, 5000),
      comment: String(payload.comment || "").trim().slice(0, 5000),
      manual_score: manualScore,
      final_score: finalScore,
      grade,
      publish: payload.publish !== false,
      created_at: acceptedAt,
      updated_at: acceptedAt,
      completed_at: acceptedAt
    };
    const rubricScores = normalized.map(({ criterion, input, score }) => ({
      review_id: reviewId,
      rubric_criterion_id: criterion.id,
      criterion_id: criterion.id,
      score,
      comment: String(input.comment || "").trim().slice(0, 2000),
      created_at: acceptedAt,
      updated_at: acceptedAt,
      submission_id: submissionId
    }));
    const gradeEvent = {
      id: newId("grade"), submission_id: submissionId, revision_id: revisionId,
      review_id: reviewId, actor_id: context.user.id, event_type: "grade_published",
      auto_score: autoScore, manual_score: manualScore, final_score: finalScore,
      comment: review.summary_comment, created_at: acceptedAt
    };
    return this.repository.gradeSubmission({
      submissionId, teacherId: context.user.id, review, rubricScores, gradeEvent, acceptedAt
    });
  }

  async journal(context) {
    this.requireRole(context, ["admin", "teacher"]);
    return this.repository.getJournal(context.user.id);
  }

  async prepareAttachment(context, submissionId, payload) {
    this.requireRole(context, "student");
    const submission = await this.repository.getSubmission(submissionId);
    if (!submission || submission.student_id !== context.user.id) {
      throw new LearningError("Сдача не найдена.", 404, "submission_not_found");
    }
    if (!["in_progress", "returned"].includes(submission.status)) {
      throw new LearningError("После отправки работы файлы нельзя изменять.", 409, "submission_locked");
    }
    const assignment = await this.repository.getAssignmentForStudent(
      submission.assignment_id,
      context.user.id,
      false
    );
    if (!assignment) throw new LearningError("Работа не найдена.", 404, "assignment_not_found");
    const blockId = String(payload.blockId || "");
    const block = this.workDefinition(assignment.work, false).blocks.find((item) => item.id === blockId);
    if (!block || block.type !== "file_evidence") {
      throw new LearningError("Файл можно приложить только к блоку загрузки.", 400, "file_block_required");
    }
    const declaration = validateFileDeclaration(payload);
    const attachmentId = newId("attachment");
    const now = nowIso();
    const attachment = {
      id: attachmentId,
      submission_id: submissionId,
      revision_id: null,
      block_id: blockId,
      uploaded_by: context.user.id,
      object_key: objectKey({
        submissionId,
        attachmentId,
        extension: declaration.extension
      }),
      original_name: declaration.fileName,
      mime_type: declaration.mimeType,
      byte_size: declaration.byteSize,
      byte_length: declaration.byteSize,
      sha256: "pending",
      storage_backend: String(payload.storageBackend || "file"),
      status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null
    };
    await this.repository.createAttachment(attachment, context.user.id);
    return {
      id: attachment.id,
      submissionId,
      blockId: attachment.block_id,
      name: attachment.original_name,
      mimeType: attachment.mime_type,
      size: attachment.byte_size,
      status: attachment.status,
      uploadUrl: `/api/learning/attachments/${encodeURIComponent(attachment.id)}/content`
    };
  }

  async authorizeAttachment(context, attachmentId, options = {}) {
    this.requireRole(context, ["admin", "teacher", "student"]);
    const attachment = await this.repository.getAttachment(attachmentId);
    if (!attachment || attachment.status === "deleted") {
      throw new LearningError("Файл не найден.", 404, "attachment_not_found");
    }
    const submission = await this.repository.getSubmission(attachment.submission_id);
    if (!submission) throw new LearningError("Сдача не найдена.", 404, "submission_not_found");
    if (hasRole(context, "student")) {
      if (submission.student_id !== context.user.id || attachment.uploaded_by !== context.user.id) {
        throw new LearningError("Доступ к файлу запрещён.", 403, "forbidden");
      }
      if (options.mutable && !["in_progress", "returned"].includes(submission.status)) {
        throw new LearningError("Файл уже относится к отправленной версии.", 409, "submission_locked");
      }
    } else {
      const detail = await this.repository.getSubmissionForTeacher(submission.id, context.user.id);
      if (!detail && !hasRole(context, "admin")) {
        throw new LearningError("Доступ к файлу запрещён.", 403, "forbidden");
      }
    }
    return { attachment, submission };
  }

  async verifyAndFinalizeAttachment(context, attachmentId, buffer, storageBackend) {
    const { attachment } = await this.authorizeAttachment(context, attachmentId, { mutable: true });
    if (buffer.length !== Number(attachment.byte_size ?? attachment.byte_length)) {
      throw new LearningError("Фактический размер файла не совпадает с заявленным.", 400, "file_size_mismatch");
    }
    if (!hasExpectedSignature(buffer, attachment.mime_type)) {
      throw new LearningError("Содержимое файла не соответствует его типу.", 400, "file_signature_rejected");
    }
    return this.repository.finalizeAttachment(attachmentId, {
      status: "ready",
      storage_backend: storageBackend,
      sha256: sha256(buffer),
      byte_size: buffer.length,
      byte_length: buffer.length,
      updated_at: nowIso()
    }, context.user.id);
  }

  async deleteAttachment(context, attachmentId) {
    const { attachment } = await this.authorizeAttachment(context, attachmentId, { mutable: true });
    if (attachment.revision_id) {
      return { ...attachment, preserved_for_revision: true };
    }
    await this.repository.deleteAttachment(attachmentId, context.user.id, nowIso());
    return attachment;
  }
}

module.exports = {
  LearningService,
  publicUser,
  hasRole,
  newId,
  nowIso,
  normalizeCode,
  parseJson
};
