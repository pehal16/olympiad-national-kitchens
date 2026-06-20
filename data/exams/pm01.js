const vegetablePhotoCutSourceItems = require("./pm01-vegetable-photo-cuts.json");
const semiFinishedProductSourceItems = require("./pm01-semi-finished-products.json");
const generatedSemiFinishedProductItems = require("./pm01-generated-semi-finished-products.json");

const vegetablePhotoCutItems = vegetablePhotoCutSourceItems.map(({ source, crop, ...item }) => item);
const vegetablePhotoCutAssets = Object.fromEntries(
  vegetablePhotoCutItems.map((item) => [item.id, item.image])
);
const semiFinishedProductItems = semiFinishedProductSourceItems.map(({ source, crop, ...item }) => item);
const semiFinishedProductAssets = Object.fromEntries(
  semiFinishedProductItems.map((item) => [item.id, item.image])
);
const generatedSemiFinishedProductAssets = Object.fromEntries(
  generatedSemiFinishedProductItems.map((item) => [item.id, item.image])
);
const semiFinishedByGroup = (group) => semiFinishedProductItems.filter((item) => item.group === group);

function option(id, text, isCorrect = false) {
  return { id, text, isCorrect };
}

function single(id, prompt, options, correctId, meta = {}) {
  return {
    id,
    type: "single_choice",
    prompt,
    maxScore: meta.maxScore ?? 2,
    options: options.map(([key, text]) => option(key, text, key === correctId)),
    explanation: meta.explanation || "",
    competencyTags: meta.competencyTags || []
  };
}

function multiple(id, prompt, options, correctIds, meta = {}) {
  const correct = new Set(correctIds);
  return {
    id,
    type: "multiple_choice",
    prompt,
    note: "Можно выбрать несколько ответов.",
    maxScore: meta.maxScore ?? 2,
    options: options.map(([key, text]) => option(key, text, correct.has(key))),
    explanation: meta.explanation || "",
    competencyTags: meta.competencyTags || []
  };
}

function sequence(id, prompt, items, correctSequence, meta = {}) {
  return {
    id,
    type: "sequence_drag",
    prompt,
    note: meta.note || "Соберите правильный технологический порядок операций.",
    maxScore: meta.maxScore ?? 2,
    visualMode: meta.visualMode || "",
    interactionHint: meta.interactionHint || "",
    practiceOnly: Boolean(meta.practiceOnly),
    practiceFamily: meta.practiceFamily || "",
    items: items.map(([key, text, itemMeta = {}]) => ({ id: key, text, ...itemMeta })),
    slots: correctSequence.map((_, index) => ({
      id: `${id}-step-${index + 1}`,
      label: `Шаг ${index + 1}`
    })),
    correctSequence,
    explanation: meta.explanation || "",
    competencyTags: meta.competencyTags || []
  };
}

function bucket(id, prompt, items, buckets, correctBuckets, meta = {}) {
  return {
    id,
    type: "bucket_sort",
    prompt,
    note: meta.note || "Распределите карточки по правильным зонам.",
    maxScore: meta.maxScore ?? 2,
    visualMode: meta.visualMode || "",
    interactionHint: meta.interactionHint || "",
    practiceOnly: Boolean(meta.practiceOnly),
    practiceFamily: meta.practiceFamily || "",
    items: items.map(([key, text, itemMeta = {}]) => ({ id: key, text, ...itemMeta })),
    buckets: buckets.map(([key, label, bucketMeta = {}]) => ({ id: key, label, ...bucketMeta })),
    correctBuckets,
    explanation: meta.explanation || "",
    competencyTags: meta.competencyTags || []
  };
}

function qualityControl(id, prompt, items, correctBuckets, meta = {}) {
  return bucket(
    id,
    prompt,
    items,
    [
      [
        "accept",
        "Допустить к работе",
        {
          detail: "Партия безопасна, промаркирована и соответствует заданию."
        }
      ],
      [
        "correct",
        "Исправить условия",
        {
          detail: "Продукт можно использовать после устранения нарушения: тара, маркировка, охлаждение или разделение потоков."
        }
      ],
      [
        "reject",
        "Забраковать",
        {
          detail: "Есть признаки недоброкачественности или загрязнения, продукт нельзя направлять в производство."
        }
      ]
    ],
    correctBuckets,
    {
      maxScore: 6,
      visualMode: "quality_control",
      note: "Оцените фото и карту контроля партии. Выберите производственное решение.",
      interactionHint:
        "Сначала нажмите карту партии, затем решение: допустить, исправить условия или забраковать.",
      explanation:
        "Задание проверяет визуальный контроль полуфабриката, санитарные риски, маркировку и готовность партии к дальнейшей работе.",
      competencyTags: ["ПК 1.1", "ПК 1.2", "ОК 01", "ОК 02", "ОК 07"],
      ...meta
    }
  );
}

function calculation(id, prompt, formulas, fields, solutionSteps, meta = {}) {
  return {
    id,
    type: "calculation_task",
    prompt,
    formulas,
    fields,
    solutionSteps,
    maxScore: meta.maxScore ?? 10,
    explanation: meta.explanation || "",
    competencyTags: meta.competencyTags || ["ОК 02", "ПК 1.2"]
  };
}

function voice(id, prompt, answerPlan, meta = {}) {
  return {
    id,
    type: "voice_response",
    prompt,
    answerPlan,
    maxScore: 20,
    maxDurationSeconds: meta.maxDurationSeconds || 120,
    rubric: [
      { id: "topic", label: "Ответ по теме", maxScore: 5 },
      { id: "tools", label: "Инструменты и оборудование", maxScore: 5 },
      { id: "sequence", label: "Последовательность работы", maxScore: 5 },
      { id: "safety", label: "Санитария, безопасность и хранение", maxScore: 5 }
    ],
    exemplar: meta.exemplar || "",
    manualReview: true,
    competencyTags: ["ОК 04", "ОК 09", "ОК 10"]
  };
}

function hotspot(id, prompt, image, hotspots, meta = {}) {
  return {
    id,
    type: "hotspot_scene",
    prompt,
    image,
    note: "Нажмите на все нарушения или важные зоны на производственной сцене.",
    maxScore: meta.maxScore ?? 6,
    visualMode: meta.visualMode || "",
    practiceOnly: Boolean(meta.practiceOnly),
    practiceFamily: meta.practiceFamily || "",
    hotspots,
    explanation: meta.explanation || "",
    competencyTags: meta.competencyTags || ["ПК 1.1", "ОК 07"]
  };
}

const commonRubric =
  "Оценивается полнота ответа, правильность терминов, последовательность действий, санитария, безопасность и хранение.";

const classicFrenchCutItems = [
  ["julienne", "Julienne — соломка"],
  ["fineJulienne", "Fine julienne — тонкая соломка"],
  ["allumette", "Allumette — спички"],
  ["batonnet", "Batonnet — брусочки"],
  ["jardiniere", "Jardiniere — овощные брусочки"],
  ["brunoise", "Brunoise — мелкие кубики"],
  ["fineBrunoise", "Fine brunoise — очень мелкие кубики"],
  ["macedoine", "Macedoine — средние кубики"],
  ["paysanne", "Paysanne — тонкие пластинки"],
  ["rondelle", "Rondelle — кружочки"],
  ["chiffonade", "Chiffonade — ленты зелени"],
  ["mirepoix", "Mirepoix — крупная ароматическая нарезка"],
  ["slices", "Ломтики"],
  ["wedges", "Дольки"]
];

const classicFrenchCutBuckets = [
  [
    "juliennePhoto",
    "длинные тонкие полоски",
    {
      image: vegetablePhotoCutAssets.carrotJulienne,
      visualTitle: "Julienne",
      detail: "Ровная соломка для салатов, гарниров и быстрой тепловой обработки."
    }
  ],
  [
    "fineJuliennePhoto",
    "очень тонкие полоски",
    {
      image: vegetablePhotoCutAssets.carrotFineJulienne,
      visualTitle: "Fine julienne",
      detail: "Более тонкая соломка для аккуратной подачи, тонких гарниров и украшения."
    }
  ],
  [
    "allumettePhoto",
    "тонкие спички",
    {
      image: vegetablePhotoCutAssets.potatoAllumette,
      visualTitle: "Allumette",
      detail: "Нарезка «спичками»: тонкие ровные палочки, часто используется для картофеля и корнеплодов."
    }
  ],
  [
    "batonnetPhoto",
    "классические бруски",
    {
      image: vegetablePhotoCutAssets.potatoBatonnet,
      visualTitle: "Batonnet",
      detail: "Продолговатые бруски одинаковой толщины для картофеля, моркови, супов и гарниров."
    }
  ],
  [
    "jardinierePhoto",
    "аккуратные овощные брусочки",
    {
      image: vegetablePhotoCutAssets.carrotJardiniere,
      visualTitle: "Jardiniere",
      detail: "Ровные овощные брусочки для гарниров, супов и демонстрации точности ножевой работы."
    }
  ],
  [
    "brunoisePhoto",
    "мелкие кубики",
    {
      image: vegetablePhotoCutAssets.carrotBrunoise,
      visualTitle: "Brunoise",
      detail: "Мелкие равномерные кубики, получаемые из julienne, для соусов, начинок и точной подачи."
    }
  ],
  [
    "fineBrunoisePhoto",
    "очень мелкие кубики",
    {
      image: vegetablePhotoCutAssets.carrotFineBrunoise,
      visualTitle: "Fine brunoise",
      detail: "Максимально мелкая кубиковая нарезка для деликатной текстуры и оформления."
    }
  ],
  [
    "macedoinePhoto",
    "средние ровные кубики",
    {
      image: vegetablePhotoCutAssets.mixedMacedoine,
      visualTitle: "Macedoine",
      detail: "Средние кубики для салатов, винегретов, гарниров и полуфабрикатов с ровным прогревом."
    }
  ],
  [
    "paysannePhoto",
    "тонкие пластинки разной геометрии",
    {
      image: vegetablePhotoCutAssets.mixedPaysanne,
      visualTitle: "Paysanne",
      detail: "Тонкие пластинки, форма которых повторяет овощ: кружок, квадрат, треугольник или сектор."
    }
  ],
  [
    "rondellePhoto",
    "круглые поперечные ломтики",
    {
      image: vegetablePhotoCutAssets.mixedRondelle,
      visualTitle: "Rondelle",
      detail: "Поперечные кружочки моркови, кабачка, огурца и других цилиндрических овощей."
    }
  ],
  [
    "chiffonadePhoto",
    "тонкие ленты листьев",
    {
      image: vegetablePhotoCutAssets.greensChiffonade,
      visualTitle: "Chiffonade",
      detail: "Ленты из листовой зелени или салатных листьев для холодных блюд, супов и оформления."
    }
  ],
  [
    "mirepoixPhoto",
    "крупная ароматическая нарезка",
    {
      image: vegetablePhotoCutAssets.mixedMirepoix,
      visualTitle: "Mirepoix",
      detail: "Крупные кусочки овощей для ароматической основы бульонов, соусов и тушения."
    }
  ],
  [
    "slicesPhoto",
    "плоские ломтики",
    {
      image: vegetablePhotoCutAssets.potatoThinSlices,
      visualTitle: "Ломтики",
      detail: "Плоские овальные или полукруглые пластины, не клиновидные дольки."
    }
  ],
  [
    "wedgesPhoto",
    "клиновидные дольки",
    {
      image: vegetablePhotoCutAssets.potatoWedges,
      visualTitle: "Дольки",
      detail: "Клиновидные части картофеля, томатов и корнеплодов для запекания и тушения."
    }
  ]
];

const classicFrenchCutCorrect = {
  julienne: "juliennePhoto",
  fineJulienne: "fineJuliennePhoto",
  allumette: "allumettePhoto",
  batonnet: "batonnetPhoto",
  jardiniere: "jardinierePhoto",
  brunoise: "brunoisePhoto",
  fineBrunoise: "fineBrunoisePhoto",
  macedoine: "macedoinePhoto",
  paysanne: "paysannePhoto",
  rondelle: "rondellePhoto",
  chiffonade: "chiffonadePhoto",
  mirepoix: "mirepoixPhoto",
  slices: "slicesPhoto",
  wedges: "wedgesPhoto"
};

const cutApplicationItems = [
  ["julienne", "Julienne / соломка"],
  ["allumette", "Allumette / спички"],
  ["batonnet", "Batonnet / брусочки"],
  ["brunoise", "Brunoise / мелкие кубики"],
  ["macedoine", "Macedoine / средние кубики"],
  ["paysanne", "Paysanne / пластинки"],
  ["rondelle", "Rondelle / кружочки"],
  ["chiffonade", "Chiffonade / ленты зелени"],
  ["mirepoix", "Mirepoix / ароматическая основа"],
  ["slices", "Ломтики"],
  ["wedges", "Дольки"]
];

const cutApplicationBuckets = [
  [
    "fastCook",
    "салаты, гарниры и быстрая тепловая обработка",
    {
      image: vegetablePhotoCutAssets.carrotJulienne,
      visualTitle: "Соломка",
      detail: "Длинная ровная нарезка быстро прогревается и выглядит аккуратно в гарнире."
    }
  ],
  [
    "fries",
    "картофельные заготовки для жарки",
    {
      image: vegetablePhotoCutAssets.potatoAllumette,
      visualTitle: "Спички",
      detail: "Тонкие палочки подходят для мелкой картофельной заготовки и тренируют равномерность ножевой работы."
    }
  ],
  [
    "soupsGarnish",
    "супы и гарниры с заметной формой",
    {
      image: vegetablePhotoCutAssets.potatoBatonnet,
      visualTitle: "Брусочки",
      detail: "Брусочки держат форму лучше тонкой соломки и удобны для овощных полуфабрикатов."
    }
  ],
  [
    "sauces",
    "соусы, начинки и аккуратная подача",
    {
      image: vegetablePhotoCutAssets.carrotBrunoise,
      visualTitle: "Мелкие кубики",
      detail: "Мелкие кубики дают ровную текстуру и быстро доходят до готовности."
    }
  ],
  [
    "salads",
    "салаты, винегреты и смешанные гарниры",
    {
      image: vegetablePhotoCutAssets.mixedMacedoine,
      visualTitle: "Средние кубики",
      detail: "Средние кубики хорошо считываются в салате и дают одинаковый размер кусочков."
    }
  ],
  [
    "thinSoup",
    "быстрые супы и равномерное прогревание",
    {
      image: vegetablePhotoCutAssets.mixedPaysanne,
      visualTitle: "Тонкие пластинки",
      detail: "Тонкая пластинчатая форма быстро прогревается и может повторять форму овоща."
    }
  ],
  [
    "roundVeg",
    "морковь, кабачок, огурец поперек",
    {
      image: vegetablePhotoCutAssets.mixedRondelle,
      visualTitle: "Кружочки",
      detail: "Круглая форма получается поперечным срезом цилиндрического овоща."
    }
  ],
  [
    "leafGarnish",
    "листовая зелень, холодные блюда и оформление",
    {
      image: vegetablePhotoCutAssets.greensChiffonade,
      visualTitle: "Ленты зелени",
      detail: "Ленты получают из свернутых листьев; форма уместна для зелени, салата и тонкой подачи."
    }
  ],
  [
    "stockBase",
    "ароматическая основа бульона или соуса",
    {
      image: vegetablePhotoCutAssets.mixedMirepoix,
      visualTitle: "Крупная основа",
      detail: "Крупная нарезка нужна не для подачи, а для вкусовой основы и дальнейшего удаления/протирания."
    }
  ],
  [
    "coldPlate",
    "холодные блюда и плоская нарезка",
    {
      image: vegetablePhotoCutAssets.potatoThinSlices,
      visualTitle: "Ломтики",
      detail: "Плоские ломтики отличаются от дольки тем, что не имеют клиновидной формы."
    }
  ],
  [
    "roast",
    "запекание и тушение крупными частями",
    {
      image: vegetablePhotoCutAssets.potatoWedges,
      visualTitle: "Дольки",
      detail: "Клиновидные дольки хорошо подходят для картофеля, томатов и овощей при запекании."
    }
  ]
];

const cutApplicationCorrect = {
  julienne: "fastCook",
  allumette: "fries",
  batonnet: "soupsGarnish",
  brunoise: "sauces",
  macedoine: "salads",
  paysanne: "thinSoup",
  rondelle: "roundVeg",
  chiffonade: "leafGarnish",
  mirepoix: "stockBase",
  slices: "coldPlate",
  wedges: "roast"
};

const extendedVisualAssets = {
  cuts: {
    potatoShoestring: "/assets/pm01/extended/cuts/potato-shoestring.png",
    potatoTourne: "/assets/pm01/extended/cuts/potato-tourne.png",
    carrotOblique: "/assets/pm01/extended/cuts/carrot-oblique.png",
    tomatoConcasse: "/assets/pm01/extended/cuts/tomato-concasse.png",
    onionSmallDice: "/assets/pm01/extended/cuts/onion-small-dice.png",
    cabbageCheckers: "/assets/pm01/extended/cuts/cabbage-checkers.png",
    beetCubes: "/assets/pm01/extended/cuts/beet-cubes.png",
    potatoParmentier: "/assets/pm01/extended/cuts/potato-parmentier.png",
    pepperStrips: "/assets/pm01/extended/cuts/pepper-strips.png",
    cucumberHalfMoons: "/assets/pm01/extended/cuts/cucumber-half-moons.png",
    mushroomSlices: "/assets/pm01/extended/cuts/mushroom-slices.png",
    greensChopped: "/assets/pm01/extended/cuts/greens-chopped.png"
  },
  meat: {
    beefMedallions: "/assets/pm01/extended/meat/beef-medallions.png",
    beefSteakNatural: "/assets/pm01/extended/meat/beef-steak-natural.png",
    beefEscalope: "/assets/pm01/extended/meat/beef-escalope.png",
    beefStroganoffStrips: "/assets/pm01/extended/meat/beef-stroganoff-strips.png",
    beefShashlikCubes: "/assets/pm01/extended/meat/beef-shashlik-cubes.png",
    porkSchnitzelBreaded: "/assets/pm01/extended/meat/pork-schnitzel-breaded.png",
    porkChopBoneIn: "/assets/pm01/extended/meat/pork-chop-bone-in.png",
    lambRagoutBoneIn: "/assets/pm01/extended/meat/lamb-ragout-bone-in.png",
    meatMincePortions: "/assets/pm01/extended/meat/meat-mince-portions.png",
    meatBonesBroth: "/assets/pm01/extended/meat/meat-bones-broth.png"
  },
  fish: {
    wholeFishCleaned: "/assets/pm01/extended/fish/whole-fish-cleaned.png",
    fishSteakCrosscut: "/assets/pm01/extended/fish/fish-steak-crosscut.png",
    fishFilletSkinOn: "/assets/pm01/extended/fish/fish-fillet-skin-on.png",
    fishFilletSkinless: "/assets/pm01/extended/fish/fish-fillet-skinless.png",
    fishButterflyFillet: "/assets/pm01/extended/fish/fish-butterfly-fillet.png",
    fishTrimHeadTail: "/assets/pm01/extended/fish/fish-trim-head-tail.png",
    fishRoll: "/assets/pm01/extended/fish/fish-roll.png",
    fishBalls: "/assets/pm01/extended/fish/fish-balls.png",
    fishSticksBreaded: "/assets/pm01/extended/fish/fish-sticks-breaded.png",
    fishQuenelles: "/assets/pm01/extended/fish/fish-quenelles.png"
  },
  poultry: {
    wholeChickenPrepared: "/assets/pm01/extended/poultry/whole-chicken-prepared.png",
    chickenBreastButterfly: "/assets/pm01/extended/poultry/chicken-breast-butterfly.png",
    chickenWingSegments: "/assets/pm01/extended/poultry/chicken-wing-segments.png",
    chickenSupreme: "/assets/pm01/extended/poultry/chicken-supreme.png",
    chickenFrontQuarter: "/assets/pm01/extended/poultry/chicken-front-quarter.png",
    chickenBackBroth: "/assets/pm01/extended/poultry/chicken-back-broth.png",
    rabbitSaddle: "/assets/pm01/extended/poultry/rabbit-saddle.png",
    rabbitHindLeg: "/assets/pm01/extended/poultry/rabbit-hind-leg.png",
    poultryCutlets: "/assets/pm01/extended/poultry/poultry-cutlets.png",
    poultryQuenelles: "/assets/pm01/extended/poultry/poultry-quenelles.png"
  },
  safety: {
    colorCodedBoards: "/assets/pm01/extended/safety/color-coded-boards.png",
    knifeSanitizing: "/assets/pm01/extended/safety/knife-sanitizing.png",
    thermometerCheck: "/assets/pm01/extended/safety/thermometer-check.png",
    vacuumPackaging: "/assets/pm01/extended/safety/vacuum-packaging.png",
    labelledContainer: "/assets/pm01/extended/safety/labelled-container.png",
    fridgeSeparateStorage: "/assets/pm01/extended/safety/fridge-separate-storage.png",
    wasteBinSeparated: "/assets/pm01/extended/safety/waste-bin-separated.png",
    gloveChangeHandwash: "/assets/pm01/extended/safety/glove-change-handwash.png"
  }
};

const visualAtlas = [
  {
    id: "vegetable-photo-cuts",
    title: "Овощные нарезки",
    displayLimit: 10,
    items: vegetablePhotoCutItems
  },
  {
    id: "vegetable-semi-products",
    title: "Овощные полуфабрикаты",
    displayLimit: 10,
    items: semiFinishedByGroup("vegetables")
  },
  {
    id: "generated-semi-products",
    title: "Новые полуфабрикаты",
    displayLimit: 12,
    items: generatedSemiFinishedProductItems
  },
  {
    id: "extended-cuts",
    title: "Нарезки",
    items: [
      { title: "Allumette", image: vegetablePhotoCutAssets.potatoAllumette, detail: "Тонкие ровные палочки картофеля, близкие к учебной форме «соломка»." },
      { title: "Brunoise", image: vegetablePhotoCutAssets.carrotBrunoise, detail: "Мелкие ровные кубики для соусов, начинок и аккуратной подачи." },
      { title: "Macedoine", image: vegetablePhotoCutAssets.mixedMacedoine, detail: "Средние кубики одинаковой формы для салатов и гарниров." },
      { title: "Paysanne", image: vegetablePhotoCutAssets.mixedPaysanne, detail: "Тонкие пластинки, повторяющие форму овоща." },
      { title: "Rondelle", image: vegetablePhotoCutAssets.mixedRondelle, detail: "Поперечные кружочки цилиндрических овощей." }
    ]
  },
  {
    id: "extended-meat",
    title: "Мясо",
    displayLimit: 12,
    items: semiFinishedByGroup("meat")
  },
  {
    id: "extended-fish",
    title: "Рыба",
    displayLimit: 12,
    items: semiFinishedByGroup("fish")
  },
  {
    id: "extended-poultry",
    title: "Птица и кролик",
    displayLimit: 12,
    items: semiFinishedByGroup("poultry")
  },
  {
    id: "extended-safety",
    title: "Санитария",
    items: [
      { title: "Маркированные доски", image: extendedVisualAssets.safety.colorCodedBoards, detail: "Разделение потоков сырья." },
      { title: "Санобработка ножа", image: extendedVisualAssets.safety.knifeSanitizing, detail: "Очистка и дезинфекция инвентаря." },
      { title: "Контроль температуры", image: extendedVisualAssets.safety.thermometerCheck, detail: "Проверка безопасного режима." },
      { title: "Раздельное хранение", image: extendedVisualAssets.safety.fridgeSeparateStorage, detail: "Соблюдение товарного соседства." },
      { title: "Тара отходов", image: extendedVisualAssets.safety.wasteBinSeparated, detail: "Отдельный сбор отходов." }
    ]
  }
];

module.exports = {
  schemaVersion: 1,
  id: "pm01-2026-exam",
  slug: "pm01-interactive-exam",
  title: "Экзамен по МДК 01.01 и МДК 01.02",
  subtitle: "ПМ.01: полуфабрикаты для блюд и кулинарных изделий разнообразного ассортимента",
  programTitle:
    "ПМ.01. Приготовление и подготовка к реализации полуфабрикатов для блюд, кулинарных изделий разнообразного ассортимента",
  description:
    "Цифровая производственная мастерская: тест, расчеты, голосовой ответ и интерактивная симуляция по МДК 01.01 и МДК 01.02.",
  profession: "43.01.09 Повар, кондитер",
  developer: "Преподаватель Постовит Дмитрий Александрович",
  interdisciplinaryCourses: [
    {
      code: "МДК 01.01",
      title: "Организация процессов приготовления, подготовки к реализации кулинарных полуфабрикатов"
    },
    {
      code: "МДК 01.02",
      title: "Процессы приготовления, подготовки к реализации кулинарных полуфабрикатов"
    }
  ],
  methodicalBasis: [
    "ФГОС СПО 43.01.09 Повар, кондитер",
    "ПМ.01: приготовление и подготовка к реализации полуфабрикатов разнообразного ассортимента",
    "Сборники рецептур и учебно-методические материалы по обработке овощей, рыбы, мяса, птицы, дичи и кролика"
  ],
  durationMinutes: 90,
  scoring: {
    totalMaxScore: 100,
    gradeScale: [
      { min: 90, grade: "5", label: "отлично" },
      { min: 75, grade: "4", label: "хорошо" },
      { min: 60, grade: "3", label: "удовлетворительно" },
      { min: 0, grade: "2", label: "неудовлетворительно" }
    ]
  },
  participantFields: [
    { id: "fullName", label: "ФИО студента", required: true },
    { id: "institution", label: "Образовательная организация", required: true },
    { id: "groupName", label: "Группа", required: true },
    { id: "mentorName", label: "Преподаватель", required: false }
  ],
  modules: [
    { id: "situation", code: "M0", order: 0, title: "Ситуация", maxScore: 0 },
    { id: "test", code: "M1", order: 1, title: "Тест", maxScore: 20 },
    { id: "calculation", code: "M2", order: 2, title: "Расчет", maxScore: 30 },
    { id: "voice", code: "M3", order: 3, title: "Голос", maxScore: 20 },
    { id: "simulation", code: "M4", order: 4, title: "Симуляция", maxScore: 30 }
  ],
  formulas: [
    {
      id: "waste",
      title: "Масса отходов",
      formula: "М отходов = М брутто × W / 100"
    },
    {
      id: "net",
      title: "Масса нетто",
      formula: "М нетто = М брутто − М отходов"
    },
    {
      id: "gross",
      title: "Масса брутто по нетто",
      formula: "М брутто = М нетто × 100 / (100 − W)"
    },
    {
      id: "batch",
      title: "Масса партии",
      formula: "М партии = n × m одной порции"
    },
    {
      id: "package",
      title: "Упаковка партии",
      formula: "Количество тары = ceil(количество полуфабрикатов / вместимость тары)"
    }
  ],
  assetRegistry: {
    workshops: {
      vegetables: "/assets/pm01/vegetable-workshop.png",
      fish: "/assets/pm01/fish-workshop.png",
      meat: "/assets/pm01/meat-workshop.png",
      poultry: "/assets/pm01/poultry-workshop.png",
      complex: "/assets/pm01/complex-workshop.png"
    },
    cutShapes: {
      julienne: "/assets/pm01/cuts/julienne.png",
      fineJulienne: "/assets/pm01/cuts/fine-julienne.png",
      allumette: "/assets/pm01/cuts/allumette.png",
      brunoise: "/assets/pm01/cuts/brunoise.png",
      fineBrunoise: "/assets/pm01/cuts/fine-brunoise.png",
      macedoine: "/assets/pm01/cuts/macedoine.png",
      paysanne: "/assets/pm01/cuts/paysanne.png",
      jardiniere: "/assets/pm01/cuts/jardiniere.png",
      chiffonade: "/assets/pm01/cuts/chiffonade.png",
      rondelle: "/assets/pm01/cuts/rondelle.png",
      mirepoix: "/assets/pm01/cuts/mirepoix.png",
      batonnet: "/assets/pm01/cuts/batonnet.png",
      wedges: "/assets/pm01/cuts/wedges.png",
      rings: "/assets/pm01/cuts/rings.png",
      slices: "/assets/pm01/cuts/slices.png",
      halfRings: "/assets/pm01/cuts/half-rings.png",
      mediumCubes: "/assets/pm01/cuts/medium-cubes.png",
      largeCubes: "/assets/pm01/cuts/large-cubes.png",
      shashki: "/assets/pm01/cuts/shashki.png",
      shavings: "/assets/pm01/cuts/shavings.png",
      balls: "/assets/pm01/cuts/balls.png"
    },
    processSteps: {
      sort: "/assets/pm01/process/veg-sort.png",
      calibrate: "/assets/pm01/process/veg-calibrate.png",
      wash: "/assets/pm01/process/veg-wash.png",
      peel: "/assets/pm01/process/veg-peel.png",
      finish: "/assets/pm01/process/veg-finish.png",
      rinse: "/assets/pm01/process/veg-rinse.png",
      cut: "/assets/pm01/process/veg-cut.png"
    },
    fishSemiProducts: {
      fillet: "/assets/pm01/fish-products/fish-fillet.png",
      portion: "/assets/pm01/fish-products/fish-portion.png",
      breaded: "/assets/pm01/fish-products/fish-breaded.png",
      cutlets: "/assets/pm01/fish-products/fish-cutlets.png",
      mince: "/assets/pm01/fish-products/fish-mince.png"
    },
    fishProcess: {
      quality: "/assets/pm01/fish-process/fish-quality.png",
      defrost: "/assets/pm01/fish-process/fish-defrost.png",
      scale: "/assets/pm01/fish-process/fish-scale.png",
      gut: "/assets/pm01/fish-process/fish-gut.png",
      trim: "/assets/pm01/fish-process/fish-trim.png",
      rinse: "/assets/pm01/fish-process/fish-rinse.png",
      portion: "/assets/pm01/fish-process/fish-portioning.png",
      cool: "/assets/pm01/fish-process/fish-cooling.png"
    },
    meatSemiProducts: {
      entrecote: "/assets/pm01/meat-products/entrecote.png",
      goulash: "/assets/pm01/meat-products/goulash.png",
      azu: "/assets/pm01/meat-products/azu.png",
      cutlets: "/assets/pm01/meat-products/cutlets.png",
      largePiece: "/assets/pm01/meat-products/large-piece.png",
      romsteak: "/assets/pm01/meat-products/romsteak.png"
    },
    meatTools: {
      boningKnife: "/assets/pm01/meat-tools/boning-knife.png",
      cleaver: "/assets/pm01/meat-tools/cleaver.png",
      musat: "/assets/pm01/meat-tools/musat.png",
      mallet: "/assets/pm01/meat-tools/mallet.png",
      scale: "/assets/pm01/meat-tools/scale.png"
    },
    meatGrinderParts: {
      body: "/assets/pm01/meat-grinder/body.png",
      screw: "/assets/pm01/meat-grinder/screw.png",
      knife: "/assets/pm01/meat-grinder/knife.png",
      plate: "/assets/pm01/meat-grinder/plate.png",
      nut: "/assets/pm01/meat-grinder/nut.png",
      hopper: "/assets/pm01/meat-grinder/hopper.png"
    },
    poultrySemiProducts: {
      fillet: "/assets/pm01/poultry-products/chicken-fillet.png",
      legQuarter: "/assets/pm01/poultry-products/chicken-leg-quarter.png",
      thighDrumstick: "/assets/pm01/poultry-products/chicken-thigh-drumstick.png",
      drumstick: "/assets/pm01/poultry-products/chicken-drumstick.png",
      thigh: "/assets/pm01/poultry-products/chicken-thigh.png",
      mince: "/assets/pm01/poultry-products/poultry-mince.png",
      rabbitPortions: "/assets/pm01/poultry-products/rabbit-portions.png"
    },
    packaging: {
      sealedContainer: "/assets/pm01/packaging/sealed-container.png",
      filmTrayFish: "/assets/pm01/packaging/film-tray-fish.png",
      gastronormLid: "/assets/pm01/packaging/gastronorm-lid.png",
      newspaperViolation: "/assets/pm01/packaging/newspaper-violation.png"
    },
    violationScenes: {
      vegetables: "/assets/pm01/violations/vegetable.png",
      fish: "/assets/pm01/violations/fish.png",
      meat: "/assets/pm01/violations/meat.png",
      poultry: "/assets/pm01/violations/poultry.png",
      complex: "/assets/pm01/violations/complex.png"
    },
    vegetablePhotoCuts: vegetablePhotoCutAssets,
    semiFinishedProducts: semiFinishedProductAssets,
    generatedSemiFinishedProducts: generatedSemiFinishedProductAssets,
    extendedVisuals: extendedVisualAssets
  },
  visualAtlas,
  variants: [
    {
      id: "vegetables",
      number: 1,
      title: "Овощной цех",
      shortTitle: "Овощи и грибы",
      icon: "carrot",
      accent: "#16805f",
      image: "/assets/pm01/vegetable-workshop.png",
      scenario:
        "Студент работает в овощном цехе. Нужно принять сырье, определить последовательность обработки овощей и грибов, выбрать оборудование, рассчитать брутто/нетто, подобрать форму нарезки и подготовить полуфабрикаты к дальнейшему использованию.",
      competencies: ["ПК 1.1", "ПК 1.2", "ОК 01", "ОК 02", "ОК 07"],
      test: [
        sequence(
          "veg-t1-seq-potato",
          "Установите правильную последовательность механической обработки картофеля.",
          [
            [
              "sort",
              "сортировка",
              {
                image: "/assets/pm01/process/veg-sort.png",
                detail: "Отделить пригодные клубни от поврежденных, загнивших и сильно загрязненных."
              }
            ],
            [
              "calibrate",
              "калибровка",
              {
                image: "/assets/pm01/process/veg-calibrate.png",
                detail: "Разделить картофель по размеру для равномерной машинной очистки и снижения отходов."
              }
            ],
            [
              "wash",
              "мойка до очистки",
              {
                image: "/assets/pm01/process/veg-wash.png",
                detail: "Промыть сырье проточной водой до очистки, удаляя землю и поверхностные загрязнения."
              }
            ],
            [
              "peel",
              "очистка",
              {
                image: "/assets/pm01/process/veg-peel.png",
                detail: "Снять кожуру механическим или ручным способом, не допуская лишних потерь сырья."
              }
            ],
            [
              "finish",
              "доочистка",
              {
                image: "/assets/pm01/process/veg-finish.png",
                detail: "Удалить глазки, остатки кожуры и мелкие дефекты после основной очистки."
              }
            ],
            [
              "cut",
              "нарезка",
              {
                image: "/assets/pm01/process/veg-cut.png",
                detail: "Нарезать очищенные овощи заданной формой на чистой доске безопасным приемом."
              }
            ]
          ],
          ["sort", "calibrate", "wash", "peel", "finish", "cut"],
          { explanation: "Калибровка до машинной очистки снижает отходы." }
        ),
        single("veg-t1-calibration", "Перед загрузкой картофеля в картофелечистку студент сортирует клубни по размеру. Зачем нужна калибровка?", [
          ["a", "чтобы установить массу брутто без взвешивания"],
          ["b", "чтобы снизить отходы при машинной очистке"],
          ["c", "чтобы определить органолептические признаки качества"],
          ["d", "чтобы отделить очистки после работы машины"]
        ], "b"),
        single("veg-t1-gross", "Студент оформляет заявку на картофель до первичной обработки. Какую массу нужно записать как «брутто»?", [
          ["a", "массу сырья до очистки и удаления отходов"],
          ["b", "массу очищенного картофеля после доочистки"],
          ["c", "массу отходов после машинной очистки"],
          ["d", "массу готового овощного полуфабриката после нарезки"]
        ], "a"),
        single("veg-t1-net", "После сортировки, мойки, очистки и доочистки овощей студент взвешивает пригодную часть сырья. Какая это масса?", [
          ["a", "нетто — масса продукта после удаления отходов"],
          ["b", "брутто — масса сырья до обработки"],
          ["c", "масса тары вместе с продуктом"],
          ["d", "масса отходов и потерь"]
        ], "a"),
        bucket(
          "veg-t1-cuts",
          "Соотнесите популярные французские формы нарезки и привычные формы СПО с точным изображением.",
          classicFrenchCutItems,
          classicFrenchCutBuckets,
          classicFrenchCutCorrect,
          {
            visualMode: "cut_shapes",
            interactionHint: "Перенесите название формы нарезки на подходящее фото.",
            explanation:
              "Формы подобраны как базовые французские ножевые нарезки, применимые в подготовке овощных полуфабрикатов, гарниров, супов, салатов и демонстрационных практических заданий."
          }
        ),
        single("veg-t1-potato-storage", "После очистки картофеля до нарезки выберите правильный кратковременный способ хранения.", [
          ["a", "в сухом закрытом лотке до конца смены"],
          ["b", "в чистой холодной воде под контролем времени"],
          ["c", "на рабочем столе под сухой салфеткой"],
          ["d", "в одной емкости с очистками до уборки"]
        ], "b"),
        multiple("veg-t1-equipment", "Перед началом смены выберите оборудование, которое должно быть подготовлено на овощном участке.", [
          ["a", "картофелечистка"],
          ["b", "овощерезка"],
          ["c", "моечная ванна"],
          ["d", "мясорубка МИМ-82"]
        ], ["a", "b", "c"]),
        single("veg-t1-recipe-book", "Студент рассчитывает сырье по одной рецептуре из сборника. Какое действие приведет к неверному расчету и его нужно исключить?", [
          ["a", "взять нормы брутто и нетто из выбранной рецептуры"],
          ["b", "сверить выход полуфабриката по нужной колонке"],
          ["c", "взять брутто из одной колонки, а нетто из другой без пересчета"],
          ["d", "проверить единицы измерения перед записью заявки"]
        ], "c"),
        single("veg-t1-spices", "При оформлении заявки на пряности выберите верное производственное определение этой группы сырья.", [
          ["a", "основное овощное сырье для гарниров"],
          ["b", "продукты растительного происхождения, придающие вкус и аромат"],
          ["c", "минеральные вещества для посола сырья"],
          ["d", "готовые соусы и маринады"]
        ], "b"),
        single("veg-t1-storage", "Овощные полуфабрикаты нужно оставить на короткое время до дальнейшей работы. Какой способ размещения допустим?", [
          ["a", "оставить нарезанные овощи открытыми в общей рабочей зоне"],
          ["b", "положить овощи в чистую тару и накрыть влажной тканью"],
          ["c", "сложить очищенный картофель в сухой лоток без воды"],
          ["d", "держать зелень рядом с немытыми корнеплодами"]
        ], "b")
      ],
      calculation: [
        calculation(
          "veg-calc-potato",
          "Нужно получить 18 кг очищенного картофеля. Отходы при обработке — 30 %. Определите массу картофеля брутто и массу отходов.",
          ["М брутто = М нетто × 100 / (100 − W)", "М отходов = М брутто − М нетто"],
          [
            { id: "grossKg", label: "Масса брутто", unit: "кг", expected: 25.71, tolerance: 0.01 },
            { id: "wasteKg", label: "Масса отходов", unit: "кг", expected: 7.71, tolerance: 0.01 }
          ],
          ["М брутто = 18 × 100 / 70 = 25,71 кг", "М отходов = 25,71 − 18 = 7,71 кг"]
        ),
        calculation(
          "veg-calc-salad",
          "Нужно приготовить 40 порций салата. На 1 порцию: капуста — 80 г нетто, морковь — 20 г нетто, лук — 8 г нетто. Отходы: капуста — 20 %, морковь — 20 %, лук — 16 %. Определите брутто.",
          ["М брутто = М нетто × 100 / (100 − W)"],
          [
            { id: "cabbageKg", label: "Капуста", unit: "кг", expected: 4, tolerance: 0.01 },
            { id: "carrotKg", label: "Морковь", unit: "кг", expected: 1, tolerance: 0.01 },
            { id: "onionKg", label: "Лук", unit: "кг", expected: 0.38, tolerance: 0.01 }
          ],
          ["Капуста: 3,2 кг нетто → 4 кг брутто", "Морковь: 0,8 кг → 1 кг", "Лук: 0,32 кг → 0,38 кг"]
        ),
        bucket(
          "veg-calc-violations",
          "На рабочем месте обнаружены нарушения. Соотнесите нарушение и правильное действие.",
          [
            ["dry-potato", "очищенный картофель без воды"],
            ["knife-edge", "нож на краю стола"],
            ["waste-near", "отходы рядом с чистыми овощами"],
            ["no-label", "доска без маркировки"]
          ],
          [
            ["water", "поместить в холодную воду"],
            ["safe", "убрать безопасно"],
            ["remove", "удалить в отдельную тару"],
            ["board", "заменить на промаркированную доску"]
          ],
          { "dry-potato": "water", "knife-edge": "safe", "waste-near": "remove", "no-label": "board" },
          { maxScore: 10 }
        )
      ],
      voice: voice(
        "veg-voice",
        "Объясните организацию работы овощного цеха при обработке овощей и грибов.",
        ["назначение овощного цеха", "чистота стола, досок, ножей и ванн", "сортировка, калибровка, мойка, очистка, доочистка, нарезка", "формы нарезки", "обработка грибов", "хранение картофеля и корнеплодов", "уборка рабочего места"],
        { exemplar: commonRubric }
      ),
      simulation: [
        sequence(
          "veg-sim-chain",
          "Расставьте этапы обработки овощей.",
          [
            [
              "sort",
              "сортировка",
              {
                image: "/assets/pm01/process/veg-sort.png",
                detail: "Отобрать качественное сырье и удалить непригодные овощи."
              }
            ],
            [
              "calibrate",
              "калибровка",
              {
                image: "/assets/pm01/process/veg-calibrate.png",
                detail: "Разделить овощи на крупные, средние и мелкие партии."
              }
            ],
            [
              "wash",
              "мойка",
              {
                image: "/assets/pm01/process/veg-wash.png",
                detail: "Вымыть овощи проточной водой перед очисткой."
              }
            ],
            [
              "peel",
              "очистка",
              {
                image: "/assets/pm01/process/veg-peel.png",
                detail: "Снять кожуру и собрать отходы отдельно от чистого сырья."
              }
            ],
            [
              "finish",
              "доочистка",
              {
                image: "/assets/pm01/process/veg-finish.png",
                detail: "Удалить глазки, остатки кожуры и точечные дефекты."
              }
            ],
            [
              "rinse",
              "промывание после доочистки",
              {
                image: "/assets/pm01/process/veg-rinse.png",
                detail: "Промыть очищенные клубни и держать их в чистой холодной воде при кратковременном хранении."
              }
            ],
            [
              "cut",
              "нарезка",
              {
                image: "/assets/pm01/process/veg-cut.png",
                detail: "Выполнить нарезку выбранной формы на чистой доске."
              }
            ]
          ],
          ["sort", "calibrate", "wash", "peel", "finish", "rinse", "cut"],
          { maxScore: 6 }
        ),
        bucket(
          "veg-sim-cuts",
          "Соотнесите форму нарезки с типичным применением в подготовке овощных полуфабрикатов.",
          cutApplicationItems,
          cutApplicationBuckets,
          cutApplicationCorrect,
          {
            maxScore: 6,
            visualMode: "cut_shapes",
            interactionHint: "Перенесите название формы на карточку с изображением и применением.",
            explanation:
              "Задание проверяет не запоминание иностранного слова, а практический выбор формы под дальнейшее использование полуфабриката."
          }
        ),
        qualityControl(
          "veg-sim-quality",
          "Проведите контроль качества овощных полуфабрикатов перед передачей в производство.",
          [
            [
              "potato-batonnet-ready",
              "Картофель брусочками",
              {
                image: generatedSemiFinishedProductAssets.generatedPotatoBatonnet,
                status: "карта контроля: чистая тара, холодная вода, маркировка есть",
                detail: "Форма ровная, потемнения нет, партия готова к кратковременному хранению и дальнейшей тепловой обработке.",
                signals: ["ровная нарезка", "чистая вода", "маркировка партии"],
                risk: "низкий"
              }
            ],
            [
              "mirepoix-no-label",
              "Смесь mirepoix без маркировки",
              {
                image: generatedSemiFinishedProductAssets.generatedMixedMirepoix,
                status: "карта контроля: чистая тара, но нет даты и времени приготовления",
                detail: "Внешний вид безопасный, однако партию нельзя передавать без полной маркировки.",
                signals: ["нет даты", "нет времени", "нужно указать условия хранения"],
                risk: "средний"
              }
            ],
            [
              "greens-slime",
              "Шинкованная зелень с признаками порчи",
              {
                image: semiFinishedProductAssets.vegGreensChiffonadeReady,
                status: "карта контроля: влажная масса, посторонний запах, слизистая поверхность",
                detail: "При таких признаках зелень не исправляют промыванием и не смешивают с качественной партией.",
                signals: ["посторонний запах", "слизистая поверхность", "повышенный риск загрязнения"],
                risk: "высокий"
              }
            ],
            [
              "potato-open-tray",
              "Картофель соломкой в открытом лотке",
              {
                image: vegetablePhotoCutAssets.potatoAllumette,
                status: "карта контроля: лоток открыт, тара без крышки, партия стоит вне охлаждаемой зоны",
                detail: "Продукт не бракуется по внешнему виду, но условия хранения нужно немедленно исправить.",
                signals: ["открытая тара", "нет охлаждения", "нужна защита от загрязнения"],
                risk: "средний"
              }
            ]
          ],
          {
            "potato-batonnet-ready": "accept",
            "mirepoix-no-label": "correct",
            "greens-slime": "reject",
            "potato-open-tray": "correct"
          }
        ),
        hotspot("veg-sim-hotspot", "Найдите нарушения на овощном участке.", "/assets/pm01/violations/vegetable.png", [
          { id: "dry-potato", label: "Очищенный картофель хранится без воды", x: 22, y: 72, radius: 12 },
          { id: "knife", label: "Нож лежит на краю стола и выступает за край", x: 86, y: 76, radius: 10 },
          { id: "waste", label: "Отходы находятся рядом с чистыми овощами", x: 82, y: 49, radius: 11 },
          { id: "no-label-board", label: "Разделочная доска без маркировки участка", x: 55, y: 70, radius: 12 }
        ], { maxScore: 6 }),
        calculation(
          "veg-sim-request",
          "Заполните мини-заявку на сырье. Данные расчета: для салата на 40 порций нужно капусты — 4,00 кг брутто, моркови — 1,00 кг брутто, лука — 0,38 кг брутто; для получения 18 кг очищенного картофеля нужно 25,71 кг картофеля брутто.",
          ["В заявку вносится масса брутто по каждому виду сырья.", "Можно свериться с расчетами модуля 2, но все исходные данные указаны в тексте задания."],
          [
            { id: "cabbageKg", label: "Капуста", unit: "кг", expected: 4, tolerance: 0.01 },
            { id: "carrotKg", label: "Морковь", unit: "кг", expected: 1, tolerance: 0.01 },
            { id: "onionKg", label: "Лук", unit: "кг", expected: 0.38, tolerance: 0.01 },
            { id: "potatoKg", label: "Картофель", unit: "кг", expected: 25.71, tolerance: 0.01 }
          ],
          ["Капуста 4,00 кг; морковь 1,00 кг; лук 0,38 кг; картофель 25,71 кг."],
          { maxScore: 6 }
        )
      ]
    },
    {
      id: "fish",
      number: 2,
      title: "Рыбный цех",
      shortTitle: "Рыба",
      icon: "fish",
      accent: "#0b6d8b",
      image: "/assets/pm01/fish-workshop.png",
      scenario:
        "Студент работает в рыбном или мясорыбном цехе. Нужно проверить качество рыбы, организовать рабочее место, подобрать инвентарь, определить способ обработки, рассчитать выход и подготовить полуфабрикаты.",
      competencies: ["ПК 1.1", "ПК 1.2", "ПК 1.3", "ОК 01", "ОК 02", "ОК 07"],
      test: [
        single("fish-t1-groups", "При планировании обработки партии рыбы выберите технологическую группу по особенностям первичной обработки.", [
          ["a", "охлажденную, мороженую, соленую"],
          ["b", "чешуйчатую, бесчешуйчатую, осетровую"],
          ["c", "натуральную, панированную, рубленую"],
          ["d", "крупную и мелкую"]
        ], "b"),
        single("fish-t1-board", "Для разделки сырой рыбы выберите правильную маркировку разделочной доски.", [["a", "МС"], ["b", "РС"], ["c", "ВО"], ["d", "ХК"]], "b"),
        single("fish-t1-scale", "При очистке чешуйчатой рыбы выберите направление движения инструмента.", [["a", "от головы к хвосту"], ["b", "от хвоста к голове"], ["c", "сверху вниз"], ["d", "по кругу"]], "b"),
        multiple("fish-t1-quality", "При приемке рыбы выберите признаки доброкачественного сырья.", [["a", "прозрачные глаза"], ["b", "ярко-красные жабры"], ["c", "плотная упругая мякоть"], ["d", "неприятный запах"]], ["a", "b", "c"]),
        single("fish-t1-ro1", "Для подготовки партии чешуйчатой рыбы выберите назначение рыбоочистительной машины РО-1.", [["a", "для снятия кожи с бесчешуйчатой рыбы"], ["b", "для удаления чешуи"], ["c", "для порционирования рыбного филе"], ["d", "для перемешивания котлетной массы"]], "b"),
        single("fish-t1-breading", "Перед жаркой порционного рыбного полуфабриката студент выполняет панирование. Какова технологическая цель этой операции?", [["a", "сохранить сочность и получить корочку"], ["b", "обнаружить недоброкачественную рыбу после разделки"], ["c", "ускорить размораживание полуфабриката"], ["d", "уточнить массу брутто сырья"]], "a"),
        sequence("fish-t1-cutlet", "Для рыбных котлет установите порядок приготовления котлетной массы.", [["fillet", "разделать на филе"], ["bread", "замочить хлеб"], ["grind", "измельчить филе и подготовленный хлеб"], ["mix", "соединить компоненты"], ["spice", "добавить соль/перец"], ["beat", "вымешать и выбить"]], ["fillet", "bread", "grind", "mix", "spice", "beat"]),
        single("fish-t1-storage", "Сформованные рыбные полуфабрикаты ждут тепловой обработки. Где их нужно держать, чтобы не нарушить безопасность?", [["a", "в холодильнике, но в открытой непредназначенной таре"], ["b", "в холодильнике в чистой таре"], ["c", "на рабочем столе под салфеткой до жарки"], ["d", "вблизи теплового оборудования, чтобы быстрее начать жарку"]], "b"),
        multiple("fish-t1-seafood", "При комплектовании сырья выберите позиции, которые относятся к нерыбному водному сырью.", [["a", "креветки"], ["b", "мидии"], ["c", "кальмары"], ["d", "говядина"]], ["a", "b", "c"]),
        single("fish-t1-danger", "На рыбном участке одновременно работают с сырой рыбой и уже подготовленными овощами. Какую ситуацию нужно немедленно исправить из-за риска перекрестного загрязнения?", [["a", "рыбу разделывают на доске с маркировкой РС"], ["b", "рыбные отходы убирают в отдельную тару"], ["c", "рыбу промывают холодной водой после разделки"], ["d", "сырая рыба соприкасается с готовыми овощными полуфабрикатами"]], "d")
      ],
      calculation: [
        calculation("fish-calc-net", "В цех поступило 12 кг рыбы. Отходы при обработке составляют 28 %. Определите массу отходов и массу рыбы нетто.", ["М отходов = М брутто × W / 100", "М нетто = М брутто − М отходов"], [
          { id: "wasteKg", label: "Масса отходов", unit: "кг", expected: 3.36, tolerance: 0.01 },
          { id: "netKg", label: "Масса нетто", unit: "кг", expected: 8.64, tolerance: 0.01 }
        ], ["М отходов = 12 × 28 / 100 = 3,36 кг", "М нетто = 12 − 3,36 = 8,64 кг"]),
        calculation("fish-calc-gross", "Нужно приготовить 25 порций рыбы по 160 г нетто. Отходы при обработке — 20 %. Сколько рыбы брутто нужно взять?", ["М нетто = n × m", "М брутто = М нетто × 100 / (100 − W)"], [
          { id: "netKg", label: "Масса нетто", unit: "кг", expected: 4, tolerance: 0.01 },
          { id: "grossKg", label: "Масса брутто", unit: "кг", expected: 5, tolerance: 0.01 }
        ], ["25 × 160 г = 4000 г = 4 кг", "М брутто = 4 × 100 / 80 = 5 кг"]),
        calculation("fish-calc-cutlets", "Нужно приготовить 60 рыбных котлет. По учебной рецептуре на 1 котлету берут: филе — 49 г, хлеб — 14 г, жидкость — 11 г, соль и специи — 1 г. Рассчитайте массу компонентов на всю партию в килограммах.", ["Компонент партии = масса на 1 котлету × количество", "Граммы перевести в килограммы: г / 1000"], [
          { id: "filletKg", label: "Филе", unit: "кг", expected: 2.94, tolerance: 0.01 },
          { id: "breadKg", label: "Хлеб", unit: "кг", expected: 0.84, tolerance: 0.01 },
          { id: "liquidKg", label: "Жидкость", unit: "кг", expected: 0.66, tolerance: 0.01 },
          { id: "spiceKg", label: "Соль и специи", unit: "кг", expected: 0.06, tolerance: 0.01 }
        ], ["Филе = 49 × 60 = 2940 г = 2,94 кг", "Хлеб = 14 × 60 = 840 г = 0,84 кг", "Жидкость = 11 × 60 = 660 г = 0,66 кг", "Соль и специи = 1 × 60 = 60 г = 0,06 кг"])
      ],
      voice: voice("fish-voice", "Объясните порядок организации рабочего места и обработки чешуйчатой рыбы для приготовления полуфабрикатов.", ["рыбный или мясорыбный цех", "доска РС", "ножи, скребок, лотки, весы", "проверка качества по запаху, глазам, жабрам и мякоти", "очистка от хвоста к голове", "потрошение, промывание, нарезка", "хранение в холодильнике"], { exemplar: commonRubric }),
      simulation: [
        sequence(
          "fish-sim-chain",
          "Соберите технологическую цепочку обработки рыбы.",
          [
            [
              "quality",
              "проверка качества",
              {
                image: "/assets/pm01/fish-process/fish-quality.png",
                detail: "Оценить внешний вид, глаза, жабры, запах и упругость мякоти до начала обработки."
              }
            ],
            [
              "defrost",
              "размораживание",
              {
                image: "/assets/pm01/fish-process/fish-defrost.png",
                detail: "Размораживать в охлаждаемой зоне одним слоем, без горячей воды и загрязнения стола."
              }
            ],
            [
              "scale",
              "очистка чешуи",
              {
                image: "/assets/pm01/fish-process/fish-scale.png",
                detail: "Снимать чешую скребком от хвоста к голове, удерживая рыбу на доске РС."
              }
            ],
            [
              "gut",
              "потрошение",
              {
                image: "/assets/pm01/fish-process/fish-gut.png",
                detail: "Аккуратно удалить внутренности и направить отходы в отдельную тару."
              }
            ],
            [
              "trim",
              "удаление плавников/головы",
              {
                image: "/assets/pm01/fish-process/fish-trim.png",
                detail: "Удалить плавники и лишние части, сохраняя чистоту доски и рабочей зоны."
              }
            ],
            [
              "rinse",
              "промывание",
              {
                image: "/assets/pm01/fish-process/fish-rinse.png",
                detail: "Промыть обработанную рыбу холодной водой и дать стечь воде."
              }
            ],
            [
              "portion",
              "нарезка/формование",
              {
                image: "/assets/pm01/fish-process/fish-portioning.png",
                detail: "Нарезать филе или тушку на ровные порционные полуфабрикаты заданной массы."
              }
            ],
            [
              "cool",
              "охлаждение",
              {
                image: "/assets/pm01/fish-process/fish-cooling.png",
                detail: "Уложить полуфабрикаты в чистую закрытую тару и хранить в охлаждении."
              }
            ]
          ],
          ["quality", "defrost", "scale", "gut", "trim", "rinse", "portion", "cool"],
          { maxScore: 6 }
        ),
        multiple("fish-sim-inventory", "Выберите инвентарь рыбного участка.", [["board", "доска РС"], ["knife", "нож"], ["scaler", "рыбочистка"], ["scraper", "нож-скребок"], ["trays", "лотки"], ["scales", "весы"], ["fridge", "холодильный шкаф"], ["table", "стол"], ["boning", "обвалочный нож"]], ["board", "knife", "scaler", "scraper", "trays", "scales", "fridge", "table"], { maxScore: 6 }),
        hotspot("fish-sim-hotspot", "Найдите нарушения в рыбном цехе.", "/assets/pm01/violations/fish.png", [
          { id: "no-cooling", label: "Рыба находится в теплой зоне без охлаждения", x: 51, y: 48, radius: 12 },
          { id: "raw-ready", label: "Сырая рыба соприкасается с готовыми овощами", x: 78, y: 57, radius: 11 },
          { id: "waste", label: "Отходы/нечистая тара оставлены на рабочем столе", x: 18, y: 51, radius: 10 },
          { id: "knife", label: "Нож лежит на краю стола", x: 56, y: 81, radius: 10 }
        ], { maxScore: 6 }),
        bucket(
          "fish-sim-products",
          "Распределите рыбные полуфабрикаты по группам.",
          [
            [
              "fillet",
              "филе рыбы",
              {
                image: generatedSemiFinishedProductAssets.generatedFishFilletPortions,
                detail: "Пласт мякоти без костей; используется как натуральный полуфабрикат."
              }
            ],
            [
              "portion",
              "порционный кусок",
              {
                image: semiFinishedProductAssets.fishPortionPieces,
                detail: "Ровные куски заданной массы для жарки, припускания или запекания."
              }
            ],
            [
              "breaded",
              "рыба панированная",
              {
                image: generatedSemiFinishedProductAssets.generatedFishSticksBreaded,
                detail: "Порционные куски, подготовленные с панировкой перед жаркой."
              }
            ],
            [
              "cutlets",
              "рыбные котлеты",
              {
                image: generatedSemiFinishedProductAssets.generatedFishCutlets,
                detail: "Изделия из рыбной котлетной массы, сформованные порционно."
              }
            ],
            [
              "mince",
              "рыбная котлетная масса",
              {
                image: semiFinishedProductAssets.fishMinceMass,
                detail: "Измельченная рыбная мякоть с хлебом, жидкостью, солью и специями."
              }
            ]
          ],
          [
            ["natural", "натуральные"],
            ["breaded", "панированные"],
            ["chopped", "рубленые изделия"],
            ["mass", "котлетная масса"]
          ],
          { fillet: "natural", portion: "natural", breaded: "breaded", cutlets: "chopped", mince: "mass" },
          {
            maxScore: 6,
            visualMode: "product_cards",
            interactionHint: "Рассмотрите изображение полуфабриката и перенесите карточку в правильную группу."
          }
        ),
        qualityControl(
          "fish-sim-quality",
          "Проведите контроль качества рыбных полуфабрикатов перед охлаждением и передачей на тепловую обработку.",
          [
            [
              "fillet-chilled",
              "Филе рыбы порционное",
              {
                image: generatedSemiFinishedProductAssets.generatedFishFilletPortions,
                status: "карта контроля: упругая мякоть, чистый запах, тара закрыта, температура хранения соблюдена",
                detail: "Партия соответствует натуральному рыбному полуфабрикату и может быть направлена дальше по заданию.",
                signals: ["упругая мякоть", "чистый запах", "закрытая тара"],
                risk: "низкий"
              }
            ],
            [
              "mince-open-warm",
              "Рыбная котлетная масса",
              {
                image: semiFinishedProductAssets.fishMinceMass,
                status: "карта контроля: тара открыта, масса стоит вне холодильника, маркировка частичная",
                detail: "Если нет признаков порчи, нужно немедленно закрыть, промаркировать и вернуть в холод.",
                signals: ["открытая тара", "нет полного ярлыка", "нарушен режим охлаждения"],
                risk: "средний"
              }
            ],
            [
              "steak-sour",
              "Стейки рыбы с сомнительным запахом",
              {
                image: semiFinishedProductAssets.fishSteakCrosscut,
                status: "карта контроля: кислый запах, рыхлая мякоть, жидкость мутная",
                detail: "Органолептические признаки недоброкачественности требуют браковки и сообщения ответственному лицу.",
                signals: ["кислый запах", "рыхлая мякоть", "мутная жидкость"],
                risk: "высокий"
              }
            ],
            [
              "breaded-mixed",
              "Панированные рыбные полуфабрикаты",
              {
                image: generatedSemiFinishedProductAssets.generatedFishSticksBreaded,
                status: "карта контроля: внешний вид нормальный, но лоток стоит рядом с сырой рыбой без разделения потоков",
                detail: "Панированный полуфабрикат нужно изолировать от сырой рыбы и перенести в чистую закрытую тару.",
                signals: ["риск перекрестного загрязнения", "нужно раздельное хранение", "закрыть тару"],
                risk: "средний"
              }
            ]
          ],
          {
            "fillet-chilled": "accept",
            "mince-open-warm": "correct",
            "steak-sour": "reject",
            "breaded-mixed": "correct"
          },
          {
            competencyTags: ["ПК 1.1", "ПК 1.2", "ПК 1.3", "ОК 01", "ОК 02", "ОК 07"]
          }
        )
      ]
    },
    {
      id: "meat",
      number: 3,
      title: "Мясной цех",
      shortTitle: "Мясо",
      icon: "beef",
      accent: "#8b3f2f",
      image: "/assets/pm01/meat-workshop.png",
      scenario:
        "Студент работает в мясном цехе. Нужно определить вид мясного сырья, подобрать инструменты, организовать рабочее место, рассчитать выход полуфабрикатов, выполнить задания по котлетной массе, мясорубке и технике безопасности.",
      competencies: ["ПК 1.1", "ПК 1.2", "ПК 1.4", "ОК 01", "ОК 02", "ОК 07"],
      test: [
        multiple("meat-t1-raw", "При приемке сырья для мясного цеха выберите позиции, относящиеся к мясному сырью.", [["a", "говядина"], ["b", "свинина"], ["c", "баранина"], ["d", "рыбное филе"]], ["a", "b", "c"]),
        multiple("meat-t1-products", "Для производственного задания выберите группы полуфабрикатов, относящиеся к мясным.", [["a", "крупнокусковые"], ["b", "порционные"], ["c", "мелкокусковые"], ["d", "рыбные"]], ["a", "b", "c"]),
        single("meat-t1-boning", "На обвалочном столе нужно отделить мякоть от костей. Какой нож выбирает студент?", [["a", "обвалочный нож"], ["b", "кондитерский нож"], ["c", "овощной нож"], ["d", "нож-скребок для рыбы"]], "a"),
        single("meat-t1-musat", "Перед нарезкой мяса нож стал хуже резать. Для чего студент использует мусат на рабочем месте?", [["a", "для правки режущей кромки ножа"], ["b", "для отбивания порционных кусков"], ["c", "для зачистки костей от мякоти"], ["d", "для перемешивания котлетной массы"]], "a"),
        multiple("meat-t1-mincer", "Перед сборкой МИМ-82 выберите основные элементы мясорубки.", [["a", "корпус"], ["b", "шнек"], ["c", "ножи и решетки"], ["d", "овощерезательный диск"]], ["a", "b", "c"]),
        single("meat-t1-pusher", "Кусок мяса застрял в приемной горловине мясорубки. Чем разрешено продвигать сырье?", [["a", "рукой"], ["b", "ножом"], ["c", "штатным толкателем или деревянным пестиком"], ["d", "вилкой"]], "c"),
        multiple("meat-t1-offal", "При сортировке сырья выберите продукты, относящиеся к субпродуктам.", [["a", "печень"], ["b", "почки"], ["c", "язык"], ["d", "куриное филе"]], ["a", "b", "c"]),
        single("meat-t1-offal-fast", "В сменном задании есть печень, почки и язык. Почему эти субпродукты обрабатывают без задержки и держат под охлаждением?", [["a", "они относятся к особо скоропортящемуся сырью"], ["b", "они не требуют отдельной чистой тары после зачистки"], ["c", "их можно обрабатывать после основной партии без охлаждения"], ["d", "их относят к сырью с обычным режимом хранения на время смены"]], "a"),
        single("meat-t1-forbidden", "Студент заметил, что мясорубка МИМ-82 забилась во время работы. Какое действие запрещено выполнять до полной остановки и отключения машины от сети?", [["a", "остановить машину кнопкой и дождаться прекращения вращения"], ["b", "снимать решетку, нож или шнек у включенной машины"], ["c", "сообщить преподавателю о неисправности"], ["d", "после отключения разобрать и вымыть снятые детали"]], "b"),
        single("meat-t1-small", "Для заявки на полуфабрикаты выберите позицию, относящуюся к мелкокусковым.", [["a", "гуляш"], ["b", "антрекот"], ["c", "бифштекс натуральный"], ["d", "лопаточная часть крупным куском"]], "a")
      ],
      calculation: [
        calculation("meat-calc-net", "В мясной цех поступило 40 кг говядины. Отходы и потери при обработке — 26 %. Определите массу отходов и массу полуфабриката нетто.", ["М отходов = М брутто × W / 100", "М нетто = М брутто − М отходов"], [
          { id: "wasteKg", label: "Масса отходов", unit: "кг", expected: 10.4, tolerance: 0.01 },
          { id: "netKg", label: "Масса нетто", unit: "кг", expected: 29.6, tolerance: 0.01 }
        ], ["М отходов = 40 × 26 / 100 = 10,4 кг", "М нетто = 40 − 10,4 = 29,6 кг"]),
        calculation("meat-calc-cutlets", "Нужно приготовить 50 котлет. По учебной рецептуре на 1 котлету берут: мясо — 53 г, хлеб — 11 г, вода — 10 г, соль и специи — 1 г. Рассчитайте массу компонентов на всю партию в килограммах.", ["Компонент партии = масса на 1 котлету × количество", "Граммы перевести в килограммы: г / 1000"], [
          { id: "meatKg", label: "Мясо", unit: "кг", expected: 2.65, tolerance: 0.01 },
          { id: "breadKg", label: "Хлеб", unit: "кг", expected: 0.55, tolerance: 0.01 },
          { id: "waterKg", label: "Вода", unit: "кг", expected: 0.5, tolerance: 0.01 },
          { id: "spiceKg", label: "Соль и специи", unit: "кг", expected: 0.05, tolerance: 0.01 }
        ], ["Мясо = 53 × 50 = 2650 г = 2,65 кг", "Хлеб = 11 × 50 = 550 г = 0,55 кг", "Вода = 10 × 50 = 500 г = 0,50 кг", "Соль и специи = 1 × 50 = 50 г = 0,05 кг"]),
        bucket("meat-calc-safety", "Укажите нарушения и действия при приготовлении рубленой массы.", [["wrong-assembly", "мясорубка собрана неправильно"], ["knives-sink", "ножи лежат в мойке"], ["hand-push", "мясо проталкивают рукой"], ["warm-mince", "фарш стоит без охлаждения"]], [["stop", "остановить и собрать по инструкции"], ["wash", "вымыть, просушить и убрать"], ["pusher", "использовать толкатель"], ["cool", "охладить или использовать по технологии"]], { "wrong-assembly": "stop", "knives-sink": "wash", "hand-push": "pusher", "warm-mince": "cool" }, { maxScore: 10 })
      ],
      voice: voice("meat-voice", "Объясните организацию рабочего места для приготовления полуфабрикатов из котлетной массы и правила безопасной эксплуатации мясорубки.", ["мясной цех", "стол, доска, ножи, лотки, весы, мясорубка, холодильник", "проверка мяса", "зачистка и нарезка", "правильная сборка мясорубки", "запрет проталкивания рукой", "отключение перед разборкой", "мытье, сушка деталей и охлаждение фарша"], { exemplar: commonRubric }),
      simulation: [
        bucket(
          "meat-sim-tools",
          "Соотнесите инструмент и назначение.",
          [
            [
              "boning",
              "обвалочный нож",
              {
                image: "/assets/pm01/meat-tools/boning-knife.png",
                detail: "Узкий нож для отделения мякоти от костей и зачистки сырья."
              }
            ],
            [
              "cleaver",
              "нож-рубак",
              {
                image: "/assets/pm01/meat-tools/cleaver.png",
                detail: "Тяжелый широкий нож для разрубания крупных частей и костного сырья."
              }
            ],
            [
              "musat",
              "мусат",
              {
                image: "/assets/pm01/meat-tools/musat.png",
                detail: "Стальной стержень для правки режущей кромки ножа перед работой."
              }
            ],
            [
              "mallet",
              "тяпка для отбивания",
              {
                image: "/assets/pm01/meat-tools/mallet.png",
                detail: "Инструмент для аккуратного отбивания порционных кусков через пищевую пленку."
              }
            ],
            [
              "scale",
              "весы",
              {
                image: "/assets/pm01/meat-tools/scale.png",
                detail: "Весы используют для контроля массы сырья и готовых полуфабрикатов."
              }
            ]
          ],
          [["bone", "отделение мяса от костей"], ["cut", "разрубание"], ["straighten", "правка"], ["beat", "отбивание"], ["mass", "контроль массы"]],
          { boning: "bone", cleaver: "cut", musat: "straighten", mallet: "beat", scale: "mass" },
          {
            maxScore: 6,
            visualMode: "product_cards",
            interactionHint: "Рассмотрите инструмент и перенесите карточку к его назначению."
          }
        ),
        sequence(
          "meat-sim-mincer",
          "Соберите мясорубку из карточек.",
          [
            [
              "body",
              "корпус",
              {
                image: "/assets/pm01/meat-grinder/body.png",
                detail: "Основной металлический корпус машины устанавливают первым."
              }
            ],
            [
              "screw",
              "шнек",
              {
                image: "/assets/pm01/meat-grinder/screw.png",
                detail: "Шнек подает сырье вперед к режущему узлу."
              }
            ],
            [
              "knife",
              "нож",
              {
                image: "/assets/pm01/meat-grinder/knife.png",
                detail: "Крестообразный нож ставят после шнека режущей частью к решетке."
              }
            ],
            [
              "plate",
              "решетка",
              {
                image: "/assets/pm01/meat-grinder/plate.png",
                detail: "Решетка с отверстиями формирует фракцию измельченного сырья."
              }
            ],
            [
              "nut",
              "нажимная гайка",
              {
                image: "/assets/pm01/meat-grinder/nut.png",
                detail: "Гайка фиксирует нож и решетку в передней части мясорубки."
              }
            ],
            [
              "hopper",
              "загрузочное устройство",
              {
                image: "/assets/pm01/meat-grinder/hopper.png",
                detail: "Лоток и загрузочная горловина направляют сырье к шнеку."
              }
            ]
          ],
          ["body", "screw", "knife", "plate", "nut", "hopper"],
          { maxScore: 6 }
        ),
        qualityControl(
          "meat-sim-quality",
          "Проведите контроль качества мясных полуфабрикатов после формования и перед передачей в холод.",
          [
            [
              "goulash-ready",
              "Гуляш из говядины",
              {
                image: generatedSemiFinishedProductAssets.generatedMeatGoulashCubes,
                status: "карта контроля: куски одинакового размера, запах свойственный, тара закрыта и промаркирована",
                detail: "Мелкокусковой полуфабрикат подготовлен аккуратно и может быть передан на хранение или тепловую обработку.",
                signals: ["ровная нарезка", "чистая тара", "есть маркировка"],
                risk: "низкий"
              }
            ],
            [
              "cutlet-mass-warm",
              "Порции котлетной массы",
              {
                image: semiFinishedProductAssets.meatCutletMassPortions,
                status: "карта контроля: масса стоит открыто, температура выше допустимой, этикетка неполная",
                detail: "Партия требует немедленного охлаждения, закрытой тары и полной маркировки, если нет признаков порчи.",
                signals: ["открытая тара", "нарушен холод", "неполная маркировка"],
                risk: "средний"
              }
            ],
            [
              "bones-spoilage",
              "Кости для бульона с признаками порчи",
              {
                image: semiFinishedProductAssets.meatBonesForBroth,
                status: "карта контроля: липкая поверхность, кислый запах, потемнение на срезах",
                detail: "Такое сырье нельзя использовать даже для бульона; партия подлежит браковке.",
                signals: ["кислый запах", "липкая поверхность", "потемнение"],
                risk: "высокий"
              }
            ],
            [
              "schnitzel-no-date",
              "Панированный шницель",
              {
                image: generatedSemiFinishedProductAssets.generatedMeatBreadedSchnitzel,
                status: "карта контроля: внешний вид ровный, но на таре нет даты и времени изготовления",
                detail: "Перед передачей в холодильник нужно оформить маркировку и проверить срок дальнейшего хранения.",
                signals: ["нет даты", "нет времени", "нужно указать срок"],
                risk: "средний"
              }
            ]
          ],
          {
            "goulash-ready": "accept",
            "cutlet-mass-warm": "correct",
            "bones-spoilage": "reject",
            "schnitzel-no-date": "correct"
          },
          {
            competencyTags: ["ПК 1.1", "ПК 1.2", "ПК 1.4", "ОК 01", "ОК 02", "ОК 07"]
          }
        ),
        hotspot("meat-sim-hotspot", "Найдите нарушения в мясном цехе.", "/assets/pm01/violations/meat.png", [
          { id: "hand", label: "Мясорубка работает с сырьем в загрузочной зоне без видимого толкателя", x: 34, y: 43, radius: 11 },
          { id: "no-cold", label: "Фарш/мясной полуфабрикат находится без охлаждения", x: 67, y: 57, radius: 12 },
          { id: "knives", label: "Ножи оставлены небезопасно в рабочей зоне", x: 24, y: 82, radius: 12 },
          { id: "knife-edge", label: "Нож лежит на краю стола", x: 86, y: 82, radius: 10 }
        ], { maxScore: 6 }),
        sequence("meat-sim-finish", "Расставьте порядок действий после работы с мясорубкой.", [["off", "отключить"], ["stop", "дождаться остановки"], ["disassemble", "разобрать"], ["wash", "вымыть"], ["disinfect", "продезинфицировать"], ["dry", "просушить"], ["store", "убрать место"]], ["off", "stop", "disassemble", "wash", "disinfect", "dry", "store"], { maxScore: 6 })
      ]
    },
    {
      id: "poultry",
      number: 4,
      title: "Птица, дичь, кролик",
      shortTitle: "Птица",
      icon: "bird",
      accent: "#b46b1f",
      image: "/assets/pm01/poultry-workshop.png",
      scenario:
        "Студент работает с домашней птицей, дичью и кроликом. Нужно оценить качество тушек, организовать рабочее место, выполнить расчет выхода, выбрать полуфабрикаты и определить ошибки санитарии.",
      competencies: ["ПК 1.1", "ПК 1.2", "ПК 1.4", "ОК 01", "ОК 02", "ОК 07"],
      test: [
        multiple("poultry-t1-quality", "При приемке тушек птицы студент проводит органолептическую оценку. Какие признаки нужно проверить?", [["a", "запах"], ["b", "цвет кожи и мышц"], ["c", "консистенция тканей"], ["d", "массу транспортной тары"]], ["a", "b", "c"]),
        multiple("poultry-t1-defects", "При входном контроле тушки птицы студент видит несколько признаков. Какие признаки требуют забраковать сырье и сообщить преподавателю?", [["a", "плесневение"], ["b", "позеленение тканей"], ["c", "признаки гниения"], ["d", "чистая сухая поверхность"]], ["a", "b", "c"]),
        single("poultry-t1-defrost", "Поступила партия замороженных тушек птицы. Где правильно организовать размораживание перед обработкой?", [["a", "в охлаждаемом помещении"], ["b", "в производственном помещении без температурного контроля"], ["c", "в моечной ванне с теплой водой"], ["d", "рядом с тепловым оборудованием"]], "a"),
        single("poultry-t1-after-gut", "После потрошения тушки перед разделкой нужно удалить остатки загрязнений. Какую операцию выполняют следующей?", [["a", "промывают тушку"], ["b", "сразу формуют полуфабрикат без промывания"], ["c", "переносят тушку в холодильник без удаления загрязнений"], ["d", "кладут тушку рядом с подготовленными овощами"]], "a"),
        bucket(
          "poultry-t1-products",
          "По заданию на выпуск соотнесите полуфабрикат с группой сырья.",
          [
            [
              "fillet",
              "филе натуральное",
              {
                image: generatedSemiFinishedProductAssets.generatedChickenFillet,
                detail: "Зачищенная грудная мякоть без кости и кожи."
              }
            ],
            [
              "leg",
              "окорочок",
              {
                image: semiFinishedProductAssets.chickenLegQuarter,
                detail: "Бедро и голень вместе, полуфабрикат из птицы."
              }
            ],
            [
              "thigh-drumstick",
              "бедро и голень",
              {
                image: semiFinishedProductAssets.chickenThighDrumstick,
                detail: "Отдельные части тушки для порционирования."
              }
            ],
            [
              "rabbit",
              "порционные куски кролика",
              {
                image: generatedSemiFinishedProductAssets.generatedRabbitPortions,
                detail: "Кролик относится к сырью ПМ.01 вместе с птицей и дичью."
              }
            ],
            [
              "fish-cutlet",
              "рыбные котлеты",
              {
                image: semiFinishedProductAssets.fishCutletsFormed,
                detail: "Контрольный лишний вариант: рыбный полуфабрикат."
              }
            ]
          ],
          [
            ["poultry", "Птица, дичь, кролик"],
            ["fish", "Рыбные полуфабрикаты"]
          ],
          {
            fillet: "poultry",
            leg: "poultry",
            "thigh-drumstick": "poultry",
            rabbit: "poultry",
            "fish-cutlet": "fish"
          },
          {
            maxScore: 2,
            visualMode: "product_cards",
            interactionHint: "Перенесите карточки в правильную группу сырья."
          }
        ),
        single("poultry-t1-pin", "При дообработке тушки выберите инструмент для удаления перьевых пеньков.", [["a", "пинцет"], ["b", "обвалочный нож"], ["c", "мусат"], ["d", "нож-скребок для рыбы"]], "a"),
        single("poultry-t1-storage", "Партия полуфабрикатов из птицы ожидает тепловой обработки. Какое размещение нужно исключить из-за риска загрязнения готовой продукции?", [["a", "поставить полуфабрикаты в холодильник"], ["b", "поставить сырую птицу рядом с готовыми продуктами без упаковки"], ["c", "разместить с соблюдением товарного соседства"], ["d", "использовать чистую промаркированную тару"]], "b"),
        single("poultry-t1-rabbit", "В цех поступил кролик для приготовления полуфабрикатов. Как организовать его обработку в рамках ПМ.01?", [["a", "на участке птицы, дичи и кролика с отдельной чистой доской, ножом и лотками"], ["b", "на мясном столе сразу после говядины без смены инвентаря"], ["c", "на рыбном столе, если свободна доска с маркировкой РС"], ["d", "на овощном участке после мойки корнеплодов"]], "a"),
        single("poultry-t1-smell", "При неприятном запахе у тушки выберите правильное действие студента.", [["a", "направить тушку на обработку после повторного промывания"], ["b", "изолировать тушку в стороне и продолжить работу без сообщения"], ["c", "не использовать, сообщить преподавателю"], ["d", "добавить тушку к качественной партии для общей обработки"]], "c"),
        single("poultry-t1-place", "Перед обработкой птицы выберите правильную организацию рабочего места.", [["a", "отдельное, чистое, с доской, ножами, лотками и ванной"], ["b", "соседний стол без отдельной маркировки инвентаря"], ["c", "участок готовых овощей при свободной поверхности"], ["d", "общий стол после сырой рыбы без смены доски"]], "a")
      ],
      calculation: [
        calculation("poultry-calc-yield", "В обработку поступило 15 кг птицы. Выход подготовленной тушки составляет 68 %. Определите массу полуфабриката и отходов.", ["М полуфабриката = М брутто × выход / 100", "М отходов = М брутто − М полуфабриката"], [
          { id: "semiKg", label: "Масса полуфабриката", unit: "кг", expected: 10.2, tolerance: 0.01 },
          { id: "wasteKg", label: "Масса отходов", unit: "кг", expected: 4.8, tolerance: 0.01 }
        ], ["М полуфабриката = 15 × 68 / 100 = 10,2 кг", "М отходов = 15 − 10,2 = 4,8 кг"]),
        calculation("poultry-calc-stock", "Нужно приготовить 35 порций полуфабриката из птицы по 95 г. Добавить производственный запас 5 %. Определите общую массу.", ["М партии = n × m", "Запас = М партии × 5 / 100"], [
          { id: "baseKg", label: "Масса без запаса", unit: "кг", expected: 3.325, tolerance: 0.01 },
          { id: "stockKg", label: "Запас", unit: "кг", expected: 0.166, tolerance: 0.01 },
          { id: "totalKg", label: "Итого", unit: "кг", expected: 3.491, tolerance: 0.02 }
        ], ["35 × 95 = 3325 г = 3,325 кг", "Запас = 0,166 кг", "Всего = 3,491 кг"]),
        bucket("poultry-calc-violations", "Тушки размораживаются неправильно. Соотнесите нарушение и действие.", [["two-layers", "тушки размораживаются в два слоя"], ["touch", "тушки соприкасаются"], ["waste", "отходы лежат рядом с полуфабрикатами"], ["no-label", "маркировки нет"]], [["one", "разложить в один ряд"], ["space", "обеспечить расстояние"], ["remove", "убрать отходы отдельно"], ["mark", "промаркировать тару"]], { "two-layers": "one", touch: "space", waste: "remove", "no-label": "mark" }, { maxScore: 10 })
      ],
      voice: voice("poultry-voice", "Объясните технологический процесс обработки домашней птицы и подготовки полуфабрикатов.", ["проверка качества по виду, запаху, цвету и консистенции", "чистое рабочее место", "ножи, доски, лотки, ванны", "размораживание в охлаждаемом помещении", "опаливание и удаление пеньков", "потрошение и промывание", "филе, окорочок, бедро, голень, котлетная масса", "хранение в холодильнике"], { exemplar: commonRubric }),
      simulation: [
        sequence(
          "poultry-sim-chain",
          "Соберите технологическую цепочку обработки птицы.",
          [
            ["quality", "проверка качества", { image: "/assets/pm01/extended/poultry/whole-chicken-prepared.png", detail: "Оценить внешний вид, запах, цвет кожи и мышц, консистенцию тканей." }],
            ["defrost", "размораживание", { image: "/assets/pm01/extended/safety/fridge-separate-storage.png", detail: "Разморозить тушки в охлаждаемом помещении с соблюдением санитарных требований." }],
            ["flame", "опаливание", { image: "/assets/pm01/extended/poultry/chicken-front-quarter.png", detail: "Удалить остатки волосков и пуха безопасным способом." }],
            ["pins", "удаление пеньков", { image: "/assets/pm01/extended/poultry/chicken-wing-segments.png", detail: "Удалить перьевые пеньки пинцетом, не повреждая кожу." }],
            ["gut", "потрошение", { image: "/assets/pm01/extended/poultry/chicken-back-broth.png", detail: "Удалить внутренности, не допуская загрязнения мякоти." }],
            ["rinse", "промывание", { image: "/assets/pm01/extended/safety/glove-change-handwash.png", detail: "Промыть тушку после потрошения и удалить остатки загрязнений." }],
            ["cut", "разделка", { image: "/assets/pm01/extended/poultry/chicken-breast-butterfly.png", detail: "Разделать тушку на части или подготовить филе по заданию." }],
            ["shape", "формование", { image: "/assets/pm01/extended/poultry/poultry-cutlets.png", detail: "Сформовать полуфабрикаты: окорочок, бедро, голень, филе или котлетную массу." }],
            ["cool", "охлаждение", { image: "/assets/pm01/extended/safety/labelled-container.png", detail: "Поместить подготовленные полуфабрикаты в чистую промаркированную тару под охлаждение." }]
          ],
          ["quality", "defrost", "flame", "pins", "gut", "rinse", "cut", "shape", "cool"],
          { maxScore: 6 }
        ),
        qualityControl(
          "poultry-sim-quality",
          "Проведите контроль качества полуфабрикатов из птицы и кролика после разделки.",
          [
            [
              "fillet-ready",
              "Филе курицы",
              {
                image: generatedSemiFinishedProductAssets.generatedChickenFillet,
                status: "карта контроля: чистая грудная мякоть, свойственный запах, тара закрыта и промаркирована",
                detail: "Натуральный полуфабрикат подготовлен без видимых дефектов и может быть передан в охлаждение.",
                signals: ["чистая поверхность", "свойственный запах", "маркировка есть"],
                risk: "низкий"
              }
            ],
            [
              "drumsticks-open",
              "Голени курицы в открытой таре",
              {
                image: generatedSemiFinishedProductAssets.generatedChickenDrumsticks,
                status: "карта контроля: тара открыта, части соприкасаются с внешней упаковкой, дата указана не полностью",
                detail: "Внешний вид допустимый, но перед передачей нужно заменить тару, закрыть и уточнить маркировку.",
                signals: ["открытая тара", "контакт с упаковкой", "неполная дата"],
                risk: "средний"
              }
            ],
            [
              "rabbit-spoilage",
              "Порции кролика с признаками порчи",
              {
                image: generatedSemiFinishedProductAssets.generatedRabbitPortions,
                status: "карта контроля: липкая поверхность, посторонний запах, сероватые участки",
                detail: "Партия не допускается к производству и должна быть изолирована от качественного сырья.",
                signals: ["посторонний запах", "липкость", "изменение цвета"],
                risk: "высокий"
              }
            ],
            [
              "poultry-mince-no-label",
              "Котлетная масса из птицы",
              {
                image: semiFinishedProductAssets.poultryMinceMass,
                status: "карта контроля: масса охлаждена, но нет наименования и времени изготовления",
                detail: "До передачи нужно оформить маркировку и подтвердить срок безопасного хранения.",
                signals: ["нет наименования", "нет времени", "нужен срок хранения"],
                risk: "средний"
              }
            ]
          ],
          {
            "fillet-ready": "accept",
            "drumsticks-open": "correct",
            "rabbit-spoilage": "reject",
            "poultry-mince-no-label": "correct"
          },
          {
            competencyTags: ["ПК 1.1", "ПК 1.2", "ПК 1.4", "ОК 01", "ОК 02", "ОК 07"]
          }
        ),
        bucket(
          "poultry-sim-parts",
          "Соотнесите полуфабрикат и часть птицы.",
          [
            ["fillet", "филе", { image: generatedSemiFinishedProductAssets.generatedChickenFillet, detail: "Грудная мякоть без кости." }],
            ["leg", "окорочок", { image: semiFinishedProductAssets.chickenLegQuarter, detail: "Бедро и голень вместе." }],
            ["drumstick", "голень", { image: generatedSemiFinishedProductAssets.generatedChickenDrumsticks, detail: "Нижняя часть ноги." }],
            ["thigh", "бедро", { image: semiFinishedProductAssets.chickenThigh, detail: "Верхняя мясистая часть ноги." }],
            ["mince", "котлетная масса", { image: semiFinishedProductAssets.poultryMinceMass, detail: "Измельченная мякоть для формования." }]
          ],
          [["breast", "грудная часть"], ["leg-full", "бедро и голень"], ["lower", "нижняя часть ноги"], ["upper", "верхняя часть ноги"], ["flesh", "мякоть"]],
          { fillet: "breast", leg: "leg-full", drumstick: "lower", thigh: "upper", mince: "flesh" },
          {
            maxScore: 6,
            visualMode: "product_cards",
            interactionHint: "Перенесите полуфабрикат к соответствующей части тушки."
          }
        ),
        hotspot("poultry-sim-hotspot", "Найдите нарушения при работе с птицей.", "/assets/pm01/violations/poultry.png", [
          { id: "no-cooling", label: "Тушки птицы находятся без охлаждения", x: 19, y: 57, radius: 11 },
          { id: "dirty-board", label: "Доска загрязнена после сырой птицы", x: 52, y: 66, radius: 12 },
          { id: "cross", label: "Сырая птица находится рядом с овощами", x: 80, y: 48, radius: 12 },
          { id: "knife", label: "Нож лежит на краю стола", x: 81, y: 78, radius: 10 }
        ], { maxScore: 6 }),
        multiple("poultry-sim-label", "Выберите правильную маркировку тары.", [["name", "наименование"], ["date", "дата и время изготовления"], ["mass", "масса"], ["storage", "условия хранения"], ["term", "срок реализации"], ["shift", "номер учебной смены"]], ["name", "date", "mass", "storage", "term"], { maxScore: 6 })
      ]
    },
    {
      id: "complex",
      number: 5,
      title: "Комплексный заказ",
      shortTitle: "Комплекс",
      icon: "package",
      accent: "#315f7d",
      image: "/assets/pm01/complex-workshop.png",
      scenario:
        "Студент получает заказ на овощные, рыбные, мясные полуфабрикаты и полуфабрикаты из птицы. Нужно распределить сырье по участкам, составить заявку, рассчитать массу сырья, выбрать упаковку, маркировку, хранение и дать консультацию потребителю.",
      competencies: ["ПК 1.1", "ПК 1.2", "ПК 1.3", "ПК 1.4", "ОК 01", "ОК 02", "ОК 07"],
      test: [
        single("complex-t1-start", "Студент получил комплексный заказ на овощные, рыбные и мясные полуфабрикаты. С чего нужно начать работу?", [["a", "с выбора упаковки до проверки сырья"], ["b", "с проверки задания, сырья и готовности рабочего места"], ["c", "с нарезки без распределения по участкам"], ["d", "с расчета массы без проверки наличия сырья"]], "b"),
        single("complex-t1-fish-place", "В комплексном заказе есть сырая рыба для порционирования. Как организовать ее механическую обработку без риска перекрестного загрязнения?", [["a", "на рыбном или мясорыбном участке с промаркированной доской, ножом и отдельной тарой"], ["b", "на овощном участке после освобождения моечной ванны"], ["c", "на мясном столе без смены доски, если рыбу обработать последней"], ["d", "в зоне упаковки готовых полуфабрикатов, чтобы сразу уложить в лотки"]], "a"),
        single("complex-t1-veg-place", "В комплексном заказе есть немытые корнеплоды и зелень. Как правильно направить это сырье перед нарезкой?", [["a", "в овощной цех: сначала сортировка, мойка, очистка и подготовка чистого инвентаря"], ["b", "в рыбный цех, если там свободна моечная ванна"], ["c", "на мясной стол после санитарной обработки без отдельной овощной доски"], ["d", "сразу в зону упаковки готовых полуфабрикатов"]], "a"),
        multiple("complex-t1-label", "Перед передачей полуфабриката на хранение выберите обязательные сведения маркировки.", [["a", "название"], ["b", "дата и время изготовления"], ["c", "условия хранения"], ["d", "номер стеллажа"]], ["a", "b", "c"]),
        single("complex-t1-neighbor", "При размещении сырья в холодильнике выберите верный смысл товарного соседства.", [["a", "правильное размещение продуктов при хранении"], ["b", "хранение сырого мяса, рыбы и готовых полуфабрикатов в одной открытой таре"], ["c", "размещение всех продуктов на одной полке для ускорения выдачи"], ["d", "сортировка продуктов только по массе упаковки"]], "a"),
        single("complex-t1-bad-raw", "При обнаружении недоброкачественного сырья выберите правильное действие.", [["a", "отложить сырье в общую партию до конца смены"], ["b", "использовать после дополнительного промывания без оформления"], ["c", "не использовать и сообщить ответственному лицу"], ["d", "передать на участок для срочной переработки"]], "c"),
        single("complex-t1-book", "Для определения нормы сырья и выхода по заказу выберите нужный нормативный документ.", [["a", "сборник рецептур"], ["b", "журнал входного контроля сырья"], ["c", "график санитарной уборки"], ["d", "черновая заявка без рецептурных норм"]], "a"),
        bucket(
          "complex-t1-fish-products",
          "Рассмотрите фото и распределите позиции комплексного заказа: рыбные полуфабрикаты или другой участок.",
          [
            ["fish-portion", "порционные куски рыбы", { image: generatedSemiFinishedProductAssets.generatedFishFilletPortions, detail: "Куски рыбы одинаковой массы для дальнейшей тепловой обработки." }],
            ["fish-mince", "рыбная котлетная масса", { image: semiFinishedProductAssets.fishMinceMass, detail: "Измельченная рыбная масса для формования котлет и биточков." }],
            ["fish-cutlets", "рыбные котлеты", { image: generatedSemiFinishedProductAssets.generatedFishCutlets, detail: "Сформованные полуфабрикаты из рыбной котлетной массы." }],
            ["fish-breaded", "панированный рыбный полуфабрикат", { image: generatedSemiFinishedProductAssets.generatedFishSticksBreaded, detail: "Порционный рыбный полуфабрикат, подготовленный к жарке." }],
            ["meat-goulash", "гуляш из говядины", { image: generatedSemiFinishedProductAssets.generatedMeatGoulashCubes, detail: "Мелкокусковой мясной полуфабрикат, не относится к рыбному участку." }]
          ],
          [["fish", "рыбные полуфабрикаты"], ["other", "другой участок"]],
          { "fish-portion": "fish", "fish-mince": "fish", "fish-cutlets": "fish", "fish-breaded": "fish", "meat-goulash": "other" },
          {
            maxScore: 2,
            visualMode: "product_cards",
            interactionHint: "Рассмотрите фото полуфабриката и перенесите карточку в правильную группу."
          }
        ),
        bucket(
          "complex-t1-meat-products",
          "Рассмотрите фото и распределите позиции комплексного заказа: мясные полуфабрикаты или другой участок.",
          [
            ["goulash", "гуляш", { image: generatedSemiFinishedProductAssets.generatedMeatGoulashCubes, detail: "Мелкокусковой мясной полуфабрикат для тушения." }],
            ["azu", "азу", { image: semiFinishedProductAssets.meatAzuStrips, detail: "Мелкокусковой мясной полуфабрикат из нарезанных брусочков." }],
            ["romsteak", "ромштекс", { image: semiFinishedProductAssets.meatRomsteakBreaded, detail: "Порционный панированный полуфабрикат из мяса." }],
            ["cutlets", "рубленые котлеты", { image: semiFinishedProductAssets.meatCutletsFormed, detail: "Сформованные полуфабрикаты из мясной котлетной массы." }],
            ["potato-julienne", "соломка картофеля", { image: "/assets/pm01/extended/cuts/potato-shoestring.png", detail: "Овощная форма нарезки, не относится к мясным полуфабрикатам." }]
          ],
          [["meat", "мясные полуфабрикаты"], ["other", "другой участок"]],
          { goulash: "meat", azu: "meat", romsteak: "meat", cutlets: "meat", "potato-julienne": "other" },
          {
            maxScore: 2,
            visualMode: "product_cards",
            interactionHint: "Рассмотрите фото полуфабриката и перенесите карточку в правильную группу."
          }
        ),
        single("complex-t1-safety", "В холодильнике размещают готовую смешанную партию полуфабрикатов. Какое размещение нужно исправить немедленно?", [["a", "контейнеры с полуфабрикатами промаркированы"], ["b", "рыбные, мясные и овощные полуфабрикаты стоят раздельно"], ["c", "сырое мясо лежит вплотную к готовым полуфабрикатам"], ["d", "для хранения используются чистые закрытые лотки"]], "c")
      ],
      calculation: [
        calculation("complex-calc-net", "Поступило сырье: картофель — 20 кг, рыба — 10 кг, мясо — 15 кг, птица — 8 кг. Отходы: картофель — 30 %, рыба — 25 %, мясо — 26 %, птица — 32 %. Определите массу нетто.", ["М отходов = М брутто × W / 100", "М нетто = М брутто × (100 − W) / 100"], [
          { id: "potatoKg", label: "Картофель нетто", unit: "кг", expected: 14, tolerance: 0.01 },
          { id: "fishKg", label: "Рыба нетто", unit: "кг", expected: 7.5, tolerance: 0.01 },
          { id: "meatKg", label: "Мясо нетто", unit: "кг", expected: 11.1, tolerance: 0.01 },
          { id: "poultryKg", label: "Птица нетто", unit: "кг", expected: 5.44, tolerance: 0.01 }
        ], ["Картофель = 14 кг; рыба = 7,5 кг; мясо = 11,1 кг; птица = 5,44 кг"]),
        calculation("complex-calc-batch", "Нужно подготовить 30 рыбных полуфабрикатов по 100 г, 40 мясных по 80 г, 25 из птицы по 120 г. Определите общую массу.", ["М партии = n × m"], [
          { id: "fishKg", label: "Рыба", unit: "кг", expected: 3, tolerance: 0.01 },
          { id: "meatKg", label: "Мясо", unit: "кг", expected: 3.2, tolerance: 0.01 },
          { id: "poultryKg", label: "Птица", unit: "кг", expected: 3, tolerance: 0.01 },
          { id: "totalKg", label: "Итого", unit: "кг", expected: 9.2, tolerance: 0.01 }
        ], ["Рыба = 3 кг; мясо = 3,2 кг; птица = 3 кг; всего = 9,2 кг"]),
        calculation("complex-calc-pack", "Нужно упаковать 96 полуфабрикатов: в один лоток помещается 8 штук, в один транспортный ящик помещается 6 лотков. Рассчитайте количество лотков и ящиков.", ["Лотки = количество полуфабрикатов / вместимость лотка", "Ящики = количество лотков / вместимость ящика"], [
          { id: "trays", label: "Лотки", unit: "шт.", expected: 12, tolerance: 0.01 },
          { id: "boxes", label: "Транспортные ящики", unit: "шт.", expected: 2, tolerance: 0.01 }
        ], ["Лотки = 96 / 8 = 12 шт.", "Ящики = 12 / 6 = 2 шт.", "После упаковки нужна маркировка: наименование, дата/время, количество, условия хранения."])
      ],
      voice: voice("complex-voice", "После приготовления смешанной партии рыбных, мясных, овощных полуфабрикатов и полуфабрикатов из птицы объясните, как организовать упаковку, маркировку, хранение и передачу партии.", ["раздельная упаковка по видам сырья", "чистая пищевая тара", "маркировка наименования, количества и даты/времени", "холодильное хранение", "товарное соседство", "запрет смешивать сырое сырье с готовыми продуктами", "проверка внешнего вида и целостности упаковки перед передачей"], { exemplar: commonRubric }),
      simulation: [
        bucket(
          "complex-sim-zones",
          "Распределите сырье по участкам.",
          [
            ["veg", "овощи", { image: "/assets/pm01/extended/cuts/potato-parmentier.png", detail: "Партия овощей идет на овощной участок." }],
            ["fish", "рыба", { image: "/assets/pm01/extended/fish/fish-fillet-skinless.png", detail: "Рыбные порционные полуфабрикаты готовят в рыбном или мясорыбном цехе." }],
            ["beef", "говядина/свинина/баранина", { image: "/assets/pm01/extended/meat/beef-steak-natural.png", detail: "Мясное сырье и мелкокусковые полуфабрикаты направляют в мясной цех." }],
            ["bird", "птица/дичь/кролик", { image: "/assets/pm01/extended/poultry/rabbit-hind-leg.png", detail: "Птицу, дичь и кролика обрабатывают на отдельной линии или в мясном цехе." }]
          ],
          [["veg-zone", "овощной цех"], ["fish-zone", "рыбный/мясорыбный цех"], ["meat-zone", "мясной цех"], ["bird-zone", "отдельная линия или мясной цех"]],
          { veg: "veg-zone", fish: "fish-zone", beef: "meat-zone", bird: "bird-zone" },
          {
            maxScore: 6,
            visualMode: "product_cards",
            interactionHint: "Перенесите карточку сырья в производственный участок."
          }
        ),
        sequence("complex-sim-order", "Соберите порядок выполнения комплексного заказа.", [["order", "принять заказ"], ["check", "проверить сырье"], ["calc", "рассчитать массу"], ["places", "подготовить рабочие места"], ["process", "обработать сырье"], ["semi", "приготовить полуфабрикаты"], ["quality", "проверить качество и массу"], ["pack", "упаковать"], ["mark", "промаркировать"], ["store", "хранить/реализовать"]], ["order", "check", "calc", "places", "process", "semi", "quality", "pack", "mark", "store"], { maxScore: 6 }),
        bucket(
          "complex-sim-pack",
          "Распределите упаковку и тару для полуфабрикатов на допустимую и недопустимую.",
          [
            ["container", "пищевой контейнер", { image: "/assets/pm01/extended/safety/labelled-container.png", detail: "Чистый контейнер с крышкой и местом для маркировки." }],
            ["tray", "лоток с пленкой", { image: "/assets/pm01/packaging/film-tray-fish.png", detail: "Пищевой лоток с плотной пленкой для кратковременного хранения." }],
            ["gastronorm", "гастроемкость с крышкой", { image: "/assets/pm01/packaging/gastronorm-lid.png", detail: "Закрытая гастроемкость с маркировочным держателем." }],
            ["newspaper", "газета", { image: "/assets/pm01/packaging/newspaper-violation.png", detail: "Газета не является пищевой упаковкой и загрязняет продукт." }]
          ],
          [["allowed", "Допустимая упаковка"], ["forbidden", "Недопустимо"]],
          {
            container: "allowed",
            tray: "allowed",
            gastronorm: "allowed",
            newspaper: "forbidden"
          },
          {
            maxScore: 6,
            visualMode: "product_cards",
            interactionHint: "Перенесите карточки в допустимую или недопустимую группу."
          }
        ),
        hotspot("complex-sim-hotspot", "Найдите нарушения хранения.", "/assets/pm01/violations/complex.png", [
          { id: "fish-meat", label: "Рыба и мясо находятся в одной таре", x: 18, y: 61, radius: 14 },
          { id: "raw-ready", label: "Готовые полуфабрикаты соприкасаются с сырым сырьем", x: 51, y: 45, radius: 12 },
          { id: "no-label", label: "Тара без маркировки", x: 84, y: 72, radius: 10 },
          { id: "bad-pack", label: "Упаковка повреждена", x: 81, y: 40, radius: 11 }
        ], { maxScore: 6 }),
        qualityControl(
          "complex-sim-quality",
          "Проведите финальный контроль комплексного заказа перед хранением и передачей.",
          [
            [
              "labelled-container-ready",
              "Промаркированный пищевой контейнер",
              {
                image: extendedVisualAssets.safety.labelledContainer,
                status: "карта контроля: наименование, дата/время, количество и условия хранения указаны",
                detail: "Партия оформлена корректно и может быть передана в холодильное хранение.",
                signals: ["полная маркировка", "закрытая тара", "условия хранения указаны"],
                risk: "низкий"
              }
            ],
            [
              "vacuum-no-label",
              "Вакуумная упаковка без этикетки",
              {
                image: extendedVisualAssets.safety.vacuumPackaging,
                status: "карта контроля: упаковка целая, но отсутствуют дата, время и наименование продукта",
                detail: "Перед передачей нужно нанести маркировку, иначе невозможно контролировать срок реализации.",
                signals: ["нет наименования", "нет даты", "нет срока"],
                risk: "средний"
              }
            ],
            [
              "newspaper-pack",
              "Упаковка в газету",
              {
                image: "/assets/pm01/packaging/newspaper-violation.png",
                status: "карта контроля: продукт контактирует с непищевой бумагой и типографской краской",
                detail: "Такую упаковку нельзя исправить как готовую партию; продукт нужно изолировать и не передавать потребителю.",
                signals: ["непищевая упаковка", "риск загрязнения", "контакт с краской"],
                risk: "высокий"
              }
            ],
            [
              "separate-storage-ready",
              "Раздельное холодильное хранение",
              {
                image: extendedVisualAssets.safety.fridgeSeparateStorage,
                status: "карта контроля: рыба, мясо, птица и овощные полуфабрикаты разделены по таре и полкам",
                detail: "Товарное соседство и раздельные потоки соблюдены, партия готова к дальнейшей передаче.",
                signals: ["раздельные потоки", "закрытые контейнеры", "охлаждение соблюдено"],
                risk: "низкий"
              }
            ]
          ],
          {
            "labelled-container-ready": "accept",
            "vacuum-no-label": "correct",
            "newspaper-pack": "reject",
            "separate-storage-ready": "accept"
          },
          {
            competencyTags: ["ПК 1.1", "ПК 1.2", "ПК 1.3", "ПК 1.4", "ОК 01", "ОК 02", "ОК 07"]
          }
        )
      ]
    }
  ]
};

const pm01DigitalShiftFamilies = [
  {
    id: "quality_control",
    title: "Контроль качества партии",
    interaction: "Фото партии, карта контроля, признаки риска и решение: допустить, исправить условия или забраковать.",
    modernity: "Студент читает визуальные доказательства как на реальной смене, а не выбирает термин по памяти."
  },
  {
    id: "shift_investigation",
    title: "Расследование нарушения",
    interaction: "На сцене цеха нужно отметить источники риска и восстановить причину нарушения.",
    modernity: "Hotspot превращается в производственный аудит с визуальным поиском ошибок."
  },
  {
    id: "production_timeline",
    title: "Технологический таймлайн",
    interaction: "Операции собираются в линию смены с логикой времени, потоков и санитарных переходов.",
    modernity: "Проверяется процессное мышление: что раньше, что позже, где контрольная точка."
  },
  {
    id: "storage_marking",
    title: "Маркировка и хранение",
    interaction: "Карточки тары, маркировки и условий хранения распределяются по допустимым решениям.",
    modernity: "Фокус смещается с теории на управляемое решение по срокам, таре, холоду и соседству."
  },
  {
    id: "order_assembly",
    title: "Сборка заказа",
    interaction: "Студент собирает маршрут заказа от заявки и сырья до упаковки и передачи.",
    modernity: "Экзамен показывает целую производственную смену, а не отдельные несвязанные вопросы."
  }
];

const pm01DigitalShiftInteractionBlueprints = [
  {
    familyId: "quality_control",
    visualMode: "quality_control",
    layout: "Центральная зона показывает карточки партий с фото, картой контроля и признаками риска; справа остаются решения по допуску партии.",
    studentFlow: [
      "осмотреть фото партии и служебную карту контроля",
      "сопоставить признаки риска с допустимостью партии",
      "перетащить партию в решение: допустить, исправить условия или забраковать"
    ],
    animation: "Легкий scan-line по карточке, подсветка признаков риска при выборе и спокойный переход карточки в выбранную колонку.",
    implementation: "Существующий bucket_sort с visualMode quality_control; финальные assets подключаются только после preview и визуального осмотра.",
    uniqueness: "Формат имитирует приемочный контроль партии на смене: студент принимает решение по доказательствам, а не по памяти термина.",
    assessment: "Проверяется корректное решение по каждой партии и способность отличить исправимую ситуацию от брака.",
    approvalQuestion: "Согласовать, достаточно ли признаков на фото для методически честного решения без подсказки ответа."
  },
  {
    familyId: "shift_investigation",
    visualMode: "shift_investigation",
    layout: "Реалистичная сцена цеха с активными зонами риска, журналом смены и короткой причиной нарушения.",
    studentFlow: [
      "прочитать запись производственного журнала",
      "найти на сцене видимые источники нарушения",
      "отметить hotspot и выбрать корректирующее действие"
    ],
    animation: "При наведении сцена слегка фокусирует рабочую зону; найденные точки получают audit-пульс и короткую метку причины.",
    implementation: "Существующий hotspot_scene с visualMode shift_investigation; правильные hotspot-координаты остаются скрытыми в public API.",
    uniqueness: "Задание превращает обычный поиск ошибки в мини-аудит смены с причинно-следственной логикой.",
    assessment: "Проверяется нахождение риска и объяснение безопасного корректирующего действия.",
    approvalQuestion: "Согласовать, какие нарушения допустимы для изображения, чтобы они были учебными, а не спорными или декоративными."
  },
  {
    familyId: "production_timeline",
    visualMode: "production_timeline",
    layout: "Операции располагаются как линия смены с контрольными точками, санитарными переходами и визуальными карточками этапов.",
    studentFlow: [
      "разобрать набор операций",
      "выстроить технологически допустимую последовательность",
      "проверить, где находится контрольная точка качества или безопасности"
    ],
    animation: "Карточки этапов плавно встают на линию времени; контрольные точки подсвечиваются после размещения.",
    implementation: "Существующий sequence_drag с visualMode production_timeline и карточками операций.",
    uniqueness: "Проверяется процессное мышление: студент видит не отдельный вопрос, а управляемую производственную цепочку.",
    assessment: "Проверяется порядок операций и логика санитарных/технологических переходов.",
    approvalQuestion: "Согласовать порядок этапов по РП и локальной методике до финальной формулировки."
  },
  {
    familyId: "storage_marking",
    visualMode: "storage_marking",
    layout: "Карточки тары и партий показывают этикетку, закрытость, холодовую цепь и товарное соседство.",
    studentFlow: [
      "сравнить состояние тары, маркировки и хранения",
      "выбрать допустимое решение для партии",
      "отличить отсутствие маркировки от недопустимой упаковки или опасного соседства"
    ],
    animation: "Карточка разворачивает мини-журнал маркировки; решение подсвечивает холод, тару или риск соседства.",
    implementation: "Существующий bucket_sort с visualMode storage_marking; correctBuckets не публикуются.",
    uniqueness: "Санитарные требования становятся практическим решением по партии, а не абстрактным списком правил.",
    assessment: "Проверяется решение по таре, маркировке, температуре и товарному соседству.",
    approvalQuestion: "Согласовать набор типовых нарушений и формулировки, чтобы они совпадали с РП и локальной практикой."
  },
  {
    familyId: "order_assembly",
    visualMode: "order_assembly",
    layout: "Маршрут комплексного заказа собирается от заявки и сырья до упаковки, маркировки и передачи на хранение.",
    studentFlow: [
      "прочитать заявку смены",
      "собрать этапы маршрута заказа",
      "проверить, что контроль качества, упаковка и маркировка стоят в правильном месте"
    ],
    animation: "Этапы соединяются в маршрут; после завершения появляется краткая карта смены с контрольными узлами.",
    implementation: "Существующий sequence_drag с visualMode order_assembly; training-only, maxScore 0.",
    uniqueness: "Студент собирает целую смену, поэтому задание связывает овощи, рыбу, мясо, птицу/кролика и выдачу заказа.",
    assessment: "Проверяется целостность маршрута от заявки до передачи партии и соблюдение контрольных действий.",
    approvalQuestion: "Согласовать уровень сложности комплексного заказа и количество этапов для тренировочного режима."
  }
];

const pm01DigitalShiftNormativeAnchors = [
  {
    id: "fgos-43-01-09",
    title: "ФГОС СПО 43.01.09 Повар, кондитер",
    sourceUrl: "https://fgos.ru/fgos/fgos-43-01-09-povar-konditer-1569/",
    sourceStatus: "primary_standard",
    documentStatus: "Приказ Минобрнауки России от 09.12.2016 N 1569, редакция от 17.12.2020",
    verifiedAt: "2026-06-21",
    relevance:
      "Основная нормативная опора PM01: приготовление и подготовка к реализации полуфабрикатов для блюд и кулинарных изделий разнообразного ассортимента.",
    focus: ["ПК 1.1-1.4", "ОК 01", "ОК 02", "ОК 07", "ОК 09", "ОК 10"],
    approvalUse: "Проверять, что задания остаются производственными: сырье, полуфабрикаты, рабочее место, безопасность, качество и хранение."
  },
  {
    id: "fgos-43-02-15",
    title: "ФГОС СПО 43.02.15 Поварское и кондитерское дело",
    sourceUrl: "https://fgos.ru/fgos/fgos-43-02-15-povarskoe-i-konditerskoe-delo-1565/",
    sourceStatus: "advanced_methodical_reference",
    documentStatus: "Приказ Минобрнауки России от 09.12.2016 N 1565, редакция от 17.12.2020",
    verifiedAt: "2026-06-21",
    relevance:
      "Расширенная методическая рамка для сложного ассортимента, организации процессов, анализа информации и профессиональной документации.",
    focus: ["ОК 01", "ОК 02", "ОК 07", "ОК 09", "ОК 10"],
    approvalUse: "Использовать как ориентир для комплексного заказа, производственного журнала, цифрового cockpit и межцеховой логики."
  },
  {
    id: "firpo-pop-43-01-09",
    title: "ИРПО/ФИРПО: реестр ПОП СПО 43.01.09",
    sourceUrl: "https://firpo.ru/2245",
    sourceStatus: "approved_example_program_registry",
    documentStatus: "ПОП СПО 43.01.09 Повар, кондитер; статус в реестре: утверждено",
    verifiedAt: "2026-06-21",
    relevance:
      "Ориентир для сверки примерной программы и локальной рабочей программы перед финальным переписыванием тем.",
    focus: ["ПООП/ПОП СПО", "РП", "КТП", "оценочные материалы"],
    approvalUse: "После получения РП сверять формулировки тем и не подменять локальную программу общими словами."
  },
  {
    id: "local-rp-pending",
    title: "Рабочие программы, КТП и локальные оценочные материалы",
    sourceUrl: "",
    sourceStatus: "awaiting_teacher_files",
    documentStatus: "Ожидаются от преподавателя до финального переписывания тем и официальных вопросов",
    verifiedAt: "2026-06-21",
    relevance:
      "Решающая локальная опора для точных тем, формулировок, критериев и допустимого уровня сложности по каждому цеху.",
    focus: ["темы РП", "формулировки заданий", "критерии проверки", "preview approval"],
    approvalUse: "До получения РП сохранять текущие темы как черновые alignment targets и не менять официальный банк вслепую."
  }
];

const pm01DigitalShiftVariantPackages = {
  vegetables: {
    title: "Овощной цех: цифровая смена нарезки и контроля",
    rpTopics: [
      "организация рабочего места овощного цеха",
      "механическая кулинарная обработка овощей и грибов",
      "формы нарезки и подготовка овощных полуфабрикатов",
      "хранение очищенных и нарезанных овощей"
    ],
    productionLog: [
      "08:45 поступили корнеплоды и зелень",
      "08:55 выполнена мойка и очистка",
      "09:05 подготовлены партии нарезки",
      "09:20 проводится контроль качества"
    ],
    visualPrompts: [
      "Фотореалистичный овощной учебный цех, гастроемкости с картофелем брусочками, зеленью chiffonade, морковью rondelle, кабачком кубиком; чистая нержавеющая поверхность; без готовых блюд и лишнего декора.",
      "Крупный план контрольной партии овощных полуфабрикатов в пищевой таре с визуальными признаками: маркировка, крышка, вода для картофеля, отсутствие потемнения."
    ],
    tasks: [
      ["quality_control", "Проверить партии нарезки перед передачей в производство."],
      ["shift_investigation", "Найти нарушения на овощном участке."],
      ["production_timeline", "Восстановить последовательность обработки овощей."],
      ["storage_marking", "Разложить партии по условиям хранения и маркировки."],
      ["order_assembly", "Собрать мини-заказ овощных полуфабрикатов."]
    ],
    storageCards: [
      ["peeled-potato-water", "Очищенный картофель в холодной воде", { image: semiFinishedProductAssets.vegPeeledPotatoTubers, detail: "Есть защита от потемнения и кратковременное хранение." }, "allowed"],
      ["open-greens", "Зелень открыта без крышки", { image: semiFinishedProductAssets.vegGreensChiffonadeReady, detail: "Нужна закрытая чистая тара и маркировка." }, "correct"],
      ["mixed-roots-labelled", "Промаркированные корнеплоды", { image: semiFinishedProductAssets.vegWashedRootVegetables, detail: "Сырье разделено и подготовлено к обработке." }, "allowed"],
      ["no-label-cubes", "Кубики овощей без времени изготовления", { image: semiFinishedProductAssets.vegMixedMacedoineReady, detail: "Использовать можно только после внесения полного ярлыка." }, "correct"]
    ],
    orderSteps: [
      ["accept", "принять сырье"],
      ["sort", "отсортировать"],
      ["wash", "промыть"],
      ["peel", "очистить"],
      ["cut", "нарезать"],
      ["quality", "проверить качество"],
      ["mark", "промаркировать"],
      ["store", "передать в холод"]
    ]
  },
  fish: {
    title: "Рыбный цех: контроль свежести и потоков",
    rpTopics: [
      "обработка рыбы с костным скелетом",
      "приготовление рыбных полуфабрикатов",
      "котлетная масса из рыбы",
      "условия охлаждения и предупреждение перекрестного загрязнения"
    ],
    productionLog: [
      "08:40 принята охлажденная рыба",
      "08:50 проведена органолептическая оценка",
      "09:10 подготовлены филе и котлетная масса",
      "09:25 партии направляются в охлаждение"
    ],
    visualPrompts: [
      "Фотореалистичный рыбный учебный цех с чистой доской, филе рыбы, закрытыми лотками, весами и охлаждаемой зоной; без готовой жареной рыбы.",
      "Крупный план рыбных полуфабрикатов: порционное филе, котлетная масса, панированные заготовки, разные условия маркировки и охлаждения."
    ],
    tasks: [
      ["quality_control", "Оценить рыбные полуфабрикаты перед охлаждением."],
      ["shift_investigation", "Найти нарушения рыбного потока."],
      ["production_timeline", "Собрать обработку рыбы в технологический порядок."],
      ["storage_marking", "Разнести рыбные партии по условиям хранения."],
      ["order_assembly", "Собрать заказ из рыбных полуфабрикатов."]
    ],
    storageCards: [
      ["fillet-closed", "Филе в закрытом лотке", { image: generatedSemiFinishedProductAssets.generatedFishFilletPortions, detail: "Чистая закрытая тара и холод." }, "allowed"],
      ["mince-open", "Котлетная масса открыта", { image: semiFinishedProductAssets.fishMinceMass, detail: "Нужно закрыть, промаркировать и вернуть в холод." }, "correct"],
      ["breaded-near-raw", "Панированные полуфабрикаты рядом с сырой рыбой", { image: generatedSemiFinishedProductAssets.generatedFishSticksBreaded, detail: "Нарушено разделение потоков." }, "correct"],
      ["trim-stock", "Обрезки для бульона без маркировки", { image: semiFinishedProductAssets.fishTrimForStock, detail: "Нужны назначение, дата и условия хранения." }, "correct"]
    ],
    orderSteps: [
      ["quality", "проверить свежесть"],
      ["scale", "очистить от чешуи"],
      ["gut", "выпотрошить"],
      ["rinse", "промыть"],
      ["fillet", "разделать на филе"],
      ["portion", "порционировать"],
      ["mark", "промаркировать"],
      ["cool", "охладить"]
    ]
  },
  meat: {
    title: "Мясной цех: безопасность оборудования и рубленая масса",
    rpTopics: [
      "обработка мясного сырья",
      "порционные и мелкокусковые полуфабрикаты",
      "приготовление рубленой и котлетной массы",
      "безопасная эксплуатация мясорубки"
    ],
    productionLog: [
      "08:35 подготовлено рабочее место",
      "08:50 мясо зачищено и нарезано",
      "09:05 собрана мясорубка",
      "09:20 сформованы партии полуфабрикатов"
    ],
    visualPrompts: [
      "Фотореалистичный мясной учебный цех: ножи, мусат, весы, мясорубка, чистые лотки, сырое мясо и полуфабрикаты без приготовленного вида.",
      "Крупный план мясных полуфабрикатов: гуляш, котлетная масса, шницель, кости для бульона; с признаками правильной и неправильной тары."
    ],
    tasks: [
      ["quality_control", "Оценить мясные полуфабрикаты после формования."],
      ["shift_investigation", "Найти нарушения мясного участка."],
      ["production_timeline", "Собрать безопасный порядок работы с мясорубкой."],
      ["storage_marking", "Распределить мясные партии по условиям хранения."],
      ["order_assembly", "Собрать заказ мясных полуфабрикатов."]
    ],
    storageCards: [
      ["goulash-labelled", "Гуляш в закрытом промаркированном лотке", { image: generatedSemiFinishedProductAssets.generatedMeatGoulashCubes, detail: "Партия готова к охлаждению." }, "allowed"],
      ["cutlet-warm", "Котлетная масса стоит вне холода", { image: semiFinishedProductAssets.meatCutletMassPortions, detail: "Нужно немедленно охладить и закрыть." }, "correct"],
      ["bones-open", "Кости для бульона в открытой таре", { image: semiFinishedProductAssets.meatBonesForBroth, detail: "Нужна закрытая тара и ярлык назначения." }, "correct"],
      ["schnitzel-labelled", "Панированный шницель с маркировкой", { image: generatedSemiFinishedProductAssets.generatedMeatBreadedSchnitzel, detail: "Указаны дата, время и условия хранения." }, "allowed"]
    ],
    orderSteps: [
      ["workplace", "подготовить место"],
      ["quality", "проверить мясо"],
      ["trim", "зачистить"],
      ["cut", "нарезать"],
      ["grinder", "собрать мясорубку"],
      ["mince", "измельчить"],
      ["form", "сформовать"],
      ["cool", "охладить"]
    ]
  },
  poultry: {
    title: "Птица, дичь, кролик: разделка и санитарные потоки",
    rpTopics: [
      "обработка домашней птицы, дичи и кролика",
      "полуфабрикаты из птицы и кролика",
      "размораживание и потрошение",
      "раздельность инвентаря и хранение"
    ],
    productionLog: [
      "08:30 приняты тушки птицы и кролика",
      "08:45 проверены запах, цвет и консистенция",
      "09:00 проведена разделка",
      "09:18 подготовлены партии для охлаждения"
    ],
    visualPrompts: [
      "Фотореалистичный учебный участок обработки птицы и кролика: чистые доски, лотки, отдельная линия, сырые полуфабрикаты; без жареного или готового продукта.",
      "Крупный план полуфабрикатов из птицы и кролика: филе, голени, кролик порциями, котлетная масса; контроль маркировки и тары."
    ],
    tasks: [
      ["quality_control", "Оценить полуфабрикаты из птицы и кролика."],
      ["shift_investigation", "Найти нарушения работы с птицей."],
      ["production_timeline", "Собрать технологический порядок обработки птицы."],
      ["storage_marking", "Распределить партии по безопасному хранению."],
      ["order_assembly", "Собрать заказ полуфабрикатов из птицы и кролика."]
    ],
    storageCards: [
      ["fillet-labelled", "Филе птицы в закрытом лотке", { image: generatedSemiFinishedProductAssets.generatedChickenFillet, detail: "Есть маркировка и охлаждение." }, "allowed"],
      ["rabbit-no-label", "Кролик порциями без ярлыка", { image: generatedSemiFinishedProductAssets.generatedRabbitPortions, detail: "Нужно указать наименование, дату и условия." }, "correct"],
      ["mince-open", "Птичья котлетная масса открыта", { image: semiFinishedProductAssets.poultryMinceMass, detail: "Нужна закрытая тара и холод." }, "correct"],
      ["drumsticks-ready", "Голени птицы промаркированы", { image: generatedSemiFinishedProductAssets.generatedChickenDrumsticks, detail: "Партия готова к хранению." }, "allowed"]
    ],
    orderSteps: [
      ["quality", "проверить тушку"],
      ["defrost", "разморозить безопасно"],
      ["clean", "удалить пеньки"],
      ["gut", "выпотрошить"],
      ["rinse", "промыть"],
      ["cut", "разделать"],
      ["form", "сформовать"],
      ["store", "охладить"]
    ]
  },
  complex: {
    title: "Комплексный заказ: управление сменой и передачей партии",
    rpTopics: [
      "комплексная подготовка полуфабрикатов",
      "распределение сырья по участкам",
      "расчет партии и упаковка",
      "маркировка, хранение и подготовка к реализации"
    ],
    productionLog: [
      "08:20 получен комплексный заказ",
      "08:35 сырье распределено по участкам",
      "09:10 рассчитана масса партий",
      "09:35 проводится упаковка и финальная маркировка"
    ],
    visualPrompts: [
      "Фотореалистичная комплексная учебная зона: несколько закрытых лотков с овощными, рыбными, мясными полуфабрикатами и птицей, весы, маркировочные этикетки, холодильная полка.",
      "Крупный план финальной выдачи партии: пищевая тара, маркировка, раздельное хранение, без готовых блюд и ресторанной подачи."
    ],
    tasks: [
      ["quality_control", "Провести финальный контроль комплексного заказа."],
      ["shift_investigation", "Найти нарушения хранения и товарного соседства."],
      ["production_timeline", "Собрать общий маршрут комплексной смены."],
      ["storage_marking", "Распределить упаковку и тару по допустимости."],
      ["order_assembly", "Собрать заказ от заявки до передачи."]
    ],
    storageCards: [
      ["labelled-container", "Промаркированный контейнер", { image: extendedVisualAssets.safety.labelledContainer, detail: "Полная маркировка и закрытая тара." }, "allowed"],
      ["vacuum-no-label", "Вакуумная упаковка без этикетки", { image: extendedVisualAssets.safety.vacuumPackaging, detail: "Нужно добавить ярлык до передачи." }, "correct"],
      ["newspaper", "Газета как упаковка", { image: "/assets/pm01/packaging/newspaper-violation.png", detail: "Непищевая упаковка недопустима." }, "reject"],
      ["separate-fridge", "Раздельное хранение в холодильнике", { image: extendedVisualAssets.safety.fridgeSeparateStorage, detail: "Потоки сырья разделены." }, "allowed"]
    ],
    orderSteps: [
      ["order", "принять заказ"],
      ["check", "проверить сырье"],
      ["zones", "распределить участки"],
      ["calc", "рассчитать массу"],
      ["prepare", "подготовить полуфабрикаты"],
      ["quality", "проверить качество"],
      ["pack", "упаковать"],
      ["transfer", "передать на хранение"]
    ]
  }
};

const pm01DigitalShiftNegativePrompt =
  "Не показывать готовые блюда, ресторанную подачу, декоративные тарелки, логотипы, водяные знаки, случайный текст, грязный цех, анатомически странные части птицы или кролика, cooked-looking продукты, кровь, лица людей крупным планом.";

function buildDigitalShiftPreviewAssets(variantId, config) {
  return (config.visualPrompts || []).map((prompt, index) => {
    const kind = index === 0 ? "scene" : "control-detail";
    return {
      id: `${variantId}-${kind}-preview`,
      kind,
      status: "awaiting_preview",
      approval: "pending_teacher_review",
      prompt,
      negativePrompt: pm01DigitalShiftNegativePrompt,
      targetPath: `/assets/pm01/generated/digital-shift/${variantId}/${variantId}-${kind}.png`,
      finalAsset: false,
      inspectionRequired: true
    };
  });
}

const pm01DigitalShiftMethodicalMeta = {
  quality_control: {
    competencies: ["ПК 1.1", "ПК 1.2", "ОК 01", "ОК 02", "ОК 07"],
    checkCriterion: "Решение по партии обосновано визуальными признаками качества, условиями допуска и риском для смены.",
    visualKind: "control-detail"
  },
  shift_investigation: {
    competencies: ["ПК 1.1", "ПК 1.2", "ОК 01", "ОК 02", "ОК 07"],
    checkCriterion: "Студент находит источник нарушения и объясняет безопасное корректирующее действие.",
    visualKind: "scene"
  },
  production_timeline: {
    competencies: ["ПК 1.1", "ПК 1.3", "ОК 01", "ОК 02"],
    checkCriterion: "Операции собраны в технологически допустимую последовательность с контрольными точками.",
    visualKind: "scene"
  },
  storage_marking: {
    competencies: ["ПК 1.1", "ПК 1.4", "ОК 01", "ОК 02", "ОК 07"],
    checkCriterion: "Выбрано допустимое решение по таре, маркировке, температуре и товарному соседству.",
    visualKind: "control-detail"
  },
  order_assembly: {
    competencies: ["ПК 1.1", "ПК 1.2", "ПК 1.3", "ПК 1.4", "ОК 01", "ОК 02"],
    checkCriterion: "Комплексный заказ собран как целостный маршрут от заявки до передачи партии.",
    visualKind: "control-detail"
  }
};

function buildDigitalShiftMethodicalMatrix(variantId, config, previewAssets) {
  const familyMap = new Map(pm01DigitalShiftFamilies.map((family) => [family.id, family]));
  const assetsByKind = new Map((previewAssets || []).map((asset) => [asset.kind, asset]));
  return (config.tasks || []).map(([familyId, title], index) => {
    const family = familyMap.get(familyId) || {};
    const meta = pm01DigitalShiftMethodicalMeta[familyId] || {};
    const visualAsset = assetsByKind.get(meta.visualKind) || previewAssets?.[0] || null;
    return {
      id: `${variantId}-${familyId}-matrix`,
      familyId,
      rpTopic: config.rpTopics[index % config.rpTopics.length],
      competencies: meta.competencies || ["ПК 1.1", "ОК 01", "ОК 02"],
      examModule: "PX Цифровая смена (training-only, 0 баллов)",
      currentQuestion: title,
      newFormat: family.title || familyId,
      interaction: family.interaction || "",
      visualAsset: visualAsset
        ? {
            id: visualAsset.id,
            kind: visualAsset.kind,
            targetPath: visualAsset.targetPath,
            status: visualAsset.status,
            finalAsset: visualAsset.finalAsset
          }
        : null,
      checkCriterion: meta.checkCriterion || "Критерий уточняется после сверки с РП.",
      approvalGate: "requires_rp_and_preview_approval"
    };
  });
}

function clonePm01Config(value) {
  return JSON.parse(JSON.stringify(value));
}

function digitalShiftStepImage(stepId) {
  const stepImages = {
    order: extendedVisualAssets.safety.labelledContainer,
    check: extendedVisualAssets.safety.thermometerCheck,
    calc: extendedVisualAssets.safety.labelledContainer,
    places: extendedVisualAssets.safety.colorCodedBoards,
    process: "/assets/pm01/complex-workshop.png",
    semi: generatedSemiFinishedProductAssets.generatedMixedMirepoix,
    quality: extendedVisualAssets.safety.thermometerCheck,
    pack: "/assets/pm01/packaging/gastronorm-lid.png",
    mark: extendedVisualAssets.safety.labelledContainer,
    store: extendedVisualAssets.safety.fridgeSeparateStorage
  };
  return stepImages[stepId] || "/assets/pm01/complex-workshop.png";
}

function markPracticeQuestion(question, familyId, meta = {}) {
  const prepared = clonePm01Config(question);
  prepared.id = meta.id || `${prepared.id}-practice`;
  prepared.prompt = meta.prompt || prepared.prompt;
  prepared.note = meta.note || prepared.note || "Тренировочное расширение цифровой смены.";
  prepared.maxScore = 0;
  prepared.practiceOnly = true;
  prepared.practiceFamily = familyId;
  prepared.visualMode = meta.visualMode || prepared.visualMode || "";
  prepared.interactionHint = meta.interactionHint || prepared.interactionHint || "";
  prepared.explanation = meta.explanation || prepared.explanation || "";
  prepared.competencyTags = meta.competencyTags || prepared.competencyTags || [];
  if (prepared.visualMode === "production_timeline" && Array.isArray(prepared.items)) {
    prepared.items = prepared.items.map((item) => ({
      ...item,
      image: item.image || digitalShiftStepImage(item.id),
      detail: item.detail || "Контрольная операция цифровой производственной смены."
    }));
  }
  return prepared;
}

function findFirstQuestion(variant, predicate) {
  return [...(variant.simulation || []), ...(variant.test || []), ...(variant.calculation || [])].find(predicate) || null;
}

function buildStoragePracticeQuestion(variantId, config) {
  return bucket(
    `${variantId}-practice-storage`,
    "Распределите партии по решению хранения и маркировки.",
    config.storageCards.map(([id, title, meta]) => [id, title, meta]),
    [
      ["allowed", "Готово к хранению"],
      ["correct", "Исправить условия"],
      ["reject", "Не передавать"]
    ],
    Object.fromEntries(config.storageCards.map(([id, , , bucketId]) => [id, bucketId])),
    {
      maxScore: 0,
      visualMode: "storage_marking",
      note: "Тренажер: проверьте тару, маркировку, холод и товарное соседство.",
      interactionHint: "Выберите партию, затем решение по хранению или маркировке.",
      explanation:
        "Современный формат проверяет не один термин, а производственное решение по безопасности партии.",
      competencyTags: ["ПК 1.1", "ПК 1.2", "ОК 01", "ОК 02", "ОК 07"],
      practiceOnly: true,
      practiceFamily: "storage_marking"
    }
  );
}

function buildOrderPracticeQuestion(variantId, config) {
  const stepImages = {
    accept: "/assets/pm01/process/veg-sort.png",
    sort: "/assets/pm01/process/veg-sort.png",
    wash: "/assets/pm01/process/veg-wash.png",
    peel: "/assets/pm01/process/veg-peel.png",
    cut: "/assets/pm01/process/veg-cut.png",
    quality: extendedVisualAssets.safety.thermometerCheck,
    mark: extendedVisualAssets.safety.labelledContainer,
    store: extendedVisualAssets.safety.fridgeSeparateStorage,
    cool: "/assets/pm01/fish-process/fish-cooling.png",
    scale: "/assets/pm01/fish-process/fish-scale.png",
    gut: "/assets/pm01/fish-process/fish-gut.png",
    rinse: "/assets/pm01/fish-process/fish-rinse.png",
    fillet: "/assets/pm01/fish-process/fish-portioning.png",
    portion: generatedSemiFinishedProductAssets.generatedFishFilletPortions,
    workplace: extendedVisualAssets.safety.colorCodedBoards,
    trim: semiFinishedProductAssets.meatLargePiece,
    grinder: "/assets/pm01/meat-grinder/body.png",
    mince: semiFinishedProductAssets.meatCutletMassPortions,
    form: semiFinishedProductAssets.meatCutletsFormed,
    defrost: extendedVisualAssets.safety.fridgeSeparateStorage,
    clean: semiFinishedProductAssets.chickenPreparedCarcass,
    order: extendedVisualAssets.safety.labelledContainer,
    check: extendedVisualAssets.safety.thermometerCheck,
    zones: extendedVisualAssets.safety.colorCodedBoards,
    calc: extendedVisualAssets.safety.labelledContainer,
    prepare: "/assets/pm01/complex-workshop.png",
    pack: "/assets/pm01/packaging/gastronorm-lid.png",
    transfer: extendedVisualAssets.safety.fridgeSeparateStorage
  };
  const items = config.orderSteps.map(([id, text]) => [
    id,
    text,
    {
      image: stepImages[id] || "/assets/pm01/complex-workshop.png",
      detail: "Шаг цифровой производственной смены."
    }
  ]);
  const ids = config.orderSteps.map(([id]) => id);
  return sequence(
    `${variantId}-practice-order`,
    "Соберите маршрут заказа в цифровой производственной смене.",
    items,
    ids,
    {
      maxScore: 0,
      visualMode: "order_assembly",
      note: "Тренажер: восстановите смену от приемки до передачи партии.",
      interactionHint: "Выберите операцию смены, затем поставьте ее в правильный шаг.",
      explanation:
        "Задание связывает отдельные операции в целостный производственный процесс и готовит к комплексному заказу.",
      competencyTags: ["ПК 1.1", "ПК 1.2", "ПК 1.3", "ПК 1.4", "ОК 01", "ОК 02"],
      practiceOnly: true,
      practiceFamily: "order_assembly"
    }
  );
}

function buildPm01DigitalShiftPracticeQuestions(variant) {
  const config = pm01DigitalShiftVariantPackages[variant.id];
  if (!config) {
    return [];
  }
  const quality = findFirstQuestion(variant, (question) => question.visualMode === "quality_control");
  const investigation = findFirstQuestion(variant, (question) => question.type === "hotspot_scene");
  const timeline = findFirstQuestion(variant, (question) => question.type === "sequence_drag");

  return [
    quality
      ? markPracticeQuestion(quality, "quality_control", {
          id: `${variant.id}-practice-quality`,
          prompt: config.tasks.find(([family]) => family === "quality_control")?.[1] || quality.prompt,
          note: "Тренажер: оцените визуальные признаки, карту контроля и риск партии.",
          explanation: pm01DigitalShiftFamilies.find((family) => family.id === "quality_control").modernity
        })
      : null,
    investigation
      ? markPracticeQuestion(investigation, "shift_investigation", {
          id: `${variant.id}-practice-investigation`,
          prompt: config.tasks.find(([family]) => family === "shift_investigation")?.[1] || investigation.prompt,
          visualMode: "shift_investigation",
          note: "Тренажер: найдите видимые причины риска на производственной сцене.",
          explanation: pm01DigitalShiftFamilies.find((family) => family.id === "shift_investigation").modernity
        })
      : null,
    timeline
      ? markPracticeQuestion(timeline, "production_timeline", {
          id: `${variant.id}-practice-timeline`,
          prompt: config.tasks.find(([family]) => family === "production_timeline")?.[1] || timeline.prompt,
          visualMode: "production_timeline",
          note: "Тренажер: соберите операции как производственный таймлайн.",
          explanation: pm01DigitalShiftFamilies.find((family) => family.id === "production_timeline").modernity
        })
      : null,
    buildStoragePracticeQuestion(variant.id, config),
    buildOrderPracticeQuestion(variant.id, config)
  ].filter(Boolean);
}

module.exports.digitalShift = {
  mode: "training_extension",
  title: "Цифровая производственная смена",
  contract:
    "Официальный экзамен остается 100 баллов и 20 заданий. Расширение доступно только в тренировке и не влияет на итоговую ведомость.",
  rpStatus: "Рабочие программы будут подключены после предоставления преподавателем; сейчас матрица подготовлена под сверку.",
  conceptReference: "approved-preview-2026-06-20",
  normativeAnchors: pm01DigitalShiftNormativeAnchors,
  families: pm01DigitalShiftFamilies,
  interactionBlueprints: pm01DigitalShiftInteractionBlueprints,
  packages: Object.entries(pm01DigitalShiftVariantPackages).map(([variantId, config]) => {
    const previewAssets = buildDigitalShiftPreviewAssets(variantId, config);
    return {
      variantId,
      title: config.title,
      rpTopics: config.rpTopics,
      productionLog: config.productionLog,
      visualPrompts: config.visualPrompts,
      previewAssets,
      methodicalMatrix: buildDigitalShiftMethodicalMatrix(variantId, config, previewAssets),
      tasks: config.tasks.map(([familyId, title]) => ({
        familyId,
        title,
        familyTitle: pm01DigitalShiftFamilies.find((family) => family.id === familyId)?.title || familyId
      }))
    };
  })
};

module.exports.variants.forEach((variant) => {
  const config = pm01DigitalShiftVariantPackages[variant.id];
  if (!config) {
    return;
  }
  variant.digitalShift = module.exports.digitalShift.packages.find((item) => item.variantId === variant.id) || null;
  variant.practiceOnly = buildPm01DigitalShiftPracticeQuestions(variant);
});
