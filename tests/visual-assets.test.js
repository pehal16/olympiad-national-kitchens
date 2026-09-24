const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const visualRoot = path.join(root, "public", "assets", "olympiad", "visual-v1");

function assertWebp(relativePath, limits) {
  const fullPath = path.join(visualRoot, relativePath);
  const data = fs.readFileSync(fullPath);
  assert.equal(data.subarray(0, 4).toString("ascii"), "RIFF", `${relativePath} must be RIFF`);
  assert.equal(data.subarray(8, 12).toString("ascii"), "WEBP", `${relativePath} must be WebP`);
  assert.ok(data.length >= limits.min, `${relativePath} is unexpectedly small`);
  assert.ok(data.length <= limits.max, `${relativePath} exceeds its delivery budget`);
}

test("reviewed olympiad dish and ingredient assets are present and web optimized", () => {
  const review = JSON.parse(fs.readFileSync(path.join(visualRoot, "asset-review.json"), "utf8"));
  assert.equal(review.generationMethod, "OpenAI built-in imagegen");
  assert.equal(review.dishSources.length, 6);
  assert.equal(review.ingredients.length, 15);

  review.dishSources.forEach(({ asset, review: reviewResult }) => {
    assertWebp(asset, { min: 80_000, max: 350_000 });
    assert.match(reviewResult, /^Passed:/);
  });
  review.ingredients.forEach((filename) => {
    assertWebp(path.join("ingredients", filename), { min: 15_000, max: 100_000 });
  });
});

test("the lazy 3D runtime is built as a local browser module", () => {
  const runtimePath = path.join(root, "public", "assets", "runtime", "dish-scene-3d.js");
  const data = fs.readFileSync(runtimePath);
  assert.ok(data.length > 100_000);
  assert.ok(data.length < 750_000);
  const source = data.toString("utf8");
  assert.doesNotMatch(source, /(?:import\s*\(|from\s*)["']https?:\/\//);
  assert.doesNotMatch(source, /fetch\s*\(\s*["']https?:\/\//);
});
