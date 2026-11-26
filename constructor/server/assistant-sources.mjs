import { load } from "cheerio";
import {
  clips,
  maxLectureBytes,
  readLectures,
  readPdfPages,
} from "./assistant-documents.mjs";
import { compact } from "../shared/assistant-work.mjs";

const allowed = new Map([
  [
    "openstax.org",
    /^\/(books\/[\w-]+\/pages\/[\w-]+|apps\/cms\/api\/v2\/pages\/)$/u,
  ],
  ["rusneb.ru", /^\/(search\/|catalog\/[\w-]+\/?)$/u],
  ["navigator.spolab.firpo.ru", /^\//u],
  ["spolab.firpo.ru", /^\/npdv2\/category-doc\/get\/\d+\/?$/u],
  ["reestrspo.firpo.ru", /^\/reestr-pop-p-spo\/[\w/-]*$/u],
  ["firpo.ru", /^\/reestr-pop-spo\/\d+\/?$/u],
  ["docs.edu.gov.ru", /^\/document\/[\w/-]+$/u],
  [
    "publication.pravo.gov.ru",
    /^\/(document|document\/view|file\/pdf)\/\d{14}\/?$/iu,
  ],
  ["obrnadzor.gov.ru", /^\/wp-content\/uploads\/[\w/%.-]+\.(docx|pdf)$/iu],
  ["www.rospotrebnadzor.ru", /^\/(about\/info|region|activities)\/[\w/.-]+$/u],
  ["44.rospotrebnadzor.ru", /^\/sanitarnyj_nadzor\/\d+\/?$/u],
  ["www.fsis.usda.gov", /^\/food-safety\/[\w/-]+$/u],
  ["science.nasa.gov", /^\/[\w/-]+$/u],
]);
const programRoot = "https://reestrspo.firpo.ru/reestr-pop-p-spo/";
const navigator = "https://navigator.spolab.firpo.ru/";
const knownStandards = new Map([
  [
    "43.02.15",
    [
      "https://spolab.firpo.ru/npdv2/category-doc/get/5506",
      "https://obrnadzor.gov.ru/wp-content/uploads/2021/02/43.02.15-povarskoe-i-konditerskoe-delo-prikaz-ot-09.12.2016-N-1565.docx",
      "https://publication.pravo.gov.ru/document/0001201612220007",
    ],
  ],
  ["09.02.07", ["https://spolab.firpo.ru/npdv2/category-doc/get/5306"]],
]);
const referencePages = [
  {
    topic: /дрожж|фермент|брожен|yeast|ferment/iu,
    url: "https://openstax.org/books/biology-2e/pages/7-5-metabolism-without-oxygen",
  },
  {
    topic: /мяс|горяч.{0,10}блюд|meat|hot dish/iu,
    url: "https://44.rospotrebnadzor.ru/sanitarnyj_nadzor/6243/",
  },
];

const culinaryStandardExtracts = [
  {
    locator: "ПК 2.1",
    excerpt:
      "Организовывать подготовку рабочих мест, оборудования, сырья, материалов для приготовления горячих блюд",
  },
  {
    locator: "ПК 5.3",
    excerpt:
      "Осуществлять приготовление, творческое оформление, подготовку к реализации хлебобулочных изделий",
  },
].map((item) => ({
  ...item,
  kind: "standard_excerpt",
  title: "ФГОС СПО 43.02.15 · выдержка из редакции 03.07.2024",
  url: "https://spolab.firpo.ru/npdv2/category-doc/get/5506",
}));

function allowedURL(value, base) {
  try {
    const url = new URL(value, base);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !allowed.get(url.hostname)?.test(url.pathname)
    )
      return undefined;
    url.hash = "";
    return url;
  } catch {
    return undefined;
  }
}

async function download(url, redirects = 0) {
  const target = allowedURL(url);
  if (!target || redirects > 2) return null;
  const response = await fetch(target, {
    redirect: "manual",
    signal: AbortSignal.timeout(6500),
    headers: { "User-Agent": "GKTS Constructor source verification/1.0" },
  });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    await response.body?.cancel();
    const next = allowedURL(response.headers.get("location") || "", target);
    return next ? download(next, redirects + 1) : null;
  }
  if (
    !response.ok ||
    Number(response.headers.get("content-length")) > maxLectureBytes
  ) {
    await response.body?.cancel();
    return null;
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body || []) {
    bytes += chunk.length;
    if (bytes > maxLectureBytes) return null;
    chunks.push(chunk);
  }
  return { url: target, bytes: Buffer.concat(chunks, bytes) };
}

function requestCache(existing) {
  return async (url) => {
    const address = url.toString();
    if (!existing.has(address)) {
      if (existing.size >= 24) existing.delete(existing.keys().next().value);
      existing.set(
        address,
        download(address).catch(() => null),
      );
    }
    return existing.get(address);
  };
}
const common = new Set([
  "этому",
  "этой",
  "первого",
  "первый",
  "about",
  "with",
  "this",
  "their",
  "first",
  "подготовка",
  "студент",
  "тест",
  "вопрос",
]);
function terms(query) {
  return [
    ...new Set(
      (query.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || [])
        .filter((term) => !common.has(term))
        .map((term) => (term.length > 5 ? term.slice(0, -2) : term)),
    ),
  ].slice(0, 20);
}
function rank(value, keys) {
  const body = value.toLowerCase();
  return keys.filter((key) => body.includes(key)).length;
}
function excerpts(document, keys, count = 1) {
  return document.pages
    .flatMap((page) =>
      clips(page.text).map((excerpt) => ({
        excerpt,
        locator: page.locator,
        score: rank(excerpt, keys),
      })),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ excerpt, locator }) => ({
      title: document.title,
      url: document.url,
      kind: document.kind,
      excerpt,
      locator,
    }));
}

function html(bytes) {
  return load(bytes.toString("utf8"));
}
function safeQuery(value) {
  const query = compact(value || "");
  return /^[\p{L}\p{N}\s,().\-–]{2,100}$/u.test(query) && !/\d{6,}/u.test(query)
    ? query
    : "";
}
function webDocument(resource, kind) {
  const $ = html(resource.bytes);
  const title =
    compact($("title").first().text()).slice(0, 220) || resource.url.hostname;
  $("script, style, nav, header, footer, form, noscript").remove();
  const article = $("article, [data-type='page'], main").first();
  const body = article.length ? article : $("body");
  const paragraphs = body
    .find("p, li, h2, h3")
    .map((_i, item) => compact($(item).text()))
    .get();
  const text =
    paragraphs.filter((p) => p.length > 24).join("\n") || compact(body.text());
  return {
    title,
    url: resource.url.href,
    kind,
    pages: [{ text, locator: "" }],
  };
}

async function textbook(group, keys, get) {
  const subject = safeQuery(group.englishSubject);
  const query = safeQuery(group.englishQuery);
  if (!subject || !query) return [];
  const lookup = new URL("https://openstax.org/apps/cms/api/v2/pages/");
  lookup.search = new URLSearchParams({
    type: "books.Book",
    limit: "6",
    search: subject,
    fields: "title,slug",
  });
  const catalog = await get(lookup);
  if (!catalog) return [];
  let books;
  try {
    books = JSON.parse(catalog.bytes).items || [];
  } catch {
    return [];
  }
  books = books
    .filter(
      (entry) =>
        /^[a-z0-9-]+$/u.test(entry.meta?.slug) &&
        typeof entry.title === "string",
    )
    .sort(
      (a, b) =>
        Number(/-2e|-3e/u.test(b.meta.slug)) -
        Number(/-2e|-3e/u.test(a.meta.slug)),
    )
    .slice(0, 3);
  const hits = await Promise.all(
    books.map(async (book) => {
      const prefix = "https://openstax.org/books/" + book.meta.slug + "/pages/";
      const index = await get(prefix + "1-introduction");
      if (!index) return [];
      const markup = index.bytes.toString("utf8");
      const slugs = Array.from(
        new Set(markup.match(/\b\d{1,2}-\d{1,2}-[a-z0-9-]{4,90}\b/gu) || []),
      );
      const candidate = slugs
        .map((slug) => ({ slug, score: rank(slug, keys) }))
        .sort((a, b) => b.score - a.score)[0];
      if (!candidate?.score) return [];
      const page = await get(prefix + candidate.slug);
      if (!page) return [];
      const document = webDocument(page, "textbook");
      return excerpts(document, keys, 2).filter((item) =>
        rank(item.excerpt, keys),
      );
    }),
  );
  const available = hits.flat();
  if (available.length) return available.slice(0, 2);
  const sample = books[0];
  return sample
    ? [
        {
          title: sample.title,
          kind: "catalog",
          url: "https://openstax.org/details/books/" + sample.meta.slug,
          locator: "",
          excerpt: "",
        },
      ]
    : [];
}

async function library(group, get) {
  const query = safeQuery(group.query);
  if (!query) return [];
  const search = new URL("https://rusneb.ru/search/");
  search.searchParams.set("q", query);
  const index = await get(search);
  if (!index) return [];
  const $ = html(index.bytes);
  const candidates = [];
  $('a[href*="/catalog/"]').each((_i, element) => {
    const title = compact($(element).text());
    const url = allowedURL($(element).attr("href"), search);
    if (
      url &&
      title.length >= 8 &&
      title.length <= 200 &&
      !candidates.some((item) => item.url === url.href)
    ) {
      candidates.push({
        title,
        url: url.href,
        kind: "catalog",
        locator: "",
        excerpt: "",
      });
    }
  });
  return candidates.slice(0, 2);
}

async function publicDocument(raw, code, keys, get, supplied = false) {
  const source = await get(raw);
  if (!source) return [];
  const address = source.url;
  const pdf = source.bytes.subarray(0, 5).toString() === "%PDF-";
  const docx = source.bytes.subarray(0, 2).toString() === "PK";
  let document;
  try {
    if (pdf || docx) {
      const pages = pdf
        ? await readPdfPages(source.bytes)
        : (
            await readLectures([
              {
                originalname: "Публичный документ.docx",
                buffer: source.bytes,
              },
            ])
          )[0].pages;
      document = {
        title: address.hostname,
        url: address.href,
        kind: "official",
        pages,
      };
    } else {
      document = webDocument(
        source,
        address.hostname === "openstax.org" ? "textbook" : "official",
      );
    }
  } catch {
    return [
      {
        title: "Опубликованный документ",
        url: address.href,
        kind: "catalog",
        locator: "",
        excerpt: "",
      },
    ];
  }
  const full = document.pages.map((p) => p.text).join(" ");
  if (
    [
      "publication.pravo.gov.ru",
      "docs.edu.gov.ru",
      "obrnadzor.gov.ru",
      "spolab.firpo.ru",
    ].includes(address.hostname)
  ) {
    if (
      (!code || full.includes(code)) &&
      /образовательн.{0,30}стандарт/isu.test(full) &&
      /компетенц|результат.{0,25}освоения/iu.test(full)
    ) {
      document.kind = "standard";
      document.title = "Опубликованный текст ФГОС" + (code ? " " + code : "");
      return excerpts(
        document,
        [...keys, ...terms("компетенции результаты освоения")],
        2,
      );
    }
    return [
      {
        title: document.title,
        url: address.href,
        kind: "registry",
        locator: "",
        excerpt: "",
      },
    ];
  }
  if (
    ["reestrspo.firpo.ru", "firpo.ru", "navigator.spolab.firpo.ru"].includes(
      address.hostname,
    )
  )
    return [
      {
        title: document.title,
        url: address.href,
        kind: "registry",
        locator: "",
        excerpt: "",
      },
    ];
  const relevant = excerpts(document, keys, 2).filter((item) =>
    rank(item.excerpt, keys),
  );
  if (relevant.length || !supplied || document.kind !== "textbook")
    return relevant;
  const chapterTerms = terms(
    address.pathname.split("/").at(-1).replaceAll("-", " "),
  );
  return excerpts(document, chapterTerms, 2).filter((item) =>
    rank(item.excerpt, chapterTerms),
  );
}

function programCode(input, documents) {
  const select = (string) =>
    Array.from(new Set(string.match(/\b\d{2}\.0[12]\.\d{2}\b/gu) || []));
  const latest = select((input.replies || []).at(-1) || "");
  const given = latest.length ? latest : select(input.instruction);
  const codes = given.length
    ? given
    : select(
        documents
          .map(
            (doc) =>
              doc.title + " " + (doc.pages[0]?.text.slice(0, 1800) || ""),
          )
          .join(" "),
      );
  return codes.length > 1 ? { ambiguous: true } : { code: codes[0] };
}

async function officialProgram(code, keys, get) {
  if (!code) return [];
  const search = new URL(navigator);
  search.searchParams.set("GosnavtSearch[prog_kod]", code);
  const result = await get(search);
  if (result) {
    const $ = html(result.bytes);
    const matching = $("tr").filter((_i, el) =>
      $(el)
        .children("td")
        .toArray()
        .some((cell) => compact($(cell).text()) === code),
    );
    const files = [];
    let registration = "";
    matching.each((_i, row) => {
      const cells = $(row).children("td");
      const label = compact(cells.text());
      if (!registration) registration = label.slice(0, 520);
      const state = compact(cells.eq(14).text());
      if (!/^(принят|отмен[её]н прием)$/iu.test(state)) return;
      $(row)
        .find("a")
        .each((_j, element) => {
          if (/скачать файл фгос/iu.test($(element).text())) {
            const link = allowedURL($(element).attr("href"), result.url);
            if (link && !files.some((item) => item.href === link.href))
              files.push(link);
          }
        });
    });
    if (registration) {
      const registry = {
        title: "Навигатор ФГОС СПО · " + code,
        url: search.href,
        kind: "registry",
        locator: "",
        excerpt: registration,
      };
      // A code may refer to several editions or a cohort still using an earlier one.
      if (files.length > 1) return [registry];
      if (files.length === 1)
        return [
          registry,
          ...(await publicDocument(files[0], code, keys, get)),
        ].slice(0, 3);
    }
  }
  const sources = await Promise.all(
    (knownStandards.get(code) || []).map((url) =>
      publicDocument(url, code, keys, get),
    ),
  );
  const known = sources.flat();
  if (known.some((entry) => entry.kind === "standard"))
    return known.slice(0, 3);
  const index = await get(programRoot);
  if (index) {
    const $ = html(index.bytes);
    const row = $("tr")
      .filter((_i, el) => $(el).text().includes(code))
      .first();
    const table = compact(row.text()).slice(0, 500);
    if (table.includes(code))
      return [
        ...known,
        {
          title: "Реестр программ СПО · " + code,
          url: programRoot,
          kind: "registry",
          locator: "",
          excerpt: table,
        },
      ].slice(0, 3);
  }
  return [
    ...known,
    {
      title: "Навигатор ФГОС СПО · " + code,
      url: navigator,
      kind: "catalog",
      locator: "",
      excerpt: "",
    },
  ].slice(0, 3);
}

export async function researchWorkGroup(input, group, documents, cache) {
  const get = requestCache(cache);
  const keys = terms([group.topic, group.query, group.englishQuery].join(" "));
  const chosen = programCode(input, documents);
  const provided = [
    ...new Set(
      [input.instruction, ...(input.replies || [])]
        .join(" ")
        .match(/https:\/\/[^\s<>"\])]+/giu) || [],
    ),
  ]
    .map((url) => allowedURL(url.replace(/[.,;]+$/u, "")))
    .filter(Boolean)
    .slice(0, 4);
  const lectures = documents.flatMap((doc) =>
    excerpts({ ...doc, kind: "lecture" }, keys),
  );
  const references = referencePages
    .filter((item) =>
      item.topic.test(
        group.topic + " " + group.query + " " + group.englishQuery,
      ),
    )
    .map((item) => item.url);
  const settled = await Promise.allSettled([
    officialProgram(chosen.code, keys, get),
    textbook(group, terms(group.englishQuery || ""), get),
    library(group, get),
    Promise.all([
      ...provided.map((link) =>
        publicDocument(link, chosen.code, keys, get, true),
      ),
      ...references.map((link) => publicDocument(link, chosen.code, keys, get)),
    ]).then((items) => items.flat()),
  ]);
  const items = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  const hasStandard = items.some((item) => item.kind === "standard");
  const hasExtract = !hasStandard && chosen.code === "43.02.15";
  if (hasExtract) items.unshift(...culinaryStandardExtracts);
  const hasRegistry = items.some((item) => item.kind === "registry");
  const sources = [...lectures, ...items]
    .slice(0, 14)
    .map((item, i) => ({ id: "s" + (i + 1), ...item }));
  return {
    sources,
    standardStatus: chosen.ambiguous
      ? "ambiguous"
      : hasStandard
        ? "text"
        : hasExtract
          ? "excerpt"
          : !chosen.code
            ? "no_program"
            : hasRegistry
              ? "registry"
              : "unavailable",
  };
}
