"use strict";
// Runs only against a fresh local database. Never points at the public/working run.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { trialPaths, startTrial } = require("./windows-trial");
const argument = (name, fallback) => process.argv.find(v => v.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;
const count = Number(argument("participants", "70"));
assert.ok(Number.isInteger(count) && count >= 60 && count <= 200, "Participants must be 60–200.");
const directory = path.join(trialPaths().root, "load-rehearsals", `quality-${count}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`);
const state = trialPaths(directory);
const report = { checkedAt: new Date().toISOString(), machine: os.hostname(), cpu: os.cpus()[0]?.model,
  memoryGB: Math.round(os.totalmem() / 1024 ** 3), node: process.versions.node,
  environment: "fresh local SQLite / loopback only", participants: count, checks: [], metrics: {}, errors: [] };
let test, cookie = "";
const samples = new Map();
async function api(route, token = "", body, expected = 200, method = body === undefined ? "GET" : "POST") {
  const started = performance.now();
  const response = await fetch(test.baseUrl + route, { method, signal: AbortSignal.timeout(20000),
    headers: { "Content-Type": "application/json", ...(token ? { "X-Attempt-Token": token } : {}),
      ...(route.startsWith("/api/admin") && cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const value = await response.json();
  const operation = route.split("/").at(-1);
  if (!samples.has(operation)) samples.set(operation, []);
  samples.get(operation).push(performance.now() - started);
  assert.ok(response.status === expected || (expected === 200 && response.status === 201),
    `${operation}: HTTP ${response.status}; ${value.message || ""}`);
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  if (route.endsWith("/login")) { cookie = response.headers.get("set-cookie")?.split(";")[0] || ""; assert.ok(cookie); }
  return value.data;
}
function answer(q, person) {
  const k = person.index < 2 ? 0 : person.index % 5;
  const whole = person.index > 1 || (person.index === 1 && q.globalIndex === 1);
  if (q.type === "single_choice") return { selectedOptionId: whole ? q.options.find(o => o.isCorrect).id : null };
  if (q.type === "dish_detective") return { text: whole ? q.answerPolicy.canonical : "" };
  if (q.type === "bucket_sort") return { buckets: Object.fromEntries(Object.entries(q.correctBuckets).slice(0, k)) };
  if (q.type === "final_kitchen") {
    const d = q.dishes[0], correct = d.correctIngredientIds;
    return { dishId: d.id, selectedIngredientIds: [...correct.slice(0, k), ...d.items.filter(i => !correct.includes(i.id)).slice(0, 4 - k).map(i => i.id)] };
  }
  throw Error(`Unsupported question type ${q.type}`);
}
function expected(person) {
  if (person.index === 0) return { score: 0, plates: 0 };
  if (person.index === 1) return { score: 2, plates: 1 };
  const k = person.index % 5;
  return { score: 82 + 17 * k, plates: 28 + 5 * k + (k === 4 ? 3 : 0) };
}
async function main() {
  test = await startTrial(state, { port: 0, openBrowser: false });
  report.revision = test.report.revision;
  assert.notEqual(state.database, trialPaths().database);
  const alphabet = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ";
  const people = await Promise.all(Array.from({ length: count }, async (_, index) => {
    const participant = { fullName: `Технический Участник ${alphabet[Math.floor(index / alphabet.length)]}${alphabet[index % alphabet.length]}`,
      institution: "Изолированная проверка сервера", groupName: "ТЕХНИЧЕСКИЙ ТЕСТ", mentorName: "" };
    const token = crypto.randomBytes(32).toString("base64url");
    const [a, b] = await Promise.all([api("/api/public/attempts/start", token, { participant }), api("/api/public/attempts/start", token, { participant })]);
    assert.equal(a.id, b.id); assert.equal(Date.parse(a.expiresAt) - Date.parse(a.startedAt), 1125000);
    return { index, token, attempt: a };
  }));
  assert.equal(new Set(people.map(p => p.attempt.id)).size, count);
  const rows = test.db.prepare("SELECT id, payload_json FROM attempt_variants").all().results;
  const variants = new Map(rows.map(r => [r.id, JSON.parse(r.payload_json)]));
  const credentials = JSON.parse(fs.readFileSync(state.credentials, "utf8"));
  await api("/api/admin/login", "", { password: credentials.adminPassword });
  const runId = people[0].attempt.story.runId || people[0].attempt.story.id;
  await api(`/api/admin/story-runs/${runId}/publish`, "", {}, 409);
  report.checks.push("Parallel starts are idempotent; early publication is refused; each attempt gets 18m45s.");
  for (let round = 0; round < 36; round++) {
    await Promise.all(people.map(async p => {
      const q = variants.get(p.attempt.id).questions[round], prefix = `/api/public/attempts/${p.attempt.id}`;
      assert.equal(p.attempt.currentQuestion.id, q.id);
      assert.equal(p.attempt.timing.questionLimitSeconds, round < 33 ? 30 : 45);
      assert.doesNotMatch(JSON.stringify(p.attempt.currentQuestion), /"(?:isCorrect|correctBuckets|correctIngredientIds|answerPolicy|storyPlates)"/);
      const payload = { questionId: q.id, answerPayload: answer(q, p) };
      const send = () => api(prefix + "/answer", p.token, payload);
      const replies = (round + p.index) % 10 === 0 ? await Promise.all([send(), send()]) : [await send()];
      for (const a of replies) assert.equal(a.progress.answeredCount, round + 1);
      p.attempt = replies.sort((a, b) => b.stateRevision - a.stateRevision)[0];
      assert.equal(p.attempt.summary.totalFinalScore, null);
      if (q.type === "final_kitchen") assert.equal(p.attempt.dishService.mood, "neutral");
      if (round % 6 === 0) {
        const restored = await api(prefix + "/current", p.token);
        assert.equal(restored.progress.answeredCount, round + 1);
        assert.equal(restored.expiresAt, p.attempt.expiresAt);
        p.attempt = restored;
      }
    }));
  }
  report.checks.push("All 36 tasks; duplicate answers; six reloads per participant; frozen clocks; no grading keys or early mood leaks.");
  const records = test.db.prepare("SELECT id, payload_json, (SELECT COUNT(*) FROM attempt_answers b WHERE b.attempt_id=a.id) AS answers FROM attempts a").all().results;
  assert.equal(records.length, count);
  for (const r of records) {
    const p = people.find(p => p.attempt.id === r.id), stored = JSON.parse(r.payload_json);
    assert.equal(r.answers, 36); assert.equal(stored.status, "reviewed"); assert.equal(stored.totalFinalScore, expected(p).score);
  }
  await Promise.all(people.map(async p => {
    const prefix = `/api/public/attempts/${p.attempt.id}`;
    const c = await api(prefix + "/certificate", p.token);
    assert.equal(c.summary.totalFinalScore, expected(p).score); assert.equal(c.summary.totalMaxScore, 150);
    assert.doesNotMatch(JSON.stringify(c), /"(?:answers|expectedAnswer|correctIngredientIds|tourScores)"/);
    const pending = await api(prefix + "/story-result", p.token); assert.equal(pending.state, "waiting");
    assert.equal(pending.plates, undefined);
  }));
  const first = `/api/public/attempts/${people[0].attempt.id}`;
  await api(first + "/certificate", people[1].token, undefined, 401);
  await api(first + "/story-result", people[1].token, undefined, 401);
  const beforeRestart = people.map(p => ({ id: p.attempt.id, expiresAt: p.attempt.expiresAt }));
  await new Promise(resolve => test.server.close(resolve));
  test = await startTrial(state, { port: 0, openBrowser: false }); cookie = "";
  await Promise.all(people.map(async (p, i) => {
    const a = await api(`/api/public/attempts/${p.attempt.id}/current`, p.token);
    assert.equal(a.id, beforeRestart[i].id); assert.equal(a.expiresAt, beforeRestart[i].expiresAt); assert.equal(a.progress.answeredCount, 36);
  }));
  await api("/api/admin/login", "", { password: credentials.adminPassword });
  await api(`/api/admin/story-runs/${runId}`, "", { stopped: true }, 200, "PATCH");
  const published = await api(`/api/admin/story-runs/${runId}/publish`, "", {});
  assert.equal((await api(`/api/admin/story-runs/${runId}/publish`, "", {})).publishedAt, published.publishedAt);
  await Promise.all(people.map(async p => {
    const table = await api(`/api/public/attempts/${p.attempt.id}/story-result`, p.token);
    assert.equal(table.state, "published"); assert.equal(table.plates.length, expected(p).plates); assert.equal(table.summary.totalFinalScore, expected(p).score);
  }));
  assert.equal(test.db.prepare("PRAGMA integrity_check").first().integrity_check, "ok");
  report.checks.push("Exact independent scores; T5 0/4/8/12/16; immediate certificates; owner-only access; restart preservation; repeatable publication; tables of 0/1/intermediate/51 plates; SQLite integrity.");
  report.successfulParticipants = count; report.savedAnswers = count * 36;
}
main().catch(error => { report.errors.push(error.stack || error.message); console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (test?.server.listening) await new Promise(resolve => test.server.close(resolve));
  try { test?.db.close(); } catch {}
  for (const [name, values] of samples) {
    values.sort((a, b) => a - b);const p = f => Math.round(values[Math.ceil(values.length * f) - 1] * 10) / 10;
    report.metrics[name] = { count: values.length, p95Ms: p(.95), p99Ms: p(.99), maxMs: Math.round(values.at(-1)) };
  }
  if (report.metrics.answer?.p95Ms > 3000) { report.errors.push("Answer p95 exceeds 3000ms."); process.exitCode = 1; }
  fs.mkdirSync(directory, { recursive: true });fs.writeFileSync(path.join(directory, "quality-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));console.log(`Report: ${path.join(directory, "quality-report.json")}`);
});
