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
  const visualBucket = variant.questions.find((item) => item.visualMode === "cut_shapes");
  const publicQuestion = sanitizePm01Question(visualBucket, { answers: {} });
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
  assert.equal(publicQuestion.items.length, 14);
  assert.equal(publicQuestion.buckets.length, 14);
  assert.equal(publicQuestion.buckets.every((bucket) => bucket.image), true);
  assert.equal(publicQuestion.buckets.some((bucket) => bucket.image.endsWith(".svg")), false);
  assert.equal(publicSimulation.items.length, 11);
  assert.equal(publicSimulation.buckets.length, 11);
  assert.equal("correctBuckets" in publicQuestion, false);
  assert.equal("correctAnswer" in publicQuestion, false);
  assert.equal("correctBuckets" in publicSimulation, false);
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

  assert.deepEqual(namingQuestion.items.map((item) => item.id).sort(), expectedClassic.sort());
  assert.deepEqual(applicationQuestion.items.map((item) => item.id).sort(), expectedApplication.sort());
  assert.equal(namingQuestion.items.some((item) => item.text.includes("Fine julienne")), true);
  assert.equal(namingQuestion.buckets.every((bucket) => bucket.image.startsWith("/assets/pm01/cuts/")), true);
  assert.equal(namingQuestion.buckets.every((bucket) => bucket.image.endsWith(".png")), true);
  assert.equal(applicationQuestion.buckets.every((bucket) => bucket.detail.length > 20), true);

  [...namingQuestion.buckets, ...applicationQuestion.buckets].forEach((bucket) => {
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
    "Смешанный маршрут",
    "Начать смешанный экзамен ПМ.01",
    "variantField?.classList.toggle(\"hidden\", !training)",
    "variantId: state.mode === \"training\" ? state.selectedVariantId : \"\""
  ].forEach((text) => {
    assert.equal(uiScript.includes(text), true, `student UI includes ${text}`);
  });
  assert.equal(uiHtml.includes("id=\"exam-route-note\""), true);
  assert.equal(uiStyles.includes(".task-guide-steps"), true);
  assert.equal(uiStyles.includes(".interaction-panel-title"), true);
  assert.equal(prompts.includes("Выберите действия после работы."), false);
  assert.equal(prompts.includes("Расставьте порядок действий после работы с мясорубкой."), true);
});

test("PM01 readiness audit removes weak production tasks and keeps fish cutlet flow accurate", () => {
  const exam = getPm01Exam();
  const formulas = new Set(exam.formulas.map((formula) => formula.id));
  const vegetables = buildPm01Variant(exam, "vegetables", { seed: "readiness-vegetables" });
  const fish = buildPm01Variant(exam, "fish", { seed: "readiness-fish" });
  const complex = buildPm01Variant(exam, "complex", { seed: "readiness-complex" });
  const vegRequest = vegetables.questions.find((question) => question.sourceId === "veg-sim-request");
  const vegGross = vegetables.questions.find((question) => question.sourceId === "veg-t1-gross");
  const poultry = buildPm01Variant(exam, "poultry", { seed: "readiness-poultry" });
  const rabbit = poultry.questions.find((question) => question.sourceId === "poultry-t1-rabbit");
  const poultryChain = poultry.questions.find((question) => question.sourceId === "poultry-sim-chain");
  const fishCutlet = fish.questions.find((question) => question.sourceId === "fish-t1-cutlet");
  const complexFishPlace = complex.questions.find((question) => question.sourceId === "complex-t1-fish-place");
  const complexVegPlace = complex.questions.find((question) => question.sourceId === "complex-t1-veg-place");
  const complexQuestionIds = new Set(complex.questions.map((question) => question.sourceId));
  const complexVoice = complex.questions.find((question) => question.sourceId === "complex-voice");

  assert.equal(formulas.has("price"), false);
  assert.equal(formulas.has("package"), true);
  assert.equal(complexQuestionIds.has("complex-calc-price"), false);
  assert.equal(complexQuestionIds.has("complex-calc-pack"), true);
  assert.deepEqual(fishCutlet.correctSequence, ["fillet", "bread", "grind", "mix", "spice", "beat"]);
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

test("PM01 vegetable sequence steps use visual process cards without answer keys", () => {
  const exam = getPm01Exam();
  const variant = buildPm01Variant(exam, "vegetables");
  const sequenceQuestion = variant.questions.find((item) => item.id.startsWith("veg-t1-seq-potato"));
  const publicQuestion = sanitizePm01Question(sequenceQuestion, { answers: {} });

  assert.equal(publicQuestion.items.length, 6);
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
  const complexVariant = buildPm01Variant(exam, "complex");
  const fishProductsQuestion = complexVariant.questions.find((item) => item.id.startsWith("complex-t1-fish-products"));
  const meatProductsQuestion = complexVariant.questions.find((item) => item.id.startsWith("complex-t1-meat-products"));
  const zonesQuestion = complexVariant.questions.find((item) => item.id.startsWith("complex-sim-zones"));
  const packQuestion = complexVariant.questions.find((item) => item.id.startsWith("complex-sim-pack"));

  [productQuestion, partsQuestion, fishProductsQuestion, meatProductsQuestion, zonesQuestion, packQuestion].forEach((question) => {
    const publicQuestion = sanitizePm01Question(question, { answers: {} });
    assert.equal(question.type, "bucket_sort");
    assert.equal(question.visualMode, "product_cards");
    assert.equal(publicQuestion.items.every((item) => item.image && item.detail), true);
    assert.equal("correctBuckets" in publicQuestion, false);
  });

  assert.equal(productQuestion.items.some((item) => item.image.includes("/poultry-products/rabbit-portions.png")), true);
  assert.equal(fishProductsQuestion.items.some((item) => item.image.includes("/fish-products/fish-breaded.png")), true);
  assert.equal(meatProductsQuestion.items.some((item) => item.image.includes("/meat-products/romsteak.png")), true);
  assert.equal(packQuestion.items.some((item) => item.image.includes("/packaging/newspaper-violation.png")), true);
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
