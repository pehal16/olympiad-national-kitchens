"use strict";

// Menu revision is frozen into each issued question; v2 snapshots stay unchanged.
const menu = require('./tour4-menu-v3.json');
module.exports = menu.orders.map(({ style, text, dishes }, index) => ({
  id: `T4-${String(index + 1).padStart(2, "0")}`,
  type: "single_choice", interactionMode: "guest_order", presentationVersion: 1, menuVersion: 3,
  prompt: `Заказ гостя № ${index + 1}`, maxScore: 4,
  cuisine: "mixed", cuisineGroup: "general",
  dishId: dishes[0].id, dishIds: dishes.map(({ id }) => id),
  guestOrder: { number: index + 1, style, text },
  options: dishes.map(({ id, title, description, imageUrl }, position) => ({
    id: `menu-${position + 1}`, menuDishId: id, text: title, description,
    imageUrl, imageAlt: title, isCorrect: position === 0
  }))
}));
