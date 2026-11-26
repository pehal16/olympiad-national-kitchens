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
    sheet.classList.toggle("compact-name", false);
    const footer = sheet.querySelector(".certificate-footer");
    const maxFooterBottom = sheet.clientHeight - 25;
    const footerOverflows = () => footer.offsetTop + footer.offsetHeight > maxFooterBottom;
    let fontSize = fields.name.textContent.length > 32 ? 50 : 63;
    fields.name.style.fontSize = `${fontSize}px`;
    while (fontSize > 20 && footerOverflows()) {
      fontSize -= 2;
      fields.name.style.fontSize = `${fontSize}px`;
    }
    if (footerOverflows()) {
      sheet.classList.add("compact-name");
      while (fontSize > 16 && footerOverflows()) {
        fontSize -= 1;
        fields.name.style.fontSize = `${fontSize}px`;
      }
    }
  }

  function renderNames(fullName, mentorName = "") {
    fields.name.textContent = fullName;
    fields.name.classList.toggle("long-name", fullName.length > 32);
    fields.mentor.textContent = mentorName || "—";
    fields.mentor.style.fontSize = `${mentorName.length > 70 ? 12 : mentorName.length > 35 ? 15 : 19}px`;
  }

  function openDemoEditor(attemptId, participant) {
    const editor = document.getElementById("certificate-editor");
    const fullNameInput = document.getElementById("certificate-full-name");
    const mentorInput = document.getElementById("certificate-mentor-name");
    const draftKey = `nko_teacher_certificate_${attemptId}`;
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey));
      if (typeof draft?.fullName === "string") fullNameInput.value = draft.fullName.slice(0, fullNameInput.maxLength);
      if (typeof draft?.mentorName === "string") mentorInput.value = draft.mentorName.slice(0, mentorInput.maxLength);
    } catch {
      // Editing still works when the browser blocks session storage.
    }

    const updatePreview = (saveDraft = false) => {
      const fullName = fullNameInput.value.trim().replace(/\s+/g, " ");
      const mentorName = mentorInput.value.trim().replace(/\s+/g, " ");
      renderNames(fullName || participant.fullName, mentorName);
      fitParticipantName();
      if (saveDraft) {
        try { sessionStorage.setItem(draftKey, JSON.stringify({ fullName, mentorName })); } catch {}
      }
    };
    for (const input of [fullNameInput, mentorInput]) {
      input.addEventListener("input", () => updatePreview(true));
    }

    if (!window.location.pathname.startsWith("/demo-teacher/")) {
      document.querySelector(".toolbar-back").href = "./?demo=teacher";
    }
    document.getElementById("certificate-participation").textContent = "прошёл(а) демоверсию онлайн-олимпиады";
    editor.append(saveButton.parentElement);
    editor.hidden = false;
    updatePreview();

    const fitPreview = () => {
      const width = sheet.offsetWidth;
      if (width) sheet.style.setProperty("--certificate-preview-zoom", Math.min(1, editor.offsetWidth / width));
    };
    fitPreview();
    window.addEventListener("resize", fitPreview);
  }

  async function loadCertificate() {
    const attemptId = new URLSearchParams(window.location.search).get("attempt") || "";
    if (!/^attempt_[a-zA-Z0-9-]{8,}$/.test(attemptId)) {
      fail("Не найден номер попытки. Откройте сертификат со страницы завершённого результата.");
      return;
    }

    let attemptToken = "";
    let demoSession = "";
    let environment = null;
    try {
      attemptToken = organizerMode ? "" : localStorage.getItem(`nko_attempt_access_${attemptId}`) || "";
      if (!organizerMode) {
        try { environment = JSON.parse(localStorage.getItem(`nko_attempt_access_${attemptId}_environment`) || "null"); } catch { /* Retain compatible token when old metadata is damaged. */ }
        // Legacy access is demo-only when this exact attempt is the demo session.
        const legacyDemo = !environment && sessionStorage.getItem("nko_demo_session_attempt_v1") === attemptId;
        if (environment?.demonstration || legacyDemo) {
          demoSession = environment?.demoSession || localStorage.getItem("nko_anonymous_demo_session_v1") || "";
        }
      }
    } catch (error) {
      // The browser may block storage in private mode.
    }
    if (!organizerMode && !attemptToken) {
      fail("Не удалось открыть защищённый результат в этом браузере. Вернитесь к результату на том же устройстве и откройте сертификат снова.");
      return;
    }

    let attempt;
    try {
      const url = `/api/${organizerMode ? (remoteOrganizer ? "organizer" : "admin") : "public"}/attempts/${encodeURIComponent(attemptId)}/certificate`;
      let response = await fetch(url, {
        headers: organizerMode ? {} : { "X-Attempt-Token": attemptToken, ...(demoSession ? { "X-Demo-Session": demoSession } : {}) },
        credentials: "same-origin",
        cache: "no-store"
      });
      // Older demo attempts have only a token. Never redirect a successful official
      // certificate, or a record explicitly marked as official, to another database.
      if (!response.ok && !organizerMode && !environment && !demoSession) {
        let legacySession = "";
        try { legacySession = localStorage.getItem("nko_anonymous_demo_session_v1") || ""; } catch {}
        if (/^[a-f0-9]{32}$/.test(legacySession)) {
          const candidate = await fetch(url, { headers: { "X-Attempt-Token": attemptToken, "X-Demo-Session": legacySession }, credentials: "same-origin", cache: "no-store" });
          if (candidate.ok) {
            const check = await candidate.clone().json();
            if ((check.data || check).demonstration === true) response = candidate;
          }
        }
      }
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
    const allowPersonalization = !organizerMode && attempt.demonstration === true && attempt.teacherDemo === true;
    renderNames(participant.fullName, participant.mentorName);
    if (attempt.demonstration) {
      sheet.classList.add('is-demo');
      document.querySelector('.document-toolbar strong').textContent='Демонстрационный сертификат';
      document.querySelector('.certificate-pilot-label').textContent='Образец · не подтверждает участие в официальной олимпиаде';
    }
    if (organizerMode) document.title = `Свидетельство — ${participant.fullName}`;
    fields.score.textContent = `${score} из ${maxScore} баллов`;
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
    status.textContent = allowPersonalization ? "" : "В окне печати выберите «Сохранить как PDF» и горизонтальный формат A4. На телефоне лист можно сдвигать по горизонтали; сам макет не меняется.";
    saveButton.disabled = false;
    feedbackLink.hidden = organizerMode || Boolean(attempt.demonstration);
    if (allowPersonalization) openDemoEditor(attemptId, participant);
  }

  saveButton.addEventListener("click", () => {
    if (!sheet.hidden) window.print();
  });

  loadCertificate();
})();
