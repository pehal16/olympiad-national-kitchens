const state = {
  token: "",
  summary: null,
  questions: [],
  filteredQuestions: [],
  questionIssueMap: {},
  selectedQuestionId: "",
  creatorMode: "create",
  creatorEditingId: "",
  drafts: {},
  draftRequestState: "idle",
  currentView: "editor",
  detailOpen: false,
  editorOpen: false,
  filters: {
    search: "",
    tour: "",
    cuisine: "",
    type: "",
    difficulty: "",
    theme: "",
    source: "",
    qa: ""
  }
};

const elements = {
  navRibbon: document.getElementById("content-nav-ribbon"),
  navMenuToggle: document.getElementById("content-nav-menu-toggle"),
  navDrawer: document.getElementById("content-nav-drawer"),
  navBack: document.getElementById("content-nav-back"),
  navTop: document.getElementById("content-nav-top"),
  navSummary: document.getElementById("content-nav-summary"),
  navQa: document.getElementById("content-nav-qa"),
  navEditor: document.getElementById("content-nav-editor"),
  navRefresh: document.getElementById("content-refresh"),
  openCatalog: document.getElementById("content-open-catalog"),
  openSummary: document.getElementById("content-open-summary"),
  openQa: document.getElementById("content-open-qa"),
  openCreateTop: document.getElementById("content-open-create-top"),
  openCreate: document.getElementById("content-open-create"),
  openSelected: document.getElementById("content-open-selected"),
  openSelectedEmpty: document.getElementById("content-open-selected-empty"),
  openCreateEmpty: document.getElementById("content-open-create-empty"),
  loginCard: document.getElementById("content-login-card"),
  panel: document.getElementById("content-panel"),
  summarySection: document.getElementById("content-summary-section"),
  qaSection: document.getElementById("content-qa-section"),
  editorSection: document.getElementById("content-editor-section"),
  totalQuestions: document.getElementById("content-total-questions"),
  interactiveQuestions: document.getElementById("content-interactive-questions"),
  totalCuisines: document.getElementById("content-total-cuisines"),
  readyPercent: document.getElementById("content-ready-percent"),
  baseQuestions: document.getElementById("content-base-questions"),
  customQuestions: document.getElementById("content-custom-questions"),
  flaggedQuestions: document.getElementById("content-flagged-questions"),
  generatedAt: document.getElementById("content-generated-at"),
  coverageTours: document.getElementById("coverage-tours"),
  coverageCuisines: document.getElementById("coverage-cuisines"),
  coverageTypes: document.getElementById("coverage-types"),
  coverageDifficulties: document.getElementById("coverage-difficulties"),
  coverageThemes: document.getElementById("coverage-themes"),
  coverageOk: document.getElementById("coverage-ok"),
  coveragePk: document.getElementById("coverage-pk"),
  balance: document.getElementById("content-balance"),
  qaSummaryBadge: document.getElementById("qa-summary-badge"),
  qaDuplicates: document.getElementById("qa-duplicates"),
  qaMetadata: document.getElementById("qa-metadata"),
  qaDistractors: document.getElementById("qa-distractors"),
  qaTranslations: document.getElementById("qa-translations"),
  filterMeta: document.getElementById("content-filter-meta"),
  filterSearch: document.getElementById("content-filter-search"),
  filterTour: document.getElementById("content-filter-tour"),
  filterCuisine: document.getElementById("content-filter-cuisine"),
  filterType: document.getElementById("content-filter-type"),
  filterDifficulty: document.getElementById("content-filter-difficulty"),
  filterTheme: document.getElementById("content-filter-theme"),
  filterSource: document.getElementById("content-filter-source"),
  filterQa: document.getElementById("content-filter-qa"),
  filterReset: document.getElementById("content-filter-reset"),
  draftMeta: document.getElementById("content-draft-meta"),
  questionList: document.getElementById("content-question-list"),
  detailModal: document.getElementById("content-detail-modal"),
  editorModal: document.getElementById("content-editor-modal"),
  closeDetail: document.getElementById("content-close-detail"),
  closeEditor: document.getElementById("content-close-editor"),
  detailEmpty: document.getElementById("content-detail-empty"),
  detail: document.getElementById("content-detail"),
  detailHead: document.getElementById("content-detail-head"),
  detailMetrics: document.getElementById("content-detail-metrics"),
  detailQa: document.getElementById("content-detail-qa"),
  note: document.getElementById("content-detail-note"),
  editQuestion: document.getElementById("content-edit-question"),
  deleteQuestion: document.getElementById("content-delete-question"),
  saveDraft: document.getElementById("content-save-draft"),
  resetDraft: document.getElementById("content-reset-draft"),
  exportDrafts: document.getElementById("content-export-drafts"),
  creatorNote: document.getElementById("content-creator-note"),
  creatorModeBadge: document.getElementById("content-creator-mode"),
  cancelEdit: document.getElementById("content-cancel-edit"),
  createQuestion: document.getElementById("content-create-question"),
  resetCreator: document.getElementById("content-reset-creator"),
  creatorTour: document.getElementById("creator-tour"),
  creatorCuisine: document.getElementById("creator-cuisine"),
  creatorDishLabel: document.getElementById("creator-dish-label"),
  creatorPrompt: document.getElementById("creator-prompt"),
  creatorScenario: document.getElementById("creator-scenario"),
  creatorNoteInput: document.getElementById("creator-note"),
  creatorOption1: document.getElementById("creator-option-1"),
  creatorOption2: document.getElementById("creator-option-2"),
  creatorOption3: document.getElementById("creator-option-3"),
  creatorOption4: document.getElementById("creator-option-4"),
  creatorCorrect1: document.getElementById("creator-correct-1"),
  creatorCorrect2: document.getElementById("creator-correct-2"),
  creatorCorrect3: document.getElementById("creator-correct-3"),
  creatorCorrect4: document.getElementById("creator-correct-4"),
  creatorDifficulty: document.getElementById("creator-difficulty"),
  creatorTheme: document.getElementById("creator-theme"),
  creatorTopic: document.getElementById("creator-topic"),
  creatorFocus: document.getElementById("creator-focus"),
  creatorOkCodes: document.getElementById("creator-ok-codes"),
  creatorPkFocus: document.getElementById("creator-pk-focus"),
  creatorMethodicalPurpose: document.getElementById("creator-methodical-purpose"),
  editorTheme: document.getElementById("editor-theme"),
  editorTopic: document.getElementById("editor-topic"),
  editorFocus: document.getElementById("editor-focus"),
  editorStudentAction: document.getElementById("editor-student-action"),
  editorDifficulty: document.getElementById("editor-difficulty"),
  editorEstimatedTime: document.getElementById("editor-estimated-time"),
  editorOkCodes: document.getElementById("editor-ok-codes"),
  editorPkFocus: document.getElementById("editor-pk-focus"),
  editorMethodicalPurpose: document.getElementById("editor-methodical-purpose"),
  appVersionLabel: document.getElementById("content-app-version-label")
};

function isCompactNavigation() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function setNavDrawerOpen(open) {
  const nextState = Boolean(open && isCompactNavigation());
  if (elements.navRibbon) {
    elements.navRibbon.classList.toggle("is-open", nextState);
  }
  if (elements.navMenuToggle) {
    elements.navMenuToggle.setAttribute("aria-expanded", nextState ? "true" : "false");
    elements.navMenuToggle.textContent = nextState ? "Закрыть меню" : "Меню";
  }
}

function closeNavDrawer() {
  setNavDrawerOpen(false);
}

const QA_CATEGORY_LABELS = {
  metadata: "Метаданные",
  distractors: "Варианты ответа",
  translation: "Перевод",
  duplicate: "Дубли"
};

function adminApi(path, options = {}) {
  const requestHeaders = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  return fetch(path, {
    credentials: "same-origin",
    headers: requestHeaders,
    ...options
  })
    .then(async (response) => {
      const raw = await response.text();
      const payload = raw ? JSON.parse(raw) : {};

      if (!response.ok || payload.ok === false) {
        const error = new Error(payload.message || `Ошибка запроса (${response.status}).`);
        error.status = response.status;
        throw error;
      }

      return payload.data;
    })
    .catch((error) => {
      if (error.status) {
        throw error;
      }

      const wrapped = new Error("Не удалось получить данные от сервера.");
      wrapped.status = 0;
      throw wrapped;
    });
}

async function ensureAdminSession() {
  const response = await fetch("/api/admin/session", {
    credentials: "same-origin"
  });

  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : {};

  if (!response.ok || payload.ok === false) {
    const error = new Error(payload.message || `Ошибка проверки сессии (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  return payload.data || { active: true };
}

function showMessage(element, message, type = "success") {
  element.textContent = message;
  element.className = `message ${type}`;
}

function hideMessage(element) {
  element.textContent = "";
  element.className = "message hidden";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function shortText(value, max = 120) {
  const text = String(value || "");
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
}

function buildQuestionIssueMap(summary) {
  const map = {};

  (summary?.qa?.questionIssues || []).forEach((item) => {
    map[item.id] = item;
  });

  return map;
}

function getQuestionIssueInfo(question) {
  const issue = state.questionIssueMap[question.id];
  const hasDraft = Boolean(state.drafts[question.id]);

  if (!issue) {
    return {
      issueCount: 0,
      issues: [],
      categories: [],
      severity: hasDraft ? "draft" : "clean",
      label: hasDraft ? "Есть серверный черновик" : "Без замечаний",
      hasDraft
    };
  }

  return {
    issueCount: issue.issueCount || 0,
    issues: issue.issues || [],
    categories: issue.categories || [],
    severity: issue.severity === "risk" ? "risk" : "warning",
    label: issue.severity === "risk" ? "Нужна проверка" : "Есть сигналы QA",
    hasDraft
  };
}

function formatQaCategoryLabel(category) {
  return QA_CATEGORY_LABELS[category] || category;
}

function goBackOrHome() {
  closeNavDrawer();
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = "/admin.html";
}

function showLoginState() {
  elements.loginCard.classList.remove("hidden");
  elements.panel.classList.add("hidden");
  closeDetailModal();
  closeEditorModal();
}

function showPanel() {
  elements.loginCard.classList.add("hidden");
  elements.panel.classList.remove("hidden");
}

function setButtonActive(button, active) {
  if (!button) {
    return;
  }
  button.classList.toggle("is-active", Boolean(active));
}

function setContentView(view, options = {}) {
  state.currentView = view;

  elements.summarySection.classList.toggle("hidden", view !== "summary");
  elements.qaSection.classList.toggle("hidden", view !== "qa");
  elements.editorSection.classList.toggle("hidden", view !== "editor");

  setButtonActive(elements.navSummary, view === "summary");
  setButtonActive(elements.navQa, view === "qa");
  setButtonActive(elements.navEditor, view === "editor");
  setButtonActive(elements.openSummary, view === "summary");
  setButtonActive(elements.openQa, view === "qa");
  setButtonActive(elements.openCatalog, view === "editor");

  if (options.scroll === false) {
    return;
  }

  const target =
    view === "summary" ? elements.summarySection : view === "qa" ? elements.qaSection : elements.editorSection;
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function syncBodyOverlayState() {
  const overlayOpen = state.detailOpen || state.editorOpen;
  document.body.classList.toggle("overlay-active", overlayOpen);
}

function closeDetailModal() {
  state.detailOpen = false;
  elements.detailModal.classList.add("hidden");
  syncBodyOverlayState();
}

function openDetailModal() {
  if (!state.selectedQuestionId && state.filteredQuestions.length) {
    state.selectedQuestionId = state.filteredQuestions[0].id;
    renderQuestionList();
    renderQuestionDetail();
  }

  if (!state.selectedQuestionId) {
    showMessage(elements.creatorNote, "Сначала выберите вопрос из списка.", "warning");
    return;
  }

  state.detailOpen = true;
  elements.detailModal.classList.remove("hidden");
  syncBodyOverlayState();
}

function closeEditorModal() {
  state.editorOpen = false;
  elements.editorModal.classList.add("hidden");
  syncBodyOverlayState();
}

function openEditorModal() {
  state.editorOpen = true;
  elements.editorModal.classList.remove("hidden");
  syncBodyOverlayState();
}

function setDraftRequestState(mode) {
  state.draftRequestState = mode;
  const locked = mode === "saving" || mode === "resetting";
  elements.saveDraft.disabled = locked;
  elements.resetDraft.disabled = locked;
}

function fillSelect(select, placeholder, values) {
  const current = select.value;
  select.innerHTML = "";

  const base = document.createElement("option");
  base.value = "";
  base.textContent = placeholder;
  select.appendChild(base);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  if (values.includes(current)) {
    select.value = current;
  }
}

function renderCoverageList(element, items = [], emptyText) {
  if (!items.length) {
    element.innerHTML = `<div class="muted">${emptyText}</div>`;
    return;
  }

  element.innerHTML = items
    .map(
      (item) =>
        `<div class="coverage-item"><span>${escapeHtml(item.label)}</span><strong>${item.count}</strong></div>`
    )
    .join("");
}

function renderQaList(element, items = [], renderer, emptyText) {
  if (!items.length) {
    element.innerHTML = `<div class="muted">${emptyText}</div>`;
    return;
  }

  element.innerHTML = items.map(renderer).join("");
}

function renderSummary() {
  const summary = state.summary;
  if (!summary) {
    return;
  }

  elements.totalQuestions.textContent = summary.totalQuestions;
  elements.interactiveQuestions.textContent = summary.interactiveQuestions;
  elements.totalCuisines.textContent = summary.cuisines.length;
  elements.readyPercent.textContent = `${summary.qa.readyPercent}%`;
  elements.baseQuestions.textContent = summary.baseQuestions || 0;
  elements.customQuestions.textContent = summary.customQuestions || 0;
  elements.flaggedQuestions.textContent = summary.qa.flaggedQuestionsCount || 0;
  elements.generatedAt.textContent = `обновлено ${formatDateTime(summary.generatedAt)}`;

  renderCoverageList(elements.coverageTours, summary.tours, "Данные по турам пока не загружены.");
  renderCoverageList(elements.coverageCuisines, summary.cuisines, "Кухни пока не определены.");
  renderCoverageList(elements.coverageTypes, summary.types, "Типы заданий пока не определены.");
  renderCoverageList(
    elements.coverageDifficulties,
    summary.difficulties,
    "Уровни сложности пока не определены."
  );
  renderCoverageList(elements.coverageThemes, summary.themes.slice(0, 10), "Темы пока не определены.");
  renderCoverageList(elements.coverageOk, summary.okCoverage, "ОК пока не привязаны.");
  renderCoverageList(elements.coveragePk, summary.pkCoverage, "Профессиональные акценты пока не привязаны.");

  elements.balance.innerHTML = `
    <div class="coverage-item"><span>Разброс по кухням</span><strong>${summary.qa.balance.cuisineSpread}</strong></div>
    <div class="coverage-item"><span>Максимум по одной кухне</span><strong>${summary.qa.balance.maxCuisineCount}</strong></div>
    <div class="coverage-item"><span>Минимум по одной кухне</span><strong>${summary.qa.balance.minCuisineCount}</strong></div>
  `;

  elements.qaSummaryBadge.textContent = `сигналов: ${summary.qa.flaggedQuestionsCount || 0} вопросов`;

  renderQaList(
    elements.qaDuplicates,
    summary.qa.duplicatePrompts,
    (item) => `
      <article class="qa-item">
        <strong>${escapeHtml(shortText(item.prompt, 90))}</strong>
        <div class="muted">${escapeHtml(item.questionIds.join(", "))}</div>
      </article>
    `,
    "Явных дублей формулировок пока не найдено."
  );

  renderQaList(
    elements.qaMetadata,
    summary.qa.missingMetadata,
    (item) => `
      <article class="qa-item">
        <strong>${escapeHtml(item.id)}</strong>
        <div>${escapeHtml(shortText(item.prompt, 90))}</div>
        <div class="muted">Поля: ${escapeHtml(item.fields.join(", "))}</div>
      </article>
    `,
    "Пробелов метаданных пока не найдено."
  );

  renderQaList(
    elements.qaDistractors,
    summary.qa.weakDistractors,
    (item) => `
      <article class="qa-item">
        <strong>${escapeHtml(item.id)}</strong>
        <div>${escapeHtml(shortText(item.prompt, 90))}</div>
        <div class="muted">${escapeHtml(item.issues.join(" • "))}</div>
      </article>
    `,
    "Слабых distractors пока не найдено."
  );

  renderQaList(
    elements.qaTranslations,
    summary.qa.translationHotspots,
    (item) => `
      <article class="qa-item">
        <strong>${escapeHtml(item.id)}</strong>
        <div>${escapeHtml(shortText(item.prompt, 90))}</div>
      </article>
    `,
    "Точек проверки перевода пока нет."
  );
}

function getQuestionBlob(question) {
  return [
    question.id,
    question.prompt,
    question.dishLabel,
    question.caseTitle,
    question.metadata.theme,
    question.metadata.topic,
    question.metadata.focus
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function syncFiltersFromInputs() {
  state.filters = {
    search: elements.filterSearch.value.trim(),
    tour: elements.filterTour.value,
    cuisine: elements.filterCuisine.value,
    type: elements.filterType.value,
    difficulty: elements.filterDifficulty.value,
    theme: elements.filterTheme.value,
    source: elements.filterSource.value,
    qa: elements.filterQa.value
  };
}

function mergedQuestion(question) {
  const draft = state.drafts[question.id];
  if (!draft) {
    return question;
  }

  return {
    ...question,
    metadata: {
      ...question.metadata,
      ...draft,
      okCodes: draft.okCodes || question.metadata.okCodes,
      pkFocus: draft.pkFocus || question.metadata.pkFocus
    }
  };
}

function isCustomQuestion(question) {
  return question?.sourceKind === "custom_question";
}

function setCreatorMode(mode = "create", question = null) {
  state.creatorMode = mode;
  state.creatorEditingId = mode === "edit" && question ? question.id : "";

  if (mode === "edit" && question) {
    elements.creatorModeBadge.textContent = `режим: редактирование ${question.id}`;
    elements.createQuestion.textContent = "Сохранить изменения";
    elements.cancelEdit.classList.remove("hidden");
    elements.creatorModeBadge.classList.add("pill-accent");
    return;
  }

  elements.creatorModeBadge.textContent = "режим: новый тест";
  elements.createQuestion.textContent = "Добавить вопрос";
  elements.cancelEdit.classList.add("hidden");
  elements.creatorModeBadge.classList.remove("pill-accent");
}

function fillCreatorFromQuestion(question) {
  const options = Array.isArray(question.options) ? question.options : [];
  const option1 = options[0] || { text: "", isCorrect: false };
  const option2 = options[1] || { text: "", isCorrect: false };
  const option3 = options[2] || { text: "", isCorrect: false };
  const option4 = options[3] || { text: "", isCorrect: false };

  elements.creatorTour.value = question.tourCode || "T1";
  elements.creatorCuisine.value = question.cuisine || "mixed";
  elements.creatorDishLabel.value = question.dishLabel || "";
  elements.creatorPrompt.value = question.prompt || "";
  elements.creatorScenario.value = question.scenario || "";
  elements.creatorNoteInput.value = question.note || "";
  elements.creatorOption1.value = option1.text || "";
  elements.creatorOption2.value = option2.text || "";
  elements.creatorOption3.value = option3.text || "";
  elements.creatorOption4.value = option4.text || "";
  elements.creatorCorrect1.checked = Boolean(option1.isCorrect);
  elements.creatorCorrect2.checked = Boolean(option2.isCorrect);
  elements.creatorCorrect3.checked = Boolean(option3.isCorrect);
  elements.creatorCorrect4.checked = Boolean(option4.isCorrect);
  elements.creatorDifficulty.value = question.metadata?.difficulty || "basic";
  elements.creatorTheme.value = question.metadata?.theme || "";
  elements.creatorTopic.value = question.metadata?.topic || "";
  elements.creatorFocus.value = question.metadata?.focus || "";
  elements.creatorOkCodes.value = (question.metadata?.okCodes || []).join(", ");
  elements.creatorPkFocus.value = (question.metadata?.pkFocus || []).join(", ");
  elements.creatorMethodicalPurpose.value = question.metadata?.methodicalPurpose || "";
}

function renderQuestionDetail() {
  const question = state.questions.find((item) => item.id === state.selectedQuestionId);
  if (!question) {
    elements.detailEmpty.classList.remove("hidden");
    elements.detail.classList.add("hidden");
    elements.editQuestion.classList.add("hidden");
    elements.deleteQuestion.classList.add("hidden");
    elements.detailMetrics.innerHTML = "";
    elements.detailQa.innerHTML = "";
    closeDetailModal();
    return;
  }

  const merged = mergedQuestion(question);
  const custom = isCustomQuestion(question);
  const sourceBadge = custom
    ? '<span class="pill pill-accent">авторский тест</span>'
    : '<span class="pill">основной банк</span>';
  const issueInfo = getQuestionIssueInfo(question);
  const qaBadgeClass =
    issueInfo.severity === "risk"
      ? "pill qa-pill qa-pill-risk"
      : issueInfo.issueCount
        ? "pill qa-pill qa-pill-warning"
        : issueInfo.hasDraft
          ? "pill qa-pill qa-pill-draft"
          : "pill qa-pill qa-pill-clean";
  const qaBadge = `<span class="${qaBadgeClass}">${escapeHtml(issueInfo.label)}</span>`;

  elements.detailEmpty.classList.add("hidden");
  elements.detail.classList.remove("hidden");
  hideMessage(elements.note);
  elements.editQuestion.classList.toggle("hidden", !custom);
  elements.deleteQuestion.classList.toggle("hidden", !custom);

  elements.detailHead.innerHTML = `
    <strong>${escapeHtml(question.id)} • ${escapeHtml(question.tourCode)} • ${escapeHtml(question.typeLabel)}</strong> ${sourceBadge} ${qaBadge}<br />
    <span class="muted">${escapeHtml(question.cuisineLabel)} • ${escapeHtml(question.cuisineGroupLabel)}</span><br />
    <span class="muted">${escapeHtml(question.dishLabel || question.caseTitle || "Без отдельного блюда")}</span><br />
    <span class="muted">${escapeHtml(question.prompt)}</span>
  `;

  if (Array.isArray(question.options) && question.options.length) {
    const optionsMarkup = question.options
      .map(
        (option) =>
          `<li>${escapeHtml(option.text)}${option.isCorrect ? ' <span class="pill">ключ</span>' : ""}</li>`
      )
      .join("");
    elements.detailHead.innerHTML += `<div class="content-option-preview"><strong>Варианты:</strong><ul class="flat-list">${optionsMarkup}</ul></div>`;
  }

  elements.detailMetrics.innerHTML = `
    <article class="detail-metric">
      <span class="muted">Источник</span>
      <strong>${escapeHtml(question.sourceLabel || (custom ? "Авторский тест" : "Основной банк"))}</strong>
    </article>
    <article class="detail-metric">
      <span class="muted">Оценочное время</span>
      <strong>${Number(merged.metadata.estimatedTimeSec || 0)} сек</strong>
    </article>
    <article class="detail-metric">
      <span class="muted">Коды ОК</span>
      <strong>${escapeHtml((merged.metadata.okCodes || []).join(", ") || "не указаны")}</strong>
    </article>
    <article class="detail-metric">
      <span class="muted">Проф. акценты</span>
      <strong>${escapeHtml((merged.metadata.pkFocus || []).join(", ") || "не указаны")}</strong>
    </article>
  `;

  const categoryBadges = issueInfo.categories.length
    ? issueInfo.categories
        .map((category) => `<span class="pill qa-pill">${escapeHtml(formatQaCategoryLabel(category))}</span>`)
        .join("")
    : '<span class="pill qa-pill qa-pill-clean">QA без замечаний</span>';
  const issueListMarkup = issueInfo.issues.length
    ? `<ul class="qa-signal-list">${issueInfo.issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>`
    : '<div class="muted">Для этого вопроса явных QA-сигналов не найдено.</div>';
  const draftNote = issueInfo.hasDraft
    ? '<div class="detail-qa-note">Есть серверный черновик. При необходимости сначала сверьте его с карточкой вопроса.</div>'
    : "";

  elements.detailQa.innerHTML = `
    <div class="section-row">
      <h4>Методический QA вопроса</h4>
      <div class="content-question-badges">${categoryBadges}</div>
    </div>
    ${draftNote}
    ${issueListMarkup}
  `;

  elements.editorTheme.value = merged.metadata.theme || "";
  elements.editorTopic.value = merged.metadata.topic || "";
  elements.editorFocus.value = merged.metadata.focus || "";
  elements.editorStudentAction.value = merged.metadata.studentAction || "";
  elements.editorDifficulty.value = merged.metadata.difficulty || "basic";
  elements.editorEstimatedTime.value = merged.metadata.estimatedTimeSec || 60;
  elements.editorOkCodes.value = (merged.metadata.okCodes || []).join(", ");
  elements.editorPkFocus.value = (merged.metadata.pkFocus || []).join(", ");
  elements.editorMethodicalPurpose.value = merged.metadata.methodicalPurpose || "";
}

function renderQuestionList() {
  elements.questionList.innerHTML = "";
  const total = state.questions.length;
  const shown = state.filteredQuestions.length;
  const shownFlagged = state.filteredQuestions.filter((question) => getQuestionIssueInfo(question).issueCount > 0).length;
  elements.filterMeta.textContent = `показано ${shown} из ${total} • с сигналами ${shownFlagged}`;
  elements.draftMeta.textContent = `черновиков: ${Object.keys(state.drafts).length} • сигналов QA: ${state.summary?.qa?.flaggedQuestionsCount || 0}`;

  if (!shown) {
    elements.questionList.innerHTML = '<div class="muted">По текущим фильтрам вопросов не найдено.</div>';
    if (state.selectedQuestionId && !state.filteredQuestions.find((item) => item.id === state.selectedQuestionId)) {
      state.selectedQuestionId = "";
      renderQuestionDetail();
    }
    elements.openSelected.disabled = true;
    elements.openSelectedEmpty.disabled = true;
    return;
  }

  if (!state.selectedQuestionId || !state.filteredQuestions.find((item) => item.id === state.selectedQuestionId)) {
    state.selectedQuestionId = state.filteredQuestions[0].id;
  }

  state.filteredQuestions.forEach((question) => {
    const draft = state.drafts[question.id];
    const custom = isCustomQuestion(question);
    const issueInfo = getQuestionIssueInfo(question);
    const row = document.createElement("button");
    row.type = "button";
    row.className = `content-question-row${question.id === state.selectedQuestionId ? " is-selected" : ""}${issueInfo.issueCount ? " has-issues" : ""}${issueInfo.severity === "risk" ? " is-risk" : ""}`;
    const qaBadgeClass =
      issueInfo.severity === "risk"
        ? "pill qa-pill qa-pill-risk"
        : issueInfo.issueCount
          ? "pill qa-pill qa-pill-warning"
          : issueInfo.hasDraft
            ? "pill qa-pill qa-pill-draft"
            : "pill qa-pill qa-pill-clean";
    row.innerHTML = `
      <div class="content-question-top">
        <strong>${escapeHtml(question.id)}</strong>
        <div class="content-question-badges">
          <span class="pill">${escapeHtml(question.tourCode)}</span>
          ${custom ? '<span class="pill pill-accent">авторский</span>' : ""}
          <span class="${qaBadgeClass}">${escapeHtml(issueInfo.label)}</span>
        </div>
      </div>
      <div>${escapeHtml(shortText(question.prompt, 110))}</div>
      <div class="content-question-meta">
        <span>${escapeHtml(question.cuisineLabel)}</span>
        <span>${escapeHtml(question.typeLabel)}</span>
        <span>${escapeHtml(question.metadata.difficultyLabel)}</span>
        <span>${escapeHtml(question.sourceLabel || (custom ? "Авторский тест" : "Основной банк"))}</span>
        ${draft ? '<span class="pill">есть серверный черновик</span>' : ""}
      </div>
    `;
    row.addEventListener("click", () => {
      state.selectedQuestionId = question.id;
      renderQuestionList();
      renderQuestionDetail();
    });
    elements.questionList.appendChild(row);
  });

  if (!state.selectedQuestionId) {
    state.selectedQuestionId = state.filteredQuestions[0].id;
  }

  renderQuestionDetail();
}

function applyFilters() {
  syncFiltersFromInputs();

  state.filteredQuestions = state.questions.filter((question) => {
    if (state.filters.search && !getQuestionBlob(question).includes(state.filters.search.toLowerCase())) {
      return false;
    }
    if (state.filters.tour && question.tourCode !== state.filters.tour) {
      return false;
    }
    if (state.filters.cuisine && question.cuisineLabel !== state.filters.cuisine) {
      return false;
    }
    if (state.filters.type && question.typeLabel !== state.filters.type) {
      return false;
    }
    if (state.filters.difficulty && question.metadata.difficultyLabel !== state.filters.difficulty) {
      return false;
    }
    if (state.filters.theme && question.metadata.theme !== state.filters.theme) {
      return false;
    }
    if (state.filters.source && (question.sourceLabel || "") !== state.filters.source) {
      return false;
    }
    const issueInfo = getQuestionIssueInfo(question);
    if (state.filters.qa === "clean" && issueInfo.issueCount > 0) {
      return false;
    }
    if (state.filters.qa === "flagged" && issueInfo.issueCount === 0) {
      return false;
    }
    if (state.filters.qa === "risk" && issueInfo.severity !== "risk") {
      return false;
    }
    if (state.filters.qa === "draft" && !state.drafts[question.id]) {
      return false;
    }
    return true;
  });

  renderQuestionList();
}

function populateFilterControls() {
  fillSelect(elements.filterTour, "Все туры", state.summary?.catalogs?.tours || []);
  fillSelect(elements.filterCuisine, "Все кухни", state.summary?.catalogs?.cuisines || []);
  fillSelect(elements.filterType, "Все типы", state.summary?.catalogs?.types || []);
  fillSelect(elements.filterDifficulty, "Все уровни", state.summary?.catalogs?.difficulties || []);
  fillSelect(elements.filterTheme, "Все темы", state.summary?.catalogs?.themes || []);
}

function collectDraftFromForm() {
  return {
    theme: elements.editorTheme.value.trim(),
    topic: elements.editorTopic.value.trim(),
    focus: elements.editorFocus.value.trim(),
    studentAction: elements.editorStudentAction.value.trim(),
    difficulty: elements.editorDifficulty.value,
    difficultyLabel:
      elements.editorDifficulty.selectedOptions[0]?.textContent || elements.editorDifficulty.value,
    estimatedTimeSec: Number(elements.editorEstimatedTime.value) || 60,
    okCodes: elements.editorOkCodes.value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    pkFocus: elements.editorPkFocus.value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    methodicalPurpose: elements.editorMethodicalPurpose.value.trim()
  };
}

async function saveDraft() {
  if (!state.selectedQuestionId) {
    return;
  }

  try {
    setDraftRequestState("saving");
    hideMessage(elements.note);
    const payload = collectDraftFromForm();
    const response = await adminApi(`/api/admin/content/drafts/${encodeURIComponent(state.selectedQuestionId)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    state.drafts[state.selectedQuestionId] = response.draft;
    showMessage(elements.note, "Черновик сохранён на сервере. Он доступен с любого компьютера.", "success");
    renderQuestionList();
    renderQuestionDetail();
  } catch (error) {
    showMessage(elements.note, error.message || "Не удалось сохранить черновик на сервере.", "error");
  } finally {
    setDraftRequestState("idle");
  }
}

async function resetDraft() {
  if (!state.selectedQuestionId) {
    return;
  }

  try {
    setDraftRequestState("resetting");
    hideMessage(elements.note);
    await adminApi(`/api/admin/content/drafts/${encodeURIComponent(state.selectedQuestionId)}`, {
      method: "DELETE"
    });
    delete state.drafts[state.selectedQuestionId];
    showMessage(elements.note, "Серверный черновик удалён. Показаны базовые метаданные вопроса.", "success");
    renderQuestionList();
    renderQuestionDetail();
  } catch (error) {
    showMessage(elements.note, error.message || "Не удалось удалить серверный черновик.", "error");
  } finally {
    setDraftRequestState("idle");
  }
}

function exportDrafts() {
  const payload = {
    exportedAt: new Date().toISOString(),
    drafts: state.drafts
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `content-drafts-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function collectCreatorPayload() {
  const options = [
    {
      text: elements.creatorOption1.value.trim(),
      isCorrect: elements.creatorCorrect1.checked
    },
    {
      text: elements.creatorOption2.value.trim(),
      isCorrect: elements.creatorCorrect2.checked
    },
    {
      text: elements.creatorOption3.value.trim(),
      isCorrect: elements.creatorCorrect3.checked
    },
    {
      text: elements.creatorOption4.value.trim(),
      isCorrect: elements.creatorCorrect4.checked
    }
  ];

  return {
    tourCode: elements.creatorTour.value,
    cuisine: elements.creatorCuisine.value,
    dishLabel: elements.creatorDishLabel.value.trim(),
    prompt: elements.creatorPrompt.value.trim(),
    scenario: elements.creatorScenario.value.trim(),
    note: elements.creatorNoteInput.value.trim(),
    options,
    difficulty: elements.creatorDifficulty.value,
    theme: elements.creatorTheme.value.trim(),
    topic: elements.creatorTopic.value.trim(),
    focus: elements.creatorFocus.value.trim(),
    okCodes: elements.creatorOkCodes.value.trim(),
    pkFocus: elements.creatorPkFocus.value.trim(),
    methodicalPurpose: elements.creatorMethodicalPurpose.value.trim()
  };
}

function resetCreatorForm() {
  setCreatorMode("create");
  elements.creatorTour.value = "T1";
  elements.creatorCuisine.value = "mixed";
  elements.creatorDishLabel.value = "";
  elements.creatorPrompt.value = "";
  elements.creatorScenario.value = "";
  elements.creatorNoteInput.value = "";
  elements.creatorOption1.value = "";
  elements.creatorOption2.value = "";
  elements.creatorOption3.value = "";
  elements.creatorOption4.value = "";
  elements.creatorCorrect1.checked = true;
  elements.creatorCorrect2.checked = false;
  elements.creatorCorrect3.checked = false;
  elements.creatorCorrect4.checked = false;
  elements.creatorDifficulty.value = "basic";
  elements.creatorTheme.value = "";
  elements.creatorTopic.value = "";
  elements.creatorFocus.value = "";
  elements.creatorOkCodes.value = "";
  elements.creatorPkFocus.value = "";
  elements.creatorMethodicalPurpose.value = "";
  hideMessage(elements.creatorNote);
}

function startEditingSelectedQuestion() {
  const question = state.questions.find((item) => item.id === state.selectedQuestionId);
  if (!question || !isCustomQuestion(question)) {
    showMessage(elements.note, "Редактировать из конструктора можно только авторские тесты.", "warning");
    return;
  }

  fillCreatorFromQuestion(question);
  setCreatorMode("edit", question);
  hideMessage(elements.creatorNote);
  showMessage(elements.creatorNote, `Открыт режим редактирования теста ${question.id}.`, "success");
  elements.editorSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deleteSelectedQuestion() {
  const question = state.questions.find((item) => item.id === state.selectedQuestionId);
  if (!question || !isCustomQuestion(question)) {
    showMessage(elements.note, "Удалять из интерфейса можно только авторские тесты.", "warning");
    return;
  }

  const confirmed = window.confirm(
    `Удалить авторский тест ${question.id}? Это действие затронет банк заданий и облачную версию олимпиады.`
  );
  if (!confirmed) {
    return;
  }

  try {
    elements.deleteQuestion.disabled = true;
    hideMessage(elements.note);
    await adminApi(`/api/admin/content/questions/${encodeURIComponent(question.id)}`, {
      method: "DELETE"
    });
    await adminApi(`/api/admin/content/drafts/${encodeURIComponent(question.id)}`, {
      method: "DELETE"
    }).catch(() => undefined);

    if (state.creatorEditingId === question.id) {
      resetCreatorForm();
    }

    delete state.drafts[question.id];
    state.selectedQuestionId = "";
    await loadContentPanel();
    showMessage(elements.creatorNote, `Тест ${question.id} удалён из банка заданий.`, "success");
    showMessage(elements.note, `Тест ${question.id} удалён из банка заданий.`, "success");
  } catch (error) {
    showMessage(elements.note, error.message || "Не удалось удалить авторский тест.", "error");
  } finally {
    elements.deleteQuestion.disabled = false;
  }
}

async function createCustomQuestion() {
  const editing = state.creatorMode === "edit" && state.creatorEditingId;
  const requestPath = editing
    ? `/api/admin/content/questions/${encodeURIComponent(state.creatorEditingId)}`
    : "/api/admin/content/questions";
  const requestMethod = editing ? "PUT" : "POST";

  try {
    elements.createQuestion.disabled = true;
    hideMessage(elements.creatorNote);
    const payload = collectCreatorPayload();
    if (editing) {
      payload.id = state.creatorEditingId;
    }

    const question = await adminApi(requestPath, {
      method: requestMethod,
      body: JSON.stringify(payload)
    });

    const successMessage = editing
      ? `Тест ${question.id} обновлён в банке заданий.`
      : `Новый тест ${question.id} сохранён в банке заданий.`;
    showMessage(
      elements.creatorNote,
      editing
        ? `Тест ${question.id} обновлён в банке заданий.`
        : `Новый тест ${question.id} сохранён в банке заданий.`,
      "success"
    );
    resetCreatorForm();
    await loadContentPanel();
    state.selectedQuestionId = question.id;
    renderQuestionList();
    renderQuestionDetail();
    showMessage(elements.creatorNote, successMessage, "success");
  } catch (error) {
    showMessage(
      elements.creatorNote,
      error.message || "Не удалось добавить новый тестовый вопрос.",
      "error"
    );
  } finally {
    elements.createQuestion.disabled = false;
  }
}

function resetFilters() {
  elements.filterSearch.value = "";
  elements.filterTour.value = "";
  elements.filterCuisine.value = "";
  elements.filterType.value = "";
  elements.filterDifficulty.value = "";
  elements.filterTheme.value = "";
  elements.filterSource.value = "";
  elements.filterQa.value = "";
  applyFilters();
}

async function loadPublicVersion() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    if (payload?.appVersion) {
      elements.appVersionLabel.textContent = payload.appVersion;
    }
  } catch (error) {
    // keep bundled version if health is temporarily unavailable
  }
}

async function loadContentPanel() {
  const [summary, questions, drafts] = await Promise.all([
    adminApi("/api/admin/content/summary"),
    adminApi("/api/admin/content/questions"),
    adminApi("/api/admin/content/drafts")
  ]);

  state.summary = summary;
  state.questions = questions;
  state.drafts = drafts || {};
  state.questionIssueMap = buildQuestionIssueMap(summary);
  if (state.selectedQuestionId && !state.questions.find((item) => item.id === state.selectedQuestionId)) {
    state.selectedQuestionId = "";
  }
  populateFilterControls();
  renderSummary();
  applyFilters();
}

function bindFilters() {
  [
    elements.filterTour,
    elements.filterCuisine,
    elements.filterType,
    elements.filterDifficulty,
    elements.filterTheme,
    elements.filterSource,
    elements.filterQa
  ].forEach((element) => element.addEventListener("change", applyFilters));

  elements.filterSearch.addEventListener("input", applyFilters);
  elements.filterReset.addEventListener("click", resetFilters);
}

function initNavigation() {
  if (elements.navMenuToggle) {
    elements.navMenuToggle.addEventListener("click", () => {
      const expanded = elements.navMenuToggle.getAttribute("aria-expanded") === "true";
      setNavDrawerOpen(!expanded);
    });
  }
  elements.navBack.addEventListener("click", goBackOrHome);
  elements.navTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    closeNavDrawer();
  });
  elements.navSummary.addEventListener("click", () => {
    elements.summarySection.scrollIntoView({ behavior: "smooth", block: "start" });
    closeNavDrawer();
  });
  elements.navQa.addEventListener("click", () => {
    elements.qaSection.scrollIntoView({ behavior: "smooth", block: "start" });
    closeNavDrawer();
  });
  elements.navEditor.addEventListener("click", () => {
    elements.editorSection.scrollIntoView({ behavior: "smooth", block: "start" });
    closeNavDrawer();
  });
  elements.navRefresh.addEventListener("click", async () => {
    try {
      showPanel();
      await loadContentPanel();
      showMessage(elements.note, "Панель банка заданий обновлена.", "success");
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        showLoginState();
      } else {
        showMessage(elements.note, error.message || "Не удалось обновить контентную панель.", "error");
      }
    }
    closeNavDrawer();
  });
}

async function init() {
  await loadPublicVersion();
  initNavigation();
  bindFilters();
  elements.saveDraft.addEventListener("click", saveDraft);
  elements.resetDraft.addEventListener("click", resetDraft);
  elements.exportDrafts.addEventListener("click", exportDrafts);
  elements.editQuestion.addEventListener("click", startEditingSelectedQuestion);
  elements.deleteQuestion.addEventListener("click", deleteSelectedQuestion);
  elements.createQuestion.addEventListener("click", createCustomQuestion);
  elements.resetCreator.addEventListener("click", resetCreatorForm);
  elements.cancelEdit.addEventListener("click", resetCreatorForm);
  resetCreatorForm();

  try {
    showPanel();
    await loadContentPanel();
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      showLoginState();
      return;
    }

    showPanel();
    showMessage(elements.note, error.message || "Не удалось загрузить банк заданий.", "error");
  }

  document.addEventListener("click", (event) => {
    if (!elements.navRibbon || !elements.navRibbon.classList.contains("is-open")) {
      return;
    }
    if (!elements.navRibbon.contains(event.target)) {
      closeNavDrawer();
    }
  });
  window.addEventListener("resize", () => {
    if (!isCompactNavigation()) {
      closeNavDrawer();
    }
  });
}

function renderQuestionList() {
  elements.questionList.innerHTML = "";
  const total = state.questions.length;
  const shown = state.filteredQuestions.length;
  const shownFlagged = state.filteredQuestions.filter((question) => getQuestionIssueInfo(question).issueCount > 0).length;
  elements.filterMeta.textContent = `показано ${shown} из ${total} • с сигналами ${shownFlagged}`;
  elements.draftMeta.textContent = `черновиков: ${Object.keys(state.drafts).length} • сигналов QA: ${state.summary?.qa?.flaggedQuestionsCount || 0}`;

  if (!shown) {
    elements.questionList.innerHTML = '<div class="muted">По текущим фильтрам вопросов не найдено.</div>';
    if (state.selectedQuestionId && !state.filteredQuestions.find((item) => item.id === state.selectedQuestionId)) {
      state.selectedQuestionId = "";
      renderQuestionDetail();
    }
    return;
  }

  state.filteredQuestions.forEach((question) => {
    const draft = state.drafts[question.id];
    const custom = isCustomQuestion(question);
    const issueInfo = getQuestionIssueInfo(question);
    const row = document.createElement("button");
    row.type = "button";
    row.className = `content-question-row${question.id === state.selectedQuestionId ? " is-selected" : ""}${issueInfo.issueCount ? " has-issues" : ""}${issueInfo.severity === "risk" ? " is-risk" : ""}`;
    const qaBadgeClass =
      issueInfo.severity === "risk"
        ? "pill qa-pill qa-pill-risk"
        : issueInfo.issueCount
          ? "pill qa-pill qa-pill-warning"
          : issueInfo.hasDraft
            ? "pill qa-pill qa-pill-draft"
            : "pill qa-pill qa-pill-clean";

    row.innerHTML = `
      <div class="content-question-top">
        <strong>${escapeHtml(question.id)}</strong>
        <div class="content-question-badges">
          <span class="pill">${escapeHtml(question.tourCode)}</span>
          ${custom ? '<span class="pill pill-accent">авторский</span>' : ""}
          <span class="${qaBadgeClass}">${escapeHtml(issueInfo.label)}</span>
        </div>
      </div>
      <div>${escapeHtml(shortText(question.prompt, 110))}</div>
      <div class="content-question-meta">
        <span>${escapeHtml(question.cuisineLabel)}</span>
        <span>${escapeHtml(question.typeLabel)}</span>
        <span>${escapeHtml(question.metadata.difficultyLabel)}</span>
        <span>${escapeHtml(question.sourceLabel || (custom ? "Авторский тест" : "Основной банк"))}</span>
        <span class="content-open-hint">Открыть</span>
        ${draft ? '<span class="pill">есть серверный черновик</span>' : ""}
      </div>
    `;
    row.addEventListener("click", () => {
      state.selectedQuestionId = question.id;
      renderQuestionList();
      renderQuestionDetail();
      openDetailModal();
    });
    elements.questionList.appendChild(row);
  });

  elements.openSelected.disabled = !state.selectedQuestionId;
  elements.openSelectedEmpty.disabled = !state.selectedQuestionId;
  renderQuestionDetail();
}

function startEditingSelectedQuestion() {
  const question = state.questions.find((item) => item.id === state.selectedQuestionId);
  if (!question || !isCustomQuestion(question)) {
    showMessage(elements.note, "Редактировать из конструктора можно только авторские тесты.", "warning");
    return;
  }

  fillCreatorFromQuestion(question);
  setCreatorMode("edit", question);
  hideMessage(elements.creatorNote);
  showMessage(elements.creatorNote, `Открыт режим редактирования теста ${question.id}.`, "success");
  closeDetailModal();
  openEditorModal();
}

async function createCustomQuestion() {
  const editing = state.creatorMode === "edit" && state.creatorEditingId;
  const requestPath = editing
    ? `/api/admin/content/questions/${encodeURIComponent(state.creatorEditingId)}`
    : "/api/admin/content/questions";
  const requestMethod = editing ? "PUT" : "POST";

  try {
    elements.createQuestion.disabled = true;
    hideMessage(elements.creatorNote);
    const payload = collectCreatorPayload();
    if (editing) {
      payload.id = state.creatorEditingId;
    }

    const question = await adminApi(requestPath, {
      method: requestMethod,
      body: JSON.stringify(payload)
    });

    const successMessage = editing
      ? `Тест ${question.id} обновлён в банке заданий.`
      : `Новый тест ${question.id} сохранён в банке заданий.`;
    showMessage(elements.creatorNote, successMessage, "success");
    resetCreatorForm();
    await loadContentPanel();
    state.selectedQuestionId = question.id;
    renderQuestionList();
    renderQuestionDetail();
    closeEditorModal();
    openDetailModal();
    showMessage(elements.note, successMessage, "success");
  } catch (error) {
    showMessage(
      elements.creatorNote,
      error.message || "Не удалось добавить новый тестовый вопрос.",
      "error"
    );
  } finally {
    elements.createQuestion.disabled = false;
  }
}

function initNavigation() {
  elements.navBack.addEventListener("click", goBackOrHome);
  elements.navTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  elements.navSummary.addEventListener("click", () => setContentView("summary"));
  elements.navQa.addEventListener("click", () => setContentView("qa"));
  elements.navEditor.addEventListener("click", () => setContentView("editor"));
  elements.navRefresh.addEventListener("click", async () => {
    try {
      showPanel();
      await loadContentPanel();
      showMessage(elements.note, "Панель банка заданий обновлена.", "success");
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        showLoginState();
      } else {
        showMessage(elements.note, error.message || "Не удалось обновить контентную панель.", "error");
      }
    }
  });
  elements.openCatalog.addEventListener("click", () => setContentView("editor"));
  elements.openSummary.addEventListener("click", () => setContentView("summary"));
  elements.openQa.addEventListener("click", () => setContentView("qa"));
  elements.openCreateTop.addEventListener("click", () => {
    setContentView("editor");
    resetCreatorForm();
    openEditorModal();
  });
  elements.openCreate.addEventListener("click", () => {
    setContentView("editor", { scroll: false });
    resetCreatorForm();
    openEditorModal();
  });
  elements.openCreateEmpty.addEventListener("click", () => {
    setContentView("editor", { scroll: false });
    resetCreatorForm();
    openEditorModal();
  });
  [elements.openSelected, elements.openSelectedEmpty].forEach((button) =>
    button.addEventListener("click", openDetailModal)
  );
  elements.closeDetail.addEventListener("click", closeDetailModal);
  elements.closeEditor.addEventListener("click", closeEditorModal);
  document.querySelectorAll("[data-close-overlay]").forEach((element) => {
    element.addEventListener("click", () => {
      closeDetailModal();
      closeEditorModal();
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDetailModal();
      closeEditorModal();
    }
  });
}

async function init() {
  await loadPublicVersion();
  initNavigation();
  bindFilters();
  elements.saveDraft.addEventListener("click", saveDraft);
  elements.resetDraft.addEventListener("click", resetDraft);
  elements.exportDrafts.addEventListener("click", exportDrafts);
  elements.editQuestion.addEventListener("click", startEditingSelectedQuestion);
  elements.deleteQuestion.addEventListener("click", deleteSelectedQuestion);
  elements.createQuestion.addEventListener("click", createCustomQuestion);
  elements.resetCreator.addEventListener("click", resetCreatorForm);
  elements.cancelEdit.addEventListener("click", () => {
    resetCreatorForm();
    closeEditorModal();
  });
  resetCreatorForm();

  try {
    await ensureAdminSession();
    showPanel();
    setContentView("editor", { scroll: false });
    await loadContentPanel();
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      showLoginState();
      return;
    }

    showPanel();
    showMessage(elements.note, error.message || "Не удалось загрузить банк заданий.", "error");
  }
}

init();
