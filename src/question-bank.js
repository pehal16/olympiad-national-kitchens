const { normalizeText } = require("./utils");

const CUISINE_LABELS = {
  ru: "Русская кухня",
  fr: "Французская кухня",
  it: "Итальянская кухня",
  jp: "Японская кухня",
  mx: "Мексиканская кухня",
  de: "Немецкая кухня",
  uk: "Английская кухня",
  balkan: "Балканская кухня",
  mixed: "Смешанный блок"
};

const CUISINE_GROUP_LABELS = {
  slavic: "Славянские кухни",
  western_europe: "Западная Европа",
  mediterranean: "Средиземноморские кухни",
  east_asia: "Восточная Азия",
  latin_america: "Латинская Америка",
  central_europe: "Центральная Европа",
  balkan: "Балканские кухни",
  mixed: "Смешанный блок",
  general: "Общий блок"
};

const TYPE_LABELS = {
  single_choice: "Один правильный ответ",
  bucket_sort: "Распределение по группам",
  ingredient_matrix: "Состав блюда",
  sequence_drag: "Последовательность действий",
  case_cluster: "Кейс-кластер"
};

const TOUR_PROFILES = {
  T1: {
    theme: "Блюда и традиции национальных кухонь",
    focus: "распознавание блюд, продуктов и характерных признаков кухни",
    studentAction: "Выбери правильный ответ",
    difficulty: "basic",
    difficultyLabel: "Базовый уровень",
    estimatedTimeSec: 45,
    okCodes: ["ОК 01", "ОК 02"],
    pkFocus: [
      "узнавание блюд и продуктов",
      "базовые признаки национальных кухонь"
    ]
  },
  T2: {
    theme: "Соотнесение блюда и кухни",
    focus: "классификация блюд по национальным кухням",
    studentAction: "Соотнеси карточки с правильной группой",
    difficulty: "basic",
    difficultyLabel: "Базовый уровень",
    estimatedTimeSec: 90,
    okCodes: ["ОК 01", "ОК 02", "ОК 09"],
    pkFocus: [
      "распознавание кухни по блюду",
      "ориентация в национальных кулинарных традициях"
    ]
  },
  T3: {
    theme: "Подбор сырья и состава блюда",
    focus: "выбор правильных ингредиентов и отсечение лишних компонентов",
    studentAction: "Выбери продукты, которые входят в блюдо",
    difficulty: "standard",
    difficultyLabel: "Повышенный уровень",
    estimatedTimeSec: 105,
    okCodes: ["ОК 01", "ОК 02"],
    pkFocus: [
      "подбор сырья и ингредиентов",
      "понимание базовой рецептуры блюда"
    ]
  },
  T4: {
    theme: "Технологические действия и дефекты",
    focus: "последовательность действий, причины дефектов и способы исправления",
    studentAction: "Выбери правильное действие или порядок шагов",
    difficulty: "standard",
    difficultyLabel: "Повышенный уровень",
    estimatedTimeSec: 95,
    okCodes: ["ОК 01", "ОК 02"],
    pkFocus: [
      "технология приготовления",
      "предупреждение и исправление дефектов"
    ]
  },
  T5: {
    theme: "Профессиональные ситуации",
    focus: "решение короткой производственной ситуации по блюду",
    studentAction: "Выбери правильное решение в кейсе",
    difficulty: "advanced",
    difficultyLabel: "Высокий уровень",
    estimatedTimeSec: 120,
    okCodes: ["ОК 01", "ОК 02", "ОК 09"],
    pkFocus: [
      "принятие профессионального решения",
      "анализ производственной ситуации"
    ]
  }
};

const TYPE_PROFILES = {
  single_choice: {
    interactive: false,
    studentAction: "Выбери правильный ответ",
    methodicalPurpose: "Проверяет точность базового знания и умение выбрать верный вариант."
  },
  bucket_sort: {
    interactive: true,
    studentAction: "Распредели карточки по группам",
    methodicalPurpose: "Проверяет классификацию, распознавание признаков и логику распределения."
  },
  ingredient_matrix: {
    interactive: true,
    studentAction: "Собери состав блюда",
    methodicalPurpose: "Проверяет понимание состава блюда и выбор технологически нужных компонентов."
  },
  sequence_drag: {
    interactive: true,
    studentAction: "Расположи шаги по порядку",
    methodicalPurpose: "Проверяет понимание последовательности технологических действий."
  },
  case_cluster: {
    interactive: false,
    studentAction: "Реши короткую профессиональную ситуацию",
    methodicalPurpose: "Проверяет применение знаний в профессиональной ситуации."
  }
};

function countWords(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function hasLatin(value) {
  return /[A-Za-z]/.test(String(value || ""));
}

function countBy(items, pickKey, pickLabel = null) {
  const map = new Map();

  items.forEach((item) => {
    const key = pickKey(item);
    if (!key) {
      return;
    }

    if (!map.has(key)) {
      map.set(key, {
        key,
        label: pickLabel ? pickLabel(item) : key,
        count: 0
      });
    }

    map.get(key).count += 1;
  });

  return Array.from(map.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return String(left.label).localeCompare(String(right.label), "ru-RU");
  });
}

function uniqueValues(items, pickValue) {
  return Array.from(
    new Set(
      items
        .map(pickValue)
        .flat()
        .filter(Boolean)
    )
  ).sort((left, right) => String(left).localeCompare(String(right), "ru-RU"));
}

function getTourMap(olympiad) {
  return new Map((olympiad.tours || []).map((tour) => [tour.code, tour]));
}

function buildBaseMetadata(question, tour, extra = {}) {
  const tourProfile = TOUR_PROFILES[tour.code] || TOUR_PROFILES.T1;
  const typeProfile = TYPE_PROFILES[question.type] || TYPE_PROFILES.single_choice;
  const dishLabel = question.dishLabel || extra.caseTitle || extra.poolTitle || "";
  const topic = dishLabel || tourProfile.theme;
  const theme = extra.poolTitle || tourProfile.theme;
  const estimatedTimeSec =
    extra.caseId && question.type === "single_choice"
      ? 105
      : tourProfile.estimatedTimeSec;

  return {
    theme,
    topic,
    focus: tourProfile.focus,
    studentAction: typeProfile.studentAction || tourProfile.studentAction,
    difficulty: tourProfile.difficulty,
    difficultyLabel: tourProfile.difficultyLabel,
    estimatedTimeSec,
    okCodes: [...tourProfile.okCodes],
    pkFocus: [...tourProfile.pkFocus],
    methodicalPurpose: typeProfile.methodicalPurpose,
    languageMode: "ru_primary",
    translationPolicy: hasLatin(question.prompt) ? "ru_with_original_in_parentheses" : "ru_primary_only"
  };
}

function normalizeQuestionRecord(question, tour, extra = {}) {
  const metadata = buildBaseMetadata(question, tour, extra);
  const dishLabel = question.dishLabel || extra.caseTitle || "";
  const typeLabel = TYPE_LABELS[question.type] || question.type;
  const cuisine = question.cuisine || extra.cuisine || "mixed";
  const cuisineGroup = question.cuisineGroup || extra.cuisineGroup || "general";
  const options = Array.isArray(question.options) ? question.options : [];
  const items = Array.isArray(question.items) ? question.items : [];

  return {
    id: question.id,
    sourceId: question.id,
    sourceKind: extra.sourceKind || "question",
    poolId: extra.poolId || null,
    poolTitle: extra.poolTitle || "",
    caseId: extra.caseId || null,
    caseTitle: extra.caseTitle || "",
    orderInSource: extra.orderInSource || 1,
    tourId: tour.id,
    tourCode: tour.code,
    tourTitle: tour.title,
    type: question.type,
    typeLabel,
    interactive: Boolean(TYPE_PROFILES[question.type]?.interactive),
    cuisine,
    cuisineLabel: CUISINE_LABELS[cuisine] || cuisine,
    cuisineGroup,
    cuisineGroupLabel: CUISINE_GROUP_LABELS[cuisineGroup] || cuisineGroup,
    dishId: question.dishId || extra.dishId || null,
    dishLabel,
    prompt: question.prompt,
    scenario: question.scenario || extra.scenario || "",
    note: question.note || "",
    maxScore: question.maxScore || 0,
    optionCount: options.length,
    itemCount: items.length,
    slotCount: Array.isArray(question.slots) ? question.slots.length : 0,
    bucketCount: Array.isArray(question.buckets) ? question.buckets.length : 0,
    options: options.map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: Boolean(option.isCorrect)
    })),
    items: items.map((item) => ({
      id: item.id,
      text: item.text
    })),
    metadata
  };
}

function buildQuestionCatalog(olympiad) {
  const records = [];
  const tours = getTourMap(olympiad);

  (olympiad.questionBank.tour1Pools || []).forEach((pool) => {
    const tour = tours.get("T1");
    (pool.questions || []).forEach((question, index) => {
      records.push(
        normalizeQuestionRecord(question, tour, {
          sourceKind: "pool_question",
          poolId: pool.id,
          poolTitle: pool.title,
          orderInSource: index + 1
        })
      );
    });
  });

  (olympiad.questionBank.tour2Blocks || []).forEach((question, index) => {
    const tour = tours.get("T2");
    records.push(
      normalizeQuestionRecord(question, tour, {
        sourceKind: "interactive_block",
        orderInSource: index + 1
      })
    );
  });

  (olympiad.questionBank.tour3Matrices || []).forEach((question, index) => {
    const tour = tours.get("T3");
    records.push(
      normalizeQuestionRecord(question, tour, {
        sourceKind: "interactive_matrix",
        orderInSource: index + 1
      })
    );
  });

  (olympiad.questionBank.tour4Tasks || []).forEach((question, index) => {
    const tour = tours.get("T4");
    records.push(
      normalizeQuestionRecord(question, tour, {
        sourceKind: "logic_task",
        orderInSource: index + 1
      })
    );
  });

  (olympiad.questionBank.tour5Cases || []).forEach((cluster, clusterIndex) => {
    const tour = tours.get("T5");
    (cluster.questions || []).forEach((question, questionIndex) => {
      records.push(
        normalizeQuestionRecord(question, tour, {
          sourceKind: "case_question",
          caseId: cluster.id,
          caseTitle: cluster.caseTitle,
          scenario: cluster.scenario,
          cuisine: cluster.cuisine,
          cuisineGroup: cluster.cuisineGroup,
          dishId: cluster.dishId,
          orderInSource: questionIndex + 1 + clusterIndex * 10
        })
      );
    });
  });

  return records.map((record, index) => ({
    ...record,
    catalogIndex: index + 1
  }));
}

function buildQaReport(records) {
  const promptMap = new Map();
  const missingMetadata = [];
  const weakDistractors = [];
  const translationHotspots = [];
  const flaggedIds = new Set();

  records.forEach((record) => {
    const promptKey = normalizeText(`${record.type}|${record.prompt}`);
    if (!promptMap.has(promptKey)) {
      promptMap.set(promptKey, []);
    }
    promptMap.get(promptKey).push(record);

    const missing = [];
    if (!record.cuisine) missing.push("cuisine");
    if (!record.metadata.theme) missing.push("theme");
    if (!record.metadata.studentAction) missing.push("studentAction");
    if (!record.metadata.estimatedTimeSec) missing.push("estimatedTimeSec");
    if (!record.metadata.okCodes?.length) missing.push("okCodes");
    if (!record.metadata.pkFocus?.length) missing.push("pkFocus");
    if (missing.length) {
      flaggedIds.add(record.id);
      missingMetadata.push({
        id: record.id,
        tourCode: record.tourCode,
        prompt: record.prompt,
        fields: missing
      });
    }

    if (record.type === "single_choice") {
      const optionTexts = (record.options || []).map((option) => normalizeText(option.text));
      const duplicateOptions = optionTexts.filter(
        (text, index) => text && optionTexts.indexOf(text) !== index
      );
      const tooShort = (record.options || [])
        .filter((option) => !option.isCorrect && countWords(option.text) <= 1)
        .map((option) => option.text);
      if (duplicateOptions.length || tooShort.length || (record.options || []).length < 4) {
        flaggedIds.add(record.id);
        weakDistractors.push({
          id: record.id,
          tourCode: record.tourCode,
          prompt: record.prompt,
          issues: [
            ...(duplicateOptions.length ? ["повторяющиеся варианты ответа"] : []),
            ...(tooShort.length ? ["слишком короткие дистракторы"] : []),
            ...((record.options || []).length < 4 ? ["меньше четырёх вариантов ответа"] : [])
          ]
        });
      }
    }

    if (hasLatin(record.prompt) || hasLatin(record.note) || hasLatin(record.scenario)) {
      translationHotspots.push({
        id: record.id,
        tourCode: record.tourCode,
        prompt: record.prompt
      });
    }
  });

  const duplicatePrompts = Array.from(promptMap.values())
    .filter((items) => items.length > 1)
    .map((items) => ({
      prompt: items[0].prompt,
      tourCode: items[0].tourCode,
      count: items.length,
      questionIds: items.map((item) => item.id)
    }));

  const cuisines = countBy(records, (record) => record.cuisine, (record) => record.cuisineLabel);
  const maxCuisineCount = cuisines.length ? cuisines[0].count : 0;
  const minCuisineCount = cuisines.length ? cuisines[cuisines.length - 1].count : 0;

  return {
    readyPercent: records.length
      ? Number((((records.length - flaggedIds.size) / records.length) * 100).toFixed(1))
      : 0,
    duplicatePrompts,
    missingMetadata,
    weakDistractors,
    translationHotspots,
    balance: {
      cuisineSpread: maxCuisineCount - minCuisineCount,
      maxCuisineCount,
      minCuisineCount
    }
  };
}

function buildQuestionBankSummary(olympiad) {
  const records = buildQuestionCatalog(olympiad);
  const qa = buildQaReport(records);

  return {
    generatedAt: new Date().toISOString(),
    version: olympiad.schemaVersion || 1,
    olympiadId: olympiad.id,
    totalQuestions: records.length,
    interactiveQuestions: records.filter((record) => record.interactive).length,
    caseQuestions: records.filter((record) => record.caseId).length,
    tours: countBy(records, (record) => record.tourCode, (record) => `${record.tourCode} • ${record.tourTitle}`),
    cuisines: countBy(records, (record) => record.cuisine, (record) => record.cuisineLabel),
    types: countBy(records, (record) => record.type, (record) => record.typeLabel),
    difficulties: countBy(
      records,
      (record) => record.metadata.difficulty,
      (record) => record.metadata.difficultyLabel
    ),
    themes: countBy(records, (record) => record.metadata.theme),
    okCoverage: countBy(
      records.flatMap((record) => record.metadata.okCodes.map((code) => ({ code }))),
      (entry) => entry.code
    ),
    pkCoverage: countBy(
      records.flatMap((record) => record.metadata.pkFocus.map((code) => ({ code }))),
      (entry) => entry.code
    ),
    catalogs: {
      tours: uniqueValues(records, (record) => record.tourCode),
      cuisines: uniqueValues(records, (record) => record.cuisineLabel),
      types: uniqueValues(records, (record) => record.typeLabel),
      difficulties: uniqueValues(records, (record) => record.metadata.difficultyLabel),
      themes: uniqueValues(records, (record) => record.metadata.theme),
      okCodes: uniqueValues(records, (record) => record.metadata.okCodes),
      pkFocus: uniqueValues(records, (record) => record.metadata.pkFocus)
    },
    qa
  };
}

module.exports = {
  buildQuestionCatalog,
  buildQuestionBankSummary
};
