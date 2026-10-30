import { useEffect, useState, useRef, useCallback } from "react";
import {
  BookOpen,
  Clock,
  Check,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Download,
} from "lucide-react";
import type { Json, Question } from "../shared/types";
import { api, blobRequest, download, localGet, localSet } from "./api";
import { uid } from "../shared/catalog";
import { Button, Input, Toggle, Empty, Modal } from "./ui";
import { Task, Media } from "./Tasks";
export function Participant({ runId }: { runId: string }) {
  const [run, setRun] = useState<Json | null>(null),
    [session, setSession] = useState<Json | null>(() => {
      try {
        return JSON.parse(
          localStorage.getItem("constructor-session:" + runId) || "null",
        );
      } catch {
        return null;
      }
    }),
    [attempt, setAttempt] = useState<Json | null>(null),
    [code, setCode] = useState(""),
    [profile, setProfile] = useState<Json>({
      fullName: "",
      institution: "",
      groupName: "",
      mentorName: "",
    }),
    [consent, setConsent] = useState(false),
    [value, setValue] = useState<any>(undefined),
    [saved, setSaved] = useState(""),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState(false),
    [clock, setClock] = useState(Date.now()),
    [documents, setDocuments] = useState<Json[]>([]),
    [leaderboard, setLeaderboard] = useState<Json[] | null>(null),
    [moving, setMoving] = useState(false),
    [storageAvailable, setStorageAvailable] = useState(true);
  const aRef = useRef<Json | null>(null),
    valueRef = useRef<any>(undefined),
    dirty = useRef(false),
    seq = useRef(0),
    revision = useRef(0),
    pending = useRef<Json | null>(null),
    inFlight = useRef<Promise<void> | null>(null),
    clockOffset = useRef(0),
    qidRef = useRef("");
  const r = attempt?.rounds[attempt.currentRound],
    q: Question | undefined = r?.questions[attempt?.currentQuestion];
  const draftKey = () => `answer:${aRef.current?.id}:${qidRef.current}`;
  const stash = async () => {
    const ok = await localSet(draftKey(), {
      value: valueRef.current,
      expectedRevision: revision.current,
      operation: pending.current,
      dirty: dirty.current,
      time: Date.now(),
    });
    setStorageAvailable(ok);
    return ok;
  };
  const receive = (a: Json) => {
    aRef.current = a;
    if (a.serverTime) clockOffset.current = a.serverTime - Date.now();
    setAttempt(a);
  };
  useEffect(() => {
    api("/public/runs/" + runId)
      .then(setRun)
      .catch((e) => setError(e.message));
  }, [runId]);
  const refresh = useCallback(async () => {
    if (!session) return;
    const a = await api(
      "/public/attempts/" + session.attemptId,
      undefined,
      "GET",
      session.token,
    );
    receive(a);
    if (a.status === "completed")
      api(
        "/public/attempts/" + a.id + "/documents",
        undefined,
        "GET",
        session.token,
      )
        .then(setDocuments)
        .catch(() => {});
  }, [session]);
  useEffect(() => {
    if (!session) return;
    refresh().catch((e) => setError(e.message));
    const timer = setInterval(() => refresh().catch(() => {}), 5000);
    return () => clearInterval(timer);
  }, [session, refresh]);
  useEffect(() => {
    const timer = setInterval(
      () => setClock(Date.now() + clockOffset.current),
      500,
    );
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!q || !attempt) return;
    let active = true;
    const key = `answer:${attempt.id}:${q.id}`;
    qidRef.current = q.id;
    revision.current = attempt.answers[q.id]?.revision || 0;
    dirty.current = false;
    pending.current = null;
    seq.current = 0;
    setConflict(false);
    setError("");
    valueRef.current = attempt.answers[q.id]?.answer;
    setValue(valueRef.current);
    setSaved(attempt.answers[q.id] ? "Ответ подтверждён сервером" : "");
    localGet(key).then((cache) => {
      if (!active || !cache?.dirty) return;
      valueRef.current = cache.value;
      setValue(cache.value);
      dirty.current = true;
      pending.current = cache.operation || null;
      revision.current = cache.expectedRevision || 0;
      setSaved("Восстановлена локальная копия ответа");
      if (
        !pending.current &&
        revision.current !== (aRef.current?.answers[q.id]?.revision || 0)
      )
        setConflict(true);
    });
    return () => {
      active = false;
    };
  }, [q?.id, attempt?.id]);
  const flush = useCallback(async () => {
    if (!session || !aRef.current || !qidRef.current) return;
    if (inFlight.current) await inFlight.current;
    if (conflict)
      throw new Error(
        "Сначала выберите версию ответа при конфликте сохранения.",
      );
    if (!dirty.current) return;
    const task = async () => {
      while (dirty.current) {
        const version = seq.current,
          questionId = qidRef.current;
        if (!pending.current)
          pending.current = {
            answer: structuredClone(valueRef.current),
            expectedRevision: revision.current,
            idempotencyKey: uid("save"),
          };
        const op = pending.current;
        await stash();
        setSaved("Отправляем ответ…");
        try {
          const receipt = await api(
            `/public/attempts/${session.attemptId}/answers/${questionId}`,
            op,
            "PUT",
            session.token,
          );
          if (qidRef.current !== questionId) return;
          revision.current = receipt.revision;
          pending.current = null;
          if (version === seq.current) dirty.current = false;
          setSaved(
            dirty.current
              ? "Сохраняем новые изменения…"
              : "Ответ подтверждён сервером",
          );
          await stash();
        } catch (e: any) {
          setSaved(
            "Ответ сохранён на устройстве; подтверждение сервера не получено",
          );
          if (e.status === 409) {
            setConflict(true);
            setError(e.message);
          }
          throw e;
        }
      }
    };
    inFlight.current = task();
    try {
      await inFlight.current;
    } finally {
      inFlight.current = null;
    }
  }, [session, conflict]);
  useEffect(() => {
    if (
      !dirty.current ||
      conflict ||
      !attempt ||
      attempt.status !== "in_progress"
    )
      return;
    const timer = setTimeout(() => flush().catch(() => {}), 650);
    return () => clearTimeout(timer);
  }, [value, conflict, attempt?.status, flush]);
  useEffect(() => {
    const retry = () => {
      if (dirty.current && !conflict) flush().catch(() => {});
    };
    window.addEventListener("online", retry);
    const timer = setInterval(retry, 4500);
    return () => {
      window.removeEventListener("online", retry);
      clearInterval(timer);
    };
  }, [flush, conflict]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current && !storageAvailable) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [storageAvailable]);
  const change = (next: any) => {
    valueRef.current = next;
    setValue(next);
    seq.current++;
    dirty.current = true;
    setSaved("Сохраняем на устройстве…");
    stash();
  };
  const navigate = async (index: number) => {
    setMoving(true);
    try {
      await flush();
      receive(
        await api(
          "/public/attempts/" + session!.attemptId + "/navigate",
          { index },
          "POST",
          session!.token,
        ),
      );
    } finally {
      setMoving(false);
    }
  };
  const begin = async () => {
    const key = "constructor-start:" + runId;
    let startKey = localStorage.getItem(key);
    if (!startKey) {
      startKey = uid("start");
      localStorage.setItem(key, startKey);
    }
    const result = await api("/public/runs/" + runId + "/begin", {
      code,
      participant: profile,
      consent,
      startKey,
    });
    localStorage.setItem(
      "constructor-session:" + runId,
      JSON.stringify(result),
    );
    setSession(result);
    setError("");
  };
  const deadlines = attempt?.deadlines
    ? (Object.values(attempt.deadlines).filter(
        (x) => typeof x === "number",
      ) as number[])
    : [];
  const remaining = deadlines.length
    ? Math.max(0, Math.ceil((Math.min(...deadlines) - clock) / 1000))
    : null;
  const time =
    remaining == null
      ? "Без ограничения"
      : `${Math.floor(remaining / 60)
          .toString()
          .padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`;
  const resolveConflict = async (useServer: boolean) => {
    if (!session) return;
    const latest = await api(
      "/public/attempts/" + session.attemptId,
      undefined,
      "GET",
      session.token,
    );
    receive(latest);
    const entry = latest.answers[qidRef.current];
    revision.current = entry?.revision || 0;
    pending.current = null;
    if (useServer) {
      valueRef.current = entry?.answer;
      setValue(entry?.answer);
      dirty.current = false;
      setSaved("Ответ подтверждён сервером");
    } else {
      dirty.current = true;
      setSaved("Сохраняем выбранную локальную копию…");
    }
    setConflict(false);
    setError("");
    await stash();
  };
  const currentCase = r?.cases?.find((c: Json) => c.id === q?.caseId);
  return (
    <div
      className="participant-shell"
      style={
        {
          "--accent": attempt?.theme?.accent || "#005b43",
          "--participant-background": attempt?.theme?.background || "#f5f7f8",
        } as React.CSSProperties
      }
    >
      <header className="participant-header">
        <BookOpen size={30} />
        <div>
          <strong>{run?.title || "Олимпиада"}</strong>
          <span>{attempt?.participant?.fullName || "Вход участника"}</span>
        </div>
        {run?.trial && <small>Пробное прохождение</small>}
      </header>
      {error && (
        <div className="error" role="alert">
          <p>{error}</p>
          {conflict && (
            <div className="actions">
              <Button onClick={() => resolveConflict(true)}>
                Использовать серверный ответ
              </Button>
              <Button onClick={() => resolveConflict(false)}>
                Сохранить мою копию как новую
              </Button>
              <Button
                onClick={() =>
                  download(
                    new Blob([JSON.stringify(valueRef.current, null, 2)]),
                    "Локальная копия ответа.json",
                  )
                }
              >
                Скачать копию
              </Button>
            </div>
          )}
        </div>
      )}
      {!run ? (
        <p>Загружаем проведение…</p>
      ) : !session ? (
        <main className="participant-entry panel">
          <h1>{run.title}</h1>
          {run.cover && <Media src={run.cover} alt="Обложка олимпиады" />}
          <p>{run.description}</p>
          {run.legend && <p className="legend">{run.legend}</p>}
          <ol>
            {run.rounds.map((r: Json) => (
              <li key={r.id}>
                {r.title} · заданий: {r.questionCount}
              </li>
            ))}
          </ol>
          {run.entryMode === "codes" ? (
            <Input
              label="Персональный код"
              value={code}
              onChange={setCode}
              autoComplete="off"
            />
          ) : (
            <>
              <Input
                label="ФИО участника"
                value={profile.fullName}
                onChange={(x: string) =>
                  setProfile({ ...profile, fullName: x })
                }
              />
              {[
                ["institution", "Образовательная организация"],
                ["groupName", "Группа"],
                ["mentorName", "ФИО наставника"],
              ]
                .filter(([key]) => run.registrationFields?.includes(key))
                .map(([key, label]) => (
                  <Input
                    key={key}
                    label={label}
                    value={profile[key]}
                    onChange={(x: string) =>
                      setProfile({ ...profile, [key]: x })
                    }
                  />
                ))}
              <Toggle
                label="Согласен на обработку введённых сведений для проведения работы и оформления результатов"
                value={consent}
                onChange={setConsent}
              />
            </>
          )}
          <Button
            kind="primary"
            disabled={
              run.status !== "open" ||
              (run.entryMode === "codes"
                ? !code.trim()
                : !profile.fullName.trim() || !consent)
            }
            onClick={begin}
          >
            Начать работу
            <ArrowRight size={18} />
          </Button>
          {run.status !== "open" && <p>Вход пока закрыт организатором.</p>}
        </main>
      ) : !attempt ? (
        <p>Восстанавливаем попытку…</p>
      ) : attempt.status === "completed" ||
        attempt.status === "excluded" ||
        attempt.excludedFromResults ? (
        <main className="panel participant-finish">
          <Check size={42} />
          <h1>
            {attempt.excludedFromResults
              ? "Работа исключена из зачёта"
              : "Работа завершена"}
          </h1>
          {attempt.excludedFromResults && <p>{attempt.exclusionReason}</p>}
          <p>{attempt.finalText}</p>
          {attempt.summary ? (
            <>
              {attempt.summary.pending ? (
                <h2>Результат ожидает проверки</h2>
              ) : (
                <h2>
                  {attempt.summary.score} из {attempt.summary.maxScore} баллов
                </h2>
              )}
              <table>
                <tbody>
                  {attempt.summary.rounds.map((r: Json) => (
                    <tr key={r.id}>
                      <td>{r.title}</td>
                      <td>
                        {r.score ?? "Ожидает проверки"} / {r.maxScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p>Результаты откроются после публикации организатором.</p>
          )}
          {documents.length > 0 && (
            <section>
              <h2>Ваши документы</h2>
              {documents.map((doc) => (
                <Button
                  key={doc.id}
                  onClick={async () =>
                    download(
                      await blobRequest(
                        `/public/attempts/${attempt.id}/documents/${doc.id}`,
                        undefined,
                        session.token,
                      ),
                      doc.number + ".pdf",
                    )
                  }
                >
                  <Download size={18} />
                  {doc.title}
                </Button>
              ))}
            </section>
          )}
          {attempt.published && (
            <Button
              onClick={async () =>
                setLeaderboard(await api("/public/runs/" + runId + "/results"))
              }
            >
              Общие результаты
            </Button>
          )}
          <Button onClick={refresh}>
            <RefreshCw size={17} />
            Обновить результат
          </Button>
          <Button
            onClick={() => {
              localStorage.removeItem("constructor-session:" + runId);
              localStorage.removeItem("constructor-start:" + runId);
              setSession(null);
              setAttempt(null);
              setCode("");
            }}
          >
            Войти с другим доступом
          </Button>
        </main>
      ) : attempt.status === "waiting" ? (
        <main className="panel participant-waiting">
          <Clock size={40} />
          <h1>Тур завершён</h1>
          <p>Ожидаем проверку или решение организатора о следующем туре.</p>
          <Button onClick={refresh}>Проверить состояние</Button>
        </main>
      ) : q ? (
        <main className="participant-work">
          <div className="participant-progress">
            <span>
              Тур {attempt.currentRound + 1} из {attempt.rounds.length} ·
              Задание {attempt.currentQuestion + 1} из {r.questions.length}
            </span>
            <strong>
              <Clock size={19} />
              {attempt.pausedAt ? "Пауза" : time}
            </strong>
          </div>
          {attempt.narrator?.enabled && (
            <section className="narrator">
              {attempt.narrator.image && (
                <Media
                  src={attempt.narrator.image}
                  token={session.token}
                  alt="Рассказчик"
                />
              )}
              <p>{q.dialogue || attempt.narrator.intro}</p>
            </section>
          )}
          {currentCase && (
            <section className="case-intro">
              <h2>{currentCase.title}</h2>
              <p>{currentCase.text}</p>
              {currentCase.media && (
                <Media
                  src={currentCase.media}
                  mime={currentCase.mediaMime || "image/webp"}
                  token={session.token}
                  alt={currentCase.title}
                />
              )}
            </section>
          )}
          {attempt.currentQuestion === 0 && r.instructions && (
            <details className="round-instructions">
              <summary>Инструкция к туру</summary>
              <p>{r.instructions}</p>
            </details>
          )}
          <h1>{q.title}</h1>
          <Task
            key={q.id}
            q={q}
            value={value}
            onChange={change}
            token={session.token}
            attemptId={attempt.id}
            readOnly={moving || Boolean(attempt.pausedAt)}
          />
          {attempt.pausedAt && (
            <div className="notice">
              Работа приостановлена организатором. Ожидайте продолжения.
            </div>
          )}
          <footer className="participant-actions">
            <p
              className={"save-status " + (dirty.current ? "pending" : "")}
              role="status"
            >
              {saved || "Выберите или введите ответ."}
            </p>
            {!storageAvailable && (
              <p className="error">
                Браузер не разрешил локальное сохранение. Дождитесь
                подтверждения сервера перед выходом.
              </p>
            )}
            <div className="actions">
              {r.allowBack && attempt.currentQuestion > 0 && (
                <Button
                  disabled={moving || attempt.pausedAt}
                  onClick={() => navigate(attempt.currentQuestion - 1)}
                >
                  <ArrowLeft size={16} />
                  Назад
                </Button>
              )}
              {attempt.currentQuestion < r.questions.length - 1 ? (
                <Button
                  kind="primary"
                  disabled={moving || attempt.pausedAt}
                  onClick={() => navigate(attempt.currentQuestion + 1)}
                >
                  Подтвердить и продолжить
                  <ArrowRight size={18} />
                </Button>
              ) : (
                <Button
                  kind="primary"
                  disabled={moving || attempt.pausedAt}
                  onClick={async () => {
                    setMoving(true);
                    try {
                      await flush();
                      receive(
                        await api(
                          "/public/attempts/" + attempt.id + "/finish-round",
                          {},
                          "POST",
                          session.token,
                        ),
                      );
                    } finally {
                      setMoving(false);
                    }
                  }}
                >
                  {attempt.currentRound === attempt.rounds.length - 1
                    ? "Завершить работу"
                    : "Завершить тур"}
                  <Check size={18} />
                </Button>
              )}
            </div>
          </footer>
        </main>
      ) : null}
      {leaderboard && (
        <Modal
          title="Опубликованные результаты"
          wide
          onClose={() => setLeaderboard(null)}
        >
          <table>
            <thead>
              <tr>
                <th>Место</th>
                <th>Участник</th>
                <th>Группа</th>
                <th>Балл</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, index) => (
                <tr key={index}>
                  <td>{row.place}</td>
                  <td>{row.participant}</td>
                  <td>{row.groupName}</td>
                  <td>
                    {row.score} / {row.maxScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}
export function VerifyDocument({ issueId }: { issueId: string }) {
  const [value, setValue] = useState<Json | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("/public/verify/" + issueId)
      .then(setValue)
      .catch((e) => setError(e.message));
  }, [issueId]);
  return (
    <main className="verification panel">
      <h1>Проверка документа</h1>
      {error ? (
        <p>{error}</p>
      ) : value ? (
        <>
          <h2>
            {value.status === "issued"
              ? "Документ зарегистрирован"
              : value.status === "suspended"
                ? "Действие документа приостановлено"
                : "Документ отозван"}
          </h2>
          <dl>
            <dt>Номер</dt>
            <dd>{value.number}</dd>
            <dt>Мероприятие</dt>
            <dd>{value.event}</dd>
            <dt>Дата</dt>
            <dd>{value.date}</dd>
          </dl>
        </>
      ) : (
        <p>Проверяем…</p>
      )}
    </main>
  );
}
