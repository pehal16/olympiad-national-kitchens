import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { createApp, API } from "../server/index.mjs";

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
  const claim = (ready = true) =>
    call(workerRoute + "/claim", { worker: true, body: { ready } });
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
