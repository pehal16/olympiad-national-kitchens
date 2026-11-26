import express from "express";
import multer from "multer";
import { fail, id, safeEqual, token } from "./util.mjs";
import {
  maxTestQuestions,
  readDraft,
  readSource,
  readTestDraft,
  readTestRequest,
} from "../shared/assistant.mjs";
import {
  maxWorkFiles,
  readWorkInstruction,
  readWorkPlan,
  readWorkResult,
} from "../shared/assistant-work.mjs";
import { assistantQuestions } from "../shared/authoring.js";
import { project as draftProject } from "../shared/catalog.js";
import { maxLectureBytes, readLectures } from "./assistant-documents.mjs";
import { researchWorkGroup } from "./assistant-sources.mjs";
import {
  createAssistantProjects,
  registerAssistantChat,
} from "./assistant-chat.mjs";

const heartbeatMs = 20_000;
const waitMs = 4 * 60_000;
const runMs = 150_000;
const testRunMs = 180_000;
const workRunMs = 10 * 60_000;
const resultMs = 10 * 60_000;
const maxPending = 6;
const maxRecords = 100;

const workerErrors = {
  invalid_draft:
    "Не удалось получить задание с дословной цитатой из фрагмента. Уточните тему или попробуйте другой фрагмент.",
  invalid_test:
    "Помощник не собрал полный тест. Повторите запрос или уточните поручение.",
  local_failure:
    "Помощник на компьютере колледжа не закончил запрос. Повторите попытку позже.",
};

export function registerAssistant(
  app,
  { api, auth, wrap, send, service, workerToken },
) {
  const enabled = /^[A-Za-z0-9_-]{43}$/.test(workerToken || "");
  const jobs = new Map();
  let lastReady = 0;
  let lastTestReady = 0;
  let lastWorkReady = 0;
  let lastChatReady = 0;
  let chat;
  const reading = new Set();

  function prune() {
    const now = Date.now();
    for (const [jobId, job] of jobs) {
      if (job.expires > now) continue;
      if (job.state === "queued" || job.state === "running") {
        finish(job, "failed", {
          error: "Время ожидания истекло. Повторите запрос.",
        });
      } else {
        jobs.delete(jobId);
      }
    }
  }

  function finish(job, state, result) {
    if (job.chat) chat.finish(job, state, result);
    Object.assign(job, { state, result, expires: Date.now() + resultMs });
    delete job.input;
    delete job.documents;
    delete job.contexts;
    delete job.cache;
  }

  const timer = enabled ? setInterval(prune, 5_000).unref() : null;
  const online = (test = false, work = false, chatMode = false) =>
    Date.now() -
      (chatMode
        ? lastChatReady
        : work
          ? lastWorkReady
          : test
            ? lastTestReady
            : lastReady) <
      heartbeatMs ||
    [...jobs.values()].some(
      (job) =>
        job.state === "running" &&
        job.expires > Date.now() &&
        (!test || job.testWorker) &&
        (!work || job.workWorker) &&
        (!chatMode || job.chatWorker),
    );

  function projectScope(req) {
    const projectId = req.params.projectId
      ? service.get(req.user, "project", req.params.projectId, true).id
      : null;
    fail(enabled, "ИИ-помощник ещё не подключён.", 503, "assistant_disabled");
    return projectId;
  }

  function ownedJob(req) {
    const projectId = projectScope(req);
    prune();
    const job = jobs.get(req.params.jobId);
    fail(
      job?.actor === req.user.id && !job.chat && job.projectId === projectId,
      "Черновик недоступен или время его хранения истекло.",
      404,
    );
    return job;
  }

  // Separate credential scoped to worker routes.
  const workerAuth = (req, res, next) => {
    if (!enabled)
      return res
        .status(404)
        .json({ ok: false, error: "ИИ-помощник ещё не подключён." });
    if (!safeEqual(req.get("authorization") || "", `Bearer ${workerToken}`)) {
      return res
        .status(401)
        .json({ ok: false, error: "Рабочий ключ помощника не принят." });
    }
    next();
  };
  const body = express.json({ limit: "24kb" });
  app.post(
    api + "/assistant/worker/claim",
    workerAuth,
    body,
    wrap((req, res) => {
      prune();
      const ready = req.body?.ready === true;
      const supportsTests = req.body?.supportsTests === true;
      const supportsWork = req.body?.supportsWork === true;
      const supportsChat = supportsWork && req.body?.supportsChat === true;
      lastReady = ready ? Date.now() : 0;
      if (supportsTests) lastTestReady = lastReady;
      if (supportsWork) lastWorkReady = lastReady;
      if (supportsChat) lastChatReady = lastReady;
      if (!ready || [...jobs.values()].some((job) => job.state === "running")) {
        return send(res, { job: null });
      }
      const job = [...jobs.values()].find(
        (item) =>
          item.state === "queued" &&
          (!item.test || supportsTests) &&
          (!item.work || supportsWork) &&
          (!item.chat || supportsChat),
      );
      if (!job) return send(res, { job: null });
      job.state = "running";
      job.lease = token();
      job.testWorker = supportsTests;
      job.workWorker = supportsWork;
      job.chatWorker = supportsChat;
      job.expires =
        Date.now() + (job.work ? workRunMs : job.test ? testRunMs : runMs);
      send(res, { job: { id: job.id, lease: job.lease, input: job.input } });
    }),
  );
  app.post(
    api + "/assistant/worker/complete",
    workerAuth,
    express.json({ limit: "512kb" }),
    wrap((req, res) => {
      prune();
      const job = jobs.get(req.body?.id);
      fail(
        job?.lease && safeEqual(req.body?.lease || "", job.lease),
        "Запрос больше не ожидает результата.",
        409,
      );
      if (job.state !== "running") return send(res, { received: true });
      if (job.chatWorker) lastChatReady = Date.now();
      if (job.chat && !job.work) {
        if (!chat.completePlan(job, req.body?.decision)) finish(job, "ready");
        return send(res, { received: true });
      }
      if (job.work) {
        lastReady = lastWorkReady = Date.now();
        if (job.testWorker) lastTestReady = lastReady;
        const clarified = req.body?.clarify;
        if (
          typeof clarified === "string" &&
          clarified.trim() &&
          clarified.length <= 500 &&
          job.input.replies.length < 3
        ) {
          waitForReply(job, clarified.trim());
        } else {
          const work =
            job.plan &&
            readWorkResult(req.body?.results, job.plan, job.contexts);
          const block = req.body?.block;
          const error =
            req.body?.failure === "invalid_plan"
              ? "Помощник не разобрал поручение. Уточните темы, число заданий и формат работы."
              : req.body?.failure === "invalid_block" &&
                  Number.isInteger(block) &&
                  job.plan?.groups[block - 1]
                ? "Помощник не составил корректные задания в блоке " +
                  block +
                  ". Попробуйте ещё раз."
                : "Помощник не закончил работу. Повторите запрос или сузьте объём задания.";
          finish(job, work ? "ready" : "failed", work ? { work } : { error });
        }
        return send(res, { received: true });
      }
      const draft = job.test
        ? readTestDraft(req.body?.draft, job.input.count)
        : readDraft(req.body?.draft, job.input.sourceText);
      lastReady = Date.now();
      if (job.testWorker) lastTestReady = lastReady;
      if (job.workWorker) lastWorkReady = lastReady;
      if (draft) {
        finish(
          job,
          "ready",
          job.test
            ? { test: draft }
            : { draft, sourceTitle: job.input.sourceTitle },
        );
      } else {
        const message =
          req.body?.failure === "local_failure"
            ? workerErrors.local_failure
            : workerErrors[job.test ? "invalid_test" : "invalid_draft"];
        finish(job, "failed", { error: message });
      }
      send(res, { received: true });
    }),
  );

  app.get(
    api + "/assistant/status",
    auth,
    wrap((_req, res) => {
      send(res, {
        enabled,
        online: enabled && online(),
        testOnline: enabled && online(true),
        workOnline: enabled && online(false, true),
        chatOnline: enabled && online(false, false, true),
      });
    }),
  );

  app.post(
    api + "/assistant/worker/research",
    workerAuth,
    express.json({ limit: "160kb" }),
    wrap(async (req, res) => {
      prune();
      const job = jobs.get(req.body?.id);
      fail(
        job?.work &&
          job.state === "running" &&
          safeEqual(req.body?.lease || "", job.lease),
        "Запрос завершён.",
        409,
      );
      const plan =
        job.plan || readWorkPlan(req.body?.plan, Boolean(job.projectId));
      fail(plan?.state === "plan", "Рабочий план не принят.", 400);
      const index = req.body?.group;
      fail(
        Number.isInteger(index) && plan.groups[index],
        "Блок работы не найден.",
        400,
      );
      job.plan = plan;
      job.progress = { block: index + 1, total: plan.groups.length };
      const contexts = job.contexts;
      if (!contexts[index]) {
        const sources = await researchWorkGroup(
          job.input,
          plan.groups[index],
          job.documents,
          job.cache,
        );
        fail(job.state === "running", "Запрос завершён.", 409);
        contexts[index] = sources;
      }
      send(res, contexts[index]);
    }),
  );

  function checkQueue(actor) {
    prune();
    const pending = [...jobs.values()].filter(
      (job) => job.state === "queued" || job.state === "running",
    );
    fail(
      !pending.some((job) => job.actor === actor),
      "У вас уже есть запрос. Дождитесь результата или отмените его.",
      409,
    );
    fail(
      pending.length < maxPending && jobs.size < maxRecords,
      "Помощник занят. Попробуйте через минуту.",
      429,
    );
  }

  function registerReadAndCancel(route) {
    app.get(
      route + "/:jobId",
      auth,
      wrap((req, res) => {
        const job = ownedJob(req);
        send(res, { state: job.state, progress: job.progress, ...job.result });
      }),
    );
    app.delete(
      route + "/:jobId",
      auth,
      wrap((req, res) => {
        const job = ownedJob(req);
        if (job.state === "running") finish(job, "cancelled");
        else jobs.delete(job.id);
        send(res, {});
      }),
    );
  }

  function registerQueue(route, testOnly = false) {
    app.post(
      route,
      auth,
      body,
      wrap((req, res) => {
        const projectId = projectScope(req);
        const test = testOnly || req.body?.instruction !== undefined;
        prune();
        fail(
          online(test),
          "Компьютер колледжа сейчас недоступен. Попробуйте позже.",
          503,
          "assistant_offline",
        );
        const input = test ? readTestRequest(req.body) : readSource(req.body);
        fail(
          input,
          test
            ? "Напишите тему или поручение для теста."
            : "Укажите название материала и вставьте фрагмент от 60 до 3600 символов.",
        );
        if (test) {
          fail(
            input.count >= 1 && input.count <= maxTestQuestions,
            "Укажите от 1 до " + maxTestQuestions + " вопросов на один запрос.",
          );
        }
        checkQueue(req.user.id);
        const job = {
          id: id("draft"),
          actor: req.user.id,
          projectId,
          test,
          input,
          state: "queued",
          expires: Date.now() + waitMs,
        };
        jobs.set(job.id, job);
        res.status(202);
        send(res, { id: job.id, state: job.state });
      }),
    );
    registerReadAndCancel(route);
  }

  const parseLectures = multer({
    storage: multer.memoryStorage(),
    defParamCharset: "utf8",
    limits: {
      files: maxWorkFiles,
      fields: 2,
      fileSize: maxLectureBytes,
      fieldSize: 64 * 1024,
    },
  }).array("lectures", maxWorkFiles);
  const workBody = express.json({ limit: "64kb" });
  const worksRoute = api + "/assistant/works";

  async function parseMaterials(req, res) {
    fail(
      !reading.has(req.user.id) && reading.size < 2,
      "Помощник читает документы. Попробуйте через минуту.",
      429,
    );
    reading.add(req.user.id);
    const parser = req.is("multipart/form-data") ? parseLectures : workBody;
    try {
      await new Promise((resolve, reject) => {
        parser(req, res, (error) => {
          if (error)
            reject(
              error.code?.startsWith("LIMIT_")
                ? Object.assign(new Error("До 5 материалов по 5 МБ каждый."), {
                    status: 413,
                  })
                : error,
            );
          else resolve();
        });
      });
      return await readLectures(req.files);
    } finally {
      reading.delete(req.user.id);
    }
  }

  function waitForReply(job, question) {
    Object.assign(job, {
      state: "clarify",
      expires: Date.now() + resultMs,
      result: { question },
    });
    if (job.chat) chat.clarify(job, question);
  }

  function resume(job, reply) {
    if (reply) job.input.replies.push(reply);
    job.result = undefined;
    job.state = "queued";
    job.expires = Date.now() + waitMs;
  }

  chat = registerAssistantChat(app, {
    api,
    auth,
    wrap,
    send,
    service,
    jobs,
    enabled,
    online: () => online(false, false, true),
    prune,
    checkQueue,
    parseMaterials,
    resume,
    waitForReply,
    enqueue(properties) {
      const job = {
        id: id("draft"),
        state: "queued",
        expires: Date.now() + waitMs,
        ...properties,
      };
      jobs.set(job.id, job);
      return job;
    },
    cancel(job) {
      finish(job, "cancelled");
      if (!job.lease) jobs.delete(job.id);
    },
  });

  function registerWorks(route) {
    app.post(
      route,
      auth,
      wrap(async (req, res) => {
        const projectId = projectScope(req);
        fail(
          online(false, true),
          "Компьютер колледжа сейчас недоступен.",
          503,
          "assistant_offline",
        );
        checkQueue(req.user.id);
        const documents = await parseMaterials(req, res);
        let instruction = readWorkInstruction(req.body?.instruction);
        fail(
          !req.body?.instruction || instruction,
          "Поручение слишком длинное.",
          400,
        );
        if (!instruction && documents.length) {
          instruction =
            "Составь учебную работу по загруженным лекциям. Подбери тестовые и интерактивные задания.";
        }
        fail(instruction, "Опишите работу или прикрепите лекцию.", 400);
        if (res.destroyed) return;
        checkQueue(req.user.id);
        const job = {
          id: id("draft"),
          actor: req.user.id,
          projectId,
          work: true,
          state: "queued",
          expires: Date.now() + waitMs,
          documents,
          cache: new Map(),
          contexts: [],
          input: {
            kind: "work",
            instruction,
            replies: [],
            inProject: Boolean(projectId),
            lectures: documents.map((document) => ({
              title: document.title,
              preview: document.pages[0].text.slice(0, 650),
            })),
          },
        };
        jobs.set(job.id, job);
        res.status(202);
        send(res, { id: job.id, state: job.state });
      }),
    );
    registerReadAndCancel(route);
    app.post(
      route + "/:jobId/reply",
      auth,
      workBody,
      wrap((req, res) => {
        const job = ownedJob(req);
        fail(
          job.work && job.state === "clarify",
          "Уточнение уже принято.",
          409,
        );
        const reply = readWorkInstruction(req.body?.reply);
        fail(
          reply && reply.length <= 2500,
          "Введите ответ на уточнение (до 2500 символов).",
          400,
        );
        checkQueue(req.user.id);
        fail(
          online(false, true),
          "Компьютер колледжа сейчас недоступен.",
          503,
          "assistant_offline",
        );
        resume(job, reply);
        res.status(202);
        send(res, { id: job.id, state: job.state });
      }),
    );
  }

  registerQueue(api + "/projects/:projectId/assistant");
  const testsRoute = api + "/assistant/tests";
  registerQueue(testsRoute, true);
  registerWorks(worksRoute);
  registerWorks(api + "/projects/:projectId/assistant/work");
  app.post(
    worksRoute + "/:jobId/project",
    auth,
    wrap((req, res) => {
      const job = ownedJob(req);
      const work = job.result?.work;
      fail(
        job.work && job.state === "ready" && work,
        "Сначала подготовьте черновик работы.",
        409,
      );
      if (!job.createdProjects) {
        job.createdProjects = service.store.transaction(() =>
          createAssistantProjects(service, req.user, work).map(({ id }) => id),
        );
      }
      send(res, { id: job.createdProjects[0], ids: job.createdProjects });
    }),
  );
  app.post(
    testsRoute + "/:jobId/project",
    auth,
    wrap((req, res) => {
      const job = ownedJob(req);
      const test = job.result?.test;
      fail(
        job.state === "ready" && test,
        "Сначала подготовьте черновик теста.",
        409,
      );
      if (!job.createdProjectId) {
        const project = draftProject(test.title, "test");
        project.rounds[0].questions = assistantQuestions(test);
        job.createdProjectId = service.createProject(req.user, { project }).id;
      }
      send(res, { id: job.createdProjectId });
    }),
  );
  return () => {
    if (timer) clearInterval(timer);
    jobs.clear();
  };
}
