export const TYPES = {
  instruction: "Инструкция",
  single_choice: "Один ответ",
  multiple_choice: "Несколько ответов",
  short_text: "Краткий ответ",
  calculation: "Числовой ответ",
  matching: "Соответствие",
  ordering: "Последовательность",
  classification: "Классификация",
  table: "Таблица",
  crossword: "Кроссворд",
  hotspot: "Области на изображении",
  dish_assembly: "Сборка компонентов",
  long_text: "Развёрнутый ответ",
  file_evidence: "Файл",
  scheme_builder: "Схема",
  ttk_builder: "Технологическая карта",
  observation_log: "Журнал наблюдений",
  safety_checklist: "Чек-лист",
  reflection: "Рефлексия",
  restaurant_kitchen: "Ресторан: сборка блюда",
};
export const MANUAL = [
  "long_text",
  "file_evidence",
  "scheme_builder",
  "ttk_builder",
  "observation_log",
  "reflection",
];
export const FIELD_NAMES = {
  fullName: "ФИО",
  institution: "Организация",
  groupName: "Группа",
  event: "Название олимпиады",
  place: "Место",
  degree: "Степень",
  nomination: "Номинация",
  score: "Баллы",
  maxScore: "Максимум",
  mentorName: "Наставник",
  date: "Дата",
  number: "Номер документа",
  issuer: "Организатор",
  order: "Реквизиты приказа",
};
export function uid(prefix = "q") {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)}`;
}
export function question(type = "single_choice") {
  const q = {
    id: uid("q"),
    type,
    title: TYPES[type] || "Задание",
    prompt: "",
    maxScore: type === "instruction" ? 0 : 2,
    seconds: 0,
    required: type !== "instruction",
    grading: MANUAL.includes(type) ? "manual" : "automatic",
    partialCredit: false,
    shuffle: true,
    explanation: "",
    source: "",
    theme: "",
    difficulty: "standard",
    media: [],
    config: {},
    key: {},
    rubric: [],
  };
  const choices = () =>
    [
      "Первый вариант",
      "Второй вариант",
      "Третий вариант",
      "Четвёртый вариант",
    ].map((label, i) => ({ id: `o${i + 1}`, label }));
  if (["single_choice", "multiple_choice"].includes(type)) {
    q.config.options = choices();
    q.key =
      type === "single_choice"
        ? { optionId: "o1" }
        : { optionIds: ["o1", "o2"] };
  }
  if (type === "short_text") q.key = { acceptedAnswers: ["ответ"] };
  if (type === "calculation") {
    q.config = { unit: "", formula: "" };
    q.key = { value: 10, tolerance: 0, unit: "" };
  }
  if (["matching", "classification"].includes(type)) {
    q.config = {
      items: [
        { id: "i1", label: "Элемент 1" },
        { id: "i2", label: "Элемент 2" },
      ],
      targets: [
        { id: "t1", label: "Группа 1" },
        { id: "t2", label: "Группа 2" },
      ],
    };
    q.key = { mapping: { i1: "t1", i2: "t2" } };
  }
  if (type === "ordering") {
    q.config.items = choices();
    q.key = { order: ["o1", "o2", "o3", "o4"] };
  }
  if (type === "table") {
    q.config = {
      rows: [
        { id: "r1", label: "Строка 1" },
        { id: "r2", label: "Строка 2" },
      ],
      columns: [{ id: "c1", label: "Показатель" }],
    };
    q.key = { cells: { "r1:c1": "Ответ 1", "r2:c1": "Ответ 2" } };
  }
  if (type === "crossword") {
    q.config.clues = [
      { id: "w1", label: "Подсказка 1", row: 0, col: 0, direction: "across" },
      { id: "w2", label: "Подсказка 2", row: 0, col: 0, direction: "down" },
    ];
    q.key = { words: { w1: "КОД", w2: "КЛЮЧ" } };
  }
  if (type === "hotspot") {
    q.config = {
      image: "",
      zones: [
        { id: "z1", label: "Область 1", x: 10, y: 10, width: 25, height: 25 },
      ],
    };
    q.key = { zoneIds: ["z1"] };
  }
  if (["dish_assembly", "restaurant_kitchen"].includes(type)) {
    q.config = {
      items: choices(),
      slots: [{ id: "s1", label: "Рабочая область" }],
      selectCount: 2,
    };
    q.key = { selectedIds: ["o1", "o2"] };
  }
  if (type === "safety_checklist") {
    q.config.items = [
      { id: "c1", label: "Требование 1" },
      { id: "c2", label: "Требование 2" },
    ];
    q.key = { checks: { c1: true, c2: true } };
  }
  if (type === "file_evidence")
    q.config = { extensions: ["pdf", "docx", "jpg", "png"], maxFiles: 3 };
  if (type === "scheme_builder")
    q.config = {
      nodeTypes: ["Сырьё", "Операция", "Контроль", "Результат"],
      minNodes: 3,
    };
  if (type === "ttk_builder")
    q.config = {
      fields: [
        "Название",
        "Сырьё и массы брутто/нетто",
        "Выход",
        "Технология",
        "Качество",
        "Условия хранения",
      ],
    };
  if (type === "observation_log")
    q.config = { fields: ["Время", "Наблюдение", "Результат"], minRows: 1 };
  if (q.grading === "manual")
    q.rubric = [
      {
        id: "criterion1",
        title: "Полнота и правильность выполнения",
        maxScore: q.maxScore,
      },
    ];
  return q;
}
export function round(title = "Новый тур") {
  return {
    id: uid("round"),
    title,
    instructions: "",
    seconds: 0,
    availableFrom: "",
    availableUntil: "",
    shuffle: false,
    selectCount: 0,
    allowBack: true,
    allowSkip: true,
    transition: "automatic",
    threshold: 0,
    questions: [],
  };
}
export function project(title = "Новая олимпиада", kind = "olympiad") {
  return {
    title,
    kind,
    subject: "",
    audience: "",
    description: "",
    legend: "",
    finalText: "Работа завершена. Спасибо за участие!",
    cover: "",
    narrator: {
      enabled: false,
      image: "",
      intro: "",
      neutral: "Ваш ответ принят.",
      final: "",
    },
    theme: { accent: "#005b43", background: "#f5f7f8" },
    rounds: [round(kind === "test" ? "Тестирование" : "Первый тур")],
    awardRules: [],
    status: "draft",
  };
}
export const RUN_DEFAULTS = {
  entryMode: "codes",
  availableFrom: "",
  availableUntil: "",
  seconds: 0,
  maxAttempts: 1,
  attemptSelection: "first",
  disclosure: "organizer",
  allowPause: false,
  registrationFields: ["fullName", "institution", "groupName", "mentorName"],
  status: "draft",
};
export function template(kind = "diploma", style = "classic") {
  const titles = {
    diploma: "ДИПЛОМ",
    commendation: "ГРАМОТА",
    certificate: "СЕРТИФИКАТ",
    thanks: "БЛАГОДАРНОСТЬ",
  };
  const color =
    style === "classic"
      ? "#b48831"
      : style === "modern"
        ? "#005b43"
        : "#365b95";
  const element = (type, text, x, y, width, height, size = 14) => ({
    id: uid("el"),
    type,
    text,
    x,
    y,
    width,
    height,
    font: "PT Serif",
    size,
    color: "#202b32",
    align: "center",
    locked: false,
    rotation: 0,
    opacity: 1,
    autoFit: true,
  });
  return {
    id: uid("template"),
    title: `${titles[kind]} · ${style === "classic" ? "Классический" : style === "modern" ? "Современный" : "Тематический"}`,
    kind,
    style,
    width: 297,
    height: 210,
    background: "#ffffff",
    backgroundImage: `/constructor/awards/${style}-landscape.svg`,
    backgroundVariants: {
      landscape: `/constructor/awards/${style}-landscape.svg`,
      portrait: `/constructor/awards/${style}-portrait.svg`,
    },
    accent: color,
    elements: [
      {
        ...element("text", titles[kind], 30, 30, 237, 22, 54),
        color,
        bold: true,
      },
      element(
        "field",
        kind === "diploma" ? "{degree}" : "",
        35,
        54,
        227,
        14,
        22,
      ),
      element(
        "text",
        kind === "thanks" ? "Выражаем благодарность" : "Награждается",
        35,
        76,
        227,
        12,
        16,
      ),
      { ...element("field", "{fullName}", 30, 91, 237, 22, 40), bold: true },
      element(
        "text",
        kind === "certificate"
          ? "за участие в мероприятии"
          : kind === "thanks"
            ? "за подготовку участников"
            : "за успешное выступление",
        35,
        118,
        227,
        12,
        15,
      ),
      element("field", "{event}", 28, 135, 241, 21, 22),
      element("field", "{issuer}", 30, 165, 237, 12, 12),
      element("field", "{date}", 27, 181, 98, 10, 11),
      element("field", "№ {number}", 172, 181, 98, 10, 11),
    ],
  };
}
export function starterTemplates() {
  return ["diploma", "commendation", "certificate", "thanks"].flatMap((kind) =>
    ["classic", "modern", "theme"].map((style) => template(kind, style)),
  );
}
