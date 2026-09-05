"use strict";

const assert = require("node:assert/strict");
const { LearningService } = require("../../src/learning/service");
const { pilotWorks } = require("../../src/learning/pilot");

async function excellentScenarios(repository) {
  const service = new LearningService(repository, { pepper: "excellent-test", passwordIterations: 10_000 });
  await service.bootstrapAdmin({ bootstrapSecret: "excellent-test", login: "excellent-teacher", password: "ExcellentTest2026", displayName: "Тестовый преподаватель" }, "excellent-test");
  const teacher = await service.authenticate((await service.login({ login: "excellent-teacher", password: "ExcellentTest2026" })).token);
  const pilot = await service.seedPilot(teacher);
  const roster = await service.studentAccessStudents(pilot.group.id);
  const definition = pilotWorks(pilot.courses.map((course) => course.id), pilot.group.id)[2];
  const base = Object.fromEntries(definition.blocks.filter((block) => block.privateKey).map((block) => [block.id, {
    cells: Object.fromEntries(Object.entries(block.privateKey.cells).map(([id, key]) => [id, key.value ?? key]))
  }]));
  const extras = [undefined, { cells: { "beef:gross": "103 × 20 = 2060 г" } }, { cells: {
    "beef:gross": "103 × 20 = 2060 г", "beef:net": "76 × 20 = 1520 г",
    "beef:check": "2060 ÷ 20 = 103 г; 1520 ÷ 20 = 76 г",
    "beef:answer": "На 20 порций требуется 2060 г говядины брутто; масса нетто – 1520 г."
  } }];
  const submissionIds = [];
  for (let i = 0; i < extras.length; i++) {
    const student = await service.authenticate((await service.selectStudent({ groupId: pilot.group.id, studentId: roster.students[i].id })).token);
    const started = await service.startSubmission(student, pilot.works[2].assignmentId);
    const studentWork = (await service.getStudentAssignment(student, pilot.works[2].assignmentId)).work;
    const blockId = (key) => studentWork.blocks.find((block) => block.id === key || block.contentKey === key).id;
    submissionIds.push(started.id);
    let revision = 0;
    const answers = { ...base, ...(extras[i] ? { "pz3-full-calculation": extras[i] } : {}) };
    for (const [id, value] of Object.entries(answers)) {
      revision = (await service.saveAnswer(student, started.id, blockId(id), { value, expectedRevision: revision })).draftRevision;
    }
    const submitted = await service.submit(student, started.id, { expectedRevision: revision, idempotencyKey: `excellent-${i}` });
    assert.equal(submitted.submission.status, "submitted");
    assert.equal(submitted.submission.auto_score, 80);
    const detail = await service.getTeacherSubmission(teacher, started.id);
    assert.equal(detail.manualScoreAvailable, i < 2 ? 0 : 20);
    const scores = (full) => detail.work.rubric.map((criterion) => ({ criterionId: criterion.id, score: full ? criterion.max_score ?? criterion.maxScore : 0 }));
    if (i < 2) {
      await assert.rejects(() => service.gradeSubmission(teacher, started.id, { rubricScores: scores(true), grade: "5" }), (error) => error.code === "manual_score_unavailable");
    }
    const accepted = await service.gradeSubmission(teacher, started.id, { rubricScores: scores(i === 2), grade: "5", publish: true });
    assert.equal(accepted.grade, i < 2 ? "4" : "5");
    assert.equal(accepted.final_score, i < 2 ? 80 : 100);
    const dashboard = await service.studentDashboard(student);
    assert.equal(dashboard.assignments.find((item) => item.id === pilot.works[2].assignmentId).grade, accepted.grade);
  }
  return { service, teacher, pilot, submissionIds };
}

module.exports = { excellentScenarios };
