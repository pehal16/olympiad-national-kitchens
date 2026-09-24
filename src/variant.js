const { shuffleArray, unique, nowIso } = require("./utils");

function clone(value) {
  return global.structuredClone
    ? global.structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function createSeededRandom(seedValue) {
  const seedText = String(seedValue || "olympiad-variant");
  let hash = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    hash ^= seedText.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function numericHash(value, offset) {
  const text = `${offset}:${String(value || "")}`;
  let hash = (2166136261 ^ offset) >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function opaqueToken(scope, index) {
  const input = `${scope}:${index}`;
  return `${String(numericHash(input, 0x13579bdf)).padStart(10, "0")}${String(
    numericHash(input, 0x2468ace0)
  ).padStart(10, "0")}`;
}

function makeIdentifierMap(entries, prefix, scope) {
  const mapping = new Map();
  const generatedIds = new Set();
  (entries || []).forEach((entry, index) => {
    const originalId = String(entry && entry.id !== undefined ? entry.id : "").trim();
    if (!originalId || mapping.has(originalId)) {
      throw new Error("Вопрос содержит пустые или повторяющиеся идентификаторы элементов.");
    }
    const opaqueId = `${prefix}_${opaqueToken(scope, index)}`;
    if (generatedIds.has(opaqueId)) {
      throw new Error("Не удалось создать уникальные публичные идентификаторы вопроса.");
    }
    generatedIds.add(opaqueId);
    mapping.set(originalId, opaqueId);
  });
  return mapping;
}

function requireMappedIdentifier(mapping, value, question, fieldName) {
  const mapped = mapping.get(String(value));
  if (!mapped) {
    throw new Error(
      `Вопрос ${question.sourceId || question.id} содержит неизвестный идентификатор в ${fieldName}.`
    );
  }
  return mapped;
}

function remapQuestionIdentifiers(question, scope) {
  const optionIds = makeIdentifierMap(question.options, "o", `${scope}:options`);
  const itemIds = makeIdentifierMap(question.items, "i", `${scope}:items`);
  const bucketIds = makeIdentifierMap(question.buckets, "b", `${scope}:buckets`);
  const slotIds = makeIdentifierMap(question.slots, "s", `${scope}:slots`);

  if (Array.isArray(question.options)) {
    question.options = question.options.map((option) => ({
      ...option,
      id: optionIds.get(String(option.id))
    }));
  }

  if (Array.isArray(question.items)) {
    question.items = question.items.map((item) => ({
      ...item,
      id: itemIds.get(String(item.id))
    }));
  }

  if (Array.isArray(question.buckets)) {
    question.buckets = question.buckets.map((bucket) => ({
      ...bucket,
      id: bucketIds.get(String(bucket.id))
    }));
  }

  if (Array.isArray(question.slots)) {
    question.slots = question.slots.map((slot) => ({
      ...slot,
      id: slotIds.get(String(slot.id))
    }));
  }

  if (Array.isArray(question.correctSequence)) {
    question.correctSequence = question.correctSequence.map((itemId) =>
      requireMappedIdentifier(itemIds, itemId, question, "correctSequence")
    );
  }

  if (question.correctBuckets && typeof question.correctBuckets === "object") {
    question.correctBuckets = Object.fromEntries(
      Object.entries(question.correctBuckets).map(([itemId, bucketId]) => [
        requireMappedIdentifier(itemIds, itemId, question, "correctBuckets"),
        requireMappedIdentifier(bucketIds, bucketId, question, "correctBuckets")
      ])
    );
  }

  if (Array.isArray(question.correctIngredientIds)) {
    question.correctIngredientIds = question.correctIngredientIds.map((itemId) =>
      requireMappedIdentifier(itemIds, itemId, question, "correctIngredientIds")
    );
  }

  if (question.type === "ingredient_matrix") {
    question.selectedBucketId = requireMappedIdentifier(
      bucketIds,
      question.selectedBucketId || "selected",
      question,
      "selectedBucketId"
    );
  }

  return question;
}

function shuffleQuestion(question, random) {
  const prepared = clone(question);

  if (Array.isArray(prepared.options)) {
    prepared.options = shuffleArray(prepared.options, random);
  }

  if (Array.isArray(prepared.items)) {
    prepared.items = shuffleArray(prepared.items, random);
  }

  return prepared;
}

const RECIPE_SCOPES = new Set([
  "international_classic",
  "regional_variant",
  "russian_foodservice_variant"
]);

function isLocalOlympiadAsset(value) {
  const assetPath = String(value || "").trim();
  return (
    !assetPath ||
    (assetPath.startsWith("/assets/olympiad/") &&
      !assetPath.includes("..") &&
      !assetPath.startsWith("//"))
  );
}

const ASSET_ANSWER_HINTS = [
  "answer",
  "bad",
  "correct",
  "distractor",
  "good",
  "ignored",
  "incorrect",
  "required",
  "selected",
  "wrong"
];

function assetPathRevealsAnswer(value) {
  const rawPath = String(value || "").trim().toLowerCase();
  let assetPath = rawPath;
  try {
    assetPath = decodeURIComponent(rawPath);
  } catch {
    assetPath = rawPath;
  }
  if (!assetPath) return false;
  const tokens = assetPath.split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.some((token) => ASSET_ANSWER_HINTS.includes(token));
}

function validateQuestionMedia(question) {
  for (const item of question.items || []) {
    if (!isLocalOlympiadAsset(item.imageUrl) || !isLocalOlympiadAsset(item.layerImageUrl)) {
      throw new Error(`Вопрос ${question.sourceId || question.id} содержит внешний или небезопасный путь изображения.`);
    }
    if (item.imageUrl && !String(item.imageAlt || "").trim()) {
      throw new Error(`Вопрос ${question.sourceId || question.id} содержит изображение без alt-текста.`);
    }
    if (assetPathRevealsAnswer(item.imageUrl) || assetPathRevealsAnswer(item.layerImageUrl)) {
      throw new Error(`Вопрос ${question.sourceId || question.id} содержит имя файла, раскрывающее ключ ответа.`);
    }
  }

  const dishVisual = question.dishVisual || {};
  if (!isLocalOlympiadAsset(dishVisual.baseImageUrl)) {
    throw new Error(`Вопрос ${question.sourceId || question.id} содержит внешний или небезопасный фон блюда.`);
  }
  if (dishVisual.baseImageUrl && !String(dishVisual.baseImageAlt || "").trim()) {
    throw new Error(`Вопрос ${question.sourceId || question.id} содержит фон блюда без alt-текста.`);
  }
  if (assetPathRevealsAnswer(dishVisual.baseImageUrl)) {
    throw new Error(`Вопрос ${question.sourceId || question.id} содержит имя файла, раскрывающее ключ ответа.`);
  }

  if (dishVisual.renderMode) {
    const supportedKinds = new Set([
      "pizza_dough", "tomato_sauce", "mozzarella", "basil", "olive_oil",
      "fresh_tomato", "parmesan", "oregano", "romaine", "grilled_chicken",
      "croutons", "cherry_tomato", "caesar_dressing", "cucumber", "boiled_egg"
    ]);
    const complete3dCoverage =
      dishVisual.renderMode === "procedural_3d_v1" &&
      ["pizza", "salad"].includes(dishVisual.modelPreset) &&
      (question.items || []).every((item) => supportedKinds.has(item.model3d?.kind));
    if (!complete3dCoverage) {
      throw new Error(`Вопрос ${question.sourceId || question.id} имеет неполную или неподдерживаемую 3D-модель.`);
    }
  }
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

function addQuestionRuntimeMeta(question, tour, sequenceInTour, globalIndex, random, variantSeed) {
  const prepared = shuffleQuestion(question, random);
  prepared.sourceId = question.id;
  const questionScope = `${variantSeed}:question:${globalIndex + 1}`;
  prepared.id = `q_${opaqueToken(questionScope, 0)}`;
  prepared.tourId = tour.id;
  prepared.tourCode = tour.code;
  prepared.tourTitle = tour.title;
  prepared.tourOrder = tour.order;
  prepared.sequenceInTour = sequenceInTour;
  prepared.globalIndex = globalIndex + 1;
  return remapQuestionIdentifiers(prepared, questionScope);
}

function validateQuestionStructure(question) {
  if (!question || !question.id || !question.prompt || !question.type) {
    throw new Error("Некорректная структура вопроса в банке олимпиады.");
  }

  validateQuestionMedia(question);

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

    const itemIds = new Set(items.map((item) => item.id));
    if (
      !items.length ||
      !slots.length ||
      !correctSequence.length ||
      slots.length !== correctSequence.length ||
      !correctSequence.every((itemId) => itemIds.has(itemId)) ||
      new Set(correctSequence).size !== correctSequence.length
    ) {
      throw new Error(`Вопрос ${question.sourceId || question.id} имеет некорректную последовательность.`);
    }
    return;
  }

  if (question.type === "bucket_sort") {
    const items = Array.isArray(question.items) ? question.items : [];
    const buckets = Array.isArray(question.buckets) ? question.buckets : [];
    const correctBuckets = question.correctBuckets || {};
    const itemIds = new Set(items.map((item) => item.id));
    const bucketIds = new Set(buckets.map((bucket) => bucket.id));

    if (!items.length || !buckets.length) {
      throw new Error(`Вопрос ${question.sourceId || question.id} имеет пустые зоны сортировки.`);
    }

    const mappedEntries = Object.entries(correctBuckets);
    const hasExactMapping =
      mappedEntries.length === items.length &&
      mappedEntries.every(
        ([itemId, bucketId]) => itemIds.has(itemId) && bucketIds.has(bucketId)
      ) &&
      items.every((item) => Object.prototype.hasOwnProperty.call(correctBuckets, item.id));
    if (!hasExactMapping) {
      throw new Error(`Вопрос ${question.sourceId || question.id} имеет неполную карту распределения.`);
    }
    return;
  }

  if (question.type === "ingredient_matrix") {
    const items = Array.isArray(question.items) ? question.items : [];
    const buckets = Array.isArray(question.buckets) ? question.buckets : [];
    const selectedBucketId = question.selectedBucketId || "selected";
    const correctIngredientIds = Array.isArray(question.correctIngredientIds)
      ? question.correctIngredientIds
      : [];

    if (
      !items.length ||
      buckets.length !== 2 ||
      !correctIngredientIds.length ||
      !buckets.some((bucket) => bucket.id === selectedBucketId) ||
      !correctIngredientIds.every((itemId) => items.some((item) => item.id === itemId)) ||
      new Set(correctIngredientIds).size !== correctIngredientIds.length
    ) {
      throw new Error(`Вопрос ${question.sourceId || question.id} имеет некорректную матрицу ингредиентов.`);
    }
    return;
  }

  if (question.type === "dish_assembly") {
    const items = Array.isArray(question.items) ? question.items : [];
    const correctIngredientIds = Array.isArray(question.correctIngredientIds)
      ? question.correctIngredientIds
      : [];
    const itemIds = new Set(items.map((item) => item.id));

    const layerPresence = new Set(items.map((item) => Boolean(String(item.layerImageUrl || "").trim())));

    if (
      !items.length ||
      !correctIngredientIds.length ||
      !correctIngredientIds.every((itemId) => itemIds.has(itemId)) ||
      new Set(correctIngredientIds).size !== correctIngredientIds.length ||
      !RECIPE_SCOPES.has(question.recipeScope) ||
      !String(question.dishVisual?.variantLabel || "").trim() ||
      layerPresence.size > 1
    ) {
      throw new Error(`Вопрос ${question.sourceId || question.id} имеет некорректную визуальную сборку блюда.`);
    }
    return;
  }

  throw new Error(`Вопрос ${question.sourceId || question.id} имеет неподдерживаемый тип ${question.type}.`);
}

function pickOne(items, random) {
  const list = shuffleArray(items, random);
  return list[0] || null;
}

function pickMany(items, count, predicate = () => true, random = Math.random) {
  const selected = [];
  shuffleArray(items, random).forEach((item) => {
    if (selected.length >= count) {
      return;
    }
    if (predicate(item, selected)) {
      selected.push(item);
    }
  });
  return selected;
}

function pickByDistinctKey(items, count, keyGetter, random) {
  const shuffled = shuffleArray(items, random);
  const buckets = new Map();

  shuffled.forEach((item) => {
    const key = keyGetter(item);
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key).push(item);
  });

  const selected = [];
  shuffleArray([...buckets.keys()], random).forEach((key) => {
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

function chooseMostBalancedBlocks(blocks, count, random) {
  if (count !== 2 || blocks.length <= 2) {
    return pickMany(blocks, count, () => true, random);
  }

  const anchor = shuffleArray(blocks, random)[0];
  let bestScore = -1;
  let bestPartners = [];

  for (const candidate of blocks) {
    if (candidate === anchor) {
      continue;
    }
    const score = unique([
      ...(anchor.cuisines || []),
      ...(candidate.cuisines || [])
    ]).length;

    if (score > bestScore) {
      bestScore = score;
      bestPartners = [candidate];
    } else if (score === bestScore) {
      bestPartners.push(candidate);
    }
  }

  const partner = pickOne(bestPartners, random);
  return partner ? shuffleArray([anchor, partner], random) : [anchor];
}

function buildTour1(olympiad, random) {
  const tour = olympiad.tours.find((item) => item.id === "tour-1");
  const questions = olympiad.questionBank.tour1Pools
    .map((pool) => pickOne(pool.questions, random))
    .filter(Boolean);

  return {
    tour,
    questions: shuffleArray(questions, random)
  };
}

function buildTour2(olympiad, usedDishIds, random) {
  const tour = olympiad.tours.find((item) => item.id === "tour-2");
  const blocks = chooseMostBalancedBlocks(
    olympiad.questionBank.tour2Blocks,
    tour.generation.selectCount,
    random
  );
  blocks.forEach((block) => {
    (block.dishIds || []).forEach((dishId) => usedDishIds.add(dishId));
  });

  return {
    tour,
    questions: shuffleArray(blocks, random)
  };
}

function buildTour3(olympiad, usedDishIds, random) {
  const tour = olympiad.tours.find((item) => item.id === "tour-3");
  const pool = olympiad.questionBank.tour3Matrices.filter(
    (item) => !usedDishIds.has(item.dishId)
  );

  const selected = pickByDistinctKey(pool, tour.generation.selectCount, (item) => item.cuisine, random)
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
    questions: shuffleArray(selected, random)
  };
}

function buildTour4(olympiad, usedDishIds, random) {
  const tour = olympiad.tours.find((item) => item.id === "tour-4");
  const pool = olympiad.questionBank.tour4Tasks.filter(
    (item) => !usedDishIds.has(item.dishId)
  );

  const selected = pickByDistinctKey(pool, tour.generation.selectCount, (item) => item.cuisine, random)
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
    questions: shuffleArray(selected, random)
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

function buildTour5(olympiad, usedDishIds, random) {
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
  }, random);

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

function buildVariant(olympiad, options = {}) {
  const seed = String(options.seed || `variant-${Date.now()}-${Math.random()}`);
  const random = createSeededRandom(seed);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const usedDishIds = new Set();

    const tour1 = buildTour1(olympiad, random);
    const tour2 = buildTour2(olympiad, usedDishIds, random);
    const tour3 = buildTour3(olympiad, usedDishIds, random);
    const tour4 = buildTour4(olympiad, usedDishIds, random);
    const tour5 = buildTour5(olympiad, usedDishIds, random);

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
          globalIndex,
          random,
          seed
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
      blueprintVersion: olympiad.blueprintVersion || olympiad.schemaVersion || 2,
      seed,
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
    caseTitle: question.caseTitle || null,
    caseOrder: question.caseOrder || null,
    caseTotal: question.caseTotal || null,
    dishLabel: question.dishLabel || "",
    cuisine: question.cuisine || "mixed",
    cuisineGroup: question.cuisineGroup || "general",
    recipeScope: question.recipeScope || "",
    metadata: null,
    options: Array.isArray(question.options)
      ? question.options.map((option) => ({
          id: option.id,
          text: option.text
        }))
      : [],
    items: Array.isArray(question.items)
      ? question.items.map((item) => ({
          id: item.id,
          text: item.text,
          imageUrl: item.imageUrl || "",
          imageAlt: item.imageAlt || item.text || "",
          layerImageUrl: item.layerImageUrl || "",
          model3d: item.model3d?.kind ? { kind: item.model3d.kind } : null
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
    selectedBucketId:
      question.type === "ingredient_matrix" ? question.selectedBucketId || "" : "",
    dishVisual: question.dishVisual
      ? {
          baseImageUrl: question.dishVisual.baseImageUrl || "",
          baseImageAlt: question.dishVisual.baseImageAlt || "",
          variantLabel: question.dishVisual.variantLabel || "",
          sourceNote: question.dishVisual.sourceNote || "",
          renderMode: question.dishVisual.renderMode || "",
          modelPreset: question.dishVisual.modelPreset || ""
        }
      : null,
    savedAnswer: answer ? answer.answerPayload : null
  };
}

module.exports = {
  buildVariant,
  createSeededRandom,
  getCurrentQuestion,
  getCurrentTour,
  getTourById,
  remapQuestionIdentifiers,
  sanitizeQuestion,
  validateQuestionStructure
};
