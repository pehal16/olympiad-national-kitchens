#!/usr/bin/env node

const baseUrl = normalizeBaseUrl(process.argv[2] || "http://127.0.0.1:3100");

function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

async function getJson(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (error) {
    throw new Error(`${pathname}: expected JSON, got ${text.slice(0, 120)}`);
  }
  return { response, payload };
}

async function getText(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  const text = await response.text();
  return { response, text };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function findSensitivePublicKeys(value, path = "$", hits = []) {
  const sensitiveKeys = new Set([
    "acceptedRange",
    "correctAnswer",
    "correctBuckets",
    "correctHotspots",
    "correctIngredientIds",
    "correctSequence",
    "expected",
    "hotspots",
    "isCorrect",
    "solutionSteps"
  ]);

  if (Array.isArray(value)) {
    value.forEach((item, index) => findSensitivePublicKeys(item, `${path}[${index}]`, hits));
    return hits;
  }

  if (!value || typeof value !== "object") {
    return hits;
  }

  Object.entries(value).forEach(([key, child]) => {
    const childPath = `${path}.${key}`;
    if (sensitiveKeys.has(key)) {
      hits.push(childPath);
    }
    findSensitivePublicKeys(child, childPath, hits);
  });

  return hits;
}

async function main() {
  const checks = [];

  const health = await getJson("/api/health");
  assert(health.response.ok, `/api/health returned ${health.response.status}`);
  assert(health.payload?.ok === true, "/api/health did not return ok=true");
  assert(health.payload?.storageBackend, "/api/health does not expose storageBackend");
  assert(health.payload?.pm01?.id === "pm01-2026-exam", "/api/health does not expose PM01 module");
  assert(health.payload?.pm01?.variants === 5, "/api/health PM01 variants count must be 5");
  checks.push({
    route: "/api/health",
    status: health.response.status,
    storageBackend: health.payload.storageBackend,
    pm01: health.payload.pm01
  });

  const exam = await getJson("/api/pm01/public/exam");
  assert(exam.response.ok, `/api/pm01/public/exam returned ${exam.response.status}`);
  assert(exam.payload?.ok === true, "/api/pm01/public/exam did not return ok=true");
  const sensitiveKeyHits = findSensitivePublicKeys(exam.payload.data);
  assert(
    sensitiveKeyHits.length === 0,
    `PM01 public exam exposes private answer keys: ${sensitiveKeyHits.join(", ")}`
  );
  assert(exam.payload?.data?.variants?.length === 5, "PM01 public exam must expose 5 variants");
  assert(exam.payload?.data?.modules?.length === 5, "PM01 public exam must expose 5 modules");
  assert(exam.payload?.data?.assetRegistry?.workshops?.vegetables, "PM01 asset registry is missing workshop images");
  assert(exam.payload?.data?.digitalShift?.mode === "training_extension", "PM01 digital shift package is missing");
  assert(exam.payload?.data?.digitalShift?.packages?.length === 5, "PM01 digital shift must expose 5 shop packages");
  assert(
    exam.payload?.data?.digitalShift?.normativeAnchors?.length === 4,
    "PM01 digital shift must expose 4 normative anchors"
  );
  assert(
    exam.payload?.data?.digitalShift?.interactionBlueprints?.length === 5,
    "PM01 digital shift must expose 5 interaction blueprints"
  );
  assert(
    exam.payload?.data?.digitalShift?.visualAssetRubric?.status === "approval_required_before_final_asset",
    "PM01 digital shift must expose visual asset rubric"
  );
  const previewAssets = exam.payload.data.digitalShift.packages.flatMap((packageData) => packageData.previewAssets || []);
  const matrixRows = exam.payload.data.digitalShift.packages.flatMap((packageData) => packageData.methodicalMatrix || []);
  const cockpitPlans = exam.payload.data.digitalShift.packages.map((packageData) => packageData.shiftCockpit || null);
  assert(previewAssets.length === 10, "PM01 digital shift must expose 10 planned preview assets");
  assert(matrixRows.length === 25, "PM01 digital shift must expose 25 methodical matrix rows");
  assert(
    cockpitPlans.length === 5 &&
      cockpitPlans.every(
        (cockpit) =>
          cockpit &&
          cockpit.status === "training_only_cockpit" &&
          cockpit.approvalGate === "requires_rp_preview_and_ui_approval" &&
          Array.isArray(cockpit.layout) &&
          cockpit.layout.length >= 5 &&
          Array.isArray(cockpit.operationTimeline) &&
          cockpit.operationTimeline.length === 5 &&
          Array.isArray(cockpit.journalSignals) &&
          cockpit.journalSignals.length >= 4 &&
          Array.isArray(cockpit.rightPanel?.competencies) &&
          cockpit.rightPanel.competencies.length >= 4
      ),
    "PM01 digital shift must expose training-only cockpit plans for all packages"
  );
  assert(
    previewAssets.every(
      (asset) =>
        asset.status === "awaiting_preview" &&
        asset.finalAsset === false &&
        asset.targetPath?.startsWith("/assets/pm01/generated/digital-shift/") &&
        Array.isArray(asset.styleReferences) &&
        asset.styleReferences.length >= 2 &&
        Array.isArray(asset.inspectionChecklist) &&
        asset.inspectionChecklist.length >= 7 &&
        asset.inspectionGate === "visual_inspection_before_connection" &&
        asset.outputUse === "preview_only_until_teacher_approval"
    ),
    "PM01 preview assets must stay planned and carry style/inspection metadata"
  );
  checks.push({
    route: "/api/pm01/public/exam",
    status: exam.response.status,
    variants: exam.payload.data.variants.length,
    modules: exam.payload.data.modules.length,
    digitalShiftNormativeAnchors: exam.payload.data.digitalShift.normativeAnchors.length,
    digitalShiftInteractionBlueprints: exam.payload.data.digitalShift.interactionBlueprints.length,
    digitalShiftVisualRubric: exam.payload.data.digitalShift.visualAssetRubric.status,
    digitalShiftPackages: exam.payload.data.digitalShift.packages.length,
    digitalShiftPreviewAssets: previewAssets.length,
    digitalShiftCockpits: cockpitPlans.length,
    digitalShiftMatrixRows: matrixRows.length,
    privateAnswerKeyFields: sensitiveKeyHits.length
  });

  const student = await getText("/pm01.html");
  assert(student.response.ok, `/pm01.html returned ${student.response.status}`);
  assert(student.text.includes("/pm01.js?v=1.0.25"), "/pm01.html does not include current student JS");
  assert(student.text.includes("/pm01.css?v=1.0.30"), "/pm01.html does not include current CSS");
  checks.push({ route: "/pm01.html", status: student.response.status, bytes: student.text.length });

  const admin = await getText("/pm01-admin.html");
  assert(admin.response.ok, `/pm01-admin.html returned ${admin.response.status}`);
  assert(admin.text.includes("/pm01-admin.js"), "/pm01-admin.html does not include admin JS");
  checks.push({ route: "/pm01-admin.html", status: admin.response.status, bytes: admin.text.length });

  const approval = await getText("/pm01-approval.html");
  assert(approval.response.ok, `/pm01-approval.html returned ${approval.response.status}`);
  assert(approval.text.includes("/pm01.css?v=1.0.30"), "/pm01-approval.html does not include current CSS");
  assert(approval.text.includes("/pm01-approval.js?v=1.0.7"), "/pm01-approval.html does not include current approval JS");
  assert(approval.text.includes("Согласование PX"), "/pm01-approval.html does not include approval title");
  checks.push({ route: "/pm01-approval.html", status: approval.response.status, bytes: approval.text.length });

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        checkedAt: new Date().toISOString(),
        checks
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        baseUrl,
        checkedAt: new Date().toISOString(),
        error: error.message
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
