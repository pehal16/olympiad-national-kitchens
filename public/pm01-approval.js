(function () {
  const elements = {
    version: document.getElementById("approval-version"),
    packages: document.getElementById("approval-packages"),
    status: document.getElementById("approval-status"),
    summary: document.getElementById("approval-summary"),
    actionPlan: document.getElementById("approval-action-plan"),
    families: document.getElementById("approval-families"),
    packagesList: document.getElementById("approval-packages-list")
  };

  const PM01_APPROVAL_STORAGE_KEY = "pm01ApprovalDecisionsV1";
  const PM01_RP_INTAKE_STORAGE_KEY = "pm01RpIntakeV1";
  const PM01_PREVIEW_INSPECTION_STORAGE_KEY = "pm01PreviewInspectionV1";
  const DECISION_OPTIONS = [
    { id: "pending", label: "Черновик", status: "Черновик до РП", detail: "Ожидает рабочую программу или правку формулировок." },
    { id: "approved_preview", label: "На preview", status: "Preview согласован", detail: "Можно генерировать 1-2 предварительных изображения." },
    { id: "needs_revision", label: "Нужны правки", status: "Нужны правки", detail: "Темы, задания или промпты требуют уточнения." },
    { id: "waiting_rp", label: "Ждём РП", status: "Ждём РП", detail: "Финальная методическая привязка откладывается до РП." }
  ];
  const PREVIEW_INSPECTION_OPTIONS = [
    { id: "awaiting_preview", label: "Ждёт preview", status: "Ожидает preview", detail: "Изображение ещё не осмотрено и не может стать основой для final asset." },
    { id: "accepted_preview", label: "Принять", status: "Preview принято", detail: "Можно использовать как визуальную опору для финального asset после общей проверки пакета." },
    { id: "needs_revision", label: "Правка", status: "Нужна правка", detail: "Нужно уточнить prompt, ракурс, сырьё, санитарный контекст или композицию." },
    { id: "rejected_preview", label: "Отклонить", status: "Preview отклонено", detail: "Не использовать для final asset; требуется новая генерация." }
  ];
  const REQUIRED_PM01_COMPETENCIES = ["ПК 1.1", "ПК 1.2", "ПК 1.3", "ПК 1.4", "ОК 01", "ОК 02", "ОК 07", "ОК 09", "ОК 10"];
  const decisionOptionsById = new Map(DECISION_OPTIONS.map((option) => [option.id, option]));
  const previewInspectionOptionsById = new Map(PREVIEW_INSPECTION_OPTIONS.map((option) => [option.id, option]));
  let approvalState = loadApprovalState();
  let rpIntakeState = loadRpIntakeState();
  let previewInspectionState = loadPreviewInspectionState();
  let currentExam = null;
  let currentDigitalShift = null;

  function unwrapExam(payload) {
    return payload?.data || payload?.exam || payload || {};
  }

  function createNode(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text) {
      node.textContent = text;
    }
    return node;
  }

  function loadApprovalState() {
    try {
      const stored = window.localStorage.getItem(PM01_APPROVAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) || {} : {};
    } catch (_) {
      return {};
    }
  }

  function loadRpIntakeState() {
    try {
      const stored = window.localStorage.getItem(PM01_RP_INTAKE_STORAGE_KEY);
      return stored ? JSON.parse(stored) || {} : {};
    } catch (_) {
      return {};
    }
  }

  function loadPreviewInspectionState() {
    try {
      const stored = window.localStorage.getItem(PM01_PREVIEW_INSPECTION_STORAGE_KEY);
      return stored ? JSON.parse(stored) || {} : {};
    } catch (_) {
      return {};
    }
  }

  function persistApprovalState() {
    try {
      window.localStorage.setItem(PM01_APPROVAL_STORAGE_KEY, JSON.stringify(approvalState));
    } catch (_) {
      // The board still works in-memory if browser storage is unavailable.
    }
  }

  function persistRpIntakeState() {
    try {
      window.localStorage.setItem(PM01_RP_INTAKE_STORAGE_KEY, JSON.stringify(rpIntakeState));
    } catch (_) {
      // The RP intake remains usable for the current browser session if storage is blocked.
    }
  }

  function persistPreviewInspectionState() {
    try {
      window.localStorage.setItem(PM01_PREVIEW_INSPECTION_STORAGE_KEY, JSON.stringify(previewInspectionState));
    } catch (_) {
      // Preview inspection still works in-memory if browser storage is unavailable.
    }
  }

  function getDecisionMeta(decisionId) {
    return decisionOptionsById.get(decisionId) || DECISION_OPTIONS[0];
  }

  function getPreviewInspectionMeta(statusId) {
    return previewInspectionOptionsById.get(statusId) || PREVIEW_INSPECTION_OPTIONS[0];
  }

  function getPackageDecision(variantId) {
    const stored = approvalState[variantId] || {};
    return {
      decision: stored.decision || "pending",
      note: stored.note || "",
      updatedAt: stored.updatedAt || null
    };
  }

  function setPackageDecision(variantId, patch) {
    approvalState[variantId] = {
      ...getPackageDecision(variantId),
      ...patch,
      updatedAt: new Date().toISOString()
    };
    persistApprovalState();
  }

  function getPackageRpIntake(variantId) {
    const stored = rpIntakeState[variantId] || {};
    return {
      excerpt: stored.excerpt || "",
      confirmedTopics: stored.confirmedTopics || "",
      updatedAt: stored.updatedAt || null
    };
  }

  function setPackageRpIntake(variantId, patch) {
    rpIntakeState[variantId] = {
      ...getPackageRpIntake(variantId),
      ...patch,
      updatedAt: new Date().toISOString()
    };
    persistRpIntakeState();
  }

  function resetPackageRpIntake(variantId) {
    delete rpIntakeState[variantId];
    persistRpIntakeState();
  }

  function hasRpIntake(variantId) {
    const intake = getPackageRpIntake(variantId);
    return Boolean(intake.excerpt.trim() || intake.confirmedTopics.trim());
  }

  function getAssetInspection(assetId) {
    const stored = previewInspectionState[assetId] || {};
    return {
      status: stored.status || "awaiting_preview",
      note: stored.note || "",
      updatedAt: stored.updatedAt || null
    };
  }

  function setAssetInspection(assetId, patch) {
    previewInspectionState[assetId] = {
      ...getAssetInspection(assetId),
      ...patch,
      updatedAt: new Date().toISOString()
    };
    persistPreviewInspectionState();
  }

  function resetAssetInspection(assetId) {
    delete previewInspectionState[assetId];
    persistPreviewInspectionState();
  }

  function getPackageInspectionSummary(packageData) {
    const assets = packageData.previewAssets || [];
    const statuses = assets.map((asset) => getAssetInspection(asset.id).status);
    return {
      total: assets.length,
      accepted: statuses.filter((status) => status === "accepted_preview").length,
      needsRevision: statuses.filter((status) => status === "needs_revision").length,
      rejected: statuses.filter((status) => status === "rejected_preview").length,
      awaiting: statuses.filter((status) => status === "awaiting_preview").length
    };
  }

  function isPackagePreviewInspectionAccepted(packageData) {
    const summary = getPackageInspectionSummary(packageData);
    return summary.total > 0 && summary.accepted === summary.total;
  }

  function getRpIntakeCount(packages) {
    return packages.filter((packageData) => hasRpIntake(packageData.variantId)).length;
  }

  function resetPackageDecision(variantId) {
    delete approvalState[variantId];
    persistApprovalState();
  }

  function getDecisionCounts(packages) {
    const counts = Object.fromEntries(DECISION_OPTIONS.map((option) => [option.id, 0]));
    packages.forEach((packageData) => {
      const decision = getPackageDecision(packageData.variantId).decision;
      counts[decision] = (counts[decision] || 0) + 1;
    });
    return counts;
  }

  function uniqueValues(items) {
    return Array.from(new Set(items.filter(Boolean)));
  }

  function getMethodicalFamilyCoverage(packageData, familyIds) {
    const matrixFamilies = new Set((packageData.methodicalMatrix || []).map((row) => row.familyId));
    const taskFamilies = new Set((packageData.tasks || []).map((task) => task.familyId));
    const cockpitFamilies = new Set((packageData.shiftCockpit?.operationTimeline || []).map((step) => step.familyId));
    return familyIds.map((familyId) => ({
      familyId,
      matrix: matrixFamilies.has(familyId),
      task: taskFamilies.has(familyId),
      cockpit: cockpitFamilies.has(familyId)
    }));
  }

  function buildCoverageAudit(digitalShift) {
    const packages = digitalShift.packages || [];
    const families = digitalShift.families || [];
    const familyIds = families.map((family) => family.id);
    const blueprints = digitalShift.interactionBlueprints || [];
    const blueprintFamilyIds = new Set(blueprints.map((blueprint) => blueprint.familyId));
    const allRows = packages.flatMap((packageData) => packageData.methodicalMatrix || []);
    const allAssets = packages.flatMap((packageData) => packageData.previewAssets || []);
    const allCompetencies = uniqueValues(allRows.flatMap((row) => row.competencies || []));
    const competencyCoverage = REQUIRED_PM01_COMPETENCIES.map((competency) => ({
      competency,
      covered: allCompetencies.includes(competency)
    }));
    const packageAudits = packages.map((packageData) => {
      const familyCoverage = getMethodicalFamilyCoverage(packageData, familyIds);
      const missingFamilies = familyCoverage
        .filter((item) => !item.matrix || !item.task || !item.cockpit)
        .map((item) => item.familyId);
      const previewAssets = packageData.previewAssets || [];
      const gateSummary = getPackageGateSummary(packageData);
      const finalGate = gateSummary.gates.find((gate) => gate.id === "final_assets");
      const hasRp = hasRpIntake(packageData.variantId);
      const decision = getPackageDecision(packageData.variantId).decision;
      const previewAccepted = isPackagePreviewInspectionAccepted(packageData);
      const structuralReady =
        (packageData.methodicalMatrix || []).length === familyIds.length &&
        (packageData.tasks || []).length === familyIds.length &&
        familyCoverage.every((item) => item.matrix && item.task && item.cockpit) &&
        previewAssets.length >= 2 &&
        previewAssets.every(
          (asset) =>
            asset.finalAsset === false &&
            asset.outputUse === "preview_only_until_teacher_approval" &&
            asset.inspectionGate === "visual_inspection_before_connection"
        );
      return {
        packageData,
        structuralReady,
        hasRp,
        decision,
        previewAccepted,
        finalGateStatus: finalGate?.status || "blocked",
        missingFamilies,
        matrixRows: (packageData.methodicalMatrix || []).length,
        tasks: (packageData.tasks || []).length,
        previewAssets: previewAssets.length,
        competencies: uniqueValues((packageData.methodicalMatrix || []).flatMap((row) => row.competencies || []))
      };
    });
    return {
      packages,
      familyIds,
      expectedMatrixRows: packages.length * familyIds.length,
      expectedPreviewAssets: packages.length * 2,
      matrixRows: allRows.length,
      previewAssets: allAssets.length,
      blueprintFamiliesCovered: familyIds.filter((familyId) => blueprintFamilyIds.has(familyId)).length,
      competencyCoverage,
      coveredCompetencies: competencyCoverage.filter((item) => item.covered).length,
      packageAudits,
      structuralReady: packageAudits.filter((item) => item.structuralReady).length,
      rpReady: packageAudits.filter((item) => item.hasRp).length,
      previewReady: packageAudits.filter((item) => item.hasRp && item.decision === "approved_preview").length,
      previewAccepted: packageAudits.filter((item) => item.previewAccepted).length,
      finalAssetsOpen: packageAudits.filter((item) => item.finalGateStatus === "pending").length,
      visualRubricStatus: digitalShift.visualAssetRubric?.status || "missing",
      normativeAnchors: (digitalShift.normativeAnchors || []).length
    };
  }

  function getGateStatusMeta(status) {
    const metas = {
      done: { label: "Готово", detail: "Можно использовать как основание для следующего шага." },
      pending: { label: "Ждёт", detail: "Нужны данные, решение или визуальная проверка." },
      blocked: { label: "Блок", detail: "Нельзя переводить в финальный контент." },
      locked: { label: "Зафиксировано", detail: "Официальный экзаменационный контракт не меняется." }
    };
    return metas[status] || metas.pending;
  }

  function getPackageGateRows(packageData) {
    const decision = getPackageDecision(packageData.variantId).decision;
    const hasRp = hasRpIntake(packageData.variantId);
    const previewAssets = packageData.previewAssets || [];
    const matrixRows = packageData.methodicalMatrix || [];
    const previewPlanReady =
      previewAssets.length >= 2 &&
      previewAssets.every(
        (asset) =>
          asset.finalAsset === false &&
          asset.targetPath?.startsWith("/assets/pm01/generated/digital-shift/") &&
          asset.inspectionRequired === true &&
          asset.inspectionGate === "visual_inspection_before_connection" &&
          asset.outputUse === "preview_only_until_teacher_approval"
      );
    const matrixReady =
      matrixRows.length === 5 &&
      matrixRows.every(
        (row) =>
          row.rpTopic &&
          row.newFormat &&
          row.checkCriterion &&
          row.visualAsset?.targetPath?.startsWith("/assets/pm01/generated/digital-shift/") &&
          row.approvalGate === "requires_rp_and_preview_approval"
      );
    const previewApproved = decision === "approved_preview";
    const previewAccepted = isPackagePreviewInspectionAccepted(packageData);
    const needsRevision = decision === "needs_revision";
    const waitingRp = decision === "waiting_rp";

    return [
      {
        id: "official_lock",
        status: "locked",
        title: "Официальный экзамен",
        detail: "Контракт 100 баллов / 20 заданий / 5 вариантов сохраняется; PX остаётся training-only."
      },
      {
        id: "methodical_matrix",
        status: matrixReady ? "done" : "blocked",
        title: "Методическая матрица",
        detail: matrixReady
          ? "Есть 5 строк: тема РП, ПК/ОК, формат, planned asset и критерий."
          : "Нужно восстановить полный набор строк матрицы перед согласованием."
      },
      {
        id: "rp_ktp",
        status: hasRp ? "done" : "pending",
        title: "РП/КТП",
        detail: hasRp
          ? "Фрагмент РП или уточнённые темы добавлены локально."
          : "Финальные темы и официальные формулировки ждут фрагмент РП/КТП."
      },
      {
        id: "preview_plan",
        status: previewPlanReady ? "done" : "blocked",
        title: "Preview-assets",
        detail: previewPlanReady
          ? "Есть planned paths, negative prompts и чек-лист визуального осмотра."
          : "Нужны planned slots, inspection gate и запрет на finalAsset до согласования."
      },
      {
        id: "teacher_preview_decision",
        status: previewApproved ? "done" : needsRevision ? "blocked" : "pending",
        title: "Решение по preview",
        detail: previewApproved
          ? "Preview можно генерировать как предварительный визуал."
          : needsRevision
            ? "Сначала внести правки в темы, задания или visual prompt."
            : waitingRp
              ? "Решение отложено до получения РП."
              : "Нужно выбрать статус: на preview, правки или ждём РП."
      },
      {
        id: "final_assets",
        status: hasRp && previewApproved && previewAccepted ? "pending" : "blocked",
        title: "Финальные assets",
        detail: hasRp && previewApproved && previewAccepted
          ? "Preview принят в журнале осмотра. Следующий gate: сгенерировать final files и снова проверить перед подключением."
          : hasRp && previewApproved
            ? "Финальные картинки нельзя подключать, пока preview-assets не приняты в журнале визуального осмотра."
            : "Финальные картинки нельзя подключать без РП/КТП и утверждённого preview."
      }
    ];
  }

  function getPackageGateSummary(packageData) {
    const gates = getPackageGateRows(packageData);
    return {
      gates,
      done: gates.filter((gate) => gate.status === "done" || gate.status === "locked").length,
      blocked: gates.filter((gate) => gate.status === "blocked").length,
      pending: gates.filter((gate) => gate.status === "pending").length
    };
  }

  function renderSummary(exam, digitalShift) {
    elements.summary.innerHTML = "";
    const packages = digitalShift.packages || [];
    const decisionCounts = getDecisionCounts(packages);
    const rpIntakeCount = getRpIntakeCount(packages);
    const gateSummaries = packages.map(getPackageGateSummary);
    const blockedGateCount = gateSummaries.reduce((sum, item) => sum + item.blocked, 0);
    const pendingGateCount = gateSummaries.reduce((sum, item) => sum + item.pending, 0);
    const coverageAudit = buildCoverageAudit(digitalShift);
    [
      ["Режим", "training-only", "PX не влияет на ведомость и официальный протокол."],
      ["Контракт", digitalShift.contract || "100 баллов / 20 заданий / 5 вариантов", "Официальный маршрут не расширяется."],
      ["Статус РП", digitalShift.rpStatus || "ожидаются РП", "Темы не переписываются вслепую."],
      ["РП-сверка", `${rpIntakeCount}/${packages.length} заполнено`, "Фрагменты РП хранятся локально до методической правки."],
      [
        "Согласование",
        `${decisionCounts.approved_preview}/${packages.length} на preview`,
        `${decisionCounts.needs_revision} правок · ${decisionCounts.waiting_rp} ждут РП.`
      ],
      [
        "Gate-чеклист",
        `${blockedGateCount} блоков · ${pendingGateCount} ожиданий`,
        "Пока блоки не сняты, final assets не подключаются."
      ],
      [
        "Coverage audit",
        `${coverageAudit.matrixRows}/${coverageAudit.expectedMatrixRows} matrix · ${coverageAudit.coveredCompetencies}/${coverageAudit.competencyCoverage.length} ПК/ОК`,
        "Показывает пробелы по семействам, preview-slots и компетенциям до генерации visuals."
      ],
      ["Версия", exam.version || exam.appVersion || "PM01", "Текущий опубликованный пакет."]
    ].forEach(([label, value, detail]) => {
      const card = createNode("article", "approval-summary-card");
      card.append(createNode("span", "", label), createNode("strong", "", value), createNode("p", "", detail));
      elements.summary.appendChild(card);
    });
    const exportCard = createNode("article", "approval-summary-card approval-summary-action");
    const exportButton = createNode("button", "button secondary", "Скопировать общий gate-отчёт");
    exportButton.type = "button";
    exportButton.addEventListener("click", () => copyAllGateReports(digitalShift, exportButton));
    exportCard.append(
      createNode("span", "", "Экспорт"),
      createNode("strong", "", "Gate report"),
      createNode("p", "", "Сводка по РП, preview, visual inspection и финальным asset-блокерам."),
      exportButton
    );
    elements.summary.appendChild(exportCard);
  }

  function getPackageNextAction(packageData) {
    const state = getPackageDecision(packageData.variantId);
    const decisionMeta = getDecisionMeta(state.decision);
    const gates = getPackageGateRows(packageData);
    const structuralBlocker = gates.find(
      (gate) => (gate.id === "methodical_matrix" || gate.id === "preview_plan") && gate.status === "blocked"
    );
    const hasRp = hasRpIntake(packageData.variantId);

    if (structuralBlocker) {
      return {
        status: "blocked",
        label: "Блок",
        title: "Проверить пакетные данные",
        detail: `${structuralBlocker.title}: ${structuralBlocker.detail}`,
        decisionStatus: decisionMeta.status
      };
    }

    if (state.decision === "needs_revision") {
      return {
        status: "blocked",
        label: "Правки",
        title: "Внести правки",
        detail: state.note.trim() || "Уточните темы, задания или visual prompt перед генерацией preview.",
        decisionStatus: decisionMeta.status
      };
    }

    if (!hasRp) {
      return {
        status: "pending",
        label: "РП",
        title: state.decision === "waiting_rp" ? "Ждём РП/КТП" : "Добавить РП/КТП",
        detail: "Вставьте фрагмент РП или уточнённые темы по цеху, затем выберите решение по preview.",
        decisionStatus: decisionMeta.status
      };
    }

    if (state.decision === "waiting_rp") {
      return {
        status: "pending",
        label: "Решение",
        title: "Снять ожидание РП",
        detail: "РП уже добавлена локально: переведите пакет на preview или отправьте его на правки.",
        decisionStatus: decisionMeta.status
      };
    }

    if (state.decision === "pending") {
      return {
        status: "pending",
        label: "Решение",
        title: "Выбрать решение по preview",
        detail: "РП есть. Подтвердите генерацию 1-2 preview-изображений или зафиксируйте правки.",
        decisionStatus: decisionMeta.status
      };
    }

    if (state.decision === "approved_preview") {
      if (isPackagePreviewInspectionAccepted(packageData)) {
        return {
          status: "ready",
          label: "Final",
          title: "Preview принято",
          detail: "Все planned preview-assets приняты в журнале осмотра. Можно готовить final assets, но подключать их только после повторной визуальной проверки.",
          decisionStatus: decisionMeta.status
        };
      }
      return {
        status: "ready",
        label: "Preview",
        title: "Сгенерировать и осмотреть preview",
        detail: "Можно генерировать 1-2 preview-изображения, затем зафиксировать результат визуального осмотра по каждому asset.",
        decisionStatus: decisionMeta.status
      };
    }

    return {
      status: "pending",
      label: "Проверка",
      title: "Проверить статус пакета",
      detail: "Сверьте РП, решение преподавателя и gate-чеклист перед следующим шагом.",
      decisionStatus: decisionMeta.status
    };
  }

  function buildActionPlanText(digitalShift) {
    const packages = digitalShift.packages || [];
    return [
      "PM01 PX action plan",
      `generatedAt: ${new Date().toISOString()}`,
      `packages: ${packages.length}`,
      "",
      ...packages.map((packageData, index) => {
        const action = getPackageNextAction(packageData);
        const decision = getPackageDecision(packageData.variantId);
        const gateSummary = getPackageGateSummary(packageData);
        return [
          `${index + 1}. ${packageData.title}`,
          `variantId: ${packageData.variantId}`,
          `nextAction: ${action.title}`,
          `actionStatus: ${action.status}`,
          `detail: ${action.detail}`,
          `decision: ${decision.decision}`,
          `rpIntake: ${hasRpIntake(packageData.variantId) ? "present" : "missing"}`,
          `gatesDone: ${gateSummary.done}/${gateSummary.gates.length}`,
          `gatesBlocked: ${gateSummary.blocked}`,
          `gatesPending: ${gateSummary.pending}`
        ].join("\n");
      })
    ].join("\n\n");
  }

  function buildCoverageAuditText(digitalShift) {
    const audit = buildCoverageAudit(digitalShift);
    return [
      "PM01 PX coverage audit",
      `generatedAt: ${new Date().toISOString()}`,
      `packages: ${audit.packages.length}/5`,
      `families: ${audit.familyIds.length}`,
      `matrixRows: ${audit.matrixRows}/${audit.expectedMatrixRows}`,
      `previewAssets: ${audit.previewAssets}/${audit.expectedPreviewAssets}`,
      `interactionBlueprints: ${audit.blueprintFamiliesCovered}/${audit.familyIds.length}`,
      `normativeAnchors: ${audit.normativeAnchors}`,
      `visualRubricStatus: ${audit.visualRubricStatus}`,
      `competenciesCovered: ${audit.coveredCompetencies}/${audit.competencyCoverage.length}`,
      `rpIntake: ${audit.rpReady}/${audit.packages.length}`,
      `previewDecision: ${audit.previewReady}/${audit.packages.length}`,
      `previewInspectionAccepted: ${audit.previewAccepted}/${audit.packages.length}`,
      `finalAssetGateOpen: ${audit.finalAssetsOpen}/${audit.packages.length}`,
      "",
      "competencies:",
      ...audit.competencyCoverage.map((item) => `- ${item.competency}: ${item.covered ? "covered" : "check_with_RP"}`),
      "",
      "packages:",
      ...audit.packageAudits.map((item, index) =>
        [
          `- row: ${index + 1}`,
          `  title: ${item.packageData.title}`,
          `  variantId: ${item.packageData.variantId}`,
          `  structuralReady: ${item.structuralReady}`,
          `  matrixRows: ${item.matrixRows}/${audit.familyIds.length}`,
          `  tasks: ${item.tasks}/${audit.familyIds.length}`,
          `  previewAssets: ${item.previewAssets}/2`,
          `  rpIntake: ${item.hasRp ? "present" : "missing"}`,
          `  previewDecision: ${item.decision}`,
          `  previewAccepted: ${item.previewAccepted}`,
          `  finalAssetsGate: ${item.finalGateStatus}`,
          `  competencies: ${item.competencies.join(", ") || "-"}`,
          `  missingFamilies: ${item.missingFamilies.join(", ") || "-"}`
        ].join("\n")
      )
    ].join("\n");
  }

  async function copyCoverageAudit(digitalShift, button) {
    try {
      await navigator.clipboard.writeText(buildCoverageAuditText(digitalShift));
      button.textContent = "Audit скопирован";
      window.setTimeout(() => {
        button.textContent = "Скопировать coverage audit";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать coverage audit";
      }, 1600);
    }
  }

  function buildApprovalStateSnapshot(digitalShift) {
    const packages = digitalShift.packages || [];
    return {
      kind: "pm01_px_approval_snapshot",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      appVersion: currentExam?.version || currentExam?.appVersion || "PM01",
      packageIds: packages.map((packageData) => packageData.variantId),
      packageCount: packages.length,
      storageKeys: {
        approval: PM01_APPROVAL_STORAGE_KEY,
        rpIntake: PM01_RP_INTAKE_STORAGE_KEY,
        previewInspection: PM01_PREVIEW_INSPECTION_STORAGE_KEY
      },
      state: {
        approvalDecisions: approvalState,
        rpIntake: rpIntakeState,
        previewInspection: previewInspectionState
      }
    };
  }

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function applyApprovalStateSnapshot(text) {
    if (!text) {
      throw new Error("Вставьте JSON snapshot перед импортом.");
    }
    const parsed = JSON.parse(text);
    if (parsed?.kind !== "pm01_px_approval_snapshot" || parsed?.schemaVersion !== 1) {
      throw new Error("Неверный формат snapshot PM01 PX.");
    }
    const state = parsed.state || {};
    if (!isPlainObject(state.approvalDecisions) || !isPlainObject(state.rpIntake) || !isPlainObject(state.previewInspection)) {
      throw new Error("Snapshot не содержит полный набор local-state данных.");
    }
    approvalState = state.approvalDecisions;
    rpIntakeState = state.rpIntake;
    previewInspectionState = state.previewInspection;
    persistApprovalState();
    persistRpIntakeState();
    persistPreviewInspectionState();
  }

  function getSnapshotFileName() {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return `pm01-px-approval-snapshot-${stamp}.json`;
  }

  function downloadTextFile(fileName, text, mimeType = "application/json") {
    const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function copyActionPlan(digitalShift, button) {
    try {
      await navigator.clipboard.writeText(buildActionPlanText(digitalShift));
      button.textContent = "План скопирован";
      window.setTimeout(() => {
        button.textContent = "Скопировать план";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать план";
      }, 1600);
    }
  }

  function isPackageReadyForPreview(packageData) {
    return getPackageNextAction(packageData).status === "ready";
  }

  function getPreviewBatchItems(digitalShift) {
    return (digitalShift.packages || []).filter(isPackageReadyForPreview);
  }

  function buildPreviewBatchText(digitalShift) {
    const readyPackages = getPreviewBatchItems(digitalShift);
    const assetCount = readyPackages.reduce((sum, packageData) => sum + (packageData.previewAssets || []).length, 0);
    return [
      "PM01 PX preview generation batch",
      `generatedAt: ${new Date().toISOString()}`,
      "scope: approved-preview packages only",
      "outputUse: preview_only_until_teacher_approval",
      "inspectionGate: visual_inspection_before_connection",
      "finalAsset: false",
      `readyPackages: ${readyPackages.length}/${(digitalShift.packages || []).length}`,
      `plannedPreviewAssets: ${assetCount}`,
      "",
      ...(readyPackages.length
        ? readyPackages.map((packageData, packageIndex) => {
            const decision = getPackageDecision(packageData.variantId);
            const intake = getPackageRpIntake(packageData.variantId);
            return [
              `## ${packageIndex + 1}. ${packageData.title}`,
              `variantId: ${packageData.variantId}`,
              `teacherDecision: ${decision.decision}`,
              `teacherNote: ${decision.note || "-"}`,
              "rpContext:",
              `  excerpt: ${intake.excerpt || "-"}`,
              `  confirmedTopics: ${intake.confirmedTopics || "-"}`,
              "rpTopics:",
              ...(packageData.rpTopics || []).map((topic) => `- ${topic}`),
              "",
              "previewAssets:",
              ...(packageData.previewAssets || []).map((asset, assetIndex) =>
                [
                  `- asset: ${asset.id || `${packageData.variantId}-preview-${assetIndex + 1}`}`,
                  `  targetPath: ${asset.targetPath}`,
                  `  aspectRatio: ${asset.aspectRatio || "-"}`,
                  `  visualPurpose: ${asset.visualPurpose || "-"}`,
                  `  prompt: ${asset.prompt}`,
                  `  negativePrompt: ${asset.negativePrompt}`,
                  "  styleReferences:",
                  ...(asset.styleReferences || []).map((reference) => `    - ${reference.label}: ${reference.path}`),
                  "  inspectionChecklist:",
                  ...(asset.inspectionChecklist || []).map((item) => `    - ${item}`),
                  `  outputUse: ${asset.outputUse}`,
                  `  inspectionRequired: ${asset.inspectionRequired === true}`,
                  `  finalAsset: ${asset.finalAsset === true}`
                ].join("\n")
              )
            ].join("\n");
          })
        : ["No packages are ready for preview generation yet."])
    ].join("\n\n");
  }

  async function copyPreviewBatch(digitalShift, button) {
    try {
      await navigator.clipboard.writeText(buildPreviewBatchText(digitalShift));
      button.textContent = "Preview batch скопирован";
      window.setTimeout(() => {
        button.textContent = "Скопировать preview batch";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать preview batch";
      }, 1600);
    }
  }

  async function copyApprovalStateSnapshot(digitalShift, button) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildApprovalStateSnapshot(digitalShift), null, 2));
      button.textContent = "Snapshot скопирован";
      window.setTimeout(() => {
        button.textContent = "Скопировать snapshot";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать snapshot";
      }, 1600);
    }
  }

  function downloadApprovalStateSnapshot(digitalShift, button) {
    try {
      downloadTextFile(getSnapshotFileName(), JSON.stringify(buildApprovalStateSnapshot(digitalShift), null, 2));
      button.textContent = "Snapshot скачан";
      window.setTimeout(() => {
        button.textContent = "Скачать snapshot";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скачать";
      window.setTimeout(() => {
        button.textContent = "Скачать snapshot";
      }, 1600);
    }
  }

  function renderCoverageMetric(label, value, detail, status = "neutral") {
    const card = createNode("article", "approval-coverage-card");
    card.dataset.status = status;
    card.append(createNode("span", "", label), createNode("strong", "", value), createNode("p", "", detail));
    return card;
  }

  function renderCoverageAuditPanel(digitalShift) {
    const audit = buildCoverageAudit(digitalShift);
    const panel = createNode("section", "approval-coverage-audit");
    const head = createNode("div", "approval-coverage-head");
    const title = createNode("div");
    title.append(
      createNode("h3", "", "Coverage audit"),
      createNode("span", "", "Методический контроль перед РП-правкой, preview и финальными assets")
    );
    const copyButton = createNode("button", "button secondary", "Скопировать coverage audit");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyCoverageAudit(digitalShift, copyButton));
    head.append(title, copyButton);

    const metrics = createNode("div", "approval-coverage-grid");
    metrics.append(
      renderCoverageMetric(
        "Матрица",
        `${audit.matrixRows}/${audit.expectedMatrixRows}`,
        "5 строк на каждый цех: тема РП, ПК/ОК, формат, asset и критерий.",
        audit.matrixRows === audit.expectedMatrixRows ? "done" : "blocked"
      ),
      renderCoverageMetric(
        "Семейства",
        `${audit.blueprintFamiliesCovered}/${audit.familyIds.length}`,
        "Все современные форматы должны иметь storyboard и визуальный режим.",
        audit.blueprintFamiliesCovered === audit.familyIds.length ? "done" : "blocked"
      ),
      renderCoverageMetric(
        "Preview slots",
        `${audit.previewAssets}/${audit.expectedPreviewAssets}`,
        "Плановые preview-only assets с inspection gate и finalAsset: false.",
        audit.previewAssets === audit.expectedPreviewAssets ? "done" : "blocked"
      ),
      renderCoverageMetric(
        "ПК/ОК",
        `${audit.coveredCompetencies}/${audit.competencyCoverage.length}`,
        "ОК 09/10 держим как явную сверку по РП, если они не прописаны в строках.",
        audit.coveredCompetencies === audit.competencyCoverage.length ? "done" : "pending"
      ),
      renderCoverageMetric(
        "РП-intake",
        `${audit.rpReady}/${audit.packages.length}`,
        "Финальная формулировка тем не делается без рабочих программ.",
        audit.rpReady === audit.packages.length ? "done" : "pending"
      ),
      renderCoverageMetric(
        "Final gate",
        `${audit.finalAssetsOpen}/${audit.packages.length}`,
        "Открывается только после РП, решения на preview и принятого визуального осмотра.",
        audit.finalAssetsOpen ? "pending" : "blocked"
      )
    );

    const competencyStrip = createNode("div", "approval-coverage-competencies");
    audit.competencyCoverage.forEach((item) => {
      const chip = createNode("span", "approval-coverage-competency", item.competency);
      chip.dataset.status = item.covered ? "covered" : "rp_check";
      chip.title = item.covered ? "Есть в строках методической матрицы" : "Проверить и при необходимости добавить после РП/КТП";
      competencyStrip.appendChild(chip);
    });

    const packageList = createNode("div", "approval-coverage-packages");
    audit.packageAudits.forEach((item) => {
      const card = createNode("article", "approval-coverage-package");
      card.dataset.status = item.structuralReady ? "done" : "blocked";
      card.append(
        createNode("strong", "", item.packageData.title),
        createNode(
          "span",
          "",
          `matrix ${item.matrixRows}/${audit.familyIds.length} · tasks ${item.tasks}/${audit.familyIds.length} · preview ${item.previewAssets}/2`
        ),
        createNode(
          "p",
          "",
          `РП: ${item.hasRp ? "есть" : "ждёт"} · решение: ${item.decision} · осмотр preview: ${item.previewAccepted ? "принят" : "не закрыт"} · final: ${item.finalGateStatus}`
        )
      );
      if (item.missingFamilies.length) {
        card.append(createNode("em", "", `Проверить семейства: ${item.missingFamilies.join(", ")}`));
      }
      packageList.appendChild(card);
    });

    panel.append(head, metrics, competencyStrip, packageList);
    return panel;
  }

  function buildPreviewInspectionReport(packageData) {
    const summary = getPackageInspectionSummary(packageData);
    const decision = getPackageDecision(packageData.variantId);
    return [
      "PM01 PX preview inspection report",
      `generatedAt: ${new Date().toISOString()}`,
      `package: ${packageData.title}`,
      `variantId: ${packageData.variantId}`,
      `teacherDecision: ${decision.decision}`,
      `rpIntake: ${hasRpIntake(packageData.variantId) ? "present" : "missing"}`,
      `inspectionAccepted: ${summary.accepted}/${summary.total}`,
      `inspectionNeedsRevision: ${summary.needsRevision}`,
      `inspectionRejected: ${summary.rejected}`,
      `inspectionAwaiting: ${summary.awaiting}`,
      `finalAssetGate: ${isPackagePreviewInspectionAccepted(packageData) ? "preview_accepted_waiting_final_generation" : "blocked_until_preview_acceptance"}`,
      "",
      "assets:",
      ...((packageData.previewAssets || []).map((asset) => {
        const inspection = getAssetInspection(asset.id);
        const meta = getPreviewInspectionMeta(inspection.status);
        return [
          `- asset: ${asset.id}`,
          `  targetPath: ${asset.targetPath}`,
          `  outputUse: ${asset.outputUse}`,
          `  finalAsset: ${asset.finalAsset === true}`,
          `  inspectionStatus: ${inspection.status}`,
          `  inspectionLabel: ${meta.status}`,
          `  updatedAt: ${inspection.updatedAt || "not_saved"}`,
          `  note: ${inspection.note || "-"}`,
          "  checklist:",
          ...(asset.inspectionChecklist || []).map((item) => `    - ${item}`)
        ].join("\n");
      }))
    ].join("\n");
  }

  async function copyPreviewInspectionReport(packageData, button) {
    try {
      await navigator.clipboard.writeText(buildPreviewInspectionReport(packageData));
      button.textContent = "Отчёт осмотра скопирован";
      window.setTimeout(() => {
        button.textContent = "Скопировать отчёт осмотра";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать отчёт осмотра";
      }, 1600);
    }
  }

  function renderPreviewBatchPanel(digitalShift, readyPackages) {
    const panel = createNode("section", "approval-preview-batch");
    const assetCount = readyPackages.reduce((sum, packageData) => sum + (packageData.previewAssets || []).length, 0);
    const head = createNode("div", "approval-preview-batch-head");
    const title = createNode("div");
    title.append(
      createNode("h3", "", "Preview batch"),
      createNode(
        "span",
        "",
        readyPackages.length
          ? `${readyPackages.length} цехов · ${assetCount} planned preview-assets · finalAsset: false`
          : "Появится после РП/КТП и решения «На preview»"
      )
    );
    const copyButton = createNode("button", "button secondary", "Скопировать preview batch");
    copyButton.type = "button";
    copyButton.disabled = readyPackages.length === 0;
    copyButton.addEventListener("click", () => copyPreviewBatch(digitalShift, copyButton));
    head.append(title, copyButton);

    const list = createNode("div", "approval-preview-batch-list");
    if (readyPackages.length) {
      readyPackages.forEach((packageData) => {
        const card = createNode("article", "approval-preview-batch-card");
        card.append(
          createNode("strong", "", packageData.title),
          createNode("p", "", "Готово к генерации 1-2 preview с последующим визуальным осмотром."),
          renderList(
            (packageData.previewAssets || []).map((asset) => `${asset.id}: ${asset.targetPath}`),
            "approval-preview-batch-paths"
          )
        );
        list.appendChild(card);
      });
    } else {
      const empty = createNode("p", "approval-preview-batch-empty", "Нет цехов, прошедших gate РП/КТП + «На preview».");
      list.appendChild(empty);
    }

    panel.append(head, list);
    return panel;
  }

  function renderStateSnapshotPanel(digitalShift) {
    const packages = digitalShift.packages || [];
    const panel = createNode("section", "approval-state-snapshot");
    const head = createNode("div", "approval-state-snapshot-head");
    const title = createNode("div");
    title.append(
      createNode("h3", "", "Snapshot согласования"),
      createNode("span", "", "Сохраняет browser-local РП, решения, заметки и журнал осмотра preview без изменения публичного экзамена.")
    );
    const exportButton = createNode("button", "button secondary", "Скопировать snapshot");
    exportButton.type = "button";
    exportButton.addEventListener("click", () => copyApprovalStateSnapshot(digitalShift, exportButton));
    const downloadButton = createNode("button", "button secondary", "Скачать snapshot");
    downloadButton.type = "button";
    downloadButton.addEventListener("click", () => downloadApprovalStateSnapshot(digitalShift, downloadButton));
    const headActions = createNode("div", "approval-state-snapshot-head-actions");
    headActions.append(exportButton, downloadButton);
    head.append(title, headActions);

    const importField = createNode("label", "approval-state-import-field");
    const textarea = createNode("textarea", "approval-state-import");
    textarea.placeholder = "Вставьте JSON snapshot PM01 PX для восстановления локального согласования";
    importField.append(createNode("span", "", "Импорт snapshot"), textarea);

    const status = createNode("p", "approval-state-snapshot-status", `${packages.length} цехов · import заменяет только localStorage этой страницы.`);
    const actions = createNode("div", "approval-state-snapshot-actions");
    const importButton = createNode("button", "button secondary", "Импортировать snapshot");
    importButton.type = "button";
    importButton.addEventListener("click", () => {
      try {
        applyApprovalStateSnapshot(textarea.value.trim());
        textarea.value = "";
        refreshApprovalOverview();
        renderPackages(currentDigitalShift);
        const freshStatus = elements.actionPlan?.querySelector(".approval-state-snapshot-status");
        if (freshStatus) {
          freshStatus.textContent = "Snapshot импортирован. Локальные решения, РП и осмотры восстановлены.";
        }
      } catch (error) {
        status.textContent = error.message || "Не удалось импортировать snapshot.";
      }
    });
    const fileInput = createNode("input", "approval-state-file");
    fileInput.type = "file";
    fileInput.accept = "application/json,.json";
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        textarea.value = String(reader.result || "");
        try {
          applyApprovalStateSnapshot(textarea.value.trim());
          textarea.value = "";
          refreshApprovalOverview();
          renderPackages(currentDigitalShift);
          const freshStatus = elements.actionPlan?.querySelector(".approval-state-snapshot-status");
          if (freshStatus) {
            freshStatus.textContent = `Snapshot из файла ${file.name} импортирован.`;
          }
        } catch (error) {
          status.textContent = error.message || "Не удалось импортировать snapshot из файла.";
        } finally {
          fileInput.value = "";
        }
      });
      reader.addEventListener("error", () => {
        status.textContent = "Не удалось прочитать JSON-файл snapshot.";
        fileInput.value = "";
      });
      reader.readAsText(file, "utf-8");
    });
    const fileButton = createNode("button", "button secondary", "Загрузить snapshot-файл");
    fileButton.type = "button";
    fileButton.addEventListener("click", () => fileInput.click());
    actions.append(importButton, fileButton, fileInput);
    panel.append(head, importField, actions, status);
    return panel;
  }

  function renderActionPlan(digitalShift) {
    if (!elements.actionPlan) {
      return;
    }
    elements.actionPlan.innerHTML = "";
    const packages = digitalShift.packages || [];
    const actions = packages.map((packageData) => ({
      packageData,
      action: getPackageNextAction(packageData),
      decision: getPackageDecision(packageData.variantId),
      gateSummary: getPackageGateSummary(packageData)
    }));
    const readyCount = actions.filter((item) => item.action.status === "ready").length;
    const pendingCount = actions.filter((item) => item.action.status === "pending").length;
    const blockedCount = actions.filter((item) => item.action.status === "blocked").length;
    const readyPackages = actions.filter((item) => item.action.status === "ready").map((item) => item.packageData);

    const head = createNode("div", "approval-action-head");
    const title = createNode("div", "approval-action-title");
    title.append(
      createNode("p", "overline", "Управление согласованием"),
      createNode("h2", "", "Очередь следующих действий"),
      createNode("span", "", `${readyCount} готовы к preview · ${pendingCount} ожидают · ${blockedCount} требуют правки`)
    );
    const copyButton = createNode("button", "button secondary", "Скопировать план");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyActionPlan(digitalShift, copyButton));
    head.append(title, copyButton);

    const grid = createNode("div", "approval-action-grid");
    actions.forEach(({ packageData, action, decision, gateSummary }, index) => {
      const card = createNode("article", "approval-action-card");
      card.dataset.status = action.status;
      card.dataset.variant = packageData.variantId;
      card.dataset.decision = decision.decision;

      const status = createNode("span", "approval-action-status", action.label);
      const link = createNode("a", "approval-action-link", "Перейти к цеху");
      link.href = `#package-${packageData.variantId}`;
      const meta = createNode("div", "approval-action-meta");
      meta.append(
        createNode("span", "", `Решение: ${action.decisionStatus}`),
        createNode("span", "", hasRpIntake(packageData.variantId) ? "РП добавлена" : "РП нужна"),
        createNode("span", "", `Gates: ${gateSummary.done}/${gateSummary.gates.length}`)
      );

      card.append(
        status,
        createNode("small", "", `Пакет ${index + 1}`),
        createNode("strong", "", packageData.title),
        createNode("h3", "", action.title),
        createNode("p", "", action.detail),
        meta,
        link
      );
      grid.appendChild(card);
    });

    elements.actionPlan.append(
      head,
      grid,
      renderCoverageAuditPanel(digitalShift),
      renderPreviewBatchPanel(digitalShift, readyPackages),
      renderStateSnapshotPanel(digitalShift)
    );
  }

  function refreshApprovalOverview() {
    if (!currentExam || !currentDigitalShift) {
      return;
    }
    renderSummary(currentExam, currentDigitalShift);
    renderActionPlan(currentDigitalShift);
  }

  function renderNormativeAnchors(anchors) {
    const section = createNode("section", "approval-normative-panel");
    const heading = createNode("div", "approval-normative-head");
    heading.append(
      createNode("h3", "", "Нормативная опора"),
      createNode("span", "", "Проверенные источники, роль в PM01 и gate перед финальными правками")
    );
    const list = createNode("div", "approval-normative-list");
    anchors.forEach((anchor) => {
      const card = createNode("article", "approval-normative-card");
      card.dataset.sourceStatus = anchor.sourceStatus || "source";
      const title = createNode(anchor.sourceUrl ? "a" : "strong", "", anchor.title);
      if (anchor.sourceUrl) {
        title.href = anchor.sourceUrl;
        title.target = "_blank";
        title.rel = "noreferrer";
      }
      card.append(
        title,
        createNode("small", "", anchor.documentStatus || ""),
        createNode("p", "", anchor.relevance || ""),
        createNode("em", "", (anchor.focus || []).join(" · ")),
        createNode("span", "", anchor.approvalUse || ""),
        createNode("code", "", `${anchor.sourceStatus || "source"} · checked ${anchor.verifiedAt || "n/a"}`)
      );
      list.appendChild(card);
    });
    const copyButton = createNode("button", "button secondary", "Копировать источники");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyNormativeAnchors(anchors, copyButton));
    section.append(heading, list, copyButton);
    return section;
  }

  function renderVisualAssetRubric(rubric) {
    const section = createNode("section", "approval-visual-rubric-panel");
    const heading = createNode("div", "approval-visual-rubric-head");
    heading.append(
      createNode("h3", "", rubric.title || "Visual QA rubric"),
      createNode("span", "", "Что принимать, что отклонять и как осматривать preview-assets")
    );

    const accepted = createNode("article", "approval-visual-rubric-card");
    accepted.append(
      createNode("strong", "", "Принять, если"),
      renderList(rubric.acceptIf || [], "approval-visual-rubric-list")
    );

    const rejected = createNode("article", "approval-visual-rubric-card is-reject");
    rejected.append(
      createNode("strong", "", "Отклонить, если"),
      renderList(rubric.rejectIf || [], "approval-visual-rubric-list")
    );

    const copyButton = createNode("button", "button secondary", "Копировать visual rubric");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyVisualAssetRubric(rubric, copyButton));
    section.append(heading, accepted, rejected, copyButton);
    return section;
  }

  function renderInteractionBlueprints(blueprints) {
    const section = createNode("section", "approval-blueprint-panel");
    const heading = createNode("div", "approval-blueprint-head");
    heading.append(
      createNode("h3", "", "Интерактивные новшества"),
      createNode("span", "", "Сценарий, анимация, реализация и вопрос для согласования")
    );
    const list = createNode("div", "approval-blueprint-list");
    blueprints.forEach((blueprint) => {
      const card = createNode("article", "approval-blueprint-card");
      card.dataset.family = blueprint.familyId;
      card.append(
        createNode("strong", "", blueprint.visualMode || blueprint.familyId),
        createNode("p", "", blueprint.layout || ""),
        createNode("small", "", blueprint.animation || ""),
        createNode("em", "", blueprint.uniqueness || ""),
        createNode("span", "", blueprint.approvalQuestion || "")
      );
      list.appendChild(card);
    });
    const copyButton = createNode("button", "button secondary", "Копировать storyboard");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyInteractionBlueprints(blueprints, copyButton));
    section.append(heading, list, copyButton);
    return section;
  }

  function renderFamilies(families, blueprints = [], anchors = [], visualRubric = null) {
    elements.families.innerHTML = "";
    if (anchors.length) {
      elements.families.appendChild(renderNormativeAnchors(anchors));
    }
    if (visualRubric) {
      elements.families.appendChild(renderVisualAssetRubric(visualRubric));
    }
    const heading = createNode("h3", "", "Семейства заданий");
    const list = createNode("div", "approval-family-stack");
    families.forEach((family) => {
      const item = createNode("article", "approval-family-card");
      item.append(
        createNode("strong", "", family.title),
        createNode("span", "", family.interaction),
        createNode("p", "", family.modernity)
      );
      list.appendChild(item);
    });
    elements.families.append(heading, list);
    if (blueprints.length) {
      elements.families.appendChild(renderInteractionBlueprints(blueprints));
    }
  }

  function renderList(items, className) {
    const list = createNode("ul", className);
    items.forEach((item) => list.appendChild(createNode("li", "", item)));
    return list;
  }

  async function copyVisualAssetRubric(rubric, button) {
    const text = [
      rubric.title || "Visual QA rubric",
      `status: ${rubric.status || "-"}`,
      "",
      "stylePrinciples:",
      ...(rubric.stylePrinciples || []).map((item) => `- ${item}`),
      "",
      "acceptIf:",
      ...(rubric.acceptIf || []).map((item) => `- ${item}`),
      "",
      "rejectIf:",
      ...(rubric.rejectIf || []).map((item) => `- ${item}`),
      "",
      "inspectionSteps:",
      ...(rubric.inspectionSteps || []).map((item) => `- ${item}`)
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Visual rubric скопирован";
      window.setTimeout(() => {
        button.textContent = "Копировать visual rubric";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Копировать visual rubric";
      }, 1600);
    }
  }

  async function copyNormativeAnchors(anchors, button) {
    const text = [
      "PM01 PX normativeAnchors:",
      ...anchors.map((anchor, index) =>
        [
          `- row: ${index + 1}`,
          `  id: ${anchor.id}`,
          `  title: ${anchor.title}`,
          `  sourceUrl: ${anchor.sourceUrl || "-"}`,
          `  sourceStatus: ${anchor.sourceStatus}`,
          `  documentStatus: ${anchor.documentStatus}`,
          `  verifiedAt: ${anchor.verifiedAt}`,
          `  focus: ${(anchor.focus || []).join(", ")}`,
          `  relevance: ${anchor.relevance}`,
          `  approvalUse: ${anchor.approvalUse}`
        ].join("\n")
      )
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Источники скопированы";
      window.setTimeout(() => {
        button.textContent = "Копировать источники";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Копировать источники";
      }, 1600);
    }
  }

  async function copyInteractionBlueprints(blueprints, button) {
    const text = [
      "PM01 PX interactionBlueprints:",
      ...blueprints.map((blueprint, index) =>
        [
          `- row: ${index + 1}`,
          `  family: ${blueprint.familyId}`,
          `  visualMode: ${blueprint.visualMode}`,
          `  layout: ${blueprint.layout}`,
          `  studentFlow: ${(blueprint.studentFlow || []).join(" -> ")}`,
          `  animation: ${blueprint.animation}`,
          `  implementation: ${blueprint.implementation}`,
          `  uniqueness: ${blueprint.uniqueness}`,
          `  assessment: ${blueprint.assessment}`,
          `  approvalQuestion: ${blueprint.approvalQuestion}`
        ].join("\n")
      )
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Storyboard скопирован";
      window.setTimeout(() => {
        button.textContent = "Копировать storyboard";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Копировать storyboard";
      }, 1600);
    }
  }

  async function copyPromptPackage(packageData, button) {
    const text = [
      packageData.title,
      "",
      "Темы:",
      ...packageData.rpTopics.map((topic) => `- ${topic}`),
      "",
      "Промпты:",
      ...(packageData.previewAssets || []).map((asset) => `- ${asset.prompt}\n  path: ${asset.targetPath}\n  negative: ${asset.negativePrompt}`)
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Промпты скопированы";
      window.setTimeout(() => {
        button.textContent = "Копировать промпты";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Копировать промпты";
      }, 1600);
    }
  }

  async function copyApprovalDecision(packageData, button) {
    const decision = getPackageDecision(packageData.variantId);
    const meta = getDecisionMeta(decision.decision);
    const text = [
      packageData.title,
      `decision: ${meta.id} (${meta.label})`,
      `updatedAt: ${decision.updatedAt || "not_saved"}`,
      `note: ${decision.note || "-"}`,
      "",
      "rpIntake:",
      `  excerpt: ${getPackageRpIntake(packageData.variantId).excerpt || "-"}`,
      `  confirmedTopics: ${getPackageRpIntake(packageData.variantId).confirmedTopics || "-"}`,
      "",
      "previewAssets:",
      ...(packageData.previewAssets || []).map(
        (asset) => `- ${asset.id}\n  targetPath: ${asset.targetPath}\n  status: ${asset.status}\n  finalAsset: ${asset.finalAsset}`
      )
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Решение скопировано";
      window.setTimeout(() => {
        button.textContent = "Скопировать решение";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать решение";
      }, 1600);
    }
  }

  async function copyRpIntake(packageData, button) {
    const intake = getPackageRpIntake(packageData.variantId);
    const text = [
      packageData.title,
      "rpIntake:",
      `updatedAt: ${intake.updatedAt || "not_saved"}`,
      "",
      "currentTopics:",
      ...(packageData.rpTopics || []).map((topic) => `- ${topic}`),
      "",
      "rpExcerpt:",
      intake.excerpt || "-",
      "",
      "confirmedTopics:",
      intake.confirmedTopics || "-"
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "РП-сверка скопирована";
      window.setTimeout(() => {
        button.textContent = "Скопировать РП-сверку";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать РП-сверку";
      }, 1600);
    }
  }

  async function copyMethodicalMatrix(packageData, button) {
    const rows = packageData.methodicalMatrix || [];
    const text = [
      packageData.title,
      "methodicalMatrix:",
      ...rows.map((row, index) =>
        [
          `- row: ${index + 1}`,
          `  family: ${row.familyId}`,
          `  rpTopic: ${row.rpTopic}`,
          `  competencies: ${(row.competencies || []).join(", ")}`,
          `  examModule: ${row.examModule}`,
          `  currentQuestion: ${row.currentQuestion}`,
          `  newFormat: ${row.newFormat}`,
          `  visualAsset: ${row.visualAsset?.targetPath || "-"}`,
          `  checkCriterion: ${row.checkCriterion}`,
          `  approvalGate: ${row.approvalGate}`
        ].join("\n")
      )
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Матрица скопирована";
      window.setTimeout(() => {
        button.textContent = "Скопировать матрицу";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать матрицу";
      }, 1600);
    }
  }

  function buildGateReportText(packageData) {
    const decision = getPackageDecision(packageData.variantId);
    const intake = getPackageRpIntake(packageData.variantId);
    const summary = getPackageGateSummary(packageData);
    return [
      packageData.title,
      `variantId: ${packageData.variantId}`,
      `decision: ${decision.decision}`,
      `rpIntake: ${hasRpIntake(packageData.variantId) ? "present" : "missing"}`,
      `rpUpdatedAt: ${intake.updatedAt || "not_saved"}`,
      `gatesDone: ${summary.done}/${summary.gates.length}`,
      `gatesBlocked: ${summary.blocked}`,
      `gatesPending: ${summary.pending}`,
      "gates:",
      ...summary.gates.map((gate) => {
        const meta = getGateStatusMeta(gate.status);
        return `- ${gate.id}: ${meta.label}\n  title: ${gate.title}\n  detail: ${gate.detail}`;
      })
    ].join("\n");
  }

  async function copyGateReport(packageData, button) {
    try {
      await navigator.clipboard.writeText(buildGateReportText(packageData));
      button.textContent = "Gate-отчёт скопирован";
      window.setTimeout(() => {
        button.textContent = "Скопировать gate-отчёт";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать gate-отчёт";
      }, 1600);
    }
  }

  async function copyAllGateReports(digitalShift, button) {
    const text = [
      "PM01 PX gate report",
      `generatedAt: ${new Date().toISOString()}`,
      "",
      ...((digitalShift.packages || []).map(buildGateReportText).map((report) => `${report}\n---`))
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Общий отчёт скопирован";
      window.setTimeout(() => {
        button.textContent = "Скопировать общий gate-отчёт";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать общий gate-отчёт";
      }, 1600);
    }
  }

  function renderApprovalGates(packageData) {
    const summary = getPackageGateSummary(packageData);
    const panel = createNode("section", "approval-package-block approval-gate-panel");
    const head = createNode("div", "approval-gate-head");
    head.append(
      createNode("h3", "", "Gate-чеклист финализации"),
      createNode("span", "", `${summary.done}/${summary.gates.length} закрыто · ${summary.blocked} блоков · ${summary.pending} ожиданий`)
    );

    const grid = createNode("div", "approval-gate-grid");
    summary.gates.forEach((gate) => {
      const meta = getGateStatusMeta(gate.status);
      const card = createNode("article", "approval-gate-card");
      card.dataset.gate = gate.id;
      card.dataset.status = gate.status;
      card.append(
        createNode("span", "approval-gate-status", meta.label),
        createNode("strong", "", gate.title),
        createNode("p", "", gate.detail),
        createNode("small", "", meta.detail)
      );
      grid.appendChild(card);
    });

    const copyButton = createNode("button", "button secondary", "Скопировать gate-отчёт");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyGateReport(packageData, copyButton));
    panel.append(head, grid, copyButton);
    return panel;
  }

  function refreshPackageGates(packageData) {
    const section = document.getElementById(`package-${packageData.variantId}`);
    const panel = section?.querySelector(".approval-gate-panel");
    if (panel) {
      panel.replaceWith(renderApprovalGates(packageData));
    }
  }

  function renderMethodicalMatrix(packageData) {
    const rows = packageData.methodicalMatrix || [];
    const panel = createNode("section", "approval-package-block approval-methodical-matrix");
    const head = createNode("div", "approval-matrix-head");
    head.append(
      createNode("h3", "", "Методическая матрица"),
      createNode("span", "", "Тема РП, ПК/ОК, формат задания, planned asset и критерий проверки")
    );
    const grid = createNode("div", "approval-matrix-grid");
    rows.forEach((row, index) => {
      const card = createNode("article", "approval-matrix-card");
      card.dataset.family = row.familyId;
      card.append(
        createNode("span", "approval-matrix-index", String(index + 1).padStart(2, "0")),
        createNode("strong", "", row.newFormat || row.familyId),
        createNode("small", "", row.rpTopic || "Тема РП уточняется"),
        createNode("p", "", row.currentQuestion || ""),
        createNode("em", "", (row.competencies || []).join(" · ")),
        createNode("code", "", row.visualAsset?.targetPath || "asset после preview"),
        createNode("p", "approval-matrix-criterion", row.checkCriterion || "")
      );
      grid.appendChild(card);
    });
    const copyButton = createNode("button", "button secondary", "Скопировать матрицу");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyMethodicalMatrix(packageData, copyButton));
    panel.append(head, grid, copyButton);
    return panel;
  }

  function renderShiftCockpit(packageData) {
    const cockpit = packageData.shiftCockpit || {};
    const panel = createNode("section", "approval-package-block approval-cockpit-panel");
    const head = createNode("div", "approval-cockpit-head");
    head.append(
      createNode("h3", "", "Student cockpit"),
      createNode("span", "", cockpit.status || "training_only_cockpit")
    );

    const zones = createNode("div", "approval-cockpit-zones");
    (cockpit.layout || []).forEach((zone) => {
      const card = createNode("article", "approval-cockpit-zone");
      card.dataset.zone = zone.zone || "";
      card.append(createNode("strong", "", zone.title || zone.zone || ""), createNode("p", "", zone.purpose || ""));
      zones.appendChild(card);
    });

    const timeline = createNode("ol", "approval-cockpit-timeline");
    (cockpit.operationTimeline || []).forEach((step) => {
      const item = createNode("li");
      item.dataset.family = step.familyId || "";
      item.append(
        createNode("span", "approval-cockpit-step", String(step.step || "").padStart(2, "0")),
        createNode("strong", "", step.familyTitle || step.title || ""),
        createNode("small", "", step.controlSignal || step.studentAction || ""),
        createNode("em", "", step.animation || "")
      );
      timeline.appendChild(item);
    });

    const signals = renderList(
      (cockpit.journalSignals || []).map((signal) => (signal.time ? `${signal.time} · ${signal.event}` : signal.event)),
      "approval-cockpit-signals"
    );
    const focus = createNode("p", "approval-cockpit-focus", cockpit.rightPanel?.approvalFocus || "");
    panel.append(head, zones, timeline, signals, focus);
    return panel;
  }

  function renderRpIntake(packageData) {
    const intake = getPackageRpIntake(packageData.variantId);
    const panel = createNode("section", "approval-package-block approval-rp-intake");
    const head = createNode("div", "approval-rp-head");
    head.append(
      createNode("h3", "", "РП-intake"),
      createNode("span", "", hasRpIntake(packageData.variantId) ? "Фрагмент РП добавлен локально" : "Вставьте фрагмент РП перед финальной правкой тем")
    );

    const excerptField = createNode("label", "approval-rp-field");
    const excerpt = createNode("textarea", "approval-rp-text");
    excerpt.value = intake.excerpt;
    excerpt.placeholder = "Фрагмент РП, КТП или рабочей программы по этому цеху";
    excerpt.addEventListener("input", () => {
      setPackageRpIntake(packageData.variantId, { excerpt: excerpt.value });
      refreshApprovalOverview();
      refreshPackageGates(packageData);
    });
    excerptField.append(createNode("span", "", "Фрагмент РП"), excerpt);

    const confirmedField = createNode("label", "approval-rp-field");
    const confirmedTopics = createNode("textarea", "approval-rp-text approval-rp-topics");
    confirmedTopics.value = intake.confirmedTopics;
    confirmedTopics.placeholder = "Уточнённые темы после сверки с РП";
    confirmedTopics.addEventListener("input", () => {
      setPackageRpIntake(packageData.variantId, { confirmedTopics: confirmedTopics.value });
      refreshApprovalOverview();
      refreshPackageGates(packageData);
    });
    confirmedField.append(createNode("span", "", "Уточнённые темы"), confirmedTopics);

    const actions = createNode("div", "approval-rp-actions");
    const copyButton = createNode("button", "button secondary", "Скопировать РП-сверку");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyRpIntake(packageData, copyButton));
    const resetButton = createNode("button", "button ghost", "Очистить РП");
    resetButton.type = "button";
    resetButton.addEventListener("click", () => {
      resetPackageRpIntake(packageData.variantId);
      refreshApprovalOverview();
      renderPackages(currentDigitalShift);
    });
    actions.append(copyButton, resetButton);
    panel.append(head, excerptField, confirmedField, actions);
    return panel;
  }

  function renderDecisionControls(packageData) {
    const state = getPackageDecision(packageData.variantId);
    const activeMeta = getDecisionMeta(state.decision);
    const panel = createNode("section", "approval-package-block approval-decision-panel");
    const head = createNode("div", "approval-decision-head");
    head.append(createNode("h3", "", "Решение по пакету"), createNode("span", "", activeMeta.detail));

    const options = createNode("div", "approval-decision-options");
    DECISION_OPTIONS.forEach((option) => {
      const button = createNode("button", "approval-decision-button", option.label);
      button.type = "button";
      button.dataset.decision = option.id;
      button.classList.toggle("is-active", state.decision === option.id);
      button.addEventListener("click", () => {
        setPackageDecision(packageData.variantId, { decision: option.id });
        refreshApprovalOverview();
        renderPackages(currentDigitalShift);
      });
      options.appendChild(button);
    });

    const noteField = createNode("label", "approval-note-field");
    const note = createNode("textarea", "approval-note");
    note.value = state.note;
    note.placeholder = "Что изменить в темах, заданиях или visual prompt";
    note.addEventListener("input", () => {
      setPackageDecision(packageData.variantId, { note: note.value });
      refreshApprovalOverview();
    });
    noteField.append(createNode("span", "", "Заметка"), note);

    const actions = createNode("div", "approval-decision-actions");
    const copyButton = createNode("button", "button secondary", "Скопировать решение");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyApprovalDecision(packageData, copyButton));
    const resetButton = createNode("button", "button ghost", "Сбросить");
    resetButton.type = "button";
    resetButton.addEventListener("click", () => {
      resetPackageDecision(packageData.variantId);
      refreshApprovalOverview();
      renderPackages(currentDigitalShift);
    });
    actions.append(copyButton, resetButton);
    panel.append(head, options, noteField, actions);
    return panel;
  }

  function renderPreviewInspectionPanel(packageData) {
    const summary = getPackageInspectionSummary(packageData);
    const canInspect = getPackageDecision(packageData.variantId).decision === "approved_preview" && hasRpIntake(packageData.variantId);
    const panel = createNode("section", "approval-package-block approval-inspection-panel");
    const head = createNode("div", "approval-inspection-head");
    head.append(
      createNode("h3", "", "Журнал визуального осмотра preview"),
      createNode(
        "span",
        "",
        `${summary.accepted}/${summary.total} принято · ${summary.awaiting} ждёт · ${summary.needsRevision} правок · ${summary.rejected} отклонено`
      )
    );

    const gateNote = createNode(
      "p",
      "approval-inspection-gate",
      canInspect
        ? "Осмотрите preview-изображения после генерации и зафиксируйте решение по каждому planned asset."
        : "Осмотр активируется после РП/КТП и решения «На preview». До этого final assets заблокированы."
    );

    const grid = createNode("div", "approval-inspection-grid");
    (packageData.previewAssets || []).forEach((asset) => {
      const inspection = getAssetInspection(asset.id);
      const meta = getPreviewInspectionMeta(inspection.status);
      const card = createNode("article", "approval-inspection-card");
      card.dataset.status = inspection.status;
      card.append(
        createNode("span", "approval-inspection-status", meta.status),
        createNode("strong", "", asset.kind === "scene" ? "Общий вид цеха" : "Контрольная партия"),
        createNode("code", "", asset.targetPath),
        createNode("p", "", asset.visualPurpose || ""),
        renderList(asset.inspectionChecklist || [], "approval-inspection-checklist")
      );

      const options = createNode("div", "approval-inspection-options");
      PREVIEW_INSPECTION_OPTIONS.forEach((option) => {
        const button = createNode("button", "approval-inspection-button", option.label);
        button.type = "button";
        button.dataset.status = option.id;
        button.classList.toggle("is-active", inspection.status === option.id);
        button.disabled = !canInspect;
        button.addEventListener("click", () => {
          setAssetInspection(asset.id, { status: option.id });
          refreshApprovalOverview();
          renderPackages(currentDigitalShift);
        });
        options.appendChild(button);
      });

      const noteField = createNode("label", "approval-inspection-note-field");
      const note = createNode("textarea", "approval-inspection-note");
      note.value = inspection.note;
      note.disabled = !canInspect;
      note.placeholder = "Что принять, исправить или отклонить в preview-изображении";
      note.addEventListener("input", () => {
        setAssetInspection(asset.id, { note: note.value });
      });
      noteField.append(createNode("span", "", "Заметка осмотра"), note);

      const resetButton = createNode("button", "button ghost", "Сбросить осмотр");
      resetButton.type = "button";
      resetButton.disabled = !canInspect;
      resetButton.addEventListener("click", () => {
        resetAssetInspection(asset.id);
        refreshApprovalOverview();
        renderPackages(currentDigitalShift);
      });

      card.append(options, noteField, resetButton);
      grid.appendChild(card);
    });

    const copyButton = createNode("button", "button secondary", "Скопировать отчёт осмотра");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyPreviewInspectionReport(packageData, copyButton));
    panel.append(head, gateNote, grid, copyButton);
    return panel;
  }

  function renderPackage(packageData, familyMap, index) {
    const decision = getPackageDecision(packageData.variantId);
    const decisionMeta = getDecisionMeta(decision.decision);
    const section = createNode("article", "approval-package");
    section.id = `package-${packageData.variantId}`;
    section.dataset.decision = decisionMeta.id;

    const head = createNode("div", "approval-package-head");
    const titleWrap = createNode("div");
    titleWrap.append(createNode("p", "overline", `Пакет ${index + 1}`), createNode("h2", "", packageData.title));
    const status = createNode("div", "approval-status-pill", decisionMeta.status);
    status.dataset.decision = decisionMeta.id;
    head.append(titleWrap, status);

    const topics = createNode("section", "approval-package-block");
    topics.append(createNode("h3", "", "Темы РП для подтверждения"), renderList(packageData.rpTopics || [], "approval-topic-list"));

    const tasks = createNode("section", "approval-package-block");
    tasks.appendChild(createNode("h3", "", "Задания и современность"));
    const taskList = createNode("div", "approval-task-list");
    (packageData.tasks || []).forEach((task, taskIndex) => {
      const family = familyMap.get(task.familyId) || {};
      const row = createNode("article", "approval-task-row");
      row.dataset.family = task.familyId;
      row.append(
        createNode("span", "approval-task-index", String(taskIndex + 1).padStart(2, "0")),
        createNode("strong", "", task.title),
        createNode("small", "", family.title || task.familyTitle || task.familyId),
        createNode("p", "", family.modernity || "")
      );
      taskList.appendChild(row);
    });
    tasks.appendChild(taskList);

    const log = createNode("section", "approval-package-block");
    log.append(createNode("h3", "", "Производственный журнал"), renderList(packageData.productionLog || [], "approval-log-list"));

    const prompts = createNode("section", "approval-package-block");
    prompts.appendChild(createNode("h3", "", "Промпты preview-изображений"));
    const promptList = renderList(packageData.visualPrompts || [], "approval-prompt-list");
    const copyButton = createNode("button", "button secondary", "Копировать промпты");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyPromptPackage(packageData, copyButton));
    prompts.append(promptList, copyButton);

    const assetPlan = createNode("section", "approval-package-block");
    assetPlan.appendChild(createNode("h3", "", "Слоты preview-assets"));
    const assetGrid = createNode("div", "approval-asset-grid");
    (packageData.previewAssets || []).forEach((asset) => {
      const assetCard = createNode("article", "approval-asset-card");
      assetCard.dataset.status = asset.status || "awaiting_preview";
      assetCard.append(
        createNode("strong", "", asset.kind === "scene" ? "Общий вид цеха" : "Контрольная партия"),
        createNode("span", "approval-asset-path", asset.targetPath),
        createNode("small", "", asset.status === "awaiting_preview" ? "Ожидает preview" : asset.status),
        createNode("em", "approval-asset-purpose", asset.visualPurpose || ""),
        createNode("p", "", asset.negativePrompt || ""),
        renderList(
          (asset.styleReferences || []).map((reference) => `${reference.label}: ${reference.path}`),
          "approval-asset-reference-list"
        ),
        renderList(asset.inspectionChecklist || [], "approval-asset-checklist")
      );
      assetGrid.appendChild(assetCard);
    });
    assetPlan.appendChild(assetGrid);

    const criteria = createNode("section", "approval-package-block approval-criteria");
    criteria.append(
      createNode("h3", "", "Критерии согласования"),
      renderList(
        [
          "темы совпадают с РП или требуют правки формулировок;",
          "визуал показывает сырье и полуфабрикаты, а не готовые блюда;",
          "задача проверяет производственное решение, а не угадывание термина;",
          "после утверждения preview финальные assets сохраняются в public/assets/pm01/generated/..."
        ],
        "approval-checklist"
      )
    );

    section.append(
      head,
      renderApprovalGates(packageData),
      topics,
      renderRpIntake(packageData),
      renderMethodicalMatrix(packageData),
      renderShiftCockpit(packageData),
      tasks,
      log,
      prompts,
      assetPlan,
      renderPreviewInspectionPanel(packageData),
      renderDecisionControls(packageData),
      criteria
    );
    return section;
  }

  function renderPackages(digitalShift) {
    elements.packagesList.innerHTML = "";
    const familyMap = new Map((digitalShift.families || []).map((family) => [family.id, family]));
    (digitalShift.packages || []).forEach((packageData, index) => {
      elements.packagesList.appendChild(renderPackage(packageData, familyMap, index));
    });
  }

  async function init() {
    try {
      const response = await fetch("/api/pm01/public/exam", { headers: { Accept: "application/json" } });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const exam = unwrapExam(payload);
      const digitalShift = exam.digitalShift || {};
      if (!digitalShift.packages?.length) {
        throw new Error("Digital shift packages are missing");
      }
      currentExam = exam;
      currentDigitalShift = digitalShift;

      elements.version.textContent = exam.version || "PM01";
      elements.packages.textContent = `${digitalShift.packages.length} цехов`;
      elements.status.textContent = "готово";
      refreshApprovalOverview();
      renderFamilies(
        digitalShift.families || [],
        digitalShift.interactionBlueprints || [],
        digitalShift.normativeAnchors || [],
        digitalShift.visualAssetRubric || null
      );
      renderPackages(digitalShift);
    } catch (error) {
      elements.status.textContent = "ошибка";
      elements.packagesList.innerHTML = "";
      const message = createNode("div", "message", `Не удалось загрузить пакеты: ${error.message}`);
      elements.packagesList.appendChild(message);
    }
  }

  init();
})();
