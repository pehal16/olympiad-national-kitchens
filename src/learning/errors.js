"use strict";

class LearningError extends Error {
  constructor(message, statusCode = 400, code = "learning_error", details = null) {
    super(message);
    this.name = "LearningError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function assertLearning(condition, message, statusCode = 400, code = "validation_error", details) {
  if (!condition) {
    throw new LearningError(message, statusCode, code, details || null);
  }
}

function maxAttemptsExceeded(maxAttempts, attemptsUsed = maxAttempts) {
  const limit = Math.max(1, Number(maxAttempts) || 1);
  return new LearningError(
    `Лимит попыток исчерпан. Разрешено попыток: ${limit}.`,
    409,
    "max_attempts_exceeded",
    {
      maxAttempts: limit,
      attemptsUsed: Math.max(0, Number(attemptsUsed) || 0)
    }
  );
}

module.exports = {
  LearningError,
  assertLearning,
  maxAttemptsExceeded
};
