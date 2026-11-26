import { assistantRounds } from "../shared/authoring.js";
import { project as draftProject, TYPES } from "../shared/catalog.js";
import {
  chatEditFields,
  maxChatMessage,
  readChatDecision,
} from "../shared/assistant-chat.mjs";
import { maxWorkFiles, maxWorkInstruction } from "../shared/assistant-work.mjs";
import { validateProject } from "./domain.mjs";
import { maxLectureText } from "./assistant-documents.mjs";
import { fail, id } from "./util.mjs";

const kind = "assistant_chat";
const modelFailure = "Помощник не закончил запрос. Попробуйте ещё раз.";
const normalize = (value) => value.toLowerCase().replace(/ё/g, "е").trim();
const links = (projects) => projects.map(({ id, title }) => ({ id, title }));
const lectureList = (documents) =>
  documents.map(({ title, pages }) => ({
    title,
    preview: pages[0].text.slice(0, 650),
  }));

function context(project) {
  let remaining = 24;
  return {
    id: project.id,
    title: project.title,
    description: String(project.description || "").slice(0, 900),
    subject: project.subject,
    audience: project.audience,
    rounds: project.rounds.slice(0, 12).map((round) => ({
      id: round.id,
      title: round.title,
      instructions: String(round.instructions || "").slice(0, 350),
      questionCount: round.questions.length,
      questions: round.questions
        .slice(0, 10)
        .filter(() => remaining-- > 0)
        .map((q) => ({
          id: q.id,
          title: String(q.title).slice(0, 160),
          type: q.type,
        })),
    })),
  };
}

function draftChanges(project, edits) {
  const changes = [];
  const used = new Set();
  for (const { scope, field, value, roundId, questionId } of edits) {
    const round = roundId && project.rounds.find((item) => item.id === roundId);
    const question =
      questionId && round?.questions?.find((item) => item.id === questionId);
    const item = question || round || project;
    if ((roundId && !round) || (questionId && !question)) return null;
    if (scope !== (question ? "question" : round ? "round" : "project"))
      return null;
    const label = chatEditFields[scope];
    const key = item.id + "/" + field;
    if (
      !Object.hasOwn(label, field) ||
      used.has(key) ||
      (field === "title" && !value)
    )
      return null;
    used.add(key);
    const next = value.slice(
      0,
      field === "title" ? (question ? 1000 : 240) : 3000,
    );
    const previous = String(item[field] || "");
    if (previous === next) continue;
    changes.push({
      scope,
      field,
      roundId,
      questionId,
      value: next,
      previous,
      label: label[field],
      location: item.title,
    });
    item[field] = next;
  }
  return changes;
}

function projectReport(project) {
  const types = new Map();
  for (const round of project.rounds) {
    for (const q of round.questions) {
      const label = TYPES[q.type] || q.type;
      types.set(label, (types.get(label) || 0) + 1);
    }
  }
  const issues = validateProject(project);
  const lines = [
    `«${project.title}». Туров или разделов — ${project.rounds.length}, заданий — ${[...types.values()].reduce((a, b) => a + b, 0)}.`,
    [...types].map(([label, count]) => `${label} — ${count}`).join(", "),
    issues.length
      ? `Замечаний по структуре — ${issues.length}.`
      : "Проверка структуры и ключей не выявила ошибок.",
    ...issues.slice(0, 16).map((issue) => "• " + issue),
    issues.length > 16 ? "Остальные замечания доступны в редакторе." : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export function createAssistantProjects(service, user, work) {
  const titles = new Map();
  for (const group of work.groups) {
    if (!titles.has(group.workTitle)) titles.set(group.workTitle, []);
    titles.get(group.workTitle).push(group);
  }
  return [...titles].map(([title, groups]) => {
    const project = draftProject(title, "test");
    project.rounds = assistantRounds(groups);
    return service.createProject(user, { project });
  });
}

export function registerAssistantChat(
  app,
  {
    api,
    auth,
    wrap,
    send,
    service,
    jobs,
    enabled,
    online,
    prune,
    checkQueue,
    parseMaterials,
    enqueue,
    resume,
    waitForReply,
    cancel,
  },
) {
  const { store } = service;
  const route = api + "/assistant/chats";

  function save(thread, data) {
    const { id: key, owner, revision, updatedAt, ...content } = thread;
    return store.put(kind, key, owner, { ...content, ...data }, "", revision);
  }

  function append(thread, role, text, data = {}, extra = {}) {
    const messages = [
      ...thread.messages,
      { id: id("turn"), role, text, ...extra },
    ].slice(-40);
    return save(thread, { ...data, messages });
  }

  function current(user, key) {
    const thread = store.get(kind, key);
    fail(thread?.owner === user.id, "Чат не найден.", 404);
    return thread;
  }

  function ownerOf(job) {
    const user = store.user(job.actor);
    return user?.active ? user : null;
  }

  function jobThread(job) {
    const thread = store.get(kind, job.chat?.threadId);
    return thread?.pendingId === job.id ? thread : null;
  }

  function detail(thread) {
    const job = jobs.get(thread.pendingId);
    return {
      id: thread.id,
      title: thread.title,
      target: thread.target,
      messages: thread.messages,
      proposal: thread.proposal,
      pending: job ? { state: job.state, progress: job.progress } : null,
    };
  }

  function active(thread) {
    if (!thread.pendingId) return thread;
    prune();
    thread = store.get(kind, thread.id);
    const pendingId = thread.pendingId;
    if (!pendingId || jobs.has(pendingId)) return thread;
    return append(
      thread,
      "assistant",
      "Запрос завершился без результата. Его можно отправить ещё раз.",
      { pendingId: null },
    );
  }

  const createThread = (user) => {
    fail(
      store.list(kind, user.id).length < 60,
      "Удалите один из старых чатов и повторите попытку.",
      409,
    );
    return store.put(kind, id("chat"), user.id, {
      title: "Новый чат",
      target: null,
      messages: [],
      proposal: null,
      pendingId: null,
    });
  };

  app.get(
    route,
    auth,
    wrap((req, res) => {
      const entries = store
        .list(kind, req.user.id)
        .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }));
      send(res, entries);
    }),
  );

  app.get(
    route + "/:threadId",
    auth,
    wrap((req, res) => {
      send(res, detail(active(current(req.user, req.params.threadId))));
    }),
  );

  app.delete(
    route + "/:threadId",
    auth,
    wrap((req, res) => {
      const thread = current(req.user, req.params.threadId);
      const job = jobs.get(thread.pendingId);
      if (job) cancel(job);
      store.remove(kind, thread.id);
      send(res, {});
    }),
  );

  app.post(
    route + "/:threadId/cancel",
    auth,
    wrap((req, res) => {
      const thread = active(current(req.user, req.params.threadId));
      const job = jobs.get(thread.pendingId);
      if (job) cancel(job);
      send(res, detail(active(current(req.user, thread.id))));
    }),
  );

  app.post(
    [route + "/message", route + "/:threadId/message"],
    auth,
    wrap(async (req, res) => {
      const user = req.user;
      const key = req.params.threadId;
      fail(
        enabled && online(),
        "ИИ-чат сейчас недоступен. Проверьте подключение компьютера колледжа.",
        503,
      );
      if (key) current(user, key);
      checkQueue(user.id);
      const incoming = await parseMaterials(req, res);
      if (res.destroyed) return;
      const original = req.body?.instruction;
      fail(
        original === undefined ||
          (typeof original === "string" && original.length <= maxChatMessage),
        "Сократите сообщение до 12 000 символов.",
      );
      const text =
        original?.trim() ||
        (incoming.length
          ? "Составь учебную работу по приложенным лекциям."
          : "");
      fail(text, "Напишите сообщение или прикрепите лекцию.");
      checkQueue(user.id);
      const thread = key ? active(current(user, key)) : createThread(user);
      const pending = jobs.get(thread.pendingId);
      fail(
        !pending || pending.state === "clarify",
        "Дождитесь ответа или остановите запрос.",
        409,
      );
      const targetId =
        req.body?.projectId === undefined
          ? thread.target?.id
          : req.body.projectId;
      const visible = service.visible(user, "project");
      const target = visible.find((project) => project.id === targetId) || null;
      const textForSearch = normalize(text);
      const words = textForSearch.match(/[\p{L}\p{N}]{4,}/gu) || [];
      const rank = (project) => {
        const title = normalize(project.title);
        if (!title) return 0;
        return (
          (project.id === target?.id ? 50 : 0) +
          (textForSearch.includes(title) ? 100 : 0) +
          words.filter((word) => title.includes(word)).length
        );
      };
      const candidates = visible
        .map((project) => ({ project, score: rank(project) }))
        .sort((a, b) => b.score - a.score);
      const projectList = candidates.slice(0, 35).map(({ project }) => project);
      const detailed = candidates
        .filter(({ score }) => score > 0)
        .slice(0, 2)
        .map(({ project }) => project);
      const title = thread.messages.length
        ? thread.title
        : text.replace(/\s+/g, " ").slice(0, 84);
      const attachments = incoming.map(({ title }) => title);
      const documents = pending
        ? [...pending.documents, ...incoming]
        : incoming;
      if (pending) {
        fail(
          text.length <= 2500,
          "Сократите ответ на уточнение до 2500 символов.",
        );
        fail(
          documents.length <= maxWorkFiles,
          "До 5 лекций на одно поручение.",
        );
        fail(
          documents
            .flatMap(({ pages }) => pages)
            .reduce((size, page) => size + page.text.length, 0) <=
            maxLectureText,
          "Суммарный текст превышает 240 000 символов. Разделите материалы.",
        );
      }
      if (pending?.work && (targetId || "") === (thread.target?.id || "")) {
        append(thread, "user", text, {}, { attachments });
        pending.documents = documents;
        pending.input.lectures = lectureList(pending.documents);
        resume(pending, text);
        return send(res.status(202), detail(current(user, thread.id)));
      }
      const history = thread.messages
        .slice(-10)
        .map(({ role, text }) => ({ role, text: text.slice(0, 650) }));
      const job = enqueue({
        actor: user.id,
        documents,
        chat: {
          threadId: thread.id,
          original: pending?.chat.original || text,
          replies: pending
            ? [...(pending.input.replies || pending.chat.replies), text]
            : [],
          revisions: Object.fromEntries(
            projectList.map((p) => [p.id, p.revision]),
          ),
        },
        input: {
          kind: "chat",
          message: text,
          history,
          projects: links(projectList),
          currentProjectId: target?.id || "",
          details: detailed.map(context),
          pendingDraft: thread.proposal?.work
            ? {
                action: thread.proposal.action,
                title: thread.proposal.work.title,
                projectId: thread.proposal.target?.id,
                roundId: thread.proposal.roundId,
                groups: thread.proposal.work.groups.map((group) => ({
                  title: group.title,
                  workTitle: group.workTitle,
                  count: group.questions.length,
                  examples: group.questions
                    .slice(0, 2)
                    .map(({ type, prompt }) => ({
                      type,
                      prompt: prompt.slice(0, 120),
                    })),
                })),
              }
            : undefined,
          attachments: documents.map(({ title, pages }) => ({
            title,
            pages: pages.length,
            excerpts: pages.slice(0, 2).map(({ text, locator }) => ({
              text: text.slice(0, 460),
              locator,
            })),
          })),
        },
      });
      try {
        const updated = append(
          thread,
          "user",
          text,
          {
            title,
            target: target ? links([target])[0] : null,
            pendingId: job.id,
          },
          { attachments },
        );
        if (pending) cancel(pending);
        send(res.status(202), detail(updated));
      } catch (error) {
        jobs.delete(job.id);
        throw error;
      }
    }),
  );

  app.post(
    route + "/:threadId/apply/:proposalId",
    auth,
    wrap((req, res) => {
      const result = store.transaction(() => {
        const thread = current(req.user, req.params.threadId);
        const { proposalId } = req.params;
        if (thread.messages.some((message) => message.applied === proposalId))
          return thread;
        const proposal = thread.proposal;
        fail(
          proposal?.id === proposalId && !thread.pendingId,
          "Сначала дождитесь ответа или запросите новый предпросмотр.",
          409,
        );
        let projects;
        if (proposal.action === "create") {
          projects = createAssistantProjects(service, req.user, proposal.work);
        } else {
          const project = service.get(
            req.user,
            "project",
            proposal.target.id,
            true,
          );
          fail(
            project.revision === proposal.revision &&
              project.status !== "archived",
            "Работа изменилась после предпросмотра. Попросите помощника подготовить изменения заново.",
            409,
          );
          if (proposal.action === "add") {
            const rounds = assistantRounds(proposal.work.groups);
            if (proposal.roundId) {
              project.rounds
                .find((round) => round.id === proposal.roundId)
                .questions.push(...rounds.flatMap((round) => round.questions));
            } else {
              project.rounds.push(...rounds);
            }
          } else {
            fail(
              draftChanges(project, proposal.changes)?.length ===
                proposal.changes.length,
              "Состав работы изменился. Запросите новый предпросмотр.",
              409,
            );
          }
          projects = [
            service.saveProject(req.user, project.id, {
              project,
              expectedRevision: proposal.revision,
            }),
          ];
        }
        return append(
          thread,
          "assistant",
          proposal.action === "create"
            ? "Черновик сохранён. Его можно открыть в редакторе."
            : "Изменения внесены в рабочий черновик.",
          {
            proposal: null,
            target: projects.length === 1 ? links(projects)[0] : null,
          },
          { projects: links(projects), applied: proposalId },
        );
      });
      send(res, detail(result));
    }),
  );

  function settle(job, text, data = {}, extra = {}) {
    const thread = jobThread(job);
    if (thread)
      append(thread, "assistant", text, { pendingId: null, ...data }, extra);
  }

  return {
    completePlan(job, value) {
      const thread = jobThread(job);
      const user = ownerOf(job);
      if (!thread || !user) return false;
      const decision = readChatDecision(value);
      if (!decision) {
        settle(job, modelFailure);
        return false;
      }
      const { action, text, instruction, roundId, edits } = decision;
      if (action === "clarify" && job.chat.replies.length < 3) {
        waitForReply(job, text);
        return true;
      }
      if (action === "answer" || action === "clarify") {
        settle(job, text);
        return false;
      }
      let project;
      const projectId = decision.projectId || thread.target?.id;
      const writable = action === "add" || action === "update";
      if (action !== "create") {
        try {
          if (Object.hasOwn(job.chat.revisions, projectId))
            project = service.get(user, "project", projectId, writable);
        } catch (error) {
          if (error.status !== 404) throw error;
        }
        if (!project || (writable && project.status === "archived")) {
          settle(
            job,
            writable
              ? "Выберите доступную для редактирования работу в поле «Работа для чата» или напишите её точное название."
              : "Уточните название работы или выберите её в поле «Работа для чата».",
          );
          return false;
        }
      }
      const target = project ? links([project])[0] : null;
      const revision = project?.revision;
      if (action === "locate" || action === "inspect") {
        settle(
          job,
          action === "locate"
            ? `Нашёл «${project.title}».`
            : projectReport(project),
          { target },
          { projects: [target] },
        );
        return false;
      }
      if (project && revision !== job.chat.revisions[project.id]) {
        settle(
          job,
          "Работа изменилась во время запроса. Повторите поручение для свежей редакции.",
          { target },
        );
        return false;
      }
      if (action === "update") {
        const changes = draftChanges(project, edits);
        if (!changes?.length) {
          settle(
            job,
            changes
              ? "Указанный текст уже сохранён в работе."
              : "Уточните, какое поле, тур или задание нужно изменить.",
            { target },
          );
        } else {
          settle(
            job,
            "Подготовил изменения. Проверьте текст перед применением.",
            {
              target,
              proposal: {
                id: id("proposal"),
                action,
                revision,
                target,
                changes,
              },
            },
          );
        }
        return false;
      }
      const round =
        action === "add" && roundId
          ? project.rounds.find((entry) => entry.id === roundId)
          : null;
      if (action === "add" && roundId && !round) {
        settle(job, "Уточните название тура, в который добавить задания.", {
          target,
        });
        return false;
      }
      if (target) save(thread, { target });
      job.chat.work = {
        action,
        target,
        revision,
        roundId: round?.id,
        roundTitle: round?.title,
      };
      job.projectId = target?.id || null;
      job.work = true;
      job.cache = new Map();
      job.contexts = [];
      job.input = {
        kind: "work",
        instruction: job.chat.original.slice(0, maxWorkInstruction),
        contextInstruction:
          instruction === job.chat.original ? "" : instruction,
        replies: [...job.chat.replies],
        inProject: Boolean(target),
        lectures: lectureList(job.documents),
      };
      resume(job);
      return true;
    },

    clarify(job, question) {
      const thread = jobThread(job);
      if (thread) append(thread, "assistant", question);
    },

    finish(job, state, result) {
      if (!jobThread(job)) return;
      if (state === "ready" && result?.work && job.chat.work) {
        const { action, target, revision, roundId, roundTitle } = job.chat.work;
        const groups = result.work.groups;
        const total = groups.reduce(
          (n, group) => n + group.questions.length,
          0,
        );
        settle(
          job,
          `Подготовил заданий — ${total}. Проверьте работу, ключи и источники перед сохранением.`,
          {
            proposal: {
              id: id("proposal"),
              action,
              target,
              revision,
              roundId,
              roundTitle,
              work: result.work,
            },
            ...(target ? { target } : {}),
          },
        );
      } else if (state === "failed" || state === "cancelled") {
        settle(
          job,
          state === "cancelled"
            ? "Запрос остановлен."
            : result?.error || modelFailure,
        );
      }
    },
  };
}
