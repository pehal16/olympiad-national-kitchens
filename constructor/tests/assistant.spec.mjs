import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { zipSync } from "fflate";
import { createApp, API } from "../server/index.mjs";
import { validateProject } from "../server/domain.mjs";
import { researchWorkGroup } from "../server/assistant-sources.mjs";
import {
  resolveWorkPlan,
  testScopeQuestion,
} from "../shared/assistant-work.mjs";

test("an explicit single request keeps its topic and count when planning returns no usable plan", () => {
  const plan = resolveWorkPlan(null, {
    instruction:
      "Добавь ровно один вопрос с одним правильным ответом о сокращении дробей.",
    replies: [],
    inProject: true,
  });
  assert.deepEqual(
    plan.groups.map(({ count, topic, format }) => ({ count, topic, format })),
    [{ count: 1, topic: "сокращении дробей", format: "test" }],
  );
});

test("a supplied textbook chapter remains usable when plan keywords are in another language", async () => {
  const chapter = new URL(
    "https://openstax.org/books/chemistry-2e/pages/10-1-intermolecular-forces",
  );
  const text =
    "Intermolecular forces include dispersion forces, dipole-dipole attractions and hydrogen bonds.";
  const cache = new Map([
    [
      chapter.href,
      Promise.resolve({
        url: chapter,
        bytes: Buffer.from("<main><p>" + text + "</p></main>"),
      }),
    ],
  ]);
  const result = await researchWorkGroup(
    { instruction: "Учебник " + chapter.href, replies: [] },
    { topic: "Межмолекулярные силы", query: "", englishQuery: "" },
    [],
    cache,
  );
  assert.equal(result.sources[0].kind, "textbook");
  assert.equal(result.sources[0].excerpt, text);
});

test("explicit clarification retains all requested blocks in one work", () => {
  const input = {
    instruction:
      "Сделай 5 тестов по мясу, 10 тестов по тесту и два интерактивных задания по горячим блюдам.",
    replies: [],
  };
  assert.match(testScopeQuestion(input), /отдельные работы/u);
  input.replies.push(
    "В одной работе 5 вопросов по мясу, 10 вопросов по дрожжевому тесту и 2 интерактивных задания по горячим блюдам.",
  );
  assert.equal(testScopeQuestion(input), "");
  const plan = resolveWorkPlan(
    { state: "clarify", question: "Уточните." },
    input,
  );
  assert.deepEqual(
    plan.groups.map((group) => [group.count, group.format, group.workTitle]),
    [
      [5, "test", ""],
      [10, "test", ""],
      [2, "interactive", ""],
    ],
  );
});

test("assistant jobs are private to their project's author, require a live worker and verify the source before preview", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "constructor-ai-test-"));
  const workerToken = randomBytes(32).toString("base64url");
  const instance = createApp({
    storageDir: dir,
    assistantWorkerToken: workerToken,
  });
  const server = instance.app.listen(0, "127.0.0.1");
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await instance.close();
    // The directory was allocated for this test with mkdtemp and is never reused.
    fs.rmSync(dir, { recursive: true, force: true });
  });
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}${API}`;
  const user = await instance.service.setup({
    setupCode: instance.store.meta("setupSecret"),
    login: "assistant-owner",
    name: "Проверочный владелец",
    password: "Disposable-test-1",
  });
  const owner = instance.service.authenticate(user.token);
  const { invitation } = instance.service.invite(owner, {
    name: "Проверочный педагог",
  });
  const teacher = await instance.service.acceptInvite({
    invitation,
    login: "assistant-teacher",
    password: "Disposable-test-2",
  });
  const project = instance.service.createProject(owner, {
    title: "Пробный проект",
  });
  const projectRoute = `/projects/${project.id}/assistant`;
  const workerRoute = "/assistant/worker";
  const source = {
    sourceTitle: "Пробный материал",
    sourceText:
      "В учебной карте круассан готовят из дрожжевого слоёного теста. Заготовку сворачивают от основания треугольника к вершине.",
    topic: "Вид теста",
  };
  const sample = {
    title: "Тесто для круассана",
    prompt: "Какое тесто указано в учебной карте?",
    options: ["Дрожжевое слоёное", "Песочное", "Заварное", "Бисквитное"],
    correctIndex: 0,
    evidence: "круассан готовят из дрожжевого слоёного теста",
  };
  const call = async (
    route,
    { user, worker, method, body, csrf = true } = {},
  ) => {
    const form = body instanceof FormData;
    const response = await fetch(base + route, {
      method: method ?? (body === undefined ? "GET" : "POST"),
      headers: {
        ...(body === undefined || form
          ? {}
          : { "Content-Type": "application/json" }),
        ...(worker ? { Authorization: `Bearer ${workerToken}` } : {}),
        ...(user
          ? {
              Cookie: `constructor_session=${user.token}`,
              ...(csrf ? { "X-CSRF-Token": user.csrf } : {}),
            }
          : {}),
      },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
    });
    return { status: response.status, ...(await response.json()) };
  };
  const create = (body = source) => call(projectRoute, { user, body });
  const claim = (ready = true, supportsTests = false) =>
    call(workerRoute + "/claim", {
      worker: true,
      body: { ready, supportsTests },
    });
  const complete = (job, draft) =>
    call(workerRoute + "/complete", {
      worker: true,
      body: { id: job.id, lease: job.lease, draft },
    });

  assert.equal((await call("/assistant/status")).status, 401);
  assert.equal(
    (await call(workerRoute + "/claim", { user, body: { ready: true } }))
      .status,
    401,
  );
  assert.equal((await call("/assistant/status", { user })).data.online, false);
  assert.equal((await create()).status, 503);
  assert.equal((await claim()).data.job, null);
  assert.equal(
    (await call(projectRoute, { user, body: source, csrf: false })).status,
    403,
  );
  assert.equal(
    (await call(projectRoute, { user: teacher, body: source })).status,
    404,
  );
  assert.equal(
    (await create({ ...source, sourceText: "Коротко" })).status,
    400,
  );
  const pending = await create();
  assert.equal(pending.status, 202);
  assert.equal((await create()).status, 409);
  const { job } = (await claim()).data;
  assert.deepEqual(job.input, source);
  assert.deepEqual(Object.keys(job).sort(), ["id", "input", "lease"]);
  assert.equal((await claim()).data.job, null);
  assert.equal(
    (await call(`${projectRoute}/${job.id}`, { user: teacher })).status,
    404,
  );
  assert.equal(
    (await complete({ ...job, lease: "wrong" }, sample)).status,
    409,
  );
  await complete(job, {
    ...sample,
    evidence: "Придуманная цитата из документа",
  });
  const rejected = await call(`${projectRoute}/${job.id}`, { user });
  assert.equal(rejected.data.state, "failed");
  assert.equal(rejected.data.draft, undefined);

  await create();
  const next = (await claim()).data.job;
  assert.equal((await complete(next, sample)).status, 200);
  assert.equal(
    (await complete(next, { ...sample, title: "Повторная доставка" })).status,
    200,
  );
  const result = (await call(`${projectRoute}/${next.id}`, { user })).data;
  assert.deepEqual(result, {
    state: "ready",
    draft: sample,
    sourceTitle: source.sourceTitle,
  });
  assert.equal(
    instance.store.get("project", project.id).revision,
    project.revision,
  );
  assert.equal(
    (await call(`${projectRoute}/${next.id}`, { user, method: "DELETE" }))
      .status,
    200,
  );
  assert.equal(
    (await call(`${projectRoute}/${next.id}`, { user })).status,
    404,
  );

  await t.test(
    "one instruction generates a private, complete test and creates one editable draft on confirmation",
    async () => {
      const route = "/assistant/tests";
      const instruction =
        "Составь два разных вопроса о приготовлении круассанов";
      const body = { instruction };
      const draft = {
        title: "Приготовление круассанов",
        questions: [
          {
            title: sample.title,
            prompt: sample.prompt,
            options: sample.options,
            correctIndex: 0,
          },
          {
            title: "Формование",
            prompt: "Откуда начинают сворачивать треугольник теста?",
            options: [
              "С вершины",
              "От широкого основания",
              "От середины",
              "С боковой стороны",
            ],
            correctIndex: 1,
          },
        ],
      };
      assert.equal((await call(route, { user, body })).status, 503);
      await claim(true, true);
      assert.equal(
        (await call("/assistant/status", { user })).data.testOnline,
        true,
      );
      assert.equal(
        (
          await call(route, {
            user,
            body: { instruction: "Составь 21 вопрос" },
          })
        ).status,
        400,
      );
      const before = (await call("/projects", { user })).data.length;
      const first = await call(route, { user, body });
      assert.equal(first.status, 202);
      assert.equal((await claim()).data.job, null);
      const partial = (await claim(true, true)).data.job;
      assert.deepEqual(partial.input, { instruction, count: 2 });
      await complete(partial, {
        ...draft,
        questions: draft.questions.slice(0, 1),
      });
      assert.equal(
        (await call(`${route}/${first.data.id}`, { user })).data.state,
        "failed",
      );

      const queued = await call(route, { user, body });
      const leased = (await claim(true, true)).data.job;
      await complete(leased, draft);
      const receipt = `${route}/${queued.data.id}`;
      assert.equal((await call(receipt, { user: teacher })).status, 404);
      assert.equal(
        (await call(`${receipt}/project`, { user: teacher, body: {} })).status,
        404,
      );
      assert.deepEqual((await call(receipt, { user })).data, {
        state: "ready",
        test: draft,
      });
      assert.equal((await call("/projects", { user })).data.length, before);
      const created = await call(`${receipt}/project`, { user, body: {} });
      assert.equal(created.status, 200);
      assert.deepEqual(
        (await call(`${receipt}/project`, { user, body: {} })).data,
        created.data,
      );
      const stored = (await call("/projects/" + created.data.id, { user }))
        .data;
      assert.equal(stored.kind, "test");
      assert.equal(stored.status, "draft");
      assert.deepEqual(
        stored.rounds[0].questions.map((q) => q.key.optionId),
        ["o1", "o2"],
      );
      assert.deepEqual(validateProject(stored), []);
      assert.equal((await call("/projects", { user })).data.length, before + 1);
    },
  );

  await t.test(
    "mixed work retains lectures, validates citations and saves native interactive keys",
    async () => {
      const worker = (name, body) =>
        call("/assistant/worker/" + name, { worker: true, body });
      const claimWork = () =>
        worker("claim", {
          ready: true,
          supportsTests: true,
          supportsWork: true,
        });
      await claimWork();
      const input = new FormData();
      input.append("instruction", "Нужны тест и интерактив по двум лекциям");
      input.append(
        "lectures",
        new Blob([
          "Расстойку проводят после формования заготовок. Она позволяет тесту увеличиться в объёме.",
        ]),
        "Лекция.txt",
      );
      const word = zipSync({
        "word/document.xml": Buffer.from(
          '<w:document xmlns:w="urn:test"><w:body><w:p><w:r><w:t>Разогрев оборудования выполняют до загрузки подготовленной заготовки.</w:t></w:r></w:p></w:body></w:document>',
        ),
      });
      input.append("lectures", new Blob([word]), "Вторая.docx");
      const started = await call("/assistant/works", { user, body: input });
      assert.equal(started.status, 202);
      const path = "/assistant/works/" + started.data.id;
      assert.equal((await call(path, { user: teacher })).status, 404);
      assert.equal((await claim()).data.job, null);
      const first = (await claimWork()).data.job;
      assert.deepEqual(
        first.input.lectures.map((file) => file.title),
        ["Лекция.txt", "Вторая.docx"],
      );
      await worker("complete", {
        id: first.id,
        lease: first.lease,
        clarify: "В одной или в двух отдельных работах?",
      });
      assert.equal((await call(path, { user })).data.state, "clarify");
      assert.equal(
        (
          await call(path + "/reply", {
            user,
            body: { reply: "Одна работа, по одному заданию в блоке." },
          })
        ).status,
        202,
      );
      const job = (await claimWork()).data.job;
      assert.equal(job.id, first.id);
      assert.notEqual(job.lease, first.lease);
      assert.equal(job.input.lectures.length, 2);
      assert.equal(job.input.replies.length, 1);
      const plan = {
        state: "plan",
        title: "Два этапа производства",
        groups: [
          { title: "Расстойка", topic: "Расстойка", format: "test", count: 1 },
          {
            title: "Последовательность",
            topic: "Разогрев оборудования",
            format: "interactive",
            count: 1,
          },
        ],
      };
      const research = (group) =>
        worker("research", { id: job.id, lease: job.lease, plan, group });
      const sources = await research(0);
      assert.equal(sources.status, 200);
      assert.equal(sources.data.sources.length, 2);
      assert.equal(sources.data.standardStatus, "no_program");
      await research(1);
      const result = await worker("complete", {
        id: job.id,
        lease: job.lease,
        results: [
          {
            reviewed: true,
            questions: [
              {
                title: "Формование",
                prompt: "На каком этапе проводят расстойку?",
                type: "single_choice",
                items: [
                  "До замеса",
                  "После формования",
                  "После охлаждения",
                  "До деления",
                ],
                targets: [],
                answer: [1],
                explanation: "Расстойка начинается после формования.",
                sourceId: "s1",
                quote: "Расстойку проводят после формования заготовок.",
              },
            ],
          },
          {
            reviewed: true,
            questions: [
              {
                title: "Порядок",
                prompt: "Расположите операции в рабочей последовательности.",
                type: "ordering",
                items: ["Выемка", "Разогрев", "Загрузка"],
                targets: [],
                answer: [1, 2, 0],
                explanation: "Разогрев предшествует загрузке.",
                sourceId: "s2",
                quote: "Этой придуманной фразы в материале нет.",
              },
            ],
          },
        ],
      });
      assert.equal(result.status, 200);
      const work = (await call(path, { user })).data.work;
      assert.equal(work.groups[0].questions[0].evidence.title, "Лекция.txt");
      assert.equal(work.groups[1].questions[0].evidence, undefined);
      const saved = await call(path + "/project", { user, body: {} });
      assert.deepEqual(
        saved.data,
        (await call(path + "/project", { user, body: {} })).data,
      );
      const native = (await call("/projects/" + saved.data.id, { user })).data;
      assert.deepEqual(
        native.rounds.map((r) => r.questions[0].type),
        ["single_choice", "ordering"],
      );
      assert.deepEqual(native.rounds[1].questions[0].key.order, [
        "i1",
        "i2",
        "i0",
      ]);
      assert.deepEqual(validateProject(native), []);
    },
  );

  await claim(false);
  assert.equal((await create()).status, 503);
  const saved = await call(`/projects/${project.id}`, {
    user,
    method: "PUT",
    body: {
      project: { ...project, title: "Редактор без ИИ" },
      expectedRevision: project.revision,
    },
  });
  assert.equal(saved.data.title, "Редактор без ИИ");
});
