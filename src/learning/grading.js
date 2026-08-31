"use strict";

const { getBlockSpec, normalizeEntityList } = require("./block-registry");
const {
  validateBlockDefinition,
  validateAnswer,
  normalizeAnswer,
  getPrivateAnswerKey,
  normalizeIdArray,
  normalizeTextArray,
  normalizeMap,
  isPlainObject
} = require("./validation");

function autoGrade(definition, rawAnswer) {
  const definitionValidation = validateBlockDefinition(definition);
  const type = String(definition?.type || "").trim();
  const spec = getBlockSpec(type);
  const maxScore = positiveScore(definition?.maxScore);
  const normalized = normalizeAnswer(definition, rawAnswer);

  if (!definitionValidation.valid || !spec) {
    return {
      blockId: String(definition?.id || ""),
      type,
      mode: "invalid",
      status: "invalid_definition",
      score: null,
      maxScore,
      fraction: null,
      correct: null,
      requiresManualReview: false,
      normalizedAnswer: normalized,
      validation: definitionValidation,
      details: {}
    };
  }

  if (spec.answerMode === "none") {
    return gradeResult(definition, normalized, "none", "not_applicable", 0, 0, null, false, {
      valid: true,
      complete: true,
      normalized,
      errors: []
    });
  }

  const answerValidation = validateAnswer(definition, rawAnswer);
  const effectiveMode = resolveGradingMode(definition, spec);
  if (effectiveMode === "manual") {
    const requiresManualReview = answerValidation.valid && answerValidation.complete;
    return {
      blockId: String(definition.id || ""),
      type,
      mode: "manual",
      status: requiresManualReview ? "manual_review" : answerValidation.valid ? "skipped" : "incomplete",
      score: answerValidation.valid && !answerValidation.complete ? 0 : null,
      maxScore,
      fraction: null,
      correct: null,
      requiresManualReview,
      normalizedAnswer: answerValidation.normalized,
      validation: answerValidation,
      details: {}
    };
  }

  if (!answerValidation.valid) {
    return gradeResult(
      definition,
      answerValidation.normalized,
      "automatic",
      "invalid_answer",
      0,
      0,
      false,
      false,
      answerValidation,
      { errorCodes: answerValidation.errors.map((entry) => entry.code) }
    );
  }

  const key = getPrivateAnswerKey(definition);
  const outcome = gradeAutomaticByType(definition, answerValidation.normalized, key);
  const fraction = clampFraction(outcome.fraction);
  const score = roundScore(maxScore * fraction);
  return gradeResult(
    definition,
    answerValidation.normalized,
    "automatic",
    "graded",
    score,
    fraction,
    fraction >= 1,
    false,
    answerValidation,
    outcome.details || {}
  );
}

function gradeSubmission(workDefinition, answers = {}) {
  const blocks = Array.isArray(workDefinition)
    ? workDefinition
    : Array.isArray(workDefinition?.blocks)
      ? workDefinition.blocks
      : [];
  const sourceAnswers = isPlainObject(answers) ? answers : {};
  const blockResults = {};
  let autoScore = 0;
  let maxScore = 0;
  let manualMaxScore = 0;
  let valid = true;
  let requiresManualReview = false;

  for (const block of blocks) {
    const blockId = String(block?.id || "");
    const result = autoGrade(block, sourceAnswers[blockId]);
    blockResults[blockId] = result;
    maxScore += positiveScore(block?.maxScore);
    if (typeof result.score === "number") {
      autoScore += result.score;
    }
    if (result.mode === "manual") {
      manualMaxScore += positiveScore(block?.maxScore);
    }
    if (result.requiresManualReview) {
      requiresManualReview = true;
    }
    if (result.validation?.valid === false || result.status === "invalid_definition") {
      valid = false;
    }
  }

  return {
    valid,
    autoScore: roundScore(autoScore),
    maxScore: roundScore(maxScore),
    manualMaxScore: roundScore(manualMaxScore),
    finalScore: requiresManualReview ? null : roundScore(autoScore),
    requiresManualReview,
    blockResults
  };
}

function resolveGradingMode(definition, spec = getBlockSpec(definition?.type)) {
  if (!spec || spec.answerMode === "none") {
    return "none";
  }
  if (spec.answerMode === "automatic" || spec.answerMode === "manual") {
    return spec.answerMode;
  }
  const key = getPrivateAnswerKey(definition);
  switch (definition.type) {
    case "short_text":
      return normalizeTextArray(key.acceptedAnswers ?? key.answers ?? key.values).length ? "automatic" : "manual";
    case "table":
      return Object.keys(normalizeMap(key.cells ?? key.correctCells)).length ? "automatic" : "manual";
    case "dish_assembly":
      return Object.keys(normalizeMap(key.placements ?? key.correctPlacements)).length ||
        normalizeIdArray(key.selectedIds ?? key.correctOptionIds).length
        ? "automatic"
        : "manual";
    default:
      return "manual";
  }
}

function gradeAutomaticByType(definition, answer, key) {
  switch (definition.type) {
    case "single_choice":
      return gradeSingleChoice(answer, key);
    case "multiple_choice":
      return gradeMultipleChoice(answer, key);
    case "short_text":
      return gradeShortText(definition, answer, key);
    case "calculation":
      return gradeCalculation(definition, answer, key);
    case "matching":
      return gradeMap(answer, normalizeMap(key.pairs ?? key.correctPairs));
    case "ordering":
      return gradeOrdering(answer, normalizeIdArray(key.order ?? key.correctOrder));
    case "classification":
      return gradeMap(answer, normalizeMap(key.assignments ?? key.correctAssignments));
    case "table":
      return gradeScalarMap(answer.cells, key.cells ?? key.correctCells, definition);
    case "dish_assembly":
      return gradeDishAssembly(answer, key);
    case "crossword":
      return gradeWords(answer.words, key.words ?? key.correctWords, definition);
    case "safety_checklist":
      return gradeSafety(definition, answer.checks, key);
    default:
      return { fraction: 0, details: { unsupportedAutomaticType: definition.type } };
  }
}

function gradeSingleChoice(answer, key) {
  const expected = String(key.optionId ?? key.correctOptionId ?? key.value ?? "").trim();
  const matched = Boolean(expected) && answer === expected;
  return { fraction: matched ? 1 : 0, details: { matched } };
}

function gradeMultipleChoice(answer, key) {
  const expected = normalizeIdArray(key.optionIds ?? key.correctOptionIds ?? key.values);
  const expectedSet = new Set(expected);
  const actualSet = new Set(answer);
  const correctSelected = [...actualSet].filter((id) => expectedSet.has(id)).length;
  const incorrectSelected = [...actualSet].filter((id) => !expectedSet.has(id)).length;
  const fraction = expected.length
    ? Math.max(0, (correctSelected - incorrectSelected) / expected.length)
    : 0;
  return {
    fraction,
    details: {
      correctSelected,
      incorrectSelected,
      expectedCount: expected.length,
      selectedCount: actualSet.size
    }
  };
}

function gradeShortText(definition, answer, key) {
  const accepted = normalizeTextArray(key.acceptedAnswers ?? key.answers ?? key.values);
  const actual = canonicalText(answer, definition);
  const matchedIndex = accepted.findIndex((candidate) => canonicalText(candidate, definition) === actual);
  return {
    fraction: matchedIndex >= 0 ? 1 : 0,
    details: { matched: matchedIndex >= 0, acceptedAnswerCount: accepted.length }
  };
}

function gradeCalculation(definition, answer, key) {
  const expectedValue = Number(key.value ?? key.correctValue ?? key.expected);
  const expectedUnit = normalizeUnit(key.unit ?? definition.unit);
  const actualUnit = normalizeUnit(answer.unit);
  const tolerance = resolveTolerance(expectedValue, key.tolerance ?? definition.tolerance);
  const difference = Math.abs(Number(answer.value) - expectedValue);
  const valueCorrect = Number.isFinite(expectedValue) && Number.isFinite(answer.value) && difference <= tolerance;
  const unitCorrect = !expectedUnit || actualUnit === expectedUnit;

  if (valueCorrect && unitCorrect) {
    return {
      fraction: 1,
      details: { valueCorrect, unitCorrect, withinTolerance: true, difference, tolerance }
    };
  }

  const partial = isPlainObject(key.partialCredit)
    ? key.partialCredit
    : isPlainObject(definition.partialCredit)
      ? definition.partialCredit
      : {};
  const valueOnlyFraction = numericFraction(partial.valueOnlyFraction, expectedUnit ? 0.75 : 1);
  const unitOnlyFraction = numericFraction(partial.unitOnlyFraction, 0);
  const nearValueFraction = numericFraction(partial.nearValueFraction, 0.5);
  const nearToleranceMultiplier = Math.max(1, Number(partial.nearToleranceMultiplier ?? 2) || 2);
  const nearValue =
    !valueCorrect &&
    tolerance > 0 &&
    Number.isFinite(difference) &&
    difference <= tolerance * nearToleranceMultiplier;

  let fraction = 0;
  let partialReason = "incorrect";
  if (valueCorrect) {
    fraction = valueOnlyFraction;
    partialReason = "value_without_expected_unit";
  } else if (nearValue) {
    fraction = nearValueFraction * (unitCorrect ? 1 : valueOnlyFraction);
    partialReason = "near_value";
  } else if (unitCorrect && expectedUnit) {
    fraction = unitOnlyFraction;
    partialReason = "unit_only";
  }

  return {
    fraction,
    details: {
      valueCorrect,
      unitCorrect,
      nearValue,
      partialReason,
      difference,
      tolerance
    }
  };
}

function gradeMap(answer, expected) {
  const keys = Object.keys(expected || {});
  let correctCount = 0;
  for (const key of keys) {
    if (String(answer?.[key] ?? "") === String(expected[key] ?? "")) {
      correctCount += 1;
    }
  }
  return {
    fraction: keys.length ? correctCount / keys.length : 0,
    details: { correctCount, totalCount: keys.length }
  };
}

function gradeOrdering(answer, expected) {
  let correctPositions = 0;
  expected.forEach((id, index) => {
    if (answer[index] === id) {
      correctPositions += 1;
    }
  });
  return {
    fraction: expected.length ? correctPositions / expected.length : 0,
    details: { correctPositions, totalCount: expected.length }
  };
}

function gradeScalarMap(answer, expectedRaw, definition) {
  const expected = isPlainObject(expectedRaw) ? expectedRaw : {};
  const keys = Object.keys(expected);
  let correctCount = 0;
  keys.forEach((cellId) => {
    if (compareExpectedValue(answer?.[cellId], expected[cellId], definition)) {
      correctCount += 1;
    }
  });
  return {
    fraction: keys.length ? correctCount / keys.length : 0,
    details: { correctCount, totalCount: keys.length }
  };
}

function gradeDishAssembly(answer, key) {
  const expectedPlacements = normalizeMap(key.placements ?? key.correctPlacements);
  if (Object.keys(expectedPlacements).length) {
    return gradeMap(answer.placements, expectedPlacements);
  }
  return gradeMultipleChoice(
    answer.selectedIds,
    { optionIds: normalizeIdArray(key.selectedIds ?? key.correctOptionIds) }
  );
}

function gradeWords(answer, expectedRaw, definition) {
  const expected = isPlainObject(expectedRaw) ? expectedRaw : {};
  const keys = Object.keys(expected);
  let correctCount = 0;
  keys.forEach((clueId) => {
    if (canonicalText(answer?.[clueId], { ...definition, ignoreWhitespace: true }) === canonicalText(expected[clueId], { ...definition, ignoreWhitespace: true })) {
      correctCount += 1;
    }
  });
  return {
    fraction: keys.length ? correctCount / keys.length : 0,
    details: { correctCount, totalCount: keys.length }
  };
}

function gradeSafety(definition, answer, key) {
  const items = normalizeEntityList(definition.items);
  const explicit = key.checks ?? key.correctChecks;
  const expected = isPlainObject(explicit)
    ? Object.fromEntries(Object.entries(explicit).map(([id, value]) => [id, Boolean(value)]))
    : Object.fromEntries(items.map((item) => [item.id, item.expected === false ? false : true]));
  const keys = Object.keys(expected);
  let correctCount = 0;
  keys.forEach((id) => {
    if (answer?.[id] === expected[id]) {
      correctCount += 1;
    }
  });
  return {
    fraction: keys.length ? correctCount / keys.length : 0,
    details: { correctCount, totalCount: keys.length }
  };
}

function compareExpectedValue(actual, expected, definition) {
  if (isPlainObject(expected) && (expected.value !== undefined || expected.correctValue !== undefined)) {
    const expectedValue = Number(expected.value ?? expected.correctValue);
    const actualValue = typeof actual === "object" ? Number(actual?.value) : Number(String(actual ?? "").replace(",", "."));
    const tolerance = resolveTolerance(expectedValue, expected.tolerance);
    return Number.isFinite(actualValue) && Math.abs(actualValue - expectedValue) <= tolerance;
  }
  if (typeof expected === "number") {
    const actualNumber = Number(String(actual ?? "").replace(",", "."));
    return Number.isFinite(actualNumber) && actualNumber === expected;
  }
  return canonicalText(actual, definition) === canonicalText(expected, definition);
}

function canonicalText(value, options = {}) {
  let result = String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ");
  if (options.caseSensitive !== true) {
    result = result.toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
  }
  if (options.ignorePunctuation === true) {
    result = result.replace(/[^\p{L}\p{N}\s]/gu, "");
  }
  if (options.ignoreWhitespace === true) {
    result = result.replace(/\s+/g, "");
  }
  return result;
}

function normalizeUnit(value) {
  return canonicalText(value, { ignoreWhitespace: true }).replace(/[.]/g, "");
}

function resolveTolerance(expectedValue, rawTolerance) {
  if (rawTolerance === undefined || rawTolerance === null || rawTolerance === "") {
    return 0;
  }
  if (typeof rawTolerance === "number") {
    return Math.max(0, rawTolerance);
  }
  if (!isPlainObject(rawTolerance)) {
    return 0;
  }
  const type = String(rawTolerance.type || "absolute").trim();
  const amount = Number(
    rawTolerance.value ?? rawTolerance.amount ?? rawTolerance.absolute ?? rawTolerance.percent ?? 0
  );
  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }
  if (type === "percent") {
    return Math.abs(expectedValue) * amount / 100;
  }
  if (type === "relative") {
    return Math.abs(expectedValue) * amount;
  }
  return amount;
}

function gradeResult(
  definition,
  normalizedAnswer,
  mode,
  status,
  score,
  fraction,
  correct,
  requiresManualReview,
  validation,
  details = {}
) {
  return {
    blockId: String(definition?.id || ""),
    type: String(definition?.type || ""),
    mode,
    status,
    score,
    maxScore: positiveScore(definition?.maxScore),
    fraction,
    correct,
    requiresManualReview,
    normalizedAnswer,
    validation,
    details
  };
}

function positiveScore(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function numericFraction(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? clampFraction(number) : fallback;
}

function clampFraction(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

function roundScore(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10000) / 10000;
}

module.exports = {
  autoGrade,
  gradeSubmission,
  resolveGradingMode,
  canonicalText,
  normalizeUnit,
  resolveTolerance,
  roundScore
};
