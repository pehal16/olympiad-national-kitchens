const test=require('node:test'),assert=require('node:assert/strict');
const {buildVariant,sanitizeQuestion}=require('../src/variant');
const {freezeDialogue,conditionVersion,rankingGroup}=require('../src/story-dialogue');
const {forQuestion}=require('../src/story-dialogue-texts');
const olympiad=require('../data/olympiad');
const make=()=>buildVariant(olympiad,{seed:'immutable-comic-scenarios'});
test('36 frozen scenes are distinct; current-question dialogue never supplies keys or later scenes',()=>{
 const v=freezeDialogue(make());assert.equal(v.questions.length,36);assert.equal(v.conditionVersion,2);assert.equal(v.dialogueVersion,1);
 assert.equal(new Set(v.questions.map(q=>q.dialogue.line)).size,36);assert.equal(new Set(v.questions.map(q=>q.dialogue.extra)).size,36);
 for(const q of v.questions){
  const safe=sanitizeQuestion(q,{answers:{}});assert.deepEqual(safe.dialogue,q.dialogue);
  assert.doesNotMatch(JSON.stringify(safe.dialogue),/isCorrect|correctBuckets|correctIngredientIds|canonical|autoScore/);
  assert.equal(Object.keys(safe.dialogue).length,6);
  if(q.tourCode==='T1'){assert.match(q.scenario,/Страница альбома:/);assert.match(q.dialogue.line,/Эта страница — из/);assert.ok(!q.dialogue.line.includes(q.options.find(o=>o.isCorrect).text));}
  else assert.doesNotMatch(q.dialogue.line,/Франци|Япони|Грузи|Мексик|Таиланд|Итали|Узбекистан|Испани|США/);
 }
 assert.equal(sanitizeQuestion(null,{answers:{}}),null);
});
test('legacy attempts keep their issued conditions; frozen dialogue survives serialization and bank changes',()=>{
 const legacy=make(),before=JSON.stringify(legacy);assert.equal(conditionVersion({variant:legacy}),1);
 for(const q of legacy.questions.filter(q=>q.tourCode==='T1'))assert.doesNotMatch(forQuestion(q).line,/Франци|Япони|Грузи|Мексик|Таиланд|Итали|Узбекистан|Испани|США/);
 assert.equal(JSON.stringify(legacy),before);
 const current=freezeDialogue(make()),saved=JSON.stringify(current),restored=JSON.parse(saved);restored.questions[0].sourceId='edited-bank-id';
 const unchanged=restored.questions[0].dialogue.line;freezeDialogue(restored);assert.equal(restored.questions[0].dialogue.line,unchanged);
 assert.equal(JSON.stringify(current),saved);
});
test('rank identity separates condition editions inside a run and separates runs',()=>{
 const old={storyRunId:'same-run',variant:{}},newer={storyRunId:'same-run',variant:{conditionVersion:2}},other={...newer,storyRunId:'other-run'};
 assert.notEqual(rankingGroup(old),rankingGroup(newer));assert.notEqual(rankingGroup(newer),rankingGroup(other));assert.equal(rankingGroup({...old,variant:{conditionVersion:1}}),rankingGroup(old));
});
test('an unreviewed first-tour recipe cannot silently receive a country clue',()=>{
 const v=make();v.questions[0].options.find(o=>o.isCorrect).text='Иное блюдо';assert.throws(()=>freezeDialogue(v),/reviewed dish changed/);
});
