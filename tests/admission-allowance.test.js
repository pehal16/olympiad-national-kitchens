const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const runs=require('../src/story-runs'),store=require('../src/store');

test('automatic admission uses a private allowance while all public windows remain announced',()=>{
 const run={...runs.makeRun('2026-10-16','synthetic-window',{startTime:'08:00',endTime:'16:00'}),entryGraceMinutes:120,admissionMode:'auto'};
 const start=Date.parse(run.entryStartsAt),end=runs.admissionEndsAt(run);
 for(const [now,open]of [[start-1,false],[start,true],[Date.parse(run.entryEndsAt),true],[end-1,true],[end,false],[end+1,false]]){
  assert.equal(runs.entryOpen(run,now),open);
  const view=runs.publicRun(run,now);assert.equal(view.entryEndsAt,run.entryEndsAt);assert.equal(view.entryOpen,open);
  assert.equal('entryGraceMinutes' in view,false);
 }
 assert.equal(runs.publicationClosed(run,Date.parse(run.entryEndsAt)),false);
 assert.equal(runs.publicationClosed(run,end-1),false);assert.equal(runs.publicationClosed(run,end),true);
 for(const patch of [{stopped:true},{publishedAt:new Date(start).toISOString()},{admissionMode:'closed'}])assert.equal(runs.entryOpen({...run,...patch},start),false);
 assert.equal(runs.publicationClosed({...run,admissionMode:'open'},end+1),false);
 for(const invalid of [undefined,null,'120',-1,1.5])assert.equal(runs.admissionEndsAt({...run,entryGraceMinutes:invalid}),Date.parse(run.entryEndsAt));
 const story=runs.storyView({storyRunId:run.id,_storyRun:run,variant:{questions:[]}});
 assert.equal(story.entryEndsAt,run.entryEndsAt);assert.equal('entryGraceMinutes' in story,false);
});

test('guarded operational migration, SQL gate and publication preserve attempts and scheduled reset clears allowance',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'admission-allowance-'));
 const {server,db}=require('../olympiad-server').createOlympiadServer({dbPath:path.join(dir,'isolated.sqlite'),storyEnabled:'true',adminPassword:'synthetic-allowance-admin-password',attemptIdSecret:'synthetic-allowance-identity-secret'});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
 const run={...runs.makeRun('2026-10-16','official-2026-10-16',{startTime:'08:00',endTime:'16:00'}),admissionMode:'closed',decorationsDisabled:true};
 db.prepare('INSERT INTO olympiad_story_runs(id,event_date,entry_starts_at,entry_ends_at,payload_json) VALUES(?,?,?,?,?)').bind(run.id,run.date,run.entryStartsAt,run.entryEndsAt,JSON.stringify(run)).run();
 const base=`http://127.0.0.1:${server.address().port}`,token='synthetic_allowance_owner_token_2026';let cookie='';
 async function api(url,{method='GET',body,admin=false}={}){
  const res=await fetch(base+url,{method,headers:{'Content-Type':'application/json','X-Attempt-Token':token,...(admin?{cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(url.endsWith('/login'))cookie=res.headers.get('set-cookie').split(';')[0];return {status:res.status,...await res.json()};
 }
 const profile={fullName:'Проверочный Участник Резерва',institution:'Изолированный стенд',groupName:'ТЕСТ',mentorName:''};
 const start=fullName=>api('/api/public/attempts/start',{method:'POST',body:{participant:{...profile,fullName:fullName||profile.fullName}}});
 await runs.updateRun(run.id,{admissionMode:'open'});const first=await start();assert.equal(first.status,201);
 const saved=await store.loadAttemptById(first.data.id),q=saved.variant.questions[0];
 await api(`/api/public/attempts/${saved.id}/answer`,{method:'POST',body:{questionId:q.id,answerPayload:{selectedOptionId:q.options.find(o=>o.isCorrect).id}}});
 await runs.updateRun(run.id,{admissionMode:'closed'});
 const tables=['attempts','attempt_variants','attempt_answers'],snapshot=()=>tables.map(table=>db.prepare('SELECT * FROM '+table+' ORDER BY 1').all().results);
 const before=snapshot(),migration=fs.readFileSync(path.join(__dirname,'../migrations/0011_official_automatic_admission.sql'),'utf8');
 const migrate=()=>db.batch(migration.split(';').map(s=>s.trim()).filter(Boolean).map(sql=>db.prepare(sql)));
 migrate();assert.deepEqual(snapshot(),before);
 let current=await runs.currentRun();assert.equal(current.id,run.id);assert.equal(current.admissionMode,'auto');assert.equal(current.entryGraceMinutes,120);assert.equal(current.entryEndsAt,run.entryEndsAt);assert.equal(current.decorationsDisabled,true);
 const publishView=runs.publicRun(current);assert.equal('entryGraceMinutes' in publishView,false);
 const empty=await runs.createRun('2099-02-01'),emptyEnd=new Date(Date.now()-60000).toISOString();
 db.prepare('UPDATE olympiad_story_runs SET entry_ends_at=?,payload_json=? WHERE id=?').bind(emptyEnd,JSON.stringify({...empty,entryEndsAt:emptyEnd,entryGraceMinutes:120}),empty.id).run();
 await assert.rejects(runs.publishRun(empty.id),/после закрытия/,'Allowance alone prevents premature publication even without active attempts');
 db.prepare('UPDATE olympiad_story_runs SET payload_json=json_set(payload_json,\'$.entryGraceMinutes\',0) WHERE id=?').bind(empty.id).run();
 assert.ok((await runs.publishRun(empty.id)).publishedAt);
 // The exact boundary expression is shared by atomic starts and publication.
 const bound=runs.admissionEndsAt(current);
 for(const [now,open]of [[bound-1,true],[bound,false],[bound+1,false]])assert.equal(Boolean(db.prepare(`SELECT ${runs.admissionEndSql()}>julianday(?) AS open FROM olympiad_story_runs WHERE id=?`).bind(new Date(now).toISOString(),run.id).first().open),open);
 const shift=(nominalEnd,grace=120)=>{
  current={...current,entryStartsAt:new Date(Date.now()-4*3600000).toISOString(),entryEndsAt:new Date(nominalEnd).toISOString(),entryGraceMinutes:grace};
  db.prepare('UPDATE olympiad_story_runs SET entry_starts_at=?,entry_ends_at=?,payload_json=? WHERE id=?').bind(current.entryStartsAt,current.entryEndsAt,JSON.stringify(current),run.id).run();
 };
 shift(Date.now()-60000);assert.equal((await api('/api/public/olympiad')).data.story.entryOpen,true);
 const late=await start('Поздний Проверочный Участник');assert.equal(late.status,201,'Atomic SQL accepts within allowance');
 assert.equal((await api(`/api/public/attempts/${late.data.id}/story-result`)).data.entryEndsAt,current.entryEndsAt);
 await assert.rejects(runs.publishRun(run.id),/после закрытия/);
 shift(Date.now()-121*60000);assert.equal((await api('/api/public/olympiad')).data.story.entryOpen,false);
 assert.equal((await start('Закрытый Проверочный Участник')).status,403);
 assert.equal((await store.createAttemptAtomic({...saved,id:'synthetic-stale-window'})).entryClosed,true,'Atomic SQL rejects stale open snapshot');
 assert.equal((await start()).status,200,'Existing owner still resumes');
 await assert.rejects(runs.publishRun(run.id),/завершения всех попыток/);
 for(const id of [first.data.id,late.data.id]){
  assert.equal((await api(`/api/public/attempts/${id}/finish`,{method:'POST',body:{}})).status,200);
  assert.equal((await api(`/api/public/attempts/${id}/certificate`)).status,200);
 }
 const retained=await store.loadAttemptById(saved.id);assert.equal(retained.expiresAt,saved.expiresAt);assert.equal(JSON.stringify(retained.variant),JSON.stringify(saved.variant));assert.ok(retained.answers[q.id]);
 await api('/api/admin/login',{method:'POST',body:{password:'synthetic-allowance-admin-password'}});
 const window={entryStartsAt:'2099-01-01T05:00:00.000Z',entryEndsAt:'2099-01-01T13:00:00.000Z'};
 assert.equal((await api(`/api/admin/story-runs/${run.id}/schedule`,{method:'PATCH',body:window,admin:true})).status,200);
 assert.equal((await runs.getRun(run.id)).entryGraceMinutes,0,'Saving a new schedule never silently retains allowance');
 current=await runs.getRun(run.id);shift(Date.now()-60000,0);await runs.publishRun(run.id);
 const published=await runs.getRun(run.id);migrate();assert.deepEqual(await runs.getRun(run.id),published,'Migration cannot change a rescheduled run');
 db.prepare('UPDATE olympiad_story_runs SET event_date=?,entry_starts_at=?,entry_ends_at=?,payload_json=? WHERE id=?').bind(run.date,run.entryStartsAt,run.entryEndsAt,JSON.stringify(run),run.id).run();
 const protectedRun=await runs.getRun(run.id);migrate();assert.deepEqual(await runs.getRun(run.id),protectedRun,'Matching original bounds still cannot reopen a published run');
});
