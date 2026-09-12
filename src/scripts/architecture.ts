/**
 * Apex / architectural study
 *
 * Integration: import { initArchitecture } from './architecture';
 * const dispose = initArchitecture(document.querySelector('[data-architecture]')!);
 * Call dispose before removing the section (including Astro page transitions).
 * The companion architecture.css is imported here. No other initialization is needed.
 *
 * Required children: [data-architecture-canvas], buttons with
 * [data-architecture-stage="0|1|2"], [data-architecture-caption], and
 * [data-architecture-reset]. Keep .architecture-fallback inside the canvas host.
 * Rendering and the Three.js download begin only upon viewport intersection.
 * Everything is procedural: no model, font, image, or network asset dependencies.
 */
import '../styles/architecture.css';
import type * as THREE from 'three';

type Three = typeof THREE;
type Stage = 0 | 1 | 2;
type XYZ = [number, number, number];
type Opening = { x: number; width: number; bottom: number; height: number };
type Model = ReturnType<typeof buildArchitectureModel>;

const STAGES = [
  {
    title: 'See the potential',
    caption: 'See the potential. A complete architectural cutaway reveals the spaces already waiting within.',
    explosion: 0,
    finish: 0,
  },
  {
    title: 'Open the possibilities',
    caption: 'Open the possibilities. The roof and walls separate to reveal an open, connected floor plan.',
    explosion: 1,
    finish: 0.12,
  },
  {
    title: 'Bring it together',
    caption: 'Bring it together. Warm timber, light stone, and carefully considered details become one home.',
    explosion: 0,
    finish: 1,
  },
] as const;

const instances = new WeakMap<HTMLElement, () => void>();
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Preserve the 45-degree view while making room for the separated roof. */
function frameArchitectureCamera(
  camera: THREE.OrthographicCamera, width: number, height: number, explosion: number,
) {
  const aspect = width / height;
  const viewHeight = Math.max(11.4 + explosion * 1.75, 17.2 / aspect);
  const centerY = 1.55 + explosion * 0.85;
  camera.left = -viewHeight * aspect / 2;
  camera.right = viewHeight * aspect / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.position.set(17, 13 + centerY, 17);
  camera.lookAt(0, centerY, 0);
  camera.updateProjectionMatrix();
}

/** Pure scene construction, deliberately independent of WebGL and the DOM. */
function buildArchitectureModel(T: Three) {
  const group = new T.Group();
  group.name = 'apex-architectural-study';
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const moving: { object: THREE.Group; offset: THREE.Vector3 }[] = [];
  const colorIvory = new T.Color('#eee9df');
  const colorRoof = new T.Color('#343330');
  const colorTimber = new T.Color('#aa8055');
  const colorConceptTimber = new T.Color('#d8c7a9');

  function material(color: string, roughness = 0.75, metalness = 0) {
    const m = new T.MeshStandardMaterial({ color, roughness, metalness });
    materials.add(m);
    return m;
  }
  const ivory = material('#e9e4d9');
  const pale = material('#f5f0e8', 0.9);
  const limestone = material('#c8bdab', 0.95);
  const concrete = material('#9f978a', 0.98);
  const charcoal = material('#35332f', 0.66);
  const timber = material('#d8c7a9', 0.75);
  const oakFloor = material('#c5b292', 0.86);
  const gold = material('#c9aa6d', 0.38, 0.55);
  const softGold = material('#ad9267', 0.54, 0.35);
  const upholstery = material('#b6aa95', 1);
  const darkUpholstery = material('#615c54', 1);
  const frontSurface = material('#eee9df');
  const nearRoof = material('#eee9df', 0.59, 0.1);
  const farRoof = material('#eee9df', 0.59, 0.1);
  const wingRoof = material('#eee9df', 0.66, 0.08);
  const glass = material('#b4a38a', 0.3, 0.16);
  glass.transparent = true;
  glass.opacity = 0.13;
  glass.depthWrite = false;
  glass.side = T.DoubleSide;
  const warmLight = material('#ffdcaa', 0.7);
  warmLight.emissive.set('#ffd092');
  warmLight.emissiveIntensity = 0.75;
  const edgeMaterial = new T.LineBasicMaterial({
    color: '#cbb27e', transparent: true, opacity: 0.72, depthWrite: false,
  });
  materials.add(edgeMaterial);

  function mesh(
    parent: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material,
    position: XYZ, name = '', outline = false,
  ) {
    geometries.add(geometry);
    const item = new T.Mesh(geometry, mat);
    item.position.set(...position);
    item.name = name;
    item.castShadow = mat !== glass;
    item.receiveShadow = true;
    parent.add(item);
    if (outline) {
      const edges = new T.EdgesGeometry(geometry, 25);
      geometries.add(edges);
      const line = new T.LineSegments(edges, edgeMaterial);
      line.name = `${name}-cad-edges`;
      item.add(line);
    }
    return item;
  }

  function box(
    parent: THREE.Object3D, size: XYZ, position: XYZ,
    mat: THREE.Material, name = '', outline = false,
  ) {
    return mesh(parent, new T.BoxGeometry(...size), mat, position, name, outline);
  }

  function beam(
    parent: THREE.Object3D, start: XYZ, end: XYZ, radius = 0.022,
    mat: THREE.Material = gold, name = 'structural-line',
  ) {
    const a = new T.Vector3(...start);
    const b = new T.Vector3(...end);
    const direction = b.clone().sub(a);
    const item = mesh(parent,
      new T.CylinderGeometry(radius, radius, direction.length(), 6),
      mat, a.add(b).multiplyScalar(0.5).toArray() as XYZ, name);
    item.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize());
    return item;
  }

  function assembly(name: string, offset: XYZ) {
    const object = new T.Group();
    object.name = name;
    group.add(object);
    moving.push({ object, offset: new T.Vector3(...offset) });
    return object;
  }

  // Wall geometry is a set of lintels, sills, and piers around actual empty
  // apertures. There is never a solid room-sized box behind the glazing.
  function wall(
    parent: THREE.Group, width: number, height: number, thickness: number,
    openings: Opening[], mat: THREE.Material, name: string,
  ) {
    const xs = [...new Set([
      -width / 2, width / 2,
      ...openings.flatMap(o => [o.x - o.width / 2, o.x + o.width / 2]),
    ])].sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++) {
      const left = xs[i];
      const right = xs[i + 1];
      const middle = (left + right) / 2;
      const cuts = openings.filter(o => middle > o.x - o.width / 2 && middle < o.x + o.width / 2);
      const ys = [...new Set([0, height, ...cuts.flatMap(o => [o.bottom, o.bottom + o.height])])]
        .sort((a, b) => a - b);
      for (let j = 0; j < ys.length - 1; j++) {
        const low = ys[j];
        const high = ys[j + 1];
        if (high - low < 0.001 || cuts.some(o => (low + high) / 2 > o.bottom &&
          (low + high) / 2 < o.bottom + o.height)) continue;
        box(parent, [right - left, high - low, thickness],
          [middle, (low + high) / 2, 0], mat, `${name}-pier-or-lintel`, true);
      }
    }
    for (const [i, o] of openings.entries()) {
      const z = thickness * 0.12;
      const y = o.bottom + o.height / 2;
      const frame = 0.045;
      box(parent, [frame, o.height, thickness * 0.62],
        [o.x - o.width / 2 + frame / 2, y, z], charcoal, `${name}-jamb-${i}`);
      box(parent, [frame, o.height, thickness * 0.62],
        [o.x + o.width / 2 - frame / 2, y, z], charcoal, `${name}-jamb-${i}`);
      for (const edgeY of [o.bottom + frame / 2, o.bottom + o.height - frame / 2]) {
        box(parent, [o.width, frame, thickness * 0.62],
          [o.x, edgeY, z], gold, `${name}-window-rail-${i}`);
      }
      box(parent, [o.width - frame * 2, o.height - frame * 2, 0.018],
        [o.x, y, z], glass, `${name}-glazing-${i}`);
      if (o.width > 1.4) {
        box(parent, [0.034, o.height, 0.075],
          [o.x, y, z + 0.014], gold, `${name}-mullion-${i}`);
      }
    }
    parent.userData.openings = openings;
    parent.userData.wallWidth = width;
    parent.userData.wallHeight = height;
  }

  // Thin, stepped presentation plinth; the house sits on it, not in a box.
  const foundation = new T.Group();
  foundation.name = 'permanent-foundation-and-floorplan';
  group.add(foundation);
  box(foundation, [12.2, 0.17, 9.0], [0, -0.015, 0.3], charcoal, 'lower-plinth');
  box(foundation, [11.8, 0.13, 8.6], [0, 0.13, 0.3], limestone, 'stone-plinth', true);
  box(foundation, [6.7, 0.2, 6.6], [-1.95, 0.295, 0], pale, 'main-floor-slab', true);
  box(foundation, [4.1, 0.2, 4.85], [3.4, 0.295, 0.15], pale, 'wing-floor-slab', true);
  box(foundation, [6.23, 0.027, 6.15], [-1.95, 0.409, 0], oakFloor, 'main-oak-floor');
  box(foundation, [3.78, 0.027, 4.4], [3.4, 0.409, 0.15], limestone, 'wing-stone-floor');
  box(foundation, [10.7, 0.13, 1.12], [0, 0.27, 3.86], concrete, 'covered-terrace', true);
  box(foundation, [3.55, 0.12, 0.4], [-2.8, 0.16, 4.59], limestone, 'entry-step');
  box(foundation, [3.75, 0.09, 0.43], [-2.8, 0.045, 4.87], limestone, 'entry-lower-step');

  // Quiet floorboard seams, batched into one draw call.
  const seamVertices: number[] = [];
  for (let x = -4.98; x < 1.16; x += 0.26) {
    seamVertices.push(x, 0.425, -3.06, x, 0.425, 3.06);
  }
  const seamGeometry = new T.BufferGeometry();
  seamGeometry.setAttribute('position', new T.Float32BufferAttribute(seamVertices, 3));
  geometries.add(seamGeometry);
  const seamMaterial = new T.LineBasicMaterial({
    color: '#8f7d60', transparent: true, opacity: 0.25, depthWrite: false,
  });
  materials.add(seamMaterial);
  foundation.add(new T.LineSegments(seamGeometry, seamMaterial));

  const floorY = 0.43;
  const eavesY = 3.24;
  const ridgeY = 5.02;
  const front = assembly('south-glazed-gable-facade', [0, 0.35, 0.88]);
  const frontWall = new T.Group();
  frontWall.position.set(-1.95, floorY, 3.12);
  front.add(frontWall);
  wall(frontWall, 6.5, 2.81, 0.19, [
    { x: -1.82, width: 2.25, bottom: 0.1, height: 2.4 },
    { x: 1.24, width: 2.76, bottom: 0, height: 2.5 },
  ], frontSurface, 'south');

  const back = assembly('north-stone-wall', [0, 0.18, -0.55]);
  const backWall = new T.Group();
  backWall.position.set(-1.95, floorY, -3.12);
  back.add(backWall);
  wall(backWall, 6.5, 2.81, 0.2, [
    { x: -1.9, width: 1.48, bottom: 0.95, height: 1.5 },
    { x: 1.53, width: 2.28, bottom: 0.52, height: 1.93 },
  ], ivory, 'north');

  const west = assembly('west-bedroom-wall', [-0.55, 0.18, 0]);
  const westWall = new T.Group();
  westWall.position.set(-5.2, floorY, 0);
  westWall.rotation.y = Math.PI / 2;
  west.add(westWall);
  wall(westWall, 6.24, 2.81, 0.2, [
    { x: -1.65, width: 1.48, bottom: 0.85, height: 1.65 },
    { x: 1.55, width: 1.48, bottom: 0.85, height: 1.65 },
  ], ivory, 'west');

  const wingFront = assembly('garden-wing-glazed-facade', [0.24, 0.23, 0.68]);
  const wingFrontWall = new T.Group();
  wingFrontWall.position.set(3.38, floorY, 2.48);
  wingFront.add(wingFrontWall);
  wall(wingFrontWall, 4.16, 2.55, 0.18, [
    { x: -0.36, width: 2.96, bottom: 0, height: 2.28 },
  ], frontSurface, 'garden');

  const wingSide = assembly('east-timber-wall', [0.72, 0.22, 0]);
  const wingSideWall = new T.Group();
  wingSideWall.position.set(5.42, floorY, 0.1);
  wingSideWall.rotation.y = Math.PI / 2;
  wingSide.add(wingSideWall);
  wall(wingSideWall, 4.75, 2.55, 0.19, [
    { x: 0.65, width: 1.62, bottom: 0.58, height: 1.7 },
  ], charcoal, 'east');
  const wingBackWall = new T.Group();
  wingBackWall.position.set(3.38, floorY, -2.28);
  back.add(wingBackWall);
  wall(wingBackWall, 4.16, 2.55, 0.2, [
    { x: 0.24, width: 2.56, bottom: 0.78, height: 1.5 },
  ], ivory, 'wing-north');

  // Thin timber battens follow only solid wall sections, leaving the real
  // window clear. Instance them to avoid dozens of extra draw calls.
  const slatGeometry = new T.BoxGeometry(0.068, 2.48, 0.08);
  geometries.add(slatGeometry);
  const slatPositions: number[] = [];
  for (let x = -2.28; x <= 2.28; x += 0.14) {
    if (x < -0.2 || x > 1.5) slatPositions.push(x);
  }
  const slats = new T.InstancedMesh(slatGeometry, timber, slatPositions.length);
  slats.name = 'individual-timber-battens';
  slats.castShadow = true;
  slats.receiveShadow = true;
  const transform = new T.Object3D();
  slatPositions.forEach((x, i) => {
    transform.position.set(x, 1.28, 0.145);
    transform.updateMatrix();
    slats.setMatrixAt(i, transform.matrix);
  });
  wingSideWall.add(slats);

  // Full gable silhouette with a genuine triangular clerestory aperture.
  function gable(parent: THREE.Group, z: number, mat: THREE.Material, name: string) {
    const shape = new T.Shape();
    shape.moveTo(-3.25, 0);
    shape.lineTo(3.25, 0);
    shape.lineTo(0, ridgeY - eavesY);
    shape.closePath();
    const opening = new T.Path();
    opening.moveTo(-1.7, 0.17);
    opening.lineTo(0, 1.13);
    opening.lineTo(1.7, 0.17);
    opening.closePath();
    shape.holes.push(opening);
    mesh(parent, new T.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false }),
      mat, [-1.95, eavesY, z], name, true);
    const triangle = new T.Shape();
    triangle.moveTo(-1.7, 0.17);
    triangle.lineTo(1.7, 0.17);
    triangle.lineTo(0, 1.13);
    triangle.closePath();
    mesh(parent, new T.ShapeGeometry(triangle), glass,
      [-1.95, eavesY, z + 0.08], `${name}-clerestory-glass`);
    const a: XYZ = [-3.65, eavesY + 0.17, z + 0.09];
    const b: XYZ = [-0.25, eavesY + 0.17, z + 0.09];
    const c: XYZ = [-1.95, eavesY + 1.13, z + 0.09];
    beam(parent, a, b, 0.025);
    beam(parent, b, c, 0.025);
    beam(parent, c, a, 0.025);
    beam(parent, [-1.95, eavesY + 0.17, z + 0.09], c, 0.019);
  }
  gable(front, 3.025, frontSurface, 'south-gable-with-open-clerestory');
  gable(back, -3.19, ivory, 'north-gable-with-open-clerestory');

  // Interior partitions keep the rooms legible in all three states.
  const rooms = assembly('interior-room-partitions', [0, 0.23, -0.08]);
  box(rooms, [0.13, 2.35, 2.4], [-2.62, 1.605, -1.85], pale, 'bedroom-partition', true);
  box(rooms, [1.35, 2.35, 0.13], [-4.48, 1.605, -0.62], pale, 'bedroom-return', true);
  box(rooms, [0.13, 0.92, 2.75], [1.23, 0.89, 0.72], pale, 'cutaway-gallery-wall', true);
  box(rooms, [0.13, 2.65, 1.25], [1.23, 1.755, -2.48], ivory, 'kitchen-tall-wall', true);
  box(rooms, [0.1, 0.94, 0.75], [-2.62, 0.9, 0.18], pale, 'low-plan-divider', true);

  // Main roof: two independent sloping planes, standing seams, and a
  // continuous gold truss system. Stage zero is a deliberate white cutaway.
  const roof = assembly('pitched-standing-seam-roof', [-0.32, 1.9, -0.18]);
  const halfSpan = 3.52;
  const rise = 1.87;
  const roofAngle = Math.atan2(rise, halfSpan);
  const slopeLength = Math.hypot(halfSpan, rise);
  for (const side of [-1, 1]) {
    const slope = box(roof, [slopeLength, 0.075, 7.04],
      [-1.95 + side * halfSpan / 2, 4.155, 0], side === 1 ? nearRoof : farRoof,
      side === 1 ? 'cutaway-near-roof-plane' : 'far-roof-plane', true);
    slope.rotation.z = -side * roofAngle;
    for (let z = -3.44; z <= 3.45; z += 0.58) {
      beam(roof, [-1.95, 5.12, z], [-1.95 + side * halfSpan, 3.25, z],
        0.013, softGold, 'standing-roof-seam');
    }
  }
  beam(roof, [-1.95, 5.12, -3.55], [-1.95, 5.12, 3.55], 0.029, gold, 'gable-ridge');
  for (const x of [-5.47, 1.57]) {
    beam(roof, [x, 3.25, -3.55], [x, 3.25, 3.55], 0.024, gold, 'gable-eave');
  }
  for (const z of [-3.52, -1.78, 0, 1.78, 3.52]) {
    beam(roof, [-5.47, 3.25, z], [-1.95, 5.12, z], 0.028, gold, 'gold-roof-truss');
    beam(roof, [-1.95, 5.12, z], [1.57, 3.25, z], 0.028, gold, 'gold-roof-truss');
    beam(roof, [-5.47, 3.25, z], [1.57, 3.25, z], 0.018, softGold, 'truss-tie');
  }

  const flatRoof = assembly('floating-flat-wing-roof', [0.62, 1.18, 0.02]);
  box(flatRoof, [4.55, 0.17, 5.17], [3.47, 3.05, 0.12], wingRoof, 'flat-wing-roof-plane', true);
  box(flatRoof, [4.58, 0.048, 0.065], [3.47, 2.97, 2.72], gold, 'brass-roof-fascia');
  box(flatRoof, [0.065, 0.048, 5.18], [5.73, 2.97, 0.12], gold, 'brass-side-fascia');
  for (let x = 1.45; x <= 5.5; x += 0.52) {
    beam(flatRoof, [x, 3.147, -2.4], [x, 3.147, 2.65], 0.012, softGold, 'wing-roof-seam');
  }

  // Slender front veranda with a timber soffit, not a second heavy box.
  const veranda = assembly('front-veranda', [0, 0.48, 0.24]);
  for (const x of [-5.18, -1.82, 1.34]) {
    box(veranda, [0.085, 2.4, 0.085], [x, 1.58, 4.03], gold, 'veranda-post');
  }
  box(veranda, [6.84, 0.14, 0.12], [-1.93, 2.83, 4.03], timber, 'veranda-front-beam');
  for (let x = -5.25; x < 1.43; x += 0.43) {
    box(veranda, [0.045, 0.085, 0.94], [x, 2.91, 3.63], timber, 'veranda-open-rafter');
  }
  box(veranda, [6.84, 0.06, 0.98], [-1.93, 2.98, 3.65], glass, 'veranda-light-canopy');

  // A few custom furniture silhouettes communicate scale and an inhabited
  // floor plan: low living room, stone island, dining table, and a bedroom.
  const furniture = new T.Group();
  furniture.name = 'furnished-floorplan';
  group.add(furniture);
  box(furniture, [2.15, 0.17, 1.98], [-3.89, 0.545, -1.8], timber, 'bed-plinth');
  box(furniture, [1.98, 0.22, 1.8], [-3.89, 0.74, -1.8], pale, 'bed-linen');
  box(furniture, [2.08, 0.68, 0.12], [-3.89, 0.78, -2.71], upholstery, 'bed-headboard');
  for (const x of [-4.42, -3.42]) {
    box(furniture, [0.8, 0.14, 0.44], [x, 0.92, -2.34], ivory, 'linen-pillow');
  }
  box(furniture, [2.35, 0.035, 2.15], [-0.48, 0.444, 1.32], upholstery, 'living-rug');
  box(furniture, [2.32, 0.31, 0.78], [-0.58, 0.68, 0.48], pale, 'sofa-base');
  box(furniture, [2.32, 0.45, 0.16], [-0.58, 0.99, 0.16], upholstery, 'sofa-back');
  for (const x of [-1.64, 0.48]) {
    box(furniture, [0.19, 0.28, 0.79], [x, 0.98, 0.48], pale, 'sofa-arm');
  }
  mesh(furniture, new T.CylinderGeometry(0.57, 0.57, 0.075, 40),
    limestone, [-0.46, 0.91, 1.65], 'round-stone-coffee-table');
  mesh(furniture, new T.CylinderGeometry(0.27, 0.3, 0.43, 24),
    charcoal, [-0.46, 0.665, 1.65], 'coffee-table-pedestal');
  box(furniture, [1.5, 0.9, 0.7], [-0.23, 0.88, -1.65], timber, 'kitchen-island');
  box(furniture, [1.64, 0.08, 0.8], [-0.23, 1.37, -1.65], pale, 'island-stone-worktop');
  box(furniture, [2.75, 0.9, 0.54], [-0.31, 0.88, -2.7], ivory, 'kitchen-cabinetry');
  box(furniture, [2.82, 0.065, 0.63], [-0.31, 1.365, -2.7], limestone, 'kitchen-counter');
  box(furniture, [0.54, 0.016, 0.33], [0.43, 1.408, -2.68], charcoal, 'inset-hob');
  box(furniture, [1.64, 0.09, 0.93], [3.32, 1.21, -0.11], timber, 'dining-table');
  for (const x of [2.77, 3.87]) {
    for (const z of [-0.43, 0.21]) {
      box(furniture, [0.052, 0.75, 0.052], [x, 0.795, z], charcoal, 'table-leg');
    }
  }
  for (const x of [2.83, 3.82]) {
    for (const z of [-0.93, 0.69]) {
      box(furniture, [0.48, 0.11, 0.45], [x, 0.85, z], darkUpholstery, 'dining-chair-seat');
      box(furniture, [0.49, 0.47, 0.065], [x, 1.12, z + Math.sign(z) * 0.2],
        darkUpholstery, 'dining-chair-back');
      box(furniture, [0.055, 0.39, 0.33], [x - 0.19, 0.63, z], gold, 'chair-frame');
      box(furniture, [0.055, 0.39, 0.33], [x + 0.19, 0.63, z], gold, 'chair-frame');
    }
  }
  // Lit soffit strips supply a restrained warm interior; no colored bloom.
  box(furniture, [2.75, 0.035, 0.045], [-0.31, 2.06, -2.88], warmLight, 'kitchen-warm-strip');
  const interiorLight = new T.PointLight('#ffd7a1', 4.2, 7, 2);
  interiorLight.position.set(2.4, 2.15, 0.3);
  interiorLight.name = 'warm-interior-light';
  group.add(interiorLight);

  // Neutral, sculptural landscaping: raked gravel, limestone stones, and
  // staggered pavers. It is deliberately not green vegetation.
  const landscaping = new T.Group();
  landscaping.name = 'neutral-stone-landscaping';
  group.add(landscaping);
  box(landscaping, [0.62, 0.16, 6.9], [5.52, 0.275, 0.55], concrete, 'gravel-garden-bed');
  const stoneGeometry = new T.IcosahedronGeometry(1, 1);
  geometries.add(stoneGeometry);
  [
    [5.52, 0.43, -2.28, 0.26, 0.25, 0.43],
    [5.52, 0.39, -1.34, 0.2, 0.18, 0.28],
    [5.51, 0.48, 0.18, 0.27, 0.31, 0.48],
    [5.53, 0.42, 1.36, 0.23, 0.22, 0.31],
    [4.94, 0.38, 4.04, 0.49, 0.2, 0.29],
    [4.22, 0.4, 4.04, 0.32, 0.23, 0.24],
  ].forEach(([x, y, z, sx, sy, sz], i) => {
    const stone = mesh(landscaping, stoneGeometry, i % 2 ? limestone : ivory,
      [x, y, z], 'sculptural-limestone');
    stone.scale.set(sx, sy, sz);
    stone.rotation.set(0.13 * i, 0.83 * i, 0.14 * i);
  });
  for (let i = 0; i < 4; i++) {
    box(landscaping, [0.72, 0.045, 0.87], [1.84 + i * 0.9, 0.22, 3.83],
      pale, 'garden-paving-stone');
  }

  // Contact darkening: a small procedural alpha texture, never read back.
  const resolution = 96;
  const pixels = new Uint8Array(resolution * resolution * 4);
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const dx = (x / (resolution - 1) - 0.5) * 2;
      const dy = (y / (resolution - 1) - 0.5) * 2;
      const distance = Math.pow(Math.abs(dx), 4) + Math.pow(Math.abs(dy), 4);
      const i = (y * resolution + x) * 4;
      pixels[i] = 12;
      pixels[i + 1] = 11;
      pixels[i + 2] = 9;
      pixels[i + 3] = Math.round(Math.exp(-distance * 6) * 155);
    }
  }
  const contactTexture = new T.DataTexture(pixels, resolution, resolution, T.RGBAFormat);
  contactTexture.needsUpdate = true;
  contactTexture.magFilter = T.LinearFilter;
  contactTexture.minFilter = T.LinearFilter;
  textures.add(contactTexture);
  const contactMaterial = new T.MeshBasicMaterial({
    map: contactTexture, transparent: true, depthWrite: false, opacity: 0.8,
  });
  materials.add(contactMaterial);
  const contact = mesh(group, new T.PlaneGeometry(16.1, 12.7), contactMaterial,
    [0, -0.118, 0.45], 'soft-contact-shadow');
  contact.rotation.x = -Math.PI / 2;
  contact.castShadow = false;
  contact.receiveShadow = false;

  // CAD ground: fine lines, measured extents, and a handful of markers.
  const grid = new T.Group();
  grid.name = 'cad-survey-grid';
  group.add(grid);
  const gridVertices: number[] = [];
  for (let i = -10; i <= 10; i++) {
    const p = i * 0.8;
    gridVertices.push(-8, -0.153, p, 8, -0.153, p);
    gridVertices.push(p, -0.153, -8, p, -0.153, 8);
  }
  function lineSegments(vertices: number[], color: string, opacity: number, name: string) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    geometries.add(geometry);
    const mat = new T.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    materials.add(mat);
    const lines = new T.LineSegments(geometry, mat);
    lines.name = name;
    grid.add(lines);
    return lines;
  }
  lineSegments(gridVertices, '#95846a', 0.115, 'fine-cad-ground-grid');
  const dims = [
    -6.16, -0.145, 5.42, 6.16, -0.145, 5.42,
    -6.65, -0.145, -4, -6.65, -0.145, 4.75,
  ];
  for (const x of [-6.16, -1.95, 1.4, 6.16]) {
    dims.push(x, -0.145, 5.15, x, -0.145, 5.7);
    dims.push(x - 0.09, -0.144, 5.33, x + 0.09, -0.144, 5.51);
  }
  for (const z of [-4, 0, 4.75]) {
    dims.push(-6.9, -0.145, z, -6.4, -0.145, z);
  }
  lineSegments(dims, '#c3a46a', 0.67, 'gold-dimension-lines-and-ticks');
  const pointsGeometry = new T.BufferGeometry();
  pointsGeometry.setAttribute('position', new T.Float32BufferAttribute([
    -6.16, -0.13, 5.42, 6.16, -0.13, 5.42, -6.65, -0.13, -4,
    -6.65, -0.13, 4.75, 6.4, -0.13, -4.2, -1.95, -0.13, -4.2,
  ], 3));
  geometries.add(pointsGeometry);
  const pointMaterial = new T.PointsMaterial({
    color: '#d8be8b', size: 2.6, sizeAttenuation: false, transparent: true, opacity: 0.8,
  });
  materials.add(pointMaterial);
  const points = new T.Points(pointsGeometry, pointMaterial);
  points.name = 'sparse-survey-markers';
  grid.add(points);

  // Fading is local to cutaway surfaces. The house, foundation, furniture,
  // trusses, and room divisions never disappear in a scene-wide transition.
  function opacity(mat: THREE.MeshStandardMaterial, value: number) {
    const transparent = value < 0.995;
    if (mat.transparent !== transparent) {
      mat.transparent = transparent;
      mat.needsUpdate = true;
    }
    mat.opacity = value;
    mat.depthWrite = !transparent;
  }
  function apply(explosion: number, finish: number) {
    for (const item of moving) item.object.position.copy(item.offset).multiplyScalar(explosion);
    opacity(frontSurface, clamp(0.37 + finish * 0.63 + explosion * 0.15, 0, 1));
    opacity(nearRoof, clamp(0.055 + finish * 0.945 + explosion * 0.25, 0, 1));
    opacity(farRoof, clamp(0.84 + finish * 0.16 - explosion * 0.17, 0, 1));
    opacity(wingRoof, clamp(0.12 + finish * 0.88 + explosion * 0.3, 0, 1));
    nearRoof.color.copy(colorIvory).lerp(colorRoof, finish);
    farRoof.color.copy(colorIvory).lerp(colorRoof, finish);
    wingRoof.color.copy(colorIvory).lerp(colorRoof, finish);
    timber.color.copy(colorConceptTimber).lerp(colorTimber, finish);
    edgeMaterial.opacity = mix(0.72, 0.27, finish);
    glass.opacity = mix(0.1, 0.23, finish);
    interiorLight.intensity = mix(2.4, 4.5, finish);
    warmLight.emissiveIntensity = mix(0.6, 1.15, finish);
    // A restrained finish detail, not a scale-from-zero scene reveal.
    landscaping.position.y = mix(-0.045, 0, finish);
    group.updateMatrixWorld(true);
  }
  apply(0, 0);
  return {
    group, apply,
    dispose() {
      group.traverse(object => {
        if ((object as THREE.InstancedMesh).isInstancedMesh) (object as THREE.InstancedMesh).dispose();
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(mat => mat.dispose());
      textures.forEach(texture => texture.dispose());
      group.clear();
    },
  };
}

/**
 * Registers accessible controls immediately, then builds/render lazily.
 * Idempotent per root. The returned cleanup can safely be called more than once.
 */
export function initArchitecture(root: HTMLElement): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !root) return () => {};
  const existing = instances.get(root);
  if (existing) return existing;
  const host = root.querySelector<HTMLElement>('[data-architecture-canvas]');
  if (!host) return () => {};
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-architecture-stage]'))
    .filter(button => /^[012]$/.test(button.dataset.architectureStage ?? ''));
  const caption = root.querySelector<HTMLElement>('[data-architecture-caption]');
  const reset = root.querySelector<HTMLButtonElement>('[data-architecture-reset]');
  const abort = new AbortController();
  const { signal } = abort;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileQuery = window.matchMedia('(max-width: 700px)');
  let reduced = motionQuery.matches;
  let disposed = false;
  let visible = false;
  let loading = false;
  let failed = false;
  let ready = false;
  let selected: Stage = 0;
  let renderer: THREE.WebGLRenderer | undefined;
  let scene: THREE.Scene | undefined;
  let camera: THREE.OrthographicCamera | undefined;
  let model: Model | undefined;
  let ground: THREE.Mesh | undefined;
  let sun: THREE.DirectionalLight | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let intersectionObserver: IntersectionObserver | undefined;
  let frame = 0;
  let previousTime = 0;
  let viewportWidth = 1120;
  let viewportHeight = 560;
  let explosion = 0;
  let finish = 0;
  let yaw = 0;
  let targetYaw = 0;
  let transition: {
    fromExplosion: number; fromFinish: number; toExplosion: number; toFinish: number; elapsed: number;
  } | undefined;
  let drag: { id: number; x: number; y: number; yaw: number; touch: boolean; locked: boolean } | undefined;
  const initialState = root.getAttribute('data-architecture-state');
  const initialStage = root.getAttribute('data-architecture-active-stage');
  const originalTouchAction = host.style.touchAction;

  root.dataset.architectureState = 'idle';
  host.style.touchAction = 'pan-y pinch-zoom';
  if (caption) {
    caption.setAttribute('aria-live', 'polite');
    caption.setAttribute('aria-atomic', 'true');
  }
  for (const button of buttons) button.type = 'button';
  if (reset) reset.type = 'button';

  function updateControls() {
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.architectureStage) === selected));
    }
    root.dataset.architectureActiveStage = String(selected);
    if (caption) caption.textContent = failed
      ? `${STAGES[selected].title}. Interactive 3D is unavailable on this device. The architectural concept image is shown instead.`
      : STAGES[selected].caption;
    if (renderer) {
      renderer.domElement.setAttribute('aria-label',
        `${STAGES[selected].caption} Architectural concept, not a completed project. Drag horizontally or use the left and right arrow keys to rotate.`);
    }
  }

  function canRender() {
    return !disposed && !failed && visible && document.visibilityState !== 'hidden' &&
      !!renderer && !!model && !!camera && !!scene;
  }
  function stop() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  }
  function invalidate() {
    if (canRender() && !frame) frame = window.requestAnimationFrame(tick);
  }
  function showFallback() {
    failed = true;
    ready = false;
    stop();
    root.dataset.architectureState = 'fallback';
    if (renderer) renderer.domElement.style.visibility = 'hidden';
    updateControls();
  }

  function tick(time: number) {
    frame = 0;
    if (!canRender()) return;
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 1 / 60;
    previousTime = time;
    if (transition) {
      transition.elapsed += delta;
      const progress = reduced ? 1 : Math.min(transition.elapsed / 1.16, 1);
      const eased = progress * progress * (3 - 2 * progress);
      explosion = mix(transition.fromExplosion, transition.toExplosion, eased);
      finish = mix(transition.fromFinish, transition.toFinish, eased);
      if (progress === 1) transition = undefined;
    }
    yaw = reduced || drag ? targetYaw : mix(yaw, targetYaw, 1 - Math.exp(-delta * 12));
    if (Math.abs(yaw - targetYaw) < 0.0004) yaw = targetYaw;
    model!.apply(explosion, finish);
    model!.group.rotation.y = yaw;
    frameArchitectureCamera(camera!, viewportWidth, viewportHeight, explosion);
    try {
      renderer!.render(scene!, camera!);
      if (!ready) {
        ready = true;
        root.dataset.architectureState = 'ready';
      }
    } catch {
      showFallback();
      return;
    }
    if (transition || yaw !== targetYaw) invalidate();
    else previousTime = 0;
  }

  function chooseStage(stage: Stage, resetting = false) {
    selected = stage;
    const target = STAGES[stage];
    if (resetting) targetYaw = 0;
    if (reduced || !model) {
      explosion = target.explosion;
      finish = target.finish;
      transition = undefined;
      if (reduced) yaw = targetYaw;
      model?.apply(explosion, finish);
    } else {
      transition = {
        fromExplosion: explosion, fromFinish: finish,
        toExplosion: target.explosion, toFinish: target.finish, elapsed: 0,
      };
    }
    updateControls();
    invalidate();
  }
  function endDrag(event?: PointerEvent) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const canvas = renderer?.domElement;
    if (canvas?.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
    drag = undefined;
    root.removeAttribute('data-architecture-dragging');
  }

  function bindCanvas(canvas: HTMLCanvasElement) {
    canvas.className = 'architecture-webgl';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.style.touchAction = 'pan-y pinch-zoom';
    canvas.addEventListener('pointerdown', event => {
      if (!event.isPrimary) { endDrag(); return; }
      if (event.button !== 0 || failed) return;
      const touch = event.pointerType === 'touch';
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: targetYaw, touch, locked: !touch };
      if (!touch) {
        canvas.setPointerCapture(event.pointerId);
        root.dataset.architectureDragging = 'true';
      }
    }, { signal });
    canvas.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      if (!drag.touch && event.buttons === 0) { endDrag(event); return; }
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.locked) {
        // Vertical gestures and pinch zoom remain entirely browser-owned.
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { endDrag(event); return; }
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
        drag.locked = true;
        canvas.setPointerCapture(event.pointerId);
        root.dataset.architectureDragging = 'true';
      }
      targetYaw = clamp(drag.yaw + dx * 0.0045, -0.72, 0.72);
      yaw = targetYaw;
      invalidate();
    }, { signal, passive: true });
    canvas.addEventListener('pointerup', endDrag, { signal });
    canvas.addEventListener('pointercancel', endDrag, { signal });
    canvas.addEventListener('lostpointercapture', endDrag, { signal });
    canvas.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        targetYaw = clamp(targetYaw + (event.key === 'ArrowLeft' ? -0.12 : 0.12), -0.72, 0.72);
        invalidate();
      } else if (event.key.toLowerCase() === 'r' || event.key === 'Home') {
        event.preventDefault();
        chooseStage(0, true);
      }
    }, { signal });
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      showFallback();
    }, { signal });
  }

  function resize() {
    if (!renderer || !camera || disposed || failed) return;
    const bounds = host!.getBoundingClientRect();
    const width = Math.round(bounds.width);
    const height = Math.round(bounds.height);
    if (width < 1 || height < 1) return;
    viewportWidth = width;
    viewportHeight = height;
    frameArchitectureCamera(camera, width, height, explosion);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobileQuery.matches ? 1 : 1.5));
    renderer.setSize(width, height, false);
    invalidate();
  }

  async function start() {
    if (disposed || failed || loading || renderer || !visible || document.visibilityState === 'hidden') return;
    loading = true;
    root.dataset.architectureState = 'loading';
    try {
      const T = await import('three');
      if (disposed) return;
      if (!visible || document.visibilityState === 'hidden') {
        root.dataset.architectureState = 'idle';
        return;
      }
      renderer = new T.WebGLRenderer({
        alpha: true, antialias: true, powerPreference: 'low-power', stencil: false,
      });
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setClearColor('#191a18', 0);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      scene = new T.Scene();
      camera = new T.OrthographicCamera(-10, 10, 6, -6, 0.1, 100);
      // Forty-five-degree azimuth; framing remains isometric in every stage.
      frameArchitectureCamera(camera, viewportWidth, viewportHeight, explosion);
      const ambient = new T.HemisphereLight('#fff4e1', '#787064', 2.5);
      scene.add(ambient);
      sun = new T.DirectionalLight('#fff1d9', 3.4);
      sun.position.set(-4, 11, 8);
      sun.castShadow = true;
      sun.shadow.mapSize.set(mobileQuery.matches ? 1024 : 1536, mobileQuery.matches ? 1024 : 1536);
      sun.shadow.camera.left = -11;
      sun.shadow.camera.right = 11;
      sun.shadow.camera.top = 11;
      sun.shadow.camera.bottom = -11;
      sun.shadow.camera.near = 0.5;
      sun.shadow.camera.far = 35;
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.035;
      sun.shadow.radius = 4;
      scene.add(sun);
      const fill = new T.DirectionalLight('#ded6c7', 1.1);
      fill.position.set(8, 6, -6);
      scene.add(fill);
      ground = new T.Mesh(
        new T.PlaneGeometry(200, 200),
        new T.ShadowMaterial({ color: '#080705', opacity: 0.24 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.17;
      ground.receiveShadow = true;
      ground.name = 'shadow-catcher';
      scene.add(ground);
      model = buildArchitectureModel(T);
      model.apply(explosion, finish);
      scene.add(model.group);
      bindCanvas(renderer.domElement);
      host!.appendChild(renderer.domElement);
      updateControls();
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host!);
      }
      resize();
      invalidate();
    } catch {
      if (!disposed) showFallback();
    } finally {
      loading = false;
    }
  }

  for (const button of buttons) {
    button.addEventListener('click', () => chooseStage(Number(button.dataset.architectureStage) as Stage), { signal });
    button.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      let next: number | undefined;
      const current = Number(button.dataset.architectureStage);
      if (event.key === 'ArrowRight') next = (current + 1) % 3;
      if (event.key === 'ArrowLeft') next = (current + 2) % 3;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = 2;
      if (next === undefined) return;
      event.preventDefault();
      chooseStage(next as Stage);
      buttons.find(item => Number(item.dataset.architectureStage) === next)?.focus();
    }, { signal });
  }
  reset?.addEventListener('click', () => { endDrag(); chooseStage(0, true); }, { signal });
  motionQuery.addEventListener('change', () => {
    reduced = motionQuery.matches;
    if (reduced) chooseStage(selected);
  }, { signal });
  mobileQuery.addEventListener('change', resize, { signal });
  window.addEventListener('resize', resize, { signal, passive: true });
  window.addEventListener('blur', () => endDrag(), { signal });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { endDrag(); stop(); }
    else { void start(); invalidate(); }
  }, { signal });
  updateControls();
  if (typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver(entries => {
      const entry = entries[entries.length - 1];
      visible = entry.isIntersecting && entry.intersectionRatio > 0;
      if (visible) { void start(); invalidate(); }
      else { endDrag(); stop(); }
    }, { threshold: 0, rootMargin: '0px' });
    intersectionObserver.observe(host);
  } else {
    visible = true;
    void start();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    endDrag();
    stop();
    abort.abort();
    intersectionObserver?.disconnect();
    resizeObserver?.disconnect();
    model?.dispose();
    if (ground) {
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
    }
    sun?.shadow.dispose();
    if (renderer) {
      renderer.domElement.remove();
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    }
    scene?.clear();
    host!.style.touchAction = originalTouchAction;
    if (initialState === null) root.removeAttribute('data-architecture-state');
    else root.setAttribute('data-architecture-state', initialState);
    if (initialStage === null) root.removeAttribute('data-architecture-active-stage');
    else root.setAttribute('data-architecture-active-stage', initialStage);
    root.removeAttribute('data-architecture-dragging');
    instances.delete(root);
  }
  instances.set(root, dispose);
  return dispose;
}
