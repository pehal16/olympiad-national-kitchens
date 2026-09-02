"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { LearningError } = require("./errors");
const { getLearningRuntime } = require("./repository");
const {
  normalizeDiskPath,
  ensureFolder,
  uploadBuffer,
  downloadBuffer,
  deleteResource
} = require("../yandex-disk");

const MAX_FILE_BYTES = Number(process.env.LEARNING_FILE_MAX_BYTES || 25 * 1024 * 1024);
const ALLOWED_TYPES = new Map([
  ["application/pdf", [".pdf"]],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", [".docx"]],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", [".xlsx"]],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", [".pptx"]],
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/png", [".png"]],
  ["image/webp", [".webp"]]
]);

function sanitizeFileName(value) {
  const name = path.basename(String(value || "file"))
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"/\\|?*]/g, "_")
    .trim();
  return (name || "file").slice(0, 180);
}

function validateFileDeclaration({ fileName, mimeType, byteSize }) {
  const safeName = sanitizeFileName(fileName);
  const normalizedType = String(mimeType || "").toLowerCase().split(";")[0].trim();
  const extensions = ALLOWED_TYPES.get(normalizedType);
  const extension = path.extname(safeName).toLowerCase();
  if (!extensions || !extensions.includes(extension)) {
    throw new LearningError(
      "Разрешены PDF, DOCX, XLSX, PPTX, JPG, PNG и WEBP.",
      400,
      "file_type_rejected"
    );
  }
  const size = Number(byteSize || 0);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_BYTES) {
    throw new LearningError(
      `Размер файла должен быть от 1 байта до ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)} МБ.`,
      400,
      "file_size_rejected"
    );
  }
  return { fileName: safeName, mimeType: normalizedType, byteSize: size, extension };
}

function hasExpectedSignature(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) return false;
  if (mimeType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  if (mimeType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  if (mimeType.includes("openxmlformats-officedocument")) {
    return buffer[0] === 0x50 && buffer[1] === 0x4b;
  }
  return false;
}

function objectKey({ submissionId, attachmentId, extension }) {
  return `learning/${encodeURIComponent(submissionId)}/${attachmentId}${extension}`;
}

function safeLocalPath(root, key) {
  const relative = String(key || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!relative || relative.includes("..")) {
    throw new LearningError("Некорректный ключ файла.", 400, "invalid_object_key");
  }
  const target = path.resolve(root, ...relative.split("/"));
  const safeRoot = path.resolve(root);
  if (target !== safeRoot && !target.startsWith(`${safeRoot}${path.sep}`)) {
    throw new LearningError("Некорректный ключ файла.", 400, "invalid_object_key");
  }
  return target;
}

function safeObjectKey(key) {
  const relative = String(key || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = relative.split("/").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === "..")) {
    throw new LearningError("Некорректный ключ файла.", 400, "invalid_object_key");
  }
  return parts.join("/");
}

function yandexObjectPath(folder, key) {
  const root = normalizeDiskPath(folder || "/olympiad-results").replace(/\/+$/, "");
  return `${root}/learning-files/${safeObjectKey(key)}`;
}

function parentDiskPath(remotePath) {
  const index = String(remotePath || "").lastIndexOf("/");
  return index > 0 ? remotePath.slice(0, index) : remotePath;
}

function contentTypeForKey(key) {
  const extension = path.extname(String(key || "")).toLowerCase();
  for (const [mimeType, extensions] of ALLOWED_TYPES.entries()) {
    if (extensions.includes(extension)) return mimeType;
  }
  return "application/octet-stream";
}

class LearningFileStore {
  constructor() {
    const runtime = getLearningRuntime();
    this.r2 = runtime.files || null;
    const disk = runtime.yandexDisk || null;
    this.yandexDisk = disk && disk.enabled !== false && disk.oauthToken
      ? {
          oauthToken: String(disk.oauthToken),
          folder: String(disk.folder || "/olympiad-results")
        }
      : null;
    this.cloudMode = Boolean(runtime.db);
    const storageDir = runtime.storageDir || process.env.STORAGE_DIR || path.join(process.cwd(), "storage");
    this.localRoot = path.resolve(storageDir, "learning-files");
  }

  backend() {
    if (this.r2) return "r2";
    if (this.yandexDisk) return "yandex-disk";
    return "file";
  }

  async put(key, buffer, metadata = {}) {
    if (this.cloudMode && !this.r2 && !this.yandexDisk) {
      throw new LearningError("Хранилище учебных файлов не настроено.", 503, "file_storage_unavailable");
    }
    if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer || "");
    if (buffer.length > MAX_FILE_BYTES) {
      throw new LearningError("Файл превышает допустимый размер.", 413, "file_too_large");
    }
    if (this.r2) {
      await this.r2.put(key, buffer, {
        httpMetadata: { contentType: metadata.mimeType || "application/octet-stream" },
        customMetadata: {
          attachmentId: String(metadata.attachmentId || ""),
          submissionId: String(metadata.submissionId || "")
        }
      });
      return;
    }
    if (this.yandexDisk) {
      const remotePath = yandexObjectPath(this.yandexDisk.folder, key);
      await ensureFolder(parentDiskPath(remotePath), this.yandexDisk.oauthToken);
      await uploadBuffer(remotePath, buffer, this.yandexDisk.oauthToken);
      return;
    }
    const target = safeLocalPath(this.localRoot, key);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(temporary, buffer, { mode: 0o600 });
    await fs.promises.rename(temporary, target);
  }

  async get(key) {
    if (this.cloudMode && !this.r2 && !this.yandexDisk) {
      throw new LearningError("Хранилище учебных файлов не настроено.", 503, "file_storage_unavailable");
    }
    if (this.r2) {
      const object = await this.r2.get(key);
      if (!object) return null;
      return {
        body: Buffer.from(await object.arrayBuffer()),
        contentType: object.httpMetadata?.contentType || "application/octet-stream",
        customMetadata: { ...(object.customMetadata || {}) }
      };
    }
    if (this.yandexDisk) {
      const body = await downloadBuffer(
        yandexObjectPath(this.yandexDisk.folder, key),
        this.yandexDisk.oauthToken
      );
      if (!body) return null;
      return {
        body,
        contentType: contentTypeForKey(key),
        customMetadata: null
      };
    }
    const target = safeLocalPath(this.localRoot, key);
    try {
      return {
        body: await fs.promises.readFile(target),
        contentType: "application/octet-stream",
        customMetadata: null
      };
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(key) {
    if (this.cloudMode && !this.r2 && !this.yandexDisk) {
      throw new LearningError("Хранилище учебных файлов не настроено.", 503, "file_storage_unavailable");
    }
    if (this.r2) {
      await this.r2.delete(key);
      return;
    }
    if (this.yandexDisk) {
      await deleteResource(
        yandexObjectPath(this.yandexDisk.folder, key),
        this.yandexDisk.oauthToken
      );
      return;
    }
    const target = safeLocalPath(this.localRoot, key);
    try {
      await fs.promises.unlink(target);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

module.exports = {
  MAX_FILE_BYTES,
  ALLOWED_TYPES,
  LearningFileStore,
  sanitizeFileName,
  validateFileDeclaration,
  hasExpectedSignature,
  objectKey,
  yandexObjectPath,
  sha256
};
