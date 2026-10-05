const ROOT = '/assets/olympiad/visual-v7/margherita';
const picture = name => `${ROOT}/${name}.webp`;
const products = [
  ['p_031dba', 'dough', 'Тесто для пиццы'],
  ['p_a12867', 'tomato-oil', 'Томаты и оливковое масло'],
  ['p_c64e19', 'mozzarella', 'Моцарелла'],
  ['p_76be40', 'basil', 'Базилик'],
  ['p_946ac2', 'cheddar', 'Чеддер'],
  ['p_e18d52', 'cucumber', 'Огурец'],
  ['p_b296fa', 'egg', 'Варёное яйцо'],
  ['p_f40a71', 'chicken', 'Курица гриль']
];

export const pizzaDish = {
  title: 'Пицца «Маргарита»',
  variant: 'Классическая версия с моцареллой',
  preset: 'photo-pizza',
  maxItems: 4,
  imageUrl: picture('baked-01'),
  imageAlt: 'Целая испечённая Маргарита: томаты, моцарелла и базилик',
  note: 'Тесто из муки, воды, соли и дрожжей; измельчённые томаты, моцарелла, базилик и оливковое масло extra virgin. Томаты и масло объединены в одну карточку, но добавляются на разных этапах.',
  items: products.map(([id, kind, text]) => ({ id, kind, text, imageUrl: picture('card-' + kind) }))
};
export const PIZZA_STAGES = ['select', 'shaped', 'sauced', 'topped', 'served'];
export const PIZZA_OPERATIONS = {
  select: { label: 'Растянуть тесто и сформировать основу', hint: 'Растяните готовое отдохнувшее тесто от центра к краям. Оставьте бортик, не прижимая его.' },
  shaped: { label: 'Распределить томаты по основе', hint: 'Распределите измельчённые томаты по центру, оставляя бортик свободным. Оливковое масло из этой карточки добавим после начинки.' },
  sauced: { label: 'Разложить начинку и добавить масло', hint: 'Распределите выбранную начинку по основе. Если выбраны томаты с маслом, добавьте масло тонкой струйкой поверх начинки.' },
  topped: { label: 'Испечь пиццу и подать', hint: 'Перенесите собранную пиццу в печь. После выпечки подайте: бортик подрумянится, а выбранный сыр расплавится.' },
  served: { label: '', hint: 'Пицца испечена и подана. Сравните выбранные продукты с заявленной версией и попробуйте другой состав.' }
};

function choose(items, size, start = 0, prefix = [], result = []) {
  if (!size) { result.push(prefix); return result; }
  for (let index = start; index <= items.length - size; index++) choose(items, size - 1, index + 1, [...prefix, items[index]], result);
  return result;
}
export const pizzaCombinations = choose(products.map(item => item[0]), 4);
export const bakedCombinations = pizzaCombinations.filter(ids => ids.includes(products[0][0]));
export const pizzaKey = ids => [...ids].sort().join('+');
const bakedByKey = new Map(bakedCombinations.map((ids, index) => [pizzaKey(ids), picture('baked-' + String(index + 1).padStart(2, '0'))]));

export function pizzaSelection(ids) {
  const input = [...ids];
  if (new Set(input).size !== input.length || input.length > 4 || input.some(id => !products.some(product => product[0] === id))) throw new Error('Invalid demo pizza selection');
  return pizzaDish.items.filter(item => input.includes(item.id));
}

export function nextPizzaStage(stage, ids) {
  const items = pizzaSelection(ids);
  const index = PIZZA_STAGES.indexOf(stage);
  if (index < 0) throw new Error('Unknown pizza stage');
  return items.length === 4 ? PIZZA_STAGES[Math.min(index + 1, PIZZA_STAGES.length - 1)] : stage;
}

export function planPizza(ids, stage = 'select', layout = 'balanced') {
  const items = pizzaSelection(ids);
  if (!PIZZA_STAGES.includes(stage)) throw new Error('Unknown pizza stage');
  if (!['balanced', 'turned'].includes(layout)) throw new Error('Unknown pizza layout');
  const complete = items.length === 4;
  const dough = items.find(item => item.kind === 'dough');
  const tomato = items.find(item => item.kind === 'tomato-oil');
  const effective = complete ? stage : 'select';
  const key = pizzaKey(items.map(item => item.id));
  const tray = !dough || effective === 'select';
  let layers;
  if (tray) layers = items.map(item => ({ kind: 'tray', id: item.id, path: item.imageUrl, alt: item.text }));
  else if (effective === 'served') {
    const path = bakedByKey.get(key);
    if (!path) throw new Error('Missing exact baked composition');
    layers = [{ kind: 'baked', path, alt: `Испечённая пицца. Выбранный состав: ${items.map(item => item.text).join(', ')}.` }];
  } else {
    layers = [{ kind: 'base', id: dough.id, path: picture('shaped'), alt: 'Сформированная сырая основа с неприжатым бортиком' }];
    if (tomato && ['sauced', 'topped'].includes(effective)) layers.push({ kind: 'tomato', id: tomato.id, path: picture('layer-tomato'), alt: 'Измельчённые томаты на сырой основе', angle: 0, scale: .84 });
    if (effective === 'topped') {
      for (const [index, item] of items.filter(item => !['dough', 'tomato-oil'].includes(item.kind)).entries()) layers.push({ kind: 'topping', id: item.id, path: picture('layer-' + item.kind), alt: item.text, angle: layout === 'turned' ? 28 + index * 47 : index * 31, scale: .78 });
      if (tomato) layers.push({ kind: 'oil', id: tomato.id, path: picture('layer-oil'), alt: 'Оливковое масло добавлено поверх начинки', angle: 0, scale: .78 });
    }
  }
  return { key, stage: effective, phase: !items.length ? 'empty' : tray ? (dough ? 'mise' : 'no-base') : effective,
    complete, basis: Boolean(dough), tomato: Boolean(tomato), layers, paths: layers.map(layer => layer.path),
    angle: !tray && effective === 'served' && layout === 'turned' ? 12 : 0 };
}

export function reviewPizza(ids) {
  const items = pizzaSelection(ids);
  const required = pizzaDish.items.slice(0, 4);
  return { matches: items.length === 4 && required.every(item => items.some(selected => selected.id === item.id)),
    missing: required.filter(item => !items.some(selected => selected.id === item.id)).map(item => item.text),
    extra: items.filter(item => !required.some(requiredItem => requiredItem.id === item.id)).map(item => item.text) };
}
