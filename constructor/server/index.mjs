import crypto from "node:crypto";
import { AnswerQueue } from "./answer-queue.mjs";
import express from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  backupInstallation,
  backupSettings,
  configureBackups,
  scheduleBackups,
} from "./backup.mjs";
import { Store } from "./store.mjs";
import { Service } from "./service.mjs";
import { Documents } from "./documents.mjs";
import { exportPackage, inspectPackage, importPackage } from "./transfer.mjs";
import { readRows, exportRows } from "./spreadsheets.mjs";
import { validateProject, summarize } from "./domain.mjs";
import { validateTemplate } from "./validation.mjs";
import { examples } from "./seeds.mjs";
import { TYPES, question as makeQuestion } from "../shared/catalog.js";
import {
  id,
  now,
  hash,
  fail,
  token,
  publicUser,
  cleanText,
  safePath,
  safeEqual,
} from "./util.mjs";
export const API = "/api/constructor/v1";
const mediaTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};
const cookies = (req) =>
  Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim().split("="))
      .filter((x) => x.length === 2),
  );
const participantToken = (req) => req.headers["x-participant-token"] || "";
export function createApp(options = {}) {
  const root = path.resolve(
    options.storageDir ||
      process.env.CONSTRUCTOR_STORAGE ||
      path.join(process.cwd(), "storage"),
  );
  const assets = path.resolve(
    options.assetRoot ||
      process.env.CONSTRUCTOR_ASSET_ROOT ||
      path.join(
        process.cwd(),
        fs.existsSync("dist/client") ? "dist/client" : "public",
      ),
  );
  const store = new Store(root),
    service = new Service(store),
    answerQueue = new AnswerQueue(store, service),
    documents = new Documents(service, assets),
    backups = scheduleBackups(store),
    app = express();
  service.assetRoot = assets;
  app.disable("x-powered-by");
  app.set("trust proxy", "loopback");
  app.use(API, (req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    });
    next();
  });
  app.use(express.json({ limit: "8mb" }));
  const wrap = (fn) => (req, res, next) =>
    Promise.resolve()
      .then(() => fn(req, res))
      .catch(next);
  function sameOrigin(req) {
    const origin = req.headers.origin;
    if (origin) {
      let host;
      try {
        host = new URL(origin).host;
      } catch {
        fail(false, "Недопустимый источник запроса.", 403);
      }
      fail(host === req.headers.host, "Запрос с другого сайта запрещён.", 403);
    }
  }
  function auth(req, res, next) {
    try {
      const session = service.authenticate(cookies(req).constructor_session);
      fail(session, "Войдите в кабинет.", 401);
      req.user = session;
      if (!["GET", "HEAD"].includes(req.method)) {
        sameOrigin(req);
        fail(
          safeEqual(req.headers["x-csrf-token"] || "", session.csrf),
          "Обновите страницу и повторите действие.",
          403,
          "csrf",
        );
      }
      next();
    } catch (e) {
      next(e);
    }
  }
  const send = (res, data) => res.json({ ok: true, data });
  const rate = new Map();
  app.use(API, (req, res, next) => {
    if (/\/(login|setup|accept-invitation|begin)$/.test(req.path)) {
      const key = req.ip + req.path;
      const r = rate.get(key) || { count: 0, until: Date.now() + 60000 };
      if (Date.now() > r.until) {
        r.count = 0;
        r.until = Date.now() + 60000;
      }
      r.count++;
      rate.set(key, r);
      if (rate.size > 10000) rate.clear();
      if (r.count > 200)
        return res.status(429).json({
          ok: false,
          error: "Слишком много попыток. Повторите через минуту.",
        });
    }
    next();
  });
  function loginResponse(req, res, result) {
    res.cookie("constructor_session", result.token, {
      httpOnly: true,
      sameSite: "strict",
      secure: req.secure,
      path: API,
      maxAge: 12 * 3600000,
    });
    send(res, { user: result.user, csrf: result.csrf });
  }
  app.get(
    API + "/status",
    wrap((req, res) => send(res, service.status())),
  );
  app.get(
    API + "/session",
    wrap((req, res) => {
      const user = service.authenticate(cookies(req).constructor_session);
      if (user) service.ensureTemplates(user);
      send(
        res,
        user ? { user: publicUser(user), csrf: user.csrf } : { user: null },
      );
    }),
  );
  app.post(
    API + "/setup",
    wrap(async (req, res) => {
      sameOrigin(req);
      loginResponse(req, res, await service.setup(req.body));
    }),
  );
  app.post(
    API + "/login",
    wrap(async (req, res) => {
      sameOrigin(req);
      loginResponse(req, res, await service.login(req.body));
    }),
  );
  app.post(
    API + "/accept-invitation",
    wrap(async (req, res) => {
      sameOrigin(req);
      loginResponse(req, res, await service.acceptInvite(req.body));
    }),
  );
  app.get(
    API + "/me",
    auth,
    wrap((req, res) => {
      service.ensureTemplates(req.user);
      send(res, { user: publicUser(req.user), csrf: req.user.csrf });
    }),
  );
  app.post(
    API + "/logout",
    auth,
    wrap((req, res) => {
      service.logout(cookies(req).constructor_session);
      res.clearCookie("constructor_session", { path: API });
      send(res, {});
    }),
  );
  app.post(
    API + "/password",
    auth,
    wrap(async (req, res) =>
      loginResponse(req, res, await service.changePassword(req.user, req.body)),
    ),
  );
  app.get(
    API + "/users",
    auth,
    wrap((req, res) => send(res, service.listUsers(req.user))),
  );
  app.post(
    API + "/invitations",
    auth,
    wrap((req, res) => send(res, service.invite(req.user, req.body))),
  );
  app.put(
    API + "/users/:id",
    auth,
    wrap((req, res) =>
      send(res, service.updateUser(req.user, req.params.id, req.body)),
    ),
  );
  app.get(
    API + "/projects",
    auth,
    wrap((req, res) => send(res, service.visible(req.user, "project"))),
  );
  app.post(
    API + "/projects",
    auth,
    wrap((req, res) => send(res, service.createProject(req.user, req.body))),
  );
  app.get(
    API + "/projects/:id",
    auth,
    wrap((req, res) =>
      send(res, service.get(req.user, "project", req.params.id)),
    ),
  );
  app.put(
    API + "/projects/:id",
    auth,
    wrap((req, res) =>
      send(res, service.saveProject(req.user, req.params.id, req.body)),
    ),
  );
  app.post(
    API + "/projects/:id/copy",
    auth,
    wrap((req, res) => {
      const p = service.get(req.user, "project", req.params.id);
      send(
        res,
        service.createProject(req.user, {
          project: { ...p, title: p.title + " — копия" },
        }),
      );
    }),
  );
  app.post(
    API + "/projects/:id/check",
    auth,
    wrap((req, res) =>
      send(res, {
        errors: validateProject(
          service.get(req.user, "project", req.params.id),
        ),
      }),
    ),
  );
  app.post(
    API + "/projects/:id/publish",
    auth,
    wrap((req, res) => send(res, service.publish(req.user, req.params.id))),
  );
  app.get(
    API + "/projects/:id/releases",
    auth,
    wrap((req, res) => {
      service.get(req.user, "project", req.params.id);
      send(
        res,
        store.list("release", null, req.params.id).filter((x) => !x.trial),
      );
    }),
  );
  app.post(
    API + "/projects/:id/trial",
    auth,
    wrap((req, res) => {
      const p = service.get(req.user, "project", req.params.id),
        errors = validateProject(p);
      fail(!errors.length, errors.join("\n"), 422);
      const release = store.put(
        "release",
        id("release"),
        req.user.id,
        { ...p, projectId: p.id, trial: true, version: 0 },
        p.id,
      );
      const run = service.createRun(req.user, {
        releaseId: release.id,
        title: p.title + " · пробное прохождение",
        trial: true,
        settings: {
          entryMode: "open",
          status: "open",
          disclosure: "immediate",
        },
      });
      send(res, run);
    }),
  );
  app.post(
    API + "/share/:kind/:id",
    auth,
    wrap((req, res) => {
      fail(
        ["project", "question", "template"].includes(req.params.kind),
        "Неверный материал.",
      );
      const users = (req.body.logins || []).map((login) => {
        const u = store.user(login);
        fail(
          u?.active,
          `Преподаватель с логином «${cleanText(login, 64)}» не найден.`,
        );
        return u.id;
      });
      send(res, service.share(req.user, req.params.kind, req.params.id, users));
    }),
  );
  app.get(
    API + "/examples",
    auth,
    wrap((req, res) =>
      send(
        res,
        examples().map(({ key, project }) => ({
          key,
          title: project.title,
          description: project.description,
          rounds: project.rounds.length,
        })),
      ),
    ),
  );
  app.post(
    API + "/examples/:key",
    auth,
    wrap((req, res) => {
      const example = examples().find((x) => x.key === req.params.key);
      fail(example, "Образец не найден.", 404);
      send(res, service.createProject(req.user, { project: example.project }));
    }),
  );
  app.get(
    API + "/questions",
    auth,
    wrap((req, res) => send(res, service.visible(req.user, "question"))),
  );
  app.post(
    API + "/questions/import",
    auth,
    wrap((req, res) => {
      fail(
        Array.isArray(req.body.rows) &&
          req.body.rows.length > 0 &&
          req.body.rows.length <= 10000,
        "Неверный размер импорта.",
      );
      const values = req.body.rows.map((row, index) => {
        const provided = String(row.type || "single_choice").trim();
        const type =
          Object.entries(TYPES).find(
            ([, title]) =>
              title.toLocaleLowerCase("ru") ===
              provided.toLocaleLowerCase("ru"),
          )?.[0] || provided;
        fail(
          [
            "single_choice",
            "multiple_choice",
            "short_text",
            "calculation",
            "long_text",
          ].includes(type),
          `Строка ${index + 1}: для этого типа используйте редактор банка.`,
        );
        const q = makeQuestion(type);
        q.title = cleanText(row.title || row.prompt, 240);
        q.prompt = cleanText(row.prompt, 10000);
        q.theme = cleanText(row.theme, 200);
        q.source = cleanText(row.source, 2000);
        q.maxScore = Number(row.maxScore || 2);
        if (type === "single_choice" || type === "multiple_choice") {
          q.config.options = String(row.options || "")
            .split("|")
            .filter((x) => x.trim())
            .map((label, i) => ({ id: "o" + (i + 1), label: label.trim() }));
          const correct = String(row.answer || "")
            .split(",")
            .map((x) => Number(x.trim()));
          fail(
            correct.every((x) => Number.isInteger(x) && x > 0),
            `Строка ${index + 1}: укажите номера правильных вариантов.`,
          );
          q.key =
            type === "single_choice"
              ? { optionId: "o" + correct[0] }
              : { optionIds: correct.map((x) => "o" + x) };
        } else if (type === "short_text")
          q.key = {
            acceptedAnswers: String(row.answer || "")
              .split("|")
              .map((x) => x.trim()),
          };
        else if (type === "calculation")
          q.key = {
            value: Number(String(row.answer).replace(",", ".")),
            tolerance: 0,
            unit: "",
          };
        if (q.grading === "manual" && q.rubric?.length === 1)
          q.rubric[0].maxScore = q.maxScore;
        return q;
      });
      const errors = validateProject({
        title: "Импорт",
        rounds: [{ title: "Банк", transition: "automatic", questions: values }],
      });
      fail(!errors.length, errors.join("\n"), 422);
      const result = store.transaction(() =>
        values.map((q) =>
          store.put("question", id("bank"), req.user.id, {
            ...q,
            sharedWith: [],
          }),
        ),
      );
      send(res, { imported: result.length });
    }),
  );
  app.post(
    API + "/questions",
    auth,
    wrap((req, res) => {
      const q = req.body.question;
      fail(q && q.type && q.title, "Заполните задание.");
      send(
        res,
        store.put("question", id("bank"), req.user.id, {
          ...q,
          sharedWith: [],
        }),
      );
    }),
  );
  app.put(
    API + "/questions/:id",
    auth,
    wrap((req, res) => {
      const q = service.get(req.user, "question", req.params.id, true);
      send(
        res,
        store.put(
          "question",
          q.id,
          q.owner,
          { ...req.body.question, sharedWith: q.sharedWith },
          "",
          req.body.expectedRevision,
        ),
      );
    }),
  );
  app.get(
    API + "/document-samples",
    auth,
    wrap((req, res) =>
      send(
        res,
        service
          .visible(req.user, "attempt")
          .filter((a) => a.status === "completed")
          .slice(0, 500)
          .map((a) => ({
            id: a.id,
            ...a.participant,
            event: a.variant.title,
            score: summarize(a).score ?? "",
            maxScore: summarize(a).maxScore,
            date: new Intl.DateTimeFormat("ru-RU", {
              timeZone: "Europe/Moscow",
            }).format(new Date()),
          })),
      ),
    ),
  );
  app.get(
    API + "/templates",
    auth,
    wrap((req, res) => {
      service.ensureTemplates(req.user);
      send(res, service.templates(req.user));
    }),
  );
  app.post(
    API + "/templates",
    auth,
    wrap((req, res) => send(res, service.createTemplate(req.user, req.body))),
  );
  app.put(
    API + "/templates/:id",
    auth,
    wrap((req, res) => {
      const t = service.get(req.user, "template", req.params.id, true);
      validateTemplate(req.body.template);
      send(
        res,
        store.put(
          "template",
          t.id,
          t.owner,
          req.body.template,
          "",
          req.body.expectedRevision,
        ),
      );
    }),
  );
  app.post(
    API + "/templates/:id/preview",
    auth,
    wrap(async (req, res) => {
      const t = service.get(req.user, "template", req.params.id);
      const bytes = await documents.render(
        t,
        req.body.fields || {
          fullName: "Проверочное длинное имя участника",
          event: "Название олимпиады",
          number: "ОБРАЗЕЦ",
          degree: "I степени",
        },
        { watermark: true },
      );
      res.type("pdf").send(bytes);
    }),
  );
  app.get(
    API + "/runs",
    auth,
    wrap((req, res) => send(res, service.visible(req.user, "run"))),
  );
  app.post(
    API + "/runs",
    auth,
    wrap((req, res) => send(res, service.createRun(req.user, req.body))),
  );
  app.get(
    API + "/runs/:id",
    auth,
    wrap((req, res) =>
      send(res, {
        ...service.get(req.user, "run", req.params.id),
        started: store.list("attempt", null, req.params.id).length > 0,
      }),
    ),
  );
  app.put(
    API + "/runs/:id",
    auth,
    wrap((req, res) =>
      send(res, service.setRun(req.user, req.params.id, req.body)),
    ),
  );
  app.get(
    API + "/runs/:id/participants",
    auth,
    wrap((req, res) =>
      send(res, service.participantList(req.user, req.params.id)),
    ),
  );
  app.post(
    API + "/runs/:id/participants",
    auth,
    wrap((req, res) =>
      send(
        res,
        service.addParticipants(req.user, req.params.id, req.body.rows),
      ),
    ),
  );
  app.get(
    API + "/runs/:id/results",
    auth,
    wrap((req, res) => send(res, service.results(req.user, req.params.id))),
  );
  app.get(
    API + "/runs/:id/results.:format",
    auth,
    wrap(async (req, res) => {
      fail(["csv", "xlsx"].includes(req.params.format), "Неверный формат.");
      const rows = service.results(req.user, req.params.id);
      const data = [
        [
          "Участник",
          "Организация",
          "Группа",
          "Наставник",
          "Статус",
          "Балл",
          "Максимум",
          "Начато",
          "Завершено",
        ],
        ...rows.map((a) => [
          a.participant.fullName,
          a.participant.institution,
          a.participant.groupName,
          a.participant.mentorName,
          a.status,
          a.summary.score ?? "",
          a.summary.maxScore,
          a.startedAt,
          a.finishedAt || "",
        ]),
      ];
      res
        .attachment(`results.${req.params.format}`)
        .send(await exportRows(data, req.params.format));
    }),
  );
  app.get(
    API + "/runs/:id/protocol.pdf",
    auth,
    wrap(async (req, res) =>
      res
        .attachment("protocol.pdf")
        .send(await documents.protocol(req.user, req.params.id)),
    ),
  );
  app.get(
    API + "/runs/:id/questions.xlsx",
    auth,
    wrap(async (req, res) => {
      const attempts = service.results(req.user, req.params.id),
        rows = [
          [
            "Участник",
            "Группа",
            "Тур",
            "Задание",
            "Тип",
            "Баллы",
            "Максимум",
            "Состояние",
          ],
        ];
      for (const a of attempts)
        for (const r of a.summary.rounds)
          for (const q of r.questions) {
            const original = a.variant.rounds
              .flatMap((r) => r.questions)
              .find((x) => x.id === q.id);
            rows.push([
              a.participant.fullName,
              a.participant.groupName,
              r.title,
              q.title,
              original.type,
              q.score ?? "",
              q.maxScore,
              q.manual
                ? "На проверке"
                : a.status === "completed"
                  ? "Проверено"
                  : "Попытка не завершена",
            ]);
          }
      res.attachment("questions.xlsx").send(await exportRows(rows, "xlsx"));
    }),
  );
  app.get(
    API + "/attempts/:id",
    auth,
    wrap((req, res) => {
      const a = service.get(req.user, "attempt", req.params.id);
      send(res, { ...a, summary: summarize(a), history: store.history(a.id) });
    }),
  );
  app.post(
    API + "/attempts/:id/review",
    auth,
    wrap((req, res) =>
      send(res, service.review(req.user, req.params.id, req.body)),
    ),
  );
  app.post(
    API + "/attempts/:id/decision",
    auth,
    wrap((req, res) =>
      send(res, service.decision(req.user, req.params.id, req.body)),
    ),
  );
  app.post(
    API + "/attempts/:id/exclude",
    auth,
    wrap((req, res) =>
      send(res, service.excludeAttempt(req.user, req.params.id, req.body)),
    ),
  );
  app.get(
    API + "/runs/:id/nominations",
    auth,
    wrap((req, res) =>
      send(res, service.nominationRules(req.user, req.params.id)),
    ),
  );
  app.put(
    API + "/runs/:id/nominations",
    auth,
    wrap((req, res) =>
      send(res, service.setNominations(req.user, req.params.id, req.body)),
    ),
  );
  app.get(
    API + "/public/runs/:id/results",
    wrap((req, res) => send(res, service.publicResults(req.params.id))),
  );
  app.post(
    API + "/attempts/:id/pause",
    auth,
    wrap((req, res) =>
      send(res, service.pause(req.user, req.params.id, req.body)),
    ),
  );
  app.get(
    API + "/runs/:id/awards/preview",
    auth,
    wrap((req, res) =>
      send(res, service.awardPreview(req.user, req.params.id)),
    ),
  );
  app.post(
    API + "/runs/:id/awards/approve",
    auth,
    wrap((req, res) =>
      send(res, service.approveAwards(req.user, req.params.id, req.body)),
    ),
  );
  app.post(
    API + "/runs/:id/awards/issue",
    auth,
    wrap((req, res) => send(res, documents.issue(req.user, req.params.id))),
  );
  app.get(
    API + "/runs/:id/issues",
    auth,
    wrap((req, res) => {
      service.get(req.user, "run", req.params.id);
      send(res, store.list("issue", null, req.params.id));
    }),
  );
  app.get(
    API + "/runs/:id/documents.:format",
    auth,
    wrap(async (req, res) => {
      fail(["pdf", "zip"].includes(req.params.format), "Неверный формат.");
      res
        .attachment(`documents.${req.params.format}`)
        .send(
          await documents.collection(
            req.user,
            req.params.id,
            req.params.format,
          ),
        );
    }),
  );
  app.post(
    API + "/issues/:id/revoke",
    auth,
    wrap((req, res) =>
      send(res, documents.revoke(req.user, req.params.id, req.body.reason)),
    ),
  );
  app.post(
    API + "/issues/:id/reissue",
    auth,
    wrap(async (req, res) =>
      send(res, await documents.reissue(req.user, req.params.id, req.body)),
    ),
  );
  app.get(
    API + "/issues/:id/pdf",
    auth,
    wrap((req, res) => {
      const i = service.get(req.user, "issue", req.params.id);
      res
        .type("pdf")
        .sendFile(safePath(store.root, i.relativePath), { dotfiles: "allow" });
    }),
  );
  app.get(
    API + "/jobs",
    auth,
    wrap((req, res) => send(res, service.visible(req.user, "job"))),
  );
  app.get(
    API + "/jobs/:id",
    auth,
    wrap((req, res) => send(res, service.get(req.user, "job", req.params.id))),
  );
  app.get(
    API + "/public/runs/:id/cover",
    wrap((req, res) => {
      const run = store.get("run", req.params.id);
      fail(run, "Проведение не найдено.", 404);
      const url = store.get("release", run.releaseId)?.cover || "",
        media = store.get("media", url.split("/").at(-1));
      fail(
        url.startsWith(API + "/media/") && media?.mime.startsWith("image/"),
        "Обложка не найдена.",
        404,
      );
      res
        .type(media.mime)
        .sendFile(safePath(root, media.relativePath), { dotfiles: "allow" });
    }),
  );
  app.get(
    API + "/public/runs/:id",
    wrap((req, res) => send(res, service.publicRun(req.params.id))),
  );
  app.post(
    API + "/public/runs/:id/begin",
    wrap((req, res) => {
      sameOrigin(req);
      const key = String(req.body.startKey || "");
      fail(key.length >= 16 && key.length <= 128, "Нет ключа начала попытки.");
      const cached = store.request("begin:" + req.params.id, key);
      if (cached) return send(res, JSON.parse(cached));
      const result = service.begin(req.params.id, req.body);
      store.request("begin:" + req.params.id, key, result);
      send(res, result);
    }),
  );
  app.get(
    API + "/public/attempts/:id",
    wrap((req, res) =>
      send(
        res,
        service.view(
          service.participantAttempt(participantToken(req), req.params.id),
        ),
      ),
    ),
  );
  app.put(
    API + "/public/attempts/:id/answers/:question",
    wrap(async (req, res) => {
      sameOrigin(req);
      send(
        res,
        await answerQueue.save(
          service.participantAttempt(participantToken(req), req.params.id),
          req.params.question,
          req.body,
        ),
      );
    }),
  );
  app.post(
    API + "/public/attempts/:id/navigate",
    wrap((req, res) => {
      sameOrigin(req);
      send(
        res,
        service.navigate(
          service.participantAttempt(participantToken(req), req.params.id),
          req.body,
        ),
      );
    }),
  );
  app.post(
    API + "/public/attempts/:id/finish-round",
    wrap((req, res) => {
      sameOrigin(req);
      send(
        res,
        service.finishRound(
          service.participantAttempt(participantToken(req), req.params.id),
        ),
      );
    }),
  );
  app.get(
    API + "/public/attempts/:id/documents",
    wrap((req, res) => {
      const a = service.participantAttempt(
        participantToken(req),
        req.params.id,
      );
      send(
        res,
        store
          .list("issue", null, a.runId)
          .filter((i) => i.attemptId === a.id && i.status === "issued")
          .map((i) => ({
            id: i.id,
            number: i.fields.number,
            title: i.templateSnapshot.title,
          })),
      );
    }),
  );
  app.get(
    API + "/public/attempts/:id/documents/:issue",
    wrap((req, res) => {
      service.participantAttempt(participantToken(req), req.params.id);
      const issue = store.get("issue", req.params.issue);
      fail(
        issue && issue.attemptId === req.params.id && issue.status === "issued",
        "Документ не найден.",
        404,
      );
      res.type("pdf").sendFile(safePath(store.root, issue.relativePath), {
        dotfiles: "allow",
      });
    }),
  );
  app.get(
    API + "/public/verify/:id",
    wrap((req, res) => {
      const issue = store.get("issue", req.params.id);
      fail(issue, "Документ не зарегистрирован в этой установке.", 404);
      send(res, {
        number: issue.fields.number,
        event: issue.fields.event,
        type: issue.templateSnapshot.kind,
        date: issue.fields.date,
        status: issue.status,
      });
    }),
  );
  const uploadDirectory = path.join(root, "jobs", "uploads");
  fs.mkdirSync(uploadDirectory, { recursive: true, mode: 0o700 });
  app.use(API, (req, res, next) => {
    const clean = () => {
      if (
        req.file?.path &&
        path.resolve(req.file.path).startsWith(uploadDirectory + path.sep)
      )
        fs.rmSync(req.file.path, { force: true });
    };
    res.once("finish", clean);
    res.once("close", clean);
    next();
  });
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadDirectory,
      filename: (req, file, done) => done(null, id("upload")),
    }),
    limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  });
  app.post(
    API + "/media",
    auth,
    upload.single("file"),
    wrap(async (req, res) => send(res, await saveMedia(req.file, req.user.id))),
  );
  async function saveMedia(file, owner, attemptId = null) {
    fail(file, "Выберите файл.");
    const ext = path.extname(file.originalname).toLowerCase(),
      mime = mediaTypes[ext];
    fail(mime, "Этот тип файла не поддерживается.");
    const handle = await fs.promises.open(file.path, "r"),
      b = Buffer.alloc(16);
    try {
      await handle.read(b, 0, 16, 0);
    } finally {
      await handle.close();
    }
    const digest = crypto.createHash("sha256");
    for await (const chunk of fs.createReadStream(file.path))
      digest.update(chunk);
    const signature =
      ext === ".png"
        ? b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
        : ext === ".jpg" || ext === ".jpeg"
          ? b[0] === 255 && b[1] === 216
          : ext === ".webp"
            ? b.subarray(0, 4).toString() === "RIFF"
            : ext === ".pdf"
              ? b.subarray(0, 5).toString() === "%PDF-"
              : [".docx", ".xlsx", ".pptx"].includes(ext)
                ? b[0] === 80 && b[1] === 75
                : true;
    fail(signature, "Содержимое файла не соответствует расширению.");
    const mid = id("media"),
      relativePath = `media/${mid}${ext}`;
    await fs.promises.rename(file.path, safePath(root, relativePath));
    fs.chmodSync(safePath(root, relativePath), 0o600);
    return store.put(
      "media",
      mid,
      owner,
      {
        name: cleanText(file.originalname, 200),
        mime,
        byteSize: file.size,
        sha256: digest.digest("hex"),
        relativePath,
        attemptId,
        url: `${API}/media/${mid}`,
      },
      attemptId || "",
    );
  }
  app.post(
    API + "/public/attempts/:id/files",
    (req, res, next) => {
      try {
        sameOrigin(req);
        req.participant = service.refresh(
          service.participantAttempt(participantToken(req), req.params.id),
        );
        fail(
          req.participant.status === "in_progress" &&
            !req.participant.pausedAt &&
            !req.participant.excludedFromResults,
          "Загрузка сейчас недоступна.",
          409,
        );
        next();
      } catch (error) {
        next(error);
      }
    },
    upload.single("file"),
    wrap(async (req, res) => {
      const a = req.participant;
      const q = a.variant.rounds[a.currentRound]?.questions.find(
        (q) => q.id === req.body.questionId,
      );
      fail(
        q?.type === "file_evidence",
        "Файл можно приложить к заданию загрузки.",
      );
      fail(
        (q.config.extensions || []).includes(
          path
            .extname(req.file?.originalname || "")
            .slice(1)
            .toLowerCase(),
        ),
        "Расширение не разрешено в задании.",
      );
      send(res, await saveMedia(req.file, a.owner, a.id));
    }),
  );
  app.get(
    API + "/media/:id",
    wrap((req, res) => {
      const m = store.get("media", req.params.id);
      fail(m, "Файл не найден.", 404);
      const user = service.authenticate(cookies(req).constructor_session);
      let allowed =
        user &&
        (user.role === "owner" ||
          m.owner === user.id ||
          ["project", "template", "question"].some((kind) =>
            service
              .visible(user, kind)
              .some((p) => JSON.stringify(p).includes(m.id)),
          ));
      if (!allowed && participantToken(req)) {
        const ps = store.get("participantSession", hash(participantToken(req))),
          a =
            ps && ps.expires > Date.now()
              ? store.get("attempt", ps.attemptId)
              : null;
        allowed = Boolean(
          a &&
          (JSON.stringify(a.variant).includes(m.id) || m.attemptId === a.id),
        );
      }
      fail(allowed, "Файл не найден.", 404);
      res.type(m.mime);
      if (
        !m.mime.startsWith("image/") &&
        !m.mime.startsWith("audio/") &&
        !m.mime.startsWith("video/")
      )
        res.attachment(m.name);
      res.sendFile(safePath(root, m.relativePath), { dotfiles: "allow" });
    }),
  );
  app.post(
    API + "/spreadsheet/preview",
    auth,
    upload.single("file"),
    wrap(async (req, res) => {
      fail(req.file, "Выберите таблицу.");
      fail(
        req.file.size <= 25 * 1024 * 1024,
        "Таблица не должна превышать 25 МБ.",
      );
      send(
        res,
        await readRows(
          await fs.promises.readFile(req.file.path),
          req.file.originalname,
        ),
      );
    }),
  );
  const packageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 512 * 1024 * 1024, files: 1 },
  });
  app.post(
    API + "/packages/export",
    auth,
    wrap((req, res) =>
      res
        .attachment("materials.olypack")
        .send(exportPackage(service, req.user, req.body)),
    ),
  );
  app.post(
    API + "/packages/preview",
    auth,
    packageUpload.single("file"),
    wrap((req, res) => {
      fail(req.file, "Выберите пакет.");
      const p = inspectPackage(
        service,
        req.user,
        req.file.buffer,
        req.body.password,
      );
      send(res, { ...p.preview, packageHash: p.packageHash });
    }),
  );
  app.post(
    API + "/packages/import",
    auth,
    packageUpload.single("file"),
    wrap((req, res) => {
      fail(req.file, "Выберите пакет.");
      send(
        res,
        importPackage(
          service,
          req.user,
          req.file.buffer,
          req.body.password,
          req.body.packageHash,
        ),
      );
    }),
  );
  app.post(
    API + "/backup",
    auth,
    wrap(async (req, res) => {
      service.owner(req.user);
      const bytes = await backupInstallation(store, req.body.password);
      res.attachment("Установка.olybackup").send(bytes);
    }),
  );
  app.get(
    API + "/backup/settings",
    auth,
    wrap((req, res) => {
      service.owner(req.user);
      send(res, backupSettings(store));
    }),
  );
  app.put(
    API + "/backup/settings",
    auth,
    wrap((req, res) => {
      service.owner(req.user);
      send(res, configureBackups(store, req.body));
      backups.tick();
    }),
  );
  app.get(
    API + "/health",
    wrap((req, res) => {
      store.db.prepare("SELECT 1").get();
      send(res, {
        status: "ok",
        storage: "sqlite",
        mode: process.env.CONSTRUCTOR_MODE || "local",
        version: "1.0.0",
      });
    }),
  );
  app.use(
    "/constructor",
    express.static(assets, {
      index: false,
      fallthrough: true,
      setHeaders(res, file) {
        if (file.endsWith(".html")) res.set("Cache-Control", "no-store");
        res.set("X-Content-Type-Options", "nosniff");
      },
    }),
  );
  app.get(
    /^\/constructor(?:\/.*)?$/,
    wrap((req, res) => {
      const entry = path.join(assets, "index.html");
      fail(
        fs.existsSync(entry),
        "Интерфейс ещё не собран. Выполните npm run build.",
        503,
      );
      res
        .set("Cache-Control", "no-store")
        .sendFile(entry, { dotfiles: "allow" });
    }),
  );
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err.status || (err.code === "LIMIT_FILE_SIZE" ? 413 : 500);
    if (status === 500) console.error("Constructor request failed:", err.stack);
    res.status(status).json({
      ok: false,
      error:
        status === 500
          ? "Не удалось выполнить действие. Повторите запрос."
          : err.message,
      code: err.code || "server_error",
    });
  });
  return {
    app,
    store,
    service,
    documents,
    async close() {
      backups.stop();
      answerQueue.close();
      await documents.close();
      store.close();
    },
  };
}
if (!process.env.CONSTRUCTOR_IMPORT_ONLY) {
  const direct =
    process.argv[1] &&
    (path.resolve(process.argv[1]) ===
      path.resolve(import.meta.filename || "") ||
      process.argv[1].endsWith("server.cjs"));
  if (direct) {
    const instance = createApp(),
      port = Number(process.env.CONSTRUCTOR_PORT || 3210),
      host = process.env.CONSTRUCTOR_HOST || "127.0.0.1";
    const server = instance.app.listen(port, host, () => {
      console.log(`Конструктор: http://127.0.0.1:${port}/constructor/`);
      if (host === "0.0.0.0")
        for (const list of Object.values(os.networkInterfaces()))
          for (const x of list || [])
            if (x.family === "IPv4" && !x.internal)
              console.log(
                `Локальная сеть: http://${x.address}:${port}/constructor/`,
              );
      if (instance.service.status().setupRequired)
        console.log(
          `Код первого входа находится в ${path.join(instance.store.root, "Первый вход.txt")}`,
        );
    });
    for (const signal of ["SIGINT", "SIGTERM"])
      process.on(signal, () =>
        server.close(async () => {
          await instance.close();
          process.exit(0);
        }),
      );
  }
}
