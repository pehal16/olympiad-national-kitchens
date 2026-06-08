const { Driver } = require("@ydbjs/core");
const { EnvironCredentialsProvider } = require("@ydbjs/auth/environ");
const { identifier, query } = require("@ydbjs/query");

const DEFAULT_OLYMPIAD_ID = "pm01-2026-exam";
const ATTEMPTS_TABLE = process.env.YDB_ATTEMPTS_TABLE || "olympiad_attempts";
const ATTEMPT_VARIANTS_TABLE =
  process.env.YDB_ATTEMPT_VARIANTS_TABLE || "olympiad_attempt_variants";
const ATTEMPT_ANSWERS_TABLE =
  process.env.YDB_ATTEMPT_ANSWERS_TABLE || "olympiad_attempt_answers";
const YDB_CONNECTION_STRING = process.env.YDB_CONNECTION_STRING || "";

function targetOlympiadId() {
  return String(process.argv[2] || process.env.PM01_RESET_OLYMPIAD_ID || DEFAULT_OLYMPIAD_ID).trim();
}

function ensureConfirmed(olympiadId) {
  if (olympiadId !== DEFAULT_OLYMPIAD_ID && process.env.ALLOW_ANY_OLYMPIAD_RESET !== "true") {
    throw new Error(`Refusing to reset unexpected olympiadId: ${olympiadId}`);
  }
  if (process.env.CONFIRM_PM01_RESET !== "true") {
    throw new Error("Set CONFIRM_PM01_RESET=true to delete production PM01 attempts.");
  }
  if (!YDB_CONNECTION_STRING) {
    throw new Error("YDB_CONNECTION_STRING is required.");
  }
}

async function createSql() {
  const credentialsProvider = new EnvironCredentialsProvider(YDB_CONNECTION_STRING);
  const driver = new Driver(YDB_CONNECTION_STRING, {
    credentialsProvider,
    secureOptions: credentialsProvider.secureOptions
  });
  await driver.ready();
  return query(driver);
}

function parseAttemptRow(row) {
  try {
    const payload = JSON.parse(row.payload_json);
    return {
      id: String(row.id || payload.id || ""),
      olympiadId: payload.olympiadId || "",
      clientIp: payload.clientIp || "",
      participant: payload.participant || null
    };
  } catch (_) {
    return null;
  }
}

async function loadTargetAttempts(sql, olympiadId) {
  const [rows = []] = await sql`
    SELECT id, payload_json
    FROM ${identifier(ATTEMPTS_TABLE)}
  `;

  return rows
    .map(parseAttemptRow)
    .filter((attempt) => attempt && attempt.id && attempt.olympiadId === olympiadId);
}

async function countAnswerRows(sql, attemptId) {
  const [rows = []] = await sql`
    SELECT question_id
    FROM ${identifier(ATTEMPT_ANSWERS_TABLE)}
    WHERE attempt_id = ${String(attemptId)}
  `;
  return rows.length;
}

async function hasVariantRow(sql, attemptId) {
  const [rows = []] = await sql`
    SELECT id
    FROM ${identifier(ATTEMPT_VARIANTS_TABLE)}
    WHERE id = ${String(attemptId)}
  `;
  return rows.length > 0;
}

async function deleteAttemptParts(sql, attemptId) {
  const answerRows = await countAnswerRows(sql, attemptId);
  const variantRows = (await hasVariantRow(sql, attemptId)) ? 1 : 0;

  await sql`
    DELETE FROM ${identifier(ATTEMPT_ANSWERS_TABLE)}
    WHERE attempt_id = ${String(attemptId)}
  `;
  await sql`
    DELETE FROM ${identifier(ATTEMPT_VARIANTS_TABLE)}
    WHERE id = ${String(attemptId)}
  `;
  await sql`
    DELETE FROM ${identifier(ATTEMPTS_TABLE)}
    WHERE id = ${String(attemptId)}
  `;

  return { answerRows, variantRows };
}

async function main() {
  const olympiadId = targetOlympiadId();
  ensureConfirmed(olympiadId);
  const sql = await createSql();
  const attempts = await loadTargetAttempts(sql, olympiadId);
  const uniqueIps = new Set(attempts.map((attempt) => attempt.clientIp).filter(Boolean));

  if (process.env.DRY_RUN === "true") {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          olympiadId,
          attemptsMatched: attempts.length,
          uniqueIpCount: uniqueIps.size,
          sampleAttemptIds: attempts.slice(0, 10).map((attempt) => attempt.id)
        },
        null,
        2
      )
    );
    return;
  }

  let answerRowsDeleted = 0;
  let variantRowsDeleted = 0;
  for (const attempt of attempts) {
    const deleted = await deleteAttemptParts(sql, attempt.id);
    answerRowsDeleted += deleted.answerRows;
    variantRowsDeleted += deleted.variantRows;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: false,
        olympiadId,
        attemptsDeleted: attempts.length,
        variantRowsDeleted,
        answerRowsDeleted,
        uniqueIpCount: uniqueIps.size,
        sampleAttemptIds: attempts.slice(0, 10).map((attempt) => attempt.id)
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error.message
      },
      null,
      2
    )
  );
  process.exit(1);
});
