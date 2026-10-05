'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const loadDemo = () => import('data:text/javascript;base64,' + fs.readFileSync(
  path.join(root, 'public/visual-demo-photography.js')).toString('base64'));

test('demo photographs represent the exact chosen set in every ordering', async () => {
  const { philadelphia: dish, planPhotos } = await loadDemo();
  const compositions = [];
  function visit(ids, start) {
    compositions.push(ids);
    if (ids.length === 4) return;
    for (let i = start; i < dish.items.length; i++) visit([...ids, dish.items[i].id], i + 1);
  }
  visit([], 0);
  assert.equal(compositions.length, 163);
  let availableFinals = 0;
  for (const ids of compositions) {
    const plan = planPhotos(ids, dish);
    assert.deepEqual(planPhotos([...ids].reverse(), dish), plan);
    if (ids.length === 4) {
      const exactPhoto = dish.finals.find(photo => photo.ids.every(id => ids.includes(id)));
      assert.deepEqual(plan.paths, exactPhoto ? [exactPhoto.imageUrl] : []);
      assert.equal(plan.phase, exactPhoto ? 'assembled' : 'unprepared');
      if (exactPhoto) availableFinals++;
    } else {
      assert.equal(plan.phase, ids.length ? 'open' : 'empty');
      assert.deepEqual(new Set(plan.paths), new Set(dish.items.filter(item => ids.includes(item.id)).map(item => item.layerUrl)));
    }
  }
  assert.equal(availableFinals, 4, 'an incomplete sample must not claim 70 final photos');
  assert.throws(() => planPhotos([dish.items[0].id, dish.items[0].id], dish));
  assert.throws(() => planPhotos(['unlisted-product'], dish));
  assert.throws(() => planPhotos(dish.items.slice(0, 5).map(item => item.id), dish));
});

test('all demo card and assembly photographs exist in the public package', async () => {
  const { philadelphia: dish } = await loadDemo();
  const urls = new Set([dish.imageUrl, ...dish.items.flatMap(item => [item.imageUrl, item.layerUrl]), ...dish.finals.map(item => item.imageUrl)]);
  assert.equal(urls.size, 20);
  for (const url of urls) {
    assert.match(url, /^\/assets\/olympiad\/[a-z0-9/.-]+\.webp$/);
    const bytes = fs.readFileSync(path.join(root, 'public', url));
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', url);
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', url);
  }
});
