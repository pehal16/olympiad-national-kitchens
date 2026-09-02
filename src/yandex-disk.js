async function yandexRequest(path, options = {}, oauthToken, allowedStatuses = []) {
  if (!oauthToken) {
    throw new Error("OAuth-токен Яндекс Диска не настроен.");
  }
  const response = await fetch(`https://cloud-api.yandex.net${path}`, {
    ...options,
    headers: {
      Authorization: `OAuth ${oauthToken}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok && !allowedStatuses.includes(response.status)) {
    const text = (await response.text()).slice(0, 1000);
    throw new Error(`Яндекс Диск API: ${response.status} ${text}`);
  }

  return response;
}

function normalizeDiskPath(inputPath) {
  const raw = String(inputPath || "").trim();

  if (!raw) {
    return "app:/Олимпиада_Национальные_кухни";
  }

  if (raw.startsWith("app:/") || raw.startsWith("disk:/")) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return `app:${raw}`;
  }

  return `app:/${raw.replace(/^\/+/, "")}`;
}

async function ensureFolder(folderPath, oauthToken) {
  const normalizedPath = normalizeDiskPath(folderPath);
  const match = normalizedPath.match(/^(app:|disk:)(\/.*)$/);
  const prefix = match ? match[1] : "app:";
  const relativePath = match ? match[2] : normalizedPath;
  const parts = relativePath
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  let current = prefix;
  for (const part of parts) {
    current += `/${part}`;
    const search = new URLSearchParams({ path: current });
    await yandexRequest(
      `/v1/disk/resources?${search.toString()}`,
      { method: "PUT" },
      oauthToken,
      [409]
    );
  }
}

async function getUploadLink(remotePath, oauthToken) {
  const search = new URLSearchParams({
    path: remotePath,
    overwrite: "true"
  });
  const response = await yandexRequest(`/v1/disk/resources/upload?${search.toString()}`, {}, oauthToken);
  return response.json();
}

async function uploadBuffer(remotePath, content, oauthToken) {
  const upload = await getUploadLink(normalizeDiskPath(remotePath), oauthToken);
  const response = await fetch(upload.href, {
    method: "PUT",
    body: content
  });

  if (!response.ok) {
    const text = (await response.text()).slice(0, 1000);
    throw new Error(`Загрузка на Яндекс Диск не удалась: ${response.status} ${text}`);
  }
}

async function getDownloadLink(remotePath, oauthToken) {
  const search = new URLSearchParams({ path: normalizeDiskPath(remotePath) });
  const response = await yandexRequest(
    `/v1/disk/resources/download?${search.toString()}`,
    {},
    oauthToken,
    [404]
  );
  if (response.status === 404) return null;
  const payload = await response.json();
  if (!payload || !payload.href) {
    throw new Error("Яндекс Диск не вернул ссылку для скачивания файла.");
  }
  return payload;
}

async function downloadBuffer(remotePath, oauthToken) {
  const download = await getDownloadLink(remotePath, oauthToken);
  if (!download) return null;
  const response = await fetch(download.href);
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = (await response.text()).slice(0, 1000);
    throw new Error(`Скачивание с Яндекс Диска не удалось: ${response.status} ${text}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function deleteResource(remotePath, oauthToken) {
  const search = new URLSearchParams({
    path: normalizeDiskPath(remotePath),
    permanently: "true"
  });
  const response = await yandexRequest(
    `/v1/disk/resources?${search.toString()}`,
    { method: "DELETE" },
    oauthToken,
    [404]
  );
  return response.status !== 404;
}

module.exports = {
  normalizeDiskPath,
  ensureFolder,
  uploadBuffer,
  downloadBuffer,
  deleteResource
};
