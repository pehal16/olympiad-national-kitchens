const test = require("node:test");
const assert = require("node:assert/strict");

const {
  scoreQuestion,
  validateAnswerPayload,
  summarizeAttempt
} = require("../src/scoring");

test("scoreQuestion gives full points for correct single choice", () => {
  const question = {
    type: "single_choice",
    maxScore: 4,
    options: [
      { id: "a", text: "A", isCorrect: false },
      { id: "b", text: "B", isCorrect: true }
    ]
  };

  const result = scoreQuestion(question, { selectedOptionId: "b" });

  assert.equal(result.autoScore, 4);
  assert.equal(result.finalScore, 4);
  assert.equal(result.penalty, 0);
});

test("scoreQuestion subtracts extra ingredients in matrix task", () => {
  const question = {
    type: "ingredient_matrix",
    maxScore: 5,
    correctIngredientIds: ["meat", "onion", "broth"]
  };

  const result = scoreQuestion(question, {
    buckets: {
      meat: "selected",
      onion: "selected",
      cinnamon: "selected"
    }
  });

  assert.equal(result.autoScore, 1.67);
  assert.equal(result.finalScore, 1.67);
  assert.equal(result.penalty, 1);
});

test("scoreQuestion scales visual dish assembly and penalizes extra components", () => {
  const question = {
    type: "dish_assembly",
    maxScore: 6,
    correctIngredientIds: ["base", "sauce", "cheese"]
  };

  const result = scoreQuestion(question, {
    selectedIngredientIds: ["base", "sauce", "extra"]
  });

  assert.equal(result.autoScore, 2);
  assert.equal(result.finalScore, 2);
  assert.equal(result.penalty, 1);
});

test("validateAnswerPayload rejects forged or duplicated visual item ids", () => {
  const question = {
    type: "dish_assembly",
    items: [{ id: "base" }, { id: "sauce" }]
  };

  assert.equal(
    validateAnswerPayload(question, { selectedIngredientIds: ["base", "sauce"] }),
    true
  );
  assert.equal(
    validateAnswerPayload(question, { selectedIngredientIds: ["base", "unknown"] }),
    false
  );
  assert.equal(
    validateAnswerPayload(question, { selectedIngredientIds: ["base", "base"] }),
    false
  );
  assert.equal(
    validateAnswerPayload(question, {
      selectedIngredientIds: ["base"],
      leakedCorrectAnswer: true
    }),
    false
  );
  assert.equal(validateAnswerPayload(question, { selectedIngredientIds: "base" }), false);
  assert.equal(validateAnswerPayload(question, {}), true);
});

test("validateAnswerPayload accepts only canonical payload fields and container types", () => {
  const single = {
    type: "single_choice",
    options: [{ id: "a" }, { id: "b" }]
  };
  const sequence = {
    type: "sequence_drag",
    items: [{ id: "a" }, { id: "b" }]
  };
  const buckets = {
    type: "bucket_sort",
    items: [{ id: "a" }, { id: "b" }],
    buckets: [{ id: "left" }, { id: "right" }]
  };

  assert.equal(validateAnswerPayload(single, { selectedOptionId: "a" }), true);
  assert.equal(validateAnswerPayload(single, { selectedOptionId: "a", score: 10 }), false);
  assert.equal(validateAnswerPayload(sequence, { sequence: ["a", "b"] }), true);
  assert.equal(validateAnswerPayload(sequence, { sequence: "a,b" }), false);
  assert.equal(validateAnswerPayload(buckets, { buckets: { a: "left" } }), true);
  assert.equal(validateAnswerPayload(buckets, { buckets: [] }), false);
  assert.equal(validateAnswerPayload(buckets, { buckets: { a: "left" }, extra: true }), false);
  assert.equal(validateAnswerPayload(sequence, []), false);
});

test("summarizeAttempt aggregates tour scores and penalties", () => {
  const olympiad = {
    scoring: {
      totalMaxScore: 12
    }
  };

  const attempt = {
    startedAt: "2026-03-26T10:00:00.000Z",
    finishedAt: "2026-03-26T10:20:00.000Z",
    answers: {
      q1: { finalScore: 4, penalty: 0 },
      q2: { finalScore: 3, penalty: 1 }
    },
    variant: {
      tours: [
        { id: "tour-1", code: "T1", title: "Tour 1", maxScore: 4 },
        { id: "tour-5", code: "T5", title: "Tour 5", maxScore: 8 }
      ],
      questions: [
        { id: "q1", tourId: "tour-1" },
        { id: "q2", tourId: "tour-5" }
      ]
    }
  };

  const summary = summarizeAttempt(olympiad, attempt);

  assert.equal(summary.totalFinalScore, 7);
  assert.equal(summary.totalPenalty, 1);
  assert.equal(summary.totalMaxScore, 12);
  assert.equal(summary.tourScores.length, 2);
  assert.equal(summary.tieBreak.tour5, 3);
  assert.equal(summary.totalDurationMs, 20 * 60 * 1000);
});
