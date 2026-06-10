(function () {
  const TEACHER_NAME = "Постовит Дмитрий Александрович";
  const FREE_STUDENT_VALUE = "__free_name__";
  const MAX_VOICE_AUDIO_BYTES = 14 * 1024 * 1024;
  const RESUME_STORAGE_KEY = "pm01.resumeAttempt.v1";
  const RESUME_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  const PM01_STUDENT_GROUPS = [
    {
      groupName: "2-ПК-25",
      students: [
        "Воропаев Артем Романович",
        "Дейниченко Анастасия Анатольевна",
        "Забелина Мария Александровна",
        "Казлов Данил Алексеевич",
        "Кириченко Кирилл Вадимович",
        "Никитенко Денис Сергеевич",
        "Сайко Михаил Максимович",
        "Сапожникова Алина Денисовна",
        "Свешникова Дарья Руслановна",
        "Тамаш Дарья Викторовна",
        "Чеботарев Александр Дмитриевич",
        "Черномеза Диана Ивановна",
        "Шишкин Данил Евгеньевич",
        "Макаренко Михаил Андреевич",
        "Белозерова Ольга Сергеевна",
        "Филюшина Виктория Александровна",
        "Касаткина Мария Кирилловна"
      ]
    },
    {
      groupName: "1-ПК-25",
      students: [
        "Барышев Георгий",
        "Бочарова Юлия",
        "Жевланова Полина",
        "Калашникова Полина",
        "Ларионова Валерия",
        "Левченко Эдуард",
        "Меркулова Екатерина",
        "Мирошниченко Александр",
        "Рожнов Алексей",
        "Светлов Богдан",
        "Слипченко Арсений",
        "Старостина Маргарита",
        "Степашко Назар",
        "Романский Руслан",
        "Бочарова Анастасия",
        "Марченко Виктория",
        "Новикова Маргарита",
        "Попова Елизавета",
        "Волобуева Анастасия",
        "Волохова Яна Алексеевна"
      ]
    },
    {
      groupName: "1-ПКД-25",
      students: [
        "Балакириева Анна",
        "Боровик Анна",
        "Гнитиев Михаил",
        "Грачёв Давид",
        "Дорохова Анастасия",
        "Жидкова Елена",
        "Коныш Алина",
        "Майский Владимир",
        "Педан Вера",
        "Поляков Виктор",
        "Сорокин Илья",
        "Хвтисиашвили Эрика",
        "Яговкин Владислав"
      ]
    }
  ];

  const state = {
    exam: null,
    attempt: null,
    selectedVariantId: "",
    selectedTicketId: "",
    mode: "exam",
    controller: null,
    timer: null,
    skipConfirmQuestionId: ""
  };

  const elements = {
    topTitle: document.getElementById("top-title"),
    topSubtitle: document.getElementById("top-subtitle"),
    topMode: document.getElementById("top-mode"),
    topVariant: document.getElementById("top-variant"),
    topModule: document.getElementById("top-module"),
    topScore: document.getElementById("top-score"),
    topTimer: document.getElementById("top-timer"),
    topSaveStatus: document.getElementById("top-save-status"),
    entryScreen: document.getElementById("entry-screen"),
    workspaceScreen: document.getElementById("workspace-screen"),
    resultScreen: document.getElementById("result-screen"),
    examTitle: document.getElementById("exam-title"),
    examDescription: document.getElementById("exam-description"),
    modulePreview: document.getElementById("module-preview"),
    programTitle: document.getElementById("program-title"),
    courseList: document.getElementById("course-list"),
    developerName: document.getElementById("developer-name"),
    startForm: document.getElementById("start-form"),
    fullName: document.getElementById("full-name"),
    institution: document.getElementById("institution"),
    groupName: document.getElementById("group-name"),
    studentSelect: document.getElementById("student-select"),
    freeNameField: document.getElementById("free-name-field"),
    mentorName: document.getElementById("mentor-name"),
    examRouteNote: document.getElementById("exam-route-note"),
    variantField: document.getElementById("variant-field"),
    variantGrid: document.getElementById("variant-grid"),
    ticketField: document.getElementById("ticket-field"),
    ticketSelect: document.getElementById("ticket-select"),
    ticketPreview: document.getElementById("ticket-preview"),
    entryMessage: document.getElementById("entry-message"),
    startButton: document.getElementById("start-button"),
    participantName: document.getElementById("participant-name"),
    participantMeta: document.getElementById("participant-meta"),
    moduleRail: document.getElementById("module-rail"),
    feedback: document.getElementById("training-feedback"),
    moduleCode: document.getElementById("module-code"),
    questionTitle: document.getElementById("question-title"),
    questionPoints: document.getElementById("question-points"),
    questionNote: document.getElementById("question-note"),
    questionBody: document.getElementById("question-body"),
    taskMessage: document.getElementById("task-message"),
    submitAnswer: document.getElementById("submit-answer"),
    skipQuestion: document.getElementById("skip-question"),
    finishAttempt: document.getElementById("finish-attempt"),
    variantImage: document.getElementById("variant-image"),
    variantTitle: document.getElementById("variant-title"),
    variantScenario: document.getElementById("variant-scenario"),
    ticketReference: document.getElementById("ticket-reference"),
    competencyList: document.getElementById("competency-list"),
    progressLabel: document.getElementById("progress-label"),
    progressFill: document.getElementById("progress-fill"),
    resultTitle: document.getElementById("result-title"),
    resultSubtitle: document.getElementById("result-subtitle"),
    resultModules: document.getElementById("result-modules")
  };

  function readResumeRecord() {
    try {
      const raw = window.localStorage.getItem(RESUME_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const record = JSON.parse(raw);
      if (!record?.attemptId || Date.now() - Number(record.updatedAt || 0) > RESUME_MAX_AGE_MS) {
        window.localStorage.removeItem(RESUME_STORAGE_KEY);
        return null;
      }
      return record;
    } catch (_) {
      return null;
    }
  }

  function clearResumeRecord(attemptId = "") {
    try {
      if (!attemptId) {
        window.localStorage.removeItem(RESUME_STORAGE_KEY);
        return;
      }
      const record = readResumeRecord();
      if (record?.attemptId === attemptId) {
        window.localStorage.removeItem(RESUME_STORAGE_KEY);
      }
    } catch (_) {
      // localStorage can be blocked in private browser modes.
    }
  }

  function rememberResumeAttempt(attempt) {
    if (!attempt?.id) {
      return;
    }
    if (attempt.status !== "in_progress") {
      clearResumeRecord(attempt.id);
      return;
    }
    try {
      window.localStorage.setItem(
        RESUME_STORAGE_KEY,
        JSON.stringify({
          attemptId: attempt.id,
          mode: attempt.mode || "exam",
          participantName: attempt.participant?.fullName || "",
          groupName: attempt.participant?.groupName || "",
          updatedAt: Date.now()
        })
      );
    } catch (_) {
      // The server-side resume still works even if browser storage is unavailable.
    }
  }

  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function scoreLabel(summary) {
    if (!summary || summary.totalFinalScore === null || summary.totalFinalScore === undefined) {
      return "баллы скрыты";
    }
    return `${summary.totalFinalScore} / ${summary.totalMaxScore}`;
  }

  function showMessage(element, message, type = "success") {
    if (!element) {
      return;
    }
    element.textContent = message;
    element.className = `message ${type}`;
  }

  function hideMessage(element) {
    if (!element) {
      return;
    }
    element.textContent = "";
    element.className = "message hidden";
  }

  function setSaveStatus(text) {
    if (elements.topSaveStatus) {
      elements.topSaveStatus.textContent = text;
    }
  }

  const RETRYABLE_API_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
  const API_RETRY_DELAYS_MS = [700, 1300, 2200, 3500, 5000];

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchWithRetry(path, options = {}) {
    let lastError = null;
    for (let attemptIndex = 0; attemptIndex <= API_RETRY_DELAYS_MS.length; attemptIndex += 1) {
      try {
        const response = await fetch(path, options);
        if (
          RETRYABLE_API_STATUSES.has(response.status) &&
          attemptIndex < API_RETRY_DELAYS_MS.length
        ) {
          setSaveStatus(`Сервер занят, повторяю запрос ${attemptIndex + 1}...`);
          await wait(API_RETRY_DELAYS_MS[attemptIndex]);
          continue;
        }
        return response;
      } catch (error) {
        lastError = error;
        if (attemptIndex < API_RETRY_DELAYS_MS.length) {
          setSaveStatus(`Сеть нестабильна, повторяю запрос ${attemptIndex + 1}...`);
          await wait(API_RETRY_DELAYS_MS[attemptIndex]);
          continue;
        }
        throw error;
      }
    }
    throw lastError || new Error("Сервер временно перегружен.");
  }

  async function api(path, options = {}) {
    let response;
    try {
      response = await fetchWithRetry(path, {
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        },
        ...options
      });
    } catch (error) {
      const networkError = new Error("Нет соединения с сервером.");
      networkError.cause = error;
      throw networkError;
    }

    const raw = await response.text();
    let payload = {};
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch (_) {
        payload = {
          ok: false,
          message: raw.slice(0, 180) || `Сервер вернул ответ без JSON (${response.status}).`
        };
      }
    }
    if (!response.ok || payload.ok === false) {
      const requestError = new Error(payload.message || `Сервер вернул ошибку (${response.status}).`);
      requestError.status = response.status;
      requestError.payload = payload;
      throw requestError;
    }
    return payload.data;
  }

  function createButton(className, text, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    if (onClick) {
      button.addEventListener("click", onClick);
    }
    return button;
  }

  function interactionInstruction(question) {
    if (!question) {
      return "";
    }
    if (question.interactionHint) {
      return `${question.interactionHint} Можно не тянуть мышью: нажмите карточку, затем нужное место.`;
    }
    if (question.type === "situation") {
      return "Ознакомьтесь с производственной ситуацией и нажмите «Ответить и далее», чтобы начать задания.";
    }
    if (question.type === "single_choice") {
      return "Выберите один подходящий вариант ответа.";
    }
    if (question.type === "multiple_choice") {
      return "Отметьте все подходящие варианты. Лишний выбор снижает результат.";
    }
    if (question.type === "sequence_drag") {
      return "Карточки перемешаны. Выберите операцию, затем нажмите нужный шаг; при желании перетащите карточку мышью.";
    }
    if (question.type === "bucket_sort") {
      return "Выберите карточку, затем нажмите нужную группу. Уже поставленную карточку можно нажать и вернуть обратно.";
    }
    if (question.type === "calculation_task") {
      return "Введите числа в поля. Можно использовать точку или запятую, единицы уже указаны в названии поля.";
    }
    if (question.type === "voice_response") {
      return "Запишите голосовой ответ или оставьте текстовую заметку, если микрофон недоступен.";
    }
    if (question.type === "hotspot_scene") {
      return "Нажмите на видимые нарушения на сцене. Поставленную метку можно убрать нажатием.";
    }
    return "";
  }

  function interactionStepGuide(question) {
    if (!question) {
      return [];
    }
    if (question.visualMode === "cut_shapes") {
      return ["Выберите название формы", "Нажмите подходящее фото", "Для исправления нажмите уже поставленное название"];
    }
    if (question.type === "sequence_drag") {
      return ["Выберите карточку операции", "Нажмите нужный шаг", "Поставленную карточку можно нажать и вернуть"];
    }
    if (question.type === "bucket_sort") {
      return ["Выберите карточку", "Нажмите подходящую группу", "Карточку в группе можно нажать и вернуть"];
    }
    if (question.type === "hotspot_scene") {
      return ["Нажмите на видимое нарушение", "Проверьте количество меток", "Ошибочную метку можно убрать"];
    }
    if (question.type === "calculation_task") {
      return ["Посмотрите формулу", "Введите числа в поля", "Проверьте единицы измерения"];
    }
    if (question.type === "voice_response") {
      return ["Запишите ответ", "Прослушайте запись", "Добавьте текстовую заметку при необходимости"];
    }
    return [];
  }

  function appendTaskGuide(question) {
    const instruction = interactionInstruction(question);
    if (!instruction) {
      return;
    }
    const guide = document.createElement("div");
    guide.className = "task-guide";
    const label = document.createElement("strong");
    label.textContent = "Коротко";
    const copy = document.createElement("div");
    copy.className = "task-guide-copy";
    const text = document.createElement("span");
    text.textContent = instruction;
    copy.appendChild(text);
    const steps = interactionStepGuide(question);
    if (steps.length) {
      const list = document.createElement("ol");
      list.className = "task-guide-steps";
      steps.forEach((step) => {
        const item = document.createElement("li");
        item.textContent = step;
        list.appendChild(item);
      });
      copy.appendChild(list);
    }
    guide.append(label, copy);
    elements.questionBody.appendChild(guide);
  }

  function createInteractionPanel(titleText, contentNode) {
    const panel = document.createElement("section");
    panel.className = "interaction-panel";
    const title = document.createElement("div");
    title.className = "interaction-panel-title";
    title.textContent = titleText;
    panel.append(title, contentNode);
    return panel;
  }

  function renderModulePreview() {
    elements.modulePreview.innerHTML = "";
    (state.exam.modules || []).forEach((module) => {
      const node = document.createElement("article");
      node.className = "module-chip";
      const title = document.createElement("strong");
      title.textContent = `${module.code} ${module.title}`;
      const meta = document.createElement("span");
      meta.textContent = `${module.maxScore} баллов`;
      node.append(title, meta);
      elements.modulePreview.appendChild(node);
    });
  }

  function renderVariants() {
    elements.variantGrid.innerHTML = "";
    (state.exam.variants || []).forEach((variant) => {
      const card = createButton("variant-card", "", () => {
        state.selectedVariantId = variant.id;
        ensureCompatibleTicketSelection();
        renderVariants();
        renderTickets();
      });
      if (variant.id === state.selectedVariantId) {
        card.classList.add("is-selected");
      }
      const image = document.createElement("img");
      image.src = variant.image;
      image.alt = variant.title;
      image.loading = "lazy";
      const number = document.createElement("span");
      number.textContent = `Вариант ${variant.number}`;
      const title = document.createElement("strong");
      title.textContent = variant.title;
      card.append(image, number, title);
      elements.variantGrid.appendChild(card);
    });
  }

  function ticketLabel(ticket) {
    if (!ticket) {
      return "";
    }
    return `№ ${ticket.number}: ${ticket.product} (${ticket.portions} порц.)`;
  }

  function selectedVariant() {
    return (state.exam?.variants || []).find((variant) => variant.id === state.selectedVariantId) || null;
  }

  function ticketMatchesSelectedVariant(ticket) {
    return Boolean(ticket && (!state.selectedVariantId || ticket.family === state.selectedVariantId));
  }

  function ticketsForSelectedVariant() {
    return (state.exam?.materials?.tickets || []).filter(ticketMatchesSelectedVariant);
  }

  function selectedTicket() {
    return ticketsForSelectedVariant().find((item) => item.id === state.selectedTicketId) || null;
  }

  function ensureCompatibleTicketSelection() {
    if (state.selectedTicketId && !selectedTicket()) {
      state.selectedTicketId = "";
    }
  }

  function renderTicketCard(ticket, compact = false, emptyText = "") {
    const card = document.createElement("article");
    card.className = compact ? "ticket-card compact" : "ticket-card";
    if (!ticket) {
      const empty = document.createElement("p");
      empty.textContent =
        emptyText ||
        "Можно выбрать билет из ваших экзаменационных материалов. Если оставить поле пустым, маршрут пройдет по базовому варианту.";
      card.appendChild(empty);
      return card;
    }

    const overline = document.createElement("p");
    overline.className = "overline";
    overline.textContent = `Комплексное задание № ${ticket.number}`;
    const title = document.createElement("strong");
    title.textContent = ticket.product;
    const meta = document.createElement("p");
    meta.textContent = `Расчет сырья: ${ticket.portions} порц. · Рецептура № ${ticket.recipeNo || "требует сверки"}`;
    card.append(overline, title, meta);

    if (!compact && ticket.focus?.length) {
      const tags = document.createElement("div");
      tags.className = "ticket-tags";
      ticket.focus.slice(0, 6).forEach((item) => {
        const tag = document.createElement("span");
        tag.textContent = item;
        tags.appendChild(tag);
      });
      card.appendChild(tags);
    }

    if (ticket.calculationPolicy) {
      const note = document.createElement("p");
      note.className = "ticket-note";
      note.textContent = ticket.calculationPolicy;
      card.appendChild(note);
    }
    return card;
  }

  function renderTickets() {
    ensureCompatibleTicketSelection();
    const tickets = ticketsForSelectedVariant();
    const variant = selectedVariant();
    if (!elements.ticketSelect || !elements.ticketPreview) {
      return;
    }
    elements.ticketSelect.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Базовый маршрут без билета";
    elements.ticketSelect.appendChild(empty);
    if (tickets.length) {
      const hint = document.createElement("option");
      hint.disabled = true;
      hint.textContent = `Доступно для варианта: ${tickets.length}`;
      elements.ticketSelect.appendChild(hint);
    }
    tickets.forEach((ticket) => {
      const option = document.createElement("option");
      option.value = ticket.id;
      option.textContent = ticketLabel(ticket);
      elements.ticketSelect.appendChild(option);
    });
    elements.ticketSelect.value = state.selectedTicketId;
    elements.ticketSelect.title = variant
      ? `Показаны только билеты для варианта "${variant.title}"`
      : "Выберите вариант, затем билет";
    renderTicketPreview();
  }

  function renderTicketPreview() {
    if (!elements.ticketPreview) {
      return;
    }
    const ticket = selectedTicket();
    const variant = selectedVariant();
    const count = ticketsForSelectedVariant().length;
    elements.ticketPreview.innerHTML = "";
    elements.ticketPreview.appendChild(
      renderTicketCard(
        ticket,
        false,
        variant
          ? `Для варианта "${variant.title}" доступно билетов: ${count}. Можно выбрать билет или оставить базовый маршрут.`
          : "Сначала выберите вариант цеха, затем комплексное задание."
      )
    );
  }

  function setMode(mode) {
    state.mode = mode === "training" ? "training" : "exam";
    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.mode === state.mode);
    });
    const training = state.mode === "training";
    if (elements.examRouteNote) {
      elements.examRouteNote.textContent = training
        ? "Тренировка: можно выбрать цех, билет и затем открыть любой модуль слева."
        : "Экзамен: маршрут формируется автоматически из овощного, рыбного, мясного участка, птицы и комплексного заказа. Цех и билет выбирать не нужно.";
    }
    elements.variantField?.classList.toggle("hidden", !training);
    elements.ticketField?.classList.toggle("hidden", !training);
    elements.ticketPreview?.classList.toggle("hidden", !training);
    if (!training) {
      state.selectedTicketId = "";
    }
    renderTickets();
    elements.topMode.textContent = state.mode === "training" ? "Тренировка" : "Экзамен";
    elements.startButton.textContent = training ? "Начать тренировку ПМ.01" : "Начать смешанный экзамен ПМ.01";
    refreshTopbar();
  }

  function selectedRosterGroup() {
    const groupName = elements.groupName?.value || "";
    return PM01_STUDENT_GROUPS.find((group) => group.groupName === groupName) || null;
  }

  function setTeacherName() {
    if (elements.mentorName) {
      elements.mentorName.value = TEACHER_NAME;
    }
  }

  function syncFreeNameField() {
    const isFreeName = elements.studentSelect?.value === FREE_STUDENT_VALUE;
    elements.freeNameField?.classList.toggle("hidden", !isFreeName);
    if (!isFreeName && elements.fullName) {
      elements.fullName.value = "";
    }
  }

  function renderStudentSelect() {
    if (!elements.studentSelect) {
      return;
    }
    const group = selectedRosterGroup();
    elements.studentSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = group ? "Выберите свое ФИО" : "Сначала выберите группу";
    elements.studentSelect.appendChild(placeholder);
    elements.studentSelect.disabled = !group;

    (group?.students || []).forEach((studentName) => {
      const option = document.createElement("option");
      option.value = studentName;
      option.textContent = studentName;
      elements.studentSelect.appendChild(option);
    });

    if (group) {
      const freeOption = document.createElement("option");
      freeOption.value = FREE_STUDENT_VALUE;
      freeOption.textContent = "Свободное имя";
      elements.studentSelect.appendChild(freeOption);
    }
    syncFreeNameField();
  }

  function selectedParticipantName() {
    const selectedStudent = elements.studentSelect?.value?.trim() || "";
    if (selectedStudent === FREE_STUDENT_VALUE) {
      const freeName = elements.fullName?.value?.trim() || "";
      return freeName || "Свободное имя";
    }
    return selectedStudent;
  }

  function participantPayload() {
    return {
      fullName: selectedParticipantName(),
      institution: elements.institution.value.trim(),
      groupName: elements.groupName.value.trim(),
      mentorName: TEACHER_NAME
    };
  }

  function refreshTopbar() {
    const attempt = state.attempt;
    const courseCodes = (state.exam?.interdisciplinaryCourses || []).map((course) => course.code).join(" · ");
    elements.topTitle.textContent = state.exam ? "ПМ.01" : "ПМ.01";
    elements.topSubtitle.textContent = courseCodes || (state.exam ? state.exam.subtitle : "Интерактивный экзамен");
    elements.topMode.textContent = state.mode === "training" ? "Тренировка" : "Экзамен";
    elements.topVariant.textContent = attempt?.selectedVariant
      ? attempt.selectedVariant.title
      : state.mode === "training"
        ? "Выберите цех"
        : "Смешанный маршрут";
    elements.topModule.textContent = attempt?.currentModule
      ? `${attempt.currentModule.code} ${attempt.currentModule.title}`
      : "M0";
    elements.topScore.textContent = attempt ? scoreLabel(attempt.summary) : "0 / 100";
    elements.topTimer.textContent = attempt?.timing
      ? formatTime(attempt.timing.totalRemainingMs)
      : `${state.exam?.durationMinutes || 90}:00`;
    elements.topSaveStatus.textContent = attempt ? "готово" : "ожидание";
  }

  function refreshTimer() {
    if (state.timer) {
      clearInterval(state.timer);
    }
    state.timer = setInterval(() => {
      if (!state.attempt || state.attempt.status !== "in_progress") {
        return;
      }
      const remaining = Math.max(0, new Date(state.attempt.expiresAt).getTime() - Date.now());
      elements.topTimer.textContent = formatTime(remaining);
      if (remaining <= 0) {
        loadAttempt(state.attempt.id).catch(() => {});
      }
    }, 1000);
  }

  function setScreens(screen) {
    elements.entryScreen.classList.toggle("hidden", screen !== "entry");
    elements.workspaceScreen.classList.toggle("hidden", screen !== "workspace");
    elements.resultScreen.classList.toggle("hidden", screen !== "result");
  }

  function renderModuleRail() {
    const attempt = state.attempt;
    const moduleScores = new Map(
      (attempt.summary?.moduleScores || []).map((module) => [module.moduleId, module])
    );
    elements.moduleRail.innerHTML = "";
    if (attempt.mode === "training" && attempt.status === "in_progress") {
      const hint = document.createElement("div");
      hint.className = "module-rail-hint";
      hint.textContent = "Тренировка: можно открыть любой модуль.";
      elements.moduleRail.appendChild(hint);
    }
    (attempt.route.modules || []).forEach((module) => {
      const canJump = attempt.mode === "training" && attempt.status === "in_progress";
      const node = canJump
        ? createButton("module-step module-step-button", "", () => jumpToModule(module.id))
        : document.createElement("article");
      if (!canJump) {
        node.className = "module-step";
      }
      const current = attempt.currentModule && attempt.currentModule.id === module.id;
      const score = moduleScores.get(module.id);
      const done =
        attempt.mode === "training"
          ? Number(score?.answered || 0) >= Number(module.questionCount || 0)
          : module.stepEnd < attempt.currentStepIndex;
      node.classList.toggle("is-current", current);
      node.classList.toggle("is-done", done);
      if (canJump) {
        node.setAttribute("aria-label", `Открыть ${module.code} ${module.title}`);
        node.title = "Открыть модуль в тренировке";
      }
      const title = document.createElement("strong");
      title.textContent = `${module.code} ${module.title}`;
      const meta = document.createElement("span");
      meta.textContent =
        canJump
          ? `${module.questionCount} заданий · ${module.maxScore} баллов · выбрать`
          : `${module.questionCount} заданий · ${module.maxScore} баллов`;
      node.append(title, meta);
      elements.moduleRail.appendChild(node);
    });
  }

  function renderFeedback() {
    const feedback = state.attempt?.lastFeedback;
    if (!feedback) {
      elements.feedback.classList.add("hidden");
      elements.feedback.innerHTML = "";
      return;
    }
    elements.feedback.classList.remove("hidden");
    elements.feedback.innerHTML = "";
    const title = document.createElement("strong");
    title.textContent = `Тренировка: ${feedback.score} из ${feedback.maxScore}`;
    const answer = document.createElement("p");
    answer.textContent = feedback.correctAnswer ? `Эталон: ${feedback.correctAnswer}` : "";
    const explanation = document.createElement("p");
    explanation.textContent = feedback.explanation || "";
    elements.feedback.append(title);
    if (answer.textContent) {
      elements.feedback.appendChild(answer);
    }
    if (explanation.textContent) {
      elements.feedback.appendChild(explanation);
    }
  }

  function renderReferencePanel() {
    const variant = state.attempt.selectedVariant;
    elements.variantImage.src = variant.image;
    elements.variantImage.alt = variant.title;
    elements.variantTitle.textContent = variant.title;
    elements.variantScenario.textContent = variant.scenario;
    const ticket = state.attempt.materialTicket || variant.materialTicket || null;
    if (elements.ticketReference) {
      elements.ticketReference.innerHTML = "";
      elements.ticketReference.classList.toggle("hidden", !ticket);
      if (ticket) {
        elements.ticketReference.appendChild(renderTicketCard(ticket, true));
      }
    }
    elements.competencyList.innerHTML = "";
    (variant.competencies || []).forEach((competency) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = competency;
      elements.competencyList.appendChild(tag);
    });
    const progress = state.attempt.progress;
    elements.progressLabel.textContent = `${progress.currentQuestionIndex} / ${progress.totalQuestions}`;
    const percent = progress.totalQuestions
      ? Math.min(100, (progress.currentQuestionIndex / progress.totalQuestions) * 100)
      : 0;
    elements.progressFill.style.width = `${percent}%`;
  }

  function renderSituation(question) {
    const card = document.createElement("article");
    card.className = "situation-card";
    const image = document.createElement("img");
    image.src = question.image || state.attempt.selectedVariant.image;
    image.alt = question.variantTitle || "Производственная ситуация";
    image.style.borderRadius = "8px";
    const text = document.createElement("p");
    text.textContent = question.prompt;
    const tags = document.createElement("div");
    tags.className = "tag-list";
    (question.competencies || []).forEach((item) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = item;
      tags.appendChild(tag);
    });
    card.append(image, text, tags);
    if (question.materialTicket) {
      card.appendChild(renderTicketCard(question.materialTicket));
    }
    elements.questionBody.appendChild(card);
    return {
      isValid: () => true,
      getAnswer: () => ({ acknowledged: true })
    };
  }

  function renderChoice(question) {
    const selected = new Set();
    if (question.savedAnswer?.selectedOptionId) {
      selected.add(question.savedAnswer.selectedOptionId);
    }
    (question.savedAnswer?.selectedOptionIds || []).forEach((id) => selected.add(id));
    const list = document.createElement("div");
    list.className = "option-list";

    function rerender() {
      list.innerHTML = "";
      (question.options || []).forEach((option) => {
        const button = createButton("option-button", option.text, () => {
          if (question.type === "single_choice") {
            selected.clear();
            selected.add(option.id);
          } else if (selected.has(option.id)) {
            selected.delete(option.id);
          } else {
            selected.add(option.id);
          }
          rerender();
        });
        button.classList.toggle("is-selected", selected.has(option.id));
        list.appendChild(button);
      });
    }

    rerender();
    elements.questionBody.appendChild(list);
    return {
      isValid: () => selected.size > 0,
      getAnswer: () =>
        question.type === "single_choice"
          ? { selectedOptionId: Array.from(selected)[0] || "" }
          : { selectedOptionIds: Array.from(selected) }
    };
  }

  function renderSequence(question) {
    const itemMap = new Map((question.items || []).map((item) => [item.id, item]));
    const sequence = (question.slots || []).map(() => null);
    (question.savedAnswer?.sequence || []).forEach((itemId, index) => {
      if (index < sequence.length && itemMap.has(itemId)) {
        sequence[index] = itemId;
      }
    });

    let activeItemId = "";
    let lastDroppedIndex = -1;
    const layout = document.createElement("div");
    layout.className = "sequence-layout";
    const status = document.createElement("div");
    status.className = "interaction-status";
    const slots = document.createElement("div");
    slots.className = "option-list";
    const bank = document.createElement("div");
    bank.className = "option-list";

    function updateStatus() {
      const activeItem = itemMap.get(activeItemId);
      const filledCount = sequence.filter(Boolean).length;
      status.textContent = activeItem
        ? `Выбрано: ${activeItem.text}. Теперь нажмите нужный шаг.`
        : `Заполнено шагов: ${filledCount} из ${sequence.length}. Сначала выберите операцию.`;
    }

    function moveItemToSlot(itemId, slotIndex) {
      if (!itemMap.has(itemId) || slotIndex < 0 || slotIndex >= sequence.length) {
        return;
      }
      const displaced = sequence[slotIndex];
      sequence.forEach((value, index) => {
        if (value === itemId) {
          sequence[index] = null;
        }
      });
      sequence[slotIndex] = itemId;

      if (displaced && displaced !== itemId) {
        const emptyIndex = sequence.findIndex((value, index) => value === null && index !== slotIndex);
        if (emptyIndex >= 0) {
          sequence[emptyIndex] = displaced;
        }
      }

      activeItemId = "";
      lastDroppedIndex = slotIndex;
      rerender();
    }

    function removeAt(index) {
      sequence[index] = null;
      activeItemId = "";
      rerender();
    }

    function createSequenceChip(item, placed = false) {
      const isVisualStep = Boolean(item.image);
      const chip = createButton(
        `sequence-chip${isVisualStep ? " visual-sequence-chip" : ""}${
          item.id === activeItemId ? " is-selected" : ""
        }${placed ? " is-placed" : ""}`,
        item.text,
        (event) => {
          event.stopPropagation();
          if (placed) {
            removeAt(sequence.findIndex((value) => value === item.id));
            return;
          }
          activeItemId = activeItemId === item.id ? "" : item.id;
          rerender();
        }
      );
      chip.setAttribute("aria-pressed", item.id === activeItemId ? "true" : "false");
      chip.title = placed ? "Убрать из шага" : "Выбрать операцию";
      if (isVisualStep) {
        chip.textContent = "";
        chip.setAttribute("aria-label", item.text);

        const image = document.createElement("img");
        image.src = item.image;
        image.alt = item.text;
        image.loading = "eager";
        image.decoding = "async";

        const copy = document.createElement("span");
        copy.className = "visual-sequence-copy";
        const title = document.createElement("strong");
        title.textContent = item.text;
        copy.appendChild(title);
        if (item.detail) {
          const detail = document.createElement("span");
          detail.textContent = item.detail;
          copy.appendChild(detail);
        }
        const action = document.createElement("span");
        action.className = "chip-action";
        action.textContent = placed ? "Убрать" : item.id === activeItemId ? "Выбрано" : "Выбрать";
        copy.appendChild(action);

        chip.append(image, copy);
      }
      chip.draggable = true;
      chip.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", item.id);
        event.dataTransfer.effectAllowed = "move";
        chip.classList.add("is-dragging");
      });
      chip.addEventListener("dragend", () => {
        chip.classList.remove("is-dragging");
      });
      return chip;
    }

    function rerender() {
      slots.innerHTML = "";
      bank.innerHTML = "";
      updateStatus();
      sequence.forEach((itemId, index) => {
        const slot = document.createElement("article");
        slot.className = `slot-card${itemId ? " is-filled" : ""}${
          index === lastDroppedIndex ? " just-dropped" : ""
        }`;
        slot.tabIndex = 0;
        const label = document.createElement("strong");
        label.textContent = question.slots[index]?.label || `Шаг ${index + 1}`;
        const drop = document.createElement("div");
        drop.className = "sequence-slot-drop";
        if (itemId && itemMap.has(itemId)) {
          drop.appendChild(createSequenceChip(itemMap.get(itemId), true));
        } else if (activeItemId && itemMap.has(activeItemId)) {
          const place = createButton("inline-drop-button", `Поставить: ${itemMap.get(activeItemId).text}`, (event) => {
            event.stopPropagation();
            moveItemToSlot(activeItemId, index);
          });
          drop.appendChild(place);
        } else {
          drop.textContent = "Выберите операцию и нажмите этот шаг";
        }

        function setOver(over) {
          slot.classList.toggle("is-over", over);
        }

        slot.addEventListener("dragover", (event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setOver(true);
        });
        slot.addEventListener("dragleave", () => setOver(false));
        slot.addEventListener("drop", (event) => {
          event.preventDefault();
          setOver(false);
          moveItemToSlot(event.dataTransfer.getData("text/plain"), index);
        });
        slot.addEventListener("click", () => {
          if (activeItemId) {
            moveItemToSlot(activeItemId, index);
          }
        });
        slot.addEventListener("keydown", (event) => {
          if ((event.key === "Enter" || event.key === " ") && activeItemId) {
            event.preventDefault();
            moveItemToSlot(activeItemId, index);
          }
        });

        slot.append(label, drop);
        slots.appendChild(slot);
      });

      const freeItems = (question.items || []).filter((item) => !sequence.includes(item.id));
      if (freeItems.length) {
        freeItems.forEach((item) => {
          bank.appendChild(createSequenceChip(item));
        });
      } else {
        const empty = document.createElement("div");
        empty.className = "sequence-bank-empty";
        empty.textContent = "Все операции распределены. Нажмите на шаг, чтобы снять операцию и переставить ее.";
        bank.appendChild(empty);
      }

      if (lastDroppedIndex >= 0) {
        window.setTimeout(() => {
          lastDroppedIndex = -1;
          slots.querySelectorAll(".just-dropped").forEach((node) => node.classList.remove("just-dropped"));
        }, 520);
      }
    }

    rerender();
    layout.append(
      status,
      createInteractionPanel("Шаги ответа", slots),
      createInteractionPanel("Карточки операций", bank)
    );
    elements.questionBody.appendChild(layout);
    return {
      isValid: () => sequence.every(Boolean),
      getAnswer: () => ({ sequence: sequence.filter(Boolean) })
    };
  }

  function renderCutShapeMatching(question) {
    const placements = {};
    Object.entries(question.savedAnswer?.buckets || {}).forEach(([itemId, bucketId]) => {
      placements[itemId] = bucketId;
    });

    let activeItemId = "";
    let lastDroppedBucketId = "";
    const itemMap = new Map((question.items || []).map((item) => [item.id, item]));
    const wrapper = document.createElement("div");
    wrapper.className = "cut-match";

    const status = document.createElement("div");
    status.className = "interaction-status";
    const tray = document.createElement("div");
    tray.className = "cut-name-tray";
    const grid = document.createElement("div");
    grid.className = "cut-target-grid";
    wrapper.append(
      status,
      createInteractionPanel("Названия форм", tray),
      createInteractionPanel("Фотографии и применение", grid)
    );
    elements.questionBody.appendChild(wrapper);

    function updateStatus() {
      const activeItem = itemMap.get(activeItemId);
      const placedCount = Object.keys(placements).length;
      status.textContent = activeItem
        ? `Выбрано: ${activeItem.text}. Нажмите фото, к которому относится это название.`
        : `Соотнесено: ${placedCount} из ${(question.items || []).length}. Сначала выберите название.`;
    }

    function bucketItem(bucketId) {
      return (question.items || []).find((item) => placements[item.id] === bucketId) || null;
    }

    function placeItem(itemId, bucketId) {
      if (!itemMap.has(itemId) || !bucketId) {
        return;
      }

      Object.entries(placements).forEach(([placedItemId, placedBucketId]) => {
        if (placedBucketId === bucketId) {
          delete placements[placedItemId];
        }
      });
      placements[itemId] = bucketId;
      activeItemId = "";
      lastDroppedBucketId = bucketId;
      rerender();
    }

    function removeItem(itemId) {
      delete placements[itemId];
      if (activeItemId === itemId) {
        activeItemId = "";
      }
      rerender();
    }

    function createNameChip(item, placed = false) {
      const chip = createButton(
        `cut-name-chip${item.id === activeItemId ? " is-active" : ""}${placed ? " is-placed" : ""}`,
        item.text,
        (event) => {
          event.stopPropagation();
          if (placed) {
            removeItem(item.id);
            return;
          }
          activeItemId = activeItemId === item.id ? "" : item.id;
          rerender();
        }
      );
      chip.setAttribute("aria-pressed", item.id === activeItemId ? "true" : "false");
      chip.title = placed ? "Убрать название с фото" : "Выбрать название";
      chip.draggable = true;
      chip.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", item.id);
        event.dataTransfer.effectAllowed = "move";
        chip.classList.add("is-dragging");
      });
      chip.addEventListener("dragend", () => {
        chip.classList.remove("is-dragging");
      });
      return chip;
    }

    function createTarget(bucket) {
      const placedItem = bucketItem(bucket.id);
      const target = document.createElement("article");
      target.className = `cut-target${placedItem ? " is-filled" : ""}${
        bucket.id === lastDroppedBucketId ? " just-dropped" : ""
      }`;
      target.tabIndex = 0;

      const imageWrap = document.createElement("figure");
      imageWrap.className = "cut-target-image";
      const image = document.createElement("img");
      image.src = bucket.image || state.attempt.selectedVariant.image;
      image.alt = bucket.visualTitle || bucket.label;
      image.loading = "lazy";
      image.decoding = "async";
      imageWrap.appendChild(image);

      const copy = document.createElement("div");
      copy.className = "cut-target-copy";
      const title = document.createElement("strong");
      title.textContent = bucket.visualTitle || bucket.label;
      const label = document.createElement("span");
      label.textContent = bucket.label;
      const detail = document.createElement("p");
      detail.textContent = bucket.detail || "";
      copy.append(title, label);
      if (detail.textContent) {
        copy.appendChild(detail);
      }

      const drop = document.createElement("div");
      drop.className = "cut-drop-slot";
      if (placedItem) {
        drop.appendChild(createNameChip(placedItem, true));
      } else if (activeItemId && itemMap.has(activeItemId)) {
        const place = createButton("inline-drop-button", "Поставить сюда", (event) => {
          event.stopPropagation();
          placeItem(activeItemId, bucket.id);
        });
        drop.appendChild(place);
      } else {
        drop.textContent = "Выберите название и нажмите фото";
      }

      function setOver(over) {
        target.classList.toggle("is-over", over);
      }

      target.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setOver(true);
      });
      target.addEventListener("dragleave", () => setOver(false));
      target.addEventListener("drop", (event) => {
        event.preventDefault();
        setOver(false);
        placeItem(event.dataTransfer.getData("text/plain"), bucket.id);
      });
      target.addEventListener("click", () => {
        if (activeItemId) {
          placeItem(activeItemId, bucket.id);
        }
      });
      target.addEventListener("keydown", (event) => {
        if ((event.key === "Enter" || event.key === " ") && activeItemId) {
          event.preventDefault();
          placeItem(activeItemId, bucket.id);
        }
      });

      target.append(imageWrap, copy, drop);
      return target;
    }

    function rerender() {
      tray.innerHTML = "";
      grid.innerHTML = "";
      updateStatus();

      const freeItems = (question.items || []).filter((item) => !placements[item.id]);
      if (freeItems.length) {
        freeItems.forEach((item) => tray.appendChild(createNameChip(item)));
      } else {
        const done = document.createElement("div");
        done.className = "cut-name-tray-empty";
        done.textContent = "Все названия распределены. Можно снять название с фото и перенести заново.";
        tray.appendChild(done);
      }

      (question.buckets || []).forEach((bucket) => {
        grid.appendChild(createTarget(bucket));
      });

      if (lastDroppedBucketId) {
        window.setTimeout(() => {
          lastDroppedBucketId = "";
          grid.querySelectorAll(".just-dropped").forEach((node) => node.classList.remove("just-dropped"));
        }, 520);
      }
    }

    rerender();
    return {
      isValid: () => Object.keys(placements).length > 0,
      getAnswer: () => ({ buckets: { ...placements } })
    };
  }

  function renderBucket(question) {
    if (question.visualMode === "cut_shapes") {
      return renderCutShapeMatching(question);
    }

    const placements = {};
    Object.entries(question.savedAnswer?.buckets || {}).forEach(([itemId, bucketId]) => {
      placements[itemId] = bucketId;
    });
    let activeBucketId = "";
    let activeItemId = "";
    let lastDroppedBucketId = "";
    const itemMap = new Map((question.items || []).map((item) => [item.id, item]));

    const wrapper = document.createElement("div");
    wrapper.className = "bucket-workspace";
    const status = document.createElement("div");
    status.className = "interaction-status";
    const bank = document.createElement("div");
    bank.className = "option-list";
    const grid = document.createElement("div");
    grid.className = "bucket-grid";
    wrapper.append(
      status,
      createInteractionPanel("Карточки", bank),
      createInteractionPanel("Группы", grid)
    );
    elements.questionBody.appendChild(wrapper);

    function updateStatus() {
      const activeItem = itemMap.get(activeItemId);
      const placedCount = Object.keys(placements).length;
      status.textContent = activeItem
        ? `Выбрано: ${activeItem.text}. Теперь нажмите подходящую группу.`
        : `Распределено: ${placedCount} из ${(question.items || []).length}. Сначала выберите карточку.`;
    }

    function assign(itemId, bucketId) {
      if (!itemMap.has(itemId) || !bucketId) {
        return;
      }
      placements[itemId] = bucketId;
      activeBucketId = bucketId;
      activeItemId = "";
      lastDroppedBucketId = bucketId;
      rerender();
    }

    function remove(itemId) {
      delete placements[itemId];
      if (activeItemId === itemId) {
        activeItemId = "";
      }
      rerender();
    }

    function createBucketChip(item, placed = false) {
      const isProductCard = question.visualMode === "product_cards" && item.image;
      const chip = createButton(
        `bucket-chip${item.id === activeItemId ? " is-selected" : ""}${placed ? " is-placed" : ""}${
          isProductCard ? " product-chip" : ""
        }`,
        isProductCard ? "" : item.text,
        (event) => {
          event.stopPropagation();
          if (placed) {
            remove(item.id);
            return;
          }
          activeItemId = activeItemId === item.id ? "" : item.id;
          rerender();
        }
      );
      chip.setAttribute("aria-pressed", item.id === activeItemId ? "true" : "false");
      chip.title = placed ? "Вернуть карточку" : "Выбрать карточку";
      if (isProductCard) {
        chip.setAttribute("aria-label", item.text);
        const image = document.createElement("img");
        image.src = item.image;
        image.alt = item.text;
        image.loading = "eager";
        image.decoding = "async";

        const copy = document.createElement("span");
        copy.className = "product-chip-copy";
        const title = document.createElement("strong");
        title.textContent = item.text;
        copy.appendChild(title);
        if (item.detail) {
          const detail = document.createElement("span");
          detail.textContent = item.detail;
          copy.appendChild(detail);
        }
        const action = document.createElement("span");
        action.className = "chip-action";
        action.textContent = placed ? "Убрать" : item.id === activeItemId ? "Выбрано" : "Выбрать";
        copy.appendChild(action);
        chip.append(image, copy);
      }
      chip.draggable = true;
      chip.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", item.id);
        event.dataTransfer.effectAllowed = "move";
        chip.classList.add("is-dragging");
      });
      chip.addEventListener("dragend", () => {
        chip.classList.remove("is-dragging");
      });
      return chip;
    }

    function rerender() {
      bank.innerHTML = "";
      grid.innerHTML = "";
      updateStatus();
      const freeItems = (question.items || []).filter((item) => !placements[item.id]);
      if (freeItems.length) {
        freeItems.forEach((item) => bank.appendChild(createBucketChip(item)));
      } else {
        const empty = document.createElement("div");
        empty.className = "bucket-bank-empty";
        empty.textContent = "Все карточки распределены. Нажмите на карточку в колонке, чтобы вернуть ее.";
        bank.appendChild(empty);
      }

      (question.buckets || []).forEach((bucket) => {
        const column = document.createElement("article");
        column.className = `bucket-column${bucket.id === activeBucketId ? " is-active" : ""}${
          bucket.id === lastDroppedBucketId ? " just-dropped" : ""
        }`;
        column.tabIndex = 0;
        column.addEventListener("click", () => {
          if (activeItemId) {
            assign(activeItemId, bucket.id);
          } else {
            activeBucketId = bucket.id;
            rerender();
          }
        });
        column.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (activeItemId) {
              assign(activeItemId, bucket.id);
            } else {
              activeBucketId = bucket.id;
              rerender();
            }
          }
        });
        column.addEventListener("dragover", (event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          column.classList.add("is-over");
        });
        column.addEventListener("dragleave", () => {
          column.classList.remove("is-over");
        });
        column.addEventListener("drop", (event) => {
          event.preventDefault();
          column.classList.remove("is-over");
          assign(event.dataTransfer.getData("text/plain"), bucket.id);
        });
        const title = document.createElement("strong");
        title.textContent = bucket.label;
        const body = document.createElement("div");
        body.className = "bucket-items";
        const placedItems = (question.items || []).filter((item) => placements[item.id] === bucket.id);
        if (placedItems.length) {
          placedItems.forEach((item) => {
            body.appendChild(createBucketChip(item, true));
          });
        } else {
          const empty = document.createElement("span");
          empty.className = "bucket-empty";
          empty.textContent = activeItemId ? "Нажмите группу, чтобы поставить карточку" : "Выберите карточку выше";
          body.appendChild(empty);
        }
        column.append(title, body);
        if (activeItemId && itemMap.has(activeItemId)) {
          const place = createButton("inline-drop-button bucket-column-action", "Поставить выбранную карточку", (event) => {
            event.stopPropagation();
            assign(activeItemId, bucket.id);
          });
          column.appendChild(place);
        }
        grid.appendChild(column);
      });

      if (lastDroppedBucketId) {
        window.setTimeout(() => {
          lastDroppedBucketId = "";
          grid.querySelectorAll(".just-dropped").forEach((node) => node.classList.remove("just-dropped"));
        }, 520);
      }
    }

    rerender();
    return {
      isValid: () => Object.keys(placements).length > 0,
      getAnswer: () => ({ buckets: { ...placements } })
    };
  }

  function renderCalculation(question) {
    if (question.formulas && question.formulas.length) {
      const formulas = document.createElement("div");
      formulas.className = "formula-list";
      question.formulas.forEach((formula) => {
        const node = document.createElement("span");
        node.textContent = formula;
        formulas.appendChild(node);
      });
      elements.questionBody.appendChild(formulas);
    }

    const values = { ...(question.savedAnswer?.values || {}) };
    const grid = document.createElement("div");
    grid.className = "calc-grid";
    (question.fields || []).forEach((field) => {
      const card = document.createElement("label");
      card.className = "calc-card";
      const label = document.createElement("strong");
      label.textContent = `${field.label}${field.unit ? `, ${field.unit}` : ""}`;
      const input = document.createElement("input");
      input.type = "text";
      input.inputMode = "decimal";
      input.placeholder = "0,00";
      input.value = values[field.id] || "";
      input.addEventListener("input", () => {
        values[field.id] = input.value;
      });
      card.append(label, input);
      grid.appendChild(card);
    });
    elements.questionBody.appendChild(grid);
    return {
      isValid: () => (question.fields || []).some((field) => String(values[field.id] || "").trim()),
      getAnswer: () => ({ values })
    };
  }

  function renderVoice(question) {
    let mediaRecorder = null;
    let startedAt = 0;
    let audioDataUrl = question.savedAnswer?.audioDataUrl || "";
    let audioId = question.savedAnswer?.audioId || "";
    let audioUploadStatus = question.savedAnswer?.audioUploadStatus || (audioId ? "stored" : "");
    let audioUploadMessage = question.savedAnswer?.audioUploadMessage || "";
    let durationMs = Number(question.savedAnswer?.durationMs || 0);
    let audioBytes = Number(question.savedAnswer?.audioBytes || 0);
    let mimeType = question.savedAnswer?.mimeType || "audio/webm";
    let previewUrl = "";
    let uploadPending = false;

    const wrapper = document.createElement("div");
    wrapper.className = "option-list";
    const controls = document.createElement("div");
    controls.className = "voice-controls";

    async function uploadVoiceBlob(blob) {
      uploadPending = true;
      elements.submitAnswer.disabled = true;
      audioId = "";
      audioUploadStatus = "uploading";
      audioUploadMessage = "Загружаем запись...";
      meter.textContent = audioUploadMessage;
      try {
        const response = await fetchWithRetry(
          `/api/pm01/public/attempts/${encodeURIComponent(state.attempt.id)}/voice/${encodeURIComponent(question.id)}/audio?durationMs=${encodeURIComponent(String(durationMs))}`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": blob.type || "audio/webm",
              "X-PM01-Duration-Ms": String(durationMs)
            },
            body: blob
          }
        );
        const raw = await response.text();
        let payload = {};
        if (raw) {
          try {
            payload = JSON.parse(raw);
          } catch (_) {
            payload = { ok: false, message: raw.slice(0, 180) };
          }
        }
        if (!response.ok || payload.ok === false) {
          throw new Error(payload.message || `Сервер вернул ошибку (${response.status}).`);
        }
        const data = payload.data || {};
        audioId = data.audioId || "";
        audioUploadStatus = data.audioUploadStatus || "stored";
        audioUploadMessage = data.audioUploadMessage || "Запись загружена.";
        audioBytes = Number(data.audioBytes || audioBytes || 0);
        mimeType = data.mimeType || mimeType;
        meter.textContent = `${audioUploadMessage} · ${Math.round(durationMs / 1000)} сек.`;
      } catch (error) {
        audioId = "";
        audioUploadStatus = "failed";
        audioUploadMessage = error.message || "Запись не удалось загрузить.";
        meter.textContent = audioUploadMessage;
        showMessage(elements.taskMessage, `${audioUploadMessage} Попробуйте записать короче или оставьте текстовую заметку.`, "error");
      } finally {
        uploadPending = false;
        elements.submitAnswer.disabled = false;
      }
    }

    const start = createButton("button secondary", "Запись", async () => {
      hideMessage(elements.taskMessage);
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
          throw new Error("Микрофон недоступен в этом браузере.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const chunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.addEventListener("dataavailable", (event) => {
          if (event.data.size) {
            chunks.push(event.data);
          }
        });
        mediaRecorder.addEventListener("stop", async () => {
          const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
          audioBytes = blob.size;
          mimeType = blob.type || "audio/webm";
          audioDataUrl = "";
          audioId = "";
          if (audioBytes > MAX_VOICE_AUDIO_BYTES) {
            audioDataUrl = "";
            preview.removeAttribute("src");
            preview.classList.add("hidden");
            meter.textContent = "Запись слишком большая. Запишите ответ короче или оставьте текстовую заметку.";
            showMessage(elements.taskMessage, "Голосовая запись слишком большая для надежной отправки. Запишите ответ короче или оставьте текстовую заметку.", "error");
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
          }
          previewUrl = URL.createObjectURL(blob);
          preview.src = previewUrl;
          preview.classList.remove("hidden");
          stream.getTracks().forEach((track) => track.stop());
          await uploadVoiceBlob(blob);
        });
        startedAt = Date.now();
        mediaRecorder.start();
        meter.textContent = "Идет запись";
        start.disabled = true;
        stop.disabled = false;
      } catch (error) {
        showMessage(elements.taskMessage, "Микрофон недоступен. Можно оставить текстовую заметку.", "error");
      }
    });
    const stop = createButton("button secondary", "Стоп", () => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        durationMs = Date.now() - startedAt;
        mediaRecorder.stop();
      }
      start.disabled = false;
      stop.disabled = true;
    });
    stop.disabled = true;
    const meter = document.createElement("span");
    meter.className = "voice-meter";
    meter.textContent = audioId
      ? (audioUploadMessage || "Запись уже загружена")
      : audioDataUrl
        ? "Запись сохранена"
        : "Запись не начата";
    controls.append(start, stop, meter);

    const preview = document.createElement("audio");
    preview.className = `voice-preview${audioDataUrl ? "" : " hidden"}`;
    preview.controls = true;
    preview.src = audioDataUrl;

    const note = document.createElement("label");
    note.className = "voice-field";
    const noteLabel = document.createElement("span");
    noteLabel.textContent = "Заметка к ответу";
    const textarea = document.createElement("textarea");
    textarea.value = question.savedAnswer?.transcriptNote || "";
    note.append(noteLabel, textarea);

    const rubric = document.createElement("div");
    rubric.className = "tag-list";
    (question.rubric || []).forEach((criterion) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = `${criterion.label}: ${criterion.maxScore}`;
      rubric.appendChild(tag);
    });

    wrapper.append(controls, preview, note, rubric);
    elements.questionBody.appendChild(wrapper);

    return {
      isValid: () => !uploadPending && Boolean(audioId || audioDataUrl || textarea.value.trim()),
      getAnswer: () => ({
        audioId,
        audioDataUrl,
        durationMs,
        audioBytes,
        mimeType,
        audioUploadStatus,
        audioUploadMessage,
        transcriptNote: textarea.value.trim(),
        audioName: (audioId || audioDataUrl) ? `${question.id}.webm` : ""
      })
    };
  }

  function renderHotspot(question) {
    const points = Array.isArray(question.savedAnswer?.points)
      ? question.savedAnswer.points.map((point) => ({ x: Number(point.x), y: Number(point.y) }))
      : [];
    const stage = document.createElement("div");
    stage.className = "hotspot-stage";
    const image = document.createElement("img");
    image.src = question.image || state.attempt.selectedVariant.image;
    image.alt = question.prompt;
    image.loading = "eager";
    image.decoding = "async";
    const toolbar = document.createElement("div");
    toolbar.className = "hotspot-toolbar";
    const summary = document.createElement("div");
    summary.className = "hotspot-summary";
    const undo = createButton("inline-drop-button", "Убрать последнюю", () => {
      points.pop();
      rerender();
    });
    const clear = createButton("inline-drop-button secondary-inline", "Очистить метки", () => {
      points.splice(0, points.length);
      rerender();
    });

    function addPoint(event) {
      if (event.target.tagName === "BUTTON") {
        return;
      }
      const rect = stage.getBoundingClientRect();
      points.push({
        x: Number((((event.clientX - rect.left) / rect.width) * 100).toFixed(2)),
        y: Number((((event.clientY - rect.top) / rect.height) * 100).toFixed(2))
      });
      rerender();
    }

    function rerender() {
      stage.innerHTML = "";
      stage.appendChild(image);
      points.forEach((point, index) => {
        const marker = createButton("", String(index + 1), (event) => {
          event.stopPropagation();
          points.splice(index, 1);
          rerender();
        });
        marker.style.left = `${point.x}%`;
        marker.style.top = `${point.y}%`;
        stage.appendChild(marker);
      });
      summary.textContent = `Отмечено зон: ${points.length} из ${question.hotspotTargetCount || "?"}`;
      undo.disabled = points.length === 0;
      clear.disabled = points.length === 0;
    }

    stage.addEventListener("click", addPoint);
    rerender();
    toolbar.append(summary, undo, clear);
    elements.questionBody.append(stage, toolbar);

    return {
      isValid: () => points.length > 0,
      getAnswer: () => ({ points: points.map((point) => ({ ...point })) })
    };
  }

  function renderQuestion() {
    const question = state.attempt.currentQuestion;
    state.controller = null;
    state.skipConfirmQuestionId = "";
    elements.questionBody.innerHTML = "";
    hideMessage(elements.taskMessage);
    if (!question) {
      elements.questionTitle.textContent = "Маршрут завершен";
      elements.questionNote.textContent = "";
      return;
    }

    elements.moduleCode.textContent = question.moduleCode || question.tourCode || "";
    elements.questionTitle.textContent = question.prompt;
    elements.questionPoints.textContent = `${question.maxScore || 0} баллов`;
    elements.questionNote.textContent = question.note || "";
    appendTaskGuide(question);

    if (question.type === "situation") {
      state.controller = renderSituation(question);
    } else if (question.type === "single_choice" || question.type === "multiple_choice") {
      state.controller = renderChoice(question);
    } else if (question.type === "sequence_drag") {
      state.controller = renderSequence(question);
    } else if (question.type === "bucket_sort") {
      state.controller = renderBucket(question);
    } else if (question.type === "calculation_task") {
      state.controller = renderCalculation(question);
    } else if (question.type === "voice_response") {
      state.controller = renderVoice(question);
    } else if (question.type === "hotspot_scene") {
      state.controller = renderHotspot(question);
    } else {
      const fallback = document.createElement("p");
      fallback.textContent = "Тип задания пока не поддержан.";
      elements.questionBody.appendChild(fallback);
      state.controller = {
        isValid: () => false,
        getAnswer: () => ({})
      };
    }

    elements.submitAnswer.textContent =
      state.attempt.progress.currentQuestionIndex >= state.attempt.progress.totalQuestions
        ? "Ответить и завершить"
        : "Ответить и далее";
  }

  function resetWorkspaceScroll() {
    window.requestAnimationFrame(() => {
      if (window.matchMedia("(max-width: 760px)").matches) {
        const taskPanel = elements.workspaceScreen.querySelector(".task-panel");
        if (taskPanel) {
          taskPanel.scrollIntoView({ block: "start", behavior: "auto" });
          return;
        }
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }

  function renderAttempt(attempt) {
    state.attempt = attempt;
    state.mode = attempt.mode || "exam";
    rememberResumeAttempt(attempt);
    refreshTopbar();

    if (attempt.status !== "in_progress") {
      renderResult();
      return;
    }

    setScreens("workspace");
    elements.participantName.textContent = attempt.participant.fullName;
    elements.participantMeta.textContent = `${attempt.participant.groupName} · ${attempt.participant.institution}`;
    renderModuleRail();
    renderFeedback();
    renderReferencePanel();
    renderQuestion();
    resetWorkspaceScroll();
    refreshTimer();
  }

  function renderResult() {
    setScreens("result");
    const summary = state.attempt.summary;
    const pending = Number(summary.pendingManualReviews || 0);
    elements.resultTitle.textContent = pending
      ? "Ожидается проверка голосового ответа"
      : `Оценка ${summary.grade}`;
    elements.resultSubtitle.textContent = pending
      ? `Автоматическая часть сохранена. После ручной проверки будет обновлен итоговый балл. Сейчас: ${summary.totalFinalScore} из ${summary.totalMaxScore}.`
      : `Итоговый балл: ${summary.totalFinalScore} из ${summary.totalMaxScore}.`;
    elements.resultModules.innerHTML = "";
    (summary.moduleScores || []).forEach((module) => {
      const node = document.createElement("article");
      node.className = "result-module";
      const title = document.createElement("strong");
      title.textContent = `${module.code} ${module.title}`;
      const score = document.createElement("span");
      score.textContent = `${module.finalScore} / ${module.maxScore}`;
      const bar = document.createElement("div");
      bar.className = "score-mini-bar";
      const fill = document.createElement("span");
      fill.style.width = module.maxScore
        ? `${Math.max(0, Math.min(100, Math.round((Number(module.finalScore || 0) / Number(module.maxScore || 1)) * 100)))}%`
        : "0%";
      bar.appendChild(fill);
      const detail = document.createElement("small");
      detail.textContent = module.pendingManualReviews
        ? `${module.pendingManualReviews} ответ ожидает проверки`
        : `ответов ${module.answered}/${module.questionCount}`;
      node.append(title, score, bar, detail);
      elements.resultModules.appendChild(node);
    });
    refreshTopbar();
  }

  async function loadAttempt(attemptId) {
    const attempt = await api(`/api/pm01/public/attempts/${encodeURIComponent(attemptId)}`);
    renderAttempt(attempt);
  }

  async function resumeStoredAttemptIfConfirmed() {
    const record = readResumeRecord();
    if (!record?.attemptId) {
      return;
    }

    const label = [record.participantName, record.groupName].filter(Boolean).join(", ");
    const shouldResume = window.confirm(
      label
        ? `Найдена незавершенная попытка: ${label}. Продолжить с места остановки?`
        : "Найдена незавершенная попытка. Продолжить с места остановки?"
    );
    if (!shouldResume) {
      clearResumeRecord(record.attemptId);
      return;
    }

    setSaveStatus("восстановление...");
    try {
      const attempt = await api(`/api/pm01/public/attempts/${encodeURIComponent(record.attemptId)}`);
      if (attempt.status === "in_progress") {
        renderAttempt(attempt);
        setSaveStatus("продолжено");
      } else {
        clearResumeRecord(record.attemptId);
      }
    } catch (_) {
      clearResumeRecord(record.attemptId);
      setSaveStatus("ожидание");
    }
  }

  async function jumpToModule(moduleId) {
    if (!state.attempt || state.attempt.mode !== "training") {
      return;
    }

    hideMessage(elements.taskMessage);
    setSaveStatus("перехожу...");
    try {
      const attempt = await api(`/api/pm01/public/attempts/${encodeURIComponent(state.attempt.id)}/jump`, {
        method: "POST",
        body: JSON.stringify({ moduleId })
      });
      renderAttempt(attempt);
      setSaveStatus("готово");
    } catch (error) {
      setSaveStatus("ошибка");
      showMessage(elements.taskMessage, error.message, "error");
    }
  }

  async function startAttempt(event) {
    event.preventDefault();
    hideMessage(elements.entryMessage);
    elements.startButton.disabled = true;
    setSaveStatus("запуск...");
    try {
      const attempt = await api("/api/pm01/public/attempts/start", {
        method: "POST",
        body: JSON.stringify({
          participant: participantPayload(),
          variantId: state.mode === "training" ? state.selectedVariantId : "",
          ticketId: state.mode === "training" ? state.selectedTicketId : "",
          mode: state.mode
        })
      });
      renderAttempt(attempt);
    } catch (error) {
      setSaveStatus("ошибка");
      showMessage(elements.entryMessage, error.message, "error");
    } finally {
      elements.startButton.disabled = false;
    }
  }

  async function submitAnswer() {
    hideMessage(elements.taskMessage);
    if (!state.attempt || !state.controller) {
      return;
    }
    const currentQuestion = state.attempt.currentQuestion;
    const answerIsValid = state.controller.isValid();
    if (!answerIsValid) {
      if ((state.attempt.mode || "exam") === "exam" && currentQuestion) {
        if (state.skipConfirmQuestionId !== currentQuestion.id) {
          state.skipConfirmQuestionId = currentQuestion.id;
          elements.submitAnswer.textContent = "Пропустить с 0 баллов";
          showMessage(
            elements.taskMessage,
            "Ответ не заполнен. Нажмите еще раз, чтобы пропустить это задание с 0 баллов и идти дальше.",
            "warning"
          );
          return;
        }
      } else {
        showMessage(elements.taskMessage, "Заполните ответ перед переходом дальше.", "error");
        return;
      }
    } else {
      state.skipConfirmQuestionId = "";
    }

    let answerPayload = {};
    try {
      answerPayload = state.controller.getAnswer();
    } catch (_) {
      answerPayload = {};
    }
    if (!answerIsValid) {
      answerPayload = { ...answerPayload, skipped: true };
    }
    if (!currentQuestion) {
      return;
    }
    elements.submitAnswer.disabled = true;
    setSaveStatus("сохраняю...");
    try {
      const attempt = await api(`/api/pm01/public/attempts/${encodeURIComponent(state.attempt.id)}/answer`, {
        method: "POST",
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answerPayload
        })
      });
      renderAttempt(attempt);
    } catch (error) {
      setSaveStatus("ошибка");
      showMessage(elements.taskMessage, error.message, "error");
    } finally {
      elements.submitAnswer.disabled = false;
    }
  }

  async function skipQuestion() {
    hideMessage(elements.taskMessage);
    if (!state.attempt || !state.attempt.currentQuestion) {
      return;
    }
    const currentQuestion = state.attempt.currentQuestion;
    const confirmed = window.confirm(
      "Пропустить это задание и перейти дальше? За него будет выставлено 0 баллов."
    );
    if (!confirmed) {
      return;
    }
    elements.skipQuestion.disabled = true;
    setSaveStatus("пропускаю...");
    try {
      const attempt = await api(`/api/pm01/public/attempts/${encodeURIComponent(state.attempt.id)}/answer`, {
        method: "POST",
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answerPayload: { skipped: true }
        })
      });
      renderAttempt(attempt);
    } catch (error) {
      setSaveStatus("ошибка");
      showMessage(elements.taskMessage, error.message, "error");
    } finally {
      elements.skipQuestion.disabled = false;
    }
  }

  async function finishAttempt() {
    if (!state.attempt) {
      return;
    }
    const confirmed = window.confirm(
      "Завершить весь экзамен сейчас? Вернуться к следующим заданиям после этого будет нельзя."
    );
    if (!confirmed) {
      return;
    }
    elements.finishAttempt.disabled = true;
    setSaveStatus("завершение...");
    try {
      const attempt = await api(`/api/pm01/public/attempts/${encodeURIComponent(state.attempt.id)}/finish`, {
        method: "POST",
        body: JSON.stringify({})
      });
      renderAttempt(attempt);
    } catch (error) {
      setSaveStatus("ошибка");
      showMessage(elements.taskMessage, error.message, "error");
    } finally {
      elements.finishAttempt.disabled = false;
    }
  }

  async function init() {
    setTeacherName();
    renderStudentSelect();
    try {
      state.exam = await api("/api/pm01/public/exam");
      state.selectedVariantId = state.exam.variants?.[0]?.id || "";
      state.selectedTicketId = "";
      elements.examTitle.textContent = state.exam.title;
      if (elements.programTitle) {
        elements.programTitle.textContent = state.exam.programTitle || state.exam.subtitle;
      }
      elements.examDescription.textContent = state.exam.description;
      if (elements.courseList) {
        elements.courseList.textContent = (state.exam.interdisciplinaryCourses || [])
          .map((course) => `${course.code}: ${course.title}`)
          .join(" · ");
      }
      if (elements.developerName) {
        elements.developerName.textContent = state.exam.developer || "Преподаватель Постовит Дмитрий Александрович";
      }
      renderModulePreview();
      renderVariants();
      renderTickets();
      refreshTopbar();
      await resumeStoredAttemptIfConfirmed();
    } catch (error) {
      showMessage(elements.entryMessage, error.message, "error");
    }
  }

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });
  if (elements.ticketSelect) {
    elements.ticketSelect.addEventListener("change", () => {
      state.selectedTicketId = elements.ticketSelect.value;
      renderTicketPreview();
    });
  }
  if (elements.groupName) {
    elements.groupName.addEventListener("change", renderStudentSelect);
  }
  if (elements.studentSelect) {
    elements.studentSelect.addEventListener("change", syncFreeNameField);
  }
  elements.startForm.addEventListener("submit", startAttempt);
  elements.submitAnswer.addEventListener("click", submitAnswer);
  elements.skipQuestion.addEventListener("click", skipQuestion);
  elements.finishAttempt.addEventListener("click", finishAttempt);
  setMode("exam");
  init();
})();
