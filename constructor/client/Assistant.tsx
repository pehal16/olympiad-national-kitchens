import { useEffect, useRef, useState } from "react";
import { blankQuestion } from "../shared/authoring.js";
import { maxSourceLength } from "../shared/assistant.mjs";
import type { Question } from "../shared/types";
import { api } from "./api";
import { Button, Input, Modal, Textarea, Toggle } from "./ui";

type Draft = {
  title: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  evidence: string;
};
type Job =
  | { state: "queued" | "running" }
  | { state: "ready"; draft: Draft; sourceTitle: string }
  | { state: "failed" | "cancelled"; error?: string };

export function AssistantQuestion({
  projectId,
  onInsert,
}: {
  projectId: string;
  onInsert: (question: Question) => void;
}) {
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
      <Button onClick={() => setOpen(true)}>ИИ-помощник</Button>
      {open && (
        <AssistantDialog
          path={"/projects/" + encodeURIComponent(projectId) + "/assistant"}
          onClose={() => setOpen(false)}
          onInsert={onInsert}
        />
      )}
    </>
  );
}

function AssistantDialog({
  path,
  onClose,
  onInsert,
}: {
  path: string;
  onClose: () => void;
  onInsert: (question: Question) => void;
}) {
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [topic, setTopic] = useState("");
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(false);
  const current = useRef("");
  const dismiss = (id: string) =>
    api(path + "/" + id, {}, "DELETE").catch(() => {});

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (current.current)
        api(path + "/" + current.current, {}, "DELETE").catch(() => {});
    };
  }, [path]);

  const waiting = job?.state === "queued" || job?.state === "running";
  useEffect(() => {
    if (!jobId || !waiting) return;
    let ignore = false;
    let timer: number;
    async function poll() {
      try {
        const next: Job = await api(path + "/" + jobId);
        if (ignore) return;
        setError("");
        setJob(next);
        if (next.state !== "queued" && next.state !== "running") return;
      } catch (e: any) {
        if (ignore) return;
        if (e.status === 404 || e.status === 401 || e.status === 503) {
          setJob({ state: "failed", error: e.message });
          return;
        }
        setError("Связь с кабинетом прервалась. Проверяем, готов ли черновик.");
      }
      timer = window.setTimeout(poll, 1800);
    }
    void poll();
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [jobId, waiting, path]);

  async function submit() {
    if (current.current) {
      void dismiss(current.current);
      current.current = "";
    }
    setError("");
    setReviewed(false);
    setJob(null);
    setJobId("");
    try {
      const created = await api(path, { sourceTitle, sourceText, topic });
      if (!alive.current) {
        void dismiss(created.id);
        return;
      }
      current.current = created.id;
      setJobId(created.id);
      setJob({ state: "queued" });
    } catch (e: any) {
      if (alive.current) setError(e.message);
    }
  }

  function insert() {
    if (job?.state !== "ready" || !reviewed) return;
    const { draft, sourceTitle: documentTitle } = job;
    const question = blankQuestion("single_choice") as Question;
    const options = draft.options.map((label, index) => ({
      id: "o" + (index + 1),
      label,
    }));
    onInsert({
      ...question,
      title: draft.prompt,
      internal: { ...question.internal, label: draft.title },
      source: `${documentTitle}\n«${draft.evidence}»`,
      config: { ...question.config, options },
      key: { optionId: options[draft.correctIndex].id },
    });
    onClose();
  }

  return (
    <Modal title="ИИ-помощник" onClose={onClose}>
      {job?.state === "ready" ? (
        <>
          <h3>{job.draft.title}</h3>
          <p>{job.draft.prompt}</p>
          <ol>
            {job.draft.options.map((option, index) => (
              <li key={index}>
                {option}
                {index === job.draft.correctIndex && (
                  <strong> · предлагаемый ответ</strong>
                )}
              </li>
            ))}
          </ol>
          <div className="notice">
            <strong>{job.sourceTitle}</strong>
            <p>«{job.draft.evidence}»</p>
          </div>
          <Toggle
            label="Я проверил условие, варианты и правильный ответ"
            value={reviewed}
            onChange={setReviewed}
          />
          <div className="actions">
            <Button onClick={() => setJob(null)}>
              Изменить исходные данные
            </Button>
            <Button kind="primary" disabled={!reviewed} onClick={insert}>
              Добавить в тур
            </Button>
          </div>
        </>
      ) : (
        <>
          <p>
            Помощник предложит один вопрос с четырьмя вариантами. Вставьте
            фрагмент учебного материала без персональных данных для обработки на
            компьютере колледжа.
          </p>
          <Input
            label="Название материала"
            value={sourceTitle}
            onChange={setSourceTitle}
            maxLength={200}
            disabled={waiting}
          />
          <Textarea
            label="Фрагмент материала"
            value={sourceText}
            onChange={setSourceText}
            maxLength={maxSourceLength}
            rows={6}
            disabled={waiting}
          />
          <Input
            label="На чём сделать акцент (необязательно)"
            value={topic}
            onChange={setTopic}
            maxLength={200}
            disabled={waiting}
          />
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
          {waiting && (
            <p role="status">
              {job?.state === "running"
                ? "Помощник составляет черновик…"
                : "Ожидаем компьютер колледжа…"}
            </p>
          )}
          <div className="actions">
            {waiting ? (
              <Button onClick={onClose}>Отменить запрос</Button>
            ) : (
              <Button
                kind="primary"
                disabled={!sourceTitle.trim() || sourceText.trim().length < 60}
                onClick={submit}
              >
                Подготовить черновик
              </Button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
