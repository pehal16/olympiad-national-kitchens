// Natural Earth public-domain land geometry; no dish/answer data enters this asset.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const bytes = fs.readFileSync(path.join(root, 'output/story/layout3/ne_110m_land.geojson'));
const source = JSON.parse(bytes);
const project = ([lon, lat]) => [((lon + 180) / 360 * 1000).toFixed(2), ((85 - lat) / 145 * 500).toFixed(2)];
const rings = [];
for (const { geometry } of source.features) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons) for (const ring of polygon) rings.push('M' + ring.map(point => project(point).join(',')).join('L') + 'Z');
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500"><title>Карта мира</title><rect width="1000" height="500" fill="#eef1e8"/><path d="${rings.join('')}" fill="#b9c8b8" stroke="#8fa694" stroke-width=".65" fill-rule="evenodd"/></svg>`;
const output = 'public/assets/olympiad/story/layout-v3/world-land.svg';
fs.mkdirSync(path.dirname(path.join(root, output)), { recursive: true });
fs.writeFileSync(path.join(root, output), svg);
fs.writeFileSync(path.join(root, 'docs/restaurant-world-map-source.json'), JSON.stringify({
  author: 'Natural Earth', license: 'Public domain',
  source: 'https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-land/',
  terms: 'https://www.naturalearthdata.com/about/terms-of-use/',
  sourceData: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson',
  sourceSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  projection: 'Equirectangular, longitude -180..180, latitude 85..-60',
  output, bytes: Buffer.byteLength(svg), markingKeys: false
}, null, 2) + '\n');
console.log(`Exported ${output}: ${Buffer.byteLength(svg)} bytes`);
