(() => {
  "use strict";

  const status = document.getElementById("certificate-status");
  const sheet = document.getElementById("certificate-sheet");
  const saveButton = document.getElementById("certificate-save");
  const feedbackLink = document.getElementById("certificate-feedback");
  const organizerMode = new URLSearchParams(window.location.search).get("organizer") === "1";
  const remoteOrganizer = organizerMode && new URLSearchParams(window.location.search).get("remote") === "1";
  if (organizerMode) {
    const back = document.querySelector(".toolbar-back");
    back.href = remoteOrganizer ? "/organizer" : "/admin.html";
    back.textContent = "← В админку";
  }
  const fields = {
    name: document.getElementById("certificate-name"),
    score: document.getElementById("certificate-score"),
    mentor: document.getElementById("certificate-mentor"),
    number: document.getElementById("certificate-number")
  };

  function fail(message) {
    status.textContent = message;
    status.classList.add("error");
    sheet.hidden = true;
    saveButton.disabled = true;
    feedbackLink.hidden = true;
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
      attemptToken = organizerMode ? "" : localStorage.getItem(`nko_attempt_access_${attemptId}`) || "";
    } catch (error) {
      // The browser may block storage in private mode.
    }
    if (!organizerMode && !attemptToken) {
      fail("Не удалось открыть защищённый результат в этом браузере. Вернитесь к результату на том же устройстве и откройте сертификат снова.");
      return;
    }

    let attempt;
    try {
      const response = await fetch(`/api/${organizerMode ? (remoteOrganizer ? "organizer" : "admin") : "public"}/attempts/${encodeURIComponent(attemptId)}/certificate`, {
        headers: organizerMode ? {} : { "X-Attempt-Token": attemptToken },
        credentials: "same-origin",
        cache: "no-store"
      });
      if (organizerMode && response.status === 401) {
        fail("Войдите в админку и откройте сертификат участника снова.");
        return;
      }
      if (response.status === 409) {
        fail("Свидетельство доступно после личного завершения олимпиады.");
        return;
      }
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

    const order = attempt.certificateOrder;
    if (!order?.number || !/^\d{4}-\d{2}-\d{2}$/.test(order.date || "") || Number.isNaN(Date.parse(order.date))) {
      fail("Реквизиты приказа не настроены. Обратитесь к организатору олимпиады.");
      return;
    }
    fields.name.textContent = participant.fullName;
    if (attempt.demonstration) {
      sheet.classList.add('is-demo');
      document.querySelector('.document-toolbar strong').textContent='Демонстрационный сертификат';
      document.querySelector('.certificate-pilot-label').textContent='Образец · не подтверждает участие в официальной олимпиаде';
    }
    if (organizerMode) document.title = `Свидетельство — ${participant.fullName}`;
    fields.name.classList.toggle("long-name", participant.fullName.length > 32);
    fields.score.textContent = `${score} из ${maxScore} баллов`;
    fields.mentor.textContent = participant.mentorName || "—";
    fields.mentor.style.fontSize = `${participant.mentorName?.length > 70 ? 12 : participant.mentorName?.length > 35 ? 15 : 19}px`;
    const orderDate = new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC"
    }).format(new Date(order.date));
    fields.number.textContent = attempt.demonstration ? 'Демонстрация' : `№ ${order.number} / ${orderDate}`;
    // Story participants receive the document at their own finish.
    // Retain the previous pilot annotation only for legacy attempts.
    if (attempt.story && !attempt.demonstration) document.querySelector('.certificate-pilot-label')?.remove();

    sheet.hidden = false;
    fitParticipantName();
    await Promise.all(Array.from(sheet.images || sheet.querySelectorAll("img"), (image) =>
      image.decode ? image.decode().catch(() => undefined) : Promise.resolve()
    ));
    const seal = sheet.querySelector(".certificate-seal");
    if (!seal?.complete || !seal.naturalWidth) {
      status.textContent = "Печать не загрузилась. Обновите страницу перед сохранением сертификата.";
      status.classList.add("error");
      saveButton.disabled = true;
      return;
    }
    const clusterMark = sheet.querySelector(".certificate-cluster-mark img");
    if (!clusterMark?.complete || !clusterMark.naturalWidth) {
      status.textContent = "Логотип «Профессионалитета» не загрузился. Обновите страницу перед сохранением сертификата.";
      status.classList.add("error");
      saveButton.disabled = true;
      return;
    }
    status.textContent = "В окне печати выберите «Сохранить как PDF» и горизонтальный формат A4. На телефоне лист можно сдвигать по горизонтали; сам макет не меняется.";
    saveButton.disabled = false;
    feedbackLink.hidden = organizerMode || Boolean(attempt.demonstration);
  }

  saveButton.addEventListener("click", () => {
    if (!sheet.hidden) window.print();
  });

  loadCertificate();
})();
