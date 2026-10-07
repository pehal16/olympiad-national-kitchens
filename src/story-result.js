"use strict";
const { buildDishService } = require('./dish-service');
const { matchDetectiveAnswer } = require('./detective-answer');
const { summarizeAttempt } = require('./scoring');
const plates=require('./story-plates.json');
function plateFor(id,title,explanation,version=null) {
  const asset=plates.find(p=>p.id===id);
  return { dishId:id,title,recipeVersion:version||asset?.description||'Блюдо действующего банка',assetVersion:1,imageUrl:asset?.imageUrl||null,imageAlt:title,explanation };
}
function freezeStoryVariant(variant,run) {
  variant.blueprintVersion=15; variant.storyVersion=run.storyVersion; variant.assetVersion=run.assetVersion; variant.runId=run.id;
  for(const q of variant.questions) {
    if(q.type==='bucket_sort') q.storyPlates=q.items.map(item=>({itemId:item.id,...plateFor(item.dishId,item.text,
      `${item.text}: ${q.buckets.find(b=>b.id===q.correctBuckets[item.id])?.label||''}.`)}));
    else if(q.type==='dish_detective') q.storyPlates=[plateFor(q.dishId,q.answerPolicy.canonical,
      q.clues.map(c=>`${c.label}: ${c.text}`).join('. '))];
    else if(q.type==='single_choice') {
      const correct=q.options.find(o=>o.isCorrect);
      q.storyPlates=[plateFor(correct.menuDishId||q.dishId||q.sourceId,correct.text,
        correct.description||`На фотографии изображено блюдо «${correct.text}».`)];
    } else if(q.type==='final_kitchen') {
      const dish=q.dishes[0]; q.storyPlates=[plateFor(dish.dishId||q.dishKey,dish.title,
        `${dish.variantLabel}. Состав: ${dish.items.filter(i=>dish.correctIngredientIds.includes(i.id)).map(i=>i.text).join(', ')}.`,dish.variantLabel)];
    }
  }
  return variant;
}
function answerText(q,payload) {
  if(!payload) return 'Ответ не подтверждён';
  if(q.type==='single_choice') return q.options.find(o=>o.id===payload.selectedOptionId)?.text||'Ответ пропущен';
  if(q.type==='dish_detective') return payload.text||'Ответ пропущен';
  if(q.type==='bucket_sort') return q.items.map(i=>`${i.text} → ${q.buckets.find(b=>b.id===payload.buckets?.[i.id])?.label||'не выбрано'}`).join('; ');
  if(q.type==='final_kitchen') return q.dishes[0].items.filter(i=>payload.selectedIngredientIds?.includes(i.id)).map(i=>i.text).join(', ');
  return 'Ответ сохранён';
}
function buildStoryResult(olympiad,attempt) {
  if(!attempt.storyRunId) return {state:'legacy'};
  if(attempt.status==='in_progress'||!attempt._storyRun?.publishedAt) return {state:'waiting',entryEndsAt:attempt._storyRun?.entryEndsAt||null,
    ...(attempt._storyRun?.entryMode==='anytime'?{entryOpen:require('./story-runs').entryOpen(attempt._storyRun)}:{})};
  const earned=[], kitchen=[];
  for(const q of attempt.variant.questions) {
    const saved=attempt.answers?.[q.id], payload=saved?.answerPayload;
    const action={questionId:q.id,tour:q.tourCode,number:q.sequenceInTour,savedAnswer:answerText(q,payload),score:Number(saved?.finalScore||0),maxScore:q.maxScore};
    if(!saved) continue;
    for(const p of q.storyPlates||[]) {
      let correct=false;
      let imageUrl=p.imageUrl;
      if(q.type==='bucket_sort') correct=payload?.buckets?.[p.itemId]===q.correctBuckets[p.itemId];
      else if(q.type==='single_choice') correct=payload?.selectedOptionId===q.options.find(o=>o.isCorrect)?.id && saved.autoScore===q.maxScore;
      else if(q.type==='dish_detective') correct=matchDetectiveAnswer(q.answerPolicy,payload?.text)&&saved.autoScore===q.maxScore;
      else if(q.type==='final_kitchen') {
        const dish=q.dishes[0];
        correct=saved.autoScore===q.maxScore&&payload?.selectedIngredientIds?.length===4&&dish.correctIngredientIds.every(id=>payload.selectedIngredientIds.includes(id));
        const receipt=buildDishService(attempt,q);
        if(receipt) {
          kitchen.push({...action,receipt,fullyCorrect:correct,recipeVersion:p.recipeVersion});
          if(correct) imageUrl=receipt.servingPhoto?.imageUrl||receipt.photos?.[0]?.imageUrl||p.imageUrl;
        } else correct=false;
      }
      const {explanation,...publicPlate}=p;
      if(correct) earned.push({...publicPlate,imageUrl,actions:[q.type==='bucket_sort'?{...action,savedAnswer:answerText(q,{buckets:{[p.itemId]:payload.buckets[p.itemId]}}).split('; ').find(s=>s.startsWith(p.title+' →'))||action.savedAnswer,score:q.maxScore/q.items.length,maxScore:q.maxScore/q.items.length}:action]});
    }
  }
  earned.sort((a,b)=>Number(b.actions[0].tour==='T5')-Number(a.actions[0].tour==='T5'));
  const combined=new Map();
  for(const p of earned) { const key=p.dishId+'|'+p.recipeVersion; if(combined.has(key)) combined.get(key).actions.push(...p.actions); else combined.set(key,p); }
  // Keep the empty array for already-open older clients without supplying keys.
  return {state:'published',publishedAt:attempt._storyRun.publishedAt,plates:[...combined.values()],collectionMax:51,summary:summarizeAttempt(olympiad,attempt),kitchen,review:[]};
}
module.exports={freezeStoryVariant,buildStoryResult};
