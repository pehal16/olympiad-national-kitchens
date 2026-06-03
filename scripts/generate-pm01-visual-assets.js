#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "public", "assets", "pm01");

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeAsset(relativePath, svg) {
  const filePath = path.join(outDir, relativePath);
  ensureDir(filePath);
  fs.writeFileSync(filePath, svg);
}

function svgRoot(width, height, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
  <defs>
    <linearGradient id="steel" x1="0" x2="1">
      <stop offset="0" stop-color="#eef3f1"/>
      <stop offset="1" stop-color="#c6d2cf"/>
    </linearGradient>
    <linearGradient id="board" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#f7fbf8"/>
      <stop offset="1" stop-color="#dbe9e1"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#0e2a22" flood-opacity=".18"/>
    </filter>
  </defs>
  ${body}
</svg>
`;
}

function board(children) {
  return `
  <rect width="960" height="640" fill="#f4f7f2"/>
  <rect x="70" y="70" width="820" height="500" rx="24" fill="url(#board)" stroke="#b7c8c0" stroke-width="4" filter="url(#shadow)"/>
  ${children}
`;
}

function cutAsset(kind) {
  const carrot = "#ee7d24";
  const potato = "#f5d173";
  const cucumber = "#69a95b";
  const onion = "#f2f0db";
  let shapes = "";

  if (kind === "batonnet") {
    for (let i = 0; i < 9; i += 1) {
      shapes += `<rect x="${210 + i * 48}" y="${210 + (i % 3) * 38}" width="34" height="250" rx="11" fill="${i % 2 ? potato : carrot}" stroke="#c56b23" stroke-width="2" transform="rotate(${i % 2 ? -8 : 6} ${230 + i * 48} 330)"/>`;
    }
  } else if (kind === "wedges") {
    for (let i = 0; i < 10; i += 1) {
      const x = 200 + (i % 5) * 110;
      const y = 210 + Math.floor(i / 5) * 125;
      shapes += `<path d="M${x} ${y + 88} C${x + 18} ${y + 10} ${x + 95} ${y + 4} ${x + 112} ${y + 88} Z" fill="${potato}" stroke="#caa144" stroke-width="4"/>`;
      shapes += `<path d="M${x + 14} ${y + 82} C${x + 42} ${y + 55} ${x + 72} ${y + 50} ${x + 100} ${y + 82}" fill="none" stroke="#e5b84d" stroke-width="5"/>`;
    }
  } else if (kind === "rings") {
    for (let i = 0; i < 13; i += 1) {
      const x = 170 + (i % 5) * 145;
      const y = 160 + Math.floor(i / 5) * 120;
      shapes += `<ellipse cx="${x}" cy="${y}" rx="54" ry="38" fill="none" stroke="${i % 2 ? onion : cucumber}" stroke-width="18"/>`;
      shapes += `<ellipse cx="${x}" cy="${y}" rx="28" ry="18" fill="none" stroke="#d6d2b9" stroke-width="5"/>`;
    }
  } else if (kind === "slices") {
    for (let i = 0; i < 18; i += 1) {
      const x = 160 + (i % 6) * 110;
      const y = 165 + Math.floor(i / 6) * 95;
      shapes += `<ellipse cx="${x}" cy="${y}" rx="48" ry="26" fill="${i % 3 ? cucumber : potato}" stroke="#4f8d46" stroke-width="5" transform="rotate(${(i % 5) * 7 - 14} ${x} ${y})"/>`;
      shapes += `<ellipse cx="${x}" cy="${y}" rx="28" ry="14" fill="#e9f1c7" opacity=".8" transform="rotate(${(i % 5) * 7 - 14} ${x} ${y})"/>`;
    }
  }

  return svgRoot(960, 640, board(shapes));
}

function productAsset(kind) {
  const base = `
  <rect width="960" height="640" fill="#f4f7f2"/>
  <rect x="90" y="82" width="780" height="476" rx="22" fill="#f7fbf8" stroke="#b7c8c0" stroke-width="4" filter="url(#shadow)"/>
  <rect x="145" y="134" width="670" height="370" rx="18" fill="#d8e9e6" stroke="#9bb9b1" stroke-width="3"/>
`;
  let body = "";
  const fish = "#e9cf9f";
  const fishEdge = "#9a7248";
  const fishLine = "#bd8f5a";
  const meat = "#b83a34";
  const fat = "#f8d7c8";
  const crumb = "#d69b45";

  if (kind === "fish-fillet") {
    body = `<path d="M225 330 C310 205 555 180 725 285 C590 385 360 435 225 330 Z" fill="${fish}" stroke="${fishEdge}" stroke-width="7"/>
      <path d="M300 325 C410 278 575 265 680 292" fill="none" stroke="${fishLine}" stroke-width="9" stroke-linecap="round"/>
      <path d="M318 350 C440 325 580 310 660 327" fill="none" stroke="#fff3dd" stroke-width="5" stroke-linecap="round"/>`;
  } else if (kind === "fish-portion") {
    for (let i = 0; i < 6; i += 1) {
      const x = 185 + i * 105;
      body += `<path d="M${x} 230 L${x + 82} 248 L${x + 62} 404 L${x - 14} 388 Z" fill="${fish}" stroke="${fishEdge}" stroke-width="7"/>
        <path d="M${x + 16} 260 L${x + 62} 270" stroke="${fishLine}" stroke-width="7" stroke-linecap="round"/>
        <path d="M${x + 10} 356 L${x + 56} 368" stroke="#fff3dd" stroke-width="5" stroke-linecap="round"/>`;
    }
  } else if (kind === "fish-cutlets") {
    for (let i = 0; i < 6; i += 1) {
      const x = 245 + (i % 3) * 165;
      const y = 235 + Math.floor(i / 3) * 120;
      body += `<ellipse cx="${x}" cy="${y}" rx="70" ry="38" fill="#d8b16a" stroke="#b47f31" stroke-width="5"/>
        <path d="M${x - 45} ${y - 4} C${x - 8} ${y - 22} ${x + 28} ${y - 20} ${x + 48} ${y + 5}" fill="none" stroke="#efcf8a" stroke-width="5"/>`;
    }
  } else if (kind === "fish-mince") {
    body = `<ellipse cx="480" cy="335" rx="245" ry="120" fill="#f1d8cc" stroke="#cfaea1" stroke-width="5"/>`;
    for (let i = 0; i < 70; i += 1) {
      const x = 260 + (i * 37) % 420;
      const y = 250 + (i * 29) % 155;
      body += `<circle cx="${x}" cy="${y}" r="${4 + (i % 5)}" fill="${i % 2 ? "#e7c5ba" : "#fff3e9"}"/>`;
    }
  } else if (kind === "fish-breaded") {
    for (let i = 0; i < 4; i += 1) {
      const x = 260 + i * 135;
      body += `<path d="M${x} 305 C${x + 35} 245 ${x + 135} 248 ${x + 165} 310 C${x + 120} 372 ${x + 40} 380 ${x} 305 Z" fill="${crumb}" stroke="#aa7430" stroke-width="5"/>`;
    }
  } else if (kind === "meat-entrecote") {
    body = `<path d="M250 340 C285 205 555 185 700 290 C665 430 365 460 250 340 Z" fill="${meat}" stroke="#7e2521" stroke-width="6"/>
      <path d="M335 330 C420 290 545 288 632 320" fill="none" stroke="${fat}" stroke-width="20" stroke-linecap="round"/>`;
  } else if (kind === "meat-goulash") {
    for (let i = 0; i < 18; i += 1) {
      const x = 210 + (i % 6) * 95;
      const y = 205 + Math.floor(i / 6) * 95;
      body += `<rect x="${x}" y="${y}" width="70" height="56" rx="10" fill="${meat}" stroke="#7e2521" stroke-width="4" transform="rotate(${(i % 5) * 6 - 12} ${x + 35} ${y + 28})"/>
        <path d="M${x + 12} ${y + 16} L${x + 50} ${y + 10}" stroke="${fat}" stroke-width="7" stroke-linecap="round"/>`;
    }
  } else if (kind === "meat-azu") {
    for (let i = 0; i < 14; i += 1) {
      const x = 190 + (i % 7) * 82;
      const y = 245 + Math.floor(i / 7) * 95;
      body += `<rect x="${x}" y="${y}" width="100" height="34" rx="10" fill="${meat}" stroke="#7e2521" stroke-width="4" transform="rotate(${i % 2 ? -7 : 8} ${x + 50} ${y + 17})"/>`;
    }
  } else if (kind === "meat-cutlets") {
    for (let i = 0; i < 6; i += 1) {
      const x = 245 + (i % 3) * 165;
      const y = 235 + Math.floor(i / 3) * 120;
      body += `<ellipse cx="${x}" cy="${y}" rx="72" ry="40" fill="#9d4b37" stroke="#713123" stroke-width="5"/>
        <path d="M${x - 40} ${y} C${x} ${y - 24} ${x + 35} ${y - 18} ${x + 50} ${y + 5}" fill="none" stroke="#c1775d" stroke-width="5"/>`;
    }
  } else if (kind === "meat-large-piece") {
    body = `<path d="M240 350 C275 205 520 180 700 250 C745 385 560 472 350 435 C290 420 238 390 240 350 Z" fill="${meat}" stroke="#7e2521" stroke-width="6"/>
      <path d="M330 270 C445 238 590 248 682 310" fill="none" stroke="${fat}" stroke-width="18" stroke-linecap="round"/>
      <path d="M290 378 C410 400 535 402 645 365" fill="none" stroke="#8f2d29" stroke-width="10" stroke-linecap="round"/>`;
  } else if (kind === "meat-romsteak") {
    for (let i = 0; i < 4; i += 1) {
      const x = 255 + i * 135;
      body += `<path d="M${x} 310 C${x + 35} 240 ${x + 135} 250 ${x + 165} 314 C${x + 120} 385 ${x + 38} 382 ${x} 310 Z" fill="${crumb}" stroke="#aa7430" stroke-width="5"/>
        <path d="M${x + 28} 310 C${x + 70} 292 ${x + 112} 298 ${x + 137} 322" fill="none" stroke="#efcf8a" stroke-width="5"/>`;
    }
  }

  return svgRoot(960, 640, `${base}${body}`);
}

function violationScene(kind) {
  const table = `<rect x="95" y="365" width="770" height="185" rx="12" fill="url(#steel)" stroke="#97a9a6" stroke-width="4"/>
  <rect x="120" y="390" width="320" height="120" rx="12" fill="#f7fbf8" stroke="#b7c8c0" stroke-width="3"/>
  <rect x="500" y="392" width="275" height="118" rx="12" fill="#f7fbf8" stroke="#b7c8c0" stroke-width="3"/>`;
  let body = `
  <rect width="960" height="540" fill="#eef3ef"/>
  <rect x="0" y="0" width="960" height="135" fill="#dbe7e4"/>
  <rect x="70" y="150" width="820" height="55" rx="12" fill="#c6d2cf"/>
  ${table}
`;

  if (kind === "vegetable") {
    body += `<rect x="170" y="414" width="230" height="94" rx="18" fill="#f4ead0" stroke="#87918c" stroke-width="5"/>
      <path d="M185 438 C230 426 298 426 385 438" fill="none" stroke="#9ac9d2" stroke-width="7" stroke-dasharray="12 12" opacity=".7"/>
      <circle cx="225" cy="462" r="22" fill="#f2d28a" stroke="#bd8d37" stroke-width="3"/><circle cx="292" cy="473" r="20" fill="#f2d28a" stroke="#bd8d37" stroke-width="3"/><circle cx="356" cy="452" r="23" fill="#f2d28a" stroke="#bd8d37" stroke-width="3"/>
      <path d="M215 488 L245 478 M285 496 L315 485 M347 484 L375 476" stroke="#c9a35b" stroke-width="4" stroke-linecap="round"/>
      <rect x="512" y="421" width="120" height="74" rx="14" fill="#ffffff" stroke="#b7c8c0" stroke-width="4"/>
      <rect x="548" y="432" width="100" height="34" rx="9" fill="#2f8f5f"/><rect x="646" y="404" width="200" height="32" rx="12" fill="#bac4c1"/><polygon points="846,404 928,420 846,436" fill="#cfd8d5" stroke="#657570" stroke-width="5"/>
      <rect x="696" y="242" width="126" height="92" rx="14" fill="#bec8c4" stroke="#7b8783" stroke-width="4"/><circle cx="730" cy="288" r="20" fill="#ef7d24"/><circle cx="778" cy="300" r="18" fill="#6da85e"/><path d="M690 332 C722 308 766 318 822 294" fill="none" stroke="#71513a" stroke-width="12" stroke-linecap="round"/>`;
  } else if (kind === "fish") {
    body += `<path d="M190 450 C250 380 385 392 455 450 C380 510 255 512 190 450 Z" fill="#dfe5d8" stroke="#80908a" stroke-width="5"/><circle cx="418" cy="442" r="7" fill="#26312e"/>
      <rect x="520" y="420" width="118" height="72" rx="14" fill="#ef7d24"/><rect x="625" y="420" width="82" height="72" rx="14" fill="#75a965"/>
      <rect x="350" y="250" width="180" height="46" rx="10" fill="#c6d2cf"/><circle cx="374" cy="270" r="17" fill="#dfe5d8"/><text x="415" y="280" font-size="28" font-family="Arial" fill="#b13b2e">18C</text>
      <rect x="715" y="425" width="120" height="42" rx="10" fill="#2f8f5f"/><rect x="810" y="405" width="96" height="28" rx="12" fill="#bac4c1"/><polygon points="906,405 940,418 906,433" fill="#cfd8d5" stroke="#657570" stroke-width="4"/>
      <path d="M190 270 L300 270 L285 360 L205 360 Z" fill="#6a8ba0" stroke="#526b7d" stroke-width="4"/><path d="M178 258 L312 258" stroke="#526b7d" stroke-width="8"/>`;
  } else if (kind === "meat") {
    body += `<rect x="280" y="215" width="210" height="160" rx="18" fill="#c6d2cf" stroke="#87918c" stroke-width="5"/><circle cx="384" cy="296" r="44" fill="#9d4b37"/><rect x="318" y="165" width="44" height="86" rx="18" fill="#f1c6a8"/>
      <rect x="565" y="428" width="140" height="58" rx="16" fill="#a54036"/><text x="605" y="468" font-size="30" font-family="Arial" fill="#ffffff">18C</text>
      <rect x="145" y="420" width="190" height="70" rx="12" fill="#8fb3bd"/><polygon points="185,454 285,430 300,442 195,468" fill="#d5dddd" stroke="#657570" stroke-width="4"/><polygon points="220,480 320,455 336,468 235,494" fill="#d5dddd" stroke="#657570" stroke-width="4"/>
      <rect x="720" y="425" width="125" height="42" rx="10" fill="#2f8f5f"/><rect x="820" y="405" width="96" height="28" rx="12" fill="#bac4c1"/><polygon points="916,405 950,418 916,433" fill="#cfd8d5" stroke="#657570" stroke-width="4"/>`;
  } else if (kind === "poultry") {
    body += `<ellipse cx="255" cy="450" rx="62" ry="35" fill="#f0d0b7" stroke="#b98868" stroke-width="5"/><ellipse cx="330" cy="458" rx="62" ry="35" fill="#f0d0b7" stroke="#b98868" stroke-width="5"/>
      <ellipse cx="282" cy="423" rx="62" ry="35" fill="#f0d0b7" stroke="#b98868" stroke-width="5"/>
      <rect x="525" y="420" width="100" height="70" rx="14" fill="#f7fbf8" stroke="#b7c8c0" stroke-width="4"/><path d="M540 450 L610 462" stroke="#d84935" stroke-width="6"/>
      <circle cx="690" cy="448" r="22" fill="#ef7d24"/><circle cx="735" cy="452" r="20" fill="#6da85e"/>
      <rect x="760" y="425" width="125" height="42" rx="10" fill="#2f8f5f"/><rect x="850" y="405" width="96" height="28" rx="12" fill="#bac4c1"/><polygon points="946,405 970,418 946,433" fill="#cfd8d5" stroke="#657570" stroke-width="4"/>`;
  } else if (kind === "complex") {
    body += `<rect x="165" y="420" width="210" height="82" rx="12" fill="#e9f0ed" stroke="#b7c8c0" stroke-width="4"/>
      <path d="M185 460 C220 420 300 425 350 460 C300 495 225 496 185 460 Z" fill="#dfe5d8" stroke="#80908a" stroke-width="4"/>
      <rect x="425" y="420" width="210" height="82" rx="12" fill="#e9f0ed" stroke="#b7c8c0" stroke-width="4"/>
      <rect x="445" y="452" width="70" height="36" rx="9" fill="#a54036"/><ellipse cx="568" cy="468" rx="42" ry="24" fill="#9d4b37"/>
      <rect x="585" y="305" width="205" height="76" rx="12" fill="#f7fbf8" stroke="#b7c8c0" stroke-width="4"/>
      <ellipse cx="635" cy="345" rx="43" ry="23" fill="#d8b16a"/><ellipse cx="715" cy="345" rx="43" ry="23" fill="#9d4b37"/>
      <rect x="708" y="420" width="76" height="68" rx="12" fill="#ffffff" stroke="#c8d1cc" stroke-width="4"/>
      <path d="M722 430 L760 478 M770 432 L736 482" stroke="#d84935" stroke-width="7" stroke-linecap="round"/>
      <rect x="800" y="420" width="82" height="68" rx="12" fill="#ffffff" stroke="#c8d1cc" stroke-width="4"/>`;
  }

  return svgRoot(960, 540, body);
}

[
  // PM01 now uses curated PNG assets for cut shapes and violation scenes.
  // Keep this legacy SVG helper inert so a future run cannot reintroduce placeholders.
].forEach(([relativePath, svg]) => writeAsset(relativePath, svg));

console.log("PM01 legacy SVG generator skipped; curated PNG assets are used.");
