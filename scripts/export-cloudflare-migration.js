"use strict";

const fs = require("fs");
const path = require("path");
const {
  loadAttempts,
  loadAdminSessions,
  loadContentDrafts,
  loadContentCustomQuestions,
  loadPm01VoiceAudio
} = require("../src/store");

const outDir = path.resolve(process.argv[2] || path.join(".cloudflare-migration", "export"));
const audioDir = path.join(outDir, "audio");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) {
    return null;
  }
  return {
    mimeType: match[1] || "audio/webm",
    buffer: match[2] ? Buffer.from(match[3] || "", "base64") : Buffer.from(decodeURIComponent(match[3] || ""), "utf8")
  };
}

function safeFileName(value) {
  return String(value || "voice").replace(/[^a-zA-Z0-9_.-]+/g, "_").slice(0, 160);
}

function voiceObjectKey(meta) {
  return `pm01-voice/${encodeURIComponent(meta.attemptId)}/${encodeURIComponent(meta.questionId)}/${encodeURIComponent(meta.id)}.webm`;
}

async function collectVoice(attempt, questionId, answer, voices) {
  const payload = answer?.answerPayload || {};
  const audioId = payload.audioId || `pm01voice_migrated_${attempt.id}_${questionId}`;
  let audio = null;

  if (payload.audioDataUrl) {
    const parsed = parseDataUrl(payload.audioDataUrl);
    if (parsed?.buffer?.length) {
      audio = {
        meta: {
          id: audioId,
          attemptId: attempt.id,
          questionId,
          fileName: payload.audioName || `${questionId}.webm`,
          mimeType: parsed.mimeType || payload.mimeType || "audio/webm",
          durationMs: Number(payload.durationMs || 0),
          byteLength: parsed.buffer.length,
          createdAt: answer.savedAt || attempt.finishedAt || attempt.startedAt || new Date().toISOString()
        },
        buffer: parsed.buffer
      };
    }
  } else if (payload.audioId) {
    const stored = await loadPm01VoiceAudio(payload.audioId).catch(() => null);
    if (stored?.buffer?.length) {
      audio = {
        meta: {
          ...(stored.meta || {}),
          id: payload.audioId,
          attemptId: attempt.id,
          questionId,
          fileName: payload.audioName || stored.meta?.fileName || `${questionId}.webm`,
          mimeType: stored.meta?.mimeType || payload.mimeType || "audio/webm",
          durationMs: Number(payload.durationMs || stored.meta?.durationMs || 0),
          byteLength: stored.buffer.length,
          createdAt: stored.meta?.createdAt || answer.savedAt || attempt.startedAt || new Date().toISOString()
        },
        buffer: stored.buffer
      };
    }
  }

  if (!audio) {
    return;
  }

  ensureDir(audioDir);
  const meta = {
    ...audio.meta,
    objectKey: voiceObjectKey(audio.meta)
  };
  const fileName = `${safeFileName(meta.id)}.webm`;
  const filePath = path.join(audioDir, fileName);
  fs.writeFileSync(filePath, audio.buffer);
  voices.push({
    ...meta,
    file: path.relative(outDir, filePath).replace(/\\/g, "/")
  });

  delete payload.audioDataUrl;
  payload.audioId = meta.id;
  payload.audioName = payload.audioName || meta.fileName;
  payload.mimeType = payload.mimeType || meta.mimeType;
  payload.audioBytes = meta.byteLength;
  payload.audioUploadStatus = "stored";
  payload.audioUploadMessage = "Запись перенесена в Cloudflare R2.";
}

async function main() {
  ensureDir(outDir);
  const attempts = await loadAttempts();
  const voices = [];

  for (const attempt of attempts) {
    for (const [questionId, answer] of Object.entries(attempt.answers || {})) {
      await collectVoice(attempt, questionId, answer, voices);
    }
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    attempts,
    adminSessions: await loadAdminSessions(),
    contentDrafts: await loadContentDrafts(),
    contentQuestions: await loadContentCustomQuestions(),
    voices
  };
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        ok: true,
        outDir,
        attempts: attempts.length,
        voices: voices.length,
        adminSessions: manifest.adminSessions.length,
        contentDrafts: Object.keys(manifest.contentDrafts || {}).length,
        contentQuestions: Object.keys(manifest.contentQuestions || {}).length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
