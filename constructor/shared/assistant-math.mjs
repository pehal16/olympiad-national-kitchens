export const mathOperations = ["calculate", "equivalence", "linear", "expand"];
const fields = {
  operation: { type: "string", enum: mathOperations },
  expression: { type: "string", minLength: 1 },
  other: { type: "string" },
  unknown: { type: "string" },
  values: {
    type: "array",
    maxItems: 12,
    items: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1 },
        value: {
          type: "string",
          pattern: "^[+-]?([0-9]{1,16}([.,][0-9]{1,12})?|[.,][0-9]{1,12})([eE][+-]?[0-9]{1,2})?( */ *[+-]?[0-9]{1,16}([.,][0-9]{1,12})?)?$",
        },
        unit: { type: "string" },
      },
      required: ["name", "value", "unit"],
      additionalProperties: false,
    },
  },
  unit: { type: "string" },
  places: { type: "integer", minimum: -1, maximum: 8 },
};
export const mathSchema = {
  type: "object",
  properties: fields,
  required: Object.keys(fields),
  additionalProperties: false,
};

const namePattern = /^[a-z][a-z0-9_]{0,11}$/iu;
function bounded(value, length) {
  if (typeof value !== "string" || value.length > length)
    throw Error("Unsupported input");
  return value.trim();
}

export function readMath(value) {
  if (!mathOperations.includes(value?.operation)) return null;
  try {
    let expression = bounded(value.expression, 210);
    let other = bounded(value.other ?? "", 210);
    if (value.operation === "linear" && !other && expression.includes("=")) {
      const sides = expression.split("=");
      if (sides.length !== 2) return null;
      [expression, other] = sides.map((side) => side.trim());
    }
    if (!expression || !Array.isArray(value.values) || value.values.length > 12)
      return null;
    return {
      operation: value.operation,
      expression,
      other,
      unknown: bounded(value.unknown ?? "", 12),
      values: value.values.map((entry) => ({
        name: bounded(entry?.name, 12),
        value: bounded(entry?.value, 40),
        unit: bounded(entry?.unit, 30),
      })),
      unit: bounded(value.unit, 30),
      places:
        Number.isInteger(value.places) &&
        value.places >= -1 &&
        value.places <= 8
          ? value.places
          : -1,
    };
  } catch {
    return null;
  }
}

export const mathInstructions = [
  "Для вычисления, перевода единиц, решения линейного уравнения или проверки равносильности многочленов верни проверяемое math. Сохрани исходные данные. Кабинет подставит числа и сам вычислит результат.",
  "operation=calculate: expression — одна формула в ASCII с числами или именами из values. В values передай точные исходные величины: name, value (одно исходное число или явно данная дробь), unit. unit задаёт требуемую единицу результата. Используй, например, V, Ohm, A, mA, km/h, m/s, kg, g, L, mL, mol, g/mol, g/cm^3. Для безразмерных величин unit пустая. Для процента, записанного как 20%, передай value=20, unit=% или используй 20/100 в expression.",
  "Разрешены + - * / ^ скобки, sqrt и abs. Умножение всегда через *. Для перевода единиц используй исходную единицу величины, а не пересчитанное число. Для явного округления задай places, иначе -1. Для линейного уравнения operation=linear, expression и other — части через знак равенства, unknown — имя неизвестной, values=[], unit пустая. Для многочленов operation=equivalence, expression и other — сравниваемые выражения от букв. Когда просят раскрыть скобки или привести подобные, operation=expand, expression — исходный многочлен и other пустая. Для обоих unknown пустая, values=[], unit пустая.",
  'Если исходная величина имеет единицу, в expression поставь имя из values ВМЕСТО её численного значения. Кабинет автоматически приведёт единицы. Не вставляй множитель для перевода. Пример: для тока при 10 В и 5 Ом результаты полей expression="u/r", values=[{"name":"u","value":"10","unit":"V"},{"name":"r","value":"5","unit":"Ohm"}], unit="mA". Пример перевода 250 см в метры: expression="d", values=[{"name":"d","value":"250","unit":"cm"}], unit="m". Для чистых числовых выражений без величин values=[].',
  "При нехватке данных уточни недостающую величину. Не используй значения из другой задачи.  В остальных объяснениях записывай формулы через \\(…\\) или \\[…\\] в LaTeX. Используй дроби, индексы и степени. Не ставь математический код в Markdown-блок. Не объявляй модельный ответ проверенным.",
].join("\n");

const abs = (n) => (n < 0n ? -n : n);
const bound = 10n ** 132n;
function rational(n, d = 1n) {
  if (d === 0n || abs(n) > bound || abs(d) > bound)
    throw Error("Outside calculation range");
  if (d < 0n) return rational(-n, -d);
  let a = abs(n),
    b = d;
  while (b) [a, b] = [b, a % b];
  return [n / a, d / a];
}

const one = [1n, 1n],
  zero = [0n, 1n];
const negate = ([n, d]) => [-n, d];
const add = ([a, b], [c, d]) => rational(a * d + c * b, b * d);
const multiply = ([a, b], [c, d]) => rational(a * c, b * d);
const divide = ([a, b], [c, d]) => rational(a * d, b * c);
const asNumber = ([n, d]) => Number(n) / Number(d);
const normal = (text) =>
  text.replace(/[−–]/gu, "-").replace(/[×·⋅]/gu, "*").replace(/÷/gu, "/");

function literal(raw) {
  const match = /^(\d{1,16})(?:[.,](\d{1,12}))?(?:e([+-]?\d{1,2}))?$/iu.exec(
    raw,
  );
  if (!match || Math.abs(Number(match[3] || 0)) > 16)
    throw Error("Unsupported number");
  const decimals = match[2] || "";
  const power = Number(match[3] || 0) - decimals.length;
  return rational(
    BigInt(match[1] + decimals) * 10n ** BigInt(Math.max(0, power)),
    10n ** BigInt(Math.max(0, -power)),
  );
}

function integer(value) {
  if (value[1] !== 1n || abs(value[0]) > 12n) throw Error("Unsupported power");
  return Number(value[0]);
}
function raised(value, power) {
  const n = BigInt(Math.abs(power));
  if (!n && !value[0]) throw Error("Undefined power");
  return power < 0
    ? rational(value[1] ** n, value[0] ** n)
    : rational(value[0] ** n, value[1] ** n);
}
function squareRoot([n, d]) {
  if (n < 0n) throw Error("Outside real domain");
  const root = (x) => {
    if (x < 2n) return x;
    let high = x,
      low = (high + 1n) / 2n;
    while (low < high) {
      high = low;
      low = (high + x / high) / 2n;
    }
    if (high * high !== x) throw Error("Root is not rational");
    return high;
  };
  return rational(root(n), root(d));
}

function expressionTree(expression) {
  const raw = normal(expression)
    .replace(/[²³]/gu, (value) => (value === "²" ? "^2" : "^3"))
    .replace(
      /(^|[^\d])([.,])(?=\d)/gu,
      (_match, prefix, separator) => prefix + "0" + separator,
    );
  const lexemes =
    raw.match(
      /\d+(?:[.,]\d+)?(?:e[+-]?\d+)?|[a-z][a-z0-9_]*|[()+*/^+-]|\S/giu,
    ) || [];
  if (lexemes.length < 1 || lexemes.length > 120)
    throw Error("Expression length");
  const tokens = lexemes.flatMap((token, index) => {
    const before = lexemes[index - 1] || "";
    const number = /^\d/u.test(before);
    const implicit =
      ((number || before === ")") &&
        (token === "(" || /^[a-z]/iu.test(token))) ||
      (before === ")" && /^\d/u.test(token));
    return implicit ? ["*", token] : [token];
  });
  let at = 0;
  function take(value) {
    if (tokens[at] !== value) return false;
    at++;
    return true;
  }
  function atom() {
    if (take("(")) {
      const item = sum();
      if (!take(")")) throw Error("Missing parenthesis");
      return { type: "group", item };
    }
    const word = tokens[at++];
    if (/^\d/u.test(word || ""))
      return { type: "number", word, value: literal(word) };
    if (!namePattern.test(word || "")) throw Error("Unsupported symbol");
    if (!take("(")) return { type: "name", word };
    if (word !== "sqrt" && word !== "abs") throw Error("Unsupported function");
    const item = sum();
    if (!take(")")) throw Error("Missing parenthesis");
    return { type: word, item };
  }
  function unary() {
    if (take("+")) return unary();
    if (take("-")) return { type: "minus", item: unary() };
    const left = atom();
    return take("^") ? { type: "^", left, right: unary() } : left;
  }
  function combine(next, operators) {
    let left = next();
    while (operators.includes(tokens[at] || " ")) {
      const type = tokens[at++];
      left = { type, left, right: next() };
    }
    return left;
  }
  function sum() {
    return combine(() => combine(unary, ["*", "/"]), ["+", "-"]);
  }
  const tree = sum();
  if (at !== tokens.length) throw Error("Trailing input");
  return tree;
}

const unitless = [0, 0, 0, 0, 0];
const mass = [1, 0, 0, 0, 0],
  length = [0, 1, 0, 0, 0],
  time = [0, 0, 1, 0, 0];
const units = {
  kg: [one, mass],
  g: [rational(1n, 1000n), mass],
  mg: [rational(1n, 1000000n), mass],
  m: [one, length],
  cm: [rational(1n, 100n), length],
  mm: [rational(1n, 1000n), length],
  km: [rational(1000n), length],
  s: [one, time],
  min: [rational(60n), time],
  h: [rational(3600n), time],
  A: [one, [0, 0, 0, 1, 0]],
  mA: [rational(1n, 1000n), [0, 0, 0, 1, 0]],
  V: [one, [1, 2, -3, -1, 0]],
  Ohm: [one, [1, 2, -3, -2, 0]],
  mol: [one, [0, 0, 0, 0, 1]],
  mmol: [rational(1n, 1000n), [0, 0, 0, 0, 1]],
  L: [rational(1n, 1000n), [0, 3, 0, 0, 0]],
  mL: [rational(1n, 1000000n), [0, 3, 0, 0, 0]],
  Pa: [one, [1, -1, -2, 0, 0]],
  kPa: [rational(1000n), [1, -1, -2, 0, 0]],
  J: [one, [1, 2, -2, 0, 0]],
  W: [one, [1, 2, -3, 0, 0]],
  N: [one, [1, 1, -2, 0, 0]],
};
const aliases = {
  кг: "kg",
  г: "g",
  мг: "mg",
  м: "m",
  см: "cm",
  мм: "mm",
  км: "km",
  с: "s",
  мин: "min",
  ч: "h",
  А: "A",
  мА: "mA",
  В: "V",
  Ом: "Ohm",
  Ω: "Ohm",
  моль: "mol",
  ммоль: "mmol",
  л: "L",
  мл: "mL",
  l: "L",
  ml: "mL",
  Па: "Pa",
  кПа: "kPa",
  Дж: "J",
  Вт: "W",
  Н: "N",
};
const canonicalUnit = (s) =>
  normal(s)
    .replace(/[²³]/gu, (c) => (c === "²" ? "^2" : "^3"))
    .replace(/\s+/gu, "")
    .replace(/[\p{L}]+/gu, (name) => aliases[name] ?? name);
const sameDimension = (a, b) => a.every((v, i) => v === b[i]);
const sumDimensions = (a, b, scale) => a.map((v, i) => v + b[i] * scale);

function unitOf(raw) {
  const unit = canonicalUnit(raw);
  if (!unit || unit === "1") return { unit: "", factor: one, dim: unitless };
  if (unit === "%") return { unit, factor: rational(1n, 100n), dim: unitless };
  const factors =
    unit.match(/^[A-Za-z]+(?:\^-?[0-4])?|[*/][A-Za-z]+(?:\^-?[0-4])?/gu) || [];
  if (!factors.length || factors.join("") !== unit)
    throw Error("Unsupported unit");
  let factor = one,
    dim = unitless;
  for (const part of factors) {
    const [symbol, exponent] = part.replace(/^[*/]/u, "").split("^");
    if (!Object.hasOwn(units, symbol)) throw Error("Unknown unit");
    const value = (part.startsWith("/") ? -1 : 1) * Number(exponent ?? 1);
    factor = multiply(factor, raised(units[symbol][0], value));
    dim = sumDimensions(dim, units[symbol][1], value);
  }
  return { unit, factor, dim };
}

function quantity(node, variables) {
  if (node.type === "number") return { value: node.value, dim: unitless };
  if (node.type === "name") {
    if (!variables.has(node.word)) throw Error("Missing variable value");
    return variables.get(node.word);
  }
  if (node.item) {
    const item = quantity(node.item, variables);
    if (node.type === "group") return item;
    if (node.type === "minus") return { ...item, value: negate(item.value) };
    if (node.type === "abs")
      return { ...item, value: [abs(item.value[0]), item.value[1]] };
    if (item.dim.some((power) => power % 2))
      throw Error("Unit under square root");
    return { value: squareRoot(item.value), dim: item.dim.map((v) => v / 2) };
  }
  const left = quantity(node.left, variables),
    right = quantity(node.right, variables);
  if (node.type === "+" || node.type === "-") {
    if (!sameDimension(left.dim, right.dim)) throw Error("Incompatible units");
    return {
      value: add(
        left.value,
        node.type === "+" ? right.value : negate(right.value),
      ),
      dim: left.dim,
    };
  }
  if (node.type === "^") {
    if (!sameDimension(right.dim, unitless)) throw Error("Unit in exponent");
    const power = integer(right.value);
    return {
      value: raised(left.value, power),
      dim: left.dim.map((v) => v * power),
    };
  }
  const times = node.type === "*";
  return {
    value: (times ? multiply : divide)(left.value, right.value),
    dim: sumDimensions(left.dim, right.dim, times ? 1 : -1),
  };
}

function constant(value) {
  return new Map(value[0] ? [["", value]] : []);
}
function setCoefficient(out, monomial, value) {
  const sum = add(out.get(monomial) || zero, value);
  if (sum[0]) out.set(monomial, sum);
  else out.delete(monomial);
  if (out.size > 64 || monomial.length > 12)
    throw Error("Polynomial too large");
}
function multiplyPolynomial(left, right) {
  const out = new Map();
  for (const [l, a] of left)
    for (const [r, b] of right)
      setCoefficient(out, (l + r).split("").sort().join(""), multiply(a, b));
  return out;
}
function polynomial(tree) {
  if (tree.type === "name") {
    if (!/^[a-z]$/u.test(tree.word))
      throw Error("Unsupported symbolic variable");
    return new Map([[tree.word, one]]);
  }
  if (tree.type === "number") return constant(tree.value);
  if (tree.type === "group") return polynomial(tree.item);
  if (tree.type === "minus")
    return new Map([...polynomial(tree.item)].map(([m, v]) => [m, negate(v)]));
  if (tree.item) return constant(quantity(tree, new Map()).value);
  const left = polynomial(tree.left),
    right = polynomial(tree.right);
  switch (tree.type) {
    case "+":
    case "-":
      for (const [m, v] of right)
        setCoefficient(left, m, tree.type === "+" ? v : negate(v));
      return left;
    case "*":
      return multiplyPolynomial(left, right);
    case "/":
      if (right.size !== 1 || !right.has(""))
        throw Error("Symbolic denominator");
      return new Map([...left].map(([m, v]) => [m, divide(v, right.get(""))]));
    case "^": {
      if ([...right.keys()].some(Boolean)) throw Error("Symbolic exponent");
      const power = integer(right.get("") || zero);
      if (power < 0) {
        if (left.size !== 1 || !left.has(""))
          throw Error("Symbolic denominator");
        return constant(raised(left.get(""), power));
      }
      let out = constant(one);
      for (let i = 0; i < power; i++) out = multiplyPolynomial(out, left);
      return out;
    }
  }
  throw Error("Unsupported symbolic expression");
}
function expanded(poly) {
  const terms = [...poly].sort(
    ([a], [b]) => b.length - a.length || a.localeCompare(b),
  );
  return (
    terms
      .map(([word, [n, d]], i) => {
        const symbols = [...new Set(word)].map((letter) => {
          const power = [...word].filter((c) => c === letter).length;
          return { letter, power };
        });
        const prefix = n < 0n ? "-" : i ? "+" : "";
        const coefficient =
          word && abs(n) === d
            ? ""
            : d === 1n
              ? String(abs(n))
              : "(" + abs(n) + "/" + d + ")";
        const value = [
          coefficient,
          ...symbols.map(
            ({ letter, power }) => letter + (power > 1 ? "^" + power : ""),
          ),
        ]
          .filter(Boolean)
          .join("*");
        return prefix + value;
      })
      .join("") || "0"
  );
}
function equalPolynomial(a, b) {
  return (
    a.size === b.size &&
    [...a].every(([key, value]) => {
      const target = b.get(key);
      return target && target[0] === value[0] && target[1] === value[1];
    })
  );
}

function asLatex(node) {
  if (node.type === "number") return node.word.replace(",", "{,}");
  if (node.type === "name") return node.word.replace(/_([a-z0-9_]+)/i, "_{$1}");
  if (node.item) {
    const inner = asLatex(node.item);
    if (node.type === "group") return "\\left(" + inner + "\\right)";
    if (node.type === "sqrt") return "\\sqrt{" + inner + "}";
    if (node.type === "abs") return "\\left|" + inner + "\\right|";
    return "-" + inner;
  }
  const left = asLatex(node.left),
    right = asLatex(node.right);
  if (node.type === "/") return "\\frac{" + left + "}{" + right + "}";
  if (node.type === "^") return left + "^{" + right + "}";
  return (
    left + (node.type === "*" ? " \\cdot " : " " + node.type + " ") + right
  );
}
function exact([n, d]) {
  return d === 1n
    ? String(n)
    : (n < 0n ? "-" : "") + "\\frac{" + abs(n) + "}{" + d + "}";
}
function decimals([n, d], places) {
  const base = 10n ** BigInt(places);
  const rounded = (2n * abs(n) * base + d) / (2n * d);
  const digits = String(rounded).padStart(places + 1, "0");
  const unsigned = places
    ? digits.slice(0, -places) + "{,}" + digits.slice(-places)
    : digits;
  return {
    rounded: asNumber([n < 0n ? -rounded : rounded, base]),
    latex: (n < 0n && rounded ? "-" : "") + unsigned,
  };
}

function mentioned(node, names = new Set()) {
  if (node.type === "name") names.add(node.word);
  if (node.item) mentioned(node.item, names);
  if (node.left) mentioned(node.left, names);
  if (node.right) mentioned(node.right, names);
  return names;
}

const unitNames = [
  [/^метр(?:ах|ов|а)?\s+в\s+секунд[уыу]?$/iu, "m/s"],
  [/^километр(?:ах|ов|а)?\s+в\s+час(?:ах)?$/iu, "km/h"],
  [/^миллиампер(?:ах|ов|а)?$/iu, "mA"],
  [/^ампер(?:ах|ов|а)?$/iu, "A"],
  [/^килограмм(?:ах|ов|а)?$/iu, "kg"],
  [/^грамм(?:ах|ов|а)?$/iu, "g"],
  [/^сантиметр(?:ах|ов|а)?$/iu, "cm"],
  [/^миллиметр(?:ах|ов|а)?$/iu, "mm"],
  [/^километр(?:ах|ов|а)?$/iu, "km"],
  [/^метр(?:ах|ов|а)?$/iu, "m"],
  [/^литр(?:ах|ов|а)?$/iu, "L"],
  [/^миллилитр(?:ах|ов|а)?$/iu, "mL"],
  [/^секунд(?:ах|ы|у)?$/iu, "s"],
  [/^минут(?:ах|ы|у)?$/iu, "min"],
  [/^час(?:ах|ов|а)?$/iu, "h"],
];
function unitName(value) {
  const word = value.trim();
  return unitNames.find(([pattern]) => pattern.test(word))?.[1] || word;
}

export function explicitConversion(message) {
  const match =
    /^\s*(?:переведи(?:те)?|вырази(?:те)?|пересчитай(?:те)?)\s+(?:скорость|массу|длину|объём|объем|силу тока|время)?\s*([+-]?\d+(?:[.,]\d+)?)\s+(.+?)\s+в\s+(.+?)\s*[.?!]?\s*$/iu.exec(
      message,
    );
  if (!match) return null;
  try {
    const from = unitOf(unitName(match[2])),
      to = unitOf(unitName(match[3]));
    if (!from.unit || !to.unit || !sameDimension(from.dim, to.dim)) return null;
    return {
      operation: "calculate",
      expression: "v",
      other: "",
      unknown: "",
      values: [{ name: "v", value: match[1], unit: from.unit }],
      unit: to.unit,
      places: -1,
    };
  } catch {
    return null;
  }
}

const numberText = String.raw`(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:e[+-]?\d+)?`;
const numericTokens = new RegExp(
  String.raw`(?<![\p{L}\d_.,])${numberText}`,
  "giu",
);
const inputValue = new RegExp(
  String.raw`^([+-]?${numberText})(?:\s*/\s*([+-]?${numberText}))?$`,
  "iu",
);
const fractionTail = new RegExp(String.raw`^\s*/\s*([+-]?${numberText})`, "iu");
const conversionFactors = new Set([60, 1000, 3600, 10000, 100000, 1000000]);
const asDecimal = (text) => Number(text.replace(",", "."));
const missingInput =
  "Используй только исходные величины. Если какого-то значения нет в условии, спроси его.";

export function mathInputIssue(raw, source) {
  const job = readMath(raw);
  const result = evaluateMath(job);
  if (!result) return "Укажи полную формулу и согласованные единицы измерения.";
  if (job.operation !== "calculate" || !source) return "";
  const original = normal(source);
  const numbers = Array.from(original.matchAll(numericTokens), (match) => ({
    value: asDecimal(match[0]),
    rest: original.slice(match.index + match[0].length),
  }));
  const used = new Set();
  for (const item of result.bindings) {
    const parts = inputValue.exec(normal(item.value));
    if (!parts) return missingInput;
    const [, numerator, denominator] = parts;
    const index = numbers.findIndex(({ value, rest }, index) => {
      if (used.has(index) || value !== Math.abs(asDecimal(numerator)))
        return false;
      if (item.unit === "%") return /^\s*%/u.test(rest);
      if (!denominator) return true;
      const divisor = asDecimal(denominator);
      return (
        (divisor === 100 && /^\s*%/u.test(rest)) ||
        asDecimal(fractionTail.exec(rest)?.[1] ?? "") === divisor
      );
    });
    if (index < 0) return missingInput;
    used.add(index);
  }
  if (!result.bindings.length && !result.unit) return "";
  const given = new Set(numbers.map(({ value }) => value));
  const hasPercent = numbers.some(({ rest }) => /^\s*%/u.test(rest));
  const unusedConversion = (value) =>
    !given.has(value) &&
    (conversionFactors.has(value) || (value === 100 && result.unit === "%"));
  const expression = normal(job.expression);
  const constants = Array.from(expression.matchAll(numericTokens), (m) =>
    asDecimal(m[0]),
  );
  if (
    constants.some(
      (value) =>
        value > 4 &&
        !given.has(value) &&
        !unusedConversion(value) &&
        !(value === 100 && hasPercent),
    )
  )
    return missingInput;
  if (constants.some(unusedConversion)) {
    const withoutConversion = expression.replace(numericTokens, (token) =>
      unusedConversion(asDecimal(token)) ? "1" : token,
    );
    if (
      evaluateMath({ ...job, expression: withoutConversion })?.exact !==
      result.exact
    )
      return "Передай исходные единицы без ручного множителя. Кабинет сам выполнит перевод.";
  }
  return "";
}

export function mathSource(input) {
  return [
    input.message,
    ...(input.calculationContext || []),
    ...(/предыдущ|выше|т[еоу]\s+же|прежн|как раньше|исходн.{0,18}из чата/iu.test(
      input.message,
    )
      ? (input.history || [])
          .filter(({ role }) => role === "user")
          .slice(-4)
          .map(({ text }) => text)
      : []),
    ...(input.attachments || []).flatMap(({ excerpts }) =>
      excerpts.map(({ text }) => text),
    ),
  ]
    .filter(Boolean)
    .join("\n");
}

export function evaluateMath(raw) {
  const job = readMath(raw);
  if (!job) return null;
  try {
    const left = expressionTree(job.expression);
    if (job.operation === "calculate") {
      const variables = new Map();
      const needed = mentioned(left);
      for (const item of job.values) {
        if (!needed.has(item.name)) continue;
        if (!namePattern.test(item.name) || variables.has(item.name))
          return null;
        const unit = unitOf(item.unit);
        const entry = quantity(expressionTree(item.value), new Map()).value;
        variables.set(item.name, {
          value: multiply(entry, unit.factor),
          dim: unit.dim,
        });
      }
      const metric = quantity(left, variables),
        unit = unitOf(job.unit);
      if (!sameDimension(metric.dim, unit.dim)) return null;
      const value = divide(metric.value, unit.factor);
      const neat = job.places >= 0 ? decimals(value, job.places) : null;
      return {
        value: neat?.rounded ?? asNumber(value),
        exact: value.map(String).join("/"),
        unit: unit.unit,
        expression: asLatex(left),
        bindings: job.values.filter((item) => needed.has(item.name)),
        latex: neat?.latex ?? exact(value),
        rounded: Boolean(neat),
      };
    }
    if (job.values.length || job.unit) return null;
    const a = polynomial(left);
    if (job.operation === "expand") {
      const value = expanded(a);
      return {
        expanded: value,
        expression: asLatex(left),
        latex: asLatex(expressionTree(value)),
      };
    }
    const right = expressionTree(job.other);
    const b = polynomial(right);
    if (job.operation === "equivalence") {
      return {
        equivalent: equalPolynomial(a, b),
        expression: asLatex(left),
        other: asLatex(right),
      };
    }
    if (!/^[a-z]$/u.test(job.unknown)) return null;
    for (const [key, value] of b) setCoefficient(a, key, negate(value));
    if (
      [...a.keys()].some((key) => key && key !== job.unknown) ||
      !a.has(job.unknown)
    )
      return null;
    const result = divide(negate(a.get("") || zero), a.get(job.unknown));
    return {
      value: asNumber(result),
      exact: result.map(String).join("/"),
      unit: "",
      expression: asLatex(left) + " = " + asLatex(right),
      latex: job.unknown + " = " + exact(result),
    };
  } catch {
    return null;
  }
}

export function calculationOption(text, result) {
  if (!result || typeof result.value !== "number") return false;
  const plain = normal(
    text
      .trim()
      .replace(/^(?:\\[([]|\$\$?)|(?:\\[)\]]|\$\$?)$/gu, "")
      .trim(),
  )
    .replace(/\\[dt]?frac\{([+-]?\d+)\}\{(\d+)\}/gu, "$1/$2")
    .replace(/\\mathrm\{([^{}]+)\}/gu, "$1")
    .replace(/\\,/gu, " ");
  const match =
    /^([+-]?\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?)\s*(\S.*)?$/u.exec(
      plain,
    );
  if (!match) return false;
  try {
    const choice = quantity(expressionTree(match[1]), new Map()).value;
    const given = unitOf(match[2] || result.unit),
      requested = unitOf(result.unit);
    if (!sameDimension(given.dim, requested.dim)) return false;
    const actual = divide(multiply(choice, given.factor), requested.factor);
    if (result.rounded)
      return Math.abs(asNumber(actual) - result.value) < 1e-10;
    const [n, d] = result.exact.split("/").map(BigInt);
    return actual[0] === n && actual[1] === d;
  } catch {
    return false;
  }
}

export function mathReply(result, operation) {
  if (!result) return "";
  if (operation === "equivalence") {
    return (
      "Проверил коэффициенты после раскрытия скобок.\n\\[" +
      result.expression +
      (result.equivalent ? " = " : " \\not\\equiv ") +
      result.other +
      "\\]"
    );
  }
  const input = (result.bindings || []).map(
    ({ name, value, unit }) => name + " = " + value + (unit ? " " + unit : ""),
  );
  const withUnits =
    result.unit === "%"
      ? "\\,\\%"
      : result.unit
        ? "\\,\\mathrm{" + result.unit.replace("*", "\\,") + "}"
        : "";
  return [
    input.length ? "Исходные величины — " + input.join(", ") + "." : "",
    "\\[" +
      result.expression +
      (operation === "linear"
        ? "\\]\\n\\["
        : result.rounded
          ? " \\approx "
          : " = ") +
      result.latex +
      withUnits +
      "\\]",
    result.rounded
      ? "Результат округлён после вычисления."
      : "Результат проверен вычислением.",
  ]
    .filter(Boolean)
    .join("\n")
    .replace("\\]\\n\\[", "\\]\n\\[");
}
