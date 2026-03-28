const fs = require("fs");
const path = require("path");

const olympiad = require("../data/olympiad");

const cuisineLabels = {
  ru: "Русская кухня",
  fr: "Французская кухня",
  it: "Итальянская кухня",
  jp: "Японская кухня",
  mx: "Мексиканская кухня",
  de: "Немецкая кухня",
  uk: "Английская кухня",
  balkan: "Балканская кухня",
  mixed: "Смешанный блок"
};

const typeLabels = {
  single_choice: "Один правильный ответ",
  bucket_sort: "Распределение по группам",
  ingredient_matrix: "Собери блюдо",
  sequence_drag: "Последовательность действий"
};

function getCuisineLabel(code) {
  return cuisineLabels[code] || code || "Не указано";
}

function getTypeLabel(code) {
  return typeLabels[code] || code;
}

function formatSingleChoice(question) {
  const correct = question.options.find((option) => option.isCorrect);
  return {
    id: question.id,
    type: question.type,
    typeLabel: getTypeLabel(question.type),
    cuisine: question.cuisine,
    cuisineLabel: getCuisineLabel(question.cuisine),
    dishId: question.dishId || null,
    dishLabel: question.dishLabel || null,
    prompt: question.prompt,
    scenario: question.scenario || "",
    note: question.note || "",
    maxScore: question.maxScore,
    options: question.options.map((option) => ({
      id: option.id,
      text: option.text
    })),
    key: correct
      ? {
          correctOptionId: correct.id,
          correctOptionText: correct.text
        }
      : null
  };
}

function formatBucketTask(task) {
  return {
    id: task.id,
    type: task.type,
    typeLabel: getTypeLabel(task.type),
    cuisine: task.cuisine,
    cuisineLabel: getCuisineLabel(task.cuisine),
    dishId: task.dishId || null,
    dishLabel: task.dishLabel || null,
    prompt: task.prompt,
    scenario: task.scenario || "",
    note: task.note || "",
    maxScore: task.maxScore,
    buckets: task.buckets.map((bucket) => ({
      id: bucket.id,
      label: bucket.label
    })),
    items: task.items.map((item) => ({
      id: item.id,
      text: item.text
    })),
    key: task.items.map((item) => {
      const bucketId = task.correctBuckets[item.id];
      const bucket = task.buckets.find((entry) => entry.id === bucketId);
      return {
        itemId: item.id,
        itemText: item.text,
        bucketId,
        bucketLabel: bucket ? bucket.label : bucketId
      };
    })
  };
}

function formatIngredientMatrix(task) {
  const correctIds = new Set(task.correctIngredientIds);
  return {
    id: task.id,
    type: task.type,
    typeLabel: getTypeLabel(task.type),
    cuisine: task.cuisine,
    cuisineLabel: getCuisineLabel(task.cuisine),
    dishId: task.dishId || null,
    dishLabel: task.dishLabel || null,
    prompt: task.prompt,
    scenario: task.scenario || "",
    note: task.note || "",
    maxScore: task.maxScore,
    items: task.items.map((item) => ({
      id: item.id,
      text: item.text
    })),
    key: {
      included: task.items
        .filter((item) => correctIds.has(item.id))
        .map((item) => ({ id: item.id, text: item.text })),
      excluded: task.items
        .filter((item) => !correctIds.has(item.id))
        .map((item) => ({ id: item.id, text: item.text }))
    }
  };
}

function formatSequenceTask(task) {
  const sequenceIds = new Set(task.correctSequence);
  const itemMap = new Map(task.items.map((item) => [item.id, item.text]));
  return {
    id: task.id,
    type: task.type,
    typeLabel: getTypeLabel(task.type),
    cuisine: task.cuisine,
    cuisineLabel: getCuisineLabel(task.cuisine),
    dishId: task.dishId || null,
    dishLabel: task.dishLabel || null,
    prompt: task.prompt,
    scenario: task.scenario || "",
    note: task.note || "",
    maxScore: task.maxScore,
    items: task.items.map((item) => ({
      id: item.id,
      text: item.text
    })),
    key: {
      correctSequence: task.correctSequence.map((itemId, index) => ({
        step: index + 1,
        id: itemId,
        text: itemMap.get(itemId) || itemId
      })),
      distractors: task.items
        .filter((item) => !sequenceIds.has(item.id))
        .map((item) => ({ id: item.id, text: item.text }))
    }
  };
}

function formatCaseCluster(cluster) {
  return {
    id: cluster.id,
    type: "case_cluster",
    typeLabel: "Кейс-кластер",
    cuisine: cluster.cuisine,
    cuisineLabel: getCuisineLabel(cluster.cuisine),
    dishId: cluster.dishId || null,
    dishLabel: cluster.caseTitle,
    prompt: cluster.caseTitle,
    scenario: cluster.scenario || "",
    questions: cluster.questions.map(formatSingleChoice)
  };
}

function buildExportModel() {
  return {
    generatedAt: new Date().toISOString(),
    olympiad: {
      id: olympiad.id,
      title: olympiad.title,
      subtitle: olympiad.subtitle,
      description: olympiad.description
    },
    tours: olympiad.tours.map((tour) => {
      let items = [];

      if (tour.code === "T1") {
        items = olympiad.questionBank.tour1Pools.map((pool) => ({
          id: pool.id,
          title: pool.title,
          questions: pool.questions.map(formatSingleChoice)
        }));
      } else if (tour.code === "T2") {
        items = olympiad.questionBank.tour2Blocks.map(formatBucketTask);
      } else if (tour.code === "T3") {
        items = olympiad.questionBank.tour3Matrices.map(formatIngredientMatrix);
      } else if (tour.code === "T4") {
        items = olympiad.questionBank.tour4Tasks.map((task) => {
          if (task.type === "single_choice") return formatSingleChoice(task);
          if (task.type === "bucket_sort") return formatBucketTask(task);
          return formatSequenceTask(task);
        });
      } else if (tour.code === "T5") {
        items = olympiad.questionBank.tour5Cases.map(formatCaseCluster);
      }

      return {
        code: tour.code,
        title: tour.title,
        description: tour.description,
        timeLimitMinutes: tour.timeLimitMinutes,
        maxScore: tour.maxScore,
        items
      };
    })
  };
}

function buildMarkdown(model) {
  const lines = [];
  lines.push(`# Полный банк заданий с ключами`);
  lines.push("");
  lines.push(`Дата выгрузки: ${model.generatedAt}`);
  lines.push("");
  lines.push(`Олимпиада: ${model.olympiad.title}`);
  lines.push("");

  for (const tour of model.tours) {
    lines.push(`## ${tour.code}. ${tour.title}`);
    lines.push("");
    lines.push(`${tour.description}`);
    lines.push("");

    if (tour.code === "T1") {
      for (const pool of tour.items) {
        lines.push(`### ${pool.id}. ${pool.title}`);
        lines.push("");
        for (const question of pool.questions) {
          lines.push(`**${question.id}. ${question.prompt}**`);
          if (question.scenario) lines.push(`Ситуация: ${question.scenario}`);
          lines.push(`Кухня: ${question.cuisineLabel}`);
          lines.push(`Баллы: ${question.maxScore}`);
          lines.push("");
          for (const option of question.options) {
            lines.push(`- ${option.id}) ${option.text}`);
          }
          lines.push(`Ключ: ${question.key.correctOptionId}) ${question.key.correctOptionText}`);
          lines.push("");
        }
      }
      continue;
    }

    for (const item of tour.items) {
      if (item.type === "case_cluster") {
        lines.push(`### ${item.id}. ${item.dishLabel}`);
        lines.push("");
        lines.push(`Кухня: ${item.cuisineLabel}`);
        lines.push(`Ситуация: ${item.scenario}`);
        lines.push("");
        for (const question of item.questions) {
          lines.push(`**${question.id}. ${question.prompt}**`);
          for (const option of question.options) {
            lines.push(`- ${option.id}) ${option.text}`);
          }
          lines.push(`Ключ: ${question.key.correctOptionId}) ${question.key.correctOptionText}`);
          lines.push("");
        }
        continue;
      }

      lines.push(`### ${item.id}. ${item.prompt}`);
      lines.push("");
      lines.push(`Тип: ${item.typeLabel}`);
      lines.push(`Кухня: ${item.cuisineLabel}`);
      if (item.dishLabel) lines.push(`Блюдо: ${item.dishLabel}`);
      if (item.scenario) lines.push(`Ситуация: ${item.scenario}`);
      if (item.note) lines.push(`Примечание: ${item.note}`);
      lines.push(`Баллы: ${item.maxScore}`);
      lines.push("");

      if (item.type === "single_choice") {
        for (const option of item.options) {
          lines.push(`- ${option.id}) ${option.text}`);
        }
        lines.push(`Ключ: ${item.key.correctOptionId}) ${item.key.correctOptionText}`);
        lines.push("");
        continue;
      }

      if (item.type === "bucket_sort") {
        lines.push("Карточки:");
        for (const card of item.items) {
          lines.push(`- ${card.text}`);
        }
        lines.push("Зоны:");
        for (const bucket of item.buckets) {
          lines.push(`- ${bucket.label}`);
        }
        lines.push("Ключ:");
        for (const keyRow of item.key) {
          lines.push(`- ${keyRow.itemText} -> ${keyRow.bucketLabel}`);
        }
        lines.push("");
        continue;
      }

      if (item.type === "ingredient_matrix") {
        lines.push("Карточки ингредиентов:");
        for (const ingredient of item.items) {
          lines.push(`- ${ingredient.text}`);
        }
        lines.push("Ключ: входит в блюдо");
        for (const ingredient of item.key.included) {
          lines.push(`- ${ingredient.text}`);
        }
        lines.push("Ключ: лишнее");
        for (const ingredient of item.key.excluded) {
          lines.push(`- ${ingredient.text}`);
        }
        lines.push("");
        continue;
      }

      if (item.type === "sequence_drag") {
        lines.push("Карточки:");
        for (const card of item.items) {
          lines.push(`- ${card.text}`);
        }
        lines.push("Ключевой порядок:");
        for (const step of item.key.correctSequence) {
          lines.push(`- Шаг ${step.step}: ${step.text}`);
        }
        if (item.key.distractors.length > 0) {
          lines.push("Лишние карточки:");
          for (const distractor of item.key.distractors) {
            lines.push(`- ${distractor.text}`);
          }
        }
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

function main() {
  const model = buildExportModel();
  const exportDir = path.join(__dirname, "..", "exports");
  const datePart = new Date().toISOString().slice(0, 10);
  const jsonPath = path.join(exportDir, `bank-with-keys-${datePart}.json`);
  const mdPath = path.join(exportDir, `bank-with-keys-${datePart}.md`);

  fs.mkdirSync(exportDir, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(model, null, 2), "utf8");
  fs.writeFileSync(mdPath, buildMarkdown(model), "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        jsonPath,
        mdPath
      },
      null,
      2
    )
  );
}

main();
