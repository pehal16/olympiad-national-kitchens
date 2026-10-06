const test = require('node:test'), assert = require('node:assert/strict');
const {retryD1} = require('../src/d1-retry');
test('D1 retry is bounded, backs off, and refuses persistent/SQL/overload failures', async () => {
  let calls = 0;
  const waits = [];
  const options = {sleep: async ms => waits.push(ms), random: () => 0};
  assert.equal(await retryD1(async () => {if (++calls < 3) throw Error('Network connection lost.'); return 'saved';}, options), 'saved');
  assert.deepEqual(waits, [75, 150]);
  for (const message of ['UNIQUE constraint failed', 'D1 DB is overloaded. Requests queued for too long.', 'Network connection lost.']) {
    calls = 0;
    await assert.rejects(retryD1(async () => {calls++; throw Error(message);}, options), {message});
    assert.equal(calls, message.startsWith('Network') ? 4 : 1);
  }
});
