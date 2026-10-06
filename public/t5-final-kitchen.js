(function (root) {
  "use strict";
  const introSeen = new Set(), memoryDrafts = new Map();
  let sceneModule;
  const rules = [
    "На каждой станции выберите одно блюдо. После подтверждения выбора изменить блюдо нельзя.",
    "Для блюда доступны восемь компонентов. Выберите ровно четыре: нажмите на карточку или перетащите её на блюдо мышью.",
    "Компонент можно убрать повторным нажатием, из списка выбранного или кнопкой «Очистить выбор».",
    "Каждый правильный компонент приносит 4 балла, ложный — 0. Штрафов нет; порядок добавления не оценивается.",
    "Нажмите «Подтвердить блюдо», чтобы отправить состав. После сохранения вернуться к станции нельзя. Правильность во время тура не показывается."
  ];
  function createState(question, initial) {
    const dish = question.selectedDish;
    const ids = new Set((dish?.items || []).map(item => item.id));
    let selected = initial?.dishId === dish?.id && Array.isArray(initial?.selectedIngredientIds) ?
      [...new Set(initial.selectedIngredientIds)].filter(id => ids.has(id)).slice(0, 4) : [];
    return {
      add(id) { if (!ids.has(id) || selected.includes(id) || selected.length >= 4) return false; selected.push(id); return true; },
      toggle(id) { if (!ids.has(id)) return false; if (selected.includes(id)) { selected = selected.filter(value => value !== id); return true; } return this.add(id); },
      remove(id) { selected = selected.filter(value => value !== id); },
      clear() { selected = []; },
      getAnswer: () => dish ? { dishId: dish.id, selectedIngredientIds: [...selected] } : {},
      isComplete: () => Boolean(dish && selected.length === 4)
    };
  }
  function create({ mount, question, attemptId, submitButton, onChange, onPhase, lockDish, inlineIntro = false }) {
    if (question.presentationVersion === 4) return root.T5PhotoKitchen.create({ mount, question, attemptId, submitButton, onChange, onPhase, inlineIntro });
    const doc = mount.ownerDocument, win = doc.defaultView;
    const scope = `${attemptId}_${question.presentationVersion}`;
    const introKey = `nko_t5_intro_${scope}`;
    const dish = question.selectedDish;
    const draftKey = `nko_t5_draft_${scope}_${question.id}_${dish?.id || "unselected"}`;
    let storageAvailable = true, locked = false, disposed = false, draggingId = null, ghost = null, suppressClickUntil = 0;
    const read = key => { try { return win.localStorage.getItem(key); } catch { storageAvailable = false; return null; } };
    const write = (key, value) => { try { win.localStorage.setItem(key, value); } catch { storageAvailable = false; } };
    let stored; try { stored = JSON.parse(read(draftKey)); } catch { stored = null; }
    const model = createState(question, question.savedAnswer || stored || memoryDrafts.get(draftKey));
    let started = Boolean(dish || question.sequenceInTour !== 1 || introSeen.has(introKey) || read(introKey) === "seen");
    const element = (tag, className, text) => {
      const node = doc.createElement(tag); if (className) node.className = className;
      if (text !== undefined) node.textContent = text; return node;
    };
    const shell = element("section", "t5-kitchen"); mount.append(shell);
    const placeholder = doc.createComment("shared submit button location"); submitButton.before(placeholder);
    const originalType = submitButton.getAttribute("type");
    const controls = [], cards = new Map();
    let scene, layerMount, rendererMount, selectedList, counter, mobileCounter, status, storageNote, sceneNotice, visualRenderer, mediaRetry;
    function retryImages() {
      shell.querySelectorAll(".t5-photo-missing:not([hidden])").forEach(missing => {
        const img = missing.parentElement.querySelector("img");
        if (!img) return;
        missing.hidden = true; img.hidden = false;
        const url = img.getAttribute("src"); img.removeAttribute("src"); img.src = url;
      });
      if (dish) { sceneModule = null; loadVisual(); }
      if (mediaRetry) mediaRetry.hidden = true;
    }
    function createRetry() {
      mediaRetry = button("Повторить загрузку изображений", "t5-secondary t5-media-retry", retryImages);
      mediaRetry.hidden = true; return mediaRetry;
    }
    let visualRevision = 0, visualRotation = 0;
    const dialog = element("dialog", "t5-dialog"); dialog.setAttribute("aria-labelledby", "t5-dialog-title");
    let dialogTrigger;
    function closeDialog() {
      if (dialog.open) dialog.close(); if (!disposed) dialogTrigger?.focus({ preventScroll: true });
    }
    dialog.addEventListener("cancel", event => { event.preventDefault(); if (!locked) closeDialog(); });
    function openDialog(trigger, title, content, buttons) {
      if (locked) return;
      dialogTrigger = trigger;
      const heading = element("h3", "", title); heading.id = "t5-dialog-title";
      dialog.replaceChildren(heading, content, buttons); dialog.showModal();
      buttons.querySelector("button")?.focus();
    }
    function button(text, className = "t5-secondary", action) {
      const control = element("button", className, text); control.type = "button";
      if (action) control.addEventListener("click", action); controls.push(control); return control;
    }
    function rulesContent() {
      const body = element("div"), list = element("ul", "t5-rules");
      rules.forEach(text => list.append(element("li", "", text)));
      body.append(list, element("p", "t5-time-note", "Время тура уже идёт: чтение правил входит в 15 минут.")); return body;
    }
    function photo(url, alt, className, hero = false) {
      const frame = element("span", className), img = element("img");
      img.src = url; img.alt = alt; img.decoding = "async"; img.draggable = false;
      img.width = hero ? 900 : 768; img.height = hero ? 600 : 768;
      const missing = element("span", "t5-photo-missing", "Изображение недоступно"); missing.hidden = true;
      img.addEventListener("error", () => { img.hidden = true; missing.hidden = false; if (mediaRetry) mediaRetry.hidden = false; });
      frame.append(img, missing); return frame;
    }
    function persist() {
      const answer = model.getAnswer(); memoryDrafts.set(draftKey, answer); write(draftKey, JSON.stringify(answer));
      if (storageNote) storageNote.hidden = storageAvailable;
      onChange(answer);
    }
    function selectedItems() { const ids = model.getAnswer().selectedIngredientIds || []; return (dish?.items || []).filter(item => ids.includes(item.id)); }
    function fallbackLayers() {
      if (!layerMount) return;
      const nodes = [];
      const add = (url, descriptor, label) => {
        const layer = element("div", "t5-layer"), image = element("img");
        image.src = url; image.alt = ""; image.draggable = false; image.setAttribute("aria-hidden", "true");
        layer.style.width = `${descriptor.width / 5.4 * 100}%`;
        layer.style.aspectRatio = String(1 / descriptor.aspect);
        layer.style.left = `${50 + descriptor.x / 5.4 * 100}%`;
        layer.style.top = `${50 + descriptor.z / 5.4 * 100}%`;
        layer.style.zIndex = String(Math.round(descriptor.level * 10 + 10));
        layer.style.transform = `translate(-50%, -50%) rotate(${descriptor.angle}rad)`;
        if (descriptor.crop) {
          const [start, span] = descriptor.crop; layer.classList.add("t5-layer-cropped");
          image.style.width = `${100 / span}%`; image.style.left = `${-start / span * 100}%`;
        }
        image.addEventListener("error", () => {
          if (!disposed) sceneNotice.textContent = `Изображение «${label}» недоступно. Ваш выбор не изменён.`;
        });
        layer.append(image); nodes.push(layer);
      };
      if (dish.baseImageUrl) add(dish.baseImageUrl, { width: 4.5, aspect: 1, x: 0, z: 0, level: -1, angle: 0 }, "Основа");
      selectedItems().forEach(item => {
        (item.scene.parts || [item.scene]).forEach(part => add(item.layerImageUrl, part, item.text));
      });
      layerMount.replaceChildren(...nodes);
      layerMount.style.transform = `rotate(${visualRotation}rad)`;
      scene.setAttribute("aria-label", `Сборка блюда «${dish.title}». Выбрано: ${selectedItems().map(item => item.text).join(", ") || "пока нет компонентов"}.`);
    }
    function showFallback(message) {
      if (disposed) return;
      visualRenderer?.dispose(); visualRenderer = null;
      rendererMount.hidden = true; layerMount.parentElement.hidden = false;
      sceneNotice.textContent = message || "2D-режим: состав и оценка не меняются.";
      fallbackLayers();
    }
    async function loadVisual() {
      const revision = ++visualRevision;
      visualRenderer?.dispose(); visualRenderer = null;
      if (layerMount) layerMount.parentElement.hidden = false;
      try {
      sceneModule ||= import("/assets/runtime/dish-final-kitchen-3d.js?v=1.7.0-t5kitchen2");
        const module = await sceneModule;
        if (disposed || revision !== visualRevision) return;
        rendererMount.hidden = false;
        const mounted = module.mountFinalKitchenScene(rendererMount, { dish,
          onContextLost: () => showFallback("3D недоступен. Продолжайте сборку в 2D: состав и оценка не меняются.") });
        visualRenderer = mounted;
        await mounted.setSelection(selectedItems());
        if (disposed || revision !== visualRevision || mounted !== visualRenderer) { mounted.dispose(); return; }
        layerMount.parentElement.hidden = true;
        sceneNotice.textContent = dish.presentationVersion === 2 ?
          "Поворачивайте блюдо мышью, пальцем или кнопками. Мышью можно также наклонить вид." :
          "Поверните блюдо мышью или кнопками. На телефоне используйте кнопки.";
      } catch {
        if (!disposed && revision === visualRevision) showFallback();
      }
    }
    function update(animate) {
      if (!dish || !selectedList) return;
      const selected = selectedItems(), ids = new Set(selected.map(item => item.id));
      cards.forEach((control, id) => {
        control.setAttribute("aria-pressed", String(ids.has(id))); control.classList.toggle("is-selected", ids.has(id));
      });
      counter.textContent = `Выбрано: ${selected.length} из 4`;
      mobileCounter.textContent = counter.textContent;
      selectedList.replaceChildren();
      selected.forEach(item => {
        const row = element("li", "t5-selected-row");
        const remove = element("button", "t5-remove", ""); remove.type = "button";
        remove.setAttribute("aria-label", `Убрать: ${item.text}`);
        remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
        remove.disabled = locked;
        remove.addEventListener("click", () => { if (locked) return; model.remove(item.id); update(true); persist(); cards.get(item.id)?.focus({ preventScroll: true }); });
        row.append(photo(item.imageUrl, "", "t5-selected-photo"), element("span", "", item.text), remove);
        selectedList.append(row);
      });
      status.textContent = selected.length === 4 ? "Четыре компонента выбраны. Состав ещё не отправлен." :
        selected.length ? `Добавьте ещё ${4 - selected.length} компонента.` : "Выберите четыре компонента из восьми.";
      if (animate) { selectedList.classList.remove("t5-selection-enter"); void selectedList.offsetWidth; selectedList.classList.add("t5-selection-enter"); }
      fallbackLayers();
      if (visualRenderer) visualRenderer.setSelection(selected).catch(() => showFallback());
    }
    function choose(id, addOnly = false) {
      if (locked) return;
      if (!(addOnly ? model.add(id) : model.toggle(id))) {
        if (!model.getAnswer().selectedIngredientIds.includes(id)) status.textContent = "Уже выбраны четыре компонента. Сначала уберите один из них.";
        return;
      }
      update(true); persist();
    }
    function cancelDrag() {
      if (draggingId) suppressClickUntil = Date.now() + 220;
      draggingId = null; ghost?.remove(); ghost = null; scene?.classList.remove("is-over");
    }
    const cancelByKey = event => { if (event.key === "Escape" && draggingId) cancelDrag(); };
    doc.addEventListener("keydown", cancelByKey);
    function renderChoice() {
      onPhase("choice"); shell.replaceChildren();
      const title = element("h3", "t5-station-title", `Станция ${question.station.number} · ${question.station.title}`);
      const choices = element("div", "t5-dish-choices");
      question.dishes.forEach(choice => {
        const card = element("article", "t5-dish-card");
        const select = button("Выбрать блюдо", "t5-secondary t5-choice-button", () => {
          const body = element("div");
          body.append(element("p", "", `Вы выбрали: ${choice.title}. Продолжить?`),
            element("p", "t5-hint", "После подтверждения выбор на этой станции нельзя изменить."));
          const actions = element("div", "t5-dialog-actions");
          const confirm = button("Начать сборку", "button primary t5-confirm-choice", async () => {
            if (locked) return;
            const error = element("p", "t5-dialog-error"); error.setAttribute("role", "alert");
            body.querySelector(".t5-dialog-error")?.remove(); body.append(error);
            try { await lockDish(choice.id); }
            catch (failure) { if (!disposed) { error.textContent = failure.message || "Выбор не подтверждён. Повторите отправку."; confirm.focus(); } }
          });
          actions.append(confirm, button("Вернуться к выбору", "t5-secondary", closeDialog));
          openDialog(select, "Готовить это блюдо?", body, actions);
        });
        card.append(photo(choice.previewUrl, choice.previewAlt, "t5-dish-photo", true),
          element("h4", "", choice.title), element("p", "t5-hint", choice.cuisineLabel),
          element("p", "t5-choice-fact", "Собрать 4 компонента из 8"), select); choices.append(card);
      });
      shell.append(title, element("p", "t5-choice-instruction", "Выберите блюдо для этой станции."), choices, createRetry(), dialog);
      submitButton.hidden = true;
    }
    function renderAssembly() {
      onPhase("assembly"); shell.replaceChildren();
      const heading = element("div", "t5-assembly-heading");
      heading.append(element("h3", "", dish.title), element("p", "t5-hint", dish.variantLabel),
        element("p", "t5-instruction", "Выберите 4 компонента из 8. Порядок добавления не оценивается."));
      const workspace = element("div", "t5-workspace"), visual = element("section", "t5-visual");
      scene = element("div", `t5-scene t5-preset-${dish.modelPreset}`); scene.setAttribute("role", "img");
      const fallback = element("div", "t5-flat-scene");
      const vessel = element("div", `t5-vessel t5-vessel-${dish.modelPreset}`);
      layerMount = element("div", "t5-layers"); fallback.append(vessel, layerMount);
      rendererMount = element("div", "t5-webgl"); rendererMount.hidden = true; scene.append(fallback, rendererMount);
      const rotations = element("div", "t5-rotations");
      for (const [text, delta, pathData] of [
        ["Влево", -.35, "M4 10a8 8 0 1 1 1 9M4 4v6h6"], ["Вправо", .35, "M20 10a8 8 0 1 0-1 9M20 4v6h-6"],
        ["Сбросить вид", 0, "M12 3v4m0 10v4M3 12h4m10 0h4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10"]]) {
        const rotate = button(text, "t5-secondary t5-rotate", () => {
          if (delta) { visualRotation += delta; visualRenderer?.rotateBy(delta); }
          else { visualRotation = 0; visualRenderer?.resetView(); }
          fallbackLayers();
        });
        const icon = element("span", "t5-icon"); icon.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${pathData}"/></svg>`;
        rotate.prepend(icon); rotations.append(rotate);
      }
      sceneNotice = element("p", "t5-scene-notice", "Загружаем сцену. Можно выбирать компоненты."); sceneNotice.setAttribute("role", "status");
      visual.append(scene, rotations, sceneNotice);
      mobileCounter = element("p", "t5-mobile-counter"); mobileCounter.setAttribute("aria-live", "polite");
      visual.append(mobileCounter);
      const summary = element("section", "t5-summary");
      counter = element("h3"); selectedList = element("ul", "t5-selected-list");
      status = element("p", "t5-status"); status.setAttribute("role", "status");
      const clear = button("Очистить выбор", "t5-clear", () => { if (!locked) { model.clear(); update(true); persist(); } });
      submitButton.hidden = false; submitButton.type = "button";
      summary.append(counter, selectedList, status, clear, submitButton);
      storageNote = element("p", "t5-hint", "Хранилище браузера недоступно: черновик сохраняется только до перезагрузки.");
      storageNote.hidden = storageAvailable;
      workspace.append(visual, summary);
      const grid = element("div", "t5-components"); grid.setAttribute("role", "group"); grid.setAttribute("aria-label", "Восемь компонентов: выберите четыре");
      dish.items.forEach(item => {
        const card = button("", "t5-component", () => { if (Date.now() >= suppressClickUntil) choose(item.id); });
        card.dataset.ingredientId = item.id; card.setAttribute("aria-pressed", "false");
        card.setAttribute("aria-label", item.text);
        card.append(photo(item.imageUrl, item.imageAlt, "t5-component-photo"), element("span", "t5-component-name", item.text));
        const check = element("span", "t5-check"); check.setAttribute("aria-hidden", "true");
        check.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg>'; card.append(check);
        card.draggable = !win.matchMedia("(pointer: coarse)").matches;
        card.addEventListener("dragstart", event => {
          if (locked || !card.draggable) { event.preventDefault(); return; }
          draggingId = item.id; event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData("application/x-nko-t5", JSON.stringify({ questionId: question.id, dishId: dish.id, ingredientId: item.id }));
          ghost = card.cloneNode(true); ghost.classList.add("t5-drag-ghost"); shell.append(ghost); event.dataTransfer.setDragImage(ghost, 60, 45);
        });
        card.addEventListener("dragend", cancelDrag); cards.set(item.id, card); grid.append(card);
      });
      scene.addEventListener("dragover", event => { if (draggingId && !locked) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; scene.classList.add("is-over"); } });
      scene.addEventListener("dragleave", event => { if (!scene.contains(event.relatedTarget)) scene.classList.remove("is-over"); });
      scene.addEventListener("drop", event => {
        if (!draggingId || locked) return; event.preventDefault();
        try {
          const value = JSON.parse(event.dataTransfer.getData("application/x-nko-t5"));
          if (value.questionId === question.id && value.dishId === dish.id && value.ingredientId === draggingId) choose(draggingId, true);
        } catch { /* No foreign drag can mutate the answer. */ }
        cancelDrag();
      });
      const help = button("Правила тура", "t5-clear t5-help", () => {
        const actions = element("div", "t5-dialog-actions"); actions.append(button("Закрыть", "t5-secondary", closeDialog));
        openDialog(help, "Правила финальной кухни", rulesContent(), actions);
      });
      shell.append(heading, workspace, grid, storageNote, createRetry(), help, dialog); update(false); loadVisual();
    }
    function renderActivity() { dish ? renderAssembly() : renderChoice(); }
    if (started) renderActivity();
    else {
      onPhase("intro"); shell.classList.add("t5-intro"); submitButton.hidden = true;
      const stations = element("ol", "t5-intro-stations");
      ["Горячая сборка", "Свежая сборка", "Фирменная сборка"].forEach(title => stations.append(element("li", "", title)));
      shell.append(element("h3", "t5-intro-facts", "3 станции · 48 баллов · 15 минут"), stations, rulesContent(),
        button("Открыть кухню", "button primary t5-start", () => {
          if (locked) return; started = true; introSeen.add(introKey); write(introKey, "seen");
          shell.classList.remove("t5-intro"); renderActivity(); shell.querySelector("button")?.focus({ preventScroll: true }); onChange(model.getAnswer());
        }));
    }
    return {
      isFinalKitchen: true,
      getAnswer: () => started ? model.getAnswer() : {}, isComplete: () => started && model.isComplete(),
      setLocked(value) {
        locked = Boolean(value); controls.forEach(control => control.disabled = locked);
        shell.querySelectorAll(".t5-remove").forEach(control => control.disabled = locked);
        cards.forEach(card => card.draggable = !locked && !win.matchMedia("(pointer: coarse)").matches);
        if (locked) cancelDrag();
      },
      dispose() {
        disposed = true; visualRevision++; cancelDrag(); visualRenderer?.dispose();
        if (dialog.open) dialog.close(); dialog.remove(); doc.removeEventListener("keydown", cancelByKey);
        placeholder.replaceWith(submitButton); submitButton.hidden = false;
        if (originalType === null) submitButton.removeAttribute("type"); else submitButton.setAttribute("type", originalType);
        onPhase(null);
      }
    };
  }
  const api = { createState, create };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.T5FinalKitchen = api;
})(typeof window !== "undefined" ? window : globalThis);
