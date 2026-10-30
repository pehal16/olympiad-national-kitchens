import legacySerializer from "../../src/learning/serializers.js";
import legacyGrade from "../../src/learning/grading.js";
import { TYPES, MANUAL } from "../shared/catalog.js";
import { fail, hash, clone, id, durationDeadline } from "./util.mjs";
const { canonicalText, roundScore } = legacyGrade;
const listIds = (v) => (Array.isArray(v) ? v : []).map(String);
const same = (a, b) => canonicalText(a) === canonicalText(b);
export function validateProject(p) {
  const errors = [];
  const add = (msg) => errors.push(msg);
  if (!p.title?.trim()) add("Укажите название.");
  if (!Array.isArray(p.rounds) || !p.rounds.length)
    add("Добавьте хотя бы один тур.");
  const ids = new Set();
  for (const [ri, r] of (p.rounds || []).entries()) {
    if (!r.title?.trim()) add(`Тур ${ri + 1}: укажите название.`);
    if (!r.questions?.length) add(`${r.title}: добавьте задания.`);
    if (Number(r.seconds) < 0)
      add(`${r.title}: время не может быть отрицательным.`);
    if (!["automatic", "threshold", "manual"].includes(r.transition))
      add(`${r.title}: неизвестное правило перехода.`);
    if (r.selectCount > 0 && r.selectCount > r.questions.length)
      add(`${r.title}: недостаточно вопросов для варианта.`);
    if (
      r.selectCount > 0 &&
      new Set(r.questions.map((q) => Number(q.maxScore))).size > 1
    )
      add(
        `${r.title}: для случайного выбора задайте одинаковый максимум всем вопросам набора.`,
      );
    for (const [qi, q] of (r.questions || []).entries()) {
      const prefix = `${r.title}, задание ${qi + 1}`;
      if (ids.has(q.id)) add(`${prefix}: повторяется идентификатор.`);
      ids.add(q.id);
      if (!TYPES[q.type]) add(`${prefix}: неизвестный тип.`);
      if (!q.title?.trim()) add(`${prefix}: нужен заголовок.`);
      if (!Number.isFinite(Number(q.maxScore)) || q.maxScore < 0)
        add(`${prefix}: неверный балл.`);
      if (q.type !== "instruction" && !(q.maxScore > 0))
        add(`${prefix}: задайте положительный балл.`);
      const c = q.config || {},
        k = q.key || {};
      if (q.grading === "manual" || MANUAL.includes(q.type)) {
        if (
          !q.rubric?.length ||
          Math.abs(
            q.rubric.reduce((s, x) => s + Number(x.maxScore || 0), 0) -
              Number(q.maxScore),
          ) > 0.0001
        )
          add(`${prefix}: сумма критериев должна равняться максимуму.`);
        continue;
      }
      if (["single_choice", "multiple_choice"].includes(q.type)) {
        if (
          c.options?.length < 2 ||
          new Set((c.options || []).map((x) => x.id)).size !== c.options?.length
        )
          add(`${prefix}: нужны разные варианты ответа.`);
        const expected =
          q.type === "single_choice" ? [k.optionId] : listIds(k.optionIds);
        if (
          !expected.length ||
          expected.some((x) => !c.options?.some((o) => o.id === x))
        )
          add(`${prefix}: проверьте ключ ответа.`);
      }
      if (
        q.type === "short_text" &&
        !k.acceptedAnswers?.some((x) => String(x).trim())
      )
        add(`${prefix}: укажите допустимые ответы.`);
      if (
        q.type === "calculation" &&
        (!Number.isFinite(Number(k.value)) ||
          k.value === "" ||
          k.value == null ||
          Number(k.tolerance) < 0)
      )
        add(`${prefix}: проверьте числовой эталон и погрешность.`);
      if (
        ["matching", "classification"].includes(q.type) &&
        (!c.items?.length ||
          !c.targets?.length ||
          c.items.some(
            (i) => !c.targets.some((t) => t.id === k.mapping?.[i.id]),
          ))
      )
        add(`${prefix}: настройте соответствия для всех элементов.`);
      if (
        q.type === "ordering" &&
        (!c.items?.length ||
          new Set(k.order).size !== c.items.length ||
          c.items.some((i) => !k.order?.includes(i.id)))
      )
        add(`${prefix}: задайте правильную последовательность.`);
      if (
        q.type === "table" &&
        (!c.rows?.length ||
          !c.columns?.length ||
          c.rows.some((r) =>
            c.columns.some(
              (col) => k.cells?.[`${r.id}:${col.id}`] === undefined,
            ),
          ))
      )
        add(`${prefix}: заполните эталоны ячеек.`);
      if (
        q.type === "crossword" &&
        (!c.clues?.length ||
          c.clues.some((x) => !String(k.words?.[x.id] || "").trim()))
      )
        add(`${prefix}: заполните слова кроссворда.`);
      if (
        q.type === "hotspot" &&
        (!c.image ||
          !c.zones?.length ||
          !k.zoneIds?.length ||
          k.zoneIds.some((x) => !c.zones.some((z) => z.id === x)))
      )
        add(`${prefix}: загрузите изображение и отметьте правильные области.`);
      if (
        ["dish_assembly", "restaurant_kitchen"].includes(q.type) &&
        (!c.items?.length ||
          !k.selectedIds?.length ||
          k.selectedIds.some((x) => !c.items.some((i) => i.id === x)))
      )
        add(`${prefix}: настройте компоненты и правильную сборку.`);
      if (
        q.type === "safety_checklist" &&
        (!c.items?.length ||
          c.items.some((x) => typeof k.checks?.[x.id] !== "boolean"))
      )
        add(`${prefix}: задайте эталон каждого пункта.`);
    }
  }
  return errors;
}
export function gradeQuestion(q, answer) {
  const max = Number(q.maxScore) || 0;
  if (q.type === "instruction") return { score: 0, maxScore: 0, manual: false };
  const empty =
    answer == null ||
    answer === "" ||
    (Array.isArray(answer) && !answer.length);
  if (q.grading === "manual" || MANUAL.includes(q.type))
    return { score: empty ? 0 : null, maxScore: max, manual: !empty };
  const k = q.key || {},
    c = q.config || {};
  let f = 0;
  const setGrade = (actual, expected) => {
    const a = new Set(listIds(actual)),
      e = new Set(listIds(expected));
    return e.size
      ? Math.max(
          0,
          ([...a].filter((x) => e.has(x)).length -
            [...a].filter((x) => !e.has(x)).length) /
            e.size,
        )
      : 0;
  };
  const mapGrade = (a, e) => {
    const entries = Object.entries(e || {});
    return entries.length
      ? entries.filter(([key, value]) => same(a?.[key], value)).length /
          entries.length
      : 0;
  };
  if (!empty)
    switch (q.type) {
      case "single_choice":
        f = String(answer) === String(k.optionId) ? 1 : 0;
        break;
      case "multiple_choice":
        f = setGrade(answer, k.optionIds);
        break;
      case "short_text":
        f = k.acceptedAnswers?.some((x) => same(answer, x)) ? 1 : 0;
        break;
      case "calculation": {
        const v = typeof answer === "object" ? answer.value : answer;
        const n = Number(String(v).replace(",", "."));
        const unit = typeof answer === "object" ? answer.unit : "";
        f =
          String(v).trim() !== "" &&
          Number.isFinite(n) &&
          Math.abs(n - Number(k.value)) <= Number(k.tolerance || 0) &&
          (!k.unit || same(unit, k.unit))
            ? 1
            : 0;
        break;
      }
      case "matching":
      case "classification":
        f = mapGrade(answer, k.mapping);
        break;
      case "ordering":
        f =
          (k.order || []).filter((x, i) => answer?.[i] === x).length /
          (k.order?.length || 1);
        break;
      case "table":
        f = mapGrade(answer, k.cells);
        break;
      case "crossword":
        f = mapGrade(answer, k.words);
        break;
      case "hotspot":
        f = setGrade(answer, k.zoneIds);
        break;
      case "dish_assembly":
      case "restaurant_kitchen":
        f = setGrade(answer.selectedIds || answer, k.selectedIds);
        if (k.placements && Object.keys(k.placements).length)
          f = (f + mapGrade(answer.placements, k.placements)) / 2;
        break;
      case "safety_checklist":
        f = mapGrade(answer, k.checks);
        break;
    }
  if (!q.partialCredit) f = f >= 1 ? 1 : 0;
  return {
    score: roundScore(max * Math.max(0, Math.min(1, f))),
    maxScore: max,
    manual: false,
  };
}
export function generateVariant(release, seed) {
  const rng = () => {
    seed = hash(seed);
    return parseInt(seed.slice(0, 8), 16) / 0xffffffff;
  };
  const shuffle = (a) => {
    const result = clone(a);
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  return {
    ...clone(release),
    rounds: release.rounds.map((r) => {
      let qs =
        r.shuffle || r.selectCount > 0
          ? shuffle(r.questions)
          : clone(r.questions);
      if (r.selectCount > 0) qs = qs.slice(0, r.selectCount);
      return {
        ...r,
        questions: qs.map((q) => {
          if (q.shuffle && q.config.options)
            q.config.options = shuffle(q.config.options);
          if (q.config.items && q.type !== "ordering")
            q.config.items = shuffle(q.config.items);
          if (q.type === "ordering") q.config.items = shuffle(q.config.items);
          return q;
        }),
      };
    }),
  };
}
export function summarize(attempt) {
  let total = 0,
    max = 0,
    pending = false;
  const rounds = attempt.variant.rounds.map((r) => {
    let score = 0,
      waiting = false;
    const questions = r.questions.map((q) => {
      max += Number(q.maxScore) || 0;
      const entry = attempt.answers[q.id];
      const outcome = gradeQuestion(q, entry?.answer);
      const review = attempt.reviews?.[q.id];
      const result = review
        ? { ...outcome, score: review.score, manual: false }
        : outcome;
      if (result.score === null) {
        waiting = true;
        pending = true;
      } else {
        score += result.score;
        total += result.score;
      }
      return { id: q.id, title: q.title, ...result };
    });
    return {
      id: r.id,
      title: r.title,
      score: waiting ? null : roundScore(score),
      maxScore: r.questions.reduce((s, q) => s + Number(q.maxScore), 0),
      pending: waiting,
      questions,
    };
  });
  return {
    score: pending ? null : roundScore(total),
    autoScore: roundScore(total),
    maxScore: max,
    pending,
    rounds,
  };
}
export function sanitizedQuestion(q) {
  const result = clone(q);
  if (q.type === "crossword")
    result.config.clues = (result.config.clues || []).map((c) => ({
      ...c,
      length: String(q.key.words[c.id]).length,
    }));
  delete result.key;
  delete result.source;
  delete result.explanation;
  delete result.pool;
  delete result.internal;
  if (result.config?.photo) delete result.config.photo.marking;
  if (result.type === "restaurant_kitchen")
    result.config.items = result.config.items.map((x) => ({
      ...x,
      photoPart: x.visual?.token || x.photoPart,
    }));
  return legacySerializer.sanitizeForStudent(result);
}
export function attemptView(a, disclosure = "organizer", published = false) {
  const result = {
    id: a.id,
    runId: a.runId,
    participant: a.participant,
    status: a.status,
    excludedFromResults: a.excludedFromResults,
    exclusionReason: a.exclusionReason,
    startedAt: a.startedAt,
    finishedAt: a.finishedAt,
    currentRound: a.currentRound,
    currentQuestion: a.currentQuestion,
    roundStartedAt: a.roundStartedAt,
    questionStartedAt: a.questionStartedAt,
    pausedAt: a.pausedAt,
    pauseMs: a.pauseMs,
    roundPauseMs: a.roundPauseMs,
    questionPauseMs: a.questionPauseMs,
    revision: a.revision,
    decisions: a.decisions || {},
    answers: a.answers,
    deadlines: deadlines(a),
    title: a.variant.title,
    legend: a.variant.legend,
    narrator: a.variant.narrator,
    theme: a.variant.theme,
    finalText: a.variant.finalText,
    rounds: a.variant.rounds.map((r) => ({
      ...r,
      questions: r.questions.map(sanitizedQuestion),
    })),
    settings: a.settings,
  };
  if (a.status === "completed" && (disclosure === "immediate" || published))
    result.summary = summarize(a);
  result.serverTime = Date.now();
  if (result.summary && a.settings.showSolutions)
    result.solutions = Object.fromEntries(
      a.variant.rounds.flatMap((r) =>
        r.questions.map((q) => [
          q.id,
          { explanation: q.explanation, key: q.key },
        ]),
      ),
    );
  return result;
}
export function deadlines(a) {
  const r = a.variant.rounds[a.currentRound],
    q = r?.questions[a.currentQuestion];
  return {
    attempt: finiteDeadline(
      durationDeadline(a.startedAt, a.settings.seconds) + (a.pauseMs || 0),
    ),
    round: finiteDeadline(
      durationDeadline(a.roundStartedAt, r?.seconds) + (a.roundPauseMs || 0),
    ),
    question: finiteDeadline(
      durationDeadline(a.questionStartedAt, q?.seconds) +
        (a.questionPauseMs || 0),
    ),
    paused: Boolean(a.pausedAt),
  };
}
function finiteDeadline(v) {
  return Number.isFinite(v) ? v : null;
}
export function remainingDeadline(a) {
  const ds = deadlines(a);
  return Math.min(
    ...[ds.attempt, ds.round, ds.question].filter((x) => x !== null),
    Infinity,
  );
}
export function rankAttempts(
  attempts,
  selection = "first",
  tieBreak = "shared",
) {
  const groups = new Map();
  for (const a of attempts.filter(
    (x) => x.status === "completed" && !x.trial && !x.excludedFromResults,
  )) {
    const list = groups.get(a.participantId) || [];
    list.push(a);
    groups.set(a.participantId, list);
  }
  const selected = [...groups.values()].map((list) => {
    list.sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
    if (selection === "last") return list.at(-1);
    if (selection === "best")
      return list.reduce((a, b) =>
        (summarize(b).score ?? -1) > (summarize(a).score ?? -1) ? b : a,
      );
    return list[0];
  });
  selected.sort(
    (a, b) =>
      (summarize(b).score ?? -1) - (summarize(a).score ?? -1) ||
      (tieBreak === "time"
        ? Date.parse(a.finishedAt) -
          Date.parse(a.startedAt) -
          (Date.parse(b.finishedAt) - Date.parse(b.startedAt))
        : 0),
  );
  let previous = null,
    place = 0;
  return selected.map((a, i) => {
    const s = summarize(a);
    const rankKey =
      String(s.score) +
      (tieBreak === "time"
        ? ":" + (Date.parse(a.finishedAt) - Date.parse(a.startedAt))
        : "");
    if (rankKey !== previous) place = i + 1;
    previous = rankKey;
    return { ...a, summary: s, place: s.pending ? null : place };
  });
}
