import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
import { project, question, uid } from "../shared/catalog.js";
import { acceptanceClient, report } from "./acceptance-client.mjs";
async function main() {
  const client = await acceptanceClient(),
    { request, base } = client;
  const output = path.resolve(
    process.env.CONSTRUCTOR_EVIDENCE || "artifacts/acceptance",
  );
  fs.mkdirSync(output, { recursive: true });
  let browser;
  try {
    const p = project("Приёмка · смешанная проверка");
    p.subject = "Информатика";
    p.rounds[0].questions = [question(), question("long_text")];
    p.rounds[0].questions[0].title = "Проверочный выбор";
    p.rounds[0].questions[0].shuffle = false;
    p.rounds[0].questions[1].title = "Обоснование ответа";
    const templates = await request("/templates");
    p.awardRules = [
      {
        id: uid("rule"),
        mode: "participation",
        title: "Участие",
        templateId: templates[0].id,
      },
    ];
    const saved = await request("/projects", { project: p });
    const executablePath =
      process.env.CONSTRUCTOR_CHROMIUM ||
      (process.platform === "win32"
        ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
        : undefined);
    browser = await chromium.launch({ headless: true, executablePath });
    const admin = await browser.newContext({
        viewport: { width: 1536, height: 1024 },
      }),
      errors = [];
    await admin.addCookies([
      {
        name: "constructor_session",
        value: client.cookie.split("=")[1],
        url: base + "/api/constructor/v1",
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
    const page = await admin.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/constructor/?view=builder&id=${saved.id}`);
    await page
      .getByLabel("Текст задания", { exact: true })
      .fill("Выберите первый ответ. Изменение проверяется после перезагрузки.");
    await page.getByText("Черновик сохранён", { exact: true }).waitFor();
    await page.reload();
    assert.match(
      await page.getByLabel("Текст задания", { exact: true }).inputValue(),
      /после перезагрузки/,
    );
    await page.screenshot({ path: path.join(output, "builder-desktop.png") });
    await page
      .getByRole("button", { name: "Проверить и опубликовать", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Проведения", exact: true })
      .waitFor();
    const [release] = await request(`/projects/${saved.id}/releases`),
      run = await request("/runs", {
        releaseId: release.id,
        settings: {
          status: "open",
          entryMode: "codes",
          disclosure: "organizer",
        },
      });
    const [participant] = await request(`/runs/${run.id}/participants`, {
      rows: [
        {
          fullName: "Проверочный Участник Конструктора",
          institution: "Учебный образец",
          groupName: "ПРОВЕРКА",
        },
      ],
    });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const student = await context.newPage();
    student.setDefaultTimeout(15000);
    student.on("pageerror", (e) => errors.push(e.message));
    await student.goto(`${base}/constructor/play/${run.id}`);
    await student.getByLabel("Персональный код").fill(participant.code);
    await student.getByRole("button", { name: "Начать работу" }).click();
    const option = p.rounds[0].questions[0].config.options[0].label;
    await student.getByLabel(option, { exact: true }).check();
    await student
      .getByText("Ответ подтверждён сервером", { exact: true })
      .waitFor();
    await student.reload();
    await student.getByLabel(option, { exact: true }).waitFor();
    assert.ok(await student.getByLabel(option, { exact: true }).isChecked());
    await student.screenshot({
      path: path.join(output, "participant-mobile.png"),
    });
    assert.equal(
      await student.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await student
      .getByRole("button", { name: "Подтвердить и продолжить" })
      .click();
    const answer = student.locator(".task textarea");
    await answer.fill(
      "Локальный черновик после потери связи сохраняется отдельно от подтверждённого сервером ответа.",
    );
    await student
      .getByText("Ответ подтверждён сервером", { exact: true })
      .waitFor();
    await context.setOffline(true);
    await answer.fill("Восстановленный ответ после временной потери связи.");
    await student
      .getByText(
        "Ответ сохранён на устройстве; подтверждение сервера не получено",
        { exact: true },
      )
      .waitFor();
    await context.setOffline(false);
    await student
      .getByText("Ответ подтверждён сервером", { exact: true })
      .waitFor();
    await student
      .getByRole("button", { name: "Завершить работу", exact: true })
      .click();
    await student.getByRole("heading", { name: "Работа завершена" }).waitFor();
    const [attempt] = await request(`/runs/${run.id}/results`);
    assert.equal(attempt.summary.score, null);
    assert.equal(attempt.status, "completed");
    await page.goto(`${base}/constructor/?view=results&id=${run.id}`);
    await page
      .getByRole("button", { name: participant.profile.fullName, exact: true })
      .click();
    const manual = p.rounds[0].questions[1];
    for (const criterion of manual.rubric)
      await page
        .getByLabel(criterion.title, { exact: true })
        .fill(String(criterion.maxScore));
    await page
      .getByLabel("Комментарий к проверке", { exact: true })
      .fill("Проверено по опубликованным критериям.");
    await page
      .getByRole("button", { name: "Сохранить проверку", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Просмотреть получателей", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Утвердить список награждения",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Выпустить документы", exact: true })
      .click();
    await page
      .getByText("Документы готовы", { exact: true })
      .waitFor({ timeout: 60000 });
    await page
      .getByRole("button", { name: "Опубликовать результаты", exact: true })
      .click();
    const [issue] = await request(`/runs/${run.id}/issues`);
    assert.equal(issue.status, "issued");
    const pdfResponse = await fetch(
        `${base}/api/constructor/v1/issues/${issue.id}/pdf`,
        { headers: { Cookie: client.cookie } },
      ),
      bytes = Buffer.from(await pdfResponse.arrayBuffer());
    assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
    fs.writeFileSync(path.join(output, "issued.pdf"), bytes);
    await page.screenshot({ path: path.join(output, "results-desktop.png") });
    await page.goto(`${base}/constructor/?view=designer&id=${templates[0].id}`);
    await page
      .getByRole("heading", { name: "Редактор наградных документов" })
      .waitFor();
    await page.screenshot({ path: path.join(output, "designer-desktop.png") });
    assert.deepEqual(errors, []);
    const finished = (await request(`/runs/${run.id}/results`))[0];
    assert.equal(finished.summary.score, 4);
    assert.match(finished.answers[manual.id].answer, /Восстановленный/);
    report("constructor-full-route", {
      passed: true,
      savedReloaded: true,
      mobileViewport: "390×844",
      offlineDraftRecovered: true,
      manualReview: true,
      issuedPdfPages: 1,
      consoleErrors: errors,
      runId: run.id,
      evidence: output,
    });
  } catch (error) {
    if (browser)
      for (const context of browser.contexts())
        for (const [i, page] of context.pages().entries())
          await page
            .screenshot({
              path: path.join(output, "failure-" + i + ".png"),
              fullPage: true,
            })
            .catch(() => {});
    throw error;
  } finally {
    await browser?.close();
    await client.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
