"use strict";

// Resolve saved choices against this attempt's immutable question, never a new variant.
function formatParticipantAnswer(question, answer) {
  if (!answer) return "Нет ответа";
  const payload = answer.answerPayload || {};
  const label = (entries, id, field = "text") => entries?.find(entry => entry.id === id)?.[field]
    || "Вариант не найден в сохранённом задании";
  const selectedItems = (items, ids) => Array.isArray(ids) && ids.length
    ? ids.map(id => label(items, id)).join(", ") : "Не выбраны";

  switch (question.type) {
    case "single_choice":
      return payload.selectedOptionId ? label(question.options, payload.selectedOptionId) : "Не выбрано";
    case "dish_detective":
      return typeof payload.text === "string" && payload.text.trim() ? payload.text : "Ответ не введён";
    case "bucket_sort":
    case "ingredient_matrix":
      return (question.items || []).map(item => {
        const selected = payload.buckets?.[item.id];
        return `${item.text}: ${selected ? label(question.buckets, selected, "label") : "Не выбрано"}`;
      }).join("\n") || "Не выбрано";
    case "sequence_drag":
      return Array.isArray(payload.sequence) && payload.sequence.length
        ? payload.sequence.map((id, index) => `${index + 1}. ${label(question.items, id)}`).join("\n")
        : "Порядок не указан";
    case "dish_assembly":
      return selectedItems(question.items, payload.selectedIngredientIds);
    case "final_kitchen": {
      const dish = question.dishes?.find(entry => entry.id === payload.dishId);
      if (!dish) return payload.dishId ? "Блюдо не найдено в сохранённом задании" : "Блюдо не выбрано";
      return `Блюдо: ${dish.title}\nПродукты: ${selectedItems(dish.items, payload.selectedIngredientIds)}`;
    }
    default:
      return "Формат ответа не поддерживается";
  }
}

function reviewParticipantAnswer(question, answer) {
  const score = Number(answer?.finalScore || 0), max = Number(question.maxScore || 0);
  const status = !answer ? "unanswered" : score >= max && max > 0 ? "correct" : score > 0 ? "partial" : "incorrect";
  const lines = [], payload = answer?.answerPayload || {};
  const add = (text, verdict = "neutral") => lines.push({ text, status: verdict });
  const verdict = value => value ? "correct" : "incorrect";
  if (!answer) return { status, lines: [{ text: "Нет ответа", status: "unanswered" }] };
  const selection = (items, selected, expected) => {
    const ids = Array.isArray(selected) ? selected : [];
    if (!ids.length) add("Продукты не выбраны", "unanswered");
    for (const id of ids) {
      const item = items?.find(entry => entry.id === id);
      add(item?.text || "Продукт не найден в сохранённом задании", item ? verdict(expected.includes(id)) : "neutral");
    }
    for (const id of expected.filter(id => !ids.includes(id))) {
      const item = items?.find(entry => entry.id === id);
      if (item) add(`Не выбран продукт: ${item.text}`, "incorrect");
    }
  };
  switch (question.type) {
    case "single_choice": {
      const choice = question.options?.find(entry => entry.id === payload.selectedOptionId);
      add(formatParticipantAnswer(question, answer), !payload.selectedOptionId ? "unanswered" : choice ? verdict(choice.isCorrect) : "neutral");
      break;
    }
    case "dish_detective":
      add(formatParticipantAnswer(question, answer), payload.text?.trim() ? verdict(score > 0) : "unanswered");
      break;
    case "bucket_sort":
    case "ingredient_matrix":
      for (const item of question.items || []) {
        const id = payload.buckets?.[item.id], bucket = question.buckets?.find(entry => entry.id === id);
        const correct = question.type === "bucket_sort" ? id === question.correctBuckets?.[item.id]
          : (id === String(question.selectedBucketId || "selected")) === (question.correctIngredientIds || []).includes(item.id);
        add(`${item.text}: ${bucket?.label || (id ? "Вариант не найден в сохранённом задании" : "Не выбрано")}`,
          !id ? "unanswered" : bucket ? verdict(correct) : "neutral");
      }
      break;
    case "sequence_drag":
      for (const [index, id] of (payload.sequence || []).entries()) {
        const item = question.items?.find(entry => entry.id === id);
        add(`${index + 1}. ${item?.text || "Вариант не найден в сохранённом задании"}`, item ? verdict(id === question.correctSequence?.[index]) : "neutral");
      }
      for (let index = (payload.sequence || []).length; index < (question.correctSequence || []).length; index++) add(`${index + 1}. Не выбрано`, "unanswered");
      break;
    case "dish_assembly":
      selection(question.items, payload.selectedIngredientIds, question.correctIngredientIds || []);
      break;
    case "final_kitchen": {
      const dish = question.dishes?.find(entry => entry.id === payload.dishId);
      if (!dish) { add(formatParticipantAnswer(question, answer), "unanswered"); break; }
      add(`Блюдо: ${dish.title}`);
      selection(dish.items, payload.selectedIngredientIds, dish.correctIngredientIds || []);
      break;
    }
    default:
      add(formatParticipantAnswer(question, answer));
  }
  if (!lines.length) add("Ответ не выбран", "unanswered");
  return { status, lines };
}

module.exports = { formatParticipantAnswer, reviewParticipantAnswer };
