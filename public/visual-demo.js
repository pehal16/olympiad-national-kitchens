import { philadelphia as photoPhiladelphia, planPhotos } from "/visual-demo-photography.js?v=1.7.0-visual5";
import { createWholeRollDish, nextRollStage, planWholeRoll, rollRoles, reviewRollComposition, ROLL_STAGES, ROLL_OPERATIONS } from "/visual-demo-roll-technique.js?v=1.7.0-roll-serving1";
const philadelphia = createWholeRollDish(photoPhiladelphia);
import { pizzaDish } from '/visual-demo-pizza.js?v=1.7.0-pizza1';
import { createPizzaController } from '/visual-demo-pizza-controller.js?v=1.7.0-pizza1';
import { greekDish } from '/visual-demo-greek.js?v=1.7.0-greek1';
import { createGreekController } from '/visual-demo-greek-controller.js?v=1.7.0-greek1';

const ASSET_ROOT = "/assets/olympiad/visual-v1";

function ingredient(id, text, image, kind) {
  return { id, text, imageUrl: `${ASSET_ROOT}/ingredients/${image}.webp`, model3d: { kind } };
}

const dishes = {
  philadelphia,
  margherita: pizzaDish,
  greek: greekDish,
  caesar: {
    title: "Салат «Цезарь» с курицей",
    variant: "Привычная российская ресторанная версия",
    preset: "salad",
    imageUrl: `${ASSET_ROOT}/dishes/caesar-russian-foodservice.webp`,
    imageAlt: "Салат Цезарь с курицей в российской ресторанной подаче",
    note: "Романо, курица гриль, пшеничные крутоны, пармезан, томаты черри и соус «Цезарь».",
    items: [
      ingredient("romaine", "Салат романо", "romaine", "romaine"),
      ingredient("grilled_chicken", "Курица гриль", "grilled-chicken", "grilled_chicken"),
      ingredient("croutons", "Крутоны", "croutons", "croutons"),
      ingredient("parmesan", "Пармезан", "parmesan", "parmesan"),
      ingredient("cherry_tomato", "Томаты черри", "cherry-tomatoes", "cherry_tomato"),
      ingredient("caesar_dressing", "Соус «Цезарь»", "caesar-dressing", "caesar_dressing"),
      ingredient("cucumber", "Огурец", "cucumber", "cucumber"),
      ingredient("pizza_dough", "Тесто для пиццы", "pizza-dough", "pizza_dough")
    ]
  }
};

const elements = {
  tabs: [...document.querySelectorAll(".visual-demo-tab")],
  title: document.getElementById("demo-dish-title"),
  variant: document.getElementById("demo-variant"),
  count: document.getElementById("demo-count"),
  workbench: document.getElementById("demo-workbench"),
  viewer: document.getElementById("demo-viewer"),
  fallback: document.getElementById("demo-fallback"),
  scene: document.getElementById("demo-scene"),
  sceneStatus: document.getElementById("demo-scene-status"),
  ingredients: document.getElementById("demo-ingredients"),
  referenceImage: document.getElementById("demo-reference-image"),
  referenceTitle: document.getElementById("demo-reference-title"),
  referenceNote: document.getElementById("demo-reference-note"),
  rotateLeft: document.getElementById("demo-rotate-left"),
  rotateRight: document.getElementById("demo-rotate-right"),
  resetView: document.getElementById("demo-reset-view"),
  clear: document.getElementById("demo-clear")
};
elements.pantryHint = document.getElementById("demo-pantry-hint");
elements.selected = document.getElementById("demo-selected");
elements.sceneMessage = document.getElementById("demo-scene-message");
elements.format = document.getElementById("demo-format");
elements.photoNote = document.getElementById("demo-photo-note");
elements.rollWorkflow = document.getElementById("demo-roll-workflow");
elements.rollNext = document.getElementById("demo-roll-next");
elements.rollOperationTitle = document.getElementById('demo-roll-operation-title');
elements.rollOperationStep = document.getElementById('demo-roll-operation-step');
elements.rollEdit = document.getElementById("demo-roll-edit");
elements.rollHint = document.getElementById("demo-roll-hint");
elements.rollRoles = document.getElementById('demo-roll-roles');
elements.rollOther = document.getElementById('demo-roll-other');
elements.rollReverse = document.getElementById('demo-roll-reverse');
elements.rollPresentation = document.getElementById('demo-roll-presentation');
elements.matHandle = document.getElementById('demo-mat-handle');
elements.rollProgress = document.getElementById('demo-roll-progress');
elements.rollReview = document.getElementById('demo-roll-review');

let activeDishId = "margherita";
let selectedIds = new Set();
let sceneController = null;
let pizzaController = null;
let greekController = null;
let loadSequence = 0;
let photoRevision = 0;
let fallbackAngle = 0;
let rollStage = 'select';
let rollBusy = false;
let techniqueEpoch = 0;
let rollingPreview = false;
let reverseFilling = false;
let presentation = 'diagonal';
let matGesture = null;
let suppressMatClick = false;
const decodedPhotos = new Map();

function resetTechnique() {
  ++techniqueEpoch;
  rollStage = 'select';
  rollBusy = false;
  rollingPreview = false;
  reverseFilling = false;
  matGesture = null;
  elements.matHandle.style.transform = '';
  elements.rollProgress.querySelector('progress').value = 0;
}

function decodePhoto(url) {
  if (!decodedPhotos.has(url)) {
    const image = new Image();
    image.src = url;
    decodedPhotos.set(url, image.decode().then(() => image).catch((error) => {
      decodedPhotos.delete(url);
      throw error;
    }));
  }
  return decodedPhotos.get(url);
}

function showSceneMessage(text = "") {
  elements.sceneMessage.textContent = text;
  elements.sceneMessage.hidden = !text;
}

async function renderPhotoSelection() {
  const revision = ++photoRevision;
  const whole = activeDish().preset === 'whole-roll';
  const plan = whole ? planWholeRoll(selectedIds, activeDish(), rollStage, { reverse: reverseFilling, presentation, rolling: rollingPreview }) : planPhotos(selectedIds, activeDish());
  elements.scene.dataset.composition = plan.key;
  elements.scene.dataset.phase = plan.phase;
  elements.scene.dataset.status = "loading";
  elements.viewer.dataset.rollStage = whole ? rollStage : '';
  elements.viewer.dataset.photoPhase = plan.phase;
  elements.fallback.replaceChildren();
  elements.fallback.classList.toggle('roll-mise-tray', whole && ['mise', 'no-base'].includes(plan.phase));
  elements.fallback.style.transform = whole ? `translate(-50%, -50%) rotate(${plan.angle || 0}deg) scale(${plan.angle ? .88 : 1})` : '';
  if (whole) updateRollWorkflow();
  showSceneMessage(plan.phase === "empty" ? (whole ? "Выберите продукты для целого ролла" : "Выберите четыре компонента для вашей подачи")
    : plan.phase === "unprepared" ? "Состав сохранён. Изображение целого ролла с этими продуктами ещё не подготовлено."
    : "Загружаем изображение…");
  try {
    const [photos, sceneResult] = await Promise.all([
      Promise.all(plan.paths.map(decodePhoto)),
      whole ? undefined : sceneController?.setPhotoPlan(plan)
    ]);
    if (revision !== photoRevision || !['photo', 'whole-roll'].includes(activeDish().preset)) return;
    // Reuse decoded originals: cloned images can display a blank frame in fallback.
    for (const [index, photo] of photos.entries()) {
      photo.removeAttribute('style');
      photo.removeAttribute('data-product');
      const layer = whole ? plan.layers[index] : null;
      photo.className = layer?.kind === 'tray' ? 'roll-mise-product-photo' : `dish-photo-layer${whole ? ' roll-technique-' + layer.kind : ''}`;
      photo.alt = whole ? (layer.alt || plan.alt) : '';
      if (layer?.id) photo.dataset.product = layer.id;
      if (layer?.kind === 'filling') photo.style.top = `${layer.top}%`;
      if (layer?.kind === 'tray') {
        const product = document.createElement('figure');
        const caption = document.createElement('figcaption');
        caption.textContent = layer.alt;
        product.append(photo, caption);
        elements.fallback.append(product);
      } else elements.fallback.append(photo);
    }
    if (whole) {
      await Promise.all(photos.flatMap(photo => photo.getAnimations().map(animation => animation.finished.catch(() => {}))));
      if (revision !== photoRevision || activeDish().preset !== 'whole-roll') return;
    }
    if (sceneResult?.status === "error") throw new Error("Photo texture unavailable");
    elements.scene.dataset.status = plan.paths.length ? "ready" : plan.phase;
    if (plan.paths.length) showSceneMessage();
    if (whole) {
      updateRollWorkflow();
      const next = nextRollStage(rollStage, ROLL_OPERATIONS[rollStage].action, selectedIds, activeDish());
      if (next !== rollStage) {
        const nextPlan = planWholeRoll(selectedIds, activeDish(), next, { reverse: reverseFilling, presentation });
        nextPlan.paths.forEach(path => decodePhoto(path).catch(() => {}));
      }
    }
  } catch {
    if (revision !== photoRevision) return;
    elements.scene.dataset.status = "error";
    if (whole) updateRollWorkflow();
    showSceneMessage("Фото не загрузилось. Нажмите «Повторить загрузку» или замените компонент.");
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "button ghost";
    retry.textContent = "Повторить загрузку";
    retry.addEventListener("click", renderPhotoSelection, { once: true });
    elements.sceneMessage.append(retry);
  }
}

function updateRollWorkflow() {
  const whole = activeDish().preset === 'whole-roll';
  elements.rollWorkflow.hidden = !whole;
  if (!whole) elements.matHandle.hidden = true;
  if (!whole) return;
  const complete = selectedIds.size === activeDish().maxItems;
  const roles = rollRoles(selectedIds, activeDish(), reverseFilling);
  const operation = ROLL_OPERATIONS[rollStage];
  elements.rollNext.hidden = rollStage === 'served';
  elements.rollNext.disabled = !complete || rollBusy || elements.scene.dataset.status !== 'ready';
  elements.rollNext.textContent = !complete ? 'Выберите 4 продукта' : rollBusy ? 'Сворачиваем…' : !roles.basis ? 'Продолжить сравнение' : rollStage === 'rolled' && roles.outer === 'salmon' ? 'Покрыть лососем снаружи' : operation.label;
  elements.rollNext.setAttribute('aria-label', elements.rollNext.textContent);
  elements.rollOperationTitle.textContent = rollStage === 'served' ? (roles.basis ? 'Сборка завершена' : 'Сравнение завершено') : 'Следующий шаг';
  elements.rollOperationStep.textContent = !complete ? 'Подготовка' : rollStage === 'served' ? 'Готово' : `Шаг ${ROLL_STAGES.indexOf(rollStage) + 1} из ${ROLL_STAGES.length - 1}`;
  elements.rollEdit.hidden = rollStage === 'select';
  elements.rollHint.textContent = !complete ? 'Выберите четыре продукта. Они остаются отдельно до начала сборки.'
    : !roles.basis ? 'Рис и нори не выбраны. Показаны только ваши продукты: свёрнутой основы из этого состава нет.' : operation.hint;
  elements.rollRoles.hidden = !complete || !roles.basis || !['flipped', 'filling', 'rolled', 'covered', 'served'].includes(rollStage);
  const itemName = id => activeDish().items.find(item => item.id === id)?.text;
  elements.rollRoles.textContent = `На нори: ${roles.fillingIds.map(itemName).join(' + ')}. Снаружи после сворачивания: ${itemName(roles.outerId) || 'без покрытия'}.`;
  elements.rollReverse.hidden = !roles.basis || roles.fillingIds.length < 2 || !['flipped', 'filling'].includes(rollStage);
  elements.rollReverse.disabled = rollBusy;
  const canRoll = complete && roles.basis && rollStage === 'filling';
  elements.matHandle.hidden = !canRoll;
  elements.matHandle.disabled = rollBusy || (elements.scene.dataset.status !== 'ready' && !matGesture);
  elements.rollProgress.hidden = !canRoll;
  elements.rollPresentation.hidden = !roles.basis || !['covered', 'served'].includes(rollStage);
  elements.rollReview.hidden = rollStage !== 'served';
  if (rollStage === 'served') {
    const review = reviewRollComposition(selectedIds, activeDish());
    elements.rollReview.dataset.match = String(review.matches);
    elements.rollReview.textContent = review.matches ? 'Состав соответствует заявленной версии с огурцом: сыр и огурец на нори, лосось снаружи.'
      : `Это другой состав, он не соответствует заявленной «Филадельфии». Не хватает: ${review.missing.join(', ')}. Заменяющие продукты: ${review.extra.join(', ')}.`;
  }
  for (const button of elements.rollPresentation.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.rollPresentation === presentation));
  for (const step of elements.rollWorkflow.querySelectorAll('[data-roll-step]')) {
    step.classList.toggle('is-complete', ROLL_STAGES.indexOf(step.dataset.rollStep) < ROLL_STAGES.indexOf(rollStage));
    if (step.dataset.rollStep === rollStage) step.setAttribute('aria-current', 'step');
    else step.removeAttribute('aria-current');
  }
}

function activeDish() {
  return dishes[activeDishId];
}

function selectedItems() {
  return activeDish().items.filter((item) => selectedIds.has(item.id));
}

function renderFallback() {
  elements.fallback.innerHTML = "";
  const items = selectedItems();
  if (!items.length) {
    const label = document.createElement("span");
    label.className = "dish-plate-label";
    label.textContent = activeDish().preset === "pizza" ? "Добавьте ингредиенты на пиццу" : "Добавьте ингредиенты в салатник";
    elements.fallback.appendChild(label);
    return;
  }
  items.forEach((item) => {
    const image = document.createElement("img");
    image.className = "dish-fallback-ingredient";
    image.src = item.imageUrl;
    image.alt = "";
    elements.fallback.appendChild(image);
  });
}

function updateSelection() {
  const count = selectedIds.size;
  const dish = activeDish();
  elements.count.textContent = dish.maxItems ? `Выбрано ${count} из ${dish.maxItems}`
    : `${count} ${count === 1 ? "ингредиент" : count > 1 && count < 5 ? "ингредиента" : "ингредиентов"}`;
  elements.ingredients.querySelectorAll("[data-ingredient]").forEach((button) => {
    const selected = selectedIds.has(button.dataset.ingredient);
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.disabled = Boolean(dish.maxItems && count >= dish.maxItems && !selected);
    const stateLabel = button.querySelector("[data-card-state]");
    if (stateLabel) stateLabel.textContent = selected ? (dish.preset === 'whole-roll' ? 'Выбрано' : 'На блюде') : "Добавить";
  });
  elements.selected.replaceChildren();
  elements.selected.hidden = !['photo', 'whole-roll'].includes(dish.preset) || !count;
  for (const item of selectedItems()) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "visual-demo-selection-chip";
    chip.setAttribute("aria-label", `Убрать: ${item.text}`);
    chip.append(document.createTextNode(item.text));
    const close = document.createElement("span");
    close.textContent = "×";
    close.setAttribute("aria-hidden", "true");
    chip.append(close);
    chip.addEventListener("click", () => {
      selectedIds.delete(item.id);
      resetTechnique();
      updateSelection();
      elements.ingredients.querySelector(`[data-ingredient="${item.id}"]`).focus();
    });
    elements.selected.append(chip);
  }
  updateRollWorkflow();
  if (['photo', 'whole-roll'].includes(dish.preset)) {
    renderPhotoSelection();
    return;
  }
  ++photoRevision;
  showSceneMessage();
  renderFallback();
  sceneController?.setSelection(selectedItems());
}

async function mountScene() {
  const sequence = ++loadSequence;
  sceneController?.dispose();
  sceneController = null;
  elements.viewer.className = `dish-viewer dish-viewer-${activeDish().preset}`;
  const whole = activeDish().preset === 'whole-roll';
  elements.viewer.querySelector('.dish-viewer-controls').hidden = whole;
  if (whole) {
    // This is an honest raster preview until a reviewed whole-food mesh exists.
    // Never rotate the image plane and label it a volumetric roll.
    elements.viewer.classList.add('is-fallback-only');
    elements.sceneStatus.textContent = 'Фотографический образец • 2D';
    return;
  }
  elements.sceneStatus.textContent = "3D загружается…";
  if (navigator.connection?.saveData) {
    elements.viewer.classList.add("is-fallback-only");
    elements.sceneStatus.textContent = "Облегчённый 2D-режим";
    return;
  }
  try {
    const { mountDishScene } = await import("/assets/runtime/dish-scene-3d.js?v=1.7.0-photo5");
    if (sequence !== loadSequence) return;
    sceneController = mountDishScene(elements.scene, {
      preset: activeDish().preset,
      onUnavailable() {
        sceneController?.dispose();
        sceneController = null;
        elements.viewer.classList.remove("is-3d-ready");
        elements.viewer.classList.add("is-fallback-only");
        elements.sceneStatus.textContent = "Фотосборка в 2D • выбор сохранён";
      }
    });
    if (activeDish().preset === "photo") renderPhotoSelection();
    else sceneController.setSelection(selectedItems());
    elements.viewer.classList.add("is-3d-ready");
    elements.sceneStatus.textContent = activeDish().preset === "photo"
      ? "Поверните тарелку мышью или пальцем"
      : "Интерактивное 3D • потяните блюдо мышью";
  } catch (error) {
    console.warn("3D-сцена недоступна.", error);
    elements.viewer.classList.add("is-fallback-only");
    elements.sceneStatus.textContent = "Визуальный 2D-режим";
  }
}

function renderDish() {
  greekController?.dispose();
  greekController = null;
  pizzaController?.dispose();
  pizzaController = null;
  elements.fallback.className = 'dish-plate dish-fallback-plate';
  const dish = activeDish();
  const whole = dish.preset === 'whole-roll';
  document.getElementById('demo-main-title').textContent = whole ? 'Соберите ролл' : 'Соберите блюдо в 3D';
  document.getElementById('demo-main-lead').textContent = whole
    ? 'Соберите ролл по шагам: рис, переворот, начинка на нори и сворачивание ковриком. Добавьте покрытие снаружи, затем нарежьте ролл на порционные кусочки и выложите на тарелку.'
    : 'Выбирайте карточки продуктов, вращайте блюдо мышью и сравнивайте визуальный результат с заявленной версией рецептуры.';
  fallbackAngle = 0;
  elements.fallback.style.transform = "";
  elements.title.textContent = dish.title;
  elements.variant.textContent = dish.variant;
  elements.referenceImage.src = dish.imageUrl;
  elements.referenceImage.alt = dish.imageAlt;
  elements.referenceTitle.textContent = dish.title;
  elements.referenceNote.textContent = dish.note;
  elements.pantryHint.textContent = dish.maxItems
    ? "Выберите четыре продукта. Попробуйте другой состав и сравните результат. Карточка или × убирает продукт."
    : "Нажмите на карточку, чтобы добавить продукт или убрать его.";
  elements.format.textContent = dish.preset === 'whole-roll' ? 'Сборка и подача • фотообразец' : dish.preset === "photo" ? "Фотосборка на 3D-тарелке" : "3D + фотокарточки";
  elements.photoNote.hidden = !['photo', 'whole-roll'].includes(dish.preset);
  elements.photoNote.textContent = dish.preset === 'whole-roll'
    ? 'Этапы и подачи показаны фотографиями. Внутренний состав виден до сворачивания; на закрытом ролле он скрыт. Это 2D-демонстрация.'
    : 'Продукты показаны фотографическими слоями на объёмной тарелке.';
  elements.referenceImage.classList.toggle('is-whole-roll-reference', dish.preset === 'whole-roll');
  elements.scene.setAttribute("aria-label", dish.preset === 'whole-roll' ? 'Этапы приготовления ролла: сборка, нарезка и подача' : dish.preset === "photo" ? "Фотографическая сборка на объёмной тарелке" : "Интерактивная 3D-модель блюда");
  if (dish.preset === 'photo-pizza') {
    ++photoRevision;
    ++loadSequence;
    sceneController?.dispose();
    sceneController = null;
    document.getElementById('demo-main-title').textContent = 'Соберите «Маргариту»';
    document.getElementById('demo-main-lead').textContent = 'Выберите продукты, сформируйте основу, разложите начинку и испеките пиццу. Пройдите сборку по шагам и сравните результат с заявленной версией.';
    elements.viewer.className = 'dish-viewer dish-viewer-photo-pizza is-fallback-only';
    elements.viewer.removeAttribute('data-roll-stage');
    elements.viewer.querySelector('.dish-viewer-controls').hidden = true;
    elements.rollWorkflow.hidden = true;
    elements.matHandle.hidden = true;
    elements.scene.replaceChildren();
    elements.scene.setAttribute('aria-label', 'Фотографические этапы сборки и выпечки пиццы');
    elements.sceneStatus.textContent = 'Сборка и выпечка • фотообразец 2D';
    elements.format.textContent = 'Пошаговая сборка • фотообразец';
    elements.photoNote.hidden = false;
    elements.photoNote.textContent = 'До печи показаны выбранные продукты на сырой основе. После выпечки — отдельное изображение именно вашего состава. Это 2D-демонстрация.';
    pizzaController = createPizzaController(elements);
    return;
  }
  if (dish.preset === 'photo-greek') {
    ++photoRevision;
    ++loadSequence;
    sceneController?.dispose();
    sceneController = null;
    document.getElementById('demo-main-title').textContent = 'Соберите греческий салат';
    document.getElementById('demo-main-lead').textContent = 'Выберите продукты, разложите основные компоненты, добавьте верхние продукты и заправку. Завершите подачу и сравните состав с заявленной версией.';
    elements.viewer.className = 'dish-viewer dish-viewer-photo-greek is-fallback-only';
    elements.viewer.removeAttribute('data-roll-stage');
    elements.viewer.querySelector('.dish-viewer-controls').hidden = true;
    elements.rollWorkflow.hidden = true;
    elements.matHandle.hidden = true;
    elements.scene.replaceChildren();
    elements.scene.setAttribute('aria-label', 'Фотографические этапы сборки и подачи выбранного салата');
    elements.sceneStatus.textContent = 'Сборка и подача • фотообразец 2D';
    elements.format.textContent = 'Пошаговая сборка • фотообразец';
    elements.photoNote.hidden = false;
    elements.photoNote.textContent = 'Продукты уже подготовлены и нарезаны. Во время сборки видны выбранные фотографические слои; после подачи — отдельное изображение вашего состава. Это 2D-демонстрация.';
    greekController = createGreekController(elements);
    return;
  }
  elements.ingredients.innerHTML = "";
  dish.items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "visual-ingredient-card";
    button.dataset.ingredient = item.id;
    button.setAttribute("aria-pressed", "false");
    button.draggable = whole;
    button.addEventListener('dragstart', event => {
      if (!whole || button.disabled) { event.preventDefault(); return; }
      event.dataTransfer.setData('application/x-olympiad-demo-product', item.id);
      event.dataTransfer.effectAllowed = 'copy';
      elements.viewer.classList.add('is-drop-active');
    });
    button.addEventListener('dragend', () => elements.viewer.classList.remove('is-drop-active'));
    const image = document.createElement("img");
    image.src = item.imageUrl;
    image.alt = "";
    image.draggable = false;
    const label = document.createElement("span");
    label.className = "visual-ingredient-name";
    label.textContent = item.text;
    const stateLabel = document.createElement("small");
    stateLabel.dataset.cardState = "";
    stateLabel.textContent = "Добавить";
    button.append(image, label, stateLabel);
    button.addEventListener("click", () => {
      if (selectedIds.has(item.id)) selectedIds.delete(item.id);
      else if (!dish.maxItems || selectedIds.size < dish.maxItems) selectedIds.add(item.id);
      resetTechnique();
      updateSelection();
    });
    elements.ingredients.appendChild(button);
  });
  updateSelection();
  mountScene();
}

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeDishId = tab.dataset.dish;
    history.replaceState(null, "", `#${activeDishId}`);
    selectedIds = new Set();
    resetTechnique();
    elements.tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });
    elements.workbench.setAttribute("aria-labelledby", `${tab.id} demo-dish-title`);
    renderDish();
  });
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = elements.tabs.indexOf(tab);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? elements.tabs.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + elements.tabs.length) % elements.tabs.length;
    elements.tabs[nextIndex].focus();
    elements.tabs[nextIndex].click();
  });
});

function rotateView(delta) {
  if (sceneController) sceneController.rotateBy(delta);
  else {
    fallbackAngle += delta;
    elements.fallback.style.transform = `translate(-50%, -50%) rotate(${fallbackAngle}rad)`;
  }
}
elements.rotateLeft.addEventListener("click", () => rotateView(-0.32));
elements.rotateRight.addEventListener("click", () => rotateView(0.32));
elements.resetView.addEventListener("click", () => {
  sceneController?.resetView();
  fallbackAngle = 0;
  elements.fallback.style.transform = "";
});
elements.clear.addEventListener("click", () => {
  if (greekController) { greekController.clear(); return; }
  if (pizzaController) { pizzaController.clear(); return; }
  selectedIds.clear();
  resetTechnique();
  updateSelection();
});
async function advanceRoll() {
  if (activeDish().preset !== 'whole-roll' || rollBusy || elements.rollNext.disabled || rollStage === 'served') return;
  const epoch = techniqueEpoch;
  const action = ROLL_OPERATIONS[rollStage].action;
  rollBusy = true;
  updateRollWorkflow();
  if (action === 'roll' && rollRoles(selectedIds, activeDish()).basis) {
    rollingPreview = true;
    await renderPhotoSelection();
    if (epoch !== techniqueEpoch) return;
    if (elements.scene.dataset.status === 'error') {
      rollingPreview = false;
      rollBusy = false;
      updateRollWorkflow();
      return;
    }
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) await new Promise(resolve => setTimeout(resolve, 420));
    if (epoch !== techniqueEpoch) return;
  }
  rollingPreview = false;
  rollBusy = false;
  matGesture = null;
  elements.matHandle.style.transform = '';
  elements.rollProgress.querySelector('progress').value = 0;
  rollStage = nextRollStage(rollStage, action, selectedIds, activeDish());
  updateSelection();
}
elements.rollNext.addEventListener('click', advanceRoll);
elements.rollEdit.addEventListener('click', () => {
  resetTechnique();
  updateSelection();
});
elements.rollOther.addEventListener('click', () => {
  if (activeDish().preset !== 'whole-roll') return;
  const combinations = [];
  const items = activeDish().items;
  const visit = (ids, start) => {
    if (ids.length === activeDish().maxItems) { combinations.push(ids); return; }
    for (let index = start; index < items.length; index++) visit([...ids, items[index].id], index + 1);
  };
  visit([], 0);
  const key = [...selectedIds].sort().join('+');
  const index = combinations.findIndex(ids => [...ids].sort().join('+') === key);
  selectedIds = new Set(combinations[(index + 1) % combinations.length]);
  resetTechnique();
  updateSelection();
});
elements.rollReverse.addEventListener('click', () => {
  if (activeDish().preset !== 'whole-roll' || rollBusy) return;
  reverseFilling = !reverseFilling;
  ++techniqueEpoch;
  updateSelection();
});
elements.rollPresentation.addEventListener('click', event => {
  const button = event.target.closest('[data-roll-presentation]');
  if (!button || activeDish().preset !== 'whole-roll') return;
  presentation = button.dataset.rollPresentation;
  updateSelection();
});
elements.matHandle.addEventListener('click', event => {
  if (event.detail && suppressMatClick) { suppressMatClick = false; return; }
  advanceRoll();
});
elements.matHandle.addEventListener('pointerdown', event => {
  if (elements.matHandle.disabled || event.button !== 0) return;
  suppressMatClick = false;
  matGesture = { pointerId: event.pointerId, startY: event.clientY, progress: 0, epoch: techniqueEpoch };
  elements.matHandle.setPointerCapture(event.pointerId);
});
elements.matHandle.addEventListener('pointermove', event => {
  if (!matGesture || event.pointerId !== matGesture.pointerId) return;
  const distance = Math.max(75, elements.viewer.querySelector('.dish-viewer-stage').clientHeight * .28);
  const progress = Math.max(0, Math.min(1, (matGesture.startY - event.clientY) / distance));
  matGesture.progress = progress;
  elements.matHandle.style.transform = `translate(-50%, ${-progress * 60}px)`;
  elements.rollProgress.querySelector('progress').value = Math.round(progress * 100);
  elements.rollProgress.querySelector('span').textContent = `Сворачивание: ${Math.round(progress * 100)}%`;
  const preview = progress >= .3;
  if (preview !== rollingPreview) { rollingPreview = preview; renderPhotoSelection(); }
});
async function finishMat(event, cancelled) {
  if (!matGesture || event.pointerId !== matGesture.pointerId) return;
  const gesture = matGesture;
  matGesture = null;
  suppressMatClick = !cancelled && gesture.progress > .04;
  elements.matHandle.style.transform = '';
  elements.rollProgress.querySelector('progress').value = 0;
  elements.rollProgress.querySelector('span').textContent = 'Потяните край коврика вверх';
  if (!cancelled && gesture.progress <= .04) return; // A tap uses the normal button click.
  if (cancelled || gesture.progress < .8) rollingPreview = false;
  await renderPhotoSelection();
  if (gesture.epoch !== techniqueEpoch || rollStage !== 'filling') return;
  if (!cancelled && gesture.progress >= .8) advanceRoll();
}
elements.matHandle.addEventListener('pointerup', event => finishMat(event, false));
elements.matHandle.addEventListener('pointercancel', event => finishMat(event, true));
elements.viewer.addEventListener('dragover', event => {
  if (activeDish().preset !== 'whole-roll' || !event.dataTransfer.types.includes('application/x-olympiad-demo-product')) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = rollStage === 'rolled' || selectedIds.size < activeDish().maxItems ? 'copy' : 'none';
});
elements.viewer.addEventListener('drop', event => {
  elements.viewer.classList.remove('is-drop-active');
  if (activeDish().preset !== 'whole-roll') return;
  event.preventDefault();
  const id = event.dataTransfer.getData('application/x-olympiad-demo-product');
  if (rollStage === 'rolled' && id === rollRoles(selectedIds, activeDish()).outerId) { advanceRoll(); return; }
  if (!activeDish().items.some(item => item.id === id) || selectedIds.has(id) || selectedIds.size >= activeDish().maxItems) return;
  selectedIds.add(id);
  resetTechnique();
  updateSelection();
});
window.addEventListener("pagehide", () => {
  greekController?.cancel();
  pizzaController?.cancel();
  ++loadSequence;
  ++photoRevision;
  ++techniqueEpoch;
  rollBusy = false;
  rollingPreview = false;
  matGesture = null;
  elements.matHandle.style.transform = '';
  elements.rollProgress.querySelector('progress').value = 0;
  elements.rollProgress.querySelector('span').textContent = 'Потяните край коврика вверх';
  sceneController?.dispose();
  sceneController = null;
});
window.addEventListener("pageshow", event => {
  if (!event.persisted) return;
  if (greekController) { greekController.restore(); return; }
  if (pizzaController) { pizzaController.restore(); return; }
  updateSelection();
  mountScene();
});

const initialTab = elements.tabs.find(tab => `#${tab.dataset.dish}` === location.hash);
if (initialTab && initialTab.dataset.dish !== activeDishId) initialTab.click();
else renderDish();
