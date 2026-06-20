const pm01Exam = require("../data/exams/pm01");
const {
  pm01MaterialSources,
  pm01IntegrationPlan,
  pm01ComprehensiveTaskBank
} = require("../data/exams/pm01-materials");
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

function normalizeTicketId(ticketId) {
  return String(ticketId || "").trim();
}

function getPm01MaterialTicket(ticketId) {
  const normalizedId = normalizeTicketId(ticketId);
  if (!normalizedId) {
    return null;
  }
  return pm01ComprehensiveTaskBank.find((ticket) => ticket.id === normalizedId) || null;
}

function isPm01TicketCompatibleWithVariant(variantId, ticket) {
  if (!ticket) {
    return true;
  }
  const normalizedVariantId = String(variantId || "").trim();
  return Boolean(normalizedVariantId && ticket.family === normalizedVariantId);
}

function summarizePm01MaterialTicket(ticket, options = {}) {
  if (!ticket) {
    return null;
  }

  const includePrivate = Boolean(options.includePrivate);
  const recipe = ticket.recipe || {};
  const summary = {
    id: ticket.id,
    number: ticket.number,
    product: ticket.product,
    family: ticket.family,
    portions: ticket.portions,
    recipeNo: recipe.declaredNo || ticket.recipeNo || "",
    recipeStatus: recipe.status || ticket.recipeStatus || "",
    focus: ticket.focus || [],
    simulation: ticket.simulation || [],
    calculationPolicy:
      "Автопроверка расчета включается только после внесения точных норм сырья из сборника рецептур или технологической карты.",
    integration: ticket.integration || pm01IntegrationPlan
  };

  if (includePrivate) {
    summary.recipe = Object.keys(recipe).length ? recipe : ticket.recipe || null;
    summary.sources = ticket.sources || [];
  }

  return summary;
}

function getPm01MaterialBankPublicData() {
  return {
    sources: (pm01MaterialSources || []).map((source) => ({
      id: source.id,
      title: source.title,
      kind: source.kind,
      use: source.use
    })),
    integrationPlan: pm01IntegrationPlan,
    tickets: (pm01ComprehensiveTaskBank || []).map((ticket) =>
      summarizePm01MaterialTicket(ticket)
    )
  };
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
    visualAtlas: exam.visualAtlas || [],
    digitalShift: exam.digitalShift || null,
    materials: getPm01MaterialBankPublicData(),
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

function hashSeed(seed) {
  const text = String(seed || "pm01");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

function createSeededRandom(seed) {
  let state = hashSeed(seed);
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffledCopy(items, seed) {
  const result = Array.isArray(items) ? items.map((item) => clone(item)) : [];
  const random = createSeededRandom(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function sameOrder(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function rotateFirstToEnd(items) {
  if (!Array.isArray(items) || items.length < 2) {
    return items;
  }
  return [...items.slice(1), items[0]];
}

function shuffleQuestionPresentation(question, routeSeed) {
  const seed = `${routeSeed || "pm01"}:${question.sourceId || question.id}`;

  if (Array.isArray(question.options) && question.options.length > 2) {
    question.options = shuffledCopy(question.options, `${seed}:options`);
  }

  if (Array.isArray(question.items) && question.items.length > 1) {
    question.items = shuffledCopy(question.items, `${seed}:items`);
    if (question.type === "sequence_drag") {
      const itemOrder = question.items.map((item) => item.id);
      if (sameOrder(itemOrder, question.correctSequence)) {
        question.items = rotateFirstToEnd(question.items);
      }
    }
  }

  if (Array.isArray(question.buckets) && question.buckets.length > 1) {
    question.buckets = shuffledCopy(question.buckets, `${seed}:buckets`);
  }
}

function addRuntimeQuestionMeta(question, module, sequenceInModule, globalIndex, variant, routeSeed) {
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
  shuffleQuestionPresentation(prepared, routeSeed);
  return prepared;
}

function buildTicketPrompt(variant, ticket) {
  if (!ticket) {
    return variant.scenario;
  }
  return [
    variant.scenario,
    `Комплексное ситуационное задание № ${ticket.number}: ${ticket.product}.`,
    `По материалам задания студент выполняет устную защиту, расчет сырья на ${ticket.portions} порций и практическую работу.`
  ].join("\n");
}

function buildSituationQuestion(variant, ticket) {
  return {
    id: `${variant.id}-situation`,
    type: "situation",
    prompt: buildTicketPrompt(variant, ticket),
    maxScore: 0,
    image: variant.image,
    competencies: variant.competencies,
    variantTitle: variant.title,
    materialTicket: summarizePm01MaterialTicket(ticket)
  };
}

function buildTicketVoiceQuestion(baseQuestion, ticket) {
  if (!baseQuestion || !ticket) {
    return baseQuestion;
  }

  const question = clone(baseQuestion);
  const focus = Array.isArray(ticket.focus) ? ticket.focus : [];
  question.prompt = `Устная защита комплексного задания № ${ticket.number}: ${ticket.product}. Объясните технологический процесс, оборудование, требования безопасности, хранение и органолептическую оценку полуфабриката.`;
  question.note =
    "Отвечайте по билету из экзаменационных материалов. Нормы расчета сверяются по сборнику рецептур или технологической карте.";
  question.answerPlan = [
    `назвать полуфабрикат: ${ticket.product}`,
    `указать расчет на ${ticket.portions} порций`,
    "описать технологическую последовательность",
    "подобрать оборудование и инвентарь",
    "объяснить санитарные требования и безопасную работу",
    "назвать условия хранения",
    "дать органолептическую оценку качества",
    ...focus
  ];
  question.materialTicket = summarizePm01MaterialTicket(ticket, { includePrivate: true });
  return question;
}

function testChoiceFromSequence(question) {
  const firstStepId = Array.isArray(question.correctSequence)
    ? question.correctSequence[0]
    : "";
  return {
    ...clone(question),
    type: "single_choice",
    prompt: `${question.prompt} Выберите первый правильный шаг.`,
    note: "Выберите один подходящий вариант ответа.",
    options: (question.items || []).map((item) => ({
      id: item.id,
      text: item.text,
      isCorrect: item.id === firstStepId
    })),
    correctSequence: undefined,
    items: undefined,
    slots: undefined
  };
}

function testChoiceFromBucket(question) {
  const firstItem = (question.items || []).find((item) => question.correctBuckets?.[item.id]);
  const correctBucketId = firstItem ? question.correctBuckets[firstItem.id] : "";
  return {
    ...clone(question),
    type: "single_choice",
    prompt: firstItem
      ? `${question.prompt} Выберите правильную группу для позиции: ${firstItem.text}.`
      : question.prompt,
    note: "Выберите один подходящий вариант ответа.",
    options: (question.buckets || []).map((bucket) => ({
      id: bucket.id,
      text: bucket.label,
      isCorrect: bucket.id === correctBucketId
    })),
    correctBuckets: undefined,
    items: undefined,
    buckets: undefined,
    visualMode: "",
    interactionHint: ""
  };
}

function normalizeTestQuestion(question) {
  if (!question) {
    return question;
  }
  if (question.type === "sequence_drag") {
    return testChoiceFromSequence(question);
  }
  if (question.type === "bucket_sort") {
    return testChoiceFromBucket(question);
  }
  return question;
}

function moduleQuestionsForVariant(variant, moduleId, ticket = null) {
  if (moduleId === "situation") {
    return [buildSituationQuestion(variant, ticket)];
  }
  if (moduleId === "test") {
    return (variant.test || []).map(normalizeTestQuestion);
  }
  if (moduleId === "calculation") {
    return variant.calculation || [];
  }
  if (moduleId === "voice") {
    return [buildTicketVoiceQuestion(variant.voice, ticket)].filter(Boolean);
  }
  if (moduleId === "simulation") {
    return variant.simulation || [];
  }
  return [];
}

function pickQuestions(questions, count, seed) {
  return shuffledCopy(questions || [], seed).slice(0, count);
}

function buildMixedVoiceQuestion(exam, sourceVariants) {
  const complexVariant =
    sourceVariants.find((variant) => variant.id === "complex") ||
    sourceVariants[sourceVariants.length - 1] ||
    {};
  const baseVoice = clone(complexVariant.voice || {});
  return {
    ...baseVoice,
    id: "mixed-voice",
    prompt:
      "Объясните, как организовать безопасную подготовку полуфабрикатов при смешанном заказе: овощи, рыба, мясо, птица. Назовите раздельность рабочих мест, инвентарь, хранение, маркировку и контроль качества.",
    answerPlan: [
      "распределить сырье по овощному, рыбному, мясному участку и участку птицы",
      "назвать маркировку досок, ножей, тары и раздельность потоков",
      "объяснить входной контроль качества сырья",
      "указать последовательность обработки и подготовку полуфабрикатов",
      "подобрать безопасное оборудование и инвентарь",
      "назвать условия охлаждения, упаковки, маркировки и хранения",
      "объяснить санитарную обработку рабочего места после смены"
    ],
    exemplar: [
      exam.programTitle,
      "Оценивается связный ответ по всем участкам: овощи, рыба, мясо, птица, безопасность, хранение и маркировка."
    ].join("\n")
  };
}

function buildPm01MixedVariant(exam, seed) {
  const sourceVariants = exam.variants || [];
  const complexVariant =
    sourceVariants.find((variant) => variant.id === "complex") ||
    sourceVariants[sourceVariants.length - 1] ||
    sourceVariants[0] ||
    {};
  const nonComplexVariants = sourceVariants.filter((variant) => variant.id !== "complex");
  const calculationSources = shuffledCopy(nonComplexVariants, `${seed}:mixed:calculation-sources`).slice(0, 2);
  const complexCalculation =
    (complexVariant.calculation || []).find((question) => question.id === "complex-calc-net") ||
    (complexVariant.calculation || [])[0];
  const calculationQuestions = shuffledCopy([
    complexCalculation ? clone(complexCalculation) : null,
    ...calculationSources.flatMap((variant) =>
      pickQuestions(variant.calculation || [], 1, `${seed}:mixed:calculation:${variant.id}`)
    )
  ].filter(Boolean), `${seed}:mixed:calculation-order`);
  const testQuestions = shuffledCopy(
    sourceVariants.flatMap((variant) =>
      pickQuestions(variant.test || [], 2, `${seed}:mixed:test:${variant.id}`)
    ),
    `${seed}:mixed:test-order`
  );
  const simulationQuestions = shuffledCopy(
    sourceVariants
      .flatMap((variant) => pickQuestions(variant.simulation || [], 1, `${seed}:mixed:simulation:${variant.id}`))
      .slice(0, 5),
    `${seed}:mixed:simulation-order`
  );

  return {
    id: "mixed",
    number: 0,
    title: "Смешанный экзамен",
    shortTitle: "Все цехи",
    icon: "PM",
    accent: "#14513f",
    image: complexVariant.image || "/assets/pm01/complex-workshop.png",
    scenario:
      "Экзаменационная смена проходит как смешанный производственный маршрут. Студент получает задания по овощному, рыбному, мясному участку, участку птицы и комплексному заказу. Нужно отвечать по ситуации, выполнять расчеты, выбирать безопасные операции, находить нарушения и объяснять хранение полуфабрикатов.",
    competencies: Array.from(new Set(sourceVariants.flatMap((variant) => variant.competencies || []))),
    test: testQuestions,
    calculation: calculationQuestions,
    voice: buildMixedVoiceQuestion(exam, sourceVariants),
    simulation: simulationQuestions
  };
}

function buildPm01Variant(exam, variantId, options = {}) {
  const routeSeed = String(options.seed || `${variantId || "default"}:static`);
  const variant =
    variantId === "mixed"
      ? buildPm01MixedVariant(exam, routeSeed)
      : getPm01Variant(variantId, exam);
  const requestedTicket = getPm01MaterialTicket(options.ticketId);
  const materialTicket = variant.id !== "mixed" && isPm01TicketCompatibleWithVariant(variant.id, requestedTicket)
    ? requestedTicket
    : null;
  const flatQuestions = [];
  let globalIndex = 0;

  const modules = (exam.modules || []).map((module) => {
    const startIndex = globalIndex;
    const questions = moduleQuestionsForVariant(variant, module.id, materialTicket).map((question, index) => {
      const prepared = addRuntimeQuestionMeta(
        question,
        module,
        index + 1,
        globalIndex,
        variant,
        routeSeed
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

  if (options.includePractice && Array.isArray(variant.practiceOnly) && variant.practiceOnly.length) {
    const practiceModule = {
      id: "digital_shift",
      code: "PX",
      order: modules.length,
      title: "Цифровая смена",
      maxScore: 0,
      practiceOnly: true
    };
    const startIndex = globalIndex;
    const practiceQuestions = variant.practiceOnly.map((question, index) => {
      const prepared = addRuntimeQuestionMeta(
        {
          ...question,
          maxScore: 0,
          practiceOnly: true
        },
        practiceModule,
        index + 1,
        globalIndex,
        variant,
        routeSeed
      );
      validatePm01Question(prepared);
      flatQuestions.push(prepared);
      globalIndex += 1;
      return prepared;
    });
    modules.push({
      id: practiceModule.id,
      code: practiceModule.code,
      order: practiceModule.order,
      title: practiceModule.title,
      maxScore: 0,
      questionCount: practiceQuestions.length,
      stepStart: startIndex,
      stepEnd: globalIndex - 1,
      practiceOnly: true
    });
  }

  return {
    schemaVersion: exam.schemaVersion,
    generatedAt: nowIso(),
    routeSeed,
    totalMaxScore: exam.scoring.totalMaxScore,
    variantId: variant.id,
    variantNumber: variant.number,
    variantTitle: variant.title,
    variantShortTitle: variant.shortTitle,
    variantAccent: variant.accent,
    variantImage: variant.image,
    scenario: variant.scenario,
    competencies: variant.competencies,
    materialTicket: summarizePm01MaterialTicket(materialTicket, { includePrivate: true }),
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

function sanitizePm01SavedAnswer(question, answer) {
  if (!answer) {
    return null;
  }
  const payload = { ...(answer.answerPayload || {}) };
  if (question?.type === "voice_response" && payload.audioDataUrl) {
    payload.legacyAudioInline = true;
    delete payload.audioDataUrl;
  }
  return payload;
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
    practiceOnly: Boolean(question.practiceOnly),
    practiceFamily: question.practiceFamily || "",
    competencies: question.competencies || [],
    competencyTags: question.competencyTags || [],
    savedAnswer: sanitizePm01SavedAnswer(question, answer),
    review: answer ? answer.manualReview || null : null
  };

  if (question.materialTicket) {
    base.materialTicket = includePrivate
      ? summarizePm01MaterialTicket(question.materialTicket, { includePrivate: true })
      : summarizePm01MaterialTicket(question.materialTicket);
  }

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
      detail: item.detail || "",
      status: item.status || "",
      risk: item.risk || "",
      signals: Array.isArray(item.signals) ? [...item.signals] : []
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
  const hasAnswer = Boolean(
    answerPayload?.audioDataUrl ||
      answerPayload?.audioId ||
      answerPayload?.audioUrl ||
      answerPayload?.audioName ||
      String(answerPayload?.transcriptNote || "").trim()
  );
  if (!hasAnswer || answerPayload?.skipped) {
    return {
      autoScore: 0,
      finalScore: 0,
      penalty: 0,
      manualStatus: null,
      details: {
        hasAudio: false,
        durationMs: 0,
        skipped: Boolean(answerPayload?.skipped)
      }
    };
  }

  const review = existingAnswer?.manualReview || null;
  const reviewedScore = review ? Number(review.totalScore || 0) : 0;
  return {
    autoScore: 0,
    finalScore: reviewedScore,
    penalty: 0,
    manualStatus: review ? "reviewed" : "pending_review",
    details: {
      hasAudio: Boolean(answerPayload?.audioDataUrl || answerPayload?.audioId || answerPayload?.audioUrl),
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
      competencies: attempt.variant.competencies,
      materialTicket: summarizePm01MaterialTicket(attempt.variant.materialTicket)
    },
    materialTicket: summarizePm01MaterialTicket(attempt.variant.materialTicket, { includePrivate }),
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

  const decision = String(reviewPayload.decision || "").trim();
  if (decision === "done" || decision === "not_done") {
    const totalScore = decision === "done" ? Number(question.maxScore || 0) : 0;
    answer.manualReview = {
      reviewedAt: nowIso(),
      decision,
      scores: {},
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
  getPm01MaterialBankPublicData,
  getPm01MaterialTicket,
  isPm01TicketCompatibleWithVariant,
  summarizePm01MaterialTicket,
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
