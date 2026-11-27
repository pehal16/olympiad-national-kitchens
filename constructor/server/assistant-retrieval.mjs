import { clips } from "./assistant-documents.mjs";

const stop = new Set([
  "укажи",
  "покажи",
  "найди",
  "какие",
  "какой",
  "какая",
  "лекции",
  "лекцию",
  "дай",
  "назови",
  "равен",
  "равно",
  "поиск",
  "исходный",
  "приведи",
  "сделай",
  "контрольный",
  "контрольного",
  "контрольная",
  "задание",
  "данные",
  "раздел",
]);

function words(text) {
  const source = text.normalize("NFKC").toLowerCase().replaceAll("ё", "е");
  return new Set(
    (source.match(/[\p{L}\p{N}]{3,}/gu) || [])
      .filter((word) => !stop.has(word))
      .map((word) =>
        word.length >= 6
          ? word.slice(0, -2)
          : word.length >= 5
            ? word.slice(0, -1)
            : word,
      ),
  );
}

export function retrieveExcerpts(document, request, limit = 6) {
  const passages = document.pages.flatMap((page, pageIndex) =>
    clips(page.text).map((excerpt, index) => ({
      excerpt,
      locator: page.locator || "фрагмент " + (index + 1),
      pageIndex,
      words: words(excerpt),
    })),
  );
  const queries = request
    .split(/[\n;?!]+/u)
    .map(words)
    .filter((keys) => keys.size)
    .slice(0, 12);
  if (!passages.length) return [];
  const frequencies = new Map();
  for (const passage of passages) {
    for (const word of passage.words)
      frequencies.set(word, (frequencies.get(word) || 0) + 1);
  }
  const weighted = (keys, passage) => {
    let score = 0;
    for (const key of keys) {
      if (passage.words.has(key))
        score += Math.log1p(passages.length / frequencies.get(key));
    }
    return score;
  };
  const selected = new Set();
  const select = (choices, spreads = false) => {
    const usedPages = new Set([...selected].map((entry) => entry.pageIndex));
    let winner,
      score = 0;
    for (const passage of passages) {
      if (selected.has(passage)) continue;
      const weight =
        weighted(choices, passage) *
        (spreads && usedPages.has(passage.pageIndex) ? 0.65 : 1);
      if (weight > score) {
        score = weight;
        winner = passage;
      }
    }
    if (winner) selected.add(winner);
    return winner;
  };
  for (const keys of queries) {
    if (selected.size >= limit) break;
    select(keys);
  }
  const combined = new Set(queries.flatMap((keys) => [...keys]));
  while (selected.size < limit && select(combined, true)) {}
  if (selected.size < Math.min(3, limit)) {
    for (const fraction of [0, 0.5, 1]) {
      if (selected.size >= limit) break;
      selected.add(passages[Math.round((passages.length - 1) * fraction)]);
    }
  }
  return [...selected].map(({ excerpt, locator }) => ({
    excerpt,
    locator,
    title: document.title,
    kind: "lecture",
  }));
}

export function historyContext(messages) {
  return messages.slice(-40).map(({ role, text }, i, all) => {
    const limit = i >= all.length - 12 ? 1350 : 340;
    const tail = Math.floor(limit / 4);
    return {
      role,
      text:
        text.length <= limit
          ? text
          : text.slice(0, limit - tail - 2) + " … " + text.slice(-tail),
    };
  });
}
