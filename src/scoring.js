function ratioScore(correctCount, totalCount, maxScore) {
  if (!totalCount) {
    return 0;
  }
  return Math.round((maxScore * (correctCount / totalCount)) * 100) / 100;
}

function scoreSingleChoice(question, answerPayload) {
  const correct = (question.options || []).find((option) => option.isCorrect);
  const isCorrect =
    correct &&
    answerPayload &&
    answerPayload.selectedOptionId === correct.id;

  return {
    autoScore: isCorrect ? question.maxScore : 0,
    finalScore: isCorrect ? question.maxScore : 0,
    penalty: 0
  };
}

function scoreSequence(question, answerPayload) {
  const answer = Array.isArray(answerPayload && answerPayload.sequence)
    ? answerPayload.sequence
    : [];
  const expected = Array.isArray(question.correctSequence)
    ? question.correctSequence
    : [];
  const correctPositions = expected.reduce((count, itemId, index) => {
    return count + (answer[index] === itemId ? 1 : 0);
  }, 0);
  const score = ratioScore(correctPositions, expected.length, question.maxScore);

  return {
    autoScore: score,
    finalScore: score,
    penalty: 0
  };
}

function scoreBucketSort(question, answerPayload) {
  const expected = question.correctBuckets || {};
  const received = answerPayload && answerPayload.buckets ? answerPayload.buckets : {};
  const itemIds = Object.keys(expected);
  const correctItems = itemIds.reduce((count, itemId) => {
    return count + (received[itemId] === expected[itemId] ? 1 : 0);
  }, 0);
  const score = ratioScore(correctItems, itemIds.length, question.maxScore);

  return {
    autoScore: score,
    finalScore: score,
    penalty: 0
  };
}

function scoreIngredientMatrix(question, answerPayload) {
  const correctIngredientIds = Array.isArray(question.correctIngredientIds)
    ? question.correctIngredientIds
    : [];
  const buckets = answerPayload && answerPayload.buckets ? answerPayload.buckets : {};
  const selectedBucketId = String(question.selectedBucketId || "selected");
  const selected = Object.entries(buckets)
    .filter(([, bucketId]) => String(bucketId) === selectedBucketId)
    .map(([itemId]) => itemId);

  const correctSelected = selected.filter((itemId) =>
    correctIngredientIds.includes(itemId)
  ).length;
  const extraSelected = selected.filter(
    (itemId) => !correctIngredientIds.includes(itemId)
  ).length;
  const netCorrect = Math.max(0, correctSelected - extraSelected);
  const score = ratioScore(netCorrect, correctIngredientIds.length, question.maxScore);

  return {
    autoScore: score,
    finalScore: score,
    penalty: extraSelected
  };
}

function scoreDishAssembly(question, answerPayload) {
  const correctIngredientIds = Array.isArray(question.correctIngredientIds)
    ? question.correctIngredientIds
    : [];
  const selectedIngredientIds = Array.isArray(answerPayload && answerPayload.selectedIngredientIds)
    ? [...new Set(answerPayload.selectedIngredientIds.map(String))]
    : [];
  const correctSelected = selectedIngredientIds.filter((itemId) =>
    correctIngredientIds.includes(itemId)
  ).length;
  const extraSelected = selectedIngredientIds.filter(
    (itemId) => !correctIngredientIds.includes(itemId)
  ).length;
  const netCorrect = Math.max(0, correctSelected - extraSelected);
  const score = ratioScore(netCorrect, correctIngredientIds.length, question.maxScore);

  return {
    autoScore: score,
    finalScore: score,
    penalty: extraSelected
  };
}

function scoreQuestion(question, answerPayload) {
  if (!question) {
    return { autoScore: 0, finalScore: 0, penalty: 0 };
  }

  switch (question.type) {
    case "single_choice":
      return scoreSingleChoice(question, answerPayload);
    case "sequence_drag":
      return scoreSequence(question, answerPayload);
    case "bucket_sort":
      return scoreBucketSort(question, answerPayload);
    case "ingredient_matrix":
      return scoreIngredientMatrix(question, answerPayload);
    case "dish_assembly":
      return scoreDishAssembly(question, answerPayload);
    default:
      return {
        autoScore: 0,
        finalScore: 0,
        penalty: 0
      };
  }
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(value, allowedKeys) {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function validateAnswerPayload(question, answerPayload) {
  const payload = answerPayload === null || answerPayload === undefined ? {} : answerPayload;
  if (!isPlainObject(payload)) return false;
  const itemIds = new Set((question.items || []).map((item) => String(item.id)));

  if (question.type === "single_choice") {
    if (!hasOnlyKeys(payload, ["selectedOptionId"])) return false;
    const selected = payload.selectedOptionId;
    const optionIds = new Set((question.options || []).map((option) => String(option.id)));
    return selected === null || selected === undefined || selected === "" || optionIds.has(String(selected));
  }

  if (question.type === "sequence_drag") {
    if (!hasOnlyKeys(payload, ["sequence"])) return false;
    if (payload.sequence !== undefined && !Array.isArray(payload.sequence)) return false;
    const sequence = Array.isArray(payload.sequence) ? payload.sequence : [];
    const values = sequence.filter(Boolean).map(String);
    return (
      values.length <= itemIds.size &&
      values.every((itemId) => itemIds.has(itemId)) &&
      new Set(values).size === values.length
    );
  }

  if (question.type === "bucket_sort" || question.type === "ingredient_matrix") {
    if (!hasOnlyKeys(payload, ["buckets"])) return false;
    if (payload.buckets !== undefined && !isPlainObject(payload.buckets)) return false;
    const buckets = payload.buckets || {};
    const bucketIds = new Set((question.buckets || []).map((bucket) => String(bucket.id)));
    const entries = Object.entries(buckets);
    return (
      entries.length <= itemIds.size &&
      entries.every(
        ([itemId, bucketId]) => itemIds.has(String(itemId)) && bucketIds.has(String(bucketId))
      )
    );
  }

  if (question.type === "dish_assembly") {
    if (!hasOnlyKeys(payload, ["selectedIngredientIds"])) return false;
    if (
      payload.selectedIngredientIds !== undefined &&
      !Array.isArray(payload.selectedIngredientIds)
    ) {
      return false;
    }
    const selected = Array.isArray(payload.selectedIngredientIds)
      ? payload.selectedIngredientIds.map(String)
      : [];
    return (
      selected.length <= itemIds.size &&
      selected.every((itemId) => itemIds.has(itemId)) &&
      new Set(selected).size === selected.length
    );
  }

  return false;
}

function summarizeAttempt(olympiad, attempt) {
  const answers = attempt.answers || {};
  const variant = attempt.variant || { tours: [], questions: [] };

  let totalFinalScore = 0;
  let totalPenalty = 0;

  const tourScores = (variant.tours || []).map((tour) => {
    const tourQuestions = (variant.questions || []).filter(
      (question) => question.tourId === tour.id
    );

    let tourScore = 0;
    let tourPenalty = 0;

    tourQuestions.forEach((question) => {
      const answer = answers[question.id];
      if (!answer) {
        return;
      }

      tourScore += Number(answer.finalScore || 0);
      tourPenalty += Number(answer.penalty || 0);
    });

    totalFinalScore += tourScore;
    totalPenalty += tourPenalty;

    return {
      tourId: tour.id,
      code: tour.code,
      title: tour.title,
      finalScore: tourScore,
      maxScore: tour.maxScore,
      penalty: tourPenalty
    };
  });

  const byId = Object.fromEntries(tourScores.map((tour) => [tour.tourId, tour]));
  const finishedAt = attempt.finishedAt
    ? new Date(attempt.finishedAt).getTime()
    : Date.now();
  const startedAt = attempt.startedAt
    ? new Date(attempt.startedAt).getTime()
    : finishedAt;

  return {
    totalFinalScore,
    totalPenalty,
    totalDurationMs: Math.max(0, finishedAt - startedAt),
    totalMaxScore: olympiad.scoring ? olympiad.scoring.totalMaxScore : 0,
    tourScores,
    tieBreak: {
      tour5: byId["tour-5"] ? byId["tour-5"].finalScore : 0,
      tour4PlusTour3:
        (byId["tour-4"] ? byId["tour-4"].finalScore : 0) +
        (byId["tour-3"] ? byId["tour-3"].finalScore : 0),
      tour3Penalty: byId["tour-3"] ? byId["tour-3"].penalty : 0,
      totalDurationMs: Math.max(0, finishedAt - startedAt)
    }
  };
}

function diplomaByScore(score) {
  if (score >= 130) {
    return "Диплом I степени";
  }
  if (score >= 110) {
    return "Диплом II степени";
  }
  if (score >= 90) {
    return "Диплом III степени";
  }
  return "Сертификат участника";
}

function compareAttemptsByRank(left, right) {
  const leftSummary = left.summary;
  const rightSummary = right.summary;

  return (
    rightSummary.totalFinalScore - leftSummary.totalFinalScore ||
    rightSummary.tieBreak.tour5 - leftSummary.tieBreak.tour5 ||
    rightSummary.tieBreak.tour4PlusTour3 - leftSummary.tieBreak.tour4PlusTour3 ||
    leftSummary.tieBreak.tour3Penalty - rightSummary.tieBreak.tour3Penalty ||
    leftSummary.tieBreak.totalDurationMs - rightSummary.tieBreak.totalDurationMs
  );
}

module.exports = {
  scoreQuestion,
  validateAnswerPayload,
  summarizeAttempt,
  diplomaByScore,
  compareAttemptsByRank
};
