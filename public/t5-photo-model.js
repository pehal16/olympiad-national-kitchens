(function (root) {
  'use strict';
  const stages = { pizza: ['select', 'shaped', 'sauced', 'topped', 'served'], greek: ['select', 'base', 'topped', 'dressed', 'served'], roll: ['select', 'rice', 'flipped', 'filling', 'rolled', 'covered', 'served'] };
  const operations = {
    pizza: ['Сформировать основу', 'Распределить соус', 'Разложить начинку', 'Испечь пиццу'],
    greek: ['Разложить основные продукты', 'Добавить верхние компоненты', 'Добавить заправку', 'Завершить сборку'],
    roll: ['Подготовить основу', 'Перевернуть основу', 'Уложить начинку', 'Свернуть ковриком', 'Добавить покрытие', 'Нарезать ролл']
  };
  const key = ids => [...ids].sort().join('+');
  function selection(dish, ids) {
    const input = [...ids];
    if (input.length > 4 || new Set(input).size !== input.length || input.some(id => !dish.items.some(item => item.id === id))) throw new Error('Invalid photo selection');
    return dish.items.filter(item => input.includes(item.id)).sort((a, b) => a.visual.order - b.visual.order);
  }
  function recipeStages(dish) { return stages[dish.photo.kind]; }
  function rollRoles(dish, items) {
    const basis = items.find(item => item.visual.role === 'basis');
    const outer = items.filter(item => item.visual.role === 'cover').sort((a, b) => a.visual.priority - b.visual.priority)[0];
    return { basis, outer, fillings: items.filter(item => item !== basis && item !== outer) };
  }
  function plan(dish, ids, requested = 'select', layout = 'balanced') {
    const items = selection(dish, ids), route = recipeStages(dish);
    if (!route || !route.includes(requested) || !['balanced', 'turned'].includes(layout)) throw new Error('Invalid photo stage');
    const stage = items.length === 4 ? requested : 'select';
    const composition = key(items.map(item => item.visual.token));
    const tray = () => items.map(item => ({ kind: 'tray', path: item.imageUrl, id: item.id, alt: item.text }));
    let layers = [], phase = stage, angle = 0;
    const addLayer = (item, kind = 'layer', extra = {}) => layers.push({ kind, path: item.layerImageUrl, id: item.id, alt: item.text, scale: item.visual.scale || 1, angle: layout === 'turned' ? 24 + layers.length * 17 : 0, ...extra });
    if (!items.length) phase = 'empty';
    else if (stage === 'select') { phase = 'mise'; layers = tray(); }
    else if (stage === 'served') {
      const photo = dish.photo.finals.find(entry => entry.key === composition);
      if (photo) { layers = [{ kind: 'frame', path: photo.imageUrl, alt: 'Ваш состав: ' + items.map(item => item.text).join(', ') }]; angle = layout === 'turned' ? 12 : 0; }
      else if (dish.photo.kind !== 'greek' && !items.some(item => item.visual.role === 'basis')) { phase = 'mise'; layers = tray(); }
      else throw new Error('Exact final photograph missing');
    } else if (dish.photo.kind === 'greek') {
      layers.push({ kind: 'frame', path: dish.photo.frames.bowl, alt: 'Тарелка' });
      const roles = stage === 'base' ? ['base'] : stage === 'topped' ? ['base', 'top'] : ['base', 'top', 'dressing'];
      for (const role of roles) items.filter(item => item.visual.role === role).forEach((item,index) => addLayer(item,'layer',{angle:layout==='turned'?24+index*37:index*17}));
    } else if (dish.photo.kind === 'pizza') {
      const basis = items.find(item => item.visual.role === 'basis');
      if (!basis) { phase = 'mise'; layers = tray(); }
      else {
        layers.push({ kind: 'frame', path: dish.photo.frames.shaped, alt: 'Сформированная основа' });
        if (stage !== 'shaped') items.filter(item => item.visual.role === 'sauce').forEach(item => addLayer(item));
        if (stage === 'topped') {
          items.filter(item => item.visual.role === 'top').forEach((item,index) => addLayer(item,'layer',{angle:layout==='turned'?28+index*47:index*31}));
          items.filter(item => item.visual.role === 'sauce').forEach(item => layers.push({ kind: 'layer', path: dish.photo.frames.oil, alt: 'Выбранный компонент', scale: .76, angle: 0, opacity: .22 }));
        }
      }
    } else {
      const roles = rollRoles(dish, items);
      if (!roles.basis) { phase = 'mise'; layers = tray(); }
      else {
        const frame = stage === 'rice' ? 'rice' : stage === 'flipped' || stage === 'filling' ? 'flipped' : stage === 'rolled' ? 'rolled' : roles.outer ? roles.outer.visual.token : 'rolled';
        layers.push({ kind: 'frame', path: dish.photo.frames[frame], alt: stage === 'rice' ? 'Подготовленная основа' : stage === 'flipped' || stage === 'filling' ? 'Нори сверху, рис снизу' : 'Целый собранный ролл' });
        if (stage === 'filling') roles.fillings.forEach((item, index) => addLayer(item, 'filling', { top: 18 + index * 8, scale: 1, angle: 0 }));
      }
    }
    return { stage, phase, layers, angle, complete: items.length === 4, key: composition };
  }
  function nextStage(dish, ids, stage) {
    const items = selection(dish, ids), route = recipeStages(dish), index = route.indexOf(stage);
    if (index < 0) throw new Error('Invalid photo stage');
    return items.length === 4 ? route[Math.min(index + 1, route.length - 1)] : stage;
  }
  const api = { plan, selection, key, recipeStages, operations, nextStage, rollRoles };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.T5PhotoModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
