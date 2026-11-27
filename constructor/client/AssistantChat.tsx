import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  MessageCircle,
  Paperclip,
  Plus,
  Send,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { maxChatMessage } from "../shared/assistant-chat.mjs";
import { maxWorkFiles } from "../shared/assistant-work.mjs";
import { AssistantPreview, type Work } from "./Assistant";
import { api } from "./api";
import { MathText } from "./MathText";
import { Button, IconButton } from "./ui";
import "./assistant-chat.css";

type Link = { id: string; title: string };
type Turn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  attachments?: string[];
  projects?: Link[];
};
type Proposal = (
  | { action: "create" | "add"; work: Work; roundTitle?: string }
  | {
      action: "update";
      changes: {
        label: string;
        location: string;
        previous: string;
        value: string;
      }[];
    }
) & { id: string; target?: Link };
type Thread = Link & {
  target: Link | null;
  messages: Turn[];
  proposal?: Proposal;
  pending?: { state: string; progress?: { block: number; total: number } };
};

const route = "/assistant/chats";
const working = (thread: Thread | null) =>
  thread?.pending?.state === "queued" || thread?.pending?.state === "running";

function Draft({
  proposal,
  disabled,
  onApply,
}: {
  proposal: Proposal;
  disabled: boolean;
  onApply: () => void;
}) {
  return (
    <section className="chat-draft" aria-label="Предпросмотр изменений">
      {proposal.target && (
        <p className="muted">
          {proposal.target.title}
          {proposal.action === "add" && proposal.roundTitle
            ? " · " + proposal.roundTitle
            : ""}
        </p>
      )}
      {proposal.action === "update" ? (
        <>
          <h3>Изменения в работе</h3>
          <dl className="chat-changes">
            {proposal.changes.map((change, index) => (
              <div key={index}>
                <dt>
                  {change.label} · {change.location}
                </dt>
                <dd>
                  <span>Было</span>
                  <p>{change.previous || "—"}</p>
                </dd>
                <dd>
                  <span>Будет</span>
                  <p>{change.value || "—"}</p>
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <AssistantPreview work={proposal.work} />
      )}
      <Button kind="primary" disabled={disabled} onClick={onApply}>
        {proposal.action === "create"
          ? "Сохранить черновик"
          : "Применить к работе"}
      </Button>
    </section>
  );
}

export default function AssistantChat({
  initialProject,
  onOpen,
}: {
  initialProject: string;
  onOpen: (id: string) => void;
}) {
  const initialThread =
    new URLSearchParams(location.search).get("thread") || "";
  const [thread, setThread] = useState<Thread | null>(null);
  const [threads, setThreads] = useState<Link[]>([]);
  const [projects, setProjects] = useState<Link[]>([]);
  const [selected, setSelected] = useState(initialProject);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<boolean | null>(null);
  const [historyOnline, setHistoryOnline] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(initialThread));
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const active = useRef(initialThread);
  const transcript = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);

  function setAddress(id: string) {
    const url = new URL(location.href);
    url.searchParams.set("view", "chat");
    if (id) url.searchParams.set("thread", id);
    else url.searchParams.delete("thread");
    history.replaceState(null, "", url);
  }

  async function open(id: string) {
    active.current = id;
    setThread(null);
    setMessage("");
    setFiles([]);
    setError("");
    setHistoryOpen(false);
    setDeleting(false);
    setLoading(Boolean(id));
    setAddress(id);
    if (!id) {
      setSelected(initialProject);
      return;
    }
    await loadThread(id);
  }

  async function loadThread(id: string, live = () => true) {
    try {
      const value: Thread = await api(route + "/" + id);
      if (live() && active.current === id) {
        setThread(value);
        setSelected(value.target?.id || "");
        setError("");
      }
    } catch (e) {
      if (live() && active.current === id) setError((e as Error).message);
    } finally {
      if (live() && active.current === id) setLoading(false);
    }
  }

  useEffect(() => {
    let live = true;
    const report = (e: unknown) => {
      if (live) setError((e as Error).message);
    };
    api("/projects")
      .then((value: Link[]) => {
        if (live) setProjects(value);
      })
      .catch(report);
    const heartbeat = () =>
      api("/assistant/status")
        .then((value) => {
          if (!live) return;
          setStatus(value.chatOnline === true);
          setHistoryOnline(value.historyOnline === true);
        })
        .catch(() => {
          if (!live) return;
          setStatus(false);
          setHistoryOnline(false);
        });
    void heartbeat();
    const timer = window.setInterval(heartbeat, 12_000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (historyOnline === null) return;
    if (!historyOnline) {
      setThreads([]);
      setThread(null);
      setDeleting(false);
      setLoading(false);
      return;
    }
    let live = true;
    api(route)
      .then((value: Link[]) => {
        if (live) setThreads(value);
      })
      .catch((e) => {
        if (live) setError((e as Error).message);
      });
    if (active.current) {
      setLoading(true);
      void loadThread(active.current, () => live);
    }
    return () => {
      live = false;
    };
  }, [historyOnline]);

  const isWorking = working(thread);
  const threadId = thread?.id;
  useEffect(() => {
    if (!threadId || !isWorking || !historyOnline) return;
    let live = true;
    let timer: number;
    const poll = async () => {
      try {
        const value: Thread = await api(route + "/" + threadId);
        if (!live || active.current !== threadId) return;
        setThread(value);
        if (value.target?.id) setSelected(value.target.id);
        if (!working(value)) {
          setError("");
          return;
        }
      } catch (e) {
        if (!live || active.current !== threadId) return;
        setError((e as Error).message);
      }
      timer = window.setTimeout(poll, 1800);
    };
    timer = window.setTimeout(poll, 800);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [threadId, isWorking, historyOnline]);

  const lastMessage = thread?.messages.at(-1)?.id;
  useEffect(() => {
    const box = transcript.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [threadId, lastMessage, thread?.proposal?.id]);

  function receive(value: Thread) {
    active.current = value.id;
    setThread(value);
    setSelected(value.target?.id || "");
    setAddress(value.id);
    setThreads((current) => [
      { id: value.id, title: value.title },
      ...current.filter((item) => item.id !== value.id),
    ]);
  }

  async function submit() {
    if (
      busy ||
      loading ||
      isWorking ||
      !status ||
      (!message.trim() && !files.length)
    )
      return;
    setBusy(true);
    setError("");
    const target = thread?.id;
    const form = new FormData();
    form.set("instruction", message);
    form.set("projectId", selected);
    for (const file of files) form.append("lectures", file);
    try {
      receive(
        await api(route + (target ? "/" + target : "") + "/message", form),
      );
      setMessage("");
      setFiles([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      composer.current?.focus();
    }
  }

  async function runAction(action: string, method = "POST") {
    if (busy || !thread) return;
    setError("");
    setBusy(true);
    try {
      const value = await api(route + "/" + thread.id + action, {}, method);
      if (method === "DELETE") {
        setThreads((current) =>
          current.filter((item) => item.id !== thread.id),
        );
        await open("");
      } else {
        receive(value);
        if (action.startsWith("/apply/")) {
          setProjects(await api("/projects"));
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function attach(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list).filter(
      (file) =>
        !files.some(
          (existing) =>
            existing.name === file.name && existing.size === file.size,
        ),
    );
    if (
      files.length + incoming.length > maxWorkFiles ||
      incoming.some((file) => file.size > 5 * 1024 * 1024)
    ) {
      setError("Можно прикрепить до пяти файлов по 5 МБ каждый.");
    } else {
      setFiles([...files, ...incoming]);
      setError("");
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  const targetOptions =
    thread?.target &&
    !projects.some((project) => project.id === thread.target?.id)
      ? [thread.target, ...projects]
      : projects;
  const progress = thread?.pending?.progress;
  const suggestion = (text: string) => {
    setMessage(text);
    composer.current?.focus();
  };

  return (
    <div className="chat-layout">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-top">
          <Button
            disabled={busy}
            onClick={() => {
              void open("");
              composer.current?.focus();
            }}
          >
            <Plus size={17} /> Новый чат
          </Button>
          <button
            type="button"
            className="button chat-history-toggle"
            aria-expanded={historyOpen}
            aria-controls="assistant-chat-list"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            История
          </button>
        </div>
        <div
          id="assistant-chat-list"
          className={"chat-thread-list" + (historyOpen ? " open" : "")}
        >
          {historyOnline === false ? (
            <p className="muted">История сейчас недоступна.</p>
          ) : threads.length ? (
            threads.map((item) => (
              <button
                type="button"
                key={item.id}
                disabled={busy}
                aria-current={item.id === threadId ? "true" : undefined}
                onClick={() => void open(item.id)}
                title={item.title}
              >
                <MessageCircle size={16} />
                <span>{item.title}</span>
              </button>
            ))
          ) : (
            <p className="muted">Здесь появятся ваши чаты.</p>
          )}
        </div>
      </aside>
      <section className="chat-panel" aria-label="ИИ-чат преподавателя">
        <header className="chat-header">
          <div>
            <h1>ИИ-чат</h1>
            <span className={status ? "chat-connected" : "muted"}>
              {status === null
                ? "Проверяем подключение…"
                : status
                  ? "Подключён"
                  : historyOnline
                    ? "История подключена · модель недоступна"
                    : "Компьютер колледжа недоступен"}
            </span>
          </div>
          {thread && (
            <IconButton
              title="Удалить чат"
              disabled={busy}
              onClick={() => setDeleting(!deleting)}
            >
              <Trash2 size={18} />
            </IconButton>
          )}
        </header>
        {deleting && (
          <div className="chat-confirm">
            <span>Удалить переписку этого чата?</span>
            <Button
              disabled={busy}
              onClick={() => void runAction("", "DELETE")}
            >
              Удалить
            </Button>
            <Button disabled={busy} onClick={() => setDeleting(false)}>
              Отмена
            </Button>
          </div>
        )}
        <div className="chat-transcript" ref={transcript}>
          {historyOnline === false ? (
            <p role="status">
              История хранится на компьютере колледжа и появится после его
              подключения.
            </p>
          ) : loading ? (
            <p role="status">Открываем чат…</p>
          ) : !thread?.messages.length ? (
            <div className="chat-welcome">
              <h2>Что подготовим?</h2>
              <p>
                Дайте поручение своими словами, прикрепите лекции или выберите
                работу, которую хотите проверить или изменить.
              </p>
              <div className="chat-suggestions">
                <Button
                  onClick={() =>
                    suggestion(
                      "Составь 5 вопросов по мясу, 10 по дрожжевому тесту и 2 интерактивных задания по горячим блюдам.",
                    )
                  }
                >
                  Составить задания
                </Button>
                <Button
                  onClick={() =>
                    suggestion(
                      "Проверь выбранную работу. Сколько в ней заданий и что нужно исправить?",
                    )
                  }
                >
                  Проверить работу
                </Button>
                <Button
                  onClick={() =>
                    suggestion(
                      "Предложи план урока и варианты задания для самостоятельной работы по теме ",
                    )
                  }
                >
                  Обсудить тему
                </Button>
              </div>
            </div>
          ) : (
            thread.messages.map((turn) => (
              <article
                className={"chat-turn chat-turn-" + turn.role}
                key={turn.id}
              >
                <h2>{turn.role === "user" ? "Вы" : "Помощник"}</h2>
                <p>
                  <MathText text={turn.text} />
                </p>
                {turn.attachments?.length ? (
                  <ul className="chat-attachments">
                    {turn.attachments.map((file, index) => (
                      <li key={index}>
                        <Paperclip size={14} /> {file}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {turn.projects?.map((project) => (
                  <Button
                    key={project.id}
                    title={"Открыть «" + project.title + "»"}
                    onClick={() => onOpen(project.id)}
                  >
                    {project.title} <ArrowUpRight size={16} />
                  </Button>
                ))}
              </article>
            ))
          )}
          {isWorking && (
            <div className="chat-activity" role="status">
              {progress
                ? `Готовлю и проверяю блок ${progress.block} из ${progress.total}…`
                : thread?.pending?.state === "queued"
                  ? "Запрос в очереди…"
                  : "Помощник работает…"}
            </div>
          )}
          {thread?.proposal && (
            <Draft
              key={thread.proposal.id}
              proposal={thread.proposal}
              disabled={busy || Boolean(thread.pending)}
              onApply={() => void runAction("/apply/" + thread.proposal!.id)}
            />
          )}
        </div>
        <form
          className="chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="chat-target">
            <span>Работа для чата</span>
            <select
              value={selected}
              disabled={busy || loading || isWorking}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">Без привязки</option>
              {targetOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </label>
          {files.length > 0 && (
            <ul className="chat-attachments chat-uploaded">
              {files.map((file, index) => (
                <li key={file.name + index}>
                  <span>{file.name}</span>
                  <IconButton
                    title={"Убрать " + file.name}
                    disabled={busy}
                    onClick={() =>
                      setFiles(files.filter((_, i) => i !== index))
                    }
                  >
                    <X size={15} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <textarea
            aria-label="Сообщение помощнику"
            ref={composer}
            rows={3}
            maxLength={maxChatMessage}
            placeholder={
              thread?.pending?.state === "clarify"
                ? "Ответьте на уточнение…"
                : "Напишите поручение или вопрос…"
            }
            value={message}
            disabled={busy && !isWorking}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                void submit();
              }
            }}
          />
          <div className="chat-composer-actions">
            <input
              type="file"
              hidden
              ref={fileInput}
              multiple
              accept=".pdf,.docx,.txt,.md"
              onChange={(event) => attach(event.target.files)}
            />
            <Button
              title="PDF, DOCX, TXT или MD"
              disabled={busy || loading || isWorking}
              onClick={() => fileInput.current?.click()}
            >
              <Paperclip size={17} /> Лекции
            </Button>
            {thread?.pending && (
              <Button disabled={busy} onClick={() => void runAction("/cancel")}>
                <Square size={14} /> Остановить
              </Button>
            )}
            <Button
              type="submit"
              kind="primary chat-send"
              disabled={
                !status ||
                busy ||
                loading ||
                isWorking ||
                (!message.trim() && !files.length)
              }
            >
              <Send size={17} /> Отправить
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
