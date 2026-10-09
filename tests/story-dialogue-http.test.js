const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('new and legacy conditions stay owner-scoped and receive separate ranks and export editions',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'comic-editions-'));
 process.env.EXPORTS_DIR=path.join(dir,'exports');
 const {server}=require('../olympiad-server').createOlympiadServer({dbPath:path.join(dir,'qa.sqlite'),adminPassword:'comic-editions-admin-password',attemptIdSecret:'comic-editions-attempt-identity-secret',storyEnabled:'true',storyAnytimeEntry:'true'});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
 const store=require('../src/store'),base=`http://127.0.0.1:${server.address().port}`;let cookie='';
 async function api(url,token='',body,admin=false){const response=await fetch(base+url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{'X-Attempt-Token':token}:{}),...(admin?{cookie}:{} )},...(body?{body:JSON.stringify(body)}:{})});if(url.endsWith('/login'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,...await response.json()};}
 const people=[];
 for(const [i,name]of ['Первый Старый Участник','Первый Новый Участник','Второй Новый Участник','Участник Старого Меню'].entries()){
  const token='synthetic_comic_edition_participant_token_'+i,started=await api('/api/public/attempts/start',token,{participant:{fullName:name,institution:'Изолированный стенд',groupName:'Редакции',mentorName:''}});assert.equal(started.status,201,started.message);people.push({token,view:started.data});
 }
 const oldOlympiad=structuredClone(require('../data/olympiad'));oldOlympiad.questionBank.tour4Tasks=require('../data/banks/tour4-menu-v2');
 const legacy=await store.loadAttemptById(people[0].view.id);
 legacy.variant=require('../src/story-result').freezeStoryVariant(require('../src/variant').buildVariant(oldOlympiad,{seed:'historical-no-dialogue'}),await require('../src/story-runs').getRun(legacy.storyRunId));
 delete legacy.variant.conditionVersion;delete legacy.variant.dialogueVersion;
 for(const q of legacy.variant.questions){delete q.dialogue;q.scenario=(q.scenario||'').replace(/Страница альбома: [^.]+\./,'').trim();}
 delete legacy._variantStored;await store.upsertAttempt(legacy);
 const menu2=await store.loadAttemptById(people[3].view.id);
 menu2.variant=require('../src/story-result').freezeStoryVariant(require('../src/variant').buildVariant(oldOlympiad,{seed:'historical-menu-2'}),await require('../src/story-runs').getRun(menu2.storyRunId));
 delete menu2._variantStored;await store.upsertAttempt(menu2);const oldMenuBefore=JSON.stringify(menu2.variant);
 assert.equal((await api(`/api/public/attempts/${menu2.id}/current`,people[3].token)).data.story.conditionVersion,2);
 const restored=await api(`/api/public/attempts/${legacy.id}/current`,people[0].token);
 assert.equal(restored.data.story.conditionVersion,1);assert.doesNotMatch(restored.data.currentQuestion.dialogue.line,/Франци|Япони|Грузи|Мексик|Таиланд|Итали|Узбекистан|Испани|США/);assert.doesNotMatch(restored.data.currentQuestion.scenario,/Страница альбома/);
 const newer=people[1],snapshot=await store.loadAttemptById(newer.view.id),q=snapshot.variant.questions[0];
 assert.equal(newer.view.story.conditionVersion,3);assert.match(newer.view.currentQuestion.scenario,/Страница альбома/);assert.deepEqual(newer.view.currentQuestion.dialogue,q.dialogue);
 assert.equal((await api(`/api/public/attempts/${newer.view.id}/current`,people[0].token)).status,401);
 const submitted=await api(`/api/public/attempts/${newer.view.id}/answer`,newer.token,{questionId:q.id,answerPayload:{selectedOptionId:q.options.find(o=>o.isCorrect).id}});assert.equal(submitted.status,200);
 assert.notEqual(submitted.data.currentQuestion.dialogue.line,q.dialogue.line);assert.equal(submitted.data.answerReceipt?.autoScore,undefined);
 for(const p of people){const result=await api(`/api/public/attempts/${p.view.id}/finish`,p.token,{});assert.equal(result.status,200);assert.equal(result.data.summary.totalFinalScore,null);}
 await api('/api/admin/login','',{password:'comic-editions-admin-password'});
 const ranked=(await api('/api/admin/attempts','',null,true)).data;
 assert.equal(ranked.find(a=>a.id===people[0].view.id).rank,1);assert.equal(ranked.find(a=>a.id===people[1].view.id).rank,1);assert.equal(ranked.find(a=>a.id===people[2].view.id).rank,2);
 assert.deepEqual(people.map(p=>ranked.find(a=>a.id===p.view.id).conditionVersion),[1,3,3,2]);
 assert.equal(ranked.find(a=>a.id===people[3].view.id).rank,1);
 const csv=await api('/api/admin/exports/csv','',{},true);assert.equal(csv.status,200);const text=fs.readFileSync(csv.data.filePath,'utf8');assert.match(text,/Редакция условий/);assert.match(text,/Проведение/);
 const stored=await store.loadAttemptById(people[0].view.id);assert.equal(stored.variant.conditionVersion,undefined);assert.equal(stored.variant.questions[0].dialogue,undefined,'reading and finishing never rewrites legacy conditions');
 assert.equal(JSON.stringify((await store.loadAttemptById(menu2.id)).variant),oldMenuBefore,'restoring and finishing preserves the old menu and country clues');
});
