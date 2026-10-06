const test=require('node:test');
const assert=require('node:assert/strict');
const {makeRun,entryOpen,scoresVisible,storyView}=require('../src/story-runs');
const {freezeStoryVariant,buildStoryResult}=require('../src/story-result');
const {buildVariant}=require('../src/variant');
const {scoreQuestion}=require('../src/scoring');
const {buildDishService}=require('../src/dish-service');
const olympiad=require('../data/olympiad');
function fixture(){const run=makeRun('2026-10-06','synthetic-story'),variant=freezeStoryVariant(buildVariant(olympiad,{seed:'story-rehearsal'}),run);return {storyRunId:run.id,_storyRun:{...run,publishedAt:'2026-10-06T22:00:00Z'},variant,answers:{},status:'reviewed'};}
function correct(q){if(q.type==='bucket_sort')return {buckets:q.correctBuckets};if(q.type==='single_choice')return {selectedOptionId:q.options.find(o=>o.isCorrect).id};if(q.type==='dish_detective')return {text:q.answerPolicy.canonical};return {dishId:q.dishes[0].id,selectedIngredientIds:q.dishes[0].correctIngredientIds};}
function save(a,q,payload){a.answers[q.id]={answerPayload:payload,...scoreQuestion(q,payload)};}
test('Moscow entry includes midnight, excludes next midnight and never caps individual time',()=>{const r=makeRun('2026-10-06');assert.equal(r.entryStartsAt,'2026-10-05T21:00:00.000Z');assert.equal(r.entryEndsAt,'2026-10-06T21:00:00.000Z');const at=Date.parse(r.entryStartsAt),end=Date.parse(r.entryEndsAt);assert.equal(entryOpen(r,at-1),false);assert.equal(entryOpen(r,at),true);assert.equal(entryOpen(r,end-1),true);assert.equal(entryOpen(r,end),false);assert.equal(new Date(end-1+45*60000).toISOString(),'2026-10-06T21:44:59.999Z');assert.throws(()=>makeRun('2026-02-30'));assert.throws(()=>makeRun(''));});
test('collections 0,1,intermediate,51; immutable recipes, issued answers and saved points',()=>{for(const count of [0,1,18,36]){const a=fixture();for(const q of a.variant.questions.slice(0,count))save(a,q,correct(q));const before=JSON.stringify(a.variant);const r=buildStoryResult(olympiad,a);assert.equal(r.plates.length,count===36?51:count===18?33:count);assert.equal(r.summary.totalFinalScore,count===36?150:count===1?2:count===0?0:49);assert.equal(JSON.stringify(a.variant),before);assert.deepEqual(buildStoryResult(olympiad,a),r);if(count===36)assert.deepEqual(r.plates.slice(0,3).map(p=>p.actions[0].tour),['T5','T5','T5']);}});
test('T2 partial correct pairs add exactly the matching food, no unconfirmed draft reward',()=>{const a=fixture(),q=a.variant.questions.find(q=>q.type==='bucket_sort');const ids=q.items.map(i=>i.id);save(a,q,{buckets:{[ids[0]]:q.correctBuckets[ids[0]],[ids[2]]:q.correctBuckets[ids[2]]}});const r=buildStoryResult(olympiad,a);assert.equal(r.plates.length,2);assert.deepEqual(r.plates.map(p=>p.dishId),[q.items[0].dishId,q.items[2].dishId]);assert.equal(r.summary.totalFinalScore,2);});
test('T5 all score levels preserve actual composition; only full recipe earns plate',()=>{for(const q of fixture().variant.questions.filter(q=>q.type==='final_kitchen'))for(let c=0;c<=4;c++){const a=fixture(),own=a.variant.questions.find(x=>x.sourceId===q.sourceId),d=own.dishes[0],wrong=d.items.filter(i=>!d.correctIngredientIds.includes(i.id));const ids=[...d.correctIngredientIds.slice(0,c),...wrong.slice(0,4-c).map(i=>i.id)];save(a,own,{dishId:d.id,selectedIngredientIds:ids});const r=buildStoryResult(olympiad,a);assert.equal(r.kitchen[0].score,c*4);assert.equal(r.plates.length,c===4?1:0);assert.deepEqual([...r.kitchen[0].receipt.composition].sort(),d.items.filter(i=>ids.includes(i.id)).map(i=>i.text).sort());if(c<4)assert.equal(r.kitchen[0].receipt.servingPhoto,null);}});
test('waiting is minimal regardless of global score flag, old snapshots retain policy',()=>{const a=fixture();for(const q of a.variant.questions)save(a,q,correct(q));a._storyRun.publishedAt=null;assert.equal(scoresVisible(a,{showParticipantScore:true}),false);assert.deepEqual(Object.keys(buildStoryResult(olympiad,a)),['state','entryEndsAt']);assert.equal(buildDishService(a).mood,'neutral');assert.equal(scoresVisible({...a,storyRunId:null},{showParticipantScore:true}),true);});

test('story album and map show only confirmed photos and the actual chosen country without verdicts',()=>{
  const a=fixture();a._storyRun.publishedAt=null;
  assert.deepEqual(storyView(a).recordedPhotos,[]);assert.deepEqual(storyView(a).recordedMap,[]);
  const photo=a.variant.questions.find(q=>q.tourCode==='T1'), map=a.variant.questions.find(q=>q.tourCode==='T2');
  save(a,photo,correct(photo));
  const item=map.items[0], wrong=map.buckets.find(b=>b.id!==map.correctBuckets[item.id]);
  save(a,map,{buckets:{[item.id]:wrong.id}});
  const view=storyView(a);
  assert.deepEqual(view.recordedPhotos,[{number:photo.sequenceInTour,imageUrl:photo.imageUrl}]);
  assert.deepEqual(view.recordedMap[0],{dish:item.text,country:wrong.label});
  assert.equal(view.recordedMap[1].country,'не выбрано');
  assert.doesNotMatch(JSON.stringify(view),/isCorrect|expectedAnswer|finalScore|storyPlates|correctBuckets/);
});
