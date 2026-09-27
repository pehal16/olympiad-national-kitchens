const { getCurrentQuestion } = require("./variant");

function validSelectionPayload(body) {
  return Boolean(body && typeof body === "object" && !Array.isArray(body) &&
    Object.keys(body).length === 2 && Object.keys(body).every((key) => ["questionId", "dishId"].includes(key)) &&
    typeof body.questionId === "string" && typeof body.dishId === "string" && body.questionId && body.dishId);
}

// The issued variant is never edited. Selection belongs to revision-controlled
// attempt state, persisted by both file storage and D1's existing state JSON.
async function lockStationDish(attempt, body, persistence) {
  if (!validSelectionPayload(body)) return { status: 422, message: "Укажите станцию и одно блюдо." };
  for (let retry = 0; retry < 3; retry++) {
    attempt = await persistence.normalize(attempt);
    const issued = attempt.variant?.questions?.find((question) => question.id === body.questionId);
    if (issued?.type !== "final_kitchen" || !issued.dishes.some((dish) => dish.id === body.dishId)) {
      return { status: 422, message: "Блюдо не относится к этой станции." };
    }
    const locked = attempt.stationSelections?.[body.questionId];
    if (locked) return locked.dishId === body.dishId ? { status: 200, attempt } :
      { status: 409, message: "Блюдо уже выбрано. Изменить его нельзя." };
    if (attempt.status !== "in_progress" || getCurrentQuestion(attempt)?.id !== body.questionId) {
      return { status: 409, message: "Станция уже недоступна. Синхронизируйте попытку." };
    }
    const expectedRevision = Math.max(0, Number(attempt.stateRevision) || 0);
    const candidate = { ...attempt, stationSelections: { ...(attempt.stationSelections || {}),
      [body.questionId]: { dishId: body.dishId, selectedAt: new Date().toISOString() } }, stateRevision: expectedRevision + 1 };
    if (await persistence.save(candidate, expectedRevision, { stateOnly: true })) {
      persistence.onSaved?.();
      return { status: 200, attempt: candidate };
    }
    attempt = await persistence.load(attempt.id);
    if (!attempt) return { status: 404, message: "Попытка не найдена." };
  }
  return { status: 409, message: "Состояние изменилось в другом окне. Синхронизируйте попытку." };
}

function isLockedDishAnswer(attempt, question, payload) {
  return question.type !== "final_kitchen" || Boolean(attempt.stationSelections?.[question.id]?.dishId &&
    attempt.stationSelections[question.id].dishId === payload?.dishId);
}

module.exports = { lockStationDish, isLockedDishAnswer, validSelectionPayload };
