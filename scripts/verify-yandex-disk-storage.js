"use strict";

const crypto = require("crypto");
const {
  normalizeDiskPath,
  ensureFolder,
  uploadBuffer,
  downloadBuffer,
  deleteResource
} = require("../src/yandex-disk");

async function main() {
  const oauthToken = String(process.env.YANDEX_DISK_OAUTH_TOKEN || "").trim();
  const configuredFolder = String(process.env.YANDEX_DISK_FOLDER || "/olympiad-results").trim();
  if (!oauthToken) throw new Error("YANDEX_DISK_OAUTH_TOKEN is required.");

  const learningFolder = `${normalizeDiskPath(configuredFolder).replace(/\/+$/, "")}/learning-files`;
  const probePath = `${learningFolder}/.storage-check-${crypto.randomUUID()}.txt`;
  const probe = Buffer.from(`learning-storage-check:${Date.now()}`, "utf8");
  let uploaded = false;

  try {
    await ensureFolder(learningFolder, oauthToken);
    await uploadBuffer(probePath, probe, oauthToken);
    uploaded = true;
    const downloaded = await downloadBuffer(probePath, oauthToken);
    if (!downloaded || !crypto.timingSafeEqual(downloaded, probe)) {
      throw new Error("Yandex Disk storage round-trip returned different content.");
    }
  } finally {
    if (uploaded) await deleteResource(probePath, oauthToken);
  }

  console.log("Yandex Disk private storage read/write/delete check passed.");
}

main().catch((error) => {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
});
