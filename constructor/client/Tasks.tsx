import { uid as localId } from "../shared/catalog";
import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2, Upload, ZoomIn } from "lucide-react";
import type { Question, Json } from "../shared/types";
import { api, blobRequest, download, upload } from "./api";
import { Button, Field, IconButton, Input, Modal, Textarea } from "./ui";
export function Media({
  src,
  alt = "",
  token = "",
  mime = "image/webp",
}: {
  src: string;
  alt?: string;
  token?: string;
  mime?: string;
}) {
  const [resolved, setResolved] = useState(src),
    [resolvedMime, setResolvedMime] = useState(mime);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true,
      url = "";
    setError("");
    if (token && src?.startsWith("/api/constructor/v1/media/"))
      blobRequest(src.slice("/api/constructor/v1".length), undefined, token)
        .then((b) => {
          url = URL.createObjectURL(b);
          if (active) {
            setResolved(url);
            setResolvedMime(b.type || mime);
          }
        })
        .catch(() =>
          setError("Не удалось загрузить файл. Повторите открытие задания."),
        );
    else setResolved(src);
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [src, token]);
  if (!src) return null;
  if (error) return <p className="error">{error}</p>;
  if (resolvedMime.startsWith("audio/"))
    return <audio controls src={resolved} aria-label={alt} />;
  if (resolvedMime.startsWith("video/"))
    return <video controls src={resolved} aria-label={alt} />;
  if (resolvedMime === "application/pdf")
    return (
      <Button
        onClick={async () =>
          download(
            await blobRequest(
              src.slice("/api/constructor/v1".length),
              undefined,
              token,
            ),
            "Материал.pdf",
          )
        }
      >
        Открыть материал PDF
      </Button>
    );
  return (
    <>
      <button
        type="button"
        className="image-zoom"
        title="Открыть крупно"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setExpanded(true);
        }}
      >
        <img
          src={resolved}
          alt={alt}
          onError={() => setError("Изображение не загрузилось.")}
        />
        <ZoomIn size={15} />
      </button>
      {expanded && (
        <Modal
          title={alt || "Изображение"}
          wide
          onClose={() => setExpanded(false)}
        >
          <img className="expanded-image" src={resolved} alt={alt} />
        </Modal>
      )}
    </>
  );
}
export function Task({
  q,
  value,
  onChange,
  token = "",
  attemptId = "",
  readOnly = false,
}: {
  q: Question;
  value: any;
  onChange: (value: any) => void;
  token?: string;
  attemptId?: string;
  readOnly?: boolean;
}) {
  const c = q.config || {},
    v = value ?? {},
    set = readOnly ? () => {} : onChange;
  const [picked, setPicked] = useState("");
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const options = c.options || [],
    items = c.items || [];
  const manual = q.grading === "manual";
  return (
    <div className="task" data-type={q.type}>
      {q.prompt && <p className="task-prompt">{q.prompt}</p>}
      {q.media?.map((m: Json, i: number) => (
        <Media
          key={m.url || i}
          src={m.url}
          alt={m.alt || q.title}
          token={token}
          mime={m.mime}
        />
      ))}
      {c.clues && q.type === "short_text" && (
        <dl className="clues">
          {c.clues.map((x: Json, i: number) => (
            <div key={i}>
              <dt>{x.label}</dt>
              <dd>{x.text}</dd>
            </div>
          ))}
        </dl>
      )}
      {q.type === "instruction" && (
        <p className="muted">Прочитайте материал и переходите дальше.</p>
      )}
      {["single_choice", "multiple_choice"].includes(q.type) && (
        <div
          className={
            "choices " +
            (options.some((o: Json) => o.imageUrl) ? "photo-choices" : "")
          }
        >
          {options.map((o: Json) => {
            const selected =
              q.type === "single_choice"
                ? value === o.id
                : Array.isArray(value) && value.includes(o.id);
            return (
              <label
                className={"choice " + (selected ? "selected" : "")}
                key={o.id}
              >
                <input
                  disabled={readOnly}
                  type={q.type === "single_choice" ? "radio" : "checkbox"}
                  name={q.id}
                  checked={Boolean(selected)}
                  onChange={() =>
                    set(
                      q.type === "single_choice"
                        ? o.id
                        : selected
                          ? (value || []).filter((x: string) => x !== o.id)
                          : [...(value || []), o.id],
                    )
                  }
                />
                {o.imageUrl && (
                  <Media src={o.imageUrl} alt={o.label} token={token} />
                )}
                <span>{o.label}</span>
                {o.description && <small>{o.description}</small>}
              </label>
            );
          })}
        </div>
      )}
      {q.type === "short_text" && (
        <Input
          label="Ваш ответ"
          value={value || ""}
          onChange={set}
          disabled={readOnly}
          autoComplete="off"
        />
      )}
      {q.type === "calculation" && (
        <>
          <div className="two">
            <Input
              label="Значение"
              value={v.value ?? ""}
              onChange={(x: string) => set({ ...v, value: x })}
              inputMode="decimal"
              disabled={readOnly}
            />
            <Input
              label="Единица измерения"
              value={v.unit ?? c.unit ?? ""}
              onChange={(x: string) => set({ ...v, unit: x })}
              disabled={readOnly}
            />
          </div>
          {c.formula && <p className="formula">Формула: {c.formula}</p>}
        </>
      )}
      {["matching", "classification"].includes(q.type) && (
        <div className="mapping">
          <div className="drag-items" aria-label="Карточки для размещения">
            {items.map((item: Json) => (
              <div
                key={item.id}
                role="button"
                tabIndex={readOnly ? -1 : 0}
                draggable={!readOnly}
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/plain", item.id)
                }
                className={
                  "drag-card " + (picked === item.id ? "selected" : "")
                }
                onClick={() => {
                  if (!readOnly) setPicked(item.id);
                }}
                onKeyDown={(e) => {
                  if (!readOnly && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setPicked(item.id);
                  }
                }}
              >
                {item.imageUrl && (
                  <Media src={item.imageUrl} alt={item.label} token={token} />
                )}
                <span>{item.label}</span>
                <small>
                  {c.targets?.find((t: Json) => t.id === v[item.id])?.label ||
                    "Выберите область"}
                </small>
              </div>
            ))}
          </div>
          <div className="drop-targets">
            {(c.targets || []).map((target: Json) => (
              <button
                type="button"
                className="drop-target"
                key={target.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const key = e.dataTransfer.getData("text/plain");
                  if (items.some((i: Json) => i.id === key))
                    set({ ...v, [key]: target.id });
                }}
                onClick={() => {
                  if (picked) {
                    set({ ...v, [picked]: target.id });
                    setPicked("");
                  }
                }}
                disabled={readOnly}
              >
                <strong>{target.label}</strong>
                {items
                  .filter((i: Json) => v[i.id] === target.id)
                  .map((i: Json) => (
                    <span key={i.id}>{i.label}</span>
                  ))}
              </button>
            ))}
          </div>
          <p className="muted">
            Перетащите карточку или выберите карточку и область.
          </p>
          <details>
            <summary>Выбрать соответствия списком</summary>
            {items.map((i: Json) => (
              <Field key={i.id} label={i.label}>
                <select
                  disabled={readOnly}
                  value={v[i.id] || ""}
                  onChange={(e) => set({ ...v, [i.id]: e.target.value })}
                >
                  <option value="">Выберите</option>
                  {c.targets.map((t: Json) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </details>
        </div>
      )}
      {q.type === "ordering" && (
        <ol className="ordering">
          {(Array.isArray(value) ? value : items.map((i: Json) => i.id)).map(
            (key: string, i: number, list: string[]) => {
              const item = items.find((x: Json) => x.id === key);
              const move = (step: number) => {
                const next = [...list],
                  j = i + step;
                if (j < 0 || j >= next.length) return;
                [next[i], next[j]] = [next[j], next[i]];
                set(next);
              };
              return (
                <li
                  key={key}
                  draggable={!readOnly}
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/plain", String(i))
                  }
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const from = Number(e.dataTransfer.getData("text/plain"));
                    if (
                      !Number.isInteger(from) ||
                      from < 0 ||
                      from >= list.length
                    )
                      return;
                    const next = [...list],
                      [moved] = next.splice(from, 1);
                    next.splice(i, 0, moved);
                    set(next);
                  }}
                >
                  <span>{item?.label}</span>
                  <IconButton
                    title="Выше"
                    disabled={readOnly || i === 0}
                    onClick={() => move(-1)}
                  >
                    <ArrowUp size={17} />
                  </IconButton>
                  <IconButton
                    title="Ниже"
                    disabled={readOnly || i === list.length - 1}
                    onClick={() => move(1)}
                  >
                    <ArrowDown size={17} />
                  </IconButton>
                </li>
              );
            },
          )}
          <Button
            disabled={readOnly}
            onClick={() =>
              set(Array.isArray(value) ? value : items.map((i: Json) => i.id))
            }
          >
            Зафиксировать порядок
          </Button>
        </ol>
      )}
      {q.type === "table" && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Показатель</th>
                {(c.columns || []).map((x: Json) => (
                  <th key={x.id}>{x.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(c.rows || []).map((r: Json) => (
                <tr key={r.id}>
                  <th>{r.label}</th>
                  {c.columns.map((col: Json) => (
                    <td key={col.id}>
                      <input
                        aria-label={`${r.label}: ${col.label}`}
                        value={v[`${r.id}:${col.id}`] ?? ""}
                        disabled={readOnly}
                        onChange={(e) =>
                          set({ ...v, [`${r.id}:${col.id}`]: e.target.value })
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {q.type === "crossword" && (
        <Crossword q={q} value={v} onChange={set} readOnly={readOnly} />
      )}
      {q.type === "hotspot" && (
        <>
          <div
            className="hotspot"
            onClick={(e) => {
              if (readOnly) return;
              const b = e.currentTarget.getBoundingClientRect(),
                x = ((e.clientX - b.left) / b.width) * 100,
                y = ((e.clientY - b.top) / b.height) * 100;
              const zone = (c.zones || []).find(
                (z: Json) =>
                  x >= z.x &&
                  x <= z.x + z.width &&
                  y >= z.y &&
                  y <= z.y + z.height,
              );
              const key = zone?.id || "outside";
              set(
                Array.isArray(value) && value.includes(key)
                  ? value.filter((a: string) => a !== key)
                  : [...(Array.isArray(value) ? value : []), key],
              );
            }}
          >
            <Media src={c.image} token={token} alt={q.title} />
            {(c.zones || []).map((z: Json) => (
              <button
                type="button"
                aria-label={z.label}
                key={z.id}
                className={
                  "zone " +
                  (Array.isArray(value) && value.includes(z.id)
                    ? "selected"
                    : "")
                }
                style={{
                  left: z.x + "%",
                  top: z.y + "%",
                  width: z.width + "%",
                  height: z.height + "%",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  set(
                    Array.isArray(value) && value.includes(z.id)
                      ? value.filter((a: string) => a !== z.id)
                      : [...(Array.isArray(value) ? value : []), z.id],
                  );
                }}
                disabled={readOnly}
              >
                {z.label}
              </button>
            ))}
          </div>
          <p className="muted">Выберите нужные области на изображении.</p>
        </>
      )}
      {q.type === "restaurant_kitchen" && (
        <Restaurant
          q={q}
          value={v}
          onChange={set}
          token={token}
          readOnly={readOnly}
        />
      )}
      {q.type === "dish_assembly" && (
        <>
          <div className="choices">
            {items.map((x: Json) => {
              const selected = v.selectedIds?.includes(x.id);
              return (
                <label
                  className={"choice " + (selected ? "selected" : "")}
                  key={x.id}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(selected)}
                    disabled={readOnly}
                    onChange={() =>
                      set({
                        ...v,
                        selectedIds: selected
                          ? (v.selectedIds || []).filter(
                              (i: string) => i !== x.id,
                            )
                          : [...(v.selectedIds || []), x.id],
                      })
                    }
                  />
                  {x.imageUrl && (
                    <Media src={x.imageUrl} alt={x.label} token={token} />
                  )}
                  <span>{x.label}</span>
                  {selected && c.slots?.length > 0 && (
                    <select
                      aria-label={`Размещение: ${x.label}`}
                      value={v.placements?.[x.id] || ""}
                      onChange={(e) =>
                        set({
                          ...v,
                          placements: {
                            ...v.placements,
                            [x.id]: e.target.value,
                          },
                        })
                      }
                      disabled={readOnly}
                    >
                      <option value="">Выберите область</option>
                      {c.slots.map((s: Json) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              );
            })}
          </div>
          <p className="muted">
            {c.selectCount ? `Выберите компонентов: ${c.selectCount}.` : ""}{" "}
            Выбрано: {v.selectedIds?.length || 0}
          </p>
        </>
      )}
      {q.type === "safety_checklist" && (
        <div className="checklist">
          {items.map((x: Json) => (
            <Field key={x.id} label={x.label}>
              <select
                value={v[x.id] === undefined ? "" : String(v[x.id])}
                onChange={(e) =>
                  set({ ...v, [x.id]: e.target.value === "true" })
                }
                disabled={readOnly}
              >
                <option value="">Выберите</option>
                <option value="true">Выполнено / соответствует</option>
                <option value="false">Не выполнено / не соответствует</option>
              </select>
            </Field>
          ))}
        </div>
      )}
      {["long_text", "reflection"].includes(q.type) && (
        <Textarea
          label="Ваш ответ"
          value={value || ""}
          onChange={set}
          rows={9}
          disabled={readOnly}
        />
      )}
      {q.type === "file_evidence" && (
        <div>
          <p>
            Форматы: {(c.extensions || []).join(", ")}. Файлов: до{" "}
            {c.maxFiles || 3}.
          </p>
          <label className="button file-button">
            <Upload size={17} />
            Прикрепить файл
            <input
              hidden
              type="file"
              disabled={readOnly}
              accept={(c.extensions || [])
                .map((x: string) => "." + x)
                .join(",")}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const m = await upload(
                    f,
                    attemptId
                      ? { attemptId, token, questionId: q.id }
                      : undefined,
                  );
                  setFileNames((old) => ({ ...old, [m.id]: m.name }));
                  set([...(Array.isArray(value) ? value : []), m.id]);
                } catch (error) {
                  window.dispatchEvent(
                    new CustomEvent("constructor-error", { detail: error }),
                  );
                }
              }}
            />
          </label>
          {(Array.isArray(value) ? value : []).map((key: string, i: number) => (
            <div className="file-row" key={key}>
              <span>{fileNames[key] || `Прикреплённый файл ${i + 1}`}</span>
              <Button
                onClick={async () =>
                  download(
                    await blobRequest("/media/" + key, undefined, token),
                    fileNames[key] || `Файл ${i + 1}`,
                  )
                }
              >
                Скачать
              </Button>
              <IconButton
                title="Убрать файл"
                disabled={readOnly}
                onClick={() => set(value.filter((x: string) => x !== key))}
              >
                <Trash2 size={16} />
              </IconButton>
            </div>
          ))}
        </div>
      )}
      {q.type === "scheme_builder" && (
        <div>
          <div className="scheme-list">
            {(v.nodes || []).map((node: Json, i: number) => (
              <div key={node.id} className="scheme-node">
                <span>{i + 1}</span>
                <select
                  aria-label="Тип узла"
                  value={node.type}
                  onChange={(e) =>
                    set({
                      ...v,
                      nodes: v.nodes.map((x: Json) =>
                        x.id === node.id ? { ...x, type: e.target.value } : x,
                      ),
                    })
                  }
                  disabled={readOnly}
                >
                  {(c.nodeTypes || []).map((t: string) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <input
                  aria-label="Название этапа"
                  value={node.label}
                  onChange={(e) =>
                    set({
                      ...v,
                      nodes: v.nodes.map((x: Json) =>
                        x.id === node.id ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                  disabled={readOnly}
                />
                <IconButton
                  title="Удалить узел"
                  disabled={readOnly}
                  onClick={() =>
                    set({
                      ...v,
                      nodes: v.nodes.filter((x: Json) => x.id !== node.id),
                    })
                  }
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            ))}
          </div>
          <Button
            disabled={readOnly}
            onClick={() =>
              set({
                ...v,
                nodes: [
                  ...(v.nodes || []),
                  {
                    id: localId("local"),
                    type: c.nodeTypes?.[0] || "Операция",
                    label: "",
                  },
                ],
              })
            }
          >
            <Plus size={16} />
            Добавить этап
          </Button>
          <Textarea
            label="Контрольные точки и связи"
            value={v.comment || ""}
            onChange={(comment: string) => set({ ...v, comment })}
            disabled={readOnly}
          />
        </div>
      )}
      {q.type === "ttk_builder" && (
        <div className="ttk">
          {(c.fields || []).map((field: string) => (
            <Textarea
              key={field}
              label={field}
              value={v[field] || ""}
              onChange={(text: string) => set({ ...v, [field]: text })}
              disabled={readOnly}
            />
          ))}
        </div>
      )}
      {q.type === "observation_log" && (
        <div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {(c.fields || []).map((s: string) => (
                    <th key={s}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(v.rows || [{}]).map((r: Json, i: number) => (
                  <tr key={i}>
                    {c.fields.map((field: string) => (
                      <td key={field}>
                        <input
                          aria-label={`${field}, строка ${i + 1}`}
                          value={r[field] || ""}
                          onChange={(e) => {
                            const rows = [...(v.rows || [{}])];
                            rows[i] = { ...r, [field]: e.target.value };
                            set({ ...v, rows });
                          }}
                          disabled={readOnly}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            disabled={readOnly}
            onClick={() => set({ ...v, rows: [...(v.rows || [{}]), {}] })}
          >
            <Plus size={16} />
            Добавить наблюдение
          </Button>
        </div>
      )}
      {manual && q.rubric?.length > 0 && (
        <details className="rubric">
          <summary>Критерии оценивания</summary>
          {q.rubric.map((r: Json) => (
            <p key={r.id}>
              {r.title} — до {r.maxScore} баллов
            </p>
          ))}
        </details>
      )}
    </div>
  );
}
function Crossword({ q, value, onChange, readOnly }: any) {
  const clues = q.config.clues || [];
  const lengths = (x: Json) => x.length || q.key?.words?.[x.id]?.length || 1;
  const cells = new Map<string, { clue: Json; index: number }[]>();
  let rows = 1,
    cols = 1;
  for (const clue of clues)
    for (let i = 0; i < lengths(clue); i++) {
      const r = Number(clue.row || 0) + (clue.direction === "down" ? i : 0),
        c = Number(clue.col || 0) + (clue.direction === "across" ? i : 0);
      rows = Math.max(rows, r + 1);
      cols = Math.max(cols, c + 1);
      const key = r + ":" + c;
      cells.set(key, [...(cells.get(key) || []), { clue, index: i }]);
    }
  if (rows > 40 || cols > 40)
    return <p className="error">Размер кроссворда превышает 40 × 40.</p>;
  return (
    <div>
      <div className="crossword-scroll">
        <div
          className="crossword-grid"
          style={{ gridTemplateColumns: `repeat(${cols}, 34px)` }}
        >
          {Array.from({ length: rows * cols }, (_, i) => {
            const key = Math.floor(i / cols) + ":" + (i % cols),
              entries = cells.get(key);
            if (!entries) return <span className="blocked" key={key} />;
            const char =
              entries
                .map((e) => (value[e.clue.id] || "")[e.index])
                .find(Boolean) || "";
            return (
              <input
                key={key}
                aria-label={`Кроссворд: строка ${Math.floor(i / cols) + 1}, столбец ${(i % cols) + 1}`}
                maxLength={1}
                value={char}
                disabled={readOnly}
                onChange={(e) => {
                  const result = { ...value };
                  for (const { clue, index } of entries) {
                    const word = (result[clue.id] || "")
                      .padEnd(lengths(clue), " ")
                      .split("");
                    word[index] = e.target.value.toLocaleUpperCase("ru");
                    result[clue.id] = word.join("");
                  }
                  onChange(result);
                }}
              />
            );
          })}
        </div>
      </div>
      <ol>
        {clues.map((x: Json) => (
          <li key={x.id}>
            {x.label} (
            {x.direction === "down" ? "вертикально" : "горизонтально"},{" "}
            {lengths(x)} букв)
          </li>
        ))}
      </ol>
    </div>
  );
}
function Restaurant({ q, value, onChange, token, readOnly }: any) {
  const c = q.config,
    selected = value.selectedIds || [],
    phase = Number(value.phase || 0),
    stages = c.stages || ["Выбор компонентов", "Собрать", "Подать"];
  const key = selected
    .map(
      (id: string) =>
        c.items.find((i: Json) => i.id === id)?.photoPart ||
        c.items.find((i: Json) => i.id === id)?.visual?.token ||
        id.replace("component-", ""),
    )
    .sort()
    .join("+");
  const photo = c.photo?.finals?.find((f: Json) => f.key === key)?.imageUrl;
  return (
    <div className="restaurant">
      <p>{c.variantLabel}</p>
      <ol className="assembly-stages">
        {stages.map((s: string, i: number) => (
          <li className={phase >= i ? "active" : ""} key={i}>
            {s}
          </li>
        ))}
      </ol>
      {phase === 0 ? (
        <>
          <div className="choices photo-choices">
            {c.items.map((item: Json) => (
              <label
                className={
                  "choice " + (selected.includes(item.id) ? "selected" : "")
                }
                key={item.id}
              >
                <input
                  type="checkbox"
                  disabled={
                    readOnly ||
                    (!selected.includes(item.id) &&
                      selected.length >= c.selectCount)
                  }
                  checked={selected.includes(item.id)}
                  onChange={() =>
                    onChange({
                      ...value,
                      selectedIds: selected.includes(item.id)
                        ? selected.filter((x: string) => x !== item.id)
                        : [...selected, item.id],
                      phase: 0,
                      served: false,
                    })
                  }
                />
                <Media src={item.imageUrl} alt={item.label} token={token} />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <p>
            Выбрано {selected.length} из {c.selectCount}
          </p>
        </>
      ) : (
        <>
          <Media
            src={
              phase >= stages.length - 1
                ? photo ||
                  c.items.find((i: Json) => selected.includes(i.id))?.imageUrl
                : c.photo?.frames?.shaped || photo || c.items[0]?.imageUrl
            }
            alt="Ваша сборка"
            token={token}
          />
          <p>{value.served ? "Ваша подача сохранена." : stages[phase]}</p>
        </>
      )}
      <div className="actions">
        <Button
          disabled={readOnly || phase === 0}
          onClick={() =>
            onChange({ ...value, phase: Math.max(0, phase - 1), served: false })
          }
        >
          Назад к сборке
        </Button>
        <Button
          kind="primary"
          disabled={
            readOnly || selected.length !== c.selectCount || value.served
          }
          onClick={() =>
            onChange({
              ...value,
              phase: Math.min(stages.length - 1, phase + 1),
              served: phase >= stages.length - 2,
            })
          }
        >
          {phase >= stages.length - 2
            ? "Подать"
            : stages[phase + 1] || "Продолжить"}
        </Button>
      </div>
    </div>
  );
}
