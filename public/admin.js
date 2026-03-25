const adminState = {
  token: localStorage.getItem("olympiad_admin_token") || ""
};

const elements = {
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
  attemptDetail: document.getElementById("attempt-detail"),
  exportCsv: document.getElementById("export-csv"),
  exportJson: document.getElementById("export-json"),
  uploadDisk: document.getElementById("upload-disk")
};

async function adminApi(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminState.token}`
    },
    ...options
  });

  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || "Ошибка запроса");
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
}

function mapById(items = []) {
  return new Map(items.map((item) => [item.id, item]));
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

function renderSummary(summary) {
  elements.statParticipants.textContent = summary.counts.participants;
  elements.statAttempts.textContent = summary.counts.attempts;
  elements.statCompleted.textContent = summary.counts.completed;
}

async function loadSummary() {
  const summary = await adminApi("/api/admin/summary");
  renderSummary(summary);
}

async function loadAttempts() {
  const attempts = await adminApi("/api/admin/attempts");
  elements.attemptsBody.innerHTML = "";

  attempts.forEach((attempt) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${attempt.rank}</td>
      <td>${attempt.fullName}<br /><span class="muted">${attempt.institution}</span></td>
      <td>${attempt.groupName}<br /><span class="muted">${attempt.mentorName || "Наставник не указан"}</span></td>
      <td>${attempt.status}</td>
      <td>${attempt.totalFinalScore ?? "скрыто"}</td>
      <td><button class="button secondary" data-attempt="${attempt.id}">Открыть</button></td>
    `;
    elements.attemptsBody.appendChild(row);
  });

  elements.attemptsBody.querySelectorAll("button[data-attempt]").forEach((button) => {
    button.addEventListener("click", () => loadAttemptDetail(button.dataset.attempt));
  });
}

async function loadAttemptDetail(attemptId) {
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
    <span class="muted">Выданы задания: ${data.attempt.variantMeta.issuedQuestionIds.join(", ")}</span>
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
    await loadSummary();
    await loadAttempts();
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

async function init() {
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.exportCsv.addEventListener("click", () => exportFile("csv"));
  elements.exportJson.addEventListener("click", () => exportFile("json"));
  elements.uploadDisk.addEventListener("click", uploadToDisk);

  if (adminState.token) {
    try {
      showPanel();
      await loadSummary();
      await loadAttempts();
    } catch (error) {
      localStorage.removeItem("olympiad_admin_token");
      adminState.token = "";
      elements.panel.classList.add("hidden");
      elements.loginCard.classList.remove("hidden");
    }
  }
}

init();
