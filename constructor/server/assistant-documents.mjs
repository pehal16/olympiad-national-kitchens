import { load } from "cheerio";
import { unzipSync } from "fflate";
import path from "node:path";

export const maxLectureBytes = 5 * 1024 * 1024;
const maxPages = 100;
export const maxLectureText = 240_000;

function normalize(text) {
  return text
    .normalize("NFC")
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function plainText(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe)
    return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff)
    return new TextDecoder("utf-16be").decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1251").decode(bytes);
  }
}

function officeMath($, node) {
  const current = $(node);
  const name = node.name;
  const child = (tag) => {
    const entry = current.children(tag).first().get(0);
    return entry ? officeMath($, entry) : "";
  };
  if (name === "m:f") {
    const num = child("m\\:num"),
      den = child("m\\:den");
    if (!num || !den) throw Error("Incomplete fraction");
    return "\\frac{" + num + "}{" + den + "}";
  }
  if (name === "m:sSup" || name === "m:sSub" || name === "m:sSubSup") {
    const base = child("m\\:e"),
      sub = child("m\\:sub"),
      sup = child("m\\:sup");
    return (
      "{" +
      base +
      "}" +
      (sub ? "_{" + sub + "}" : "") +
      (sup ? "^{" + sup + "}" : "")
    );
  }
  if (name === "m:rad") {
    const degree = child("m\\:deg");
    return (
      "\\sqrt" + (degree ? "[" + degree + "]" : "") + "{" + child("m\\:e") + "}"
    );
  }
  if (name === "m:d") {
    const start = current.find("m\\:begChr").first().attr("m:val") ?? "(";
    const end = current.find("m\\:endChr").first().attr("m:val") ?? ")";
    if (start !== "(" || end !== ")") throw Error("Unsupported delimiter");
    return "\\left(" + child("m\\:e") + "\\right)";
  }
  if (name === "m:t") {
    return current
      .text()
      .replace(/[\\{}_#%$&^]/gu, (character) =>
        character === "\\"
          ? "\\backslash "
          : character === "^"
            ? "\\text{^}"
            : "\\" + character,
      );
  }
  if (name === "m:rPr" || name === "w:rPr" || name === "m:ctrlPr") return "";
  if (
    ![
      "m:oMath",
      "m:r",
      "m:e",
      "m:sub",
      "m:sup",
      "m:num",
      "m:den",
      "m:deg",
    ].includes(name)
  )
    throw Error("Unsupported Word equation");
  return current
    .children()
    .toArray()
    .map((entry) => officeMath($, entry))
    .join("");
}

function wordText(bytes) {
  const parts = unzipSync(bytes, {
    filter(entry) {
      return (
        entry.name === "word/document.xml" &&
        entry.originalSize <= 8 * 1024 * 1024
      );
    },
  });
  if (!parts["word/document.xml"])
    throw new Error("Не найден читаемый текст DOCX.");
  const $ = load(new TextDecoder().decode(parts["word/document.xml"]), {
    xml: true,
  });
  return $("w\\:p")
    .map((_i, node) =>
      $(node)
        .find("w\\:t, m\\:oMath")
        .map((_j, textNode) => {
          if (textNode.name === "w:t") return $(textNode).text();
          try {
            const equation = officeMath($, textNode);
            return equation ? " \\(" + equation + "\\) " : "";
          } catch {
            return " [формула Word в исходном файле] ";
          }
        })
        .get()
        .join(""),
    )
    .get()
    .join("\n");
}

export async function readPdfPages(bytes) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    enableXfa: false,
    disableFontFace: true,
    useSystemFonts: true,
    verbosity: 0,
  });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > maxPages)
      throw new Error("PDF содержит больше 100 страниц. Разделите его.");
    const pages = [];
    for (let page = 1; page <= pdf.numPages; page++) {
      const content = await (await pdf.getPage(page)).getTextContent();
      const text = normalize(
        content.items
          .map((item) => (item.str ?? "") + (item.hasEOL ? "\n" : " "))
          .join(""),
      );
      if (text) pages.push({ locator: "с. " + page, text });
    }
    if (!pages.length)
      throw new Error(
        "PDF содержит только изображения. Нужен распознанный PDF или DOCX.",
      );
    return pages;
  } finally {
    await task.destroy();
  }
}

export async function readLectures(files) {
  let length = 0;
  const documents = [];
  for (const file of files || []) {
    const title = path.win32
      .basename(file.originalname)
      .replace(/[\u0000-\u001f]/gu, "")
      .slice(0, 180);
    const extension = path.extname(title).toLowerCase();
    try {
      let pages;
      if (extension === ".pdf") {
        pages = await readPdfPages(file.buffer);
      } else if (extension === ".docx") {
        pages = [{ locator: "", text: normalize(wordText(file.buffer)) }];
      } else if (extension === ".txt" || extension === ".md") {
        pages = [{ locator: "", text: normalize(plainText(file.buffer)) }];
      } else {
        throw new Error("Поддерживаются PDF, DOCX, TXT и MD.");
      }
      const size = pages.reduce((total, page) => total + page.text.length, 0);
      if (size < 30) throw new Error("Загрузите документ с читаемым текстом.");
      length += size;
      if (length > maxLectureText)
        throw new Error(
          "Суммарный текст превышает 240 000 символов. Разделите материалы.",
        );
      documents.push({ title, pages });
    } catch (error) {
      const detail =
        [
          "PasswordException",
          "InvalidPDFException",
          "UnexpectedResponseException",
        ].includes(error.name) || /zip|inflate|format|data/i.test(error.message)
          ? "Не удалось прочитать документ."
          : error.message;
      throw Object.assign(new Error(title + ". " + detail), { status: 422 });
    }
  }
  return documents;
}

export function clips(text, size = 940) {
  const chunks = [];
  const body = normalize(text);
  for (let offset = 0; offset < body.length;) {
    const candidate = body.slice(offset, offset + size);
    let end = candidate.length;
    if (offset + end < body.length) {
      const boundary = candidate.lastIndexOf(" ");
      if (boundary > size * 0.6) end = boundary;
    }
    chunks.push(body.slice(offset, offset + end).trim());
    offset += end > 120 && offset + end < body.length ? end - 100 : end;
  }
  return chunks;
}
