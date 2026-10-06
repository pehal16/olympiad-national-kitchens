const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createOlympiadServer}=require('../olympiad-server');
const runs=require('../src/story-runs'),store=require('../src/store');

test('anytime entry: one automatic run, full 45 minutes, stop/resume and protected publication',async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'story-anytime-'));
  const {server,db}=createOlympiadServer({dbPath:path.join(directory,'test.sqlite'),adminPassword:'synthetic-anytime-admin-password',attemptIdSecret:'synthetic-anytime-attempt-identity-secret',storyEnabled:'true',storyAnytimeEntry:'true'});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(directory,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${server.address().port}`;let cookie='';
  async function api(url,{method='GET',body,token='',admin=false}={}){
    const response=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{'X-Attempt-Token':token}:{}),...(admin?{cookie}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    if(url.endsWith('/login'))cookie=response.headers.get('set-cookie').split(';')[0];
    return {status:response.status,...await response.json()};
  }
  // A future official date must not block the requested free entry today.
  await runs.createRun('2099-01-01');
  const visits=await Promise.all(Array.from({length:12},()=>api('/api/public/olympiad')));
  const run=visits[0].data.story,id=run.id;
  assert.equal(run.entryMode,'anytime');assert.equal(run.date,null);
  assert.equal(run.entryStartsAt,null);assert.equal(run.entryEndsAt,null);assert.equal(run.entryOpen,true);
  assert.ok(visits.every(v=>v.data.story.id===id));assert.equal((await runs.listRuns()).filter(r=>r.entryMode==='anytime').length,1);
  assert.equal(runs.entryOpen(await runs.getRun(id),Date.parse('2098-12-31T23:59:59Z')),true);
  await api('/api/admin/login',{method:'POST',body:{password:'synthetic-anytime-admin-password'}});
  assert.equal((await api(`/api/admin/story-runs/${id}/publish`,{method:'POST',admin:true})).status,409,'An open run cannot publish even without attempts');
  const participant={fullName:'Тестовый Участник Свободного Входа',institution:'Тестовый колледж',groupName:'Тестовая группа',mentorName:''},token='synthetic_anytime_owner_access_token_2026';
  assert.equal((await api('/api/public/register',{method:'POST',body:participant})).data.alreadyCompleted,false);
  const start=()=>api('/api/public/attempts/start',{method:'POST',body:{participant},token});
  const starts=await Promise.all(Array.from({length:8},start));
  assert.equal(starts.filter(s=>s.status===201).length,1);assert.equal(new Set(starts.map(s=>s.data?.id)).size,1);
  const attempt=starts[0].data,prefix=`/api/public/attempts/${attempt.id}`;
  assert.equal(attempt.story.runId,id);assert.equal(attempt.story.entryMode,'anytime');
  assert.equal(Date.parse(attempt.expiresAt)-Date.parse(attempt.startedAt),45*60000);
  assert.equal(attempt.summary.totalFinalScore,null);
  const saved=await store.loadAttemptById(attempt.id);
  await api(`/api/admin/story-runs/${id}`,{method:'PATCH',body:{stopped:true},admin:true});
  assert.equal((await api('/api/public/olympiad')).data.story.entryOpen,false);
  // Even a server request holding a stale open-run snapshot cannot insert.
  const rejected=await store.createAttemptAtomic({...saved,id:'synthetic-stale-anytime-start'});
  assert.equal(rejected.entryClosed,true);assert.equal(await store.loadAttemptById('synthetic-stale-anytime-start'),null);
  assert.equal((await start()).status,200,'Existing attempts resume while entry is stopped');
  assert.equal((await api(prefix+'/current',{token})).data.status,'in_progress');
  assert.equal((await api(`/api/admin/story-runs/${id}/publish`,{method:'POST',admin:true})).status,409,'Active attempts prevent publication');
  const other={...participant,fullName:'Другой Тестовый Участник'};
  assert.equal((await api('/api/public/attempts/start',{method:'POST',body:{participant:other},token})).status,403);
  assert.deepEqual((await api(prefix+'/story-result',{token})).data,{state:'waiting',entryEndsAt:null,entryOpen:false});
  await api(`/api/admin/story-runs/${id}`,{method:'PATCH',body:{stopped:false},admin:true});
  assert.equal((await api('/api/public/olympiad')).data.story.entryOpen,true);
  assert.deepEqual((await api(prefix+'/story-result',{token})).data,{state:'waiting',entryEndsAt:null,entryOpen:true});
  const finished=await api(prefix+'/finish',{method:'POST',body:{},token});
  assert.equal(finished.data.summary.totalFinalScore,null);assert.equal(finished.data.story.resultAvailable,false);
  assert.equal((await api(`/api/admin/story-runs/${id}/publish`,{method:'POST',admin:true})).status,409,'Finishing alone does not reveal results');
  await api(`/api/admin/story-runs/${id}`,{method:'PATCH',body:{stopped:true},admin:true});
  const publication=await api(`/api/admin/story-runs/${id}/publish`,{method:'POST',admin:true});assert.equal(publication.status,200);
  assert.equal((await api(`/api/admin/story-runs/${id}/publish`,{method:'POST',admin:true})).data.publishedAt,publication.data.publishedAt);
  assert.equal((await api(prefix+'/story-result',{token})).data.state,'published');
  assert.equal((await api(prefix+'/story-result')).status,401);
  assert.equal((await api('/api/public/register',{method:'POST',body:participant})).data.alreadyCompleted,true);
  assert.equal((await start()).status,403);
  const metadata=(await api('/api/public/olympiad')).data.story;
  assert.equal(metadata.id,id);assert.equal(metadata.entryOpen,false);assert.equal(metadata.publishedAt,publication.data.publishedAt);
  assert.equal((await runs.listRuns()).filter(r=>r.entryMode==='anytime').length,1,'Visits never replace an organizer-closed run');
  // An explicit official day retains priority and its own participant identity.
  const day=await runs.createRun(new Date(Date.now()+10800000).toISOString().slice(0,10));
  assert.equal((await api('/api/public/olympiad')).data.story.id,day.id);
  assert.equal((await start()).status,201);
});
