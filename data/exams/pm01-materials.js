const pm01MaterialSources = [
  {
    id: "pm01-exam-docx",
    title: "ПМ01 ПК Экзамен.docx",
    kind: "local_exam_program",
    use: "25 комплексных ситуационных заданий, процедура экзамена, критерии теории и практики"
  },
  {
    id: "sbornik-1980-docx",
    title: "Сбоник рецептур.docx",
    kind: "local_recipe_collection",
    use: "найденный локальный сборник для будущей ручной сверки рецептур, норм выхода и приложений"
  },
  {
    id: "kulinaria-pdf",
    title: "Kulinaria.pdf",
    kind: "local_textbook",
    use: "найденный локальный учебник для будущей сверки технологии обработки сырья, оборудования, органолептики и хранения"
  },
  {
    id: "golunova-2003",
    title: "Сборник рецептур блюд и кулинарных изделий, Л. Е. Голунова, ПрофиКС, 2003",
    kind: "planned_recipe_reference",
    url: "https://www.calameo.com/books/0068777391e47e3047b4c",
    use: "плановая сверка номеров рецептур; не используется как расчетный ключ без ручной проверки"
  },
  {
    id: "fgos-43-01-09",
    title: "ФГОС СПО 43.01.09 Повар, кондитер, приказ Минобрнауки РФ N 1569",
    kind: "planned_normative_reference",
    url: "https://rg.ru/documents/2016/12/29/minobr-prikaz1569-site-dok.html",
    use: "плановая нормативная сверка компетенций; текущие задания берутся из локального DOCX"
  },
  {
    id: "fgos-2024-464",
    title: "Приказ Минпросвещения РФ N 464 от 03.07.2024",
    kind: "planned_normative_reference",
    url: "https://rg.ru/documents/2024/08/13/minpros-prikaz464-site-dok.html",
    use: "плановая проверка актуальной редакции; не подменяет локальные экзаменационные материалы"
  },
  {
    id: "sanpin-3590-20",
    title: "СанПиН 2.3/2.4.3590-20",
    kind: "planned_normative_reference",
    url: "https://publication.pravo.gov.ru/document/0001202011120001",
    use: "плановая санитарная сверка сцен нарушений и хранения"
  },
  {
    id: "gost-31986-2012",
    title: "ГОСТ 31986-2012. Метод органолептической оценки качества продукции общественного питания",
    kind: "planned_normative_reference",
    url: "https://normativ.kontur.ru/document?documentId=466197&moduleId=9",
    use: "плановая сверка критериев органолептической оценки"
  }
];

const pm01IntegrationPlan = {
  m0: "Производственная ситуация из билета: роль студента, предприятие, полуфабрикат и источник рецептуры.",
  m1: "Короткие интерактивные проверки: сырье, оборудование, части туши/рыбы/птицы, санитария, хранение.",
  m2: "Расчет сырья на указанное количество порций по сборнику рецептур с отдельной проверкой брутто/нетто.",
  m3: "Голосовая защита: технология, оборудование, безопасность, хранение и органолептическая оценка.",
  m4: "Практическая симуляция: последовательность операций, подбор инвентаря, формование, упаковка, поиск нарушений."
};

const pm01ComprehensiveTaskBank = [
  {
    number: 1,
    product: "Котлеты рубленые из говядины",
    family: "meat",
    portions: 5,
    recipe: { declaredNo: "466", referenceTitle: "Котлеты, биточки, шницели", status: "from_exam_docx_needs_norms" },
    focus: ["мясорубка", "котлетное мясо говядины", "котлетная масса", "панировка", "охлажденное хранение"],
    simulation: ["сборка мясорубки", "формование котлет", "оценка формы и поверхности"]
  },
  {
    number: 2,
    product: "Котлеты картофельные",
    family: "vegetables",
    portions: 4,
    recipe: { declaredNo: "239", referenceTitle: "Котлеты картофельные", status: "from_exam_docx_needs_norms" },
    focus: ["картофельная масса", "обработка клубнеплодов", "панировка", "замороженное хранение"],
    simulation: ["сортировка картофеля", "варка и протирание", "формование котлет"]
  },
  {
    number: 3,
    product: "Рыба фри",
    family: "fish",
    portions: 3,
    recipe: {
      declaredNo: "344",
      referenceTitle: "Рыба фри",
      status: "from_exam_docx_needs_norms",
      note: "В DOCX указан номер 344 для изделия «Рыба фри»; перед расчетным эталоном нужна ручная сверка с локальным сборником рецептур."
    },
    focus: ["разделка рыбы", "размораживание", "панировка", "фритюр", "вакуумированное хранение"],
    simulation: ["разделка на порционные куски", "панировка", "выбор безопасной фритюрной зоны"]
  },
  {
    number: 4,
    product: "Зразы рубленые с яйцом",
    family: "meat",
    portions: 5,
    recipe: { declaredNo: "470", referenceTitle: "Зразы рубленые", status: "from_exam_docx_needs_norms" },
    focus: ["рубленая масса", "яичный фарш", "формование зраз", "пожарная безопасность", "охлажденное хранение"],
    simulation: ["подготовка фарша", "закрытое формование", "панировка"]
  },
  {
    number: 5,
    product: "Котлеты из птицы рубленые",
    family: "poultry",
    portions: 4,
    recipe: { declaredNo: "499", referenceTitle: "Котлеты рубленые из птицы, дичи или кролика с гарниром", status: "from_exam_docx_needs_norms" },
    focus: ["котлетная масса из птицы", "части тушки", "панировка", "санитария", "замороженное хранение"],
    simulation: ["отделение мякоти", "измельчение", "формование котлет"]
  },
  {
    number: 6,
    product: "Бефстроганов из говядины",
    family: "meat",
    portions: 3,
    recipe: { declaredNo: "410", referenceTitle: "Бефстроганов", status: "from_exam_docx_needs_norms" },
    focus: ["части говяжьей туши", "нарезка брусочками", "механическая обработка", "мелкокусковые полуфабрикаты"],
    simulation: ["выбор части туши", "нарезка брусочками", "хранение охлажденным"]
  },
  {
    number: 7,
    product: "Овощи фаршированные, перец с мясом",
    family: "complex",
    portions: 4,
    recipe: {
      declaredNo: "269",
      referenceTitle: "Овощи фаршированные, перец с мясом",
      status: "from_exam_docx_needs_norms",
      note: "В DOCX указан номер 269 для перца с мясом; перед расчетным эталоном нужна ручная сверка рецептуры и нормы выхода."
    },
    focus: ["подготовка овощей", "фарширование", "мясной фарш", "замороженное хранение"],
    simulation: ["очистка перца", "подготовка фарша", "укладка полуфабриката"]
  },
  {
    number: 8,
    product: "Шашлык по-кавказски из баранины",
    family: "meat",
    portions: 3,
    recipe: { declaredNo: "412", referenceTitle: "Шашлык из баранины, говядины или свинины", status: "from_exam_docx_needs_norms" },
    focus: ["корейка и тазобедренная часть", "маринование", "нарезка кубиками", "пожарная безопасность"],
    simulation: ["выбор мяса", "маринование", "нанизывание на шпажки"]
  },
  {
    number: 9,
    product: "Филе из рыбы с кожей без костей",
    family: "fish",
    portions: 5,
    recipe: {
      declaredNo: "331",
      referenceTitle: "Филе из рыбы с кожей без костей",
      status: "from_exam_docx_needs_norms",
      note: "Билет проверяет полуфабрикат филе; расчет надо сверять по таблицам выхода и виду рыбы."
    },
    focus: ["пластование", "удаление костей", "филе с кожей", "охлажденное хранение"],
    simulation: ["разделка рыбы", "удаление реберных костей", "контроль качества филе"]
  },
  {
    number: 10,
    product: "Биточки овощные",
    family: "vegetables",
    portions: 4,
    recipe: { declaredNo: "239", referenceTitle: "Котлеты картофельные", status: "adaptation_from_exam_docx_needs_norms" },
    focus: ["овощная масса", "тепловая подготовка", "панировка", "замороженное хранение"],
    simulation: ["подбор овощей", "формование биточков", "контроль массы"]
  },
  {
    number: 11,
    product: "Шницель рубленый из свинины",
    family: "meat",
    portions: 3,
    recipe: { declaredNo: "465", referenceTitle: "Шницель натуральный рубленый", status: "from_exam_docx_needs_norms" },
    focus: ["свиное котлетное мясо", "рубленая масса", "панировка", "пожарная безопасность"],
    simulation: ["измельчение", "овально-приплюснутая форма", "панировка"]
  },
  {
    number: 12,
    product: "Рыба, фаршированная целиком",
    family: "fish",
    portions: 3,
    recipe: { declaredNo: "338", referenceTitle: "Рыба, фаршированная целиком", status: "from_exam_docx_needs_norms" },
    focus: ["выбор рыбы", "подготовка фарша", "фарширование", "замороженное хранение"],
    simulation: ["снятие кожи/подготовка тушки", "наполнение фаршем", "санитария рыбного цеха"]
  },
  {
    number: 13,
    product: "Голубцы с мясом",
    family: "complex",
    portions: 5,
    recipe: { declaredNo: "483", referenceTitle: "Голубцы с мясом", status: "from_exam_docx_needs_norms" },
    focus: ["капустные листья", "мясной фарш", "рис", "формование голубцов", "охлажденное хранение"],
    simulation: ["подготовка капусты", "фарш", "заворачивание полуфабриката"]
  },
  {
    number: 14,
    product: "Эскалоп из свинины",
    family: "meat",
    portions: 4,
    recipe: { declaredNo: "416", referenceTitle: "Эскалоп", status: "from_exam_docx_needs_norms" },
    focus: ["свиная корейка", "порционная нарезка", "отбивание", "охлажденное хранение"],
    simulation: ["выбор корейки", "нарезка 10-15 мм", "легкое отбивание"]
  },
  {
    number: 15,
    product: "Котлеты из рыбы",
    family: "fish",
    portions: 3,
    recipe: { declaredNo: "364", referenceTitle: "Котлеты или биточки рыбные", status: "from_exam_docx_needs_norms" },
    focus: ["рыбная котлетная масса", "хлеб и жидкость", "панировка", "замороженное хранение"],
    simulation: ["измельчение филе", "выбивание массы", "формование котлет"]
  },
  {
    number: 16,
    product: "Печень по-строгановски",
    family: "meat",
    portions: 5,
    recipe: { declaredNo: "422", referenceTitle: "Печень по-строгановски", status: "from_exam_docx_needs_norms" },
    focus: ["субпродукты", "зачистка печени", "нарезка брусочками", "охлажденное хранение"],
    simulation: ["снятие пленки", "нарезка печени", "санитария субпродуктов"]
  },
  {
    number: 17,
    product: "Котлеты натуральные из птицы",
    family: "poultry",
    portions: 4,
    recipe: { declaredNo: "495", referenceTitle: "Котлеты натуральные из филе птицы, дичи или кролика с гарниром", status: "from_exam_docx_needs_norms" },
    focus: ["филе птицы", "заправка в кармашек", "механическая обработка", "замороженное хранение"],
    simulation: ["подготовка филе", "зачистка косточки", "контроль формы"]
  },
  {
    number: 18,
    product: "Азу из говядины",
    family: "meat",
    portions: 3,
    recipe: { declaredNo: "448", referenceTitle: "Азу", status: "from_exam_docx_needs_norms" },
    focus: ["говядина для тушения", "нарезка брусочками", "мелкокусковой полуфабрикат", "охлажденное хранение"],
    simulation: ["выбор части туши", "нарезка азу", "контроль размера кусочков"]
  },
  {
    number: 19,
    product: "Капуста квашеная тушеная",
    family: "vegetables",
    portions: 5,
    recipe: { declaredNo: "230", referenceTitle: "Капуста тушеная", status: "from_exam_docx_needs_norms" },
    focus: ["квашеная капуста", "тушение", "полуфабрикат высокой степени готовности", "охлажденное хранение"],
    simulation: ["переборка квашеной капусты", "тушение", "оценка кислотности и консистенции"]
  },
  {
    number: 20,
    product: "Гуляш из свинины",
    family: "meat",
    portions: 4,
    recipe: { declaredNo: "443", referenceTitle: "Гуляш", status: "from_exam_docx_needs_norms" },
    focus: ["свиная лопатка и шея", "кубики 20-30 г", "мелкокусковой полуфабрикат", "замороженное хранение"],
    simulation: ["выбор части свинины", "нарезка кубиками", "контроль жира"]
  },
  {
    number: 21,
    product: "Тельное из рыбы",
    family: "fish",
    portions: 3,
    recipe: { declaredNo: "364", referenceTitle: "Котлеты или биточки рыбные", status: "adaptation_from_exam_docx_needs_norms" },
    focus: ["рыбная котлетная масса", "фарш", "форма полумесяца", "охлажденное хранение"],
    simulation: ["подготовка рыбной массы", "фарширование", "формование тельного"]
  },
  {
    number: 22,
    product: "Мозги жареные",
    family: "meat",
    portions: 5,
    recipe: { declaredNo: "430", referenceTitle: "Мозги жареные", status: "from_exam_docx_needs_norms" },
    focus: ["субпродукты", "вымачивание", "варка", "панировка в муке", "охлажденное хранение"],
    simulation: ["вымачивание", "варка мозгов", "нарезка ломтиками"]
  },
  {
    number: 23,
    product: "Ростбиф из говядины",
    family: "meat",
    portions: 3,
    recipe: { declaredNo: "403", referenceTitle: "Ростбиф из говядины", status: "from_exam_docx_needs_norms" },
    focus: ["крупнокусковой полуфабрикат", "шпигование", "надрезание", "охлажденное хранение"],
    simulation: ["выбор крупного куска", "шпигование", "контроль поверхности"]
  },
  {
    number: 24,
    product: "Кнельная масса из птицы",
    family: "poultry",
    portions: 4,
    recipe: { declaredNo: "499", referenceTitle: "Котлеты рубленые из птицы, дичи или кролика с гарниром", status: "adaptation_from_exam_docx_needs_norms" },
    focus: ["куриное филе", "мелкая решетка", "взбивание массы", "охлажденное хранение"],
    simulation: ["многократное измельчение", "введение молока/сливок", "проверка нежной консистенции"]
  },
  {
    number: 25,
    product: "Тефтели из рыбы",
    family: "fish",
    portions: 5,
    recipe: { declaredNo: "366", referenceTitle: "Тефтели рыбные", status: "from_exam_docx_needs_norms" },
    focus: ["рыбная котлетная масса", "форма шариков", "соус", "замороженное хранение"],
    simulation: ["формование шариков", "укладка на противень", "тушение в соусе"]
  }
].map((task) => ({
  ...task,
  id: `pm01-ticket-${String(task.number).padStart(2, "0")}`,
  sources: ["pm01-exam-docx", "sbornik-1980-docx", "kulinaria-pdf"],
  integration: pm01IntegrationPlan
}));

module.exports = {
  pm01MaterialSources,
  pm01IntegrationPlan,
  pm01ComprehensiveTaskBank
};
