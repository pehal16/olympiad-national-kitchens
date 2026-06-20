const vegetablePhotoCutSourceItems = require("./pm01-vegetable-photo-cuts.json");
const semiFinishedProductSourceItems = require("./pm01-semi-finished-products.json");

const vegetablePhotoCutItems = vegetablePhotoCutSourceItems.map(({ source, crop, ...item }) => item);
const vegetablePhotoCutAssets = Object.fromEntries(
  vegetablePhotoCutItems.map((item) => [item.id, item.image])
);
const semiFinishedProductItems = semiFinishedProductSourceItems.map(({ source, crop, ...item }) => item);
const semiFinishedProductAssets = Object.fromEntries(
  semiFinishedProductItems.map((item) => [item.id, item.image])
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
    maxScore: meta.maxScore || 2,
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
    maxScore: meta.maxScore || 2,
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
    note: "Соберите правильный технологический порядок операций.",
    maxScore: meta.maxScore || 2,
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
    maxScore: meta.maxScore || 2,
    visualMode: meta.visualMode || "",
    interactionHint: meta.interactionHint || "",
    items: items.map(([key, text, itemMeta = {}]) => ({ id: key, text, ...itemMeta })),
    buckets: buckets.map(([key, label, bucketMeta = {}]) => ({ id: key, label, ...bucketMeta })),
    correctBuckets,
    explanation: meta.explanation || "",
    competencyTags: meta.competencyTags || []
  };
}

function calculation(id, prompt, formulas, fields, solutionSteps, meta = {}) {
  return {
    id,
    type: "calculation_task",
    prompt,
    formulas,
    fields,
    solutionSteps,
    maxScore: meta.maxScore || 10,
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
    maxScore: meta.maxScore || 6,
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
    displayLimit: 10,
    items: semiFinishedByGroup("meat")
  },
  {
    id: "extended-fish",
    title: "Рыба",
    displayLimit: 10,
    items: semiFinishedByGroup("fish")
  },
  {
    id: "extended-poultry",
    title: "Птица и кролик",
    displayLimit: 10,
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
        multiple("veg-sim-equipment", "Выберите оборудование овощного участка.", [
          ["table", "производственный стол"],
          ["bath", "моечная ванна"],
          ["peeler", "картофелечистка"],
          ["cutter", "овощерезка"],
          ["board", "доска и ножи"],
          ["mixer", "планетарный миксер"]
        ], ["table", "bath", "peeler", "cutter", "board"], { maxScore: 6 }),
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
                image: semiFinishedProductAssets.fishFilletNatural,
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
                image: semiFinishedProductAssets.fishBreadedPortions,
                detail: "Порционные куски, подготовленные с панировкой перед жаркой."
              }
            ],
            [
              "cutlets",
              "рыбные котлеты",
              {
                image: semiFinishedProductAssets.fishCutletsFormed,
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
        multiple("fish-sim-storage", "Выберите правильное хранение рыбных полуфабрикатов.", [["cold", "охлажденный вид"], ["clean", "чистая тара"], ["separate", "раздельное хранение"], ["terms", "соблюдение сроков"], ["open", "лоток без крышки в общей рабочей зоне"]], ["cold", "clean", "separate", "terms"], { maxScore: 6 })
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
        bucket(
          "meat-sim-groups",
          "Распределите мясные полуфабрикаты по группам.",
          [
            [
              "entrecote",
              "антрекот",
              {
                image: semiFinishedProductAssets.meatEntrecotePortion,
                detail: "Порционный натуральный полуфабрикат из говядины."
              }
            ],
            [
              "goulash",
              "гуляш",
              {
                image: semiFinishedProductAssets.meatGoulashCubes,
                detail: "Мелкокусковой полуфабрикат кубиками для тушения."
              }
            ],
            [
              "azu",
              "азу",
              {
                image: semiFinishedProductAssets.meatAzuStrips,
                detail: "Мелкокусковой полуфабрикат продолговатыми брусочками."
              }
            ],
            [
              "cutlets",
              "котлеты",
              {
                image: semiFinishedProductAssets.meatCutletsFormed,
                detail: "Рубленые изделия из котлетной массы."
              }
            ],
            [
              "large",
              "крупный кусок",
              {
                image: semiFinishedProductAssets.meatLargePiece,
                detail: "Крупнокусковой полуфабрикат для дальнейшей тепловой обработки."
              }
            ],
            [
              "romsteak",
              "ромштекс",
              {
                image: semiFinishedProductAssets.meatRomsteakBreaded,
                detail: "Панированный порционный полуфабрикат."
              }
            ]
          ],
          [
            ["portion", "порционные натуральные"],
            ["small", "мелкокусковые"],
            ["minced", "рубленые"],
            ["large", "крупнокусковые"],
            ["breaded", "панированные порционные"]
          ],
          { entrecote: "portion", goulash: "small", azu: "small", cutlets: "minced", large: "large", romsteak: "breaded" },
          {
            maxScore: 6,
            visualMode: "product_cards",
            interactionHint: "Перенесите карточку полуфабриката в группу по способу подготовки."
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
                image: semiFinishedProductAssets.chickenFilletNatural,
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
                image: semiFinishedProductAssets.rabbitPortions,
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
        multiple("poultry-sim-bad", "Выберите признаки недоброкачественной птицы.", [["smell", "неприятный запах"], ["slime", "слизь"], ["mold", "плесень"], ["green", "позеленение"], ["dark", "потемнение"], ["loose", "дряблая консистенция"], ["dry", "чистая сухая поверхность"]], ["smell", "slime", "mold", "green", "dark", "loose"], { maxScore: 6 }),
        bucket(
          "poultry-sim-parts",
          "Соотнесите полуфабрикат и часть птицы.",
          [
            ["fillet", "филе", { image: semiFinishedProductAssets.chickenFilletNatural, detail: "Грудная мякоть без кости." }],
            ["leg", "окорочок", { image: semiFinishedProductAssets.chickenLegQuarter, detail: "Бедро и голень вместе." }],
            ["drumstick", "голень", { image: semiFinishedProductAssets.chickenDrumstick, detail: "Нижняя часть ноги." }],
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
            ["fish-portion", "порционные куски рыбы", { image: semiFinishedProductAssets.fishPortionPieces, detail: "Куски рыбы одинаковой массы для дальнейшей тепловой обработки." }],
            ["fish-mince", "рыбная котлетная масса", { image: semiFinishedProductAssets.fishMinceMass, detail: "Измельченная рыбная масса для формования котлет и биточков." }],
            ["fish-cutlets", "рыбные котлеты", { image: semiFinishedProductAssets.fishCutletsFormed, detail: "Сформованные полуфабрикаты из рыбной котлетной массы." }],
            ["fish-breaded", "панированный рыбный полуфабрикат", { image: semiFinishedProductAssets.fishBreadedPortions, detail: "Порционный рыбный полуфабрикат, подготовленный к жарке." }],
            ["meat-goulash", "гуляш из говядины", { image: semiFinishedProductAssets.meatGoulashCubes, detail: "Мелкокусковой мясной полуфабрикат, не относится к рыбному участку." }]
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
            ["goulash", "гуляш", { image: semiFinishedProductAssets.meatGoulashCubes, detail: "Мелкокусковой мясной полуфабрикат для тушения." }],
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
        multiple("complex-sim-consult", "Выберите правильную консультацию потребителю.", [["fridge", "хранить в холодильнике"], ["term", "соблюдать срок"], ["closed", "не вскрывать заранее"], ["separate", "не хранить рыбу/мясо с готовыми блюдами"], ["check", "проверять вид и запах"], ["warm", "хранить у плиты"]], ["fridge", "term", "closed", "separate", "check"], { maxScore: 6 })
      ]
    }
  ]
};
