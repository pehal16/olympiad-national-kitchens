const adminState = {
  token: localStorage.getItem("olympiad_admin_token") || "",
  selectedAttemptId: "",
  refreshTimer: null,
  refreshInFlight: false,
  lastRefreshedAt: null,
  panelStatus: "idle",
  lastRefreshMode: "manual",
  summary: null,
  attempts: [],
  filteredAttempts: [],
  filters: {
    search: "",
    institution: "",
    group: "",
    mentor: "",
    status: "",
    dateFrom: "",
    dateTo: ""
  }
};

const PANEL_REFRESH_MS = 15000;

const elements = {
  navBack: document.getElementById("admin-nav-back"),
  navTop: document.getElementById("admin-nav-top"),
  navRating: document.getElementById("admin-nav-rating"),
  navDetail: document.getElementById("admin-nav-detail"),
  navRefresh: document.getElementById("admin-refresh"),
  ratingSection: document.getElementById("admin-rating-section"),
  detailSection: document.getElementById("admin-detail-section"),
  loginCard: document.getElementById("admin-login-card"),
  panel: document.getElementById("admin-panel"),
  loginForm: document.getElementById("admin-login-form"),
  passwordInput: document.getElementById("admin-password"),
  loginMessage: document.getElementById("admin-login-message"),
  exportMessage: document.getElementById("export-message"),
  statParticipants: document.getElementById("stat-participants"),
  statAttempts: document.getElementById("stat-attempts"),
  statCompleted: document.getElementById("stat-completed"),
  backendBadge: document.getElementById("system-backend-badge"),
  diskBadge: document.getElementById("system-disk-badge"),
  diagVersion: document.getElementById("diag-version"),
  diagRefreshedAt: document.getElementById("diag-refreshed-at"),
  diagServerTime: document.getElementById("diag-server-time"),
  diagLastActivity: document.getElementById("diag-last-activity"),
  diagPanelState: document.getElementById("diag-panel-state"),
  diagActiveAttempts: document.getElementById("diag-active-attempts"),
  diagApiErrors: document.getElementById("diag-api-errors"),
  diagLastApiError: document.getElementById("diag-last-api-error"),
  diagDiskFolder: document.getElementById("diag-disk-folder"),
  diagRefreshMode: document.getElementById("diag-refresh-mode"),
  appVersionLabel: document.getElementById("admin-app-version-label"),
  filterMeta: document.getElementById("attempts-filter-meta"),
  filterSearch: document.getElementById("filter-search"),
  filterInstitution: document.getElementById("filter-institution"),
  filterGroup: document.getElementById("filter-group"),
  filterMentor: document.getElementById("filter-mentor"),
  filterStatus: document.getElementById("filter-status"),
  filterDateFrom: document.getElementById("filter-date-from"),
  filterDateTo: document.getElementById("filter-date-to"),
  filterReset: document.getElementById("filter-reset"),
  tourAnalyticsGrid: document.getElementById("tour-analytics-grid"),
  institutionAnalyticsBody: document.getElementById("institution-analytics-body"),
  suspiciousMeta: document.getElementById("suspicious-meta"),
  suspiciousAttemptsBody: document.getElementById("suspicious-attempts-body"),
  attemptsBody: document.getElementById("attempts-table-body"),
  attemptDetail: document.getElementById("attempt-detail"),
  exportCsv: document.getElementById("export-csv"),
  exportJson: document.getElementById("export-json"),
  uploadDisk: document.getElementById("upload-disk")
};

async function adminApi(path, options = {}) {
  let response;

  try {
    response = await fetch(path, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminState.token}`
      },
      ...options
    });
  } catch (error) {
    const networkError = new Error("Не удалось связаться с сервером админки.");
    networkError.status = 0;
    networkError.cause = error;
    throw networkError;
  }

  const raw = await response.text();
  let data = {};

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (error) {
      const parseError = new Error(`Сервер вернул некорректный ответ (${response.status}).`);
      parseError.status = response.status;
      parseError.cause = error;
      throw parseError;
    }
  }

  if (!response.ok || data.ok === false) {
    const requestError = new Error(
      data.message || `Ошибка запроса (${response.status || "без кода"}).`
    );
    requestError.status = response.status;
    requestError.payload = data;
    throw requestError;
  }

  return data.data;
}

function showMessage(element, message, type = "success") {
  element.textContent = message;
  element.className = `message ${type}`;
}

function hideMessage(element) {
  element.textContent = "";
  element.className = "message hidden";
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function formatDurationMs(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "—";
  }

  if (value < 1000) {
    return `${value} мс`;
  }

  const totalSeconds = Math.round(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (!minutes) {
    return `${seconds} с`;
  }

  return `${minutes} м ${seconds.toString().padStart(2, "0")} с`;
}

function formatAdminError(error) {
  if (!error) {
    return "Ошибка запроса.";
  }

  if (Number(error.status) === 0) {
    return "Нет соединения с сервером админки.";
  }

  return error.message || "Ошибка запроса.";
}

function setDiagnosticStatus(element, text, tone = "active") {
  if (!element) {
    return;
  }

  element.textContent = text;
  element.className = `status-${tone}`;
}

function getRefreshModeLabel() {
  return adminState.lastRefreshMode === "auto"
    ? `Автообновление • каждые ${Math.round(PANEL_REFRESH_MS / 1000)} сек`
    : "Ручное обновление";
}

function setPanelStatus(status, message = "") {
  adminState.panelStatus = status;

  if (elements.diagPanelState) {
    if (status === "refreshing") {
      setDiagnosticStatus(elements.diagPanelState, message || "идет синхронизация", "active");
    } else if (status === "ready") {
      setDiagnosticStatus(elements.diagPanelState, message || "панель готова", "ready");
    } else if (status === "error") {
      setDiagnosticStatus(elements.diagPanelState, message || "есть ошибка", "error");
    } else {
      setDiagnosticStatus(elements.diagPanelState, message || "ожидание", "warning");
    }
  }

  if (elements.diagRefreshMode) {
    elements.diagRefreshMode.textContent = getRefreshModeLabel();
  }
}

async function loadPublicVersion() {
  if (!elements.appVersionLabel) {
    return;
  }

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
    // Footer keeps the bundled fallback version if health is temporarily unavailable.
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function uniqueSorted(values = []) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "ru-RU")
  );
}

function mapById(items = []) {
  return new Map(items.map((item) => [item.id, item]));
}

function showPanel() {
  elements.loginCard.classList.add("hidden");
  elements.panel.classList.remove("hidden");
}

function focusLoginCard() {
  elements.loginCard.scrollIntoView({ behavior: "smooth", block: "start" });
  elements.passwordInput.focus();
}

function scrollToBlock(block) {
  if (!block || block.classList.contains("hidden")) {
    return;
  }
  block.scrollIntoView({ behavior: "smooth", block: "start" });
}

function goBackOrHome() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = "/";
}

function stopAutoRefresh() {
  if (adminState.refreshTimer) {
    clearInterval(adminState.refreshTimer);
    adminState.refreshTimer = null;
  }
}

function resetAdminSession(message = "") {
  stopAutoRefresh();
  localStorage.removeItem("olympiad_admin_token");
  adminState.token = "";
  adminState.selectedAttemptId = "";
  adminState.summary = null;
  adminState.attempts = [];
  adminState.filteredAttempts = [];
  elements.panel.classList.add("hidden");
  elements.loginCard.classList.remove("hidden");
  setPanelStatus("warning", "ожидание входа");

  if (message) {
    showMessage(elements.loginMessage, message, "error");
  } else {
    hideMessage(elements.loginMessage);
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  adminState.refreshTimer = setInterval(() => {
    refreshPanel({ silent: true });
  }, PANEL_REFRESH_MS);
}

function highlightSelectedAttemptRow() {
  elements.attemptsBody.querySelectorAll("tr[data-attempt]").forEach((row) => {
    row.classList.toggle("is-selected", row.dataset.attempt === adminState.selectedAttemptId);
  });
}

function syncFiltersFromInputs() {
  adminState.filters = {
    search: elements.filterSearch ? elements.filterSearch.value.trim() : "",
    institution: elements.filterInstitution ? elements.filterInstitution.value : "",
    group: elements.filterGroup ? elements.filterGroup.value : "",
    mentor: elements.filterMentor ? elements.filterMentor.value : "",
    status: elements.filterStatus ? elements.filterStatus.value : "",
    dateFrom: elements.filterDateFrom ? elements.filterDateFrom.value : "",
    dateTo: elements.filterDateTo ? elements.filterDateTo.value : ""
  };

  return adminState.filters;
}

function fillSelectOptions(select, placeholder, values, selectedValue) {
  if (!select) {
    return;
  }

  select.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = placeholder;
  select.appendChild(defaultOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  if (selectedValue && values.includes(selectedValue)) {
    select.value = selectedValue;
  } else {
    select.value = "";
  }
}

function updateFilterMeta(total, shown) {
  if (!elements.filterMeta) {
    return;
  }
  elements.filterMeta.textContent = `Показано ${shown} из ${total}`;
}

function toDateOnly(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function getAttemptSearchBlob(attempt) {
  return [
    attempt.fullName,
    attempt.institution,
    attempt.groupName,
    attempt.mentorName,
    attempt.status,
    attempt.diploma
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function populateFilterControls() {
  const filters = syncFiltersFromInputs();
  const attempts = adminState.attempts || [];
  const catalogs = (adminState.summary && adminState.summary.catalogs) || {};

  const institutions = catalogs.institutions?.length
    ? catalogs.institutions
    : uniqueSorted(attempts.map((attempt) => attempt.institution));

  const attemptsByInstitution = filters.institution
    ? attempts.filter((attempt) => attempt.institution === filters.institution)
    : attempts;

  const groups = uniqueSorted(attemptsByInstitution.map((attempt) => attempt.groupName));

  const attemptsByInstitutionAndGroup = attempts.filter((attempt) => {
    if (filters.institution && attempt.institution !== filters.institution) {
      return false;
    }
    if (filters.group && attempt.groupName !== filters.group) {
      return false;
    }
    return true;
  });

  const mentors = uniqueSorted(attemptsByInstitutionAndGroup.map((attempt) => attempt.mentorName));
  const statuses = catalogs.statuses?.length
    ? catalogs.statuses
    : uniqueSorted(attempts.map((attempt) => attempt.status));

  fillSelectOptions(elements.filterInstitution, "Все учреждения", institutions, filters.institution);
  fillSelectOptions(elements.filterGroup, "Все группы", groups, filters.group);
  fillSelectOptions(elements.filterMentor, "Все наставники", mentors, filters.mentor);
  fillSelectOptions(elements.filterStatus, "Все статусы", statuses, filters.status);

  if (elements.filterDateFrom) {
    elements.filterDateFrom.min = catalogs.startedDateMin || "";
    elements.filterDateFrom.max = catalogs.startedDateMax || "";
  }
  if (elements.filterDateTo) {
    elements.filterDateTo.min = catalogs.startedDateMin || "";
    elements.filterDateTo.max = catalogs.startedDateMax || "";
  }

  syncFiltersFromInputs();
}

function attemptMatchesFilters(attempt, filters) {
  const startedDate = toDateOnly(attempt.startedAt);

  if (filters.search && !getAttemptSearchBlob(attempt).includes(filters.search.toLowerCase())) {
    return false;
  }
  if (filters.institution && attempt.institution !== filters.institution) {
    return false;
  }
  if (filters.group && attempt.groupName !== filters.group) {
    return false;
  }
  if (filters.mentor && attempt.mentorName !== filters.mentor) {
    return false;
  }
  if (filters.status && attempt.status !== filters.status) {
    return false;
  }
  if (filters.dateFrom && (!startedDate || startedDate < filters.dateFrom)) {
    return false;
  }
  if (filters.dateTo && (!startedDate || startedDate > filters.dateTo)) {
    return false;
  }

  return true;
}

function renderAttempts(attempts) {
  elements.attemptsBody.innerHTML = "";

  if (!attempts.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="6" class="muted">По текущим фильтрам попыток не найдено.</td>';
    elements.attemptsBody.appendChild(row);
    updateFilterMeta(adminState.attempts.length, 0);
    return;
  }

  attempts.forEach((attempt) => {
    const row = document.createElement("tr");
    row.dataset.attempt = attempt.id;
    row.tabIndex = 0;
    row.innerHTML = `
      <td>${attempt.rank}</td>
      <td>${escapeHtml(attempt.fullName)}<br /><span class="muted">${escapeHtml(attempt.institution || "—")}</span></td>
      <td>${escapeHtml(attempt.groupName || "—")}<br /><span class="muted">${escapeHtml(attempt.mentorName || "Наставник не указан")}</span></td>
      <td>${escapeHtml(attempt.status)}</td>
      <td>${attempt.totalFinalScore ?? "скрыто"}</td>
      <td><button class="button secondary" data-attempt="${attempt.id}">Открыть</button></td>
    `;
    if (attempt.id === adminState.selectedAttemptId) {
      row.classList.add("is-selected");
    }
    elements.attemptsBody.appendChild(row);
  });

  highlightSelectedAttemptRow();

  elements.attemptsBody.querySelectorAll("tr[data-attempt]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("button[data-attempt]")) {
        return;
      }
      loadAttemptDetail(row.dataset.attempt);
    });
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        loadAttemptDetail(row.dataset.attempt);
      }
    });
  });

  elements.attemptsBody.querySelectorAll("button[data-attempt]").forEach((button) => {
    button.addEventListener("click", () => loadAttemptDetail(button.dataset.attempt));
  });

  updateFilterMeta(adminState.attempts.length, attempts.length);
}

function applyAttemptFilters() {
  const filters = syncFiltersFromInputs();
  adminState.filteredAttempts = adminState.attempts.filter((attempt) =>
    attemptMatchesFilters(attempt, filters)
  );
  renderAttempts(adminState.filteredAttempts);
}

function renderTourAnalytics(items = []) {
  if (!elements.tourAnalyticsGrid) {
    return;
  }

  elements.tourAnalyticsGrid.innerHTML = "";

  if (!items.length) {
    elements.tourAnalyticsGrid.innerHTML = '<div class="muted">Данные по турам пока отсутствуют.</div>';
    return;
  }

  items.forEach((tour) => {
    const card = document.createElement("article");
    card.className = "analytics-card";
    card.innerHTML = `
      <div class="section-row">
        <strong>${escapeHtml(tour.code)}</strong>
        <span class="pill">${tour.averageScore} / ${tour.maxScore}</span>
      </div>
      <div>${escapeHtml(tour.title)}</div>
      <div class="analytics-meta">
        <span>Завершённых попыток: ${tour.attempts}</span>
        <span>Покрытие: ${tour.completionRate}%</span>
      </div>
    `;
    elements.tourAnalyticsGrid.appendChild(card);
  });
}

function renderInstitutionAnalytics(items = []) {
  if (!elements.institutionAnalyticsBody) {
    return;
  }

  elements.institutionAnalyticsBody.innerHTML = "";

  if (!items.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="5" class="muted">Сводка по учреждениям пока недоступна.</td>';
    elements.institutionAnalyticsBody.appendChild(row);
    return;
  }

  items.forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(entry.institution)}</td>
      <td>${entry.participants}</td>
      <td>${entry.attempts}</td>
      <td>${entry.completed}</td>
      <td>${entry.averageScore}</td>
    `;
    elements.institutionAnalyticsBody.appendChild(row);
  });
}

function renderSuspiciousAttempts(items = []) {
  if (!elements.suspiciousAttemptsBody || !elements.suspiciousMeta) {
    return;
  }

  elements.suspiciousMeta.textContent = `Сигналов: ${items.length}`;
  elements.suspiciousAttemptsBody.innerHTML = "";

  if (!items.length) {
    elements.suspiciousAttemptsBody.innerHTML =
      '<div class="muted">Подозрительных попыток пока не обнаружено.</div>';
    return;
  }

  items.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "suspicious-card";
    const signals = (entry.signals || [])
      .map((signal) => `<li>${escapeHtml(signal)}</li>`)
      .join("");

    card.innerHTML = `
      <div class="section-row">
        <strong>${escapeHtml(entry.participant?.fullName || "Без имени")}</strong>
        <span class="pill">уровень ${entry.severity}</span>
      </div>
      <div class="muted">${escapeHtml(entry.participant?.institution || "Учреждение не указано")} • ${escapeHtml(entry.participant?.groupName || "Группа не указана")}</div>
      <div class="analytics-meta">
        <span>Статус: ${escapeHtml(entry.status)}</span>
        <span>Ответов: ${entry.answeredCount} / ${entry.totalQuestions}</span>
        <span>Среднее время: ${formatDurationMs(entry.averageTimeMs)}</span>
        <span>Последняя активность: ${formatDateTime(entry.lastActivityAt)}</span>
      </div>
      <ul class="flat-list suspicious-signals">${signals}</ul>
    `;
    elements.suspiciousAttemptsBody.appendChild(card);
  });
}

function formatAnswer(question, answer) {
  if (!answer || !answer.answerPayload) {
    return "Ответ не сохранён";
  }

  const itemMap = mapById(question.items);
  const optionMap = mapById(question.options);

  if (question.type === "single_choice") {
    return optionMap.get(answer.answerPayload.selectedOptionId)?.text || "Нет выбора";
  }

  if (question.type === "sequence_drag") {
    const sequence = Array.isArray(answer.answerPayload.sequence)
      ? answer.answerPayload.sequence
      : [];
    return (question.slots || [])
      .map((slot, index) => {
        const item = itemMap.get(sequence[index]);
        return `${slot.label}: ${item ? item.text : "—"}`;
      })
      .join("\n");
  }

  if (question.type === "bucket_sort" || question.type === "ingredient_matrix") {
    const buckets = answer.answerPayload.buckets || {};
    return (question.buckets || [])
      .map((bucket) => {
        const values = (question.items || [])
          .filter((item) => buckets[item.id] === bucket.id)
          .map((item) => item.text);
        return `${bucket.label}: ${values.length ? values.join(", ") : "—"}`;
      })
      .join("\n");
  }

  return JSON.stringify(answer.answerPayload, null, 2);
}

function renderSummary(summary) {
  adminState.summary = summary;
  elements.statParticipants.textContent = summary.counts.participants;
  elements.statAttempts.textContent = summary.counts.attempts;
  elements.statCompleted.textContent = summary.counts.completed;

  const diskEnabled = Boolean(summary.capabilities && summary.capabilities.yandexDiskEnabled);
  elements.uploadDisk.disabled = !diskEnabled;
  elements.uploadDisk.title = diskEnabled
    ? ""
    : "Выгрузка на Яндекс Диск недоступна: интеграция ещё не настроена.";

  adminState.lastRefreshedAt = new Date();
  const diagnostics = summary.diagnostics || {};
  const capabilities = summary.capabilities || {};

  if (elements.backendBadge) {
    elements.backendBadge.textContent = `backend: ${capabilities.storageBackend || diagnostics.storageBackend || "—"}`;
  }
  if (elements.diskBadge) {
    elements.diskBadge.textContent = diskEnabled ? "Яндекс Диск: включён" : "Яндекс Диск: выключен";
  }
  if (elements.diagVersion) {
    elements.diagVersion.textContent = diagnostics.appVersion || "—";
  }
  if (elements.diagRefreshedAt) {
    elements.diagRefreshedAt.textContent = formatDateTime(adminState.lastRefreshedAt);
  }
  if (elements.diagServerTime) {
    elements.diagServerTime.textContent = formatDateTime(diagnostics.serverTime);
  }
  if (elements.diagLastActivity) {
    elements.diagLastActivity.textContent = formatDateTime(diagnostics.lastActivityAt);
  }
  if (elements.diagActiveAttempts) {
    elements.diagActiveAttempts.textContent = String(summary.counts.activeAttempts ?? "—");
  }
  if (elements.diagApiErrors) {
    elements.diagApiErrors.textContent = String(diagnostics.apiErrors ?? 0);
  }
  if (elements.diagLastApiError) {
    elements.diagLastApiError.textContent = diagnostics.lastApiErrorMessage
      ? `${diagnostics.lastApiErrorMessage}${diagnostics.lastApiErrorRoute ? ` (${diagnostics.lastApiErrorRoute})` : ""}`
      : "Ошибок не зафиксировано";
  }
  if (elements.diagDiskFolder) {
    elements.diagDiskFolder.textContent = capabilities.yandexDiskFolder || "—";
  }
  if (elements.diagRefreshMode) {
    elements.diagRefreshMode.textContent = getRefreshModeLabel();
  }

  renderTourAnalytics(summary.tourAnalytics || []);
  renderInstitutionAnalytics(summary.institutionAnalytics || []);
  renderSuspiciousAttempts(summary.suspiciousAttempts || []);
  setPanelStatus("ready", "панель синхронизирована");
}

async function loadSummary() {
  const summary = await adminApi("/api/admin/summary");
  renderSummary(summary);
  populateFilterControls();
}

async function loadAttempts() {
  adminState.attempts = await adminApi("/api/admin/attempts");
  populateFilterControls();
  applyAttemptFilters();
}

async function loadAttemptDetail(attemptId, options = {}) {
  if (!options.preserveSelection) {
    adminState.selectedAttemptId = attemptId;
  }

  const data = await adminApi(`/api/admin/attempts/${attemptId}`);
  const summary = data.summary;
  const detail = document.createElement("div");
  detail.className = "detail-block";

  const top = document.createElement("div");
  top.className = "detail-card";
  top.innerHTML = `
    <strong>${escapeHtml(data.attempt.participant.fullName)}</strong><br />
    <span class="muted">${escapeHtml(data.attempt.participant.institution)} • ${escapeHtml(data.attempt.participant.groupName)}</span><br />
    <span class="muted">${escapeHtml(data.attempt.participant.mentorName || "Наставник не указан")}</span><br />
    <span class="muted">Статус: ${escapeHtml(data.attempt.status)}</span><br />
    <span class="muted">Итог: ${summary.totalFinalScore} / ${summary.totalMaxScore}</span><br />
    <span class="muted">Выданные задания: ${escapeHtml((data.attempt.variantMeta.issuedQuestionIds || []).join(", "))}</span>
  `;
  detail.appendChild(top);

  data.tours.forEach((tour) => {
    const card = document.createElement("section");
    card.className = "detail-card";
    card.innerHTML = `
      <h3>${escapeHtml(tour.code)} • ${escapeHtml(tour.title)}</h3>
      <p class="muted">${tour.questionCount} вопросов • лимит ${tour.timeLimitMinutes} мин • результат ${tour.score ? `${tour.score.finalScore} / ${tour.score.maxScore}` : "0 / 0"}</p>
    `;

    tour.questions.forEach((question) => {
      const box = document.createElement("div");
      box.className = "review-box";
      box.innerHTML = `
        <div><strong>${escapeHtml(question.sourceId)}</strong> • ${escapeHtml(question.prompt)}</div>
        ${question.caseTitle ? `<div class="message">${escapeHtml(question.caseTitle)}</div>` : ""}
        ${question.scenario ? `<div class="muted">${escapeHtml(question.scenario)}</div>` : ""}
        <div class="muted">Ответ участника:<pre>${escapeHtml(formatAnswer(question, question.answer))}</pre></div>
        <div class="muted">Правильный ответ:<pre>${escapeHtml(question.correctAnswer || "—")}</pre></div>
        <div class="muted">Баллы: ${question.answer ? question.answer.finalScore : 0} / ${question.maxScore}</div>
        <div class="muted">Время на вопрос: ${question.log && question.log.timeSpentMs ? `${question.log.timeSpentMs} мс` : "нет данных"}</div>
      `;
      card.appendChild(box);
    });

    detail.appendChild(card);
  });

  elements.attemptDetail.innerHTML = "";
  elements.attemptDetail.appendChild(detail);
  highlightSelectedAttemptRow();

  if (!options.preserveSelection) {
    scrollToBlock(elements.detailSection);
  }
}

async function refreshPanel(options = {}) {
  const { silent = false } = options;

  if (!adminState.token || adminState.refreshInFlight) {
    return;
  }

  adminState.lastRefreshMode = silent ? "auto" : "manual";
  adminState.refreshInFlight = true;
  setPanelStatus("refreshing", silent ? "фоновое обновление" : "ручная синхронизация");
  const selectedAttemptId = adminState.selectedAttemptId;

  try {
    await loadSummary();
    await loadAttempts();

    if (selectedAttemptId) {
      await loadAttemptDetail(selectedAttemptId, { preserveSelection: true });
    }
  } catch (error) {
    if (silent) {
      if (error.status === 401) {
        resetAdminSession("Сеанс администратора завершён. Войдите повторно.");
      } else {
        setPanelStatus("error", formatAdminError(error));
        showMessage(elements.exportMessage, `Автообновление: ${formatAdminError(error)}`, "warning");
      }
      return;
    }
    setPanelStatus("error", formatAdminError(error));
    throw error;
  } finally {
    adminState.refreshInFlight = false;
  }
}

async function handleLogin(event) {
  event.preventDefault();
  hideMessage(elements.loginMessage);

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: elements.passwordInput.value })
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Ошибка входа");
    }

    adminState.token = data.data.token;
    localStorage.setItem("olympiad_admin_token", adminState.token);
    showPanel();
    await refreshPanel();
    startAutoRefresh();
  } catch (error) {
    showMessage(elements.loginMessage, formatAdminError(error), "error");
  }
}

async function exportFile(kind) {
  hideMessage(elements.exportMessage);

  try {
    const data = await adminApi(`/api/admin/exports/${kind}`, { method: "POST" });
    showMessage(
      elements.exportMessage,
      `Файл сформирован: ${data.fileName}. Путь: ${data.filePath}`,
      "success"
    );
  } catch (error) {
    showMessage(elements.exportMessage, formatAdminError(error), "error");
  }
}

async function uploadToDisk() {
  hideMessage(elements.exportMessage);

  try {
    const data = await adminApi("/api/admin/disk/upload", { method: "POST" });
    showMessage(
      elements.exportMessage,
      `Файлы выгружены на Яндекс Диск в папку ${data.folder}.`,
      "success"
    );
  } catch (error) {
    showMessage(elements.exportMessage, formatAdminError(error), "error");
  }
}

function handleFiltersChanged() {
  populateFilterControls();
  applyAttemptFilters();
}

function resetFilters() {
  if (elements.filterSearch) {
    elements.filterSearch.value = "";
  }
  if (elements.filterInstitution) {
    elements.filterInstitution.value = "";
  }
  if (elements.filterGroup) {
    elements.filterGroup.value = "";
  }
  if (elements.filterMentor) {
    elements.filterMentor.value = "";
  }
  if (elements.filterStatus) {
    elements.filterStatus.value = "";
  }
  if (elements.filterDateFrom) {
    elements.filterDateFrom.value = "";
  }
  if (elements.filterDateTo) {
    elements.filterDateTo.value = "";
  }

  handleFiltersChanged();
}

async function init() {
  await loadPublicVersion();
  setPanelStatus("warning", "ожидание входа");
  elements.navBack.addEventListener("click", goBackOrHome);
  elements.navTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  elements.navRating.addEventListener("click", () => {
    if (elements.panel.classList.contains("hidden")) {
      focusLoginCard();
      return;
    }
    scrollToBlock(elements.ratingSection);
  });
  elements.navDetail.addEventListener("click", () => {
    if (elements.panel.classList.contains("hidden")) {
      focusLoginCard();
      return;
    }
    scrollToBlock(elements.detailSection);
  });
  elements.navRefresh.addEventListener("click", () => {
    if (elements.panel.classList.contains("hidden")) {
      focusLoginCard();
      return;
    }
    refreshPanel();
  });

  elements.loginForm.addEventListener("submit", handleLogin);
  elements.exportCsv.addEventListener("click", () => exportFile("csv"));
  elements.exportJson.addEventListener("click", () => exportFile("json"));
  elements.uploadDisk.addEventListener("click", uploadToDisk);

  [
    elements.filterInstitution,
    elements.filterGroup,
    elements.filterMentor,
    elements.filterStatus,
    elements.filterDateFrom,
    elements.filterDateTo
  ].forEach((element) => {
    if (element) {
      element.addEventListener("change", handleFiltersChanged);
    }
  });

  if (elements.filterSearch) {
    elements.filterSearch.addEventListener("input", handleFiltersChanged);
  }
  if (elements.filterReset) {
    elements.filterReset.addEventListener("click", resetFilters);
  }

  if (adminState.token) {
    try {
      showPanel();
      await refreshPanel();
      startAutoRefresh();
    } catch (error) {
      resetAdminSession();
    }
  }
}

init();
