"use strict";

const {
  getBlockSpec,
  isSupportedBlockType,
  normalizeEntityList
} = require("./block-registry");

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function text(value) {
  return String(value ?? "").trim();
}

function issue(path, code, message) {
  return { path, code, message };
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function uniqueIds(items) {
  const ids = items.map((item) => item.id);
  return ids.length === new Set(ids).size;
}

function getPrivateAnswerKey(definition) {
  if (!isPlainObject(definition)) {
    return {};
  }

  const key = {};
  for (const candidate of [definition.answerKey, definition.privateKey, definition.gradingKey]) {
    if (!isPlainObject(candidate)) {
      continue;
    }
    Object.assign(key, candidate);
    if (isPlainObject(candidate.answerKey)) {
      Object.assign(key, candidate.answerKey);
    }
  }

  const aliases = [
    "correctOptionId",
    "correctOptionIds",
    "acceptedAnswers",
    "correctValue",
    "correctPairs",
    "correctOrder",
    "correctAssignments",
    "correctCells",
    "correctPlacements",
    "correctWords",
    "correctChecks"
  ];
  for (const field of aliases) {
    if (definition[field] !== undefined && key[field] === undefined) {
      key[field] = definition[field];
    }
  }
  return key;
}

function keyValue(key, ...names) {
  for (const name of names) {
    if (key && key[name] !== undefined) {
      return key[name];
    }
  }
  return undefined;
}

function hasAnswerKey(definition) {
  return Object.keys(getPrivateAnswerKey(definition)).length > 0;
}

function validateDefinition(definition) {
  if (isPlainObject(definition) && Array.isArray(definition.blocks) && !definition.type) {
    return validateWorkDefinition(definition);
  }
  return validateBlockDefinition(definition);
}

function validateWorkDefinition(definition) {
  const errors = [];
  const warnings = [];
  if (!isPlainObject(definition)) {
    return {
      valid: false,
      errors: [issue("$", "definition_type", "Определение работы должно быть объектом.")],
      warnings
    };
  }
  if (!Array.isArray(definition.blocks) || definition.blocks.length === 0) {
    errors.push(issue("blocks", "blocks_required", "Добавьте хотя бы один учебный блок."));
  } else {
    const ids = new Set();
    definition.blocks.forEach((block, index) => {
      const result = validateBlockDefinition(block);
      result.errors.forEach((entry) =>
        errors.push({ ...entry, path: `blocks[${index}]${entry.path === "$" ? "" : `.${entry.path}`}` })
      );
      result.warnings.forEach((entry) =>
        warnings.push({ ...entry, path: `blocks[${index}]${entry.path === "$" ? "" : `.${entry.path}`}` })
      );
      const blockId = text(block?.id);
      if (blockId && ids.has(blockId)) {
        errors.push(
          issue(`blocks[${index}].id`, "duplicate_block_id", `Идентификатор блока «${blockId}» повторяется.`)
        );
      }
      if (blockId) {
        ids.add(blockId);
      }
    });
  }
  return { valid: errors.length === 0, errors, warnings };
}

function validateBlockDefinition(definition) {
  const errors = [];
  const warnings = [];
  if (!isPlainObject(definition)) {
    return {
      valid: false,
      errors: [issue("$", "definition_type", "Учебный блок должен быть объектом.")],
      warnings
    };
  }

  const type = text(definition.type);
  const spec = getBlockSpec(type);
  if (!text(definition.id)) {
    errors.push(issue("id", "id_required", "Укажите стабильный идентификатор блока."));
  }
  if (!spec) {
    errors.push(issue("type", "unsupported_block_type", `Тип блока «${type || "пусто"}» не поддерживается.`));
    return { valid: false, errors, warnings };
  }

  const visibleText = text(
    definition.prompt ?? definition.title ?? definition.content ?? definition.instructions
  );
  if (!visibleText) {
    errors.push(issue("prompt", "content_required", "Укажите понятный студенту текст блока."));
  }

  const maxScore = finiteNumber(definition.maxScore);
  if (type === "instruction") {
    if (maxScore !== null && maxScore !== 0) {
      errors.push(issue("maxScore", "instruction_score", "Инструкция не должна начислять баллы."));
    }
  } else if (maxScore === null || maxScore <= 0) {
    errors.push(issue("maxScore", "max_score_required", "Для оцениваемого блока укажите maxScore больше нуля."));
  }

  const key = getPrivateAnswerKey(definition);
  const options = normalizeEntityList(definition.options);
  const items = normalizeEntityList(definition.items ?? definition.components);

  switch (type) {
    case "instruction":
      break;
    case "single_choice": {
      validateEntityCollection(options, "options", 2, errors);
      const correctId = text(keyValue(key, "optionId", "correctOptionId", "value"));
      if (!correctId) {
        errors.push(issue("answerKey", "answer_key_required", "Укажите правильный вариант."));
      } else if (!options.some((option) => option.id === correctId)) {
        errors.push(issue("answerKey.optionId", "answer_key_unknown_option", "Правильный вариант отсутствует в options."));
      }
      break;
    }
    case "multiple_choice": {
      validateEntityCollection(options, "options", 2, errors);
      const correctIds = normalizeIdArray(keyValue(key, "optionIds", "correctOptionIds", "values"));
      if (correctIds.length === 0) {
        errors.push(issue("answerKey", "answer_key_required", "Укажите правильные варианты."));
      }
      correctIds.forEach((id) => {
        if (!options.some((option) => option.id === id)) {
          errors.push(issue("answerKey.optionIds", "answer_key_unknown_option", `Вариант «${id}» отсутствует в options.`));
        }
      });
      break;
    }
    case "short_text": {
      const accepted = normalizeTextArray(keyValue(key, "acceptedAnswers", "answers", "values"));
      if (hasAnswerKey(definition) && accepted.length === 0) {
        errors.push(issue("answerKey.acceptedAnswers", "accepted_answers_required", "Добавьте хотя бы один допустимый ответ."));
      }
      break;
    }
    case "long_text":
    case "reflection":
      validateLengthLimits(definition, errors);
      break;
    case "calculation": {
      const expected = finiteNumber(keyValue(key, "value", "correctValue", "expected"));
      if (expected === null) {
        errors.push(issue("answerKey.value", "calculation_value_required", "Укажите числовой эталон расчёта."));
      }
      validateTolerance(key.tolerance ?? definition.tolerance, errors);
      validatePartialCredit(key.partialCredit ?? definition.partialCredit, errors);
      break;
    }
    case "matching": {
      const leftItems = normalizeEntityList(definition.leftItems ?? definition.items);
      const rightItems = normalizeEntityList(definition.rightItems ?? definition.targets);
      validateEntityCollection(leftItems, "leftItems", 1, errors);
      validateEntityCollection(rightItems, "rightItems", 1, errors);
      const pairs = normalizeMap(keyValue(key, "pairs", "correctPairs"));
      validateCompleteMap(pairs, leftItems, rightItems, "answerKey.pairs", errors);
      break;
    }
    case "ordering": {
      validateEntityCollection(items, "items", 2, errors);
      const order = normalizeIdArray(keyValue(key, "order", "correctOrder"));
      validatePermutation(order, items, "answerKey.order", errors);
      break;
    }
    case "classification": {
      const categories = normalizeEntityList(definition.categories);
      validateEntityCollection(items, "items", 1, errors);
      validateEntityCollection(categories, "categories", 2, errors);
      const assignments = normalizeMap(keyValue(key, "assignments", "correctAssignments"));
      validateCompleteMap(assignments, items, categories, "answerKey.assignments", errors);
      break;
    }
    case "table": {
      const rows = normalizeEntityList(definition.rows);
      const columns = normalizeEntityList(definition.columns);
      validateEntityCollection(rows, "rows", 1, errors);
      validateEntityCollection(columns, "columns", 1, errors);
      const cells = normalizeMap(keyValue(key, "cells", "correctCells"));
      if (definition.autoGrade === true && Object.keys(cells).length === 0) {
        errors.push(issue("answerKey.cells", "answer_key_required", "Для автоматической проверки таблицы задайте эталонные ячейки."));
      }
      break;
    }
    case "ttk_builder":
      validateStringList(definition.requiredFields, "requiredFields", errors, false);
      break;
    case "scheme_builder":
      if (definition.nodeTypes !== undefined) {
        validateEntityCollection(normalizeEntityList(definition.nodeTypes), "nodeTypes", 1, errors);
      }
      break;
    case "dish_assembly": {
      validateEntityCollection(items, "components", 1, errors);
      const slots = normalizeEntityList(definition.slots);
      if (definition.slots !== undefined) {
        validateEntityCollection(slots, "slots", 1, errors);
      }
      if (definition.autoGrade === true) {
        const placements = normalizeMap(keyValue(key, "placements", "correctPlacements"));
        const selectedIds = normalizeIdArray(keyValue(key, "selectedIds", "correctOptionIds"));
        if (Object.keys(placements).length === 0 && selectedIds.length === 0) {
          errors.push(issue("answerKey", "answer_key_required", "Для автоматической проверки сборки задайте placements или selectedIds."));
        }
      }
      break;
    }
    case "crossword": {
      const clues = normalizeEntityList(definition.clues);
      validateEntityCollection(clues, "clues", 1, errors);
      const words = normalizeMap(keyValue(key, "words", "correctWords"));
      if (Object.keys(words).length === 0) {
        errors.push(issue("answerKey.words", "answer_key_required", "Добавьте ответы к кроссворду."));
      } else {
        for (const clue of clues) {
          if (!text(words[clue.id])) {
            errors.push(issue("answerKey.words", "answer_key_incomplete", `Нет ответа для подсказки «${clue.id}».`));
          }
        }
      }
      break;
    }
    case "file_evidence":
      validateFileDefinition(definition, errors);
      break;
    case "observation_log":
      if (definition.columns !== undefined) {
        validateEntityCollection(normalizeEntityList(definition.columns), "columns", 1, errors);
      }
      validatePositiveInteger(definition.minEntries, "minEntries", errors, false);
      break;
    case "safety_checklist":
      validateEntityCollection(items, "items", 1, errors);
      break;
    default:
      break;
  }

  if (spec.requiresPrivateKey && !hasAnswerKey(definition)) {
    errors.push(issue("answerKey", "answer_key_required", "Для автоматической проверки нужен закрытый ключ."));
  }

  return { valid: errors.length === 0, errors: deduplicateIssues(errors), warnings };
}

function validateEntityCollection(items, path, minimum, errors) {
  if (items.length < minimum) {
    errors.push(issue(path, "items_required", `В ${path} должно быть не меньше ${minimum} элементов.`));
  }
  if (!uniqueIds(items)) {
    errors.push(issue(path, "duplicate_item_id", `Идентификаторы в ${path} должны быть уникальными.`));
  }
}

function validateStringList(value, path, errors, required = true) {
  if (value === undefined && !required) {
    return;
  }
  if (!Array.isArray(value) || value.some((item) => !text(item))) {
    errors.push(issue(path, "string_list", `${path} должен быть массивом непустых строк.`));
  }
}

function validatePositiveInteger(value, path, errors, required = true) {
  if ((value === undefined || value === null || value === "") && !required) {
    return;
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    errors.push(issue(path, "positive_integer", `${path} должен быть положительным целым числом.`));
  }
}

function validateLengthLimits(definition, errors) {
  for (const field of ["minLength", "maxLength"]) {
    if (definition[field] === undefined) {
      continue;
    }
    const number = Number(definition[field]);
    if (!Number.isInteger(number) || number < 0) {
      errors.push(issue(field, "length_limit", `${field} должен быть целым неотрицательным числом.`));
    }
  }
  if (
    Number.isFinite(Number(definition.minLength)) &&
    Number.isFinite(Number(definition.maxLength)) &&
    Number(definition.minLength) > Number(definition.maxLength)
  ) {
    errors.push(issue("maxLength", "length_range", "maxLength не может быть меньше minLength."));
  }
}

function validateTolerance(value, errors) {
  if (value === undefined || value === null || value === "") {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      errors.push(issue("answerKey.tolerance", "tolerance", "Допуск должен быть неотрицательным числом."));
    }
    return;
  }
  if (!isPlainObject(value)) {
    errors.push(issue("answerKey.tolerance", "tolerance", "Допуск должен быть числом или объектом."));
    return;
  }
  const type = text(value.type || "absolute");
  const amount = finiteNumber(value.value ?? value.amount ?? value.absolute ?? value.percent);
  if (!["absolute", "relative", "percent"].includes(type) || amount === null || amount < 0) {
    errors.push(issue("answerKey.tolerance", "tolerance", "Используйте неотрицательный absolute, relative или percent допуск."));
  }
}

function validatePartialCredit(value, errors) {
  if (value === undefined) {
    return;
  }
  if (!isPlainObject(value)) {
    errors.push(issue("answerKey.partialCredit", "partial_credit", "Настройки частичного балла должны быть объектом."));
    return;
  }
  for (const [name, amount] of Object.entries(value)) {
    if (name === "nearToleranceMultiplier") {
      if (!Number.isFinite(Number(amount)) || Number(amount) < 1) {
        errors.push(issue(`answerKey.partialCredit.${name}`, "partial_credit", "Множитель ближнего допуска должен быть не меньше 1."));
      }
      continue;
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) < 0 || Number(amount) > 1) {
      errors.push(issue(`answerKey.partialCredit.${name}`, "partial_credit", "Доля частичного балла должна быть от 0 до 1."));
    }
  }
}

function validateCompleteMap(map, sources, targets, path, errors) {
  const targetIds = new Set(targets.map((item) => item.id));
  for (const source of sources) {
    if (!text(map[source.id])) {
      errors.push(issue(path, "answer_key_incomplete", `Нет эталона для «${source.id}».`));
    } else if (!targetIds.has(text(map[source.id]))) {
      errors.push(issue(path, "answer_key_unknown_target", `Эталон «${map[source.id]}» отсутствует в целевом списке.`));
    }
  }
}

function validatePermutation(order, items, path, errors) {
  const expected = items.map((item) => item.id);
  if (order.length !== expected.length || new Set(order).size !== order.length) {
    errors.push(issue(path, "answer_key_permutation", "Эталонная последовательность должна содержать каждый элемент ровно один раз."));
    return;
  }
  const expectedSet = new Set(expected);
  if (order.some((id) => !expectedSet.has(id))) {
    errors.push(issue(path, "answer_key_unknown_item", "В эталонной последовательности найден неизвестный элемент."));
  }
}

function validateFileDefinition(definition, errors) {
  for (const field of ["minFiles", "maxFiles", "maxFileBytes"]) {
    if (definition[field] !== undefined) {
      validatePositiveInteger(definition[field], field, errors, false);
    }
  }
  if (
    definition.minFiles !== undefined &&
    definition.maxFiles !== undefined &&
    Number(definition.minFiles) > Number(definition.maxFiles)
  ) {
    errors.push(issue("maxFiles", "file_count_range", "maxFiles не может быть меньше minFiles."));
  }
  if (definition.allowedMimeTypes !== undefined) {
    validateStringList(definition.allowedMimeTypes, "allowedMimeTypes", errors);
  }
  if (definition.allowedExtensions !== undefined) {
    validateStringList(definition.allowedExtensions, "allowedExtensions", errors);
  }
}

function normalizeAnswer(definition, rawAnswer) {
  const type = text(definition?.type);
  if (!isSupportedBlockType(type)) {
    return rawAnswer ?? null;
  }

  switch (type) {
    case "instruction":
      return null;
    case "single_choice":
      return text(rawAnswer?.optionId ?? rawAnswer?.selectedOptionId ?? rawAnswer?.value ?? rawAnswer) || null;
    case "multiple_choice":
      return normalizeIdArray(
        isPlainObject(rawAnswer)
          ? rawAnswer.optionIds ?? rawAnswer.selectedOptionIds ?? rawAnswer.values
          : rawAnswer
      );
    case "short_text":
    case "long_text":
    case "reflection":
      return text(rawAnswer?.text ?? rawAnswer?.value ?? rawAnswer);
    case "calculation":
      return normalizeCalculationAnswer(rawAnswer);
    case "matching":
      return normalizeRelationAnswer(rawAnswer, ["pairs", "matches"], ["leftId", "rightId"]);
    case "ordering":
      return normalizeIdArray(rawAnswer?.order ?? rawAnswer?.itemIds ?? rawAnswer);
    case "classification":
      return normalizeRelationAnswer(rawAnswer, ["assignments", "categories"], ["itemId", "categoryId"]);
    case "table":
      return { cells: normalizeScalarMap(rawAnswer?.cells ?? rawAnswer?.values ?? rawAnswer) };
    case "ttk_builder":
    case "scheme_builder":
      return cloneAnswerObject(rawAnswer);
    case "dish_assembly":
      return {
        placements: normalizeMap(rawAnswer?.placements),
        selectedIds: normalizeIdArray(rawAnswer?.selectedIds ?? rawAnswer?.componentIds)
      };
    case "crossword":
      return { words: normalizeScalarMap(rawAnswer?.words ?? rawAnswer?.answers ?? rawAnswer) };
    case "file_evidence":
      return { files: normalizeFiles(rawAnswer?.files ?? rawAnswer) };
    case "observation_log":
      return {
        entries: normalizeEntries(isPlainObject(rawAnswer) ? rawAnswer.entries : rawAnswer)
      };
    case "safety_checklist":
      return { checks: normalizeBooleanMap(rawAnswer?.checks ?? rawAnswer?.values ?? rawAnswer) };
    default:
      return cloneAnswerObject(rawAnswer);
  }
}

function validateAnswer(definition, rawAnswer) {
  const definitionResult = validateBlockDefinition(definition);
  const normalized = normalizeAnswer(definition, rawAnswer);
  if (!definitionResult.valid) {
    return {
      valid: false,
      complete: false,
      normalized,
      errors: [issue("definition", "invalid_definition", "Нельзя проверить ответ для некорректного блока.")]
    };
  }

  const type = text(definition.type);
  const spec = getBlockSpec(type);
  const required = definition.required !== false && spec.requiresAnswer;
  const errors = [];
  const empty = isEmptyAnswer(type, normalized);
  if (empty) {
    if (required) {
      errors.push(issue("answer", "answer_required", "Заполните обязательный блок."));
    }
    return { valid: errors.length === 0, complete: false, normalized, errors };
  }

  const options = normalizeEntityList(definition.options);
  const items = normalizeEntityList(definition.items ?? definition.components);
  switch (type) {
    case "single_choice":
      if (!options.some((option) => option.id === normalized)) {
        errors.push(issue("answer.optionId", "unknown_option", "Выбран неизвестный вариант."));
      }
      break;
    case "multiple_choice": {
      const optionIds = new Set(options.map((option) => option.id));
      if (normalized.some((id) => !optionIds.has(id))) {
        errors.push(issue("answer.optionIds", "unknown_option", "Ответ содержит неизвестный вариант."));
      }
      const minimum = Number(definition.minSelections ?? 1);
      const maximum = Number(definition.maxSelections ?? options.length);
      if (normalized.length < minimum || normalized.length > maximum) {
        errors.push(issue("answer.optionIds", "selection_count", `Выберите от ${minimum} до ${maximum} вариантов.`));
      }
      break;
    }
    case "short_text":
    case "long_text":
    case "reflection":
      validateTextAnswer(definition, normalized, errors);
      break;
    case "calculation":
      if (!Number.isFinite(normalized.value)) {
        errors.push(issue("answer.value", "number_required", "Введите корректное число."));
      }
      if (calculationUnitRequired(definition) && !text(normalized.unit)) {
        errors.push(issue("answer.unit", "unit_required", "Укажите единицу измерения."));
      }
      break;
    case "matching": {
      const leftItems = normalizeEntityList(definition.leftItems ?? definition.items);
      const rightIds = new Set(normalizeEntityList(definition.rightItems ?? definition.targets).map((item) => item.id));
      validateRelationMap(normalized, leftItems, rightIds, definition.allowTargetReuse !== false, errors);
      break;
    }
    case "ordering":
      validateAnswerPermutation(normalized, items, errors);
      break;
    case "classification": {
      const categoryIds = new Set(normalizeEntityList(definition.categories).map((item) => item.id));
      validateRelationMap(normalized, items, categoryIds, true, errors);
      break;
    }
    case "table":
      validateTableAnswer(definition, normalized.cells, errors);
      break;
    case "ttk_builder":
      validateRequiredFields(definition.requiredFields, normalized, errors);
      break;
    case "scheme_builder":
      if (!hasMeaningfulObjectValue(normalized)) {
        errors.push(issue("answer", "scheme_required", "Добавьте элементы технологической схемы."));
      }
      break;
    case "dish_assembly": {
      const componentIds = new Set(items.map((item) => item.id));
      const slotIds = new Set(normalizeEntityList(definition.slots).map((item) => item.id));
      const usedIds = new Set([...Object.keys(normalized.placements), ...normalized.selectedIds]);
      if (usedIds.size === 0) {
        errors.push(issue("answer", "assembly_required", "Добавьте компоненты блюда."));
      }
      for (const id of usedIds) {
        if (!componentIds.has(id)) {
          errors.push(issue("answer", "unknown_component", `Компонент «${id}» отсутствует в задании.`));
        }
      }
      if (slotIds.size) {
        for (const [componentId, slotId] of Object.entries(normalized.placements)) {
          if (!slotIds.has(slotId)) {
            errors.push(
              issue(
                `answer.placements.${componentId}`,
                "unknown_slot",
                `Позиция «${slotId}» отсутствует в задании.`
              )
            );
          }
        }
      }
      break;
    }
    case "crossword": {
      const clues = normalizeEntityList(definition.clues);
      for (const clue of clues) {
        if (!text(normalized.words[clue.id])) {
          errors.push(issue(`answer.words.${clue.id}`, "crossword_word_required", "Заполните ответ к подсказке."));
        }
      }
      break;
    }
    case "file_evidence":
      validateFiles(definition, normalized.files, errors);
      break;
    case "observation_log": {
      const minimum = Number(definition.minEntries ?? 1);
      if (normalized.entries.length < minimum) {
        errors.push(issue("answer.entries", "observation_count", `Добавьте не меньше ${minimum} записей наблюдения.`));
      }
      break;
    }
    case "safety_checklist":
      validateSafetyAnswer(definition, normalized.checks, items, errors);
      break;
    default:
      break;
  }

  return {
    valid: errors.length === 0,
    complete: errors.length === 0,
    normalized,
    errors: deduplicateIssues(errors)
  };
}

function normalizeCalculationAnswer(rawAnswer) {
  const rawValue = isPlainObject(rawAnswer)
    ? rawAnswer.value ?? rawAnswer.number ?? rawAnswer.result
    : rawAnswer;
  const rawUnit = isPlainObject(rawAnswer) ? rawAnswer.unit ?? rawAnswer.measurementUnit : "";
  let normalizedValue = rawValue;
  if (typeof normalizedValue === "string") {
    normalizedValue = normalizedValue.replace(/\s+/g, "").replace(",", ".");
  }
  const value = Number(normalizedValue);
  return {
    value: Number.isFinite(value) ? value : null,
    unit: text(rawUnit)
  };
}

function normalizeRelationAnswer(rawAnswer, containerNames, pairNames) {
  for (const name of containerNames) {
    if (isPlainObject(rawAnswer?.[name])) {
      return normalizeMap(rawAnswer[name]);
    }
  }
  if (Array.isArray(rawAnswer)) {
    const result = {};
    rawAnswer.forEach((entry) => {
      if (!isPlainObject(entry)) {
        return;
      }
      const left = text(entry[pairNames[0]] ?? entry.sourceId ?? entry.itemId);
      const right = text(entry[pairNames[1]] ?? entry.targetId ?? entry.value);
      if (left && right) {
        result[left] = right;
      }
    });
    return result;
  }
  return normalizeMap(rawAnswer);
}

function normalizeIdArray(value) {
  const values = Array.isArray(value)
    ? value
    : value instanceof Set
      ? [...value]
      : value === undefined || value === null || value === ""
        ? []
        : [value];
  return [...new Set(values.map((item) => text(item?.id ?? item?.value ?? item)).filter(Boolean))];
}

function normalizeTextArray(value) {
  return (Array.isArray(value) ? value : value === undefined ? [] : [value])
    .map(text)
    .filter(Boolean);
}

function normalizeMap(value) {
  if (!isPlainObject(value)) {
    return {};
  }
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = text(key);
    const normalizedValue = text(item?.id ?? item?.value ?? item);
    if (normalizedKey && normalizedValue) {
      result[normalizedKey] = normalizedValue;
    }
  }
  return result;
}

function normalizeScalarMap(value) {
  if (!isPlainObject(value)) {
    return {};
  }
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (!text(key)) {
      continue;
    }
    result[text(key)] = typeof item === "string" ? item.trim() : item;
  }
  return result;
}

function normalizeBooleanMap(value) {
  if (!isPlainObject(value)) {
    return {};
  }
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "boolean") {
      result[text(key)] = item;
    } else if (["true", "1", "yes", "on"].includes(text(item).toLowerCase())) {
      result[text(key)] = true;
    } else if (["false", "0", "no", "off"].includes(text(item).toLowerCase())) {
      result[text(key)] = false;
    }
  }
  return result;
}

function normalizeFiles(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((file) => {
      if (!isPlainObject(file)) {
        return null;
      }
      const id = text(file.id ?? file.fileId);
      const name = text(file.name ?? file.fileName);
      if (!id && !name) {
        return null;
      }
      return {
        id,
        name,
        mimeType: text(file.mimeType ?? file.type),
        size: Math.max(0, Number(file.size ?? file.byteLength ?? 0) || 0),
        status: text(file.status || "stored")
      };
    })
    .filter(Boolean);
}

function normalizeEntries(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => (isPlainObject(entry) ? cloneAnswerObject(entry) : { value: text(entry) }));
}

function cloneAnswerObject(value) {
  if (Array.isArray(value)) {
    return value.map(cloneAnswerObject);
  }
  if (!isPlainObject(value)) {
    return typeof value === "string" ? value.trim() : value ?? {};
  }
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) {
      continue;
    }
    result[key] = cloneAnswerObject(child);
  }
  return result;
}

function isEmptyAnswer(type, answer) {
  if (type === "instruction") {
    return false;
  }
  if (answer === null || answer === undefined || answer === "") {
    return true;
  }
  if (Array.isArray(answer)) {
    return answer.length === 0;
  }
  if (!isPlainObject(answer)) {
    return false;
  }
  if (type === "calculation") {
    return answer.value === null && !text(answer.unit);
  }
  if (type === "table") {
    return Object.keys(answer.cells || {}).length === 0;
  }
  if (type === "dish_assembly") {
    return Object.keys(answer.placements || {}).length === 0 && (answer.selectedIds || []).length === 0;
  }
  if (type === "crossword") {
    return Object.keys(answer.words || {}).length === 0;
  }
  if (type === "file_evidence") {
    return (answer.files || []).length === 0;
  }
  if (type === "observation_log") {
    return (answer.entries || []).length === 0;
  }
  if (type === "safety_checklist") {
    return Object.keys(answer.checks || {}).length === 0;
  }
  return !hasMeaningfulObjectValue(answer);
}

function validateTextAnswer(definition, answer, errors) {
  const length = [...String(answer || "")].length;
  const minimum = Number(definition.minLength ?? 1);
  const maximum = Number(definition.maxLength ?? Number.MAX_SAFE_INTEGER);
  if (length < minimum) {
    errors.push(issue("answer", "text_too_short", `Ответ должен содержать не меньше ${minimum} символов.`));
  }
  if (length > maximum) {
    errors.push(issue("answer", "text_too_long", `Ответ должен содержать не больше ${maximum} символов.`));
  }
}

function calculationUnitRequired(definition) {
  if (definition.unitRequired !== undefined) {
    return Boolean(definition.unitRequired);
  }
  const key = getPrivateAnswerKey(definition);
  return Boolean(text(definition.unit ?? key.unit));
}

function validateRelationMap(answer, sources, targetIds, allowReuse, errors) {
  const seenTargets = new Set();
  for (const source of sources) {
    const target = text(answer[source.id]);
    if (!target) {
      errors.push(issue(`answer.${source.id}`, "relation_required", "Установите соответствие для каждого элемента."));
      continue;
    }
    if (!targetIds.has(target)) {
      errors.push(issue(`answer.${source.id}`, "unknown_target", `Цель «${target}» отсутствует в задании.`));
    }
    if (!allowReuse && seenTargets.has(target)) {
      errors.push(issue(`answer.${source.id}`, "duplicate_target", "Каждую цель можно использовать только один раз."));
    }
    seenTargets.add(target);
  }
}

function validateAnswerPermutation(answer, items, errors) {
  const expectedIds = items.map((item) => item.id);
  const expectedSet = new Set(expectedIds);
  if (answer.length !== expectedIds.length || new Set(answer).size !== answer.length) {
    errors.push(issue("answer.order", "order_incomplete", "Расположите каждый элемент ровно один раз."));
  }
  if (answer.some((id) => !expectedSet.has(id))) {
    errors.push(issue("answer.order", "unknown_item", "Последовательность содержит неизвестный элемент."));
  }
}

function validateTableAnswer(definition, cells, errors) {
  const requiredCells = Array.isArray(definition.requiredCells)
    ? normalizeIdArray(definition.requiredCells)
    : definition.requireAllCells === false
      ? []
      : buildTableCellIds(definition);
  for (const cellId of requiredCells) {
    const value = cells[cellId];
    if (value === undefined || value === null || text(value) === "") {
      errors.push(issue(`answer.cells.${cellId}`, "table_cell_required", "Заполните обязательную ячейку."));
    }
  }
}

function buildTableCellIds(definition) {
  const rows = normalizeEntityList(definition.rows);
  const columns = normalizeEntityList(definition.columns);
  const ids = [];
  for (const row of rows) {
    for (const column of columns) {
      if (column.readOnly || column.input === false) {
        continue;
      }
      ids.push(`${row.id}:${column.id}`);
    }
  }
  return ids;
}

function validateRequiredFields(requiredFields, answer, errors) {
  for (const field of Array.isArray(requiredFields) ? requiredFields : []) {
    const fieldName = text(field);
    if (!fieldName) {
      continue;
    }
    const value = answer?.[fieldName];
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      errors.push(issue(`answer.${fieldName}`, "field_required", `Заполните поле «${fieldName}».`));
    }
  }
}

function validateFiles(definition, files, errors) {
  const minimum = Number(definition.minFiles ?? 1);
  const maximum = Number(definition.maxFiles ?? Number.MAX_SAFE_INTEGER);
  if (files.length < minimum || files.length > maximum) {
    errors.push(issue("answer.files", "file_count", `Приложите от ${minimum} до ${maximum} файлов.`));
  }
  const mimeTypes = new Set(normalizeTextArray(definition.allowedMimeTypes).map((item) => item.toLowerCase()));
  const extensions = new Set(
    normalizeTextArray(definition.allowedExtensions).map((item) => item.toLowerCase().replace(/^\./, ""))
  );
  const maxBytes = Number(definition.maxFileBytes ?? Number.MAX_SAFE_INTEGER);
  files.forEach((file, index) => {
    if (!file.id || !file.name || file.status !== "stored") {
      errors.push(issue(`answer.files[${index}]`, "file_not_stored", "Файл должен быть полностью загружен."));
    }
    if (mimeTypes.size && !mimeTypes.has(file.mimeType.toLowerCase())) {
      errors.push(issue(`answer.files[${index}].mimeType`, "file_type", "Тип файла не разрешён."));
    }
    const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
    if (extensions.size && !extensions.has(extension)) {
      errors.push(issue(`answer.files[${index}].name`, "file_extension", "Расширение файла не разрешено."));
    }
    if (file.size > maxBytes) {
      errors.push(issue(`answer.files[${index}].size`, "file_too_large", "Файл превышает допустимый размер."));
    }
  });
}

function validateSafetyAnswer(definition, checks, items, errors) {
  const requireAllChecked = definition.requireAllChecked !== false;
  for (const item of items) {
    if (typeof checks[item.id] !== "boolean") {
      errors.push(issue(`answer.checks.${item.id}`, "safety_answer_required", "Отметьте каждый пункт безопасности."));
    } else if (requireAllChecked && item.required !== false && checks[item.id] !== true) {
      errors.push(issue(`answer.checks.${item.id}`, "safety_not_confirmed", "Обязательное требование безопасности должно быть подтверждено."));
    }
  }
}

function hasMeaningfulObjectValue(value) {
  if (Array.isArray(value)) {
    return value.some(hasMeaningfulObjectValue);
  }
  if (isPlainObject(value)) {
    return Object.values(value).some(hasMeaningfulObjectValue);
  }
  return value !== null && value !== undefined && text(value) !== "";
}

function deduplicateIssues(errors) {
  const seen = new Set();
  return errors.filter((entry) => {
    const key = `${entry.path}|${entry.code}|${entry.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

module.exports = {
  validateDefinition,
  validateBlockDefinition,
  validateWorkDefinition,
  normalizeAnswer,
  validateAnswer,
  getPrivateAnswerKey,
  hasAnswerKey,
  normalizeIdArray,
  normalizeTextArray,
  normalizeMap,
  buildTableCellIds,
  isPlainObject
};
