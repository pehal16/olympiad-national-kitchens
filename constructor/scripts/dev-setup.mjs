import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
const storage = process.env.CONSTRUCTOR_STORAGE;
if (!storage)
  throw new Error("Set isolated CONSTRUCTOR_STORAGE for development.");
const base = process.env.CONSTRUCTOR_URL || "http://127.0.0.1:3210",
  API = base + "/api/constructor/v1";
let cookie = "",
  csrf = "";
const credentials = {
  login: "preview-owner",
  password: "Local-preview-2026!",
  name: "Проверочный кабинет",
};
async function call(route, body) {
  const r = await fetch(API + route, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-CSRF-Token": csrf,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const p = await r.json();
  if (!r.ok) throw new Error(p.error);
  if (r.headers.get("set-cookie"))
    cookie = r.headers.get("set-cookie").split(";")[0];
  return p.data;
}
const status = await call("/status");
if (status.setupRequired) {
  const db = new DatabaseSync(path.join(storage, "constructor.sqlite"));
  const setupCode = db
    .prepare("SELECT value FROM meta WHERE key=?")
    .get("setupSecret").value;
  db.close();
  const login = await call("/setup", { ...credentials, setupCode });
  csrf = login.csrf;
} else {
  const login = await call("/login", credentials);
  csrf = login.csrf;
}
await call("/me");
let projects = await call("/projects");
if (!projects.length) {
  for (const key of ["informatics", "kitchen", "test"])
    await call("/examples/" + key, {});
  projects = await call("/projects");
}
fs.writeFileSync(
  path.join(storage, "dev-session.json"),
  JSON.stringify(
    {
      ...credentials,
      cookie,
      csrf,
      base,
      projects: projects.map((x) => ({ id: x.id, title: x.title })),
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
console.log(
  JSON.stringify({
    isolated: true,
    projects: projects.length,
    sessionFile: path.join(storage, "dev-session.json"),
  }),
);
