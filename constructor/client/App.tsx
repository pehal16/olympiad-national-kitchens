import {
  useState,
  useEffect,
  useRef,
  useCallback,
  lazy,
  Suspense,
} from "react";
import {
  BookOpen,
  FolderOpen,
  Library,
  FileText,
  Users,
  Settings,
  LogOut,
  Plus,
  Copy,
  Share2,
  X,
  Upload,
} from "lucide-react";
import type { User, Json, Project, Question } from "../shared/types";
import { question, TYPES, uid } from "../shared/catalog";
import { api, setCsrf, blobRequest, download } from "./api";
import {
  Button,
  Input,
  Select,
  Textarea,
  Toggle,
  IconButton,
  Modal,
  Empty,
} from "./ui";
import { QuestionEditor, QuestionInspector } from "./QuestionEditor";
import { Task } from "./Tasks";
import { RunManagement, SpreadsheetImport } from "./Conduct";
const Builder = lazy(() =>
  import("./Builder").then((m) => ({ default: m.Builder })),
);
const Designer = lazy(() =>
  import("./Designer").then((m) => ({ default: m.Designer })),
);
const Gallery = lazy(() =>
  import("./Designer").then((m) => ({ default: m.TemplateGallery })),
);
const Results = lazy(() =>
  import("./Results").then((m) => ({ default: m.Results })),
);
const Participant = lazy(() =>
  import("./Participant").then((m) => ({ default: m.Participant })),
);
const Verify = lazy(() =>
  import("./Participant").then((m) => ({ default: m.VerifyDocument })),
);
export function App() {
  const [error, setError] = useState("");
  useEffect(() => {
    const handler = (e: Event) =>
      setError(
        (e as CustomEvent).detail?.message || String((e as CustomEvent).detail),
      );
    window.addEventListener("constructor-error", handler);
    return () => window.removeEventListener("constructor-error", handler);
  }, []);
  const path = location.pathname.split("/").filter(Boolean),
    page = path[1];
  return (
    <>
      <Suspense fallback={<div className="loading">Загружаем кабинет…</div>}>
        {page === "play" ? (
          <Participant runId={path[2]} />
        ) : page === "verify" ? (
          <Verify issueId={path[2]} />
        ) : (
          <AdminApp />
        )}
      </Suspense>
      {error && (
        <div className="toast" role="alert">
          <span>{error}</span>
          <IconButton title="Закрыть сообщение" onClick={() => setError("")}>
            <X size={18} />
          </IconButton>
        </div>
      )}
    </>
  );
}
function AdminApp() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [setup, setSetup] = useState(false),
    [view, setView] = useState(
      new URLSearchParams(location.search).get("view") || "projects",
    ),
    [key, setKey] = useState(
      new URLSearchParams(location.search).get("id") || "",
    ),
    [data, setData] = useState<any>(null),
    [projects, setProjects] = useState<Project[]>([]),
    [templates, setTemplates] = useState<Json[]>([]),
    [search, setSearch] = useState(""),
    [creating, setCreating] = useState(false),
    [title, setTitle] = useState(""),
    [kind, setKind] = useState("olympiad"),
    [examples, setExamples] = useState<Json[]>([]),
    [sharing, setSharing] = useState<Json | null>(null),
    [shareLogins, setShareLogins] = useState("");
  const flusher = useRef<(() => Promise<void>) | null>(null);
  const registerFlush = useCallback((fn: (() => Promise<void>) | null) => {
    flusher.current = fn;
  }, []);
  const loadUser = async () => {
    const status = await api("/status");
    setSetup(status.setupRequired);
    try {
      const result = await api("/session");
      setUser(result.user);
      setCsrf(result.csrf || "");
    } catch {}
    setReady(true);
  };
  useEffect(() => {
    loadUser().catch((e) => {
      setReady(true);
      window.dispatchEvent(new CustomEvent("constructor-error", { detail: e }));
    });
  }, []);
  const navigate = async (next: string, id = "") => {
    try {
      await flusher.current?.();
      flusher.current = null;
      setData(null);
      setView(next);
      setKey(id);
      const url = new URL(location.href);
      url.search = "";
      if (next !== "projects") url.searchParams.set("view", next);
      if (id) url.searchParams.set("id", id);
      history.pushState(null, "", url);
      window.scrollTo(0, 0);
    } catch (e) {
      window.dispatchEvent(new CustomEvent("constructor-error", { detail: e }));
    }
  };
  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      if (view === "projects") {
        const [p, e] = await Promise.all([api("/projects"), api("/examples")]);
        if (active) {
          setProjects(p);
          setExamples(e);
        }
      } else if (view === "builder") {
        let value = await api("/projects/" + key);
        if (value.owner !== user.id && user.role !== "owner") {
          value = await api("/projects/" + key + "/copy", {});
          await navigate("builder", value.id);
          return;
        }
        if (active) setData(value);
      } else if (view === "templates" || view === "designer") {
        const value = await api("/templates");
        if (active) {
          setTemplates(value);
          if (view === "designer")
            setData(value.find((x: Json) => x.id === key));
        }
      }
    };
    load().catch((e) =>
      window.dispatchEvent(new CustomEvent("constructor-error", { detail: e })),
    );
    return () => {
      active = false;
    };
  }, [user, view, key]);
  if (!ready) return <div className="loading">Проверяем подключение…</div>;
  if (!user)
    return (
      <Login
        setup={setup}
        onLogin={(r: any) => {
          setUser(r.user);
          setCsrf(r.csrf);
          history.replaceState(null, "", "/constructor/");
        }}
      />
    );
  const nav = [
    ["projects", "Мои проекты", FolderOpen],
    ["bank", "Банк заданий", Library],
    ["templates", "Документы", FileText],
    ...(user.role === "owner" ? [["people", "Педагоги", Users]] : []),
    ["settings", "Настройки", Settings],
  ];
  return (
    <div className="admin-shell">
      <header className="app-header">
        <button className="brand" onClick={() => navigate("projects")}>
          <BookOpen size={36} />
          <strong>
            Олимпиадная
            <br />
            платформа
          </strong>
        </button>
        <nav>
          {nav.map(([screen, label, Icon]: any) => (
            <button
              key={screen}
              className={
                view === screen ||
                (screen === "projects" &&
                  ["builder", "run", "results"].includes(view)) ||
                (screen === "templates" && view === "designer")
                  ? "active"
                  : ""
              }
              onClick={() => navigate(screen)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="account">
          <span>{user.name}</span>
          <IconButton
            title="Выйти"
            onClick={async () => {
              await flusher.current?.();
              await api("/logout", {});
              setUser(null);
              setCsrf("");
            }}
          >
            <LogOut size={18} />
          </IconButton>
        </div>
      </header>
      <main
        className={"admin-main " + (view === "designer" ? "designer-main" : "")}
      >
        {view === "projects" && (
          <>
            <div className="page-toolbar">
              <div>
                <h1>Мои проекты</h1>
                <p className="muted">
                  Олимпиады и тестирования: от замысла до наградных документов.
                </p>
              </div>
              <Button kind="primary" onClick={() => setCreating(true)}>
                <Plus size={18} />
                Создать проект
              </Button>
            </div>
            <div className="project-search">
              <Input
                label="Поиск по проектам"
                value={search}
                onChange={setSearch}
                placeholder="Название, дисциплина"
              />
            </div>
            <section className="panel">
              <div className="table-scroll">
                <table className="project-table">
                  <thead>
                    <tr>
                      <th>Проект</th>
                      <th>Дисциплина</th>
                      <th>Туры / задания</th>
                      <th>Изменён</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects
                      .filter((p) =>
                        [p.title, p.subject]
                          .join(" ")
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .map((p) => (
                        <tr key={p.id}>
                          <td>
                            <button
                              className="project-link"
                              onClick={() => navigate("builder", p.id)}
                            >
                              {p.title}
                            </button>
                            <small>
                              {p.kind === "test" ? "Тестирование" : "Олимпиада"}
                            </small>
                          </td>
                          <td>{p.subject || "—"}</td>
                          <td>
                            {p.rounds.length} /{" "}
                            {p.rounds.reduce(
                              (n, r) => n + r.questions.length,
                              0,
                            )}
                          </td>
                          <td>
                            {new Date(p.updatedAt).toLocaleDateString("ru-RU")}
                          </td>
                          <td>
                            <div className="actions">
                              <Button onClick={() => navigate("builder", p.id)}>
                                Открыть
                              </Button>
                              <IconButton
                                title="Дублировать проект"
                                onClick={async () => {
                                  const value = await api(
                                    "/projects/" + p.id + "/copy",
                                    {},
                                  );
                                  await navigate("builder", value.id);
                                }}
                              >
                                <Copy size={17} />
                              </IconButton>
                              <IconButton
                                title="Предоставить доступ"
                                onClick={() => {
                                  setSharing({
                                    kind: "project",
                                    id: p.id,
                                    title: p.title,
                                    shared: p.sharedWith?.length || 0,
                                  });
                                  setShareLogins("");
                                }}
                              >
                                <Share2 size={17} />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {!projects.length && (
                <Empty title="Создайте первый проект">
                  <p>
                    Начните с пустого проекта или готового учебного образца.
                  </p>
                </Empty>
              )}
            </section>
            <section className="example-section">
              <h2>Начать с готового образца</h2>
              <div className="example-list">
                {examples.map((e) => (
                  <article key={e.key}>
                    <div>
                      <h3>{e.title}</h3>
                      <p>{e.description}</p>
                    </div>
                    <Button
                      onClick={async () => {
                        const value = await api("/examples/" + e.key, {});
                        await navigate("builder", value.id);
                      }}
                    >
                      Создать свою копию
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
        {view === "builder" &&
          (data ? (
            <Builder
              key={key}
              initial={data}
              onBack={() => navigate("projects")}
              onRun={(id: string) => navigate("run", id)}
              registerFlush={registerFlush}
            />
          ) : (
            <p>Загружаем проект…</p>
          ))}
        {view === "templates" && (
          <Gallery
            onShare={(id: string, title: string) => {
              setSharing({ kind: "template", id, title });
              setShareLogins("");
            }}
            items={templates}
            user={user}
            onOpen={async (id: string) => {
              const t = templates.find((x) => x.id === id);
              if (t && t.owner !== user.id && user.role !== "owner") {
                const copy = await api("/templates", {
                  ...t,
                  title: t.title + " — копия",
                });
                navigate("designer", copy.id);
              } else navigate("designer", id);
            }}
          />
        )}
        {view === "designer" &&
          (data ? (
            <Designer
              key={key}
              initial={data}
              templates={templates}
              onBack={() => navigate("templates")}
              registerFlush={registerFlush}
            />
          ) : (
            <p>Загружаем шаблон…</p>
          ))}
        {view === "bank" && (
          <Bank
            user={user}
            onShare={(id: string, title: string) => {
              setSharing({ kind: "question", id, title });
              setShareLogins("");
            }}
          />
        )}
        {view === "run" && (
          <RunManagement
            runId={key}
            onBack={() => navigate("projects")}
            onResults={() => navigate("results", key)}
          />
        )}
        {view === "results" && (
          <Results
            runId={key}
            onBack={() => navigate("projects")}
            onManage={() => navigate("run", key)}
          />
        )}
        {view === "people" && user.role === "owner" && <People />}
        {view === "settings" && <SettingsPage user={user} />}
      </main>
      {creating && (
        <Modal title="Создать проект" onClose={() => setCreating(false)}>
          <Input label="Название" value={title} onChange={setTitle} autoFocus />
          <Select
            label="Формат"
            value={kind}
            onChange={setKind}
            options={[
              ["olympiad", "Олимпиада"],
              ["test", "Тестирование"],
            ]}
          />
          <Button
            kind="primary"
            disabled={!title.trim()}
            onClick={async () => {
              const p = await api("/projects", { title, kind });
              setCreating(false);
              setTitle("");
              await navigate("builder", p.id);
            }}
          >
            Создать
          </Button>
        </Modal>
      )}
      {sharing && (
        <Modal
          title="Предоставить доступ к материалу"
          onClose={() => setSharing(null)}
        >
          <p>{sharing.title}</p>
          <p className="muted">
            Преподаватель сможет читать материал и создавать собственную копию.
            Общий доступ не открывает результаты участников.
          </p>
          <Input
            label="Логины преподавателей через запятую"
            value={shareLogins}
            onChange={setShareLogins}
          />
          <Button
            kind="primary"
            onClick={async () => {
              await api(`/share/${sharing.kind}/${sharing.id}`, {
                logins: shareLogins
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              });
              setSharing(null);
            }}
          >
            Сохранить доступ
          </Button>
        </Modal>
      )}
    </div>
  );
}
function Login({ setup, onLogin }: any) {
  const invitation = new URLSearchParams(location.search).get("invite") || "";
  const [values, setValues] = useState<Json>({
    login: "",
    password: "",
    name: "",
    setupCode: "",
  });
  return (
    <main className="login-page">
      <div className="login-brand">
        <BookOpen size={44} />
        <h1>Конструктор олимпиад</h1>
        <p>Создавайте задания, проводите работы и оформляйте награды.</p>
      </div>
      <form
        className="panel login-form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const result = await api(
              setup ? "/setup" : invitation ? "/accept-invitation" : "/login",
              { ...values, invitation },
            );
            onLogin(result);
          } catch (error) {
            window.dispatchEvent(
              new CustomEvent("constructor-error", { detail: error }),
            );
          }
        }}
      >
        <h2>
          {setup
            ? "Создание владельца"
            : invitation
              ? "Присоединиться по приглашению"
              : "Войти в кабинет"}
        </h2>
        {setup && (
          <>
            <p className="muted">
              Код находится в файле «Первый вход.txt» в папке данных установки.
            </p>
            <Input
              label="Код первоначальной настройки"
              value={values.setupCode}
              onChange={(x: string) => setValues({ ...values, setupCode: x })}
              required
            />
          </>
        )}
        {(setup || invitation) && (
          <Input
            label="Ваше имя"
            value={values.name}
            onChange={(x: string) => setValues({ ...values, name: x })}
            required
          />
        )}
        <Input
          label="Логин"
          value={values.login}
          onChange={(x: string) => setValues({ ...values, login: x })}
          autoComplete="username"
          required
        />
        <Input
          label="Пароль"
          type="password"
          minLength={10}
          value={values.password}
          onChange={(x: string) => setValues({ ...values, password: x })}
          autoComplete={
            setup || invitation ? "new-password" : "current-password"
          }
          required
        />
        <Button kind="primary" type="submit">
          {setup
            ? "Создать владельца"
            : invitation
              ? "Создать кабинет"
              : "Войти"}
        </Button>
      </form>
    </main>
  );
}
function Bank({ onShare, user }: any) {
  const [items, setItems] = useState<Json[]>([]),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState<Question | null>(null),
    [importing, setImporting] = useState(false),
    [previewing, setPreviewing] = useState(false),
    [previewValue, setPreviewValue] = useState<any>(null);
  const reload = () => api("/questions").then(setItems);
  useEffect(() => {
    reload().catch(() => {});
  }, []);
  return (
    <>
      <div className="page-toolbar">
        <h1>Банк заданий</h1>
        <div className="actions">
          <Button onClick={() => setImporting(true)}>
            <Upload size={17} />
            Импорт CSV/XLSX
          </Button>
          <Button
            kind="primary"
            onClick={() => setEditing(question() as Question)}
          >
            <Plus size={17} />
            Новое задание
          </Button>
        </div>
      </div>
      <Input
        label="Поиск"
        value={search}
        onChange={setSearch}
        placeholder="Название, тема, формулировка"
      />
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Задание</th>
              <th>Тип</th>
              <th>Баллы</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items
              .filter((x) =>
                [x.title, x.theme, x.prompt]
                  .join(" ")
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((x) => (
                <tr key={x.id}>
                  <td>
                    <strong>{x.title}</strong>
                    <small>{x.theme}</small>
                  </td>
                  <td>{TYPES[x.type as keyof typeof TYPES]}</td>
                  <td>{x.maxScore}</td>
                  <td>
                    <div className="actions">
                      <Button
                        onClick={() =>
                          setEditing(
                            (x.owner === user.id || user.role === "owner"
                              ? x
                              : {
                                  ...x,
                                  id: uid("bank"),
                                  title: x.title + " — копия",
                                }) as Question,
                          )
                        }
                      >
                        Редактировать
                      </Button>
                      <IconButton
                        title="Предоставить доступ"
                        onClick={() => onShare(x.id, x.title)}
                      >
                        <Share2 size={16} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!items.length && (
          <Empty title="Ваш банк пока пуст">
            <p>
              Создайте задание здесь или сохраните его из редактора олимпиады.
            </p>
          </Empty>
        )}
      </section>
      {editing && (
        <Modal
          title="Редактор задания банка"
          wide
          onClose={() => setEditing(null)}
        >
          <div className="bank-editor">
            <QuestionEditor q={editing} onChange={setEditing} />
            <aside>
              <QuestionInspector
                q={editing}
                onChange={setEditing}
                onPreview={() => {
                  setPreviewValue(null);
                  setPreviewing(true);
                }}
                onBank={async () => {
                  const existing = items.some((x) => x.id === editing.id);
                  await api(
                    existing ? "/questions/" + editing.id : "/questions",
                    { question: editing, expectedRevision: editing.revision },
                    existing ? "PUT" : "POST",
                  );
                  setEditing(null);
                  await reload();
                }}
              />
            </aside>
          </div>
          <Button
            kind="primary"
            onClick={async () => {
              const existing = items.some((x) => x.id === editing.id);
              await api(
                existing ? "/questions/" + editing.id : "/questions",
                { question: editing, expectedRevision: editing.revision },
                existing ? "PUT" : "POST",
              );
              setEditing(null);
              await reload();
            }}
          >
            Сохранить в банк
          </Button>
        </Modal>
      )}
      {previewing && editing && (
        <Modal
          title="Предпросмотр задания"
          wide
          onClose={() => setPreviewing(false)}
        >
          <Task q={editing} value={previewValue} onChange={setPreviewValue} />
        </Modal>
      )}
      {importing && (
        <SpreadsheetImport
          title="Импорт банка вопросов"
          targets={{
            title: "Название",
            prompt: "Формулировка",
            options: "Варианты (через |)",
            answer: "Правильные ответы (номера через ,)",
            type: "Тип (название или код)",
            maxScore: "Баллы",
            theme: "Тема",
            source: "Источник",
          }}
          onClose={() => setImporting(false)}
          onCommit={async (values) => {
            await api("/questions/import", { rows: values });
            setImporting(false);
            await reload();
          }}
        />
      )}
    </>
  );
}
function People() {
  const [users, setUsers] = useState<User[]>([]),
    [name, setName] = useState(""),
    [rights, setRights] = useState<Json>({
      publish: true,
      conduct: true,
      review: true,
      awards: true,
      share: true,
    }),
    [link, setLink] = useState("");
  const reload = () => api("/users").then(setUsers);
  useEffect(() => {
    reload().catch(() => {});
  }, []);
  const labels: Json = {
    publish: "Публиковать материалы",
    conduct: "Управлять проведением",
    review: "Проверять ответы",
    awards: "Выпускать документы",
    share: "Делиться материалами",
  };
  return (
    <>
      <div className="page-toolbar">
        <h1>Педагоги и доступы</h1>
      </div>
      <div className="management-grid">
        <section className="panel">
          <h2>Пригласить педагога</h2>
          <Input label="Имя для приглашения" value={name} onChange={setName} />
          {Object.keys(labels).map((key) => (
            <Toggle
              key={key}
              label={labels[key]}
              value={rights[key]}
              onChange={(x: boolean) => setRights({ ...rights, [key]: x })}
            />
          ))}
          <Button
            kind="primary"
            onClick={async () => {
              const result = await api("/invitations", {
                name,
                permissions: rights,
              });
              setLink(
                location.origin + "/constructor/?invite=" + result.invitation,
              );
            }}
          >
            Создать приглашение
          </Button>
          {link && (
            <>
              <Input
                label="Ссылка-приглашение, действует 72 часа"
                value={link}
                onChange={() => {}}
                readOnly
              />
              <p className="muted">
                Передайте ссылку нужному педагогу. Платформа не отправляет
                сообщения автоматически.
              </p>
            </>
          )}
        </section>
        <section className="panel">
          <h2>Действующие кабинеты</h2>
          {users.map((u) => (
            <article className="teacher-row" key={u.id}>
              <h3>{u.name}</h3>
              <p>
                {u.login} ·{" "}
                {u.role === "owner"
                  ? "Владелец"
                  : u.active
                    ? "Педагог"
                    : "Доступ отключён"}
              </p>
              {u.role !== "owner" && (
                <>
                  {Object.keys(labels).map((key) => (
                    <Toggle
                      key={key}
                      label={labels[key]}
                      value={u.permissions[key] !== false}
                      onChange={async (x: boolean) => {
                        await api(
                          "/users/" + u.id,
                          {
                            active: u.active,
                            permissions: { ...u.permissions, [key]: x },
                          },
                          "PUT",
                        );
                        await reload();
                      }}
                    />
                  ))}
                  <Button
                    kind={u.active ? "danger" : ""}
                    onClick={async () => {
                      await api(
                        "/users/" + u.id,
                        { active: !u.active, permissions: u.permissions },
                        "PUT",
                      );
                      await reload();
                    }}
                  >
                    {u.active ? "Отключить доступ" : "Вернуть доступ"}
                  </Button>
                </>
              )}
            </article>
          ))}
        </section>
      </div>
    </>
  );
}
function SettingsPage({ user }: { user: User }) {
  const [oldPassword, setOldPassword] = useState(""),
    [newPassword, setNewPassword] = useState("");
  const [projects, setProjects] = useState<Json[]>([]),
    [runs, setRuns] = useState<Json[]>([]),
    [kind, setKind] = useState("materials"),
    [key, setKey] = useState(""),
    [password, setPassword] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState<Json | null>(null),
    [result, setResult] = useState("");
  useEffect(() => {
    Promise.all([api("/projects"), api("/runs")])
      .then(([p, r]) => {
        setProjects(p);
        setRuns(r);
        setKey(p[0]?.id || "");
      })
      .catch(() => {});
  }, []);
  const form = () => {
    const data = new FormData();
    if (file) data.append("file", file);
    data.append("password", password);
    if (preview) data.append("packageHash", preview.packageHash);
    return data;
  };
  return (
    <>
      <div className="page-toolbar">
        <h1>Перенос и резервные копии</h1>
      </div>
      <section className="panel backup-panel">
        <h2>Пароль кабинета</h2>
        <div className="two">
          <Input
            label="Текущий пароль"
            type="password"
            value={oldPassword}
            onChange={setOldPassword}
            autoComplete="current-password"
          />
          <Input
            label="Новый пароль (от 10 символов)"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
          />
        </div>
        <Button
          disabled={!oldPassword || newPassword.length < 10}
          onClick={async () => {
            const session = await api("/password", {
              currentPassword: oldPassword,
              newPassword,
            });
            setCsrf(session.csrf);
            setOldPassword("");
            setNewPassword("");
            setResult("Пароль изменён. Прежние сеансы кабинета закрыты.");
          }}
        >
          Изменить пароль
        </Button>
      </section>
      <div className="management-grid">
        <section className="panel">
          <h2>Выгрузить пакет</h2>
          <Select
            label="Состав"
            value={kind}
            options={[
              ["materials", "Материалы и шаблоны"],
              ["results", "Завершённые результаты и документы"],
            ]}
            onChange={(x: string) => {
              setKind(x);
              setKey((x === "materials" ? projects : runs)[0]?.id || "");
            }}
          />
          <Select
            label={kind === "materials" ? "Проект" : "Проведение"}
            value={key}
            options={[
              ["", "Выберите"],
              ...(kind === "materials" ? projects : runs).map((x) => [
                x.id,
                x.title,
              ]),
            ]}
            onChange={setKey}
          />
          <Input
            label="Пароль пакета (от 10 символов)"
            type="password"
            value={password}
            onChange={setPassword}
          />
          <Button
            kind="primary"
            disabled={!key || password.length < 10}
            onClick={async () =>
              download(
                await blobRequest("/packages/export", {
                  kind,
                  projectId: kind === "materials" ? key : undefined,
                  runId: kind === "results" ? key : undefined,
                  password,
                }),
                "Перенос.olypack",
              )
            }
          >
            Скачать зашифрованный пакет
          </Button>
        </section>
        <section className="panel">
          <h2>Загрузить пакет</h2>
          <label className="button file-button">
            Выбрать файл .olypack
            <input
              hidden
              type="file"
              accept=".olypack"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setPreview(null);
              }}
            />
          </label>
          {file && <p>{file.name}</p>}
          <Input
            label="Пароль пакета"
            type="password"
            value={password}
            onChange={setPassword}
          />
          <Button
            disabled={!file || !password}
            onClick={async () =>
              setPreview(await api("/packages/preview", form()))
            }
          >
            Проверить состав
          </Button>
          {preview && (
            <div className="import-preview">
              <p>
                Записей: {preview.records}. Файлов: {preview.files}.
              </p>
              <p>
                {preview.duplicate
                  ? "Этот пакет уже загружен."
                  : `Совпадений с существующими записями: ${preview.conflicts.length}. Различающиеся редакции будут сохранены отдельными копиями.`}
              </p>
              <Button
                kind="primary"
                disabled={preview.duplicate}
                onClick={async () => {
                  const r = await api("/packages/import", form());
                  setResult(
                    `Импортировано записей: ${r.imported}. Исходные материалы сохранены.`,
                  );
                  setPreview(null);
                }}
              >
                Импортировать проверенный пакет
              </Button>
            </div>
          )}
          {result && <p role="status">{result}</p>}
        </section>
      </div>
      {user.role === "owner" && (
        <section className="panel backup-panel">
          <h2>Полная резервная копия установки</h2>
          <p className="muted">
            В зашифрованную копию входят база, медиа, шаблоны и выданные
            документы. Пароль задаётся ниже; восстановление выполняется в новую
            пустую папку.
          </p>
          <Input
            label="Пароль резервной копии"
            type="password"
            value={password}
            onChange={setPassword}
          />
          <div className="actions">
            <Button
              disabled={password.length < 10}
              onClick={async () =>
                download(
                  await blobRequest("/backup", { password }),
                  "Установка.olybackup",
                )
              }
            >
              Скачать полную копию
            </Button>
            <Button
              disabled={password.length < 10}
              onClick={async () => {
                await api(
                  "/backup/settings",
                  { enabled: true, password },
                  "PUT",
                );
                setResult(
                  "Ежедневные резервные копии включены. Хранятся последние 7 копий.",
                );
              }}
            >
              Включить ежедневные копии
            </Button>
            <Button
              onClick={async () => {
                await api("/backup/settings", { enabled: false }, "PUT");
                setResult("Автоматическое копирование отключено.");
              }}
            >
              Отключить расписание
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
