"use strict";
const assert=require('node:assert/strict');
const base=String(process.argv[2]||'https://olympiad-gkts.pages.dev').replace(/\/+$/,'');
async function main(){
 for(const route of ['/api/health','/api/public/olympiad']){
  const response=await fetch(base+route,{signal:AbortSignal.timeout(30000)}),body=await response.json();
  assert.equal(response.status,200,route);assert.equal(body.ok,true,route);
  assert.equal(route.endsWith('/health')?body.demonstration:body.data.demonstration,true,'Must be explicitly a demonstration');
  if(body.data){assert.equal(body.data.questionCount,36);assert.equal(body.data.story.entryOpen,true);assert.equal(body.data.story.entryMode,'anytime');assert.equal(body.data.recovery,undefined,'No transfer to the switched-off college PC');}
 }
 console.log('Public demonstration is online independently of the college PC: '+base);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
