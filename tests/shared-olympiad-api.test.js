'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('shared participant host delegates to one backend, strips cookies, preserves idempotent state and creates no local attempt',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shared-participant-')),received=[];
 const {server,db}=require('../olympiad-server').createOlympiadServer({dbPath:path.join(dir,'qa.sqlite'),adminPassword:'shared-api-test-password',attemptIdSecret:'shared-api-test-identity-secret-2026',publicApiOrigin:'https://olympiad-gkts.pages.dev',sharedApiFetch:async(url,options)=>{
   received.push({url,options});return new Response(JSON.stringify({ok:true,data:{id:'attempt_shared',progress:{answeredCount:1},expiresAt:'2026-10-16T13:18:44.999Z'}}),{status:200,headers:{'Content-Type':'application/json'}});
 }});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`;
 for(let i=0;i<2;i++){const r=await fetch(base+'/api/public/attempts/attempt_shared/answer',{method:'POST',headers:{'Content-Type':'application/json','X-Attempt-Token':'synthetic_shared_owner_token',Cookie:'admin=should-not-forward'},body:JSON.stringify({questionId:'q1',answerPayload:{text:'Круассан'}})});assert.equal((await r.json()).data.progress.answeredCount,1);assert.match(r.headers.get('cache-control'),/no-store/);}
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM attempts').first().n,0);
 assert.ok(received.every(r=>r.url==='https://olympiad-gkts.pages.dev/api/public/attempts/attempt_shared/answer'&&r.options.headers.Cookie===undefined&&r.options.headers['X-Attempt-Token']==='synthetic_shared_owner_token'));
 const admin=await fetch(base+'/admin.html',{redirect:'manual'});assert.equal(admin.status,302);assert.equal(admin.headers.get('location'),'https://olympiad-gkts.pages.dev/admin.html');
 assert.equal((await fetch(base+'/api/public/pm01')).status,404);
});
