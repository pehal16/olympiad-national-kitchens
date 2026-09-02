"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("node:crypto");
const { LearningError, maxAttemptsExceeded } = require("../errors");

const COLLECTIONS = [
  "users",
  "credentials",
  "userRoles",
  "sessions",
  "loginLimits",
  "groups",
  "memberships",
  "subjects",
  "courses",
  "courseGroups",
  "courseTeachers",
  "topics",
  "workTemplates",
  "workVersions",
  "workBlocks",
  "workKeys",
  "rubricCriteria",
  "assignments",
  "assignmentGroups",
  "assignmentRecipients",
  "submissions",
  "draftAnswers",
  "submissionRevisions",
  "revisionAnswers",
  "reviews",
  "rubricScores",
  "gradeEvents",
  "attachments",
  "auditEvents",
  "idempotencyKeys"
];

function initialState() {
  return Object.fromEntries([
    ["meta", { schemaVersion: 1, revision: 0, updatedAt: new Date(0).toISOString() }],
    ...COLLECTIONS.map((key) => [key, []])
  ]);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function parseJson(value, fallback = {}) {
  if (value && typeof value === "object") return clone(value);
  try {
    return value ? JSON.parse(value) : clone(fallback);
  } catch (error) {
    return clone(fallback);
  }
}

function normalizeState(value) {
  const state = value && typeof value === "object" ? value : {};
  const normalized = initialState();
  normalized.meta = { ...normalized.meta, ...(state.meta || {}) };
  COLLECTIONS.forEach((key) => {
    normalized[key] = Array.isArray(state[key]) ? state[key] : [];
  });
  return normalized;
}

class FileLearningRepository {
  constructor(options = {}) {
    const storageDir = path.resolve(options.storageDir || path.join(process.cwd(), "storage"));
    this.filePath = path.resolve(options.filePath || path.join(storageDir, "learning-state.json"));
    this.backupPath = `${this.filePath}.backup`;
    this.writeQueue = Promise.resolve();
    this.state = null;
  }

  async init() {
    await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      this.state = normalizeState(JSON.parse(await fs.promises.readFile(this.filePath, "utf8")));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      this.state = initialState();
      await this.persist(this.state, false);
    }
    return this;
  }

  async persist(nextState, keepBackup = true) {
    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    const payload = JSON.stringify(nextState, null, 2);
    await fs.promises.writeFile(temporaryPath, payload, { encoding: "utf8", mode: 0o600 });
    if (keepBackup) {
      try {
        await fs.promises.copyFile(this.filePath, this.backupPath);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    await fs.promises.rename(temporaryPath, this.filePath);
  }

  async read(reader) {
    if (!this.state) await this.init();
    return clone(reader(this.state));
  }

  async mutate(mutator) {
    const operation = async () => {
      if (!this.state) await this.init();
      const next = clone(this.state);
      const result = await mutator(next);
      next.meta.revision = Number(next.meta.revision || 0) + 1;
      next.meta.updatedAt = new Date().toISOString();
      await this.persist(next);
      this.state = next;
      return clone(result);
    };
    const queued = this.writeQueue.then(operation, operation);
    this.writeQueue = queued.catch(() => {});
    return queued;
  }

  async countUsers() {
    return this.read((state) => state.users.length);
  }

  async createUserAccount({ user, credential, roles = [] }) {
    return this.mutate((state) => {
      if (state.users.some((item) => item.login === user.login)) {
        throw new LearningError("Такой логин уже существует.", 409, "login_exists");
      }
      state.users.push(clone(user));
      state.credentials.push(clone(credential));
      roles.forEach((role) => state.userRoles.push({ user_id: user.id, role }));
      return this.userAuthFromState(state, user.id);
    });
  }

  userAuthFromState(state, userId) {
    const user = state.users.find((item) => item.id === userId);
    if (!user) return null;
    const credential = state.credentials.find((item) => item.user_id === userId) || null;
    const roles = state.userRoles.filter((item) => item.user_id === userId).map((item) => item.role);
    const groups = state.memberships
      .filter((item) => item.user_id === userId && item.status === "active")
      .map((membership) => state.groups.find((group) => group.id === membership.group_id))
      .filter(Boolean);
    return { user, credential, roles, groups };
  }

  teacherHasGroupAccessState(state, teacherId, groupId) {
    const user = state.users.find((item) => item.id === teacherId && item.status === "active");
    const isTeacher = state.userRoles.some((item) => item.user_id === teacherId && item.role === "teacher");
    if (!user || !isTeacher) return false;
    const manageableCourseIds = new Set(
      state.courses
        .filter((item) => ["draft", "active"].includes(item.status))
        .map((item) => item.id)
    );
    const courseIds = new Set(
      state.courseTeachers
        .filter((item) =>
          item.user_id === teacherId && item.status !== "inactive" && manageableCourseIds.has(item.course_id)
        )
        .map((item) => item.course_id)
    );
    return state.courseGroups.some((item) =>
      item.group_id === groupId && item.status !== "inactive" && courseIds.has(item.course_id)
    );
  }

  teacherHasCourseAccessState(state, teacherId, courseId) {
    const user = state.users.find((item) => item.id === teacherId && item.status === "active");
    const isTeacher = state.userRoles.some((item) => item.user_id === teacherId && item.role === "teacher");
    const course = state.courses.find((item) =>
      item.id === courseId && ["draft", "active"].includes(item.status)
    );
    return Boolean(user && isTeacher && course && state.courseTeachers.some((item) =>
      item.course_id === courseId && item.user_id === teacherId && item.status !== "inactive"
    ));
  }

  actorCanManageGroupState(state, actorId, groupId) {
    const user = state.users.find((item) => item.id === actorId && item.status === "active");
    if (!user) return false;
    const isAdmin = state.userRoles.some((item) => item.user_id === actorId && item.role === "admin");
    return isAdmin || this.teacherHasGroupAccessState(state, actorId, groupId);
  }

  async getUserAuthByLogin(login) {
    return this.read((state) => {
      const user = state.users.find((item) => item.login === login);
      return user ? this.userAuthFromState(state, user.id) : null;
    });
  }

  async getUserAuthById(userId) {
    return this.read((state) => this.userAuthFromState(state, userId));
  }

  async replaceCredential(userId, credential) {
    return this.mutate((state) => {
      const index = state.credentials.findIndex((item) => item.user_id === userId);
      if (index < 0) throw new LearningError("Пользователь не найден.", 404, "user_not_found");
      state.credentials[index] = clone(credential);
      state.sessions.forEach((session) => {
        if (session.user_id === userId) session.revoked_at = credential.updated_at;
      });
      return true;
    });
  }

  async resetStudentCredential({ studentId, groupId, credential, actorId, login, resetAt }) {
    return this.mutate((state) => {
      const user = state.users.find((item) => item.id === studentId && item.status === "active");
      const isStudent = state.userRoles.some((item) => item.user_id === studentId && item.role === "student");
      const isMember = state.memberships.some((item) =>
        item.user_id === studentId && item.group_id === groupId && item.status === "active"
      );
      const credentialIndex = state.credentials.findIndex((item) => item.user_id === studentId);
      const actorAllowed = this.actorCanManageGroupState(state, actorId, groupId);
      if (!user || !isStudent || !isMember || credentialIndex < 0 || !actorAllowed) return null;

      state.credentials[credentialIndex] = clone(credential);
      let sessionsRevoked = 0;
      state.sessions.forEach((session) => {
        if (session.user_id === studentId && !session.revoked_at) {
          session.revoked_at = resetAt;
          sessionsRevoked += 1;
        }
      });
      state.loginLimits = state.loginLimits.filter((item) => item.login_key !== login);
      this.auditState(state, actorId, "student.password_reset", "user", studentId, {
        groupId,
        sessionsRevoked,
        mustChangePassword: true
      });
      return { updated: true, sessionsRevoked };
    });
  }

  async getLoginLimit(loginKey) {
    return this.read((state) => state.loginLimits.find((item) => item.login_key === loginKey) || null);
  }

  async setLoginLimit(record) {
    return this.mutate((state) => {
      const index = state.loginLimits.findIndex((item) => item.login_key === record.login_key);
      if (index >= 0) state.loginLimits[index] = clone(record);
      else state.loginLimits.push(clone(record));
      return record;
    });
  }

  async clearLoginLimit(loginKey) {
    return this.mutate((state) => {
      state.loginLimits = state.loginLimits.filter((item) => item.login_key !== loginKey);
      return true;
    });
  }

  async createSession(session) {
    return this.mutate((state) => {
      state.sessions.push(clone(session));
      return session;
    });
  }

  async getSessionContext(tokenHash) {
    return this.read((state) => {
      const session = state.sessions.find((item) => item.token_hash === tokenHash);
      if (!session) return null;
      const auth = this.userAuthFromState(state, session.user_id);
      return auth ? { session, ...auth } : null;
    });
  }

  async touchSession(tokenHash, lastSeenAt) {
    return this.mutate((state) => {
      const session = state.sessions.find((item) => item.token_hash === tokenHash);
      if (session) session.last_seen_at = lastSeenAt;
      return Boolean(session);
    });
  }

  async revokeSession(tokenHash, revokedAt) {
    return this.mutate((state) => {
      const session = state.sessions.find((item) => item.token_hash === tokenHash);
      if (session) session.revoked_at = revokedAt;
      return Boolean(session);
    });
  }

  async createGroup(group, actorId) {
    return this.mutate((state) => {
      if (state.groups.some((item) => item.code === group.code)) {
        throw new LearningError("Группа с таким кодом уже существует.", 409, "group_exists");
      }
      state.groups.push(clone(group));
      this.auditState(state, actorId, "group.created", "group", group.id, { code: group.code });
      return group;
    });
  }

  async createSubject(subject, actorId) {
    return this.mutate((state) => {
      if (state.subjects.some((item) => item.code === subject.code)) {
        throw new LearningError("Предмет с таким кодом уже существует.", 409, "subject_exists");
      }
      state.subjects.push(clone(subject));
      this.auditState(state, actorId, "subject.created", "subject", subject.id, { code: subject.code });
      return subject;
    });
  }

  async createCourse(course, groupIds, teacherIds, actorId) {
    return this.mutate((state) => {
      const uniqueGroupIds = [...new Set(groupIds || [])];
      const uniqueTeacherIds = [...new Set(teacherIds || [])];
      const actor = state.users.find((item) => item.id === actorId && item.status === "active");
      const actorRoles = new Set(
        state.userRoles.filter((item) => item.user_id === actorId).map((item) => item.role)
      );
      const isAdmin = actorRoles.has("admin");
      const isTeacher = actorRoles.has("teacher");
      if (!actor || (!isAdmin && !isTeacher)) {
        throw new LearningError("Недостаточно прав.", 403, "forbidden");
      }
      if (!state.subjects.some((item) => item.id === course.subject_id && item.status === "active")) {
        throw new LearningError("Предмет не найден.", 404, "subject_not_found");
      }
      if (uniqueGroupIds.some((groupId) =>
        !state.groups.some((item) => item.id === groupId && item.status === "active")
        || (!isAdmin && !this.teacherHasGroupAccessState(state, actorId, groupId))
      )) {
        throw new LearningError("Группа не найдена.", 404, "group_not_found");
      }
      if (!isAdmin && (uniqueTeacherIds.length !== 1 || uniqueTeacherIds[0] !== actorId)) {
        throw new LearningError("Недостаточно прав.", 403, "forbidden");
      }
      const invalidTeacher = uniqueTeacherIds.some((teacherId) =>
        !state.users.some((item) => item.id === teacherId && item.status === "active")
        || !state.userRoles.some((item) => item.user_id === teacherId && item.role === "teacher")
      );
      if (invalidTeacher) throw new LearningError("Преподаватель не найден.", 404, "teacher_not_found");
      state.courses.push(clone(course));
      uniqueGroupIds.forEach((groupId) =>
        state.courseGroups.push({
          course_id: course.id, group_id: groupId, status: "active", created_at: course.created_at
        })
      );
      uniqueTeacherIds.forEach((teacherId) =>
        state.courseTeachers.push({
          course_id: course.id, user_id: teacherId, status: "active", created_at: course.created_at
        })
      );
      this.auditState(state, actorId, "course.created", "course", course.id, {});
      return course;
    });
  }

  async importRoster({ group, accounts, actorId, now }) {
    return this.mutate((state) => {
      let targetGroup = state.groups.find((item) => item.code === group.code);
      const actor = state.users.find((item) => item.id === actorId && item.status === "active");
      const isAdmin = state.userRoles.some((item) => item.user_id === actorId && item.role === "admin");
      const isTeacher = state.userRoles.some((item) => item.user_id === actorId && item.role === "teacher");
      if (!actor || (!isAdmin && !isTeacher)) {
        throw new LearningError("Недостаточно прав.", 403, "forbidden");
      }
      if ((!targetGroup && !isAdmin)
        || (targetGroup && !isAdmin && !this.teacherHasGroupAccessState(state, actorId, targetGroup.id))) {
        throw new LearningError("Группа не найдена.", 404, "group_not_found");
      }
      if (!targetGroup) {
        targetGroup = clone(group);
        state.groups.push(targetGroup);
      }
      const created = [];
      accounts.forEach(({ user, credential, roles }) => {
        if (state.users.some((item) => item.login === user.login)) {
          throw new LearningError(`Логин ${user.login} уже существует.`, 409, "login_exists");
        }
        state.users.push(clone(user));
        state.credentials.push(clone(credential));
        roles.forEach((role) => state.userRoles.push({ user_id: user.id, role }));
        state.memberships.push({
          group_id: targetGroup.id,
          user_id: user.id,
          status: "active",
          joined_at: now,
          left_at: null
        });
        created.push(user);
      });
      this.auditState(state, actorId, "roster.imported", "group", targetGroup.id, {
        count: created.length
      });
      return { group: targetGroup, users: created };
    });
  }

  async listCatalog(userId, roles = []) {
    return this.read((state) => {
      const isAdmin = roles.includes("admin");
      const isTeacher = !isAdmin && roles.includes("teacher");
      let courseIds;
      let groupIds;
      if (isAdmin) {
        courseIds = new Set(
          state.courses.filter((item) => ["draft", "active"].includes(item.status)).map((item) => item.id)
        );
        groupIds = new Set(state.groups.filter((item) => item.status === "active").map((item) => item.id));
      } else if (isTeacher) {
        courseIds = new Set(
          state.courseTeachers
            .filter((item) => item.user_id === userId && item.status !== "inactive")
            .map((item) => item.course_id)
            .filter((courseId) => state.courses.some((course) =>
              course.id === courseId && ["draft", "active"].includes(course.status)
            ))
        );
        groupIds = new Set(
          state.courseGroups
            .filter((item) => courseIds.has(item.course_id) && item.status !== "inactive")
            .map((item) => item.group_id)
        );
      } else {
        groupIds = new Set(
          state.memberships
            .filter((item) => item.user_id === userId && item.status === "active")
            .map((item) => item.group_id)
        );
        courseIds = new Set(
          state.courseGroups
            .filter((item) => groupIds.has(item.group_id) && item.status !== "inactive")
            .map((item) => item.course_id)
            .filter((courseId) => state.courses.some((course) =>
              course.id === courseId && course.status === "active"
            ))
        );
      }
      return {
        groups: state.groups.filter((item) => item.status === "active" && groupIds.has(item.id)),
        subjects: state.subjects.filter((subject) =>
          subject.status === "active"
          && state.courses.some((course) => course.subject_id === subject.id && courseIds.has(course.id))
        ),
        courses: state.courses.filter((item) => courseIds.has(item.id)),
        courseGroups: state.courseGroups.filter((item) =>
          courseIds.has(item.course_id) && item.status !== "inactive"
        ),
        topics: state.topics.filter((item) =>
          courseIds.has(item.course_id) && item.status !== "archived"
        )
      };
    });
  }

  async getGroup(groupId) {
    return this.read((state) =>
      state.groups.find((item) => item.id === groupId && item.status === "active") || null
    );
  }

  async listStudentAccessGroups() {
    return this.read((state) => {
      const studentIds = new Set(
        state.userRoles.filter((item) => item.role === "student").map((item) => item.user_id)
      );
      const groupIds = new Set(
        state.memberships
          .filter((item) => item.status === "active" && studentIds.has(item.user_id))
          .filter((item) => state.users.some((user) => user.id === item.user_id && user.status === "active"))
          .map((item) => item.group_id)
      );
      return state.groups
        .filter((item) => item.status === "active" && groupIds.has(item.id))
        .sort((left, right) => left.name.localeCompare(right.name, "ru"));
    });
  }

  async teacherHasGroupAccess(teacherId, groupId) {
    return this.read((state) => this.teacherHasGroupAccessState(state, teacherId, groupId));
  }

  async listGroupStudents(groupId) {
    return this.read((state) => {
      const studentIds = new Set(
        state.userRoles.filter((item) => item.role === "student").map((item) => item.user_id)
      );
      return state.memberships
        .filter((item) => item.group_id === groupId && item.status === "active" && studentIds.has(item.user_id))
        .map((item) => state.users.find((user) => user.id === item.user_id && user.status === "active"))
        .filter(Boolean)
        .map((user) => ({ id: user.id, login: user.login, display_name: user.display_name, status: user.status }));
    });
  }

  async createTemplate(template, actorId) {
    return this.mutate((state) => {
      const isAdmin = state.userRoles.some((item) => item.user_id === actorId && item.role === "admin");
      const allowed = isAdmin || this.teacherHasCourseAccessState(state, actorId, template.course_id);
      const course = state.courses.find((item) =>
        item.id === template.course_id && ["draft", "active"].includes(item.status)
      );
      if (!course || !allowed || template.created_by !== actorId) {
        throw new LearningError("Учебный курс не найден.", 404, "course_not_found");
      }
      state.workTemplates.push(clone(template));
      this.auditState(state, actorId, "work.created", "work_template", template.id, {});
      return template;
    });
  }

  async listTemplates(teacherId, includeArchived = false) {
    return this.read((state) =>
      state.workTemplates
        .filter((item) => (item.created_by === teacherId || !teacherId) && (includeArchived || item.status !== "archived"))
        .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    );
  }

  async getTemplate(templateId, teacherId) {
    return this.read((state) => {
      const item = state.workTemplates.find((template) => template.id === templateId);
      if (!item || (teacherId && item.created_by !== teacherId)) return null;
      return { ...item, draft: parseJson(item.draft_json, { blocks: [], rubric: [] }) };
    });
  }

  async saveTemplateDraft(templateId, teacherId, expectedRevision, draft, updatedAt) {
    return this.mutate((state) => {
      const item = state.workTemplates.find((template) => template.id === templateId);
      if (!item || item.created_by !== teacherId) {
        throw new LearningError("Черновик не найден.", 404, "work_not_found");
      }
      if (Number(item.draft_revision || 0) !== Number(expectedRevision)) {
        throw new LearningError("Черновик изменён в другой вкладке.", 409, "revision_conflict", {
          currentRevision: Number(item.draft_revision || 0)
        });
      }
      if (String(draft.courseId || "") !== String(item.course_id || "")) {
        throw new LearningError(
          "Нельзя изменить учебный курс уже созданной работы.",
          409,
          "template_course_immutable"
        );
      }
      item.draft_json = JSON.stringify(draft);
      item.draft_revision = Number(item.draft_revision || 0) + 1;
      item.updated_at = updatedAt;
      return { ...item, draft: clone(draft) };
    });
  }

  async publishTemplate({ templateId, teacherId, version, blocks, keys, rubric, publishedAt }) {
    return this.mutate((state) => {
      const template = state.workTemplates.find((item) => item.id === templateId);
      if (!template || template.created_by !== teacherId) {
        throw new LearningError("Работа не найдена.", 404, "work_not_found");
      }
      state.workVersions.push(clone(version));
      blocks.forEach((block) => state.workBlocks.push(clone(block)));
      keys.forEach((key) => state.workKeys.push(clone(key)));
      rubric.forEach((criterion) => state.rubricCriteria.push(clone(criterion)));
      template.current_version_id = version.id;
      template.draft_version_id = `workv_${crypto.randomUUID()}`;
      template.next_version_no = Number(version.version_no || 1) + 1;
      template.draft_revision = 0;
      const nextDraft = parseJson(template.draft_json, { blocks: [], rubric: [] });
      nextDraft.blocks = (nextDraft.blocks || []).map((block) => ({
        ...block,
        id: `block_${crypto.randomUUID()}`
      }));
      nextDraft.rubric = (nextDraft.rubric || []).map((criterion) => ({
        ...criterion,
        id: `rubric_${crypto.randomUUID()}`
      }));
      template.draft_json = JSON.stringify(nextDraft);
      template.status = "published";
      template.updated_at = publishedAt;
      this.auditState(state, teacherId, "work.published", "work_version", version.id, {
        templateId,
        versionNo: version.version_no
      });
      return version;
    });
  }

  versionFromState(state, versionId, includeKeys = false) {
    const version = state.workVersions.find((item) => item.id === versionId);
    if (!version) return null;
    const template = state.workTemplates.find((item) => item.id === version.template_id) || null;
    const blocks = state.workBlocks
      .filter((item) => item.version_id === versionId)
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((block) => ({
        ...block,
        config: parseJson(block.config_json),
        ...(includeKeys
          ? { key: parseJson(state.workKeys.find((key) => key.block_id === block.id)?.key_json) }
          : {})
      }));
    const rubric = state.rubricCriteria
      .filter((item) => item.version_id === versionId)
      .sort((a, b) => Number(a.position) - Number(b.position));
    return {
      ...version,
      course_id: template?.course_id || version.course_id || "",
      activity_kind: template?.activity_kind || version.activity_kind || version.kind || "practice",
      template,
      config: parseJson(version.config_json),
      blocks,
      rubric
    };
  }

  async getWorkVersion(versionId, includeKeys = false) {
    return this.read((state) => this.versionFromState(state, versionId, includeKeys));
  }

  async createAssignment({ assignment, groupIds, recipientIds, actorId }) {
    return this.mutate((state) => {
      const groups = [...new Set(groupIds || [])];
      const recipients = [...new Set(recipientIds || [])];
      const isAdmin = state.userRoles.some((item) => item.user_id === actorId && item.role === "admin");
      const actorAllowed = isAdmin || this.teacherHasCourseAccessState(state, actorId, assignment.course_id);
      const course = state.courses.find((item) =>
        item.id === assignment.course_id && ["draft", "active"].includes(item.status)
      );
      const version = state.workVersions.find((item) =>
        item.id === (assignment.work_version_id || assignment.version_id) && item.status === "published"
      );
      const template = version
        ? state.workTemplates.find((item) => item.id === version.template_id)
        : null;
      const versionMatchesCourse = template?.course_id === assignment.course_id;
      const ownsVersion = isAdmin || template?.created_by === actorId;
      if (!course || !actorAllowed || assignment.created_by !== actorId || !version || !versionMatchesCourse || !ownsVersion) {
        throw new LearningError("Работа или учебный курс не найдены.", 404, "assignment_scope_not_found");
      }
      const courseGroupIds = new Set(
        state.courseGroups
          .filter((item) => item.course_id === course.id && item.status !== "inactive")
          .map((item) => item.group_id)
      );
      if (groups.some((groupId) => !courseGroupIds.has(groupId))) {
        throw new LearningError("Группа не найдена в выбранном курсе.", 404, "group_not_found");
      }
      const studentIds = new Set(
        state.userRoles.filter((item) => item.role === "student").map((item) => item.user_id)
      );
      const invalidRecipient = recipients.some((studentId) =>
        !studentIds.has(studentId)
        || !state.users.some((item) => item.id === studentId && item.status === "active")
        || !state.memberships.some((item) =>
          item.user_id === studentId && item.status === "active" && courseGroupIds.has(item.group_id)
        )
      );
      if (invalidRecipient) {
        throw new LearningError("Студент не найден в выбранном курсе.", 404, "student_not_found");
      }
      state.assignments.push(clone(assignment));
      groups.forEach((groupId) =>
        state.assignmentGroups.push({ assignment_id: assignment.id, group_id: groupId })
      );
      recipients.forEach((userId) =>
        state.assignmentRecipients.push({ assignment_id: assignment.id, user_id: userId, assigned_at: assignment.created_at })
      );
      this.auditState(state, actorId, "assignment.created", "assignment", assignment.id, {
        recipients: recipients.length
      });
      return assignment;
    });
  }

  assignmentView(state, assignment) {
    const version = state.workVersions.find((item) => item.id === assignment.version_id);
    const template = version
      ? state.workTemplates.find((item) => item.id === version.template_id)
      : null;
    const course = state.courses.find((item) => item.id === assignment.course_id) || null;
    const subject = course ? state.subjects.find((item) => item.id === course.subject_id) : null;
    return { ...assignment, version, template, course, subject };
  }

  async listAssignmentsForTeacher(teacherId) {
    return this.read((state) =>
      state.assignments
        .filter((item) => item.created_by === teacherId)
        .map((item) => ({
          ...this.assignmentView(state, item),
          groupIds: state.assignmentGroups.filter((link) => link.assignment_id === item.id).map((link) => link.group_id),
          submittedCount: state.submissions.filter((submission) => submission.assignment_id === item.id).length,
          reviewCount: state.submissions.filter((submission) => submission.assignment_id === item.id && ["submitted", "under_review"].includes(submission.status)).length
        }))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    );
  }

  async listAssignmentsForStudent(studentId) {
    return this.read((state) =>
      state.assignmentRecipients
        .filter((item) => item.user_id === studentId)
        .map((recipient) => state.assignments.find((item) => item.id === recipient.assignment_id))
        .filter(Boolean)
        .map((assignment) => {
          const submission = state.submissions.find(
            (item) => item.assignment_id === assignment.id && item.student_id === studentId
          );
          return { ...this.assignmentView(state, assignment), submission: submission || null };
        })
        .sort((a, b) => String(a.due_at || "").localeCompare(String(b.due_at || "")))
    );
  }

  async getAssignmentForStudent(assignmentId, studentId, includeKeys = false) {
    return this.read((state) => {
      const allowed = state.assignmentRecipients.some(
        (item) => item.assignment_id === assignmentId && item.user_id === studentId
      );
      if (!allowed) return null;
      const assignment = state.assignments.find((item) => item.id === assignmentId);
      if (!assignment) return null;
      const submission = state.submissions.find(
        (item) => item.assignment_id === assignmentId && item.student_id === studentId
      );
      return {
        ...this.assignmentView(state, assignment),
        work: this.versionFromState(state, assignment.version_id, includeKeys),
        submission: submission
          ? {
              ...submission,
              answers: Object.fromEntries(
                state.draftAnswers
                  .filter((item) => item.submission_id === submission.id)
                  .map((item) => [item.block_id, parseJson(item.answer_json, null)])
              ),
              attachments: state.attachments.filter((item) => {
                if (item.submission_id !== submission.id || item.status === "deleted") return false;
                if (["in_progress", "returned"].includes(submission.status)) return !item.revision_id;
                return !submission.current_revision_id || item.revision_id === submission.current_revision_id;
              })
            }
          : null
      };
    });
  }

  async startSubmission(submission, actorId) {
    return this.mutate((state) => {
      const existing = state.submissions.find(
        (item) => item.assignment_id === submission.assignment_id && item.student_id === submission.student_id
      );
      if (existing) return existing;
      state.submissions.push(clone(submission));
      this.auditState(state, actorId, "submission.started", "submission", submission.id, {});
      return submission;
    });
  }

  async getSubmission(submissionId) {
    return this.read((state) => {
      const submission = state.submissions.find((item) => item.id === submissionId);
      if (!submission) return null;
      const answers = Object.fromEntries(
        state.draftAnswers
          .filter((item) => item.submission_id === submissionId)
          .map((item) => [item.block_id, parseJson(item.answer_json, null)])
      );
      return { ...submission, answers };
    });
  }

  async saveDraftAnswer({ submissionId, studentId, blockId, answer, expectedRevision, updatedAt }) {
    return this.mutate((state) => {
      const submission = state.submissions.find((item) => item.id === submissionId);
      if (!submission || submission.student_id !== studentId) {
        throw new LearningError("Сдача не найдена.", 404, "submission_not_found");
      }
      if (!["in_progress", "returned"].includes(submission.status)) {
        throw new LearningError("Эта версия уже отправлена и недоступна для изменения.", 409, "submission_locked");
      }
      if (Number(submission.draft_revision || 0) !== Number(expectedRevision)) {
        throw new LearningError("Черновик изменён в другой вкладке.", 409, "revision_conflict", {
          currentRevision: Number(submission.draft_revision || 0)
        });
      }
      const existing = state.draftAnswers.find(
        (item) => item.submission_id === submissionId && item.block_id === blockId
      );
      const record = {
        submission_id: submissionId,
        block_id: blockId,
        answer_json: JSON.stringify(answer),
        updated_at: updatedAt
      };
      if (existing) Object.assign(existing, record);
      else state.draftAnswers.push(record);
      submission.status = "in_progress";
      submission.draft_revision = Number(submission.draft_revision || 0) + 1;
      submission.updated_at = updatedAt;
      return { submission, answer };
    });
  }

  async submitRevision({
    submissionId,
    studentId,
    revision,
    answers,
    scores,
    submittedAt,
    expectedRevision,
    attachmentReferences = [],
    idempotencyKey
  }) {
    return this.mutate((state) => {
      if (idempotencyKey) {
        const previous = state.idempotencyKeys.find(
          (item) => item.scope === "submission.submit" && item.key === idempotencyKey && item.user_id === studentId
        );
        if (previous) {
          const previousResponse = parseJson(previous.response_json);
          const previousSubmissionId = previous.submission_id || previousResponse?.submission?.id;
          if (previousSubmissionId && previousSubmissionId !== submissionId) {
            throw new LearningError(
              "Этот ключ повторной отправки уже использован для другой работы.",
              409,
              "idempotency_key_reused"
            );
          }
          return previousResponse;
        }
      }
      const submission = state.submissions.find((item) => item.id === submissionId);
      if (!submission || submission.student_id !== studentId) {
        throw new LearningError("Сдача не найдена.", 404, "submission_not_found");
      }
      if (!["in_progress", "returned"].includes(submission.status)) {
        throw new LearningError("Работа уже отправлена.", 409, "already_submitted");
      }
      if (Number(submission.draft_revision || 0) !== Number(expectedRevision)) {
        throw new LearningError("Черновик изменён в другой вкладке.", 409, "revision_conflict", {
          currentRevision: Number(submission.draft_revision || 0)
        });
      }
      if (Number(revision.version_no || 0) !== Number(submission.current_revision_no || 0) + 1) {
        throw new LearningError(
          "Состояние работы изменилось во время отправки. Обновите страницу.",
          409,
          "submission_conflict"
        );
      }
      const fileBlockIds = new Set(
        state.workBlocks
          .filter((item) => item.version_id === revision.work_version_id && item.block_type === "file_evidence")
          .map((item) => item.id)
      );
      const sealedReferences = [];
      const seenAttachmentIds = new Set();
      for (const [blockId, answer] of Object.entries(answers)) {
        if (!fileBlockIds.has(blockId)) continue;
        for (const file of Array.isArray(answer?.files) ? answer.files : []) {
          const attachmentId = String(file?.id || "").trim();
          if (!attachmentId || seenAttachmentIds.has(attachmentId)) {
            throw new LearningError(
              "Приложенный файл не прошёл проверку перед отправкой.",
              422,
              "attachment_integrity_failed"
            );
          }
          seenAttachmentIds.add(attachmentId);
          sealedReferences.push({ id: attachmentId, blockId });
        }
      }
      if (
        attachmentReferences.length !== sealedReferences.length
        || attachmentReferences.some((reference) => !sealedReferences.some(
          (sealed) => sealed.id === reference.id && sealed.blockId === reference.blockId
        ))
      ) {
        throw new LearningError(
          "Приложенный файл не прошёл проверку перед отправкой.",
          422,
          "attachment_integrity_failed"
        );
      }
      for (const reference of sealedReferences) {
        const attachment = state.attachments.find((item) => item.id === reference.id);
        if (
          !attachment
          || attachment.status !== "ready"
          || attachment.deleted_at
          || attachment.submission_id !== submissionId
          || attachment.uploaded_by !== studentId
          || attachment.block_id !== reference.blockId
        ) {
          throw new LearningError(
            "Приложенный файл не прошёл проверку перед отправкой.",
            422,
            "attachment_integrity_failed"
          );
        }
      }
      const assignment = state.assignments.find((item) => item.id === submission.assignment_id);
      const maxAttempts = Math.max(1, Number(assignment?.max_attempts) || 1);
      const attemptsUsed = state.submissionRevisions.filter(
        (item) => item.submission_id === submissionId
      ).length;
      if (attemptsUsed >= maxAttempts) {
        throw maxAttemptsExceeded(maxAttempts, attemptsUsed);
      }
      state.submissionRevisions.push(clone(revision));
      Object.entries(answers).forEach(([blockId, answer]) =>
        state.revisionAnswers.push({
          revision_id: revision.id,
          block_id: blockId,
          answer_json: JSON.stringify(answer),
          auto_score: Number(scores[blockId]?.score || 0),
          max_score: Number(scores[blockId]?.maxScore || 0),
          feedback_json: JSON.stringify(scores[blockId]?.feedback || [])
        })
      );
      state.attachments
        .filter((item) => item.submission_id === submissionId && item.status === "ready" && !item.revision_id)
        .forEach((item) => {
          item.revision_id = revision.id;
          item.updated_at = submittedAt;
        });
      submission.status = "submitted";
      submission.current_revision_id = revision.id;
      submission.current_revision_no = Number(revision.version_no || 1);
      submission.auto_score = Number(revision.auto_score || 0);
      submission.submitted_at = submittedAt;
      submission.updated_at = submittedAt;
      this.auditState(state, studentId, "submission.submitted", "submission", submission.id, {
        versionNo: revision.version_no
      });
      const result = { submission, revision };
      if (idempotencyKey) {
        state.idempotencyKeys.push({
          scope: "submission.submit",
          key: idempotencyKey,
          user_id: studentId,
          submission_id: submissionId,
          response_json: JSON.stringify(result),
          created_at: submittedAt
        });
      }
      return result;
    });
  }

  async listSubmissionsForTeacher(teacherId, filters = {}) {
    return this.read((state) =>
      state.submissions
        .map((submission) => {
          const assignment = state.assignments.find((item) => item.id === submission.assignment_id);
          if (!assignment || assignment.created_by !== teacherId) return null;
          const student = state.users.find((item) => item.id === submission.student_id);
          const view = this.assignmentView(state, assignment);
          const recipient = state.assignmentRecipients.find(
            (item) => item.assignment_id === assignment.id && item.user_id === submission.student_id
          );
          const group = recipient
            ? state.groups.find((item) => item.id === recipient.source_group_id)
              || state.groups.find((item) => state.memberships.some((membership) => membership.user_id === submission.student_id && membership.group_id === item.id && membership.status === "active"))
            : null;
          return { ...submission, assignment: { ...view, group }, student };
        })
        .filter(Boolean)
        .filter((item) => !filters.status || item.status === filters.status)
        .sort((a, b) => String(b.submitted_at || b.updated_at).localeCompare(String(a.submitted_at || a.updated_at)))
    );
  }

  async getSubmissionForTeacher(submissionId, teacherId) {
    return this.read((state) => {
      const submission = state.submissions.find((item) => item.id === submissionId);
      if (!submission) return null;
      const assignment = state.assignments.find((item) => item.id === submission.assignment_id);
      if (!assignment || assignment.created_by !== teacherId) return null;
      const student = state.users.find((item) => item.id === submission.student_id);
      const work = this.versionFromState(state, assignment.version_id, true);
      const revisions = state.submissionRevisions
        .filter((item) => item.submission_id === submissionId)
        .sort((a, b) => Number(a.version_no) - Number(b.version_no))
        .map((revision) => ({
          ...revision,
          answers: Object.fromEntries(
            state.revisionAnswers
              .filter((item) => item.revision_id === revision.id)
              .map((item) => [item.block_id, {
                value: parseJson(item.answer_json, null),
                autoScore: item.auto_score,
                maxScore: item.max_score,
                feedback: parseJson(item.feedback_json, [])
              }])
          )
        }));
      return {
        ...submission,
        assignment: this.assignmentView(state, assignment),
        student,
        work,
        revisions,
        attachments: state.attachments.filter((item) => item.submission_id === submissionId),
        reviews: state.reviews.filter((item) => item.submission_id === submissionId),
        rubricScores: state.rubricScores.filter((item) => item.submission_id === submissionId)
      };
    });
  }

  async returnSubmission({ submissionId, teacherId, review, returnedAt }) {
    return this.mutate((state) => {
      const submission = state.submissions.find((item) => item.id === submissionId);
      const assignment = submission && state.assignments.find((item) => item.id === submission.assignment_id);
      if (!submission || !assignment || assignment.created_by !== teacherId) {
        throw new LearningError("Сдача не найдена.", 404, "submission_not_found");
      }
      if (!["submitted", "under_review"].includes(submission.status)) {
        throw new LearningError("Работу нельзя вернуть из текущего состояния.", 409, "invalid_transition");
      }
      const currentRevision = state.submissionRevisions
        .filter((item) => item.submission_id === submissionId)
        .sort((a, b) => Number(b.version_no) - Number(a.version_no))[0];
      if (!currentRevision || currentRevision.id !== review.revision_id) {
        throw new LearningError(
          "Состояние работы изменилось во время проверки. Обновите страницу.",
          409,
          "submission_conflict"
        );
      }
      const existingReviewIndex = state.reviews.findIndex(
        (item) => item.revision_id === review.revision_id
      );
      const existingReview = existingReviewIndex >= 0 ? state.reviews[existingReviewIndex] : null;
      const legacyDraft = existingReview
        && submission.status === "under_review"
        && existingReview.status === "accepted";
      if (existingReview && existingReview.status !== "draft" && !legacyDraft) {
        throw new LearningError("Эта версия работы уже проверена.", 409, "review_completed");
      }
      const storedReview = {
        ...clone(review),
        id: existingReview?.id || review.id,
        status: "returned",
        updated_at: returnedAt,
        completed_at: returnedAt
      };
      if (existingReviewIndex >= 0) state.reviews[existingReviewIndex] = storedReview;
      else state.reviews.push(storedReview);
      submission.status = "returned";
      submission.reviewed_at = returnedAt;
      submission.updated_at = returnedAt;
      this.auditState(state, teacherId, "submission.returned", "submission", submissionId, {
        comment: review.comment
      });
      return submission;
    });
  }

  async gradeSubmission({ submissionId, teacherId, review, rubricScores, gradeEvent, acceptedAt }) {
    return this.mutate((state) => {
      const submission = state.submissions.find((item) => item.id === submissionId);
      const assignment = submission && state.assignments.find((item) => item.id === submission.assignment_id);
      if (!submission || !assignment || assignment.created_by !== teacherId) {
        throw new LearningError("Сдача не найдена.", 404, "submission_not_found");
      }
      if (!["submitted", "under_review"].includes(submission.status)) {
        throw new LearningError("Работу нельзя оценить из текущего состояния.", 409, "invalid_transition");
      }
      const existingReviewIndex = state.reviews.findIndex(
        (item) => item.revision_id === review.revision_id
      );
      const existingReview = existingReviewIndex >= 0 ? state.reviews[existingReviewIndex] : null;
      if (existingReview && existingReview.status !== "draft") {
        throw new LearningError("Эта версия работы уже проверена.", 409, "review_completed");
      }
      const reviewId = existingReview?.id || review.id;
      const storedReview = {
        ...clone(review),
        id: reviewId,
        status: review.publish ? "accepted" : "draft",
        updated_at: acceptedAt,
        completed_at: review.publish ? acceptedAt : null
      };
      submission.status = review.publish ? "accepted" : "under_review";
      submission.manual_score = Number(review.manual_score || 0);
      submission.final_score = Number(review.final_score || 0);
      submission.grade = String(review.grade || "");
      submission.graded_at = acceptedAt;
      submission.reviewed_at = acceptedAt;
      submission.accepted_at = review.publish ? acceptedAt : null;
      submission.grade_published_at = review.publish ? acceptedAt : null;
      submission.updated_at = acceptedAt;
      if (existingReviewIndex >= 0) state.reviews[existingReviewIndex] = storedReview;
      else state.reviews.push(storedReview);
      state.rubricScores = state.rubricScores.filter((item) => item.submission_id !== submissionId);
      rubricScores.forEach((item) => state.rubricScores.push(clone({ ...item, review_id: reviewId })));
      state.gradeEvents.push(clone({ ...gradeEvent, review_id: reviewId }));
      this.auditState(state, teacherId, review.publish ? "submission.accepted" : "submission.graded", "submission", submissionId, {
        finalScore: submission.final_score,
        grade: submission.grade
      });
      return submission;
    });
  }

  async createAttachment(attachment, actorId) {
    return this.mutate((state) => {
      state.attachments.push(clone(attachment));
      this.auditState(state, actorId, "attachment.created", "attachment", attachment.id, {
        submissionId: attachment.submission_id
      });
      return attachment;
    });
  }

  async getAttachment(attachmentId) {
    return this.read((state) => state.attachments.find((item) => item.id === attachmentId) || null);
  }

  async finalizeAttachment(attachmentId, patch, actorId) {
    return this.mutate((state) => {
      const attachment = state.attachments.find((item) => item.id === attachmentId);
      if (!attachment) throw new LearningError("Файл не найден.", 404, "attachment_not_found");
      Object.assign(attachment, clone(patch));
      this.auditState(state, actorId, "attachment.ready", "attachment", attachmentId, {
        byteLength: attachment.byte_length
      });
      return attachment;
    });
  }

  async deleteAttachment(attachmentId, actorId, deletedAt) {
    return this.mutate((state) => {
      const attachment = state.attachments.find((item) => item.id === attachmentId);
      if (!attachment) throw new LearningError("Файл не найден.", 404, "attachment_not_found");
      attachment.status = "deleted";
      attachment.deleted_at = deletedAt;
      this.auditState(state, actorId, "attachment.deleted", "attachment", attachmentId, {});
      return attachment;
    });
  }

  async listAuditEvents(limit = 500) {
    return this.read((state) => state.auditEvents.slice(-Math.max(1, Number(limit))).reverse());
  }

  async getJournal(teacherId) {
    return this.read((state) =>
      state.assignmentRecipients
        .map((recipient) => {
          const assignment = state.assignments.find((item) => item.id === recipient.assignment_id);
          if (!assignment || assignment.created_by !== teacherId) return null;
          const student = state.users.find((item) => item.id === recipient.user_id);
          const submission = state.submissions.find(
            (item) => item.assignment_id === assignment.id && item.student_id === recipient.user_id
          );
          const groupLink = state.assignmentGroups.find((item) => item.assignment_id === assignment.id);
          const group = groupLink ? state.groups.find((item) => item.id === groupLink.group_id) : null;
          const view = this.assignmentView(state, assignment);
          return {
            assignmentId: assignment.id,
            assignmentTitle: assignment.title,
            kind: view.version?.activity_kind || view.template?.activity_kind || view.version?.kind || "",
            subject: view.subject?.name || "",
            group: group?.name || "",
            studentId: student?.id || "",
            studentName: student?.display_name || "",
            status: submission?.status || "not_started",
            dueAt: assignment.due_at,
            submittedAt: submission?.submitted_at || "",
            finalScore: submission?.final_score ?? null,
            grade: submission?.grade || "",
            gradedAt: submission?.graded_at || ""
          };
        })
        .filter(Boolean)
    );
  }

  auditState(state, actorId, action, entityType, entityId, details) {
    state.auditEvents.push({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      actor_id: actorId || null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details_json: JSON.stringify(details || {}),
      created_at: new Date().toISOString()
    });
  }
}

module.exports = {
  FileLearningRepository,
  initialState
};
