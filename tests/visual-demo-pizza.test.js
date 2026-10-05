const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const moduleUrl = 'data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'public/visual-demo-pizza.js')).toString('base64');
const catalog = () => import(moduleUrl);

test('all 70 pizza compositions retain only selected products across preparation and serving', async () => {
  const { pizzaCombinations, bakedCombinations, PIZZA_STAGES, planPizza, nextPizzaStage } = await catalog();
  assert.equal(pizzaCombinations.length, 70);
  assert.equal(bakedCombinations.length, 35);
  const finals = new Set();
  for (const ids of pizzaCombinations) for (const layout of ['balanced', 'turned']) for (const stage of PIZZA_STAGES) {
    const plan = planPizza(ids, stage, layout);
    assert.deepEqual(planPizza([...ids].reverse(), stage, layout), plan);
    assert.equal(plan.complete, true);
    assert.ok(plan.paths.length);
    assert.ok(plan.paths.every(url => fs.existsSync(path.join(root, 'public', url))), `${plan.key}/${stage} has no missing assets`);
    for (const layer of plan.layers.filter(layer => layer.id)) assert.ok(ids.includes(layer.id), 'no unselected ingredients');
    assert.equal(nextPizzaStage(stage, ids), PIZZA_STAGES[Math.min(PIZZA_STAGES.indexOf(stage) + 1, 4)]);
    if (!ids.includes('p_031dba')) {
      assert.equal(plan.phase, 'no-base');
      assert.ok(plan.layers.every(layer => layer.kind === 'tray'));
      assert.deepEqual(plan.layers.map(layer => layer.id).sort(), [...ids].sort());
      assert.ok(!plan.paths.some(url => /shaped|baked-|layer-/.test(url)), 'no invented dough or assembled pizza');
    } else if (stage === 'served') {
      assert.equal(plan.layers.length, 1);
      assert.equal(plan.layers[0].kind, 'baked');
      finals.add(plan.paths[0]);
    } else if (stage !== 'select') {
      assert.equal(plan.layers[0].kind, 'base');
      assert.ok(!plan.paths.some(url => /baked-/.test(url)), 'baked food belongs after the bake');
      assert.equal(plan.layers.some(layer => layer.kind === 'tomato'), ids.includes('p_a12867') && ['sauced', 'topped'].includes(stage));
      assert.equal(plan.layers.some(layer => layer.kind === 'oil'), ids.includes('p_a12867') && stage === 'topped', 'oil comes after toppings');
      assert.equal(plan.layers.filter(layer => layer.kind === 'topping').length, stage === 'topped' ? ids.filter(id => !['p_031dba', 'p_a12867'].includes(id)).length : 0);
    }
  }
  assert.equal(finals.size, 35, 'every composition with dough has its own exact baked photograph');
});

test('all 163 complete and incomplete pizza choices have neutral quantity gates', async () => {
  const { pizzaDish, planPizza, nextPizzaStage } = await catalog();
  let count = 0;
  function visit(ids, start) {
    count++;
    for (const stage of ['select', 'shaped', 'sauced', 'topped', 'served']) {
      const plan = planPizza(ids, stage);
      assert.equal(plan.complete, ids.length === 4);
      if (ids.length < 4) {
        assert.equal(plan.stage, 'select');
        assert.ok(plan.layers.every(layer => layer.kind === 'tray'));
        assert.equal(nextPizzaStage(stage, ids), stage);
      }
    }
    if (ids.length < 4) for (let index = start; index < 8; index++) visit([...ids, pizzaDish.items[index].id], index + 1);
  }
  visit([], 0);
  assert.equal(count, 163);
});

test('pizza rejects duplicate, unknown and oversized choices instead of changing the food', async () => {
  const { pizzaSelection, pizzaDish, planPizza } = await catalog();
  assert.throws(() => pizzaSelection(['unknown']));
  assert.throws(() => pizzaSelection([pizzaDish.items[0].id, pizzaDish.items[0].id]));
  assert.throws(() => pizzaSelection(pizzaDish.items.slice(0, 5).map(item => item.id)));
  assert.throws(() => planPizza([], 'unknown'));
  assert.throws(() => planPizza([], 'select', 'fake-3d'));
});

test('the classic demo includes olive oil and does not introduce compulsory unselected foods', async () => {
  const { pizzaDish, reviewPizza, planPizza } = await catalog();
  const correct = pizzaDish.items.slice(0, 4).map(item => item.id);
  assert.equal(reviewPizza(correct).matches, true);
  assert.equal(reviewPizza([...correct.slice(0, 3), pizzaDish.items[4].id]).matches, false);
  assert.match(pizzaDish.items[1].text, /масло/);
  assert.equal(planPizza(correct, 'served').paths[0].endsWith('baked-01.webp'), true);
  assert.notDeepEqual(planPizza(correct, 'topped', 'balanced').layers, planPizza(correct, 'topped', 'turned').layers);
});

test('reviewed pizza provenance matches all exported images and every baked composition', async () => {
  const { bakedCombinations, pizzaDish, planPizza } = await catalog();
  const inventory = JSON.parse(fs.readFileSync(path.join(root, 'docs/olympiad-margherita-assets.json'), 'utf8'));
  assert.equal(inventory.assets.length, 52);
  for (const asset of inventory.assets) {
    const bytes = fs.readFileSync(path.join(root, 'public', asset.imageUrl));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset.webpSha256);
    assert.ok(asset.review && asset.prompt && asset.nativeSha256);
    assert.ok(asset.dimensions.every(size => size === 1254));
  }
  for (const ids of bakedCombinations) {
    const photo = planPizza(ids, 'served').paths[0];
    const asset = inventory.assets.find(asset => asset.imageUrl === photo);
    const expected = pizzaDish.items.filter(item => ids.includes(item.id)).map(item => item.kind).sort();
    const actual = asset.name === 'baked-01' ? ['dough', 'tomato-oil', 'mozzarella', 'basil'] : asset.selected;
    assert.deepEqual([...actual].sort(), expected, `${asset.name} has exactly this selected composition`);
  }
});
