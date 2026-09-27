"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const register = require("../docs/olympiad-t5-asset-provenance.json");
const bank = require("../data/banks/tour5-final-kitchen");

test("T5 all 64 physical WebPs match approved register, dimensions, alpha and neutral URLs", () => {
  const root = path.resolve(__dirname, "..", "public");
  const urls = new Set(bank.flatMap(station => station.dishes.flatMap(dish => [dish.previewUrl,
    ...(dish.baseImageUrl ? [dish.baseImageUrl] : []), ...dish.items.flatMap(item => [item.imageUrl, item.layerImageUrl])])));
  assert.equal(register.items.length, 64);
  assert.equal(register.items.filter(item => item.kind === "component").length, 56);
  assert.equal(register.items.filter(item => item.kind === "preview").length, 7);
  assert.equal(register.items.filter(item => item.kind === "unscored-base").length, 1);
  assert.equal(urls.size, 64);
  assert.deepEqual(new Set(register.items.map(item => item.publicUrl)), urls);
  for (const item of register.items) {
    assert.match(item.publicUrl, /^\/assets\/olympiad\/tour5\/t5-v1-[a-f0-9]{12}\.webp$/);
    assert.equal(item.mainAgentApproved, true);
    assert.equal(item.qa.pass, true);
    assert.ok(item.sourceUrls.length && item.visualReferences.length, item.key);
    assert.ok(item.exactPrompt || item.historicalPromptAvailability, item.key);
    const bytes = fs.readFileSync(path.join(root, item.publicUrl));
    assert.equal(bytes.length, item.outputBytes);
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), item.outputSha256);
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
    const chunks = new Map();
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const tag = bytes.toString("ascii", offset, offset + 4), size = bytes.readUInt32LE(offset + 4);
      assert.ok(offset + 8 + size <= bytes.length, item.key);
      chunks.set(tag, bytes.subarray(offset + 8, offset + 8 + size));
      offset += 8 + size + (size % 2);
    }
    for (const metadata of ["EXIF", "XMP ", "ICCP"]) assert.equal(chunks.has(metadata), false);
    if (item.kind === "preview") {
      const extended = chunks.get("VP8X"), lossy = chunks.get("VP8 ");
      assert.equal(extended ? extended.readUIntLE(4, 3) + 1 : lossy.readUInt16LE(6) & 0x3fff, 900);
      assert.equal(extended ? extended.readUIntLE(7, 3) + 1 : lossy.readUInt16LE(8) & 0x3fff, 600);
    } else {
      const header = chunks.get("VP8X");
      assert.ok(header && (header[0] & 0x10), `${item.key}: alpha flag`);
      assert.equal(header.readUIntLE(4, 3) + 1, 768);
      assert.equal(header.readUIntLE(7, 3) + 1, 768);
      assert.ok(chunks.has("ALPH") || chunks.has("VP8L"), `${item.key}: actual alpha chunk`);
    }
  }
  assert.equal(fs.readdirSync(path.join(root, "assets/olympiad/tour5")).filter(name => name.endsWith(".webp")).length, 64);
});
