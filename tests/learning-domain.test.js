"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SUBMISSION_STATES,
  canTransitionSubmission,
  validateSubmissionTransition,
  transitionSubmission,
  createSubmissionSnapshot,
  validateWorkVersionForPublication,
  publishWorkVersion,
  assertPublishedVersionImmutable,
  validateAssignmentForPublication,
  publishAssignment,
  LearningDomainError
} = require("../src/learning/domain");

const singleBlock = {
  id: "temperature-test",
  type: "single_choice",
  prompt: "Выберите безопасный температурный режим.",
  maxScore: 5,
  options: [
    { id: "safe", label: "Безопасный" },
    { id: "unsafe", label: "Небезопасный" }
  ]
};

const essayBlock = {
  id: "technology-conclusion",
  type: "long_text",
  prompt: "Обоснуйте выбранную технологию.",
  minLength: 10,
  maxScore: 10
};

function draftVersion(overrides = {}) {
  return {
    id: "work-version-1",
    workId: "work-1",
    versionNo: 1,
    status: "draft",
    title: "Практическая работа по тепловой обработке",
    topic: "Выбор режима обработки",
    maxScore: 15,
    contentJson: {
      schemaVersion: 1,
      blocks: [singleBlock, essayBlock]
    },
    privateKeyJson: {
      [singleBlock.id]: { optionId: "safe" }
    },
    publicRubric: {
      [essayBlock.id]: [
        { id: "logic", label: "Логика обоснования", maxScore: 5 },
        { id: "safety", label: "Учёт безопасности", maxScore: 5 }
      ]
    },
    ...overrides
  };
}

test("submission state machine exposes the exact pilot states and legal edges", () => {
  assert.deepEqual(SUBMISSION_STATES, [
    "draft",
    "in_progress",
    "submitted",
    "under_review",
    "changes_requested",
    "resubmitted",
    "graded",
    "accepted"
  ]);
  assert.equal(canTransitionSubmission("draft", "in_progress"), true);
  assert.equal(canTransitionSubmission("draft", "submitted"), false);
  assert.equal(canTransitionSubmission("accepted", "in_progress"), false);
});
test("submission completes the review, correction, re-submission and acceptance cycle", () => {
  const base = { id: "submission-1", status: "draft", revision: 0, maxScore: 15, history: [] };
  const started = transitionSubmission(base, "in_progress", {
    actorId: "student-1",
    actorRole: "student",
    now: "2026-09-01T08:00:00.000Z"
  });
  const submitted = transitionSubmission(started, "submitted", {
    actorId: "student-1",
    actorRole: "student",
    submissionVersionId: "revision-1",
    answersValid: true,
    expectedRevision: 1,
    now: "2026-09-01T08:30:00.000Z"
  });
  const review = transitionSubmission(submitted, "under_review", {
    actorId: "teacher-1",
    actorRole: "teacher",
    now: "2026-09-01T09:00:00.000Z"
  });
  const returned = transitionSubmission(review, "changes_requested", {
    actorId: "teacher-1",
    actorRole: "teacher",
    feedback: "Уточните обоснование температурного режима.",
    now: "2026-09-01T09:10:00.000Z"
  });
  const resubmitted = transitionSubmission(returned, "resubmitted", {
    actorId: "student-1",
    actorRole: "student",
    submissionVersionId: "revision-2",
    answersValid: true,
    now: "2026-09-01T10:00:00.000Z"
  });
  const secondReview = transitionSubmission(resubmitted, "under_review", {
    actorId: "teacher-1",
    actorRole: "teacher",
    now: "2026-09-01T10:10:00.000Z"
  });
  const graded = transitionSubmission(secondReview, "graded", {
    actorId: "teacher-1",
    actorRole: "teacher",
    finalScore: 14,
    maxScore: 15,
    gradePublished: true,
    now: "2026-09-01T10:20:00.000Z"
  });
  const accepted = transitionSubmission(graded, "accepted", {
    actorId: "teacher-1",
    actorRole: "teacher",
    gradePublished: true,
    now: "2026-09-01T10:25:00.000Z"
  });

  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.currentVersionId, "revision-2");
  assert.equal(accepted.resubmissionCount, 1);
  assert.equal(accepted.finalScore, 14);
  assert.equal(accepted.history.length, 8);
  assert.equal(base.status, "draft", "transition must not mutate source object");
});

test("state machine enforces actor role, snapshot and optimistic revision", () => {
  const draft = { id: "s1", status: "draft", revision: 3 };
  const wrongRole = validateSubmissionTransition(draft, "in_progress", { actorRole: "teacher" });
  assert.equal(wrongRole.valid, false);
  assert.equal(wrongRole.errors.some((entry) => entry.code === "student_role_required"), true);

  const inProgress = { id: "s1", status: "in_progress", revision: 3 };
  const noSnapshot = validateSubmissionTransition(inProgress, "submitted", {
    actorRole: "student",
    answersValid: true
  });
  assert.equal(noSnapshot.errors.some((entry) => entry.code === "snapshot_required"), true);

  assert.throws(
    () =>
      transitionSubmission(inProgress, "submitted", {
        actorRole: "student",
        submissionVersionId: "r1",
        answersValid: true,
        expectedRevision: 2
      }),
    (error) => error instanceof LearningDomainError && error.code === "revision_conflict"
  );
});

test("submission snapshot normalizes answers and is deeply immutable", () => {
  const snapshot = createSubmissionSnapshot(
    {
      id: "revision-1",
      submissionId: "submission-1",
      workVersionId: "work-version-1",
      definition: {
        blocks: [
          {
            ...singleBlock,
            answerKey: { optionId: "safe" }
          }
        ]
      },
      answers: { [singleBlock.id]: { selectedOptionId: "safe" } }
    },
    { actorId: "student-1", now: "2026-09-01T08:30:00.000Z" }
  );
  assert.equal(snapshot.answers[singleBlock.id], "safe");
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.answers), true);
  assert.throws(() => {
    snapshot.answers[singleBlock.id] = "unsafe";
  }, TypeError);
});

test("publication validates separate private keys, public rubric and score contract", () => {
  const version = draftVersion();
  const validation = validateWorkVersionForPublication(version);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  assert.equal(validation.totalMaxScore, 15);

  const missingKey = validateWorkVersionForPublication(
    draftVersion({ privateKeyJson: {} })
  );
  assert.equal(missingKey.valid, false);
  assert.equal(missingKey.errors.some((entry) => entry.code === "answer_key_required"), true);

  const missingRubric = validateWorkVersionForPublication(
    draftVersion({ publicRubric: {} })
  );
  assert.equal(missingRubric.valid, false);
  assert.equal(missingRubric.errors.some((entry) => entry.code === "public_rubric_required"), true);

  const wrongMaximum = validateWorkVersionForPublication(
    draftVersion({ maxScore: 99 })
  );
  assert.equal(wrongMaximum.errors.some((entry) => entry.code === "max_score_mismatch"), true);

  const wrongRubricMaximum = validateWorkVersionForPublication(
    draftVersion({
      publicRubric: {
        [essayBlock.id]: [{ id: "logic", label: "Логика", maxScore: 9 }]
      }
    })
  );
  assert.equal(
    wrongRubricMaximum.errors.some((entry) => entry.code === "rubric_max_score_mismatch"),
    true
  );
});

test("published version is frozen and any later mutation is rejected", () => {
  const published = publishWorkVersion(draftVersion(), {
    actorId: "teacher-1",
    now: "2026-09-01T07:00:00.000Z"
  });
  assert.equal(published.status, "published");
  assert.equal(published.publishedBy, "teacher-1");
  assert.equal(Object.isFrozen(published), true);
  assert.equal(assertPublishedVersionImmutable(published, JSON.parse(JSON.stringify(published))), true);

  const changed = JSON.parse(JSON.stringify(published));
  changed.title = "Подменённое название";
  assert.throws(
    () => assertPublishedVersionImmutable(published, changed),
    (error) => error instanceof LearningDomainError && error.code === "published_version_immutable"
  );
});

test("assignment can only activate a published immutable version with target and deadline", () => {
  const publishedVersion = publishWorkVersion(draftVersion(), {
    actorId: "teacher-1",
    now: "2026-09-01T07:00:00.000Z"
  });
  const assignment = {
    id: "assignment-1",
    workVersionId: publishedVersion.id,
    targetGroupIds: ["group-1"],
    availableAt: "2026-09-01T08:00:00.000Z",
    dueAt: "2026-09-08T18:00:00.000Z",
    status: "draft"
  };
  assert.equal(validateAssignmentForPublication(assignment, publishedVersion).valid, true);
  const active = publishAssignment(assignment, publishedVersion, {
    actorId: "teacher-1",
    now: "2026-09-01T07:30:00.000Z"
  });
  assert.equal(active.status, "active");
  assert.equal(active.immutableWorkVersionId, publishedVersion.id);
  assert.equal(Object.isFrozen(active), true);

  const invalid = validateAssignmentForPublication(
    { ...assignment, targetGroupIds: [], dueAt: "invalid" },
    draftVersion()
  );
  assert.equal(invalid.valid, false);
  assert.equal(invalid.errors.some((entry) => entry.code === "published_version_required"), true);
  assert.equal(invalid.errors.some((entry) => entry.code === "assignment_target_required"), true);
  assert.equal(invalid.errors.some((entry) => entry.code === "due_at_required"), true);
});
