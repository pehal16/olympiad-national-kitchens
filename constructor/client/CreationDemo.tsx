import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react";
import type { Question } from "../shared/types";
import { TYPES } from "../shared/catalog";
import {
  blankQuestion,
  COMMON_TYPES,
  TYPE_HINTS,
} from "../shared/authoring.js";
import { QuestionEditor } from "./QuestionEditor";
import { Task } from "./Tasks";
import { Button, Input, Textarea, Modal, IconButton } from "./ui";

const STORAGE_KEY = "nko_constructor_creation_demo_v1";
const LIMIT = 10;
type Draft = { title: string; description: string; questions: Question[] };
const fresh = (): Draft => ({
  title: "Моя первая олимпиада",
  description: "",
  questions: [blankQuestion() as Question],
});
function readDraft(): Draft {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (
      value?.version === 1 &&
      typeof value.title === "string" &&
      typeof value.description === "string" &&
      Array.isArray(value.questions) &&
      value.questions.length > 0 &&
      value.questions.length <= LIMIT &&
      value.questions.every(
        (q: Question) =>
          q &&
          typeof q.id === "string" &&
          typeof q.title === "string" &&
          COMMON_TYPES.includes(q.type) &&
          q.config &&
          q.key &&
          Array.isArray(q.media) &&
          Array.isArray(q.rubric) &&
          (!q.config.options || Array.isArray(q.config.options)) &&
          (!q.config.items || Array.isArray(q.config.items)) &&
          (!q.config.targets || Array.isArray(q.config.targets)),
      )
    )
      return value;
  } catch {}
  return fresh();
}

export default function CreationDemo() {
  const [draft, setDraft] = useState<Draft>(readDraft);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [reset, setReset] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const q = draft.questions[selected];
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...draft, version: 1 }),
      );
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }, [draft]);
  const go = (next: number) => {
    setStep(next);
    window.scrollTo(0, 0);
  };
  const changeQuestion = (change: any) =>
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((item) =>
        item.id === q.id
          ? typeof change === "function"
            ? change(item)
            : change
          : item,
      ),
    }));
  return (
    <div className="admin-shell creation-demo">
      <header className="app-header">
        <a className="brand" href="/constructor/">
          <BookOpen size={32} />
          <strong>Конструктор олимпиад</strong>
        </a>
        <a className="button" href="/constructor/">
          Войти в кабинет
        </a>
      </header>
      <main className="creation-demo-main">
        <div className="creation-demo-intro">
          <span className="creation-demo-badge">
            Демонстрация · без регистрации
          </span>
          <h1>Создайте свою первую олимпиаду</h1>
          <p>
            Задайте название, составьте вопросы и посмотрите, как их увидит
            участник.
          </p>
          <p className="muted" role="status">
            {storageAvailable
              ? "Черновик сохраняется только в этой вкладке браузера."
              : "Браузер запретил сохранение. Черновик доступен до обновления страницы."}{" "}
            Для проведения и выдачи наград нужен кабинет преподавателя.
          </p>
        </div>
        <nav className="creation-demo-steps" aria-label="Этапы демонстрации">
          {["Название", "Задания", "Предпросмотр"].map((label, i) => (
            <Button
              key={label}
              kind={step === i ? "primary" : ""}
              onClick={() => go(i)}
            >
              {i + 1}. {label}
            </Button>
          ))}
        </nav>
        {step === 0 ? (
          <section className="panel creation-demo-name">
            <h2>С чего начнём?</h2>
            <Input
              label="Название олимпиады"
              value={draft.title}
              maxLength={180}
              onChange={(title: string) => setDraft((v) => ({ ...v, title }))}
            />
            <Textarea
              label="Описание для участников (необязательно)"
              value={draft.description}
              rows={3}
              maxLength={2000}
              onChange={(description: string) =>
                setDraft((v) => ({ ...v, description }))
              }
            />
            <Button kind="primary" onClick={() => go(1)}>
              Далее: добавить задания <ArrowRight size={18} />
            </Button>
          </section>
        ) : (
          <div className="creation-demo-workspace">
            <aside className="panel creation-demo-outline">
              <h2>
                Задания{" "}
                <span className="muted">
                  {draft.questions.length}/{LIMIT}
                </span>
              </h2>
              <ol>
                {draft.questions.map((item, i) => (
                  <li key={item.id}>
                    <button
                      className={selected === i ? "active" : ""}
                      aria-current={selected === i ? "true" : undefined}
                      onClick={() => setSelected(i)}
                    >
                      {i + 1}. {item.title.trim() || "Новое задание"}
                    </button>
                  </li>
                ))}
              </ol>
              <Button
                disabled={draft.questions.length >= LIMIT}
                onClick={() => {
                  const next = blankQuestion() as Question;
                  setDraft((current) => ({
                    ...current,
                    questions: [...current.questions, next],
                  }));
                  setSelected(draft.questions.length);
                  setStep(1);
                }}
              >
                <Plus size={18} />
                Добавить задание
              </Button>
              <p className="muted">
                В демонстрации — шесть основных типов и до десяти заданий. В
                кабинете доступен полный конструктор.
              </p>
            </aside>
            <section className="panel creation-demo-canvas">
              {step === 1 ? (
                <>
                  <div className="creation-demo-task-head">
                    <h2>Задание {selected + 1}</h2>
                    <IconButton
                      title="Удалить задание"
                      disabled={draft.questions.length === 1}
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Удалить это задание из демонстрационного черновика?",
                          )
                        )
                          return;
                        setDraft((current) => ({
                          ...current,
                          questions: current.questions.filter(
                            (item) => item.id !== q.id,
                          ),
                        }));
                        setSelected(Math.max(0, selected - 1));
                      }}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </div>
                  <p className="muted">
                    {TYPE_HINTS[q.type as keyof typeof TYPE_HINTS]}
                  </p>
                  <QuestionEditor
                    key={q.id}
                    q={q}
                    onChange={changeQuestion}
                    guided
                    allowMedia={false}
                    typeOptions={COMMON_TYPES.map((type) => [
                      type,
                      TYPES[type as keyof typeof TYPES],
                    ])}
                  />
                  <div className="creation-demo-task-actions">
                    <Button
                      kind="primary"
                      onClick={() => {
                        setAnswers({});
                        go(2);
                      }}
                    >
                      Посмотреть как участник <ArrowRight size={18} />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <span className="creation-demo-badge">
                    Вид участника · пробный ответ
                  </span>
                  <h2>{draft.title.trim() || "Олимпиада"}</h2>
                  {draft.description && <p>{draft.description}</p>}
                  <hr />
                  <h3>
                    {selected + 1}.{" "}
                    {q.title.trim() || "Добавьте текст задания на шаге 2"}
                  </h3>
                  <Task
                    key={q.id}
                    q={q}
                    value={answers[q.id]}
                    onChange={(value) =>
                      setAnswers((current) => ({ ...current, [q.id]: value }))
                    }
                  />
                  <p className="muted">
                    Можно попробовать ответить. Результат не отправляется и не
                    оценивается; ключи в этом представлении скрыты.
                  </p>
                  <div className="creation-demo-task-actions">
                    <Button onClick={() => go(1)}>
                      <ArrowLeft size={18} />
                      Вернуться к редактированию
                    </Button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
        <footer className="creation-demo-footer">
          <Button kind="quiet" onClick={() => setReset(true)}>
            <RotateCcw size={17} />
            Начать заново
          </Button>
          <a className="button primary" href="/constructor/">
            Перейти в кабинет преподавателя <ArrowRight size={18} />
          </a>
        </footer>
      </main>
      {reset && (
        <Modal
          title="Начать демонстрацию заново?"
          onClose={() => setReset(false)}
        >
          <p>Название и задания из этой вкладки будут удалены.</p>
          <div className="creation-demo-task-actions">
            <Button onClick={() => setReset(false)}>Сохранить черновик</Button>
            <Button
              kind="danger"
              onClick={() => {
                setDraft(fresh());
                setSelected(0);
                setAnswers({});
                go(0);
                setReset(false);
              }}
            >
              Начать заново
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
