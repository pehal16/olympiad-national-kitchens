"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BLOCK_TYPES,
  getBlockSpec
} = require("../src/learning/block-registry");
const {
  validateDefinition,
  normalizeAnswer,
  validateAnswer
} = require("../src/learning/validation");
const {
  autoGrade,
  gradeSubmission
} = require("../src/learning/grading");
const {
  sanitizeForStudent,
  formatForTeacher,
  isSensitiveStudentKey
} = require("../src/learning/serializers");

function block(type, extra = {}) {
  return {
    id: `block-${type}`,
    type,
    prompt: `Выполните блок ${type}`,
    maxScore: type === "instruction" ? 0 : 5,
    ...extra
  };
}

const validDefinitions = {
  instruction: block("instruction", { content: "Прочитайте порядок выполнения." }),
  single_choice: block("single_choice", {
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" }
    ],
    answerKey: { optionId: "b" }
  }),
  multiple_choice: block("multiple_choice", {
    options: ["a", "b", "c"],
    answerKey: { optionIds: ["a", "c"] }
  }),
  short_text: block("short_text", {
    answerKey: { acceptedAnswers: ["бланширование", "бланшировка"] }
  }),
  long_text: block("long_text", { minLength: 10, maxLength: 1000 }),
  calculation: block("calculation", {
    maxScore: 10,
    unit: "кг",
    answerKey: {
      value: 12.5,
      unit: "кг",
      tolerance: { type: "absolute", value: 0.1 },
      partialCredit: { valueOnlyFraction: 0.75, nearValueFraction: 0.5 }
    }
  }),
  matching: block("matching", {
    leftItems: ["knife", "board"],
    rightItems: ["cut", "surface"],
    answerKey: { pairs: { knife: "cut", board: "surface" } }
  }),
  ordering: block("ordering", {
    items: ["wash", "peel", "cut"],
    answerKey: { order: ["wash", "peel", "cut"] }
  }),
  classification: block("classification", {
    items: ["carrot", "salmon"],
    categories: ["vegetable", "fish"],
    answerKey: { assignments: { carrot: "vegetable", salmon: "fish" } }
  }),
  table: block("table", {
    rows: ["gross", "net"],
    columns: ["weight"],
    autoGrade: true,
    answerKey: { cells: { "gross:weight": 10, "net:weight": 8 } }
  }),
  ttk_builder: block("ttk_builder", {
    requiredFields: ["dishName", "ingredients", "steps"]
  }),
  scheme_builder: block("scheme_builder", {
    nodeTypes: ["operation", "control"]
  }),
  dish_assembly: block("dish_assembly", {
    components: ["base", "sauce", "garnish"],
    slots: ["plate", "top"],
    autoGrade: true,
    answerKey: { placements: { base: "plate", sauce: "top", garnish: "top" } }
  }),
  crossword: block("crossword", {
    clues: [
      { id: "one", label: "Тепловая обработка в воде" },
      { id: "two", label: "Обжаривание" }
    ],
    answerKey: { words: { one: "варка", two: "жарка" } }
  }),
  file_evidence: block("file_evidence", {
    minFiles: 1,
    maxFiles: 2,
    maxFileBytes: 2_000_000,
    allowedMimeTypes: ["application/pdf"],
    allowedExtensions: ["pdf"]
  }),
  observation_log: block("observation_log", {
    minEntries: 2,
    columns: ["time", "temperature", "note"]
  }),
  safety_checklist: block("safety_checklist", {
    items: [
      { id: "uniform", label: "Надеть санитарную одежду", required: true },
      { id: "hands", label: "Вымыть руки", required: true }
    ]
  }),
  reflection: block("reflection", { minLength: 5, maxLength: 500 })
};

test("block registry and definition validator cover every pilot block family", () => {
  assert.deepEqual(Object.keys(validDefinitions).sort(), [...BLOCK_TYPES].sort());
  for (const type of BLOCK_TYPES) {
    assert.equal(getBlockSpec(type)?.type, type);
    const result = validateDefinition(validDefinitions[type]);
    assert.equal(result.valid, true, `${type}: ${JSON.stringify(result.errors)}`);
  }
});

test("validateDefinition reports duplicate block ids and missing private keys", () => {
  const withoutKey = {
    ...validDefinitions.single_choice,
    answerKey: undefined
  };
  const invalidBlock = validateDefinition(withoutKey);
  assert.equal(invalidBlock.valid, false);
  assert.equal(invalidBlock.errors.some((entry) => entry.code === "answer_key_required"), true);

  const work = validateDefinition({ blocks: [validDefinitions.instruction, validDefinitions.instruction] });
  assert.equal(work.valid, false);
  assert.equal(work.errors.some((entry) => entry.code === "duplicate_block_id"), true);
});

test("sanitizeForStudent removes closed keys recursively while preserving public rubric", () => {
  const source = {
    id: "work-1",
    publicRubric: { criteria: [{ label: "Точность", maxScore: 5 }] },
    blocks: [
      {
        ...validDefinitions.single_choice,
        options: [
          { id: "a", label: "A", isCorrect: false },
          { id: "b", label: "B", isCorrect: true }
        ],
        nested: {
          privateKey: { optionId: "b" },
          layer: { correctBuckets: { x: "y" }, solutionSteps: ["секрет"] }
        }
      },
      {
        id: "file",
        type: "file_evidence",
        uploaded: { id: "f1", name: "report.pdf", objectKey: "private/path/report.pdf" }
      }
    ]
  };

  const sanitized = sanitizeForStudent(source);
  assert.deepEqual(sanitized.publicRubric, source.publicRubric);
  assert.equal(JSON.stringify(sanitized).includes("optionId"), false);
  assert.equal(JSON.stringify(sanitized).includes("correctBuckets"), false);
  assert.equal(JSON.stringify(sanitized).includes("solutionSteps"), false);
  assert.equal(JSON.stringify(sanitized).includes("objectKey"), false);

  function assertNoSensitiveKeys(value) {
    if (Array.isArray(value)) {
      value.forEach(assertNoSensitiveKeys);
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    Object.entries(value).forEach(([key, child]) => {
      assert.equal(isSensitiveStudentKey(key), false, `student DTO leaked ${key}`);
      assertNoSensitiveKeys(child);
    });
  }
  assertNoSensitiveKeys(sanitized);
});

test("normalizeAnswer and validateAnswer normalize decimal comma, relations and file metadata", () => {
  assert.deepEqual(normalizeAnswer(validDefinitions.calculation, { value: "12,55", unit: " кг " }), {
    value: 12.55,
    unit: "кг"
  });

  const matching = validateAnswer(validDefinitions.matching, [
    { leftId: "knife", rightId: "cut" },
    { leftId: "board", rightId: "surface" }
  ]);
  assert.equal(matching.valid, true);
  assert.deepEqual(matching.normalized, { knife: "cut", board: "surface" });

  const invalidFile = validateAnswer(validDefinitions.file_evidence, {
    files: [
      { id: "f1", name: "evidence.exe", mimeType: "application/octet-stream", size: 100, status: "stored", objectKey: "hidden" }
    ]
  });
  assert.equal(invalidFile.valid, false);
  assert.equal(invalidFile.errors.some((entry) => entry.code === "file_type"), true);
  assert.equal("objectKey" in invalidFile.normalized.files[0], false);
});

test("every registered block type accepts its canonical answer shape", () => {
  const answers = {
    instruction: null,
    single_choice: "b",
    multiple_choice: ["a", "c"],
    short_text: "Бланширование",
    long_text: "Подробный профессиональный вывод.",
    calculation: { value: 12.5, unit: "кг" },
    matching: { knife: "cut", board: "surface" },
    ordering: ["wash", "peel", "cut"],
    classification: { carrot: "vegetable", salmon: "fish" },
    table: { cells: { "gross:weight": 10, "net:weight": 8 } },
    ttk_builder: {
      dishName: "Суп",
      ingredients: [{ name: "Вода", amount: 1 }],
      steps: ["Подготовить сырьё"]
    },
    scheme_builder: { nodes: [{ id: "n1", type: "operation", label: "Подготовка" }] },
    dish_assembly: {
      placements: { base: "plate", sauce: "top", garnish: "top" },
      selectedIds: []
    },
    crossword: { words: { one: "варка", two: "жарка" } },
    file_evidence: {
      files: [
        { id: "file-1", name: "report.pdf", mimeType: "application/pdf", size: 1024, status: "stored" }
      ]
    },
    observation_log: {
      entries: [
        { time: "10:00", temperature: 80 },
        { time: "10:05", temperature: 90 }
      ]
    },
    safety_checklist: { checks: { uniform: true, hands: true } },
    reflection: "Цель занятия достигнута."
  };

  for (const type of BLOCK_TYPES) {
    const validation = validateAnswer(validDefinitions[type], answers[type]);
    assert.equal(validation.valid, true, `${type}: ${JSON.stringify(validation.errors)}`);
    const grading = autoGrade(validDefinitions[type], answers[type]);
    assert.notEqual(grading.mode, "invalid", type);
    assert.notEqual(grading.status, "invalid_definition", type);
  }
});

test("autoGrade scores choices and structured tasks with deterministic partial credit", () => {
  const single = autoGrade(validDefinitions.single_choice, "b");
  assert.equal(single.score, 5);
  assert.equal(single.correct, true);

  const multiple = autoGrade(validDefinitions.multiple_choice, ["a", "b", "c"]);
  assert.equal(multiple.score, 2.5);
  assert.equal(multiple.details.correctSelected, 2);
  assert.equal(multiple.details.incorrectSelected, 1);

  const matching = autoGrade(validDefinitions.matching, { knife: "cut", board: "cut" });
  assert.equal(matching.score, 2.5);

  const ordering = autoGrade(validDefinitions.ordering, ["wash", "cut", "peel"]);
  assert.equal(ordering.score, 1.6667);

  const classification = autoGrade(validDefinitions.classification, {
    carrot: "vegetable",
    salmon: "vegetable"
  });
  assert.equal(classification.score, 2.5);

  const table = autoGrade(validDefinitions.table, {
    cells: { "gross:weight": "10", "net:weight": 7 }
  });
  assert.equal(table.score, 2.5);
});

test("calculation grading supports tolerance, unit and configurable partial score", () => {
  const full = autoGrade(validDefinitions.calculation, { value: "12,56", unit: "КГ" });
  assert.equal(full.score, 10);
  assert.equal(full.details.valueCorrect, true);
  assert.equal(full.details.unitCorrect, true);

  const valueOnly = autoGrade(validDefinitions.calculation, { value: 12.5, unit: "г" });
  assert.equal(valueOnly.score, 7.5);
  assert.equal(valueOnly.details.partialReason, "value_without_expected_unit");

  const near = autoGrade(validDefinitions.calculation, { value: 12.68, unit: "кг" });
  assert.equal(near.score, 5);
  assert.equal(near.details.partialReason, "near_value");
});

test("manual blocks remain pending and aggregate grading separates manual maximum", () => {
  const manual = autoGrade(validDefinitions.long_text, "Развёрнутый технологический вывод.");
  assert.equal(manual.mode, "manual");
  assert.equal(manual.score, null);
  assert.equal(manual.requiresManualReview, true);

  const aggregate = gradeSubmission(
    { blocks: [validDefinitions.single_choice, validDefinitions.long_text, validDefinitions.instruction] },
    {
      [validDefinitions.single_choice.id]: "b",
      [validDefinitions.long_text.id]: "Развёрнутый технологический вывод."
    }
  );
  assert.equal(aggregate.valid, true);
  assert.equal(aggregate.autoScore, 5);
  assert.equal(aggregate.maxScore, 10);
  assert.equal(aggregate.manualMaxScore, 5);
  assert.equal(aggregate.finalScore, null);
});

test("formatForTeacher preserves private key and supplies normalized validation and grading", () => {
  const formatted = formatForTeacher(validDefinitions.calculation, { value: "12,5", unit: "кг" }, {
    submissionVersionId: "revision-1"
  });
  assert.equal(formatted.definition.answerKey.value, 12.5);
  assert.deepEqual(formatted.answer, { value: 12.5, unit: "кг" });
  assert.equal(formatted.validation.valid, true);
  assert.equal(formatted.grading.score, 10);
  assert.equal(formatted.submissionVersionId, "revision-1");
});
