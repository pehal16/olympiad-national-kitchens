const test = require("node:test");
const assert = require("node:assert/strict");

const { loadSettings } = require("../src/store");

test("loadSettings prefers configured teacher password over stale environment password", () => {
  const previous = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = "STALE-ENV-PASSWORD";
  try {
    const settings = loadSettings();
    assert.equal(settings.adminPassword, "PM01-GKTS-2026!");
  } finally {
    if (previous === undefined) {
      delete process.env.ADMIN_PASSWORD;
    } else {
      process.env.ADMIN_PASSWORD = previous;
    }
  }
});
