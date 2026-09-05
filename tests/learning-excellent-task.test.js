"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { FileLearningRepository } = require("../src/learning/repositories/file");
const { pilotWorks } = require("../src/learning/pilot");
const { validateAnswer } = require("../src/learning/validation");
const { excellentScenarios } = require("./helpers/learning-excellent-scenarios");

test("practice 3 has two required tables and a guided optional 20-point explanation", () => {
  const work = pilotWorks(["c1", "c2", "c3", "c4", "c5"], "g")[2];
  const extra = work.blocks.at(-1);
  assert.equal(extra.required, false);
  assert.equal(extra.gradePurpose, "excellent");
  assert.equal(extra.layout, "guided-calculation");
  assert.deepEqual(work.blocks.map((block) => block.maxScore), [0, 50, 30, 20]);
  assert.deepEqual(extra.columns.map((column) => column.id), ["gross", "net", "check", "answer"]);
  assert.equal(extra.given.length, 3);
  assert.match(JSON.stringify(extra.workedExample), /1030 г/);
  assert.doesNotMatch(JSON.stringify(extra.workedExample), /2060|1520/);
  for (const value of [undefined, { cells: {} }, { cells: { "beef:gross": "103 × 20" } }]) {
    assert.equal(validateAnswer(extra, value).valid, true);
    assert.equal(validateAnswer({ ...extra, required: true, requireAllCells: true }, value).valid, false);
  }
  assert.equal(validateAnswer(work.blocks[1], { cells: {} }).valid, false);
});

test("file: optional bonus grading and selective upgrade preserve completed work", async (t) => {
  const storageDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "learning-excellent-"));
  t.after(() => fs.promises.rm(storageDir, { recursive: true, force: true }));
  const repository = await new FileLearningRepository({ storageDir }).init();
  const { service, teacher, pilot, submissionIds } = await excellentScenarios(repository);
  const before = await service.getTeacherSubmission(teacher, submissionIds[2]);
  await repository.mutate((state) => {
    const marker = state.workBlocks.find((block) => block.version_id === pilot.works[2].versionId);
    const config = JSON.parse(marker.config_json);
    config.pilotContentRevision = 7;
    marker.config_json = JSON.stringify(config);
  });
  const upgrade = await service.seedPilot(teacher);
  assert.deepEqual(upgrade.works.map((work) => work.upgraded), [false, false, true, false, false, false, false]);
  assert.notEqual(upgrade.works[2].assignmentId, pilot.works[2].assignmentId);
  for (const i of [0, 1, 3, 4, 5, 6]) {
    assert.equal(upgrade.works[i].versionId, pilot.works[i].versionId);
    assert.equal(upgrade.works[i].assignmentId, pilot.works[i].assignmentId);
  }
  const after = await service.getTeacherSubmission(teacher, submissionIds[2]);
  assert.equal(after.grade, "5");
  assert.deepEqual(after.revisions, before.revisions);
  assert.equal((await service.listTeacherAssignments(teacher)).find((work) => work.id === pilot.works[2].assignmentId).status, "archived");
  assert.ok((await service.seedPilot(teacher)).works.every((work) => !work.upgraded));
});
