import express from "express";
import {
  historyFingerprint,
  historyKind,
  historyMarker,
  historyWireBytes,
} from "../shared/assistant-history.mjs";
import { fail, safeEqual, token } from "./util.mjs";

const offline = "История недоступна. Проверьте, включён ли компьютер колледжа.";
const errors = {
  revision_conflict: [
    409,
    "Чат изменился. Откройте его заново и повторите действие.",
  ],
  history_full: [409, "Удалите один из старых чатов и повторите попытку."],
};
const legacyRows =
  "SELECT id, owner, revision, data, updated FROM objects WHERE kind=? ORDER BY id";

export function registerAssistantHistory(
  app,
  { api, wrap, send, store, workerAuth, enabled },
) {
  const requests = new Map();
  let poll;
  let lastSeen = 0;
  let identity = "";
  let migrated;
  let migrating;
  let retryAt = 0;
  let closed = false;
  const saved = store.meta(historyMarker);
  if (saved) migrated = JSON.parse(saved);
  const connected = () => !closed && Date.now() - lastSeen < 24_000;

  function release(request) {
    if (!poll || !request) return;
    request.lease = token();
    const waiting = poll;
    poll = undefined;
    waiting({
      id: request.id,
      lease: request.lease,
      operation: request.operation,
      value: request.value,
    });
  }

  function exchange(operation, value) {
    fail(enabled && connected(), offline, 503, "history_offline");
    fail(requests.size < 60, "История занята. Повторите действие.", 429);
    return new Promise((resolve, reject) => {
      const id = token();
      const timer = setTimeout(() => {
        requests.delete(id);
        reject(
          Object.assign(new Error(offline), {
            status: 503,
            code: "history_offline",
          }),
        );
      }, 15_000).unref();
      const request = { id, operation, value, resolve, reject, timer };
      requests.set(id, request);
      release(request);
    });
  }

  async function migrate(device) {
    const rows = store.db.prepare(legacyRows).all(historyKind);
    const summary = historyFingerprint(rows);
    for (const row of rows) {
      const received = await exchange("import", row);
      fail(
        received === historyFingerprint([row]).digest,
        "История требует сверки.",
        503,
      );
    }
    const verified = await exchange("seal", summary);
    fail(
      verified?.count === summary.count &&
        verified?.digest === summary.digest &&
        identity === device &&
        !closed,
      "История требует сверки.",
      503,
    );
    const marker = { identity: device, ...summary };
    store.meta(historyMarker, JSON.stringify(marker));
    migrated = marker;
  }

  function startMigration() {
    if (migrated || migrating || Date.now() < retryAt) return;
    migrating = migrate(identity)
      .catch(() => {
        retryAt = Date.now() + 5000;
      })
      .finally(() => {
        migrating = undefined;
      });
  }

  const route = api + "/assistant/worker/history";
  app.post(
    route + "/claim",
    workerAuth,
    express.json({ limit: "2kb" }),
    wrap(async (req, res) => {
      const device = req.body?.identity;
      fail(
        typeof device === "string" && /^[0-9a-f-]{36}$/.test(device),
        "Хранилище не опознано.",
        400,
      );
      fail(
        !(migrated?.identity || identity) ||
          device === (migrated?.identity || identity),
        "Подключено другое хранилище истории.",
        409,
      );
      identity = device;
      lastSeen = Date.now();
      const queued = [...requests.values()].find((item) => !item.lease);
      const job = await new Promise((resolve) => {
        let timer;
        function complete(value) {
          clearTimeout(timer);
          res.off("close", disconnect);
          if (poll === complete) poll = undefined;
          resolve(value);
        }
        function disconnect() {
          complete(null);
        }
        poll?.(null);
        poll = complete;
        res.once("close", disconnect);
        timer = setTimeout(() => complete(null), 8500).unref();
        release(queued);
        startMigration();
      });
      if (!res.destroyed) send(res, { job });
    }),
  );

  app.post(
    route + "/complete",
    workerAuth,
    express.json({ limit: historyWireBytes }),
    wrap((req, res) => {
      const request = requests.get(req.body?.id);
      fail(
        request?.lease &&
          safeEqual(req.body?.lease || "", request.lease) &&
          req.body?.identity === identity,
        "Запрос истории завершён.",
        409,
      );
      lastSeen = Date.now();
      requests.delete(request.id);
      clearTimeout(request.timer);
      if (req.body.error) {
        const [status, message] = Object.hasOwn(errors, req.body.error)
          ? errors[req.body.error]
          : [503, offline];
        request.reject(
          Object.assign(new Error(message), {
            status,
            code: status === 409 ? req.body.error : "history_offline",
          }),
        );
      } else {
        request.resolve(req.body.value);
      }
      send(res, {});
    }),
  );

  const online = () => Boolean(migrated && connected());
  const call = (operation, value) => {
    fail(online(), offline, 503, "history_offline");
    return exchange(operation, value);
  };
  function decode(row) {
    if (!row) return null;
    const { data, id, owner, revision, updated } = row;
    return { ...JSON.parse(data), id, owner, revision, updatedAt: updated };
  }

  return {
    online,
    list: (owner) => call("list", { owner }),
    async get(owner, id) {
      return decode(await call("get", { owner, id }));
    },
    async put(id, owner, revision, data) {
      return decode(
        await call("put", { id, owner, revision, data: JSON.stringify(data) }),
      );
    },
    remove: (owner, id, revision) => call("remove", { owner, id, revision }),
    close() {
      closed = true;
      poll?.(null);
      for (const request of requests.values()) {
        clearTimeout(request.timer);
        request.reject(
          Object.assign(new Error(offline), {
            status: 503,
            code: "history_offline",
          }),
        );
      }
      requests.clear();
    },
  };
}
