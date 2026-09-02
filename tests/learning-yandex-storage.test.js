"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { configureLearningRuntime } = require("../src/learning/repository");
const { LearningFileStore, yandexObjectPath } = require("../src/learning/files");

test("learning file store uses private Yandex Disk for put, get, and delete", async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
    configureLearningRuntime({ db: null, files: null, yandexDisk: null });
  });

  const calls = [];
  let storedBody = null;
  global.fetch = async (input, options = {}) => {
    const url = typeof input === "string" ? input : input.url;
    const method = String(options.method || "GET").toUpperCase();
    calls.push({ url, method, headers: options.headers || {} });

    if (url.startsWith("https://cloud-api.yandex.net/v1/disk/resources/upload?")) {
      return Response.json({ href: "https://upload.example/object" });
    }
    if (url.startsWith("https://cloud-api.yandex.net/v1/disk/resources/download?")) {
      return Response.json({ href: "https://download.example/object" });
    }
    if (url.startsWith("https://cloud-api.yandex.net/v1/disk/resources?") && method === "DELETE") {
      storedBody = null;
      return new Response(null, { status: 204 });
    }
    if (url.startsWith("https://cloud-api.yandex.net/v1/disk/resources?") && method === "PUT") {
      return new Response(null, { status: 201 });
    }
    if (url === "https://upload.example/object" && method === "PUT") {
      storedBody = Buffer.from(options.body);
      return new Response(null, { status: 201 });
    }
    if (url === "https://download.example/object" && method === "GET") {
      return storedBody
        ? new Response(storedBody, { status: 200 })
        : new Response("missing", { status: 404 });
    }
    throw new Error(`Unexpected fetch: ${method} ${url}`);
  };

  configureLearningRuntime({
    db: {},
    files: null,
    yandexDisk: {
      enabled: true,
      oauthToken: "test-oauth-token",
      folder: "/olympiad-results"
    }
  });
  const store = new LearningFileStore();
  const key = "learning/submission/attachment.png";
  const body = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");

  assert.equal(store.backend(), "yandex-disk");
  assert.equal(
    yandexObjectPath("/olympiad-results", key),
    "app:/olympiad-results/learning-files/learning/submission/attachment.png"
  );
  assert.throws(
    () => yandexObjectPath("/olympiad-results", "../escape.png"),
    (error) => error.code === "invalid_object_key"
  );

  await store.put(key, body, { mimeType: "image/png" });
  const downloaded = await store.get(key);
  assert.deepEqual(downloaded.body, body);
  assert.equal(downloaded.contentType, "image/png");
  assert.ok(calls.some((call) => call.url.includes("resources/upload?")));
  assert.ok(calls.some((call) => call.url.includes("resources/download?")));
  assert.ok(
    calls
      .filter((call) => call.url.startsWith("https://cloud-api.yandex.net/"))
      .every((call) => call.headers.Authorization === "OAuth test-oauth-token")
  );

  await store.delete(key);
  assert.equal(await store.get(key), null);
  assert.ok(calls.some((call) => call.method === "DELETE" && call.url.includes("permanently=true")));
});

test("cloud learning storage fails closed when neither Yandex Disk nor R2 is configured", async (t) => {
  t.after(() => configureLearningRuntime({ db: null, files: null, yandexDisk: null }));
  configureLearningRuntime({ db: {}, files: null, yandexDisk: null });
  const store = new LearningFileStore();
  assert.equal(store.backend(), "file");
  await assert.rejects(
    () => store.put("learning/submission/missing.png", Buffer.from("x")),
    (error) => error.code === "file_storage_unavailable" && error.statusCode === 503
  );
});
