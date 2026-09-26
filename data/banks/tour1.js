const { makeSingleChoice } = require("./helpers");

// Server-only answer bank. Each pool contains one mandatory photo question.
const dishes = [
  ["Круассан", "Бриошь", "Бейгл", "Брецель"],
  ["Рамен", "Фо-бо", "Лагман", "Том-ям"],
  ["Хинкали", "Манты", "Пельмени", "Вареники"],
  ["Тако", "Буррито", "Кесадилья", "Энчилада"],
  ["Том-ям", "Рамен", "Фо-бо", "Харчо"],
  ["Лазанья", "Каннеллони", "Равиоли", "Ризотто"],
  ["Суши", "Онигири", "Сашими", "Гёдза"],
  ["Плов", "Паэлья", "Ризотто", "Жареный рис"],
  ["Паэлья", "Плов", "Ризотто", "Жареный рис"],
  ["Хот-дог", "Корн-дог", "Панини", "Чизстейк"]
];

module.exports = dishes.map(([correct, ...distractors], index) => {
  const number = String(index + 1).padStart(2, "0");
  const id = `T1-A${number}`;
  const imageUrl = `/assets/olympiad/tour1/t1-active-${number}.webp`;
  return {
    id: `T1-P${number}`,
    title: "Узнай блюдо",
    active: true,
    questions: [{
      ...makeSingleChoice(id, `T1-P${number}`, "Какое блюдо изображено на фотографии?",
        [correct, ...distractors].map((text, optionIndex) => [`${id}-o${optionIndex + 1}`, text]), `${id}-o1`, {
        maxScore: 2, cuisine: "mixed", cuisineGroup: "general",
        theme: "Распознавание блюда по фотографии", taskKind: "photo_recognition", difficulty: "basic",
        competencyTags: ["узнавание блюд по внешнему виду"], estimatedSeconds: 36, assetRefs: [imageUrl]
      }),
      imageUrl,
      imageAlt: `Фотография блюда к вопросу ${index + 1}`
    }]
  };
});
