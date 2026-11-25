import { useEffect, useRef, useState } from "react";
import { assistantQuestions } from "../shared/authoring.js";
import { maxInstructionLength } from "../shared/assistant.mjs";
import type { Question } from "../shared/types";
import { api } from "./api";
import { Button, Modal, Textarea } from "./ui";

type TestDraft = {
  title: string;
  questions: {
    title: string;
    prompt: string;
    options: string[];
    correctIndex: number;
  }[];
};

type Job =
  | { state: "queued" | "running" }
  | { state: "ready"; test: TestDraft }
  | { state: "failed" | "cancelled"; error?: string };

type Destination =
  | { projectId: string; onInsert: (questions: Question[]) => void }
  | { projectId?: undefined; onCreate: (projectId: string) => Promise<void> };

export function AssistantTest(destination: Destination) {
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
        {destination.projectId ? "ИИ-помощник" : "Создать тест с ИИ"}
      </Button>
      {open && (
        <AssistantDialog {...destination} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function AssistantDialog({
  onClose,
  ...destination
}: Destination & { onClose: () => void }) {
  const path = destination.projectId
    ? "/projects/" + encodeURIComponent(destination.projectId) + "/assistant"
    : "/assistant/tests";
  const [instruction, setInstruction] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [jobId, setJobId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(false);
  const current = useRef("");

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
        if ([401, 404, 503].includes(e.status)) {
          setJob({ state: "failed", error: e.message });
          return;
        }
        setError("Связь прервалась. Проверяем готовность теста…");
      }
      timer = window.setTimeout(poll, 1300);
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
    setJob(null);
    setJobId("");
    try {
      if (current.current) {
        await api(path + "/" + current.current, {}, "DELETE").catch(() => {});
        current.current = "";
      }
      if (!alive.current) return;
      const created = await api(path, { instruction: instruction.trim() });
      if (!alive.current) {
        void api(path + "/" + created.id, {}, "DELETE").catch(() => {});
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
        destination.onInsert(assistantQuestions(job.test) as Question[]);
      } else {
        const project = await api(path + "/" + jobId + "/project", {});
        await destination.onCreate(project.id);
      }
      if (alive.current) onClose();
    } catch (e: any) {
      if (alive.current) setError(e.message);
    } finally {
      if (alive.current) setSaving(false);
    }
  }

  return (
    <Modal title="ИИ-помощник" onClose={() => !saving && onClose()}>
      {job?.state === "ready" ? (
        <>
          <h3>{job.test.title}</h3>
          <p className="muted">Проверьте вопросы и ответы перед сохранением.</p>
          <ol className="assistant-questions">
            {job.test.questions.map((question) => (
              <li key={question.prompt}>
                <strong>{question.prompt}</strong>
                <ul>
                  {question.options.map((option, index) => (
                    <li key={option}>
                      {option}
                      {index === question.correctIndex && (
                        <strong> · верный ответ по версии ИИ</strong>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="actions assistant-preview-actions">
            <Button disabled={saving} onClick={() => setJob(null)}>
              Изменить запрос
            </Button>
            <Button kind="primary" disabled={saving} onClick={accept}>
              {saving
                ? "Сохраняем…"
                : destination.projectId
                  ? "Добавить в тур"
                  : "Создать тест"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Textarea
            label="Какой тест составить?"
            placeholder="Например, составь 10 вопросов по дрожжевому тесту для студентов первого курса."
            value={instruction}
            onChange={setInstruction}
            maxLength={maxInstructionLength}
            rows={4}
            disabled={waiting || submitting}
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
          {(waiting || submitting) && (
            <p role="status">
              {job?.state === "running"
                ? "Составляем тест…"
                : "Отправляем запрос помощнику…"}
            </p>
          )}
          <div className="actions">
            {waiting || submitting ? (
              <Button onClick={onClose}>Отменить запрос</Button>
            ) : (
              <Button
                kind="primary"
                disabled={!instruction.trim()}
                onClick={submit}
              >
                Составить тест
              </Button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
