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

  function renderFamilies(families) {
    elements.families.innerHTML = "";
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
  }

  function renderList(items, className) {
    const list = createNode("ul", className);
    items.forEach((item) => list.appendChild(createNode("li", "", item)));
    return list;
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
        createNode("p", "", asset.negativePrompt || "")
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

    section.append(head, topics, renderRpIntake(packageData), tasks, log, prompts, assetPlan, renderDecisionControls(packageData), criteria);
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
      renderFamilies(digitalShift.families || []);
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
