const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const olympiad = require("../data/olympiad");
const reserve = require("../data/banks/tour1-reserve");
const { buildVariant, sanitizeQuestion, validateQuestionStructure } = require("../src/variant");
const { scoreQuestion } = require("../src/scoring");

const expected = ["Круассан", "Рамен", "Хинкали", "Тако", "Том-ям", "Лазанья", "Суши", "Плов", "Паэлья", "Хот-дог"];
const questions = olympiad.questionBank.tour1Pools.filter((pool) => pool.active).flatMap((pool) => pool.questions);

test("T1 has ten mandatory, unambiguous single-choice photo questions and neutral optimized assets", () => {
  assert.equal(questions.length, 10);
  assert.deepEqual(questions.map((q) => q.options.find((o) => o.isCorrect).text), expected);
  assert.equal(questions.reduce((sum, q) => sum + q.maxScore, 0), 20);
  questions.forEach((q, i) => {
    assert.equal(q.type, "single_choice");
    assert.equal(q.prompt, "Какое блюдо изображено на фотографии?");
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options.map((o) => o.text)).size, 4);
    assert.equal(q.options.filter((o) => o.isCorrect).length, 1);
    assert.equal(q.maxScore, 2);
    assert.equal(q.imageUrl, `/assets/olympiad/tour1/t1-active-${String(i + 1).padStart(2, "0")}.webp`);
    assert.equal(q.imageAlt, `Фотография блюда к вопросу ${i + 1}`);
    const bytes = fs.readFileSync(path.join(__dirname, "..", "public", q.imageUrl));
    assert.equal(bytes.subarray(0, 4).toString(), "RIFF");
    assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
    assert.ok(bytes.length > 20_000 && bytes.length < 350_000);
    assert.doesNotThrow(() => validateQuestionStructure(q));
    q.options.forEach((o) => assert.equal(scoreQuestion(q, { selectedOptionId: o.id }).finalScore, o.isCorrect ? 2 : 0));
    assert.equal(scoreQuestion(q, {}).finalScore, 0);
    assert.doesNotMatch(JSON.stringify(q.options), /Маргарита|Бургер|Шаурма|Донер|Греческий салат|Цезарь|Аджар|Филадельфия/i);
  });
});

test("different seeds preserve T1 source order, score contracts, and safe opaque payloads; reserve is excluded", () => {
  const optionOrders = new Set();
  for (let i = 0; i < 100; i += 1) {
    const variant = buildVariant(olympiad, { seed: `fixed-photo-${i}` });
    const issued = variant.questions.filter((q) => q.tourCode === "T1");
    assert.deepEqual(issued.map((q) => q.sourceId), questions.map((q) => q.id));
    assert.deepEqual(variant.tours.map((tour) => [tour.code, tour.questionCount, tour.maxScore]), [
      ["T1", 10, 20], ["T2", 5, 20], ["T3", 10, 30], ["T4", 8, 32], ["T5", 12, 48]
    ]);
    assert.equal(variant.questions.reduce((sum, q) => sum + q.maxScore, 0), 150);
    assert.equal(variant.totalMaxScore, 150);
    assert.equal(olympiad.durationMinutes, 45);
    optionOrders.add(issued[0].options.map((o) => o.text).join("|"));
    issued.forEach((q) => {
      const safe = sanitizeQuestion(q, { answers: {} });
      assert.match(safe.id, /^q_\d{20}$/);
      assert.deepEqual(safe.options.map((o) => Object.keys(o).sort()), Array(4).fill(["id", "text"]));
      assert.equal(safe.metadata, null);
      assert.equal(safe.cuisine, "mixed");
      assert.ok(!safe.dishLabel);
      assert.equal(safe.imageUrl, q.imageUrl);
      for (const key of ["sourceId", "poolId", "dishId", "correctAnswer", "isCorrect", "activationRequires"]) {
        assert.equal(key in safe, false);
      }
      assert.doesNotMatch(JSON.stringify(safe), /T1-A|T1-R|isCorrect|sourceId|assetRefs/);
    });
    assert.equal(variant.questions.some((q) => reserve.some((r) => r.id === q.sourceId)), false);
  }
  assert.ok(optionOrders.size > 1, "option order is still individually shuffled");
  assert.equal(reserve.length, 15);
  assert.ok(reserve.every((r) => r.active === false && r.status === "reserve" && r.imageUrl === null));
});

test("photo validation rejects unsafe media and malformed fixed T1; no migration of stored attempts", () => {
  assert.throws(() => validateQuestionStructure({ ...questions[0], imageUrl: "https://example.com/1.webp" }), /небезопасный/);
  assert.throws(() => validateQuestionStructure({ ...questions[0], imageAlt: "" }), /alt/);
  assert.throws(() => validateQuestionStructure({ ...questions[0], imageUrl: "/assets/olympiad/correct.webp" }), /раскрывающее/);
  const malformed = structuredClone(olympiad);
  malformed.questionBank.tour1Pools.reverse();
  assert.throws(() => buildVariant(malformed, { seed: "bad-fixed-bank" }), /10 фиксированных/);
  // Old issued questions remain renderable/sanitizable without photo fields.
  const old = { id: "q_00000000000000000000", type: "single_choice", prompt: "Старый вопрос", maxScore: 2,
    options: [{ id: "a", text: "Да", isCorrect: true }, { id: "b", text: "Нет", isCorrect: false }] };
  assert.equal("imageUrl" in sanitizeQuestion(old, { answers: {} }), false);
  assert.equal(scoreQuestion(old, { selectedOptionId: "a" }).finalScore, 2);
});
