import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  id,
  now,
  fail,
  token,
  hash,
  passwordHash,
  passwordCheck,
  publicUser,
  cleanText,
  clone,
  safePath,
} from "./util.mjs";
import {
  validateProject,
  generateVariant,
  summarize,
  attemptView,
  remainingDeadline,
  rankAttempts,
  gradeQuestion,
  questionDeadline,
} from "./domain.mjs";
import { project, starterTemplates, RUN_DEFAULTS } from "../shared/catalog.js";
import {
  validateCompleteAnswer,
  validateTemplate,
  scheduledTime,
  validateRunSettings,
} from "./validation.mjs";
export const RIGHTS = ["publish", "conduct", "review", "awards", "share"];
export class Service {
  constructor(store) {
    this.store = store;
    for (const name of [
      "begin",
      "review",
      "excludeAttempt",
      "setNominations",
      "approveAwards",
      "decision",
      "pause",
      "setRun",
      "publish",
      "createRun",
      "share",
    ]) {
      const action = this[name].bind(this);
      this[name] = (...args) => this.store.transaction(() => action(...args));
    }
  }
  status() {
    return {
      setupRequired: !this.store.db
        .prepare("SELECT 1 FROM users LIMIT 1")
        .get(),
      instanceId: this.store.meta("instanceId"),
      mode: process.env.CONSTRUCTOR_MODE || "local",
    };
  }
  async setup(body) {
    fail(this.status().setupRequired, "Владелец уже создан.", 409);
    fail(
      hash(body.setupCode || "") === hash(this.store.meta("setupSecret")),
      "Неверный код первоначальной настройки.",
      403,
    );
    const password = await passwordHash(body.password);
    const login = this.loginValue(body.login);
    const uid = id("user");
    this.store.transaction(() => {
      fail(this.status().setupRequired, "Владелец уже создан.", 409);
      this.store.db
        .prepare("INSERT INTO users VALUES(?,?,?,?,?,?,1)")
        .run(
          uid,
          login,
          cleanText(body.name, 160) || "Владелец",
          "owner",
          password,
          JSON.stringify(Object.fromEntries(RIGHTS.map((x) => [x, true]))),
        );
      this.store.audit(uid, "owner.created", uid);
    });
    return this.login({ login, password: body.password });
  }
  loginValue(value) {
    const v = cleanText(value, 64).toLowerCase();
    fail(
      /^[a-zа-яё0-9._-]{3,64}$/iu.test(v),
      "Логин: от 3 до 64 букв, цифр, точек, дефисов или подчёркиваний.",
    );
    return v;
  }
  async login(body) {
    const u = this.store.user(this.loginValue(body.login));
    fail(
      u?.active && (await passwordCheck(body.password, u.password)),
      "Неверный логин или пароль.",
      401,
    );
    const value = token(),
      csrf = token();
    this.store.db
      .prepare("INSERT INTO sessions VALUES(?,?,?,?)")
      .run(hash(value), u.id, csrf, Date.now() + 12 * 3600000);
    return { token: value, csrf, user: publicUser(u) };
  }
  authenticate(value) {
    const row = this.store.db
      .prepare("SELECT * FROM sessions WHERE hash=? AND expires>?")
      .get(hash(value || ""), Date.now());
    if (!row) return null;
    const user = this.store.user(row.user_id);
    return user?.active ? { ...user, csrf: row.csrf } : null;
  }
  logout(value) {
    this.store.db
      .prepare("DELETE FROM sessions WHERE hash=?")
      .run(hash(value || ""));
  }
  async changePassword(user, body) {
    const current = this.store.user(user.id);
    fail(
      await passwordCheck(body.currentPassword, current.password),
      "Текущий пароль указан неверно.",
      403,
    );
    const value = await passwordHash(body.newPassword);
    this.store.transaction(() => {
      this.store.db
        .prepare("UPDATE users SET password=? WHERE id=?")
        .run(value, user.id);
      this.store.db
        .prepare("DELETE FROM sessions WHERE user_id=?")
        .run(user.id);
      this.store.audit(user.id, "user.password_changed", user.id);
    });
    return this.login({ login: user.login, password: body.newPassword });
  }
  owner(user) {
    fail(user?.role === "owner", "Доступно только владельцу.", 403);
  }
  right(user, right) {
    fail(
      user?.role === "owner" || user?.permissions?.[right] !== false,
      "Это действие ограничено владельцем.",
      403,
    );
  }
  readable(user, item) {
    return (
      item &&
      (user.role === "owner" ||
        item.owner === user.id ||
        item.sharedWith?.includes(user.id))
    );
  }
  get(user, kind, key, write = false) {
    const item = this.store.get(kind, key);
    fail(
      item &&
        this.readable(user, item) &&
        (!write || item.owner === user.id || user.role === "owner"),
      "Материал не найден.",
      404,
    );
    return item;
  }
  visible(user, kind) {
    return this.store.list(kind).filter((item) => this.readable(user, item));
  }
  mediaReadable(user, media) {
    return Boolean(
      user &&
      media &&
      (user.role === "owner" ||
        media.owner === user.id ||
        ["project", "question", "template"].some((kind) =>
          this.store
            .list(kind, media.owner)
            .some(
              (material) =>
                material.sharedWith?.includes(user.id) &&
                JSON.stringify(material).includes(media.id),
            ),
        )),
    );
  }
  assertMediaReadable(user, value) {
    for (const mid of new Set(
      JSON.stringify(value).match(/media_[a-f0-9-]{36}/g) || [],
    ))
      fail(
        this.mediaReadable(user, this.store.get("media", mid)),
        "Связанный файл недоступен этому преподавателю.",
        404,
        "media_forbidden",
      );
  }
  prepareMedia(user, value, targetOwner = user.id) {
    this.assertMediaReadable(user, value);
    let json = JSON.stringify(value);
    for (const mid of new Set(json.match(/media_[a-f0-9-]{36}/g) || [])) {
      const media = this.store.get("media", mid);
      if (media.owner === targetOwner) continue;
      let copy = this.store
        .list("media", targetOwner)
        .find((m) => m.copiedFrom === mid && m.sha256 === media.sha256);
      if (!copy) {
        const key = id("media"),
          relativePath = "media/" + key + path.extname(media.relativePath);
        fs.copyFileSync(
          safePath(this.store.root, media.relativePath),
          safePath(this.store.root, relativePath),
        );
        copy = this.store.put("media", key, targetOwner, {
          ...media,
          id: key,
          relativePath,
          url: "/api/constructor/v1/media/" + key,
          attemptId: null,
          copiedFrom: mid,
        });
      }
      json = json.replaceAll(mid, copy.id);
    }
    return JSON.parse(json);
  }
  listUsers(user) {
    this.owner(user);
    return this.store.db
      .prepare("SELECT id FROM users")
      .all()
      .map((x) => publicUser(this.store.user(x.id)));
  }
  invite(user, body) {
    this.owner(user);
    const value = token();
    const data = {
      name: cleanText(body.name, 160),
      permissions: Object.fromEntries(
        RIGHTS.map((x) => [x, body.permissions?.[x] !== false]),
      ),
    };
    this.store.db
      .prepare("INSERT INTO invitations VALUES(?,?,?,0)")
      .run(hash(value), JSON.stringify(data), Date.now() + 72 * 3600000);
    this.store.audit(user.id, "teacher.invited", hash(value));
    return {
      invitation: value,
      expiresAt: new Date(Date.now() + 72 * 3600000).toISOString(),
    };
  }
  async acceptInvite(body) {
    const h = hash(body.invitation || "");
    const inv = this.store.db
      .prepare(
        "SELECT * FROM invitations WHERE hash=? AND used=0 AND expires>?",
      )
      .get(h, Date.now());
    fail(inv, "Приглашение недействительно или истекло.", 410);
    const data = JSON.parse(inv.data),
      login = this.loginValue(body.login),
      pw = await passwordHash(body.password),
      uid = id("user");
    this.store.transaction(() => {
      const current = this.store.db
        .prepare(
          "SELECT * FROM invitations WHERE hash=? AND used=0 AND expires>?",
        )
        .get(h, Date.now());
      fail(current, "Приглашение уже использовано.", 409);
      fail(!this.store.user(login), "Этот логин уже занят.", 409);
      this.store.db
        .prepare("INSERT INTO users VALUES(?,?,?,?,?,?,1)")
        .run(
          uid,
          login,
          cleanText(body.name, 160) || data.name || login,
          "teacher",
          pw,
          JSON.stringify(data.permissions),
        );
      this.store.db
        .prepare("UPDATE invitations SET used=1 WHERE hash=?")
        .run(h);
      this.store.audit(uid, "invitation.accepted", uid);
    });
    return this.login({ login, password: body.password });
  }
  updateUser(user, key, body) {
    this.owner(user);
    const target = this.store.user(key);
    fail(
      target && target.role !== "owner",
      "Нельзя изменить владельца этим действием.",
      400,
    );
    this.store.db
      .prepare("UPDATE users SET active=?,permissions=? WHERE id=?")
      .run(
        body.active === false ? 0 : 1,
        JSON.stringify(
          Object.fromEntries(
            RIGHTS.map((x) => [x, body.permissions?.[x] !== false]),
          ),
        ),
        key,
      );
    this.store.db.prepare("DELETE FROM sessions WHERE user_id=?").run(key);
    this.store.audit(user.id, "teacher.updated", key, {
      active: body.active !== false,
    });
    return publicUser(this.store.user(key));
  }
  createProject(user, body = {}) {
    let base = body.project
      ? clone(body.project)
      : project(body.title || "Новая олимпиада", body.kind || "olympiad");
    delete base.owner;
    delete base.id;
    delete base.revision;
    base.sharedWith = [];
    base.status = "draft";
    base.createdAt = now();
    base = this.prepareMedia(user, base);
    return this.store.put("project", id("project"), user.id, base);
  }
  saveProject(user, key, body) {
    const existing = this.get(user, "project", key, true);
    let draft = clone(body.project || body);
    delete draft.id;
    delete draft.owner;
    delete draft.revision;
    draft.title = cleanText(draft.title, 240);
    draft.status = existing.status === "archived" ? "archived" : "draft";
    draft.sharedWith = existing.sharedWith || [];
    fail(
      Array.isArray(draft.rounds) && JSON.stringify(draft).length < 3000000,
      "Неверный или слишком большой проект.",
    );
    draft = this.prepareMedia(user, draft, existing.owner);
    return this.store.put(
      "project",
      key,
      existing.owner,
      draft,
      "",
      body.expectedRevision,
    );
  }
  publish(user, key) {
    this.right(user, "publish");
    const p = this.get(user, "project", key, true),
      errors = validateProject(p);
    this.assertMediaReadable(user, p);
    fail(!errors.length, errors.join("\n"), 422, "project_incomplete");
    const releases = this.store.list("release", null, key);
    const release = this.store.put(
      "release",
      id("release"),
      p.owner,
      {
        ...clone(p),
        projectId: key,
        version: releases.length + 1,
        publishedAt: now(),
        checksum: hash(p),
      },
      key,
    );
    this.store.audit(user.id, "project.published", key, {
      releaseId: release.id,
      version: release.version,
    });
    return release;
  }
  share(user, kind, key, userIds) {
    this.right(user, "share");
    const p = this.get(user, kind, key, true);
    const all = userIds.filter((x) => this.store.user(x)?.active);
    p.sharedWith = all;
    this.store.put(kind, key, p.owner, p, p.parent || "");
    this.store.audit(user.id, "material.shared", key, { users: all });
    return p;
  }
  createTemplate(user, body) {
    validateTemplate(body);
    let value = clone(body);
    delete value.id;
    delete value.owner;
    value.sharedWith = [];
    value = this.prepareMedia(user, value);
    return this.store.put("template", id("template"), user.id, value);
  }
  templates(user) {
    return this.visible(user, "template");
  }
  ensureTemplates(user) {
    if (!this.store.list("template", user.id).length)
      for (const t of starterTemplates())
        this.store.put("template", t.id, user.id, t);
  }
  createRun(user, body) {
    this.right(user, "conduct");
    const release = this.get(user, "release", body.releaseId);
    const settings = { ...RUN_DEFAULTS, ...body.settings };
    validateRunSettings(settings);
    fail(
      ["codes", "open"].includes(settings.entryMode),
      "Неверный режим входа.",
    );
    fail(
      Number.isInteger(Number(settings.maxAttempts)) &&
        settings.maxAttempts > 0 &&
        settings.maxAttempts <= 20,
      "Число попыток: от 1 до 20.",
    );
    const r = {
      title: cleanText(body.title, 240) || release.title,
      releaseId: release.id,
      projectId: release.projectId,
      settings,
      published: false,
      awardsApproved: false,
      trial: Boolean(body.trial),
      createdAt: now(),
      registrationFields: settings.registrationFields,
    };
    const run = this.store.put(
      "run",
      id("run"),
      release.owner,
      r,
      release.projectId,
    );
    this.store.audit(user.id, "run.created", run.id);
    return run;
  }
  setRun(user, key, body) {
    this.right(user, "conduct");
    const r = this.get(user, "run", key, true);
    if (body.settings) {
      fail(
        !r.importedReadOnly || body.settings.status !== "open",
        "Импортированное проведение доступно только как архив.",
        409,
      );
      const started = this.store.list("attempt", null, key).length;
      const allowed = started
        ? ["status", "availableUntil", "disclosure"]
        : Object.keys(RUN_DEFAULTS).concat(["showSolutions", "tieBreak"]);
      for (const field of allowed)
        if (body.settings[field] !== undefined)
          r.settings[field] = body.settings[field];
    }
    if (body.publishResults !== undefined) {
      fail(
        !body.publishResults ||
          !this.results(user, key).some(
            (x) =>
              !x.excludedFromResults &&
              (x.summary.pending || x.status !== "completed"),
          ),
        "Завершите ручную проверку перед публикацией.",
        409,
      );
      r.published = Boolean(body.publishResults);
    }
    if (body.title) r.title = cleanText(body.title, 240);
    validateRunSettings(r.settings);
    this.store.audit(user.id, "run.updated", key, {
      status: r.settings.status,
      published: r.published,
    });
    return this.store.put("run", key, r.owner, r, r.projectId);
  }
  publicRun(key) {
    const r = this.store.get("run", key);
    fail(r, "Проведение не найдено.", 404);
    const release = this.store.get("release", r.releaseId);
    return {
      id: r.id,
      title: r.title,
      description: release.description,
      cover: release.cover?.startsWith("/api/constructor/v1/media/")
        ? "/api/constructor/v1/public/runs/" + r.id + "/cover"
        : release.cover,
      legend: release.legend,
      entryMode: r.settings.entryMode,
      status: r.settings.status,
      availableFrom: r.settings.availableFrom,
      availableUntil: r.settings.availableUntil,
      registrationFields: r.registrationFields,
      rounds: release.rounds.map((x) => ({
        id: x.id,
        title: x.title,
        questionCount: x.selectCount > 0 ? x.selectCount : x.questions.length,
      })),
      trial: r.trial,
      published: r.published,
    };
  }
  checkRunOpen(run) {
    fail(run.settings.status === "open", "Вход в проведение закрыт.", 409);
    if (run.settings.availableFrom)
      fail(
        Date.now() >= scheduledTime(run.settings.availableFrom),
        "Проведение ещё не началось.",
        409,
      );
    if (run.settings.availableUntil)
      fail(
        Date.now() <= scheduledTime(run.settings.availableUntil),
        "Время входа закончилось.",
        409,
      );
  }
  addParticipants(user, key, rows) {
    this.right(user, "conduct");
    const run = this.get(user, "run", key, true);
    fail(
      Array.isArray(rows) && rows.length > 0 && rows.length <= 5000,
      "Добавьте от 1 до 5000 участников.",
    );
    return this.store.transaction(() =>
      rows.map((row) => {
        const fullName = cleanText(row.fullName, 200);
        fail(fullName, "Укажите ФИО участника.");
        const code = crypto.randomBytes(10).toString("hex").toUpperCase();
        const p = this.store.put(
          "participant",
          id("participant"),
          run.owner,
          {
            runId: key,
            profile: {
              fullName,
              institution: cleanText(row.institution, 240),
              groupName: cleanText(row.groupName, 160),
              mentorName: cleanText(row.mentorName, 200),
            },
            codeHash: hash(code),
          },
          key,
        );
        return { ...p, code, codeHash: undefined };
      }),
    );
  }
  participantList(user, key) {
    this.get(user, "run", key);
    return this.store
      .list("participant", null, key)
      .map(({ codeHash, ...p }) => p);
  }
  begin(runId, body) {
    const run = this.store.get("run", runId);
    fail(run, "Проведение не найдено.", 404);
    this.checkRunOpen(run);
    const release = this.store.get("release", run.releaseId);
    let participant;
    if (run.settings.entryMode === "codes") {
      participant = this.store.list("participant", null, runId).find(
        (p) =>
          p.codeHash ===
          hash(
            String(body.code || "")
              .trim()
              .toUpperCase(),
          ),
      );
      fail(participant, "Неверный персональный код.", 403);
    } else {
      const profile = {};
      for (const field of [
        "fullName",
        "institution",
        "groupName",
        "mentorName",
      ])
        profile[field] = cleanText(
          body.participant?.[field],
          field === "institution" ? 240 : 200,
        );
      fail(profile.fullName, "Укажите ФИО.");
      fail(
        body.consent === true,
        "Подтвердите согласие на обработку введённых данных.",
      );
      participant = this.store.put(
        "participant",
        id("participant"),
        run.owner,
        { runId, profile, codeHash: null },
        runId,
      );
    }
    const prior = this.store
      .list("attempt", null, runId)
      .filter((a) => a.participantId === participant.id);
    if (body.resumeAttempt) {
      const a = prior.find((x) => x.id === body.resumeAttempt);
      fail(a, "Попытка не найдена.", 404);
      return this.newParticipantSession(a);
    }
    const active = prior.find((a) => a.status !== "completed");
    if (active) return this.newParticipantSession(active);
    fail(
      prior.length < Number(run.settings.maxAttempts),
      "Допустимое число попыток использовано.",
      409,
    );
    const stamp = now(),
      aid = id("attempt");
    const variant = generateVariant(release, aid);
    const firstRound = variant.rounds[0];
    this.roundAvailable(firstRound);
    const a = this.store.put(
      "attempt",
      aid,
      run.owner,
      {
        runId,
        participantId: participant.id,
        participant: participant.profile,
        variant,
        releaseId: release.id,
        settings: run.settings,
        status: "in_progress",
        startedAt: stamp,
        roundStartedAt: stamp,
        questionStartedAt: stamp,
        currentRound: 0,
        currentQuestion: 0,
        questionTimes: { [firstRound.questions[0].id]: stamp },
        answers: {},
        reviews: {},
        decisions: {},
        completedRounds: [],
        pauseMs: 0,
        roundPauseMs: 0,
        questionPauseMs: 0,
        trial: run.trial,
      },
      runId,
    );
    if (run.awardsApproved || run.published)
      this.invalidateAwards(
        { id: run.owner, role: "teacher" },
        runId,
        "Начата новая попытка после утверждения результатов",
        participant.id,
      );
    this.store.audit(participant.id, "attempt.started", aid);
    return this.newParticipantSession(a);
  }
  newParticipantSession(a) {
    const value = token();
    this.store.put(
      "participantSession",
      hash(value),
      a.owner,
      { attemptId: a.id, expires: Date.now() + 7 * 24 * 3600000 },
      a.runId,
    );
    return { token: value, attemptId: a.id };
  }
  participantAttempt(value, attemptId) {
    const session = this.store.get("participantSession", hash(value || ""));
    fail(
      session &&
        session.expires > Date.now() &&
        session.attemptId === attemptId,
      "Войдите с персональным доступом к этой попытке.",
      401,
    );
    const a = this.store.get("attempt", attemptId);
    fail(a, "Попытка не найдена.", 404);
    return a;
  }
  roundAvailable(r) {
    if (r.availableFrom)
      fail(
        Date.now() >= scheduledTime(r.availableFrom),
        "Тур откроется позже.",
        409,
      );
    if (r.availableUntil)
      fail(
        Date.now() <= scheduledTime(r.availableUntil),
        "Тур уже закрыт.",
        409,
      );
  }
  persistAttempt(a) {
    return this.store.put("attempt", a.id, a.owner, a, a.runId);
  }
  advanceQuestion(a) {
    const r = a.variant.rounds[a.currentRound];
    if (a.currentQuestion < r.questions.length - 1) {
      a.currentQuestion++;
      this.present(a);
      return;
    }
    this.completeRound(a, true);
  }
  present(a) {
    const q = a.variant.rounds[a.currentRound]?.questions[a.currentQuestion];
    if (q) {
      a.questionStartedAt = a.questionTimes[q.id] || now();
      a.questionTimes[q.id] = a.questionStartedAt;
      a.questionPauseMs = a.questionPauses?.[q.id] || 0;
    }
  }
  completeRound(a, timedOut = false) {
    const r = a.variant.rounds[a.currentRound];
    if (!timedOut) {
      for (const q of r.questions) {
        if (!q.required || q.type === "instruction") continue;
        if (
          q.seconds > 0 &&
          a.questionTimes?.[q.id] &&
          Date.now() > questionDeadline(a, q)
        )
          continue;
        const answer = a.answers[q.id]?.answer;
        validateCompleteAnswer(q, answer);
      }
    }
    if (!a.completedRounds.includes(r.id)) a.completedRounds.push(r.id);
    if (a.currentRound === a.variant.rounds.length - 1) {
      a.status = "completed";
      a.finishedAt = now();
      return;
    }
    const s = summarize(a).rounds[a.currentRound];
    const approved = a.decisions[r.id] === "approved";
    const nextRound = a.variant.rounds[a.currentRound + 1];
    if (
      nextRound.availableFrom &&
      Date.now() < scheduledTime(nextRound.availableFrom)
    ) {
      a.status = "waiting";
      a.waitingReason = "schedule";
      return;
    }
    if (
      !approved &&
      (r.transition === "manual" ||
        (r.transition === "threshold" &&
          (s.pending || s.score < Number(r.threshold))))
    ) {
      a.status = "waiting";
      return;
    }
    a.currentRound++;
    a.currentQuestion = 0;
    a.status = "in_progress";
    a.roundStartedAt = now();
    a.roundPauseMs = 0;
    this.present(a);
  }
  refresh(a) {
    if (a.status === "waiting") {
      const r = a.variant.rounds[a.currentRound],
        s = summarize(a).rounds[a.currentRound];
      if (
        a.decisions[r.id] === "approved" ||
        (a.waitingReason === "schedule" &&
          (!a.variant.rounds[a.currentRound + 1].availableFrom ||
            Date.now() >=
              scheduledTime(
                a.variant.rounds[a.currentRound + 1].availableFrom,
              ))) ||
        (r.transition === "threshold" &&
          !s.pending &&
          s.score >= Number(r.threshold))
      ) {
        this.roundAvailable(a.variant.rounds[a.currentRound + 1]);
        this.completeRound(a, true);
        return this.persistAttempt(a);
      }
      return a;
    }
    if (a.status !== "in_progress" || a.pausedAt || a.excludedFromResults)
      return a;
    if (Date.now() > remainingDeadline(a)) {
      const r = a.variant.rounds[a.currentRound];
      if (
        a.settings.seconds > 0 &&
        Date.now() >
          Date.parse(a.startedAt) + a.settings.seconds * 1000 + (a.pauseMs || 0)
      ) {
        a.status = "completed";
        a.finishedAt = now();
        a.timedOut = true;
      } else if (
        (r.seconds > 0 &&
          Date.now() >
            Date.parse(a.roundStartedAt) +
              r.seconds * 1000 +
              (a.roundPauseMs || 0)) ||
        (r.availableUntil && Date.now() > scheduledTime(r.availableUntil))
      ) {
        this.completeRound(a, true);
      } else this.advanceQuestion(a);
      return this.persistAttempt(a);
    }
    return a;
  }
  view(a) {
    a = this.refresh(a);
    const r = this.store.get("run", a.runId);
    return attemptView(a, r.settings.disclosure, r.published);
  }
  saveAnswer(a, questionId, body) {
    return this.store.transaction(() => {
      const cachedReceipt = this.store.request(
        a.id + ":" + questionId,
        String(body.idempotencyKey || ""),
      );
      if (cachedReceipt) return JSON.parse(cachedReceipt);
      a = this.refresh(this.store.get("attempt", a.id));
      fail(
        a.status === "in_progress" && !a.pausedAt && !a.excludedFromResults,
        "Ответ сейчас изменить нельзя.",
        409,
      );
      const r = a.variant.rounds[a.currentRound],
        q = r.questions.find((q) => q.id === questionId);
      fail(q, "Задание недоступно.", 404);
      if (q.seconds > 0)
        fail(
          a.questionTimes?.[q.id] && Date.now() <= questionDeadline(a, q),
          "Время выполнения этого задания истекло или оно ещё не открыто.",
          409,
          "question_expired",
        );
      fail(
        r.allowBack || r.questions[a.currentQuestion].id === questionId,
        "Возврат к этому заданию закрыт.",
        409,
      );
      const key = String(body.idempotencyKey || "");
      fail(
        key.length >= 8 && key.length <= 128,
        "Нет ключа безопасного сохранения.",
      );
      const cached = this.store.request(a.id + ":" + questionId, key);
      if (cached) return JSON.parse(cached);
      const old = a.answers[questionId];
      fail(
        Number(body.expectedRevision ?? 0) === Number(old?.revision || 0),
        "На сервере уже сохранён другой ответ. Выберите версию.",
        409,
        "answer_conflict",
      );
      fail(
        JSON.stringify(body.answer ?? null).length < 200000,
        "Ответ слишком большой.",
      );
      if (q.type === "file_evidence") {
        fail(
          Array.isArray(body.answer) &&
            body.answer.length <= Number(q.config.maxFiles || 3),
          "Неверный список файлов.",
        );
        for (const file of body.answer) {
          const media = this.store.get("media", file);
          fail(
            media && media.attemptId === a.id,
            "Файл не принадлежит этой попытке.",
            403,
          );
        }
      }
      a.answers[questionId] = {
        answer: body.answer,
        revision: (old?.revision || 0) + 1,
        savedAt: now(),
      };
      this.persistAttempt(a);
      const receipt = { ...a.answers[questionId], questionId };
      this.store.request(a.id + ":" + questionId, key, receipt);
      return receipt;
    });
  }
  navigate(a, body) {
    a = this.refresh(a);
    fail(
      a.status === "in_progress" && !a.pausedAt && !a.excludedFromResults,
      "Сейчас переход недоступен.",
      409,
    );
    const r = a.variant.rounds[a.currentRound],
      target = Number(body.index);
    fail(
      Number.isInteger(target) && target >= 0 && target < r.questions.length,
      "Неверное задание.",
    );
    const targetQuestion = r.questions[target];
    if (targetQuestion.seconds > 0 && a.questionTimes?.[targetQuestion.id])
      fail(
        Date.now() <= questionDeadline(a, targetQuestion),
        "Время выполнения этого задания истекло.",
        409,
        "question_expired",
      );
    fail(r.allowBack || target >= a.currentQuestion, "Возврат запрещён.", 409);
    fail(
      r.allowSkip || target <= a.currentQuestion + 1,
      "Пропуск запрещён.",
      409,
    );
    if (target > a.currentQuestion && !r.allowSkip) {
      const q = r.questions[a.currentQuestion];
      fail(
        !q.required || a.answers[q.id]?.answer != null,
        "Сначала сохраните ответ.",
        422,
      );
    }
    a.currentQuestion = target;
    this.present(a);
    return this.view(this.persistAttempt(a));
  }
  finishRound(a) {
    a = this.refresh(a);
    fail(
      a.status === "in_progress" && !a.pausedAt && !a.excludedFromResults,
      "Тур сейчас нельзя завершить.",
      409,
    );
    this.completeRound(a);
    this.store.audit(a.participantId, "round.submitted", a.id);
    return this.view(this.persistAttempt(a));
  }
  results(user, key) {
    this.get(user, "run", key);
    return this.store.list("attempt", null, key).map((a) => {
      const refreshed = this.refresh(a);
      return { ...refreshed, summary: summarize(refreshed) };
    });
  }
  review(user, key, body) {
    this.right(user, "review");
    const a = this.get(user, "attempt", key, true);
    const q = a.variant.rounds
      .flatMap((r) => r.questions)
      .find((x) => x.id === body.questionId);
    fail(q, "Задание не найдено.", 404);
    fail(
      a.status === "completed" ||
        a.completedRounds.some((rid) =>
          a.variant.rounds
            .find((r) => r.id === rid)
            ?.questions.some((x) => x.id === q.id),
        ),
      "Участник ещё выполняет задание.",
      409,
    );
    const criteria = q.rubric || [];
    const scores = body.scores || {};
    for (const c of criteria)
      fail(
        Number.isFinite(Number(scores[c.id])) &&
          Number(scores[c.id]) >= 0 &&
          Number(scores[c.id]) <= c.maxScore,
        `Проверьте баллы по критерию «${c.title}».`,
      );
    const score = criteria.length
      ? criteria.reduce((s, c) => s + Number(scores[c.id]), 0)
      : Number(body.score);
    fail(
      Number.isFinite(score) && score >= 0 && score <= q.maxScore,
      "Неверный балл.",
    );
    const old = a.reviews[q.id];
    const stamp = now();
    a.reviews[q.id] = {
      score,
      scores,
      comment: cleanText(body.comment, 10000),
      reviewedAt: stamp,
      reviewer: user.id,
    };
    this.persistAttempt(a);
    for (const issue of this.store
      .list("issue", null, a.runId)
      .filter((i) => i.status === "issued")) {
      issue.status = "suspended";
      this.store.put("issue", issue.id, issue.owner, issue, issue.runId);
      this.store.audit(user.id, "document.suspended", issue.id, {
        reason: "Изменена оценка",
      });
    }
    const run = this.store.get("run", a.runId);
    if (run.awardsApproved || run.published) {
      run.awardsApproved = false;
      run.published = false;
      this.store.put("run", run.id, run.owner, run, run.projectId);
    }
    this.store.audit(user.id, "answer.reviewed", a.id, {
      questionId: q.id,
      previous: old || null,
      review: a.reviews[q.id],
    });
    return this.refresh(this.store.get("attempt", key));
  }
  decision(user, key, body) {
    this.right(user, "conduct");
    const a = this.get(user, "attempt", key, true);
    fail(a.status === "waiting", "Попытка не ожидает решения.", 409);
    const r = a.variant.rounds[a.currentRound];
    a.decisions[r.id] = body.approved ? "approved" : "rejected";
    if (!body.approved) {
      a.status = "completed";
      a.finishedAt = now();
      a.withdrawn = true;
    }
    this.store.audit(user.id, "round.decision", key, {
      approved: Boolean(body.approved),
      reason: cleanText(body.reason, 2000),
    });
    return this.refresh(this.persistAttempt(a));
  }
  pause(user, key, body) {
    this.right(user, "conduct");
    const a = this.get(user, "attempt", key, true);
    fail(a.status === "in_progress", "Попытка не выполняется.", 409);
    if (body.paused && !a.pausedAt) a.pausedAt = now();
    else if (!body.paused && a.pausedAt) {
      const elapsed = Date.now() - Date.parse(a.pausedAt);
      a.pauseMs += elapsed;
      a.roundPauseMs += elapsed;
      a.questionPauseMs += elapsed;
      a.questionPauses = {
        ...a.questionPauses,
        [a.variant.rounds[a.currentRound].questions[a.currentQuestion].id]:
          a.questionPauseMs,
      };
      delete a.pausedAt;
    }
    this.store.audit(user.id, "attempt.pause", key, {
      paused: Boolean(body.paused),
      reason: cleanText(body.reason, 2000),
    });
    return this.persistAttempt(a);
  }
  excludeAttempt(user, key, body) {
    this.right(user, "conduct");
    const a = this.get(user, "attempt", key, true);
    fail(cleanText(body.reason), "Укажите причину решения.");
    a.excludedFromResults = Boolean(body.excluded);
    a.exclusionReason = cleanText(body.reason, 2000);
    this.invalidateAwards(user, a.runId, "Изменён состав учитываемых работ");
    this.store.audit(user.id, "attempt.excluded", key, {
      excluded: a.excludedFromResults,
      reason: a.exclusionReason,
    });
    return this.persistAttempt(a);
  }
  invalidateAwards(user, key, reason, actor = user.id) {
    const run = this.get(user, "run", key, true);
    run.awardsApproved = false;
    run.published = false;
    this.store.put("run", key, run.owner, run, run.projectId);
    for (const issue of this.store
      .list("issue", null, key)
      .filter((i) => i.status === "issued")) {
      issue.status = "suspended";
      this.store.put("issue", issue.id, issue.owner, issue, key);
      this.store.audit(actor, "document.suspended", issue.id, { reason });
    }
  }
  setNominations(user, key, body) {
    this.right(user, "awards");
    const run = this.get(user, "run", key, true),
      release = this.store.get("release", run.releaseId),
      ids = new Set(this.store.list("participant", null, key).map((p) => p.id));
    fail(
      (release.awardRules || []).some(
        (r) => r.id === body.ruleId && r.mode === "nomination",
      ),
      "Номинация не найдена.",
    );
    fail(
      Array.isArray(body.participantIds) &&
        body.participantIds.every((x) => ids.has(x)),
      "Участник не принадлежит проведению.",
    );
    fail(cleanText(body.reason), "Укажите основание назначения номинации.");
    this.invalidateAwards(user, key, "Изменены номинации");
    const fresh = this.store.get("run", key);
    fresh.nominations = {
      ...fresh.nominations,
      [body.ruleId]: [...new Set(body.participantIds)],
    };
    this.store.audit(user.id, "awards.nominations", key, {
      ruleId: body.ruleId,
      participantIds: body.participantIds,
      reason: cleanText(body.reason, 2000),
    });
    return this.store.put("run", key, run.owner, fresh, run.projectId);
  }
  nominationRules(user, key) {
    const run = this.get(user, "run", key);
    return (this.store.get("release", run.releaseId).awardRules || []).filter(
      (r) => r.mode === "nomination",
    );
  }
  publicResults(key) {
    const run = this.store.get("run", key);
    fail(run?.published, "Результаты ещё не опубликованы.", 404);
    return rankAttempts(
      this.store.list("attempt", null, key),
      run.settings.attemptSelection,
      run.settings.tieBreak,
    ).map((a) => ({
      participant: a.participant.fullName,
      groupName: a.participant.groupName,
      score: a.summary.score,
      maxScore: a.summary.maxScore,
      place: a.place,
    }));
  }
  awardPreview(user, key) {
    this.right(user, "awards");
    const run = this.get(user, "run", key),
      release = this.store.get("release", run.releaseId);
    const attempts = this.store.list("attempt", null, key);
    fail(
      !attempts.some(
        (a) => !a.trial && !a.excludedFromResults && a.status !== "completed",
      ),
      "Есть незавершённые попытки. Завершите проведение или примите решение по ним.",
      409,
    );
    fail(
      !attempts.some(
        (a) =>
          !a.trial &&
          !a.excludedFromResults &&
          a.status === "completed" &&
          summarize(a).pending,
      ),
      "Есть работы, ожидающие проверки.",
      409,
    );
    const ranked = rankAttempts(
      attempts,
      run.settings.attemptSelection,
      run.settings.tieBreak,
    );
    fail(
      !ranked.some((a) => a.summary.pending),
      "Есть работы, ожидающие проверки.",
      409,
    );
    const rules = release.awardRules || [];
    const candidates = [];
    for (const a of ranked) {
      for (const rule of rules) {
        const match =
          rule.mode === "participation" ||
          (rule.mode === "place" &&
            a.place >= Number(rule.from || 1) &&
            a.place <= Number(rule.to || rule.from || 1)) ||
          (rule.mode === "score" &&
            a.summary.score >= Number(rule.from || 0) &&
            a.summary.score <= Number(rule.to ?? Infinity)) ||
          (rule.mode === "nomination" &&
            (run.nominations?.[rule.id] || rule.participantIds || []).includes(
              a.participantId,
            ));
        if (match)
          candidates.push({
            id: hash(a.id + ":" + rule.id),
            attemptId: a.id,
            participantId: a.participantId,
            participant: a.participant,
            score: a.summary.score,
            maxScore: a.summary.maxScore,
            place: a.place,
            ruleId: rule.id,
            templateId: rule.templateId,
            degree: rule.degree || "",
            nomination: rule.title || "",
            issuer: rule.issuer || "",
            order: rule.order || "",
            date: new Intl.DateTimeFormat("sv-SE", {
              timeZone: "Europe/Moscow",
            }).format(new Date()),
            event: release.title,
            fullName: a.participant.fullName,
            institution: a.participant.institution,
            groupName: a.participant.groupName,
            mentorName: a.participant.mentorName,
          });
      }
    }
    return {
      runId: key,
      candidates,
      resultHash: hash({
        results: ranked.map((a) => ({
          id: a.id,
          summary: a.summary,
          place: a.place,
        })),
        nominations: run.nominations || {},
      }),
      rulesHash: hash(rules),
    };
  }
  approveAwards(user, key, body) {
    const preview = this.awardPreview(user, key);
    fail(
      preview.resultHash === body.resultHash,
      "Результаты изменились. Обновите предварительный список.",
      409,
    );
    const overrides = body.overrides || {};
    for (const c of preview.candidates) {
      if (overrides[c.id]) {
        fail(
          cleanText(overrides[c.id].reason),
          "Укажите причину изменения награды.",
        );
        const change = overrides[c.id];
        if (change.exclude) c.excluded = true;
        if (change.templateId) {
          this.get(user, "template", change.templateId);
          c.templateId = change.templateId;
        }
        if (change.degree !== undefined) c.degree = cleanText(change.degree);
        if (change.nomination !== undefined)
          c.nomination = cleanText(change.nomination);
        c.overrideReason = cleanText(change.reason);
      }
    }
    for (const c of preview.candidates.filter((c) => !c.excluded))
      this.get(user, "template", c.templateId);
    const run = this.get(user, "run", key, true);
    run.awardsApproved = true;
    run.approvedAwards = preview;
    run.approvedAt = now();
    this.store.put("run", key, run.owner, run, run.projectId);
    this.store.audit(user.id, "awards.approved", key, {
      resultHash: preview.resultHash,
      overrides,
    });
    return preview;
  }
}
