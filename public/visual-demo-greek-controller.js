import { greekDish, greekCombinations, greekKey, greekSelection, planGreek, nextGreekStage, reviewGreek, GREEK_STAGES, GREEK_OPERATIONS } from '/visual-demo-greek.js?v=1.7.0-greek1';

const PRODUCT_MIME = 'application/x-olympiad-demo-greek-product';

export function createGreekController(elements) {
  const ui = Object.fromEntries(['workflow', 'next', 'hint', 'operation-title', 'operation-step', 'edit', 'other', 'layout', 'review', 'progress', 'reserved'].map(key => [key, document.getElementById('demo-greek-' + key)]));
  const listeners = new AbortController(), photos = new Map();
  let selected = new Set(), stage = 'select', layout = 'balanced', revision = 0, epoch = 0, busy = false, disposed = false;
  const on = (target, name, callback) => target.addEventListener(name, callback, { signal: listeners.signal });
  const message = text => { elements.sceneMessage.replaceChildren(document.createTextNode(text)); elements.sceneMessage.hidden = !text; };
  function decode(url) {
    if (!photos.has(url)) {
      const image = new Image(); image.draggable = false; image.src = url;
      const promise = image.decode().then(() => image).catch(error => { if (photos.get(url) === promise) photos.delete(url); throw error; });
      photos.set(url, promise);
      // Bound decoded-image memory when cycling through all 70 compositions.
      if (photos.size > 24) photos.delete(photos.keys().next().value);
    }
    return photos.get(url);
  }
  function updateUi() {
    const plan = planGreek(selected, stage, layout), ready = elements.scene.dataset.status === 'ready', operation = GREEK_OPERATIONS[stage];
    elements.count.textContent = `Выбрано ${selected.size} из 4`;
    elements.viewer.dataset.greekStage = stage; elements.viewer.dataset.greekBusy = String(busy);
    ui.next.hidden = stage === 'served'; ui.next.disabled = !plan.complete || busy || !ready;
    ui.next.textContent = !plan.complete ? 'Выберите 4 продукта' : busy ? 'Готовим подачу…' : operation.label;
    ui.next.setAttribute('aria-label', ui.next.textContent);
    ui['operation-title'].textContent = stage === 'served' ? 'Состав подан' : 'Следующий шаг';
    ui['operation-step'].textContent = !plan.complete ? 'Подготовка' : stage === 'served' ? 'Готово' : `Шаг ${GREEK_STAGES.indexOf(stage) + 1} из 4`;
    ui.hint.textContent = !plan.complete ? 'Выберите четыре карточки. До начала сборки все выбранные продукты показаны отдельно.' : operation.hint;
    ui.reserved.hidden = !plan.pending.length; ui.reserved.textContent = plan.pending.length ? 'Для следующих шагов: ' + plan.pending.join(', ') + '.' : '';
    ui.edit.hidden = stage === 'select'; ui.layout.hidden = !plan.complete || stage === 'select'; ui.progress.hidden = !busy;
    for (const button of ui.layout.querySelectorAll('button')) { button.disabled = busy; button.setAttribute('aria-pressed', String(button.dataset.greekLayout === layout)); }
    ui.review.hidden = stage !== 'served';
    if (stage === 'served') {
      const review = reviewGreek(selected); ui.review.dataset.match = String(review.matches);
      ui.review.textContent = review.matches ? 'Состав соответствует заявленной версии: томаты и огурец, красный лук и оливки, фета, масло и орегано.'
        : `Этот состав отличается от заявленного греческого салата. Не хватает: ${review.missing.join(', ')}. Другие выбранные продукты: ${review.extra.join(', ')}.`;
    }
    for (const step of ui.workflow.querySelectorAll('[data-greek-step]')) {
      step.classList.toggle('is-complete', GREEK_STAGES.indexOf(step.dataset.greekStep) < GREEK_STAGES.indexOf(stage));
      if (step.dataset.greekStep === stage) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
    }
    for (const button of elements.ingredients.querySelectorAll('[data-ingredient]')) {
      const picked = selected.has(button.dataset.ingredient); button.classList.toggle('is-selected', picked); button.setAttribute('aria-pressed', String(picked));
      button.disabled = selected.size === 4 && !picked; button.querySelector('[data-card-state]').textContent = picked ? 'Выбрано' : 'Добавить';
    }
    elements.selected.replaceChildren(); elements.selected.hidden = !selected.size;
    for (const item of greekSelection(selected)) {
      const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'visual-demo-selection-chip'; chip.setAttribute('aria-label', `Убрать: ${item.text}`);
      const close = document.createElement('span'); close.textContent = '×'; close.setAttribute('aria-hidden', 'true');
      chip.append(document.createTextNode(item.text), close); chip.dataset.greekRemove = item.id; elements.selected.append(chip);
    }
  }
  function error(retry) {
    if (disposed) return; elements.scene.dataset.status = 'error'; busy = false; updateUi(); message('Изображение не загрузилось. Состав сохранён. ');
    const button = document.createElement('button'); button.type = 'button'; button.className = 'button ghost'; button.textContent = 'Повторить загрузку';
    on(button, 'click', () => { if (retry === advance) elements.scene.dataset.status = 'ready'; retry(); }); elements.sceneMessage.append(button);
  }
  async function render() {
    const current = ++revision, plan = planGreek(selected, stage, layout);
    elements.scene.dataset.composition = plan.key; elements.scene.dataset.phase = plan.phase; elements.scene.dataset.status = plan.paths.length ? 'loading' : 'empty';
    elements.viewer.dataset.photoPhase = plan.phase;
    elements.fallback.className = 'dish-plate dish-fallback-plate greek-photographic-scene' + (['empty', 'mise'].includes(plan.phase) ? ' greek-mise-tray' : '');
    elements.fallback.style.transform = `translate(-50%, -50%) rotate(${plan.angle}deg) scale(${plan.angle ? .94 : 1})`;
    elements.fallback.replaceChildren(); message(plan.paths.length ? 'Загружаем изображение…' : 'Выберите продукты для вашего салата'); updateUi();
    try {
      const images = await Promise.all(plan.paths.map(decode));
      if (disposed || current !== revision) return;
      for (const [index, image] of images.entries()) {
        const layer = plan.layers[index]; image.removeAttribute('style'); image.removeAttribute('data-product'); image.removeAttribute('data-role');
        image.alt = layer.alt; image.className = 'greek-photo-' + layer.kind;
        if (layer.id) image.dataset.product = layer.id;
        if (layer.role) image.dataset.role = layer.role;
        if (layer.kind === 'tray') {
          const figure = document.createElement('figure'), caption = document.createElement('figcaption'); caption.textContent = layer.alt; figure.append(image, caption); elements.fallback.append(figure);
        } else {
          if (layer.scale) image.style.transform = `translate(-50%, -50%) rotate(${layer.angle}deg) scale(${layer.scale})`;
          elements.fallback.append(image);
        }
      }
      await Promise.all(images.flatMap(image => image.getAnimations().map(animation => animation.finished.catch(() => {}))));
      if (disposed || current !== revision) return;
      elements.scene.dataset.status = plan.paths.length ? 'ready' : 'empty'; if (plan.paths.length) message(''); updateUi();
      if (plan.complete && stage !== 'served') planGreek(selected, nextGreekStage(stage, selected), layout).paths.forEach(path => decode(path).catch(() => {}));
    } catch { if (!disposed && current === revision) error(render); }
  }
  function restart() { ++epoch; busy = false; stage = 'select'; render(); }
  async function advance() {
    if (disposed || busy || selected.size !== 4 || elements.scene.dataset.status !== 'ready' || stage === 'served') return;
    const current = ++epoch, next = nextGreekStage(stage, selected);
    if (stage === 'dressed') {
      busy = true; updateUi();
      try {
        await Promise.all(planGreek(selected, next, layout).paths.map(decode));
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) await new Promise(resolve => setTimeout(resolve, 500));
        if (disposed || current !== epoch) return;
      } catch { if (!disposed && current === epoch) error(advance); return; }
    }
    if (disposed || current !== epoch) return; busy = false; stage = next; render();
  }
  ui.workflow.hidden = false; elements.ingredients.replaceChildren();
  for (const item of greekDish.items) {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'visual-ingredient-card'; card.dataset.ingredient = item.id; card.draggable = true;
    const image = document.createElement('img'); image.src = item.imageUrl; image.alt = ''; image.draggable = false;
    const label = document.createElement('span'); label.className = 'visual-ingredient-name'; label.textContent = item.text;
    const state = document.createElement('small'); state.dataset.cardState = ''; state.textContent = 'Добавить'; card.append(image, label, state);
    on(card, 'click', () => { if (selected.has(item.id)) selected.delete(item.id); else if (selected.size < 4) selected.add(item.id); restart(); });
    on(card, 'dragstart', event => { if (card.disabled) { event.preventDefault(); return; } event.dataTransfer.setData(PRODUCT_MIME, item.id); event.dataTransfer.effectAllowed = 'copy'; elements.viewer.classList.add('is-drop-active'); });
    on(card, 'dragend', () => elements.viewer.classList.remove('is-drop-active')); elements.ingredients.append(card);
  }
  on(ui.next, 'click', advance); on(ui.edit, 'click', restart);
  on(elements.selected, 'click', event => { const chip = event.target.closest('[data-greek-remove]'); if (!chip) return; const id = chip.dataset.greekRemove; selected.delete(id); restart(); elements.ingredients.querySelector(`[data-ingredient=${id}]`).focus(); });
  on(ui.other, 'click', () => { const index = greekCombinations.findIndex(ids => greekKey(ids) === greekKey(selected)); selected = new Set(greekCombinations[(index + 1) % greekCombinations.length]); restart(); });
  on(ui.layout, 'click', event => { const button = event.target.closest('[data-greek-layout]'); if (!button || busy) return; layout = button.dataset.greekLayout; render(); });
  on(elements.viewer, 'dragover', event => { if (!event.dataTransfer.types.includes(PRODUCT_MIME)) return; event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
  on(elements.viewer, 'drop', event => {
    if (!event.dataTransfer.types.includes(PRODUCT_MIME)) return; event.preventDefault(); elements.viewer.classList.remove('is-drop-active');
    const id = event.dataTransfer.getData(PRODUCT_MIME), item = greekDish.items.find(candidate => candidate.id === id);
    if (!item || busy) return;
    if (selected.has(id)) { if ((stage === 'select' && item.role === 'base') || (stage === 'base' && item.role === 'top') || (stage === 'topped' && item.role === 'dressing')) advance(); return; }
    if (selected.size < 4) { selected.add(id); restart(); }
  });
  render();
  return {
    clear() { selected.clear(); restart(); },
    cancel() { ++epoch; ++revision; busy = false; elements.viewer.classList.remove('is-drop-active'); },
    restore() { if (!disposed) render(); },
    dispose() { disposed = true; ++epoch; ++revision; listeners.abort(); photos.clear(); ui.workflow.hidden = true; elements.viewer.classList.remove('is-drop-active'); elements.viewer.removeAttribute('data-greek-stage'); elements.viewer.removeAttribute('data-greek-busy'); }
  };
}
