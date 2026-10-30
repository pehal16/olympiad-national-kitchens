import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../server/index.mjs";
import { project, question } from "../shared/catalog.js";
import {
  exportPackage,
  inspectPackage,
  importPackage,
} from "../server/transfer.mjs";

test("two installations preserve portable art, fonts, result dependencies and semantic duplicate receipts", async (t) => {
  const apps = [];
  for (let i = 0; i < 2; i++) {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "constructor-transfer-"),
    );
    const app = createApp({
      storageDir: root,
      assetRoot: path.resolve("public"),
    });
    const login = await app.service.setup({
      setupCode: app.store.meta("setupSecret"),
      login: "owner",
      name: "Проверка",
      password: "Transfer-test-123",
    });
    app.user = app.service.authenticate(login.token);
    app.service.ensureTemplates(app.user);
    apps.push(app);
    t.after(async () => {
      await app.close();
      fs.rmSync(root, { recursive: true, force: true });
    });
  }
  const [a, b] = apps,
    p = project("Переносимый проект");
  p.rounds[0].questions = [question()];
  const template = a.service.templates(a.user)[0];
  p.awardRules = [
    { id: "rule", mode: "participation", templateId: template.id },
  ];
  const saved = a.service.createProject(a.user, { project: p }),
    release = a.service.publish(a.user, saved.id),
    run = a.service.createRun(a.user, {
      releaseId: release.id,
      settings: { status: "open" },
    });
  const [person] = a.service.addParticipants(a.user, run.id, [
      { fullName: "Проверочный участник" },
    ]),
    session = a.service.begin(run.id, { code: person.code }),
    attempt = a.store.get("attempt", session.attemptId),
    q = attempt.variant.rounds[0].questions[0];
  a.service.saveAnswer(attempt, q.id, {
    answer: q.key.optionId,
    expectedRevision: 0,
    idempotencyKey: "portable-save",
  });
  a.service.finishRound(a.store.get("attempt", attempt.id));
  const password = "Transfer-package-123",
    bytes = exportPackage(a.service, a.user, {
      kind: "results",
      runId: run.id,
      password,
    }),
    preview = inspectPackage(b.service, b.user, bytes, password);
  assert.ok(
    preview.manifest.portableAssets.some((x) => x.sourceUrl.endsWith(".ttf")),
  );
  assert.ok(
    preview.manifest.portableAssets.some((x) => x.sourceUrl.endsWith(".svg")),
  );
  const imported = importPackage(
      b.service,
      b.user,
      bytes,
      password,
      preview.packageHash,
    ),
    archive = b.service.get(b.user, "run", imported.ids[run.id]);
  assert.equal(archive.settings.status, "closed");
  assert.ok(archive.importedReadOnly);
  assert.ok(b.service.get(b.user, "project", archive.projectId));
  const importedTemplate = b.service.get(
    b.user,
    "template",
    imported.ids[template.id],
  );
  assert.ok(
    importedTemplate.backgroundImage.startsWith("/api/constructor/v1/media/"),
  );
  assert.ok(
    b.documents
      .image(importedTemplate.backgroundImage)
      .startsWith("data:image/svg+xml;"),
  );
  for (const url of Object.values(importedTemplate.fontAssets))
    assert.ok(b.store.get("media", url.split("/").at(-1)));
  const second = exportPackage(a.service, a.user, {
      kind: "results",
      runId: run.id,
      password,
    }),
    again = inspectPackage(b.service, b.user, second, password);
  assert.equal(again.preview.duplicate, true);
  assert.equal(
    importPackage(b.service, b.user, second, password, again.packageHash)
      .imported,
    0,
  );
  assert.equal(b.store.list("participant")[0].codeHash, undefined);
  assert.equal(b.store.list("participantSession").length, 0);
});
