import { fail } from "./util.mjs";
export function validateCompleteAnswer(q, a) {
  if (!q.required || q.type === "instruction") return;
  const message = `Выполните обязательное задание «${q.title}».`,
    c = q.config || {};
  fail(
    a !== undefined &&
      a !== null &&
      a !== "" &&
      (!Array.isArray(a) || a.length > 0),
    message,
    422,
  );
  if (q.type === "single_choice")
    fail(
      c.options.some((x) => x.id === a),
      message,
      422,
    );
  if (q.type === "multiple_choice")
    fail(
      Array.isArray(a) &&
        a.length &&
        a.every((x) => c.options.some((o) => o.id === x)) &&
        new Set(a).size === a.length,
      message,
      422,
    );
  if (q.type === "calculation")
    fail(
      a &&
        typeof a === "object" &&
        String(a.value ?? "").trim() !== "" &&
        Number.isFinite(Number(String(a.value).replace(",", "."))),
      message,
      422,
    );
  if (q.type === "matching" || q.type === "classification")
    fail(
      c.items.every((i) => c.targets.some((t) => t.id === a[i.id])),
      message,
      422,
    );
  if (q.type === "ordering")
    fail(
      Array.isArray(a) &&
        a.length === c.items.length &&
        new Set(a).size === a.length &&
        a.every((x) => c.items.some((i) => i.id === x)),
      message,
      422,
    );
  if (q.type === "table")
    fail(
      c.rows.every((r) =>
        c.columns.every(
          (col) => String(a[`${r.id}:${col.id}`] ?? "").trim() !== "",
        ),
      ),
      message,
      422,
    );
  if (q.type === "crossword")
    fail(
      c.clues.every(
        (x) =>
          String(a[x.id] || "").trim().length ===
          String(q.key.words[x.id]).length,
      ),
      message,
      422,
    );
  if (q.type === "dish_assembly" || q.type === "restaurant_kitchen") {
    fail(
      Array.isArray(a.selectedIds) &&
        a.selectedIds.length > 0 &&
        new Set(a.selectedIds).size === a.selectedIds.length &&
        a.selectedIds.every((x) => c.items.some((i) => i.id === x)),
      message,
      422,
    );
    if (c.selectCount)
      fail(
        a.selectedIds.length === Number(c.selectCount),
        `В задании «${q.title}» выберите ${c.selectCount} компонентов.`,
        422,
      );
    if (q.type === "restaurant_kitchen")
      fail(a.served === true, "Завершите сборку и нажмите «Подать».", 422);
    if (c.slots?.length)
      fail(
        a.selectedIds.every((x) =>
          c.slots.some((s) => s.id === a.placements?.[x]),
        ),
        "Укажите размещение каждого выбранного компонента.",
        422,
      );
  }
  if (q.type === "safety_checklist")
    fail(
      c.items.every((x) => typeof a[x.id] === "boolean"),
      message,
      422,
    );
  if (q.type === "file_evidence")
    fail(
      Array.isArray(a) && a.length > 0 && a.length <= Number(c.maxFiles || 3),
      message,
      422,
    );
  if (q.type === "scheme_builder")
    fail(
      a.nodes?.length >= Number(c.minNodes || 1) &&
        a.nodes.every((x) => String(x.label || "").trim()),
      message,
      422,
    );
  if (q.type === "ttk_builder")
    fail(
      c.fields.every((x) => String(a[x] || "").trim()),
      message,
      422,
    );
  if (q.type === "observation_log")
    fail(
      a.rows?.length >= Number(c.minRows || 1) &&
        a.rows.every((r) => c.fields.every((x) => String(r[x] || "").trim())),
      message,
      422,
    );
}
export function validateTemplate(t) {
  fail(
    t &&
      Number.isFinite(Number(t.width)) &&
      Number.isFinite(Number(t.height)) &&
      t.width >= 50 &&
      t.height >= 50 &&
      t.width <= 600 &&
      t.height <= 600,
    "Размер листа: от 50 до 600 мм.",
  );
  fail(
    Array.isArray(t.elements) && t.elements.length <= 300,
    "В макете допускается до 300 элементов.",
  );
  const ids = new Set();
  for (const e of t.elements) {
    fail(!ids.has(e.id), "Идентификаторы элементов повторяются.");
    ids.add(e.id);
    fail(
      ["text", "field", "image", "line", "rect", "qr"].includes(e.type),
      "Неизвестный элемент.",
    );
    for (const key of ["x", "y", "width", "height"])
      fail(
        Number.isFinite(Number(e[key])),
        `Некорректный размер элемента «${e.text || e.type}».`,
      );
    fail(
      e.width > 0 && e.height > 0,
      "Размер элемента должен быть положительным.",
    );
    if (!e.hidden)
      fail(
        e.x >= 0 &&
          e.y >= 0 &&
          e.x + e.width <= t.width + 0.2 &&
          e.y + e.height <= t.height + 0.2,
        `Элемент «${e.text || e.type}» выходит за границы листа.`,
      );
  }
}
export function scheduledTime(value) {
  if (!value) return NaN;
  return Date.parse(
    /(Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : value + "+03:00",
  );
}
export function validateRunSettings(s) {
  fail(["codes", "open"].includes(s.entryMode), "Выберите способ входа.");
  fail(
    ["draft", "open", "closed"].includes(s.status),
    "Неизвестное состояние проведения.",
  );
  fail(
    ["first", "last", "best"].includes(s.attemptSelection),
    "Выберите учитываемую попытку.",
  );
  fail(
    ["organizer", "immediate"].includes(s.disclosure),
    "Выберите момент раскрытия результатов.",
  );
  fail(
    Number.isInteger(Number(s.maxAttempts)) &&
      s.maxAttempts >= 1 &&
      s.maxAttempts <= 20,
    "Число попыток: от 1 до 20.",
  );
  fail(
    Number.isFinite(Number(s.seconds)) && s.seconds >= 0,
    "Время должно быть неотрицательным.",
  );
  for (const key of ["availableFrom", "availableUntil"])
    if (s[key])
      fail(Number.isFinite(scheduledTime(s[key])), "Проверьте дату и время.");
  if (s.availableFrom && s.availableUntil)
    fail(
      scheduledTime(s.availableUntil) > scheduledTime(s.availableFrom),
      "Закрытие входа должно быть позже открытия.",
    );
}
