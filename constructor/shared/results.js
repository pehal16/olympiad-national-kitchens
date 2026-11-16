export function learningSummary(rows) {
  const complete = rows.filter(
    (a) =>
      a.status === "completed" &&
      !a.trial &&
      !a.excludedFromResults &&
      !a.summary.pending,
  );
  const rounds = new Map(),
    questions = new Map();
  const hasAnswer = (value) => {
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.some(hasAnswer);
    if (typeof value === "object") {
      if ("selectedIds" in value) return hasAnswer(value.selectedIds);
      if ("value" in value) return hasAnswer(value.value);
      return Object.values(value).some(hasAnswer);
    }
    return (
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))
    );
  };
  for (const a of complete)
    for (const r of a.summary.rounds) {
      if (r.maxScore > 0) {
        const row = rounds.get(r.id) || {
          id: r.id,
          title: r.title,
          total: 0,
          n: 0,
        };
        row.total += (100 * r.score) / r.maxScore;
        row.n++;
        rounds.set(r.id, row);
      }
      for (const q of r.questions)
        if (q.maxScore > 0) {
          const row = questions.get(q.id) || {
            id: q.id,
            title: q.title,
            total: 0,
            n: 0,
            belowMaximum: 0,
            blank: 0,
          };
          row.total += (100 * q.score) / q.maxScore;
          row.n++;
          const answered = hasAnswer(a.answers?.[q.id]?.answer);
          if (!answered) row.blank++;
          else if (q.score < q.maxScore) row.belowMaximum++;
          questions.set(q.id, row);
        }
    }
  return {
    n: complete.length,
    timedOutAttempts: complete.filter((a) => a.timedOut).length,
    rounds: [...rounds.values()].map((x) => ({ ...x, percent: x.total / x.n })),
    questions: [...questions.values()]
      .map((x) => ({ ...x, percent: x.total / x.n }))
      .sort((a, b) => a.percent - b.percent),
  };
}
