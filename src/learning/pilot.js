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

const PILOT_CONTENT_REVISION = 5;

const SPICE_VISUALS = Object.freeze({
  "black-pepper": { src: "/assets/learning/spices/black-pepper.jpg", alt: "Фотография пряности: образец 1" },
  allspice: { src: "/assets/learning/spices/allspice.jpg", alt: "Фотография пряности: образец 2" },
  bay: { src: "/assets/learning/spices/bay-leaf.jpg", alt: "Фотография пряности: образец 3" },
  cinnamon: { src: "/assets/learning/spices/cinnamon.jpg", alt: "Фотография пряности: образец 4" },
  clove: { src: "/assets/learning/spices/clove.jpg", alt: "Фотография пряности: образец 5" },
  coriander: { src: "/assets/learning/spices/coriander.jpg", alt: "Фотография пряности: образец 6" },
  turmeric: { src: "/assets/learning/spices/turmeric.jpg", alt: "Фотография пряности: образец 7" },
  basil: { src: "/assets/learning/spices/dried-basil.jpg", alt: "Фотография пряности: образец 8" },
  caraway: { src: "/assets/learning/spices/caraway.png", alt: "Фотография пряности: образец 9" },
  ginger: { src: "/assets/learning/spices/ginger.png", alt: "Фотография пряности: образец 10" },
  nutmeg: { src: "/assets/learning/spices/nutmeg.png", alt: "Фотография пряности: образец 11" },
  paprika: { src: "/assets/learning/spices/paprika.png", alt: "Фотография пряности: образец 12" },
  cardamom: { src: "/assets/learning/spices/cardamom.png", alt: "Фотография пряности: образец 13" },
  "star-anise": { src: "/assets/learning/spices/star-anise.png", alt: "Фотография пряности: образец 14" },
  "mustard-seeds": { src: "/assets/learning/spices/mustard-seeds.png", alt: "Фотография пряности: образец 15" },
  "dried-dill": { src: "/assets/learning/spices/dried-dill.png", alt: "Фотография пряности: образец 16" }
});

const SPICES = Object.freeze([
  ["black-pepper", "Перец чёрный"], ["allspice", "Перец душистый"],
  ["bay", "Лавровый лист"], ["cinnamon", "Корица"],
  ["clove", "Гвоздика"], ["coriander", "Кориандр"],
  ["turmeric", "Куркума"], ["basil", "Базилик сушёный"],
  ["caraway", "Тмин"], ["ginger", "Имбирь"],
  ["nutmeg", "Мускатный орех"], ["paprika", "Паприка"],
  ["cardamom", "Кардамон"], ["star-anise", "Бадьян"],
  ["mustard-seeds", "Семена горчицы"], ["dried-dill", "Укроп сушёный"]
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
  return SPICES.map(([id, label], index) => ({ ...SPICE_VISUALS[id], caption: `Образец ${index + 1}. ${label}` }));
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
          ],
          keyPoints: [
            { title: "1. Нетто", text: "Рассчитать массу каждого продукта на заданное количество порций." },
            { title: "2. Брутто", text: "Для овощей учесть отходы холодной обработки." },
            { title: "3. Заявка", text: "Объединить одинаковое сырьё и перевести граммы в килограммы." }
          ],
          controlPoints: [
            { title: "Единицы", text: "Промежуточные расчёты вести в граммах; заявку оформить в килограммах." },
            { title: "Проверка", text: "Брутто продукта с отходами не может быть меньше рассчитанного нетто." }
          ],
          images: [
            { src: "/assets/learning/practices/pz1/worksheet.png", alt: "Рабочий лист для расчёта заявки на сырьё", caption: "Рабочий лист и калькулятор" },
            { src: "/assets/learning/practices/pz1/weighing.png", alt: "Взвешивание картофеля и моркови на производственных весах", caption: "Проверка массы сырья" },
            { src: "/assets/learning/practices/pz1/calculation.png", alt: "Заполнение расчётной таблицы", caption: "Промежуточный расчёт" },
            { src: "/assets/learning/practices/pz1/requisition.png", alt: "Оформление итоговой заявки на сырьё", caption: "Итоговая заявка" }
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
          } },
          hints: [
            "Для каждой строки сначала найдите норму на одну порцию и количество порций.",
            "Проверьте порядок величин: 100 г × 25 порций должно дать несколько тысяч граммов, а не десятки."
          ]
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
          } },
          hints: [
            "20 % отходов означает, что нетто составляет 80 % от брутто: делите нетто на 0,80.",
            "После расчёта сравните значения: при ненулевых отходах брутто всегда больше нетто."
          ]
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
          } },
          hints: [
            "Картофель и соль встречаются в двух блюдах — сначала сложите их количества.",
            "Чтобы перевести граммы в килограммы, разделите результат на 1000 и округлите до 0,001 кг."
          ]
        }
      ],
      rubric: []
    },
    {
      courseId: mdkCourseId, defaultGroupId: groupId, kind: "practice",
      title: "Практическая работа № 2. Ассортимент и правила использования традиционных пряностей и приправ",
      topic: "Ассортимент и правила использования традиционных пряностей и приправ",
      instructions: "Распознайте шестнадцать пряностей, классифицируйте их, выберите правила применения и разберите контроль качества на производстве.",
      estimatedMinutes: 90, defaultDueAt: addDays(8),
      blocks: [
        instruction("pz2-source", "Краткая теория и образцы", [
          "Пряности — ароматические части растений: плоды и семена, кора, цветочные почки, листья, травы или корневища. Приправа — более широкое понятие: это может быть готовый продукт или смесь, которая меняет вкус блюда и иногда содержит соль, сахар, горчицу и другие компоненты.",
          "Пряность распознают по форме, цвету, поверхности и характерному аромату. Неизвестный образец не пробуют. Точное количество и момент внесения определяют по рецептуре или технологической карте.",
          "На производстве проверяют маркировку, срок годности, сухость, отсутствие плесени, вредителей и постороннего запаха. Пряности хранят в закрытой маркированной таре, в сухом тёмном месте, вдали от пара и резко пахнущих продуктов; отбирают чистой сухой ложкой."
        ], {
          keyPoints: [
            { title: "Распознавание", text: "Форма и часть растения → цвет и поверхность → аромат." },
            { title: "Применение", text: "Совместимость с продуктом → дозировка по рецептуре → момент внесения." },
            { title: "Безопасность", text: "Маркировка → состояние продукта → хранение → чистый сухой инвентарь." }
          ],
          controlPoints: [
            { title: "Приёмка", text: "Целая упаковка, читаемая маркировка, срок годности, характерные цвет и аромат." },
            { title: "Бракераж", text: "Влага, плесень, вредители, затхлый или посторонний запах — основание изолировать продукт." },
            { title: "Дозирование", text: "Только по рецептуре или ТК; не вносить «на глаз» и не сыпать из банки над паром." }
          ],
          images: sourceImages()
        }),
        {
          id: "pz2-identification", type: "matching", title: "Определение пряностей по фотографии",
          prompt: "Перетащите название к соответствующему образцу.", maxScore: 20, allowTargetReuse: false,
          leftItems: SPICES.map(([id], index) => ({ id, label: `Образец ${index + 1}`, ...SPICE_VISUALS[id] })),
          rightItems: SPICES.map(([id, label]) => ({ id: `${id}-name`, label })),
          hints: [
            "Сначала отделите целые листья, кору, цветочные почки и корневища от плодов и семян.",
            "У похожих семян сравните размер, форму, рёбра и окраску; аромат используйте как дополнительный признак."
          ],
          privateKey: { pairs: Object.fromEntries(SPICES.map(([id]) => [id, `${id}-name`])) }
        },
        {
          id: "pz2-classification", type: "classification", title: "Классификация по части растения",
          prompt: "Перетащите карточки в группу по той части растения, которую используют как пряность.", maxScore: 15,
          items: SPICES.map(([id, label]) => spice(id, label)),
          categories: [
            { id: "fruit", label: "Плоды и семена" }, { id: "bark", label: "Кора" },
            { id: "bud", label: "Цветочные почки" }, { id: "leaf", label: "Листья и травы" },
            { id: "rhizome", label: "Корневище" }
          ],
          hints: [
            "Определяйте не товарную форму «целая/молотая», а ботаническую часть растения.",
            "Корица — это кора; гвоздика — не семя, а высушенная цветочная почка."
          ],
          privateKey: { assignments: {
            "black-pepper": "fruit", allspice: "fruit", coriander: "fruit",
            caraway: "fruit", nutmeg: "fruit", paprika: "fruit", cardamom: "fruit",
            "star-anise": "fruit", "mustard-seeds": "fruit",
            cinnamon: "bark", clove: "bud", bay: "leaf", basil: "leaf",
            "dried-dill": "leaf", turmeric: "rhizome", ginger: "rhizome"
          } }
        },
        {
          id: "pz2-distinction", type: "classification", title: "Пряность или приправа",
          prompt: "Распределите примеры по учебной классификации, приведённой в начале работы.", maxScore: 10,
          items: [
            { id: "pepper-product", label: "Перец чёрный молотый" },
            { id: "cinnamon-product", label: "Корица молотая" },
            { id: "bay-product", label: "Лавровый лист" },
            { id: "ginger-product", label: "Имбирь сушёный" },
            { id: "salt-product", label: "Соль поваренная" },
            { id: "mustard-product", label: "Горчица столовая" },
            { id: "vinegar-product", label: "Уксус" },
            { id: "mix-product", label: "Готовая смесь для плова с солью" }
          ],
          categories: [
            { id: "spice", label: "Пряность — ароматическая часть растения" },
            { id: "seasoning", label: "Приправа — готовый продукт или смесь" }
          ],
          hints: ["Посмотрите на состав: один ароматический растительный компонент или готовый продукт/смесь?"],
          privateKey: { assignments: {
            "pepper-product": "spice", "cinnamon-product": "spice", "bay-product": "spice", "ginger-product": "spice",
            "salt-product": "seasoning", "mustard-product": "seasoning", "vinegar-product": "seasoning", "mix-product": "seasoning"
          } }
        },
        {
          id: "pz2-use", type: "table", title: "Выбор пряности для блюда",
          prompt: "Для каждой ситуации выберите уместную пряность, момент внесения и кратко объясните решение. Возможны разные обоснованные варианты.",
          rowHeader: "Производственная ситуация", maxScore: 20,
          rows: [
            { id: "apples", label: "Запекание яблок" },
            { id: "broth", label: "Прозрачный мясной бульон" },
            { id: "potato", label: "Отварной картофель перед отпуском" },
            { id: "pilaf", label: "Плов" },
            { id: "tomato", label: "Томатный соус" },
            { id: "pastry", label: "Пряное тесто или печенье" },
            { id: "marinade", label: "Маринад для овощей" }
          ],
          columns: [
            { id: "spice", label: "Пряность", type: "select", required: true, placeholder: "Выберите", options: SPICES.map(([id, label]) => ({ id, label })) },
            { id: "time", label: "Момент внесения", type: "select", required: true, placeholder: "Выберите", options: [
              { id: "before", label: "До тепловой обработки" },
              { id: "during", label: "В процессе приготовления" },
              { id: "near-end", label: "Ближе к окончанию" },
              { id: "service", label: "Перед отпуском" },
              { id: "recipe", label: "По этапу, указанному в рецептуре" }
            ] },
            { id: "reason", label: "Почему подходит", type: "textarea", rows: 2, required: true, placeholder: "Вкус, аромат и форма продукта" }
          ],
          hints: [
            "Сначала определите основной продукт и желаемый аромат, затем форму пряности и момент внесения.",
            "Целые пряности обычно требуют времени для извлечения аромата; тонкие травы и молотые пряности часто вносят позже. Окончательное решение сверяйте с рецептурой."
          ]
        },
        {
          id: "pz2-control", type: "classification", title: "Производственные контрольные точки",
          prompt: "Перетащите каждую ситуацию к правильному решению.", maxScore: 15,
          items: [
            { id: "label-ok", label: "Упаковка целая, маркировка читается, срок годности не истёк" },
            { id: "mold", label: "Обнаружены влага и следы плесени" },
            { id: "steam", label: "Банку держат открытой над кипящей кастрюлей" },
            { id: "dry-spoon", label: "Пряность отбирают чистой сухой ложкой" },
            { id: "unlabeled", label: "На производственной ёмкости нет названия и даты вскрытия" },
            { id: "recipe-dose", label: "Количество сверяют с рецептурой или ТК" },
            { id: "dark-storage", label: "Закрытая тара стоит в сухом шкафу вдали от пара" },
            { id: "musty", label: "У продукта затхлый посторонний запах" }
          ],
          categories: [
            { id: "accept", label: "Допустить / продолжить работу" },
            { id: "correct", label: "Исправить способ работы или маркировку" },
            { id: "isolate", label: "Не использовать, изолировать и сообщить ответственному" }
          ],
          hints: [
            "Сначала назовите риск: потеря качества, загрязнение, ошибка дозирования или отсутствие прослеживаемости.",
            "Если безопасность или качество продукта уже вызывают сомнение, простого исправления способа работы недостаточно."
          ],
          privateKey: { assignments: {
            "label-ok": "accept", "dry-spoon": "accept", "recipe-dose": "accept", "dark-storage": "accept",
            steam: "correct", unlabeled: "correct", mold: "isolate", musty: "isolate"
          } }
        },
        {
          id: "pz2-characteristics", type: "table", title: "Характеристика пряностей",
          prompt: "Заполните краткую производственную характеристику. Формулируйте признаки так, чтобы другой повар смог распознать продукт и безопасно применить его.",
          rowHeader: "Пряность", maxScore: 20,
          rows: SPICES.map(([id, label]) => ({ id, label })),
          columns: [
            { id: "appearanceAroma", label: "Как распознать", type: "textarea", rows: 2, required: true, placeholder: "Форма, цвет, поверхность, аромат" },
            { id: "use", label: "Где и как применяют", type: "textarea", rows: 2, required: true, placeholder: "Блюдо, форма, момент внесения" },
            { id: "qualityStorage", label: "Контроль качества", type: "textarea", rows: 2, required: true, placeholder: "Признак годности и условие хранения" }
          ],
          hints: [
            "Не пишите только «приятный запах»: назовите характер аромата и минимум два внешних признака.",
            "Для контроля укажите один признак доброкачественности и одно условие хранения."
          ]
        }
      ],
      rubric: [
        { title: "Выбор и применение пряностей", description: "Для семи ситуаций выбран обоснованный вариант и указан корректный момент внесения.", maxScore: 20 },
        { title: "Производственная характеристика", description: "Для шестнадцати пряностей приведены различимые признаки, применение и контроль качества.", maxScore: 20 }
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
          formulaCards: [{ label: "Коэффициент", value: "k = 20" }, { label: "Пересчёт", value: "m20 = m1 × 20" }],
          keyPoints: [
            { title: "Рецептура", text: "Сначала проверить номер, наименование блюда и выбранный вариант колонок." },
            { title: "Нормы", text: "Не смешивать брутто, нетто, массу полуфабриката и выход готового блюда." },
            { title: "Пересчёт", text: "Каждую исходную норму на одну порцию умножить на 20." }
          ],
          controlPoints: [
            { title: "Единицы", text: "Все значения этой работы рассчитываются в граммах." },
            { title: "Обратная проверка", text: "Итог на 20 порций разделить на 20 и получить исходную норму." }
          ],
          images: [
            { src: "/assets/learning/practices/pz3/recipe-map.png", alt: "Схема чтения рецептуры: брутто, нетто и выход", caption: "Что читать в рецептуре" },
            { src: "/assets/learning/practices/pz3/scaling-algorithm.png", alt: "Алгоритм пересчёта рецептуры на заданное количество порций", caption: "Алгоритм пересчёта" },
            { src: "/assets/learning/practices/pz3/recipe-423-table.png", alt: "Фрагмент рабочей таблицы рецептуры номер 423", caption: "Рецептура № 423" },
            { src: "/assets/learning/practices/pz3/recipe-423-technology.png", alt: "Опорная схема технологии приготовления тефтелей", caption: "Технологическая последовательность" }
          ]
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
          } },
          hints: [
            "Сначала заполните одну строку полностью: брутто × 20 и нетто × 20, затем переходите к следующей.",
            "Если брутто и нетто на одну порцию одинаковы, после пересчёта они также останутся одинаковыми."
          ]
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
          } },
          hints: [
            "Каждый показатель выхода пересчитывается отдельно; выход блюда не равен простой сумме всех строк таблицы.",
            "Для проверки разделите полученный выход на 20 и сравните с колонкой на одну порцию."
          ]
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
          ],
          hints: [
            "В разделе «Дано» запишите две исходные нормы говядины: 103 г брутто и 76 г нетто на одну порцию, а также N = 20.",
            "Оформите два параллельных вычисления, обязательно подпишите граммы и завершите обратной проверкой."
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
        instruction("pz4-source", "Требования к схеме", "На схеме должны быть показаны зона сырья, сортировка и мойка, очистка и нарезка, оборудование и инвентарь, ёмкость и путь удаления отходов, чистая маркированная тара. Потоки компонентов соединять не требуется.", {
          keyPoints: [
            { title: "Загрязнённая зона", text: "Приём сырья, осмотр, сортировка и первичная мойка." },
            { title: "Переходная зона", text: "Очистка, дочистка и удаление несъедобных частей." },
            { title: "Чистая зона", text: "Промывание очищенного продукта, нарезка и укладка в чистую тару." }
          ],
          controlPoints: [
            { title: "После мойки", text: "Нет земли и видимых загрязнений; вода и оборудование использованы по назначению." },
            { title: "После очистки", text: "Удалены кожура, глазки и повреждённые части; отходы направлены в отдельную ёмкость." },
            { title: "После нарезки", text: "Форма и размер соответствуют дальнейшему использованию; тара чистая и маркированная." }
          ],
          images: [
            { src: "/assets/learning/practices/pz4/workplace-flow.png", alt: "Схема потока рабочего места овощного участка", caption: "Поток обработки овощей" },
            { src: "/assets/learning/practices/pz4/three-checks.png", alt: "Три проверки схемы рабочего места", caption: "Поток, инвентарь и безопасность" },
            { src: "/assets/pm01/semi-finished/vegetables/veg-washed-root-vegetables.png", alt: "Вымытые корнеплоды", caption: "Результат мойки" },
            { src: "/assets/pm01/semi-finished/vegetables/veg-mushroom-slices-ready.png", alt: "Нарезанные грибы", caption: "Подготовленный полуфабрикат" }
          ]
        }),
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
          cleanOutput: "Нарезанные продукты → чистая маркированная тара → передача на следующий участок",
          hints: [
            "Начинайте каждый поток с осмотра или сортировки, затем выполняйте мойку до операций в чистой зоне.",
            "После очистки продукт нужно промыть, и только потом переносить к чистой нарезке.",
            "Контрольная точка должна содержать три части: что проверяем, как распознаём отклонение и что делаем при нарушении."
          ]
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
          ],
          hints: [
            "Для каждой операции называйте конкретный инвентарь, а не общее слово «оборудование».",
            "Ошибка и предупреждение должны быть связаны: например, риск смешения чистого и загрязнённого инвентаря предупреждают маркировкой и раздельным размещением."
          ]
        },
        {
          id: "practice-file", type: "file_evidence", title: "Файл оформленной схемы",
          prompt: "Приложите оформленную схему в PDF или DOCX.",
          required: true, maxScore: 10, minFiles: 1, maxFiles: 1, maxFileBytes: 10_000_000,
          allowedMimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
          allowedExtensions: ["pdf", "docx"],
          hints: ["Перед загрузкой откройте файл и проверьте, что схема читается целиком, заголовок указан, а все три потока и контрольные точки видны."]
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
        instruction("pz5-source", "Оборудование", "Изучите внешний вид машин и рабочих органов. При заполнении карт указывайте только допустимые операции и безопасные действия.", {
          keyPoints: [
            { title: "МОК-150М", text: "Периодическая очистка картофеля и корнеплодов абразивным рабочим органом." },
            { title: "МПР-350М", text: "Механическая нарезка и протирание продукта установленным сменным рабочим органом." },
            { title: "Операционная карта", text: "Назначение → подготовка → безопасная работа → остановка → санитарная обработка." }
          ],
          controlPoints: [
            { title: "До пуска", text: "Исправность, комплектность, ограждения, заземление и правильность установки рабочего органа." },
            { title: "Во время работы", text: "Штатная загрузка или подача; руки и посторонние предметы не попадают в рабочую камеру." },
            { title: "После остановки", text: "Отключение от сети до разборки, очистки, устранения застревания и санитарной обработки." }
          ],
          images: [
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
          ],
          hints: [
            "Не копируйте одну формулировку в обе колонки: у машин разные назначение, рабочие органы и способ подачи продукта.",
            "Любое застревание устраняют только после полной остановки и отключения машины от электросети.",
            "В санитарной обработке укажите последовательность безопасного отключения, разборки разрешённых деталей, очистки, мойки, сушки и обратной сборки."
          ]
        },
        {
          id: "pz5-time", type: "calculation", title: "Расчёт времени работы МОК-150М",
          prompt: "Масса картофеля Q = 30 кг, производительность машины G = 150 кг/ч. Определите время работы в минутах.",
          formula: "t = Q ÷ G; результат в часах перевести в минуты", calculatorExpression: "30/150*60",
          valueLabel: "Время работы", maxScore: 20, unit: "мин",
          privateKey: { value: 12, unit: "мин", tolerance: { type: "absolute", value: 0.01 }, partialCredit: { valueOnlyFraction: 0.75 } },
          hints: [
            "Разделив 30 кг на 150 кг/ч, вы сначала получите время в часах.",
            "Чтобы перевести часы в минуты, умножьте полученное число на 60."
          ]
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
          privateKey: { cells: { "full:value": numeric(4), "remainder:value": numeric(2), "total:value": numeric(5) } },
          hints: [
            "Сначала найдите число полных загрузок по 7 кг, затем остаток.",
            "Неполная последняя загрузка тоже считается отдельной загрузкой."
          ]
        }
      ],
      rubric: [
        { title: "Операционная карта МОК-150М", description: "Все восемь пунктов заполнены технически и безопасно.", maxScore: 30 },
        { title: "Операционная карта МПР-350М", description: "Все восемь пунктов заполнены технически и безопасно.", maxScore: 30 }
      ]
    },
    {
      courseId: mdkCourseId, defaultGroupId: groupId, kind: "practice",
      title: "Практическая работа № 6. Организация рабочего места повара при механической кулинарной обработке рыбы и нерыбного водного сырья",
      topic: "Организация рабочего места повара при механической кулинарной обработке рыбы и нерыбного водного сырья",
      instructions: "Организуйте рабочее место для обработки 15 кг охлаждённой чешуйчатой рыбы и получения порционных полуфабрикатов. Расположите оснащение по зонам, восстановите последовательность, отметьте четыре контрольные точки и оформите схему движения продукта и отходов.",
      estimatedMinutes: 90, defaultDueAt: addDays(12),
      blocks: [
        instruction("pz6-source", "Производственная ситуация", "Необходимо обработать 15 кг охлаждённой чешуйчатой рыбы и получить порционные полуфабрикаты. Сначала определите операции, затем подберите оснащение и только после этого размещайте предметы. Поток должен идти от сырья к чистому полуфабрикату без возврата упаковки, отходов и использованного инвентаря в чистую зону.", {
          keyPoints: [
            { title: "Сырьё", text: "Проверка маркировки и состояния, взвешивание, отдельное место для входной тары и упаковки." },
            { title: "Обработка", text: "Очистка, удаление плавников, потрошение и промывание с отдельным путём отходов." },
            { title: "Чистый результат", text: "Пластование, удаление костей, порционирование, контроль массы и укладка в чистую промаркированную тару." }
          ],
          controlPoints: [
            { title: "Сырьё", text: "Маркировка читается, упаковка целая, состояние продукта допускает обработку." },
            { title: "Инструмент", text: "Доска устойчива, рукоятки целые, ножи исправны, защитные устройства установлены." },
            { title: "Переход к чистой стадии", text: "Отходы удалены, руки, инвентарь и поверхность обработаны по санитарной программе." },
            { title: "Полуфабрикат", text: "Кости удалены, масса и форма порций соответствуют заданию, тара чистая и промаркирована." }
          ],
          images: [
            { src: "/assets/learning/practices/pz6/workplace-zones.png", alt: "Схема зон рабочего места для обработки рыбы", caption: "Зоны рабочего места" },
            { src: "/assets/learning/practices/pz6/fish-process.png", alt: "Общий технологический поток обработки рыбы", caption: "Технологический поток" },
            { src: "/assets/learning/practices/pz6/safe-work.png", alt: "Схема безопасной организации работы с инвентарём и оборудованием", caption: "Безопасная работа" },
            { src: "/assets/learning/practices/pz6/aquatic-groups.png", alt: "Сравнение особенностей обработки рыбы, моллюсков и ракообразных", caption: "Разные виды водного сырья" }
          ]
        }),
        {
          id: "pz6-zones", type: "classification", title: "Оснащение функциональных зон",
          prompt: "Перетащите каждый предмет или действие в ту зону, где он должен находиться в рабочем потоке.", maxScore: 15,
          items: [
            { id: "raw-container", label: "Промаркированная тара с охлаждённой рыбой" },
            { id: "intake-check", label: "Проверка маркировки, упаковки и состояния сырья" },
            { id: "raw-package", label: "Входная упаковка до её удаления с участка" },
            { id: "wash-bath", label: "Моечная ванна" },
            { id: "scraper", label: "Ручной скребок для чешуи" },
            { id: "waste-container", label: "Отдельная ёмкость для чешуи и внутренностей" },
            { id: "stable-board", label: "Устойчивая разделочная доска" },
            { id: "fish-knives", label: "Ножи и ножницы по выполняемой операции" },
            { id: "bone-tweezers", label: "Пинцет для удаления мелких костей" },
            { id: "final-scales", label: "Весы для контроля массы порций" },
            { id: "clean-container", label: "Чистая промаркированная тара для полуфабриката" },
            { id: "final-check", label: "Контроль филе, массы и маркировки" }
          ],
          categories: [
            { id: "raw", label: "Сырьевая зона", description: "Приёмка и первичная проверка" },
            { id: "preliminary", label: "Предварительная обработка", description: "Мойка, очистка и удаление отходов" },
            { id: "cutting", label: "Разделочная зона", description: "Потрошение, пластование и удаление костей" },
            { id: "clean", label: "Чистая зона", description: "Контроль, порционирование и чистая тара" }
          ],
          hints: [
            "Проследите движение продукта слева направо: сырьё → предварительная обработка → разделка → чистый полуфабрикат.",
            "Упаковка и отходы не должны находиться рядом с чистой тарой; весы для окончательной проверки ставят в конце потока.",
            "Скребок нужен до потрошения, а пинцет для костей — после пластования рыбы."
          ],
          privateKey: { assignments: {
            "raw-container": "raw", "intake-check": "raw", "raw-package": "raw",
            "wash-bath": "preliminary", scraper: "preliminary", "waste-container": "preliminary",
            "stable-board": "cutting", "fish-knives": "cutting", "bone-tweezers": "cutting",
            "final-scales": "clean", "clean-container": "clean", "final-check": "clean"
          } }
        },
        {
          id: "pz6-sanitary-order", type: "ordering", title: "Санитарная последовательность работы",
          prompt: "Перетащите действия в безопасном порядке от подготовки повара до санитарной обработки после работы.", maxScore: 20,
          items: [
            { id: "prepare-containers", label: "Подготовить отдельные ёмкости для продукта и отходов" },
            { id: "finish-sanitation", label: "Разобрать разрешённые части оборудования, вымыть и обработать их по инструкции" },
            { id: "dirty-operations", label: "Выполнить загрязнённые операции без контакта с чистой тарой" },
            { id: "check-raw", label: "Проверить маркировку сырья, упаковку и условия использования" },
            { id: "clean-stage", label: "Выполнить пластование и порционирование на чистой стадии" },
            { id: "personal-preparation", label: "Вымыть руки, надеть чистую санитарную одежду и проверить участок" },
            { id: "transition-sanitation", label: "После потрошения обработать руки, инструменты и поверхность" },
            { id: "pack-output", label: "Поместить полуфабрикат в промаркированную тару и передать дальше" }
          ],
          hints: [
            "Подготовка повара и проверка сырья выполняются до начала операций с продуктом.",
            "Между потрошением и чистой разделкой обязателен санитарный переход.",
            "Санитарная обработка оборудования после работы завершает последовательность, а не предшествует укладке полуфабриката."
          ],
          privateKey: { order: [
            "personal-preparation", "check-raw", "prepare-containers", "dirty-operations",
            "transition-sanitation", "clean-stage", "pack-output", "finish-sanitation"
          ] }
        },
        {
          id: "pz6-flow", type: "scheme_builder", title: "Поток обработки 15 кг охлаждённой рыбы",
          prompt: "Расположите операции по порядку. В четырёх отмеченных этапах запишите, что именно нужно проверить.",
          maxScore: 25, minNodes: 6, minControlPoints: 4,
          flowLanes: [{
            id: "fish", label: "Охлаждённая чешуйчатая рыба → порционные полуфабрикаты", color: "blue",
            steps: [
              { id: "portion-pack", label: "Проверить массу и уложить в чистую тару", zone: "чистая", requiresControl: true },
              { id: "scale-fin", label: "Очистить чешую и удалить плавники", zone: "предварительная", requiresControl: true },
              { id: "intake-weigh", label: "Проверить сырьё и массу", zone: "сырьевая", requiresControl: true },
              { id: "fillet-bones", label: "Пластовать и удалить кости", zone: "чистая" },
              { id: "gut-clean", label: "Удалить голову, жабры и внутренности", zone: "разделочная" },
              { id: "rinse-dry", label: "Промыть и обсушить", zone: "переходная", requiresControl: true }
            ]
          }],
          wastePath: "Чешуя, плавники, жабры и внутренности → отдельная ёмкость → удаление без пересечения с чистой тарой",
          cleanOutput: "Порционные полуфабрикаты → контроль массы и качества → чистая промаркированная тара",
          hints: [
            "Начните с проверки сырья и массы; пластование выполняют только после очистки, потрошения и промывания.",
            "Четыре контрольные точки должны охватывать сырьё, исправность инвентаря, переход к чистой стадии и готовый полуфабрикат.",
            "В контрольной точке пишите наблюдаемую проверку: что осматриваете или измеряете и какой результат считаете допустимым."
          ]
        },
        {
          id: "pz6-workplace", type: "table", title: "Рабочая таблица оснащения",
          prompt: "Для каждого этапа подберите конкретное оборудование или инвентарь, выберите место в потоке и запишите проверку.",
          rowHeader: "Этап", maxScore: 30, calculator: false,
          worksheet: {
            eyebrow: "Производственное задание", title: "15 кг охлаждённой чешуйчатой рыбы",
            facts: [
              { label: "Результат", value: "порционные полуфабрикаты" },
              { label: "Поток", value: "от сырья к чистой таре" },
              { label: "Контрольные точки", value: "не менее 4" }
            ]
          },
          rows: [
            { id: "stage-1", label: "1. Проверка сырья и массы" },
            { id: "stage-2", label: "2. Очистка чешуи и удаление плавников" },
            { id: "stage-3", label: "3. Удаление головы, жабр и внутренностей" },
            { id: "stage-4", label: "4. Промывание и обсушивание" },
            { id: "stage-5", label: "5. Пластование и удаление костей" },
            { id: "stage-6", label: "6. Порционирование, контроль и укладка" }
          ],
          columns: [
            { id: "equipment", label: "Оборудование, инвентарь и тара", type: "textarea", rows: 2, required: true, placeholder: "Назовите конкретные предметы" },
            { id: "zone", label: "Место в потоке", type: "select", required: true, placeholder: "Выберите зону", options: [
              { id: "raw", label: "Сырьевая зона" },
              { id: "preliminary", label: "Предварительная обработка" },
              { id: "cutting", label: "Разделочная зона" },
              { id: "transition", label: "Переход к чистой стадии" },
              { id: "clean", label: "Чистая зона" }
            ] },
            { id: "control", label: "Что проверить", type: "textarea", rows: 2, required: true, placeholder: "Признак, измерение или безопасное действие" }
          ],
          hints: [
            "Подбирайте оснащение по глаголу операции: взвесить — весы; удалить чешую — скребок; удалить мелкие кости — пинцет.",
            "Для отходов и готового полуфабриката нужны разные промаркированные ёмкости.",
            "Не пишите только «проверить качество»: укажите конкретный признак — целостность упаковки, исправность ножа, отсутствие костей или соответствие массы."
          ]
        },
        {
          id: "pz6-file", type: "file_evidence", title: "Схема рабочего места",
          prompt: "Приложите схему рабочего места со стрелками движения сырья, полуфабриката и отходов. Подпишите зоны, основное оснащение и чистую тару.",
          required: true, maxScore: 10, minFiles: 1, maxFiles: 1, maxFileBytes: 10_000_000,
          allowedMimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"],
          allowedExtensions: ["pdf", "docx", "jpg", "jpeg", "png"],
          hints: [
            "Можно приложить PDF, DOCX или чёткую фотографию схемы. Перед загрузкой проверьте, что все подписи читаются.",
            "Проведите отдельную стрелку для отходов: она не должна пересекать путь чистого полуфабриката."
          ]
        }
      ],
      rubric: [
        { title: "Технологический поток", description: "Шесть операций расположены последовательно, а четыре контрольные точки сформулированы конкретно.", maxScore: 25 },
        { title: "Оснащение и зонирование", description: "Для каждого этапа подобраны подходящие предметы, зона и проверка без пересечения чистого и загрязнённого потоков.", maxScore: 30 },
        { title: "Схема рабочего места", description: "На схеме читаются зоны, оснащение и отдельные направления движения продукта и отходов.", maxScore: 10 }
      ]
    }
  ];
}

module.exports = { PILOT_GROUP, PILOT_SUBJECTS, PILOT_CONTENT_REVISION, pilotWorks };
