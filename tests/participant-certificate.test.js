const test=require('node:test'),assert=require('node:assert/strict');
const {buildParticipantCertificate,certificateAvailable}=require('../src/participant-certificate');
const {buildVariant}=require('../src/variant');
const olympiad=require('../data/olympiad');

test('certificate uses confirmed saved points and no unpublished answer breakdown',()=>{
 const variant=buildVariant(olympiad,{seed:'certificate-policy'}),q=variant.questions[0];
 const attempt={id:'attempt_synthetic-cert',status:'reviewed',storyRunId:'anytime-v1',finishedAt:'2026-10-07T12:00:00Z',participant:{fullName:'Тестовый Участник',mentorName:'Тестовый Наставник',institution:'Private college'},variant,
  answers:{[q.id]:{finalScore:1,autoScore:2,answerPayload:{selectedOptionId:'unpublished'}}},totalFinalScore:999};
 const data=buildParticipantCertificate(olympiad,attempt,{showParticipantScore:false});
 assert.deepEqual(data.summary,{totalFinalScore:1,totalMaxScore:150});
 assert.deepEqual(data.certificateOrder,{number:'199',date:'2026-10-05'});
 assert.doesNotMatch(JSON.stringify(data),/unpublished|institution|variant|answers|tourScores|correct|penalty/);
 assert.deepEqual(buildParticipantCertificate(olympiad,{...attempt,answers:{}},{}).summary,{totalFinalScore:0,totalMaxScore:150});
});

test('active or unfinished certificates are denied, legacy score policy remains intact',()=>{
 const base={storyRunId:'story-run',status:'reviewed',finishedAt:'2026-10-07T12:00:00Z',participant:{fullName:'Тестовый Участник'}};
 assert.equal(certificateAvailable({...base,status:'in_progress'},{}),false);
 assert.equal(certificateAvailable({...base,finishedAt:null},{}),false);
 assert.equal(certificateAvailable({...base,storyRunId:null},{showParticipantScore:false}),false);
 assert.equal(certificateAvailable({...base,storyRunId:null},{showParticipantScore:true}),true);
 assert.equal(certificateAvailable(base,{showParticipantScore:false}),true);
});

test('owned certificate follows partial finish and expiry while the shared run remains open',async t=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const {createOlympiadServer}=require('../olympiad-server'),store=require('../src/store');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'certificate-http-'));
 const {server}=createOlympiadServer({dbPath:path.join(directory,'test.sqlite'),adminPassword:'synthetic-certificate-admin',attemptIdSecret:'synthetic-certificate-identity-secret',storyEnabled:'true',storyAnytimeEntry:'true'});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(directory,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`,token='synthetic_certificate_owner_token',participant={fullName:'Тестовый Участник Свидетельства',institution:'Изолированный стенд',groupName:'Тест'};
 const api=async(url,body,own=token)=>{const response=await fetch(base+url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Attempt-Token':own},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,cache:response.headers.get('cache-control'),...await response.json()};};
 const started=(await api('/api/public/attempts/start',{participant})).data,prefix=`/api/public/attempts/${started.id}`;
 const saved=await store.loadAttemptById(started.id),q=saved.variant.questions[0];
 await api(prefix+'/answer',{questionId:q.id,answerPayload:{selectedOptionId:q.options.find(o=>o.isCorrect).id}});
 assert.equal((await api(prefix+'/certificate')).status,409);
 const finished=(await api(prefix+'/finish',{})).data;assert.equal(finished.certificateAvailable,true);assert.equal(finished.summary.totalFinalScore,null);
 const certificate=await api(prefix+'/certificate');assert.equal(certificate.status,200);assert.equal(certificate.cache,'private, no-store');assert.deepEqual(certificate.data.summary,{totalFinalScore:2,totalMaxScore:150});
 assert.equal((await api(prefix+'/certificate',undefined,'synthetic_foreign_certificate_owner')).status,401);
 assert.deepEqual((await api(prefix+'/certificate')).data,certificate.data);
 const active=(await api('/api/public/attempts/start',{participant:{...participant,fullName:'Второй Тестовый Участник'}},'synthetic_certificate_second_token')).data;
 const expiring=await store.loadAttemptById(active.id);expiring.expiresAt=new Date(Date.now()-1000).toISOString();await store.upsertAttempt(expiring);
 const expired=await api(`/api/public/attempts/${active.id}/certificate`,undefined,'synthetic_certificate_second_token');assert.equal(expired.status,200);assert.equal(expired.data.status,'expired');assert.deepEqual(expired.data.summary,{totalFinalScore:0,totalMaxScore:150});
 const waiting=await api(prefix+'/story-result');assert.equal(waiting.data.state,'waiting');assert.equal(waiting.data.entryOpen,true);assert.doesNotMatch(JSON.stringify(waiting.data),/plates|expectedAnswer|totalFinalScore/);
});
