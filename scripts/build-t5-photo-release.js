// Release only reviewed photographs; generation receipts remain in ignored storage.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'public/assets/olympiad/tour5/photo-v4');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const registry = new Map();
function asset(relative) {
  const source = path.join(root, relative), bytes = fs.readFileSync(source), sha256 = hash(bytes);
  const name = sha256.slice(0, 24) + '.webp', url = '/assets/olympiad/tour5/photo-v4/' + name;
  fs.mkdirSync(destination, { recursive: true }); fs.copyFileSync(source, path.join(destination, name));
  registry.set(url, { imageUrl: url, source: relative.replaceAll('\\', '/'), sha256, bytes: bytes.length });
  return url;
}
function choose(items, count, start = 0, prefix = [], result = []) {
  if (!count) { result.push(prefix); return result; }
  for (let i = start; i <= items.length - count; i++) choose(items, count - 1, i + 1, [...prefix, items[i]], result);
  return result;
}
const definitions = [
  { kind: 'pizza', dir: 'visual-v7/margherita', title: 'Пицца «Маргарита»', cuisineLabel: 'Италия', variantLabel: 'Классическая версия с моцареллой', frames: { shaped: 'shaped', oil: 'layer-oil' }, finalPrefix: 'baked',
    products: [['dough','Тесто для пиццы','basis',1],['tomato-oil','Томаты и оливковое масло','sauce',.84],['mozzarella','Моцарелла','top',.78],['basil','Базилик','top',.78],['cheddar','Чеддер','top',.78],['cucumber','Огурец','top',.78],['egg','Варёное яйцо','top',.78],['chicken','Курица гриль','top',.78]] },
  { kind: 'greek', dir: 'visual-v8/greek', title: 'Греческий салат', cuisineLabel: 'Греция', variantLabel: 'Версия без сладкого перца и уксуса', frames: { bowl: 'bowl' }, finalPrefix: 'served',
    products: [['vegetables','Томаты и огурец','base',.9],['onion-olives','Красный лук и оливки','base',.83],['feta','Фета','top',.67],['oil-oregano','Оливковое масло и орегано','dressing',.75],['corn','Кукуруза','base',.65],['chicken','Курица гриль','base',.72],['croutons','Сухарики','top',.65],['mayonnaise','Майонезная заправка','dressing',.6]] },
  { kind: 'roll', dir: 'visual-v5/philadelphia', title: 'Ролл «Филадельфия»', cuisineLabel: 'Ресторанная кухня', variantLabel: 'Ресторанная версия с огурцом', frames: { rice:'rice', flipped:'flipped', rolled:'cover-rice' }, finalPrefix: 'sliced',
    products: [['rice-nori','Рис и нори','basis',1],['cheese','Сливочный сыр','filling',1],['cucumber','Огурец','filling',1],['salmon','Лосось','cover',1,0],['shrimp','Креветки','cover',1,3],['tuna','Тунец','cover',1,1],['eel','Угорь','cover',1,2],['surimi','Крабовые палочки','cover',1,4]] }
];
const dishes = definitions.map(def => {
  const source = name => 'public/assets/olympiad/' + def.dir + '/' + name + '.webp';
  const items = def.products.map(([name,text,role,scale,priority]) => {
    const token = hash('appearance-v4:' + def.kind + ':' + name).slice(0, 16);
    const layer = def.kind === 'roll' ? role === 'basis' || name === 'salmon' ? 'card-' + name : 'filling-' + name : name === 'dough' ? 'shaped' : 'layer-' + (name === 'tomato-oil' ? 'tomato' : name);
    return { id: 'component-' + token, text, imageAlt: text, imageUrl: asset(source('card-' + name)), layerImageUrl: asset(source(layer)), visual: { token, role, scale, ...(priority === undefined ? {} : { priority }) } };
  });
  [...items].sort((a,b) => a.visual.token.localeCompare(b.visual.token)).forEach((item,index) => item.visual.order = index);
  const frames = Object.fromEntries(Object.entries(def.frames).map(([key,name]) => [key,asset(source(name))]));
  if (def.kind === 'roll') def.products.forEach(([name,,, ,priority], index) => { if (priority !== undefined) frames[items[index].visual.token] = asset(source('cover-' + name)); });
  const all = choose(def.products.map((_,index) => index),4), photographed = def.kind === 'greek' ? all : all.filter(indices => indices.includes(0));
  const finals = photographed.map((indices,index) => ({ key: indices.map(i => items[i].visual.token).sort().join('+'), imageUrl: asset(def.kind === 'roll' ? 'public/assets/olympiad/visual-v9/philadelphia/sliced-' + String(index + 1).padStart(2,'0') + '.webp' : source(def.finalPrefix + '-' + String(index + 1).padStart(2,'0'))) }));
  finals.sort((a,b)=>a.key.localeCompare(b.key));
  return { id: 'dish-' + def.kind, title: def.title, cuisineLabel: def.cuisineLabel, variantLabel: def.variantLabel, items, photo: { kind: def.kind, frames, finals } };
});
fs.writeFileSync(path.join(root,'src/t5-photo-release.json'), JSON.stringify(dishes,null,2) + '\n');
fs.writeFileSync(path.join(root,'docs/olympiad-t5-photo-release-assets.json'), JSON.stringify({ version:4, assetCount:registry.size, assets:[...registry.values()] },null,2) + '\n');
console.log(JSON.stringify({ dishes:dishes.length, assets:registry.size, photographedCompositions:dishes.map(dish=>dish.photo.finals.length) }));
