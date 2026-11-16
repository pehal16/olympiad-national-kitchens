import { uid as localId } from "../shared/catalog";
import {
  useRef,
  useState,
  useId,
  useEffect,
  isValidElement,
  cloneElement,
} from "react";
import type { ReactNode } from "react";
import { Plus, Trash2, Upload, X, LoaderCircle } from "lucide-react";
import { upload } from "./api";
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const generated = useId();
  const control: any = isValidElement(children) ? children : null;
  const fieldId = control?.props.id || generated;
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      {control
        ? cloneElement<any>(control, {
            id: fieldId,
            ...(hint ? { "aria-describedby": fieldId + "-hint" } : {}),
          })
        : children}
      {hint && <small id={fieldId + "-hint"}>{hint}</small>}
    </div>
  );
}
export function Input({
  label,
  value,
  onChange,
  type = "text",
  hint,
  ...rest
}: any) {
  return (
    <Field label={label} hint={hint}>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) =>
          onChange(type === "number" ? Number(e.target.value) : e.target.value)
        }
        {...rest}
      />
    </Field>
  );
}
export function Textarea({ label, value, onChange, rows = 4, ...rest }: any) {
  return (
    <Field label={label}>
      <textarea
        rows={rows}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </Field>
  );
}
export function Select({ label, value, onChange, options, ...rest }: any) {
  return (
    <Field label={label}>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      >
        {options.map((x: any) => {
          const row = Array.isArray(x) ? x : [x, x];
          return (
            <option key={row[0]} value={row[0]}>
              {row[1]}
            </option>
          );
        })}
      </select>
    </Field>
  );
}
export function Toggle({
  label,
  value,
  onChange,
  hint,
  disabled = false,
}: any) {
  return (
    <label className="toggle">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input
        type="checkbox"
        disabled={disabled}
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  );
}
export function Button({
  children,
  onClick,
  kind = "",
  disabled = false,
  type = "button",
  title,
}: any) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type={type}
      title={title}
      className={"button " + kind}
      disabled={disabled || busy}
      onClick={async (e) => {
        try {
          const result = onClick?.(e);
          if (result?.then) {
            setBusy(true);
            await result;
          }
        } catch (error) {
          window.dispatchEvent(
            new CustomEvent("constructor-error", { detail: error }),
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <LoaderCircle size={17} className="spin" /> : null}
      {children}
    </button>
  );
}
export function IconButton({ title, children, onClick, disabled }: any) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className="icon-button"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const controls = () =>
      Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, a[href], [tabindex="0"]',
        ) || [],
      ).filter((x) => x.offsetParent !== null);
    controls()
      .find((x) => !x.classList.contains("icon-button"))
      ?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key !== "Tab") return;
      const items = controls(),
        first = items[0],
        last = items[items.length - 1];
      if (!first) {
        e.preventDefault();
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const node = dialog.current;
    node?.addEventListener("keydown", key);
    return () => {
      node?.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop">
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={"modal " + (wide ? "wide" : "")}
      >
        <header>
          <h2>{title}</h2>
          <IconButton title="Закрыть" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </header>
        {children}
      </section>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function MediaPicker({
  label,
  value,
  onChange,
  accept = "image/png,image/jpeg,image/webp",
  mime = "image/webp",
}: any) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="media-picker">
      <span>{label}</span>
      {value &&
        (mime.startsWith("image/") ? (
          <img src={value} alt={label} />
        ) : (
          <p>
            Файл прикреплён:{" "}
            {mime.startsWith("audio/")
              ? "аудио"
              : mime.startsWith("video/")
                ? "видео"
                : "документ"}
          </p>
        ))}
      <input
        ref={ref}
        type="file"
        accept={accept}
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            setBusy(true);
            const m = await upload(file);
            onChange(m.url, m);
          } catch (error) {
            window.dispatchEvent(
              new CustomEvent("constructor-error", { detail: error }),
            );
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      <div className="actions">
        <Button disabled={busy} onClick={() => ref.current?.click()}>
          <Upload size={16} />
          {busy ? "Загружаем…" : value ? "Заменить" : "Загрузить"}
        </Button>
        {value && (
          <IconButton title="Убрать изображение" onClick={() => onChange("")}>
            <Trash2 size={16} />
          </IconButton>
        )}
      </div>
    </div>
  );
}
export function ItemRows({ label, items, onChange, renderExtra }: any) {
  return (
    <section className="item-rows">
      <h3>{label}</h3>
      {items.map((item: any, i: number) => (
        <div className="item-row" key={item.id}>
          <input
            aria-label={`${label}: ${i + 1}`}
            value={item.label || ""}
            onChange={(e) =>
              onChange(
                items.map((x: any, j: number) =>
                  j === i ? { ...x, label: e.target.value } : x,
                ),
              )
            }
          />
          {renderExtra?.(item, i)}
          <IconButton
            title="Удалить строку"
            onClick={() =>
              onChange(items.filter((_: any, j: number) => j !== i))
            }
          >
            <Trash2 size={15} />
          </IconButton>
        </div>
      ))}
      <Button
        onClick={() =>
          onChange([...items, { id: localId("local"), label: "" }])
        }
      >
        <Plus size={16} />
        Добавить
      </Button>
    </section>
  );
}
