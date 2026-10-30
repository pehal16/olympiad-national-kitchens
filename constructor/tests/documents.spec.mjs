import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { Store } from "../server/store.mjs";
import { Service } from "../server/service.mjs";
import { Documents, templateHtml } from "../server/documents.mjs";
import { backupInstallation, restoreInstallation } from "../server/backup.mjs";
import { starterTemplates } from "../shared/catalog.js";
const browserPath =
  process.env.CONSTRUCTOR_CHROMIUM ||
  (process.platform === "win32"
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : undefined);
test("all twelve award templates print as one A4 page with long Cyrillic names", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "constructor-pdf-"));
  const s = new Store(root),
    service = new Service(s);
  const before = process.env.CONSTRUCTOR_CHROMIUM;
  if (browserPath) process.env.CONSTRUCTOR_CHROMIUM = browserPath;
  const documents = new Documents(service, path.resolve("public"));
  t.after(async () => {
    await documents.close();
    s.close();
    fs.rmSync(root, { recursive: true, force: true });
    if (before) process.env.CONSTRUCTOR_CHROMIUM = before;
    else delete process.env.CONSTRUCTOR_CHROMIUM;
  });
  for (const template of starterTemplates()) {
    const bytes = await documents.render(template, {
      fullName: "Александра-Екатерина Константиновна Примерова-Испытательная",
      event: "Междисциплинарная олимпиада «Знания и профессиональные решения»",
      degree: "I степени",
      date: "30.10.2026",
      number: "ПРОВЕРКА-000001",
      issuer: "Учебный организатор",
    });
    const pdf = await PDFDocument.load(bytes);
    assert.equal(pdf.getPageCount(), 1);
    const { width, height } = pdf.getPage(0).getSize();
    assert.ok(Math.abs(width - 841.89) < 2 && Math.abs(height - 595.28) < 2);
  }
});
test("hidden text is absent and template text is escaped", () => {
  const t = starterTemplates()[0];
  t.elements.push({
    id: "hidden",
    type: "text",
    text: "Hidden secret",
    hidden: true,
    x: 20,
    y: 20,
    width: 40,
    height: 10,
    size: 12,
  });
  const html = templateHtml(t, { fullName: "<script>bad()</script>" });
  assert.ok(!html.includes("Hidden secret"));
  assert.ok(!html.includes("<script>bad()"));
  assert.ok(html.includes("&lt;script&gt;"));
});
test("full installation backup restores media and rejects wrong password and occupied target", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "constructor-backup-")),
    target = root + "-restored";
  const s = new Store(root);
  s.meta("proof", "saved");
  fs.writeFileSync(path.join(root, "media", "proof.png"), "media proof");
  t.after(() => {
    s.close();
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
  });
  const bytes = await backupInstallation(s, "Backup-password-123");
  assert.throws(() => restoreInstallation(bytes, "wrong", target));
  const result = restoreInstallation(bytes, "Backup-password-123", target);
  assert.ok(result.restored);
  assert.equal(
    fs.readFileSync(path.join(target, "media", "proof.png"), "utf8"),
    "media proof",
  );
  assert.throws(() =>
    restoreInstallation(bytes, "Backup-password-123", target),
  );
});
