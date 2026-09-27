const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { createOlympiadServer } = require("../olympiad-server");
const { createAttemptAtomic, loadAttemptById, updateAttemptWithRevision } = require("../src/store");
const { buildVariant } = require("../src/variant");
const olympiad = require("../data/olympiad");

test("T5 protected HTTP/D1 lifecycle: atomic selection, reload, exact four, receipt and deadline", async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "olympiad-t5-http-"));
  const { server, db } = createOlympiadServer({ dbPath: path.join(directory, "test.sqlite"),
    adminPassword: "synthetic-admin-not-production-2026", attemptIdSecret: "synthetic-identity-secret-not-production-2026" });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const blueprint = structuredClone(olympiad);
  blueprint.blueprintVersion = 10;
  blueprint.tours[4].generation = { mode: "final_kitchen_stations" };
  blueprint.questionBank.tour5Stations = require("../data/banks/tour5-final-kitchen");
  const variant = buildVariant(blueprint, { seed: "http-final-kitchen" });
  const token = "synthetic_attempt_token_2026_0000000001";
  const id = "synthetic-t5-http-attempt";
  const startedAt = new Date().toISOString();
  const attempt = { id, olympiadId: olympiad.id, participant: { fullName: "Тестовый Участник Проверки" },
    status: "in_progress", startedAt, expiresAt: new Date(Date.now() + 45 * 60_000).toISOString(),
    accessTokenHash: crypto.createHash("sha256").update(token).digest("base64url"),
    stateRevision: 0, currentStepIndex: variant.tours[4].stepStart, variant,
    tourStates: { "tour-5": { startedAt, finishedAt: null } }, answers: {}, questionLog: {} };
  await createAttemptAtomic(attempt);
  async function request(suffix, body, suppliedToken = token) {
    const response = await fetch(`${base}/api/public/attempts/${id}/${suffix}`, {
      method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", "X-Attempt-Token": suppliedToken },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  }
  const first = variant.questions[attempt.currentStepIndex];
  const selection = { questionId: first.id, dishId: first.dishes[0].id };
  assert.equal((await request("dish-selection", selection, "")).status, 401);
  assert.equal((await request("dish-selection", { ...selection, dishId: "foreign" })).status, 422);
  const races = await Promise.all(first.dishes.slice(0, 2).map(dish => request("dish-selection", { ...selection, dishId: dish.id })));
  assert.deepEqual(races.map(result => result.status).sort(), [200, 409]);
  const loaded = await loadAttemptById(id); const dishId = loaded.stationSelections[first.id].dishId;
  const dish = first.dishes.find(entry => entry.id === dishId);
  assert.equal(JSON.stringify(loaded.variant), JSON.stringify(variant));
  const row = db.prepare("SELECT payload_json FROM attempts WHERE id = ?").bind(id);
  assert.equal(JSON.parse((await row.first()).payload_json).stationSelections[first.id].dishId, dishId);
  const current = await request("current");
  assert.equal(current.body.data.currentQuestion.selectedDish.id, dishId);
  assert.equal(current.body.data.currentQuestion.selectedDish.items.length, 8);
  assert.doesNotMatch(JSON.stringify(current.body.data), /correctIngredientIds|ingredientKey|sourceId|isCorrect/);
  assert.equal((await request("dish-selection", { ...selection, dishId })).status, 200);
  const beforeAnswer = (await loadAttemptById(id)).stateRevision;
  assert.equal((await request("answer", { questionId: first.id,
    answerPayload: { dishId, selectedIngredientIds: dish.correctIngredientIds.slice(0, 3) } })).status, 422);
  assert.equal((await loadAttemptById(id)).stateRevision, beforeAnswer);
  const answered = await request("answer", { questionId: first.id,
    answerPayload: { dishId, selectedIngredientIds: [...dish.correctIngredientIds].reverse() } });
  assert.equal(answered.status, 200); assert.equal(answered.body.data.answerReceipt.saved, true);
  assert.equal((await loadAttemptById(id)).answers[first.id].finalScore, 16);
  assert.equal((await request(`current?receiptQuestionId=${encodeURIComponent(first.id)}`)).body.data.answerReceipt.saved, true);
  assert.equal((await request("current?receiptQuestionId=foreign")).status, 422);
  assert.equal(answered.body.data.currentQuestion.station.number, 2);
  const second = variant.questions[attempt.currentStepIndex + 1]; const secondDish = second.dishes[0];
  assert.equal((await request("answer", { questionId: second.id,
    answerPayload: { dishId: secondDish.id, selectedIngredientIds: secondDish.correctIngredientIds } })).status, 409);
  assert.equal((await request("dish-selection", { questionId: second.id, dishId: secondDish.id })).status, 200);
  let expired = await loadAttemptById(id);
  expired.tourStates["tour-5"].startedAt = new Date(Date.now() - 16 * 60_000).toISOString();
  await updateAttemptWithRevision(expired, expired.stateRevision, { stateOnly: true });
  const late = await request("answer", { questionId: second.id,
    answerPayload: { dishId: secondDish.id, selectedIngredientIds: secondDish.correctIngredientIds } });
  assert.equal(late.status, 409);
  assert.equal((await loadAttemptById(id)).answers[second.id], undefined);
  assert.equal((await request(`current?receiptQuestionId=${encodeURIComponent(second.id)}`)).body.data.answerReceipt.saved, false);

  // An already issued blueprint-9 attempt must remain 45 questions / 12 old T5 cases.
  const oldBlueprint = structuredClone(olympiad);
  oldBlueprint.blueprintVersion = 9;
  oldBlueprint.tours[4].generation = { mode: "case_clusters", selectCount: 3, differentCuisineGroups: true };
  const oldVariant = buildVariant(oldBlueprint, { seed: "stored-legacy-http" });
  const oldId = "synthetic-t5-legacy-http-attempt";
  const oldAttempt = { ...attempt, id: oldId, stateRevision: 0, variant: oldVariant,
    currentStepIndex: oldVariant.tours[4].stepStart, answers: {}, questionLog: {},
    tourStates: { "tour-5": { startedAt: new Date().toISOString(), finishedAt: null } } };
  await createAttemptAtomic(oldAttempt);
  const oldQuestion = oldVariant.questions[oldAttempt.currentStepIndex];
  const oldGet = await fetch(`${base}/api/public/attempts/${oldId}/current`, { headers: { "X-Attempt-Token": token } });
  const oldView = (await oldGet.json()).data;
  assert.equal(oldView.progress.totalQuestions, 45);
  assert.equal(oldView.currentQuestion.type, oldQuestion.type);
  assert.equal(oldView.currentQuestion.selectedDish, undefined);
  const oldPost = await fetch(`${base}/api/public/attempts/${oldId}/answer`, { method: "POST",
    headers: { "Content-Type": "application/json", "X-Attempt-Token": token },
    body: JSON.stringify({ questionId: oldQuestion.id,
      answerPayload: { selectedOptionId: oldQuestion.options.find(option => option.isCorrect).id } }) });
  assert.equal(oldPost.status, 200);
  const oldLoaded = await loadAttemptById(oldId);
  assert.equal(oldLoaded.answers[oldQuestion.id].finalScore, 4);
  assert.equal(JSON.stringify(oldLoaded.variant), JSON.stringify(oldVariant));
  assert.equal(oldLoaded.variant.questions.filter(question => question.tourCode === "T5").length, 12);
});
