import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Plus,
  Type,
  Image,
  Square,
  Minus,
  Save,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Undo2,
  Redo2,
  AlignCenter,
  Copy,
  ZoomIn,
  ZoomOut,
  QrCode,
} from "lucide-react";
import type { AwardTemplate, Json } from "../shared/types";
import { FIELD_NAMES, uid, template } from "../shared/catalog";
import { api, blobRequest, download, localSet, localGet, upload } from "./api";
import {
  Button,
  IconButton,
  Input,
  Select,
  Toggle,
  Textarea,
  Field,
  MediaPicker,
  Modal,
} from "./ui";
const fields: Json = {
  fullName: "Имя Фамилия Отчество",
  event: "Название олимпиады",
  degree: "I степени",
  date: "30.10.2026",
  number: "ОБРАЗЕЦ",
  issuer: "Организатор",
  place: "1",
  score: "100",
  maxScore: "100",
  nomination: "Победитель",
  mentorName: "ФИО наставника",
  institution: "Образовательная организация",
  groupName: "Учебная группа",
  order: "",
};
const humanize = (text: string) =>
  String(text || "").replace(
    /\{([a-zA-Z]+)\}/g,
    (_, key) => "{" + ((FIELD_NAMES as Json)[key] || key) + "}",
  );
const internalize = (text: string) => {
  let result = text;
  for (const [key, label] of Object.entries(FIELD_NAMES))
    result = result.replaceAll("{" + label + "}", "{" + key + "}");
  return result;
};
const fill = (text: string, data = fields) =>
  String(text || "").replace(/\{([a-zA-Z]+)\}/g, (_, key) => data[key] ?? "");
export function TemplateGallery({ items, onOpen, onCreate }: any) {
  const [kind, setKind] = useState("all");
  return (
    <>
      <div className="page-toolbar">
        <h1>Наградные документы</h1>
        <Button
          kind="primary"
          onClick={async () =>
            onOpen(
              (await api("/templates", template("certificate", "modern"))).id,
            )
          }
        >
          <Plus size={17} />
          Новый шаблон
        </Button>
      </div>
      <div className="section-tabs">
        {[
          ["all", "Все шаблоны"],
          ["diploma", "Дипломы"],
          ["commendation", "Грамоты"],
          ["certificate", "Сертификаты"],
          ["thanks", "Благодарности"],
        ].map(([key, label]) => (
          <button
            className={key === kind ? "active" : ""}
            key={key}
            onClick={() => setKind(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="template-gallery">
        {items
          .filter((t: Json) => kind === "all" || t.kind === kind)
          .map((t: AwardTemplate) => (
            <button
              key={t.id}
              className="template-choice"
              onClick={() => onOpen(t.id)}
            >
              <TemplateThumb template={t} />
              <strong>{t.title}</strong>
              <span>Открыть редактор</span>
            </button>
          ))}
      </div>
    </>
  );
}
export function TemplateThumb({ template: t }: any) {
  const scale = 210 / (t.width * 3.7795);
  return (
    <div
      className="template-thumb"
      style={{ height: t.height * 3.7795 * scale }}
    >
      <div
        className="paper"
        style={{
          width: t.width + "mm",
          height: t.height + "mm",
          background: t.background,
          transform: `scale(${scale})`,
        }}
      >
        {t.backgroundImage && (
          <img className="paper-background" src={t.backgroundImage} alt="" />
        )}
        {t.elements.map((el: Json) => (
          <PaperElement key={el.id} element={el} preview />
        ))}
      </div>
    </div>
  );
}
export function PaperElement({
  element: el,
  preview = false,
  selected = false,
  onPointerDown,
  onSelect,
  resize,
  scale = 1,
  data = fields,
}: any) {
  const textNode = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = textNode.current;
    if (!node || !["text", "field"].includes(el.type)) return;
    let active = true;
    document.fonts.ready.then(() => {
      if (!active) return;
      let size = (Number(el.size || 14) * 96) / 72;
      node.style.fontSize = size + "px";
      const min = (Number(el.minSize || 7) * 96) / 72;
      while (
        el.autoFit !== false &&
        (node.scrollHeight > node.clientHeight + 1 ||
          node.scrollWidth > node.clientWidth + 1) &&
        size > min
      ) {
        size -= 0.5;
        node.style.fontSize = size + "px";
      }
      node.dataset.overflow = String(
        node.scrollHeight > node.clientHeight + 1 ||
          node.scrollWidth > node.clientWidth + 1,
      );
    });
    return () => {
      active = false;
    };
  }, [
    el.text,
    el.size,
    el.width,
    el.height,
    el.font,
    el.lineHeight,
    el.autoFit,
    el.hidden,
    preview,
    data,
  ]);
  if (el.hidden) return null;
  const style: any = {
    position: "absolute",
    left: el.x + "mm",
    top: el.y + "mm",
    width: el.width + "mm",
    height: el.height + "mm",
    transform: `rotate(${el.rotation || 0}deg)`,
    opacity: el.opacity ?? 1,
    fontFamily: el.font || "PT Serif",
    fontSize: el.size + "pt",
    fontWeight: el.bold ? 700 : 400,
    fontStyle: el.italic ? "italic" : "normal",
    textDecoration: el.underline ? "underline" : "none",
    textAlign: el.align || "center",
    color: el.color || "#202b32",
    lineHeight: el.lineHeight || 1.2,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    boxSizing: "border-box",
    cursor: preview ? "default" : el.locked ? "default" : "move",
  };
  if (el.type === "rect" || el.type === "line") {
    style.border = `${el.lineWidth || 0.3}mm solid ${el.stroke || "#005b43"}`;
    style.background = el.fill || "transparent";
    if (el.type === "line") {
      style.borderWidth = 0;
      style.borderTopWidth = (el.lineWidth || 0.3) + "mm";
    }
  }
  return (
    <div
      ref={textNode}
      tabIndex={preview ? undefined : 0}
      role={preview ? undefined : "button"}
      aria-label={
        el.type === "field" ? "Поле " + fill(el.text) : el.text || el.type
      }
      className={"paper-element " + (selected ? "selected" : "")}
      style={style}
      onPointerDown={onPointerDown}
      onClick={onSelect}
    >
      {el.type === "image" ? (
        <img
          draggable={false}
          alt=""
          src={el.src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
      ) : el.type === "qr" ? (
        <div className="qr-placeholder">
          <QrCode size={36} />
        </div>
      ) : ["rect", "line"].includes(el.type) ? null : preview ? (
        fill(el.text, data)
      ) : (
        humanize(el.text)
      )}
      {selected && !el.locked && (
        <>
          <i
            className="selection-handle top-left"
            style={{ transform: `scale(${1 / scale})` }}
          />
          <i
            className="selection-handle bottom-right"
            style={{ transform: `scale(${1 / scale})` }}
            onPointerDown={resize}
          />
        </>
      )}
    </div>
  );
}
export function Designer({ initial, templates, onBack, registerFlush }: any) {
  const [t, setT] = useState<AwardTemplate>(initial),
    [selected, setSelected] = useState(
      initial.elements.find((x: Json) => x.text === "{fullName}")?.id || "",
    ),
    [leftTab, setLeftTab] = useState("Шаблоны"),
    [zoom, setZoom] = useState(0.68),
    [status, setStatus] = useState("Черновик сохранён"),
    [error, setError] = useState(""),
    [history, setHistory] = useState<Json[]>([]),
    [future, setFuture] = useState<Json[]>([]),
    [previewing, setPreviewing] = useState(false),
    [sample, setSample] = useState<Json>(fields),
    [sampleParticipants, setSampleParticipants] = useState<Json[]>([]),
    [restore, setRestore] = useState<Json | null>(null),
    [guide, setGuide] = useState(false);
  const current = useRef(t),
    revision = useRef(initial.revision),
    dirty = useRef(false),
    saving = useRef<Promise<void> | null>(null),
    changeNo = useRef(0),
    drag = useRef<any>(null),
    viewport = useRef<HTMLDivElement>(null);
  const el = t.elements.find((x) => x.id === selected);
  const remember = () => {
    setHistory((h) => [...h.slice(-49), structuredClone(current.current)]);
    setFuture([]);
  };
  const apply = (value: AwardTemplate, record = true) => {
    if (record) remember();
    current.current = value;
    dirty.current = true;
    changeNo.current++;
    setT(value);
    setStatus("Есть изменения");
    localSet("template:" + initial.id, {
      template: value,
      baseRevision: revision.current,
      dirty: true,
    });
  };
  const change = (key: string, value: any) => apply({ ...t, [key]: value });
  const edit = (key: string, value: any) => {
    if (el)
      apply({
        ...t,
        elements: t.elements.map((x) =>
          x.id === el.id ? { ...x, [key]: value } : x,
        ),
      });
  };
  const save = useCallback(async () => {
    if (saving.current) await saving.current;
    if (!dirty.current) return;
    const seq = changeNo.current;
    setStatus("Сохраняем…");
    const task = async () => {
      try {
        const result = await api(
          "/templates/" + initial.id,
          { template: current.current, expectedRevision: revision.current },
          "PUT",
        );
        revision.current = result.revision;
        if (changeNo.current === seq) dirty.current = false;
        setStatus(dirty.current ? "Есть изменения" : "Шаблон сохранён");
        setError("");
        await localSet("template:" + initial.id, {
          template: current.current,
          baseRevision: revision.current,
          dirty: dirty.current,
        });
      } catch (e: any) {
        setError(e.message);
        setStatus("Сохранение не подтверждено");
        throw e;
      } finally {
        saving.current = null;
      }
    };
    saving.current = task();
    await saving.current;
  }, [initial.id]);
  const flush = useCallback(async () => {
    await save();
    if (dirty.current) await save();
  }, [save]);
  useEffect(() => {
    registerFlush(flush);
    return () => registerFlush(null);
  }, [registerFlush, flush]);
  useEffect(() => {
    localGet("template:" + initial.id).then((v) => {
      if (v?.dirty) setRestore(v);
    });
  }, [initial.id]);
  useEffect(() => {
    if (!dirty.current || error || restore) return;
    const timeout = setTimeout(() => save().catch(() => {}), 1400);
    return () => clearTimeout(timeout);
  }, [t, error, restore, save]);
  const undo = () => {
    if (!history.length) return;
    const next = history.at(-1) as AwardTemplate;
    setFuture((f) => [structuredClone(current.current), ...f]);
    setHistory((h) => h.slice(0, -1));
    apply(next, false);
  };
  const redo = () => {
    if (!future.length) return;
    setHistory((h) => [...h, structuredClone(current.current)]);
    const next = future[0] as AwardTemplate;
    setFuture((f) => f.slice(1));
    apply(next, false);
  };
  const remove = () => {
    if (el && !el.locked) {
      apply({ ...t, elements: t.elements.filter((x) => x.id !== el.id) });
      setSelected("");
    }
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save().catch(() => {});
        return;
      }
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (e.key === "Delete") remove();
      if (
        el &&
        !el.locked &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 0.5;
        edit(
          e.key === "ArrowLeft" || e.key === "ArrowRight" ? "x" : "y",
          Number(
            el[e.key === "ArrowLeft" || e.key === "ArrowRight" ? "x" : "y"],
          ) + (e.key === "ArrowLeft" || e.key === "ArrowUp" ? -step : step),
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, []);
  const add = (type: string) => {
    const x: Json = {
      id: uid("el"),
      type,
      text:
        type === "field" ? "{fullName}" : type === "text" ? "Новый текст" : "",
      x: 30,
      y: 70,
      width: type === "image" || type === "qr" ? 30 : 180,
      height: type === "line" ? 1 : type === "rect" ? 30 : 20,
      font: "PT Serif",
      size: 20,
      color: "#202b32",
      align: "center",
      opacity: 1,
      autoFit: true,
      locked: false,
      fill: "transparent",
      stroke: t.accent,
      lineWidth: 0.4,
    };
    apply({ ...t, elements: [...t.elements, x] });
    setSelected(x.id);
    setLeftTab("Элементы");
  };
  const pointerStart = (
    e: React.PointerEvent,
    element: Json,
    mode = "move",
  ) => {
    e.stopPropagation();
    setSelected(element.id);
    if (element.locked) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    remember();
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      element: structuredClone(element),
      mode,
    };
  };
  const pointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const start = drag.current,
      dx = (e.clientX - start.startX) / (3.7795 * zoom),
      dy = (e.clientY - start.startY) / (3.7795 * zoom);
    const value = { ...start.element };
    if (start.mode === "resize") {
      value.width = Math.max(
        3,
        Math.min(t.width - value.x, start.element.width + dx),
      );
      value.height = Math.max(
        2,
        Math.min(t.height - value.y, start.element.height + dy),
      );
    } else {
      value.x = Math.max(
        0,
        Math.min(t.width - value.width, start.element.x + dx),
      );
      value.y = Math.max(
        0,
        Math.min(t.height - value.height, start.element.y + dy),
      );
      const center = (t.width - value.width) / 2;
      setGuide(Math.abs(value.x - center) < 2);
      if (Math.abs(value.x - center) < 2) value.x = center;
    }
    value.x = Math.round(value.x * 10) / 10;
    value.y = Math.round(value.y * 10) / 10;
    apply(
      {
        ...current.current,
        elements: current.current.elements.map((x) =>
          x.id === value.id ? value : x,
        ),
      },
      false,
    );
  };
  return (
    <div className="designer">
      <div className="page-toolbar">
        <div className="toolbar-title">
          <IconButton
            title="К шаблонам"
            onClick={async () => {
              await flush();
              onBack();
            }}
          >
            <ArrowLeft size={22} />
          </IconButton>
          <h1>Редактор наградных документов</h1>
          <small role="status">{status}</small>
        </div>
        <div className="actions">
          <IconButton
            title="Отменить"
            disabled={!history.length}
            onClick={undo}
          >
            <Undo2 size={18} />
          </IconButton>
          <IconButton
            title="Повторить"
            disabled={!future.length}
            onClick={redo}
          >
            <Redo2 size={18} />
          </IconButton>
          <Button
            onClick={async () => {
              await flush();
              setSampleParticipants(await api("/document-samples"));
              setPreviewing(true);
            }}
          >
            <Eye size={17} />
            Предпросмотр
          </Button>
          <Button kind="primary" onClick={save}>
            <Save size={17} />
            Сохранить шаблон
          </Button>
        </div>
      </div>
      {error && (
        <div className="error">
          <p>{error}</p>
          <Button
            onClick={() =>
              download(
                new Blob([JSON.stringify(current.current, null, 2)]),
                "Шаблон локальная копия.json",
              )
            }
          >
            Скачать локальную копию
          </Button>
          <Button
            onClick={async () => {
              const all = await api("/templates"),
                fresh = all.find((x: Json) => x.id === initial.id);
              revision.current = fresh.revision;
              setError("");
            }}
          >
            Использовать серверную ревизию для сохранения моей копии
          </Button>
        </div>
      )}
      {restore && (
        <div className="notice">
          <p>На устройстве есть несохранённая редакция шаблона.</p>
          <Button
            onClick={() => {
              apply(restore.template);
              setRestore(null);
            }}
          >
            Восстановить
          </Button>
          <Button
            onClick={() => {
              setRestore(null);
              localSet("template:" + initial.id, { template: t, dirty: false });
            }}
          >
            Оставить серверную
          </Button>
        </div>
      )}
      <div className="designer-layout">
        <aside className="panel template-library">
          <div className="inspector-tabs">
            {["Шаблоны", "Элементы"].map((x) => (
              <button
                key={x}
                className={leftTab === x ? "active" : ""}
                onClick={() => setLeftTab(x)}
              >
                {x}
              </button>
            ))}
          </div>
          {leftTab === "Шаблоны" ? (
            <>
              {[
                ["diploma", "Дипломы"],
                ["commendation", "Грамоты"],
                ["certificate", "Сертификаты"],
                ["thanks", "Благодарности"],
              ].map(([kind, label]) => (
                <section key={kind}>
                  <h3>{label}</h3>
                  <div className="mini-templates">
                    {templates
                      .filter((x: Json) => x.kind === kind)
                      .slice(0, 4)
                      .map((x: AwardTemplate) => (
                        <button
                          key={x.id}
                          className={x.id === t.id ? "selected" : ""}
                          title={x.title}
                          onClick={() => {
                            apply({
                              ...structuredClone(x),
                              id: t.id,
                              owner: t.owner,
                              revision: revision.current,
                              title: t.title,
                            });
                          }}
                        >
                          <TemplateThumb template={x} />
                        </button>
                      ))}
                  </div>
                </section>
              ))}
            </>
          ) : (
            <p className="muted">
              Добавьте элемент, выберите его на листе и измените параметры
              справа.
            </p>
          )}
          <div className="element-buttons">
            {[
              ["text", "Текст", Type],
              ["field", "Поле", Square],
              ["image", "Изображение", Image],
              ["line", "Линия", Minus],
              ["rect", "Фигура", Square],
              ["qr", "QR-проверка", QrCode],
            ].map(([type, label, Icon]: any) => (
              <Button key={type} onClick={() => add(type)}>
                <Icon size={17} />
                {label}
              </Button>
            ))}
            <label className="button file-button">
              Загрузить фон
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const media = await upload(file);
                    change("backgroundImage", media.url);
                  }
                }}
              />
            </label>
          </div>
        </aside>
        <section className="canvas-workspace">
          <div className="ruler horizontal" aria-hidden="true">
            0　　　 50　　　 100　　　 150　　　 200　　　 250　　　 300
          </div>
          <div
            className="canvas-viewport"
            ref={viewport}
            onPointerMove={pointerMove}
            onPointerUp={() => {
              drag.current = null;
              setGuide(false);
            }}
          >
            <div
              className="paper-wrap"
              style={{
                width: t.width * 3.7795 * zoom,
                height: t.height * 3.7795 * zoom,
              }}
            >
              <div
                className="paper"
                style={{
                  width: t.width + "mm",
                  height: t.height + "mm",
                  background: t.background,
                  transform: `scale(${zoom})`,
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setSelected("");
                }}
              >
                {t.backgroundImage && (
                  <img
                    className="paper-background"
                    src={t.backgroundImage}
                    alt=""
                  />
                )}
                {t.elements.map((x) => (
                  <PaperElement
                    key={x.id}
                    element={x}
                    selected={x.id === selected}
                    scale={zoom}
                    onSelect={() => setSelected(x.id)}
                    onPointerDown={(e: React.PointerEvent) =>
                      pointerStart(e, x)
                    }
                    resize={(e: React.PointerEvent) =>
                      pointerStart(e, x, "resize")
                    }
                  />
                ))}
                {guide && <div className="alignment-guide" />}
              </div>
            </div>
          </div>
          <div className="canvas-bottom">
            <Select
              label="Формат"
              value={`${t.width}x${t.height}`}
              options={[
                ["297x210", "A4 · Альбомная"],
                ["210x297", "A4 · Книжная"],
                ["210x148", "A5 · Альбомная"],
                ["148x210", "A5 · Книжная"],
              ]}
              onChange={(x: string) => {
                const [width, height] = x.split("x").map(Number),
                  sx = width / t.width,
                  sy = height / t.height;
                apply({
                  ...t,
                  width,
                  height,
                  backgroundImage:
                    t.backgroundVariants?.[
                      width > height ? "landscape" : "portrait"
                    ] || t.backgroundImage,
                  elements: t.elements.map((el) => ({
                    ...el,
                    x: el.x * sx,
                    y: el.y * sy,
                    width: el.width * sx,
                    height: el.height * sy,
                  })),
                });
              }}
            />
            <div className="actions">
              <IconButton
                title="Уменьшить"
                onClick={() => setZoom((x) => Math.max(0.2, x - 0.1))}
              >
                <ZoomOut size={18} />
              </IconButton>
              <span>{Math.round(zoom * 100)}%</span>
              <IconButton
                title="Увеличить"
                onClick={() => setZoom((x) => Math.min(1.5, x + 0.1))}
              >
                <ZoomIn size={18} />
              </IconButton>
            </div>
          </div>
        </section>
        <aside className="panel inspector document-inspector">
          {el ? (
            <>
              <h2>
                {el.type === "field"
                  ? "Поле: " +
                    (FIELD_NAMES[
                      el.text?.replace(/[{}]/g, "") as keyof typeof FIELD_NAMES
                    ] || "текст")
                  : "Элемент документа"}
              </h2>
              {["text", "field"].includes(el.type) && (
                <>
                  {el.type === "field" && (
                    <Select
                      label="Подставляемое поле"
                      value={el.text.replace(/[{}]/g, "")}
                      options={Object.entries(FIELD_NAMES)}
                      onChange={(x: string) => edit("text", "{" + x + "}")}
                    />
                  )}
                  <details className="text-composition">
                    <summary>Составной текст и поля</summary>
                    <Textarea
                      label="Текст / сочетание полей"
                      value={humanize(el.text)}
                      onChange={(x: string) => edit("text", internalize(x))}
                      rows={2}
                    />
                  </details>
                  <Select
                    label="Шрифт"
                    value={el.font}
                    options={["PT Serif", "PT Sans", "Noto Sans", "Noto Serif"]}
                    onChange={(x: string) => edit("font", x)}
                  />
                  <div className="two">
                    <Input
                      label="Размер, пт"
                      type="number"
                      min="6"
                      max="120"
                      value={el.size}
                      onChange={(x: number) => edit("size", x)}
                    />
                    <Input
                      label="Цвет текста"
                      type="color"
                      value={el.color}
                      onChange={(x: string) => edit("color", x)}
                    />
                  </div>
                  <div className="format-buttons">
                    {[
                      ["bold", "Ж"],
                      ["italic", "К"],
                      ["underline", "Ч"],
                    ].map(([key, label]) => (
                      <button
                        className={el[key] ? "active" : ""}
                        key={key}
                        onClick={() => edit(key, !el[key])}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <Select
                    label="Выравнивание"
                    value={el.align}
                    options={[
                      ["left", "Слева"],
                      ["center", "По центру"],
                      ["right", "Справа"],
                    ]}
                    onChange={(x: string) => edit("align", x)}
                  />
                  <Toggle
                    label="Уменьшать для длинного текста"
                    value={el.autoFit !== false}
                    onChange={(x: boolean) => edit("autoFit", x)}
                  />
                </>
              )}
              {el.type === "image" && (
                <MediaPicker
                  label="Изображение"
                  value={el.src || ""}
                  onChange={(x: string) => edit("src", x)}
                />
              )}
              <h3>Позиция и размер, мм</h3>
              <div className="two">
                {[
                  ["x", "X"],
                  ["y", "Y"],
                  ["width", "Ширина"],
                  ["height", "Высота"],
                ].map(([key, label]) => (
                  <Input
                    key={key}
                    label={label}
                    type="number"
                    step="0.1"
                    value={Math.round(el[key] * 10) / 10}
                    onChange={(x: number) => edit(key, x)}
                  />
                ))}
              </div>
              <div className="two">
                <Input
                  label="Поворот, °"
                  type="number"
                  value={el.rotation || 0}
                  onChange={(x: number) => edit("rotation", x)}
                />
                <Input
                  label="Непрозрачность"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={el.opacity ?? 1}
                  onChange={(x: number) => edit("opacity", x)}
                />
              </div>
              {["rect", "line"].includes(el.type) && (
                <>
                  <Input
                    label="Цвет контура"
                    type="color"
                    value={el.stroke || "#005b43"}
                    onChange={(x: string) => edit("stroke", x)}
                  />
                  <Input
                    label="Толщина, мм"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={el.lineWidth || 0.3}
                    onChange={(x: number) => edit("lineWidth", x)}
                  />
                  {el.type === "rect" && (
                    <Input
                      label="Цвет заливки"
                      type="color"
                      value={el.fill === "transparent" ? "#ffffff" : el.fill}
                      onChange={(x: string) => edit("fill", x)}
                    />
                  )}
                </>
              )}
              <div className="actions">
                <IconButton
                  title="По центру страницы"
                  onClick={() => edit("x", (t.width - el.width) / 2)}
                >
                  <AlignCenter size={18} />
                </IconButton>
                <IconButton
                  title={el.locked ? "Разблокировать" : "Заблокировать"}
                  onClick={() => edit("locked", !el.locked)}
                >
                  {el.locked ? <Unlock size={18} /> : <Lock size={18} />}
                </IconButton>
                <IconButton
                  title="Дублировать"
                  onClick={() => {
                    const copy = {
                      ...structuredClone(el),
                      id: uid("el"),
                      x: el.x + 3,
                      y: el.y + 3,
                      locked: false,
                    };
                    apply({ ...t, elements: [...t.elements, copy] });
                    setSelected(copy.id);
                  }}
                >
                  <Copy size={18} />
                </IconButton>
                <IconButton
                  title="Удалить"
                  disabled={el.locked}
                  onClick={remove}
                >
                  <Trash2 size={18} />
                </IconButton>
              </div>
            </>
          ) : (
            <>
              <h2>Параметры шаблона</h2>
              <Input
                label="Название"
                value={t.title}
                onChange={(x: string) => change("title", x)}
              />
              <Input
                label="Фон листа"
                type="color"
                value={t.background}
                onChange={(x: string) => change("background", x)}
              />
            </>
          )}
          <section className="layers">
            <h3>Слои</h3>
            {[...t.elements].reverse().map((x) => (
              <div
                className={"layer " + (x.id === selected ? "selected" : "")}
                key={x.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", x.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const key = e.dataTransfer.getData("text/plain"),
                    list = [...t.elements],
                    from = list.findIndex((a) => a.id === key),
                    to = list.findIndex((a) => a.id === x.id);
                  if (from < 0 || to < 0) return;
                  const [item] = list.splice(from, 1);
                  list.splice(to, 0, item);
                  apply({ ...t, elements: list });
                }}
              >
                <button onClick={() => setSelected(x.id)}>
                  <Type size={14} />
                  <span>
                    {x.type === "field"
                      ? FIELD_NAMES[
                          x.text.replace(
                            /[{}]/g,
                            "",
                          ) as keyof typeof FIELD_NAMES
                        ] || x.text
                      : x.type === "image"
                        ? "Изображение"
                        : x.text || "Фигура"}
                  </span>
                  {x.locked && <Lock size={13} />}
                </button>
                <IconButton
                  title={x.hidden ? "Показать слой" : "Скрыть слой"}
                  onClick={() =>
                    apply({
                      ...t,
                      elements: t.elements.map((a) =>
                        a.id === x.id ? { ...a, hidden: !a.hidden } : a,
                      ),
                    })
                  }
                >
                  {x.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </IconButton>
              </div>
            ))}
          </section>
        </aside>
      </div>
      {previewing && (
        <Modal
          title="Предпросмотр документа"
          wide
          onClose={() => setPreviewing(false)}
        >
          <Select
            label="Участник для предпросмотра"
            value=""
            options={[
              ["", "Ввести данные вручную"],
              ...sampleParticipants.map((a) => [
                a.id,
                a.fullName + " · " + a.event,
              ]),
            ]}
            onChange={(id: string) => {
              const value = sampleParticipants.find((a) => a.id === id);
              if (value) setSample({ ...fields, ...value });
            }}
          />
          <div className="document-sample-stage">
            <div
              className="paper"
              style={{
                width: t.width + "mm",
                height: t.height + "mm",
                background: t.background,
                transform: `scale(${Math.min(0.65, 650 / (t.width * 3.7795))})`,
              }}
            >
              {t.backgroundImage && (
                <img
                  className="paper-background"
                  src={t.backgroundImage}
                  alt=""
                />
              )}
              {t.elements.map((element) => (
                <PaperElement
                  key={element.id}
                  element={element}
                  preview
                  data={sample}
                />
              ))}
            </div>
          </div>
          <div className="two">
            {Object.entries(FIELD_NAMES).map(([key, label]) => (
              <Input
                key={key}
                label={label}
                value={sample[key] || ""}
                onChange={(x: string) => setSample({ ...sample, [key]: x })}
              />
            ))}
          </div>
          <Button
            kind="primary"
            onClick={async () =>
              download(
                await blobRequest("/templates/" + t.id + "/preview", {
                  fields: sample,
                }),
                "Предпросмотр документа.pdf",
              )
            }
          >
            Проверить в PDF
          </Button>
          <p className="muted">
            Система проверит, помещается ли текст в каждый блок.
          </p>
        </Modal>
      )}
    </div>
  );
}
