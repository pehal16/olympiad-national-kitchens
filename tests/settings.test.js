const test = require("node:test");
const assert = require("node:assert/strict");

const { loadSettings } = require("../src/store");

test("loadSettings takes the teacher password from protected environment configuration", () => {
  const previous = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = "TEST-ENV-PASSWORD";
  try {
    const settings = loadSettings();
    assert.equal(settings.adminPassword, "TEST-ENV-PASSWORD");
  } finally {
    if (previous === undefined) {
      delete process.env.ADMIN_PASSWORD;
    } else {
      process.env.ADMIN_PASSWORD = previous;
    }
  }
});
