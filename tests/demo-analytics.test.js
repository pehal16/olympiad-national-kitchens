'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createHash}=require('node:crypto');
const {createSqliteD1}=require('../src/sqlite-d1');
const {handleDemoAnalytics,analyticsRoute}=require('../src/demo-analytics');
const {handleDemoRelay,DEMO_ORIGIN}=require('../src/public-demo');
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'demo-counter-')),filename=path.join(dir,'demo.sqlite');
 const db=createSqliteD1(filename,{demoAnalytics:true});t.after(()=>{db.close();fs.rmSync(dir,{recursive:true,force:true});});
 return {db,filename,env:{DB:db,OLYMPIAD_DEMO_MODE:'true'}};
}
const host='https://demo.invalid/api/public/demo/';
function visit(id,session='a'.repeat(32),persistent=true,extra={}){
 return new Request(host+'visit',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-Session':session,...extra},body:JSON.stringify({viewId:id,persistent})});
}
async function stats(env){const r=await handleDemoAnalytics(new Request(host+'statistics'),env);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');return(await r.json()).data;}
test('demo counters deduplicate concurrent deliveries, separate refreshes/browsers and persist a restart',async t=>{
 const {db,filename,env}=fixture(t),first='1'.repeat(32);
 assert.equal((await stats(env)).pageViews,0);
 const replies=await Promise.all(Array.from({length:70},()=>handleDemoAnalytics(visit(first),env)));
 assert.ok(replies.every(r=>r.status===204));
 await handleDemoAnalytics(visit('2'.repeat(32)),env);
 await handleDemoAnalytics(visit('3'.repeat(32),'b'.repeat(32)),env);
 // Same delivery ID under another browser is still a single event.
 await handleDemoAnalytics(visit(first,'c'.repeat(32)),env);
 // Unavailable storage counts page openings without inventing a unique browser.
 await handleDemoAnalytics(visit('4'.repeat(32),'d'.repeat(32),false),env);
 let s=await stats(env);assert.equal(s.pageViews,4);assert.equal(s.uniqueBrowsers,2);assert.equal(s.startedAttempts,0);
 const raw=db.prepare('SELECT * FROM demo_page_views').all().results;
 assert.equal(raw.length,4);assert.ok(raw.every(row=>/^[a-f0-9]{64}$/.test(row.visitor_hash)));
 assert.doesNotMatch(JSON.stringify(raw),new RegExp('a'.repeat(32)));
 const fresh=createSqliteD1(filename,{demoAnalytics:true});
 try{assert.deepEqual(await stats({...env,DB:fresh}),s);}finally{fresh.close();}
});
test('started counter counts saved demo attempts only, after activation, with no names/tokens exposed',async t=>{
 const {db,env}=fixture(t),session='a'.repeat(32),hash=createHash('sha256').update(session).digest('hex');
 await handleDemoAnalytics(visit('1'.repeat(32)),env);
 const start=(offset,demonstration=true,key=hash)=>({demonstration,demoVisitorHash:key,startedAt:new Date(Date.now()+offset).toISOString(),participant:{fullName:'Private Synthetic Name',groupName:'DISPLAY-NAME-MUST-NOT-IDENTIFY-VISITORS'},accessTokenHash:'private-owner-hash'});
 for(const [id,payload] of [['valid',start(1000)],['old',start(-86400000)],['real',start(1000,false)],['not-a-visitor',start(1000,true,'f'.repeat(64))]])db.prepare('INSERT INTO attempts(id,payload_json,updated_at) VALUES(?1,?2,?3)').bind(id,JSON.stringify(payload),new Date().toISOString()).run();
 const s=await stats(env);assert.equal(s.startedAttempts,1);assert.equal(s.uniqueMetric,'persistent_browser');
 assert.doesNotMatch(JSON.stringify(s),/Private|owner|visitor_hash|ДЕМО|valid/);
});
test('counter rejects malformed/oversized writes, unrelated methods and unavailable DB without affecting official storage',async t=>{
 const {env}=fixture(t);
 assert.equal((await handleDemoAnalytics(visit('bad'),env)).status,400);
 assert.equal((await handleDemoAnalytics(visit('1'.repeat(32),'bad'),env)).status,400);
 for(const [body,status] of [['{}',400],['{"viewId":"'+'1'.repeat(32)+'","persistent":true,"fullName":"not stored"}',400],['x'.repeat(513),413]]){
  const req=new Request(host+'visit',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-Session':'a'.repeat(32)},body});
  assert.equal((await handleDemoAnalytics(req,env)).status,status);
 }
 assert.equal((await handleDemoAnalytics(new Request(host+'visit',{method:'POST',body:'simple cross origin form'}),env)).status,415);
 assert.equal((await handleDemoAnalytics(new Request(host+'statistics',{method:'POST'}),env)).status,405);
 assert.equal((await handleDemoAnalytics(new Request(host+'statistics',{method:'HEAD'}),env)).status,200);
 const untouched={prepare(){throw Error('Official database must not be touched');}};
 assert.equal((await handleDemoAnalytics(visit('1'.repeat(32)),{DB:untouched})).status,404);
 assert.equal((await handleDemoAnalytics(new Request(host+'statistics'),{DB:untouched,OLYMPIAD_DEMO_MODE:'true'})).status,503);
 assert.equal((await stats(env)).pageViews,0);
 assert.equal(analyticsRoute('/api/public/attempts/start'),false);
});
test('analytics relay uses only the isolated demo origin, discards credentials and requires no original D1',async()=>{
 const response=await handleDemoRelay(visit('1'.repeat(32),'a'.repeat(32),true,{Cookie:'official-cookie',Authorization:'official-password'}),{OLYMPIAD_PUBLIC_DEMO:'true',DB:{prepare(){throw Error('Archive touched');}}},async(url,options)=>{
  assert.equal(url,DEMO_ORIGIN+'/api/public/demo/visit');assert.equal(options.headers.has('Cookie'),false);assert.equal(options.headers.has('Authorization'),false);
  return new Response(null,{status:204});
 });assert.equal(response.status,204);
});
test('a normal official SQLite adapter does not install the demonstration analytics schema',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'no-demo-counter-')),db=createSqliteD1(path.join(dir,'official.sqlite'));
 try{assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'demo_%'").first().n,0);}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
