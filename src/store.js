const { readJson, writeJson, ensureDir } = require("./utils");

let fsModule = null;
let pathModule = null;
let cloudflareEnv = null;
let cloudflareStore = null;

function getFs() {
  if (!fsModule) {
    fsModule = require("fs");
  }
  return fsModule;
}

function getPath() {
  if (!pathModule) {
    pathModule = require("path");
  }
  return pathModule;
}

const ROOT_DIR =
  typeof __dirname === "string" && __dirname
    ? getPath().resolve(__dirname, "..")
    : "";

function resolveAppDir(envValue, fallbackRelativePath) {
  const value = String(envValue || "").trim();
  if (!value) {
    return getPath().join(ROOT_DIR, fallbackRelativePath);
  }
  const path = getPath();
  return path.isAbsolute(value) ? value : path.join(ROOT_DIR, value);
}

const DATA_DIR = resolveAppDir(process.env.DATA_DIR, "data");
const CONFIG_DIR = resolveAppDir(process.env.CONFIG_DIR, "config");
const STORAGE_DIR = resolveAppDir(process.env.STORAGE_DIR, "storage");
const EXPORTS_DIR = resolveAppDir(process.env.EXPORTS_DIR, "exports");

const OLYMPIAD_FILE = getPath().join(DATA_DIR, "olympiad.json");
const OLYMPIAD_MODULE = getPath().join(DATA_DIR, "olympiad.js");
const PARTICIPANTS_FILE = getPath().join(DATA_DIR, "participants.json");
const SETTINGS_FILE = getPath().join(CONFIG_DIR, "settings.json");
const ATTEMPTS_FILE = getPath().join(STORAGE_DIR, "attempts.json");
const SESSIONS_FILE = getPath().join(STORAGE_DIR, "admin-sessions.json");
const CONTENT_DRAFTS_FILE = getPath().join(STORAGE_DIR, "content-drafts.json");
const CONTENT_CUSTOM_FILE = getPath().join(STORAGE_DIR, "content-custom-questions.json");
const PM01_VOICE_AUDIO_DIR = getPath().join(STORAGE_DIR, "pm01-voice-audio");
const PM01_VOICE_AUDIO_INDEX_FILE = getPath().join(PM01_VOICE_AUDIO_DIR, "index.json");
const ATTEMPT_EVENTS_FILE = getPath().join(STORAGE_DIR, "attempt-events.json");

const STORAGE_BACKEND = String(
  process.env.STORAGE_BACKEND ||
    (process.env.YDB_CONNECTION_STRING ? "ydb" : "file")
)
  .trim()
  .toLowerCase();

let ydbStore = null;

function configureCloudflareStorage(env) {
  cloudflareEnv = env || cloudflareEnv || null;
  if (cloudflareEnv && (!process.env.STORAGE_BACKEND || process.env.STORAGE_BACKEND === "file")) {
    process.env.STORAGE_BACKEND = "cloudflare";
  }
}

function getStorageBackend() {
  if (cloudflareEnv) {
    return "cloudflare";
  }
  return String(
    process.env.STORAGE_BACKEND ||
      STORAGE_BACKEND ||
      (process.env.YDB_CONNECTION_STRING ? "ydb" : "file")
  )
    .trim()
    .toLowerCase();
}

function getYdbStore() {
  if (!ydbStore) {
    ydbStore = require("./ydb-store");
  }
  return ydbStore;
}

function getCloudflareStore() {
  if (!cloudflareStore) {
    cloudflareStore = require("./cloudflare-store");
  }
  cloudflareStore.configureCloudflareStorage(cloudflareEnv);
  return cloudflareStore;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function normalizeStateRevision(value) {
  const revision = Number(value);
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
}

function normalizeFileAttempt(attempt) {
  if (!attempt) {
    return null;
  }
  const normalized = {
    ...attempt,
    stateRevision: normalizeStateRevision(attempt.stateRevision),
    accessTokenHash: attempt.accessTokenHash || null
  };
  delete normalized._lastChangedQuestionId;
  return normalized;
}

function changedQuestionIds(options = {}) {
  if (!Array.isArray(options.changedQuestionIds)) {
    return null;
  }
  return [...new Set(options.changedQuestionIds.map(String).filter(Boolean))];
}

function mergeFileAttempt(current, candidate, options = {}) {
  const next = {
    ...current,
    ...candidate,
    accessTokenHash:
      candidate.accessTokenHash === undefined
        ? current.accessTokenHash || null
        : candidate.accessTokenHash || null
  };
  const selectedQuestionIds = changedQuestionIds(options);

  if (options.stateOnly) {
    next.answers = current.answers || {};
    next.questionLog = current.questionLog || {};
  } else if (selectedQuestionIds) {
    next.answers = { ...(current.answers || {}) };
    next.questionLog = { ...(current.questionLog || {}) };
    for (const questionId of selectedQuestionIds) {
      if (Object.prototype.hasOwnProperty.call(candidate.answers || {}, questionId)) {
        next.answers[questionId] = candidate.answers[questionId];
      }
      if (Object.prototype.hasOwnProperty.call(candidate.questionLog || {}, questionId)) {
        next.questionLog[questionId] = candidate.questionLog[questionId];
      }
    }
  } else {
    next.answers = candidate.answers || current.answers || {};
    next.questionLog = candidate.questionLog || current.questionLog || {};
  }

  delete next._lastChangedQuestionId;
  return next;
}

function initFileStorage() {
  ensureDir(DATA_DIR);
  ensureDir(CONFIG_DIR);
  ensureDir(STORAGE_DIR);
  ensureDir(EXPORTS_DIR);
  ensureDir(PM01_VOICE_AUDIO_DIR);
  readJson(ATTEMPTS_FILE, []);
  readJson(SESSIONS_FILE, []);
  readJson(CONTENT_DRAFTS_FILE, {});
  readJson(CONTENT_CUSTOM_FILE, {});
  readJson(PM01_VOICE_AUDIO_INDEX_FILE, {});
  readJson(ATTEMPT_EVENTS_FILE, []);
}

async function initStorage() {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    await getCloudflareStore().initCloudflareStorage();
    return;
  }
  if (backend === "ydb") {
    ensureDir(DATA_DIR);
    ensureDir(CONFIG_DIR);
    ensureDir(EXPORTS_DIR);
    await getYdbStore().initYdbStorage();
    return;
  }

  initFileStorage();
}

function loadOlympiad() {
  if (getStorageBackend() === "cloudflare") {
    return require("../data/olympiad.js");
  }
  const fs = getFs();
  if (fs.existsSync(OLYMPIAD_MODULE)) {
    delete require.cache[require.resolve(OLYMPIAD_MODULE)];
    return require(OLYMPIAD_MODULE);
  }
  return readJson(OLYMPIAD_FILE, {});
}

function loadParticipants() {
  if (getStorageBackend() === "cloudflare") {
    return require("../data/participants.json");
  }
  return readJson(PARTICIPANTS_FILE, []);
}

function loadSettings() {
  const settings =
    getStorageBackend() === "cloudflare"
      ? require("../config/settings.json")
      : readJson(SETTINGS_FILE, {});
  const disk = settings.yandexDiskIntegration || {};

  return {
    ...settings,
    storageBackend: getStorageBackend(),
    adminPassword:
      cloudflareEnv?.ADMIN_PASSWORD ||
      process.env.ADMIN_PASSWORD ||
      settings.adminPassword ||
      "",
    attemptIdSecret:
      cloudflareEnv?.ATTEMPT_ID_SECRET ||
      process.env.ATTEMPT_ID_SECRET ||
      settings.attemptIdSecret ||
      "",
    showParticipantScore: parseBoolean(
      process.env.SHOW_PARTICIPANT_SCORE,
      Boolean(settings.showParticipantScore)
    ),
    institutionName:
      process.env.INSTITUTION_NAME ||
      cloudflareEnv?.INSTITUTION_NAME ||
      settings.institutionName ||
      "",
    developerName:
      process.env.DEVELOPER_NAME ||
      cloudflareEnv?.DEVELOPER_NAME ||
      settings.developerName ||
      "",
    yandexDiskIntegration: {
      ...disk,
      enabled: parseBoolean(
        cloudflareEnv?.YANDEX_DISK_ENABLED ?? process.env.YANDEX_DISK_ENABLED,
        Boolean(disk.enabled)
      ),
      oauthToken:
        cloudflareEnv?.YANDEX_DISK_OAUTH_TOKEN ||
        process.env.YANDEX_DISK_OAUTH_TOKEN ||
        disk.oauthToken ||
        "",
      folder:
        cloudflareEnv?.YANDEX_DISK_FOLDER ||
        process.env.YANDEX_DISK_FOLDER ||
        disk.folder ||
        "/olympiad-results"
    },
    ydb: {
      enabled: STORAGE_BACKEND === "ydb",
      connectionString: process.env.YDB_CONNECTION_STRING || "",
      attemptsTable: process.env.YDB_ATTEMPTS_TABLE || "olympiad_attempts",
      adminSessionsTable: process.env.YDB_ADMIN_SESSIONS_TABLE || "admin_sessions",
      contentDraftsTable: process.env.YDB_CONTENT_DRAFTS_TABLE || "olympiad_content_drafts",
      contentQuestionsTable:
        process.env.YDB_CONTENT_QUESTIONS_TABLE || "olympiad_content_questions",
      pm01VoiceAudioTable:
        process.env.YDB_PM01_VOICE_AUDIO_TABLE || "olympiad_pm01_voice_audio"
    }
  };
}

async function loadAttempts() {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    return getCloudflareStore().loadAttempts();
  }
  if (backend === "ydb") {
    return getYdbStore().loadAttempts();
  }
  return readJson(ATTEMPTS_FILE, []).map(normalizeFileAttempt).filter(Boolean);
}

async function loadAttemptSummaries() {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    return getCloudflareStore().loadAttemptSummaries();
  }
  if (backend === "ydb") {
    return getYdbStore().loadAttemptSummaries();
  }
  return readJson(ATTEMPTS_FILE, []).map(normalizeFileAttempt).filter(Boolean);
}

async function saveAttempts(attempts) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    await getCloudflareStore().saveAttempts(attempts);
    return;
  }
  if (backend === "ydb") {
    await getYdbStore().saveAttempts(attempts);
    return;
  }
  writeJson(
    ATTEMPTS_FILE,
    (attempts || []).map(normalizeFileAttempt).filter(Boolean)
  );
}

async function upsertAttempt(attempt, options = {}) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    await getCloudflareStore().upsertAttempt(attempt, options);
    return;
  }
  if (backend === "ydb") {
    await getYdbStore().upsertAttempt(attempt, options);
    return;
  }

  const attempts = readJson(ATTEMPTS_FILE, []);
  const index = attempts.findIndex((item) => item.id === attempt.id);
  if (index >= 0) {
    const current = normalizeFileAttempt(attempts[index]);
    attempts[index] = normalizeFileAttempt({
      ...mergeFileAttempt(current, attempt, options),
      stateRevision: current.stateRevision + 1
    });
  } else {
    attempts.push(normalizeFileAttempt({ ...attempt, stateRevision: 0 }));
  }
  writeJson(ATTEMPTS_FILE, attempts);
}

async function createAttemptAtomic(attempt) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    return getCloudflareStore().createAttemptAtomic(attempt);
  }
  if (backend === "ydb") {
    return getYdbStore().createAttemptAtomic(attempt);
  }

  if (!attempt || !attempt.id) {
    return { created: false, attempt: null };
  }
  const attempts = readJson(ATTEMPTS_FILE, []);
  const existing = attempts.find((item) => item.id === attempt.id);
  if (existing) {
    return { created: false, attempt: normalizeFileAttempt(existing) };
  }

  const stored = normalizeFileAttempt({ ...attempt, stateRevision: 0 });
  attempts.push(stored);
  writeJson(ATTEMPTS_FILE, attempts);
  return { created: true, attempt: stored };
}

async function updateAttemptWithRevision(attempt, expectedRevision, options = {}) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    return getCloudflareStore().updateAttemptWithRevision(
      attempt,
      expectedRevision,
      options
    );
  }
  if (backend === "ydb") {
    return getYdbStore().updateAttemptWithRevision(attempt, expectedRevision, options);
  }

  if (!attempt || !attempt.id) {
    return false;
  }
  const expected = normalizeStateRevision(expectedRevision);
  if (Number(expectedRevision) !== expected) {
    return false;
  }

  const attempts = readJson(ATTEMPTS_FILE, []);
  const index = attempts.findIndex((item) => item.id === attempt.id);
  if (index < 0) {
    return false;
  }

  const current = normalizeFileAttempt(attempts[index]);
  if (current.stateRevision !== expected) {
    return false;
  }

  const stored = normalizeFileAttempt({
    ...mergeFileAttempt(current, attempt, options),
    stateRevision: expected + 1
  });
  attempts[index] = stored;
  writeJson(ATTEMPTS_FILE, attempts);
  attempt.stateRevision = stored.stateRevision;
  return true;
}

async function loadAttemptById(attemptId) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    return getCloudflareStore().loadAttemptById(attemptId);
  }
  if (backend === "ydb") {
    return getYdbStore().loadAttemptById(attemptId);
  }

  const attempts = readJson(ATTEMPTS_FILE, []);
  return normalizeFileAttempt(attempts.find((item) => item.id === attemptId) || null);
}

async function loadAdminSessions() {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    return getCloudflareStore().loadAdminSessions();
  }
  if (backend === "ydb") {
    return getYdbStore().loadAdminSessions();
  }
  return readJson(SESSIONS_FILE, []);
}

async function loadAdminSessionByToken(token) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    return getCloudflareStore().loadAdminSessionByToken(token);
  }
  if (backend === "ydb") {
    return getYdbStore().loadAdminSessionByToken(token);
  }

  const sessions = readJson(SESSIONS_FILE, []);
  return sessions.find((item) => item.token === token) || null;
}

async function saveAdminSessions(sessions) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    await getCloudflareStore().saveAdminSessions(sessions);
    return;
  }
  if (backend === "ydb") {
    await getYdbStore().saveAdminSessions(sessions);
    return;
  }
  writeJson(SESSIONS_FILE, sessions);
}

async function loadContentDrafts() {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    return getCloudflareStore().loadContentDrafts();
  }
  if (backend === "ydb") {
    return getYdbStore().loadContentDrafts();
  }
  return readJson(CONTENT_DRAFTS_FILE, {});
}

async function saveContentDrafts(drafts) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    await getCloudflareStore().saveContentDrafts(drafts);
    return;
  }
  if (backend === "ydb") {
    await getYdbStore().saveContentDrafts(drafts);
    return;
  }
  writeJson(CONTENT_DRAFTS_FILE, drafts || {});
}

async function upsertContentDraft(questionId, draft) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    await getCloudflareStore().upsertContentDraft(questionId, draft);
    return;
  }
  if (backend === "ydb") {
    await getYdbStore().upsertContentDraft(questionId, draft);
    return;
  }

  const drafts = readJson(CONTENT_DRAFTS_FILE, {});
  drafts[questionId] = draft;
  writeJson(CONTENT_DRAFTS_FILE, drafts);
}

async function deleteContentDraft(questionId) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    await getCloudflareStore().deleteContentDraft(questionId);
    return;
  }
  if (backend === "ydb") {
    await getYdbStore().deleteContentDraft(questionId);
    return;
  }

  const drafts = readJson(CONTENT_DRAFTS_FILE, {});
  delete drafts[questionId];
  writeJson(CONTENT_DRAFTS_FILE, drafts);
}

async function loadContentCustomQuestions() {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    return getCloudflareStore().loadContentCustomQuestions();
  }
  if (backend === "ydb") {
    return getYdbStore().loadContentCustomQuestions();
  }
  return readJson(CONTENT_CUSTOM_FILE, {});
}

async function saveContentCustomQuestions(questions) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    await getCloudflareStore().saveContentCustomQuestions(questions);
    return;
  }
  if (backend === "ydb") {
    await getYdbStore().saveContentCustomQuestions(questions);
    return;
  }
  writeJson(CONTENT_CUSTOM_FILE, questions || {});
}

async function upsertContentCustomQuestion(questionId, question) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    await getCloudflareStore().upsertContentCustomQuestion(questionId, question);
    return;
  }
  if (backend === "ydb") {
    await getYdbStore().upsertContentCustomQuestion(questionId, question);
    return;
  }

  const questions = readJson(CONTENT_CUSTOM_FILE, {});
  questions[questionId] = question;
  writeJson(CONTENT_CUSTOM_FILE, questions);
}

async function deleteContentCustomQuestion(questionId) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    await getCloudflareStore().deleteContentCustomQuestion(questionId);
    return;
  }
  if (backend === "ydb") {
    await getYdbStore().deleteContentCustomQuestion(questionId);
    return;
  }

  const questions = readJson(CONTENT_CUSTOM_FILE, {});
  delete questions[questionId];
  writeJson(CONTENT_CUSTOM_FILE, questions);
}

async function appendAttemptEvent(attemptId, event, maxEvents = 250) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    return getCloudflareStore().appendAttemptEvent(attemptId, event, maxEvents);
  }
  if (backend === "ydb") {
    return getYdbStore().appendAttemptEvent(attemptId, event, maxEvents);
  }

  const limit = Math.max(0, Math.trunc(Number(maxEvents) || 0));
  if (!attemptId || !event?.eventId || limit === 0) {
    return { stored: false };
  }
  const events = readJson(ATTEMPT_EVENTS_FILE, []);
  const exists = events.some(
    (item) => item.attemptId === attemptId && item.eventId === event.eventId
  );
  if (exists) {
    return { stored: false };
  }
  const attemptEventCount = events.filter((item) => item.attemptId === attemptId).length;
  if (attemptEventCount >= limit) {
    return { stored: false };
  }
  const storedEvent = { ...event, attemptId };
  events.push(storedEvent);
  writeJson(ATTEMPT_EVENTS_FILE, events);
  return { stored: true, event: storedEvent };
}

async function loadAttemptEvents(attemptId) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    return getCloudflareStore().loadAttemptEvents(attemptId);
  }
  if (backend === "ydb") {
    return getYdbStore().loadAttemptEvents(attemptId);
  }

  return readJson(ATTEMPT_EVENTS_FILE, [])
    .filter((event) => event.attemptId === attemptId)
    .sort((left, right) => String(left.receivedAt).localeCompare(String(right.receivedAt)));
}

function normalizeAudioMeta(meta) {
  return {
    id: String(meta.id || "").trim(),
    attemptId: String(meta.attemptId || "").trim(),
    questionId: String(meta.questionId || "").trim(),
    fileName: String(meta.fileName || "").trim(),
    mimeType: String(meta.mimeType || "audio/webm").trim(),
    durationMs: Number(meta.durationMs || 0),
    byteLength: Number(meta.byteLength || 0),
    createdAt: String(meta.createdAt || new Date().toISOString())
  };
}

async function savePm01VoiceAudio(meta, buffer) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    return getCloudflareStore().savePm01VoiceAudio(normalizeAudioMeta(meta), buffer);
  }
  if (backend === "ydb") {
    return getYdbStore().savePm01VoiceAudio(normalizeAudioMeta(meta), buffer);
  }

  const normalized = normalizeAudioMeta(meta);
  if (!normalized.id || !normalized.attemptId || !normalized.questionId) {
    throw new Error("Некорректные метаданные голосового ответа.");
  }
  ensureDir(PM01_VOICE_AUDIO_DIR);
  const safeName = `${normalized.id}.webm`;
  const filePath = getPath().join(PM01_VOICE_AUDIO_DIR, safeName);
  getFs().writeFileSync(filePath, buffer);

  const index = readJson(PM01_VOICE_AUDIO_INDEX_FILE, {});
  index[normalized.id] = {
    ...normalized,
    fileName: safeName,
    filePath
  };
  writeJson(PM01_VOICE_AUDIO_INDEX_FILE, index);
  return index[normalized.id];
}

async function loadPm01VoiceAudio(audioId) {
  const backend = getStorageBackend();
  if (backend === "cloudflare") {
    return getCloudflareStore().loadPm01VoiceAudio(audioId);
  }
  if (backend === "ydb") {
    return getYdbStore().loadPm01VoiceAudio(audioId);
  }

  const id = String(audioId || "").trim();
  if (!id) {
    return null;
  }
  const index = readJson(PM01_VOICE_AUDIO_INDEX_FILE, {});
  const meta = index[id];
  const fs = getFs();
  if (!meta || !meta.filePath || !fs.existsSync(meta.filePath)) {
    return null;
  }
  return {
    meta,
    buffer: fs.readFileSync(meta.filePath)
  };
}

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  CONFIG_DIR,
  STORAGE_DIR,
  EXPORTS_DIR,
  STORAGE_BACKEND,
  configureCloudflareStorage,
  initStorage,
  loadOlympiad,
  loadParticipants,
  loadSettings,
  loadAttempts,
  loadAttemptSummaries,
  saveAttempts,
  upsertAttempt,
  createAttemptAtomic,
  updateAttemptWithRevision,
  loadAttemptById,
  appendAttemptEvent,
  loadAttemptEvents,
  loadAdminSessions,
  saveAdminSessions,
  loadAdminSessionByToken,
  loadContentDrafts,
  saveContentDrafts,
  upsertContentDraft,
  deleteContentDraft,
  loadContentCustomQuestions,
  saveContentCustomQuestions,
  upsertContentCustomQuestion,
  deleteContentCustomQuestion,
  savePm01VoiceAudio,
  loadPm01VoiceAudio
};
