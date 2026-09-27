// Private bank: docs/olympiad-t2-source-register.md. Association, not exclusive invention.
function task(number, title, pairs) {
  return {
    id: `T2-${String(number).padStart(2, "0")}`, type: "bucket_sort", interactionMode: "country_match",
    prompt: title, note: "", maxScore: 4, cuisine: "mixed", cuisineGroup: "general",
    cuisines: pairs.map((pair) => pair[2]), dishIds: pairs.map((pair) => pair[0]),
    metadata: { taskKind: "country_match", estimatedSeconds: 60, theme: title },
    // New visuals have new neutral numbers; issued attempts keep their original asset URLs.
    items: pairs.map(([dishId, text, , , assetNumber], index) => ({
      id: `dish-${index + 1}`, dishId, text,
      imageUrl: `/assets/olympiad/tour2/t2-active-${String(assetNumber ?? ((number - 1) * 4 + index + 1)).padStart(2, "0")}.webp`,
      imageAlt: `Фотография блюда «${text}»`
    })),
    buckets: pairs.map(([, , id, label]) => ({ id, label, flagUrl: `/assets/olympiad/flags/${id}.svg` })),
    correctBuckets: Object.fromEntries(pairs.map(([, , country], index) => [`dish-${index + 1}`, country]))
  };
}
module.exports = [
  task(1, "Европейская классика", [
    ["tiramisu", "Тирамису", "it", "Италия", 27], ["ratatouille", "Рататуй", "fr", "Франция", 28],
    ["wiener_schnitzel", "Венский шницель", "at", "Австрия", 29], ["fish_and_chips", "Фиш-энд-чипс", "gb", "Великобритания", 30]
  ]),
  task(2, "Азия", [
    ["onigiri", "Онигири", "jp", "Япония", 31], ["bibimbap", "Бибимбап", "kr", "Республика Корея", 32],
    ["pho", "Фо", "vn", "Вьетнам", 33], ["pad_thai", "Пад-тай", "th", "Таиланд", 34]
  ]),
  task(3, "Европейские вкусы", [
    ["pastel_de_nata", "Паштел-де-ната", "pt", "Португалия", 35], ["gazpacho", "Гаспачо", "es", "Испания", 36],
    ["brussels_waffle", "Брюссельская вафля", "be", "Бельгия", 37], ["olivier", "Салат «Оливье»", "ru", "Россия", 38]
  ]),
  task(4, "От Европы до Азии", [
    ["eclair", "Эклер", "fr", "Франция", 39], ["peking_duck", "Пекинская утка", "cn", "Китай", 40],
    ["kharcho", "Суп харчо", "ge", "Грузия", 41], ["goulash", "Гуляш", "hu", "Венгрия", 42]
  ]),
  task(5, "Гастрономическая карта", [
    ["buffalo_wings", "Крылышки баффало", "us", "США", 43], ["carbonara", "Паста карбонара", "it", "Италия", 44],
    ["burrito", "Буррито", "mx", "Мексика", 45], ["mochi", "Моти", "jp", "Япония", 46]
  ])
];
