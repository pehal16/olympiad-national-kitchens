"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const {
  hashPassword,
  verifyPassword,
  MAX_PORTABLE_PBKDF2_ITERATIONS,
  sessionCookie,
  clearSessionCookie,
  sessionTokenFromRequest
} = require("../src/learning/auth");
const { assertSameOrigin, routeMatch } = require("../src/learning/http");
const {
  sanitizeFileName,
  validateFileDeclaration,
  hasExpectedSignature,
  objectKey
} = require("../src/learning/files");

test("learning credentials are salted, peppered and compared safely", async () => {
  const first = await hashPassword("SecurePassword2026", { iterations: 10_000, pepper: "pepper" });
  const second = await hashPassword("SecurePassword2026", { iterations: 10_000, pepper: "pepper" });
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(await verifyPassword("SecurePassword2026", {
    password_hash: first.hash,
    password_salt: first.salt,
    password_iterations: first.iterations
  }, { pepper: "pepper" }), true);
  assert.equal(await verifyPassword("SecurePassword2026", {
    password_hash: first.hash,
    password_salt: first.salt,
    password_iterations: first.iterations
  }, { pepper: "wrong" }), false);
});

test("learning password hashing matches the PBKDF2 SHA-256 contract", async () => {
  const password = "WorkerCompatible2026";
  const pepper = "deployment-pepper";
  const salt = "fixed-base64url-salt";
  const iterations = 10_000;
  const result = await hashPassword(password, { pepper, salt, iterations });
  const expected = crypto
    .pbkdf2Sync(`${password}\u0000${pepper}`, salt, iterations, 32, "sha256")
    .toString("base64url");

  assert.equal(result.hash, expected);
  assert.equal(result.algorithm, "pbkdf2-sha256");
});

test("learning password hashing stays within the Cloudflare Workers PBKDF2 limit", async () => {
  const result = await hashPassword("PortablePassword2026", { iterations: 210_000 });
  assert.equal(result.iterations, MAX_PORTABLE_PBKDF2_ITERATIONS);
  assert.equal(result.iterations, 100_000);
});

test("learning session cookie is HttpOnly, same-site and secure behind HTTPS", () => {
  const req = { headers: { "x-forwarded-proto": "https" } };
  const cookie = sessionCookie("secret-token", req, { maxAgeSeconds: 3600 });
  assert.match(cookie, /^learning_session=secret-token;/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
  assert.equal(sessionTokenFromRequest({ headers: { cookie } }), "secret-token");
  assert.match(clearSessionCookie(req), /Max-Age=0/);
});

test("mutating HTTP requests reject a foreign Origin and routes decode ids", () => {
  assert.doesNotThrow(() => assertSameOrigin({ headers: { origin: "https://college.example", host: "college.example" } }));
  assert.throws(
    () => assertSameOrigin({ headers: { origin: "https://attacker.example", host: "college.example" } }),
    (error) => error.code === "origin_rejected" && error.statusCode === 403
  );
  assert.deepEqual(
    routeMatch("/api/learning/attachments/file%20one/download", "/api/learning/attachments/:id/download"),
    { id: "file one" }
  );
});

test("file intake blocks spoofed extensions and checks magic signatures", () => {
  assert.equal(sanitizeFileName("../../отчёт.pdf"), "отчёт.pdf");
  const declaration = validateFileDeclaration({
    fileName: "отчёт.pdf",
    mimeType: "application/pdf",
    byteSize: 1024
  });
  assert.equal(declaration.extension, ".pdf");
  assert.equal(hasExpectedSignature(Buffer.from("%PDF-1.7\n"), "application/pdf"), true);
  assert.equal(hasExpectedSignature(Buffer.from("MZ executable"), "application/pdf"), false);
  assert.throws(
    () => validateFileDeclaration({ fileName: "malware.exe", mimeType: "application/pdf", byteSize: 10 }),
    (error) => error.code === "file_type_rejected"
  );
  assert.equal(objectKey({ submissionId: "sub/1", attachmentId: "file-1", extension: ".pdf" }), "learning/sub%2F1/file-1.pdf");
});
