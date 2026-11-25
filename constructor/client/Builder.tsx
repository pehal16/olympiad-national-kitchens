import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  ChevronRight,
  ChevronDown,
  Play,
  Check,
  BookOpen,
  GripVertical,
} from "lucide-react";
import type { Project, Question, Json } from "../shared/types";
import { TYPES, question, round, uid } from "../shared/catalog";
import { api, download, localGet, localSet } from "./api";
import {
  Button,
  Input,
  Textarea,
  Select,
  Toggle,
  IconButton,
  Modal,
  MediaPicker,
  Empty,
  Field,
} from "./ui";
import { QuestionEditor, QuestionInspector } from "./QuestionEditor";
import { Task } from "./Tasks";
import { Conduct } from "./Conduct";
import { AssistantWork } from "./Assistant";
import { GuidedSteps } from "./Guided";
import { blankQuestion } from "../shared/authoring.js";
export function Builder({
  initial,
  onBack,
  onRun,
  registerFlush,
}: {
  initial: Project;
  onBack: () => void;
  onRun: (id: string) => void;
  registerFlush: (fn: (() => Promise<void>) | null) => void;
}) {
  const [p, setP] = useState<Project>(initial),
    [tab, setTab] = useState("Общее"),
    [guided, setGuided] = useState(true),
    [step, setStep] = useState(0),
    [historyVersion, setHistoryVersion] = useState(0),
    [ri, setRi] = useState(0),
    [qi, setQi] = useState(0),
    [inspector, setInspector] = useState("Задание"),
    [saved, setSaved] = useState("Черновик сохранён"),
    [error, setError] = useState(""),
    [issues, setIssues] = useState<string[]>([]),
    [preview, setPreview] = useState(false),
    [bank, setBank] = useState<Json[] | null>(null),
    [templates, setTemplates] = useState<Json[]>([]),
    [restore, setRestore] = useState<any>(null);
  const [detailedIssues, setDetailedIssues] = useState<any[]>([]),
    [runs, setRuns] = useState<any[]>([]);
  const [focusIssue, setFocusIssue] = useState<any>(null);
  useEffect(() => {
    if (!focusIssue) return;
    const timer = window.setTimeout(() => {
      const area = document.querySelector(
        focusIssue.field === "conduct" || !focusIssue.roundId
          ? ".guided-form"
          : !focusIssue.questionId
            ? ".guided-outline"
            : ["rubric", "maxScore", "seconds"].includes(focusIssue.field) &&
                window.innerWidth <= 700
              ? ".guided-mobile-inspector"
              : ".guided-canvas",
      );
      if (!area) return;
      const fields = Array.from(
        area.querySelectorAll<HTMLElement>("input,textarea,select"),
      );
      const label = (x: HTMLElement) =>
        x.getAttribute("aria-label") ||
        x.closest(".field")?.querySelector("label")?.textContent ||
        "";
      const field = focusIssue.field;
      const target =
        field === "options"
          ? fields.find((x) => label(x).startsWith("Вариант"))
          : field === "key"
            ? fields.find((x) =>
                /Правильный|Допустимые|Эталон/.test(label(x)),
              ) || fields.find((x) => !x.closest(".editor-title"))
            : field === "rubric"
              ? fields.find((x) => label(x).startsWith("Баллы по критерию"))
              : field === "maxScore"
                ? fields.find((x) => label(x) === "Баллы")
                : field === "seconds"
                  ? fields.find((x) => label(x).includes("Время задания"))
                  : !focusIssue.questionId
                    ? fields.find((x) => label(x) === "Название") || fields[0]
                    : fields.find((x) => x.tagName === "TEXTAREA");
      if (target) {
        let parent = target.parentElement;
        while (parent && parent !== area) {
          if (parent instanceof HTMLDetailsElement) parent.open = true;
          parent = parent.parentElement;
        }
        target.focus();
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      setFocusIssue(null);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [focusIssue, step]);
  const prepareOperation = useRef<{ revision: number; id: string } | null>(
    null,
  );
  const undoStack = useRef<Project[]>([]),
    redoStack = useRef<Project[]>([]);
  const steps = ["Название", "Задания", "Условия", "Проверка", "Проведение"];
  const stepTabs = [
    "Общее",
    "Туры и задания",
    "Условия",
    "Проверка",
    "Проведение",
  ];
  const ref = useRef(p),
    revision = useRef(initial.revision),
    sequence = useRef(0),
    dirty = useRef(false),
    savePromise = useRef<Promise<void> | null>(null),
    conflict = useRef(false);
  const persistLocal = useCallback(
    () =>
      localSet("project:" + initial.id, {
        project: ref.current,
        baseRevision: revision.current,
        dirty: dirty.current,
        time: Date.now(),
      }),
    [initial.id],
  );
  const save = useCallback(async () => {
    if (savePromise.current) await savePromise.current;
    if (!dirty.current || conflict.current) return;
    const seq = sequence.current,
      snapshot = structuredClone(ref.current);
    setSaved("Сохраняем…");
    const task = async () => {
      try {
        const result = await api(
          "/projects/" + initial.id,
          { project: snapshot, expectedRevision: revision.current },
          "PUT",
        );
        revision.current = result.revision;
        if (seq === sequence.current) dirty.current = false;
        setSaved(
          dirty.current ? "Есть несохранённые изменения" : "Черновик сохранён",
        );
        await persistLocal();
      } catch (e: any) {
        setError(e.message);
        setSaved("Сохранение не подтверждено");
        if (e.status === 409) conflict.current = true;
        await persistLocal();
        throw e;
      } finally {
        savePromise.current = null;
      }
    };
    savePromise.current = task();
    await savePromise.current;
  }, [initial.id, persistLocal]);
  const flush = useCallback(async () => {
    await save();
    if (dirty.current && !conflict.current) await save();
    if (dirty.current)
      throw new Error(
        "Сначала сохраните изменения или разрешите конфликт версий.",
      );
  }, [save]);
  useEffect(() => {
    registerFlush(flush);
    return () => registerFlush(null);
  }, [registerFlush, flush]);
  useEffect(() => {
    localGet("project:" + initial.id).then((v) => {
      if (v?.dirty) setRestore(v);
    });
    api("/me/preferences")
      .then((v: any) => setGuided(v.authoringMode !== "full"))
      .catch(() =>
        localGet("builder-view").then((v) => {
          if (v?.guided === false) setGuided(false);
        }),
      );
    api("/runs")
      .then((v: any[]) =>
        setRuns(v.filter((x) => x.projectId === initial.id && !x.trial)),
      )
      .catch(() => {});
    api("/templates")
      .then(setTemplates)
      .catch(() => {});
  }, [initial.id]);
  useEffect(() => {
    if (!dirty.current || restore) return;
    persistLocal();
    const timer = setTimeout(() => save().catch(() => {}), 850);
    return () => clearTimeout(timer);
  }, [p, save, persistLocal, restore]);
  useEffect(() => {
    const stop = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", stop);
    return () => window.removeEventListener("beforeunload", stop);
  }, []);
  const applyEdit = (next: Project) => {
    ref.current = next;
    dirty.current = true;
    sequence.current++;
    setP(next);
    setSaved("Есть несохранённые изменения");
  };
  const lastEdit = useRef({ at: 0, target: "" });
  const update = (value: Project | ((current: Project) => Project)) => {
    const next = typeof value === "function" ? value(ref.current) : value;
    const active = document.activeElement as HTMLElement;
    const target = active?.id || active?.getAttribute("aria-label") || "";
    const typing =
      ["INPUT", "TEXTAREA"].includes(active?.tagName) && Boolean(target);
    if (
      !typing ||
      target !== lastEdit.current.target ||
      Date.now() - lastEdit.current.at > 1200
    )
      undoStack.current = [
        ...undoStack.current.slice(-19),
        structuredClone(ref.current),
      ];
    lastEdit.current = { at: Date.now(), target: typing ? target : "" };
    redoStack.current = [];
    applyEdit(next);
    setHistoryVersion((v) => v + 1);
  };
  const travel = (back: boolean) => {
    lastEdit.current = { at: 0, target: "" };
    const source = back ? undoStack : redoStack;
    const target = back ? redoStack : undoStack;
    const next = source.current.pop();
    if (!next) return;
    target.current.push(structuredClone(ref.current));
    applyEdit(next);
    setRi(0);
    setQi(0);
    setHistoryVersion((v) => v + 1);
  };
  const field = (key: string, value: any) =>
    update({ ...ref.current, [key]: value });
  const setAwardRules = (rules: Json[]) => {
    const fields = (p.conductDefaults as any)?.registrationFields || [
      "fullName",
      "groupName",
    ];
    update({
      ...p,
      awardRules: rules,
      ...(rules.some((x) => x.recipient === "mentor")
        ? {
            conductDefaults: {
              ...(p.conductDefaults as any),
              registrationFields: [...new Set([...fields, "mentorName"])],
            },
          }
        : {}),
    });
  };
  const r = p.rounds[ri],
    q = r?.questions[qi];
  const updateRound = (value: any) => {
    const current = ref.current;
    if (!current.rounds.some((x) => x.id === r?.id)) return;
    update({
      ...current,
      rounds: current.rounds.map((x) =>
        x.id === r.id ? (typeof value === "function" ? value(x) : value) : x,
      ),
    });
  };
  const updateQuestion = (value: any) => {
    const current = ref.current,
      targetId = typeof value === "function" ? q?.id : value.id;
    if (!current.rounds.some((r) => r.questions.some((q) => q.id === targetId)))
      return;
    update({
      ...current,
      rounds: current.rounds.map((r) => ({
        ...r,
        questions: r.questions.map((item) =>
          item.id === targetId
            ? typeof value === "function"
              ? value(item)
              : value
            : item,
        ),
      })),
    });
  };
  const addQuestion = (type = "single_choice") => {
    const next = blankQuestion(type) as Question;
    if (type === "single_choice") next.key = { optionId: "" };
    if (type === "multiple_choice") next.key = { optionIds: [] };
    if (type === "short_text") next.key = { acceptedAnswers: [] };
    if (next.config.options)
      next.config.options = next.config.options.map((o: Json) => ({
        ...o,
        label: "",
      }));
    updateRound({ ...r, questions: [...r.questions, next] });
    setQi(r.questions.length);
  };
  const moveRound = (from: number, to: number) => {
    if (to < 0 || to >= p.rounds.length) return;
    const rounds = [...p.rounds];
    rounds.splice(to, 0, rounds.splice(from, 1)[0]);
    update({ ...p, rounds });
    setRi(to);
    setQi(0);
  };
  const moveQuestion = (from: number, to: number) => {
    if (to < 0 || to >= r.questions.length) return;
    const questions = [...r.questions];
    questions.splice(to, 0, questions.splice(from, 1)[0]);
    updateRound({ ...r, questions });
    setQi(to);
  };
  const publish = async () => {
    if (!(await check())) return;
    await api("/projects/" + p.id + "/publish", {
      expectedRevision: revision.current,
    });
    setSaved("Редакция опубликована");
    setTab("Проведение");
  };
  const trial = async () => {
    await flush();
    const run = await api("/projects/" + p.id + "/trial", {});
    window.open("/constructor/play/" + run.id, "_blank", "noopener");
  };
  const check = async () => {
    await flush();
    const checkedSequence = sequence.current;
    const result = await api("/projects/" + p.id + "/check", {});
    if (sequence.current !== checkedSequence) {
      setSaved("Работа изменилась во время проверки. Проверьте её ещё раз.");
      return false;
    }
    setIssues(result.errors);
    setDetailedIssues(result.issues || []);
    setSaved(
      result.errors.length
        ? "Нужно дополнить работу"
        : "Проверка пройдена: работу можно проводить",
    );
    return result.errors.length === 0;
  };
  const prepare = async () => {
    if (!(await check())) {
      setStep(3);
      setTab("Проверка");
      return;
    }
    if (prepareOperation.current?.revision !== revision.current)
      prepareOperation.current = {
        revision: revision.current,
        id: uid("prepare"),
      };
    const result = await api("/projects/" + p.id + "/prepare-run", {
      operationId: prepareOperation.current.id,
      expectedRevision: revision.current,
      settings: {
        entryMode: "open",
        registrationFields: ["fullName", "groupName"],
        ...ref.current.conductDefaults,
      },
    });
    onRun(result.runId);
  };
  const goStep = (i: number) => {
    setStep(i);
    setTab(stepTabs[i]);
  };
  return (
    <div className={"builder " + (guided ? "is-guided" : "")}>
      <div className="page-toolbar">
        <div className="toolbar-title">
          <IconButton
            title="К проектам"
            onClick={async () => {
              try {
                await flush();
                onBack();
              } catch (e: any) {
                setError(e.message);
              }
            }}
          >
            <ArrowLeft size={22} />
          </IconButton>
          <h1>{p.title || "Новая олимпиада"}</h1>
          <small role="status">{saved}</small>
        </div>
        {!guided && (
          <div className="actions">
            <Button onClick={trial}>
              <Play size={18} />
              Пробное прохождение
            </Button>
            <Button kind="primary" onClick={publish}>
              <Check size={18} />
              Проверить и опубликовать
            </Button>
          </div>
        )}
      </div>
      {error && (
        <div className="error" role="alert">
          <p>{error}</p>
          <div className="actions">
            <Button
              onClick={() =>
                download(
                  new Blob([JSON.stringify(ref.current, null, 2)], {
                    type: "application/json",
                  }),
                  "Локальная копия проекта.json",
                )
              }
            >
              Скачать локальную копию
            </Button>
            <Button
              onClick={async () => {
                const latest = await api("/projects/" + p.id);
                revision.current = latest.revision;
                ref.current = latest;
                dirty.current = false;
                conflict.current = false;
                setP(latest);
                setError("");
                await persistLocal();
              }}
            >
              Загрузить серверную версию
            </Button>
            <Button
              onClick={async () => {
                const latest = await api("/projects/" + p.id);
                revision.current = latest.revision;
                conflict.current = false;
                await save();
                setError("");
              }}
            >
              Сохранить мою копию поверх серверной
            </Button>
          </div>
        </div>
      )}
      {restore && (
        <div className="notice">
          <p>
            На устройстве осталась несохранённая копия.{" "}
            {restore.baseRevision !== initial.revision
              ? "Серверная редакция уже изменилась."
              : ""}
          </p>
          <div className="actions">
            <Button
              onClick={() => {
                update({ ...restore.project, revision: revision.current });
                setRestore(null);
              }}
            >
              Восстановить локальную копию
            </Button>
            <Button
              onClick={() => {
                setRestore(null);
                dirty.current = false;
                persistLocal();
              }}
            >
              Использовать серверную версию
            </Button>
            <Button
              onClick={() =>
                download(
                  new Blob([JSON.stringify(restore.project, null, 2)]),
                  "Копия проекта.json",
                )
              }
            >
              Скачать копию
            </Button>
          </div>
        </div>
      )}
      {!guided && issues.length > 0 && (
        <div className="error">
          <h3>Перед публикацией</h3>
          <ul>
            {issues.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="actions" data-history-version={historyVersion}>
        <Button
          onClick={() => {
            const next = !guided;
            setGuided(next);
            if (!next) setTab("Туры и задания");
            else goStep(step);
            localSet("builder-view", { guided: next });
            api(
              "/me/preferences",
              { authoringMode: next ? "guided" : "full" },
              "PUT",
            ).catch(() => {});
          }}
        >
          {guided ? "Все настройки" : "Пошаговая подготовка"}
        </Button>
        <Button
          disabled={!undoStack.current.length}
          onClick={() => travel(true)}
        >
          Отменить
        </Button>
        <Button
          disabled={!redoStack.current.length}
          onClick={() => travel(false)}
        >
          Повторить
        </Button>
        {(guided ? step === 1 : tab === "Туры и задания") && (
          <AssistantWork
            key={r?.id || "new"}
            projectId={p.id}
            onInsert={(rounds, placement) => {
              const current = ref.current;
              const target = current.rounds.find((item) => item.id === r?.id);
              if (placement === "new_rounds" || !target) {
                update({ ...current, rounds: [...current.rounds, ...rounds] });
                setRi(current.rounds.length);
                setQi(0);
                return;
              }
              updateRound({
                ...target,
                questions: [...target.questions, ...rounds.flatMap((item) => item.questions)],
              });
              setQi(target.questions.length);
            }}
          />
        )}
      </div>
      {guided && (
        <nav className="section-tabs" aria-label="Шаги подготовки">
          {steps.map((label, i) => (
            <button
              key={label}
              data-step={i + 1}
              className={step === i ? "active" : ""}
              aria-current={step === i ? "step" : undefined}
              onClick={async () => {
                try {
                  await flush();
                  goStep(i);
                } catch (e: any) {
                  setError(e.message);
                }
              }}
            >
              {i + 1}. {label}
            </button>
          ))}
        </nav>
      )}
      {guided && (
        <p role="status">
          Шаг {step + 1} из 5 · {steps[step]}
        </p>
      )}
      {guided && (
        <GuidedSteps
          p={p}
          step={step}
          ri={ri}
          qi={qi}
          update={update}
          addQuestion={addQuestion}
          moveQuestion={moveQuestion}
          select={(i: number, j: number, issue?: any) => {
            setRi(i);
            setQi(j);
            goStep(
              issue?.field === "conduct" ? 2 : issue && !issue.roundId ? 0 : 1,
            );
            if (issue) setFocusIssue(issue);
          }}
          onPreview={() => setPreview(true)}
          editor={
            q && (
              <QuestionEditor
                key={q.id}
                q={q}
                guided
                cases={r.cases || []}
                onChange={updateQuestion}
              />
            )
          }
          inspector={
            q && (
              <QuestionInspector
                q={q}
                onChange={updateQuestion}
                onPreview={() => setPreview(true)}
                onBank={async () => {
                  await api("/questions", { question: q });
                  setSaved("Задание сохранено в банк");
                }}
              />
            )
          }
          roundInspector={
            r && (
              <RoundInspector
                r={r}
                onChange={updateRound}
                onDelete={() => {
                  if (
                    p.rounds.length > 1 &&
                    window.confirm(`Удалить тур «${r.title}»?`)
                  ) {
                    update({
                      ...p,
                      rounds: p.rounds.filter((_, i) => i !== ri),
                    });
                    setRi(0);
                    setQi(0);
                  }
                }}
              />
            )
          }
          awards={
            <AwardRules p={p} templates={templates} onChange={setAwardRules} />
          }
          templates={templates}
          check={check}
          issues={detailedIssues}
          trial={trial}
          prepare={prepare}
          runs={runs}
          onRun={onRun}
        />
      )}
      {guided && (
        <footer className="guided-footer">
          <Button disabled={step === 0} onClick={() => goStep(step - 1)}>
            Назад
          </Button>
          {step < 4 && (
            <Button
              kind="primary"
              disabled={step === 0 && !p.title.trim()}
              onClick={async () => {
                await flush();
                goStep(step + 1);
                if (step + 1 === 3) await check();
              }}
            >
              Далее: {steps[step + 1].toLowerCase()}
            </Button>
          )}
        </footer>
      )}
      {!guided && (
        <>
          <nav
            className="section-tabs"
            style={guided ? { display: "none" } : undefined}
          >
            {[
              "Общее",
              "Туры и задания",
              "Оформление",
              "Проведение",
              "Результаты",
              "Награды",
            ].map((x) => (
              <button
                key={x}
                className={tab === x ? "active" : ""}
                onClick={() => setTab(x)}
              >
                {x}
              </button>
            ))}
          </nav>
          {tab === "Общее" && (
            <section className="panel settings-content">
              <h2>Замысел и содержание</h2>
              <div className="two">
                <Input
                  label="Название"
                  value={p.title}
                  onChange={(x: string) => field("title", x)}
                />
                <Select
                  label="Формат"
                  value={p.kind}
                  options={[
                    ["olympiad", "Олимпиада"],
                    ["test", "Тестирование"],
                  ]}
                  onChange={(x: string) => field("kind", x)}
                />
                <Input
                  label="Дисциплина"
                  value={p.subject}
                  onChange={(x: string) => field("subject", x)}
                />
                <Input
                  label="Для кого"
                  value={p.audience}
                  onChange={(x: string) => field("audience", x)}
                />
              </div>
              <Textarea
                label="Описание для участника"
                value={p.description}
                onChange={(x: string) => field("description", x)}
              />
              <Textarea
                label="История и легенда"
                value={p.legend}
                onChange={(x: string) => field("legend", x)}
                rows={6}
              />
              <Textarea
                label="Текст после завершения"
                value={p.finalText}
                onChange={(x: string) => field("finalText", x)}
              />
            </section>
          )}
          {tab === "Оформление" && (
            <section className="panel settings-content">
              <h2>Оформление олимпиады</h2>
              <div className="two">
                <MediaPicker
                  label="Обложка"
                  value={p.cover}
                  onChange={(x: string) => field("cover", x)}
                />
                <div>
                  <Input
                    label="Основной цвет"
                    type="color"
                    value={p.theme?.accent || "#005b43"}
                    onChange={(x: string) =>
                      field("theme", { ...p.theme, accent: x })
                    }
                  />
                  <Input
                    label="Фон"
                    type="color"
                    value={p.theme?.background || "#f5f7f8"}
                    onChange={(x: string) =>
                      field("theme", { ...p.theme, background: x })
                    }
                  />
                </div>
              </div>
              <h2>Рассказчик</h2>
              <Toggle
                label="Использовать рассказчика"
                value={p.narrator?.enabled}
                onChange={(x: boolean) =>
                  field("narrator", { ...p.narrator, enabled: x })
                }
              />
              {p.narrator?.enabled && (
                <>
                  <MediaPicker
                    label="Изображение рассказчика"
                    value={p.narrator.image}
                    onChange={(x: string) =>
                      field("narrator", { ...p.narrator, image: x })
                    }
                  />
                  <Textarea
                    label="Приветствие"
                    value={p.narrator.intro}
                    onChange={(x: string) =>
                      field("narrator", { ...p.narrator, intro: x })
                    }
                  />
                  <Textarea
                    label="Нейтральная реакция на действие"
                    value={p.narrator.neutral}
                    onChange={(x: string) =>
                      field("narrator", { ...p.narrator, neutral: x })
                    }
                  />
                  <Textarea
                    label="Финальная реплика"
                    value={p.narrator.final}
                    onChange={(x: string) =>
                      field("narrator", { ...p.narrator, final: x })
                    }
                  />
                </>
              )}
            </section>
          )}
          {tab === "Туры и задания" && (
            <div className="builder-layout">
              <aside className="panel outline">
                <h2>Структура олимпиады</h2>
                {p.rounds.map((tour, i) => (
                  <div className="outline-round" key={tour.id}>
                    <button
                      className={"round-button " + (ri === i ? "active" : "")}
                      onClick={() => {
                        setRi(i);
                        setQi(0);
                      }}
                    >
                      <BookOpen size={20} />
                      <span>
                        <strong>
                          {i + 1}. {tour.title}
                        </strong>
                        <small>{tour.questions.length} заданий</small>
                      </span>
                      {ri === i ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                    {ri === i && (
                      <div className="outline-order">
                        <Button
                          disabled={i === 0}
                          onClick={() => moveRound(i, i - 1)}
                        >
                          ↑ Тур
                        </Button>
                        <Button
                          disabled={i === p.rounds.length - 1}
                          onClick={() => moveRound(i, i + 1)}
                        >
                          ↓ Тур
                        </Button>
                      </div>
                    )}
                    {ri === i &&
                      tour.questions.map((item, j) => (
                        <div
                          className="outline-item"
                          key={item.id}
                          draggable
                          onDragStart={(e) =>
                            e.dataTransfer.setData(
                              "text/constructor-question",
                              String(j),
                            )
                          }
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const from = e.dataTransfer.getData(
                              "text/constructor-question",
                            );
                            if (from !== "") moveQuestion(Number(from), j);
                          }}
                        >
                          <button
                            className={qi === j ? "active" : ""}
                            onClick={() => {
                              setQi(j);
                              setInspector("Задание");
                            }}
                          >
                            <span>
                              {j + 1}. {item.title}
                            </span>
                            <small>
                              {TYPES[item.type as keyof typeof TYPES]}
                            </small>
                          </button>
                          <IconButton
                            title="Переместить задание вверх"
                            disabled={j === 0}
                            onClick={() => moveQuestion(j, j - 1)}
                          >
                            ↑
                          </IconButton>
                          <IconButton
                            title="Переместить задание вниз"
                            disabled={j === tour.questions.length - 1}
                            onClick={() => moveQuestion(j, j + 1)}
                          >
                            ↓
                          </IconButton>
                          <IconButton
                            title="Дублировать задание"
                            onClick={() => {
                              const copy = structuredClone(item);
                              copy.id = uid("q");
                              copy.title += " — копия";
                              updateRound({
                                ...tour,
                                questions: [
                                  ...tour.questions.slice(0, j + 1),
                                  copy,
                                  ...tour.questions.slice(j + 1),
                                ],
                              });
                              setQi(j + 1);
                            }}
                          >
                            <Copy size={13} />
                          </IconButton>
                        </div>
                      ))}
                  </div>
                ))}
                <Button
                  onClick={() => {
                    update({ ...p, rounds: [...p.rounds, round()] });
                    setRi(p.rounds.length);
                    setQi(0);
                    setInspector("Тур");
                  }}
                >
                  <Plus size={17} />
                  Добавить тур
                </Button>
                <Button onClick={async () => setBank(await api("/questions"))}>
                  Добавить из банка
                </Button>
              </aside>
              <main className="panel work-canvas">
                {r ? (
                  <>
                    <div className="canvas-context">
                      {ri + 1}. {r.title} ·{" "}
                      {q
                        ? `Задание ${qi + 1} из ${r.questions.length}`
                        : "Пока нет заданий"}
                    </div>
                    {q ? (
                      <QuestionEditor
                        key={q.id}
                        q={q}
                        cases={r.cases || []}
                        onChange={updateQuestion}
                      />
                    ) : (
                      <Empty title="Добавьте первое задание">
                        <Button kind="primary" onClick={() => addQuestion()}>
                          Добавить задание
                        </Button>
                      </Empty>
                    )}
                    <div className="add-task">
                      <Select
                        label="Новое задание"
                        value=""
                        options={[
                          ["", "Выберите тип"],
                          ...Object.entries(TYPES),
                        ]}
                        onChange={(x: string) => {
                          if (x) addQuestion(x);
                        }}
                      />
                      {q && (
                        <Button
                          kind="danger quiet"
                          onClick={() => {
                            if (
                              !window.confirm(`Удалить задание «${q.title}»?`)
                            )
                              return;
                            updateRound({
                              ...r,
                              questions: r.questions.filter((_, i) => i !== qi),
                            });
                            setQi(Math.max(0, qi - 1));
                          }}
                        >
                          <Trash2 size={15} />
                          Удалить задание
                        </Button>
                      )}
                    </div>
                  </>
                ) : null}
              </main>
              <aside className="panel inspector">
                <div className="inspector-tabs">
                  {["Задание", "Тур"].map((x) => (
                    <button
                      key={x}
                      className={inspector === x ? "active" : ""}
                      onClick={() => setInspector(x)}
                    >
                      {x}
                    </button>
                  ))}
                </div>
                {inspector === "Задание" && q ? (
                  <QuestionInspector
                    q={q}
                    onChange={updateQuestion}
                    onPreview={() => setPreview(true)}
                    onBank={async () => {
                      await api("/questions", { question: q });
                      setSaved("Задание сохранено в банк");
                    }}
                  />
                ) : (
                  <RoundInspector
                    r={r}
                    onChange={updateRound}
                    onDelete={() => {
                      if (p.rounds.length === 1) return;
                      if (
                        !window.confirm(
                          `Удалить тур «${r.title}» и заданий: ${r.questions.length}?`,
                        )
                      )
                        return;
                      update({
                        ...p,
                        rounds: p.rounds.filter((_, i) => i !== ri),
                      });
                      setRi(Math.max(0, ri - 1));
                      setQi(0);
                    }}
                  />
                )}
              </aside>
            </div>
          )}
          {(tab === "Проведение" || tab === "Результаты") && (
            <Conduct
              projectId={p.id}
              initialView={tab === "Результаты" ? "results" : "runs"}
              onRun={onRun}
              beforeAction={flush}
            />
          )}
          {tab === "Награды" && (
            <AwardRules p={p} templates={templates} onChange={setAwardRules} />
          )}
        </>
      )}
      {preview && q && (
        <Modal
          title="Предпросмотр участника"
          wide
          onClose={() => setPreview(false)}
        >
          <h2>{q.title}</h2>
          <InteractivePreview q={q} />
          <p className="muted">
            Для сохранения ответов и проверки всего маршрута используйте пробное
            прохождение.
          </p>
        </Modal>
      )}
      {bank && (
        <Modal title="Добавить из банка" wide onClose={() => setBank(null)}>
          {bank.length ? (
            bank.map((item) => (
              <div key={item.id} className="bank-choice">
                <div>
                  <strong>{item.title}</strong>
                  <small>{TYPES[item.type as keyof typeof TYPES]}</small>
                </div>
                <Button
                  onClick={() => {
                    const copy = structuredClone(item) as Question;
                    copy.id = uid("q");
                    updateRound({ ...r, questions: [...r.questions, copy] });
                    setQi(r.questions.length);
                    setBank(null);
                  }}
                >
                  Добавить в тур
                </Button>
              </div>
            ))
          ) : (
            <p>Банк пока пуст. Сохраните задание из правой панели.</p>
          )}
        </Modal>
      )}
    </div>
  );
}
function RoundInspector({ r, onChange, onDelete }: any) {
  if (!r) return null;
  const set = (k: string, v: any) =>
    onChange((current: any) => ({ ...current, [k]: v }));
  return (
    <>
      <h2>Настройки тура</h2>
      <Input
        label="Название"
        value={r.title}
        onChange={(x: string) => set("title", x)}
      />
      <Textarea
        label="Инструкция перед туром"
        value={r.instructions}
        onChange={(x: string) => set("instructions", x)}
      />
      <Input
        label="Время тура, минут (0 — без лимита)"
        type="number"
        min="0"
        value={r.seconds / 60}
        step="0.5"
        onChange={(x: number) => set("seconds", Math.round(x * 60))}
      />
      <Input
        label="Открывается"
        type="datetime-local"
        value={r.availableFrom || ""}
        onChange={(x: string) => set("availableFrom", x)}
      />
      <Input
        label="Закрывается"
        type="datetime-local"
        value={r.availableUntil || ""}
        onChange={(x: string) => set("availableUntil", x)}
      />
      <Toggle
        label="Перемешивать задания"
        value={r.shuffle}
        onChange={(x: boolean) => set("shuffle", x)}
      />
      <Input
        label="Случайно выбрать заданий (0 — все)"
        type="number"
        min="0"
        value={r.selectCount || 0}
        onChange={(x: number) => set("selectCount", x)}
      />
      <Toggle
        label="Разрешить возврат"
        value={r.allowBack}
        onChange={(x: boolean) => set("allowBack", x)}
      />
      <Toggle
        label="Разрешить пропуск"
        value={r.allowSkip}
        onChange={(x: boolean) => set("allowSkip", x)}
      />
      <Select
        label="Переход в следующий тур"
        value={r.transition}
        options={[
          ["automatic", "После завершения"],
          ["threshold", "По балльному порогу"],
          ["manual", "После решения организатора"],
        ]}
        onChange={(x: string) => set("transition", x)}
      />
      {r.transition === "threshold" && (
        <Input
          label="Проходной балл"
          type="number"
          min="0"
          value={r.threshold || 0}
          onChange={(x: number) => set("threshold", x)}
        />
      )}
      <details>
        <summary>Кейсы внутри тура</summary>
        {(r.cases || []).map((c: Json) => (
          <div className="case-editor" key={c.id}>
            <Input
              label="Название кейса"
              value={c.title}
              onChange={(x: string) =>
                set(
                  "cases",
                  r.cases.map((a: Json) =>
                    a.id === c.id ? { ...a, title: x } : a,
                  ),
                )
              }
            />
            <Textarea
              label="Ситуация и исходные данные"
              value={c.text}
              onChange={(x: string) =>
                set(
                  "cases",
                  r.cases.map((a: Json) =>
                    a.id === c.id ? { ...a, text: x } : a,
                  ),
                )
              }
            />
            <MediaPicker
              label="Материал кейса: изображение, аудио, видео или PDF"
              value={c.media || ""}
              mime={c.mediaMime || "image/webp"}
              accept="image/*,audio/*,video/*,.pdf"
              onChange={(url: string, meta: Json) =>
                set(
                  "cases",
                  r.cases.map((item: Json) =>
                    item.id === c.id
                      ? {
                          ...item,
                          media: url,
                          mediaMime: meta?.mime || "image/webp",
                        }
                      : item,
                  ),
                )
              }
            />
            <Button
              onClick={() =>
                set(
                  "cases",
                  r.cases.filter((a: Json) => a.id !== c.id),
                )
              }
            >
              Удалить кейс
            </Button>
          </div>
        ))}
        <Button
          onClick={() =>
            set("cases", [
              ...(r.cases || []),
              { id: uid("case"), title: "Новый кейс", text: "" },
            ])
          }
        >
          Добавить кейс
        </Button>
      </details>
      <Button kind="danger quiet" onClick={onDelete}>
        Удалить тур
      </Button>
    </>
  );
}
function AwardRules({ p, templates, onChange }: any) {
  const rules = p.awardRules || [];
  const change = (id: string, key: string, value: any) =>
    onChange(
      rules.map((x: Json) => (x.id === id ? { ...x, [key]: value } : x)),
    );
  return (
    <section className="panel settings-content">
      <h2>Правила награждения</h2>
      <p className="muted">
        Правила фиксируются при публикации редакции. Перед выпуском вы увидите
        получателей каждой награды.
      </p>
      {rules.map((r: Json) => (
        <div className="award-rule" key={r.id}>
          <div className="two">
            <Input
              label="Название награды / номинации"
              value={r.title}
              onChange={(x: string) => change(r.id, "title", x)}
            />
            <Select
              label="Шаблон документа"
              value={r.templateId}
              options={[
                ["", "Выберите шаблон"],
                ...templates.map((t: Json) => [t.id, t.title]),
              ]}
              onChange={(x: string) => change(r.id, "templateId", x)}
            />
            <Select
              label="Получатель документа"
              value={r.recipient || "participant"}
              options={[
                ["participant", "Участник"],
                ["mentor", "Наставник участника"],
              ]}
              onChange={(v: string) => change(r.id, "recipient", v)}
            />
            <Select
              label="Основание"
              value={r.mode}
              options={[
                ["place", "Место в рейтинге"],
                ["score", "Балльный диапазон"],
                ["participation", "Участие"],
                ["nomination", "Именная номинация"],
              ]}
              onChange={(x: string) => change(r.id, "mode", x)}
            />
            <Input
              label="Степень (например, I степени)"
              value={r.degree}
              onChange={(x: string) => change(r.id, "degree", x)}
            />
            {["place", "score"].includes(r.mode) && (
              <>
                <Input
                  label="От"
                  type="number"
                  min="0"
                  value={r.from ?? 1}
                  onChange={(x: number) => change(r.id, "from", x)}
                />
                <Input
                  label="До"
                  type="number"
                  min="0"
                  value={r.to ?? 1}
                  onChange={(x: number) => change(r.id, "to", x)}
                />
              </>
            )}
            <Input
              label="Организатор для документа"
              value={r.issuer}
              onChange={(x: string) => change(r.id, "issuer", x)}
            />
            <Input
              label="Приказ или другие реквизиты"
              value={r.order}
              onChange={(x: string) => change(r.id, "order", x)}
            />
          </div>
          {templates.find((t: Json) => t.id === r.templateId)?.kind ===
            "thanks" &&
            r.recipient !== "mentor" && (
              <p role="status">
                В шаблоне благодарности есть текст о подготовке участников.
                Сейчас получателем выбран студент. Проверьте получателя или
                отредактируйте текст шаблона.
              </p>
            )}
          {r.recipient === "mentor" && (
            <p className="muted">
              Нужно ФИО наставника в данных участника. Один наставник с
              одинаковым ФИО и организацией получит один документ по этому
              правилу.
            </p>
          )}
          <Button
            kind="danger quiet"
            onClick={() => onChange(rules.filter((x: Json) => x.id !== r.id))}
          >
            Удалить правило
          </Button>
        </div>
      ))}
      <Button
        onClick={() =>
          onChange([
            ...rules,
            {
              id: uid("rule"),
              title: "Сертификат участника",
              mode: "participation",
              templateId:
                templates.find((t: Json) => t.kind === "certificate")?.id || "",
              degree: "",
              issuer: "",
              order: "",
            },
          ])
        }
      >
        <Plus size={16} />
        Добавить правило
      </Button>
    </section>
  );
}

function InteractivePreview({ q }: { q: Question }) {
  const [answer, setAnswer] = useState<any>(undefined);
  return <Task q={q} value={answer} onChange={setAnswer} />;
}
