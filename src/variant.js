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
  if (question.type === "final_kitchen") {
    const dishIds = makeIdentifierMap(question.dishes, "d", `${scope}:dishes`);
    question.dishes = question.dishes.map((dish, index) => {
      const ids = makeIdentifierMap(dish.items, "i", `${scope}:dish:${index}:items`);
      return { ...dish, id: dishIds.get(dish.id),
        items: dish.items.map((item) => ({ ...item, id: ids.get(item.id) })),
        correctIngredientIds: dish.correctIngredientIds.map((id) => requireMappedIdentifier(ids, id, question, "correctIngredientIds")) };
    });
  }
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
  if (prepared.type === "final_kitchen") {
    prepared.dishes = shuffleArray(prepared.dishes, random).map((dish) => ({
      ...dish, items: shuffleArray(dish.items, random)
    }));
  }

  if (Array.isArray(prepared.options)) {
    prepared.options = shuffleArray(prepared.options, random);
  }

  if (Array.isArray(prepared.items)) {
    prepared.items = shuffleArray(prepared.items, random);
  }

  if (prepared.interactionMode === "country_match") {
    prepared.buckets = shuffleArray(prepared.buckets, random);
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
  if (question.imageUrl) {
    if (!isLocalOlympiadAsset(question.imageUrl)) {
      throw new Error(`Вопрос ${question.sourceId || question.id} содержит внешний или небезопасный путь изображения.`);
    }
    if (!String(question.imageAlt || "").trim()) {
      throw new Error(`Вопрос ${question.sourceId || question.id} содержит изображение без alt-текста.`);
    }
    if (assetPathRevealsAnswer(question.imageUrl)) {
      throw new Error(`Вопрос ${question.sourceId || question.id} содержит имя файла, раскрывающее ключ ответа.`);
    }
  }
  for (const item of [...(question.items || []), ...(question.interactionMode === "guest_order" ? question.options || [] : [])]) {
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

  if (question.type === "final_kitchen") {
    const expectedDishCounts = [3, 2, 2];
    if (question.maxScore !== 16 || ![1, 2].includes(question.presentationVersion) ||
        !question.station?.title?.trim() || !expectedDishCounts[question.station.number - 1] ||
        question.dishes?.length !== expectedDishCounts[question.station.number - 1] ||
        new Set(question.dishes.map((dish) => dish.id)).size !== question.dishes.length) {
      throw new Error("Нарушен контракт станции финальной кухни.");
    }
    const presets = new Set(["pizza", "burger", "wrap", "bowl", "boat", "roll"]);
    for (const dish of question.dishes) {
      const ids = new Set((dish.items || []).map((item) => item.id));
      const neutralMedia = (url) => /^\/assets\/olympiad\/tour5\/t5-v1-[a-f0-9]{12}\.webp$/.test(url || "");
      const requiredSurfaces = dish.modelPreset === "roll" ? ["rice", "nori", "salmon"] :
        ["burger", "wrap"].includes(dish.modelPreset) ? ["bread"] : [];
      if (question.presentationVersion === 2 && (!dish.surfaceTextures || Object.keys(dish.surfaceTextures).some(key =>
        !requiredSurfaces.includes(key) || !/^\/assets\/olympiad\/tour5\/materials\/t5-v2-[a-f0-9]{12}\.webp$/.test(dish.surfaceTextures[key])) ||
        requiredSurfaces.some(key => !dish.surfaceTextures[key]))) {
        throw new Error("Некорректный материал 3D-поверхности.");
      }
      if (!dish.title?.trim() || !dish.cuisineLabel?.trim() || !dish.variantLabel?.trim() ||
          !presets.has(dish.modelPreset) || !neutralMedia(dish.previewUrl) || !dish.previewAlt?.trim() ||
          (dish.baseImageUrl && !neutralMedia(dish.baseImageUrl)) || dish.items?.length !== 8 || ids.size !== 8 ||
          dish.correctIngredientIds?.length !== 4 || new Set(dish.correctIngredientIds).size !== 4 ||
          !dish.correctIngredientIds.every((id) => ids.has(id)) || dish.items.some((item) =>
            !item.text?.trim() || !item.imageAlt?.trim() || !neutralMedia(item.imageUrl) || !neutralMedia(item.layerImageUrl) ||
            !item.scene || !["level", "width", "aspect", "x", "z", "angle"].every((key) => Number.isFinite(item.scene[key])) ||
            item.scene.width <= 0 || item.scene.aspect <= 0 ||
            (question.presentationVersion === 2 && !require("./final-kitchen-presentation").FORMS.has(item.scene.form)) ||
            (item.scene.parts && (!Array.isArray(item.scene.parts) || item.scene.parts.length !== 2 ||
              item.scene.parts.some(part => !["level", "width", "aspect", "x", "z", "angle"].every(key => Number.isFinite(part[key])) ||
                part.width <= 0 || part.aspect <= 0 || !Array.isArray(part.crop) || part.crop.length !== 2 ||
                !part.crop.every(Number.isFinite) || part.crop[0] < 0 || part.crop[1] <= 0 || part.crop[0] + part.crop[1] > 1))))) {
        throw new Error(`Нарушен контракт блюда финальной кухни: ${dish.id}.`);
      }
    }
    return;
  }

  if (question.type === "dish_detective") {
    const policy = question.answerPolicy;
    if (question.maxScore !== 3 || question.clues?.length !== 3 ||
        !question.clues.every((clue) => typeof clue.label === "string" && clue.label.trim() &&
          typeof clue.text === "string" && clue.text.trim()) ||
        !/^\/assets\/olympiad\/tour3\/t3-case-\d{2}\.webp$/.test(question.imageUrl || "") ||
        typeof policy?.canonical !== "string" || !policy.canonical.trim() ||
        !["aliases", "english", "misspellings", "rejected"].every((key) =>
          Array.isArray(policy[key]) && policy[key].every((value) => typeof value === "string" && value.trim()))) {
      throw new Error(`Вопрос ${question.sourceId || question.id} нарушает контракт кулинарного детектива.`);
    }
    return;
  }

  if (question.type === "single_choice") {
    const options = Array.isArray(question.options) ? question.options : [];
    const correctCount = options.filter((option) => option.isCorrect).length;
    if (options.length < 2 || correctCount !== 1) {
      throw new Error(`Вопрос ${question.sourceId || question.id} имеет некорректные варианты ответа.`);
    }
    if (question.interactionMode === "guest_order" && (options.length !== 4 || question.maxScore !== 4 ||
        question.presentationVersion !== 1 || !question.guestOrder?.text || !question.guestOrder?.style ||
        new Set(options.map((option) => option.id)).size !== 4 ||
        options.some((option) => !option.text?.trim() || !option.description?.trim() ||
          !/^\/assets\/olympiad\/tour4\/t4-menu-v1-[a-f0-9]{12}\.webp$/.test(option.imageUrl)))) {
      throw new Error(`Вопрос ${question.sourceId || question.id} нарушает контракт заказа гостя.`);
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
    if (question.interactionMode === "country_match") {
      if (items.length !== 4 || buckets.length !== 4 || question.maxScore !== 4 ||
          itemIds.size !== 4 || bucketIds.size !== 4 || new Set(Object.values(correctBuckets)).size !== 4 ||
          new Set(question.dishIds || []).size !== 4 ||
          items.some((item) => !/^\/assets\/olympiad\/tour2\/t2-active-\d{2}\.webp$/.test(item.imageUrl)) ||
          buckets.some((bucket) => !/^\/assets\/olympiad\/flags\/[a-z]{2}\.svg$/.test(bucket.flagUrl))) {
        throw new Error(`Вопрос ${question.sourceId || question.id} нарушает контракт T2: четыре уникальные пары, фото и флаги.`);
      }
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
  if (tour.generation.mode === "fixed_photo_questions") {
    const questions = olympiad.questionBank.tour1Pools.flatMap((pool) => pool.active === true ? pool.questions : []);
    if (questions.length !== 10 || questions.some((question, index) =>
      question.id !== `T1-A${String(index + 1).padStart(2, "0")}` ||
      question.type !== "single_choice" || question.maxScore !== 2 ||
      question.options?.length !== 4 || question.options.filter((option) => option.isCorrect).length !== 1 ||
      question.imageUrl !== `/assets/olympiad/tour1/t1-active-${String(index + 1).padStart(2, "0")}.webp` ||
      question.imageAlt !== `Фотография блюда к вопросу ${index + 1}`
    )) {
      throw new Error("T1 должен содержать 10 фиксированных безопасных фото-вопросов по 2 балла.");
    }
    // Preserve the historical PRNG offset before T2: 10 pools of four + tour shuffle.
    // Only T1 content/order changes; the following tour builders stay untouched.
    for (let draw = 0; draw < 39; draw += 1) random();
    return { tour, questions };
  }
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
  if (tour.generation.mode === "fixed_country_matches") {
    const blocks = olympiad.questionBank.tour2Blocks;
    if (blocks.length !== 5 || blocks.some((block, index) =>
      block.id !== `T2-${String(index + 1).padStart(2, "0")}` || block.interactionMode !== "country_match") ||
      new Set(blocks.flatMap((block) => block.dishIds || [])).size !== 20) {
      throw new Error("T2 требует 5 фиксированных заданий и 20 уникальных блюд.");
    }
    blocks.forEach((block) => (block.dishIds || []).forEach((dishId) => usedDishIds.add(dishId)));
    return { tour, questions: blocks };
  }
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
  if (tour.generation.mode === "fixed_detective_questions") {
    const questions = olympiad.questionBank.tour3Matrices;
    const reserved = new Set(["margherita", "burger", "shawarma", "doner", "greek_salad", "caesar", "adjarian_khachapuri", "philadelphia_roll"]);
    const tour1DishIds = new Set((olympiad.questionBank.tour1Pools || []).flatMap((pool) => pool.questions || []).map((question) => question.dishId));
    if (questions.length !== 10 || tour.generation.selectCount !== 10 ||
        new Set(questions.map((question) => question.dishId)).size !== 10 ||
        questions.some((question) => usedDishIds.has(question.dishId) || tour1DishIds.has(question.dishId) || reserved.has(question.dishId))) {
      throw new Error("Тур 3 должен содержать десять фиксированных неповторяющихся досье.");
    }
    questions.forEach((question) => usedDishIds.add(question.dishId));
    return { tour, questions };
  }
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
  if (tour.generation.mode === "fixed_guest_orders") {
    const bank = olympiad.questionBank.tour4Tasks;
    const menuIds = bank.flatMap((question) => (question.options || []).map((option) => option.menuDishId));
    if (bank.length !== 8 || tour.generation.selectCount !== 8 || new Set(menuIds).size !== 32 ||
        menuIds.some((id) => !id || usedDishIds.has(id)) || bank.some((question, index) =>
          question.id !== `T4-${String(index + 1).padStart(2, "0")}` || question.type !== "single_choice" ||
          question.interactionMode !== "guest_order" || question.guestOrder?.number !== index + 1)) {
      throw new Error("Тур 4 должен содержать восемь фиксированных заказов и 32 неповторяющиеся позиции меню.");
    }
    menuIds.forEach((id) => usedDishIds.add(id));
    return { tour, questions: bank };
  }
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
  if (tour.generation.mode === "final_kitchen_stations") {
    const stations = olympiad.questionBank.tour5Stations;
    if (stations?.length !== 3 || tour.maxScore !== 48 || tour.timeLimitMinutes !== 15 ||
        stations.some((station, index) => station.station.number !== index + 1)) {
      throw new Error("Финальная кухня требует три станции, 48 баллов и 15 минут.");
    }
    stations.forEach((station) => {
      validateQuestionStructure(station);
      station.dishes.forEach((dish) => {
        if (usedDishIds.has(dish.dishId)) throw new Error("Блюдо финальной кухни повторено в другом туре.");
        usedDishIds.add(dish.dishId);
      });
    });
    return { tour, questions: clone(stations) };
  }
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

  if (question.type === "final_kitchen") {
    const dish = question.dishes.find((entry) => entry.id === attempt.stationSelections?.[question.id]?.dishId);
    const preview = (entry) => ({ id: entry.id, title: entry.title, cuisineLabel: entry.cuisineLabel,
      previewUrl: entry.previewUrl, previewAlt: entry.previewAlt });
    return { id: question.id, type: question.type, presentationVersion: question.presentationVersion,
      prompt: question.prompt, maxScore: question.maxScore, tourId: question.tourId, tourCode: question.tourCode,
      tourTitle: question.tourTitle, tourOrder: question.tourOrder, sequenceInTour: question.sequenceInTour,
      globalIndex: question.globalIndex, station: { number: question.station.number, title: question.station.title },
      dishes: dish ? [] : question.dishes.map(preview),
      selectedDish: dish ? { ...preview(dish), variantLabel: dish.variantLabel, modelPreset: dish.modelPreset,
        presentationVersion: question.presentationVersion,
        ...(question.presentationVersion === 2 ? { surfaceTextures: Object.fromEntries(["rice", "nori", "salmon", "bread"]
          .filter(key => dish.surfaceTextures[key]).map(key => [key, dish.surfaceTextures[key]])) } : {}),
        baseImageUrl: dish.baseImageUrl || "", items: dish.items.map((item) => ({ id: item.id, text: item.text,
          imageAlt: item.imageAlt, imageUrl: item.imageUrl, layerImageUrl: item.layerImageUrl,
          scene: { ...Object.fromEntries(["level", "width", "aspect", "x", "z", "angle"].map((key) => [key, item.scene[key]])),
            ...(question.presentationVersion === 2 ? { form: item.scene.form } : {}),
            ...(item.scene.parts ? { parts: item.scene.parts.map(part => ({
              ...Object.fromEntries(["level", "width", "aspect", "x", "z", "angle"].map(key => [key, part[key]])),
              crop: [...part.crop]
            })) } : {}) } })) } : null,
      savedAnswer: answer ? answer.answerPayload : null };
  }

  return {
    id: question.id,
    type: question.type,
    ...(["country_match", "guest_order"].includes(question.interactionMode) ? { interactionMode: question.interactionMode } : {}),
    ...(question.interactionMode === "guest_order" ? {
      presentationVersion: question.presentationVersion,
      guestOrder: { number: question.guestOrder.number, style: question.guestOrder.style, text: question.guestOrder.text }
    } : {}),
    prompt: question.prompt,
    ...(question.type === "dish_detective" ? {
      clues: question.clues.map(({ label, text }) => ({ label, text }))
    } : {}),
    ...(question.imageUrl ? { imageUrl: question.imageUrl, imageAlt: question.imageAlt } : {}),
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
          text: option.text,
          ...(question.interactionMode === "guest_order" ? {
            description: option.description, imageUrl: option.imageUrl, imageAlt: option.imageAlt
          } : {})
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
          label: bucket.label,
          ...(question.interactionMode === "country_match" ? { flagUrl: bucket.flagUrl } : {})
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
