"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { PILOT_CONTENT_REVISION, pilotWorks } = require("../src/learning/pilot");
const { validateDefinition } = require("../src/learning/validation");
const { autoGrade } = require("../src/learning/grading");
const { sanitizeForStudent } = require("../src/learning/serializers");

test("MDK 01.01 pilot contains numbered, publishable works", () => {
  const works = pilotWorks(["course-mdk", "course-2", "course-3", "course-4", "course-5"], "group-1");
  assert.equal(works.length, 5);
  works.forEach((work) => {
    assert.equal(work.courseId, "course-mdk");
    const validation = validateDefinition(work);
    assert.equal(validation.valid, true, `${work.title}: ${JSON.stringify(validation.errors)}`);
    assert.equal(JSON.stringify(sanitizeForStudent(work)).includes("privateKey"), false);
    assert.equal(work.blocks[0].pilotContentRevision, PILOT_CONTENT_REVISION);
  });
  works.filter((work) => work.kind === "practice").forEach((work, index) => assert.match(work.title, new RegExp(`Практическая работа № ${index + 1}`)));
  assert.match(works.find((work) => work.kind === "test").title, /Промежуточный тест № 1/);
  works.flatMap((work) => work.blocks.filter((block) => block.type === "ordering")).forEach((block) => {
    assert.notDeepEqual(block.items.map((item) => item.id), block.privateKey.order, `${block.id} must not reveal the correct order`);
  });
});

test("first practice is a calculation worksheet with given data and calculator formulas", () => {
  const work = pilotWorks(["course-mdk"], "group-1")[0];
  const lines = work.blocks.find((block) => block.id === "pz1-lines");
  assert.equal(lines.worksheet.title, "Расчёт потребности в сырье");
  assert.equal(lines.calculator, true);
  assert.deepEqual(lines.columns.slice(0, 4).map((column) => column.readOnly), [true, true, true, true]);
  assert.deepEqual(lines.columns.slice(4).map((column) => column.type), ["number", "number"]);
  assert.match(lines.rows[0].calculatorExpressions.gross, /1-20\/100/);
});

test("spice practice supplies images for drag classification and one-to-one matching", () => {
  const work = pilotWorks(["course-mdk"], "group-1")[1];
  const classification = work.blocks.find((block) => block.id === "pz2-classification");
  const matching = work.blocks.find((block) => block.id === "pz2-matching");
  assert.equal(classification.items.length, 8);
  assert.ok(classification.items.every((item) => item.src && item.alt));
  assert.equal(matching.allowTargetReuse, false);
  assert.ok(matching.rightItems.every((item) => item.src && item.alt));
});

test("raw-material request uses corrected kilogram totals and accepts decimal comma", () => {
  const work = pilotWorks(["course-mdk"], "group-1")[0];
  const request = work.blocks.find((block) => block.id === "pz1-request");
  const result = autoGrade(request, { cells: {
    "potato:kg": "9,125",
    "carrot:kg": "0,625",
    "onion:kg": "0,446",
    "cabbage:kg": "1,389",
    "oil:kg": "0,125",
    "salt:kg": "0,135",
    "milk:kg": "0,900",
    "butter:kg": "0,300"
  } });
  assert.equal(result.score, request.maxScore);
  assert.equal(result.correct, true);
});
