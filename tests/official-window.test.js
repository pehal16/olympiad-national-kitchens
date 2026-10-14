'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const runs=require('../src/story-runs');
test('Moscow admission opens at 08:00, closes exactly at 16:00, and keeps a late attempt alive',async t=>{
 const NativeDate=Date;let now=NativeDate.parse('2026-10-16T04:59:59.999Z');
 global.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};
 const old=process.env.OFFICIAL_OLYMPIAD_DATE;process.env.OFFICIAL_OLYMPIAD_DATE='2026-10-16';
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'official-window-'));
 const {server,db}=require('../olympiad-server').createOlympiadServer({dbPath:path.join(dir,'qa.sqlite'),adminPassword:'official-window-test-password',attemptIdSecret:'official-window-test-identity-secret',storyEnabled:true,storyAnytimeEntry:true});
 // Admission is also checked by the database's own clock. Freeze that clock
 // in this fixture only; production keeps SQLite/D1 strftime('now').
 const prepare=db.prepare.bind(db);
 db.prepare=sql=>prepare(sql.replace(/strftime\('%Y-%m-%dT%H:%M:%fZ','now'\)/g,`strftime('%Y-%m-%dT%H:%M:%fZ','${new NativeDate(now).toISOString()}')`));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));global.Date=NativeDate;if(old===undefined)delete process.env.OFFICIAL_OLYMPIAD_DATE;else process.env.OFFICIAL_OLYMPIAD_DATE=old;fs.rmSync(dir,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`,token='official_window_test_owner_token';let cookie='';
 async function api(route,body,status=200){const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Attempt-Token':token,...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const j=await r.json();assert.equal(r.status,status,j.message);if(route.endsWith('/login'))cookie=r.headers.get('set-cookie').split(';')[0];return j.data;}
 const participant={fullName:'Проверочный Участник Ранний',institution:'Изолированный стенд',groupName:'Время'};
 const before=await api('/api/public/olympiad');assert.equal(before.story.entryStartsAt,'2026-10-16T05:00:00.000Z');assert.equal(before.story.entryEndsAt,'2026-10-16T13:00:00.000Z');assert.equal(before.story.entryOpen,false);
 await api('/api/public/attempts/start',{participant},403);
 now=NativeDate.parse('2026-10-16T05:00:00Z');const first=await api('/api/public/attempts/start',{participant},201);
 assert.equal(NativeDate.parse(first.expiresAt)-NativeDate.parse(first.startedAt),1125000);
 now=NativeDate.parse('2026-10-16T12:59:59.999Z');const late=await api('/api/public/attempts/start',{participant:{...participant,fullName:'Проверочный Участник Поздний'}},201);
 assert.equal(late.expiresAt,'2026-10-16T13:18:44.999Z');
 now=NativeDate.parse('2026-10-16T13:00:00Z');assert.equal((await api('/api/public/olympiad')).story.entryOpen,false);
 await api('/api/public/attempts/start',{participant:{...participant,fullName:'Проверочный Участник Закрытого Входа'}},403);
 assert.equal((await api(`/api/public/attempts/${late.id}/current`)).status,'in_progress');
 await api('/api/admin/login',{password:'official-window-test-password'});
 await api(`/api/admin/story-runs/${late.story.runId}/publish`,{},409);
 now=NativeDate.parse('2026-10-16T13:18:45Z');const expired=await api(`/api/public/attempts/${late.id}/current`);assert.equal(expired.status,'expired');assert.equal(expired.certificateAvailable,true);
 const published=await api(`/api/admin/story-runs/${late.story.runId}/publish`,{});assert.ok(published.publishedAt);
});
test('invalid hours are refused and legacy full days retain their bounds',()=>{
 assert.equal(Date.parse(runs.makeRun('2026-10-16').entryEndsAt)-Date.parse(runs.makeRun('2026-10-16').entryStartsAt),86400000);
 for(const window of [{startTime:'16:00',endTime:'09:00'},{startTime:'24:00',endTime:'24:00'},{startTime:'09:99',endTime:'16:00'}])assert.throws(()=>runs.makeRun('2026-10-16','test',window));
});
