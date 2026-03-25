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
  const selected = Object.entries(buckets)
    .filter(([, bucketId]) => bucketId === "selected")
    .map(([itemId]) => itemId);

  const correctSelected = selected.filter((itemId) =>
    correctIngredientIds.includes(itemId)
  ).length;
  const extraSelected = selected.filter(
    (itemId) => !correctIngredientIds.includes(itemId)
  ).length;
  const score = Math.max(0, correctSelected - extraSelected);

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
    default:
      return {
        autoScore: 0,
        finalScore: 0,
        penalty: 0
      };
  }
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
  summarizeAttempt,
  diplomaByScore,
  compareAttemptsByRank
};
