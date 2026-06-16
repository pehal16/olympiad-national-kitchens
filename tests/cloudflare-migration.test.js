const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");

test("Cloudflare deployment contract exposes Pages, D1, and voice storage pieces", () => {
  const wrangler = fs.readFileSync(path.join(root, "wrangler.toml"), "utf8");
  const schema = fs.readFileSync(path.join(root, "migrations", "0001_cloudflare_initial.sql"), "utf8");
  const worker = fs.readFileSync(path.join(root, "src", "cloudflare", "worker.js"), "utf8");
  const store = fs.readFileSync(path.join(root, "src", "cloudflare-store.js"), "utf8");
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "deploy-cloudflare.yml"), "utf8");
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

  assert.match(wrangler, /pages_build_output_dir = "dist-cloudflare"/);
  assert.match(wrangler, /binding = "DB"/);
  assert.match(wrangler, /migrations_dir = "migrations"/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS attempts/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS attempt_answers/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS pm01_voice_index/);
  assert.match(worker, /env\.ASSETS\.fetch/);
  assert.match(worker, /configureCloudflareStorage/);
  assert.match(store, /PM01_VOICE\.put/);
  assert.match(store, /audio_base64/);
  assert.match(store, /pm01-voice\/\$\{encodeURIComponent\(meta\.attemptId\)\}/);
  assert.match(workflow, /wrangler pages deploy dist-cloudflare/);
  assert.equal(packageJson.scripts["build:cloudflare"], "node scripts/build-cloudflare-pages.js");
  assert.equal(packageJson.scripts["cloudflare:export"], "node scripts/export-cloudflare-migration.js");
  assert.equal(packageJson.scripts["cloudflare:import"], "node scripts/import-cloudflare-migration.js");
});
