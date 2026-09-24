"use strict";

const http = require("node:http");
const path = require("node:path");
const { createSqliteD1 } = require("./src/sqlite-d1");

const STATIC_FILES = new Set([
  "/", "/index.html", "/app.js", "/styles.css", "/admin.html", "/admin.js",
  "/content-admin.html", "/content-admin.js", "/visual-demo.html",
  "/visual-demo.js", "/sw.js", "/manifest.webmanifest",
  "/brand-prof-tourism.png", "/brand-prof-2024.jpg", "/brand-gkts-shield.jpg"
]);

function isOlympiadApi(pathname) {
  return pathname === "/api/public/olympiad" ||
    pathname === "/api/public/register" ||
    pathname === "/api/public/attempts/start" ||
    /^\/api\/public\/attempts\/[^/]+(?:\/(?:current|pulse|answer|finish|integrity))?$/.test(pathname) ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/session" ||
    pathname === "/api/admin/summary" ||
    pathname === "/api/admin/attempts" ||
    /^\/api\/admin\/attempts\/[^/]+$/.test(pathname) ||
    /^\/api\/admin\/exports\/(?:csv|json)$/.test(pathname) ||
    pathname.startsWith("/api/admin/content/");
}

function isOlympiadStatic(pathname) {
  return STATIC_FILES.has(pathname) ||
    pathname.startsWith("/assets/olympiad/") ||
    pathname.startsWith("/assets/runtime/") ||
    pathname.startsWith("/icons/");
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(data));
}

function createOlympiadServer(options = {}) {
  const adminPassword = String(options.adminPassword || process.env.ADMIN_PASSWORD || "");
  const attemptIdSecret = String(options.attemptIdSecret || process.env.ATTEMPT_ID_SECRET || "");
  if (adminPassword.length < 16 || attemptIdSecret.length < 32) {
    throw new Error("ADMIN_PASSWORD (16+ characters) and ATTEMPT_ID_SECRET (32+ characters) are required.");
  }

  const dbPath = options.dbPath || process.env.OLYMPIAD_DB_PATH;
  if (!dbPath || !path.isAbsolute(dbPath)) {
    throw new Error("OLYMPIAD_DB_PATH must be an absolute path outside the public directory.");
  }
  const publicDir = path.resolve(__dirname, "public");
  const relativeToPublic = path.relative(publicDir, path.resolve(dbPath));
  if (relativeToPublic === "" || (
    !path.isAbsolute(relativeToPublic) &&
    relativeToPublic !== ".." &&
    !relativeToPublic.startsWith(`..${path.sep}`)
  )) {
    throw new Error("OLYMPIAD_DB_PATH must not be inside the public directory.");
  }

  const db = createSqliteD1(dbPath);
  const { configureCloudflareStorage } = require("./src/store");
  configureCloudflareStorage({ DB: db, ADMIN_PASSWORD: adminPassword, ATTEMPT_ID_SECRET: attemptIdSecret });
  const { handleApi, serveStatic } = require("./server");
  const appVersion = require("./package.json").version;

  const server = http.createServer(async (req, res) => {
    let pathname;
    let url;
    try {
      url = new URL(req.url, "http://localhost");
      pathname = url.pathname;
    } catch (error) {
      sendJson(res, 400, { ok: false, message: "Некорректный адрес запроса." });
      return;
    }

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "DENY");

    try {
      if (pathname === "/api/health" && req.method === "GET") {
        sendJson(res, 200, { ok: true, appVersion, mode: "olympiad-only", storage: "sqlite" });
      } else if (pathname.startsWith("/api/")) {
        if (!isOlympiadApi(pathname)) {
          sendJson(res, 404, { ok: false, message: "Маршрут недоступен на сервере олимпиады." });
          return;
        }
        await handleApi(req, res, url);
      } else if (isOlympiadStatic(pathname) && (req.method === "GET" || req.method === "HEAD")) {
        serveStatic(req, res, pathname);
      } else {
        sendJson(res, 404, { ok: false, message: "Страница не найдена." });
      }
    } catch (error) {
      if (!res.headersSent && !res.destroyed) {
        sendJson(res, 500, { ok: false, message: "Внутренняя ошибка сервера." });
      }
      // Keep details in server logs, never in public HTTP responses.
      console.error("Olympiad request failed", { pathname, error });
    }
  });

  server.on("close", () => db.close());
  return { server, db };
}

if (require.main === module) {
  const { server } = createOlympiadServer();
  const host = process.env.HOST || "127.0.0.1";
  const port = Number(process.env.PORT) || 3100;
  server.listen(port, host, () => {
    console.log(`Olympiad-only server listening on ${host}:${port}`);
  });
}

module.exports = { createOlympiadServer, isOlympiadApi, isOlympiadStatic };
