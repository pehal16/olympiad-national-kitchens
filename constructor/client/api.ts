export const BASE = "/api/constructor/v1";
let csrf = "";
export function setCsrf(value: string) {
  csrf = value;
}
export async function api(
  path: string,
  body?: unknown,
  method?: string,
  participant?: string,
): Promise<any> {
  const multipart = body instanceof FormData;
  const response = await fetch(BASE + path, {
    method: method || (body === undefined ? "GET" : "POST"),
    credentials: "same-origin",
    headers: {
      ...(multipart
        ? {}
        : body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      ...(participant ? { "X-Participant-Token": participant } : {}),
    },
    body:
      body === undefined ? undefined : multipart ? body : JSON.stringify(body),
  });
  const payload = await response
    .json()
    .catch(() => ({ error: "Сервер вернул неожиданный ответ." }));
  if (!response.ok)
    throw Object.assign(
      new Error(payload.error || "Не удалось выполнить действие."),
      { status: response.status, code: payload.code },
    );
  return payload.data;
}
export async function blobRequest(
  path: string,
  body?: unknown,
  participant?: string,
): Promise<Blob> {
  const response = await fetch(BASE + path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      ...(participant ? { "X-Participant-Token": participant } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const p = await response.json();
    throw new Error(p.error);
  }
  return response.blob();
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export async function upload(
  file: File,
  participant?: { attemptId: string; token: string; questionId: string },
) {
  const form = new FormData();
  form.append("file", file);
  if (participant) form.append("questionId", participant.questionId);
  return api(
    participant ? `/public/attempts/${participant.attemptId}/files` : "/media",
    form,
    "POST",
    participant?.token,
  );
}
let dbPromise: Promise<IDBDatabase> | undefined;
function db() {
  return (dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open("olympiad-constructor-v1", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("drafts");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}
export async function localGet(key: string) {
  try {
    const database = await db();
    return await new Promise<any>((resolve, reject) => {
      const r = database.transaction("drafts").objectStore("drafts").get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return null;
  }
}
export async function localSet(key: string, value: any) {
  try {
    const database = await db();
    await new Promise<void>((resolve, reject) => {
      const t = database.transaction("drafts", "readwrite");
      t.objectStore("drafts").put(value, key);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
    return true;
  } catch {
    return false;
  }
}
