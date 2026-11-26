import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp, API } from "../server/index.mjs";

test("chat decisions stay private and proposed edits apply once to the reviewed revision", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "constructor-chat-"));
  const workerToken = randomBytes(32).toString("base64url");
  const instance = createApp({
    storageDir: dir,
    assistantWorkerToken: workerToken,
  });
  const server = instance.app.listen(0, "127.0.0.1");
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await instance.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}${API}`;
  const owner = await instance.service.setup({
    setupCode: instance.store.meta("setupSecret"),
    login: "chat-owner",
    name: "Проверочный владелец",
    password: "Disposable-owner-1",
  });
  const user = instance.service.authenticate(owner.token);
  const { invitation } = instance.service.invite(user, {
    name: "Преподаватель",
  });
  const reader = await instance.service.acceptInvite({
    invitation,
    login: "other-teacher",
    password: "Disposable-teacher-1",
  });
  const project = instance.service.createProject(user, {
    title: "Исходная работа",
  });
  const worker = "/assistant/worker";
  const chats = "/assistant/chats";

  async function call(route, body, login = owner, status = 200) {
    const response = await fetch(base + route, {
      method: body === undefined ? "GET" : "POST",
      headers: login
        ? {
            "Content-Type": "application/json",
            Cookie: "constructor_session=" + login.token,
            "X-CSRF-Token": login.csrf,
          }
        : {
            "Content-Type": "application/json",
            Authorization: "Bearer " + workerToken,
          },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await response.json();
    assert.equal(response.status, status, payload.error);
    return payload.data;
  }

  await call(worker + "/claim", { ready: true, supportsWork: true }, null);
  const action = { instruction: "Переименуй работу", projectId: project.id };
  await call(chats + "/message", action, owner, 503);
  const heartbeat = { ready: true, supportsWork: true, supportsChat: true };
  await call(worker + "/claim", heartbeat, null);
  const initial = await call(chats + "/message", action, owner, 202);
  const route = chats + "/" + initial.id;
  assert.deepEqual(await call(chats, undefined, reader), []);
  await call(route, undefined, reader, 404);

  async function propose(title) {
    const { job } = await call(worker + "/claim", heartbeat, null);
    assert.equal(job.input.kind, "chat");
    assert.equal(job.input.currentProjectId, project.id);
    await call(
      worker + "/complete",
      {
        id: job.id,
        lease: job.lease,
        decision: {
          action: "update",
          projectId: project.id,
          edits: [
            {
              scope: "project",
              field: "title",
              value: title,
              roundId: "",
              questionId: "",
            },
          ],
        },
      },
      null,
    );
    return (await call(route)).proposal;
  }
  const proposal = await propose("Учебная работа по химии");
  assert.equal(proposal.changes[0].previous, "Исходная работа");
  assert.equal(
    instance.store.get("project", project.id).title,
    "Исходная работа",
  );
  const applied = await call(route + "/apply/" + proposal.id, {});
  assert.equal(
    applied.messages.at(-1).projects[0].title,
    "Учебная работа по химии",
  );
  await call(route + "/apply/" + proposal.id, {});
  assert.equal(instance.store.get("project", project.id).revision, 1);

  await call(route + "/message", action, owner, 202);
  const stale = await propose("Старый предпросмотр");
  const draft = instance.store.get("project", project.id);
  instance.service.saveProject(user, project.id, {
    project: { ...draft, title: "Сохранено в редакторе" },
    expectedRevision: draft.revision,
  });
  await call(route + "/apply/" + stale.id, {}, owner, 409);
  assert.equal(
    instance.store.get("project", project.id).title,
    "Сохранено в редакторе",
  );
});
