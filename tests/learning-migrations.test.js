const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "migrations");
const migrationNames = [
  "0001_cloudflare_initial.sql",
  "0002_cloudflare_voice_d1_fallback.sql",
  "0003_learning_identity_catalog.sql",
  "0004_learning_works.sql",
  "0005_learning_submissions.sql"
];
const now = "2026-09-01T00:00:00.000Z";

function createDatabase(t) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "learning-migrations-"));
  const databasePath = path.join(tempDir, "learning.sqlite");
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON;");
  t.after(() => {
    database.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  return database;
}

function applyMigration(database, migrationName) {
  const migrationPath = path.join(migrationsDir, migrationName);
  const sql = fs.readFileSync(migrationPath, "utf8");
  database.exec("BEGIN IMMEDIATE;");
  try {
    database.exec(sql);
    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    error.message = `${migrationName}: ${error.message}`;
    throw error;
  }
}

function applyAllMigrations(database) {
  migrationNames.forEach((migrationName) => applyMigration(database, migrationName));
}

function tableColumns(database, tableName) {
  return new Set(
    database
      .prepare(`PRAGMA table_info("${tableName}")`)
      .all()
      .map((row) => row.name)
  );
}

function assertColumns(database, tableName, expectedColumns) {
  const actual = tableColumns(database, tableName);
  expectedColumns.forEach((columnName) => {
    assert.equal(actual.has(columnName), true, `${tableName}.${columnName} must exist`);
  });
}

function insertCatalogFixture(database) {
  const insertUser = database.prepare(
    `INSERT INTO learning_users
      (id, login, display_name, status, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, ?)`
  );
  insertUser.run("teacher-1", "teacher.pilot", "Преподаватель пилота", now, now);
  insertUser.run("student-1", "student.001", "Студент 001", now, now);

  database
    .prepare(
      `INSERT INTO learning_credentials
        (user_id, password_hash, password_salt, password_iterations, must_change_password, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run("teacher-1", "test-hash", "test-salt", 1000, 0, now);
  database
    .prepare(
      `INSERT INTO learning_credentials
        (user_id, password_hash, password_salt, password_iterations, must_change_password, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run("student-1", "test-hash", "test-salt", 1000, 1, now);

  database
    .prepare("INSERT INTO learning_user_roles (user_id, role) VALUES (?, ?)")
    .run("teacher-1", "teacher");
  database
    .prepare("INSERT INTO learning_user_roles (user_id, role) VALUES (?, ?)")
    .run("student-1", "student");

  database
    .prepare(
      `INSERT INTO learning_sessions
        (token_hash, user_id, csrf_token, expires_at, revoked_at, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`
    )
    .run("token-hash-1", "teacher-1", "csrf-token-1", "2026-09-02T00:00:00.000Z", now, now);

  database
    .prepare(
      `INSERT INTO learning_groups
        (id, code, name, status, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, ?)`
    )
    .run("group-1", "ПИЛОТ-01", "Пилотная группа 01", now, now);
  database
    .prepare(
      `INSERT INTO learning_memberships
        (group_id, user_id, status, joined_at, left_at)
       VALUES (?, ?, 'active', ?, NULL)`
    )
    .run("group-1", "student-1", now);

  database
    .prepare(
      `INSERT INTO learning_subjects
        (id, code, name, status, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, ?)`
    )
    .run("subject-1", "PILOT-SUBJECT", "Пилотная дисциплина", now, now);
  database
    .prepare(
      `INSERT INTO learning_courses
        (id, subject_id, academic_year, name, status, config_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', '{}', ?, ?)`
    )
    .run("course-1", "subject-1", "2026/2027", "Пилотный курс", now, now);
  database
    .prepare(
      `INSERT INTO learning_course_groups
        (course_id, group_id, status, created_at)
       VALUES (?, ?, 'active', ?)`
    )
    .run("course-1", "group-1", now);
  database
    .prepare(
      `INSERT INTO learning_course_teachers
        (course_id, user_id, status, created_at)
       VALUES (?, ?, 'active', ?)`
    )
    .run("course-1", "teacher-1", now);
  database
    .prepare(
      `INSERT INTO learning_topics
        (id, course_id, sequence_no, title, activity_kind, planned_hours, status, config_json, created_at, updated_at)
       VALUES (?, ?, 1, ?, 'practice', 2, 'active', '{}', ?, ?)`
    )
    .run("topic-1", "course-1", "Пилотная тема", now, now);
}

function insertPublishedWorkFixture(database) {
  database
    .prepare(
      `INSERT INTO learning_work_templates
        (id, course_id, topic_id, created_by, title, activity_kind, status, config_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'practice', 'active', '{}', ?, ?)`
    )
    .run("template-1", "course-1", "topic-1", "teacher-1", "Пилотная работа", now, now);
  database
    .prepare(
      `INSERT INTO learning_work_versions
        (id, template_id, version_no, status, schema_version, title, topic, instructions,
         content_json, public_rubric_json, private_key_json, max_score,
         created_by, created_at, updated_at, published_at)
       VALUES (?, ?, 1, 'draft', 1, ?, ?, ?, ?, ?, ?, 10, ?, ?, ?, NULL)`
    )
    .run(
      "version-1",
      "template-1",
      "Пилотная работа",
      "Пилотная тема",
      "Выполните задание.",
      JSON.stringify({ schemaVersion: 1, blocks: [{ id: "block-1", type: "single_choice" }] }),
      JSON.stringify({ criteria: [{ id: "criterion-1", title: "Результат" }] }),
      JSON.stringify({ "block-1": { acceptedAnswers: ["A"] } }),
      "teacher-1",
      now,
      now
    );
  database
    .prepare(
      `INSERT INTO learning_work_blocks
        (id, version_id, position, block_type, title, prompt, required, max_score, config_json, created_at, updated_at)
       VALUES (?, ?, 0, 'single_choice', ?, ?, 1, 10, ?, ?, ?)`
    )
    .run(
      "block-1",
      "version-1",
      "Вопрос",
      "Выберите вариант.",
      JSON.stringify({ options: ["A", "B"] }),
      now,
      now
    );
  database
    .prepare(
      `INSERT INTO learning_work_keys
        (id, version_id, block_id, key_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run("key-1", "version-1", "block-1", JSON.stringify({ acceptedAnswers: ["A"] }), now, now);
  database
    .prepare(
      `INSERT INTO learning_rubric_criteria
        (id, version_id, position, title, description, max_score, config_json, created_at, updated_at)
       VALUES (?, ?, 0, ?, '', 10, '{}', ?, ?)`
    )
    .run("criterion-1", "version-1", "Результат", now, now);

  database
    .prepare(
      `UPDATE learning_work_versions
       SET status = 'published', published_at = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(now, now, "version-1");

  database
    .prepare(
      `INSERT INTO learning_assignments
        (id, course_id, work_version_id, created_by, title, status,
         available_from, due_at, allow_late, max_attempts, config_json,
         created_at, updated_at, published_at, closed_at)
       VALUES (?, ?, ?, ?, ?, 'published', ?, ?, 0, 3, '{}', ?, ?, ?, NULL)`
    )
    .run(
      "assignment-1",
      "course-1",
      "version-1",
      "teacher-1",
      "Пилотное назначение",
      now,
      "2026-09-10T20:59:59.000Z",
      now,
      now,
      now
    );
  database
    .prepare(
      `INSERT INTO learning_assignment_groups (assignment_id, group_id, created_at)
       VALUES (?, ?, ?)`
    )
    .run("assignment-1", "group-1", now);
  database
    .prepare(
      `INSERT INTO learning_assignment_recipients
        (assignment_id, user_id, source_group_id, status, assigned_at)
       VALUES (?, ?, ?, 'active', ?)`
    )
    .run("assignment-1", "student-1", "group-1", now);
}

test("learning migrations apply to SQLite, preserve legacy rows, and expose the repository contract", (t) => {
  const database = createDatabase(t);

  applyMigration(database, migrationNames[0]);
  applyMigration(database, migrationNames[1]);
  database
    .prepare("INSERT INTO attempts (id, payload_json, updated_at) VALUES (?, ?, ?)")
    .run("legacy-attempt", JSON.stringify({ id: "legacy-attempt", status: "finished" }), now);

  migrationNames.slice(2).forEach((migrationName) => applyMigration(database, migrationName));

  const legacyAttempt = database
    .prepare("SELECT id, payload_json FROM attempts WHERE id = ?")
    .get("legacy-attempt");
  assert.equal(legacyAttempt.id, "legacy-attempt");
  assert.equal(
    legacyAttempt.payload_json,
    JSON.stringify({ id: "legacy-attempt", status: "finished" })
  );

  const expectedTables = [
    "learning_users",
    "learning_credentials",
    "learning_user_roles",
    "learning_sessions",
    "learning_login_limits",
    "learning_groups",
    "learning_memberships",
    "learning_subjects",
    "learning_courses",
    "learning_course_groups",
    "learning_course_teachers",
    "learning_topics",
    "learning_work_templates",
    "learning_work_versions",
    "learning_work_blocks",
    "learning_work_keys",
    "learning_rubric_criteria",
    "learning_assignments",
    "learning_assignment_groups",
    "learning_assignment_recipients",
    "learning_submissions",
    "learning_draft_answers",
    "learning_submission_revisions",
    "learning_revision_answers",
    "learning_reviews",
    "learning_rubric_scores",
    "learning_grade_events",
    "learning_attachments",
    "learning_audit_events",
    "learning_idempotency_keys",
    "learning_lesson_journal",
    "learning_delivery_outbox"
  ];
  const tableNames = new Set(
    database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name)
  );
  expectedTables.forEach((tableName) => {
    assert.equal(tableNames.has(tableName), true, `${tableName} must be created`);
  });

  assertColumns(database, "learning_users", [
    "id",
    "login",
    "display_name",
    "status",
    "created_at",
    "updated_at"
  ]);
  assertColumns(database, "learning_credentials", [
    "user_id",
    "password_hash",
    "password_salt",
    "password_iterations",
    "must_change_password",
    "updated_at"
  ]);
  assertColumns(database, "learning_sessions", [
    "token_hash",
    "user_id",
    "csrf_token",
    "expires_at",
    "revoked_at",
    "created_at",
    "last_seen_at"
  ]);
  assertColumns(database, "learning_work_versions", [
    "id",
    "template_id",
    "version_no",
    "status",
    "content_json",
    "public_rubric_json",
    "private_key_json",
    "published_at"
  ]);
  assertColumns(database, "learning_submissions", [
    "id",
    "assignment_id",
    "student_id",
    "status",
    "draft_revision",
    "current_revision_no",
    "auto_score",
    "manual_score",
    "final_score"
  ]);

  const indexNames = new Set(
    database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all()
      .map((row) => row.name)
  );
  [
    "ux_learning_users_login",
    "idx_learning_memberships_user_status",
    "idx_learning_courses_subject_year",
    "ux_learning_work_versions_single_draft",
    "idx_learning_assignments_course_status_due",
    "idx_learning_submissions_student_status",
    "idx_learning_reviews_queue",
    "idx_learning_audit_events_entity"
  ].forEach((indexName) => {
    assert.equal(indexNames.has(indexName), true, `${indexName} must be created`);
  });

  assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
});

test("identity constraints and published work immutability are enforced by the database", (t) => {
  const database = createDatabase(t);
  applyAllMigrations(database);
  insertCatalogFixture(database);

  assert.throws(
    () =>
      database
        .prepare(
          `INSERT INTO learning_users
            (id, login, display_name, status, created_at, updated_at)
           VALUES (?, ?, ?, 'active', ?, ?)`
        )
        .run("duplicate-login", "TEACHER.PILOT", "Дубликат", now, now),
    /UNIQUE constraint failed/
  );
  assert.throws(
    () =>
      database
        .prepare(
          `INSERT INTO learning_memberships
            (group_id, user_id, status, joined_at, left_at)
           VALUES ('missing-group', 'student-1', 'active', ?, NULL)`
        )
        .run(now),
    /FOREIGN KEY constraint failed/
  );

  insertPublishedWorkFixture(database);

  assert.throws(
    () =>
      database
        .prepare("UPDATE learning_work_versions SET title = ? WHERE id = ?")
        .run("Изменённый заголовок", "version-1"),
    /published learning work versions are immutable/
  );
  assert.throws(
    () => database.prepare("DELETE FROM learning_work_versions WHERE id = ?").run("version-1"),
    /published learning work versions are immutable/
  );
  assert.throws(
    () =>
      database
        .prepare("UPDATE learning_work_blocks SET prompt = ? WHERE id = ?")
        .run("Изменённый вопрос", "block-1"),
    /blocks of published learning work versions are immutable/
  );
  assert.throws(
    () =>
      database
        .prepare("UPDATE learning_work_keys SET key_json = ? WHERE id = ?")
        .run(JSON.stringify({ acceptedAnswers: ["B"] }), "key-1"),
    /keys of published learning work versions are immutable/
  );
  assert.throws(
    () =>
      database
        .prepare("DELETE FROM learning_rubric_criteria WHERE id = ?")
        .run("criterion-1"),
    /rubrics of published learning work versions are immutable/
  );

  database
    .prepare(
      `INSERT INTO learning_work_versions
        (id, template_id, version_no, status, schema_version, title, topic, instructions,
         content_json, public_rubric_json, private_key_json, max_score,
         created_by, created_at, updated_at, published_at)
       VALUES (?, ?, 2, 'draft', 1, ?, ?, '', ?, '{}', '{}', 0, ?, ?, ?, NULL)`
    )
    .run(
      "version-2",
      "template-1",
      "Вторая версия",
      "Пилотная тема",
      JSON.stringify({ schemaVersion: 1, blocks: [] }),
      "teacher-1",
      now,
      now
    );
  assert.throws(
    () =>
      database
        .prepare(
          `INSERT INTO learning_assignments
            (id, course_id, work_version_id, created_by, title, status,
             allow_late, max_attempts, config_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'draft', 0, 1, '{}', ?, ?)`
        )
        .run(
          "invalid-assignment",
          "course-1",
          "version-2",
          "teacher-1",
          "Нельзя назначить черновик",
          now,
          now
        ),
    /assignments require a published version/
  );
  assert.throws(
    () =>
      database
        .prepare(
          `UPDATE learning_work_versions
           SET status = 'published', published_at = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(now, now, "version-2"),
    /published learning work versions require at least one block/
  );

  assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
});

test("submission snapshots, completed reviews, grade events, and audit events are immutable", (t) => {
  const database = createDatabase(t);
  applyAllMigrations(database);
  insertCatalogFixture(database);
  insertPublishedWorkFixture(database);

  database
    .prepare(
      `INSERT INTO learning_submissions
        (id, assignment_id, student_id, status, draft_revision, current_revision_no,
         created_at, started_at, updated_at)
       VALUES (?, ?, ?, 'in_progress', 1, 0, ?, ?, ?)`
    )
    .run("submission-1", "assignment-1", "student-1", now, now, now);
  database
    .prepare(
      `INSERT INTO learning_draft_answers
        (submission_id, block_id, answer_json, revision_no, updated_by, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)`
    )
    .run("submission-1", "block-1", JSON.stringify({ value: "A" }), "student-1", now);
  database
    .prepare(
      `INSERT INTO learning_submission_revisions
        (id, submission_id, revision_no, work_version_id, state, submitted_by,
         auto_score, max_score, submitted_at, sealed_at, created_at)
       VALUES (?, ?, 1, ?, 'building', ?, 10, 10, ?, NULL, ?)`
    )
    .run("revision-1", "submission-1", "version-1", "student-1", now, now);
  database
    .prepare(
      `INSERT INTO learning_revision_answers
        (revision_id, block_id, answer_json, auto_score, max_score, feedback_json, created_at)
       VALUES (?, ?, ?, 10, 10, '{}', ?)`
    )
    .run("revision-1", "block-1", JSON.stringify({ value: "A" }), now);
  database
    .prepare(
      `UPDATE learning_submission_revisions
       SET state = 'sealed', sealed_at = ?
       WHERE id = ?`
    )
    .run(now, "revision-1");

  assert.throws(
    () =>
      database
        .prepare("UPDATE learning_submission_revisions SET auto_score = 0 WHERE id = ?")
        .run("revision-1"),
    /sealed submission revisions are immutable/
  );
  assert.throws(
    () =>
      database
        .prepare("UPDATE learning_revision_answers SET answer_json = ? WHERE revision_id = ? AND block_id = ?")
        .run(JSON.stringify({ value: "B" }), "revision-1", "block-1"),
    /answers of sealed submission revisions are immutable/
  );

  database
    .prepare(
      `INSERT INTO learning_reviews
        (id, submission_id, revision_id, reviewer_id, status, summary_comment,
         created_at, updated_at, completed_at)
       VALUES (?, ?, ?, ?, 'draft', '', ?, ?, NULL)`
    )
    .run("review-1", "submission-1", "revision-1", "teacher-1", now, now);
  database
    .prepare(
      `INSERT INTO learning_rubric_scores
        (review_id, rubric_criterion_id, score, comment, created_at, updated_at)
       VALUES (?, ?, 10, '', ?, ?)`
    )
    .run("review-1", "criterion-1", now, now);
  database
    .prepare(
      `UPDATE learning_reviews
       SET status = 'accepted', summary_comment = ?, completed_at = ?, updated_at = ?
       WHERE id = ?`
    )
    .run("Принято", now, now, "review-1");

  assert.throws(
    () =>
      database
        .prepare("UPDATE learning_reviews SET summary_comment = ? WHERE id = ?")
        .run("Изменено", "review-1"),
    /completed learning reviews are immutable/
  );
  assert.throws(
    () =>
      database
        .prepare("UPDATE learning_rubric_scores SET score = 0 WHERE review_id = ?")
        .run("review-1"),
    /rubric scores of completed reviews are immutable/
  );

  database
    .prepare(
      `INSERT INTO learning_grade_events
        (id, submission_id, revision_id, review_id, actor_id, event_type,
         auto_score, manual_score, final_score, comment, created_at)
       VALUES (?, ?, ?, ?, ?, 'accepted', 10, 0, 10, '', ?)`
    )
    .run("grade-event-1", "submission-1", "revision-1", "review-1", "teacher-1", now);
  database
    .prepare(
      `INSERT INTO learning_audit_events
        (id, actor_id, action, entity_type, entity_id, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, '{}', ?)`
    )
    .run("audit-event-1", "teacher-1", "submission.accepted", "submission", "submission-1", now);

  assert.throws(
    () =>
      database
        .prepare("UPDATE learning_grade_events SET comment = 'changed' WHERE id = ?")
        .run("grade-event-1"),
    /learning grade events are append-only/
  );
  assert.throws(
    () => database.prepare("DELETE FROM learning_audit_events WHERE id = ?").run("audit-event-1"),
    /learning audit events are append-only/
  );

  assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
});

test("learning migrations contain schema only and never seed personal data", () => {
  for (const migrationName of migrationNames.slice(2)) {
    const sql = fs.readFileSync(path.join(migrationsDir, migrationName), "utf8");
    assert.doesNotMatch(sql, /\bINSERT\s+INTO\b/i, `${migrationName} must not contain seed rows`);
  }
});
