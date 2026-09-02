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
  pendingAnswerQueue: [],
  pendingFlushInFlight: false,
  pendingFlushRetryTimer: null,
  pendingQueueAttemptId: "",
  isSubmittingAnswer: false,
  isFinishingAttempt: false,
  deferredInstallPrompt: null,
  isOnline: navigator.onLine,
  transitionTimer: null,
  navDrawerOpen: false,
  examModeEnabled: false,
  examGuardActive: false,
  examGuardReason: "",
  examIncidents: 0,
  lastRestrictionNoticeAt: 0,
  blurGuardTimer: null
};

const elements = {
  navRibbon: document.getElementById("nav-ribbon"),
  navMenuToggle: document.getElementById("nav-menu-toggle"),
  navDrawer: document.getElementById("nav-drawer"),
  navBack: document.getElementById("nav-back"),
  navHome: document.getElementById("nav-home"),
  navRegister: document.getElementById("nav-register"),
  navAttempt: document.getElementById("nav-attempt"),
  navResult: document.getElementById("nav-result"),
  networkStatus: document.getElementById("network-status"),
  installApp: document.getElementById("install-app"),
  heroFormatBadge: document.getElementById("hero-format-badge"),
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
  startConsent: document.getElementById("start-consent"),
  startConsentHint: document.getElementById("start-consent-hint"),
  startAttempt: document.getElementById("start-attempt"),
  prestartSection: document.getElementById("prestart-section"),
  attemptSection: document.getElementById("attempt-section"),
  resultSection: document.getElementById("result-section"),
  participantName: document.getElementById("participant-name"),
  participantMeta: document.getElementById("participant-meta"),
  cockpitPaceCard: document.getElementById("cockpit-pace-card"),
  cockpitRouteCard: document.getElementById("cockpit-route-card"),
  cockpitAnswerCard: document.getElementById("cockpit-answer-card"),
  timerTotalBox: document.getElementById("timer-total-box"),
  timerTourBox: document.getElementById("timer-tour-box"),
  timerTotal: document.getElementById("timer-total"),
  timerTour: document.getElementById("timer-tour"),
  paceValue: document.getElementById("pace-value"),
  paceHint: document.getElementById("pace-hint"),
  routeRemainingValue: document.getElementById("route-remaining-value"),
  routeRemainingHint: document.getElementById("route-remaining-hint"),
  answerReadinessValue: document.getElementById("answer-readiness-value"),
  answerReadinessHint: document.getElementById("answer-readiness-hint"),
  progressGlobal: document.getElementById("progress-global"),
  progressTour: document.getElementById("progress-tour"),
  progressGlobalFill: document.getElementById("progress-global-fill"),
  progressTourFill: document.getElementById("progress-tour-fill"),
  participantModeBadge: document.getElementById("participant-mode-badge"),
  participantStageBadge: document.getElementById("participant-stage-badge"),
  participantExamBadge: document.getElementById("participant-exam-badge"),
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
  appVersionLabel: document.getElementById("app-version-label"),
  examGuardOverlay: document.getElementById("exam-guard-overlay"),
  examGuardTitle: document.getElementById("exam-guard-title"),
  examGuardMessage: document.getElementById("exam-guard-message"),
  examIncidentsBadge: document.getElementById("exam-incidents-badge"),
  examGuardReturn: document.getElementById("exam-guard-return")
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
  updateStartAvailability();
}

function refreshAttemptControls() {
  const attemptInProgress = Boolean(state.attempt && state.attempt.status === "in_progress");
  const hasActiveQuestion = Boolean(
    attemptInProgress && state.attempt.currentQuestion && state.questionController
  );
  const isBusy = state.isSubmittingAnswer || state.isFinishingAttempt;
  const isBlockedByGuard = attemptInProgress && state.examGuardActive;

  elements.submitAnswer.disabled = !hasActiveQuestion || isBusy || isBlockedByGuard;
  elements.finishAttempt.disabled = !attemptInProgress || isBusy || isBlockedByGuard;

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

  if (isBlockedByGuard) {
    elements.submitAnswer.textContent = "Вернитесь в режим";
    elements.finishAttempt.textContent = "Вернитесь в режим";
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
  closeNavDrawer();
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
  updateExamCockpit();
}

function setAttemptSyncMeta(message) {
  if (!elements.attemptSyncMeta) {
    return;
  }

  elements.attemptSyncMeta.textContent = message;
  updateExamCockpit();
}

function setShellBadge(element, text, tone = "neutral") {
  if (!element) {
    return;
  }

  element.textContent = text;
  element.className = `system-pill ${tone}`;
}

function isAttemptInProgress() {
  return Boolean(state.attempt && state.attempt.status === "in_progress");
}

function updateExamGuardUi() {
  if (elements.examIncidentsBadge) {
    elements.examIncidentsBadge.textContent = `Срабатываний: ${state.examIncidents}`;
  }

  if (elements.examGuardMessage) {
    elements.examGuardMessage.textContent =
      state.examGuardReason ||
      "Вернитесь в активное окно олимпиады и восстановите полноэкранный режим, чтобы продолжить.";
  }

  if (elements.examGuardOverlay) {
    elements.examGuardOverlay.classList.toggle("hidden", !state.examGuardActive);
  }

  document.body.classList.toggle("exam-mode-active", isAttemptInProgress());
}

function announceRestriction(message, tone = "warning") {
  const now = Date.now();
  if (now - state.lastRestrictionNoticeAt < 1400) {
    return;
  }
  state.lastRestrictionNoticeAt = now;
  setAttemptSaveStatus(message, tone);
  showMessage(elements.attemptMessage, message, tone);
}

function activateExamGuard(reason) {
  if (!isAttemptInProgress()) {
    return;
  }

  const nextReason = reason || "Олимпиада временно поставлена на контроль.";
  if (!state.examGuardActive || state.examGuardReason !== nextReason) {
    state.examIncidents += 1;
  }

  state.examGuardActive = true;
  state.examGuardReason = nextReason;
  updateExamGuardUi();
  refreshAttemptControls();
  setAttemptSaveStatus("Экзаменационный режим приостановлен", "warning");
  setAttemptSyncMeta("Вернитесь в активное окно олимпиады и восстановите полноэкранный режим.");
  showMessage(elements.attemptMessage, nextReason, "warning");
  updateExamCockpit();
}

function releaseExamGuard(message = "") {
  state.examGuardActive = false;
  state.examGuardReason = "";
  updateExamGuardUi();
  refreshAttemptControls();
  if (message) {
    setAttemptSaveStatus(message, "success");
    setAttemptSyncMeta(`Контроль восстановлен: ${formatDateTime(new Date())}`);
  }
  updateExamCockpit();
}

async function tryLockExamKeyboard() {
  if (!navigator.keyboard || typeof navigator.keyboard.lock !== "function") {
    return;
  }

  try {
    await navigator.keyboard.lock();
  } catch (error) {
    // Browser may refuse keyboard lock outside a user gesture. This is best-effort only.
  }
}

function isCompactNavigation() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function setNavDrawerOpen(open) {
  state.navDrawerOpen = Boolean(open && isCompactNavigation());
  if (elements.navRibbon) {
    elements.navRibbon.classList.toggle("is-open", state.navDrawerOpen);
  }
  if (elements.navMenuToggle) {
    elements.navMenuToggle.setAttribute("aria-expanded", state.navDrawerOpen ? "true" : "false");
    elements.navMenuToggle.textContent = state.navDrawerOpen ? "Закрыть меню" : "Меню";
  }
}

function closeNavDrawer() {
  setNavDrawerOpen(false);
}

function updateStartAvailability() {
  if (!elements.startAttempt) {
    return;
  }

  const blockedByCompletion = elements.startAttempt.dataset.lockReason === "completed";
  const hasParticipant = Boolean(state.participant);
  const consentGranted = !elements.startConsent || elements.startConsent.checked;

  elements.startAttempt.disabled = blockedByCompletion || !hasParticipant || !consentGranted;

  if (!elements.startConsentHint) {
    return;
  }

  if (blockedByCompletion) {
    elements.startConsentHint.textContent = "Повторный старт недоступен.";
  } else if (!hasParticipant) {
    elements.startConsentHint.textContent = "Сначала сохраните данные участника.";
  } else if (!consentGranted) {
    elements.startConsentHint.textContent = "Подтвердите готовность к старту.";
  } else {
    elements.startConsentHint.textContent = "Можно начинать.";
  }
}

function unlockExamKeyboard() {
  if (!navigator.keyboard || typeof navigator.keyboard.unlock !== "function") {
    return;
  }

  try {
    navigator.keyboard.unlock();
  } catch (error) {
    // Ignore unlock failures; the browser will release the lock when fullscreen ends.
  }
}

async function requestExamFullscreen(options = {}) {
  if (document.fullscreenElement) {
    await tryLockExamKeyboard();
    return true;
  }

  if (typeof document.documentElement.requestFullscreen !== "function") {
    return false;
  }

  try {
    await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    await tryLockExamKeyboard();
    return true;
  } catch (error) {
    if (!options.silent) {
      activateExamGuard("Включите полноэкранный режим, чтобы продолжить олимпиаду.");
    }
    return false;
  }
}

async function restoreExamMode() {
  if (!isAttemptInProgress()) {
    return true;
  }

  const fullscreenReady = await requestExamFullscreen({ silent: true });
  const focusReady = document.visibilityState === "visible" && document.hasFocus();

  if (fullscreenReady && focusReady) {
    releaseExamGuard("Контроль восстановлен. Можно продолжать.");
    return true;
  }

  activateExamGuard(
    !focusReady
      ? "Вернитесь в активное окно олимпиады, чтобы продолжить."
      : "Восстановите полноэкранный режим, чтобы продолжить."
  );
  return false;
}

function handleProtectedClipboard(event) {
  if (!isAttemptInProgress()) {
    return;
  }

  event.preventDefault();
  announceRestriction("Копирование и вырезание текста во время олимпиады отключены.");
}

function handleProtectedSelection(event) {
  if (!isAttemptInProgress()) {
    return;
  }

  event.preventDefault();
}

function handleProtectedContextMenu(event) {
  if (!isAttemptInProgress()) {
    return;
  }

  event.preventDefault();
  announceRestriction("Контекстное меню во время олимпиады отключено.");
}

function handleProtectedDragStart(event) {
  if (!isAttemptInProgress()) {
    return;
  }

  const dragNode = event.target && event.target.closest && event.target.closest(".drag-chip");
  if (dragNode) {
    return;
  }

  event.preventDefault();
}

function handleProtectedKeydown(event) {
  if (!isAttemptInProgress()) {
    return;
  }

  const key = String(event.key || "").toLowerCase();
  const withCtrl = event.ctrlKey || event.metaKey;
  const blockedCtrlKeys = new Set(["a", "c", "f", "j", "l", "n", "p", "r", "s", "t", "u", "w", "x"]);
  const blockedFunctionKeys = new Set(["f5", "f6", "f11", "f12"]);

  if (
    blockedFunctionKeys.has(key) ||
    (withCtrl && blockedCtrlKeys.has(key)) ||
    (withCtrl && event.shiftKey && ["c", "i", "j", "n"].includes(key))
  ) {
    event.preventDefault();
    event.stopPropagation();
    announceRestriction("Часть браузерных горячих клавиш временно отключена.");
  }
}

function handleExamVisibilityChange() {
  if (!isAttemptInProgress()) {
    return;
  }

  if (document.visibilityState !== "visible") {
    activateExamGuard("Окно олимпиады покинуло активную вкладку. Вернитесь в неё, чтобы продолжить.");
    return;
  }

  if (state.examGuardActive) {
    restoreExamMode();
  }
}

function handleExamWindowBlur() {
  if (!isAttemptInProgress()) {
    return;
  }

  clearTimeout(state.blurGuardTimer);
  state.blurGuardTimer = setTimeout(() => {
    if (isAttemptInProgress() && !document.hasFocus()) {
      activateExamGuard("Окно олимпиады потеряло фокус. Вернитесь к прохождению, чтобы продолжить.");
    }
  }, 160);
}

function handleExamWindowFocus() {
  clearTimeout(state.blurGuardTimer);
  if (isAttemptInProgress() && state.examGuardActive) {
    restoreExamMode();
  }
}

function handleExamFullscreenChange() {
  if (!isAttemptInProgress()) {
    return;
  }

  if (!document.fullscreenElement) {
    activateExamGuard("Полноэкранный режим выключен. Включите его снова, чтобы продолжить.");
    return;
  }

  if (state.examGuardActive) {
    restoreExamMode();
  }
}

function handleExamBeforeUnload(event) {
  if (!isAttemptInProgress()) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
}

function enableExamMode() {
  if (state.examModeEnabled) {
    updateExamGuardUi();
    return;
  }

  state.examModeEnabled = true;
  updateExamGuardUi();
  document.addEventListener("copy", handleProtectedClipboard, true);
  document.addEventListener("cut", handleProtectedClipboard, true);
  document.addEventListener("contextmenu", handleProtectedContextMenu, true);
  document.addEventListener("selectstart", handleProtectedSelection, true);
  document.addEventListener("dragstart", handleProtectedDragStart, true);
  document.addEventListener("keydown", handleProtectedKeydown, true);
  document.addEventListener("visibilitychange", handleExamVisibilityChange, true);
  document.addEventListener("fullscreenchange", handleExamFullscreenChange, true);
  window.addEventListener("blur", handleExamWindowBlur, true);
  window.addEventListener("focus", handleExamWindowFocus, true);
  window.addEventListener("beforeunload", handleExamBeforeUnload, true);
  requestExamFullscreen({ silent: true }).then((ok) => {
    if (!ok) {
      activateExamGuard("Включите полноэкранный режим, чтобы продолжить олимпиаду.");
    }
  });
}

function disableExamMode() {
  if (!state.examModeEnabled) {
    updateExamGuardUi();
    return;
  }

  state.examModeEnabled = false;
  state.examGuardActive = false;
  state.examGuardReason = "";
  clearTimeout(state.blurGuardTimer);
  document.removeEventListener("copy", handleProtectedClipboard, true);
  document.removeEventListener("cut", handleProtectedClipboard, true);
  document.removeEventListener("contextmenu", handleProtectedContextMenu, true);
  document.removeEventListener("selectstart", handleProtectedSelection, true);
  document.removeEventListener("dragstart", handleProtectedDragStart, true);
  document.removeEventListener("keydown", handleProtectedKeydown, true);
  document.removeEventListener("visibilitychange", handleExamVisibilityChange, true);
  document.removeEventListener("fullscreenchange", handleExamFullscreenChange, true);
  window.removeEventListener("blur", handleExamWindowBlur, true);
  window.removeEventListener("focus", handleExamWindowFocus, true);
  window.removeEventListener("beforeunload", handleExamBeforeUnload, true);
  unlockExamKeyboard();
  if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
    document.exitFullscreen().catch(() => {});
  }
  updateExamGuardUi();
}

function setParticipantShellState() {
  const attempt = state.attempt;
  const hasAttempt = Boolean(attempt);
  const attemptInProgress = Boolean(hasAttempt && attempt.status === "in_progress");
  const questionIndex = attempt && attempt.progress ? attempt.progress.currentQuestionIndex : 0;
  const totalQuestions = attempt && attempt.progress ? attempt.progress.totalQuestions : 0;

  if (!hasAttempt) {
    setShellBadge(elements.participantModeBadge, "Подготовка", "neutral");
    setShellBadge(elements.participantStageBadge, "Ожидание старта", "neutral");
    setShellBadge(elements.participantExamBadge, "Защищённый режим: ожидание", "neutral");
    setShellBadge(elements.participantStabilityBadge, "Сохранение готово", "neutral");
    updateExamGuardUi();
    return;
  }

  setShellBadge(
    elements.participantModeBadge,
    attemptInProgress ? "Прохождение" : "Результат",
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

  if (!attemptInProgress) {
    setShellBadge(elements.participantExamBadge, "Защищённый режим завершён", "ready");
  } else if (state.examGuardActive) {
    setShellBadge(
      elements.participantExamBadge,
      `Защищённый режим: контроль (${state.examIncidents})`,
      "warning"
    );
  } else {
    setShellBadge(
      elements.participantExamBadge,
      `Защищённый режим: активен (${state.examIncidents})`,
      "ready"
    );
  }

  if (!state.isOnline) {
    setShellBadge(elements.participantStabilityBadge, "Связь нестабильна", "warning");
    updateExamGuardUi();
    return;
  }

  if (state.isSubmittingAnswer || state.isFinishingAttempt || state.syncInFlight) {
    setShellBadge(elements.participantStabilityBadge, "Идёт сохранение", "active");
    updateExamGuardUi();
    return;
  }

  if (attemptInProgress || totalQuestions > 0 || questionIndex > 0) {
    setShellBadge(elements.participantStabilityBadge, "Данные сохранены", "ready");
    updateExamGuardUi();
    return;
  }

  setShellBadge(elements.participantStabilityBadge, "Сохранение готово", "neutral");
  updateExamGuardUi();
}

function getJourneyProgressModel() {
  if (!state.participant) {
    return {
      percent: 0,
      label: "Готовность: 0%",
      hint: "Сохраните данные участника."
    };
  }

  if (!state.attempt) {
    return {
      percent: 12,
      label: "Готовность: 12%",
      hint: "Регистрация завершена."
    };
  }

  if (state.attempt.status !== "in_progress") {
    return {
      percent: 100,
      label: "Готовность: 100%",
      hint: "Результат сохранён."
    };
  }

  const totalQuestions = Math.max(1, state.attempt.progress.totalQuestions || 1);
  const completedQuestions = Math.max(0, (state.attempt.progress.currentQuestionIndex || 1) - 1);
  const percent = Math.min(96, Math.round(12 + (completedQuestions / totalQuestions) * 84));

  return {
    percent,
    label: `Готовность: ${percent}%`,
    hint: `${state.attempt.currentTour.code} • ${state.attempt.progress.tourQuestionIndex}/${state.attempt.progress.tourQuestionCount}`
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

function hasMeaningfulAnswer(answer) {
  if (!answer) {
    return false;
  }

  if (typeof answer.selectedOptionId === "string" && answer.selectedOptionId.trim()) {
    return true;
  }

  if (Array.isArray(answer.order) && answer.order.length) {
    return true;
  }

  if (answer.buckets && typeof answer.buckets === "object") {
    return Object.keys(answer.buckets).length > 0;
  }

  return false;
}

function toneTimerBox(node, remainingMs) {
  if (!node) {
    return;
  }

  node.classList.remove("warning", "critical");
  if (remainingMs <= 120000) {
    node.classList.add("critical");
    return;
  }
  if (remainingMs <= 300000) {
    node.classList.add("warning");
  }
}

function setCockpitTone(node, tone = "neutral") {
  if (!node) {
    return;
  }
  node.classList.remove("neutral", "active", "warning");
  node.classList.add(tone);
}

function updateExamCockpit() {
  if (!elements.paceValue || !elements.routeRemainingValue || !elements.answerReadinessValue) {
    return;
  }

  const attempt = state.attempt;
  if (!attempt) {
    setCockpitTone(elements.cockpitPaceCard, "neutral");
    setCockpitTone(elements.cockpitRouteCard, "neutral");
    setCockpitTone(elements.cockpitAnswerCard, "neutral");
    elements.paceValue.textContent = "—";
    elements.paceHint.textContent = "После старта появится рекомендуемый темп на вопрос.";
    elements.routeRemainingValue.textContent = "—";
    elements.routeRemainingHint.textContent = "Система покажет, сколько вопросов осталось до финиша.";
    elements.answerReadinessValue.textContent = "Ожидание";
    elements.answerReadinessHint.textContent = "После выбора ответа здесь появится подсказка.";
    toneTimerBox(elements.timerTotalBox, Number.MAX_SAFE_INTEGER);
    toneTimerBox(elements.timerTourBox, Number.MAX_SAFE_INTEGER);
    return;
  }

  const totalQuestions = Math.max(1, attempt.progress?.totalQuestions || 1);
  const answeredQuestions = Math.max(0, (attempt.progress?.currentQuestionIndex || 1) - 1);
  const remainingQuestions = Math.max(0, totalQuestions - answeredQuestions);
  const totalRemainingMs = Math.max(0, state.timingSnapshot?.totalRemainingMs || 0);
  const tourRemainingMs = Math.max(0, state.timingSnapshot?.tourRemainingMs || 0);
  const recommendedPerQuestion = remainingQuestions
    ? Math.max(15, Math.round(totalRemainingMs / remainingQuestions / 1000))
    : 0;

  elements.paceValue.textContent = recommendedPerQuestion ? `${recommendedPerQuestion} сек/вопрос` : "Финиш";
  setCockpitTone(
    elements.cockpitPaceCard,
    recommendedPerQuestion > 75 ? "warning" : recommendedPerQuestion ? "active" : "neutral"
  );
  elements.paceHint.textContent = recommendedPerQuestion
    ? `Чтобы уложиться в лимит, держите темп около ${recommendedPerQuestion} сек. на оставшийся вопрос.`
    : "Маршрут завершён, темп больше не рассчитывается.";

  elements.routeRemainingValue.textContent = remainingQuestions ? `${remainingQuestions} вопросов` : "Финиш";
  setCockpitTone(
    elements.cockpitRouteCard,
    remainingQuestions > 0 ? "active" : "neutral"
  );
  elements.routeRemainingHint.textContent = remainingQuestions
    ? `Сейчас активен ${attempt.currentTour?.code || "T?"}. До завершения маршрута осталось ${remainingQuestions} вопросов.`
    : "Все туры закрыты, результат сохранён.";

  const currentAnswer = state.questionController?.getAnswer?.() || null;
  const savedAnswer =
    attempt.currentQuestion?.savedAnswer || state.localDrafts[attempt.currentQuestion?.id] || null;

  if (state.isSubmittingAnswer || state.isFinishingAttempt) {
    setCockpitTone(elements.cockpitAnswerCard, "active");
    elements.answerReadinessValue.textContent = "Отправляем";
    elements.answerReadinessHint.textContent = "Подождите, ответ уже уходит в облако.";
  } else if (hasMeaningfulAnswer(currentAnswer)) {
    setCockpitTone(elements.cockpitAnswerCard, "active");
    elements.answerReadinessValue.textContent = "Готов к отправке";
    elements.answerReadinessHint.textContent = "Ответ выбран. Можно нажимать «Ответить и далее».";
  } else if (hasMeaningfulAnswer(savedAnswer)) {
    setCockpitTone(elements.cockpitAnswerCard, "warning");
    elements.answerReadinessValue.textContent = "Черновик найден";
    elements.answerReadinessHint.textContent = "По этому вопросу уже есть сохранённый черновой ответ.";
  } else {
    setCockpitTone(elements.cockpitAnswerCard, "neutral");
    elements.answerReadinessValue.textContent = "Ожидание";
    elements.answerReadinessHint.textContent = "Выберите вариант или заполните интерактивный блок.";
  }

  toneTimerBox(elements.timerTotalBox, totalRemainingMs || Number.MAX_SAFE_INTEGER);
  toneTimerBox(elements.timerTourBox, tourRemainingMs || Number.MAX_SAFE_INTEGER);
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
        "Попытка завершена, результат сохранён в облаке.",
        "Организатор увидит итоговый балл и статус в панели управления.",
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
  elements.networkStatus.textContent = isOnline ? "Онлайн" : "Офлайн";
  elements.networkStatus.className = `network-badge ${isOnline ? "online" : "offline"}`;
  setParticipantShellState();
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js?v=1.6.87");
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      registration.update().catch(() => {});
    }
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

function cloneClientValue(value) {
  return globalThis.structuredClone
    ? globalThis.structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function pendingQueueStorageKey(attemptId) {
  return attemptId ? `nko_pending_answers_${attemptId}` : "";
}

function persistPendingAnswerQueue() {
  const storageKey = pendingQueueStorageKey(state.pendingQueueAttemptId);
  if (!storageKey) {
    return;
  }

  if (!state.pendingAnswerQueue.length) {
    localStorage.removeItem(storageKey);
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(state.pendingAnswerQueue));
}

function loadPendingAnswerQueue(attemptId) {
  const storageKey = pendingQueueStorageKey(attemptId);
  if (!storageKey) {
    return [];
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    localStorage.removeItem(storageKey);
    return [];
  }
}

function setPendingQueueForAttempt(attemptId, queue) {
  state.pendingQueueAttemptId = attemptId || "";
  state.pendingAnswerQueue = Array.isArray(queue) ? queue : [];
  persistPendingAnswerQueue();
}

function clearPendingAnswerQueue(attemptId = state.pendingQueueAttemptId) {
  const storageKey = pendingQueueStorageKey(attemptId);
  if (storageKey) {
    localStorage.removeItem(storageKey);
  }
  if (!attemptId || attemptId === state.pendingQueueAttemptId) {
    state.pendingQueueAttemptId = attemptId ? "" : state.pendingQueueAttemptId;
    state.pendingAnswerQueue = [];
  }
}

function hasPendingAnswers() {
  return state.pendingAnswerQueue.length > 0;
}

function cancelPendingFlushRetry() {
  if (!state.pendingFlushRetryTimer) {
    return;
  }
  clearTimeout(state.pendingFlushRetryTimer);
  state.pendingFlushRetryTimer = null;
}

function schedulePendingFlushRetry() {
  cancelPendingFlushRetry();
  state.pendingFlushRetryTimer = setTimeout(() => {
    state.pendingFlushRetryTimer = null;
    flushPendingAnswers();
  }, 2500);
}

function attachPendingQueue(attempt) {
  if (!attempt || !attempt.id) {
    setPendingQueueForAttempt("", []);
    return;
  }

  const shouldReloadQueue = state.pendingQueueAttemptId !== attempt.id;
  if (shouldReloadQueue) {
    setPendingQueueForAttempt(attempt.id, loadPendingAnswerQueue(attempt.id));
  }

  if (attempt.status !== "in_progress") {
    clearPendingAnswerQueue(attempt.id);
  }
}

function buildProgressFromRoute(route, nextStepIndex) {
  const questions = Array.isArray(route?.questions) ? route.questions : [];
  const tours = Array.isArray(route?.tours) ? route.tours : [];
  const totalQuestions = questions.length;
  const safeStepIndex = Math.max(0, Math.min(nextStepIndex, Math.max(0, totalQuestions - 1)));
  const nextQuestion = questions[safeStepIndex] || null;
  const nextTour = nextQuestion
    ? tours.find((tour) => tour.id === nextQuestion.tourId) || null
    : null;
  const tourQuestionIndex = nextQuestion ? nextQuestion.sequenceInTour : nextTour?.questionCount || 0;
  const tourQuestionCount = nextTour?.questionCount || 0;

  return {
    currentQuestionIndex: nextQuestion ? nextQuestion.globalIndex : totalQuestions,
    totalQuestions,
    tourQuestionIndex,
    tourQuestionCount
  };
}

function buildOptimisticAttemptAfterAnswer(attempt, answerPayload) {
  const route = attempt?.route;
  const currentQuestion = attempt?.currentQuestion;
  const currentStepIndex = Number(attempt?.currentStepIndex) || 0;
  const questions = Array.isArray(route?.questions) ? route.questions : [];

  if (!attempt || !route || !currentQuestion || currentStepIndex >= questions.length - 1) {
    return null;
  }

  const optimistic = cloneClientValue(attempt);
  const optimisticQuestions = optimistic.route?.questions || [];
  const questionToUpdate = optimisticQuestions.find((question) => question.id === currentQuestion.id);
  if (questionToUpdate) {
    questionToUpdate.savedAnswer = answerPayload;
  }

  const nextStepIndex = currentStepIndex + 1;
  const nextQuestion = optimisticQuestions[nextStepIndex] || null;
  const nextTour = nextQuestion
    ? (optimistic.route?.tours || []).find((tour) => tour.id === nextQuestion.tourId) || null
    : null;

  optimistic.currentStepIndex = nextStepIndex;
  optimistic.currentQuestion = nextQuestion;
  optimistic.currentTour = nextTour;
  optimistic.progress = buildProgressFromRoute(optimistic.route, nextStepIndex);
  return optimistic;
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
  if (elements.heroFormatBadge) {
    const totalTours = Array.isArray(state.olympiad.tours) ? state.olympiad.tours.length : 0;
    elements.heroFormatBadge.textContent = `Индивидуальный формат • ${state.olympiad.durationMinutes} минут • ${totalTours} этапов`;
  }
  elements.tourMeta.innerHTML = "";

  (state.olympiad.tours || []).forEach((tour) => {
    const pill = document.createElement("div");
    pill.className = "pill";
    pill.textContent = `${tour.code} • ${tour.timeLimitMinutes} мин`;
    elements.tourMeta.appendChild(pill);
  });

  renderJourneyMap();
}

function renderRules() {
  const rules = [
    `Общий лимит: ${state.olympiad.durationMinutes} минут.`,
    "После старта работает защищённый полноэкранный режим.",
    "У каждого участника индивидуальный вариант.",
    "Один вопрос на экране без возврата назад.",
    "Ответы проверяются автоматически.",
    "Итог фиксируется после завершения."
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
      description: "Данные участника"
    },
    ...tours.map((tour) => ({
      id: tour.id,
      label: tour.code,
      description: tour.title
    })),
    {
      id: "result",
      label: "Финиш",
      description: "Итог"
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
  let statusText = "Ожидается регистрация.";

  if (state.participant) {
    completed.add("register");
    statusText = "Регистрация завершена.";
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
      statusText = `${state.attempt.currentTour.code} • ${state.attempt.progress.tourQuestionIndex}/${state.attempt.progress.tourQuestionCount}`;
    } else if (state.attempt.status !== "in_progress") {
      currentId = "result";
      ((state.olympiad && state.olympiad.tours) || []).forEach((tour) => completed.add(tour.id));
      completed.add("result");
      statusText = "Олимпиада завершена.";
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

  updateExamCockpit();
}

function renderAttempt() {
  const attempt = state.attempt;
  const currentTour = attempt.currentTour;
  const currentQuestion = attempt.currentQuestion;

  renderParticipant();
  saveTimingSnapshot(attempt);
  enableExamMode();

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
  updateExamCockpit();
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
  disableExamMode();
  elements.attemptSection.classList.add("hidden");
  elements.resultSection.classList.remove("hidden");
  refreshNavigationState();
  updateExamCockpit();
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
      "Попытка завершена, результат сохранён в облаке. Организатор увидит итоговый балл и статус в панели управления.";
  } else {
    elements.resultTitle.textContent = `Ваш результат: ${summary.totalFinalScore} из ${summary.totalMaxScore}`;
    elements.resultSubtitle.textContent =
      "Все ответы зафиксированы автоматически. Результаты олимпиады не показываются участнику сразу после её завершения.";
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
  updateExamCockpit();
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
  attachPendingQueue(attempt);
  if (!attempt) {
    disableExamMode();
    setParticipantShellState();
    return;
  }

  if (attempt.status === "in_progress") {
    enableExamMode();
    if (preserveQuestionRender) {
      saveTimingSnapshot(attempt);
      setParticipantShellState();
      updateJourneyProgress();
      return;
    }
    renderAttempt();
  } else {
    stopTimers();
    disableExamMode();
    renderResult();
  }

  if (transitionMessage && attempt.status === "in_progress") {
    showQuestionTransition(transitionMessage);
  }

  setParticipantShellState();

  if (attempt.status === "in_progress" && hasPendingAnswers() && !state.pendingFlushInFlight) {
    setAttemptSyncMeta("Найдены локально сохранённые ответы. Догружаем их в облако.");
    flushPendingAnswers();
  }
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
  toneTimerBox(elements.timerTotalBox, totalRemaining);
  toneTimerBox(elements.timerTourBox, tourRemaining);
  updateExamCockpit();

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
  state.syncInterval = setInterval(() => syncAttempt(true), 30000);
}

async function syncAttempt(silent = false) {
  if (
    !state.attempt ||
    state.isSubmittingAnswer ||
    state.isFinishingAttempt ||
    state.syncInFlight ||
    state.pendingFlushInFlight ||
    hasPendingAnswers()
  ) {
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
    setAttemptSyncMeta(`Обновлено: ${formatDateTime(new Date())}`);
    if (!silent && !state.isSubmittingAnswer && !state.isFinishingAttempt) {
      setAttemptSaveStatus("Данные обновлены", "success");
    }
  } catch (error) {
    const message = formatApiError(error);
    setAttemptSyncMeta(`Проверка связи: ${message}`);
      setAttemptSaveStatus(silent ? "Связь нестабильна" : "Не удалось обновить данные", silent ? "warning" : "error");
    if (!silent) {
      showMessage(elements.attemptMessage, message, "error");
    }
  } finally {
    state.syncInFlight = false;
  }
}

async function flushPendingAnswers(options = {}) {
  if (
    !state.attempt ||
    state.pendingFlushInFlight ||
    state.isFinishingAttempt ||
    !hasPendingAnswers()
  ) {
    return;
  }

  cancelPendingFlushRetry();
  state.pendingFlushInFlight = true;
  let lastSyncedAttempt = null;

  try {
    while (state.pendingAnswerQueue.length) {
      const pendingItem = state.pendingAnswerQueue[0];
      const data = await requestWithRetry(
        () =>
          api(`/api/public/attempts/${state.attempt.id}/answer`, {
            method: "POST",
            body: JSON.stringify({
              questionId: pendingItem.questionId,
              answerPayload: pendingItem.answerPayload
            })
          }),
        {
          attempts: options.blocking ? 3 : 2,
          pauseMs: 1200,
          onRetry(error, nextAttempt, maxAttempts) {
            setAttemptSaveStatus(
              `Синхронизация ответа: повтор ${nextAttempt} из ${maxAttempts}.`,
              "warning"
            );
            setAttemptSyncMeta(`Фоновая синхронизация: ${formatApiError(error)}`);
          }
        }
      );

      state.pendingAnswerQueue.shift();
      persistPendingAnswerQueue();
      lastSyncedAttempt = data;

      if (data.status !== "in_progress" || !state.attempt || data.currentStepIndex >= state.attempt.currentStepIndex) {
        applyAttemptState(data, { preserveQuestionRender: true });
      }
    }

    setAttemptSaveStatus("Ответы сохранены в облаке", "success");
    setAttemptSyncMeta(`Синхронизация завершена: ${formatDateTime(new Date())}`);
    return lastSyncedAttempt;
  } catch (error) {
    const message = formatApiError(error);
    setAttemptSaveStatus(
      options.blocking
        ? "Не удалось сохранить ответы перед завершением"
        : "Ответ принят, но облачная синхронизация временно задержалась",
      options.blocking ? "error" : "warning"
    );
    setAttemptSyncMeta(`Синхронизация: ${message}`);
    if (options.blocking) {
      throw error;
    }
    schedulePendingFlushRetry();
  } finally {
    state.pendingFlushInFlight = false;
    refreshAttemptControls();
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
    elements.startAttempt.dataset.lockReason = data.alreadyCompleted ? "completed" : "";
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
  if (elements.startConsent && !elements.startConsent.checked) {
    showMessage(
      elements.prestartMessage,
      "Подтвердите готовность работать 45 минут без отвлечений.",
      "warning"
    );
    updateStartAvailability();
    return;
  }

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
      "Маршрут открыт. Ответы будут автоматически сохраняться в облаке, а экзаменационный режим включён.",
      "success"
    );
    if (hasPendingAnswers()) {
      flushPendingAnswers();
    }
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
  const isLastQuestion =
    state.attempt.progress.currentQuestionIndex >= state.attempt.progress.totalQuestions;

  state.pendingAnswerQueue.push({
    questionId: previousQuestionId,
    answerPayload
  });
  persistPendingAnswerQueue();
  clearDraft(previousQuestionId);

  if (!isLastQuestion) {
    const optimisticAttempt = buildOptimisticAttemptAfterAnswer(state.attempt, answerPayload);
    if (optimisticAttempt) {
      applyAttemptState(optimisticAttempt);
      startTimers();
    }

    setAttemptSaveStatus("Ответ принят. Облачная синхронизация идёт в фоне.", "pending");
    setAttemptSyncMeta("Переходим дальше сразу, не останавливая таймер на ожидании сети.");
    refreshAttemptControls();
    flushPendingAnswers();
    return;
  }

  state.isSubmittingAnswer = true;
  setAttemptSaveStatus("Отправляем финальный ответ...", "pending");
  setAttemptSyncMeta("Досинхронизируем очередь и фиксируем финальный шаг...");
  refreshAttemptControls();

  try {
    const data = await flushPendingAnswers({ blocking: true });

    if (data && data.status === "in_progress") {
      startTimers();
      setAttemptSaveStatus("Ответ принят", "success");
    } else {
      setAttemptSaveStatus("Финальный ответ принят. Маршрут завершён.", "success");
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
  setAttemptSyncMeta("Проверяем очередь ответов и фиксируем итог...");
  refreshAttemptControls();
  try {
    captureCurrentDraft();
    await flushPendingAnswers({ blocking: true });
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
  setAttemptSaveStatus("Система готова", "idle");
  setAttemptSyncMeta("Обновление: —");
  refreshNavigationState();

  window.addEventListener("online", () => {
    setNetworkStatus(true);
      setAttemptSaveStatus("Связь восстановлена", "success");
    if (state.attempt) {
      flushPendingAnswers();
      syncAttempt(true);
    }
  });
  window.addEventListener("offline", () => {
    setNetworkStatus(false);
      setAttemptSaveStatus("Связь нестабильна", "warning");
      setAttemptSyncMeta("Сервер временно недоступен");
  });
  if (elements.navMenuToggle) {
    elements.navMenuToggle.addEventListener("click", () => {
      setNavDrawerOpen(!state.navDrawerOpen);
    });
  }
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
  if (elements.startConsent) {
    elements.startConsent.addEventListener("change", updateStartAvailability);
  }
  elements.startAttempt.addEventListener("click", startAttempt);
  elements.submitAnswer.addEventListener("click", submitAnswer);
  elements.finishAttempt.addEventListener("click", finishAttempt);
  if (elements.examGuardReturn) {
    elements.examGuardReturn.addEventListener("click", restoreExamMode);
  }
  elements.questionBody.addEventListener("change", () => updateExamCockpit());
  elements.questionBody.addEventListener("input", () => updateExamCockpit());
  elements.questionBody.addEventListener("click", () => updateExamCockpit());
  document.addEventListener("click", (event) => {
    if (!state.navDrawerOpen || !elements.navRibbon) {
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
  updateStartAvailability();
}

init().catch((error) => {
  showMessage(elements.registrationMessage, formatApiError(error), "error");
  setAttemptSaveStatus("Не удалось загрузить олимпиаду", "error");
  setAttemptSyncMeta(`Инициализация: ${formatApiError(error)}`);
});
