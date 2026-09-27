"use strict";

// Deterministic format conversion only. Native image generation and individual
// visual approval happen before this script; no image is synthesized here.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const bank = require("../data/banks/tour5-final-kitchen");
const root = path.resolve(__dirname, "..");
const assets = path.join(root, "public", "assets", "olympiad", "tour5");

async function main() {
  const [receiptPath, approvalList, reportPath] = process.argv.slice(2);
  if (!receiptPath || !approvalList || !reportPath) {
    throw new Error("Usage: node export-final-kitchen-assets.js receipt.json approvedID,approvedID report.json; SHARP_MODULE supplies an installed sharp path.");
  }
  const sharp = require(process.env.SHARP_MODULE || "sharp");
  const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  const approved = new Set(approvalList.split(","));
  const receiptIds = new Set((receipt.items || []).map(item => item.id));
  if ([...approved].some(id => !receiptIds.has(id))) throw new Error("Approval IDs not all present in receipt; no assets written.");
  const mapping = new Map();
  for (const station of bank) for (const dish of station.dishes) {
    mapping.set(`${dish.dishId}:preview`, { url: dish.previewUrl, hero: true });
    for (const item of dish.items) mapping.set(item.ingredientKey, { url: item.imageUrl, hero: false });
  }
  if (bank[0].dishes[0].baseImageUrl) mapping.set("pizza-base", { url: bank[0].dishes[0].baseImageUrl, hero: false });
  const results = [];
  for (const item of receipt.items || []) {
    if (!approved.has(item.id)) continue;
    const target = mapping.get(item.ingredientKey);
    if (!target || !item.generatedPath || !(item.qa?.pass || item.qa?.workerGeometryPass)) throw new Error(`Unmapped or unreviewed asset: ${item.id}`);
    const source = path.resolve(item.generatedPath);
    if (!/\.(png|webp)$/i.test(source)) throw new Error("Only native PNG or reviewed WebP source assets are allowed.");
    const destination = path.resolve(root, "public", `.${target.url}`);
    if (path.dirname(destination) !== assets) throw new Error("Asset target is outside the new T5 directory.");
    const metadata = await sharp(source).metadata();
    if (!target.hero) {
      const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let transparent = 0, visible = 0;
      for (let i = 3; i < data.length; i += info.channels) {
        if (data[i] < 8) transparent++;
        if (data[i] > 16) visible++;
      }
      const pixels = info.width * info.height;
      // Genuine oil is translucent. Requiring opaque pixels would reject a valid liquid layer.
      if (transparent < pixels * .08 || visible < pixels * .015) throw new Error(`Missing usable alpha cutout: ${item.id}`);
    }
    fs.mkdirSync(assets, { recursive: true });
    const output = await sharp(source).resize(target.hero ? 900 : 768, target.hero ? 600 : 768, {
      fit: "contain", background: target.hero ? "#ffffff" : { r: 0, g: 0, b: 0, alpha: 0 }
    }).webp({ quality: 87, alphaQuality: 100, effort: 6 }).toBuffer();
    fs.writeFileSync(destination, output);
    results.push({ ...item, publicUrl: target.url, outputBytes: output.length,
      sourceDimensions: [metadata.width, metadata.height],
      outputSha256: crypto.createHash("sha256").update(output).digest("hex"),
      mainAgentApproved: true, conversion: "contain; no crop; WebP; metadata stripped; alpha preserved" });
  }
  if (results.length !== approved.size) throw new Error("Approval IDs not all present in receipt.");
  fs.writeFileSync(reportPath, JSON.stringify({ exportedAt: new Date().toISOString(), items: results }, null, 2));
  console.log(JSON.stringify(results.map(({ id, publicUrl, outputBytes }) => ({ id, publicUrl, outputBytes })), null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
