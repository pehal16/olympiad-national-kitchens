import * as THREE from "three";

// Ingredient cards remain unchanged. The assembly uses separate photographic
// layers so a bottle, bowl or raw dough ball never appears on the plated dish.
const PHOTO_ROOT = "/assets/olympiad/visual-v1/ingredients";
const LAYER_ROOT = "/assets/olympiad/visual-v2/layers";
const filenames = {
  basil: "basil", boiled_egg: "boiled-egg", caesar_dressing: "caesar-dressing",
  cherry_tomato: "cherry-tomatoes", croutons: "croutons", cucumber: "cucumber",
  fresh_tomato: "fresh-tomatoes", grilled_chicken: "grilled-chicken",
  mozzarella: "mozzarella", olive_oil: "olive-oil", oregano: "oregano",
  parmesan: "parmesan", pizza_dough: "pizza-dough", romaine: "romaine",
  tomato_sauce: "tomato-sauce"
};
const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

function photoUrl(kind, preset) {
  if (preset === "pizza") {
    if (kind === "pizza_dough") return `${LAYER_ROOT}/pizza-base.webp`;
    if (kind === "tomato_sauce") return `${LAYER_ROOT}/pizza-tomato-sauce.webp`;
    if (kind === "mozzarella") return `${LAYER_ROOT}/pizza-mozzarella.webp`;
  }
  return `${PHOTO_ROOT}/${filenames[kind] || "romaine"}.webp`;
}

function getTexture(url) {
  if (!textureCache.has(url)) {
    textureCache.set(url, textureLoader.loadAsync(url).then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    }).catch((error) => {
      textureCache.delete(url);
      throw error;
    }));
  }
  return textureCache.get(url);
}

function addPhoto(root, texture, width, x, y, z, angle = 0) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  pivot.rotation.y = angle;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width),
    new THREE.MeshBasicMaterial({
      map: texture, transparent: true, side: THREE.DoubleSide,
      depthWrite: false, toneMapped: false
    })
  );
  plane.rotation.x = -Math.PI / 2;
  pivot.add(plane);
  root.add(pivot);
}

function addDressing(root) {
  const material = new THREE.MeshBasicMaterial({ color: 0xd5c7a7 });
  const strokes = [
    [[-1.35, -0.7], [-0.85, -0.35], [-0.3, -0.52], [0.2, -0.12]],
    [[0.25, 0.96], [0.65, 0.43], [0.53, -0.05], [0.97, -0.41]],
    [[-1.05, 0.65], [-0.48, 0.35], [0.08, 0.61], [0.42, 0.42]],
    [[-0.12, -1.25], [0.4, -0.85], [0.86, -1.06], [1.22, -0.63]]
  ];
  for (const stroke of strokes) {
    const curve = new THREE.CatmullRomCurve3(stroke.map(([x, z]) => new THREE.Vector3(x, 0.91, z)));
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.029, 8, false), material));
  }
}

function addOil(root) {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xd9ad36, roughness: 0.12, transparent: true,
    opacity: 0.48, clearcoat: 1
  });
  for (const [x, z, size] of [[-0.72, 0.15, 0.09], [0.62, -0.62, 0.07], [0.16, 1.1, 0.06], [1.03, 0.5, 0.05]]) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 8), material);
    drop.scale.y = 0.06;
    drop.position.set(x, 0.84, z);
    root.add(drop);
  }
}

function addIngredient(root, kind, preset, texture) {
  if (preset === "pizza") {
    if (kind === "pizza_dough") addPhoto(root, texture, 5.55, 0, 0.32, 0);
    else if (kind === "tomato_sauce") addPhoto(root, texture, 4.8, 0, 0.38, 0);
    else if (kind === "mozzarella") addPhoto(root, texture, 4.72, 0, 0.44, 0);
    else if (kind === "basil") {
      addPhoto(root, texture, 1.68, -0.95, 0.51, -0.65, -0.35);
      addPhoto(root, texture, 1.38, 0.86, 0.52, 0.45, 1.9);
      addPhoto(root, texture, 1.06, 0.1, 0.53, 1.06, 0.4);
    } else if (kind === "olive_oil") addOil(root);
    else addPhoto(root, texture, kind === "grilled_chicken" ? 3.1 : 2.8, 0, 0.59, 0, 0.25);
    return;
  }
  if (kind === "romaine") addPhoto(root, texture, 5, 0, 0.48, 0, 0.1);
  else if (kind === "grilled_chicken") {
    addPhoto(root, texture, 2.9, -0.75, 0.83, -0.45, -0.35);
    addPhoto(root, texture, 2.25, 0.85, 0.84, 0.72, 1.2);
  } else if (kind === "croutons") {
    addPhoto(root, texture, 2.65, 0.55, 0.67, -0.5, 0.2);
    addPhoto(root, texture, 1.8, -0.9, 0.68, 0.95, 2.2);
  } else if (kind === "parmesan") {
    addPhoto(root, texture, 2.45, -0.7, 0.72, 0.6, 0.55);
    addPhoto(root, texture, 1.85, 1.1, 0.73, -0.8, -0.8);
  } else if (kind === "cherry_tomato") {
    addPhoto(root, texture, 1.72, 1.18, 0.77, 0.76, 0.5);
    addPhoto(root, texture, 1.22, -1.28, 0.78, -0.95, -0.5);
  } else if (kind === "caesar_dressing") addDressing(root);
  else addPhoto(root, texture, kind === "pizza_dough" ? 2.4 : 2.9, 0, 0.81, 0, 0.3);
}

function createPlate() {
  const root = new THREE.Group();
  const ceramic = new THREE.MeshPhysicalMaterial({
    color: 0xf6f4ed, roughness: 0.27, clearcoat: 0.72, clearcoatRoughness: 0.18
  });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.05, 0.18, 96), ceramic);
  root.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.99, 0.17, 16, 96), ceramic);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.12;
  root.add(rim);
  return root;
}

function disposeTree(root) {
  root.traverse((child) => {
    child.geometry?.dispose();
    if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
    else child.material?.dispose();
  });
}

export function mountDishScene(container, options = {}) {
  if (!container || typeof container.appendChild !== "function") {
    throw new Error("Контейнер 3D-сцены не найден.");
  }
  if (!document.createElement("canvas").getContext("webgl2", { alpha: true })) {
    throw new Error("WebGL 2 недоступен.");
  }
  const preset = options.preset === "salad" ? "salad" : "pizza";
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 40);
  camera.position.set(0, 7.9, 5.9);
  camera.lookAt(0, 0.2, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.domElement.className = "dish-3d-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa7b8ae, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-4, 8, 5);
  scene.add(key);
  const stage = new THREE.Group();
  stage.rotation.set(-0.04, -0.25, 0);
  scene.add(stage);
  stage.add(createPlate());
  let food = new THREE.Group();
  stage.add(food);
  let disposed = false;
  let revision = 0;
  let pointer = null;
  let startRotation = null;

  function render() { if (!disposed) renderer.render(scene, camera); }
  function resize() {
    if (disposed) return;
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }
  function onPointerDown(event) {
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    startRotation = { x: stage.rotation.x, y: stage.rotation.y };
    renderer.domElement.setPointerCapture?.(event.pointerId);
    renderer.domElement.classList.add("is-dragging");
  }
  function onPointerMove(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    stage.rotation.y = startRotation.y + (event.clientX - pointer.x) * 0.009;
    stage.rotation.x = THREE.MathUtils.clamp(startRotation.x + (event.clientY - pointer.y) * 0.004, -0.18, 0.1);
    render();
  }
  function onPointerUp(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    pointer = null;
    startRotation = null;
    renderer.domElement.classList.remove("is-dragging");
  }
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointercancel", onPointerUp);
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  observer?.observe(container);
  window.addEventListener("resize", resize);
  resize();

  return {
    async setSelection(items = []) {
      if (disposed) return;
      const current = ++revision;
      const selected = items.map((item) => {
        const kind = item?.model3d?.kind || "romaine";
        return { kind, url: photoUrl(kind, preset) };
      });
      const textures = await Promise.allSettled(selected.map(({ url }) => getTexture(url)));
      if (disposed || current !== revision) return;
      stage.remove(food);
      disposeTree(food);
      food = new THREE.Group();
      stage.add(food);
      selected.forEach(({ kind }, index) => {
        if (kind === "olive_oil" && preset === "pizza") addOil(food);
        else if (kind === "caesar_dressing" && preset === "salad") addDressing(food);
        else if (textures[index].status === "fulfilled") addIngredient(food, kind, preset, textures[index].value);
      });
      render();
    },
    rotateBy(delta) { stage.rotation.y += Number(delta) || 0; render(); },
    resetView() { stage.rotation.set(-0.04, -0.25, 0); render(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      revision += 1;
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      disposeTree(scene);
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();
    }
  };
}
