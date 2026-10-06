const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");
const handlers = source.slice(source.indexOf("function handleExamVisibilityChange()"), source.indexOf("function handleExamBeforeUnload("));

function setup({ fullscreen = false, inProgress = true, visibility = "visible" } = {}) {
  const calls = [];
  const state = { examGuardActive: true, blurGuardTimer: null };
  const document = { fullscreenElement: fullscreen ? {} : null, visibilityState: visibility, hasFocus: () => true };
  const context = vm.createContext({
    state, document, clearTimeout() {}, setTimeout() {},
    isAttemptInProgress: () => inProgress,
    restoreExamMode: () => calls.push("restore"),
    activateExamGuard: (message, eventType) => calls.push(eventType)
  });
  vm.runInContext(handlers, context);
  return { calls, context, document, run: code => vm.runInContext(code, context) };
}

test("one fullscreen exit is not reclassified or restored by automatic focus/visibility events", () => {
  const run = setup();
  run.run("handleExamFullscreenChange(); handleExamWindowFocus(); handleExamVisibilityChange(); handleExamWindowFocus();");
  assert.deepEqual(run.calls, ["fullscreen_exit"]);
});

test("a focused visible page that remains fullscreen can restore its existing guard", () => {
  const run = setup({ fullscreen: true });
  run.run("handleExamWindowFocus(); handleExamVisibilityChange();");
  assert.deepEqual(run.calls, ["restore", "restore"]);
});

test("leaving the active tab is still recorded with or without fullscreen", () => {
  for (const fullscreen of [true, false]) {
    const run = setup({ fullscreen, visibility: "hidden" });
    run.run("handleExamVisibilityChange();");
    assert.deepEqual(run.calls, ["tab_hidden"]);
  }
});

test("focus and fullscreen transitions do not create incidents after an attempt ends", () => {
  const run = setup({ fullscreen: true, inProgress: false });
  run.run("handleExamWindowFocus(); handleExamVisibilityChange(); handleExamFullscreenChange();");
  assert.deepEqual(run.calls, []);
});
