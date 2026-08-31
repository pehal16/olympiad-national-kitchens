"use strict";

const { normalizeAnswer, validateAnswer } = require("./validation");
const { autoGrade } = require("./grading");

const SENSITIVE_KEYS = new Set([
  "answerkey",
  "privatekey",
  "gradingkey",
  "scoringkey",
  "private",
  "teacheronly",
  "teachernotes",
  "internalnotes",
  "modelanswer",
  "expected",
  "expectedanswer",
  "iscorrect",
  "rubricprivate",
  "privaterubric",
  "tolerance",
  "partialcredit",
  "objectkey",
  "storagekey",
  "internalpath",
  "filepath",
  "password",
  "passwordhash",
  "passwordsalt",
  "secret",
  "token",
  "tokenhash"
]);

function normalizedKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-zа-яё0-9]/giu, "");
}

function isSensitiveStudentKey(key) {
  const normalized = normalizedKey(key);
  return (
    SENSITIVE_KEYS.has(normalized) ||
    normalized.startsWith("correct") ||
    normalized.startsWith("acceptedanswer") ||
    normalized.startsWith("solution") ||
    normalized.startsWith("teacherprivate") ||
    normalized.startsWith("internalgrading")
  );
}

function sanitizeForStudent(value) {
  return sanitizeValue(value, new WeakSet());
}

function sanitizeValue(value, seen) {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== "object") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (seen.has(value)) {
    return undefined;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    const result = value
      .map((item) => sanitizeValue(item, seen))
      .filter((item) => item !== undefined);
    seen.delete(value);
    return result;
  }

  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (["__proto__", "prototype", "constructor"].includes(key) || isSensitiveStudentKey(key)) {
      continue;
    }
    const sanitized = sanitizeValue(child, seen);
    if (sanitized !== undefined) {
      result[key] = sanitized;
    }
  }
  seen.delete(value);
  return result;
}

function formatForTeacher(definition, rawAnswer, options = {}) {
  const normalizedAnswer = normalizeAnswer(definition, rawAnswer);
  const validation = validateAnswer(definition, rawAnswer);
  const grading = options.skipGrading ? null : autoGrade(definition, rawAnswer);
  const result = {
    blockId: String(definition?.id || ""),
    type: String(definition?.type || ""),
    definition: cloneForTeacher(definition),
    answer: normalizedAnswer,
    validation,
    grading
  };

  if (options.manualReview !== undefined) {
    result.manualReview = cloneForTeacher(options.manualReview);
  }
  if (options.submissionVersionId !== undefined) {
    result.submissionVersionId = String(options.submissionVersionId || "");
  }
  return result;
}

function cloneForTeacher(value, seen = new WeakSet()) {
  if (value === null || value === undefined || typeof value !== "object") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (seen.has(value)) {
    return undefined;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map((item) => cloneForTeacher(item, seen));
    seen.delete(value);
    return result;
  }
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) {
      continue;
    }
    const cloned = cloneForTeacher(child, seen);
    if (cloned !== undefined) {
      result[key] = cloned;
    }
  }
  seen.delete(value);
  return result;
}

module.exports = {
  sanitizeForStudent,
  sanitizeWorkForStudent: sanitizeForStudent,
  formatForTeacher,
  isSensitiveStudentKey
};
