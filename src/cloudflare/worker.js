"use strict";

const { configureCloudflareStorage } = require("../store");

class NodeLikeRequest {
  constructor(request) {
    this.request = request;
    this.method = request.method;
    this.url = request.url;
    this.headers = {};
    this.socket = {
      remoteAddress:
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for") ||
        ""
    };
    this.destroyed = false;
    this.handlers = new Map();
    this.pumpStarted = false;

    request.headers.forEach((value, key) => {
      this.headers[key.toLowerCase()] = value;
    });
  }

  on(eventName, handler) {
    const handlers = this.handlers.get(eventName) || [];
    handlers.push(handler);
    this.handlers.set(eventName, handlers);
    if (!this.pumpStarted && ["data", "end", "error"].includes(eventName)) {
      this.pumpStarted = true;
      queueMicrotask(() => {
        this.pumpBody().catch((error) => this.emit("error", error));
      });
    }
    return this;
  }

  destroy() {
    this.destroyed = true;
  }

  emit(eventName, value) {
    for (const handler of this.handlers.get(eventName) || []) {
      handler(value);
    }
  }

  async pumpBody() {
    if (this.destroyed) {
      return;
    }
    const buffer = Buffer.from(await this.request.arrayBuffer());
    if (this.destroyed) {
      return;
    }
    if (buffer.length) {
      this.emit("data", buffer);
    }
    this.emit("end");
  }
}

class NodeLikeResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = new Headers();
    this.headersSent = false;
    this.destroyed = false;
    this.body = null;
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = Number(statusCode || 200);
    Object.entries(headers || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        this.headers.set(key, String(value));
      }
    });
    this.headersSent = true;
  }

  end(body = null) {
    this.body = body;
    this.headersSent = true;
  }

  toResponse() {
    return new Response(this.body, {
      status: this.statusCode,
      headers: this.headers
    });
  }
}

function jsonError(statusCode, message) {
  return new Response(JSON.stringify({ ok: false, message }), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function handleApiRequest(request, env) {
  configureCloudflareStorage(env);
  const { handleApi, runtimeDiagnostics } = require("../../server");
  const nodeReq = new NodeLikeRequest(request);
  const nodeRes = new NodeLikeResponse();
  const url = new URL(request.url);

  try {
    await handleApi(nodeReq, nodeRes, url, {
      learning: {
        db: env.DB,
        files: env.LEARNING_FILES,
        yandexDisk: {
          enabled: !["0", "false", "off", "disabled"].includes(
            String(env.YANDEX_DISK_ENABLED || "true").trim().toLowerCase()
          ),
          oauthToken: env.YANDEX_DISK_OAUTH_TOKEN,
          folder: env.YANDEX_DISK_FOLDER || "/olympiad-results"
        },
        authSecret: env.LEARNING_AUTH_SECRET,
        bootstrapSecret: env.LEARNING_BOOTSTRAP_SECRET,
        enabled: env.LEARNING_ENABLED
      }
    });
    return nodeRes.toResponse();
  } catch (error) {
    runtimeDiagnostics.apiErrors += 1;
    runtimeDiagnostics.lastApiErrorAt = new Date().toISOString();
    runtimeDiagnostics.lastApiErrorMessage = String(error?.message || "Cloudflare API error");
    runtimeDiagnostics.lastApiErrorRoute = url.pathname;
    return jsonError(
      Number(error?.statusCode || error?.status || 500),
      error?.message || "Внутренняя ошибка сервера."
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApiRequest(request, env);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Static assets binding is not configured.", { status: 500 });
  }
};
