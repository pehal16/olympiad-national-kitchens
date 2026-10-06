"use strict";

// Match the immutable photograph, not the score: another recipe must never
// inherit a canonical serving photograph merely because it received full marks.
const servings = new Map([
  ["/assets/olympiad/tour5/photo-v4/40d0331e32ced98b858ec60f.webp", {
    imageUrl: "/assets/olympiad/tour5/service/plates/pizza-served-v3.webp",
    imageAlt: "Маргарита на светлой тарелке, нарезанная на восемь долек"
  }],
  ["/assets/olympiad/tour5/photo-v4/6aad7b5c766293d552299676.webp", {
    imageUrl: "/assets/olympiad/tour5/service/plates/greek-served-v3.webp",
    imageAlt: "Греческий салат с фетой в небольшой керамической миске"
  }],
  ["/assets/olympiad/tour5/photo-v4/eb8483a389517cf1dfa6a2ea.webp", {
    imageUrl: "/assets/olympiad/tour5/service/plates/roll-served-v3.webp",
    imageAlt: "Восемь кусочков Филадельфии с соевым соусом, имбирём и васаби",
    includesAccompaniments: true
  }]
]);

function servingFor(photos, isTray) {
  if (isTray || photos.length !== 1) return null;
  const serving = servings.get(photos[0].imageUrl);
  return serving ? { ...serving } : null;
}

module.exports = { servingFor };
