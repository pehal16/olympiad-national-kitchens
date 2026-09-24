const test = require("node:test");
const assert = require("node:assert/strict");

const olympiad = require("../data/olympiad");
const {
  buildVariant,
  remapQuestionIdentifiers,
  sanitizeQuestion,
  validateQuestionStructure
} = require("../src/variant");
const { scoreQuestion, validateAnswerPayload } = require("../src/scoring");

function correctAnswerFor(question) {
  if (question.type === "single_choice") {
    return {
      selectedOptionId: question.options.find((option) => option.isCorrect).id
    };
  }
  if (question.type === "sequence_drag") {
    return { sequence: [...question.correctSequence] };
  }
  if (question.type === "bucket_sort") {
    return { buckets: { ...question.correctBuckets } };
  }
  if (question.type === "ingredient_matrix") {
    return {
      buckets: Object.fromEntries(
        question.correctIngredientIds.map((itemId) => [itemId, question.selectedBucketId])
      )
    };
  }
  if (question.type === "dish_assembly") {
    return { selectedIngredientIds: [...question.correctIngredientIds] };
  }
  throw new Error(`Unsupported question type in test: ${question.type}`);
}

test("buildVariant creates a complete 5-tour individual route", () => {
  const variant = buildVariant(olympiad);

  assert.equal(variant.tours.length, olympiad.tours.length);
  assert.equal(
    variant.questions.length,
    variant.tours.reduce((sum, tour) => sum + tour.questionCount, 0)
  );

  const runtimeIds = variant.questions.map((question) => question.id);
  assert.equal(new Set(runtimeIds).size, runtimeIds.length);

  variant.questions.forEach((question, index) => {
    assert.ok(question.sourceId, "question must keep sourceId");
    assert.ok(question.tourId, "question must have tourId");
    assert.equal(question.globalIndex, index + 1);
    assert.ok(question.sequenceInTour >= 1, "question must know position inside tour");
  });
});

test("sanitizeQuestion removes checking keys but preserves participant-safe structure", () => {
  const variant = buildVariant(olympiad);
  const attempt = {
    answers: {
      [variant.questions[0].id]: {
        answerPayload: correctAnswerFor(variant.questions[0])
      }
    }
  };

  const sanitized = sanitizeQuestion(variant.questions[0], attempt);

  assert.ok(sanitized);
  assert.equal(sanitized.id, variant.questions[0].id);
  assert.equal("sourceId" in sanitized, false);
  assert.equal("dishId" in sanitized, false);
  assert.equal("caseId" in sanitized, false);
  assert.deepEqual(sanitized.savedAnswer, correctAnswerFor(variant.questions[0]));
  assert.equal("correctSequence" in sanitized, false);
  assert.equal("correctBuckets" in sanitized, false);
  assert.equal("correctIngredientIds" in sanitized, false);
  assert.equal(sanitized.metadata, null);
});

test("buildVariant is reproducible from a saved seed", () => {
  const left = buildVariant(olympiad, { seed: "fixed-seed-for-audit" });
  const right = buildVariant(olympiad, { seed: "fixed-seed-for-audit" });

  assert.equal(left.seed, "fixed-seed-for-audit");
  assert.deepEqual(left.issuedQuestionIds, right.issuedQuestionIds);
  assert.deepEqual(left.optionOrderLog, right.optionOrderLog);
  assert.deepEqual(left.questions, right.questions);
});

test("issued questions use opaque per-question ids without semantic answer hints", () => {
  const variant = buildVariant(olympiad, { seed: "opaque-id-regression" });
  const forbiddenHints = /(?:good|bad|correct|required|distractor)/i;

  variant.questions.forEach((question) => {
    const publicQuestion = sanitizeQuestion(question, { answers: {} });
    const answer = correctAnswerFor(question);
    const publicJson = JSON.stringify(publicQuestion);

    assert.match(publicQuestion.id, /^q_\d{20}$/);
    publicQuestion.options.forEach((option) => assert.match(option.id, /^o_\d{20}$/));
    publicQuestion.items.forEach((item) => assert.match(item.id, /^i_\d{20}$/));
    publicQuestion.buckets.forEach((bucket) => assert.match(bucket.id, /^b_\d{20}$/));
    publicQuestion.slots.forEach((slot) => assert.match(slot.id, /^s_\d{20}$/));
    assert.doesNotMatch(publicJson, forbiddenHints);
    assert.equal(validateAnswerPayload(question, answer), true);
    assert.equal(scoreQuestion(question, answer).finalScore, question.maxScore);
    if (question.type === "ingredient_matrix") {
      assert.match(publicQuestion.selectedBucketId, /^b_\d{20}$/);
      assert.equal(
        publicQuestion.buckets.some((bucket) => bucket.id === publicQuestion.selectedBucketId),
        true
      );
    }
  });

  const bucketQuestion = variant.questions.find((question) => question.type === "bucket_sort");
  assert.ok(bucketQuestion, "variant includes a bucket task");
  assert.equal(Object.keys(bucketQuestion.correctBuckets).every((id) => /^i_\d{20}$/.test(id)), true);
  assert.equal(Object.values(bucketQuestion.correctBuckets).every((id) => /^b_\d{20}$/.test(id)), true);
});

test("dish assembly remaps semantic item ids together with its private key", () => {
  const question = remapQuestionIdentifiers(
    {
      id: "q_00000000000000000000",
      type: "dish_assembly",
      prompt: "Соберите блюдо",
      maxScore: 6,
      recipeScope: "international_classic",
      metadata: {
        assetRefs: ["/assets/olympiad/private/required.png"],
        qualityFlags: ["weak-distractor"],
        methodicalFocus: "correct-answer-review"
      },
      items: [
        {
          id: "required",
          text: "Основной компонент",
          imageUrl: "/assets/olympiad/cards/card-01.webp",
          imageAlt: "Основной компонент",
          layerImageUrl: "/assets/olympiad/layers/layer-01.png"
        },
        {
          id: "distractor",
          text: "Дополнительный компонент",
          imageUrl: "/assets/olympiad/cards/card-02.webp",
          imageAlt: "Дополнительный компонент",
          layerImageUrl: "/assets/olympiad/layers/layer-02.png"
        }
      ],
      correctIngredientIds: ["required"],
      dishVisual: {
        variantLabel: "Классическая версия"
      }
    },
    "dish-remap-regression"
  );
  const answer = { selectedIngredientIds: [...question.correctIngredientIds] };
  const publicQuestion = sanitizeQuestion(question, { answers: {} });

  assert.deepEqual(question.correctIngredientIds, [question.items[0].id]);
  assert.match(question.items[0].id, /^i_\d{20}$/);
  assert.doesNotMatch(JSON.stringify(publicQuestion), /(?:required|distractor|correct|good|bad)/i);
  assert.equal(validateAnswerPayload(question, answer), true);
  assert.equal(scoreQuestion(question, answer).finalScore, 6);
});

test("seeded variants can issue every tour 2 source block", () => {
  const expected = olympiad.questionBank.tour2Blocks.map((block) => block.id).sort();
  const issued = new Set();

  for (let index = 0; index < 256; index += 1) {
    const variant = buildVariant(olympiad, { seed: `tour-2-exposure-${index}` });
    variant.questions
      .filter((question) => question.tourId === "tour-2")
      .forEach((question) => issued.add(question.sourceId));
  }

  assert.deepEqual([...issued].sort(), expected);
});

test("sanitizeQuestion preserves visual media but removes the dish key", () => {
  const question = {
    id: "dish-runtime-1",
    sourceId: "dish-source-1",
    type: "dish_assembly",
    prompt: "Соберите блюдо",
    maxScore: 5,
    recipeScope: "international_classic",
    metadata: {
      theme: "Состав блюда",
      privateKey: { correctIngredientIds: ["ingredient-1"] }
    },
    items: [
      {
        id: "ingredient-1",
        text: "Компонент",
        imageUrl: "/assets/olympiad/demo.webp",
        imageAlt: "Компонент на нейтральном фоне",
        layerImageUrl: "/assets/olympiad/demo-layer.png",
        model3d: { kind: "basil" }
      }
    ],
    correctIngredientIds: ["ingredient-1"],
    dishVisual: {
      baseImageUrl: "/assets/olympiad/base.webp",
      baseImageAlt: "Основа блюда",
      variantLabel: "Утверждённый вариант",
      sourceNote: "Источник указан в паспорте задания",
      renderMode: "procedural_3d_v1",
      modelPreset: "pizza"
    }
  };

  const sanitized = sanitizeQuestion(question, { answers: {} });

  assert.equal(sanitized.items[0].imageUrl, "/assets/olympiad/demo.webp");
  assert.equal(sanitized.items[0].layerImageUrl, "/assets/olympiad/demo-layer.png");
  assert.deepEqual(sanitized.items[0].model3d, { kind: "basil" });
  assert.equal(sanitized.dishVisual.variantLabel, "Утверждённый вариант");
  assert.equal(sanitized.dishVisual.renderMode, "procedural_3d_v1");
  assert.equal(sanitized.dishVisual.modelPreset, "pizza");
  assert.equal(sanitized.recipeScope, "international_classic");
  assert.equal("correctIngredientIds" in sanitized, false);
  assert.equal(sanitized.metadata, null);
});

test("source-backed 3D dish assemblies are valid and keep answer keys private", () => {
  const visualQuestions = olympiad.questionBank.tour3Matrices.filter(
    (question) => question.type === "dish_assembly"
  );

  assert.deepEqual(visualQuestions.map((question) => question.id), ["T3-13", "T3-14"]);
  visualQuestions.forEach((question) => {
    assert.doesNotThrow(() => validateQuestionStructure(question));
    assert.equal(question.items.every((item) => item.imageUrl && item.layerImageUrl), true);
    assert.equal(question.items.every((item) => item.model3d?.kind), true);
    const publicQuestion = sanitizeQuestion(question, { answers: {} });
    assert.equal("correctIngredientIds" in publicQuestion, false);
    assert.equal(publicQuestion.items.every((item) => item.model3d?.kind), true);
  });
});

test("3D dish validation rejects partial or unknown model coverage", () => {
  const source = olympiad.questionBank.tour3Matrices.find((question) => question.id === "T3-13");
  const broken = structuredClone(source);
  broken.items[0].model3d = { kind: "unsupported_model" };

  assert.throws(
    () => validateQuestionStructure(broken),
    /неполную или неподдерживаемую 3D-модель/
  );
});

test("visual question validation rejects external media and an unspecified recipe variant", () => {
  const baseQuestion = {
    id: "dish-source-qa",
    type: "dish_assembly",
    prompt: "Соберите блюдо",
    maxScore: 5,
    recipeScope: "international_classic",
    items: [{ id: "ingredient-1", text: "Компонент" }],
    correctIngredientIds: ["ingredient-1"],
    dishVisual: { variantLabel: "Международная классическая версия" }
  };

  assert.throws(
    () =>
      validateQuestionStructure({
        ...baseQuestion,
        items: [
          {
            id: "ingredient-1",
            text: "Компонент",
            imageUrl: "https://example.com/ingredient.webp",
            imageAlt: "Компонент"
          }
        ]
      }),
    /внешний или небезопасный/
  );
  assert.throws(
    () =>
      validateQuestionStructure({
        ...baseQuestion,
        recipeScope: "",
        dishVisual: { variantLabel: "" }
      }),
    /некорректную визуальную сборку/
  );
  assert.throws(
    () =>
      validateQuestionStructure({
        ...baseQuestion,
        correctIngredientIds: ["ingredient-1", "ingredient-1"]
      }),
    /некорректную визуальную сборку/
  );
  assert.throws(
    () =>
      validateQuestionStructure({
        ...baseQuestion,
        items: [
          {
            id: "ingredient-1",
            text: "Компонент",
            imageUrl: "/assets/olympiad/cards/ingredient-required.webp",
            imageAlt: "Компонент"
          }
        ]
      }),
    /имя файла, раскрывающее ключ/
  );
  assert.throws(
    () =>
      validateQuestionStructure({
        ...baseQuestion,
        items: [
          { id: "ingredient-1", text: "Компонент", layerImageUrl: "/assets/olympiad/layers/layer-01.png" },
          { id: "ingredient-2", text: "Другой компонент", layerImageUrl: "" }
        ]
      }),
    /некорректную визуальную сборку/
  );
});

test("bucket remapping rejects extra or unknown answer-map identifiers", () => {
  assert.throws(
    () =>
      remapQuestionIdentifiers(
        {
          id: "bucket-map-regression",
          type: "bucket_sort",
          items: [{ id: "item-1", text: "Карточка" }],
          buckets: [{ id: "bucket-1", label: "Зона" }],
          correctBuckets: {
            "item-1": "bucket-1",
            "item-typo": "bucket-1"
          }
        },
        "bucket-map-regression"
      ),
    /неизвестный идентификатор в correctBuckets/
  );
});
