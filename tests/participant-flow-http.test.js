"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createOlympiadServer}=require('../olympiad-server'),store=require('../src/store'),runs=require('../src/story-runs');
const correct=q=>q.type==='single_choice'?{selectedOptionId:q.options.find(o=>o.isCorrect).id}:q.type==='bucket_sort'?{buckets:q.correctBuckets}:q.type==='dish_detective'?{text:q.answerPolicy.canonical}:{dishId:q.dishes[0].id,selectedIngredientIds:q.dishes[0].correctIngredientIds};

test('participant flow: 70 shared-IP students, owner isolation, five paused tours, minute drafts and sequential retakes',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'participant-flow-'));
 const {server}=createOlympiadServer({dbPath:path.join(directory,'test.sqlite'),adminPassword:'synthetic-flow-admin-password',attemptIdSecret:'synthetic-participant-flow-identity-secret',storyEnabled:'true',storyAnytimeEntry:'true'});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(directory,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`,token='synthetic_participant_flow_owner_token_2026';
 const participant={fullName:'Проверочный Участник Потока',institution:'Изолированный стенд',groupName:'ТЕСТ',mentorName:''};
 async function api(url,body,owner=token){const response=await fetch(base+url,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Attempt-Token':owner,'X-Forwarded-For':'203.0.113.70'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,...await response.json()};}
 const run=await runs.currentRun();await runs.updateRun(run.id,{admissionMode:'open'});
 const start=await api('/api/public/attempts/start',{participant,tourBriefings:true});assert.equal(start.status,201);
 let attempt=start.data;const prefix=`/api/public/attempts/${attempt.id}`;
 let stored=await store.loadAttemptById(attempt.id);const originalVariant=JSON.stringify(stored.variant);
 assert.equal(stored.variant.durationMinutes,36);assert.ok(stored.variant.questions.every(q=>q.timeLimitSeconds===60));
 assert.equal(attempt.currentQuestion,null);assert.ok(attempt.tourBriefing);assert.deepEqual(stored.questionLog,{});
 assert.equal((await api(prefix+'/tour/start',{tourId:attempt.currentTour.id},'synthetic_other_owner_token_not_authorized')).status,401);
 assert.equal((await api(prefix+'/answer',{questionId:stored.variant.questions[0].id,answerPayload:correct(stored.variant.questions[0])})).status,409);
 stored.tourBriefing.pausedAt=new Date(Date.parse(stored.startedAt)-3600000).toISOString();await store.updateAttemptWithRevision(stored,stored.stateRevision,{stateOnly:true});
 const waiting=(await api(prefix+'/current')).data;assert.equal(waiting.currentQuestion,null);assert.equal(waiting.status,'in_progress');
 assert.equal((await api(prefix+'/pulse')).data.timing.totalRemainingMs,waiting.timing.totalRemainingMs);
 const begun=await Promise.all(Array.from({length:5},()=>api(prefix+'/tour/start',{tourId:waiting.currentTour.id})));
 assert.ok(begun.every(r=>r.status===200));stored=await store.loadAttemptById(attempt.id);
 assert.ok(stored.pausedMs>=3600000);assert.ok(stored.pausedMs<3603000,'Concurrent starts must add the pause once');
 assert.equal(Object.keys(stored.questionLog).length,1);
 // Save before the deadline, then simulate time passing only in this disposable attempt.
 let question=stored.variant.questions[0];assert.equal((await api(prefix+'/draft',{questionId:question.id,answerPayload:{selectedOptionId:'foreign'}})).status,422);
 assert.equal((await api(prefix+'/draft',{questionId:question.id,answerPayload:correct(question)})).status,200);
 stored=await store.loadAttemptById(attempt.id);const past=new Date(Date.now()-61000).toISOString();
 stored.questionLog[question.id].availableAt=past;stored.questionLog[question.id].presentedAt=past;stored.questionLog[question.id].draft.savedAt=past;
 stored.tourStates[question.tourId].startedAt=past;await store.updateAttemptWithRevision(stored,stored.stateRevision,{changedQuestionIds:[question.id]});
 attempt=(await api(prefix+'/current')).data;stored=await store.loadAttemptById(attempt.id);
 assert.equal(stored.answers[question.id].autoSaved,true);assert.equal(stored.answers[question.id].finalScore,question.maxScore);
 assert.equal((await api(prefix+'/draft',{questionId:question.id,answerPayload:correct(question)})).status,409,'A late request cannot replace a timed-out answer');
 let pauses=1;
 while(attempt.status==='in_progress'){
   if(attempt.tourBriefing){
     pauses++;const before=await store.loadAttemptById(attempt.id),next=before.variant.questions[before.currentStepIndex];
     assert.equal(before.questionLog[next.id],undefined,'No upcoming question clock before Start');
     attempt=(await api(prefix+'/tour/start',{tourId:attempt.currentTour.id})).data;
   }
   question=(await store.loadAttemptById(attempt.id)).variant.questions[attempt.currentStepIndex];
   if(question.sequenceInTour===1&&question.tourCode!=='T1'){
     assert.equal((await api(prefix+'/draft',{questionId:question.id,answerPayload:correct(question)})).status,200);
     const timed=await store.loadAttemptById(attempt.id),past=new Date(Date.now()-61000).toISOString();
     timed.questionLog[question.id].presentedAt=past;timed.questionLog[question.id].availableAt=past;timed.questionLog[question.id].draft.savedAt=past;
     await store.updateAttemptWithRevision(timed,timed.stateRevision,{changedQuestionIds:[question.id]});
     attempt=(await api(prefix+'/current')).data;
     assert.equal((await store.loadAttemptById(attempt.id)).answers[question.id].autoSaved,true);
   }else{
     const answer=await api(prefix+'/answer',{questionId:question.id,answerPayload:correct(question)});assert.equal(answer.status,200);attempt=answer.data;
   }
 }
 assert.equal(pauses,5);stored=await store.loadAttemptById(attempt.id);
 assert.equal(Object.keys(stored.answers).length,36);assert.equal(stored.totalFinalScore,150);assert.equal(JSON.stringify(stored.variant),originalVariant);
 assert.ok(stored.finalSummary.totalDurationMs<60000,'Reading time is excluded from scoring duration');
 assert.equal((await api(prefix+'/certificate')).status,200);
 const preserved=JSON.stringify(stored),registration=await api('/api/public/register',participant);
 assert.equal(registration.data.repeatAllowed,true);assert.equal(registration.data.completedAttemptId,attempt.id);
 const nextToken='synthetic_participant_flow_second_token_2026',retakeBody={participant,tourBriefings:true,retakeOf:attempt.id};
 const retakes=await Promise.all(Array.from({length:6},()=>api('/api/public/attempts/start',retakeBody,nextToken)));
 assert.equal(retakes.filter(r=>r.status===201).length,1);assert.ok(retakes.every(r=>r.status===200||r.status===201));
 const second=retakes[0].data;assert.equal(second.attemptNumber,2);assert.notEqual(second.id,attempt.id);assert.notEqual((await store.loadAttemptById(second.id)).routeSeed,stored.routeSeed);
 assert.equal((await api(`/api/public/attempts/${second.id}/current`,undefined,token)).status,401);
 assert.equal(JSON.stringify(await store.loadAttemptById(attempt.id)),preserved);
 await api(`/api/public/attempts/${second.id}/finish`,{},nextToken);
 const third=await api('/api/public/attempts/start',{participant,tourBriefings:true,retakeOf:second.id},nextToken);assert.equal(third.status,201);assert.equal(third.data.attemptNumber,3);
 assert.equal((await api('/api/public/attempts/start',retakeBody,nextToken)).status,409,'A stale parent cannot fork the attempt chain');
 // All requests use the same external IP; different identities have independent starts.
 const shared=await Promise.all(Array.from({length:70},(_,i)=>api('/api/public/attempts/start',{participant:{...participant,fullName:`Проверочный Общий Адрес${String.fromCharCode(1040+Math.floor(i/26))}${String.fromCharCode(1072+i%26)}`},tourBriefings:true})));
 assert.ok(shared.every(r=>r.status===201),JSON.stringify(shared.filter(r=>r.status!==201).slice(0,2)));assert.equal(new Set(shared.map(r=>r.data.id)).size,70);
 await runs.updateRun(run.id,{admissionMode:'closed'});
 assert.equal((await api('/api/public/attempts/start',{participant,tourBriefings:true,retakeOf:third.data.id},nextToken)).status,409);
 assert.equal((await api(`/api/public/attempts/${third.data.id}/tour/start`,{tourId:third.data.currentTour.id},nextToken)).status,200,'Existing attempts continue when new admission closes');
});

test('partial drafts are preserved honestly and hostile draft values are refused',()=>{
 const drafts=require('../src/answer-draft'),briefing=require('../src/tour-briefing');
 const q={id:'q',type:'final_kitchen',presentationVersion:4,dishes:[{id:'d',items:[{id:'a'},{id:'b'},{id:'c'},{id:'e'}]}]};
 const attempt={autoSaveDrafts:true,answers:{},questionLog:{q:{presentedAt:new Date(0).toISOString(),draft:{savedAt:new Date(1).toISOString(),answerPayload:{dishId:'d',selectedIngredientIds:['a']}}}}};
 assert.equal(drafts.valid(attempt,q,{dishId:'d',selectedIngredientIds:['foreign']}),false);
 drafts.saveTimedOut(attempt,q,60000);assert.deepEqual(attempt.answers.q.answerPayload.selectedIngredientIds,['a']);assert.equal(attempt.answers.q.finalScore,0);
 assert.equal(briefing.pausedDuration({status:'in_progress',tourBriefingsEnabled:true,pausedMs:50,tourBriefing:{pausedAt:new Date(100).toISOString()}},1000),950);
});
