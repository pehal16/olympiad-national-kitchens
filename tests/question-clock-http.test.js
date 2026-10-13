'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {buildVariant}=require('../src/variant'),olympiad=require('../data/olympiad'),clock=require('../src/question-clock');
test('individual budgets total 18 minutes; exact deadline and historical timing remain distinct',()=>{
 const v=buildVariant(olympiad,{seed:'question-clock-budget'});assert.equal(v.conditionVersion,5);assert.equal(v.dialogueVersion,2);assert.equal(v.questionTimingVersion,2);
 assert.deepEqual(v.tours.map(t=>v.questions.find(q=>q.tourId===t.id).timeLimitSeconds),[30,30,30,30,30]);
 assert.equal(v.questions.reduce((s,q)=>s+q.timeLimitSeconds,0),1080);
 for(const q of v.questions.filter(q=>q.tourCode==='T3')){assert.match(q.scenario,/Страница блокнота:/);assert.match(q.dialogue.line,/Эти заметки — из/);assert.ok(!q.dialogue.line.toLowerCase().includes(q.answerPolicy.canonical));}
 const q=v.questions[0],tour=v.tours[0],start=Date.parse('2026-10-12T08:00:00Z'),attempt={variant:v,expiresAt:new Date(start+1080000).toISOString(),questionLog:{[q.id]:{availableAt:new Date(start).toISOString()}},tourStates:{[tour.id]:{startedAt:new Date(start).toISOString()}}};
 assert.equal(clock.timing(attempt,q,tour,start+29999).questionRemainingMs,1);assert.equal(clock.timing(attempt,q,tour,start+30000).questionRemainingMs,0);
 assert.deepEqual(clock.timing({...attempt,variant:{questions:v.questions}},q,tour,start+30000),{});
});
test('server advances timed-out questions continuously; late drafts, retries, reload and legacy snapshots',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'question-clock-http-'));process.env.EXPORTS_DIR=path.join(dir,'exports');
 const {server}=require('../olympiad-server').createOlympiadServer({dbPath:path.join(dir,'qa.sqlite'),adminPassword:'isolated-question-clock-admin',storyEnabled:'true',storyAnytimeEntry:'true',attemptIdSecret:'isolated-question-clock-identity-secret'});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
 const store=require('../src/store'),base=`http://127.0.0.1:${server.address().port}`,token='isolated_question_clock_participant_token';
 async function api(route,body){const response=await fetch(base+route,{method:body?'POST':'GET',headers:{'X-Attempt-Token':token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});assert.equal(response.status,route.endsWith('/start')?201:200);return (await response.json()).data;}
 const first=await api('/api/public/attempts/start',{participant:{fullName:'Проверочный Участник',institution:'Изолированный стенд',groupName:'Время'}}),prefix='/api/public/attempts/'+first.id;
 assert.ok(first.timing.questionRemainingMs>28000&&first.timing.questionRemainingMs<=30000);
 let saved=await store.loadAttemptById(first.id);const variant=structuredClone(saved.variant),q1=variant.questions[0],q2=variant.questions[1];
 saved.questionLog[q1.id].availableAt=new Date(Date.now()-30010).toISOString();await store.upsertAttempt(saved);
 const advanced=await api(prefix+'/current');assert.equal(advanced.currentQuestion.id,q2.id);assert.equal(advanced.progress.answeredCount,0);assert.ok(advanced.timing.questionRemainingMs>28000);
 const late=await api(prefix+'/answer',{questionId:q1.id,answerPayload:{selectedOptionId:q1.options.find(o=>o.isCorrect).id}});assert.equal(late.answerReceipt.saved,false);assert.equal(late.currentQuestion.id,q2.id);
 const answer={questionId:q2.id,answerPayload:{selectedOptionId:q2.options.find(o=>o.isCorrect).id}},confirmed=await api(prefix+'/answer',answer);assert.equal(confirmed.answerReceipt.saved,true);
 const duplicate=await api(prefix+'/answer',answer);assert.equal(duplicate.progress.answeredCount,1);assert.equal(duplicate.answerReceipt.saved,true);
 saved=await store.loadAttemptById(first.id);const q3=variant.questions[2];saved.questionLog[q3.id].availableAt=new Date(Date.now()-90010).toISOString();await store.upsertAttempt(saved);
 const blackout=await api(prefix+'/current');assert.equal(blackout.currentQuestion.id,variant.questions[5].id);assert.equal(blackout.progress.answeredCount,1);assert.ok(blackout.timing.questionRemainingMs>28000);
 const restored=await api(prefix+'/current');assert.equal(restored.currentQuestion.id,blackout.currentQuestion.id);assert.ok(restored.timing.questionRemainingMs<=blackout.timing.questionRemainingMs);
 saved=await store.loadAttemptById(first.id);saved.questionLog[variant.questions[5].id].availableAt=new Date(Date.now()-150010).toISOString();await store.upsertAttempt(saved);
 const nextTour=await api(prefix+'/current');assert.equal(nextTour.currentTour.code,'T2');assert.equal(nextTour.currentQuestion.id,variant.questions[10].id);assert.ok(nextTour.timing.questionRemainingMs>28000&&nextTour.timing.questionRemainingMs<=30000);
 saved=await store.loadAttemptById(first.id);assert.equal(Object.keys(saved.answers).length,1);assert.equal(saved.answers[q1.id],undefined);assert.equal(JSON.stringify(saved.variant),JSON.stringify(variant));
 const legacy=structuredClone(saved);legacy.id='attempt_legacy_question_clock';legacy.currentStepIndex=0;legacy.variant=require('../src/story-result').freezeStoryVariant(buildVariant(require('./fixtures/olympiad-menu3'),{seed:'legacy-clock'}),await require('../src/story-runs').getRun(saved.storyRunId));legacy.answers={};legacy.questionLog={[legacy.variant.questions[0].id]:{presentedAt:new Date(Date.now()-60000).toISOString()}};legacy.tourStates={[legacy.variant.tours[0].id]:{startedAt:new Date().toISOString()}};legacy.stateRevision=0;delete legacy._variantStored;await store.upsertAttempt(legacy);
 const old=await api('/api/public/attempts/'+legacy.id+'/current');assert.equal(old.currentQuestion.id,legacy.variant.questions[0].id);assert.equal(old.timing.questionRemainingMs,undefined);assert.equal(old.story.conditionVersion,3);
 const previous=structuredClone(legacy),oldBank=structuredClone(olympiad);delete oldBank.questionTimeLimitSeconds;
 previous.id='attempt_preserved_edition_four';previous.variant=require('../src/story-result').freezeStoryVariant(buildVariant(oldBank,{seed:'issued-old-clock'}),await require('../src/story-runs').getRun(saved.storyRunId));
 previous.expiresAt=new Date(Date.parse(previous.startedAt)+45*60000).toISOString();const previousQ=previous.variant.questions[0];
 previous.questionLog={[previousQ.id]:{availableAt:new Date().toISOString()}};previous.tourStates={[previous.variant.tours[0].id]:{startedAt:new Date().toISOString()}};
 delete previous._variantStored;await store.upsertAttempt(previous);const oldFrozen=JSON.stringify(previous.variant),oldCurrent=await api('/api/public/attempts/'+previous.id+'/current');
 assert.equal(oldCurrent.story.conditionVersion,4);assert.equal(oldCurrent.timing.questionLimitSeconds,36);assert.ok(oldCurrent.timing.questionRemainingMs>34000);
 assert.equal(oldCurrent.expiresAt,previous.expiresAt);assert.equal(JSON.stringify((await store.loadAttemptById(previous.id)).variant),oldFrozen);
 saved.expiresAt=new Date(Date.now()-1).toISOString();await store.upsertAttempt(saved);const finished=await api(prefix+'/current');assert.equal(finished.status,'expired');assert.equal(finished.certificateAvailable,true);
 const certificate=await api(prefix+'/certificate');assert.equal(certificate.summary.totalFinalScore,2);assert.doesNotMatch(JSON.stringify(certificate),/correct|answerPolicy|storyPlates/);
});

test('the issued 45-minute edition keeps its clock and ranks separately from the 30-second edition',()=>{
 const oldBank=structuredClone(olympiad);delete oldBank.questionTimeLimitSeconds;
 const old=buildVariant(oldBank,{seed:'issued-edition-four'}),current=buildVariant(olympiad,{seed:'issued-edition-five'});
 assert.equal(old.conditionVersion,4);assert.equal(old.questionTimingVersion,1);assert.equal(old.durationMinutes,45);
 assert.deepEqual(old.tours.map(t=>old.questions.find(q=>q.tourId===t.id).timeLimitSeconds),[36,72,48,75,300]);
 const saved=JSON.stringify(old),restored=JSON.parse(saved);require('../src/story-dialogue').freezeDialogue(restored);
 assert.equal(JSON.stringify(restored),saved,'restoring old dialogue does not shorten an issued question');
 assert.equal(clock.enabled({variant:restored}),true);assert.equal(clock.enabled({variant:current}),true);
 const group=require('../src/story-dialogue').rankingGroup;
 assert.notEqual(group({storyRunId:'same-day',variant:old}),group({storyRunId:'same-day',variant:current}));
 const profile=require('../src/olympiad-timing').publicTiming(olympiad);
 assert.equal(profile.durationMinutes,18);assert.deepEqual(profile.tours.map(t=>t.timeLimitMinutes),[5,2.5,5,4,1.5]);
 assert.equal(olympiad.durationMinutes,45,'legacy fallback budgets are not mutated by producing the new edition');
});
