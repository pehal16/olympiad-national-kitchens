import express from "express";
import { fail, id, safeEqual, token } from "./util.mjs";
import {
  maxTestQuestions,
  readDraft,
  readSource,
  readTestDraft,
  readTestRequest,
} from "../shared/assistant.mjs";
import { assistantQuestions } from "../shared/authoring.js";
import { project as draftProject } from "../shared/catalog.js";

const heartbeatMs = 20_000;
const waitMs = 4 * 60_000;
const runMs = 150_000;
const testRunMs = 180_000;
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
    Object.assign(job, { state, result, expires: Date.now() + resultMs });
    delete job.input;
  }

  const timer = enabled ? setInterval(prune, 5_000).unref() : null;
  const online = (test = false) =>
    Date.now() - (test ? lastTestReady : lastReady) < heartbeatMs ||
    [...jobs.values()].some(
      (job) =>
        job.state === "running" &&
        job.expires > Date.now() &&
        (!test || job.testWorker),
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
      job?.actor === req.user.id && job.projectId === projectId,
      "Черновик недоступен или время его хранения истекло.",
      404,
    );
    return job;
  }

  // Separate credential, valid only for the two worker routes.
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
      lastReady = ready ? Date.now() : 0;
      if (supportsTests) lastTestReady = lastReady;
      if (!ready || [...jobs.values()].some((job) => job.state === "running")) {
        return send(res, { job: null });
      }
      const job = [...jobs.values()].find(
        (item) => item.state === "queued" && (!item.test || supportsTests),
      );
      if (!job) return send(res, { job: null });
      job.state = "running";
      job.lease = token();
      job.testWorker = supportsTests;
      job.expires = Date.now() + (job.test ? testRunMs : runMs);
      send(res, { job: { id: job.id, lease: job.lease, input: job.input } });
    }),
  );
  app.post(
    api + "/assistant/worker/complete",
    workerAuth,
    express.json({ limit: "128kb" }),
    wrap((req, res) => {
      prune();
      const job = jobs.get(req.body?.id);
      fail(
        job?.lease && safeEqual(req.body?.lease || "", job.lease),
        "Запрос больше не ожидает результата.",
        409,
      );
      if (job.state !== "running") return send(res, { received: true });
      const draft = job.test
        ? readTestDraft(req.body?.draft, job.input.count)
        : readDraft(req.body?.draft, job.input.sourceText);
      lastReady = Date.now();
      if (job.testWorker) lastTestReady = lastReady;
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
      });
    }),
  );

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
        const all = [...jobs.values()];
        const pending = all.filter(
          (job) => job.state === "queued" || job.state === "running",
        );
        fail(
          !pending.some((job) => job.actor === req.user.id),
          "У вас уже есть запрос. Дождитесь его результата или отмените его.",
          409,
        );
        fail(
          pending.length < maxPending && all.length < maxRecords,
          "Помощник занят. Попробуйте через минуту.",
          429,
        );
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
    app.get(
      route + "/:jobId",
      auth,
      wrap((req, res) => {
        const job = ownedJob(req);
        send(res, { state: job.state, ...job.result });
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

  registerQueue(api + "/projects/:projectId/assistant");
  const testsRoute = api + "/assistant/tests";
  registerQueue(testsRoute, true);
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
