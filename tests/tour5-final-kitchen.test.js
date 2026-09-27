const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");
const olympiad = require("../data/olympiad");
const bank = require("../data/banks/tour5-final-kitchen");
const { buildVariant, sanitizeQuestion, validateQuestionStructure } = require("../src/variant");
const { scoreQuestion, validateAnswerPayload } = require("../src/scoring");
const { lockStationDish, isLockedDishAnswer } = require("../src/final-kitchen");

function kitchenOlympiad() {
  const result = structuredClone(olympiad);
  result.blueprintVersion = 10;
  result.tours.find((tour) => tour.code === "T5").generation = { mode: "final_kitchen_stations" };
  result.questionBank.tour5Stations = structuredClone(bank);
  return result;
}
function combinations(items, size = 4) {
  if (!size) return [[]];
  return items.flatMap((item, index) => combinations(items.slice(index + 1), size - 1).map((tail) => [item, ...tail]));
}
function permutations(items) {
  return items.length ? items.flatMap((item, index) => permutations(items.filter((_, i) => i !== index)).map((rest) => [item, ...rest])) : [[]];
}
function fixture() {
  const variant = buildVariant(kitchenOlympiad(), { seed: "kitchen-server-lock" });
  const index = variant.questions.findIndex((question) => question.type === "final_kitchen");
  return { id: "synthetic-kitchen-test", status: "in_progress", currentStepIndex: index,
    stateRevision: 0, variant, answers: {}, questionLog: {} };
}

test("T5 exact 3/7/56 structure, neutral media and 150/45/36 route", () => {
  assert.equal(bank.length, 3);
  assert.deepEqual(bank.map((station) => station.dishes.length), [3, 2, 2]);
  bank.forEach((question) => assert.doesNotThrow(() => validateQuestionStructure(question)));
  const dishes = bank.flatMap((question) => question.dishes);
  assert.equal(dishes.length, 7); assert.equal(new Set(dishes.map((dish) => dish.id)).size, 7);
  assert.equal(dishes.reduce((sum, dish) => sum + dish.items.length, 0), 56);
  const variant = buildVariant(kitchenOlympiad(), { seed: "kitchen-contract" });
  assert.equal(variant.questions.length, 36);
  assert.equal(variant.questions.reduce((sum, question) => sum + question.maxScore, 0), 150);
  assert.equal(variant.tours.reduce((sum, tour) => sum + tour.timeLimitMinutes, 0), 45);
  assert.equal(variant.tours[4].maxScore, 48); assert.equal(variant.tours[4].timeLimitMinutes, 15);
  assert.equal(variant.tours[4].questionCount, 3);
  assert.deepEqual(variant.questions.filter((q) => q.type === "final_kitchen").map((q) => q.station.number), [1, 2, 3]);
  assert.deepEqual(variant, { ...buildVariant(kitchenOlympiad(), { seed: "kitchen-contract" }), generatedAt: variant.generatedAt });
});

for (const question of bank) for (const dish of question.dishes) {
  test(`${dish.title}: all 70 selections × 24 orders; exactly 4 points per valid component`, () => {
    const counts = new Set();
    for (const chosen of combinations(dish.items.map((item) => item.id))) {
      const expected = chosen.filter((id) => dish.correctIngredientIds.includes(id)).length * 4;
      counts.add(expected);
      for (const selectedIngredientIds of permutations(chosen)) {
        const payload = { dishId: dish.id, selectedIngredientIds };
        assert.equal(validateAnswerPayload(question, payload), true);
        assert.deepEqual(scoreQuestion(question, payload), { autoScore: expected, finalScore: expected, penalty: 0 });
      }
    }
    assert.deepEqual([...counts].sort((a, b) => a - b), [0, 4, 8, 12, 16]);
    for (const payload of [{}, [], "food", { dishId: dish.id },
      { dishId: dish.id, selectedIngredientIds: dish.items.slice(0, 3).map((item) => item.id) },
      { dishId: dish.id, selectedIngredientIds: dish.items.slice(0, 5).map((item) => item.id) },
      { dishId: dish.id, selectedIngredientIds: [dish.items[0].id, dish.items[0].id, dish.items[2].id, dish.items[3].id] },
      { dishId: "foreign", selectedIngredientIds: dish.correctIngredientIds },
      { dishId: dish.id, selectedIngredientIds: ["foreign", ...dish.correctIngredientIds.slice(1)] },
      { dishId: dish.id, selectedIngredientIds: [1, 2, 3, 4] },
      { dishId: dish.id, selectedIngredientIds: dish.correctIngredientIds, finalScore: 16 }]) {
      assert.equal(validateAnswerPayload(question, payload), false);
      assert.equal(scoreQuestion(question, payload).finalScore, 0);
    }
  });
}

test("current-station whitelist: previews before lock, only 8 chosen ingredients after, no keys or future stations", () => {
  const attempt = fixture(); const question = attempt.variant.questions[attempt.currentStepIndex];
  let publicQuestion = sanitizeQuestion(question, attempt);
  assert.equal(publicQuestion.dishes.length, 3); assert.equal(publicQuestion.selectedDish, null);
  assert.doesNotMatch(JSON.stringify(publicQuestion), /ingredientKey|correctIngredientIds|scene|items|sourceId|dishId|T5-station/);
  const dish = question.dishes[0]; attempt.stationSelections = { [question.id]: { dishId: dish.id } };
  publicQuestion = sanitizeQuestion(question, attempt);
  assert.equal(publicQuestion.dishes.length, 0); assert.equal(publicQuestion.selectedDish.items.length, 8);
  assert.doesNotMatch(JSON.stringify(publicQuestion), /correctIngredientIds|ingredientKey|isCorrect|sourceId|dishId|T5-station/);
  assert.equal(validateAnswerPayload(question, { dishId: dish.id,
    selectedIngredientIds: question.dishes[1].items.slice(0, 4).map((item) => item.id) }), false);
});

test("invalid structures cannot silently omit a dish, component, image or fallback layer", () => {
  for (const mutate of [q => q.dishes.pop(), q => q.dishes[0].items.pop(),
    q => { q.dishes[0].items[0].layerImageUrl = ""; }, q => { q.dishes[0].items[0].imageUrl = "https://bad.example/a.webp"; },
    q => { q.dishes[0].items[0].scene.width = -1; }, q => { q.dishes[0].previewUrl = "/assets/olympiad/tour5/correct.webp"; },
    q => { q.dishes[0].correctIngredientIds[1] = q.dishes[0].correctIngredientIds[0]; },
    q => { q.dishes[0].items[1].id = q.dishes[0].items[0].id; }]) {
    const question = structuredClone(bank[0]); mutate(question); assert.throws(() => validateQuestionStructure(question));
  }
});

test("station locking uses CAS, idempotent replay, immutable choice across reload/tabs and unchanged issued variant", async () => {
  let stored = fixture(); const question = stored.variant.questions[stored.currentStepIndex];
  const variantBefore = JSON.stringify(stored.variant);
  const persistence = { normalize: async value => value, load: async () => structuredClone(stored),
    save: async (value, revision, options) => {
      assert.equal(options.stateOnly, true);
      if (revision !== stored.stateRevision) return false;
      stored = structuredClone(value); return true;
    } };
  const original = structuredClone(stored);
  const [first, second] = await Promise.all(question.dishes.slice(0, 2).map(dish =>
    lockStationDish(structuredClone(original), { questionId: question.id, dishId: dish.id }, persistence)));
  assert.deepEqual([first.status, second.status].sort(), [200, 409]);
  assert.equal(stored.stateRevision, 1); assert.equal(JSON.stringify(stored.variant), variantBefore);
  const dishId = stored.stationSelections[question.id].dishId;
  const replay = await lockStationDish(structuredClone(stored), { questionId: question.id, dishId }, persistence);
  assert.equal(replay.status, 200); assert.equal(stored.stateRevision, 1);
  assert.equal(isLockedDishAnswer(stored, question, { dishId }), true);
  assert.equal(isLockedDishAnswer(stored, question, { dishId: "forged" }), false);
  for (const body of [{}, [], { questionId: question.id, dishId, score: 16 },
    { questionId: "future", dishId }, { questionId: question.id, dishId: "foreign" }]) {
    assert.equal((await lockStationDish(structuredClone(stored), body, persistence)).status, 422);
  }
});

test("expired or future station cannot be chosen; an unlocked answer never passes", async () => {
  const attempt = fixture(); const current = attempt.variant.questions[attempt.currentStepIndex];
  assert.equal(isLockedDishAnswer(attempt, current, { dishId: current.dishes[0].id }), false);
  const persistence = { normalize: async value => ({ ...value, status: "finished" }), save: async () => assert.fail("expired write") };
  assert.equal((await lockStationDish(attempt, { questionId: current.id, dishId: current.dishes[0].id }, persistence)).status, 409);
});

test("legacy T5 source remains identical and old 12-question cases remain gradable", () => {
  const bytes = fs.readFileSync(require.resolve("../data/banks/tour5"), "utf8").replace(/\r\n/g, "\n");
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), "9e506a8267e5ff15b1518c7e5b26ceefe545504dd9b2f26cc4d9bffafd54cdb6");
  const old = structuredClone(olympiad); old.blueprintVersion = 9;
  old.tours.find(t => t.code === "T5").generation = { mode: "case_clusters", selectCount: 3, differentCuisineGroups: true };
  const legacy = buildVariant(old, { seed: "kitchen-legacy" });
  const questions = legacy.questions.filter(q => q.tourCode === "T5");
  assert.equal(questions.length, 12); assert.equal(legacy.questions.length, 45);
  assert.equal(questions.reduce((sum, q) => sum + scoreQuestion(q, { selectedOptionId: q.options.find(o => o.isCorrect).id }).finalScore, 0), 48);
  const before = JSON.stringify(legacy); buildVariant(kitchenOlympiad(), { seed: "fresh" });
  assert.equal(JSON.stringify(legacy), before);
});
