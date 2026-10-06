const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");
const helpers = source.slice(source.indexOf("function supportsOlympiadFullscreen()"), source.indexOf("function updateExamGuardUi()"));
const availability = source.slice(source.indexOf("function updateStartAvailability()"), source.indexOf("function unlockExamKeyboard()"));
const start = source.slice(source.indexOf("async function startAttempt()"), source.indexOf("async function submitAnswer()"));

function setup({ supported = true, enabled = true, consent = true, fullscreenAllowed = true, serverFails = false } = {}) {
  const calls = [];
  const elements = {
    startAttempt: { dataset: {}, textContent: "Начать олимпиаду" },
    startConsent: { checked: consent },
    startConsentHint: {},
    prestartMessage: { id: "prestart" },
    attemptMessage: { id: "attempt" }
  };
  const document = {
    documentElement: { requestFullscreen: supported ? async () => {} : undefined },
    fullscreenEnabled: enabled,
    fullscreenElement: null,
    exitFullscreen: async () => { calls.push("exit-fullscreen"); document.fullscreenElement = null; }
  };
  const state = { participant: { fullName: "Synthetic participant" }, isStartingAttempt: false, activeAttemptId: "", attempt: null };
  const context = vm.createContext({
    document, state, elements,
    showMessage: (element, message) => calls.push({ target: element.id, message }),
    hideMessage() {}, setAttemptSaveStatus() {}, setAttemptSyncMeta() {},
    requestExamFullscreen: async () => {
      calls.push("request-fullscreen");
      if (fullscreenAllowed) document.fullscreenElement = {};
      return fullscreenAllowed;
    },
    makePendingStartKey: async () => "synthetic-start",
    loadAttemptAccessToken: () => "", loadPendingStartToken: () => "", createAttemptAccessToken: () => "synthetic-token",
    rememberPendingStartToken() {}, rememberAttemptAccessToken() {}, clearPendingStartToken() {},
    requestWithRetry: operation => operation(),
    api: async () => {
      calls.push("start-request");
      if (serverFails) throw Error("Synthetic connection failure");
      return { id: "synthetic-attempt", status: "in_progress", participant: state.participant };
    },
    applyAttemptState: attempt => { state.attempt = attempt; },
    startTimers: () => calls.push("start-timers"), refreshNavigationState() {},
    formatDateTime: () => "synthetic-time", formatApiError: error => error.message,
    hasPendingAnswers: () => false,
    isAttemptInProgress: () => state.attempt?.status === "in_progress"
  });
  vm.runInContext(helpers + availability + start, context);
  return { context, state, elements, document, calls, start: () => vm.runInContext("startAttempt()", context) };
}

test("unsupported or policy-disabled fullscreen cannot create an attempt or start its timer", async () => {
  for (const options of [{ supported: false }, { enabled: false }]) {
    const run = setup(options);
    await run.start();
    assert.equal(run.elements.startAttempt.disabled, true);
    assert.match(run.elements.startConsentHint.textContent, /Попытка не запущена/);
    assert.equal(run.state.attempt, null);
    assert.equal(run.calls.includes("request-fullscreen"), false);
    assert.equal(run.calls.includes("start-request"), false);
    assert.equal(run.calls.includes("start-timers"), false);
  }
});

test("refusing fullscreen leaves no attempt, credentials or running timer", async () => {
  const run = setup({ fullscreenAllowed: false });
  await run.start();
  assert.equal(run.state.isStartingAttempt, false);
  assert.equal(run.state.attempt, null);
  assert.deepEqual(run.calls.filter(value => typeof value === "string"), ["request-fullscreen"]);
  assert.ok(run.calls.some(value => value.message?.includes("Таймер ещё не запущен")));
});

test("missing consent and an already-running start cannot bypass the preflight", async () => {
  const noConsent = setup({ consent: false });
  await noConsent.start();
  assert.equal(noConsent.calls.includes("start-request"), false);
  assert.equal(noConsent.calls.includes("request-fullscreen"), false);
  const busy = setup();
  busy.state.isStartingAttempt = true;
  await busy.start();
  assert.equal(busy.calls.length, 0);
});

test("a supported browser enters fullscreen before contacting the server and starting timers", async () => {
  const run = setup();
  await run.start();
  assert.deepEqual(run.calls.filter(value => typeof value === "string"), ["request-fullscreen", "start-request", "start-timers"]);
  assert.equal(run.state.attempt.id, "synthetic-attempt");
  assert.equal(run.state.isStartingAttempt, false);
  assert.notEqual(run.document.fullscreenElement, null);
});

test("failed start exits the preparatory fullscreen without starting a timer", async () => {
  const run = setup({ serverFails: true });
  await run.start();
  assert.deepEqual(run.calls.filter(value => typeof value === "string"), ["request-fullscreen", "start-request", "exit-fullscreen"]);
  assert.equal(run.state.attempt, null);
  assert.equal(run.state.isStartingAttempt, false);
  assert.equal(run.document.fullscreenElement, null);
});

test("an unsupported resume preserves the existing attempt and does not claim its timer never started", async () => {
  const run = setup({ supported: false });
  const existing = { id: "issued-attempt", status: "in_progress" };
  run.state.activeAttemptId = existing.id;
  run.state.attempt = existing;
  await run.start();
  assert.equal(run.state.attempt, existing);
  assert.match(run.elements.startConsentHint.textContent, /обратитесь к организатору/);
  assert.doesNotMatch(run.elements.startConsentHint.textContent, /Попытка не запущена/);
  assert.equal(run.calls.includes("start-request"), false);
  assert.equal(run.calls.includes("start-timers"), false);
});
