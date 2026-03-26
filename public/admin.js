const adminState = {
  token: localStorage.getItem("olympiad_admin_token") || "",
  selectedAttemptId: "",
  refreshTimer: null,
  refreshInFlight: false,
  summary: null,
  attempts: [],
  lastRefreshedAt: null,
  filters: {
    search: "",
    status: "",
    institution: "",
    group: ""
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
  attemptsBody: document.getElementById("attempts-table-body"),
  attemptsMeta: document.getElementById("attempts-meta"),
  attemptDetail: document.getElementById("attempt-detail"),
  exportCsv: document.getElementById("export-csv"),
  exportJson: document.getElementById("export-json"),
  uploadDisk: document.getElementById("upload-disk"),
  filterSearch: document.getElementById("filter-search"),
  filterStatus: document.getElementById("filter-status"),
  filterInstitution: document.getElementById("filter-institution"),
  filterGroup: document.getElementById("filter-group"),
  filterReset: document.getElementById("filter-reset"),
  systemBackendBadge: document.getElementById("system-backend-badge"),
  diagVersion: document.getElementById("diag-version"),
  diagDisk: document.getElementById("diag-disk"),
  diagLastActivity: document.getElementById("diag-last-activity"),
  diagInProgress: document.getElementById("diag-in-progress"),
  diagInstitutions: document.getElementById("diag-institutions"),
  diagGroups: document.getElementById("diag-groups"),
  diagRefreshedAt: document.getElementById("diag-refreshed-at"),
  diagServerTime: document.getElementById("diag-server-time"),
  diagTokenState: document.getElementById("diag-token-state"),
  tourAnalytics: document.getElementById("tour-analytics")
};

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("ru-RU", {
    hour12: false,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

async function adminApi(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": adminState.token
      },
      ...options
    });
  } catch (error) {
    const wrapped = new Error("Не удалось связаться с сервером.");
    wrapped.status = 0;
    throw wrapped;
  }

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok || data.ok === false) {
    const wrapped = new Error(
      data.message || data.errorMessage || `Ошибка запроса (${response.status})`
    );
    wrapped.status = response.status;
    throw wrapped;
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

function showPanel() {
  elements.loginCard.classList.add("hidden");
  elements.panel.classList.remove("hidden");
  elements.diagTokenState.textContent = "активен";
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
  adminState.lastRefreshedAt = null;
  elements.panel.classList.add("hidden");
  elements.loginCard.classList.remove("hidden");
  elements.diagTokenState.textContent = "требуется вход";
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

function mapById(items = []) {
  return new Map(items.map((item) => [item.id, item]));
}

function highlightSelectedAttemptRow() {
  elements.attemptsBody.querySelectorAll("tr[data-attempt]").forEach((row) => {
    row.classList.toggle("is-selected", row.dataset.attempt === adminState.selectedAttemptId);
  });
}

function populateSelect(select, values, placeholder) {
  const currentValue = select.value;
  select.innerHTML = "";

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = placeholder;
  select.appendChild(emptyOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  if (values.includes(currentValue)) {
    select.value = currentValue;
  } else {
    select.value = "";
  }
}

function updateFilterOptions() {
  const institutions = [...new Set(adminState.attempts.map((attempt) => attempt.institution).filter(Boolean))].sort();
  const groups = [...new Set(adminState.attempts.map((attempt) => attempt.groupName).filter(Boolean))].sort();
  const statuses = [...new Set(adminState.attempts.map((attempt) => attempt.status).filter(Boolean))].sort();

  populateSelect(elements.filterInstitution, institutions, "Все учреждения");
  populateSelect(elements.filterGroup, groups, "Все группы");
  populateSelect(elements.filterStatus, statuses, "Все статусы");
}

function syncFiltersFromControls() {
  adminState.filters.search = elements.filterSearch.value.trim().toLowerCase();
  adminState.filters.status = elements.filterStatus.value;
  adminState.filters.institution = elements.filterInstitution.value;
  adminState.filters.group = elements.filterGroup.value;
}

function resetFilters() {
  elements.filterSearch.value = "";
  elements.filterStatus.value = "";
  elements.filterInstitution.value = "";
  elements.filterGroup.value = "";
  syncFiltersFromControls();
  renderAttempts();
}

function getFilteredAttempts() {
  syncFiltersFromControls();
  const { search, status, institution, group } = adminState.filters;

  return adminState.attempts.filter((attempt) => {
    if (status && attempt.status !== status) {
      return false;
    }
    if (institution && attempt.institution !== institution) {
      return false;
    }
    if (group && attempt.groupName !== group) {
      return false;
    }
    if (search) {
      const haystack = [
        attempt.fullName,
        attempt.institution,
        attempt.groupName,
        attempt.mentorName
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
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

function renderTourAnalytics(summary) {
  elements.tourAnalytics.innerHTML = "";
  (summary.tourAnalytics || []).forEach((tour) => {
    const card = document.createElement("div");
    card.className = "tour-pill";
    card.innerHTML = `
      <strong>${tour.code} • ${tour.avgScore} / ${tour.maxScore}</strong>
      <span>${tour.completedAttempts} завершено • штраф ${tour.avgPenalty}</span>
    `;
    elements.tourAnalytics.appendChild(card);
  });
}

function renderSummary(summary) {
  adminState.summary = summary;
  adminState.lastRefreshedAt = new Date();

  elements.statParticipants.textContent = summary.counts.participants;
  elements.statAttempts.textContent = summary.counts.attempts;
  elements.statCompleted.textContent = summary.counts.completed;

  const diskEnabled = Boolean(summary.capabilities && summary.capabilities.yandexDiskEnabled);
  elements.uploadDisk.disabled = !diskEnabled;
  elements.uploadDisk.title = diskEnabled
    ? ""
    : "Выгрузка на Яндекс Диск недоступна: интеграция ещё не настроена.";

  const diagnostics = summary.diagnostics || {};
  elements.systemBackendBadge.textContent = String(diagnostics.storageBackend || "—").toUpperCase();
  elements.diagVersion.textContent = diagnostics.appVersion || "—";
  elements.diagDisk.textContent = diagnostics.yandexDiskEnabled ? "включён" : "выключен";
  elements.diagLastActivity.textContent = formatDateTime(diagnostics.lastActivityAt);
  elements.diagInProgress.textContent = summary.counts.inProgress;
  elements.diagInstitutions.textContent = summary.counts.institutions;
  elements.diagGroups.textContent = summary.counts.groups;
  elements.diagRefreshedAt.textContent = formatDateTime(adminState.lastRefreshedAt);
  elements.diagServerTime.textContent = formatDateTime(diagnostics.serverTime);
  elements.diagTokenState.textContent = adminState.token ? "активен" : "требуется вход";

  renderTourAnalytics(summary);
}

async function loadSummary() {
  const summary = await adminApi("/api/admin/summary");
  renderSummary(summary);
}

function renderAttempts() {
  const attempts = getFilteredAttempts();
  elements.attemptsBody.innerHTML = "";

  elements.attemptsMeta.textContent = `Показано ${attempts.length} из ${adminState.attempts.length} попыток.`;

  attempts.forEach((attempt) => {
    const row = document.createElement("tr");
    row.dataset.attempt = attempt.id;
    row.tabIndex = 0;
    row.innerHTML = `
      <td>${attempt.rank}</td>
      <td>${attempt.fullName}<br /><span class="muted">${attempt.institution}</span></td>
      <td>${attempt.groupName}<br /><span class="muted">${attempt.mentorName || "Наставник не указан"}</span></td>
      <td>${attempt.status}</td>
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
}

async function loadAttempts() {
  adminState.attempts = await adminApi("/api/admin/attempts");
  updateFilterOptions();
  renderAttempts();
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
    <strong>${data.attempt.participant.fullName}</strong><br />
    <span class="muted">${data.attempt.participant.institution} • ${data.attempt.participant.groupName}</span><br />
    <span class="muted">${data.attempt.participant.mentorName || "Наставник не указан"}</span><br />
    <span class="muted">Статус: ${data.attempt.status}</span><br />
    <span class="muted">Итог: ${summary.totalFinalScore} / ${summary.totalMaxScore}</span><br />
    <span class="muted">Выданные задания: ${data.attempt.variantMeta.issuedQuestionIds.join(", ")}</span>
  `;
  detail.appendChild(top);

  data.tours.forEach((tour) => {
    const card = document.createElement("section");
    card.className = "detail-card";
    card.innerHTML = `
      <h3>${tour.code} • ${tour.title}</h3>
      <p class="muted">${tour.questionCount} вопросов • лимит ${tour.timeLimitMinutes} мин • результат ${tour.score ? `${tour.score.finalScore} / ${tour.score.maxScore}` : "0 / 0"}</p>
    `;

    tour.questions.forEach((question) => {
      const box = document.createElement("div");
      box.className = "review-box";
      box.innerHTML = `
        <div><strong>${question.sourceId}</strong> • ${question.prompt}</div>
        ${question.caseTitle ? `<div class="message">${question.caseTitle}</div>` : ""}
        ${question.scenario ? `<div class="muted">${question.scenario}</div>` : ""}
        <div class="muted">Ответ участника:<pre>${formatAnswer(question, question.answer)}</pre></div>
        <div class="muted">Правильный ответ:<pre>${question.correctAnswer || "—"}</pre></div>
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

  adminState.refreshInFlight = true;
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
      }
      return;
    }
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
    showMessage(elements.loginMessage, error.message, "error");
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
    showMessage(elements.exportMessage, error.message, "error");
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
    showMessage(elements.exportMessage, error.message, "error");
  }
}

function bindFilters() {
  const rerender = () => renderAttempts();
  elements.filterSearch.addEventListener("input", rerender);
  elements.filterStatus.addEventListener("change", rerender);
  elements.filterInstitution.addEventListener("change", rerender);
  elements.filterGroup.addEventListener("change", rerender);
  elements.filterReset.addEventListener("click", resetFilters);
}

async function init() {
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
  bindFilters();

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
