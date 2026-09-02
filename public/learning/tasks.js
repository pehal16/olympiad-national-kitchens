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
let activeDragPayload = null;

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
    grip: ['M9 5h.01', 'M15 5h.01', 'M9 12h.01', 'M15 12h.01', 'M9 19h.01', 'M15 19h.01'],
    calculator: ['M5 3h14v18H5z', 'M8 7h8', 'M8 11h.01', 'M12 11h.01', 'M16 11h.01', 'M8 15h.01', 'M12 15h.01', 'M16 15h.01', 'M8 18h.01', 'M12 18h.01', 'M16 18h.01'],
    close: ['M6 6l12 12', 'M18 6 6 18'],
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
  const formulaCards = normalizedCollection(block.formulaCards || [], 'formula-card');
  if (formulaCards.length) {
    const formulas = createElement('div', 'instruction-formulas');
    formulaCards.forEach((item) => {
      const raw = isObject(item.raw) ? item.raw : {};
      const card = createElement('div', 'instruction-formula');
      card.append(createElement('span', null, item.label), createElement('strong', null, raw.value || raw.formula || ''));
      formulas.append(card);
    });
    panel.append(formulas);
  }
  const images = normalizedCollection(block.images || [], 'instruction-image');
  if (images.length) {
    const gallery = createElement('div', 'instruction-gallery');
    images.forEach((item) => {
      const raw = isObject(item.raw) ? item.raw : {};
      const source = raw.src || raw.image || raw.imageUrl;
      if (!source) return;
      const figure = createElement('figure', 'instruction-figure');
      const image = createElement('img');
      image.src = String(source);
      image.alt = String(raw.alt || item.label || 'Учебная иллюстрация');
      image.loading = 'lazy';
      figure.append(image);
      const caption = raw.caption || raw.label || item.label;
      if (caption) figure.append(createElement('figcaption', null, caption));
      gallery.append(figure);
    });
    if (gallery.childElementCount) panel.append(gallery);
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
    const content = createElement('span', 'choice-option-content');
    const raw = isObject(option.raw) ? option.raw : {};
    const imageSource = raw.image || raw.imageUrl || raw.src;
    if (imageSource) {
      const image = createElement('img', 'choice-option-image');
      image.src = String(imageSource);
      image.alt = String(raw.imageAlt || raw.alt || option.label);
      image.loading = 'lazy';
      content.append(image);
    }
    content.append(createElement('span', 'choice-option-label', option.label));
    if (raw.description) content.append(createElement('small', 'choice-option-description', raw.description));
    label.append(input, content);
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

export function evaluateCalculatorExpression(source) {
  const expression = String(source ?? '')
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/[×х]/gi, '*')
    .replace(/÷/g, '/')
    .replace(/[−–—]/g, '-');
  let index = 0;

  function primary() {
    const sign = expression[index] === '-' || expression[index] === '+' ? expression[index++] : '';
    let result;
    if (expression[index] === '(') {
      index += 1;
      result = sum();
      if (expression[index] !== ')') throw new Error('Не закрыта скобка.');
      index += 1;
    } else {
      const match = expression.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!match) throw new Error('Введите число или выражение.');
      index += match[0].length;
      result = Number(match[0]);
    }
    if (sign === '-') result *= -1;
    while (expression[index] === '%') {
      result /= 100;
      index += 1;
    }
    return result;
  }

  function product() {
    let result = primary();
    while (expression[index] === '*' || expression[index] === '/') {
      const operator = expression[index++];
      const next = primary();
      if (operator === '/' && next === 0) throw new Error('На ноль делить нельзя.');
      result = operator === '*' ? result * next : result / next;
    }
    return result;
  }

  function sum() {
    let result = product();
    while (expression[index] === '+' || expression[index] === '-') {
      const operator = expression[index++];
      const next = product();
      result = operator === '+' ? result + next : result - next;
    }
    return result;
  }

  if (!expression) throw new Error('Введите выражение.');
  const result = sum();
  if (index !== expression.length || !Number.isFinite(result)) throw new Error('Проверьте выражение.');
  return result;
}

function calculatorNumber(value) {
  return Number(value.toFixed(6)).toLocaleString('ru-RU', {
    maximumFractionDigits: 6,
    useGrouping: false,
  });
}

function createCalculator(root, readOnly) {
  const panel = createElement('section', 'task-calculator');
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Встроенный калькулятор');
  const head = createElement('div', 'task-calculator-head');
  head.append(createElement('strong', null, 'Калькулятор'));
  const close = iconButton('Закрыть калькулятор', 'close', readOnly);
  head.append(close);
  const expression = createElement('input', 'task-calculator-expression');
  expression.type = 'text';
  expression.inputMode = 'decimal';
  expression.autocomplete = 'off';
  expression.placeholder = 'Например: 100 × 25';
  expression.disabled = readOnly;
  const result = createElement('output', 'task-calculator-result', '0');
  result.setAttribute('aria-live', 'polite');
  const error = createElement('p', 'task-calculator-error');
  error.hidden = true;
  const keypad = createElement('div', 'task-calculator-keypad');
  const keys = [
    ['7', '7'], ['8', '8'], ['9', '9'], ['÷', '÷'],
    ['4', '4'], ['5', '5'], ['6', '6'], ['×', '×'],
    ['1', '1'], ['2', '2'], ['3', '3'], ['−', '−'],
    ['0', '0'], [',', ','], ['%', '%'], ['+', '+'],
    ['(', '('], [')', ')'], ['⌫', 'backspace'], ['=', 'equals'],
  ];
  let target = null;

  function calculate() {
    try {
      const calculated = evaluateCalculatorExpression(expression.value);
      result.value = calculatorNumber(calculated);
      result.textContent = result.value;
      error.hidden = true;
      return calculated;
    } catch (calculationError) {
      result.value = '';
      result.textContent = '—';
      error.textContent = calculationError.message || 'Проверьте выражение.';
      error.hidden = false;
      return null;
    }
  }

  keys.forEach(([label, action]) => {
    const button = createElement('button', action === 'equals' ? 'calculator-key is-primary' : 'calculator-key', label);
    button.type = 'button';
    button.disabled = readOnly;
    button.addEventListener('click', () => {
      if (action === 'equals') {
        calculate();
      } else if (action === 'backspace') {
        expression.value = expression.value.slice(0, -1);
      } else {
        expression.value += action;
      }
      expression.focus();
    });
    keypad.append(button);
  });

  const actions = createElement('div', 'task-calculator-actions');
  const clear = createElement('button', 'learning-button quiet', 'Очистить');
  clear.type = 'button';
  clear.disabled = readOnly;
  const insert = createElement('button', 'learning-button primary', 'Вставить результат');
  insert.type = 'button';
  insert.disabled = readOnly;
  clear.addEventListener('click', () => {
    expression.value = '';
    result.value = '';
    result.textContent = '0';
    error.hidden = true;
    expression.focus();
  });
  insert.addEventListener('click', () => {
    const calculated = calculate();
    if (calculated === null || !target) return;
    target.value = calculatorNumber(calculated).replace(',', '.');
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.focus();
  });
  actions.append(clear, insert);
  expression.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    calculate();
  });
  close.addEventListener('click', () => {
    panel.hidden = true;
    target?.focus();
  });
  panel.append(head, expression, result, error, keypad, actions);

  return {
    panel,
    open(nextTarget, suggestedExpression = '') {
      if (readOnly) return;
      target = nextTarget;
      expression.value = suggestedExpression || nextTarget?.value || '';
      result.value = '';
      result.textContent = '0';
      error.hidden = true;
      panel.hidden = false;
      expression.focus();
      expression.select();
    },
  };
}

function wrapWithCalculatorButton(input, label, calculator, expression = '') {
  const shell = createElement('div', 'numeric-input-shell');
  const button = iconButton(`Открыть калькулятор: ${label}`, 'calculator', input.disabled);
  button.classList.add('calculator-trigger');
  button.addEventListener('click', () => calculator.open(input, expression));
  shell.append(input, button);
  return shell;
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
  const calculator = createCalculator(root, readOnly);
  row.append(makeField(
    block.valueLabel || 'Результат расчёта',
    wrapWithCalculatorButton(numberInput, block.valueLabel || 'результат расчёта', calculator, block.calculatorExpression || ''),
    'Можно рассчитать во встроенном калькуляторе.',
  ));

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
  root.append(row, calculator.panel);
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

function visualCard(item, { selected = false, readOnly = false, dragKind = 'item' } = {}) {
  const raw = isObject(item.raw) ? item.raw : {};
  const card = createElement('button', `drag-card${selected ? ' is-selected' : ''}`);
  card.type = 'button';
  card.disabled = readOnly;
  card.draggable = !readOnly;
  card.dataset.dragId = item.id;
  card.dataset.dragKind = dragKind;
  card.setAttribute('aria-pressed', selected ? 'true' : 'false');
  const imageSource = raw.image || raw.imageUrl || raw.src;
  if (imageSource) {
    const image = createElement('img', 'drag-card-image');
    image.src = String(imageSource);
    image.alt = String(raw.alt || raw.imageAlt || item.label);
    image.loading = 'lazy';
    card.append(image);
  }
  const copy = createElement('span', 'drag-card-copy');
  copy.append(createElement('strong', null, item.label));
  if (raw.description) copy.append(createElement('small', null, raw.description));
  const grip = createElement('span', 'drag-card-grip');
  grip.append(createSvgIcon('grip'));
  card.append(copy, grip);
  return card;
}

function dragPayload(event) {
  if (activeDragPayload) return activeDragPayload;
  try { return JSON.parse(event.dataTransfer?.getData('text/plain') || '{}'); } catch (_error) { return {}; }
}

function bindDraggable(card, payload) {
  card.addEventListener('dragstart', (event) => {
    activeDragPayload = payload;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify(payload));
    card.classList.add('is-dragging');
  });
  card.addEventListener('dragend', () => {
    activeDragPayload = null;
    card.classList.remove('is-dragging');
  });
}

function bindDropZone(zone, accept, onDrop) {
  zone.addEventListener('dragover', (event) => {
    const payload = dragPayload(event);
    if (!accept(payload)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    zone.classList.add('is-drag-over');
  });
  zone.addEventListener('dragleave', (event) => {
    if (!zone.contains(event.relatedTarget)) zone.classList.remove('is-drag-over');
  });
  zone.addEventListener('drop', (event) => {
    zone.classList.remove('is-drag-over');
    const payload = dragPayload(event);
    if (!accept(payload)) return;
    event.preventDefault();
    activeDragPayload = null;
    onDrop(payload);
  });
}

function renderMapping(environment, classification = false) {
  const { root, block, value, readOnly, emit, announce } = environment;
  const items = blockItems(block);
  const targets = normalizedCollection(
    classification
      ? valueByKnownKey(block, ['categories', 'groups', 'targets', 'options'], [])
      : valueByKnownKey(block, ['rightItems', 'targets', 'options'], []),
    classification ? 'category' : 'target',
  );
  const state = recordFrom(value);
  const board = createElement('div', `drag-board ${classification ? 'is-classification' : 'is-matching'}`);
  let selectedId = '';

  function announcePlacement(itemLabel, targetLabel) {
    announce(`${itemLabel}: ${targetLabel}.`);
  }

  function classificationBoard() {
    const placed = items.filter((item) => nonEmptyText(state[item.id])).length;
    const status = createElement('div', 'drag-board-status', `Размещено ${placed} из ${items.length}`);
    const tray = createElement('section', 'drag-tray');
    tray.tabIndex = readOnly ? -1 : 0;
    tray.setAttribute('aria-label', 'Нераспределённые карточки');
    tray.append(createElement('h4', null, 'Карточки для распределения'));
    const trayItems = createElement('div', 'drag-tray-items');
    items.filter((item) => !nonEmptyText(state[item.id])).forEach((item) => {
      const card = visualCard(item, { selected: selectedId === item.id, readOnly, dragKind: 'classification-item' });
      card.dataset.itemId = item.id;
      card.addEventListener('click', () => {
        selectedId = selectedId === item.id ? '' : item.id;
        render();
        if (selectedId) announce(`Выбрано: ${item.label}. Теперь выберите группу.`);
      });
      bindDraggable(card, { kind: 'classification-item', id: item.id });
      trayItems.append(card);
    });
    if (!trayItems.childElementCount) trayItems.append(createElement('p', 'drag-empty', 'Все карточки распределены. Перетащите карточку сюда, чтобы вернуть её.'));
    tray.append(trayItems);
    bindDropZone(tray, (payload) => payload.kind === 'classification-item', (payload) => {
      state[payload.id] = '';
      selectedId = '';
      render();
      emit();
    });
    tray.addEventListener('click', (event) => {
      if (!selectedId || event.target.closest('.drag-card')) return;
      state[selectedId] = '';
      selectedId = '';
      render();
      emit();
    });

    const zones = createElement('div', 'classification-zones');
    targets.forEach((target) => {
      const zone = createElement('section', 'classification-zone');
      zone.tabIndex = readOnly ? -1 : 0;
      zone.dataset.targetId = target.id;
      zone.setAttribute('role', 'group');
      zone.setAttribute('aria-label', `Группа «${target.label}»`);
      const targetRaw = isObject(target.raw) ? target.raw : {};
      const head = createElement('header', 'classification-zone-head');
      head.append(createElement('strong', null, target.label));
      if (targetRaw.description) head.append(createElement('small', null, targetRaw.description));
      const placedItems = items.filter((item) => state[item.id] === target.id);
      head.append(createElement('span', 'zone-count', placedItems.length));
      const body = createElement('div', 'classification-zone-body');
      placedItems.forEach((item) => {
        const card = visualCard(item, { selected: selectedId === item.id, readOnly, dragKind: 'classification-item' });
        card.dataset.itemId = item.id;
        card.addEventListener('click', (event) => {
          event.stopPropagation();
          selectedId = selectedId === item.id ? '' : item.id;
          render();
          if (selectedId) announce(`Выбрано: ${item.label}. Теперь выберите другую группу.`);
        });
        bindDraggable(card, { kind: 'classification-item', id: item.id });
        body.append(card);
      });
      if (!placedItems.length) body.append(createElement('p', 'drag-empty', 'Перетащите карточки сюда'));
      zone.append(head, body);
      const place = (itemId) => {
        const item = items.find((candidate) => candidate.id === itemId);
        if (!item || readOnly) return;
        state[item.id] = target.id;
        selectedId = '';
        render();
        emit();
        announcePlacement(item.label, target.label);
      };
      zone.addEventListener('click', (event) => {
        if (event.target.closest('.drag-card') || !selectedId) return;
        place(selectedId);
      });
      zone.addEventListener('keydown', (event) => {
        if (!selectedId || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        place(selectedId);
      });
      bindDropZone(zone, (payload) => payload.kind === 'classification-item', (payload) => place(payload.id));
      zones.append(zone);
    });
    board.append(status, tray, zones);
  }

  function matchingBoard() {
    const reuse = block.allowTargetReuse !== false;
    const usedTargetIds = new Set(Object.values(state).filter(nonEmptyText).map(String));
    const matched = items.filter((item) => nonEmptyText(state[item.id])).length;
    const status = createElement('div', 'drag-board-status', `Сопоставлено ${matched} из ${items.length}`);
    const bank = createElement('section', 'drag-tray matching-bank');
    bank.tabIndex = readOnly ? -1 : 0;
    bank.setAttribute('aria-label', 'Варианты соответствий');
    bank.append(createElement('h4', null, 'Варианты'));
    const bankItems = createElement('div', 'drag-tray-items');
    targets.filter((target) => reuse || !usedTargetIds.has(target.id)).forEach((target) => {
      const card = visualCard(target, { selected: selectedId === target.id, readOnly, dragKind: 'matching-target' });
      card.dataset.targetId = target.id;
      card.addEventListener('click', () => {
        selectedId = selectedId === target.id ? '' : target.id;
        render();
        if (selectedId) announce(`Выбрано: ${target.label}. Теперь выберите подходящую строку.`);
      });
      bindDraggable(card, { kind: 'matching-target', id: target.id });
      bankItems.append(card);
    });
    if (!bankItems.childElementCount) bankItems.append(createElement('p', 'drag-empty', 'Все варианты использованы.'));
    bank.append(bankItems);
    bindDropZone(bank, (payload) => payload.kind === 'matching-target', (payload) => {
      Object.keys(state).forEach((itemId) => { if (state[itemId] === payload.id) state[itemId] = ''; });
      selectedId = '';
      render();
      emit();
    });

    const list = createElement('div', 'matching-zones');
    items.forEach((item, index) => {
      const row = createElement('section', 'matching-row');
      const prompt = createElement('div', 'matching-prompt');
      const itemRaw = isObject(item.raw) ? item.raw : {};
      const imageSource = itemRaw.image || itemRaw.imageUrl || itemRaw.src;
      prompt.append(createElement('span', 'matching-number', index + 1));
      if (imageSource) {
        const image = createElement('img', 'matching-prompt-image');
        image.src = String(imageSource);
        image.alt = String(itemRaw.alt || itemRaw.imageAlt || item.label);
        image.loading = 'lazy';
        prompt.append(image);
      }
      prompt.append(createElement('strong', null, item.label));
      if (itemRaw.description) prompt.append(createElement('small', null, itemRaw.description));
      const zone = createElement('div', 'matching-dropzone');
      zone.tabIndex = readOnly ? -1 : 0;
      zone.dataset.itemId = item.id;
      zone.setAttribute('aria-label', `Соответствие для «${item.label}»`);
      const assigned = targets.find((target) => target.id === String(state[item.id] || ''));
      if (assigned) {
        const card = visualCard(assigned, { selected: selectedId === assigned.id, readOnly, dragKind: 'matching-target' });
        card.dataset.targetId = assigned.id;
        card.addEventListener('click', (event) => {
          event.stopPropagation();
          selectedId = selectedId === assigned.id ? '' : assigned.id;
          render();
          if (selectedId) announce(`Выбрано: ${assigned.label}. Перенесите в другую строку или в область вариантов.`);
        });
        bindDraggable(card, { kind: 'matching-target', id: assigned.id });
        zone.append(card);
      } else {
        zone.append(createElement('span', 'drag-empty', 'Перетащите вариант сюда'));
      }
      const place = (targetId) => {
        const target = targets.find((candidate) => candidate.id === targetId);
        if (!target || readOnly) return;
        if (!reuse) {
          Object.keys(state).forEach((itemId) => { if (state[itemId] === target.id) state[itemId] = ''; });
        }
        state[item.id] = target.id;
        selectedId = '';
        render();
        emit();
        announcePlacement(item.label, target.label);
      };
      zone.addEventListener('click', (event) => {
        if (event.target.closest('.drag-card') || !selectedId) return;
        place(selectedId);
      });
      zone.addEventListener('keydown', (event) => {
        if (!selectedId || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        place(selectedId);
      });
      bindDropZone(zone, (payload) => payload.kind === 'matching-target', (payload) => place(payload.id));
      row.append(prompt, zone);
      list.append(row);
    });
    board.append(status, bank, list);
  }

  function render() {
    board.replaceChildren();
    if (!items.length || !targets.length) {
      board.append(createElement('p', 'inline-error', 'Для этого блока не заданы элементы или варианты.'));
      return;
    }
    board.append(createElement('p', 'drag-instruction', readOnly
      ? 'Результат распределения.'
      : 'Перетащите карточку мышью. На сенсорном экране или с клавиатуры сначала выберите карточку, затем нужную область.'));
    if (classification) classificationBoard(); else matchingBoard();
  }

  render();
  root.append(board);
  return {
    getValue: () => {
      const answer = Object.create(null);
      items.forEach((item) => { answer[item.id] = state[item.id] ?? ''; });
      return answer;
    },
    validate: () => {
      if (requiresAnswer(block)) {
        const missing = items.find((item) => !nonEmptyText(state[item.id]));
        if (missing) return {
          valid: false,
          message: classification ? 'Распределите все карточки по группам.' : 'Заполните все соответствия.',
          element: board.querySelector(`[data-item-id="${CSS.escape(missing.id)}"]`) || board.querySelector('[tabindex]'),
        };
      }
      if (!classification && block.allowTargetReuse === false) {
        const values = items.map((item) => state[item.id]).filter(nonEmptyText);
        if (new Set(values).size !== values.length) {
          return { valid: false, message: 'Каждый вариант соответствия можно использовать только один раз.', element: board.querySelector('[tabindex]') };
        }
      }
      return { valid: true };
    },
    get firstControl() { return board.querySelector('button:not(:disabled), [tabindex="0"]'); },
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
  const hint = createElement('p', 'drag-instruction', readOnly
    ? 'Итоговая последовательность.'
    : 'Перетащите строки мышью за любую область карточки. Для клавиатуры: Alt + стрелка вверх или вниз.');

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
      row.draggable = !readOnly;
      row.dataset.orderIndex = String(index);
      row.dataset.orderId = id;
      row.setAttribute('aria-label', `${index + 1}. ${label}`);
      const grip = createElement('span', 'arrangement-grip');
      grip.append(createSvgIcon('grip'));
      row.append(createElement('span', 'arrangement-index', index + 1), createElement('span', 'arrangement-label', label), grip);
      row.addEventListener('dragstart', (event) => {
        activeDragPayload = { kind: 'ordering-item', id };
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'ordering-item', id }));
        row.classList.add('is-dragging');
      });
      row.addEventListener('dragend', () => {
        activeDragPayload = null;
        row.classList.remove('is-dragging');
        list.querySelectorAll('.is-drag-over').forEach((node) => node.classList.remove('is-drag-over', 'drop-after'));
      });
      row.addEventListener('dragover', (event) => {
        const payload = dragPayload(event);
        if (payload.kind !== 'ordering-item' || payload.id === id) return;
        event.preventDefault();
        activeDragPayload = null;
        event.dataTransfer.dropEffect = 'move';
        const after = event.clientY > row.getBoundingClientRect().top + row.offsetHeight / 2;
        row.classList.add('is-drag-over');
        row.classList.toggle('drop-after', after);
      });
      row.addEventListener('dragleave', () => row.classList.remove('is-drag-over', 'drop-after'));
      row.addEventListener('drop', (event) => {
        const payload = dragPayload(event);
        if (payload.kind !== 'ordering-item' || payload.id === id) return;
        event.preventDefault();
        const after = row.classList.contains('drop-after');
        const fromIndex = order.indexOf(payload.id);
        if (fromIndex < 0) return;
        order.splice(fromIndex, 1);
        const currentTargetIndex = order.indexOf(id);
        order.splice(currentTargetIndex + (after ? 1 : 0), 0, payload.id);
        renderRows();
        emit();
        const nextIndex = order.indexOf(payload.id);
        announce(`${labelById.get(payload.id)}: позиция ${nextIndex + 1} из ${order.length}.`);
        list.querySelector(`[data-order-id="${CSS.escape(payload.id)}"]`)?.focus();
      });
      row.addEventListener('keydown', (event) => {
        if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
        event.preventDefault();
        move(index, event.key === 'ArrowUp' ? -1 : 1);
      });
      list.append(row);
    });
  }

  renderRows();
  root.append(hint, list);
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
      rows: Math.max(2, Number(raw.rows || 2) || 2),
      options: normalizedCollection(raw.options || raw.choices || [], `${column.id}-option`),
      required: raw.required === true,
      readOnly: raw.readOnly === true || raw.editable === false || raw.input === false,
      placeholder: raw.placeholder || '',
      defaultValue: raw.defaultValue,
      hint: raw.hint || '',
      unit: raw.unit || '',
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
  const needsCalculator = !readOnly && block.calculator !== false && columns.some((column) => column.type === 'number' && !column.readOnly);
  const calculator = needsCalculator ? createCalculator(root, false) : null;
  if (isObject(block.worksheet)) {
    const worksheet = createElement('section', 'worksheet-brief');
    const heading = createElement('div', 'worksheet-brief-title');
    heading.append(createElement('span', null, block.worksheet.eyebrow || 'Рабочий лист'));
    heading.append(createElement('strong', null, block.worksheet.title || block.title || 'Расчётная таблица'));
    worksheet.append(heading);
    const facts = asArray(block.worksheet.facts);
    if (facts.length) {
      const factList = createElement('dl', 'worksheet-facts');
      facts.forEach((fact) => {
        const raw = isObject(fact) ? fact : { label: '', value: fact };
        factList.append(createElement('dt', null, raw.label || ''), createElement('dd', null, raw.value || ''));
      });
      worksheet.append(factList);
    }
    const formulas = asArray(block.worksheet.formulas);
    if (formulas.length) {
      const formulaList = createElement('div', 'worksheet-formulas');
      formulas.forEach((formula) => {
        const raw = isObject(formula) ? formula : { label: 'Формула', value: formula };
        const item = createElement('div', 'worksheet-formula');
        item.append(createElement('span', null, raw.label || 'Формула'), createElement('strong', null, raw.value || ''));
        formulaList.append(item);
      });
      worksheet.append(formulaList);
    }
    root.append(worksheet);
  }
  const wrap = createElement('div', 'task-table-wrap');
  const table = createElement('table', 'task-table');
  const caption = createElement('caption', 'visually-hidden', block.caption || block.title || 'Таблица ответа');
  const head = createElement('thead');
  const headRow = createElement('tr');
  const rowHeader = block.rowHeader || 'Позиция';
  headRow.append(createElement('th', null, rowHeader));
  columns.forEach((column) => {
    const th = createElement('th');
    th.append(createElement('span', null, column.label));
    if (column.hint) th.append(createElement('small', null, column.hint));
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
      if (column.readOnly) {
        control = createElement('output', 'table-given-value', seeded);
        control.value = seeded === null || seeded === undefined ? '' : String(seeded);
      } else if (column.type === 'select' && column.options.length) {
        control = makeSelect(column.options, column.placeholder || 'Не выбрано', seeded);
      } else if (column.type === 'textarea') {
        control = createElement('textarea');
        control.rows = column.rows;
        control.placeholder = column.placeholder;
        setControlValue(control, seeded);
      } else {
        control = createElement('input');
        control.type = column.type === 'checkbox' ? 'checkbox' : 'text';
        if (column.type === 'number') {
          control.inputMode = 'decimal';
          control.autocomplete = 'off';
        }
        control.placeholder = column.placeholder;
        setControlValue(control, seeded);
      }
      control.setAttribute('aria-label', `${column.label}, ${row.label}`);
      if ('disabled' in control) control.disabled = readOnly || column.readOnly;
      state[cellKey] = control.type === 'checkbox' ? control.checked : control.value;
      if (!column.readOnly) {
        control.addEventListener(control.type === 'checkbox' || control.tagName === 'SELECT' ? 'change' : 'input', () => {
          state[cellKey] = control.type === 'checkbox' ? control.checked : control.value;
          emit();
        });
      }
      controls.push({ control, column, cellKey });
      if (calculator && column.type === 'number' && !column.readOnly) {
        const expressions = isObject(rowRaw.calculatorExpressions) ? rowRaw.calculatorExpressions : {};
        td.append(wrapWithCalculatorButton(control, `${column.label}, ${row.label}`, calculator, expressions[column.id] || ''));
      } else {
        td.append(control);
      }
      if (column.unit) td.append(createElement('small', 'table-cell-unit', column.unit));
      tr.append(td);
    });
    body.append(tr);
  });

  table.append(caption, head, body);
  wrap.append(table);
  if (!rows.length || !columns.length) wrap.append(createElement('p', 'inline-error', 'Для таблицы не заданы строки или столбцы.'));
  if (calculator) {
    const layout = createElement('div', 'worksheet-layout');
    layout.append(wrap, calculator.panel);
    root.append(layout);
  } else {
    root.append(wrap);
  }
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
    firstControl: controls.find(({ column }) => !column.readOnly)?.control || controls[0]?.control,
  };
}

function renderTtkBuilder(environment) {
  const { root, block, value, readOnly, emit, announce } = environment;
  const initial = isObject(value) ? cloneSerializable(value) : {};
  const section = (title, description) => {
    const heading = createElement('div', 'builder-section-heading');
    heading.append(createElement('h4', null, title));
    if (description) heading.append(createElement('p', null, description));
    return heading;
  };
  const inputControl = (value, placeholder = '', type = 'text') => {
    const control = createElement(type === 'textarea' ? 'textarea' : 'input');
    if (type === 'textarea') control.rows = 3;
    else control.type = type;
    control.value = value ?? '';
    control.placeholder = placeholder;
    control.disabled = readOnly;
    control.addEventListener('input', emit);
    return control;
  };

  const initialSource = isObject(initial.source) ? initial.source : {};
  const initialOutput = isObject(initial.output) ? initial.output : { value: initial.output ?? '', unit: '' };
  const dishName = inputControl(initial.dishName, block.dishNamePlaceholder || 'Например, суп картофельный');
  const scope = inputControl(initial.scope, 'Где и при каких условиях применяется карта', 'textarea');
  const collectionTitle = inputControl(initialSource.collectionTitle ?? initial.collectionTitle, 'Название сборника или документа');
  const recipeNumber = inputControl(initialSource.recipeNumber ?? initial.recipeNumber, 'Номер рецептуры');
  const variant = inputControl(initialSource.variant ?? initial.variant, 'Вариант или колонка');
  const sourceBasis = inputControl(initialSource.basis ?? initial.sourceBasis, 'Год издания, страница или реквизиты');
  const outputValue = inputControl(initialOutput.value ?? initialOutput.amount, 'Например, 250', 'number');
  outputValue.step = 'any';
  outputValue.min = '0';
  const outputUnit = inputControl(initialOutput.unit, 'г, кг или порций');
  const serving = inputControl(initial.serving, 'Температура подачи, посуда и оформление', 'textarea');
  const quality = inputControl(initial.quality, 'Внешний вид, цвет, вкус, запах и консистенция', 'textarea');
  const storage = inputControl(initial.storage, 'Условия и допустимый срок хранения', 'textarea');
  const allergens = inputControl(initial.allergens, 'Аллергены или «не выявлены по составу»');

  const identityGrid = createElement('div', 'builder-field-grid');
  identityGrid.append(
    makeField('Название блюда', dishName),
    makeField('Область применения', scope),
    makeField('Источник рецептуры', collectionTitle),
    makeField('Номер рецептуры', recipeNumber),
    makeField('Вариант', variant),
    makeField('Реквизиты источника', sourceBasis),
  );
  root.append(section('1. Основание и назначение', 'Укажите источник данных так, чтобы расчёт можно было проверить.'), identityGrid);

  const ingredientSource = asArray(initial.ingredients).length ? initial.ingredients : asArray(initial.grossNet);
  const ingredients = ingredientSource.map((ingredient) => ({
    runtimeId: nextId('ingredient'),
    name: isObject(ingredient) ? String(ingredient.name ?? '') : humanText(ingredient),
    gross: isObject(ingredient) ? ingredient.gross ?? ingredient.amount ?? '' : '',
    net: isObject(ingredient) ? ingredient.net ?? ingredient.amount ?? '' : '',
    unit: isObject(ingredient) ? ingredient.unit ?? 'г' : 'г',
    notes: isObject(ingredient) ? String(ingredient.notes ?? '') : '',
  }));
  const steps = asArray(initial.steps).map((step) => ({
    runtimeId: nextId('step'),
    operation: isObject(step) ? String(step.operation ?? step.value ?? humanText(step)) : String(step ?? ''),
    equipment: isObject(step) ? String(step.equipment ?? '') : '',
    mode: isObject(step) ? String(step.mode ?? '') : '',
    control: isObject(step) ? String(step.control ?? '') : '',
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
      const gross = createElement('input');
      gross.type = 'text';
      gross.inputMode = 'decimal';
      gross.value = ingredient.gross ?? '';
      gross.placeholder = '0';
      gross.disabled = readOnly;
      const net = createElement('input');
      net.type = 'text';
      net.inputMode = 'decimal';
      net.value = ingredient.net ?? '';
      net.placeholder = '0';
      net.disabled = readOnly;
      const unit = createElement('input');
      unit.value = ingredient.unit ?? '';
      unit.placeholder = 'г';
      unit.disabled = readOnly;
      const notes = createElement('input');
      notes.value = ingredient.notes ?? '';
      notes.placeholder = 'Состояние сырья или примечание';
      notes.disabled = readOnly;
      name.addEventListener('input', () => { ingredient.name = name.value; emit(); });
      gross.addEventListener('input', () => { ingredient.gross = gross.value; emit(); });
      net.addEventListener('input', () => { ingredient.net = net.value; emit(); });
      unit.addEventListener('input', () => { ingredient.unit = unit.value; emit(); });
      notes.addEventListener('input', () => { ingredient.notes = notes.value; emit(); });
      row.append(
        makeField('Сырьё', name),
        makeField('Брутто', gross),
        makeField('Нетто', net),
        makeField('Ед.', unit),
        makeField('Примечание', notes),
        rowActions(ingredients, index, renderIngredients, 'Ингредиент'),
      );
      ingredientList.append(row);
    });
  }

  function renderSteps() {
    stepList.replaceChildren();
    steps.forEach((step, index) => {
      const row = createElement('div', 'dynamic-row');
      row.dataset.ttkStep = String(index);
      const operation = createElement('input');
      operation.value = step.operation;
      operation.placeholder = 'Операция';
      operation.disabled = readOnly;
      if (stepDataList) operation.setAttribute('list', stepDataList.id);
      const equipment = createElement('input');
      equipment.value = step.equipment;
      equipment.placeholder = 'Оборудование и инвентарь';
      equipment.disabled = readOnly;
      const mode = createElement('input');
      mode.value = step.mode;
      mode.placeholder = 'Режим, время, температура';
      mode.disabled = readOnly;
      const control = createElement('input');
      control.value = step.control;
      control.placeholder = 'Признак правильного выполнения';
      control.disabled = readOnly;
      operation.addEventListener('input', () => { step.operation = operation.value; emit(); });
      equipment.addEventListener('input', () => { step.equipment = equipment.value; emit(); });
      mode.addEventListener('input', () => { step.mode = mode.value; emit(); });
      control.addEventListener('input', () => { step.control = control.value; emit(); });
      row.append(
        makeField(`Операция ${index + 1}`, operation),
        makeField('Оборудование', equipment),
        makeField('Режим', mode),
        makeField('Контроль', control),
        rowActions(steps, index, renderSteps, 'Этап'),
      );
      stepList.append(row);
    });
  }

  ingredientAdd.addEventListener('click', () => {
    if (readOnly || (Number(block.maxIngredients) > 0 && ingredients.length >= Number(block.maxIngredients))) return;
    ingredients.push({ runtimeId: nextId('ingredient'), name: '', gross: '', net: '', unit: 'г', notes: '' });
    renderIngredients();
    emit();
    ingredientList.querySelector(`[data-ttk-ingredient="${ingredients.length - 1}"] input`)?.focus();
  });
  stepAdd.addEventListener('click', () => {
    if (readOnly || (Number(block.maxSteps) > 0 && steps.length >= Number(block.maxSteps))) return;
    steps.push({ runtimeId: nextId('step'), operation: '', equipment: '', mode: '', control: '' });
    renderSteps();
    emit();
    stepList.querySelector(`[data-ttk-step="${steps.length - 1}"] input`)?.focus();
  });

  renderIngredients();
  renderSteps();
  const outputGrid = createElement('div', 'builder-field-grid compact');
  outputGrid.append(makeField('Выход', outputValue), makeField('Единица выхода', outputUnit));
  const qualityGrid = createElement('div', 'builder-field-grid');
  qualityGrid.append(
    makeField('Оформление и подача', serving),
    makeField('Показатели качества', quality),
    makeField('Хранение', storage),
    makeField('Аллергены', allergens),
  );
  root.append(
    section('2. Рецептура', 'Для каждого продукта укажите массу брутто и нетто в одной единице измерения.'),
    ingredientList,
    ingredientAdd,
    section('3. Технологический процесс', 'Запишите операции по порядку; режимы берите из проверенного источника.'),
    stepList,
    stepAdd,
    section('4. Выход, подача и качество'),
    outputGrid,
    qualityGrid,
  );

  function ingredientValue(ingredient) {
    return {
      name: ingredient.name.trim(),
      gross: parsedAmount(ingredient.gross),
      net: parsedAmount(ingredient.net),
      unit: ingredient.unit.trim(),
      notes: ingredient.notes.trim(),
    };
  }

  function outputAnswer() {
    return { value: parsedAmount(outputValue.value), unit: outputUnit.value.trim() };
  }

  return {
    getValue: () => ({
      dishName: dishName.value.trim(),
      scope: scope.value.trim(),
      source: {
        collectionTitle: collectionTitle.value.trim(),
        recipeNumber: recipeNumber.value.trim(),
        variant: variant.value.trim(),
        basis: sourceBasis.value.trim(),
      },
      ingredients: ingredients.map(ingredientValue),
      grossNet: ingredients.map(ingredientValue),
      steps: steps.map((step) => ({
        operation: step.operation.trim(),
        equipment: step.equipment.trim(),
        mode: step.mode.trim(),
        control: step.control.trim(),
      })),
      output: outputAnswer(),
      serving: serving.value.trim(),
      quality: quality.value.trim(),
      storage: storage.value.trim(),
      allergens: allergens.value.trim(),
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
      const incompleteMass = ingredients.findIndex((ingredient) => parseDecimal(ingredient.gross) === null || parseDecimal(ingredient.net) === null || !ingredient.unit.trim());
      if (incompleteMass >= 0) {
        return { valid: false, message: `Заполните брутто, нетто и единицу измерения для строки ${incompleteMass + 1}.`, element: ingredientList.querySelector(`[data-ttk-ingredient="${incompleteMass}"] input[inputmode="decimal"]`) };
      }
      const invalidMass = ingredients.findIndex((ingredient) => Number(parseDecimal(ingredient.gross)) < 0 || Number(parseDecimal(ingredient.net)) < 0);
      if (invalidMass >= 0) {
        return { valid: false, message: 'Масса продукта не может быть отрицательной.', element: ingredientList.querySelector(`[data-ttk-ingredient="${invalidMass}"] input[inputmode="decimal"]`) };
      }
      if (block.enforceGrossNotLessThanNet === true) {
        const reversedMass = ingredients.findIndex((ingredient) => Number(parseDecimal(ingredient.gross)) < Number(parseDecimal(ingredient.net)));
        if (reversedMass >= 0) {
          return { valid: false, message: `В строке ${reversedMass + 1} масса брутто меньше массы нетто. Проверьте исходные данные.`, element: ingredientList.querySelector(`[data-ttk-ingredient="${reversedMass}"] input[inputmode="decimal"]`) };
        }
      }
      if ((requiredFields.has('steps') || Number(block.minSteps) > 0) && steps.length < Math.max(1, Number(block.minSteps) || 0)) {
        return { valid: false, message: `Добавьте не меньше ${Math.max(1, Number(block.minSteps) || 0)} этапа приготовления.`, element: stepAdd };
      }
      const incompleteStep = steps.findIndex((step) => !step.operation.trim());
      if (incompleteStep >= 0) {
        return { valid: false, message: `Заполните этап ${incompleteStep + 1}.`, element: stepList.querySelector(`[data-ttk-step="${incompleteStep}"] input`) };
      }
      const fieldControls = {
        scope,
        quality,
        storage,
        serving,
        allergens,
        output: outputValue,
        source: collectionTitle,
      };
      for (const field of requiredFields) {
        if (['dishName', 'ingredients', 'grossNet', 'steps'].includes(field)) continue;
        if (field === 'output' && (!nonEmptyText(outputValue.value) || !outputUnit.value.trim())) {
          return { valid: false, message: 'Укажите выход и единицу измерения.', element: outputValue };
        }
        const control = fieldControls[field];
        if (control && !control.value.trim()) {
          return { valid: false, message: `Заполните поле «${makeFieldLabel(field)}».`, element: control };
        }
      }
      return { valid: true };
    },
    firstControl: dishName,
  };
}

function makeFieldLabel(field) {
  const labels = {
    scope: 'Область применения',
    quality: 'Показатели качества',
    storage: 'Хранение',
    serving: 'Оформление и подача',
    allergens: 'Аллергены',
    source: 'Источник рецептуры',
    output: 'Выход',
  };
  return labels[field] || field;
}

const DYNAMIC_DEFAULTS = {
  scheme_builder: {
    key: 'nodes',
    addLabel: 'Добавить узел схемы',
    fields: [
      { id: 'type', label: 'Тип узла', required: true },
      { id: 'label', label: 'Название этапа', required: true },
      { id: 'zone', label: 'Поток или зона' },
      { id: 'control', label: 'Контрольная точка' },
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

function renderFlowScheme(environment) {
  const { root, block, value, readOnly, emit, announce } = environment;
  const laneDefinitions = asArray(block.flowLanes).map((lane, laneIndex) => ({
    id: String(lane?.id || `lane-${laneIndex + 1}`),
    label: String(lane?.label || `Поток ${laneIndex + 1}`),
    color: String(lane?.color || 'blue'),
    steps: asArray(lane?.steps).map((step, stepIndex) => ({
      id: String(step?.id || `lane-${laneIndex + 1}-step-${stepIndex + 1}`),
      label: String(step?.label || `Этап ${stepIndex + 1}`),
      zone: String(step?.zone || ''),
      requiresControl: step?.requiresControl === true,
    })),
  }));
  const savedNodes = new Map(asArray(value?.nodes).map((node) => [String(node?.id || ''), node]));
  const orderByLane = new Map();
  const controls = new Map();
  laneDefinitions.forEach((lane) => {
    const savedOrder = asArray(value?.nodes)
      .filter((node) => String(node?.lane || '') === lane.id && lane.steps.some((step) => step.id === String(node?.id || '')))
      .map((node) => String(node.id));
    const missing = lane.steps.map((step) => step.id).filter((id) => !savedOrder.includes(id));
    orderByLane.set(lane.id, [...savedOrder, ...missing]);
    lane.steps.forEach((step) => controls.set(step.id, String(savedNodes.get(step.id)?.control || '')));
  });
  const board = createElement('div', 'flow-scheme');
  let selected = null;

  function definitionFor(stepId) {
    for (const lane of laneDefinitions) {
      const step = lane.steps.find((candidate) => candidate.id === stepId);
      if (step) return { lane, step };
    }
    return null;
  }

  function reorder(laneId, sourceId, targetId, after = false) {
    if (readOnly || sourceId === targetId) return;
    const order = orderByLane.get(laneId) || [];
    const fromIndex = order.indexOf(sourceId);
    if (fromIndex < 0) return;
    order.splice(fromIndex, 1);
    const targetIndex = order.indexOf(targetId);
    if (targetIndex < 0) return;
    order.splice(targetIndex + (after ? 1 : 0), 0, sourceId);
    selected = null;
    render();
    emit();
    announce(`${definitionFor(sourceId)?.step.label || 'Этап'}: позиция ${order.indexOf(sourceId) + 1} в потоке.`);
    board.querySelector(`[data-flow-step="${CSS.escape(sourceId)}"]`)?.focus();
  }

  function render() {
    board.replaceChildren();
    board.append(createElement('p', 'drag-instruction', readOnly
      ? 'Итоговая схема технологических потоков.'
      : 'Перетаскивайте этапы мышью. На сенсорном экране выберите один этап, затем другой. Для клавиатуры используйте Alt + стрелка влево или вправо.'));
    const lanes = createElement('div', 'flow-lanes');
    laneDefinitions.forEach((lane) => {
      const laneElement = createElement('section', 'flow-lane');
      laneElement.dataset.flowColor = lane.color;
      const heading = createElement('header', 'flow-lane-head');
      heading.append(createElement('span', 'flow-lane-marker'), createElement('h4', null, lane.label));
      laneElement.append(heading);
      const track = createElement('div', 'flow-lane-track');
      const order = orderByLane.get(lane.id) || [];
      order.forEach((stepId, index) => {
        const step = lane.steps.find((candidate) => candidate.id === stepId);
        if (!step) return;
        const card = createElement('article', `flow-step${selected?.stepId === stepId ? ' is-selected' : ''}`);
        card.tabIndex = readOnly ? -1 : 0;
        card.draggable = !readOnly;
        card.dataset.flowStep = stepId;
        card.dataset.laneId = lane.id;
        card.setAttribute('aria-label', `${lane.label}: ${step.label}, позиция ${index + 1}`);
        const copy = createElement('div', 'flow-step-copy');
        copy.append(createElement('span', 'flow-step-index', index + 1), createElement('strong', null, step.label));
        if (step.zone) copy.append(createElement('small', null, `Зона: ${step.zone}`));
        const grip = createElement('span', 'flow-step-grip');
        grip.append(createSvgIcon('grip'));
        card.append(copy, grip);
        if (step.requiresControl) {
          const control = createElement('input');
          control.type = 'text';
          control.placeholder = 'Что проверить';
          control.value = controls.get(stepId) || '';
          control.disabled = readOnly;
          control.setAttribute('aria-label', `Контрольная точка: ${step.label}`);
          control.addEventListener('click', (event) => event.stopPropagation());
          control.addEventListener('input', () => {
            controls.set(stepId, control.value);
            emit();
          });
          const field = makeField('Контрольная точка *', control);
          field.classList.add('flow-control-field');
          card.append(field);
        }
        card.addEventListener('click', (event) => {
          if (readOnly || event.target.closest('input')) return;
          if (!selected) {
            selected = { laneId: lane.id, stepId };
            render();
            announce(`Выбрано: ${step.label}. Выберите этап, перед которым его поставить.`);
            return;
          }
          if (selected.laneId === lane.id && selected.stepId !== stepId) reorder(lane.id, selected.stepId, stepId, false);
          else {
            selected = { laneId: lane.id, stepId };
            render();
          }
        });
        card.addEventListener('dragstart', (event) => {
          activeDragPayload = { kind: 'flow-step', laneId: lane.id, id: stepId };
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', JSON.stringify(activeDragPayload));
          card.classList.add('is-dragging');
        });
        card.addEventListener('dragend', () => {
          activeDragPayload = null;
          card.classList.remove('is-dragging');
          track.querySelectorAll('.is-drag-over').forEach((node) => node.classList.remove('is-drag-over', 'drop-after'));
        });
        card.addEventListener('dragover', (event) => {
          const payload = dragPayload(event);
          if (payload.kind !== 'flow-step' || payload.laneId !== lane.id || payload.id === stepId) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          const after = event.clientX > card.getBoundingClientRect().left + card.offsetWidth / 2;
          card.classList.add('is-drag-over');
          card.classList.toggle('drop-after', after);
        });
        card.addEventListener('dragleave', () => card.classList.remove('is-drag-over', 'drop-after'));
        card.addEventListener('drop', (event) => {
          const payload = dragPayload(event);
          if (payload.kind !== 'flow-step' || payload.laneId !== lane.id || payload.id === stepId) return;
          event.preventDefault();
          reorder(lane.id, payload.id, stepId, card.classList.contains('drop-after'));
        });
        card.addEventListener('keydown', (event) => {
          if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
          event.preventDefault();
          const delta = event.key === 'ArrowLeft' ? -1 : 1;
          const targetId = order[index + delta];
          if (targetId) reorder(lane.id, stepId, targetId, delta > 0);
        });
        track.append(card);
        if (index < order.length - 1) track.append(createElement('span', 'flow-arrow', '→'));
      });
      laneElement.append(track);
      lanes.append(laneElement);
    });
    board.append(lanes);
    const routes = createElement('div', 'flow-routes');
    if (block.wastePath) routes.append(createElement('p', 'flow-route waste-route', block.wastePath));
    if (block.cleanOutput) routes.append(createElement('p', 'flow-route clean-route', block.cleanOutput));
    if (routes.childElementCount) board.append(routes);
  }

  render();
  root.append(board);
  return {
    getValue: () => {
      const nodes = [];
      const edges = [];
      laneDefinitions.forEach((lane) => {
        const order = orderByLane.get(lane.id) || [];
        order.forEach((stepId, index) => {
          const step = lane.steps.find((candidate) => candidate.id === stepId);
          nodes.push({ id: step.id, type: 'operation', label: step.label, lane: lane.id, zone: step.zone, control: controls.get(step.id) || '' });
          if (index > 0) edges.push({ from: order[index - 1], to: stepId });
        });
      });
      return { nodes, edges };
    },
    validate: () => {
      const missingControl = laneDefinitions.flatMap((lane) => lane.steps).find((step) => step.requiresControl && !nonEmptyText(controls.get(step.id)));
      if (missingControl) {
        return { valid: false, message: `Заполните контрольную точку для этапа «${missingControl.label}».`, element: board.querySelector(`[data-flow-step="${CSS.escape(missingControl.id)}"] input`) };
      }
      return { valid: true };
    },
    firstControl: board.querySelector('input, [tabindex="0"]'),
  };
}

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
  if (type === 'scheme_builder' && asArray(environment.block.flowLanes).length) {
    return renderFlowScheme(environment);
  }
  const { root, block, value, readOnly, emit, announce } = environment;
  const defaults = DYNAMIC_DEFAULTS[type];
  const fields = normalizeDynamicFields(block, type);
  const keyCandidates = [block.collectionKey, defaults.key, 'rows', 'items'].filter(Boolean);
  const collectionKey = keyCandidates.find((key) => Array.isArray(value?.[key])) || block.collectionKey || defaults.key;
  const initialRows = Array.isArray(value) ? value : asArray(value?.[collectionKey]);
  const rows = initialRows.map((row) => {
    const data = isObject(row) ? cloneSerializable(row) : {};
    if (type === 'scheme_builder' && !data.id) data.id = nextId('node');
    return { runtimeId: nextId('row'), data };
  });
  const list = createElement('div', 'dynamic-list');
  const add = createElement('button', 'learning-button secondary', block.addLabel || defaults.addLabel);
  const preview = type === 'scheme_builder' ? createElement('div', 'scheme-preview') : null;
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

  function renderSchemePreview() {
    if (!preview) return;
    preview.replaceChildren();
    const heading = createElement('div', 'scheme-preview-heading');
    heading.append(createElement('h4', null, 'Предпросмотр технологического потока'));
    const lastTwo = rows.length % 100;
    const last = rows.length % 10;
    const stageWord = lastTwo >= 11 && lastTwo <= 14 ? 'этапов' : last === 1 ? 'этап' : last >= 2 && last <= 4 ? 'этапа' : 'этапов';
    heading.append(createElement('span', null, `${rows.length} ${stageWord}`));
    preview.append(heading);
    if (!rows.length) {
      preview.append(createElement('p', 'scheme-preview-empty', 'Добавьте этапы – схема появится здесь автоматически.'));
      return;
    }
    const track = createElement('div', 'scheme-preview-track');
    rows.forEach((rowState, index) => {
      const node = createElement('article', 'scheme-node');
      const typeField = fields.find((field) => field.id === 'type');
      const labelField = fields.find((field) => field.id === 'label');
      const selectedType = typeField?.options.find((option) => option.id === String(rowState.data.type ?? ''));
      const selectedLabel = labelField?.options.find((option) => option.id === String(rowState.data.label ?? ''));
      const typeLabel = selectedType?.label || humanText(rowState.data.type, 'Этап');
      node.dataset.nodeType = String(rowState.data.type || 'operation');
      node.append(createElement('span', 'scheme-node-type', typeLabel));
      node.append(createElement('strong', null, selectedLabel?.label || String(rowState.data.label || `Этап ${index + 1}`)));
      if (rowState.data.zone) node.append(createElement('small', null, `Поток: ${rowState.data.zone}`));
      if (rowState.data.control) node.append(createElement('p', 'scheme-node-control', String(rowState.data.control)));
      track.append(node);
      if (index < rows.length - 1) {
        const arrow = createElement('span', 'scheme-arrow', '→');
        arrow.setAttribute('aria-hidden', 'true');
        track.append(arrow);
      }
    });
    preview.append(track);
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
          renderSchemePreview();
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
    renderSchemePreview();
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
  if (preview) root.append(preview);
  return {
    getValue: () => {
      const values = rows.map((row) => cloneSerializable(row.data));
      const answer = { [collectionKey]: values };
      if (type === 'scheme_builder') {
        answer.edges = values.slice(1).map((node, index) => ({ from: values[index].id, to: node.id }));
      }
      return answer;
    },
    validate: () => {
      const requiredMinimum = type === 'observation_log'
        ? (requiresAnswer(block) || rows.length ? Number(block.minEntries ?? 1) : 0)
        : (requiresAnswer(block) ? Number(block.minNodes ?? 1) : 0);
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
      if (type === 'scheme_builder' && Number(block.minControlPoints) > 0) {
        const controlCount = rows.filter((row) => nonEmptyText(row.data.control) || row.data.type === 'control').length;
        if (controlCount < Number(block.minControlPoints)) {
          return { valid: false, message: `Добавьте не меньше ${Number(block.minControlPoints)} контрольных точек.`, element: list.querySelector('[data-field-id="control"]') || add };
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
