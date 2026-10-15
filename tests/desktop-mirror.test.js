"use strict";
const test = require('node:test'), assert = require('node:assert/strict');
const crypto = require('node:crypto'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { createSqliteD1 } = require('../src/sqlite-d1');
const { handleMirrorRequest } = require('../src/desktop-mirror-endpoint');
const { signedHeaders, ENDPOINT } = require('../ops/windows-hosting/lib/mirror-protocol');
const { openMirror, syncOnce } = require('../ops/windows-hosting/lib/desktop-mirror-store');
const { createNetworkFetch } = require('../ops/windows-hosting/lib/desktop-network-fetch');
const olympiadId = require('../data/olympiad').id, origin = 'https://olympiad-gkts.pages.dev';
function setup(t) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'olympiad-mirror-')), local=path.join(directory,'local');
  const cloud=createSqliteD1(path.join(directory,'cloud.sqlite')), database=openMirror(local);
  const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
  const env={DB:cloud,DESKTOP_MIRROR_PUBLIC_KEY:publicKey.export({type:'spki',format:'der'}).toString('base64')};
  t.after(()=>{database.close();cloud.close();fs.rmSync(directory,{recursive:true,force:true});});
  const fetcher=(url,options)=>handleMirrorRequest(new Request(url,options),env);
  return {directory:local,cloud,database,privateKey,env,fetcher};
}
function seed(cloud,id='attempt-a',type=olympiadId,revision=0) {
  const date=`2026-10-15T00:00:0${revision}.000Z`,payload={id,olympiadId:type,participant:{fullName:'Технический Участник',institution:'Изолированный тест',groupName:'ТЕСТ'},status:'reviewed',totalFinalScore:20+revision,totalMaxScore:150};
  cloud.prepare('INSERT INTO attempts(id,payload_json,updated_at,state_revision) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json,updated_at=excluded.updated_at,state_revision=excluded.state_revision').bind(id,JSON.stringify(payload),date,revision).run();
  cloud.prepare('INSERT INTO attempt_variants VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json,updated_at=excluded.updated_at').bind(id,JSON.stringify({questions:[{id:'q1',answer:'private grading key'}]}),date).run();
  cloud.prepare('INSERT INTO attempt_answers VALUES(?,?,?,?) ON CONFLICT(attempt_id,question_id) DO UPDATE SET payload_json=excluded.payload_json,updated_at=excluded.updated_at').bind(id,'q1',JSON.stringify({answer:{text:'Тестовый ответ',score:revision}}),date).run();
}
test('mirror rejects anonymous, expired, changed URL, other key and non-GET before any database query',async t=>{
  const s=setup(t), url=origin+ENDPOINT+'?view=manifest'; let queries=0;
  const env={...s.env,DB:{prepare(){queries++;throw Error('must not query');}}};
  const valid=signedHeaders(url,s.privateKey), other=crypto.generateKeyPairSync('ed25519').privateKey;
  for(const request of [new Request(url),new Request(url,{headers:signedHeaders(url,s.privateKey,Date.now()-600000)}),new Request(url+'&after=changed',{headers:valid}),new Request(url,{headers:signedHeaders(url,other)}),new Request(url,{method:'POST',headers:valid})])assert.equal((await handleMirrorRequest(request,env)).status,401);
  assert.equal(queries,0);assert.equal((await handleMirrorRequest(new Request(url),{DB:s.cloud})).status,404);
});
test('signed read exports exact olympiad snapshot and excludes PM01, sessions and passwords',async t=>{
  const s=setup(t);seed(s.cloud);seed(s.cloud,'pm01-attempt','pm01-exam');
  s.cloud.prepare('INSERT INTO admin_sessions VALUES(?,?,?)').bind('admin-token',JSON.stringify({password:'never export this'}),'now').run();
  const manifest=await (await s.fetcher(origin+ENDPOINT,{headers:signedHeaders(origin+ENDPOINT,s.privateKey)})).json();
  assert.deepEqual(manifest.entries.map(e=>e.id),['attempt-a']);
  for(const [id,status] of [['attempt-a',200],['pm01-attempt',404]]){
    const url=origin+ENDPOINT+'?view=attempt&id='+id,response=await s.fetcher(url,{headers:signedHeaders(url,s.privateKey)});
    assert.equal(response.status,status);assert.match(response.headers.get('cache-control'),/no-store/);
    const text=await response.text();assert.doesNotMatch(text,/admin-token|never export this/);
    if(status===200){const bundle=JSON.parse(text);assert.equal(bundle.answers.length,1);assert.equal(JSON.parse(bundle.variant.payload_json).questions[0].answer,'private grading key');}
  }
  assert.equal(s.cloud.prepare('SELECT count(*) AS n FROM attempts').first().n,2);
});
test('restart and repeated pulls preserve exact answers without duplicates, with readable private results and verified snapshot',async t=>{
  const s=setup(t);seed(s.cloud);
  const first=await syncOnce(s);assert.equal(first.changed,1);assert.deepEqual(first.counts,{attempts:1,finished:1,answers:1});
  assert.equal((await syncOnce(s)).changed,0);assert.equal(s.database.prepare('SELECT count(*) AS n FROM mirror_attempts').get().n,1);
  assert.equal(fs.readdirSync(path.join(s.directory,'snapshots')).length,1);assert.match(fs.readFileSync(path.join(s.directory,'Результаты.csv'),'utf8'),/Технический Участник/);
  const sha=s.database.prepare('SELECT sha256,bundle_json FROM mirror_attempts').get();assert.equal(crypto.createHash('sha256').update(sha.bundle_json).digest('hex'),sha.sha256);
  const second=openMirror(s.directory);try{assert.equal(second.prepare('SELECT count(*) AS n FROM mirror_attempts').get().n,1);}finally{second.close();}
});
test('offline then catch-up keeps old local data, retries changed cloud rows, and preserves cloud deletions as archive',async t=>{
  const s=setup(t);seed(s.cloud);await syncOnce(s);const old=s.database.prepare('SELECT fingerprint FROM mirror_attempts').get().fingerprint;
  seed(s.cloud,'attempt-a',olympiadId,1);seed(s.cloud,'attempt-b');
  await assert.rejects(()=>syncOnce({...s,fetcher:async()=>{throw Error('offline');}}),/offline/);
  assert.equal(s.database.prepare('SELECT fingerprint FROM mirror_attempts').get().fingerprint,old);
  const result=await syncOnce(s);assert.equal(result.changed,2);assert.equal(result.counts.answers,2);
  s.cloud.prepare('DELETE FROM attempts WHERE id=?').bind('attempt-b').run();
  const retained=await syncOnce(s);assert.equal(retained.cloudAttempts,1);assert.equal(retained.counts.attempts,2);
});
test('partial interrupted download does not acknowledge unsaved rows; later poll copies all rows',async t=>{
  const s=setup(t);for(let i=0;i<4;i++)seed(s.cloud,'a-'+i);let failed=false;
  await assert.rejects(()=>syncOnce({...s,fetcher:async(url,options)=>{if(new URL(url).searchParams.get('id')==='a-1'&&!failed){failed=true;throw Error('connection lost');}return s.fetcher(url,options);}}),/connection lost/);
  const result=await syncOnce(s);assert.equal(result.counts.attempts,4);assert.equal(result.counts.answers,4);
});
test('manifest pagination copies more than one page without skipping or duplicating attempts',async t=>{
  const s=setup(t);for(let i=0;i<103;i++)seed(s.cloud,'page-'+String(i).padStart(3,'0'));
  const result=await syncOnce(s);assert.equal(result.cloudAttempts,103);assert.equal(result.counts.attempts,103);assert.equal(result.counts.answers,103);
});
test('network path falls back without changing method, token or body, remembers success and observes proxy removal',async()=>{
  let proxy='http://127.0.0.1:10809';const calls=[];
  const fetcher=createNetworkFetch({getProxy:()=>proxy,request:async(url,options,agent)=>{calls.push({route:agent.proxy?'proxy':'direct',options});if(agent.proxy)throw Error('proxy down');return new Response('{"ok":true}',{status:200});}});
  try{
    const options={method:'POST',headers:{'X-Attempt-Token':'synthetic-owner'},body:Buffer.from('{"answer":1}')};
    assert.equal((await fetcher(origin+'/api/public/attempts/a/answer',options)).status,200);assert.deepEqual(calls.map(c=>c.route),['proxy','direct']);assert.equal(calls[0].options,calls[1].options);
    await fetcher(origin+'/api/health');assert.equal(calls.at(-1).route,'direct');proxy=null;await fetcher(origin+'/api/health');assert.equal(fetcher.lastTransport,'direct');
    await assert.rejects(()=>fetcher('https://unrelated.example/api/health'),/Unsupported/);
  }finally{fetcher.close();}
});
