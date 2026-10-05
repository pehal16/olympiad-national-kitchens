const ROOT = '/assets/olympiad/visual-v8/greek';
const picture = name => `${ROOT}/${name}.webp`;
const products = [
  ['g_6bc841', 'vegetables', 'Томаты и огурец', 'base', .9],
  ['g_f0172a', 'onion-olives', 'Красный лук и оливки', 'base', .83],
  ['g_a90e52', 'feta', 'Фета', 'top', .67],
  ['g_c426d8', 'oil-oregano', 'Оливковое масло и орегано', 'dressing', .75],
  ['g_108e63', 'corn', 'Кукуруза', 'base', .65],
  ['g_e53b29', 'chicken', 'Курица гриль', 'base', .72],
  ['g_709fa4', 'croutons', 'Сухарики', 'top', .65],
  ['g_b12cd6', 'mayonnaise', 'Майонезная заправка', 'dressing', .6]
];

export const greekDish = {
  title: 'Греческий салат',
  variant: 'Версия олимпиады без сладкого перца',
  preset: 'photo-greek', maxItems: 4,
  imageUrl: picture('served-01'),
  imageAlt: 'Греческий салат с крупной нарезкой овощей и фетой сверху',
  note: 'Томаты и огурец, красный лук и оливки, фета, оливковое масло extra virgin и сухой орегано. В этом образце — без сладкого перца и уксуса. Продукты объединены в четыре группы; фету укладываем сверху.',
  items: products.map(([id, kind, text, role, scale]) => ({ id, kind, text, role, scale, imageUrl: picture('card-' + kind) }))
};
export const GREEK_STAGES = ['select', 'base', 'topped', 'dressed', 'served'];
export const GREEK_OPERATIONS = {
  select: { label: 'Разложить основные продукты', hint: 'Все продукты уже подготовлены и нарезаны. Разложите выбранные овощи и другие основные продукты в широкой тарелке; верхние компоненты и заправку оставьте на следующие шаги.' },
  base: { label: 'Добавить верхние компоненты', hint: 'Уложите выбранную фету сверху, сохраняя её форму. Если выбраны сухарики, добавьте их отдельными кусочками. Не кладём продукты, которых нет в вашем составе.' },
  topped: { label: 'Добавить выбранную заправку', hint: 'Добавьте только выбранную заправку. Масло и сухой орегано распределите по продуктам и фете; овощи и сыр не разминаем.' },
  dressed: { label: 'Подать салат', hint: 'Салат не требует нагревания. Завершите подачу: продукты должны оставаться узнаваемыми, а фета — лежать сверху.' },
  served: { label: '', hint: 'Выбранный состав подан. Сравните его с заявленной версией и попробуйте другую композицию.' }
};

function choose(items, size, start = 0, prefix = [], result = []) {
  if (!size) { result.push(prefix); return result; }
  for (let index = start; index <= items.length - size; index++) choose(items, size - 1, index + 1, [...prefix, items[index]], result);
  return result;
}
export const greekCombinations = choose(products.map(item => item[0]), 4);
export const greekKey = ids => [...ids].sort().join('+');
const servedByKey = new Map(greekCombinations.map((ids, index) => [greekKey(ids), picture('served-' + String(index + 1).padStart(2, '0'))]));

export function greekSelection(ids) {
  const input = [...ids];
  if (new Set(input).size !== input.length || input.length > 4 || input.some(id => !products.some(product => product[0] === id))) throw new Error('Invalid demo Greek selection');
  return greekDish.items.filter(item => input.includes(item.id));
}
export function nextGreekStage(stage, ids) {
  const items = greekSelection(ids), index = GREEK_STAGES.indexOf(stage);
  if (index < 0) throw new Error('Unknown Greek stage');
  return items.length === 4 ? GREEK_STAGES[Math.min(index + 1, GREEK_STAGES.length - 1)] : stage;
}
export function planGreek(ids, stage = 'select', layout = 'balanced') {
  const items = greekSelection(ids);
  if (!GREEK_STAGES.includes(stage)) throw new Error('Unknown Greek stage');
  if (!['balanced', 'turned'].includes(layout)) throw new Error('Unknown Greek layout');
  const complete = items.length === 4, effective = complete ? stage : 'select', key = greekKey(items.map(item => item.id));
  let layers;
  if (effective === 'select') layers = items.map(item => ({ kind: 'tray', id: item.id, path: item.imageUrl, alt: item.text }));
  else if (effective === 'served') layers = [{ kind: 'served', path: servedByKey.get(key), alt: 'Поданный состав: ' + items.map(item => item.text).join(', ') }];
  else {
    const visibleRoles = effective === 'base' ? ['base'] : effective === 'topped' ? ['base', 'top'] : ['base', 'top', 'dressing'];
    layers = [{ kind: 'bowl', path: picture('bowl'), alt: 'Широкая керамическая тарелка для выбранного состава' }];
    for (const role of visibleRoles) for (const [index, item] of items.filter(item => item.role === role).entries()) {
      layers.push({ kind: 'layer', productKind: item.kind, role, id: item.id, path: picture('layer-' + item.kind), alt: item.text,
        scale: item.scale, angle: layout === 'turned' ? 24 + index * 37 : index * 17 });
    }
  }
  return { key, stage: effective, phase: !items.length ? 'empty' : effective === 'select' ? 'mise' : effective, complete,
    layers, paths: layers.map(layer => layer.path), angle: effective === 'served' && layout === 'turned' ? 12 : 0,
    pending: items.filter(item => effective !== 'select' && effective !== 'served' && !layers.some(layer => layer.id === item.id)).map(item => item.text) };
}
export function reviewGreek(ids) {
  const items = greekSelection(ids), required = greekDish.items.slice(0, 4);
  return { matches: items.length === 4 && required.every(item => items.some(selected => selected.id === item.id)),
    missing: required.filter(item => !items.some(selected => selected.id === item.id)).map(item => item.text),
    extra: items.filter(item => !required.some(requiredItem => requiredItem.id === item.id)).map(item => item.text) };
}
