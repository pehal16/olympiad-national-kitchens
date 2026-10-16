"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { trialPaths, readCredentials, startTrial, backupTrial } = require("../scripts/windows-trial");

test("Windows trial keeps credentials across restarts and refuses to replace corrupted keys", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "olympiad-trial-keys-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const paths = trialPaths(directory), first = readCredentials(paths);
  assert.ok(first.adminPassword.length >= 16);
  assert.ok(first.attemptIdSecret.length >= 32);
  assert.deepEqual(readCredentials(paths), first);
  fs.writeFileSync(paths.credentials, '{"adminPassword":"short"}');
  assert.throws(() => readCredentials(paths), /Повреждён файл/);
  assert.equal(fs.readFileSync(paths.credentials, "utf8"), '{"adminPassword":"short"}');
});

test("Windows trial preserves an owned attempt, certificate and backup independently of production", async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "olympiad-trial-http-"));
  const paths = trialPaths(directory);
  let trial;
  t.after(async () => {
    if (trial?.server.listening) await new Promise(resolve => trial.server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  trial = await startTrial(paths, { port: 0, openBrowser: false });
  assert.equal(trial.server.address().address, "127.0.0.1");
  assert.equal(trial.report.totalQuestions, 36);
  assert.equal(trial.report.totalPoints, 150);
  assert.equal(trial.report.durationMinutes, 36);
  assert.ok(!fs.readFileSync(paths.report, "utf8").includes(readCredentials(paths).adminPassword));
  const token = crypto.randomBytes(32).toString("base64url");
  const participant = { fullName: "Пробный Участник Сервера", institution: "Техническая репетиция", groupName: "TEST", mentorName: "" };
  async function request(route, body, selectedToken = token) {
    const response = await fetch(`${trial.baseUrl}${route}`, { method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", "X-Attempt-Token": selectedToken },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, payload: await response.json() };
  }
  const created = await request("/api/public/attempts/start", { participant });
  assert.equal(created.status, 201);
  const id = created.payload.data.id;
  assert.equal(created.payload.data.story.conditionVersion, 6);
  const repeated = await request("/api/public/attempts/start", { participant });
  assert.equal(repeated.payload.data.id, id);
  const finished = await request(`/api/public/attempts/${id}/finish`, {});
  assert.equal(finished.status, 200);
  assert.equal((await request(`/api/public/attempts/${id}/certificate`)).status, 200);
  assert.equal((await request(`/api/public/attempts/${id}/certificate`, null, crypto.randomBytes(32).toString("base64url"))).status, 401);
  assert.equal((await request("/credentials.json")).status, 404);
  assert.equal((await request("/api/public/pm01")).status, 404);
  const backup = await backupTrial(paths);
  assert.equal(backup.integrity, "ok");
  assert.equal(backup.attempts, 1);
  const credentials = readCredentials(paths);
  await new Promise(resolve => trial.server.close(resolve));
  trial = await startTrial(paths, { port: 0, openBrowser: false });
  assert.deepEqual(readCredentials(paths), credentials);
  const restored = await request(`/api/public/attempts/${id}`);
  assert.equal(restored.status, 200);
  assert.equal(restored.payload.data.id, id);
  assert.equal(restored.payload.data.status, "reviewed");
});
