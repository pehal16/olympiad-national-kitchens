import * as THREE from "three";
import presentation from "../final-kitchen-presentation.js";

const TAU = Math.PI * 2;
const COLORS = { salmon: 0xeb8b66, eel: 0x69412a, tuna: 0xb54750, surimi: 0xf1846e, shrimp: 0xefb29c,
  chicken: 0xc8a074, beef: 0x62402d, breaded: 0xa77735, bun: 0xd89b4d, flatbread: 0xd9bb89 };
const rand = (n, salt = 0) => { const v = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453; return v - Math.floor(v); };

function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, material); object.position.set(x, y, z);
  object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
}
function physical(color, extra = {}) { return new THREE.MeshPhysicalMaterial({ color, roughness: .64, ...extra }); }
function tube(parent, points, radius, material) {
  return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 24, radius, 8, false), material);
}

// Read source alpha to recover the geometry of individual photographed pieces.
// No raster output is synthesized and no source image is rewritten.
export function inspectPhoto(image) {
  const size = 96, canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data, visited = new Uint8Array(size * size), parts = [];
  for (let index = 0; index < visited.length; index++) {
    if (visited[index] || pixels[index * 4 + 3] < 90) continue;
    const queue = [index], positions = []; visited[index] = 1;
    for (let head = 0; head < queue.length; head++) {
      const next = queue[head], x = next % size, y = Math.floor(next / size); positions.push(next);
      for (const neighbour of [x > 0 ? next - 1 : -1, x < size - 1 ? next + 1 : -1, next - size, next + size]) {
        if (neighbour < 0 || neighbour >= visited.length || visited[neighbour] || pixels[neighbour * 4 + 3] < 90) continue;
        visited[neighbour] = 1; queue.push(neighbour);
      }
    }
    if (positions.length < 9) continue;
    let minX = size, minY = size, maxX = 0, maxY = 0, r = 0, g = 0, b = 0;
    for (const p of positions) { const x = p % size, y = Math.floor(p / size); minX = Math.min(x, minX); maxX = Math.max(x, maxX);
      minY = Math.min(y, minY); maxY = Math.max(y, maxY); r += pixels[p * 4]; g += pixels[p * 4 + 1]; b += pixels[p * 4 + 2]; }
    parts.push({ minX: minX / size, minY: minY / size, maxX: (maxX + 1) / size, maxY: (maxY + 1) / size,
      area: positions.length, color: new THREE.Color(r / positions.length / 255, g / positions.length / 255, b / positions.length / 255).convertSRGBToLinear() });
  }
  // An opaque patch is a material sample for curved surfaces, not a full-food billboard.
  let best = null, bestScore = -Infinity;
  for (let y = 10; y < size - 14; y += 3) for (let x = 10; x < size - 14; x += 3) {
    let opaque = 0;
    for (let dy = 0; dy < 14; dy++) for (let dx = 0; dx < 14; dx++) if (pixels[((y + dy) * size + x + dx) * 4 + 3] > 220) opaque++;
    const score = opaque - .01 * ((x - 41) ** 2 + (y - 41) ** 2);
    if (score > bestScore) { bestScore = score; best = [x / size, 1 - (y + 14) / size, 14 / size]; }
  }
  return { size, pixels, parts: parts.sort((a, b) => b.area - a.area).slice(0, 36), patch: best };
}

function surface(texture, photo, color, ownedTextures, roughness = .62) {
  if (photo.materialSurface) return physical(color ?? 0xffffff, { map: texture, bumpMap: texture, bumpScale: .012, roughness });
  const map = texture.clone(); const [x, y, extent] = photo.patch;
  map.offset.set(x, y); map.repeat.set(extent, extent); map.needsUpdate = true; ownedTextures.add(map);
  return physical(color ?? 0xffffff, { map, roughness });
}

function organicSection(geometry, salt = 0, squarish = false) {
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i), y = position.getY(i), r = Math.hypot(x, z);
    if (!r) continue;
    const angle = Math.atan2(z, x), change = 1 + .009 * Math.sin(angle * 7 + salt) + .006 * Math.cos(y * 13 + angle * 11 + salt);
    const exponent = squarish ? .78 : 1;
    position.setX(i, Math.sign(x) * Math.pow(Math.abs(x / r), exponent) * r * change);
    position.setZ(i, Math.sign(z) * Math.pow(Math.abs(z / r), exponent) * r * change);
  }
  geometry.computeVertexNormals(); return geometry;
}

function sourceFor(assets, item, surfaceName) { return assets.get(`surface:${surfaceName}`) || assets.get(item.id); }

// A closed, curved relief mesh follows the alpha silhouette of the photograph.
// Food has thickness and sides, and salad fragments are positioned separately in 3D.
function relief(parent, texture, photo, bounds, width, thickness, x, y, z, angle = 0, bend = 0) {
  const { size, pixels } = photo, step = 1 / size;
  const ix0 = Math.max(0, Math.floor(bounds.minX * size)), ix1 = Math.min(size, Math.ceil(bounds.maxX * size));
  const iy0 = Math.max(0, Math.floor(bounds.minY * size)), iy1 = Math.min(size, Math.ceil(bounds.maxY * size));
  const positions = [], uvs = [], topIndices = [], sideIndices = [], baseY = y;
  const opaque = (ix, iy) => ix >= ix0 && ix < ix1 && iy >= iy0 && iy < iy1 && pixels[(iy * size + ix) * 4 + 3] > 80;
  function vertex(ix, iy, top) {
    const u = ix * step, v = iy * step, cx = (bounds.minX + bounds.maxX) / 2, cy = (bounds.minY + bounds.maxY) / 2;
    const px = (u - cx) * width, pz = (v - cy) * width;
    const sample = pixels[(Math.min(size - 1, iy) * size + Math.min(size - 1, ix)) * 4] / 255;
    positions.push(px, top ? thickness * (.96 + .025 * sample) + bend * (px * px + pz * pz) : 0, pz); uvs.push(u, 1 - v);
    return positions.length / 3 - 1;
  }
  function quad(indices, a, b, c, d) { indices.push(a, c, b, a, d, c); }
  for (let iy = iy0; iy < iy1; iy++) for (let ix = ix0; ix < ix1; ix++) {
    if (!opaque(ix, iy)) continue;
    quad(topIndices, vertex(ix, iy, true), vertex(ix + 1, iy, true), vertex(ix + 1, iy + 1, true), vertex(ix, iy + 1, true));
    quad(sideIndices, vertex(ix, iy + 1, false), vertex(ix + 1, iy + 1, false), vertex(ix + 1, iy, false), vertex(ix, iy, false));
    for (const [dx, dy, ax, ay, bx, by] of [[-1, 0, ix, iy, ix, iy + 1], [1, 0, ix + 1, iy + 1, ix + 1, iy],
      [0, -1, ix + 1, iy, ix, iy], [0, 1, ix, iy + 1, ix + 1, iy + 1]]) {
      if (!opaque(ix + dx, iy + dy)) quad(sideIndices, vertex(ax, ay, false), vertex(bx, by, false), vertex(bx, by, true), vertex(ax, ay, true));
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex([...topIndices, ...sideIndices]); geometry.computeVertexNormals();
  geometry.addGroup(0, topIndices.length, 0); geometry.addGroup(topIndices.length, sideIndices.length, 1);
  const material = physical(0xffffff, { map: texture, transparent: true, alphaTest: .18, side: THREE.DoubleSide, roughness: .72 });
  const sideColor = bounds.color || photo.parts[0]?.color || new THREE.Color(0xd4b89d);
  const sides = physical(sideColor.clone().multiplyScalar(.92), { roughness: .88, side: THREE.DoubleSide });
  const object = mesh(parent, geometry, [material, sides], x, baseY, z); object.rotation.y = angle; return object;
}
const WHOLE = { minX: 0, maxX: 1, minY: 0, maxY: 1 };

function riceGrains(parent, mode, radius = .54, height = .7, covered = false) {
  const count = mode === "sheet" ? 630 : covered ? 100 : 220;
  const geometry = new THREE.SphereGeometry(1, 8, 5), material = physical(0xf7f2dd, { roughness: .48 });
  const instances = new THREE.InstancedMesh(geometry, material, count), dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    if (mode === "sheet") dummy.position.set((rand(i, 1) - .5) * 3.08, .26 + rand(i, 2) * .025, (rand(i, 3) - .5) * 2.24);
    else if (!covered && i < 120) { const angle = rand(i, 2) * TAU; dummy.position.set(Math.cos(angle) * radius, rand(i, 3) * height, Math.sin(angle) * radius); }
    else { const angle = rand(i, 2) * TAU, r = .35 + rand(i, 3) * (radius - .35); dummy.position.set(Math.cos(angle) * r, height + .009, Math.sin(angle) * r); }
    if (mode !== "sheet") {
      const r = Math.hypot(dummy.position.x, dummy.position.z), a = Math.atan2(dummy.position.z, dummy.position.x);
      dummy.position.x = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), .78) * r;
      dummy.position.z = Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), .78) * r;
    }
    dummy.scale.set(.032 + rand(i, 4) * .008, .021, .058 + rand(i, 8) * .012); dummy.rotation.set(rand(i, 5), rand(i, 6) * TAU, rand(i, 7));
    dummy.updateMatrix(); instances.setMatrixAt(i, dummy.matrix);
  }
  instances.castShadow = true; instances.receiveShadow = true; parent.add(instances);
}
function ring(radius, inner, height) {
  const shape = new THREE.Shape(); shape.absarc(0, 0, radius, 0, TAU, false);
  const hole = new THREE.Path(); hole.absarc(0, 0, inner, 0, TAU, true); shape.holes.push(hole);
  const UVGenerator = {
    generateTopUV(geometry, vertices, a, b, c) {
      return [a, b, c].map(i => new THREE.Vector2((vertices[i * 3] / radius + 1) / 2, (vertices[i * 3 + 1] / radius + 1) / 2));
    },
    generateSideWallUV(geometry, vertices, a, b, c, d) {
      return [a, b, c, d].map(i => new THREE.Vector2((Math.atan2(vertices[i * 3 + 1], vertices[i * 3]) + Math.PI) / TAU, vertices[i * 3 + 2] / height));
    }
  };
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 40, UVGenerator });
  geometry.rotateX(-Math.PI / 2); return geometry;
}
function sticks(parent, form, y, z = 0, length = 2.8) {
  if (form === "cream") {
    for (let i = 0; i < 2; i++) tube(parent, [[-length / 2, y, z + i * .15], [-length / 4, y + .025, z + i * .15],
      [0, y, z + i * .15], [length / 4, y + .016, z + i * .15], [length / 2, y, z + i * .15]], .105, physical(0xf3ebd4, { roughness: .48 }));
  } else {
    for (let i = 0; i < 3; i++) {
      const bar = mesh(parent, new THREE.BoxGeometry(length, .14, .14), physical(form === "surimi" ? 0xf7e8d6 : 0xd3df98), 0, y, z + (i - 1) * .15);
      const skin = mesh(parent, new THREE.BoxGeometry(length, .025, .145), physical(form === "surimi" ? 0xe36950 : 0x3c642f), 0, y + .08, bar.position.z);
      skin.rotation.x = .02;
    }
  }
}
function shrimp(parent, x, y, z, scale = 1, angle = 0) {
  const group = new THREE.Group(); parent.add(group); group.position.set(x, y, z); group.rotation.y = angle; group.scale.setScalar(scale);
  tube(group, [[-.18, 0, -.15], [-.3, .04, .01], [-.23, .065, .23], [0, .06, .31], [.15, .035, .18]], .105, physical(0xeab69b, { roughness: .4 }));
  for (let i = 0; i < 5; i++) {
    const a = -.7 + i * .46;
    const segment = mesh(group, new THREE.SphereGeometry(.112, 12, 8), physical(0xf0c7ae, { roughness: .43 }), Math.cos(a) * .24 - .08, .03, Math.sin(a) * .24 + .075);
    segment.scale.set(1, .7, .78);
  }
  const tail = mesh(group, new THREE.ConeGeometry(.12, .22, 5), physical(0xc87760), .19, .01, .11); tail.rotation.z = -1.3;
  return group;
}

function roll(parent, plan, assets, ownedTextures) {
  const sheet = plan.items.find(item => item.scene.form === "rice-sheet");
  const riceSource = sheet ? sourceFor(assets, sheet, "rice") : null;
  const noriSource = sheet ? sourceFor(assets, sheet, "nori") : null;
  const proteins = plan.items.filter(item => ["salmon", "eel", "tuna"].includes(item.scene.form));
  if (!plan.folded) {
    if (plan.hasShell) {
      const fillingStarted = plan.items.length > 1;
      mesh(parent, new THREE.BoxGeometry(3.12, .023, 2.28), surface(noriSource.texture, noriSource.photo, 0xffffff, ownedTextures, .9), 0, fillingStarted ? .278 : .17, 0);
      mesh(parent, new THREE.BoxGeometry(3.22, .08, 2.42), surface(riceSource.texture, riceSource.photo, 0xffffff, ownedTextures, .64), 0, .22, 0);
      if (!fillingStarted && !riceSource.photo.materialSurface) riceGrains(parent, "sheet");
    }
    let row = 0;
    for (const item of plan.items.filter(item => item.scene.form !== "rice-sheet")) {
      const form = item.scene.form, z = -.5 + row++ * .43, y = plan.hasShell ? .39 : .26;
      if (["cream", "cucumber-sticks", "surimi"].includes(form)) sticks(parent, form, y, z);
      else { const asset = assets.get(item.id); relief(parent, asset.texture, asset.photo, WHOLE, 2.8, .08, 0, y, z); }
    }
    return;
  }
  // Six sections expose genuine cross sections. Every selected filling remains visible.
  for (let index = 0; index < 6; index++) {
    const piece = new THREE.Group(); piece.position.set((index % 3 - 1) * 1.28, .8, (Math.floor(index / 3) - .5) * 1.32 - .34);
    piece.rotation.x = Math.PI / 2; piece.rotation.z = (rand(index, 10) - .5) * .065;
    piece.scale.set(1 + (rand(index, 11) - .5) * .07, 1 + (rand(index, 12) - .5) * .06, 1 + (rand(index, 13) - .5) * .05); parent.add(piece);
    mesh(piece, organicSection(ring(.54, .34, .7), index, true), surface(riceSource.texture, riceSource.photo, 0xffffff, ownedTextures, .66));
    // Photo detail alone cannot give the cut edge the silhouette of separate grains.
    riceGrains(piece, "roll", .52, .7, proteins.length > 0);
    mesh(piece, organicSection(ring(.344, .319, .7), index, true), surface(noriSource.texture, noriSource.photo, 0xffffff, ownedTextures, .94));
    const fillings = plan.items.filter(item => !["rice-sheet", "salmon", "eel", "tuna"].includes(item.scene.form));
    fillings.forEach((item, i) => {
      const form = item.scene.form, a = i / Math.max(1, fillings.length) * TAU, x = Math.cos(a) * .13, z = Math.sin(a) * .13;
      if (form === "cream") {
        const asset = assets.get(item.id);
        mesh(piece, organicSection(new THREE.CylinderGeometry(.31, .303, .7, 40, 4), index, true),
          surface(asset.texture, asset.photo, 0xffffff, ownedTextures, .72), 0, .35, 0);
      } else if (form === "shrimp") {
        // With horizontal roll sections, local -Z is the upper outside surface.
        // Keep the alternative seafood a separate topping, not a fake salmon wrap.
        const topping = shrimp(piece, 0, .35, -.575, 1.08, (rand(index, 15) - .5) * .3);
        topping.rotation.x = -Math.PI / 2;
      }
      else {
        for (let baton = 0; baton < 3; baton++) {
          const bx = x + (baton - 1) * .13, bz = z + (baton % 2) * .12 - .045;
          mesh(piece, new THREE.BoxGeometry(.115, .725, .14), physical(form === "surimi" ? 0xf0decb : 0xc9d790), bx, .35, bz);
          mesh(piece, new THREE.BoxGeometry(.019, .73, .14), physical(form === "surimi" ? 0xe66c54 : 0x3d602c), bx + .056, .352, bz);
        }
      }
    });
    proteins.forEach((item, i) => {
      const asset = sourceFor(assets, item, item.scene.form === "salmon" ? "salmon" : item.scene.form), extent = TAU / proteins.length - .025;
      const geometry = organicSection(new THREE.CylinderGeometry(.594, .588, .72, 64, 12, true, i * TAU / proteins.length, extent), index, true);
      const material = surface(asset.texture, asset.photo, 0xffffff, ownedTextures, .48); material.side = THREE.DoubleSide;
      mesh(piece, geometry, material, 0, .365, 0);
      // Thin fish rim at the cut, rather than an unrelated flat photo on the rice.
      const cap = mesh(piece, organicSection(ring(.595, .52, .02), index, true), material.clone(), 0, .711, 0);
      if (proteins.length > 1) { cap.visible = false; }
    });
  }
}

function burger(parent, plan, assets, ownedTextures) {
  const bun = plan.items.find(item => item.scene.form === "bun");
  let height = .17;
  function bread(top, y) {
    const profile = top ? [[0, .64], [.35, .62], [.72, .55], [1, .4], [1.16, .16], [1.18, .02], [0, 0]] :
      [[0, 0], [1.13, 0], [1.17, .16], [1.06, .25], [.65, .28], [0, .29]];
    const asset = sourceFor(assets, bun, "bread"), mat = surface(asset.texture, asset.photo, 0xffffff, ownedTextures, .83);
    const object = mesh(parent, organicSection(new THREE.LatheGeometry((top ? profile.reverse() : profile).map(p => new THREE.Vector2(...p)), 80), 3), mat, 0, y, 0);
    // Sesame seeds are attached to the dome, not floating on a billboard.
    if (top && !asset.photo.materialSurface) for (let i = 0; i < 44; i++) {
      const a = rand(i, 1) * TAU, r = Math.sqrt(rand(i, 2)) * 1.03;
      const seed = mesh(parent, new THREE.SphereGeometry(.037, 6, 4), physical(0xebdcad), Math.cos(a) * r, y + .64 - .32 * r * r, Math.sin(a) * r);
      seed.scale.set(.5, .45, 1.8); seed.rotation.y = rand(i, 3) * TAU;
    }
    return object;
  }
  if (bun) { bread(false, height); height += .27; }
  for (const item of plan.items.filter(item => item !== bun)) {
    const { texture, photo } = assets.get(item.id), form = item.scene.form;
    if (["beef", "breaded"].includes(form)) {
      const geometry = new THREE.CylinderGeometry(1.08, 1.04, .28, 64, 3);
      const position = geometry.getAttribute("position");
      for (let i = 0; i < position.count; i++) { const x = position.getX(i), z = position.getZ(i), a = Math.atan2(z, x);
        position.setX(i, x * (1 + .025 * Math.sin(a * 17))); position.setZ(i, z * (1 + .025 * Math.sin(a * 17))); }
      geometry.computeVertexNormals(); mesh(parent, geometry, surface(texture, photo, 0xffffff, ownedTextures, .9), 0, height + .14, 0); height += .27;
    } else {
      const thickness = form === "burger-veg" ? .15 : form === "rings" ? .2 : form === "egg" ? .13 : .045;
      relief(parent, texture, photo, WHOLE, form === "burger-veg" ? 2.9 : 2.72, thickness, 0, height, 0, 0, form === "cheddar" ? -.025 : .006);
      height += thickness * .82;
    }
  }
  if (bun) bread(true, height - .018);
}

function wrap(parent, plan, assets, ownedTextures) {
  const shell = plan.items.find(item => item.scene.form === "flatbread"), fillings = plan.items.filter(item => item !== shell);
  if (!plan.folded) {
    if (shell) { const { texture, photo } = assets.get(shell.id); relief(parent, texture, photo, WHOLE, 4.5, .035, 0, .17, 0); }
    fillings.forEach((item, index) => {
      const { texture, photo } = assets.get(item.id);
      relief(parent, texture, photo, WHOLE, 2.5, .11, 0, .23 + index * .075, 0);
    }); return;
  }
  const asset = sourceFor(assets, shell, "bread"), material = surface(asset.texture, asset.photo, 0xffffff, ownedTextures, .9);
  // Two wrapped halves with open ends facing the camera reveal the chosen filling.
  for (let half = 0; half < 2; half++) {
    const group = new THREE.Group(); parent.add(group); group.position.set((half - .5) * 1.45, .73, 0); group.rotation.y = half ? -.1 : .1;
    const geometry = new THREE.CylinderGeometry(.57, .51, 2.8, 48, 6, true); geometry.rotateX(Math.PI / 2);
    mesh(group, geometry, material.clone());
    const seam = mesh(group, new THREE.BoxGeometry(.23, .025, 2.75), material.clone(), 0, .55, 0); seam.rotation.z = -.08;
    fillings.forEach((item, index) => {
      const { texture, photo } = assets.get(item.id), a = index / Math.max(1, fillings.length) * TAU;
      const form = item.scene.form;
      if (["white-sauce", "chili"].includes(form)) tube(group, [[-.19, -.12, 1.43], [0, .04, 1.47], [.19, -.05, 1.43]], .055,
        physical(form === "chili" ? 0xb6492e : 0xf0eadb, { roughness: .38 }));
      else {
        const disc = relief(group, texture, photo, WHOLE, .87, .07, 0, 0, 0);
        disc.rotation.x = Math.PI / 2; disc.position.set(Math.cos(a) * .1, Math.sin(a) * .1, 1.37 + index * .009);
      }
    });
    // A folded closed back, with the same bread material, not an added ingredient.
    const end = mesh(group, new THREE.CircleGeometry(.51, 48), material.clone(), 0, 0, -1.405); end.rotation.y = Math.PI;
  }
}

function salad(parent, plan, assets) {
  for (const item of plan.items) {
    const { texture, photo } = assets.get(item.id), form = item.scene.form;
    if (["dressing", "oil-herbs"].includes(form)) {
      const oil = form === "oil-herbs";
      for (let i = 0; i < 4; i++) tube(parent, [[-1.25, .45 + i * .045, -.6 + i * .42], [-.6, .55 + i * .045, -.8 + i * .42],
        [.1, .61 + i * .03, -.55 + i * .42], [.85, .48 + i * .045, -.72 + i * .42]], oil ? .013 : .032,
      physical(oil ? 0xbc973e : 0xf0e8d5, { roughness: .3, transparent: oil, opacity: oil ? .55 : 1 }));
      continue;
    }
    const originals = photo.parts.length ? photo.parts : [WHOLE];
    const repeats = form === "leaves" ? 3 : 1;
    const parts = Array.from({ length: repeats }, () => originals).flat();
    const salt = item.scene.level + form.length * 13;
    parts.forEach((part, index) => {
      const boundsWidth = part.maxX - part.minX, boundsHeight = part.maxY - part.minY;
      const largeCluster = originals.length <= 3 && ["tomato-cucumber", "vegetables"].includes(form);
      const scale = largeCluster ? 3.4 : Math.min(4.8, (["feta", "croutons", "croutons-parmesan"].includes(form) ? .44 : form === "leaves" ? 1.12 : form === "chicken" ? .87 : .72) / Math.max(boundsWidth, boundsHeight));
      const a = rand(index, salt) * TAU, r = largeCluster ? .1 : Math.sqrt(rand(index, salt + 1)) * 1.38;
      const y = .18 + .27 * (1 - r / 1.7) + (item.scene.level > 2 ? .11 : 0) + rand(index, salt + 2) * .11;
      const thickness = ["feta", "croutons", "croutons-parmesan"].includes(form) ? .13 : form === "chicken" ? .1 : .024;
      const object = relief(parent, texture, photo, part, scale, thickness, Math.cos(a) * r, y, Math.sin(a) * r, rand(index, salt + 4) * TAU, form === "leaves" ? .09 : .014);
      object.rotation.x = (rand(index, salt + 6) - .5) * .22; object.rotation.z = (rand(index, salt + 7) - .5) * .18;
    });
  }
}

function boat(parent, plan, assets, ownedTextures) {
  const shell = plan.items.find(item => item.scene.form === "boat");
  if (shell) {
    const { texture, photo } = assets.get(shell.id);
    relief(parent, texture, photo, WHOLE, 4.5, .28, 0, .16, 0, 0, .012);
  }
  for (const item of plan.items.filter(item => item !== shell)) {
    const { texture, photo } = assets.get(item.id), form = item.scene.form;
    if (form === "butter") mesh(parent, new THREE.BoxGeometry(.4, .2, .34), physical(0xf2dc89, { roughness: .45 }), .6, .58, -.2);
    else {
      const scale = form === "egg" ? 1.65 : 3.15;
      relief(parent, texture, photo, WHOLE, scale, form === "egg" ? .16 : .06, 0, .34 + item.scene.level * .016, 0);
    }
  }
}

export function buildKitchenModel(dish, items, assets, base, ownedTextures) {
  const group = new THREE.Group(), plan = presentation.planAssembly(dish, items);
  // Useful for native browser QA; no ingredient correctness is available here.
  group.userData.phase = plan.phase; group.userData.folded = plan.folded; group.userData.representedIds = plan.representedIds;
  if (plan.preset === "roll") roll(group, plan, assets, ownedTextures);
  else if (plan.preset === "burger") burger(group, plan, assets, ownedTextures);
  else if (plan.preset === "wrap") wrap(group, plan, assets, ownedTextures);
  else if (plan.preset === "bowl") salad(group, plan, assets);
  else if (plan.preset === "boat") boat(group, plan, assets, ownedTextures);
  else {
    if (base) relief(group, base.texture, base.photo, WHOLE, 4.5, .12, 0, .16, 0);
    plan.items.forEach(item => { const { texture, photo } = assets.get(item.id);
      relief(group, texture, photo, WHOLE, item.scene.width, item.scene.form === "basil" ? .035 : .024, item.scene.x, .29 + item.scene.level * .012, item.scene.z); });
  }
  return group;
}
