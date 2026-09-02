"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const { FileLearningRepository } = require("../src/learning/repositories/file");
const { D1LearningRepository } = require("../src/learning/repositories/d1");
const { LearningService } = require("../src/learning/service");

const root = path.resolve(__dirname, "..");
const migrations = [
  "0001_cloudflare_initial.sql",
  "0002_cloudflare_voice_d1_fallback.sql",
  "0003_learning_identity_catalog.sql",
  "0004_learning_works.sql",
  "0005_learning_submissions.sql"
];

class MemoryFileStore {
  constructor() {
    this.objects = new Map();
  }

  backend() {
    return "file";
  }

  async put(key, body, metadata = {}) {
    this.objects.set(key, {
      body: Buffer.from(body),
      contentType: metadata.mimeType || "application/octet-stream",
      customMetadata: null
    });
  }

  async get(key) {
    const object = this.objects.get(key);
    return object
      ? { ...object, body: Buffer.from(object.body) }
      : null;
  }
}

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

function createD1Repository(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "learning-attachment-d1-"));
  const database = new DatabaseSync(path.join(directory, "learning.sqlite"));
  database.exec("PRAGMA foreign_keys=ON;");
  migrations.forEach((name) => database.exec(fs.readFileSync(path.join(root, "migrations", name), "utf8")));
  t.after(() => {
    database.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return new D1LearningRepository(new SqliteD1Database(database)).init();
}

async function prepareRequiredFileSubmission(repository, fileStore, suffix) {
  const service = new LearningService(repository, {
    pepper: `attachment-${suffix}`,
    passwordIterations: 10_000,
    fileStore
  });
  await service.bootstrapAdmin({
    bootstrapSecret: `bootstrap-${suffix}`,
    login: `attachment-teacher-${suffix}`,
    password: "AttachmentTeacher2026",
    displayName: "Преподаватель вложений"
  }, `bootstrap-${suffix}`);
  const teacherLogin = await service.login({
    login: `attachment-teacher-${suffix}`,
    password: "AttachmentTeacher2026"
  });
  const teacher = await service.authenticate(teacherLogin.token);
  const pilot = await service.seedPilot(teacher);
  const fileTemplate = await service.createTemplate(teacher, {
    courseId: pilot.courses[0].id,
    kind: "lab",
    title: `Лабораторная проверка вложений ${suffix}`,
    topic: "Проверка подтверждающего файла",
    instructions: "Приложите фотографию результата.",
    estimatedMinutes: 15,
    blocks: [{
      id: "lab-photo",
      type: "file_evidence",
      title: "Фото результата",
      prompt: "Приложите фотографию в формате PNG.",
      required: true,
      maxScore: 10,
      minFiles: 1,
      maxFiles: 1,
      maxFileBytes: 2_000_000,
      allowedMimeTypes: ["image/png"],
      allowedExtensions: ["png"]
    }],
    rubric: [{ title: "Файл", description: "Файл загружен и доступен для проверки.", maxScore: 10 }]
  });
  const fileVersion = await service.publishTemplate(teacher, fileTemplate.id);
  await service.createAssignment(teacher, {
    versionId: fileVersion.id,
    courseId: pilot.courses[0].id,
    groupIds: [pilot.group.id],
    title: `Лабораторная проверка вложений ${suffix}`,
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    allowLate: true,
    maxAttempts: 1
  });
  const credential = pilot.credentials[0];
  const temporaryLogin = await service.login({
    login: credential.login,
    password: credential.temporaryPassword
  });
  let student = await service.authenticate(temporaryLogin.token);
  await service.changePassword(student, {
    currentPassword: credential.temporaryPassword,
    newPassword: "AttachmentStudent2026",
    confirmPassword: "AttachmentStudent2026"
  });
  const studentLogin = await service.login({
    login: credential.login,
    password: "AttachmentStudent2026"
  });
  student = await service.authenticate(studentLogin.token);
  const dashboard = await service.studentDashboard(student);
  const assignment = dashboard.assignments.find((item) => item.title === `Лабораторная проверка вложений ${suffix}`);
  const assignmentDetail = await service.getStudentAssignment(student, assignment.id);
  const fileBlockId = assignmentDetail.work.blocks.find(
    (block) => block.contentKey === "lab-photo" || block.id === "lab-photo"
  )?.id;
  assert.ok(fileBlockId);
  const submission = await service.startSubmission(student, assignment.id);
  const answers = [];
  let revision = 0;
  for (const [blockId, value] of answers) {
    const saved = await service.saveAnswer(student, submission.id, blockId, {
      value,
      expectedRevision: revision
    });
    revision = saved.draftRevision;
  }
  return { service, repository, fileStore, teacher, student, submission, revision, fileBlockId };
}

async function exerciseAttachmentIntegrity(fixture) {
  const { service, repository, fileStore, student, submission, fileBlockId } = fixture;
  let revision = fixture.revision;
  const forged = await service.saveAnswer(student, submission.id, fileBlockId, {
    value: {
      files: [{
        id: "attachment_forged",
        name: "proof.png",
        mimeType: "image/png",
        size: 16,
        status: "stored"
      }]
    },
    expectedRevision: revision
  });
  revision = forged.draftRevision;
  await assert.rejects(
    () => service.submit(student, submission.id, {
      expectedRevision: revision,
      idempotencyKey: `forged-${submission.id}`
    }),
    (error) => error.code === "submission_incomplete"
      && error.details.some((item) => item.code === "attachment_reference_invalid")
  );

  const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
  const pending = await service.prepareAttachment(student, submission.id, {
    blockId: fileBlockId,
    fileName: "result.png",
    mimeType: "image/png",
    byteSize: png.length,
    storageBackend: "file"
  });
  const attachment = await repository.getAttachment(pending.id);
  await service.verifyAndFinalizeAttachment(student, pending.id, png, "file");
  const missingObject = await service.saveAnswer(student, submission.id, fileBlockId, {
    value: { files: [{ id: pending.id, status: "stored" }] },
    expectedRevision: revision
  });
  revision = missingObject.draftRevision;
  await assert.rejects(
    () => service.submit(student, submission.id, {
      expectedRevision: revision,
      idempotencyKey: `missing-${submission.id}`
    }),
    (error) => error.code === "submission_incomplete"
      && error.details.some((item) => item.code === "attachment_object_missing")
  );

  await fileStore.put(attachment.object_key, png, {
    mimeType: attachment.mime_type,
    attachmentId: attachment.id,
    submissionId: submission.id
  });
  const trusted = await service.saveAnswer(student, submission.id, fileBlockId, {
    value: {
      files: [{
        id: pending.id,
        name: "client-lie.exe",
        mimeType: "text/plain",
        size: 1,
        status: "pending"
      }]
    },
    expectedRevision: revision
  });
  revision = trusted.draftRevision;
  const submitted = await service.submit(student, submission.id, {
    expectedRevision: revision,
    idempotencyKey: `valid-${submission.id}`
  });
  assert.equal(submitted.submission.status, "submitted");
  const sealedAttachment = await repository.getAttachment(pending.id);
  assert.equal(sealedAttachment.revision_id, submitted.revision.id);
  return submitted;
}

test("file repository rejects forged required evidence and seals a real stored attachment", async (t) => {
  const storageDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "learning-attachment-file-"));
  t.after(() => fs.promises.rm(storageDir, { recursive: true, force: true }));
  const repository = await new FileLearningRepository({ storageDir }).init();
  await exerciseAttachmentIntegrity(await prepareRequiredFileSubmission(
    repository,
    new MemoryFileStore(),
    "file"
  ));
});

test("D1 repository rejects forged required evidence and seals a real stored attachment", async (t) => {
  const repository = await createD1Repository(t);
  await exerciseAttachmentIntegrity(await prepareRequiredFileSubmission(
    repository,
    new MemoryFileStore(),
    "d1"
  ));
});
