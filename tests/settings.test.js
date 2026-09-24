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

test("loadSettings keeps the attempt identity secret separate from the teacher password", () => {
  const previousAttemptSecret = process.env.ATTEMPT_ID_SECRET;
  const previousAdminPassword = process.env.ADMIN_PASSWORD;
  process.env.ATTEMPT_ID_SECRET = "TEST-ATTEMPT-SECRET";
  process.env.ADMIN_PASSWORD = "TEST-ADMIN-PASSWORD";
  try {
    const settings = loadSettings();
    assert.equal(settings.attemptIdSecret, "TEST-ATTEMPT-SECRET");
    assert.equal(settings.adminPassword, "TEST-ADMIN-PASSWORD");
    assert.notEqual(settings.attemptIdSecret, settings.adminPassword);
  } finally {
    if (previousAttemptSecret === undefined) delete process.env.ATTEMPT_ID_SECRET;
    else process.env.ATTEMPT_ID_SECRET = previousAttemptSecret;
    if (previousAdminPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previousAdminPassword;
  }
});
