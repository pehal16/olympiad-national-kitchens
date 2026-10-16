"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {createSqliteD1}=require('../src/sqlite-d1'),{openMirror,syncOnce}=require('../ops/windows-hosting/lib/desktop-mirror-store');
const {handleMirrorRequest}=require('../src/desktop-mirror-endpoint'),{restoreDesktopMirror}=require('../scripts/restore-desktop-mirror');
const {backupPrimaryOnce}=require('../ops/windows-hosting/lib/desktop-primary-backup');
const {handleDesktopPrimary,PRIMARY_ORIGIN}=require('../src/desktop-primary-relay');

test('mirror recovery keeps exact rows, frozen variants, owner hash and schedule in a new independent DB; local snapshots preserve new writes',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'desktop-primary-')),cloudPath=path.join(dir,'cloud.sqlite'),cloud=createSqliteD1(cloudPath),local=path.join(dir,'mirror'),mirror=openMirror(local);
 t.after(()=>{mirror.close();cloud.close();fs.rmSync(dir,{recursive:true,force:true});});
 const run=require('../src/story-runs').makeRun('2099-01-01'),id='synthetic-preserved-attempt',date='2099-01-01T05:00:00.000Z',olympiadId=require('../data/olympiad').id;
 cloud.prepare('INSERT INTO olympiad_story_runs(id,event_date,entry_starts_at,entry_ends_at,stopped,payload_json) VALUES(?,?,?,?,0,?)').bind(run.id,run.date,run.entryStartsAt,run.entryEndsAt,JSON.stringify(run)).run();
 cloud.prepare("INSERT INTO olympiad_control VALUES('current',?)").bind(run.id).run();
 const attempt={id,olympiadId,storyRunId:run.id,participant:{fullName:'Проверочный Участник',institution:'Изолированный стенд',groupName:'ТЕСТ'},status:'reviewed',startedAt:date,expiresAt:'2099-01-01T05:36:00.000Z',totalFinalScore:2};
 cloud.prepare('INSERT INTO attempts(id,payload_json,updated_at,state_revision,access_token_hash,story_run_id) VALUES(?,?,?,7,?,?)').bind(id,JSON.stringify(attempt),date,'synthetic-unchanged-owner-hash',run.id).run();
 cloud.prepare('INSERT INTO attempt_variants VALUES(?,?,?)').bind(id,JSON.stringify({questions:[{id:'q1',privateKey:'frozen-key'}]}),date).run();
 cloud.prepare('INSERT INTO attempt_answers VALUES(?,?,?,?)').bind(id,'q1',JSON.stringify({answer:{answerPayload:{text:'неизменный ответ'},score:2}}),date).run();
 cloud.prepare('INSERT INTO olympiad_attempt_events VALUES(?,?,?,?,?,?)').bind(id,'event1','synthetic',JSON.stringify({event:'saved'}),date,date).run();
 const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519'),env={DB:cloud,DESKTOP_MIRROR_PUBLIC_KEY:publicKey.export({type:'spki',format:'der'}).toString('base64')};
 await syncOnce({database:mirror,directory:local,privateKey,fetcher:(url,options)=>handleMirrorRequest(new Request(url,options),env)});
 const target=path.join(dir,'primary.sqlite'),receipt=restoreDesktopMirror(path.join(local,'cloud-results.sqlite'),target);
 assert.equal(receipt.integrity,'ok');assert.equal(receipt.attempts,1);assert.equal(receipt.variants,1);assert.equal(receipt.answerRows,1);assert.equal(receipt.events,1);assert.equal(receipt.currentRunId,run.id);
 const primary=new DatabaseSync(target);try{
  for(const table of ['attempts','attempt_variants','attempt_answers','olympiad_attempt_events','olympiad_story_runs','olympiad_control'])assert.deepEqual(primary.prepare('SELECT * FROM '+table).all(),cloud.prepare('SELECT * FROM '+table).all().results,table);
  assert.throws(()=>restoreDesktopMirror(path.join(local,'cloud-results.sqlite'),target),/already exists/);
  const exportDir=path.join(dir,'exports');let backup=await backupPrimaryOnce({filename:target,directory:exportDir,now:()=>date});assert.equal(backup.counts.answers,1);assert.ok(fs.existsSync(backup.lastBackup));
  const count=fs.readdirSync(path.join(exportDir,'snapshots')).length;
  backup=await backupPrimaryOnce({filename:target,directory:exportDir,previous:backup,now:()=>date});assert.equal(fs.readdirSync(path.join(exportDir,'snapshots')).length,count);
  primary.prepare('INSERT INTO attempt_answers VALUES(?,?,?,?)').run(id,'q2',JSON.stringify({answer:{answerPayload:{text:'новый ответ'},score:0}}),'2099-01-01T05:01:00.000Z');
  backup=await backupPrimaryOnce({filename:target,directory:exportDir,previous:backup,now:()=> '2099-01-01T05:05:00.000Z'});assert.equal(backup.counts.answers,2);
  const copy=new DatabaseSync(backup.lastBackup,{readOnly:true});try{assert.equal(copy.prepare('SELECT COUNT(*) n FROM attempt_answers').get().n,2);}finally{copy.close();}
  assert.equal(cloud.prepare('SELECT COUNT(*) n FROM attempt_answers').first().n,1);assert.equal(JSON.parse(mirror.prepare('SELECT bundle_json FROM mirror_attempts').get().bundle_json).answers.length,1);
  const json=fs.readFileSync(path.join(exportDir,'results.json'),'utf8');assert.doesNotMatch(json,/privateKey|owner-hash|frozen-key/);
 }finally{primary.close();}
 mirror.prepare("UPDATE mirror_attempts SET sha256='corrupted'").run();assert.throws(()=>restoreDesktopMirror(path.join(local,'cloud-results.sqlite'),path.join(dir,'bad.sqlite')),/checksum/);assert.equal(fs.existsSync(path.join(dir,'bad.sqlite')),false);
});

test('Pages relay forwards owner-scoped writes only to the fixed desktop origin, without cookies or fallback to old D1',async()=>{
 const env={OLYMPIAD_STORAGE_MODE:'desktop-primary',DB:{prepare(){throw Error('must never read D1');}}},calls=[];
 const request=new Request('https://olympiad-gkts.pages.dev/api/public/attempts/synthetic/answer?one=1',{method:'POST',headers:{'X-Attempt-Token':'synthetic-owner','Content-Type':'application/json',Cookie:'admin=never-forward',Authorization:'never-forward'},body:'{"answerPayload":{"text":"Тест"}}'});
 const r=await handleDesktopPrimary(request,env,async(url,options)=>{calls.push({url,options});return new Response('{"ok":true}',{headers:{'Content-Type':'application/json'}});});
 assert.equal(r.status,200);assert.equal(calls.length,1);assert.equal(calls[0].url,PRIMARY_ORIGIN+'/api/public/attempts/synthetic/answer?one=1');assert.equal(calls[0].options.headers.get('X-Attempt-Token'),'synthetic-owner');assert.equal(calls[0].options.headers.has('cookie'),false);assert.equal(calls[0].options.headers.has('authorization'),false);assert.equal(new TextDecoder().decode(calls[0].options.body),'{"answerPayload":{"text":"Тест"}}');assert.equal(calls[0].options.redirect,'error');
 assert.equal((await handleDesktopPrimary(new Request('https://olympiad-gkts.pages.dev/api/admin/story-runs/official/publish',{method:'POST'}),env)).status,503);
 assert.equal((await handleDesktopPrimary(new Request('https://olympiad-gkts.pages.dev/api/desktop-mirror'),env)).status,410);
 assert.equal((await handleDesktopPrimary(new Request('https://olympiad-gkts.pages.dev/'),env)).headers.get('location'),PRIMARY_ORIGIN+'/');
 assert.equal((await handleDesktopPrimary(new Request('https://olympiad-gkts.pages.dev/api/public/attempts/synthetic/answer',{method:'POST',body:'{}'}),env,async()=>{throw Error('network');})).status,502);
 assert.equal(await handleDesktopPrimary(request,{}),null);
});

test('desktop primary launcher fails closed without restored DB and refuses simultaneous cloud relay configuration',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'primary-config-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const {trialPaths,activeDatabasePaths}=require('../scripts/windows-trial'),paths=trialPaths(dir);
 fs.writeFileSync(path.join(dir,'hosting-settings.json'),JSON.stringify({storageMode:'desktop-primary'}));assert.throws(()=>activeDatabasePaths(paths),/missing/);
 fs.mkdirSync(path.join(dir,'desktop-primary'));fs.writeFileSync(path.join(dir,'desktop-primary/olympiad.sqlite'),'placeholder');assert.equal(activeDatabasePaths(paths).database,path.join(dir,'desktop-primary/olympiad.sqlite'));
 fs.writeFileSync(path.join(dir,'hosting-settings.json'),JSON.stringify({storageMode:'desktop-primary',publicApiOrigin:'https://olympiad-gkts.pages.dev'}));assert.throws(()=>activeDatabasePaths(paths),/cannot relay/);
});

test('Pages routing and deployment activate the desktop guard before D1, without applying old-cloud migrations in desktop mode',()=>{
 const root=path.join(__dirname,'..'),routes=JSON.parse(fs.readFileSync(path.join(root,'public/_routes.json')));
 for(const route of ['/api/*','/','/admin','/admin.html','/certificate.html'])assert.ok(routes.include.includes(route),route);
 const worker=fs.readFileSync(path.join(root,'src/cloudflare/worker.js'),'utf8');assert.ok(worker.indexOf('handleDesktopPrimary(request, env)')<worker.indexOf("if (url.pathname === '/api/desktop-mirror')"));
 const workflow=fs.readFileSync(path.join(root,'.github/workflows/deploy-cloudflare.yml'),'utf8');
 for(const name of ['Ensure Cloudflare resources','Apply D1 migrations','Configure Pages secrets','Verify production'])assert.match(workflow,new RegExp('name: '+name+"\\r?\\n        if: steps.hosting.outputs.desktop_primary != 'true'"));
 assert.match(workflow,/node scripts\/verify-desktop-primary\.js/);
});
