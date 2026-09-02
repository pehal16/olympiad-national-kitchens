"use strict";

const { configureLearningRuntime, getLearningRepository, getLearningRuntime, learningEnabled } = require("./repository");
const { LearningService, publicUser } = require("./service");
const {
  sessionTokenFromRequest,
  sessionCookie,
  clearSessionCookie
} = require("./auth");
const {
  parseJsonBody,
  readBuffer,
  sendJson,
  sendLearningError,
  routeMatch,
  assertSameOrigin
} = require("./http");
const { LearningError } = require("./errors");
const { LearningFileStore, MAX_FILE_BYTES } = require("./files");

function header(req, name) {
  return String(req?.headers?.[String(name).toLowerCase()] || "");
}

function bodyWithIdempotency(req, body) {
  return {
    ...(body || {}),
    idempotencyKey: header(req, "idempotency-key") || body?.idempotencyKey || ""
  };
}

async function contextFor(req, service, required = true) {
  const context = await service.authenticate(sessionTokenFromRequest(req));
  if (!context && required) {
    throw new LearningError("Требуется вход в систему.", 401, "authentication_required");
  }
  return context;
}

function requireMutationSecurity(req, service, context) {
  assertSameOrigin(req);
  service.assertCsrf(context, header(req, "x-csrf-token"));
}

function sendData(res, data, statusCode = 200, headers = {}) {
  sendJson(res, statusCode, { ok: true, data }, headers);
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function journalCsv(rows) {
  const columns = [
    ["Группа", "group"],
    ["Студент", "studentName"],
    ["Предмет", "subject"],
    ["Работа", "assignmentTitle"],
    ["Вид", "kind"],
    ["Статус", "status"],
    ["Срок", "dueAt"],
    ["Сдано", "submittedAt"],
    ["Балл", "finalScore"],
    ["Оценка", "grade"]
  ];
  return `\uFEFF${[
    columns.map(([title]) => csvCell(title)).join(";"),
    ...rows.map((row) => columns.map(([, key]) => csvCell(row[key])).join(";"))
  ].join("\r\n")}`;
}

async function handleLearningApi(req, res, url, runtime = {}) {
  configureLearningRuntime(runtime);
  const pathname = url.pathname;
  const method = req.method;

  try {
    if (method === "GET" && pathname === "/api/learning/status") {
      if (!learningEnabled()) {
        sendData(res, { enabled: false, configured: false, requiresBootstrap: false });
        return;
      }
      const repository = await getLearningRepository();
      const service = new LearningService(repository, { pepper: runtime.authSecret });
      sendData(res, await service.status());
      return;
    }

    if (!learningEnabled()) {
      throw new LearningError("Модуль учебных работ пока выключен.", 503, "learning_disabled");
    }

    const repository = await getLearningRepository();
    const service = new LearningService(repository, { pepper: runtime.authSecret });

    if (method === "POST" && pathname === "/api/learning/setup") {
      assertSameOrigin(req);
      const body = await parseJsonBody(req);
      sendData(res, await service.bootstrapAdmin(
        body,
        runtime.bootstrapSecret || process.env.LEARNING_BOOTSTRAP_SECRET
      ), 201);
      return;
    }

    if (method === "POST" && pathname === "/api/learning/auth/login") {
      assertSameOrigin(req);
      const result = await service.login(await parseJsonBody(req));
      sendData(res, {
        user: result.user,
        csrfToken: result.csrfToken
      }, 200, {
        "Set-Cookie": sessionCookie(result.token, req, { maxAgeSeconds: result.maxAgeSeconds })
      });
      return;
    }

    if (method === "GET" && pathname === "/api/learning/auth/me") {
      const context = await contextFor(req, service, false);
      sendData(res, context
        ? { authenticated: true, user: publicUser(context), csrfToken: context.session.csrf_token }
        : { authenticated: false, user: null, csrfToken: null });
      return;
    }

    if (method === "POST" && pathname === "/api/learning/auth/logout") {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, await service.logout(context), 200, { "Set-Cookie": clearSessionCookie(req) });
      return;
    }

    if (method === "POST" && pathname === "/api/learning/auth/change-password") {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, await service.changePassword(context, await parseJsonBody(req)), 200, {
        "Set-Cookie": clearSessionCookie(req)
      });
      return;
    }

    if (method === "GET" && pathname === "/api/learning/teacher/catalog") {
      const context = await contextFor(req, service);
      service.requireRole(context, ["admin", "teacher"]);
      sendData(res, await service.catalog(context));
      return;
    }

    if (method === "GET" && pathname === "/api/learning/teacher/dashboard") {
      sendData(res, await service.teacherDashboard(await contextFor(req, service)));
      return;
    }

    if (method === "POST" && pathname === "/api/learning/teacher/groups") {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, await service.createGroup(context, await parseJsonBody(req)), 201);
      return;
    }

    let params = routeMatch(pathname, "/api/learning/teacher/groups/:groupId/students");
    if (method === "GET" && params) {
      sendData(res, await service.listGroupStudents(
        await contextFor(req, service),
        params.groupId
      ));
      return;
    }

    params = routeMatch(pathname, "/api/learning/teacher/groups/:groupId/students/:studentId/reset-password");
    if (method === "POST" && params) {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, await service.resetStudentPassword(context, params.groupId, params.studentId));
      return;
    }

    if (method === "POST" && pathname === "/api/learning/teacher/subjects") {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, await service.createSubject(context, await parseJsonBody(req)), 201);
      return;
    }

    if (method === "POST" && pathname === "/api/learning/teacher/courses") {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, await service.createCourse(context, await parseJsonBody(req)), 201);
      return;
    }

    if (method === "POST" && pathname === "/api/learning/teacher/rosters/import/preview") {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, service.rosterPreview(context, await parseJsonBody(req)));
      return;
    }

    if (method === "POST" && pathname === "/api/learning/teacher/rosters/import/commit") {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, await service.rosterCommit(context, await parseJsonBody(req)), 201);
      return;
    }

    if (method === "POST" && pathname === "/api/learning/teacher/pilot/seed") {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, await service.seedPilot(context), 201);
      return;
    }

    if (method === "GET" && pathname === "/api/learning/teacher/templates") {
      sendData(res, await service.listTemplates(await contextFor(req, service)));
      return;
    }

    if (method === "POST" && pathname === "/api/learning/teacher/templates") {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, await service.createTemplate(context, await parseJsonBody(req)), 201);
      return;
    }

    params = routeMatch(pathname, "/api/learning/teacher/templates/:id");
    if (method === "GET" && params) {
      sendData(res, await service.getTemplate(await contextFor(req, service), params.id));
      return;
    }

    params = routeMatch(pathname, "/api/learning/teacher/templates/:id/draft");
    if (method === "PUT" && params) {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, await service.saveTemplate(context, params.id, await parseJsonBody(req)));
      return;
    }

    params = routeMatch(pathname, "/api/learning/teacher/templates/:id/publish");
    if (method === "POST" && params) {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, await service.publishTemplate(context, params.id));
      return;
    }

    if (method === "GET" && pathname === "/api/learning/teacher/assignments") {
      sendData(res, await service.listTeacherAssignments(await contextFor(req, service)));
      return;
    }

    if (method === "POST" && pathname === "/api/learning/teacher/assignments") {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, await service.createAssignment(context, await parseJsonBody(req)), 201);
      return;
    }

    if (method === "GET" && pathname === "/api/learning/teacher/submissions") {
      const context = await contextFor(req, service);
      const filters = { status: url.searchParams.get("status") || "" };
      sendData(res, await service.listTeacherSubmissions(context, filters));
      return;
    }

    params = routeMatch(pathname, "/api/learning/teacher/submissions/:id");
    if (method === "GET" && params) {
      sendData(res, await service.getTeacherSubmission(await contextFor(req, service), params.id));
      return;
    }

    params = routeMatch(pathname, "/api/learning/teacher/submissions/:id/return");
    if (method === "POST" && params) {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, await service.returnSubmission(context, params.id, await parseJsonBody(req)));
      return;
    }

    params = routeMatch(pathname, "/api/learning/teacher/submissions/:id/grade");
    if (method === "POST" && params) {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, await service.gradeSubmission(context, params.id, await parseJsonBody(req)));
      return;
    }

    if (method === "GET" && pathname === "/api/learning/teacher/journal") {
      sendData(res, await service.journal(await contextFor(req, service)));
      return;
    }

    if (method === "GET" && pathname === "/api/learning/teacher/journal.csv") {
      const rows = await service.journal(await contextFor(req, service));
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="learning-journal.csv"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      });
      res.end(journalCsv(rows));
      return;
    }

    if (method === "GET" && pathname === "/api/learning/student/dashboard") {
      sendData(res, await service.studentDashboard(await contextFor(req, service)));
      return;
    }

    params = routeMatch(pathname, "/api/learning/assignments/:id");
    if (method === "GET" && params) {
      sendData(res, await service.getStudentAssignment(await contextFor(req, service), params.id));
      return;
    }

    params = routeMatch(pathname, "/api/learning/assignments/:id/start");
    if (method === "POST" && params) {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, await service.startSubmission(context, params.id), 201);
      return;
    }

    params = routeMatch(pathname, "/api/learning/submissions/:id/answers/:blockId");
    if (method === "PUT" && params) {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      sendData(res, await service.saveAnswer(context, params.id, params.blockId, await parseJsonBody(req)));
      return;
    }

    params = routeMatch(pathname, "/api/learning/submissions/:id/submit");
    if (method === "POST" && params) {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      const body = bodyWithIdempotency(req, await parseJsonBody(req));
      sendData(res, await service.submit(context, params.id, body));
      return;
    }

    params = routeMatch(pathname, "/api/learning/submissions/:id/resubmit");
    if (method === "POST" && params) {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      const body = bodyWithIdempotency(req, await parseJsonBody(req));
      sendData(res, await service.submit(context, params.id, body));
      return;
    }

    params = routeMatch(pathname, "/api/learning/submissions/:id/attachments/init");
    if (method === "POST" && params) {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      const fileStore = new LearningFileStore();
      const body = { ...(await parseJsonBody(req)), storageBackend: fileStore.backend() };
      sendData(res, await service.prepareAttachment(context, params.id, body), 201);
      return;
    }

    params = routeMatch(pathname, "/api/learning/attachments/:id/content");
    if (method === "PUT" && params) {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      const { attachment } = await service.authorizeAttachment(context, params.id, { mutable: true });
      const declaredLength = Number(header(req, "content-length") || attachment.byte_size || 0);
      if (declaredLength > MAX_FILE_BYTES) throw new LearningError("Файл слишком большой.", 413, "file_too_large");
      const buffer = await readBuffer(req, { maxBytes: MAX_FILE_BYTES });
      const fileStore = new LearningFileStore();
      await fileStore.put(attachment.object_key, buffer, {
        mimeType: attachment.mime_type,
        attachmentId: attachment.id,
        submissionId: attachment.submission_id
      });
      try {
        sendData(res, await service.verifyAndFinalizeAttachment(context, params.id, buffer, fileStore.backend()));
      } catch (error) {
        await fileStore.delete(attachment.object_key);
        throw error;
      }
      return;
    }

    params = routeMatch(pathname, "/api/learning/attachments/:id/finalize");
    if (method === "POST" && params) {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      const { attachment } = await service.authorizeAttachment(context, params.id);
      if (attachment.status !== "ready") {
        throw new LearningError("Загрузка файла ещё не завершена.", 409, "upload_incomplete");
      }
      sendData(res, attachment);
      return;
    }

    params = routeMatch(pathname, "/api/learning/attachments/:id");
    if (method === "DELETE" && params) {
      const context = await contextFor(req, service);
      requireMutationSecurity(req, service, context);
      const fileStore = new LearningFileStore();
      const attachment = await service.deleteAttachment(context, params.id);
      if (!attachment.preserved_for_revision) await fileStore.delete(attachment.object_key);
      sendData(res, { deleted: true, preservedForRevision: Boolean(attachment.preserved_for_revision) });
      return;
    }

    params = routeMatch(pathname, "/api/learning/attachments/:id/download");
    if (method === "GET" && params) {
      const context = await contextFor(req, service);
      const { attachment } = await service.authorizeAttachment(context, params.id);
      if (attachment.status !== "ready") throw new LearningError("Файл недоступен.", 409, "file_not_ready");
      const object = await new LearningFileStore().get(attachment.object_key);
      if (!object) throw new LearningError("Файл не найден в хранилище.", 404, "file_not_found");
      res.writeHead(200, {
        "Content-Type": attachment.mime_type || object.contentType,
        "Content-Length": object.body.length,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.original_name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      });
      res.end(object.body);
      return;
    }

    throw new LearningError("Маршрут учебных работ не найден.", 404, "route_not_found");
  } catch (error) {
    const statusCode = Number(error?.statusCode || error?.status || 500);
    if (statusCode >= 500) {
      console.error("learning_api_failure", {
        method,
        pathname,
        name: error?.name || "Error",
        code: error?.code || "internal_error",
        message: error?.message || "Unknown learning API failure",
        stack: error?.stack || ""
      });
    }
    sendLearningError(res, error);
  }
}

module.exports = {
  handleLearningApi,
  journalCsv
};
