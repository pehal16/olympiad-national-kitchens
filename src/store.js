const fs = require("fs");
const path = require("path");
const { readJson, writeJson, ensureDir } = require("./utils");

const ROOT_DIR = path.resolve(__dirname, "..");

function resolveAppDir(envValue, fallbackRelativePath) {
  const value = String(envValue || "").trim();
  if (!value) {
    return path.join(ROOT_DIR, fallbackRelativePath);
  }
  return path.isAbsolute(value) ? value : path.join(ROOT_DIR, value);
}

const DATA_DIR = resolveAppDir(process.env.DATA_DIR, "data");
const CONFIG_DIR = resolveAppDir(process.env.CONFIG_DIR, "config");
const STORAGE_DIR = resolveAppDir(process.env.STORAGE_DIR, "storage");
const EXPORTS_DIR = resolveAppDir(process.env.EXPORTS_DIR, "exports");

const OLYMPIAD_FILE = path.join(DATA_DIR, "olympiad.json");
const OLYMPIAD_MODULE = path.join(DATA_DIR, "olympiad.js");
const PARTICIPANTS_FILE = path.join(DATA_DIR, "participants.json");
const SETTINGS_FILE = path.join(CONFIG_DIR, "settings.json");
const ATTEMPTS_FILE = path.join(STORAGE_DIR, "attempts.json");
const SESSIONS_FILE = path.join(STORAGE_DIR, "admin-sessions.json");
const CONTENT_DRAFTS_FILE = path.join(STORAGE_DIR, "content-drafts.json");
const CONTENT_CUSTOM_FILE = path.join(STORAGE_DIR, "content-custom-questions.json");
const PM01_VOICE_AUDIO_DIR = path.join(STORAGE_DIR, "pm01-voice-audio");
const PM01_VOICE_AUDIO_INDEX_FILE = path.join(PM01_VOICE_AUDIO_DIR, "index.json");

const STORAGE_BACKEND = String(
  process.env.STORAGE_BACKEND ||
    (process.env.YDB_CONNECTION_STRING ? "ydb" : "file")
)
  .trim()
  .toLowerCase();

let ydbStore = null;

function getYdbStore() {
  if (!ydbStore) {
    ydbStore = require("./ydb-store");
  }
  return ydbStore;
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
}

async function initStorage() {
  if (STORAGE_BACKEND === "ydb") {
    ensureDir(DATA_DIR);
    ensureDir(CONFIG_DIR);
    ensureDir(EXPORTS_DIR);
    await getYdbStore().initYdbStorage();
    return;
  }

  initFileStorage();
}

function loadOlympiad() {
  if (fs.existsSync(OLYMPIAD_MODULE)) {
    delete require.cache[require.resolve(OLYMPIAD_MODULE)];
    return require(OLYMPIAD_MODULE);
  }
  return readJson(OLYMPIAD_FILE, {});
}

function loadParticipants() {
  return readJson(PARTICIPANTS_FILE, []);
}

function loadSettings() {
  const settings = readJson(SETTINGS_FILE, {});
  const disk = settings.yandexDiskIntegration || {};

  return {
    ...settings,
    storageBackend: STORAGE_BACKEND,
    adminPassword: settings.adminPassword || process.env.ADMIN_PASSWORD || "",
    showParticipantScore: parseBoolean(
      process.env.SHOW_PARTICIPANT_SCORE,
      Boolean(settings.showParticipantScore)
    ),
    institutionName: process.env.INSTITUTION_NAME || settings.institutionName || "",
    developerName: process.env.DEVELOPER_NAME || settings.developerName || "",
    yandexDiskIntegration: {
      ...disk,
      enabled: parseBoolean(process.env.YANDEX_DISK_ENABLED, Boolean(disk.enabled)),
      oauthToken: process.env.YANDEX_DISK_OAUTH_TOKEN || disk.oauthToken || "",
      folder: process.env.YANDEX_DISK_FOLDER || disk.folder || "/olympiad-results"
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
  if (STORAGE_BACKEND === "ydb") {
    return getYdbStore().loadAttempts();
  }
  return readJson(ATTEMPTS_FILE, []);
}

async function saveAttempts(attempts) {
  if (STORAGE_BACKEND === "ydb") {
    await getYdbStore().saveAttempts(attempts);
    return;
  }
  writeJson(ATTEMPTS_FILE, attempts);
}

async function upsertAttempt(attempt) {
  if (STORAGE_BACKEND === "ydb") {
    await getYdbStore().upsertAttempt(attempt);
    return;
  }

  const attempts = readJson(ATTEMPTS_FILE, []);
  const index = attempts.findIndex((item) => item.id === attempt.id);
  if (index >= 0) {
    attempts[index] = attempt;
  } else {
    attempts.push(attempt);
  }
  writeJson(ATTEMPTS_FILE, attempts);
}

async function loadAttemptById(attemptId) {
  if (STORAGE_BACKEND === "ydb") {
    return getYdbStore().loadAttemptById(attemptId);
  }

  const attempts = readJson(ATTEMPTS_FILE, []);
  return attempts.find((item) => item.id === attemptId) || null;
}

async function loadAdminSessions() {
  if (STORAGE_BACKEND === "ydb") {
    return getYdbStore().loadAdminSessions();
  }
  return readJson(SESSIONS_FILE, []);
}

async function loadAdminSessionByToken(token) {
  if (STORAGE_BACKEND === "ydb") {
    return getYdbStore().loadAdminSessionByToken(token);
  }

  const sessions = readJson(SESSIONS_FILE, []);
  return sessions.find((item) => item.token === token) || null;
}

async function saveAdminSessions(sessions) {
  if (STORAGE_BACKEND === "ydb") {
    await getYdbStore().saveAdminSessions(sessions);
    return;
  }
  writeJson(SESSIONS_FILE, sessions);
}

async function loadContentDrafts() {
  if (STORAGE_BACKEND === "ydb") {
    return getYdbStore().loadContentDrafts();
  }
  return readJson(CONTENT_DRAFTS_FILE, {});
}

async function saveContentDrafts(drafts) {
  if (STORAGE_BACKEND === "ydb") {
    await getYdbStore().saveContentDrafts(drafts);
    return;
  }
  writeJson(CONTENT_DRAFTS_FILE, drafts || {});
}

async function upsertContentDraft(questionId, draft) {
  if (STORAGE_BACKEND === "ydb") {
    await getYdbStore().upsertContentDraft(questionId, draft);
    return;
  }

  const drafts = readJson(CONTENT_DRAFTS_FILE, {});
  drafts[questionId] = draft;
  writeJson(CONTENT_DRAFTS_FILE, drafts);
}

async function deleteContentDraft(questionId) {
  if (STORAGE_BACKEND === "ydb") {
    await getYdbStore().deleteContentDraft(questionId);
    return;
  }

  const drafts = readJson(CONTENT_DRAFTS_FILE, {});
  delete drafts[questionId];
  writeJson(CONTENT_DRAFTS_FILE, drafts);
}

async function loadContentCustomQuestions() {
  if (STORAGE_BACKEND === "ydb") {
    return getYdbStore().loadContentCustomQuestions();
  }
  return readJson(CONTENT_CUSTOM_FILE, {});
}

async function saveContentCustomQuestions(questions) {
  if (STORAGE_BACKEND === "ydb") {
    await getYdbStore().saveContentCustomQuestions(questions);
    return;
  }
  writeJson(CONTENT_CUSTOM_FILE, questions || {});
}

async function upsertContentCustomQuestion(questionId, question) {
  if (STORAGE_BACKEND === "ydb") {
    await getYdbStore().upsertContentCustomQuestion(questionId, question);
    return;
  }

  const questions = readJson(CONTENT_CUSTOM_FILE, {});
  questions[questionId] = question;
  writeJson(CONTENT_CUSTOM_FILE, questions);
}

async function deleteContentCustomQuestion(questionId) {
  if (STORAGE_BACKEND === "ydb") {
    await getYdbStore().deleteContentCustomQuestion(questionId);
    return;
  }

  const questions = readJson(CONTENT_CUSTOM_FILE, {});
  delete questions[questionId];
  writeJson(CONTENT_CUSTOM_FILE, questions);
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
  if (STORAGE_BACKEND === "ydb") {
    return getYdbStore().savePm01VoiceAudio(normalizeAudioMeta(meta), buffer);
  }

  const normalized = normalizeAudioMeta(meta);
  if (!normalized.id || !normalized.attemptId || !normalized.questionId) {
    throw new Error("Некорректные метаданные голосового ответа.");
  }
  ensureDir(PM01_VOICE_AUDIO_DIR);
  const safeName = `${normalized.id}.webm`;
  const filePath = path.join(PM01_VOICE_AUDIO_DIR, safeName);
  fs.writeFileSync(filePath, buffer);

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
  if (STORAGE_BACKEND === "ydb") {
    return getYdbStore().loadPm01VoiceAudio(audioId);
  }

  const id = String(audioId || "").trim();
  if (!id) {
    return null;
  }
  const index = readJson(PM01_VOICE_AUDIO_INDEX_FILE, {});
  const meta = index[id];
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
  initStorage,
  loadOlympiad,
  loadParticipants,
  loadSettings,
  loadAttempts,
  saveAttempts,
  upsertAttempt,
  loadAttemptById,
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
