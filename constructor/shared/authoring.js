import { question } from "./catalog.js";

export const COMMON_TYPES = [
  "single_choice",
  "multiple_choice",
  "short_text",
  "matching",
  "ordering",
  "long_text",
];
export const TYPE_HINTS = {
  single_choice: "Студент выбирает один вариант. Отметьте правильный ответ.",
  multiple_choice:
    "Студент выбирает несколько вариантов. Отметьте все правильные ответы.",
  short_text: "Студент вводит ответ. Укажите допустимые варианты написания.",
  matching: "Студент соединяет пары. Задайте соответствие каждого элемента.",
  ordering:
    "Студент восстанавливает порядок. Расставьте элементы в правильной последовательности.",
  long_text:
    "Студент пишет развёрнутый ответ. Преподаватель оценивает его по критериям.",
};
export const TYPE_EXAMPLES = {
  single_choice:
    "Пример: выбрать подходящий инструмент. Один верный вариант — полный балл.",
  multiple_choice:
    "Пример: отметить несколько признаков. Можно учитывать неполный ответ; лишний выбор снижает балл.",
  short_text:
    "Пример: назвать термин. Допустимые варианты написания задаёте вы.",
  matching:
    "Пример: связать понятия с определениями. Можно учитывать верно составленные пары.",
  ordering:
    "Пример: восстановить этапы процесса. Проверяется положение каждого элемента.",
  long_text:
    "Пример: обосновать решение ситуации. Вы оцениваете ответ по своим критериям.",
};
export function blankQuestion(type = "single_choice") {
  const q = question(type);
  q.title = "";
  q.key = {};
  if (q.config.options)
    q.config.options = q.config.options.map((o) => ({ ...o, label: "" }));
  q.internal = { authored: true };
  return q;
}

export function assistantQuestions(draft) {
  return draft.questions.map((item) => {
    const question = blankQuestion("single_choice");
    const options = item.options.map((label, index) => ({
      id: "o" + (index + 1),
      label,
    }));
    return {
      ...question,
      title: item.prompt,
      internal: { ...question.internal, label: item.title },
      config: { ...question.config, options },
      key: { optionId: options[item.correctIndex].id },
    };
  });
}
export function convertQuestion(q, type) {
  if (
    ["single_choice", "multiple_choice"].includes(q.type) &&
    ["single_choice", "multiple_choice"].includes(type)
  ) {
    const selected =
      q.type === "single_choice"
        ? q.key.optionId
          ? [q.key.optionId]
          : []
        : q.key.optionIds || [];
    return {
      ...q,
      type,
      key:
        type === "multiple_choice"
          ? { optionIds: selected }
          : { optionId: selected.length === 1 ? selected[0] : "" },
    };
  }
  const fresh = blankQuestion(type);
  const converted = {
    ...q,
    type,
    config: fresh.config,
    key: fresh.key,
    grading: fresh.grading,
    rubric: fresh.rubric,
    media: [...(q.media || [])],
    maxScore: type === "instruction" ? 0 : q.maxScore || 2,
  };
  if (q.config?.image && !converted.media.some((m) => m.url === q.config.image))
    converted.media.push({
      url: q.config.image,
      mime: "image/webp",
      alt: q.title,
    });
  if (converted.rubric?.length === 1)
    converted.rubric[0].maxScore = converted.maxScore;
  return converted;
}
