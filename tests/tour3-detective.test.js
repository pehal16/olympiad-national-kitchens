const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const olympiad = require("../data/olympiad");
const bank = require("../data/banks/tour3");
const { buildVariant, sanitizeQuestion, validateQuestionStructure } = require("../src/variant");
const { scoreQuestion, validateAnswerPayload } = require("../src/scoring");
const { normalizeDetectiveAnswer, editDistance, matchDetectiveAnswer } = require("../src/detective-answer");

test("typed answer state stays bounded and requires two nonblank characters", () => {
  const { createState } = require("../public/t3-detective");
  const state = createState();
  assert.deepEqual(state.getAnswer(), { text: "" });
  assert.equal(state.isComplete(), false);
  state.setText(" я "); assert.equal(state.isComplete(), false);
  state.setText(" сырники "); assert.equal(state.isComplete(), true);
  assert.deepEqual(createState(state.getAnswer()).getAnswer(), state.getAnswer());
  state.setText("a".repeat(121)); assert.equal(state.getAnswer().text.length, 120);
});

test("T3 ten fixed dossiers, three clues, 30 points, no duplicate T1/T2/T5 entities", () => {
  assert.equal(bank.length, 10);
  assert.equal(new Set(bank.map((q) => q.dishId)).size, 10);
  const otherIds = new Set([
    ...olympiad.questionBank.tour1Pools.flatMap((p) => p.questions.map((q) => q.dishId)),
    ...olympiad.questionBank.tour2Blocks.flatMap((q) => q.dishIds),
    ...olympiad.questionBank.tour5Cases.map((q) => q.dishId)
  ]);
  // T1's active photo bank has no dishId: also compare its actual answer text.
  const activeTour1Names = olympiad.questionBank.tour1Pools.flatMap((pool) =>
    pool.questions.flatMap((question) => question.options.filter((option) => option.isCorrect)
      .map((option) => normalizeDetectiveAnswer(option.text))));
  for (const q of bank) {
    assert.equal(q.type, "dish_detective");
    assert.equal(q.clues.length, 3);
    assert.equal(q.maxScore, 3);
    assert.equal(otherIds.has(q.dishId), false, q.dishId);
    const names = [q.answerPolicy.canonical, ...q.answerPolicy.aliases, ...q.answerPolicy.english]
      .map(normalizeDetectiveAnswer);
    assert.equal(activeTour1Names.some((name) => names.includes(name)), false, q.dishId);
    assert.doesNotThrow(() => validateQuestionStructure(q));
    assert.ok(fs.statSync(path.join(__dirname, "../public", q.imageUrl)).size > 15000);
  }
  for (let i = 0; i < 100; i += 1) {
    const v = buildVariant(olympiad, { seed: `detective-${i}` });
    assert.deepEqual(v.questions.filter((q) => q.tourCode === "T3").map((q) => q.sourceId), bank.map((q) => q.id));
    assert.equal(v.questions.length, 36);
    assert.equal(v.questions.reduce((sum, q) => sum + q.maxScore, 0), 150);
    assert.equal(v.tours.find((t) => t.code === "T3").timeLimitMinutes, 8);
    assert.equal(olympiad.durationMinutes, 45);
  }
});

test("normalization, punctuation, whitespace, ё/е and transpositions", () => {
  assert.equal(normalizeDetectiveAnswer('  «ЯБЛОЧНЫЙ—ШТРУДЕЛЬ»!.. '), "яблочный штрудель");
  assert.equal(normalizeDetectiveAnswer("ФАЛАФЁЛЬ"), "фалафель");
  assert.equal(editDistance("strduel", "strudel"), 1);
});

for (const q of bank) {
  test(`${q.id} all explicit forms, case and punctuation receive exactly three points`, () => {
    const p = q.answerPolicy;
    for (const form of [p.canonical, ...p.aliases, ...p.english, ...p.misspellings]) {
      for (const text of [form, `  «${form.toUpperCase()}»!..  `]) {
        assert.deepEqual(scoreQuestion(q, { text }), { autoScore: 3, finalScore: 3, penalty: 0 }, text);
      }
    }
  });
  test(`${q.id} wrong dishes, descriptions, multi-answer lists and emptiness are rejected`, () => {
    for (const text of [...q.answerPolicy.rejected, "", " ", "блюдо", "соус из авокадо", "десерт с сыром",
      `это ${q.answerPolicy.canonical}`, `${q.answerPolicy.canonical} или пирог`,
      ...bank.filter((other) => other !== q).flatMap((other) => {
        const p = other.answerPolicy;
        return [p.canonical, ...p.aliases, ...p.english, ...p.misspellings];
      })]) {
      assert.deepEqual(scoreQuestion(q, { text }), { autoScore: 0, finalScore: 0, penalty: 0 }, text);
    }
  });
}

test("bounded fuzzy spelling, compound required tokens, close wrong dishes", () => {
  const check = (index, value, score) => assert.equal(scoreQuestion(bank[index], { text: value }).finalScore, score, value);
  [[0,"сырнки"],[1,"дранки"],[2,"шакшуак"],[3,"самса"],[4,"хумсу"],
    [5,"яблочный штруедль"],[6,"чизкйек"],[7,"начсо"],[8,"гуакамлоэ"],[9,"фалафлеь"]]
    .forEach(([i, value]) => check(i, value, 3));
  [[0,"сырки"],[1,"пряники"],[3,"салса"],[3,"сальса"],[3,"salsa"],[3,"samosa"],[5,"вишневый штрудель"],[5,"яблочный"],
    [6,"чиз"],[6,"cheese cake with berries"],[8,"соус гуакамоле"],[9,"фала"]]
    .forEach(([i, value]) => check(i, value, 0));
});

test("singular, plural, inflections and approved word orders work with bounded typos", () => {
  const cases = [
    [0, ["сырник", "сырников", "сырники творожные", "творожные сырнки", "сырник из творога"]],
    [1, ["драник", "дерун", "драников", "драники картофельные", "картофельные дранки", "оладьи картофельные"]],
    [2, ["шакшуки", "шакшуку", "шакшукой", "шакшукка"]],
    [3, ["самсы", "самсу", "самсой", "самсами", "сомсы", "самсса"]],
    [4, ["хумуса", "хумусом", "хуммусом", "хумсу"]],
    [5, ["штудель яблочный", "яблочный штудель", "штрудель яблочный", "яблочные штрудели",
      "штрудели яблочные", "штудели яблочные", "штрудель с яблоками", "штудель с яблоками", "штруделей", "apple strudels"]],
    [6, ["чизкейки", "чизкейков", "чиз-кейки", "чизкйеки", "cheese cakes"]],
    [7, ["начо", "начосы", "начозы", "nacho"]],
    [8, ["гуакамолле", "гуакомоли", "гуакомолэ"]],
    [9, ["фалафели", "фалафелей", "фалафелями", "фалафэли", "falafels"]]
  ];
  for (const [index, forms] of cases) {
    for (const text of forms) assert.equal(scoreQuestion(bank[index], { text }).finalScore, 3, text);
  }
});

test("expanded aliases never accept close foreign dishes, partial names or extra guesses", () => {
  const cases = [
    [0, ["сырок", "сырка", "сырков", "сырку", "сырком", "сырники блины", "творожные", "творожное",
      "творожной", "творожных", "творожного", "творожным", "творожными"]],
    [1, ["пряник", "пряника", "пряников", "пряниками", "оладьи", "картофельные"]],
    [3, ["салсы", "салсу", "сальсой", "сальсами", "самосу", "самосами", "самосах", "samosas", "somosas", "salsas"]],
    [5, ["штрудель вишневый", "штрудели вишневые", "мясные штрудели", "штрудели мясные", "штрудель с вишней",
      "яблочные", "яблочный штрудель пирог", "штрудель или шарлотка", "apple pie", "apple tart"]],
    [6, ["cheesesteak", "cheese steaks", "чизбургер", "торты"]],
    [7, ["такос", "тако", "чипсы"]],
    [8, ["авокадо", "соус гуакамоле"]],
    [9, ["фала", "котлетки", "тефтельки"]]
  ];
  const falsePositives = cases.flatMap(([index, forms]) => forms
    .filter((text) => scoreQuestion(bank[index], { text }).finalScore !== 0)
    .map((text) => ({ dish: bank[index].dishId, text })));
  assert.deepEqual(falsePositives, []);
});

test("new spelling policy does not mutate or upgrade an already-issued private key", () => {
  const saved = {
    canonical: "яблочный штрудель", aliases: ["штрудель"], english: ["apple strudel", "strudel"],
    misspellings: ["штрудел", "яблочный штрудел"], rejected: ["вишневый штрудель", "пирог"]
  };
  const snapshot = JSON.stringify(saved);
  assert.equal(matchDetectiveAnswer(saved, "штудель яблочный"), false);
  assert.equal(matchDetectiveAnswer(bank[5].answerPolicy, "штудель яблочный"), true);
  assert.equal(JSON.stringify(saved), snapshot);
  const variant = buildVariant(olympiad, { seed: "spelling-policy-8" });
  assert.equal(variant.blueprintVersion, 13);
  const issued = variant.questions.find((q) => q.sourceId === bank[5].id);
  assert.equal(matchDetectiveAnswer(issued.answerPolicy, "штудель яблочный"), true);
});

test("spelling revision preserves authored clues, images, dish identities, order and scores", () => {
  const authored = JSON.stringify(bank.map(({ answerPolicy, ...question }) => question));
  assert.equal(crypto.createHash("sha256").update(authored).digest("hex"),
    "88f27bb75ab486681f2c60812f4c769837df75b08483b19c2cecb601d637c25d");
});

test("explicit forms contain no mixed-script shortcuts or contradictory deny entries", () => {
  for (const q of bank) {
    const p = q.answerPolicy;
    const accepted = [p.canonical, ...p.aliases, ...p.english, ...p.misspellings].map(normalizeDetectiveAnswer);
    assert.equal(new Set(accepted).size, accepted.length, q.dishId);
    for (const form of accepted) {
      assert.ok(form.length <= 120 && form.split(" ").every((word) => /^[а-я]+$|^[a-z]+$/.test(word)), form);
      assert.equal(p.rejected.map(normalizeDetectiveAnswer).includes(form), false, form);
    }
    for (const text of ["cырники", "начосc", "чизкейкc", "шaкшука", "штрудель, шарлотка"]) {
      assert.equal(scoreQuestion(q, { text }).finalScore, 0, text);
    }
  }
});

test("participant whitelist keeps every answer key, aliases and match code server-only", () => {
  const variant = buildVariant(olympiad, { seed: "privacy-t3" });
  for (const q of variant.questions.filter((q) => q.type === "dish_detective")) {
    const publicQuestion = sanitizeQuestion(q, { answers: {} });
    assert.deepEqual(publicQuestion.clues, q.clues);
    for (const key of ["answerPolicy", "canonical", "aliases", "english", "misspellings", "rejected", "dishId", "sourceId"]) {
      assert.equal(key in publicQuestion, false, key);
    }
    assert.equal(publicQuestion.dishLabel, "");
    assert.equal(publicQuestion.imageAlt.includes(q.answerPolicy.canonical), false);
    assert.equal(JSON.stringify(publicQuestion).includes(q.answerPolicy.canonical), false);
  }
  for (const name of ["app.js", "t3-detective.js"]) {
    const source = fs.readFileSync(path.join(__dirname, "../public", name), "utf8");
    assert.doesNotMatch(source, /matchDetectiveAnswer|answerPolicy|acceptedAliases|acceptedEnglish|fuzzyMatches/);
  }
});

test("server payload rejects nonstrings, extra keys, overlength and invisible controls", () => {
  const q = bank[0];
  for (const value of [{}, { text: "" }, { text: "сырники" }]) assert.equal(validateAnswerPayload(q, value), true);
  for (const value of [[], { text: null }, { text: ["сырники"] }, { text: 12 }, { text: "a".repeat(121) },
    { text: "сырники", finalScore: 3 }, { text: "сыр\u200bники" }, { text: "сырники\n" }]) {
    assert.equal(validateAnswerPayload(q, value), false);
  }
});

test("all unrelated banks and legacy T3 remain byte-identical to baseline", () => {
  const expected = {
    tour1: "b95c4c9fde6dff7c69436d6d53b9f0eb3723f450c54575c72ef4152e0e1784e9",
    "tour3-legacy": "683daa6a9306fe4589082b7cc2a4704f37d5ef3af6ac336afabf4549df2a2b6a",
    "tour4-legacy": "fffb37b0b58c0bdc78f9c3ee8d33ab667fcba3f7d2caebb933f60d33d66e1ed7",
    tour5: "9e506a8267e5ff15b1518c7e5b26ceefe545504dd9b2f26cc4d9bffafd54cdb6"
  };
  for (const [name, checksum] of Object.entries(expected)) {
    const source = fs.readFileSync(path.join(__dirname, `../data/banks/${name}.js`), "utf8").replace(/\r\n/g, "\n");
    assert.equal(crypto.createHash("sha256").update(source).digest("hex"), checksum, name);
  }
});
