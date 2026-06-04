const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  getPm01Exam,
  getPm01PublicData,
  buildPm01Variant,
  sanitizePm01Question,
  scorePm01Question,
  summarizePm01Attempt,
  applyPm01VoiceReview
} = require("../src/pm01-engine");

test("PM01 fixed variants keep the 100-point module contract", () => {
  const exam = getPm01Exam();

  exam.variants.forEach((examVariant) => {
    const variant = buildPm01Variant(exam, examVariant.id);
    assert.equal(variant.questions.length, 20);

    variant.modules.forEach((module) => {
      const moduleScore = variant.questions
        .filter((question) => question.moduleId === module.id)
        .reduce((sum, question) => sum + Number(question.maxScore || 0), 0);
      assert.equal(moduleScore, module.maxScore, `${examVariant.id} ${module.code}`);
    });
  });
});

test("PM01 questions keep valid methodological mappings and competency tags", () => {
  const exam = getPm01Exam();

  exam.variants.forEach((examVariant) => {
    const variant = buildPm01Variant(exam, examVariant.id);
    const variantTags = new Set(examVariant.competencies || []);

    variant.questions.forEach((question) => {
      assert.equal(question.prompt.trim().length > 12, true, `${question.id} prompt is meaningful`);
      assert.equal(question.competencyTags.length >= variantTags.size, true, `${question.id} has competency tags`);
      variantTags.forEach((tag) => {
        assert.equal(question.competencyTags.includes(tag), true, `${question.id} includes ${tag}`);
      });

      if (question.moduleId === "test") {
        assert.equal(/^Что такое\s/i.test(question.prompt), false, `${question.id} is framed as a task`);
      }

      if (question.type === "single_choice") {
        assert.equal(question.options.filter((option) => option.isCorrect).length, 1, `${question.id} has one correct option`);
      }

      if (question.type === "multiple_choice") {
        assert.equal(question.options.filter((option) => option.isCorrect).length > 1, true, `${question.id} has several correct options`);
      }

      if (question.type === "sequence_drag") {
        const itemIds = new Set(question.items.map((item) => item.id));
        assert.equal(question.correctSequence.length, question.items.length, `${question.id} sequence is complete`);
        assert.equal(new Set(question.correctSequence).size, question.correctSequence.length, `${question.id} has unique sequence keys`);
        question.correctSequence.forEach((itemId) => {
          assert.equal(itemIds.has(itemId), true, `${question.id} sequence item exists: ${itemId}`);
        });
      }

      if (question.type === "bucket_sort") {
        const itemIds = new Set(question.items.map((item) => item.id));
        const bucketIds = new Set(question.buckets.map((bucket) => bucket.id));
        assert.deepEqual(Object.keys(question.correctBuckets).sort(), [...itemIds].sort(), `${question.id} maps every item`);
        Object.entries(question.correctBuckets).forEach(([itemId, bucketId]) => {
          assert.equal(itemIds.has(itemId), true, `${question.id} item exists: ${itemId}`);
          assert.equal(bucketIds.has(bucketId), true, `${question.id} bucket exists: ${bucketId}`);
        });
        if (question.visualMode === "cut_shapes") {
          assert.equal(new Set(Object.values(question.correctBuckets)).size, question.buckets.length, `${question.id} cut targets are one-to-one`);
        }
      }
    });
  });
});

test("sanitizePm01Question hides private checking data from students", () => {
  const exam = getPm01Exam();
  const variant = buildPm01Variant(exam, "vegetables");
  const question = variant.questions.find((item) => item.type === "calculation_task");
  const attempt = { answers: {} };

  const publicQuestion = sanitizePm01Question(question, attempt);
  const privateQuestion = sanitizePm01Question(question, attempt, { includePrivate: true });

  assert.equal("solutionSteps" in publicQuestion, false);
  assert.equal("correctAnswer" in publicQuestion, false);
  assert.equal("expected" in publicQuestion.fields[0], false);
  assert.equal(privateQuestion.solutionSteps.length > 0, true);
  assert.equal(privateQuestion.correctAnswer.length > 0, true);
});

test("PM01 public data exposes asset registry without visual answer keys", () => {
  const exam = getPm01Exam();
  const publicData = getPm01PublicData(exam);
  const variant = buildPm01Variant(exam, "vegetables");
  const visualBucket = variant.questions.find((item) => item.visualMode === "cut_shapes");
  const publicQuestion = sanitizePm01Question(visualBucket, { answers: {} });
  const visualSimulation = variant.questions.find((item) => item.id.startsWith("veg-sim-cuts"));
  const publicSimulation = sanitizePm01Question(visualSimulation, { answers: {} });
  const requiredCutShapes = [
    "julienne",
    "brunoise",
    "rondelle",
    "mirepoix",
    "batonnet",
    "wedges",
    "rings",
    "slices",
    "halfRings",
    "mediumCubes",
    "largeCubes",
    "shashki",
    "shavings",
    "balls"
  ];

  assert.equal(publicData.assetRegistry.workshops.vegetables.includes("vegetable-workshop.png"), true);
  assert.equal(publicData.assetRegistry.cutShapes.batonnet.endsWith("batonnet.png"), true);
  assert.equal(publicData.assetRegistry.cutShapes.slices.endsWith("slices.png"), true);
  assert.equal(publicData.programTitle.includes("ПМ.01"), true);
  assert.equal(publicData.developer, "Преподаватель Постовит Дмитрий Александрович");
  assert.equal(publicData.interdisciplinaryCourses.map((course) => course.code).join(","), "МДК 01.01,МДК 01.02");
  assert.equal(requiredCutShapes.every((key) => publicData.assetRegistry.cutShapes[key]), true);
  requiredCutShapes.forEach((key) => {
    const assetPath = path.join(__dirname, "..", "public", publicData.assetRegistry.cutShapes[key].replace(/^\//, ""));
    assert.equal(fs.existsSync(assetPath), true, `${key} asset exists`);
  });
  assert.equal(publicData.assetRegistry.violationScenes.vegetables.endsWith("vegetable.png"), true);
  assert.equal(publicQuestion.items.length, 14);
  assert.equal(publicQuestion.buckets.length, 14);
  assert.equal(publicQuestion.buckets.every((bucket) => bucket.image), true);
  assert.equal(publicQuestion.buckets.some((bucket) => bucket.image.endsWith(".svg")), false);
  assert.equal(publicSimulation.items.length, 11);
  assert.equal(publicSimulation.buckets.length, 11);
  assert.equal("correctBuckets" in publicQuestion, false);
  assert.equal("correctAnswer" in publicQuestion, false);
  assert.equal("correctBuckets" in publicSimulation, false);
});

test("PM01 visual asset registry points to real project files", () => {
  const publicData = getPm01PublicData(getPm01Exam());
  const assetPaths = [];

  function collectAssets(value) {
    if (!value) {
      return;
    }
    if (typeof value === "string" && value.startsWith("/assets/pm01/")) {
      assetPaths.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collectAssets);
      return;
    }
    if (typeof value === "object") {
      Object.values(value).forEach(collectAssets);
    }
  }

  collectAssets(publicData.assetRegistry);

  assert.equal(assetPaths.length >= 50, true);
  assetPaths.forEach((assetPath) => {
    const fullPath = path.join(__dirname, "..", "public", assetPath.replace(/^\//, ""));
    assert.equal(fs.existsSync(fullPath), true, `${assetPath} exists`);
  });
});

test("PM01 vegetable sequence steps use visual process cards without answer keys", () => {
  const exam = getPm01Exam();
  const variant = buildPm01Variant(exam, "vegetables");
  const sequenceQuestion = variant.questions.find((item) => item.id.startsWith("veg-t1-seq-potato"));
  const publicQuestion = sanitizePm01Question(sequenceQuestion, { answers: {} });

  assert.equal(publicQuestion.items.length, 6);
  assert.equal(publicQuestion.items.every((item) => item.image && item.detail), true);
  assert.equal(publicQuestion.items.every((item) => item.image.includes("/assets/pm01/process/")), true);
  assert.equal("correctSequence" in publicQuestion, false);
  assert.equal("correctAnswer" in publicQuestion, false);
});

test("PM01 product cards and hotspot scenes stay visual but sanitized", () => {
  const exam = getPm01Exam();
  const fishVariant = buildPm01Variant(exam, "fish");
  const productQuestion = fishVariant.questions.find((item) => item.id.startsWith("fish-sim-products"));
  const publicProductQuestion = sanitizePm01Question(productQuestion, { answers: {} });

  assert.equal(productQuestion.visualMode, "product_cards");
  assert.equal(publicProductQuestion.items.every((item) => item.image && item.detail), true);
  assert.equal("correctBuckets" in publicProductQuestion, false);

  const vegetableVariant = buildPm01Variant(exam, "vegetables");
  const hotspotQuestion = vegetableVariant.questions.find((item) => item.id.startsWith("veg-sim-hotspot"));
  const publicHotspotQuestion = sanitizePm01Question(hotspotQuestion, { answers: {} });

  assert.equal(publicHotspotQuestion.image.endsWith("vegetable.png"), true);
  assert.equal(publicHotspotQuestion.hotspotTargetCount, hotspotQuestion.hotspots.length);
  assert.equal("hotspots" in publicHotspotQuestion, false);
});

test("PM01 poultry and packaging tasks use visual product cards", () => {
  const exam = getPm01Exam();
  const poultryVariant = buildPm01Variant(exam, "poultry");
  const productQuestion = poultryVariant.questions.find((item) => item.id.startsWith("poultry-t1-products"));
  const partsQuestion = poultryVariant.questions.find((item) => item.id.startsWith("poultry-sim-parts"));
  const complexVariant = buildPm01Variant(exam, "complex");
  const zonesQuestion = complexVariant.questions.find((item) => item.id.startsWith("complex-sim-zones"));
  const packQuestion = complexVariant.questions.find((item) => item.id.startsWith("complex-sim-pack"));

  [productQuestion, partsQuestion, zonesQuestion, packQuestion].forEach((question) => {
    const publicQuestion = sanitizePm01Question(question, { answers: {} });
    assert.equal(question.type, "bucket_sort");
    assert.equal(question.visualMode, "product_cards");
    assert.equal(publicQuestion.items.every((item) => item.image && item.detail), true);
    assert.equal("correctBuckets" in publicQuestion, false);
  });

  assert.equal(productQuestion.items.some((item) => item.image.includes("/poultry-products/rabbit-portions.png")), true);
  assert.equal(packQuestion.items.some((item) => item.image.includes("/packaging/newspaper-violation.png")), true);
});

test("scorePm01Question accepts decimal comma for calculation tasks", () => {
  const exam = getPm01Exam();
  const variant = buildPm01Variant(exam, "vegetables");
  const question = variant.questions.find((item) => item.id.includes("veg-calc-potato"));

  const result = scorePm01Question(question, {
    values: {
      grossKg: "25,71",
      wasteKg: "7,71"
    }
  });

  assert.equal(result.finalScore, question.maxScore);
  assert.equal(result.details.correctFields, 2);
});

test("scorePm01Question scores hotspot matches and false positives", () => {
  const question = {
    type: "hotspot_scene",
    maxScore: 6,
    hotspots: [
      { id: "a", x: 20, y: 20, radius: 5 },
      { id: "b", x: 70, y: 70, radius: 5 }
    ]
  };

  const result = scorePm01Question(question, {
    points: [
      { x: 21, y: 20 },
      { x: 10, y: 80 }
    ]
  });

  assert.equal(result.details.found, 1);
  assert.equal(result.penalty, 1);
  assert.equal(result.finalScore, 1.5);
});

test("applyPm01VoiceReview stores rubric scores and updates final summary", () => {
  const exam = getPm01Exam();
  const variant = buildPm01Variant(exam, "vegetables");
  const question = variant.questions.find((item) => item.type === "voice_response");
  const attempt = {
    olympiadId: exam.id,
    status: "pending_review",
    startedAt: "2026-06-02T10:00:00.000Z",
    finishedAt: "2026-06-02T10:20:00.000Z",
    variant,
    answers: {
      [question.id]: {
        questionId: question.id,
        moduleId: question.moduleId,
        answerPayload: { audioName: "voice.webm" },
        autoScore: 0,
        finalScore: 0,
        manualStatus: "pending_review"
      }
    }
  };

  applyPm01VoiceReview(exam, attempt, question.id, {
    scores: {
      topic: 5,
      tools: 5,
      sequence: 5,
      safety: 5
    },
    comment: "Ответ полный."
  });

  const summary = summarizePm01Attempt(exam, attempt);
  assert.equal(attempt.status, "reviewed");
  assert.equal(attempt.answers[question.id].finalScore, 20);
  assert.equal(summary.pendingManualReviews, 0);
  assert.equal(summary.moduleScores.find((module) => module.moduleId === "voice").finalScore, 20);
});
