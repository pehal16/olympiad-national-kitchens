"use strict";

// Mechanical documentation export, not image authoring or approval.
const fs = require("node:fs"), path = require("node:path");
const bank = require("../data/banks/tour5-final-kitchen");
const directory = process.argv[2];
if (!directory) throw new Error("Supply the directory containing native generation receipts and main export reports.");
const receipts = ["hot", "fresh", "signature"].map(name => JSON.parse(fs.readFileSync(path.join(directory, `${name}.json`), "utf8")));
const latest = new Map(receipts.flatMap(receipt => receipt.items).map(item => [item.ingredientKey, item]));
const exportsByKey = new Map();
for (const filename of fs.readdirSync(directory).filter(name => /^main-(hot|fresh|signature)-\d+\.json$/.test(name)).sort()) {
  for (const item of JSON.parse(fs.readFileSync(path.join(directory, filename), "utf8")).items) exportsByKey.set(item.ingredientKey, item);
}
const positions = [];
for (const station of bank) for (const dish of station.dishes) {
  positions.push({ station: station.station.number, dish: dish.title, kind: "preview", key: `${dish.dishId}:preview`, label: dish.title });
  for (const item of dish.items) positions.push({ station: station.station.number, dish: dish.title, kind: "component", key: item.ingredientKey, label: item.text });
}
positions.push({ station: 1, dish: bank[0].dishes[0].title, kind: "unscored-base", key: "pizza-base", label: "Готовая пустая основа" });
if (positions.length !== 64) throw new Error("Expected 56 components, 7 previews and 1 unscored base.");
const items = positions.map(position => {
  const receipt = latest.get(position.key), exported = exportsByKey.get(position.key);
  if (!(receipt?.qa?.pass || receipt?.qa?.workerGeometryPass) || !exported?.mainAgentApproved || receipt.generatedPath !== exported.generatedPath) throw new Error(`Current generation is not approved/exported: ${position.key}`);
  return { ...position, ...receipt, kind: position.kind, workerReview: receipt.qa, qa: { pass: true, mainAgentApproved: true,
    method: "Native image individually viewed, then actual browser cards and scene layers reviewed; see QA ledger." },
    publicUrl: exported.publicUrl, outputBytes: exported.outputBytes,
    sourceDimensions: exported.sourceDimensions, outputSha256: exported.outputSha256,
    conversion: exported.conversion, mainAgentApproved: true };
});
const concepts = ["desktop", "selection", "intro", "mobile"].map(name => ({ name, ...JSON.parse(fs.readFileSync(path.join(directory, `concept-${name}.json`), "utf8")) }));
const output = path.join(__dirname, "..", "docs", "olympiad-t5-asset-provenance.json");
fs.writeFileSync(output, JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(),
  scope: "Organizer source register, not participant payload. No external source photograph copied into production assets.",
  toolLimitations: ["Direct board tool unavailable; native individual image review plus actual browser scene review used.",
    "Three reused historical pizza assets lack exact historical prompts; this is recorded, not fabricated.",
    "Some native cutouts have residual alpha 1/255 at a corner; actual white-scene review is the acceptance check."],
  concepts, items }, null, 2) + "\n");
const indexPath = path.join(__dirname, "..", "docs", "olympiad-t5-source-register.md");
if (fs.existsSync(indexPath)) {
  const escape = value => String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
  const rows = items.map(item => `| ${item.station} | ${escape(item.dish)} | ${escape(item.label)} | \`${item.key}\` | [источник](${item.sourceUrls[0]}) | [WebP](../public${item.publicUrl}) | принят |`);
  const table = ["| Станция | Блюдо | Позиция | Ключ записи JSON | Исследование | Рабочий файл | QA |", "|---|---|---|---|---|---|---|", ...rows].join("\n");
  const document = fs.readFileSync(indexPath, "utf8");
  if (!document.includes("<!-- ASSET_INDEX_START -->") || !document.includes("<!-- ASSET_INDEX_END -->")) throw new Error("Source register lacks mechanical index markers.");
  fs.writeFileSync(indexPath, document.replace(/<!-- ASSET_INDEX_START -->[\s\S]*?<!-- ASSET_INDEX_END -->/, `<!-- ASSET_INDEX_START -->\n${table}\n<!-- ASSET_INDEX_END -->`));
}
console.log(JSON.stringify({ output, positions: items.length, componentPositions: items.filter(i => i.kind === "component").length,
  uniqueNativeFiles: new Set(items.map(i => i.generatedPath)).size }));
