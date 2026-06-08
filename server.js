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
const {
  getPm01Exam,
  getPm01PublicData,
  getPm01MaterialTicket,
  isPm01TicketCompatibleWithVariant,
  buildPm01Variant,
  getPm01CurrentQuestion,
  getPm01CurrentModule,
  scorePm01Question,
  summarizePm01Attempt,
  buildPm01AttemptView,
  finalizePm01Attempt,
  applyPm01VoiceReview,
  formatPm01CorrectAnswer
} = require("./src/pm01-engine");
const { buildQuestionCatalog, buildQuestionBankSummary } = require("./src/question-bank");
const { createAttemptsCsv, saveExportFile } = require("./src/exporter");
const { ensureFolder, uploadBuffer } = require("./src/yandex-disk");

const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const PORT = Number(process.env.PORT) || 3100;
const HOST = process.env.HOST || "0.0.0.0";
const APP_VERSION = packageInfo.version || "0.0.0";
const PM01_CONTROLS_DRAFT_KEY = "__pm01_controls_v1__";
const PM01_ADMIN_ATTEMPT_LIMIT_DEFAULT = 250;
const PM01_ADMIN_ATTEMPT_LIMIT_MAX = 1000;
const DEFAULT_PM01_CONTROLS = {
  examEnabled: true,
  freeRepeatEnabled: true,
  defaultAttempts: 1,
  grants: {},
  updatedAt: null,
  updatedBy: "system"
};

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
  const rawGroupName = String(payload.groupName || "").trim();
  const groupName = normalizeGroupName(rawGroupName);
  const profile = {
    fullName: String(payload.fullName || "").trim(),
    institution: String(payload.institution || "").trim(),
    groupName,
    groupNameOriginal: rawGroupName && rawGroupName !== groupName ? rawGroupName : "",
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

function normalizeGroupLetters(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/Ё/g, "Е")
    .replace(/A/g, "А")
    .replace(/B/g, "В")
    .replace(/C/g, "С")
    .replace(/E/g, "Е")
    .replace(/H/g, "Н")
    .replace(/K/g, "К")
    .replace(/M/g, "М")
    .replace(/O/g, "О")
    .replace(/P/g, "П")
    .replace(/T/g, "Т")
    .replace(/X/g, "Х")
    .replace(/Y/g, "У");
}

function normalizeGroupKey(value) {
  return normalizeGroupLetters(value)
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
}

function normalizeGroupName(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const compact = normalizeGroupLetters(raw).replace(/[^\p{L}\p{N}]+/gu, "");
  const structured = compact.match(/^(\d{1,2})([\p{L}]{1,8})(\d{2,4})$/u);
  if (structured) {
    return `${structured[1]}-${structured[2]}-${structured[3]}`;
  }

  return normalizeGroupLetters(raw)
    .replace(/[._–—\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeParticipantSignature(profile) {
  return [
    normalizeText(profile.fullName),
    normalizeText(profile.institution),
    normalizeGroupKey(profile.groupName)
  ].join("|");
}

function makeParticipantNameKey(profile) {
  return normalizeText(profile.fullName);
}

function normalizeClientIp(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "unknown";
  }
  return text
    .replace(/^::ffff:/, "")
    .replace(/^::1$/, "127.0.0.1");
}

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)[0];
  const realIp = String(req.headers["x-real-ip"] || "").trim();
  return normalizeClientIp(forwarded || realIp || req.socket?.remoteAddress || "");
}

function makeAttemptAccessKey(clientIp, participantNameKey) {
  return [normalizeClientIp(clientIp), participantNameKey].join("|");
}

function attemptMatchesAccess(attempt, accessKey, participantSignature, mode) {
  if ((attempt.mode || "exam") !== mode) {
    return false;
  }
  if (attempt.accessKey) {
    return attempt.accessKey === accessKey;
  }
  return attempt.participantSignature === participantSignature;
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

function parsePm01AdminAttemptLimit(url) {
  const parsed = Number(url.searchParams.get("limit") || PM01_ADMIN_ATTEMPT_LIMIT_DEFAULT);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return PM01_ADMIN_ATTEMPT_LIMIT_DEFAULT;
  }
  return Math.min(PM01_ADMIN_ATTEMPT_LIMIT_MAX, Math.trunc(parsed));
}

function lightweightAttemptActivityMs(attempt) {
  return Math.max(
    safeDateMs(attempt.finishedAt),
    safeDateMs(attempt.startedAt),
    safeDateMs(attempt.expiresAt)
  );
}

function selectRecentPm01AdminAttempts(attempts, url) {
  const limit = parsePm01AdminAttemptLimit(url);
  return attempts
    .slice()
    .sort((left, right) => lightweightAttemptActivityMs(right) - lightweightAttemptActivityMs(left))
    .slice(0, limit);
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

function pm01QuestionCount(attempt) {
  return attempt.variant && Array.isArray(attempt.variant.questions)
    ? attempt.variant.questions.length
    : 0;
}

function markPm01QuestionPresented(attempt) {
  const question = getPm01CurrentQuestion(attempt);
  if (!question) {
    return;
  }

  const entry = getQuestionLog(attempt, question.id);
  if (!entry.presentedAt) {
    entry.presentedAt = nowIso();
    entry.sourceId = question.sourceId;
    entry.moduleId = question.moduleId;
    entry.moduleCode = question.moduleCode;
    entry.optionOrder = Array.isArray(question.options)
      ? question.options.map((option) => option.id)
      : [];
    entry.itemOrder = Array.isArray(question.items)
      ? question.items.map((item) => item.id)
      : [];
  }
}

function normalizePm01AttemptState(exam, attempt) {
  if (!attempt || attempt.status !== "in_progress" || !attempt.variant) {
    return attempt;
  }

  if (attempt.expiresAt && Date.now() > new Date(attempt.expiresAt).getTime()) {
    return finalizePm01Attempt(exam, attempt, "expired");
  }

  if (!getPm01CurrentQuestion(attempt)) {
    return finalizePm01Attempt(exam, attempt, "finished");
  }

  markPm01QuestionPresented(attempt);
  return attempt;
}

async function normalizePm01AndPersistIfChanged(exam, attempt) {
  if (!attempt) {
    return attempt;
  }

  const before = JSON.stringify(attempt);
  const normalized = normalizePm01AttemptState(exam, attempt);
  const after = JSON.stringify(normalized);

  if (before !== after) {
    await upsertAttempt(normalized);
    invalidateAttemptCaches();
  }

  return normalized;
}

function buildPm01TrainingFeedback(question, result) {
  return {
    questionId: question.id,
    sourceId: question.sourceId,
    moduleId: question.moduleId,
    moduleCode: question.moduleCode,
    prompt: question.prompt,
    score: result.finalScore,
    maxScore: question.maxScore,
    correctAnswer: formatPm01CorrectAnswer(question),
    explanation:
      question.explanation ||
      (Array.isArray(question.solutionSteps) ? question.solutionSteps.join("\n") : "") ||
      (Array.isArray(question.answerPlan) ? question.answerPlan.join("\n") : ""),
    savedAt: nowIso()
  };
}

function buildPm01StudentAttemptView(exam, attempt) {
  return buildPm01AttemptView(exam, attempt, {
    hideScores: attempt.status === "in_progress" && (attempt.mode || "exam") === "exam"
  });
}

function normalizePm01Controls(raw = {}) {
  const defaultAttempts = Math.max(1, Math.min(10, Math.trunc(Number(raw.defaultAttempts || 1)) || 1));
  const grants = {};
  Object.entries(raw.grants || {}).forEach(([signature, grant]) => {
    const key = String(signature || "").trim();
    if (!key) {
      return;
    }
    const extraAttempts = Math.max(0, Math.min(20, Math.trunc(Number(grant?.extraAttempts || 0)) || 0));
    grants[key] = {
      extraAttempts,
      note: String(grant?.note || "").slice(0, 240),
      updatedAt: grant?.updatedAt || null
    };
  });

  return {
    ...DEFAULT_PM01_CONTROLS,
    ...raw,
    examEnabled: raw.examEnabled !== false,
    freeRepeatEnabled: raw.freeRepeatEnabled !== false,
    defaultAttempts,
    grants
  };
}

async function loadPm01Controls() {
  const drafts = await loadContentDrafts();
  return normalizePm01Controls(drafts[PM01_CONTROLS_DRAFT_KEY] || {});
}

async function savePm01Controls(controls, updatedBy = "admin") {
  const normalized = normalizePm01Controls({
    ...controls,
    updatedAt: nowIso(),
    updatedBy
  });
  await upsertContentDraft(PM01_CONTROLS_DRAFT_KEY, normalized);
  return normalized;
}

function pm01AttemptParticipantSignature(attempt) {
  const participant = attempt.participant || {};
  return makeParticipantSignature({
    fullName: participant.fullName || "",
    institution: participant.institution || "",
    groupName: participant.groupName || "",
    mentorName: participant.mentorName || ""
  });
}

function buildPm01ParticipantAccess(controls, attempts, participantSignature) {
  const signature = String(participantSignature || "").trim();
  const examAttempts = attempts
    .filter((attempt) => (attempt.mode || "exam") === "exam")
    .filter((attempt) => pm01AttemptParticipantSignature(attempt) === signature)
    .map((attempt) => ({
      ...attempt,
      participantSignature: pm01AttemptParticipantSignature(attempt)
    }));
  const completedAttempts = examAttempts.filter((attempt) => attempt.status !== "in_progress").length;
  const activeAttempts = examAttempts.filter((attempt) => attempt.status === "in_progress").length;
  const grant = controls.grants?.[signature] || { extraAttempts: 0, note: "", updatedAt: null };
  const allowedAttempts = controls.freeRepeatEnabled
    ? null
    : Number(controls.defaultAttempts || 1) + Number(grant.extraAttempts || 0);
  const latest = [...examAttempts].sort((left, right) => safeDateMs(right.startedAt) - safeDateMs(left.startedAt))[0] || null;

  return {
    participantSignature: signature,
    fullName: latest?.participant?.fullName || "",
    groupName: normalizeGroupName(latest?.participant?.groupName || ""),
    groupNameOriginal: latest?.participant?.groupNameOriginal || latest?.participant?.groupName || "",
    groupKey: normalizeGroupKey(latest?.participant?.groupName || ""),
    institution: latest?.participant?.institution || "",
    completedAttempts,
    activeAttempts,
    totalAttempts: examAttempts.length,
    extraAttempts: Number(grant.extraAttempts || 0),
    allowedAttempts,
    remainingAttempts: controls.freeRepeatEnabled ? null : Math.max(0, Number(allowedAttempts || 0) - completedAttempts),
    note: grant.note || "",
    updatedAt: grant.updatedAt || null
  };
}

function buildPm01ControlsView(controls, attempts) {
  const normalized = normalizePm01Controls(controls);
  const signatures = new Set([
    ...attempts
      .filter((attempt) => (attempt.mode || "exam") === "exam")
      .map((attempt) => pm01AttemptParticipantSignature(attempt)),
    ...Object.keys(normalized.grants || {})
  ]);

  const participants = Array.from(signatures)
    .filter(Boolean)
    .map((signature) => buildPm01ParticipantAccess(normalized, attempts, signature))
    .sort((left, right) => {
      const byGroup = (left.groupName || "").localeCompare(right.groupName || "", "ru");
      if (byGroup) {
        return byGroup;
      }
      return (left.fullName || left.participantSignature).localeCompare(
        right.fullName || right.participantSignature,
        "ru"
      );
    });

  return {
    ...normalized,
    participants
  };
}

function summarizePm01AttemptsForAdmin(exam, attempts, settings) {
  const normalizedAttempts = attempts.map((attempt) => normalizePm01AttemptState(exam, attempt));
  const participantKeys = new Set();
  const institutions = new Set();
  const groups = new Set();
  const mentors = new Set();
  const statuses = new Set();
  const gradeMap = new Map();

  const scoredAttempts = normalizedAttempts.map((attempt) => ({
    attempt,
    summary: summarizePm01Attempt(exam, attempt)
  }));

  scoredAttempts.forEach(({ attempt, summary }) => {
    const participant = attempt.participant || {};
    const normalizedGroup = normalizeGroupName(participant.groupName || "");
    participantKeys.add(pm01AttemptParticipantSignature(attempt));
    if (participant.institution) {
      institutions.add(participant.institution);
    }
    if (normalizedGroup) {
      groups.add(normalizedGroup);
    }
    if (participant.mentorName) {
      mentors.add(participant.mentorName);
    }
    if (attempt.status) {
      statuses.add(attempt.status);
    }
    if (attempt.status !== "in_progress") {
      gradeMap.set(summary.grade, (gradeMap.get(summary.grade) || 0) + 1);
    }
  });

  const completed = scoredAttempts.filter(({ attempt }) => attempt.status !== "in_progress");
  const moduleAnalytics = (exam.modules || []).map((module) => {
    const scores = completed
      .map(({ summary }) => summary.moduleScores.find((item) => item.moduleId === module.id))
      .filter(Boolean);
    const total = scores.reduce((sum, item) => sum + Number(item.finalScore || 0), 0);
    const pendingManualReviews = scoredAttempts.reduce((sum, { summary }) => {
      const moduleScore = summary.moduleScores.find((item) => item.moduleId === module.id);
      return sum + Number(moduleScore?.pendingManualReviews || 0);
    }, 0);

    return {
      moduleId: module.id,
      code: module.code,
      title: module.title,
      maxScore: module.maxScore,
      attempts: scores.length,
      averageScore: scores.length ? Number((total / scores.length).toFixed(2)) : 0,
      pendingManualReviews
    };
  });

  const pendingVoice = scoredAttempts
    .flatMap(({ attempt }) =>
      (attempt.variant?.questions || [])
        .filter((question) => question.type === "voice_response")
        .map((question) => ({
          attempt,
          question,
          answer: attempt.answers?.[question.id] || null
        }))
    )
    .filter((entry) => entry.answer?.manualStatus === "pending_review")
    .map(({ attempt, question, answer }) => ({
      attemptId: attempt.id,
      questionId: question.id,
      participant: attempt.participant,
      variantTitle: attempt.variant?.variantTitle || "",
      prompt: question.prompt,
      savedAt: answer.savedAt || null
    }))
    .sort((left, right) => safeDateMs(left.savedAt) - safeDateMs(right.savedAt));

  const lastActivityCandidates = normalizedAttempts
    .map((attempt) => latestAttemptActivity(attempt))
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  return {
    exam: getPm01PublicData(exam),
    counts: {
      participants: participantKeys.size,
      attempts: normalizedAttempts.length,
      activeAttempts: normalizedAttempts.filter((attempt) => attempt.status === "in_progress").length,
      completed: normalizedAttempts.filter((attempt) => attempt.status !== "in_progress").length,
      pendingReview: normalizedAttempts.filter((attempt) => attempt.status === "pending_review").length,
      reviewed: normalizedAttempts.filter((attempt) => attempt.status === "reviewed").length,
      institutions: institutions.size,
      groups: groups.size,
      mentors: mentors.size
    },
    catalogs: {
      institutions: sortCatalog(Array.from(institutions)),
      groups: sortCatalog(Array.from(groups)),
      mentors: sortCatalog(Array.from(mentors)),
      statuses: sortCatalog(Array.from(statuses))
    },
    gradeDistribution: Array.from(gradeMap.entries()).map(([grade, count]) => ({ grade, count })),
    moduleAnalytics,
    pendingVoice,
    capabilities: {
      storageBackend: settings.storageBackend || "file"
    },
    diagnostics: {
      appVersion: APP_VERSION,
      refreshedAt: nowIso(),
      serverTime: nowIso(),
      lastActivityAt: lastActivityCandidates.length
        ? new Date(Math.max(...lastActivityCandidates)).toISOString()
        : null,
      apiErrors: runtimeDiagnostics.apiErrors,
      lastApiErrorAt: runtimeDiagnostics.lastApiErrorAt,
      lastApiErrorMessage: runtimeDiagnostics.lastApiErrorMessage,
      lastApiErrorRoute: runtimeDiagnostics.lastApiErrorRoute
    }
  };
}

function buildPm01AdminAttemptDetail(exam, attempt) {
  const summary = summarizePm01Attempt(exam, attempt);
  const modules = (attempt.variant?.modules || attempt.variant?.tours || []).map((module) => ({
    id: module.id,
    code: module.code,
    title: module.title,
    maxScore: module.maxScore,
    questionCount: module.questionCount,
    score: summary.moduleScores.find((item) => item.moduleId === module.id) || null,
    questions: (attempt.variant?.questions || [])
      .filter((question) => question.moduleId === module.id)
      .map((question) => ({
        id: question.id,
        sourceId: question.sourceId,
        type: question.type,
        prompt: question.prompt,
        note: question.note || "",
        image: question.image || "",
        moduleId: question.moduleId,
        moduleCode: question.moduleCode,
        maxScore: question.maxScore,
        options: (question.options || []).map((option) => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect
        })),
        items: question.items || [],
        slots: question.slots || [],
        buckets: question.buckets || [],
        fields: (question.fields || []).map((field) => ({ ...field })),
        hotspots: (question.hotspots || []).map((hotspot) => ({ ...hotspot })),
        answerPlan: question.answerPlan || [],
        rubric: question.rubric || [],
        formulas: question.formulas || [],
        solutionSteps: question.solutionSteps || [],
        explanation: question.explanation || "",
        correctAnswer: formatPm01CorrectAnswer(question),
        answer: attempt.answers?.[question.id] || null,
        log: attempt.questionLog ? attempt.questionLog[question.id] || null : null
      }))
  }));

  return {
    attempt: {
      id: attempt.id,
      olympiadId: attempt.olympiadId,
      participant: {
        ...(attempt.participant || {}),
        groupName: normalizeGroupName(attempt.participant?.groupName || ""),
        groupNameOriginal: attempt.participant?.groupNameOriginal || attempt.participant?.groupName || ""
      },
      participantSignature: pm01AttemptParticipantSignature(attempt),
      clientIp: attempt.clientIp || "",
      accessKey: attempt.accessKey || "",
      selectedVariantId: attempt.selectedVariantId,
      selectedTicketId: attempt.selectedTicketId || attempt.variant?.materialTicket?.id || "",
      mode: attempt.mode || "exam",
      status: attempt.status,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      expiresAt: attempt.expiresAt,
      variantMeta: {
        variantId: attempt.variant?.variantId,
        variantTitle: attempt.variant?.variantTitle,
        materialTicket: attempt.variant?.materialTicket || null,
        issuedQuestionIds: attempt.variant?.issuedQuestionIds || []
      }
    },
    summary,
    modules
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, "\"\"")}"`;
}

async function buildPm01ExportRows(exam) {
  return currentOlympiadAttempts(await loadAttempts(), exam.id).map((attempt) => {
    const summary = summarizePm01Attempt(exam, attempt);
    const byModule = Object.fromEntries(
      summary.moduleScores.map((module) => [module.moduleId, module.finalScore])
    );
    return {
      fullName: attempt.participant?.fullName || "",
      institution: attempt.participant?.institution || "",
      groupName: normalizeGroupName(attempt.participant?.groupName || ""),
      groupNameOriginal: attempt.participant?.groupNameOriginal || attempt.participant?.groupName || "",
      mentorName: attempt.participant?.mentorName || "",
      clientIp: attempt.clientIp || "",
      mode: attempt.mode || "exam",
      variantTitle: attempt.variant?.variantTitle || "",
      ticketNumber: attempt.variant?.materialTicket?.number || "",
      ticketProduct: attempt.variant?.materialTicket?.product || "",
      status: attempt.status,
      startedAt: attempt.startedAt || "",
      finishedAt: attempt.finishedAt || "",
      situation: byModule.situation || 0,
      test: byModule.test || 0,
      calculation: byModule.calculation || 0,
      voice: byModule.voice || 0,
      simulation: byModule.simulation || 0,
      totalFinalScore: summary.totalFinalScore,
      grade: summary.grade,
      pendingManualReviews: summary.pendingManualReviews,
      totalDurationMs: summary.totalDurationMs
    };
  });
}

function createPm01AttemptsCsv(rows) {
  const headers = [
    "ФИО",
    "Учреждение",
    "Группа",
    "Преподаватель",
    "IP",
    "Режим",
    "Вариант",
    "Билет",
    "Полуфабрикат",
    "Статус",
    "Начало",
    "Завершение",
    "М0 Ситуация",
    "М1 Тест",
    "М2 Расчет",
    "М3 Голос",
    "М4 Симуляция",
    "Итоговый балл",
    "Оценка",
    "Ожидает проверки",
    "Время (мс)"
  ];

  const lines = [headers.map(csvEscape).join(";")];
  rows.forEach((row) => {
    lines.push(
      [
        row.fullName,
        row.institution,
        row.groupName,
        row.mentorName,
        row.clientIp,
        row.mode,
        row.variantTitle,
        row.ticketNumber,
        row.ticketProduct,
        row.status,
        row.startedAt,
        row.finishedAt,
        row.situation,
        row.test,
        row.calculation,
        row.voice,
        row.simulation,
        row.totalFinalScore,
        row.grade,
        row.pendingManualReviews,
        row.totalDurationMs
      ]
        .map(csvEscape)
        .join(";")
    );
  });
  return `\ufeff${lines.join("\n")}`;
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

function getQuestionMetadata(question) {
  return question && question.metadata && typeof question.metadata === "object"
    ? question.metadata
    : {};
}

function metadataList(metadata, ...keys) {
  const values = keys.flatMap((key) => {
    const value = metadata[key];
    if (Array.isArray(value)) {
      return value;
    }
    return value ? [value] : [];
  });

  return Array.from(
    new Set(values.map((value) => String(value || "").trim()).filter(Boolean))
  );
}

function buildQuestionAnalytics(attempts) {
  const bySource = new Map();

  attempts.forEach((attempt) => {
    const questions = attempt.variant && Array.isArray(attempt.variant.questions)
      ? attempt.variant.questions
      : [];

    questions.forEach((question) => {
      const answer = attempt.answers ? attempt.answers[question.id] || null : null;
      const log = attempt.questionLog ? attempt.questionLog[question.id] || null : null;
      const sourceId = question.sourceId || question.id;
      const metadata = getQuestionMetadata(question);
      const competencyTags = metadataList(metadata, "competencyTags", "pkFocus");
      const fgosCodes = metadataList(metadata, "fgosCodes", "okCodes");

      if (!bySource.has(sourceId)) {
        bySource.set(sourceId, {
          sourceId,
          prompt: question.prompt,
          tourCode: question.tourCode || "",
          cuisine: question.cuisine || "mixed",
          dishLabel: question.dishLabel || "",
          difficulty: metadata.difficulty || "standard",
          taskKind: metadata.taskKind || metadata.typeLabel || question.type,
          theme: metadata.theme || "",
          competencyTags,
          fgosCodes,
          attempts: 0,
          answered: 0,
          totalScore: 0,
          totalMaxScore: 0,
          totalTimeMs: 0,
          tooFastCount: 0
        });
      }

      const row = bySource.get(sourceId);
      row.attempts += 1;

      if (answer) {
        const timeSpentMs = Number(
          answer.timeSpentMs || (log && log.timeSpentMs) || 0
        );
        row.answered += 1;
        row.totalScore += Number(answer.finalScore || 0);
        row.totalMaxScore += Number(question.maxScore || 0);
        row.totalTimeMs += timeSpentMs;
        if (timeSpentMs > 0 && timeSpentMs < 2500) {
          row.tooFastCount += 1;
        }
      } else if (log && log.answeredAt) {
        row.answered += 1;
      }
    });
  });

  return [...bySource.values()]
    .map((row) => {
      const avgScore = row.answered ? row.totalScore / row.answered : 0;
      const avgTimeMs = row.answered ? row.totalTimeMs / row.answered : 0;
      const successRate = row.totalMaxScore
        ? row.totalScore / row.totalMaxScore
        : 0;

      return {
        ...row,
        avgScore: Math.round(avgScore * 100) / 100,
        avgTimeMs: Math.round(avgTimeMs),
        successRate: Math.round(successRate * 1000) / 10,
        heatScore: Math.round((1 - successRate) * 1000) / 10
      };
    })
    .sort((left, right) => {
      if (right.heatScore !== left.heatScore) {
        return right.heatScore - left.heatScore;
      }
      return right.attempts - left.attempts;
    });
}

function buildCompetencyCoverage(attempts) {
  const coverage = new Map();

  attempts.forEach((attempt) => {
    const questions = attempt.variant && Array.isArray(attempt.variant.questions)
      ? attempt.variant.questions
      : [];

    questions.forEach((question) => {
      const metadata = getQuestionMetadata(question);
      const codes = metadataList(metadata, "fgosCodes", "okCodes");
      const competencyTags = metadataList(metadata, "competencyTags", "pkFocus");
      const labels = [
        ...codes.map((code) => ({ id: code, label: code })),
        ...competencyTags.map((tag) => ({ id: `tag:${tag}`, label: tag }))
      ];

      labels.forEach((item) => {
        if (!coverage.has(item.id)) {
          coverage.set(item.id, {
            id: item.id,
            label: item.label,
            questionCount: 0,
            attempts: 0,
            totalScore: 0,
            totalMaxScore: 0
          });
        }
        const bucket = coverage.get(item.id);
        bucket.questionCount += 1;

        const answer = attempt.answers ? attempt.answers[question.id] || null : null;
        if (answer) {
          bucket.attempts += 1;
          bucket.totalScore += Number(answer.finalScore || 0);
          bucket.totalMaxScore += Number(question.maxScore || 0);
        }
      });
    });
  });

  return [...coverage.values()]
    .map((item) => ({
      ...item,
      successRate: item.totalMaxScore
        ? Math.round((item.totalScore / item.totalMaxScore) * 1000) / 10
        : 0
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "ru"));
}

function buildSuspiciousEvents(attempts) {
  const events = [];

  attempts.forEach((attempt) => {
    const participant = attempt.participant || {};
    const base = {
      attemptId: attempt.id,
      fullName: participant.fullName || "Без имени",
      institution: participant.institution || "",
      groupName: participant.groupName || ""
    };

    const answeredCount = Object.keys(attempt.answers || {}).length;
    const totalQuestions =
      attempt.variant && Array.isArray(attempt.variant.questions)
        ? attempt.variant.questions.length
        : 0;

    if (attempt.status === "expired" && answeredCount && totalQuestions) {
      events.push({
        ...base,
        type: "expired_attempt",
        severity: answeredCount < Math.ceil(totalQuestions * 0.5) ? "medium" : "low",
        label: "Попытка завершилась по таймауту",
        detail: `Отвечено ${answeredCount} из ${totalQuestions}`,
        happenedAt: attempt.finishedAt || attempt.startedAt || null
      });
    }

    const logs = attempt.questionLog || {};
    Object.entries(logs).forEach(([questionId, log]) => {
      const timeSpentMs = Number(log && log.timeSpentMs ? log.timeSpentMs : 0);
      if (timeSpentMs > 0 && timeSpentMs < 2500) {
        events.push({
          ...base,
          type: "too_fast_answer",
          severity: timeSpentMs < 1200 ? "high" : "medium",
          label: "Подозрительно быстрый ответ",
          detail: `${questionId}: ${timeSpentMs} мс`,
          happenedAt: log.answeredAt || log.presentedAt || attempt.startedAt || null
        });
      }
    });
  });

  return events
    .sort((left, right) => safeDateMs(right.happenedAt) - safeDateMs(left.happenedAt))
    .slice(0, 40);
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
    suspiciousAttempts,
    questionAnalytics: buildQuestionAnalytics(rawAttempts),
    competencyCoverage: buildCompetencyCoverage(rawAttempts),
    suspiciousEvents: buildSuspiciousEvents(rawAttempts)
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
    const pm01Health = getPm01Exam();
    sendJson(res, 200, {
      ok: true,
      app: "national-kitchens-olympiad",
      appVersion: APP_VERSION,
      now: nowIso(),
      olympiadId: olympiadHealth.id,
      schemaVersion: olympiadHealth.schemaVersion,
      pm01: {
        id: pm01Health.id,
        schemaVersion: pm01Health.schemaVersion,
        variants: Array.isArray(pm01Health.variants) ? pm01Health.variants.length : 0,
        modules: Array.isArray(pm01Health.modules) ? pm01Health.modules.length : 0,
        totalMaxScore: pm01Health.scoring?.totalMaxScore || 0,
        routes: {
          student: "/pm01.html",
          admin: "/pm01-admin.html"
        }
      },
      storageBackend: settings.storageBackend || "file"
    });
    return;
  }

  if (method === "GET" && pathname === "/api/pm01/public/exam") {
    const exam = getPm01Exam();
    sendJson(res, 200, {
      ok: true,
      data: {
        ...getPm01PublicData(exam),
        appVersion: APP_VERSION
      }
    });
    return;
  }

  if (method === "POST" && pathname === "/api/pm01/public/register") {
    const exam = getPm01Exam();
    const body = await parseBody(req);
    const validation = validateParticipantProfile(body);
    if (!validation.valid) {
      sendJson(res, 400, { ok: false, message: validation.message });
      return;
    }

    const clientIp = getClientIp(req);

    sendJson(res, 200, {
      ok: true,
      data: {
        participant: validation.profile,
        activeAttemptId: null,
        activeTrainingAttemptId: null,
        alreadyCompleted: false,
        trainingAlreadyCompleted: false,
        clientIp
      }
    });
    return;
  }

  if (method === "POST" && pathname === "/api/pm01/public/attempts/start") {
    const exam = getPm01Exam();
    const body = await parseBody(req);
    const validation = validateParticipantProfile(body.participant || body);
    if (!validation.valid) {
      sendJson(res, 400, { ok: false, message: validation.message });
      return;
    }

    const mode = body.mode === "training" ? "training" : "exam";
    const variantId = String(body.variantId || "").trim();
    const selectedVariantId = mode === "exam" ? "mixed" : variantId || exam.variants[0].id;
    const ticketId = mode === "exam" ? "" : String(body.ticketId || "").trim();
    const materialTicket = ticketId ? getPm01MaterialTicket(ticketId) : null;
    if (mode === "training" && variantId && !exam.variants.some((variant) => variant.id === variantId)) {
      sendJson(res, 400, { ok: false, message: "Выберите корректный вариант ПМ.01." });
      return;
    }
    if (ticketId && !materialTicket) {
      sendJson(res, 400, { ok: false, message: "Выберите корректное комплексное задание ПМ.01." });
      return;
    }
    if (materialTicket && !isPm01TicketCompatibleWithVariant(selectedVariantId, materialTicket)) {
      sendJson(res, 400, {
        ok: false,
        message: "Комплексное задание не относится к выбранному варианту ПМ.01."
      });
      return;
    }

    const participantSignature = makeParticipantSignature(validation.profile);
    const participantNameKey = makeParticipantNameKey(validation.profile);
    const clientIp = getClientIp(req);
    const accessKey = makeAttemptAccessKey(clientIp, participantNameKey);

    if (mode === "exam") {
      const controls = await loadPm01Controls();
      if (!controls.examEnabled) {
        sendJson(res, 403, {
          ok: false,
          message: "Экзамен временно закрыт преподавателем. Дождитесь команды на начало."
        });
        return;
      }

      if (!controls.freeRepeatEnabled) {
        const existingAttempts = currentOlympiadAttempts(await loadAttempts(), exam.id)
          .map((attempt) => normalizePm01AttemptState(exam, attempt));
        const participantAccess = buildPm01ParticipantAccess(controls, existingAttempts, participantSignature);
        const activeAttempt = existingAttempts.find(
          (attempt) =>
            (attempt.mode || "exam") === "exam" &&
            pm01AttemptParticipantSignature(attempt) === participantSignature &&
            attempt.status === "in_progress"
        );

        if (activeAttempt) {
          sendJson(res, 200, {
            ok: true,
            data: buildPm01StudentAttemptView(exam, activeAttempt)
          });
          return;
        }

        if (participantAccess.remainingAttempts <= 0) {
          sendJson(res, 403, {
            ok: false,
            message: "Лимит экзаменационных попыток исчерпан. Обратитесь к преподавателю, чтобы он выдал дополнительную попытку."
          });
          return;
        }
      }
    }

    const routeSeed = generateId("pm01_route");
    const variant = buildPm01Variant(exam, selectedVariantId, { ticketId, seed: routeSeed });
    const startedAt = nowIso();
    const attempt = {
      id: generateId("pm01_attempt"),
      olympiadId: exam.id,
      schemaVersion: exam.schemaVersion || 1,
      participant: validation.profile,
      participantSignature,
      participantNameKey,
      clientIp,
      accessKey,
      selectedVariantId: variant.variantId,
      selectedTicketId: variant.materialTicket?.id || "",
      routeSeed,
      mode,
      startedAt,
      expiresAt: new Date(Date.now() + exam.durationMinutes * 60 * 1000).toISOString(),
      finishedAt: null,
      status: "in_progress",
      currentStepIndex: 0,
      variant,
      answers: {},
      questionLog: {},
      lastFeedback: null,
      totalFinalScore: 0,
      totalPenalty: 0
    };

    markPm01QuestionPresented(attempt);
    await upsertAttempt(attempt);
    invalidateAttemptCaches();

    sendJson(res, 201, {
      ok: true,
      data: buildPm01StudentAttemptView(exam, attempt)
    });
    return;
  }

  if (method === "GET" && pathname.match(/^\/api\/pm01\/public\/attempts\/[^/]+$/)) {
    const exam = getPm01Exam();
    const attemptId = pathname.split("/")[5];
    const attempt = await loadAttemptById(attemptId);
    if (!attempt || attempt.olympiadId !== exam.id) {
      sendJson(res, 404, { ok: false, message: "Попытка ПМ.01 не найдена." });
      return;
    }

    const normalized = await normalizePm01AndPersistIfChanged(exam, attempt);
    sendJson(res, 200, {
      ok: true,
      data: buildPm01StudentAttemptView(exam, normalized)
    });
    return;
  }

  if (method === "POST" && pathname.match(/^\/api\/pm01\/public\/attempts\/[^/]+\/jump$/)) {
    const exam = getPm01Exam();
    const attemptId = pathname.split("/")[5];
    const body = await parseBody(req);
    let attempt = await loadAttemptById(attemptId);

    if (!attempt || attempt.olympiadId !== exam.id) {
      sendJson(res, 404, { ok: false, message: "Попытка ПМ.01 не найдена." });
      return;
    }

    attempt = normalizePm01AttemptState(exam, attempt);
    if (attempt.status !== "in_progress") {
      await upsertAttempt(attempt);
      invalidateAttemptCaches();
      sendJson(res, 409, {
        ok: false,
        message: "Попытка ПМ.01 уже завершена.",
        data: buildPm01StudentAttemptView(exam, attempt)
      });
      return;
    }

    if ((attempt.mode || "exam") !== "training") {
      sendJson(res, 403, {
        ok: false,
        message: "Выбор модуля доступен только в тренировочном режиме."
      });
      return;
    }

    const moduleId = String(body.moduleId || "").trim();
    const module = (attempt.variant?.modules || []).find((entry) => entry.id === moduleId);
    if (!module || !Number.isInteger(module.stepStart)) {
      sendJson(res, 400, { ok: false, message: "Выберите корректный модуль ПМ.01." });
      return;
    }

    attempt.currentStepIndex = module.stepStart;
    attempt.lastFeedback = null;
    markPm01QuestionPresented(attempt);
    await upsertAttempt(attempt);
    invalidateAttemptCaches();

    sendJson(res, 200, {
      ok: true,
      data: buildPm01StudentAttemptView(exam, attempt)
    });
    return;
  }

  if (method === "POST" && pathname.match(/^\/api\/pm01\/public\/attempts\/[^/]+\/answer$/)) {
    const exam = getPm01Exam();
    const attemptId = pathname.split("/")[5];
    const body = await parseBody(req, { maxBytes: 64 * 1024 * 1024 });
    let attempt = await loadAttemptById(attemptId);

    if (!attempt || attempt.olympiadId !== exam.id) {
      sendJson(res, 404, { ok: false, message: "Попытка ПМ.01 не найдена." });
      return;
    }

    attempt = normalizePm01AttemptState(exam, attempt);
    if (attempt.status !== "in_progress") {
      await upsertAttempt(attempt);
      invalidateAttemptCaches();
      sendJson(res, 409, {
        ok: false,
        message: "Попытка ПМ.01 уже завершена.",
        data: buildPm01StudentAttemptView(exam, attempt)
      });
      return;
    }

    const currentQuestion = getPm01CurrentQuestion(attempt);
    if (!currentQuestion) {
      const finalized = finalizePm01Attempt(exam, attempt, "finished");
      await upsertAttempt(finalized);
      invalidateAttemptCaches();
      sendJson(res, 200, {
        ok: true,
        data: buildPm01StudentAttemptView(exam, finalized)
      });
      return;
    }

    if (body.questionId && body.questionId !== currentQuestion.id) {
      sendJson(res, 200, {
        ok: true,
        data: buildPm01StudentAttemptView(exam, attempt)
      });
      return;
    }

    const savedAt = nowIso();
    const logEntry = getQuestionLog(attempt, currentQuestion.id);
    const timeSpentMs = logEntry.presentedAt
      ? Math.max(0, new Date(savedAt).getTime() - new Date(logEntry.presentedAt).getTime())
      : 0;
    const previousAnswer = attempt.answers[currentQuestion.id] || null;
    const result = scorePm01Question(currentQuestion, body.answerPayload, previousAnswer);

    attempt.answers[currentQuestion.id] = {
      questionId: currentQuestion.id,
      sourceId: currentQuestion.sourceId,
      moduleId: currentQuestion.moduleId,
      moduleCode: currentQuestion.moduleCode,
      answerPayload: body.answerPayload || {},
      autoScore: result.autoScore,
      finalScore: result.finalScore,
      penalty: result.penalty || 0,
      details: result.details || {},
      manualStatus: result.manualStatus || null,
      manualReview: previousAnswer ? previousAnswer.manualReview || null : null,
      savedAt,
      timeSpentMs
    };

    if (attempt.mode === "training") {
      attempt.lastFeedback = buildPm01TrainingFeedback(currentQuestion, result);
    } else {
      attempt.lastFeedback = null;
    }

    logEntry.answeredAt = savedAt;
    logEntry.timeSpentMs = timeSpentMs;
    attempt._lastChangedQuestionId = currentQuestion.id;
    attempt.currentStepIndex += 1;

    if (attempt.currentStepIndex >= pm01QuestionCount(attempt)) {
      attempt = finalizePm01Attempt(exam, attempt, "finished");
      await upsertAttempt(attempt);
      invalidateAttemptCaches();
      sendJson(res, 200, {
        ok: true,
        data: buildPm01StudentAttemptView(exam, attempt)
      });
      return;
    }

    markPm01QuestionPresented(attempt);
    attempt = normalizePm01AttemptState(exam, attempt);
    await upsertAttempt(attempt);
    invalidateAttemptCaches();

    sendJson(res, 200, {
      ok: true,
      data: buildPm01StudentAttemptView(exam, attempt)
    });
    return;
  }

  if (method === "POST" && pathname.match(/^\/api\/pm01\/public\/attempts\/[^/]+\/finish$/)) {
    const exam = getPm01Exam();
    const attemptId = pathname.split("/")[5];
    let attempt = await loadAttemptById(attemptId);

    if (!attempt || attempt.olympiadId !== exam.id) {
      sendJson(res, 404, { ok: false, message: "Попытка ПМ.01 не найдена." });
      return;
    }

    attempt = finalizePm01Attempt(exam, attempt, "finished");
    await upsertAttempt(attempt);
    invalidateAttemptCaches();
    sendJson(res, 200, {
      ok: true,
      data: buildPm01StudentAttemptView(exam, attempt)
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
    const password = String(body.password || "").trim();
    if (!settings.adminPassword) {
      sendJson(res, 503, {
        ok: false,
        message: "Пароль администратора не настроен. Укажите ADMIN_PASSWORD или adminPassword в config/settings.json."
      });
      return;
    }
    if (password !== String(settings.adminPassword || "").trim()) {
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

    if (method === "GET" && pathname === "/api/admin/pm01/summary") {
      const exam = getPm01Exam();
      const attempts = selectRecentPm01AdminAttempts(
        currentOlympiadAttempts(await loadAttempts(), exam.id),
        url
      );
      const controls = await loadPm01Controls();
      const summary = summarizePm01AttemptsForAdmin(exam, attempts, settings);
      summary.controls = buildPm01ControlsView(controls, attempts);
      sendJson(res, 200, {
        ok: true,
        data: summary
      });
      return;
    }

    if (method === "GET" && pathname === "/api/admin/pm01/controls") {
      const exam = getPm01Exam();
      const attempts = selectRecentPm01AdminAttempts(
        currentOlympiadAttempts(await loadAttempts(), exam.id),
        url
      )
        .map((attempt) => normalizePm01AttemptState(exam, attempt));
      const controls = await loadPm01Controls();
      sendJson(res, 200, {
        ok: true,
        data: buildPm01ControlsView(controls, attempts)
      });
      return;
    }

    if (method === "POST" && pathname === "/api/admin/pm01/controls") {
      const exam = getPm01Exam();
      const body = await parseBody(req);
      const current = await loadPm01Controls();
      const controls = await savePm01Controls({
        ...current,
        examEnabled: body.examEnabled !== false,
        freeRepeatEnabled: body.freeRepeatEnabled === true,
        defaultAttempts: body.defaultAttempts
      });
      const attempts = selectRecentPm01AdminAttempts(
        currentOlympiadAttempts(await loadAttempts(), exam.id),
        url
      )
        .map((attempt) => normalizePm01AttemptState(exam, attempt));
      sendJson(res, 200, {
        ok: true,
        data: buildPm01ControlsView(controls, attempts)
      });
      return;
    }

    if (method === "POST" && pathname === "/api/admin/pm01/grants") {
      const exam = getPm01Exam();
      const body = await parseBody(req);
      const participantSignature = String(body.participantSignature || "").trim();
      if (!participantSignature) {
        sendJson(res, 400, { ok: false, message: "Не найден участник для выдачи попытки." });
        return;
      }

      const current = await loadPm01Controls();
      const currentGrant = current.grants?.[participantSignature] || { extraAttempts: 0, note: "", updatedAt: null };
      const nextExtra = Object.prototype.hasOwnProperty.call(body, "extraAttempts")
        ? Number(body.extraAttempts)
        : Number(currentGrant.extraAttempts || 0) + Number(body.delta || 1);
      const extraAttempts = Math.max(0, Math.min(20, Math.trunc(nextExtra) || 0));
      const controls = await savePm01Controls({
        ...current,
        grants: {
          ...(current.grants || {}),
          [participantSignature]: {
            extraAttempts,
            note: String(body.note || currentGrant.note || "").slice(0, 240),
            updatedAt: nowIso()
          }
        }
      });
      const attempts = selectRecentPm01AdminAttempts(
        currentOlympiadAttempts(await loadAttempts(), exam.id),
        url
      )
        .map((attempt) => normalizePm01AttemptState(exam, attempt));
      sendJson(res, 200, {
        ok: true,
        data: buildPm01ControlsView(controls, attempts)
      });
      return;
    }

    if (method === "GET" && pathname === "/api/admin/pm01/attempts") {
      const exam = getPm01Exam();
      const attempts = selectRecentPm01AdminAttempts(
        currentOlympiadAttempts(await loadAttempts(), exam.id),
        url
      )
        .map((attempt) => normalizePm01AttemptState(exam, attempt))
        .map((attempt) => {
          const summary = summarizePm01Attempt(exam, attempt);
          return {
            id: attempt.id,
            participantSignature: pm01AttemptParticipantSignature(attempt),
            fullName: attempt.participant?.fullName || "",
            institution: attempt.participant?.institution || "",
            groupName: normalizeGroupName(attempt.participant?.groupName || ""),
            groupNameOriginal: attempt.participant?.groupNameOriginal || attempt.participant?.groupName || "",
            groupKey: normalizeGroupKey(attempt.participant?.groupName || ""),
            mentorName: attempt.participant?.mentorName || "",
            clientIp: attempt.clientIp || "",
            mode: attempt.mode || "exam",
            selectedVariantId: attempt.selectedVariantId || attempt.variant?.variantId || "",
            variantNumber: attempt.variant?.variantNumber || null,
            variantTitle: attempt.variant?.variantTitle || "",
            ticketNumber: attempt.variant?.materialTicket?.number || null,
            ticketProduct: attempt.variant?.materialTicket?.product || "",
            status: attempt.status,
            startedAt: attempt.startedAt,
            finishedAt: attempt.finishedAt,
            totalDurationMs: summary.totalDurationMs,
            totalFinalScore: summary.totalFinalScore,
            grade: summary.grade,
            moduleScores: summary.moduleScores.map((module) => ({
              moduleId: module.moduleId,
              code: module.code,
              title: module.title,
              finalScore: module.finalScore,
              maxScore: module.maxScore,
              answered: module.answered,
              questionCount: module.questionCount,
              pendingManualReviews: module.pendingManualReviews
            })),
            pendingManualReviews: summary.pendingManualReviews
          };
        })
        .sort((left, right) => {
          if (Number(right.totalFinalScore) !== Number(left.totalFinalScore)) {
            return Number(right.totalFinalScore) - Number(left.totalFinalScore);
          }
          return safeDateMs(right.startedAt) - safeDateMs(left.startedAt);
        });

      sendJson(res, 200, { ok: true, data: attempts });
      return;
    }

    if (method === "GET" && pathname.match(/^\/api\/admin\/pm01\/attempts\/[^/]+$/)) {
      const exam = getPm01Exam();
      const attemptId = pathname.split("/")[5];
      const attempt = await loadAttemptById(attemptId);

      if (!attempt || attempt.olympiadId !== exam.id) {
        sendJson(res, 404, { ok: false, message: "Попытка ПМ.01 не найдена." });
        return;
      }

      const normalized = await normalizePm01AndPersistIfChanged(exam, attempt);
      sendJson(res, 200, {
        ok: true,
        data: buildPm01AdminAttemptDetail(exam, normalized)
      });
      return;
    }

    if (method === "POST" && pathname.match(/^\/api\/admin\/pm01\/attempts\/[^/]+\/voice\/[^/]+\/review$/)) {
      const exam = getPm01Exam();
      const attemptId = pathname.split("/")[5];
      const questionId = decodeURIComponent(pathname.split("/")[7] || "");
      const body = await parseBody(req);
      const attempt = await loadAttemptById(attemptId);

      if (!attempt || attempt.olympiadId !== exam.id) {
        sendJson(res, 404, { ok: false, message: "Попытка ПМ.01 не найдена." });
        return;
      }

      try {
        const reviewed = applyPm01VoiceReview(exam, attempt, questionId, body);
        await upsertAttempt(reviewed);
        invalidateAttemptCaches();
        sendJson(res, 200, {
          ok: true,
          data: buildPm01AdminAttemptDetail(exam, reviewed)
        });
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          message: error.message || "Не удалось сохранить проверку голосового ответа."
        });
      }
      return;
    }

    if (method === "POST" && pathname === "/api/admin/pm01/exports/csv") {
      const exam = getPm01Exam();
      const fileName = `pm01_results_${Date.now()}.csv`;
      const filePath = saveExportFile(fileName, createPm01AttemptsCsv(await buildPm01ExportRows(exam)));
      sendJson(res, 200, { ok: true, data: { fileName, filePath } });
      return;
    }

    if (method === "POST" && pathname === "/api/admin/pm01/exports/json") {
      const exam = getPm01Exam();
      const fileName = `pm01_results_${Date.now()}.json`;
      const filePath = saveExportFile(
        fileName,
        JSON.stringify(currentOlympiadAttempts(await loadAttempts(), exam.id), null, 2)
      );
      sendJson(res, 200, { ok: true, data: { fileName, filePath } });
      return;
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
      const drafts = await loadContentDrafts();
      delete drafts[PM01_CONTROLS_DRAFT_KEY];
      sendJson(res, 200, {
        ok: true,
        data: drafts
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
    if (res.headersSent || res.destroyed) {
      return;
    }
    const statusCode = Number(error.statusCode || error.status || 500);
    sendJson(res, statusCode >= 400 && statusCode < 600 ? statusCode : 500, {
      ok: false,
      message: error.message || "Внутренняя ошибка сервера."
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Olympiad server started on http://${HOST}:${PORT}`);
});
