import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { createApp, API } from "../server/index.mjs";
import { validateProject } from "../server/domain.mjs";

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
    const response = await fetch(base + route, {
      method: method ?? (body === undefined ? "GET" : "POST"),
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(worker ? { Authorization: `Bearer ${workerToken}` } : {}),
        ...(user
          ? {
              Cookie: `constructor_session=${user.token}`,
              ...(csrf ? { "X-CSRF-Token": user.csrf } : {}),
            }
          : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
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
