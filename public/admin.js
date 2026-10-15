const adminState = {
  token: "",
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

async function loadStoryRuns() {
  const mount=document.getElementById('story-run-admin');
  if(!mount)return;
  const runs=await adminApi('/api/admin/story-runs');
  const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  if(!mount.dataset.ready){
    mount.append(el('h2','Проведение олимпиады'),el('p','Здесь управляются допуск, активные попытки и публикация общих итогов. Остановка новых стартов не прерывает уже начатые попытки.'));
    const current=el('div');current.id='story-run-current';mount.append(current);
    const archive=el('details');archive.append(el('summary','Другие проведения и пробные попытки'));
    const list=el('div');list.id='story-run-list';archive.append(list);mount.append(archive);
    const planning=el('details');planning.append(el('summary','Создать отдельный день проведения'));
    const form=el('form'),label=el('label','Дата проведения по Москве '),date=el('input');date.type='date';date.required=true;label.append(date);
    date.value='2026-10-16';date.setAttribute('aria-label','Дата проведения');
    const hours=el('label','Открытие входа '),startTime=el('input');startTime.type='time';startTime.value='08:00';startTime.required=true;startTime.setAttribute('aria-label','Открытие входа');hours.append(startTime);
    const closing=el('label','Закрытие входа '),endTime=el('input');endTime.type='time';endTime.value='16:00';endTime.required=true;closing.append(endTime);
    endTime.setAttribute('aria-label','Закрытие входа');
    const create=el('button','Создать день');create.className='button primary';create.type='submit';
    const message=el('p');message.className='story-run-message';message.setAttribute('role','status');message.id='story-run-message';
    form.append(label,hours,closing,create);form.addEventListener('submit',async event=>{event.preventDefault();create.disabled=true;try{await adminApi('/api/admin/story-runs',{method:'POST',body:JSON.stringify({date:date.value,startTime:startTime.value,endTime:endTime.value})});message.textContent='Проведение создано. Дата, часы входа и версии закреплены.';await loadStoryRuns();}catch(error){message.textContent=error.message;}finally{create.disabled=false;}});
    planning.append(el('p','После создания время закрепляется. Основное проведение выделено выше; отдельный день не заменяет его автоматически.'),form);mount.append(planning,message);mount.dataset.ready='true';
  }
  // Keep controls stable while an operation is awaiting server confirmation.
  if(mount.dataset.busy==='true')return;
  const list=document.getElementById('story-run-list'),current=document.getElementById('story-run-current');list.replaceChildren();current.replaceChildren();
  if(!runs.length)current.append(el('p','Дата ещё не назначена. Новые сценарные попытки закрыты.'));
  const time=value=>new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
  const date=value=>new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'long',year:'numeric'}).format(new Date(value));
  for(const run of runs){
    const now=Date.parse(run.serverTime)||Date.now(),isCurrent=run.isCurrent;
    const row=el('article');row.className='story-run-row'+(isCurrent?' is-current':'');row.dataset.runId=run.id;
    const heading=el('div');heading.className='story-run-heading';
    heading.append(el('h3',run.entryMode==='anytime'?'Пробный свободный вход':date(run.entryStartsAt)));
    const state=el('span',run.publishedAt?'Итоги опубликованы':run.entryOpen?'Олимпиада включена':'Олимпиада выключена');state.className='story-run-state';heading.append(state);row.append(heading);
    if(run.entryMode!=='anytime')row.append(el('p',`Расписание: с ${time(run.entryStartsAt)} до ${time(run.entryEndsAt)} по Москве. Ручное включение открывает вход сразу, даже вне этого времени.`));
    row.append(el('p',run.admissionMode==='open'?'Ручное управление: вход открыт до вашего выключения.':run.admissionMode==='closed'||run.stopped?'Ручное управление: вход закрыт до вашего включения.':'Режим: по расписанию. Можно переключить вручную в любой момент.'));
    const metrics=el('div');metrics.className='story-run-metrics';
    for(const [label,count] of [['Начали',run.started],['Завершили',run.completed],['Проходят',run.active]]){const card=el('div');card.className='story-run-metric';card.append(el('strong',String(count)),el('span',label));metrics.append(card);}row.append(metrics);
    const help=el('p');help.className='story-run-help';help.textContent=run.publishedAt?'Общие итоги, заработанное меню и разбор доступны участникам. Свидетельство с личными баллами выдаётся сразу после завершения.':run.entryMode==='anytime'?'Перед публикацией остановите новые старты и дождитесь завершения всех начатых попыток.':`${run.admissionMode==="open"?"Вход открыт вручную до вашего выключения.":run.admissionMode==="closed"||run.stopped?"Вход закрыт вручную.":"Вход открывается автоматически."} Публикация общих итогов — после ${time(run.entryEndsAt)} и завершения всех попыток. У последнего участника сохраняются полные 18 минут 45 секунд.`;row.append(help);
    const actions=el('div');actions.className='story-run-actions';
    async function action(path,method,body){
      if(mount.dataset.busy==='true')return;
      mount.dataset.busy='true';row.setAttribute('aria-busy','true');actions.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{await adminApi(path,{method,...(body?{body:JSON.stringify(body)}:{})});document.getElementById('story-run-message').textContent='Изменение подтверждено сервером.';}
      catch(error){document.getElementById('story-run-message').textContent=error.message;}
      finally{delete mount.dataset.busy;await loadStoryRuns();}
    }
    const toggle=el('button');toggle.className='button admission-switch';toggle.type='button';toggle.disabled=Boolean(run.publishedAt);toggle.setAttribute('role','switch');toggle.setAttribute('aria-checked',String(run.entryOpen));toggle.setAttribute('aria-label','Олимпиада');
    const track=el('span');track.className='admission-switch-track';track.setAttribute('aria-hidden','true');toggle.append(track,el('span',run.entryOpen?'Включено':'Выключено'));
    toggle.addEventListener('click',()=>action(`/api/admin/story-runs/${run.id}`,'PATCH',{admissionMode:run.entryOpen?'closed':'open'}));
    const automatic=el('button','Вернуть расписание');automatic.className='button secondary';automatic.type='button';automatic.disabled=Boolean(run.publishedAt)||(!run.stopped&&(!run.admissionMode||run.admissionMode==='auto'));automatic.addEventListener('click',()=>action(`/api/admin/story-runs/${run.id}`,'PATCH',{admissionMode:'auto'}));
    const decoration=el('button',run.decorationsDisabled?'Включить оформление':'Отключить оформление');decoration.className='button secondary';decoration.type='button';decoration.addEventListener('click',()=>action(`/api/admin/story-runs/${run.id}`,'PATCH',{decorationsDisabled:!run.decorationsDisabled},decoration));
    const publish=el('button',run.publishedAt?'Опубликовано':'Опубликовать общие итоги');publish.type='button';publish.className='button primary';publish.disabled=run.canPublish!==undefined?!run.canPublish:Boolean(run.publishedAt)||(run.entryMode==='anytime'?!run.stopped:now<Date.parse(run.entryEndsAt))||run.active>0;publish.addEventListener('click',()=>action(`/api/admin/story-runs/${run.id}/publish`,'POST',null,publish));
    actions.append(toggle,automatic,decoration,publish);row.append(actions);
    if(!run.publishedAt&&run.publicationBlockers?.length)row.append(el('p','Публикация пока недоступна: '+run.publicationBlockers.join(' ')));
    (isCurrent?current:list).append(row);
  }
}

const elements = {
  navRibbon: document.getElementById("admin-nav-ribbon"),
  navMenuToggle: document.getElementById("admin-nav-menu-toggle"),
  navDrawer: document.getElementById("admin-nav-drawer"),
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
  recentStartsCount: document.getElementById("recent-starts-count"),
  recentStartsList: document.getElementById("recent-starts-list"),
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

async function adminApi(path, options = {}) {
  let response;
  const requestHeaders = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  try {
    response = await fetch(path, {
      credentials: "same-origin",
      headers: requestHeaders,
      ...options
    });
  } catch (error) {
    const networkError = new Error("     .");
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
      const parseError = new Error(`    (${response.status}).`);
      parseError.status = response.status;
      parseError.cause = error;
      throw parseError;
    }
  }

  if (!response.ok || data.ok === false) {
    const requestError = new Error(
      data.message || `  (${response.status || " "}).`
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
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
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
    return "";
  }

  if (value < 1000) {
    return `${value} `;
  }

  const totalSeconds = Math.round(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (!minutes) {
    return `${seconds} `;
  }

  return `${minutes}  ${seconds.toString().padStart(2, "0")} `;
}

function formatAdminError(error) {
  if (!error) {
    return " .";
  }

  if (Number(error.status) === 0) {
    return "    .";
  }

  return error.message || " .";
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
    ? `   ${Math.round(PANEL_REFRESH_MS / 1000)} `
    : " ";
}

function setPanelStatus(status, message = "") {
  adminState.panelStatus = status;

  if (elements.diagPanelState) {
    if (status === "refreshing") {
      setDiagnosticStatus(elements.diagPanelState, message || " ", "active");
    } else if (status === "ready") {
      setDiagnosticStatus(elements.diagPanelState, message || " ", "ready");
    } else if (status === "error") {
      setDiagnosticStatus(elements.diagPanelState, message || " ", "error");
    } else {
      setDiagnosticStatus(elements.diagPanelState, message || "", "warning");
    }
  }

  if (elements.diagRefreshMode) {
    elements.diagRefreshMode.textContent = getRefreshModeLabel();
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js?v=1.7.0");
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      registration.update().catch(() => {});
    }
  } catch (error) {
    // Admin panel stays functional even without service worker support.
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
    .replace(/"/g, "&quot;")
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
  closeNavDrawer();
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
  adminState.token = "";
  adminState.selectedAttemptId = "";
  adminState.summary = null;
  adminState.attempts = [];
  adminState.filteredAttempts = [];
  elements.panel.classList.add("hidden");
  elements.loginCard.classList.remove("hidden");
  setPanelStatus("warning", " ");

  if (message) {
    showMessage(elements.loginMessage, message, "error");
  } else {
    hideMessage(elements.loginMessage);
  }
}

async function ensureAdminSession() {
  const response = await fetch("/api/admin/session", {
    credentials: "same-origin"
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : {};

  if (!response.ok || data.ok === false) {
    const error = new Error(data.message || `   (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  return data.data || { active: true };
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
  elements.filterMeta.textContent = ` ${shown}  ${total}`;
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

  fillSelectOptions(elements.filterInstitution, " ", institutions, filters.institution);
  fillSelectOptions(elements.filterGroup, " ", groups, filters.group);
  fillSelectOptions(elements.filterMentor, " ", mentors, filters.mentor);
  fillSelectOptions(elements.filterStatus, " ", statuses, filters.status);

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
    row.innerHTML = '<td colspan="6" class="muted">     .</td>';
    elements.attemptsBody.appendChild(row);
    updateFilterMeta(adminState.attempts.length, 0);
    return;
  }

  attempts.forEach((attempt) => {
    const row = document.createElement("tr");
    row.dataset.attempt = attempt.id;
    row.tabIndex = 0;
    row.innerHTML = `
      <td>${attempt.rank ?? "—"}</td>
      <td>${escapeHtml(attempt.fullName)}<br /><span class="muted">${escapeHtml(attempt.institution || "")} · редакция ${attempt.conditionVersion === 6 ? '6 (Т1–Т4: 30 секунд; Т5: 45 секунд)' : attempt.conditionVersion === 5 ? '5 (30 секунд на задание, 18 минут)' : attempt.conditionVersion === 4 ? '4 (страны Т3 и время на задание)' : attempt.conditionVersion === 3 ? '3 (обновлённое меню Т4)' : attempt.conditionVersion === 2 ? '2 (страны в Т1)' : '1'}${attempt.storyRunId ? ' · '+escapeHtml(attempt.storyRunId) : ''}</span></td>
      <td>${escapeHtml(attempt.groupName || "")}<br /><span class="muted">${escapeHtml(attempt.mentorName || "  ")}</span></td>
      <td>${escapeHtml(attempt.status)}</td>
      <td>${attempt.totalFinalScore ?? ""}</td>
      <td><button class="button secondary" data-attempt="${attempt.id}"></button></td>
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

function renderRecentStarts(attempts) {
  if (!elements.recentStartsList || !elements.recentStartsCount) return;
  const ordered = [...attempts]
    .filter((attempt) => attempt.startedAt)
    .sort((left, right) => new Date(right.startedAt) - new Date(left.startedAt));
  elements.recentStartsCount.textContent = `${ordered.length} ${ordered.length === 1 ? "старт" : "стартов"}`;
  elements.recentStartsList.replaceChildren();
  if (!ordered.length) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Пока никто не начал работу.";
    elements.recentStartsList.appendChild(empty);
    return;
  }
  ordered.slice(0, 8).forEach((attempt) => {
    const row = document.createElement("article");
    row.className = "recent-start-row";
    const name = document.createElement("strong");
    name.textContent = attempt.fullName || "Участник";
    const meta = document.createElement("span");
    meta.className = "muted";
    meta.textContent = [attempt.groupName, attempt.institution, formatDateTime(attempt.startedAt)]
      .filter(Boolean)
      .join(" • ");
    const status = document.createElement("span");
    status.className = "pill";
    status.textContent = attempt.status === "in_progress" ? "В работе" : "Завершена";
    const details = document.createElement("button");
    details.type = "button";
    details.className = "button ghost";
    details.textContent = "Карточка";
    details.addEventListener("click", () => loadAttemptDetail(attempt.id));
    row.append(name, meta, status, details);
    elements.recentStartsList.appendChild(row);
  });
}

const integrityEventLabels = {
  tab_hidden: "Уход с вкладки",
  window_blur: "Потеря фокуса",
  fullscreen_exit: "Выход из полноэкранного режима",
  fullscreen_required: "Полноэкранный режим не включён",
  guard_restored: "Режим восстановлен",
  page_hidden: "Страница скрыта или закрыта",
  capture_shortcut: "Нажат Print Screen — снимок не подтверждён",
  clipboard_paste: "Попытка вставки из буфера"
};

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
    elements.tourAnalyticsGrid.innerHTML = '<div class="muted">    .</div>';
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
        <span> : ${tour.attempts}</span>
        <span>: ${tour.completionRate}%</span>
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
    row.innerHTML = '<td colspan="5" class="muted">    .</td>';
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

  elements.suspiciousMeta.textContent = `: ${items.length}`;
  elements.suspiciousAttemptsBody.innerHTML = "";

  if (!items.length) {
    elements.suspiciousAttemptsBody.innerHTML =
      '<div class="muted">    .</div>';
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
        <strong>${escapeHtml(entry.participant?.fullName || " ")}</strong>
        <span class="pill"> ${entry.severity}</span>
      </div>
      <div class="muted">${escapeHtml(entry.participant?.institution || "  ")}  ${escapeHtml(entry.participant?.groupName || "  ")}</div>
      <div class="analytics-meta">
        <span>: ${escapeHtml(entry.status)}</span>
        <span>: ${entry.answeredCount} / ${entry.totalQuestions}</span>
        <span> : ${formatDurationMs(entry.averageTimeMs)}</span>
        <span> : ${formatDateTime(entry.lastActivityAt)}</span>
      </div>
      <ul class="flat-list suspicious-signals">${signals}</ul>
    `;
    elements.suspiciousAttemptsBody.appendChild(card);
  });
}

function formatAnswer(question, answer) {
  if (!answer || !answer.answerPayload) {
    return "  ";
  }

  const itemMap = mapById(question.items);
  const optionMap = mapById(question.options);

  if (question.type === "final_kitchen") {
    const dish = (question.dishes || []).find((entry) => entry.id === answer.answerPayload.dishId);
    if (!dish) return "Блюдо не найдено в выданном варианте";
    const selected = new Set(answer.answerPayload.selectedIngredientIds || []);
    return `${dish.title}\n${dish.items.filter((item) => selected.has(item.id)).map((item) => item.text).join(", ")}`;
  }

  if (question.type === "single_choice") {
    return optionMap.get(answer.answerPayload.selectedOptionId)?.text || " ";
  }

  if (question.type === "sequence_drag") {
    const sequence = Array.isArray(answer.answerPayload.sequence)
      ? answer.answerPayload.sequence
      : [];
    return (question.slots || [])
      .map((slot, index) => {
        const item = itemMap.get(sequence[index]);
        return `${slot.label}: ${item ? item.text : ""}`;
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
        return `${bucket.label}: ${values.length ? values.join(", ") : ""}`;
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
    : "    :    .";

  adminState.lastRefreshedAt = new Date();
  const diagnostics = summary.diagnostics || {};
  const capabilities = summary.capabilities || {};

  if (elements.backendBadge) {
    elements.backendBadge.textContent = `backend: ${capabilities.storageBackend || diagnostics.storageBackend || ""}`;
  }
  if (elements.diskBadge) {
    elements.diskBadge.textContent = diskEnabled ? " : " : " : ";
  }
  if (elements.diagVersion) {
    elements.diagVersion.textContent = diagnostics.appVersion || "";
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
    elements.diagActiveAttempts.textContent = String(summary.counts.activeAttempts ?? "");
  }
  if (elements.diagApiErrors) {
    elements.diagApiErrors.textContent = String(diagnostics.apiErrors ?? 0);
  }
  if (elements.diagLastApiError) {
    elements.diagLastApiError.textContent = diagnostics.lastApiErrorMessage
      ? `${diagnostics.lastApiErrorMessage}${diagnostics.lastApiErrorRoute ? ` (${diagnostics.lastApiErrorRoute})` : ""}`
      : "  ";
  }
  if (elements.diagDiskFolder) {
    elements.diagDiskFolder.textContent = capabilities.yandexDiskFolder || "";
  }
  if (elements.diagRefreshMode) {
    elements.diagRefreshMode.textContent = getRefreshModeLabel();
  }

  renderTourAnalytics(summary.tourAnalytics || []);
  renderInstitutionAnalytics(summary.institutionAnalytics || []);
  renderSuspiciousAttempts(summary.suspiciousAttempts || []);
  setPanelStatus("ready", " ");
}

async function loadSummary() {
  const summary = await adminApi("/api/admin/summary");
  renderSummary(summary);
  populateFilterControls();
}

async function loadAttempts() {
  adminState.attempts = await adminApi("/api/admin/attempts");
  renderRecentStarts(adminState.attempts);
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
    <span class="muted">${escapeHtml(data.attempt.participant.institution)}  ${escapeHtml(data.attempt.participant.groupName)}</span><br />
    <span class="muted">${escapeHtml(data.attempt.participant.mentorName || "  ")}</span><br />
    <span class="muted">: ${escapeHtml(data.attempt.status)}</span><br />
    <span class="muted">: ${summary.totalFinalScore} / ${summary.totalMaxScore}</span><br />
    <span class="muted">События контроля: ${data.attempt.integritySummary?.incidentCount || 0}</span><br />
    <span class="muted"> : ${escapeHtml((data.attempt.variantMeta.issuedQuestionIds || []).join(", "))}</span>
  `;
  detail.appendChild(top);

  if (Array.isArray(data.integrityEvents) && data.integrityEvents.length) {
    const integrityCard = document.createElement("section");
    integrityCard.className = "detail-card";
    integrityCard.innerHTML = `
      <h3>Журнал экзаменационного режима</h3>
      <p class="muted">События являются сигналами для проверки и не изменяют балл автоматически.</p>
      <div class="review-list">
        ${data.integrityEvents
          .map(
            (event) => `
              <div class="review-box">
                <strong>${escapeHtml(integrityEventLabels[event.eventType] || event.eventType || "Событие")}</strong>
                <div class="muted">${escapeHtml(event.receivedAt || event.occurredAt || "")}</div>
                <div>${escapeHtml(event.reason || "Без пояснения")}</div>
                ${event.questionId ? `<div class="muted">Вопрос: ${escapeHtml(event.questionId)}</div>` : ""}
              </div>`
          )
          .join("")}
      </div>
    `;
    detail.appendChild(integrityCard);
  }

  data.tours.forEach((tour) => {
    const card = document.createElement("section");
    card.className = "detail-card";
    card.innerHTML = `
      <h3>${escapeHtml(tour.code)}  ${escapeHtml(tour.title)}</h3>
      <p class="muted">${tour.questionCount}    ${tour.timeLimitMinutes}    ${tour.score ? `${tour.score.finalScore} / ${tour.score.maxScore}` : "0 / 0"}</p>
    `;

    tour.questions.forEach((question) => {
      const box = document.createElement("div");
      box.className = "review-box";
      box.innerHTML = `
        <div><strong>${escapeHtml(question.sourceId)}</strong>  ${escapeHtml(question.prompt)}</div>
        ${question.caseTitle ? `<div class="message">${escapeHtml(question.caseTitle)}</div>` : ""}
        ${question.scenario ? `<div class="muted">${escapeHtml(question.scenario)}</div>` : ""}
        <div class="muted"> :<pre>${escapeHtml(formatAnswer(question, question.answer))}</pre></div>
        <div class="muted"> :<pre>${escapeHtml(question.correctAnswer || "")}</pre></div>
        <div class="muted">: ${question.answer ? question.answer.finalScore : 0} / ${question.maxScore}</div>
        <div class="muted">  : ${question.log && question.log.timeSpentMs ? `${question.log.timeSpentMs} ` : " "}</div>
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

  if (adminState.refreshInFlight) {
    return;
  }

  adminState.lastRefreshMode = silent ? "auto" : "manual";
  adminState.refreshInFlight = true;
  setPanelStatus("refreshing", silent ? " " : " ");
  const selectedAttemptId = adminState.selectedAttemptId;

  try {
    await loadStoryRuns();
    await loadSummary();
    await loadAttempts();

    if (selectedAttemptId) {
      await loadAttemptDetail(selectedAttemptId, { preserveSelection: true });
    }
  } catch (error) {
    if (silent) {
      if (error.status === 401 || error.status === 403) {
        resetAdminSession("  .  .");
      } else {
        setPanelStatus("error", formatAdminError(error));
        showMessage(elements.exportMessage, `: ${formatAdminError(error)}`, "warning");
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
      throw new Error(data.message || " ");
    }

    adminState.token = "";
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
      ` : ${data.fileName}. : ${data.filePath}`,
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
      `       ${data.folder}.`,
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
  await registerServiceWorker();
  await loadPublicVersion();
  setPanelStatus("warning", " ");
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
  elements.navRating.addEventListener("click", () => {
    if (elements.panel.classList.contains("hidden")) {
      focusLoginCard();
      return;
    }
    scrollToBlock(elements.ratingSection);
    closeNavDrawer();
  });
  elements.navDetail.addEventListener("click", () => {
    if (elements.panel.classList.contains("hidden")) {
      focusLoginCard();
      return;
    }
    scrollToBlock(elements.detailSection);
    closeNavDrawer();
  });
  elements.navRefresh.addEventListener("click", () => {
    if (elements.panel.classList.contains("hidden")) {
      focusLoginCard();
      return;
    }
    refreshPanel();
    closeNavDrawer();
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

  try {
    await ensureAdminSession();
    showPanel();
    await refreshPanel();
    startAutoRefresh();
  } catch (error) {
    resetAdminSession();
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
