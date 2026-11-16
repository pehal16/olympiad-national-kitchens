import { useState, useEffect } from "react";
import { Plus, ArrowUp, ArrowDown, Search } from "lucide-react";
import {
  COMMON_TYPES,
  TYPE_HINTS,
  TYPE_EXAMPLES,
} from "../shared/authoring.js";
import { TYPES, uid, RUN_DEFAULTS } from "../shared/catalog";
import {
  Button,
  Input,
  Textarea,
  Select,
  Toggle,
  Modal,
  MediaPicker,
  Empty,
} from "./ui";
import { api } from "./api";

export function SimpleRunSettings({ value, onChange, started = false }: any) {
  const set = (key: string, v: any) => onChange({ ...value, [key]: v });
  return (
    <div className="simple-run-settings">
      <Select
        label="Как студенты войдут"
        value={value.entryMode}
        disabled={started}
        onChange={(v: string) => set("entryMode", v)}
        options={[
          ["open", "По общей ссылке или QR-коду"],
          ["codes", "По персональным кодам"],
        ]}
      />
      <p className="muted">
        {value.entryMode === "codes"
          ? "Добавьте список участников и сохраните выданные коды."
          : "Студент откроет ссылку и введёт ФИО и группу. Персональные коды подходят для заранее подготовленного списка."}
      </p>
      <Toggle
        label="Ограничить время всей работы"
        disabled={started}
        value={Number(value.seconds) > 0}
        onChange={(v: boolean) => set("seconds", v ? 30 * 60 : 0)}
      />
      {value.seconds > 0 && (
        <Input
          label="Время работы, минут"
          type="number"
          min="0.1"
          step="0.5"
          value={value.seconds / 60}
          disabled={started}
          onChange={(v: number) => set("seconds", Math.round(v * 60))}
        />
      )}
      <Select
        label="Когда студент увидит результат"
        value={value.disclosure}
        onChange={(v: string) => set("disclosure", v)}
        options={[
          ["organizer", "После моей публикации итогов"],
          ["immediate", "После завершения своей работы"],
        ]}
      />
      <details>
        <summary>Расписание, попытки и другие условия</summary>
        <Input
          label="Открытие входа, МСК"
          type="datetime-local"
          disabled={started}
          value={value.availableFrom || ""}
          onChange={(v: string) => set("availableFrom", v)}
        />
        <Input
          label="Закрытие входа, МСК"
          type="datetime-local"
          value={value.availableUntil || ""}
          onChange={(v: string) => set("availableUntil", v)}
        />
        <Toggle
          label="Запрашивать ФИО наставника при регистрации"
          value={value.registrationFields?.includes("mentorName")}
          disabled={started}
          onChange={(v: boolean) =>
            set(
              "registrationFields",
              v
                ? [
                    ...(value.registrationFields || ["fullName", "groupName"]),
                    "mentorName",
                  ]
                : (value.registrationFields || []).filter(
                    (x: string) => x !== "mentorName",
                  ),
            )
          }
        />
        <Input
          label="Число попыток"
          type="number"
          min="1"
          max="20"
          disabled={started}
          value={value.maxAttempts || 1}
          onChange={(v: number) => set("maxAttempts", v)}
        />
        <Select
          label="Какой результат учитывать"
          value={value.attemptSelection || "first"}
          disabled={started}
          onChange={(v: string) => set("attemptSelection", v)}
          options={[
            ["first", "Первая завершённая попытка"],
            ["last", "Последняя завершённая попытка"],
            ["best", "Лучший результат"],
          ]}
        />
        <Select
          label="При одинаковом результате"
          value={value.tieBreak || "shared"}
          disabled={started}
          onChange={(v: string) => set("tieBreak", v)}
          options={[
            ["shared", "Общее место"],
            ["time", "Сначала меньшее время"],
          ]}
        />
        <Toggle
          label="Показывать правильные решения после раскрытия результатов"
          disabled={started}
          value={value.showSolutions}
          onChange={(v: boolean) => set("showSolutions", v)}
        />
      </details>
    </div>
  );
}

export function ParticipantLink({ runId }: { runId: string }) {
  const [origins, setOrigins] = useState<string[]>([]),
    [origin, setOrigin] = useState(""),
    [qr, setQr] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    api("/connection-info")
      .then((v: any) => {
        if (active) {
          setOrigins(v.origins);
          setOrigin(v.origins[0] || "");
        }
      })
      .catch(() =>
        setMessage("Не удалось определить адрес. Повторите открытие страницы."),
      );
    return () => {
      active = false;
    };
  }, []);
  const link = origin ? origin + "/constructor/play/" + runId : "";
  useEffect(() => {
    let active = true;
    setQr("");
    if (link)
      import("qrcode")
        .then((m) => m.toDataURL(link, { width: 280, margin: 2 }))
        .then((v) => {
          if (active) setQr(v);
        })
        .catch(() => setMessage("QR-код не создан. Можно скопировать ссылку."));
    return () => {
      active = false;
    };
  }, [link]);
  return (
    <section className="participant-link panel">
      <h2>Пригласите студентов</h2>
      {origins.length > 1 && (
        <Select
          label="Адрес в сети колледжа"
          value={origin}
          options={origins.map((x) => [x, x])}
          onChange={setOrigin}
        />
      )}
      {link ? (
        <>
          <Input
            label="Ссылка для студентов"
            value={link}
            readOnly
            onFocus={(e: any) => e.currentTarget.select()}
          />
          <div className="actions">
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setMessage("Ссылка скопирована");
                } catch {
                  setMessage(
                    "Выделите ссылку и скопируйте её сочетанием Ctrl+C.",
                  );
                }
              }}
            >
              Скопировать ссылку
            </Button>
            <Button onClick={() => window.open(link, "_blank", "noopener")}>
              Посмотреть страницу входа
            </Button>
          </div>
          {qr && (
            <img
              className="participant-qr"
              src={qr}
              alt="QR-код входа в это проведение"
            />
          )}
          <p className="muted">
            В локальной версии студентам нужна та же сеть, что и компьютеру с
            платформой. Проверьте ссылку с другого устройства.
          </p>
        </>
      ) : (
        <p>
          Адрес для других устройств пока недоступен. Подключите компьютер к
          сети колледжа и откройте кабинет по его сетевому адресу.
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}

export function GuidedSteps({
  p,
  step,
  ri,
  qi,
  select,
  update,
  addQuestion,
  moveQuestion,
  onPreview,
  editor,
  inspector,
  roundInspector,
  awards,
  templates,
  check,
  issues,
  trial,
  prepare,
  runs,
  onRun,
}: any) {
  const [adding, setAdding] = useState(false),
    [allTypes, setAllTypes] = useState(false),
    [search, setSearch] = useState(""),
    [mobilePanel, setMobilePanel] = useState("Задание");
  const r = p.rounds[ri],
    q = r?.questions[qi];
  const field = (key: string, value: any) =>
    update((current: any) => ({ ...current, [key]: value }));
  const settings = {
    ...RUN_DEFAULTS,
    entryMode: "open",
    registrationFields: ["fullName", "groupName"],
    ...p.conductDefaults,
  };
  const choose = (i: number, j: number, issue?: any) => {
    select(i, j, issue);
    setMobilePanel("Задание");
  };
  if (step === 0)
    return (
      <section className="panel guided-form">
        <h2>Как назовём работу?</h2>
        <Input
          label="Название работы"
          value={p.title}
          onChange={(v: string) => field("title", v)}
          required
        />
        <Select
          label="Что вы готовите"
          value={p.kind}
          onChange={(v: string) => field("kind", v)}
          options={[
            ["olympiad", "Олимпиада"],
            ["test", "Тестирование"],
          ]}
        />
        <details>
          <summary>Предмет, участники и оформление</summary>
          <Input
            label="Предмет"
            value={p.subject}
            onChange={(v: string) => field("subject", v)}
          />
          <Input
            label="Для кого предназначена работа"
            value={p.audience}
            onChange={(v: string) => field("audience", v)}
          />
          <Textarea
            label="Приветствие участникам"
            value={p.description}
            onChange={(v: string) => field("description", v)}
          />
          <MediaPicker
            label="Обложка (необязательно)"
            value={p.cover}
            onChange={(v: string) => field("cover", v)}
          />
          <Input
            label="Основной цвет"
            type="color"
            value={p.theme?.accent || "#005b43"}
            onChange={(v: string) => field("theme", { ...p.theme, accent: v })}
          />
          <Input
            label="Фон"
            type="color"
            value={p.theme?.background || "#f5f7f8"}
            onChange={(v: string) =>
              field("theme", { ...p.theme, background: v })
            }
          />
          <p className="muted">
            История, рассказчик и остальные параметры доступны по кнопке «Все
            настройки».
          </p>
        </details>
      </section>
    );
  if (step === 1)
    return (
      <>
        <div
          className="guided-mobile-tabs"
          role="group"
          aria-label="Панели редактора"
        >
          {["Структура", "Задание", "Настройки"].map((x) => (
            <Button
              key={x}
              kind={x === mobilePanel ? "primary" : ""}
              onClick={() => setMobilePanel(x)}
            >
              {x}
            </Button>
          ))}
        </div>
        <div className="guided-layout" data-panel={mobilePanel}>
          <aside className="panel guided-outline">
            <h2>Задания</h2>
            {p.rounds.reduce((n: number, x: any) => n + x.questions.length, 0) >
              6 && (
              <Input
                label="Найти задание"
                value={search}
                onChange={setSearch}
              />
            )}
            {p.rounds.map((tour: any, i: number) => (
              <section key={tour.id}>
                <button className="guided-round" onClick={() => choose(i, 0)}>
                  {tour.title}
                </button>
                {tour.questions.map((item: any, j: number) => (
                  <button
                    className={
                      ri === i && qi === j
                        ? "guided-question active"
                        : "guided-question"
                    }
                    key={item.id}
                    hidden={
                      Boolean(search) &&
                      ![item.title, item.internal?.label]
                        .join(" ")
                        .toLowerCase()
                        .includes(search.toLowerCase())
                    }
                    onClick={() => choose(i, j)}
                  >
                    {item.media?.[0]?.mime?.startsWith("image/") && (
                      <img
                        className="outline-thumb"
                        src={item.media[0].url}
                        alt=""
                      />
                    )}
                    <span>
                      {j + 1}.{" "}
                      {item.internal?.label || item.title || "Новое задание"}
                    </span>
                  </button>
                ))}
              </section>
            ))}
            <Button onClick={() => setAdding(true)}>
              <Plus size={18} />
              Добавить задание
            </Button>
            <details>
              <summary>Туры и банк заданий</summary>
              <Button
                onClick={() => {
                  const next = {
                    id: uid("round"),
                    title: `Тур ${p.rounds.length + 1}`,
                    instructions: "",
                    seconds: 0,
                    shuffle: false,
                    selectCount: 0,
                    allowBack: true,
                    allowSkip: true,
                    transition: "automatic",
                    threshold: 0,
                    questions: [],
                  };
                  update({ ...p, rounds: [...p.rounds, next] });
                  choose(p.rounds.length, 0);
                }}
              >
                Добавить тур
              </Button>
              {roundInspector}
              <p className="muted">
                Добавление из банка доступно в полном редакторе.
              </p>
            </details>
          </aside>
          <main className="panel guided-canvas">
            {q ? (
              <>
                <h2>Задание {qi + 1}</h2>
                {TYPE_HINTS[q.type as keyof typeof TYPE_HINTS] && (
                  <p className="muted">
                    {TYPE_HINTS[q.type as keyof typeof TYPE_HINTS]}
                  </p>
                )}
                {editor}
                <div className="guided-order actions">
                  <Button
                    disabled={qi === 0}
                    onClick={() => moveQuestion(qi, qi - 1)}
                  >
                    <ArrowUp size={16} />
                    Выше
                  </Button>
                  <Button
                    disabled={qi === r.questions.length - 1}
                    onClick={() => moveQuestion(qi, qi + 1)}
                  >
                    <ArrowDown size={16} />
                    Ниже
                  </Button>
                  <Button
                    kind="danger quiet"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Удалить задание «${q.title || "Новое задание"}»? Его можно будет восстановить кнопкой «Отменить».`,
                        )
                      ) {
                        update({
                          ...p,
                          rounds: p.rounds.map((x: any, i: number) =>
                            i === ri
                              ? {
                                  ...x,
                                  questions: x.questions.filter(
                                    (_: any, j: number) => j !== qi,
                                  ),
                                }
                              : x,
                          ),
                        });
                        choose(ri, Math.max(0, qi - 1));
                      }
                    }}
                  >
                    Удалить задание
                  </Button>
                </div>
                <details className="guided-inspector">
                  <summary>
                    Дополнительные настройки · {q.maxScore} балла
                  </summary>
                  {inspector}
                </details>
                <Button onClick={onPreview}>Посмотреть глазами студента</Button>
              </>
            ) : (
              <Empty title="Добавьте первое задание">
                <p>Выберите действие, которое должен выполнить студент.</p>
                <Button kind="primary" onClick={() => setAdding(true)}>
                  Добавить задание
                </Button>
              </Empty>
            )}
          </main>
          <aside className="panel guided-mobile-inspector">
            {inspector}
            <details>
              <summary>Настройки тура</summary>
              {roundInspector}
            </details>
          </aside>
        </div>
        {adding && (
          <Modal
            title="Что должен сделать студент?"
            onClose={() => setAdding(false)}
          >
            <div className="type-choices">
              {Object.entries(TYPES)
                .filter(([type]) => allTypes || COMMON_TYPES.includes(type))
                .map(([type, title]) => (
                  <Button
                    key={type}
                    onClick={() => {
                      addQuestion(type);
                      setAdding(false);
                      setMobilePanel("Задание");
                    }}
                  >
                    <strong>{title}</strong>
                    {TYPE_EXAMPLES[type as keyof typeof TYPE_EXAMPLES] && (
                      <span>
                        {TYPE_EXAMPLES[type as keyof typeof TYPE_EXAMPLES]}
                      </span>
                    )}
                  </Button>
                ))}
            </div>
            <Toggle
              label="Все типы заданий, включая инструкции"
              value={allTypes}
              onChange={setAllTypes}
            />
          </Modal>
        )}
      </>
    );
  if (step === 2)
    return (
      <section className="panel guided-form">
        <h2>Условия участия</h2>
        <SimpleRunSettings
          value={settings}
          onChange={(v: any) => field("conductDefaults", v)}
        />
        <Select
          label="Наградные документы"
          value={
            !p.awardRules?.length
              ? "none"
              : p.awardRules.length === 1 &&
                  p.awardRules[0].mode === "participation" &&
                  templates.find(
                    (x: any) => x.id === p.awardRules[0].templateId,
                  )?.kind === "certificate"
                ? "certificate"
                : "configured"
          }
          options={[
            ["none", "Не выпускать"],
            ["certificate", "Сертификаты завершившим участникам"],
            ["configured", "Настроить дипломы и другие награды"],
          ]}
          onChange={(v: string) => {
            if (v === "none") {
              if (
                !p.awardRules?.length ||
                window.confirm("Убрать правила награждения из черновика?")
              )
                field("awardRules", []);
            } else if (v === "configured") {
              const t = templates.find((x: any) => x.kind === "diploma");
              if (t)
                field("awardRules", [
                  {
                    id: uid("rule"),
                    title: "Диплом",
                    mode: "place",
                    from: 1,
                    to: 1,
                    templateId: t.id,
                    issuer: "",
                  },
                ]);
            } else if (v === "certificate") {
              const t = templates.find((x: any) => x.kind === "certificate");
              if (t)
                field("awardRules", [
                  {
                    id: uid("rule"),
                    title: "Участие",
                    mode: "participation",
                    templateId: t.id,
                    issuer: "",
                  },
                ]);
            }
          }}
        />
        <details open={Boolean(p.awardRules?.length)}>
          <summary>Шаблоны и правила награждения</summary>
          {awards}
        </details>
        <p className="muted">
          Правила закрепляются при подготовке опубликованной редакции. Перед
          выпуском вы проверите список получателей.
        </p>
      </section>
    );
  if (step === 3)
    return (
      <section className="panel guided-form">
        <h2>Проверьте работу перед запуском</h2>
        <p>
          Заданий:{" "}
          {p.rounds.reduce((n: number, x: any) => n + x.questions.length, 0)}.
          Максимум:{" "}
          {p.rounds.reduce(
            (n: number, x: any) =>
              n +
              x.questions.reduce(
                (s: number, z: any) => s + Number(z.maxScore || 0),
                0,
              ),
            0,
          )}{" "}
          баллов.
        </p>
        <div className="actions">
          <Button kind="primary" onClick={check}>
            Проверить работу
          </Button>
          <Button onClick={trial}>Пройти как студент</Button>
        </div>
        {issues?.length ? (
          <ul className="guided-issues">
            {issues.map((issue: any, i: number) => (
              <li key={i}>
                <span>{issue.message}</span>
                <Button
                  onClick={() => {
                    const i = p.rounds.findIndex(
                      (x: any) => x.id === issue.roundId,
                    );
                    const j = p.rounds[i]?.questions.findIndex(
                      (x: any) => x.id === issue.questionId,
                    );
                    choose(Math.max(0, i), Math.max(0, j ?? 0), issue);
                    if (!issue.questionId && issue.roundId)
                      setMobilePanel("Структура");
                    if (["rubric", "maxScore", "seconds"].includes(issue.field))
                      setMobilePanel("Настройки");
                  }}
                >
                  Исправить
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            Проверка покажет, где нужно дополнить условия, ответы или критерии.
            Пробные результаты остаются отдельно от настоящих.
          </p>
        )}
      </section>
    );
  return (
    <section className="panel guided-form">
      <h2>Подготовьте вход для студентов</h2>
      <p>
        Сначала будет создана закрытая страница входа. Вы сможете проверить
        ссылку, а затем открыть её студентам.
      </p>
      <Button kind="primary" onClick={prepare}>
        Подготовить ссылку для студентов
      </Button>
      {runs?.length > 0 && (
        <>
          <h3>Уже подготовленные проведения</h3>
          {runs.map((run: any) => (
            <Button key={run.id} onClick={() => onRun(run.id)}>
              {run.title} ·{" "}
              {run.settings.status === "open" ? "Вход открыт" : "Вход закрыт"}
            </Button>
          ))}
        </>
      )}
    </section>
  );
}
