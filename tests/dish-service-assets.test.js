const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const registry = require('../docs/olympiad-october-2026-assets.json');

test('all four served-photo exports retain alpha, dimensions and reviewed asset hashes', () => {
  const root = path.resolve(__dirname,'..');
  const files = ['pizza-served-v3.webp','greek-served-v3.webp','roll-served-v3.webp','roll-accompaniments-v3.webp'];
  for (const file of files) {
    const relative = 'public/assets/olympiad/tour5/service/plates/'+file;
    const asset = registry.assets.find(a => a.path === relative);
    assert.ok(asset,relative+' lacks provenance');
    const bytes = fs.readFileSync(path.join(root,relative));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256);
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.equal(bytes.toString('ascii',12,16),'VP8X');
    assert.ok(bytes[20] & 0x10,'Alpha was lost: '+relative);
    assert.deepEqual([bytes.readUIntLE(24,3)+1,bytes.readUIntLE(27,3)+1],[1200,800]);
    assert.deepEqual(asset.alphaExtrema,[0,255]);
    assert.equal(asset.transparentBackground,true);
  }
});
