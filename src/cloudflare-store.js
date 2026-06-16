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
  delete state._lastChangedQuestionId;
  return state;
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

async function loadAttempts() {
  const rows = await all("SELECT id, payload_json FROM attempts");
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
    .filter(Boolean)
    .sort((left, right) =>
      String(left.startedAt || left.id).localeCompare(String(right.startedAt || right.id))
    );
}

async function loadAttemptSummaries() {
  const rows = await all("SELECT id, payload_json FROM attempts");
  return parsePayloadRows(rows).sort((left, right) =>
    String(left.startedAt || left.id).localeCompare(String(right.startedAt || right.id))
  );
}

async function saveAttempts(attempts) {
  for (const attempt of attempts || []) {
    await upsertAttempt(attempt);
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

  await upsertPayload("attempts", "id", attempt.id, cloneAttemptState(attempt));
}

async function loadAttemptById(attemptId) {
  if (!attemptId) {
    return null;
  }
  const row = await first("SELECT id, payload_json FROM attempts WHERE id = ?1", String(attemptId));
  if (!row) {
    return null;
  }

  const statePayload = parseJson(row.payload_json);
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
  if (!PM01_VOICE) {
    throw new Error("Cloudflare R2 binding PM01_VOICE is not configured.");
  }
  const normalized = {
    ...meta,
    byteLength: Number(meta.byteLength || buffer?.length || 0),
    createdAt: meta.createdAt || nowIso()
  };
  const key = voiceObjectKey(normalized);
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
  await run(
    `INSERT INTO pm01_voice_index (audio_id, payload_json, object_key, updated_at)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(audio_id) DO UPDATE SET payload_json = excluded.payload_json, object_key = excluded.object_key, updated_at = excluded.updated_at`,
    String(normalized.id),
    JSON.stringify({ ...normalized, objectKey: key }),
    key,
    nowIso()
  );
  return normalized;
}

async function loadPm01VoiceAudio(audioId) {
  const { PM01_VOICE } = requireEnv();
  if (!PM01_VOICE || !audioId) {
    return null;
  }
  const row = await first(
    "SELECT audio_id, payload_json, object_key FROM pm01_voice_index WHERE audio_id = ?1",
    String(audioId)
  );
  if (!row) {
    return null;
  }
  const meta = parseJson(row.payload_json);
  const object = await PM01_VOICE.get(row.object_key);
  if (!meta || !object) {
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
