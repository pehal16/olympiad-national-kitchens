const { shuffleArray, unique, nowIso } = require("./utils");

function clone(value) {
  return global.structuredClone
    ? global.structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function shuffleQuestion(question) {
  const prepared = clone(question);

  if (Array.isArray(prepared.options)) {
    prepared.options = shuffleArray(prepared.options);
  }

  if (Array.isArray(prepared.items)) {
    prepared.items = shuffleArray(prepared.items);
  }

  return prepared;
}

function questionCuisineUnits(question) {
  if (Array.isArray(question.cuisines) && question.cuisines.length) {
    return question.cuisines;
  }

  if (question.caseId && question.cuisine) {
    return [question.cuisine];
  }

  if (question.cuisine && !["mixed", "general"].includes(question.cuisine)) {
    return [question.cuisine];
  }

  return [];
}

function addQuestionRuntimeMeta(question, tour, sequenceInTour, globalIndex) {
  const prepared = shuffleQuestion(question);
  prepared.sourceId = question.id;
  prepared.id = `${question.id}__${globalIndex + 1}`;
  prepared.tourId = tour.id;
  prepared.tourCode = tour.code;
  prepared.tourTitle = tour.title;
  prepared.tourOrder = tour.order;
  prepared.sequenceInTour = sequenceInTour;
  prepared.globalIndex = globalIndex + 1;
  return prepared;
}

function validateQuestionStructure(question) {
  if (!question || !question.id || !question.prompt || !question.type) {
    throw new Error("Некорректная структура вопроса в банке олимпиады.");
  }

  if (question.type === "single_choice") {
    const options = Array.isArray(question.options) ? question.options : [];
    const correctCount = options.filter((option) => option.isCorrect).length;
    if (options.length < 2 || correctCount !== 1) {
      throw new Error(`Вопрос ${question.sourceId || question.id} имеет некорректные варианты ответа.`);
    }
    return;
  }

  if (question.type === "sequence_drag") {
    const items = Array.isArray(question.items) ? question.items : [];
    const slots = Array.isArray(question.slots) ? question.slots : [];
    const correctSequence = Array.isArray(question.correctSequence)
      ? question.correctSequence
      : [];

    if (!items.length || !slots.length || !correctSequence.length || slots.length !== correctSequence.length) {
      throw new Error(`Вопрос ${question.sourceId || question.id} имеет некорректную последовательность.`);
    }
    return;
  }

  if (question.type === "bucket_sort") {
    const items = Array.isArray(question.items) ? question.items : [];
    const buckets = Array.isArray(question.buckets) ? question.buckets : [];
    const correctBuckets = question.correctBuckets || {};
    const bucketIds = new Set(buckets.map((bucket) => bucket.id));

    if (!items.length || !buckets.length) {
      throw new Error(`Вопрос ${question.sourceId || question.id} имеет пустые зоны сортировки.`);
    }

    const hasMappingForEveryItem = items.every(
      (item) => correctBuckets[item.id] && bucketIds.has(correctBuckets[item.id])
    );
    if (!hasMappingForEveryItem) {
      throw new Error(`Вопрос ${question.sourceId || question.id} имеет неполную карту распределения.`);
    }
    return;
  }

  if (question.type === "ingredient_matrix") {
    const items = Array.isArray(question.items) ? question.items : [];
    const buckets = Array.isArray(question.buckets) ? question.buckets : [];
    const correctIngredientIds = Array.isArray(question.correctIngredientIds)
      ? question.correctIngredientIds
      : [];

    if (
      !items.length ||
      !buckets.length ||
      !correctIngredientIds.length ||
      !buckets.some((bucket) => bucket.id === "selected")
    ) {
      throw new Error(`Вопрос ${question.sourceId || question.id} имеет некорректную матрицу ингредиентов.`);
    }
  }
}

function pickOne(items) {
  const list = shuffleArray(items);
  return list[0] || null;
}

function pickMany(items, count, predicate = () => true) {
  const selected = [];
  shuffleArray(items).forEach((item) => {
    if (selected.length >= count) {
      return;
    }
    if (predicate(item, selected)) {
      selected.push(item);
    }
  });
  return selected;
}

function pickByDistinctKey(items, count, keyGetter) {
  const shuffled = shuffleArray(items);
  const buckets = new Map();

  shuffled.forEach((item) => {
    const key = keyGetter(item);
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key).push(item);
  });

  const selected = [];
  shuffleArray([...buckets.keys()]).forEach((key) => {
    if (selected.length >= count) {
      return;
    }
    const variants = buckets.get(key) || [];
    if (variants.length) {
      selected.push(variants[0]);
    }
  });

  shuffled.forEach((item) => {
    if (selected.length >= count) {
      return;
    }
    if (!selected.includes(item)) {
      selected.push(item);
    }
  });

  return selected;
}

function chooseMostBalancedBlocks(blocks, count) {
  if (count !== 2 || blocks.length <= 2) {
    return pickMany(blocks, count);
  }

  let bestScore = -1;
  let bestPairs = [];

  for (let i = 0; i < blocks.length; i += 1) {
    for (let j = i + 1; j < blocks.length; j += 1) {
      const left = blocks[i];
      const right = blocks[j];
      const score = unique([...(left.cuisines || []), ...(right.cuisines || [])]).length;

      if (score > bestScore) {
        bestScore = score;
        bestPairs = [[left, right]];
      } else if (score === bestScore) {
        bestPairs.push([left, right]);
      }
    }
  }

  const pair = pickOne(bestPairs) || [];
  return shuffleArray(pair);
}

function buildTour1(olympiad) {
  const tour = olympiad.tours.find((item) => item.id === "tour-1");
  const questions = olympiad.questionBank.tour1Pools
    .map((pool) => pickOne(pool.questions))
    .filter(Boolean);

  return {
    tour,
    questions: shuffleArray(questions)
  };
}

function buildTour2(olympiad, usedDishIds) {
  const tour = olympiad.tours.find((item) => item.id === "tour-2");
  const blocks = chooseMostBalancedBlocks(
    olympiad.questionBank.tour2Blocks,
    tour.generation.selectCount
  );
  blocks.forEach((block) => {
    (block.dishIds || []).forEach((dishId) => usedDishIds.add(dishId));
  });

  return {
    tour,
    questions: shuffleArray(blocks)
  };
}

function buildTour3(olympiad, usedDishIds) {
  const tour = olympiad.tours.find((item) => item.id === "tour-3");
  const pool = olympiad.questionBank.tour3Matrices.filter(
    (item) => !usedDishIds.has(item.dishId)
  );

  const selected = pickByDistinctKey(pool, tour.generation.selectCount, (item) => item.cuisine)
    .filter((item, index, array) =>
      array.findIndex((existing) => existing.dishId === item.dishId) === index
    )
    .slice(0, tour.generation.selectCount);

  const cuisines = unique(selected.map((item) => item.cuisine));
  if (
    selected.length < tour.generation.selectCount ||
    cuisines.length < tour.generation.minimumCuisines
  ) {
    throw new Error("Недостаточно матриц ингредиентов для генерации тура 3.");
  }

  selected.forEach((item) => usedDishIds.add(item.dishId));

  return {
    tour,
    questions: shuffleArray(selected)
  };
}

function buildTour4(olympiad, usedDishIds) {
  const tour = olympiad.tours.find((item) => item.id === "tour-4");
  const pool = olympiad.questionBank.tour4Tasks.filter(
    (item) => !usedDishIds.has(item.dishId)
  );

  const selected = pickByDistinctKey(pool, tour.generation.selectCount, (item) => item.cuisine)
    .filter((item, index, array) =>
      array.findIndex((existing) => existing.dishId === item.dishId) === index
    )
    .slice(0, tour.generation.selectCount);

  if (selected.length < tour.generation.selectCount) {
    throw new Error("Недостаточно технологических задач для генерации тура 4.");
  }

  selected.forEach((item) => usedDishIds.add(item.dishId));

  return {
    tour,
    questions: shuffleArray(selected)
  };
}

function flattenCaseCluster(cluster) {
  return cluster.questions.map((question, index) => ({
    ...question,
    caseId: cluster.id,
    caseTitle: cluster.caseTitle,
    caseOrder: index + 1,
    caseTotal: cluster.questions.length
  }));
}

function buildTour5(olympiad, usedDishIds) {
  const tour = olympiad.tours.find((item) => item.id === "tour-5");
  const pool = olympiad.questionBank.tour5Cases.filter(
    (item) => !usedDishIds.has(item.dishId)
  );

  const selectedCases = pickMany(pool, tour.generation.selectCount, (item, current) => {
    if (current.some((existing) => existing.dishId === item.dishId)) {
      return false;
    }
    if (
      tour.generation.differentCuisineGroups &&
      current.some((existing) => existing.cuisineGroup === item.cuisineGroup)
    ) {
      return false;
    }
    return true;
  });

  if (selectedCases.length < tour.generation.selectCount) {
    throw new Error("Недостаточно кейсов для генерации тура 5.");
  }

  selectedCases.forEach((item) => usedDishIds.add(item.dishId));

  const questions = selectedCases.flatMap((cluster) => flattenCaseCluster(cluster));

  return {
    tour,
    selectedCases,
    questions
  };
}

function cuisineSpreadWithinLimit(flatQuestions) {
  const counts = {};
  let total = 0;

  flatQuestions.forEach((question) => {
    questionCuisineUnits(question).forEach((cuisine) => {
      counts[cuisine] = (counts[cuisine] || 0) + 1;
      total += 1;
    });
  });

  if (!total) {
    return true;
  }

  const maxAllowed = Math.floor(total * 0.4);
  return Object.values(counts).every((count) => count <= maxAllowed);
}

function buildVariant(olympiad) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const usedDishIds = new Set();

    const tour1 = buildTour1(olympiad);
    const tour2 = buildTour2(olympiad, usedDishIds);
    const tour3 = buildTour3(olympiad, usedDishIds);
    const tour4 = buildTour4(olympiad, usedDishIds);
    const tour5 = buildTour5(olympiad, usedDishIds);

    const generatedTours = [tour1, tour2, tour3, tour4, tour5];
    let globalIndex = 0;
    const flatQuestions = [];
    const tours = generatedTours.map((entry) => {
      const startIndex = globalIndex;
      const preparedQuestions = entry.questions.map((question, index) => {
        const enriched = addQuestionRuntimeMeta(
          question,
          entry.tour,
          index + 1,
          globalIndex
        );
        globalIndex += 1;
        flatQuestions.push(enriched);
        return enriched;
      });

      return {
        id: entry.tour.id,
        code: entry.tour.code,
        order: entry.tour.order,
        title: entry.tour.title,
        description: entry.tour.description,
        timeLimitMinutes: entry.tour.timeLimitMinutes,
        maxScore: entry.tour.maxScore,
        questionCount: preparedQuestions.length,
        stepStart: startIndex,
        stepEnd: globalIndex - 1
      };
    });

    flatQuestions.forEach(validateQuestionStructure);

    if (!cuisineSpreadWithinLimit(flatQuestions)) {
      continue;
    }

    return {
      schemaVersion: olympiad.schemaVersion || 2,
      generatedAt: nowIso(),
      totalMaxScore: olympiad.scoring.totalMaxScore,
      tours,
      questions: flatQuestions,
      issuedQuestionIds: flatQuestions.map((question) => question.sourceId),
      usedDishIds: [...usedDishIds],
      optionOrderLog: Object.fromEntries(
        flatQuestions
          .filter((question) => Array.isArray(question.options))
          .map((question) => [
            question.id,
            question.options.map((option) => option.id)
          ])
      )
    };
  }

  throw new Error("Не удалось собрать вариант олимпиады с заданными ограничениями.");
}

function getCurrentQuestion(attempt) {
  if (!attempt.variant || !Array.isArray(attempt.variant.questions)) {
    return null;
  }
  return attempt.variant.questions[attempt.currentStepIndex] || null;
}

function getTourById(variant, tourId) {
  return (variant.tours || []).find((tour) => tour.id === tourId) || null;
}

function getCurrentTour(attempt) {
  const question = getCurrentQuestion(attempt);
  if (!question || !attempt.variant) {
    return null;
  }
  return getTourById(attempt.variant, question.tourId);
}

function sanitizeQuestion(question, attempt) {
  if (!question) {
    return null;
  }

  const answer = attempt.answers && attempt.answers[question.id];

  return {
    id: question.id,
    sourceId: question.sourceId,
    type: question.type,
    prompt: question.prompt,
    scenario: question.scenario || "",
    note: question.note || "",
    maxScore: question.maxScore,
    tourId: question.tourId,
    tourCode: question.tourCode,
    tourTitle: question.tourTitle,
    tourOrder: question.tourOrder,
    sequenceInTour: question.sequenceInTour,
    globalIndex: question.globalIndex,
    caseId: question.caseId || null,
    caseTitle: question.caseTitle || null,
    caseOrder: question.caseOrder || null,
    caseTotal: question.caseTotal || null,
    options: Array.isArray(question.options)
      ? question.options.map((option) => ({
          id: option.id,
          text: option.text
        }))
      : [],
    items: Array.isArray(question.items)
      ? question.items.map((item) => ({
          id: item.id,
          text: item.text
        }))
      : [],
    slots: Array.isArray(question.slots)
      ? question.slots.map((slot) => ({
          id: slot.id,
          label: slot.label
        }))
      : [],
    buckets: Array.isArray(question.buckets)
      ? question.buckets.map((bucket) => ({
          id: bucket.id,
          label: bucket.label
        }))
      : [],
    savedAnswer: answer ? answer.answerPayload : null
  };
}

module.exports = {
  buildVariant,
  getCurrentQuestion,
  getCurrentTour,
  getTourById,
  sanitizeQuestion
};
