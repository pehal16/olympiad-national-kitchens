(function () {
  const state = {
    summary: null,
    controls: null,
    attempts: [],
    selectedAttemptId: "",
    filters: {
      search: "",
      variant: "",
      group: "",
      status: "",
      mode: "",
      pendingOnly: false
    }
  };

  const elements = {
    loginPanel: document.getElementById("login-panel"),
    loginForm: document.getElementById("login-form"),
    password: document.getElementById("admin-password"),
    loginMessage: document.getElementById("login-message"),
    adminPanel: document.getElementById("admin-panel"),
    adminRefreshed: document.getElementById("admin-refreshed"),
    adminBackend: document.getElementById("admin-backend"),
    adminMessage: document.getElementById("admin-message"),
    adminStats: document.getElementById("admin-stats"),
    gradeOverview: document.getElementById("grade-overview"),
    moduleOverview: document.getElementById("module-overview"),
    teacherControlsForm: document.getElementById("teacher-controls-form"),
    controlExamEnabled: document.getElementById("control-exam-enabled"),
    controlFreeRepeat: document.getElementById("control-free-repeat"),
    controlDefaultAttempts: document.getElementById("control-default-attempts"),
    saveTeacherControls: document.getElementById("save-teacher-controls"),
    teacherControlsStatus: document.getElementById("teacher-controls-status"),
    filteredSummary: document.getElementById("filtered-summary"),
    attemptsBody: document.getElementById("attempts-body"),
    detailPanel: document.getElementById("detail-panel"),
    filterSearch: document.getElementById("filter-search"),
    filterVariant: document.getElementById("filter-variant"),
    filterGroup: document.getElementById("filter-group"),
    filterStatus: document.getElementById("filter-status"),
    filterMode: document.getElementById("filter-mode"),
    filterPending: document.getElementById("filter-pending"),
    filterReset: document.getElementById("filter-reset"),
    refreshAdmin: document.getElementById("refresh-admin"),
    exportCsv: document.getElementById("export-csv"),
    exportJson: document.getElementById("export-json")
  };

  function showMessage(element, message, type = "success") {
    element.textContent = message;
    element.className = `message ${type}`;
  }

  function hideMessage(element) {
    element.textContent = "";
    element.className = "message hidden";
  }

  function createNode(tagName, className = "", text = "") {
    const node = document.createElement(tagName);
    if (className) {
      node.className = className;
    }
    if (text !== "") {
      node.textContent = text;
    }
    return node;
  }

  function appendText(parent, tagName, className, text) {
    const node = createNode(tagName, className, text);
    parent.appendChild(node);
    return node;
  }

  function clampPercent(value) {
    const number = Number(value || 0);
    if (!Number.isFinite(number)) {
      return 0;
    }
    return Math.max(0, Math.min(100, number));
  }

  function percent(value, max) {
    const numericMax = Number(max || 0);
    if (!numericMax) {
      return 0;
    }
    return clampPercent((Number(value || 0) / numericMax) * 100);
  }

  function formatScoreNumber(value) {
    const number = Number(value || 0);
    if (!Number.isFinite(number)) {
      return "0";
    }
    const rounded = Math.round(number * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
  }

  function formatPercent(value) {
    return `${Math.round(clampPercent(value))}%`;
  }

  function getTotalMaxScore() {
    return Number(state.summary?.exam?.scoring?.totalMaxScore || 100);
  }

  function formatDateTime(value) {
    if (!value) {
      return "—";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "—";
    }
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatDuration(ms) {
    const seconds = Math.max(0, Math.round(Number(ms || 0) / 1000));
    if (!seconds) {
      return "—";
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const tail = seconds % 60;
    if (hours) {
      return `${hours} ч ${minutes} мин`;
    }
    return minutes ? `${minutes} мин ${tail} с` : `${tail} с`;
  }

  function statusLabel(status) {
    const labels = {
      in_progress: "в работе",
      pending_review: "проверка",
      reviewed: "проверено",
      expired: "истекло"
    };
    return labels[status] || status || "—";
  }

  function statusCaption(status) {
    const labels = {
      in_progress: "студент еще проходит экзамен",
      pending_review: "нужно проверить голосовой ответ",
      reviewed: "итог можно считать закрытым",
      expired: "время попытки истекло"
    };
    return labels[status] || "статус попытки";
  }

  function modeLabel(mode) {
    return mode === "training" ? "тренировка" : "экзамен";
  }

  function questionTypeLabel(type) {
    const labels = {
      single_choice: "один вариант",
      multiple_choice: "несколько вариантов",
      sequence_drag: "последовательность",
      bucket_sort: "распределение",
      calculation_task: "расчет",
      voice_response: "голос",
      hotspot_scene: "симуляция"
    };
    return labels[type] || type || "задание";
  }

  function uniqueValues(values) {
    return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
      left.localeCompare(right, "ru")
    );
  }

  function sum(values) {
    return values.reduce((total, value) => total + Number(value || 0), 0);
  }

  function completedAttempts(attempts = state.attempts) {
    return attempts.filter((attempt) => attempt.status !== "in_progress");
  }

  function averageScore(attempts = state.attempts) {
    const completed = completedAttempts(attempts);
    if (!completed.length) {
      return 0;
    }
    return sum(completed.map((attempt) => attempt.totalFinalScore)) / completed.length;
  }

  function getControls() {
    return state.controls || state.summary?.controls || {
      examEnabled: true,
      freeRepeatEnabled: true,
      defaultAttempts: 1,
      grants: {},
      participants: []
    };
  }

  function participantAccess(signature) {
    const controls = getControls();
    const key = String(signature || "").trim();
    return (controls.participants || []).find((item) => item.participantSignature === key) || {
      participantSignature: key,
      completedAttempts: 0,
      activeAttempts: 0,
      totalAttempts: 0,
      extraAttempts: Number(controls.grants?.[key]?.extraAttempts || 0),
      allowedAttempts: controls.freeRepeatEnabled ? null : Number(controls.defaultAttempts || 1),
      remainingAttempts: controls.freeRepeatEnabled ? null : Number(controls.defaultAttempts || 1)
    };
  }

  function answeredTotals(detail) {
    return (detail.modules || []).reduce(
      (totals, module) => {
        const score = module.score || {};
        totals.answered += Number(score.answered || 0);
        totals.questions += Number(score.questionCount || module.questionCount || 0);
        totals.pending += Number(score.pendingManualReviews || 0);
        return totals;
      },
      { answered: 0, questions: 0, pending: 0 }
    );
  }

  function moduleScoreData(attempt, code) {
    return (attempt.moduleScores || []).find((item) => item.code === code) || null;
  }

  function optionText(question, optionId) {
    const option = (question.options || []).find((item) => item.id === optionId);
    return option?.text || optionId;
  }

  function itemText(question, itemId) {
    const item = (question.items || []).find((entry) => entry.id === itemId);
    return item?.text || item?.label || item?.title || itemId;
  }

  function bucketText(question, bucketId) {
    const bucket = (question.buckets || []).find((entry) => entry.id === bucketId);
    return bucket?.label || bucket?.title || bucket?.text || bucketId;
  }

  function createScoreBar(value, max, className = "") {
    const bar = createNode("div", `score-mini-bar ${className}`.trim());
    const fill = document.createElement("span");
    fill.style.width = `${percent(value, max)}%`;
    bar.appendChild(fill);
    return bar;
  }

  function createStatusPill(status, text = "") {
    const pill = createNode("span", `status-pill ${status || ""}`.trim());
    pill.textContent = text || statusLabel(status);
    return pill;
  }

  function createModePill(mode) {
    return createStatusPill(`mode-${mode || "exam"}`, modeLabel(mode));
  }

  function createCell(text = "", className = "") {
    return createNode("td", className, text);
  }

  function createParticipantCell(attempt) {
    const cell = createCell("", "attempt-student-cell");
    appendText(cell, "strong", "", attempt.fullName || "Без имени");
    const meta = createNode("span", "attempt-student-meta");
    meta.textContent = [attempt.groupName, attempt.institution, attempt.mentorName]
      .filter(Boolean)
      .join(" · ") || "данные участника не заполнены";
    cell.appendChild(meta);
    return cell;
  }

  function createVariantCell(attempt) {
    const cell = createCell("", "attempt-variant-cell");
    appendText(cell, "strong", "", attempt.variantTitle || "—");
    if (attempt.variantNumber) {
      appendText(cell, "span", "", `вариант ${attempt.variantNumber}`);
    }
    return cell;
  }

  function createTicketCell(attempt) {
    const cell = createCell("", "attempt-ticket-cell");
    if (!attempt.ticketNumber) {
      cell.textContent = "—";
      return cell;
    }
    appendText(cell, "strong", "", `№ ${attempt.ticketNumber}`);
    appendText(cell, "span", "", attempt.ticketProduct || "комплексное задание");
    return cell;
  }

  function createAttemptScoreCell(attempt) {
    const maxScore = getTotalMaxScore();
    const cell = createCell("", "attempt-total-cell");
    const top = createNode("div", "attempt-total-main");
    appendText(top, "strong", "", `${formatScoreNumber(attempt.totalFinalScore)} / ${maxScore}`);
    const gradeText = attempt.grade
      ? `${attempt.status === "in_progress" ? "примерно" : "оценка"} ${attempt.grade}`
      : "оценка после завершения";
    appendText(top, "span", "", gradeText);
    cell.append(top, createScoreBar(attempt.totalFinalScore, maxScore, "total"));
    return cell;
  }

  function createModuleScoreCell(attempt, code) {
    const cell = createCell("", "module-score-cell");
    const module = moduleScoreData(attempt, code);
    if (!module) {
      cell.textContent = "—";
      return cell;
    }

    const chip = createNode("div", "module-score-chip");
    const value = Number(module.finalScore || 0);
    const maxScore = Number(module.maxScore || 0);
    const answered = Number(module.answered || 0);
    const count = Number(module.questionCount || 0);
    const pending = Number(module.pendingManualReviews || 0);

    appendText(chip, "strong", "", maxScore ? `${formatScoreNumber(value)} / ${maxScore}` : "ситуация");
    appendText(chip, "span", "", count ? `${answered} из ${count} ответов` : "без баллов");
    if (maxScore) {
      chip.appendChild(createScoreBar(value, maxScore, "module"));
    }
    if (pending) {
      appendText(chip, "em", "", `${pending} проверить`);
    }
    cell.appendChild(chip);
    return cell;
  }

  function createPendingCell(attempt) {
    const pending = Number(attempt.pendingManualReviews || 0);
    const cell = createCell("", "pending-cell");
    if (pending) {
      cell.appendChild(createStatusPill("pending_review", `${pending} на проверке`));
    } else {
      cell.textContent = "—";
    }
    return cell;
  }

  function setSelectOptions(select, values, allLabel, labelMap = {}) {
    const current = select.value;
    select.innerHTML = "";
    const all = document.createElement("option");
    all.value = "";
    all.textContent = allLabel;
    select.appendChild(all);

    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = labelMap[value] || value;
      select.appendChild(option);
    });
    select.value = values.includes(current) ? current : "";
  }

  function renderFilterOptions() {
    const examVariants = state.summary?.exam?.variants || [];
    setSelectOptions(
      elements.filterVariant,
      examVariants.map((variant) => variant.id),
      "Все варианты",
      Object.fromEntries(
        examVariants.map((variant) => [
          variant.id,
          `Вариант ${variant.number}: ${variant.shortTitle || variant.title}`
        ])
      )
    );
    setSelectOptions(elements.filterGroup, uniqueValues(state.attempts.map((attempt) => attempt.groupName)), "Все группы");
    setSelectOptions(
      elements.filterStatus,
      uniqueValues(state.attempts.map((attempt) => attempt.status)),
      "Все статусы",
      {
        in_progress: "В работе",
        pending_review: "Ожидает проверки",
        reviewed: "Проверено",
        expired: "Истекло"
      }
    );
    state.filters.variant = elements.filterVariant.value;
    state.filters.group = elements.filterGroup.value;
    state.filters.status = elements.filterStatus.value;
  }

  function applyFilters() {
    const search = state.filters.search.trim().toLowerCase();
    return state.attempts.filter((attempt) => {
      if (state.filters.variant && attempt.selectedVariantId !== state.filters.variant) {
        return false;
      }
      if (state.filters.group && attempt.groupName !== state.filters.group) {
        return false;
      }
      if (state.filters.status && attempt.status !== state.filters.status) {
        return false;
      }
      if (state.filters.mode && attempt.mode !== state.filters.mode) {
        return false;
      }
      if (state.filters.pendingOnly && !Number(attempt.pendingManualReviews || 0)) {
        return false;
      }
      if (!search) {
        return true;
      }

      const haystack = [
        attempt.fullName,
        attempt.groupName,
        attempt.institution,
        attempt.mentorName,
        attempt.variantTitle,
        attempt.ticketProduct,
        attempt.clientIp,
        statusLabel(attempt.status)
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  async function adminApi(path, options = {}) {
    let response;
    try {
      response = await fetch(path, {
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

  function renderStatCard(label, value, caption, tone = "") {
    const card = createNode("article", `admin-stat ${tone}`.trim());
    appendText(card, "span", "", label);
    appendText(card, "strong", "", value);
    if (caption) {
      appendText(card, "small", "", caption);
    }
    elements.adminStats.appendChild(card);
  }

  function renderDistributionCard(title, items, total, emptyText) {
    const card = createNode("article", "distribution-card");
    appendText(card, "h3", "", title);

    if (!items.length || !total) {
      appendText(card, "p", "distribution-empty", emptyText);
      return card;
    }

    items.forEach((item) => {
      const row = createNode("div", "distribution-row");
      const label = createNode("span", "", item.label);
      const value = createNode("strong", "", String(item.count));
      const bar = createScoreBar(item.count, total, item.tone || "");
      row.append(label, value, bar);
      card.appendChild(row);
    });
    return card;
  }

  function renderGradeOverview() {
    elements.gradeOverview.innerHTML = "";

    const completed = completedAttempts();
    const gradeItems = (state.summary?.gradeDistribution || [])
      .map((item) => ({
        label: `Оценка ${item.grade}`,
        count: Number(item.count || 0),
        tone: Number(item.grade) >= 4 ? "success" : Number(item.grade) === 3 ? "warning" : "danger"
      }))
      .sort((left, right) => Number(right.label.replace(/\D/g, "")) - Number(left.label.replace(/\D/g, "")));

    const statuses = ["reviewed", "pending_review", "in_progress", "expired"]
      .map((status) => ({
        label: statusLabel(status),
        count: state.attempts.filter((attempt) => attempt.status === status).length,
        tone: status === "reviewed" ? "success" : status === "pending_review" ? "warning" : ""
      }))
      .filter((item) => item.count > 0);

    elements.gradeOverview.append(
      renderDistributionCard("Оценки", gradeItems, completed.length, "Завершенных попыток пока нет."),
      renderDistributionCard("Статусы", statuses, state.attempts.length, "Попыток пока нет.")
    );
  }

  function renderModuleOverview() {
    elements.moduleOverview.innerHTML = "";
    const modules = state.summary?.moduleAnalytics || [];

    if (!modules.length) {
      const empty = createNode("article", "module-overview-card");
      appendText(empty, "strong", "", "Модули не загружены");
      appendText(empty, "span", "", "Обновите кабинет преподавателя.");
      elements.moduleOverview.appendChild(empty);
      return;
    }

    modules.forEach((module) => {
      const card = createNode("article", "module-overview-card");
      const head = createNode("div", "module-overview-head");
      appendText(head, "strong", "", module.code || "Модуль");
      appendText(head, "span", "", module.title || "");
      card.appendChild(head);

      const maxScore = Number(module.maxScore || 0);
      if (maxScore) {
        appendText(
          card,
          "b",
          "",
          `${formatScoreNumber(module.averageScore)} / ${maxScore}`
        );
        card.appendChild(createScoreBar(module.averageScore, maxScore, "module"));
        appendText(card, "small", "", `средний балл по ${module.attempts || 0} завершенным попыткам`);
      } else {
        appendText(card, "b", "", "без баллов");
        appendText(card, "small", "", `ситуация выдана в ${module.attempts || 0} завершенных попытках`);
      }

      if (Number(module.pendingManualReviews || 0)) {
        const warning = createStatusPill("pending_review", `${module.pendingManualReviews} голосовых ответа`);
        card.appendChild(warning);
      }
      elements.moduleOverview.appendChild(card);
    });
  }

  function renderTeacherControls() {
    const controls = getControls();
    elements.controlExamEnabled.checked = controls.examEnabled !== false;
    elements.controlFreeRepeat.checked = controls.freeRepeatEnabled !== false;
    elements.controlDefaultAttempts.value = String(controls.defaultAttempts || 1);

    elements.teacherControlsStatus.innerHTML = "";
    const status = [
      controls.examEnabled !== false ? "Экзамен открыт" : "Экзамен закрыт",
      controls.freeRepeatEnabled !== false
        ? "повторы разрешены всем"
        : `лимит ${controls.defaultAttempts || 1} + допуски преподавателя`,
      `допусков выдано: ${Object.values(controls.grants || {}).filter((grant) => Number(grant.extraAttempts || 0) > 0).length}`
    ];
    status.forEach((text) => appendText(elements.teacherControlsStatus, "span", "", text));
  }

  async function saveTeacherControls(event) {
    event.preventDefault();
    hideMessage(elements.adminMessage);
    elements.saveTeacherControls.disabled = true;
    try {
      const controls = await adminApi("/api/admin/pm01/controls", {
        method: "POST",
        body: JSON.stringify({
          examEnabled: elements.controlExamEnabled.checked,
          freeRepeatEnabled: elements.controlFreeRepeat.checked,
          defaultAttempts: Number(elements.controlDefaultAttempts.value || 1)
        })
      });
      state.controls = controls;
      if (state.summary) {
        state.summary.controls = controls;
      }
      renderTeacherControls();
      renderAttempts();
      showMessage(elements.adminMessage, "Настройки допуска сохранены.", "success");
    } catch (error) {
      showMessage(elements.adminMessage, error.message, "error");
    } finally {
      elements.saveTeacherControls.disabled = false;
    }
  }

  function renderStats() {
    elements.adminStats.innerHTML = "";
    const counts = state.summary?.counts || {};
    const totalAttempts = Number(counts.attempts || 0);
    const completedCount = Number(counts.completed || 0);
    const reviewedCount = Number(counts.reviewed || 0);
    const pendingQuestions = Number(state.summary?.pendingVoice?.length || 0);
    const avg = averageScore();
    const maxScore = getTotalMaxScore();

    renderStatCard(
      "Участники",
      String(counts.participants || 0),
      `${counts.groups || 0} групп · ${counts.institutions || 0} учреждений`
    );
    renderStatCard(
      "Попытки",
      String(totalAttempts),
      `${counts.activeAttempts || 0} сейчас в работе`
    );
    renderStatCard(
      "Завершено",
      String(completedCount),
      totalAttempts ? `${formatPercent((completedCount / totalAttempts) * 100)} от всех попыток` : "ждем первые ответы"
    );
    renderStatCard(
      "Средний балл",
      completedCount ? `${formatScoreNumber(avg)} / ${maxScore}` : "—",
      completedCount ? `${formatPercent(percent(avg, maxScore))} по завершенным` : "появится после завершения",
      "accent-blue"
    );
    renderStatCard(
      "Ожидает проверки",
      String(counts.pendingReview || 0),
      pendingQuestions ? `${pendingQuestions} голосовых ответов` : "ручных проверок нет",
      pendingQuestions ? "accent-orange" : ""
    );
    renderStatCard(
      "Проверено",
      String(reviewedCount),
      completedCount ? `${formatPercent((reviewedCount / completedCount) * 100)} от завершенных` : "итоги еще не закрыты",
      "accent-green"
    );

    renderGradeOverview();
    renderModuleOverview();
    elements.adminBackend.textContent = state.summary?.capabilities?.storageBackend || "file";
    elements.adminRefreshed.textContent = formatDateTime(state.summary?.diagnostics?.refreshedAt);
  }

  function renderFilteredSummary(attempts) {
    elements.filteredSummary.innerHTML = "";
    const chips = [
      `Показано: ${attempts.length} из ${state.attempts.length}`,
      `Средний балл: ${
        completedAttempts(attempts).length
          ? `${formatScoreNumber(averageScore(attempts))} / ${getTotalMaxScore()}`
          : "—"
      }`,
      `В работе: ${attempts.filter((attempt) => attempt.status === "in_progress").length}`,
      `На проверке: ${attempts.filter((attempt) => Number(attempt.pendingManualReviews || 0)).length}`
    ];
    chips.forEach((text) => appendText(elements.filteredSummary, "span", "", text));
  }

  function renderAttempts() {
    elements.attemptsBody.innerHTML = "";
    const attempts = applyFilters();
    renderFilteredSummary(attempts);

    if (!attempts.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 13;
      cell.className = "table-empty";
      cell.textContent = state.attempts.length
        ? "По выбранным фильтрам попыток нет. Сбросьте фильтры или измените поиск."
        : "Пока нет попыток ПМ.01. Когда студенты начнут экзамен, результаты появятся здесь.";
      row.appendChild(cell);
      elements.attemptsBody.appendChild(row);
      return;
    }

    attempts.forEach((attempt) => {
      const row = document.createElement("tr");
      row.dataset.attemptId = attempt.id;
      if (attempt.id === state.selectedAttemptId) {
        row.classList.add("is-selected");
      }

      const modeCell = createCell("", "mode-cell");
      modeCell.appendChild(createModePill(attempt.mode));
      const statusCell = createCell("", "status-cell");
      statusCell.appendChild(createStatusPill(attempt.status));

      row.append(
        createParticipantCell(attempt),
        createVariantCell(attempt),
        createTicketCell(attempt),
        modeCell,
        statusCell,
        createAttemptScoreCell(attempt),
        createModuleScoreCell(attempt, "M0"),
        createModuleScoreCell(attempt, "M1"),
        createModuleScoreCell(attempt, "M2"),
        createModuleScoreCell(attempt, "M3"),
        createModuleScoreCell(attempt, "M4"),
        createPendingCell(attempt),
        createCell(attempt.clientIp || "—", "ip-cell")
      );
      row.addEventListener("click", () => selectAttempt(attempt.id));
      elements.attemptsBody.appendChild(row);
    });
  }

  function renderAdmin() {
    elements.loginPanel.classList.add("hidden");
    elements.adminPanel.classList.remove("hidden");
    renderStats();
    renderTeacherControls();
    renderFilterOptions();
    renderAttempts();
  }

  function appendMeta(parent, label, value) {
    const item = document.createElement("span");
    item.textContent = `${label}: ${value}`;
    parent.appendChild(item);
  }

  function answerPayloadText(answer) {
    if (!answer) {
      return "Ответ не отправлен.";
    }
    const payload = { ...(answer.answerPayload || {}) };
    if (payload.audioDataUrl) {
      payload.audioDataUrl = "audio-data-url";
    }
    return JSON.stringify(payload, null, 2);
  }

  function answerBrief(question) {
    const answer = question.answer;
    const payload = answer?.answerPayload || {};
    if (!answer) {
      return "Ответ не отправлен.";
    }
    if (payload.skipped) {
      return "Задание пропущено студентом.";
    }
    if (payload.selectedOptionId) {
      return optionText(question, payload.selectedOptionId);
    }
    if (Array.isArray(payload.selectedOptionIds)) {
      return payload.selectedOptionIds.map((id) => optionText(question, id)).join("; ") || "Варианты не выбраны.";
    }
    if (Array.isArray(payload.sequence)) {
      return payload.sequence.map((id, index) => `${index + 1}. ${itemText(question, id)}`).join("; ");
    }
    if (payload.buckets && typeof payload.buckets === "object") {
      return Object.entries(payload.buckets)
        .map(([itemId, bucketId]) => `${itemText(question, itemId)} -> ${bucketText(question, bucketId)}`)
        .join("; ") || "Карточки не распределены.";
    }
    if (payload.values && typeof payload.values === "object") {
      return (question.fields || [])
        .map((field) => `${field.label}: ${payload.values[field.id] ?? "—"}`)
        .join("; ") || "Расчетные поля не заполнены.";
    }
    if (Array.isArray(payload.points)) {
      return `Отмечено зон: ${payload.points.length}.`;
    }
    if (payload.audioDataUrl || payload.audioName || payload.transcriptNote) {
      const parts = [];
      if (payload.audioDataUrl || payload.audioName) {
        parts.push("аудио прикреплено");
      }
      if (payload.transcriptNote) {
        parts.push(`заметка: ${payload.transcriptNote}`);
      }
      return parts.join("; ");
    }
    return "Ответ сохранен, подробности раскрываются ниже.";
  }

  function questionResultClass(question) {
    const answer = question.answer;
    if (!answer) {
      return "is-empty";
    }
    if (answer.manualStatus === "pending_review") {
      return "is-pending";
    }
    const score = Number(answer.finalScore || 0);
    const maxScore = Number(question.maxScore || 0);
    if (maxScore && score >= maxScore) {
      return "is-correct";
    }
    if (score > 0) {
      return "is-partial";
    }
    return "is-zero";
  }

  function questionResultLabel(question) {
    const answer = question.answer;
    if (!answer) {
      return "без ответа";
    }
    if (answer.manualStatus === "pending_review") {
      return "ручная проверка";
    }
    const score = Number(answer.finalScore || 0);
    const maxScore = Number(question.maxScore || 0);
    if (maxScore && score >= maxScore) {
      return "зачтено";
    }
    if (score > 0) {
      return "частично";
    }
    return "0 баллов";
  }

  function renderVoiceReview(detail, question, container) {
    const answer = question.answer;
    const box = document.createElement("div");
    box.className = "audio-box";

    if (answer?.answerPayload?.audioDataUrl) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = answer.answerPayload.audioDataUrl;
      box.appendChild(audio);
    } else {
      const empty = document.createElement("p");
      empty.textContent = "Аудиозапись не прикреплена.";
      box.appendChild(empty);
    }

    if (answer?.answerPayload?.transcriptNote) {
      const note = document.createElement("p");
      note.textContent = answer.answerPayload.transcriptNote;
      box.appendChild(note);
    }

    const form = document.createElement("form");
    form.className = "voice-review-form";
    const scores = answer?.manualReview?.scores || {};
    (question.rubric || []).forEach((criterion) => {
      const label = document.createElement("label");
      label.className = "rubric-row";
      const text = document.createElement("span");
      text.textContent = criterion.label;
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = String(criterion.maxScore || 5);
      input.step = "1";
      input.value = scores[criterion.id] ?? "0";
      input.dataset.criterionId = criterion.id;
      label.append(text, input);
      form.appendChild(label);
    });

    const comment = document.createElement("textarea");
    comment.placeholder = "Комментарий преподавателя";
    comment.value = answer?.manualReview?.comment || "";
    form.appendChild(comment);

    const save = document.createElement("button");
    save.type = "submit";
    save.className = "button primary";
    save.textContent = "Сохранить проверку";
    form.appendChild(save);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const reviewScores = {};
      form.querySelectorAll("[data-criterion-id]").forEach((input) => {
        reviewScores[input.dataset.criterionId] = Number(input.value || 0);
      });
      save.disabled = true;
      try {
        const updated = await adminApi(
          `/api/admin/pm01/attempts/${encodeURIComponent(detail.attempt.id)}/voice/${encodeURIComponent(question.id)}/review`,
          {
            method: "POST",
            body: JSON.stringify({
              scores: reviewScores,
              comment: comment.value.trim()
            })
          }
        );
        await loadAdmin();
        renderDetail(updated);
        showMessage(elements.adminMessage, "Проверка сохранена.", "success");
      } catch (error) {
        showMessage(elements.adminMessage, error.message, "error");
      } finally {
        save.disabled = false;
      }
    });

    box.appendChild(form);
    container.appendChild(box);
  }

  function renderQuestionDetail(detail, question, moduleNode) {
    const node = document.createElement("article");
    node.className = `admin-question ${questionResultClass(question)}`;

    const head = createNode("div", "admin-question-head");
    const title = document.createElement("h4");
    title.textContent = question.prompt;
    head.append(title, createStatusPill(questionResultClass(question), questionResultLabel(question)));
    node.appendChild(head);

    const meta = document.createElement("div");
    meta.className = "admin-question-meta";
    appendMeta(meta, "Тип", questionTypeLabel(question.type));
    appendMeta(meta, "Балл", question.answer ? `${question.answer.finalScore}/${question.maxScore}` : `0/${question.maxScore}`);
    appendMeta(meta, "Время", formatDuration(question.answer?.timeSpentMs || question.log?.timeSpentMs));
    if (question.log?.presentedAt) {
      appendMeta(meta, "Показан", formatDateTime(question.log.presentedAt));
    }
    appendMeta(meta, "Эталон", question.correctAnswer || "—");
    node.appendChild(meta);

    appendText(node, "p", "answer-brief", answerBrief(question));

    const raw = createNode("details", "answer-raw");
    const summary = createNode("summary", "", "Технические данные ответа");
    const payload = document.createElement("pre");
    payload.className = "answer-json";
    payload.textContent = answerPayloadText(question.answer);
    raw.append(summary, payload);
    node.appendChild(raw);

    if (question.type === "voice_response") {
      renderVoiceReview(detail, question, node);
    }

    moduleNode.appendChild(node);
  }

  async function setExtraAttempts(participantSignature, extraAttempts, attemptId) {
    hideMessage(elements.adminMessage);
    try {
      const controls = await adminApi("/api/admin/pm01/grants", {
        method: "POST",
        body: JSON.stringify({
          participantSignature,
          extraAttempts
        })
      });
      state.controls = controls;
      if (state.summary) {
        state.summary.controls = controls;
      }
      renderTeacherControls();
      renderAttempts();
      if (attemptId) {
        const detail = await adminApi(`/api/admin/pm01/attempts/${encodeURIComponent(attemptId)}`);
        renderDetail(detail);
      }
      showMessage(elements.adminMessage, "Допуск по попыткам обновлен.", "success");
    } catch (error) {
      showMessage(elements.adminMessage, error.message, "error");
    }
  }

  function renderAccessPanel(detail) {
    const signature = detail.attempt.participantSignature || "";
    const controls = getControls();
    const access = participantAccess(signature);
    const panel = createNode("div", "detail-access-panel");
    const copy = createNode("div", "detail-access-copy");
    appendText(copy, "strong", "", "Попытки студента");
    const accessText = controls.freeRepeatEnabled
      ? `Свободные повторы включены. Уже создано попыток: ${access.totalAttempts || 0}.`
      : `Лимит: ${access.allowedAttempts || 0}; завершено: ${access.completedAttempts || 0}; доступно: ${access.remainingAttempts || 0}.`;
    appendText(copy, "span", "", accessText);
    if (Number(access.extraAttempts || 0)) {
      appendText(copy, "small", "", `Дополнительно выдано: ${access.extraAttempts}`);
    }

    const actions = createNode("div", "detail-access-actions");
    const grant = document.createElement("button");
    grant.type = "button";
    grant.className = "button secondary";
    grant.textContent = "+1 попытка";
    grant.addEventListener("click", () =>
      setExtraAttempts(signature, Number(access.extraAttempts || 0) + 1, detail.attempt.id)
    );
    actions.appendChild(grant);

    if (Number(access.extraAttempts || 0) > 0) {
      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "button ghost";
      reset.textContent = "Сбросить допуск";
      reset.addEventListener("click", () => setExtraAttempts(signature, 0, detail.attempt.id));
      actions.appendChild(reset);
    }

    const print = document.createElement("button");
    print.type = "button";
    print.className = "button primary";
    print.textContent = "Печать протокола";
    print.addEventListener("click", () => window.print());
    actions.appendChild(print);

    panel.append(copy, actions);
    return panel;
  }

  function renderCompletionStrip(detail) {
    const totals = answeredTotals(detail);
    const strip = createNode("div", "detail-progress-strip");
    [
      `Выполнено заданий: ${totals.answered} из ${totals.questions}`,
      `Примерная оценка: ${detail.summary.grade}`,
      totals.pending ? `На ручной проверке: ${totals.pending}` : "Ручная проверка не требуется"
    ].forEach((text) => appendText(strip, "span", "", text));
    return strip;
  }

  function renderProtocolCard(detail) {
    const card = createNode("section", "protocol-card");
    const participant = detail.attempt.participant || {};
    const ticket = detail.attempt.variantMeta.materialTicket;
    const totals = answeredTotals(detail);
    const head = createNode("div", "protocol-head");
    appendText(head, "strong", "", "Протокол выполнения экзаменационного задания");
    appendText(head, "span", "", "ПМ.01 · МДК 01.01/01.02");
    card.appendChild(head);

    const grid = createNode("div", "protocol-grid");
    [
      ["Студент", participant.fullName || "—"],
      ["Группа", participant.groupName || "—"],
      ["Учреждение", participant.institution || "—"],
      ["Дата", formatDateTime(detail.attempt.finishedAt || detail.attempt.startedAt)],
      ["Вариант", detail.attempt.variantMeta.variantTitle || "—"],
      ["Билет", ticket ? `№ ${ticket.number}: ${ticket.product}` : "—"],
      ["Баллы", `${formatScoreNumber(detail.summary.totalFinalScore)} из ${detail.summary.totalMaxScore}`],
      ["Оценка", `${detail.attempt.status === "in_progress" ? "примерно " : ""}${detail.summary.grade}`],
      ["Выполнено", `${totals.answered} из ${totals.questions}`],
      ["Статус", statusLabel(detail.attempt.status)]
    ].forEach(([label, value]) => {
      const item = createNode("div", "protocol-item");
      appendText(item, "span", "", label);
      appendText(item, "strong", "", value);
      grid.appendChild(item);
    });
    card.appendChild(grid);

    const table = document.createElement("table");
    table.className = "protocol-module-table";
    table.innerHTML = "<thead><tr><th>Модуль</th><th>Балл</th><th>Ответы</th></tr></thead>";
    const body = document.createElement("tbody");
    (detail.modules || []).forEach((module) => {
      const row = document.createElement("tr");
      const score = module.score || {};
      [module.code || "—", `${formatScoreNumber(score.finalScore || 0)} / ${module.maxScore || score.maxScore || 0}`, `${score.answered || 0} / ${score.questionCount || module.questionCount || 0}`]
        .forEach((text) => {
          const cell = document.createElement("td");
          cell.textContent = text;
          row.appendChild(cell);
        });
      body.appendChild(row);
    });
    table.appendChild(body);
    card.appendChild(table);

    const signatures = createNode("div", "protocol-signatures");
    appendText(signatures, "span", "", "Преподаватель: __________________");
    appendText(signatures, "span", "", "Подпись студента: _______________");
    card.appendChild(signatures);
    return card;
  }

  function renderDetailHeader(detail) {
    const header = createNode("section", "detail-hero");
    const mode = detail.attempt.mode === "training" ? "Тренировка" : "Экзамен";
    const ticket = detail.attempt.variantMeta.materialTicket;
    appendText(header, "p", "overline", mode);
    appendText(header, "h2", "", detail.attempt.participant.fullName || "Без имени");

    const subtitle = [
      detail.attempt.participant.groupName,
      detail.attempt.participant.institution,
      detail.attempt.participant.mentorName
    ].filter(Boolean).join(" · ");
    appendText(header, "p", "lead", subtitle || "Данные участника не заполнены.");

    const metrics = createNode("div", "detail-metrics");
    const gradeCaption = `${detail.attempt.status === "in_progress" ? "примерная оценка" : "оценка"} ${detail.summary.grade}`;
    [
      ["Итог", `${detail.summary.totalFinalScore}/${detail.summary.totalMaxScore}`, gradeCaption],
      ["Статус", statusLabel(detail.attempt.status), statusCaption(detail.attempt.status)],
      ["Время", formatDuration(detail.summary.totalDurationMs), formatDateTime(detail.attempt.finishedAt || detail.attempt.startedAt)],
      ["Вариант", detail.attempt.variantMeta.variantTitle || "—", ticket ? `билет № ${ticket.number}: ${ticket.product}` : "билет не выбран"]
    ].forEach(([label, value, caption]) => {
      const item = createNode("div", "detail-metric");
      appendText(item, "span", "", label);
      appendText(item, "strong", "", value);
      appendText(item, "small", "", caption);
      metrics.appendChild(item);
    });
    header.appendChild(metrics);

    if (Number(detail.summary.pendingManualReviews || 0)) {
      const warning = createNode("div", "detail-warning");
      warning.appendChild(createStatusPill("pending_review", `${detail.summary.pendingManualReviews} голосовых ответа ждут проверки`));
      appendText(warning, "span", "", "После сохранения ручной проверки итоговый балл обновится автоматически.");
      header.appendChild(warning);
    }

    header.appendChild(renderAccessPanel(detail));
    return header;
  }

  function renderDetailModuleSummary(modules) {
    const grid = createNode("div", "detail-module-grid");
    modules.forEach((module) => {
      const score = module.score;
      const maxScore = Number(module.maxScore || score?.maxScore || 0);
      const value = Number(score?.finalScore || 0);
      const card = createNode("article", "detail-module-card");
      appendText(card, "strong", "", `${module.code} ${module.title}`);
      appendText(card, "span", "", maxScore ? `${formatScoreNumber(value)} / ${maxScore}` : "без баллов");
      appendText(
        card,
        "small",
        "",
        score ? `ответов ${score.answered}/${score.questionCount}` : "ответов нет"
      );
      if (maxScore) {
        card.appendChild(createScoreBar(value, maxScore, "module"));
      }
      if (Number(score?.pendingManualReviews || 0)) {
        card.appendChild(createStatusPill("pending_review", `${score.pendingManualReviews} проверить`));
      }
      grid.appendChild(card);
    });
    return grid;
  }

  function renderDetail(detail) {
    state.selectedAttemptId = detail.attempt.id;
    elements.detailPanel.innerHTML = "";
    elements.detailPanel.append(
      renderDetailHeader(detail),
      renderCompletionStrip(detail),
      renderDetailModuleSummary(detail.modules || []),
      renderProtocolCard(detail)
    );

    (detail.modules || []).forEach((module) => {
      const moduleNode = document.createElement("section");
      moduleNode.className = "admin-module";
      const moduleTitle = document.createElement("h3");
      moduleTitle.textContent = `${module.code} ${module.title}`;
      const moduleMeta = document.createElement("p");
      const score = module.score;
      moduleMeta.textContent = score
        ? `${score.finalScore} из ${module.maxScore}; ответов ${score.answered}/${score.questionCount}`
        : `0 из ${module.maxScore}`;
      moduleNode.append(moduleTitle, moduleMeta);
      (module.questions || []).forEach((question) => renderQuestionDetail(detail, question, moduleNode));
      elements.detailPanel.appendChild(moduleNode);
    });
    renderAttempts();
  }

  async function selectAttempt(attemptId) {
    hideMessage(elements.adminMessage);
    try {
      const detail = await adminApi(`/api/admin/pm01/attempts/${encodeURIComponent(attemptId)}`);
      renderDetail(detail);
    } catch (error) {
      showMessage(elements.adminMessage, error.message, "error");
    }
  }

  async function loadAdmin() {
    const [summary, attempts, controls] = await Promise.all([
      adminApi("/api/admin/pm01/summary"),
      adminApi("/api/admin/pm01/attempts"),
      adminApi("/api/admin/pm01/controls")
    ]);
    state.summary = summary;
    state.attempts = attempts;
    state.controls = controls;
    state.summary.controls = controls;
    renderAdmin();
  }

  async function login(event) {
    event.preventDefault();
    hideMessage(elements.loginMessage);
    try {
      await adminApi("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password: elements.password.value })
      });
      await loadAdmin();
    } catch (error) {
      showMessage(elements.loginMessage, error.message, "error");
    }
  }

  async function exportFile(kind) {
    hideMessage(elements.adminMessage);
    try {
      const result = await adminApi(`/api/admin/pm01/exports/${kind}`, {
        method: "POST",
        body: JSON.stringify({})
      });
      showMessage(elements.adminMessage, `Файл создан: ${result.fileName}`, "success");
    } catch (error) {
      showMessage(elements.adminMessage, error.message, "error");
    }
  }

  function syncFiltersFromInputs() {
    state.filters.search = elements.filterSearch.value;
    state.filters.variant = elements.filterVariant.value;
    state.filters.group = elements.filterGroup.value;
    state.filters.status = elements.filterStatus.value;
    state.filters.mode = elements.filterMode.value;
    state.filters.pendingOnly = elements.filterPending.checked;
    renderAttempts();
  }

  function resetFilters() {
    elements.filterSearch.value = "";
    elements.filterVariant.value = "";
    elements.filterGroup.value = "";
    elements.filterStatus.value = "";
    elements.filterMode.value = "";
    elements.filterPending.checked = false;
    syncFiltersFromInputs();
  }

  elements.loginForm.addEventListener("submit", login);
  elements.teacherControlsForm.addEventListener("submit", saveTeacherControls);
  elements.refreshAdmin.addEventListener("click", () => {
    loadAdmin().catch((error) => showMessage(elements.adminMessage, error.message, "error"));
  });
  elements.exportCsv.addEventListener("click", () => exportFile("csv"));
  elements.exportJson.addEventListener("click", () => exportFile("json"));
  elements.filterSearch.addEventListener("input", syncFiltersFromInputs);
  elements.filterVariant.addEventListener("change", syncFiltersFromInputs);
  elements.filterGroup.addEventListener("change", syncFiltersFromInputs);
  elements.filterStatus.addEventListener("change", syncFiltersFromInputs);
  elements.filterMode.addEventListener("change", syncFiltersFromInputs);
  elements.filterPending.addEventListener("change", syncFiltersFromInputs);
  elements.filterReset.addEventListener("click", resetFilters);

  async function initAdmin() {
    try {
      await adminApi("/api/admin/session");
      await loadAdmin();
    } catch (_) {
      elements.loginPanel.classList.remove("hidden");
      elements.adminPanel.classList.add("hidden");
    }
  }

  initAdmin();
})();
