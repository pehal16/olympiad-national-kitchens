const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {createOlympiadServer}=require('../olympiad-server'),store=require('../src/store'),runs=require('../src/story-runs');
function correct(q){if(q.type==='single_choice')return {selectedOptionId:q.options.find(o=>o.isCorrect).id};if(q.type==='bucket_sort')return {buckets:q.correctBuckets};if(q.type==='dish_detective')return {text:q.answerPolicy.canonical};return {dishId:q.dishes[0].id,selectedIngredientIds:q.dishes[0].correctIngredientIds};}
test('50 simultaneous story participants then 60 reserve: 36 answers, duplicates, reload, publication and 51 plates',async t=>{
 for(const count of [50,60])await t.test(`${count} participants`,async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'story-concurrency-')),{server,db}=createOlympiadServer({dbPath:path.join(dir,'test.sqlite'),adminPassword:'synthetic-load-admin-password',attemptIdSecret:'synthetic-load-story-attempt-secret',storyEnabled:'true'});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
  const run=await runs.createRun(new Date(Date.now()+10800000).toISOString().slice(0,10)),base=`http://127.0.0.1:${server.address().port}`,times=[];
  async function api(url,token,body){const before=performance.now(),response=await fetch(base+url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Attempt-Token':token},...(body?{body:JSON.stringify(body)}:{})}),json=await response.json();assert.ok(response.ok,`${response.status}: ${json.message}`);if(url.endsWith('/answer'))times.push(performance.now()-before);return json.data;}
  const alphabet='АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ';
  const people=await Promise.all(Array.from({length:count},async(_,i)=>{
    const token=crypto.randomBytes(32).toString('base64url'),participant={fullName:`Нагрузочный Участник ${alphabet[Math.floor(i/alphabet.length)]}${alphabet[i%alphabet.length]}`,institution:'Техническая репетиция',groupName:'Тестовая группа',mentorName:''};
    const start=()=>api('/api/public/attempts/start',token,{participant});const [a,b]=await Promise.all([start(),start()]);assert.equal(a.id,b.id);
    return {token,attempt:a,variant:(await store.loadAttemptById(a.id)).variant};
  }));
  for(let round=0;round<36;round++)await Promise.all(people.map(async(p,i)=>{
    const q=p.variant.questions[round];assert.equal(p.attempt.currentQuestion.id,q.id);
    const body={questionId:q.id,answerPayload:correct(q)},url=`/api/public/attempts/${p.attempt.id}`;
    const send=()=>api(url+'/answer',p.token,body);const a=await send();
    if((round+i)%10===0){const retry=await send();assert.equal(retry.progress.answeredCount,round+1);}
    assert.equal(a.progress.answeredCount,round+1);assert.equal(a.summary.totalFinalScore,null);
    if(q.type==='final_kitchen'){assert.equal(a.dishService.mood,'neutral');assert.equal(a.dishService.servingPhoto,null);}
    p.attempt=round%8===0?await api(url+'/current',p.token):a;
    assert.equal(p.attempt.story.runId,run.id);
  }));
  for(const p of people){const a=await store.loadAttemptById(p.attempt.id);assert.equal(Object.keys(a.answers).length,36);assert.equal(a.totalFinalScore,150);assert.equal(a.status,'reviewed');}
  const closed={...run,entryEndsAt:new Date(Date.now()-1).toISOString()};db.prepare('UPDATE olympiad_story_runs SET entry_ends_at=?,payload_json=? WHERE id=?').bind(closed.entryEndsAt,JSON.stringify(closed),run.id).run();await runs.publishRun(run.id);
  await Promise.all(people.map(async p=>{const r=await api(`/api/public/attempts/${p.attempt.id}/story-result`,p.token);assert.equal(r.state,'published');assert.equal(r.plates.length,51);assert.equal(r.summary.totalFinalScore,150);}));
  times.sort((a,b)=>a-b);console.log(JSON.stringify({environment:'local SQLite D1 adapter',participants:count,answers:count*36,errors:0,lostAnswers:0,duplicateAnswers:0,answerP95Ms:Math.round(times[Math.ceil(times.length*.95)-1])}));
 });
});
