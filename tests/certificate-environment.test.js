'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const script = fs.readFileSync(require.resolve('../public/certificate.js'), 'utf8').replace('  loadCertificate();', '  globalThis.finished = loadCertificate();');
async function certificate({ environment, legacy = false, firstStatus = 200, demo = false }) {
  const calls = [], id = 'attempt_certificate-environment-test';
  const node = () => ({ textContent: '', hidden: true, disabled: true, style: {}, classList: { add() {}, toggle() {} }, addEventListener() {}, getBoundingClientRect: () => ({ top: 0, height: 600, bottom: 500 }), querySelector() { return this; }, querySelectorAll: () => [], complete: true, naturalWidth: 100 });
  const nodes = new Map(), get = key => { if (!nodes.has(key)) nodes.set(key,node()); return nodes.get(key); };
  const local = new Map([[`nko_attempt_access_${id}`, 'test_owner_token'], ['nko_anonymous_demo_session_v1', 'b'.repeat(32)]]);
  if (environment !== undefined) local.set(`nko_attempt_access_${id}_environment`, JSON.stringify(environment));
  const data = { status: 'reviewed', demonstration: demo, participant: { fullName: 'Проверочный Участник' }, summary: { totalFinalScore: 42, totalMaxScore: 150 }, finishedAt: '2026-11-16T10:00:00Z', certificateOrder: { number: '199', date: '2026-10-05' } };
  const context = { URLSearchParams, Date, Intl, Promise, Number, Array, JSON, window: { location: { search: '?attempt=' + id } }, document: { getElementById: get, querySelector: get }, localStorage: { getItem: x => local.get(x) || null }, sessionStorage: { getItem: () => legacy ? id : null }, fetch: async (url, options) => {
    calls.push(options.headers); const status = calls.length === 1 ? firstStatus : 200;
    return new Response(JSON.stringify({ data }), { status });
  } };
  vm.runInNewContext(script, context); await context.finished;
  return { calls, nodes };
}
test('demo certificate uses the identity saved for this attempt', async () => {
  const r = await certificate({ environment: { demonstration: true, demoSession: 'a'.repeat(32) }, demo: true });
  assert.equal(r.calls[0]['X-Demo-Session'], 'a'.repeat(32));
  assert.equal(r.nodes.get('certificate-score').textContent, '42 из 150 баллов');
  assert.equal(r.nodes.get('certificate-save').disabled, false);
});
test('official attempt ignores an unrelated anonymous browser demo identity, including an error', async () => {
  for (const firstStatus of [200, 401]) {
    const r = await certificate({ environment: { demonstration: false }, firstStatus });
    assert.equal(r.calls.length, 1); assert.equal(r.calls[0]['X-Demo-Session'], undefined);
  }
});
test('legacy successful official certificate never falls back to demo', async () => {
  const r = await certificate({}); assert.equal(r.calls.length, 1); assert.equal(r.calls[0]['X-Demo-Session'], undefined);
});
test('legacy exact demo session works, and token-only legacy recovery accepts only a marked demo response', async () => {
  const exact = await certificate({ legacy: true, demo: true });
  assert.equal(exact.calls[0]['X-Demo-Session'], 'b'.repeat(32));
  const recovered = await certificate({ firstStatus: 401, demo: true });
  assert.equal(recovered.calls.length, 2); assert.equal(recovered.nodes.get('certificate-save').disabled, false);
  const refused = await certificate({ firstStatus: 401, demo: false });
  assert.equal(refused.nodes.get('certificate-save').disabled, true);
});
