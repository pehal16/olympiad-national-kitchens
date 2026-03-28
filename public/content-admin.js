const state = {
  token: localStorage.getItem("olympiad_admin_token") || "",
  summary: null,
  questions: [],
  filteredQuestions: [],
  selectedQuestionId: "",
  drafts: {},
  draftRequestState: "idle",
  filters: {
    search: "",
    tour: "",
    cuisine: "",
    type: "",
    difficulty: "",
    theme: ""
  }
};

const elements = {
  navBack: document.getElementById("content-nav-back"),
  navTop: document.getElementById("content-nav-top"),
  navSummary: document.getElementById("content-nav-summary"),
  navQa: document.getElementById("content-nav-qa"),
  navEditor: document.getElementById("content-nav-editor"),
  navRefresh: document.getElementById("content-refresh"),
  loginCard: document.getElementById("content-login-card"),
  panel: document.getElementById("content-panel"),
  summarySection: document.getElementById("content-summary-section"),
  qaSection: document.getElementById("content-qa-section"),
  editorSection: document.getElementById("content-editor-section"),
  totalQuestions: document.getElementById("content-total-questions"),
  interactiveQuestions: document.getElementById("content-interactive-questions"),
  totalCuisines: document.getElementById("content-total-cuisines"),
  readyPercent: document.getElementById("content-ready-percent"),
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
  filterReset: document.getElementById("content-filter-reset"),
  draftMeta: document.getElementById("content-draft-meta"),
  questionList: document.getElementById("content-question-list"),
  detailEmpty: document.getElementById("content-detail-empty"),
  detail: document.getElementById("content-detail"),
  detailHead: document.getElementById("content-detail-head"),
  note: document.getElementById("content-detail-note"),
  saveDraft: document.getElementById("content-save-draft"),
  resetDraft: document.getElementById("content-reset-draft"),
  exportDrafts: document.getElementById("content-export-drafts"),
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

function adminApi(path, options = {}) {
  return fetch(path, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.token}`
    },
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

function goBackOrHome() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = "/admin.html";
}

function showLoginState() {
  elements.loginCard.classList.remove("hidden");
  elements.panel.classList.add("hidden");
}

function showPanel() {
  elements.loginCard.classList.add("hidden");
  elements.panel.classList.remove("hidden");
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

  const qaCount =
    summary.qa.duplicatePrompts.length +
    summary.qa.missingMetadata.length +
    summary.qa.weakDistractors.length +
    summary.qa.translationHotspots.length;
  elements.qaSummaryBadge.textContent = `сигналов: ${qaCount}`;

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
    theme: elements.filterTheme.value
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

function renderQuestionDetail() {
  const question = state.questions.find((item) => item.id === state.selectedQuestionId);
  if (!question) {
    elements.detailEmpty.classList.remove("hidden");
    elements.detail.classList.add("hidden");
    return;
  }

  const merged = mergedQuestion(question);

  elements.detailEmpty.classList.add("hidden");
  elements.detail.classList.remove("hidden");
  hideMessage(elements.note);

  elements.detailHead.innerHTML = `
    <strong>${escapeHtml(question.id)} • ${escapeHtml(question.tourCode)} • ${escapeHtml(question.typeLabel)}</strong><br />
    <span class="muted">${escapeHtml(question.cuisineLabel)} • ${escapeHtml(question.cuisineGroupLabel)}</span><br />
    <span class="muted">${escapeHtml(question.dishLabel || question.caseTitle || "Без отдельного блюда")}</span><br />
    <span class="muted">${escapeHtml(question.prompt)}</span>
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
  elements.filterMeta.textContent = `показано ${shown} из ${total}`;
  elements.draftMeta.textContent = `черновиков: ${Object.keys(state.drafts).length}`;

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
    const row = document.createElement("button");
    row.type = "button";
    row.className = `content-question-row${question.id === state.selectedQuestionId ? " is-selected" : ""}`;
    row.innerHTML = `
      <div class="content-question-top">
        <strong>${escapeHtml(question.id)}</strong>
        <span class="pill">${escapeHtml(question.tourCode)}</span>
      </div>
      <div>${escapeHtml(shortText(question.prompt, 110))}</div>
      <div class="content-question-meta">
        <span>${escapeHtml(question.cuisineLabel)}</span>
        <span>${escapeHtml(question.typeLabel)}</span>
        <span>${escapeHtml(question.metadata.difficultyLabel)}</span>
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

function resetFilters() {
  elements.filterSearch.value = "";
  elements.filterTour.value = "";
  elements.filterCuisine.value = "";
  elements.filterType.value = "";
  elements.filterDifficulty.value = "";
  elements.filterTheme.value = "";
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
    elements.filterTheme
  ].forEach((element) => element.addEventListener("change", applyFilters));

  elements.filterSearch.addEventListener("input", applyFilters);
  elements.filterReset.addEventListener("click", resetFilters);
}

function initNavigation() {
  elements.navBack.addEventListener("click", goBackOrHome);
  elements.navTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  elements.navSummary.addEventListener("click", () =>
    elements.summarySection.scrollIntoView({ behavior: "smooth", block: "start" })
  );
  elements.navQa.addEventListener("click", () =>
    elements.qaSection.scrollIntoView({ behavior: "smooth", block: "start" })
  );
  elements.navEditor.addEventListener("click", () =>
    elements.editorSection.scrollIntoView({ behavior: "smooth", block: "start" })
  );
  elements.navRefresh.addEventListener("click", async () => {
    if (!state.token) {
      showLoginState();
      return;
    }

    try {
      await loadContentPanel();
      showMessage(elements.note, "Панель банка заданий обновлена.", "success");
    } catch (error) {
      showMessage(elements.note, error.message || "Не удалось обновить контентную панель.", "error");
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

  if (!state.token) {
    showLoginState();
    return;
  }

  try {
    showPanel();
    await loadContentPanel();
  } catch (error) {
    localStorage.removeItem("olympiad_admin_token");
    state.token = "";
    showLoginState();
  }
}

init();
