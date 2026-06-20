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
  assert(exam.payload?.data?.variants?.length === 5, "PM01 public exam must expose 5 variants");
  assert(exam.payload?.data?.modules?.length === 5, "PM01 public exam must expose 5 modules");
  assert(exam.payload?.data?.assetRegistry?.workshops?.vegetables, "PM01 asset registry is missing workshop images");
  assert(exam.payload?.data?.digitalShift?.mode === "training_extension", "PM01 digital shift package is missing");
  assert(exam.payload?.data?.digitalShift?.packages?.length === 5, "PM01 digital shift must expose 5 shop packages");
  checks.push({
    route: "/api/pm01/public/exam",
    status: exam.response.status,
    variants: exam.payload.data.variants.length,
    modules: exam.payload.data.modules.length,
    digitalShiftPackages: exam.payload.data.digitalShift.packages.length
  });

  const student = await getText("/pm01.html");
  assert(student.response.ok, `/pm01.html returned ${student.response.status}`);
  assert(student.text.includes("/pm01.js"), "/pm01.html does not include student JS");
  checks.push({ route: "/pm01.html", status: student.response.status, bytes: student.text.length });

  const admin = await getText("/pm01-admin.html");
  assert(admin.response.ok, `/pm01-admin.html returned ${admin.response.status}`);
  assert(admin.text.includes("/pm01-admin.js"), "/pm01-admin.html does not include admin JS");
  checks.push({ route: "/pm01-admin.html", status: admin.response.status, bytes: admin.text.length });

  const approval = await getText("/pm01-approval.html");
  assert(approval.response.ok, `/pm01-approval.html returned ${approval.response.status}`);
  assert(approval.text.includes("/pm01-approval.js"), "/pm01-approval.html does not include approval JS");
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
