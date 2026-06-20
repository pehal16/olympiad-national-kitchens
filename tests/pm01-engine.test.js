const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  getPm01Exam,
  getPm01PublicData,
  getPm01MaterialTicket,
  isPm01TicketCompatibleWithVariant,
  buildPm01Variant,
  sanitizePm01Question,
  scorePm01Question,
  summarizePm01Attempt,
  applyPm01VoiceReview
} = require("../src/pm01-engine");

test("PM01 fixed variants keep the 100-point module contract", () => {
  const exam = getPm01Exam();

  exam.variants.forEach((examVariant) => {
    const variant = buildPm01Variant(exam, examVariant.id);
    assert.equal(variant.questions.length, 20);

    variant.modules.forEach((module) => {
      const moduleScore = variant.questions
        .filter((question) => question.moduleId === module.id)
        .reduce((sum, question) => sum + Number(question.maxScore || 0), 0);
      assert.equal(moduleScore, module.maxScore, `${examVariant.id} ${module.code}`);
    });
  });
});

test("PM01 questions keep valid methodological mappings and competency tags", () => {
  const exam = getPm01Exam();

  exam.variants.forEach((examVariant) => {
    const variant = buildPm01Variant(exam, examVariant.id);
    const variantTags = new Set(examVariant.competencies || []);

    variant.questions.forEach((question) => {
      assert.equal(question.prompt.trim().length > 12, true, `${question.id} prompt is meaningful`);
      assert.equal(question.competencyTags.length >= variantTags.size, true, `${question.id} has competency tags`);
      variantTags.forEach((tag) => {
        assert.equal(question.competencyTags.includes(tag), true, `${question.id} includes ${tag}`);
      });

      if (question.moduleId === "test") {
        assert.equal(/^Что такое\s/i.test(question.prompt), false, `${question.id} is framed as a task`);
      }

      if (question.type === "single_choice") {
        assert.equal(question.options.filter((option) => option.isCorrect).length, 1, `${question.id} has one correct option`);
      }

      if (question.type === "multiple_choice") {
        assert.equal(question.options.filter((option) => option.isCorrect).length > 1, true, `${question.id} has several correct options`);
      }

      if (question.type === "sequence_drag") {
        const itemIds = new Set(question.items.map((item) => item.id));
        assert.equal(question.correctSequence.length, question.items.length, `${question.id} sequence is complete`);
        assert.equal(new Set(question.correctSequence).size, question.correctSequence.length, `${question.id} has unique sequence keys`);
        question.correctSequence.forEach((itemId) => {
          assert.equal(itemIds.has(itemId), true, `${question.id} sequence item exists: ${itemId}`);
        });
      }

      if (question.type === "bucket_sort") {
        const itemIds = new Set(question.items.map((item) => item.id));
        const bucketIds = new Set(question.buckets.map((bucket) => bucket.id));
        assert.deepEqual(Object.keys(question.correctBuckets).sort(), [...itemIds].sort(), `${question.id} maps every item`);
        Object.entries(question.correctBuckets).forEach(([itemId, bucketId]) => {
          assert.equal(itemIds.has(itemId), true, `${question.id} item exists: ${itemId}`);
          assert.equal(bucketIds.has(bucketId), true, `${question.id} bucket exists: ${bucketId}`);
        });
        if (question.visualMode === "cut_shapes") {
          assert.equal(new Set(Object.values(question.correctBuckets)).size, question.buckets.length, `${question.id} cut targets are one-to-one`);
        }
      }
    });
  });
});

test("PM01 M1 test contains only test-style choice questions", () => {
  const exam = getPm01Exam();
  const variantIds = ["mixed", ...exam.variants.map((variant) => variant.id)];

  variantIds.forEach((variantId) => {
    const variant = buildPm01Variant(exam, variantId, { seed: `m1-audit-${variantId}` });
    const testQuestions = variant.questions.filter((question) => question.moduleId === "test");
    assert.equal(testQuestions.length, 10, `${variantId} M1 keeps 10 questions`);
    assert.equal(
      testQuestions.every((question) => ["single_choice", "multiple_choice"].includes(question.type)),
      true,
      `${variantId} M1 uses only choice questions`
    );
    assert.equal(
      testQuestions.some((question) => String(question.sourceId || "").includes("-sim-")),
      false,
      `${variantId} M1 does not include simulation-bank questions`
    );
  });
});

test("PM01 safety and exception questions are framed as clear production situations", () => {
  const exam = getPm01Exam();
  const questions = new Map(
    exam.variants.flatMap((examVariant) =>
      buildPm01Variant(exam, examVariant.id, { seed: `clarity-${examVariant.id}` }).questions.map((question) => [
        question.sourceId,
        question
      ])
    )
  );
  const oldGenericPrompts = [
    "При эксплуатации оборудования выберите действие, которое запрещено выполнять.",
    "При размещении полуфабрикатов из птицы выберите действие, которое нельзя выполнять.",
    "При расчете сырья по сборнику рецептур определите недопустимое действие студента.",
    "При хранении готовой партии выберите ошибку, которая нарушает безопасность.",
    "Для отделения мяса от костей выберите нужный инструмент.",
    "При загрузке мяса в мясорубку выберите разрешенный способ подачи сырья.",
    "При приемке тушек выберите признаки, по которым оценивают качество птицы.",
    "При получении комплексного заказа выберите первое действие студента."
  ];
  const allPrompts = [...questions.values()].map((question) => question.prompt).join("\n");
  const allOptionText = [...questions.values()]
    .flatMap((question) => question.options || [])
    .map((option) => option.text)
    .join("\n");

  oldGenericPrompts.forEach((prompt) => {
    assert.equal(allPrompts.includes(prompt), false, `old generic wording removed: ${prompt}`);
  });
  [
    "цвет посуды",
    "цвет маркировки лотка",
    "в моечную посуды",
    "в склад готовой продукции",
    "на склад готовой продукции",
    "любимое блюдо повара",
    "одинаковая цена товаров",
    "продажа продуктов соседнему цеху",
    "журнал посещаемости",
    "расписание занятий",
    "личный блокнот",
    "тестораскаточная лента",
    "любые пищевые отходы",
    "только жидкие соусы",
    "только соль и сахар",
    "увеличить массу продукта",
    "сладкую, кислую, соленую",
    "вареную, жареную, тушеную",
    "чтобы скрыть запах порчи",
    "чтобы увеличить отходы",
    "чтобы заменить тепловую обработку",
    "чтобы овощи были одинакового цвета",
    "чтобы быстрее оформить заявку",
    "пищевые отходы после очистки овощей",
    "цвет разделочной доски",
    "заменить входной контроль качества сырья",
    "заменить мойку сырья перед очисткой",
    "заменить маркировку партии",
    "номер учебной смены без названия продукта",
    "номер стеллажа без даты изготовления",
    "с расчета цены реализации",
    "мусат для мясного цеха",
    "для варки мяса",
    "для хранения фарша",
    "для мытья досок",
    "открытым на столе",
    "около плиты",
    "вместе с отходами",
    "нарезанные овощи оставить открытыми на 5 часов",
    "поставить очищенный картофель рядом с отходами",
    "оставить зелень на полу у рабочего стола",
    "для нарезки овощей",
    "для измельчения мяса",
    "для взвешивания рыбы",
    "при комнатной температуре на столе",
    "на открытом столе без тары",
    "около плиты для ускорения работы",
    "открыто на столе",
    "в горячей воде без контроля",
    "на полу у стола",
    "кладут тушку рядом с отходами",
    "оставляют тушку без охлаждения",
    "смешивают птицу с овощами",
    "овощерезку",
    "мясорыхлитель",
    "сито",
    "в кондитерском цехе",
    "в зоне сухих круп",
    "использовать быстрее",
    "промыть и продолжить",
    "смешать с другим сырьем",
    "любое свободное место",
    "рядом с готовыми овощами",
    "на полу",
    "использовать в первую очередь",
    "смешать с качественным",
    "замариновать"
  ].forEach((phrase) => {
    assert.equal(allOptionText.includes(phrase), false, `cartoon distractor removed: ${phrase}`);
  });
  assert.match(questions.get("meat-t1-forbidden").prompt, /МИМ-82/);
  assert.match(questions.get("meat-t1-forbidden").prompt, /до полной остановки и отключения машины/);
  assert.match(questions.get("meat-t1-boning").prompt, /обвалочном столе/);
  assert.match(questions.get("meat-t1-pusher").prompt, /приемной горловине мясорубки/);
  assert.match(questions.get("fish-t1-danger").prompt, /сырой рыбой и уже подготовленными овощами/);
  assert.match(questions.get("fish-t1-storage").prompt, /ждут тепловой обработки/);
  assert.match(questions.get("poultry-t1-quality").prompt, /органолептическую оценку/);
  assert.match(questions.get("poultry-t1-storage").prompt, /ожидает тепловой обработки/);
  assert.match(questions.get("complex-t1-safety").prompt, /В холодильнике размещают/);
  assert.match(questions.get("complex-t1-start").prompt, /комплексный заказ/);
  assert.match(questions.get("veg-t1-calibration").prompt, /сортирует клубни по размеру/);
  assert.match(questions.get("veg-t1-recipe-book").prompt, /по одной рецептуре из сборника/);
});

test("sanitizePm01Question hides private checking data from students", () => {
  const exam = getPm01Exam();
  const variant = buildPm01Variant(exam, "vegetables");
  const question = variant.questions.find((item) => item.type === "calculation_task");
  const attempt = { answers: {} };

  const publicQuestion = sanitizePm01Question(question, attempt);
  const privateQuestion = sanitizePm01Question(question, attempt, { includePrivate: true });

  assert.equal("solutionSteps" in publicQuestion, false);
  assert.equal("correctAnswer" in publicQuestion, false);
  assert.equal("expected" in publicQuestion.fields[0], false);
  assert.equal(privateQuestion.solutionSteps.length > 0, true);
  assert.equal(privateQuestion.correctAnswer.length > 0, true);
});

test("PM01 public data exposes asset registry without visual answer keys", () => {
  const exam = getPm01Exam();
  const publicData = getPm01PublicData(exam);
  const variant = buildPm01Variant(exam, "vegetables");
  const visualSimulation = variant.questions.find((item) => item.id.startsWith("veg-sim-cuts"));
  const publicSimulation = sanitizePm01Question(visualSimulation, { answers: {} });
  const requiredCutShapes = [
    "julienne",
    "fineJulienne",
    "allumette",
    "brunoise",
    "fineBrunoise",
    "macedoine",
    "paysanne",
    "jardiniere",
    "chiffonade",
    "rondelle",
    "mirepoix",
    "batonnet",
    "wedges",
    "rings",
    "slices",
    "halfRings",
    "mediumCubes",
    "largeCubes",
    "shashki",
    "shavings",
    "balls"
  ];

  assert.equal(publicData.assetRegistry.workshops.vegetables.includes("vegetable-workshop.png"), true);
  assert.equal(publicData.assetRegistry.cutShapes.batonnet.endsWith("batonnet.png"), true);
  assert.equal(publicData.assetRegistry.cutShapes.slices.endsWith("slices.png"), true);
  assert.equal(publicData.programTitle.includes("ПМ.01"), true);
  assert.equal(publicData.developer, "Преподаватель Постовит Дмитрий Александрович");
  assert.equal(publicData.interdisciplinaryCourses.map((course) => course.code).join(","), "МДК 01.01,МДК 01.02");
  assert.equal(requiredCutShapes.every((key) => publicData.assetRegistry.cutShapes[key]), true);
  requiredCutShapes.forEach((key) => {
    const assetPath = path.join(__dirname, "..", "public", publicData.assetRegistry.cutShapes[key].replace(/^\//, ""));
    assert.equal(fs.existsSync(assetPath), true, `${key} asset exists`);
  });
  assert.equal(publicData.assetRegistry.violationScenes.vegetables.endsWith("vegetable.png"), true);
  assert.equal(publicSimulation.items.length, 11);
  assert.equal(publicSimulation.buckets.length, 11);
  assert.equal(publicSimulation.buckets.every((bucket) => bucket.image), true);
  assert.equal(publicSimulation.buckets.some((bucket) => bucket.image.endsWith(".svg")), false);
  assert.equal("correctBuckets" in publicSimulation, false);
  assert.equal("correctAnswer" in publicSimulation, false);
});

test("PM01 cut matching covers modern French knife cuts with real PNG cards", () => {
  const exam = getPm01Exam();
  const variant = buildPm01Variant(exam, "vegetables");
  const namingQuestion = variant.questions.find((item) => item.id.startsWith("veg-t1-cuts"));
  const applicationQuestion = variant.questions.find((item) => item.id.startsWith("veg-sim-cuts"));
  const expectedClassic = [
    "julienne",
    "fineJulienne",
    "allumette",
    "batonnet",
    "jardiniere",
    "brunoise",
    "fineBrunoise",
    "macedoine",
    "paysanne",
    "rondelle",
    "chiffonade",
    "mirepoix",
    "slices",
    "wedges"
  ];
  const expectedApplication = [
    "julienne",
    "allumette",
    "batonnet",
    "brunoise",
    "macedoine",
    "paysanne",
    "rondelle",
    "chiffonade",
    "mirepoix",
    "slices",
    "wedges"
  ];

  assert.equal(namingQuestion.type, "single_choice");
  assert.deepEqual(namingQuestion.options.map((item) => item.id).sort(), expectedClassic.map((id) => `${id}Photo`).sort());
  assert.deepEqual(applicationQuestion.items.map((item) => item.id).sort(), expectedApplication.sort());
  assert.equal(namingQuestion.options.length, expectedClassic.length);
  assert.equal(applicationQuestion.buckets.every((bucket) => bucket.detail.length > 20), true);

  applicationQuestion.buckets.forEach((bucket) => {
    const fullPath = path.join(__dirname, "..", "public", bucket.image.replace(/^\//, ""));
    assert.equal(fs.existsSync(fullPath), true, `${bucket.image} exists`);
  });
});

test("PM01 exam can generate a mixed route across all production areas", () => {
  const exam = getPm01Exam();
  const mixed = buildPm01Variant(exam, "mixed", { seed: "exam-student-001" });
  const sourceIds = mixed.questions.map((question) => question.sourceId);
  const moduleScores = new Map(
    mixed.modules.map((module) => [
      module.id,
      mixed.questions
        .filter((question) => question.moduleId === module.id)
        .reduce((sum, question) => sum + question.maxScore, 0)
    ])
  );
  const testPrefixes = new Set(
    mixed.questions
      .filter((question) => question.moduleId === "test")
      .map((question) => question.sourceId.split("-")[0])
  );
  const simulationPrefixes = new Set(
    mixed.questions
      .filter((question) => question.moduleId === "simulation")
      .map((question) => question.sourceId.split("-")[0])
  );

  assert.equal(mixed.variantId, "mixed");
  assert.equal(mixed.variantTitle, "Смешанный экзамен");
  assert.equal(mixed.questions.length, 20);
  assert.equal(new Set(sourceIds).size, sourceIds.length, "mixed route has no repeated source tasks");
  assert.equal(moduleScores.get("test"), 20);
  assert.equal(moduleScores.get("calculation"), 30);
  assert.equal(moduleScores.get("voice"), 20);
  assert.equal(moduleScores.get("simulation"), 30);
  ["veg", "fish", "meat", "poultry", "complex"].forEach((prefix) => {
    assert.equal(testPrefixes.has(prefix), true, `M1 includes ${prefix}`);
    assert.equal(simulationPrefixes.has(prefix), true, `M4 includes ${prefix}`);
  });
  assert.equal(mixed.materialTicket, null);
});

test("PM01 sequence cards are presented out of the correct order", () => {
  const exam = getPm01Exam();
  [...exam.variants.map((variant) => variant.id), "mixed"].forEach((variantId) => {
    const variant = buildPm01Variant(exam, variantId, { seed: `shuffle-${variantId}` });
    variant.questions
      .filter((question) => question.type === "sequence_drag")
      .forEach((question) => {
        const itemOrder = question.items.map((item) => item.id);
        assert.notDeepEqual(itemOrder, question.correctSequence, `${question.sourceId} is shuffled`);
      });
  });
});

test("PM01 student UI gives clear action steps for interactive tasks", () => {
  const uiScript = fs.readFileSync(path.join(__dirname, "..", "public", "pm01.js"), "utf8");
  const uiStyles = fs.readFileSync(path.join(__dirname, "..", "public", "pm01.css"), "utf8");
  const uiHtml = fs.readFileSync(path.join(__dirname, "..", "public", "pm01.html"), "utf8");
  const adminScript = fs.readFileSync(path.join(__dirname, "..", "public", "pm01-admin.js"), "utf8");
  const adminHtml = fs.readFileSync(path.join(__dirname, "..", "public", "pm01-admin.html"), "utf8");
  const approvalHtml = fs.readFileSync(path.join(__dirname, "..", "public", "pm01-approval.html"), "utf8");
  const approvalScript = fs.readFileSync(path.join(__dirname, "..", "public", "pm01-approval.js"), "utf8");
  const approvalDoc = fs.readFileSync(
    path.join(__dirname, "..", "docs", "pm01-digital-shift-approval-packages.md"),
    "utf8"
  );
  const meat = buildPm01Variant(getPm01Exam(), "meat", { seed: "ui-guides-meat" });
  const prompts = meat.questions.map((question) => question.prompt).join("\n");

  [
    "interactionStepGuide",
    "Шаги ответа",
    "Карточки операций",
    "Названия форм",
    "Фотографии и применение",
    "Группы",
    "Выберите карточку",
    "Нажмите подходящую группу",
    "Оцените фото и карту контроля",
    "renderTrainingLab",
    "Цифровая смена",
    "production_timeline",
    "storage_marking",
    "тренажёр · 0 баллов",
    "Смешанный маршрут",
    "Начать смешанный экзамен ПМ.01",
    "variantField?.classList.toggle(\"hidden\", !training)",
    "variantId: state.mode === \"training\" ? state.selectedVariantId : \"\""
  ].forEach((text) => {
    assert.equal(uiScript.includes(text), true, `student UI includes ${text}`);
  });
  assert.equal(uiHtml.includes("id=\"exam-route-note\""), true);
  assert.equal(uiHtml.includes("id=\"student-select\""), true);
  assert.equal(uiHtml.includes("id=\"free-name-field\""), true);
  assert.equal(uiHtml.includes("id=\"skip-question\""), true);
  assert.equal(uiHtml.includes("id=\"training-lab\""), true);
  assert.equal(uiHtml.includes("id=\"training-shift-reference\""), true);
  assert.equal(uiHtml.includes("Завершить весь экзамен"), true);
  assert.equal(uiHtml.includes("<select id=\"group-name\" required>"), true);
  assert.equal(uiHtml.includes("readonly"), true);
  assert.equal(uiScript.includes("PM01_STUDENT_GROUPS"), true);
  assert.equal(uiScript.includes("FREE_STUDENT_VALUE"), true);
  assert.equal(uiScript.includes("RESUME_STORAGE_KEY"), true);
  assert.equal(uiScript.includes("resumeStoredAttemptIfConfirmed"), true);
  assert.equal(uiScript.includes("rememberResumeAttempt"), true);
  assert.equal(uiScript.includes("renderStudentSelect"), true);
  assert.equal(uiScript.includes("selectedParticipantName"), true);
  assert.equal(uiScript.includes("skipQuestion"), true);
  assert.equal(uiScript.includes("Пропустить это задание"), true);
  assert.equal(uiScript.includes("Постовит Дмитрий Александрович"), true);
  assert.equal(uiScript.includes("Свободное имя"), true);
  assert.equal(uiScript.includes("Воропаев Артем Романович"), true);
  assert.equal(uiScript.includes("Волохова Яна Алексеевна"), true);
  assert.equal(uiScript.includes("Балакириева Анна"), true);
  assert.equal(uiScript.includes("Яговкин Владислав"), true);
  assert.equal(uiHtml.includes("2-ПК-25"), true);
  assert.equal(uiHtml.includes("1-ПК-25"), true);
  assert.equal(uiHtml.includes("1-ПКД-25"), true);
  assert.equal(uiStyles.includes(".task-guide-steps"), true);
  assert.equal(uiStyles.includes("input[readonly]"), true);
  assert.equal(uiStyles.includes(".interaction-panel-title"), true);
  assert.equal(uiStyles.includes(".results-overview"), true);
  assert.equal(uiStyles.includes(".score-mini-bar"), true);
  assert.equal(uiStyles.includes(".bucket-mode-quality-control"), true);
  assert.equal(uiStyles.includes(".digital-shift-preview"), true);
  assert.equal(uiStyles.includes(".digital-shift-task-grid"), true);
  assert.equal(uiStyles.includes(".module-step.is-practice"), true);
  assert.equal(uiStyles.includes(".bucket-mode-storage-marking"), true);
  assert.equal(uiStyles.includes(".sequence-mode-production-timeline"), true);
  assert.equal(uiStyles.includes(".approval-shell"), true);
  assert.equal(uiStyles.includes(".approval-package"), true);
  assert.equal(uiStyles.includes(".approval-task-row"), true);
  assert.equal(uiStyles.includes(".quality-card"), true);
  assert.equal(uiStyles.includes("@keyframes qualityScan"), true);
  assert.equal(adminHtml.includes("/pm01-approval.html"), true);
  assert.equal(approvalHtml.includes("id=\"approval-packages-list\""), true);
  assert.equal(approvalHtml.includes("Согласование PX"), true);
  assert.equal(approvalHtml.includes("/pm01-approval.js?v=1.0.0"), true);
  assert.equal(approvalScript.includes("/api/pm01/public/exam"), true);
  assert.equal(approvalScript.includes("copyPromptPackage"), true);
  assert.equal(approvalScript.includes("previewAssets"), true);
  assert.equal(approvalScript.includes("approval-asset-grid"), true);
  assert.equal(uiStyles.includes(".approval-asset-card"), true);
  assert.equal(approvalDoc.includes("Asset-пайплайн"), true);
  assert.equal(approvalScript.includes("Черновик до РП"), true);
  ["Овощной цех", "Рыбный цех", "Мясной цех", "Птица, дичь, кролик", "Комплексный заказ"].forEach((text) => {
    assert.equal(approvalDoc.includes(text), true, `approval doc includes ${text}`);
  });
  ["Контроль качества партии", "Расследование нарушения", "Технологический таймлайн", "Маркировка и хранение", "Сборка заказа"].forEach((text) => {
    assert.equal(approvalDoc.includes(text), true, `approval doc includes ${text}`);
  });
  assert.equal(adminHtml.includes("id=\"filtered-summary\""), true);
  assert.equal(adminHtml.includes("id=\"module-overview\""), true);
  assert.equal(adminScript.includes("renderGradeOverview"), true);
  assert.equal(adminScript.includes("answerBrief"), true);
  assert.equal(prompts.includes("Выберите действия после работы."), false);
  assert.equal(prompts.includes("Расставьте порядок действий после работы с мясорубкой."), true);
});

test("PM01 readiness audit removes weak production tasks and keeps fish cutlet flow accurate", () => {
  const exam = getPm01Exam();
  const formulas = new Set(exam.formulas.map((formula) => formula.id));
  const vegetables = buildPm01Variant(exam, "vegetables", { seed: "readiness-vegetables" });
  const fish = buildPm01Variant(exam, "fish", { seed: "readiness-fish" });
  const meat = buildPm01Variant(exam, "meat", { seed: "readiness-meat" });
  const complex = buildPm01Variant(exam, "complex", { seed: "readiness-complex" });
  const vegRequest = vegetables.questions.find((question) => question.sourceId === "veg-sim-request");
  const vegGross = vegetables.questions.find((question) => question.sourceId === "veg-t1-gross");
  const poultry = buildPm01Variant(exam, "poultry", { seed: "readiness-poultry" });
  const rabbit = poultry.questions.find((question) => question.sourceId === "poultry-t1-rabbit");
  const poultryChain = poultry.questions.find((question) => question.sourceId === "poultry-sim-chain");
  const fishCutlet = fish.questions.find((question) => question.sourceId === "fish-t1-cutlet");
  const fishCutletCalculation = fish.questions.find((question) => question.sourceId === "fish-calc-cutlets");
  const meatCutletCalculation = meat.questions.find((question) => question.sourceId === "meat-calc-cutlets");
  const complexFishPlace = complex.questions.find((question) => question.sourceId === "complex-t1-fish-place");
  const complexVegPlace = complex.questions.find((question) => question.sourceId === "complex-t1-veg-place");
  const complexQuestionIds = new Set(complex.questions.map((question) => question.sourceId));
  const complexVoice = complex.questions.find((question) => question.sourceId === "complex-voice");

  assert.equal(formulas.has("price"), false);
  assert.equal(formulas.has("package"), true);
  assert.equal(complexQuestionIds.has("complex-calc-price"), false);
  assert.equal(complexQuestionIds.has("complex-calc-pack"), true);
  assert.equal(fishCutlet.type, "single_choice");
  assert.equal(fishCutlet.options.find((option) => option.isCorrect).id, "fillet");
  assert.match(fishCutletCalculation.prompt, /на 1 котлету/);
  assert.match(meatCutletCalculation.prompt, /на 1 котлету/);
  assert.doesNotMatch(fishCutletCalculation.prompt, /65 %|18 %|15 %|2 %/);
  assert.doesNotMatch(meatCutletCalculation.prompt, /70 %|15 %|13 %|2 %/);
  assert.equal(meatCutletCalculation.fields.find((field) => field.id === "meatKg").expected, 2.65);
  assert.equal(fishCutletCalculation.fields.find((field) => field.id === "filletKg").expected, 2.94);
  assert.match(vegRequest.prompt, /капусты — 4,00 кг/);
  assert.match(vegRequest.prompt, /25,71 кг картофеля брутто/);
  assert.equal(vegRequest.formulas.some((formula) => formula.includes("все исходные данные указаны")), true);
  assert.equal(vegGross.options.find((option) => option.isCorrect).text, "массу сырья до очистки и удаления отходов");
  assert.match(rabbit.prompt, /кролик/);
  assert.match(rabbit.options.find((option) => option.isCorrect).text, /отдельной чистой доской/);
  assert.equal(poultryChain.items.every((item) => item.detail && item.detail.length > 24), true);
  assert.match(complexFishPlace.prompt, /без риска перекрестного загрязнения/);
  assert.match(complexFishPlace.options.find((option) => option.isCorrect).text, /промаркированной доской/);
  assert.match(complexVegPlace.prompt, /немытые корнеплоды и зелень/);
  assert.match(complexVegPlace.options.find((option) => option.isCorrect).text, /сортировка, мойка, очистка/);
  assert.equal(complexVoice.prompt.includes("Покупатель приобрел"), false);
  assert.equal(complexVoice.prompt.includes("упаковку, маркировку, хранение"), true);
});

test("PM01 exam materials expose 25 comprehensive tickets without invented calculation keys", () => {
  const exam = getPm01Exam();
  const publicData = getPm01PublicData(exam);
  const tickets = publicData.materials.tickets;

  assert.equal(tickets.length, 25);
  assert.equal(tickets[0].product, "Котлеты рубленые из говядины");
  assert.equal(tickets[24].product, "Тефтели из рыбы");
  assert.equal(tickets.every((ticket) => ticket.recipeNo && ticket.portions > 0), true);
  assert.equal(tickets.every((ticket) => ticket.calculationPolicy.includes("точных норм")), true);
  assert.equal(tickets.every((ticket) => ticket.recipeStatus.includes("needs_norms")), true);
  assert.equal(tickets.some((ticket) => "expected" in ticket), false);
  assert.equal(tickets.some((ticket) => "verifiedTitle" in ticket), false);
  assert.equal(tickets.some((ticket) => "referenceTitle" in ticket), false);
});

test("PM01 selected comprehensive ticket is embedded into M0 and M3 safely", () => {
  const exam = getPm01Exam();
  const ticket = getPm01MaterialTicket("pm01-ticket-15");
  const variant = buildPm01Variant(exam, "fish", { ticketId: ticket.id });
  const situation = variant.questions.find((question) => question.moduleId === "situation");
  const voice = variant.questions.find((question) => question.moduleId === "voice");
  const publicVoice = sanitizePm01Question(voice, { answers: {} });

  assert.equal(variant.materialTicket.product, "Котлеты из рыбы");
  assert.equal(situation.prompt.includes("Комплексное ситуационное задание № 15"), true);
  assert.equal(situation.materialTicket.product, "Котлеты из рыбы");
  assert.equal(voice.prompt.includes("Котлеты из рыбы"), true);
  assert.equal(voice.answerPlan.some((item) => item.includes("3 порций")), true);
  assert.equal(publicVoice.materialTicket.product, "Котлеты из рыбы");
  assert.equal("answerPlan" in publicVoice, false);
  assert.equal("recipe" in publicVoice.materialTicket, false);
});

test("PM01 public voice answers expose metadata without inline audio", () => {
  const exam = getPm01Exam();
  const variant = buildPm01Variant(exam, "fish");
  const voice = variant.questions.find((question) => question.type === "voice_response");
  const publicVoice = sanitizePm01Question(voice, {
    answers: {
      [voice.id]: {
        answerPayload: {
          audioId: "pm01voice_test",
          audioDataUrl: "data:audio/webm;base64,AAAA",
          audioName: "voice.webm",
          durationMs: 12000,
          audioUploadStatus: "inline_fallback"
        }
      }
    }
  });

  assert.equal(publicVoice.savedAnswer.audioId, "pm01voice_test");
  assert.equal(publicVoice.savedAnswer.legacyAudioInline, true);
  assert.equal("audioDataUrl" in publicVoice.savedAnswer, false);
});

test("PM01 comprehensive tickets stay compatible with selected production variant", () => {
  const exam = getPm01Exam();
  const fishTicket = getPm01MaterialTicket("pm01-ticket-15");
  const meatTicket = getPm01MaterialTicket("pm01-ticket-01");

  assert.equal(isPm01TicketCompatibleWithVariant("fish", fishTicket), true);
  assert.equal(isPm01TicketCompatibleWithVariant("meat", fishTicket), false);
  assert.equal(isPm01TicketCompatibleWithVariant("meat", meatTicket), true);

  const mismatchedVariant = buildPm01Variant(exam, "meat", { ticketId: fishTicket.id });
  assert.equal(mismatchedVariant.materialTicket, null);
  assert.equal(mismatchedVariant.questions.some((question) => question.materialTicket), false);
});

test("PM01 visual asset registry points to real project files", () => {
  const publicData = getPm01PublicData(getPm01Exam());
  const assetPaths = [];

  function collectAssets(value) {
    if (!value) {
      return;
    }
    if (typeof value === "string" && value.startsWith("/assets/pm01/")) {
      assetPaths.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collectAssets);
      return;
    }
    if (typeof value === "object") {
      Object.values(value).forEach(collectAssets);
    }
  }

  collectAssets(publicData.assetRegistry);

  assert.equal(assetPaths.length >= 50, true);
  assetPaths.forEach((assetPath) => {
    const fullPath = path.join(__dirname, "..", "public", assetPath.replace(/^\//, ""));
    assert.equal(fs.existsSync(fullPath), true, `${assetPath} exists`);
  });
});

test("PM01 extended visual atlas exposes 50 generated cards safely", () => {
  const publicData = getPm01PublicData(getPm01Exam());
  const extendedPaths = [];

  function collectExtended(value) {
    if (!value) {
      return;
    }
    if (typeof value === "string" && value.startsWith("/assets/pm01/extended/")) {
      extendedPaths.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collectExtended);
      return;
    }
    if (typeof value === "object") {
      Object.values(value).forEach(collectExtended);
    }
  }

  collectExtended(publicData.assetRegistry.extendedVisuals);

  assert.equal(extendedPaths.length, 50);
  assert.equal(publicData.visualAtlas.length, 8);
  assert.equal(publicData.visualAtlas.some((category) => category.id === "vegetable-photo-cuts"), true);
  assert.equal(publicData.visualAtlas.some((category) => category.id === "vegetable-semi-products"), true);
  assert.equal(publicData.visualAtlas.some((category) => category.id === "generated-semi-products"), true);
  assert.equal(publicData.visualAtlas.some((category) => category.id === "extended-safety"), true);

  extendedPaths.forEach((assetPath) => {
    const fullPath = path.join(__dirname, "..", "public", assetPath.replace(/^\//, ""));
    assert.equal(fs.existsSync(fullPath), true, `${assetPath} exists`);
    assert.equal(fs.statSync(fullPath).size > 250_000, true, `${assetPath} is rebuilt as a photo card`);
  });
});

test("PM01 vegetable photo cuts expose 50 textbook-safe vegetable cards", () => {
  const publicData = getPm01PublicData();
  const photoCuts = publicData.assetRegistry.vegetablePhotoCuts;
  const photoPaths = Object.values(photoCuts);
  const photoAtlas = publicData.visualAtlas.find((category) => category.id === "vegetable-photo-cuts");
  const bannedAdvanced = /(gaufrette|spiral|star|chateau|cocotte|tourne)/i;

  assert.equal(photoPaths.length, 50);
  assert.equal(photoAtlas.items.length, 50);
  assert.equal(photoAtlas.displayLimit, 10);
  assert.equal(photoAtlas.items.every((item) => item.image.startsWith("/assets/pm01/vegetables-photo/")), true);
  assert.equal(photoAtlas.items.some((item) => item.title.toLowerCase().includes("julienne")), true);
  assert.equal(photoAtlas.items.some((item) => item.title.toLowerCase().includes("brunoise")), true);
  assert.equal(photoAtlas.items.some((item) => item.title.toLowerCase().includes("macedoine")), true);
  assert.equal(photoAtlas.items.some((item) => item.title.toLowerCase().includes("paysanne")), true);
  assert.equal(photoAtlas.items.some((item) => item.title.toLowerCase().includes("mirepoix")), true);
  assert.equal(photoAtlas.items.some((item) => item.title.toLowerCase().includes("rondelle")), true);
  assert.equal(photoAtlas.items.some((item) => item.title.toLowerCase().includes("шаш")), true);
  assert.equal(photoAtlas.items.some((item) => item.title.toLowerCase().includes("доль")), true);
  assert.equal(photoAtlas.items.every((item) => !bannedAdvanced.test(`${item.id} ${item.slug || ""} ${item.title}`)), true);

  photoPaths.forEach((assetPath) => {
    const fullPath = path.join(__dirname, "..", "public", assetPath.replace(/^\//, ""));
    assert.equal(fs.existsSync(fullPath), true, `${assetPath} exists`);
  });
});

test("PM01 semi-finished product atlas exposes 74 photo cards", () => {
  const publicData = getPm01PublicData();
  const productAssets = publicData.assetRegistry.semiFinishedProducts;
  const productPaths = Object.values(productAssets);
  const groups = [
    { id: "vegetable-semi-products", prefix: "/assets/pm01/semi-finished/vegetables/", displayLimit: 10, length: 20 },
    { id: "extended-meat", prefix: "/assets/pm01/semi-finished/meat/", displayLimit: 12, length: 18 },
    { id: "extended-fish", prefix: "/assets/pm01/semi-finished/fish/", displayLimit: 12, length: 18 },
    { id: "extended-poultry", prefix: "/assets/pm01/semi-finished/poultry/", displayLimit: 12, length: 18 }
  ];

  assert.equal(productPaths.length, 74);

  groups.forEach(({ id, prefix, displayLimit, length }) => {
    const atlas = publicData.visualAtlas.find((category) => category.id === id);
    assert.equal(atlas.displayLimit, displayLimit);
    assert.equal(atlas.items.length, length);
    assert.equal(atlas.items.every((item) => item.image.startsWith(prefix)), true);
  });

  productPaths.forEach((assetPath) => {
    const fullPath = path.join(__dirname, "..", "public", assetPath.replace(/^\//, ""));
    assert.equal(fs.existsSync(fullPath), true, `${assetPath} exists`);
    assert.equal(fs.statSync(fullPath).size > 250_000, true, `${assetPath} is a photo card`);
  });
});

test("PM01 generated semi-finished product cards are separate new assets", () => {
  const publicData = getPm01PublicData();
  const generatedAssets = publicData.assetRegistry.generatedSemiFinishedProducts;
  const generatedPaths = Object.values(generatedAssets);
  const atlas = publicData.visualAtlas.find((category) => category.id === "generated-semi-products");

  assert.equal(generatedPaths.length, 12);
  assert.equal(atlas.displayLimit, 12);
  assert.equal(atlas.items.length, 12);
  assert.equal(atlas.items.every((item) => item.generated === true), true);
  assert.equal(atlas.items.every((item) => !("source" in item) && !("crop" in item)), true);
  assert.equal(generatedPaths.every((assetPath) => assetPath.startsWith("/assets/pm01/generated/semi-finished/")), true);
  assert.equal(generatedPaths.some((assetPath) => assetPath.includes("generated-chicken-thigh-drumstick")), false);
  assert.equal(generatedPaths.some((assetPath) => assetPath.includes("generated-chicken-drumsticks")), true);

  generatedPaths.forEach((assetPath) => {
    const fullPath = path.join(__dirname, "..", "public", assetPath.replace(/^\//, ""));
    assert.equal(fs.existsSync(fullPath), true, `${assetPath} exists`);
    assert.equal(fs.statSync(fullPath).size > 250_000, true, `${assetPath} is a generated photo card`);
  });
});

test("PM01 vegetable sequence steps use visual process cards without answer keys", () => {
  const exam = getPm01Exam();
  const variant = buildPm01Variant(exam, "vegetables");
  const sequenceQuestion = variant.questions.find((item) => item.id.startsWith("veg-sim-chain"));
  const publicQuestion = sanitizePm01Question(sequenceQuestion, { answers: {} });

  assert.equal(publicQuestion.items.length, 7);
  assert.equal(publicQuestion.items.every((item) => item.image && item.detail), true);
  assert.equal(publicQuestion.items.every((item) => item.image.includes("/assets/pm01/process/")), true);
  assert.equal("correctSequence" in publicQuestion, false);
  assert.equal("correctAnswer" in publicQuestion, false);
});

test("PM01 product cards and hotspot scenes stay visual but sanitized", () => {
  const exam = getPm01Exam();
  const fishVariant = buildPm01Variant(exam, "fish");
  const fishSequenceQuestion = fishVariant.questions.find((item) => item.id.startsWith("fish-sim-chain"));
  const publicFishSequenceQuestion = sanitizePm01Question(fishSequenceQuestion, { answers: {} });
  const productQuestion = fishVariant.questions.find((item) => item.id.startsWith("fish-sim-products"));
  const publicProductQuestion = sanitizePm01Question(productQuestion, { answers: {} });

  assert.equal(publicFishSequenceQuestion.items.length, 8);
  assert.equal(publicFishSequenceQuestion.items.every((item) => item.image.includes("/assets/pm01/fish-process/")), true);
  assert.equal(publicFishSequenceQuestion.items.every((item) => item.detail.length > 20), true);
  assert.equal("correctSequence" in publicFishSequenceQuestion, false);
  assert.equal(productQuestion.visualMode, "product_cards");
  assert.equal(publicProductQuestion.items.every((item) => item.image && item.detail), true);
  assert.equal("correctBuckets" in publicProductQuestion, false);

  const vegetableVariant = buildPm01Variant(exam, "vegetables");
  const hotspotQuestion = vegetableVariant.questions.find((item) => item.id.startsWith("veg-sim-hotspot"));
  const publicHotspotQuestion = sanitizePm01Question(hotspotQuestion, { answers: {} });

  assert.equal(publicHotspotQuestion.image.endsWith("vegetable.png"), true);
  assert.equal(publicHotspotQuestion.hotspotTargetCount, hotspotQuestion.hotspots.length);
  assert.equal("hotspots" in publicHotspotQuestion, false);
});

test("PM01 quality control simulations use visual inspection cards safely", () => {
  const exam = getPm01Exam();
  const expectedByVariant = {
    vegetables: "veg-sim-quality",
    fish: "fish-sim-quality",
    meat: "meat-sim-quality",
    poultry: "poultry-sim-quality",
    complex: "complex-sim-quality"
  };

  Object.entries(expectedByVariant).forEach(([variantId, sourceId]) => {
    const variant = buildPm01Variant(exam, variantId, { seed: `quality-control-${variantId}` });
    const question = variant.questions.find((item) => item.sourceId === sourceId);
    const publicQuestion = sanitizePm01Question(question, { answers: {} });
    const score = scorePm01Question(question, { buckets: question.correctBuckets });

    assert.equal(question.type, "bucket_sort");
    assert.equal(question.moduleId, "simulation");
    assert.equal(question.visualMode, "quality_control");
    assert.equal(question.maxScore, 6);
    assert.deepEqual(question.buckets.map((bucket) => bucket.id).sort(), ["accept", "correct", "reject"]);
    assert.equal(question.items.length, 4);
    assert.equal(question.items.every((item) => item.image && item.status && item.risk), true);
    assert.equal(question.items.every((item) => Array.isArray(item.signals) && item.signals.length >= 3), true);
    assert.equal(publicQuestion.items.every((item) => item.image && item.status && item.risk), true);
    assert.equal(publicQuestion.items.every((item) => Array.isArray(item.signals) && item.signals.length >= 3), true);
    assert.equal(publicQuestion.buckets.every((bucket) => bucket.detail.length > 20), true);
    assert.equal("correctBuckets" in publicQuestion, false);
    assert.equal(score.finalScore, question.maxScore);
  });
});

test("PM01 digital shift extension is training-only and keeps official scoring stable", () => {
  const exam = getPm01Exam();
  const publicData = getPm01PublicData(exam);
  const families = new Set(["quality_control", "shift_investigation", "production_timeline", "storage_marking", "order_assembly"]);

  assert.equal(publicData.digitalShift.mode, "training_extension");
  assert.equal(publicData.digitalShift.families.length, 5);
  assert.equal(publicData.digitalShift.packages.length, 5);
  publicData.digitalShift.packages.forEach((packageData) => {
    assert.equal(packageData.tasks.length, 5, packageData.variantId);
    assert.equal(packageData.tasks.every((task) => families.has(task.familyId)), true, packageData.variantId);
    assert.equal(packageData.visualPrompts.length >= 2, true, packageData.variantId);
    assert.equal(packageData.previewAssets.length, 2, packageData.variantId);
    assert.equal(
      packageData.previewAssets.every(
        (asset) =>
          asset.status === "awaiting_preview" &&
          asset.approval === "pending_teacher_review" &&
          asset.finalAsset === false &&
          asset.inspectionRequired === true &&
          asset.targetPath.startsWith("/assets/pm01/generated/digital-shift/") &&
          asset.negativePrompt.length > 40
      ),
      true,
      packageData.variantId
    );
    assert.equal(JSON.stringify(packageData).includes("correctBuckets"), false);
    assert.equal(JSON.stringify(packageData).includes("correctSequence"), false);
    assert.equal(JSON.stringify(packageData).includes("hotspots"), false);
  });

  exam.variants.forEach((examVariant) => {
    const officialVariant = buildPm01Variant(exam, examVariant.id, { seed: `official-${examVariant.id}` });
    const trainingVariant = buildPm01Variant(exam, examVariant.id, {
      seed: `practice-${examVariant.id}`,
      includePractice: true
    });
    const practiceModule = trainingVariant.modules.find((module) => module.id === "digital_shift");
    const practiceQuestions = trainingVariant.questions.filter((question) => question.practiceOnly);
    const publicPracticeQuestion = sanitizePm01Question(practiceQuestions[0], { answers: {} });

    assert.equal(officialVariant.questions.length, 20, `${examVariant.id} official count`);
    assert.equal(officialVariant.modules.some((module) => module.practiceOnly), false, `${examVariant.id} official modules`);
    assert.equal(trainingVariant.totalMaxScore, 100, `${examVariant.id} training score contract`);
    assert.equal(trainingVariant.questions.length, 25, `${examVariant.id} training count`);
    assert.equal(practiceModule.code, "PX");
    assert.equal(practiceModule.maxScore, 0);
    assert.equal(practiceQuestions.length, 5);
    assert.equal(practiceQuestions.every((question) => question.maxScore === 0), true);
    assert.deepEqual(new Set(practiceQuestions.map((question) => question.practiceFamily)), families);
    assert.equal(publicPracticeQuestion.practiceOnly, true);
    assert.equal(publicPracticeQuestion.maxScore, 0);
    assert.equal("correctBuckets" in publicPracticeQuestion, false);
    assert.equal("correctSequence" in publicPracticeQuestion, false);
  });
});

test("PM01 meat tools and meat grinder sequence are visual but sanitized", () => {
  const exam = getPm01Exam();
  const meatVariant = buildPm01Variant(exam, "meat");
  const toolsQuestion = meatVariant.questions.find((item) => item.id.startsWith("meat-sim-tools"));
  const grinderQuestion = meatVariant.questions.find((item) => item.id.startsWith("meat-sim-mincer"));
  const publicToolsQuestion = sanitizePm01Question(toolsQuestion, { answers: {} });
  const publicGrinderQuestion = sanitizePm01Question(grinderQuestion, { answers: {} });

  assert.equal(toolsQuestion.visualMode, "product_cards");
  assert.equal(publicToolsQuestion.items.length, 5);
  assert.equal(publicToolsQuestion.items.every((item) => item.image.includes("/assets/pm01/meat-tools/")), true);
  assert.equal(publicToolsQuestion.items.every((item) => item.detail.length > 20), true);
  assert.equal("correctBuckets" in publicToolsQuestion, false);
  assert.equal(publicGrinderQuestion.items.length, 6);
  assert.equal(publicGrinderQuestion.items.every((item) => item.image.includes("/assets/pm01/meat-grinder/")), true);
  assert.equal(publicGrinderQuestion.items.every((item) => item.detail.length > 20), true);
  assert.equal("correctSequence" in publicGrinderQuestion, false);
});

test("PM01 poultry and packaging tasks use visual product cards", () => {
  const exam = getPm01Exam();
  const poultryVariant = buildPm01Variant(exam, "poultry");
  const productQuestion = poultryVariant.questions.find((item) => item.id.startsWith("poultry-t1-products"));
  const partsQuestion = poultryVariant.questions.find((item) => item.id.startsWith("poultry-sim-parts"));
  const poultrySequenceQuestion = poultryVariant.questions.find((item) => item.id.startsWith("poultry-sim-chain"));
  const complexVariant = buildPm01Variant(exam, "complex");
  const fishProductsQuestion = complexVariant.questions.find((item) => item.id.startsWith("complex-t1-fish-products"));
  const meatProductsQuestion = complexVariant.questions.find((item) => item.id.startsWith("complex-t1-meat-products"));
  const zonesQuestion = complexVariant.questions.find((item) => item.id.startsWith("complex-sim-zones"));
  const packQuestion = complexVariant.questions.find((item) => item.id.startsWith("complex-sim-pack"));

  [productQuestion, fishProductsQuestion, meatProductsQuestion].forEach((question) => {
    assert.equal(question.type, "single_choice");
    assert.equal(question.options.some((option) => option.isCorrect), true);
  });

  [partsQuestion, zonesQuestion, packQuestion].forEach((question) => {
    const publicQuestion = sanitizePm01Question(question, { answers: {} });
    assert.equal(question.type, "bucket_sort");
    assert.equal(question.visualMode, "product_cards");
    assert.equal(publicQuestion.items.every((item) => item.image && item.detail), true);
    assert.equal("correctBuckets" in publicQuestion, false);
  });

  assert.equal(partsQuestion.items.some((item) => item.image.includes("/generated/semi-finished/poultry/generated-chicken-fillet.png")), true);
  assert.equal(partsQuestion.items.some((item) => item.image.includes("/generated/semi-finished/poultry/generated-chicken-drumsticks.png")), true);
  assert.equal(partsQuestion.items.some((item) => item.image.includes("generated-chicken-thigh-drumstick")), false);
  assert.equal(packQuestion.items.some((item) => item.image.includes("/packaging/newspaper-violation.png")), true);
  assert.equal(poultrySequenceQuestion.items.every((item) => item.image && item.image.includes("/assets/pm01/extended/")), true);
  assert.equal(zonesQuestion.items.every((item) => item.image.includes("/assets/pm01/extended/")), true);
});

test("PM01 visual product cards do not reuse one image for different answer cards", () => {
  const exam = getPm01Exam();

  exam.variants.forEach((examVariant) => {
    const variant = buildPm01Variant(exam, examVariant.id, { seed: `unique-product-images-${examVariant.id}` });
    variant.questions
      .filter((question) => question.type === "bucket_sort" && question.visualMode === "product_cards")
      .forEach((question) => {
        const imageRefs = (question.items || []).map((item) => item.image).filter(Boolean);
        assert.deepEqual(
          [...new Set(imageRefs)].sort(),
          imageRefs.sort(),
          `${question.sourceId} uses unique images for product cards`
        );
      });
  });
});

test("scorePm01Question accepts decimal comma for calculation tasks", () => {
  const exam = getPm01Exam();
  const variant = buildPm01Variant(exam, "vegetables");
  const question = variant.questions.find((item) => item.id.includes("veg-calc-potato"));

  const result = scorePm01Question(question, {
    values: {
      grossKg: "25,71",
      wasteKg: "7,71"
    }
  });

  assert.equal(result.finalScore, question.maxScore);
  assert.equal(result.details.correctFields, 2);
});

test("scorePm01Question scores hotspot matches and false positives", () => {
  const question = {
    type: "hotspot_scene",
    maxScore: 6,
    hotspots: [
      { id: "a", x: 20, y: 20, radius: 5 },
      { id: "b", x: 70, y: 70, radius: 5 }
    ]
  };

  const result = scorePm01Question(question, {
    points: [
      { x: 21, y: 20 },
      { x: 10, y: 80 }
    ]
  });

  assert.equal(result.details.found, 1);
  assert.equal(result.penalty, 1);
  assert.equal(result.finalScore, 1.5);
});

test("scorePm01Question treats skipped voice answer as zero without manual review", () => {
  const question = {
    type: "voice_response",
    maxScore: 20
  };

  const result = scorePm01Question(question, { skipped: true });

  assert.equal(result.finalScore, 0);
  assert.equal(result.manualStatus, null);
  assert.equal(result.details.skipped, true);
});

test("scorePm01Question treats stored voice audioId as pending manual review", () => {
  const question = {
    type: "voice_response",
    maxScore: 20
  };

  const result = scorePm01Question(question, {
    audioId: "pm01voice_test",
    audioName: "voice.webm",
    durationMs: 42000
  });

  assert.equal(result.finalScore, 0);
  assert.equal(result.manualStatus, "pending_review");
  assert.equal(result.details.hasAudio, true);
  assert.equal(result.details.durationMs, 42000);
});

test("applyPm01VoiceReview stores rubric scores and updates final summary", () => {
  const exam = getPm01Exam();
  const variant = buildPm01Variant(exam, "vegetables");
  const question = variant.questions.find((item) => item.type === "voice_response");
  const attempt = {
    olympiadId: exam.id,
    status: "pending_review",
    startedAt: "2026-06-02T10:00:00.000Z",
    finishedAt: "2026-06-02T10:20:00.000Z",
    variant,
    answers: {
      [question.id]: {
        questionId: question.id,
        moduleId: question.moduleId,
        answerPayload: { audioName: "voice.webm" },
        autoScore: 0,
        finalScore: 0,
        manualStatus: "pending_review"
      }
    }
  };

  applyPm01VoiceReview(exam, attempt, question.id, {
    scores: {
      topic: 5,
      tools: 5,
      sequence: 5,
      safety: 5
    },
    comment: "Ответ полный."
  });

  const summary = summarizePm01Attempt(exam, attempt);
  assert.equal(attempt.status, "reviewed");
  assert.equal(attempt.answers[question.id].finalScore, 20);
  assert.equal(summary.pendingManualReviews, 0);
  assert.equal(summary.moduleScores.find((module) => module.moduleId === "voice").finalScore, 20);
});

test("applyPm01VoiceReview supports quick done and not done decisions", () => {
  const exam = getPm01Exam();
  const variant = buildPm01Variant(exam, "fish");
  const question = variant.questions.find((item) => item.type === "voice_response");
  const attempt = {
    id: "pm01_attempt_quick_voice",
    olympiadId: exam.id,
    status: "pending_review",
    startedAt: "2026-06-02T10:00:00.000Z",
    finishedAt: "2026-06-02T10:20:00.000Z",
    variant,
    answers: {
      [question.id]: {
        questionId: question.id,
        moduleId: question.moduleId,
        answerPayload: { audioId: "pm01voice_test", audioName: "voice.webm" },
        autoScore: 0,
        finalScore: 0,
        manualStatus: "pending_review"
      }
    }
  };

  applyPm01VoiceReview(exam, attempt, question.id, { decision: "done" });
  assert.equal(attempt.answers[question.id].finalScore, question.maxScore);
  assert.equal(attempt.answers[question.id].manualReview.decision, "done");
  assert.equal(attempt.status, "reviewed");

  attempt.status = "pending_review";
  attempt.answers[question.id].manualStatus = "pending_review";
  applyPm01VoiceReview(exam, attempt, question.id, { decision: "not_done" });
  assert.equal(attempt.answers[question.id].finalScore, 0);
  assert.equal(attempt.answers[question.id].manualReview.decision, "not_done");
});

test("PM01 teacher cabinet exposes exam controls and printable protocol", () => {
  const root = path.join(__dirname, "..");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const studentHtml = fs.readFileSync(path.join(root, "public", "pm01.html"), "utf8");
  const studentScript = fs.readFileSync(path.join(root, "public", "pm01.js"), "utf8");
  const adminHtml = fs.readFileSync(path.join(root, "public", "pm01-admin.html"), "utf8");
  const adminScript = fs.readFileSync(path.join(root, "public", "pm01-admin.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "public", "pm01.css"), "utf8");

  assert.match(serverSource, /PM01_CONTROLS_DRAFT_KEY/);
  assert.match(serverSource, /PM01_ADMIN_ATTEMPT_LIMIT_DEFAULT/);
  assert.match(serverSource, /selectRecentPm01AdminAttempts/);
  assert.match(serverSource, /\/api\/admin\/pm01\/controls/);
  assert.match(serverSource, /\/api\/admin\/pm01\/grants/);
  assert.match(serverSource, /examEnabled/);
  assert.match(serverSource, /freeRepeatEnabled/);
  assert.match(serverSource, /findActivePm01Attempt/);
  assert.match(serverSource, /stale-while-revalidate=604800/);
  assert.match(serverSource, /normalizeGroupName/);
  assert.match(serverSource, /normalizeGroupKey/);
  assert.match(serverSource, /groupNameOriginal/);
  assert.match(serverSource, /Лимит экзаменационных попыток исчерпан/);

  assert.match(adminHtml, /teacher-controls-form/);
  assert.match(adminHtml, /admin-collapsible/);
  assert.match(adminHtml, /group-overview/);
  assert.match(adminHtml, /review-queue/);
  assert.match(adminHtml, /control-exam-enabled/);
  assert.match(adminHtml, /control-free-repeat/);
  assert.match(adminScript, /renderTeacherControls/);
  assert.match(adminScript, /renderWorkbench/);
  assert.match(adminScript, /renderDetailQuestionToolbar/);
  assert.match(adminScript, /questionMatchesDetailFilter/);
  assert.match(adminScript, /setExtraAttempts/);
  assert.match(adminScript, /renderProtocolCard/);
  assert.match(adminScript, /ADMIN_ATTEMPTS_LIMIT = 250/);
  assert.match(adminScript, /ADMIN_ATTEMPTS_QUERY/);
  assert.match(adminScript, /buildFastAdminSummary/);
  assert.doesNotMatch(adminScript, /api\/admin\/pm01\/summary/);
  assert.match(adminScript, /api\/admin\/pm01\/controls\$\{ADMIN_ATTEMPTS_QUERY\}/);
  assert.match(serverSource, /PM01_VOICE_AUDIO_MAX_BYTES/);
  assert.match(serverSource, /savePm01VoiceAudio/);
  assert.match(serverSource, /loadPm01VoiceAudio/);
  assert.equal(serverSource.includes("\\/voice\\/[^/]+\\/audio"), true);
  assert.match(serverSource, /exports\/group-csv/);
  assert.match(serverSource, /exports\/group-csv\/download/);
  assert.match(serverSource, /buildPm01GroupReportRows/);
  assert.match(serverSource, /Content-Disposition/);
  assert.match(serverSource, /X-PM01-Report-Rows/);
  assert.match(serverSource, /readRequestBuffer/);
  assert.match(serverSource, /inline_fallback/);
  assert.match(studentScript, /uploadVoiceBlob/);
  assert.match(studentScript, /fetchWithRetry/);
  assert.match(studentScript, /RETRYABLE_API_STATUSES/);
  assert.match(studentScript, /PM01_API_REQUEST_TIMEOUT_MS/);
  assert.match(studentScript, /AbortController/);
  assert.match(studentScript, /retryDelay/);
  assert.match(studentScript, /X-PM01-Duration-Ms/);
  assert.doesNotMatch(studentScript, /readAsDataURL\(blob\)/);
  assert.match(studentHtml, /pm01\.css\?v=1\.0\.22/);
  assert.match(studentHtml, /loadPm01Script/);
  assert.match(studentHtml, /pm01\.js\?v=1\.0\.23/);
  assert.match(adminHtml, /export-group-csv/);
  assert.match(adminScript, /renderVoiceQueueList/);
  assert.match(adminScript, /saveQuickDecision/);
  assert.match(adminScript, /exportGroupReport/);
  assert.match(adminScript, /KNOWN_PM01_GROUPS/);
  assert.match(adminScript, /1-ПКД-25/);
  assert.match(adminScript, /downloadBlob/);
  assert.match(adminScript, /URL\.createObjectURL/);
  assert.match(adminScript, /api\/admin\/pm01\/exports\/group-csv\/download/);
  assert.match(adminScript, /voiceAudio/);
  assert.match(adminScript, /audioInfo\.audioUrl/);
  assert.match(adminHtml, /pm01\.css\?v=1\.0\.22/);
  assert.match(adminHtml, /pm01-approval\.html/);
  assert.match(adminHtml, /pm01-admin\.js\?v=1\.0\.18/);
  assert.match(css, /\.voice-queue-list/);
  assert.match(css, /\.voice-quick-review/);
  assert.match(css, /\.audio-status/);
  assert.match(css, /\.admin-collapsible/);
  assert.match(css, /\.teacher-workbench/);
  assert.match(css, /\.detail-question-toolbar/);
  assert.match(css, /@media print/);
  assert.match(css, /\.protocol-card/);
});
