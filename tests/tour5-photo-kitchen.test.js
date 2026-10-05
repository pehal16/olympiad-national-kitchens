const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const olympiad=require('../data/olympiad'),bank=require('../data/banks/tour5-photo-kitchen');
const {buildVariant,sanitizeQuestion,validateQuestionStructure}=require('../src/variant');
const {scoreQuestion,validateAnswerPayload}=require('../src/scoring');
const {isLockedDishAnswer}=require('../src/final-kitchen');
const photo=require('../public/t5-photo-model');
const combos=(items,n)=>n?items.flatMap((item,index)=>combos(items.slice(index+1),n-1).map(rest=>[item,...rest])):[[]];
const perms=items=>items.length?items.flatMap((item,index)=>perms(items.filter((_,i)=>i!==index)).map(rest=>[item,...rest])):[[]];
test('T5 photo v4 issues a fixed 3/24 route: 48 points/15 min, whole route 150/45/36',()=>{
 bank.forEach(validateQuestionStructure);const variant=buildVariant(olympiad,{seed:'photo-v4-contract'}),questions=variant.questions.filter(q=>q.type==='final_kitchen');
 assert.equal(variant.questions.length,36);assert.equal(variant.questions.reduce((sum,q)=>sum+q.maxScore,0),150);assert.equal(variant.tours.reduce((sum,tour)=>sum+tour.timeLimitMinutes,0),45);
 assert.equal(variant.tours[4].questionCount,3);assert.equal(variant.tours[4].maxScore,48);assert.equal(variant.tours[4].timeLimitMinutes,15);
 assert.deepEqual(questions.map(q=>q.dishes[0].photo.kind),['pizza','greek','roll']);assert.ok(questions.every(q=>q.presentationVersion===4&&q.dishes.length===1&&q.dishes[0].items.length===8));
 for(const question of questions){const publicQ=sanitizeQuestion(question,{});assert.equal(publicQ.selectedDish.id,question.dishes[0].id);assert.deepEqual(publicQ.dishes,[]);assert.ok(isLockedDishAnswer({},question,{dishId:question.dishes[0].id}));assert.equal(isLockedDishAnswer({},question,{dishId:'forged'}),false);assert.doesNotMatch(JSON.stringify(publicQ),/correctIngredientIds|isCorrect|ingredientKey|surfaceTextures|previewUrl|sample/);}
});
for(const question of bank)test(`${question.dishes[0].title}: all 70 choices ×24 orders have equal component scoring and independent assembly`,()=>{
 const dish=question.dishes[0],publicDish=sanitizeQuestion(question,{}).selectedDish,histogram=new Map();let states=0;
 for(const items of combos(dish.items,4)){
  const selected=items.map(item=>item.id),expected=items.filter(item=>dish.correctIngredientIds.includes(item.id)).length*4;histogram.set(expected,(histogram.get(expected)||0)+1);
  for(const ids of perms(selected)){const payload={dishId:dish.id,selectedIngredientIds:ids};assert.equal(validateAnswerPayload(question,payload),true);assert.equal(scoreQuestion(question,payload).finalScore,expected);}
  for(const stage of photo.recipeStages(publicDish))for(const layout of ['balanced','turned']){const plan=photo.plan(publicDish,selected,stage,layout);assert.deepEqual(plan,photo.plan(publicDish,[...selected].reverse(),stage,layout));assert.equal(plan.complete,true);assert.equal(plan.stage,stage);states++;
   if(stage==='served'){const basis=items.some(item=>item.visual.role==='basis');assert.equal(plan.layers[0].kind,question.station.number===2||basis?'frame':'tray');}
  }
 }
 assert.deepEqual([...histogram.entries()].sort((a,b)=>a[0]-b[0]),[[0,1],[4,16],[8,36],[12,16],[16,1]]);assert.equal(states,70*photo.recipeStages(publicDish).length*2);
 const missing={dishId:dish.id,selectedIngredientIds:dish.correctIngredientIds.slice(0,3)};assert.equal(validateAnswerPayload(question,missing),false);assert.equal(photo.plan(publicDish,missing.selectedIngredientIds,'served').stage,'select');
});
test('T5 photo validation rejects missing/external finals, forged visual roles and grading leak filenames',()=>{
 for(const mutate of [q=>q.dishes[0].photo.finals.pop(),q=>q.dishes[0].photo.finals[0].imageUrl='https://example.com/answer.webp',q=>q.dishes[0].items[0].visual.role='correct',q=>q.dishes[0].items[0].imageUrl='/assets/olympiad/tour5/photo-v4/correct.webp']){const question=structuredClone(bank[0]);mutate(question);assert.throws(()=>validateQuestionStructure(question));}
});
test('T5 visual catalog order is neutral and card placement varies across issued seeds',()=>{
 const orders=new Set();
 for(let seed=0;seed<100;seed++){
  const questions=buildVariant(olympiad,{seed:'photo-order-'+seed}).questions.filter(q=>q.type==='final_kitchen');
  for(const question of questions){const publicQ=sanitizeQuestion(question,{}),dish=publicQ.selectedDish;assert.deepEqual(dish.photo.finals.map(entry=>entry.key),dish.photo.finals.map(entry=>entry.key).sort());assert.ok(!dish.photo.finals.some(entry=>'correct' in entry));orders.add(dish.items.map(item=>item.visual.token).join('+'));}
 }
 assert.ok(orders.size>250);
});
test('T5 assets have recorded bytes/hash and 35 exact reviewed cut roll fillings',()=>{
 const registry=require('../docs/olympiad-t5-photo-release-assets.json');assert.equal(registry.assetCount,registry.assets.length);
 for(const asset of registry.assets){const bytes=fs.readFileSync(path.join(__dirname,'../public',asset.imageUrl));assert.equal(bytes.length,asset.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert.equal(bytes.toString('ascii',8,12),'WEBP');}
 const rolls=require('../docs/olympiad-roll-exact-assets.json').assets;assert.equal(rolls.length,35);assert.ok(rolls.every(asset=>asset.review.status==='accepted'&&asset.fillings.length===2&&asset.selected.length===4));
 for(const file of ['t5-photo-model.js','t5-photo-kitchen.js'])assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../public',file),'utf8'),/correctIngredientIds|reviewGreek|reviewPizza|reviewRoll|isCorrect|WebGL|THREE|setTimeout/);
});
