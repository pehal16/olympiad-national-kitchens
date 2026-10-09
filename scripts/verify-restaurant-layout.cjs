/* Real browser acceptance on isolated local SQLite; no production participants. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {createOlympiadServer}=require('../olympiad-server'),store=require('../src/store'),runs=require('../src/story-runs');
const output=path.resolve(process.env.RESTAURANT_QA_OUTPUT || 'output/story/layout4-browser');fs.mkdirSync(output,{recursive:true});
const correct=q=>q.type==='single_choice'?{selectedOptionId:q.options.find(o=>o.isCorrect).id}:q.type==='bucket_sort'?{buckets:q.correctBuckets}:q.type==='dish_detective'?{text:q.answerPolicy.canonical}:{dishId:q.dishes[0].id,selectedIngredientIds:q.dishes[0].correctIngredientIds};
const normalized=a=>a.selectedIngredientIds?{...a,selectedIngredientIds:[...a.selectedIngredientIds].sort()}:a;
(async()=>{
 const {server}=createOlympiadServer({dbPath:path.join(output,'qa-'+Date.now()+'.sqlite'),adminPassword:'isolated-layout-browser-qa',attemptIdSecret:'isolated-restaurant-browser-verification-secret',storyEnabled:'true',storyAnytimeEntry:'true'});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})}),context=await browser.newContext({viewport:{width:1366,height:768},serviceWorkers:'block'}),page=await context.newPage();
 const errors=[],checks=[],displayRequests=new Set();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.ok()&&r.url().includes('/display-v1/'))displayRequests.add(new URL(r.url()).pathname);});
 let attempt;page.on('response',async r=>{if(/\/attempts\/(?:start|[^/]+\/(?:answer|current|finish))$/.test(r.url()))try{const j=await r.json();if(j.data?.id)attempt=j.data;}catch{}});
  const recover=async()=>{if(await page.locator('#exam-guard-return').isVisible()){await page.locator('#exam-guard-return').click();await page.waitForFunction(()=>!state.examGuardActive);assert.doesNotMatch(await page.locator('.story-action-line').innerText(),/Вернитесь в защищённый режим/,'restored dialogue no longer asks to return');}else await page.waitForFunction(()=>!state.examGuardActive);};
 try {
  await page.goto(base);await page.locator('#full-name').fill('Браузерный Участник');await page.locator('#institution').fill('Изолированный стенд');await page.locator('#group-name').fill('Оформление');await page.locator('#registration-submit').click();await page.locator('.story-welcome-line').filter({hasText:'познакомились'}).waitFor();await page.locator('#start-consent').check();await page.locator('#start-attempt').click();await page.waitForFunction(()=>state.attempt?.status==='in_progress');
  const id=await page.evaluate(()=>state.attempt.id),variant=(await store.loadAttemptById(id)).variant;
  for(let i=0;i<36;i++){
   const q=variant.questions[i],answer=correct(q);await page.waitForFunction(qid=>state.attempt.currentQuestion?.id===qid,q.id);await recover();
   const chapter=Number(await page.locator('#attempt-section').getAttribute('data-chapter'));
   assert.equal(await page.locator('.story-guest-line').innerText(),q.dialogue.line,'issued dialogue');
   assert.equal(await page.locator('.story-narrator-portrait').count(),1);
   if(q.type==='dish_detective')await page.waitForFunction(()=>document.activeElement.id==='t3-answer-input');
   if(q.sequenceInTour===1){
    for(const [width,height] of [[1536,1024],[1440,900],[1366,768],[1024,900],[768,900],[320,900],[360,900],[390,900],[430,900]]){
     await page.setViewportSize({width,height});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`t${chapter}-${width}.png`),fullPage:true});
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`T${chapter} overflow at ${width}`);
     if(chapter===4&&width<768)assert.equal(await page.locator('.t4-menu').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),1);
     if(width>=768)assert.ok((await page.locator('.dashboard-head').boundingBox()).height<135,'desktop and tablet header stays compact');
     if(chapter===5&&width<768){const pantry=await page.locator('.t5-photo-pantry').boundingBox(),assembly=await page.locator('.t5-photo-panel').boundingBox();assert.ok(pantry.y+pantry.height<=assembly.y,'mobile kitchen shows step 1 before step 2');}
     if(chapter===4){const bounds=await page.locator('.t4-menu-select').first().boundingBox();assert.ok(bounds.width>=(width>=1280?240:width>=768?220:200),'order options must remain substantial photographs, never strips');}
     if(chapter===2&&width>=768){const board=await page.locator('.t2-countries').boundingBox(),bank=await page.locator('.t2-atlas-menu').boundingBox();assert.ok(board.x+board.width+8<=bank.x,'map and photo bank remain separated');}
     if(chapter===2&&width<768)assert.ok(await page.locator('.t2-target').evaluateAll(ns=>ns.every(n=>[...n.children].every(c=>{const a=n.getBoundingClientRect(),b=c.getBoundingClientRect();return b.left>=a.left-1&&b.right<=a.right+1;}))),'country name and flag fit their mobile map target');
    }
    await page.setViewportSize({width:1366,height:768});
    if(chapter===1){const width=await page.locator('.question-photo > img').evaluate(n=>n.getBoundingClientRect().width);assert.ok(width>=350&&width<=430,'T1 photograph fits the menu at 1366');}
    const zoom=page.locator(chapter===4?'.t4-zoom':'.restaurant-zoom').first();
    if(await zoom.count()) {await zoom.click();const dialog=page.locator('dialog[open]');await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();assert.ok(await zoom.evaluate(n=>n===document.activeElement),'zoom restores source focus');}
    checks.push(`T${chapter}: nine viewports, full image, zoom/focus, no overflow`);
    if(chapter===4){
     await page.locator('.t4-zoom').first().click();
     await page.evaluate(()=>document.exitFullscreen());
     await page.locator('#exam-guard-return').waitFor();
     assert.equal(await page.locator('.t4-dialog[open]').count(),0,'focus guard closes order photo so its modal cannot block recovery');
     await recover();
     assert.equal(await page.locator('#attempt-sync-meta').isVisible(),false,'routine recovery timestamp stays in the participant cockpit');
     await page.locator('.t4-help').click();
     await page.evaluate(()=>document.exitFullscreen());
     await page.locator('#exam-guard-return').waitFor();
     assert.equal(await page.locator('.t4-dialog[open]').count(),0,'focus guard also closes order rules');
     await recover();
     checks.push('T4: photo and rules cannot trap focus above the protected-mode recovery screen');
     await page.locator('.t4-menu-select').first().press('End');
     const lastCard=await page.locator('.t4-menu-select').last().boundingBox();
     assert.ok(lastCard.y<768&&lastCard.y+lastCard.height>0,'keyboard navigation scrolls the selected order into view');
    }
    if(chapter===5){
     const ingredient=page.locator('.t5-photo-card').first();
     await page.locator('.t5-photo-scene').scrollIntoViewIfNeeded();
     await ingredient.dragTo(page.locator('.t5-photo-scene'));
     assert.equal((await page.evaluate(()=>state.questionController.getAnswer())).selectedIngredientIds.length,1,'protected mode permits dragging a kitchen ingredient into assembly');
     assert.equal(await page.evaluate(()=>!document.querySelector('.story-narrator-portrait').dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()}))),true,'unrelated restaurant image remains protected against dragging');
     await page.locator('.t5-photo-chip').click();
     checks.push('T5: actual ingredient drag works in protected mode and can be undone');
    }
   }
   if(q.type==='dish_detective'&&q.sequenceInTour!==1)assert.equal(await page.evaluate(()=>document.activeElement.id),'t3-answer-input','next notebook page activates typing');
   await page.locator('.story-more').click();assert.equal(await page.locator('.story-student-speech p').innerText(),q.dialogue.student);assert.equal(await page.locator('.story-extra-speech p').innerText(),q.dialogue.extra);
   assert.equal(await page.locator('.story-guest-line').innerText(),q.dialogue.line,'primary dialogue stays readable');
   await page.evaluate(()=>syncAttempt(true));assert.equal(await page.locator('.story-guest-line').innerText(),q.dialogue.line);assert.equal(await page.locator('.story-exchange').isVisible(),true,'soft sync preserves expanded dialogue');
   if(q.interactionMode==='guest_order'){const choice=page.locator(`[data-option-id="${answer.selectedOptionId}"]`);await choice.click();if(q.sequenceInTour===1){await choice.press('ArrowDown');await choice.click();}}
   else if(q.type==='single_choice')await page.locator(`input[value="${answer.selectedOptionId}"]`).check();
   else if(q.type==='bucket_sort')for(const [item,country]of Object.entries(answer.buckets)){await page.locator(`[data-item-id="${item}"]`).click();await page.locator(`.t2-country[data-country-id="${country}"] .t2-target`).click();assert.equal(await page.locator('.t2-bank .t2-dish').count(),4);}
   else if(q.type==='dish_detective'){await page.locator('#t3-answer-input').fill(answer.text);}
   else {
    for(const item of answer.selectedIngredientIds)await page.locator(`[data-ingredient="${item}"]`).click();
    assert.equal(await page.locator('.t5-service-inline').count(),0,'next composition dismisses previous inline receipt');
    const stepCount=await page.locator('.t5-photo-steps li').count();
    assert.equal(await page.locator('.t5-photo-operation .t5-photo-small').innerText(),`Шаг 1 из ${stepCount}`,'step counter matches the visible route');
    for(let step=0;step<7&&!await page.locator('#submit-answer').isEnabled();step++)await page.locator('.t5-photo-operation button').click();
    assert.equal(await page.locator('.t5-photo-steps li.is-done').count(),stepCount,'completed assembly has no unexplained extra step');
    assert.equal(await page.locator('#attempt-sync-meta').isVisible(),false,'completed kitchen does not repeat a request to finish assembly');
    if(q.sequenceInTour===1){await page.waitForFunction(()=>document.querySelector('.t5-photo-scene')?.dataset.status==='ready');await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(output,'kitchen-ready.png'),fullPage:true});}
   }
   if(q.type==='bucket_sort'){
    const pairs=Object.entries(answer.buckets),[item,country]=pairs[0];
    if(q.sequenceInTour===1){
     await page.locator(`[data-item-id="${item}"]`).press('Enter');await page.locator(`[data-item-id="${item}"]`).press('Escape');assert.equal(await page.locator('.t2-selected-preview').isVisible(),false,'Escape clears the remembered selected photo');
     await page.locator(`.t2-country[data-country-id="${country}"] .t2-undo`).click();
     await page.locator(`[data-item-id="${item}"]`).dragTo(page.locator(`.t2-country[data-country-id="${country}"]`));
     assert.deepEqual(await page.evaluate(()=>state.questionController.getAnswer()),answer,'drag restores actual assignment');
     const [second,secondCountry]=pairs[1];
     await page.locator(`[data-item-id="${second}"]`).click();await page.locator(`.t2-country[data-country-id="${country}"] .t2-target`).click();
     assert.equal(Object.keys(await page.evaluate(()=>state.questionController.getAnswer().buckets)).length,3,'occupied target replaces one dish');
     await page.locator(`[data-item-id="${second}"]`).click();await page.locator(`.t2-country[data-country-id="${secondCountry}"] .t2-target`).click();
     await page.locator(`[data-item-id="${item}"]`).press('Enter');await page.locator(`.t2-country[data-country-id="${country}"] .t2-target`).press('Enter');
     checks.push('Map: drag, occupied replacement, undo, keyboard recovery and four exact photo placements');
    }
    for(const [dishId,target] of pairs){const original=q.items.find(d=>d.id===dishId).imageUrl;assert.equal(await page.locator(`.t2-country[data-country-id="${target}"] .t2-map-dish`).getAttribute('data-source-url'),original);}
    for(const width of [320,390,1366]){await page.setViewportSize({width,height:900});assert.ok(await page.locator('.t2-country').evaluateAll(ns=>ns.every((a,i)=>ns.slice(i+1).every(b=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return x.right<=y.left||y.right<=x.left||x.bottom<=y.top||y.bottom<=x.top;}))),'assigned map callouts do not overlap');}
    await page.setViewportSize({width:1366,height:768});
    if(q.sequenceInTour===1)await page.locator('.t2-atlas-workspace').screenshot({path:path.join(output,'map-assigned.png')});
   }
   if(i===2||i===16||i===26||i===34){await page.reload();await page.waitForFunction(()=>state.attempt);await recover();if(q.type==='single_choice'&&q.interactionMode!=='guest_order')await page.waitForFunction(()=>Boolean(document.querySelector('.question-photo > img')?.naturalWidth));assert.deepEqual(normalized(await page.evaluate(()=>state.questionController.getAnswer())),normalized(answer),'draft reload');if(q.type==='dish_detective')assert.equal(await page.evaluate(()=>document.activeElement.id),'t3-answer-input');checks.push(`Question ${i+1}: saved draft and guard recovery`);}
   if([2,16,26,34].includes(i)){assert.equal(await page.locator('.story-exchange').isVisible(),true,'reload preserves optional exchange');assert.equal(await page.locator('.story-guest-line').innerText(),q.dialogue.line);}
   await page.locator('#submit-answer').click();await page.waitForFunction(index=>state.attempt.progress.answeredCount===index,i+1);
   assert.equal(await page.evaluate(()=>state.attempt.summary.totalFinalScore),null);
   if(q.type==='final_kitchen'){await page.locator('.t5-service-inline').waitFor();await page.locator('.t5-service-inline .t5-service-scene[aria-busy="false"]').waitFor();assert.equal(await page.locator('.t5-service-overlay').count(),0);assert.equal(await page.locator('.t5-service-scene img').evaluateAll(ns=>ns.every(n=>n.complete&&n.naturalWidth>0)),true,'served food and scenery load successfully');assert.equal(await page.locator('.t5-service-missing').isVisible(),false,'no false photo failure');assert.equal(await page.locator('.t5-service-inline').getAttribute('aria-modal'),null);if(i<35)assert.equal(await page.locator('#question-body').evaluate(n=>n.inert),false);await page.locator('.t5-service-inline').screenshot({path:path.join(output,`service-${i}.png`),animations:'disabled'});await page.setViewportSize({width:390,height:900});await page.locator('.t5-service-inline').screenshot({path:path.join(output,`service-${i}-mobile.png`),animations:'disabled'});await page.setViewportSize({width:1366,height:768});}
  }
  const saved=await store.loadAttemptById(id);assert.equal(Object.keys(saved.answers).length,36);assert.equal(saved.totalFinalScore,150);
  checks.push('36 issued dialogues and optional exchanges; soft sync and reload preserve the conversation; automatic T3 focus; no judging before publication');
  assert.equal(await page.locator('#certificate-section').isVisible(),true,'certificate immediately after personal finish');
  assert.equal(await page.locator('#prestart-section').isVisible(),false,'personal finish does not repeat registration');
  assert.equal(await page.locator('#result-award').isVisible(),false,'story finish has one certificate action');
  assert.equal(await page.locator('#nav-home').isVisible(),false,'completed story does not link to its hidden invitation');
  assert.equal(await page.locator('#result-section').evaluate(n=>n.lastElementChild.id),'certificate-section','personal-finish certificate is the final section');
  assert.equal(await page.locator('.story-waiting-scene').isVisible(),false,'the final serving and waiting state do not show two guests');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:path.join(output,'personal-finish.png'),fullPage:true});
  const certificateReply=await context.request.get(base+`/api/public/attempts/${id}/certificate`,{headers:{'X-Attempt-Token':await page.evaluate(id=>localStorage.getItem(`nko_attempt_access_${id}`),id)}});
  assert.equal(certificateReply.status(),200);const certificateData=(await certificateReply.json()).data;
  assert.deepEqual(certificateData.summary,{totalFinalScore:150,totalMaxScore:150});
  assert.doesNotMatch(JSON.stringify(certificateData),/expectedAnswer|correctIngredientIds|isCorrect|tourScores/);
  await page.locator('#certificate-open').click();await page.locator('#certificate-sheet:not([hidden])').waitFor();
  assert.equal(await page.locator('#certificate-score').innerText(),'150 из 150 баллов');
  assert.equal(await page.locator('#certificate-number').innerText(),'№ 199 / 05.10.2026');
  await page.locator('#certificate-sheet').screenshot({path:path.join(output,'certificate-immediate.png')});
  await page.getByRole('link',{name:'← К результату'}).click();await page.locator('#certificate-section:not(.hidden)').waitFor();
  assert.equal(await page.locator('#hero-section').isVisible(),false,'finished story does not repeat invitation');
  const run=await runs.getRun(saved.storyRunId);await runs.updateRun(run.id,{stopped:true});await runs.publishRun(run.id);
  await page.getByRole('button',{name:'Обновить итоги',exact:true}).click();await page.locator('.story-publish-notice').waitFor();assert.match(await page.locator('.story-result-facts').innerText(),/51/);
  assert.equal(await page.locator('.t5-service-inline').count(),0,'published table does not repeat the last serving and guest');
  await page.locator('.story-kitchen-review summary').click();
  assert.equal(await page.getByRole('button',{name:'Посмотреть подачу и реакцию'}).count(),3,'collapsed kitchen still exposes all saved servings');
  await page.locator('.story-kitchen-review summary').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.story-table img')].every(i=>i.complete));
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,'table-51.png'),fullPage:true});
  for(const width of [320,390,768,1366]){
   await page.setViewportSize({width,height:900});
   await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);
   const size=width<=600?2:6;
   await page.getByRole('button',{name:'Следующие подачи',exact:true}).click();
   assert.equal(await page.locator('.story-table-position').innerText(),`Подачи ${size+1}–${size*2} из 51`,'table page size responds to viewport');
   await page.getByRole('button',{name:'Предыдущие подачи',exact:true}).click();
   await page.locator('.story-serving').first().click();
   await page.locator('.story-dish-dialog').getByRole('button',{name:'Закрыть',exact:true}).click();
   assert.equal(await page.locator('.story-serving').first().evaluate(n=>n===document.activeElement),true,'table detail returns focus to its plate');
  }
  checks.push('Published table: responsive navigation, plate detail and source focus at 320/390/768/1366');
  await page.locator('#certificate-section').waitFor();assert.equal(await page.locator('#result-section').evaluate(n=>n.lastElementChild.id),'certificate-section','certificate is the final result section');
  assert.equal(await page.getByText('Разбор всех ответов',{exact:true}).count(),0);
  await page.reload();await page.locator('.story-publish-notice').waitFor();
  assert.equal(await page.locator('#prestart-section').isVisible(),false,'completed restore does not repeat registration');
  assert.equal(await page.locator('.t5-service-inline').count(),0,'completed restore keeps the published table focused');
  // A separate synthetic day exercises the emergency shell and actual network failures.
  const edgeRun=await runs.createRun(new Date(Date.now()+10800000).toISOString().slice(0,10));
  const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'}),edge=await touch.newPage();
  edge.on('pageerror',e=>errors.push(e.message));
  await edge.route('**/story/layout-v2/scenes/*',r=>r.abort());
  await edge.route('**/story/layout-v4/portraits/*',r=>r.abort());
  await edge.goto(base);await edge.locator('#full-name').fill('Сенсорный Участник');await edge.locator('#institution').fill('Изолированный стенд');await edge.locator('#group-name').fill('Оформление');await edge.locator('#registration-submit').click();await edge.locator('#start-consent').check();await edge.locator('#start-attempt').click();await edge.waitForFunction(()=>state.attempt?.status==='in_progress');
  const edgeId=await edge.evaluate(()=>state.attempt.id),edgeVariant=(await store.loadAttemptById(edgeId)).variant;
  const photo=edgeVariant.questions[0].imageUrl;
  await edge.route('**'+photo,r=>r.abort());await edge.route('**/display-v1/preview'+photo.slice('/assets/olympiad'.length),r=>r.abort());await edge.reload();await edge.waitForFunction(()=>state.attempt);if(await edge.locator('#exam-guard-return').isVisible())await edge.locator('#exam-guard-return').click();await edge.locator('.restaurant-retry').waitFor();assert.equal(await edge.locator('#submit-answer').isEnabled(),false,'missing question photo cannot be answered');
  await edge.unroute('**'+photo);await edge.unroute('**/display-v1/preview'+photo.slice('/assets/olympiad'.length));await edge.locator('.restaurant-retry').click();await edge.waitForFunction(()=>document.querySelector('.question-photo > img')?.naturalWidth>0);
  await edge.locator(`input[value="${correct(edgeVariant.questions[0]).selectedOptionId}"]`).check();
  let failures=0;await edge.route('**/answer',r=>{if(failures++===0)return r.abort();return r.continue();});
  await edge.locator('#submit-answer').click();await edge.waitForFunction(()=>state.attempt.progress.answeredCount===1);assert.equal(Object.keys((await store.loadAttemptById(edgeId)).answers).length,1,'lost response retry stores one answer');
  await runs.updateRun(edgeRun.id,{decorationsDisabled:true});
  await edge.evaluate(()=>syncAttempt(true));await edge.waitForFunction(()=>state.attempt?.story?.decorationsDisabled);
  assert.equal(await edge.locator('body.story-immersive').count(),0);assert.equal(await edge.locator('.restaurant-context, .restaurant-paper, .story-chapter').count(),0,'decor disabled returns standard presentation');
  assert.match(await edge.locator('#question-case').innerText(),/Страница альбома:/,'country cue remains visible without decoration');
  await edge.locator(`input[value="${correct(edgeVariant.questions[1]).selectedOptionId}"]`).check();await edge.locator('#submit-answer').click();await edge.waitForFunction(()=>state.attempt.progress.answeredCount===2);
  for(let i=2;i<10;i++){await edge.locator(`input[value="${correct(edgeVariant.questions[i]).selectedOptionId}"]`).check();await edge.locator('#submit-answer').click();await edge.waitForFunction(n=>state.attempt.progress.answeredCount===n,i+1);}
  await runs.updateRun(edgeRun.id,{decorationsDisabled:false});await edge.evaluate(()=>syncAttempt(true));
  await edge.locator('.restaurant-map').waitFor();const pairs=Object.entries(correct(edgeVariant.questions[10]).buckets);
  for(const [item,country]of pairs){await edge.locator(`[data-item-id="${item}"]`).tap();await edge.locator(`.t2-country[data-country-id="${country}"] .t2-target`).tap();}
  const [item,country]=pairs[0];await edge.locator(`.t2-country[data-country-id="${country}"] .t2-undo`).tap();await edge.locator(`[data-item-id="${item}"]`).press('Enter');await edge.locator(`.t2-country[data-country-id="${country}"] .t2-target`).tap();
  assert.equal(await edge.locator('.t2-bank .t2-dish').count(),4);await edge.locator('#submit-answer').tap();await edge.waitForFunction(()=>state.attempt.progress.answeredCount===11);
  checks.push('Touch T2: world map, four visible photos, map targets, undo, keyboard selection and server confirmation; live decor stop/resume');
  checks.push('Touch/reduced-motion: failed decor, photo retry, lost network request, one stored answer, decorationsDisabled and standard answer');
  await touch.close();
  assert.deepEqual(errors,[],'no browser runtime errors');
  const registry=require('../docs/restaurant-display-assets.json');let displayBytes=0,originalEquivalentBytes=0;for(const url of displayRequests){const entry=registry.exports.find(e=>e.url===url);if(entry){displayBytes+=entry.bytes;originalEquivalentBytes+=fs.statSync(path.join('public',entry.sourceUrl)).size;}}
  const images={uniqueDisplayRequests:displayRequests.size,displayBytes,originalEquivalentBytes,reductionPercent:Math.round((1-displayBytes/originalEquivalentBytes)*100)};
  fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify({tasks:36,score:150,plates:51,checks,images,errors},null,2));console.log(JSON.stringify({tasks:36,score:150,plates:51,checks,images,errors}));
 } catch(error) { await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});console.error(await page.locator('body').innerText());console.error(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(n=>({tag:n.tagName,id:n.id,cls:n.className,right:n.getBoundingClientRect().right}))));console.error(errors);throw error; }
 finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
