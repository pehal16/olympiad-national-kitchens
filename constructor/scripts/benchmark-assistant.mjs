import fs from "node:fs";
import path from "node:path";
import {
  referenceCases,
  referenceLecture,
  lectureFacts,
} from "./assistant-reference-cases.mjs";

import {
  evaluateMath,
  explicitConversion,
  mathInputIssue,
  mathInstructions,
  mathSchema,
} from "../shared/assistant-math.mjs";
import { retrieveExcerpts } from "../server/assistant-retrieval.mjs";

const root = "http://127.0.0.1:11435";
const model = "qwen3.5:9b-q4_K_M";
const [mode = "baseline", output = "storage/assistant-benchmark.json"] =
  process.argv.slice(2);
const rows = referenceCases();
const contexts = [];
const math = [];

const object = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const string = { type: "string" };
const integer = { type: "integer" };
const collection = (items) => object({ answers: { type: "array", items } });

async function json(route, body) {
  const response = await fetch(
    root + route,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(160000),
        }
      : { signal: AbortSignal.timeout(5000) },
  );
  if (!response.ok)
    throw Error(
      route +
        " HTTP " +
        response.status +
        " " +
        (await response.text()).slice(0, 250),
    );
  return response.json();
}

async function run(system, prompt, format, contextLength, max = 2300) {
  const value = await json("/api/generate", {
    model,
    system,
    prompt: JSON.stringify(prompt),
    format,
    stream: false,
    think: false,
    keep_alive: "5m",
    options: {
      temperature: 0,
      seed: 53,
      num_ctx: contextLength,
      num_predict: max,
    },
  });
  let answers = [];
  try {
    if (value.done_reason !== "length")
      answers = JSON.parse(value.response).answers || [];
  } catch {}
  const current = (await json("/api/ps")).models.find(
    (entry) => entry.name === model,
  );
  return {
    answers,
    doneReason: value.done_reason,
    promptTokens: value.prompt_eval_count,
    responseTokens: value.eval_count,
    elapsedMs: Math.round(value.total_duration / 1e6),
    loadedContext: current?.context_length,
    gpuBytes: current?.size_vram,
    totalBytes: current?.size,
  };
}

const version = (await json("/api/version")).version;
const file = path.resolve(output);
fs.mkdirSync(path.dirname(file), { recursive: true });
function report() {
  fs.writeFileSync(
    file,
    JSON.stringify(
      { model, version, cases: rows.length, math, contexts },
      null,
      2,
    ),
  );
}

const normalizedExpression = (value) =>
  String(value)
    .trim()
    .replace(/^x\s*=\s*/iu, "")

    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)");
const defaultJob = { other: "", unknown: "", values: [], unit: "", places: -1 };
function grade(row, answer, candidate) {
  if (!answer) return false;
  if (row.expected === null) return answer.status === "missing";
  if (answer.status !== "solved") return false;
  let evaluation;
  if (candidate) {
    if (mathInputIssue(answer.math, row.prompt)) return false;
    evaluation = evaluateMath(answer.math);
    if (!evaluation) return false;
    if (typeof row.expected === "string") {
      if (!evaluation.expanded) return false;
      return (
        evaluateMath({
          ...defaultJob,
          operation: "equivalence",
          expression: evaluation.expanded,
          other: row.expected,
        })?.equivalent === true
      );
    }
    if (evaluation.expanded) {
      evaluation = evaluateMath({
        ...defaultJob,
        operation: "calculate",
        expression: evaluation.expanded,
      });
      if (!evaluation) return false;
    }
  } else {
    if (typeof row.expected === "string") {
      return (
        evaluateMath({
          ...defaultJob,
          operation: "equivalence",
          expression: normalizedExpression(answer.value),
          other: row.expected,
        })?.equivalent === true
      );
    }
    evaluation = evaluateMath({
      ...defaultJob,
      operation: "calculate",
      expression: normalizedExpression(answer.value),
    });
    if (!evaluation || (answer.unit || "") !== (row.unit || "")) return false;
  }
  if (candidate && evaluation.unit !== (row.unit || "")) return false;
  return (
    typeof evaluation.value === "number" &&
    Math.abs(row.expected - evaluation.value) <=
      Math.max(1, Math.abs(row.expected)) * 0.00001
  );
}
if (mode === "baseline" || mode === "enhanced") {
  const candidate = mode === "enhanced";
  const prompt = candidate
    ? "Для каждой задачи сохрани id. Укажи status=missing при недостатке данных, иначе status=solved и заполни math. При раскрытии скобок обязательно operation=expand. При неполном условии math можно оставить пустым. " +
      mathInstructions
    : "Реши каждую учебную задачу самостоятельно. Верни JSON. Сохрани id. В value запиши окончательное число, точную дробь или выражение от x, в unit — mA, m/s, mol, g/cm^3 или kg согласно требованию, иначе пустую строку. При неполном условии status=missing, иначе status=solved. Поле formula содержит короткую запись расчёта или преобразования.";
  const fields = candidate
    ? {
        ...object({ id: string, status: string, math: mathSchema }),
        required: ["id", "status"],
      }
    : object({
        id: string,
        status: string,
        value: string,
        unit: string,
        formula: string,
      });
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    const direct = new Map();
    if (candidate) {
      for (const row of batch) {
        const math = explicitConversion(row.prompt);
        if (math) direct.set(row.id, { id: row.id, status: "solved", math });
      }
    }
    const response = await run(
      prompt,
      batch
        .filter(({ id }) => !direct.has(id))
        .map(({ id, prompt }) => ({ id, prompt })),
      collection(fields),
      candidate ? 32768 : 16384,
      3200,
    );
    response.answers.push(...direct.values());
    if (candidate) {
      const fixes = [];
      for (const row of batch) {
        const previous = response.answers.find(
          (answer) => answer.id === row.id,
        );
        if (previous?.status !== "solved") continue;
        const issue = mathInputIssue(previous.math, row.prompt);
        if (issue)
          fixes.push({
            id: row.id,
            prompt: row.prompt,
            previousMath: previous.math,
            issue,
          });
      }
      if (fixes.length) {
        const recovered = await run(
          prompt +
            "\nИсправь отмеченную ошибку. Проверяй только данные этой задачи. Если одной исходной величины нет, status=missing.",
          fixes,
          collection(fields),
          32768,
          3200,
        );
        response.elapsedMs += recovered.elapsedMs;
        for (const result of recovered.answers) {
          const index = response.answers.findIndex(
            (answer) => answer.id === result.id,
          );
          if (index >= 0) response.answers[index] = result;
        }
      }
    }
    const outcomes = batch.map((row) => ({
      id: row.id,
      subject: row.subject,
      correct: grade(
        row,
        response.answers.find((answer) => answer.id === row.id),
        candidate,
      ),
    }));
    math.push({ ...response, outcomes });
    report();
    console.log(
      mode,
      i + 10,
      outcomes.filter((outcome) => outcome.correct).length,
      response.elapsedMs,
    );
  }
}

if (mode === "context") {
  const pages = referenceLecture();
  const questions = lectureFacts.map(({ phrase }, index) => ({
    id: String(index + 1),
    question: "Укажи: " + phrase,
  }));
  const prompt =
    "Найди значение каждого указанного факта только в учебной лекции. Для каждого верни id, точное значение с единицей как в тексте и целый номер страницы. Если факт недоступен, верни пустую строку и page=0. Не выдумывай пропущенные данные.";
  const format = collection(
    object({ id: string, value: string, page: integer }),
  );
  const extra = process.env.GKTS_BENCH_EXTENDED === "1" ? [49152] : [];
  for (const size of [16384, 32768, ...extra]) {
    try {
      const response = await run(
        prompt,
        { pages, questions },
        format,
        size,
        950,
      );
      const found = lectureFacts.reduce(
        (n, { page, value }, i) =>
          n +
          Number(
            response.answers.some(
              (a) =>
                a.id === String(i + 1) &&
                a.page === page &&
                a.value.trim() === value,
            ),
          ),
        0,
      );
      contexts.push({
        context: size,
        found,
        total: questions.length,
        ...response,
      });
      console.log(
        "context",
        size,
        found,
        response.promptTokens,
        response.elapsedMs,
        response.gpuBytes,
        response.totalBytes,
      );
    } catch (error) {
      contexts.push({ context: size, error: error.message });
      console.log("context", size, error.message);
    }
    report();
  }
  const excerpts = retrieveExcerpts(
    { title: "Контрольная лекция", pages },
    questions.map(({ question }) => question).join("\n"),
    12,
  );
  const response = await run(
    prompt,
    { pages: excerpts, questions },
    format,
    32768,
    950,
  );
  const found = lectureFacts.reduce(
    (n, { page, value }, i) =>
      n +
      Number(
        response.answers.some(
          (a) =>
            a.id === String(i + 1) &&
            a.page === page &&
            a.value.trim() === value,
        ),
      ),
    0,
  );
  contexts.push({
    context: 32768,
    method: "selected",
    found,
    total: questions.length,
    ...response,
  });
  console.log(
    "selected",
    found,
    response.promptTokens,
    response.elapsedMs,
    response.gpuBytes,
    response.totalBytes,
  );
}
if (!["baseline", "context", "enhanced"].includes(mode))
  throw Error("Unknown benchmark mode");
report();
