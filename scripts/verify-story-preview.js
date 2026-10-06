"use strict";
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const base=process.env.STORY_PREVIEW_URL,db=process.env.STORY_PREVIEW_DB_ID,account=process.env.CLOUDFLARE_ACCOUNT_ID;
if(!/^https:\/\/[a-z0-9-]+\.olympiad-gkts\.pages\.dev$/.test(base||'')||!db||db==='4c30c9ab-0c53-4b8a-865a-7c9078d48c2f')throw Error('An isolated preview URL and dedicated test D1 are required.');
async function sql(query,params=[]){const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${db}/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({sql:query,params})});const j=await r.json();assert.ok(r.ok&&j.success,JSON.stringify(j.errors));return j.result[0].results;}
let cookie='';const evidence=[];
async function api(url,token='',body,method=body?'POST':'GET',expected=200){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{'X-Attempt-Token':token}:{}),...(url.startsWith('/api/admin')?{cookie}:{} )},...(body!==undefined?{body:JSON.stringify(body)}:{})});const j=await r.json();assert.ok(r.status===expected||(expected===200&&r.status===201),`${url}: ${r.status}: ${j.message}`);if(url.endsWith('/login')){assert.ok(r.headers.get('set-cookie'),'Preview login session cookie missing');cookie=r.headers.get('set-cookie').split(';')[0];}return j.data;}
function correct(q){if(q.type==='single_choice')return {selectedOptionId:q.options.find(o=>o.isCorrect).id};if(q.type==='bucket_sort')return {buckets:q.correctBuckets};if(q.type==='dish_detective')return {text:q.answerPolicy.canonical};return {dishId:q.dishes[0].id,selectedIngredientIds:q.dishes[0].correctIngredientIds};}
async function main(){
  await api('/api/admin/login','',{password:process.env.STORY_PREVIEW_ADMIN_PASSWORD});
  // Dedicated preview only: remove prior synthetic rehearsals, preserving production.
  await sql('DELETE FROM attempt_answers WHERE attempt_id IN (SELECT id FROM attempts WHERE story_run_id IS NOT NULL)');
  await sql('DELETE FROM attempt_variants WHERE id IN (SELECT id FROM attempts WHERE story_run_id IS NOT NULL)');
  await sql('DELETE FROM attempts WHERE story_run_id IS NOT NULL');await sql('DELETE FROM olympiad_story_runs');
  for(const count of [50,60]){
    const date=new Date(Date.now()+10800000+(count===60?86400000:0)).toISOString().slice(0,10);
    const run=await api('/api/admin/story-runs','',{date});
    run.entryStartsAt=new Date(Date.now()-1000).toISOString();run.entryEndsAt=new Date(Date.now()+3600000).toISOString();
    await sql('UPDATE olympiad_story_runs SET entry_starts_at=?,entry_ends_at=?,payload_json=? WHERE id=?',[run.entryStartsAt,run.entryEndsAt,JSON.stringify(run),run.id]);
    await api(`/api/admin/story-runs/${run.id}/publish`,'',{},'POST',409);
    const alphabet='АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ',times=[];
    const people=await Promise.all(Array.from({length:count},async(_,i)=>{
      const token=crypto.randomBytes(32).toString('base64url'),participant={fullName:`Репетиционный Участник ${alphabet[Math.floor(i/alphabet.length)]}${alphabet[i%alphabet.length]}`,institution:'Изолированный технический стенд',groupName:'Тестовая группа',mentorName:''};
      const [a,b]=await Promise.all([api('/api/public/attempts/start',token,{participant}),api('/api/public/attempts/start',token,{participant})]);assert.equal(a.id,b.id);assert.equal(Date.parse(a.expiresAt)-Date.parse(a.startedAt),2700000);return {token,attempt:a};
    }));
    const variants=await sql('SELECT v.id,v.payload_json FROM attempt_variants v JOIN attempts a ON a.id=v.id WHERE a.story_run_id=?',[run.id]);assert.equal(variants.length,count);
    const map=new Map(variants.map(v=>[v.id,JSON.parse(v.payload_json)]));
    for(let round=0;round<36;round++)await Promise.all(people.map(async(p,i)=>{
      const q=map.get(p.attempt.id).questions[round],prefix=`/api/public/attempts/${p.attempt.id}`;assert.equal(p.attempt.currentQuestion.id,q.id);
      const send=()=>api(prefix+'/answer',p.token,{questionId:q.id,answerPayload:correct(q)}),before=performance.now();const a=await send();times.push(performance.now()-before);
      if((round+i)%10===0)assert.equal((await send()).progress.answeredCount,round+1);
      assert.equal(a.progress.answeredCount,round+1);assert.equal(a.summary.totalFinalScore,null);assert.doesNotMatch(JSON.stringify(a.currentQuestion),/storyPlates|isCorrect|correctIngredientIds/);
      if(q.type==='final_kitchen'){assert.equal(a.dishService.mood,'neutral');assert.equal(a.dishService.servingPhoto,null);}
      p.attempt=round%8===0?await api(prefix+'/current',p.token):a;
    }));
    const records=await sql("SELECT a.id,json_extract(a.payload_json,'$.status') AS status,json_extract(a.payload_json,'$.totalFinalScore') AS score,(SELECT COUNT(*) FROM attempt_answers b WHERE b.attempt_id=a.id) AS answers FROM attempts a WHERE story_run_id=?",[run.id]);
    for(const a of records){assert.equal(a.status,'reviewed');assert.equal(a.score,150);assert.equal(a.answers,36);}
    const pending=await api(`/api/public/attempts/${people[0].attempt.id}/story-result`,people[0].token);assert.deepEqual(Object.keys(pending),['state','entryEndsAt']);
    await api(`/api/public/attempts/${people[0].attempt.id}/story-result`,people[1].token,undefined,'GET',401);
    run.entryEndsAt=new Date(Date.now()-1000).toISOString();await sql('UPDATE olympiad_story_runs SET entry_ends_at=?,payload_json=? WHERE id=?',[run.entryEndsAt,JSON.stringify(run),run.id]);
    const publication=await api(`/api/admin/story-runs/${run.id}/publish`,'',{});assert.equal((await api(`/api/admin/story-runs/${run.id}/publish`,'',{})).publishedAt,publication.publishedAt);
    await Promise.all(people.map(async p=>{const r=await api(`/api/public/attempts/${p.attempt.id}/story-result`,p.token);assert.equal(r.state,'published');assert.equal(r.plates.length,51);assert.equal(r.summary.totalFinalScore,150);}));
    times.sort((a,b)=>a-b);const metric={environment:'Cloudflare Pages preview / separate D1',participants:count,answers:count*36,errors:0,lostAnswers:0,duplicateAnswers:0,answerP95Ms:Math.round(times[Math.ceil(times.length*.95)-1]),timestamp:new Date().toISOString()};evidence.push(metric);console.log(JSON.stringify(metric));
  }
  fs.writeFileSync('output/story/cloudflare-load.json',JSON.stringify(evidence,null,2));
  assert.ok(evidence.every(m=>m.answerP95Ms<=3000),'Preview answer p95 exceeds the 3000 ms target.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
