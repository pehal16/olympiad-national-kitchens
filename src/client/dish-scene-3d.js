import * as THREE from "three";

const DEFAULT_ROTATION = Object.freeze({ x: -0.1, y: -0.38 });
const FOOD_ROUGHNESS = 0.72;

function hashText(value) {
  const text = String(value || "dish");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seedValue) {
  let state = hashText(seedValue);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function standardMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? FOOD_ROUGHNESS,
    metalness: options.metalness ?? 0,
    transparent: Boolean(options.transparent),
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
    depthWrite: options.depthWrite ?? true
  });
}

function setFoodShadow(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return object;
}

function createLeaf(color = 0x3f8c43, scale = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.72);
  shape.bezierCurveTo(0.58, -0.42, 0.62, 0.28, 0, 0.78);
  shape.bezierCurveTo(-0.62, 0.28, -0.58, -0.42, 0, -0.72);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.018,
    bevelSegments: 2
  });
  geometry.center();
  const leaf = new THREE.Mesh(
    geometry,
    standardMaterial(color, { roughness: 0.66, side: THREE.DoubleSide })
  );
  leaf.scale.set(scale, scale, scale);
  leaf.rotation.x = -Math.PI / 2;
  return leaf;
}

function addLeafCluster(group, options = {}) {
  const random = seededRandom(options.seed || "leaf-cluster");
  const count = options.count || 10;
  const radius = options.radius || 1.8;
  for (let index = 0; index < count; index += 1) {
    const leaf = createLeaf(
      index % 3 === 0 ? options.accentColor || 0x79b84f : options.color || 0x3e8f48,
      (options.scale || 0.82) * (0.8 + random() * 0.42)
    );
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * radius;
    leaf.position.set(
      Math.cos(angle) * distance,
      (options.height || 0.72) + random() * 0.38,
      Math.sin(angle) * distance
    );
    leaf.rotation.z = angle + (random() - 0.5) * 1.1;
    leaf.rotation.x = -Math.PI / 2 + (random() - 0.5) * 0.45;
    leaf.rotation.y = (random() - 0.5) * 0.5;
    group.add(leaf);
  }
}

function addPizzaDough(group) {
  const center = new THREE.Mesh(
    new THREE.CylinderGeometry(2.48, 2.52, 0.24, 80),
    standardMaterial(0xd89b5d, { roughness: 0.88 })
  );
  center.position.y = 0.31;
  group.add(center);

  const crust = new THREE.Mesh(
    new THREE.TorusGeometry(2.48, 0.29, 18, 96),
    standardMaterial(0xc47a3f, { roughness: 0.82 })
  );
  crust.rotation.x = -Math.PI / 2;
  crust.position.y = 0.47;
  group.add(crust);

  const random = seededRandom("pizza-char");
  for (let index = 0; index < 28; index += 1) {
    const angle = random() * Math.PI * 2;
    const spot = new THREE.Mesh(
      new THREE.SphereGeometry(0.045 + random() * 0.07, 10, 6),
      standardMaterial(index % 4 === 0 ? 0x2b2018 : 0x68452c, { roughness: 0.92 })
    );
    spot.scale.y = 0.24;
    spot.position.set(Math.cos(angle) * 2.47, 0.73, Math.sin(angle) * 2.47);
    group.add(spot);
  }
}

function addTomatoSauce(group) {
  const sauce = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.065, 80),
    standardMaterial(0xb72b20, { roughness: 0.58 })
  );
  sauce.position.y = 0.5;
  group.add(sauce);
  const random = seededRandom("sauce-texture");
  for (let index = 0; index < 22; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * 1.95;
    const pulp = new THREE.Mesh(
      new THREE.SphereGeometry(0.055 + random() * 0.07, 8, 5),
      standardMaterial(index % 3 ? 0xd44731 : 0x912014, { roughness: 0.7 })
    );
    pulp.scale.y = 0.25;
    pulp.position.set(Math.cos(angle) * distance, 0.55, Math.sin(angle) * distance);
    group.add(pulp);
  }
}

function addMozzarella(group) {
  const positions = [
    [-1.28, -0.72, 0.18],
    [-0.35, 0.86, -0.1],
    [0.75, 1.2, 0.08],
    [1.28, -0.45, -0.12],
    [0.12, -1.35, 0.12],
    [-1.25, 0.78, -0.08],
    [0.38, 0.02, 0.16]
  ];
  positions.forEach(([x, z, offset], index) => {
    const cheese = new THREE.Mesh(
      new THREE.SphereGeometry(0.46 + (index % 2) * 0.07, 24, 14),
      standardMaterial(0xf6f0dc, { roughness: 0.55 })
    );
    cheese.scale.set(1.15, 0.24, 0.9);
    cheese.position.set(x, 0.62 + offset * 0.1, z);
    cheese.rotation.y = index * 0.72;
    group.add(cheese);
  });
}

function addBasil(group) {
  const positions = [
    [-1.05, 0.72, -0.68],
    [0.28, 0.82, 0.2],
    [1.02, 0.78, 0.72],
    [-0.12, 0.86, 1.35],
    [1.22, 0.8, -0.85]
  ];
  positions.forEach(([x, y, z], index) => {
    const leaf = createLeaf(index % 2 ? 0x2d7f36 : 0x3f9a47, 0.48);
    leaf.position.set(x, y, z);
    leaf.rotation.z = index * 1.21;
    leaf.rotation.x = -Math.PI / 2 + (index % 2 ? 0.18 : -0.12);
    group.add(leaf);
  });
}

function addOliveOil(group, preset) {
  const material = standardMaterial(0xe8b52f, {
    roughness: 0.25,
    transparent: true,
    opacity: 0.7
  });
  const positions = preset === "salad"
    ? [[-0.8, 0.92, 0.25], [0.55, 0.98, -0.7], [1.1, 0.9, 0.8]]
    : [[-0.72, 0.7, 0.2], [0.68, 0.71, -0.55], [0.28, 0.72, 1.05]];
  positions.forEach(([x, y, z], index) => {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.16 + index * 0.02, 16, 8), material);
    drop.scale.y = 0.07;
    drop.position.set(x, y, z);
    group.add(drop);
  });
}

function addFreshTomatoes(group, cherry = false) {
  const positions = cherry
    ? [[-1.2, 0.95, -0.3], [-0.2, 1.02, 1.15], [0.95, 1.0, 0.4], [0.62, 0.98, -1.05], [-0.85, 1.04, 0.86]]
    : [[-0.9, 0.68, -0.55], [0.25, 0.7, 0.95], [1.02, 0.69, -0.2]];
  positions.forEach(([x, y, z], index) => {
    const tomato = new THREE.Mesh(
      new THREE.SphereGeometry(cherry ? 0.3 : 0.48, 24, 14),
      standardMaterial(index % 2 ? 0xd73727 : 0xee4a34, { roughness: 0.52 })
    );
    tomato.scale.y = cherry ? 0.55 : 0.36;
    tomato.position.set(x, y, z);
    group.add(tomato);
    const seed = new THREE.Mesh(
      new THREE.CircleGeometry(cherry ? 0.2 : 0.3, 18),
      standardMaterial(0xff8a55, { roughness: 0.72, side: THREE.DoubleSide })
    );
    seed.rotation.x = -Math.PI / 2;
    seed.position.set(x, y + (cherry ? 0.18 : 0.19), z);
    group.add(seed);
  });
}

function addParmesan(group, preset) {
  const random = seededRandom(`parmesan-${preset}`);
  const count = preset === "salad" ? 16 : 11;
  for (let index = 0; index < count; index += 1) {
    const geometry = new THREE.PlaneGeometry(0.26 + random() * 0.34, 0.12 + random() * 0.18);
    const shaving = new THREE.Mesh(
      geometry,
      standardMaterial(0xf0dfad, { roughness: 0.76, side: THREE.DoubleSide })
    );
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * (preset === "salad" ? 1.85 : 1.8);
    shaving.position.set(
      Math.cos(angle) * distance,
      preset === "salad" ? 1.16 + random() * 0.24 : 0.79 + random() * 0.12,
      Math.sin(angle) * distance
    );
    shaving.rotation.set(-Math.PI / 2 + (random() - 0.5) * 0.5, random() * 0.5, random() * Math.PI);
    group.add(shaving);
  }
}

function addOregano(group) {
  const random = seededRandom("oregano");
  for (let index = 0; index < 45; index += 1) {
    const flake = new THREE.Mesh(
      new THREE.PlaneGeometry(0.055 + random() * 0.07, 0.025 + random() * 0.04),
      standardMaterial(index % 3 ? 0x61733a : 0x8a7643, { side: THREE.DoubleSide })
    );
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * 2.05;
    flake.position.set(Math.cos(angle) * distance, 0.82, Math.sin(angle) * distance);
    flake.rotation.set(-Math.PI / 2, 0, random() * Math.PI);
    group.add(flake);
  }
}

function addChicken(group) {
  const positions = [
    [-1.2, 1.0, -0.45, -0.42],
    [-0.38, 1.1, 0.72, 0.3],
    [0.35, 1.08, -0.2, -0.18],
    [1.15, 1.03, 0.54, 0.5],
    [0.62, 1.14, 1.25, -0.65],
    [-0.7, 1.08, 1.38, 0.74]
  ];
  positions.forEach(([x, y, z, rotation], index) => {
    const strip = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.24, 0.72, 6, 12),
      standardMaterial(index % 2 ? 0xd39a61 : 0xe3b37a, { roughness: 0.74 })
    );
    strip.rotation.z = Math.PI / 2;
    strip.rotation.y = rotation;
    strip.scale.y = 0.72;
    strip.position.set(x, y, z);
    group.add(strip);
    for (let markIndex = -1; markIndex <= 1; markIndex += 1) {
      const mark = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.015, 0.38),
        standardMaterial(0x5c3424, { roughness: 0.9 })
      );
      mark.position.set(x + Math.cos(rotation) * markIndex * 0.23, y + 0.25, z - Math.sin(rotation) * markIndex * 0.23);
      mark.rotation.y = rotation;
      group.add(mark);
    }
  });
}

function addCroutons(group) {
  const random = seededRandom("croutons");
  for (let index = 0; index < 10; index += 1) {
    const crouton = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.32, 0.42),
      standardMaterial(index % 3 ? 0xd58a3c : 0xb8662f, { roughness: 0.88 })
    );
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * 1.82;
    crouton.position.set(Math.cos(angle) * distance, 1.02 + random() * 0.28, Math.sin(angle) * distance);
    crouton.rotation.set(random() * 0.5, random() * Math.PI, random() * 0.35);
    group.add(crouton);
  }
}

function addCaesarDressing(group) {
  const material = standardMaterial(0xf1e2be, { roughness: 0.48 });
  const curves = [
    [[-1.7, 0.95, -0.8], [-0.6, 1.27, -0.1], [0.45, 1.18, 0.72], [1.65, 1.04, 0.3]],
    [[-1.3, 1.0, 1.05], [-0.35, 1.26, 0.46], [0.7, 1.2, -0.25], [1.35, 1.05, -1.02]]
  ];
  curves.forEach((points) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 34, 0.055, 8, false), material));
  });
}

function addCucumber(group) {
  const positions = [[-1.25, 0.93, -0.5], [-0.25, 1.0, 1.1], [0.85, 0.96, 0.55], [0.95, 0.95, -0.9], [-0.65, 1.0, 0.45]];
  positions.forEach(([x, y, z], index) => {
    const slice = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.1, 28),
      standardMaterial(0x3d8a49, { roughness: 0.62 })
    );
    slice.position.set(x, y, z);
    slice.rotation.y = index * 0.6;
    group.add(slice);
    const center = new THREE.Mesh(
      new THREE.CylinderGeometry(0.31, 0.31, 0.105, 28),
      standardMaterial(0xbadf8e, { roughness: 0.68 })
    );
    center.position.set(x, y + 0.003, z);
    group.add(center);
  });
}

function addBoiledEgg(group) {
  [[-0.9, 1.02, -0.4], [0.8, 1.02, 0.65]].forEach(([x, y, z], index) => {
    const white = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 24, 16),
      standardMaterial(0xf8f4e8, { roughness: 0.62 })
    );
    white.scale.set(1.15, 0.22, 0.82);
    white.position.set(x, y, z);
    white.rotation.y = index * 0.8;
    group.add(white);
    const yolk = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 20, 12),
      standardMaterial(0xe9a826, { roughness: 0.72 })
    );
    yolk.scale.y = 0.35;
    yolk.position.set(x, y + 0.14, z);
    group.add(yolk);
  });
}

function addGenericIngredient(group, kind) {
  const random = seededRandom(kind);
  const hue = random();
  const color = new THREE.Color().setHSL(hue, 0.48, 0.52);
  for (let index = 0; index < 6; index += 1) {
    const token = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.24 + random() * 0.14, 1),
      standardMaterial(color, { roughness: 0.72 })
    );
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * 1.8;
    token.position.set(Math.cos(angle) * distance, 0.92 + random() * 0.22, Math.sin(angle) * distance);
    group.add(token);
  }
}

function createPlate() {
  const group = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(3.35, 3.12, 0.22, 96),
    standardMaterial(0xf6f4ed, { roughness: 0.35 })
  );
  plate.position.y = -0.05;
  group.add(plate);
  const well = new THREE.Mesh(
    new THREE.CylinderGeometry(2.86, 2.9, 0.07, 96),
    standardMaterial(0xffffff, { roughness: 0.28 })
  );
  well.position.y = 0.09;
  group.add(well);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(3.02, 0.22, 18, 96),
    standardMaterial(0xffffff, { roughness: 0.3 })
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.17;
  group.add(rim);
  return setFoodShadow(group);
}

function createSaladBowl() {
  const group = new THREE.Group();
  const profile = [
    new THREE.Vector2(1.25, 0),
    new THREE.Vector2(1.65, 0.08),
    new THREE.Vector2(2.35, 0.52),
    new THREE.Vector2(2.72, 1.05),
    new THREE.Vector2(2.82, 1.35)
  ];
  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 96),
    standardMaterial(0xcfe8e2, {
      roughness: 0.15,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  bowl.position.y = -0.2;
  group.add(bowl);
  const foot = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.45, 0.18, 64),
    standardMaterial(0xe8f2ef, { roughness: 0.2, transparent: true, opacity: 0.72 })
  );
  foot.position.y = -0.22;
  group.add(foot);
  return group;
}

function addIngredient(group, kind, preset) {
  switch (kind) {
    case "pizza_dough": addPizzaDough(group); break;
    case "tomato_sauce": addTomatoSauce(group); break;
    case "mozzarella": addMozzarella(group); break;
    case "basil": addBasil(group); break;
    case "olive_oil": addOliveOil(group, preset); break;
    case "fresh_tomato": addFreshTomatoes(group, false); break;
    case "parmesan": addParmesan(group, preset); break;
    case "oregano": addOregano(group); break;
    case "romaine": addLeafCluster(group, { seed: "romaine", count: 14, radius: 1.9, height: 0.72, scale: 0.72 }); break;
    case "grilled_chicken": addChicken(group); break;
    case "croutons": addCroutons(group); break;
    case "cherry_tomato": addFreshTomatoes(group, true); break;
    case "caesar_dressing": addCaesarDressing(group); break;
    case "cucumber": addCucumber(group); break;
    case "boiled_egg": addBoiledEgg(group); break;
    default: addGenericIngredient(group, kind); break;
  }
}

function disposeTree(root) {
  root.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
    else if (child.material) child.material.dispose();
  });
}

export function mountDishScene(container, options = {}) {
  if (!container || typeof container.appendChild !== "function") {
    throw new Error("Контейнер 3D-сцены не найден.");
  }
  const testCanvas = document.createElement("canvas");
  const context = testCanvas.getContext("webgl2", { alpha: true });
  if (!context) {
    throw new Error("WebGL 2 недоступен.");
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 40);
  camera.position.set(0, options.preset === "salad" ? 5.8 : 5.35, 7.2);
  camera.lookAt(0, 0.45, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.className = "dish-3d-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xfffbef, 0x8ca6a0, 2.5));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
  keyLight.position.set(-4, 8, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(768, 768);
  keyLight.shadow.camera.left = -6;
  keyLight.shadow.camera.right = 6;
  keyLight.shadow.camera.top = 6;
  keyLight.shadow.camera.bottom = -6;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffd7b0, 1.3);
  fillLight.position.set(5, 3, -4);
  scene.add(fillLight);

  const stage = new THREE.Group();
  stage.rotation.set(DEFAULT_ROTATION.x, DEFAULT_ROTATION.y, 0);
  scene.add(stage);
  stage.add(options.preset === "salad" ? createSaladBowl() : createPlate());

  let ingredientRoot = new THREE.Group();
  stage.add(ingredientRoot);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(3.7, 72),
    new THREE.ShadowMaterial({ color: 0x173f35, opacity: 0.2 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.32;
  shadow.receiveShadow = true;
  stage.add(shadow);

  let disposed = false;
  let pointer = null;
  let startRotation = null;

  function resize() {
    if (disposed) return;
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }

  function render() {
    if (!disposed) renderer.render(scene, camera);
  }

  function onPointerDown(event) {
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    startRotation = { x: stage.rotation.x, y: stage.rotation.y };
    renderer.domElement.setPointerCapture?.(event.pointerId);
    renderer.domElement.classList.add("is-dragging");
  }

  function onPointerMove(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const deltaX = event.clientX - pointer.x;
    const deltaY = event.clientY - pointer.y;
    stage.rotation.y = startRotation.y + deltaX * 0.009;
    stage.rotation.x = THREE.MathUtils.clamp(startRotation.x + deltaY * 0.005, -0.36, 0.16);
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

  const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(container);
  window.addEventListener("resize", resize);
  resize();

  return {
    setSelection(items = []) {
      if (disposed) return;
      stage.remove(ingredientRoot);
      disposeTree(ingredientRoot);
      ingredientRoot = new THREE.Group();
      stage.add(ingredientRoot);
      items.forEach((item) => addIngredient(ingredientRoot, item?.model3d?.kind || "generic", options.preset));
      setFoodShadow(ingredientRoot);
      render();
    },
    rotateBy(delta) {
      stage.rotation.y += Number(delta) || 0;
      render();
    },
    resetView() {
      stage.rotation.set(DEFAULT_ROTATION.x, DEFAULT_ROTATION.y, 0);
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      resizeObserver?.disconnect();
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
