import { useEffect, useState } from "react";
import {
  Download,
  Eye,
  Check,
  ArrowLeft,
  FileText,
  Search,
} from "lucide-react";
import type { Json, Question } from "../shared/types";
import { api, blobRequest, download } from "./api";
import { Button, Input, Select, Textarea, Toggle, Modal, Empty } from "./ui";
import { Task } from "./Tasks";
const stateNames: Json = {
  in_progress: "Выполняется",
  waiting: "Ожидает решения",
  completed: "Завершено",
  excluded: "Исключено",
};
export function Results({ runId, onBack, onManage }: any) {
  const [run, setRun] = useState<Json | null>(null),
    [rows, setRows] = useState<Json[]>([]),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [group, setGroup] = useState("all"),
    [selected, setSelected] = useState<Json | null>(null),
    [qid, setQid] = useState(""),
    [scores, setScores] = useState<Json>({}),
    [comment, setComment] = useState(""),
    [manualScore, setManualScore] = useState(0),
    [history, setHistory] = useState(false),
    [preview, setPreview] = useState<Json | null>(null),
    [overrides, setOverrides] = useState<Json>({}),
    [templates, setTemplates] = useState<Json[]>([]),
    [issues, setIssues] = useState<Json[]>([]),
    [job, setJob] = useState<Json | null>(null),
    [reissue, setReissue] = useState<Json | null>(null),
    [reason, setReason] = useState(""),
    [reissueName, setReissueName] = useState(""),
    [nominationRules, setNominationRules] = useState<Json[]>([]),
    [nomination, setNomination] = useState<Json | null>(null),
    [nominees, setNominees] = useState<string[]>([]),
    [nominationReason, setNominationReason] = useState("");
  const reload = async () => {
    const [r, a, t, i, n] = await Promise.all([
      api("/runs/" + runId),
      api("/runs/" + runId + "/results"),
      api("/templates"),
      api("/runs/" + runId + "/issues"),
      api("/runs/" + runId + "/nominations"),
    ]);
    setRun(r);
    setRows(a);
    setTemplates(t);
    setIssues(i);
    setNominationRules(n);
  };
  useEffect(() => {
    reload().catch((e) =>
      window.dispatchEvent(new CustomEvent("constructor-error", { detail: e })),
    );
    const timer = setInterval(() => reload().catch(() => {}), 8000);
    return () => clearInterval(timer);
  }, [runId]);
  const choose = async (a: Json) => {
    const detail = await api("/attempts/" + a.id);
    setSelected(detail);
    const q =
      detail.variant.rounds
        .flatMap((r: Json) => r.questions)
        .find((q: Json) => q.grading === "manual") ||
      detail.variant.rounds[0].questions[0];
    setQid(q.id);
    setHistory(false);
  };
  const questions: Question[] =
    selected?.variant.rounds.flatMap((r: Json) => r.questions) || [];
  const q = questions.find((x) => x.id === qid);
  useEffect(() => {
    setScores(selected?.reviews?.[qid]?.scores || {});
    setComment(selected?.reviews?.[qid]?.comment || "");
    setManualScore(selected?.reviews?.[qid]?.score || 0);
  }, [qid, selected?.id]);
  const filtered = rows.filter(
    (a) =>
      (filter === "all" ||
        (filter === "pending" && a.summary.pending) ||
        filter === a.status) &&
      (group === "all" || a.participant.groupName === group) &&
      [
        a.participant.fullName,
        a.participant.institution,
        a.participant.groupName,
      ]
        .join(" ")
        .toLocaleLowerCase("ru")
        .includes(search.toLocaleLowerCase("ru")),
  );
  const exportResults = async (format: string) =>
    download(
      await blobRequest(`/runs/${runId}/results.${format}`),
      `Результаты.${format}`,
    );
  const issue = async () => {
    let result = await api("/runs/" + runId + "/awards/issue", {});
    setJob(result);
    while (["queued", "running"].includes(result.status)) {
      await new Promise((r) => setTimeout(r, 900));
      result = await api("/jobs/" + result.id);
      setJob(result);
    }
    if (result.status === "failed") throw new Error(result.error);
    await reload();
  };
  if (!run) return <p>Загружаем результаты…</p>;
  return (
    <div className="results-page">
      <div className="page-toolbar">
        <div>
          <Button kind="quiet" onClick={onBack}>
            <ArrowLeft size={16} />К проектам
          </Button>
          <h1>Результаты и награждение</h1>
          <p className="muted">{run.title}</p>
        </div>
        <div className="actions">
          <Button onClick={onManage}>Участники и настройки</Button>
          <Button
            onClick={async () => {
              await api(
                "/runs/" + runId,
                { publishResults: !run.published },
                "PUT",
              );
              await reload();
            }}
          >
            {run.published
              ? "Закрыть общие результаты"
              : "Опубликовать результаты"}
          </Button>
        </div>
      </div>
      <div className="result-filters">
        <Select
          label="Состояние"
          value={filter}
          options={[
            ["all", "Все работы"],
            ["pending", "Ожидают проверки"],
            ["in_progress", "Выполняются"],
            ["waiting", "Ожидают решения"],
            ["completed", "Завершены"],
          ]}
          onChange={setFilter}
        />
        <Select
          label="Группа"
          value={group}
          options={[
            ["all", "Все группы"],
            ...[
              ...new Set(
                rows.map((a) => a.participant.groupName).filter(Boolean),
              ),
            ].map((x) => [x, x]),
          ]}
          onChange={setGroup}
        />
        <Input
          label="Поиск участника"
          value={search}
          onChange={setSearch}
          placeholder="ФИО, организация, группа"
        />
      </div>
      <div className="results-layout">
        <section className="panel">
          <div className="section-head">
            <div className="actions">
              <Button onClick={() => exportResults("csv")}>
                <Download size={16} />
                CSV
              </Button>
              <Button onClick={() => exportResults("xlsx")}>XLSX</Button>
              <Button
                onClick={async () =>
                  download(
                    await blobRequest("/runs/" + runId + "/questions.xlsx"),
                    "Результаты по заданиям.xlsx",
                  )
                }
              >
                По заданиям
              </Button>
              <Button
                onClick={async () =>
                  download(
                    await blobRequest("/runs/" + runId + "/protocol.pdf"),
                    "Протокол.pdf",
                  )
                }
              >
                Протокол PDF
              </Button>
            </div>
            <span className="muted">Работ: {filtered.length}</span>
          </div>
          <div className="table-scroll">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Участник</th>
                  {(rows[0]?.summary.rounds || []).map((r: Json, i: number) => (
                    <th key={r.id}>
                      Тур {i + 1}
                      <small>/ {r.maxScore}</small>
                    </th>
                  ))}
                  <th>Итого</th>
                  <th>Состояние</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className={selected?.id === a.id ? "selected" : ""}
                  >
                    <td>
                      <button className="text-button" onClick={() => choose(a)}>
                        {a.participant.fullName}
                      </button>
                      <small>{a.participant.groupName}</small>
                    </td>
                    {a.summary.rounds.map((r: Json) => (
                      <td key={r.id}>
                        {r.score === null ? "На проверке" : r.score}
                      </td>
                    ))}
                    <td>
                      <strong>
                        {a.status === "completed"
                          ? (a.summary.score ?? "—")
                          : "—"}
                      </strong>
                    </td>
                    <td>
                      {a.excludedFromResults && (
                        <small>Исключена из зачёта</small>
                      )}
                      <span
                        className={
                          "status " +
                          (a.summary.pending
                            ? "pending"
                            : a.status === "completed"
                              ? "done"
                              : "")
                        }
                      >
                        {a.summary.pending
                          ? "На проверке"
                          : stateNames[a.status] || a.status}
                      </span>
                      {a.trial && <small>Пробное прохождение</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && (
            <Empty title="Работ пока нет">
              <p>Откройте вход и пригласите участников.</p>
            </Empty>
          )}
        </section>
        <aside className="panel review-panel">
          {selected && q ? (
            <>
              <h2>{selected.participant.fullName}</h2>
              <div className="inspector-tabs">
                <button
                  className={!history ? "active" : ""}
                  onClick={() => setHistory(false)}
                >
                  Ответы
                </button>
                <button
                  className={history ? "active" : ""}
                  onClick={() => setHistory(true)}
                >
                  История
                </button>
              </div>
              {history ? (
                <div className="history">
                  {selected.history.map((h: Json, i: number) => (
                    <article key={i}>
                      <strong>{historyLabel(h.action)}</strong>
                      <time>{new Date(h.time).toLocaleString("ru-RU")}</time>
                      {h.data.review?.comment && <p>{h.data.review.comment}</p>}
                    </article>
                  ))}
                </div>
              ) : (
                <>
                  <Select
                    label="Задание"
                    value={qid}
                    options={questions.map((x) => [x.id, x.title])}
                    onChange={setQid}
                  />
                  <h3>{q.title}</h3>
                  <Task
                    q={q}
                    value={selected.answers[q.id]?.answer}
                    onChange={() => {}}
                    readOnly
                  />
                  <details>
                    <summary>Эталон и пояснение</summary>
                    <pre>{expectedText(q)}</pre>
                    <p>{q.explanation}</p>
                  </details>
                  <Textarea
                    label="Основание решения организатора"
                    value={comment}
                    onChange={setComment}
                  />
                  <Button
                    kind="quiet"
                    disabled={!comment.trim()}
                    onClick={async () => {
                      await api("/attempts/" + selected.id + "/exclude", {
                        excluded: !selected.excludedFromResults,
                        reason: comment,
                      });
                      await choose(selected);
                      await reload();
                    }}
                  >
                    {selected.excludedFromResults
                      ? "Вернуть в итоговый зачёт"
                      : "Исключить из итогового зачёта"}
                  </Button>
                  <h3>Критерии оценивания</h3>
                  {q.rubric?.length ? (
                    q.rubric.map((c: Json) => (
                      <div className="review-criterion" key={c.id}>
                        <span>
                          {c.title}
                          <small>до {c.maxScore}</small>
                        </span>
                        <input
                          aria-label={c.title}
                          type="number"
                          min="0"
                          max={c.maxScore}
                          step="0.5"
                          value={scores[c.id] ?? 0}
                          onChange={(e) =>
                            setScores({
                              ...scores,
                              [c.id]: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    ))
                  ) : (
                    <Input
                      label={`Балл: от 0 до ${q.maxScore}`}
                      type="number"
                      min="0"
                      max={q.maxScore}
                      step="0.5"
                      value={manualScore}
                      onChange={setManualScore}
                    />
                  )}
                  <Textarea
                    label="Комментарий к проверке"
                    value={comment}
                    onChange={setComment}
                    rows={3}
                  />
                  <Button
                    kind="primary"
                    onClick={async () => {
                      await api("/attempts/" + selected.id + "/review", {
                        questionId: q.id,
                        scores,
                        score: manualScore,
                        comment,
                      });
                      setSelected(await api("/attempts/" + selected.id));
                      await reload();
                    }}
                  >
                    Сохранить проверку
                  </Button>
                  {selected.status === "waiting" && (
                    <div className="decision">
                      <h3>Переход в следующий тур</h3>
                      <Button
                        onClick={async () => {
                          await api("/attempts/" + selected.id + "/decision", {
                            approved: true,
                            reason: comment,
                          });
                          await choose(selected);
                          await reload();
                        }}
                      >
                        Допустить
                      </Button>
                      <Button
                        onClick={async () => {
                          if (!comment.trim())
                            throw new Error("Укажите причину в комментарии.");
                          await api("/attempts/" + selected.id + "/decision", {
                            approved: false,
                            reason: comment,
                          });
                          await choose(selected);
                          await reload();
                        }}
                      >
                        Завершить участие
                      </Button>
                    </div>
                  )}
                  {selected.status === "in_progress" && (
                    <div className="decision">
                      <Button
                        onClick={async () => {
                          await api("/attempts/" + selected.id + "/pause", {
                            paused: !selected.pausedAt,
                            reason: comment,
                          });
                          await choose(selected);
                          await reload();
                        }}
                      >
                        {selected.pausedAt ? "Возобновить" : "Приостановить"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <Empty title="Выберите работу">
              <p>Справа откроются ответы, критерии и история проверки.</p>
            </Empty>
          )}
        </aside>
      </div>
      <section className="panel awards-summary">
        <div className="section-head">
          <div>
            <h2>Предварительное награждение</h2>
            <p className="muted">
              Документы выпускаются после проверки результатов и утверждения
              списка.
            </p>
          </div>
          <div className="actions">
            {nominationRules.map((rule) => (
              <Button
                key={rule.id}
                onClick={() => {
                  setNomination(rule);
                  setNominees(run.nominations?.[rule.id] || []);
                  setNominationReason("");
                }}
              >
                {rule.title || "Номинация"}
              </Button>
            ))}
            <Button
              onClick={async () => {
                setPreview(await api("/runs/" + runId + "/awards/preview"));
                setOverrides({});
              }}
            >
              <Eye size={16} />
              Просмотреть получателей
            </Button>
            <Button
              kind="primary"
              disabled={
                !run.awardsApproved ||
                job?.status === "running" ||
                job?.status === "queued"
              }
              onClick={issue}
            >
              <Check size={17} />
              Выпустить документы
            </Button>
          </div>
        </div>
        {job && (
          <p role="status">
            {job.status === "completed"
              ? "Документы готовы"
              : job.status === "failed"
                ? job.error
                : `Подготовка документов: ${job.done} из ${job.total}`}
          </p>
        )}
        {issues.length > 0 && (
          <>
            <div className="actions">
              <Button
                onClick={async () =>
                  download(
                    await blobRequest("/runs/" + runId + "/documents.zip"),
                    "Наградные документы.zip",
                  )
                }
              >
                Скачать ZIP
              </Button>
              <Button
                onClick={async () =>
                  download(
                    await blobRequest("/runs/" + runId + "/documents.pdf"),
                    "Документы для печати.pdf",
                  )
                }
              >
                Общий PDF для печати
              </Button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Получатель</th>
                    <th>Документ</th>
                    <th>Номер</th>
                    <th>Состояние</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((i) => (
                    <tr key={i.id}>
                      <td>{i.fields.fullName}</td>
                      <td>{i.templateSnapshot.title}</td>
                      <td>{i.fields.number}</td>
                      <td>
                        {i.status === "revoked"
                          ? "Отозван"
                          : i.status === "suspended"
                            ? "Приостановлен"
                            : "Выдан"}
                      </td>
                      <td>
                        <div className="actions">
                          <Button
                            onClick={async () =>
                              download(
                                await blobRequest("/issues/" + i.id + "/pdf"),
                                i.fields.number + ".pdf",
                              )
                            }
                          >
                            PDF
                          </Button>
                          <Button
                            onClick={() => {
                              setReissue(i);
                              setReason("");
                              setReissueName(i.fields.fullName);
                            }}
                          >
                            Исправить / отозвать
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      {preview && (
        <Modal
          title="Проверка списка награждения"
          wide
          onClose={() => setPreview(null)}
        >
          {preview.candidates.length ? (
            <>
              <div className="award-recipients">
                {preview.candidates.map((c: Json) => (
                  <section className="recipient" key={c.id}>
                    <strong>{c.participant.fullName}</strong>
                    <span>
                      {c.nomination} · {c.score} баллов · место {c.place}
                    </span>
                    <Select
                      label="Шаблон"
                      value={overrides[c.id]?.templateId || c.templateId}
                      options={[
                        ["", "Выберите"],
                        ...templates.map((t) => [t.id, t.title]),
                      ]}
                      onChange={(x: string) =>
                        setOverrides({
                          ...overrides,
                          [c.id]: { ...overrides[c.id], templateId: x },
                        })
                      }
                    />
                    <Input
                      label="Степень"
                      value={overrides[c.id]?.degree ?? c.degree}
                      onChange={(x: string) =>
                        setOverrides({
                          ...overrides,
                          [c.id]: { ...overrides[c.id], degree: x },
                        })
                      }
                    />
                    <Toggle
                      label="Исключить эту награду"
                      value={overrides[c.id]?.exclude}
                      onChange={(x: boolean) =>
                        setOverrides({
                          ...overrides,
                          [c.id]: { ...overrides[c.id], exclude: x },
                        })
                      }
                    />
                    {overrides[c.id] && (
                      <Input
                        label="Причина изменения"
                        value={overrides[c.id].reason || ""}
                        onChange={(x: string) =>
                          setOverrides({
                            ...overrides,
                            [c.id]: { ...overrides[c.id], reason: x },
                          })
                        }
                      />
                    )}
                  </section>
                ))}
              </div>
              <Button
                kind="primary"
                onClick={async () => {
                  await api("/runs/" + runId + "/awards/approve", {
                    resultHash: preview.resultHash,
                    overrides,
                  });
                  setPreview(null);
                  await reload();
                }}
              >
                Утвердить список награждения
              </Button>
            </>
          ) : (
            <p>
              По опубликованным правилам получателей нет. Настройте правила в
              проекте и используйте новую редакцию для следующего проведения.
            </p>
          )}
        </Modal>
      )}
      {nomination && (
        <Modal
          title={"Получатели номинации: " + nomination.title}
          onClose={() => setNomination(null)}
        >
          {[...new Map(rows.map((a) => [a.participantId, a])).values()].map(
            (a) => (
              <Toggle
                key={a.participantId}
                label={a.participant.fullName}
                value={nominees.includes(a.participantId)}
                onChange={(value: boolean) =>
                  setNominees(
                    value
                      ? [...nominees, a.participantId]
                      : nominees.filter((x) => x !== a.participantId),
                  )
                }
              />
            ),
          )}
          <Textarea
            label="Основание назначения"
            value={nominationReason}
            onChange={setNominationReason}
          />
          <Button
            kind="primary"
            disabled={!nominationReason.trim()}
            onClick={async () => {
              await api(
                "/runs/" + runId + "/nominations",
                {
                  ruleId: nomination.id,
                  participantIds: nominees,
                  reason: nominationReason,
                },
                "PUT",
              );
              setNomination(null);
              await reload();
            }}
          >
            Сохранить получателей
          </Button>
        </Modal>
      )}
      {reissue && (
        <Modal
          title="Исправление выданного документа"
          onClose={() => setReissue(null)}
        >
          <Input
            label="ФИО в новом экземпляре"
            value={reissueName}
            onChange={setReissueName}
          />
          <Textarea
            label="Причина исправления или отзыва"
            value={reason}
            onChange={setReason}
          />
          <div className="actions">
            <Button
              kind="primary"
              disabled={!reason.trim()}
              onClick={async () => {
                await api("/issues/" + reissue.id + "/reissue", {
                  reason,
                  fields: { fullName: reissueName },
                });
                setReissue(null);
                await reload();
              }}
            >
              Перевыпустить
            </Button>
            <Button
              kind="danger"
              disabled={!reason.trim()}
              onClick={async () => {
                await api("/issues/" + reissue.id + "/revoke", { reason });
                setReissue(null);
                await reload();
              }}
            >
              Отозвать без замены
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function expectedText(q: Question) {
  const k = q.key,
    c = q.config;
  switch (q.type) {
    case "single_choice":
      return c.options?.find((x: Json) => x.id === k.optionId)?.label || "";
    case "multiple_choice":
      return c.options
        ?.filter((x: Json) => k.optionIds?.includes(x.id))
        .map((x: Json) => x.label)
        .join(", ");
    case "short_text":
      return k.acceptedAnswers?.join(", ");
    case "calculation":
      return `${k.value} ${k.unit || ""} ± ${k.tolerance || 0}`;
    case "matching":
    case "classification":
      return (c.items || [])
        .map(
          (item: Json) =>
            item.label +
            " → " +
            (c.targets?.find(
              (target: Json) => target.id === k.mapping?.[item.id],
            )?.label || "—"),
        )
        .join("\n");
    case "ordering":
      return (k.order || [])
        .map(
          (id: string, index: number) =>
            index +
            1 +
            ". " +
            (c.items?.find((item: Json) => item.id === id)?.label || "—"),
        )
        .join("\n");
    case "crossword":
      return (c.clues || [])
        .map((clue: Json) => clue.label + ": " + (k.words?.[clue.id] || "—"))
        .join("\n");
    case "table":
      return (c.rows || [])
        .flatMap((row: Json) =>
          (c.columns || []).map(
            (column: Json) =>
              row.label +
              " / " +
              column.label +
              ": " +
              (k.cells?.[row.id + ":" + column.id] ?? "—"),
          ),
        )
        .join("\n");
    case "dish_assembly":
    case "restaurant_kitchen":
      return (c.items || [])
        .filter((item: Json) => k.selectedIds?.includes(item.id))
        .map(
          (item: Json) =>
            item.label +
            (k.placements?.[item.id]
              ? " → " +
                (c.slots?.find(
                  (slot: Json) => slot.id === k.placements[item.id],
                )?.label || "")
              : ""),
        )
        .join("\n");
    case "hotspot":
      return (c.zones || [])
        .filter((zone: Json) => k.zoneIds?.includes(zone.id))
        .map((zone: Json) => zone.label)
        .join(", ");
    case "safety_checklist":
      return (c.items || [])
        .map(
          (item: Json) =>
            item.label + ": " + (k.checks?.[item.id] ? "Да" : "Нет"),
        )
        .join("\n");
    default:
      return Object.entries(k)
        .map(
          ([key, value]) =>
            `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`,
        )
        .join("\n");
  }
}
function historyLabel(value: string) {
  return (
    (
      {
        "attempt.started": "Начата попытка",
        "answer.reviewed": "Ответ проверен",
        "round.submitted": "Тур завершён",
        "round.decision": "Решение по переходу",
        "attempt.pause": "Изменена пауза",
      } as Json
    )[value] || "Изменение работы"
  );
}
