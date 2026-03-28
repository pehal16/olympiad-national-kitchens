const test = require("node:test");
const assert = require("node:assert/strict");

const olympiad = require("../data/olympiad");
const { buildQuestionCatalog, buildQuestionBankSummary } = require("../src/question-bank");

test("buildQuestionCatalog creates normalized records for all tours", () => {
  const catalog = buildQuestionCatalog(olympiad);

  assert.ok(catalog.length > 0, "catalog should not be empty");
  assert.deepEqual(
    [...new Set(catalog.map((question) => question.tourCode))].sort(),
    ["T1", "T2", "T3", "T4", "T5"]
  );

  catalog.forEach((question) => {
    assert.ok(question.id, "question should have id");
    assert.ok(question.prompt, "question should have prompt");
    assert.ok(question.type, "question should have type");
    assert.ok(question.tourCode, "question should have tourCode");
    assert.ok(question.cuisineLabel, "question should have cuisineLabel");
    assert.ok(question.metadata, "question should have metadata");
    assert.ok(question.metadata.theme, "question should have theme");
    assert.ok(question.metadata.studentAction, "question should have studentAction");
    assert.ok(question.metadata.methodicalPurpose, "question should have methodicalPurpose");
    assert.ok(Array.isArray(question.metadata.okCodes), "question should expose okCodes");
    assert.ok(Array.isArray(question.metadata.pkFocus), "question should expose pkFocus");
  });
});

test("buildQuestionBankSummary matches catalog size and exposes QA/catalog blocks", () => {
  const catalog = buildQuestionCatalog(olympiad);
  const summary = buildQuestionBankSummary(olympiad);

  assert.equal(summary.totalQuestions, catalog.length);
  assert.ok(summary.interactiveQuestions >= 0);
  assert.ok(summary.caseQuestions >= 0);
  assert.ok(summary.catalogs);
  assert.ok(Array.isArray(summary.catalogs.tours));
  assert.ok(Array.isArray(summary.catalogs.cuisines));
  assert.ok(Array.isArray(summary.catalogs.types));
  assert.ok(Array.isArray(summary.catalogs.difficulties));
  assert.ok(Array.isArray(summary.catalogs.themes));
  assert.ok(Array.isArray(summary.catalogs.okCodes));
  assert.ok(Array.isArray(summary.catalogs.pkFocus));
  assert.ok(summary.qa);
  assert.ok(typeof summary.qa.readyPercent === "number");
  assert.ok(summary.qa.balance);
});
