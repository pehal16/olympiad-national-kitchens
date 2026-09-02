"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { pilotWorks } = require("../src/learning/pilot");
const { validateDefinition } = require("../src/learning/validation");
const { autoGrade } = require("../src/learning/grading");
const { sanitizeForStudent } = require("../src/learning/serializers");

test("MDK 01.01 pilot contains five sequenced, publishable works", () => {
  const works = pilotWorks(["course-mdk", "course-2", "course-3", "course-4", "course-5"], "group-1");
  assert.equal(works.length, 5);
  works.forEach((work, index) => {
    assert.equal(work.courseId, "course-mdk");
    assert.match(work.title, new RegExp(`№ ${index + 1}`));
    const validation = validateDefinition(work);
    assert.equal(validation.valid, true, `${work.title}: ${JSON.stringify(validation.errors)}`);
    assert.equal(JSON.stringify(sanitizeForStudent(work)).includes("privateKey"), false);
  });
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
