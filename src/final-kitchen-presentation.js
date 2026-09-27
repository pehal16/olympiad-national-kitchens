"use strict";

// Appearance only: these names describe visible foods, never grading roles.
const FORMS = new Set(["bun", "beef", "breaded", "burger-veg", "cheddar", "bacon", "rings", "egg",
  "flatbread", "chicken", "vegetables", "salmon", "surimi", "corn", "white-sauce", "chili",
  "tomato-cucumber", "onion-olives", "feta", "oil-herbs", "croutons", "leaves", "shrimp",
  "croutons-parmesan", "cucumber", "dressing", "boat", "cheese", "butter", "mince", "mushrooms",
  "tomato-sauce", "rice-sheet", "cream", "cucumber-sticks", "eel", "tuna", "basil", "oil", "ham",
  "pepperoni", "pesto", "mozzarella"]);

function planAssembly(dish, items = []) {
  const selected = [...items].sort((a, b) => a.scene.level - b.scene.level || a.scene.form.localeCompare(b.scene.form) || a.id.localeCompare(b.id));
  if (selected.length > 4 || new Set(selected.map(item => item.id)).size !== selected.length ||
      selected.some(item => !FORMS.has(item.scene.form))) throw new Error("Invalid visual selection.");
  const shell = { roll: "rice-sheet", wrap: "flatbread", burger: "bun", boat: "boat" }[dish.modelPreset];
  const hasShell = Boolean(shell && selected.some(item => item.scene.form === shell));
  // Folding is independent of the answer key and of the last ingredient clicked.
  const phase = selected.length === 4 ? "assembled" : "open";
  return { preset: dish.modelPreset, phase, folded: phase === "assembled" && hasShell && ["roll", "wrap"].includes(dish.modelPreset),
    hasShell, items: selected, representedIds: selected.map(item => item.id) };
}

module.exports = { FORMS, planAssembly };
