const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const olympiad = require("../data/olympiad");
const bank = require("../data/banks/tour2");
const { buildVariant, sanitizeQuestion, validateQuestionStructure } = require("../src/variant");
const { scoreQuestion, validateAnswerPayload } = require("../src/scoring");
const { createState } = require("../public/t2-country-match");
const expected = [
  [["Тирамису", "it"], ["Рататуй", "fr"], ["Венский шницель", "at"], ["Фиш-энд-чипс", "gb"]],
  [["Онигири", "jp"], ["Бибимбап", "kr"], ["Фо", "vn"], ["Пад-тай", "th"]],
  [["Паштел-де-ната", "pt"], ["Гаспачо", "es"], ["Брюссельская вафля", "be"], ["Салат «Оливье»", "ru"]],
  [["Эклер", "fr"], ["Пекинская утка", "cn"], ["Суп харчо", "ge"], ["Гуляш", "hu"]],
  [["Крылышки баффало", "us"], ["Паста карбонара", "it"], ["Буррито", "mx"], ["Моти", "jp"]]
];
test("T2 fixes five 4x4 tasks, twenty unique dishes, sources and local assets", () => {
  assert.equal(bank.length, 5);
  assert.equal(new Set(bank.flatMap((q) => q.dishIds)).size, 20);
  const register = fs.readFileSync(path.join(__dirname, "../docs/olympiad-t2-source-register.md"), "utf8");
  assert.equal((register.match(/```text/g) || []).length, 26);
  const visualReview = fs.readFileSync(path.join(__dirname, "../docs/olympiad-t2-visual-review.md"), "utf8");
  assert.equal((visualReview.match(/```text/g) || []).length, 20);
  assert.match(register, /flag-icons.*v7\.5\.0/);
  const t1 = new Set(olympiad.questionBank.tour1Pools.flatMap((p) => p.questions.map((q) => q.dishId)));
  bank.forEach((q, index) => {
    assert.equal(q.id, `T2-${String(index + 1).padStart(2, "0")}`);
    assert.equal(q.interactionMode, "country_match");
    assert.equal(q.items.length, 4); assert.equal(q.buckets.length, 4);
    assert.equal(new Set(q.buckets.map((bucket) => bucket.id)).size, 4);
    assert.equal(q.maxScore, 4);
    assert.deepEqual(q.items.map((item) => [item.text, q.correctBuckets[item.id]]), expected[index]);
    assert.doesNotThrow(() => validateQuestionStructure(q));
    assert.ok(q.dishIds.every((id) => !t1.has(id)));
    q.dishIds.forEach((id) => assert.ok(register.includes(`Dish ID: \`${id}\``)));
    assert.doesNotMatch(q.items.map((i) => i.text).join(" "), /Маргарита|Бургер|Шаурма|Донер|Греческий|Цезарь|Аджар|Филадельфия/i);
    q.items.forEach((item) => {
      const bytes = fs.readFileSync(path.join(__dirname, "..", "public", item.imageUrl));
      assert.equal(bytes.subarray(0, 4).toString(), "RIFF");
      assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
      assert.ok(bytes.length > 20_000 && bytes.length < 150_000);
      assert.doesNotMatch(bytes.toString("latin1"), /EXIF|XMP /);
    });
    q.buckets.forEach((b) => {
      const svg = fs.readFileSync(path.join(__dirname, "..", "public", b.flagUrl), "utf8");
      assert.match(svg, /<svg/); assert.doesNotMatch(svg, /<script|<image|<foreignObject|(?:href|src)=["']https?:|onload/i);
    });
  });
});
test("T2 full visual review preserves all non-media content, other banks and historical assets", () => {
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  // The later explicit request covers every image, including T2-01/02; keys/text stay frozen.
  const nonMedia = bank.map((q) => ({ ...q, items: q.items.map(({ imageUrl, ...item }) => item) }));
  assert.equal(hash(JSON.stringify(nonMedia)), "38b3ee7941029796770d8bb2f53c7e48f73f2722ef0aaba665ababd7903c34d3");
  const historical = Array.from({ length: 26 }, (_, i) => fs.readFileSync(path.join(__dirname, `../public/assets/olympiad/tour2/t2-active-${String(i + 1).padStart(2, "0")}.webp`)));
  assert.equal(hash(Buffer.concat(historical)), "5f41cb615758a78f44dd066fb5b4f43b8f3f4726d63b11faa0986bc4c9374caf");
  bank.flatMap((q) => q.items).forEach((item, index) => {
    assert.equal(item.imageUrl, `/assets/olympiad/tour2/t2-active-${index + 27}.webp`);
  });
  const baseline = {
    tour1: "b95c4c9fde6dff7c69436d6d53b9f0eb3723f450c54575c72ef4152e0e1784e9",
    tour3: "683daa6a9306fe4589082b7cc2a4704f37d5ef3af6ac336afabf4549df2a2b6a",
    tour4: "fffb37b0b58c0bdc78f9c3ee8d33ab667fcba3f7d2caebb933f60d33d66e1ed7",
    tour5: "9e506a8267e5ff15b1518c7e5b26ceefe545504dd9b2f26cc4d9bffafd54cdb6"
  };
  for (const [name, checksum] of Object.entries(baseline)) {
    assert.equal(hash(fs.readFileSync(path.join(__dirname, `../data/banks/${name}.js`), "utf8").replace(/\r\n/g, "\n")), checksum, name);
  }
  const activeDishIds = new Set(bank.flatMap((question) => question.dishIds));
  for (const removed of ["currywurst", "butter_chicken", "poutine", "stroopwafels", "kottbullar"]) assert.equal(activeDishIds.has(removed), false);
  for (const added of ["olivier", "eclair", "carbonara", "burrito", "mochi"]) assert.equal(activeDishIds.has(added), true);
  const kharcho = bank[3].items.find((item) => item.dishId === "kharcho");
  assert.equal(kharcho.text, "Суп харчо");
  assert.equal(kharcho.imageUrl, "/assets/olympiad/tour2/t2-active-41.webp");
  // Retired assets remain reachable for immutable historical variants, never overwritten.
  for (let number = 1; number <= 26; number += 1) {
    const url = `/assets/olympiad/tour2/t2-active-${String(number).padStart(2, "0")}.webp`;
    assert.equal(bank.some((question) => question.items.some((item) => item.imageUrl === url)), false);
    assert.ok(fs.existsSync(path.join(__dirname, "..", "public", url)));
  }
  const countryOccurrences = bank.flatMap((q) => q.buckets.map((b) => b.id));
  assert.ok(countryOccurrences.filter((id) => id === "it").length > 1);
  assert.ok(countryOccurrences.filter((id) => id === "fr").length > 1);
  assert.ok(countryOccurrences.filter((id) => id === "jp").length > 1);
  const register = fs.readFileSync(path.join(__dirname, "../docs/olympiad-t2-source-register.md"), "utf8");
  assert.match(register, /Узнаваемость.*важнее количества стран/);
  assert.match(register, /Неактивные \/ отклонённые после пользовательского тестирования/);
  assert.match(register, /Предыдущая ошибка:.*не та разновидность kharcho/);
  assert.match(register, /https:\/\/www\.gastronom\.ru\/recipe\/4632\/sup-harcho-iz-govjadiny-s-risom/);
});
test("each correct match is exactly one point; partial and empty answers have no penalty", () => {
  const permutations = (ids) => ids.length ? ids.flatMap((id, i) => permutations(ids.filter((_, j) => i !== j)).map((tail) => [id, ...tail])) : [[]];
  bank.forEach((q) => {
    for (let mask = 0; mask < 16; mask += 1) {
      const entries = Object.entries(q.correctBuckets).filter((_, i) => mask & (1 << i));
      const payload = { buckets: Object.fromEntries(entries) };
      assert.ok(validateAnswerPayload(q, payload));
      const score = scoreQuestion(q, payload);
      assert.equal(score.finalScore, entries.length); assert.equal(score.penalty, 0);
    }
    const ids = q.buckets.map((b) => b.id);
    permutations(ids).forEach((countries) => {
      const buckets = Object.fromEntries(q.items.map((item, i) => [item.id, countries[i]]));
      const correct = q.items.filter((item) => buckets[item.id] === q.correctBuckets[item.id]).length;
      assert.ok(validateAnswerPayload(q, { buckets }));
      assert.equal(scoreQuestion(q, { buckets }).finalScore, correct);
      assert.equal(scoreQuestion(q, { buckets }).penalty, 0);
    });
    const wrong = Object.fromEntries(q.items.map((item, i) => [item.id, ids[(i + 1) % 4]]));
    assert.equal(scoreQuestion(q, { buckets: wrong }).finalScore, 0);
    assert.equal(scoreQuestion(q, {}).finalScore, 0);
  });
  assert.equal(bank.reduce((sum, q) => sum + scoreQuestion(q, { buckets: q.correctBuckets }).finalScore, 0), 20);
});
test("country matches reject forged, duplicate and noncanonical assignments, preserve legacy many-to-one", () => {
  const q = bank[0];
  assert.equal(validateAnswerPayload(q, { buckets: { "dish-1": "it", "dish-2": "it" } }), false);
  assert.equal(validateAnswerPayload(q, { buckets: { unknown: "it" } }), false);
  assert.equal(validateAnswerPayload(q, { buckets: { "dish-1": "unknown" } }), false);
  assert.equal(validateAnswerPayload(q, { buckets: ["it"] }), false);
  assert.equal(validateAnswerPayload(q, { buckets: q.correctBuckets, correct: true }), false);
  assert.equal(validateAnswerPayload({ ...q, interactionMode: undefined }, { buckets: { "dish-1": "it", "dish-2": "it" } }), true);
  assert.throws(() => validateQuestionStructure({ ...q, maxScore: 10 }), /контракт/);
  assert.throws(() => validateQuestionStructure({ ...q, correctBuckets: { ...q.correctBuckets, "dish-2": "it" } }), /контракт/);
  assert.throws(() => validateQuestionStructure({ ...q, buckets: q.buckets.map((b) => ({ ...b, flagUrl: "https://evil.test/flag.svg" })) }), /контракт/);
});
test("all seeds retain fixed T2 content, score and order but shuffle opaque cards and flags safely", () => {
  const orders = new Set();
  const countryOrders = new Set();
  for (let n = 0; n < 100; n += 1) {
    const v = buildVariant(olympiad, { seed: `t2-${n}` });
    assert.equal(v.questions.length, 41); assert.equal(v.totalMaxScore, 150);
    assert.deepEqual(v.tours.map((t) => [t.code, t.maxScore, t.timeLimitMinutes]), [["T1",20,6],["T2",20,6],["T3",30,8],["T4",32,10],["T5",48,15]]);
    const issued = v.questions.filter((q) => q.tourCode === "T2");
    assert.deepEqual(issued.map((q) => q.sourceId), bank.map((q) => q.id));
    orders.add(issued[0].items.map((item) => item.text).join("|"));
    countryOrders.add(issued[0].buckets.map((bucket) => bucket.label).join("|"));
    issued.forEach((q) => {
      const safe = sanitizeQuestion(q, { answers: {} });
      assert.equal(safe.interactionMode, "country_match");
      assert.match(safe.id, /^q_\d{20}$/);
      assert.ok(safe.items.every((i) => /^i_\d{20}$/.test(i.id)));
      assert.doesNotMatch(JSON.stringify(safe), /correctBuckets|sourceId|dishIds|dishId|assetRefs|isCorrect|T2-0/);
      assert.equal(new Set(Object.values(q.correctBuckets)).size, 4);
      assert.equal(scoreQuestion(q, { buckets: q.correctBuckets }).finalScore, 4);
      assert.ok(validateAnswerPayload(q, { buckets: q.correctBuckets }));
    });
  }
  assert.ok(orders.size > 1);
  assert.ok(countryOrders.size > 1);
});
test("client model keeps one-to-one placement, explicit displacement, undo and partial answers", () => {
  const state = createState(bank[0]);
  assert.equal(state.isComplete(), false);
  state.assign("dish-1", "it"); state.assign("dish-2", "fr");
  assert.deepEqual(state.assign("dish-2", "it"), { changed: true, displaced: "dish-1" });
  assert.deepEqual(state.getAnswer(), { buckets: { "dish-2": "it" } });
  assert.deepEqual(state.assign("dish-2", "it"), { changed: false });
  assert.deepEqual(state.assign("unknown", "it"), { changed: false });
  state.undo("dish-2"); assert.deepEqual(state.getAnswer(), { buckets: {} });
  Object.entries(bank[0].correctBuckets).forEach(([dish, country]) => state.assign(dish, country));
  assert.equal(state.isComplete(), true);
  const copy = state.getAnswer(); copy.buckets["dish-1"] = "fr";
  assert.equal(state.getAnswer().buckets["dish-1"], "it");
  const hydrated = createState(bank[0], { buckets: { "dish-1": "it", "dish-2": "it", unknown: "fr" } });
  assert.deepEqual(hydrated.getAnswer(), { buckets: { "dish-1": "it" } });
});
