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
  isFinishingAttempt: false
};

const elements = {
  navBack: document.getElementById("nav-back"),
  navHome: document.getElementById("nav-home"),
  navRegister: document.getElementById("nav-register"),
  navAttempt: document.getElementById("nav-attempt"),
  navResult: document.getElementById("nav-result"),
  heroSection: document.getElementById("hero-section"),
  heroTitle: document.getElementById("hero-title"),
  heroSubtitle: document.getElementById("hero-subtitle"),
  tourMeta: document.getElementById("tour-meta"),
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
  attemptMessage: document.getElementById("attempt-message"),
  resultTitle: document.getElementById("result-title"),
  resultSubtitle: document.getElementById("result-subtitle"),
  resultTours: document.getElementById("result-tours")
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
    return;
  }

  if (attemptInProgress) {
    elements.submitAnswer.textContent =
      state.attempt.progress.currentQuestionIndex >= state.attempt.progress.totalQuestions
        ? "Ответить и завершить"
        : "Ответить и далее";
  }
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

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || data.errorMessage || "Ошибка запроса");
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
    return;
  }

  elements.participantName.textContent = state.participant.fullName;
  const meta = [state.participant.institution, state.participant.groupName];
  if (state.participant.mentorName) {
    meta.push(`Наставник: ${state.participant.mentorName}`);
  }
  elements.participantMeta.textContent = meta.join(" • ");
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
  refreshAttemptControls();
  elements.submitAnswer.textContent =
    attempt.progress.currentQuestionIndex >= attempt.progress.totalQuestions
      ? "Ответить и завершить"
      : "Ответить и далее";
}

function renderResult() {
  const summary = state.attempt.summary;
  elements.attemptSection.classList.add("hidden");
  elements.resultSection.classList.remove("hidden");
  refreshNavigationState();
  elements.resultTours.innerHTML = "";

  if (summary.totalFinalScore === null) {
    elements.resultTitle.textContent = "Попытка завершена";
    elements.resultSubtitle.textContent =
      "Результат зафиксирован. Баллы доступны организатору в панели управления.";
  } else {
    elements.resultTitle.textContent = `Итоговый результат: ${summary.totalFinalScore} из ${summary.totalMaxScore}`;
    elements.resultSubtitle.textContent =
      "Правильные ответы не показываются. Организатор видит служебный лог и полную раскладку в админ-панели.";
  }

  (summary.tourScores || []).forEach((tour) => {
    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <strong>${tour.code}</strong>
      <span>${tour.title}</span>
      <b>${tour.finalScore === null ? "скрыто" : `${tour.finalScore} / ${tour.maxScore}`}</b>
    `;
    elements.resultTours.appendChild(card);
  });

  refreshAttemptControls();
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

function applyAttemptState(attempt, options = {}) {
  const preserveQuestionRender =
    options.preserveQuestionRender && canSoftSyncAttempt(attempt);
  state.attempt = attempt;
  if (!attempt) {
    return;
  }

  if (attempt.status === "in_progress") {
    if (preserveQuestionRender) {
      saveTimingSnapshot(attempt);
      return;
    }
    renderAttempt();
  } else {
    stopTimers();
    renderResult();
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
  } catch (error) {
    if (!silent) {
      showMessage(elements.attemptMessage, error.message, "error");
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

  try {
    const attempt = await api("/api/public/attempts/start", {
      method: "POST",
      body: JSON.stringify({ participant: state.participant })
    });
    state.participant = attempt.participant;
    elements.startAttempt.textContent = "Продолжить олимпиаду";
    applyAttemptState(attempt);
    startTimers();
    refreshAttemptControls();
    showMessage(
      elements.attemptMessage,
      "Попытка запущена. Все ответы фиксируются автоматически на сервере.",
      "success"
    );
  } catch (error) {
    showMessage(elements.prestartMessage, error.message, "error");
  }
}

async function submitAnswer() {
  if (!state.attempt || !state.questionController || state.isSubmittingAnswer || state.isFinishingAttempt) {
    return;
  }

  hideMessage(elements.attemptMessage);
  captureCurrentDraft();
  const previousQuestionId = state.attempt.currentQuestion && state.attempt.currentQuestion.id;
  state.isSubmittingAnswer = true;
  refreshAttemptControls();

  try {
    const data = await api(`/api/public/attempts/${state.attempt.id}/answer`, {
      method: "POST",
      body: JSON.stringify({
        questionId: previousQuestionId,
        answerPayload: state.questionController.getAnswer()
      })
    });

    clearDraft(previousQuestionId);
    applyAttemptState(data);
    if (data.status === "in_progress") {
      startTimers();
    } else {
      showMessage(elements.attemptMessage, "Попытка завершена.", "success");
    }
  } catch (error) {
    showMessage(elements.attemptMessage, error.message, "error");
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
  refreshAttemptControls();
  try {
    captureCurrentDraft();
    const data = await api(`/api/public/attempts/${state.attempt.id}/finish`, {
      method: "POST"
    });
    state.localDrafts = {};
    applyAttemptState(data);
  } catch (error) {
    showMessage(elements.attemptMessage, error.message, "error");
  } finally {
    state.isFinishingAttempt = false;
    refreshAttemptControls();
  }
}

async function init() {
  state.olympiad = await api("/api/public/olympiad");
  renderHero();
  renderRules();
  refreshNavigationState();

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
  showMessage(elements.registrationMessage, error.message, "error");
});
