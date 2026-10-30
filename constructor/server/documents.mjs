import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import { zipSync } from "fflate";
import { rankAttempts } from "./domain.mjs";
import { id, now, fail, escapeHtml, hash, safePath, clone } from "./util.mjs";
const fonts = {
  "PT Serif": "PTSerif-Regular.ttf",
  "PT Sans": "PTSans-Regular.ttf",
  "Noto Sans": "NotoSans-Regular.ttf",
  "Noto Serif": "NotoSerif-Regular.ttf",
};
export function fillFields(text, data) {
  return String(text || "").replace(/\{([a-zA-Z]+)\}/g, (_, key) =>
    String(data[key] ?? ""),
  );
}
function n(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}
function safeColor(value, fallback = "#202b32") {
  return /^(#[a-f0-9]{3,8}|transparent)$/i.test(String(value))
    ? value
    : fallback;
}
export function templateHtml(
  template,
  data,
  { image = (src) => src, fontData = {}, watermark = false } = {},
) {
  fail(
    template &&
      Array.isArray(template.elements) &&
      template.elements.length <= 300,
    "Неверный шаблон.",
  );
  const fontCss = Object.entries(fonts)
    .filter(([family]) => fontData[family])
    .map(
      ([family]) =>
        `@font-face{font-family:'${family}';src:url(data:font/ttf;base64,${fontData[family]}) format('truetype');font-weight:${family.startsWith("Noto") ? "100 900" : "400"}}`,
    )
    .join("");
  const body = template.elements
    .filter((el) => !el.hidden)
    .map((el) => {
      const style = `position:absolute;left:${n(el.x)}mm;top:${n(el.y)}mm;width:${n(el.width)}mm;height:${n(el.height)}mm;transform:rotate(${n(el.rotation)}deg);opacity:${Math.max(0, Math.min(1, n(el.opacity, 1)))};box-sizing:border-box;`;
      if (el.type === "rect" || el.type === "line")
        return `<div style="${style}border:${Math.max(0.1, n(el.lineWidth, 0.3))}mm solid ${safeColor(el.stroke)};background:${safeColor(el.fill, "transparent")};${el.type === "line" ? "border-width:0;border-top-width:" + Math.max(0.1, n(el.lineWidth, 0.3)) + "mm;" : ""}"></div>`;
      if (el.type === "image" || el.type === "qr") {
        const src = image(el.src || "");
        return src
          ? `<img alt="" style="${style}object-fit:contain" src="${escapeHtml(src)}">`
          : "";
      }
      const text = fillFields(el.text, data);
      return `<div class="text" data-fit="${el.autoFit !== false}" data-min="${n(el.minSize, 7)}" style="${style}font-family:'${fonts[el.font] ? el.font : "PT Serif"}';font-size:${n(el.size, 14)}pt;color:${safeColor(el.color)};font-weight:${el.bold ? "700" : "400"};font-style:${el.italic ? "italic" : "normal"};text-decoration:${el.underline ? "underline" : "none"};text-align:${["left", "center", "right"].includes(el.align) ? el.align : "left"};line-height:${n(el.lineHeight, 1.2)};white-space:pre-wrap;overflow-wrap:anywhere;">${escapeHtml(text)}</div>`;
    })
    .join("");
  return `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><style>${fontCss}@page{size:${n(template.width, 297)}mm ${n(template.height, 210)}mm;margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{margin:0;padding:0}body{width:${n(template.width, 297)}mm;height:${n(template.height, 210)}mm;background:${safeColor(template.background, "#ffffff")};position:relative}.sheet{position:relative;width:100%;height:100%}</style></head><body><div class="sheet">${template.backgroundImage ? `<img alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" src="${escapeHtml(image(template.backgroundImage))}">` : ""}${body}${watermark ? '<div style="position:absolute;top:45%;width:100%;transform:rotate(-25deg);font:54pt sans-serif;color:#7772;text-align:center">ОБРАЗЕЦ</div>' : ""}</div></body></html>`;
}
export class Documents {
  constructor(service, assetRoot) {
    this.service = service;
    this.store = service.store;
    this.assetRoot = assetRoot;
    this.browser = null;
    this.running = false;
    this.queue = [];
    this.fontData = {};
    for (const job of this.store
      .list("job")
      .filter((j) => j.status === "running" || j.status === "queued"))
      this.store.put(
        "job",
        job.id,
        job.owner,
        {
          ...job,
          status: "failed",
          error:
            "Подготовка была прервана перезапуском. Повторите выпуск: готовые экземпляры сохранятся.",
        },
        job.runId,
      );
    for (const [family, name] of Object.entries(fonts)) {
      const f = path.join(assetRoot, "fonts", name);
      if (fs.existsSync(f))
        this.fontData[family] = fs.readFileSync(f).toString("base64");
    }
  }
  image(src) {
    if (/^data:image\/(png|jpeg|webp);base64,/.test(src)) return src;
    let file, mime;
    if (src.startsWith("/api/constructor/v1/media/")) {
      const mid = src.split("/").at(-1);
      const m = this.store.get("media", mid);
      if (!m) return "";
      file = safePath(this.store.root, m.relativePath);
      mime = m.mime;
    } else if (
      src.startsWith("/constructor/legacy/") ||
      src.startsWith("/constructor/awards/")
    ) {
      file = safePath(this.assetRoot, src.slice("/constructor/".length));
      mime =
        path.extname(file) === ".svg"
          ? "image/svg+xml"
          : path.extname(file) === ".png"
            ? "image/png"
            : "image/webp";
    } else return "";
    return fs.existsSync(file)
      ? `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`
      : "";
  }
  async getBrowser() {
    fail(
      !this.closing,
      "Подготовка документов приостановлена: сервер завершает работу.",
      503,
    );
    if (this.browserPromise) return this.browserPromise;
    if (!this.browser) {
      const options = { headless: true };
      if (process.env.CONSTRUCTOR_CHROMIUM)
        options.executablePath = process.env.CONSTRUCTOR_CHROMIUM;
      else if (process.platform === "win32") {
        const installed = [
          "C:/Program Files/Google/Chrome/Application/chrome.exe",
          "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        ].find((file) => fs.existsSync(file));
        if (installed) options.executablePath = installed;
      }
      this.browserPromise = chromium
        .launch(options)
        .then((browser) => {
          this.browser = browser;
          return browser;
        })
        .finally(() => {
          this.browserPromise = null;
        });
      return this.browserPromise;
    }
    return this.browser;
  }
  async render(template, data, { watermark = false, user } = {}) {
    this.service.assertMediaReadable(
      user || { id: template.owner, role: "teacher" },
      template,
    );
    if (template.backgroundImage)
      fail(
        this.image(template.backgroundImage),
        "Фон документа недоступен. Замените его перед выпуском.",
        422,
      );
    for (const el of template.elements.filter(
      (e) => !e.hidden && e.type === "image" && e.src,
    ))
      fail(
        this.image(el.src),
        "Изображение документа недоступно. Замените его перед выпуском.",
        422,
      );
    const browser = await this.getBrowser(),
      page = await browser.newPage();
    try {
      await page.setContent(
        templateHtml(template, data, {
          image: (src) => this.image(src),
          fontData: {
            ...this.fontData,
            ...Object.fromEntries(
              Object.entries(template.fontAssets || {}).map(([family, url]) => {
                const m = this.store.get(
                  "media",
                  String(url).split("/").at(-1),
                );
                return [
                  family,
                  m
                    ? fs
                        .readFileSync(safePath(this.store.root, m.relativePath))
                        .toString("base64")
                    : this.fontData[family],
                ];
              }),
            ),
          },
          watermark,
        }),
        { waitUntil: "load" },
      );
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images).map((i) => i.decode()));
      });
      const issues = await page.evaluate(() => {
        const problems = [];
        for (const el of document.querySelectorAll(".text")) {
          let size = parseFloat(getComputedStyle(el).fontSize);
          const min = (Number(el.dataset.min) * 96) / 72;
          while (
            el.dataset.fit === "true" &&
            (el.scrollHeight > el.clientHeight + 1 ||
              el.scrollWidth > el.clientWidth + 1) &&
            size > min
          ) {
            size = Math.max(min, size - 0.5);
            el.style.fontSize = size + "px";
          }
          if (
            el.scrollHeight > el.clientHeight + 1 ||
            el.scrollWidth > el.clientWidth + 1
          )
            problems.push(el.textContent);
        }
        return problems;
      });
      fail(
        !issues.length,
        `Текст не помещается в макет: ${issues.join("; ")}`,
        422,
        "document_overflow",
      );
      return await page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
        tagged: true,
      });
    } finally {
      await page.close();
    }
  }
  enqueue(user, kind, runId, task) {
    const jid = id("job");
    this.store.put(
      "job",
      jid,
      user.id,
      { kind, runId, status: "queued", createdAt: now(), done: 0, total: 0 },
      runId,
    );
    this.queue.push({ jid, user, task });
    this.drain();
    return this.store.get("job", jid);
  }
  async drain() {
    if (this.running) return;
    this.running = true;
    while (this.queue.length) {
      const { jid, user, task } = this.queue.shift();
      let job = this.store.get("job", jid);
      try {
        job.status = "running";
        this.store.put("job", jid, user.id, job, job.runId);
        const result = await task((progress) => {
          job = { ...job, ...progress };
          this.store.put("job", jid, user.id, job, job.runId);
        });
        this.store.put(
          "job",
          jid,
          user.id,
          { ...job, status: "completed", result, finishedAt: now() },
          job.runId,
        );
      } catch (e) {
        this.store.put(
          "job",
          jid,
          user.id,
          { ...job, status: "failed", error: e.message, finishedAt: now() },
          job.runId,
        );
      }
    }
    this.running = false;
  }
  issue(user, runId) {
    this.service.right(user, "awards");
    const run = this.service.get(user, "run", runId, true);
    fail(
      run.awardsApproved && run.approvedAwards,
      "Сначала утвердите награждение.",
      409,
    );
    const current = this.service.awardPreview(user, runId);
    fail(
      current.resultHash === run.approvedAwards.resultHash,
      "Результаты изменились после утверждения.",
      409,
    );
    const candidates = run.approvedAwards.candidates.filter((c) => !c.excluded);
    const approvalHash = hash(run.approvedAwards),
      checkApproval = () => {
        const latest = this.store.get("run", runId);
        fail(
          latest.awardsApproved && hash(latest.approvedAwards) === approvalHash,
          "Утверждённый список изменился. Проверьте награждение и повторите выпуск.",
          409,
        );
      };
    return this.enqueue(user, "awards", runId, async (progress) => {
      const issued = [],
        skippedRevoked = [];
      progress({ total: candidates.length });
      for (const [index, candidate] of candidates.entries()) {
        checkApproval();
        const key = hash(
            `${runId}:${run.approvedAwards.resultHash}:${candidate.id}:${hash(candidate)}`,
          ),
          existing = this.store
            .list("issue", null, runId)
            .find(
              (i) =>
                i.issuanceKey === key &&
                ["issued", "revoked"].includes(i.status),
            );
        if (existing) {
          if (existing.status === "revoked") skippedRevoked.push(existing.id);
          else issued.push(existing.id);
          progress({ done: index + 1 });
          continue;
        }
        const previous = this.store
          .list("issue", null, runId)
          .find(
            (i) =>
              i.participantId === candidate.participantId &&
              i.fields.ruleId === candidate.ruleId &&
              i.status === "suspended",
          );
        const template = this.service.get(
          user,
          "template",
          candidate.templateId,
        );
        const iid = id("issue"),
          number = `${this.store.meta("instanceId").slice(-6).toUpperCase()}-${String(this.store.list("issue").length + 1).padStart(6, "0")}`;
        const fields = { ...candidate, number };
        const snapshot = clone(template);
        if (snapshot.elements.some((e) => e.type === "qr")) {
          const base = process.env.CONSTRUCTOR_PUBLIC_ORIGIN || "";
          for (const el of snapshot.elements.filter((e) => e.type === "qr"))
            el.src = base
              ? await QRCode.toDataURL(`${base}/constructor/verify/${iid}`)
              : "";
        }
        const bytes = await this.render(snapshot, fields, { user });
        checkApproval();
        const relativePath = `documents/${iid}.pdf`;
        fs.writeFileSync(safePath(this.store.root, relativePath), bytes, {
          mode: 0o600,
        });
        this.store.put(
          "issue",
          iid,
          run.owner,
          {
            runId,
            attemptId: candidate.attemptId,
            participantId: candidate.participantId,
            fields,
            templateSnapshot: snapshot,
            status: "issued",
            issuedAt: now(),
            relativePath,
            sha256: hash(bytes),
            issuanceKey: key,
            previousIssueId: previous?.id || null,
          },
          runId,
        );
        if (previous) {
          previous.status = "revoked";
          previous.revokedAt = now();
          previous.revokeReason =
            "Перевыпуск после изменения утверждённых результатов";
          this.store.put("issue", previous.id, previous.owner, previous, runId);
        }
        this.store.audit(user.id, "document.issued", iid, { number, runId });
        issued.push(iid);
        progress({ done: index + 1 });
      }
      return { issued, skippedRevoked };
    });
  }
  async collection(user, runId, format) {
    this.service.get(user, "run", runId);
    const issues = this.store
      .list("issue", null, runId)
      .filter((i) => i.status === "issued");
    fail(issues.length, "Документы ещё не выпущены.", 404);
    if (format === "zip") {
      const files = {};
      for (const issue of issues) {
        const name = issue.fields.fullName.replace(
          /[<>:"/\\|?*\x00-\x1f]/g,
          "_",
        );
        files[`${issue.fields.number}-${name}.pdf`] = new Uint8Array(
          fs.readFileSync(safePath(this.store.root, issue.relativePath)),
        );
      }
      return Buffer.from(zipSync(files, { level: 0 }));
    }
    const combined = await PDFDocument.create();
    for (const issue of issues) {
      const input = await PDFDocument.load(
        fs.readFileSync(safePath(this.store.root, issue.relativePath)),
      );
      for (const page of await combined.copyPages(
        input,
        input.getPageIndices(),
      ))
        combined.addPage(page);
    }
    return Buffer.from(await combined.save());
  }
  async protocol(user, runId) {
    const run = this.service.get(user, "run", runId),
      rows = this.service.results(user, runId),
      ranked = rankAttempts(
        rows,
        run.settings.attemptSelection,
        run.settings.tieBreak,
      ),
      places = new Map(ranked.map((a) => [a.id, a.place]));
    const roundHeaders = (rows[0]?.variant.rounds || [])
      .map((r, i) => `<th>Тур ${i + 1}<br>${escapeHtml(r.title)}</th>`)
      .join("");
    const body = rows
      .map(
        (a, i) =>
          `<tr><td>${i + 1}</td><td>${escapeHtml(a.participant.fullName)}</td><td>${escapeHtml(a.participant.institution)}<br>${escapeHtml(a.participant.groupName)}</td>${a.summary.rounds.map((r) => `<td>${r.pending ? "На проверке" : a.status === "completed" ? r.score : "—"} / ${r.maxScore}</td>`).join("")}<td>${a.status === "completed" && !a.excludedFromResults ? (a.summary.score ?? "На проверке") : "—"} / ${a.summary.maxScore}</td><td>${places.get(a.id) || "—"}</td><td>${a.excludedFromResults ? "Исключена из зачёта" : a.status === "completed" ? "Завершена" : a.status === "waiting" ? "Ожидает решения" : "Незавершена"}${a.excludedFromResults ? "<br>" + escapeHtml(a.exclusionReason) : ""}</td></tr>`,
      )
      .join("");
    const browser = await this.getBrowser(),
      page = await browser.newPage();
    try {
      const date = new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Europe/Moscow",
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date());
      await page.setContent(
        `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><style>@font-face{font-family:Noto;src:url(data:font/ttf;base64,${this.fontData["Noto Sans"] || ""})}@page{size:A4 landscape;margin:14mm}body{font:10pt Noto,sans-serif;color:#1b2930}h1{font-size:19pt}h2{font-size:14pt}table{border-collapse:collapse;width:100%;font-size:9pt}th,td{border:.2mm solid #aebbb5;padding:2mm;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group;background:#edf4f0}tr{break-inside:avoid}.meta{margin:8mm 0 5mm}.footer{margin-top:8mm}</style></head><body><h1>${run.published ? "Итоговый" : "Предварительный"} протокол</h1><h2>${escapeHtml(run.title)}</h2><p class="meta">Сформирован: ${escapeHtml(date)} МСК. Учитывается ${run.settings.attemptSelection === "last" ? "последняя завершённая" : run.settings.attemptSelection === "best" ? "лучшая" : "первая завершённая"} попытка. При равенстве баллов: ${run.settings.tieBreak === "time" ? "меньшее время прохождения" : "общее место"}.</p><table><thead><tr><th>№</th><th>Участник</th><th>Организация / группа</th>${roundHeaders}<th>Итого</th><th>Место</th><th>Состояние</th></tr></thead><tbody>${body}</tbody></table><p class="footer">Организатор: ${escapeHtml(user.name)}. ${run.published ? "Результаты опубликованы организатором." : "Результаты ещё не опубликованы."}</p></body></html>`,
        { waitUntil: "load" },
      );
      await page.evaluate(() => document.fonts.ready);
      return await page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
        tagged: true,
      });
    } finally {
      await page.close();
    }
  }
  revoke(user, key, reason) {
    this.service.right(user, "awards");
    const issue = this.service.get(user, "issue", key, true);
    fail(String(reason || "").trim(), "Укажите причину отзыва.");
    issue.status = "revoked";
    issue.revokedAt = now();
    issue.revokeReason = String(reason).slice(0, 2000);
    this.store.audit(user.id, "document.revoked", key, { reason });
    return this.store.put("issue", key, issue.owner, issue, issue.runId);
  }
  async reissue(user, key, body) {
    const old = this.service.get(user, "issue", key, true);
    this.service.right(user, "awards");
    fail(body.reason, "Укажите причину перевыпуска.");
    fail(
      old.status !== "suspended",
      "Сначала заново утвердите результаты и выполните выпуск по обновлённому списку.",
      409,
    );
    const next = id("issue");
    const fields = {
      ...old.fields,
      ...Object.fromEntries(
        Object.entries(body.fields || {}).filter(([key]) =>
          [
            "fullName",
            "institution",
            "groupName",
            "mentorName",
            "degree",
            "nomination",
            "issuer",
            "order",
            "date",
          ].includes(key),
        ),
      ),
    };
    const template = clone(
      body.templateId
        ? this.service.get(user, "template", body.templateId)
        : old.templateSnapshot,
    );
    for (const element of template.elements.filter((e) => e.type === "qr"))
      element.src = process.env.CONSTRUCTOR_PUBLIC_ORIGIN
        ? await QRCode.toDataURL(
            process.env.CONSTRUCTOR_PUBLIC_ORIGIN +
              "/constructor/verify/" +
              next,
          )
        : "";
    const bytes = await this.render(template, fields, { user });
    fail(
      this.store.get("issue", key).revision === old.revision,
      "Результаты изменились во время подготовки. Заново утвердите награждение.",
      409,
    );
    const relativePath = `documents/${next}.pdf`;
    fs.writeFileSync(safePath(this.store.root, relativePath), bytes, {
      mode: 0o600,
    });
    try {
      return this.store.transaction(() => {
        fail(
          this.store.get("issue", key).revision === old.revision,
          "Документ изменился во время подготовки. Обновите реестр.",
          409,
        );
        this.revoke(user, key, body.reason);
        const issue = this.store.put(
          "issue",
          next,
          old.owner,
          {
            ...old,
            id: next,
            fields,
            templateSnapshot: clone(template),
            status: "issued",
            issuedAt: now(),
            relativePath,
            sha256: hash(bytes),
            previousIssueId: key,
            version: Number(old.version || 1) + 1,
            issuanceKey: id("reissue"),
            revokedAt: null,
            revokeReason: null,
          },
          old.runId,
        );
        this.store.audit(user.id, "document.reissued", next, {
          previousIssueId: key,
          reason: body.reason,
        });
        return issue;
      });
    } catch (error) {
      fs.rmSync(safePath(this.store.root, relativePath), { force: true });
      throw error;
    }
  }
  async close() {
    this.closing = true;
    for (const entry of this.queue.splice(0)) {
      const job = this.store.get("job", entry.jid);
      this.store.put(
        "job",
        job.id,
        job.owner,
        {
          ...job,
          status: "failed",
          error:
            "Сервер остановлен. Повторите выпуск: готовые экземпляры сохранены.",
        },
        job.runId,
      );
    }
    await this.browserPromise?.catch(() => {});
    await this.browser?.close();
    while (this.running)
      await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
