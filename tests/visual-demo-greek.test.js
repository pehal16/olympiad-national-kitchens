const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const catalog = () => import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'public/visual-demo-greek.js')).toString('base64'));

test('all 70 Greek choices keep exact selected foods in every stage and presentation', async () => {
  const { greekDish, greekCombinations, GREEK_STAGES, planGreek, nextGreekStage } = await catalog();
  assert.equal(greekCombinations.length, 70);
  const finals = new Set();
  for (const ids of greekCombinations) for (const layout of ['balanced', 'turned']) for (const stage of GREEK_STAGES) {
    const plan = planGreek(ids, stage, layout);
    assert.deepEqual(planGreek([...ids].reverse(), stage, layout), plan);
    assert.equal(plan.complete, true);
    assert.ok(plan.paths.length);
    for (const url of plan.paths) assert.ok(fs.existsSync(path.join(root, 'public', url)), url);
    for (const layer of plan.layers.filter(layer => layer.id)) assert.ok(ids.includes(layer.id), 'no unselected product');
    assert.equal(nextGreekStage(stage, ids), GREEK_STAGES[Math.min(GREEK_STAGES.indexOf(stage) + 1, 4)]);
    if (stage === 'served') {
      assert.equal(plan.layers.length, 1);
      assert.equal(plan.layers[0].kind, 'served');
      finals.add(plan.paths[0]);
    } else if (stage === 'select') {
      assert.ok(plan.layers.every(layer => layer.kind === 'tray'));
      assert.deepEqual(plan.layers.map(layer => layer.id).sort(), [...ids].sort());
    } else {
      assert.equal(plan.layers[0].kind, 'bowl');
      const roles = stage === 'base' ? ['base'] : stage === 'topped' ? ['base', 'top'] : ['base', 'top', 'dressing'];
      const expected = greekDish.items.filter(item => ids.includes(item.id) && roles.includes(item.role)).map(item => item.id).sort();
      assert.deepEqual(plan.layers.filter(layer => layer.id).map(layer => layer.id).sort(), expected);
      const order = plan.layers.slice(1).map(layer => ['base', 'top', 'dressing'].indexOf(layer.role));
      assert.deepEqual(order, [...order].sort((a, b) => a - b), 'feta is on top and dressing follows it');
      assert.ok(!plan.paths.some(url => /served-/.test(url)));
    }
  }
  assert.equal(finals.size, 70, 'all choices have distinct finished photographs');
});

test('all 163 partial and full Greek choices use quantity-only gates', async () => {
  const { greekDish, GREEK_STAGES, planGreek, nextGreekStage } = await catalog();
  let count = 0;
  function visit(ids, start) {
    count++;
    for (const stage of GREEK_STAGES) {
      const plan = planGreek(ids, stage);
      assert.equal(plan.complete, ids.length === 4);
      if (ids.length < 4) {
        assert.equal(plan.stage, 'select');
        assert.ok(plan.layers.every(layer => layer.kind === 'tray'));
        assert.equal(nextGreekStage(stage, ids), stage);
      }
    }
    if (ids.length < 4) for (let i = start; i < 8; i++) visit([...ids, greekDish.items[i].id], i + 1);
  }
  visit([], 0);
  assert.equal(count, 163);
});

test('Greek demo rejects malformed selections and unknown stages without inventing a base', async () => {
  const { greekDish, greekSelection, planGreek } = await catalog();
  assert.throws(() => greekSelection(['unknown']));
  assert.throws(() => greekSelection([greekDish.items[0].id, greekDish.items[0].id]));
  assert.throws(() => greekSelection(greekDish.items.slice(0, 5).map(item => item.id)));
  assert.throws(() => planGreek([], 'unknown'));
  assert.throws(() => planGreek([], 'select', 'profile-3d'));
  const wrong = greekDish.items.slice(4).map(item => item.id);
  assert.ok(planGreek(wrong, 'dressed').layers.filter(layer => layer.id).every(layer => wrong.includes(layer.id)));
});

test('stated Greek version places feta above vegetables and applies only selected dressing', async () => {
  const { greekDish, planGreek, reviewGreek } = await catalog();
  const correct = greekDish.items.slice(0, 4).map(item => item.id);
  assert.equal(reviewGreek(correct).matches, true);
  assert.equal(reviewGreek([...correct.slice(0, 3), greekDish.items[4].id]).matches, false);
  assert.match(greekDish.variant, /без сладкого перца/);
  assert.match(greekDish.note, /без сладкого перца и уксуса/);
  assert.equal(planGreek(correct, 'base').layers.some(layer => layer.productKind === 'feta'), false);
  assert.equal(planGreek(correct, 'topped').layers.at(-1).productKind, 'feta');
  assert.equal(planGreek(correct, 'topped').layers.some(layer => layer.role === 'dressing'), false);
  assert.equal(planGreek(correct, 'dressed').layers.at(-1).productKind, 'oil-oregano');
  assert.notDeepEqual(planGreek(correct, 'dressed', 'balanced').layers, planGreek(correct, 'dressed', 'turned').layers);
});

test('Greek asset provenance matches all 87 reviewed exports and 70 exact final compositions', async () => {
  const { greekDish, greekCombinations, planGreek } = await catalog();
  const inventory = JSON.parse(fs.readFileSync(path.join(root, 'docs/olympiad-greek-assets.json'), 'utf8'));
  assert.equal(inventory.assets.length, 87);
  for (const asset of inventory.assets) {
    const bytes = fs.readFileSync(path.join(root, 'public', asset.imageUrl));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset.webpSha256);
    assert.ok(asset.review && !/pending/i.test(asset.review) && asset.prompt && asset.nativeSha256);
    assert.deepEqual(asset.dimensions, [1254, 1254]);
  }
  for (const ids of greekCombinations) {
    const asset = inventory.assets.find(asset => asset.imageUrl === planGreek(ids, 'served').paths[0]);
    const expected = greekDish.items.filter(item => ids.includes(item.id)).map(item => item.kind).sort();
    assert.deepEqual([...asset.selected].sort(), expected, asset.name + ' preserves exactly selected foods');
  }
});
