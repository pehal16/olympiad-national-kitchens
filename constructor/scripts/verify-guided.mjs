import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";
import { acceptanceClient } from "./acceptance-client.mjs";
const output = path.resolve(
  process.env.CONSTRUCTOR_EVIDENCE ||
    path.join(os.tmpdir(), "constructor-guided-acceptance"),
);
fs.mkdirSync(output, { recursive: true });
const client = await acceptanceClient();
let browser;
const errors = [];
const started = Date.now();
try {
  const invite = await client.request("/invitations", {
    name: "Преподаватель проверочного стенда",
  });
  browser = await chromium.launch({
    executablePath:
      process.env.CONSTRUCTOR_CHROMIUM ||
      (process.platform === "win32"
        ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
        : undefined),
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  if (process.env.CONSTRUCTOR_OFFLINE_ACCEPTANCE === "1")
    await context.route("**/*", (route) => {
      const url = route.request().url();
      return url.startsWith("data:") ||
        url.startsWith("blob:") ||
        new URL(url).origin === new URL(client.base).origin
        ? route.continue()
        : route.abort("internetdisconnected");
    });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(15000);
  await page.goto(client.base + "/constructor/?invite=" + invite.invitation);
  await page.getByLabel("Ваше имя").waitFor();
  await page.waitForFunction(
    () => document.querySelector("input[autocomplete=username]") !== null,
  );
  await page.getByLabel("Логин", { exact: true }).fill("teacher-ui");
  await page
    .getByLabel("Пароль", { exact: true })
    .fill("Isolated-password-for-UI-123");
  await page
    .getByRole("button", { name: "Создать кабинет", exact: true })
    .click();
  await page.getByRole("heading", { name: "Мои олимпиады и тесты" }).waitFor();
  await page.screenshot({ path: output + "/projects-empty.png" });
  await page
    .getByRole("button", { name: "Создать работу", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("textbox")
    .fill("Проверка самостоятельного создания");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Создать", exact: true })
    .click();
  await page.getByRole("button", { name: "2. Задания", exact: true }).click();
  for (let i = 1; i <= 5; i++) {
    await page
      .getByRole("button", {
        name: i === 1 ? "Добавить задание" : "Добавить задание",
        exact: true,
      })
      .last()
      .click();
    if (i === 1) {
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: /^Один ответ/ }).focus();
      await page.keyboard.press("Shift+Tab");
      assert.ok(
        await page.evaluate(() =>
          Boolean(document.activeElement?.closest("[role=dialog]")),
        ),
      );
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "detached" });
      assert.ok(
        await page.evaluate(() =>
          document.activeElement?.textContent?.includes("Добавить задание"),
        ),
      );
      await page
        .getByRole("button", { name: "Добавить задание", exact: true })
        .last()
        .click();
    }
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^Один ответ/ })
      .click();
    await page
      .getByLabel("Текст задания", { exact: true })
      .fill(`Проверочное задание ${i}: выберите «Да»`);
    for (let j = 1; j <= 4; j++)
      await page
        .getByLabel(`Вариант ${j}`, { exact: true })
        .fill(["Да", "Нет", "Не знаю", "Нужна подсказка"][j - 1]);
    if (i === 1) {
      const images = page.getByLabel("Показать настройки изображений", {
        exact: true,
      });
      await images.check();
      let releaseUpload, markUploadStarted;
      const uploadGate = new Promise((resolve) => (releaseUpload = resolve));
      const uploadStarted = new Promise(
        (resolve) => (markUploadStarted = resolve),
      );
      const uploadPattern = client.base + "/api/constructor/v1/media";
      const delayedUpload = async (route) => {
        markUploadStarted();
        await uploadGate;
        await route.continue();
      };
      await context.route(uploadPattern, delayedUpload);
      await page
        .locator(".guided-canvas .option-editor input[type=file]")
        .first()
        .setInputFiles({
          name: "Проверочный значок.png",
          mimeType: "image/png",
          buffer: fs.readFileSync(path.resolve("../public/icons/icon-192.png")),
        });
      await uploadStarted;
      await page
        .getByLabel("Текст задания", { exact: true })
        .fill("Текст, изменённый во время загрузки изображения");
      await page
        .getByLabel("Вариант 1", { exact: true })
        .fill("Изменённый вариант");
      releaseUpload();
      await page.locator(".guided-canvas .option-thumbnail").waitFor();
      await context.unroute(uploadPattern, delayedUpload);
      assert.equal(
        await page.getByLabel("Текст задания", { exact: true }).inputValue(),
        "Текст, изменённый во время загрузки изображения",
      );
      assert.equal(
        await page.getByLabel("Вариант 1", { exact: true }).inputValue(),
        "Изменённый вариант",
      );
      await page
        .getByLabel("Текст задания", { exact: true })
        .fill(`Проверочное задание ${i}: выберите «Да»`);
      await page.getByLabel("Вариант 1", { exact: true }).fill("Да");
      await images.uncheck();
      assert.equal(
        await page.locator(".guided-canvas .option-media").isVisible(),
        false,
      );
      await images.check();
      await page
        .getByRole("button", { name: "Убрать фото", exact: true })
        .click();
      assert.equal(
        await page.locator(".guided-canvas .option-thumbnail").count(),
        0,
      );
      await images.uncheck();
    }
    assert.equal(
      await page.locator(".guided-canvas input[type=radio]:checked").count(),
      0,
      "new key is not implicit",
    );
    await page.getByLabel("Правильный ответ: 1", { exact: true }).check();
  }
  await page.getByText("Черновик сохранён", { exact: true }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "2. Задания", exact: true }).click();
  assert.equal(await page.locator(".guided-question").count(), 5);
  await page.screenshot({ path: output + "/guided-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: output + "/guided-mobile.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "mobile no overflow",
  );
  await page.setViewportSize({ width: 320, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "320px no overflow",
  );
  await page.screenshot({ path: output + "/guided-320.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Структура", exact: true }).click();
  await page.screenshot({
    path: output + "/guided-mobile-structure.png",
    fullPage: true,
  });
  await page.locator(".guided-question").nth(2).click();
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await page
    .getByLabel("Короткое название для вашего списка")
    .last()
    .fill("Третий вопрос");
  await page
    .getByLabel("Время задания, минут (0 — без лимита)")
    .last()
    .fill("0.5");
  await page.getByRole("button", { name: "Задание", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "3. Условия", exact: true }).click();
  await page.getByLabel("Наградные документы").selectOption("certificate");
  await page.screenshot({
    path: output + "/guided-conditions.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "4. Проверка", exact: true }).click();
  await page
    .getByRole("button", { name: "Проверить работу", exact: true })
    .click();
  await page
    .getByText("Проверка пройдена: работу можно проводить", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "5. Проведение", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Подготовить ссылку для студентов",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Открыть вход студентам", exact: true })
    .waitFor();
  const runId = new URL(page.url()).searchParams.get("id");
  const link = await page
    .getByLabel("Ссылка для студентов", { exact: true })
    .inputValue();
  assert.ok(!link.includes("127.0.0.1") && link.endsWith(runId));
  await page.getByAltText("QR-код входа в это проведение").waitFor();
  await page
    .getByRole("button", { name: "Открыть вход студентам", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Закрыть вход новым участникам", exact: true })
    .waitFor();
  await page.screenshot({
    path: output + "/guided-conduct.png",
    fullPage: true,
  });
  const studentContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  if (process.env.CONSTRUCTOR_OFFLINE_ACCEPTANCE === "1")
    await studentContext.route("**/*", (route) => {
      const url = route.request().url();
      return url.startsWith("data:") ||
        url.startsWith("blob:") ||
        new URL(url).origin === new URL(client.base).origin
        ? route.continue()
        : route.abort("internetdisconnected");
    });
  const student = await studentContext.newPage();
  student.on("pageerror", (e) => errors.push(e.message));
  await student.goto(client.base + "/constructor/play/" + runId);
  await student
    .getByLabel("ФИО участника", { exact: true })
    .fill("Участник Проверки Интерфейса");
  await student.getByLabel("Группа", { exact: true }).fill("QA");
  assert.equal(
    await student
      .getByLabel("Образовательная организация", { exact: true })
      .count(),
    0,
  );
  await student
    .getByLabel(
      "Согласен на обработку введённых сведений для проведения работы и оформления результатов",
    )
    .check();
  await student
    .getByRole("button", { name: "Начать работу", exact: true })
    .click();
  for (let i = 1; i <= 5; i++) {
    await student
      .getByRole("heading", {
        name: `Проверочное задание ${i}: выберите «Да»`,
        exact: true,
      })
      .waitFor();
    await student.getByLabel("Да", { exact: true }).check();
    await student
      .getByText("Ответ подтверждён сервером", { exact: true })
      .waitFor();
    await student
      .getByRole("button", {
        name: i === 5 ? "Завершить работу" : "Подтвердить и продолжить",
        exact: true,
      })
      .click();
  }
  await student
    .getByRole("heading", { name: "Работа завершена", exact: true })
    .waitFor();
  await student.screenshot({
    path: output + "/guided-student-result.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Результаты и награды", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Просмотреть получателей", exact: true })
    .waitFor();
  await page
    .getByText("Участник Проверки Интерфейса", { exact: true })
    .waitFor();
  await page
    .getByText("Затруднения по турам и план разбора", { exact: true })
    .click();
  await page
    .getByLabel("Мой план последующего разбора")
    .fill("Повторно разобрать третий вопрос и сравнить признаки.");
  await page
    .getByRole("button", { name: "Сохранить план разбора", exact: true })
    .click();
  await page.reload();
  await page
    .getByText("Затруднения по турам и план разбора", { exact: true })
    .click();
  assert.match(
    await page.getByLabel("Мой план последующего разбора").inputValue(),
    /третий вопрос/,
  );
  await page.screenshot({
    path: output + "/guided-results.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Материалы", exact: true }).click();
  await page
    .getByRole("button", { name: "Шаблоны документов", exact: true })
    .click();
  await page.locator(".template-gallery-item button").first().click();
  await page
    .getByRole("heading", { name: "Оформите документ", exact: true })
    .waitFor();
  assert.equal(
    await page.locator(".simple-document textarea").count(),
    3,
    "basic mode asks only about the three static inscriptions",
  );
  assert.ok(
    (
      await page
        .locator(".simple-document textarea")
        .evaluateAll((nodes) => nodes.map((node) => node.value))
    ).every((value) => !value.includes("{")),
    "automatic fields do not need manual editing",
  );
  await page.screenshot({ path: output + "/guided-document-desktop.png" });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.locator(".simple-paper").scrollIntoViewIfNeeded();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.screenshot({ path: output + "/guided-document-320.png" });
  assert.deepEqual(errors, []);
  const report = {
    passed: true,
    route:
      "invitation → five authored questions → closed link/QR → open → mobile student → result → saved discussion plan",
    simulatedTeacher: true,
    seconds: Math.round((Date.now() - started) / 1000),
    consoleErrors: errors,
    noMobileOverflow: true,
    lanLinkNotLoopback: true,
    runId,
  };
  fs.writeFileSync(
    output + "/guided-route.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} catch (e) {
  console.error(e);
  if (browser)
    for (const [i, c] of browser.contexts().entries())
      for (const [j, p] of c.pages().entries())
        await p
          .screenshot({
            path: output + `/failure-${i}-${j}.png`,
            fullPage: true,
          })
          .catch(() => {});
  process.exitCode = 1;
} finally {
  await browser?.close();
  await client.close();
}
