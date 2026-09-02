const state = {
  token: "",
  summary: null,
  questions: [],
  filteredQuestions: [],
  questionIssueMap: {},
  selectedQuestionId: "",
  creatorMode: "create",
  creatorEditingId: "",
  creatorStep: "structure",
  drafts: {},
  draftRequestState: "idle",
  currentView: "editor",
  detailOpen: false,
  editorOpen: false,
  importOpen: false,
  parsedImportItems: [],
  importPreview: null,
  page: 1,
  pageSize: 10,
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
  openImportTop: document.getElementById("content-open-import-top"),
  openCreate: document.getElementById("content-open-create"),
  openImport: document.getElementById("content-open-import"),
  openSelected: document.getElementById("content-open-selected"),
  openSelectedEmpty: document.getElementById("content-open-selected-empty"),
  openCreateEmpty: document.getElementById("content-open-create-empty"),
  openImportEmpty: document.getElementById("content-open-import-empty"),
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
  pageMeta: document.getElementById("content-page-meta"),
  pagePrev: document.getElementById("content-page-prev"),
  pageNext: document.getElementById("content-page-next"),
  questionList: document.getElementById("content-question-list"),
  sideStatus: document.getElementById("content-side-status"),
  sideEmpty: document.getElementById("content-side-empty"),
  sideDetail: document.getElementById("content-side-detail"),
  sideHead: document.getElementById("content-side-head"),
  sideMeta: document.getElementById("content-side-meta"),
  sideOptions: document.getElementById("content-side-options"),
  sideQa: document.getElementById("content-side-qa"),
  sidePrev: document.getElementById("content-side-prev"),
  sideNext: document.getElementById("content-side-next"),
  sideEdit: document.getElementById("content-side-edit"),
  detailModal: document.getElementById("content-detail-modal"),
  editorModal: document.getElementById("content-editor-modal"),
  importModal: document.getElementById("content-import-modal"),
  closeDetail: document.getElementById("content-close-detail"),
  closeEditor: document.getElementById("content-close-editor"),
  closeImport: document.getElementById("content-close-import"),
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
  creatorStepper: document.getElementById("content-creator-stepper"),
  creatorPrev: document.getElementById("content-creator-prev"),
  creatorNext: document.getElementById("content-creator-next"),
  creatorStepLabel: document.getElementById("content-creator-step-label"),
  creatorPreviewCard: document.getElementById("creator-preview-card"),
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
  importDefaultTour: document.getElementById("import-default-tour"),
  importDefaultCuisine: document.getElementById("import-default-cuisine"),
  importDefaultDifficulty: document.getElementById("import-default-difficulty"),
  importDefaultTheme: document.getElementById("import-default-theme"),
  importText: document.getElementById("content-import-text"),
  importNote: document.getElementById("content-import-note"),
  parseImport: document.getElementById("content-parse-import"),
  applyImport: document.getElementById("content-apply-import"),
  importMeta: document.getElementById("content-import-meta"),
  importPreview: document.getElementById("content-import-preview"),
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
    elements.navMenuToggle.textContent = nextState ? " " : "";
  }
}

function closeNavDrawer() {
  setNavDrawerOpen(false);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js?v=1.6.85");
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      registration.update().catch(() => {});
    }
  } catch (error) {
    // Content panel stays functional even without service worker support.
  }
}

const QA_CATEGORY_LABELS = {
  metadata: "",
  distractors: " ",
  translation: "",
  duplicate: ""
};

const CREATOR_STEPS = [
  { id: "structure", label: "Шаг 1 из 4" },
  { id: "answers", label: "Шаг 2 из 4" },
  { id: "metadata", label: "Шаг 3 из 4" },
  { id: "preview", label: "Шаг 4 из 4" }
];

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
        const error = new Error(payload.message || `  (${response.status}).`);
        error.status = response.status;
        throw error;
      }

      return payload.data;
    })
    .catch((error) => {
      if (error.status) {
        throw error;
      }

      const wrapped = new Error("     .");
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
    const error = new Error(payload.message || `   (${response.status}).`);
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
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
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
  return `${text.slice(0, max - 1)}`;
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
      label: hasDraft ? "  " : " ",
      hasDraft
    };
  }

  return {
    issueCount: issue.issueCount || 0,
    issues: issue.issues || [],
    categories: issue.categories || [],
    severity: issue.severity === "risk" ? "risk" : "warning",
    label: issue.severity === "risk" ? " " : "  QA",
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
  const overlayOpen = state.detailOpen || state.editorOpen || state.importOpen;
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
    showMessage(elements.creatorNote, "    .", "warning");
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

function closeImportModal() {
  state.importOpen = false;
  elements.importModal.classList.add("hidden");
  syncBodyOverlayState();
}

function openImportModal() {
  state.importOpen = true;
  elements.importModal.classList.remove("hidden");
  syncBodyOverlayState();
}

function setCreatorStep(stepId) {
  if (!CREATOR_STEPS.find((step) => step.id === stepId)) {
    return;
  }

  state.creatorStep = stepId;
  const currentIndex = CREATOR_STEPS.findIndex((step) => step.id === stepId);
  const panels = document.querySelectorAll("[data-creator-step-panel]");
  const buttons = document.querySelectorAll("[data-creator-step]");

  panels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.creatorStepPanel !== stepId);
  });

  buttons.forEach((button, index) => {
    const active = button.dataset.creatorStep === stepId;
    button.classList.toggle("is-active", active);
    button.classList.toggle("is-complete", index < currentIndex);
  });

  if (elements.creatorStepLabel) {
    elements.creatorStepLabel.textContent = CREATOR_STEPS[currentIndex].label;
  }
  if (elements.creatorPrev) {
    elements.creatorPrev.disabled = currentIndex === 0;
  }
  if (elements.creatorNext) {
    elements.creatorNext.textContent = currentIndex === CREATOR_STEPS.length - 1 ? "К шагу 1" : "Далее";
  }

  renderCreatorPreview();
}

function stepCreator(delta) {
  const currentIndex = CREATOR_STEPS.findIndex((step) => step.id === state.creatorStep);
  if (currentIndex === -1) {
    setCreatorStep("structure");
    return;
  }
  if (delta > 0 && currentIndex === CREATOR_STEPS.length - 1) {
    setCreatorStep("structure");
    return;
  }
  const nextIndex = Math.max(0, Math.min(CREATOR_STEPS.length - 1, currentIndex + delta));
  setCreatorStep(CREATOR_STEPS[nextIndex].id);
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
  elements.generatedAt.textContent = ` ${formatDateTime(summary.generatedAt)}`;

  renderCoverageList(elements.coverageTours, summary.tours, "     .");
  renderCoverageList(elements.coverageCuisines, summary.cuisines, "   .");
  renderCoverageList(elements.coverageTypes, summary.types, "    .");
  renderCoverageList(
    elements.coverageDifficulties,
    summary.difficulties,
    "    ."
  );
  renderCoverageList(elements.coverageThemes, summary.themes.slice(0, 10), "   .");
  renderCoverageList(elements.coverageOk, summary.okCoverage, "   .");
  renderCoverageList(elements.coveragePk, summary.pkCoverage, "    .");

  elements.balance.innerHTML = `
    <div class="coverage-item"><span>  </span><strong>${summary.qa.balance.cuisineSpread}</strong></div>
    <div class="coverage-item"><span>   </span><strong>${summary.qa.balance.maxCuisineCount}</strong></div>
    <div class="coverage-item"><span>   </span><strong>${summary.qa.balance.minCuisineCount}</strong></div>
  `;

  elements.qaSummaryBadge.textContent = `: ${summary.qa.flaggedQuestionsCount || 0} `;

  renderQaList(
    elements.qaDuplicates,
    summary.qa.duplicatePrompts,
    (item) => `
      <article class="qa-item">
        <strong>${escapeHtml(shortText(item.prompt, 90))}</strong>
        <div class="muted">${escapeHtml(item.questionIds.join(", "))}</div>
      </article>
    `,
    "     ."
  );

  renderQaList(
    elements.qaMetadata,
    summary.qa.missingMetadata,
    (item) => `
      <article class="qa-item">
        <strong>${escapeHtml(item.id)}</strong>
        <div>${escapeHtml(shortText(item.prompt, 90))}</div>
        <div class="muted">: ${escapeHtml(item.fields.join(", "))}</div>
      </article>
    `,
    "    ."
  );

  renderQaList(
    elements.qaDistractors,
    summary.qa.weakDistractors,
    (item) => `
      <article class="qa-item">
        <strong>${escapeHtml(item.id)}</strong>
        <div>${escapeHtml(shortText(item.prompt, 90))}</div>
        <div class="muted">${escapeHtml(item.issues.join("  "))}</div>
      </article>
    `,
    " distractors   ."
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
    "    ."
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
    elements.creatorModeBadge.textContent = `:  ${question.id}`;
    elements.createQuestion.textContent = " ";
    elements.cancelEdit.classList.remove("hidden");
    elements.creatorModeBadge.classList.add("pill-accent");
    return;
  }

  elements.creatorModeBadge.textContent = ":  ";
  elements.createQuestion.textContent = " ";
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
    ? '<span class="pill pill-accent"> </span>'
    : '<span class="pill"> </span>';
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
    <strong>${escapeHtml(question.id)}  ${escapeHtml(question.tourCode)}  ${escapeHtml(question.typeLabel)}</strong> ${sourceBadge} ${qaBadge}<br />
    <span class="muted">${escapeHtml(question.cuisineLabel)}  ${escapeHtml(question.cuisineGroupLabel)}</span><br />
    <span class="muted">${escapeHtml(question.dishLabel || question.caseTitle || "  ")}</span><br />
    <span class="muted">${escapeHtml(question.prompt)}</span>
  `;

  if (Array.isArray(question.options) && question.options.length) {
    const optionsMarkup = question.options
      .map(
        (option) =>
          `<li>${escapeHtml(option.text)}${option.isCorrect ? ' <span class="pill"></span>' : ""}</li>`
      )
      .join("");
    elements.detailHead.innerHTML += `<div class="content-option-preview"><strong>:</strong><ul class="flat-list">${optionsMarkup}</ul></div>`;
  }

  elements.detailMetrics.innerHTML = `
    <article class="detail-metric">
      <span class="muted"></span>
      <strong>${escapeHtml(question.sourceLabel || (custom ? " " : " "))}</strong>
    </article>
    <article class="detail-metric">
      <span class="muted"> </span>
      <strong>${Number(merged.metadata.estimatedTimeSec || 0)} </strong>
    </article>
    <article class="detail-metric">
      <span class="muted"> </span>
      <strong>${escapeHtml((merged.metadata.okCodes || []).join(", ") || " ")}</strong>
    </article>
    <article class="detail-metric">
      <span class="muted">. </span>
      <strong>${escapeHtml((merged.metadata.pkFocus || []).join(", ") || " ")}</strong>
    </article>
  `;

  const categoryBadges = issueInfo.categories.length
    ? issueInfo.categories
        .map((category) => `<span class="pill qa-pill">${escapeHtml(formatQaCategoryLabel(category))}</span>`)
        .join("")
    : '<span class="pill qa-pill qa-pill-clean">QA  </span>';
  const issueListMarkup = issueInfo.issues.length
    ? `<ul class="qa-signal-list">${issueInfo.issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>`
    : '<div class="muted">    QA-  .</div>';
  const draftNote = issueInfo.hasDraft
    ? '<div class="detail-qa-note">  .        .</div>'
    : "";

  elements.detailQa.innerHTML = `
    <div class="section-row">
      <h4> QA </h4>
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
  renderSideQuestionCard(question, merged, issueInfo, custom);
}

function renderSideQuestionCard(question, merged, issueInfo, custom) {
  if (!question) {
    elements.sideStatus.textContent = "ничего не выбрано";
    elements.sideEmpty.classList.remove("hidden");
    elements.sideDetail.classList.add("hidden");
    elements.sideEdit.disabled = true;
    elements.sidePrev.disabled = true;
    elements.sideNext.disabled = true;
    return;
  }

  const selectedIndex = state.filteredQuestions.findIndex((item) => item.id === question.id);
  const optionsMarkup = Array.isArray(question.options) && question.options.length
    ? `<ul class="flat-list">${question.options
        .map((option) => `<li>${escapeHtml(option.text)}${option.isCorrect ? ' <span class="pill pill-accent">ключ</span>' : ""}</li>`)
        .join("")}</ul>`
    : '<div class="muted">Для этого типа вопроса список вариантов не отображается.</div>';
  const issueMarkup = issueInfo.issueCount
    ? `<ul class="qa-signal-list">${issueInfo.issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>`
    : '<div class="muted">Сигналов QA по этому вопросу сейчас нет.</div>';

  elements.sideStatus.textContent = `${selectedIndex + 1} из ${state.filteredQuestions.length}`;
  elements.sideEmpty.classList.add("hidden");
  elements.sideDetail.classList.remove("hidden");
  elements.sideHead.innerHTML = `
    <strong>${escapeHtml(question.id)} • ${escapeHtml(question.tourCode)} • ${escapeHtml(question.typeLabel)}</strong>
    <div class="muted">${escapeHtml(question.dishLabel || question.caseTitle || "Без отдельного названия")}</div>
    <div>${escapeHtml(question.prompt)}</div>
  `;
  elements.sideMeta.innerHTML = `
    <div class="coverage-item"><span>Кухня</span><strong>${escapeHtml(question.cuisineLabel)}</strong></div>
    <div class="coverage-item"><span>Сложность</span><strong>${escapeHtml(question.metadata.difficultyLabel)}</strong></div>
    <div class="coverage-item"><span>Источник</span><strong>${escapeHtml(question.sourceLabel || (custom ? "Авторский тест" : "Основной банк"))}</strong></div>
    <div class="coverage-item"><span>ОК</span><strong>${escapeHtml((merged.metadata.okCodes || []).join(", ") || "не указаны")}</strong></div>
  `;
  elements.sideOptions.innerHTML = `
    <h4>Варианты ответа</h4>
    ${optionsMarkup}
  `;
  elements.sideQa.innerHTML = `
    <h4>Сигналы QA</h4>
    ${issueMarkup}
  `;
  elements.sideEdit.disabled = !custom;
  elements.sidePrev.disabled = selectedIndex <= 0;
  elements.sideNext.disabled = selectedIndex === -1 || selectedIndex >= state.filteredQuestions.length - 1;
}

function goToRelativeQuestion(step) {
  const currentIndex = state.filteredQuestions.findIndex((item) => item.id === state.selectedQuestionId);
  if (currentIndex === -1) {
    return;
  }
  const nextIndex = currentIndex + step;
  if (nextIndex < 0 || nextIndex >= state.filteredQuestions.length) {
    return;
  }
  state.selectedQuestionId = state.filteredQuestions[nextIndex].id;
  renderQuestionList();
  renderQuestionDetail();
}

function renderQuestionList() {
  elements.questionList.innerHTML = "";
  const total = state.questions.length;
  const shown = state.filteredQuestions.length;
  const shownFlagged = state.filteredQuestions.filter((question) => getQuestionIssueInfo(question).issueCount > 0).length;
  elements.filterMeta.textContent = ` ${shown}  ${total}    ${shownFlagged}`;
  elements.draftMeta.textContent = `: ${Object.keys(state.drafts).length}   QA: ${state.summary?.qa?.flaggedQuestionsCount || 0}`;

  if (!shown) {
    elements.questionList.innerHTML = '<div class="muted">     .</div>';
    if (state.selectedQuestionId && !state.filteredQuestions.find((item) => item.id === state.selectedQuestionId)) {
      state.selectedQuestionId = "";
      renderQuestionDetail();
    }
    elements.openSelected.disabled = true;
    elements.openSelectedEmpty.disabled = true;
    elements.pageMeta.textContent = "страница 0";
    renderSideQuestionCard(null);
    return;
  }

  const selectedIndex = state.filteredQuestions.findIndex((item) => item.id === state.selectedQuestionId);
  const totalPages = Math.max(1, Math.ceil(shown / state.pageSize));
  if (selectedIndex >= 0) {
    state.page = Math.floor(selectedIndex / state.pageSize) + 1;
  }
  state.page = Math.min(Math.max(1, state.page), totalPages);
  const startIndex = (state.page - 1) * state.pageSize;
  const pageItems = state.filteredQuestions.slice(startIndex, startIndex + state.pageSize);
  elements.pageMeta.textContent = `страница ${state.page} из ${totalPages}`;
  elements.pagePrev.disabled = state.page === 1;
  elements.pageNext.disabled = state.page >= totalPages;

  if (!state.selectedQuestionId || !state.filteredQuestions.find((item) => item.id === state.selectedQuestionId)) {
    state.selectedQuestionId = pageItems[0]?.id || state.filteredQuestions[0].id;
  }

  pageItems.forEach((question) => {
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
          ${custom ? '<span class="pill pill-accent"></span>' : ""}
          <span class="${qaBadgeClass}">${escapeHtml(issueInfo.label)}</span>
        </div>
      </div>
      <div>${escapeHtml(shortText(question.prompt, 110))}</div>
      <div class="content-question-meta">
        <span>${escapeHtml(question.cuisineLabel)}</span>
        <span>${escapeHtml(question.typeLabel)}</span>
        <span>${escapeHtml(question.metadata.difficultyLabel)}</span>
        <span>${escapeHtml(question.sourceLabel || (custom ? " " : " "))}</span>
        ${draft ? '<span class="pill">  </span>' : ""}
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
    state.selectedQuestionId = pageItems[0]?.id || state.filteredQuestions[0].id;
  }

  elements.openSelected.disabled = false;
  elements.openSelectedEmpty.disabled = false;
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

  state.page = 1;
  renderQuestionList();
}

function populateFilterControls() {
  fillSelect(elements.filterTour, " ", state.summary?.catalogs?.tours || []);
  fillSelect(elements.filterCuisine, " ", state.summary?.catalogs?.cuisines || []);
  fillSelect(elements.filterType, " ", state.summary?.catalogs?.types || []);
  fillSelect(elements.filterDifficulty, " ", state.summary?.catalogs?.difficulties || []);
  fillSelect(elements.filterTheme, " ", state.summary?.catalogs?.themes || []);
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
    showMessage(elements.note, "   .     .", "success");
    renderQuestionList();
    renderQuestionDetail();
  } catch (error) {
    showMessage(elements.note, error.message || "     .", "error");
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
    showMessage(elements.note, "  .    .", "success");
    renderQuestionList();
    renderQuestionDetail();
  } catch (error) {
    showMessage(elements.note, error.message || "    .", "error");
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

function renderCreatorPreview() {
  if (!elements.creatorPreviewCard) {
    return;
  }

  const payload = collectCreatorPayload();
  const correctIndex = payload.options.findIndex((option) => option.isCorrect);
  const optionsMarkup = payload.options
    .filter((option) => option.text)
    .map(
      (option, index) =>
        `<li>${escapeHtml(option.text)}${index === correctIndex ? ' <span class="pill pill-accent">правильный ответ</span>' : ""}</li>`
    )
    .join("");

  elements.creatorPreviewCard.innerHTML = `
    <div class="creator-preview-head">
      <strong>${escapeHtml(payload.tourCode)} • ${escapeHtml(payload.dishLabel || payload.theme || "Новый тест")}</strong>
      <div class="content-question-badges">
        <span class="pill">${escapeHtml(payload.cuisine)}</span>
        <span class="pill">${escapeHtml(payload.difficulty)}</span>
      </div>
    </div>
    <h4>${escapeHtml(payload.prompt || "Формулировка вопроса появится здесь после заполнения")}</h4>
    <p class="muted">${escapeHtml(payload.scenario || "Добавьте краткий контекст, если он нужен для понимания вопроса.")}</p>
    <div class="creator-preview-grid">
      <div>
        <span class="muted">Тема</span>
        <strong>${escapeHtml(payload.theme || "не указана")}</strong>
      </div>
      <div>
        <span class="muted">Подтема</span>
        <strong>${escapeHtml(payload.topic || "не указана")}</strong>
      </div>
      <div>
        <span class="muted">Фокус</span>
        <strong>${escapeHtml(payload.focus || "не указан")}</strong>
      </div>
      <div>
        <span class="muted">ОК</span>
        <strong>${escapeHtml(payload.okCodes || "не указаны")}</strong>
      </div>
    </div>
    <div class="creator-preview-options">
      <strong>Варианты ответа</strong>
      ${
        optionsMarkup
          ? `<ul class="flat-list">${optionsMarkup}</ul>`
          : '<div class="muted">Добавьте минимум четыре варианта ответа, чтобы увидеть полноценный предпросмотр.</div>'
      }
    </div>
    <div class="creator-preview-note">
      <span class="muted">Методическое назначение</span>
      <p>${escapeHtml(payload.methodicalPurpose || "Можно заполнить позже, но лучше сразу зафиксировать, что именно проверяет вопрос.")}</p>
    </div>
  `;
}

function parseCorrectAnswerToken(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/^вариант\s+/i, "")
    .replace(/^ответ\s+/i, "")
    .replace(/[().]/g, "")
    .trim();

  const letterMap = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
    E: 4,
    А: 0,
    Б: 1,
    В: 2,
    Г: 3,
    Д: 4
  };

  if (letterMap[normalized.toUpperCase()] !== undefined) {
    return { type: "index", value: letterMap[normalized.toUpperCase()] };
  }

  const numberMatch = normalized.match(/^\d+$/);
  if (numberMatch) {
    return { type: "index", value: Number(normalized) - 1 };
  }

  return { type: "text", value: normalized.toLowerCase() };
}

function parseQuestionBlock(block, defaults, index) {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const meta = {
    tourCode: defaults.tourCode,
    cuisine: defaults.cuisine,
    difficulty: defaults.difficulty,
    theme: defaults.theme
  };

  const contentLines = [];
  lines.forEach((line) => {
    const metaMatch = line.match(/^(Тур|Кухня|Сложность|Тема)\s*:\s*(.+)$/i);
    if (metaMatch) {
      const [, key, value] = metaMatch;
      const normalizedKey = key.toLowerCase();
      if (normalizedKey === "тур") meta.tourCode = value.trim().toUpperCase();
      if (normalizedKey === "кухня") meta.cuisine = value.trim().toLowerCase();
      if (normalizedKey === "сложность") meta.difficulty = value.trim().toLowerCase();
      if (normalizedKey === "тема") meta.theme = value.trim();
      return;
    }
    contentLines.push(line);
  });

  let prompt = "";
  const options = [];
  let explicitAnswer = null;

  contentLines.forEach((line) => {
    const answerMatch = line.match(/^(Ответ|Правильный ответ)\s*:\s*(.+)$/i);
    if (answerMatch) {
      explicitAnswer = parseCorrectAnswerToken(answerMatch[2]);
      return;
    }

    const starredMatch = line.match(/^[*★]\s+(.+)$/);
    if (starredMatch) {
      options.push({ text: starredMatch[1].trim(), isCorrect: true });
      return;
    }

    const optionMatch = line.match(/^(?:[A-Za-zА-Яа-я]\)|[A-Za-zА-Яа-я]\.|[0-9]+\)|[0-9]+\.|[-•–])\s*(.+)$/);
    if (optionMatch) {
      options.push({ text: optionMatch[1].trim(), isCorrect: false });
      return;
    }

    if (!prompt) {
      prompt = line.replace(/^\d+[.)]\s*/, "").trim();
      return;
    }

    prompt = `${prompt} ${line}`.trim();
  });

  if (explicitAnswer) {
    if (explicitAnswer.type === "index" && options[explicitAnswer.value]) {
      options[explicitAnswer.value].isCorrect = true;
    } else if (explicitAnswer.type === "text") {
      const matched = options.find((option) => option.text.toLowerCase() === explicitAnswer.value);
      if (matched) {
        matched.isCorrect = true;
      }
    }
  }

  const errors = [];
  if (!prompt) {
    errors.push("не удалось определить формулировку вопроса");
  }
  if (options.length < 4) {
    errors.push("найдено меньше четырёх вариантов ответа");
  }
  if (options.filter((option) => option.isCorrect).length !== 1) {
    errors.push("не удалось определить ровно один правильный ответ");
  }

  const theme = meta.theme || defaults.theme || `Импортированный блок ${index + 1}`;
  const dishLabel = prompt ? prompt.slice(0, 72) : `Импортированный вопрос ${index + 1}`;

  return {
    valid: errors.length === 0,
    errors,
    payload: {
      tourCode: ["T1", "T4"].includes(meta.tourCode) ? meta.tourCode : defaults.tourCode,
      cuisine: meta.cuisine || defaults.cuisine,
      difficulty: ["basic", "standard", "advanced"].includes(meta.difficulty) ? meta.difficulty : defaults.difficulty,
      theme,
      topic: dishLabel,
      dishLabel,
      prompt,
      scenario: "",
      note: "Импортировано списком",
      focus: "",
      okCodes: "",
      pkFocus: "",
      methodicalPurpose: "Автоматически импортированный тестовый вопрос",
      options
    }
  };
}

function parseImportText(rawText, defaults) {
  const blocks = String(rawText || "")
    .replace(/\r/g, "")
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  const parsed = blocks.map((block, index) => parseQuestionBlock(block, defaults, index));
  return {
    totalBlocks: blocks.length,
    items: parsed,
    validItems: parsed.filter((item) => item.valid),
    invalidItems: parsed.filter((item) => !item.valid)
  };
}

function renderImportPreview() {
  const result = state.importPreview;
  if (!result) {
    elements.importMeta.textContent = "ещё не проверено";
    elements.importPreview.innerHTML =
      '<div class="muted">После проверки здесь появятся найденные вопросы, правильные ответы и замечания по блокам.</div>';
    elements.applyImport.disabled = true;
    return;
  }

  elements.importMeta.textContent = `распознано ${result.validItems.length} из ${result.totalBlocks}`;
  elements.applyImport.disabled = result.validItems.length === 0;
  elements.importPreview.innerHTML = result.items
    .map((item, index) => {
      const options = item.payload.options
        .map(
          (option) =>
            `<li>${escapeHtml(option.text)}${option.isCorrect ? ' <span class="pill pill-accent">ключ</span>' : ""}</li>`
        )
        .join("");
      const errors = item.errors.length
        ? `<div class="import-issue-list">${item.errors.map((error) => `<div>• ${escapeHtml(error)}</div>`).join("")}</div>`
        : '<div class="import-ok">Блок готов к сохранению.</div>';

      return `
        <article class="import-preview-item${item.valid ? "" : " has-errors"}">
          <div class="section-row">
            <strong>Блок ${index + 1}</strong>
            <span class="pill ${item.valid ? "qa-pill-clean" : "qa-pill-warning"}">${item.valid ? "готов" : "нужна правка"}</span>
          </div>
          <div class="import-preview-question">${escapeHtml(item.payload.prompt || "Вопрос не распознан")}</div>
          <div class="muted">Тур: ${escapeHtml(item.payload.tourCode)} • Кухня: ${escapeHtml(item.payload.cuisine)} • Сложность: ${escapeHtml(item.payload.difficulty)}</div>
          <ul class="flat-list">${options}</ul>
          ${errors}
        </article>
      `;
    })
    .join("");
}

function resetImportState() {
  state.importPreview = null;
  state.parsedImportItems = [];
  elements.importText.value = "";
  hideMessage(elements.importNote);
  renderImportPreview();
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
  setCreatorStep("structure");
  hideMessage(elements.creatorNote);
}

function getImportDefaults() {
  return {
    tourCode: elements.importDefaultTour.value || "T1",
    cuisine: elements.importDefaultCuisine.value || "mixed",
    difficulty: elements.importDefaultDifficulty.value || "basic",
    theme: elements.importDefaultTheme.value.trim()
  };
}

async function handleParseImport() {
  const rawText = elements.importText.value.trim();
  if (!rawText) {
    state.importPreview = null;
    state.parsedImportItems = [];
    renderImportPreview();
    showMessage(elements.importNote, "Вставьте список вопросов, прежде чем запускать проверку.", "warning");
    return;
  }

  hideMessage(elements.importNote);
  const result = parseImportText(rawText, getImportDefaults());
  state.importPreview = result;
  state.parsedImportItems = result.validItems.map((item) => item.payload);
  renderImportPreview();

  if (result.validItems.length === result.totalBlocks) {
    showMessage(elements.importNote, `Готово: распознано ${result.validItems.length} вопросов без замечаний.`, "success");
    return;
  }

  if (!result.validItems.length) {
    showMessage(elements.importNote, "Ни один блок не прошёл проверку. Исправьте замечания в предпросмотре и попробуйте снова.", "warning");
    return;
  }

  showMessage(
    elements.importNote,
    `Распознано ${result.validItems.length} из ${result.totalBlocks}. Некорректные блоки подсвечены ниже.`,
    "warning"
  );
}

async function applyImportBatch() {
  if (!state.importPreview || !state.importPreview.validItems.length) {
    showMessage(elements.importNote, "Сначала проверьте список и убедитесь, что есть готовые к сохранению блоки.", "warning");
    return;
  }

  const validItems = state.importPreview.validItems;
  const createdIds = [];
  const errors = [];

  elements.parseImport.disabled = true;
  elements.applyImport.disabled = true;
  hideMessage(elements.importNote);

  try {
    for (let index = 0; index < validItems.length; index += 1) {
      const item = validItems[index];
      try {
        const question = await adminApi("/api/admin/content/questions", {
          method: "POST",
          body: JSON.stringify(item.payload)
        });
        createdIds.push(question.id);
      } catch (error) {
        errors.push(`Блок ${index + 1}: ${error.message || "не удалось сохранить вопрос"}`);
      }
    }

    await loadContentPanel();
    if (createdIds.length) {
      state.selectedQuestionId = createdIds[createdIds.length - 1];
      renderQuestionList();
      renderQuestionDetail();
    }

    if (!errors.length) {
      closeImportModal();
      resetImportState();
      showMessage(
        elements.note,
        `Импорт завершён: добавлено ${createdIds.length} вопросов.`,
        "success"
      );
      return;
    }

    showMessage(
      elements.importNote,
      `Часть вопросов сохранена (${createdIds.length}), но есть ошибки: ${errors.join(" | ")}`,
      "warning"
    );
  } finally {
    elements.parseImport.disabled = false;
    renderImportPreview();
  }
}

function openCreateFlow() {
  setContentView("editor", { scroll: false });
  resetCreatorForm();
  openEditorModal();
}

function openImportFlow() {
  setContentView("editor", { scroll: false });
  resetImportState();
  openImportModal();
}

function startEditingSelectedQuestion() {
  const question = state.questions.find((item) => item.id === state.selectedQuestionId);
  if (!question || !isCustomQuestion(question)) {
    showMessage(elements.note, "Выберите авторский вопрос, который можно редактировать.", "warning");
    return;
  }

  fillCreatorFromQuestion(question);
  setCreatorMode("edit", question);
  setCreatorStep("structure");
  hideMessage(elements.creatorNote);
  showMessage(elements.creatorNote, `Открыт режим редактирования вопроса ${question.id}.`, "success");
  closeDetailModal();
  openEditorModal();
}

async function deleteSelectedQuestion() {
  const question = state.questions.find((item) => item.id === state.selectedQuestionId);
  if (!question || !isCustomQuestion(question)) {
    showMessage(elements.note, "Можно удалить только авторский вопрос.", "warning");
    return;
  }

  const confirmed = window.confirm(`Удалить вопрос ${question.id}? Это действие нельзя отменить.`);
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
    closeDetailModal();
    showMessage(elements.creatorNote, `Вопрос ${question.id} удалён из банка.`, "success");
    showMessage(elements.note, `Вопрос ${question.id} удалён из банка.`, "success");
  } catch (error) {
    showMessage(elements.note, error.message || "Не удалось удалить вопрос.", "error");
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
      ? `Вопрос ${question.id} обновлён и сохранён.`
      : `Новый вопрос ${question.id} добавлен в банк.`;
    showMessage(
      elements.creatorNote,
      successMessage,
      "success"
    );
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
      error.message || "Не удалось сохранить вопрос.",
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

function bindCreatorInputs() {
  const inputLike = [
    elements.creatorDishLabel,
    elements.creatorPrompt,
    elements.creatorScenario,
    elements.creatorNoteInput,
    elements.creatorOption1,
    elements.creatorOption2,
    elements.creatorOption3,
    elements.creatorOption4,
    elements.creatorTheme,
    elements.creatorTopic,
    elements.creatorFocus,
    elements.creatorOkCodes,
    elements.creatorPkFocus,
    elements.creatorMethodicalPurpose
  ];

  const changeLike = [
    elements.creatorTour,
    elements.creatorCuisine,
    elements.creatorDifficulty,
    elements.creatorCorrect1,
    elements.creatorCorrect2,
    elements.creatorCorrect3,
    elements.creatorCorrect4
  ];

  inputLike.forEach((element) => element?.addEventListener("input", renderCreatorPreview));
  changeLike.forEach((element) => element?.addEventListener("change", renderCreatorPreview));
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
    setContentView("summary");
    closeNavDrawer();
  });
  elements.navQa.addEventListener("click", () => {
    setContentView("qa");
    closeNavDrawer();
  });
  elements.navEditor.addEventListener("click", () => {
    setContentView("editor");
    closeNavDrawer();
  });
  elements.navRefresh.addEventListener("click", async () => {
    try {
      showPanel();
      await loadContentPanel();
      showMessage(elements.note, "Список вопросов и сводка обновлены.", "success");
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        showLoginState();
      } else {
        showMessage(elements.note, error.message || "Не удалось обновить банк заданий.", "error");
      }
    }
    closeNavDrawer();
  });

  elements.openCatalog.addEventListener("click", () => setContentView("editor"));
  elements.openSummary.addEventListener("click", () => setContentView("summary"));
  elements.openQa.addEventListener("click", () => setContentView("qa"));
  elements.openCreateTop.addEventListener("click", openCreateFlow);
  elements.openCreate.addEventListener("click", openCreateFlow);
  elements.openCreateEmpty.addEventListener("click", openCreateFlow);
  elements.openImportTop.addEventListener("click", openImportFlow);
  elements.openImport.addEventListener("click", openImportFlow);
  elements.openImportEmpty.addEventListener("click", openImportFlow);
  [elements.openSelected, elements.openSelectedEmpty].forEach((button) => {
    button.addEventListener("click", openDetailModal);
  });
  elements.pagePrev.addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      renderQuestionList();
    }
  });
  elements.pageNext.addEventListener("click", () => {
    state.page += 1;
    renderQuestionList();
  });
  elements.sidePrev.addEventListener("click", () => goToRelativeQuestion(-1));
  elements.sideNext.addEventListener("click", () => goToRelativeQuestion(1));
  elements.sideEdit.addEventListener("click", startEditingSelectedQuestion);

  elements.closeDetail.addEventListener("click", closeDetailModal);
  elements.closeEditor.addEventListener("click", closeEditorModal);
  elements.closeImport.addEventListener("click", closeImportModal);

  document.querySelectorAll("[data-close-overlay]").forEach((element) => {
    element.addEventListener("click", () => {
      closeDetailModal();
      closeEditorModal();
      closeImportModal();
    });
  });

  document.querySelectorAll("[data-creator-step]").forEach((button) => {
    button.addEventListener("click", () => setCreatorStep(button.dataset.creatorStep));
  });
  elements.creatorPrev.addEventListener("click", () => stepCreator(-1));
  elements.creatorNext.addEventListener("click", () => stepCreator(1));

  elements.parseImport.addEventListener("click", handleParseImport);
  elements.applyImport.addEventListener("click", applyImportBatch);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDetailModal();
      closeEditorModal();
      closeImportModal();
    }
  });
}

async function init() {
  await registerServiceWorker();
  await loadPublicVersion();
  initNavigation();
  bindFilters();
  bindCreatorInputs();
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
  resetImportState();
  setContentView("editor", { scroll: false });

  try {
    await ensureAdminSession();
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

init();
