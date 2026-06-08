const { Driver } = require("@ydbjs/core");
const { query, identifier } = require("@ydbjs/query");
const { EnvironCredentialsProvider } = require("@ydbjs/auth/environ");

const YDB_CONNECTION_STRING = process.env.YDB_CONNECTION_STRING || "";
const ATTEMPTS_TABLE = process.env.YDB_ATTEMPTS_TABLE || "olympiad_attempts";
const ATTEMPT_VARIANTS_TABLE =
  process.env.YDB_ATTEMPT_VARIANTS_TABLE || "olympiad_attempt_variants";
const ATTEMPT_ANSWERS_TABLE =
  process.env.YDB_ATTEMPT_ANSWERS_TABLE || "olympiad_attempt_answers";
const ADMIN_SESSIONS_TABLE = process.env.YDB_ADMIN_SESSIONS_TABLE || "admin_sessions";
const CONTENT_DRAFTS_TABLE =
  process.env.YDB_CONTENT_DRAFTS_TABLE || "olympiad_content_drafts";
const CONTENT_QUESTIONS_TABLE =
  process.env.YDB_CONTENT_QUESTIONS_TABLE || "olympiad_content_questions";
const PM01_VOICE_AUDIO_TABLE =
  process.env.YDB_PM01_VOICE_AUDIO_TABLE || "olympiad_pm01_voice_audio";

let sqlPromise = null;
let schemaReady = null;
let pm01VoiceAudioSchemaReady = null;

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
        CREATE TABLE IF NOT EXISTS ${identifier(ATTEMPT_VARIANTS_TABLE)} (
          id Utf8,
          payload_json Utf8,
          updated_at Utf8,
          PRIMARY KEY (id)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS ${identifier(ATTEMPT_ANSWERS_TABLE)} (
          attempt_id Utf8,
          question_id Utf8,
          payload_json Utf8,
          updated_at Utf8,
          PRIMARY KEY (attempt_id, question_id)
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
      await sql`
        CREATE TABLE IF NOT EXISTS ${identifier(CONTENT_DRAFTS_TABLE)} (
          question_id Utf8,
          payload_json Utf8,
          updated_at Utf8,
          PRIMARY KEY (question_id)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS ${identifier(CONTENT_QUESTIONS_TABLE)} (
          question_id Utf8,
          payload_json Utf8,
          updated_at Utf8,
          PRIMARY KEY (question_id)
        )
      `;
    })();
  }

  return schemaReady;
}

async function ensurePm01VoiceAudioSchema() {
  if (!pm01VoiceAudioSchemaReady) {
    pm01VoiceAudioSchemaReady = (async () => {
      const sql = await getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS ${identifier(PM01_VOICE_AUDIO_TABLE)} (
          audio_id Utf8,
          payload_json Utf8,
          audio_base64 Utf8,
          updated_at Utf8,
          PRIMARY KEY (audio_id)
        )
      `;
    })();
  }

  return pm01VoiceAudioSchemaReady;
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

function cloneAttemptState(attempt) {
  if (!attempt) {
    return attempt;
  }

  const state = { ...attempt };
  if (state.variant) {
    delete state.variant;
    state._variantStored = true;
  } else if (state._variantStored === undefined) {
    state._variantStored = false;
  }
  if (state.answers) {
    delete state.answers;
    state._answersStored = true;
  } else if (state._answersStored === undefined) {
    state._answersStored = false;
  }
  if (state.questionLog) {
    delete state.questionLog;
  }
  delete state._lastChangedQuestionId;
  return state;
}

function mergeStoredPartsIntoAttempt(statePayload, variantPayload, answerRows) {
  if (!statePayload) {
    return null;
  }

  const attempt = { ...statePayload };
  if (!attempt.variant && variantPayload) {
    attempt.variant = variantPayload;
  }
  if (!attempt.answers) {
    attempt.answers = {};
  }
  if (!attempt.questionLog) {
    attempt.questionLog = {};
  }
  for (const row of answerRows || []) {
    if (!row || !row.questionId) {
      continue;
    }
    if (row.answer) {
      attempt.answers[row.questionId] = row.answer;
    }
    if (row.log) {
      attempt.questionLog[row.questionId] = row.log;
    }
  }
  return attempt;
}

async function loadVariantRows() {
  const rows = await selectRows(ATTEMPT_VARIANTS_TABLE, "id");
  return rows
    .map((row) => {
      try {
        return {
          id: row.id,
          variant: JSON.parse(row.payload_json)
        };
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);
}

async function loadVariantByAttemptId(attemptId) {
  const row = await selectRowByKey(ATTEMPT_VARIANTS_TABLE, "id", attemptId);
  if (!row) {
    return null;
  }

  try {
    return JSON.parse(row.payload_json);
  } catch (error) {
    return null;
  }
}

async function upsertVariant(attemptId, variantPayload) {
  if (!attemptId || !variantPayload) {
    return;
  }

  await upsertRow(ATTEMPT_VARIANTS_TABLE, "id", attemptId, variantPayload);
}

async function loadAnswerRows() {
  await ensureSchema();
  const sql = await getSql();
  const [rows = []] = await sql`
    SELECT attempt_id, question_id, payload_json
    FROM ${identifier(ATTEMPT_ANSWERS_TABLE)}
  `;

  return rows
    .map((row) => {
      try {
        const payload = JSON.parse(row.payload_json);
        return {
          attemptId: row.attempt_id,
          questionId: row.question_id,
          answer: payload.answer || null,
          log: payload.log || null
        };
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);
}

async function loadAnswerRowsByAttemptId(attemptId) {
  await ensureSchema();
  const sql = await getSql();
  const [rows = []] = await sql`
    SELECT attempt_id, question_id, payload_json
    FROM ${identifier(ATTEMPT_ANSWERS_TABLE)}
    WHERE attempt_id = ${String(attemptId)}
  `;

  return rows
    .map((row) => {
      try {
        const payload = JSON.parse(row.payload_json);
        return {
          attemptId: row.attempt_id,
          questionId: row.question_id,
          answer: payload.answer || null,
          log: payload.log || null
        };
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);
}

async function upsertAnswerRow(attemptId, questionId, payload) {
  await ensureSchema();
  const sql = await getSql();
  await sql`
    UPSERT INTO ${identifier(ATTEMPT_ANSWERS_TABLE)} (attempt_id, question_id, payload_json, updated_at)
    VALUES (${String(attemptId)}, ${String(questionId)}, ${JSON.stringify(payload)}, ${new Date().toISOString()})
  `;
}

async function upsertAttemptAnswers(attempt) {
  if (!attempt || !attempt.id) {
    return;
  }

  const answers = attempt.answers || {};
  const questionLog = attempt.questionLog || {};
  const changedQuestionId = attempt._lastChangedQuestionId;

  if (changedQuestionId && answers[changedQuestionId]) {
    await upsertAnswerRow(attempt.id, changedQuestionId, {
      answer: answers[changedQuestionId],
      log: questionLog[changedQuestionId] || null
    });
    return;
  }

  for (const [questionId, answer] of Object.entries(answers)) {
    await upsertAnswerRow(attempt.id, questionId, {
      answer,
      log: questionLog[questionId] || null
    });
  }
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
  ensureConnectionString();
}

async function loadAttempts() {
  const rows = await selectRows(ATTEMPTS_TABLE, "id");
  const attempts = parsePayloadRows(rows);
  const variantMap = new Map((await loadVariantRows()).map((item) => [item.id, item.variant]));
  const answerRows = await loadAnswerRows();
  const answerMap = new Map();
  for (const row of answerRows) {
    if (!answerMap.has(row.attemptId)) {
      answerMap.set(row.attemptId, []);
    }
    answerMap.get(row.attemptId).push(row);
  }

  return attempts
    .map((attempt) => {
      if (!attempt) {
        return attempt;
      }
      if (attempt.variant && attempt.answers) {
        return attempt;
      }
      return mergeStoredPartsIntoAttempt(
        attempt,
        attempt._variantStored ? variantMap.get(attempt.id) || null : null,
        attempt._answersStored ? answerMap.get(attempt.id) || [] : []
      );
    })
    .sort((left, right) =>
      String(left.startedAt || left.id).localeCompare(String(right.startedAt || right.id))
    );
}

async function saveAttempts(attempts) {
  const items = attempts || [];
  for (const attempt of items) {
    if (!attempt || !attempt.id) {
      continue;
    }
    if (attempt.variant) {
      await upsertVariant(attempt.id, attempt.variant);
    }
    await upsertAttemptAnswers(attempt);
    await upsertRow(ATTEMPTS_TABLE, "id", attempt.id, cloneAttemptState(attempt));
  }
}

async function upsertAttempt(attempt) {
  if (!attempt || !attempt.id) {
    return;
  }

  if (attempt.variant && !attempt._variantStored) {
    await upsertVariant(attempt.id, attempt.variant);
    attempt._variantStored = true;
  }

  if ((attempt.answers && Object.keys(attempt.answers).length) || attempt._lastChangedQuestionId) {
    await upsertAttemptAnswers(attempt);
    attempt._answersStored = true;
  }

  await upsertRow(ATTEMPTS_TABLE, "id", attempt.id, cloneAttemptState(attempt));
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
    const statePayload = JSON.parse(row.payload_json);
    if (statePayload.variant && statePayload.answers) {
      return statePayload;
    }

    const variantPayload = statePayload._variantStored
      ? await loadVariantByAttemptId(attemptId)
      : null;
    const answerRows = statePayload._answersStored
      ? await loadAnswerRowsByAttemptId(attemptId)
      : [];
    return mergeStoredPartsIntoAttempt(statePayload, variantPayload, answerRows);
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

async function loadContentDrafts() {
  const rows = await selectRows(CONTENT_DRAFTS_TABLE, "question_id");
  const drafts = {};

  rows.forEach((row) => {
    try {
      drafts[row.question_id] = JSON.parse(row.payload_json);
    } catch (error) {
      // Skip malformed draft rows.
    }
  });

  return drafts;
}

async function saveContentDrafts(drafts) {
  const items = Object.entries(drafts || {}).map(([questionId, draft]) => ({
    questionId,
    draft
  }));

  await bulkUpsert(
    CONTENT_DRAFTS_TABLE,
    "question_id",
    items,
    (item) => item.questionId
  );
}

async function upsertContentDraft(questionId, draft) {
  if (!questionId || !draft) {
    return;
  }

  await upsertRow(CONTENT_DRAFTS_TABLE, "question_id", questionId, draft);
}

async function deleteContentDraft(questionId) {
  if (!questionId) {
    return;
  }

  await ensureSchema();
  const sql = await getSql();
  await sql`
    DELETE FROM ${identifier(CONTENT_DRAFTS_TABLE)}
    WHERE question_id = ${String(questionId)}
  `;
}

async function loadContentCustomQuestions() {
  const rows = await selectRows(CONTENT_QUESTIONS_TABLE, "question_id");
  const questions = {};

  rows.forEach((row) => {
    try {
      questions[row.question_id] = JSON.parse(row.payload_json);
    } catch (error) {
      // Skip malformed custom question rows.
    }
  });

  return questions;
}

async function saveContentCustomQuestions(questions) {
  const items = Object.entries(questions || {}).map(([questionId, question]) => ({
    questionId,
    question
  }));

  await bulkUpsert(
    CONTENT_QUESTIONS_TABLE,
    "question_id",
    items,
    (item) => item.questionId
  );
}

async function upsertContentCustomQuestion(questionId, question) {
  if (!questionId || !question) {
    return;
  }

  await upsertRow(CONTENT_QUESTIONS_TABLE, "question_id", questionId, question);
}

async function deleteContentCustomQuestion(questionId) {
  if (!questionId) {
    return;
  }

  await ensureSchema();
  const sql = await getSql();
  await sql`
    DELETE FROM ${identifier(CONTENT_QUESTIONS_TABLE)}
    WHERE question_id = ${String(questionId)}
  `;
}

async function savePm01VoiceAudio(meta, buffer) {
  await ensurePm01VoiceAudioSchema();
  const sql = await getSql();
  const normalized = {
    ...meta,
    byteLength: Number(meta.byteLength || buffer?.length || 0),
    createdAt: meta.createdAt || new Date().toISOString()
  };
  await sql`
    UPSERT INTO ${identifier(PM01_VOICE_AUDIO_TABLE)} (audio_id, payload_json, audio_base64, updated_at)
    VALUES (${String(normalized.id)}, ${JSON.stringify(normalized)}, ${Buffer.from(buffer || []).toString("base64")}, ${new Date().toISOString()})
  `;
  return normalized;
}

async function loadPm01VoiceAudio(audioId) {
  await ensurePm01VoiceAudioSchema();
  const sql = await getSql();
  const [rows = []] = await sql`
    SELECT audio_id, payload_json, audio_base64
    FROM ${identifier(PM01_VOICE_AUDIO_TABLE)}
    WHERE audio_id = ${String(audioId || "")}
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }
  try {
    return {
      meta: JSON.parse(row.payload_json),
      buffer: Buffer.from(row.audio_base64 || "", "base64")
    };
  } catch (error) {
    return null;
  }
}

module.exports = {
  initYdbStorage,
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
