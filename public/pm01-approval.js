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
  const PM01_FINAL_ASSET_INSPECTION_STORAGE_KEY = "pm01FinalAssetInspectionV1";
  const PM01_CONNECTION_REVIEW_STORAGE_KEY = "pm01ConnectionReviewV1";
  const PM01_COMPETENCY_REVIEW_STORAGE_KEY = "pm01CompetencyReviewV1";
  const PM01_INNOVATION_REVIEW_STORAGE_KEY = "pm01InnovationReviewV1";
  const PM01_ALL_SHOP_REVIEW_STORAGE_KEY = "pm01AllShopReviewV1";
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
  const FINAL_ASSET_INSPECTION_OPTIONS = [
    { id: "awaiting_final", label: "Ждёт final", status: "Ожидает final asset", detail: "Финальное изображение ещё не загружено или не осмотрено." },
    { id: "accepted_final", label: "Принять final", status: "Final принят", detail: "Изображение методически и визуально принято для отдельного connect-review." },
    { id: "needs_revision", label: "Правка", status: "Нужна правка", detail: "Нужно перегенерировать или исправить изображение до подключения." },
    { id: "rejected_final", label: "Отклонить", status: "Final отклонен", detail: "Нельзя подключать к экзамену; нужен новый final asset." }
  ];
  const CONNECTION_REVIEW_OPTIONS = [
    { id: "draft", label: "Черновик", status: "Ждёт connect-review", detail: "Финальные assets приняты, но решение о подключении ещё не зафиксировано." },
    { id: "approved_connection", label: "Разрешить", status: "Подключение согласовано", detail: "Можно готовить отдельный code change для подключения assets после проверки преподавателем." },
    { id: "needs_revision", label: "Правка", status: "Нужны правки", detail: "Перед подключением нужны изменения в final assets, темах, формулировках или методической привязке." },
    { id: "hold", label: "Пауза", status: "Пауза подключения", detail: "Подключение отложено до РП/КТП, комиссии или дополнительного решения преподавателя." }
  ];
  const COMPETENCY_REVIEW_ITEMS = [
    {
      id: "ok09",
      label: "ОК 09",
      title: "Цифровая документация смены",
      detail: "Проверяем, что РП/КТП поддерживает работу с цифровой документацией, журналами, маркировкой и производственными данными.",
      placeholder: "Где в РП/КТП отражены цифровые журналы, маркировка, производственная информация или работа с документацией"
    },
    {
      id: "ok10",
      label: "ОК 10",
      title: "Профессиональная коммуникация",
      detail: "Проверяем, что РП/КТП поддерживает профессиональную терминологию, коммуникацию на смене и при необходимости элементы иностранного языка.",
      placeholder: "Где в РП/КТП отражены профессиональная терминология, коммуникация, инструкции, заявки или иностранный язык"
    }
  ];
  const COMPETENCY_REVIEW_OPTIONS = [
    { id: "pending", label: "Ждёт РП", status: "Ждёт сверку", detail: "Сначала нужен фрагмент РП/КТП или подтверждённые темы цеха." },
    { id: "verified", label: "Подтверждено", status: "Подтверждено РП", detail: "Можно использовать как методическое основание для preview и финальных формулировок." },
    { id: "needs_revision", label: "Уточнить", status: "Нужна правка", detail: "Формулировку задания, компетенции или локальную тему нужно уточнить с преподавателем." },
    { id: "not_in_rp", label: "Нет в РП", status: "Нет в РП", detail: "Не подключать финальный контент по этой компетенции без отдельного методического решения." }
  ];
  const INNOVATION_REVIEW_OPTIONS = [
    { id: "pending", label: "Черновик", status: "Ждёт решения", detail: "Идея описана, но современность, реализация и уникальность ещё не согласованы." },
    { id: "approved", label: "Принято", status: "Принято", detail: "Можно использовать как согласованный интерактивный формат для preview workflow." },
    { id: "needs_revision", label: "Правка", status: "Нужна правка", detail: "Нужно уточнить визуальный сценарий, интерактив, оценивание или методическую формулировку." },
    { id: "deferred", label: "Отложить", status: "Отложено", detail: "Идея перспективная, но не идёт в ближайший preview/final пакет." }
  ];
  const ALL_SHOP_REVIEW_OPTIONS = [
    { id: "draft", label: "Черновик", status: "Пакет не отправлен", detail: "Сводный Markdown можно копировать и дополнять, но preview workflow ещё не согласован." },
    { id: "sent", label: "Отправлен", status: "На согласовании", detail: "Пакет передан пользователю или преподавателю; ждём решение по всем 5 цехам." },
    { id: "approved_preview", label: "На preview", status: "Сводно согласовано", detail: "Общий пакет согласован: можно готовить preview batch для цехов, у которых закрыты локальные gates." },
    { id: "needs_revision", label: "Правки", status: "Нужна общая правка", detail: "В пакете есть методические, визуальные или интерактивные правки до preview." },
    { id: "waiting_rp", label: "Ждём РП", status: "Отложено до РП/КТП", detail: "Общее решение не закрыто, пока не получены локальные РП/КТП и оценочные материалы." }
  ];
  const REQUIRED_PM01_COMPETENCIES = ["ПК 1.1", "ПК 1.2", "ПК 1.3", "ПК 1.4", "ОК 01", "ОК 02", "ОК 07", "ОК 09", "ОК 10"];
  const decisionOptionsById = new Map(DECISION_OPTIONS.map((option) => [option.id, option]));
  const previewInspectionOptionsById = new Map(PREVIEW_INSPECTION_OPTIONS.map((option) => [option.id, option]));
  const finalAssetInspectionOptionsById = new Map(FINAL_ASSET_INSPECTION_OPTIONS.map((option) => [option.id, option]));
  const connectionReviewOptionsById = new Map(CONNECTION_REVIEW_OPTIONS.map((option) => [option.id, option]));
  const competencyReviewOptionsById = new Map(COMPETENCY_REVIEW_OPTIONS.map((option) => [option.id, option]));
  const innovationReviewOptionsById = new Map(INNOVATION_REVIEW_OPTIONS.map((option) => [option.id, option]));
  const allShopReviewOptionsById = new Map(ALL_SHOP_REVIEW_OPTIONS.map((option) => [option.id, option]));
  let approvalState = loadApprovalState();
  let rpIntakeState = loadRpIntakeState();
  let previewInspectionState = loadPreviewInspectionState();
  let finalAssetInspectionState = loadFinalAssetInspectionState();
  let connectionReviewState = loadConnectionReviewState();
  let competencyReviewState = loadCompetencyReviewState();
  let innovationReviewState = loadInnovationReviewState();
  let allShopReviewState = loadAllShopReviewState();
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

  function loadFinalAssetInspectionState() {
    try {
      const stored = window.localStorage.getItem(PM01_FINAL_ASSET_INSPECTION_STORAGE_KEY);
      return stored ? JSON.parse(stored) || {} : {};
    } catch (_) {
      return {};
    }
  }

  function loadConnectionReviewState() {
    try {
      const stored = window.localStorage.getItem(PM01_CONNECTION_REVIEW_STORAGE_KEY);
      return stored ? JSON.parse(stored) || {} : {};
    } catch (_) {
      return {};
    }
  }

  function loadCompetencyReviewState() {
    try {
      const stored = window.localStorage.getItem(PM01_COMPETENCY_REVIEW_STORAGE_KEY);
      return stored ? JSON.parse(stored) || {} : {};
    } catch (_) {
      return {};
    }
  }

  function loadInnovationReviewState() {
    try {
      const stored = window.localStorage.getItem(PM01_INNOVATION_REVIEW_STORAGE_KEY);
      return stored ? JSON.parse(stored) || {} : {};
    } catch (_) {
      return {};
    }
  }

  function loadAllShopReviewState() {
    try {
      const stored = window.localStorage.getItem(PM01_ALL_SHOP_REVIEW_STORAGE_KEY);
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

  function persistFinalAssetInspectionState() {
    try {
      window.localStorage.setItem(PM01_FINAL_ASSET_INSPECTION_STORAGE_KEY, JSON.stringify(finalAssetInspectionState));
    } catch (_) {
      // Final asset inspection still works in-memory if browser storage is unavailable.
    }
  }

  function persistConnectionReviewState() {
    try {
      window.localStorage.setItem(PM01_CONNECTION_REVIEW_STORAGE_KEY, JSON.stringify(connectionReviewState));
    } catch (_) {
      // Connection review still works in-memory if browser storage is unavailable.
    }
  }

  function persistCompetencyReviewState() {
    try {
      window.localStorage.setItem(PM01_COMPETENCY_REVIEW_STORAGE_KEY, JSON.stringify(competencyReviewState));
    } catch (_) {
      // Competency review remains usable in-memory if browser storage is blocked.
    }
  }

  function persistInnovationReviewState() {
    try {
      window.localStorage.setItem(PM01_INNOVATION_REVIEW_STORAGE_KEY, JSON.stringify(innovationReviewState));
    } catch (_) {
      // Innovation review remains usable in-memory if browser storage is blocked.
    }
  }

  function persistAllShopReviewState() {
    try {
      window.localStorage.setItem(PM01_ALL_SHOP_REVIEW_STORAGE_KEY, JSON.stringify(allShopReviewState));
    } catch (_) {
      // The all-shop review remains usable in-memory if browser storage is blocked.
    }
  }

  function getDecisionMeta(decisionId) {
    return decisionOptionsById.get(decisionId) || DECISION_OPTIONS[0];
  }

  function getPreviewInspectionMeta(statusId) {
    return previewInspectionOptionsById.get(statusId) || PREVIEW_INSPECTION_OPTIONS[0];
  }

  function getFinalAssetInspectionMeta(statusId) {
    return finalAssetInspectionOptionsById.get(statusId) || FINAL_ASSET_INSPECTION_OPTIONS[0];
  }

  function getConnectionReviewMeta(statusId) {
    return connectionReviewOptionsById.get(statusId) || CONNECTION_REVIEW_OPTIONS[0];
  }

  function getCompetencyReviewMeta(statusId) {
    return competencyReviewOptionsById.get(statusId) || COMPETENCY_REVIEW_OPTIONS[0];
  }

  function getInnovationReviewMeta(statusId) {
    return innovationReviewOptionsById.get(statusId) || INNOVATION_REVIEW_OPTIONS[0];
  }

  function getAllShopReviewMeta(statusId) {
    return allShopReviewOptionsById.get(statusId) || ALL_SHOP_REVIEW_OPTIONS[0];
  }

  function getAllShopReview() {
    return {
      status: allShopReviewState.status || "draft",
      note: allShopReviewState.note || "",
      sentAt: allShopReviewState.sentAt || null,
      reviewedAt: allShopReviewState.reviewedAt || null,
      updatedAt: allShopReviewState.updatedAt || null
    };
  }

  function setAllShopReview(patch) {
    const current = getAllShopReview();
    const nextStatus = patch.status || current.status;
    const now = new Date().toISOString();
    allShopReviewState = {
      ...current,
      ...patch,
      sentAt: patch.sentAt || current.sentAt || (nextStatus !== "draft" ? now : null),
      reviewedAt:
        patch.reviewedAt ||
        current.reviewedAt ||
        (["approved_preview", "needs_revision", "waiting_rp"].includes(nextStatus) ? now : null),
      updatedAt: now
    };
    persistAllShopReviewState();
  }

  function resetAllShopReview() {
    allShopReviewState = {};
    persistAllShopReviewState();
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

  function getCompetencyReviewItem(variantId, itemId) {
    const packageState = competencyReviewState[variantId] || {};
    const stored = packageState[itemId] || {};
    return {
      status: stored.status || "pending",
      note: stored.note || "",
      updatedAt: stored.updatedAt || null
    };
  }

  function setCompetencyReviewItem(variantId, itemId, patch) {
    const packageState = competencyReviewState[variantId] || {};
    competencyReviewState[variantId] = {
      ...packageState,
      [itemId]: {
        ...getCompetencyReviewItem(variantId, itemId),
        ...patch,
        updatedAt: new Date().toISOString()
      }
    };
    persistCompetencyReviewState();
  }

  function resetPackageCompetencyReview(variantId) {
    delete competencyReviewState[variantId];
    persistCompetencyReviewState();
  }

  function getPackageCompetencyReviewSummary(packageData) {
    const statuses = COMPETENCY_REVIEW_ITEMS.map((item) => getCompetencyReviewItem(packageData.variantId, item.id).status);
    const summary = {
      total: COMPETENCY_REVIEW_ITEMS.length,
      verified: statuses.filter((status) => status === "verified").length,
      pending: statuses.filter((status) => status === "pending").length,
      needsRevision: statuses.filter((status) => status === "needs_revision").length,
      notInRp: statuses.filter((status) => status === "not_in_rp").length
    };
    return {
      ...summary,
      ready: summary.total > 0 && summary.verified === summary.total,
      blocked: summary.needsRevision > 0 || summary.notInRp > 0
    };
  }

  function getPackageInnovationFamilies(packageData) {
    return uniqueValues([
      ...(packageData.methodicalMatrix || []).map((row) => row.familyId),
      ...(packageData.tasks || []).map((task) => task.familyId),
      ...(packageData.shiftCockpit?.operationTimeline || []).map((step) => step.familyId)
    ]);
  }

  function getInnovationReviewItem(variantId, familyId) {
    const packageState = innovationReviewState[variantId] || {};
    const stored = packageState[familyId] || {};
    return {
      status: stored.status || "pending",
      note: stored.note || "",
      updatedAt: stored.updatedAt || null
    };
  }

  function setInnovationReviewItem(variantId, familyId, patch) {
    const packageState = innovationReviewState[variantId] || {};
    innovationReviewState[variantId] = {
      ...packageState,
      [familyId]: {
        ...getInnovationReviewItem(variantId, familyId),
        ...patch,
        updatedAt: new Date().toISOString()
      }
    };
    persistInnovationReviewState();
  }

  function resetPackageInnovationReview(variantId) {
    delete innovationReviewState[variantId];
    persistInnovationReviewState();
  }

  function getPackageInnovationReviewSummary(packageData) {
    const familyIds = getPackageInnovationFamilies(packageData);
    const statuses = familyIds.map((familyId) => getInnovationReviewItem(packageData.variantId, familyId).status);
    const summary = {
      total: familyIds.length,
      approved: statuses.filter((status) => status === "approved").length,
      pending: statuses.filter((status) => status === "pending").length,
      needsRevision: statuses.filter((status) => status === "needs_revision").length,
      deferred: statuses.filter((status) => status === "deferred").length
    };
    return {
      ...summary,
      ready: summary.total > 0 && summary.approved === summary.total,
      blocked: summary.needsRevision > 0,
      deferredOpen: summary.deferred > 0
    };
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

  function getFinalAssetInspection(assetId, asset = {}) {
    const stored = finalAssetInspectionState[assetId] || {};
    return {
      status: stored.status || "awaiting_final",
      note: stored.note || "",
      actualPath: stored.actualPath || asset.targetPath || "",
      updatedAt: stored.updatedAt || null
    };
  }

  function setFinalAssetInspection(assetId, patch) {
    finalAssetInspectionState[assetId] = {
      ...getFinalAssetInspection(assetId),
      ...patch,
      updatedAt: new Date().toISOString()
    };
    persistFinalAssetInspectionState();
  }

  function resetFinalAssetInspection(assetId) {
    delete finalAssetInspectionState[assetId];
    persistFinalAssetInspectionState();
  }

  function getPackageFinalAssetInspectionSummary(packageData) {
    const assets = packageData.previewAssets || [];
    const inspections = assets.map((asset) => getFinalAssetInspection(asset.id, asset));
    const statuses = inspections.map((inspection) => inspection.status);
    return {
      total: assets.length,
      accepted: statuses.filter((status) => status === "accepted_final").length,
      needsRevision: statuses.filter((status) => status === "needs_revision").length,
      rejected: statuses.filter((status) => status === "rejected_final").length,
      awaiting: statuses.filter((status) => status === "awaiting_final").length,
      withActualPath: inspections.filter((inspection) => inspection.actualPath.trim()).length
    };
  }

  function isPackageFinalAssetInspectionAccepted(packageData) {
    const summary = getPackageFinalAssetInspectionSummary(packageData);
    return summary.total > 0 && summary.accepted === summary.total && summary.withActualPath === summary.total;
  }

  function getPackageConnectionReview(variantId) {
    const stored = connectionReviewState[variantId] || {};
    return {
      status: stored.status || "draft",
      note: stored.note || "",
      approvedAt: stored.approvedAt || null,
      updatedAt: stored.updatedAt || null
    };
  }

  function setPackageConnectionReview(variantId, patch) {
    const current = getPackageConnectionReview(variantId);
    const nextStatus = patch.status || current.status;
    const now = new Date().toISOString();
    connectionReviewState[variantId] = {
      ...current,
      ...patch,
      status: nextStatus,
      approvedAt: nextStatus === "approved_connection" ? current.approvedAt || now : null,
      updatedAt: now
    };
    persistConnectionReviewState();
  }

  function resetPackageConnectionReview(variantId) {
    delete connectionReviewState[variantId];
    persistConnectionReviewState();
  }

  function isPackageConnectionApproved(packageData) {
    return getPackageConnectionReview(packageData.variantId).status === "approved_connection";
  }

  function getRpIntakeCount(packages) {
    return packages.filter((packageData) => hasRpIntake(packageData.variantId)).length;
  }

  function getCompetencyReviewCount(packages) {
    return packages.reduce(
      (totals, packageData) => {
        const summary = getPackageCompetencyReviewSummary(packageData);
        totals.total += summary.total;
        totals.verified += summary.verified;
        totals.pending += summary.pending;
        totals.needsRevision += summary.needsRevision;
        totals.notInRp += summary.notInRp;
        totals.readyPackages += summary.ready ? 1 : 0;
        return totals;
      },
      { total: 0, verified: 0, pending: 0, needsRevision: 0, notInRp: 0, readyPackages: 0 }
    );
  }

  function getInnovationReviewCount(packages) {
    return packages.reduce(
      (totals, packageData) => {
        const summary = getPackageInnovationReviewSummary(packageData);
        totals.total += summary.total;
        totals.approved += summary.approved;
        totals.pending += summary.pending;
        totals.needsRevision += summary.needsRevision;
        totals.deferred += summary.deferred;
        totals.readyPackages += summary.ready ? 1 : 0;
        return totals;
      },
      { total: 0, approved: 0, pending: 0, needsRevision: 0, deferred: 0, readyPackages: 0 }
    );
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
    const normativeAnchors = digitalShift.normativeAnchors || [];
    const allShopReview = getAllShopReview();
    const allShopReviewMeta = getAllShopReviewMeta(allShopReview.status);
    const allShopReviewApproved = allShopReview.status === "approved_preview";
    const allShopReviewBlocked = allShopReview.status === "needs_revision";
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
      const finalInspection = getPackageFinalAssetInspectionSummary(packageData);
      const finalAccepted = isPackageFinalAssetInspectionAccepted(packageData);
      const connectionReview = getPackageConnectionReview(packageData.variantId);
      const competencyReview = getPackageCompetencyReviewSummary(packageData);
      const innovationReview = getPackageInnovationReviewSummary(packageData);
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
        finalInspection,
        finalAccepted,
        connectionReview,
        connectionApproved: connectionReview.status === "approved_connection",
        competencyReview,
        innovationReview,
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
      competencyReviewVerified: packageAudits.reduce((sum, item) => sum + item.competencyReview.verified, 0),
      competencyReviewTotal: packageAudits.reduce((sum, item) => sum + item.competencyReview.total, 0),
      competencyReviewReady: packageAudits.filter((item) => item.competencyReview.ready).length,
      competencyReviewNeedsRevision: packageAudits.reduce((sum, item) => sum + item.competencyReview.needsRevision, 0),
      competencyReviewNotInRp: packageAudits.reduce((sum, item) => sum + item.competencyReview.notInRp, 0),
      innovationReviewApproved: packageAudits.reduce((sum, item) => sum + item.innovationReview.approved, 0),
      innovationReviewTotal: packageAudits.reduce((sum, item) => sum + item.innovationReview.total, 0),
      innovationReviewReady: packageAudits.filter((item) => item.innovationReview.ready).length,
      innovationReviewNeedsRevision: packageAudits.reduce((sum, item) => sum + item.innovationReview.needsRevision, 0),
      innovationReviewDeferred: packageAudits.reduce((sum, item) => sum + item.innovationReview.deferred, 0),
      previewReady: packageAudits.filter((item) => item.hasRp && item.decision === "approved_preview").length,
      previewReadyWithAllShopReview: allShopReviewApproved
        ? packageAudits.filter((item) => item.hasRp && item.decision === "approved_preview").length
        : 0,
      previewAccepted: packageAudits.filter((item) => item.previewAccepted).length,
      finalAssetsOpen: packageAudits.filter((item) => item.finalGateStatus === "pending").length,
      finalAssetInspectionAccepted: packageAudits.filter((item) => item.finalAccepted).length,
      finalAssetInspectionItemsAccepted: packageAudits.reduce((sum, item) => sum + item.finalInspection.accepted, 0),
      finalAssetInspectionItemsTotal: packageAudits.reduce((sum, item) => sum + item.finalInspection.total, 0),
      finalAssetInspectionNeedsRevision: packageAudits.reduce((sum, item) => sum + item.finalInspection.needsRevision, 0),
      finalAssetInspectionRejected: packageAudits.reduce((sum, item) => sum + item.finalInspection.rejected, 0),
      connectionReviewApproved: packageAudits.filter((item) => item.connectionApproved).length,
      connectionReviewNeedsRevision: packageAudits.filter((item) => item.connectionReview.status === "needs_revision").length,
      connectionReviewHold: packageAudits.filter((item) => item.connectionReview.status === "hold").length,
      allShopReview,
      allShopReviewStatus: allShopReview.status,
      allShopReviewLabel: allShopReviewMeta.status,
      allShopReviewDetail: allShopReviewMeta.detail,
      allShopReviewSent: Boolean(allShopReview.sentAt),
      allShopReviewApproved,
      allShopReviewBlocked,
      visualRubricStatus: digitalShift.visualAssetRubric?.status || "missing",
      normativeAnchors: normativeAnchors.length,
      normativeEvidenceRows: normativeAnchors.reduce((sum, anchor) => sum + (anchor.sourceEvidence || []).length, 0),
      normativeDossierReady: Boolean(
        digitalShift.normativeDossier?.verifiedAt &&
          normativeAnchors.length >= 4 &&
          normativeAnchors.every((anchor) => (anchor.sourceEvidence || []).length)
      )
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
    const finalInspectionSummary = getPackageFinalAssetInspectionSummary(packageData);
    const finalAccepted = isPackageFinalAssetInspectionAccepted(packageData);
    const connectionReview = getPackageConnectionReview(packageData.variantId);
    const connectionReviewMeta = getConnectionReviewMeta(connectionReview.status);
    const connectionApproved = connectionReview.status === "approved_connection";
    const connectionBlocked = connectionReview.status === "needs_revision" || connectionReview.status === "hold";
    const competencyReview = getPackageCompetencyReviewSummary(packageData);
    const competencyReviewReady = competencyReview.ready;
    const competencyReviewBlocked = competencyReview.blocked;
    const innovationReview = getPackageInnovationReviewSummary(packageData);
    const innovationReviewReady = innovationReview.ready;
    const innovationReviewBlocked = innovationReview.blocked;
    const allShopReview = getAllShopReview();
    const allShopReviewMeta = getAllShopReviewMeta(allShopReview.status);
    const allShopReviewApproved = allShopReview.status === "approved_preview";
    const allShopReviewBlocked = allShopReview.status === "needs_revision";
    const needsRevision = decision === "needs_revision";
    const waitingRp = decision === "waiting_rp";
    const finalAssetGateOpen =
      hasRp && competencyReviewReady && innovationReviewReady && allShopReviewApproved && previewApproved && previewAccepted;

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
        id: "competency_review",
        status: !hasRp ? "pending" : competencyReviewReady ? "done" : competencyReviewBlocked ? "blocked" : "pending",
        title: "ОК09/ОК10",
        detail: !hasRp
          ? "Сверка ОК09/ОК10 включится после фрагмента РП/КТП."
          : competencyReviewReady
            ? "ОК09 и ОК10 подтверждены по РП/КТП локально для этого цеха."
            : competencyReviewBlocked
              ? "Есть методическое расхождение: ОК09/ОК10 требуют уточнения или не найдены в РП."
              : "Подтвердите ОК09 и ОК10 по РП/КТП перед preview batch и final assets."
      },
      {
        id: "innovation_review",
        status: innovationReviewReady ? "done" : innovationReviewBlocked ? "blocked" : "pending",
        title: "Интерактив",
        detail: innovationReviewReady
          ? "Современность, визуальная логика, реализация и уникальность всех пяти интерактивных форматов согласованы."
          : innovationReviewBlocked
            ? "Есть интерактивные форматы, отправленные на правку перед preview/final workflow."
            : "Согласуйте, как выглядит и реализуется каждое современное задание, перед preview batch."
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
        id: "all_shop_review",
        status: allShopReviewApproved ? "done" : allShopReviewBlocked ? "blocked" : "pending",
        title: "Сводное согласование",
        detail: allShopReviewApproved
          ? "Сводный пакет 5 цехов согласован на preview; можно двигать локально готовые цеха в preview batch."
          : allShopReviewBlocked
            ? allShopReview.note.trim() || "Сводный пакет требует общей правки перед preview."
            : `${allShopReviewMeta.status}: ${allShopReviewMeta.detail}`
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
        status: finalAssetGateOpen ? "pending" : "blocked",
        title: "Финальные assets",
        detail: finalAssetGateOpen
          ? "Preview принят в журнале осмотра. Следующий gate: сгенерировать final files и снова проверить перед подключением."
          : hasRp && competencyReviewReady && innovationReviewReady && !allShopReviewApproved
            ? "Финальные картинки нельзя подключать, пока сводный пакет 5 цехов не согласован на preview."
          : hasRp && !innovationReviewReady
            ? "Финальные картинки нельзя подключать, пока интерактивные новшества не согласованы по визуалу, реализации и уникальности."
            : hasRp && !competencyReviewReady
            ? "Финальные картинки нельзя подключать, пока ОК09 и ОК10 не подтверждены по РП/КТП."
            : hasRp && previewApproved
            ? "Финальные картинки нельзя подключать, пока preview-assets не приняты в журнале визуального осмотра."
            : "Финальные картинки нельзя подключать без РП/КТП и утверждённого preview."
      },
      {
        id: "final_visual_inspection",
        status: !finalAssetGateOpen ? "blocked" : finalAccepted ? "done" : "pending",
        title: "Повторный осмотр final assets",
        detail: !finalAssetGateOpen
          ? "Сначала нужен открытый final-assets gate и сгенерированные final files."
          : finalAccepted
            ? "Все final assets цеха приняты в журнале повторного визуального осмотра."
            : `Ожидается повторный осмотр final assets: принято ${finalInspectionSummary.accepted}/${finalInspectionSummary.total}, ждёт ${finalInspectionSummary.awaiting}, правок ${finalInspectionSummary.needsRevision}, отклонено ${finalInspectionSummary.rejected}.`
      },
      {
        id: "connection_review",
        status: !finalAccepted ? "blocked" : connectionApproved ? "done" : connectionBlocked ? "blocked" : "pending",
        title: "Отдельное решение о подключении",
        detail: !finalAccepted
          ? "Подключение к экзамену закрыто до принятого повторного visual inspection по всем final assets."
          : connectionApproved
            ? "Connect-review согласован. Можно готовить отдельный code change для подключения; автоподключение всё равно запрещено."
            : connectionBlocked
              ? `${connectionReviewMeta.status}: ${connectionReview.note.trim() || connectionReviewMeta.detail}`
              : `${connectionReviewMeta.status}: ${connectionReviewMeta.detail}`
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
    const competencyReviewCount = getCompetencyReviewCount(packages);
    const innovationReviewCount = getInnovationReviewCount(packages);
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
      [
        "Нормативы",
        `${coverageAudit.normativeAnchors} источника · ${coverageAudit.normativeEvidenceRows} доказательств`,
        coverageAudit.normativeDossierReady
          ? "ФГОС/ПОП изучены, граница РП зафиксирована."
          : "Нужно дополнить source evidence перед финальной методической правкой."
      ],
      ["Версия", exam.version || exam.appVersion || "PM01", "Текущий опубликованный пакет."]
    ].forEach(([label, value, detail]) => {
      const card = createNode("article", "approval-summary-card");
      card.append(createNode("span", "", label), createNode("strong", "", value), createNode("p", "", detail));
      elements.summary.appendChild(card);
    });
    const competencySummaryCard = createNode("article", "approval-summary-card");
    competencySummaryCard.append(
      createNode("span", "", "ОК09/ОК10"),
      createNode("strong", "", `${competencyReviewCount.verified}/${competencyReviewCount.total} подтверждено`),
      createNode("p", "", `${competencyReviewCount.readyPackages}/${packages.length} цехов закрыли сверку по РП/КТП.`)
    );
    elements.summary.appendChild(competencySummaryCard);
    const innovationSummaryCard = createNode("article", "approval-summary-card");
    innovationSummaryCard.append(
      createNode("span", "", "Интерактив"),
      createNode("strong", "", `${innovationReviewCount.approved}/${innovationReviewCount.total} принято`),
      createNode("p", "", `${innovationReviewCount.readyPackages}/${packages.length} цехов согласовали современность, реализацию и уникальность.`)
    );
    elements.summary.appendChild(innovationSummaryCard);
    const finalInspectionSummaryCard = createNode("article", "approval-summary-card");
    finalInspectionSummaryCard.append(
      createNode("span", "", "Final inspection"),
      createNode("strong", "", `${coverageAudit.finalAssetInspectionAccepted}/${packages.length} цехов`),
      createNode("p", "", `${coverageAudit.finalAssetInspectionItemsAccepted}/${coverageAudit.finalAssetInspectionItemsTotal} final assets приняты; автоподключение закрыто до connect-review.`)
    );
    elements.summary.appendChild(finalInspectionSummaryCard);
    const connectionReviewSummaryCard = createNode("article", "approval-summary-card");
    connectionReviewSummaryCard.append(
      createNode("span", "", "Connect-review"),
      createNode("strong", "", `${coverageAudit.connectionReviewApproved}/${packages.length} согласовано`),
      createNode("p", "", `${coverageAudit.connectionReviewNeedsRevision} правок · ${coverageAudit.connectionReviewHold} на паузе. Подключение только отдельным изменением кода.`)
    );
    elements.summary.appendChild(connectionReviewSummaryCard);
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

    const competencyReview = getPackageCompetencyReviewSummary(packageData);
    if (competencyReview.blocked) {
      return {
        status: "blocked",
        label: "ОК",
        title: "Уточнить ОК09/ОК10",
        detail: "В сверке есть статус «Уточнить» или «Нет в РП». Перед preview/final нужно закрыть методическое расхождение.",
        decisionStatus: decisionMeta.status
      };
    }

    if (!competencyReview.ready) {
      return {
        status: "pending",
        label: "ОК",
        title: "Сверить ОК09/ОК10",
        detail: "РП/КТП уже добавлена локально. Подтвердите ОК09 и ОК10 для этого цеха, затем выбирайте preview или фиксируйте правки.",
        decisionStatus: decisionMeta.status
      };
    }

    const innovationReview = getPackageInnovationReviewSummary(packageData);
    if (innovationReview.blocked) {
      return {
        status: "blocked",
        label: "Интерактив",
        title: "Уточнить интерактивные новшества",
        detail: "Один или несколько форматов отправлены на правку. Уточните визуал, механику, анимацию, оценивание или методическую уникальность.",
        decisionStatus: decisionMeta.status
      };
    }

    if (!innovationReview.ready) {
      return {
        status: "pending",
        label: "Интерактив",
        title: "Согласовать интерактив",
        detail: "Подтвердите, как выглядят и реализуются современные задания по пяти семействам, прежде чем выпускать preview batch.",
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
      const allShopReview = getAllShopReview();
      const allShopReviewMeta = getAllShopReviewMeta(allShopReview.status);
      if (allShopReview.status !== "approved_preview") {
        return {
          status: allShopReview.status === "needs_revision" ? "blocked" : "pending",
          label: "Сводный gate",
          title: allShopReview.status === "needs_revision" ? "Внести общие правки" : "Согласовать сводный пакет 5 цехов",
          detail:
            allShopReview.status === "needs_revision"
              ? allShopReview.note.trim() || "Сводный пакет отправлен на правку. Preview batch закрыт до повторного согласования."
              : `${allShopReviewMeta.status}. Сначала зафиксируйте общее решение по сводному пакету, затем выпускайте preview batch.`,
          decisionStatus: decisionMeta.status
        };
      }
      if (isPackagePreviewInspectionAccepted(packageData)) {
        if (isPackageFinalAssetInspectionAccepted(packageData)) {
          const connectionReview = getPackageConnectionReview(packageData.variantId);
          const connectionMeta = getConnectionReviewMeta(connectionReview.status);
          if (connectionReview.status === "approved_connection") {
            return {
              status: "ready",
              label: "Connect OK",
              title: "Подключение согласовано",
              detail: "Connect-review разрешён. Следующий шаг - отдельный code change с проверкой, без автоматического подключения из approval board.",
              decisionStatus: decisionMeta.status
            };
          }
          if (connectionReview.status === "needs_revision" || connectionReview.status === "hold") {
            return {
              status: connectionReview.status === "needs_revision" ? "blocked" : "pending",
              label: "Connect",
              title: connectionMeta.status,
              detail: connectionReview.note.trim() || connectionMeta.detail,
              decisionStatus: decisionMeta.status
            };
          }
          return {
            status: "pending",
            label: "Connect",
            title: "Согласовать подключение final assets",
            detail: "Все final assets приняты повторным визуальным осмотром. Следующий шаг - отдельный connect-review; автоподключение запрещено.",
            decisionStatus: decisionMeta.status
          };
        }
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
    const allShopReview = getAllShopReview();
    const allShopReviewMeta = getAllShopReviewMeta(allShopReview.status);
    return [
      "PM01 PX action plan",
      `generatedAt: ${new Date().toISOString()}`,
      `packages: ${packages.length}`,
      `allShopReview: ${allShopReview.status} (${allShopReviewMeta.status})`,
      `allShopReviewNote: ${allShopReview.note || "-"}`,
      "",
      ...packages.map((packageData, index) => {
        const action = getPackageNextAction(packageData);
        const decision = getPackageDecision(packageData.variantId);
        const gateSummary = getPackageGateSummary(packageData);
        const competencyReview = getPackageCompetencyReviewSummary(packageData);
        const innovationReview = getPackageInnovationReviewSummary(packageData);
        return [
          `${index + 1}. ${packageData.title}`,
          `variantId: ${packageData.variantId}`,
          `nextAction: ${action.title}`,
          `actionStatus: ${action.status}`,
          `detail: ${action.detail}`,
          `decision: ${decision.decision}`,
          `rpIntake: ${hasRpIntake(packageData.variantId) ? "present" : "missing"}`,
          `competencyReview: ${competencyReview.verified}/${competencyReview.total}`,
          `competencyReviewBlocked: ${competencyReview.blocked}`,
          `innovationReview: ${innovationReview.approved}/${innovationReview.total}`,
          `innovationReviewBlocked: ${innovationReview.blocked}`,
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
      `normativeEvidenceRows: ${audit.normativeEvidenceRows}`,
      `normativeDossierReady: ${audit.normativeDossierReady}`,
      `visualRubricStatus: ${audit.visualRubricStatus}`,
      `competenciesCovered: ${audit.coveredCompetencies}/${audit.competencyCoverage.length}`,
      `rpIntake: ${audit.rpReady}/${audit.packages.length}`,
      `competencyReviewVerified: ${audit.competencyReviewVerified}/${audit.competencyReviewTotal}`,
      `competencyReviewReady: ${audit.competencyReviewReady}/${audit.packages.length}`,
      `competencyReviewNeedsRevision: ${audit.competencyReviewNeedsRevision}`,
      `competencyReviewNotInRp: ${audit.competencyReviewNotInRp}`,
      `innovationReviewApproved: ${audit.innovationReviewApproved}/${audit.innovationReviewTotal}`,
      `innovationReviewReady: ${audit.innovationReviewReady}/${audit.packages.length}`,
      `innovationReviewNeedsRevision: ${audit.innovationReviewNeedsRevision}`,
      `innovationReviewDeferred: ${audit.innovationReviewDeferred}`,
      `previewDecision: ${audit.previewReady}/${audit.packages.length}`,
      `allShopReviewStatus: ${audit.allShopReviewStatus}`,
      `allShopReviewLabel: ${audit.allShopReviewLabel}`,
      `allShopReviewSentAt: ${audit.allShopReview.sentAt || "-"}`,
      `allShopReviewReviewedAt: ${audit.allShopReview.reviewedAt || "-"}`,
      `previewReadyAfterAllShopReview: ${audit.previewReadyWithAllShopReview}/${audit.packages.length}`,
      `previewInspectionAccepted: ${audit.previewAccepted}/${audit.packages.length}`,
      `finalAssetGateOpen: ${audit.finalAssetsOpen}/${audit.packages.length}`,
      `finalAssetInspectionAccepted: ${audit.finalAssetInspectionAccepted}/${audit.packages.length}`,
      `finalAssetInspectionItems: ${audit.finalAssetInspectionItemsAccepted}/${audit.finalAssetInspectionItemsTotal}`,
      `finalAssetInspectionNeedsRevision: ${audit.finalAssetInspectionNeedsRevision}`,
      `finalAssetInspectionRejected: ${audit.finalAssetInspectionRejected}`,
      `connectionReviewApproved: ${audit.connectionReviewApproved}/${audit.packages.length}`,
      `connectionReviewNeedsRevision: ${audit.connectionReviewNeedsRevision}`,
      `connectionReviewHold: ${audit.connectionReviewHold}`,
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
          `  competencyReview: ${item.competencyReview.verified}/${item.competencyReview.total}`,
          `  competencyNeedsRevision: ${item.competencyReview.needsRevision}`,
          `  competencyNotInRp: ${item.competencyReview.notInRp}`,
          `  competencyPending: ${item.competencyReview.pending}`,
          `  innovationReview: ${item.innovationReview.approved}/${item.innovationReview.total}`,
          `  innovationNeedsRevision: ${item.innovationReview.needsRevision}`,
          `  innovationDeferred: ${item.innovationReview.deferred}`,
          `  innovationPending: ${item.innovationReview.pending}`,
          `  previewDecision: ${item.decision}`,
          `  previewAccepted: ${item.previewAccepted}`,
          `  finalAssetsGate: ${item.finalGateStatus}`,
          `  finalAssetInspection: ${item.finalInspection.accepted}/${item.finalInspection.total}`,
          `  finalAssetsAccepted: ${item.finalAccepted}`,
          `  connectionReview: ${item.connectionReview.status}`,
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

  function buildRpRequestKitText(digitalShift) {
    const packages = digitalShift.packages || [];
    const audit = buildCoverageAudit(digitalShift);
    return [
      "# PM01 PX. Запрос РП/КТП для методической финализации",
      "",
      `generatedAt: ${new Date().toISOString()}`,
      `appVersion: ${currentExam?.version || currentExam?.appVersion || "PM01"}`,
      `officialContract: ${digitalShift.contract || "100 баллов / 20 заданий / 5 вариантов"}`,
      "scope: темы, задания и визуалы PM01 PX согласуются до генерации final assets",
      "",
      "## Что нужно прислать",
      "",
      "- фрагменты рабочей программы ПМ.01/МДК 01.01/МДК 01.02 по каждому цеху;",
      "- календарно-тематический план или список тем с часами и контрольными точками;",
      "- локальные оценочные материалы, если формулировки отличаются от текущего банка PM01;",
      "- уточнение, где в РП/КТП проходят ОК 09 и ОК 10 для цифровой документации, коммуникации и профессиональной терминологии;",
      "- запреты или локальные требования к изображениям, если они есть у преподавателя или комиссии.",
      "",
      "## Почему это нужно до переписывания",
      "",
      "Без РП/КТП мы не меняем официальные темы и не подключаем финальные изображения. До согласования PX остается training-only, maxScore: 0, без влияния на ведомости.",
      "",
      "## Текущее состояние",
      "",
      `- packages: ${packages.length}/5`,
      `- methodicalMatrix: ${audit.matrixRows}/${audit.expectedMatrixRows}`,
      `- previewSlots: ${audit.previewAssets}/${audit.expectedPreviewAssets}`,
      `- normativeDossier: ${audit.normativeDossierReady ? "ready" : "needs_source_evidence"} (${audit.normativeAnchors} sources, ${audit.normativeEvidenceRows} evidence rows)`,
      `- rpIntake: ${audit.rpReady}/${packages.length}`,
      `- ok09Ok10Review: ${audit.competencyReviewVerified}/${audit.competencyReviewTotal}`,
      `- innovationReview: ${audit.innovationReviewApproved}/${audit.innovationReviewTotal}`,
      `- previewDecision: ${audit.previewReady}/${packages.length}`,
      `- previewInspectionAccepted: ${audit.previewAccepted}/${packages.length}`,
      `- finalAssetGateOpen: ${audit.finalAssetsOpen}/${packages.length}`,
      `- finalAssetInspectionAccepted: ${audit.finalAssetInspectionAccepted}/${packages.length}`,
      `- finalAssetInspectionItems: ${audit.finalAssetInspectionItemsAccepted}/${audit.finalAssetInspectionItemsTotal}`,
      `- connectionReviewApproved: ${audit.connectionReviewApproved}/${packages.length}`,
      "",
      "## Нормативная граница",
      "",
      digitalShift.normativeDossier?.methodicalBoundary ||
        "ФГОС задает рамку компетенций, но финальные темы и формулировки нужно брать из РП/КТП.",
      "",
      "Что уже допустимо как training-only модернизация:",
      ...((digitalShift.normativeDossier?.allowedModernization || []).map((item) => `- ${item}`)),
      "",
      "Что заблокировано до РП/КТП:",
      ...((digitalShift.normativeDossier?.blockedUntilRp || []).map((item) => `- ${item}`)),
      "",
      "## ПК/ОК для сверки",
      "",
      ...audit.competencyCoverage.map((item) => `- ${item.competency}: ${item.covered ? "есть в черновой матрице" : "подтвердить по РП/КТП"}`),
      "",
      "## По цехам",
      "",
      ...packages.map((packageData, index) => {
        const intake = getPackageRpIntake(packageData.variantId);
        const packageAudit = audit.packageAudits.find((item) => item.packageData.variantId === packageData.variantId);
        const competencyReview = getPackageCompetencyReviewSummary(packageData);
        const innovationReview = getPackageInnovationReviewSummary(packageData);
        return [
          `### ${index + 1}. ${packageData.title}`,
          "",
          `variantId: ${packageData.variantId}`,
          `rpIntake: ${hasRpIntake(packageData.variantId) ? "есть локально" : "нужен фрагмент РП/КТП"}`,
          `confirmedTopicsLocal: ${intake.confirmedTopics || "-"}`,
          `competenciesDraft: ${(packageAudit?.competencies || []).join(", ") || "-"}`,
          `ok09Ok10Review: ${competencyReview.verified}/${competencyReview.total}`,
          `innovationReview: ${innovationReview.approved}/${innovationReview.total}`,
          "",
          "Текущие темы для подтверждения:",
          ...(packageData.rpTopics || []).map((topic) => `- ${topic}`),
          "",
          "Строки матрицы, которые нужно подтвердить или уточнить:",
          ...((packageData.methodicalMatrix || []).map((row, rowIndex) =>
            [
              `- ${rowIndex + 1}. ${row.rpTopic}`,
              `  family: ${row.familyId}`,
              `  competencies: ${(row.competencies || []).join(", ")}`,
              `  newFormat: ${row.newFormat}`,
              `  criterion: ${row.checkCriterion}`
            ].join("\n")
          )),
          "",
          "Просим уточнить:",
          "- совпадают ли темы с вашей РП/КТП;",
          "- какую локальную формулировку темы нужно использовать в экзамене;",
          "- нужно ли добавить ОК 09/ОК 10 в строки этого цеха;",
          "- какие изображения или формулировки методически недопустимы."
        ].join("\n");
      })
    ].join("\n");
  }

  function getRpRequestKitFileName() {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return `pm01-px-rp-ktp-request-${stamp}.md`;
  }

  async function copyRpRequestKit(digitalShift, button) {
    try {
      await navigator.clipboard.writeText(buildRpRequestKitText(digitalShift));
      button.textContent = "Запрос скопирован";
      window.setTimeout(() => {
        button.textContent = "Скопировать запрос";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать запрос";
      }, 1600);
    }
  }

  function downloadRpRequestKit(digitalShift, button) {
    try {
      downloadTextFile(getRpRequestKitFileName(), buildRpRequestKitText(digitalShift), "text/markdown");
      button.textContent = "Запрос скачан";
      window.setTimeout(() => {
        button.textContent = "Скачать .md";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скачать";
      window.setTimeout(() => {
        button.textContent = "Скачать .md";
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
        previewInspection: PM01_PREVIEW_INSPECTION_STORAGE_KEY,
        finalAssetInspection: PM01_FINAL_ASSET_INSPECTION_STORAGE_KEY,
        connectionReview: PM01_CONNECTION_REVIEW_STORAGE_KEY,
        competencyReview: PM01_COMPETENCY_REVIEW_STORAGE_KEY,
        innovationReview: PM01_INNOVATION_REVIEW_STORAGE_KEY,
        allShopReview: PM01_ALL_SHOP_REVIEW_STORAGE_KEY
      },
      state: {
        approvalDecisions: approvalState,
        rpIntake: rpIntakeState,
        previewInspection: previewInspectionState,
        finalAssetInspection: finalAssetInspectionState,
        connectionReview: connectionReviewState,
        competencyReview: competencyReviewState,
        innovationReview: innovationReviewState,
        allShopReview: allShopReviewState
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
    if (
      !isPlainObject(state.approvalDecisions) ||
      !isPlainObject(state.rpIntake) ||
      !isPlainObject(state.previewInspection) ||
      (state.finalAssetInspection !== undefined && !isPlainObject(state.finalAssetInspection)) ||
      (state.connectionReview !== undefined && !isPlainObject(state.connectionReview)) ||
      (state.competencyReview !== undefined && !isPlainObject(state.competencyReview)) ||
      (state.innovationReview !== undefined && !isPlainObject(state.innovationReview)) ||
      (state.allShopReview !== undefined && !isPlainObject(state.allShopReview))
    ) {
      throw new Error("Snapshot не содержит полный набор local-state данных.");
    }
    approvalState = state.approvalDecisions;
    rpIntakeState = state.rpIntake;
    previewInspectionState = state.previewInspection;
    finalAssetInspectionState = state.finalAssetInspection || {};
    connectionReviewState = state.connectionReview || {};
    competencyReviewState = state.competencyReview || {};
    innovationReviewState = state.innovationReview || {};
    allShopReviewState = state.allShopReview || {};
    persistApprovalState();
    persistRpIntakeState();
    persistPreviewInspectionState();
    persistFinalAssetInspectionState();
    persistConnectionReviewState();
    persistCompetencyReviewState();
    persistInnovationReviewState();
    persistAllShopReviewState();
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

  function isPackageReadyForFinalAssets(packageData) {
    const finalGate = getPackageGateRows(packageData).find((gate) => gate.id === "final_assets");
    return finalGate?.status === "pending" && !isPackageFinalAssetInspectionAccepted(packageData);
  }

  function getFinalAssetBatchItems(digitalShift) {
    return (digitalShift.packages || []).filter(isPackageReadyForFinalAssets);
  }

  function getPackageApprovedConnectionAssets(packageData) {
    return (packageData.previewAssets || [])
      .map((asset) => ({
        asset,
        finalInspection: getFinalAssetInspection(asset.id, asset)
      }))
      .filter(({ finalInspection }) => finalInspection.status === "accepted_final" && finalInspection.actualPath.trim());
  }

  function getConnectionImplementationPackages(digitalShift) {
    return (digitalShift.packages || []).filter(
      (packageData) => isPackageConnectionApproved(packageData) && getPackageApprovedConnectionAssets(packageData).length > 0
    );
  }

  function buildPreviewBatchText(digitalShift) {
    const readyPackages = getPreviewBatchItems(digitalShift);
    const assetCount = readyPackages.reduce((sum, packageData) => sum + (packageData.previewAssets || []).length, 0);
    const allShopReview = getAllShopReview();
    const allShopReviewMeta = getAllShopReviewMeta(allShopReview.status);
    return [
      "PM01 PX preview generation batch",
      `generatedAt: ${new Date().toISOString()}`,
      "scope: approved-preview packages only",
      "outputUse: preview_only_until_teacher_approval",
      "inspectionGate: visual_inspection_before_connection",
      "finalAsset: false",
      `allShopReview: ${allShopReview.status} (${allShopReviewMeta.status})`,
      `allShopReviewNote: ${allShopReview.note || "-"}`,
      `readyPackages: ${readyPackages.length}/${(digitalShift.packages || []).length}`,
      `plannedPreviewAssets: ${assetCount}`,
      "",
      ...(readyPackages.length
        ? readyPackages.map((packageData, packageIndex) => {
            const decision = getPackageDecision(packageData.variantId);
            const intake = getPackageRpIntake(packageData.variantId);
            const innovationReview = getPackageInnovationReviewSummary(packageData);
            return [
              `## ${packageIndex + 1}. ${packageData.title}`,
              `variantId: ${packageData.variantId}`,
              `teacherDecision: ${decision.decision}`,
              `teacherNote: ${decision.note || "-"}`,
              `innovationReview: ${innovationReview.approved}/${innovationReview.total}`,
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

  function getPreviewBatchFileName() {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return `pm01-px-preview-batch-${stamp}.md`;
  }

  function downloadPreviewBatch(digitalShift, button) {
    try {
      downloadTextFile(getPreviewBatchFileName(), buildPreviewBatchText(digitalShift), "text/markdown");
      button.textContent = "Preview batch скачан";
      window.setTimeout(() => {
        button.textContent = "Скачать .md";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скачать";
      window.setTimeout(() => {
        button.textContent = "Скачать .md";
      }, 1600);
    }
  }

  function buildFinalAssetBatchText(digitalShift) {
    const readyPackages = getFinalAssetBatchItems(digitalShift);
    const assetCount = readyPackages.reduce((sum, packageData) => sum + (packageData.previewAssets || []).length, 0);
    const allShopReview = getAllShopReview();
    const allShopReviewMeta = getAllShopReviewMeta(allShopReview.status);
    return [
      "PM01 PX final asset generation batch",
      `generatedAt: ${new Date().toISOString()}`,
      "scope: accepted-preview packages only",
      "sourceGate: final_assets pending",
      "finalAssetRequested: true",
      "connectAutomatically: false",
      "connectAfter: repeated_visual_inspection_and_teacher_acceptance",
      `allShopReview: ${allShopReview.status} (${allShopReviewMeta.status})`,
      `allShopReviewNote: ${allShopReview.note || "-"}`,
      `readyPackages: ${readyPackages.length}/${(digitalShift.packages || []).length}`,
      `plannedFinalAssets: ${assetCount}`,
      "",
      ...(readyPackages.length
        ? readyPackages.map((packageData, packageIndex) => {
            const decision = getPackageDecision(packageData.variantId);
            const intake = getPackageRpIntake(packageData.variantId);
            const inspectionSummary = getPackageInspectionSummary(packageData);
            return [
              `## ${packageIndex + 1}. ${packageData.title}`,
              `variantId: ${packageData.variantId}`,
              `teacherDecision: ${decision.decision}`,
              `teacherNote: ${decision.note || "-"}`,
              `previewInspection: ${inspectionSummary.accepted}/${inspectionSummary.total} accepted`,
              "rpContext:",
              `  excerpt: ${intake.excerpt || "-"}`,
              `  confirmedTopics: ${intake.confirmedTopics || "-"}`,
              "",
              "finalAssets:",
              ...(packageData.previewAssets || []).map((asset, assetIndex) => {
                const inspection = getAssetInspection(asset.id);
                return [
                  `- asset: ${asset.id || `${packageData.variantId}-final-${assetIndex + 1}`}`,
                  `  finalTargetPath: ${asset.targetPath}`,
                  `  acceptedPreviewStatus: ${inspection.status}`,
                  `  acceptedPreviewNote: ${inspection.note || "-"}`,
                  `  visualPurpose: ${asset.visualPurpose || "-"}`,
                  `  prompt: ${asset.prompt}`,
                  `  negativePrompt: ${asset.negativePrompt}`,
                  "  styleReferences:",
                  ...(asset.styleReferences || []).map((reference) => `    - ${reference.label}: ${reference.path}`),
                  "  inspectionChecklist:",
                  ...(asset.inspectionChecklist || []).map((item) => `    - ${item}`),
                  "  finalAssetRequested: true",
                  "  connectAutomatically: false",
                  "  connectAfter: repeated_visual_inspection_and_teacher_acceptance"
                ].join("\n");
              })
            ].join("\n");
          })
        : ["No packages are ready for final asset generation yet."])
    ].join("\n\n");
  }

  async function copyFinalAssetBatch(digitalShift, button) {
    try {
      await navigator.clipboard.writeText(buildFinalAssetBatchText(digitalShift));
      button.textContent = "Final batch скопирован";
      window.setTimeout(() => {
        button.textContent = "Скопировать final batch";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать final batch";
      }, 1600);
    }
  }

  function getFinalAssetBatchFileName() {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return `pm01-px-final-asset-batch-${stamp}.md`;
  }

  function downloadFinalAssetBatch(digitalShift, button) {
    try {
      downloadTextFile(getFinalAssetBatchFileName(), buildFinalAssetBatchText(digitalShift), "text/markdown");
      button.textContent = "Final batch скачан";
      window.setTimeout(() => {
        button.textContent = "Скачать .md";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скачать";
      window.setTimeout(() => {
        button.textContent = "Скачать .md";
      }, 1600);
    }
  }

  function buildConnectionImplementationText(digitalShift) {
    const packages = getConnectionImplementationPackages(digitalShift);
    const allPackages = digitalShift.packages || [];
    const approvedAssets = packages.reduce((sum, packageData) => sum + getPackageApprovedConnectionAssets(packageData).length, 0);
    return [
      "PM01 PX connection implementation package",
      `generatedAt: ${new Date().toISOString()}`,
      "scope: approved_connection packages with accepted final assets only",
      `approvedConnectionPackages: ${packages.length}/${allPackages.length}`,
      `approvedAssets: ${approvedAssets}`,
      "publicExamChanged: false",
      "manualCodeChangeRequired: true",
      "connectAutomatically: false",
      "requiresBeforeCodeChange: file_exists_visual_reinspection_teacher_acceptance",
      "containsAnswerKeys: false",
      "",
      ...(packages.length
        ? packages.map((packageData, packageIndex) => {
            const review = getPackageConnectionReview(packageData.variantId);
            const finalSummary = getPackageFinalAssetInspectionSummary(packageData);
            const approvedConnectionAssets = getPackageApprovedConnectionAssets(packageData);
            return [
              `## ${packageIndex + 1}. ${packageData.title}`,
              `variantId: ${packageData.variantId}`,
              `connectionReviewStatus: ${review.status}`,
              `connectionReviewApprovedAt: ${review.approvedAt || "-"}`,
              `connectionReviewUpdatedAt: ${review.updatedAt || "not_saved"}`,
              `connectionReviewNote: ${review.note || "-"}`,
              `finalInspectionAccepted: ${finalSummary.accepted}/${finalSummary.total}`,
              `approvedAssets: ${approvedConnectionAssets.length}`,
              "publicExamChanged: false",
              "manualCodeChangeRequired: true",
              "",
              "assets:",
              ...approvedConnectionAssets.map(({ asset, finalInspection }) =>
                [
                  `- asset: ${asset.id}`,
                  `  plannedTargetPath: ${asset.targetPath}`,
                  `  finalActualPath: ${finalInspection.actualPath.trim()}`,
                  `  suggestedRepoTargetPath: ${finalInspection.actualPath.trim()}`,
                  `  visualPurpose: ${asset.visualPurpose || "-"}`,
                  `  finalInspectionNote: ${finalInspection.note || "-"}`,
                  "  inspectionChecklist:",
                  ...(asset.inspectionChecklist || []).map((item) => `    - ${item}`),
                  "  implementationChecklist:",
                  "    - verify_file_exists_at_finalActualPath",
                  "    - visually_reinspect_against_pm01_rubric",
                  "    - confirm_teacher_acceptance_before_mapping",
                  "    - update_exam_mapping_only_in_a_separate_code_change",
                  "    - run_pm01_tests_build_and_verify",
                  "  publicExamChanged: false",
                  "  connectAutomatically: false"
                ].join("\n")
              )
            ].join("\n");
          })
        : ["No approved_connection packages with accepted final asset paths yet."])
    ].join("\n\n");
  }

  function getConnectionImplementationFileName() {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return `pm01-px-connection-implementation-${stamp}.md`;
  }

  async function copyConnectionImplementationPackage(digitalShift, button) {
    try {
      await navigator.clipboard.writeText(buildConnectionImplementationText(digitalShift));
      button.textContent = "Implementation package copied";
      window.setTimeout(() => {
        button.textContent = "Copy implementation package";
      }, 1600);
    } catch (_) {
      button.textContent = "Copy failed";
      window.setTimeout(() => {
        button.textContent = "Copy implementation package";
      }, 1600);
    }
  }

  function downloadConnectionImplementationPackage(digitalShift, button) {
    try {
      downloadTextFile(getConnectionImplementationFileName(), buildConnectionImplementationText(digitalShift), "text/markdown");
      button.textContent = "Implementation package downloaded";
      window.setTimeout(() => {
        button.textContent = "Download .md";
      }, 1600);
    } catch (_) {
      button.textContent = "Download failed";
      window.setTimeout(() => {
        button.textContent = "Download .md";
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

  function buildNormativeDossierText(digitalShift) {
    const dossier = digitalShift.normativeDossier || {};
    const anchors = digitalShift.normativeAnchors || [];
    const audit = buildCoverageAudit(digitalShift);
    return [
      `# ${dossier.title || "Нормативное досье PM01"}`,
      "",
      `generatedAt: ${new Date().toISOString()}`,
      `verifiedAt: ${dossier.verifiedAt || "n/a"}`,
      `sources: ${audit.normativeAnchors}`,
      `evidenceRows: ${audit.normativeEvidenceRows}`,
      `officialContract: ${digitalShift.contract || "100 баллов / 20 заданий / 5 вариантов"}`,
      "",
      "## Source basis",
      "",
      dossier.sourceBasis || "ФГОС, ПОП и локальная РП/КТП.",
      "",
      "## Official scope",
      "",
      dossier.officialScope || "Официальный экзамен PM01 не меняет контракт.",
      "",
      "## Methodical boundary",
      "",
      dossier.methodicalBoundary || "ФГОС задает рамку компетенций, но не заменяет рабочую программу.",
      "",
      "## Allowed modernization",
      "",
      ...((dossier.allowedModernization || []).map((item) => `- ${item}`)),
      "",
      "## Blocked until RP/KTP",
      "",
      ...((dossier.blockedUntilRp || []).map((item) => `- ${item}`)),
      "",
      "## RP intake needed",
      "",
      ...((dossier.rpIntakeNeeded || []).map((item) => `- ${item}`)),
      "",
      "## Source evidence",
      "",
      ...anchors.map((anchor, index) =>
        [
          `### ${index + 1}. ${anchor.title}`,
          "",
          `id: ${anchor.id}`,
          `sourceUrl: ${anchor.sourceUrl || "-"}`,
          `sourceStatus: ${anchor.sourceStatus || "-"}`,
          `documentStatus: ${anchor.documentStatus || "-"}`,
          `verifiedAt: ${anchor.verifiedAt || "-"}`,
          `focus: ${(anchor.focus || []).join(", ")}`,
          "",
          "evidence:",
          ...((anchor.sourceEvidence || []).map(
            (item) => `- ${item.label}: ${item.evidence}\n  examUse: ${item.examUse}`
          )),
          "",
          `approvalUse: ${anchor.approvalUse || "-"}`
        ].join("\n")
      )
    ].join("\n");
  }

  function getNormativeDossierFileName() {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return `pm01-px-normative-dossier-${stamp}.md`;
  }

  async function copyNormativeDossier(digitalShift, button) {
    try {
      await navigator.clipboard.writeText(buildNormativeDossierText(digitalShift));
      button.textContent = "Досье скопировано";
      window.setTimeout(() => {
        button.textContent = "Скопировать досье";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать досье";
      }, 1600);
    }
  }

  function downloadNormativeDossier(digitalShift, button) {
    try {
      downloadTextFile(getNormativeDossierFileName(), buildNormativeDossierText(digitalShift), "text/markdown");
      button.textContent = "Досье скачано";
      window.setTimeout(() => {
        button.textContent = "Скачать .md";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скачать";
      window.setTimeout(() => {
        button.textContent = "Скачать .md";
      }, 1600);
    }
  }

  function renderNormativeDossierPanel(digitalShift) {
    const dossier = digitalShift.normativeDossier || {};
    const audit = buildCoverageAudit(digitalShift);
    const panel = createNode("section", "approval-normative-dossier");
    panel.dataset.status = audit.normativeDossierReady ? "ready" : "pending";
    const head = createNode("div", "approval-normative-dossier-head");
    const title = createNode("div");
    title.append(
      createNode("h3", "", dossier.title || "Нормативное досье PM01"),
      createNode("span", "", "ФГОС/ПОП подтверждают рамку PM01, а РП/КТП остаются gate для финальных вопросов")
    );
    const actions = createNode("div", "approval-normative-dossier-actions");
    const copyButton = createNode("button", "button secondary", "Скопировать досье");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyNormativeDossier(digitalShift, copyButton));
    const downloadButton = createNode("button", "button secondary", "Скачать .md");
    downloadButton.type = "button";
    downloadButton.addEventListener("click", () => downloadNormativeDossier(digitalShift, downloadButton));
    actions.append(copyButton, downloadButton);
    head.append(title, actions);

    const metrics = createNode("div", "approval-normative-dossier-grid");
    [
      ["Источники", `${audit.normativeAnchors}`, "ФГОС 43.01.09, ФГОС 43.02.15, ПОП ИРПО/ФИРПО и pending РП."],
      ["Evidence", `${audit.normativeEvidenceRows}`, "Короткие доказательные пункты: что подтверждает источник и как это применять в PM01."],
      ["РП/КТП gate", audit.rpReady === audit.packages.length ? "закрыт" : "ждёт", "Финальные темы, вопросы и assets не меняются до локальной программы."]
    ].forEach(([label, value, detail]) => {
      const card = createNode("article", "approval-normative-dossier-card");
      card.append(createNode("span", "", label), createNode("strong", "", value), createNode("p", "", detail));
      metrics.appendChild(card);
    });

    const scope = createNode("div", "approval-normative-dossier-scope");
    scope.append(
      createNode("strong", "", "Граница методической правки"),
      createNode("p", "", dossier.methodicalBoundary || "ФГОС задает рамку компетенций, но не заменяет рабочую программу.")
    );

    const allowed = createNode("article", "approval-normative-dossier-list");
    allowed.append(createNode("strong", "", "Разрешено в тренировочном режиме"), renderList(dossier.allowedModernization || [], "approval-checklist"));
    const blocked = createNode("article", "approval-normative-dossier-list is-blocked");
    blocked.append(createNode("strong", "", "Блок до РП/КТП"), renderList(dossier.blockedUntilRp || [], "approval-checklist"));

    panel.append(head, metrics, scope, allowed, blocked);
    return panel;
  }

  function renderRpRequestKitPanel(digitalShift) {
    const packages = digitalShift.packages || [];
    const audit = buildCoverageAudit(digitalShift);
    const missingRp = packages.length - audit.rpReady;
    const panel = createNode("section", "approval-rp-request-kit");
    const head = createNode("div", "approval-rp-request-head");
    const title = createNode("div");
    title.append(
      createNode("h3", "", "Запрос РП/КТП"),
      createNode("span", "", "Готовый пакет для преподавателя или методиста перед финальным переписыванием тем")
    );
    const actions = createNode("div", "approval-rp-request-actions");
    const copyButton = createNode("button", "button secondary", "Скопировать запрос");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyRpRequestKit(digitalShift, copyButton));
    const downloadButton = createNode("button", "button secondary", "Скачать .md");
    downloadButton.type = "button";
    downloadButton.addEventListener("click", () => downloadRpRequestKit(digitalShift, downloadButton));
    actions.append(copyButton, downloadButton);
    head.append(title, actions);

    const metrics = createNode("div", "approval-rp-request-grid");
    [
      ["Цехи без РП", `${missingRp}/${packages.length}`, "Пока РП нет, темы остаются черновыми."],
      ["ОК 09/10", "сверить", "Нужна явная привязка к РП/КТП или локальным материалам."],
      ["Финальные assets", "блок", "Генерация final-файлов только после РП, preview и визуального осмотра."]
    ].forEach(([label, value, detail]) => {
      const card = createNode("article", "approval-rp-request-card");
      card.append(createNode("span", "", label), createNode("strong", "", value), createNode("p", "", detail));
      metrics.appendChild(card);
    });

    const list = createNode("div", "approval-rp-request-packages");
    packages.forEach((packageData) => {
      const card = createNode("article", "approval-rp-request-package");
      card.dataset.status = hasRpIntake(packageData.variantId) ? "done" : "pending";
      card.append(
        createNode("strong", "", packageData.title),
        createNode(
          "span",
          "",
          hasRpIntake(packageData.variantId) ? "РП добавлена локально" : "Нужен фрагмент РП/КТП"
        ),
        createNode("p", "", (packageData.rpTopics || []).slice(0, 2).join(" · "))
      );
      list.appendChild(card);
    });

    panel.append(head, metrics, list);
    return panel;
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
        "Нормативы",
        `${audit.normativeAnchors} / ${audit.normativeEvidenceRows}`,
        "Источник считается готовым, когда у него есть evidence: что подтверждено и как это применять в PM01.",
        audit.normativeDossierReady ? "done" : "blocked"
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
        "ОК09/ОК10 РП",
        `${audit.competencyReviewVerified}/${audit.competencyReviewTotal}`,
        "Локальная сверка подтверждает, что цифровая документация и профессиональная коммуникация есть в РП/КТП.",
        audit.competencyReviewVerified === audit.competencyReviewTotal ? "done" : audit.competencyReviewNeedsRevision || audit.competencyReviewNotInRp ? "blocked" : "pending"
      ),
      renderCoverageMetric(
        "Интерактив",
        `${audit.innovationReviewApproved}/${audit.innovationReviewTotal}`,
        "Подтверждает, что визуальная логика, механика, анимация и уникальность современных заданий согласованы.",
        audit.innovationReviewApproved === audit.innovationReviewTotal ? "done" : audit.innovationReviewNeedsRevision ? "blocked" : "pending"
      ),
      renderCoverageMetric(
        "Сводный gate",
        audit.allShopReviewLabel,
        "Общее решение по пакету 5 цехов перед preview batch и генерацией изображений.",
        audit.allShopReviewApproved ? "done" : audit.allShopReviewBlocked ? "blocked" : "pending"
      ),
      renderCoverageMetric(
        "Final gate",
        `${audit.finalAssetsOpen}/${audit.packages.length}`,
        "Открывается только после РП, решения на preview и принятого визуального осмотра.",
        audit.finalAssetsOpen ? "pending" : "blocked"
      ),
      renderCoverageMetric(
        "Final inspection",
        `${audit.finalAssetInspectionAccepted}/${audit.packages.length}`,
        `${audit.finalAssetInspectionItemsAccepted}/${audit.finalAssetInspectionItemsTotal} final assets приняты; ${audit.finalAssetInspectionNeedsRevision} правок, ${audit.finalAssetInspectionRejected} отклонено.`,
        audit.finalAssetInspectionAccepted === audit.packages.length ? "done" : audit.finalAssetsOpen ? "pending" : "blocked"
      ),
      renderCoverageMetric(
        "Connect-review",
        `${audit.connectionReviewApproved}/${audit.packages.length}`,
        `${audit.connectionReviewNeedsRevision} правок · ${audit.connectionReviewHold} на паузе. Даже approved требует отдельного code change.`,
        audit.connectionReviewApproved === audit.packages.length ? "done" : audit.finalAssetInspectionAccepted ? "pending" : "blocked"
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
      card.append(
        createNode(
          "p",
          "",
          `ОК09/ОК10: ${item.competencyReview.verified}/${item.competencyReview.total} подтверждено · ${item.competencyReview.pending} ждёт · ${item.competencyReview.needsRevision} правок · ${item.competencyReview.notInRp} нет в РП`
        )
      );
      card.append(
        createNode(
          "p",
          "",
          `Интерактив: ${item.innovationReview.approved}/${item.innovationReview.total} принято · ${item.innovationReview.pending} ждёт · ${item.innovationReview.needsRevision} правок · ${item.innovationReview.deferred} отложено`
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

  function buildFinalAssetInspectionReport(packageData) {
    const summary = getPackageFinalAssetInspectionSummary(packageData);
    const finalGate = getPackageGateRows(packageData).find((gate) => gate.id === "final_assets");
    return [
      "PM01 PX final asset inspection report",
      `generatedAt: ${new Date().toISOString()}`,
      `package: ${packageData.title}`,
      `variantId: ${packageData.variantId}`,
      `finalAssetGate: ${finalGate?.status || "blocked"}`,
      `inspectionAccepted: ${summary.accepted}/${summary.total}`,
      `inspectionNeedsRevision: ${summary.needsRevision}`,
      `inspectionRejected: ${summary.rejected}`,
      `inspectionAwaiting: ${summary.awaiting}`,
      `withActualPath: ${summary.withActualPath}/${summary.total}`,
      `connectionReview: ${isPackageFinalAssetInspectionAccepted(packageData) ? "ready_for_separate_teacher_review" : "blocked_until_accepted_final_assets"}`,
      "connectAutomatically: false",
      "",
      "assets:",
      ...((packageData.previewAssets || []).map((asset) => {
        const inspection = getFinalAssetInspection(asset.id, asset);
        const meta = getFinalAssetInspectionMeta(inspection.status);
        return [
          `- asset: ${asset.id}`,
          `  plannedTargetPath: ${asset.targetPath}`,
          `  actualPath: ${inspection.actualPath || "-"}`,
          `  inspectionStatus: ${inspection.status}`,
          `  inspectionLabel: ${meta.status}`,
          `  updatedAt: ${inspection.updatedAt || "not_saved"}`,
          `  note: ${inspection.note || "-"}`,
          "  checklist:",
          ...(asset.inspectionChecklist || []).map((item) => `    - ${item}`),
          "  connectAutomatically: false"
        ].join("\n");
      }))
    ].join("\n");
  }

  function getFinalAssetInspectionFileName(packageData) {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return `pm01-px-final-inspection-${packageData.variantId}-${stamp}.md`;
  }

  async function copyFinalAssetInspectionReport(packageData, button) {
    try {
      await navigator.clipboard.writeText(buildFinalAssetInspectionReport(packageData));
      button.textContent = "Final-отчёт скопирован";
      window.setTimeout(() => {
        button.textContent = "Скопировать final-отчёт";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать final-отчёт";
      }, 1600);
    }
  }

  function downloadFinalAssetInspectionReport(packageData, button) {
    try {
      downloadTextFile(getFinalAssetInspectionFileName(packageData), buildFinalAssetInspectionReport(packageData), "text/markdown");
      button.textContent = "Final-отчёт скачан";
      window.setTimeout(() => {
        button.textContent = "Скачать final-отчёт";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скачать";
      window.setTimeout(() => {
        button.textContent = "Скачать final-отчёт";
      }, 1600);
    }
  }

  function buildConnectionReviewReport(packageData) {
    const review = getPackageConnectionReview(packageData.variantId);
    const meta = getConnectionReviewMeta(review.status);
    const finalSummary = getPackageFinalAssetInspectionSummary(packageData);
    const gate = getPackageGateRows(packageData).find((item) => item.id === "connection_review");
    return [
      "PM01 PX connection review report",
      `generatedAt: ${new Date().toISOString()}`,
      `package: ${packageData.title}`,
      `variantId: ${packageData.variantId}`,
      `connectionStatus: ${review.status}`,
      `connectionLabel: ${meta.status}`,
      `approvedAt: ${review.approvedAt || "-"}`,
      `updatedAt: ${review.updatedAt || "not_saved"}`,
      `connectionGate: ${gate?.status || "blocked"}`,
      `finalInspectionAccepted: ${finalSummary.accepted}/${finalSummary.total}`,
      `withActualPath: ${finalSummary.withActualPath}/${finalSummary.total}`,
      "connectAutomatically: false",
      "manualCodeChangeRequired: true",
      `note: ${review.note || "-"}`,
      "",
      "assets:",
      ...((packageData.previewAssets || []).map((asset) => {
        const finalInspection = getFinalAssetInspection(asset.id, asset);
        return [
          `- asset: ${asset.id}`,
          `  plannedTargetPath: ${asset.targetPath}`,
          `  actualPath: ${finalInspection.actualPath || "-"}`,
          `  finalInspectionStatus: ${finalInspection.status}`,
          `  finalInspectionNote: ${finalInspection.note || "-"}`
        ].join("\n");
      }))
    ].join("\n");
  }

  function getConnectionReviewFileName(packageData) {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return `pm01-px-connection-review-${packageData.variantId}-${stamp}.md`;
  }

  async function copyConnectionReviewReport(packageData, button) {
    try {
      await navigator.clipboard.writeText(buildConnectionReviewReport(packageData));
      button.textContent = "Connect-отчёт скопирован";
      window.setTimeout(() => {
        button.textContent = "Скопировать connect-отчёт";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать connect-отчёт";
      }, 1600);
    }
  }

  function downloadConnectionReviewReport(packageData, button) {
    try {
      downloadTextFile(getConnectionReviewFileName(packageData), buildConnectionReviewReport(packageData), "text/markdown");
      button.textContent = "Connect-отчёт скачан";
      window.setTimeout(() => {
        button.textContent = "Скачать connect-отчёт";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скачать";
      window.setTimeout(() => {
        button.textContent = "Скачать connect-отчёт";
      }, 1600);
    }
  }

  function renderPreviewBatchPanel(digitalShift, readyPackages) {
    const panel = createNode("section", "approval-preview-batch");
    const assetCount = readyPackages.reduce((sum, packageData) => sum + (packageData.previewAssets || []).length, 0);
    const allShopReview = getAllShopReview();
    const allShopReviewMeta = getAllShopReviewMeta(allShopReview.status);
    const head = createNode("div", "approval-preview-batch-head");
    const title = createNode("div");
    title.append(
      createNode("h3", "", "Preview batch"),
      createNode(
        "span",
        "",
        readyPackages.length
          ? `${readyPackages.length} цехов · ${assetCount} planned preview-assets · finalAsset: false`
          : `Ждёт РП/КТП, локальные решения «На preview» и общий gate: ${allShopReviewMeta.status}`
      )
    );
    const copyButton = createNode("button", "button secondary", "Скопировать preview batch");
    copyButton.type = "button";
    copyButton.disabled = readyPackages.length === 0;
    copyButton.addEventListener("click", () => copyPreviewBatch(digitalShift, copyButton));
    const downloadButton = createNode("button", "button secondary", "Скачать .md");
    downloadButton.type = "button";
    downloadButton.disabled = readyPackages.length === 0;
    downloadButton.addEventListener("click", () => downloadPreviewBatch(digitalShift, downloadButton));
    const actions = createNode("div", "approval-preview-batch-actions");
    actions.append(copyButton, downloadButton);
    head.append(title, actions);

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
      const empty = createNode("p", "approval-preview-batch-empty", "Нет цехов, прошедших РП/КТП, локальные gates и сводное согласование 5 цехов.");
      list.appendChild(empty);
    }

    panel.append(head, list);
    return panel;
  }

  function renderFinalAssetBatchPanel(digitalShift, readyPackages) {
    const panel = createNode("section", "approval-final-asset-batch");
    const assetCount = readyPackages.reduce((sum, packageData) => sum + (packageData.previewAssets || []).length, 0);
    const head = createNode("div", "approval-final-asset-batch-head");
    const title = createNode("div");
    title.append(
      createNode("h3", "", "Final assets batch"),
      createNode(
        "span",
        "",
        readyPackages.length
          ? `${readyPackages.length} цехов · ${assetCount} final assets · connectAutomatically: false`
          : "Появится только после принятого preview и открытого final-assets gate"
      )
    );
    const copyButton = createNode("button", "button secondary", "Скопировать final batch");
    copyButton.type = "button";
    copyButton.disabled = readyPackages.length === 0;
    copyButton.addEventListener("click", () => copyFinalAssetBatch(digitalShift, copyButton));
    const downloadButton = createNode("button", "button secondary", "Скачать .md");
    downloadButton.type = "button";
    downloadButton.disabled = readyPackages.length === 0;
    downloadButton.addEventListener("click", () => downloadFinalAssetBatch(digitalShift, downloadButton));
    const actions = createNode("div", "approval-final-asset-batch-actions");
    actions.append(copyButton, downloadButton);
    head.append(title, actions);

    const list = createNode("div", "approval-final-asset-batch-list");
    if (readyPackages.length) {
      readyPackages.forEach((packageData) => {
        const card = createNode("article", "approval-final-asset-batch-card");
        card.append(
          createNode("strong", "", packageData.title),
          createNode(
            "p",
            "",
            "Готово к генерации final files после принятого preview. Подключение остаётся закрытым до повторного визуального осмотра."
          ),
          renderList(
            (packageData.previewAssets || []).map((asset) => `${asset.id}: ${asset.targetPath}`),
            "approval-final-asset-batch-paths"
          )
        );
        list.appendChild(card);
      });
    } else {
      const empty = createNode(
        "p",
        "approval-final-asset-batch-empty",
        "Нет цехов с принятыми preview-assets и открытым final-assets gate."
      );
      list.appendChild(empty);
    }

    panel.append(head, list);
    return panel;
  }

  function renderConnectionImplementationPanel(digitalShift, approvedPackages) {
    const panel = createNode("section", "approval-connection-implementation");
    const assetCount = approvedPackages.reduce(
      (sum, packageData) => sum + getPackageApprovedConnectionAssets(packageData).length,
      0
    );
    const head = createNode("div", "approval-connection-implementation-head");
    const title = createNode("div");
    title.append(
      createNode("h3", "", "Connection implementation package"),
      createNode(
        "span",
        "",
        approvedPackages.length
          ? `${approvedPackages.length} shops · ${assetCount} approved assets · publicExamChanged: false`
          : "No shops with approved_connection yet. Manual code change remains closed."
      )
    );
    const copyButton = createNode("button", "button secondary", "Copy implementation package");
    copyButton.type = "button";
    copyButton.disabled = approvedPackages.length === 0;
    copyButton.addEventListener("click", () => copyConnectionImplementationPackage(digitalShift, copyButton));
    const downloadButton = createNode("button", "button secondary", "Download .md");
    downloadButton.type = "button";
    downloadButton.disabled = approvedPackages.length === 0;
    downloadButton.addEventListener("click", () => downloadConnectionImplementationPackage(digitalShift, downloadButton));
    const actions = createNode("div", "approval-connection-implementation-actions");
    actions.append(copyButton, downloadButton);
    head.append(title, actions);

    const list = createNode("div", "approval-connection-implementation-list");
    if (approvedPackages.length) {
      approvedPackages.forEach((packageData) => {
        const approvedConnectionAssets = getPackageApprovedConnectionAssets(packageData);
        const review = getPackageConnectionReview(packageData.variantId);
        const card = createNode("article", "approval-connection-implementation-card");
        card.append(
          createNode("strong", "", packageData.title),
          createNode(
            "p",
            "",
            `approved_connection · ${approvedConnectionAssets.length} accepted final assets · approvedAt: ${review.approvedAt || "-"}`
          ),
          renderList(
            approvedConnectionAssets.map(({ asset, finalInspection }) => `${asset.id}: ${finalInspection.actualPath.trim()}`),
            "approval-connection-implementation-paths"
          )
        );
        list.appendChild(card);
      });
    } else {
      list.appendChild(createNode("p", "approval-connection-implementation-empty", "No shops with approved_connection."));
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

  function renderAllShopPackagesPanel(digitalShift) {
    const packages = digitalShift.packages || [];
    const audit = buildCoverageAudit(digitalShift);
    const panel = createNode("section", "approval-all-shop-packages");
    const head = createNode("div", "approval-all-shop-packages-head");
    const title = createNode("div");
    title.append(
      createNode("h3", "", "Сводный пакет 5 цехов"),
      createNode("span", "", "Один Markdown для согласования всех цехов: audit, gates, задания, промпты, preview и блокеры до РП")
    );
    const actions = createNode("div", "approval-all-shop-packages-actions");
    const copyButton = createNode("button", "button secondary", "Скопировать все пакеты");
    copyButton.type = "button";
    copyButton.disabled = packages.length === 0;
    copyButton.addEventListener("click", () => copyAllShopApprovalPackages(digitalShift, copyButton));
    const downloadButton = createNode("button", "button secondary", "Скачать .md");
    downloadButton.type = "button";
    downloadButton.disabled = packages.length === 0;
    downloadButton.addEventListener("click", () => downloadAllShopApprovalPackages(digitalShift, downloadButton));
    actions.append(copyButton, downloadButton);
    head.append(title, actions);

    const grid = createNode("div", "approval-all-shop-packages-grid");
    [
      ["Цехи", `${packages.length}/5`, "Овощи, рыба, мясо, птица/кролик и комплексный заказ."],
      ["РП-intake", `${audit.rpReady}/${packages.length}`, "Без РП/КТП финальные темы и official questions не меняются."],
      ["Интерактив", `${audit.innovationReviewApproved}/${audit.innovationReviewTotal}`, "Согласование визуала, механики, анимации и уникальности."],
      ["Сводный gate", audit.allShopReviewLabel, "Общее решение по пакету 5 цехов перед preview workflow."],
      ["Preview", `${audit.previewReadyWithAllShopReview}/${packages.length}`, "Включаются только цехи с закрытыми gates и общим решением на preview."]
    ].forEach(([label, value, detail]) => {
      const card = createNode("article", "approval-all-shop-packages-card");
      card.append(createNode("span", "", label), createNode("strong", "", value), createNode("p", "", detail));
      grid.appendChild(card);
    });

    const note = createNode(
      "p",
      "approval-all-shop-packages-note",
      "Сводный пакет предназначен для согласования; он не содержит ключей ответов, не создаёт изображения и не меняет официальный экзамен."
    );
    panel.append(head, grid, renderAllShopReviewPanel(digitalShift), note);
    return panel;
  }

  function renderAllShopReviewPanel(digitalShift) {
    const review = getAllShopReview();
    const meta = getAllShopReviewMeta(review.status);
    const panel = createNode("div", "approval-all-shop-review");
    panel.dataset.status = review.status;

    const head = createNode("div", "approval-all-shop-review-head");
    head.append(
      createNode("strong", "", "Журнал сводного согласования"),
      createNode("span", "", `${meta.status} · ${digitalShift.packages?.length || 0}/5 цехов`)
    );

    const options = createNode("div", "approval-all-shop-review-options");
    ALL_SHOP_REVIEW_OPTIONS.forEach((option) => {
      const button = createNode("button", "approval-all-shop-review-button", option.label);
      button.type = "button";
      button.dataset.status = option.id;
      button.classList.toggle("is-active", review.status === option.id);
      button.title = option.detail;
      button.addEventListener("click", () => {
        setAllShopReview({ status: option.id });
        refreshApprovalOverview();
        renderPackages(currentDigitalShift);
      });
      options.appendChild(button);
    });

    const detail = createNode("p", "approval-all-shop-review-detail", meta.detail);
    const dates = createNode(
      "small",
      "approval-all-shop-review-dates",
      `sentAt: ${review.sentAt || "not_sent"} · reviewedAt: ${review.reviewedAt || "not_reviewed"}`
    );

    const noteField = createNode("label", "approval-all-shop-review-note-field");
    const note = createNode("textarea", "approval-all-shop-review-note");
    note.value = review.note;
    note.placeholder = "Кто согласовал пакет, какие правки нужны, что разрешено генерировать на preview";
    note.addEventListener("input", () => {
      setAllShopReview({ note: note.value });
    });
    noteField.append(createNode("span", "", "Заметка по общему решению"), note);

    const actions = createNode("div", "approval-all-shop-review-actions");
    const resetButton = createNode("button", "button ghost", "Сбросить общий gate");
    resetButton.type = "button";
    resetButton.addEventListener("click", () => {
      resetAllShopReview();
      refreshApprovalOverview();
      renderPackages(currentDigitalShift);
    });
    actions.appendChild(resetButton);

    panel.append(head, options, detail, dates, noteField, actions);
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
    const finalReadyPackages = getFinalAssetBatchItems(digitalShift);
    const connectionImplementationPackages = getConnectionImplementationPackages(digitalShift);

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
      renderAllShopPackagesPanel(digitalShift),
      renderNormativeDossierPanel(digitalShift),
      renderRpRequestKitPanel(digitalShift),
      renderCoverageAuditPanel(digitalShift),
      renderPreviewBatchPanel(digitalShift, readyPackages),
      renderFinalAssetBatchPanel(digitalShift, finalReadyPackages),
      renderConnectionImplementationPanel(digitalShift, connectionImplementationPackages),
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
      if ((anchor.sourceEvidence || []).length) {
        card.appendChild(renderNormativeEvidenceList(anchor.sourceEvidence));
      }
      list.appendChild(card);
    });
    const copyButton = createNode("button", "button secondary", "Копировать источники");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyNormativeAnchors(anchors, copyButton));
    section.append(heading, list, copyButton);
    return section;
  }

  function renderNormativeEvidenceList(items) {
    const list = createNode("ul", "approval-normative-evidence");
    items.forEach((item) => {
      const entry = createNode("li");
      entry.append(
        createNode("strong", "", item.label || "Evidence"),
        createNode("span", "", item.evidence || ""),
        createNode("em", "", item.examUse || "")
      );
      list.appendChild(entry);
    });
    return list;
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
          `  approvalUse: ${anchor.approvalUse}`,
          "  sourceEvidence:",
          ...((anchor.sourceEvidence || []).map(
            (item) => `    - ${item.label}: ${item.evidence}\n      examUse: ${item.examUse}`
          ))
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

  function buildShopApprovalPackageText(packageData, familyMap = new Map(), blueprintMap = new Map(), digitalShift = currentDigitalShift) {
    const decision = getPackageDecision(packageData.variantId);
    const decisionMeta = getDecisionMeta(decision.decision);
    const rpIntake = getPackageRpIntake(packageData.variantId);
    const gateSummary = getPackageGateSummary(packageData);
    const inspectionSummary = getPackageInspectionSummary(packageData);
    const finalInspectionSummary = getPackageFinalAssetInspectionSummary(packageData);
    const connectionReview = getPackageConnectionReview(packageData.variantId);
    const competencyReview = getPackageCompetencyReviewSummary(packageData);
    const innovationReview = getPackageInnovationReviewSummary(packageData);
    const nextAction = getPackageNextAction(packageData);
    const allShopReview = getAllShopReview();
    const allShopReviewMeta = getAllShopReviewMeta(allShopReview.status);
    const packageRows = packageData.methodicalMatrix || [];
    const packageTasks = packageData.tasks || [];
    return [
      `# PM01 PX. Согласовательный пакет цеха: ${packageData.title}`,
      "",
      `generatedAt: ${new Date().toISOString()}`,
      `variantId: ${packageData.variantId}`,
      `officialContract: ${digitalShift?.contract || "100 баллов / 20 заданий / 5 вариантов"}`,
      `practiceScope: PX training-only, maxScore 0, official protocol unchanged`,
      `rpStatus: ${hasRpIntake(packageData.variantId) ? "local_rp_excerpt_present" : "awaiting_rp_ktp"}`,
      `decision: ${decision.decision} (${decisionMeta.label})`,
      `allShopReview: ${allShopReview.status} (${allShopReviewMeta.status})`,
      `allShopReviewNote: ${allShopReview.note || "-"}`,
      `nextAction: ${nextAction.title}`,
      `nextActionStatus: ${nextAction.status}`,
      "",
      "## Gate status",
      "",
      `gatesDone: ${gateSummary.done}/${gateSummary.gates.length}`,
      `gatesBlocked: ${gateSummary.blocked}`,
      `gatesPending: ${gateSummary.pending}`,
      ...gateSummary.gates.map((gate) => `- ${gate.id}: ${gate.status}\n  title: ${gate.title}\n  detail: ${gate.detail}`),
      "",
      "## What must stay blocked until RP/KTP",
      "",
      ...((digitalShift?.normativeDossier?.blockedUntilRp || []).map((item) => `- ${item}`)),
      "",
      "## RP/KTP intake",
      "",
      `updatedAt: ${rpIntake.updatedAt || "not_saved"}`,
      `confirmedTopics: ${rpIntake.confirmedTopics || "-"}`,
      "",
      "rpExcerpt:",
      rpIntake.excerpt || "-",
      "",
      "## Current topics to confirm",
      "",
      ...(packageData.rpTopics || []).map((topic) => `- ${topic}`),
      "",
      "## Competency and innovation review",
      "",
      `ok09Ok10Verified: ${competencyReview.verified}/${competencyReview.total}`,
      `ok09Ok10NeedsRevision: ${competencyReview.needsRevision}`,
      `ok09Ok10NotInRp: ${competencyReview.notInRp}`,
      `innovationApproved: ${innovationReview.approved}/${innovationReview.total}`,
      `innovationNeedsRevision: ${innovationReview.needsRevision}`,
      `innovationDeferred: ${innovationReview.deferred}`,
      "",
      "## Production journal",
      "",
      ...(packageData.productionLog || []).map((item) => `- ${item}`),
      "",
      "## Proposed tasks and modernity",
      "",
      ...packageTasks.map((task, index) => {
        const family = familyMap.get(task.familyId) || {};
        const row = packageRows.find((item) => item.familyId === task.familyId) || {};
        const blueprint = blueprintMap.get(task.familyId) || {};
        return [
          `### ${index + 1}. ${task.title}`,
          "",
          `familyId: ${task.familyId}`,
          `familyTitle: ${family.title || task.familyTitle || "-"}`,
          `rpTopicDraft: ${row.rpTopic || "-"}`,
          `competenciesDraft: ${(row.competencies || []).join(", ") || "-"}`,
          `currentQuestion: ${row.currentQuestion || "-"}`,
          `newFormat: ${row.newFormat || "-"}`,
          `visualMode: ${blueprint.visualMode || "-"}`,
          `interaction: ${family.interaction || "-"}`,
          `modernity: ${family.modernity || blueprint.uniqueness || "-"}`,
          `implementation: ${blueprint.implementation || "-"}`,
          `animation: ${blueprint.animation || "-"}`,
          `checkCriterion: ${row.checkCriterion || blueprint.assessment || "-"}`
        ].join("\n");
      }),
      "",
      "## Preview image prompts",
      "",
      ...(packageData.previewAssets || []).map((asset, index) =>
        [
          `### ${index + 1}. ${asset.kind === "scene" ? "Общий вид цеха" : "Контрольная партия"}`,
          "",
          `id: ${asset.id}`,
          `targetPath: ${asset.targetPath}`,
          `status: ${asset.status}`,
          `finalAsset: ${asset.finalAsset}`,
          `outputUse: ${asset.outputUse}`,
          `inspectionGate: ${asset.inspectionGate}`,
          `visualPurpose: ${asset.visualPurpose || "-"}`,
          `prompt: ${asset.prompt}`,
          `negativePrompt: ${asset.negativePrompt}`,
          "",
          "styleReferences:",
          ...((asset.styleReferences || []).map((reference) => `- ${reference.label}: ${reference.path}`)),
          "",
          "inspectionChecklist:",
          ...((asset.inspectionChecklist || []).map((item) => `- ${item}`))
        ].join("\n")
      ),
      "",
      "## Preview inspection state",
      "",
      `accepted: ${inspectionSummary.accepted}/${inspectionSummary.total}`,
      `awaiting: ${inspectionSummary.awaiting}`,
      `needsRevision: ${inspectionSummary.needsRevision}`,
      `rejected: ${inspectionSummary.rejected}`,
      "",
      "## Final asset inspection state",
      "",
      `accepted: ${finalInspectionSummary.accepted}/${finalInspectionSummary.total}`,
      `withActualPath: ${finalInspectionSummary.withActualPath}/${finalInspectionSummary.total}`,
      `awaiting: ${finalInspectionSummary.awaiting}`,
      `needsRevision: ${finalInspectionSummary.needsRevision}`,
      `rejected: ${finalInspectionSummary.rejected}`,
      `connectAutomatically: false`,
      "",
      ...((packageData.previewAssets || []).map((asset) => {
        const finalInspection = getFinalAssetInspection(asset.id, asset);
        return [
          `- asset: ${asset.id}`,
          `  plannedTargetPath: ${asset.targetPath}`,
          `  actualPath: ${finalInspection.actualPath || "-"}`,
          `  status: ${finalInspection.status}`,
          `  updatedAt: ${finalInspection.updatedAt || "not_saved"}`,
          `  note: ${finalInspection.note || "-"}`
        ].join("\n");
      })),
      "",
      "## Connection review state",
      "",
      `status: ${connectionReview.status}`,
      `approvedAt: ${connectionReview.approvedAt || "-"}`,
      `updatedAt: ${connectionReview.updatedAt || "not_saved"}`,
      `manualCodeChangeRequired: true`,
      `connectAutomatically: false`,
      `note: ${connectionReview.note || "-"}`,
      "",
      "## Teacher decision note",
      "",
      decision.note || "-"
    ].join("\n");
  }

  function getShopApprovalPackageFileName(packageData) {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return `pm01-px-shop-package-${packageData.variantId}-${stamp}.md`;
  }

  async function copyShopApprovalPackage(packageData, familyMap, blueprintMap, button) {
    try {
      await navigator.clipboard.writeText(buildShopApprovalPackageText(packageData, familyMap, blueprintMap));
      button.textContent = "Пакет скопирован";
      window.setTimeout(() => {
        button.textContent = "Скопировать пакет";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать пакет";
      }, 1600);
    }
  }

  function downloadShopApprovalPackage(packageData, familyMap, blueprintMap, button) {
    try {
      downloadTextFile(
        getShopApprovalPackageFileName(packageData),
        buildShopApprovalPackageText(packageData, familyMap, blueprintMap),
        "text/markdown"
      );
      button.textContent = "Пакет скачан";
      window.setTimeout(() => {
        button.textContent = "Скачать .md";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скачать";
      window.setTimeout(() => {
        button.textContent = "Скачать .md";
      }, 1600);
    }
  }

  function buildAllShopApprovalPackagesText(digitalShift) {
    const packages = digitalShift.packages || [];
    const familyMap = new Map((digitalShift.families || []).map((family) => [family.id, family]));
    const blueprintMap = new Map((digitalShift.interactionBlueprints || []).map((blueprint) => [blueprint.familyId, blueprint]));
    const audit = buildCoverageAudit(digitalShift);
    return [
      "# PM01 PX. Сводный пакет согласования 5 цехов",
      "",
      `generatedAt: ${new Date().toISOString()}`,
      `appVersion: ${currentExam?.version || currentExam?.appVersion || "PM01"}`,
      `officialContract: ${digitalShift.contract || "100 баллов / 20 заданий / 5 вариантов"}`,
      `practiceScope: PX training-only, maxScore 0, official protocol unchanged`,
      `packages: ${packages.length}/5`,
      `allShopReview: ${audit.allShopReviewStatus} (${audit.allShopReviewLabel})`,
      `allShopReviewSentAt: ${audit.allShopReview.sentAt || "-"}`,
      `allShopReviewReviewedAt: ${audit.allShopReview.reviewedAt || "-"}`,
      `allShopReviewNote: ${audit.allShopReview.note || "-"}`,
      "",
      "## Сводный audit",
      "",
      `methodicalMatrix: ${audit.matrixRows}/${audit.expectedMatrixRows}`,
      `previewSlots: ${audit.previewAssets}/${audit.expectedPreviewAssets}`,
      `rpIntake: ${audit.rpReady}/${packages.length}`,
      `ok09Ok10Review: ${audit.competencyReviewVerified}/${audit.competencyReviewTotal}`,
      `innovationReview: ${audit.innovationReviewApproved}/${audit.innovationReviewTotal}`,
      `previewDecision: ${audit.previewReady}/${packages.length}`,
      `previewReadyAfterAllShopReview: ${audit.previewReadyWithAllShopReview}/${packages.length}`,
      `previewInspectionAccepted: ${audit.previewAccepted}/${packages.length}`,
      `finalAssetGateOpen: ${audit.finalAssetsOpen}/${packages.length}`,
      `finalAssetInspectionAccepted: ${audit.finalAssetInspectionAccepted}/${packages.length}`,
      `finalAssetInspectionItems: ${audit.finalAssetInspectionItemsAccepted}/${audit.finalAssetInspectionItemsTotal}`,
      `connectionReviewApproved: ${audit.connectionReviewApproved}/${packages.length}`,
      "",
      "## Что остаётся заблокированным до РП/КТП",
      "",
      ...((digitalShift.normativeDossier?.blockedUntilRp || []).map((item) => `- ${item}`)),
      "",
      "## Пакеты цехов",
      "",
      ...packages.map((packageData, index) =>
        [
          `<!-- shop ${index + 1}/${packages.length}: ${packageData.variantId} -->`,
          buildShopApprovalPackageText(packageData, familyMap, blueprintMap, digitalShift)
        ].join("\n")
      ).map((text) => `${text}\n---`)
    ].join("\n");
  }

  function getAllShopApprovalPackagesFileName() {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return `pm01-px-all-shop-approval-packages-${stamp}.md`;
  }

  async function copyAllShopApprovalPackages(digitalShift, button) {
    try {
      await navigator.clipboard.writeText(buildAllShopApprovalPackagesText(digitalShift));
      button.textContent = "Пакеты скопированы";
      window.setTimeout(() => {
        button.textContent = "Скопировать все пакеты";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать все пакеты";
      }, 1600);
    }
  }

  function downloadAllShopApprovalPackages(digitalShift, button) {
    try {
      downloadTextFile(getAllShopApprovalPackagesFileName(), buildAllShopApprovalPackagesText(digitalShift), "text/markdown");
      button.textContent = "Пакеты скачаны";
      window.setTimeout(() => {
        button.textContent = "Скачать .md";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скачать";
      window.setTimeout(() => {
        button.textContent = "Скачать .md";
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

  function buildInnovationReviewReport(packageData, familyMap = new Map(), blueprintMap = new Map()) {
    const summary = getPackageInnovationReviewSummary(packageData);
    const familyIds = getPackageInnovationFamilies(packageData);
    return [
      "PM01 PX innovation review",
      `generatedAt: ${new Date().toISOString()}`,
      `package: ${packageData.title}`,
      `variantId: ${packageData.variantId}`,
      `approved: ${summary.approved}/${summary.total}`,
      `pending: ${summary.pending}`,
      `needsRevision: ${summary.needsRevision}`,
      `deferred: ${summary.deferred}`,
      `ready: ${summary.ready}`,
      "",
      "families:",
      ...familyIds.map((familyId) => {
        const family = familyMap.get(familyId) || {};
        const blueprint = blueprintMap.get(familyId) || {};
        const review = getInnovationReviewItem(packageData.variantId, familyId);
        const meta = getInnovationReviewMeta(review.status);
        return [
          `- family: ${familyId}`,
          `  title: ${family.title || blueprint.visualMode || familyId}`,
          `  interaction: ${family.interaction || "-"}`,
          `  visualMode: ${blueprint.visualMode || "-"}`,
          `  layout: ${blueprint.layout || "-"}`,
          `  implementation: ${blueprint.implementation || "-"}`,
          `  animation: ${blueprint.animation || "-"}`,
          `  uniqueness: ${blueprint.uniqueness || family.modernity || "-"}`,
          `  assessment: ${blueprint.assessment || "-"}`,
          `  approvalQuestion: ${blueprint.approvalQuestion || "-"}`,
          `  status: ${review.status}`,
          `  statusLabel: ${meta.status}`,
          `  updatedAt: ${review.updatedAt || "not_saved"}`,
          `  note: ${review.note || "-"}`
        ].join("\n");
      })
    ].join("\n");
  }

  async function copyInnovationReviewReport(packageData, familyMap, blueprintMap, button) {
    try {
      await navigator.clipboard.writeText(buildInnovationReviewReport(packageData, familyMap, blueprintMap));
      button.textContent = "Интерактив скопирован";
      window.setTimeout(() => {
        button.textContent = "Скопировать интерактив";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать интерактив";
      }, 1600);
    }
  }

  function buildCompetencyReviewReport(packageData) {
    const summary = getPackageCompetencyReviewSummary(packageData);
    return [
      "PM01 PX OK09/OK10 review",
      `generatedAt: ${new Date().toISOString()}`,
      `package: ${packageData.title}`,
      `variantId: ${packageData.variantId}`,
      `rpIntake: ${hasRpIntake(packageData.variantId) ? "present" : "missing"}`,
      `verified: ${summary.verified}/${summary.total}`,
      `pending: ${summary.pending}`,
      `needsRevision: ${summary.needsRevision}`,
      `notInRp: ${summary.notInRp}`,
      `ready: ${summary.ready}`,
      "",
      "items:",
      ...COMPETENCY_REVIEW_ITEMS.map((item) => {
        const review = getCompetencyReviewItem(packageData.variantId, item.id);
        const meta = getCompetencyReviewMeta(review.status);
        return [
          `- competency: ${item.label}`,
          `  title: ${item.title}`,
          `  status: ${review.status}`,
          `  statusLabel: ${meta.status}`,
          `  updatedAt: ${review.updatedAt || "not_saved"}`,
          `  note: ${review.note || "-"}`
        ].join("\n");
      })
    ].join("\n");
  }

  async function copyCompetencyReviewReport(packageData, button) {
    try {
      await navigator.clipboard.writeText(buildCompetencyReviewReport(packageData));
      button.textContent = "ОК-сверка скопирована";
      window.setTimeout(() => {
        button.textContent = "Скопировать ОК-сверку";
      }, 1600);
    } catch (_) {
      button.textContent = "Не удалось скопировать";
      window.setTimeout(() => {
        button.textContent = "Скопировать ОК-сверку";
      }, 1600);
    }
  }

  function buildGateReportText(packageData) {
    const decision = getPackageDecision(packageData.variantId);
    const intake = getPackageRpIntake(packageData.variantId);
    const summary = getPackageGateSummary(packageData);
    const finalInspection = getPackageFinalAssetInspectionSummary(packageData);
    const competencyReview = getPackageCompetencyReviewSummary(packageData);
    const innovationReview = getPackageInnovationReviewSummary(packageData);
    return [
      packageData.title,
      `variantId: ${packageData.variantId}`,
      `decision: ${decision.decision}`,
      `rpIntake: ${hasRpIntake(packageData.variantId) ? "present" : "missing"}`,
      `rpUpdatedAt: ${intake.updatedAt || "not_saved"}`,
      `competencyReview: ${competencyReview.verified}/${competencyReview.total}`,
      `competencyReviewBlocked: ${competencyReview.blocked}`,
      `innovationReview: ${innovationReview.approved}/${innovationReview.total}`,
      `innovationReviewBlocked: ${innovationReview.blocked}`,
      `finalAssetInspection: ${finalInspection.accepted}/${finalInspection.total}`,
      `finalAssetInspectionNeedsRevision: ${finalInspection.needsRevision}`,
      `finalAssetInspectionRejected: ${finalInspection.rejected}`,
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
    excerpt.addEventListener("change", () => {
      refreshApprovalOverview();
      renderPackages(currentDigitalShift);
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
    confirmedTopics.addEventListener("change", () => {
      refreshApprovalOverview();
      renderPackages(currentDigitalShift);
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
      resetPackageCompetencyReview(packageData.variantId);
      refreshApprovalOverview();
      renderPackages(currentDigitalShift);
    });
    actions.append(copyButton, resetButton);
    panel.append(head, excerptField, confirmedField, actions);
    return panel;
  }

  function renderCompetencyReviewPanel(packageData) {
    const summary = getPackageCompetencyReviewSummary(packageData);
    const canReview = hasRpIntake(packageData.variantId);
    const panel = createNode("section", "approval-package-block approval-competency-review");
    panel.dataset.status = !canReview ? "waiting_rp" : summary.ready ? "verified" : summary.blocked ? "blocked" : "pending";

    const head = createNode("div", "approval-competency-review-head");
    head.append(
      createNode("h3", "", "ПК/ОК-сверка по РП"),
      createNode(
        "span",
        "",
        canReview
          ? `${summary.verified}/${summary.total} подтверждено · ${summary.pending} ждёт · ${summary.needsRevision} правок · ${summary.notInRp} нет в РП`
          : "Добавьте фрагмент РП/КТП, затем подтвердите ОК09 и ОК10 по этому цеху."
      )
    );

    const gateNote = createNode(
      "p",
      "approval-competency-review-gate",
      canReview
        ? "Эта сверка открывает preview/final workflow только после явного подтверждения ОК09 и ОК10 по РП/КТП."
        : "До РП/КТП статусы заблокированы: финальные темы, задания и assets не закрепляются вслепую."
    );

    const grid = createNode("div", "approval-competency-review-grid");
    COMPETENCY_REVIEW_ITEMS.forEach((item) => {
      const review = getCompetencyReviewItem(packageData.variantId, item.id);
      const meta = getCompetencyReviewMeta(review.status);
      const card = createNode("article", "approval-competency-review-card");
      card.dataset.status = review.status;
      card.dataset.competency = item.id;
      card.append(
        createNode("span", "approval-competency-review-status", meta.status),
        createNode("strong", "", `${item.label} · ${item.title}`),
        createNode("p", "", item.detail)
      );

      const options = createNode("div", "approval-competency-review-options");
      COMPETENCY_REVIEW_OPTIONS.forEach((option) => {
        const button = createNode("button", "approval-competency-review-button", option.label);
        button.type = "button";
        button.dataset.status = option.id;
        button.classList.toggle("is-active", review.status === option.id);
        button.disabled = !canReview;
        button.title = option.detail;
        button.addEventListener("click", () => {
          setCompetencyReviewItem(packageData.variantId, item.id, { status: option.id });
          refreshApprovalOverview();
          renderPackages(currentDigitalShift);
        });
        options.appendChild(button);
      });

      const noteField = createNode("label", "approval-competency-review-note-field");
      const note = createNode("textarea", "approval-competency-review-note");
      note.value = review.note;
      note.disabled = !canReview;
      note.placeholder = item.placeholder;
      note.addEventListener("input", () => {
        setCompetencyReviewItem(packageData.variantId, item.id, { note: note.value });
        refreshApprovalOverview();
      });
      noteField.append(createNode("span", "", "Основание по РП/КТП"), note);

      card.append(options, noteField);
      grid.appendChild(card);
    });

    const actions = createNode("div", "approval-competency-review-actions");
    const copyButton = createNode("button", "button secondary", "Скопировать ОК-сверку");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyCompetencyReviewReport(packageData, copyButton));
    const resetButton = createNode("button", "button ghost", "Сбросить ОК-сверку");
    resetButton.type = "button";
    resetButton.addEventListener("click", () => {
      resetPackageCompetencyReview(packageData.variantId);
      refreshApprovalOverview();
      renderPackages(currentDigitalShift);
    });
    actions.append(copyButton, resetButton);

    panel.append(head, gateNote, grid, actions);
    return panel;
  }

  function renderInnovationReviewPanel(packageData, familyMap = new Map(), blueprintMap = new Map()) {
    const summary = getPackageInnovationReviewSummary(packageData);
    const panel = createNode("section", "approval-package-block approval-innovation-review");
    panel.dataset.status = summary.ready ? "approved" : summary.blocked ? "blocked" : summary.deferredOpen ? "deferred" : "pending";

    const head = createNode("div", "approval-innovation-review-head");
    head.append(
      createNode("h3", "", "Согласование интерактива"),
      createNode(
        "span",
        "",
        `${summary.approved}/${summary.total} принято · ${summary.pending} ждёт · ${summary.needsRevision} правок · ${summary.deferred} отложено`
      )
    );

    const gateNote = createNode(
      "p",
      "approval-innovation-review-gate",
      "Этот gate фиксирует, как будет выглядеть, работать и проверяться каждое современное задание до preview и финальных assets."
    );

    const grid = createNode("div", "approval-innovation-review-grid");
    getPackageInnovationFamilies(packageData).forEach((familyId) => {
      const family = familyMap.get(familyId) || {};
      const blueprint = blueprintMap.get(familyId) || {};
      const matrixRow = (packageData.methodicalMatrix || []).find((row) => row.familyId === familyId) || {};
      const task = (packageData.tasks || []).find((item) => item.familyId === familyId) || {};
      const review = getInnovationReviewItem(packageData.variantId, familyId);
      const meta = getInnovationReviewMeta(review.status);
      const card = createNode("article", "approval-innovation-review-card");
      card.dataset.status = review.status;
      card.dataset.family = familyId;
      card.append(
        createNode("span", "approval-innovation-review-status", meta.status),
        createNode("strong", "", family.title || task.familyTitle || familyId),
        createNode("p", "", task.title || matrixRow.newFormat || family.interaction || ""),
        createNode("small", "", `Визуал: ${blueprint.visualMode || matrixRow.newFormat || "-"}`),
        createNode("em", "", `Реализация: ${blueprint.implementation || "поверх текущего PX visualMode"}`),
        createNode("p", "", `Современность: ${blueprint.uniqueness || family.modernity || "-"}`),
        createNode("p", "", `Проверка: ${blueprint.assessment || matrixRow.checkCriterion || "-"}`)
      );

      const options = createNode("div", "approval-innovation-review-options");
      INNOVATION_REVIEW_OPTIONS.forEach((option) => {
        const button = createNode("button", "approval-innovation-review-button", option.label);
        button.type = "button";
        button.dataset.status = option.id;
        button.classList.toggle("is-active", review.status === option.id);
        button.title = option.detail;
        button.addEventListener("click", () => {
          setInnovationReviewItem(packageData.variantId, familyId, { status: option.id });
          refreshApprovalOverview();
          renderPackages(currentDigitalShift);
        });
        options.appendChild(button);
      });

      const noteField = createNode("label", "approval-innovation-review-note-field");
      const note = createNode("textarea", "approval-innovation-review-note");
      note.value = review.note;
      note.placeholder = "Что принять, уточнить или отложить: визуал, механика, анимация, критерий, уникальность";
      note.addEventListener("input", () => {
        setInnovationReviewItem(packageData.variantId, familyId, { note: note.value });
        refreshApprovalOverview();
      });
      noteField.append(createNode("span", "", "Комментарий по новшеству"), note);

      card.append(options, noteField);
      grid.appendChild(card);
    });

    const actions = createNode("div", "approval-innovation-review-actions");
    const copyButton = createNode("button", "button secondary", "Скопировать интерактив");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyInnovationReviewReport(packageData, familyMap, blueprintMap, copyButton));
    const resetButton = createNode("button", "button ghost", "Сбросить интерактив");
    resetButton.type = "button";
    resetButton.addEventListener("click", () => {
      resetPackageInnovationReview(packageData.variantId);
      refreshApprovalOverview();
      renderPackages(currentDigitalShift);
    });
    actions.append(copyButton, resetButton);

    panel.append(head, gateNote, grid, actions);
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

  function renderFinalAssetInspectionPanel(packageData) {
    const summary = getPackageFinalAssetInspectionSummary(packageData);
    const finalGate = getPackageGateRows(packageData).find((gate) => gate.id === "final_assets");
    const canInspect = finalGate?.status === "pending";
    const panel = createNode("section", "approval-package-block approval-final-inspection-panel");
    const head = createNode("div", "approval-final-inspection-head");
    head.append(
      createNode("h3", "", "Повторный осмотр final assets"),
      createNode(
        "span",
        "",
        `${summary.accepted}/${summary.total} принято · ${summary.awaiting} ждёт · ${summary.needsRevision} правок · ${summary.rejected} отклонено`
      )
    );

    const gateNote = createNode(
      "p",
      "approval-final-inspection-gate",
      canInspect
        ? "После генерации final files зафиксируйте фактический путь, статус и замечание по каждому изображению. Подключение всё равно требует отдельного connect-review."
        : "Повторный осмотр final assets активируется только после РП/КТП, согласованного preview, общего gate и принятого preview inspection."
    );

    const grid = createNode("div", "approval-final-inspection-grid");
    (packageData.previewAssets || []).forEach((asset) => {
      const inspection = getFinalAssetInspection(asset.id, asset);
      const meta = getFinalAssetInspectionMeta(inspection.status);
      const card = createNode("article", "approval-final-inspection-card");
      card.dataset.status = inspection.status;
      card.append(
        createNode("span", "approval-final-inspection-status", meta.status),
        createNode("strong", "", asset.kind === "scene" ? "Финальный вид цеха" : "Финальная контрольная партия"),
        createNode("code", "", asset.targetPath),
        createNode("p", "", asset.visualPurpose || ""),
        renderList(asset.inspectionChecklist || [], "approval-final-inspection-checklist")
      );

      const pathField = createNode("label", "approval-final-inspection-path-field");
      const actualPath = createNode("input", "approval-final-inspection-path");
      actualPath.type = "text";
      actualPath.value = inspection.actualPath;
      actualPath.disabled = !canInspect;
      actualPath.placeholder = asset.targetPath || "/assets/pm01/generated/digital-shift/...";
      actualPath.addEventListener("input", () => {
        setFinalAssetInspection(asset.id, { actualPath: actualPath.value });
      });
      pathField.append(createNode("span", "", "Фактический final path"), actualPath);

      const options = createNode("div", "approval-final-inspection-options");
      FINAL_ASSET_INSPECTION_OPTIONS.forEach((option) => {
        const button = createNode("button", "approval-final-inspection-button", option.label);
        button.type = "button";
        button.dataset.status = option.id;
        button.classList.toggle("is-active", inspection.status === option.id);
        button.disabled = !canInspect;
        button.addEventListener("click", () => {
          setFinalAssetInspection(asset.id, { status: option.id, actualPath: actualPath.value || asset.targetPath || "" });
          refreshApprovalOverview();
          renderPackages(currentDigitalShift);
        });
        options.appendChild(button);
      });

      const noteField = createNode("label", "approval-final-inspection-note-field");
      const note = createNode("textarea", "approval-final-inspection-note");
      note.value = inspection.note;
      note.disabled = !canInspect;
      note.placeholder = "Что принять, исправить или отклонить в финальном изображении";
      note.addEventListener("input", () => {
        setFinalAssetInspection(asset.id, { note: note.value });
      });
      noteField.append(createNode("span", "", "Заметка final-осмотра"), note);

      const resetButton = createNode("button", "button ghost", "Сбросить final-осмотр");
      resetButton.type = "button";
      resetButton.disabled = !canInspect;
      resetButton.addEventListener("click", () => {
        resetFinalAssetInspection(asset.id);
        refreshApprovalOverview();
        renderPackages(currentDigitalShift);
      });

      card.append(pathField, options, noteField, resetButton);
      grid.appendChild(card);
    });

    const actions = createNode("div", "approval-final-inspection-actions");
    const copyButton = createNode("button", "button secondary", "Скопировать final-отчёт");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyFinalAssetInspectionReport(packageData, copyButton));
    const downloadButton = createNode("button", "button secondary", "Скачать final-отчёт");
    downloadButton.type = "button";
    downloadButton.addEventListener("click", () => downloadFinalAssetInspectionReport(packageData, downloadButton));
    actions.append(copyButton, downloadButton);

    panel.append(head, gateNote, grid, actions);
    return panel;
  }

  function renderConnectionReviewPanel(packageData) {
    const review = getPackageConnectionReview(packageData.variantId);
    const meta = getConnectionReviewMeta(review.status);
    const finalAccepted = isPackageFinalAssetInspectionAccepted(packageData);
    const finalSummary = getPackageFinalAssetInspectionSummary(packageData);
    const panel = createNode("section", "approval-package-block approval-connection-review-panel");
    panel.dataset.status = review.status;
    const head = createNode("div", "approval-connection-review-head");
    head.append(
      createNode("h3", "", "Connect-review final assets"),
      createNode("span", "", `${meta.status} · final inspection ${finalSummary.accepted}/${finalSummary.total}`)
    );

    const gateNote = createNode(
      "p",
      "approval-connection-review-gate",
      finalAccepted
        ? "Зафиксируйте отдельное решение преподавателя о подключении final assets. Даже статус «Разрешить» не меняет экзамен автоматически."
        : "Connect-review активируется только после accepted_final по всем final assets цеха."
    );

    const assetList = renderList(
      (packageData.previewAssets || []).map((asset) => {
        const inspection = getFinalAssetInspection(asset.id, asset);
        return `${asset.id}: ${inspection.actualPath || asset.targetPath} (${inspection.status})`;
      }),
      "approval-connection-review-assets"
    );

    const options = createNode("div", "approval-connection-review-options");
    CONNECTION_REVIEW_OPTIONS.forEach((option) => {
      const button = createNode("button", "approval-connection-review-button", option.label);
      button.type = "button";
      button.dataset.status = option.id;
      button.classList.toggle("is-active", review.status === option.id);
      button.disabled = !finalAccepted;
      button.title = option.detail;
      button.addEventListener("click", () => {
        setPackageConnectionReview(packageData.variantId, { status: option.id });
        refreshApprovalOverview();
        renderPackages(currentDigitalShift);
      });
      options.appendChild(button);
    });

    const noteField = createNode("label", "approval-connection-review-note-field");
    const note = createNode("textarea", "approval-connection-review-note");
    note.value = review.note;
    note.disabled = !finalAccepted;
    note.placeholder = "Решение преподавателя: что подключаем, что ждёт правки, какие ограничения оставить";
    note.addEventListener("input", () => {
      setPackageConnectionReview(packageData.variantId, { note: note.value });
    });
    noteField.append(createNode("span", "", "Заметка connect-review"), note);

    const actions = createNode("div", "approval-connection-review-actions");
    const copyButton = createNode("button", "button secondary", "Скопировать connect-отчёт");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyConnectionReviewReport(packageData, copyButton));
    const downloadButton = createNode("button", "button secondary", "Скачать connect-отчёт");
    downloadButton.type = "button";
    downloadButton.addEventListener("click", () => downloadConnectionReviewReport(packageData, downloadButton));
    const resetButton = createNode("button", "button ghost", "Сбросить connect-review");
    resetButton.type = "button";
    resetButton.disabled = !finalAccepted;
    resetButton.addEventListener("click", () => {
      resetPackageConnectionReview(packageData.variantId);
      refreshApprovalOverview();
      renderPackages(currentDigitalShift);
    });
    actions.append(copyButton, downloadButton, resetButton);

    panel.append(head, gateNote, assetList, options, noteField, actions);
    return panel;
  }

  function renderShopApprovalPackagePanel(packageData, familyMap, blueprintMap) {
    const gateSummary = getPackageGateSummary(packageData);
    const inspectionSummary = getPackageInspectionSummary(packageData);
    const finalInspectionSummary = getPackageFinalAssetInspectionSummary(packageData);
    const nextAction = getPackageNextAction(packageData);
    const panel = createNode("section", "approval-package-block approval-shop-package");
    panel.dataset.status = nextAction.status;
    const head = createNode("div", "approval-shop-package-head");
    const title = createNode("div");
    title.append(
      createNode("h3", "", "Пакет согласования цеха"),
      createNode("span", "", "Единый Markdown для преподавателя: темы, задания, промпты, preview, gates и границы до РП")
    );
    const actions = createNode("div", "approval-shop-package-actions");
    const copyButton = createNode("button", "button secondary", "Скопировать пакет");
    copyButton.type = "button";
    copyButton.addEventListener("click", () => copyShopApprovalPackage(packageData, familyMap, blueprintMap, copyButton));
    const downloadButton = createNode("button", "button secondary", "Скачать .md");
    downloadButton.type = "button";
    downloadButton.addEventListener("click", () => downloadShopApprovalPackage(packageData, familyMap, blueprintMap, downloadButton));
    actions.append(copyButton, downloadButton);
    head.append(title, actions);

    const metrics = createNode("div", "approval-shop-package-grid");
    [
      ["Следующий шаг", nextAction.title, nextAction.detail],
      ["Задания", `${(packageData.tasks || []).length}/5`, "Пять современных семейств в тренировочной PX-версии."],
      ["Preview", `${(packageData.previewAssets || []).length}/2`, `Осмотр: ${inspectionSummary.accepted}/${inspectionSummary.total} принято.`],
      ["Final assets", `${finalInspectionSummary.accepted}/${finalInspectionSummary.total}`, "Повторный осмотр final files перед отдельным connect-review."],
      ["Gates", `${gateSummary.done}/${gateSummary.gates.length}`, `${gateSummary.blocked} блоков · ${gateSummary.pending} ожиданий.`]
    ].forEach(([label, value, detail]) => {
      const card = createNode("article", "approval-shop-package-card");
      card.append(createNode("span", "", label), createNode("strong", "", value), createNode("p", "", detail));
      metrics.appendChild(card);
    });

    const note = createNode(
      "p",
      "approval-shop-package-note",
      "Пакет можно отправлять на согласование до генерации final assets; он не меняет официальный экзамен и не открывает ответы."
    );
    panel.append(head, metrics, note);
    return panel;
  }

  function renderPackage(packageData, familyMap, blueprintMap, index) {
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
      renderShopApprovalPackagePanel(packageData, familyMap, blueprintMap),
      renderApprovalGates(packageData),
      topics,
      renderRpIntake(packageData),
      renderCompetencyReviewPanel(packageData),
      renderMethodicalMatrix(packageData),
      renderInnovationReviewPanel(packageData, familyMap, blueprintMap),
      renderShiftCockpit(packageData),
      tasks,
      log,
      prompts,
      assetPlan,
      renderPreviewInspectionPanel(packageData),
      renderFinalAssetInspectionPanel(packageData),
      renderConnectionReviewPanel(packageData),
      renderDecisionControls(packageData),
      criteria
    );
    return section;
  }

  function renderPackages(digitalShift) {
    elements.packagesList.innerHTML = "";
    const familyMap = new Map((digitalShift.families || []).map((family) => [family.id, family]));
    const blueprintMap = new Map((digitalShift.interactionBlueprints || []).map((blueprint) => [blueprint.familyId, blueprint]));
    (digitalShift.packages || []).forEach((packageData, index) => {
      elements.packagesList.appendChild(renderPackage(packageData, familyMap, blueprintMap, index));
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
