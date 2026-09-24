(() => {
  "use strict";

  const status = document.getElementById("certificate-status");
  const sheet = document.getElementById("certificate-sheet");
  const saveButton = document.getElementById("certificate-save");
  const fields = {
    name: document.getElementById("certificate-name"),
    score: document.getElementById("certificate-score"),
    mentor: document.getElementById("certificate-mentor"),
    date: document.getElementById("certificate-date"),
    number: document.getElementById("certificate-number")
  };

  function fail(message) {
    status.textContent = message;
    status.classList.add("error");
    sheet.hidden = true;
    saveButton.disabled = true;
  }

  function fitParticipantName() {
    const sheetTop = sheet.getBoundingClientRect().top;
    const maxFooterBottom = sheet.getBoundingClientRect().height - 25;
    let fontSize = fields.name.textContent.length > 32 ? 50 : 63;
    fields.name.style.fontSize = `${fontSize}px`;
    while (
      fontSize > 20 &&
      document.querySelector(".certificate-footer").getBoundingClientRect().bottom - sheetTop > maxFooterBottom
    ) {
      fontSize -= 2;
      fields.name.style.fontSize = `${fontSize}px`;
    }
    if (document.querySelector(".certificate-footer").getBoundingClientRect().bottom - sheetTop > maxFooterBottom) {
      sheet.classList.add("compact-name");
      while (
        fontSize > 16 &&
        document.querySelector(".certificate-footer").getBoundingClientRect().bottom - sheetTop > maxFooterBottom
      ) {
        fontSize -= 1;
        fields.name.style.fontSize = `${fontSize}px`;
      }
    }
  }

  async function loadCertificate() {
    const attemptId = new URLSearchParams(window.location.search).get("attempt") || "";
    if (!/^attempt_[a-zA-Z0-9-]{8,}$/.test(attemptId)) {
      fail("Не найден номер попытки. Откройте сертификат со страницы завершённого результата.");
      return;
    }

    let attemptToken = "";
    try {
      attemptToken = localStorage.getItem(`nko_attempt_access_${attemptId}`) || "";
    } catch (error) {
      // The browser may block storage in private mode.
    }
    if (!attemptToken) {
      fail("Не удалось открыть защищённый результат в этом браузере. Вернитесь к результату на том же устройстве и откройте сертификат снова.");
      return;
    }

    let attempt;
    try {
      const response = await fetch(`/api/public/attempts/${encodeURIComponent(attemptId)}`, {
        headers: { "X-Attempt-Token": attemptToken },
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      attempt = payload?.data || payload;
    } catch (error) {
      fail("Не удалось загрузить сохранённый результат. Проверьте соединение и попробуйте открыть сертификат из результата ещё раз.");
      return;
    }

    const score = attempt?.summary?.totalFinalScore;
    const maxScore = attempt?.summary?.totalMaxScore;
    const participant = attempt?.participant;
    const finishedAt = new Date(attempt?.finishedAt || "");
    if (
      attempt?.status === "in_progress" ||
      !Number.isFinite(score) ||
      !Number.isFinite(maxScore) ||
      !participant?.fullName ||
      Number.isNaN(finishedAt.getTime())
    ) {
      fail("Сертификат доступен только после завершения олимпиады и расчёта баллов.");
      return;
    }

    fields.name.textContent = participant.fullName;
    fields.name.classList.toggle("long-name", participant.fullName.length > 32);
    fields.score.textContent = `${score} из ${maxScore} баллов`;
    fields.mentor.textContent = participant.mentorName || "—";
    fields.mentor.style.fontSize = `${participant.mentorName?.length > 70 ? 12 : participant.mentorName?.length > 35 ? 15 : 19}px`;
    fields.date.textContent = new Intl.DateTimeFormat("ru-RU", {
      day: "numeric", month: "long", year: "numeric"
    }).format(finishedAt);
    fields.number.textContent = `НК-${String(attempt.id).replace(/^attempt_/, "").slice(0, 12).toUpperCase()}`;

    sheet.hidden = false;
    fitParticipantName();
    await Promise.all(Array.from(sheet.images || sheet.querySelectorAll("img"), (image) =>
      image.decode ? image.decode().catch(() => undefined) : Promise.resolve()
    ));
    status.textContent = "В окне печати выберите «Сохранить как PDF» и горизонтальный формат A4. На телефоне лист можно сдвигать по горизонтали; сам макет не меняется.";
    saveButton.disabled = false;
  }

  saveButton.addEventListener("click", () => {
    if (!sheet.hidden) window.print();
  });

  loadCertificate();
})();
