'use strict';
const {forQuestion}=require('./story-dialogue-texts');
// These are reviewed travel associations, not claims of exclusive invention.
const countries={
  'T1-A01':['Франция','из Франции','Круассан'], 'T1-A02':['Япония','из Японии','Рамен'],
  'T1-A03':['Грузия','из Грузии','Хинкали'], 'T1-A04':['Мексика','из Мексики','Тако'],
  'T1-A05':['Таиланд','из Таиланда','Том-ям'], 'T1-A06':['Италия','из Италии','Лазанья'],
  'T1-A07':['Япония','из Японии','Суши'], 'T1-A08':['Узбекистан','из Узбекистана','Плов'],
  'T1-A09':['Испания','из Испании','Паэлья'], 'T1-A10':['США','из США','Хот-дог']
};
function conditionVersion(attempt){
  const edition=Number(attempt?.variant?.conditionVersion);
  if([1,2,3].includes(edition))return edition;
  // Non-story starts also freeze the menu in their questions, without dialogue metadata.
  return attempt?.variant?.questions?.some(q=>q.tourCode==='T4'&&q.menuVersion===3)?3:1;
}
function rankingGroup(attempt){return JSON.stringify([attempt.storyRunId||null,conditionVersion(attempt)]);}
function freezeDialogue(variant){
  if(variant.dialogueVersion===1) return variant;
  variant.dialogueVersion=1;
  // Different menus must not share ranks. Already frozen attempts return above.
  variant.conditionVersion=variant.questions.some(q=>q.tourCode==='T4'&&q.menuVersion===3)?3:2;
  for(const q of variant.questions){
    const dialogue={...forQuestion(q),key:q.sourceId||q.id};
    const trip=q.tourCode==='T1'?countries[q.sourceId]:null;
    // Fail visibly at production of a new edition if the bank no longer matches its review.
    if(q.tourCode==='T1'&&!trip)throw new Error('T1 travel association requires review: '+q.sourceId);
    if(trip){
      const canonical=q.options.find(o=>o.isCorrect)?.text||'';
      if(!canonical.toLocaleLowerCase('ru').includes(trip[2].toLocaleLowerCase('ru')))throw new Error('T1 reviewed dish changed: '+q.sourceId);
      dialogue.line=`Эта страница — ${trip[1]}. ${dialogue.line}`;
      if(q.sourceId==='T1-A01')dialogue.line='Эта страница — из Франции. Я собирался сфотографировать завтрак, а потом вспомнил: сначала фото, потом первый кусочек. Теперь подпись доверяю вам.';
      q.scenario=[q.scenario,`Страница альбома: ${trip[0]}.`].filter(Boolean).join(' ');
    }
    q.dialogue=dialogue;
  }
  return variant;
}
function publicDialogue(q){
  if(!q)return null;
  const d=forQuestion(q);
  return {key:String(d.key),version:1,pose:['album','map','notes','orders','table'].includes(d.pose)?d.pose:'table',line:String(d.line),student:String(d.student),extra:String(d.extra)};
}
module.exports={freezeDialogue,publicDialogue,conditionVersion,rankingGroup};
