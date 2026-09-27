const test = require("node:test");
const assert = require("node:assert/strict");
const { createState } = require("../public/t5-final-kitchen");
const { buildVariant, sanitizeQuestion, validateQuestionStructure } = require("../src/variant");
const olympiad = require("../data/olympiad");

function fixture() {
  const question = buildVariant(olympiad, { seed: "t5-client-contract" }).questions.find(q => q.type === "final_kitchen");
  const attempt = { answers: {}, stationSelections: { [question.id]: { dishId: question.dishes[0].id } } };
  return sanitizeQuestion(question, attempt);
}

test("T5 client model toggles, clears, limits four and treats all eight alike", () => {
  const question = fixture(), dish = question.selectedDish, state = createState(question);
  assert.equal(state.isComplete(), false);
  for (const item of dish.items) {
    state.clear(); assert.equal(state.add(item.id), true);
    assert.equal(state.toggle(item.id), true); assert.deepEqual(state.getAnswer().selectedIngredientIds, []);
  }
  dish.items.slice(0, 4).forEach(item => assert.equal(state.add(item.id), true));
  assert.equal(state.isComplete(), true);
  assert.equal(state.add(dish.items[4].id), false);
  assert.equal(state.add(dish.items[0].id), false);
  state.remove(dish.items[0].id); assert.equal(state.isComplete(), false);
  assert.equal(state.add(dish.items[4].id), true); assert.equal(state.isComplete(), true);
  const answer = state.getAnswer(); answer.selectedIngredientIds.pop(); assert.equal(state.isComplete(), true);
  state.clear(); assert.deepEqual(state.getAnswer(), { dishId: dish.id, selectedIngredientIds: [] });
});

test("T5 drafts are scoped to the chosen dish and known opaque IDs", () => {
  const question = fixture(), ids = question.selectedDish.items.map(item => item.id);
  assert.deepEqual(createState(question, { dishId: "foreign", selectedIngredientIds: ids }).getAnswer().selectedIngredientIds, []);
  assert.deepEqual(createState(question, { dishId: question.selectedDish.id, selectedIngredientIds: [ids[0], ids[0], "foreign", ...ids.slice(1)] }).getAnswer().selectedIngredientIds, ids.slice(0, 4));
  const unchosen = { ...question, selectedDish: null };
  assert.deepEqual(createState(unchosen).getAnswer(), {}); assert.equal(createState(unchosen).isComplete(), false);
});

test("T5 two-half bun descriptor is participant-safe and cannot carry hidden keys", () => {
  const bank = structuredClone(require("../data/banks/tour5-final-kitchen"));
  const bun = bank[0].dishes.find(dish => dish.dishId === "burger").items.find(item => item.ingredientKey === "burger-bun");
  assert.equal(bun.scene.parts.length, 2);
  bun.scene.parts[0].crop = [-1, .5];
  assert.throws(() => validateQuestionStructure(bank[0]));
  const question = buildVariant(olympiad, { seed: "parts-private" }).questions.find(q => q.type === "final_kitchen");
  const burger = question.dishes.find(d => d.dishId === "burger");
  const safe = sanitizeQuestion(question, { answers: {}, stationSelections: { [question.id]: { dishId: burger.id } } });
  const parts = safe.selectedDish.items.find(item => item.scene.parts)?.scene.parts;
  assert.equal(parts.length, 2); assert.deepEqual(Object.keys(parts[0]).sort(), ["angle", "aspect", "crop", "level", "width", "x", "z"]);
  assert.doesNotMatch(JSON.stringify(safe), /correctIngredientIds|ingredientKey|isCorrect|sourceId/);
});
