(function (root) {
  "use strict";
  // No checking keys are available here. All visual states describe placement only.
  const introSeen = new Set();
  const rules = [
    "Сопоставьте каждое блюдо со страной, с кухней которой оно связано.",
    "Одна страна — одно блюдо. Перетащите карточку или нажмите блюдо, затем страну.",
    "До подтверждения можно изменить выбор. Кнопка «Вернуть» возвращает блюдо в список.",
    "За каждую верную пару — 1 балл. Ошибка — 0 баллов, без штрафа.",
    "После подтверждения вернуться к заданию нельзя. Правильные ответы во время тура не показываются."
  ];

  function createState(question, saved) {
    const items = new Set(question.items.map((item) => item.id));
    const countries = new Set(question.buckets.map((country) => country.id));
    const placements = {};
    for (const [item, country] of Object.entries(saved?.buckets || {})) {
      if (items.has(item) && countries.has(country) && !Object.values(placements).includes(country)) placements[item] = country;
    }
    return {
      placements,
      assign(item, country) {
        if (!items.has(item) || !countries.has(country)) return { changed: false };
        if (placements[item] === country) return { changed: false };
        const displaced = Object.keys(placements).find((id) => placements[id] === country);
        if (displaced) delete placements[displaced];
        placements[item] = country;
        return { changed: true, displaced };
      },
      undo(item) { delete placements[item]; },
      getAnswer() { return { buckets: { ...placements } }; },
      isComplete() { return Object.keys(placements).length === question.items.length; }
    };
  }

  function create({ mount, question, attemptId, onChange, inlineIntro = false, presentationMode = 'standard' }) {
    const doc = mount.ownerDocument;
    const win = doc.defaultView;
    const model = createState(question, question.savedAnswer);
    const key = `nko_t2_intro_v1_${attemptId}`;
    let seen = introSeen.has(key);
    try { seen ||= win.localStorage.getItem(key) === "seen"; } catch { /* Memory fallback. */ }
    let started = inlineIntro || seen || question.sequenceInTour !== 1 || model.isComplete() || Object.keys(model.placements).length > 0;
    let selected = null;
    let dragging = null;
    let disposeAtlas=null;
    const shell = doc.createElement("section");
    shell.className = "t2-match";
    const restaurant = presentationMode === 'restaurant';
    shell.classList.toggle('restaurant-map', restaurant);
    mount.append(shell);
    const element = (tag, className, text) => {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text) node.textContent = text;
      if (tag === "button") node.type = "button";
      return node;
    };
    function ruleList() {
      const list = element("ol", "t2-rules");
      rules.forEach((text) => list.append(element("li", "", text)));
      return list;
    }
    function renderActivity() {
      shell.replaceChildren();
      const toolbar = element("div", "t2-toolbar");
      const instruction = element("p", "t2-instruction", restaurant ? "1. Выберите блюдо. 2. Нажмите страну на карте." : "Перетащите блюдо к стране или нажмите блюдо, затем страну.");
      const help = element("details", "t2-help");
      help.append(element("summary", "", "Как выполнять"), ruleList());
      toolbar.append(instruction, help);
      const countries = element("div", "t2-countries");
      countries.setAttribute("aria-label", "Страны для сопоставления");
      const bank = element("div", "t2-bank");
      const preview=element('div','t2-selected-preview');preview.hidden=true;preview.setAttribute('aria-live','polite');
      bank.setAttribute("aria-label", "Блюда");
      const progress = element("p", "t2-progress");
      const status = element("p", "t2-status");
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      shell.append(toolbar, countries, element("h3", "t2-bank-title", "Блюда"), bank, progress, status);
      const nodes = new Map();
      const slots = new Map();
      const zones = new Map();
      const coarse = win.matchMedia("(pointer: coarse)").matches;
      // The same tap-to-match action stays within thumb reach without scrolling
      // from the photo bank back to the country grid on a narrow touch screen.
      const picker = element("div", "t2-mobile-picker");
      picker.hidden = true;
      picker.setAttribute("role", "group");
      const pickerLabel = element("strong", "t2-picker-label");
      const pickerCancel = element("button", "t2-picker-cancel", "Отмена");
      pickerCancel.addEventListener("click", () => { selected = null; sync(); announce("Выбор отменён."); });
      const pickerHead = element("div", "t2-picker-head");
      pickerHead.append(pickerLabel, pickerCancel);
      const pickerOptions = element("div", "t2-picker-options");
      const pickerButtons = new Map();
      picker.append(pickerHead, pickerOptions); shell.append(picker);
      function announce(text) { status.textContent = text; }
      function select(id) {
        selected = selected === id ? null : id;
        sync();
        announce(selected ? `Выбрано: ${nodes.get(id).item.text}. ${restaurant?'Теперь нажмите страну на карте.':'Теперь выберите страну.'}` : "Выбор отменён.");
        if(restaurant&&selected&&countries.getBoundingClientRect().bottom<80)countries.scrollIntoView({block:'center',behavior:win.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
      }
      function assign(id, country) {
        const oldRects = new Map([...nodes].map(([item, entry]) => [item, entry.button.getBoundingClientRect()]));
        const result = model.assign(id, country);
        selected = null;
        dragging = null;
        sync();
        if (result.changed) {
          announce(`${nodes.get(id).item.text} → ${zones.get(country).country.label}.${result.displaced ? ` ${nodes.get(result.displaced).item.text} возвращено в список блюд.` : ""}`);
          if (!win.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            nodes.forEach(({ button }, item) => {
              const before = oldRects.get(item), after = button.getBoundingClientRect();
              if (button.animate && Math.abs(before.x - after.x) + Math.abs(before.y - after.y) > 1) {
                button.animate([{ transform: `translate(${before.x - after.x}px,${before.y - after.y}px)` }, { transform: "translate(0,0)" }], { duration: 180, easing: "ease-out" });
              }
            });
          }
          nodes.get(id).button.focus({ preventScroll: true });
          onChange(model.getAnswer());
        }
      }
      question.buckets.forEach((country) => {
        const zone = element("article", "t2-country");
        zone.dataset.countryId = country.id;
        const target = element("button", "t2-target");
        const flag = element("img", "t2-flag");
        flag.src = country.flagUrl; flag.alt = ""; flag.width = 40; flag.height = 30;
        flag.addEventListener("error", () => { flag.hidden = true; });
        target.append(flag, element("span", "", country.label));
        const holder = element("div", "t2-holder");
        const empty = element(restaurant ? "div" : "button", "t2-empty", "Выберите блюдо");
        empty.setAttribute("aria-label", `Разместить выбранное блюдо: ${country.label}`);
        const undo = element("button", "t2-undo", "Вернуть");
        undo.addEventListener("click", () => {
          const id = Object.keys(model.placements).find((item) => model.placements[item] === country.id);
          if (!id) return;
          model.undo(id); selected = null; sync();
          nodes.get(id).button.focus({ preventScroll: true });
          announce(`${nodes.get(id).item.text} возвращено в список блюд.`); onChange(model.getAnswer());
        });
        const placeSelected = () => {
          if (selected) assign(selected, country.id);
          else announce("Сначала выберите блюдо, затем страну.");
        };
        target.addEventListener("click", placeSelected); empty.addEventListener("click", placeSelected);
        const quick = element("button", "t2-picker-country");
        quick.dataset.countryId = country.id;
        const quickFlag = flag.cloneNode();
        quickFlag.addEventListener("error", () => { quickFlag.hidden = true; });
        const quickText = element("span", "t2-picker-country-text");
        const occupied = element("small", "");
        quickText.append(element("span", "", country.label), occupied);
        quick.append(quickFlag, quickText);
        quick.addEventListener("click", placeSelected);
        pickerOptions.append(quick); pickerButtons.set(country.id, { quick, occupied });
        zone.append(target, holder, undo); countries.append(zone);
        zones.set(country.id, { country, zone, target, holder, empty, undo });
        zone.addEventListener("dragover", (event) => {
          if (!dragging) return;
          event.preventDefault(); event.dataTransfer.dropEffect = "move";
          zone.classList.add("is-over");
        });
        zone.addEventListener("dragleave", (event) => { if (!zone.contains(event.relatedTarget)) zone.classList.remove("is-over"); });
        zone.addEventListener("drop", (event) => {
          event.preventDefault(); zone.classList.remove("is-over");
          try {
            const data = JSON.parse(event.dataTransfer.getData("text/plain"));
            if (data.questionId === question.id && data.itemId === dragging && nodes.has(data.itemId)) assign(data.itemId, country.id);
          } catch { /* Ignore external/foreign drags. */ }
        });
      });
      question.items.forEach((item) => {
        const slot = element("div", "t2-bank-slot");
        const placeholder = element("span", "t2-placed-marker", `${item.text} · размещено`);
        const button = element("button", "t2-dish");
        button.dataset.itemId = item.id;
        button.draggable = !coarse;
        const photo = element("div", "t2-photo");
        const img = element("img", ""); if(restaurant&&root.RestaurantMedia)root.RestaurantMedia.setImage(img,item.imageUrl,'card');else img.src = item.imageUrl; img.alt = item.imageAlt;
        img.width = 900; img.height = 600; img.draggable = false;
        const missing = element("span", "t2-photo-missing", "Фото недоступно"); missing.hidden = true;
        img.addEventListener("error", () => { img.hidden = true; missing.hidden = false; });
        photo.append(img, missing);
        const assignedLabel=element('small','t2-assigned-label');assignedLabel.hidden=true;
        button.append(photo, element("span", "t2-dish-name", item.text),assignedLabel);
        button.addEventListener("click", () => select(item.id));
        button.addEventListener("dragstart", (event) => {
          dragging = item.id; selected = item.id;
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", JSON.stringify({ questionId: question.id, itemId: item.id }));
          sync(); button.classList.add("is-dragging");
        });
        button.addEventListener("dragend", () => {
          dragging = null; button.classList.remove("is-dragging");
          zones.forEach(({ zone }) => zone.classList.remove("is-over"));
        });
        if (restaurant) slot.append(button, root.RestaurantLayout.zoomButton(item.imageUrl, item.imageAlt));
        bank.append(slot); slots.set(item.id, { slot, placeholder }); nodes.set(item.id, { button, item });
      });
      function sync() {
        preview.hidden=!selected||Boolean(dragging);
        if(selected){const item=nodes.get(selected).item;const thumbnail=element('img');root.RestaurantMedia?.setImage(thumbnail,item.imageUrl,'card');thumbnail.alt='';const name=element('span','',item.text+' · теперь выберите страну');preview.replaceChildren(thumbnail,name);}
        const focused = doc.activeElement;
        picker.hidden = restaurant || !selected || !coarse;
        if (selected) {
          pickerLabel.textContent = `Страна для: ${nodes.get(selected).item.text}`;
          picker.setAttribute("aria-label", pickerLabel.textContent);
        }
        zones.forEach(({ zone, holder, empty, target, country, undo }) => {
          const item = Object.keys(model.placements).find((id) => model.placements[id] === country.id);
          zone.classList.toggle("is-ready", Boolean(selected));
          target.setAttribute("aria-label", `${country.label}${item ? `: ${nodes.get(item).item.text}. Разместить выбранное блюдо` : ": разместить выбранное блюдо"}`);
          undo.hidden = !item;
          undo.setAttribute("aria-label", `Вернуть ${item ? nodes.get(item).item.text : "блюдо"} из ${country.label}`);
          const { quick, occupied } = pickerButtons.get(country.id);
          occupied.textContent = item ? `Занято: ${nodes.get(item).item.text}` : "Свободно";
          quick.setAttribute("aria-label", `${country.label}. ${occupied.textContent}`);
          if (restaurant) {
            if(item){const assigned=nodes.get(item).item,thumb=element('img','t2-map-dish');root.RestaurantMedia.setImage(thumb,assigned.imageUrl,'card');thumb.alt='';thumb.addEventListener('error',()=>{thumb.hidden=true;});empty.replaceChildren(thumb,element('span','',assigned.text));}
            else empty.textContent='Выберите блюдо';
            if (empty.parentNode !== holder) holder.replaceChildren(empty);
            zone.classList.toggle('has-dish',Boolean(item));
          } else {
            if (!item && empty.parentNode !== holder) holder.replaceChildren(empty);
            if (item && nodes.get(item).button.parentNode !== holder) holder.replaceChildren(nodes.get(item).button);
          }
        });
        nodes.forEach(({ button, item }, id) => {
          const { slot, placeholder } = slots.get(id);
          const placed = Boolean(model.placements[id]);
          button.classList.toggle("is-selected", id === selected);
          button.classList.toggle("is-assigned", placed);
          button.setAttribute("aria-pressed", id === selected ? "true" : "false");
          button.setAttribute("aria-label", `${item.text}${placed ? `, размещено: ${zones.get(model.placements[id]).country.label}` : ""}. Выбрать блюдо`);
          const label=button.querySelector('.t2-assigned-label');label.hidden=!restaurant||!placed;label.textContent=placed?'Ваш выбор: '+zones.get(model.placements[id]).country.label:'';
          if (!restaurant) {
            if (placed && placeholder.parentNode !== slot) slot.replaceChildren(placeholder);
            if (!placed && button.parentNode !== slot) slot.replaceChildren(button);
          }
        });
        progress.textContent = `Сопоставлено: ${Object.keys(model.placements).length} из ${question.items.length}`;
        if (focused && shell.contains(focused) && doc.activeElement !== focused) focused.focus({ preventScroll: true });
      }
      if(restaurant&&root.RestaurantAtlas){
        const menu=element('aside','t2-atlas-menu'),title=shell.querySelector('.t2-bank-title');
        const workspace=element('div','t2-atlas-workspace');countries.before(workspace);workspace.append(countries,menu);menu.append(title,bank);
        disposeAtlas=root.RestaurantAtlas.attach(countries,question.buckets);
        countries.before(preview);
        status.classList.add('t2-atlas-selection');status.textContent='Выберите любое блюдо в наборе, затем его страну на карте.';
      }
      sync();
    }
    const keydown = (event) => {
      if (event.key === "Escape" && selected) {
        event.preventDefault(); selected = null;
        shell.querySelectorAll(".is-selected").forEach((node) => { node.classList.remove("is-selected"); node.setAttribute("aria-pressed", "false"); });
        shell.querySelectorAll(".is-ready").forEach((node) => node.classList.remove("is-ready"));
        shell.querySelector(".t2-mobile-picker").hidden = true;
        const preview=shell.querySelector('.t2-selected-preview');if(preview)preview.hidden=true;
        shell.querySelector(".t2-status").textContent = "Выбор отменён.";
      }
    };
    shell.addEventListener("keydown", keydown);
    if (started) renderActivity();
    else {
      shell.classList.add("t2-intro");
      shell.append(element("p", "t2-intro-kicker", "Перед началом"), element("h3", "", "Правила тура"),
        element("p", "t2-intro-facts", "5 заданий · 20 сопоставлений · 20 баллов · 6 минут"), ruleList(),
        element("p", "t2-timer-note", "Время тура уже идёт: чтение правил входит в 6 минут."));
      const start = element("button", "button primary t2-start", "Начать тур");
      start.addEventListener("click", () => {
        started = true; introSeen.add(key);
        try { win.localStorage.setItem(key, "seen"); } catch { /* Memory fallback. */ }
        shell.classList.remove("t2-intro"); renderActivity();
        shell.querySelector(".t2-dish").focus({ preventScroll: true }); onChange(model.getAnswer());
      });
      shell.append(start);
    }
    return { getAnswer: () => model.getAnswer(), isComplete: () => started && model.isComplete(), dispose: () => {disposeAtlas?.();shell.removeEventListener("keydown", keydown);} };
  }
  const api = { createState, create };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.T2CountryMatch = api;
})(typeof window !== "undefined" ? window : globalThis);
