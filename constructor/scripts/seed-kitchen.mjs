import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url),
  root = path.resolve(import.meta.dirname, "../..");
const o = require("../../data/olympiad.js"),
  v = require("../../src/variant.js").buildVariant(o, {
    seed: "constructor-reference-1",
  });
const used = new Set();
function assets(value) {
  if (typeof value === "string" && value.startsWith("/assets/")) {
    used.add(value);
    return "/constructor/legacy" + value;
  }
  if (Array.isArray(value)) return value.map(assets);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, assets(v)]),
    );
  return value;
}
function convert(q) {
  let type =
    q.type === "bucket_sort"
      ? "matching"
      : q.type === "dish_detective"
        ? "short_text"
        : q.type === "final_kitchen"
          ? "restaurant_kitchen"
          : q.type;
  const item = {
    id: q.id,
    type,
    title: q.prompt,
    prompt: [q.scenario, q.guestOrder?.text, q.note].filter(Boolean).join("\n"),
    maxScore: q.maxScore,
    seconds: 0,
    grading: "automatic",
    required: true,
    partialCredit: ["matching", "restaurant_kitchen"].includes(type),
    shuffle: true,
    config: {},
    key: {},
    media: q.imageUrl
      ? [{ url: q.imageUrl, mime: "image/webp", alt: q.imageAlt || q.prompt }]
      : [],
    rubric: [],
    source: "Исходный банк национальных кухонь, редакция a19b073",
    explanation: "",
    dialogue: q.dialogue?.line || "",
  };
  if (type === "single_choice") {
    item.config.options = q.options.map(({ isCorrect, ...x }) => ({
      ...x,
      label: x.text,
    }));
    item.key = { optionId: q.options.find((x) => x.isCorrect)?.id };
  }
  if (type === "matching") {
    item.config = {
      items: q.items.map((x) => ({ ...x, label: x.text })),
      targets: q.buckets,
    };
    item.key = { mapping: q.correctBuckets };
  }
  if (type === "short_text") {
    item.config = { clues: q.clues };
    item.key = {
      acceptedAnswers: [
        q.answerPolicy.canonical,
        ...q.answerPolicy.aliases,
        ...q.answerPolicy.english,
        ...q.answerPolicy.misspellings,
      ],
    };
  }
  if (type === "restaurant_kitchen") {
    const d = q.dishes[0];
    item.title = d.title;
    item.config = {
      items: d.items.map((x) => ({ ...x, label: x.text })),
      slots: [],
      selectCount: 4,
      photo: d.photo,
      kind: d.photo.kind,
      variantLabel: d.variantLabel,
      stages:
        d.photo.kind === "pizza"
          ? [
              "Выбор компонентов",
              "Сформовать основу",
              "Добавить компоненты",
              "Запечь и подать",
            ]
          : ["Выбор компонентов", "Подготовить", "Собрать и подать"],
    };
    item.key = { selectedIds: d.correctIngredientIds };
  }
  return assets(item);
}
const project = {
  title: "Ресторан путешествий",
  kind: "olympiad",
  subject: "Национальные кухни мира",
  audience: "Учебный образец",
  description:
    "Пять глав, 36 заданий, 150 баллов. Изолированный образец без участников и официальных результатов.",
  legend:
    "Гость собирает воспоминания о национальных кухнях мира. Помогите ему пройти путь от фотоальбома до финального стола.",
  finalText:
    "Путешествие завершено. Результаты и документы откроются в соответствии с настройками организатора.",
  cover: assets("/assets/olympiad/landing/hero-national-cuisines.webp"),
  narrator: {
    enabled: true,
    intro: "Начнём наше гастрономическое путешествие.",
    neutral: "Ваш выбор отмечен.",
    image: assets("/assets/olympiad/story/layout-v4/portraits/album.webp"),
  },
  theme: { accent: "#005b43", background: "#f5f7f8" },
  rounds: v.tours.map((t) => ({
    id: t.id,
    title: t.title,
    instructions: t.description,
    seconds: 0,
    shuffle: false,
    selectCount: 0,
    allowBack: true,
    allowSkip: true,
    transition: "automatic",
    threshold: 0,
    questions: v.questions.filter((q) => q.tourId === t.id).map(convert),
  })),
  awardRules: [],
  status: "draft",
};
fs.writeFileSync(
  path.join(root, "constructor/server/kitchen.json"),
  JSON.stringify(project, null, 2),
);
const target = path.join(root, "constructor/public/legacy");
fs.mkdirSync(target, { recursive: true });
for (const src of used) {
  const file = path.join(root, "public", src),
    dest = path.join(target, src);
  if (!fs.existsSync(file)) throw new Error("Missing source image " + src);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(file, dest);
}
console.log(
  JSON.stringify({
    questions: project.rounds.flatMap((r) => r.questions).length,
    points: project.rounds
      .flatMap((r) => r.questions)
      .reduce((s, q) => s + q.maxScore, 0),
    assets: used.size,
  }),
);
