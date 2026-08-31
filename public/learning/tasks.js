const KNOWN_TYPES = new Set([
  'instruction',
  'single_choice',
  'multiple_choice',
  'choices',
  'short_text',
  'long_text',
  'text',
  'calculation',
  'matching',
  'ordering',
  'classification',
  'table',
  'ttk_builder',
  'scheme_builder',
  'dish_assembly',
  'crossword',
  'file_evidence',
  'observation_log',
  'safety_checklist',
  'reflection',
]);

let idSequence = 0;

function nextId(prefix = 'task') {
  idSequence += 1;
  return `learning-${prefix}-${idSequence}`;
}

function createElement(tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function createSvgIcon(kind) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const paths = {
    up: ['M12 19V5', 'm5 7-5-7-5 7'],
    down: ['M12 5v14', 'm7-7-7 7-7-7'],
    delete: ['M4 7h16', 'M9 7V4h6v3', 'm6 0-1 14H8L7 7', 'M10 11v6', 'M14 11v6'],
    download: ['M12 3v12', 'm7-7-7 7-7-7', 'M5 21h14'],
  };

  (paths[kind] || []).forEach((pathData) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    svg.append(path);
  });
  return svg;
}

function iconButton(label, icon, disabled = false) {
  const button = createElement('button', 'icon-control');
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.disabled = disabled;
  button.append(createSvgIcon(icon));
  return button;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneSerializable(value) {
  if (value === undefined) return undefined;
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (_error) {
      // Values produced by this module are JSON-compatible; fall through for older browsers.
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return value;
  }
}

function recordFrom(value) {
  const result = Object.create(null);
  if (!isObject(value)) return result;
  Object.keys(value).forEach((key) => {
    result[key] = value[key];
  });
  return result;
}

function nonEmptyText(value) {
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
}

function humanText(value, fallback = '') {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (!isObject(value)) return fallback;
  const candidate = value.label ?? value.text ?? value.title ?? value.name ?? value.prompt ?? value.caption;
  if (typeof candidate === 'string' || typeof candidate === 'number') return String(candidate);
  return fallback;
}

function normalizedCollection(source, prefix) {
  const seen = new Set();
  return asArray(source).map((item, index) => {
    const rawId = isObject(item)
      ? (item.id ?? item.value ?? item.key ?? item.code)
      : item;
    let id = String(rawId ?? `${prefix}-${index + 1}`);
    if (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    return {
      id,
      label: humanText(item, String(rawId ?? index + 1)),
      raw: item,
      index,
    };
  });
}

function valueByKnownKey(object, keys, fallback) {
  if (!isObject(object)) return fallback;
  for (const key of keys) {
    if (object[key] !== undefined && object[key] !== null) return object[key];
  }
  return fallback;
}

function typeOfBlock(block) {
  const raw = String(block?.type || 'text').trim().toLowerCase();
  return raw === 'choice' ? 'single_choice' : raw;
}

function requiresAnswer(block) {
  return typeOfBlock(block) !== 'instruction' && block?.required !== false;
}

function blockItems(block) {
  return normalizedCollection(
    valueByKnownKey(block, ['items', 'leftItems', 'questions', 'components', 'rows'], []),
    'item',
  );
}

function blockOptions(block) {
  return normalizedCollection(
    valueByKnownKey(block, ['options', 'choices', 'variants'], []),
    'option',
  );
}

function hasDeepValue(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.some((item) => hasDeepValue(item, seen));
  if (typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  return Object.entries(value).some(([key, item]) => key !== 'id' && hasDeepValue(item, seen));
}

function resolveMeaningArguments(first, second) {
  if (typeof first === 'string' && KNOWN_TYPES.has(first) && second !== undefined) {
    return { value: second, block: { type: first }, type: first };
  }
  if (isObject(first) && typeof first.type === 'string' && second !== undefined) {
    return { value: second, block: first, type: typeOfBlock(first) };
  }
  const block = typeof second === 'string' ? { type: second } : (isObject(second) ? second : {});
  return { value: first, block, type: typeOfBlock(block) };
}

/**
 * Returns whether an answer contains a substantive value. Both
 * isValueMeaningful(value, block) and isValueMeaningful(block, value) are supported.
 */
export function isValueMeaningful(first, second) {
  const { value, block, type } = resolveMeaningArguments(first, second);

  if (type === 'instruction') return true;
  if (type === 'single_choice') {
    if (!nonEmptyText(value)) return false;
    const options = blockOptions(block);
    return !options.length || options.some((option) => option.id === String(value));
  }
  if (type === 'multiple_choice' || (type === 'choices' && (block.multiple === true || block.selectionMode === 'multiple'))) {
    if (!Array.isArray(value)) return false;
    const selected = [...new Set(value.map(String).filter(nonEmptyText))];
    const minimum = Number(block.minSelections ?? 1);
    const maximum = Number(block.maxSelections ?? Number.MAX_SAFE_INTEGER);
    const optionIds = new Set(blockOptions(block).map((option) => option.id));
    return selected.length >= minimum
      && selected.length <= maximum
      && (!optionIds.size || selected.every((id) => optionIds.has(id)));
  }
  if (type === 'choices') {
    return nonEmptyText(value);
  }
  if (type === 'ordering') {
    if (!Array.isArray(value) || value.length === 0) return false;
    const selected = value.map(String);
    const items = blockItems(block);
    if (!items.length) return new Set(selected).size === selected.length;
    const expected = new Set(items.map((item) => item.id));
    return selected.length === expected.size && new Set(selected).size === expected.size && selected.every((id) => expected.has(id));
  }
  if (type === 'text' || type === 'short_text' || type === 'long_text' || type === 'reflection') {
    if (typeof value !== 'string') return false;
    const length = [...value.trim()].length;
    const minimum = Number(block.minLength ?? 1);
    const maximum = Number(block.maxLength ?? Number.MAX_SAFE_INTEGER);
    return length >= minimum && length <= maximum;
  }
  if (type === 'calculation') {
    const calculationValue = isObject(value) ? value.value : value;
    const parsedCalculationValue = typeof calculationValue === 'number' ? calculationValue : parseDecimal(calculationValue);
    const validNumber = Number.isFinite(parsedCalculationValue);
    if (!validNumber) return false;
    const unitIsRequired = block.unitRequired === true
      || block.requireUnit === true
      || (block.unitRequired !== false && nonEmptyText(block.unit));
    return !unitIsRequired || nonEmptyText(value?.unit);
  }
  if (type === 'matching' || type === 'classification') {
    if (!isObject(value)) return false;
    const items = blockItems(block);
    if (!items.length) return Object.values(value).some(nonEmptyText);
    const targets = normalizedCollection(
      type === 'matching'
        ? valueByKnownKey(block, ['rightItems', 'targets', 'options'], [])
        : valueByKnownKey(block, ['categories', 'groups', 'targets', 'options'], []),
      'target',
    );
    const targetIds = new Set(targets.map((target) => target.id));
    const assigned = items.map((item) => value[item.id]);
    if (assigned.some((target) => !nonEmptyText(target) || (targetIds.size && !targetIds.has(String(target))))) return false;
    return type !== 'matching' || block.allowTargetReuse !== false || new Set(assigned.map(String)).size === assigned.length;
  }
  if (type === 'table') {
    const cells = isObject(value?.cells) ? value.cells : value;
    if (!isObject(cells)) return false;
    const cellHasValue = (cell) => typeof cell === 'boolean' || nonEmptyText(cell);
    let requiredCellIds = asArray(block.requiredCells).map(String).filter(Boolean);
    if (!requiredCellIds.length && block.requireAllCells !== false) {
      const rows = normalizedCollection(valueByKnownKey(block, ['rows', 'items'], []), 'row');
      const columns = normalizeColumns(block).filter((column) => !column.readOnly);
      requiredCellIds = rows.flatMap((row) => columns.map((column) => `${row.id}:${column.id}`));
    }
    return requiredCellIds.length
      ? requiredCellIds.every((cellId) => cellHasValue(cells[cellId]))
      : Object.values(cells).some(cellHasValue);
  }
  if (type === 'file_evidence') {
    const files = Array.isArray(value) ? value : asArray(value?.files);
    const minimum = Number(block.minFiles ?? 1);
    const maximum = Number(block.maxFiles ?? Number.MAX_SAFE_INTEGER);
    return files.length >= minimum
      && files.length <= maximum
      && files.every((file) => isObject(file) && file.status === 'stored' && file.id && file.name);
  }
  if (type === 'safety_checklist') {
    const checks = isObject(value?.checks) ? value.checks : value;
    if (!isObject(checks)) return false;
    const items = blockItems(block);
    if (items.length && items.some((item) => typeof checks[item.id] !== 'boolean')) return false;
    const requiredIds = items.filter((item) => !isObject(item.raw) || item.raw.required !== false).map((item) => item.id);
    if (block.requireAllChecked !== false && requiredIds.length) return requiredIds.every((id) => checks[id] === true);
    return Object.values(checks).some(Boolean);
  }
  if (type === 'crossword') {
    const words = isObject(value?.words) ? value.words : value;
    if (!isObject(words)) return false;
    const clues = normalizedCollection(valueByKnownKey(block, ['clues', 'items', 'questions'], []), 'clue');
    return clues.length ? clues.every((clue) => nonEmptyText(words[clue.id])) : Object.values(words).some(nonEmptyText);
  }
  if (type === 'dish_assembly') {
    return asArray(value?.selectedIds).length > 0 || (isObject(value?.placements) && Object.values(value.placements).some(nonEmptyText));
  }
  if (type === 'ttk_builder') {
    if (!isObject(value) || !hasDeepValue(value)) return false;
    return asArray(block.requiredFields).every((field) => {
      const fieldValue = value[String(field)];
      return Array.isArray(fieldValue) ? fieldValue.length > 0 : hasDeepValue(fieldValue);
    });
  }
  if (type === 'observation_log') {
    const entries = Array.isArray(value) ? value : asArray(value?.entries);
    const minimum = Number(block.minEntries ?? 1);
    return entries.length >= minimum && entries.every((entry) => hasDeepValue(entry));
  }
  return hasDeepValue(value);
}

function makeField(labelText, control, hintText) {
  const label = createElement('label', 'field');
  const caption = createElement('span', null, labelText);
  label.append(caption, control);
  if (hintText) label.append(createElement('small', 'field-hint', hintText));
  return label;
}

function setControlValue(control, value) {
  if (control.type === 'checkbox') {
    control.checked = Boolean(value);
  } else {
    control.value = value === null || value === undefined ? '' : String(value);
  }
}

function makeSelect(options, placeholder, selectedValue) {
  const select = createElement('select');
  const blank = createElement('option', null, placeholder || 'Не выбрано');
  blank.value = '';
  select.append(blank);
  options.forEach((option) => {
    const node = createElement('option', null, option.label);
    node.value = option.id;
    select.append(node);
  });
  select.value = selectedValue === null || selectedValue === undefined ? '' : String(selectedValue);
  return select;
}

function renderInstruction(environment) {
  const { root, block } = environment;
  const panel = createElement('div', 'task-instruction');
  const content = valueByKnownKey(block, ['content', 'text', 'instruction', 'description', 'prompt'], '');
  const paragraphs = Array.isArray(content)
    ? content.map((item) => humanText(item)).filter(Boolean)
    : String(content || '').split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);

  if (!paragraphs.length) {
    panel.append(createElement('p', null, 'Ознакомьтесь с инструкцией перед выполнением работы.'));
  } else {
    paragraphs.forEach((paragraph) => panel.append(createElement('p', null, paragraph)));
  }
  root.append(panel);
  return { getValue: () => null };
}

function renderChoices(environment, forceMultiple) {
  const { root, block, value, readOnly, emit } = environment;
  const options = blockOptions(block);
  const inferredMultiple = typeOfBlock(block) === 'multiple_choice'
    || (typeOfBlock(block) === 'choices' && (block.multiple === true || block.selectionMode === 'multiple'));
  const multiple = forceMultiple ?? inferredMultiple;
  const group = createElement('fieldset', 'choice-group');
  const legend = createElement('legend', null, block.answerLabel || (multiple ? 'Выберите один или несколько вариантов' : 'Выберите один вариант'));
  group.append(legend);
  const name = nextId('choice');
  const selected = multiple
    ? new Set(asArray(value).map(String))
    : new Set(value === null || value === undefined || value === '' ? [] : [String(value)]);
  const controls = [];

  options.forEach((option) => {
    const label = createElement('label', 'choice-option');
    const input = createElement('input');
    input.type = multiple ? 'checkbox' : 'radio';
    input.name = name;
    input.value = option.id;
    input.checked = selected.has(option.id);
    input.disabled = readOnly;
    const copy = createElement('span', null, option.label);
    label.append(input, copy);
    group.append(label);
    controls.push(input);
    input.addEventListener('change', () => {
      if (multiple) {
        if (input.checked) selected.add(option.id);
        else selected.delete(option.id);
      } else {
        selected.clear();
        if (input.checked) selected.add(option.id);
      }
      emit();
    });
  });

  if (!options.length) group.append(createElement('p', 'inline-error', 'Для этого блока не заданы варианты ответа.'));
  root.append(group);
  return {
    getValue: () => multiple
      ? options.filter((option) => selected.has(option.id)).map((option) => option.id)
      : (selected.values().next().value || ''),
    validate: () => {
      if (requiresAnswer(block) && selected.size === 0) {
        return { valid: false, message: 'Выберите вариант ответа.', element: controls[0] };
      }
      if (multiple && Number(block.minSelections) > selected.size) {
        return { valid: false, message: `Выберите не меньше ${Number(block.minSelections)} вариантов.`, element: controls[0] };
      }
      if (multiple && Number(block.maxSelections) > 0 && selected.size > Number(block.maxSelections)) {
        return { valid: false, message: `Выберите не больше ${Number(block.maxSelections)} вариантов.`, element: controls[0] };
      }
      return { valid: true };
    },
    firstControl: controls[0],
  };
}

function renderText(environment, reflection = false) {
  const { root, block, value, readOnly, emit } = environment;
  const singleLine = String(block.type || '').toLowerCase() === 'short_text' || block.multiline === false;
  const control = createElement(singleLine ? 'input' : 'textarea');
  if (!singleLine) control.rows = Number(block.rows) || (reflection || String(block.type).toLowerCase() === 'long_text' ? 7 : 5);
  control.value = typeof value === 'string' ? value : (value?.text || '');
  control.placeholder = block.placeholder || (reflection ? 'Опишите выводы и самооценку…' : 'Введите ответ…');
  control.disabled = readOnly;
  if (Number.isFinite(Number(block.maxLength)) && Number(block.maxLength) > 0) control.maxLength = Number(block.maxLength);
  const hintParts = [];
  if (Number(block.minLength) > 0) hintParts.push(`Минимум ${Number(block.minLength)} знаков`);
  if (Number(block.maxLength) > 0) hintParts.push(`Не более ${Number(block.maxLength)} знаков`);
  root.append(makeField(block.answerLabel || (reflection ? 'Рефлексия' : 'Ответ'), control, hintParts.join(' · ')));
  control.addEventListener('input', emit);
  return {
    getValue: () => control.value,
    validate: () => {
      const length = [...control.value.trim()].length;
      if (requiresAnswer(block) && length === 0) return { valid: false, message: 'Введите ответ.', element: control };
      if (length > 0 && Number(block.minLength) > length) {
        return { valid: false, message: `Ответ должен содержать не менее ${Number(block.minLength)} знаков.`, element: control };
      }
      return { valid: true };
    },
    firstControl: control,
  };
}

function parseDecimal(value) {
  const normalized = String(value ?? '').trim().replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : Number.NaN;
}

function renderCalculation(environment) {
  const { root, block, value, readOnly, emit } = environment;
  const initial = isObject(value) ? value : { value };
  const formula = valueByKnownKey(block, ['formula', 'expression', 'hint'], '');
  if (formula) root.append(createElement('div', 'formula-box', formula));

  const row = createElement('div', 'calculation-row');
  const numberInput = createElement('input');
  numberInput.type = 'text';
  numberInput.inputMode = 'decimal';
  numberInput.autocomplete = 'off';
  numberInput.value = initial.value === null || initial.value === undefined ? '' : String(initial.value);
  numberInput.placeholder = block.placeholder || 'Числовое значение';
  numberInput.disabled = readOnly;
  row.append(makeField(block.valueLabel || 'Результат расчёта', numberInput));

  const units = normalizedCollection(valueByKnownKey(block, ['units', 'unitOptions'], []), 'unit');
  let unitControl;
  if (units.length) {
    unitControl = makeSelect(units, 'Единица', initial.unit ?? block.defaultUnit);
  } else {
    unitControl = createElement('input');
    unitControl.value = initial.unit ?? block.unit ?? '';
    unitControl.placeholder = 'Единица';
    if (block.unit && block.allowCustomUnit !== true) unitControl.readOnly = true;
  }
  unitControl.disabled = readOnly;
  row.append(makeField(block.unitLabel || 'Единица измерения', unitControl));
  root.append(row);
  numberInput.addEventListener('input', emit);
  unitControl.addEventListener(units.length ? 'change' : 'input', emit);

  return {
    getValue: () => ({
      value: Number.isNaN(parseDecimal(numberInput.value)) ? null : parseDecimal(numberInput.value),
      unit: unitControl.value.trim(),
    }),
    validate: () => {
      const parsed = parseDecimal(numberInput.value);
      if (requiresAnswer(block) && parsed === null) return { valid: false, message: 'Введите результат расчёта.', element: numberInput };
      if (Number.isNaN(parsed)) return { valid: false, message: 'Введите корректное число.', element: numberInput };
      if (parsed !== null && Number.isFinite(Number(block.min)) && parsed < Number(block.min)) {
        return { valid: false, message: `Значение должно быть не меньше ${Number(block.min)}.`, element: numberInput };
      }
      if (parsed !== null && Number.isFinite(Number(block.max)) && parsed > Number(block.max)) {
        return { valid: false, message: `Значение должно быть не больше ${Number(block.max)}.`, element: numberInput };
      }
      const unitIsRequired = block.unitRequired === true
        || block.requireUnit === true
        || (block.unitRequired !== false && nonEmptyText(block.unit));
      if (unitIsRequired && !unitControl.value.trim()) return { valid: false, message: 'Укажите единицу измерения.', element: unitControl };
      return { valid: true };
    },
    firstControl: numberInput,
  };
}

function renderMapping(environment, classification = false) {
  const { root, block, value, readOnly, emit } = environment;
  const items = blockItems(block);
  const targets = normalizedCollection(
    classification
      ? valueByKnownKey(block, ['categories', 'groups', 'targets', 'options'], [])
      : valueByKnownKey(block, ['rightItems', 'targets', 'options'], []),
    classification ? 'category' : 'target',
  );
  const state = recordFrom(value);
  const list = createElement('div', 'mapping-list');
  const controls = [];

  items.forEach((item) => {
    const row = createElement('div', 'mapping-row');
    row.append(createElement('span', null, item.label));
    let control;
    if (targets.length) {
      control = makeSelect(targets, classification ? 'Выберите категорию' : 'Выберите соответствие', state[item.id]);
      control.addEventListener('change', () => {
        state[item.id] = control.value;
        emit();
      });
    } else {
      control = createElement('input');
      control.value = state[item.id] ?? '';
      control.placeholder = classification ? 'Категория' : 'Соответствие';
      control.addEventListener('input', () => {
        state[item.id] = control.value;
        emit();
      });
    }
    control.setAttribute('aria-label', `${classification ? 'Категория' : 'Соответствие'}: ${item.label}`);
    control.disabled = readOnly;
    controls.push(control);
    row.append(control);
    list.append(row);
  });

  if (!items.length) list.append(createElement('p', 'inline-error', 'Для этого блока не заданы элементы.'));
  root.append(list);
  return {
    getValue: () => {
      const answer = Object.create(null);
      items.forEach((item) => { answer[item.id] = state[item.id] ?? ''; });
      return answer;
    },
    validate: () => {
      if (requiresAnswer(block)) {
        const missingIndex = items.findIndex((item) => !nonEmptyText(state[item.id]));
        if (missingIndex >= 0) return { valid: false, message: 'Заполните все соответствия.', element: controls[missingIndex] };
      }
      if (!classification && block.allowTargetReuse === false) {
        const values = items.map((item) => state[item.id]).filter(nonEmptyText);
        if (new Set(values).size !== values.length) {
          return { valid: false, message: 'Каждый вариант соответствия можно использовать только один раз.', element: controls[0] };
        }
      }
      return { valid: true };
    },
    firstControl: controls[0],
  };
}

function renderOrdering(environment) {
  const { root, block, value, readOnly, emit, announce } = environment;
  const items = blockItems(block);
  const knownIds = new Set(items.map((item) => item.id));
  const initial = asArray(value).map(String).filter((id, index, all) => knownIds.has(id) && all.indexOf(id) === index);
  const order = [...initial, ...items.map((item) => item.id).filter((id) => !initial.includes(id))];
  const labelById = new Map(items.map((item) => [item.id, item.label]));
  const list = createElement('div', 'arrangement-list');

  function move(index, delta) {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= order.length || readOnly) return;
    const [moved] = order.splice(index, 1);
    order.splice(nextIndex, 0, moved);
    renderRows();
    emit();
    announce(`${labelById.get(moved)}: позиция ${nextIndex + 1} из ${order.length}.`);
    list.querySelector(`[data-order-index="${nextIndex}"]`)?.focus();
  }

  function renderRows() {
    list.replaceChildren();
    order.forEach((id, index) => {
      const label = labelById.get(id) || id;
      const row = createElement('div', 'arrangement-row');
      row.tabIndex = readOnly ? -1 : 0;
      row.dataset.orderIndex = String(index);
      row.setAttribute('aria-label', `${index + 1}. ${label}`);
      row.append(createElement('span', 'arrangement-index', index + 1), createElement('span', null, label));
      const actions = createElement('div', 'reorder-actions');
      const up = iconButton(`Переместить «${label}» вверх`, 'up', readOnly || index === 0);
      const down = iconButton(`Переместить «${label}» вниз`, 'down', readOnly || index === order.length - 1);
      up.addEventListener('click', () => move(index, -1));
      down.addEventListener('click', () => move(index, 1));
      actions.append(up, down);
      row.append(actions);
      row.addEventListener('keydown', (event) => {
        if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
        event.preventDefault();
        move(index, event.key === 'ArrowUp' ? -1 : 1);
      });
      list.append(row);
    });
  }

  renderRows();
  root.append(list);
  return {
    getValue: () => order.slice(),
    validate: () => ({ valid: !requiresAnswer(block) || order.length > 0, message: 'Расположите элементы по порядку.', element: list.querySelector('[tabindex]') }),
    firstControl: list.querySelector('[tabindex]'),
  };
}

function normalizeColumns(block) {
  const source = valueByKnownKey(block, ['columns', 'fields', 'headers'], []);
  return normalizedCollection(source, 'column').map((column) => {
    const raw = isObject(column.raw) ? column.raw : {};
    return {
      ...column,
      type: String(raw.type || raw.inputType || 'text').toLowerCase(),
      options: normalizedCollection(raw.options || raw.choices || [], `${column.id}-option`),
      required: raw.required === true,
      readOnly: raw.readOnly === true || raw.editable === false || raw.input === false,
      placeholder: raw.placeholder || '',
      defaultValue: raw.defaultValue,
    };
  });
}

function renderTable(environment) {
  const { root, block, value, readOnly, emit } = environment;
  const columns = normalizeColumns(block);
  const rows = normalizedCollection(valueByKnownKey(block, ['rows', 'items'], []), 'row');
  const initialCells = recordFrom(isObject(value?.cells) ? value.cells : value);
  const state = recordFrom(initialCells);
  const controls = [];
  const wrap = createElement('div', 'task-table-wrap');
  const table = createElement('table', 'task-table');
  const caption = createElement('caption', 'visually-hidden', block.caption || block.title || 'Таблица ответа');
  const head = createElement('thead');
  const headRow = createElement('tr');
  const rowHeader = block.rowHeader || 'Позиция';
  headRow.append(createElement('th', null, rowHeader));
  columns.forEach((column) => {
    const th = createElement('th', null, column.label);
    th.scope = 'col';
    headRow.append(th);
  });
  head.append(headRow);
  const body = createElement('tbody');

  rows.forEach((row) => {
    const tr = createElement('tr');
    const rowLabel = createElement('td', null, row.label);
    rowLabel.setAttribute('role', 'rowheader');
    rowLabel.dataset.label = rowHeader;
    tr.append(rowLabel);
    columns.forEach((column) => {
      const cellKey = `${row.id}:${column.id}`;
      const td = createElement('td');
      td.dataset.label = column.label;
      const rowRaw = isObject(row.raw) ? row.raw : {};
      const seeded = state[cellKey] ?? (isObject(rowRaw.cells) ? rowRaw.cells[column.id] : undefined) ?? column.defaultValue ?? '';
      let control;
      if (column.type === 'select' && column.options.length) {
        control = makeSelect(column.options, column.placeholder || 'Не выбрано', seeded);
      } else {
        control = createElement('input');
        control.type = column.type === 'checkbox' ? 'checkbox' : (column.type === 'number' ? 'number' : 'text');
        control.placeholder = column.placeholder;
        setControlValue(control, seeded);
      }
      control.setAttribute('aria-label', `${column.label}, ${row.label}`);
      control.disabled = readOnly || column.readOnly;
      state[cellKey] = control.type === 'checkbox' ? control.checked : control.value;
      control.addEventListener(control.type === 'checkbox' || control.tagName === 'SELECT' ? 'change' : 'input', () => {
        state[cellKey] = control.type === 'checkbox' ? control.checked : control.value;
        emit();
      });
      controls.push({ control, column, cellKey });
      td.append(control);
      tr.append(td);
    });
    body.append(tr);
  });

  table.append(caption, head, body);
  wrap.append(table);
  if (!rows.length || !columns.length) wrap.append(createElement('p', 'inline-error', 'Для таблицы не заданы строки или столбцы.'));
  root.append(wrap);
  return {
    getValue: () => {
      const cells = Object.create(null);
      controls.forEach(({ control, cellKey }) => {
        cells[cellKey] = control.type === 'checkbox' ? control.checked : control.value;
      });
      return { cells };
    },
    validate: () => {
      if (requiresAnswer(block) || block.requireAllCells) {
        const missing = controls.find(({ control, column }) => {
          if (column.readOnly) return false;
          if (control.type === 'checkbox') return column.required && !control.checked;
          return !nonEmptyText(control.value);
        });
        if (missing) return { valid: false, message: 'Заполните обязательные ячейки таблицы.', element: missing.control };
      }
      return { valid: true };
    },
    firstControl: controls[0]?.control,
  };
}

function renderTtkBuilder(environment) {
  const { root, block, value, readOnly, emit, announce } = environment;
  const initial = isObject(value) ? cloneSerializable(value) : {};
  const dishName = createElement('input');
  dishName.value = initial.dishName ?? '';
  dishName.placeholder = block.dishNamePlaceholder || 'Название блюда';
  dishName.disabled = readOnly;
  dishName.addEventListener('input', emit);
  root.append(makeField('Название блюда', dishName));

  const ingredients = asArray(initial.ingredients).map((ingredient) => ({
    runtimeId: nextId('ingredient'),
    name: isObject(ingredient) ? String(ingredient.name ?? '') : humanText(ingredient),
    amount: isObject(ingredient) ? ingredient.amount ?? '' : '',
  }));
  const steps = asArray(initial.steps).map((step) => ({
    runtimeId: nextId('step'),
    value: isObject(step) ? humanText(step) : String(step ?? ''),
  }));
  const ingredientList = createElement('div', 'dynamic-list');
  const stepList = createElement('div', 'dynamic-list');
  const ingredientAdd = createElement('button', 'learning-button secondary', 'Добавить ингредиент');
  const stepAdd = createElement('button', 'learning-button secondary', 'Добавить этап');
  ingredientAdd.type = 'button';
  stepAdd.type = 'button';
  ingredientAdd.disabled = readOnly;
  stepAdd.disabled = readOnly;
  const stepSuggestions = normalizedCollection(block.availableSteps || [], 'step-option');
  let stepDataList;
  if (stepSuggestions.length) {
    stepDataList = createElement('datalist');
    stepDataList.id = nextId('step-suggestions');
    stepSuggestions.forEach((suggestion) => {
      const option = createElement('option');
      option.value = suggestion.label;
      stepDataList.append(option);
    });
    root.append(stepDataList);
  }

  function parsedAmount(raw) {
    const parsed = parseDecimal(raw);
    return parsed === null || Number.isNaN(parsed) ? String(raw ?? '').trim() : parsed;
  }

  function move(collection, index, delta, render, noun) {
    const nextIndex = index + delta;
    if (readOnly || nextIndex < 0 || nextIndex >= collection.length) return;
    const [entry] = collection.splice(index, 1);
    collection.splice(nextIndex, 0, entry);
    render();
    emit();
    announce(`${noun} перемещён на позицию ${nextIndex + 1} из ${collection.length}.`);
  }

  function rowActions(collection, index, render, noun) {
    const actions = createElement('div', 'dynamic-row-actions');
    const up = iconButton(`Переместить ${noun.toLowerCase()} ${index + 1} вверх`, 'up', readOnly || index === 0);
    const down = iconButton(`Переместить ${noun.toLowerCase()} ${index + 1} вниз`, 'down', readOnly || index === collection.length - 1);
    const remove = iconButton(`Удалить ${noun.toLowerCase()} ${index + 1}`, 'delete', readOnly);
    up.addEventListener('click', () => move(collection, index, -1, render, noun));
    down.addEventListener('click', () => move(collection, index, 1, render, noun));
    remove.addEventListener('click', () => {
      if (readOnly) return;
      collection.splice(index, 1);
      render();
      emit();
      announce(`${noun} ${index + 1} удалён.`);
    });
    actions.append(up, down, remove);
    return actions;
  }

  function renderIngredients() {
    ingredientList.replaceChildren();
    ingredients.forEach((ingredient, index) => {
      const row = createElement('div', 'dynamic-row');
      row.dataset.ttkIngredient = String(index);
      const name = createElement('input');
      name.value = ingredient.name;
      name.placeholder = 'Наименование';
      name.disabled = readOnly;
      const amount = createElement('input');
      amount.type = 'text';
      amount.inputMode = 'decimal';
      amount.value = ingredient.amount ?? '';
      amount.placeholder = 'Количество';
      amount.disabled = readOnly;
      name.addEventListener('input', () => { ingredient.name = name.value; emit(); });
      amount.addEventListener('input', () => { ingredient.amount = amount.value; emit(); });
      row.append(makeField('Ингредиент', name), makeField('Количество', amount), rowActions(ingredients, index, renderIngredients, 'Ингредиент'));
      ingredientList.append(row);
    });
  }

  function renderSteps() {
    stepList.replaceChildren();
    steps.forEach((step, index) => {
      const row = createElement('div', 'dynamic-row');
      row.dataset.ttkStep = String(index);
      const input = createElement('input');
      input.value = step.value;
      input.placeholder = 'Опишите этап приготовления';
      input.disabled = readOnly;
      if (stepDataList) input.setAttribute('list', stepDataList.id);
      input.addEventListener('input', () => { step.value = input.value; emit(); });
      row.append(makeField(`Этап ${index + 1}`, input), rowActions(steps, index, renderSteps, 'Этап'));
      stepList.append(row);
    });
  }

  ingredientAdd.addEventListener('click', () => {
    if (readOnly || (Number(block.maxIngredients) > 0 && ingredients.length >= Number(block.maxIngredients))) return;
    ingredients.push({ runtimeId: nextId('ingredient'), name: '', amount: '' });
    renderIngredients();
    emit();
    ingredientList.querySelector(`[data-ttk-ingredient="${ingredients.length - 1}"] input`)?.focus();
  });
  stepAdd.addEventListener('click', () => {
    if (readOnly || (Number(block.maxSteps) > 0 && steps.length >= Number(block.maxSteps))) return;
    steps.push({ runtimeId: nextId('step'), value: '' });
    renderSteps();
    emit();
    stepList.querySelector(`[data-ttk-step="${steps.length - 1}"] input`)?.focus();
  });

  const ingredientHeading = createElement('h4', null, 'Ингредиенты');
  const stepHeading = createElement('h4', null, 'Последовательность приготовления');
  renderIngredients();
  renderSteps();
  root.append(ingredientHeading, ingredientList, ingredientAdd, stepHeading, stepList, stepAdd);

  return {
    getValue: () => ({
      dishName: dishName.value.trim(),
      ingredients: ingredients.map((ingredient) => ({ name: ingredient.name.trim(), amount: parsedAmount(ingredient.amount) })),
      steps: steps.map((step) => step.value.trim()),
    }),
    validate: () => {
      const requiredFields = new Set(asArray(block.requiredFields).map(String));
      if (requiredFields.has('dishName') && !dishName.value.trim()) {
        return { valid: false, message: 'Укажите название блюда.', element: dishName };
      }
      if ((requiredFields.has('ingredients') || Number(block.minIngredients) > 0) && ingredients.length < Math.max(1, Number(block.minIngredients) || 0)) {
        return { valid: false, message: `Добавьте не меньше ${Math.max(1, Number(block.minIngredients) || 0)} ингредиента.`, element: ingredientAdd };
      }
      const incompleteIngredient = ingredients.findIndex((ingredient) => !ingredient.name.trim());
      if (incompleteIngredient >= 0) {
        return { valid: false, message: `Укажите название ингредиента ${incompleteIngredient + 1}.`, element: ingredientList.querySelector(`[data-ttk-ingredient="${incompleteIngredient}"] input`) };
      }
      if ((requiredFields.has('steps') || Number(block.minSteps) > 0) && steps.length < Math.max(1, Number(block.minSteps) || 0)) {
        return { valid: false, message: `Добавьте не меньше ${Math.max(1, Number(block.minSteps) || 0)} этапа приготовления.`, element: stepAdd };
      }
      const incompleteStep = steps.findIndex((step) => !step.value.trim());
      if (incompleteStep >= 0) {
        return { valid: false, message: `Заполните этап ${incompleteStep + 1}.`, element: stepList.querySelector(`[data-ttk-step="${incompleteStep}"] input`) };
      }
      return { valid: true };
    },
    firstControl: dishName,
  };
}

const DYNAMIC_DEFAULTS = {
  scheme_builder: {
    key: 'nodes',
    addLabel: 'Добавить узел схемы',
    fields: [
      { id: 'type', label: 'Тип узла', required: true },
      { id: 'label', label: 'Название этапа', required: true },
    ],
  },
  observation_log: {
    key: 'entries',
    addLabel: 'Добавить наблюдение',
    fields: [
      { id: 'time', label: 'Время' },
      { id: 'indicator', label: 'Показатель', required: true },
      { id: 'result', label: 'Результат', required: true },
      { id: 'note', label: 'Примечание' },
    ],
  },
};

function normalizeDynamicFields(block, type) {
  const configured = asArray(block.fields || block.columns);
  const source = configured.length ? configured : DYNAMIC_DEFAULTS[type].fields;
  const fields = normalizedCollection(source, 'field').map((field) => {
    const raw = isObject(field.raw) ? field.raw : {};
    return {
      id: field.id,
      label: field.label,
      type: String(raw.type || 'text').toLowerCase(),
      required: raw.required === true,
      placeholder: raw.placeholder || '',
      options: normalizedCollection(raw.options || raw.choices || [], `${field.id}-option`),
    };
  });
  if (type === 'scheme_builder') {
    const nodeTypes = normalizedCollection(block.nodeTypes || [], 'node-type');
    const availableSteps = normalizedCollection(block.availableSteps || [], 'available-step');
    fields.forEach((field) => {
      if (field.id === 'type' && nodeTypes.length) {
        field.type = 'select';
        field.options = nodeTypes;
      }
      if (field.id === 'label' && availableSteps.length) {
        field.type = 'select';
        field.options = availableSteps;
      }
    });
  }
  return fields;
}

function renderDynamicBuilder(environment, type) {
  const { root, block, value, readOnly, emit, announce } = environment;
  const defaults = DYNAMIC_DEFAULTS[type];
  const fields = normalizeDynamicFields(block, type);
  const keyCandidates = [block.collectionKey, defaults.key, 'rows', 'items'].filter(Boolean);
  const collectionKey = keyCandidates.find((key) => Array.isArray(value?.[key])) || block.collectionKey || defaults.key;
  const initialRows = Array.isArray(value) ? value : asArray(value?.[collectionKey]);
  const rows = initialRows.map((row) => ({ runtimeId: nextId('row'), data: isObject(row) ? cloneSerializable(row) : {} }));
  const list = createElement('div', 'dynamic-list');
  const add = createElement('button', 'learning-button secondary', block.addLabel || defaults.addLabel);
  add.type = 'button';
  add.disabled = readOnly;

  function createRow() {
    const data = {};
    if (type === 'scheme_builder') data.id = nextId('node');
    fields.forEach((field) => { data[field.id] = field.type === 'checkbox' ? false : ''; });
    return { runtimeId: nextId('row'), data };
  }

  function move(index, delta) {
    const nextIndex = index + delta;
    if (readOnly || nextIndex < 0 || nextIndex >= rows.length) return;
    const [row] = rows.splice(index, 1);
    rows.splice(nextIndex, 0, row);
    renderRows();
    emit();
    announce(`Запись перемещена на позицию ${nextIndex + 1} из ${rows.length}.`);
    list.querySelector(`[data-dynamic-index="${nextIndex}"]`)?.focus();
  }

  function renderRows() {
    list.replaceChildren();
    const maxRows = Number(block.maxRows || 0);
    add.disabled = readOnly || (maxRows > 0 && rows.length >= maxRows);
    rows.forEach((rowState, rowIndex) => {
      const row = createElement('div', 'dynamic-row');
      row.tabIndex = readOnly ? -1 : 0;
      row.dataset.dynamicIndex = String(rowIndex);
      row.setAttribute('aria-label', `Запись ${rowIndex + 1}`);
      fields.forEach((field) => {
        let control;
        if (field.type === 'select' && field.options.length) {
          control = makeSelect(field.options, field.placeholder || 'Не выбрано', rowState.data[field.id]);
        } else if (field.type === 'textarea') {
          control = createElement('textarea');
          control.rows = 2;
          setControlValue(control, rowState.data[field.id]);
        } else {
          control = createElement('input');
          control.type = field.type === 'checkbox' ? 'checkbox' : (field.type === 'number' ? 'number' : 'text');
          control.placeholder = field.placeholder;
          setControlValue(control, rowState.data[field.id]);
        }
        control.disabled = readOnly;
        control.dataset.fieldId = field.id;
        control.addEventListener(control.type === 'checkbox' || control.tagName === 'SELECT' ? 'change' : 'input', () => {
          rowState.data[field.id] = control.type === 'checkbox' ? control.checked : control.value;
          emit();
        });
        row.append(makeField(`${field.label}${field.required ? ' *' : ''}`, control));
      });

      const actions = createElement('div', 'dynamic-row-actions');
      const up = iconButton(`Переместить запись ${rowIndex + 1} вверх`, 'up', readOnly || rowIndex === 0);
      const down = iconButton(`Переместить запись ${rowIndex + 1} вниз`, 'down', readOnly || rowIndex === rows.length - 1);
      const remove = iconButton(`Удалить запись ${rowIndex + 1}`, 'delete', readOnly || rows.length <= Number(block.minRows || 0));
      up.addEventListener('click', () => move(rowIndex, -1));
      down.addEventListener('click', () => move(rowIndex, 1));
      remove.addEventListener('click', () => {
        if (readOnly) return;
        rows.splice(rowIndex, 1);
        renderRows();
        emit();
        announce(`Запись ${rowIndex + 1} удалена.`);
        (list.querySelector(`[data-dynamic-index="${Math.min(rowIndex, rows.length - 1)}"]`) || add).focus();
      });
      actions.append(up, down, remove);
      row.append(actions);
      row.addEventListener('keydown', (event) => {
        if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
        event.preventDefault();
        move(rowIndex, event.key === 'ArrowUp' ? -1 : 1);
      });
      list.append(row);
    });
  }

  add.addEventListener('click', () => {
    const maxRows = Number(block.maxRows || 0);
    if (readOnly || (maxRows > 0 && rows.length >= maxRows)) return;
    rows.push(createRow());
    renderRows();
    emit();
    announce(`Добавлена запись ${rows.length}.`);
    list.querySelector(`[data-dynamic-index="${rows.length - 1}"] input, [data-dynamic-index="${rows.length - 1}"] textarea, [data-dynamic-index="${rows.length - 1}"] select`)?.focus();
    if (maxRows > 0 && rows.length >= maxRows) add.disabled = true;
  });

  renderRows();
  root.append(list, add);
  return {
    getValue: () => ({ [collectionKey]: rows.map((row) => cloneSerializable(row.data)) }),
    validate: () => {
      const requiredMinimum = type === 'observation_log'
        ? (requiresAnswer(block) || rows.length ? Number(block.minEntries ?? 1) : 0)
        : (requiresAnswer(block) ? 1 : 0);
      if (requiredMinimum > 0 && rows.length < requiredMinimum) {
        return { valid: false, message: `Добавьте не меньше ${requiredMinimum} записей.`, element: add };
      }
      if (requiresAnswer(block)) {
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
          const field = fields.find((candidate) => candidate.required && !nonEmptyText(rows[rowIndex].data[candidate.id]));
          if (field) {
            const rowElement = list.querySelector(`[data-dynamic-index="${rowIndex}"]`);
            const element = Array.from(rowElement?.querySelectorAll('[data-field-id]') || [])
              .find((control) => control.dataset.fieldId === field.id);
            return { valid: false, message: `Заполните поле «${field.label}» в записи ${rowIndex + 1}.`, element };
          }
        }
      }
      if (type === 'observation_log') {
        const emptyRow = rows.findIndex((row) => !fields.some((field) => hasDeepValue(row.data[field.id])));
        if (emptyRow >= 0) {
          const element = list.querySelector(`[data-dynamic-index="${emptyRow}"] input, [data-dynamic-index="${emptyRow}"] textarea, [data-dynamic-index="${emptyRow}"] select`);
          return { valid: false, message: `Заполните запись наблюдения ${emptyRow + 1}.`, element };
        }
      }
      return { valid: true };
    },
    firstControl: list.querySelector('input, textarea, select') || add,
  };
}

function renderDishAssembly(environment) {
  const { root, block, value, readOnly, emit } = environment;
  const components = normalizedCollection(valueByKnownKey(block, ['components', 'items'], []), 'component');
  const slots = normalizedCollection(valueByKnownKey(block, ['slots', 'categories', 'zones'], []), 'slot');
  const placements = recordFrom(value?.placements);
  const selected = new Set(asArray(value?.selectedIds).map(String));
  const list = createElement('fieldset', 'choice-group');
  list.append(createElement('legend', null, block.answerLabel || 'Состав и размещение блюда'));
  const firstControls = [];

  components.forEach((component) => {
    const row = createElement('div', 'mapping-row');
    const choice = createElement('label', 'check-item');
    const checkbox = createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selected.has(component.id);
    checkbox.disabled = readOnly;
    choice.append(checkbox, createElement('span', null, component.label));
    row.append(choice);
    let select;
    if (slots.length) {
      select = makeSelect(slots, 'Выберите место', placements[component.id]);
      select.setAttribute('aria-label', `Размещение: ${component.label}`);
      select.disabled = readOnly || !checkbox.checked;
      select.addEventListener('change', () => {
        placements[component.id] = select.value;
        if (select.value) {
          selected.add(component.id);
          checkbox.checked = true;
        }
        emit();
      });
      row.append(select);
    }
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selected.add(component.id);
      else {
        selected.delete(component.id);
        delete placements[component.id];
        if (select) select.value = '';
      }
      if (select) select.disabled = readOnly || !checkbox.checked;
      emit();
    });
    firstControls.push(checkbox);
    list.append(row);
  });

  if (!components.length) list.append(createElement('p', 'inline-error', 'Для сборки не заданы компоненты.'));
  root.append(list);
  return {
    getValue: () => {
      const answerPlacements = Object.create(null);
      components.forEach((component) => {
        if (selected.has(component.id) && placements[component.id]) answerPlacements[component.id] = placements[component.id];
      });
      return {
        placements: answerPlacements,
        selectedIds: components.filter((component) => selected.has(component.id)).map((component) => component.id),
      };
    },
    validate: () => {
      if (requiresAnswer(block) && selected.size === 0) return { valid: false, message: 'Выберите компоненты блюда.', element: firstControls[0] };
      if (requiresAnswer(block) && slots.length) {
        const missing = components.findIndex((component) => selected.has(component.id) && !placements[component.id]);
        if (missing >= 0) return { valid: false, message: 'Укажите размещение каждого выбранного компонента.', element: list.querySelectorAll('select')[missing] };
      }
      return { valid: true };
    },
    firstControl: firstControls[0],
  };
}

function renderCrossword(environment) {
  const { root, block, value, readOnly, emit } = environment;
  const clues = normalizedCollection(valueByKnownKey(block, ['clues', 'items', 'questions'], []), 'clue');
  const words = recordFrom(isObject(value?.words) ? value.words : value);
  const controls = [];
  const list = createElement('div');

  clues.forEach((clue, index) => {
    const raw = isObject(clue.raw) ? clue.raw : {};
    const number = raw.number ?? index + 1;
    const direction = raw.direction ? `, ${humanText(raw.direction, raw.direction)}` : '';
    const prompt = `${number}${direction}. ${clue.label}`;
    const input = createElement('input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = words[clue.id] ?? '';
    input.disabled = readOnly;
    if (Number(raw.length) > 0) input.maxLength = Number(raw.length);
    input.setAttribute('aria-label', `Ответ на вопрос ${prompt}`);
    input.addEventListener('input', () => {
      words[clue.id] = input.value;
      emit();
    });
    const row = createElement('div', 'crossword-clue');
    row.append(createElement('span', null, prompt), input);
    list.append(row);
    controls.push(input);
  });

  if (!clues.length) list.append(createElement('p', 'inline-error', 'Для кроссворда не заданы вопросы.'));
  root.append(list);
  return {
    getValue: () => {
      const answerWords = Object.create(null);
      clues.forEach((clue) => { answerWords[clue.id] = words[clue.id] ?? ''; });
      return { words: answerWords };
    },
    validate: () => {
      if (requiresAnswer(block)) {
        const missing = clues.findIndex((clue) => !nonEmptyText(words[clue.id]));
        if (missing >= 0) return { valid: false, message: 'Заполните все ответы кроссворда.', element: controls[missing] };
      }
      return { valid: true };
    },
    firstControl: controls[0],
  };
}

function formatBytes(size) {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes < 0) return 'Размер не указан';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} КБ`;
  return `${(bytes / 1024 ** 2).toFixed(1)} МБ`;
}

function safeDownloadUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value, window.location.href);
    if (url.origin !== window.location.origin && url.protocol !== 'https:') return null;
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.href;
  } catch (_error) {
    return null;
  }
}

function renderFileEvidence(environment) {
  const { root, block, value, readOnly, emit, announce, context, isDestroyed } = environment;
  const files = (Array.isArray(value) ? value : asArray(value?.files)).map((file) => cloneSerializable(file));
  const uploads = new Map();
  const errors = [];
  const dropzone = createElement('div', 'file-dropzone');
  const inputId = nextId('file');
  const input = createElement('input', 'visually-hidden');
  input.type = 'file';
  input.id = inputId;
  input.multiple = block.multiple !== false && Number(block.maxFiles || 2) !== 1;
  input.disabled = readOnly;
  const explicitAccepts = Array.isArray(block.accept) ? block.accept : String(block.accept || block.acceptedTypes || '').split(',');
  const mimeAccepts = asArray(block.allowedMimeTypes);
  const extensionAccepts = asArray(block.allowedExtensions).map((extension) => {
    const normalized = String(extension || '').trim();
    return normalized && !normalized.startsWith('.') ? `.${normalized}` : normalized;
  });
  const accepts = [...explicitAccepts, ...mimeAccepts, ...extensionAccepts]
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .join(',');
  if (accepts) input.accept = String(accepts);
  const selectButton = createElement('button', 'learning-button secondary', block.uploadLabel || 'Выбрать файлы');
  selectButton.type = 'button';
  selectButton.disabled = readOnly;
  selectButton.addEventListener('click', () => input.click());
  dropzone.append(
    createElement('strong', null, block.dropLabel || 'Добавьте подтверждающие файлы'),
    createElement('span', 'field-hint', block.fileHint || 'Можно выбрать файл кнопкой или перетащить его в эту область.'),
    selectButton,
    input,
  );
  const list = createElement('div', 'file-list');
  const status = createElement('div');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  function maximumSize() {
    if (Number(block.maxFileBytes) > 0) return Number(block.maxFileBytes);
    if (Number(block.maxFileSize) > 0) return Number(block.maxFileSize);
    if (Number(block.maxFileSizeMb) > 0) return Number(block.maxFileSizeMb) * 1024 ** 2;
    return 0;
  }

  function fileIsAccepted(file) {
    const explicitTokens = explicitAccepts.map((token) => String(token || '').trim().toLowerCase()).filter(Boolean);
    const allowedMimes = mimeAccepts.map((token) => String(token || '').trim().toLowerCase()).filter(Boolean);
    const allowedExtensions = extensionAccepts.map((token) => String(token || '').trim().toLowerCase().replace(/^\./, '')).filter(Boolean);
    const name = file.name.toLowerCase();
    const mime = String(file.type || '').toLowerCase();
    const extension = name.includes('.') ? name.split('.').pop() : '';
    const matchesToken = (token) => {
      if (token.startsWith('.')) return name.endsWith(token);
      if (token.endsWith('/*')) return mime.startsWith(token.slice(0, -1));
      return mime === token;
    };
    if (explicitTokens.length && !explicitTokens.some(matchesToken)) return false;
    if (allowedMimes.length && !allowedMimes.some(matchesToken)) return false;
    if (allowedExtensions.length && !allowedExtensions.includes(extension)) return false;
    return true;
  }

  function progressValue(valueOrEvent) {
    if (typeof valueOrEvent === 'number') return Math.max(0, Math.min(100, valueOrEvent <= 1 ? valueOrEvent * 100 : valueOrEvent));
    const loaded = Number(valueOrEvent?.loaded);
    const total = Number(valueOrEvent?.total);
    return Number.isFinite(loaded) && Number.isFinite(total) && total > 0 ? Math.max(0, Math.min(100, loaded / total * 100)) : 0;
  }

  async function confirmDelete(file) {
    if (typeof context.confirm !== 'function') return true;
    return Boolean(await context.confirm(`Удалить файл «${humanText(file, file.name || 'файл')}»?`));
  }

  async function removeFile(file) {
    if (readOnly || !(await confirmDelete(file))) return;
    try {
      if (typeof context.deleteFile === 'function') {
        const deletionResult = await context.deleteFile(file, block);
        if (deletionResult === false) return;
      }
      if (isDestroyed()) return;
      const currentIndex = files.indexOf(file);
      if (currentIndex >= 0) files.splice(currentIndex, 1);
      renderFiles();
      emit();
      announce(`Файл «${file.name || 'Без названия'}» удалён.`);
    } catch (error) {
      errors.push(error?.message || 'Не удалось удалить файл.');
      renderFiles();
    }
  }

  async function downloadFile(file) {
    try {
      if (typeof context.downloadFile === 'function') {
        await context.downloadFile(file, block);
        return;
      }
      const url = safeDownloadUrl(file.downloadUrl || file.url);
      if (url) window.location.assign(url);
    } catch (error) {
      errors.push(error?.message || 'Не удалось скачать файл.');
      renderFiles();
    }
  }

  function renderFiles() {
    list.replaceChildren();
    files.forEach((file) => {
      const row = createElement('div', 'file-row');
      const copy = createElement('div');
      copy.append(
        createElement('strong', null, file.name || 'Файл без названия'),
        createElement('span', null, `${formatBytes(file.size)}${file.status && file.status !== 'stored' ? ` · ${file.status}` : ''}`),
      );
      row.append(copy);
      if (typeof context.downloadFile === 'function' || safeDownloadUrl(file.downloadUrl || file.url)) {
        const download = iconButton(`Скачать «${file.name || 'файл'}»`, 'download');
        download.addEventListener('click', () => downloadFile(file));
        row.append(download);
      } else {
        row.append(createElement('span'));
      }
      if (!readOnly) {
        const remove = iconButton(`Удалить «${file.name || 'файл'}»`, 'delete');
        remove.addEventListener('click', () => removeFile(file));
        row.append(remove);
      }
      list.append(row);
    });

    uploads.forEach((upload) => {
      const row = createElement('div', 'file-row');
      const copy = createElement('div');
      copy.append(createElement('strong', null, upload.file.name), createElement('span', null, upload.status));
      const progress = createElement('div', 'upload-progress');
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-label', `Загрузка ${upload.file.name}`);
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', '100');
      progress.setAttribute('aria-valuenow', String(Math.round(upload.progress)));
      const fill = createElement('span');
      fill.style.width = `${upload.progress}%`;
      progress.append(fill);
      row.append(copy, progress, createElement('span'));
      list.append(row);
    });

    status.replaceChildren();
    if (errors.length) {
      const errorPanel = createElement('div', 'inline-error');
      errors.splice(0).forEach((message) => errorPanel.append(createElement('p', null, message)));
      status.append(errorPanel);
    } else if (!files.length && !uploads.size) {
      status.append(createElement('p', 'field-hint', 'Файлы пока не добавлены.'));
    }
  }

  async function uploadOne(file) {
    const maxFiles = Number(block.maxFiles || 0);
    if (maxFiles > 0 && files.length + uploads.size >= maxFiles) {
      errors.push(`Можно добавить не более ${maxFiles} файлов.`);
      renderFiles();
      return;
    }
    if (!fileIsAccepted(file)) {
      errors.push(`Файл «${file.name}» имеет неподдерживаемый формат.`);
      renderFiles();
      return;
    }
    const sizeLimit = maximumSize();
    if (sizeLimit > 0 && file.size > sizeLimit) {
      errors.push(`Файл «${file.name}» превышает допустимый размер ${formatBytes(sizeLimit)}.`);
      renderFiles();
      return;
    }
    if (typeof context.uploadFile !== 'function') {
      errors.push('Загрузка файлов сейчас недоступна. Повторите попытку позже.');
      renderFiles();
      return;
    }

    const uploadId = nextId('upload');
    const upload = { file, progress: 0, status: 'Подготовка к загрузке' };
    uploads.set(uploadId, upload);
    renderFiles();
    try {
      const onProgress = (progress) => {
        upload.progress = progressValue(progress);
        upload.status = upload.progress >= 100 ? 'Проверка файла' : `Загрузка ${Math.round(upload.progress)}%`;
        if (!isDestroyed()) renderFiles();
      };
      onProgress.block = block;
      onProgress.onProgress = onProgress;
      const result = await context.uploadFile(file, onProgress);
      if (isDestroyed()) return;
      const record = result?.file || result?.attachment || result;
      if (!isObject(record)) throw new Error('Сервер не подтвердил сохранение файла.');
      files.push({
        ...cloneSerializable(record),
        name: record.name || file.name,
        size: record.size ?? file.size,
        mimeType: record.mimeType || record.type || file.type,
        status: record.status || 'stored',
      });
      uploads.delete(uploadId);
      renderFiles();
      emit();
      announce(`Файл «${file.name}» загружен.`);
    } catch (error) {
      uploads.delete(uploadId);
      errors.push(error?.message || `Не удалось загрузить файл «${file.name}».`);
      renderFiles();
    }
  }

  async function receiveFiles(fileList) {
    const selectedFiles = Array.from(fileList || []);
    for (const file of selectedFiles) await uploadOne(file);
    input.value = '';
  }

  input.addEventListener('change', () => receiveFiles(input.files));
  if (!readOnly) {
    ['dragenter', 'dragover'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      dropzone.classList.add('is-over');
    }));
    ['dragleave', 'dragend'].forEach((eventName) => dropzone.addEventListener(eventName, () => dropzone.classList.remove('is-over')));
    dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropzone.classList.remove('is-over');
      receiveFiles(event.dataTransfer?.files);
    });
  }

  renderFiles();
  root.append(dropzone, list, status);
  return {
    getValue: () => ({ files: files.map((file) => cloneSerializable(file)) }),
    validate: () => {
      if (uploads.size) return { valid: false, message: 'Дождитесь завершения загрузки файлов.', element: selectButton };
      const minimum = Number(block.minFiles ?? (requiresAnswer(block) ? 1 : 0));
      const maximum = Number(block.maxFiles || 0);
      if (files.length < minimum) return { valid: false, message: `Добавьте не меньше ${minimum} файлов.`, element: selectButton };
      if (maximum > 0 && files.length > maximum) return { valid: false, message: `Можно добавить не больше ${maximum} файлов.`, element: selectButton };
      if (files.some((file) => file.status !== 'stored')) return { valid: false, message: 'Дождитесь полного сохранения всех файлов.', element: selectButton };
      return { valid: true };
    },
    firstControl: selectButton,
  };
}

function renderSafetyChecklist(environment) {
  const { root, block, value, readOnly, emit } = environment;
  const items = blockItems(block);
  const checks = recordFrom(isObject(value?.checks) ? value.checks : value);
  const fieldset = createElement('fieldset', 'choice-group');
  fieldset.append(createElement('legend', null, block.answerLabel || 'Проверка требований безопасности'));
  const controls = [];

  items.forEach((item) => {
    const label = createElement('label', 'check-item');
    const input = createElement('input');
    input.type = 'checkbox';
    input.checked = checks[item.id] === true;
    input.disabled = readOnly;
    input.addEventListener('change', () => {
      checks[item.id] = input.checked;
      emit();
    });
    label.append(input, createElement('span', null, item.label));
    fieldset.append(label);
    controls.push(input);
  });

  if (!items.length) fieldset.append(createElement('p', 'inline-error', 'Для чек-листа не заданы пункты.'));
  root.append(fieldset);
  return {
    getValue: () => {
      const answerChecks = Object.create(null);
      items.forEach((item) => { answerChecks[item.id] = checks[item.id] === true; });
      return { checks: answerChecks };
    },
    validate: () => {
      if (requiresAnswer(block)) {
        const missing = items.findIndex((item) => (!isObject(item.raw) || item.raw.required !== false) && checks[item.id] !== true);
        if (missing >= 0) return { valid: false, message: 'Подтвердите все обязательные пункты безопасности.', element: controls[missing] };
      }
      return { valid: true };
    },
    firstControl: controls[0],
  };
}

function renderUnsupported(environment) {
  const panel = createElement('div', 'inline-error');
  panel.setAttribute('role', 'alert');
  panel.append(createElement('strong', null, 'Этот тип задания пока не поддерживается.'));
  environment.root.append(panel);
  return {
    getValue: () => cloneSerializable(environment.value),
    validate: () => ({ valid: !requiresAnswer(environment.block), message: 'Обратитесь к преподавателю: блок нельзя заполнить.', element: panel }),
    firstControl: panel,
  };
}

function rendererFor(type) {
  const renderers = {
    instruction: renderInstruction,
    single_choice: (environment) => renderChoices(environment, false),
    multiple_choice: (environment) => renderChoices(environment, true),
    choices: (environment) => renderChoices(environment),
    short_text: (environment) => renderText(environment, false),
    long_text: (environment) => renderText(environment, false),
    text: (environment) => renderText(environment, false),
    reflection: (environment) => renderText(environment, true),
    calculation: renderCalculation,
    matching: (environment) => renderMapping(environment, false),
    classification: (environment) => renderMapping(environment, true),
    ordering: renderOrdering,
    table: renderTable,
    ttk_builder: renderTtkBuilder,
    scheme_builder: (environment) => renderDynamicBuilder(environment, 'scheme_builder'),
    observation_log: (environment) => renderDynamicBuilder(environment, 'observation_log'),
    dish_assembly: renderDishAssembly,
    crossword: renderCrossword,
    file_evidence: renderFileEvidence,
    safety_checklist: renderSafetyChecklist,
  };
  return renderers[type] || renderUnsupported;
}

/**
 * Mounts one task block and returns a small controller used by the student workspace
 * and the teacher preview. `context` may provide onChange, announce, uploadFile,
 * deleteFile, downloadFile, confirm and readOnly.
 */
export function mountTask(container, block = {}, value = null, context = {}) {
  if (!container || typeof container.replaceChildren !== 'function') {
    throw new TypeError('mountTask: container must be a DOM element.');
  }

  const type = typeOfBlock(block);
  const root = createElement('div', 'task-surface');
  root.dataset.taskType = type;
  const liveRegion = createElement('div', 'visually-hidden');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  root.append(liveRegion);
  container.replaceChildren(root);

  let destroyed = false;
  let renderer;
  let validationError = null;
  let validationTarget = null;
  let previousDescribedBy = null;

  function announce(message) {
    if (!message || destroyed) return;
    if (typeof context.announce === 'function') {
      context.announce(String(message));
      return;
    }
    liveRegion.textContent = '';
    window.setTimeout(() => {
      if (!destroyed) liveRegion.textContent = String(message);
    }, 20);
  }

  function clearValidation() {
    if (validationTarget) {
      validationTarget.removeAttribute('aria-invalid');
      if (previousDescribedBy) validationTarget.setAttribute('aria-describedby', previousDescribedBy);
      else validationTarget.removeAttribute('aria-describedby');
    }
    validationError?.remove();
    validationError = null;
    validationTarget = null;
    previousDescribedBy = null;
  }

  function reportError(message, element) {
    clearValidation();
    const target = element || renderer?.firstControl || root;
    const errorId = nextId('validation');
    validationError = createElement('div', 'inline-error', message || block.validationMessage || 'Заполните обязательное поле.');
    validationError.id = errorId;
    validationError.setAttribute('role', 'alert');
    root.append(validationError);
    validationTarget = target;
    if (target && typeof target.setAttribute === 'function') {
      previousDescribedBy = target.getAttribute('aria-describedby');
      target.setAttribute('aria-invalid', 'true');
      target.setAttribute('aria-describedby', [previousDescribedBy, errorId].filter(Boolean).join(' '));
    }
    announce(validationError.textContent);
  }

  const controller = {
    getValue() {
      return cloneSerializable(renderer?.getValue?.());
    },
    validate() {
      if (destroyed || context.readOnly === true || context.readonly === true || block.readOnly === true || block.readonly === true) return true;
      clearValidation();
      const specific = renderer?.validate?.();
      if (specific === false) {
        reportError(block.validationMessage || 'Проверьте ответ.', renderer?.firstControl);
        return false;
      }
      if (isObject(specific) && specific.valid === false) {
        reportError(specific.message, specific.element);
        return false;
      }
      if (requiresAnswer(block) && !isValueMeaningful(controller.getValue(), block)) {
        reportError(block.validationMessage || 'Заполните обязательный блок.', renderer?.firstControl);
        return false;
      }
      return true;
    },
    focusFirstError() {
      const target = validationTarget || root.querySelector('[aria-invalid="true"]');
      if (target && typeof target.focus === 'function') {
        target.focus({ preventScroll: false });
        target.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
        return true;
      }
      return false;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearValidation();
      renderer?.destroy?.();
      if (root.parentNode === container) root.remove();
    },
  };

  function emit() {
    if (destroyed) return;
    clearValidation();
    if (typeof context.onChange !== 'function') return;
    try {
      const callbackResult = context.onChange(controller.getValue(), block);
      if (callbackResult && typeof callbackResult.catch === 'function') {
        callbackResult.catch((error) => {
          if (typeof context.onError === 'function') context.onError(error);
        });
      }
    } catch (error) {
      if (typeof context.onError === 'function') context.onError(error);
    }
  }

  const environment = {
    root,
    block,
    value: cloneSerializable(value),
    context,
    readOnly: context.readOnly === true || context.readonly === true || block.readOnly === true || block.readonly === true,
    emit,
    announce,
    isDestroyed: () => destroyed,
  };
  renderer = rendererFor(type)(environment);
  return controller;
}

export function renderTaskBlock(container, block, value, context) {
  return mountTask(container, block, value, context);
}
