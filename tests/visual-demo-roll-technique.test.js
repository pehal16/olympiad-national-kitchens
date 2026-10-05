'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const load = filename => import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'public', filename)).toString('base64'));
async function catalog() {
  const [base, workflow] = await Promise.all([load('visual-demo-photography.js'), load('visual-demo-roll-technique.js')]);
  return { ...workflow, dish: workflow.createWholeRollDish(base.philadelphia) };
}

test('all 70 compositions retain selected foods through every stage, without a canonical fallback', async () => {
  const { dish, nextRollStage, planWholeRoll, ROLL_STAGES, ROLL_OPERATIONS } = await catalog();
  const plans = new Set();
  let count = 0, withBasis = 0;
  function visit(ids, start) {
    if (ids.length < 4) {
      const plan = planWholeRoll(ids, dish);
      assert.deepEqual(planWholeRoll([...ids].reverse(), dish), plan);
      assert.equal(nextRollStage('select', 'spread', ids, dish), 'select');
      if (ids.length) assert.deepEqual(plan.layers.map(layer => layer.id).sort(), [...ids].sort());
      else assert.equal(plan.phase, 'empty');
      for (let i = start; i < dish.items.length; i++) visit([...ids, dish.items[i].id], i + 1);
      return;
    }
    count++;
    const basis = ids.includes('p_7e36d2');
    if (basis) withBasis++;
    for (const presentation of ['straight', 'diagonal']) for (const reverse of [false, true]) {
      for (let i = 0; i < ROLL_STAGES.length; i++) {
        const stage = ROLL_STAGES[i];
        const plan = planWholeRoll(ids, dish, stage, { presentation, reverse });
        assert.deepEqual(planWholeRoll([...ids].reverse(), dish, stage, { presentation, reverse }), plan);
        assert.ok(plan.paths.length, `${plan.key}/${stage} must have an image`);
        assert.notEqual(plan.phase, 'unprepared');
        assert.ok(plan.paths.every(url => fs.existsSync(path.join(root, 'public', url))));
        const next = nextRollStage(stage, ROLL_OPERATIONS[stage].action, ids, dish);
        assert.equal(next, ROLL_STAGES[Math.min(i + 1, ROLL_STAGES.length - 1)]);
        if (!basis) {
          assert.deepEqual(plan.layers.map(layer => layer.id).sort(), [...ids].sort());
          assert.ok(plan.layers.every(layer => layer.kind === 'tray'));
          assert.ok(!plan.paths.some(url => /cover-|plate-|served|sliced-/.test(url)), 'must never add a missing rice/nori basis');
        }
        for (const layer of plan.layers.filter(layer => layer.id)) assert.ok(ids.includes(layer.id), 'no unselected food layer');
        if (basis && stage === 'filling') {
          assert.ok(!plan.roles.fillingIds.includes('p_d61b09'), 'salmon cannot become Philadelphia filling');
          if (plan.layers.length > 1) assert.match(plan.layers[0].url, /\/flipped\.webp$/);
        }
        if (basis && stage === 'rolled') assert.match(plan.paths[0], /\/cover-rice\.webp$/);
        if (basis && stage === 'covered') assert.match(plan.paths[0], new RegExp('/cover-' + plan.roles.outer + '\\.' ));
        if (basis && stage === 'served') assert.match(plan.paths[0], /\/visual-v9\/philadelphia\/sliced-\d{2}\.webp$/);
        if (stage !== 'served') assert.ok(!plan.paths.some(url => /\/sliced-/.test(url)), 'cutting belongs only to the final operation');
      }
      const filling = planWholeRoll(ids, dish, 'filling', { presentation, reverse });
      plans.add(JSON.stringify({ phase: filling.phase, layers: filling.layers, covered: planWholeRoll(ids, dish, 'covered').paths }));
    }
  }
  visit([], 0);
  assert.equal(count, 70);
  assert.equal(withBasis, 35);
  assert.ok(plans.size >= 105, 'different selected fillings and reversed layouts must remain distinguishable');
});

test('Philadelphia is assembled whole before final cutting and serving', async () => {
  const { dish, nextRollStage, planWholeRoll } = await catalog();
  const ids = ['p_7e36d2', 'p_b921a4', 'p_40f8c1', 'p_d61b09'];
  assert.match(planWholeRoll(ids, dish, 'rice').paths[0], /\/rice\.webp$/);
  assert.match(planWholeRoll(ids, dish, 'flipped').paths[0], /\/flipped\.webp$/);
  assert.match(planWholeRoll(ids, dish, 'filling').paths[0], /\/filling\.webp$/);
  assert.match(planWholeRoll(ids, dish, 'filling', { rolling: true }).paths[0], /\/rolling\.webp$/);
  assert.deepEqual(planWholeRoll(ids, dish, 'filling').roles.fillingIds, ['p_b921a4', 'p_40f8c1']);
  assert.match(planWholeRoll(ids, dish, 'covered').paths[0], /\/cover-salmon\.webp$/);
  assert.match(planWholeRoll(ids, dish, 'served', { presentation: 'straight' }).paths[0], /\/sliced-01\.webp$/);
  assert.match(planWholeRoll(ids, dish, 'served', { presentation: 'diagonal' }).paths[0], /\/sliced-01\.webp$/);
  assert.equal(nextRollStage('rice', 'fill', ids, dish), 'rice', 'cannot place filling before flipping');
  assert.equal(nextRollStage('filling', 'cover', ids, dish), 'filling', 'cannot add outer salmon before rolling');
  assert.equal(nextRollStage('covered', 'serve', ids, dish), 'served');
  assert.equal(nextRollStage('served', 'edit', ids, dish), 'select');
  assert.throws(() => planWholeRoll(['alien'], dish));
  assert.throws(() => planWholeRoll([ids[0], ids[0]], dish));
  assert.throws(() => planWholeRoll(ids, dish, 'lay'));
  assert.throws(() => planWholeRoll(ids.slice(0, 3), dish, 'rice'));
});

test('ungraded comparison distinguishes the declared recipe from substitutes', async () => {
  const { dish, reviewRollComposition } = await catalog();
  const ids = dish.items.slice(0, 4).map(item => item.id);
  assert.deepEqual(reviewRollComposition(ids, dish), { matches: true, missing: [], extra: [] });
  const replacement = [...ids.slice(0, 3), 'p_893cd0'];
  assert.deepEqual(reviewRollComposition(replacement, dish), { matches: false, missing: ['Лосось'], extra: ['Тунец'] });
  assert.throws(() => reviewRollComposition(ids.slice(0, 3), dish));
});
