"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("Escape on a reused confirmation dialog never repeats an earlier confirmation", async () => {
  const dialog = new EventTarget();
  const children = Object.fromEntries(["#confirm-title", "#confirm-message", "#confirm-accept"].map((id) => [id, { textContent: "", classList: { toggle() {} } }]));
  Object.assign(dialog, {
    returnValue: "",
    showModal() {},
    querySelector: (selector) => children[selector],
  });
  const context = vm.createContext({ document: { querySelector: () => dialog } });
  const source = fs.readFileSync(path.join(__dirname, "../public/learning/ui.js"), "utf8")
    .replace(/^import[^\n]+\n/, "").replace(/^export /gm, "");
  vm.runInContext(`${source}\nglobalThis.confirmAction = confirmAction;`, context);
  const accepted = context.confirmAction({ title: "First confirmation" });
  dialog.returnValue = "confirm";
  dialog.dispatchEvent(new Event("close"));
  assert.equal(await accepted, true);
  const cancelled = context.confirmAction({ title: "Second confirmation" });
  // Native Escape closes the dialog without assigning another returnValue.
  dialog.dispatchEvent(new Event("close"));
  assert.equal(await cancelled, false);
});
