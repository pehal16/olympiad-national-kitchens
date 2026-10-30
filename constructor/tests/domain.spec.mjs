import test from "node:test";
import assert from "node:assert/strict";
import { question, project, starterTemplates } from "../shared/catalog.js";
import {
  gradeQuestion,
  validateProject,
  generateVariant,
  summarize,
  rankAttempts,
} from "../server/domain.mjs";
import { examples } from "../server/seeds.mjs";
import { correct } from "./helpers.mjs";

for (const type of [
  "single_choice",
  "multiple_choice",
  "short_text",
  "calculation",
  "matching",
  "ordering",
  "classification",
  "table",
  "crossword",
  "dish_assembly",
  "safety_checklist",
])
  test(`grading ${type}: full, missing and maximum`, () => {
    const q = question(type);
    assert.equal(gradeQuestion(q, correct(q)).score, q.maxScore);
    assert.equal(gradeQuestion(q, null).score, 0);
    assert.ok(gradeQuestion(q, "arbitrary").score <= q.maxScore);
  });
test("manual review stays unknown until reviewed", () => {
  const q = question("long_text");
  assert.equal(gradeQuestion(q, "Разобранный ответ").score, null);
  assert.equal(gradeQuestion(q, "Разобранный ответ").manual, true);
});
test("multiple choice penalizes excess choices and supports partial credit", () => {
  const q = question("multiple_choice");
  q.partialCredit = true;
  assert.equal(gradeQuestion(q, ["o1"]).score, 1);
  assert.equal(gradeQuestion(q, ["o1", "o3"]).score, 0);
});
test("numbers reject empty input and wrong units", () => {
  const q = question("calculation");
  q.key = { value: 0, unit: "кг", tolerance: 0 };
  assert.equal(gradeQuestion(q, { value: "", unit: "кг" }).score, 0);
  assert.equal(gradeQuestion(q, { value: 0, unit: "г" }).score, 0);
  assert.equal(gradeQuestion(q, { value: 0, unit: "кг" }).score, 2);
});
test("restaurant copy preserves 36 tasks and 150 points", () => {
  const p = examples().find((x) => x.key === "kitchen").project;
  assert.equal(p.rounds.flatMap((r) => r.questions).length, 36);
  assert.equal(
    p.rounds
      .flatMap((r) => r.questions)
      .reduce((s, q) => s + gradeQuestion(q, correct(q)).score, 0),
    150,
  );
  assert.deepEqual(validateProject(p), []);
});
test("all authored examples are publishable", () => {
  for (const e of examples()) assert.deepEqual(validateProject(e.project), []);
});
test("pool generation is deterministic, does not mutate release and preserves max score", () => {
  const p = project("Тест");
  p.rounds[0].questions = [question(), question(), question()];
  p.rounds[0].selectCount = 2;
  const before = JSON.stringify(p);
  assert.equal(
    JSON.stringify(generateVariant(p, "seed")),
    JSON.stringify(generateVariant(p, "seed")),
  );
  assert.equal(JSON.stringify(p), before);
  assert.equal(generateVariant(p, "other").rounds[0].questions.length, 2);
  p.rounds[0].questions[1].maxScore = 5;
  assert.ok(validateProject(p).some((x) => x.includes("одинаковый")));
});
test("templates provide twelve editable documents with Cyrillic fields", () => {
  const templates = starterTemplates();
  assert.equal(templates.length, 12);
  assert.equal(new Set(templates.map((t) => t.id)).size, 12);
  assert.ok(
    templates.every((t) => t.elements.some((e) => e.text === "{fullName}")),
  );
});
