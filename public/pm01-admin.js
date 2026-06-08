(function () {
  const state = {
    summary: null,
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
    const minutes = Math.floor(seconds / 60);
    const tail = seconds % 60;
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

  function moduleScore(attempt, code) {
    const module = (attempt.moduleScores || []).find((item) => item.code === code);
    if (!module) {
      return "—";
    }
    const value = module.finalScore ?? 0;
    return `${value}/${module.maxScore}`;
  }

  function uniqueValues(values) {
    return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
      left.localeCompare(right, "ru")
    );
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

  function createCell(text) {
    const cell = document.createElement("td");
    cell.textContent = text;
    return cell;
  }

  function createStatusPill(status) {
    const pill = document.createElement("span");
    pill.className = `status-pill ${status || ""}`;
    pill.textContent = statusLabel(status);
    return pill;
  }

  function renderStats() {
    elements.adminStats.innerHTML = "";
    const counts = state.summary?.counts || {};
    const stats = [
      ["Участники", counts.participants || 0],
      ["Попытки", counts.attempts || 0],
      ["Ожидает проверки", counts.pendingReview || 0],
      ["Проверено", counts.reviewed || 0]
    ];
    stats.forEach(([label, value]) => {
      const card = document.createElement("article");
      card.className = "admin-stat";
      const span = document.createElement("span");
      span.textContent = label;
      const strong = document.createElement("strong");
      strong.textContent = value;
      card.append(span, strong);
      elements.adminStats.appendChild(card);
    });
    elements.adminBackend.textContent = state.summary?.capabilities?.storageBackend || "file";
    elements.adminRefreshed.textContent = formatDateTime(state.summary?.diagnostics?.refreshedAt);
  }

  function renderAttempts() {
    elements.attemptsBody.innerHTML = "";
    const attempts = applyFilters();
    if (!attempts.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 13;
      cell.textContent = state.attempts.length
        ? "По выбранным фильтрам попыток нет."
        : "Пока нет попыток ПМ.01.";
      row.appendChild(cell);
      elements.attemptsBody.appendChild(row);
      return;
    }

    attempts.forEach((attempt) => {
      const row = document.createElement("tr");
      row.dataset.attemptId = attempt.id;
      if (attempt.id === state.selectedAttemptId) {
        row.style.background = "#eef8f4";
      }
      const participant = createCell(`${attempt.fullName}\n${attempt.groupName}`);
      participant.style.whiteSpace = "pre-line";
      row.append(
        participant,
        createCell(attempt.clientIp || "—"),
        createCell(attempt.variantTitle || "—"),
        createCell(attempt.ticketNumber ? `№ ${attempt.ticketNumber}\n${attempt.ticketProduct}` : "—"),
        createCell(attempt.mode === "training" ? "тренировка" : "экзамен")
      );
      const statusCell = document.createElement("td");
      statusCell.appendChild(createStatusPill(attempt.status));
      row.append(
        statusCell,
        createCell(moduleScore(attempt, "M1")),
        createCell(moduleScore(attempt, "M2")),
        createCell(moduleScore(attempt, "M3")),
        createCell(moduleScore(attempt, "M4")),
        createCell(String(attempt.totalFinalScore ?? 0)),
        createCell(String(attempt.grade || "—")),
        createCell(String(attempt.pendingManualReviews || 0))
      );
      row.addEventListener("click", () => selectAttempt(attempt.id));
      elements.attemptsBody.appendChild(row);
    });
  }

  function renderAdmin() {
    elements.loginPanel.classList.add("hidden");
    elements.adminPanel.classList.remove("hidden");
    renderStats();
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
    node.className = "admin-question";
    const title = document.createElement("h4");
    title.textContent = question.prompt;
    const meta = document.createElement("div");
    meta.className = "admin-question-meta";
    appendMeta(meta, "Тип", question.type);
    appendMeta(meta, "Балл", question.answer ? `${question.answer.finalScore}/${question.maxScore}` : `0/${question.maxScore}`);
    appendMeta(meta, "Время", formatDuration(question.answer?.timeSpentMs || question.log?.timeSpentMs));
    if (question.log?.presentedAt) {
      appendMeta(meta, "Показан", formatDateTime(question.log.presentedAt));
    }
    appendMeta(meta, "Эталон", question.correctAnswer || "—");
    node.append(title, meta);

    const payload = document.createElement("pre");
    payload.className = "answer-json";
    payload.textContent = answerPayloadText(question.answer);
    node.appendChild(payload);

    if (question.type === "voice_response") {
      renderVoiceReview(detail, question, node);
    }

    moduleNode.appendChild(node);
  }

  function renderDetail(detail) {
    state.selectedAttemptId = detail.attempt.id;
    elements.detailPanel.innerHTML = "";
    const overline = document.createElement("p");
    overline.className = "overline";
    overline.textContent = detail.attempt.mode === "training" ? "Тренировка" : "Экзамен";
    const title = document.createElement("h2");
    title.textContent = detail.attempt.participant.fullName;
    const subtitle = document.createElement("p");
    subtitle.className = "lead";
    const ticket = detail.attempt.variantMeta.materialTicket;
    subtitle.textContent = `${detail.attempt.variantMeta.variantTitle} · ${
      ticket ? `билет № ${ticket.number}: ${ticket.product} · ` : ""
    }${detail.summary.totalFinalScore}/${detail.summary.totalMaxScore} · оценка ${detail.summary.grade}`;
    elements.detailPanel.append(overline, title, subtitle);

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
    const [summary, attempts] = await Promise.all([
      adminApi("/api/admin/pm01/summary"),
      adminApi("/api/admin/pm01/attempts")
    ]);
    state.summary = summary;
    state.attempts = attempts;
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
