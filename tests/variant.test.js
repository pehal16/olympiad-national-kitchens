const test = require("node:test");
const assert = require("node:assert/strict");

const olympiad = require("../data/olympiad");
const { buildVariant, sanitizeQuestion } = require("../src/variant");

test("buildVariant creates a complete 5-tour individual route", () => {
  const variant = buildVariant(olympiad);

  assert.equal(variant.tours.length, olympiad.tours.length);
  assert.equal(
    variant.questions.length,
    variant.tours.reduce((sum, tour) => sum + tour.questionCount, 0)
  );

  const runtimeIds = variant.questions.map((question) => question.id);
  assert.equal(new Set(runtimeIds).size, runtimeIds.length);

  variant.questions.forEach((question, index) => {
    assert.ok(question.sourceId, "question must keep sourceId");
    assert.ok(question.tourId, "question must have tourId");
    assert.equal(question.globalIndex, index + 1);
    assert.ok(question.sequenceInTour >= 1, "question must know position inside tour");
  });
});

test("sanitizeQuestion removes checking keys but preserves participant-safe structure", () => {
  const variant = buildVariant(olympiad);
  const attempt = {
    answers: {
      [variant.questions[0].id]: {
        answerPayload: {
          selectedOptionId: "demo-option"
        }
      }
    }
  };

  const sanitized = sanitizeQuestion(variant.questions[0], attempt);

  assert.ok(sanitized);
  assert.equal(sanitized.id, variant.questions[0].id);
  assert.equal(sanitized.sourceId, variant.questions[0].sourceId);
  assert.equal(sanitized.savedAnswer.selectedOptionId, "demo-option");
  assert.equal("correctSequence" in sanitized, false);
  assert.equal("correctBuckets" in sanitized, false);
  assert.equal("correctIngredientIds" in sanitized, false);
});
