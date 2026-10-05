import { pizzaDish, pizzaCombinations, pizzaKey, pizzaSelection, planPizza, nextPizzaStage, reviewPizza, PIZZA_STAGES, PIZZA_OPERATIONS } from '/visual-demo-pizza.js?v=1.7.0-pizza1';

const PRODUCT_MIME = 'application/x-olympiad-demo-pizza-product';

export function createPizzaController(elements) {
  const ui = Object.fromEntries(['workflow', 'next', 'hint', 'operation-title', 'operation-step', 'edit', 'other', 'layout', 'review', 'progress'].map(key => [key, document.getElementById('demo-pizza-' + key)]));
  const listeners = new AbortController();
  const photos = new Map();
  let selected = new Set();
  let stage = 'select';
  let layout = 'balanced';
  let revision = 0;
  let epoch = 0;
  let busy = false;
  let disposed = false;

  const on = (target, name, callback) => target.addEventListener(name, callback, { signal: listeners.signal });
  const message = text => { elements.sceneMessage.replaceChildren(document.createTextNode(text)); elements.sceneMessage.hidden = !text; };
  function decode(url) {
    if (!photos.has(url)) {
      const image = new Image();
      image.draggable = false;
      image.src = url;
      photos.set(url, image.decode().then(() => image).catch(error => { photos.delete(url); throw error; }));
    }
    return photos.get(url);
  }

  function updateUi() {
    const plan = planPizza(selected, stage, layout);
    const ready = elements.scene.dataset.status === 'ready';
    const operation = PIZZA_OPERATIONS[stage];
    elements.count.textContent = `Выбрано ${selected.size} из 4`;
    elements.viewer.dataset.pizzaStage = stage;
    elements.viewer.dataset.pizzaBusy = String(busy);
    ui.next.hidden = stage === 'served';
    ui.next.disabled = !plan.complete || busy || !ready;
    ui.next.textContent = !plan.complete ? 'Выберите 4 продукта' : busy ? 'Пицца выпекается…' : !plan.basis ? 'Продолжить сравнение' : stage === 'shaped' && !plan.tomato ? 'Продолжить без томатов' : stage === 'sauced' && !plan.tomato ? 'Разложить выбранную начинку' : operation.label;
    ui.next.setAttribute('aria-label', ui.next.textContent);
    ui['operation-title'].textContent = stage === 'served' ? (plan.basis ? 'Пицца готова' : 'Сравнение завершено') : 'Следующий шаг';
    ui['operation-step'].textContent = !plan.complete ? 'Подготовка' : stage === 'served' ? 'Готово' : `Шаг ${PIZZA_STAGES.indexOf(stage) + 1} из 4`;
    ui.hint.textContent = !plan.complete ? 'Выберите четыре карточки. Томаты и масло — одна карточка; до сборки все продукты показаны отдельно.'
      : !plan.basis ? 'Тесто не выбрано. Показываем только выбранные продукты; основы и готовой пиццы из этого состава нет.'
      : stage === 'shaped' && !plan.tomato ? 'Томаты с маслом не выбраны. Основа остаётся без томатов, другого соуса и добавленного масла.'
      : operation.hint;
    ui.edit.hidden = stage === 'select';
    ui.layout.hidden = !plan.basis || !['topped', 'served'].includes(stage);
    for (const button of ui.layout.querySelectorAll('button')) { button.disabled = busy; button.setAttribute('aria-pressed', String(button.dataset.pizzaLayout === layout)); }
    ui.progress.hidden = !busy;
    ui.review.hidden = stage !== 'served';
    if (stage === 'served') {
      const review = reviewPizza(selected);
      ui.review.dataset.match = String(review.matches);
      ui.review.textContent = review.matches ? 'Состав соответствует заявленной «Маргарите»: томаты, моцарелла, базилик и оливковое масло на основе из теста.'
        : `Этот состав отличается от заявленной «Маргариты». Не хватает: ${review.missing.join(', ')}. Другие выбранные продукты: ${review.extra.join(', ')}.`;
    }
    for (const step of ui.workflow.querySelectorAll('[data-pizza-step]')) {
      step.classList.toggle('is-complete', PIZZA_STAGES.indexOf(step.dataset.pizzaStep) < PIZZA_STAGES.indexOf(stage));
      if (step.dataset.pizzaStep === stage) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    }
    for (const button of elements.ingredients.querySelectorAll('[data-ingredient]')) {
      const picked = selected.has(button.dataset.ingredient);
      button.classList.toggle('is-selected', picked);
      button.setAttribute('aria-pressed', String(picked));
      button.disabled = selected.size === 4 && !picked;
      button.querySelector('[data-card-state]').textContent = picked ? 'Выбрано' : 'Добавить';
    }
    elements.selected.replaceChildren();
    elements.selected.hidden = !selected.size;
    for (const item of pizzaSelection(selected)) {
      const chip = document.createElement('button');
      chip.type = 'button'; chip.className = 'visual-demo-selection-chip'; chip.setAttribute('aria-label', `Убрать: ${item.text}`);
      const close = document.createElement('span'); close.textContent = '×'; close.setAttribute('aria-hidden', 'true');
      chip.append(document.createTextNode(item.text), close);
      chip.dataset.pizzaRemove = item.id;
      elements.selected.append(chip);
    }
  }

  function error(retry) {
    if (disposed) return;
    elements.scene.dataset.status = 'error';
    busy = false; updateUi();
    message('Изображение не загрузилось. Состав сохранён. ');
    const button = document.createElement('button'); button.type = 'button'; button.className = 'button ghost'; button.textContent = 'Повторить загрузку';
    on(button, 'click', () => {
      if (retry === advance) elements.scene.dataset.status = 'ready';
      retry();
    });
    elements.sceneMessage.append(button);
  }

  async function render() {
    const current = ++revision;
    const plan = planPizza(selected, stage, layout);
    elements.scene.dataset.composition = plan.key;
    elements.scene.dataset.phase = plan.phase;
    elements.scene.dataset.status = plan.paths.length ? 'loading' : 'empty';
    elements.viewer.dataset.photoPhase = plan.phase;
    elements.fallback.className = 'dish-plate dish-fallback-plate pizza-photographic-scene' + (['empty', 'mise', 'no-base'].includes(plan.phase) ? ' pizza-mise-tray' : '');
    elements.fallback.style.transform = `translate(-50%, -50%) rotate(${plan.angle}deg) scale(${plan.angle ? .94 : 1})`;
    elements.fallback.replaceChildren();
    message(plan.paths.length ? 'Загружаем изображение…' : 'Выберите продукты для вашей пиццы');
    updateUi();
    try {
      const images = await Promise.all(plan.paths.map(decode));
      if (disposed || current !== revision) return;
      for (const [index, image] of images.entries()) {
        const layer = plan.layers[index];
        image.removeAttribute('style'); image.removeAttribute('data-product');
        image.alt = layer.alt; image.className = 'pizza-photo-' + layer.kind;
        if (layer.id) image.dataset.product = layer.id;
        if (layer.kind === 'tray') {
          const figure = document.createElement('figure'); const caption = document.createElement('figcaption'); caption.textContent = layer.alt; figure.append(image, caption); elements.fallback.append(figure);
        } else {
          if (layer.scale) image.style.transform = `translate(-50%, -50%) rotate(${layer.angle}deg) scale(${layer.scale})`;
          elements.fallback.append(image);
        }
      }
      await Promise.all(images.flatMap(image => image.getAnimations().map(animation => animation.finished.catch(() => {}))));
      if (disposed || current !== revision) return;
      elements.scene.dataset.status = plan.paths.length ? 'ready' : 'empty';
      if (plan.paths.length) message('');
      updateUi();
      if (plan.complete && stage !== 'served') planPizza(selected, nextPizzaStage(stage, selected), layout).paths.forEach(path => decode(path).catch(() => {}));
    } catch { if (!disposed && current === revision) error(render); }
  }

  function restart() { ++epoch; busy = false; stage = 'select'; render(); }
  async function advance() {
    if (disposed || busy || selected.size !== 4 || elements.scene.dataset.status !== 'ready' || stage === 'served') return;
    const current = ++epoch;
    const next = nextPizzaStage(stage, selected);
    if (stage === 'topped' && planPizza(selected, stage, layout).basis) {
      busy = true; updateUi();
      try {
        const final = planPizza(selected, next, layout);
        await Promise.all(final.paths.map(decode));
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) await new Promise(resolve => setTimeout(resolve, 650));
        if (disposed || current !== epoch) return;
      } catch { if (!disposed && current === epoch) error(advance); return; }
    }
    if (disposed || current !== epoch) return;
    busy = false; stage = next; render();
  }

  ui.workflow.hidden = false;
  elements.ingredients.replaceChildren();
  for (const item of pizzaDish.items) {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'visual-ingredient-card'; card.dataset.ingredient = item.id; card.draggable = true;
    const image = document.createElement('img'); image.src = item.imageUrl; image.alt = ''; image.draggable = false;
    const label = document.createElement('span'); label.className = 'visual-ingredient-name'; label.textContent = item.text;
    const state = document.createElement('small'); state.dataset.cardState = ''; state.textContent = 'Добавить'; card.append(image, label, state);
    on(card, 'click', () => { if (selected.has(item.id)) selected.delete(item.id); else if (selected.size < 4) selected.add(item.id); restart(); });
    on(card, 'dragstart', event => { if (card.disabled) { event.preventDefault(); return; } event.dataTransfer.setData(PRODUCT_MIME, item.id); event.dataTransfer.effectAllowed = 'copy'; elements.viewer.classList.add('is-drop-active'); });
    on(card, 'dragend', () => elements.viewer.classList.remove('is-drop-active'));
    elements.ingredients.append(card);
  }
  on(ui.next, 'click', advance);
  on(elements.selected, 'click', event => {
    const chip = event.target.closest('[data-pizza-remove]');
    if (!chip) return;
    const id = chip.dataset.pizzaRemove;
    selected.delete(id); restart(); elements.ingredients.querySelector(`[data-ingredient=${id}]`).focus();
  });
  on(ui.edit, 'click', restart);
  on(ui.other, 'click', () => { const index = pizzaCombinations.findIndex(ids => pizzaKey(ids) === pizzaKey(selected)); selected = new Set(pizzaCombinations[(index + 1) % pizzaCombinations.length]); restart(); });
  on(ui.layout, 'click', event => { const button = event.target.closest('[data-pizza-layout]'); if (!button || busy) return; layout = button.dataset.pizzaLayout; render(); });
  on(elements.viewer, 'dragover', event => { if (!event.dataTransfer.types.includes(PRODUCT_MIME)) return; event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
  on(elements.viewer, 'drop', event => {
    if (!event.dataTransfer.types.includes(PRODUCT_MIME)) return;
    event.preventDefault(); elements.viewer.classList.remove('is-drop-active');
    const id = event.dataTransfer.getData(PRODUCT_MIME);
    const item = pizzaDish.items.find(candidate => candidate.id === id);
    if (!item || busy) return;
    if (selected.has(id)) { if ((stage === 'select' && item.kind === 'dough') || (stage === 'shaped' && item.kind === 'tomato-oil')) advance(); return; }
    if (selected.size < 4) { selected.add(id); restart(); }
  });
  render();
  return {
    clear() { selected.clear(); restart(); },
    cancel() { ++epoch; ++revision; busy = false; elements.viewer.classList.remove('is-drop-active'); },
    restore() { if (!disposed) render(); },
    dispose() { disposed = true; ++epoch; ++revision; listeners.abort(); ui.workflow.hidden = true; elements.viewer.classList.remove('is-drop-active'); elements.viewer.removeAttribute('data-pizza-stage'); elements.viewer.removeAttribute('data-pizza-busy'); }
  };
}
