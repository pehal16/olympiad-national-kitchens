const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const olympiad = require("../data/olympiad");
const bank = require("../data/banks/tour4");
const { buildVariant, sanitizeQuestion, validateQuestionStructure } = require("../src/variant");
const { scoreQuestion, validateAnswerPayload } = require("../src/scoring");
const { createState } = require("../public/t4-guest-order");

test("T4 eight fixed orders, 32 distinct menu positions, 32/10 within unchanged 150/45/45", () => {
  assert.equal(bank.length, 8);
  const dishes = bank.flatMap((q) => q.options.map((o) => o.menuDishId));
  assert.equal(new Set(dishes).size, 32);
  const otherTargets = new Set([
    ...olympiad.questionBank.tour2Blocks.flatMap((q) => q.dishIds),
    ...olympiad.questionBank.tour3Matrices.map((q) => q.dishId),
    ...olympiad.questionBank.tour5Cases.map((q) => q.dishId),
    "croissant", "ramen", "khinkali", "taco", "tom_yum", "lasagna", "sushi", "pilaf", "paella", "hotdog",
    "margherita_pizza", "burger", "shawarma", "greek_salad", "caesar_salad", "adjarian_khachapuri", "philadelphia_roll"
  ]);
  dishes.forEach((id) => assert.equal(otherTargets.has(id), false, id));
  bank.forEach((q, index) => {
    assert.equal(q.id, `T4-${String(index + 1).padStart(2, "0")}`);
    assert.equal(q.guestOrder.number, index + 1);
    assert.equal(q.type, "single_choice"); assert.equal(q.interactionMode, "guest_order");
    assert.equal(q.maxScore, 4); assert.equal(q.options.length, 4);
    assert.equal(q.options.filter((o) => o.isCorrect).length, 1);
    assert.doesNotThrow(() => validateQuestionStructure(q));
    q.options.forEach((o) => {
      assert.match(o.text, /[А-Яа-яЁё]/); assert.match(o.description, /[А-Яа-яЁё]/);
      assert.doesNotMatch(o.description, /правильн|подход|гост[ьюя]|заказ|аллерг|безопасн|аутентич|единствен/i);
    });
  });
  const v = buildVariant(olympiad, { seed: "guest-contract" });
  assert.equal(v.blueprintVersion, 9); assert.equal(v.questions.length, 45);
  assert.equal(v.questions.reduce((s, q) => s + q.maxScore, 0), 150);
  assert.equal(olympiad.durationMinutes, 45);
  assert.equal(v.tours.find((t) => t.code === "T4").timeLimitMinutes, 10);
});

test("T4 fixed order and IDs are reproducible; correct screen positions vary", () => {
  const positions = new Set();
  for (let index = 0; index < 100; index++) {
    const seed = `guest-seed-${index}`;
    const v = buildVariant(olympiad, { seed });
    const questions = v.questions.filter((q) => q.tourCode === "T4");
    assert.deepEqual(questions.map((q) => q.sourceId), bank.map((q) => q.id));
    assert.deepEqual(v.optionOrderLog, buildVariant(olympiad, { seed }).optionOrderLog);
    for (const q of questions) {
      assert.match(q.id, /^q_[a-z0-9]+$/);
      q.options.forEach((o) => assert.match(o.id, /^o_[a-z0-9]+$/));
      positions.add(q.options.findIndex((o) => o.isCorrect));
    }
  }
  assert.equal(positions.size, 4);
});

for (const q of bank) {
  test(`${q.id}: every card scores independently 4 or 0 without hints or partial credit`, () => {
    for (const option of q.options) {
      const answer = { selectedOptionId: option.id };
      assert.equal(validateAnswerPayload(q, answer), true);
      const score = option.isCorrect ? 4 : 0;
      assert.deepEqual(scoreQuestion(q, answer), { autoScore: score, finalScore: score, penalty: 0 });
    }
    for (const answer of [{}, { selectedOptionId: null }, { selectedOptionId: "" }]) {
      assert.equal(validateAnswerPayload(q, answer), true);
      assert.equal(scoreQuestion(q, answer).finalScore, 0);
    }
    for (const answer of [[], "menu-1", { selectedOptionId: ["menu-1"] }, { selectedOptionId: 1 },
      { selectedOptionId: {} }, { selectedOptionId: "foreign" }, { selectedOptionId: "menu-1", score: 4 },
      { selectedOptionId: "menu-1", isCorrect: true }]) assert.equal(validateAnswerPayload(q, answer), false);
  });
}

test("T4 complete correct/wrong/mixed runs yield 32/0/16 and forged foreign runtime IDs fail", () => {
  const questions = buildVariant(olympiad, { seed: "score-t4" }).questions.filter((q) => q.tourCode === "T4");
  const total = (pick) => questions.reduce((s, q, i) => s + scoreQuestion(q, { selectedOptionId: pick(q, i).id }).finalScore, 0);
  assert.equal(total((q) => q.options.find((o) => o.isCorrect)), 32);
  assert.equal(total((q) => q.options.find((o) => !o.isCorrect)), 0);
  assert.equal(total((q, i) => q.options.find((o) => o.isCorrect === (i % 2 === 0))), 16);
  assert.equal(validateAnswerPayload(questions[0], { selectedOptionId: questions[1].options[0].id }), false);
});

test("T4 one state powers selection, replacement, clearing and restoration; unknown IDs cannot enter", () => {
  const state = createState(bank[0]);
  assert.deepEqual(state.getAnswer(), { selectedOptionId: null }); assert.equal(state.isComplete(), false);
  assert.equal(state.select(bank[0].options[2].id), true); assert.equal(state.isComplete(), true);
  assert.equal(state.select("unknown"), false); assert.equal(state.getAnswer().selectedOptionId, bank[0].options[2].id);
  state.select(bank[0].options[3].id);
  assert.deepEqual(createState(bank[0], state.getAnswer()).getAnswer(), state.getAnswer());
  state.clear(); assert.equal(state.isComplete(), false);
  assert.equal(createState(bank[0], { selectedOptionId: "other-question" }).isComplete(), false);
});

test("T4 participant whitelist contains current menu media, not keys, prompts, source analysis or next orders", () => {
  const q = buildVariant(olympiad, { seed: "whitelist-t4" }).questions.find((q) => q.tourCode === "T4");
  q.methodical = { matrix: "private", correctOption: "private", sources: ["private"], imagePrompt: "private" };
  q.guestOrder.correctOption = "private";
  q.options.forEach((o) => { o.conditionMatches = ["private"]; o.source = "private"; });
  const result = sanitizeQuestion(q, { answers: {} });
  assert.deepEqual(Object.keys(result.guestOrder).sort(), ["number", "style", "text"]);
  assert.equal(result.presentationVersion, 1);
  result.options.forEach((o) => assert.deepEqual(Object.keys(o).sort(), ["description", "id", "imageAlt", "imageUrl", "text"]));
  assert.doesNotMatch(JSON.stringify(result), /isCorrect|menuDishId|conditionMatches|methodical|matrix|imagePrompt|private|T4-02/);
});

test("T4 rejects external/unsafe/answer-hint media and incomplete menu structure", () => {
  for (const mutate of [
    (q) => { q.options[0].imageUrl = "https://example.com/food.webp"; },
    (q) => { q.options[0].imageUrl = "/assets/olympiad/tour4/../correct.webp"; },
    (q) => { q.options[0].imageAlt = ""; }, (q) => { q.options[0].description = ""; },
    (q) => { q.options.pop(); }, (q) => { q.options[1].isCorrect = true; },
    (q) => { q.options[1].id = q.options[0].id; }, (q) => { q.guestOrder.text = ""; }
  ]) { const q = structuredClone(bank[0]); mutate(q); assert.throws(() => validateQuestionStructure(q)); }
});

test("old T4 technology snapshot stays byte-identical and legacy issued variants remain scoreable", () => {
  const bytes = fs.readFileSync(path.join(__dirname, "../data/banks/tour4-legacy.js"), "utf8").replace(/\r\n/g, "\n");
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), "fffb37b0b58c0bdc78f9c3ee8d33ab667fcba3f7d2caebb933f60d33d66e1ed7");
  const old = structuredClone(olympiad); old.blueprintVersion = 8;
  old.tours.find((t) => t.code === "T4").generation.mode = "logic_tasks";
  old.questionBank.tour4Tasks = require("../data/banks/tour4-legacy");
  const saved = buildVariant(old, { seed: "immutable-old-t4" }); const before = JSON.stringify(saved);
  const legacyChoice = saved.questions.find((q) => q.tourCode === "T4" && q.type === "single_choice");
  assert.equal(scoreQuestion(legacyChoice, { selectedOptionId: legacyChoice.options.find((o) => o.isCorrect).id }).finalScore, 4);
  assert.equal(sanitizeQuestion(legacyChoice, { answers: {} }).interactionMode, undefined);
  buildVariant(olympiad, { seed: "fresh-new-t4" }); assert.equal(JSON.stringify(saved), before);
});

test("all 32 T4 photographs are separate 900x600 WebP files with no EXIF/XMP", () => {
  const seen = new Set();
  bank.flatMap((q) => q.options).forEach((o) => {
    const bytes = fs.readFileSync(path.join(__dirname, "../public", o.imageUrl));
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF"); assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
    // Sharp's opaque still-image WebP uses a lossy VP8 frame; read its actual
    // coded dimensions rather than trusting the export script or filename.
    assert.equal(bytes.toString("ascii", 12, 16), "VP8 ");
    assert.equal(bytes.readUInt16LE(26) & 0x3fff, 900);
    assert.equal(bytes.readUInt16LE(28) & 0x3fff, 600);
    assert.ok(bytes.length > 15000 && bytes.length < 200000, o.text);
    assert.doesNotMatch(bytes.toString("latin1"), /EXIF|XMP /);
    const hash = crypto.createHash("sha256").update(bytes).digest("hex"); assert.equal(seen.has(hash), false); seen.add(hash);
  });
});
