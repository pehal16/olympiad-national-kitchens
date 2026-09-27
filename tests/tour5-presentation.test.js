"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const Module = require("node:module");
const esbuild = require("esbuild");
const THREE = require("three");
const bank = require("../data/banks/tour5-final-kitchen");
const { FORMS, planAssembly } = require("../src/final-kitchen-presentation");
const { buildVariant, sanitizeQuestion, validateQuestionStructure } = require("../src/variant");
const olympiad = require("../data/olympiad");

function choices(items, n) { return n ? items.flatMap((item, i) => choices(items.slice(i + 1), n - 1).map(rest => [item, ...rest])) : [[]]; }

test("T5 generated material files match provenance and every referenced surface exists locally", () => {
  const root = path.join(__dirname, "..");
  const provenance = JSON.parse(fs.readFileSync(path.join(root, "docs/olympiad-t5-material-provenance.json"), "utf8"));
  const materials = provenance.items.filter(item => item.publicUrl);
  assert.equal(materials.length, 5);
  assert.equal(provenance.items.length, 8);
  const urls = new Set();
  for (const item of materials) {
    assert.match(item.publicUrl, /^\/assets\/olympiad\/tour5\/materials\/t5-v2-[a-f0-9]{12}\.webp$/);
    const bytes = fs.readFileSync(path.join(root, "public", item.publicUrl));
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), item.outputSha256);
    assert.equal(item.exportWidth, 768); assert.equal(item.exportHeight, 768);
    assert.equal(item.mainAgentViewedOriginal, true); assert.equal(item.userAccepted3D, false);
    urls.add(item.publicUrl);
  }
  for (const station of bank) for (const dish of station.dishes) {
    for (const url of Object.values(dish.surfaceTextures)) assert.ok(urls.has(url));
  }
});

test("T5 all 1,141 partial/full visual combinations include wrong foods, are order-independent and have no grading input", () => {
  let partials = 0, finals = 0;
  for (const station of bank) for (const dish of station.dishes) {
    assert.equal(station.presentationVersion, 2);
    assert.ok(dish.items.every(item => FORMS.has(item.scene.form)));
    for (let n = 0; n <= 4; n++) for (const items of choices(dish.items, n)) {
      partials++; if (n === 4) finals++;
      const publicDish = { modelPreset: dish.modelPreset };
      const plan = planAssembly(publicDish, items);
      assert.deepEqual(plan, planAssembly(publicDish, [...items].reverse()));
      assert.equal(plan.phase, n === 4 ? "assembled" : "open");
      assert.deepEqual(new Set(plan.representedIds), new Set(items.map(item => item.id)));
      assert.equal(plan.folded, n === 4 && plan.hasShell && ["roll", "wrap"].includes(dish.modelPreset));
    }
  }
  assert.equal(partials, 1141); assert.equal(finals, 490);
  const source = fs.readFileSync(path.join(__dirname, "../src/client/final-kitchen-model.js"), "utf8");
  assert.doesNotMatch(source, /correctIngredientIds|ingredientKey|scoreQuestion|src\/scoring/);
});

test("T5 visual v1 issued snapshots remain usable and do not acquire v2 materials or forms", () => {
  const old = structuredClone(olympiad); old.blueprintVersion = 10;
  old.questionBank.tour5Stations.forEach(station => { station.presentationVersion = 1;
    station.dishes.forEach(dish => { delete dish.surfaceTextures; delete dish.presentationVersion;
      dish.items.forEach(item => { delete item.scene.form; }); }); });
  const variant = buildVariant(old, { seed: "visual-v1-immutable" });
  const question = variant.questions.find(q => q.type === "final_kitchen"), before = JSON.stringify(variant);
  const attempt = { stationSelections: { [question.id]: { dishId: question.dishes[0].id } } };
  const result = sanitizeQuestion(question, attempt);
  assert.equal(result.selectedDish.presentationVersion, 1);
  assert.equal(result.selectedDish.surfaceTextures, undefined);
  assert.ok(result.selectedDish.items.every(item => item.scene.form === undefined));
  buildVariant(olympiad, { seed: "visual-v2-new" }); assert.equal(JSON.stringify(variant), before);
  assert.doesNotThrow(() => validateQuestionStructure(question));
});

test("T5 material whitelist rejects external textures, hidden keys and unsupported forms", () => {
  for (const mutate of [q => { q.dishes[0].surfaceTextures.score = "/assets/hidden.webp"; },
    q => { q.dishes.find(d => d.modelPreset === "burger").surfaceTextures = {}; },
    q => { q.dishes[0].surfaceTextures.rice = "https://example.com/rice.webp"; },
    q => { q.dishes[0].items[0].scene.form = "correct"; }]) {
    const question = structuredClone(bank[0]); mutate(question); assert.throws(() => validateQuestionStructure(question));
  }
  const variant = buildVariant(olympiad, { seed: "visual-v2-sanitize" });
  for (const question of variant.questions.filter(q => q.type === "final_kitchen")) for (const dish of question.dishes) {
    const publicQ = sanitizeQuestion(question, { stationSelections: { [question.id]: { dishId: dish.id } } });
    assert.deepEqual(publicQ.selectedDish.surfaceTextures, dish.surfaceTextures);
    assert.doesNotMatch(JSON.stringify(publicQ), /correctIngredientIds|ingredientKey|isCorrect/);
  }
});

test("T5 actual models have finite volumetric meshes for every single food and full correct/wrong/mixed dishes", () => {
  const built = esbuild.buildSync({ entryPoints: [path.join(__dirname, "../src/client/final-kitchen-model.js")],
    bundle: true, write: false, format: "cjs", platform: "node", external: ["three"] });
  const loaded = new Module(__filename, module); loaded.paths = module.paths; loaded._compile(built.outputFiles[0].text, __filename);
  const { buildKitchenModel } = loaded.exports;
  const pixels = new Uint8ClampedArray(96 * 96 * 4).fill(230), texture = new THREE.Texture();
  const photo = { size: 96, pixels, parts: [{ minX: .25, maxX: .75, minY: .25, maxY: .75, area: 2000, color: new THREE.Color(0xc0a070) }], patch: [.3, .3, .15] };
  let cases = 0;
  for (const station of bank) for (const dish of station.dishes) {
    const assets = new Map(dish.items.map(item => [item.id, { texture, photo }]));
    for (const name of Object.keys(dish.surfaceTextures)) assets.set(`surface:${name}`, { texture, photo: { materialSurface: true } });
    const correct = dish.items.filter(item => dish.correctIngredientIds.includes(item.id));
    const wrong = dish.items.filter(item => !dish.correctIngredientIds.includes(item.id));
    for (const selected of [...dish.items.map(item => [item]), correct, wrong, [correct[0], correct[1], wrong[0], wrong[1]]]) {
      cases++; const maps = new Set();
      const model = buildKitchenModel(dish, selected, assets, dish.baseImageUrl ? { texture, photo } : null, maps);
      const box = new THREE.Box3().setFromObject(model), extent = box.getSize(new THREE.Vector3());
      assert.ok(extent.y > .015 && extent.x > 0 && extent.z > 0, dish.title);
      assert.deepEqual(new Set(model.userData.representedIds), new Set(selected.map(item => item.id)));
      model.traverse(child => {
        if (!child.isMesh) return;
        const positions = child.geometry.getAttribute("position");
        for (const v of positions.array) assert.ok(Number.isFinite(v));
        child.geometry.dispose(); (Array.isArray(child.material) ? child.material : [child.material]).forEach(m => m.dispose());
      }); maps.forEach(map => map.dispose());
    }
  }
  texture.dispose(); assert.equal(cases, 77);
});
