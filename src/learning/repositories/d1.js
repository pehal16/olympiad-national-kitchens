"use strict";

const crypto = require("node:crypto");
const { LearningError, maxAttemptsExceeded } = require("../errors");

function json(value, fallback = {}) {
  if (value && typeof value === "object") return JSON.parse(JSON.stringify(value));
  try {
    return value ? JSON.parse(value) : JSON.parse(JSON.stringify(fallback));
  } catch (error) {
    return JSON.parse(JSON.stringify(fallback));
  }
}

function placeholders(count, offset = 1) {
  return Array.from({ length: count }, (_, index) => `?${index + offset}`).join(", ");
}

function submitRequestHash(submissionId, studentId) {
  return crypto
    .createHash("sha256")
    .update(`submission.submit:${studentId}:${submissionId}`)
    .digest("hex");
}

class D1LearningRepository {
  constructor(db) {
    if (!db) throw new Error("D1 binding is required.");
    this.db = db;
  }

  async init() {
    await this.db.prepare("SELECT 1 AS ok").first();
    return this;
  }

  statement(sql, values = []) {
    const statement = this.db.prepare(sql);
    return values.length ? statement.bind(...values) : statement;
  }

  async first(sql, values = []) {
    return this.statement(sql, values).first();
  }

  async all(sql, values = []) {
    const result = await this.statement(sql, values).all();
    return result.results || [];
  }

  async run(sql, values = []) {
    return this.statement(sql, values).run();
  }

  async batch(statements) {
    if (!statements.length) return [];
    return this.db.batch(statements);
  }

  stmt(sql, values = []) {
    return this.statement(sql, values);
  }

  async countUsers() {
    const row = await this.first("SELECT COUNT(*) AS count FROM learning_users");
    return Number(row?.count || 0);
  }

  async createUserAccount({ user, credential, roles = [] }) {
    try {
      await this.batch([
        this.stmt(
          `INSERT INTO learning_users (id, login, display_name, status, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
          [user.id, user.login, user.display_name, user.status, user.created_at, user.updated_at]
        ),
        this.stmt(
          `INSERT INTO learning_credentials
           (user_id, password_hash, password_salt, password_iterations, must_change_password, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
          [credential.user_id, credential.password_hash, credential.password_salt,
            credential.password_iterations, Number(Boolean(credential.must_change_password)), credential.updated_at]
        ),
        ...roles.map((role) => this.stmt(
          "INSERT INTO learning_user_roles (user_id, role) VALUES (?1, ?2)",
          [user.id, role]
        ))
      ]);
    } catch (error) {
      if (/unique|constraint/i.test(String(error?.message))) {
        throw new LearningError("Такой логин уже существует.", 409, "login_exists");
      }
      throw error;
    }
    return this.getUserAuthById(user.id);
  }

  async userAuth(base) {
    if (!base) return null;
    const [roles, groups] = await Promise.all([
      this.all("SELECT role FROM learning_user_roles WHERE user_id = ?1 ORDER BY role", [base.id]),
      this.all(
        `SELECT g.* FROM learning_groups g
         INNER JOIN learning_memberships m ON m.group_id = g.id
         WHERE m.user_id = ?1 AND m.status = 'active' AND g.status = 'active'
         ORDER BY g.name`,
        [base.id]
      )
    ]);
    return {
      user: {
        id: base.id,
        login: base.login,
        display_name: base.display_name,
        status: base.status,
        created_at: base.created_at,
        updated_at: base.updated_at
      },
      credential: base.password_hash ? {
        user_id: base.id,
        password_hash: base.password_hash,
        password_salt: base.password_salt,
        password_iterations: base.password_iterations,
        must_change_password: base.must_change_password,
        updated_at: base.credential_updated_at
      } : null,
      roles: roles.map((item) => item.role),
      groups
    };
  }

  authSelect(where) {
    return `SELECT u.*, c.password_hash, c.password_salt, c.password_iterations,
      c.must_change_password, c.updated_at AS credential_updated_at
      FROM learning_users u LEFT JOIN learning_credentials c ON c.user_id = u.id WHERE ${where}`;
  }

  async getUserAuthByLogin(login) {
    return this.userAuth(await this.first(this.authSelect("u.login = ?1 COLLATE NOCASE"), [login]));
  }

  async getUserAuthById(userId) {
    return this.userAuth(await this.first(this.authSelect("u.id = ?1"), [userId]));
  }

  async replaceCredential(userId, credential) {
    const results = await this.batch([
      this.stmt(
        `UPDATE learning_credentials SET password_hash=?2, password_salt=?3,
         password_iterations=?4, must_change_password=?5, updated_at=?6 WHERE user_id=?1`,
        [userId, credential.password_hash, credential.password_salt, credential.password_iterations,
          Number(Boolean(credential.must_change_password)), credential.updated_at]
      ),
      this.stmt(
        "UPDATE learning_sessions SET revoked_at=?2 WHERE user_id=?1 AND revoked_at IS NULL",
        [userId, credential.updated_at]
      )
    ]);
    return Boolean(results[0]?.meta?.changes);
  }

  async resetStudentCredential({ studentId, groupId, credential, actorId, login, resetAt }) {
    const target = await this.first(
      `SELECT u.id FROM learning_users u
       INNER JOIN learning_memberships m ON m.user_id=u.id
       INNER JOIN learning_user_roles r ON r.user_id=u.id AND r.role='student'
       WHERE u.id=?1 AND u.status='active' AND m.group_id=?2 AND m.status='active'
       AND (
         EXISTS (SELECT 1 FROM learning_user_roles ar
           INNER JOIN learning_users au ON au.id=ar.user_id AND au.status='active'
           WHERE ar.user_id=?3 AND ar.role='admin')
         OR (
           EXISTS (SELECT 1 FROM learning_user_roles tr
             INNER JOIN learning_users tu ON tu.id=tr.user_id AND tu.status='active'
             WHERE tr.user_id=?3 AND tr.role='teacher')
           AND EXISTS (
             SELECT 1 FROM learning_course_teachers ct
             INNER JOIN learning_course_groups cg ON cg.course_id=ct.course_id
             INNER JOIN learning_courses c ON c.id=ct.course_id
             WHERE ct.user_id=?3 AND ct.status='active' AND cg.group_id=?2
             AND cg.status='active' AND c.status IN ('draft','active')
           )
         )
       )`,
      [studentId, groupId, actorId]
    );
    if (!target) return null;

    const results = await this.batch([
      this.stmt(
        `UPDATE learning_credentials SET password_hash=?2, password_salt=?3,
         password_iterations=?4, must_change_password=?5, updated_at=?6 WHERE user_id=?1`,
        [studentId, credential.password_hash, credential.password_salt,
          credential.password_iterations, Number(Boolean(credential.must_change_password)), credential.updated_at]
      ),
      this.stmt(
        "UPDATE learning_sessions SET revoked_at=?2 WHERE user_id=?1 AND revoked_at IS NULL",
        [studentId, resetAt]
      ),
      this.stmt("DELETE FROM learning_login_limits WHERE login_key=?1 COLLATE NOCASE", [login]),
      this.auditStatement(actorId, "student.password_reset", "user", studentId, {
        groupId,
        mustChangePassword: true
      }, resetAt)
    ]);
    if (!results[0]?.meta?.changes) return null;
    return { updated: true, sessionsRevoked: Number(results[1]?.meta?.changes || 0) };
  }

  async getLoginLimit(loginKey) {
    return this.first("SELECT * FROM learning_login_limits WHERE login_key=?1 COLLATE NOCASE", [loginKey]);
  }

  async setLoginLimit(record) {
    await this.run(
      `INSERT INTO learning_login_limits (login_key, failure_count, locked_until, updated_at)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(login_key) DO UPDATE SET failure_count=excluded.failure_count,
       locked_until=excluded.locked_until, updated_at=excluded.updated_at`,
      [record.login_key, record.failure_count, record.locked_until, record.updated_at]
    );
    return record;
  }

  async clearLoginLimit(loginKey) {
    await this.run("DELETE FROM learning_login_limits WHERE login_key=?1 COLLATE NOCASE", [loginKey]);
    return true;
  }

  async createSession(session) {
    await this.run(
      `INSERT INTO learning_sessions
       (token_hash, user_id, csrf_token, expires_at, revoked_at, created_at, last_seen_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      [session.token_hash, session.user_id, session.csrf_token, session.expires_at,
        session.revoked_at, session.created_at, session.last_seen_at]
    );
    return session;
  }

  async getSessionContext(tokenHash) {
    const base = await this.first(
      `SELECT s.token_hash, s.user_id, s.csrf_token, s.expires_at, s.revoked_at,
       s.created_at AS session_created_at, s.last_seen_at,
       u.id, u.login, u.display_name, u.status, u.created_at, u.updated_at,
       c.password_hash, c.password_salt, c.password_iterations,
       c.must_change_password, c.updated_at AS credential_updated_at
       FROM learning_sessions s
       INNER JOIN learning_users u ON u.id=s.user_id
       INNER JOIN learning_credentials c ON c.user_id=u.id
       WHERE s.token_hash=?1`,
      [tokenHash]
    );
    if (!base) return null;
    const auth = await this.userAuth(base);
    return {
      session: {
        token_hash: base.token_hash,
        user_id: base.user_id,
        csrf_token: base.csrf_token,
        expires_at: base.expires_at,
        revoked_at: base.revoked_at,
        created_at: base.session_created_at,
        last_seen_at: base.last_seen_at
      },
      ...auth
    };
  }

  async touchSession(tokenHash, lastSeenAt) {
    const result = await this.run("UPDATE learning_sessions SET last_seen_at=?2 WHERE token_hash=?1", [tokenHash, lastSeenAt]);
    return Boolean(result.meta?.changes);
  }

  async revokeSession(tokenHash, revokedAt) {
    const result = await this.run(
      "UPDATE learning_sessions SET revoked_at=?2 WHERE token_hash=?1 AND revoked_at IS NULL",
      [tokenHash, revokedAt]
    );
    return Boolean(result.meta?.changes);
  }

  auditStatement(actorId, action, entityType, entityId, payload, createdAt = new Date().toISOString()) {
    const id = `audit_${cryptoRandomId()}`;
    return this.stmt(
      `INSERT INTO learning_audit_events
       (id, actor_id, action, entity_type, entity_id, payload_json, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      [id, actorId || null, action, entityType, entityId, JSON.stringify(payload || {}), createdAt]
    );
  }

  async completedSubmitResponse(idempotencyKey, studentId, requestHash) {
    if (!idempotencyKey) return null;
    const cached = await this.first(
      `SELECT request_hash,response_json FROM learning_idempotency_keys
       WHERE scope='submission.submit' AND idempotency_key=?1 AND actor_id=?2 AND status='completed'`,
      [idempotencyKey, studentId]
    );
    if (!cached) return null;
    if (cached.request_hash !== requestHash) {
      throw new LearningError(
        "Этот ключ повторной отправки уже использован для другой работы.",
        409,
        "idempotency_key_reused"
      );
    }
    return json(cached.response_json, {});
  }

  async createGroup(group, actorId) {
    await this.batch([
      this.stmt(
        `INSERT INTO learning_groups (id, code, name, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
        [group.id, group.code, group.name, group.status, group.created_at, group.updated_at]
      ),
      this.auditStatement(actorId, "group.created", "group", group.id, { code: group.code }, group.created_at)
    ]);
    return group;
  }

  async createSubject(subject, actorId) {
    await this.batch([
      this.stmt(
        `INSERT INTO learning_subjects (id, code, name, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
        [subject.id, subject.code, subject.name, subject.status, subject.created_at, subject.updated_at]
      ),
      this.auditStatement(actorId, "subject.created", "subject", subject.id, { code: subject.code }, subject.created_at)
    ]);
    return subject;
  }

  async createCourse(course, groupIds, teacherIds, actorId) {
    const uniqueGroupIds = [...new Set(groupIds || [])];
    const uniqueTeacherIds = [...new Set(teacherIds || [])];
    const actor = await this.getUserAuthById(actorId);
    const isAdmin = actor?.user?.status === "active" && actor.roles.includes("admin");
    const isTeacher = actor?.user?.status === "active" && actor.roles.includes("teacher");
    if (!isAdmin && !isTeacher) {
      throw new LearningError("Недостаточно прав.", 403, "forbidden");
    }
    const subject = await this.first(
      "SELECT id FROM learning_subjects WHERE id=?1 AND status='active'",
      [course.subject_id]
    );
    if (!subject) throw new LearningError("Предмет не найден.", 404, "subject_not_found");
    for (const groupId of uniqueGroupIds) {
      const group = await this.getGroup(groupId);
      const allowed = group && (isAdmin || await this.teacherHasGroupAccess(actorId, groupId));
      if (!allowed) throw new LearningError("Группа не найдена.", 404, "group_not_found");
    }
    if (!isAdmin && (uniqueTeacherIds.length !== 1 || uniqueTeacherIds[0] !== actorId)) {
      throw new LearningError("Недостаточно прав.", 403, "forbidden");
    }
    for (const teacherId of uniqueTeacherIds) {
      const teacher = await this.getUserAuthById(teacherId);
      if (teacher?.user?.status !== "active" || !teacher.roles.includes("teacher")) {
        throw new LearningError("Преподаватель не найден.", 404, "teacher_not_found");
      }
    }
    await this.batch([
      this.stmt(
        `INSERT INTO learning_courses
         (id, subject_id, academic_year, name, status, config_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
        [course.id, course.subject_id, course.academic_year, course.name, course.status,
          course.config_json || "{}", course.created_at, course.updated_at]
      ),
      ...uniqueGroupIds.map((groupId) => this.stmt(
        `INSERT INTO learning_course_groups (course_id, group_id, status, created_at)
         VALUES (?1, ?2, 'active', ?3)`,
        [course.id, groupId, course.created_at]
      )),
      ...uniqueTeacherIds.map((userId) => this.stmt(
        `INSERT INTO learning_course_teachers (course_id, user_id, status, created_at)
         VALUES (?1, ?2, 'active', ?3)`,
        [course.id, userId, course.created_at]
      )),
      this.auditStatement(actorId, "course.created", "course", course.id, {}, course.created_at)
    ]);
    return course;
  }

  async importRoster({ group, accounts, actorId, now }) {
    const existing = await this.first("SELECT * FROM learning_groups WHERE code=?1 COLLATE NOCASE", [group.code]);
    const target = existing || group;
    const actor = await this.getUserAuthById(actorId);
    const isAdmin = actor?.user?.status === "active" && actor.roles.includes("admin");
    const isTeacher = actor?.user?.status === "active" && actor.roles.includes("teacher");
    if (!isAdmin && !isTeacher) {
      throw new LearningError("Недостаточно прав.", 403, "forbidden");
    }
    if ((!existing && !isAdmin)
      || (existing && !isAdmin && !(await this.teacherHasGroupAccess(actorId, existing.id)))) {
      throw new LearningError("Группа не найдена.", 404, "group_not_found");
    }
    const statements = [];
    if (!existing) {
      statements.push(this.stmt(
        `INSERT INTO learning_groups (id, code, name, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
        [group.id, group.code, group.name, group.status, group.created_at, group.updated_at]
      ));
    }
    for (const account of accounts) {
      const { user, credential, roles } = account;
      statements.push(
        this.stmt(
          `INSERT INTO learning_users (id, login, display_name, status, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
          [user.id, user.login, user.display_name, user.status, user.created_at, user.updated_at]
        ),
        this.stmt(
          `INSERT INTO learning_credentials
           (user_id,password_hash,password_salt,password_iterations,must_change_password,updated_at)
           VALUES (?1,?2,?3,?4,?5,?6)`,
          [credential.user_id, credential.password_hash, credential.password_salt,
            credential.password_iterations, Number(Boolean(credential.must_change_password)), credential.updated_at]
        ),
        ...roles.map((role) => this.stmt(
          "INSERT INTO learning_user_roles (user_id, role) VALUES (?1, ?2)", [user.id, role]
        )),
        this.stmt(
          `INSERT INTO learning_memberships (group_id,user_id,status,joined_at,left_at)
           VALUES (?1,?2,'active',?3,NULL)`, [target.id, user.id, now]
        )
      );
    }
    statements.push(this.auditStatement(actorId, "roster.imported", "group", target.id, { count: accounts.length }, now));
    try {
      await this.batch(statements);
    } catch (error) {
      if (/unique|constraint/i.test(String(error?.message))) {
        throw new LearningError("Один из логинов уже используется.", 409, "login_exists");
      }
      throw error;
    }
    return { group: target, users: accounts.map((item) => item.user) };
  }

  async listCatalog(userId, roles = []) {
    const isAdmin = roles.includes("admin");
    const isTeacher = !isAdmin && roles.includes("teacher");
    if (isAdmin) {
      const [groups, subjects, courses, courseGroups, topics] = await Promise.all([
        this.all("SELECT * FROM learning_groups WHERE status='active' ORDER BY name"),
        this.all("SELECT * FROM learning_subjects WHERE status='active' ORDER BY name"),
        this.all("SELECT * FROM learning_courses WHERE status IN ('draft','active') ORDER BY name"),
        this.all("SELECT * FROM learning_course_groups WHERE status='active'"),
        this.all("SELECT * FROM learning_topics WHERE status<>'archived' ORDER BY course_id, sequence_no")
      ]);
      return { groups, subjects, courses, courseGroups, topics };
    }
    if (isTeacher) {
      const [groups, courses, subjects, courseGroups, topics] = await Promise.all([
        this.all(
          `SELECT DISTINCT g.* FROM learning_groups g
           INNER JOIN learning_course_groups cg ON cg.group_id=g.id
           INNER JOIN learning_course_teachers ct ON ct.course_id=cg.course_id
           INNER JOIN learning_courses c ON c.id=cg.course_id
           WHERE ct.user_id=?1 AND ct.status='active' AND cg.status='active'
           AND c.status IN ('draft','active') AND g.status='active' ORDER BY g.name`, [userId]
        ),
        this.all(
          `SELECT DISTINCT c.* FROM learning_courses c
           INNER JOIN learning_course_teachers ct ON ct.course_id=c.id
           WHERE ct.user_id=?1 AND ct.status='active' AND c.status IN ('draft','active')
           ORDER BY c.name`, [userId]
        ),
        this.all(
          `SELECT DISTINCT s.* FROM learning_subjects s
           INNER JOIN learning_courses c ON c.subject_id=s.id
           INNER JOIN learning_course_teachers ct ON ct.course_id=c.id
           WHERE ct.user_id=?1 AND ct.status='active' AND c.status IN ('draft','active')
           AND s.status='active' ORDER BY s.name`, [userId]
        ),
        this.all(
          `SELECT DISTINCT cg.* FROM learning_course_groups cg
           INNER JOIN learning_course_teachers ct ON ct.course_id=cg.course_id
           INNER JOIN learning_courses c ON c.id=cg.course_id
           WHERE ct.user_id=?1 AND ct.status='active' AND cg.status='active'
           AND c.status IN ('draft','active')`, [userId]
        ),
        this.all(
          `SELECT DISTINCT t.* FROM learning_topics t
           INNER JOIN learning_course_teachers ct ON ct.course_id=t.course_id
           INNER JOIN learning_courses c ON c.id=t.course_id
           WHERE ct.user_id=?1 AND ct.status='active' AND c.status IN ('draft','active')
           AND t.status<>'archived' ORDER BY t.course_id,t.sequence_no`, [userId]
        )
      ]);
      return { groups, subjects, courses, courseGroups, topics };
    }
    const [groups, courses, subjects, courseGroups, topics] = await Promise.all([
      this.all(
        `SELECT g.* FROM learning_groups g INNER JOIN learning_memberships m ON m.group_id=g.id
         WHERE m.user_id=?1 AND m.status='active' AND g.status='active' ORDER BY g.name`, [userId]
      ),
      this.all(
        `SELECT DISTINCT c.* FROM learning_courses c
         INNER JOIN learning_course_groups cg ON cg.course_id=c.id
         INNER JOIN learning_memberships m ON m.group_id=cg.group_id
         WHERE m.user_id=?1 AND m.status='active' AND cg.status='active' AND c.status='active'
         ORDER BY c.name`, [userId]
      ),
      this.all(
        `SELECT DISTINCT s.* FROM learning_subjects s
         INNER JOIN learning_courses c ON c.subject_id=s.id
         INNER JOIN learning_course_groups cg ON cg.course_id=c.id
         INNER JOIN learning_memberships m ON m.group_id=cg.group_id
         WHERE m.user_id=?1 AND m.status='active' AND cg.status='active' AND c.status='active'
         ORDER BY s.name`, [userId]
      ),
      this.all(
        `SELECT cg.* FROM learning_course_groups cg INNER JOIN learning_memberships m ON m.group_id=cg.group_id
         WHERE m.user_id=?1 AND m.status='active' AND cg.status='active'`, [userId]
      ),
      this.all(
        `SELECT DISTINCT t.* FROM learning_topics t
         INNER JOIN learning_course_groups cg ON cg.course_id=t.course_id
         INNER JOIN learning_memberships m ON m.group_id=cg.group_id
         WHERE m.user_id=?1 AND m.status='active' AND t.status<>'archived'
         ORDER BY t.course_id,t.sequence_no`, [userId]
      )
    ]);
    return { groups, subjects, courses, courseGroups, topics };
  }

  async getGroup(groupId) {
    return this.first(
      "SELECT * FROM learning_groups WHERE id=?1 AND status='active'",
      [groupId]
    );
  }

  async listStudentAccessGroups() {
    return this.all(
      `SELECT DISTINCT g.* FROM learning_groups g
       INNER JOIN learning_memberships m ON m.group_id=g.id AND m.status='active'
       INNER JOIN learning_users u ON u.id=m.user_id AND u.status='active'
       INNER JOIN learning_user_roles r ON r.user_id=u.id AND r.role='student'
       WHERE g.status='active'
       ORDER BY g.name COLLATE NOCASE`, []
    );
  }

  async teacherHasGroupAccess(teacherId, groupId) {
    const row = await this.first(
      `SELECT 1 AS allowed FROM learning_course_teachers ct
       INNER JOIN learning_course_groups cg ON cg.course_id=ct.course_id
       INNER JOIN learning_courses c ON c.id=ct.course_id
       WHERE ct.user_id=?1 AND ct.status='active' AND cg.group_id=?2
       AND cg.status='active' AND c.status IN ('draft','active') LIMIT 1`,
      [teacherId, groupId]
    );
    return Boolean(row);
  }

  async teacherHasCourseAccess(teacherId, courseId) {
    const row = await this.first(
      `SELECT 1 AS allowed FROM learning_course_teachers ct
       INNER JOIN learning_courses c ON c.id=ct.course_id
       INNER JOIN learning_user_roles r ON r.user_id=ct.user_id AND r.role='teacher'
       INNER JOIN learning_users u ON u.id=ct.user_id AND u.status='active'
       WHERE ct.user_id=?1 AND ct.course_id=?2 AND ct.status='active'
       AND c.status IN ('draft','active') LIMIT 1`,
      [teacherId, courseId]
    );
    return Boolean(row);
  }

  async listGroupStudents(groupId) {
    return this.all(
      `SELECT u.id,u.login,u.display_name,u.status FROM learning_users u
       INNER JOIN learning_memberships m ON m.user_id=u.id
       INNER JOIN learning_user_roles r ON r.user_id=u.id AND r.role='student'
       WHERE m.group_id=?1 AND m.status='active' AND u.status='active'
       ORDER BY u.display_name`, [groupId]
    );
  }

  draftParts(draft, versionId, now) {
    const blocks = Array.isArray(draft?.blocks) ? draft.blocks : [];
    const rubric = Array.isArray(draft?.rubric) ? draft.rubric : [];
    const blockRows = blocks.map((block, position) => ({
      id: block.id,
      version_id: versionId,
      position,
      block_type: block.type,
      title: block.title || "",
      prompt: block.prompt || "",
      required: block.required === false ? 0 : 1,
      max_score: Number(block.maxScore || 0),
      config_json: JSON.stringify(block.config || {}),
      created_at: now,
      updated_at: now
    }));
    const keyRows = blocks
      .filter((block) => block.privateKey && Object.keys(block.privateKey).length)
      .map((block) => ({
        id: `key_${cryptoRandomId()}`,
        version_id: versionId,
        block_id: block.id,
        key_json: JSON.stringify(block.privateKey),
        created_at: now,
        updated_at: now
      }));
    const rubricRows = rubric.map((item, position) => ({
      id: item.id || `rubric_${cryptoRandomId()}`,
      version_id: versionId,
      position,
      title: item.title || `Критерий ${position + 1}`,
      description: item.description || "",
      max_score: Number(item.maxScore || 0),
      config_json: JSON.stringify({ critical: Boolean(item.critical) }),
      created_at: now,
      updated_at: now
    }));
    return { blockRows, keyRows, rubricRows };
  }

  blockInsert(row) {
    return this.stmt(
      `INSERT INTO learning_work_blocks
       (id,version_id,position,block_type,title,prompt,required,max_score,config_json,created_at,updated_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`,
      [row.id,row.version_id,row.position,row.block_type,row.title,row.prompt,row.required,
        row.max_score,row.config_json,row.created_at,row.updated_at]
    );
  }

  keyInsert(row) {
    return this.stmt(
      `INSERT INTO learning_work_keys (id,version_id,block_id,key_json,created_at,updated_at)
       VALUES (?1,?2,?3,?4,?5,?6)`,
      [row.id,row.version_id,row.block_id,row.key_json,row.created_at,row.updated_at]
    );
  }

  rubricInsert(row) {
    return this.stmt(
      `INSERT INTO learning_rubric_criteria
       (id,version_id,position,title,description,max_score,config_json,created_at,updated_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`,
      [row.id,row.version_id,row.position,row.title,row.description,row.max_score,
        row.config_json,row.created_at,row.updated_at]
    );
  }

  async createTemplate(template, actorId) {
    const actor = await this.getUserAuthById(actorId);
    const isAdmin = actor?.user?.status === "active" && actor.roles.includes("admin");
    const allowed = isAdmin || await this.teacherHasCourseAccess(actorId, template.course_id);
    const course = await this.first(
      "SELECT id FROM learning_courses WHERE id=?1 AND status IN ('draft','active')",
      [template.course_id]
    );
    if (!course || !allowed || template.created_by !== actorId) {
      throw new LearningError("Учебный курс не найден.", 404, "course_not_found");
    }
    const draft = json(template.draft_json, { blocks: [], rubric: [] });
    const versionId = template.draft_version_id;
    const parts = this.draftParts(draft, versionId, template.created_at);
    const maxScore = parts.blockRows.reduce((sum, item) => sum + Number(item.max_score || 0), 0);
    const config = {
      ...json(template.config_json, {}),
      draftRevision: Number(template.draft_revision || 0),
      draftVersionId: versionId,
      defaultGroupId: template.default_group_id || draft.defaultGroupId || null,
      defaultDueAt: template.default_due_at || draft.defaultDueAt || null
    };
    await this.batch([
      this.stmt(
        `INSERT INTO learning_work_templates
         (id,course_id,topic_id,created_by,title,activity_kind,status,config_json,created_at,updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,'draft',?7,?8,?9)`,
        [template.id,template.course_id,template.topic_id,template.created_by,template.title,
          template.activity_kind,JSON.stringify(config),template.created_at,template.updated_at]
      ),
      this.stmt(
        `INSERT INTO learning_work_versions
         (id,template_id,version_no,status,schema_version,title,topic,instructions,content_json,
          public_rubric_json,private_key_json,max_score,created_by,created_at,updated_at,published_at)
         VALUES (?1,?2,1,'draft',1,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,NULL)`,
        [versionId,template.id,draft.title || template.title,draft.topic || draft.title || template.title,
          draft.instructions || "",JSON.stringify({schemaVersion:1,blocks:[]}),
          JSON.stringify(draft.rubric || []),JSON.stringify({}),maxScore,template.created_by,
          template.created_at,template.updated_at]
      ),
      ...parts.blockRows.map((row) => this.blockInsert(row)),
      ...parts.keyRows.map((row) => this.keyInsert(row)),
      ...parts.rubricRows.map((row) => this.rubricInsert(row)),
      this.auditStatement(actorId,"work.created","work_template",template.id,{},template.created_at)
    ]);
    return this.getTemplate(template.id, template.created_by);
  }

  async listTemplates(teacherId, includeArchived = false) {
    const values = [teacherId];
    const archived = includeArchived ? "" : "AND t.status<>'archived'";
    const rows = await this.all(
      `SELECT t.*, s.name AS subject_name, c.name AS course_name,
       (SELECT COUNT(*) FROM learning_work_versions v WHERE v.template_id=t.id AND v.status='published') AS published_versions,
       (SELECT id FROM learning_work_versions v WHERE v.template_id=t.id AND v.status='draft' LIMIT 1) AS draft_version_id
       ,(SELECT id FROM learning_work_versions v WHERE v.template_id=t.id AND v.status='published' ORDER BY v.version_no DESC LIMIT 1) AS current_version_id
       ,(SELECT version_no FROM learning_work_versions v WHERE v.template_id=t.id AND v.status='published' ORDER BY v.version_no DESC LIMIT 1) AS current_version_no
       ,(SELECT published_at FROM learning_work_versions v WHERE v.template_id=t.id AND v.status='published' ORDER BY v.version_no DESC LIMIT 1) AS published_at
       FROM learning_work_templates t
       INNER JOIN learning_courses c ON c.id=t.course_id
       INNER JOIN learning_subjects s ON s.id=c.subject_id
       WHERE t.created_by=?1 ${archived}
       ORDER BY t.updated_at DESC`, values
    );
    return rows.map((row) => {
      const config = json(row.config_json, {});
      return { ...row, draft_revision: Number(config.draftRevision || 0) };
    });
  }

  async loadVersionParts(versionId, includeKeys = false) {
    const [blocks, rubric, keys] = await Promise.all([
      this.all("SELECT * FROM learning_work_blocks WHERE version_id=?1 ORDER BY position", [versionId]),
      this.all("SELECT * FROM learning_rubric_criteria WHERE version_id=?1 ORDER BY position", [versionId]),
      includeKeys ? this.all("SELECT * FROM learning_work_keys WHERE version_id=?1", [versionId]) : Promise.resolve([])
    ]);
    const keyMap = new Map(keys.map((item) => [item.block_id, json(item.key_json, {})]));
    return {
      blocks: blocks.map((row) => ({
        ...row,
        config: json(row.config_json, {}),
        ...(includeKeys ? { key: keyMap.get(row.id) || {} } : {})
      })),
      rubric
    };
  }

  async getTemplate(templateId, teacherId) {
    const template = await this.first(
      `SELECT t.*, c.name AS course_name, s.name AS subject_name
       FROM learning_work_templates t
       INNER JOIN learning_courses c ON c.id=t.course_id
       INNER JOIN learning_subjects s ON s.id=c.subject_id
       WHERE t.id=?1 AND t.created_by=?2`, [templateId,teacherId]
    );
    if (!template) return null;
    const config = json(template.config_json, {});
    const draftVersion = await this.first(
      "SELECT * FROM learning_work_versions WHERE template_id=?1 AND status='draft' LIMIT 1", [templateId]
    );
    let draft;
    if (draftVersion) {
      const parts = await this.loadVersionParts(draftVersion.id, true);
      draft = {
        courseId: template.course_id,
        topicId: template.topic_id,
        kind: template.activity_kind,
        title: draftVersion.title,
        topic: draftVersion.topic,
        instructions: draftVersion.instructions,
        estimatedMinutes: Number(config.estimatedMinutes || 0),
        defaultGroupId: config.defaultGroupId || null,
        defaultDueAt: config.defaultDueAt || null,
        blocks: parts.blocks.map((row) => ({
          id:row.id,type:row.block_type,title:row.title,prompt:row.prompt,
          required:Boolean(row.required),maxScore:Number(row.max_score),position:Number(row.position),
          config:row.config,privateKey:row.key || {}
        })),
        rubric: parts.rubric.map((row) => ({
          id:row.id,title:row.title,description:row.description,maxScore:Number(row.max_score),
          ...json(row.config_json,{})
        }))
      };
    } else {
      draft = null;
    }
    const published = await this.first(
      `SELECT id,version_no FROM learning_work_versions
       WHERE template_id=?1 AND status='published' ORDER BY version_no DESC LIMIT 1`, [templateId]
    );
    return {
      ...template,
      draft,
      draft_json: JSON.stringify(draft || {}),
      draft_revision: Number(config.draftRevision || 0),
      draft_version_id: draftVersion?.id || null,
      next_version_no: draftVersion?.version_no || Number(published?.version_no || 0) + 1,
      current_version_id: published?.id || null,
      default_group_id: config.defaultGroupId || null,
      default_due_at: config.defaultDueAt || null
    };
  }

  async saveTemplateDraft(templateId, teacherId, expectedRevision, draft, updatedAt) {
    const template = await this.getTemplate(templateId, teacherId);
    if (!template || !template.draft_version_id) {
      throw new LearningError("Черновик не найден.",404,"work_not_found");
    }
    if (Number(template.draft_revision) !== Number(expectedRevision)) {
      throw new LearningError("Черновик изменён в другой вкладке.",409,"revision_conflict",{
        currentRevision:Number(template.draft_revision)
      });
    }
    if (String(draft.courseId || "") !== String(template.course_id || "")) {
      throw new LearningError(
        "Нельзя изменить учебный курс уже созданной работы.",
        409,
        "template_course_immutable"
      );
    }
    const parts = this.draftParts(draft, template.draft_version_id, updatedAt);
    const maxScore = parts.blockRows.reduce((sum,item)=>sum+Number(item.max_score||0),0);
    const config = {
      ...json(template.config_json,{}),
      draftRevision:Number(template.draft_revision)+1,
      draftVersionId:template.draft_version_id,
      estimatedMinutes:Number(draft.estimatedMinutes||0),
      defaultGroupId:draft.defaultGroupId||null,
      defaultDueAt:draft.defaultDueAt||null
    };
    await this.batch([
      this.stmt("DELETE FROM learning_rubric_criteria WHERE version_id=?1",[template.draft_version_id]),
      this.stmt("DELETE FROM learning_work_keys WHERE version_id=?1",[template.draft_version_id]),
      this.stmt("DELETE FROM learning_work_blocks WHERE version_id=?1",[template.draft_version_id]),
      ...parts.blockRows.map((row)=>this.blockInsert(row)),
      ...parts.keyRows.map((row)=>this.keyInsert(row)),
      ...parts.rubricRows.map((row)=>this.rubricInsert(row)),
      this.stmt(
        `UPDATE learning_work_versions SET title=?2,topic=?3,instructions=?4,
         content_json=?5,public_rubric_json=?6,private_key_json=?7,max_score=?8,updated_at=?9
         WHERE id=?1 AND status='draft'`,
        [template.draft_version_id,draft.title,draft.topic,draft.instructions||"",
          JSON.stringify({schemaVersion:1,blocks:parts.blockRows.map((row)=>row.id)}),
          JSON.stringify(draft.rubric||[]),
          JSON.stringify(Object.fromEntries((draft.blocks||[]).map((block)=>[block.id,block.privateKey||{}]))),
          maxScore,updatedAt]
      ),
      this.stmt(
        `UPDATE learning_work_templates SET topic_id=?2,title=?3,activity_kind=?4,
         config_json=?5,updated_at=?6 WHERE id=?1 AND created_by=?7`,
        [templateId,draft.topicId,draft.title,draft.kind,JSON.stringify(config),updatedAt,teacherId]
      )
    ]);
    return this.getTemplate(templateId,teacherId);
  }

  async publishTemplate({templateId,teacherId,version,blocks,keys,rubric,publishedAt}) {
    const template = await this.getTemplate(templateId,teacherId);
    if (!template || !template.draft_version_id) throw new LearningError("Работа не найдена.",404,"work_not_found");
    const draftId = template.draft_version_id;
    if (version.id !== draftId) version.id = draftId;
    const nextDraftId = `workv_${crypto.randomUUID()}`;
    const nextVersionNo = Number(version.version_no || 1) + 1;
    const blockIdMap = new Map(blocks.map((row)=>[row.id,`block_${crypto.randomUUID()}`]));
    const nextBlocks = blocks.map((row)=>({...row,id:blockIdMap.get(row.id),version_id:nextDraftId,created_at:publishedAt,updated_at:publishedAt}));
    const nextKeys = keys.map((row)=>({...row,id:`key_${crypto.randomUUID()}`,version_id:nextDraftId,block_id:blockIdMap.get(row.block_id),created_at:publishedAt,updated_at:publishedAt}));
    const nextRubric = rubric.map((row)=>({...row,id:`rubric_${crypto.randomUUID()}`,version_id:nextDraftId,created_at:publishedAt,updated_at:publishedAt}));
    const nextPrivateKeys = Object.fromEntries(nextKeys.map((row)=>[row.block_id,json(row.key_json,{})]));
    const config = {...json(template.config_json,{}),draftRevision:0,draftVersionId:nextDraftId};
    await this.batch([
      this.stmt("DELETE FROM learning_rubric_criteria WHERE version_id=?1",[draftId]),
      this.stmt("DELETE FROM learning_work_keys WHERE version_id=?1",[draftId]),
      this.stmt("DELETE FROM learning_work_blocks WHERE version_id=?1",[draftId]),
      ...blocks.map((row)=>this.blockInsert({...row,version_id:draftId})),
      ...keys.map((row)=>this.keyInsert({...row,version_id:draftId})),
      ...rubric.map((row)=>this.rubricInsert({...row,version_id:draftId})),
      this.stmt(
        `UPDATE learning_work_versions SET status='published',schema_version=?2,title=?3,topic=?4,
         instructions=?5,content_json=?6,public_rubric_json=?7,private_key_json=?8,max_score=?9,
         updated_at=?10,published_at=?10 WHERE id=?1 AND status='draft'`,
        [draftId,version.schema_version||1,version.title,version.topic,version.instructions||"",
          version.content_json,version.public_rubric_json,version.private_key_json,version.max_score,publishedAt]
      ),
      this.stmt(
        `INSERT INTO learning_work_versions
         (id,template_id,version_no,status,schema_version,title,topic,instructions,content_json,
          public_rubric_json,private_key_json,max_score,created_by,created_at,updated_at,published_at)
         VALUES (?1,?2,?3,'draft',?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?13,NULL)`,
        [nextDraftId,templateId,nextVersionNo,version.schema_version||1,version.title,version.topic,
          version.instructions||"",JSON.stringify({schemaVersion:1,blocks:nextBlocks.map((row)=>row.id)}),
          version.public_rubric_json,JSON.stringify(nextPrivateKeys),version.max_score,teacherId,publishedAt]
      ),
      ...nextBlocks.map((row)=>this.blockInsert(row)),
      ...nextKeys.map((row)=>this.keyInsert(row)),
      ...nextRubric.map((row)=>this.rubricInsert(row)),
      this.stmt(
        "UPDATE learning_work_templates SET status='active',config_json=?2,updated_at=?3 WHERE id=?1",
        [templateId,JSON.stringify(config),publishedAt]
      ),
      this.auditStatement(teacherId,"work.published","work_version",draftId,{templateId,versionNo:version.version_no},publishedAt)
    ]);
    return this.getWorkVersion(draftId,true);
  }

  async getWorkVersion(versionId,includeKeys=false) {
    const version = await this.first(
      `SELECT v.*,t.course_id,t.activity_kind,t.title AS template_title,t.created_by AS template_created_by
       FROM learning_work_versions v INNER JOIN learning_work_templates t ON t.id=v.template_id
       WHERE v.id=?1`,[versionId]
    );
    if (!version) return null;
    const parts = await this.loadVersionParts(versionId,includeKeys);
    return {
      ...version,
      template:{id:version.template_id,course_id:version.course_id,activity_kind:version.activity_kind,
        title:version.template_title,created_by:version.template_created_by},
      config:json(version.content_json,{}),
      blocks:parts.blocks,
      rubric:parts.rubric
    };
  }

  normalizeAssignment(row) {
    if (!row) return null;
    const version = row.work_version_id ? {
      id: row.work_version_id,
      version_no: Number(row.work_version_no || 0),
      title: row.work_title || row.title,
      topic: row.work_topic || "",
      status: row.work_status || "published",
      max_score: Number(row.work_max_score || 0),
      activity_kind: row.activity_kind || "practice"
    } : null;
    const template = row.template_id ? {
      id: row.template_id,
      title: row.template_title || row.title,
      activity_kind: row.activity_kind || "practice",
      course_id: row.course_id
    } : null;
    const course = row.course_name ? { id: row.course_id, name: row.course_name } : null;
    const subject = row.subject_id ? { id: row.subject_id, name: row.subject_name || "" } : null;
    return {
      ...row,
      version_id: row.work_version_id,
      allow_late: Number(row.allow_late || 0),
      max_attempts: Number(row.max_attempts || 1),
      config: json(row.config_json, {}),
      version,
      template,
      course,
      subject
    };
  }

  assignmentSelect(where) {
    return `SELECT a.*,v.version_no AS work_version_no,v.title AS work_title,
      v.topic AS work_topic,v.status AS work_status,v.max_score AS work_max_score,
      t.id AS template_id,t.title AS template_title,t.activity_kind,
      c.name AS course_name,c.subject_id,s.name AS subject_name
      FROM learning_assignments a
      INNER JOIN learning_work_versions v ON v.id=a.work_version_id
      INNER JOIN learning_work_templates t ON t.id=v.template_id
      INNER JOIN learning_courses c ON c.id=a.course_id
      INNER JOIN learning_subjects s ON s.id=c.subject_id
      WHERE ${where}`;
  }

  async createAssignment({assignment,groupIds=[],recipientIds=[],actorId}) {
    const groups = [...new Set(groupIds)];
    const recipients = [...new Set(recipientIds)];
    const actor = await this.getUserAuthById(actorId);
    const isAdmin = actor?.user?.status === "active" && actor.roles.includes("admin");
    const actorAllowed = isAdmin || await this.teacherHasCourseAccess(actorId, assignment.course_id);
    const course = await this.first(
      "SELECT id FROM learning_courses WHERE id=?1 AND status IN ('draft','active')",
      [assignment.course_id]
    );
    const version = await this.first(
      `SELECT v.id,v.status,t.course_id,t.created_by FROM learning_work_versions v
       INNER JOIN learning_work_templates t ON t.id=v.template_id WHERE v.id=?1`,
      [assignment.work_version_id || assignment.version_id]
    );
    const versionMatchesCourse = version?.status === "published" && version.course_id === assignment.course_id;
    const ownsVersion = isAdmin || version?.created_by === actorId;
    if (!course || !actorAllowed || assignment.created_by !== actorId || !versionMatchesCourse || !ownsVersion) {
      throw new LearningError("Работа или учебный курс не найдены.", 404, "assignment_scope_not_found");
    }
    const courseGroups = await this.all(
      "SELECT group_id FROM learning_course_groups WHERE course_id=?1 AND status='active'",
      [assignment.course_id]
    );
    const courseGroupIds = new Set(courseGroups.map((item) => item.group_id));
    if (groups.some((groupId) => !courseGroupIds.has(groupId))) {
      throw new LearningError("Группа не найдена в выбранном курсе.", 404, "group_not_found");
    }
    for (const studentId of recipients) {
      const student = await this.first(
        `SELECT u.id FROM learning_users u
         INNER JOIN learning_user_roles r ON r.user_id=u.id AND r.role='student'
         INNER JOIN learning_memberships m ON m.user_id=u.id
         INNER JOIN learning_course_groups cg ON cg.group_id=m.group_id
         WHERE u.id=?1 AND u.status='active' AND m.status='active'
         AND cg.course_id=?2 AND cg.status='active' LIMIT 1`,
        [studentId, assignment.course_id]
      );
      if (!student) {
        throw new LearningError("Студент не найден в выбранном курсе.", 404, "student_not_found");
      }
    }
    const statements = [
      this.stmt(
        `INSERT INTO learning_assignments
         (id,course_id,work_version_id,created_by,title,status,available_from,due_at,
          allow_late,max_attempts,config_json,created_at,updated_at,published_at,closed_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)`,
        [assignment.id,assignment.course_id,assignment.work_version_id || assignment.version_id,
          assignment.created_by,assignment.title,assignment.status,assignment.available_from || null,
          assignment.due_at || null,Number(Boolean(assignment.allow_late)),assignment.max_attempts,
          assignment.config_json || "{}",assignment.created_at,assignment.updated_at,
          assignment.published_at || null,assignment.closed_at || null]
      ),
      ...groups.map((groupId)=>this.stmt(
        `INSERT INTO learning_assignment_groups (assignment_id,group_id,created_at)
         VALUES (?1,?2,?3)`,[assignment.id,groupId,assignment.created_at]
      ))
    ];
    for (const userId of recipients) {
      statements.push(this.stmt(
        `INSERT INTO learning_assignment_recipients
         (assignment_id,user_id,source_group_id,status,assigned_at)
         VALUES (?1,?2,(SELECT m.group_id FROM learning_memberships m
           WHERE m.user_id=?2 AND m.status='active' AND m.group_id IN
           (SELECT group_id FROM learning_assignment_groups WHERE assignment_id=?1)
           ORDER BY m.joined_at DESC LIMIT 1),'active',?3)`,
        [assignment.id,userId,assignment.created_at]
      ));
    }
    statements.push(this.auditStatement(actorId,"assignment.created","assignment",assignment.id,{recipients:recipients.length},assignment.created_at));
    await this.batch(statements);
    return this.normalizeAssignment(await this.first(this.assignmentSelect("a.id=?1"),[assignment.id]));
  }

  async replaceAssignmentVersion({assignmentId,versionId,title,actorId,updatedAt}) {
    const assignment = await this.first(
      "SELECT id,course_id FROM learning_assignments WHERE id=?1 AND created_by=?2",
      [assignmentId,actorId]
    );
    const version = await this.first(
      `SELECT v.id,t.course_id FROM learning_work_versions v
       INNER JOIN learning_work_templates t ON t.id=v.template_id
       WHERE v.id=?1 AND v.status='published'`,
      [versionId]
    );
    if (!assignment || !version || version.course_id !== assignment.course_id) {
      throw new LearningError("Работа или версия не найдены.",404,"assignment_scope_not_found");
    }
    const submission = await this.first(
      "SELECT id FROM learning_submissions WHERE assignment_id=?1 LIMIT 1",
      [assignmentId]
    );
    if (submission) {
      throw new LearningError("Нельзя заменить версию начатой работы.",409,"assignment_version_in_use");
    }
    await this.batch([
      this.stmt(
        "UPDATE learning_assignments SET work_version_id=?2,title=COALESCE(?3,title),updated_at=?4 WHERE id=?1 AND created_by=?5",
        [assignmentId,versionId,title || null,updatedAt,actorId]
      ),
      this.auditStatement(actorId,"assignment.version_replaced","assignment",assignmentId,{versionId},updatedAt)
    ]);
    return this.normalizeAssignment(await this.first(this.assignmentSelect("a.id=?1"),[assignmentId]));
  }

  async assignmentGroups(assignmentIds) {
    if (!assignmentIds.length) return new Map();
    const rows = await this.all(
      `SELECT assignment_id,group_id FROM learning_assignment_groups
       WHERE assignment_id IN (${placeholders(assignmentIds.length)}) ORDER BY group_id`,assignmentIds
    );
    const result = new Map(assignmentIds.map((id)=>[id,[]]));
    rows.forEach((row)=>result.get(row.assignment_id)?.push(row.group_id));
    return result;
  }

  async listAssignmentsForTeacher(teacherId) {
    const rows = await this.all(`${this.assignmentSelect("a.created_by=?1")} ORDER BY a.created_at DESC`,[teacherId]);
    const groups = await this.assignmentGroups(rows.map((row)=>row.id));
    const counts = rows.length ? await this.all(
      `SELECT assignment_id,COUNT(*) AS submitted_count,
       SUM(CASE WHEN status IN ('submitted','under_review') THEN 1 ELSE 0 END) AS review_count
       FROM learning_submissions WHERE assignment_id IN (${placeholders(rows.length)}) GROUP BY assignment_id`,
      rows.map((row)=>row.id)
    ) : [];
    const byAssignment = new Map(counts.map((row)=>[row.assignment_id,row]));
    return rows.map((row)=>({
      ...this.normalizeAssignment(row),
      groupIds:groups.get(row.id)||[],
      submittedCount:Number(byAssignment.get(row.id)?.submitted_count||0),
      reviewCount:Number(byAssignment.get(row.id)?.review_count||0)
    }));
  }

  async listAssignmentsForStudent(studentId) {
    const rows = await this.all(
      `${this.assignmentSelect("EXISTS (SELECT 1 FROM learning_assignment_recipients ar WHERE ar.assignment_id=a.id AND ar.user_id=?1 AND ar.status='active')")}
       ORDER BY COALESCE(a.due_at,'9999-12-31'),a.title`,[studentId]
    );
    const submissions = await this.all("SELECT * FROM learning_submissions WHERE student_id=?1",[studentId]);
    const byAssignment = new Map(submissions.map((item)=>[item.assignment_id,item]));
    return rows.map((row)=>({...this.normalizeAssignment(row),submission:byAssignment.get(row.id)||null}));
  }

  async getAssignmentForStudent(assignmentId,studentId,includeKeys=false) {
    const row = await this.first(
      this.assignmentSelect(`a.id=?1 AND EXISTS (
        SELECT 1 FROM learning_assignment_recipients ar
        WHERE ar.assignment_id=a.id AND ar.user_id=?2 AND ar.status='active')`),
      [assignmentId,studentId]
    );
    if (!row) return null;
    const assignment = this.normalizeAssignment(row);
    const work = await this.getWorkVersion(row.work_version_id,includeKeys);
    const submission = await this.first(
      "SELECT * FROM learning_submissions WHERE assignment_id=?1 AND student_id=?2",[assignmentId,studentId]
    );
    if (!submission) return {...assignment,work,submission:null};
    const [answers,attachments] = await Promise.all([
      this.all("SELECT block_id,answer_json FROM learning_draft_answers WHERE submission_id=?1",[submission.id]),
      this.all(
        `SELECT att.* FROM learning_attachments att
         WHERE att.submission_id=?1 AND att.status<>'deleted' AND (
           (?2 IN ('in_progress','returned') AND att.revision_id IS NULL)
           OR (?2 NOT IN ('in_progress','returned') AND att.revision_id=(
             SELECT rev.id FROM learning_submission_revisions rev
             WHERE rev.submission_id=?1 AND rev.revision_no=?3 LIMIT 1
           ))
         ) ORDER BY att.created_at`,
        [submission.id,submission.status,Number(submission.current_revision_no||0)]
      )
    ]);
    return {
      ...assignment,
      work,
      submission:{...submission,answers:Object.fromEntries(answers.map((item)=>[item.block_id,json(item.answer_json,null)])),attachments}
    };
  }

  async startSubmission(submission,actorId) {
    const existing = await this.first(
      "SELECT * FROM learning_submissions WHERE assignment_id=?1 AND student_id=?2",
      [submission.assignment_id,submission.student_id]
    );
    if (existing) return existing;
    await this.batch([
      this.stmt(
        `INSERT INTO learning_submissions
         (id,assignment_id,student_id,status,draft_revision,current_revision_no,auto_score,
          manual_score,final_score,grade,created_at,started_at,submitted_at,reviewed_at,
          accepted_at,grade_published_at,updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)`,
        [submission.id,submission.assignment_id,submission.student_id,submission.status,
          submission.draft_revision,submission.current_revision_no,submission.auto_score,
          submission.manual_score,submission.final_score,submission.grade||"",submission.created_at,
          submission.started_at,submission.submitted_at,submission.reviewed_at,
          submission.accepted_at,submission.grade_published_at,submission.updated_at]
      ),
      this.auditStatement(actorId,"submission.started","submission",submission.id,{},submission.created_at)
    ]);
    return this.first("SELECT * FROM learning_submissions WHERE id=?1",[submission.id]);
  }

  async getSubmission(submissionId) {
    const submission = await this.first("SELECT * FROM learning_submissions WHERE id=?1",[submissionId]);
    if (!submission) return null;
    const answers = await this.all(
      "SELECT block_id,answer_json FROM learning_draft_answers WHERE submission_id=?1",[submissionId]
    );
    return {...submission,answers:Object.fromEntries(answers.map((item)=>[item.block_id,json(item.answer_json,null)]))};
  }

  async saveDraftAnswer({submissionId,studentId,blockId,answer,expectedRevision,updatedAt}) {
    const current = await this.first("SELECT * FROM learning_submissions WHERE id=?1 AND student_id=?2",[submissionId,studentId]);
    if (!current) throw new LearningError("Сдача не найдена.",404,"submission_not_found");
    if (!["in_progress","returned"].includes(current.status)) {
      throw new LearningError("Эта версия уже отправлена и недоступна для изменения.",409,"submission_locked");
    }
    if (Number(current.draft_revision)!==Number(expectedRevision)) {
      throw new LearningError("Черновик изменён в другой вкладке.",409,"revision_conflict",{currentRevision:Number(current.draft_revision)});
    }
    const nextRevision = Number(expectedRevision) + 1;
    const claimToken = `draft_${cryptoRandomId()}`;
    const results = await this.batch([
      this.stmt(
        `UPDATE learning_submissions SET status='in_progress',draft_revision=draft_revision+1,updated_at=?4
         WHERE id=?1 AND student_id=?2 AND draft_revision=?3 AND status IN ('in_progress','returned')`,
        [submissionId,studentId,Number(expectedRevision),claimToken]
      ),
      this.stmt(
        `INSERT INTO learning_draft_answers
         (submission_id,block_id,answer_json,revision_no,updated_by,updated_at)
         SELECT ?1,?2,?3,?4,?5,?6 WHERE EXISTS (
           SELECT 1 FROM learning_submissions WHERE id=?1 AND student_id=?5
           AND draft_revision=?4 AND updated_at=?7 AND status='in_progress')
         ON CONFLICT(submission_id,block_id) DO UPDATE SET
           answer_json=excluded.answer_json,revision_no=excluded.revision_no,
           updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
        [submissionId,blockId,JSON.stringify(answer),nextRevision,studentId,updatedAt,claimToken]
      ),
      this.stmt(
        `UPDATE learning_submissions SET updated_at=?3
         WHERE id=?1 AND student_id=?2 AND draft_revision=?4 AND updated_at=?5 AND status='in_progress'`,
        [submissionId,studentId,updatedAt,nextRevision,claimToken]
      )
    ]);
    if (!Number(results[0]?.meta?.changes||0)) {
      const latest = await this.first(
        "SELECT * FROM learning_submissions WHERE id=?1 AND student_id=?2",
        [submissionId,studentId]
      );
      if (!latest) throw new LearningError("Сдача не найдена.",404,"submission_not_found");
      if (!["in_progress","returned"].includes(latest.status)) {
        throw new LearningError("Эта версия уже отправлена и недоступна для изменения.",409,"submission_locked");
      }
      throw new LearningError("Черновик изменён в другой вкладке.",409,"revision_conflict",{currentRevision:Number(latest?.draft_revision||0)});
    }
    return {submission:await this.first("SELECT * FROM learning_submissions WHERE id=?1",[submissionId]),answer};
  }

  async submitRevision({submissionId,studentId,revision,answers,scores,submittedAt,expectedRevision,idempotencyKey}) {
    const requestHash = submitRequestHash(submissionId,studentId);
    const cachedResponse = await this.completedSubmitResponse(
      idempotencyKey,
      studentId,
      requestHash
    );
    if (cachedResponse) return cachedResponse;
    const submission = await this.first(
      `SELECT sub.*,a.max_attempts,
       (SELECT COUNT(*) FROM learning_submission_revisions rev
        WHERE rev.submission_id=sub.id) AS attempts_used
       FROM learning_submissions sub
       INNER JOIN learning_assignments a ON a.id=sub.assignment_id
       WHERE sub.id=?1 AND sub.student_id=?2`,
      [submissionId,studentId]
    );
    if (!submission) throw new LearningError("Сдача не найдена.",404,"submission_not_found");
    if (!["in_progress","returned"].includes(submission.status)) {
      throw new LearningError("Работа уже отправлена.",409,"already_submitted");
    }
    const maxAttempts = Math.max(1,Number(submission.max_attempts)||1);
    const attemptsUsed = Math.max(0,Number(submission.attempts_used)||0);
    if (attemptsUsed>=maxAttempts) {
      throw maxAttemptsExceeded(maxAttempts,attemptsUsed);
    }
    const revisionNo = Number(revision.version_no || revision.revision_no || submission.current_revision_no + 1);
    const previousRevisionNo = revisionNo - 1;
    const expectedDraftRevision = Number(expectedRevision);
    const claimToken = `submit_${revision.id}`;
    const sealedRevision = {...revision,revision_no:revisionNo,version_no:revisionNo,state:"sealed"};
    const projectedSubmission = {
      ...submission,status:"submitted",current_revision_no:revisionNo,
      auto_score:Number(revision.auto_score||0),submitted_at:submittedAt,updated_at:submittedAt
    };
    const resultPayload = {submission:projectedSubmission,revision:sealedRevision};
    const statements = [
      this.stmt(
        `UPDATE learning_submissions SET status='submitted',current_revision_no=?3,auto_score=?4,
         submitted_at=?5,updated_at=?6
         WHERE id=?1 AND student_id=?2 AND status IN ('in_progress','returned')
           AND draft_revision=?7 AND current_revision_no=?8`,
        [submissionId,studentId,revisionNo,Number(revision.auto_score||0),submittedAt,
          claimToken,expectedDraftRevision,previousRevisionNo]
      ),
      this.stmt(
        `INSERT INTO learning_submission_revisions
         (id,submission_id,revision_no,work_version_id,state,submitted_by,auto_score,max_score,
          submitted_at,sealed_at,created_at)
         SELECT ?1,?2,?3,?4,'building',?5,?6,?7,?8,NULL,?9
         FROM learning_submissions AS claimed
         WHERE claimed.id=?2 AND claimed.student_id=?5
           AND claimed.status='submitted' AND claimed.updated_at=?10`,
        [revision.id,submissionId,revisionNo,revision.work_version_id,studentId,
          Number(revision.auto_score||0),Number(revision.max_score||0),submittedAt,
          revision.created_at||submittedAt,claimToken]
      ),
      ...Object.entries(answers).map(([blockId,value])=>this.stmt(
        `INSERT INTO learning_revision_answers
         (revision_id,block_id,answer_json,auto_score,max_score,feedback_json,created_at)
         SELECT ?1,?2,?3,?4,?5,?6,?7 WHERE EXISTS (
           SELECT 1 FROM learning_submission_revisions
           WHERE id=?1 AND submission_id=?8 AND state='building'
         )`,
        [revision.id,blockId,JSON.stringify(value),Number(scores[blockId]?.score||0),
          Number(scores[blockId]?.maxScore||0),JSON.stringify(scores[blockId]?.feedback||[]),
          submittedAt,submissionId]
      )),
      this.stmt(
        `UPDATE learning_attachments SET revision_id=?2,updated_at=?3
         WHERE submission_id=?1 AND status='ready' AND revision_id IS NULL
           AND EXISTS (SELECT 1 FROM learning_submission_revisions
             WHERE id=?2 AND submission_id=?1 AND state='building')`,
        [submissionId,revision.id,submittedAt]
      ),
      this.stmt("UPDATE learning_submission_revisions SET state='sealed',sealed_at=?2 WHERE id=?1 AND state='building'",[revision.id,submittedAt]),
      this.stmt(
        `INSERT INTO learning_grade_events
         (id,submission_id,revision_id,review_id,actor_id,event_type,auto_score,manual_score,final_score,comment,created_at)
         SELECT ?1,?2,?3,NULL,?4,'auto_scored',?5,NULL,NULL,'',?6 WHERE EXISTS (
           SELECT 1 FROM learning_submission_revisions
           WHERE id=?3 AND submission_id=?2 AND state='sealed'
         )`,
        [`grade_${cryptoRandomId()}`,submissionId,revision.id,studentId,Number(revision.auto_score||0),submittedAt]
      ),
      this.stmt(
        `INSERT INTO learning_audit_events
         (id,actor_id,action,entity_type,entity_id,payload_json,created_at)
         SELECT ?1,?2,'submission.submitted','submission',?3,?4,?5 WHERE EXISTS (
           SELECT 1 FROM learning_submission_revisions
           WHERE id=?6 AND submission_id=?3 AND state='sealed'
         )`,
        [`audit_${cryptoRandomId()}`,studentId,submissionId,
          JSON.stringify({versionNo:revisionNo}),submittedAt,revision.id]
      )
    ];
    if (idempotencyKey) {
      const expiresAt = new Date(Date.parse(submittedAt)+24*60*60*1000).toISOString();
      statements.push(this.stmt(
        `INSERT INTO learning_idempotency_keys
         (id,scope,idempotency_key,actor_id,request_hash,status,response_status,response_json,created_at,updated_at,expires_at)
         SELECT ?1,'submission.submit',?2,?3,?4,'completed',200,?5,?6,?6,?7 WHERE EXISTS (
           SELECT 1 FROM learning_submission_revisions
           WHERE id=?8 AND submission_id=?9 AND state='sealed'
         )`,
        [`idem_${cryptoRandomId()}`,idempotencyKey,studentId,requestHash,
          JSON.stringify(resultPayload),submittedAt,expiresAt,revision.id,submissionId]
      ));
    }
    statements.push(this.stmt(
      `UPDATE learning_submissions SET updated_at=?4
       WHERE id=?1 AND student_id=?2 AND status='submitted' AND updated_at=?3`,
      [submissionId,studentId,claimToken,submittedAt]
    ));
    let results;
    try {
      results = await this.batch(statements);
    } catch (error) {
      if (/learning attachment integrity violation/i.test(String(error?.message))) {
        throw new LearningError(
          "Приложенный файл не прошёл проверку перед отправкой.",
          422,
          "attachment_integrity_failed"
        );
      }
      if (/learning max attempts exceeded/i.test(String(error?.message))) {
        const latest = await this.first(
          `SELECT a.max_attempts,COUNT(rev.id) AS attempts_used
           FROM learning_submissions sub
           INNER JOIN learning_assignments a ON a.id=sub.assignment_id
           LEFT JOIN learning_submission_revisions rev ON rev.submission_id=sub.id
           WHERE sub.id=?1 AND sub.student_id=?2
           GROUP BY a.max_attempts`,
          [submissionId,studentId]
        );
        throw maxAttemptsExceeded(latest?.max_attempts,latest?.attempts_used);
      }
      if (idempotencyKey && /unique|constraint/i.test(String(error?.message))) {
        const concurrentResponse = await this.completedSubmitResponse(
          idempotencyKey,
          studentId,
          requestHash
        );
        if (concurrentResponse) return concurrentResponse;
      }
      if (/unique|constraint/i.test(String(error?.message))) {
        throw new LearningError(
          "Состояние работы изменилось во время отправки. Обновите страницу.",
          409,
          "submission_conflict"
        );
      }
      throw error;
    }
    if (!Number(results[0]?.meta?.changes||0)) {
      const concurrentResponse = await this.completedSubmitResponse(
        idempotencyKey,
        studentId,
        requestHash
      );
      if (concurrentResponse) return concurrentResponse;
      const latest = await this.first(
        `SELECT sub.*,a.max_attempts,
         (SELECT COUNT(*) FROM learning_submission_revisions rev
          WHERE rev.submission_id=sub.id) AS attempts_used
         FROM learning_submissions sub
         INNER JOIN learning_assignments a ON a.id=sub.assignment_id
         WHERE sub.id=?1 AND sub.student_id=?2`,
        [submissionId,studentId]
      );
      if (!latest) throw new LearningError("Сдача не найдена.",404,"submission_not_found");
      const latestMaxAttempts = Math.max(1,Number(latest.max_attempts)||1);
      const latestAttemptsUsed = Math.max(0,Number(latest.attempts_used)||0);
      if (latestAttemptsUsed>=latestMaxAttempts) {
        throw maxAttemptsExceeded(latestMaxAttempts,latestAttemptsUsed);
      }
      if (Number(latest.draft_revision)!==expectedDraftRevision) {
        throw new LearningError("Черновик изменён в другой вкладке.",409,"revision_conflict",{
          currentRevision:Number(latest.draft_revision||0)
        });
      }
      if (!["in_progress","returned"].includes(latest.status)) {
        throw new LearningError("Работа уже отправлена.",409,"already_submitted");
      }
      throw new LearningError(
        "Состояние работы изменилось во время отправки. Обновите страницу.",
        409,
        "submission_conflict"
      );
    }
    return {submission:await this.first("SELECT * FROM learning_submissions WHERE id=?1",[submissionId]),revision:sealedRevision};
  }

  async listSubmissionsForTeacher(teacherId,filters={}) {
    const values = [teacherId];
    let statusClause = "";
    if (filters.status) {
      values.push(filters.status);
      statusClause = `AND sub.status=?${values.length}`;
    }
    const rows = await this.all(
      `SELECT sub.*,u.display_name AS student_name,u.login AS student_login,
       a.title AS assignment_title,a.due_at,a.work_version_id,a.course_id,
       v.title AS work_title,v.max_score AS work_max_score,t.activity_kind,
       c.name AS course_name,s.name AS subject_name,
       (SELECT g.name FROM learning_assignment_recipients ar
        INNER JOIN learning_groups g ON g.id=ar.source_group_id
        WHERE ar.assignment_id=a.id AND ar.user_id=sub.student_id AND ar.status='active'
        LIMIT 1) AS group_name
       FROM learning_submissions sub
       INNER JOIN learning_assignments a ON a.id=sub.assignment_id
       INNER JOIN learning_users u ON u.id=sub.student_id
       INNER JOIN learning_work_versions v ON v.id=a.work_version_id
       INNER JOIN learning_work_templates t ON t.id=v.template_id
       INNER JOIN learning_courses c ON c.id=a.course_id
       INNER JOIN learning_subjects s ON s.id=c.subject_id
       WHERE a.created_by=?1 ${statusClause}
       ORDER BY COALESCE(sub.submitted_at,sub.updated_at) DESC`,values
    );
    return rows.map((row)=>({
      ...row,
      student:{id:row.student_id,display_name:row.student_name,login:row.student_login},
      assignment:{
        id:row.assignment_id,title:row.assignment_title,due_at:row.due_at,
        version:{id:row.work_version_id,title:row.work_title,max_score:row.work_max_score,activity_kind:row.activity_kind},
        course:{id:row.course_id,name:row.course_name},subject:{name:row.subject_name},
        group:row.group_name?{name:row.group_name}:null
      }
    }));
  }

  async getSubmissionForTeacher(submissionId,teacherId) {
    const row = await this.first(
      `SELECT sub.*,u.display_name AS student_name,u.login AS student_login,
       a.title AS assignment_title,a.due_at,a.work_version_id,a.course_id,a.created_by,
       c.name AS course_name,s.name AS subject_name
       FROM learning_submissions sub
       INNER JOIN learning_assignments a ON a.id=sub.assignment_id
       INNER JOIN learning_users u ON u.id=sub.student_id
       INNER JOIN learning_courses c ON c.id=a.course_id
       INNER JOIN learning_subjects s ON s.id=c.subject_id
       WHERE sub.id=?1 AND a.created_by=?2`,[submissionId,teacherId]
    );
    if (!row) return null;
    const [work,revisionRows,attachments,reviews,rubricScores] = await Promise.all([
      this.getWorkVersion(row.work_version_id,true),
      this.all("SELECT * FROM learning_submission_revisions WHERE submission_id=?1 ORDER BY revision_no",[submissionId]),
      this.all("SELECT * FROM learning_attachments WHERE submission_id=?1 AND status<>'deleted' ORDER BY created_at",[submissionId]),
      this.all("SELECT * FROM learning_reviews WHERE submission_id=?1 ORDER BY created_at",[submissionId]),
      this.all(
        `SELECT rs.* FROM learning_rubric_scores rs
         INNER JOIN learning_reviews r ON r.id=rs.review_id WHERE r.submission_id=?1`,[submissionId]
      )
    ]);
    const revisions=[];
    for (const revision of revisionRows) {
      const answerRows=await this.all("SELECT * FROM learning_revision_answers WHERE revision_id=?1",[revision.id]);
      revisions.push({
        ...revision,version_no:Number(revision.revision_no),
        answers:Object.fromEntries(answerRows.map((item)=>[item.block_id,{
          value:json(item.answer_json,null),autoScore:item.auto_score,maxScore:item.max_score,
          feedback:json(item.feedback_json,[])
        }]))
      });
    }
    return {
      ...row,
      current_revision_id:revisions.at(-1)?.id||null,
      student:{id:row.student_id,display_name:row.student_name,login:row.student_login},
      assignment:{id:row.assignment_id,title:row.assignment_title,due_at:row.due_at,
        work_version_id:row.work_version_id,course:{id:row.course_id,name:row.course_name},subject:{name:row.subject_name}},
      work,revisions,attachments,reviews,rubricScores
    };
  }

  async returnSubmission({submissionId,teacherId,review,returnedAt}) {
    const submission=await this.first(
      `SELECT sub.* FROM learning_submissions sub INNER JOIN learning_assignments a ON a.id=sub.assignment_id
       WHERE sub.id=?1 AND a.created_by=?2`,[submissionId,teacherId]
    );
    if (!submission) throw new LearningError("Сдача не найдена.",404,"submission_not_found");
    if (!["submitted","under_review"].includes(submission.status)) {
      throw new LearningError("Работу нельзя вернуть из текущего состояния.",409,"invalid_transition");
    }
    const claimToken=`return_${cryptoRandomId()}`;
    const results=await this.batch([
      this.stmt(
        `UPDATE learning_submissions SET status='returned',reviewed_at=?4,updated_at=?5
         WHERE id=?1 AND status IN ('submitted','under_review')
           AND EXISTS (SELECT 1 FROM learning_assignments
             WHERE id=learning_submissions.assignment_id AND created_by=?2)
           AND EXISTS (SELECT 1 FROM learning_submission_revisions
             WHERE id=?3 AND submission_id=?1 AND revision_no=learning_submissions.current_revision_no
               AND state='sealed')
           AND NOT EXISTS (SELECT 1 FROM learning_reviews
             WHERE revision_id=?3 AND status<>'draft')`,
        [submissionId,teacherId,review.revision_id,returnedAt,claimToken]
      ),
      this.stmt(
        `INSERT INTO learning_reviews
         (id,submission_id,revision_id,reviewer_id,status,summary_comment,created_at,updated_at,completed_at)
         SELECT ?1,?2,?3,?4,'returned',?5,?6,?6,?6 WHERE EXISTS (
           SELECT 1 FROM learning_submissions
           WHERE id=?2 AND status='returned' AND updated_at=?7
         )
         ON CONFLICT(revision_id) DO UPDATE SET
           reviewer_id=excluded.reviewer_id,status='returned',
           summary_comment=excluded.summary_comment,updated_at=excluded.updated_at,
           completed_at=excluded.completed_at
         WHERE learning_reviews.status='draft'`,
        [review.id,submissionId,review.revision_id,teacherId,
          review.summary_comment||review.comment||"",returnedAt,claimToken]
      ),
      this.stmt(
        `INSERT INTO learning_grade_events
         (id,submission_id,revision_id,review_id,actor_id,event_type,auto_score,manual_score,final_score,comment,created_at)
         SELECT ?1,?2,?3,r.id,?4,'returned',?5,NULL,NULL,?6,?7
         FROM learning_reviews AS r
         WHERE r.revision_id=?3 AND r.submission_id=?2 AND r.status='returned'
           AND EXISTS (SELECT 1 FROM learning_submissions
             WHERE id=?2 AND status='returned' AND updated_at=?8)`,
        [`grade_${cryptoRandomId()}`,submissionId,review.revision_id,teacherId,
          submission.auto_score,review.summary_comment||review.comment||"",returnedAt,claimToken]
      ),
      this.stmt(
        `INSERT INTO learning_audit_events
         (id,actor_id,action,entity_type,entity_id,payload_json,created_at)
         SELECT ?1,?2,'submission.returned','submission',?3,?4,?5 WHERE EXISTS (
           SELECT 1 FROM learning_submissions
           WHERE id=?3 AND status='returned' AND updated_at=?6
         )`,
        [`audit_${cryptoRandomId()}`,teacherId,submissionId,
          JSON.stringify({comment:review.summary_comment||review.comment||""}),returnedAt,claimToken]
      ),
      this.stmt(
        `UPDATE learning_submissions SET updated_at=?3
         WHERE id=?1 AND status='returned' AND updated_at=?2`,
        [submissionId,claimToken,returnedAt]
      )
    ]);
    if (!Number(results[0]?.meta?.changes||0)) {
      const latest=await this.first(
        `SELECT sub.* FROM learning_submissions sub
         INNER JOIN learning_assignments a ON a.id=sub.assignment_id
         WHERE sub.id=?1 AND a.created_by=?2`,
        [submissionId,teacherId]
      );
      if (!latest) throw new LearningError("Сдача не найдена.",404,"submission_not_found");
      const completed=await this.first(
        "SELECT status FROM learning_reviews WHERE revision_id=?1 AND status<>'draft'",
        [review.revision_id]
      );
      if (completed) {
        throw new LearningError("Эта версия работы уже проверена.",409,"review_completed");
      }
      throw new LearningError("Работу нельзя вернуть из текущего состояния.",409,"invalid_transition");
    }
    return this.first("SELECT * FROM learning_submissions WHERE id=?1",[submissionId]);
  }

  async gradeSubmission({submissionId,teacherId,review,rubricScores,gradeEvent,acceptedAt}) {
    const submission=await this.first(
      `SELECT sub.* FROM learning_submissions sub INNER JOIN learning_assignments a ON a.id=sub.assignment_id
       WHERE sub.id=?1 AND a.created_by=?2`,[submissionId,teacherId]
    );
    if (!submission) throw new LearningError("Сдача не найдена.",404,"submission_not_found");
    if (!["submitted","under_review"].includes(submission.status)) {
      throw new LearningError("Работу нельзя оценить из текущего состояния.",409,"invalid_transition");
    }
    const existing=await this.first("SELECT * FROM learning_reviews WHERE revision_id=?1",[review.revision_id]);
    if (existing && existing.status!=="draft") {
      throw new LearningError("Эта версия работы уже проверена.",409,"review_completed");
    }
    const reviewId=existing?.id||review.id;
    const statements=[];
    if (existing) {
      statements.push(
        this.stmt("DELETE FROM learning_rubric_scores WHERE review_id=?1",[reviewId]),
        this.stmt("UPDATE learning_reviews SET summary_comment=?2,updated_at=?3 WHERE id=?1 AND status='draft'",[reviewId,review.summary_comment||"",acceptedAt])
      );
    } else {
      statements.push(this.stmt(
        `INSERT INTO learning_reviews
         (id,submission_id,revision_id,reviewer_id,status,summary_comment,created_at,updated_at,completed_at)
         VALUES (?1,?2,?3,?4,'draft',?5,?6,?6,NULL)`,
        [reviewId,submissionId,review.revision_id,teacherId,review.summary_comment||"",acceptedAt]
      ));
    }
    statements.push(...rubricScores.map((item)=>this.stmt(
      `INSERT INTO learning_rubric_scores
       (review_id,rubric_criterion_id,score,comment,created_at,updated_at)
       VALUES (?1,?2,?3,?4,?5,?6)`,
      [reviewId,item.rubric_criterion_id||item.criterion_id,Number(item.score),item.comment||"",item.created_at||acceptedAt,item.updated_at||acceptedAt]
    )));
    if (review.publish) {
      statements.push(this.stmt(
        "UPDATE learning_reviews SET status='accepted',completed_at=?2,updated_at=?2 WHERE id=?1 AND status='draft'",
        [reviewId,acceptedAt]
      ));
    }
    statements.push(
      this.stmt(
        `UPDATE learning_submissions SET status=?2,manual_score=?3,final_score=?4,grade=?5,
         reviewed_at=?6,accepted_at=?7,grade_published_at=?8,updated_at=?6 WHERE id=?1`,
        [submissionId,review.publish?"accepted":"under_review",Number(review.manual_score||0),
          Number(review.final_score||0),String(review.grade||""),acceptedAt,
          review.publish?acceptedAt:null,review.publish?acceptedAt:null]
      ),
      this.stmt(
        `INSERT INTO learning_grade_events
         (id,submission_id,revision_id,review_id,actor_id,event_type,auto_score,manual_score,final_score,comment,created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`,
        [gradeEvent.id,submissionId,review.revision_id,reviewId,teacherId,
          review.publish?"grade_published":"manual_scored",gradeEvent.auto_score,
          gradeEvent.manual_score,gradeEvent.final_score,gradeEvent.comment||"",gradeEvent.created_at||acceptedAt]
      ),
      this.auditStatement(teacherId,review.publish?"submission.accepted":"submission.graded","submission",submissionId,
        {finalScore:Number(review.final_score||0),grade:String(review.grade||"")},acceptedAt)
    );
    await this.batch(statements);
    return this.first("SELECT * FROM learning_submissions WHERE id=?1",[submissionId]);
  }

  async createAttachment(attachment,actorId) {
    await this.batch([
      this.stmt(
        `INSERT INTO learning_attachments
         (id,submission_id,revision_id,block_id,uploaded_by,object_key,original_name,mime_type,
          byte_size,sha256,storage_backend,status,created_at,updated_at,deleted_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)`,
        [attachment.id,attachment.submission_id,attachment.revision_id,attachment.block_id,
          attachment.uploaded_by,attachment.object_key,attachment.original_name,attachment.mime_type,
          attachment.byte_size??attachment.byte_length,attachment.sha256,attachment.storage_backend,
          attachment.status,attachment.created_at,attachment.updated_at,attachment.deleted_at]
      ),
      this.auditStatement(actorId,"attachment.created","attachment",attachment.id,{submissionId:attachment.submission_id},attachment.created_at)
    ]);
    return this.getAttachment(attachment.id);
  }

  async getAttachment(attachmentId) {
    return this.first("SELECT * FROM learning_attachments WHERE id=?1",[attachmentId]);
  }

  async finalizeAttachment(attachmentId,patch,actorId) {
    const updatedAt=patch.updated_at||new Date().toISOString();
    const result=await this.run(
      `UPDATE learning_attachments SET status=?2,storage_backend=?3,sha256=?4,byte_size=?5,updated_at=?6
       WHERE id=?1 AND status='pending'`,
      [attachmentId,patch.status||"ready",patch.storage_backend||"file",patch.sha256,
        patch.byte_size??patch.byte_length,updatedAt]
    );
    if (!Number(result.meta?.changes||0)) throw new LearningError("Файл не найден или уже обработан.",409,"attachment_not_pending");
    await this.batch([this.auditStatement(actorId,"attachment.ready","attachment",attachmentId,{byteLength:patch.byte_size??patch.byte_length},updatedAt)]);
    return this.getAttachment(attachmentId);
  }

  async deleteAttachment(attachmentId,actorId,deletedAt) {
    const result=await this.run(
      "UPDATE learning_attachments SET status='deleted',deleted_at=?2,updated_at=?2 WHERE id=?1 AND status<>'deleted'",
      [attachmentId,deletedAt]
    );
    if (!Number(result.meta?.changes||0)) throw new LearningError("Файл не найден.",404,"attachment_not_found");
    await this.batch([this.auditStatement(actorId,"attachment.deleted","attachment",attachmentId,{},deletedAt)]);
    return this.getAttachment(attachmentId);
  }

  async listAuditEvents(limit=500) {
    return this.all(
      `SELECT * FROM learning_audit_events ORDER BY created_at DESC LIMIT ?1`,
      [Math.max(1,Math.min(2000,Number(limit)||500))]
    );
  }

  async getJournal(teacherId) {
    const rows=await this.all(
      `SELECT a.id AS assignment_id,a.title AS assignment_title,a.due_at,
       t.activity_kind,s.name AS subject_name,g.name AS group_name,
       u.id AS student_id,u.display_name AS student_name,
       sub.status,sub.submitted_at,sub.final_score,sub.grade,
       sub.reviewed_at,sub.accepted_at,sub.grade_published_at
       FROM learning_assignment_recipients ar
       INNER JOIN learning_assignments a ON a.id=ar.assignment_id
       INNER JOIN learning_users u ON u.id=ar.user_id
       INNER JOIN learning_work_versions v ON v.id=a.work_version_id
       INNER JOIN learning_work_templates t ON t.id=v.template_id
       INNER JOIN learning_courses c ON c.id=a.course_id
       INNER JOIN learning_subjects s ON s.id=c.subject_id
       LEFT JOIN learning_groups g ON g.id=ar.source_group_id
       LEFT JOIN learning_submissions sub ON sub.assignment_id=a.id AND sub.student_id=ar.user_id
       WHERE a.created_by=?1 AND ar.status='active'
       ORDER BY g.name,u.display_name,a.due_at`,[teacherId]
    );
    return rows.map((row)=>({
      assignmentId:row.assignment_id,assignmentTitle:row.assignment_title,kind:row.activity_kind,
      subject:row.subject_name,group:row.group_name||"",studentId:row.student_id,
      studentName:row.student_name,status:row.status||"not_started",dueAt:row.due_at,
      submittedAt:row.submitted_at||"",finalScore:row.final_score??null,grade:row.grade||"",
      gradedAt:row.grade_published_at||row.accepted_at||row.reviewed_at||""
    }));
  }
}

function cryptoRandomId() {
  return crypto.randomUUID();
}

module.exports = {
  D1LearningRepository
};
