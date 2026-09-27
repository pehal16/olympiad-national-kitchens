// Server-only answer matching. Never bundle this module into participant assets.
function normalizeDetectiveAnswer(value) {
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[«»„“”"'‘’]/g, "")
    .replace(/[-‐‑‒–—―]/g, " ")
    .replace(/^[\s.,!?;:…]+|[\s.,!?;:…]+$/g, "")
    .replace(/\s+/g, " ").trim();
}

// Optimal string alignment: insertion, deletion, substitution, adjacent swap.
function editDistance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) rows[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

function sameAlphabet(a, b) {
  return (/^[а-я]+$/.test(a) && /^[а-я]+$/.test(b)) ||
    (/^[a-z]+$/.test(a) && /^[a-z]+$/.test(b));
}

function fuzzyMatches(received, expected) {
  const input = received.split(" ");
  const reference = expected.split(" ");
  if (input.length !== reference.length) return false;
  let total = 0;
  for (let index = 0; index < reference.length; index += 1) {
    const token = reference[index];
    if (input[index] === token) continue;
    // Very short fragments and mixed-script homoglyphs are not dish names.
    if (input[index].length < 4 || !sameAlphabet(input[index], token)) return false;
    const limit = token.length <= 6 ? 1 : 2;
    const distance = editDistance(input[index], token);
    if (distance > limit) return false;
    total += distance;
  }
  return total <= (reference.join("").length <= 6 ? 1 : 2);
}

function matchDetectiveAnswer(policy, value) {
  if (!policy) return false;
  const answer = normalizeDetectiveAnswer(value);
  if (!answer || answer.length > 120 || !/^[а-яa-z]+(?: [а-яa-z]+)*$/.test(answer)) return false;
  const normalizeList = (list) => (list || []).map(normalizeDetectiveAnswer);
  if (normalizeList(policy.rejected).includes(answer)) return false;
  const anchors = [policy.canonical, ...(policy.aliases || []), ...(policy.english || [])];
  if (normalizeList(anchors).includes(answer)) return true;
  if (normalizeList(policy.misspellings).includes(answer)) return true;
  // Known misspellings are exact exceptions, never new fuzzy anchors.
  return anchors.some((anchor) => fuzzyMatches(answer, normalizeDetectiveAnswer(anchor)));
}

module.exports = { normalizeDetectiveAnswer, editDistance, matchDetectiveAnswer };
