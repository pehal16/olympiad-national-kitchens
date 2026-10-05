// Local, ungraded photographic workflow. No exam scoring or server answer keys.
const ROOT = '/assets/olympiad/visual-v5/philadelphia';
const photo = name => `${ROOT}/${name}.webp`;
const servingPhoto = name => `/assets/olympiad/visual-v6/philadelphia/${name}.webp`;
export const ROLL_STAGES = ['select', 'rice', 'flipped', 'filling', 'rolled', 'covered', 'served'];
export const ROLL_OPERATIONS = {
  select: { action: 'spread', label: 'Распределить рис на нори', hint: 'Распределите тонкий слой риса по нори. Начинку пока не добавляем.' },
  rice: { action: 'flip', label: 'Перевернуть рисом вниз', hint: 'Переверните основу: рис должен оказаться снизу, а нори — сверху.' },
  flipped: { action: 'fill', label: 'Уложить начинку на нори', hint: 'Уложите начинку на тёмную сторону нори. Продукт для наружного покрытия остаётся отдельно.' },
  filling: { action: 'roll', label: 'Свернуть ковриком', hint: 'Потяните край коврика вверх, чтобы завернуть нори вокруг начинки. Можно использовать кнопку.' },
  rolled: { action: 'cover', label: 'Уложить покрытие снаружи', hint: 'Основа свёрнута рисом наружу. Теперь уложите покрытие на верхнюю и боковые поверхности.' },
  covered: { action: 'serve', label: 'Нарезать ролл и подать', hint: 'Нарежьте собранный ролл на порционные кусочки и аккуратно разложите на тарелке.' },
  served: { action: null, label: '', hint: 'Ролл нарезан и готов к подаче. Сравните состав с заявленной версией и попробуйте другую композицию.' }
};
const PRODUCTS = {
  p_7e36d2: 'rice-nori', p_b921a4: 'cheese', p_40f8c1: 'cucumber', p_d61b09: 'salmon',
  p_2ab7e5: 'shrimp', p_893cd0: 'tuna', p_e5047a: 'eel', p_16af93: 'surimi'
};
const OUTER_PRIORITY = ['p_d61b09', 'p_893cd0', 'p_e5047a', 'p_2ab7e5', 'p_16af93'];
const SAMPLE = ['p_7e36d2', 'p_b921a4', 'p_40f8c1', 'p_d61b09'].sort().join('+');
function choices(items,count,start=0,prefix=[],out=[]) {
  if (!count) { out.push(prefix); return out; }
  for (let i=start;i<=items.length-count;i++) choices(items,count-1,i+1,[...prefix,items[i]],out);
  return out;
}
const exactFinals = new Map(choices(Object.keys(PRODUCTS),4).filter(ids=>ids.includes('p_7e36d2')).map((ids,index)=>[
  [...ids].sort().join('+'), '/assets/olympiad/visual-v9/philadelphia/sliced-'+String(index+1).padStart(2,'0')+'.webp'
]));

export function createWholeRollDish(base) {
  return {
    ...base, preset: 'whole-roll', variant: 'Ресторанная версия с огурцом',
    imageUrl: servingPhoto('sliced-sample'),
    imageAlt: 'Ролл Филадельфия нарезан на порционные кусочки: сыр и огурец внутри нори, рис и лосось снаружи',
    note: 'Версия с огурцом. Начинку укладываем на нори, сворачиваем рисом наружу и покрываем лососем. В конце нарезаем на порционные кусочки и выкладываем на тарелку.',
    items: base.items.map(item => ({ ...item, imageUrl: photo(`card-${PRODUCTS[item.id]}`) }))
  };
}

function validate(ids, dish) {
  if (ids.length > dish.maxItems || new Set(ids).size !== ids.length || ids.some(id => !dish.items.some(item => item.id === id))) {
    throw new Error('Invalid composition');
  }
}

export function rollRoles(selectedIds, dish, reverse = false) {
  const ids = [...selectedIds];
  validate(ids, dish);
  const basis = ids.includes('p_7e36d2');
  // Salmon is never a filling in this Philadelphia workflow.
  const outerId = OUTER_PRIORITY.find(id => ids.includes(id));
  const fillingIds = dish.items.filter(item => ids.includes(item.id) && item.id !== 'p_7e36d2' && item.id !== outerId).map(item => item.id);
  if (reverse) fillingIds.reverse();
  return { basis, outerId, outer: outerId ? PRODUCTS[outerId] : 'rice', fillingIds };
}

export function nextRollStage(stage, action, selectedIds, dish) {
  const ids = [...selectedIds];
  validate(ids, dish);
  const index = ROLL_STAGES.indexOf(stage);
  if (index < 0) throw new Error('Invalid assembly stage');
  if (['edit', 'clear', 'change'].includes(action)) return 'select';
  // Stage progression is quantity-only for every one of the 70 compositions.
  if (ids.length === dish.maxItems && action && action === ROLL_OPERATIONS[stage].action) return ROLL_STAGES[index + 1];
  return stage;
}

export function reviewRollComposition(selectedIds, dish) {
  const ids = [...selectedIds];
  validate(ids, dish);
  if (ids.length !== dish.maxItems) throw new Error('Incomplete composition');
  const expected = SAMPLE.split('+');
  return {
    matches: ids.every(id => expected.includes(id)),
    missing: dish.items.filter(item => expected.includes(item.id) && !ids.includes(item.id)).map(item => item.text),
    extra: dish.items.filter(item => ids.includes(item.id) && !expected.includes(item.id)).map(item => item.text)
  };
}

export function planWholeRoll(selectedIds, dish, stage = 'select', options = {}) {
  const ids = [...selectedIds].sort();
  validate(ids, dish);
  if (!ROLL_STAGES.includes(stage)) throw new Error('Invalid assembly stage');
  if (stage !== 'select' && ids.length !== dish.maxItems) throw new Error('Incomplete composition');
  const key = ids.join('+') || 'empty';
  const roles = rollRoles(ids, dish, options.reverse);
  const layers = [];
  const plan = { key, stage, roles, phase: 'frame', layers, paths: [], angle: 0, alt: '', message: '' };
  if (!ids.length) return { ...plan, phase: 'empty', message: 'Выберите четыре продукта для вашей сборки' };
  if (stage === 'select' || !roles.basis) {
    for (const item of dish.items.filter(item => ids.includes(item.id))) layers.push({ url: item.imageUrl, kind: 'tray', id: item.id, alt: item.text });
    plan.phase = stage === 'select' ? 'mise' : 'no-base';
    if (!roles.basis && stage !== 'select') plan.message = 'В выбранном составе нет риса и нори: продукты остаются без свёрнутой основы.';
    plan.alt = 'Выбранные продукты до сборки';
  } else {
    let frame = stage === 'rice' ? 'rice' : stage === 'flipped' || stage === 'filling' ? 'flipped'
      : stage === 'rolled' ? 'cover-rice' : stage === 'covered' ? `cover-${roles.outer}` : `sliced-${roles.outer}`;
    if (options.rolling && stage === 'filling') frame = 'rolling';
    const sample = key === SAMPLE;
    if (stage === 'filling' && sample && !options.reverse && !options.rolling) frame = 'filling';
    if (stage === 'served' && options.presentation !== 'straight') plan.angle = -14;
    layers.push({ url: stage === 'served' ? exactFinals.get(key) : photo(frame), kind: 'frame', alt: '' });
    if (stage === 'filling' && !options.rolling && !(sample && !options.reverse)) {
      roles.fillingIds.forEach((id, index) => layers.push({ url: photo(`filling-${PRODUCTS[id]}`), kind: 'filling', id, top: 18 + index * 8, alt: dish.items.find(item => item.id === id).text }));
    }
    plan.alt = stage === 'rice' ? 'Рис распределён по нори, начинки ещё нет'
      : stage === 'flipped' ? 'Основа перевёрнута: нори сверху, рис снизу'
      : stage === 'filling' ? (options.rolling ? 'Коврик заворачивает нори вокруг начинки; покрытия ещё нет' : 'Выбранная начинка лежит на нори, рис снизу, наружное покрытие остаётся отдельно')
      : stage === 'rolled' ? 'Целая свёрнутая основа с рисом снаружи, без наружного покрытия'
      : stage === 'covered' ? 'Выбранное покрытие снаружи на целой свёрнутой основе'
      : 'Ролл нарезан на порционные кусочки; на срезах показана выбранная начинка, покрытие снаружи';
  }
  plan.paths = layers.map(layer => layer.url);
  return plan;
}
