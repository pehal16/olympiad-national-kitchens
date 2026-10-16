"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');

test('organizer history counts saved attempts, separates names/groups/runs, and retains each result and certificate',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'admin-attempt-history-'));process.env.STORAGE_DIR=path.join(dir,'storage');process.env.EXPORTS_DIR=path.join(dir,'exports');
 const {server}=require('../olympiad-server').createOlympiadServer({dbPath:path.join(dir,'qa.sqlite'),adminPassword:'synthetic-history-admin-password',attemptIdSecret:'synthetic-history-attempt-identity-secret',storyEnabled:'true',storyAnytimeEntry:'true'}),store=require('../src/store'),runs=require('../src/story-runs');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`,profile={fullName:'Иванов Алексей Проверочный',institution:'Изолированный стенд',groupName:'ТЕСТ',mentorName:''};let cookie='';
 async function api(route,{body,admin=false,token='synthetic-history-owner'}={}){const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Attempt-Token':token.padEnd(48,'x'),...(admin?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const j=await r.json();if(route==='/api/admin/login')cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...j};}
 await api('/api/admin/login',{body:{password:'synthetic-history-admin-password'}});const run=await runs.currentRun();await runs.updateRun(run.id,{admissionMode:'open'});
 await api('/api/public/register',{body:profile});const first=(await api('/api/public/attempts/start',{body:{participant:profile}})).data;
 const q=(await store.loadAttemptById(first.id)).variant.questions[0];await api('/api/public/attempts/'+first.id+'/answer',{body:{questionId:q.id,answerPayload:{selectedOptionId:q.options.find(o=>o.isCorrect).id}}});await api('/api/public/attempts/'+first.id+'/finish',{body:{}});
 const second=(await api('/api/public/attempts/start',{body:{participant:profile,retakeOf:first.id},token:'synthetic-history-second-owner'})).data;await api('/api/public/attempts/'+second.id+'/finish',{body:{},token:'synthetic-history-second-owner'});
 const third=(await api('/api/public/attempts/start',{body:{participant:profile,retakeOf:second.id},token:'synthetic-history-third-owner'})).data;
 // Duplicate start is not an additional saved attempt.
 assert.equal((await api('/api/public/attempts/start',{body:{participant:profile,retakeOf:second.id},token:'synthetic-history-third-owner'})).data.id,third.id);
 const other=(await api('/api/public/attempts/start',{body:{participant:{...profile,fullName:'Иванов Борис Проверочный'}},token:'synthetic-history-other-owner'})).data;
 const otherGroup=(await api('/api/public/attempts/start',{body:{participant:{...profile,groupName:'ДРУГАЯ'}},token:'synthetic-history-group-owner'})).data;
 await api('/api/public/register',{body:{...profile,fullName:'Ожидающий Проверочный Участник'}});
 const snapshots=new Map();for(const id of [first.id,second.id,third.id,other.id,otherGroup.id])snapshots.set(id,JSON.stringify(await store.loadAttemptById(id)));
 assert.equal((await api('/api/admin/participants?runId='+run.id)).status,401);
 const data=(await api('/api/admin/participants?runId='+run.id,{admin:true})).data,person=data.participants.find(p=>p.participant.fullName===profile.fullName&&p.participant.groupName===profile.groupName);
 assert.equal(data.participants.length,4);assert.equal(person.attemptCount,3);assert.equal(person.attemptId,third.id);assert.equal(person.status,'in_progress');
 assert.deepEqual(person.attempts.map(a=>a.id),[first.id,second.id,third.id]);assert.deepEqual(person.attempts.map(a=>a.number),[1,2,3]);assert.deepEqual(person.attempts.map(a=>a.totalFinalScore),[2,0,null]);assert.deepEqual(person.attempts.map(a=>a.isLatest),[false,false,true]);
 assert.equal(person.firstStartedAt,person.attempts[0].startedAt);assert.equal(person.lastStartedAt,person.attempts[2].startedAt);assert.ok(person.registeredAt);
 assert.equal(data.participants.find(p=>p.participant.fullName==='Иванов Борис Проверочный').attemptCount,1);assert.equal(data.participants.find(p=>p.participant.groupName==='ДРУГАЯ').attemptCount,1);
 const waiting=data.participants.find(p=>p.participant.fullName==='Ожидающий Проверочный Участник');assert.equal(waiting.attemptCount,0);assert.deepEqual(waiting.attempts,[]);assert.equal(waiting.firstStartedAt,null);
 assert.doesNotMatch(JSON.stringify(data),/accessToken|participantSignature|answers|variant|questionLog/);
 for(const [id,score]of [[first.id,2],[second.id,0]]){const detail=await api('/api/admin/attempts/'+id,{admin:true});assert.equal(detail.data.summary.totalFinalScore,score);const certificate=await api('/api/admin/attempts/'+id+'/certificate',{admin:true});assert.equal(certificate.data.summary.totalFinalScore,score);assert.equal(certificate.data.id,id);}
 assert.equal((await api('/api/admin/attempts/'+third.id+'/certificate',{admin:true})).status,409);
 for(const [id,snapshot]of snapshots)assert.equal(JSON.stringify(await store.loadAttemptById(id)),snapshot,'Listing and selecting history must not change any attempt');
 const next=await runs.createRun('2099-02-01');await runs.updateRun(next.id,{admissionMode:'open'});await runs.selectRun(next.id);
 const differentRun=(await api('/api/public/attempts/start',{body:{participant:profile},token:'synthetic-history-different-run-owner'})).data;
 const newPeople=(await api('/api/admin/participants?runId='+next.id,{admin:true})).data.participants;assert.equal(newPeople.length,1);assert.equal(newPeople[0].attemptCount,1);assert.equal(newPeople[0].attempts[0].id,differentRun.id);
 assert.equal((await api('/api/admin/participants?runId='+run.id,{admin:true})).data.participants.find(p=>p.id===person.id).attemptCount,3);
});
