"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { formatParticipantAnswer: format } = require("../src/admin-answer-view");

test("organizer reads the saved student's choices, including wrong, empty and partial answers", () => {
  const question = { type: "bucket_sort", items: [{ id: "opaque-a", text: "Рататуй" }, { id: "opaque-b", text: "Тирамису" }],
    buckets: [{ id: "opaque-fr", label: "Франция" }, { id: "opaque-it", label: "Италия" }],
    correctBuckets: { "opaque-a": "opaque-fr", "opaque-b": "opaque-it" } };
  const answer = { answerPayload: { buckets: { "opaque-a": "opaque-it" } }, finalScore: 0 };
  const before = JSON.stringify({ question, answer });
  assert.equal(format(question, answer), "Рататуй: Италия\nТирамису: Не выбрано");
  assert.equal(format({ ...question, type: "ingredient_matrix" }, answer), "Рататуй: Италия\nТирамису: Не выбрано");
  assert.equal(JSON.stringify({ question, answer }), before, "Formatting must not fix or rescore an answer");
  assert.equal(format(question, null), "Нет ответа");
  const choice = { type: "single_choice", options: [{ id: "right", text: "Рататуй", isCorrect: true }, { id: "wrong", text: "Лазанья" }] };
  assert.equal(format(choice, { answerPayload: { selectedOptionId: "wrong" } }), "Лазанья");
  assert.equal(format(choice, { answerPayload: {} }), "Не выбрано");
  assert.equal(format(choice, { answerPayload: { selectedOptionId: "missing-id" } }), "Вариант не найден в сохранённом задании");
  assert.equal(format({ type: "dish_detective" }, { answerPayload: { text: "Мой неверный ответ" } }), "Мой неверный ответ");
  assert.equal(format({ type: "dish_detective" }, { answerPayload: { text: "" } }), "Ответ не введён");
  assert.equal(format({ ...question, type: "sequence_drag" }, { answerPayload: { sequence: ["opaque-b", "opaque-a"] } }), "1. Тирамису\n2. Рататуй");
});

test("organizer resolves kitchen products from the saved dish and retains partial selections", () => {
  const items = [{ id: "shared-id", text: "Помидор" }, { id: "extra-id", text: "Рис" }];
  const question = { type: "final_kitchen", dishes: [{ id: "dish-id", title: "Греческий салат", items, correctIngredientIds: ["shared-id"] }] };
  const answer = { answerPayload: { dishId: "dish-id", selectedIngredientIds: ["extra-id", "shared-id"] } };
  assert.equal(format(question, answer), "Блюдо: Греческий салат\nПродукты: Рис, Помидор");
  assert.equal(format({ type: "dish_assembly", items }, answer), "Рис, Помидор");
  assert.equal(format(question, { answerPayload: { dishId: "dish-id", selectedIngredientIds: [] } }), "Блюдо: Греческий салат\nПродукты: Не выбраны");
  // Identical opaque IDs in another issued variant must resolve to its own labels.
  const other = { ...question, dishes: [{ ...question.dishes[0], title: "Другое блюдо", items: [{ id: "shared-id", text: "Лук" }] }] };
  assert.equal(format(other, { answerPayload: { dishId: "dish-id", selectedIngredientIds: ["shared-id"] } }), "Блюдо: Другое блюдо\nПродукты: Лук");
});
