'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const reserve=require('../public/attempt-reserve');
test('origin transfer preserves a Unicode draft and an unacknowledged answer without HTTP query credentials',()=>{
 const value={version:1,from:reserve.origins[0],createdAt:Date.now(),attemptId:'attempt_example',token:'synthetic_reserve_test_access_token',draft:{questionId:'q1',answer:{text:'Круассан'}},queue:[{questionId:'q0',answerPayload:{selectedOptionId:'a'}}]};
 const url=new URL(reserve.link(reserve.origins[1],value));assert.equal(url.search,'');assert.equal(url.pathname,'/');assert.deepEqual(reserve.decode(url.hash,url.origin),value);
 assert.throws(()=>reserve.link('https://other.example',value));assert.throws(()=>reserve.decode(url.hash,'https://other.example'));assert.throws(()=>reserve.decode(url.hash,url.origin,Date.now()+31*60000));assert.throws(()=>reserve.decode('#resume=not-json',url.origin));
});
