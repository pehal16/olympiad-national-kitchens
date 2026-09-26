// Private bank: docs/olympiad-t2-source-register.md. Association, not exclusive invention.
function task(number, title, pairs) {
  return {
    id: `T2-${String(number).padStart(2, "0")}`, type: "bucket_sort", interactionMode: "country_match",
    prompt: title, note: "", maxScore: 4, cuisine: "mixed", cuisineGroup: "general",
    cuisines: pairs.map((pair) => pair[2]), dishIds: pairs.map((pair) => pair[0]),
    metadata: { taskKind: "country_match", estimatedSeconds: 60, theme: title },
    items: pairs.map(([dishId, text], index) => ({
      id: `dish-${index + 1}`, dishId, text,
      imageUrl: `/assets/olympiad/tour2/t2-active-${String((number - 1) * 4 + index + 1).padStart(2, "0")}.webp`,
      imageAlt: `Фотография блюда «${text}»`
    })),
    buckets: pairs.map(([, , id, label]) => ({ id, label, flagUrl: `/assets/olympiad/flags/${id}.svg` })),
    correctBuckets: Object.fromEntries(pairs.map(([, , country], index) => [`dish-${index + 1}`, country]))
  };
}
module.exports = [
  task(1, "Европейская классика", [
    ["tiramisu", "Тирамису", "it", "Италия"], ["ratatouille", "Рататуй", "fr", "Франция"],
    ["wiener_schnitzel", "Венский шницель", "at", "Австрия"], ["fish_and_chips", "Фиш-энд-чипс", "gb", "Великобритания"]
  ]),
  task(2, "Азия", [
    ["onigiri", "Онигири", "jp", "Япония"], ["bibimbap", "Бибимбап", "kr", "Республика Корея"],
    ["pho", "Фо", "vn", "Вьетнам"], ["pad_thai", "Пад-тай", "th", "Таиланд"]
  ]),
  task(3, "Европейские вкусы", [
    ["currywurst", "Карривурст", "de", "Германия"], ["pastel_de_nata", "Паштел-де-ната", "pt", "Португалия"],
    ["gazpacho", "Гаспачо", "es", "Испания"], ["brussels_waffle", "Брюссельская вафля", "be", "Бельгия"]
  ]),
  task(4, "От Кавказа до Азии", [
    ["butter_chicken", "Баттер-чикен", "in", "Индия"], ["peking_duck", "Пекинская утка", "cn", "Китай"],
    ["kharcho", "Харчо", "ge", "Грузия"], ["goulash", "Гуляш", "hu", "Венгрия"]
  ]),
  task(5, "Гастрономическая карта", [
    ["poutine", "Poutine", "ca", "Канада"], ["stroopwafels", "Стропвафли", "nl", "Нидерланды"],
    ["buffalo_wings", "Крылышки баффало", "us", "США"], ["kottbullar", "Кёттбуллар", "se", "Швеция"]
  ])
];
