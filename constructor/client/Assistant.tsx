import { useEffect, useRef, useState } from "react";
import { assistantRounds } from "../shared/authoring.js";
import { maxWorkFiles, maxWorkInstruction } from "../shared/assistant-work.mjs";
import type { Round } from "../shared/types";
import { api } from "./api";
import { Button, Modal, Textarea } from "./ui";

type Placement = "selected" | "new_rounds";
type Source = {
  title: string;
  kind: string;
  url?: string;
  locator?: string;
  quote?: string;
};
type Item = {
  title: string;
  prompt: string;
  type: "single_choice" | "matching" | "ordering" | "classification";
  items: string[];
  targets: string[];
  answer: number[];
  explanation: string;
  evidence?: Source;
};
type Group = {
  title: string;
  workTitle: string;
  questions: Item[];
  reviewed: boolean;
  standard?: Source;
  standardStatus: string;
  sources: Source[];
  comparisons: { lecture: Source; reference: Source; remark: string }[];
};
type Work = { title: string; placement: Placement; groups: Group[] };
type Job =
  | { state: "queued" | "running"; progress?: { block: number; total: number } }
  | { state: "clarify"; question: string }
  | { state: "ready"; work: Work }
  | { state: "failed" | "cancelled"; error?: string };

type Destination =
  | {
      projectId: string;
      onInsert: (rounds: Round[], placement: Placement) => void;
    }
  | { projectId?: undefined; onCreate: (projectId: string) => Promise<void> };

export function AssistantWork(destination: Destination) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let ignore = false;
    api("/assistant/status")
      .then((status) => {
        if (!ignore) setEnabled(status.enabled === true);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);
  if (!enabled) return null;
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        {destination.projectId ? "ИИ-помощник" : "Создать работу с ИИ"}
      </Button>
      {open && (
        <AssistantDialog {...destination} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

const sourceKinds: Record<string, string> = {
  lecture: "Загруженный материал",
  textbook: "Открытый учебник",
  official: "Официальный источник",
  standard: "Опубликованный ФГОС",
  standard_excerpt: "Сохранённая выдержка ФГОС",
  registry: "Реестр",
  catalog: "Каталог или ссылка для поиска",
};
const types = {
  single_choice: "Один ответ",
  matching: "Соответствие",
  ordering: "Последовательность",
  classification: "Классификация",
};
const standardStatus: Record<string, string> = {
  no_program:
    "Для сверки ФГОС укажите код специальности или приложите ссылку на приказ.",
  ambiguous:
    "В материалах несколько кодов специальностей. Уточните, какой ФГОС применять.",
  unavailable: "Текст ФГОС не удалось получить.",
  registry: "Найдена запись в реестре. Для сверки требований нужен текст ФГОС.",
  text: "Получен текст ФГОС. К этому блоку не подобрана подтверждённая привязка.",
  excerpt:
    "Есть выдержка опубликованной редакции. Проверьте её применимость к вашей группе.",
};

function SourceQuote({ source }: { source: Source }) {
  return (
    <blockquote className="assistant-quote">
      {source.quote && <p>«{source.quote}»</p>}
      {source.url ? (
        <a href={source.url} target="_blank" rel="noreferrer">
          {source.title}
        </a>
      ) : (
        source.title
      )}
      {source.locator && " · " + source.locator}
    </blockquote>
  );
}

function Answer({ item }: { item: Item }) {
  if (item.type === "ordering") {
    return (
      <ol>
        {item.answer.map((index) => (
          <li key={index}>{item.items[index]}</li>
        ))}
      </ol>
    );
  }
  return (
    <ul>
      {item.items.map((label, index) => (
        <li key={label}>
          {label}
          {item.type === "single_choice" ? (
            item.answer[0] === index && <strong> · предполагаемый ответ</strong>
          ) : (
            <strong> → {item.targets[item.answer[index]]}</strong>
          )}
        </li>
      ))}
    </ul>
  );
}

function Preview({ work }: { work: Work }) {
  return (
    <>
      <h3>{work.title}</h3>
      <p className="muted">Посмотрите ключи и источники перед сохранением.</p>
      {work.groups.map((group, index) => (
        <section className="assistant-block" key={index}>
          <h4>{group.title}</h4>
          {group.workTitle !== work.title && (
            <p className="muted">{group.workTitle}</p>
          )}
          <p className="muted">
            {group.reviewed
              ? "Ответы перепроверены моделью."
              : "Повторная проверка моделью не завершилась."}{" "}
            Опора найдена для{" "}
            {group.questions.filter((item) => item.evidence).length} из{" "}
            {group.questions.length} заданий.
          </p>
          <details>
            <summary>Задания и ключи · {group.questions.length}</summary>
            <ol className="assistant-questions">
              {group.questions.map((item, index) => (
                <li key={index}>
                  <p className="muted">{types[item.type]}</p>
                  <strong>{item.prompt}</strong>
                  <Answer item={item} />
                  <p>{item.explanation}</p>
                  {item.evidence ? (
                    <SourceQuote source={item.evidence} />
                  ) : (
                    <p className="muted">Подтверждающий отрывок не найден.</p>
                  )}
                </li>
              ))}
            </ol>
          </details>
          <details>
            <summary>Источники и сверка</summary>
            {group.standard ? (
              <SourceQuote source={group.standard} />
            ) : (
              <p>{standardStatus[group.standardStatus]}</p>
            )}
            {group.sources.length > 0 && (
              <ul>
                {group.sources.map((source, i) => (
                  <li key={i}>
                    {sourceKinds[source.kind]} ·{" "}
                    {source.url ? (
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.title}
                      </a>
                    ) : (
                      source.title
                    )}
                    {source.locator && " · " + source.locator}
                  </li>
                ))}
              </ul>
            )}
            {group.comparisons.map((pair, i) => (
              <div key={i}>
                <p>{pair.remark}</p>
                <SourceQuote source={pair.lecture} />
                <SourceQuote source={pair.reference} />
              </div>
            ))}
          </details>
        </section>
      ))}
    </>
  );
}

function AssistantDialog({
  onClose,
  ...destination
}: Destination & { onClose: () => void }) {
  const path = destination.projectId
    ? "/projects/" +
      encodeURIComponent(destination.projectId) +
      "/assistant/work"
    : "/assistant/works";
  const [instruction, setInstruction] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [reply, setReply] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [jobId, setJobId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(false);
  const current = useRef("");

  function removeJob(id: string) {
    return api(path + "/" + id, {}, "DELETE").catch(() => {});
  }

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (current.current)
        api(path + "/" + current.current, {}, "DELETE").catch(() => {});
    };
  }, [path]);

  const waiting = job?.state === "queued" || job?.state === "running";
  const clarification = job?.state === "clarify";
  useEffect(() => {
    if (!jobId || !waiting) return;
    let ignore = false;
    let timer: number;
    async function poll() {
      try {
        const next: Job = await api(path + "/" + jobId);
        if (ignore) return;
        setJob(next);
        setError("");
        if (next.state !== "queued" && next.state !== "running") return;
      } catch (e: any) {
        if (ignore) return;
        if ([401, 404, 503].includes(e.status)) {
          setJob({ state: "failed", error: e.message });
          return;
        }
        setError("Связь прервалась. Проверяем состояние работы…");
      }
      timer = window.setTimeout(poll, 1600);
    }
    void poll();
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [jobId, waiting, path]);

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      let created;
      if (clarification) {
        created = await api(path + "/" + jobId + "/reply", {
          reply: reply.trim(),
        });
        if (alive.current) setReply("");
      } else {
        if (current.current) await removeJob(current.current);
        if (!alive.current) return;
        current.current = "";
        const form = new FormData();
        form.append("instruction", instruction.trim());
        files.forEach((file) => form.append("lectures", file));
        created = await api(path, form);
      }
      if (!alive.current) {
        void removeJob(created.id);
        return;
      }
      current.current = created.id;
      setJobId(created.id);
      setJob({ state: "queued" });
    } catch (e: any) {
      if (alive.current) setError(e.message);
    } finally {
      if (alive.current) setSubmitting(false);
    }
  }

  async function accept() {
    if (job?.state !== "ready" || saving) return;
    setSaving(true);
    setError("");
    try {
      if (destination.projectId !== undefined) {
        destination.onInsert(
          assistantRounds(job.work.groups) as Round[],
          job.work.placement,
        );
      } else {
        const created = await api(path + "/" + jobId + "/project", {});
        await destination.onCreate(created.id);
      }
      if (alive.current) onClose();
    } catch (e: any) {
      if (alive.current) setError(e.message);
    } finally {
      if (alive.current) setSaving(false);
    }
  }

  function attach(selected: FileList | null) {
    const additions = Array.from(selected || []);
    if (
      files.length + additions.length > maxWorkFiles ||
      additions.some((file) => file.size > 5 * 1024 * 1024)
    ) {
      setError("Можно прикрепить до пяти файлов по 5 МБ каждый.");
      return;
    }
    setFiles([...files, ...additions]);
    setError("");
  }

  function edit() {
    setJob(null);
    setError("");
    setReply("");
  }

  return (
    <Modal
      title="ИИ-помощник"
      wide={job?.state === "ready"}
      onClose={() => !saving && onClose()}
    >
      {job?.state === "ready" ? (
        <>
          <Preview work={job.work} />
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="actions assistant-preview-actions">
            <Button disabled={saving} onClick={edit}>
              Изменить поручение
            </Button>
            <Button kind="primary" disabled={saving} onClick={accept}>
              {saving
                ? "Сохраняем…"
                : destination.projectId
                  ? "Добавить в проект"
                  : "Сохранить черновик"}
            </Button>
          </div>
        </>
      ) : (
        <>
          {clarification ? (
            <>
              <p className="notice">{job.question}</p>
              <Textarea
                label="Ответ на уточнение"
                value={reply}
                onChange={setReply}
                maxLength={2500}
                rows={4}
                disabled={submitting}
              />
            </>
          ) : (
            <>
              <Textarea
                label="Что нужно подготовить?"
                value={instruction}
                placeholder="Например, 5 вопросов по мясу, 10 по тесту и 2 интерактивных задания по горячим блюдам."
                onChange={setInstruction}
                maxLength={maxWorkInstruction}
                rows={6}
                disabled={waiting || submitting}
              />
              <label className="field assistant-files">
                <span>Прикрепить лекции или учебные материалы</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.md"
                  disabled={waiting || submitting}
                  onChange={(e) => {
                    attach(e.currentTarget.files);
                    e.currentTarget.value = "";
                  }}
                />
                <small>PDF с текстом, DOCX, TXT или MD. До пяти файлов.</small>
              </label>
              {files.length > 0 && (
                <ul className="assistant-files-list">
                  {files.map((file, index) => (
                    <li key={index}>
                      <span>{file.name}</span>
                      <Button
                        disabled={waiting || submitting}
                        aria-label={"Убрать " + file.name}
                        onClick={() =>
                          setFiles(files.filter((_, i) => i !== index))
                        }
                      >
                        Убрать
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {job?.state === "failed" && (
            <p role="alert" className="error">
              {job.error}
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {(waiting || submitting) && (
            <p role="status">
              {waiting && job.progress
                ? "Подбираем источники и проверяем блок " +
                  job.progress.block +
                  " из " +
                  job.progress.total +
                  "…"
                : waiting
                  ? "Разбираем поручение…"
                  : "Передаём материалы…"}
            </p>
          )}
          <div className="actions">
            {waiting || submitting ? (
              <Button onClick={onClose}>Отменить запрос</Button>
            ) : (
              <>
                {clarification && (
                  <Button onClick={edit}>Изменить поручение</Button>
                )}
                <Button
                  kind="primary"
                  disabled={
                    clarification
                      ? !reply.trim()
                      : !instruction.trim() && !files.length
                  }
                  onClick={submit}
                >
                  {clarification ? "Продолжить" : "Подготовить работу"}
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
