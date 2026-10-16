"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');

test('admin certificates are authenticated read-only saved results; scheduled closure never publishes official results',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'admin-certificate-'));
 process.env.STORAGE_DIR=path.join(dir,'storage');process.env.EXPORTS_DIR=path.join(dir,'exports');
 const store=require('../src/store'),runs=require('../src/story-runs'),{server}=require('../olympiad-server').createOlympiadServer({dbPath:path.join(dir,'qa.sqlite'),adminPassword:'synthetic-admin-certificate-password',attemptIdSecret:'synthetic-admin-certificate-identity-key',storyEnabled:'true',storyAnytimeEntry:'true'});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`,token='synthetic-owner-admin-certificate',participant={fullName:'Проверочный Участник Сертификата',institution:'Изолированный стенд',groupName:'ТЕСТ',mentorName:'Проверочный Наставник'};
 async function api(url,{body,cookie,owner=token}={}){const r=await fetch(base+url,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Attempt-Token':owner,...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,cache:r.headers.get('cache-control'),cookie:r.headers.get('set-cookie'),...await r.json()};}
 const past=await runs.createRun('2020-01-01',{startTime:'08:00',endTime:'16:00'});await runs.selectRun(past.id);await runs.updateRun(past.id,{admissionMode:'open'});
 const start=await api('/api/public/attempts/start',{body:{participant}});assert.equal(start.status,201);const id=start.data.id,route='/api/admin/attempts/'+id+'/certificate',publicRoute='/api/public/attempts/'+id;
 const login=await api('/api/admin/login',{body:{password:'synthetic-admin-certificate-password'}}),cookie=login.cookie.split(';')[0];
 assert.equal((await api(route)).status,401,'An owner token does not grant administrator certificate access');
 assert.equal((await api(route,{cookie})).status,409,'An organizer cannot issue a certificate for an unfinished attempt');
 assert.equal((await api('/api/admin/attempts/'+id,{cookie})).data.attempt.certificateAvailable,false);
 const saved=await store.loadAttemptById(id),q=saved.variant.questions[0];await api(publicRoute+'/answer',{body:{questionId:q.id,answerPayload:{selectedOptionId:q.options.find(o=>o.isCorrect).id}}});await api(publicRoute+'/finish',{body:{}});
 await runs.updateRun(past.id,{admissionMode:'auto'});
 const before=JSON.stringify(await store.loadAttemptById(id)),certificate=await api(route,{cookie});assert.equal(certificate.status,200);assert.equal(certificate.cache,'private, no-store');assert.equal(certificate.data.participant.fullName,participant.fullName);assert.deepEqual(certificate.data.summary,{totalFinalScore:2,totalMaxScore:150});
 assert.doesNotMatch(JSON.stringify(certificate.data),/variant|answers|correct|accessToken|tokenHash/);
 assert.deepEqual((await api(publicRoute+'/certificate')).data,certificate.data);
 const detail=(await api('/api/admin/attempts/'+id,{cookie})).data;assert.equal(detail.attempt.certificateAvailable,true);assert.equal(detail.tours[0].questions[0].answerReview.lines[0].status,'correct');
 assert.equal((await api('/api/admin/attempts/attempt_missing_admin_certificate/certificate',{cookie})).status,404);
 const other=await api(publicRoute+'/certificate',{owner:'unrelated-owner'});assert.equal(other.status,401);
 for(let i=0;i<3;i++){
  const metadata=(await api('/api/public/olympiad')).data;assert.equal(metadata.story.entryOpen,false);assert.equal(metadata.story.publishedAt,null);
  const result=(await api(publicRoute+'/story-result')).data;assert.equal(result.state,'waiting');assert.equal(result.publishedAt??null,null);
  assert.equal((await api(publicRoute+'/current')).data.summary.totalFinalScore,null);
  await api('/api/admin/story-runs',{cookie});
 }
 assert.equal((await runs.getRun(past.id)).publishedAt,null);assert.equal(JSON.stringify(await store.loadAttemptById(id)),before,'Certificates and review must not rewrite the attempt');
 assert.equal((await api('/api/admin/story-runs/'+past.id+'/publish',{body:{}})).status,401);
 assert.equal((await runs.getRun(past.id)).publishedAt,null);
 const published=await api('/api/admin/story-runs/'+past.id+'/publish',{body:{},cookie});assert.equal(published.status,200);assert.ok(published.data.publishedAt,'Only explicit authenticated publication opens official results');
});
