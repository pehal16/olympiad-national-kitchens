let fsModule = null;
let pathModule = null;

function getFs() {
  if (!fsModule) {
    fsModule = require("fs");
  }
  return fsModule;
}

function getPath() {
  if (!pathModule) {
    pathModule = require("path");
  }
  return pathModule;
}

function ensureDir(dirPath) {
  getFs().mkdirSync(dirPath, { recursive: true });
}

function ensureJsonFile(filePath, fallbackData) {
  const fs = getFs();
  ensureDir(getPath().dirname(filePath));
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallbackData, null, 2), "utf8");
  }
}

function readJson(filePath, fallbackData) {
  const fs = getFs();
  ensureJsonFile(filePath, fallbackData);
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  ensureDir(getPath().dirname(filePath));
  getFs().writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req, options = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const maxBytes = Number(options.maxBytes || 8 * 1024 * 1024);
    let totalBytes = 0;
    let rejected = false;

    req.on("data", (chunk) => {
      if (rejected) {
        return;
      }
      totalBytes += chunk.length;
      if (maxBytes > 0 && totalBytes > maxBytes) {
        rejected = true;
        const error = new Error("Тело запроса слишком большое.");
        error.statusCode = 413;
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (rejected) {
        return;
      }
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        resolve(data);
      } catch (error) {
        const parseError = new Error("Некорректный JSON в теле запроса.");
        parseError.statusCode = 400;
        reject(parseError);
      }
    });
    req.on("error", reject);
  });
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function shuffleArray(items) {
  const copy = Array.isArray(items) ? [...items] : [];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function unique(items) {
  return [...new Set(items)];
}

module.exports = {
  ensureDir,
  ensureJsonFile,
  readJson,
  writeJson,
  sendJson,
  parseBody,
  normalizeText,
  generateId,
  nowIso,
  safeNumber,
  shuffleArray,
  unique
};
