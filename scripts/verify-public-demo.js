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
 if(process.argv.includes('--exercise'))await exercise();
}

async function exercise(){
 // main() has already required explicit demonstration metadata on both routes.
 // The college domain is allowed only after that gate, while it serves demo.
 assert.ok(['https://olympiad-gkts.pages.dev','https://olympiad-gkts-demo.pages.dev','https://xn--80aaloaqinm.xn--b1amqadnhd.xn--p1ai'].includes(base)||/^http:\/\/127\.0\.0\.1:\d+$/.test(base),'Anonymous tests are allowed only on a verified demo host or an isolated loopback server');
 const crypto=require('node:crypto'),session=crypto.randomBytes(16).toString('hex'),token=crypto.randomBytes(32).toString('base64url');
 async function api(route,body){const response=await fetch(base+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Demo-Session':session,'X-Attempt-Token':token},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)}),json=await response.json();assert.ok(response.ok,route+' '+response.status+' '+json.message);return json.data;}
 const profile=await api('/api/public/register',{});assert.equal(profile.participant.fullName,'Демонстрационный Участник');
 let view=await api('/api/public/attempts/start',{tourBriefings:true});assert.equal(view.demonstration,true);const prefix='/api/public/attempts/'+view.id;
 for(let i=0;i<36;i++){
  if(view.tourBriefing)view=await api(prefix+'/tour/start',{tourId:view.tourBriefing.tourId});
  const q=view.currentQuestion;assert.ok(q,'Missing demo question '+(i+1));let answerPayload;
  if(q.type==='single_choice')answerPayload={selectedOptionId:q.options[0].id};
  else if(q.type==='bucket_sort')answerPayload={buckets:Object.fromEntries(q.items.map((item,n)=>[item.id,q.buckets[n].id]))};
  else if(q.type==='dish_detective')answerPayload={text:'демонстрация'};
  else {const dish=q.selectedDish;assert.ok(dish?.items?.length>=4,'Missing issued kitchen components');answerPayload={dishId:dish.id,selectedIngredientIds:dish.items.slice(0,4).map(item=>item.id)};}
  view=await api(prefix+'/answer',{questionId:q.id,answerPayload});assert.equal(view.progress.answeredCount,i+1);
  if(i===0)assert.equal((await api(prefix+'/answer',{questionId:q.id,answerPayload})).progress.answeredCount,1);
  if(i%9===0)view=await api(prefix+'/current');
 }
 assert.notEqual(view.status,'in_progress');const certificate=await api(prefix+'/certificate'),table=await api(prefix+'/story-result');
 assert.equal(certificate.demonstration,true);assert.equal(certificate.summary.totalMaxScore,150);assert.equal(table.state,'published');assert.equal(table.demonstration,true);
 const foreign=await fetch(base+prefix+'/certificate',{headers:{'X-Attempt-Token':'incorrect-synthetic-owner-token'},signal:AbortSignal.timeout(30000)});assert.equal(foreign.status,401);
 console.log(JSON.stringify({environment:'live isolated Cloudflare demonstration',answers:36,duplicateAnswerSafe:true,reloadSafe:true,foreignOwnerDenied:true,score:certificate.summary.totalFinalScore,maxScore:150,earnedPlates:table.plates.length,certificateDemonstration:true}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
