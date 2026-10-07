(function (root) {
  "use strict";
  const introSeen = new Set();
  const memoryDrafts = new Map();
  const rules = [
    "Прочитайте заказ гостя и сравните все четыре позиции меню.",
    "Выберите одно блюдо нажатием или перетащите его на поднос мышью. Выбор можно заменить или убрать.",
    "Нажмите «Подтвердить заказ». До подтверждения ответ не отправляется.",
    "Правильный заказ — 4 балла, ошибочный — 0. Штрафов нет. После сохранения возврата нет.",
    "Во время тура правильные ответы не показываются. Фотографии можно увеличить, правила — открыть повторно."
  ];
  function createState(question, initial) {
    const ids = new Set((question.options || []).map((option) => option.id));
    let selectedOptionId = ids.has(initial?.selectedOptionId) ? initial.selectedOptionId : null;
    return {
      select(id) { if (!ids.has(id)) return false; selectedOptionId = id; return true; },
      clear() { selectedOptionId = null; },
      getAnswer: () => ({ selectedOptionId }),
      isComplete: () => selectedOptionId !== null
    };
  }
  function create({ mount, question, attemptId, submitButton, onChange, onPhase, inlineIntro = false, presentationMode = 'standard' }) {
    const doc = mount.ownerDocument, win = doc.defaultView;
    const version = question.presentationVersion;
    const scope = `${attemptId}_${version}`;
    const introKey = `nko_t4_intro_${scope}`;
    const draftKey = `nko_t4_draft_${scope}_${question.id}`;
    let storageAvailable = true, locked = false, draggingId = null, ghost = null, suppressClickUntil = 0;
    const read = (key) => { try { return win.localStorage.getItem(key); } catch { storageAvailable = false; return null; } };
    const write = (key, value) => { try { win.localStorage.setItem(key, value); } catch { storageAvailable = false; } };
    let stored;
    try { stored = JSON.parse(read(draftKey)); } catch { stored = null; }
    const initial = question.savedAnswer || stored || memoryDrafts.get(draftKey);
    const model = createState(question, initial);
    let started = inlineIntro || question.sequenceInTour !== 1 || introSeen.has(introKey) || read(introKey) === "seen" || model.isComplete();
    const element = (tag, className, text) => {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const shell = element("section", "t4-order"); mount.append(shell);
    shell.classList.toggle('restaurant-orders', presentationMode === 'restaurant');
    const placeholder = doc.createComment("shared submit button location"); submitButton.before(placeholder);
    const originalType = submitButton.getAttribute("type");
    const cards = new Map(), controls = [];
    let tray, traySelection, clearButton, status, storageNote;
    const dialog = element("dialog", "t4-dialog");
    dialog.setAttribute("aria-labelledby", "t4-dialog-title");
    let dialogTrigger = null;
    const closeDialog = () => { if (dialog.open) dialog.close(); dialogTrigger?.focus({ preventScroll: true }); };
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeDialog(); });
    function openDialog(trigger, title, body) {
      if (locked) return;
      dialogTrigger = trigger;
      const heading = element("h3", "", title); heading.id = "t4-dialog-title";
      const close = element("button", "t4-secondary", "Закрыть"); close.type = "button";
      close.addEventListener("click", closeDialog);
      const header = element("div", "t4-dialog-head"); header.append(heading, close);
      dialog.replaceChildren(header, body); dialog.showModal(); close.focus();
    }
    function rulesContent() {
      const body = element("div");
      const list = element("ul", "t4-rules"); rules.forEach((text) => list.append(element("li", "", text)));
      body.append(element("p", "t4-facts", "8 заказов · 32 балла · 10 минут"), list,
        element("p", "t4-hint", "Время тура уже идёт: чтение правил входит в 10 минут."));
      return body;
    }
    function photo(option, className) {
      const frame = element("span", className || "t4-photo");
      const img = element("img"); img.src = option.imageUrl; img.alt = option.imageAlt;
      img.width = 900; img.height = 600; img.decoding = "async"; img.loading = "eager"; img.draggable = false;
      const fallback = element("span", "t4-photo-missing", "Фото недоступно"); fallback.hidden = true;
      img.addEventListener("error", () => { img.hidden = true; fallback.hidden = false; });
      frame.append(img, fallback); return frame;
    }
    function persist() {
      const answer = model.getAnswer(); memoryDrafts.set(draftKey, answer); write(draftKey, JSON.stringify(answer));
      if (storageNote) storageNote.hidden = storageAvailable;
      onChange(answer);
    }
    function update(animate) {
      const id = model.getAnswer().selectedOptionId;
      const option = question.options.find((item) => item.id === id);
      for (const [optionId, button] of cards) {
        button.setAttribute("aria-checked", String(optionId === id));
        button.tabIndex = optionId === (id || question.options[0].id) ? 0 : -1;
        button.closest(".t4-menu-card").classList.toggle("is-selected", optionId === id);
      }
      traySelection.replaceChildren();
      if (option) {
        traySelection.append(photo(option, "t4-tray-photo"), element("strong", "t4-tray-name", option.text));
      } else traySelection.append(element("p", "t4-empty", "Выберите блюдо из меню"));
      clearButton.hidden = !option; clearButton.disabled = locked;
      status.textContent = option ? `Выбрано вами: ${option.text}. Заказ ещё не отправлен.` : "На подносе пока нет блюда.";
      if (animate) { traySelection.classList.remove("t4-selection-enter"); void traySelection.offsetWidth; traySelection.classList.add("t4-selection-enter"); }
    }
    function select(id) { if (locked || !model.select(id)) return; update(true); persist(); }
    function cancelDrag() {
      const wasDragging = Boolean(draggingId);
      draggingId = null; ghost?.remove(); ghost = null; tray?.classList.remove("is-over");
      for (const button of cards.values()) button.classList.remove("is-dragging");
      if (wasDragging) suppressClickUntil = Date.now() + 250;
    }
    const cancelByKey = (event) => { if (event.key === "Escape" && draggingId) cancelDrag(); };
    doc.addEventListener("keydown", cancelByKey);
    // Native mouse DnD intentionally emits pointercancel when the browser takes
    // control. Its real cancellation is dragend/Escape, not that hand-off event.
    const cancelPointer = (event) => { if (event.pointerType !== "mouse") cancelDrag(); };
    doc.addEventListener("pointercancel", cancelPointer);
    function renderActivity() {
      onPhase(false); shell.replaceChildren(); shell.classList.remove("t4-intro"); controls.length = 0; cards.clear();
      const receipt = element("section", "t4-receipt"); receipt.setAttribute("aria-labelledby", "t4-receipt-title");
      const heading = element("div", "t4-receipt-head");
      const title = element("h3", "", "Заказ гостя"); title.id = "t4-receipt-title";
      const help = element("button", "t4-secondary t4-help", "Правила тура"); help.type = "button";
      help.addEventListener("click", () => openDialog(help, "Правила тура", rulesContent())); controls.push(help);
      heading.append(title, help);
      receipt.append(heading, element("p", "t4-receipt-style", question.guestOrder.style), element("p", "t4-wish", question.guestOrder.text));
      const menu = element("div", "t4-menu"); menu.setAttribute("role", "radiogroup"); menu.setAttribute("aria-label", "Меню: выберите одно блюдо");
      question.options.forEach((option, index) => {
        const card = element("article", "t4-menu-card");
        const button = element("button", "t4-menu-select"); button.type = "button";
        button.dataset.optionId = option.id; button.setAttribute("role", "radio");
        button.setAttribute("aria-labelledby", `t4-name-${index}`); button.setAttribute("aria-describedby", `t4-desc-${index}`);
        button.draggable = !win.matchMedia("(pointer: coarse)").matches;
        const title = element("span", "t4-menu-title", option.text); title.id = `t4-name-${index}`;
        const description = element("span", "t4-menu-description", option.description); description.id = `t4-desc-${index}`;
        button.append(photo(option), title, description);
        button.addEventListener("click", () => { if (Date.now() >= suppressClickUntil) select(option.id); });
        button.addEventListener("keydown", (event) => {
          const offsets = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
          if (!(event.key in offsets) && !["Home", "End"].includes(event.key)) return;
          event.preventDefault(); if (locked) return;
          const targetIndex = event.key === "Home" ? 0 : event.key === "End" ? question.options.length - 1 :
            (index + offsets[event.key] + question.options.length) % question.options.length;
          const target = question.options[targetIndex]; select(target.id); cards.get(target.id).focus({ preventScroll: true });
        });
        button.addEventListener("dragstart", (event) => {
          if (locked || !button.draggable) { event.preventDefault(); return; }
          draggingId = option.id; button.classList.add("is-dragging");
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData("application/x-nko-t4", JSON.stringify({ questionId: question.id, optionId: option.id }));
          ghost = element("div", "t4-drag-ghost"); ghost.append(photo(option), element("strong", "", option.text));
          shell.append(ghost); event.dataTransfer.setDragImage(ghost, 110, 50);
        });
        button.addEventListener("dragend", cancelDrag);
        const zoom = element("button", "t4-secondary t4-zoom", "Увеличить фото"); zoom.type = "button";
        zoom.setAttribute("aria-label", `Увеличить фото: ${option.text}`);
        zoom.addEventListener("click", () => openDialog(zoom, option.text, photo(option, "t4-zoom-photo")));
        controls.push(button, zoom); cards.set(option.id, button); card.append(button, zoom); menu.append(card);
      });
      tray = element("section", "t4-tray"); tray.setAttribute("aria-label", "Поднос: ваш выбор");
      tray.append(element("h3", "", "Ваш выбор"), element("p", "t4-hint", "Нажмите на блюдо или перетащите его сюда мышью"));
      traySelection = element("div", "t4-tray-selection");
      const actions = element("div", "t4-tray-actions");
      clearButton = element("button", "t4-secondary t4-clear", "Убрать"); clearButton.type = "button";
      clearButton.addEventListener("click", () => {
        if (locked) return;
        const previous = model.getAnswer().selectedOptionId; model.clear(); update(true); persist();
        (cards.get(previous) || cards.values().next().value).focus({ preventScroll: true });
      }); controls.push(clearButton);
      submitButton.type = "button"; actions.append(clearButton, submitButton);
      status = element("p", "t4-status"); status.setAttribute("role", "status");
      storageNote = element("p", "t4-hint", "Хранилище браузера недоступно: черновик сохраняется только до перезагрузки страницы.");
      storageNote.hidden = storageAvailable;
      tray.append(traySelection, status, actions, storageNote);
      tray.addEventListener("dragover", (event) => { if (draggingId && !locked) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; tray.classList.add("is-over"); } });
      tray.addEventListener("dragleave", (event) => { if (!tray.contains(event.relatedTarget)) tray.classList.remove("is-over"); });
      tray.addEventListener("drop", (event) => {
        if (!draggingId || locked) return;
        event.preventDefault();
        try {
          const value = JSON.parse(event.dataTransfer.getData("application/x-nko-t4"));
          if (value.questionId === question.id && value.optionId === draggingId) select(value.optionId);
        } catch { /* Foreign or cancelled drags never change the choice. */ }
        cancelDrag();
      });
      shell.append(receipt, element("p", "t4-menu-heading", "Меню · выберите одну позицию"), menu, tray, dialog);
      update(false);
    }
    if (started) renderActivity();
    else {
      onPhase(true); shell.classList.add("t4-intro");
      const start = element("button", "button primary t4-start", "Перейти к заказам"); start.type = "button"; controls.push(start);
      start.addEventListener("click", () => {
        if (locked) return;
        started = true; introSeen.add(introKey); write(introKey, "seen"); renderActivity();
        cards.values().next().value.focus({ preventScroll: true }); onChange(model.getAnswer());
      });
      shell.append(element("h3", "", "Правила тура"), rulesContent(), start);
    }
    return {
      getAnswer: () => started ? model.getAnswer() : {},
      isComplete: () => started && model.isComplete(),
      setLocked(value) {
        locked = Boolean(value);
        for (const control of controls) control.disabled = locked;
        for (const button of cards.values()) button.draggable = !locked && !win.matchMedia("(pointer: coarse)").matches;
        if (locked && draggingId) cancelDrag();
      },
      dispose() {
        cancelDrag(); if (dialog.open) dialog.close(); dialog.remove();
        doc.removeEventListener("keydown", cancelByKey); doc.removeEventListener("pointercancel", cancelPointer);
        placeholder.replaceWith(submitButton);
        if (originalType === null) submitButton.removeAttribute("type"); else submitButton.setAttribute("type", originalType);
        onPhase(false);
      }
    };
  }
  const api = { createState, create };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.T4GuestOrder = api;
})(typeof window !== "undefined" ? window : globalThis);
