const fs = require("fs");
const path = require("path");
const http = require("http");
const { URL } = require("url");
const {
  initStorage,
  loadOlympiad,
  loadSettings,
  loadAttempts,
  saveAttempts,
  upsertAttempt,
  loadAdminSessions,
  saveAdminSessions,
  ROOT_DIR
} = require("./src/store");
const {
  parseBody,
  sendJson,
  generateId,
  nowIso,
  normalizeText
} = require("./src/utils");
const {
  scoreQuestion,
  summarizeAttempt,
  diplomaByScore,
  compareAttemptsByRank
} = require("./src/scoring");
const { buildVariant, getCurrentQuestion, getCurrentTour, sanitizeQuestion } = require("./src/variant");
const { createAttemptsCsv, saveExportFile } = require("./src/exporter");
const { ensureFolder, uploadBuffer } = require("./src/yandex-disk");

const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const PORT = Number(process.env.PORT) || 3100;
const HOST = process.env.HOST || "0.0.0.0";

const storageReady = initStorage();

function isOlympiadAvailable(olympiad) {
  const now = new Date();
  const start = olympiad.startAt ? new Date(olympiad.startAt) : null;
  const end = olympiad.endAt ? new Date(olympiad.endAt) : null;
  if (start && now < start) {
    return false;
  }
  if (end && now > end) {
    return false;
  }
  return true;
}

function validateParticipantProfile(payload) {
  const profile = {
    fullName: String(payload.fullName || "").trim(),
    institution: String(payload.institution || "").trim(),
    groupName: String(payload.groupName || "").trim(),
    mentorName: String(payload.mentorName || "").trim()
  };

  if (!profile.fullName || !profile.institution || !profile.groupName) {
    return {
      valid: false,
      message: "Заполните ФИО, учебное заведение и группу."
    };
  }

  return { valid: true, profile };
}

function makeParticipantSignature(profile) {
  return [
    normalizeText(profile.fullName),
    normalizeText(profile.institution),
    normalizeText(profile.groupName)
  ].join("|");
}

function getOlympiadPublicData(olympiad) {
  return {
    id: olympiad.id,
    slug: olympiad.slug,
    title: olympiad.title,
    subtitle: olympiad.subtitle,
    description: olympiad.description,
    durationMinutes: olympiad.durationMinutes,
    startAt: olympiad.startAt,
    endAt: olympiad.endAt,
    registrationMode: olympiad.registrationMode,
    participantFields: olympiad.participantFields || [],
    methodologicalBasis: olympiad.methodologicalBasis || null,
    scoring: olympiad.scoring || null,
    tours: (olympiad.tours || []).map((tour) => ({
      id: tour.id,
      code: tour.code,
      order: tour.order,
      title: tour.title,
      description: tour.description,
      timeLimitMinutes: tour.timeLimitMinutes,
      maxScore: tour.maxScore
    }))
  };
}

function getAttemptIndex(allAttempts, attemptId) {
  return allAttempts.findIndex((attempt) => attempt.id === attemptId);
}

async function saveAttempt(allAttempts, attempt) {
  const index = getAttemptIndex(allAttempts, attempt.id);
  if (index >= 0) {
    allAttempts[index] = attempt;
    await upsertAttempt(attempt);
  }
}

function currentOlympiadAttempts(allAttempts, olympiadId) {
  return allAttempts.filter((attempt) => attempt.olympiadId === olympiadId);
}

function findAttemptById(allAttempts, attemptId) {
  return allAttempts.find((attempt) => attempt.id === attemptId) || null;
}

function getQuestionLog(attempt, questionId) {
  attempt.questionLog = attempt.questionLog || {};
  if (!attempt.questionLog[questionId]) {
    attempt.questionLog[questionId] = {};
  }
  return attempt.questionLog[questionId];
}

function markQuestionPresented(attempt) {
  const question = getCurrentQuestion(attempt);
  if (!question) {
    return;
  }

  const entry = getQuestionLog(attempt, question.id);
  if (!entry.presentedAt) {
    entry.presentedAt = nowIso();
    entry.sourceId = question.sourceId;
    entry.tourId = question.tourId;
    entry.optionOrder = Array.isArray(question.options)
      ? question.options.map((option) => option.id)
      : [];
    entry.itemOrder = Array.isArray(question.items)
      ? question.items.map((item) => item.id)
      : [];
  }
}

function startTourIfNeeded(attempt, tour) {
  attempt.tourStates = attempt.tourStates || {};
  if (!attempt.tourStates[tour.id]) {
    attempt.tourStates[tour.id] = {
      startedAt: nowIso(),
      finishedAt: null
    };
  }
}

function getTourState(attempt, tourId) {
  return attempt.tourStates ? attempt.tourStates[tourId] || null : null;
}

function getTiming(attempt) {
  const currentTour = getCurrentTour(attempt);
  const now = Date.now();
  const totalRemainingMs = Math.max(
    0,
    new Date(attempt.expiresAt).getTime() - now
  );

  let tourRemainingMs = totalRemainingMs;
  if (currentTour) {
    const tourState = getTourState(attempt, currentTour.id);
    if (tourState && tourState.startedAt) {
      const tourDeadline =
        new Date(tourState.startedAt).getTime() +
        currentTour.timeLimitMinutes * 60 * 1000;
      tourRemainingMs = Math.max(0, tourDeadline - now);
    }
  }

  return {
    totalRemainingMs,
    tourRemainingMs
  };
}

function finalizeAttempt(olympiad, attempt, reason = "finished") {
  const summary = summarizeAttempt(olympiad, attempt);
  attempt.status = reason === "expired" ? "expired" : "reviewed";
  attempt.finishedAt = nowIso();
  attempt.totalFinalScore = summary.totalFinalScore;
  attempt.totalPenalty = summary.totalPenalty;
  attempt.finalSummary = summary;
  return attempt;
}

function advanceToNextTour(attempt) {
  const currentTour = getCurrentTour(attempt);
  if (!currentTour) {
    return false;
  }

  const currentTourState = getTourState(attempt, currentTour.id);
  if (currentTourState && !currentTourState.finishedAt) {
    currentTourState.finishedAt = nowIso();
  }

  const nextTour = (attempt.variant.tours || []).find(
    (tour) => tour.order === currentTour.order + 1
  );
  if (!nextTour) {
    attempt.currentStepIndex = attempt.variant.questions.length;
    return false;
  }

  attempt.currentStepIndex = nextTour.stepStart;
  startTourIfNeeded(attempt, nextTour);
  markQuestionPresented(attempt);
  return true;
}

function normalizeAttemptState(olympiad, attempt) {
  if (!attempt || attempt.status !== "in_progress" || !attempt.variant) {
    return attempt;
  }

  if (Date.now() > new Date(attempt.expiresAt).getTime()) {
    return finalizeAttempt(olympiad, attempt, "expired");
  }

  let currentTour = getCurrentTour(attempt);
  if (!currentTour) {
    return finalizeAttempt(olympiad, attempt, "finished");
  }

  startTourIfNeeded(attempt, currentTour);

  while (currentTour) {
    const timing = getTiming(attempt);
    if (timing.totalRemainingMs <= 0) {
      return finalizeAttempt(olympiad, attempt, "expired");
    }
    if (timing.tourRemainingMs > 0) {
      break;
    }

    const moved = advanceToNextTour(attempt);
    if (!moved) {
      return finalizeAttempt(olympiad, attempt, "finished");
    }
    currentTour = getCurrentTour(attempt);
  }

  markQuestionPresented(attempt);
  return attempt;
}

function questionCount(attempt) {
  return attempt.variant && Array.isArray(attempt.variant.questions)
    ? attempt.variant.questions.length
    : 0;
}

function buildProgress(attempt) {
  const currentQuestion = getCurrentQuestion(attempt);
  const currentTour = getCurrentTour(attempt);
  const answeredCount = Object.keys(attempt.answers || {}).length;
  const totalQuestions = questionCount(attempt);

  let tourQuestionCount = 0;
  let tourQuestionIndex = 0;

  if (currentTour) {
    tourQuestionCount = currentTour.questionCount;
    tourQuestionIndex = currentQuestion ? currentQuestion.sequenceInTour : currentTour.questionCount;
  }

  return {
    answeredCount,
    totalQuestions,
    currentQuestionIndex: currentQuestion ? currentQuestion.globalIndex : totalQuestions,
    tourQuestionIndex,
    tourQuestionCount
  };
}

function buildAttemptView(olympiad, attempt, settings) {
  const summary = summarizeAttempt(olympiad, attempt);
  const currentQuestion = getCurrentQuestion(attempt);
  const currentTour = getCurrentTour(attempt);

  return {
    id: attempt.id,
    participant: attempt.participant,
    status: attempt.status,
    startedAt: attempt.startedAt,
    finishedAt: attempt.finishedAt,
    expiresAt: attempt.expiresAt,
    currentStepIndex: attempt.currentStepIndex,
    progress: buildProgress(attempt),
    timing: getTiming(attempt),
    currentTour: currentTour
      ? {
          id: currentTour.id,
          code: currentTour.code,
          order: currentTour.order,
          title: currentTour.title,
          description: currentTour.description,
          timeLimitMinutes: currentTour.timeLimitMinutes,
          maxScore: currentTour.maxScore
        }
      : null,
    currentQuestion: sanitizeQuestion(currentQuestion, attempt),
    summary: {
      ...summary,
      totalFinalScore: settings.showParticipantScore
        ? summary.totalFinalScore
        : null,
      tourScores: settings.showParticipantScore
        ? summary.tourScores
        : summary.tourScores.map((tour) => ({
            tourId: tour.tourId,
            code: tour.code,
            title: tour.title,
            finalScore: null,
            maxScore: tour.maxScore,
            penalty: null
          }))
    }
  };
}

function formatCorrectAnswer(question) {
  if (!question) {
    return "";
  }

  if (question.type === "single_choice") {
    const correct = (question.options || []).find((option) => option.isCorrect);
    return correct ? correct.text : "";
  }

  if (question.type === "sequence_drag") {
    return (question.correctSequence || [])
      .map((itemId, index) => {
        const item = (question.items || []).find((entry) => entry.id === itemId);
        return `${index + 1}. ${item ? item.text : itemId}`;
      })
      .join("\n");
  }

  if (question.type === "ingredient_matrix") {
    return (question.correctIngredientIds || [])
      .map((itemId) => {
        const item = (question.items || []).find((entry) => entry.id === itemId);
        return item ? item.text : itemId;
      })
      .join(", ");
  }

  if (question.type === "bucket_sort") {
    return (question.buckets || [])
      .map((bucket) => {
        const items = (question.items || [])
          .filter((item) => question.correctBuckets[item.id] === bucket.id)
          .map((item) => item.text);
        return `${bucket.label}: ${items.join(", ")}`;
      })
      .join("\n");
  }

  return "";
}

async function requireAdmin(req) {
  const sessions = await loadAdminSessions();
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();
  return sessions.find(
    (session) => session.token === token && session.expiresAt > Date.now()
  );
}

async function buildRankedAttempts(olympiad, settings) {
  const attempts = currentOlympiadAttempts(await loadAttempts(), olympiad.id)
    .map((attempt) => {
      const normalized = normalizeAttemptState(olympiad, attempt);
      return {
        ...normalized,
        summary: summarizeAttempt(olympiad, normalized),
        diploma: diplomaByScore(summarizeAttempt(olympiad, normalized).totalFinalScore)
      };
    })
    .sort(compareAttemptsByRank)
    .map((attempt, index) => ({
      rank: index + 1,
      id: attempt.id,
      participant: attempt.participant,
      status: attempt.status,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      summary: settings.showParticipantScore
        ? attempt.summary
        : { ...attempt.summary, totalFinalScore: null },
      diploma: attempt.diploma
    }));

  return attempts;
}

async function buildExportRows(olympiad) {
  return currentOlympiadAttempts(await loadAttempts(), olympiad.id)
    .map((attempt) => {
      const summary = summarizeAttempt(olympiad, attempt);
      const byTour = Object.fromEntries(
        summary.tourScores.map((tour) => [tour.tourId, tour.finalScore])
      );
      return {
        fullName: attempt.participant.fullName,
        institution: attempt.participant.institution,
        groupName: attempt.participant.groupName,
        mentorName: attempt.participant.mentorName || "",
        status: attempt.status,
        startedAt: attempt.startedAt || "",
        finishedAt: attempt.finishedAt || "",
        totalFinalScore: summary.totalFinalScore,
        diploma: diplomaByScore(summary.totalFinalScore),
        tour1: byTour["tour-1"] || 0,
        tour2: byTour["tour-2"] || 0,
        tour3: byTour["tour-3"] || 0,
        tour4: byTour["tour-4"] || 0,
        tour5: byTour["tour-5"] || 0,
        totalDurationMs: summary.totalDurationMs
      };
    });
}

async function uploadExportsToYandexDisk(olympiad, settings) {
  const disk = settings.yandexDiskIntegration || {};
  if (!disk.enabled || !disk.oauthToken) {
    throw new Error("В настройках не включена интеграция с Яндекс Диском или не указан OAuth-токен.");
  }

  const allAttempts = await loadAttempts();
  const rows = await buildExportRows(olympiad);
  const timestamp = Date.now();
  const baseFolder = `${disk.folder || "/Олимпиада_Национальные_кухни"}/${new Date()
    .toISOString()
    .slice(0, 10)}`;
  await ensureFolder(baseFolder, disk.oauthToken);

  const csvFileName = `results_${timestamp}.csv`;
  const jsonFileName = `results_${timestamp}.json`;
  const csvContent = createAttemptsCsv(rows);
  const jsonContent = JSON.stringify(
    currentOlympiadAttempts(allAttempts, olympiad.id),
    null,
    2
  );

  const localCsvPath = saveExportFile(csvFileName, csvContent);
  const localJsonPath = saveExportFile(jsonFileName, jsonContent);

  await uploadBuffer(`${baseFolder}/${csvFileName}`, csvContent, disk.oauthToken);
  await uploadBuffer(`${baseFolder}/${jsonFileName}`, jsonContent, disk.oauthToken);

  return {
    folder: baseFolder,
    files: [
      { name: csvFileName, localPath: localCsvPath },
      { name: jsonFileName, localPath: localJsonPath }
    ]
  };
}

function serveStatic(req, res, pathname) {
  const filePath = path.join(
    PUBLIC_DIR,
    pathname === "/" ? "index.html" : pathname.slice(1)
  );

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { ok: false, message: "Доступ запрещён." });
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendJson(res, 404, { ok: false, message: "Файл не найден." });
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml"
  };

  res.writeHead(200, {
    "Content-Type": contentTypes[ext] || "application/octet-stream"
  });
  fs.createReadStream(filePath).pipe(res);
}

async function handleApi(req, res, url) {
  await storageReady;

  const method = req.method;
  const pathname = url.pathname;
  const olympiad = loadOlympiad();
  const settings = loadSettings();

  if (method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      app: "national-kitchens-olympiad",
      now: nowIso(),
      olympiadId: olympiad.id,
      schemaVersion: olympiad.schemaVersion,
      storageBackend: settings.storageBackend || "file"
    });
    return;
  }

  if (method === "GET" && pathname === "/api/public/olympiad") {
    sendJson(res, 200, { ok: true, data: getOlympiadPublicData(olympiad) });
    return;
  }

  if (method === "POST" && pathname === "/api/public/register") {
    const body = await parseBody(req);
    const validation = validateParticipantProfile(body);
    if (!validation.valid) {
      sendJson(res, 400, { ok: false, message: validation.message });
      return;
    }

    if (!isOlympiadAvailable(olympiad)) {
      sendJson(res, 403, { ok: false, message: "Олимпиада сейчас недоступна." });
      return;
    }

    const signature = makeParticipantSignature(validation.profile);
    const attempts = currentOlympiadAttempts(await loadAttempts(), olympiad.id).filter(
      (attempt) => attempt.participantSignature === signature
    );
    const activeAttempt = attempts.find((attempt) => attempt.status === "in_progress");
    const completedAttempt = attempts.find((attempt) => attempt.status !== "in_progress");

    sendJson(res, 200, {
      ok: true,
      data: {
        participant: validation.profile,
        activeAttemptId: activeAttempt ? activeAttempt.id : null,
        alreadyCompleted: Boolean(completedAttempt && !activeAttempt)
      }
    });
    return;
  }

  if (method === "POST" && pathname === "/api/public/attempts/start") {
    const body = await parseBody(req);
    const validation = validateParticipantProfile(body.participant || body);
    if (!validation.valid) {
      sendJson(res, 400, { ok: false, message: validation.message });
      return;
    }

    const participantSignature = makeParticipantSignature(validation.profile);
    const allAttempts = await loadAttempts();
    const currentAttempts = currentOlympiadAttempts(allAttempts, olympiad.id);
    const activeAttempt = currentAttempts.find(
      (attempt) =>
        attempt.participantSignature === participantSignature &&
        attempt.status === "in_progress"
    );

    if (activeAttempt) {
      const normalized = normalizeAttemptState(olympiad, activeAttempt);
      await saveAttempt(allAttempts, normalized);
      sendJson(res, 200, {
        ok: true,
        data: buildAttemptView(olympiad, normalized, settings)
      });
      return;
    }

    const completedAttempt = currentAttempts.find(
      (attempt) =>
        attempt.participantSignature === participantSignature &&
        attempt.status !== "in_progress"
    );
    if (completedAttempt) {
      sendJson(res, 403, {
        ok: false,
        message: "Для этого участника попытка уже завершена."
      });
      return;
    }

    const variant = buildVariant(olympiad);
    const attempt = {
      id: generateId("attempt"),
      olympiadId: olympiad.id,
      schemaVersion: olympiad.schemaVersion || 2,
      participant: validation.profile,
      participantSignature,
      startedAt: nowIso(),
      expiresAt: new Date(
        Date.now() + olympiad.durationMinutes * 60 * 1000
      ).toISOString(),
      finishedAt: null,
      status: "in_progress",
      currentStepIndex: 0,
      variant,
      answers: {},
      tourStates: {
        [variant.tours[0].id]: {
          startedAt: nowIso(),
          finishedAt: null
        }
      },
      questionLog: {},
      totalFinalScore: 0,
      totalPenalty: 0
    };

    markQuestionPresented(attempt);
    allAttempts.push(attempt);
    await upsertAttempt(attempt);

    sendJson(res, 201, {
      ok: true,
      data: buildAttemptView(olympiad, attempt, settings)
    });
    return;
  }

  if (method === "GET" && pathname.match(/^\/api\/public\/attempts\/[^/]+$/)) {
    const attemptId = pathname.split("/")[4];
    const allAttempts = await loadAttempts();
    const attempt = findAttemptById(allAttempts, attemptId);
    if (!attempt || attempt.olympiadId !== olympiad.id) {
      sendJson(res, 404, { ok: false, message: "Попытка не найдена." });
      return;
    }

    const normalized = normalizeAttemptState(olympiad, attempt);
    await saveAttempt(allAttempts, normalized);
    sendJson(res, 200, {
      ok: true,
      data: buildAttemptView(olympiad, normalized, settings)
    });
    return;
  }

  if (method === "GET" && pathname.match(/^\/api\/public\/attempts\/[^/]+\/current$/)) {
    const attemptId = pathname.split("/")[4];
    const allAttempts = await loadAttempts();
    const attempt = findAttemptById(allAttempts, attemptId);
    if (!attempt || attempt.olympiadId !== olympiad.id) {
      sendJson(res, 404, { ok: false, message: "Попытка не найдена." });
      return;
    }

    const normalized = normalizeAttemptState(olympiad, attempt);
    await saveAttempt(allAttempts, normalized);
    sendJson(res, 200, {
      ok: true,
      data: buildAttemptView(olympiad, normalized, settings)
    });
    return;
  }

  if (method === "POST" && pathname.match(/^\/api\/public\/attempts\/[^/]+\/answer$/)) {
    const attemptId = pathname.split("/")[4];
    const body = await parseBody(req);
    const allAttempts = await loadAttempts();
    let attempt = findAttemptById(allAttempts, attemptId);

    if (!attempt || attempt.olympiadId !== olympiad.id) {
      sendJson(res, 404, { ok: false, message: "Попытка не найдена." });
      return;
    }

    attempt = normalizeAttemptState(olympiad, attempt);
    if (attempt.status !== "in_progress") {
      await saveAttempt(allAttempts, attempt);
      sendJson(res, 409, {
        ok: false,
        message: "Попытка уже завершена."
      });
      return;
    }

    const currentQuestion = getCurrentQuestion(attempt);
    if (!currentQuestion) {
      const finalized = finalizeAttempt(olympiad, attempt, "finished");
      await saveAttempt(allAttempts, finalized);
      sendJson(res, 200, {
        ok: true,
        data: buildAttemptView(olympiad, finalized, settings)
      });
      return;
    }

    const result = scoreQuestion(currentQuestion, body.answerPayload);
    const logEntry = getQuestionLog(attempt, currentQuestion.id);
    const savedAt = nowIso();
    const timeSpentMs = logEntry.presentedAt
      ? Math.max(0, new Date(savedAt).getTime() - new Date(logEntry.presentedAt).getTime())
      : 0;

    attempt.answers[currentQuestion.id] = {
      questionId: currentQuestion.id,
      sourceId: currentQuestion.sourceId,
      tourId: currentQuestion.tourId,
      answerPayload: body.answerPayload || {},
      autoScore: result.autoScore,
      finalScore: result.finalScore,
      penalty: result.penalty || 0,
      savedAt,
      timeSpentMs
    };

    logEntry.answeredAt = savedAt;
    logEntry.timeSpentMs = timeSpentMs;

    attempt.currentStepIndex += 1;
    if (attempt.currentStepIndex >= questionCount(attempt)) {
      attempt = finalizeAttempt(olympiad, attempt, "finished");
      await saveAttempt(allAttempts, attempt);
      sendJson(res, 200, {
        ok: true,
        data: buildAttemptView(olympiad, attempt, settings)
      });
      return;
    }

    const nextQuestion = getCurrentQuestion(attempt);
    const previousTourId = currentQuestion.tourId;
    if (nextQuestion && nextQuestion.tourId !== previousTourId) {
      const previousTourState = getTourState(attempt, previousTourId);
      if (previousTourState && !previousTourState.finishedAt) {
        previousTourState.finishedAt = savedAt;
      }
      const nextTour = getCurrentTour(attempt);
      if (nextTour) {
        startTourIfNeeded(attempt, nextTour);
      }
    }

    markQuestionPresented(attempt);
    attempt = normalizeAttemptState(olympiad, attempt);
    await saveAttempt(allAttempts, attempt);

    sendJson(res, 200, {
      ok: true,
      data: buildAttemptView(olympiad, attempt, settings)
    });
    return;
  }

  if (method === "POST" && pathname.match(/^\/api\/public\/attempts\/[^/]+\/finish$/)) {
    const attemptId = pathname.split("/")[4];
    const allAttempts = await loadAttempts();
    let attempt = findAttemptById(allAttempts, attemptId);

    if (!attempt || attempt.olympiadId !== olympiad.id) {
      sendJson(res, 404, { ok: false, message: "Попытка не найдена." });
      return;
    }

    attempt = finalizeAttempt(olympiad, attempt, "finished");
    await saveAttempt(allAttempts, attempt);
    sendJson(res, 200, {
      ok: true,
      data: buildAttemptView(olympiad, attempt, settings)
    });
    return;
  }

  if (method === "POST" && pathname === "/api/admin/login") {
    const body = await parseBody(req);
    if (body.password !== settings.adminPassword) {
      sendJson(res, 401, {
        ok: false,
        message: "Неверный пароль администратора."
      });
      return;
    }

    const sessions = (await loadAdminSessions()).filter(
      (session) => session.expiresAt > Date.now()
    );
    const token = generateId("admin");
    sessions.push({
      token,
      createdAt: nowIso(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    });
    await saveAdminSessions(sessions);
    sendJson(res, 200, { ok: true, data: { token } });
    return;
  }

  if (pathname.startsWith("/api/admin/")) {
    const session = await requireAdmin(req);
    if (!session) {
      sendJson(res, 401, {
        ok: false,
        message: "Требуется вход администратора."
      });
      return;
    }

    if (method === "GET" && pathname === "/api/admin/summary") {
      const ranked = await buildRankedAttempts(olympiad, settings);
      sendJson(res, 200, {
        ok: true,
        data: {
          olympiad: getOlympiadPublicData(olympiad),
          counts: {
            participants: new Set(
              ranked.map((item) => item.participant.fullName + item.participant.groupName)
            ).size,
            attempts: ranked.length,
            completed: ranked.filter((item) => item.status !== "in_progress").length
          }
        }
      });
      return;
    }

    if (method === "GET" && pathname === "/api/admin/attempts") {
      const attempts = (await buildRankedAttempts(olympiad, settings)).map((attempt) => ({
        rank: attempt.rank,
        id: attempt.id,
        fullName: attempt.participant.fullName,
        institution: attempt.participant.institution,
        groupName: attempt.participant.groupName,
        mentorName: attempt.participant.mentorName || "",
        status: attempt.status,
        startedAt: attempt.startedAt,
        finishedAt: attempt.finishedAt,
        totalFinalScore: attempt.summary.totalFinalScore,
        diploma: attempt.diploma
      }));

      sendJson(res, 200, { ok: true, data: attempts });
      return;
    }

    if (method === "GET" && pathname.match(/^\/api\/admin\/attempts\/[^/]+$/)) {
      const attemptId = pathname.split("/")[4];
      const allAttempts = await loadAttempts();
      const attempt = findAttemptById(allAttempts, attemptId);

      if (!attempt || attempt.olympiadId !== olympiad.id) {
        sendJson(res, 404, { ok: false, message: "Попытка не найдена." });
        return;
      }

      const summary = summarizeAttempt(olympiad, attempt);
      const detailTours = (attempt.variant.tours || []).map((tour) => ({
        id: tour.id,
        code: tour.code,
        title: tour.title,
        timeLimitMinutes: tour.timeLimitMinutes,
        maxScore: tour.maxScore,
        questionCount: tour.questionCount,
        score:
          summary.tourScores.find((item) => item.tourId === tour.id) || null,
        questions: (attempt.variant.questions || [])
          .filter((question) => question.tourId === tour.id)
          .map((question) => ({
            id: question.id,
            sourceId: question.sourceId,
            type: question.type,
            prompt: question.prompt,
            scenario: question.scenario || "",
            caseTitle: question.caseTitle || null,
            dishLabel: question.dishLabel || "",
            correctAnswer: formatCorrectAnswer(question),
            options: (question.options || []).map((option) => ({
              id: option.id,
              text: option.text,
              isCorrect: option.isCorrect
            })),
            items: question.items || [],
            slots: question.slots || [],
            buckets: question.buckets || [],
            answer: attempt.answers[question.id] || null,
            log: attempt.questionLog ? attempt.questionLog[question.id] || null : null,
            maxScore: question.maxScore
          }))
      }));

      sendJson(res, 200, {
        ok: true,
        data: {
          attempt: {
            id: attempt.id,
            participant: attempt.participant,
            status: attempt.status,
            startedAt: attempt.startedAt,
            finishedAt: attempt.finishedAt,
            variantMeta: {
              issuedQuestionIds: attempt.variant.issuedQuestionIds,
              optionOrderLog: attempt.variant.optionOrderLog,
              usedDishIds: attempt.variant.usedDishIds
            }
          },
          summary,
          tours: detailTours
        }
      });
      return;
    }

    if (method === "POST" && pathname === "/api/admin/exports/csv") {
      const fileName = `results_${Date.now()}.csv`;
      const filePath = saveExportFile(fileName, createAttemptsCsv(await buildExportRows(olympiad)));
      sendJson(res, 200, { ok: true, data: { fileName, filePath } });
      return;
    }

    if (method === "POST" && pathname === "/api/admin/exports/json") {
      const fileName = `results_${Date.now()}.json`;
      const filePath = saveExportFile(
        fileName,
        JSON.stringify(currentOlympiadAttempts(await loadAttempts(), olympiad.id), null, 2)
      );
      sendJson(res, 200, { ok: true, data: { fileName, filePath } });
      return;
    }

    if (method === "POST" && pathname === "/api/admin/disk/upload") {
      const result = await uploadExportsToYandexDisk(olympiad, settings);
      sendJson(res, 200, { ok: true, data: result });
      return;
    }
  }

  sendJson(res, 404, { ok: false, message: "Маршрут не найден." });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      message: error.message || "Внутренняя ошибка сервера."
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Olympiad server started on http://${HOST}:${PORT}`);
});
