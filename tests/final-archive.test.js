"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {createSqliteD1}=require('../src/sqlite-d1');
const {saveFinalArchive}=require('../ops/windows-hosting/lib/final-archive');

test('Windows final archive contains a consistent restorable DB and complete answers, verifies ZIP members and a second private copy', {skip:process.platform!=='win32'}, async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'olympiad-архив-')),state=path.join(root,'state'),local=path.join(root,'local'),cloud=path.join(root,'cloud');
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(state,'desktop-primary'),{recursive:true});fs.mkdirSync(cloud);
 const filename=path.join(state,'desktop-primary/olympiad.sqlite'),db=createSqliteD1(filename),date='2099-01-01T15:00:00.000Z',id='attempt_synthetic-archive';
 const run=require('../src/story-runs').makeRun('2099-01-01');
 db.prepare('INSERT INTO olympiad_story_runs(id,event_date,entry_starts_at,entry_ends_at,stopped,payload_json) VALUES(?,?,?,?,0,?)').bind(run.id,run.date,run.entryStartsAt,run.entryEndsAt,JSON.stringify(run)).run();
 db.prepare("INSERT INTO olympiad_control VALUES('current',?)").bind(run.id).run();
 const attempt={id,storyRunId:run.id,participant:{fullName:'Проверочный Участник',institution:'Изолированный стенд'},status:'reviewed',startedAt:date,finishedAt:date,totalFinalScore:2};
 db.prepare('INSERT INTO attempts(id,payload_json,updated_at,state_revision,access_token_hash,story_run_id) VALUES(?,?,?,1,?,?)').bind(id,JSON.stringify(attempt),date,'synthetic-owner-hash',run.id).run();
 db.prepare('INSERT INTO attempt_variants VALUES(?,?,?)').bind(id,JSON.stringify({questions:[{id:'q1',text:'Сохранённый вариант'}]}),date).run();
 db.prepare('INSERT INTO attempt_answers VALUES(?,?,?,?)').bind(id,'q1',JSON.stringify({answer:{answerPayload:{text:'Сохранённый ответ'},score:2},log:{startedAt:date}}),date).run();db.close();
 const before=fs.readFileSync(filename),result=await saveFinalArchive({stateDirectory:state,localDirectory:local,cloudDirectory:cloud,stage:'after-close',now:new Date(date)});
 assert.equal(result.integrity,'ok');assert.equal(result.cloudQueued,true);assert.equal(result.counts.attempts,1);assert.equal(result.counts.answers,1);
 const zip=fs.readFileSync(result.zip);assert.deepEqual(fs.readFileSync(result.cloudFile),zip);assert.equal(crypto.createHash('sha256').update(zip).digest('hex'),result.zipSha256);
 const folder=result.zip.slice(0,-4),copy=new DatabaseSync(path.join(folder,'olympiad.sqlite'),{readOnly:true});try{assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(copy.prepare('SELECT access_token_hash FROM attempts').get().access_token_hash,'synthetic-owner-hash');assert.equal(copy.prepare('SELECT COUNT(*) n FROM attempt_answers').get().n,1);assert.equal(copy.prepare('SELECT published_at FROM olympiad_story_runs').get().published_at,null);}finally{copy.close();}
 const full=JSON.parse(fs.readFileSync(path.join(folder,'Все попытки и ответы.json'),'utf8'));assert.equal(full.attempts[0].answers.q1.answerPayload.text,'Сохранённый ответ');assert.equal(full.attempts[0].variant.questions[0].text,'Сохранённый вариант');assert.equal(full.attempts[0].questionLog.q1.startedAt,date);assert.doesNotMatch(JSON.stringify(full),/synthetic-owner-hash/);
 assert.deepEqual(fs.readFileSync(filename),before,'Reading and exporting must not mutate the source DB.');
 await assert.rejects(saveFinalArchive({stateDirectory:state,localDirectory:local,cloudDirectory:path.join(root,'missing-cloud'),stage:'before-shutdown',now:new Date(date)}),/local archive is preserved/);
 assert.equal(fs.readdirSync(path.dirname(result.zip)).filter(name=>name.endsWith('.zip')).length,2,'Cloud failure must preserve a verified local archive.');
});
