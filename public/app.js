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
  pendingFlushDebounceTimer: null,
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
  heroStageValue: document.getElementById("hero-stage-value"),
  heroStageNote: document.getElementById("hero-stage-note"),
  heroProgressValue: document.getElementById("hero-progress-value"),
  heroProgressNote: document.getElementById("hero-progress-note"),
  heroSyncValue: document.getElementById("hero-sync-value"),
  heroSyncNote: document.getElementById("hero-sync-note"),
  heroActionRegister: document.getElementById("hero-action-register"),
  heroActionAttempt: document.getElementById("hero-action-attempt"),
  heroActionResult: document.getElementById("hero-action-result"),
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

function applyStaticRussianCopy() {
  const setText = (selector, text) => {
    const node = document.querySelector(selector);
    if (node) {
      node.textContent = text;
    }
  };

  setText(".nav-ribbon-label", "Навигация");
  setText("#nav-menu-toggle", "Меню");
  setText(".nav-ribbon-title", "Платформа олимпиады");
  setText(".nav-ribbon-summary small", "Регистрация, прохождение и результаты в одном окне.");
  setText("#nav-back", "Назад");
  setText("#nav-home", "Главная");
  setText("#nav-register", "Регистрация");
  setText("#nav-attempt", "Текущий тур");
  setText("#nav-result", "Результат");
  setText("#network-status", "Сеть: связь есть");
  setText("#install-app", "Установить приложение");
  const adminLink = document.querySelector('a[href="/admin.html"]');
  if (adminLink) {
    adminLink.textContent = "Облачная админка";
  }

  setText(".hero-copy .eyebrow", "Цифровая олимпиада");
  setText("#hero-title", "Национальные кухни мира");
  setText("#hero-subtitle", "Индивидуальная олимпиада с автоматической проверкой, пошаговым прохождением и сохранением результатов в облаке.");
  setText("#hero-format-badge", "Индивидуальная цифровая олимпиада • 45 минут • 5 туров");
  setText(".hero-dashboard-top .eyebrow", "Оперативный контур");
  setText(".hero-dashboard-top strong", "Платформа готова к проведению");
  setText(".hero-dashboard-top .muted", "Быстрый старт, пошаговый маршрут и сохранение результатов.");

  setText("#hero-stage-value", "Подготовка");
  setText("#hero-stage-note", "Заполните данные участника перед стартом.");
  setText("#hero-progress-note", "Прогресс появится после регистрации.");
  setText("#hero-sync-value", "Онлайн");
  setText("#hero-sync-note", "Результаты сохраняются в облаке организатора.");
  setText(".exam-preflight-note", "После старта включается экзаменационный режим. Копирование и выход из активного окна фиксируются автоматически.");
  const preflightStrong = document.querySelector(".exam-preflight-note strong");
  if (preflightStrong) {
    preflightStrong.textContent = "После старта включается экзаменационный режим.";
  }

  setText("#journey-status", "Точка входа: регистрация");
  setText("#journey-progress-label", "Готовность маршрута: 0%");
  setText("#journey-progress-hint", "После регистрации система откроет первый тур.");

  const sectionIntro = document.querySelectorAll(".section-intro");
  if (sectionIntro[0]) {
    sectionIntro[0].textContent = "Заполните данные участника перед стартом.";
  }
  if (sectionIntro[1]) {
    sectionIntro[1].textContent = "Перед стартом подтвердите готовность и проверьте правила.";
  }

  const featureTexts = [
    ["Индивидуальный вариант", "Для каждого участника формируется свой вариант."],
    ["Пошаговое прохождение", "На экране только один вопрос без возврата назад."],
    ["Автопроверка", "Ответы проверяются автоматически и без задержек."],
    ["Результаты в облаке", "Результаты сохраняются в облаке и доступны организатору."]
  ];
  document.querySelectorAll(".hero-feature-card").forEach((card, index) => {
    const title = card.querySelector("strong");
    const text = card.querySelector("span");
    if (title && featureTexts[index]) {
      title.textContent = featureTexts[index][0];
    }
    if (text && featureTexts[index]) {
      text.textContent = featureTexts[index][1];
    }
  });

  const registrationLabels = document.querySelectorAll("#registration-form .field span");
  const registrationTexts = [
    "ФИО участника",
    "Образовательная организация",
    "Учебная группа, код и название специальности/профессии",
    "ФИО наставника"
  ];
  registrationLabels.forEach((label, index) => {
    if (registrationTexts[index]) {
      label.textContent = registrationTexts[index];
    }
  });

  if (elements.fullName) {
    elements.fullName.placeholder = "Иванов Иван Иванович";
  }
  if (elements.institution) {
    elements.institution.value = "ГБПОУ «Горловский колледж технологий и сервиса»";
  }
  if (elements.groupName) {
    elements.groupName.placeholder = "№4/П-24, 43.01.09 Повар, кондитер";
  }
  if (elements.mentorName) {
    elements.mentorName.placeholder = "Постовит Дмитрий Александрович, преподаватель профильных дисциплин";
  }

  setText("#start-consent-hint", "Сохраните данные участника и подтвердите готовность работать 45 минут без отвлечений.");
  const consentText = document.querySelector(".consent-check span");
  if (consentText) {
    consentText.textContent = "Я понимаю, что после старта нужно выделить 45 минут и пройти олимпиаду без отвлечений.";
  }
  const registrationSubmit = document.querySelector('#registration-form button[type=\"submit\"]');
  if (registrationSubmit) {
    registrationSubmit.textContent = "Сохранить данные";
  }
  setText("#start-attempt", "Начать олимпиаду");
}

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
  const resultVisible = Boolean(state.attempt) && !elements.resultSection.classList.contains("hidden");

  const registerHint = "Регистрация доступна до старта олимпиады.";
  const attemptHint = "Текущий тур откроется после запуска маршрута.";
  const resultHint = "Результат появится после завершения попытки.";

  setButtonAvailability(elements.navRegister, !attemptActive && !resultVisible, registerHint);
  setButtonAvailability(elements.heroActionRegister, !attemptActive && !resultVisible, registerHint);
  setButtonAvailability(elements.navAttempt, attemptActive, attemptHint);
  setButtonAvailability(elements.heroActionAttempt, attemptActive, attemptHint);
  setButtonAvailability(elements.navResult, Boolean(state.attempt && state.attempt.status !== "in_progress"), resultHint);
  setButtonAvailability(elements.heroActionResult, Boolean(state.attempt && state.attempt.status !== "in_progress"), resultHint);

  updateHeroSnapshot();
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
    elements.submitAnswer.textContent = "Отправляем ответ...";
    elements.finishAttempt.textContent = "Завершить досрочно";
    return;
  }

  if (state.isFinishingAttempt) {
    elements.finishAttempt.textContent = "Завершаем попытку...";
    elements.submitAnswer.textContent = "Ответить и далее";
    return;
  }

  if (isBlockedByGuard) {
    elements.submitAnswer.textContent = "Вернуться в окно";
    elements.finishAttempt.textContent = "Вернуться в окно";
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
    return "РІР‚вЂќ";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "РІР‚вЂќ";
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
  updateHeroSnapshot();
}

function setAttemptSyncMeta(message) {
  if (!elements.attemptSyncMeta) {
    return;
  }

  elements.attemptSyncMeta.textContent = message;
  updateExamCockpit();
  updateHeroSnapshot();
}

function setShellBadge(element, text, tone = "neutral") {
  if (!element) {
    return;
  }

  element.textContent = text;
  element.className = `system-pill ${tone}`;
}

function updateHeroSnapshot() {
  if (!elements.heroStageValue || !state.olympiad) {
    return;
  }

  const progress = getJourneyProgressModel();
  let stageValue = "Подготовка";
  let stageNote = "Заполните данные участника перед стартом.";

  if (state.participant) {
    stageValue = "Регистрация завершена";
    stageNote = "Можно подтвердить готовность и начать маршрут.";
  }

  if (state.attempt && state.attempt.status === "in_progress") {
    const currentTour = state.attempt.currentTour;
    stageValue = currentTour ? `${currentTour.code} • в работе` : "Олимпиада идёт";
    stageNote = currentTour
      ? `${currentTour.title}. Вопрос ${state.attempt.progress.tourQuestionIndex} из ${state.attempt.progress.tourQuestionCount}.`
      : "Маршрут выполняется по шагам.";
  } else if (state.attempt && state.attempt.status !== "in_progress") {
    stageValue = "Маршрут завершён";
    stageNote = "Попытка сохранена, итог доступен организатору.";
  }

  let syncValue = state.isOnline ? "Онлайн" : "Нет связи";
  if (state.attempt && state.attempt.status === "in_progress") {
    syncValue = state.isOnline ? "Сохранение активно" : "Ожидание сети";
  } else if (state.attempt && state.attempt.status !== "in_progress") {
    syncValue = state.isOnline ? "Итог сохранён" : "Сохранится при сети";
  }

  const syncNote =
      (elements.attemptSyncMeta && elements.attemptSyncMeta.textContent) ||
      (state.isOnline
        ? "Результаты сохраняются в облаке организатора."
        : "Связь нестабильна. Данные будут отправлены позже.");

  elements.heroStageValue.textContent = stageValue;
  elements.heroStageNote.textContent = stageNote;
  elements.heroProgressValue.textContent = `${progress.percent}%`;
  elements.heroProgressNote.textContent = progress.hint || progress.label;
  elements.heroSyncValue.textContent = syncValue;
  elements.heroSyncNote.textContent = syncNote;
}


function isAttemptInProgress() {
  return Boolean(state.attempt && state.attempt.status === "in_progress");
}

function updateExamGuardUi() {
  if (elements.examIncidentsBadge) {
    elements.examIncidentsBadge.textContent = `Р РЋРЎР‚Р В°Р В±Р В°РЎвЂљРЎвЂ№Р Р†Р В°Р Р…Р С‘Р в„–: ${state.examIncidents}`;
  }

  if (elements.examGuardMessage) {
    elements.examGuardMessage.textContent =
      state.examGuardReason ||
      "Р вЂ™Р ВµРЎР‚Р Р…Р С‘РЎвЂљР ВµРЎРѓРЎРЉ Р Р† Р В°Р С”РЎвЂљР С‘Р Р†Р Р…Р С•Р Вµ Р С•Р С”Р Р…Р С• Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎвЂ№ Р С‘ Р Р†Р С•РЎРѓРЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р С‘РЎвЂљР Вµ Р С—Р С•Р В»Р Р…Р С•РЎРЊР С”РЎР‚Р В°Р Р…Р Р…РЎвЂ№Р в„– РЎР‚Р ВµР В¶Р С‘Р С, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р С—РЎР‚Р С•Р Т‘Р С•Р В»Р В¶Р С‘РЎвЂљРЎРЉ.";
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

  const nextReason = reason || "Р С›Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘Р В° Р Р†РЎР‚Р ВµР СР ВµР Р…Р Р…Р С• Р С—Р С•РЎРѓРЎвЂљР В°Р Р†Р В»Р ВµР Р…Р В° Р Р…Р В° Р С”Р С•Р Р…РЎвЂљРЎР‚Р С•Р В»РЎРЉ.";
  if (!state.examGuardActive || state.examGuardReason !== nextReason) {
    state.examIncidents += 1;
  }

  state.examGuardActive = true;
  state.examGuardReason = nextReason;
  updateExamGuardUi();
  refreshAttemptControls();
  setAttemptSaveStatus("Р В­Р С”Р В·Р В°Р СР ВµР Р…Р В°РЎвЂ Р С‘Р С•Р Р…Р Р…РЎвЂ№Р в„– РЎР‚Р ВµР В¶Р С‘Р С Р С—РЎР‚Р С‘Р С•РЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р В»Р ВµР Р…", "warning");
  setAttemptSyncMeta("Р вЂ™Р ВµРЎР‚Р Р…Р С‘РЎвЂљР ВµРЎРѓРЎРЉ Р Р† Р В°Р С”РЎвЂљР С‘Р Р†Р Р…Р С•Р Вµ Р С•Р С”Р Р…Р С• Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎвЂ№ Р С‘ Р Р†Р С•РЎРѓРЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р С‘РЎвЂљР Вµ Р С—Р С•Р В»Р Р…Р С•РЎРЊР С”РЎР‚Р В°Р Р…Р Р…РЎвЂ№Р в„– РЎР‚Р ВµР В¶Р С‘Р С.");
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
    setAttemptSyncMeta(`Р С™Р С•Р Р…РЎвЂљРЎР‚Р С•Р В»РЎРЉ Р Р†Р С•РЎРѓРЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р В»Р ВµР Р…: ${formatDateTime(new Date())}`);
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
    elements.navMenuToggle.textContent = state.navDrawerOpen ? "Р вЂ”Р В°Р С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ Р СР ВµР Р…РЎР‹" : "Р СљР ВµР Р…РЎР‹";
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
    elements.startConsentHint.textContent = "Р вЂќР В»РЎРЏ РЎРЊРЎвЂљР С•Р С–Р С• РЎС“РЎвЂЎР В°РЎРѓРЎвЂљР Р…Р С‘Р С”Р В° Р С—Р С•Р Р†РЎвЂљР С•РЎР‚Р Р…РЎвЂ№Р в„– РЎРѓРЎвЂљР В°РЎР‚РЎвЂљ РЎС“Р В¶Р Вµ Р В·Р В°Р С”РЎР‚РЎвЂ№РЎвЂљ.";
  } else if (!hasParticipant) {
    elements.startConsentHint.textContent =
      "Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…Р С‘РЎвЂљР Вµ Р Т‘Р В°Р Р…Р Р…РЎвЂ№Р Вµ РЎС“РЎвЂЎР В°РЎРѓРЎвЂљР Р…Р С‘Р С”Р В°. Р СџР С•Р Т‘РЎвЂљР Р†Р ВµРЎР‚Р Т‘Р С‘РЎвЂљР Вµ Р С–Р С•РЎвЂљР С•Р Р†Р Р…Р С•РЎРѓРЎвЂљРЎРЉ РЎР‚Р В°Р В±Р С•РЎвЂљР В°РЎвЂљРЎРЉ 45 Р СР С‘Р Р…РЎС“РЎвЂљ Р В±Р ВµР В· Р С•РЎвЂљР Р†Р В»Р ВµРЎвЂЎР ВµР Р…Р С‘Р в„–.";
  } else if (!consentGranted) {
    elements.startConsentHint.textContent =
      "Р СџР С•Р Т‘РЎвЂљР Р†Р ВµРЎР‚Р Т‘Р С‘РЎвЂљР Вµ Р С–Р С•РЎвЂљР С•Р Р†Р Р…Р С•РЎРѓРЎвЂљРЎРЉ РЎР‚Р В°Р В±Р С•РЎвЂљР В°РЎвЂљРЎРЉ 45 Р СР С‘Р Р…РЎС“РЎвЂљ Р В±Р ВµР В· Р С•РЎвЂљР Р†Р В»Р ВµРЎвЂЎР ВµР Р…Р С‘Р в„–.";
  } else {
    elements.startConsentHint.textContent = "Р СџР С•Р Т‘РЎвЂљР Р†Р ВµРЎР‚Р В¶Р Т‘Р ВµР Р…Р С‘Р Вµ Р С—Р С•Р В»РЎС“РЎвЂЎР ВµР Р…Р С•. Р СљР С•Р В¶Р Р…Р С• Р В·Р В°Р С—РЎС“РЎРѓР С”Р В°РЎвЂљРЎРЉ Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎС“.";
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
      activateExamGuard("Р вЂ™Р С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљР Вµ Р С—Р С•Р В»Р Р…Р С•РЎРЊР С”РЎР‚Р В°Р Р…Р Р…РЎвЂ№Р в„– РЎР‚Р ВµР В¶Р С‘Р С, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р С—РЎР‚Р С•Р Т‘Р С•Р В»Р В¶Р С‘РЎвЂљРЎРЉ Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎС“.");
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
    releaseExamGuard("Р С™Р С•Р Р…РЎвЂљРЎР‚Р С•Р В»РЎРЉ Р Р†Р С•РЎРѓРЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р В»Р ВµР Р…. Р СљР С•Р В¶Р Р…Р С• Р С—РЎР‚Р С•Р Т‘Р С•Р В»Р В¶Р В°РЎвЂљРЎРЉ.");
    return true;
  }

  activateExamGuard(
    !focusReady
      ? "Р вЂ™Р ВµРЎР‚Р Р…Р С‘РЎвЂљР ВµРЎРѓРЎРЉ Р Р† Р В°Р С”РЎвЂљР С‘Р Р†Р Р…Р С•Р Вµ Р С•Р С”Р Р…Р С• Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎвЂ№, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р С—РЎР‚Р С•Р Т‘Р С•Р В»Р В¶Р С‘РЎвЂљРЎРЉ."
      : "Р вЂ™Р С•РЎРѓРЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р С‘РЎвЂљР Вµ Р С—Р С•Р В»Р Р…Р С•РЎРЊР С”РЎР‚Р В°Р Р…Р Р…РЎвЂ№Р в„– РЎР‚Р ВµР В¶Р С‘Р С, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р С—РЎР‚Р С•Р Т‘Р С•Р В»Р В¶Р С‘РЎвЂљРЎРЉ."
  );
  return false;
}

function handleProtectedClipboard(event) {
  if (!isAttemptInProgress()) {
    return;
  }

  event.preventDefault();
  announceRestriction("Р С™Р С•Р С—Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р Вµ Р С‘ Р Р†РЎвЂ№РЎР‚Р ВµР В·Р В°Р Р…Р С‘Р Вµ РЎвЂљР ВµР С”РЎРѓРЎвЂљР В° Р Р†Р С• Р Р†РЎР‚Р ВµР СРЎРЏ Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎвЂ№ Р С•РЎвЂљР С”Р В»РЎР‹РЎвЂЎР ВµР Р…РЎвЂ№.");
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
  announceRestriction("Р С™Р С•Р Р…РЎвЂљР ВµР С”РЎРѓРЎвЂљР Р…Р С•Р Вµ Р СР ВµР Р…РЎР‹ Р Р†Р С• Р Р†РЎР‚Р ВµР СРЎРЏ Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎвЂ№ Р С•РЎвЂљР С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р С•.");
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
    announceRestriction("Р В§Р В°РЎРѓРЎвЂљРЎРЉ Р В±РЎР‚Р В°РЎС“Р В·Р ВµРЎР‚Р Р…РЎвЂ№РЎвЂ¦ Р С–Р С•РЎР‚РЎРЏРЎвЂЎР С‘РЎвЂ¦ Р С”Р В»Р В°Р Р†Р С‘РЎв‚¬ Р Р†РЎР‚Р ВµР СР ВµР Р…Р Р…Р С• Р С•РЎвЂљР С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р В°.");
  }
}

function handleExamVisibilityChange() {
  if (!isAttemptInProgress()) {
    return;
  }

  if (document.visibilityState !== "visible") {
    activateExamGuard("Р С›Р С”Р Р…Р С• Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎвЂ№ Р С—Р С•Р С”Р С‘Р Р…РЎС“Р В»Р С• Р В°Р С”РЎвЂљР С‘Р Р†Р Р…РЎС“РЎР‹ Р Р†Р С”Р В»Р В°Р Т‘Р С”РЎС“. Р вЂ™Р ВµРЎР‚Р Р…Р С‘РЎвЂљР ВµРЎРѓРЎРЉ Р Р† Р Р…Р ВµРЎвЂ, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р С—РЎР‚Р С•Р Т‘Р С•Р В»Р В¶Р С‘РЎвЂљРЎРЉ.");
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
      activateExamGuard("Р С›Р С”Р Р…Р С• Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎвЂ№ Р С—Р С•РЎвЂљР ВµРЎР‚РЎРЏР В»Р С• РЎвЂћР С•Р С”РЎС“РЎРѓ. Р вЂ™Р ВµРЎР‚Р Р…Р С‘РЎвЂљР ВµРЎРѓРЎРЉ Р С” Р С—РЎР‚Р С•РЎвЂ¦Р С•Р В¶Р Т‘Р ВµР Р…Р С‘РЎР‹, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р С—РЎР‚Р С•Р Т‘Р С•Р В»Р В¶Р С‘РЎвЂљРЎРЉ.");
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
    activateExamGuard("Р СџР С•Р В»Р Р…Р С•РЎРЊР С”РЎР‚Р В°Р Р…Р Р…РЎвЂ№Р в„– РЎР‚Р ВµР В¶Р С‘Р С Р Р†РЎвЂ№Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…. Р вЂ™Р С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљР Вµ Р ВµР С–Р С• РЎРѓР Р…Р С•Р Р†Р В°, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р С—РЎР‚Р С•Р Т‘Р С•Р В»Р В¶Р С‘РЎвЂљРЎРЉ.");
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
      activateExamGuard("Р вЂ™Р С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљР Вµ Р С—Р С•Р В»Р Р…Р С•РЎРЊР С”РЎР‚Р В°Р Р…Р Р…РЎвЂ№Р в„– РЎР‚Р ВµР В¶Р С‘Р С, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р С—РЎР‚Р С•Р Т‘Р С•Р В»Р В¶Р С‘РЎвЂљРЎРЉ Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎС“.");
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
    setShellBadge(elements.participantModeBadge, "Режим: ожидание", "neutral");
    setShellBadge(elements.participantStageBadge, "Этап: стартовая подготовка", "neutral");
    setShellBadge(elements.participantExamBadge, "Экзаменационный режим: не активен", "neutral");
    setShellBadge(elements.participantStabilityBadge, "Синхронизация: готова к старту", "neutral");
    updateExamGuardUi();
    return;
  }

  setShellBadge(
    elements.participantModeBadge,
    attemptInProgress ? "Режим: прохождение" : "Режим: завершён",
    attemptInProgress ? "active" : "ready"
  );

  if (attemptInProgress && attempt.currentTour) {
    setShellBadge(
      elements.participantStageBadge,
      `Этап: ${attempt.currentTour.code} • ${attempt.progress.tourQuestionIndex}/${attempt.progress.tourQuestionCount}`,
      "active"
    );
  } else {
    setShellBadge(elements.participantStageBadge, "Этап: маршрут завершён", "ready");
  }

  if (!attemptInProgress) {
    setShellBadge(elements.participantExamBadge, "Экзаменационный режим: завершён", "ready");
  } else if (state.examGuardActive) {
    setShellBadge(elements.participantExamBadge, `Экзаменационный режим: контроль (${state.examIncidents})`, "warning");
  } else {
    setShellBadge(elements.participantExamBadge, `Экзаменационный режим: активен (${state.examIncidents})`, "ready");
  }

  if (!state.isOnline) {
    setShellBadge(elements.participantStabilityBadge, "Синхронизация: нет связи", "warning");
    updateExamGuardUi();
    return;
  }

  if (state.isSubmittingAnswer || state.isFinishingAttempt || state.syncInFlight) {
    setShellBadge(elements.participantStabilityBadge, "Синхронизация: идёт отправка", "active");
    updateExamGuardUi();
    return;
  }

  if (attemptInProgress || totalQuestions > 0 || questionIndex > 0) {
    setShellBadge(elements.participantStabilityBadge, "Синхронизация: данные сохранены", "ready");
    updateExamGuardUi();
    return;
  }

  setShellBadge(elements.participantStabilityBadge, "Синхронизация: готова к старту", "neutral");
  updateExamGuardUi();
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
      hint: "Данные участника сохранены. Можно запускать первый тур."
    };
  }

  if (state.attempt.status !== "in_progress") {
    return {
      percent: 100,
      label: "Готовность маршрута: 100%",
      hint: "Маршрут завершён. Результат сохранён в облаке."
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
    elements.paceValue.textContent = "РІР‚вЂќ";
    elements.paceHint.textContent = "Р СџР С•РЎРѓР В»Р Вµ РЎРѓРЎвЂљР В°РЎР‚РЎвЂљР В° Р С—Р С•РЎРЏР Р†Р С‘РЎвЂљРЎРѓРЎРЏ РЎР‚Р ВµР С”Р С•Р СР ВµР Р…Р Т‘РЎС“Р ВµР СРЎвЂ№Р в„– РЎвЂљР ВµР СР С— Р Р…Р В° Р Р†Р С•Р С—РЎР‚Р С•РЎРѓ.";
    elements.routeRemainingValue.textContent = "РІР‚вЂќ";
    elements.routeRemainingHint.textContent = "Р РЋР С‘РЎРѓРЎвЂљР ВµР СР В° Р С—Р С•Р С”Р В°Р В¶Р ВµРЎвЂљ, РЎРѓР С”Р С•Р В»РЎРЉР С”Р С• Р Р†Р С•Р С—РЎР‚Р С•РЎРѓР С•Р Р† Р С•РЎРѓРЎвЂљР В°Р В»Р С•РЎРѓРЎРЉ Р Т‘Р С• РЎвЂћР С‘Р Р…Р С‘РЎв‚¬Р В°.";
    elements.answerReadinessValue.textContent = "Р С›Р В¶Р С‘Р Т‘Р В°Р Р…Р С‘Р Вµ";
    elements.answerReadinessHint.textContent = "Р СџР С•РЎРѓР В»Р Вµ Р Р†РЎвЂ№Р В±Р С•РЎР‚Р В° Р С•РЎвЂљР Р†Р ВµРЎвЂљР В° Р В·Р Т‘Р ВµРЎРѓРЎРЉ Р С—Р С•РЎРЏР Р†Р С‘РЎвЂљРЎРѓРЎРЏ Р С—Р С•Р Т‘РЎРѓР С”Р В°Р В·Р С”Р В°.";
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

  elements.paceValue.textContent = recommendedPerQuestion ? `${recommendedPerQuestion} РЎРѓР ВµР С”/Р Р†Р С•Р С—РЎР‚Р С•РЎРѓ` : "Р В¤Р С‘Р Р…Р С‘РЎв‚¬";
  setCockpitTone(
    elements.cockpitPaceCard,
    recommendedPerQuestion > 75 ? "warning" : recommendedPerQuestion ? "active" : "neutral"
  );
  elements.paceHint.textContent = recommendedPerQuestion
    ? `Р В§РЎвЂљР С•Р В±РЎвЂ№ РЎС“Р В»Р С•Р В¶Р С‘РЎвЂљРЎРЉРЎРѓРЎРЏ Р Р† Р В»Р С‘Р СР С‘РЎвЂљ, Р Т‘Р ВµРЎР‚Р В¶Р С‘РЎвЂљР Вµ РЎвЂљР ВµР СР С— Р С•Р С”Р С•Р В»Р С• ${recommendedPerQuestion} РЎРѓР ВµР С”. Р Р…Р В° Р С•РЎРѓРЎвЂљР В°Р Р†РЎв‚¬Р С‘Р в„–РЎРѓРЎРЏ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓ.`
    : "Р СљР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬РЎвЂР Р…, РЎвЂљР ВµР СР С— Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ Р Р…Р Вµ РЎР‚Р В°РЎРѓРЎРѓРЎвЂЎР С‘РЎвЂљРЎвЂ№Р Р†Р В°Р ВµРЎвЂљРЎРѓРЎРЏ.";

  elements.routeRemainingValue.textContent = remainingQuestions ? `${remainingQuestions} Р Р†Р С•Р С—РЎР‚Р С•РЎРѓР С•Р Р†` : "Р В¤Р С‘Р Р…Р С‘РЎв‚¬";
  setCockpitTone(
    elements.cockpitRouteCard,
    remainingQuestions > 0 ? "active" : "neutral"
  );
  elements.routeRemainingHint.textContent = remainingQuestions
    ? `Р РЋР ВµР в„–РЎвЂЎР В°РЎРѓ Р В°Р С”РЎвЂљР С‘Р Р†Р ВµР Р… ${attempt.currentTour?.code || "T?"}. Р вЂќР С• Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р С‘РЎРЏ Р СР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљР В° Р С•РЎРѓРЎвЂљР В°Р В»Р С•РЎРѓРЎРЉ ${remainingQuestions} Р Р†Р С•Р С—РЎР‚Р С•РЎРѓР С•Р Р†.`
    : "Р вЂ™РЎРѓР Вµ РЎвЂљРЎС“РЎР‚РЎвЂ№ Р В·Р В°Р С”РЎР‚РЎвЂ№РЎвЂљРЎвЂ№, РЎР‚Р ВµР В·РЎС“Р В»РЎРЉРЎвЂљР В°РЎвЂљ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎвЂР Р….";

  const currentAnswer = state.questionController?.getAnswer?.() || null;
  const savedAnswer =
    attempt.currentQuestion?.savedAnswer || state.localDrafts[attempt.currentQuestion?.id] || null;

  if (state.isSubmittingAnswer || state.isFinishingAttempt) {
    setCockpitTone(elements.cockpitAnswerCard, "active");
    elements.answerReadinessValue.textContent = "Р С›РЎвЂљР С—РЎР‚Р В°Р Р†Р В»РЎРЏР ВµР С";
    elements.answerReadinessHint.textContent = "Р СџР С•Р Т‘Р С•Р В¶Р Т‘Р С‘РЎвЂљР Вµ, Р С•РЎвЂљР Р†Р ВµРЎвЂљ РЎС“Р В¶Р Вµ РЎС“РЎвЂ¦Р С•Р Т‘Р С‘РЎвЂљ Р Р† Р С•Р В±Р В»Р В°Р С”Р С•.";
  } else if (hasMeaningfulAnswer(currentAnswer)) {
    setCockpitTone(elements.cockpitAnswerCard, "active");
    elements.answerReadinessValue.textContent = "Р вЂњР С•РЎвЂљР С•Р Р† Р С” Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р С”Р Вµ";
    elements.answerReadinessHint.textContent = "Р С›РЎвЂљР Р†Р ВµРЎвЂљ Р Р†РЎвЂ№Р В±РЎР‚Р В°Р Р…. Р СљР С•Р В¶Р Р…Р С• Р Р…Р В°Р В¶Р С‘Р СР В°РЎвЂљРЎРЉ Р’В«Р С›РЎвЂљР Р†Р ВµРЎвЂљР С‘РЎвЂљРЎРЉ Р С‘ Р Т‘Р В°Р В»Р ВµР ВµР’В».";
  } else if (hasMeaningfulAnswer(savedAnswer)) {
    setCockpitTone(elements.cockpitAnswerCard, "warning");
    elements.answerReadinessValue.textContent = "Р В§Р ВµРЎР‚Р Р…Р С•Р Р†Р С‘Р С” Р Р…Р В°Р в„–Р Т‘Р ВµР Р…";
    elements.answerReadinessHint.textContent = "Р СџР С• РЎРЊРЎвЂљР С•Р СРЎС“ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓРЎС“ РЎС“Р В¶Р Вµ Р ВµРЎРѓРЎвЂљРЎРЉ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎвЂР Р…Р Р…РЎвЂ№Р в„– РЎвЂЎР ВµРЎР‚Р Р…Р С•Р Р†Р С•Р в„– Р С•РЎвЂљР Р†Р ВµРЎвЂљ.";
  } else {
    setCockpitTone(elements.cockpitAnswerCard, "neutral");
    elements.answerReadinessValue.textContent = "Р С›Р В¶Р С‘Р Т‘Р В°Р Р…Р С‘Р Вµ";
    elements.answerReadinessHint.textContent = "Р вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ Р Р†Р В°РЎР‚Р С‘Р В°Р Р…РЎвЂљ Р С‘Р В»Р С‘ Р В·Р В°Р С—Р С•Р В»Р Р…Р С‘РЎвЂљР Вµ Р С‘Р Р…РЎвЂљР ВµРЎР‚Р В°Р С”РЎвЂљР С‘Р Р†Р Р…РЎвЂ№Р в„– Р В±Р В»Р С•Р С”.";
  }

  toneTimerBox(elements.timerTotalBox, totalRemainingMs || Number.MAX_SAFE_INTEGER);
  toneTimerBox(elements.timerTourBox, tourRemainingMs || Number.MAX_SAFE_INTEGER);
}

function formatDurationLabel(durationMs) {
  const totalMinutes = Math.max(0, Math.round((Number(durationMs) || 0) / 60000));
  if (!totalMinutes) {
    return "Р СР ВµР Р…Р ВµР Вµ 1 Р СР С‘Р Р…РЎС“РЎвЂљРЎвЂ№";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) {
    return `${hours} РЎвЂЎ ${minutes} Р СР С‘Р Р…`;
  }

  if (hours) {
    return `${hours} РЎвЂЎ`;
  }

  return `${minutes} Р СР С‘Р Р…`;
}

function fallbackDiplomaByScore(score) {
  if (score >= 130) {
    return "Р вЂќР С‘Р С—Р В»Р С•Р С I РЎРѓРЎвЂљР ВµР С—Р ВµР Р…Р С‘";
  }
  if (score >= 110) {
    return "Р вЂќР С‘Р С—Р В»Р С•Р С II РЎРѓРЎвЂљР ВµР С—Р ВµР Р…Р С‘";
  }
  if (score >= 90) {
    return "Р вЂќР С‘Р С—Р В»Р С•Р С III РЎРѓРЎвЂљР ВµР С—Р ВµР Р…Р С‘";
  }
  return "Р РЋР ВµРЎР‚РЎвЂљР С‘РЎвЂћР С‘Р С”Р В°РЎвЂљ РЎС“РЎвЂЎР В°РЎРѓРЎвЂљР Р…Р С‘Р С”Р В°";
}

function getResultAwardTone(label, scoresVisible) {
  if (!scoresVisible) {
    return "neutral";
  }

  if (label.includes("I РЎРѓРЎвЂљР ВµР С—Р ВµР Р…Р С‘")) {
    return "gold";
  }
  if (label.includes("II РЎРѓРЎвЂљР ВµР С—Р ВµР Р…Р С‘")) {
    return "silver";
  }
  if (label.includes("III РЎРѓРЎвЂљР ВµР С—Р ВµР Р…Р С‘")) {
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
    : "Р В Р ВµР В·РЎС“Р В»РЎРЉРЎвЂљР В°РЎвЂљ Р С—Р ВµРЎР‚Р ВµР Т‘Р В°Р Р… Р С•РЎР‚Р С–Р В°Р Р…Р С‘Р В·Р В°РЎвЂљР С•РЎР‚РЎС“";
  const completedTours = Array.isArray(summary.tourScores) ? summary.tourScores.length : 0;
  const metrics = [
    {
      label: "Р вЂР В°Р В»Р В»РЎвЂ№",
      value: scoresVisible ? `${summary.totalFinalScore} / ${summary.totalMaxScore}` : "РЎРѓР С”РЎР‚РЎвЂ№РЎвЂљР С•",
      hint: scoresVisible
        ? "Р вЂР В°Р В»Р В»РЎвЂ№ РЎР‚Р В°РЎРѓРЎРѓРЎвЂЎР С‘РЎвЂљР В°Р Р…РЎвЂ№ Р В°Р Р†РЎвЂљР С•Р СР В°РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С‘ Р С—Р С• Р С‘РЎвЂљР С•Р С–Р В°Р С Р Р†РЎРѓР ВµРЎвЂ¦ РЎвЂљРЎС“РЎР‚Р С•Р Р†."
        : "Р вЂќР С• Р С—РЎС“Р В±Р В»Р С‘Р С”Р В°РЎвЂ Р С‘Р С‘ Р С‘РЎвЂљР С•Р С–Р С•Р Р† Р С•РЎР‚Р С–Р В°Р Р…Р С‘Р В·Р В°РЎвЂљР С•РЎР‚ РЎРѓР С”РЎР‚РЎвЂ№Р Р†Р В°Р ВµРЎвЂљ Р В±Р В°Р В»Р В»РЎвЂ№ Р С•РЎвЂљ РЎС“РЎвЂЎР В°РЎРѓРЎвЂљР Р…Р С‘Р С”Р В°."
    },
    {
      label: "Р РЋРЎвЂљР В°РЎвЂљРЎС“РЎРѓ",
      value: diplomaLabel,
      hint: scoresVisible
        ? "Р РЋРЎвЂљР В°РЎвЂљРЎС“РЎРѓ РЎР‚Р В°РЎРѓРЎРѓРЎвЂЎР С‘РЎвЂљР В°Р Р… Р В°Р Р†РЎвЂљР С•Р СР В°РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С‘ Р С—Р С• Р С‘РЎвЂљР С•Р С–Р С•Р Р†Р С•Р СРЎС“ Р В±Р В°Р В»Р В»РЎС“."
        : "Р РЋРЎвЂљР В°РЎвЂљРЎС“РЎРѓ РЎС“РЎвЂЎР В°РЎРѓРЎвЂљР С‘РЎРЏ РЎС“Р В¶Р Вµ Р В·Р В°РЎвЂћР С‘Р С”РЎРѓР С‘РЎР‚Р С•Р Р†Р В°Р Р… Р Р† Р С•Р В±Р В»Р В°Р С”Р Вµ."
    },
    {
      label: "Р вЂ™РЎР‚Р ВµР СРЎРЏ",
      value: formatDurationLabel(summary.totalDurationMs),
      hint: "Р СџР С•Р С”Р В°Р В·Р В°Р Р…Р С• РЎРѓРЎС“Р СР СР В°РЎР‚Р Р…Р С•Р Вµ Р Р†РЎР‚Р ВµР СРЎРЏ Р С—РЎР‚Р С•РЎвЂ¦Р С•Р В¶Р Т‘Р ВµР Р…Р С‘РЎРЏ Р Р†РЎРѓР ВµР в„– Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎвЂ№."
    },
    {
      label: "Р СљР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ",
      value: `${completedTours} Р С‘Р В· ${completedTours} РЎвЂљРЎС“РЎР‚Р С•Р Р†`,
      hint: "Р вЂ™РЎРѓР Вµ РЎРЊРЎвЂљР В°Р С—РЎвЂ№ Р С—РЎР‚Р С•Р в„–Р Т‘Р ВµР Р…РЎвЂ№ Р С‘ Р В·Р В°Р С—Р С‘РЎРѓР В°Р Р…РЎвЂ№ Р Р† Р С•Р В±Р В»Р В°Р С”Р Вµ."
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
        "Р В Р ВµР В·РЎС“Р В»РЎРЉРЎвЂљР В°РЎвЂљ РЎС“Р В¶Р Вµ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎвЂР Р… Р Р† Р С•Р В±Р В»Р В°Р С”Р Вµ Р С‘ Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р ВµР Р… Р С•РЎР‚Р С–Р В°Р Р…Р С‘Р В·Р В°РЎвЂљР С•РЎР‚РЎС“ Р Р† Р В°Р Т‘Р СР С‘Р Р…Р С”Р Вµ.",
        "Р СџР С•Р Т‘РЎР‚Р С•Р В±Р Р…РЎС“РЎР‹ РЎР‚Р В°РЎРѓР С”Р В»Р В°Р Т‘Р С”РЎС“ Р С—Р С• РЎвЂљРЎС“РЎР‚Р В°Р С Р Р†Р С‘Р Т‘Р С‘РЎвЂљ РЎвЂљР С•Р В»РЎРЉР С”Р С• Р С•РЎР‚Р С–Р В°Р Р…Р С‘Р В·Р В°РЎвЂљР С•РЎР‚.",
        "Р СљР С•Р В¶Р Р…Р С• Р В·Р В°Р С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ Р С•Р С”Р Р…Р С• Р С‘Р В»Р С‘ Р Р†Р ВµРЎР‚Р Р…РЎС“РЎвЂљРЎРЉРЎРѓРЎРЏ Р Р…Р В° Р С–Р В»Р В°Р Р†Р Р…РЎС“РЎР‹ РЎРѓРЎвЂљРЎР‚Р В°Р Р…Р С‘РЎвЂ РЎС“ Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎвЂ№."
      ]
    : [
        "Р СџР С•Р С—РЎвЂ№РЎвЂљР С”Р В° Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р В°, РЎР‚Р ВµР В·РЎС“Р В»РЎРЉРЎвЂљР В°РЎвЂљ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎвЂР Р… Р Р† Р С•Р В±Р В»Р В°Р С”Р Вµ.",
        "Р С›РЎР‚Р С–Р В°Р Р…Р С‘Р В·Р В°РЎвЂљР С•РЎР‚ РЎС“Р Р†Р С‘Р Т‘Р С‘РЎвЂљ Р С‘РЎвЂљР С•Р С–Р С•Р Р†РЎвЂ№Р в„– Р В±Р В°Р В»Р В» Р С‘ РЎРѓРЎвЂљР В°РЎвЂљРЎС“РЎРѓ Р Р† Р С—Р В°Р Р…Р ВµР В»Р С‘ РЎС“Р С—РЎР‚Р В°Р Р†Р В»Р ВµР Р…Р С‘РЎРЏ.",
        "Р СљР С•Р В¶Р Р…Р С• Р В·Р В°Р С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ Р С•Р С”Р Р…Р С• Р С‘Р В»Р С‘ Р Т‘Р С•Р В¶Р Т‘Р В°РЎвЂљРЎРЉРЎРѓРЎРЏ Р С•Р В±РЎР‰РЎРЏР Р†Р В»Р ВµР Р…Р С‘РЎРЏ Р С‘РЎвЂљР С•Р С–Р С•Р Р†."
      ];

  elements.resultNext.innerHTML = `
    <h3>Р В§РЎвЂљР С• Р Т‘Р В°Р В»РЎРЉРЎв‚¬Р Вµ</h3>
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

function setInstallAvailability(visible, label = "Р Р€РЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р С‘РЎвЂљРЎРЉ Р С—РЎР‚Р С‘Р В»Р С•Р В¶Р ВµР Р…Р С‘Р Вµ") {
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
  elements.networkStatus.textContent = isOnline ? "\u0421\u0435\u0442\u044c: \u0441\u0432\u044f\u0437\u044c \u0435\u0441\u0442\u044c" : "\u0421\u0435\u0442\u044c: \u0441\u0432\u044f\u0437\u044c \u043d\u0435\u0441\u0442\u0430\u0431\u0438\u043b\u044c\u043d\u0430";
  elements.networkStatus.className = `network-badge ${isOnline ? "online" : "offline"}`;
  setParticipantShellState();
  updateHeroSnapshot();
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js?v=1.6.18");
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
      "Р С›Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎС“ Р СР С•Р В¶Р Р…Р С• РЎС“РЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р С‘РЎвЂљРЎРЉ Р С”Р В°Р С” Р С—РЎР‚Р С‘Р В»Р С•Р В¶Р ВµР Р…Р С‘Р Вµ Р Р…Р В° Р Р…Р С•РЎС“РЎвЂљР В±РЎС“Р С” Р С‘Р В»Р С‘ Р С—Р В»Р В°Р Р…РЎв‚¬Р ВµРЎвЂљ.",
      "success"
    );
  });

  window.addEventListener("appinstalled", () => {
    state.deferredInstallPrompt = null;
    setInstallAvailability(false);
    showMessage(elements.installMessage, "Р СџРЎР‚Р С‘Р В»Р С•Р В¶Р ВµР Р…Р С‘Р Вµ РЎС“РЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р В»Р ВµР Р…Р С• Р Р…Р В° РЎС“РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р†Р С•.", "success");
  });

  elements.installApp.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) {
      showMessage(
        elements.installMessage,
        "Р вЂўРЎРѓР В»Р С‘ Р С”Р Р…Р С•Р С—Р С”Р В° РЎС“РЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р С”Р С‘ Р Р…Р ВµР В°Р С”РЎвЂљР С‘Р Р†Р Р…Р В°, Р С‘РЎРѓР С—Р С•Р В»РЎРЉР В·РЎС“Р в„–РЎвЂљР Вµ РЎС“РЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р С”РЎС“ Р С—РЎР‚Р С‘Р В»Р С•Р В¶Р ВµР Р…Р С‘РЎРЏ РЎвЂЎР ВµРЎР‚Р ВµР В· Р СР ВµР Р…РЎР‹ Р В±РЎР‚Р В°РЎС“Р В·Р ВµРЎР‚Р В°.",
        "warning"
      );
      return;
    }

    state.deferredInstallPrompt.prompt();
    const choice = await state.deferredInstallPrompt.userChoice.catch(() => null);
    state.deferredInstallPrompt = null;
    setInstallAvailability(false);

    if (choice && choice.outcome === "accepted") {
      showMessage(elements.installMessage, "Р СџРЎР‚Р С‘Р В»Р С•Р В¶Р ВµР Р…Р С‘Р Вµ Р С–Р С•РЎвЂљР С•Р Р†Р С• Р С” Р С‘РЎРѓР С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°Р Р…Р С‘РЎР‹.", "success");
      return;
    }

    showMessage(elements.installMessage, "Р Р€РЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р С”РЎС“ Р СР С•Р В¶Р Р…Р С• Р С—Р С•Р Р†РЎвЂљР С•РЎР‚Р С‘РЎвЂљРЎРЉ Р С—Р С•Р В·Р В¶Р Вµ.", "warning");
  });
}

function formatApiError(error, fallback = "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р В·Р В°Р С—РЎР‚Р С•РЎРѓР В°") {
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
    message.includes("РЎРѓР ВµРЎР‚Р Р†Р ВµРЎР‚Р С•Р С") ||
    message.includes("Р Р†РЎР‚Р ВµР СР ВµР Р…Р Р…Р С•") ||
    message.includes("Р С—Р С•Р Т‘Р С•Р В¶Р Т‘Р С‘РЎвЂљР Вµ")
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

  throw lastError || new Error("Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р Р†РЎвЂ№Р С—Р С•Р В»Р Р…Р С‘РЎвЂљРЎРЉ Р В·Р В°Р С—РЎР‚Р С•РЎРѓ.");
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
    const wrapped = new Error("Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ РЎРѓР Р†РЎРЏР В·Р В°РЎвЂљРЎРЉРЎРѓРЎРЏ РЎРѓ РЎРѓР ВµРЎР‚Р Р†Р ВµРЎР‚Р С•Р С.");
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
      data.message || data.errorMessage || `Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р В·Р В°Р С—РЎР‚Р С•РЎРѓР В° (${response.status})`
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
    cancelPendingFlushDebounce();
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

function cancelPendingFlushDebounce() {
  if (!state.pendingFlushDebounceTimer) {
    return;
  }
  clearTimeout(state.pendingFlushDebounceTimer);
  state.pendingFlushDebounceTimer = null;
}

function schedulePendingFlush(delayMs = 2000) {
  cancelPendingFlushDebounce();
  state.pendingFlushDebounceTimer = setTimeout(() => {
    state.pendingFlushDebounceTimer = null;
    flushPendingAnswers();
  }, delayMs);
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
  elements.heroSubtitle.textContent = "Индивидуальная цифровая олимпиада с автоматической проверкой и сохранением результатов в облаке.";
  if (elements.heroFormatBadge) {
    const totalTours = Array.isArray(state.olympiad.tours) ? state.olympiad.tours.length : 0;
    elements.heroFormatBadge.textContent = `Индивидуальная цифровая олимпиада • ${state.olympiad.durationMinutes} минут • ${totalTours} туров`;
  }
  elements.tourMeta.innerHTML = "";

  (state.olympiad.tours || []).forEach((tour) => {
    const pill = document.createElement("div");
    pill.className = "pill";
    pill.textContent = `${tour.code}: ${tour.timeLimitMinutes} мин • до ${tour.maxScore} баллов`;
    elements.tourMeta.appendChild(pill);
  });

  renderJourneyMap();
}


function renderRules() {
  const rules = [
    `Время прохождения: ${state.olympiad.durationMinutes} минут.`,
    "Каждому участнику выдается индивидуальный вариант.",
    "На экране отображается только один вопрос без возврата назад.",
    "Порядок заданий и вариантов ответа перемешивается автоматически.",
    "Ответы проверяются автоматически и сохраняются в облаке.",
    "После завершения правильные ответы участнику не показываются."
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
    meta.push(`\u041d\u0430\u0441\u0442\u0430\u0432\u043d\u0438\u043a: ${state.participant.mentorName}`);
  }
  elements.participantMeta.textContent = meta.join(" \u2022 ");
  renderJourneyMap();
}

function buildJourneySteps() {
  const tours = (state.olympiad && state.olympiad.tours) || [];
  return [
    {
      id: "register",
      label: "Р В Р ВµР С–Р С‘РЎРѓРЎвЂљРЎР‚Р В°РЎвЂ Р С‘РЎРЏ",
      description: "Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…Р ВµР Р…Р С‘Р Вµ Р Т‘Р В°Р Р…Р Р…РЎвЂ№РЎвЂ¦ РЎС“РЎвЂЎР В°РЎРѓРЎвЂљР Р…Р С‘Р С”Р В°"
    },
    ...tours.map((tour) => ({
      id: tour.id,
      label: tour.code,
      description: tour.title
    })),
    {
      id: "result",
      label: "Р В¤Р С‘Р Р…Р С‘РЎв‚¬",
      description: "Р ВРЎвЂљР С•Р С–Р С•Р Р†РЎвЂ№Р в„– РЎРЊР С”РЎР‚Р В°Р Р… Р С‘ РЎвЂћР С‘Р С”РЎРѓР В°РЎвЂ Р С‘РЎРЏ РЎР‚Р ВµР В·РЎС“Р В»РЎРЉРЎвЂљР В°РЎвЂљР В°"
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
  let statusText = "Р РЋР Р…Р В°РЎвЂЎР В°Р В»Р В° РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р С‘РЎвЂљР Вµ Р Т‘Р В°Р Р…Р Р…РЎвЂ№Р Вµ РЎС“РЎвЂЎР В°РЎРѓРЎвЂљР Р…Р С‘Р С”Р В°.";

  if (state.participant) {
    completed.add("register");
    statusText = "Р В Р ВµР С–Р С‘РЎРѓРЎвЂљРЎР‚Р В°РЎвЂ Р С‘РЎРЏ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р ВµР Р…Р В°. Р СљР С•Р В¶Р Р…Р С• Р В·Р В°Р С—РЎС“РЎРѓР С”Р В°РЎвЂљРЎРЉ Р С—Р ВµРЎР‚Р Р†РЎвЂ№Р в„– РЎвЂљРЎС“РЎР‚.";
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
      statusText = `${state.attempt.currentTour.code}: Р Р†Р С•Р С—РЎР‚Р С•РЎРѓ ${state.attempt.progress.tourQuestionIndex} Р С‘Р В· ${state.attempt.progress.tourQuestionCount}.`;
    } else if (state.attempt.status !== "in_progress") {
      currentId = "result";
      ((state.olympiad && state.olympiad.tours) || []).forEach((tour) => completed.add(tour.id));
      completed.add("result");
      statusText = "Р СљР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬РЎвЂР Р…. Р В Р ВµР В·РЎС“Р В»РЎРЉРЎвЂљР В°РЎвЂљ Р В·Р В°РЎвЂћР С‘Р С”РЎРѓР С‘РЎР‚Р С•Р Р†Р В°Р Р… Р Р† Р С•Р В±Р В»Р В°Р С”Р Вµ.";
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
      <span class="journey-node-state">${isCurrent ? "Р РЋР ВµР в„–РЎвЂЎР В°РЎРѓ" : isComplete ? "Р вЂњР С•РЎвЂљР С•Р Р†Р С•" : isLocked ? "Р вЂ™Р С—Р ВµРЎР‚Р ВµР Т‘Р С‘" : "Р РЋРЎвЂљР В°РЎР‚РЎвЂљ"}</span>
      <b>${step.label}</b>
      <small>${step.description}</small>
    `;
    elements.journeyMap.appendChild(card);
  });

  updateJourneyProgress();
  updateHeroSnapshot();
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
    bank.innerHTML = `<div class="drag-bank-header">Р С™Р В°РЎР‚РЎвЂљР С•РЎвЂЎР С”Р С‘</div>`;
    const bankItems = document.createElement("div");
    bankItems.className = "drag-bank-items";
    const freeItems = (question.items || []).filter((item) => !sequence.includes(item.id));

    if (!freeItems.length) {
      const empty = document.createElement("div");
      empty.className = "drop-slot-empty";
      empty.textContent = "Р вЂ™РЎРѓР Вµ РЎв‚¬Р В°Р С–Р С‘ Р В·Р В°Р С—Р С•Р В»Р Р…Р ВµР Р…РЎвЂ№.";
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
    progress.textContent = `Р вЂ”Р В°Р С—Р С•Р В»Р Р…Р ВµР Р…Р С• РЎв‚¬Р В°Р С–Р С•Р Р†: ${sequence.filter(Boolean).length} Р С‘Р В· ${
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
        placeholder.textContent = "Р СџР ВµРЎР‚Р ВµРЎвЂљР В°РЎвЂ°Р С‘РЎвЂљР Вµ Р С”Р В°РЎР‚РЎвЂљР С•РЎвЂЎР С”РЎС“ Р С‘Р В»Р С‘ Р Р†РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎРѓР В»Р С•РЎвЂљ Р С‘ Р Р…Р В°Р В¶Р СР С‘РЎвЂљР Вµ Р Р…Р В° Р С”Р В°РЎР‚РЎвЂљР С•РЎвЂЎР С”РЎС“";
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
    bank.innerHTML = `<div class="drag-bank-header">Р вЂР В°Р Р…Р С” Р С”Р В°РЎР‚РЎвЂљР С•РЎвЂЎР ВµР С”</div>`;
    const bankItems = document.createElement("div");
    bankItems.className = "drag-bank-items";

    const freeItems = (question.items || []).filter((item) => !placements[item.id]);
    if (!freeItems.length) {
      const empty = document.createElement("div");
      empty.className = "drop-slot-empty";
      empty.textContent = "Р вЂ™РЎРѓР Вµ Р С”Р В°РЎР‚РЎвЂљР С•РЎвЂЎР С”Р С‘ РЎР‚Р В°РЎРѓР С—РЎР‚Р ВµР Т‘Р ВµР В»Р ВµР Р…РЎвЂ№.";
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
    progress.textContent = `Р В Р В°РЎРѓР С—РЎР‚Р ВµР Т‘Р ВµР В»Р ВµР Р…Р С• Р С”Р В°РЎР‚РЎвЂљР С•РЎвЂЎР ВµР С”: ${
      Object.values(placements).filter(Boolean).length
    } Р С‘Р В· ${(question.items || []).length}`;
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
        placeholder.textContent = "Р СџР ВµРЎР‚Р ВµРЎвЂљР В°РЎвЂ°Р С‘РЎвЂљР Вµ Р С”Р В°РЎР‚РЎвЂљР С•РЎвЂЎР С”Р С‘ Р С‘Р В»Р С‘ Р Р†РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ Р В·Р С•Р Р…РЎС“ Р С‘ Р Р…Р В°Р В¶Р СР С‘РЎвЂљР Вµ Р Р…Р В° Р С”Р В°РЎР‚РЎвЂљР С•РЎвЂЎР С”РЎС“";
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
    elements.questionPrompt.textContent = "Р вЂ™Р С•Р С—РЎР‚Р С•РЎРѓ Р Р…Р Вµ Р В·Р В°Р С–РЎР‚РЎС“Р В¶Р ВµР Р…";
    elements.questionPoints.textContent = "0 Р В±Р В°Р В»Р В»Р С•Р Р†";
    hideMessage(elements.questionCase);
    elements.questionNote.classList.add("hidden");
    return;
  }

  const hydratedQuestion = {
    ...question,
    savedAnswer: question.savedAnswer || state.localDrafts[question.id] || null
  };

  elements.questionPrompt.textContent = hydratedQuestion.prompt;
  elements.questionPoints.textContent = `${hydratedQuestion.maxScore} Р В±Р В°Р В»Р В»Р С•Р Р†`;

  if (hydratedQuestion.caseTitle) {
    showMessage(
      elements.questionCase,
      `${hydratedQuestion.caseTitle} РІР‚Сћ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓ ${hydratedQuestion.caseOrder} Р С‘Р В· ${hydratedQuestion.caseTotal}`,
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
      ? "Р СљР С•Р В¶Р Р…Р С• Р Р…Р Вµ РЎвЂљР С•Р В»РЎРЉР С”Р С• Р С—Р ВµРЎР‚Р ВµРЎвЂљР В°РЎРѓР С”Р С‘Р Р†Р В°РЎвЂљРЎРЉ Р СРЎвЂ№РЎв‚¬РЎРЉРЎР‹, Р Р…Р С• Р С‘ Р Р†РЎвЂ№Р В±РЎР‚Р В°РЎвЂљРЎРЉ РЎв‚¬Р В°Р С– Р С”Р В»Р С‘Р С”Р С•Р С, Р В° Р В·Р В°РЎвЂљР ВµР С Р Р…Р В°Р В¶Р В°РЎвЂљРЎРЉ Р Р…Р В° Р С”Р В°РЎР‚РЎвЂљР С•РЎвЂЎР С”РЎС“."
      : isInteractive
        ? "Р СљР С•Р В¶Р Р…Р С• Р Р…Р Вµ РЎвЂљР С•Р В»РЎРЉР С”Р С• Р С—Р ВµРЎР‚Р ВµРЎвЂљР В°РЎРѓР С”Р С‘Р Р†Р В°РЎвЂљРЎРЉ Р СРЎвЂ№РЎв‚¬РЎРЉРЎР‹, Р Р…Р С• Р С‘ Р Р†РЎвЂ№Р В±РЎР‚Р В°РЎвЂљРЎРЉ Р Р…РЎС“Р В¶Р Р…РЎС“РЎР‹ Р В·Р С•Р Р…РЎС“ Р С”Р В»Р С‘Р С”Р С•Р С, Р В° Р В·Р В°РЎвЂљР ВµР С Р Р…Р В°Р В¶Р В°РЎвЂљРЎРЉ Р Р…Р В° Р С”Р В°РЎР‚РЎвЂљР С•РЎвЂЎР С”РЎС“."
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
    unsupported.textContent = "Р В­РЎвЂљР С•РЎвЂљ РЎвЂљР С‘Р С— Р Р†Р С•Р С—РЎР‚Р С•РЎРѓР В° Р Р…Р Вµ Р С—Р С•Р Т‘Р Т‘Р ВµРЎР‚Р В¶Р С‘Р Р†Р В°Р ВµРЎвЂљРЎРѓРЎРЏ Р С‘Р Р…РЎвЂљР ВµРЎР‚РЎвЂћР ВµР в„–РЎРѓР С•Р С.";
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

  elements.progressGlobal.textContent = `Р вЂ™Р С•Р С—РЎР‚Р С•РЎРѓ ${attempt.progress.currentQuestionIndex} Р С‘Р В· ${attempt.progress.totalQuestions}`;
  elements.progressGlobalFill.style.width = `${
    (attempt.progress.currentQuestionIndex / Math.max(1, attempt.progress.totalQuestions)) * 100
  }%`;
  if (currentTour) {
    elements.progressTour.textContent = `${currentTour.code} РІР‚Сћ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓ ${attempt.progress.tourQuestionIndex} Р С‘Р В· ${attempt.progress.tourQuestionCount}`;
    elements.progressTourFill.style.width = `${
      (attempt.progress.tourQuestionIndex / Math.max(1, attempt.progress.tourQuestionCount)) * 100
    }%`;
    elements.tourCode.textContent = currentTour.code;
    elements.tourTitle.textContent = currentTour.title;
    elements.tourDescription.textContent = currentTour.description || "";
    elements.tourLimit.textContent = `${currentTour.timeLimitMinutes} Р СР С‘Р Р…РЎС“РЎвЂљ`;
  } else {
    elements.progressTour.textContent = "Р СћРЎС“РЎР‚ Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬РЎвЂР Р…";
    elements.tourCode.textContent = "FIN";
    elements.tourTitle.textContent = "Р С›Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘Р В° Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р В°";
    elements.tourDescription.textContent = "";
    elements.tourLimit.textContent = "0 Р СР С‘Р Р…РЎС“РЎвЂљ";
    elements.progressTourFill.style.width = "100%";
  }

  renderQuestion(currentQuestion);
  renderJourneyMap();
  refreshAttemptControls();
  updateExamCockpit();
  elements.submitAnswer.textContent =
    attempt.progress.currentQuestionIndex >= attempt.progress.totalQuestions
      ? "Р С›РЎвЂљР Р†Р ВµРЎвЂљР С‘РЎвЂљРЎРЉ Р С‘ Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р С‘РЎвЂљРЎРЉ"
      : "Р С›РЎвЂљР Р†Р ВµРЎвЂљР С‘РЎвЂљРЎРЉ Р С‘ Р Т‘Р В°Р В»Р ВµР Вµ";
}

function renderResult() {
  const summary = state.attempt.summary;
  const scoresVisible = summary.totalFinalScore !== null;
  const awardLabel = scoresVisible
    ? state.attempt.diploma || fallbackDiplomaByScore(summary.totalFinalScore)
    : "Р ВРЎвЂљР С•Р С– РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎвЂР Р…";
  disableExamMode();
  elements.attemptSection.classList.add("hidden");
  elements.resultSection.classList.remove("hidden");
  refreshNavigationState();
  updateExamCockpit();
  elements.resultTours.innerHTML = "";

  if (elements.resultEyebrow) {
    elements.resultEyebrow.textContent = "Р СљР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬РЎвЂР Р…";
  }

  if (elements.resultAward) {
    elements.resultAward.textContent = awardLabel;
    elements.resultAward.className = `result-award ${getResultAwardTone(awardLabel, scoresVisible)}`;
  }

  if (!scoresVisible) {
    elements.resultTitle.textContent = "Р СџР С•Р С—РЎвЂ№РЎвЂљР С”Р В° Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р В°";
    elements.resultSubtitle.textContent =
      "Р СџР С•Р С—РЎвЂ№РЎвЂљР С”Р В° Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р В°, РЎР‚Р ВµР В·РЎС“Р В»РЎРЉРЎвЂљР В°РЎвЂљ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎвЂР Р… Р Р† Р С•Р В±Р В»Р В°Р С”Р Вµ. Р С›РЎР‚Р С–Р В°Р Р…Р С‘Р В·Р В°РЎвЂљР С•РЎР‚ РЎС“Р Р†Р С‘Р Т‘Р С‘РЎвЂљ Р С‘РЎвЂљР С•Р С–Р С•Р Р†РЎвЂ№Р в„– Р В±Р В°Р В»Р В» Р С‘ РЎРѓРЎвЂљР В°РЎвЂљРЎС“РЎРѓ Р Р† Р С—Р В°Р Р…Р ВµР В»Р С‘ РЎС“Р С—РЎР‚Р В°Р Р†Р В»Р ВµР Р…Р С‘РЎРЏ.";
  } else {
    elements.resultTitle.textContent = `Р вЂ™Р В°РЎв‚¬ РЎР‚Р ВµР В·РЎС“Р В»РЎРЉРЎвЂљР В°РЎвЂљ: ${summary.totalFinalScore} Р С‘Р В· ${summary.totalMaxScore}`;
    elements.resultSubtitle.textContent =
      "Р вЂ™РЎРѓР Вµ Р С•РЎвЂљР Р†Р ВµРЎвЂљРЎвЂ№ Р В·Р В°РЎвЂћР С‘Р С”РЎРѓР С‘РЎР‚Р С•Р Р†Р В°Р Р…РЎвЂ№ Р В°Р Р†РЎвЂљР С•Р СР В°РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С‘. Р В Р ВµР В·РЎС“Р В»РЎРЉРЎвЂљР В°РЎвЂљРЎвЂ№ Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎвЂ№ Р Р…Р Вµ Р С—Р С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°РЎР‹РЎвЂљРЎРѓРЎРЏ РЎС“РЎвЂЎР В°РЎРѓРЎвЂљР Р…Р С‘Р С”РЎС“ РЎРѓРЎР‚Р В°Р В·РЎС“ Р С—Р С•РЎРѓР В»Р Вµ Р ВµРЎвЂ Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р С‘РЎРЏ.";
  }

  renderResultOverview(summary, state.attempt, scoresVisible);
  renderResultNextSteps(scoresVisible);

  (summary.tourScores || []).forEach((tour) => {
    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <strong>${tour.code}</strong>
      <span>${tour.title}</span>
      <b>${tour.finalScore === null ? "РЎР‚Р ВµР В·РЎС“Р В»РЎРЉРЎвЂљР В°РЎвЂљ РЎРѓР С”РЎР‚РЎвЂ№РЎвЂљ" : `${tour.finalScore} / ${tour.maxScore}`}</b>
      <small>${tour.finalScore === null ? "Р вЂР В°Р В»Р В»РЎвЂ№ Р С—Р С• РЎвЂљРЎС“РЎР‚РЎС“ РЎС“Р Р†Р С‘Р Т‘Р С‘РЎвЂљ Р С•РЎР‚Р С–Р В°Р Р…Р С‘Р В·Р В°РЎвЂљР С•РЎР‚." : "Р вЂР В°Р В»Р В»РЎвЂ№ РЎР‚Р В°РЎРѓРЎРѓРЎвЂЎР С‘РЎвЂљР В°Р Р…РЎвЂ№ Р В°Р Р†РЎвЂљР С•Р СР В°РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С‘."}</small>
    `;
    elements.resultTours.appendChild(card);
  });

  refreshAttemptControls();
  renderJourneyMap();
  setAttemptSaveStatus("Р В¤Р С‘Р Р…Р С‘РЎв‚¬ Р С—РЎР‚Р С‘Р Р…РЎРЏРЎвЂљ. Р В Р ВµР В·РЎС“Р В»РЎРЉРЎвЂљР В°РЎвЂљ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎвЂР Р… Р Р† Р С•Р В±Р В»Р В°Р С”Р Вµ.", "success");
  setAttemptSyncMeta(
    `Р ВРЎвЂљР С•Р С– Р В·Р В°Р С—Р С‘РЎРѓР В°Р Р…: ${formatDateTime(state.attempt.finishedAt || new Date())}`
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
    return `Р РЋРЎвЂљР В°РЎР‚РЎвЂљ ${nextAttempt.currentTour.code}: Р СР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ Р С•РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљ, Р СР С•Р В¶Р Р…Р С• Р С•РЎвЂљР Р†Р ВµРЎвЂЎР В°РЎвЂљРЎРЉ.`;
  }

  if (
    previousAttempt &&
    previousAttempt.status === "in_progress" &&
    nextAttempt.status !== "in_progress"
  ) {
    return "Р СљР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…. Р ВРЎвЂљР С•Р С– РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р ВµР Р… Р Р† Р С•Р В±Р В»Р В°Р С”Р Вµ.";
  }

  if (nextAttempt.status !== "in_progress" || !nextAttempt.currentTour) {
    return "";
  }

  const previousTourId = previousAttempt && previousAttempt.currentTour ? previousAttempt.currentTour.id : "";
  const nextTourId = nextAttempt.currentTour.id;

  if (previousTourId && previousTourId !== nextTourId) {
    return `Р РЋРЎвЂљР В°РЎР‚РЎвЂљ ${nextAttempt.currentTour.code}: ${nextAttempt.currentTour.title}.`;
  }

  const previousQuestionIndex =
    previousAttempt && previousAttempt.progress ? previousAttempt.progress.currentQuestionIndex : 0;
  const nextQuestionIndex = nextAttempt.progress ? nextAttempt.progress.currentQuestionIndex : 0;

  if (previousQuestionIndex && previousQuestionIndex !== nextQuestionIndex) {
    return `${nextAttempt.currentTour.code}: Р Р†Р С•Р С—РЎР‚Р С•РЎРѓ ${nextAttempt.progress.tourQuestionIndex} Р С‘Р В· ${nextAttempt.progress.tourQuestionCount}.`;
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
    setAttemptSyncMeta("Р СњР В°Р в„–Р Т‘Р ВµР Р…РЎвЂ№ Р В»Р С•Р С”Р В°Р В»РЎРЉР Р…Р С• РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎвЂР Р…Р Р…РЎвЂ№Р Вµ Р С•РЎвЂљР Р†Р ВµРЎвЂљРЎвЂ№. Р вЂќР С•Р С–РЎР‚РЎС“Р В¶Р В°Р ВµР С Р С‘РЎвЂ¦ Р Р† Р С•Р В±Р В»Р В°Р С”Р С•.");
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
  state.syncInterval = setInterval(() => syncAttempt(true), 45000);
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
    const pulse = await api(`/api/public/attempts/${state.attempt.id}/pulse`);
    if (
      pulse.status === "in_progress" &&
      state.attempt.status === "in_progress" &&
      pulse.currentStepIndex === state.attempt.currentStepIndex
    ) {
      state.attempt.expiresAt = pulse.expiresAt;
      state.attempt.timing = pulse.timing;
      if (pulse.currentTour) {
        state.attempt.currentTour = pulse.currentTour;
      }
      if (pulse.progress) {
        state.attempt.progress = pulse.progress;
      }
      updateTimers();
    } else {
      const data = await api(`/api/public/attempts/${state.attempt.id}/current`);
      applyAttemptState(data, { preserveQuestionRender: true });
      if (data.status === "in_progress") {
        updateTimers();
      }
    }
    setAttemptSyncMeta(`Последняя проверка связи: ${formatDateTime(new Date())}`);
    if (!silent && !state.isSubmittingAnswer && !state.isFinishingAttempt) {
      setAttemptSaveStatus("Данные обновлены", "success");
    }
  } catch (error) {
    const message = formatApiError(error);
    setAttemptSyncMeta(`Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° РЎРѓР Р†РЎРЏР В·Р С‘: ${message}`);
    setAttemptSaveStatus(
      silent ? "Р РЋР Р†РЎРЏР В·РЎРЉ Р Р…Р ВµРЎРѓРЎвЂљР В°Р В±Р С‘Р В»РЎРЉР Р…Р В°, Р С•Р В±Р Р…Р С•Р Р†Р С‘Р С Р Т‘Р В°Р Р…Р Р…РЎвЂ№Р Вµ Р ВµРЎвЂ°РЎвЂ РЎР‚Р В°Р В·" : "Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С•Р В±Р Р…Р С•Р Р†Р С‘РЎвЂљРЎРЉ Р Т‘Р В°Р Р…Р Р…РЎвЂ№Р Вµ",
      silent ? "warning" : "error"
    );
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

  cancelPendingFlushDebounce();
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
              `Р РЋР С‘Р Р…РЎвЂ¦РЎР‚Р С•Р Р…Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ Р С•РЎвЂљР Р†Р ВµРЎвЂљР В°: Р С—Р С•Р Р†РЎвЂљР С•РЎР‚ ${nextAttempt} Р С‘Р В· ${maxAttempts}.`,
              "warning"
            );
            setAttemptSyncMeta(`Р В¤Р С•Р Р…Р С•Р Р†Р В°РЎРЏ РЎРѓР С‘Р Р…РЎвЂ¦РЎР‚Р С•Р Р…Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ: ${formatApiError(error)}`);
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

    setAttemptSaveStatus("Р С›РЎвЂљР Р†Р ВµРЎвЂљРЎвЂ№ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р ВµР Р…РЎвЂ№ Р Р† Р С•Р В±Р В»Р В°Р С”Р Вµ", "success");
    setAttemptSyncMeta(`Р РЋР С‘Р Р…РЎвЂ¦РЎР‚Р С•Р Р…Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р В°: ${formatDateTime(new Date())}`);
    return lastSyncedAttempt;
  } catch (error) {
    const message = formatApiError(error);
    setAttemptSaveStatus(
      options.blocking
        ? "Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р С‘РЎвЂљРЎРЉ Р С•РЎвЂљР Р†Р ВµРЎвЂљРЎвЂ№ Р С—Р ВµРЎР‚Р ВµР Т‘ Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р С‘Р ВµР С"
        : "Р С›РЎвЂљР Р†Р ВµРЎвЂљ Р С—РЎР‚Р С‘Р Р…РЎРЏРЎвЂљ, Р Р…Р С• Р С•Р В±Р В»Р В°РЎвЂЎР Р…Р В°РЎРЏ РЎРѓР С‘Р Р…РЎвЂ¦РЎР‚Р С•Р Р…Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ Р Р†РЎР‚Р ВµР СР ВµР Р…Р Р…Р С• Р В·Р В°Р Т‘Р ВµРЎР‚Р В¶Р В°Р В»Р В°РЎРѓРЎРЉ",
      options.blocking ? "error" : "warning"
    );
    setAttemptSyncMeta(`Р РЋР С‘Р Р…РЎвЂ¦РЎР‚Р С•Р Р…Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ: ${message}`);
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
      ? "Р СџРЎР‚Р С•Р Т‘Р С•Р В»Р В¶Р С‘РЎвЂљРЎРЉ Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎС“"
      : "Р СњР В°РЎвЂЎР В°РЎвЂљРЎРЉ Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎС“";

    if (data.alreadyCompleted) {
      elements.startAttempt.textContent = "Р СџР С•Р С—РЎвЂ№РЎвЂљР С”Р В° Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р В°";
      refreshNavigationState();
      showMessage(
        elements.prestartMessage,
        "Р вЂќР В»РЎРЏ РЎРЊРЎвЂљР С•Р С–Р С• РЎС“РЎвЂЎР В°РЎРѓРЎвЂљР Р…Р С‘Р С”Р В° Р С—Р С•Р С—РЎвЂ№РЎвЂљР С”Р В° РЎС“Р В¶Р Вµ Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р В°. Р СџР С•Р Р†РЎвЂљР С•РЎР‚Р Р…РЎвЂ№Р в„– РЎРѓРЎвЂљР В°РЎР‚РЎвЂљ Р Р…Р ВµР Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р ВµР Р….",
        "error"
      );
      return;
    }

    showMessage(
      elements.registrationMessage,
      data.activeAttemptId
        ? "Р СњР В°Р в„–Р Т‘Р ВµР Р…Р В° Р Р…Р ВµР В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬РЎвЂР Р…Р Р…Р В°РЎРЏ Р С—Р С•Р С—РЎвЂ№РЎвЂљР С”Р В°. Р СљР С•Р В¶Р Р…Р С• Р С—РЎР‚Р С•Р Т‘Р С•Р В»Р В¶Р С‘РЎвЂљРЎРЉ."
        : "Р вЂќР В°Р Р…Р Р…РЎвЂ№Р Вµ РЎС“РЎвЂЎР В°РЎРѓРЎвЂљР Р…Р С‘Р С”Р В° РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р ВµР Р…РЎвЂ№. Р СљР С•Р В¶Р Р…Р С• Р Р…Р В°РЎвЂЎР С‘Р Р…Р В°РЎвЂљРЎРЉ Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎС“.",
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
      "Р СџР С•Р Т‘РЎвЂљР Р†Р ВµРЎР‚Р Т‘Р С‘РЎвЂљР Вµ Р С–Р С•РЎвЂљР С•Р Р†Р Р…Р С•РЎРѓРЎвЂљРЎРЉ РЎР‚Р В°Р В±Р С•РЎвЂљР В°РЎвЂљРЎРЉ 45 Р СР С‘Р Р…РЎС“РЎвЂљ Р В±Р ВµР В· Р С•РЎвЂљР Р†Р В»Р ВµРЎвЂЎР ВµР Р…Р С‘Р в„–.",
      "warning"
    );
    updateStartAvailability();
    return;
  }

  hideMessage(elements.prestartMessage);
  hideMessage(elements.attemptMessage);
  setAttemptSaveStatus("Р С›РЎвЂљР С”РЎР‚РЎвЂ№Р Р†Р В°Р ВµР С Р СР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ...", "pending");
  setAttemptSyncMeta("Р СџР С•Р Т‘Р В±Р С‘РЎР‚Р В°Р ВµР С Р Р†Р В°РЎР‚Р С‘Р В°Р Р…РЎвЂљ Р С‘ Р С—Р С•Р Т‘Р С”Р В»РЎР‹РЎвЂЎР В°Р ВµР СРЎРѓРЎРЏ Р С” Р С•Р В±Р В»Р В°Р С”РЎС“...");

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
          setAttemptSaveStatus("Р СњР ВµР В±Р С•Р В»РЎРЉРЎв‚¬Р С•Р в„– РЎРѓР В±Р С•Р в„–. Р СџР С•Р Р†РЎвЂљР С•РЎР‚РЎРЏР ВµР С Р В·Р В°Р С—РЎС“РЎРѓР С”...", "warning");
        }
      }
    );
    state.participant = attempt.participant;
    elements.startAttempt.textContent = "Р СџРЎР‚Р С•Р Т‘Р С•Р В»Р В¶Р С‘РЎвЂљРЎРЉ Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎС“";
    applyAttemptState(attempt);
    startTimers();
    refreshAttemptControls();
    setAttemptSaveStatus("Р СљР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ Р С•РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљ", "success");
    setAttemptSyncMeta(`Р СџР С•Р Т‘Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р С‘Р Вµ Р С—Р С•Р Т‘РЎвЂљР Р†Р ВµРЎР‚Р В¶Р Т‘Р ВµР Р…Р С•: ${formatDateTime(new Date())}`);
    showMessage(
      elements.attemptMessage,
      "Р СљР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ Р С•РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљ. Р С›РЎвЂљР Р†Р ВµРЎвЂљРЎвЂ№ Р В±РЎС“Р Т‘РЎС“РЎвЂљ Р В°Р Р†РЎвЂљР С•Р СР В°РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С‘ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎРЏРЎвЂљРЎРЉРЎРѓРЎРЏ Р Р† Р С•Р В±Р В»Р В°Р С”Р Вµ, Р В° РЎРЊР С”Р В·Р В°Р СР ВµР Р…Р В°РЎвЂ Р С‘Р С•Р Р…Р Р…РЎвЂ№Р в„– РЎР‚Р ВµР В¶Р С‘Р С Р Р†Р С”Р В»РЎР‹РЎвЂЎРЎвЂР Р….",
      "success"
    );
    if (hasPendingAnswers()) {
      flushPendingAnswers();
    }
  } catch (error) {
    const message = formatApiError(error);
    setAttemptSaveStatus("Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С•РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ Р СР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ", "error");
    setAttemptSyncMeta(`Р вЂ”Р В°Р С—РЎС“РЎРѓР С”: ${message}`);
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

    setAttemptSaveStatus("Р С›РЎвЂљР Р†Р ВµРЎвЂљ Р С—РЎР‚Р С‘Р Р…РЎРЏРЎвЂљ. Р С›Р В±Р В»Р В°РЎвЂЎР Р…Р В°РЎРЏ РЎРѓР С‘Р Р…РЎвЂ¦РЎР‚Р С•Р Р…Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ Р С‘Р Т‘РЎвЂРЎвЂљ Р Р† РЎвЂћР С•Р Р…Р Вµ.", "pending");
    setAttemptSyncMeta("Р СџР ВµРЎР‚Р ВµРЎвЂ¦Р С•Р Т‘Р С‘Р С Р Т‘Р В°Р В»РЎРЉРЎв‚¬Р Вµ РЎРѓРЎР‚Р В°Р В·РЎС“, Р Р…Р Вµ Р С•РЎРѓРЎвЂљР В°Р Р…Р В°Р Р†Р В»Р С‘Р Р†Р В°РЎРЏ РЎвЂљР В°Р в„–Р СР ВµРЎР‚ Р Р…Р В° Р С•Р В¶Р С‘Р Т‘Р В°Р Р…Р С‘Р С‘ РЎРѓР ВµРЎвЂљР С‘.");
    refreshAttemptControls();
    schedulePendingFlush(2500);
    return;
  }

  state.isSubmittingAnswer = true;
  setAttemptSaveStatus("Р С›РЎвЂљР С—РЎР‚Р В°Р Р†Р В»РЎРЏР ВµР С РЎвЂћР С‘Р Р…Р В°Р В»РЎРЉР Р…РЎвЂ№Р в„– Р С•РЎвЂљР Р†Р ВµРЎвЂљ...", "pending");
  setAttemptSyncMeta("Р вЂќР С•РЎРѓР С‘Р Р…РЎвЂ¦РЎР‚Р С•Р Р…Р С‘Р В·Р С‘РЎР‚РЎС“Р ВµР С Р С•РЎвЂЎР ВµРЎР‚Р ВµР Т‘РЎРЉ Р С‘ РЎвЂћР С‘Р С”РЎРѓР С‘РЎР‚РЎС“Р ВµР С РЎвЂћР С‘Р Р…Р В°Р В»РЎРЉР Р…РЎвЂ№Р в„– РЎв‚¬Р В°Р С–...");
  refreshAttemptControls();

  try {
    const data = await flushPendingAnswers({ blocking: true });

    if (data && data.status === "in_progress") {
      startTimers();
      setAttemptSaveStatus("Р С›РЎвЂљР Р†Р ВµРЎвЂљ Р С—РЎР‚Р С‘Р Р…РЎРЏРЎвЂљ", "success");
    } else {
      setAttemptSaveStatus("Р В¤Р С‘Р Р…Р В°Р В»РЎРЉР Р…РЎвЂ№Р в„– Р С•РЎвЂљР Р†Р ВµРЎвЂљ Р С—РЎР‚Р С‘Р Р…РЎРЏРЎвЂљ. Р СљР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬РЎвЂР Р….", "success");
      showMessage(elements.attemptMessage, "Р СљР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬РЎвЂР Р….", "success");
    }
    setAttemptSyncMeta(`Р С›РЎвЂљР Р†Р ВµРЎвЂљ Р В·Р В°Р С—Р С‘РЎРѓР В°Р Р…: ${formatDateTime(new Date())}`);
  } catch (error) {
    const message = formatApiError(error);
    setAttemptSaveStatus("Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р С‘РЎвЂљРЎРЉ Р С•РЎвЂљР Р†Р ВµРЎвЂљ", "error");
    setAttemptSyncMeta(`Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р С”Р С‘: ${message}`);
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
  setAttemptSaveStatus("Р вЂ”Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р В°Р ВµР С Р СР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ...", "pending");
  setAttemptSyncMeta("Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµР С Р С•РЎвЂЎР ВµРЎР‚Р ВµР Т‘РЎРЉ Р С•РЎвЂљР Р†Р ВµРЎвЂљР С•Р Р† Р С‘ РЎвЂћР С‘Р С”РЎРѓР С‘РЎР‚РЎС“Р ВµР С Р С‘РЎвЂљР С•Р С–...");
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
          setAttemptSaveStatus("Р СџР С•Р Т‘РЎвЂљР Р†Р ВµРЎР‚Р В¶Р Т‘Р В°Р ВµР С Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р С‘Р Вµ Р ВµРЎвЂ°РЎвЂ РЎР‚Р В°Р В·...", "warning");
          setAttemptSyncMeta(`Р вЂ”Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р С‘Р Вµ: ${formatApiError(error)}`);
        }
      }
    );
    state.localDrafts = {};
    applyAttemptState(data);
    setAttemptSaveStatus("Р СљР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬РЎвЂР Р… Р С‘ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎвЂР Р…", "success");
    setAttemptSyncMeta(`Р ВРЎвЂљР С•Р С– Р В·Р В°Р С—Р С‘РЎРѓР В°Р Р…: ${formatDateTime(new Date())}`);
  } catch (error) {
    const message = formatApiError(error);
    setAttemptSaveStatus("Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р С‘РЎвЂљРЎРЉ Р СР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ", "error");
    setAttemptSyncMeta(`Р вЂ”Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р С‘Р Вµ: ${message}`);
    showMessage(elements.attemptMessage, message, "error");
  } finally {
    state.isFinishingAttempt = false;
    refreshAttemptControls();
  }
}

async function init() {
  applyStaticRussianCopy();
  await loadAppVersion();
  state.olympiad = await api("/api/public/olympiad");
  await registerServiceWorker();
  renderHero();
  renderRules();
  setupInstallPrompt();
  setInstallAvailability(false);
  setNetworkStatus(navigator.onLine);
  setAttemptSaveStatus("Р РЋР С‘РЎРѓРЎвЂљР ВµР СР В° Р С–Р С•РЎвЂљР С•Р Р†Р В° Р С” РЎРѓРЎвЂљР В°РЎР‚РЎвЂљРЎС“", "idle");
  setAttemptSyncMeta("Р СџР С•РЎРѓР В»Р ВµР Т‘Р Р…РЎРЏРЎРЏ Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° РЎРѓР Р†РЎРЏР В·Р С‘: РІР‚вЂќ");
  refreshNavigationState();

  window.addEventListener("online", () => {
    setNetworkStatus(true);
    setAttemptSaveStatus("Р РЋР Р†РЎРЏР В·РЎРЉ Р Р†Р С•РЎРѓРЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р В»Р ВµР Р…Р В°. Р СљР С•Р В¶Р Р…Р С• Р С—РЎР‚Р С•Р Т‘Р С•Р В»Р В¶Р В°РЎвЂљРЎРЉ.", "success");
    if (state.attempt) {
      flushPendingAnswers();
      syncAttempt(true);
    }
  });
  window.addEventListener("offline", () => {
    setNetworkStatus(false);
    setAttemptSaveStatus("Р РЋР Р†РЎРЏР В·РЎРЉ Р Р…Р ВµРЎРѓРЎвЂљР В°Р В±Р С‘Р В»РЎРЉР Р…Р В°. Р С›РЎвЂљР Р†Р ВµРЎвЂљ Р С—Р С•Р С—РЎР‚Р С•Р В±РЎС“Р ВµР С Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р С‘РЎвЂљРЎРЉ Р С—Р С•Р Р†РЎвЂљР С•РЎР‚Р Р…Р С•.", "warning");
    setAttemptSyncMeta("Р РЋР ВµРЎР‚Р Р†Р ВµРЎР‚ Р Р†РЎР‚Р ВµР СР ВµР Р…Р Р…Р С• Р Р…Р ВµР Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р ВµР Р….");
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
  if (elements.heroActionRegister) {
    elements.heroActionRegister.addEventListener("click", () => {
      if (elements.prestartSection.classList.contains("hidden")) {
        scrollToSection(elements.heroSection);
        return;
      }
      scrollToSection(elements.prestartSection);
    });
  }
  if (elements.heroActionAttempt) {
    elements.heroActionAttempt.addEventListener("click", () => {
      scrollToSection(
        state.attempt && state.attempt.status === "in_progress"
          ? elements.attemptSection
          : elements.heroSection
      );
    });
  }
  if (elements.heroActionResult) {
    elements.heroActionResult.addEventListener("click", () => {
      scrollToSection(
        elements.resultSection.classList.contains("hidden")
          ? elements.heroSection
          : elements.resultSection
      );
    });
  }
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
  setAttemptSaveStatus("Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р В·Р В°Р С–РЎР‚РЎС“Р В·Р С‘РЎвЂљРЎРЉ Р С•Р В»Р С‘Р СР С—Р С‘Р В°Р Т‘РЎС“", "error");
  setAttemptSyncMeta(`Р ВР Р…Р С‘РЎвЂ Р С‘Р В°Р В»Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ: ${formatApiError(error)}`);
});
