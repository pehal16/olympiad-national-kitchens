import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createApp } from "../server/index.mjs";

// Every run uses a fresh isolated database unless an explicit acceptance endpoint is supplied.
export async function acceptanceClient() {
  let instance, server, directory;
  let base = process.env.CONSTRUCTOR_ACCEPTANCE_BASE;
  const password =
    process.env.CONSTRUCTOR_ACCEPTANCE_PASSWORD ||
    crypto.randomBytes(24).toString("base64url");
  const login = process.env.CONSTRUCTOR_ACCEPTANCE_LOGIN || "acceptance-owner";
  if (!base) {
    directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "constructor-acceptance-"),
    );
    instance = createApp({
      storageDir: directory,
      assetRoot: path.resolve("dist/client"),
    });
    await instance.service.setup({
      setupCode: instance.store.meta("setupSecret"),
      login,
      name: "Приёмочная проверка",
      password,
    });
    server = instance.app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  }
  base = base.replace(/\/$/, "");
  let cookie = "",
    csrf = "";
  async function request(
    route,
    body,
    method = body === undefined ? "GET" : "POST",
    participantToken,
  ) {
    const response = await fetch(base + "/api/constructor/v1" + route, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(participantToken
          ? { "X-Participant-Token": participantToken }
          : { Cookie: cookie, "X-CSRF-Token": csrf }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok || !result.ok)
      throw new Error(`${method} ${route}: ${result.error}`);
    return result.data;
  }
  const response = await fetch(base + "/api/constructor/v1/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });
  const auth = await response.json();
  if (!response.ok)
    throw new Error("Не удалось войти в приёмочный кабинет: " + auth.error);
  cookie = response.headers.get("set-cookie").split(";")[0];
  csrf = auth.data.csrf;
  await request("/me");
  return {
    base,
    request,
    instance,
    directory,
    cookie,
    csrf,
    async close() {
      if (server) await new Promise((resolve) => server.close(resolve));
      await instance?.close();
      if (directory && !process.env.CONSTRUCTOR_KEEP_ACCEPTANCE)
        fs.rmSync(directory, { recursive: true, force: true });
    },
  };
}
export function report(name, data) {
  const result = { name, at: new Date().toISOString(), ...data };
  if (process.env.CONSTRUCTOR_REPORT) {
    fs.mkdirSync(path.dirname(path.resolve(process.env.CONSTRUCTOR_REPORT)), {
      recursive: true,
    });
    fs.writeFileSync(
      process.env.CONSTRUCTOR_REPORT,
      JSON.stringify(result, null, 2),
    );
  }
  console.log(JSON.stringify(result, null, 2));
}
