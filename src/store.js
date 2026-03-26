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
  readJson(ATTEMPTS_FILE, []);
  readJson(SESSIONS_FILE, []);
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
    adminPassword: process.env.ADMIN_PASSWORD || settings.adminPassword || "",
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
      adminSessionsTable: process.env.YDB_ADMIN_SESSIONS_TABLE || "admin_sessions"
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

async function loadAdminSessions() {
  if (STORAGE_BACKEND === "ydb") {
    return getYdbStore().loadAdminSessions();
  }
  return readJson(SESSIONS_FILE, []);
}

async function saveAdminSessions(sessions) {
  if (STORAGE_BACKEND === "ydb") {
    await getYdbStore().saveAdminSessions(sessions);
    return;
  }
  writeJson(SESSIONS_FILE, sessions);
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
  loadAdminSessions,
  saveAdminSessions
};
