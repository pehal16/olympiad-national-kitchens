"use strict";

const olympiad = require("../data/olympiad");
const { buildVariant } = require("../src/variant");

const argument = process.argv.find((item) => item.startsWith("--iterations="));
const iterations = Math.max(1, Number(argument?.split("=")[1] || 10000) || 10000);
const counts = new Map();
const signatures = new Set();
let scoreMismatchCount = 0;

for (let index = 0; index < iterations; index += 1) {
  const variant = buildVariant(olympiad, { seed: `audit-${index}` });
  const signature = variant.questions.map((question) => question.sourceId).join("|");
  signatures.add(signature);
  variant.issuedQuestionIds.forEach((questionId) => {
    counts.set(questionId, (counts.get(questionId) || 0) + 1);
  });
  const maxScore = variant.questions.reduce(
    (sum, question) => sum + Number(question.maxScore || 0),
    0
  );
  if (maxScore !== olympiad.scoring.totalMaxScore) scoreMismatchCount += 1;
}

const sourceIds = [];
for (const pool of olympiad.questionBank.tour1Pools || []) {
  for (const question of pool.questions || []) sourceIds.push(question.id);
}
for (const key of ["tour2Blocks", "tour3Matrices", "tour4Tasks"]) {
  for (const question of olympiad.questionBank[key] || []) sourceIds.push(question.id);
}
for (const cluster of olympiad.questionBank.tour5Cases || []) {
  for (const question of cluster.questions || []) {
    sourceIds.push(`${cluster.id}-q${cluster.questions.indexOf(question) + 1}`);
  }
}

const exposure = [...new Set(sourceIds)]
  .map((id) => ({
    id,
    count: counts.get(id) || 0,
    percent: Math.round((((counts.get(id) || 0) / iterations) * 100) * 10) / 10
  }))
  .sort((left, right) => left.percent - right.percent || left.id.localeCompare(right.id));

console.log(JSON.stringify({
  iterations,
  uniqueVariantSignatures: signatures.size,
  scoreMismatchCount,
  neverIssued: exposure.filter((item) => item.count === 0),
  alwaysIssued: exposure.filter((item) => item.count === iterations),
  lowestExposure: exposure.slice(0, 12),
  highestExposure: exposure.slice(-12).reverse()
}, null, 2));
