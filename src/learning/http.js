"use strict";

const { LearningError } = require("./errors");

function parseJsonBody(req, options = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const maxBytes = Number(options.maxBytes || 1024 * 1024);
    let total = 0;
    let settled = false;

    req.on("data", (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > maxBytes) {
        settled = true;
        reject(new LearningError("Тело запроса слишком большое.", 413, "payload_too_large"));
        if (typeof req.destroy === "function") req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(new LearningError("Некорректный JSON.", 400, "invalid_json"));
      }
    });
    req.on("error", (error) => {
      if (!settled) reject(error);
    });
  });
}

function readBuffer(req, options = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const maxBytes = Number(options.maxBytes || 25 * 1024 * 1024);
    let total = 0;
    let settled = false;
    req.on("data", (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > maxBytes) {
        settled = true;
        reject(new LearningError("Файл превышает допустимый размер.", 413, "file_too_large"));
        if (typeof req.destroy === "function") req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!settled) resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers
  });
  res.end(JSON.stringify(payload));
}

function sendLearningError(res, error) {
  const statusCode = Number(error?.statusCode || error?.status || 500);
  sendJson(res, statusCode >= 400 && statusCode <= 599 ? statusCode : 500, {
    ok: false,
    error: {
      code: error?.code || "internal_error",
      message: statusCode >= 500 ? "Внутренняя ошибка сервера." : error?.message || "Ошибка запроса.",
      details: statusCode >= 500 ? null : error?.details || null
    }
  });
}

function routeMatch(pathname, pattern) {
  const names = [];
  const escaped = pattern
    .split("/")
    .map((part) => {
      if (part.startsWith(":")) {
        names.push(part.slice(1));
        return "([^/]+)";
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  const match = String(pathname).match(new RegExp(`^${escaped}$`));
  if (!match) return null;
  return Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1])]));
}

function requestOrigin(req) {
  return String(req?.headers?.origin || "").trim();
}

function requestHost(req) {
  return String(req?.headers?.host || req?.headers?.["x-forwarded-host"] || "").trim();
}

function assertSameOrigin(req) {
  const origin = requestOrigin(req);
  if (!origin) return;
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch (error) {
    throw new LearningError("Некорректный Origin.", 403, "origin_rejected");
  }
  if (originHost !== requestHost(req)) {
    throw new LearningError("Источник запроса не разрешён.", 403, "origin_rejected");
  }
}

module.exports = {
  parseJsonBody,
  readBuffer,
  sendJson,
  sendLearningError,
  routeMatch,
  assertSameOrigin
};
