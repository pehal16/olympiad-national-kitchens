import { useEffect, useState } from "react";
import { Plus, ExternalLink, Download, Users, Play } from "lucide-react";
import type { Json } from "../shared/types";
import { RUN_DEFAULTS } from "../shared/catalog";
import { api, blobRequest, download } from "./api";
import {
  Button,
  Input,
  Select,
  Toggle,
  Textarea,
  Modal,
  Empty,
  Field,
} from "./ui";
export function Conduct({
  projectId,
  initialView = "runs",
  onRun,
  beforeAction = async () => {},
}: any) {
  const [runs, setRuns] = useState<Json[]>([]),
    [releases, setReleases] = useState<Json[]>([]),
    [creating, setCreating] = useState(false),
    [selected, setSelected] = useState(""),
    [title, setTitle] = useState(""),
    [settings, setSettings] = useState<Json>({ ...RUN_DEFAULTS });
  const reload = async () => {
    const [a, b] = await Promise.all([
      api("/runs"),
      api("/projects/" + projectId + "/releases"),
    ]);
    setRuns(a.filter((x: Json) => x.projectId === projectId && !x.trial));
    setReleases(b);
    if (!selected && b[0]) setSelected(b[0].id);
  };
  useEffect(() => {
    reload().catch((e) =>
      window.dispatchEvent(new CustomEvent("constructor-error", { detail: e })),
    );
  }, [projectId]);
  return (
    <section className="panel settings-content">
      <div className="section-head">
        <h2>
          {initialView === "results" ? "Результаты проведений" : "Проведения"}
        </h2>
        <Button
          kind="primary"
          onClick={async () => {
            await beforeAction();
            await reload();
            setCreating(true);
          }}
        >
          <Plus size={17} />
          Новое проведение
        </Button>
      </div>
      {!runs.length ? (
        <Empty title="Проведений пока нет">
          <p>Опубликуйте редакцию проекта и создайте проведение.</p>
        </Empty>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Проведение</th>
                <th>Доступ</th>
                <th>Состояние</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>
                    <strong>{run.title}</strong>
                    <small>
                      {new Date(run.createdAt).toLocaleString("ru-RU")}
                    </small>
                  </td>
                  <td>
                    {run.settings.entryMode === "codes"
                      ? "Персональные коды"
                      : "Регистрация по ссылке"}
                  </td>
                  <td>{status(run.settings.status)}</td>
                  <td>
                    <Button onClick={() => onRun(run.id)}>Открыть</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && (
        <Modal title="Новое проведение" wide onClose={() => setCreating(false)}>
          {releases.length ? (
            <>
              <Input
                label="Название проведения"
                value={title}
                onChange={setTitle}
              />
              <Select
                label="Опубликованная редакция"
                value={selected}
                onChange={setSelected}
                options={releases.map((r) => [
                  r.id,
                  `${r.title} · редакция ${r.version}`,
                ])}
              />
              <RunSettings value={settings} onChange={setSettings} />
              <Button
                kind="primary"
                onClick={async () => {
                  const run = await api("/runs", {
                    title,
                    releaseId: selected,
                    settings,
                  });
                  setCreating(false);
                  onRun(run.id);
                }}
              >
                Создать проведение
              </Button>
            </>
          ) : (
            <p>Сначала проверьте и опубликуйте проект.</p>
          )}
        </Modal>
      )}
    </section>
  );
}
export function RunSettings({ value, onChange, started = false }: any) {
  const set = (key: string, v: any) => onChange({ ...value, [key]: v });
  return (
    <div className="run-settings">
      <div className="two">
        <Select
          label="Способ входа"
          value={value.entryMode}
          options={[
            ["codes", "Персональные коды"],
            ["open", "Регистрация по ссылке"],
          ]}
          onChange={(x: string) => set("entryMode", x)}
          disabled={started}
        />
        <Select
          label="Состояние входа"
          value={value.status}
          options={[
            ["draft", "Черновик"],
            ["open", "Открыт"],
            ["closed", "Закрыт"],
          ]}
          onChange={(x: string) => set("status", x)}
        />
        <Input
          label="Открытие входа, МСК"
          type="datetime-local"
          value={value.availableFrom || ""}
          onChange={(x: string) => set("availableFrom", x)}
          disabled={started}
        />
        <Input
          label="Закрытие входа, МСК"
          type="datetime-local"
          value={value.availableUntil || ""}
          onChange={(x: string) => set("availableUntil", x)}
        />
        <Input
          label="Время всей работы, секунд (0 — без лимита)"
          type="number"
          min="0"
          value={value.seconds}
          onChange={(x: number) => set("seconds", x)}
          disabled={started}
        />
        <Input
          label="Допустимое число попыток"
          type="number"
          min="1"
          max="20"
          value={value.maxAttempts}
          onChange={(x: number) => set("maxAttempts", x)}
          disabled={started}
        />
        <Select
          label="Какая попытка учитывается"
          value={value.attemptSelection}
          options={[
            ["first", "Первая завершённая"],
            ["last", "Последняя завершённая"],
            ["best", "Лучший результат"],
          ]}
          onChange={(x: string) => set("attemptSelection", x)}
          disabled={started}
        />
        <Select
          label="Раскрытие результатов"
          value={value.disclosure}
          options={[
            ["organizer", "После публикации организатором"],
            ["immediate", "После личного завершения"],
          ]}
          onChange={(x: string) => set("disclosure", x)}
        />
        <Select
          label="При равенстве баллов"
          value={value.tieBreak || "shared"}
          options={[
            ["shared", "Общее место"],
            ["time", "Сначала меньшее время"],
          ]}
          onChange={(x: string) => set("tieBreak", x)}
          disabled={started}
        />
      </div>
      <Toggle
        label="Показывать решения при раскрытии результатов"
        value={value.showSolutions}
        onChange={(x: boolean) => set("showSolutions", x)}
        disabled={started}
      />
    </div>
  );
}
export function RunManagement({ runId, onBack, onResults }: any) {
  const [run, setRun] = useState<Json | null>(null),
    [settings, setSettings] = useState<Json>({}),
    [participants, setParticipants] = useState<Json[]>([]),
    [rows, setRows] = useState(""),
    [codes, setCodes] = useState<Json[] | null>(null),
    [importing, setImporting] = useState(false);
  const reload = async () => {
    const [r, p] = await Promise.all([
      api("/runs/" + runId),
      api("/runs/" + runId + "/participants"),
    ]);
    setRun(r);
    setSettings(r.settings);
    setParticipants(p);
  };
  useEffect(() => {
    reload().catch((e) =>
      window.dispatchEvent(new CustomEvent("constructor-error", { detail: e })),
    );
  }, [runId]);
  if (!run) return <p>Загружаем проведение…</p>;
  const link = location.origin + "/constructor/play/" + runId;
  return (
    <>
      <div className="page-toolbar">
        <div>
          <Button kind="quiet" onClick={onBack}>
            ← К проектам
          </Button>
          <h1>{run.title}</h1>
        </div>
        <div className="actions">
          <Button onClick={() => window.open(link, "_blank", "noopener")}>
            <ExternalLink size={17} />
            Открыть вход
          </Button>
          <Button kind="primary" onClick={onResults}>
            Результаты и награды
          </Button>
        </div>
      </div>
      <div className="management-grid">
        <section className="panel">
          <h2>Настройки проведения</h2>
          <RunSettings
            value={settings}
            onChange={setSettings}
            started={Boolean(run.started)}
          />
          <Button
            kind="primary"
            onClick={async () => {
              const r = await api("/runs/" + runId, { settings }, "PUT");
              setRun(r);
              setSettings(r.settings);
            }}
          >
            Сохранить настройки
          </Button>
          <Field label="Ссылка для участников">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
            />
          </Field>
        </section>
        <section className="panel">
          <div className="section-head">
            <h2>Участники</h2>
            <Button onClick={() => setImporting(true)}>Импорт CSV/XLSX</Button>
          </div>
          <Textarea
            label="Добавить участников: ФИО; организация; группа; наставник"
            value={rows}
            onChange={setRows}
            rows={5}
          />
          <Button
            kind="primary"
            disabled={!rows.trim()}
            onClick={async () => {
              const values = rows
                .split("\n")
                .filter((x) => x.trim())
                .map((line) => {
                  const [
                    fullName,
                    institution = "",
                    groupName = "",
                    mentorName = "",
                  ] = line.split(";").map((x) => x.trim());
                  return { fullName, institution, groupName, mentorName };
                });
              setCodes(
                await api("/runs/" + runId + "/participants", { rows: values }),
              );
              setRows("");
              await reload();
            }}
          >
            <Users size={17} />
            Добавить и выдать коды
          </Button>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Участник</th>
                  <th>Группа</th>
                  <th>Наставник</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id}>
                    <td>{p.profile.fullName}</td>
                    <td>{p.profile.groupName}</td>
                    <td>{p.profile.mentorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {codes && (
        <Modal title="Персональные коды" wide onClose={() => setCodes(null)}>
          <p>
            Сохраните список. Коды выдаются только организатору при создании
            доступа.
          </p>
          <table>
            <thead>
              <tr>
                <th>Участник</th>
                <th>Код</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((p) => (
                <tr key={p.id}>
                  <td>{p.profile.fullName}</td>
                  <td>
                    <strong className="code">{p.code}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button
            onClick={() =>
              download(
                new Blob(
                  [
                    "\uFEFFФИО;Код\r\n" +
                      codes
                        .map(
                          (p) =>
                            `"${p.profile.fullName.replace(/"/g, '""')}";${p.code}`,
                        )
                        .join("\r\n"),
                  ],
                  { type: "text/csv;charset=utf-8" },
                ),
                "Персональные коды.csv",
              )
            }
          >
            <Download size={17} />
            Сохранить список
          </Button>
        </Modal>
      )}
      {importing && (
        <SpreadsheetImport
          title="Импорт участников"
          targets={{
            fullName: "ФИО",
            institution: "Организация",
            groupName: "Группа",
            mentorName: "Наставник",
          }}
          onClose={() => setImporting(false)}
          onCommit={async (values) => {
            setCodes(
              await api("/runs/" + runId + "/participants", { rows: values }),
            );
            setImporting(false);
            await reload();
          }}
        />
      )}
    </>
  );
}
export function SpreadsheetImport({
  title,
  targets,
  onClose,
  onCommit,
}: {
  title: string;
  targets: Json;
  onClose: () => void;
  onCommit: (rows: Json[]) => Promise<void>;
}) {
  const [table, setTable] = useState<Json | null>(null),
    [mapping, setMapping] = useState<Json>({});
  const values =
    table?.rows.map((row: any[]) =>
      Object.fromEntries(
        Object.entries(mapping)
          .filter(([, index]) => index !== "")
          .map(([key, index]) => [key, row[Number(index)] || ""]),
      ),
    ) || [];
  return (
    <Modal title={title} wide onClose={onClose}>
      <label className="button file-button">
        Выбрать CSV или XLSX
        <input
          hidden
          type="file"
          accept=".csv,.xlsx"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const form = new FormData();
              form.append("file", f);
              const result = await api("/spreadsheet/preview", form);
              setTable(result);
              setMapping(
                Object.fromEntries(
                  Object.keys(targets).map((key, i) => [
                    key,
                    i < result.headers.length ? String(i) : "",
                  ]),
                ),
              );
            } catch (error) {
              window.dispatchEvent(
                new CustomEvent("constructor-error", { detail: error }),
              );
            }
          }}
        />
      </label>
      {table && (
        <>
          <h3>Сопоставьте столбцы</h3>
          <div className="two">
            {Object.entries(targets).map(([key, label]) => (
              <Select
                key={key}
                label={label}
                value={mapping[key] ?? ""}
                options={[
                  ["", "Не использовать"],
                  ...table.headers.map((x: string, i: number) => [
                    String(i),
                    x || `Столбец ${i + 1}`,
                  ]),
                ]}
                onChange={(x: string) => setMapping({ ...mapping, [key]: x })}
              />
            ))}
          </div>
          <p>Записей: {values.length}. Предпросмотр первых 10.</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {Object.values(targets).map((x: any) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {values.slice(0, 10).map((r: Json, i: number) => (
                  <tr key={i}>
                    {Object.keys(targets).map((key) => (
                      <td key={key}>{r[key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            kind="primary"
            disabled={!values.length}
            onClick={() => onCommit(values)}
          >
            Проверить и импортировать
          </Button>
        </>
      )}
    </Modal>
  );
}
function status(value: string) {
  return (
    ({ draft: "Черновик", open: "Открыт", closed: "Закрыт" } as Json)[value] ||
    value
  );
}
