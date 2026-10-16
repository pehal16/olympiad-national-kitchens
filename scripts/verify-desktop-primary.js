"use strict";
const assert=require('node:assert/strict');
const {PRIMARY_ORIGIN}=require('../src/desktop-primary-relay');
(async()=>{
 const origin=process.argv[2]||'https://olympiad-gkts.pages.dev';
 for(const base of [PRIMARY_ORIGIN,origin]){
  const health=await(await fetch(base+'/api/health',{signal:AbortSignal.timeout(20000)})).json();assert.equal(health.ok,true,base+' health: '+(health.code||health.message||'unavailable'));assert.equal(health.storage,'sqlite');
  const response=await fetch(base+'/api/public/olympiad',{signal:AbortSignal.timeout(20000)}),meta=await response.json();assert.equal(response.status,200);assert.equal(meta.ok,true);assert.equal(meta.data.story.id,'official-2026-10-16');assert.equal(meta.data.story.publishedAt,null);assert.equal(meta.data.questionCount,36);assert.equal(meta.data.recovery,undefined);
 }
 const home=await fetch(origin+'/',{redirect:'manual',signal:AbortSignal.timeout(20000)});assert.equal(home.status,200);
 for(const route of ['/admin.html','/api/admin/participants','/credentials.json'])assert.equal((await fetch(PRIMARY_ORIGIN+route)).status,404);
 const organizer=await fetch(PRIMARY_ORIGIN+'/organizer');assert.equal(organizer.status,200);assert.match(await organizer.text(),/organizer\.js/);
 for(const route of ['/api/organizer/session','/api/organizer/participants','/api/organizer/exports/csv/download'])assert.equal((await fetch(PRIMARY_ORIGIN+route)).status,401);
 const adminRedirect=await fetch(origin+'/admin.html',{redirect:'manual'});assert.equal(adminRedirect.status,307);assert.equal(adminRedirect.headers.get('location'),PRIMARY_ORIGIN+'/organizer');
 console.log('Desktop primary and Pages relay verified without participant writes; official results remain private.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
