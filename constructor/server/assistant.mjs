import express from "express";
import { fail, id, safeEqual, token } from "./util.mjs";
import { readDraft, readSource } from "../shared/assistant.mjs";

const heartbeatMs = 20_000;
const waitMs = 4 * 60_000;
const runMs = 150_000;
const resultMs = 10 * 60_000;
const maxPending = 6;
const maxRecords = 100;

const workerErrors = {
  invalid_draft:
    "Не удалось получить задание с дословной цитатой из фрагмента. Уточните тему или попробуйте другой фрагмент.",
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
  const online = () =>
    Date.now() - lastReady < heartbeatMs ||
    [...jobs.values()].some(
      (job) => job.state === "running" && job.expires > Date.now(),
    );

  function access(req) {
    const project = service.get(
      req.user,
      "project",
      req.params.projectId,
      true,
    );
    fail(enabled, "ИИ-помощник ещё не подключён.", 503, "assistant_disabled");
    return project;
  }

  function ownedJob(req) {
    const project = access(req);
    prune();
    const job = jobs.get(req.params.jobId);
    fail(
      job?.actor === req.user.id && job.projectId === project.id,
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
      lastReady = ready ? Date.now() : 0;
      if (!ready || [...jobs.values()].some((job) => job.state === "running")) {
        return send(res, { job: null });
      }
      const job = [...jobs.values()].find((item) => item.state === "queued");
      if (!job) return send(res, { job: null });
      job.state = "running";
      job.lease = token();
      job.expires = Date.now() + runMs;
      send(res, { job: { id: job.id, lease: job.lease, input: job.input } });
    }),
  );
  app.post(
    api + "/assistant/worker/complete",
    workerAuth,
    body,
    wrap((req, res) => {
      prune();
      const job = jobs.get(req.body?.id);
      fail(
        job?.lease && safeEqual(req.body?.lease || "", job.lease),
        "Запрос больше не ожидает результата.",
        409,
      );
      if (job.state !== "running") return send(res, { received: true });
      const draft = readDraft(req.body?.draft, job.input.sourceText);
      if (draft) {
        finish(job, "ready", { draft, sourceTitle: job.input.sourceTitle });
      } else {
        const message =
          req.body?.failure === "local_failure"
            ? workerErrors.local_failure
            : workerErrors.invalid_draft;
        finish(job, "failed", { error: message });
      }
      send(res, { received: true });
    }),
  );

  app.get(
    api + "/assistant/status",
    auth,
    wrap((_req, res) => {
      send(res, { enabled, online: enabled && online() });
    }),
  );

  const route = api + "/projects/:projectId/assistant";
  app.post(
    route,
    auth,
    body,
    wrap((req, res) => {
      const project = access(req);
      prune();
      fail(
        online(),
        "Компьютер колледжа сейчас недоступен. Попробуйте позже.",
        503,
        "assistant_offline",
      );
      const input = readSource(req.body);
      fail(
        input,
        "Укажите название материала и вставьте фрагмент от 60 до 3600 символов.",
      );
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
        projectId: project.id,
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
  return () => {
    if (timer) clearInterval(timer);
    jobs.clear();
  };
}
