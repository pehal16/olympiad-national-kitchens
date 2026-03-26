async function yandexRequest(path, options = {}, oauthToken) {
  const response = await fetch(`https://cloud-api.yandex.net${path}`, {
    ...options,
    headers: {
      Authorization: `OAuth ${oauthToken}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok && response.status !== 409) {
    const text = await response.text();
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
    await yandexRequest(`/v1/disk/resources?${search.toString()}`, { method: "PUT" }, oauthToken);
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

  if (!response.ok && response.status !== 201) {
    const text = await response.text();
    throw new Error(`Загрузка на Яндекс Диск не удалась: ${response.status} ${text}`);
  }
}

module.exports = {
  normalizeDiskPath,
  ensureFolder,
  uploadBuffer
};
