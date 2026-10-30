import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
const scrypt = promisify(crypto.scrypt);
export const now = () => new Date().toISOString();
export const id = (prefix = "id") => `${prefix}_${crypto.randomUUID()}`;
export const token = () => crypto.randomBytes(32).toString("base64url");
export const hash = (value) =>
  crypto
    .createHash("sha256")
    .update(
      typeof value === "string" || Buffer.isBuffer(value)
        ? value
        : ArrayBuffer.isView(value)
          ? Buffer.from(value.buffer, value.byteOffset, value.byteLength)
          : JSON.stringify(value),
    )
    .digest("hex");
export const clone = (value) => structuredClone(value);
export function fail(
  condition,
  message,
  status = 400,
  code = "invalid_request",
) {
  if (!condition) throw Object.assign(new Error(message), { status, code });
}
export function cleanText(v, max = 2000) {
  return String(v ?? "")
    .trim()
    .slice(0, max);
}
export function safePath(root, name) {
  const result = path.resolve(root, name);
  fail(
    result.startsWith(path.resolve(root) + path.sep),
    "Недопустимый путь файла.",
  );
  return result;
}
export function safeEqual(a, b) {
  const x = Buffer.from(String(a)),
    y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
export async function passwordHash(password) {
  fail(
    typeof password === "string" &&
      password.length >= 10 &&
      password.length <= 128,
    "Пароль должен содержать от 10 до 128 символов.",
  );
  const salt = token();
  const result = await scrypt(password, salt, 32);
  return `${salt}:${result.toString("hex")}`;
}
export async function passwordCheck(password, stored) {
  const [salt, expected] = String(stored || "").split(":");
  if (!salt || !expected) return false;
  const result = await scrypt(String(password), salt, 32);
  return safeEqual(result.toString("hex"), expected);
}
export function writePrivate(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, { mode: 0o600 });
}
export function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    login: u.login,
    role: u.role,
    permissions: u.permissions,
    active: u.active,
  };
}
export function escapeHtml(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
export function durationDeadline(start, seconds) {
  return Number(seconds) > 0
    ? Date.parse(start) + Number(seconds) * 1000
    : Infinity;
}
