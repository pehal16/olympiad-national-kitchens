const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createOlympiadServer } = require('../olympiad-server');
const { createAttemptAtomic, loadAttemptById } = require('../src/store');
const { buildVariant } = require('../src/variant');
const olympiad = require('../data/olympiad');

test('protected service HTTP: commit before reaction, wrong composition, reload, immutable retry and certificate order', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(),'olympiad-service-http-'));
  const { server } = createOlympiadServer({ dbPath:path.join(directory,'test.sqlite'),
    adminPassword:'synthetic-service-admin-2026',attemptIdSecret:'synthetic-service-identity-secret-2026' });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(async () => { await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true}); });
  const variant = buildVariant(olympiad,{seed:'http-service-photo-14'});
  const id = 'attempt_synthetic-service-2026';
  const token = 'synthetic_service_access_token_2026';
  const startedAt = new Date().toISOString();
  const attempt = { id,olympiadId:olympiad.id,participant:{fullName:'Тестовый Участник Подачи'},status:'in_progress',
    startedAt,expiresAt:new Date(Date.now()+45*60_000).toISOString(),
    accessTokenHash:crypto.createHash('sha256').update(token).digest('base64url'),stateRevision:0,
    currentStepIndex:variant.tours[4].stepStart,variant,tourStates:{'tour-5':{startedAt,finishedAt:null}},answers:{},questionLog:{} };
  await createAttemptAtomic(attempt);
  const base = `http://127.0.0.1:${server.address().port}/api/public/attempts/${id}`;
  async function request(suffix,body,suppliedToken=token) {
    const response = await fetch(`${base}/${suffix}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Attempt-Token':suppliedToken},...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,data:(await response.json()).data};
  }
  assert.equal((await request('current',null,'')).status,401);
  let current = (await request('current')).data;
  assert.equal(current.dishService,null);
  assert.equal(current.currentQuestion.guestServiceEnabled,true);
  assert.equal(current.summary.totalFinalScore,null);
  assert.deepEqual(current.certificateOrder,{number:'199',date:'2026-10-05'});
  const questions = variant.questions.filter(question=>question.type==='final_kitchen');
  assert.equal((await request(`current?receiptQuestionId=${questions[2].id}`)).data.dishService,null);
  for (const [index,question] of questions.entries()) {
    const dish = question.dishes[0];
    const correct = dish.correctIngredientIds;
    const wrong = dish.items.filter(item=>!correct.includes(item.id)).map(item=>item.id);
    const ids = index===0 ? correct : index===1 ? [...correct.slice(0,3),wrong[0]] : wrong;
    const body = {questionId:question.id,answerPayload:{dishId:dish.id,selectedIngredientIds:ids}};
    assert.equal((await request('answer',{...body,answerPayload:{...body.answerPayload,autoScore:16}})).status,422);
    const response = await request('answer',body);assert.equal(response.status,200);
    assert.equal(response.data.answerReceipt.saved,true);
    assert.equal(response.data.dishService.mood,index===0?'pleased':'puzzled');
    assert.equal(response.data.dishService.questionId,question.id);
    const before = await loadAttemptById(id);
    assert.equal(before.answers[question.id].autoScore,[16,12,0][index]);
    const retry = await request('answer',{...body,answerPayload:{dishId:dish.id,selectedIngredientIds:correct}});
    assert.equal(retry.status,200);
    assert.deepEqual((await loadAttemptById(id)).answers,before.answers);
    current = (await request(`current?receiptQuestionId=${question.id}`)).data;
    assert.deepEqual(current.dishService,response.data.dishService);
    assert.doesNotMatch(JSON.stringify(current),/correctIngredientIds|isCorrect|sourceId|ingredientKey/);
    if(index<2)assert.equal(current.summary.totalFinalScore,null);
  }
  assert.equal(current.status,'reviewed');
  assert.equal(current.summary.totalFinalScore,28);
  assert.deepEqual(current.certificateOrder,{number:'199',date:'2026-10-05'});
  assert.equal(JSON.stringify((await loadAttemptById(id)).variant),JSON.stringify(variant));
});
