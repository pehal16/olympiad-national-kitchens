'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const menu=require('../data/banks/tour4-menu-v3.json'),bank=require('../data/banks/tour4'),oldBank=require('../data/banks/tour4-menu-v2'),olympiad=require('../data/olympiad');
const {buildVariant,sanitizeQuestion}=require('../src/variant');
const {freezeStoryVariant,buildStoryResult}=require('../src/story-result');
const {makeRun}=require('../src/story-runs');
const {scoreQuestion}=require('../src/scoring');

test('reviewed recipe facts give exactly one full match per order; near alternatives remain comparable',()=>{
 assert.equal(menu.menuVersion,3);assert.equal(menu.orders.length,8);
 menu.orders.forEach((order,index)=>{
  const keys=Object.keys(order.criteria);assert.ok(keys.length>=2);
  const matches=order.dishes.filter(d=>keys.every(k=>d.profile[k]===order.criteria[k]));
  assert.deepEqual(matches.map(d=>d.id),[bank[index].dishId]);
  order.dishes.forEach(d=>{assert.ok(keys.every(k=>k in d.profile));assert.match(d.source,/^https:\/\/(www\.iamcook\.ru|www\.giallozafferano\.com|www\.bbcgoodfood\.com|www\.gastronom\.ru)\//);});
  assert.equal(bank[index].menuVersion,3);
 });
 assert.deepEqual(bank[0].options.map(o=>o.menuDishId),['borsch','shchi_t4_v3','solyanka_t4_v3','mushroom_cream_soup']);
 // Both choices have the same filling; boiling/shape, rather than an unknown name, distinguishes them.
 assert.equal(menu.orders[5].dishes[0].profile.filling,menu.orders[5].dishes[1].profile.filling);
 assert.equal(menu.orders[3].dishes[0].profile.meat,menu.orders[3].dishes[1].profile.meat);
 assert.equal(menu.orders[1].dishes[0].profile.beet,menu.orders[1].dishes[3].profile.beet);
});

test('v2 menu snapshot and its saved plates stay immutable and independently scoreable',()=>{
 const bytes=fs.readFileSync(path.join(__dirname,'../data/banks/tour4-menu-v2.js'),'utf8').replace(/\r\n/g,'\n');
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'920081f01678d1136f612d843d48c1b7a0c9f4ac0af0c2aab37bd16a9ffa3db6');
 const older=structuredClone(olympiad);older.questionBank.tour4Tasks=oldBank;
 const run={...makeRun('2026-10-09','synthetic-menu-history'),publishedAt:'2026-10-10T00:00:00Z'};
 const variant=freezeStoryVariant(buildVariant(older,{seed:'immutable-menu-v2'}),run);
 assert.equal(variant.conditionVersion,2);
 const saved=JSON.stringify(variant),attempt={variant,storyRunId:run.id,_storyRun:run,status:'reviewed',answers:{}};
 for(const q of variant.questions.filter(q=>q.tourCode==='T4')){
  for(const option of q.options)assert.equal(scoreQuestion(q,{selectedOptionId:option.id}).finalScore,option.isCorrect?4:0);
  const answerPayload={selectedOptionId:q.options.find(o=>o.isCorrect).id};attempt.answers[q.id]={answerPayload,...scoreQuestion(q,answerPayload)};
 }
 const before=buildStoryResult(older,attempt);assert.equal(before.plates.length,8);assert.equal(before.summary.totalFinalScore,32);
 freezeStoryVariant(buildVariant(olympiad,{seed:'new-menu-v3'}),run);
 assert.equal(JSON.stringify(variant),saved);assert.deepEqual(buildStoryResult(olympiad,attempt),before);
 assert.ok(before.plates.every(p=>p.imageUrl&&!p.imageUrl.includes('/v3/')));
});

test('private recipe criteria, sources and menu keys never enter the participant question',()=>{
 const v=freezeStoryVariant(buildVariant(olympiad,{seed:'menu-source-whitelist'}),makeRun('2026-10-09'));
 assert.equal(v.conditionVersion,3);
 for(const q of v.questions.filter(q=>q.tourCode==='T4')){
  const safe=JSON.stringify(sanitizeQuestion(q,{answers:{}}));
  assert.doesNotMatch(safe,/profile|criteria|recipeSource|sourceFile|menuDishId|isCorrect|menuVersion|iamcook|giallozafferano/);
 }
});

test('eight earned menu plates exist, including six new alpha exports and smaller display files',()=>{
 const v=freezeStoryVariant(buildVariant(olympiad,{seed:'new-table-assets'}),makeRun('2026-10-09'));
 const registry=require('../docs/restaurant-display-assets.json'),manifest=require('../docs/olympiad-t4-menu-v3-assets.json');
 assert.equal(manifest.assets.filter(a=>a.role==='menu').length,23);
 assert.equal(manifest.assets.filter(a=>a.role==='panorama').length,6);
 for(const q of v.questions.filter(q=>q.tourCode==='T4')){
  const plate=q.storyPlates[0];assert.ok(plate.imageUrl);assert.ok(fs.existsSync(path.join(__dirname,'../public',plate.imageUrl)));
  if(q.dishId!=='borsch'&&q.dishId!=='thin_blini')assert.equal(manifest.assets.find(a=>a.url===plate.imageUrl).alpha,true);
 }
 for(const option of bank.flatMap(q=>q.options)){
  for(const role of ['card','preview']){
   const entry=registry.exports.find(e=>e.sourceUrl===option.imageUrl&&e.role===role);assert.ok(entry,option.text);
   assert.ok(fs.existsSync(path.join(__dirname,'../public',entry.url)));
  }
 }
});
