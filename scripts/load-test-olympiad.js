"use strict";

const { performance } = require("node:perf_hooks");
const crypto = require("node:crypto");

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

const baseUrl = argument("base-url", "http://127.0.0.1:3100").replace(/\/$/, "");
const participantCount = Math.max(1, Number(argument("participants", 60)) || 60);
const answersArgument = argument("answers", "3");
const rampMs = Math.max(0, Number(argument("ramp-ms", 0)) || 0);
const duplicateEvery = Math.max(0, Number(argument("duplicate-every", 10)) || 0);
const requestTimeoutMs = Math.max(1000, Number(argument("timeout-ms", 10000)) || 10000);
const finishRequested = ["1", "true", "yes"].includes(
  argument("finish", "false").toLowerCase()
);
const runId = `load-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const nameAlphabet = "абвгдежзийклмнопрстуфхцчшщэюя";
const runNameSuffix = [...crypto.randomBytes(4)]
  .map((value) => nameAlphabet[value % nameAlphabet.length])
  .join("");
const target = new URL(baseUrl);
const isLocal = ["127.0.0.1", "localhost", "::1"].includes(target.hostname);

if (!isLocal && process.env.ALLOW_REMOTE_LOAD_TEST !== "1") {
  console.error(
    "Remote load testing is blocked. Use a preview environment and set ALLOW_REMOTE_LOAD_TEST=1 explicitly."
  );
  process.exit(2);
}

const timings = new Map();
const errors = [];

function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function record(operation, durationMs) {
  if (!timings.has(operation)) timings.set(operation, []);
  timings.get(operation).push(durationMs);
}

async function request(operation, path, options = {}) {
  const { attemptToken, signal: externalSignal, ...fetchOptions } = options;
  const headers = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers || {})
  };
  if (attemptToken) headers["X-Attempt-Token"] = attemptToken;

  const started = performance.now();
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), requestTimeoutMs);
  const signal = externalSignal
    ? AbortSignal.any([externalSignal, timeoutController.signal])
    : timeoutController.signal;
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...fetchOptions,
      headers,
      signal
    });
    let payload = {};
    try {
      payload = await response.json();
    } catch (error) {
      payload = {};
    }
    if (!response.ok || payload.ok === false) {
      const error = new Error(payload.message || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return payload.data;
  } catch (error) {
    if (error?.name === "AbortError" && timeoutController.signal.aborted) {
      const timeoutError = new Error(`Request timed out after ${requestTimeoutMs} ms.`);
      timeoutError.status = 408;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    record(operation, performance.now() - started);
  }
}

function emptyValidAnswer(question) {
  if (!question) return {};
  if (question.type === "single_choice") return { selectedOptionId: null };
  if (question.type === "sequence_drag") return { sequence: [] };
  if (question.type === "bucket_sort" || question.type === "ingredient_matrix") {
    return { buckets: {} };
  }
  if (question.type === "dish_assembly") return { selectedIngredientIds: [] };
  return {};
}

function shouldDuplicate(context, round = 0) {
  return duplicateEvery > 0 && (context.index + round) % duplicateEvery === 0;
}

function newestAttempt(attempts) {
  return attempts
    .filter(Boolean)
    .sort(
      (left, right) =>
        Number(right.stateRevision || 0) - Number(left.stateRevision || 0) ||
        Number(right.progress?.answeredCount || 0) - Number(left.progress?.answeredCount || 0)
    )[0];
}

async function prepareParticipant(index) {
  if (rampMs) await pause(Math.round((index / participantCount) * rampMs));
  const participant = {
    fullName: `Нагрузочный Участник${runNameSuffix}${nameAlphabet[Math.floor(index / nameAlphabet.length)]}${nameAlphabet[index % nameAlphabet.length]}`,
    institution: "Техническая репетиция",
    groupName: `LOAD-${String((index % 10) + 1).padStart(2, "0")}`,
    mentorName: ""
  };
  const attemptToken = crypto.randomBytes(32).toString("base64url");
  const context = { index, participant, attemptToken, attempt: null, submitted: 0, targetAnswers: 0 };

  try {
    await request("register", "/api/public/register", {
      method: "POST",
      body: JSON.stringify(participant)
    });
    const start = () =>
      request("start", "/api/public/attempts/start", {
        method: "POST",
        attemptToken,
        body: JSON.stringify({ participant })
      });
    const starts = shouldDuplicate(context) ? await Promise.all([start(), start()]) : [await start()];
    const startIds = new Set(starts.map((attempt) => attempt.id));
    if (startIds.size !== 1) throw new Error("Concurrent start created different attempt ids.");
    context.attempt = newestAttempt(starts);
    context.targetAnswers =
      answersArgument === "all"
        ? Number(context.attempt.progress?.totalQuestions || 0)
        : Math.max(0, Number(answersArgument) || 0);

    const integrityBody = JSON.stringify({
      eventId: `${runId}-${index}-ready`,
      eventType: "guard_restored",
      reason: "Синтетическая проверка журнала",
      occurredAt: new Date().toISOString(),
      questionId: context.attempt.currentQuestion?.id || "",
      visibilityState: "visible",
      fullscreen: true,
      clientIncidentCount: 0
    });
    const sendIntegrity = () =>
      request("integrity", `/api/public/attempts/${context.attempt.id}/integrity`, {
        method: "POST",
        attemptToken,
        body: integrityBody
      });
    const integrityResults = shouldDuplicate(context)
      ? await Promise.all([sendIntegrity(), sendIntegrity()])
      : [await sendIntegrity()];
    if (integrityResults.some((item) => Number(item.summary?.eventCount || 0) !== 1)) {
      throw new Error("Concurrent duplicate integrity event was not idempotent.");
    }
    return context;
  } catch (error) {
    errors.push({ participant: index + 1, phase: "start", status: error.status || 0, message: error.message });
    return null;
  }
}

async function submitAnswerRound(context, round) {
  if (
    !context ||
    context.failed ||
    context.attempt.status !== "in_progress" ||
    context.submitted >= context.targetAnswers
  ) {
    return;
  }

  const question = context.attempt.currentQuestion;
  const answeredBefore = Number(context.attempt.progress?.answeredCount || 0);
  const send = () =>
    request("answer", `/api/public/attempts/${context.attempt.id}/answer`, {
      method: "POST",
      attemptToken: context.attemptToken,
      body: JSON.stringify({
        questionId: question?.id || "",
        answerPayload: emptyValidAnswer(question)
      })
    });

  try {
    const responses = shouldDuplicate(context, round)
      ? await Promise.all([send(), send()])
      : [await send()];
    context.attempt = newestAttempt(responses);
    context.submitted += 1;
    const answeredAfter = Number(context.attempt.progress?.answeredCount || 0);
    if (answeredAfter !== answeredBefore + 1) {
      throw new Error(
        `Answer progression mismatch: expected ${answeredBefore + 1}, received ${answeredAfter}.`
      );
    }
  } catch (error) {
    errors.push({
      participant: context.index + 1,
      phase: `answer-${round + 1}`,
      status: error.status || 0,
      message: error.message
    });
    context.failed = true;
  }
}

async function verifyParticipant(context) {
  if (!context || context.failed) return { ok: false };
  try {
    const pulse = await request("pulse", `/api/public/attempts/${context.attempt.id}/pulse`, {
      attemptToken: context.attemptToken
    });
    context.attempt = { ...context.attempt, ...pulse };
    if (Number(pulse.progress?.answeredCount || 0) !== context.submitted) {
      throw new Error(
        `Persisted answer count mismatch: submitted ${context.submitted}, stored ${pulse.progress?.answeredCount}.`
      );
    }

    if (finishRequested && pulse.status === "in_progress") {
      const finish = () =>
        request("finish", `/api/public/attempts/${context.attempt.id}/finish`, {
          method: "POST",
          attemptToken: context.attemptToken
        });
      const finishes = await Promise.all([finish(), finish()]);
      if (new Set(finishes.map((attempt) => attempt.finishedAt)).size !== 1) {
        throw new Error("Repeated finish changed finishedAt.");
      }
      context.attempt = newestAttempt(finishes);
    }

    return {
      ok: true,
      attemptId: context.attempt.id,
      status: context.attempt.status,
      submitted: context.submitted
    };
  } catch (error) {
    errors.push({
      participant: context.index + 1,
      phase: "verify",
      status: error.status || 0,
      message: error.message
    });
    return { ok: false };
  }
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return Math.round(sorted[index] * 10) / 10;
}

async function main() {
  await request("health", "/api/health");
  const started = performance.now();
  const contexts = (
    await Promise.all(
      Array.from({ length: participantCount }, (_, index) => prepareParticipant(index))
    )
  ).filter(Boolean);
  const rounds = Math.max(0, ...contexts.map((context) => context.targetAnswers));
  for (let round = 0; round < rounds; round += 1) {
    await Promise.all(contexts.map((context) => submitAnswerRound(context, round)));
  }
  const results = await Promise.all(contexts.map(verifyParticipant));
  const elapsedMs = performance.now() - started;
  const successful = results.filter((item) => item.ok);
  const uniqueAttemptIds = new Set(successful.map((item) => item.attemptId));
  if (uniqueAttemptIds.size !== successful.length) {
    errors.push({ phase: "verify", message: "Different participants received duplicate attempt ids." });
  }

  const operations = {};
  for (const [operation, values] of timings.entries()) {
    operations[operation] = {
      count: values.length,
      p50Ms: percentile(values, 0.5),
      p95Ms: percentile(values, 0.95),
      p99Ms: percentile(values, 0.99),
      maxMs: Math.round(Math.max(...values) * 10) / 10
    };
  }

  const output = {
    runId,
    baseUrl,
    participants: participantCount,
    synchronizedAnswerRounds: rounds,
    duplicateEvery,
    requestTimeoutMs,
    successfulParticipants: successful.length,
    uniqueAttemptIds: uniqueAttemptIds.size,
    elapsedMs: Math.round(elapsedMs),
    operations,
    errors: errors.slice(0, 20)
  };
  console.log(JSON.stringify(output, null, 2));

  const startP95 = operations.start?.p95Ms || 0;
  const answerP95 = operations.answer?.p95Ms || 0;
  const answerP99 = operations.answer?.p99Ms || 0;
  if (
    errors.length ||
    successful.length !== participantCount ||
    startP95 > 2000 ||
    answerP95 > 1000 ||
    answerP99 > 2000
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
