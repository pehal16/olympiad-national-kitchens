"use strict";

function addDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

const PILOT_GROUP = Object.freeze({
  code: "ПИЛОТ-1-ПК-24Б",
  name: "1-ПК-24Б – пилотная группа",
  students: Object.freeze([
    { displayName: "Студент Пилотов Алексей", login: "pilot-pk24b-001" },
    { displayName: "Студентка Пилотова Мария", login: "pilot-pk24b-002" },
    { displayName: "Студент Пилотов Илья", login: "pilot-pk24b-003" },
    { displayName: "Студентка Пилотова Анна", login: "pilot-pk24b-004" }
  ])
});

const PILOT_SUBJECTS = Object.freeze([
  { code: "МДК-03.01", name: "Организация процессов приготовления и подготовки к реализации холодных блюд" },
  { code: "МДК-03.02", name: "Процессы приготовления, оформления и подготовки к реализации холодных блюд" },
  { code: "ОП-03", name: "Техническое оснащение организаций питания" },
  { code: "ОП-08", name: "Основы калькуляции и учёта" },
  { code: "ОП-САН", name: "Санитария и гигиена питания" }
]);

function instruction(id, title, prompt) {
  return { id, type: "instruction", title, prompt, required: false, maxScore: 0 };
}

function pilotWorks(courseIds, groupId) {
  return [
    {
      courseId: courseIds[0], defaultGroupId: groupId, kind: "practice",
      title: "Практическая работа. Технологическая схема холодного блюда",
      topic: "Составление технологической схемы приготовления холодного блюда",
      instructions: "Изучите исходные данные, выстройте последовательность операций и отметьте контрольные точки. Результат должен быть понятен без дополнительных пояснений преподавателя.",
      estimatedMinutes: 90, defaultDueAt: addDays(7),
      blocks: [
        instruction("practice-intro", "Исходная ситуация", "Для блюда «Винегрет овощной» составьте последовательную технологическую схему от приёмки сырья до отпуска блюда."),
        { id: "practice-order", type: "ordering", title: "Последовательность подготовки", prompt: "Расположите операции в технологически верном порядке.", maxScore: 20,
          items: [{id:"receive",label:"Приёмка и оценка сырья"},{id:"wash",label:"Мойка овощей"},{id:"cook",label:"Тепловая обработка"},{id:"cool",label:"Охлаждение"},{id:"cut",label:"Нарезка"},{id:"mix",label:"Смешивание и заправка"},{id:"serve",label:"Порционирование и отпуск"}],
          privateKey: { order: ["receive","wash","cook","cool","cut","mix","serve"] } },
        { id: "practice-scheme", type: "scheme_builder", title: "Технологическая схема", prompt: "Соберите схему приготовления и добавьте контрольные точки.", maxScore: 45,
          nodeTypes: ["raw_material","operation","control","result"] },
        { id: "practice-safety", type: "safety_checklist", title: "Безопасность", prompt: "Отметьте выполненные требования перед началом работы.", maxScore: 10,
          items: [{id:"uniform",label:"Санитарная одежда надета",required:true},{id:"hands",label:"Руки вымыты и обработаны",required:true},{id:"boards",label:"Инвентарь промаркирован",required:true}] },
        { id: "practice-file", type: "file_evidence", title: "Файл схемы", prompt: "При необходимости приложите оформленную схему в PDF или DOCX.", required: false, maxScore: 10, minFiles: 1, maxFiles: 1, maxFileBytes: 10_000_000,
          allowedMimeTypes: ["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document"], allowedExtensions: ["pdf","docx"] },
        { id: "practice-conclusion", type: "long_text", title: "Вывод", prompt: "Кратко объясните, как в схеме исключено пересечение чистых и загрязнённых потоков.", maxScore: 15, minLength: 40, maxLength: 1200 }
      ],
      rubric: [
        { title: "Логика технологической схемы", description: "Операции связаны последовательно, входы и результат обозначены.", maxScore: 35 },
        { title: "Контрольные точки", description: "Риски и способы контроля указаны в значимых этапах.", maxScore: 20 },
        { title: "Профессиональная грамотность", description: "Термины употреблены точно, вывод конкретен.", maxScore: 15 }
      ]
    },
    {
      courseId: courseIds[1], defaultGroupId: groupId, kind: "lab",
      title: "Лабораторная работа. Оценка качества овощного полуфабриката",
      topic: "Органолептическая оценка и расчёт выхода овощного полуфабриката",
      instructions: "Зафиксируйте наблюдения, выполните расчёт и приложите фото результата. Значения записывайте по фактическим измерениям.",
      estimatedMinutes: 180, defaultDueAt: addDays(10),
      blocks: [
        instruction("lab-intro", "Порядок работы", "Взвесьте сырьё и полученный полуфабрикат, оцените внешний вид, цвет, запах и качество обработки."),
        { id: "lab-safety", type: "safety_checklist", title: "Подготовка рабочего места", prompt: "Подтвердите готовность рабочего места.", maxScore: 10,
          items: [{id:"equipment",label:"Оборудование исправно",required:true},{id:"knife",label:"Нож и доска промаркированы",required:true},{id:"surface",label:"Рабочая поверхность обработана",required:true}] },
        { id: "lab-log", type: "observation_log", title: "Журнал наблюдений", prompt: "Внесите не менее трёх записей по ходу работы.", maxScore: 25, minEntries: 3,
          columns: [{id:"stage",label:"Этап"},{id:"time",label:"Время"},{id:"observation",label:"Наблюдение"},{id:"action",label:"Действие"}] },
        { id: "lab-calc", type: "calculation", title: "Выход полуфабриката", prompt: "При массе сырья 2,50 кг и массе отходов 0,45 кг определите массу нетто.", maxScore: 20, unit: "кг",
          privateKey: { value: 2.05, unit: "кг", tolerance: { type: "absolute", value: 0.01 }, partialCredit: { valueOnlyFraction: 0.75, nearValueFraction: 0.5 } } },
        { id: "lab-table", type: "table", title: "Оценка качества", prompt: "Заполните таблицу органолептической оценки.", maxScore: 20,
          rows: [{id:"appearance",label:"Внешний вид"},{id:"color",label:"Цвет"},{id:"smell",label:"Запах"},{id:"cut",label:"Качество обработки"}], columns: [{id:"result",label:"Результат"},{id:"conclusion",label:"Соответствие"}] },
        { id: "lab-photo", type: "file_evidence", title: "Фото результата", prompt: "Приложите одну или две фотографии полуфабриката.", maxScore: 15, minFiles: 1, maxFiles: 2, maxFileBytes: 10_000_000,
          allowedMimeTypes: ["image/jpeg","image/png","image/webp"], allowedExtensions: ["jpg","jpeg","png","webp"] },
        { id: "lab-reflection", type: "reflection", title: "Вывод", prompt: "Сформулируйте вывод о качестве и возможных причинах отклонений.", maxScore: 10, minLength: 40, maxLength: 1000 }
      ],
      rubric: [
        { title: "Наблюдения и таблица", description: "Данные полные, последовательные и соответствуют выполненной работе.", maxScore: 45 },
        { title: "Фотофиксация", description: "Результат виден, изображение позволяет оценить качество.", maxScore: 15 },
        { title: "Вывод", description: "Вывод опирается на полученные данные.", maxScore: 10 }
      ]
    },
    {
      courseId: courseIds[2], defaultGroupId: groupId, kind: "test",
      title: "Промежуточный тест. Оборудование и безопасная работа",
      topic: "Механическое оборудование и безопасная эксплуатация",
      instructions: "Выполните задания последовательно. В каждом вопросе учитывайте производственную ситуацию.",
      estimatedMinutes: 35, defaultDueAt: addDays(5),
      blocks: [
        { id:"test-single",type:"single_choice",title:"Выбор оборудования",prompt:"Какое оборудование применяют для механизированной нарезки овощей?",maxScore:15,
          options:[{id:"oven",label:"Жарочный шкаф"},{id:"cutter",label:"Овощерезательная машина"},{id:"mixer",label:"Взбивальная машина"}],privateKey:{optionId:"cutter"} },
        { id:"test-multiple",type:"multiple_choice",title:"Подготовка к работе",prompt:"Выберите обязательные действия перед включением машины.",maxScore:15,
          options:[{id:"inspect",label:"Проверить исправность и комплектность"},{id:"guard",label:"Установить ограждения"},{id:"hands",label:"Проталкивать продукт рукой"},{id:"idle",label:"Проверить работу на холостом ходу"}],privateKey:{optionIds:["inspect","guard","idle"]} },
        { id:"test-match",type:"matching",title:"Оборудование и операция",prompt:"Соотнесите оборудование с основной операцией.",maxScore:20,
          leftItems:[{id:"cutter",label:"Овощерезка"},{id:"peeler",label:"Картофелеочистительная машина"},{id:"mixer",label:"Взбивальная машина"}],rightItems:[{id:"slice",label:"Нарезка"},{id:"peel",label:"Очистка"},{id:"whip",label:"Взбивание"}],privateKey:{pairs:{cutter:"slice",peeler:"peel",mixer:"whip"}} },
        { id:"test-classify",type:"classification",title:"Классификация",prompt:"Распределите оборудование по назначению.",maxScore:20,
          items:[{id:"fridge",label:"Холодильный шкаф"},{id:"stove",label:"Плита"},{id:"scale",label:"Весы"},{id:"slicer",label:"Слайсер"}],categories:[{id:"heat",label:"Тепловое"},{id:"cold",label:"Холодильное"},{id:"mechanical",label:"Механическое"},{id:"weight",label:"Весоизмерительное"}],privateKey:{assignments:{fridge:"cold",stove:"heat",scale:"weight",slicer:"mechanical"}} },
        { id:"test-order",type:"ordering",title:"Действия после аварийной остановки",prompt:"Расположите действия в верном порядке.",maxScore:15,
          items:[{id:"stop",label:"Остановить оборудование"},{id:"power",label:"Отключить питание"},{id:"warn",label:"Предупредить окружающих"},{id:"report",label:"Сообщить ответственному лицу"}],privateKey:{order:["stop","power","warn","report"]} },
        { id:"test-crossword",type:"crossword",title:"Мини-кроссворд",prompt:"Введите профессиональные термины по определениям.",maxScore:15,
          clues:[{id:"one",label:"Защитная деталь, закрывающая опасную зону машины"},{id:"two",label:"Устройство для аварийного прекращения работы"}],privateKey:{words:{one:"ограждение",two:"стоп"}} }
      ], rubric: []
    },
    {
      courseId: courseIds[3], defaultGroupId: groupId, kind: "independent",
      title: "Самостоятельная работа. Проект технологической карты",
      topic: "Формирование проекта технико-технологической карты",
      instructions: "Заполните структурированные поля проекта ТТК. Нормы и режимы должны опираться на выбранную действующую рецептуру.",
      estimatedMinutes: 90, defaultDueAt: addDays(14),
      blocks: [
        instruction("ttk-intro", "Задание", "Выберите холодное блюдо и подготовьте проект ТТК с расчётом выхода на одну порцию."),
        { id:"ttk-builder",type:"ttk_builder",title:"Проект ТТК",prompt:"Заполните основные разделы карты.",maxScore:60,
          requiredFields:["dishName","scope","ingredients","grossNet","steps","quality","storage","output"] },
        { id:"ttk-file",type:"file_evidence",title:"Оформленный документ",prompt:"Приложите итоговый документ в DOCX или PDF.",maxScore:20,minFiles:1,maxFiles:1,maxFileBytes:15_000_000,
          allowedMimeTypes:["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document"],allowedExtensions:["pdf","docx"] },
        { id:"ttk-reflection",type:"reflection",title:"Самопроверка",prompt:"Какие исходные данные вы проверили перед оформлением карты?",maxScore:20,minLength:50,maxLength:1500 }
      ],
      rubric: [
        { title:"Структура и полнота ТТК",description:"Заполнены обязательные разделы, данные согласованы между собой.",maxScore:45 },
        { title:"Технологическая обоснованность",description:"Последовательность, режимы, качество и хранение описаны корректно.",maxScore:25 },
        { title:"Оформление документа",description:"Документ читаем, единицы измерения и терминология единообразны.",maxScore:20 },
        { title:"Самопроверка",description:"Названы реально использованные источники и проверки.",maxScore:10 }
      ]
    },
    {
      courseId: courseIds[4], defaultGroupId: groupId, kind: "practice",
      title: "Практическая работа. Сборка и санитарная оценка блюда",
      topic: "Сборка холодного блюда и предупреждение перекрёстного загрязнения",
      instructions: "Соберите блюдо на интерактивной схеме, объясните выбранный порядок и выполните самопроверку.",
      estimatedMinutes: 90, defaultDueAt: addDays(8),
      blocks: [
        { id:"assembly",type:"dish_assembly",title:"Сборка блюда",prompt:"Распределите компоненты по зонам тарелки.",maxScore:40,autoGrade:true,
          components:[{id:"base",label:"Овощная основа"},{id:"protein",label:"Белковый компонент"},{id:"sauce",label:"Соус"},{id:"garnish",label:"Зелень"}],slots:[{id:"center",label:"Центр"},{id:"side",label:"Боковая зона"},{id:"top",label:"Верхний слой"}],privateKey:{placements:{base:"center",protein:"side",sauce:"top",garnish:"top"}} },
        { id:"sanitation-term",type:"short_text",title:"Ключевой риск",prompt:"Как называется перенос микроорганизмов с сырого продукта на готовый?",maxScore:20,privateKey:{acceptedAnswers:["перекрёстное загрязнение","перекрестное загрязнение"]} },
        { id:"assembly-reason",type:"long_text",title:"Обоснование",prompt:"Объясните порядок сборки и меры предупреждения загрязнения.",maxScore:25,minLength:60,maxLength:1500 },
        { id:"assembly-reflection",type:"reflection",title:"Самооценка",prompt:"Что вы проверили перед отпуском блюда?",maxScore:15,minLength:30,maxLength:800 }
      ],
      rubric: [
        { title:"Обоснование порядка сборки",description:"Порядок связан со свойствами компонентов и требованиями подачи.",maxScore:25 },
        { title:"Санитарная безопасность",description:"Названы конкретные меры предупреждения загрязнения.",maxScore:15 }
      ]
    }
  ];
}

module.exports = {
  PILOT_GROUP,
  PILOT_SUBJECTS,
  pilotWorks
};
