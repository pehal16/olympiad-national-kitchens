import test from "node:test";
import assert from "node:assert/strict";
import { zipSync } from "fflate";
import {
  evaluateMath,
  mathInputIssue,
  mathReply,
  calculationOption,
} from "../shared/assistant-math.mjs";
import { isCalculationRequest } from "../shared/assistant-chat.mjs";
import { readWorkQuestions } from "../shared/assistant-work.mjs";
import { readLectures } from "../server/assistant-documents.mjs";
import {
  historyContext,
  retrieveExcerpts,
} from "../server/assistant-retrieval.mjs";
import {
  referenceLecture,
  lectureFacts,
} from "../scripts/assistant-reference-cases.mjs";

const job = {
  operation: "calculate",
  expression: "",
  other: "",
  unknown: "",
  values: [],
  unit: "",
  places: -1,
};
const evaluate = (input) => evaluateMath({ ...job, ...input });

test("arithmetic keeps exact fractions and school precedence, and bounds the supported expressions", () => {
  const result = evaluate({ expression: "1/3 + 1/4" });
  assert.equal(result.exact, "7/12");
  assert.equal(result.latex, "\\frac{7}{12}");
  assert.match(mathReply(result, "calculate"), /\\frac\{7\}\{12\}/);
  assert.equal(evaluate({ expression: "-2^2 + sqrt(81/4)" }).exact, "1/2");
  assert.equal(evaluate({ expression: "sqrt(2)" }), null);
  assert.equal(evaluate({ expression: "10 / 0" }), null);
  assert.equal(evaluate({ expression: "18^300" }), null);
  assert.equal(evaluate({ expression: "median(3)" }), null);
});

test("quantities keep their dimensions and check a unique choice independently", () => {
  const calculation = {
    ...job,
    expression: "u/r",
    unit: "mA",
    values: [
      { name: "u", value: "12", unit: "В" },
      { name: "r", value: "4", unit: "Ом" },
    ],
  };
  const result = evaluate(calculation);
  assert.equal(result.value, 3000);
  assert.ok(calculationOption("3 А", result));
  assert.ok(calculationOption("3000 мА", result));
  assert.equal(calculationOption("3000 кг", result), false);
  assert.equal(evaluate({ ...calculation, expression: "u+r" }), null);

  const draft = {
    title: "Закон Ома",
    prompt:
      "Найдите ток в миллиамперах при напряжении 12 В и сопротивлении 4 Ом.",
    type: "single_choice",
    items: ["500 мА", "3 А", "250 мА", "4000 мА"],
    targets: [],
    answer: [0],
    explanation: "Подставьте исходные данные.",
    calculation,
  };
  const parsed = readWorkQuestions([draft], { count: 1, format: "test" });
  assert.deepEqual(parsed[0].answer, [1]);
  assert.equal(
    readWorkQuestions(
      [{ ...draft, items: ["3000 мА", "3 А", "250 мА", "4000 мА"] }],
      { count: 1, format: "test" },
    ),
    null,
  );
});

test("linear solving and polynomial identities use coefficients instead of example substitutions", () => {
  assert.equal(
    evaluate({
      operation: "linear",
      expression: "3*x+7",
      other: "2",
      unknown: "x",
    }).exact,
    "-5/3",
  );
  assert.equal(
    evaluate({ operation: "expand", expression: "(x+2)*(x-3)" }).expanded,
    "x^2-x-6",
  );
  assert.equal(
    evaluate({
      operation: "equivalence",
      expression: "(x+2)*(x-3)",
      other: "x^2-x-6",
    }).equivalent,
    true,
  );
  assert.equal(
    evaluate({
      operation: "equivalence",
      expression: "(x+2)*(x-3)",
      other: "x^2-x-5",
    }).equivalent,
    false,
  );
  assert.equal(
    evaluate({
      operation: "equivalence",
      expression: "(x-1)/(x-1)",
      other: "1",
    }),
    null,
  );
});

test("calculation checks sources and tolerates cancelling conversion factors", () => {
  const density = {
    ...job,
    expression: "m/v*1000/1000",
    values: [
      { name: "m", value: "10", unit: "kg" },
      { name: "v", value: "5", unit: "L" },
    ],
    unit: "g/cm^3",
  };
  const source = "Масса образца 10 кг, объём 5 л. Найди плотность в г/см³.";
  assert.equal(mathInputIssue(density, source), "");
  assert.ok(mathInputIssue({ ...density, expression: "m/v*1000" }, source));
  const mass = { name: "m", value: "1300", unit: "g" };
  const output = { ...job, expression: "m", unit: "kg" };
  assert.ok(
    mathInputIssue(
      { ...output, values: [{ ...mass, value: "1300*(1-20/100)" }] },
      "Израсходовали 1300 г сырья. Какой получился процент потерь?",
    ),
  );
  const reduction = { ...output, expression: "m*(1-20/100)", values: [mass] };
  assert.ok(mathInputIssue(reduction, "Дано 1300 г сырья."));
  assert.equal(mathInputIssue(reduction, "Дано 1300 г сырья. Потеря 20%."), "");
  assert.ok(isCalculationRequest("При напряжении 12 В найди силу тока."));
  assert.ok(isCalculationRequest("4 Ом.", true));
  assert.equal(
    isCalculationRequest("Составь 2 задания. Найди плотность в первом."),
    false,
  );
  assert.ok(
    calculationOption("$\\tfrac{7}{12}$", evaluate({ expression: "1/3+1/4" })),
  );
});

test("long lectures are searched across pages and the earlier chat context is available", () => {
  const selected = retrieveExcerpts(
    { title: "Контрольная лекция", pages: referenceLecture() },
    lectureFacts.map(({ phrase }) => phrase).join("\n"),
    12,
  );
  for (const { page, value } of lectureFacts) {
    assert.ok(
      selected.some(
        (s) => s.locator === "с. " + page && s.excerpt.includes(value),
      ),
      "page " + page,
    );
  }
  const history = historyContext(
    Array.from({ length: 34 }, (_, i) => ({
      role: "user",
      text: "Параметр " + i,
    })),
  );
  assert.equal(history[0].text, "Параметр 0");
  assert.equal(history.at(-1).text, "Параметр 33");
});

test("common Word equations preserve their structure during extraction", async () => {
  const xml =
    '<w:p xmlns:w="urn:w" xmlns:m="urn:m"><w:r><w:t>Текст контрольной лекции по математике. Сложение дробей.</w:t></w:r>' +
    "<m:oMath><m:f><m:num><m:r><m:t>7</m:t></m:r></m:num><m:den><m:r><m:t>12</m:t></m:r></m:den></m:f></m:oMath>" +
    "<m:oMath><m:sSub><m:e><m:r><m:t>H</m:t></m:r></m:e><m:sub><m:r><m:t>2</m:t></m:r></m:sub></m:sSub></m:oMath></w:p>";
  const lecture = await readLectures([
    {
      originalname: "Формулы.docx",
      buffer: zipSync({ "word/document.xml": Buffer.from(xml) }),
    },
  ]);
  assert.ok(lecture[0].pages[0].text.includes("\\(\\frac{7}{12}\\)"));
  assert.ok(lecture[0].pages[0].text.includes("\\({H}_{2}\\)"));
});
