const state = {
  olympiad: null,
  participant: null,
  attempt: null,
  localDrafts: {},
  questionController: null,
  timerInterval: null,
  syncInterval: null,
  timingSnapshot: null,
  syncingAfterTimeout: false,
  syncInFlight: false,
  isSubmittingAnswer: false,
  isFinishingAttempt: false,
  deferredInstallPrompt: null,
  isOnline: navigator.onLine,
  transitionTimer: null
};

const elements = {
  navBack: document.getElementById("nav-back"),
  navHome: document.getElementById("nav-home"),
  navRegister: document.getElementById("nav-register"),
  navAttempt: document.getElementById("nav-attempt"),
  navResult: document.getElementById("nav-result"),
  networkStatus: document.getElementById("network-status"),
  installApp: document.getElementById("install-app"),
  heroSection: document.getElementById("hero-section"),
  heroTitle: document.getElementById("hero-title"),
  heroSubtitle: document.getElementById("hero-subtitle"),
  tourMeta: document.getElementById("tour-meta"),
  journeyMap: document.getElementById("journey-map"),
  journeyStatus: document.getElementById("journey-status"),
  journeyProgressLabel: document.getElementById("journey-progress-label"),
  journeyProgressHint: document.getElementById("journey-progress-hint"),
  journeyProgressFill: document.getElementById("journey-progress-fill"),
  installMessage: document.getElementById("install-message"),
  rulesList: document.getElementById("rules-list"),
  registrationForm: document.getElementById("registration-form"),
  fullName: document.getElementById("full-name"),
  institution: document.getElementById("institution"),
  groupName: document.getElementById("group-name"),
  mentorName: document.getElementById("mentor-name"),
  registrationMessage: document.getElementById("registration-message"),
  prestartMessage: document.getElementById("prestart-message"),
  startAttempt: document.getElementById("start-attempt"),
  prestartSection: document.getElementById("prestart-section"),
  attemptSection: document.getElementById("attempt-section"),
  resultSection: document.getElementById("result-section"),
  participantName: document.getElementById("participant-name"),
  participantMeta: document.getElementById("participant-meta"),
  timerTotal: document.getElementById("timer-total"),
  timerTour: document.getElementById("timer-tour"),
  progressGlobal: document.getElementById("progress-global"),
  progressTour: document.getElementById("progress-tour"),
  progressGlobalFill: document.getElementById("progress-global-fill"),
  progressTourFill: document.getElementById("progress-tour-fill"),
  participantModeBadge: document.getElementById("participant-mode-badge"),
  participantStageBadge: document.getElementById("participant-stage-badge"),
  participantStabilityBadge: document.getElementById("participant-stability-badge"),
  questionTransitionBanner: document.getElementById("question-transition-banner"),
  tourCode: document.getElementById("tour-code"),
  tourTitle: document.getElementById("tour-title"),
  tourDescription: document.getElementById("tour-description"),
  tourLimit: document.getElementById("tour-limit"),
  questionCard: document.getElementById("question-card"),
  questionCase: document.getElementById("question-case"),
  questionPoints: document.getElementById("question-points"),
  questionPrompt: document.getElementById("question-prompt"),
  questionNote: document.getElementById("question-note"),
  questionBody: document.getElementById("question-body"),
  submitAnswer: document.getElementById("submit-answer"),
  finishAttempt: document.getElementById("finish-attempt"),
  attemptSaveStatus: document.getElementById("attempt-save-status"),
  attemptSyncMeta: document.getElementById("attempt-sync-meta"),
  attemptMessage: document.getElementById("attempt-message"),
  resultEyebrow: document.getElementById("result-eyebrow"),
  resultTitle: document.getElementById("result-title"),
  resultSubtitle: document.getElementById("result-subtitle"),
  resultAward: document.getElementById("result-award"),
  resultOverview: document.getElementById("result-overview"),
  resultNext: document.getElementById("result-next"),
  resultTours: document.getElementById("result-tours"),
  appVersionLabel: document.getElementById("app-version-label")
};

function setButtonAvailability(button, enabled, hint = "") {
  if (!button) {
    return;
  }

  button.disabled = !enabled;
  if (!enabled && hint) {
    button.title = hint;
  } else {
    button.removeAttribute("title");
  }
}

function refreshNavigationState() {
  const attemptActive = Boolean(state.attempt && state.attempt.status === "in_progress");
  const resultVisible =
    Boolean(state.attempt) && !elements.resultSection.classList.contains("hidden");

  setButtonAvailability(
    elements.navRegister,
    !attemptActive && !resultVisible,
    "Регистрация доступна до начала попытки."
  );
  setButtonAvailability(
    elements.navAttempt,
    attemptActive,
    "Текущий тур появится после запуска попытки."
  );
  setButtonAvailability(
    elements.navResult,
    Boolean(state.attempt && state.attempt.status !== "in_progress"),
    "Результат станет доступен после завершения попытки."
  );
}

function refreshAttemptControls() {
  const attemptInProgress = Boolean(state.attempt && state.attempt.status === "in_progress");
  const hasActiveQuestion = Boolean(
    attemptInProgress && state.attempt.currentQuestion && state.questionController
  );
  const isBusy = state.isSubmittingAnswer || state.isFinishingAttempt;

  elements.submitAnswer.disabled = !hasActiveQuestion || isBusy;
  elements.finishAttempt.disabled = !attemptInProgress || isBusy;

  if (state.isSubmittingAnswer) {
    elements.submitAnswer.textContent = "Сохранение ответа...";
    elements.finishAttempt.textContent = "Завершить досрочно";
    return;
  }

  if (state.isFinishingAttempt) {
    elements.finishAttempt.textContent = "Завершаем попытку...";
    elements.submitAnswer.textContent = "Ответить и далее";
    return;
  }

  elements.finishAttempt.textContent = "Завершить досрочно";

  if (!attemptInProgress) {
    elements.submitAnswer.textContent = "Ответить и далее";
    return;
  }

  elements.submitAnswer.textContent =
    state.attempt.progress.currentQuestionIndex >= state.attempt.progress.totalQuestions
      ? "Ответить и завершить"
      : "Ответить и далее";
}

function scrollToSection(section) {
  if (!section || section.classList.contains("hidden")) {
    return;
  }
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function goBackOrHome() {
  if (state.attempt) {
    scrollToSection(elements.heroSection);
    return;
  }

  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = "/";
}

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

function setAttemptSaveStatus(message, type = "idle") {
  if (!elements.attemptSaveStatus) {
    return;
  }

  elements.attemptSaveStatus.textContent = message;
  elements.attemptSaveStatus.className = `sync-badge ${type}`;
  setParticipantShellState();
}

function setAttemptSyncMeta(message) {
  if (!elements.attemptSyncMeta) {
    return;
  }

  elements.attemptSyncMeta.textContent = message;
}

function setShellBadge(element, text, tone = "neutral") {
  if (!element) {
    return;
  }

  element.textContent = text;
  element.className = `system-pill ${tone}`;
}

function setParticipantShellState() {
  const attempt = state.attempt;
  const hasAttempt = Boolean(attempt);
  const attemptInProgress = Boolean(hasAttempt && attempt.status === "in_progress");
  const questionIndex = attempt && attempt.progress ? attempt.progress.currentQuestionIndex : 0;
  const totalQuestions = attempt && attempt.progress ? attempt.progress.totalQuestions : 0;

  if (!hasAttempt) {
    setShellBadge(elements.participantModeBadge, "Режим: подготовка", "neutral");
    setShellBadge(elements.participantStageBadge, "Шаг: ждём старт", "neutral");
    setShellBadge(elements.participantStabilityBadge, "Сохранение: система готова", "neutral");
    return;
  }

  setShellBadge(
    elements.participantModeBadge,
    attemptInProgress ? "Режим: прохождение" : "Режим: результат",
    attemptInProgress ? "active" : "ready"
  );

  if (attemptInProgress && attempt.currentTour) {
    setShellBadge(
      elements.participantStageBadge,
      `Сейчас: ${attempt.currentTour.code} • ${attempt.progress.tourQuestionIndex}/${attempt.progress.tourQuestionCount}`,
      "active"
    );
  } else {
    setShellBadge(elements.participantStageBadge, "Сейчас: маршрут завершён", "ready");
  }

  if (!state.isOnline) {
    setShellBadge(elements.participantStabilityBadge, "Сохранение: связь нестабильна", "warning");
    return;
  }

  if (state.isSubmittingAnswer || state.isFinishingAttempt || state.syncInFlight) {
    setShellBadge(elements.participantStabilityBadge, "Сохранение: идёт отправка", "active");
    return;
  }

  if (attemptInProgress || totalQuestions > 0 || questionIndex > 0) {
    setShellBadge(elements.participantStabilityBadge, "Сохранение: всё в порядке", "ready");
    return;
  }

  setShellBadge(elements.participantStabilityBadge, "Сохранение: система готова", "neutral");
}

function getJourneyProgressModel() {
  if (!state.participant) {
    return {
      percent: 0,
      label: "Готовность маршрута: 0%",
      hint: "После регистрации система откроет первый тур."
    };
  }

  if (!state.attempt) {
    return {
      percent: 12,
      label: "Готовность маршрута: 12%",
      hint: "Регистрация завершена. Можно запускать первую часть олимпиады."
    };
  }

  if (state.attempt.status !== "in_progress") {
    return {
      percent: 100,
      label: "Готовность маршрута: 100%",
      hint: "Маршрут полностью завершен, результат зафиксирован в облаке."
    };
  }

  const totalQuestions = Math.max(1, state.attempt.progress.totalQuestions || 1);
  const completedQuestions = Math.max(0, (state.attempt.progress.currentQuestionIndex || 1) - 1);
  const percent = Math.min(96, Math.round(12 + (completedQuestions / totalQuestions) * 84));

  return {
    percent,
    label: `Готовность маршрута: ${percent}%`,
    hint: `Сейчас ${state.attempt.currentTour.code}, вопрос ${state.attempt.progress.tourQuestionIndex} из ${state.attempt.progress.tourQuestionCount}.`
  };
}

function updateJourneyProgress() {
  if (!elements.journeyProgressLabel || !elements.journeyProgressHint || !elements.journeyProgressFill) {
    return;
  }

  const progress = getJourneyProgressModel();
  elements.journeyProgressLabel.textContent = progress.label;
  elements.journeyProgressHint.textContent = progress.hint;
  elements.journeyProgressFill.style.width = `${progress.percent}%`;
}

function formatDurationLabel(durationMs) {
  const totalMinutes = Math.max(0, Math.round((Number(durationMs) || 0) / 60000));
  if (!totalMinutes) {
    return "менее 1 минуты";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) {
    return `${hours} ч ${minutes} мин`;
  }

  if (hours) {
    return `${hours} ч`;
  }

  return `${minutes} мин`;
}

function fallbackDiplomaByScore(score) {
  if (score >= 130) {
    return "Диплом I степени";
  }
  if (score >= 110) {
    return "Диплом II степени";
  }
  if (score >= 90) {
    return "Диплом III степени";
  }
  return "Сертификат участника";
}

function getResultAwardTone(label, scoresVisible) {
  if (!scoresVisible) {
    return "neutral";
  }

  if (label.includes("I степени")) {
    return "gold";
  }
  if (label.includes("II степени")) {
    return "silver";
  }
  if (label.includes("III степени")) {
    return "bronze";
  }

  return "neutral";
}

function renderResultOverview(summary, attempt, scoresVisible) {
  if (!elements.resultOverview) {
    return;
  }

  const diplomaLabel = scoresVisible
    ? attempt.diploma || fallbackDiplomaByScore(summary.totalFinalScore)
    : "Результат передан организатору";
  const completedTours = Array.isArray(summary.tourScores) ? summary.tourScores.length : 0;
  const metrics = [
    {
      label: "Баллы",
      value: scoresVisible ? `${summary.totalFinalScore} / ${summary.totalMaxScore}` : "скрыто",
      hint: scoresVisible
        ? "Баллы рассчитаны автоматически по итогам всех туров."
        : "До публикации итогов организатор скрывает баллы от участника."
    },
    {
      label: "Статус",
      value: diplomaLabel,
      hint: scoresVisible
        ? "Статус рассчитан автоматически по итоговому баллу."
        : "Статус участия уже зафиксирован в облаке."
    },
    {
      label: "Время",
      value: formatDurationLabel(summary.totalDurationMs),
      hint: "Показано суммарное время прохождения всей олимпиады."
    },
    {
      label: "Маршрут",
      value: `${completedTours} из ${completedTours} туров`,
      hint: "Все этапы пройдены и записаны в облаке."
    }
  ];

  elements.resultOverview.innerHTML = "";
  metrics.forEach((metric) => {
    const card = document.createElement("article");
    card.className = "result-stat";
    card.innerHTML = `
      <span>${metric.label}</span>
      <strong>${metric.value}</strong>
      <small>${metric.hint}</small>
    `;
    elements.resultOverview.appendChild(card);
  });
}

function renderResultNextSteps(scoresVisible) {
  if (!elements.resultNext) {
    return;
  }

  const nextSteps = scoresVisible
    ? [
        "Результат уже сохранён в облаке и доступен организатору в админке.",
        "Подробную раскладку по турам видит только организатор.",
        "Можно закрыть окно или вернуться на главную страницу олимпиады."
      ]
    : [
        "Попытка завершена, а результат уже сохранён в облаке.",
        "Итоговый балл и статус увидит организатор в панели управления.",
        "Можно закрыть окно или дождаться объявления итогов."
      ];

  elements.resultNext.innerHTML = `
    <h3>Что дальше</h3>
    <ul>
      ${nextSteps.map((step) => `<li>${step}</li>`).join("")}
    </ul>
  `;
}

function showQuestionTransition(message) {
  if (!elements.questionTransitionBanner || !message) {
    return;
  }

  clearTimeout(state.transitionTimer);
  elements.questionTransitionBanner.textContent = message;
  elements.questionTransitionBanner.classList.remove("hidden", "show");
  void elements.questionTransitionBanner.offsetWidth;
  elements.questionTransitionBanner.classList.add("show");

  state.transitionTimer = setTimeout(() => {
    elements.questionTransitionBanner.classList.remove("show");
    elements.questionTransitionBanner.classList.add("hidden");
  }, 1700);
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function loadAppVersion() {
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

function setInstallAvailability(visible, label = "Установить приложение") {
  if (!elements.installApp) {
    return;
  }

  elements.installApp.textContent = label;
  elements.installApp.classList.toggle("hidden", !visible);
}

function setNetworkStatus(isOnline = navigator.onLine) {
  if (!elements.networkStatus) {
    return;
  }

  state.isOnline = isOnline;
  elements.networkStatus.textContent = isOnline ? "Сеть: связь есть" : "Сеть: связь нестабильна";
  elements.networkStatus.className = `network-badge ${isOnline ? "online" : "offline"}`;
  setParticipantShellState();
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js?v=1.5.0");
  } catch (error) {
    // PWA layer is optional; the olympiad keeps working without service worker support.
  }
}

function setupInstallPrompt() {
  if (!elements.installApp) {
    return;
  }

  setInstallAvailability(false);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    setInstallAvailability(true);
    showMessage(
      elements.installMessage,
      "Олимпиаду можно установить как приложение на ноутбук или планшет.",
      "success"
    );
  });

  window.addEventListener("appinstalled", () => {
    state.deferredInstallPrompt = null;
    setInstallAvailability(false);
    showMessage(elements.installMessage, "Приложение установлено на устройство.", "success");
  });

  elements.installApp.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) {
      showMessage(
        elements.installMessage,
        "Если кнопка установки неактивна, используйте установку приложения через меню браузера.",
        "warning"
      );
      return;
    }

    state.deferredInstallPrompt.prompt();
    const choice = await state.deferredInstallPrompt.userChoice.catch(() => null);
    state.deferredInstallPrompt = null;
    setInstallAvailability(false);

    if (choice && choice.outcome === "accepted") {
      showMessage(elements.installMessage, "Приложение готово к использованию.", "success");
      return;
    }

    showMessage(elements.installMessage, "Установку можно повторить позже.", "warning");
  });
}

function formatApiError(error, fallback = "Ошибка запроса") {
  if (!error) {
    return fallback;
  }

  if (typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}

function isRetriableError(error) {
  if (!error) {
    return false;
  }

  if (error.status === 0 || error.status === 408 || error.status === 429) {
    return true;
  }

  if (typeof error.status === "number" && error.status >= 500) {
    return true;
  }

  const message = formatApiError(error, "").toLowerCase();
  return (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("сервером") ||
    message.includes("временно") ||
    message.includes("подождите")
  );
}

async function requestWithRetry(task, options = {}) {
  const attempts = Math.max(1, Number(options.attempts) || 1);
  const pauseMs = Math.max(0, Number(options.pauseMs) || 1200);
  let lastError = null;

  for (let attemptIndex = 1; attemptIndex <= attempts; attemptIndex += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      const shouldRetry = attemptIndex < attempts && isRetriableError(error);
      if (!shouldRetry) {
        break;
      }

      if (typeof options.onRetry === "function") {
        options.onRetry(error, attemptIndex + 1, attempts);
      }

      await delay(pauseMs);
    }
  }

  throw lastError || new Error("Не удалось выполнить запрос.");
}

async function api(path, options = {}) {
  let response;

  try {
    response = await fetch(path, {
      headers: {
        "Content-Type": "application/json"
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

function rememberDraft(questionId, answerPayload) {
  if (!questionId) {
    return;
  }
  state.localDrafts[questionId] = answerPayload;
}

function clearDraft(questionId) {
  if (!questionId) {
    return;
  }
  delete state.localDrafts[questionId];
}

function captureCurrentDraft() {
  const question = state.attempt && state.attempt.currentQuestion;
  if (!question || !state.questionController || !state.questionController.getAnswer) {
    return;
  }
  rememberDraft(question.id, state.questionController.getAnswer());
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function participantFromForm() {
  return {
    fullName: elements.fullName.value.trim(),
    institution: elements.institution.value.trim(),
    groupName: elements.groupName.value.trim(),
    mentorName: elements.mentorName.value.trim()
  };
}

function renderHero() {
  elements.heroTitle.textContent = state.olympiad.title;
  elements.heroSubtitle.textContent = state.olympiad.description;
  elements.tourMeta.innerHTML = "";

  (state.olympiad.tours || []).forEach((tour) => {
    const pill = document.createElement("div");
    pill.className = "pill";
    pill.textContent = `${tour.code}: ${tour.timeLimitMinutes} мин • ${tour.maxScore} баллов`;
    elements.tourMeta.appendChild(pill);
  });

  renderJourneyMap();
}

function renderRules() {
  const rules = [
    `Общий лимит времени: ${state.olympiad.durationMinutes} минут.`,
    "Каждому участнику автоматически собирается свой индивидуальный вариант.",
    "Один вопрос показывается на одном экране. Вернуться к предыдущему вопросу нельзя.",
    "Варианты ответа и порядок заданий перемешиваются системой автоматически.",
    "Все задания проверяются автоматически, без ручной экспертной проверки.",
    "Правильные ответы участнику после завершения не показываются."
  ];

  elements.rulesList.innerHTML = "";
  rules.forEach((rule) => {
    const item = document.createElement("li");
    item.textContent = rule;
    elements.rulesList.appendChild(item);
  });
}

function renderParticipant() {
  if (!state.participant) {
    renderJourneyMap();
    return;
  }

  elements.participantName.textContent = state.participant.fullName;
  const meta = [state.participant.institution, state.participant.groupName];
  if (state.participant.mentorName) {
    meta.push(`Наставник: ${state.participant.mentorName}`);
  }
  elements.participantMeta.textContent = meta.join(" • ");
  renderJourneyMap();
}

function buildJourneySteps() {
  const tours = (state.olympiad && state.olympiad.tours) || [];
  return [
    {
      id: "register",
      label: "Регистрация",
      description: "Сохранение данных участника"
    },
    ...tours.map((tour) => ({
      id: tour.id,
      label: tour.code,
      description: tour.title
    })),
    {
      id: "result",
      label: "Финиш",
      description: "Итоговый экран и фиксация результата"
    }
  ];
}

function renderJourneyMap() {
  if (!elements.journeyMap || !elements.journeyStatus || !state.olympiad) {
    return;
  }

  const steps = buildJourneySteps();
  const completed = new Set();
  let currentId = "register";
  let statusText = "Сначала сохраните данные участника.";

  if (state.participant) {
    completed.add("register");
    statusText = "Регистрация сохранена. Можно запускать первый тур.";
  }

  if (state.attempt) {
    if (state.attempt.status === "in_progress" && state.attempt.currentTour) {
      currentId = state.attempt.currentTour.id;
      const currentOrder = Number(state.attempt.currentTour.order) || 0;
      ((state.olympiad && state.olympiad.tours) || []).forEach((tour) => {
        if ((Number(tour.order) || 0) < currentOrder) {
          completed.add(tour.id);
        }
      });
      statusText = `${state.attempt.currentTour.code}: вопрос ${state.attempt.progress.tourQuestionIndex} из ${state.attempt.progress.tourQuestionCount}.`;
    } else if (state.attempt.status !== "in_progress") {
      currentId = "result";
      ((state.olympiad && state.olympiad.tours) || []).forEach((tour) => completed.add(tour.id));
      completed.add("result");
      statusText = "Маршрут завершён. Результат зафиксирован в облаке.";
    }
  }

  elements.journeyStatus.textContent = statusText;
  elements.journeyMap.innerHTML = "";

  steps.forEach((step) => {
    const isCurrent = step.id === currentId;
    const isComplete = completed.has(step.id);
    const isLocked = !isCurrent && !isComplete && !(step.id === "register" && !state.participant);
    const card = document.createElement("article");
    card.className = `journey-node${isCurrent ? " current" : ""}${isComplete ? " complete" : ""}${isLocked ? " locked" : ""}${step.id === "result" ? " journey-node-result" : ""}`;
    card.innerHTML = `
      <span class="journey-node-state">${isCurrent ? "Сейчас" : isComplete ? "Готово" : isLocked ? "Впереди" : "Старт"}</span>
      <b>${step.label}</b>
      <small>${step.description}</small>
    `;
    elements.journeyMap.appendChild(card);
  });

  updateJourneyProgress();
}

function saveTimingSnapshot(attempt) {
  state.timingSnapshot = {
    syncedAt: Date.now(),
    totalRemainingMs: attempt.timing ? attempt.timing.totalRemainingMs : 0,
    tourRemainingMs: attempt.timing ? attempt.timing.tourRemainingMs : 0
  };
}

function readDragPayload(event) {
  try {
    return JSON.parse(event.dataTransfer.getData("text/plain"));
  } catch (error) {
    return null;
  }
}

function bindDragSource(node, questionId, itemId) {
  node.draggable = true;
  node.addEventListener("dragstart", (event) => {
    node.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ questionId, itemId })
    );
  });
  node.addEventListener("dragend", () => {
    node.classList.remove("is-dragging");
  });
}

function bindDropZone(node, questionId, onDrop) {
  node.addEventListener("dragover", (event) => {
    const payload = readDragPayload(event);
    if (!payload || payload.questionId !== questionId) {
      return;
    }
    event.preventDefault();
    node.classList.add("is-over");
  });

  node.addEventListener("dragleave", () => {
    node.classList.remove("is-over");
  });

  node.addEventListener("drop", (event) => {
    const payload = readDragPayload(event);
    node.classList.remove("is-over");
    if (!payload || payload.questionId !== questionId) {
      return;
    }
    event.preventDefault();
    onDrop(payload.itemId);
  });
}

function createChip(item, questionId, handlers = {}) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "drag-chip";
  chip.textContent = item.text;
  bindDragSource(chip, questionId, item.id);
  if (handlers.onClick) {
    chip.addEventListener("click", (event) => {
      event.stopPropagation();
      handlers.onClick(item.id);
    });
  }
  if (handlers.isPlaced) {
    chip.classList.add("placed");
  }
  return chip;
}

function renderSingleChoice(question) {
  const wrapper = document.createElement("div");
  wrapper.className = "options";
  const savedAnswer = question.savedAnswer ? question.savedAnswer.selectedOptionId : null;

  (question.options || []).forEach((option) => {
    const label = document.createElement("label");
    label.className = "option";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = question.id;
    input.value = option.id;
    input.checked = savedAnswer === option.id;

    const text = document.createElement("span");
    text.textContent = option.text;

    label.append(input, text);
    wrapper.appendChild(label);
  });

  wrapper.addEventListener("change", () => {
    const selected = wrapper.querySelector(`input[name="${question.id}"]:checked`);
    rememberDraft(question.id, {
      selectedOptionId: selected ? selected.value : null
    });
  });

  elements.questionBody.appendChild(wrapper);
  return {
    getAnswer() {
      const selected = wrapper.querySelector(`input[name="${question.id}"]:checked`);
      return {
        selectedOptionId: selected ? selected.value : null
      };
    }
  };
}

function renderSequenceDrag(question) {
  const itemMap = new Map((question.items || []).map((item) => [item.id, item]));
  const sequence = (question.slots || []).map(() => null);
  let activeSlotIndex = 0;

  if (question.savedAnswer && Array.isArray(question.savedAnswer.sequence)) {
    question.savedAnswer.sequence.forEach((itemId, index) => {
      if (index < sequence.length && itemMap.has(itemId)) {
        sequence[index] = itemId;
      }
    });
  }

  const firstEmptySlotIndex = () => {
    const index = sequence.findIndex((value) => value === null);
    return index >= 0 ? index : 0;
  };

  activeSlotIndex = firstEmptySlotIndex();

  function returnToBank(itemId) {
    const index = sequence.findIndex((value) => value === itemId);
    if (index >= 0) {
      sequence[index] = null;
      activeSlotIndex = index;
      rememberDraft(question.id, { sequence: [...sequence] });
      render();
    }
  }

  function placeIntoSlot(itemId, slotIndex) {
    if (slotIndex < 0 || slotIndex >= sequence.length) {
      return;
    }
    const previousIndex = sequence.findIndex((value) => value === itemId);
    if (previousIndex >= 0) {
      sequence[previousIndex] = null;
    }
    sequence[slotIndex] = itemId;
    activeSlotIndex = firstEmptySlotIndex();
    rememberDraft(question.id, { sequence: [...sequence] });
    render();
  }

  function setActiveSlot(slotIndex) {
    activeSlotIndex = slotIndex;
    render();
  }

  function render() {
    elements.questionBody.innerHTML = "";
    const layout = document.createElement("div");
    layout.className = "drag-layout";

    const bank = document.createElement("section");
    bank.className = "drag-bank";
    bank.innerHTML = `<div class="drag-bank-header">Карточки</div>`;
    const bankItems = document.createElement("div");
    bankItems.className = "drag-bank-items";
    const freeItems = (question.items || []).filter((item) => !sequence.includes(item.id));

    if (!freeItems.length) {
      const empty = document.createElement("div");
      empty.className = "drop-slot-empty";
      empty.textContent = "Все шаги заполнены.";
      bankItems.appendChild(empty);
    } else {
      freeItems.forEach((item) =>
        bankItems.appendChild(
          createChip(item, question.id, {
            onClick: () => placeIntoSlot(item.id, activeSlotIndex)
          })
        )
      );
    }

    bindDropZone(bankItems, question.id, returnToBank);
    bank.appendChild(bankItems);

    const slots = document.createElement("div");
    slots.className = "drop-grid";
    const progress = document.createElement("div");
    progress.className = "interaction-summary";
    progress.textContent = `Заполнено шагов: ${sequence.filter(Boolean).length} из ${
      (question.slots || []).length
    }`;
    layout.append(bank, progress, slots);
    (question.slots || []).forEach((slot, index) => {
      const slotNode = document.createElement("div");
      slotNode.className = `drop-slot${index === activeSlotIndex ? " is-active" : ""}`;
      slotNode.innerHTML = `<div class="drop-slot-label">${slot.label}</div>`;
      const body = document.createElement("div");
      body.className = "drop-slot-body";
      body.addEventListener("click", () => setActiveSlot(index));

      const itemId = sequence[index];
      if (itemId && itemMap.has(itemId)) {
        body.appendChild(
          createChip(itemMap.get(itemId), question.id, {
            onClick: returnToBank,
            isPlaced: true
          })
        );
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "drop-slot-empty";
        placeholder.textContent = "Перетащите карточку или выберите слот и нажмите на карточку";
        body.appendChild(placeholder);
      }

      bindDropZone(body, question.id, (draggedId) => placeIntoSlot(draggedId, index));
      slotNode.appendChild(body);
      slots.appendChild(slotNode);
    });

    elements.questionBody.appendChild(layout);
  }

  render();

  return {
    getAnswer() {
      return { sequence: [...sequence] };
    }
  };
}

function renderBucketController(question) {
  const itemMap = new Map((question.items || []).map((item) => [item.id, item]));
  const placements = {};
  let activeBucketId = question.buckets && question.buckets[0] ? question.buckets[0].id : null;
  (question.items || []).forEach((item) => {
    placements[item.id] = null;
  });

  if (question.savedAnswer && question.savedAnswer.buckets) {
    Object.entries(question.savedAnswer.buckets).forEach(([itemId, bucketId]) => {
      if (itemMap.has(itemId)) {
        placements[itemId] = bucketId;
      }
    });
  }

  function returnToBank(itemId) {
    placements[itemId] = null;
    rememberDraft(question.id, {
      buckets: Object.fromEntries(
        Object.entries(placements).filter(([, bucketId]) => Boolean(bucketId))
      )
    });
    render();
  }

  function moveToBucket(itemId, bucketId) {
    if (!bucketId) {
      return;
    }
    placements[itemId] = bucketId;
    activeBucketId = bucketId;
    rememberDraft(question.id, {
      buckets: Object.fromEntries(
        Object.entries(placements).filter(([, currentBucketId]) => Boolean(currentBucketId))
      )
    });
    render();
  }

  function setActiveBucket(bucketId) {
    activeBucketId = bucketId;
    render();
  }

  function render() {
    elements.questionBody.innerHTML = "";
    const layout = document.createElement("div");
    layout.className = "drag-layout";

    const bank = document.createElement("section");
    bank.className = "drag-bank";
    bank.innerHTML = `<div class="drag-bank-header">Банк карточек</div>`;
    const bankItems = document.createElement("div");
    bankItems.className = "drag-bank-items";

    const freeItems = (question.items || []).filter((item) => !placements[item.id]);
    if (!freeItems.length) {
      const empty = document.createElement("div");
      empty.className = "drop-slot-empty";
      empty.textContent = "Все карточки распределены.";
      bankItems.appendChild(empty);
    } else {
      freeItems.forEach((item) =>
        bankItems.appendChild(
          createChip(item, question.id, {
            onClick: () => moveToBucket(item.id, activeBucketId)
          })
        )
      );
    }

    bindDropZone(bankItems, question.id, returnToBank);
    bank.appendChild(bankItems);

    const bucketGrid = document.createElement("div");
    bucketGrid.className = "bucket-grid";
    const progress = document.createElement("div");
    progress.className = "interaction-summary";
    progress.textContent = `Распределено карточек: ${
      Object.values(placements).filter(Boolean).length
    } из ${(question.items || []).length}`;
    layout.append(bank, progress, bucketGrid);

    (question.buckets || []).forEach((bucket) => {
      const bucketNode = document.createElement("div");
      bucketNode.className = `bucket-column${bucket.id === activeBucketId ? " is-active" : ""}`;
      const bucketCount = (question.items || []).filter(
        (item) => placements[item.id] === bucket.id
      ).length;
      bucketNode.innerHTML = `<div class="drop-slot-label">${bucket.label} <span class="bucket-count">${bucketCount}</span></div>`;
      const body = document.createElement("div");
      body.className = "bucket-items";
      body.addEventListener("click", () => setActiveBucket(bucket.id));

      const bucketItems = (question.items || []).filter(
        (item) => placements[item.id] === bucket.id
      );
      if (!bucketItems.length) {
        const placeholder = document.createElement("div");
        placeholder.className = "drop-slot-empty";
        placeholder.textContent = "Перетащите карточки или выберите зону и нажмите на карточку";
        body.appendChild(placeholder);
      } else {
        bucketItems.forEach((item) =>
          body.appendChild(
            createChip(item, question.id, {
              onClick: returnToBank,
              isPlaced: true
            })
          )
        );
      }

      bindDropZone(body, question.id, (itemId) => moveToBucket(itemId, bucket.id));
      bucketNode.appendChild(body);
      bucketGrid.appendChild(bucketNode);
    });

    elements.questionBody.appendChild(layout);
  }

  render();

  return {
    getAnswer() {
      return {
        buckets: Object.fromEntries(
          Object.entries(placements).filter(([, bucketId]) => Boolean(bucketId))
        )
      };
    }
  };
}

function renderQuestion(question) {
  elements.questionBody.innerHTML = "";
  state.questionController = null;

  if (!question) {
    elements.questionPrompt.textContent = "Вопрос не загружен";
    elements.questionPoints.textContent = "0 баллов";
    hideMessage(elements.questionCase);
    elements.questionNote.classList.add("hidden");
    return;
  }

  const hydratedQuestion = {
    ...question,
    savedAnswer: question.savedAnswer || state.localDrafts[question.id] || null
  };

  elements.questionPrompt.textContent = hydratedQuestion.prompt;
  elements.questionPoints.textContent = `${hydratedQuestion.maxScore} баллов`;

  if (hydratedQuestion.caseTitle) {
    showMessage(
      elements.questionCase,
      `${hydratedQuestion.caseTitle} • вопрос ${hydratedQuestion.caseOrder} из ${hydratedQuestion.caseTotal}`,
      "success"
    );
  } else if (hydratedQuestion.scenario) {
    showMessage(elements.questionCase, hydratedQuestion.scenario, "success");
  } else {
    hideMessage(elements.questionCase);
  }

  const isInteractive = ["sequence_drag", "bucket_sort", "ingredient_matrix"].includes(
    hydratedQuestion.type
  );
  const interactionHint =
    hydratedQuestion.type === "sequence_drag"
      ? "Можно не только перетаскивать мышью, но и выбрать шаг кликом, а затем нажать на карточку."
      : isInteractive
        ? "Можно не только перетаскивать мышью, но и выбрать нужную зону кликом, а затем нажать на карточку."
        : "";
  const noteText = [hydratedQuestion.note, interactionHint].filter(Boolean).join(" ");

  if (noteText) {
    elements.questionNote.textContent = noteText;
    elements.questionNote.classList.remove("hidden");
  } else {
    elements.questionNote.classList.add("hidden");
  }

  elements.questionCard.classList.remove("question-enter");
  void elements.questionCard.offsetWidth;
  elements.questionCard.classList.add("question-enter");

  if (hydratedQuestion.type === "single_choice") {
    state.questionController = renderSingleChoice(hydratedQuestion);
  } else if (hydratedQuestion.type === "sequence_drag") {
    state.questionController = renderSequenceDrag(hydratedQuestion);
  } else if (
    hydratedQuestion.type === "bucket_sort" ||
    hydratedQuestion.type === "ingredient_matrix"
  ) {
    state.questionController = renderBucketController(hydratedQuestion);
  } else {
    const unsupported = document.createElement("div");
    unsupported.className = "message error";
    unsupported.textContent = "Этот тип вопроса не поддерживается интерфейсом.";
    elements.questionBody.appendChild(unsupported);
  }
}

function renderAttempt() {
  const attempt = state.attempt;
  const currentTour = attempt.currentTour;
  const currentQuestion = attempt.currentQuestion;

  renderParticipant();
  saveTimingSnapshot(attempt);

  elements.prestartSection.classList.add("hidden");
  elements.resultSection.classList.add("hidden");
  elements.attemptSection.classList.remove("hidden");
  refreshNavigationState();

  elements.progressGlobal.textContent = `Вопрос ${attempt.progress.currentQuestionIndex} из ${attempt.progress.totalQuestions}`;
  elements.progressGlobalFill.style.width = `${
    (attempt.progress.currentQuestionIndex / Math.max(1, attempt.progress.totalQuestions)) * 100
  }%`;
  if (currentTour) {
    elements.progressTour.textContent = `${currentTour.code} • вопрос ${attempt.progress.tourQuestionIndex} из ${attempt.progress.tourQuestionCount}`;
    elements.progressTourFill.style.width = `${
      (attempt.progress.tourQuestionIndex / Math.max(1, attempt.progress.tourQuestionCount)) * 100
    }%`;
    elements.tourCode.textContent = currentTour.code;
    elements.tourTitle.textContent = currentTour.title;
    elements.tourDescription.textContent = currentTour.description || "";
    elements.tourLimit.textContent = `${currentTour.timeLimitMinutes} минут`;
  } else {
    elements.progressTour.textContent = "Тур завершён";
    elements.tourCode.textContent = "FIN";
    elements.tourTitle.textContent = "Олимпиада завершена";
    elements.tourDescription.textContent = "";
    elements.tourLimit.textContent = "0 минут";
    elements.progressTourFill.style.width = "100%";
  }

  renderQuestion(currentQuestion);
  renderJourneyMap();
  refreshAttemptControls();
  elements.submitAnswer.textContent =
    attempt.progress.currentQuestionIndex >= attempt.progress.totalQuestions
      ? "Ответить и завершить"
      : "Ответить и далее";
}

function renderResult() {
  const summary = state.attempt.summary;
  const scoresVisible = summary.totalFinalScore !== null;
  const awardLabel = scoresVisible
    ? state.attempt.diploma || fallbackDiplomaByScore(summary.totalFinalScore)
    : "Итог сохранён";
  elements.attemptSection.classList.add("hidden");
  elements.resultSection.classList.remove("hidden");
  refreshNavigationState();
  elements.resultTours.innerHTML = "";

  if (elements.resultEyebrow) {
    elements.resultEyebrow.textContent = "Маршрут завершён";
  }

  if (elements.resultAward) {
    elements.resultAward.textContent = awardLabel;
    elements.resultAward.className = `result-award ${getResultAwardTone(awardLabel, scoresVisible)}`;
  }

  if (!scoresVisible) {
    elements.resultTitle.textContent = "Попытка завершена";
    elements.resultSubtitle.textContent =
      "Маршрут сохранён в облаке. Итоговый балл и статус увидит организатор в панели управления.";
  } else {
    elements.resultTitle.textContent = `Ваш результат: ${summary.totalFinalScore} из ${summary.totalMaxScore}`;
    elements.resultSubtitle.textContent =
      "Все ответы зафиксированы автоматически. Правильные ответы не показываются участнику до завершения олимпиады.";
  }

  renderResultOverview(summary, state.attempt, scoresVisible);
  renderResultNextSteps(scoresVisible);

  (summary.tourScores || []).forEach((tour) => {
    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <strong>${tour.code}</strong>
      <span>${tour.title}</span>
      <b>${tour.finalScore === null ? "результат скрыт" : `${tour.finalScore} / ${tour.maxScore}`}</b>
      <small>${tour.finalScore === null ? "Баллы по туру увидит организатор." : "Баллы рассчитаны автоматически."}</small>
    `;
    elements.resultTours.appendChild(card);
  });

  refreshAttemptControls();
  renderJourneyMap();
  setAttemptSaveStatus("Финиш принят. Результат сохранён в облаке.", "success");
  setAttemptSyncMeta(
    `Итог записан: ${formatDateTime(state.attempt.finishedAt || new Date())}`
  );
  requestAnimationFrame(() => scrollToSection(elements.resultSection));
}

function canSoftSyncAttempt(nextAttempt) {
  if (!state.attempt || !nextAttempt) {
    return false;
  }

  if (state.attempt.status !== "in_progress" || nextAttempt.status !== "in_progress") {
    return false;
  }

  const currentQuestionId =
    state.attempt.currentQuestion && state.attempt.currentQuestion.id;
  const nextQuestionId = nextAttempt.currentQuestion && nextAttempt.currentQuestion.id;

  if (!currentQuestionId || currentQuestionId !== nextQuestionId) {
    return false;
  }

  if (
    state.attempt.progress.currentQuestionIndex !== nextAttempt.progress.currentQuestionIndex ||
    state.attempt.progress.tourQuestionIndex !== nextAttempt.progress.tourQuestionIndex
  ) {
    return false;
  }

  return true;
}

function describeAttemptTransition(previousAttempt, nextAttempt) {
  if (!nextAttempt) {
    return "";
  }

  if (!previousAttempt && nextAttempt.status === "in_progress" && nextAttempt.currentTour) {
    return `Старт ${nextAttempt.currentTour.code}: маршрут открыт, можно отвечать.`;
  }

  if (
    previousAttempt &&
    previousAttempt.status === "in_progress" &&
    nextAttempt.status !== "in_progress"
  ) {
    return "Маршрут завершен. Итог сохранен в облаке.";
  }

  if (nextAttempt.status !== "in_progress" || !nextAttempt.currentTour) {
    return "";
  }

  const previousTourId = previousAttempt && previousAttempt.currentTour ? previousAttempt.currentTour.id : "";
  const nextTourId = nextAttempt.currentTour.id;

  if (previousTourId && previousTourId !== nextTourId) {
    return `Старт ${nextAttempt.currentTour.code}: ${nextAttempt.currentTour.title}.`;
  }

  const previousQuestionIndex =
    previousAttempt && previousAttempt.progress ? previousAttempt.progress.currentQuestionIndex : 0;
  const nextQuestionIndex = nextAttempt.progress ? nextAttempt.progress.currentQuestionIndex : 0;

  if (previousQuestionIndex && previousQuestionIndex !== nextQuestionIndex) {
    return `${nextAttempt.currentTour.code}: вопрос ${nextAttempt.progress.tourQuestionIndex} из ${nextAttempt.progress.tourQuestionCount}.`;
  }

  return "";
}

function applyAttemptState(attempt, options = {}) {
  const previousAttempt = state.attempt;
  const preserveQuestionRender =
    options.preserveQuestionRender && canSoftSyncAttempt(attempt);
  const transitionMessage = preserveQuestionRender
    ? ""
    : describeAttemptTransition(previousAttempt, attempt);
  state.attempt = attempt;
  if (!attempt) {
    setParticipantShellState();
    return;
  }

  if (attempt.status === "in_progress") {
    if (preserveQuestionRender) {
      saveTimingSnapshot(attempt);
      setParticipantShellState();
      updateJourneyProgress();
      return;
    }
    renderAttempt();
  } else {
    stopTimers();
    renderResult();
  }

  if (transitionMessage && attempt.status === "in_progress") {
    showQuestionTransition(transitionMessage);
  }

  setParticipantShellState();
}

function updateTimers() {
  if (!state.timingSnapshot) {
    return;
  }

  const elapsed = Date.now() - state.timingSnapshot.syncedAt;
  const totalRemaining = Math.max(0, state.timingSnapshot.totalRemainingMs - elapsed);
  const tourRemaining = Math.max(0, state.timingSnapshot.tourRemainingMs - elapsed);

  elements.timerTotal.textContent = formatTime(totalRemaining);
  elements.timerTour.textContent = formatTime(tourRemaining);

  if ((totalRemaining === 0 || tourRemaining === 0) && !state.syncingAfterTimeout) {
    state.syncingAfterTimeout = true;
    syncAttempt(true).finally(() => {
      state.syncingAfterTimeout = false;
    });
  }
}

function stopTimers() {
  clearInterval(state.timerInterval);
  clearInterval(state.syncInterval);
  state.timerInterval = null;
  state.syncInterval = null;
}

function startTimers() {
  stopTimers();
  updateTimers();
  state.timerInterval = setInterval(updateTimers, 1000);
  state.syncInterval = setInterval(() => syncAttempt(true), 10000);
}

async function syncAttempt(silent = false) {
  if (!state.attempt || state.isSubmittingAnswer || state.isFinishingAttempt || state.syncInFlight) {
    return;
  }

  state.syncInFlight = true;
  try {
    captureCurrentDraft();
    const data = await api(`/api/public/attempts/${state.attempt.id}/current`);
    applyAttemptState(data, { preserveQuestionRender: true });
    if (data.status === "in_progress") {
      updateTimers();
    }
    setAttemptSyncMeta(`Последняя проверка связи: ${formatDateTime(new Date())}`);
    if (!silent && !state.isSubmittingAnswer && !state.isFinishingAttempt) {
      setAttemptSaveStatus("Данные обновлены", "success");
    }
  } catch (error) {
    const message = formatApiError(error);
    setAttemptSyncMeta(`Проверка связи: ${message}`);
    setAttemptSaveStatus(
      silent ? "Связь нестабильна, обновим данные ещё раз" : "Не удалось обновить данные",
      silent ? "warning" : "error"
    );
    if (!silent) {
      showMessage(elements.attemptMessage, message, "error");
    }
  } finally {
    state.syncInFlight = false;
  }
}

async function handleRegistration(event) {
  event.preventDefault();
  hideMessage(elements.registrationMessage);
  hideMessage(elements.prestartMessage);

  try {
    const data = await api("/api/public/register", {
      method: "POST",
      body: JSON.stringify(participantFromForm())
    });

    state.participant = data.participant;
    renderParticipant();
    elements.startAttempt.disabled = data.alreadyCompleted;
    elements.startAttempt.textContent = data.activeAttemptId
      ? "Продолжить олимпиаду"
      : "Начать олимпиаду";

    if (data.alreadyCompleted) {
      elements.startAttempt.textContent = "Попытка завершена";
      refreshNavigationState();
      showMessage(
        elements.prestartMessage,
        "Для этого участника попытка уже завершена. Повторный старт недоступен.",
        "error"
      );
      return;
    }

    showMessage(
      elements.registrationMessage,
      data.activeAttemptId
        ? "Найдена незавершённая попытка. Можно продолжить."
        : "Данные участника сохранены. Можно начинать олимпиаду.",
      "success"
    );
    refreshNavigationState();
  } catch (error) {
    showMessage(elements.registrationMessage, error.message, "error");
  }
}

async function startAttempt() {
  hideMessage(elements.prestartMessage);
  hideMessage(elements.attemptMessage);
  setAttemptSaveStatus("Открываем маршрут...", "pending");
  setAttemptSyncMeta("Подбираем вариант и подключаемся к облаку...");

  try {
    const attempt = await requestWithRetry(
      () =>
        api("/api/public/attempts/start", {
          method: "POST",
          body: JSON.stringify({ participant: state.participant })
        }),
      {
        attempts: 2,
        pauseMs: 1000,
        onRetry() {
          setAttemptSaveStatus("Небольшой сбой. Повторяем запуск...", "warning");
        }
      }
    );
    state.participant = attempt.participant;
    elements.startAttempt.textContent = "Продолжить олимпиаду";
    applyAttemptState(attempt);
    startTimers();
    refreshAttemptControls();
    setAttemptSaveStatus("Маршрут открыт", "success");
    setAttemptSyncMeta(`Подключение подтверждено: ${formatDateTime(new Date())}`);
    showMessage(
      elements.attemptMessage,
      "Маршрут открыт. Ответы будут автоматически сохраняться в облаке.",
      "success"
    );
  } catch (error) {
    const message = formatApiError(error);
    setAttemptSaveStatus("Не удалось открыть маршрут", "error");
    setAttemptSyncMeta(`Запуск: ${message}`);
    showMessage(elements.prestartMessage, message, "error");
  }
}

async function submitAnswer() {
  if (!state.attempt || !state.questionController || state.isSubmittingAnswer || state.isFinishingAttempt) {
    return;
  }

  hideMessage(elements.attemptMessage);
  const previousQuestionId = state.attempt.currentQuestion && state.attempt.currentQuestion.id;
  const answerPayload = state.questionController.getAnswer();
  rememberDraft(previousQuestionId, answerPayload);
  state.isSubmittingAnswer = true;
  setAttemptSaveStatus("Отправляем ответ...", "pending");
  setAttemptSyncMeta("Ответ уходит в облако...");
  refreshAttemptControls();

  try {
    const data = await requestWithRetry(
      () =>
        api(`/api/public/attempts/${state.attempt.id}/answer`, {
          method: "POST",
          body: JSON.stringify({
            questionId: previousQuestionId,
            answerPayload
          })
        }),
      {
        attempts: 3,
        pauseMs: 1200,
        onRetry(error, nextAttempt, maxAttempts) {
          setAttemptSaveStatus(
            `Есть задержка. Повтор ${nextAttempt} из ${maxAttempts}...`,
            "warning"
          );
          setAttemptSyncMeta(`Повторная отправка: ${formatApiError(error)}`);
        }
      }
    );

    clearDraft(previousQuestionId);
    applyAttemptState(data);
    if (data.status === "in_progress") {
      startTimers();
      setAttemptSaveStatus("Ответ принят", "success");
    } else {
      setAttemptSaveStatus("Последний ответ принят. Маршрут завершён.", "success");
      showMessage(elements.attemptMessage, "Маршрут завершён.", "success");
    }
    setAttemptSyncMeta(`Ответ записан: ${formatDateTime(new Date())}`);
  } catch (error) {
    const message = formatApiError(error);
    setAttemptSaveStatus("Не удалось отправить ответ", "error");
    setAttemptSyncMeta(`Ошибка отправки: ${message}`);
    showMessage(elements.attemptMessage, message, "error");
  } finally {
    state.isSubmittingAnswer = false;
    refreshAttemptControls();
  }
}

async function finishAttempt() {
  if (!state.attempt || state.isSubmittingAnswer || state.isFinishingAttempt) {
    return;
  }

  state.isFinishingAttempt = true;
  hideMessage(elements.attemptMessage);
  setAttemptSaveStatus("Завершаем маршрут...", "pending");
  setAttemptSyncMeta("Фиксируем итоговый результат...");
  refreshAttemptControls();
  try {
    captureCurrentDraft();
    const data = await requestWithRetry(
      () =>
        api(`/api/public/attempts/${state.attempt.id}/finish`, {
          method: "POST"
        }),
      {
        attempts: 2,
        pauseMs: 1000,
        onRetry(error) {
          setAttemptSaveStatus("Подтверждаем завершение ещё раз...", "warning");
          setAttemptSyncMeta(`Завершение: ${formatApiError(error)}`);
        }
      }
    );
    state.localDrafts = {};
    applyAttemptState(data);
    setAttemptSaveStatus("Маршрут завершён и сохранён", "success");
    setAttemptSyncMeta(`Итог записан: ${formatDateTime(new Date())}`);
  } catch (error) {
    const message = formatApiError(error);
    setAttemptSaveStatus("Не удалось завершить маршрут", "error");
    setAttemptSyncMeta(`Завершение: ${message}`);
    showMessage(elements.attemptMessage, message, "error");
  } finally {
    state.isFinishingAttempt = false;
    refreshAttemptControls();
  }
}

async function init() {
  await loadAppVersion();
  state.olympiad = await api("/api/public/olympiad");
  await registerServiceWorker();
  renderHero();
  renderRules();
  setupInstallPrompt();
  setInstallAvailability(false);
  setNetworkStatus(navigator.onLine);
  setAttemptSaveStatus("Система готова к старту", "idle");
  setAttemptSyncMeta("Последняя проверка связи: —");
  refreshNavigationState();

  window.addEventListener("online", () => {
    setNetworkStatus(true);
    setAttemptSaveStatus("Связь восстановлена. Можно продолжать.", "success");
    if (state.attempt) {
      syncAttempt(true);
    }
  });
  window.addEventListener("offline", () => {
    setNetworkStatus(false);
    setAttemptSaveStatus("Связь нестабильна. Ответ попробуем отправить повторно.", "warning");
    setAttemptSyncMeta("Сервер временно недоступен.");
  });
  elements.navBack.addEventListener("click", goBackOrHome);
  elements.navHome.addEventListener("click", () => scrollToSection(elements.heroSection));
  elements.navRegister.addEventListener("click", () => {
    if (elements.prestartSection.classList.contains("hidden")) {
      scrollToSection(elements.heroSection);
      return;
    }
    scrollToSection(elements.prestartSection);
  });
  elements.navAttempt.addEventListener("click", () => {
    scrollToSection(
      state.attempt && state.attempt.status === "in_progress"
        ? elements.attemptSection
        : elements.heroSection
    );
  });
  elements.navResult.addEventListener("click", () => {
    scrollToSection(
      elements.resultSection.classList.contains("hidden")
        ? elements.heroSection
        : elements.resultSection
    );
  });
  elements.registrationForm.addEventListener("submit", handleRegistration);
  elements.startAttempt.addEventListener("click", startAttempt);
  elements.submitAnswer.addEventListener("click", submitAnswer);
  elements.finishAttempt.addEventListener("click", finishAttempt);
}

init().catch((error) => {
  showMessage(elements.registrationMessage, formatApiError(error), "error");
  setAttemptSaveStatus("Не удалось загрузить олимпиаду", "error");
  setAttemptSyncMeta(`Инициализация: ${formatApiError(error)}`);
});
