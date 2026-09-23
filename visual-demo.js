const ASSET_ROOT = "./assets/olympiad/visual-v1";

function ingredient(id, text, image, kind) {
  return { id, text, imageUrl: `${ASSET_ROOT}/ingredients/${image}.webp`, model3d: { kind } };
}

const dishes = {
  margherita: {
    title: "Пицца «Маргарита»",
    variant: "Традиционная неаполитанская версия • AVPN",
    preset: "pizza",
    imageUrl: `${ASSET_ROOT}/dishes/margherita-avpn.webp`,
    imageAlt: "Традиционная неаполитанская пицца Маргарита",
    note: "Тесто, измельчённые томаты, моцарелла или фьор-ди-латте, базилик и оливковое масло extra virgin.",
    items: [
      ingredient("pizza_dough", "Тесто", "pizza-dough", "pizza_dough"),
      ingredient("tomato_sauce", "Томатная основа", "tomato-sauce", "tomato_sauce"),
      ingredient("mozzarella", "Моцарелла", "mozzarella", "mozzarella"),
      ingredient("basil", "Базилик", "basil", "basil"),
      ingredient("olive_oil", "Оливковое масло", "olive-oil", "olive_oil"),
      ingredient("cucumber", "Огурец", "cucumber", "cucumber"),
      ingredient("boiled_egg", "Варёное яйцо", "boiled-egg", "boiled_egg"),
      ingredient("grilled_chicken", "Курица гриль", "grilled-chicken", "grilled_chicken")
    ]
  },
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

let activeDishId = "margherita";
let selectedIds = new Set();
let sceneController = null;
let loadSequence = 0;

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
  elements.count.textContent = `${count} ${count === 1 ? "ингредиент" : count > 1 && count < 5 ? "ингредиента" : "ингредиентов"}`;
  elements.ingredients.querySelectorAll("[data-ingredient]").forEach((button) => {
    const selected = selectedIds.has(button.dataset.ingredient);
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    const stateLabel = button.querySelector("[data-card-state]");
    if (stateLabel) stateLabel.textContent = selected ? "На блюде" : "Добавить";
  });
  renderFallback();
  sceneController?.setSelection(selectedItems());
}

async function mountScene() {
  const sequence = ++loadSequence;
  sceneController?.dispose();
  sceneController = null;
  elements.viewer.className = `dish-viewer dish-viewer-${activeDish().preset}`;
  elements.sceneStatus.textContent = "3D загружается…";
  if (navigator.connection?.saveData) {
    elements.viewer.classList.add("is-fallback-only");
    elements.sceneStatus.textContent = "Облегчённый 2D-режим";
    return;
  }
  try {
    const { mountDishScene } = await import("./assets/runtime/dish-scene-3d.js?v=1.7.0-photo3");
    if (sequence !== loadSequence) return;
    sceneController = mountDishScene(elements.scene, { preset: activeDish().preset });
    sceneController.setSelection(selectedItems());
    elements.viewer.classList.add("is-3d-ready");
    elements.sceneStatus.textContent = "Интерактивное 3D • потяните блюдо мышью";
  } catch (error) {
    console.warn("3D-сцена недоступна.", error);
    elements.viewer.classList.add("is-fallback-only");
    elements.sceneStatus.textContent = "Визуальный 2D-режим";
  }
}

function renderDish() {
  const dish = activeDish();
  elements.title.textContent = dish.title;
  elements.variant.textContent = dish.variant;
  elements.referenceImage.src = dish.imageUrl;
  elements.referenceImage.alt = dish.imageAlt;
  elements.referenceTitle.textContent = dish.title;
  elements.referenceNote.textContent = dish.note;
  elements.ingredients.innerHTML = "";
  dish.items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "visual-ingredient-card";
    button.dataset.ingredient = item.id;
    button.setAttribute("aria-pressed", "false");
    const image = document.createElement("img");
    image.src = item.imageUrl;
    image.alt = "";
    const label = document.createElement("span");
    label.className = "visual-ingredient-name";
    label.textContent = item.text;
    const stateLabel = document.createElement("small");
    stateLabel.dataset.cardState = "";
    stateLabel.textContent = "Добавить";
    button.append(image, label, stateLabel);
    button.addEventListener("click", () => {
      if (selectedIds.has(item.id)) selectedIds.delete(item.id);
      else selectedIds.add(item.id);
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
    selectedIds = new Set();
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

elements.rotateLeft.addEventListener("click", () => sceneController?.rotateBy(-0.32));
elements.rotateRight.addEventListener("click", () => sceneController?.rotateBy(0.32));
elements.resetView.addEventListener("click", () => sceneController?.resetView());
elements.clear.addEventListener("click", () => {
  selectedIds.clear();
  updateSelection();
});
window.addEventListener("pagehide", () => sceneController?.dispose(), { once: true });

renderDish();
