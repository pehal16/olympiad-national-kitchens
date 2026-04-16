const fs = require("fs");
const path = require("path");
const http = require("http");
const { URL } = require("url");
const packageInfo = require("./package.json");
const {
  initStorage,
  loadOlympiad,
  loadSettings,
  loadAttempts,
  saveAttempts,
  upsertAttempt,
  loadAdminSessions,
  loadAttemptById,
  loadAdminSessionByToken,
  saveAdminSessions,
  loadContentDrafts,
  upsertContentDraft,
  deleteContentDraft,
  loadContentCustomQuestions,
  upsertContentCustomQuestion,
  deleteContentCustomQuestion,
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
const { buildQuestionCatalog, buildQuestionBankSummary } = require("./src/question-bank");
const { createAttemptsCsv, saveExportFile } = require("./src/exporter");
const { ensureFolder, uploadBuffer } = require("./src/yandex-disk");

const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const PORT = Number(process.env.PORT) || 3100;
const HOST = process.env.HOST || "0.0.0.0";
const APP_VERSION = packageInfo.version || "0.0.0";

const runtimeDiagnostics = {
  apiErrors: 0,
  lastApiErrorAt: null,
  lastApiErrorMessage: "",
  lastApiErrorRoute: ""
};

const CACHE_TTL_MS = 10_000;
const CONTENT_CACHE_TTL_MS = 20_000;
const runtimeCache = {
  settings: { value: null, loadedAt: 0 },
  olympiadBase: { value: null, loadedAt: 0 },
  customQuestionMap: { value: null, loadedAt: 0 },
  olympiadResolved: { value: null, loadedAt: 0 },
  adminAnalytics: { value: null, loadedAt: 0, revision: -1, olympiadId: "" },
  questionCatalog: { value: null, loadedAt: 0, revision: -1, olympiadId: "" },
  questionSummary: { value: null, loadedAt: 0, revision: -1, olympiadId: "" }
};
let attemptsRevision = 0;
let contentRevision = 0;

const storageReady = initStorage();

function noteApiError(pathname, error) {
  runtimeDiagnostics.apiErrors += 1;
  runtimeDiagnostics.lastApiErrorAt = nowIso();
  runtimeDiagnostics.lastApiErrorMessage = String(
    (error && error.message) || "Неизвестная ошибка сервера."
  );
  runtimeDiagnostics.lastApiErrorRoute = pathname || "";
}

function isCacheFresh(entry, ttlMs) {
  return Boolean(entry && entry.value) && Date.now() - entry.loadedAt < ttlMs;
}

function getCachedSettings() {
  if (isCacheFresh(runtimeCache.settings, CACHE_TTL_MS)) {
    return runtimeCache.settings.value;
  }

  const settings = loadSettings();
  runtimeCache.settings = {
    value: settings,
    loadedAt: Date.now()
  };
  return settings;
}

function getCachedOlympiadBase() {
  if (isCacheFresh(runtimeCache.olympiadBase, CACHE_TTL_MS)) {
    return runtimeCache.olympiadBase.value;
  }

  const olympiadBase = loadOlympiad();
  runtimeCache.olympiadBase = {
    value: olympiadBase,
    loadedAt: Date.now()
  };
  return olympiadBase;
}

async function getCachedCustomQuestionMap() {
  if (isCacheFresh(runtimeCache.customQuestionMap, CONTENT_CACHE_TTL_MS)) {
    return runtimeCache.customQuestionMap.value;
  }

  const customQuestionMap = await loadCustomQuestionMap();
  runtimeCache.customQuestionMap = {
    value: customQuestionMap,
    loadedAt: Date.now()
  };
  return customQuestionMap;
}

async function getResolvedOlympiad() {
  if (isCacheFresh(runtimeCache.olympiadResolved, CONTENT_CACHE_TTL_MS)) {
    return runtimeCache.olympiadResolved.value;
  }

  const olympiad = buildOlympiadWithCustomQuestions(
    getCachedOlympiadBase(),
    await getCachedCustomQuestionMap()
  );
  runtimeCache.olympiadResolved = {
    value: olympiad,
    loadedAt: Date.now()
  };
  return olympiad;
}

function invalidateAttemptCaches() {
  attemptsRevision += 1;
  runtimeCache.adminAnalytics = {
    value: null,
    loadedAt: 0,
    revision: -1,
    olympiadId: ""
  };
}

function invalidateContentCaches() {
  contentRevision += 1;
  runtimeCache.customQuestionMap = { value: null, loadedAt: 0 };
  runtimeCache.olympiadResolved = { value: null, loadedAt: 0 };
  runtimeCache.questionCatalog = {
    value: null,
    loadedAt: 0,
    revision: -1,
    olympiadId: ""
  };
  runtimeCache.questionSummary = {
    value: null,
    loadedAt: 0,
    revision: -1,
    olympiadId: ""
  };
}

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
    appVersion: APP_VERSION,
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

async function normalizeAndPersistIfChanged(olympiad, attempt) {
  if (!attempt) {
    return attempt;
  }

  const before = JSON.stringify(attempt);
  const normalized = normalizeAttemptState(olympiad, attempt);
  const after = JSON.stringify(normalized);

  if (before !== after) {
    await upsertAttempt(normalized);
    invalidateAttemptCaches();
  }

  return normalized;
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
  const routeTours = (attempt.variant?.tours || []).map((tour) => ({
    id: tour.id,
    code: tour.code,
    order: tour.order,
    title: tour.title,
    description: tour.description,
    timeLimitMinutes: tour.timeLimitMinutes,
    maxScore: tour.maxScore,
    questionCount: tour.questionCount,
    stepStart: tour.stepStart,
    stepEnd: tour.stepEnd
  }));
  const routeQuestions = (attempt.variant?.questions || []).map((question) =>
    sanitizeQuestion(question, attempt)
  );

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
    },
    route: {
      tours: routeTours,
      questions: routeQuestions
    }
  };
}

function buildAttemptPulse(olympiad, attempt, settings) {
  const currentTour = getCurrentTour(attempt);
  const summary = summarizeAttempt(olympiad, attempt);

  return {
    id: attempt.id,
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
          timeLimitMinutes: currentTour.timeLimitMinutes,
          maxScore: currentTour.maxScore
        }
      : null,
    summary:
      attempt.status === "in_progress"
        ? null
        : {
            ...summary,
            totalFinalScore: settings.showParticipantScore ? summary.totalFinalScore : null
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

function cloneValue(value) {
  return global.structuredClone
    ? global.structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function parseCookies(req) {
  const source = String(req.headers.cookie || "");
  if (!source) {
    return {};
  }

  return source.split(";").reduce((accumulator, part) => {
    const [rawKey, ...rest] = part.split("=");
    const key = String(rawKey || "").trim();
    if (!key) {
      return accumulator;
    }

    accumulator[key] = decodeURIComponent(rest.join("=").trim());
    return accumulator;
  }, {});
}

function buildAdminCookie(token, expiresAt) {
  const parts = [
    `olympiad_admin_token=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${24 * 60 * 60}`
  ];

  if (expiresAt) {
    parts.push(`Expires=${new Date(expiresAt).toUTCString()}`);
  }

  return parts.join("; ");
}

function getAdminRequestTokens(req) {
  const authHeader = req.headers.authorization || "";
  const headerToken = req.headers["x-admin-token"] || "";
  const cookieToken = parseCookies(req).olympiad_admin_token || "";
  const authToken = authHeader.replace("Bearer ", "");

  return Array.from(
    new Set(
      [cookieToken, headerToken, authToken]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

async function requireAdmin(req) {
  const tokens = getAdminRequestTokens(req);
  if (!tokens.length) {
    return null;
  }

  for (const token of tokens) {
    const directSession = await loadAdminSessionByToken(token);
    if (directSession?.expiresAt > Date.now()) {
      return directSession;
    }
  }

  const sessions = await loadAdminSessions();
  for (const token of tokens) {
    const session = sessions.find(
      (entry) => entry.token === token && entry.expiresAt > Date.now()
    );
    if (session) {
      return session;
    }
  }

  return null;
}

async function buildRankedAttempts(olympiad, settings, options = {}) {
  const exposeScores = options.forceScores || settings.showParticipantScore;
  const baseAttempts = options.attempts || currentOlympiadAttempts(await loadAttempts(), olympiad.id);

  const attempts = baseAttempts
    .map((attempt) => {
      const normalized = normalizeAttemptState(olympiad, attempt);
      const summary = summarizeAttempt(olympiad, normalized);
      return {
        ...normalized,
        summary,
        diploma: diplomaByScore(summary.totalFinalScore)
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
      summary: exposeScores
        ? attempt.summary
        : { ...attempt.summary, totalFinalScore: null },
      diploma: attempt.diploma
    }));

  return attempts;
}

function safeDateMs(value) {
  if (!value) {
    return 0;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeContentDraftPayload(payload) {
  const text = (value) => String(value || "").trim();
  const list = (value) =>
    (Array.isArray(value) ? value : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean);

  const difficulty = text(payload.difficulty || "basic");
  const difficultyMap = {
    basic: "Базовый уровень",
    standard: "Повышенный уровень",
    advanced: "Высокий уровень"
  };

  return {
    theme: text(payload.theme),
    topic: text(payload.topic),
    focus: text(payload.focus),
    studentAction: text(payload.studentAction),
    difficulty: ["basic", "standard", "advanced"].includes(difficulty) ? difficulty : "basic",
    difficultyLabel: text(payload.difficultyLabel) || difficultyMap[difficulty] || difficultyMap.basic,
    estimatedTimeSec: Math.max(15, Number(payload.estimatedTimeSec) || 60),
    okCodes: list(payload.okCodes),
    pkFocus: list(payload.pkFocus),
    methodicalPurpose: text(payload.methodicalPurpose),
    updatedAt: nowIso()
  };
}

async function getCachedAdminAnalytics(olympiad, settings) {
  if (
    runtimeCache.adminAnalytics.value &&
    runtimeCache.adminAnalytics.revision === attemptsRevision &&
    runtimeCache.adminAnalytics.olympiadId === olympiad.id &&
    Date.now() - runtimeCache.adminAnalytics.loadedAt < CACHE_TTL_MS
  ) {
    return runtimeCache.adminAnalytics.value;
  }

  const rawAttempts = currentOlympiadAttempts(await loadAttempts(), olympiad.id).map((attempt) =>
    normalizeAttemptState(olympiad, attempt)
  );
  const ranked = await buildRankedAttempts(olympiad, settings, {
    attempts: rawAttempts,
    forceScores: true
  });

  const analytics = { rawAttempts, ranked };
  runtimeCache.adminAnalytics = {
    value: analytics,
    loadedAt: Date.now(),
    revision: attemptsRevision,
    olympiadId: olympiad.id
  };
  return analytics;
}

async function getCachedQuestionCatalog(olympiadBase, customQuestionMap) {
  if (
    runtimeCache.questionCatalog.value &&
    runtimeCache.questionCatalog.revision === contentRevision &&
    runtimeCache.questionCatalog.olympiadId === olympiadBase.id &&
    Date.now() - runtimeCache.questionCatalog.loadedAt < CONTENT_CACHE_TTL_MS
  ) {
    return runtimeCache.questionCatalog.value;
  }

  const catalog = buildQuestionCatalog(olympiadBase, customQuestionMap);
  runtimeCache.questionCatalog = {
    value: catalog,
    loadedAt: Date.now(),
    revision: contentRevision,
    olympiadId: olympiadBase.id
  };
  return catalog;
}

async function getCachedQuestionSummary(olympiadBase, customQuestionMap) {
  if (
    runtimeCache.questionSummary.value &&
    runtimeCache.questionSummary.revision === contentRevision &&
    runtimeCache.questionSummary.olympiadId === olympiadBase.id &&
    Date.now() - runtimeCache.questionSummary.loadedAt < CONTENT_CACHE_TTL_MS
  ) {
    return runtimeCache.questionSummary.value;
  }

  const summary = buildQuestionBankSummary(olympiadBase, customQuestionMap);
  runtimeCache.questionSummary = {
    value: summary,
    loadedAt: Date.now(),
    revision: contentRevision,
    olympiadId: olympiadBase.id
  };
  return summary;
}

function normalizeCustomQuestionPayload(payload, existingQuestion = null) {
  const text = (value) => String(value || "").trim();
  const normalizeOption = (value) => text(value).replace(/\s+/g, " ").trim();
  const parseList = (value) =>
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const allowedTours = new Set(["T1", "T4"]);
  const cuisineCatalog = {
    ru: { label: "Русская кухня", group: "slavic", groupLabel: "Славянские кухни" },
    fr: { label: "Французская кухня", group: "western_europe", groupLabel: "Западная Европа" },
    it: { label: "Итальянская кухня", group: "western_europe", groupLabel: "Западная Европа" },
    jp: { label: "Японская кухня", group: "east_asia", groupLabel: "Восточная Азия" },
    mx: { label: "Мексиканская кухня", group: "latin_america", groupLabel: "Латинская Америка" },
    de: { label: "Немецкая кухня", group: "western_europe", groupLabel: "Западная Европа" },
    uk: { label: "Английская кухня", group: "western_europe", groupLabel: "Западная Европа" },
    balkan: { label: "Балканские кухни", group: "balkan", groupLabel: "Балканский регион" },
    mixed: { label: "Смешанный блок", group: "general", groupLabel: "Общий блок" }
  };

  const prompt = text(payload.prompt);
  if (!prompt) {
    throw new Error("Введите формулировку вопроса.");
  }

  const tourCode = text(payload.tourCode || "T1").toUpperCase();
  if (!allowedTours.has(tourCode)) {
    throw new Error("Сейчас авторские тесты можно добавлять для туров T1 и T4.");
  }

  const cuisine = text(payload.cuisine || "mixed").toLowerCase();
  const cuisineMeta = cuisineCatalog[cuisine];
  if (!cuisineMeta) {
    throw new Error("Выберите кухню для нового вопроса.");
  }

  const options = (Array.isArray(payload.options) ? payload.options : [])
    .map((option, index) => ({
      id: `option-${index + 1}`,
      text: normalizeOption(option.text),
      isCorrect: Boolean(option.isCorrect)
    }))
    .filter((option) => option.text);

  if (options.length < 4) {
    throw new Error("Заполните не меньше четырёх вариантов ответа.");
  }

  if (options.filter((option) => option.isCorrect).length !== 1) {
    throw new Error("Отметьте ровно один правильный вариант ответа.");
  }

  const difficulty = text(payload.difficulty || "basic");
  const difficultyMap = {
    basic: "Базовый уровень",
    standard: "Повышенный уровень",
    advanced: "Высокий уровень"
  };

  const id = existingQuestion?.id || text(payload.id) || generateId("custom_test");
  const dishLabel = text(payload.dishLabel || payload.theme || "Авторский тест");
  const estimatedTimeSec = Math.max(20, Number(payload.estimatedTimeSec) || 60);
  const maxScore = Math.max(1, Number(payload.maxScore) || (tourCode === "T4" ? 4 : 2));
  const createdAt = existingQuestion?.metadata?.createdAt || nowIso();

  return {
    id,
    type: "single_choice",
    tourCode,
    cuisine,
    cuisineLabel: cuisineMeta.label,
    cuisineGroup: cuisineMeta.group,
    cuisineGroupLabel: cuisineMeta.groupLabel,
    dishId: id,
    dishLabel,
    prompt,
    scenario: text(payload.scenario),
    note: text(payload.note),
    maxScore,
    options,
    metadata: {
      theme: text(payload.theme || dishLabel),
      topic: text(payload.topic),
      focus: text(payload.focus),
      studentAction: text(payload.studentAction || "Выберите правильный ответ"),
      difficulty: ["basic", "standard", "advanced"].includes(difficulty) ? difficulty : "basic",
      difficultyLabel: difficultyMap[difficulty] || difficultyMap.basic,
      estimatedTimeSec,
      okCodes: parseList(payload.okCodes),
      pkFocus: parseList(payload.pkFocus),
      methodicalPurpose: text(payload.methodicalPurpose),
      createdAt,
      updatedAt: nowIso()
    }
  };
}

function latestAttemptActivity(attempt) {
  const timestamps = [attempt.startedAt, attempt.finishedAt];

  Object.values(attempt.answers || {}).forEach((answer) => {
    if (answer && answer.savedAt) {
      timestamps.push(answer.savedAt);
    }
  });

  Object.values(attempt.questionLog || {}).forEach((entry) => {
    if (entry && entry.presentedAt) {
      timestamps.push(entry.presentedAt);
    }
    if (entry && entry.answeredAt) {
      timestamps.push(entry.answeredAt);
    }
  });

  const validTimestamps = timestamps
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  if (!validTimestamps.length) {
    return null;
  }

  return new Date(Math.max(...validTimestamps)).toISOString();
}

function sortCatalog(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "ru-RU")
  );
}

async function loadCustomQuestionMap() {
  return (await loadContentCustomQuestions()) || {};
}

function buildOlympiadWithCustomQuestions(olympiad, customQuestionsMap = {}) {
  const customQuestions = Object.values(customQuestionsMap || {});
  if (!customQuestions.length) {
    return olympiad;
  }

  const prepared = cloneValue(olympiad);
  prepared.questionBank = prepared.questionBank || {};
  prepared.questionBank.tour1Pools = Array.isArray(prepared.questionBank.tour1Pools)
    ? prepared.questionBank.tour1Pools
    : [];
  prepared.questionBank.tour4Tasks = Array.isArray(prepared.questionBank.tour4Tasks)
    ? prepared.questionBank.tour4Tasks
    : [];

  const tour1Questions = customQuestions.filter(
    (question) => question.type === "single_choice" && question.tourCode === "T1"
  );
  if (tour1Questions.length) {
    prepared.questionBank.tour1Pools.push({
      id: "author-custom-tests",
      title: "Авторские тестовые вопросы",
      questions: tour1Questions.map((question) => cloneValue(question))
    });
  }

  const tour4Questions = customQuestions.filter(
    (question) => question.type === "single_choice" && question.tourCode === "T4"
  );
  if (tour4Questions.length) {
    prepared.questionBank.tour4Tasks.push(
      ...tour4Questions.map((question) => cloneValue(question))
    );
  }

  return prepared;
}

function buildSuspiciousAttemptReport(olympiad, attempt, summary) {
  const answers = Object.keys(attempt.answers || {}).length;
  const totalQuestions = questionCount(attempt);
  const timings = Object.values(attempt.questionLog || {})
    .map((entry) => Number(entry.timeSpentMs))
    .filter((value) => Number.isFinite(value) && value >= 0);

  const veryFastAnswers = timings.filter((value) => value > 0 && value < 1500).length;
  const instantAnswers = timings.filter((value) => value >= 0 && value < 400).length;
  const averageTimeMs = timings.length
    ? Math.round(timings.reduce((sum, value) => sum + value, 0) / timings.length)
    : null;

  const signals = [];
  let severity = 0;

  if (attempt.status !== "in_progress" && answers < totalQuestions) {
    signals.push("Попытка завершена не по всем вопросам");
    severity += 2;
  }

  if (veryFastAnswers >= 4 && veryFastAnswers / Math.max(1, timings.length) >= 0.35) {
    signals.push(`Много очень быстрых ответов: ${veryFastAnswers}`);
    severity += 2;
  }

  if (instantAnswers >= 2) {
    signals.push(`Есть почти мгновенные ответы: ${instantAnswers}`);
    severity += 1;
  }

  if (
    summary.totalDurationMs &&
    answers >= 12 &&
    summary.totalDurationMs < Math.max(answers, 1) * 1500
  ) {
    signals.push("Общая скорость прохождения аномально высокая");
    severity += 1;
  }

  const startedAtMs = safeDateMs(attempt.startedAt);
  if (
    attempt.status === "in_progress" &&
    startedAtMs &&
    Date.now() - startedAtMs > 30 * 60 * 1000
  ) {
    signals.push("Попытка зависла в статусе in_progress более 30 минут");
    severity += 1;
  }

  if (!signals.length) {
    return null;
  }

  return {
    id: attempt.id,
    participant: attempt.participant,
    status: attempt.status,
    totalFinalScore: summary.totalFinalScore,
    answeredCount: answers,
    totalQuestions,
    averageTimeMs,
    veryFastAnswers,
    instantAnswers,
    lastActivityAt: latestAttemptActivity(attempt),
    severity,
    signals
  };
}

function buildAdminSummary(olympiad, rawAttempts, ranked, settings) {
  const participantKeys = new Set();
  const institutions = new Set();
  const groups = new Set();
  const mentors = new Set();
  const statuses = new Set();
  const activeAttempts = rawAttempts.filter((attempt) => attempt.status === "in_progress");
  const institutionMap = new Map();
  const scoredAttempts = rawAttempts.map((attempt) => ({
    attempt,
    summary: summarizeAttempt(olympiad, attempt)
  }));

  rawAttempts.forEach((attempt) => {
    const participant = attempt.participant || {};
    const signature =
      attempt.participantSignature ||
      makeParticipantSignature({
        fullName: participant.fullName || "",
        institution: participant.institution || "",
        groupName: participant.groupName || "",
        mentorName: participant.mentorName || ""
      });

    participantKeys.add(signature);

    if (participant.institution) {
      institutions.add(participant.institution);
    }
    if (participant.groupName) {
      groups.add(participant.groupName);
    }
    if (participant.mentorName) {
      mentors.add(participant.mentorName);
    }
    if (attempt.status) {
      statuses.add(attempt.status);
    }
  });

  const lastActivityCandidates = rawAttempts
    .map((attempt) => latestAttemptActivity(attempt))
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  const completedAttempts = rawAttempts.filter((attempt) => attempt.status !== "in_progress");
  const completedAttemptSummaries = scoredAttempts
    .filter((entry) => entry.attempt.status !== "in_progress")
    .map((entry) => entry.summary);

  const tourAnalytics = (olympiad.tours || []).map((tour) => {
    const scores = completedAttemptSummaries
      .map((summary) => summary.tourScores.find((item) => item.tourId === tour.id))
      .filter(Boolean);

    const totalScore = scores.reduce((sum, item) => sum + item.finalScore, 0);

    return {
      tourId: tour.id,
      code: tour.code,
      title: tour.title,
      attempts: scores.length,
      averageScore: scores.length ? Number((totalScore / scores.length).toFixed(2)) : 0,
      completionRate: completedAttempts.length
        ? Number(((scores.length / completedAttempts.length) * 100).toFixed(1))
        : 0,
      maxScore: tour.maxScore
    };
  });

  ranked.forEach((attempt) => {
    const participant = attempt.participant || {};
    const institutionName = participant.institution || "Не указано";
    if (!institutionMap.has(institutionName)) {
      institutionMap.set(institutionName, {
        institution: institutionName,
        participants: new Set(),
        groups: new Set(),
        mentors: new Set(),
        attempts: 0,
        completed: 0,
        active: 0,
        totalScore: 0
      });
    }

    const entry = institutionMap.get(institutionName);
    entry.attempts += 1;
    entry.participants.add(
      makeParticipantSignature({
        fullName: participant.fullName || "",
        institution: participant.institution || "",
        groupName: participant.groupName || "",
        mentorName: participant.mentorName || ""
      })
    );
    if (participant.groupName) {
      entry.groups.add(participant.groupName);
    }
    if (participant.mentorName) {
      entry.mentors.add(participant.mentorName);
    }
    if (attempt.status === "in_progress") {
      entry.active += 1;
    } else {
      entry.completed += 1;
      entry.totalScore += Number(attempt.summary.totalFinalScore || 0);
    }
  });

  const institutionAnalytics = Array.from(institutionMap.values())
    .map((entry) => ({
      institution: entry.institution,
      participants: entry.participants.size,
      groups: entry.groups.size,
      mentors: entry.mentors.size,
      attempts: entry.attempts,
      completed: entry.completed,
      active: entry.active,
      averageScore: entry.completed
        ? Number((entry.totalScore / entry.completed).toFixed(2))
        : 0
    }))
    .sort((left, right) => {
      if (right.attempts !== left.attempts) {
        return right.attempts - left.attempts;
      }
      return left.institution.localeCompare(right.institution, "ru-RU");
    });

  const suspiciousAttempts = scoredAttempts
    .map((entry) => buildSuspiciousAttemptReport(olympiad, entry.attempt, entry.summary))
    .filter(Boolean)
    .sort((left, right) => {
      if (right.severity !== left.severity) {
        return right.severity - left.severity;
      }
      return safeDateMs(right.lastActivityAt) - safeDateMs(left.lastActivityAt);
    })
    .slice(0, 12);

  const startedDates = rawAttempts
    .map((attempt) => attempt.startedAt)
    .filter(Boolean)
    .map((value) => value.slice(0, 10))
    .sort();

  return {
    olympiad: getOlympiadPublicData(olympiad),
    counts: {
      participants: participantKeys.size,
      attempts: rawAttempts.length,
      completed: completedAttempts.length,
      activeAttempts: activeAttempts.length,
      institutions: institutions.size,
      groups: groups.size,
      mentors: mentors.size
    },
    catalogs: {
      institutions: sortCatalog(Array.from(institutions)),
      groups: sortCatalog(Array.from(groups)),
      mentors: sortCatalog(Array.from(mentors)),
      statuses: sortCatalog(Array.from(statuses)),
      startedDateMin: startedDates[0] || "",
      startedDateMax: startedDates[startedDates.length - 1] || ""
    },
    capabilities: {
      storageBackend: settings.storageBackend,
      yandexDiskEnabled: Boolean(
        settings.yandexDiskIntegration &&
          settings.yandexDiskIntegration.enabled &&
          settings.yandexDiskIntegration.oauthToken
      ),
      yandexDiskFolder:
        settings.yandexDiskIntegration && settings.yandexDiskIntegration.folder
          ? settings.yandexDiskIntegration.folder
          : ""
    },
    diagnostics: {
      appVersion: APP_VERSION,
      storageBackend: settings.storageBackend || "file",
      refreshedAt: nowIso(),
      serverTime: nowIso(),
      lastActivityAt: lastActivityCandidates.length
        ? new Date(Math.max(...lastActivityCandidates)).toISOString()
        : null,
      apiErrors: runtimeDiagnostics.apiErrors,
      lastApiErrorAt: runtimeDiagnostics.lastApiErrorAt,
      lastApiErrorMessage: runtimeDiagnostics.lastApiErrorMessage,
      lastApiErrorRoute: runtimeDiagnostics.lastApiErrorRoute
    },
    tourAnalytics,
    institutionAnalytics,
    suspiciousAttempts
  };
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
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".ico": "image/x-icon",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml"
  };

  res.writeHead(200, {
    "Content-Type": contentTypes[ext] || "application/octet-stream",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0"
  });
  fs.createReadStream(filePath).pipe(res);
}

async function handleApi(req, res, url) {
  await storageReady;

  const method = req.method;
  const pathname = url.pathname;
  const settings = getCachedSettings();
  let olympiadBase = null;
  let customQuestionMap = null;
  let olympiad = null;

  const ensureOlympiadBase = () => {
    olympiadBase = olympiadBase || getCachedOlympiadBase();
    return olympiadBase;
  };

  const ensureCustomQuestionMap = async () => {
    customQuestionMap = customQuestionMap || (await getCachedCustomQuestionMap());
    return customQuestionMap;
  };

  const ensureOlympiad = async () => {
    if (!olympiad) {
      olympiad = await getResolvedOlympiad();
      olympiadBase = olympiadBase || getCachedOlympiadBase();
      customQuestionMap = customQuestionMap || (await getCachedCustomQuestionMap());
    }
    return olympiad;
  };

  if (method === "GET" && pathname === "/api/health") {
    const olympiadHealth = ensureOlympiadBase();
    sendJson(res, 200, {
      ok: true,
      app: "national-kitchens-olympiad",
      appVersion: APP_VERSION,
      now: nowIso(),
      olympiadId: olympiadHealth.id,
      schemaVersion: olympiadHealth.schemaVersion,
      storageBackend: settings.storageBackend || "file"
    });
    return;
  }

  if (method === "GET" && pathname === "/api/public/olympiad") {
    sendJson(res, 200, { ok: true, data: getOlympiadPublicData(await ensureOlympiad()) });
    return;
  }

  if (method === "POST" && pathname === "/api/public/register") {
    const olympiadData = await ensureOlympiad();
    const body = await parseBody(req);
    const validation = validateParticipantProfile(body);
    if (!validation.valid) {
      sendJson(res, 400, { ok: false, message: validation.message });
      return;
    }

    if (!isOlympiadAvailable(olympiadData)) {
      sendJson(res, 403, { ok: false, message: "Олимпиада сейчас недоступна." });
      return;
    }

    const signature = makeParticipantSignature(validation.profile);
    const attempts = currentOlympiadAttempts(await loadAttempts(), olympiadData.id).filter(
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
    const olympiadData = await ensureOlympiad();
    const body = await parseBody(req);
    const validation = validateParticipantProfile(body.participant || body);
    if (!validation.valid) {
      sendJson(res, 400, { ok: false, message: validation.message });
      return;
    }

    const participantSignature = makeParticipantSignature(validation.profile);
    const allAttempts = await loadAttempts();
    const currentAttempts = currentOlympiadAttempts(allAttempts, olympiadData.id);
    const activeAttempt = currentAttempts.find(
      (attempt) =>
        attempt.participantSignature === participantSignature &&
        attempt.status === "in_progress"
    );

    if (activeAttempt) {
      const normalized = normalizeAttemptState(olympiadData, activeAttempt);
      await saveAttempt(allAttempts, normalized);
      invalidateAttemptCaches();
      sendJson(res, 200, {
        ok: true,
        data: buildAttemptView(olympiadData, normalized, settings)
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

    const variant = buildVariant(olympiadData);
    const attempt = {
      id: generateId("attempt"),
      olympiadId: olympiadData.id,
      schemaVersion: olympiadData.schemaVersion || 2,
      participant: validation.profile,
      participantSignature,
      startedAt: nowIso(),
      expiresAt: new Date(
        Date.now() + olympiadData.durationMinutes * 60 * 1000
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
    invalidateAttemptCaches();

    sendJson(res, 201, {
      ok: true,
      data: buildAttemptView(olympiadData, attempt, settings)
    });
    return;
  }

  if (method === "GET" && pathname.match(/^\/api\/public\/attempts\/[^/]+$/)) {
    const olympiadData = await ensureOlympiad();
    const attemptId = pathname.split("/")[4];
    const attempt = await loadAttemptById(attemptId);
    if (!attempt || attempt.olympiadId !== olympiadData.id) {
      sendJson(res, 404, { ok: false, message: "Попытка не найдена." });
      return;
    }

    const normalized = await normalizeAndPersistIfChanged(olympiadData, attempt);
    sendJson(res, 200, {
      ok: true,
      data: buildAttemptView(olympiadData, normalized, settings)
    });
    return;
  }

  if (method === "GET" && pathname.match(/^\/api\/public\/attempts\/[^/]+\/current$/)) {
    const olympiadData = await ensureOlympiad();
    const attemptId = pathname.split("/")[4];
    const attempt = await loadAttemptById(attemptId);
    if (!attempt || attempt.olympiadId !== olympiadData.id) {
      sendJson(res, 404, { ok: false, message: "Попытка не найдена." });
      return;
    }

    const normalized = await normalizeAndPersistIfChanged(olympiadData, attempt);
    sendJson(res, 200, {
      ok: true,
      data: buildAttemptView(olympiadData, normalized, settings)
    });
    return;
  }

  if (method === "GET" && pathname.match(/^\/api\/public\/attempts\/[^/]+\/pulse$/)) {
    const olympiadData = await ensureOlympiad();
    const attemptId = pathname.split("/")[4];
    const attempt = await loadAttemptById(attemptId);
    if (!attempt || attempt.olympiadId !== olympiadData.id) {
      sendJson(res, 404, { ok: false, message: "РџРѕРїС‹С‚РєР° РЅРµ РЅР°Р№РґРµРЅР°." });
      return;
    }

    const normalized = await normalizeAndPersistIfChanged(olympiadData, attempt);
    sendJson(res, 200, {
      ok: true,
      data: buildAttemptPulse(olympiadData, normalized, settings)
    });
    return;
  }

  if (method === "POST" && pathname.match(/^\/api\/public\/attempts\/[^/]+\/answer$/)) {
    const olympiadData = await ensureOlympiad();
    const attemptId = pathname.split("/")[4];
    const body = await parseBody(req);
    let attempt = await loadAttemptById(attemptId);

    if (!attempt || attempt.olympiadId !== olympiadData.id) {
      sendJson(res, 404, { ok: false, message: "Попытка не найдена." });
      return;
    }

    attempt = normalizeAttemptState(olympiadData, attempt);
    if (attempt.status !== "in_progress") {
      await upsertAttempt(attempt);
      invalidateAttemptCaches();
      sendJson(res, 409, {
        ok: false,
        message: "Попытка уже завершена."
      });
      return;
    }

    const currentQuestion = getCurrentQuestion(attempt);
    if (!currentQuestion) {
      const finalized = finalizeAttempt(olympiadData, attempt, "finished");
      await upsertAttempt(finalized);
      invalidateAttemptCaches();
      sendJson(res, 200, {
        ok: true,
        data: buildAttemptView(olympiadData, finalized, settings)
      });
      return;
    }

    if (body.questionId && body.questionId !== currentQuestion.id) {
      sendJson(res, 200, {
        ok: true,
        data: buildAttemptView(olympiadData, attempt, settings)
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
    attempt._lastChangedQuestionId = currentQuestion.id;

    attempt.currentStepIndex += 1;
    if (attempt.currentStepIndex >= questionCount(attempt)) {
      attempt = finalizeAttempt(olympiadData, attempt, "finished");
      await upsertAttempt(attempt);
      invalidateAttemptCaches();
      sendJson(res, 200, {
        ok: true,
        data: buildAttemptView(olympiadData, attempt, settings)
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
    attempt = normalizeAttemptState(olympiadData, attempt);
    await upsertAttempt(attempt);
    invalidateAttemptCaches();

    sendJson(res, 200, {
      ok: true,
      data: buildAttemptView(olympiadData, attempt, settings)
    });
    return;
  }

  if (method === "POST" && pathname.match(/^\/api\/public\/attempts\/[^/]+\/finish$/)) {
    const olympiadData = await ensureOlympiad();
    const attemptId = pathname.split("/")[4];
    let attempt = await loadAttemptById(attemptId);

    if (!attempt || attempt.olympiadId !== olympiadData.id) {
      sendJson(res, 404, { ok: false, message: "Попытка не найдена." });
      return;
    }

    attempt = finalizeAttempt(olympiadData, attempt, "finished");
    await upsertAttempt(attempt);
    invalidateAttemptCaches();
    sendJson(res, 200, {
      ok: true,
      data: buildAttemptView(olympiadData, attempt, settings)
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
    sendJson(
      res,
      200,
      { ok: true, data: { token } },
      { "Set-Cookie": buildAdminCookie(token, sessions.at(-1)?.expiresAt) }
    );
    return;
  }

  if (method === "GET" && pathname === "/api/admin/session") {
    const session = await requireAdmin(req);
    if (!session) {
      sendJson(res, 401, {
        ok: false,
        message: "Требуется вход администратора."
      });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      data: {
        active: true,
        expiresAt: session.expiresAt
      }
    });
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

    if (pathname.startsWith("/api/admin/content/")) {
      olympiadBase = ensureOlympiadBase();
      customQuestionMap = await ensureCustomQuestionMap();
    }

    if (method === "GET" && pathname === "/api/admin/summary") {
      const olympiadData = await ensureOlympiad();
      const { rawAttempts, ranked } = await getCachedAdminAnalytics(olympiadData, settings);

      sendJson(res, 200, {
        ok: true,
        data: buildAdminSummary(olympiadData, rawAttempts, ranked, settings)
      });
      return;
    }

    if (method === "GET" && pathname === "/api/admin/content/summary") {
      const olympiadBaseData = ensureOlympiadBase();
      const customQuestionMapData = await ensureCustomQuestionMap();
      sendJson(res, 200, {
        ok: true,
        data: await getCachedQuestionSummary(olympiadBaseData, customQuestionMapData)
      });
      return;
    }

    if (method === "GET" && pathname === "/api/admin/content/questions") {
      const olympiadBaseData = ensureOlympiadBase();
      const customQuestionMapData = await ensureCustomQuestionMap();
      sendJson(res, 200, {
        ok: true,
        data: await getCachedQuestionCatalog(olympiadBaseData, customQuestionMapData)
      });
      return;
    }

    if (method === "POST" && pathname === "/api/admin/content/questions") {
      const body = await parseBody(req);
      const question = normalizeCustomQuestionPayload(body);
      await upsertContentCustomQuestion(question.id, question);
      invalidateContentCaches();
      sendJson(res, 200, {
        ok: true,
        data: question
      });
      return;
    }

    if (method === "PUT" && pathname.match(/^\/api\/admin\/content\/questions\/[^/]+$/)) {
      const customQuestionMapData = await ensureCustomQuestionMap();
      const questionId = decodeURIComponent(pathname.split("/")[5] || "");
      const existingQuestion = customQuestionMapData[questionId];
      if (!existingQuestion) {
        sendJson(res, 404, {
          ok: false,
          message: "Авторский вопрос не найден."
        });
        return;
      }

      const body = await parseBody(req);
      const question = normalizeCustomQuestionPayload(
        {
          ...body,
          id: questionId
        },
        existingQuestion
      );
      await upsertContentCustomQuestion(question.id, question);
      invalidateContentCaches();
      sendJson(res, 200, {
        ok: true,
        data: question
      });
      return;
    }

    if (method === "DELETE" && pathname.match(/^\/api\/admin\/content\/questions\/[^/]+$/)) {
      const questionId = decodeURIComponent(pathname.split("/")[5] || "");
      if (!customQuestionMap[questionId]) {
        sendJson(res, 404, {
          ok: false,
          message: "Авторский вопрос не найден."
        });
        return;
      }
      await deleteContentCustomQuestion(questionId);
      sendJson(res, 200, {
        ok: true,
        data: { questionId }
      });
      return;
    }

    if (method === "GET" && pathname === "/api/admin/content/drafts") {
      sendJson(res, 200, {
        ok: true,
        data: await loadContentDrafts()
      });
      return;
    }

    if (method === "PUT" && pathname.match(/^\/api\/admin\/content\/drafts\/[^/]+$/)) {
      const questionId = decodeURIComponent(pathname.split("/")[5] || "");
      const body = await parseBody(req);
      const draft = normalizeContentDraftPayload(body);
      await upsertContentDraft(questionId, draft);
      sendJson(res, 200, {
        ok: true,
        data: {
          questionId,
          draft
        }
      });
      return;
    }

    if (method === "DELETE" && pathname.match(/^\/api\/admin\/content\/drafts\/[^/]+$/)) {
      const questionId = decodeURIComponent(pathname.split("/")[5] || "");
      await deleteContentDraft(questionId);
      sendJson(res, 200, {
        ok: true,
        data: { questionId }
      });
      return;
    }

    if (method === "GET" && pathname === "/api/admin/attempts") {
      const olympiadData = await ensureOlympiad();
      const { ranked } = await getCachedAdminAnalytics(olympiadData, settings);
      const attempts = ranked.map((attempt) => ({
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
      const olympiadData = await ensureOlympiad();
      const attemptId = pathname.split("/")[4];
      const allAttempts = await loadAttempts();
      const attempt = findAttemptById(allAttempts, attemptId);

      if (!attempt || attempt.olympiadId !== olympiadData.id) {
        sendJson(res, 404, { ok: false, message: "Попытка не найдена." });
        return;
      }

      const summary = summarizeAttempt(olympiadData, attempt);
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
      const olympiadData = await ensureOlympiad();
      const fileName = `results_${Date.now()}.csv`;
      const filePath = saveExportFile(fileName, createAttemptsCsv(await buildExportRows(olympiadData)));
      sendJson(res, 200, { ok: true, data: { fileName, filePath } });
      return;
    }

    if (method === "POST" && pathname === "/api/admin/exports/json") {
      const olympiadData = await ensureOlympiad();
      const fileName = `results_${Date.now()}.json`;
      const filePath = saveExportFile(
        fileName,
        JSON.stringify(currentOlympiadAttempts(await loadAttempts(), olympiadData.id), null, 2)
      );
      sendJson(res, 200, { ok: true, data: { fileName, filePath } });
      return;
    }

    if (method === "POST" && pathname === "/api/admin/disk/upload") {
      const olympiadData = await ensureOlympiad();
      const result = await uploadExportsToYandexDisk(olympiadData, settings);
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
    noteApiError(url.pathname, error);
    sendJson(res, 500, {
      ok: false,
      message: error.message || "Внутренняя ошибка сервера."
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Olympiad server started on http://${HOST}:${PORT}`);
});
