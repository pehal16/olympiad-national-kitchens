"use strict";

function addDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

const PILOT_GROUP = Object.freeze({
  code: "ПИЛОТ-1-ПК-24Б",
  name: "Учебная пилотная группа",
  students: Object.freeze([
    { displayName: "Студент Пилотов Алексей", login: "pilot-pk24b-001" },
    { displayName: "Студентка Пилотова Мария", login: "pilot-pk24b-002" },
    { displayName: "Студент Пилотов Илья", login: "pilot-pk24b-003" },
    { displayName: "Студентка Пилотова Анна", login: "pilot-pk24b-004" }
  ])
});

const PILOT_SUBJECTS = Object.freeze([
  { code: "МДК-01.01", name: "Организация приготовления, подготовки к реализации и хранения кулинарных полуфабрикатов" },
  { code: "МДК-03.01", name: "Организация процессов приготовления и подготовки к реализации холодных блюд" },
  { code: "МДК-03.02", name: "Процессы приготовления, оформления и подготовки к реализации холодных блюд" },
  { code: "ОП-03", name: "Техническое оснащение организаций питания" },
  { code: "ОП-08", name: "Основы калькуляции и учёта" }
]);

const PILOT_CONTENT_REVISION = 3;

const SPICE_VISUALS = Object.freeze({
  "black-pepper": { src: "/assets/learning/spices/black-pepper.jpg", alt: "Фотография пряности: образец 1" },
  allspice: { src: "/assets/learning/spices/allspice.jpg", alt: "Фотография пряности: образец 2" },
  bay: { src: "/assets/learning/spices/bay-leaf.jpg", alt: "Фотография пряности: образец 3" },
  cinnamon: { src: "/assets/learning/spices/cinnamon.jpg", alt: "Фотография пряности: образец 4" },
  clove: { src: "/assets/learning/spices/clove.jpg", alt: "Фотография пряности: образец 5" },
  coriander: { src: "/assets/learning/spices/coriander.jpg", alt: "Фотография пряности: образец 6" },
  turmeric: { src: "/assets/learning/spices/turmeric.jpg", alt: "Фотография пряности: образец 7" },
  basil: { src: "/assets/learning/spices/dried-basil.jpg", alt: "Фотография пряности: образец 8" }
});

const SPICES = Object.freeze([
  ["black-pepper", "Перец чёрный"], ["allspice", "Перец душистый"],
  ["bay", "Лавровый лист"], ["cinnamon", "Корица"],
  ["clove", "Гвоздика"], ["coriander", "Кориандр"],
  ["turmeric", "Куркума"], ["basil", "Базилик сушёный"]
]);

function instruction(id, title, prompt, extra = {}) {
  return { id, type: "instruction", title, prompt, required: false, maxScore: 0, pilotContentRevision: PILOT_CONTENT_REVISION, ...extra };
}

function numeric(value, tolerance = 0.01) {
  return { value, tolerance: { type: "absolute", value: tolerance } };
}

function spice(id, label, description = "") {
  return { id, label, description, ...SPICE_VISUALS[id] };
}

function sourceImages() {
  return SPICES.map(([id], index) => ({ ...SPICE_VISUALS[id], caption: `Образец ${index + 1}` }));
}

function pilotWorks(courseIds, groupId) {
  const mdkCourseId = courseIds[0];
  return [
    {
      courseId: mdkCourseId, defaultGroupId: groupId, kind: "practice",
      title: "Практическая работа № 1. Составление заявки на сырьё",
      topic: "Составление заявки на сырьё",
      instructions: "Рассчитайте потребность в сырье для 25 порций супа картофельного и 30 порций картофельного пюре. Заполните три рабочие таблицы по порядку.",
      estimatedMinutes: 90, defaultDueAt: addDays(7),
      blocks: [
        instruction("pz1-source", "Исходные данные", "Масса нетто всего = норма нетто на одну порцию × количество порций. Масса брутто = масса нетто всего ÷ (1 − отходы ÷ 100). В итоговой заявке объедините одинаковые продукты и переведите граммы в килограммы с точностью до 0,001 кг.", {
          formulaCards: [
            { label: "Нетто всего", value: "mнетто = m1 × N" },
            { label: "Брутто", value: "mбрутто = mнетто ÷ (1 − W ÷ 100)" }
          ]
        }),
        {
          id: "pz1-net", type: "table", title: "Таблица 1. Расчёт массы нетто",
          prompt: "Рассчитайте массу нетто каждого продукта для заданного количества порций.",
          rowHeader: "Сырьё", maxScore: 35, autoGrade: true, calculator: true,
          worksheet: {
            eyebrow: "Этап 1",
            title: "Масса нетто на всё количество порций",
            facts: [
              { label: "Суп картофельный", value: "25 порций" },
              { label: "Картофельное пюре", value: "30 порций" },
              { label: "Единица расчёта", value: "г" }
            ],
            formulas: [{ label: "Формула", value: "mнетто = m1 × N" }]
          },
          rows: [
            { id: "soup-potato", label: "Картофель", cells: { dish: "Суп картофельный", perPortion: 100, portions: 25 }, calculatorExpressions: { total: "100*25" } },
            { id: "soup-carrot", label: "Морковь", cells: { dish: "Суп картофельный", perPortion: 20, portions: 25 }, calculatorExpressions: { total: "20*25" } },
            { id: "soup-onion", label: "Лук репчатый", cells: { dish: "Суп картофельный", perPortion: 15, portions: 25 }, calculatorExpressions: { total: "15*25" } },
            { id: "soup-cabbage", label: "Капуста", cells: { dish: "Суп картофельный", perPortion: 50, portions: 25 }, calculatorExpressions: { total: "50*25" } },
            { id: "soup-oil", label: "Масло растительное", cells: { dish: "Суп картофельный", perPortion: 5, portions: 25 }, calculatorExpressions: { total: "5*25" } },
            { id: "soup-salt", label: "Соль", cells: { dish: "Суп картофельный", perPortion: 3, portions: 25 }, calculatorExpressions: { total: "3*25" } },
            { id: "puree-potato", label: "Картофель", cells: { dish: "Картофельное пюре", perPortion: 160, portions: 30 }, calculatorExpressions: { total: "160*30" } },
            { id: "puree-milk", label: "Молоко", cells: { dish: "Картофельное пюре", perPortion: 30, portions: 30 }, calculatorExpressions: { total: "30*30" } },
            { id: "puree-butter", label: "Масло сливочное", cells: { dish: "Картофельное пюре", perPortion: 10, portions: 30 }, calculatorExpressions: { total: "10*30" } },
            { id: "puree-salt", label: "Соль", cells: { dish: "Картофельное пюре", perPortion: 2, portions: 30 }, calculatorExpressions: { total: "2*30" } }
          ],
          columns: [
            { id: "dish", label: "Блюдо", readOnly: true },
            { id: "perPortion", label: "Нетто на 1 порцию", hint: "г", readOnly: true },
            { id: "portions", label: "Количество порций", readOnly: true },
            { id: "total", label: "Нетто всего", hint: "г", type: "number", required: true }
          ],
          privateKey: { cells: {
            "soup-potato:total": numeric(2500), "soup-carrot:total": numeric(500),
            "soup-onion:total": numeric(375), "soup-cabbage:total": numeric(1250),
            "soup-oil:total": numeric(125), "soup-salt:total": numeric(75),
            "puree-potato:total": numeric(4800), "puree-milk:total": numeric(900),
            "puree-butter:total": numeric(300), "puree-salt:total": numeric(60)
          } }
        },
        {
          id: "pz1-gross", type: "table", title: "Таблица 2. Расчёт массы брутто",
          prompt: "Для овощей рассчитайте массу брутто с учётом указанного процента отходов.",
          rowHeader: "Сырьё", maxScore: 25, autoGrade: true, calculator: true,
          worksheet: {
            eyebrow: "Этап 2", title: "Масса брутто овощей",
            formulas: [{ label: "Формула", value: "mбрутто = mнетто ÷ (1 − W ÷ 100)" }]
          },
          rows: [
            { id: "soup-potato", label: "Картофель", cells: { dish: "Суп картофельный", net: 2500, waste: 20 }, calculatorExpressions: { gross: "2500/(1-20/100)" } },
            { id: "soup-carrot", label: "Морковь", cells: { dish: "Суп картофельный", net: 500, waste: 20 }, calculatorExpressions: { gross: "500/(1-20/100)" } },
            { id: "soup-onion", label: "Лук репчатый", cells: { dish: "Суп картофельный", net: 375, waste: 16 }, calculatorExpressions: { gross: "375/(1-16/100)" } },
            { id: "soup-cabbage", label: "Капуста", cells: { dish: "Суп картофельный", net: 1250, waste: 10 }, calculatorExpressions: { gross: "1250/(1-10/100)" } },
            { id: "puree-potato", label: "Картофель", cells: { dish: "Картофельное пюре", net: 4800, waste: 20 }, calculatorExpressions: { gross: "4800/(1-20/100)" } }
          ],
          columns: [
            { id: "dish", label: "Блюдо", readOnly: true },
            { id: "net", label: "Нетто всего", hint: "г", readOnly: true },
            { id: "waste", label: "Отходы", hint: "%", readOnly: true },
            { id: "gross", label: "Брутто", hint: "г", type: "number", required: true }
          ],
          privateKey: { cells: {
            "soup-potato:gross": numeric(3125), "soup-carrot:gross": numeric(625),
            "soup-onion:gross": numeric(446.43, 0.02), "soup-cabbage:gross": numeric(1388.89, 0.02),
            "puree-potato:gross": numeric(6000)
          } }
        },
        {
          id: "pz1-request", type: "table", title: "Таблица 3. Заявка на сырьё",
          prompt: "Объедините одинаковые продукты и укажите итоговое количество в килограммах.",
          rowHeader: "Наименование сырья", maxScore: 40, autoGrade: true, calculator: true,
          worksheet: {
            eyebrow: "Этап 3", title: "Заявка на отпуск сырья в производство",
            facts: [{ label: "Единица измерения", value: "кг" }, { label: "Точность", value: "0,001 кг" }],
            formulas: [{ label: "Перевод", value: "1 кг = 1000 г" }]
          },
          rows: [
            { id: "potato", label: "Картофель", cells: { unit: "кг" }, calculatorExpressions: { amount: "(3125+6000)/1000" } },
            { id: "carrot", label: "Морковь", cells: { unit: "кг" }, calculatorExpressions: { amount: "625/1000" } },
            { id: "onion", label: "Лук репчатый", cells: { unit: "кг" }, calculatorExpressions: { amount: "446.43/1000" } },
            { id: "cabbage", label: "Капуста", cells: { unit: "кг" }, calculatorExpressions: { amount: "1388.89/1000" } },
            { id: "oil", label: "Масло растительное", cells: { unit: "кг" }, calculatorExpressions: { amount: "125/1000" } },
            { id: "salt", label: "Соль", cells: { unit: "кг" }, calculatorExpressions: { amount: "(75+60)/1000" } },
            { id: "milk", label: "Молоко", cells: { unit: "кг" }, calculatorExpressions: { amount: "900/1000" } },
            { id: "butter", label: "Масло сливочное", cells: { unit: "кг" }, calculatorExpressions: { amount: "300/1000" } }
          ],
          columns: [
            { id: "unit", label: "Ед. изм.", readOnly: true },
            { id: "amount", label: "Количество", hint: "до 0,001", type: "number", required: true }
          ],
          privateKey: { cells: {
            "potato:amount": numeric(9.125, 0.001), "carrot:amount": numeric(0.625, 0.001),
            "onion:amount": numeric(0.446, 0.001), "cabbage:amount": numeric(1.389, 0.001),
            "oil:amount": numeric(0.125, 0.001), "salt:amount": numeric(0.135, 0.001),
            "milk:amount": numeric(0.9, 0.001), "butter:amount": numeric(0.3, 0.001)
          } }
        }
      ],
      rubric: []
    },
    {
      courseId: mdkCourseId, defaultGroupId: groupId, kind: "practice",
      title: "Практическая работа № 2. Ассортимент и правила использования традиционных пряностей и приправ",
      topic: "Ассортимент и правила использования традиционных пряностей и приправ",
      instructions: "Определите восемь пряностей по фотографиям, распределите их по используемой части растения и заполните производственные характеристики.",
      estimatedMinutes: 90, defaultDueAt: addDays(8),
      blocks: [
        instruction("pz2-source", "Образцы пряностей", "Рассмотрите внешний вид каждого образца. Названия понадобятся на следующем этапе.", { images: sourceImages() }),
        {
          id: "pz2-identification", type: "matching", title: "Определение пряностей по фотографии",
          prompt: "Перетащите название к соответствующему образцу.", maxScore: 20, allowTargetReuse: false,
          leftItems: SPICES.map(([id], index) => ({ id, label: `Образец ${index + 1}`, ...SPICE_VISUALS[id] })),
          rightItems: SPICES.map(([id, label]) => ({ id: `${id}-name`, label })),
          privateKey: { pairs: Object.fromEntries(SPICES.map(([id]) => [id, `${id}-name`])) }
        },
        {
          id: "pz2-classification", type: "classification", title: "Классификация по части растения",
          prompt: "Распределите карточки пряностей по используемой части растения.", maxScore: 20,
          items: SPICES.map(([id, label]) => spice(id, label)),
          categories: [
            { id: "fruit", label: "Плоды и семена" }, { id: "bark", label: "Кора" },
            { id: "bud", label: "Цветочные почки" }, { id: "leaf", label: "Листья и травы" },
            { id: "rhizome", label: "Корневище" }
          ],
          privateKey: { assignments: {
            "black-pepper": "fruit", allspice: "fruit", coriander: "fruit",
            cinnamon: "bark", clove: "bud", bay: "leaf", basil: "leaf", turmeric: "rhizome"
          } }
        },
        {
          id: "pz2-use", type: "table", title: "Выбор пряности для блюда",
          prompt: "Для каждой ситуации укажите подходящую пряность и момент её внесения.",
          rowHeader: "Производственная ситуация", maxScore: 20,
          rows: [
            { id: "apples", label: "Запекание яблок" },
            { id: "broth", label: "Прозрачный мясной или овощной бульон" },
            { id: "potato", label: "Блюдо из картофеля" },
            { id: "pilaf", label: "Плов" },
            { id: "tomato", label: "Томатный соус" }
          ],
          columns: [
            { id: "spice", label: "Пряность", type: "text", required: true, placeholder: "Название" },
            { id: "time", label: "Момент внесения", type: "text", required: true, placeholder: "Когда добавить" }
          ]
        },
        {
          id: "pz2-characteristics", type: "table", title: "Характеристика пряностей",
          prompt: "Заполните производственную характеристику каждого образца.",
          rowHeader: "Пряность", maxScore: 40,
          rows: SPICES.map(([id, label]) => ({ id, label })),
          columns: [
            { id: "part", label: "Часть растения", type: "text", required: true },
            { id: "appearanceAroma", label: "Внешний вид и аромат", type: "textarea", rows: 2, required: true },
            { id: "use", label: "Блюда и применение", type: "textarea", rows: 2, required: true },
            { id: "time", label: "Момент внесения", type: "textarea", rows: 2, required: true },
            { id: "qualityStorage", label: "Качество и хранение", type: "textarea", rows: 2, required: true }
          ]
        }
      ],
      rubric: [
        { title: "Выбор пряности", description: "Пряность и момент внесения соответствуют производственной ситуации.", maxScore: 20 },
        { title: "Производственная характеристика", description: "Для восьми пряностей заполнены все требуемые характеристики.", maxScore: 40 }
      ]
    },
    {
      courseId: mdkCourseId, defaultGroupId: groupId, kind: "practice",
      title: "Практическая работа № 3. Порядок пользования сборником рецептур",
      topic: "Порядок пользования сборником рецептур",
      instructions: "По рецептуре № 423 «Тефтели» пересчитайте нормы сырья и выход на 20 порций, затем оформите полный расчёт строки «Говядина».",
      estimatedMinutes: 90, defaultDueAt: addDays(9),
      blocks: [
        instruction("pz3-source", "Исходная рецептура", "Л. Е. Голунова, «Сборник рецептур блюд и кулинарных изделий», 2003 год, рецептура № 423 «Тефтели», страница 261. Используйте II вариант, левую пару граф «брутто/нетто», вид мяса — говядина. Расчёт выполнить на 20 порций.", {
          formulaCards: [{ label: "Коэффициент", value: "k = 20" }, { label: "Пересчёт", value: "m20 = m1 × 20" }]
        }),
        {
          id: "pz3-recipe", type: "table", title: "Таблица 1. Пересчёт сырья на 20 порций",
          prompt: "Умножьте нормы на одну порцию на 20.", rowHeader: "Наименование сырья", maxScore: 35, autoGrade: true, calculator: true,
          worksheet: {
            eyebrow: "Рецептура № 423", title: "Тефтели — II вариант, говядина",
            facts: [{ label: "Исходная норма", value: "1 порция" }, { label: "Требуется", value: "20 порций" }, { label: "Единица", value: "г" }],
            formulas: [{ label: "Формула", value: "m20 = m1 × 20" }]
          },
          rows: [
            { id: "beef", label: "Говядина", cells: { gross1: 103, net1: 76 }, calculatorExpressions: { gross20: "103*20", net20: "76*20" } },
            { id: "water", label: "Вода", cells: { gross1: 12, net1: 12 }, calculatorExpressions: { gross20: "12*20", net20: "12*20" } },
            { id: "rice", label: "Крупа рисовая", cells: { gross1: 11, net1: 11 }, calculatorExpressions: { gross20: "11*20", net20: "11*20" } },
            { id: "onion", label: "Лук репчатый", cells: { gross1: 29, net1: 24 }, calculatorExpressions: { gross20: "29*20", net20: "24*20" } },
            { id: "saute-fat", label: "Жир для пассерования", cells: { gross1: 4, net1: 4 }, calculatorExpressions: { gross20: "4*20", net20: "4*20" } },
            { id: "flour", label: "Мука пшеничная", cells: { gross1: 8, net1: 8 }, calculatorExpressions: { gross20: "8*20", net20: "8*20" } },
            { id: "fry-fat", label: "Жир для жаренья", cells: { gross1: 7, net1: 7 }, calculatorExpressions: { gross20: "7*20", net20: "7*20" } }
          ],
          columns: [
            { id: "gross1", label: "На 1 порцию", hint: "брутто, г", readOnly: true },
            { id: "net1", label: "На 1 порцию", hint: "нетто, г", readOnly: true },
            { id: "gross20", label: "На 20 порций", hint: "брутто, г", type: "number", required: true },
            { id: "net20", label: "На 20 порций", hint: "нетто, г", type: "number", required: true }
          ],
          privateKey: { cells: {
            "beef:gross20": numeric(2060), "beef:net20": numeric(1520),
            "water:gross20": numeric(240), "water:net20": numeric(240),
            "rice:gross20": numeric(220), "rice:net20": numeric(220),
            "onion:gross20": numeric(580), "onion:net20": numeric(480),
            "saute-fat:gross20": numeric(80), "saute-fat:net20": numeric(80),
            "flour:gross20": numeric(160), "flour:net20": numeric(160),
            "fry-fat:gross20": numeric(140), "fry-fat:net20": numeric(140)
          } }
        },
        {
          id: "pz3-output", type: "table", title: "Таблица 2. Выход на 20 порций",
          prompt: "Пересчитайте каждый показатель выхода.", rowHeader: "Показатель", maxScore: 20, autoGrade: true, calculator: true,
          rows: [
            { id: "semi", label: "Масса полуфабриката", cells: { output1: 135 }, calculatorExpressions: { output20: "135*20" } },
            { id: "meatballs", label: "Тефтели готовые", cells: { output1: 115 }, calculatorExpressions: { output20: "115*20" } },
            { id: "sauce", label: "Соус", cells: { output1: 75 }, calculatorExpressions: { output20: "75*20" } },
            { id: "garnish", label: "Гарнир", cells: { output1: 125 }, calculatorExpressions: { output20: "125*20" } },
            { id: "dish", label: "Выход блюда", cells: { output1: 315 }, calculatorExpressions: { output20: "315*20" } }
          ],
          columns: [
            { id: "output1", label: "На 1 порцию", hint: "г", readOnly: true },
            { id: "output20", label: "На 20 порций", hint: "г", type: "number", required: true }
          ],
          privateKey: { cells: {
            "semi:output20": numeric(2700), "meatballs:output20": numeric(2300),
            "sauce:output20": numeric(1500), "garnish:output20": numeric(2500), "dish:output20": numeric(6300)
          } }
        },
        {
          id: "pz3-full-calculation", type: "table", title: "Полный расчёт строки «Говядина»",
          prompt: "Оформите расчёт массы брутто и нетто говядины на 20 порций.", rowHeader: "Расчёт", maxScore: 45,
          rows: [{ id: "beef", label: "Говядина" }],
          columns: [
            { id: "given", label: "Дано", type: "textarea", rows: 3, required: true, placeholder: "Нормы на 1 порцию и количество порций" },
            { id: "find", label: "Найти", type: "textarea", rows: 3, required: true },
            { id: "formula", label: "Формула и обозначения", type: "textarea", rows: 3, required: true },
            { id: "substitution", label: "Подстановка и единицы", type: "textarea", rows: 3, required: true },
            { id: "answer", label: "Ответ", type: "textarea", rows: 3, required: true },
            { id: "check", label: "Проверка делением на 20", type: "textarea", rows: 3, required: true }
          ]
        }
      ],
      rubric: [
        { title: "Полнота расчёта", description: "Есть дано, найти, формула, обозначения, подстановка, единицы и ответ.", maxScore: 30 },
        { title: "Проверка", description: "Брутто и нетто проверены обратным делением на 20.", maxScore: 15 }
      ]
    },
    {
      courseId: mdkCourseId, defaultGroupId: groupId, kind: "practice",
      title: "Практическая работа № 4. Организация рабочего места повара по обработке, нарезке овощей и грибов",
      topic: "Организация рабочего места повара по обработке, нарезке овощей и грибов",
      instructions: "Расположите операции в трёх технологических потоках, отметьте контроль после мойки, очистки и нарезки, затем заполните таблицу оснащения и предупреждения ошибок.",
      estimatedMinutes: 90, defaultDueAt: addDays(10),
      blocks: [
        instruction("pz4-source", "Требования к схеме", "На схеме должны быть показаны зона сырья, сортировка и мойка, очистка и нарезка, оборудование и инвентарь, ёмкость и путь удаления отходов, чистая маркированная тара. Потоки компонентов соединять не требуется."),
        {
          id: "pz4-flow", type: "scheme_builder", title: "Схема технологических потоков",
          prompt: "Перетаскивайте этапы внутри каждого потока. В трёх отмеченных местах заполните контрольную точку.",
          maxScore: 55, minNodes: 15, minControlPoints: 3,
          flowLanes: [
            {
              id: "potato", label: "Картофель", color: "blue",
              steps: [
                { id: "potato-wash", label: "Мойка", zone: "загрязнённая", requiresControl: true },
                { id: "potato-sort", label: "Сортировка", zone: "загрязнённая" },
                { id: "potato-trim", label: "Дочистка", zone: "переходная" },
                { id: "potato-cut", label: "Нарезка", zone: "чистая", requiresControl: true },
                { id: "potato-peel", label: "Очистка", zone: "переходная", requiresControl: true },
                { id: "potato-rinse", label: "Промывание", zone: "чистая" }
              ]
            },
            {
              id: "carrot", label: "Морковь", color: "orange",
              steps: [
                { id: "carrot-cut", label: "Нарезка", zone: "чистая" },
                { id: "carrot-sort", label: "Сортировка", zone: "загрязнённая" },
                { id: "carrot-peel", label: "Очистка", zone: "переходная" },
                { id: "carrot-wash", label: "Мойка", zone: "загрязнённая" },
                { id: "carrot-rinse", label: "Промывание", zone: "чистая" }
              ]
            },
            {
              id: "mushrooms", label: "Грибы", color: "green",
              steps: [
                { id: "mushrooms-cut", label: "Нарезка", zone: "чистая" },
                { id: "mushrooms-inspect", label: "Осмотр", zone: "загрязнённая" },
                { id: "mushrooms-water", label: "Обработка водой по технологии", zone: "переходная" },
                { id: "mushrooms-base", label: "Удаление загрязнённого основания", zone: "загрязнённая" }
              ]
            }
          ],
          wastePath: "Отходы → маркированная ёмкость → удаление из зоны обработки",
          cleanOutput: "Нарезанные продукты → чистая маркированная тара → передача на следующий участок"
        },
        {
          id: "pz4-workplace", type: "table", title: "Оснащение рабочего места и предупреждение ошибок",
          prompt: "Для каждой операции укажите оборудование или инвентарь, возможную ошибку и способ её предупреждения.",
          rowHeader: "Операция", maxScore: 35,
          rows: [
            { id: "sort", label: "Сортировка" }, { id: "wash", label: "Мойка" },
            { id: "peel", label: "Очистка" }, { id: "trim", label: "Дочистка" },
            { id: "cut", label: "Нарезка" }, { id: "pack", label: "Укладка и маркировка" }
          ],
          columns: [
            { id: "equipment", label: "Оборудование и инвентарь", type: "textarea", rows: 2, required: true },
            { id: "error", label: "Возможная ошибка", type: "textarea", rows: 2, required: true },
            { id: "prevention", label: "Способ предупреждения", type: "textarea", rows: 2, required: true }
          ]
        },
        {
          id: "practice-file", type: "file_evidence", title: "Файл оформленной схемы",
          prompt: "Приложите оформленную схему в PDF или DOCX.",
          required: true, maxScore: 10, minFiles: 1, maxFiles: 1, maxFileBytes: 10_000_000,
          allowedMimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
          allowedExtensions: ["pdf", "docx"]
        }
      ],
      rubric: [
        { title: "Технологические потоки", description: "Этапы картофеля, моркови и грибов расположены в правильной последовательности.", maxScore: 30 },
        { title: "Зонирование и контроль", description: "Показаны зоны, путь отходов, чистая тара и не менее трёх контрольных точек.", maxScore: 25 },
        { title: "Оснащение рабочего места", description: "Для шести операций заполнены инвентарь, возможные ошибки и предупреждение.", maxScore: 35 },
        { title: "Оформление схемы", description: "Приложенный файл читаем и соответствует схеме в рабочем поле.", maxScore: 10 }
      ]
    },
    {
      courseId: mdkCourseId, defaultGroupId: groupId, kind: "practice",
      title: "Практическая работа № 5. Правила использования оборудования для обработки, нарезки овощей и грибов",
      topic: "Правила использования оборудования для обработки, нарезки овощей и грибов",
      instructions: "Составьте две операционные карты — для МОК-150М и МПР-350М — и выполните расчёт времени работы и количества загрузок МОК-150М.",
      estimatedMinutes: 90, defaultDueAt: addDays(11),
      blocks: [
        instruction("pz5-source", "Оборудование", "Изучите внешний вид машин и рабочих органов. При заполнении карт указывайте только допустимые операции и безопасные действия.", { images: [
          { src: "/assets/learning/equipment/mok-150m.png", alt: "Картофелеочистительная машина МОК-150М", caption: "МОК-150М" },
          { src: "/assets/learning/equipment/mpr-350m.png", alt: "Машина для переработки овощей МПР-350М", caption: "МПР-350М" },
          { src: "/assets/learning/equipment/cutting-discs.png", alt: "Сменные режущие диски", caption: "Рабочие органы МПР-350М" },
          { src: "/assets/learning/equipment/safe-equipment-sequence.png", alt: "Безопасная последовательность работы", caption: "Подготовка, работа, остановка и санитарная обработка" }
        ] }),
        {
          id: "pz5-cards", type: "table", title: "Операционные карты оборудования",
          prompt: "Заполните каждый пункт отдельно для двух машин.", rowHeader: "Пункт карты", maxScore: 60,
          rows: [
            { id: "purpose", label: "Назначение и допустимый продукт" },
            { id: "units", label: "Основные узлы" },
            { id: "working-part", label: "Рабочий орган" },
            { id: "precheck", label: "Проверка перед пуском" },
            { id: "loading", label: "Штатная загрузка или подача продукта" },
            { id: "abnormal", label: "Признаки ненормальной работы" },
            { id: "stop", label: "Остановка и отключение" },
            { id: "sanitation", label: "Разрешённая санитарная обработка" }
          ],
          columns: [
            { id: "mok", label: "МОК-150М", type: "textarea", rows: 2, required: true },
            { id: "mpr", label: "МПР-350М", type: "textarea", rows: 2, required: true }
          ]
        },
        {
          id: "pz5-time", type: "calculation", title: "Расчёт времени работы МОК-150М",
          prompt: "Масса картофеля Q = 30 кг, производительность машины G = 150 кг/ч. Определите время работы в минутах.",
          formula: "t = Q ÷ G; результат в часах перевести в минуты", calculatorExpression: "30/150*60",
          valueLabel: "Время работы", maxScore: 20, unit: "мин",
          privateKey: { value: 12, unit: "мин", tolerance: { type: "absolute", value: 0.01 }, partialCredit: { valueOnlyFraction: 0.75 } }
        },
        {
          id: "pz5-batches", type: "table", title: "Расчёт количества загрузок МОК-150М",
          prompt: "Максимальная разовая загрузка — 7 кг. Распределите 30 кг картофеля по загрузкам.",
          rowHeader: "Показатель", maxScore: 20, autoGrade: true, calculator: false,
          worksheet: {
            eyebrow: "Исходные данные", title: "Q = 30 кг; разовая загрузка ≤ 7 кг",
            formulas: [{ label: "Проверка", value: "4 × 7 кг + 2 кг = 30 кг" }]
          },
          rows: [
            { id: "full", label: "Полные загрузки по 7 кг" },
            { id: "remainder", label: "Масса последней загрузки" },
            { id: "total", label: "Всего загрузок" }
          ],
          columns: [{ id: "value", label: "Результат", type: "number", required: true }],
          privateKey: { cells: { "full:value": numeric(4), "remainder:value": numeric(2), "total:value": numeric(5) } }
        }
      ],
      rubric: [
        { title: "Операционная карта МОК-150М", description: "Все восемь пунктов заполнены технически и безопасно.", maxScore: 30 },
        { title: "Операционная карта МПР-350М", description: "Все восемь пунктов заполнены технически и безопасно.", maxScore: 30 }
      ]
    }
  ];
}

module.exports = { PILOT_GROUP, PILOT_SUBJECTS, PILOT_CONTENT_REVISION, pilotWorks };
