"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const { LearningService } = require("../src/learning/service");
const { FileLearningRepository } = require("../src/learning/repositories/file");
const { D1LearningRepository } = require("../src/learning/repositories/d1");

const root = path.resolve(__dirname, "..");
const migrations = [
  "0001_cloudflare_initial.sql",
  "0002_cloudflare_voice_d1_fallback.sql",
  "0003_learning_identity_catalog.sql",
  "0004_learning_works.sql",
  "0005_learning_submissions.sql"
];

const correctTestAnswers = Object.freeze({
  "pz1-net": { cells: {
    "soup-potato:total": 2500, "soup-carrot:total": 500, "soup-onion:total": 375,
    "soup-cabbage:total": 1250, "soup-oil:total": 125, "soup-salt:total": 75,
    "puree-potato:total": 4800, "puree-milk:total": 900, "puree-butter:total": 300, "puree-salt:total": 60
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
});

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
    return { meta: { changes: Number(result.changes || 0) } };
  }
}

class SqliteD1Database {
  constructor(database) {
    this.database = database;
    this.batchQueue = Promise.resolve();
    this.batchBarrier = null;
  }

  prepare(sql) {
    return new SqliteD1Statement(this.database, sql);
  }

  armBatchBarrier(count = 2) {
    let release;
    const promise = new Promise((resolve) => {
      release = resolve;
    });
    this.batchBarrier = { remaining: count, promise, release };
  }

  executeBatch(statements) {
    this.database.exec("BEGIN IMMEDIATE;");
    try {
      const results = statements.map((statement) => {
        const result = this.database.prepare(statement.sql).run(...statement.values);
        return { meta: { changes: Number(result.changes || 0) } };
      });
      this.database.exec("COMMIT;");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
  }

  async batch(statements) {
    const barrier = this.batchBarrier;
    if (barrier) {
      barrier.remaining -= 1;
      if (barrier.remaining === 0) {
        this.batchBarrier = null;
        barrier.release();
      }
      await barrier.promise;
    }
    const operation = () => this.executeBatch(statements);
    const queued = this.batchQueue.then(operation, operation);
    this.batchQueue = queued.catch(() => {});
    return queued;
  }
}

async function createRepository(t, backend) {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), `learning-attempts-${backend}-`));
  if (backend === "file") {
    t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
    return new FileLearningRepository({ storageDir: directory }).init();
  }

  const database = new DatabaseSync(path.join(directory, "learning.sqlite"));
  database.exec("PRAGMA foreign_keys=ON;");
  migrations.forEach((name) => database.exec(fs.readFileSync(path.join(root, "migrations", name), "utf8")));
  t.after(() => {
    database.close();
    return fs.promises.rm(directory, { recursive: true, force: true });
  });
  return new D1LearningRepository(new SqliteD1Database(database)).init();
}

async function saveTestAnswers(service, student, submissionId, blockIds = new Map()) {
  let expectedRevision = 0;
  for (const [contentKey, value] of Object.entries(correctTestAnswers)) {
    const blockId = blockIds.get(contentKey) || contentKey;
    const saved = await service.saveAnswer(student, submissionId, blockId, { value, expectedRevision });
    expectedRevision = saved.draftRevision;
  }
  return expectedRevision;
}

for (const backend of ["file", "d1"]) {
  test(`${backend} repository strictly enforces assignment attempts without charging idempotent retries`, async (t) => {
    const repository = await createRepository(t, backend);
    const service = new LearningService(repository, {
      pepper: `attempts-${backend}`,
      passwordIterations: 10_000
    });
    const bootstrapSecret = `bootstrap-${backend}`;
    const teacherPassword = `Teacher${backend.toUpperCase()}2026`;
    await service.bootstrapAdmin({
      bootstrapSecret,
      login: `attempt-teacher-${backend}`,
      password: teacherPassword,
      displayName: `Преподаватель ${backend}`
    }, bootstrapSecret);
    const teacherLogin = await service.login({ login: `attempt-teacher-${backend}`, password: teacherPassword });
    const teacher = await service.authenticate(teacherLogin.token);
    const pilot = await service.seedPilot(teacher);

    const credentials = pilot.credentials[0];
    const temporaryLogin = await service.login({
      login: credentials.login,
      password: credentials.temporaryPassword
    });
    let student = await service.authenticate(temporaryLogin.token);
    const studentPassword = `Student${backend.toUpperCase()}2026`;
    await service.changePassword(student, {
      currentPassword: credentials.temporaryPassword,
      newPassword: studentPassword,
      confirmPassword: studentPassword
    });
    const studentLogin = await service.login({ login: credentials.login, password: studentPassword });
    student = await service.authenticate(studentLogin.token);

    const pilotTest = pilot.works[0];
    const original = (await service.listTeacherAssignments(teacher))
      .find((item) => item.id === pilotTest.assignmentId);
    const limitedAssignment = await service.createAssignment(teacher, {
      versionId: pilotTest.versionId,
      courseId: original.course_id,
      groupIds: [pilot.group.id],
      title: `Работа лимита попыток – ${backend}`,
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      allowLate: true,
      maxAttempts: 2
    });
    const limitedDefinition = await service.getStudentAssignment(student, limitedAssignment.id);
    const blockIds = new Map(limitedDefinition.work.blocks.map((block) => [block.contentKey || block.id, block.id]));
    const submission = await service.startSubmission(student, limitedAssignment.id);
    const expectedRevision = await saveTestAnswers(service, student, submission.id, blockIds);

    const first = await service.submit(student, submission.id, {
      expectedRevision,
      idempotencyKey: `attempt-${backend}-1`
    });
    const repeatedFirst = await service.submit(student, submission.id, {
      expectedRevision,
      idempotencyKey: `attempt-${backend}-1`
    });
    assert.equal(repeatedFirst.revision.id, first.revision.id);
    const draftReview = await service.gradeSubmission(teacher, submission.id, {
      rubricScores: [],
      comment: "Черновая проверка перед возвратом.",
      publish: false
    });
    assert.equal(draftReview.status, "under_review");
    await service.returnSubmission(teacher, submission.id, { comment: "Исправьте первую версию." });
    const returnedDetail = await service.getTeacherSubmission(teacher, submission.id);
    const firstRevisionReviews = returnedDetail.reviews.filter(
      (item) => item.revision_id === first.revision.id
    );
    assert.equal(firstRevisionReviews.length, 1);
    assert.equal(firstRevisionReviews[0].status, "returned");

    const second = await service.submit(student, submission.id, {
      expectedRevision,
      idempotencyKey: `attempt-${backend}-2`
    });
    assert.equal(second.submission.current_revision_no, 2);
    await service.returnSubmission(teacher, submission.id, { comment: "Лимит попыток исчерпан." });

    const repeatedSecond = await service.submit(student, submission.id, {
      expectedRevision,
      idempotencyKey: `attempt-${backend}-2`
    });
    assert.equal(repeatedSecond.revision.id, second.revision.id);

    await assert.rejects(
      () => service.submit(student, submission.id, {
        expectedRevision,
        idempotencyKey: `attempt-${backend}-3`
      }),
      (error) => {
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, "max_attempts_exceeded");
        assert.match(error.message, /Лимит попыток исчерпан/);
        assert.deepEqual(error.details, { maxAttempts: 2, attemptsUsed: 2 });
        return true;
      }
    );

    const detail = await service.getTeacherSubmission(teacher, submission.id);
    assert.equal(detail.current_revision_no, 2);
    assert.equal(detail.revisions.length, 2);

    if (backend === "d1") {
      const createRaceAssignment = (title, maxAttempts) => service.createAssignment(teacher, {
        versionId: pilotTest.versionId,
        courseId: original.course_id,
        groupIds: [pilot.group.id],
        title,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        allowLate: true,
        maxAttempts
      });

      const sameKeyAssignment = await createRaceAssignment("Параллельный идемпотентный тест", 2);
      const sameKeySubmission = await service.startSubmission(student, sameKeyAssignment.id);
      const sameKeyRevision = await saveTestAnswers(service, student, sameKeySubmission.id, blockIds);
      repository.db.armBatchBarrier(2);
      const sameKeyResults = await Promise.all([
        service.submit(student, sameKeySubmission.id, {
          expectedRevision: sameKeyRevision,
          idempotencyKey: "d1-concurrent-same-key"
        }),
        service.submit(student, sameKeySubmission.id, {
          expectedRevision: sameKeyRevision,
          idempotencyKey: "d1-concurrent-same-key"
        })
      ]);
      assert.equal(sameKeyResults[0].revision.id, sameKeyResults[1].revision.id);
      assert.equal(
        (await service.getTeacherSubmission(teacher, sameKeySubmission.id)).revisions.length,
        1
      );

      const distinctKeyAssignment = await createRaceAssignment("Параллельный тест лимита", 1);
      const distinctKeySubmission = await service.startSubmission(student, distinctKeyAssignment.id);
      const distinctKeyRevision = await saveTestAnswers(service, student, distinctKeySubmission.id, blockIds);
      repository.db.armBatchBarrier(2);
      const distinctKeyResults = await Promise.allSettled([
        service.submit(student, distinctKeySubmission.id, {
          expectedRevision: distinctKeyRevision,
          idempotencyKey: "d1-concurrent-key-a"
        }),
        service.submit(student, distinctKeySubmission.id, {
          expectedRevision: distinctKeyRevision,
          idempotencyKey: "d1-concurrent-key-b"
        })
      ]);
      assert.equal(distinctKeyResults.filter((item) => item.status === "fulfilled").length, 1);
      const rejected = distinctKeyResults.find((item) => item.status === "rejected");
      assert.equal(rejected.reason.code, "max_attempts_exceeded");
      assert.deepEqual(rejected.reason.details, { maxAttempts: 1, attemptsUsed: 1 });
      assert.equal(
        (await service.getTeacherSubmission(teacher, distinctKeySubmission.id)).revisions.length,
        1
      );
    }
  });
}
