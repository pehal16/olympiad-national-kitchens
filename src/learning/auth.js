"use strict";

const crypto = require("crypto");
const { LearningError } = require("./errors");

const DEFAULT_ITERATIONS = Number(process.env.LEARNING_PASSWORD_ITERATIONS || 210_000);
const MIN_PASSWORD_LENGTH = 10;
const SESSION_COOKIE = "learning_session";

function normalizeLogin(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function validateLogin(value) {
  const login = normalizeLogin(value);
  if (!/^[a-zа-яё0-9][a-zа-яё0-9._-]{2,63}$/iu.test(login)) {
    throw new LearningError(
      "Логин должен содержать от 3 до 64 букв, цифр, точек, дефисов или знаков подчёркивания.",
      400,
      "invalid_login"
    );
  }
  return login;
}

function validatePassword(password, options = {}) {
  const value = String(password || "");
  const minLength = Number(options.minLength || MIN_PASSWORD_LENGTH);
  if (value.length < minLength || value.length > 128) {
    throw new LearningError(
      `Пароль должен содержать от ${minLength} до 128 символов.`,
      400,
      "invalid_password"
    );
  }
  if (!options.temporary) {
    const hasLetter = /[a-zа-яё]/iu.test(value);
    const hasDigit = /\d/u.test(value);
    if (!hasLetter || !hasDigit) {
      throw new LearningError(
        "Пароль должен содержать буквы и цифры.",
        400,
        "weak_password"
      );
    }
  }
  return value;
}

function pbkdf2Async(value, salt, iterations) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(value, salt, iterations, 32, "sha256", (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

async function hashPassword(password, options = {}) {
  const value = validatePassword(password, { temporary: Boolean(options.temporary) });
  const iterations = Math.max(10_000, Number(options.iterations || DEFAULT_ITERATIONS));
  const salt = options.salt || crypto.randomBytes(18).toString("base64url");
  const pepper = String(options.pepper || "");
  const key = await pbkdf2Async(`${value}\u0000${pepper}`, salt, iterations);
  return {
    hash: key.toString("base64url"),
    salt,
    iterations,
    algorithm: "pbkdf2-sha256"
  };
}

async function verifyPassword(password, credential, options = {}) {
  if (!credential?.password_hash || !credential?.password_salt) {
    return false;
  }
  const iterations = Number(credential.password_iterations || DEFAULT_ITERATIONS);
  const pepper = String(options.pepper || "");
  const derived = await pbkdf2Async(
    `${String(password || "")}\u0000${pepper}`,
    String(credential.password_salt),
    iterations
  );
  let stored;
  try {
    stored = Buffer.from(String(credential.password_hash), "base64url");
  } catch (error) {
    return false;
  }
  return stored.length === derived.length && crypto.timingSafeEqual(stored, derived);
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || ""), "utf8").digest("hex");
}

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(14);
  let result = "";
  for (const byte of bytes) {
    result += alphabet[byte % alphabet.length];
  }
  return `${result.slice(0, 7)}-${result.slice(7)}9`;
}

function parseCookies(req) {
  const raw = String(req?.headers?.cookie || req?.headers?.Cookie || "");
  const cookies = {};
  raw.split(";").forEach((part) => {
    const index = part.indexOf("=");
    if (index < 1) {
      return;
    }
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    try {
      cookies[key] = decodeURIComponent(value);
    } catch (error) {
      cookies[key] = value;
    }
  });
  return cookies;
}

function isSecureRequest(req) {
  const forwarded = String(req?.headers?.["x-forwarded-proto"] || "").toLowerCase();
  const cfVisitor = String(req?.headers?.["cf-visitor"] || "");
  return forwarded === "https" || /"scheme"\s*:\s*"https"/i.test(cfVisitor);
}

function sessionCookie(token, req, options = {}) {
  const maxAge = Number(options.maxAgeSeconds ?? 12 * 60 * 60);
  const secure = options.secure === undefined ? isSecureRequest(req) : Boolean(options.secure);
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`
  ]
    .filter(Boolean)
    .join("; ");
}

function clearSessionCookie(req) {
  return sessionCookie("", req, { maxAgeSeconds: 0 });
}

function sessionTokenFromRequest(req) {
  return parseCookies(req)[SESSION_COOKIE] || "";
}

module.exports = {
  DEFAULT_ITERATIONS,
  MIN_PASSWORD_LENGTH,
  SESSION_COOKIE,
  normalizeLogin,
  validateLogin,
  validatePassword,
  hashPassword,
  verifyPassword,
  randomToken,
  hashToken,
  temporaryPassword,
  parseCookies,
  sessionCookie,
  clearSessionCookie,
  sessionTokenFromRequest,
  isSecureRequest
};
