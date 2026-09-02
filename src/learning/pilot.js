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

const PILOT_CONTENT_REVISION = 2;

const SPICE_VISUALS = Object.freeze({
  "black-pepper": { src: "/assets/learning/spices/black-pepper.jpg", alt: "Горошины чёрного перца" },
  allspice: { src: "/assets/learning/spices/allspice.jpg", alt: "Горошины душистого перца" },
  bay: { src: "/assets/learning/spices/bay-leaf.jpg", alt: "Сушёные лавровые листья" },
  cinnamon: { src: "/assets/learning/spices/cinnamon.jpg", alt: "Кусочки коры корицы" },
  clove: { src: "/assets/learning/spices/clove.jpg", alt: "Сушёные бутоны гвоздики" },
  coriander: { src: "/assets/learning/spices/coriander.jpg", alt: "Плоды кориандра" },
  turmeric: { src: "/assets/learning/spices/turmeric.jpg", alt: "Молотая куркума" },
  basil: { src: "/assets/learning/spices/dried-basil.jpg", alt: "Сушёные листья базилика" }
});

function instruction(id, title, prompt, extra = {}) {
  return { id, type: "instruction", title, prompt, required: false, maxScore: 0, pilotContentRevision: PILOT_CONTENT_REVISION, ...extra };
}

function numeric(value, tolerance = 0.01) {
  return { value, tolerance: { type: "absolute", value: tolerance } };
}

function requisitionRow(id, dish, ingredient, netPerPortion, portions, wastePercent) {
  const netTotal = netPerPortion * portions;
  return {
    id,
    label: ingredient,
    cells: { dish, netPerPortion, portions, wastePercent },
    calculatorExpressions: {
      net: `${netPerPortion}*${portions}`,
      gross: `${netTotal}/(1-${wastePercent}/100)`
    }
  };
}

function spice(id, label, description = "") {
  return { id, label, description, ...SPICE_VISUALS[id] };
}

function pilotWorks(courseIds, groupId) {
  const mdkCourseId = courseIds[0];
  return [
    {
      courseId: mdkCourseId, defaultGroupId: groupId, kind: "practice",
      title: "Практическая работа № 1. Составление заявки на сырьё",
      topic: "Расчёт потребности в сырье с учётом количества порций и отходов",
      instructions: "Заполните рабочий лист заявки: исходные нормы уже внесены. Рассчитайте нетто и брутто по строкам, затем объедините одинаковые продукты в сводной заявке. Массу в заявке округляйте до 0,001 кг.",
      estimatedMinutes: 90, defaultDueAt: addDays(7),
      blocks: [
        instruction("pz1-theory", "Исходные данные и пример", "Заказ производственной смены: 25 порций супа картофельного и 30 порций картофельного пюре. Масса нетто всего = норма нетто на одну порцию × количество порций. Масса брутто = масса нетто всего × 100 ÷ (100 − отходы, %). Пример: морковь – 20 г × 25 = 500 г нетто; 500 × 100 ÷ 80 = 625 г брутто. Проценты отходов в работе являются учебными исходными данными."),
        {
          id: "pz1-order", type: "ordering", title: "Алгоритм расчёта", prompt: "Расположите действия по порядку.", maxScore: 15,
          items: [
            { id: "portions", label: "Умножить норму на количество порций" },
            { id: "source", label: "Выписать нормы нетто на одну порцию" },
            { id: "units", label: "Перевести итог из граммов в килограммы" },
            { id: "waste", label: "Учесть процент отходов и определить брутто" },
            { id: "check", label: "Проверить единицы измерения и округление" },
            { id: "merge", label: "Объединить одинаковое сырьё по двум блюдам" }
          ],
          privateKey: { order: ["source", "portions", "waste", "merge", "units", "check"] }
        },
        {
          id: "pz1-lines", type: "table", title: "Бланк расчёта заявки",
          prompt: "Заполните только два последних столбца. Кнопка с калькулятором подставляет формулу для выбранной строки и переносит результат в ячейку.",
          rowHeader: "Сырьё", maxScore: 35, autoGrade: true, calculator: true,
          worksheet: {
            eyebrow: "Практическая работа № 1",
            title: "Расчёт потребности в сырье",
            facts: [
              { label: "Суп картофельный", value: "25 порций" },
              { label: "Картофельное пюре", value: "30 порций" },
              { label: "Расчётная единица", value: "граммы" },
              { label: "Точность заявки", value: "0,001 кг" }
            ]
          },
          rows: [
            requisitionRow("soup-potato", "Суп картофельный", "Картофель", 100, 25, 20),
            requisitionRow("soup-carrot", "Суп картофельный", "Морковь", 20, 25, 20),
            requisitionRow("soup-onion", "Суп картофельный", "Лук репчатый", 15, 25, 16),
            requisitionRow("soup-cabbage", "Суп картофельный", "Капуста", 50, 25, 10),
            requisitionRow("soup-oil", "Суп картофельный", "Масло растительное", 5, 25, 0),
            requisitionRow("soup-salt", "Суп картофельный", "Соль", 3, 25, 0),
            requisitionRow("puree-potato", "Картофельное пюре", "Картофель", 160, 30, 20),
            requisitionRow("puree-milk", "Картофельное пюре", "Молоко", 30, 30, 0),
            requisitionRow("puree-butter", "Картофельное пюре", "Масло сливочное", 10, 30, 0),
            requisitionRow("puree-salt", "Картофельное пюре", "Соль", 2, 30, 0)
          ],
          columns: [
            { id: "dish", label: "Блюдо", readOnly: true },
            { id: "netPerPortion", label: "Нетто на 1 порцию", hint: "г", readOnly: true },
            { id: "portions", label: "Порций", readOnly: true },
            { id: "wastePercent", label: "Отходы", hint: "%", readOnly: true },
            { id: "net", label: "Нетто всего", hint: "г", type: "number", required: true },
            { id: "gross", label: "Брутто", hint: "г", type: "number", required: true }
          ],
          privateKey: { cells: {
            "soup-potato:net": numeric(2500), "soup-potato:gross": numeric(3125),
            "soup-carrot:net": numeric(500), "soup-carrot:gross": numeric(625),
            "soup-onion:net": numeric(375), "soup-onion:gross": numeric(446.43, 0.02),
            "soup-cabbage:net": numeric(1250), "soup-cabbage:gross": numeric(1388.89, 0.02),
            "soup-oil:net": numeric(125), "soup-oil:gross": numeric(125),
            "soup-salt:net": numeric(75), "soup-salt:gross": numeric(75),
            "puree-potato:net": numeric(4800), "puree-potato:gross": numeric(6000),
            "puree-milk:net": numeric(900), "puree-milk:gross": numeric(900),
            "puree-butter:net": numeric(300), "puree-butter:gross": numeric(300),
            "puree-salt:net": numeric(60), "puree-salt:gross": numeric(60)
          } }
        },
        {
          id: "pz1-request", type: "table", title: "Заявка на сырьё",
          prompt: "Перенесите итоговую потребность: одинаковое сырьё по двум блюдам сложите, граммы переведите в килограммы.",
          rowHeader: "Наименование сырья", maxScore: 25, autoGrade: true, calculator: true,
          worksheet: {
            eyebrow: "Итоговый документ",
            title: "Заявка на отпуск сырья в производство",
            facts: [
              { label: "Основание", value: "производственная программа смены" },
              { label: "Единица измерения", value: "килограмм" }
            ]
          },
          rows: [
            { id: "potato", label: "Картофель", cells: { unit: "кг" }, calculatorExpressions: { kg: "(3125+6000)/1000" } },
            { id: "carrot", label: "Морковь", cells: { unit: "кг" }, calculatorExpressions: { kg: "625/1000" } },
            { id: "onion", label: "Лук репчатый", cells: { unit: "кг" }, calculatorExpressions: { kg: "446.43/1000" } },
            { id: "cabbage", label: "Капуста", cells: { unit: "кг" }, calculatorExpressions: { kg: "1388.89/1000" } },
            { id: "oil", label: "Масло растительное", cells: { unit: "кг" }, calculatorExpressions: { kg: "125/1000" } },
            { id: "salt", label: "Соль", cells: { unit: "кг" }, calculatorExpressions: { kg: "(75+60)/1000" } },
            { id: "milk", label: "Молоко", cells: { unit: "кг" }, calculatorExpressions: { kg: "900/1000" } },
            { id: "butter", label: "Масло сливочное", cells: { unit: "кг" }, calculatorExpressions: { kg: "300/1000" } }
          ],
          columns: [
            { id: "unit", label: "Ед. изм.", readOnly: true },
            { id: "kg", label: "Заказать", hint: "округлить до 0,001", type: "number", required: true }
          ],
          privateKey: { cells: {
            "potato:kg": numeric(9.125, 0.001), "carrot:kg": numeric(0.625, 0.001),
            "onion:kg": numeric(0.446, 0.001), "cabbage:kg": numeric(1.389, 0.001),
            "oil:kg": numeric(0.125, 0.001), "salt:kg": numeric(0.135, 0.001),
            "milk:kg": numeric(0.9, 0.001), "butter:kg": numeric(0.3, 0.001)
          } }
        },
        {
          id: "pz1-home", type: "calculation", title: "Самостоятельная проверка",
          prompt: "Для 35 порций супа требуется по 100 г картофеля нетто. Отходы – 20 %. Определите массу картофеля брутто.",
          formula: "mбрутто = mнетто × n × 100 ÷ (100 − отходы, %)", calculatorExpression: "100*35/(1-20/100)/1000", maxScore: 15, unit: "кг",
          privateKey: { value: 4.375, unit: "кг", tolerance: { type: "absolute", value: 0.001 }, partialCredit: { valueOnlyFraction: 0.75, nearValueFraction: 0.5 } }
        },
        { id: "pz1-reflection", type: "reflection", title: "Вывод", prompt: "Назовите одну проверку, которая помогает обнаружить ошибку в заявке.", maxScore: 10, minLength: 25, maxLength: 500 }
      ],
      rubric: [
        { title: "Профессиональный вывод", description: "Назван конкретный способ самопроверки расчёта или единиц измерения.", maxScore: 10 }
      ]
    },
    {
      courseId: mdkCourseId, defaultGroupId: groupId, kind: "practice",
      title: "Практическая работа № 2. Пряности и приправы",
      topic: "Ассортимент и правила использования традиционных пряностей и приправ",
      instructions: "Определяйте пряность по совокупности признаков: используемая часть растения, аромат, назначение и момент внесения.",
      estimatedMinutes: 90, defaultDueAt: addDays(8),
      blocks: [
        instruction("pz2-theory", "Как анализировать пряность", "Сначала определите используемую часть растения, затем форму выпуска и характер аромата. После этого выберите блюда и момент внесения. Пример: розмарин – листовая пряность с выраженным смолистым ароматом; её применяют дозированно, чаще при тепловой обработке мяса и овощей.", { images: [
          { src: "/assets/learning/spices/black-pepper.jpg", alt: "Горошины чёрного перца", caption: "Перец чёрный" },
          { src: "/assets/learning/spices/allspice.jpg", alt: "Горошины душистого перца", caption: "Перец душистый" },
          { src: "/assets/learning/spices/bay-leaf.jpg", alt: "Сушёные лавровые листья", caption: "Лавровый лист" },
          { src: "/assets/learning/spices/cinnamon.jpg", alt: "Кусочки коры корицы", caption: "Корица" },
          { src: "/assets/learning/spices/clove.jpg", alt: "Сушёные бутоны гвоздики", caption: "Гвоздика" },
          { src: "/assets/learning/spices/coriander.jpg", alt: "Плоды кориандра", caption: "Кориандр" },
          { src: "/assets/learning/spices/turmeric.jpg", alt: "Молотая куркума", caption: "Куркума" },
          { src: "/assets/learning/spices/dried-basil.jpg", alt: "Сушёные листья базилика", caption: "Базилик сушёный" }
        ] }),
        {
          id: "pz2-classification", type: "classification", title: "Интерактивная классификация", prompt: "Распределите карточки пряностей по используемой части растения. Карточки можно перетаскивать между зонами.", maxScore: 25,
          items: [
            spice("black-pepper", "Перец чёрный", "горошины"), spice("allspice", "Перец душистый", "горошины"),
            spice("bay", "Лавровый лист", "сушёный"), spice("cinnamon", "Корица", "палочки"),
            spice("clove", "Гвоздика", "целая"), spice("coriander", "Кориандр", "целый"),
            spice("turmeric", "Куркума", "молотая"), spice("basil", "Базилик", "сушёный")
          ],
          categories: [
            { id: "fruit", label: "Плод или семя", description: "пряные плоды и семена" },
            { id: "leaf", label: "Лист", description: "листовые пряности" },
            { id: "bark", label: "Кора", description: "высушенная кора" },
            { id: "bud", label: "Цветочная почка", description: "нераскрывшийся бутон" },
            { id: "rhizome", label: "Корневище", description: "подземная часть растения" }
          ],
          privateKey: { assignments: {
            "black-pepper": "fruit", allspice: "fruit", bay: "leaf", cinnamon: "bark",
            clove: "bud", coriander: "fruit", turmeric: "rhizome", basil: "leaf"
          } }
        },
        {
          id: "pz2-matching", type: "matching", title: "Пряность и кулинарное применение", prompt: "Перетащите фотографию с названием к наиболее подходящей производственной ситуации. Каждый вариант используется один раз.", maxScore: 25, allowTargetReuse: false,
          leftItems: [
            { id: "apples", label: "Запекание яблок" }, { id: "broth", label: "Приготовление прозрачного бульона" },
            { id: "potato", label: "Доведение до вкуса блюда из картофеля" }, { id: "pilaf", label: "Приготовление плова" },
            { id: "tomato", label: "Приготовление томатного соуса" }
          ],
          rightItems: [
            spice("cinnamon", "Корица"), spice("bay", "Лавровый лист"),
            spice("basil", "Базилик"), spice("turmeric", "Куркума"), spice("coriander", "Кориандр")
          ],
          privateKey: { pairs: { apples: "cinnamon", broth: "bay", potato: "basil", pilaf: "turmeric", tomato: "coriander" } }
        },
        {
          id: "pz2-table", type: "table", title: "Карточки пряностей",
          prompt: "По фотографиям и результатам классификации заполните краткую производственную характеристику.", rowHeader: "Пряность", maxScore: 30,
          rows: [
            { id: "black-pepper", label: "Перец чёрный" }, { id: "allspice", label: "Перец душистый" },
            { id: "bay", label: "Лавровый лист" }, { id: "cinnamon", label: "Корица" },
            { id: "clove", label: "Гвоздика" }, { id: "coriander", label: "Кориандр" },
            { id: "turmeric", label: "Куркума" }, { id: "basil", label: "Базилик сушёный" }
          ],
          columns: [
            { id: "appearance", label: "Внешний вид", required: true }, { id: "aroma", label: "Аромат", required: true },
            { id: "use", label: "Применение", required: true }, { id: "time", label: "Момент внесения", required: true }
          ]
        },
        {
          id: "pz2-storage", type: "single_choice", title: "Условия хранения", prompt: "Как лучше хранить сухие пряности на производстве?", maxScore: 10,
          options: [
            { id: "open", label: "В открытой таре рядом с плитой" },
            { id: "sealed", label: "В плотно закрытой маркированной таре, в сухом месте вдали от света и нагрева" },
            { id: "fridge", label: "Только в холодильнике в бумажном пакете" }
          ],
          privateKey: { optionId: "sealed" }
        },
        { id: "pz2-reflection", type: "reflection", title: "Вывод", prompt: "Объясните, почему одинаковое количество разных пряностей может по-разному влиять на блюдо.", maxScore: 10, minLength: 40, maxLength: 700 }
      ],
      rubric: [
        { title: "Карточки пряностей", description: "Признаки, применение и момент внесения описаны конкретно и профессионально.", maxScore: 30 },
        { title: "Вывод", description: "Ответ объясняет различия интенсивности и состава аромата.", maxScore: 10 }
      ]
    },
    {
      courseId: mdkCourseId, defaultGroupId: groupId, kind: "practice",
      title: "Практическая работа № 3. Работа со сборником рецептур",
      topic: "Порядок пользования сборником рецептур и пересчёт сырья",
      instructions: "Сначала зафиксируйте источник, номер рецептуры и вариант, затем определите коэффициент пересчёта и умножьте на него все показатели.",
      estimatedMinutes: 90, defaultDueAt: addDays(9),
      blocks: [
        instruction("pz3-example", "Разобранный пример", "Учебная карточка дана на 10 порций, требуется 25. Коэффициент пересчёта: 25 ÷ 10 = 2,5. Картофель: брутто 2,50 × 2,5 = 6,25 кг; нетто 2,00 × 2,5 = 5,00 кг. Выход блюда: 3,00 × 2,5 = 7,50 кг. Один коэффициент применяют ко всем строкам и выходу."),
        {
          id: "pz3-source-match", type: "matching", title: "Реквизиты рецептуры", prompt: "Соотнесите реквизит с тем, что он позволяет проверить.", maxScore: 20,
          leftItems: [
            { id: "title", label: "Название сборника и год издания" }, { id: "number", label: "Номер рецептуры" },
            { id: "variant", label: "Вариант или колонка" }, { id: "output", label: "Выход по исходной рецептуре" }
          ],
          rightItems: [
            { id: "edition", label: "Какой источник использован" }, { id: "find", label: "Как найти конкретное блюдо" },
            { id: "norms", label: "Какой набор норм выбран" }, { id: "basis", label: "На какое количество рассчитаны исходные данные" }
          ],
          privateKey: { pairs: { title: "edition", number: "find", variant: "norms", output: "basis" } }
        },
        {
          id: "pz3-factor", type: "calculation", title: "Коэффициент пересчёта",
          prompt: "Рецептура дана на 12 порций, требуется 30. Определите коэффициент пересчёта.",
          formula: "k = требуемое количество порций ÷ исходное количество порций", maxScore: 15, unitRequired: false,
          privateKey: { value: 2.5, tolerance: { type: "absolute", value: 0.001 } }
        },
        {
          id: "pz3-recalculation", type: "table", title: "Пересчёт учебной карточки",
          prompt: "Пересчитайте показатели с 10 на 25 порций. Исходные значения приведены в таблице.", rowHeader: "Показатель", maxScore: 45, autoGrade: true,
          rows: [
            { id: "potato-gross", label: "Картофель брутто", cells: { source: "2,50" } },
            { id: "potato-net", label: "Картофель нетто", cells: { source: "2,00" } },
            { id: "output", label: "Выход блюда", cells: { source: "3,00" } }
          ],
          columns: [
            { id: "source", label: "На 10 порций, кг", readOnly: true },
            { id: "target", label: "На 25 порций, кг", type: "number", required: true }
          ],
          privateKey: { cells: {
            "potato-gross:target": numeric(6.25, 0.001), "potato-net:target": numeric(5, 0.001), "output:target": numeric(7.5, 0.001)
          } }
        },
        { id: "pz3-check", type: "short_text", title: "Обратная проверка", prompt: "Как проверить пересчитанное значение с помощью коэффициента? Ответьте одним предложением.", maxScore: 10, minLength: 25, maxLength: 300 },
        { id: "pz3-reflection", type: "reflection", title: "Вывод", prompt: "Назовите две ошибки, которые нельзя допускать при работе со сборником рецептур.", maxScore: 10, minLength: 45, maxLength: 700 }
      ],
      rubric: [
        { title: "Обратная проверка", description: "Описано, как вернуть пересчитанное значение к исходному.", maxScore: 10 },
        { title: "Вывод", description: "Названы две конкретные ошибки при работе со сборником рецептур.", maxScore: 10 }
      ]
    },
    {
      courseId: mdkCourseId, defaultGroupId: groupId, kind: "practice",
      title: "Практическая работа № 4. Технологическая схема рабочего места",
      topic: "Организация рабочего места повара по обработке и нарезке овощей и грибов",
      instructions: "Постройте непрерывный поток от поступления сырья до чистой тары. Загрязнённое сырьё и отходы не должны возвращаться в чистую зону.",
      estimatedMinutes: 90, defaultDueAt: addDays(10),
      blocks: [
        instruction("practice-intro", "Принцип построения", "Разделите поток на загрязнённые и чистые операции. Пример для моркови: поступление сырья → сортировка → мойка → очистка → дочистка → промывание → нарезка → чистая маркированная тара. Отходы удаляют отдельным направлением."),
        {
          id: "practice-order", type: "ordering", title: "Последовательность обработки картофеля", prompt: "Расположите основные операции по порядку.", maxScore: 15,
          items: [
            { id: "trim", label: "Дочистка" }, { id: "receive", label: "Получение и осмотр сырья" },
            { id: "cut", label: "Нарезка и помещение в чистую тару" }, { id: "wash", label: "Мойка" },
            { id: "rinse", label: "Промывание" }, { id: "sort", label: "Сортировка" },
            { id: "peel", label: "Очистка" }
          ],
          privateKey: { order: ["receive", "sort", "wash", "peel", "trim", "rinse", "cut"] }
        },
        {
          id: "practice-scheme", type: "scheme_builder", title: "Технологическая схема",
          prompt: "Составьте общий поток для картофеля, моркови и грибов. Укажите зону и контроль в значимых этапах.",
          maxScore: 45, minNodes: 7, minControlPoints: 3,
          nodeTypes: [
            { id: "raw_material", label: "Сырьё" }, { id: "operation", label: "Операция" },
            { id: "control", label: "Контроль" }, { id: "result", label: "Результат" }
          ],
          fields: [
            { id: "type", label: "Тип узла", required: true }, { id: "label", label: "Название этапа", required: true },
            { id: "zone", label: "Поток или зона", required: true }, { id: "control", label: "Что проверить" }
          ],
          availableSteps: [
            { id: "receipt", label: "Поступление сырья" }, { id: "sorting", label: "Сортировка" },
            { id: "washing", label: "Мойка" }, { id: "peeling", label: "Очистка" },
            { id: "trimming", label: "Дочистка" }, { id: "rinsing", label: "Промывание" },
            { id: "cutting", label: "Нарезка" }, { id: "clean-container", label: "Чистая маркированная тара" },
            { id: "waste", label: "Удаление отходов" }
          ]
        },
        {
          id: "practice-safety", type: "safety_checklist", title: "Самопроверка рабочего места", prompt: "Подтвердите, что схема учитывает основные требования.", maxScore: 10,
          items: [
            { id: "uniform", label: "Загрязнённые и чистые операции разделены", required: true },
            { id: "hands", label: "Для сырья, полуфабриката и отходов предусмотрена отдельная маркированная тара", required: true },
            { id: "boards", label: "Инвентарь и оборудование соответствуют выполняемой операции", required: true }
          ]
        },
        {
          id: "practice-file", type: "file_evidence", title: "Файл схемы", prompt: "При необходимости приложите оформленную схему в PDF или DOCX.",
          required: false, maxScore: 10, minFiles: 1, maxFiles: 1, maxFileBytes: 10_000_000,
          allowedMimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], allowedExtensions: ["pdf", "docx"]
        },
        { id: "practice-conclusion", type: "long_text", title: "Вывод", prompt: "Кратко объясните, как организовано удаление отходов и исключён возврат загрязнённого сырья в чистую зону.", maxScore: 20, minLength: 50, maxLength: 900 }
      ],
      rubric: [
        { title: "Логика технологической схемы", description: "Поток непрерывен, узлы расположены технологически верно.", maxScore: 30 },
        { title: "Зонирование и контроль", description: "Разделены чистая и загрязнённая зоны, отмечены не менее трёх контрольных точек.", maxScore: 25 },
        { title: "Файл и обоснование", description: "При приложении файл читаем; вывод связан с построенной схемой.", maxScore: 20 }
      ]
    },
    {
      courseId: mdkCourseId, defaultGroupId: groupId, kind: "test",
      title: "Промежуточный тест № 1. Оборудование для обработки овощей и грибов",
      topic: "Правила использования оборудования для обработки и нарезки овощей и грибов",
      instructions: "Перед ответом определите назначение машины, проверьте порядок подготовки и безопасной остановки. Результат проверяется автоматически.",
      estimatedMinutes: 35, defaultDueAt: addDays(11),
      blocks: [
        instruction("pz5-theory", "Опорные сведения", "МОК-150М применяют для механической очистки картофеля и корнеплодов, МПР-350М – для протирания и резки овощей при установленном рабочем органе. Перед работой проверяют комплектность, правильность сборки, ограждения и работу на холостом ходу. Производительность используют для расчёта времени: t = Q ÷ G.", { images: [
          { src: "/assets/learning/equipment/mok-150m.png", alt: "Картофелеочистительная машина МОК-150М", caption: "МОК-150М" },
          { src: "/assets/learning/equipment/mpr-350m.png", alt: "Машина МПР-350М", caption: "МПР-350М" },
          { src: "/assets/learning/equipment/cutting-discs.png", alt: "Сменные режущие диски овощерезательной машины", caption: "Сменные рабочие органы" },
          { src: "/assets/learning/equipment/safe-equipment-sequence.png", alt: "Схема безопасной работы с механическим оборудованием", caption: "Безопасная последовательность работы" }
        ] }),
        {
          id: "test-single", type: "single_choice", title: "Выбор оборудования", prompt: "Какое оборудование применяют для механизированной нарезки овощей?", maxScore: 15,
          options: [{ id: "oven", label: "Жарочный шкаф" }, { id: "cutter", label: "Овощерезательная машина" }, { id: "mixer", label: "Взбивальная машина" }], privateKey: { optionId: "cutter" }
        },
        {
          id: "test-multiple", type: "multiple_choice", title: "Подготовка к работе", prompt: "Выберите обязательные действия перед включением машины.", maxScore: 15,
          options: [
            { id: "inspect", label: "Проверить исправность и комплектность" }, { id: "guard", label: "Установить рабочие органы и ограждения" },
            { id: "hands", label: "Проталкивать продукт рукой" }, { id: "idle", label: "Проверить работу на холостом ходу" }
          ], privateKey: { optionIds: ["inspect", "guard", "idle"] }
        },
        {
          id: "test-match", type: "matching", title: "Оборудование и операция", prompt: "Соотнесите оборудование с основной операцией.", maxScore: 20,
          leftItems: [{ id: "cutter", label: "МПР-350М с режущим диском" }, { id: "peeler", label: "МОК-150М" }, { id: "mixer", label: "Взбивальная машина" }],
          rightItems: [{ id: "slice", label: "Нарезка" }, { id: "peel", label: "Очистка" }, { id: "whip", label: "Взбивание" }],
          privateKey: { pairs: { cutter: "slice", peeler: "peel", mixer: "whip" } }
        },
        {
          id: "test-classify", type: "classification", title: "Классификация оборудования", prompt: "Распределите оборудование по назначению.", maxScore: 20,
          items: [{ id: "fridge", label: "Холодильный шкаф" }, { id: "stove", label: "Плита" }, { id: "scale", label: "Весы" }, { id: "slicer", label: "Овощерезательная машина" }],
          categories: [{ id: "heat", label: "Тепловое" }, { id: "cold", label: "Холодильное" }, { id: "mechanical", label: "Механическое" }, { id: "weight", label: "Весоизмерительное" }],
          privateKey: { assignments: { fridge: "cold", stove: "heat", scale: "weight", slicer: "mechanical" } }
        },
        {
          id: "test-order", type: "ordering", title: "Аварийная остановка", prompt: "Расположите действия в верном порядке.", maxScore: 15,
          items: [{ id: "warn", label: "Предупредить окружающих" }, { id: "power", label: "Отключить питание" }, { id: "report", label: "Сообщить ответственному лицу" }, { id: "stop", label: "Нажать кнопку остановки" }],
          privateKey: { order: ["stop", "power", "warn", "report"] }
        },
        {
          id: "test-crossword", type: "crossword", title: "Профессиональные термины", prompt: "Введите термины по определениям.", maxScore: 15,
          clues: [{ id: "one", label: "Защитная деталь, закрывающая опасную зону машины" }, { id: "two", label: "Устройство для аварийного прекращения работы" }],
          privateKey: { words: { one: "ограждение", two: "стоп" } }
        }
      ],
      rubric: []
    }
  ];
}

module.exports = { PILOT_GROUP, PILOT_SUBJECTS, PILOT_CONTENT_REVISION, pilotWorks };
