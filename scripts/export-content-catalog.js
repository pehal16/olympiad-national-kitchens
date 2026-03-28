const fs = require("fs");
const path = require("path");

const olympiad = require("../data/olympiad");
const { buildQuestionCatalog, buildQuestionBankSummary } = require("../src/question-bank");

const exportsDir = path.join(__dirname, "..", "exports");
fs.mkdirSync(exportsDir, { recursive: true });

const stamp = new Date().toISOString().slice(0, 10);
const filePath = path.join(exportsDir, `content-catalog-${stamp}.json`);

const payload = {
  generatedAt: new Date().toISOString(),
  summary: buildQuestionBankSummary(olympiad),
  questions: buildQuestionCatalog(olympiad)
};

fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");

console.log(filePath);
