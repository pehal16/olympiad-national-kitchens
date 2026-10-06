"use strict";

const { sanitizePhotoDish } = require("./t5-photo-contract");
const photo = require("../public/t5-photo-model");
const { servingFor } = require("./dish-service-assets");

// Feedback belongs to a saved immutable answer, never a draft or a future dish.
function buildDishService(attempt, requestedQuestion = null) {
  const question = requestedQuestion || [...(attempt.variant?.questions || [])].reverse().find(q =>
    q.type === "final_kitchen" && q.presentationVersion === 4 &&
    q.guestServiceEnabled === true && attempt.answers?.[q.id]);
  if (!question) return null;
  const saved = attempt.answers[question.id];
  const dish = question.dishes[0];
  const payload = saved.answerPayload;
  if (payload?.dishId !== dish.id) return null;
  try {
    const selected = photo.selection(dish, payload.selectedIngredientIds || []);
    if (selected.length !== 4) return null;
    const plan = photo.plan(sanitizePhotoDish(dish), payload.selectedIngredientIds, "served");
    const photos = plan.layers.map(layer => ({ imageUrl: layer.path, imageAlt: layer.alt }));
    return {
      questionId: question.id, number: question.station.number, dishTitle: dish.title,
      kind: dish.photo.kind,
      mood: attempt.storyRunId && !attempt._storyRun?.publishedAt ? "neutral" : saved.autoScore === question.maxScore ? "pleased" : "puzzled",
      composition: selected.map(item => item.text),
      photos,
      servingPhoto: attempt.storyRunId && !attempt._storyRun?.publishedAt ? null : servingFor(photos, plan.phase === "mise"),
      isTray: plan.phase === "mise"
    };
  } catch {
    // A corrupt historical payload cannot reveal feedback or break the attempt view.
    return null;
  }
}

module.exports = { buildDishService };
