const pm01Exam = require("../data/exams/pm01");
const { nowIso } = require("./utils");

function clone(value) {
  return global.structuredClone
    ? global.structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function roundScore(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizeNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  return Number(String(value || "").replace(",", ".").trim());
}

function getPm01Exam() {
  return clone(pm01Exam);
}

function getPm01PublicData(exam = pm01Exam) {
  return {
    id: exam.id,
    slug: exam.slug,
    title: exam.title,
    subtitle: exam.subtitle,
    programTitle: exam.programTitle,
    description: exam.description,
    profession: exam.profession,
    developer: exam.developer,
    interdisciplinaryCourses: exam.interdisciplinaryCourses || [],
    methodicalBasis: exam.methodicalBasis || [],
    durationMinutes: exam.durationMinutes,
    scoring: exam.scoring,
    participantFields: exam.participantFields,
    modules: exam.modules,
    formulas: exam.formulas,
    assetRegistry: exam.assetRegistry || {},
    variants: exam.variants.map((variant) => ({
      id: variant.id,
      number: variant.number,
      title: variant.title,
      shortTitle: variant.shortTitle,
      icon: variant.icon,
      accent: variant.accent,
      image: variant.image,
      scenario: variant.scenario,
      competencies: variant.competencies
    }))
  };
}

function getPm01Variant(variantId, exam = pm01Exam) {
  return (
    exam.variants.find((variant) => variant.id === variantId) ||
    exam.variants[0]
  );
}

function validatePm01Question(question) {
  if (!question || !question.id || !question.type || !question.prompt) {
    throw new Error("Некорректная структура задания ПМ.01.");
  }

  if (["single_choice", "multiple_choice"].includes(question.type)) {
    const options = Array.isArray(question.options) ? question.options : [];
    const correctCount = options.filter((option) => option.isCorrect).length;
    if (options.length < 2 || correctCount < 1) {
      throw new Error(`Задание ${question.id} имеет некорректные варианты ответа.`);
    }
  }

  if (question.type === "calculation_task") {
    const fields = Array.isArray(question.fields) ? question.fields : [];
    if (!fields.length || fields.some((field) => !field.id || !field.label)) {
      throw new Error(`Расчетное задание ${question.id} имеет некорректные поля.`);
    }
  }

  if (question.type === "hotspot_scene") {
    const hotspots = Array.isArray(question.hotspots) ? question.hotspots : [];
    if (!question.image || !hotspots.length) {
      throw new Error(`Симуляция ${question.id} не содержит изображение или зоны.`);
    }
  }
}

function addRuntimeQuestionMeta(question, module, sequenceInModule, globalIndex, variant) {
  const prepared = clone(question);
  const variantCompetencies = Array.isArray(variant.competencies) ? variant.competencies : [];
  const questionTags = Array.isArray(prepared.competencyTags) ? prepared.competencyTags : [];
  prepared.sourceId = question.id;
  prepared.id = `${question.id}__${globalIndex + 1}`;
  prepared.moduleId = module.id;
  prepared.moduleCode = module.code;
  prepared.moduleTitle = module.title;
  prepared.moduleOrder = module.order;
  prepared.tourId = module.id;
  prepared.tourCode = module.code;
  prepared.tourTitle = module.title;
  prepared.tourOrder = module.order;
  prepared.sequenceInModule = sequenceInModule;
  prepared.sequenceInTour = sequenceInModule;
  prepared.globalIndex = globalIndex + 1;
  prepared.variantId = variant.id;
  prepared.variantTitle = variant.title;
  prepared.competencyTags = Array.from(new Set([...variantCompetencies, ...questionTags]));
  return prepared;
}

function buildSituationQuestion(variant) {
  return {
    id: `${variant.id}-situation`,
    type: "situation",
    prompt: variant.scenario,
    maxScore: 0,
    image: variant.image,
    competencies: variant.competencies,
    variantTitle: variant.title
  };
}

function moduleQuestionsForVariant(variant, moduleId) {
  if (moduleId === "situation") {
    return [buildSituationQuestion(variant)];
  }
  if (moduleId === "test") {
    return variant.test || [];
  }
  if (moduleId === "calculation") {
    return variant.calculation || [];
  }
  if (moduleId === "voice") {
    return [variant.voice].filter(Boolean);
  }
  if (moduleId === "simulation") {
    return variant.simulation || [];
  }
  return [];
}

function buildPm01Variant(exam, variantId) {
  const variant = getPm01Variant(variantId, exam);
  const flatQuestions = [];
  let globalIndex = 0;

  const modules = (exam.modules || []).map((module) => {
    const startIndex = globalIndex;
    const questions = moduleQuestionsForVariant(variant, module.id).map((question, index) => {
      const prepared = addRuntimeQuestionMeta(
        question,
        module,
        index + 1,
        globalIndex,
        variant
      );
      validatePm01Question(prepared);
      flatQuestions.push(prepared);
      globalIndex += 1;
      return prepared;
    });

    return {
      id: module.id,
      code: module.code,
      order: module.order,
      title: module.title,
      maxScore: module.maxScore,
      questionCount: questions.length,
      stepStart: startIndex,
      stepEnd: globalIndex - 1
    };
  });

  return {
    schemaVersion: exam.schemaVersion,
    generatedAt: nowIso(),
    totalMaxScore: exam.scoring.totalMaxScore,
    variantId: variant.id,
    variantNumber: variant.number,
    variantTitle: variant.title,
    variantShortTitle: variant.shortTitle,
    variantAccent: variant.accent,
    variantImage: variant.image,
    scenario: variant.scenario,
    competencies: variant.competencies,
    modules,
    tours: modules,
    questions: flatQuestions,
    issuedQuestionIds: flatQuestions.map((question) => question.sourceId)
  };
}

function getPm01CurrentQuestion(attempt) {
  if (!attempt.variant || !Array.isArray(attempt.variant.questions)) {
    return null;
  }
  return attempt.variant.questions[attempt.currentStepIndex] || null;
}

function getPm01ModuleById(variant, moduleId) {
  return (variant.modules || variant.tours || []).find((module) => module.id === moduleId) || null;
}

function getPm01CurrentModule(attempt) {
  const question = getPm01CurrentQuestion(attempt);
  if (!question || !attempt.variant) {
    return null;
  }
  return getPm01ModuleById(attempt.variant, question.moduleId || question.tourId);
}

function sanitizePm01Question(question, attempt, options = {}) {
  if (!question) {
    return null;
  }

  const includePrivate = Boolean(options.includePrivate);
  const answer = attempt.answers && attempt.answers[question.id];
  const base = {
    id: question.id,
    sourceId: question.sourceId,
    type: question.type,
    prompt: question.prompt,
    note: question.note || "",
    maxScore: question.maxScore,
    moduleId: question.moduleId,
    moduleCode: question.moduleCode,
    moduleTitle: question.moduleTitle,
    moduleOrder: question.moduleOrder,
    tourId: question.tourId,
    tourCode: question.tourCode,
    tourTitle: question.tourTitle,
    tourOrder: question.tourOrder,
    sequenceInModule: question.sequenceInModule,
    sequenceInTour: question.sequenceInTour,
    globalIndex: question.globalIndex,
    variantId: question.variantId,
    variantTitle: question.variantTitle,
    image: question.image || "",
    visualMode: question.visualMode || "",
    interactionHint: question.interactionHint || "",
    rubric: question.rubric || [],
    maxDurationSeconds: question.maxDurationSeconds || null,
    hotspotTargetCount: Array.isArray(question.hotspots) ? question.hotspots.length : 0,
    competencies: question.competencies || [],
    competencyTags: question.competencyTags || [],
    savedAnswer: answer ? answer.answerPayload : null,
    review: answer ? answer.manualReview || null : null
  };

  if (includePrivate) {
    base.explanation = question.explanation || "";
    base.formulas = question.formulas || [];
    base.solutionSteps = question.solutionSteps || [];
    base.answerPlan = question.answerPlan || [];
    base.exemplar = question.exemplar || "";
    base.correctAnswer = formatPm01CorrectAnswer(question);
    base.hotspots = Array.isArray(question.hotspots)
      ? question.hotspots.map((hotspot) => ({ ...hotspot }))
      : [];
  } else if (question.type === "calculation_task") {
    base.formulas = question.formulas || [];
  }

  if (Array.isArray(question.options)) {
    base.options = question.options.map((option) => ({
      id: option.id,
      text: option.text
    }));
  }

  if (Array.isArray(question.items)) {
    base.items = question.items.map((item) => ({
      id: item.id,
      text: item.text,
      image: item.image || "",
      visualTitle: item.visualTitle || "",
      detail: item.detail || ""
    }));
  }

  if (Array.isArray(question.slots)) {
    base.slots = question.slots.map((slot) => ({
      id: slot.id,
      label: slot.label
    }));
  }

  if (Array.isArray(question.buckets)) {
    base.buckets = question.buckets.map((bucket) => ({
      id: bucket.id,
      label: bucket.label,
      image: bucket.image || "",
      visualTitle: bucket.visualTitle || "",
      detail: bucket.detail || ""
    }));
  }

  if (Array.isArray(question.fields)) {
    base.fields = question.fields.map((field) => ({
      id: field.id,
      label: field.label,
      unit: field.unit,
      tolerance: field.tolerance
    }));
  }

  return base;
}

function ratioScore(correctCount, totalCount, maxScore) {
  if (!totalCount) {
    return 0;
  }
  return roundScore(maxScore * (correctCount / totalCount));
}

function scoreSingleChoice(question, answerPayload) {
  const correct = (question.options || []).find((option) => option.isCorrect);
  const isCorrect = Boolean(correct && answerPayload?.selectedOptionId === correct.id);
  return {
    autoScore: isCorrect ? question.maxScore : 0,
    finalScore: isCorrect ? question.maxScore : 0,
    penalty: 0,
    details: { isCorrect }
  };
}

function scoreMultipleChoice(question, answerPayload) {
  const selected = new Set(
    Array.isArray(answerPayload?.selectedOptionIds) ? answerPayload.selectedOptionIds : []
  );
  const correctIds = (question.options || [])
    .filter((option) => option.isCorrect)
    .map((option) => option.id);
  const correct = new Set(correctIds);
  const correctSelected = [...selected].filter((id) => correct.has(id)).length;
  const incorrectSelected = [...selected].filter((id) => !correct.has(id)).length;
  const raw = Math.max(0, correctSelected - incorrectSelected);
  const score = ratioScore(raw, correctIds.length, question.maxScore);
  return {
    autoScore: score,
    finalScore: score,
    penalty: incorrectSelected,
    details: { correctSelected, incorrectSelected, required: correctIds.length }
  };
}

function scoreSequence(question, answerPayload) {
  const answer = Array.isArray(answerPayload?.sequence) ? answerPayload.sequence : [];
  const expected = Array.isArray(question.correctSequence) ? question.correctSequence : [];
  const correctPositions = expected.reduce(
    (count, itemId, index) => count + (answer[index] === itemId ? 1 : 0),
    0
  );
  const score = ratioScore(correctPositions, expected.length, question.maxScore);
  return {
    autoScore: score,
    finalScore: score,
    penalty: 0,
    details: { correctPositions, required: expected.length }
  };
}

function scoreBucketSort(question, answerPayload) {
  const expected = question.correctBuckets || {};
  const received = answerPayload?.buckets || {};
  const itemIds = Object.keys(expected);
  const correctItems = itemIds.reduce(
    (count, itemId) => count + (received[itemId] === expected[itemId] ? 1 : 0),
    0
  );
  const score = ratioScore(correctItems, itemIds.length, question.maxScore);
  return {
    autoScore: score,
    finalScore: score,
    penalty: 0,
    details: { correctItems, required: itemIds.length }
  };
}

function scoreCalculation(question, answerPayload) {
  const values = answerPayload?.values || {};
  const fields = Array.isArray(question.fields) ? question.fields : [];
  const perFieldScore = fields.length ? question.maxScore / fields.length : 0;
  let correctFields = 0;
  const fieldResults = fields.map((field) => {
    const received = normalizeNumber(values[field.id]);
    const expected = Number(field.expected);
    const tolerance = Number(field.tolerance ?? 0.01);
    const isCorrect =
      Number.isFinite(received) &&
      Number.isFinite(expected) &&
      Math.abs(received - expected) <= tolerance;
    if (isCorrect) {
      correctFields += 1;
    }
    return {
      id: field.id,
      received: Number.isFinite(received) ? received : null,
      expected,
      tolerance,
      isCorrect
    };
  });
  const score = roundScore(correctFields * perFieldScore);
  return {
    autoScore: score,
    finalScore: score,
    penalty: 0,
    details: { correctFields, required: fields.length, fields: fieldResults }
  };
}

function distancePercent(left, right) {
  const dx = Number(left.x) - Number(right.x);
  const dy = Number(left.y) - Number(right.y);
  return Math.sqrt(dx * dx + dy * dy);
}

function scoreHotspotScene(question, answerPayload) {
  const points = Array.isArray(answerPayload?.points) ? answerPayload.points : [];
  const hotspots = Array.isArray(question.hotspots) ? question.hotspots : [];
  const matchedHotspots = new Set();
  let falsePositives = 0;

  points.forEach((point) => {
    const match = hotspots.find(
      (hotspot) =>
        !matchedHotspots.has(hotspot.id) &&
        distancePercent(point, hotspot) <= Number(hotspot.radius || 6)
    );
    if (match) {
      matchedHotspots.add(match.id);
    } else {
      falsePositives += 1;
    }
  });

  const unit = hotspots.length ? question.maxScore / hotspots.length : 0;
  const score = roundScore(Math.max(0, matchedHotspots.size * unit - falsePositives * unit * 0.5));
  return {
    autoScore: score,
    finalScore: score,
    penalty: falsePositives,
    details: {
      found: matchedHotspots.size,
      missed: hotspots.length - matchedHotspots.size,
      falsePositives,
      matchedIds: [...matchedHotspots]
    }
  };
}

function scoreVoiceResponse(question, answerPayload, existingAnswer = null) {
  const review = existingAnswer?.manualReview || null;
  const reviewedScore = review ? Number(review.totalScore || 0) : 0;
  return {
    autoScore: 0,
    finalScore: reviewedScore,
    penalty: 0,
    manualStatus: review ? "reviewed" : "pending_review",
    details: {
      hasAudio: Boolean(answerPayload?.audioDataUrl || answerPayload?.audioName),
      durationMs: Number(answerPayload?.durationMs || 0)
    }
  };
}

function scorePm01Question(question, answerPayload, existingAnswer = null) {
  if (!question) {
    return { autoScore: 0, finalScore: 0, penalty: 0 };
  }

  switch (question.type) {
    case "situation":
      return { autoScore: 0, finalScore: 0, penalty: 0, details: {} };
    case "single_choice":
      return scoreSingleChoice(question, answerPayload);
    case "multiple_choice":
      return scoreMultipleChoice(question, answerPayload);
    case "sequence_drag":
      return scoreSequence(question, answerPayload);
    case "bucket_sort":
      return scoreBucketSort(question, answerPayload);
    case "calculation_task":
      return scoreCalculation(question, answerPayload);
    case "voice_response":
      return scoreVoiceResponse(question, answerPayload, existingAnswer);
    case "hotspot_scene":
      return scoreHotspotScene(question, answerPayload);
    default:
      return { autoScore: 0, finalScore: 0, penalty: 0, details: {} };
  }
}

function gradeByScore(score, exam = pm01Exam) {
  const row = (exam.scoring.gradeScale || []).find((item) => score >= item.min);
  return row || { grade: "2", label: "неудовлетворительно" };
}

function summarizePm01Attempt(exam, attempt) {
  const variant = attempt.variant || { modules: [], questions: [] };
  const answers = attempt.answers || {};
  let totalFinalScore = 0;
  let totalAutoScore = 0;
  let pendingManualReviews = 0;

  const moduleScores = (variant.modules || variant.tours || []).map((module) => {
    const moduleQuestions = (variant.questions || []).filter(
      (question) => (question.moduleId || question.tourId) === module.id
    );
    let finalScore = 0;
    let autoScore = 0;
    let answered = 0;
    let pending = 0;

    moduleQuestions.forEach((question) => {
      const answer = answers[question.id];
      if (!answer) {
        return;
      }
      answered += 1;
      finalScore += Number(answer.finalScore || 0);
      autoScore += Number(answer.autoScore || 0);
      if (answer.manualStatus === "pending_review") {
        pending += 1;
      }
    });

    totalFinalScore += finalScore;
    totalAutoScore += autoScore;
    pendingManualReviews += pending;

    return {
      moduleId: module.id,
      code: module.code,
      title: module.title,
      finalScore: roundScore(finalScore),
      autoScore: roundScore(autoScore),
      maxScore: module.maxScore,
      answered,
      questionCount: moduleQuestions.length,
      pendingManualReviews: pending
    };
  });

  const grade = gradeByScore(totalFinalScore, exam);
  const finishedAt = attempt.finishedAt ? new Date(attempt.finishedAt).getTime() : Date.now();
  const startedAt = attempt.startedAt ? new Date(attempt.startedAt).getTime() : finishedAt;

  return {
    totalFinalScore: roundScore(totalFinalScore),
    totalAutoScore: roundScore(totalAutoScore),
    totalMaxScore: exam.scoring.totalMaxScore,
    pendingManualReviews,
    grade: grade.grade,
    gradeLabel: grade.label,
    moduleScores,
    totalDurationMs: Math.max(0, finishedAt - startedAt)
  };
}

function buildPm01Progress(attempt) {
  const totalQuestions = attempt.variant?.questions?.length || 0;
  const currentQuestion = getPm01CurrentQuestion(attempt);
  const currentModule = getPm01CurrentModule(attempt);
  const moduleQuestions = currentModule
    ? (attempt.variant.questions || []).filter((question) => question.moduleId === currentModule.id)
    : [];
  const currentInModule = currentQuestion
    ? moduleQuestions.findIndex((question) => question.id === currentQuestion.id) + 1
    : moduleQuestions.length;

  return {
    currentQuestionIndex: currentQuestion ? currentQuestion.globalIndex : totalQuestions,
    totalQuestions,
    moduleQuestionIndex: currentInModule,
    moduleQuestionCount: moduleQuestions.length
  };
}

function buildPm01Timing(attempt) {
  const expiresAt = attempt?.expiresAt ? new Date(attempt.expiresAt).getTime() : 0;
  const remainingMs = expiresAt ? Math.max(0, expiresAt - Date.now()) : 0;
  return {
    totalRemainingMs: remainingMs,
    moduleRemainingMs: remainingMs
  };
}

function buildPm01AttemptView(exam, attempt, options = {}) {
  const summary = summarizePm01Attempt(exam, attempt);
  const currentQuestion = getPm01CurrentQuestion(attempt);
  const currentModule = getPm01CurrentModule(attempt);
  const modules = attempt.variant?.modules || attempt.variant?.tours || [];
  const includePrivate = Boolean(options.includePrivate);

  return {
    id: attempt.id,
    olympiadId: attempt.olympiadId,
    participant: attempt.participant,
    selectedVariantId: attempt.selectedVariantId,
    mode: attempt.mode || "exam",
    status: attempt.status,
    startedAt: attempt.startedAt,
    finishedAt: attempt.finishedAt,
    expiresAt: attempt.expiresAt,
    currentStepIndex: attempt.currentStepIndex,
    progress: buildPm01Progress(attempt),
    timing: buildPm01Timing(attempt),
    selectedVariant: {
      id: attempt.variant.variantId,
      number: attempt.variant.variantNumber,
      title: attempt.variant.variantTitle,
      shortTitle: attempt.variant.variantShortTitle,
      accent: attempt.variant.variantAccent,
      image: attempt.variant.variantImage,
      scenario: attempt.variant.scenario,
      competencies: attempt.variant.competencies
    },
    currentModule,
    currentQuestion: sanitizePm01Question(currentQuestion, attempt, { includePrivate }),
    lastFeedback:
      attempt.mode === "training" && attempt.lastFeedback
        ? attempt.lastFeedback
        : null,
    summary: options.hideScores
      ? {
          ...summary,
          totalFinalScore: null,
          moduleScores: summary.moduleScores.map((module) => ({
            ...module,
            finalScore: null,
            autoScore: null
          }))
        }
      : summary,
    route: {
      modules,
      questions: (attempt.variant.questions || []).map((question) =>
        sanitizePm01Question(question, attempt, { includePrivate })
      )
    }
  };
}

function hasPendingPm01Review(attempt) {
  return Object.values(attempt.answers || {}).some(
    (answer) => answer.manualStatus === "pending_review"
  );
}

function finalizePm01Attempt(exam, attempt, reason = "finished") {
  attempt.finishedAt = attempt.finishedAt || nowIso();
  attempt.status = hasPendingPm01Review(attempt)
    ? "pending_review"
    : reason === "expired"
      ? "expired"
      : "reviewed";
  attempt.finalSummary = summarizePm01Attempt(exam, attempt);
  attempt.totalFinalScore = attempt.finalSummary.totalFinalScore;
  return attempt;
}

function applyPm01VoiceReview(exam, attempt, questionId, reviewPayload) {
  const question = (attempt.variant?.questions || []).find((item) => item.id === questionId);
  if (!question || question.type !== "voice_response") {
    throw new Error("Голосовой ответ не найден.");
  }

  const answer = attempt.answers?.[questionId];
  if (!answer) {
    throw new Error("Студент еще не отправил голосовой ответ.");
  }

  const rubric = Array.isArray(question.rubric) ? question.rubric : [];
  const scores = {};
  let totalScore = 0;
  rubric.forEach((criterion) => {
    const value = Math.max(
      0,
      Math.min(Number(criterion.maxScore || 5), Number(reviewPayload.scores?.[criterion.id] || 0))
    );
    scores[criterion.id] = value;
    totalScore += value;
  });

  answer.manualReview = {
    reviewedAt: nowIso(),
    scores,
    totalScore,
    comment: String(reviewPayload.comment || "").trim()
  };
  answer.manualStatus = "reviewed";
  answer.finalScore = totalScore;
  answer.autoScore = 0;
  attempt._lastChangedQuestionId = questionId;

  if (attempt.status === "pending_review" && !hasPendingPm01Review(attempt)) {
    attempt.status = "reviewed";
    attempt.finishedAt = attempt.finishedAt || nowIso();
  }

  attempt.finalSummary = summarizePm01Attempt(exam, attempt);
  attempt.totalFinalScore = attempt.finalSummary.totalFinalScore;
  return attempt;
}

function formatPm01CorrectAnswer(question) {
  if (!question) {
    return "";
  }
  if (question.type === "single_choice" || question.type === "multiple_choice") {
    return (question.options || [])
      .filter((option) => option.isCorrect)
      .map((option) => option.text)
      .join(", ");
  }
  if (question.type === "sequence_drag") {
    return (question.correctSequence || [])
      .map((itemId, index) => {
        const item = (question.items || []).find((entry) => entry.id === itemId);
        return `${index + 1}. ${item ? item.text : itemId}`;
      })
      .join("\n");
  }
  if (question.type === "bucket_sort") {
    return (question.buckets || [])
      .map((bucket) => {
        const items = (question.items || [])
          .filter((item) => question.correctBuckets?.[item.id] === bucket.id)
          .map((item) => item.text);
        return `${bucket.label}: ${items.join(", ")}`;
      })
      .join("\n");
  }
  if (question.type === "calculation_task") {
    return (question.fields || [])
      .map((field) => `${field.label}: ${field.expected} ${field.unit || ""}`.trim())
      .join("; ");
  }
  if (question.type === "hotspot_scene") {
    return (question.hotspots || []).map((hotspot) => hotspot.label).join(", ");
  }
  if (question.type === "voice_response") {
    return (question.answerPlan || []).join("; ");
  }
  return "";
}

module.exports = {
  getPm01Exam,
  getPm01PublicData,
  getPm01Variant,
  buildPm01Variant,
  getPm01CurrentQuestion,
  getPm01CurrentModule,
  sanitizePm01Question,
  scorePm01Question,
  summarizePm01Attempt,
  buildPm01AttemptView,
  finalizePm01Attempt,
  applyPm01VoiceReview,
  hasPendingPm01Review,
  formatPm01CorrectAnswer
};
