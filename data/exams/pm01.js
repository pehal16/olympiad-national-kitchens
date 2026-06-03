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

module.exports = {
  schemaVersion: 1,
  id: "pm01-2026-exam",
  slug: "pm01-interactive-exam",
  title: "Интерактивный экзамен ПМ.01",
  subtitle: "МДК 01.01-01.02: полуфабрикаты разнообразного ассортимента",
  description:
    "Цифровая производственная мастерская: тест, расчеты, голосовой ответ и интерактивная симуляция.",
  profession: "43.01.09 Повар, кондитер",
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
      id: "price",
      title: "Стоимость партии",
      formula: "Стоимость = (сырье + упаковка) × (1 + наценка / 100)"
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
      brunoise: "/assets/pm01/cuts/brunoise.png",
      rondelle: "/assets/pm01/cuts/rondelle.png",
      mirepoix: "/assets/pm01/cuts/mirepoix.png",
      batonnet: "/assets/pm01/cuts/batonnet.png",
      wedges: "/assets/pm01/cuts/wedges.png",
      rings: "/assets/pm01/cuts/rings.png",
      slices: "/assets/pm01/cuts/slices.png"
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
    meatSemiProducts: {
      entrecote: "/assets/pm01/meat-products/entrecote.png",
      goulash: "/assets/pm01/meat-products/goulash.png",
      azu: "/assets/pm01/meat-products/azu.png",
      cutlets: "/assets/pm01/meat-products/cutlets.png",
      largePiece: "/assets/pm01/meat-products/large-piece.png",
      romsteak: "/assets/pm01/meat-products/romsteak.png"
    },
    violationScenes: {
      vegetables: "/assets/pm01/violations/vegetable.png",
      fish: "/assets/pm01/violations/fish.png",
      meat: "/assets/pm01/violations/meat.png",
      poultry: "/assets/pm01/violations/poultry.png",
      complex: "/assets/pm01/violations/complex.png"
    }
  },
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
              "мойка",
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
        single("veg-t1-calibration", "Для чего проводится калибровка овощей?", [
          ["a", "чтобы овощи были одинакового цвета"],
          ["b", "чтобы снизить отходы при машинной очистке"],
          ["c", "чтобы увеличить массу продукта"],
          ["d", "чтобы быстрее оформить заявку"]
        ], "b"),
        single("veg-t1-gross", "Что означает масса «брутто»?", [
          ["a", "масса готового блюда"],
          ["b", "масса отходов"],
          ["c", "масса необработанного сырья"],
          ["d", "масса продукта после очистки"]
        ], "c"),
        single("veg-t1-net", "Что означает масса «нетто»?", [
          ["a", "масса продукта после обработки"],
          ["b", "масса тары"],
          ["c", "масса продукта вместе с упаковкой"],
          ["d", "масса отходов"]
        ], "a"),
        bucket(
          "veg-t1-cuts",
          "Соотнесите форму нарезки и описание.",
          [
            ["julienne", "соломка"],
            ["batonnet", "брусочки"],
            ["brunoise", "мелкие кубики"],
            ["rondelle", "кружочки"],
            ["wedges", "дольки"],
            ["rings", "кольца"],
            ["slices", "ломтики"],
            ["mirepoix", "крупная нарезка"]
          ],
          [
            [
              "thin",
              "тонкая соломка",
              {
                image: "/assets/pm01/cuts/julienne.png",
                visualTitle: "Тонкая соломка",
                detail: "Длинные ровные полоски для салатов, гарниров и быстрой тепловой обработки."
              }
            ],
            [
              "batons",
              "брусочки",
              {
                image: "/assets/pm01/cuts/batonnet.png",
                visualTitle: "Брусочки",
                detail: "Продолговатые бруски одинаковой толщины для картофеля, корнеплодов, супов и гарниров."
              }
            ],
            [
              "small",
              "мелкие кубики",
              {
                image: "/assets/pm01/cuts/brunoise.png",
                visualTitle: "Мелкие кубики",
                detail: "Очень мелкая равномерная нарезка для соусов, начинок и аккуратной подачи."
              }
            ],
            [
              "round",
              "кружочки",
              {
                image: "/assets/pm01/cuts/rondelle.png",
                visualTitle: "Кружочки",
                detail: "Поперечные круглые ломтики овощей одинаковой толщины."
              }
            ],
            [
              "wedges",
              "дольки",
              {
                image: "/assets/pm01/cuts/wedges.png",
                visualTitle: "Дольки",
                detail: "Клиновидные части овоща для картофеля, томатов, запекания и тушения."
              }
            ],
            [
              "rings",
              "кольца",
              {
                image: "/assets/pm01/cuts/rings.png",
                visualTitle: "Кольца",
                detail: "Поперечная нарезка лука или овощей с выраженным центральным отверстием."
              }
            ],
            [
              "slices",
              "ломтики",
              {
                image: "/assets/pm01/cuts/slices.png",
                visualTitle: "Ломтики",
                detail: "Плоские ровные пластины одинаковой толщины для гарниров, салатов и дальнейшей обработки."
              }
            ],
            [
              "rough",
              "крупная грубая нарезка",
              {
                image: "/assets/pm01/cuts/mirepoix.png",
                visualTitle: "Крупная нарезка",
                detail: "Крупные кусочки овощей для основы бульонов, тушения и ароматизации."
              }
            ]
          ],
          {
            julienne: "thin",
            batonnet: "batons",
            brunoise: "small",
            rondelle: "round",
            wedges: "wedges",
            rings: "rings",
            slices: "slices",
            mirepoix: "rough"
          },
          {
            visualMode: "cut_shapes",
            interactionHint: "Перенесите название формы нарезки на подходящее фото."
          }
        ),
        single("veg-t1-potato-storage", "Как хранят очищенный картофель кратковременно?", [
          ["a", "открытым на столе"],
          ["b", "в холодной воде"],
          ["c", "около плиты"],
          ["d", "вместе с отходами"]
        ], "b"),
        multiple("veg-t1-equipment", "Что относится к оборудованию овощного цеха?", [
          ["a", "картофелечистка"],
          ["b", "овощерезка"],
          ["c", "моечная ванна"],
          ["d", "мясорыхлитель"]
        ], ["a", "b", "c"]),
        single("veg-t1-recipe-book", "Что нельзя делать при работе со сборником рецептур?", [
          ["a", "пользоваться нормами брутто и нетто"],
          ["b", "определять выход блюда"],
          ["c", "смешивать нормы из разных колонок одной рецептуры"],
          ["d", "использовать приложения для расчетов"]
        ], "c"),
        single("veg-t1-spices", "Что такое пряности?", [
          ["a", "только соль и сахар"],
          ["b", "продукты растительного происхождения, придающие вкус и аромат"],
          ["c", "любые пищевые отходы"],
          ["d", "только жидкие соусы"]
        ], "b"),
        single("veg-t1-storage", "Какой вариант хранения обработанных овощей правильный?", [
          ["a", "нарезанные овощи лежат открыто 5 часов"],
          ["b", "овощи накрыты влажной тканью в чистой таре"],
          ["c", "картофель лежит рядом с отходами"],
          ["d", "зелень хранится на полу"]
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
              "промывание",
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
          "Соотнесите название формы нарезки с фото и типичным применением.",
          [
            ["straw", "соломка"],
            ["sticks", "брусочки"],
            ["cubes", "кубики"],
            ["wedges", "дольки"],
            ["slices", "ломтики"],
            ["rondelle", "кружочки"]
          ],
          [
            [
              "fry",
              "жарка картофеля и гарниры",
              {
                image: "/assets/pm01/cuts/julienne.png",
                visualTitle: "Соломка",
                detail: "Длинная ровная нарезка для жарки, салатов и гарниров."
              }
            ],
            [
              "soup",
              "супы и гарниры",
              {
                image: "/assets/pm01/cuts/batonnet.png",
                visualTitle: "Брусочки",
                detail: "Продолговатые бруски для картофеля, моркови, супов и гарниров."
              }
            ],
            [
              "salad",
              "салаты, винегреты, начинки",
              {
                image: "/assets/pm01/cuts/brunoise.png",
                visualTitle: "Кубики",
                detail: "Равномерные кубики для салатов, винегретов, начинок и холодных блюд."
              }
            ],
            [
              "bake",
              "запекание и тушение",
              {
                image: "/assets/pm01/cuts/wedges.png",
                visualTitle: "Дольки",
                detail: "Клиновидные части картофеля, томатов и корнеплодов для запекания и тушения."
              }
            ],
            [
              "serve",
              "подача и холодные блюда",
              {
                image: "/assets/pm01/cuts/slices.png",
                visualTitle: "Ломтики",
                detail: "Плоские ровные пластины для гарниров, салатов и дальнейшей обработки."
              }
            ],
            [
              "stew",
              "гарниры и пассерование",
              {
                image: "/assets/pm01/cuts/rondelle.png",
                visualTitle: "Кружочки",
                detail: "Поперечные круглые ломтики моркови, кабачка, огурца и других овощей."
              }
            ]
          ],
          { straw: "fry", sticks: "soup", cubes: "salad", wedges: "bake", slices: "serve", rondelle: "stew" },
          {
            maxScore: 6,
            visualMode: "cut_shapes",
            interactionHint: "Перенесите название формы на карточку с изображением и применением."
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
          "Заполните мини-заявку по расчетам варианта.",
          ["Используйте результаты расчетов модуля 2."],
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
        single("fish-t1-groups", "По способу обработки рыбу делят на:", [
          ["a", "сладкую, кислую, соленую"],
          ["b", "чешуйчатую, бесчешуйчатую, осетровую"],
          ["c", "вареную, жареную, тушеную"],
          ["d", "крупную и мелкую"]
        ], "b"),
        single("fish-t1-board", "Какой доской пользуются для сырой рыбы?", [["a", "МС"], ["b", "РС"], ["c", "ВО"], ["d", "ХК"]], "b"),
        single("fish-t1-scale", "В каком направлении очищают рыбу от чешуи?", [["a", "от головы к хвосту"], ["b", "от хвоста к голове"], ["c", "сверху вниз"], ["d", "по кругу"]], "b"),
        multiple("fish-t1-quality", "Укажите признаки доброкачественной рыбы.", [["a", "прозрачные глаза"], ["b", "ярко-красные жабры"], ["c", "плотная упругая мякоть"], ["d", "неприятный запах"]], ["a", "b", "c"]),
        single("fish-t1-ro1", "Для чего применяют рыбоочистительную машину РО-1?", [["a", "для нарезки овощей"], ["b", "для удаления чешуи"], ["c", "для измельчения мяса"], ["d", "для взвешивания рыбы"]], "b"),
        single("fish-t1-breading", "С какой целью рыбу панируют перед жаркой?", [["a", "для сохранения сочности и образования корочки"], ["b", "чтобы скрыть запах порчи"], ["c", "чтобы увеличить отходы"], ["d", "чтобы заменить тепловую обработку"]], "a"),
        sequence("fish-t1-cutlet", "Установите порядок приготовления рыбной котлетной массы.", [["fillet", "разделать на филе"], ["grind", "измельчить"], ["bread", "замочить хлеб"], ["mix", "соединить"], ["spice", "добавить соль/перец"], ["beat", "вымешать и выбить"]], ["fillet", "grind", "bread", "mix", "spice", "beat"]),
        single("fish-t1-storage", "Где хранят рыбные полуфабрикаты до тепловой обработки?", [["a", "при комнатной температуре"], ["b", "в холодильнике"], ["c", "на открытом столе"], ["d", "около плиты"]], "b"),
        multiple("fish-t1-seafood", "Что относится к нерыбному водному сырью?", [["a", "креветки"], ["b", "мидии"], ["c", "кальмары"], ["d", "говядина"]], ["a", "b", "c"]),
        single("fish-t1-danger", "Какое нарушение является опасным?", [["a", "рыба разделывается на специальной доске"], ["b", "отходы удаляются вовремя"], ["c", "рыба промывается холодной водой"], ["d", "сырая рыба лежит рядом с готовыми овощами"]], "d")
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
        calculation("fish-calc-cutlets", "Нужно приготовить 60 рыбных котлет по 75 г. Состав массы: филе — 65 %, хлеб — 18 %, жидкость — 15 %, соль и специи — 2 %.", ["М партии = n × m", "Компонент = М партии × доля / 100"], [
          { id: "filletKg", label: "Филе", unit: "кг", expected: 2.925, tolerance: 0.01 },
          { id: "breadKg", label: "Хлеб", unit: "кг", expected: 0.81, tolerance: 0.01 },
          { id: "liquidKg", label: "Жидкость", unit: "кг", expected: 0.675, tolerance: 0.01 },
          { id: "spiceKg", label: "Соль и специи", unit: "кг", expected: 0.09, tolerance: 0.01 }
        ], ["Общая масса = 60 × 75 г = 4,5 кг", "Филе = 2,925 кг; хлеб = 0,81 кг; жидкость = 0,675 кг; соль/специи = 0,09 кг"])
      ],
      voice: voice("fish-voice", "Объясните порядок организации рабочего места и обработки чешуйчатой рыбы для приготовления полуфабрикатов.", ["рыбный или мясорыбный цех", "доска РС", "ножи, скребок, лотки, весы", "проверка качества по запаху, глазам, жабрам и мякоти", "очистка от хвоста к голове", "потрошение, промывание, нарезка", "хранение в холодильнике"], { exemplar: commonRubric }),
      simulation: [
        sequence("fish-sim-chain", "Соберите технологическую цепочку обработки рыбы.", [["quality", "проверка качества"], ["defrost", "размораживание"], ["scale", "очистка"], ["gut", "потрошение"], ["trim", "удаление плавников/головы"], ["rinse", "промывание"], ["portion", "нарезка/формование"], ["cool", "охлаждение"]], ["quality", "defrost", "scale", "gut", "trim", "rinse", "portion", "cool"], { maxScore: 6 }),
        multiple("fish-sim-inventory", "Выберите инвентарь рыбного участка.", [["board", "доска РС"], ["knife", "нож"], ["scaler", "рыбочистка"], ["scraper", "нож-скребок"], ["trays", "лотки"], ["scales", "весы"], ["fridge", "холодильный шкаф"], ["table", "стол"], ["musat", "мусат для мясного цеха"]], ["board", "knife", "scaler", "scraper", "trays", "scales", "fridge", "table"], { maxScore: 6 }),
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
                image: "/assets/pm01/fish-products/fish-fillet.png",
                detail: "Пласт мякоти без костей; используется как натуральный полуфабрикат."
              }
            ],
            [
              "portion",
              "порционный кусок",
              {
                image: "/assets/pm01/fish-products/fish-portion.png",
                detail: "Ровные куски заданной массы для жарки, припускания или запекания."
              }
            ],
            [
              "breaded",
              "рыба панированная",
              {
                image: "/assets/pm01/fish-products/fish-breaded.png",
                detail: "Порционные куски, подготовленные с панировкой перед жаркой."
              }
            ],
            [
              "cutlets",
              "рыбные котлеты",
              {
                image: "/assets/pm01/fish-products/fish-cutlets.png",
                detail: "Изделия из рыбной котлетной массы, сформованные порционно."
              }
            ],
            [
              "mince",
              "рыбная котлетная масса",
              {
                image: "/assets/pm01/fish-products/fish-mince.png",
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
        multiple("fish-sim-storage", "Выберите правильное хранение рыбных полуфабрикатов.", [["cold", "охлажденный вид"], ["clean", "чистая тара"], ["separate", "раздельное хранение"], ["terms", "соблюдение сроков"], ["open", "открыто на столе"]], ["cold", "clean", "separate", "terms"], { maxScore: 6 })
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
        multiple("meat-t1-raw", "Что относится к мясному сырью?", [["a", "говядина"], ["b", "свинина"], ["c", "баранина"], ["d", "капуста"]], ["a", "b", "c"]),
        multiple("meat-t1-products", "Какие полуфабрикаты относятся к мясным?", [["a", "крупнокусковые"], ["b", "порционные"], ["c", "мелкокусковые"], ["d", "рыбные"]], ["a", "b", "c"]),
        single("meat-t1-boning", "Какой нож используют для отделения мяса от костей?", [["a", "обвалочный"], ["b", "кондитерский"], ["c", "овощной"], ["d", "рыбочистку"]], "a"),
        single("meat-t1-musat", "Для чего используют мусат?", [["a", "для правки ножей"], ["b", "для варки мяса"], ["c", "для хранения фарша"], ["d", "для мытья досок"]], "a"),
        multiple("meat-t1-mincer", "Какие элементы входят в устройство мясорубки МИМ-82?", [["a", "корпус"], ["b", "шнек"], ["c", "ножи и решетки"], ["d", "тестораскаточная лента"]], ["a", "b", "c"]),
        single("meat-t1-pusher", "Чем разрешено проталкивать мясо в мясорубку?", [["a", "рукой"], ["b", "ножом"], ["c", "деревянным пестиком или толкателем"], ["d", "вилкой"]], "c"),
        multiple("meat-t1-offal", "Что относится к субпродуктам?", [["a", "печень"], ["b", "почки"], ["c", "язык"], ["d", "картофель"]], ["a", "b", "c"]),
        single("meat-t1-offal-fast", "Почему субпродукты быстро обрабатывают?", [["a", "они особо скоропортящиеся"], ["b", "они не имеют запаха"], ["c", "они не требуют проверки"], ["d", "их нельзя мыть"]], "a"),
        single("meat-t1-forbidden", "Какое действие запрещено при работе с оборудованием?", [["a", "проверять исправность до включения"], ["b", "разбирать включенную машину"], ["c", "мыть детали после отключения"], ["d", "использовать толкатель"]], "b"),
        single("meat-t1-small", "Какой полуфабрикат относится к мелкокусковым?", [["a", "гуляш"], ["b", "антрекот"], ["c", "бифштекс натуральный"], ["d", "крупный кусок мяса для варки"]], "a")
      ],
      calculation: [
        calculation("meat-calc-net", "В мясной цех поступило 40 кг говядины. Отходы и потери при обработке — 26 %. Определите массу отходов и массу полуфабриката нетто.", ["М отходов = М брутто × W / 100", "М нетто = М брутто − М отходов"], [
          { id: "wasteKg", label: "Масса отходов", unit: "кг", expected: 10.4, tolerance: 0.01 },
          { id: "netKg", label: "Масса нетто", unit: "кг", expected: 29.6, tolerance: 0.01 }
        ], ["М отходов = 40 × 26 / 100 = 10,4 кг", "М нетто = 40 − 10,4 = 29,6 кг"]),
        calculation("meat-calc-cutlets", "Нужно приготовить 50 котлет по 75 г. Состав массы: мясо — 70 %, хлеб — 15 %, вода — 13 %, соль и специи — 2 %.", ["М партии = n × m", "Компонент = М партии × доля / 100"], [
          { id: "meatKg", label: "Мясо", unit: "кг", expected: 2.625, tolerance: 0.01 },
          { id: "breadKg", label: "Хлеб", unit: "кг", expected: 0.562, tolerance: 0.01 },
          { id: "waterKg", label: "Вода", unit: "кг", expected: 0.487, tolerance: 0.01 },
          { id: "spiceKg", label: "Соль и специи", unit: "кг", expected: 0.075, tolerance: 0.01 }
        ], ["Общая масса = 50 × 75 г = 3,75 кг", "Мясо = 2,625 кг; хлеб = 0,562 кг; вода = 0,487 кг; соль/специи = 0,075 кг"]),
        bucket("meat-calc-safety", "Укажите нарушения и действия при приготовлении рубленой массы.", [["wrong-assembly", "мясорубка собрана неправильно"], ["knives-sink", "ножи лежат в мойке"], ["hand-push", "мясо проталкивают рукой"], ["warm-mince", "фарш стоит без охлаждения"]], [["stop", "остановить и собрать по инструкции"], ["wash", "вымыть, просушить и убрать"], ["pusher", "использовать толкатель"], ["cool", "охладить или использовать по технологии"]], { "wrong-assembly": "stop", "knives-sink": "wash", "hand-push": "pusher", "warm-mince": "cool" }, { maxScore: 10 })
      ],
      voice: voice("meat-voice", "Объясните организацию рабочего места для приготовления полуфабрикатов из котлетной массы и правила безопасной эксплуатации мясорубки.", ["мясной цех", "стол, доска, ножи, лотки, весы, мясорубка, холодильник", "проверка мяса", "зачистка и нарезка", "правильная сборка мясорубки", "запрет проталкивания рукой", "отключение перед разборкой", "мытье, сушка деталей и охлаждение фарша"], { exemplar: commonRubric }),
      simulation: [
        bucket("meat-sim-tools", "Соотнесите инструмент и назначение.", [["boning", "обвалочный нож"], ["cleaver", "нож-рубак"], ["musat", "мусат"], ["mallet", "тяпка"], ["scale", "весы"]], [["bone", "отделение мяса от костей"], ["cut", "разрубание"], ["straighten", "правка"], ["beat", "отбивание"], ["mass", "контроль массы"]], { boning: "bone", cleaver: "cut", musat: "straighten", mallet: "beat", scale: "mass" }, { maxScore: 6 }),
        sequence("meat-sim-mincer", "Соберите мясорубку из карточек.", [["body", "корпус"], ["screw", "шнек"], ["knife", "нож"], ["plate", "решетка"], ["nut", "нажимная гайка"], ["hopper", "загрузочное устройство"]], ["body", "screw", "knife", "plate", "nut", "hopper"], { maxScore: 6 }),
        bucket(
          "meat-sim-groups",
          "Распределите мясные полуфабрикаты по группам.",
          [
            [
              "entrecote",
              "антрекот",
              {
                image: "/assets/pm01/meat-products/entrecote.png",
                detail: "Порционный натуральный полуфабрикат из говядины."
              }
            ],
            [
              "goulash",
              "гуляш",
              {
                image: "/assets/pm01/meat-products/goulash.png",
                detail: "Мелкокусковой полуфабрикат кубиками для тушения."
              }
            ],
            [
              "azu",
              "азу",
              {
                image: "/assets/pm01/meat-products/azu.png",
                detail: "Мелкокусковой полуфабрикат продолговатыми брусочками."
              }
            ],
            [
              "cutlets",
              "котлеты",
              {
                image: "/assets/pm01/meat-products/cutlets.png",
                detail: "Рубленые изделия из котлетной массы."
              }
            ],
            [
              "large",
              "крупный кусок",
              {
                image: "/assets/pm01/meat-products/large-piece.png",
                detail: "Крупнокусковой полуфабрикат для дальнейшей тепловой обработки."
              }
            ],
            [
              "romsteak",
              "ромштекс",
              {
                image: "/assets/pm01/meat-products/romsteak.png",
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
        sequence("meat-sim-finish", "Выберите действия после работы.", [["off", "отключить"], ["stop", "дождаться остановки"], ["disassemble", "разобрать"], ["wash", "вымыть"], ["disinfect", "продезинфицировать"], ["dry", "просушить"], ["store", "убрать место"]], ["off", "stop", "disassemble", "wash", "disinfect", "dry", "store"], { maxScore: 6 })
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
        multiple("poultry-t1-quality", "По каким признакам оценивают качество птицы?", [["a", "запах"], ["b", "цвет кожи и мышц"], ["c", "консистенция"], ["d", "цвет посуды"]], ["a", "b", "c"]),
        multiple("poultry-t1-defects", "Какие дефекты птицы являются недопустимыми?", [["a", "плесневение"], ["b", "позеленение"], ["c", "гниение"], ["d", "чистая сухая поверхность"]], ["a", "b", "c"]),
        single("poultry-t1-defrost", "Где размораживают птицу?", [["a", "в охлаждаемом помещении"], ["b", "около плиты"], ["c", "на полу"], ["d", "в горячей воде без контроля"]], "a"),
        single("poultry-t1-after-gut", "Что делают после потрошения птицы?", [["a", "промывают тушку"], ["b", "кладут рядом с отходами"], ["c", "оставляют без охлаждения"], ["d", "смешивают с овощами"]], "a"),
        multiple("poultry-t1-products", "Какие полуфабрикаты готовят из птицы?", [["a", "филе натуральное"], ["b", "окорочок"], ["c", "бедро, голень"], ["d", "рыбные котлеты"]], ["a", "b", "c"]),
        single("poultry-t1-pin", "Что нужно использовать для удаления перьевых пеньков?", [["a", "пинцет"], ["b", "овощерезку"], ["c", "мясорыхлитель"], ["d", "сито"]], "a"),
        single("poultry-t1-storage", "Что нельзя делать при хранении птицы?", [["a", "хранить в холодильнике"], ["b", "хранить рядом с готовыми продуктами без упаковки"], ["c", "соблюдать товарное соседство"], ["d", "использовать чистую тару"]], "b"),
        single("poultry-t1-rabbit", "К какому виду сырья относится кролик в рамках ПМ.01?", [["a", "мясное сырье"], ["b", "кондитерское сырье"], ["c", "нерыбное водное сырье"], ["d", "крупа"]], "a"),
        single("poultry-t1-smell", "Что должен сделать студент при неприятном запахе у тушки?", [["a", "использовать быстрее"], ["b", "промыть и продолжить"], ["c", "не использовать, сообщить преподавателю"], ["d", "смешать с другим сырьем"]], "c"),
        single("poultry-t1-place", "Какое рабочее место организуют для птицы?", [["a", "отдельное, чистое, с доской, ножами, лотками и ванной"], ["b", "любое свободное место"], ["c", "рядом с готовыми овощами"], ["d", "на полу"]], "a")
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
        sequence("poultry-sim-chain", "Соберите технологическую цепочку обработки птицы.", [["quality", "проверка качества"], ["defrost", "размораживание"], ["flame", "опаливание"], ["pins", "удаление пеньков"], ["gut", "потрошение"], ["rinse", "промывание"], ["cut", "разделка"], ["shape", "формование"], ["cool", "охлаждение"]], ["quality", "defrost", "flame", "pins", "gut", "rinse", "cut", "shape", "cool"], { maxScore: 6 }),
        multiple("poultry-sim-bad", "Выберите признаки недоброкачественной птицы.", [["smell", "неприятный запах"], ["slime", "слизь"], ["mold", "плесень"], ["green", "позеленение"], ["dark", "потемнение"], ["loose", "дряблая консистенция"], ["dry", "чистая сухая поверхность"]], ["smell", "slime", "mold", "green", "dark", "loose"], { maxScore: 6 }),
        bucket("poultry-sim-parts", "Соотнесите полуфабрикат и часть птицы.", [["fillet", "филе"], ["leg", "окорочок"], ["drumstick", "голень"], ["thigh", "бедро"], ["mince", "котлетная масса"]], [["breast", "грудная часть"], ["leg-full", "бедро и голень"], ["lower", "нижняя часть ноги"], ["upper", "верхняя часть ноги"], ["flesh", "мякоть"]], { fillet: "breast", leg: "leg-full", drumstick: "lower", thigh: "upper", mince: "flesh" }, { maxScore: 6 }),
        hotspot("poultry-sim-hotspot", "Найдите нарушения при работе с птицей.", "/assets/pm01/violations/poultry.png", [
          { id: "no-cooling", label: "Тушки птицы находятся без охлаждения", x: 19, y: 57, radius: 11 },
          { id: "dirty-board", label: "Доска загрязнена после сырой птицы", x: 52, y: 66, radius: 12 },
          { id: "cross", label: "Сырая птица находится рядом с овощами", x: 80, y: 48, radius: 12 },
          { id: "knife", label: "Нож лежит на краю стола", x: 81, y: 78, radius: 10 }
        ], { maxScore: 6 }),
        multiple("poultry-sim-label", "Выберите правильную маркировку тары.", [["name", "наименование"], ["date", "дата и время изготовления"], ["mass", "масса"], ["storage", "условия хранения"], ["term", "срок реализации"], ["teacher", "любимое блюдо повара"]], ["name", "date", "mass", "storage", "term"], { maxScore: 6 })
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
        single("complex-t1-start", "С чего начинается выполнение комплексного заказа?", [["a", "с упаковки"], ["b", "с проверки задания, сырья и рабочего места"], ["c", "с нарезки"], ["d", "с расчета стоимости после реализации"]], "b"),
        single("complex-t1-fish-place", "Куда направить рыбу для обработки?", [["a", "в рыбный или мясорыбный цех"], ["b", "в кондитерский цех"], ["c", "в моечную посуды"], ["d", "в склад готовой продукции"]], "a"),
        single("complex-t1-veg-place", "Куда направить овощи?", [["a", "в овощной цех"], ["b", "в рыбный цех"], ["c", "в мясной цех"], ["d", "в торговый зал"]], "a"),
        multiple("complex-t1-label", "Что указывают на маркировке полуфабриката?", [["a", "название"], ["b", "дата и время изготовления"], ["c", "условия хранения"], ["d", "любимое блюдо повара"]], ["a", "b", "c"]),
        single("complex-t1-neighbor", "Что такое товарное соседство?", [["a", "правильное размещение продуктов при хранении"], ["b", "хранение всего сырья вместе"], ["c", "продажа продуктов соседнему цеху"], ["d", "одинаковая цена товаров"]], "a"),
        single("complex-t1-bad-raw", "Что нужно сделать с недоброкачественным сырьем?", [["a", "использовать в первую очередь"], ["b", "смешать с качественным"], ["c", "не использовать и сообщить ответственному лицу"], ["d", "замариновать"]], "c"),
        single("complex-t1-book", "Какой документ используют для определения норм сырья и выхода?", [["a", "сборник рецептур"], ["b", "журнал посещаемости"], ["c", "расписание занятий"], ["d", "личный блокнот"]], "a"),
        multiple("complex-t1-fish-products", "Какие полуфабрикаты относятся к рыбным?", [["a", "порционные куски рыбы"], ["b", "рыбная котлетная масса"], ["c", "рыбные котлеты"], ["d", "гуляш из говядины"]], ["a", "b", "c"]),
        multiple("complex-t1-meat-products", "Какие полуфабрикаты относятся к мясным?", [["a", "гуляш"], ["b", "азу"], ["c", "ромштекс"], ["d", "соломка картофеля"]], ["a", "b", "c"]),
        single("complex-t1-safety", "Какая ошибка нарушает безопасность?", [["a", "продукты промаркированы"], ["b", "рыба, мясо и овощи хранятся раздельно"], ["c", "сырое мясо лежит рядом с готовыми полуфабрикатами"], ["d", "используются чистые лотки"]], "c")
      ],
      calculation: [
        calculation("complex-calc-net", "Поступило сырье: картофель — 20 кг, рыба — 10 кг, мясо — 15 кг, птица — 8 кг. Отходы: картофель — 30 %, рыба — 25 %, мясо — 26 %, птица — 32 %. Определите массу нетто.", ["М нетто = М брутто − М отходов"], [
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
        calculation("complex-calc-price", "Сырье стоит 4800 руб., упаковка — 350 руб., наценка — 20 %. В партии 50 полуфабрикатов. Определите стоимость партии и цену 1 штуки.", ["Стоимость = (сырье + упаковка) × (1 + наценка / 100)", "Цена 1 шт. = стоимость / количество"], [
          { id: "batchRub", label: "Стоимость партии", unit: "руб.", expected: 6180, tolerance: 0.01 },
          { id: "itemRub", label: "Цена 1 штуки", unit: "руб.", expected: 123.6, tolerance: 0.01 }
        ], ["Себестоимость = 5150 руб.", "Наценка = 1030 руб.", "Итог = 6180 руб.; 1 шт. = 123,60 руб."])
      ],
      voice: voice("complex-voice", "Покупатель приобрел рыбные, мясные и овощные полуфабрикаты. Объясните, как их правильно хранить, транспортировать и использовать.", ["быстрая транспортировка", "отдельная упаковка", "маркировка", "холодильное хранение", "запрет смешивать сырые продукты с готовыми блюдами", "проверка вида, запаха и упаковки перед приготовлением"], { exemplar: commonRubric }),
      simulation: [
        bucket("complex-sim-zones", "Распределите сырье по участкам.", [["veg", "овощи"], ["fish", "рыба"], ["beef", "говядина/свинина/баранина"], ["bird", "птица/дичь/кролик"]], [["veg-zone", "овощной цех"], ["fish-zone", "рыбный/мясорыбный цех"], ["meat-zone", "мясной цех"], ["bird-zone", "отдельная линия или мясной цех"]], { veg: "veg-zone", fish: "fish-zone", beef: "meat-zone", bird: "bird-zone" }, { maxScore: 6 }),
        sequence("complex-sim-order", "Соберите порядок выполнения комплексного заказа.", [["order", "принять заказ"], ["check", "проверить сырье"], ["calc", "рассчитать массу"], ["places", "подготовить рабочие места"], ["process", "обработать сырье"], ["semi", "приготовить полуфабрикаты"], ["quality", "проверить качество и массу"], ["pack", "упаковать"], ["mark", "промаркировать"], ["store", "хранить/реализовать"]], ["order", "check", "calc", "places", "process", "semi", "quality", "pack", "mark", "store"], { maxScore: 6 }),
        multiple("complex-sim-pack", "Выберите правильную упаковку.", [["container", "пищевой контейнер"], ["tray", "лоток с пленкой"], ["bag", "пакет для пищевых продуктов"], ["gastronorm", "гастроемкость с крышкой"], ["newspaper", "газета"]], ["container", "tray", "bag", "gastronorm"], { maxScore: 6 }),
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
