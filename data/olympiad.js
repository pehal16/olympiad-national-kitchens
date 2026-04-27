const tour1Pools = require("./banks/tour1");
const tour2Blocks = require("./banks/tour2");
const tour3Matrices = require("./banks/tour3");
const tour4Tasks = require("./banks/tour4");
const tour5Cases = require("./banks/tour5");

module.exports = {
  schemaVersion: 2,
  id: "nk-2026-variant",
  slug: "national-kitchens-2026",
  title: "Национальные кухни мира",
  subtitle: "Цифровая олимпиада по технологии приготовления блюд национальных кухонь",
  description:
    "Индивидуальная цифровая олимпиада с поэтапным прохождением, автоматической проверкой и сохранением результатов.",
  durationMinutes: 45,
  timingMode: "total_and_tour_limits",
  registrationMode: "open_form",
  startAt: "2026-01-01T00:00:00+03:00",
  endAt: "2026-12-31T23:59:59+03:00",
  participantFields: [
    { id: "fullName", label: "ФИО участника", required: true },
    { id: "institution", label: "Образовательная организация", required: true },
    {
      id: "groupName",
      label: "Учебная группа, код и название специальности/профессии",
      required: true
    },
    { id: "mentorName", label: "ФИО наставника", required: false }
  ],
  methodologicalBasis: {
    sourceDiscipline: "ОП.11 / ОП.12 «Технология приготовления блюд национальных кухонь»",
    format:
      "Только индивидуальное выполнение; только закрытые задания; ручная проверка не применяется.",
    antiCheatPrinciples: [
      "Индивидуальная автоматическая сборка варианта перед стартом попытки.",
      "Перемешивание заданий внутри туров и перемешивание вариантов ответа.",
      "Один вопрос на экран и отсутствие возврата к предыдущим вопросам.",
      "Отдельный журнал выданных ID, порядка ответов и времени по вопросам.",
      "Запрет на повтор одной и той же логики блюда в турах 2–5 внутри варианта."
    ]
  },
  scoring: {
    totalMaxScore: 150,
    tieBreakOrder: ["tour5", "tour4_plus_tour3", "tour3_penalties", "total_time"]
  },
  tours: [
    {
      id: "tour-1",
      code: "T1",
      order: 1,
      title: "Один правильный ответ",
      description:
        "Базовая технологическая и культурная ориентация в национальных кухнях.",
      timeLimitMinutes: 6,
      maxScore: 20,
      generation: {
        mode: "single_choice_pools",
        selectPerPool: 1
      }
    },
    {
      id: "tour-2",
      code: "T2",
      order: 2,
      title: "Соотнесение блюда и кухни",
      description:
        "Два интерактивных блока на распознавание блюд и кулинарных традиций.",
      timeLimitMinutes: 6,
      maxScore: 20,
      generation: {
        mode: "blocks",
        selectCount: 2
      }
    },
    {
      id: "tour-3",
      code: "T3",
      order: 3,
      title: "Собери блюдо",
      description:
        "Выбор только профильных ингредиентов с автоматическим штрафом за лишние компоненты.",
      timeLimitMinutes: 8,
      maxScore: 30,
      generation: {
        mode: "ingredient_matrices",
        selectCount: 6,
        minimumCuisines: 6
      }
    },
    {
      id: "tour-4",
      code: "T4",
      order: 4,
      title: "Технологические ситуации",
      description:
        "Выбор правильных действий, причин дефектов и верных решений в рабочих ситуациях.",
      timeLimitMinutes: 10,
      maxScore: 32,
      generation: {
        mode: "logic_tasks",
        selectCount: 8
      }
    },
    {
      id: "tour-5",
      code: "T5",
      order: 5,
      title: "Практические кейсы",
      description:
        "Три практических кейса по четырём вопросам, завершающих олимпиаду.",
      timeLimitMinutes: 15,
      maxScore: 48,
      generation: {
        mode: "case_clusters",
        selectCount: 3,
        differentCuisineGroups: true
      }
    }
  ],
  questionBank: {
    tour1Pools,
    tour2Blocks,
    tour3Matrices,
    tour4Tasks,
    tour5Cases
  }
};
