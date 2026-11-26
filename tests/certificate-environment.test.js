'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const script = fs.readFileSync(require.resolve('../public/certificate.js'), 'utf8').replace('  loadCertificate();', '  globalThis.finished = loadCertificate();');
async function certificate({ environment, legacy = false, firstStatus = 200, demo = false, teacherDemo = false, organizer = false, drafts = new Map() }) {
  const calls = [], id = 'attempt_certificate-environment-test';
  const node = () => ({
    textContent: '', value: '', maxLength: 160, hidden: true, disabled: true, style: { setProperty() {} },
    classList: { add() {}, toggle() {} }, listeners: new Map(),
    addEventListener(type, handler) { this.listeners.set(type, handler); },
    clientHeight: 794, offsetTop: 700, offsetHeight: 30, offsetWidth: 1122,
    querySelector() { return this; }, querySelectorAll: () => [], append() {}, complete: true, naturalWidth: 100,
  });
  const nodes = new Map(), get = key => { if (!nodes.has(key)) nodes.set(key,node()); return nodes.get(key); };
  const local = new Map([[`nko_attempt_access_${id}`, 'test_owner_token'], ['nko_anonymous_demo_session_v1', 'b'.repeat(32)]]);
  if (environment !== undefined) local.set(`nko_attempt_access_${id}_environment`, JSON.stringify(environment));
  const data = { status: 'reviewed', demonstration: demo, teacherDemo, participant: { fullName: 'Проверочный Участник' }, summary: { totalFinalScore: 42, totalMaxScore: 150 }, finishedAt: '2026-11-16T10:00:00Z', certificateOrder: { number: '199', date: '2026-10-05' } };
  const location = { pathname: '/demo-teacher/certificate', search: '?attempt=' + id + (organizer ? '&organizer=1' : '') };
  const sessionStorage = {
    getItem: key => key === 'nko_demo_session_attempt_v1' && legacy ? id : drafts.get(key) || null,
    setItem: (key, value) => drafts.set(key, value),
  };
  const context = { URLSearchParams, Date, Intl, Promise, Number, Array, JSON, window: { location, addEventListener() {} }, document: { getElementById: get, querySelector: get }, localStorage: { getItem: x => local.get(x) || null }, sessionStorage, fetch: async (url, options) => {
    calls.push(options.headers); const status = calls.length === 1 ? firstStatus : 200;
    return new Response(JSON.stringify({ data }), { status });
  } };
  vm.runInNewContext(script, context); await context.finished;
  return { calls, nodes, drafts, id };
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

test('teacher demo certificate previews both names and restores the draft within the tab', async () => {
  const mode = { demo: true, teacherDemo: true, environment: { demonstration: true, demoSession: 'a'.repeat(32) } };
  const view = await certificate(mode);
  assert.equal(view.nodes.get('certificate-editor').hidden, false);
  const fullName = view.nodes.get('certificate-full-name');
  const mentorName = view.nodes.get('certificate-mentor-name');
  fullName.value = '  Проверочная  Алёна Сергеевна  ';
  fullName.listeners.get('input')();
  mentorName.value = 'Образцовый Антон Ильич';
  mentorName.listeners.get('input')();
  assert.equal(view.nodes.get('certificate-name').textContent, 'Проверочная Алёна Сергеевна');
  assert.equal(view.nodes.get('certificate-mentor').textContent, 'Образцовый Антон Ильич');
  assert.equal(view.calls.length, 1);
  assert.equal(view.drafts.has('nko_teacher_certificate_' + view.id), true);

  const restored = await certificate({ ...mode, drafts: view.drafts });
  assert.equal(restored.nodes.get('certificate-name').textContent, 'Проверочная Алёна Сергеевна');
  const restoredMentor = restored.nodes.get('certificate-mentor-name');
  assert.equal(restoredMentor.value, 'Образцовый Антон Ильич');
  restoredMentor.value = '';
  restoredMentor.listeners.get('input')();
  assert.equal(restored.nodes.get('certificate-mentor').textContent, '—');
});

test('only a verified teacher demo participant can personalize a certificate', async () => {
  for (const mode of [{ demo: true }, { teacherDemo: true }, { demo: true, teacherDemo: true, organizer: true }]) {
    const view = await certificate(mode);
    assert.equal(view.nodes.has('certificate-editor'), false);
    assert.equal(view.nodes.get('certificate-name').textContent, 'Проверочный Участник');
    assert.equal(view.drafts.size, 0);
  }
});
