"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { retryStorageOperation, verifyStorage } = require("../scripts/verify-yandex-disk-storage");

test("deployment probe retries temporary failures, preserving its operation and bounded backoff", async () => {
  const delays = [], notices = [];
  let calls = 0;
  const result = await retryStorageOperation(async () => {
    calls++;
    if (calls === 1) throw new Error("Яндекс Диск API: 500 temporary");
    if (calls === 2) throw new TypeError("fetch failed");
    return "verified";
  }, { wait: async ms => delays.push(ms), warn: message => notices.push(message) });
  assert.equal(result, "verified");
  assert.equal(calls, 3);
  assert.deepEqual(delays, [10000, 20000]);
  assert.equal(notices.length, 2);
});

test("deployment probe fails on persistent outages or credentials and never retries a content mismatch", async () => {
  for (const [message, expected] of [["Яндекс Диск API: 503 unavailable", 3], ["Яндекс Диск API: 401 denied", 1], ["Yandex Disk storage round-trip returned different content.", 1]]) {
    let calls = 0;
    await assert.rejects(() => retryStorageOperation(async () => { calls++; throw new Error(message); }, { wait: async () => {}, warn: () => {} }));
    assert.equal(calls, expected);
  }
});

test("deployment probe checks actual bytes and only cleans up its own unique control file", async () => {
  let uploadedPath, uploadedBody, deletedPath;
  const operations = {
    ensureFolder: async () => {},
    uploadBuffer: async (path, body) => { uploadedPath = path; uploadedBody = Buffer.from(body); },
    downloadBuffer: async path => { assert.equal(path, uploadedPath); return Buffer.from("different"); },
    deleteResource: async path => { deletedPath = path; }
  };
  await assert.rejects(() => verifyStorage({ oauthToken: "test-only", operations }), /different content/);
  assert.match(uploadedPath, /^app:\/olympiad-results\/learning-files\/\.storage-check-[a-f0-9-]+\.txt$/);
  assert.equal(deletedPath, uploadedPath);
  operations.downloadBuffer = async () => uploadedBody;
  await verifyStorage({ oauthToken: "test-only", operations });
  assert.equal(deletedPath, uploadedPath);
});
