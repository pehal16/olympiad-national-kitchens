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

module.exports = { formatParticipantAnswer };
