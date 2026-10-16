"use strict";
const {validateAnswerPayload,scoreQuestion}=require('./scoring');
const {isLockedDishAnswer}=require('./final-kitchen');

function valid(attempt, question, payload) {
  if(!question||!isLockedDishAnswer(attempt,question,payload))return false;
  if(question.type!=='final_kitchen')return validateAnswerPayload(question,payload);
  if(!payload||Object.keys(payload).some(k=>!['dishId','selectedIngredientIds'].includes(k)))return false;
  const dish=question.dishes.find(d=>d.id===payload.dishId),ids=payload.selectedIngredientIds;
  return Boolean(dish&&Array.isArray(ids)&&ids.length<=4&&new Set(ids).size===ids.length&&
    ids.every(id=>typeof id==='string'&&dish.items.some(item=>item.id===id)));
}

function saveTimedOut(attempt, question, deadline) {
  if(!attempt.autoSaveDrafts)return;
  const log=attempt.questionLog?.[question.id],draft=log?.draft;
  if(!draft||Date.parse(draft.savedAt)>deadline||!valid(attempt,question,draft.answerPayload))return;
  const result=validateAnswerPayload(question,draft.answerPayload)?scoreQuestion(question,draft.answerPayload):{autoScore:0,finalScore:0,penalty:0};
  const savedAt=new Date(deadline).toISOString(),timeSpentMs=Math.max(0,deadline-Date.parse(log.availableAt||log.presentedAt));
  attempt.answers[question.id]={questionId:question.id,sourceId:question.sourceId,tourId:question.tourId,
    answerPayload:draft.answerPayload,...result,savedAt,timeSpentMs,autoSaved:true};
  log.answeredAt=savedAt;log.timeSpentMs=timeSpentMs;
}

function minuteVariant(variant) {
  variant.questionTimingVersion=4;
  for(const q of variant.questions)q.timeLimitSeconds=60;
  for(const t of variant.tours)t.timeLimitMinutes=variant.questions.filter(q=>q.tourId===t.id).length;
  variant.durationMinutes=variant.questions.length;
}
module.exports={valid,saveTimedOut,minuteVariant};
