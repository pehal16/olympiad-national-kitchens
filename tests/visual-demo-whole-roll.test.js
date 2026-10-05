'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const load = filename => import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'public', filename)).toString('base64'));
async function catalog() {
  const [base, whole] = await Promise.all([load('visual-demo-photography.js'), load('visual-demo-whole-roll.js')]);
  return { ...whole, dish: whole.createWholeRollDish(base.philadelphia) };
}

test('whole-roll workflow accepts every four-card set without grading-dependent gates', async () => {
  const { dish, nextRollStage, planWholeRoll } = await catalog();
  let count = 0, wholeSamples = 0;
  function visit(ids, start) {
    count++;
    const laid = planWholeRoll(ids, dish);
    assert.deepEqual(planWholeRoll([...ids].reverse(), dish), laid);
    assert.equal(laid.phase, ids.length ? 'open' : 'empty');
    assert.deepEqual(laid.paths, dish.items.filter(item => ids.includes(item.id)).map(item => item.layerUrl));
    if (ids.length === 4) {
      assert.equal(nextRollStage('lay', 'roll', ids, dish), 'rolled');
      assert.equal(nextRollStage('rolled', 'serve', ids, dish), 'served');
      for (const stage of ['rolled', 'served']) {
        const plan = planWholeRoll(ids, dish, stage);
        assert.deepEqual(planWholeRoll([...ids].reverse(), dish, stage), plan);
        const sample = dish.finals.find(item => item.ids.every(id => ids.includes(id)));
        assert.equal(plan.phase, sample ? 'whole' : 'unprepared');
        assert.deepEqual(plan.paths, sample ? [sample.imageUrl] : []);
      }
      if (planWholeRoll(ids, dish, 'served').phase === 'whole') wholeSamples++;
    } else {
      assert.equal(nextRollStage('lay', 'roll', ids, dish), 'lay');
      assert.throws(() => planWholeRoll(ids, dish, 'rolled'));
    }
    if (ids.length === 4) return;
    for (let i = start; i < dish.items.length; i++) visit([...ids, dish.items[i].id], i + 1);
  }
  visit([], 0);
  assert.equal(count, 163);
  assert.equal(wholeSamples, 1, 'one whole-roll sample must not be substituted for other compositions');
});

test('editing or clearing returns an intact roll to its selected open composition', async () => {
  const { dish, nextRollStage, planWholeRoll } = await catalog();
  const ids = dish.finals[0].ids;
  for (const stage of ['lay', 'rolled', 'served']) {
    for (const action of ['edit', 'clear', 'change']) assert.equal(nextRollStage(stage, action, ids, dish), 'lay');
  }
  assert.equal(nextRollStage('lay', 'serve', ids, dish), 'lay');
  assert.equal(nextRollStage('served', 'roll', ids, dish), 'served');
  assert.equal(nextRollStage('lay', 'slice', ids, dish), 'lay');
  assert.throws(() => planWholeRoll(['alien'], dish));
  assert.throws(() => planWholeRoll([ids[0], ids[0]], dish));
  assert.throws(() => planWholeRoll(dish.items.slice(0, 5).map(item => item.id), dish));
  assert.throws(() => planWholeRoll(ids, dish, 'sliced'));
});

test('whole-roll preview points to a new WebP without overwriting cut-roll originals', async () => {
  const { dish } = await catalog();
  assert.equal(dish.preset, 'whole-roll');
  assert.match(dish.imageAlt, /без нарезки/);
  assert.equal(dish.finals.length, 1);
  assert.match(dish.imageUrl, /^\/assets\/olympiad\/visual-v4\/philadelphia\/whole-roll-v1\.webp$/);
  const bytes = fs.readFileSync(path.join(root, 'public', dish.imageUrl));
  assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
  assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
  assert.ok(fs.existsSync(path.join(root, 'public/assets/olympiad/visual-v3/philadelphia/05912790113024a4.webp')));
});
