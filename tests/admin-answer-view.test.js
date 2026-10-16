"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { formatParticipantAnswer: format } = require("../src/admin-answer-view");
const { reviewParticipantAnswer: review } = require("../src/admin-answer-view");

test("answer review marks mixed matches separately and retains the saved score and payload", () => {
  const q = { type: "bucket_sort", maxScore: 4, items: [{ id: "a", text: "Рататуй" }, { id: "b", text: "Тирамису" }, { id: "c", text: "Фо" }],
    buckets: [{ id: "fr", label: "Франция" }, { id: "it", label: "Италия" }, { id: "vn", label: "Вьетнам" }], correctBuckets: { a: "fr", b: "it", c: "vn" } };
  const answer = { finalScore: 1, answerPayload: { buckets: { a: "fr", b: "vn" } } }, before = JSON.stringify({ q, answer });
  const result = review(q, answer);
  assert.equal(result.status, "partial");
  assert.deepEqual(result.lines.map(l => l.status), ["correct", "incorrect", "unanswered"]);
  assert.equal(result.lines[1].text, "Тирамису: Вьетнам");
  assert.equal(JSON.stringify({ q, answer }), before);
  assert.equal(review(q, null).status, "unanswered");
});

test("kitchen review marks chosen products and identifies omitted correct products", () => {
  const q = { type: "final_kitchen", maxScore: 16, dishes: [{ id: "dish", title: "Салат", items: [{ id: "a", text: "Помидор" }, { id: "b", text: "Огурец" }, { id: "c", text: "Рис" }], correctIngredientIds: ["a", "b"] }] };
  const result = review(q, { finalScore: 4, answerPayload: { dishId: "dish", selectedIngredientIds: ["a", "c"] } });
  assert.deepEqual(result.lines.map(l => [l.text, l.status]), [["Блюдо: Салат", "neutral"], ["Помидор", "correct"], ["Рис", "incorrect"], ["Не выбран продукт: Огурец", "incorrect"]]);
  assert.equal(review({ type: "dish_detective", maxScore: 2 }, { finalScore: 2, answerPayload: { text: "Допустимая опечатка" } }).lines[0].status, "correct");
  assert.equal(review({ type: "single_choice", maxScore: 2, options: [{ id: "bad", text: "Неверный выбор", isCorrect: false }] }, { finalScore: 0, answerPayload: { selectedOptionId: "bad" } }).lines[0].status, "incorrect");
});

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
