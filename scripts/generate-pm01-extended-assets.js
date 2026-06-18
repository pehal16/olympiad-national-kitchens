#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const WIDTH = 720;
const HEIGHT = 480;
const OUT_ROOT = path.join(__dirname, "..", "public", "assets", "pm01", "extended");

const assets = [
  ["cuts", "potato-shoestring", "strips", "potato", "#f1c84f"],
  ["cuts", "potato-tourne", "barrels", "potato", "#f3d36b"],
  ["cuts", "carrot-oblique", "oblique", "carrot", "#e97425"],
  ["cuts", "tomato-concasse", "dice", "tomato", "#d74335"],
  ["cuts", "onion-small-dice", "smallDice", "onion", "#f0eee0"],
  ["cuts", "cabbage-checkers", "checks", "cabbage", "#cae3a7"],
  ["cuts", "beet-cubes", "dice", "beet", "#7d1631"],
  ["cuts", "potato-parmentier", "dice", "potato", "#edcf67"],
  ["cuts", "pepper-strips", "strips", "pepper", "#d9342d"],
  ["cuts", "cucumber-half-moons", "halfMoons", "cucumber", "#77a95a"],
  ["cuts", "mushroom-slices", "slices", "mushroom", "#d5c1a3"],
  ["cuts", "greens-chopped", "smallDice", "greens", "#29894d"],

  ["meat", "beef-medallions", "medallions", "beef", "#a92e2c"],
  ["meat", "beef-steak-natural", "steak", "beef", "#a72d2d"],
  ["meat", "beef-escalope", "escalope", "beef", "#b8443a"],
  ["meat", "beef-stroganoff-strips", "strips", "beef", "#a73532"],
  ["meat", "beef-shashlik-cubes", "meatCubes", "beef", "#a52e2c"],
  ["meat", "pork-schnitzel-breaded", "breaded", "pork", "#cc9552"],
  ["meat", "pork-chop-bone-in", "boneIn", "pork", "#d28577"],
  ["meat", "lamb-ragout-bone-in", "ragout", "lamb", "#9f3e36"],
  ["meat", "meat-mince-portions", "mincePortions", "beef", "#9a3c35"],
  ["meat", "meat-bones-broth", "bones", "bone", "#efe1c8"],

  ["fish", "whole-fish-cleaned", "wholeFish", "fish", "#d7dde0"],
  ["fish", "fish-steak-crosscut", "fishSteak", "fish", "#e7bd9c"],
  ["fish", "fish-fillet-skin-on", "fishFilletSkin", "fish", "#f0c8ad"],
  ["fish", "fish-fillet-skinless", "fishFillet", "fish", "#f2caba"],
  ["fish", "fish-butterfly-fillet", "fishButterfly", "fish", "#efc4b4"],
  ["fish", "fish-trim-head-tail", "fishTrim", "fish", "#cfd8dc"],
  ["fish", "fish-roll", "fishRoll", "fish", "#f0c7b5"],
  ["fish", "fish-balls", "balls", "fish", "#eec7b8"],
  ["fish", "fish-sticks-breaded", "sticksBreaded", "fish", "#c99045"],
  ["fish", "fish-quenelles", "quenelles", "fish", "#f2d1c4"],

  ["poultry", "whole-chicken-prepared", "wholeChicken", "poultry", "#efc7aa"],
  ["poultry", "chicken-breast-butterfly", "butterflyBreast", "poultry", "#f0cab7"],
  ["poultry", "chicken-wing-segments", "wingSegments", "poultry", "#e7b68f"],
  ["poultry", "chicken-supreme", "supreme", "poultry", "#efc7aa"],
  ["poultry", "chicken-front-quarter", "frontQuarter", "poultry", "#e9b991"],
  ["poultry", "chicken-back-broth", "backBroth", "poultry", "#e2ad88"],
  ["poultry", "rabbit-saddle", "rabbitSaddle", "rabbit", "#d6aa92"],
  ["poultry", "rabbit-hind-leg", "rabbitLeg", "rabbit", "#d8b09a"],
  ["poultry", "poultry-cutlets", "cutlets", "poultry", "#b87348"],
  ["poultry", "poultry-quenelles", "quenelles", "poultry", "#f0d1bf"],

  ["safety", "color-coded-boards", "boards", "safety", "#2f8f5f"],
  ["safety", "knife-sanitizing", "knifeSanitize", "safety", "#dce8e5"],
  ["safety", "thermometer-check", "thermometer", "safety", "#e9f0ee"],
  ["safety", "vacuum-packaging", "vacuum", "safety", "#dbeaf3"],
  ["safety", "labelled-container", "container", "safety", "#eff4f2"],
  ["safety", "fridge-separate-storage", "fridge", "safety", "#dfe9f0"],
  ["safety", "waste-bin-separated", "wasteBin", "safety", "#1f6f58"],
  ["safety", "glove-change-handwash", "handwash", "safety", "#d8ecf2"]
];

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, pixels) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    raw[rowOffset] = 0;
    Buffer.from(pixels.buffer, y * width * 4, width * 4).copy(raw, rowOffset + 1);
  }
  return Buffer.concat([
    header,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16)
  ];
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function shade(hex, factor) {
  const [r, g, b] = Array.isArray(hex) ? hex : hexToRgb(hex);
  return [
    Math.max(0, Math.min(255, Math.round(r * factor))),
    Math.max(0, Math.min(255, Math.round(g * factor))),
    Math.max(0, Math.min(255, Math.round(b * factor)))
  ];
}

function rng(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return h / 0x100000000;
  };
}

function canvas() {
  return new Uint8Array(WIDTH * HEIGHT * 4);
}

function setPixel(pixels, x, y, color, alpha = 1) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) {
    return;
  }
  const index = (Math.floor(y) * WIDTH + Math.floor(x)) * 4;
  const a = Math.max(0, Math.min(1, alpha));
  pixels[index] = mix(pixels[index], color[0], a);
  pixels[index + 1] = mix(pixels[index + 1], color[1], a);
  pixels[index + 2] = mix(pixels[index + 2], color[2], a);
  pixels[index + 3] = 255;
}

function fillBackground(pixels, random) {
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const t = y / HEIGHT;
      const steel = 220 + Math.round(24 * (1 - t));
      const noise = Math.round((random() - 0.5) * 8);
      setPixel(pixels, x, y, [steel + noise, steel + noise + 3, steel + noise + 1]);
    }
  }
  rect(pixels, 0, 0, WIDTH, 150, [228, 235, 232], 1);
  for (let i = 0; i < 8; i += 1) {
    const x = 35 + i * 88;
    roundedRect(pixels, x, 26, 56, 78, 6, [190, 199, 197], 0.34);
    roundedRect(pixels, x + 8, 38, 40, 16, 5, [145, 155, 153], 0.25);
  }
  rect(pixels, 0, 340, WIDTH, 140, [196, 203, 201], 0.18);
  for (let x = 0; x < WIDTH; x += 18) {
    line(pixels, x, 360, x + 130, 480, [255, 255, 255], 0.05, 1);
  }
}

function rect(pixels, x, y, w, h, color, alpha = 1) {
  for (let yy = Math.max(0, y); yy < Math.min(HEIGHT, y + h); yy += 1) {
    for (let xx = Math.max(0, x); xx < Math.min(WIDTH, x + w); xx += 1) {
      setPixel(pixels, xx, yy, color, alpha);
    }
  }
}

function roundedRect(pixels, x, y, w, h, r, color, alpha = 1) {
  for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(HEIGHT, Math.ceil(y + h)); yy += 1) {
    for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(WIDTH, Math.ceil(x + w)); xx += 1) {
      const dx = Math.max(x - xx, 0, xx - (x + w - 1));
      const dy = Math.max(y - yy, 0, yy - (y + h - 1));
      const cx = xx < x + r ? x + r : xx > x + w - r ? x + w - r : xx;
      const cy = yy < y + r ? y + r : yy > y + h - r ? y + h - r : yy;
      const insideCorner = Math.hypot(xx - cx, yy - cy) <= r;
      if ((dx === 0 && dy === 0) || insideCorner) {
        setPixel(pixels, xx, yy, color, alpha);
      }
    }
  }
}

function ellipse(pixels, cx, cy, rx, ry, color, alpha = 1, angle = 0) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const radius = Math.max(rx, ry);
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const px = dx * cos + dy * sin;
      const py = -dx * sin + dy * cos;
      if ((px * px) / (rx * rx) + (py * py) / (ry * ry) <= 1) {
        setPixel(pixels, x, y, color, alpha);
      }
    }
  }
}

function polygon(pixels, points, color, alpha = 1) {
  const minX = Math.floor(Math.min(...points.map((p) => p[0])));
  const maxX = Math.ceil(Math.max(...points.map((p) => p[0])));
  const minY = Math.floor(Math.min(...points.map((p) => p[1])));
  const maxY = Math.ceil(Math.max(...points.map((p) => p[1])));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        const xi = points[i][0];
        const yi = points[i][1];
        const xj = points[j][0];
        const yj = points[j][1];
        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1) + xi;
        if (intersect) {
          inside = !inside;
        }
      }
      if (inside) {
        setPixel(pixels, x, y, color, alpha);
      }
    }
  }
}

function rotatedRect(pixels, cx, cy, w, h, angle, color, alpha = 1) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const hw = w / 2;
  const hh = h / 2;
  const radius = Math.hypot(hw, hh);
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const px = dx * cos + dy * sin;
      const py = -dx * sin + dy * cos;
      if (Math.abs(px) <= hw && Math.abs(py) <= hh) {
        setPixel(pixels, x, y, color, alpha);
      }
    }
  }
}

function line(pixels, x1, y1, x2, y2, color, alpha = 1, width = 4) {
  const minX = Math.floor(Math.min(x1, x2) - width);
  const maxX = Math.ceil(Math.max(x1, x2) + width);
  const minY = Math.floor(Math.min(y1, y2) - width);
  const maxY = Math.ceil(Math.max(y1, y2) + width);
  const vx = x2 - x1;
  const vy = y2 - y1;
  const len = vx * vx + vy * vy || 1;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const t = Math.max(0, Math.min(1, ((x - x1) * vx + (y - y1) * vy) / len));
      const px = x1 + t * vx;
      const py = y1 + t * vy;
      if (Math.hypot(x - px, y - py) <= width / 2) {
        setPixel(pixels, x, y, color, alpha);
      }
    }
  }
}

function boardColor(category) {
  if (category === "fish") return [156, 197, 228];
  if (category === "meat") return [219, 63, 57];
  if (category === "poultry") return [237, 184, 92];
  if (category === "safety") return [235, 241, 239];
  return [64, 148, 96];
}

function drawBoard(pixels, category) {
  ellipse(pixels, 360, 422, 258, 32, [42, 54, 50], 0.16);
  roundedRect(pixels, 80, 155, 560, 250, 20, boardColor(category), 0.96);
  roundedRect(pixels, 97, 172, 526, 216, 12, [255, 255, 255], 0.12);
}

function foodColor(base, random, i = 0) {
  const color = shade(base, 0.88 + random() * 0.22);
  if (i % 3 === 0) color[0] = Math.min(255, color[0] + 12);
  return color;
}

function drawCut(pixels, random, asset) {
  const base = asset.color;
  const edge = shade(base, 0.64);
  if (["strips", "oblique"].includes(asset.kind)) {
    for (let i = 0; i < 56; i += 1) {
      const x = 180 + random() * 350;
      const y = 210 + random() * 130;
      const angle = -0.8 + random() * 1.6;
      const w = asset.kind === "oblique" ? 76 : 118;
      const h = asset.kind === "oblique" ? 18 : 9 + random() * 8;
      rotatedRect(pixels, x, y, w, h, angle, edge, 0.28);
      rotatedRect(pixels, x, y - 2, w, h, angle, foodColor(base, random, i), 0.95);
    }
    return;
  }
  if (["dice", "smallDice", "checks"].includes(asset.kind)) {
    const count = asset.kind === "smallDice" ? 115 : asset.kind === "checks" ? 34 : 58;
    for (let i = 0; i < count; i += 1) {
      const x = 170 + random() * 380;
      const y = 205 + random() * 135;
      const size = asset.kind === "smallDice" ? 9 + random() * 11 : asset.kind === "checks" ? 30 + random() * 18 : 20 + random() * 18;
      rotatedRect(pixels, x + 2, y + 4, size, size * 0.9, random() * 1.2, edge, 0.25);
      rotatedRect(pixels, x, y, size, size * 0.9, random() * 1.2, foodColor(base, random, i), 0.95);
    }
    return;
  }
  if (asset.kind === "halfMoons") {
    for (let i = 0; i < 30; i += 1) {
      const x = 170 + random() * 380;
      const y = 205 + random() * 135;
      ellipse(pixels, x, y, 34, 18, edge, 0.35, random());
      ellipse(pixels, x, y - 2, 32, 16, foodColor(base, random, i), 0.94, random());
      rect(pixels, x - 36, y - 2, 72, 20, boardColor("cuts"), 0.28);
    }
    return;
  }
  if (asset.kind === "slices") {
    for (let i = 0; i < 36; i += 1) {
      ellipse(pixels, 180 + random() * 370, 208 + random() * 130, 38, 18, foodColor(base, random, i), 0.9, random());
    }
    return;
  }
  if (asset.kind === "barrels") {
    for (let i = 0; i < 26; i += 1) {
      const x = 190 + random() * 330;
      const y = 210 + random() * 120;
      ellipse(pixels, x, y, 32, 20, edge, 0.35, random());
      roundedRect(pixels, x - 22, y - 16, 44, 32, 14, foodColor(base, random, i), 0.95);
      ellipse(pixels, x, y - 14, 22, 8, [255, 238, 158], 0.25, random());
    }
  }
}

function drawMeat(pixels, random, asset) {
  const base = asset.color;
  const dark = shade(base, 0.66);
  if (asset.kind === "steak" || asset.kind === "escalope") {
    ellipse(pixels, 360, 282, asset.kind === "steak" ? 180 : 205, asset.kind === "steak" ? 78 : 58, dark, 0.4, -0.1);
    ellipse(pixels, 360, 270, asset.kind === "steak" ? 176 : 200, asset.kind === "steak" ? 76 : 56, shade(base, 1.05), 0.96, -0.1);
    line(pixels, 245, 262, 475, 282, [245, 198, 187], 0.5, 11);
    line(pixels, 300, 238, 445, 248, [255, 220, 212], 0.35, 5);
    return;
  }
  if (["medallions", "cutlets", "mincePortions"].includes(asset.kind)) {
    for (let i = 0; i < 7; i += 1) {
      const x = 220 + (i % 4) * 92 + random() * 16;
      const y = 230 + Math.floor(i / 4) * 82 + random() * 12;
      ellipse(pixels, x, y, 50, 34, dark, 0.32, random());
      ellipse(pixels, x, y - 3, 47, 31, foodColor(base, random, i), 0.96, random());
      line(pixels, x - 28, y - 2, x + 25, y + 7, [245, 200, 190], 0.28, 5);
    }
    return;
  }
  if (["strips", "meatCubes", "ragout"].includes(asset.kind)) {
    const count = asset.kind === "strips" ? 36 : 26;
    for (let i = 0; i < count; i += 1) {
      const x = 185 + random() * 350;
      const y = 218 + random() * 125;
      const w = asset.kind === "strips" ? 96 : 46;
      const h = asset.kind === "strips" ? 20 : 40;
      rotatedRect(pixels, x + 3, y + 4, w, h, random() * 1.5, dark, 0.3);
      rotatedRect(pixels, x, y, w, h, random() * 1.5, foodColor(base, random, i), 0.96);
      line(pixels, x - w / 3, y - 2, x + w / 4, y + 3, [243, 198, 188], 0.24, 4);
      if (asset.kind === "ragout" && i % 3 === 0) ellipse(pixels, x + 12, y + 6, 14, 9, [236, 224, 199], 0.85, random());
    }
    return;
  }
  if (asset.kind === "breaded") {
    for (let i = 0; i < 5; i += 1) {
      ellipse(pixels, 215 + i * 75, 268 + (i % 2) * 30, 68, 31, [148, 94, 40], 0.3, random());
      ellipse(pixels, 215 + i * 75, 264 + (i % 2) * 30, 65, 29, foodColor(base, random, i), 0.98, random());
    }
    return;
  }
  if (asset.kind === "boneIn" || asset.kind === "bones") {
    for (let i = 0; i < 5; i += 1) {
      const x = 205 + i * 82;
      ellipse(pixels, x, 270 + random() * 40, 58, 32, asset.kind === "bones" ? [238, 225, 199] : foodColor(base, random, i), 0.96, random());
      line(pixels, x + 30, 268, x + 88, 244 + random() * 35, [239, 226, 202], 0.96, 17);
      ellipse(pixels, x + 90, 242 + random() * 35, 18, 14, [239, 226, 202], 0.96, random());
    }
  }
}

function fishShape(pixels, cx, cy, scale, color, random) {
  const dark = shade(color, 0.72);
  polygon(pixels, [[cx - 150 * scale, cy], [cx - 60 * scale, cy - 58 * scale], [cx + 128 * scale, cy - 28 * scale], [cx + 170 * scale, cy], [cx + 125 * scale, cy + 34 * scale], [cx - 70 * scale, cy + 56 * scale]], dark, 0.3);
  polygon(pixels, [[cx - 150 * scale, cy - 4], [cx - 60 * scale, cy - 62 * scale], [cx + 128 * scale, cy - 32 * scale], [cx + 170 * scale, cy - 3], [cx + 125 * scale, cy + 30 * scale], [cx - 70 * scale, cy + 52 * scale]], color, 0.96);
  line(pixels, cx - 70 * scale, cy - 4, cx + 95 * scale, cy - 12, [255, 235, 224], 0.28, 5);
  for (let i = 0; i < 7; i += 1) {
    line(pixels, cx - 25 * scale + i * 22 * scale, cy - 35 * scale, cx - 40 * scale + i * 22 * scale, cy + 35 * scale, [185, 137, 116], 0.23, 2);
  }
}

function drawFish(pixels, random, asset) {
  const base = hexToRgb(asset.color);
  if (asset.kind === "wholeFish") {
    fishShape(pixels, 355, 270, 1.05, base, random);
    ellipse(pixels, 480, 255, 5, 5, [25, 33, 34], 0.9);
    return;
  }
  if (["fishFillet", "fishFilletSkin", "fishButterfly"].includes(asset.kind)) {
    if (asset.kind === "fishButterfly") {
      fishShape(pixels, 300, 270, 0.65, base, random);
      fishShape(pixels, 430, 270, 0.65, base, random);
    } else {
      fishShape(pixels, 360, 270, 0.95, base, random);
      if (asset.kind === "fishFilletSkin") line(pixels, 195, 307, 520, 285, [77, 94, 100], 0.42, 14);
    }
    return;
  }
  if (asset.kind === "fishSteak") {
    for (let i = 0; i < 5; i += 1) {
      const x = 220 + i * 78;
      ellipse(pixels, x, 270 + (i % 2) * 22, 48, 36, [178, 130, 105], 0.35, random());
      ellipse(pixels, x, 266 + (i % 2) * 22, 45, 33, base, 0.96, random());
      ellipse(pixels, x, 266 + (i % 2) * 22, 20, 14, [241, 219, 190], 0.9, random());
    }
    return;
  }
  if (asset.kind === "fishTrim") {
    fishShape(pixels, 250, 270, 0.5, [199, 211, 214], random);
    polygon(pixels, [[420, 230], [520, 255], [420, 290]], [199, 211, 214], 0.92);
    line(pixels, 405, 320, 520, 330, [210, 180, 150], 0.7, 16);
    return;
  }
  if (asset.kind === "fishRoll") {
    for (let i = 0; i < 5; i += 1) {
      ellipse(pixels, 220 + i * 78, 270 + random() * 26, 34, 44, [222, 154, 132], 0.3, random());
      ellipse(pixels, 220 + i * 78, 265 + random() * 26, 31, 41, base, 0.96, random());
      ellipse(pixels, 220 + i * 78, 265 + random() * 26, 17, 23, [248, 226, 214], 0.65, random());
    }
    return;
  }
  if (["balls", "quenelles"].includes(asset.kind)) {
    for (let i = 0; i < 9; i += 1) {
      const x = 210 + (i % 5) * 78;
      const y = 240 + Math.floor(i / 5) * 70;
      ellipse(pixels, x, y, asset.kind === "balls" ? 30 : 42, asset.kind === "balls" ? 30 : 22, base, 0.96, random());
    }
    return;
  }
  if (asset.kind === "sticksBreaded") {
    for (let i = 0; i < 11; i += 1) {
      rotatedRect(pixels, 185 + random() * 360, 225 + random() * 110, 118, 24, random() - 0.5, [201, 148, 69], 0.96);
    }
  }
}

function drawPoultry(pixels, random, asset) {
  const base = hexToRgb(asset.color);
  const dark = shade(asset.color, 0.75);
  if (asset.kind === "wholeChicken") {
    ellipse(pixels, 350, 270, 118, 72, dark, 0.3, -0.1);
    ellipse(pixels, 350, 264, 112, 68, base, 0.96, -0.1);
    ellipse(pixels, 245, 280, 42, 28, base, 0.92, 0.6);
    ellipse(pixels, 465, 280, 42, 28, base, 0.92, -0.6);
    return;
  }
  if (["butterflyBreast", "supreme", "rabbitSaddle"].includes(asset.kind)) {
    ellipse(pixels, 300, 265, 92, 42, base, 0.95, -0.3);
    ellipse(pixels, 420, 265, 92, 42, base, 0.95, 0.3);
    line(pixels, 360, 220, 360, 320, [255, 235, 222], 0.32, 8);
    if (asset.kind === "supreme") line(pixels, 490, 252, 565, 232, [236, 218, 194], 0.9, 12);
    return;
  }
  if (["wingSegments", "frontQuarter", "backBroth", "rabbitLeg"].includes(asset.kind)) {
    for (let i = 0; i < 7; i += 1) {
      const x = 205 + (i % 4) * 95;
      const y = 235 + Math.floor(i / 4) * 78;
      ellipse(pixels, x, y, 52, 31, base, 0.95, random());
      line(pixels, x + 20, y + 7, x + 76, y - 18, [234, 215, 190], 0.88, 11);
    }
    return;
  }
  if (["cutlets", "quenelles"].includes(asset.kind)) {
    for (let i = 0; i < 7; i += 1) {
      ellipse(pixels, 220 + (i % 4) * 86, 240 + Math.floor(i / 4) * 74, asset.kind === "cutlets" ? 47 : 42, asset.kind === "cutlets" ? 28 : 20, base, 0.96, random());
    }
  }
}

function drawSafety(pixels, random, asset) {
  const steel = [230, 236, 234];
  if (asset.kind === "boards") {
    [[120, 205, [60, 150, 85]], [250, 230, [72, 135, 199]], [385, 205, [207, 55, 51]], [500, 235, [235, 184, 77]]].forEach(([x, y, color]) => {
      roundedRect(pixels, x, y, 118, 82, 10, color, 0.96);
      roundedRect(pixels, x + 12, y + 12, 94, 58, 7, [255, 255, 255], 0.12);
    });
    return;
  }
  if (asset.kind === "knifeSanitize") {
    roundedRect(pixels, 205, 228, 240, 70, 12, [198, 220, 219], 0.92);
    line(pixels, 230, 263, 450, 263, [145, 154, 154], 1, 22);
    line(pixels, 445, 263, 552, 240, [47, 64, 61], 1, 20);
    for (let i = 0; i < 18; i += 1) ellipse(pixels, 240 + random() * 190, 230 + random() * 70, 10, 7, [255, 255, 255], 0.55, random());
    return;
  }
  if (asset.kind === "thermometer") {
    ellipse(pixels, 310, 276, 82, 48, [174, 49, 43], 0.92, random());
    line(pixels, 395, 250, 550, 210, [216, 224, 224], 1, 10);
    ellipse(pixels, 552, 210, 14, 14, [216, 224, 224], 1);
    return;
  }
  if (asset.kind === "vacuum") {
    for (let i = 0; i < 4; i += 1) {
      roundedRect(pixels, 170 + i * 93, 225 + (i % 2) * 34, 82, 72, 9, [215, 232, 242], 0.68);
      ellipse(pixels, 211 + i * 93, 258 + (i % 2) * 34, 32, 19, [205, 118, 94], 0.88, random());
    }
    return;
  }
  if (asset.kind === "container") {
    roundedRect(pixels, 210, 220, 300, 122, 16, [244, 249, 247], 0.9);
    roundedRect(pixels, 225, 236, 270, 92, 12, [210, 230, 224], 0.65);
    roundedRect(pixels, 250, 205, 220, 28, 8, steel, 0.92);
    return;
  }
  if (asset.kind === "fridge") {
    roundedRect(pixels, 150, 170, 420, 210, 14, [219, 231, 237], 0.92);
    for (let i = 0; i < 3; i += 1) line(pixels, 170, 220 + i * 52, 550, 220 + i * 52, [139, 161, 170], 0.7, 4);
    ellipse(pixels, 240, 205, 42, 21, [222, 58, 50], 0.86, random());
    ellipse(pixels, 388, 258, 48, 22, [231, 196, 91], 0.86, random());
    ellipse(pixels, 500, 310, 43, 21, [176, 211, 120], 0.86, random());
    return;
  }
  if (asset.kind === "wasteBin") {
    roundedRect(pixels, 240, 210, 145, 150, 18, [38, 111, 88], 0.96);
    roundedRect(pixels, 228, 190, 170, 32, 10, [28, 84, 68], 0.98);
    ellipse(pixels, 465, 255, 68, 40, [235, 215, 184], 0.92, random());
    return;
  }
  if (asset.kind === "handwash") {
    roundedRect(pixels, 235, 210, 250, 98, 20, [210, 229, 235], 0.95);
    line(pixels, 260, 250, 420, 250, [164, 194, 205], 0.95, 22);
    for (let i = 0; i < 24; i += 1) ellipse(pixels, 260 + random() * 190, 210 + random() * 90, 9, 7, [255, 255, 255], 0.64, random());
  }
}

function drawAsset(asset) {
  const pixels = canvas();
  const random = rng(asset.slug);
  fillBackground(pixels, random);
  drawBoard(pixels, asset.category);
  if (asset.category === "cuts") drawCut(pixels, random, asset);
  if (asset.category === "meat") drawMeat(pixels, random, asset);
  if (asset.category === "fish") drawFish(pixels, random, asset);
  if (asset.category === "poultry") drawPoultry(pixels, random, asset);
  if (asset.category === "safety") drawSafety(pixels, random, asset);
  return pixels;
}

function main() {
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  const manifest = [];
  for (const [category, slug, kind, product, color] of assets) {
    const asset = { category, slug, kind, product, color };
    const pixels = drawAsset(asset);
    const outDir = path.join(OUT_ROOT, category);
    fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, `${slug}.png`);
    fs.writeFileSync(filePath, encodePng(WIDTH, HEIGHT, pixels));
    manifest.push(`/assets/pm01/extended/${category}/${slug}.png`);
  }
  console.log(JSON.stringify({ ok: true, count: manifest.length, outRoot: OUT_ROOT }, null, 2));
}

main();
