"use strict";

const {
  validateDefinition,
  validateAnswer,
  normalizeAnswer,
  isPlainObject
} = require("./validation");
const { resolveGradingMode } = require("./grading");
const { sanitizeForStudent } = require("./serializers");

const SUBMISSION_STATES = Object.freeze([
  "draft",
  "in_progress",
  "submitted",
  "under_review",
  "changes_requested",
  "resubmitted",
  "graded",
  "accepted"
]);

const SUBMISSION_TRANSITIONS = Object.freeze({
  draft: Object.freeze(["in_progress"]),
  in_progress: Object.freeze(["submitted"]),
  submitted: Object.freeze(["under_review"]),
  under_review: Object.freeze(["changes_requested", "graded"]),
  changes_requested: Object.freeze(["resubmitted"]),
  resubmitted: Object.freeze(["under_review"]),
  graded: Object.freeze(["accepted"]),
  accepted: Object.freeze([])
});

const WORK_VERSION_STATES = Object.freeze(["draft", "published", "archived"]);
const STUDENT_TARGET_STATES = new Set(["in_progress", "submitted", "resubmitted"]);
const TEACHER_TARGET_STATES = new Set(["under_review", "changes_requested", "graded", "accepted"]);

class LearningDomainError extends Error {
  constructor(code, message, details = []) {
    super(message);
    this.name = "LearningDomainError";
    this.code = code;
    this.details = details;
    this.statusCode = code === "revision_conflict" ? 409 : 422;
  }
}

function canTransitionSubmission(fromState, toState) {
  const from = String(fromState || "").trim();
  const to = String(toState || "").trim();
  return Boolean(SUBMISSION_TRANSITIONS[from]?.includes(to));
}

function validateSubmissionTransition(submission, toState, context = {}) {
  const errors = [];
  if (!isPlainObject(submission)) {
    return {
      valid: false,
      errors: [domainIssue("submission", "submission_required", "Сдача должна быть объектом.")]
    };
  }

  const fromState = String(submission.status || "draft").trim();
  const targetState = String(toState || "").trim();
  if (!SUBMISSION_STATES.includes(fromState)) {
    errors.push(domainIssue("status", "unknown_submission_state", `Неизвестное состояние сдачи «${fromState}».`));
  }
  if (!SUBMISSION_STATES.includes(targetState)) {
    errors.push(domainIssue("toState", "unknown_submission_state", `Неизвестное целевое состояние «${targetState}».`));
  } else if (!canTransitionSubmission(fromState, targetState)) {
    errors.push(
      domainIssue(
        "toState",
        "invalid_submission_transition",
        `Переход ${fromState} → ${targetState} запрещён.`
      )
    );
  }

  const actorRole = normalizeRole(context.actorRole);
  if (!String(context.actorId || "").trim()) {
    errors.push(domainIssue("actorId", "actor_required", "Для доменного перехода нужен идентификатор пользователя."));
  }
  if (STUDENT_TARGET_STATES.has(targetState) && actorRole !== "student") {
    errors.push(domainIssue("actorRole", "student_role_required", "Этот переход может выполнить только студент."));
  }
  if (TEACHER_TARGET_STATES.has(targetState) && !["teacher", "admin"].includes(actorRole)) {
    errors.push(domainIssue("actorRole", "teacher_role_required", "Этот переход может выполнить только преподаватель."));
  }

  if (["submitted", "resubmitted"].includes(targetState)) {
    const snapshotId = String(context.submissionVersionId || context.snapshotId || "").trim();
    if (!snapshotId) {
      errors.push(domainIssue("submissionVersionId", "snapshot_required", "Для сдачи нужен неизменяемый снимок ответов."));
    }
    if (context.answersValid !== true) {
      errors.push(domainIssue("answersValid", "valid_answers_required", "Перед сдачей подтвердите валидность обязательных ответов."));
    }
    if (targetState === "resubmitted" && snapshotId && snapshotId === String(submission.currentVersionId || "")) {
      errors.push(domainIssue("submissionVersionId", "new_snapshot_required", "Повторная сдача должна создавать новую версию ответов."));
    }
  }

  if (targetState === "changes_requested" && !String(context.feedback || context.comment || "").trim()) {
    errors.push(domainIssue("feedback", "feedback_required", "При возврате укажите, что студенту нужно исправить."));
  }

  if (targetState === "graded") {
    const score = Number(context.finalScore ?? context.score);
    const maxScore = Number(context.maxScore ?? submission.maxScore);
    if (!Number.isFinite(score) || score < 0) {
      errors.push(domainIssue("finalScore", "score_required", "Укажите неотрицательную итоговую оценку."));
    } else if (Number.isFinite(maxScore) && maxScore >= 0 && score > maxScore) {
      errors.push(domainIssue("finalScore", "score_above_maximum", "Итоговая оценка не может превышать максимум."));
    }
  }

  if (targetState === "accepted") {
    const score = Number(submission.finalScore ?? context.finalScore);
    if (!Number.isFinite(score)) {
      errors.push(domainIssue("finalScore", "graded_score_required", "Принять можно только оценённую работу."));
    }
  }

  if (
    context.expectedRevision !== undefined &&
    Number(context.expectedRevision) !== Number(submission.revision ?? 0)
  ) {
    errors.push(domainIssue("revision", "revision_conflict", "Сдача была изменена в другой сессии."));
  }

  return { valid: errors.length === 0, errors };
}

function transitionSubmission(submission, toState, context = {}) {
  const result = validateSubmissionTransition(submission, toState, context);
  if (!result.valid) {
    const conflict = result.errors.find((entry) => entry.code === "revision_conflict");
    throw new LearningDomainError(
      conflict ? "revision_conflict" : "invalid_submission_transition",
      result.errors.map((entry) => entry.message).join(" "),
      result.errors
    );
  }

  const now = normalizeTimestamp(context.now);
  const fromState = String(submission.status || "draft");
  const targetState = String(toState);
  const next = {
    ...cloneValue(submission),
    status: targetState,
    revision: Number(submission.revision ?? 0) + 1,
    updatedAt: now
  };

  if (targetState === "in_progress") {
    next.startedAt = next.startedAt || now;
  }
  if (["submitted", "resubmitted"].includes(targetState)) {
    next.currentVersionId = String(context.submissionVersionId || context.snapshotId);
    next.submittedAt = now;
    next.lastSubmittedAt = now;
    if (targetState === "resubmitted") {
      next.resubmittedAt = now;
      next.resubmissionCount = Number(submission.resubmissionCount || 0) + 1;
    }
  }
  if (targetState === "under_review") {
    next.reviewStartedAt = now;
    next.reviewerId = String(context.actorId || next.reviewerId || "");
  }
  if (targetState === "changes_requested") {
    next.changesRequestedAt = now;
    next.changeRequest = {
      feedback: String(context.feedback || context.comment).trim(),
      requestedBy: String(context.actorId || ""),
      requestedAt: now,
      submissionVersionId: String(submission.currentVersionId || "")
    };
  }
  if (targetState === "graded") {
    next.finalScore = Number(context.finalScore ?? context.score);
    next.maxScore = Number.isFinite(Number(context.maxScore))
      ? Number(context.maxScore)
      : Number(submission.maxScore || 0);
    next.gradedAt = now;
    next.gradedBy = String(context.actorId || "");
    next.gradePublished = Boolean(context.gradePublished);
  }
  if (targetState === "accepted") {
    next.acceptedAt = now;
    next.acceptedBy = String(context.actorId || "");
    if (context.gradePublished !== undefined) {
      next.gradePublished = Boolean(context.gradePublished);
    }
  }

  next.history = [
    ...(Array.isArray(submission.history) ? cloneValue(submission.history) : []),
    {
      from: fromState,
      to: targetState,
      actorId: String(context.actorId || ""),
      actorRole: normalizeRole(context.actorRole),
      at: now
    }
  ];
  return next;
}

function assertSubmissionTransition(submission, toState, context = {}) {
  const result = validateSubmissionTransition(submission, toState, context);
  if (!result.valid) {
    const conflict = result.errors.find((entry) => entry.code === "revision_conflict");
    throw new LearningDomainError(
      conflict ? "revision_conflict" : "invalid_submission_transition",
      result.errors.map((entry) => entry.message).join(" "),
      result.errors
    );
  }
  return true;
}

function validateSubmissionAnswers(workDefinition, answers) {
  const blocks = Array.isArray(workDefinition?.blocks) ? workDefinition.blocks : [];
  const sourceAnswers = isPlainObject(answers) ? answers : {};
  const blockResults = {};
  const normalizedAnswers = {};
  const errors = [];

  for (const block of blocks) {
    const blockId = String(block?.id || "");
    const result = validateAnswer(block, sourceAnswers[blockId]);
    blockResults[blockId] = result;
    normalizedAnswers[blockId] = result.normalized;
    result.errors.forEach((entry) => {
      errors.push({ ...entry, path: `answers.${blockId}.${entry.path}` });
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    blockResults,
    normalizedAnswers
  };
}

function createSubmissionSnapshot(input, context = {}) {
  if (!isPlainObject(input)) {
    throw new LearningDomainError("snapshot_input_required", "Укажите данные снимка сдачи.");
  }
  const validation = validateSubmissionAnswers(input.definition, input.answers);
  if (!validation.valid) {
    throw new LearningDomainError(
      "invalid_submission_answers",
      "Снимок нельзя создать, пока обязательные ответы не заполнены.",
      validation.errors
    );
  }
  const id = String(input.id || context.id || "").trim();
  const submissionId = String(input.submissionId || "").trim();
  const workVersionId = String(input.workVersionId || "").trim();
  if (!id || !submissionId || !workVersionId) {
    throw new LearningDomainError(
      "snapshot_identity_required",
      "Снимку нужны id, submissionId и workVersionId."
    );
  }
  return deepFreeze({
    id,
    submissionId,
    workVersionId,
    versionNo: Number(input.versionNo || 1),
    answers: validation.normalizedAnswers,
    createdAt: normalizeTimestamp(context.now),
    createdBy: String(context.actorId || input.createdBy || ""),
    immutable: true
  });
}

function validateWorkVersionForPublication(version) {
  const errors = [];
  if (!isPlainObject(version)) {
    return {
      valid: false,
      errors: [domainIssue("version", "version_required", "Версия работы должна быть объектом.")],
      totalMaxScore: 0
    };
  }

  if (String(version.status || "draft") !== "draft") {
    errors.push(domainIssue("status", "draft_version_required", "Публиковать можно только черновую версию."));
  }
  for (const [field, value, message] of [
    ["id", version.id, "Укажите id версии работы."],
    ["workId", version.workId ?? version.work_id, "Укажите связь версии с работой."],
    ["title", version.title, "Укажите название работы."],
    ["topic", version.topic, "Укажите тему работы."]
  ]) {
    if (!String(value || "").trim()) {
      errors.push(domainIssue(field, `${field}_required`, message));
    }
  }
  const versionNo = Number(version.versionNo ?? version.version_no);
  if (!Number.isInteger(versionNo) || versionNo < 1) {
    errors.push(domainIssue("versionNo", "version_number_required", "Номер версии должен быть положительным целым числом."));
  }

  const content = getVersionContent(version);
  const blocks = Array.isArray(content.blocks) ? content.blocks : [];
  const privateKeys = getVersionPrivateKeys(version);
  const materializedBlocks = blocks.map((block) => mergeBlockPrivateKey(block, privateKeys?.[block.id]));
  const definitionValidation = validateDefinition({ ...content, blocks: materializedBlocks });
  definitionValidation.errors.forEach((entry) =>
    errors.push(domainIssue(`content.${entry.path}`, entry.code, entry.message))
  );

  let totalMaxScore = 0;
  let manualMaxScore = 0;
  materializedBlocks.forEach((block, index) => {
    const maxScore = Number(block.maxScore || 0);
    if (Number.isFinite(maxScore) && maxScore > 0) {
      totalMaxScore += maxScore;
    }
    if (resolveGradingMode(block) === "manual" && maxScore > 0) {
      manualMaxScore += maxScore;
    }
    if (resolveGradingMode(block) === "manual" && maxScore > 0 && !hasPublicRubric(version, block)) {
      errors.push(
        domainIssue(
          `content.blocks[${index}].publicRubric`,
          "public_rubric_required",
          `Для ручной проверки блока «${block.id}» нужна публичная рубрика.`
        )
      );
    }
  });

  const declaredMaxScore = Number(version.maxScore ?? version.max_score);
  if (Number.isFinite(declaredMaxScore) && Math.abs(declaredMaxScore - totalMaxScore) > 0.0001) {
    errors.push(
      domainIssue(
        "maxScore",
        "max_score_mismatch",
        `Максимальный балл версии (${declaredMaxScore}) не совпадает с суммой блоков (${totalMaxScore}).`
      )
    );
  }

  const publicRubric = getVersionPublicRubric(version);
  const rubricMaxScore = sumRubricMaxScore(publicRubric);
  if (manualMaxScore > 0 && Math.abs(rubricMaxScore - manualMaxScore) > 0.0001) {
    errors.push(
      domainIssue(
        "publicRubric",
        "rubric_max_score_mismatch",
        `Сумма критериев ручной проверки (${rubricMaxScore}) должна совпадать с максимальным ручным баллом (${manualMaxScore}).`
      )
    );
  }
  if (publicRubric !== undefined && JSON.stringify(publicRubric) !== JSON.stringify(sanitizeForStudent(publicRubric))) {
    errors.push(
      domainIssue(
        "publicRubric",
        "private_data_in_public_rubric",
        "Публичная рубрика содержит закрытые ключи проверки."
      )
    );
  }

  return { valid: errors.length === 0, errors, totalMaxScore };
}

function sumRubricMaxScore(value) {
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + sumRubricMaxScore(item), 0);
  }
  if (!isPlainObject(value)) return 0;
  const direct = Number(value.maxScore ?? value.max_score);
  if (Number.isFinite(direct) && direct >= 0) return direct;
  return Object.values(value).reduce((sum, item) => sum + sumRubricMaxScore(item), 0);
}

function publishWorkVersion(version, context = {}) {
  const validation = validateWorkVersionForPublication(version);
  if (!validation.valid) {
    throw new LearningDomainError(
      "work_version_not_publishable",
      validation.errors.map((entry) => entry.message).join(" "),
      validation.errors
    );
  }
  const actorId = String(context.actorId || "").trim();
  if (!actorId) {
    throw new LearningDomainError("publisher_required", "Укажите преподавателя, публикующего версию.");
  }
  const published = {
    ...cloneValue(version),
    status: "published",
    maxScore: validation.totalMaxScore,
    publishedAt: normalizeTimestamp(context.now),
    publishedBy: actorId,
    immutable: true
  };
  return deepFreeze(published);
}

function assertPublishedVersionImmutable(previousVersion, nextVersion) {
  const status = String(previousVersion?.status || "");
  if (!["published", "archived"].includes(status)) {
    return true;
  }
  if (stableStringify(previousVersion) !== stableStringify(nextVersion)) {
    throw new LearningDomainError(
      "published_version_immutable",
      "Опубликованную или архивную версию нельзя изменять или перезаписывать. Создайте новую версию."
    );
  }
  return true;
}

function validateAssignmentForPublication(assignment, workVersion) {
  const errors = [];
  if (!isPlainObject(assignment)) {
    return {
      valid: false,
      errors: [domainIssue("assignment", "assignment_required", "Назначение должно быть объектом.")]
    };
  }
  const versionId = String(assignment.workVersionId ?? assignment.work_version_id ?? "").trim();
  if (!versionId) {
    errors.push(domainIssue("workVersionId", "work_version_required", "Выберите опубликованную версию работы."));
  }
  if (!workVersion || workVersion.status !== "published" || String(workVersion.id || "") !== versionId) {
    errors.push(domainIssue("workVersionId", "published_version_required", "Назначение должно ссылаться на неизменяемую опубликованную версию."));
  }

  const targets = Array.isArray(assignment.targets)
    ? assignment.targets
    : [
        ...(Array.isArray(assignment.targetGroupIds) ? assignment.targetGroupIds.map((id) => ({ type: "group", id })) : []),
        ...(Array.isArray(assignment.targetStudentIds) ? assignment.targetStudentIds.map((id) => ({ type: "student", id })) : [])
      ];
  const validTargets = targets.filter((target) => String((target?.id ?? target) || "").trim());
  if (validTargets.length === 0) {
    errors.push(domainIssue("targets", "assignment_target_required", "Назначьте работу группе или студенту."));
  }

  const dueAt = Date.parse(String(assignment.dueAt ?? assignment.due_at ?? ""));
  if (!Number.isFinite(dueAt)) {
    errors.push(domainIssue("dueAt", "due_at_required", "Укажите корректный срок сдачи."));
  }
  const availableAtRaw = assignment.availableAt ?? assignment.available_at;
  if (availableAtRaw) {
    const availableAt = Date.parse(String(availableAtRaw));
    if (!Number.isFinite(availableAt)) {
      errors.push(domainIssue("availableAt", "available_at_invalid", "Дата открытия назначения некорректна."));
    } else if (Number.isFinite(dueAt) && availableAt >= dueAt) {
      errors.push(domainIssue("dueAt", "assignment_date_range", "Срок сдачи должен быть позже даты открытия."));
    }
  }
  return { valid: errors.length === 0, errors };
}

function publishAssignment(assignment, workVersion, context = {}) {
  const validation = validateAssignmentForPublication(assignment, workVersion);
  if (!validation.valid) {
    throw new LearningDomainError(
      "assignment_not_publishable",
      validation.errors.map((entry) => entry.message).join(" "),
      validation.errors
    );
  }
  const actorId = String(context.actorId || "").trim();
  if (!actorId) {
    throw new LearningDomainError("publisher_required", "Укажите преподавателя, публикующего назначение.");
  }
  return deepFreeze({
    ...cloneValue(assignment),
    status: "active",
    publishedAt: normalizeTimestamp(context.now),
    publishedBy: actorId,
    immutableWorkVersionId: String(workVersion.id)
  });
}

function getVersionContent(version) {
  const raw = version?.content ?? version?.contentJson ?? version?.content_json;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return isPlainObject(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  }
  return isPlainObject(raw) ? raw : {};
}

function getVersionPrivateKeys(version) {
  const raw = version?.privateKeys ?? version?.privateKeyJson ?? version?.private_key_json;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return normalizePrivateKeyMap(parsed);
    } catch (error) {
      return {};
    }
  }
  return normalizePrivateKeyMap(raw);
}

function normalizePrivateKeyMap(raw) {
  if (Array.isArray(raw)) {
    return Object.fromEntries(
      raw
        .filter((entry) => isPlainObject(entry) && String(entry.blockId ?? entry.block_id ?? "").trim())
        .map((entry) => [
          String(entry.blockId ?? entry.block_id),
          entry.key ?? entry.keyJson ?? entry.key_json ?? entry.answerKey ?? {}
        ])
    );
  }
  if (!isPlainObject(raw)) {
    return {};
  }
  if (isPlainObject(raw.blocks)) {
    return raw.blocks;
  }
  return raw;
}

function getVersionPublicRubric(version) {
  const raw = version?.publicRubric ?? version?.public_rubric_json;
  if (typeof raw !== "string") {
    return raw;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return raw;
  }
}

function mergeBlockPrivateKey(block, privateKey) {
  if (!isPlainObject(block) || !isPlainObject(privateKey)) {
    return block;
  }
  return {
    ...block,
    privateKey: {
      ...(isPlainObject(block.privateKey) ? block.privateKey : {}),
      ...privateKey
    }
  };
}

function hasPublicRubric(version, block) {
  if (hasMeaningfulValue(block.publicRubric)) {
    return true;
  }
  const rubric = getVersionPublicRubric(version);
  if (!hasMeaningfulValue(rubric)) {
    return false;
  }
  if (isPlainObject(rubric) && Object.prototype.hasOwnProperty.call(rubric, block.id)) {
    return hasMeaningfulValue(rubric[block.id]);
  }
  return true;
}

function hasMeaningfulValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0 && value.some(hasMeaningfulValue);
  }
  if (isPlainObject(value)) {
    return Object.keys(value).length > 0 && Object.values(value).some(hasMeaningfulValue);
  }
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  return role === "admin" || role === "teacher" || role === "student" ? role : "";
}

function normalizeTimestamp(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new LearningDomainError("invalid_timestamp", "Некорректная дата доменного события.");
  }
  return date.toISOString();
}

function domainIssue(path, code, message) {
  return { path, code, message };
}

function cloneValue(value) {
  if (typeof global.structuredClone === "function") {
    return global.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) {
    return value;
  }
  seen.add(value);
  Object.values(value).forEach((child) => deepFreeze(child, seen));
  return Object.freeze(value);
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

module.exports = {
  SUBMISSION_STATES,
  SUBMISSION_TRANSITIONS,
  WORK_VERSION_STATES,
  LearningDomainError,
  canTransitionSubmission,
  validateSubmissionTransition,
  assertSubmissionTransition,
  assertTransition: assertSubmissionTransition,
  transitionSubmission,
  validateSubmissionAnswers,
  createSubmissionSnapshot,
  validateWorkVersionForPublication,
  validateWorkDraft: validateWorkVersionForPublication,
  publishWorkVersion,
  assertPublishedVersionImmutable,
  validateAssignmentForPublication,
  publishAssignment,
  getVersionContent,
  getVersionPrivateKeys,
  getVersionPublicRubric,
  deepFreeze
};
