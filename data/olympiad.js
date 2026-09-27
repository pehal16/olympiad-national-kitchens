const tour1Pools = require("./banks/tour1");
const tour2Blocks = require("./banks/tour2");
const tour3Matrices = require("./banks/tour3");
const tour4Tasks = require("./banks/tour4");
const tour5Cases = require("./banks/tour5");

module.exports = {
  schemaVersion: 2,
  blueprintVersion: 9,
  id: "nk-2026-variant",
  slug: "national-kitchens-2026",
  title: "Национальные кухни мира",
  subtitle: "Индивидуальная олимпиада по технологии приготовления блюд национальных кухонь",
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
      "Индивидуальное выполнение; закрытые задания и краткий ввод названия блюда в T3; проверка автоматическая.",
    antiCheatPrinciples: [
      "Индивидуальная автоматическая сборка варианта перед стартом попытки.",
      "Фиксированные задания T1–T4; перемешивание карточек T2, вариантов ответа и кейсов T5.",
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
      title: "Узнай блюдо",
      description:
        "Узнайте 10 блюд по фотографии: один правильный ответ и 2 балла за каждый вопрос.",
      timeLimitMinutes: 6,
      maxScore: 20,
      generation: {
        mode: "fixed_photo_questions"
      }
    },
    {
      id: "tour-2",
      code: "T2",
      order: 2,
      title: "Кухни мира",
      description:
        "Сопоставьте блюда со странами",
      timeLimitMinutes: 6,
      maxScore: 20,
      generation: {
        mode: "fixed_country_matches",
        selectCount: 5
      }
    },
    {
      id: "tour-3",
      code: "T3",
      order: 3,
      title: "Кулинарный детектив",
      description:
        "Определите блюдо по трём подсказкам и введите его название: 10 заданий по 3 балла.",
      timeLimitMinutes: 8,
      maxScore: 30,
      generation: {
        mode: "fixed_detective_questions",
        selectCount: 10
      }
    },
    {
      id: "tour-4",
      code: "T4",
      order: 4,
      title: "Собери заказ гостя",
      description:
        "Выберите одно блюдо по пожеланиям гостя: 8 заказов по 4 балла.",
      timeLimitMinutes: 10,
      maxScore: 32,
      generation: {
        mode: "fixed_guest_orders",
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
