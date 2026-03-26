const test = require("node:test");
const assert = require("node:assert/strict");

const { scoreQuestion, summarizeAttempt } = require("../src/scoring");

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

  assert.equal(result.autoScore, 1);
  assert.equal(result.finalScore, 1);
  assert.equal(result.penalty, 1);
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
