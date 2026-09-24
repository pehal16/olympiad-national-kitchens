const state = {
  olympiad: null,
  participant: null,
  activeAttemptId: "",
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
  pendingFlushPromise: null,
  pendingFlushRetryTimer: null,
  pendingQueueAttemptId: "",
  pendingIntegrityEvents: [],
  integrityFlushInFlight: false,
  integrityRetryTimer: null,
  integrityQueueAttemptId: "",
  integrityLimitReached: false,
  integrityDeliveryBlocked: false,
  attemptAccessTokens: {},
  pendingStartToken: null,
  isSubmittingAnswer: false,
  isFinishingAttempt: false,
  isStartingAttempt: false,
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

let dishSceneModulePromise = null;

function loadDishSceneModule() {
  if (!dishSceneModulePromise) {
    dishSceneModulePromise = import("/assets/runtime/dish-scene-3d.js?v=1.7.0-photo3");
  }
  return dishSceneModulePromise;
}

const elements = {
  navRibbon: document.getElementById("nav-ribbon"),
  navMenuToggle: document.getElementById("nav-menu-toggle"),
  navDrawer: document.getElementById("nav-drawer"),
  navBack: document.getElementById("nav-back"),
  navHome: document.getElementById("nav-home"),
  navRules: document.getElementById("nav-rules"),
  navRegister: document.getElementById("nav-register"),
  navAttempt: document.getElementById("nav-attempt"),
  navResult: document.getElementById("nav-result"),
  networkStatus: document.getElementById("network-status"),
  installApp: document.getElementById("install-app"),
  heroFormatBadge: document.getElementById("hero-format-badge"),
  heroSection: document.getElementById("hero-section"),
  heroActionRegister: document.getElementById("hero-action-register"),
  heroActionRules: document.getElementById("hero-action-rules"),
  heroLoadMessage: document.getElementById("hero-load-message"),
  heroRetry: document.getElementById("hero-retry"),
  howSection: document.getElementById("how-section"),
  howRules: document.getElementById("how-rules"),
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
  registrationSubmit: document.getElementById("registration-submit"),
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

function updateHeroAction() {
  if (!elements.heroActionRegister) return;
  if (!state.olympiad) {
    elements.heroActionRegister.disabled = true;
    elements.heroActionRegister.textContent = "Загрузка олимпиады…";
    return;
  }

  elements.heroActionRegister.disabled = false;
  if (state.attempt?.status === "in_progress") {
    elements.heroActionRegister.textContent = "Продолжить олимпиаду";
  } else if (state.attempt) {
    elements.heroActionRegister.textContent = "Посмотреть результат";
  } else if (state.participant) {
    elements.heroActionRegister.textContent = "К правилам и старту";
  } else {
    elements.heroActionRegister.textContent = "Зарегистрироваться";
  }
}

function refreshNavigationState() {
  const attemptActive = Boolean(state.attempt && state.attempt.status === "in_progress");
  const resultVisible =
    Boolean(state.attempt) && !elements.resultSection.classList.contains("hidden");
  const prestartVisible = !elements.prestartSection.classList.contains("hidden");

  setButtonAvailability(elements.navRules, prestartVisible);
  elements.howRules?.classList.toggle("hidden", !prestartVisible);

  setButtonAvailability(
    elements.navRegister,
    Boolean(state.olympiad) && !attemptActive && !resultVisible,
    "Регистрация доступна после загрузки олимпиады и до начала попытки."
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
  updateHeroAction();
}

function refreshAttemptControls() {
  const attemptInProgress = Boolean(state.attempt && state.attempt.status === "in_progress");
  const hasActiveQuestion = Boolean(
    attemptInProgress && state.attempt.currentQuestion && state.questionController
  );
  const hasCurrentAnswer = hasActiveQuestion
    ? hasMeaningfulAnswer(state.questionController.getAnswer?.())
    : false;
  const hasQueuedAnswers = hasPendingAnswers();
  const isBusy = state.isSubmittingAnswer || state.isFinishingAttempt || state.pendingFlushInFlight;
  const isBlockedByGuard = attemptInProgress && state.examGuardActive;
  const interactionLocked = isBusy || isBlockedByGuard;

  if (elements.questionBody) {
    elements.questionBody.inert = interactionLocked || hasQueuedAnswers;
    elements.questionBody.setAttribute("aria-busy", isBusy ? "true" : "false");
  }

  elements.submitAnswer.disabled =
    !hasActiveQuestion || !hasCurrentAnswer || interactionLocked;
  elements.finishAttempt.disabled = !attemptInProgress || interactionLocked;

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

  if (state.pendingFlushInFlight) {
    elements.submitAnswer.textContent = "Сохраняем очередь...";
    elements.finishAttempt.textContent = "Дождитесь сохранения";
    return;
  }

  if (isBlockedByGuard) {
    elements.submitAnswer.textContent = "Вернитесь в режим";
    elements.finishAttempt.textContent = "Вернитесь в режим";
    return;
  }

  if (hasQueuedAnswers) {
    elements.submitAnswer.textContent = "Повторить сохранение ответа";
    elements.finishAttempt.textContent = "Завершить досрочно";
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
    elements.examIncidentsBadge.textContent = `Зафиксировано событий: ${state.examIncidents}`;
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

function activateExamGuard(reason, eventType = "window_blur") {
  if (!isAttemptInProgress()) {
    return;
  }

  const nextReason = reason || "Олимпиада временно поставлена на контроль.";
  const isNewEvent = !state.examGuardActive || state.examGuardReason !== nextReason;
  const isIncident = ["tab_hidden", "window_blur", "fullscreen_exit", "page_hidden", "capture_shortcut", "clipboard_paste"].includes(
    eventType
  );
  if (isNewEvent && isIncident) {
    state.examIncidents += 1;
  }

  state.examGuardActive = true;
  state.examGuardReason = nextReason;
  updateExamGuardUi();
  refreshAttemptControls();
  setAttemptSaveStatus("Защищённый режим олимпиады приостановлен", "warning");
  setAttemptSyncMeta("Вернитесь в активное окно олимпиады и восстановите полноэкранный режим.");
  showMessage(elements.attemptMessage, nextReason, "warning");
  updateExamCockpit();
  if (isNewEvent) {
    queueIntegrityEvent(eventType, nextReason);
  }
}

function releaseExamGuard(message = "") {
  const wasActive = state.examGuardActive;
  const previousReason = state.examGuardReason;
  state.examGuardActive = false;
  state.examGuardReason = "";
  updateExamGuardUi();
  refreshAttemptControls();
  if (message) {
    setAttemptSaveStatus(message, "success");
    setAttemptSyncMeta(`Контроль восстановлен: ${formatDateTime(new Date())}`);
  }
  updateExamCockpit();
  if (wasActive) {
    queueIntegrityEvent("guard_restored", previousReason || message);
  }
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

  elements.startAttempt.disabled = blockedByCompletion || !hasParticipant || !consentGranted || state.isStartingAttempt;

  if (!elements.startConsentHint) {
    return;
  }

  if (blockedByCompletion) {
    elements.startConsentHint.textContent = "Повторный старт недоступен.";
  } else if (!hasParticipant) {
    elements.startConsentHint.textContent = "Сначала сохраните данные участника.";
  } else if (!consentGranted) {
    elements.startConsentHint.textContent = "Подтвердите готовность к старту.";
  } else if (state.isStartingAttempt) {
    elements.startConsentHint.textContent = "Открываем вашу попытку…";
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
      activateExamGuard(
        "Включите полноэкранный режим, чтобы продолжить олимпиаду.",
        "fullscreen_required"
      );
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
      : "Восстановите полноэкранный режим, чтобы продолжить.",
    !focusReady ? "window_blur" : "fullscreen_exit"
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

function handleProtectedPaste(event) {
  if (!isAttemptInProgress()) return;
  event.preventDefault();
  state.examIncidents += 1;
  updateExamGuardUi();
  queueIntegrityEvent("clipboard_paste", "Попытка вставить содержимое буфера обмена.");
  announceRestriction("Вставка из буфера обмена во время олимпиады отключена.");
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
  if (key === "printscreen") {
    event.preventDefault();
    state.examIncidents += 1;
    updateExamGuardUi();
    queueIntegrityEvent("capture_shortcut", "Нажата клавиша Print Screen; создание снимка браузером не подтверждается.");
    announceRestriction("Нажатие Print Screen записано в журнал контроля.");
    return;
  }
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
    activateExamGuard(
      "Окно олимпиады покинуло активную вкладку. Вернитесь в неё, чтобы продолжить.",
      "tab_hidden"
    );
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
      activateExamGuard(
        "Окно олимпиады потеряло фокус. Вернитесь к прохождению, чтобы продолжить.",
        "window_blur"
      );
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
    activateExamGuard(
      "Полноэкранный режим выключен. Включите его снова, чтобы продолжить.",
      "fullscreen_exit"
    );
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

function handleExamPageHide() {
  if (!isAttemptInProgress()) {
    return;
  }
  queueIntegrityEvent("page_hidden", "Страница олимпиады была скрыта или закрыта.");
  flushIntegrityEvents();
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
  document.addEventListener("paste", handleProtectedPaste, true);
  document.addEventListener("contextmenu", handleProtectedContextMenu, true);
  document.addEventListener("selectstart", handleProtectedSelection, true);
  document.addEventListener("dragstart", handleProtectedDragStart, true);
  document.addEventListener("keydown", handleProtectedKeydown, true);
  document.addEventListener("visibilitychange", handleExamVisibilityChange, true);
  document.addEventListener("fullscreenchange", handleExamFullscreenChange, true);
  window.addEventListener("blur", handleExamWindowBlur, true);
  window.addEventListener("focus", handleExamWindowFocus, true);
  window.addEventListener("beforeunload", handleExamBeforeUnload, true);
  window.addEventListener("pagehide", handleExamPageHide, true);
  requestExamFullscreen({ silent: true }).then((ok) => {
    if (!ok) {
      activateExamGuard(
        "Включите полноэкранный режим, чтобы продолжить олимпиаду.",
        "fullscreen_required"
      );
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
  document.removeEventListener("paste", handleProtectedPaste, true);
  document.removeEventListener("contextmenu", handleProtectedContextMenu, true);
  document.removeEventListener("selectstart", handleProtectedSelection, true);
  document.removeEventListener("dragstart", handleProtectedDragStart, true);
  document.removeEventListener("keydown", handleProtectedKeydown, true);
  document.removeEventListener("visibilitychange", handleExamVisibilityChange, true);
  document.removeEventListener("fullscreenchange", handleExamFullscreenChange, true);
  window.removeEventListener("blur", handleExamWindowBlur, true);
  window.removeEventListener("focus", handleExamWindowFocus, true);
  window.removeEventListener("beforeunload", handleExamBeforeUnload, true);
  window.removeEventListener("pagehide", handleExamPageHide, true);
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
    const answeredCount = Math.max(0, Number(state.attempt.progress?.answeredCount) || 0);
    const totalQuestions = Math.max(0, Number(state.attempt.progress?.totalQuestions) || 0);
    return {
      percent: totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0,
      label: `Выполнено: ${answeredCount} из ${totalQuestions}`,
      hint: "Попытка завершена, результат сохранён."
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

  if (Array.isArray(answer.sequence) && answer.sequence.some(Boolean)) {
    return true;
  }

  if (answer.buckets && typeof answer.buckets === "object") {
    return Object.keys(answer.buckets).length > 0;
  }

  if (
    Array.isArray(answer.selectedIngredientIds) &&
    answer.selectedIngredientIds.length > 0
  ) {
    return true;
  }

  return false;
}

function updateAnswerUi() {
  refreshAttemptControls();
  updateExamCockpit();
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
    attempt.currentQuestion?.savedAnswer ||
    queuedAnswerForQuestion(attempt.currentQuestion?.id) ||
    state.localDrafts[attempt.currentQuestion?.id] ||
    null;

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
  const answeredCount = Math.max(0, Number(attempt.progress?.answeredCount) || 0);
  const totalQuestions = Math.max(0, Number(attempt.progress?.totalQuestions) || 0);
  const metrics = [
    {
      label: "Баллы",
      value: scoresVisible ? `${summary.totalFinalScore} / ${summary.totalMaxScore}` : "скрыто",
      hint: scoresVisible
        ? "Баллы рассчитаны автоматически с учётом заданий без ответа."
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
      hint: "Показано время этой попытки."
    },
    {
      label: "Задания",
      value: `${answeredCount} из ${totalQuestions}`,
      hint: answeredCount === totalQuestions
        ? "Ответы на все задания зафиксированы."
        : attempt.status === "expired"
          ? "Время истекло; оставшиеся задания без ответа."
          : "Работа завершена досрочно; оставшиеся задания без ответа."
    },
    {
      label: "Квитанция",
      value: attempt.id || "—",
      hint: "Сохраните этот номер: по нему организатор сможет найти попытку."
    }
  ];

  elements.resultOverview.innerHTML = "";
  metrics.forEach((metric) => {
    const card = document.createElement("article");
    card.className = "result-stat";
    const label = document.createElement("span");
    label.textContent = metric.label;
    const value = document.createElement("strong");
    value.textContent = metric.value;
    const hint = document.createElement("small");
    hint.textContent = metric.hint;
    card.append(label, value, hint);
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

  elements.resultNext.innerHTML = "";
  const heading = document.createElement("h3");
  heading.textContent = "Что дальше";
  const list = document.createElement("ul");
  nextSteps.forEach((step) => {
    const item = document.createElement("li");
    item.textContent = step;
    list.appendChild(item);
  });
  elements.resultNext.append(heading, list);
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
    await navigator.serviceWorker.register("/sw.js?v=1.7.0");
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
  const { attemptToken: explicitAttemptToken, ...fetchOptions } = options;
  const attemptIdMatch = String(path).match(/^\/api\/public\/attempts\/([^/]+)/);
  const attemptToken =
    explicitAttemptToken ||
    (attemptIdMatch ? loadAttemptAccessToken(decodeURIComponent(attemptIdMatch[1])) : "");
  const headers = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers || {})
  };
  if (attemptToken) {
    headers["X-Attempt-Token"] = attemptToken;
  }

  try {
    response = await fetch(path, {
      ...fetchOptions,
      headers
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

function formatAnswerActionMessage(error) {
  if (error?.status === 401) {
    return "Доступ к попытке не подтверждён. Не закрывайте страницу и обратитесь к организатору для восстановления.";
  }
  if (error?.status === 409) {
    return "Состояние попытки изменилось. Проверьте текущий вопрос и нажмите «Ответить» ещё раз.";
  }
  if (error?.status === 400 || error?.status === 422) {
    return "Сохранённый черновик несовместим с текущим заданием. Выберите ответ заново.";
  }
  return formatApiError(error);
}

function attemptAccessTokenStorageKey(attemptId) {
  return attemptId ? `nko_attempt_access_${attemptId}` : "";
}

function createAttemptAccessToken() {
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  }
  throw new Error(
    "Браузер не поддерживает безопасное создание сессии. Откройте олимпиаду в актуальной версии Chrome или Edge по HTTPS."
  );
}

async function makePendingStartKey(participant) {
  const identity = [
    state.olympiad?.id || "olympiad",
    participant?.fullName,
    participant?.institution,
    participant?.groupName
  ]
    .map((value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");

  if (globalThis.crypto?.subtle && globalThis.TextEncoder) {
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(identity)
    );
    return Array.from(new Uint8Array(digest), (value) =>
      value.toString(16).padStart(2, "0")
    ).join("");
  }

  let first = 2166136261;
  let second = 2246822519;
  for (let index = 0; index < identity.length; index += 1) {
    const code = identity.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 3266489917);
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

function loadPendingStartToken(pendingKey) {
  if (!pendingKey) return "";
  if (state.pendingStartToken?.key === pendingKey) {
    return state.pendingStartToken.token || "";
  }
  try {
    const stored = JSON.parse(localStorage.getItem("nko_pending_attempt_start_v1") || "null");
    if (stored?.key === pendingKey && stored?.token) {
      state.pendingStartToken = stored;
      return stored.token;
    }
  } catch (error) {
    // Storage is unavailable or corrupt; a fresh in-memory token will be used.
  }
  return "";
}

function rememberPendingStartToken(pendingKey, token) {
  if (!pendingKey || !token) return;
  const pending = { key: pendingKey, token };
  state.pendingStartToken = pending;
  try {
    localStorage.setItem("nko_pending_attempt_start_v1", JSON.stringify(pending));
  } catch (error) {
    // The active start request can still retry with the in-memory token.
  }
}

function clearPendingStartToken(pendingKey) {
  if (pendingKey && state.pendingStartToken?.key !== pendingKey) return;
  state.pendingStartToken = null;
  try {
    const stored = JSON.parse(localStorage.getItem("nko_pending_attempt_start_v1") || "null");
    if (!pendingKey || stored?.key === pendingKey) {
      localStorage.removeItem("nko_pending_attempt_start_v1");
    }
  } catch (error) {
    // The in-memory copy is already cleared.
  }
}

function rememberAttemptAccessToken(attemptId, token) {
  const storageKey = attemptAccessTokenStorageKey(attemptId);
  if (!storageKey || !token) return;
  state.attemptAccessTokens[attemptId] = token;
  try {
    localStorage.setItem(storageKey, token);
  } catch (error) {
    // The active page keeps the token in memory; reload recovery may require the organizer.
  }
  try {
    sessionStorage.setItem("nko_session_attempt_v1", attemptId);
  } catch (error) {
    // Session restoration is optional when browser storage is unavailable.
  }
}

function loadAttemptAccessToken(attemptId) {
  const storageKey = attemptAccessTokenStorageKey(attemptId);
  if (!storageKey) return "";
  if (state.attemptAccessTokens[attemptId]) {
    return state.attemptAccessTokens[attemptId];
  }
  try {
    const token = localStorage.getItem(storageKey) || "";
    if (token) state.attemptAccessTokens[attemptId] = token;
    return token;
  } catch (error) {
    return "";
  }
}

async function restoreSessionAttempt() {
  let attemptId = "";
  try {
    attemptId = sessionStorage.getItem("nko_session_attempt_v1") || "";
  } catch (error) {
    return;
  }
  if (!attemptId) return;

  if (!loadAttemptAccessToken(attemptId)) {
    sessionStorage.removeItem("nko_session_attempt_v1");
    return;
  }

  try {
    const attempt = await api(`/api/public/attempts/${encodeURIComponent(attemptId)}`);
    state.participant = attempt.participant;
    renderParticipant();
    applyAttemptState(attempt);
    if (attempt.status === "in_progress") {
      startTimers();
      setAttemptSaveStatus("Попытка восстановлена", "success");
      setAttemptSyncMeta("После обновления страницы загружено сохранённое состояние.");
    }
  } catch (error) {
    if (error.status === 401 || error.status === 404) {
      sessionStorage.removeItem("nko_session_attempt_v1");
    }
    showMessage(
      elements.heroLoadMessage,
      `Не удалось восстановить предыдущую попытку. ${formatApiError(error)} Повторите загрузку страницы или регистрацию.`,
      "warning"
    );
  }
}

function pendingQueueStorageKey(attemptId) {
  return attemptId ? `nko_pending_answers_${attemptId}` : "";
}

function persistPendingAnswerQueue() {
  const storageKey = pendingQueueStorageKey(state.pendingQueueAttemptId);
  if (!storageKey) {
    return;
  }

  try {
    if (!state.pendingAnswerQueue.length) {
      localStorage.removeItem(storageKey);
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(state.pendingAnswerQueue));
  } catch (error) {
    // The active page continues with the in-memory queue.
  }
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
    try {
      localStorage.removeItem(storageKey);
    } catch (storageError) {
      // Storage is unavailable; use the in-memory queue only.
    }
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
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      // Storage is unavailable; clearing the in-memory queue is sufficient for this page.
    }
  }
  if (!attemptId || attemptId === state.pendingQueueAttemptId) {
    state.pendingQueueAttemptId = attemptId ? "" : state.pendingQueueAttemptId;
    state.pendingAnswerQueue = [];
  }
}

function hasPendingAnswers() {
  return state.pendingAnswerQueue.length > 0;
}

function queuedAnswerForQuestion(questionId) {
  const queuedItem = state.pendingAnswerQueue.find(
    (item) => item && item.questionId === questionId
  );
  const answerPayload = queuedItem && queuedItem.answerPayload;
  if (!answerPayload || typeof answerPayload !== "object" || Array.isArray(answerPayload)) {
    return null;
  }
  return answerPayload;
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

function integrityQueueStorageKey(attemptId) {
  return attemptId ? `nko_integrity_events_${attemptId}` : "";
}

function makeClientEventId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `event-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function persistIntegrityQueue() {
  const storageKey = integrityQueueStorageKey(state.integrityQueueAttemptId);
  if (!storageKey) return;
  try {
    if (!state.pendingIntegrityEvents.length) {
      localStorage.removeItem(storageKey);
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(state.pendingIntegrityEvents));
  } catch (error) {
    // The active page continues with the in-memory queue.
  }
}

function loadIntegrityQueue(attemptId) {
  const storageKey = integrityQueueStorageKey(attemptId);
  if (!storageKey) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    try {
      localStorage.removeItem(storageKey);
    } catch (storageError) {
      // Storage is unavailable; use the in-memory queue only.
    }
    return [];
  }
}

function applyIntegritySummary(summary) {
  if (!summary) return;
  state.integrityDeliveryBlocked = false;
  state.integrityLimitReached = Math.max(0, Number(summary.eventCount) || 0) >= 250;
  state.examIncidents = Math.max(
    state.examIncidents,
    Math.max(0, Number(summary.incidentCount) || 0)
  );
  updateExamGuardUi();
}

function scheduleIntegrityRetry() {
  clearTimeout(state.integrityRetryTimer);
  state.integrityRetryTimer = setTimeout(() => {
    state.integrityRetryTimer = null;
    flushIntegrityEvents();
  }, 3500);
}

async function loadIntegritySummary(attemptId) {
  try {
    const data = await api(`/api/public/attempts/${attemptId}/integrity`);
    applyIntegritySummary(data.summary);
  } catch (error) {
    // The local queue remains authoritative until the server is reachable again.
  }
}

function attachIntegrityQueue(attempt) {
  if (!attempt || !attempt.id) return;
  if (state.integrityQueueAttemptId !== attempt.id) {
    state.integrityQueueAttemptId = attempt.id;
    state.integrityLimitReached = false;
    state.integrityDeliveryBlocked = false;
    state.pendingIntegrityEvents = loadIntegrityQueue(attempt.id);
    loadIntegritySummary(attempt.id);
  }
  if (state.pendingIntegrityEvents.length) flushIntegrityEvents();
}

function queueIntegrityEvent(eventType, reason) {
  if (
    !state.attempt ||
    !state.attempt.id ||
    state.integrityLimitReached ||
    state.integrityDeliveryBlocked
  ) return;
  if (state.integrityQueueAttemptId !== state.attempt.id) {
    attachIntegrityQueue(state.attempt);
  }
  state.pendingIntegrityEvents.push({
    eventId: makeClientEventId(),
    eventType,
    reason: String(reason || ""),
    occurredAt: new Date().toISOString(),
    questionId: state.attempt.currentQuestion?.id || "",
    visibilityState: document.visibilityState || "",
    fullscreen: Boolean(document.fullscreenElement),
    clientIncidentCount: state.examIncidents
  });
  persistIntegrityQueue();
  flushIntegrityEvents();
}

async function flushIntegrityEvents() {
  if (
    !state.integrityQueueAttemptId ||
    state.integrityFlushInFlight ||
    state.integrityDeliveryBlocked ||
    !state.pendingIntegrityEvents.length
  ) {
    return;
  }

  state.integrityFlushInFlight = true;
  clearTimeout(state.integrityRetryTimer);
  try {
    while (state.pendingIntegrityEvents.length) {
      const event = state.pendingIntegrityEvents[0];
      const data = await api(
        `/api/public/attempts/${state.integrityQueueAttemptId}/integrity`,
        {
          method: "POST",
          keepalive: true,
          body: JSON.stringify(event)
        }
      );
      state.pendingIntegrityEvents.shift();
      persistIntegrityQueue();
      applyIntegritySummary(data.summary);
    }
  } catch (error) {
    if (error.status === 429) {
      state.integrityLimitReached = true;
      state.pendingIntegrityEvents = [];
      persistIntegrityQueue();
    } else if (error.status === 400 || error.status === 409) {
      state.integrityDeliveryBlocked = true;
      state.pendingIntegrityEvents = [];
      persistIntegrityQueue();
    } else if (isRetriableError(error)) {
      scheduleIntegrityRetry();
    } else {
      state.integrityDeliveryBlocked = true;
    }
  } finally {
    state.integrityFlushInFlight = false;
  }
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

function formatPoints(value) {
  const points = Number(value) || 0;
  const units = Math.abs(points) % 10;
  const teens = Math.abs(points) % 100;
  const label = teens >= 11 && teens <= 14
    ? "баллов"
    : units === 1
      ? "балл"
      : units >= 2 && units <= 4
        ? "балла"
        : "баллов";
  return `${points} ${label}`;
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
  elements.heroSubtitle.textContent = state.olympiad.subtitle;
  if (elements.heroFormatBadge) {
    const totalTours = Array.isArray(state.olympiad.tours) ? state.olympiad.tours.length : 0;
    elements.heroFormatBadge.textContent = `${state.olympiad.durationMinutes} минут · ${totalTours} туров · 38 заданий`;
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
    "После старта работает защищённый полноэкранный режим; таймер идёт непрерывно.",
    "Уход из вкладки, потеря фокуса и выход из полноэкранного режима блокируют интерфейс и записываются в серверный журнал.",
    "Запись в журнале рассматривает организатор; отдельное срабатывание само по себе не уменьшает балл.",
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
  const terminal = Boolean(state.attempt && state.attempt.status !== "in_progress");

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
    } else if (terminal) {
      currentId = "result";
      const answeredCount = Number(state.attempt.progress?.answeredCount) || 0;
      (state.attempt.route?.tours || []).forEach((tour) => {
        if (answeredCount > Number(tour.stepEnd)) completed.add(tour.id);
      });
      completed.add("result");
      statusText = answeredCount >= (Number(state.attempt.progress?.totalQuestions) || 0)
        ? "Олимпиада завершена."
        : state.attempt.status === "expired"
          ? "Время истекло."
          : "Работа завершена досрочно.";
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
    const stateLabel = document.createElement("span");
    stateLabel.className = "journey-node-state";
    stateLabel.textContent = isCurrent
      ? terminal ? "Итог" : "Сейчас"
      : isComplete ? "Готово" : terminal ? "Без ответа" : isLocked ? "Впереди" : "Старт";
    const title = document.createElement("b");
    title.textContent = step.label;
    const description = document.createElement("small");
    description.textContent = step.description;
    card.append(stateLabel, title, description);
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
  chip.dataset.itemId = item.id;
  if (item.imageUrl) {
    chip.classList.add("has-image");
    const image = document.createElement("img");
    image.src = item.imageUrl;
    image.alt = item.imageAlt || "";
    image.loading = "lazy";
    image.addEventListener("error", () => {
      image.hidden = true;
      chip.classList.add("image-unavailable");
    });
    chip.appendChild(image);
  }
  const label = document.createElement("span");
  label.textContent = item.text;
  chip.appendChild(label);
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
      updateAnswerUi();
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
    updateAnswerUi();
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
    const bankHeader = document.createElement("div");
    bankHeader.className = "drag-bank-header";
    bankHeader.textContent = "Карточки";
    bank.appendChild(bankHeader);
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
      const slotLabel = document.createElement("div");
      slotLabel.className = "drop-slot-label";
      slotLabel.textContent = slot.label;
      slotNode.appendChild(slotLabel);
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
    updateAnswerUi();
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
    updateAnswerUi();
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
    const bankHeader = document.createElement("div");
    bankHeader.className = "drag-bank-header";
    bankHeader.textContent = "Банк карточек";
    bank.appendChild(bankHeader);
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
      const bucketLabel = document.createElement("div");
      bucketLabel.className = "drop-slot-label";
      bucketLabel.append(document.createTextNode(`${bucket.label} `));
      const countLabel = document.createElement("span");
      countLabel.className = "bucket-count";
      countLabel.textContent = String(bucketCount);
      bucketLabel.appendChild(countLabel);
      bucketNode.appendChild(bucketLabel);
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

function renderDishAssembly(question) {
  const itemMap = new Map((question.items || []).map((item) => [item.id, item]));
  const placements = Object.fromEntries((question.items || []).map((item) => [item.id, null]));
  const isMatrix = question.type === "ingredient_matrix";
  const selectedZoneId = isMatrix && question.selectedBucketId
    ? question.selectedBucketId
    : "selected";
  const ignoredMatrixBucket = isMatrix
    ? question.buckets?.find((bucket) => bucket.id !== selectedZoneId)
    : null;
  const ignoredZoneId = ignoredMatrixBucket?.id
    ? ignoredMatrixBucket.id
    : "ignored";
  const selectedMatrixBucket = isMatrix
    ? question.buckets?.find((bucket) => bucket.id === selectedZoneId)
    : null;
  const selectedZoneLabel = selectedMatrixBucket?.label
    ? selectedMatrixBucket.label
    : "Собираем блюдо";
  const ignoredZoneLabel = ignoredMatrixBucket?.label
    ? ignoredMatrixBucket.label
    : "Не использовать";
  const allowedZoneIds = new Set([selectedZoneId, ignoredZoneId]);
  let activeZone = selectedZoneId;
  const dishVisual = question.dishVisual || {};
  const wants3d =
    question.type === "dish_assembly" &&
    dishVisual.renderMode === "procedural_3d_v1" &&
    ["pizza", "salad"].includes(dishVisual.modelPreset);
  let sceneController = null;
  let sceneMounting = false;
  let disposed = false;
  let viewerShell = null;
  let sceneHost = null;
  let fallbackPlate = null;
  let viewerStatus = null;

  function selectedItems() {
    return (question.items || []).filter((item) => placements[item.id] === selectedZoneId);
  }

  function updateFallbackPlate() {
    if (!fallbackPlate) return;
    fallbackPlate.innerHTML = "";
    const items = selectedItems();
    if (!items.length) {
      const empty = document.createElement("span");
      empty.className = "dish-plate-label";
      empty.textContent = dishVisual.modelPreset === "pizza"
        ? "Основа пиццы ждёт ингредиенты"
        : "Салатник ждёт ингредиенты";
      fallbackPlate.appendChild(empty);
      return;
    }
    items.forEach((item, index) => {
      const image = document.createElement("img");
      image.className = "dish-fallback-ingredient";
      image.src = item.layerImageUrl || item.imageUrl;
      image.alt = "";
      image.style.setProperty("--dish-layer-index", String(index));
      fallbackPlate.appendChild(image);
    });
  }

  function updateDishViewer() {
    updateFallbackPlate();
    sceneController?.setSelection(selectedItems());
  }

  function createViewerShell() {
    const shell = document.createElement("div");
    shell.className = `dish-viewer dish-viewer-${dishVisual.modelPreset || "plate"}`;

    const stage = document.createElement("div");
    stage.className = "dish-viewer-stage";
    sceneHost = document.createElement("div");
    sceneHost.className = "dish-3d-host";
    sceneHost.setAttribute("aria-label", `Интерактивная 3D-сборка блюда «${question.dishLabel || "Блюдо"}»`);
    fallbackPlate = document.createElement("div");
    fallbackPlate.className = "dish-plate dish-fallback-plate";
    stage.append(fallbackPlate, sceneHost);

    const toolbar = document.createElement("div");
    toolbar.className = "dish-viewer-toolbar";
    viewerStatus = document.createElement("span");
    viewerStatus.className = "dish-viewer-status";
    viewerStatus.textContent = wants3d ? "3D загружается…" : "Визуальная сборка";

    const controls = document.createElement("div");
    controls.className = "dish-viewer-controls";
    [
      ["↶", "Повернуть блюдо влево", -0.32],
      ["↷", "Повернуть блюдо вправо", 0.32]
    ].forEach(([label, ariaLabel, delta]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dish-viewer-button";
      button.textContent = label;
      button.setAttribute("aria-label", ariaLabel);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        sceneController?.rotateBy(delta);
      });
      controls.appendChild(button);
    });
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "dish-viewer-button dish-viewer-reset";
    reset.textContent = "Сбросить вид";
    reset.addEventListener("click", (event) => {
      event.stopPropagation();
      sceneController?.resetView();
    });
    controls.appendChild(reset);
    toolbar.append(viewerStatus, controls);
    shell.append(stage, toolbar);
    return shell;
  }

  async function mountScene() {
    if (!wants3d || disposed || !sceneHost || sceneController || sceneMounting) return;
    if (navigator.connection?.saveData) {
      viewerStatus.textContent = "Облегчённый 2D-режим";
      viewerShell?.classList.add("is-fallback-only");
      return;
    }
    sceneMounting = true;
    try {
      const { mountDishScene } = await loadDishSceneModule();
      if (disposed || !sceneHost?.isConnected || sceneController) return;
      sceneController = mountDishScene(sceneHost, { preset: dishVisual.modelPreset });
      sceneController.setSelection(selectedItems());
      viewerShell.classList.add("is-3d-ready");
      viewerStatus.textContent = "Интерактивное 3D • потяните блюдо мышью";
    } catch (error) {
      console.warn("3D-сцена недоступна, используется визуальный 2D-режим.", error);
      viewerShell?.classList.add("is-fallback-only");
      if (viewerStatus) viewerStatus.textContent = "Визуальный 2D-режим";
    } finally {
      sceneMounting = false;
    }
  }

  if (wants3d) viewerShell = createViewerShell();

  if (question.savedAnswer) {
    if (Array.isArray(question.savedAnswer.selectedIngredientIds)) {
      question.savedAnswer.selectedIngredientIds.forEach((itemId) => {
        if (itemMap.has(itemId)) placements[itemId] = selectedZoneId;
      });
    }
    Object.entries(question.savedAnswer.buckets || {}).forEach(([itemId, bucketId]) => {
      if (itemMap.has(itemId) && allowedZoneIds.has(bucketId)) {
        placements[itemId] = bucketId;
      }
    });
  }

  function answerPayload() {
    const selectedIngredientIds = Object.entries(placements)
      .filter(([, zoneId]) => zoneId === selectedZoneId)
      .map(([itemId]) => itemId);
    if (isMatrix) {
      return {
        buckets: Object.fromEntries(
          Object.entries(placements).filter(([, zoneId]) => Boolean(zoneId))
        )
      };
    }
    return { selectedIngredientIds };
  }

  function remember() {
    rememberDraft(question.id, answerPayload());
  }

  function moveItem(itemId, zoneId) {
    if (!itemMap.has(itemId) || (zoneId !== null && !allowedZoneIds.has(zoneId))) return;
    placements[itemId] = zoneId;
    if (zoneId) activeZone = zoneId;
    remember();
    render();
    updateAnswerUi();
    requestAnimationFrame(() => {
      const movedCard = Array.from(
        elements.questionBody.querySelectorAll(".drag-chip[data-item-id]")
      ).find((node) => node.dataset.itemId === itemId);
      const targetZone = zoneId
        ? elements.questionBody.querySelector(`[data-zone-id="${zoneId}"]`)
        : null;
      (movedCard || targetZone)?.focus();
    });
  }

  function createAssemblyZone(zoneId, title, description) {
    const zone = document.createElement("section");
    zone.className = `dish-zone ${zoneId === selectedZoneId ? "dish-plate-zone" : "dish-unused-zone"}${
      activeZone === zoneId ? " is-active" : ""
    }`;
    zone.tabIndex = 0;
    zone.dataset.zoneId = zoneId;
    zone.setAttribute("role", "button");
    zone.setAttribute("aria-pressed", activeZone === zoneId ? "true" : "false");
    zone.setAttribute("aria-label", `${title}. ${description}`);
    zone.addEventListener("click", (event) => {
      if (!event.target.closest(".drag-chip")) {
        activeZone = zoneId;
        render();
      }
    });
    zone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activeZone = zoneId;
        render();
      }
    });
    bindDropZone(zone, question.id, (itemId) => moveItem(itemId, zoneId));

    const heading = document.createElement("div");
    heading.className = "dish-zone-heading";
    const count = Object.values(placements).filter((value) => value === zoneId).length;
    const copy = document.createElement("div");
    const titleNode = document.createElement("strong");
    titleNode.textContent = title;
    const descriptionNode = document.createElement("small");
    descriptionNode.textContent = description;
    copy.append(titleNode, descriptionNode);
    const countNode = document.createElement("span");
    countNode.textContent = String(count);
    heading.append(copy, countNode);
    zone.appendChild(heading);

    if (zoneId === selectedZoneId) {
      const plate = wants3d ? viewerShell : document.createElement("div");
      if (!wants3d) plate.className = "dish-plate";
      const visual = dishVisual;
      if (!wants3d && visual.baseImageUrl) {
        const baseImage = document.createElement("img");
        baseImage.className = "dish-base-image";
        baseImage.src = visual.baseImageUrl;
        baseImage.alt = visual.baseImageAlt || "";
        plate.appendChild(baseImage);
      } else if (!wants3d) {
        const plateLabel = document.createElement("span");
        plateLabel.className = "dish-plate-label";
        plateLabel.textContent = question.dishLabel || "Блюдо";
        plate.appendChild(plateLabel);
      }
      if (!wants3d) Object.entries(placements)
        .filter(([, value]) => value === selectedZoneId)
        .forEach(([itemId], index) => {
          const item = itemMap.get(itemId);
          if (!item || !item.layerImageUrl) return;
          const layer = document.createElement("img");
          layer.className = "dish-layer-image";
          layer.src = item.layerImageUrl;
          layer.alt = "";
          layer.style.zIndex = String(index + 2);
          plate.appendChild(layer);
        });
      zone.appendChild(plate);
    }

    const items = document.createElement("div");
    items.className = "dish-zone-items";
    const placedItems = (question.items || []).filter((item) => placements[item.id] === zoneId);
    if (!placedItems.length) {
      const empty = document.createElement("p");
      empty.className = "drop-slot-empty";
      empty.textContent = zoneId === selectedZoneId
        ? "Перетащите сюда продукт или выберите эту зону и нажмите на карточку."
        : "Сюда можно перенести продукты, которые не используются.";
      items.appendChild(empty);
    } else {
      placedItems.forEach((item) =>
        items.appendChild(
          createChip(item, question.id, {
            onClick: () => moveItem(item.id, null),
            isPlaced: true
          })
        )
      );
    }
    bindDropZone(items, question.id, (itemId) => moveItem(itemId, zoneId));
    zone.appendChild(items);
    return zone;
  }

  function render() {
    elements.questionBody.innerHTML = "";
    const layout = document.createElement("div");
    layout.className = "dish-assembly-layout";

    const visual = question.dishVisual || {};
    if (visual.variantLabel || visual.sourceNote) {
      const context = document.createElement("div");
      context.className = "dish-context-note";
      if (visual.variantLabel) {
        const label = document.createElement("strong");
        label.textContent = visual.variantLabel;
        context.appendChild(label);
      }
      if (visual.sourceNote) {
        const note = document.createElement("span");
        note.textContent = visual.sourceNote;
        context.appendChild(note);
      }
      layout.appendChild(context);
    }

    const bank = document.createElement("section");
    bank.className = "dish-bank";
    const freeItems = (question.items || []).filter((item) => !placements[item.id]);
    const bankHeading = document.createElement("div");
    bankHeading.className = "dish-zone-heading";
    const bankHeadingCopy = document.createElement("div");
    const bankTitle = document.createElement("strong");
    bankTitle.textContent = "Карточки продуктов";
    const bankHint = document.createElement("small");
    bankHint.textContent = "Перетащите или нажмите на карточку";
    bankHeadingCopy.append(bankTitle, bankHint);
    const bankCount = document.createElement("span");
    bankCount.textContent = String(freeItems.length);
    bankHeading.append(bankHeadingCopy, bankCount);
    bank.appendChild(bankHeading);
    const bankItems = document.createElement("div");
    bankItems.className = "dish-bank-items";
    if (!freeItems.length) {
      const empty = document.createElement("p");
      empty.className = "drop-slot-empty";
      empty.textContent = "Все карточки распределены.";
      bankItems.appendChild(empty);
    } else {
      freeItems.forEach((item) =>
        bankItems.appendChild(
          createChip(item, question.id, {
            onClick: () => moveItem(item.id, activeZone)
          })
        )
      );
    }
    bindDropZone(bankItems, question.id, (itemId) => moveItem(itemId, null));
    bank.appendChild(bankItems);

    const zones = document.createElement("div");
    zones.className = "dish-zones";
    zones.appendChild(createAssemblyZone(selectedZoneId, selectedZoneLabel, "Компоненты, которые входят в состав"));
    if (isMatrix) {
      zones.appendChild(createAssemblyZone(ignoredZoneId, ignoredZoneLabel, "Лишние компоненты"));
    }
    layout.append(bank, zones);
    elements.questionBody.appendChild(layout);
    updateDishViewer();
    if (wants3d && !sceneController) requestAnimationFrame(mountScene);
  }

  render();
  return {
    getAnswer: answerPayload,
    dispose() {
      disposed = true;
      sceneController?.dispose();
      sceneController = null;
    }
  };
}

function renderQuestion(question) {
  state.questionController?.dispose?.();
  elements.questionBody.innerHTML = "";
  state.questionController = null;

  if (!question) {
    elements.questionPrompt.textContent = "Вопрос не загружен";
    elements.questionPoints.textContent = formatPoints(0);
    hideMessage(elements.questionCase);
    elements.questionNote.classList.add("hidden");
    return;
  }

  const hydratedQuestion = {
    ...question,
    savedAnswer:
      question.savedAnswer ||
      queuedAnswerForQuestion(question.id) ||
      state.localDrafts[question.id] ||
      null
  };

  elements.questionPrompt.textContent = hydratedQuestion.prompt;
  elements.questionPoints.textContent = formatPoints(hydratedQuestion.maxScore);

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

  const isInteractive = ["sequence_drag", "bucket_sort", "ingredient_matrix", "dish_assembly"].includes(
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
  } else if (hydratedQuestion.type === "bucket_sort") {
    state.questionController = renderBucketController(hydratedQuestion);
  } else if (
    hydratedQuestion.type === "ingredient_matrix" ||
    hydratedQuestion.type === "dish_assembly"
  ) {
    state.questionController = renderDishAssembly(hydratedQuestion);
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
      "Отправленные ответы зафиксированы автоматически. Подробный итог и решение комиссии доступны у организатора.";
  }

  renderResultOverview(summary, state.attempt, scoresVisible);
  renderResultNextSteps(scoresVisible);

  (summary.tourScores || []).forEach((tour) => {
    const card = document.createElement("div");
    card.className = "result-card";
    const code = document.createElement("strong");
    code.textContent = tour.code;
    const title = document.createElement("span");
    title.textContent = tour.title;
    const score = document.createElement("b");
    score.textContent = tour.finalScore === null ? "результат скрыт" : `${tour.finalScore} / ${tour.maxScore}`;
    const note = document.createElement("small");
    note.textContent = tour.finalScore === null
      ? "Баллы по туру увидит организатор."
      : "Баллы рассчитаны автоматически.";
    card.append(code, title, score, note);
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
  if (attempt?.id) state.activeAttemptId = attempt.id;
  attachPendingQueue(attempt);
  attachIntegrityQueue(attempt);
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

async function performPendingAnswerFlush(options = {}) {
  if (
    !state.attempt ||
    (state.isFinishingAttempt && !options.allowWhileFinishing) ||
    !hasPendingAnswers()
  ) {
    return;
  }

  cancelPendingFlushRetry();
  state.pendingFlushInFlight = true;
  refreshAttemptControls();
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
  } catch (caughtError) {
    let error = caughtError;
    const pendingItem = state.pendingAnswerQueue[0] || null;

    if (error.status === 409 && pendingItem) {
      try {
        const current = await api(`/api/public/attempts/${state.attempt.id}/current`);
        const pendingIsAlreadyPast =
          current.status !== "in_progress" ||
          current.currentQuestion?.id !== pendingItem.questionId;
        if (pendingIsAlreadyPast) {
          state.pendingAnswerQueue.shift();
          persistPendingAnswerQueue();
          applyAttemptState(current, { preserveQuestionRender: false });
          setAttemptSaveStatus("Состояние синхронизировано", "success");
          setAttemptSyncMeta("Сервер уже перешёл дальше; устаревший запрос удалён из очереди.");
          return current;
        }
      } catch (syncError) {
        error = syncError;
      }
    }

    if ((error.status === 400 || error.status === 422) && state.pendingAnswerQueue.length) {
      state.pendingAnswerQueue.shift();
      persistPendingAnswerQueue();
    }

    const message = formatApiError(error);
    const retriable = isRetriableError(error);
    setAttemptSaveStatus(
      options.blocking
        ? "Не удалось сохранить ответы перед завершением"
        : retriable
          ? "Ответ принят, но облачная синхронизация временно задержалась"
          : "Ответ не сохранён: требуется действие участника",
      options.blocking || !retriable ? "error" : "warning"
    );
    setAttemptSyncMeta(`Синхронизация: ${message}`);
    if (!retriable) {
      showMessage(elements.attemptMessage, formatAnswerActionMessage(error), "error");
    }
    if (options.blocking) {
      throw error;
    }
    if (retriable) schedulePendingFlushRetry();
  } finally {
    state.pendingFlushInFlight = false;
    refreshAttemptControls();
  }
}

async function flushPendingAnswers(options = {}) {
  const activeFlush = state.pendingFlushPromise;
  if (activeFlush) {
    let result;
    try {
      result = await activeFlush;
    } finally {
      if (state.pendingFlushPromise === activeFlush) {
        state.pendingFlushPromise = null;
      }
    }
    if (options.blocking && hasPendingAnswers()) {
      return flushPendingAnswers(options);
    }
    if (options.blocking && !result) {
      const error = new Error(
        "Сервер не подтвердил сохранение отложенного ответа. Проверьте текущий вопрос и повторите действие."
      );
      error.status = 422;
      throw error;
    }
    return result;
  }

  if (
    !state.attempt ||
    (state.isFinishingAttempt && !options.allowWhileFinishing) ||
    !hasPendingAnswers()
  ) {
    return null;
  }

  const operation = performPendingAnswerFlush(options);
  state.pendingFlushPromise = operation;
  try {
    return await operation;
  } finally {
    if (state.pendingFlushPromise === operation) {
      state.pendingFlushPromise = null;
    }
  }
}

async function handleRegistration(event) {
  event.preventDefault();
  hideMessage(elements.registrationMessage);
  hideMessage(elements.prestartMessage);
  elements.registrationSubmit.disabled = true;
  elements.registrationSubmit.textContent = "Сохраняем данные…";
  elements.registrationForm.setAttribute("aria-busy", "true");

  try {
    const data = await api("/api/public/register", {
      method: "POST",
      body: JSON.stringify(participantFromForm())
    });

    state.participant = data.participant;
    state.activeAttemptId = data.activeAttemptId || "";
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
    showMessage(elements.registrationMessage, formatApiError(error), "error");
  } finally {
    elements.registrationSubmit.disabled = false;
    elements.registrationSubmit.textContent = "Сохранить данные";
    elements.registrationForm.removeAttribute("aria-busy");
  }
}

async function startAttempt() {
  if (state.isStartingAttempt || !state.participant) return;
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
  state.isStartingAttempt = true;
  updateStartAvailability();
  setAttemptSaveStatus("Открываем маршрут...", "pending");
  setAttemptSyncMeta("Подбираем вариант и подключаемся к облаку...");

  try {
    const pendingStartKey = await makePendingStartKey(state.participant);
    const attemptToken =
      loadAttemptAccessToken(state.activeAttemptId) ||
      loadPendingStartToken(pendingStartKey) ||
      createAttemptAccessToken();
    rememberPendingStartToken(pendingStartKey, attemptToken);
    const attempt = await requestWithRetry(
      () =>
        api("/api/public/attempts/start", {
          method: "POST",
          attemptToken,
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
    rememberAttemptAccessToken(attempt.id, attemptToken);
    clearPendingStartToken(pendingStartKey);
    state.activeAttemptId = attempt.id;
    state.participant = attempt.participant;
    elements.startAttempt.textContent = "Продолжить олимпиаду";
    applyAttemptState(attempt);
    startTimers();
    refreshAttemptControls();
    setAttemptSaveStatus("Маршрут открыт", "success");
    setAttemptSyncMeta(`Подключение подтверждено: ${formatDateTime(new Date())}`);
    showMessage(
      elements.attemptMessage,
      "Маршрут открыт. Ответы будут автоматически сохраняться в облаке, а защищённый режим олимпиады включён.",
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
  } finally {
    state.isStartingAttempt = false;
    updateStartAvailability();
  }
}

async function submitAnswer() {
  if (!state.attempt || !state.questionController || state.isSubmittingAnswer || state.isFinishingAttempt) {
    return;
  }

  const previousQuestionId = state.attempt.currentQuestion && state.attempt.currentQuestion.id;
  const answerPayload = state.questionController.getAnswer();
  if (!hasMeaningfulAnswer(answerPayload)) {
    showMessage(
      elements.attemptMessage,
      "Сначала выберите или разместите хотя бы один вариант ответа.",
      "warning"
    );
    refreshAttemptControls();
    updateExamCockpit();
    return;
  }
  hideMessage(elements.attemptMessage);
  rememberDraft(previousQuestionId, answerPayload);
  const queuedAnswer = state.pendingAnswerQueue.find(
    (item) => item.questionId === previousQuestionId
  );
  if (queuedAnswer) {
    queuedAnswer.answerPayload = answerPayload;
  } else {
    state.pendingAnswerQueue.push({
      questionId: previousQuestionId,
      answerPayload
    });
  }
  persistPendingAnswerQueue();
  clearDraft(previousQuestionId);

  state.isSubmittingAnswer = true;
  setAttemptSaveStatus("Сохраняем ответ на сервере...", "pending");
  setAttemptSyncMeta("Следующее задание откроется после подтверждения записи.");
  refreshAttemptControls();

  try {
    const data = await flushPendingAnswers({ blocking: true });
    if (!data || hasPendingAnswers()) {
      throw new Error("Сервер не подтвердил сохранение ответа. Повторите отправку.");
    }

    if (data && data.status === "in_progress") {
      startTimers();
      setAttemptSaveStatus("Ответ сохранён", "success");
    } else {
      setAttemptSaveStatus("Финальный ответ принят. Маршрут завершён.", "success");
      showMessage(elements.attemptMessage, "Маршрут завершён.", "success");
    }
    setAttemptSyncMeta(`Ответ записан: ${formatDateTime(new Date())}`);
  } catch (error) {
    const message = formatAnswerActionMessage(error);
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

  const confirmed = window.confirm(
    "Завершить олимпиаду досрочно? Текущий ответ будет сохранён, после завершения вернуться к заданиям нельзя."
  );
  if (!confirmed) {
    return;
  }

  state.isFinishingAttempt = true;
  hideMessage(elements.attemptMessage);
  setAttemptSaveStatus("Завершаем маршрут...", "pending");
  setAttemptSyncMeta("Проверяем очередь ответов и фиксируем итог...");
  refreshAttemptControls();
  try {
    if (state.pendingFlushPromise) {
      await flushPendingAnswers({ allowWhileFinishing: true });
    }
    const currentQuestion = state.attempt.currentQuestion;
    if (currentQuestion && state.questionController?.getAnswer) {
      const answerPayload = state.questionController.getAnswer();
      const answerIsMeaningful = hasMeaningfulAnswer(answerPayload);
      const queuedAnswer = state.pendingAnswerQueue.find(
        (item) => item.questionId === currentQuestion.id
      );
      if (queuedAnswer && answerIsMeaningful) {
        queuedAnswer.answerPayload = answerPayload;
      } else if (!queuedAnswer && answerIsMeaningful) {
        state.pendingAnswerQueue.push({
          questionId: currentQuestion.id,
          answerPayload
        });
      }
      if (answerIsMeaningful) {
        persistPendingAnswerQueue();
      }
    }
    const hadAnswerToFlush = hasPendingAnswers();
    const flushedAttempt = await flushPendingAnswers({
      blocking: true,
      allowWhileFinishing: true
    });
    if (hadAnswerToFlush && (!flushedAttempt || hasPendingAnswers())) {
      throw new Error("Сервер не подтвердил сохранение ответа перед завершением.");
    }
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
  hideMessage(elements.heroLoadMessage);
  elements.heroRetry?.classList.add("hidden");
  elements.registrationSubmit.disabled = false;
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
      flushIntegrityEvents();
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
  elements.navRules.addEventListener("click", () => scrollToSection(elements.prestartSection));
  elements.heroActionRegister.addEventListener("click", () => {
    if (state.attempt?.status === "in_progress") {
      scrollToSection(elements.attemptSection);
    } else if (state.attempt) {
      scrollToSection(elements.resultSection);
    } else {
      scrollToSection(elements.prestartSection);
      (state.participant ? elements.startConsent : elements.fullName).focus({ preventScroll: true });
    }
  });
  elements.heroActionRules.addEventListener("click", () => scrollToSection(elements.howSection));
  elements.howRules.addEventListener("click", () => scrollToSection(elements.prestartSection));
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
  elements.questionBody.addEventListener("change", updateAnswerUi);
  elements.questionBody.addEventListener("input", updateAnswerUi);
  elements.questionBody.addEventListener("click", updateAnswerUi);
  elements.questionBody.addEventListener("drop", updateAnswerUi);
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
  await restoreSessionAttempt();
}

function showInitializationError(error) {
  const reason = error?.status === 0 || error?.status >= 500
    ? "Сервер временно недоступен."
    : formatApiError(error);
  const message = `Не удалось загрузить олимпиаду. ${reason} Проверьте соединение и повторите загрузку.`;
  showMessage(elements.heroLoadMessage, message, "error");
  elements.heroRetry?.classList.remove("hidden");
  if (elements.heroActionRegister) elements.heroActionRegister.disabled = true;
  elements.registrationSubmit.disabled = true;
  refreshNavigationState();
  if (elements.networkStatus) {
    elements.networkStatus.textContent = "Сервер недоступен";
    elements.networkStatus.className = "network-badge offline";
  }
  setAttemptSaveStatus("Не удалось загрузить олимпиаду", "error");
  setAttemptSyncMeta(`Инициализация: ${formatApiError(error)}`);
}

elements.heroRetry?.addEventListener("click", () => {
  elements.heroRetry.disabled = true;
  elements.heroRetry.textContent = "Подключаемся…";
  hideMessage(elements.heroLoadMessage);
  init().catch(showInitializationError).finally(() => {
    elements.heroRetry.disabled = false;
    elements.heroRetry.textContent = "Повторить загрузку";
  });
});

init().catch(showInitializationError);
