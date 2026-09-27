const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "olympiad-t5-file-"));
process.env.STORAGE_DIR = directory;
process.env.STORAGE_BACKEND = "file";
const { createAttemptAtomic, loadAttemptById, updateAttemptWithRevision } = require("../src/store");
const { lockStationDish } = require("../src/final-kitchen");
const { buildVariant } = require("../src/variant");

test("file storage round-trip retains immutable choice, issued variant and pre-existing answer/log rows", async t => {
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const blueprint = structuredClone(require("../data/olympiad"));
  blueprint.tours[4].generation = { mode: "final_kitchen_stations" };
  blueprint.questionBank.tour5Stations = require("../data/banks/tour5-final-kitchen");
  const variant = buildVariant(blueprint, { seed: "file-kitchen" });
  const currentStepIndex = variant.tours[4].stepStart;
  const question = variant.questions[currentStepIndex];
  const priorQuestionId = variant.questions[currentStepIndex - 1].id;
  const attempt = { id: "file-kitchen-only", olympiadId: blueprint.id, status: "in_progress", currentStepIndex,
    stateRevision: 0, variant, answers: { [priorQuestionId]: { finalScore: 4 } },
    questionLog: { [priorQuestionId]: { answeredAt: "2026-09-27T12:00:00Z" } } };
  await createAttemptAtomic(attempt);
  const before = await loadAttemptById(attempt.id);
  const dependencies = { normalize: async value => value, save: updateAttemptWithRevision, load: loadAttemptById };
  const results = await Promise.all(question.dishes.slice(0, 2).map(dish =>
    lockStationDish(structuredClone(before), { questionId: question.id, dishId: dish.id }, dependencies)));
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  const reloaded = await loadAttemptById(attempt.id);
  assert.equal(reloaded.stateRevision, 1);
  assert.deepEqual(reloaded.answers, before.answers); assert.deepEqual(reloaded.questionLog, before.questionLog);
  assert.deepEqual(reloaded.variant, before.variant);
  const body = { questionId: question.id, dishId: reloaded.stationSelections[question.id].dishId };
  assert.equal((await lockStationDish(reloaded, body, dependencies)).status, 200);
  assert.equal((await loadAttemptById(attempt.id)).stateRevision, 1);
});
