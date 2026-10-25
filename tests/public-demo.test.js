"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {handleDemoRelay,DEMO_ORIGIN}=require('../src/public-demo');

test('public demo relay is fixed, owner-scoped and never forwards to PC, production D1 or redirects',async()=>{
 const calls=[],env={OLYMPIAD_PUBLIC_DEMO:'true',DB:{prepare(){throw Error('Original database must remain untouched');}}};
 const input=new Request('https://olympiad-gkts.pages.dev/api/public/attempts/synthetic/answer',{method:'POST',headers:{'Content-Type':'application/json','X-Attempt-Token':'demo-owner','X-Demo-Session':'a'.repeat(32),Cookie:'private-original-cookie',Authorization:'private-original-auth'},body:'{"demo":true}'});
 const r=await handleDemoRelay(input,env,async(url,options)=>{calls.push({url,options});return new Response('{"ok":true}',{headers:{'Content-Type':'application/json'}});});
 assert.equal(r.status,200);assert.equal(calls.length,1);assert.equal(calls[0].url,DEMO_ORIGIN+'/api/public/attempts/synthetic/answer');
 assert.equal(calls[0].options.headers.get('X-Demo-Session'),'a'.repeat(32));assert.equal(calls[0].options.headers.get('X-Attempt-Token'),'demo-owner');
 assert.equal(calls[0].options.headers.has('cookie'),false);assert.equal(calls[0].options.headers.has('authorization'),false);assert.equal(calls[0].options.redirect,'manual');
 for(const route of ['/api/pm01/public/exam','/api/learning/me','/api/admin/summary','/organizer'])assert.equal(await handleDemoRelay(new Request('https://olympiad-gkts.pages.dev'+route),env),null);
 assert.equal(await handleDemoRelay(new Request('https://example.com/api/health'),{}),null);
 assert.equal((await handleDemoRelay(new Request('https://example.com/api/health'),env,async()=>{throw Error('offline');})).status,502);
 assert.equal((await handleDemoRelay(new Request('https://example.com/api/health'),env,async()=>new Response('',{status:302,headers:{Location:'https://other.invalid/'}}))).status,502);
});

test('anonymous isolated demonstration: all 36 questions, no supplied identity, duplicate start, reload, owner protection and immediate demo results',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'public-demo-'));
 const {server,db}=require('../olympiad-server').createOlympiadServer({dbPath:path.join(dir,'demo.sqlite'),adminPassword:'synthetic-demo-admin-password',attemptIdSecret:'synthetic-isolated-demo-attempt-secret',storyEnabled:'true',storyAnytimeEntry:'true',demoMode:'true'});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
 const store=require('../src/store'),base=`http://127.0.0.1:${server.address().port}`,token='synthetic-demo-owner-access-token-20261025',session='b'.repeat(32);
 async function api(url,body,owner=token,identity=session){const r=await fetch(base+url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Attempt-Token':owner,'X-Demo-Session':identity},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
 assert.equal((await api('/api/public/olympiad')).data.demonstration,true);
 assert.equal((await api('/api/public/register',{},token,'invalid')).status,400);
 const profile={fullName:'Не Сохранять Фамилию',institution:'Не сохранять организацию',groupName:'Не сохранять группу',mentorName:'Не сохранять наставника'};
 const registered=await api('/api/public/register',profile);assert.equal(registered.status,200,registered.message);assert.equal(registered.data.participant.fullName,'Демонстрационный Участник');assert.equal(registered.data.participant.mentorName,'');
 const start=()=>api('/api/public/attempts/start',{participant:profile,tourBriefings:true});
 const [a,b]=await Promise.all([start(),start()]);assert.equal(a.data.id,b.data.id);assert.equal(a.data.demonstration,true);
 let view=a.data;const id=view.id,prefix='/api/public/attempts/'+id;
 assert.equal((await api(prefix,null,'incorrect-owner-token')).status,401);
 assert.equal((await api('/api/admin/login',{password:'synthetic-demo-admin-password'})).status,403);
 assert.equal((await api(prefix+'/story-result')).data.state,'waiting');
 const variant=(await store.loadAttemptById(id)).variant;
 for(const q of variant.questions){
  if(view.tourBriefing){const begun=await api(prefix+'/tour/start',{tourId:q.tourId});assert.equal(begun.status,200,begun.message);view=begun.data;}
  assert.equal(view.currentQuestion.id,q.id);
  const answerPayload=q.type==='single_choice'?{selectedOptionId:q.options.find(o=>o.isCorrect).id}:q.type==='bucket_sort'?{buckets:q.correctBuckets}:q.type==='dish_detective'?{text:q.answerPolicy.canonical}:{dishId:q.dishes[0].id,selectedIngredientIds:q.dishes[0].correctIngredientIds};
  const answer=await api(prefix+'/answer',{questionId:q.id,answerPayload});assert.equal(answer.status,200,answer.message);view=answer.data;
 }
 assert.equal(view.status,'reviewed');assert.equal(view.summary.totalFinalScore,150);assert.equal(view.story.resultAvailable,true);
 const restored=await api(prefix);assert.equal(restored.data.progress.answeredCount,36);
 const table=await api(prefix+'/story-result');assert.equal(table.data.state,'published');assert.equal(table.data.plates.length,51);
 const cert=await api(prefix+'/certificate');assert.equal(cert.data.demonstration,true);assert.equal(cert.data.summary.totalFinalScore,150);
 const raw=await store.loadAttemptById(id);assert.equal(raw.demonstration,true);assert.doesNotMatch(JSON.stringify(raw),/Не Сохранять|Не сохранять/);
 const second=await api('/api/public/attempts/start',{participant:profile},'different-demo-owner-access-token','c'.repeat(32));assert.equal(second.status,201);assert.notEqual(second.data.id,id);
 assert.equal((await api(prefix+'/certificate',null,'different-demo-owner-access-token')).status,401);
});
