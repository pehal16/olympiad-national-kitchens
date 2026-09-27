const { createHash } = require("node:crypto");

// Server bank. Only the explicit participant whitelist in variant.js is public.
const assetUrl = (key) => `/assets/olympiad/tour5/t5-v1-${createHash("sha256").update(`final-kitchen-v1:${key}`).digest("hex").slice(0, 12)}.webp`;
const surfaceUrl = key => `/assets/olympiad/tour5/materials/t5-v2-${createHash("sha256").update(`final-kitchen-surface-v2:${key}`).digest("hex").slice(0, 12)}.webp`;
const surfaces = {
  burger: { bread: surfaceUrl("bun") }, wrap: { bread: surfaceUrl("lavash") },
  roll: { rice: surfaceUrl("rice"), nori: surfaceUrl("nori"), salmon: surfaceUrl("salmon") }
};

const forms = {
  ham: "ham", basil: "basil", "pizza-tomato": "tomato-sauce", mushrooms: "mushrooms", "olive-oil": "oil",
  pepperoni: "pepperoni", mozzarella: "mozzarella", pesto: "pesto", bacon: "bacon", "burger-bun": "bun",
  "fish-patty": "breaded", "burger-vegetables": "burger-veg", "beef-patty": "beef", "onion-rings": "rings",
  cheddar: "cheddar", "fried-egg": "egg", "sweet-chili": "chili", lavash: "flatbread", surimi: "surimi",
  "wrap-vegetables": "vegetables", chicken: "chicken", salmon: "salmon", "white-sauce": "white-sauce", corn: "corn",
  "salad-croutons": "croutons", feta: "feta", "greek-vegetables": "tomato-cucumber", "salad-corn": "corn",
  "oil-oregano": "oil-herbs", "salad-chicken": "chicken", "onion-olives": "onion-olives", "mayo-dressing": "dressing",
  "caesar-cucumber": "cucumber", romaine: "leaves", "caesar-shrimp": "shrimp", "caesar-chicken": "chicken",
  "croutons-parmesan": "croutons-parmesan", "caesar-feta": "feta", "caesar-dressing": "dressing", "caesar-corn": "corn",
  "boat-mushrooms": "mushrooms", "boat-cheese": "cheese", "boat-tomato": "tomato-sauce", "dough-boat": "boat",
  butter: "butter", mince: "mince", "boat-egg": "egg", "boat-mayo": "dressing", eel: "eel", "rice-nori": "rice-sheet",
  "roll-surimi": "surimi", "roll-salmon": "salmon", "cream-cheese": "cream", "roll-shrimp": "shrimp",
  "roll-cucumber": "cucumber-sticks", tuna: "tuna"
};

function ingredient(key, text, level, width = 3.1, aspect = 1, x = 0, z = 0) {
  return { id: key, ingredientKey: key, text, imageAlt: text,
    imageUrl: assetUrl(key), layerImageUrl: assetUrl(key),
    scene: { level, width, aspect, x, z, angle: 0, form: forms[key],
      ...(key === "burger-bun" ? { parts: [
        { level: 0, width: 3.25, aspect: 2, x: 0, z: 0, angle: 0, crop: [0, .5] },
        { level: 8, width: 3.25, aspect: 2, x: -.5, z: -.65, angle: 0, crop: [.5, .5] }
      ] } : {}) } };
}
function dish(id, title, cuisineLabel, modelPreset, variantLabel, components, keys) {
  return { id, dishId: id, title, cuisineLabel, previewUrl: assetUrl(`${id}:preview`),
    previewAlt: title, variantLabel, modelPreset, presentationVersion: 2, surfaceTextures: surfaces[modelPreset] || {},
    ...(modelPreset === "pizza" ? { baseImageUrl: assetUrl("pizza-base") } : {}),
    items: components, correctIngredientIds: keys };
}

const dishes = [
  dish("margherita_pizza", "Пицца «Маргарита»", "Итальянская кухня", "pizza",
    "Версия олимпиады: готовая основа и четыре компонента начинки.", [
      ingredient("ham", "Ветчина", 3), ingredient("basil", "Свежий базилик", 6, 2.05),
      ingredient("pizza-tomato", "Томатный соус", 1, 3.45), ingredient("mushrooms", "Шампиньоны", 4),
      ingredient("olive-oil", "Оливковое масло", 7, 2.6), ingredient("pepperoni", "Пепперони", 3),
      ingredient("mozzarella", "Моцарелла", 2, 3.3), ingredient("pesto", "Соус песто", 5)
    ], ["pizza-tomato", "mozzarella", "basil", "olive-oil"]),
  dish("burger", "Чизбургер", "Американская кухня", "burger",
    "Версия олимпиады: классический говяжий чизбургер.", [
      ingredient("bacon", "Бекон", 4, 2.8), ingredient("burger-bun", "Булочка: две половины", 0, 3.25),
      ingredient("fish-patty", "Рыбная котлета", 2, 2.65), ingredient("burger-vegetables", "Салат и томат", 5, 2.9),
      ingredient("beef-patty", "Говяжья котлета", 2, 2.65), ingredient("onion-rings", "Луковые кольца", 4, 2.8),
      ingredient("cheddar", "Ломтик сыра", 3, 2.8), ingredient("fried-egg", "Жареное яйцо", 4, 2.8)
    ], ["burger-bun", "beef-patty", "cheddar", "burger-vegetables"]),
  dish("shawarma", "Шаурма с курицей", "Ближневосточная кухня", "wrap",
    "Версия олимпиады: шаурма с курицей.", [
      ingredient("sweet-chili", "Сладкий соус чили", 6, 2.65), ingredient("lavash", "Лаваш", 0, 4.1),
      ingredient("surimi", "Крабовые палочки", 3, 2.6), ingredient("wrap-vegetables", "Овощная смесь", 4, 2.8),
      ingredient("chicken", "Курица", 2, 2.75), ingredient("salmon", "Красная рыба", 2, 2.75),
      ingredient("white-sauce", "Белый соус", 6, 2.7), ingredient("corn", "Кукуруза", 5, 2.7)
    ], ["lavash", "chicken", "wrap-vegetables", "white-sauce"]),
  dish("greek_salad", "Греческий салат", "Греческая кухня", "bowl",
    "Версия олимпиады без сладкого перца; состав объединён в четыре группы.", [
      ingredient("salad-croutons", "Сухарики", 4), ingredient("feta", "Фета", 5),
      ingredient("greek-vegetables", "Томаты и огурец", 1, 3.4), ingredient("salad-corn", "Кукуруза", 4),
      ingredient("oil-oregano", "Оливковое масло и орегано", 6), ingredient("salad-chicken", "Курица", 3),
      ingredient("onion-olives", "Красный лук и оливки", 3), ingredient("mayo-dressing", "Майонезная заправка", 6)
    ], ["greek-vegetables", "onion-olives", "feta", "oil-oregano"]),
  dish("caesar_salad", "Цезарь с курицей", "Международная кухня", "bowl",
    "Версия олимпиады с курицей, не вариант с креветками.", [
      ingredient("caesar-cucumber", "Огурец", 3), ingredient("romaine", "Салат ромэн", 0, 3.65),
      ingredient("caesar-shrimp", "Креветки", 3), ingredient("caesar-chicken", "Курица", 3),
      ingredient("croutons-parmesan", "Сухарики и пармезан", 5, 3.2, 1, .2, .15), ingredient("caesar-feta", "Фета", 5),
      ingredient("caesar-dressing", "Соус «Цезарь»", 6, 2.1), ingredient("caesar-corn", "Кукуруза", 4)
    ], ["romaine", "caesar-chicken", "croutons-parmesan", "caesar-dressing"]),
  dish("adjarian_khachapuri", "Хачапури по-аджарски", "Грузинская кухня", "boat",
    "Версия олимпиады: хачапури в форме лодочки.", [
      ingredient("boat-mushrooms", "Шампиньоны", 3, 2.9), ingredient("boat-cheese", "Сырная начинка", 2, 3.1),
      ingredient("boat-tomato", "Томатный соус", 2, 3.1), ingredient("dough-boat", "Лодочка из теста", 0, 4.15),
      ingredient("butter", "Сливочное масло", 5, 1.1, 1, 0.9), ingredient("mince", "Готовый фарш", 3, 2.9),
      ingredient("boat-egg", "Яйцо", 4, 1.8), ingredient("boat-mayo", "Майонез", 5, 2.8)
    ], ["dough-boat", "boat-cheese", "boat-egg", "butter"]),
  dish("philadelphia_roll", "Ролл «Филадельфия»", "Японская кухня · современная версия", "roll",
    "Версия олимпиады с огурцом. При выборе четырёх компонентов сборка сворачивается.", [
      ingredient("eel", "Угорь", 5, 3.1), ingredient("rice-nori", "Рис и нори", 0, 3.75),
      ingredient("roll-surimi", "Крабовые палочки", 3, 3), ingredient("roll-salmon", "Лосось", 5, 3.2),
      ingredient("cream-cheese", "Сливочный сыр", 2, 3.1), ingredient("roll-shrimp", "Креветки", 4, 3),
      ingredient("roll-cucumber", "Огурец", 3, 3), ingredient("tuna", "Тунец", 5, 3.1)
    ], ["rice-nori", "cream-cheese", "roll-cucumber", "roll-salmon"])
];

const stations = [
  { title: "Горячая сборка", dishes: dishes.slice(0, 3) },
  { title: "Свежая сборка", dishes: dishes.slice(3, 5) },
  { title: "Фирменная сборка", dishes: dishes.slice(5) }
].map((station, index) => ({ id: `T5-station-${index + 1}`, type: "final_kitchen", presentationVersion: 2,
  prompt: "Выберите блюдо и соберите его из четырёх компонентов.", maxScore: 16,
  station: { number: index + 1, title: station.title }, dishes: station.dishes }));

module.exports = stations;
