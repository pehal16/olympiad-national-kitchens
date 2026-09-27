import * as THREE from "three";
import { buildKitchenModel, inspectPhoto } from "./final-kitchen-model.js";

function disposeTree(root) {
  root.traverse(child => {
    if (child.isInstancedMesh) child.dispose();
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(material => material?.dispose());
  });
}

function vessel(preset) {
  const group = new THREE.Group();
  const ceramic = new THREE.MeshPhysicalMaterial({ color: 0xf8f7f2, roughness: .33, clearcoat: .6 });
  if (preset === "roll") {
    const board = new THREE.Mesh(new THREE.BoxGeometry(4.9, .14, 3.9), ceramic);
    group.add(board); return group;
  }
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.5, .14, 96), ceramic);
  group.add(floor);
  const profile = preset === "bowl" ? [new THREE.Vector2(1.9, .07), new THREE.Vector2(2.17, .15),
    new THREE.Vector2(2.43, .38), new THREE.Vector2(2.65, .62), new THREE.Vector2(2.69, .63)] :
    [new THREE.Vector2(2.2, .07), new THREE.Vector2(2.4, .12), new THREE.Vector2(2.63, .22), new THREE.Vector2(2.69, .23)];
  const rim = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), ceramic.clone());
  rim.material.side = THREE.DoubleSide; group.add(rim);
  if (["boat", "roll", "wrap"].includes(preset)) {
    group.scale.set(1, 1, .83);
  }
  return group;
}

// Numeric, participant-safe descriptors are shared with the 2D compositor.
// Culinary checking keys are never imported into the browser runtime.
export function mountFinalKitchenScene(container, { dish, onContextLost } = {}) {
  if (!container || !dish) throw new Error("Scene configuration is missing.");
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, .1, 40);
  const volumetric = dish.presentationVersion === 2;
  camera.position.set(...(volumetric ? [0, 5.3, 6.5] : [0, 6.3, 5.2])); camera.lookAt(0, volumetric ? .35 : .15, 0);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", { antialias: true, alpha: true, powerPreference: "low-power" });
  if (!context) throw new Error("WebGL2 is unavailable.");
  const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = volumetric ? .93 : 1.07;
  if (volumetric) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; }
  renderer.domElement.className = "t5-canvas"; renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.style.touchAction = "pan-y"; container.append(renderer.domElement);
  const stage = new THREE.Group(); stage.rotation.y = -.2; scene.add(stage);
  const plate = vessel(dish.modelPreset); plate.traverse(child => { child.receiveShadow = true; }); stage.add(plate);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb6c2bb, volumetric ? 1.8 : 2.3));
  const light = new THREE.DirectionalLight(volumetric ? 0xfff9ee : 0xffffff, volumetric ? 3 : 2); light.position.set(-3, 7, 5); scene.add(light);
  if (volumetric) {
    light.castShadow = true; light.shadow.mapSize.set(1024, 1024); light.shadow.camera.left = -4; light.shadow.camera.right = 4;
    light.shadow.camera.top = 4; light.shadow.camera.bottom = -4; light.shadow.bias = -.0005; light.shadow.normalBias = .025;
    const fill = new THREE.DirectionalLight(0xe7efff, .8); fill.position.set(4, 4, -3); scene.add(fill);
  }
  let food = new THREE.Group(); stage.add(food);
  let disposed = false, revision = 0, pointer = null, animationFrame = 0;
  const textures = new Map(), ownedTextures = new Set(), croppedTextures = new Map();
  const photos = new Map(); let modelTextures = new Set();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const loader = new THREE.TextureLoader();
  function texture(url) {
    if (!textures.has(url)) textures.set(url, loader.loadAsync(url).then(value => {
      value.colorSpace = THREE.SRGBColorSpace;
      value.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      if (volumetric) photos.set(url, url.includes("/materials/") ? { materialSurface: true } : inspectPhoto(value.image));
      ownedTextures.add(value); if (disposed) value.dispose(); return value;
    }));
    return textures.get(url);
  }
  function render() { if (!disposed && !renderer.getContext().isContextLost()) renderer.render(scene, camera); }
  function resize() {
    if (disposed) return;
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); render();
  }
  function addLayer(parent, source, descriptor) {
    let map = source;
    if (descriptor.crop) {
      const key = `${source.uuid}:${descriptor.crop.join(":")}`;
      if (!croppedTextures.has(key)) {
        const cropped = source.clone(); cropped.repeat.set(descriptor.crop[1], 1); cropped.offset.set(descriptor.crop[0], 0);
        cropped.needsUpdate = true; ownedTextures.add(cropped); croppedTextures.set(key, cropped);
      }
      map = croppedTextures.get(key);
    }
    const material = new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: .025,
      side: THREE.DoubleSide, depthWrite: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(descriptor.width, descriptor.width * descriptor.aspect), material);
    plane.rotation.x = -Math.PI / 2; plane.rotation.z = descriptor.angle;
    const step = dish.modelPreset === "burger" ? .095 : .016;
    plane.position.set(descriptor.x, .17 + descriptor.level * step, descriptor.z);
    plane.renderOrder = 10 + descriptor.level; parent.add(plane);
  }
  function enter(group) {
    cancelAnimationFrame(animationFrame);
    if (reducedMotion.matches) { render(); return; }
    const start = performance.now();
    const tick = now => {
      if (disposed || group !== food) return;
      const progress = Math.min(1, (now - start) / 180);
      group.position.y = .04 * (1 - progress); render();
      if (progress < 1) animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
  }
  const contextLost = event => { event.preventDefault(); if (!disposed) onContextLost?.(); };
  function pointerDown(event) {
    if (!volumetric && event.pointerType !== "mouse") return;
    if ((event.pointerType === "mouse" && event.button !== 0) || event.isPrimary === false) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, rotation: stage.rotation.y, tilt: stage.rotation.x };
    renderer.domElement.setPointerCapture?.(event.pointerId);
  }
  function pointerMove(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    stage.rotation.y = pointer.rotation + (event.clientX - pointer.x) * .009;
    if (volumetric && event.pointerType !== "touch") stage.rotation.x = Math.max(-.4, Math.min(.8, pointer.tilt + (event.clientY - pointer.y) * .006));
    render();
  }
  function pointerUp() { pointer = null; }
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("pointerdown", pointerDown); canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp); canvas.addEventListener("pointercancel", pointerUp);
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  return {
    async setSelection(items = []) {
      if (disposed) return;
      const current = ++revision;
      const selected = [...items].sort((a, b) => a.scene.level - b.scene.level);
      const base = dish.baseImageUrl ? await texture(dish.baseImageUrl) : null;
      const maps = await Promise.all(selected.map(item => texture(item.layerImageUrl)));
      const surfaces = volumetric ? await Promise.all(Object.entries(dish.surfaceTextures || {}).map(async ([name, url]) =>
        [name, { texture: await texture(url), photo: photos.get(url) }])) : [];
      if (disposed || current !== revision) return;
      stage.remove(food); disposeTree(food); modelTextures.forEach(value => value.dispose()); modelTextures = new Set();
      if (volumetric) {
        const assets = new Map(selected.map((item, index) => [item.id, { texture: maps[index], photo: photos.get(item.layerImageUrl) }]));
        surfaces.forEach(([name, asset]) => assets.set(`surface:${name}`, asset));
        food = buildKitchenModel(dish, selected, assets, base ? { texture: base, photo: photos.get(dish.baseImageUrl) } : null, modelTextures);
        canvas.dataset.phase = food.userData.phase; canvas.dataset.folded = String(food.userData.folded);
        canvas.dataset.representedCount = String(food.userData.representedIds.length);
      } else {
        food = new THREE.Group();
        if (base) addLayer(food, base, { width: 4.5, aspect: 1, x: 0, z: 0, level: -1, angle: 0 });
        selected.forEach((item, index) => (item.scene.parts || [item.scene]).forEach(part => addLayer(food, maps[index], part)));
      }
      stage.add(food);
      enter(food);
    },
    rotateBy(delta) { stage.rotation.y += Number(delta) || 0; render(); },
    resetView() { stage.rotation.y = -.2; stage.rotation.x = 0; render(); },
    dispose() {
      if (disposed) return;
      disposed = true; revision++; cancelAnimationFrame(animationFrame); observer.disconnect();
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("pointerdown", pointerDown); canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp); canvas.removeEventListener("pointercancel", pointerUp);
      disposeTree(scene); modelTextures.forEach(value => value.dispose()); ownedTextures.forEach(value => value.dispose()); ownedTextures.clear(); textures.clear(); croppedTextures.clear(); photos.clear();
      light.shadow?.map?.dispose();
      renderer.dispose(); renderer.forceContextLoss?.(); canvas.remove();
    }
  };
}
