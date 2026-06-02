function makeOptions(options, correctId) {
  return options.map(([id, text]) => ({
    id,
    text,
    isCorrect: id === correctId
  }));
}

function toArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function buildQuestionMetadata(meta = {}, fallback = {}) {
  return {
    theme: meta.theme || fallback.theme || "",
    difficulty: meta.difficulty || fallback.difficulty || "standard",
    taskKind: meta.taskKind || fallback.taskKind || "generic",
    competencyTags: uniqueText([
      ...toArray(fallback.competencyTags),
      ...toArray(meta.competencyTags)
    ]),
    fgosCodes: uniqueText([
      ...toArray(fallback.fgosCodes),
      ...toArray(meta.fgosCodes)
    ]),
    estimatedSeconds:
      Number(meta.estimatedSeconds || fallback.estimatedSeconds || 60) || 60,
    assetRefs: uniqueText([...toArray(fallback.assetRefs), ...toArray(meta.assetRefs)]),
    qualityFlags: uniqueText([
      ...toArray(fallback.qualityFlags),
      ...toArray(meta.qualityFlags)
    ]),
    methodicalFocus: meta.methodicalFocus || fallback.methodicalFocus || "",
    cuisineLabel: meta.cuisineLabel || fallback.cuisineLabel || "",
    dishLabel: meta.dishLabel || fallback.dishLabel || ""
  };
}

function uniqueText(items) {
  return [...new Set((items || []).filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];
}

function makeSingleChoice(id, poolId, prompt, options, correctId, meta = {}) {
  return {
    id,
    poolId,
    type: "single_choice",
    prompt,
    scenario: meta.scenario || "",
    note: meta.note || "",
    maxScore: meta.maxScore || 2,
    cuisine: meta.cuisine || "mixed",
    cuisineGroup: meta.cuisineGroup || "general",
    dishId: meta.dishId || null,
    metadata: buildQuestionMetadata(meta, {
      taskKind: "single_choice",
      estimatedSeconds: 45,
      dishLabel: meta.dishLabel || "",
      cuisineLabel: meta.cuisineLabel || ""
    }),
    options: makeOptions(options, correctId)
  };
}

function makeMatchBlock(id, prompt, pairs, buckets, meta = {}) {
  return {
    id,
    type: "bucket_sort",
    prompt,
    scenario: meta.scenario || "",
    note:
      meta.note ||
      "Перетащите карточки блюд в правильные кухни. В каждом блоке засчитывается каждое верное соответствие.",
    maxScore: 10,
    cuisine: "mixed",
    cuisineGroup: "mixed",
    dishIds: pairs.map((pair) => pair.dishId),
    cuisines: pairs.map((pair) => pair.cuisine),
    metadata: buildQuestionMetadata(meta, {
      taskKind: "bucket_sort",
      theme: "Соотнесение блюда и кухни",
      estimatedSeconds: 90,
      competencyTags: ["идентификация блюд", "национальные кухни"],
      cuisineLabel: "mixed"
    }),
    items: pairs.map((pair) => ({
      id: pair.dishId,
      text: pair.text
    })),
    buckets: buckets.map((bucket) => ({
      id: bucket.id,
      label: bucket.label
    })),
    correctBuckets: Object.fromEntries(
      pairs.map((pair) => [pair.dishId, pair.cuisine])
    )
  };
}

function makeIngredientMatrix(id, dishId, dishName, cuisine, cuisineGroup, ingredients, correctIds, meta = {}) {
  return {
    id,
    type: "ingredient_matrix",
    prompt:
      meta.prompt ||
      `Соберите блюдо «${dishName}»: выберите только те продукты, которые входят в базовую технологическую матрицу.`,
    scenario:
      meta.scenario ||
      `Перед запуском блюда «${dishName}» студент должен быстро отделить профильные компоненты от лишних.`,
    note:
      meta.note ||
      "Перетащите ингредиенты в зону «Входит в блюдо» или «Лишнее». За лишние выбранные ингредиенты начисляется штраф.",
    maxScore: 5,
    dishId,
    dishLabel: dishName,
    cuisine,
    cuisineGroup,
    metadata: buildQuestionMetadata(meta, {
      taskKind: "ingredient_matrix",
      theme: dishName,
      estimatedSeconds: 100,
      dishLabel: dishName,
      cuisineLabel: cuisine
    }),
    items: ingredients.map(([itemId, text]) => ({
      id: itemId,
      text
    })),
    buckets: [
      { id: "selected", label: "Входит в блюдо" },
      { id: "ignored", label: "Лишнее" }
    ],
    correctIngredientIds: correctIds
  };
}

function makeSequenceTask(id, dishId, dishName, cuisine, cuisineGroup, prompt, steps, distractors, meta = {}) {
  return {
    id,
    type: "sequence_drag",
    prompt,
    scenario:
      meta.scenario ||
      `Нужно принять технологически верное решение по блюду «${dishName}» и выстроить рабочую последовательность действий.`,
    note:
      meta.note ||
      "Перетащите карточки в правильный порядок. Лишние карточки оставьте в банке.",
    maxScore: 4,
    dishId,
    dishLabel: dishName,
    cuisine,
    cuisineGroup,
    metadata: buildQuestionMetadata(meta, {
      taskKind: "sequence_drag",
      theme: dishName,
      estimatedSeconds: 90,
      dishLabel: dishName,
      cuisineLabel: cuisine
    }),
    items: [...steps, ...distractors].map(([itemId, text]) => ({
      id: itemId,
      text
    })),
    slots: [
      { id: `${id}-s1`, label: "Шаг 1" },
      { id: `${id}-s2`, label: "Шаг 2" },
      { id: `${id}-s3`, label: "Шаг 3" },
      { id: `${id}-s4`, label: "Шаг 4" }
    ],
    correctSequence: steps.map(([itemId]) => itemId)
  };
}

function makeBucketTask(id, dishId, dishName, cuisine, cuisineGroup, prompt, items, goodBucketLabel, badBucketLabel, correctMap, meta = {}) {
  return {
    id,
    type: "bucket_sort",
    prompt,
    scenario:
      meta.scenario ||
      `Определите, какие решения по блюду «${dishName}» технологически допустимы, а какие ведут к дефекту.`,
    note:
      meta.note ||
      "Распределите карточки по правильным зонам.",
    maxScore: 4,
    dishId,
    dishLabel: dishName,
    cuisine,
    cuisineGroup,
    metadata: buildQuestionMetadata(meta, {
      taskKind: "bucket_sort",
      theme: dishName,
      estimatedSeconds: 85,
      dishLabel: dishName,
      cuisineLabel: cuisine
    }),
    items: items.map(([itemId, text]) => ({
      id: itemId,
      text
    })),
    buckets: [
      { id: "good", label: goodBucketLabel },
      { id: "bad", label: badBucketLabel }
    ],
    correctBuckets: correctMap
  };
}

function makeLogicChoice(id, dishId, dishName, cuisine, cuisineGroup, prompt, options, correctId, meta = {}) {
  return {
    id,
    type: "single_choice",
    prompt,
    scenario:
      meta.scenario ||
      `Определите наиболее профессиональное действие в ситуации, связанной с блюдом «${dishName}».`,
    note: meta.note || "",
    maxScore: 4,
    dishId,
    dishLabel: dishName,
    cuisine,
    cuisineGroup,
    metadata: buildQuestionMetadata(meta, {
      taskKind: "single_choice_logic",
      theme: dishName,
      estimatedSeconds: 60,
      dishLabel: dishName,
      cuisineLabel: cuisine
    }),
    options: makeOptions(options, correctId)
  };
}

function makeCaseCluster(caseId, caseTitle, cuisine, cuisineGroup, dishId, scenario, questions) {
  return {
    id: caseId,
    caseTitle,
    scenario,
    cuisine,
    cuisineGroup,
    dishId,
    questions: questions.map((question, index) => ({
      id: `${caseId}-q${index + 1}`,
      type: "single_choice",
      prompt: question.prompt,
      scenario,
      note: question.note || "",
      maxScore: 4,
      dishId,
      dishLabel: caseTitle,
      cuisine,
      cuisineGroup,
      metadata: buildQuestionMetadata(question, {
        taskKind: "case_choice",
        theme: caseTitle,
        estimatedSeconds: 75,
        dishLabel: caseTitle,
        cuisineLabel: cuisine,
        competencyTags: question.competencyTags || []
      }),
      options: makeOptions(question.options, question.correctId)
    }))
  };
}

module.exports = {
  makeSingleChoice,
  makeMatchBlock,
  makeIngredientMatrix,
  makeSequenceTask,
  makeBucketTask,
  makeLogicChoice,
  makeCaseCluster
};
