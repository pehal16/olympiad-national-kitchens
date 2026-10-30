import fs from "node:fs";
import path from "node:path";
import { id, hash, fail, safePath } from "./util.mjs";
const fonts = {
  "PT Serif": "PTSerif-Regular.ttf",
  "PT Sans": "PTSans-Regular.ttf",
  "Noto Sans": "NotoSans-Regular.ttf",
  "Noto Serif": "NotoSerif-Regular.ttf",
};
const mimeFor = (file) =>
  ({
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ttf": "font/ttf",
    ".txt": "text/plain",
  })[path.extname(file).toLowerCase()] || "application/octet-stream";
export function attachPortableAssets(service, records, files) {
  const root = service.assetRoot;
  if (!root) return [];
  function fontRefs(value) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(fontRefs);
      return;
    }
    if (Array.isArray(value.elements))
      value.fontAssets = {
        ...Object.fromEntries(
          Object.entries(fonts).map(([family, name]) => [
            family,
            "/constructor/fonts/" + name,
          ]),
        ),
        ...value.fontAssets,
      };
    Object.values(value).forEach(fontRefs);
  }
  records.forEach((r) => fontRefs(r.value));
  const urls = new Set();
  function collect(value) {
    if (
      typeof value === "string" &&
      [
        "/constructor/legacy/",
        "/constructor/awards/",
        "/constructor/fonts/",
      ].some((prefix) => value.startsWith(prefix))
    )
      urls.add(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object")
      Object.values(value).forEach(collect);
  }
  records.forEach((r) => collect(r.value));
  for (const name of ["OFL-PT.txt", "OFL-Noto.txt"])
    if (fs.existsSync(path.join(root, "fonts", name)))
      urls.add("/constructor/fonts/" + name);
  return [...urls].map((sourceUrl) => {
    const relative = sourceUrl.slice("/constructor/".length),
      file = safePath(root, relative);
    fail(
      fs.existsSync(file),
      "Для пакета не найден связанный файл: " + relative,
    );
    const name =
      "portable/" + hash(sourceUrl).slice(0, 24) + path.extname(file);
    files[name] = new Uint8Array(fs.readFileSync(file));
    return { sourceUrl, name, mime: mimeFor(file) };
  });
}
export function preparePortableAssets(parsed, user) {
  const replacements = new Map(),
    records = [],
    files = {};
  for (const entry of parsed.manifest.portableAssets || []) {
    fail(
      typeof entry.sourceUrl === "string" &&
        entry.sourceUrl.startsWith("/constructor/") &&
        parsed.files[entry.name],
      "Повреждён реестр переносимых ресурсов.",
    );
    const mid = id("media"),
      relativePath = `media/${mid}${path.extname(entry.name)}`,
      url = "/api/constructor/v1/media/" + mid,
      bytes = parsed.files[entry.name];
    files[relativePath] = bytes;
    replacements.set(entry.sourceUrl, url);
    records.push({
      id: mid,
      owner: user.id,
      name: path.basename(entry.sourceUrl),
      mime: mimeFor(entry.name),
      byteSize: bytes.length,
      sha256: hash(bytes),
      relativePath,
      url,
    });
  }
  return { replacements, records, files };
}
