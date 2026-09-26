// Editorial reserve only: deliberately not imported by the active blueprint.
// A reviewed photo and a complete answer set are required before activation.
module.exports = [
  "Онигири", "Тирамису", "Чуррос", "Макарон", "Fish and chips",
  "Фо-бо", "Бибимбап", "Борщ", "Пельмени", "Шакшука",
  "Пахлава", "Гёдза", "Ттокпокки", "Буррито", "Лагман"
].map((dishLabel, index) => ({
  id: `T1-R${String(index + 1).padStart(2, "0")}`,
  status: "reserve", active: false, type: "single_choice",
  prompt: "Какое блюдо изображено на фотографии?", dishLabel, maxScore: 2,
  imageUrl: null, options: [],
  activationRequires: ["reviewed_image", "four_reviewed_options", "organizer_approval"]
}));
