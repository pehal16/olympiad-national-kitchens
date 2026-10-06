(function (root) {
  "use strict";
  const introSeen = new Set();
  function createState(initial) {
    let text = typeof initial?.text === "string" ? initial.text.slice(0, 120) : "";
    return {
      setText(value) { text = String(value).slice(0, 120); },
      getAnswer: () => ({ text }),
      isComplete: () => text.trim().length >= 2
    };
  }
  function create({ mount, question, attemptId, submitButton, onChange, onPhase }) {
    const doc = mount.ownerDocument;
    const win = doc.defaultView;
    const introKey = `nko_t3_intro_v1_${attemptId}`;
    const draftKey = `nko_t3_draft_v1_${attemptId}_${question.id}`;
    const read = (key) => { try { return win.localStorage.getItem(key); } catch { return null; } };
    const write = (key, value) => { try { win.localStorage.setItem(key, value); } catch { /* Memory-only draft remains usable. */ } };
    const model = createState(question.savedAnswer || { text: read(draftKey) || "" });
    let started = question.sequenceInTour !== 1 || introSeen.has(introKey) || read(introKey) === "seen" || Boolean(question.savedAnswer);
    let input, clear, locked = true, focusPending = true, disposed = false;
    function focusAnswer() {
      if (disposed || locked || !input?.isConnected || input.disabled || input.closest('[inert]')) return;
      if (focusPending) {
        input.focus({ preventScroll: true });
        focusPending = doc.activeElement !== input;
      }
    }
    const placeholder = doc.createComment("shared submit button location");
    submitButton.before(placeholder);
    const originalType = submitButton.getAttribute("type");
    const shell = doc.createElement("section");
    shell.className = "t3-dossier";
    mount.append(shell);
    const element = (tag, className, text) => {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const changed = () => { write(draftKey, model.getAnswer().text); onChange(model.getAnswer()); };
    const viewportChanged = () => {
      if (doc.activeElement !== input || !win.visualViewport || win.visualViewport.height > 500) return;
      // Keep both input and confirm accessible when a keyboard shrinks the viewport.
      win.requestAnimationFrame(() => submitButton.scrollIntoView({ block: "nearest", behavior: "instant" }));
    };
    function renderActivity() {
      onPhase(false);
      shell.replaceChildren();
      const scene = element("div", "t3-evidence");
      const visual = element("figure", "t3-visual");
      const img = element("img");
      img.src = question.imageUrl;
      img.alt = question.imageAlt;
      img.width = 900; img.height = 600;
      img.decoding = "async";
      const fallback = element("p", "t3-image-fallback", "Иллюстрация недоступна. Используйте три подсказки — их достаточно для ответа.");
      fallback.hidden = true;
      img.addEventListener("error", () => { img.hidden = true; fallback.hidden = false; });
      visual.append(img, fallback);
      const clues = element("ol", "t3-clues");
      question.clues.forEach((clue, index) => {
        const card = element("li", "t3-clue");
        card.style.setProperty("--clue-order", index);
        card.append(element("span", "t3-clue-label", clue.label), element("p", "t3-clue-text", clue.text));
        clues.append(card);
      });
      scene.append(visual, clues);
      const form = element("form", "t3-answer-form");
      form.addEventListener("submit", (event) => { event.preventDefault(); if (!submitButton.disabled) submitButton.click(); });
      const label = element("label", "t3-answer-label", "Название блюда");
      label.htmlFor = "t3-answer-input";
      input = element("input", "t3-answer-input");
      input.id = "t3-answer-input"; input.type = "text"; input.name = "dish-name";
      input.maxLength = 120; input.autocomplete = "off"; input.spellcheck = false;
      input.setAttribute("autocorrect", "off"); input.setAttribute("autocapitalize", "none");
      input.setAttribute("enterkeyhint", "done"); input.setAttribute("aria-describedby", "t3-answer-hint");
      input.placeholder = "Введите название блюда";
      input.value = model.getAnswer().text;
      input.addEventListener("input", () => { model.setText(input.value); changed(); });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.isComposing) {
          event.preventDefault(); if (!submitButton.disabled) submitButton.click();
        }
      });
      input.addEventListener("focus", viewportChanged);
      const hint = element("p", "t3-answer-hint", "Небольшие опечатки учитываются автоматически");
      hint.id = "t3-answer-hint";
      const actions = element("div", "t3-answer-actions");
      clear = element("button", "t3-clear", "Очистить");
      clear.type = "button";
      clear.addEventListener("click", () => { model.setText(""); input.value = ""; changed(); input.focus(); });
      submitButton.type = "button";
      actions.append(submitButton, clear);
      form.append(label, input, hint, actions);
      shell.append(scene, form);
      focusPending = true;
      focusAnswer();
    }
    win.visualViewport?.addEventListener("resize", viewportChanged);
    if (started) renderActivity();
    else {
      onPhase(true);
      shell.classList.add("t3-intro");
      const list = element("ul", "t3-intro-rules");
      ["Определите блюдо по трём коротким подсказкам.", "Введите одно название — без списка вариантов.",
        "Правильный ответ — 3 балла, ошибочный — 0. Штрафов нет.",
        "Небольшие опечатки учитываются. После подтверждения возврата к вопросу нет.",
        "Ответы проверяются на сервере; правильные названия во время тура не показываются."]
        .forEach((text) => list.append(element("li", "", text)));
      const start = element("button", "button primary t3-start", "Начать тур"); start.type = "button";
      start.addEventListener("click", () => {
        started = true; introSeen.add(introKey); write(introKey, "seen");
        shell.classList.remove("t3-intro"); renderActivity();
        focusAnswer();
        onChange(model.getAnswer());
      });
      shell.append(element("p", "t3-intro-kicker", "Перед началом"), element("h3", "", "Правила тура"),
        element("p", "t3-intro-facts", "10 заданий · 30 баллов · 8 минут"), list,
        element("p", "t3-answer-hint", "Время тура уже идёт: чтение правил входит в 8 минут."), start);
    }
    return {
      getAnswer: () => started ? model.getAnswer() : {},
      isComplete: () => started && model.isComplete(),
      setLocked(value) {
        if (locked !== Boolean(value)) focusPending = true;
        locked = Boolean(value);
        if (input) input.disabled = locked;
        if (clear) clear.disabled = locked;
        focusAnswer();
      },
      dispose() {
        disposed = true;
        win.visualViewport?.removeEventListener("resize", viewportChanged);
        placeholder.replaceWith(submitButton);
        if (originalType === null) submitButton.removeAttribute("type"); else submitButton.setAttribute("type", originalType);
        onPhase(false);
      }
    };
  }
  const api = { createState, create };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.T3Detective = api;
})(typeof window !== "undefined" ? window : globalThis);
