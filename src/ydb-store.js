const { Driver } = require("@ydbjs/core");
const { query, identifier } = require("@ydbjs/query");
const { EnvironCredentialsProvider } = require("@ydbjs/auth/environ");

const YDB_CONNECTION_STRING = process.env.YDB_CONNECTION_STRING || "";
const ATTEMPTS_TABLE = process.env.YDB_ATTEMPTS_TABLE || "olympiad_attempts";
const ADMIN_SESSIONS_TABLE = process.env.YDB_ADMIN_SESSIONS_TABLE || "admin_sessions";

let sqlPromise = null;
let schemaReady = null;

function ensureConnectionString() {
  if (!YDB_CONNECTION_STRING) {
    throw new Error(
      "Для backend=ydb нужно указать переменную окружения YDB_CONNECTION_STRING."
    );
  }
}

async function getSql() {
  if (!sqlPromise) {
    sqlPromise = (async () => {
      ensureConnectionString();
      const credentialsProvider = new EnvironCredentialsProvider(
        YDB_CONNECTION_STRING
      );
      const driver = new Driver(YDB_CONNECTION_STRING, {
        credentialsProvider,
        secureOptions: credentialsProvider.secureOptions
      });
      await driver.ready();
      return query(driver);
    })();
  }

  return sqlPromise;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = await getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS ${identifier(ATTEMPTS_TABLE)} (
          id Utf8,
          payload_json Utf8,
          updated_at Utf8,
          PRIMARY KEY (id)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS ${identifier(ADMIN_SESSIONS_TABLE)} (
          token Utf8,
          payload_json Utf8,
          updated_at Utf8,
          PRIMARY KEY (token)
        )
      `;
    })();
  }

  return schemaReady;
}

async function selectRows(tableName, keyColumn) {
  await ensureSchema();
  const sql = await getSql();
  const [rows = []] = await sql`
    SELECT ${identifier(keyColumn)}, payload_json
    FROM ${identifier(tableName)}
  `;
  return rows;
}

async function selectRowByKey(tableName, keyColumn, keyValue) {
  await ensureSchema();
  const sql = await getSql();
  const [rows = []] = await sql`
    SELECT ${identifier(keyColumn)}, payload_json
    FROM ${identifier(tableName)}
    WHERE ${identifier(keyColumn)} = ${String(keyValue)}
  `;
  return rows[0] || null;
}

function parsePayloadRows(rows) {
  return rows
    .map((row) => {
      try {
        return JSON.parse(row.payload_json);
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);
}

async function upsertRow(tableName, keyColumn, keyValue, payload) {
  await ensureSchema();
  const sql = await getSql();
  await sql`
    UPSERT INTO ${identifier(tableName)} (${identifier(keyColumn)}, payload_json, updated_at)
    VALUES (${String(keyValue)}, ${JSON.stringify(payload)}, ${new Date().toISOString()})
  `;
}

async function bulkUpsert(tableName, keyColumn, items, getKey) {
  for (const item of items) {
    const key = getKey(item);
    if (!key) {
      continue;
    }
    await upsertRow(tableName, keyColumn, key, item);
  }
}

async function initYdbStorage() {
  await ensureSchema();
}

async function loadAttempts() {
  const rows = await selectRows(ATTEMPTS_TABLE, "id");
  return parsePayloadRows(rows).sort((left, right) =>
    String(left.startedAt || left.id).localeCompare(String(right.startedAt || right.id))
  );
}

async function saveAttempts(attempts) {
  await bulkUpsert(ATTEMPTS_TABLE, "id", attempts || [], (item) => item.id);
}

async function upsertAttempt(attempt) {
  if (!attempt || !attempt.id) {
    return;
  }
  await upsertRow(ATTEMPTS_TABLE, "id", attempt.id, attempt);
}

async function loadAttemptById(attemptId) {
  if (!attemptId) {
    return null;
  }
  const row = await selectRowByKey(ATTEMPTS_TABLE, "id", attemptId);
  if (!row) {
    return null;
  }

  try {
    return JSON.parse(row.payload_json);
  } catch (error) {
    return null;
  }
}

async function loadAdminSessions() {
  const rows = await selectRows(ADMIN_SESSIONS_TABLE, "token");
  return parsePayloadRows(rows);
}

async function loadAdminSessionByToken(token) {
  if (!token) {
    return null;
  }
  const row = await selectRowByKey(ADMIN_SESSIONS_TABLE, "token", token);
  if (!row) {
    return null;
  }

  try {
    return JSON.parse(row.payload_json);
  } catch (error) {
    return null;
  }
}

async function saveAdminSessions(sessions) {
  await bulkUpsert(
    ADMIN_SESSIONS_TABLE,
    "token",
    sessions || [],
    (item) => item.token
  );
}

module.exports = {
  initYdbStorage,
  loadAttempts,
  saveAttempts,
  upsertAttempt,
  loadAttemptById,
  loadAdminSessions,
  saveAdminSessions,
  loadAdminSessionByToken
};
