(function () {
  const elements = {
    version: document.getElementById("approval-version"),
    packages: document.getElementById("approval-packages"),
    status: document.getElementById("approval-status"),
    summary: document.getElementById("approval-summary"),
    families: document.getElementById("approval-families"),
    packagesList: document.getElementById("approval-packages-list")
  };

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

  function renderSummary(exam, digitalShift) {
    elements.summary.innerHTML = "";
    [
      ["Режим", "training-only", "PX не влияет на ведомость и официальный протокол."],
      ["Контракт", digitalShift.contract || "100 баллов / 20 заданий / 5 вариантов", "Официальный маршрут не расширяется."],
      ["Статус РП", digitalShift.rpStatus || "ожидаются РП", "Темы не переписываются вслепую."],
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
      ...packageData.visualPrompts.map((prompt) => `- ${prompt}`)
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

  function renderPackage(packageData, familyMap, index) {
    const section = createNode("article", "approval-package");
    section.id = `package-${packageData.variantId}`;

    const head = createNode("div", "approval-package-head");
    const titleWrap = createNode("div");
    titleWrap.append(createNode("p", "overline", `Пакет ${index + 1}`), createNode("h2", "", packageData.title));
    const status = createNode("div", "approval-status-pill", "Черновик до РП");
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

    section.append(head, topics, tasks, log, prompts, criteria);
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
