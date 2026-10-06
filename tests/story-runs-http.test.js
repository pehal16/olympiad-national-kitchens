const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createOlympiadServer}=require('../olympiad-server');
const runs=require('../src/story-runs');
const store=require('../src/store');
test('D1 story day: protected publication, simultaneous start, per-run identity and hidden terminal results',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'story-http-'));
 const {server,db}=createOlympiadServer({dbPath:path.join(directory,'test.sqlite'),adminPassword:'synthetic-story-admin-password',attemptIdSecret:'synthetic-story-attempt-identity-secret',storyEnabled:'true'});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(directory,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`;let cookie='';
 async function api(url,{method='GET',body,token='',admin=false}={}){const response=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{'X-Attempt-Token':token}:{}),...(admin?{cookie}:{} )},...(body?{body:JSON.stringify(body)}:{})});if(url.endsWith('/login'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,...await response.json()};}
 assert.equal((await api('/api/public/olympiad')).data.story,null);
 assert.equal((await api('/api/admin/story-runs')).status,401);
 await api('/api/admin/login',{method:'POST',body:{password:'synthetic-story-admin-password'}});
 const today=new Date(Date.now()+10800000).toISOString().slice(0,10);
 const created=await api('/api/admin/story-runs',{admin:true,method:'POST',body:{date:today}});assert.equal(created.status,201);const id=created.data.id;
 assert.equal((await api('/api/admin/story-runs',{admin:true,method:'POST',body:{date:today}})).status,409);
 assert.equal((await api(`/api/admin/story-runs/${id}`,{admin:true,method:'PATCH',body:{date:'2099-01-01'}})).status,400);
 assert.equal((await api(`/api/admin/story-runs/${id}/publish`,{admin:true,method:'POST'})).status,409);
 const participant={fullName:'Тестовый Участник Истории',institution:'Тестовый колледж',groupName:'Тестовая группа',mentorName:''},token='synthetic_story_participant_token_2026';
 const starts=await Promise.all(Array.from({length:8},()=>api('/api/public/attempts/start',{method:'POST',body:{participant},token})));
 assert.equal(starts.filter(s=>s.status===201).length,1);assert.equal(new Set(starts.map(s=>s.data?.id)).size,1);
 const attempt=starts[0].data;assert.equal(attempt.story.runId,id);assert.equal(attempt.story.storyVersion,1);assert.equal(Date.parse(attempt.expiresAt)-Date.parse(attempt.startedAt),45*60000);
 const saved=await store.loadAttemptById(attempt.id);assert.equal(saved.variant.blueprintVersion,15);assert.equal(saved.variant.storyVersion,1);assert.equal(saved.variant.questions.length,36);
 const prefix=`/api/public/attempts/${attempt.id}`;
 assert.equal((await api(prefix+'/story-result')).status,401);assert.equal((await api(prefix+'/story-result',{token:'synthetic_foreign_participant_token'})).status,401);
 assert.deepEqual(Object.keys((await api(prefix+'/story-result',{token})).data),['state','entryEndsAt']);
 // Pages exposes writeHead/end, without Node's setHeader method. Exercise that
 // response contract so private result headers work on the deployed adapter.
 const request=require('node:stream').Readable.from([]);request.method='GET';request.headers={'x-attempt-token':token};request.url=prefix+'/story-result';request.socket={remoteAddress:'127.0.0.1'};
 const response={headersSent:false,writeHead(code,headers){this.code=code;this.headers=headers;this.headersSent=true;},end(body){this.body=body;}};
 await require('../server').handleApi(request,response,new URL(base+prefix+'/story-result'));
 assert.equal(response.code,200);assert.equal(response.headers['Cache-Control'],'private, no-store');assert.equal(JSON.parse(response.body).data.state,'waiting');
 const finished=await api(prefix+'/finish',{method:'POST',token,body:{}});assert.equal(finished.status,200);assert.equal(finished.data.summary.totalFinalScore,null);assert.equal(finished.data.story.resultAvailable,false);
 assert.doesNotMatch(JSON.stringify(finished.data),/storyPlates|expectedAnswer|correctIngredientIds|isCorrect/);
 assert.equal((await api(prefix+'/pulse',{token})).data.summary.totalFinalScore,null);
 const run=await runs.getRun(id);run.entryEndsAt=new Date(Date.now()-1000).toISOString();
 db.prepare('UPDATE olympiad_story_runs SET entry_ends_at=?,payload_json=? WHERE id=?').bind(run.entryEndsAt,JSON.stringify(run),id).run();
 const publication=await api(`/api/admin/story-runs/${id}/publish`,{admin:true,method:'POST'});assert.equal(publication.status,200);
 const again=await api(`/api/admin/story-runs/${id}/publish`,{admin:true,method:'POST'});assert.equal(again.data.publishedAt,publication.data.publishedAt);
 const result=await api(prefix+'/story-result',{token});assert.equal(result.data.state,'published');assert.equal(result.data.plates.length,0);
 assert.equal((await api(prefix+'/current',{token})).data.summary.totalFinalScore,0);
 assert.equal((await api('/api/public/attempts/start',{method:'POST',token,body:{participant:{...participant,fullName:'Второй Тестовый Участник'}}})).status,403);
 // Reuse a new synthetic day, same participant, never blocked by prior or legacy completion.
 const next=await runs.createRun('2099-01-01');next.entryStartsAt=new Date(Date.now()-1000).toISOString();next.entryEndsAt=new Date(Date.now()+600000).toISOString();
 db.prepare('UPDATE olympiad_story_runs SET entry_starts_at=?,entry_ends_at=?,payload_json=? WHERE id=?').bind(next.entryStartsAt,next.entryEndsAt,JSON.stringify(next),next.id).run();
 const second=await api('/api/public/attempts/start',{method:'POST',body:{participant},token});assert.equal(second.status,201);assert.notEqual(second.data.id,attempt.id);
 next.entryEndsAt=new Date(Date.now()-1).toISOString();db.prepare('UPDATE olympiad_story_runs SET entry_ends_at=?,payload_json=? WHERE id=?').bind(next.entryEndsAt,JSON.stringify(next),next.id).run();
 assert.equal((await api(`/api/admin/story-runs/${next.id}/publish`,{method:'POST',admin:true})).status,409);
 const preserved=await api(`/api/public/attempts/${second.data.id}/current`,{token});assert.equal(preserved.data.status,'in_progress');assert.ok(preserved.data.timing.totalRemainingMs>40*60000);
 await api(`/api/public/attempts/${second.data.id}/finish`,{method:'POST',token,body:{}});
 assert.equal((await api(`/api/admin/story-runs/${next.id}/publish`,{method:'POST',admin:true})).status,200);
});
