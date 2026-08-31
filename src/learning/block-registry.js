"use strict";

const BLOCK_REGISTRY = Object.freeze({
  instruction: Object.freeze({
    type: "instruction",
    title: "Инструкция",
    answerMode: "none",
    requiresAnswer: false,
    requiresPrivateKey: false
  }),
  single_choice: Object.freeze({
    type: "single_choice",
    title: "Один вариант",
    answerMode: "automatic",
    requiresAnswer: true,
    requiresPrivateKey: true
  }),
  multiple_choice: Object.freeze({
    type: "multiple_choice",
    title: "Несколько вариантов",
    answerMode: "automatic",
    requiresAnswer: true,
    requiresPrivateKey: true
  }),
  short_text: Object.freeze({
    type: "short_text",
    title: "Краткий ответ",
    answerMode: "hybrid",
    requiresAnswer: true,
    requiresPrivateKey: false
  }),
  long_text: Object.freeze({
    type: "long_text",
    title: "Развёрнутый ответ",
    answerMode: "manual",
    requiresAnswer: true,
    requiresPrivateKey: false
  }),
  calculation: Object.freeze({
    type: "calculation",
    title: "Расчёт",
    answerMode: "automatic",
    requiresAnswer: true,
    requiresPrivateKey: true
  }),
  matching: Object.freeze({
    type: "matching",
    title: "Соответствие",
    answerMode: "automatic",
    requiresAnswer: true,
    requiresPrivateKey: true
  }),
  ordering: Object.freeze({
    type: "ordering",
    title: "Последовательность",
    answerMode: "automatic",
    requiresAnswer: true,
    requiresPrivateKey: true
  }),
  classification: Object.freeze({
    type: "classification",
    title: "Классификация",
    answerMode: "automatic",
    requiresAnswer: true,
    requiresPrivateKey: true
  }),
  table: Object.freeze({
    type: "table",
    title: "Таблица",
    answerMode: "hybrid",
    requiresAnswer: true,
    requiresPrivateKey: false
  }),
  ttk_builder: Object.freeze({
    type: "ttk_builder",
    title: "Технологическая карта",
    answerMode: "manual",
    requiresAnswer: true,
    requiresPrivateKey: false
  }),
  scheme_builder: Object.freeze({
    type: "scheme_builder",
    title: "Технологическая схема",
    answerMode: "manual",
    requiresAnswer: true,
    requiresPrivateKey: false
  }),
  dish_assembly: Object.freeze({
    type: "dish_assembly",
    title: "Сборка блюда",
    answerMode: "hybrid",
    requiresAnswer: true,
    requiresPrivateKey: false
  }),
  crossword: Object.freeze({
    type: "crossword",
    title: "Кроссворд",
    answerMode: "automatic",
    requiresAnswer: true,
    requiresPrivateKey: true
  }),
  file_evidence: Object.freeze({
    type: "file_evidence",
    title: "Подтверждающий файл",
    answerMode: "manual",
    requiresAnswer: true,
    requiresPrivateKey: false
  }),
  observation_log: Object.freeze({
    type: "observation_log",
    title: "Журнал наблюдений",
    answerMode: "manual",
    requiresAnswer: true,
    requiresPrivateKey: false
  }),
  safety_checklist: Object.freeze({
    type: "safety_checklist",
    title: "Требования безопасности",
    answerMode: "automatic",
    requiresAnswer: true,
    requiresPrivateKey: false
  }),
  reflection: Object.freeze({
    type: "reflection",
    title: "Рефлексия",
    answerMode: "manual",
    requiresAnswer: true,
    requiresPrivateKey: false
  })
});

const BLOCK_TYPES = Object.freeze(Object.keys(BLOCK_REGISTRY));
const AUTOMATIC_BLOCK_TYPES = Object.freeze(
  BLOCK_TYPES.filter((type) => BLOCK_REGISTRY[type].answerMode === "automatic")
);
const MANUAL_BLOCK_TYPES = Object.freeze(
  BLOCK_TYPES.filter((type) => BLOCK_REGISTRY[type].answerMode === "manual")
);
const HYBRID_BLOCK_TYPES = Object.freeze(
  BLOCK_TYPES.filter((type) => BLOCK_REGISTRY[type].answerMode === "hybrid")
);

function getBlockSpec(type) {
  return BLOCK_REGISTRY[String(type || "").trim()] || null;
}

function isSupportedBlockType(type) {
  return Boolean(getBlockSpec(type));
}

function assertSupportedBlockType(type) {
  const spec = getBlockSpec(type);
  if (!spec) {
    const error = new Error(`Неподдерживаемый тип учебного блока: ${String(type || "пусто")}.`);
    error.code = "unsupported_block_type";
    throw error;
  }
  return spec;
}

function normalizeEntityList(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => {
      if (typeof item === "string" || typeof item === "number") {
        const value = String(item).trim();
        return value ? { id: value, label: value, index } : null;
      }
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const id = String(item.id ?? item.key ?? item.value ?? "").trim();
      const label = String(item.label ?? item.text ?? item.title ?? id).trim();
      return id ? { ...item, id, label, index } : null;
    })
    .filter(Boolean);
}

module.exports = {
  BLOCK_REGISTRY,
  BLOCK_TYPES,
  AUTOMATIC_BLOCK_TYPES,
  MANUAL_BLOCK_TYPES,
  HYBRID_BLOCK_TYPES,
  getBlockSpec,
  isSupportedBlockType,
  assertSupportedBlockType,
  normalizeEntityList
};
