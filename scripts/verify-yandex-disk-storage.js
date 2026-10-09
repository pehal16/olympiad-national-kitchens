"use strict";

const crypto = require("crypto");
const {
  normalizeDiskPath,
  ensureFolder,
  uploadBuffer,
  downloadBuffer,
  deleteResource
} = require("../src/yandex-disk");

async function retryStorageOperation(operation, { wait = ms => new Promise(resolve => setTimeout(resolve, ms)), warn = console.warn } = {}) {
  for (let attempt = 1; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      const transient = /^(?:Яндекс Диск API|Загрузка на Яндекс Диск не удалась|Скачивание с Яндекс Диска не удалось): 5\d\d\b/.test(error?.message || "") ||
        (error?.name === "TypeError" && error.message === "fetch failed");
      if (!transient || attempt >= 3) throw error;
      const delay = attempt * 10000;
      warn(`Временная ошибка хранилища; повтор ${attempt + 1} из 3 через ${delay / 1000} секунд.`);
      await wait(delay);
    }
  }
}

async function verifyStorage({ oauthToken, configuredFolder = "/olympiad-results", operations = { ensureFolder, uploadBuffer, downloadBuffer, deleteResource }, retry = retryStorageOperation }) {
  if (!oauthToken) throw new Error("YANDEX_DISK_OAUTH_TOKEN is required.");

  const learningFolder = `${normalizeDiskPath(configuredFolder).replace(/\/+$/, "")}/learning-files`;
  const probePath = `${learningFolder}/.storage-check-${crypto.randomUUID()}.txt`;
  const probe = Buffer.from(`learning-storage-check:${Date.now()}`, "utf8");
  let uploaded = false;

  try {
    await retry(() => operations.ensureFolder(learningFolder, oauthToken));
    await retry(() => operations.uploadBuffer(probePath, probe, oauthToken));
    uploaded = true;
    const downloaded = await retry(() => operations.downloadBuffer(probePath, oauthToken));
    if (!downloaded || downloaded.length !== probe.length || !crypto.timingSafeEqual(downloaded, probe)) {
      throw new Error("Yandex Disk storage round-trip returned different content.");
    }
  } finally {
    if (uploaded) await retry(() => operations.deleteResource(probePath, oauthToken));
  }

  console.log("Yandex Disk private storage read/write/delete check passed.");
}

module.exports = { retryStorageOperation, verifyStorage };

if (require.main === module) verifyStorage({
  oauthToken: String(process.env.YANDEX_DISK_OAUTH_TOKEN || "").trim(),
  configuredFolder: String(process.env.YANDEX_DISK_FOLDER || "/olympiad-results").trim()
}).catch((error) => {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
});
