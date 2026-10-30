import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import type { Question, Json } from "../shared/types";
import { TYPES, MANUAL, question, uid } from "../shared/catalog";
import { upload } from "./api";
import {
  Button,
  Field,
  Input,
  Textarea,
  Select,
  Toggle,
  IconButton,
  ItemRows,
  MediaPicker,
} from "./ui";
export function QuestionEditor({
  q,
  onChange,
  cases = [],
}: {
  q: Question;
  onChange: (q: Question) => void;
  cases?: Json[];
}) {
  const c = q.config || {},
    k = q.key || {};
  const change = (key: string, value: any) => onChange({ ...q, [key]: value }),
    config = (key: string, value: any) =>
      change("config", { ...c, [key]: value }),
    key = (key: string, value: any) => change("key", { ...k, [key]: value });
  const options = c.options || [],
    items = c.items || [];
  return (
    <section className="question-editor">
      <div className="editor-title">
        <Input
          label="Заголовок задания"
          value={q.title}
          onChange={(x: string) => change("title", x)}
        />
        <Select
          label="Тип задания"
          value={q.type}
          options={Object.entries(TYPES)}
          onChange={(type: string) =>
            onChange({
              ...question(type),
              id: q.id,
              title: q.title,
              prompt: q.prompt,
            })
          }
        />
      </div>
      {cases.length > 0 && (
        <Select
          label="Кейс"
          value={q.caseId || ""}
          options={[
            ["", "Отдельное задание"],
            ...cases.map((x) => [x.id, x.title]),
          ]}
          onChange={(x: string) => change("caseId", x)}
        />
      )}
      <Textarea
        label="Текст задания"
        value={q.prompt}
        onChange={(x: string) => change("prompt", x)}
        rows={3}
      />
      {["single_choice", "multiple_choice"].includes(q.type) && (
        <section>
          <h3>Варианты ответов</h3>
          {options.map((o: Json, i: number) => (
            <div className="option-editor" key={o.id}>
              <input
                type={q.type === "single_choice" ? "radio" : "checkbox"}
                name={"correct-" + q.id}
                aria-label={`Правильный ответ: ${i + 1}`}
                checked={
                  q.type === "single_choice"
                    ? k.optionId === o.id
                    : k.optionIds?.includes(o.id) || false
                }
                onChange={() =>
                  key(
                    q.type === "single_choice" ? "optionId" : "optionIds",
                    q.type === "single_choice"
                      ? o.id
                      : k.optionIds?.includes(o.id)
                        ? k.optionIds.filter((x: string) => x !== o.id)
                        : [...(k.optionIds || []), o.id],
                  )
                }
              />
              <input
                aria-label={`Вариант ${i + 1}`}
                value={o.label || ""}
                onChange={(e) =>
                  config(
                    "options",
                    options.map((x: Json) =>
                      x.id === o.id ? { ...x, label: e.target.value } : x,
                    ),
                  )
                }
              />
              <label className="button small file-button">
                {o.imageUrl ? "Заменить фото" : "Добавить фото"}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const m = await upload(f);
                      config(
                        "options",
                        options.map((x: Json) =>
                          x.id === o.id ? { ...x, imageUrl: m.url } : x,
                        ),
                      );
                    }
                  }}
                />
              </label>
              <IconButton
                title="Удалить вариант"
                onClick={() =>
                  config(
                    "options",
                    options.filter((x: Json) => x.id !== o.id),
                  )
                }
              >
                <Trash2 size={16} />
              </IconButton>
              {o.imageUrl && (
                <img
                  className="option-thumbnail"
                  src={o.imageUrl}
                  alt={o.label}
                />
              )}
            </div>
          ))}
          <Button
            onClick={() =>
              config("options", [...options, { id: uid("option"), label: "" }])
            }
          >
            <Plus size={16} />
            Добавить вариант
          </Button>
          <p className="muted">
            Отметьте правильные варианты слева. Ключ виден только преподавателю.
          </p>
        </section>
      )}
      {q.type === "short_text" && (
        <Textarea
          label="Допустимые ответы: каждый с новой строки"
          value={(k.acceptedAnswers || []).join("\n")}
          onChange={(x: string) => key("acceptedAnswers", x.split("\n"))}
        />
      )}
      {q.type === "calculation" && (
        <>
          <div className="three">
            <Input
              label="Правильное значение"
              value={k.value ?? ""}
              onChange={(x: string) => key("value", x)}
              inputMode="decimal"
            />
            <Input
              label="Погрешность ±"
              type="number"
              min="0"
              step="any"
              value={k.tolerance || 0}
              onChange={(x: number) => key("tolerance", x)}
            />
            <Input
              label="Единица измерения"
              value={k.unit || ""}
              onChange={(x: string) => {
                onChange({
                  ...q,
                  key: { ...k, unit: x },
                  config: { ...c, unit: x },
                });
              }}
            />
          </div>
          <Input
            label="Формула или справочная подсказка участнику"
            value={c.formula || ""}
            onChange={(x: string) => config("formula", x)}
          />
        </>
      )}
      {["matching", "classification"].includes(q.type) && (
        <>
          <ItemRows
            label="Области назначения"
            items={c.targets || []}
            onChange={(x: Json[]) => config("targets", x)}
          />
          <ItemRows
            label="Карточки"
            items={items}
            onChange={(x: Json[]) => config("items", x)}
            renderExtra={(item: Json) => (
              <select
                aria-label={"Правильная область: " + item.label}
                value={k.mapping?.[item.id] || ""}
                onChange={(e) =>
                  key("mapping", { ...k.mapping, [item.id]: e.target.value })
                }
              >
                <option value="">Эталон</option>
                {(c.targets || []).map((x: Json) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
            )}
          />
        </>
      )}
      {q.type === "ordering" && (
        <section>
          <h3>Правильная последовательность</h3>
          {items.map((item: Json, i: number) => (
            <div className="item-row" key={item.id}>
              <span>{i + 1}</span>
              <input
                aria-label={`Шаг ${i + 1}`}
                value={item.label}
                onChange={(e) =>
                  config(
                    "items",
                    items.map((x: Json) =>
                      x.id === item.id ? { ...x, label: e.target.value } : x,
                    ),
                  )
                }
              />
              {[-1, 1].map((direction) => (
                <IconButton
                  key={direction}
                  title={direction < 0 ? "Выше" : "Ниже"}
                  disabled={i + direction < 0 || i + direction >= items.length}
                  onClick={() => {
                    const next = [...items];
                    [next[i], next[i + direction]] = [
                      next[i + direction],
                      next[i],
                    ];
                    onChange({
                      ...q,
                      config: { ...c, items: next },
                      key: { order: next.map((x) => x.id) },
                    });
                  }}
                >
                  {direction < 0 ? (
                    <ArrowUp size={15} />
                  ) : (
                    <ArrowDown size={15} />
                  )}
                </IconButton>
              ))}
              <IconButton
                title="Удалить шаг"
                onClick={() => {
                  const next = items.filter((x: Json) => x.id !== item.id);
                  onChange({
                    ...q,
                    config: { ...c, items: next },
                    key: { order: next.map((x: Json) => x.id) },
                  });
                }}
              >
                <Trash2 size={15} />
              </IconButton>
            </div>
          ))}
          <Button
            onClick={() => {
              const next = [...items, { id: uid("step"), label: "" }];
              onChange({
                ...q,
                config: { ...c, items: next },
                key: { order: next.map((x) => x.id) },
              });
            }}
          >
            <Plus size={15} />
            Добавить шаг
          </Button>
        </section>
      )}
      {q.type === "table" && (
        <>
          <div className="two">
            <ItemRows
              label="Строки"
              items={c.rows || []}
              onChange={(x: Json[]) => config("rows", x)}
            />
            <ItemRows
              label="Столбцы"
              items={c.columns || []}
              onChange={(x: Json[]) => config("columns", x)}
            />
          </div>
          <h3>Эталон таблицы</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th></th>
                  {c.columns.map((x: Json) => (
                    <th key={x.id}>{x.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.rows.map((r: Json) => (
                  <tr key={r.id}>
                    <th>{r.label}</th>
                    {c.columns.map((col: Json) => (
                      <td key={col.id}>
                        <input
                          aria-label={`Эталон: ${r.label}, ${col.label}`}
                          value={k.cells?.[`${r.id}:${col.id}`] ?? ""}
                          onChange={(e) =>
                            key("cells", {
                              ...k.cells,
                              [`${r.id}:${col.id}`]: e.target.value,
                            })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {q.type === "crossword" && (
        <section>
          <h3>Слова и размещение</h3>
          {(c.clues || []).map((clue: Json, i: number) => (
            <div className="crossword-editor" key={clue.id}>
              <Input
                label={`Подсказка ${i + 1}`}
                value={clue.label}
                onChange={(x: string) =>
                  config(
                    "clues",
                    c.clues.map((a: Json) =>
                      a.id === clue.id ? { ...a, label: x } : a,
                    ),
                  )
                }
              />
              <Input
                label="Слово"
                value={k.words?.[clue.id] || ""}
                onChange={(x: string) =>
                  onChange({
                    ...q,
                    key: { ...k, words: { ...k.words, [clue.id]: x } },
                    config: {
                      ...c,
                      clues: c.clues.map((a: Json) =>
                        a.id === clue.id ? { ...a, length: x.length } : a,
                      ),
                    },
                  })
                }
              />
              <div className="three">
                <Input
                  label="Строка (с 0)"
                  type="number"
                  min="0"
                  max="39"
                  value={clue.row || 0}
                  onChange={(x: number) =>
                    config(
                      "clues",
                      c.clues.map((a: Json) =>
                        a.id === clue.id ? { ...a, row: x } : a,
                      ),
                    )
                  }
                />
                <Input
                  label="Столбец (с 0)"
                  type="number"
                  min="0"
                  max="39"
                  value={clue.col || 0}
                  onChange={(x: number) =>
                    config(
                      "clues",
                      c.clues.map((a: Json) =>
                        a.id === clue.id ? { ...a, col: x } : a,
                      ),
                    )
                  }
                />
                <Select
                  label="Направление"
                  value={clue.direction}
                  options={[
                    ["across", "Горизонтально"],
                    ["down", "Вертикально"],
                  ]}
                  onChange={(x: string) =>
                    config(
                      "clues",
                      c.clues.map((a: Json) =>
                        a.id === clue.id ? { ...a, direction: x } : a,
                      ),
                    )
                  }
                />
              </div>
              <Button
                onClick={() =>
                  config(
                    "clues",
                    c.clues.filter((a: Json) => a.id !== clue.id),
                  )
                }
              >
                Удалить слово
              </Button>
            </div>
          ))}
          <Button
            onClick={() =>
              config("clues", [
                ...c.clues,
                {
                  id: uid("word"),
                  label: "",
                  row: 0,
                  col: 0,
                  direction: "across",
                  length: 1,
                },
              ])
            }
          >
            <Plus size={16} />
            Добавить слово
          </Button>
        </section>
      )}
      {q.type === "hotspot" && <HotspotDesigner q={q} onChange={onChange} />}
      {["dish_assembly", "restaurant_kitchen"].includes(q.type) && (
        <>
          <Input
            label="Сколько компонентов нужно выбрать"
            type="number"
            min="1"
            value={c.selectCount || 1}
            onChange={(x: number) => config("selectCount", x)}
          />
          <ItemRows
            label="Компоненты"
            items={items}
            onChange={(x: Json[]) => config("items", x)}
            renderExtra={(item: Json) => (
              <input
                aria-label={"Верный компонент: " + item.label}
                type="checkbox"
                checked={k.selectedIds?.includes(item.id) || false}
                onChange={() =>
                  key(
                    "selectedIds",
                    k.selectedIds?.includes(item.id)
                      ? k.selectedIds.filter((x: string) => x !== item.id)
                      : [...(k.selectedIds || []), item.id],
                  )
                }
              />
            )}
          />
          {q.type === "dish_assembly" && (
            <>
              <ItemRows
                label="Зоны размещения"
                items={c.slots || []}
                onChange={(x: Json[]) => config("slots", x)}
              />
              {c.slots?.length > 0 && (
                <div className="two">
                  {items
                    .filter((item: Json) => k.selectedIds?.includes(item.id))
                    .map((item: Json) => (
                      <Select
                        key={item.id}
                        label={"Правильная зона: " + item.label}
                        value={k.placements?.[item.id] || ""}
                        options={[
                          ["", "Не учитывать размещение"],
                          ...c.slots.map((slot: Json) => [slot.id, slot.label]),
                        ]}
                        onChange={(value: string) => {
                          const placements = { ...k.placements };
                          if (value) placements[item.id] = value;
                          else delete placements[item.id];
                          key("placements", placements);
                        }}
                      />
                    ))}
                </div>
              )}
            </>
          )}
        </>
      )}
      {q.type === "safety_checklist" && (
        <ItemRows
          label="Пункты проверки"
          items={items}
          onChange={(x: Json[]) => config("items", x)}
          renderExtra={(item: Json) => (
            <select
              value={
                k.checks?.[item.id] === undefined
                  ? ""
                  : String(k.checks[item.id])
              }
              aria-label={"Эталон: " + item.label}
              onChange={(e) =>
                key("checks", {
                  ...k.checks,
                  [item.id]: e.target.value === "true",
                })
              }
            >
              <option value="">Эталон</option>
              <option value="true">Соответствует</option>
              <option value="false">Не соответствует</option>
            </select>
          )}
        />
      )}
      {q.type === "file_evidence" && (
        <div className="two">
          <Input
            label="Разрешённые расширения через запятую"
            value={(c.extensions || []).join(", ")}
            onChange={(x: string) =>
              config(
                "extensions",
                x
                  .split(",")
                  .map((a) => a.trim().toLowerCase().replace(/^\./, "")),
              )
            }
          />
          <Input
            label="Максимум файлов"
            type="number"
            min="1"
            max="10"
            value={c.maxFiles || 3}
            onChange={(x: number) => config("maxFiles", x)}
          />
        </div>
      )}
      {["ttk_builder", "observation_log"].includes(q.type) && (
        <Textarea
          label="Поля документа: по одному в строке"
          value={(c.fields || []).join("\n")}
          onChange={(x: string) => config("fields", x.split("\n"))}
        />
      )}
      {q.type === "scheme_builder" && (
        <Textarea
          label="Типы узлов: по одному в строке"
          value={(c.nodeTypes || []).join("\n")}
          onChange={(x: string) => config("nodeTypes", x.split("\n"))}
        />
      )}
      <section className="attached-media">
        <h3>Материалы к заданию</h3>
        {(q.media || []).map((m: Json, i: number) => (
          <div className="file-row" key={m.url}>
            <span>{m.alt || `Материал ${i + 1}`}</span>
            <small>{m.mime}</small>
            <IconButton
              title="Убрать материал"
              onClick={() =>
                change(
                  "media",
                  q.media.filter((_: any, j: number) => j !== i),
                )
              }
            >
              <Trash2 size={16} />
            </IconButton>
          </div>
        ))}
        <label className="button file-button">
          <Plus size={16} />
          Добавить фото, аудио, видео или PDF
          <input
            type="file"
            hidden
            accept="image/*,audio/mpeg,audio/wav,video/mp4,video/webm,application/pdf"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                try {
                  const m = await upload(f);
                  change("media", [
                    ...(q.media || []),
                    { url: m.url, mime: m.mime, alt: m.name },
                  ]);
                } catch (error) {
                  window.dispatchEvent(
                    new CustomEvent("constructor-error", { detail: error }),
                  );
                }
              }
            }}
          />
        </label>
      </section>
      <Textarea
        label="Пояснение после раскрытия результатов"
        value={q.explanation}
        onChange={(x: string) => change("explanation", x)}
        rows={3}
      />
      <details className="author-details">
        <summary>Методические сведения и реплика рассказчика</summary>
        <Input
          label="Тема"
          value={q.theme}
          onChange={(x: string) => change("theme", x)}
        />
        <Textarea
          label="Источник и основание ответа"
          value={q.source}
          onChange={(x: string) => change("source", x)}
        />
        <Textarea
          label="Реплика к заданию"
          value={q.dialogue || ""}
          onChange={(x: string) => change("dialogue", x)}
        />
      </details>
    </section>
  );
}
export function QuestionInspector({ q, onChange, onPreview, onBank }: any) {
  return (
    <>
      <h2>Настройки задания</h2>
      <Input
        label="Баллы"
        type="number"
        min="0"
        step="0.5"
        value={q.maxScore}
        onChange={(x: number) => onChange({ ...q, maxScore: x })}
      />
      <Input
        label="Время, секунд (0 — без лимита)"
        type="number"
        min="0"
        value={q.seconds}
        onChange={(x: number) => onChange({ ...q, seconds: x })}
      />
      <Toggle
        label="Перемешивать варианты"
        value={q.shuffle}
        onChange={(x: boolean) => onChange({ ...q, shuffle: x })}
      />
      <Toggle
        label="Обязательное задание"
        value={q.required}
        onChange={(x: boolean) => onChange({ ...q, required: x })}
      />
      <Toggle
        label="Частичные баллы"
        value={q.partialCredit}
        onChange={(x: boolean) => onChange({ ...q, partialCredit: x })}
      />
      {q.type !== "instruction" && (
        <Select
          label="Проверка"
          value={q.grading}
          options={
            MANUAL.includes(q.type)
              ? [["manual", "Ручная"]]
              : [
                  ["automatic", "Автоматическая"],
                  ["manual", "Ручная"],
                ]
          }
          onChange={(x: string) =>
            onChange({
              ...q,
              grading: x,
              rubric:
                x === "manual" && !q.rubric?.length
                  ? [
                      {
                        id: uid("criterion"),
                        title: "Правильность выполнения",
                        maxScore: q.maxScore,
                      },
                    ]
                  : q.rubric,
            })
          }
        />
      )}
      {q.grading === "manual" && (
        <section>
          <h3>Критерии</h3>
          {q.rubric.map((r: Json, i: number) => (
            <div key={r.id} className="criterion">
              <input
                aria-label={`Критерий ${i + 1}`}
                value={r.title}
                onChange={(e) =>
                  onChange({
                    ...q,
                    rubric: q.rubric.map((x: Json) =>
                      x.id === r.id ? { ...x, title: e.target.value } : x,
                    ),
                  })
                }
              />
              <input
                aria-label={`Баллы по критерию ${i + 1}`}
                type="number"
                min="0"
                value={r.maxScore}
                onChange={(e) =>
                  onChange({
                    ...q,
                    rubric: q.rubric.map((x: Json) =>
                      x.id === r.id
                        ? { ...x, maxScore: Number(e.target.value) }
                        : x,
                    ),
                  })
                }
              />
              <IconButton
                title="Убрать критерий"
                onClick={() =>
                  onChange({
                    ...q,
                    rubric: q.rubric.filter((x: Json) => x.id !== r.id),
                  })
                }
              >
                <Trash2 size={15} />
              </IconButton>
            </div>
          ))}
          <Button
            onClick={() =>
              onChange({
                ...q,
                rubric: [
                  ...q.rubric,
                  {
                    id: uid("criterion"),
                    title: "Новый критерий",
                    maxScore: 0,
                  },
                ],
              })
            }
          >
            Добавить критерий
          </Button>
          <p className="muted">
            Сумма:{" "}
            {q.rubric.reduce(
              (s: number, x: Json) => s + Number(x.maxScore || 0),
              0,
            )}{" "}
            из {q.maxScore}
          </p>
        </section>
      )}
      <div className="inspector-actions">
        <Button onClick={onPreview}>Показать как участнику</Button>
        <Button onClick={onBank}>Сохранить в банк</Button>
      </div>
    </>
  );
}
function HotspotDesigner({ q, onChange }: any) {
  const [drag, setDrag] = useState<Json | null>(null);
  const c = q.config;
  const change = (value: Json) =>
    onChange({ ...q, config: { ...c, ...value } });
  return (
    <>
      <MediaPicker
        label="Изображение для задания"
        value={c.image}
        onChange={(image: string) => change({ image })}
      />
      {c.image && (
        <div
          className="hotspot drawing"
          onPointerDown={(e) => {
            const b = e.currentTarget.getBoundingClientRect();
            e.currentTarget.setPointerCapture(e.pointerId);
            setDrag({
              x: ((e.clientX - b.left) / b.width) * 100,
              y: ((e.clientY - b.top) / b.height) * 100,
            });
          }}
          onPointerUp={(e) => {
            if (!drag) return;
            const b = e.currentTarget.getBoundingClientRect(),
              x = ((e.clientX - b.left) / b.width) * 100,
              y = ((e.clientY - b.top) / b.height) * 100;
            if (Math.abs(x - drag.x) > 2 && Math.abs(y - drag.y) > 2)
              change({
                zones: [
                  ...(c.zones || []),
                  {
                    id: uid("zone"),
                    label: `Область ${(c.zones?.length || 0) + 1}`,
                    x: Math.max(0, Math.min(x, drag.x)),
                    y: Math.max(0, Math.min(y, drag.y)),
                    width: Math.abs(x - drag.x),
                    height: Math.abs(y - drag.y),
                  },
                ],
              });
            setDrag(null);
          }}
        >
          <img
            src={c.image}
            alt="Проведите по изображению, чтобы создать область"
            draggable={false}
          />
          {(c.zones || []).map((z: Json) => (
            <span
              key={z.id}
              className="zone author"
              style={{
                left: z.x + "%",
                top: z.y + "%",
                width: z.width + "%",
                height: z.height + "%",
              }}
            >
              {z.label}
            </span>
          ))}
        </div>
      )}
      <p className="muted">
        Протяните прямоугольник на изображении или настройте область числами.
      </p>
      {(c.zones || []).map((z: Json) => (
        <div className="zone-editor" key={z.id}>
          <Input
            label="Название области"
            value={z.label}
            onChange={(x: string) =>
              change({
                zones: c.zones.map((a: Json) =>
                  a.id === z.id ? { ...a, label: x } : a,
                ),
              })
            }
          />
          <div className="four">
            {["x", "y", "width", "height"].map((field) => (
              <Input
                key={field}
                label={
                  (
                    {
                      x: "Слева, %",
                      y: "Сверху, %",
                      width: "Ширина, %",
                      height: "Высота, %",
                    } as Json
                  )[field]
                }
                type="number"
                min="0"
                max="100"
                value={z[field]}
                onChange={(v: number) =>
                  change({
                    zones: c.zones.map((a: Json) =>
                      a.id === z.id ? { ...a, [field]: v } : a,
                    ),
                  })
                }
              />
            ))}
          </div>
          <Toggle
            label="Правильная область"
            value={q.key.zoneIds?.includes(z.id)}
            onChange={(v: boolean) =>
              onChange({
                ...q,
                key: {
                  ...q.key,
                  zoneIds: v
                    ? [...(q.key.zoneIds || []), z.id]
                    : q.key.zoneIds.filter((x: string) => x !== z.id),
                },
              })
            }
          />
          <Button
            onClick={() =>
              change({ zones: c.zones.filter((a: Json) => a.id !== z.id) })
            }
          >
            Удалить область
          </Button>
        </div>
      ))}
      <Button
        onClick={() =>
          change({
            zones: [
              ...(c.zones || []),
              {
                id: uid("zone"),
                label: "Новая область",
                x: 10,
                y: 10,
                width: 20,
                height: 20,
              },
            ],
          })
        }
      >
        Добавить область
      </Button>
    </>
  );
}
