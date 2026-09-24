"use strict";

let cloudflareEnv = null;

function configureCloudflareStorage(env) {
  cloudflareEnv = env || cloudflareEnv || null;
}

function requireEnv() {
  if (!cloudflareEnv || !cloudflareEnv.DB) {
    throw new Error("Cloudflare D1 binding DB is not configured.");
  }
  return cloudflareEnv;
}

function nowIso() {
  return new Date().toISOString();
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
  delete state.stateRevision;
  delete state.accessTokenHash;
  delete state._lastChangedQuestionId;
  return state;
}

function normalizeStateRevision(value) {
  const revision = Number(value);
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
}

function parseJson(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function parsePayloadRows(rows) {
  return (rows || [])
    .map((row) => parseJson(row.payload_json))
    .filter(Boolean);
}

function parseAttemptRow(row) {
  if (!row) {
    return null;
  }
  const state = parseJson(row.payload_json);
  if (!state) {
    return null;
  }
  delete state.accessTokenHash;
  state.stateRevision = normalizeStateRevision(row.state_revision);
  state.accessTokenHash = row.access_token_hash || null;
  return state;
}

function parseAttemptRows(rows) {
  return (rows || []).map(parseAttemptRow).filter(Boolean);
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

async function initCloudflareStorage() {
  requireEnv();
}

async function all(sql, ...bindings) {
  const { DB } = requireEnv();
  const statement = DB.prepare(sql);
  const result = bindings.length ? await statement.bind(...bindings).all() : await statement.all();
  return result.results || [];
}

async function first(sql, ...bindings) {
  const { DB } = requireEnv();
  const statement = DB.prepare(sql);
  return bindings.length ? statement.bind(...bindings).first() : statement.first();
}

async function run(sql, ...bindings) {
  const { DB } = requireEnv();
  const statement = DB.prepare(sql);
  return bindings.length ? statement.bind(...bindings).run() : statement.run();
}

function statement(sql, ...bindings) {
  const { DB } = requireEnv();
  const prepared = DB.prepare(sql);
  return bindings.length ? prepared.bind(...bindings) : prepared;
}

function changedRowCount(result) {
  return Number(result?.meta?.changes || 0);
}

async function upsertPayload(tableName, keyColumn, keyValue, payload) {
  await run(
    `INSERT INTO ${tableName} (${keyColumn}, payload_json, updated_at)
     VALUES (?1, ?2, ?3)
     ON CONFLICT(${keyColumn}) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at`,
    String(keyValue),
    JSON.stringify(payload),
    nowIso()
  );
}

async function loadVariantRows() {
  const rows = await all("SELECT id, payload_json FROM attempt_variants");
  return rows
    .map((row) => ({
      id: row.id,
      variant: parseJson(row.payload_json)
    }))
    .filter((row) => row.id && row.variant);
}

async function loadVariantByAttemptId(attemptId) {
  const row = await first("SELECT id, payload_json FROM attempt_variants WHERE id = ?1", String(attemptId));
  return row ? parseJson(row.payload_json) : null;
}

async function upsertVariant(attemptId, variantPayload) {
  if (!attemptId || !variantPayload) {
    return;
  }
  await upsertPayload("attempt_variants", "id", attemptId, variantPayload);
}

function parseAnswerRow(row) {
  const payload = parseJson(row.payload_json);
  if (!payload) {
    return null;
  }
  return {
    attemptId: row.attempt_id,
    questionId: row.question_id,
    answer: payload.answer || null,
    log: payload.log || null
  };
}

async function loadAnswerRows() {
  const rows = await all("SELECT attempt_id, question_id, payload_json FROM attempt_answers");
  return rows.map(parseAnswerRow).filter(Boolean);
}

async function loadAnswerRowsByAttemptId(attemptId) {
  const rows = await all(
    "SELECT attempt_id, question_id, payload_json FROM attempt_answers WHERE attempt_id = ?1",
    String(attemptId)
  );
  return rows.map(parseAnswerRow).filter(Boolean);
}

async function upsertAnswerRow(attemptId, questionId, payload) {
  await run(
    `INSERT INTO attempt_answers (attempt_id, question_id, payload_json, updated_at)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(attempt_id, question_id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at`,
    String(attemptId),
    String(questionId),
    JSON.stringify(payload),
    nowIso()
  );
}

function selectChangedQuestionIds(attempt, options = {}) {
  if (Array.isArray(options.changedQuestionIds)) {
    return [...new Set(options.changedQuestionIds.map(String).filter(Boolean))];
  }

  if (attempt?._lastChangedQuestionId) {
    return [String(attempt._lastChangedQuestionId)];
  }

  return [
    ...new Set([
      ...Object.keys(attempt?.answers || {}),
      ...Object.keys(attempt?.questionLog || {})
    ])
  ];
}

function answerRowPayloads(attempt, options = {}) {
  if (!attempt || !attempt.id || options.stateOnly) {
    return [];
  }

  const answers = attempt.answers || {};
  const questionLog = attempt.questionLog || {};
  return selectChangedQuestionIds(attempt, options)
    .filter((questionId) => answers[questionId] || questionLog[questionId])
    .map((questionId) => ({
      questionId,
      payload: {
        answer: answers[questionId] || null,
        log: questionLog[questionId] || null
      }
    }));
}

async function upsertAttemptAnswers(attempt, options = {}) {
  if (!attempt || !attempt.id) {
    return;
  }

  for (const row of answerRowPayloads(attempt, options)) {
    await upsertAnswerRow(attempt.id, row.questionId, row.payload);
  }
}

async function loadAttempts() {
  const rows = await all(
    "SELECT id, payload_json, state_revision, access_token_hash FROM attempts"
  );
  const attempts = parseAttemptRows(rows);
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
    .filter(Boolean)
    .sort((left, right) =>
      String(left.startedAt || left.id).localeCompare(String(right.startedAt || right.id))
    );
}

async function loadAttemptSummaries() {
  const rows = await all(
    "SELECT id, payload_json, state_revision, access_token_hash FROM attempts"
  );
  return parseAttemptRows(rows).sort((left, right) =>
    String(left.startedAt || left.id).localeCompare(String(right.startedAt || right.id))
  );
}

async function saveAttempts(attempts) {
  for (const attempt of attempts || []) {
    await upsertAttempt(attempt);
  }
}

async function upsertAttemptState(attempt) {
  const statePayload = cloneAttemptState(attempt);
  const accessTokenHash = attempt.accessTokenHash || null;
  await run(
    `INSERT INTO attempts
      (id, payload_json, updated_at, state_revision, access_token_hash)
     VALUES (?1, ?2, ?3, 0, ?4)
     ON CONFLICT(id) DO UPDATE SET
       payload_json = excluded.payload_json,
       updated_at = excluded.updated_at,
       state_revision = attempts.state_revision + 1,
       access_token_hash = COALESCE(excluded.access_token_hash, attempts.access_token_hash)`,
    String(attempt.id),
    JSON.stringify(statePayload),
    nowIso(),
    accessTokenHash
  );
}

async function createAttemptAtomic(attempt) {
  if (!attempt || !attempt.id) {
    return { created: false, attempt: null };
  }

  const storedAttempt = {
    ...attempt,
    stateRevision: 0,
    accessTokenHash: attempt.accessTokenHash || null
  };
  const storedAt = nowIso();
  const statements = [
    statement(
      `INSERT INTO attempts
        (id, payload_json, updated_at, state_revision, access_token_hash)
       VALUES (?1, ?2, ?3, 0, ?4)`,
      String(storedAttempt.id),
      JSON.stringify(cloneAttemptState(storedAttempt)),
      storedAt,
      storedAttempt.accessTokenHash
    )
  ];

  if (storedAttempt.variant) {
    statements.push(
      statement(
        `INSERT INTO attempt_variants (id, payload_json, updated_at)
         VALUES (?1, ?2, ?3)`,
        String(storedAttempt.id),
        JSON.stringify(storedAttempt.variant),
        storedAt
      )
    );
  }

  for (const row of answerRowPayloads(storedAttempt)) {
    statements.push(
      statement(
        `INSERT INTO attempt_answers (attempt_id, question_id, payload_json, updated_at)
         VALUES (?1, ?2, ?3, ?4)`,
        String(storedAttempt.id),
        row.questionId,
        JSON.stringify(row.payload),
        storedAt
      )
    );
  }

  try {
    const { DB } = requireEnv();
    await DB.batch(statements);
  } catch (error) {
    if (!/unique|constraint/i.test(String(error?.message || error))) {
      throw error;
    }
    const existing = await loadAttemptById(storedAttempt.id);
    if (!existing) {
      throw error;
    }
    return { created: false, attempt: existing };
  }

  storedAttempt._variantStored = Boolean(storedAttempt.variant);
  storedAttempt._answersStored = Boolean(
    Object.keys(storedAttempt.answers || {}).length ||
    Object.keys(storedAttempt.questionLog || {}).length
  );
  return { created: true, attempt: storedAttempt };
}

async function updateAttemptWithRevision(attempt, expectedRevision, options = {}) {
  if (!attempt || !attempt.id) {
    return false;
  }

  const expected = normalizeStateRevision(expectedRevision);
  if (Number(expectedRevision) !== expected) {
    return false;
  }

  const storedAt = nowIso();
  const statements = [];
  for (const row of answerRowPayloads(attempt, options)) {
    statements.push(
      statement(
        `INSERT INTO attempt_answers (attempt_id, question_id, payload_json, updated_at)
         SELECT ?1, ?2, ?3, ?4
         WHERE EXISTS (
           SELECT 1 FROM attempts WHERE id = ?1 AND state_revision = ?5
         )
         ON CONFLICT(attempt_id, question_id) DO UPDATE SET
           payload_json = excluded.payload_json,
           updated_at = excluded.updated_at`,
        String(attempt.id),
        row.questionId,
        JSON.stringify(row.payload),
        storedAt,
        expected
      )
    );
  }

  statements.push(
    statement(
      `UPDATE attempts
       SET payload_json = ?2,
           updated_at = ?3,
           state_revision = state_revision + 1,
           access_token_hash = CASE
             WHEN ?4 IS NULL THEN access_token_hash
             ELSE ?4
           END
       WHERE id = ?1 AND state_revision = ?5`,
      String(attempt.id),
      JSON.stringify(cloneAttemptState(attempt)),
      storedAt,
      attempt.accessTokenHash === undefined ? null : attempt.accessTokenHash,
      expected
    )
  );

  const { DB } = requireEnv();
  const results = await DB.batch(statements);
  const updated = changedRowCount(results[results.length - 1]) === 1;
  if (updated) {
    attempt.stateRevision = expected + 1;
  }
  return updated;
}

async function upsertAttempt(attempt, options = {}) {
  if (!attempt || !attempt.id) {
    return;
  }

  if (attempt.variant && !attempt._variantStored) {
    await upsertVariant(attempt.id, attempt.variant);
    attempt._variantStored = true;
  }

  if (
    !options.stateOnly &&
    (
      (attempt.answers && Object.keys(attempt.answers).length) ||
      (attempt.questionLog && Object.keys(attempt.questionLog).length) ||
      attempt._lastChangedQuestionId
    )
  ) {
    await upsertAttemptAnswers(attempt, options);
    attempt._answersStored = true;
  }

  await upsertAttemptState(attempt);
}

async function loadAttemptById(attemptId) {
  if (!attemptId) {
    return null;
  }
  const row = await first(
    `SELECT id, payload_json, state_revision, access_token_hash
     FROM attempts WHERE id = ?1`,
    String(attemptId)
  );
  if (!row) {
    return null;
  }

  const statePayload = parseAttemptRow(row);
  if (!statePayload) {
    return null;
  }
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
}

async function appendAttemptEvent(attemptId, event, maxEvents = 250) {
  const limit = Math.max(0, Math.trunc(Number(maxEvents) || 0));
  if (!attemptId || !event?.eventId || limit === 0) {
    return { stored: false };
  }

  const storedEvent = { ...event, attemptId: String(attemptId) };
  const result = await run(
    `INSERT INTO olympiad_attempt_events
      (attempt_id, event_id, event_type, payload_json, occurred_at, received_at)
     SELECT ?1, ?2, ?3, ?4, ?5, ?6
     WHERE (
       SELECT COUNT(*) FROM olympiad_attempt_events WHERE attempt_id = ?1
     ) < ?7
     ON CONFLICT(attempt_id, event_id) DO NOTHING`,
    String(attemptId),
    String(event.eventId),
    String(event.eventType),
    JSON.stringify(storedEvent),
    String(event.occurredAt),
    String(event.receivedAt),
    limit
  );
  const stored = changedRowCount(result) === 1;
  return stored ? { stored: true, event: storedEvent } : { stored: false };
}

async function loadAttemptEvents(attemptId) {
  const rows = await all(
    `SELECT payload_json
     FROM olympiad_attempt_events
     WHERE attempt_id = ?1
     ORDER BY received_at ASC`,
    String(attemptId)
  );
  return parsePayloadRows(rows);
}

async function loadAdminSessions() {
  const rows = await all("SELECT token, payload_json FROM admin_sessions");
  return parsePayloadRows(rows);
}

async function loadAdminSessionByToken(token) {
  if (!token) {
    return null;
  }
  const row = await first("SELECT token, payload_json FROM admin_sessions WHERE token = ?1", String(token));
  return row ? parseJson(row.payload_json) : null;
}

async function saveAdminSessions(sessions) {
  for (const session of sessions || []) {
    if (session?.token) {
      await upsertPayload("admin_sessions", "token", session.token, session);
    }
  }
}

async function loadContentDrafts() {
  const rows = await all("SELECT question_id, payload_json FROM content_drafts");
  const drafts = {};
  rows.forEach((row) => {
    const draft = parseJson(row.payload_json);
    if (draft) {
      drafts[row.question_id] = draft;
    }
  });
  return drafts;
}

async function saveContentDrafts(drafts) {
  for (const [questionId, draft] of Object.entries(drafts || {})) {
    await upsertContentDraft(questionId, draft);
  }
}

async function upsertContentDraft(questionId, draft) {
  if (!questionId || !draft) {
    return;
  }
  await upsertPayload("content_drafts", "question_id", questionId, draft);
}

async function deleteContentDraft(questionId) {
  await run("DELETE FROM content_drafts WHERE question_id = ?1", String(questionId || ""));
}

async function loadContentCustomQuestions() {
  const rows = await all("SELECT question_id, payload_json FROM content_questions");
  const questions = {};
  rows.forEach((row) => {
    const question = parseJson(row.payload_json);
    if (question) {
      questions[row.question_id] = question;
    }
  });
  return questions;
}

async function saveContentCustomQuestions(questions) {
  for (const [questionId, question] of Object.entries(questions || {})) {
    await upsertContentCustomQuestion(questionId, question);
  }
}

async function upsertContentCustomQuestion(questionId, question) {
  if (!questionId || !question) {
    return;
  }
  await upsertPayload("content_questions", "question_id", questionId, question);
}

async function deleteContentCustomQuestion(questionId) {
  await run("DELETE FROM content_questions WHERE question_id = ?1", String(questionId || ""));
}

function voiceObjectKey(meta) {
  return `pm01-voice/${encodeURIComponent(meta.attemptId)}/${encodeURIComponent(meta.questionId)}/${encodeURIComponent(meta.id)}.webm`;
}

async function savePm01VoiceAudio(meta, buffer) {
  const { PM01_VOICE } = requireEnv();
  const normalized = {
    ...meta,
    byteLength: Number(meta.byteLength || buffer?.length || 0),
    createdAt: meta.createdAt || nowIso()
  };
  const key = voiceObjectKey(normalized);

  if (PM01_VOICE) {
    await PM01_VOICE.put(key, buffer, {
      httpMetadata: {
        contentType: normalized.mimeType || "audio/webm"
      },
      customMetadata: {
        audioId: normalized.id,
        attemptId: normalized.attemptId,
        questionId: normalized.questionId
      }
    });
  }

  const audioBase64 = PM01_VOICE ? null : Buffer.from(buffer || "").toString("base64");
  await run(
    `INSERT INTO pm01_voice_index (audio_id, payload_json, object_key, audio_base64, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(audio_id) DO UPDATE SET
       payload_json = excluded.payload_json,
       object_key = excluded.object_key,
       audio_base64 = excluded.audio_base64,
       updated_at = excluded.updated_at`,
    String(normalized.id),
    JSON.stringify({ ...normalized, objectKey: key, storage: PM01_VOICE ? "r2" : "d1" }),
    key,
    audioBase64,
    nowIso()
  );
  return normalized;
}

async function loadPm01VoiceAudio(audioId) {
  const { PM01_VOICE } = requireEnv();
  if (!audioId) {
    return null;
  }
  const row = await first(
    "SELECT audio_id, payload_json, object_key, audio_base64 FROM pm01_voice_index WHERE audio_id = ?1",
    String(audioId)
  );
  if (!row) {
    return null;
  }
  const meta = parseJson(row.payload_json);
  if (!meta) {
    return null;
  }
  if (row.audio_base64) {
    return {
      meta,
      buffer: Buffer.from(row.audio_base64, "base64")
    };
  }
  if (!PM01_VOICE || !row.object_key) {
    return null;
  }
  const object = await PM01_VOICE.get(row.object_key);
  if (!object) {
    return null;
  }
  const arrayBuffer = await object.arrayBuffer();
  return {
    meta,
    buffer: Buffer.from(arrayBuffer)
  };
}

module.exports = {
  configureCloudflareStorage,
  initCloudflareStorage,
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
