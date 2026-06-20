(function () {
  const elements = {
    version: document.getElementById("approval-version"),
    packages: document.getElementById("approval-packages"),
    status: document.getElementById("approval-status"),
    summary: document.getElementById("approval-summary"),
    families: document.getElementById("approval-families"),
    packagesList: document.getElementById("approval-packages-list")
  };

  const PM01_APPROVAL_STORAGE_KEY = "pm01ApprovalDecisionsV1";
  const PM01_RP_INTAKE_STORAGE_KEY = "pm01RpIntakeV1";
  const DECISION_OPTIONS = [
    { id: "pending", label: "Черновик", status: "Черновик до РП", detail: "Ожидает рабочую программу или правку формулировок." },
    { id: "approved_preview", label: "На preview", status: "Preview согласован", detail: "Можно генерировать 1-2 предварительных изображения." },
    { id: "needs_revision", label: "Нужны правки", status: "Нужны правки", detail: "Темы, задания или промпты требуют уточнения." },
    { id: "waiting_rp", label: "Ждём РП", status: "Ждём РП", detail: "Финальная методическая привязка откладывается до РП." }
  ];
  const decisionOptionsById = new Map(DECISION_OPTIONS.map((option) => [option.id, option]));
  let approvalState = loadApprovalState();
  let rpIntakeState = loadRpIntakeState();
  let currentExam = null;
  let currentDigitalShift = null;

  function unwrapExam(payload) {
    return payload?.data || payload?.exam || payload || {};
  }

  function createNode(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text) {
      node.textContent = text;
    }
    return node;
  }

  function loadApprovalState() {
    try {
      const stored = window.localStorage.getItem(PM01_APPROVAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) || {} : {};
    } catch (_) {
      return {};
    }
  }

  function loadRpIntakeState() {
    try {
      const stored = window.localStorage.getItem(PM01_RP_INTAKE_STORAGE_KEY);
      return stored ? JSON.parse(stored) || {} : {};
    } catch (_) {
      return {};
    }
  }

  function persistApprovalState() {
    try {
      window.localStorage.setItem(PM01_APPROVAL_STORAGE_KEY, JSON.stringify(approvalState));
    } catch (_) {
      // The board still works in-memory if browser storage is unavailable.
    }
  }

  function persistRpIntakeState() {
    try {
      window.localStorage.setItem(PM01_RP_INTAKE_STORAGE_KEY, JSON.stringify(rpIntakeState));
    } catch (_) {
      // The RP intake remains usable for the current browser session if storage is blocked.
    }
  }

  function getDecisionMeta(decisionId) {
    return decisionOptionsById.get(decisionId) || DECISION_OPTIONS[0];
  }

  function getPackageDecision(variantId) {
    const stored = approvalState[variantId] || {};
    return {
      decision: stored.decision || "pending",
      note: stored.note || "",
      updatedAt: stored.updatedAt || null
    };
  }

  function setPackageDecision(variantId, patch) {
    approvalState[variantId] = {
      ...getPackageDecision(variantId),
      ...patch,
      updatedAt: new Date().toISOString()
    };
    persistApprovalState();
  }

  function getPackageRpIntake(variantId) {
    const stored = rpIntakeState[variantId] || {};
    return {
      excerpt: stored.excerpt || "",
      confirmedTopics: stored.confirmedTopics || "",
      updatedAt: stored.updatedAt || null
    };
  }

  function setPackageRpIntake(variantId, patch) {
    rpIntakeState[variantId] = {
      ...getPackageRpIntake(variantId),
      ...patch,
      updatedAt: new Date().toISOString()
    };
    persistRpIntakeState();
  }

  function resetPackageRpIntake(variantId) {
    delete rpIntakeState[variantId];
    persistRpIntakeState();
  }

  function hasRpIntake(variantId) {
    const intake = getPackageRpIntake(variantId);
    return Boolean(intake.excerpt.trim() || intake.confirmedTopics.trim());
  }

  function getRpIntakeCount(packages) {
    return packages.filter((packageData) => hasRpIntake(packageData.variantId)).length;
  }

  function resetPackageDecision(variantId) {
    delete approvalState[variantId];
    persistApprovalState();
  }

  function getDecisionCounts(packages) {
    const counts = Object.fromEntries(DECISION_OPTIONS.map((option) => [option.id, 0]));
    packages.forEach((packageData) => {
      const decision = getPackageDecision(packageData.variantId).decision;
      counts[decision] = (counts[decision] || 0) + 1;
    });
    return counts;
  }

  function renderSummary(exam, digitalShift) {
    elements.summary.innerHTML = "";
    const packages = digitalShift.packages || [];
    const decisionCounts = getDecisionCounts(packages);
    const rpIntakeCount = getRpIntakeCount(packages);
    [
      ["Режим", "training-only", "PX не влияет на ведомость и официальный протокол."],
      ["Контракт", digitalShift.contract || "100 баллов / 20 заданий / 5 вариантов", "Официальный маршрут не расширяется."],
      ["Статус РП", digitalShift.rpStatus || "ожидаются РП", "Темы не переписываются вслепую."],
      ["РП-сверка", `${rpIntakeCount}/${packages.length} заполнено`, "Фрагменты РП хранятся локально до методической правки."],
      [
        "Согласование",
        `${decisionCounts.approved_preview}/${packages.length} на preview`,
        `${decisionCounts.needs_revision} правок · ${decisionCounts.waiting_rp} ждут РП.`
      ],
      ["Версия", exam.version || exam.appVersion || "PM01", "Текущий опубликованный пакет."]
    ].forEach(([label, value, detail]) => {
      const card = createNode("article", "approval-summary-card");
      card.append(createNode("span", "", label), createNode("strong", "", value), createNode("p", "", detail));
      elements.summary.appendChild(card);
    });
  }

  function renderNormativeAnchors(anchors) {
    const section = createNode("section", "approval-normative-panel");
    const heading = createNode("div", "approval-normative-head");
    heading.append(
      createNode("h3", "", "Нормативная опора"),
      createNode("span", "", "Проверенные источники, роль в PM01 и gate перед финальными правками")
    );
    const list = createNode("div", "approval-normative-list");
    anchors.forEach((anchor) => {
      const card = createNode("article", "approval-normative-card");
      card.dataset.sourceStatus = anchor.sourceStatus || "source";
      const title = createNode(anchor.sourceUrl ? "a" : "strong", "", anchor.title);
      if (anchor.sourceUrl) {
        title.href = anchor.sourceUrl;
        title.target = "_blank";
        title.rel = "noreferrer";
      }
      card.append(
        title,
        createNode("small", "", anchor.documentStatus || ""),
        createNode("p", "", anchor.relevance || ""),
        createNode("em", "", (anchor.focus || []).join(" · ")),
        createNode("span", "", anchor.approvalUse || ""),
        createNode("code", "", `${anchor.sourceStatus || "source"} · checked ${anchor.verifiedAt || "n/a"}`)
      );
      list.appendChild(card);
    });
    const copyButton = createNode("button", "button secondary", "Копировать источники");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyNormativeAnchors(anchors, copyButton));
    section.append(heading, list, copyButton);
    return section;
  }

  function renderVisualAssetRubric(rubric) {
    const section = createNode("section", "approval-visual-rubric-panel");
    const heading = createNode("div", "approval-visual-rubric-head");
    heading.append(
      createNode("h3", "", rubric.title || "Visual QA rubric"),
      createNode("span", "", "Что принимать, что отклонять и как осматривать preview-assets")
    );

    const accepted = createNode("article", "approval-visual-rubric-card");
    accepted.append(
      createNode("strong", "", "Принять, если"),
      renderList(rubric.acceptIf || [], "approval-visual-rubric-list")
    );

    const rejected = createNode("article", "approval-visual-rubric-card is-reject");
    rejected.append(
      createNode("strong", "", "Отклонить, если"),
      renderList(rubric.rejectIf || [], "approval-visual-rubric-list")
    );

    const copyButton = createNode("button", "button secondary", "Копировать visual rubric");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyVisualAssetRubric(rubric, copyButton));
    section.append(heading, accepted, rejected, copyButton);
    return section;
  }

  function renderInteractionBlueprints(blueprints) {
    const section = createNode("section", "approval-blueprint-panel");
    const heading = createNode("div", "approval-blueprint-head");
    heading.append(
      createNode("h3", "", "Интерактивные новшества"),
      createNode("span", "", "Сценарий, анимация, реализация и вопрос для согласования")
    );
    const list = createNode("div", "approval-blueprint-list");
    blueprints.forEach((blueprint) => {
      const card = createNode("article", "approval-blueprint-card");
      card.dataset.family = blueprint.familyId;
      card.append(
        createNode("strong", "", blueprint.visualMode || blueprint.familyId),
        createNode("p", "", blueprint.layout || ""),
        createNode("small", "", blueprint.animation || ""),
        createNode("em", "", blueprint.uniqueness || ""),
        createNode("span", "", blueprint.approvalQuestion || "")
      );
      list.appendChild(card);
    });
    const copyButton = createNode("button", "button secondary", "Копировать storyboard");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyInteractionBlueprints(blueprints, copyButton));
    section.append(heading, list, copyButton);
    return section;
  }

  function renderFamilies(families, blueprints = [], anchors = [], visualRubric = null) {
    elements.families.innerHTML = "";
    if (anchors.length) {
      elements.families.appendChild(renderNormativeAnchors(anchors));
    }
    if (visualRubric) {
      elements.families.appendChild(renderVisualAssetRubric(visualRubric));
    }
    const heading = createNode("h3", "", "Семейства заданий");
    const list = createNode("div", "approval-family-stack");
    families.forEach((family) => {
      const item = createNode("article", "approval-family-card");
      item.append(
        createNode("strong", "", family.title),
        createNode("span", "", family.interaction),
        createNode("p", "", family.modernity)
      );
      list.appendChild(item);
    });
    elements.families.append(heading, list);
    if (blueprints.length) {
      elements.families.appendChild(renderInteractionBlueprints(blueprints));
    }
  }

  function renderList(items, className) {
    const list = createNode("ul", className);
    items.forEach((item) => list.appendChild(createNode("li", "", item)));
    return list;
  }

  async function copyVisualAssetRubric(rubric, button) {
    const text = [
      rubric.title || "Visual QA rubric",
      `status: ${rubric.status || "-"}`,
      "",
      "stylePrinciples:",
      ...(rubric.stylePrinciples || []).map((item) => `- ${item}`),
      "",
      "acceptIf:",
      ...(rubric.acceptIf || []).map((item) => `- ${item}`),
      "",
      "rejectIf:",
      ...(rubric.rejectIf || []).map((item) => `- ${item}`),
      "",
      "inspectionSteps:",
      ...(rubric.inspectionSteps || []).map((item) => `- ${item}`)
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Visual rubric скопирован";
      window.setTimeout(() => {
        button.textContent = "Копировать visual rubric";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Копировать visual rubric";
      }, 1600);
    }
  }

  async function copyNormativeAnchors(anchors, button) {
    const text = [
      "PM01 PX normativeAnchors:",
      ...anchors.map((anchor, index) =>
        [
          `- row: ${index + 1}`,
          `  id: ${anchor.id}`,
          `  title: ${anchor.title}`,
          `  sourceUrl: ${anchor.sourceUrl || "-"}`,
          `  sourceStatus: ${anchor.sourceStatus}`,
          `  documentStatus: ${anchor.documentStatus}`,
          `  verifiedAt: ${anchor.verifiedAt}`,
          `  focus: ${(anchor.focus || []).join(", ")}`,
          `  relevance: ${anchor.relevance}`,
          `  approvalUse: ${anchor.approvalUse}`
        ].join("\n")
      )
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Источники скопированы";
      window.setTimeout(() => {
        button.textContent = "Копировать источники";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Копировать источники";
      }, 1600);
    }
  }

  async function copyInteractionBlueprints(blueprints, button) {
    const text = [
      "PM01 PX interactionBlueprints:",
      ...blueprints.map((blueprint, index) =>
        [
          `- row: ${index + 1}`,
          `  family: ${blueprint.familyId}`,
          `  visualMode: ${blueprint.visualMode}`,
          `  layout: ${blueprint.layout}`,
          `  studentFlow: ${(blueprint.studentFlow || []).join(" -> ")}`,
          `  animation: ${blueprint.animation}`,
          `  implementation: ${blueprint.implementation}`,
          `  uniqueness: ${blueprint.uniqueness}`,
          `  assessment: ${blueprint.assessment}`,
          `  approvalQuestion: ${blueprint.approvalQuestion}`
        ].join("\n")
      )
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Storyboard скопирован";
      window.setTimeout(() => {
        button.textContent = "Копировать storyboard";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Копировать storyboard";
      }, 1600);
    }
  }

  async function copyPromptPackage(packageData, button) {
    const text = [
      packageData.title,
      "",
      "Темы:",
      ...packageData.rpTopics.map((topic) => `- ${topic}`),
      "",
      "Промпты:",
      ...(packageData.previewAssets || []).map((asset) => `- ${asset.prompt}\n  path: ${asset.targetPath}\n  negative: ${asset.negativePrompt}`)
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Промпты скопированы";
      window.setTimeout(() => {
        button.textContent = "Копировать промпты";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Копировать промпты";
      }, 1600);
    }
  }

  async function copyApprovalDecision(packageData, button) {
    const decision = getPackageDecision(packageData.variantId);
    const meta = getDecisionMeta(decision.decision);
    const text = [
      packageData.title,
      `decision: ${meta.id} (${meta.label})`,
      `updatedAt: ${decision.updatedAt || "not_saved"}`,
      `note: ${decision.note || "-"}`,
      "",
      "rpIntake:",
      `  excerpt: ${getPackageRpIntake(packageData.variantId).excerpt || "-"}`,
      `  confirmedTopics: ${getPackageRpIntake(packageData.variantId).confirmedTopics || "-"}`,
      "",
      "previewAssets:",
      ...(packageData.previewAssets || []).map(
        (asset) => `- ${asset.id}\n  targetPath: ${asset.targetPath}\n  status: ${asset.status}\n  finalAsset: ${asset.finalAsset}`
      )
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Решение скопировано";
      window.setTimeout(() => {
        button.textContent = "Скопировать решение";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать решение";
      }, 1600);
    }
  }

  async function copyRpIntake(packageData, button) {
    const intake = getPackageRpIntake(packageData.variantId);
    const text = [
      packageData.title,
      "rpIntake:",
      `updatedAt: ${intake.updatedAt || "not_saved"}`,
      "",
      "currentTopics:",
      ...(packageData.rpTopics || []).map((topic) => `- ${topic}`),
      "",
      "rpExcerpt:",
      intake.excerpt || "-",
      "",
      "confirmedTopics:",
      intake.confirmedTopics || "-"
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "РП-сверка скопирована";
      window.setTimeout(() => {
        button.textContent = "Скопировать РП-сверку";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать РП-сверку";
      }, 1600);
    }
  }

  async function copyMethodicalMatrix(packageData, button) {
    const rows = packageData.methodicalMatrix || [];
    const text = [
      packageData.title,
      "methodicalMatrix:",
      ...rows.map((row, index) =>
        [
          `- row: ${index + 1}`,
          `  family: ${row.familyId}`,
          `  rpTopic: ${row.rpTopic}`,
          `  competencies: ${(row.competencies || []).join(", ")}`,
          `  examModule: ${row.examModule}`,
          `  currentQuestion: ${row.currentQuestion}`,
          `  newFormat: ${row.newFormat}`,
          `  visualAsset: ${row.visualAsset?.targetPath || "-"}`,
          `  checkCriterion: ${row.checkCriterion}`,
          `  approvalGate: ${row.approvalGate}`
        ].join("\n")
      )
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Матрица скопирована";
      window.setTimeout(() => {
        button.textContent = "Скопировать матрицу";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать матрицу";
      }, 1600);
    }
  }

  function renderMethodicalMatrix(packageData) {
    const rows = packageData.methodicalMatrix || [];
    const panel = createNode("section", "approval-package-block approval-methodical-matrix");
    const head = createNode("div", "approval-matrix-head");
    head.append(
      createNode("h3", "", "Методическая матрица"),
      createNode("span", "", "Тема РП, ПК/ОК, формат задания, planned asset и критерий проверки")
    );
    const grid = createNode("div", "approval-matrix-grid");
    rows.forEach((row, index) => {
      const card = createNode("article", "approval-matrix-card");
      card.dataset.family = row.familyId;
      card.append(
        createNode("span", "approval-matrix-index", String(index + 1).padStart(2, "0")),
        createNode("strong", "", row.newFormat || row.familyId),
        createNode("small", "", row.rpTopic || "Тема РП уточняется"),
        createNode("p", "", row.currentQuestion || ""),
        createNode("em", "", (row.competencies || []).join(" · ")),
        createNode("code", "", row.visualAsset?.targetPath || "asset после preview"),
        createNode("p", "approval-matrix-criterion", row.checkCriterion || "")
      );
      grid.appendChild(card);
    });
    const copyButton = createNode("button", "button secondary", "Скопировать матрицу");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyMethodicalMatrix(packageData, copyButton));
    panel.append(head, grid, copyButton);
    return panel;
  }

  function renderShiftCockpit(packageData) {
    const cockpit = packageData.shiftCockpit || {};
    const panel = createNode("section", "approval-package-block approval-cockpit-panel");
    const head = createNode("div", "approval-cockpit-head");
    head.append(
      createNode("h3", "", "Student cockpit"),
      createNode("span", "", cockpit.status || "training_only_cockpit")
    );

    const zones = createNode("div", "approval-cockpit-zones");
    (cockpit.layout || []).forEach((zone) => {
      const card = createNode("article", "approval-cockpit-zone");
      card.dataset.zone = zone.zone || "";
      card.append(createNode("strong", "", zone.title || zone.zone || ""), createNode("p", "", zone.purpose || ""));
      zones.appendChild(card);
    });

    const timeline = createNode("ol", "approval-cockpit-timeline");
    (cockpit.operationTimeline || []).forEach((step) => {
      const item = createNode("li");
      item.dataset.family = step.familyId || "";
      item.append(
        createNode("span", "approval-cockpit-step", String(step.step || "").padStart(2, "0")),
        createNode("strong", "", step.familyTitle || step.title || ""),
        createNode("small", "", step.controlSignal || step.studentAction || ""),
        createNode("em", "", step.animation || "")
      );
      timeline.appendChild(item);
    });

    const signals = renderList(
      (cockpit.journalSignals || []).map((signal) => (signal.time ? `${signal.time} · ${signal.event}` : signal.event)),
      "approval-cockpit-signals"
    );
    const focus = createNode("p", "approval-cockpit-focus", cockpit.rightPanel?.approvalFocus || "");
    panel.append(head, zones, timeline, signals, focus);
    return panel;
  }

  function renderRpIntake(packageData) {
    const intake = getPackageRpIntake(packageData.variantId);
    const panel = createNode("section", "approval-package-block approval-rp-intake");
    const head = createNode("div", "approval-rp-head");
    head.append(
      createNode("h3", "", "РП-intake"),
      createNode("span", "", hasRpIntake(packageData.variantId) ? "Фрагмент РП добавлен локально" : "Вставьте фрагмент РП перед финальной правкой тем")
    );

    const excerptField = createNode("label", "approval-rp-field");
    const excerpt = createNode("textarea", "approval-rp-text");
    excerpt.value = intake.excerpt;
    excerpt.placeholder = "Фрагмент РП, КТП или рабочей программы по этому цеху";
    excerpt.addEventListener("input", () => {
      setPackageRpIntake(packageData.variantId, { excerpt: excerpt.value });
      renderSummary(currentExam, currentDigitalShift);
    });
    excerptField.append(createNode("span", "", "Фрагмент РП"), excerpt);

    const confirmedField = createNode("label", "approval-rp-field");
    const confirmedTopics = createNode("textarea", "approval-rp-text approval-rp-topics");
    confirmedTopics.value = intake.confirmedTopics;
    confirmedTopics.placeholder = "Уточнённые темы после сверки с РП";
    confirmedTopics.addEventListener("input", () => {
      setPackageRpIntake(packageData.variantId, { confirmedTopics: confirmedTopics.value });
      renderSummary(currentExam, currentDigitalShift);
    });
    confirmedField.append(createNode("span", "", "Уточнённые темы"), confirmedTopics);

    const actions = createNode("div", "approval-rp-actions");
    const copyButton = createNode("button", "button secondary", "Скопировать РП-сверку");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyRpIntake(packageData, copyButton));
    const resetButton = createNode("button", "button ghost", "Очистить РП");
    resetButton.type = "button";
    resetButton.addEventListener("click", () => {
      resetPackageRpIntake(packageData.variantId);
      renderSummary(currentExam, currentDigitalShift);
      renderPackages(currentDigitalShift);
    });
    actions.append(copyButton, resetButton);
    panel.append(head, excerptField, confirmedField, actions);
    return panel;
  }

  function renderDecisionControls(packageData) {
    const state = getPackageDecision(packageData.variantId);
    const activeMeta = getDecisionMeta(state.decision);
    const panel = createNode("section", "approval-package-block approval-decision-panel");
    const head = createNode("div", "approval-decision-head");
    head.append(createNode("h3", "", "Решение по пакету"), createNode("span", "", activeMeta.detail));

    const options = createNode("div", "approval-decision-options");
    DECISION_OPTIONS.forEach((option) => {
      const button = createNode("button", "approval-decision-button", option.label);
      button.type = "button";
      button.dataset.decision = option.id;
      button.classList.toggle("is-active", state.decision === option.id);
      button.addEventListener("click", () => {
        setPackageDecision(packageData.variantId, { decision: option.id });
        renderSummary(currentExam, currentDigitalShift);
        renderPackages(currentDigitalShift);
      });
      options.appendChild(button);
    });

    const noteField = createNode("label", "approval-note-field");
    const note = createNode("textarea", "approval-note");
    note.value = state.note;
    note.placeholder = "Что изменить в темах, заданиях или visual prompt";
    note.addEventListener("input", () => {
      setPackageDecision(packageData.variantId, { note: note.value });
      renderSummary(currentExam, currentDigitalShift);
    });
    noteField.append(createNode("span", "", "Заметка"), note);

    const actions = createNode("div", "approval-decision-actions");
    const copyButton = createNode("button", "button secondary", "Скопировать решение");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyApprovalDecision(packageData, copyButton));
    const resetButton = createNode("button", "button ghost", "Сбросить");
    resetButton.type = "button";
    resetButton.addEventListener("click", () => {
      resetPackageDecision(packageData.variantId);
      renderSummary(currentExam, currentDigitalShift);
      renderPackages(currentDigitalShift);
    });
    actions.append(copyButton, resetButton);
    panel.append(head, options, noteField, actions);
    return panel;
  }

  function renderPackage(packageData, familyMap, index) {
    const decision = getPackageDecision(packageData.variantId);
    const decisionMeta = getDecisionMeta(decision.decision);
    const section = createNode("article", "approval-package");
    section.id = `package-${packageData.variantId}`;
    section.dataset.decision = decisionMeta.id;

    const head = createNode("div", "approval-package-head");
    const titleWrap = createNode("div");
    titleWrap.append(createNode("p", "overline", `Пакет ${index + 1}`), createNode("h2", "", packageData.title));
    const status = createNode("div", "approval-status-pill", decisionMeta.status);
    status.dataset.decision = decisionMeta.id;
    head.append(titleWrap, status);

    const topics = createNode("section", "approval-package-block");
    topics.append(createNode("h3", "", "Темы РП для подтверждения"), renderList(packageData.rpTopics || [], "approval-topic-list"));

    const tasks = createNode("section", "approval-package-block");
    tasks.appendChild(createNode("h3", "", "Задания и современность"));
    const taskList = createNode("div", "approval-task-list");
    (packageData.tasks || []).forEach((task, taskIndex) => {
      const family = familyMap.get(task.familyId) || {};
      const row = createNode("article", "approval-task-row");
      row.dataset.family = task.familyId;
      row.append(
        createNode("span", "approval-task-index", String(taskIndex + 1).padStart(2, "0")),
        createNode("strong", "", task.title),
        createNode("small", "", family.title || task.familyTitle || task.familyId),
        createNode("p", "", family.modernity || "")
      );
      taskList.appendChild(row);
    });
    tasks.appendChild(taskList);

    const log = createNode("section", "approval-package-block");
    log.append(createNode("h3", "", "Производственный журнал"), renderList(packageData.productionLog || [], "approval-log-list"));

    const prompts = createNode("section", "approval-package-block");
    prompts.appendChild(createNode("h3", "", "Промпты preview-изображений"));
    const promptList = renderList(packageData.visualPrompts || [], "approval-prompt-list");
    const copyButton = createNode("button", "button secondary", "Копировать промпты");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyPromptPackage(packageData, copyButton));
    prompts.append(promptList, copyButton);

    const assetPlan = createNode("section", "approval-package-block");
    assetPlan.appendChild(createNode("h3", "", "Слоты preview-assets"));
    const assetGrid = createNode("div", "approval-asset-grid");
    (packageData.previewAssets || []).forEach((asset) => {
      const assetCard = createNode("article", "approval-asset-card");
      assetCard.dataset.status = asset.status || "awaiting_preview";
      assetCard.append(
        createNode("strong", "", asset.kind === "scene" ? "Общий вид цеха" : "Контрольная партия"),
        createNode("span", "approval-asset-path", asset.targetPath),
        createNode("small", "", asset.status === "awaiting_preview" ? "Ожидает preview" : asset.status),
        createNode("em", "approval-asset-purpose", asset.visualPurpose || ""),
        createNode("p", "", asset.negativePrompt || ""),
        renderList(
          (asset.styleReferences || []).map((reference) => `${reference.label}: ${reference.path}`),
          "approval-asset-reference-list"
        ),
        renderList(asset.inspectionChecklist || [], "approval-asset-checklist")
      );
      assetGrid.appendChild(assetCard);
    });
    assetPlan.appendChild(assetGrid);

    const criteria = createNode("section", "approval-package-block approval-criteria");
    criteria.append(
      createNode("h3", "", "Критерии согласования"),
      renderList(
        [
          "темы совпадают с РП или требуют правки формулировок;",
          "визуал показывает сырье и полуфабрикаты, а не готовые блюда;",
          "задача проверяет производственное решение, а не угадывание термина;",
          "после утверждения preview финальные assets сохраняются в public/assets/pm01/generated/..."
        ],
        "approval-checklist"
      )
    );

    section.append(head, topics, renderRpIntake(packageData), renderMethodicalMatrix(packageData), renderShiftCockpit(packageData), tasks, log, prompts, assetPlan, renderDecisionControls(packageData), criteria);
    return section;
  }

  function renderPackages(digitalShift) {
    elements.packagesList.innerHTML = "";
    const familyMap = new Map((digitalShift.families || []).map((family) => [family.id, family]));
    (digitalShift.packages || []).forEach((packageData, index) => {
      elements.packagesList.appendChild(renderPackage(packageData, familyMap, index));
    });
  }

  async function init() {
    try {
      const response = await fetch("/api/pm01/public/exam", { headers: { Accept: "application/json" } });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const exam = unwrapExam(payload);
      const digitalShift = exam.digitalShift || {};
      if (!digitalShift.packages?.length) {
        throw new Error("Digital shift packages are missing");
      }
      currentExam = exam;
      currentDigitalShift = digitalShift;

      elements.version.textContent = exam.version || "PM01";
      elements.packages.textContent = `${digitalShift.packages.length} цехов`;
      elements.status.textContent = "готово";
      renderSummary(exam, digitalShift);
      renderFamilies(
        digitalShift.families || [],
        digitalShift.interactionBlueprints || [],
        digitalShift.normativeAnchors || [],
        digitalShift.visualAssetRubric || null
      );
      renderPackages(digitalShift);
    } catch (error) {
      elements.status.textContent = "ошибка";
      elements.packagesList.innerHTML = "";
      const message = createNode("div", "message", `Не удалось загрузить пакеты: ${error.message}`);
      elements.packagesList.appendChild(message);
    }
  }

  init();
})();
