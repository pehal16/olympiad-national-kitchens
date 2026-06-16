"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const inputDir = path.resolve(process.argv[2] || path.join(".cloudflare-migration", "export"));
const databaseName = process.env.CLOUDFLARE_D1_DATABASE || "olympiad-gkts-db";
const bucketName = process.env.CLOUDFLARE_R2_BUCKET || "olympiad-gkts-voice";
const manifestPath = path.join(inputDir, "manifest.json");

function sqlString(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

function jsonSql(value) {
  return sqlString(JSON.stringify(value));
}

function statement(table, keyColumn, keyValue, payload) {
  return `INSERT INTO ${table} (${keyColumn}, payload_json, updated_at)
VALUES (${sqlString(keyValue)}, ${jsonSql(payload)}, datetime('now'))
ON CONFLICT(${keyColumn}) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at;`;
}

function cloneAttemptState(attempt) {
  const state = { ...attempt };
  if (state.variant) {
    delete state.variant;
    state._variantStored = true;
  }
  if (state.answers) {
    delete state.answers;
    state._answersStored = true;
  }
  if (state.questionLog) {
    delete state.questionLog;
  }
  delete state._lastChangedQuestionId;
  return state;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

function buildSql(manifest) {
  const lines = [
    "PRAGMA foreign_keys = OFF;",
    "BEGIN TRANSACTION;"
  ];

  for (const attempt of manifest.attempts || []) {
    if (!attempt?.id) {
      continue;
    }
    if (attempt.variant) {
      lines.push(statement("attempt_variants", "id", attempt.id, attempt.variant));
    }
    for (const [questionId, answer] of Object.entries(attempt.answers || {})) {
      const log = attempt.questionLog?.[questionId] || null;
      lines.push(`INSERT INTO attempt_answers (attempt_id, question_id, payload_json, updated_at)
VALUES (${sqlString(attempt.id)}, ${sqlString(questionId)}, ${jsonSql({ answer, log })}, datetime('now'))
ON CONFLICT(attempt_id, question_id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at;`);
    }
    lines.push(statement("attempts", "id", attempt.id, cloneAttemptState(attempt)));
  }

  for (const session of manifest.adminSessions || []) {
    if (session?.token) {
      lines.push(statement("admin_sessions", "token", session.token, session));
    }
  }

  for (const [questionId, draft] of Object.entries(manifest.contentDrafts || {})) {
    lines.push(statement("content_drafts", "question_id", questionId, draft));
  }

  for (const [questionId, question] of Object.entries(manifest.contentQuestions || {})) {
    lines.push(statement("content_questions", "question_id", questionId, question));
  }

  for (const voice of manifest.voices || []) {
    lines.push(`INSERT INTO pm01_voice_index (audio_id, payload_json, object_key, updated_at)
VALUES (${sqlString(voice.id)}, ${jsonSql(voice)}, ${sqlString(voice.objectKey)}, datetime('now'))
ON CONFLICT(audio_id) DO UPDATE SET payload_json = excluded.payload_json, object_key = excluded.object_key, updated_at = excluded.updated_at;`);
  }

  lines.push("COMMIT;");
  return lines.join("\n");
}

function main() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Migration manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const sqlPath = path.join(inputDir, "cloudflare-import.sql");
  fs.writeFileSync(sqlPath, buildSql(manifest), "utf8");

  run("npx", ["wrangler", "d1", "migrations", "apply", databaseName, "--remote"]);
  run("npx", ["wrangler", "d1", "execute", databaseName, "--remote", "--file", sqlPath]);

  for (const voice of manifest.voices || []) {
    const filePath = path.join(inputDir, voice.file || "");
    if (!fs.existsSync(filePath)) {
      throw new Error(`Voice file not found: ${filePath}`);
    }
    run("npx", ["wrangler", "r2", "object", "put", `${bucketName}/${voice.objectKey}`, "--file", filePath]);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        databaseName,
        bucketName,
        attempts: (manifest.attempts || []).length,
        voices: (manifest.voices || []).length
      },
      null,
      2
    )
  );
}

try {
  main();
} catch (error) {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
}
