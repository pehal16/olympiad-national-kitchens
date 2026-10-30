import fs from "node:fs";
fs.mkdirSync("public/awards", { recursive: true });
for (const style of ["classic", "modern", "theme"])
  for (const portrait of [false, true]) {
    const w = portrait ? 210 : 297,
      h = portrait ? 297 : 210,
      c =
        style === "classic"
          ? "#b48831"
          : style === "modern"
            ? "#005b43"
            : "#365b95";
    let art = "";
    if (style === "classic") {
      art = `<defs><linearGradient id="gold" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#a87522"/><stop offset=".45" stop-color="#e1bd69"/><stop offset="1" stop-color="#c08c2f"/></linearGradient></defs><rect x="9" y="9" width="${w - 18}" height="${h - 18}" fill="none" stroke="#bb8b30" stroke-width=".35"/><rect x="12" y="12" width="${w - 24}" height="${h - 24}" fill="none" stroke="#b8882b" stroke-width=".45"/><rect x="15" y="15" width="${w - 30}" height="${h - 30}" fill="none" stroke="#c9a15a" stroke-width=".18"/>`;
      for (const [x, y, rotate] of [
        [0, 0, 0],
        [w, h, 180],
      ])
        art += `<g transform="translate(${x} ${y}) rotate(${rotate})"><path d="M12 12H31L12 31Z" fill="url(#gold)"/><path d="M12 32L22 22V49L12 59Z" fill="#205c48"/><path d="M12 61L22 51V73L12 83Z" fill="url(#gold)"/><path d="M22 12H65L58 19H15Z" fill="none" stroke="#c69a43" stroke-width=".2"/>${Array.from({ length: 7 }, (_, i) => `<path d="M${8 + i * 3} 5L5 ${8 + i * 3}" stroke="#cfa85c" stroke-width=".18"/>`).join("")}</g>`;
      art += `<path d="M${w / 2 - 3} ${h * 0.33}l3-3 3 3-3 3Z" fill="url(#gold)"/><path d="M${w / 2 - 3} ${h - 25}l3-3 3 3-3 3Z" fill="url(#gold)"/>`;
    } else if (style === "modern") {
      art = `<path d="M0 0H${w}V6H6V${h}H0Z" fill="#005b43"/><path d="M${w} ${h}H0V${h - 5}H${w - 6}V0H${w}Z" fill="#005b43"/><path d="M11 13H${w - 22}M22 ${h - 13}H${w - 11}" stroke="#b59755" stroke-width=".5"/><path d="M${w - 45} 6H${w - 6}V45Z" fill="#e8f2ec"/><path d="M6 ${h - 45}V${h - 6}H45Z" fill="#e8f2ec"/>`;
    } else {
      art = `<rect x="9" y="9" width="${w - 18}" height="${h - 18}" fill="none" stroke="#365b95" stroke-width=".6"/><rect x="13" y="13" width="${w - 26}" height="${h - 26}" fill="none" stroke="#a6b9d5" stroke-width=".2"/><path d="M0 0H68L0 68Z" fill="#eaf0f8"/><path d="M${w} ${h}H${w - 68}L${w} ${h - 68}Z" fill="#eaf0f8"/><path d="M6 48L48 6M${w - 48} ${h - 6}L${w - 6} ${h - 48}" stroke="#365b95" stroke-width="1"/>${[23, 31, 39].map((v) => `<circle cx="${v}" cy="${v}" r="8" fill="none" stroke="#7f9ac0" stroke-width=".25"/>`).join("")}`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="white"/>${art}</svg>`;
    fs.writeFileSync(
      `public/awards/${style}-${portrait ? "portrait" : "landscape"}.svg`,
      svg,
    );
  }
console.log("Six print-quality vector backgrounds generated.");
