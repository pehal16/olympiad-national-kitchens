import { request as httpsRequest } from "node:https";
import { networkInterfaces } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import {
  defaultModel,
  ollamaRequest,
  ollamaTestRequest,
  readDraft,
  readSource,
  readTestDraft,
  readTestRequest,
} from "../../shared/assistant.mjs";

const ollama = "http://127.0.0.1:11435";
const model = process.env.GKTS_ASSISTANT_MODEL || defaultModel;
const api = "/api/constructor/v1/assistant/worker";

async function json(url, { body, headers, timeout = 5000 } = {}) {
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...headers,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw Object.assign(new Error(`HTTP ${response.status}`), {
      status: response.status,
    });
  }
  return response.json();
}

async function cabinetJson(url, body, headers, networkInterface) {
  if (!networkInterface || !url.startsWith("https:"))
    return json(url, { body, headers });

  const localAddress = networkInterfaces()[networkInterface]?.find(
    (address) =>
      address.family === "IPv4" &&
      !address.internal &&
      !address.address.startsWith("169.254."),
  )?.address;
  if (!localAddress)
    throw new Error("Нет IPv4 на выбранном сетевом интерфейсе.");

  const payload = JSON.stringify(body);
  const request = httpsRequest(url, {
    method: "POST",
    family: 4,
    localAddress,
    signal: AbortSignal.timeout(5000),
    headers: {
      ...headers,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
  });
  const responseReady = new Promise((resolve, reject) => {
    request.once("response", resolve);
    request.once("error", reject);
  });
  request.end(payload);
  const response = await responseReady;
  const status = response.statusCode;
  if (status < 200 || status >= 300) {
    response.destroy();
    throw Object.assign(new Error(`HTTP ${status}`), { status });
  }
  let bytes = 0;
  const chunks = [];
  for await (const chunk of response) {
    bytes += chunk.length;
    if (bytes > 64 * 1024) throw new Error("Ответ кабинета слишком большой.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks, bytes).toString("utf8"));
}

async function modelPresent() {
  const { models } = await json(ollama + "/api/tags");
  return models.some(
    (entry) => entry.name.toLowerCase() === model.toLowerCase(),
  );
}

async function generate(input) {
  const test = "instruction" in input;
  const response = await json(ollama + "/api/generate", {
    body: test ? ollamaTestRequest(input, model) : ollamaRequest(input, model),
    timeout: test ? 150_000 : 120_000,
  });
  if (response.done !== true || response.done_reason === "length") return null;
  try {
    const draft = JSON.parse(response.response);
    return test
      ? readTestDraft(draft, input.count)
      : readDraft(draft, input.sourceText);
  } catch {
    return null;
  }
}

async function verifyLocal() {
  if (!(await modelPresent()))
    throw new Error("Запрошенная модель не установлена.");
  const { version } = await json(ollama + "/api/version");
  const input = {
    sourceTitle: "Учебный фрагмент для прогона",
    topic: "Какое тесто предписывает учебная карта?",
    sourceText:
      "В этой учебной карте для круассанов используют дрожжевое слоёное тесто. Перед расстойкой заготовку сворачивают из треугольника от широкого основания к вершине.",
  };
  const timings = [];
  let draft;
  for (let i = 0; i < 2; i++) {
    const start = performance.now();
    draft = await generate(input);
    const answer = draft?.options[draft.correctIndex]
      .toLowerCase()
      .replace(/ё/g, "е");
    if (!answer?.includes("дрожжев") || !answer.includes("слоен")) {
      throw new Error(
        "Контрольное задание не прошло сверку правильного ответа и цитаты.",
      );
    }
    timings.push(Math.round(performance.now() - start));
  }
  const { models } = await json(ollama + "/api/ps");
  const loaded = models.find(
    (entry) => entry.name.toLowerCase() === model.toLowerCase(),
  );
  console.log(
    JSON.stringify(
      {
        model,
        version,
        firstRequestMs: timings[0],
        repeatRequestMs: timings[1],
        modelBytesOnGpu: loaded?.size_vram ?? null,
        modelBytesInMemory: loaded?.size ?? null,
        contextLength: loaded?.context_length ?? null,
        draft,
      },
      null,
      2,
    ),
  );
  if (!(loaded?.size_vram > 0))
    throw new Error(
      "Контрольный запуск не подтвердил использование видеопамяти.",
    );
}

function cabinetOrigin(value) {
  const url = new URL(value);
  const local = url.protocol === "http:" && url.hostname === "127.0.0.1";
  if (
    (!local && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Укажите адрес кабинета целиком до первого косого слеша, включая HTTPS.",
    );
  }
  return url.origin;
}

async function work() {
  const origin = cabinetOrigin(process.env.GKTS_ASSISTANT_ORIGIN);
  const credential = process.env.GKTS_ASSISTANT_TOKEN;
  if (!/^[A-Za-z0-9_-]{43}$/.test(credential || ""))
    throw new Error("Неверный формат рабочего ключа.");
  const headers = { Authorization: `Bearer ${credential}` };
  const networkInterface = process.env.GKTS_ASSISTANT_INTERFACE;
  const endpoint = async (route, body) => {
    const payload = await cabinetJson(
      origin + api + route,
      body,
      headers,
      networkInterface,
    );
    if (payload.ok !== true) throw new Error("Ответ кабинета не принят.");
    return payload.data;
  };
  let previousStatus;
  const status = (message) => {
    if (previousStatus !== message)
      console.log(`${new Date().toISOString()} ${message}`);
    previousStatus = message;
  };
  while (true) {
    try {
      const ready = await modelPresent().catch(() => false);
      const { job } = await endpoint("/claim", { ready, supportsTests: true });
      status(ready ? "Помощник подключён." : "Ожидание локальной модели.");
      if (job) {
        const input =
          job.input?.instruction === undefined
            ? readSource(job.input)
            : readTestRequest(job.input);
        let draft, failure;
        try {
          draft = input ? await generate(input) : null;
          if (!draft) failure = "invalid_draft";
        } catch {
          failure = "local_failure";
        }
        // An acknowledgement can be lost after the cabinet accepts the result.
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await endpoint("/complete", {
              id: job.id,
              lease: job.lease,
              draft,
              failure,
            });
            break;
          } catch (error) {
            if ([404, 409].includes(error.status)) break;
            if (attempt === 2) throw error;
            await delay(1000);
          }
        }
      }
    } catch (error) {
      status(
        error.status
          ? `Кабинет недоступен (HTTP ${error.status}).`
          : "Нет связи с кабинетом.",
      );
      await delay(5000);
    }
    await delay(3000);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const run = process.argv[2] === "--work" ? work : verifyLocal;
  try {
    await run();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
