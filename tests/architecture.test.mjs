/**
 * Run: node --test tests/architecture.test.mjs
 * Procedural geometry + lifecycle checks; intentionally no browser dependency.
 * The page's visual QA should still inspect all stages at desktop/mobile widths.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setMaxListeners } from 'node:events';
import { transformSync } from 'esbuild';
import * as THREE from 'three';

setMaxListeners(0);
const source = readFileSync(new URL('../src/scripts/architecture.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/architecture.css', import.meta.url), 'utf8');
const compiled = transformSync(
  source.replace("import '../styles/architecture.css';", '') +
    '\nexport { buildArchitectureModel, frameArchitectureCamera, STAGES };',
  { loader: 'ts', format: 'cjs', target: 'es2020', supported: { 'dynamic-import': false } },
).code;

function load(three = THREE) {
  const module = { exports: {} };
  new Function('module', 'exports', 'require', compiled)(module, module.exports, name => {
    assert.equal(name, 'three');
    return three;
  });
  return module.exports;
}

test('a complete, finite, dimensional house exists in stage zero', () => {
  const { buildArchitectureModel } = load();
  const model = buildArchitectureModel(THREE);
  let meshes = 0;
  let triangles = 0;
  model.group.traverse(object => {
    if (!object.isMesh) return;
    meshes++;
    const position = object.geometry.getAttribute('position');
    for (const value of position.array) assert.ok(Number.isFinite(value), `${object.name}: finite geometry`);
    triangles += (object.geometry.index?.count ?? position.count) / 3 * (object.count ?? 1);
    const p = object.geometry.parameters;
    if (object.geometry.type === 'BoxGeometry') {
      assert.ok(p.width > 0 && p.height > 0 && p.depth > 0);
      assert.ok(!(p.width > 3 && p.height > 2 && p.depth > 3), 'no opaque room-sized box');
    }
  });
  assert.ok(meshes > 100, 'detailed architectural geometry, not a starter cube');
  assert.ok(triangles < 30000, `geometry budget: ${triangles}`);
  for (const name of [
    'main-floor-slab', 'wing-floor-slab', 'pitched-standing-seam-roof',
    'floating-flat-wing-roof', 'furnished-floorplan', 'interior-room-partitions',
    'individual-timber-battens', 'gold-dimension-lines-and-ticks', 'sparse-survey-markers',
  ]) assert.ok(model.group.getObjectByName(name), name);
  assert.ok(model.group.getObjectByName('far-roof-plane').material.opacity >= 0.8);
  assert.ok(model.group.getObjectByName('cutaway-near-roof-plane').material.opacity < 0.1);
  assert.ok(model.group.getObjectByName('gold-roof-truss').visible);
  console.log(`Architecture geometry: ${meshes} meshes; ${triangles} triangles, including instances.`);
  model.dispose();
});

test('doors, windows, and gable clerestories are actual openings', () => {
  const model = load().buildArchitectureModel(THREE);
  let apertures = 0;
  model.group.traverse(object => {
    for (const opening of object.userData.openings ?? []) {
      apertures++;
      const center = new THREE.Vector3(opening.x, opening.bottom + opening.height / 2, 0);
      for (const child of object.children.filter(item => item.name.endsWith('pier-or-lintel'))) {
        child.geometry.computeBoundingBox();
        const bounds = child.geometry.boundingBox.clone().translate(child.position);
        assert.equal(bounds.containsPoint(center), false, `opening unobstructed in ${child.name}`);
      }
    }
  });
  assert.equal(apertures, 9);
  for (const name of ['south-gable-with-open-clerestory', 'north-gable-with-open-clerestory']) {
    const mesh = model.group.getObjectByName(name);
    assert.equal(mesh.geometry.parameters.shapes.holes.length, 1);
  }
  model.dispose();
});

test('exploded stage is spatially separated, finished stage fully reassembles', () => {
  const model = load().buildArchitectureModel(THREE);
  const floor = model.group.getObjectByName('main-floor-slab');
  const initialFloor = floor.getWorldPosition(new THREE.Vector3());
  model.apply(1, 0.12);
  assert.equal(model.group.getObjectByName('pitched-standing-seam-roof').position.y, 1.9);
  assert.ok(model.group.getObjectByName('south-glazed-gable-facade').position.z > 0.8);
  assert.ok(model.group.getObjectByName('east-timber-wall').position.x > 0.7);
  assert.deepEqual(floor.getWorldPosition(new THREE.Vector3()), initialFloor);
  model.apply(0, 1);
  for (const name of [
    'pitched-standing-seam-roof', 'south-glazed-gable-facade', 'east-timber-wall',
    'floating-flat-wing-roof', 'interior-room-partitions',
  ]) assert.equal(model.group.getObjectByName(name).position.length(), 0);
  assert.equal(model.group.getObjectByName('cutaway-near-roof-plane').material.opacity, 1);
  assert.equal(model.group.getObjectByName('flat-wing-roof-plane').material.opacity, 1);
  assert.equal(model.group.getObjectByName('cutaway-near-roof-plane').material.transparent, false);
  model.dispose();
});

test('warm neutral materials only; no green or blue house materials', () => {
  const model = load().buildArchitectureModel(THREE);
  for (const [explosion, finish] of [[0, 0], [1, 0.12], [0, 1]]) {
    model.apply(explosion, finish);
    model.group.traverse(object => {
      const color = object.material?.color;
      if (color) {
        assert.ok(color.r + 0.001 >= color.g, `${object.name} is not green`);
        assert.ok(color.g + 0.001 >= color.b, `${object.name} is not blue`);
      }
    });
  }
  model.dispose();
});

test('roof and plinth fit desktop/mobile cameras at all stages and rotation limits', () => {
  const { buildArchitectureModel, frameArchitectureCamera } = load();
  const model = buildArchitectureModel(THREE);
  for (const [width, height] of [[1120, 560], [720, 560], [375, 400]]) {
    const camera = new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 100);
    for (const [explosion, finish] of [[0, 0], [1, 0.12], [0, 1]]) {
      frameArchitectureCamera(camera, width, height, explosion);
      camera.updateMatrixWorld();
      for (const yaw of [-0.72, 0, 0.72]) {
        model.apply(explosion, finish);
        model.group.rotation.y = yaw;
        model.group.updateMatrixWorld(true);
        model.group.traverse(object => {
          if (!object.isMesh || object.name === 'soft-contact-shadow') return;
          const points = object.geometry.getAttribute('position');
          const vertex = new THREE.Vector3();
          for (let i = 0; i < points.count; i++) {
            vertex.fromBufferAttribute(points, i).applyMatrix4(object.matrixWorld).project(camera);
            assert.ok(Math.abs(vertex.x) < 0.98 && Math.abs(vertex.y) < 0.98,
              `${object.name} fits ${width}x${height} / stage ${explosion},${finish} / yaw ${yaw}: ${vertex.x},${vertex.y}`);
          }
        });
      }
    }
  }
  model.dispose();
});

test('all owned geometries, materials, and textures are disposed exactly once', () => {
  const model = load().buildArchitectureModel(THREE);
  const resources = new Set();
  model.group.traverse(object => {
    if (object.isInstancedMesh) resources.add(object);
    if (object.geometry) resources.add(object.geometry);
    if (object.material) {
      resources.add(object.material);
      if (object.material.map) resources.add(object.material.map);
    }
  });
  const counts = new Map();
  resources.forEach(resource => resource.addEventListener('dispose', () =>
    counts.set(resource, (counts.get(resource) ?? 0) + 1)));
  model.dispose();
  for (const resource of resources) assert.equal(counts.get(resource), 1);
  assert.equal(model.group.children.length, 0);
});

class Element extends EventTarget {
  attributes = new Map();
  style = { touchAction: '' };
  children = [];
  captures = new Set();
  dataset = new Proxy({}, {
    get: (_, key) => this.attributes.get(`data-${String(key).replace(/[A-Z]/g, x => `-${x.toLowerCase()}`)}`),
    set: (_, key, value) => {
      this.setAttribute(`data-${String(key).replace(/[A-Z]/g, x => `-${x.toLowerCase()}`)}`, value);
      return true;
    },
  });
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  appendChild(element) { this.children.push(element); element.parent = this; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  getBoundingClientRect() { return { width: 1120, height: 560 }; }
  focus() { this.focused = true; }
  setPointerCapture(id) { this.captures.add(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
}

function event(target, type, details = {}) {
  const e = new Event(type, { cancelable: true });
  Object.assign(e, details);
  target.dispatchEvent(e);
  return e;
}

function harness({ reduced = false, mobile = false, fail = false } = {}) {
  const oldGlobals = Object.fromEntries(['window', 'document', 'IntersectionObserver', 'ResizeObserver']
    .map(key => [key, globalThis[key]]));
  const root = new Element();
  const host = new Element();
  const caption = new Element();
  const reset = new Element();
  const buttons = [0, 1, 2].map(stage => {
    const button = new Element();
    button.dataset.architectureStage = String(stage);
    return button;
  });
  root.querySelector = selector => ({
    '[data-architecture-canvas]': host,
    '[data-architecture-caption]': caption,
    '[data-architecture-reset]': reset,
  })[selector];
  root.querySelectorAll = () => buttons;
  const motionQuery = Object.assign(new EventTarget(), { matches: reduced });
  const mobileQuery = Object.assign(new EventTarget(), { matches: mobile });
  const win = Object.assign(new EventTarget(), {
    devicePixelRatio: 3,
    matchMedia: query => query.includes('reduced') ? motionQuery : mobileQuery,
  });
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const callbacks = new Map();
  let id = 0;
  let time = 1;
  win.requestAnimationFrame = callback => { callbacks.set(++id, callback); return id; };
  win.cancelAnimationFrame = id => callbacks.delete(id);
  const observers = [];
  class Intersection {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
    enter(visible) { this.callback([{ isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }]); }
  }
  class Resize {
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  const renderers = [];
  class Renderer {
    domElement = new Element();
    shadowMap = {};
    renderLists = { dispose() {} };
    renders = 0;
    constructor() { if (fail) throw new Error('No WebGL'); renderers.push(this); }
    setClearColor() {}
    setPixelRatio(ratio) { this.pixelRatio = ratio; }
    setSize(w, h) { this.size = [w, h]; }
    render(scene, camera) { this.renders++; this.scene = scene; this.camera = camera; }
    dispose() { this.disposed = true; }
    forceContextLoss() { this.contextReleased = true; }
  }
  Object.assign(globalThis, { window: win, document: doc, IntersectionObserver: Intersection, ResizeObserver: Resize });
  const module = load({ ...THREE, WebGLRenderer: Renderer });
  return {
    ...module, root, host, caption, reset, buttons, renderers, observers,
    win, doc, motionQuery, mobileQuery, callbacks,
    async settle() { await new Promise(resolve => setImmediate(resolve)); },
    flush(count = 120) {
      for (let i = 0; callbacks.size && i < count; i++) {
        const pending = [...callbacks.values()];
        callbacks.clear();
        time += 16.667;
        pending.forEach(callback => callback(time));
      }
    },
    restore() {
      for (const [key, value] of Object.entries(oldGlobals)) {
        if (value === undefined) delete globalThis[key];
        else globalThis[key] = value;
      }
    },
  };
}

test('initialization is lazy, idempotent, on-demand, paused offscreen, and disposable', async () => {
  const h = harness();
  const dispose = h.initArchitecture(h.root);
  try {
    assert.equal(h.initArchitecture(h.root), dispose);
    assert.equal(h.renderers.length, 0);
    assert.equal(h.buttons[0].getAttribute('aria-pressed'), 'true');
    assert.equal(h.caption.getAttribute('aria-live'), 'polite');
    h.observers[0].enter(true);
    await h.settle();
    h.flush();
    assert.equal(h.renderers.length, 1);
    const renderer = h.renderers[0];
    assert.equal(renderer.pixelRatio, 1.5);
    assert.equal(h.root.dataset.architectureState, 'ready');
    assert.equal(h.callbacks.size, 0, 'no perpetual animation loop or auto-spin');
    event(h.buttons[1], 'click');
    h.flush(5);
    h.observers[0].enter(false);
    const pausedCount = renderer.renders;
    h.flush();
    assert.equal(renderer.renders, pausedCount);
    h.observers[0].enter(true);
    h.flush();
    assert.equal(renderer.scene.getObjectByName('pitched-standing-seam-roof').position.y, 1.9);
    event(h.buttons[2], 'click');
    h.doc.visibilityState = 'hidden';
    event(h.doc, 'visibilitychange');
    assert.equal(h.callbacks.size, 0);
    h.doc.visibilityState = 'visible';
    event(h.doc, 'visibilitychange');
    h.flush();
    assert.equal(h.buttons[2].getAttribute('aria-pressed'), 'true');
    event(h.reset, 'click');
    h.flush();
    assert.equal(h.buttons[0].getAttribute('aria-pressed'), 'true');
    dispose();
    dispose();
    assert.equal(h.host.children.length, 0);
    assert.ok(renderer.disposed && renderer.contextReleased);
    assert.ok(h.observers[0].disconnected);
    assert.equal(h.callbacks.size, 0);
    event(h.buttons[2], 'click');
    assert.equal(h.callbacks.size, 0, 'listeners removed after disposal');
  } finally { dispose(); h.restore(); }
});

test('reduced motion uses immediate stages; mobile DPR stays at one', async () => {
  const h = harness({ reduced: true, mobile: true });
  const dispose = h.initArchitecture(h.root);
  try {
    h.observers[0].enter(true);
    await h.settle();
    h.flush();
    event(h.buttons[1], 'click');
    h.flush(1);
    const renderer = h.renderers[0];
    assert.equal(renderer.pixelRatio, 1);
    assert.equal(renderer.scene.getObjectByName('pitched-standing-seam-roof').position.y, 1.9);
    assert.equal(h.callbacks.size, 0);
    const key = event(h.buttons[1], 'keydown', { key: 'ArrowRight' });
    assert.ok(key.defaultPrevented);
    h.flush(1);
    assert.equal(h.buttons[2].getAttribute('aria-pressed'), 'true');
    assert.ok(h.buttons[2].focused);
  } finally { dispose(); h.restore(); }
});

test('hover does not rotate; horizontal drag rotates; vertical touch remains page scroll', async () => {
  const h = harness();
  const dispose = h.initArchitecture(h.root);
  try {
    h.observers[0].enter(true);
    await h.settle();
    h.flush();
    const renderer = h.renderers[0];
    const canvas = renderer.domElement;
    const model = renderer.scene.getObjectByName('apex-architectural-study');
    event(canvas, 'pointermove', { pointerId: 1, clientX: 120, clientY: 30, buttons: 0 });
    h.flush();
    assert.equal(model.rotation.y, 0);
    const touch = { pointerId: 1, isPrimary: true, button: 0, pointerType: 'touch', clientX: 20, clientY: 20 };
    event(canvas, 'pointerdown', touch);
    const vertical = event(canvas, 'pointermove', { ...touch, clientX: 22, clientY: 90, buttons: 1 });
    h.flush();
    assert.equal(model.rotation.y, 0);
    assert.equal(vertical.defaultPrevented, false);
    assert.equal(canvas.captures.size, 0);
    event(canvas, 'pointerdown', touch);
    event(canvas, 'pointermove', { ...touch, clientX: 120, clientY: 23, buttons: 1 });
    h.flush();
    assert.ok(model.rotation.y > 0.4);
    event(canvas, 'pointerup', touch);
    const previous = model.rotation.y;
    event(canvas, 'pointermove', { ...touch, clientX: 220, clientY: 23, buttons: 0 });
    h.flush();
    assert.equal(model.rotation.y, previous);
    assert.equal(event(canvas, 'wheel', { deltaY: 120 }).defaultPrevented, false);
    assert.equal(canvas.style.touchAction, 'pan-y pinch-zoom');
  } finally { dispose(); h.restore(); }
});

test('WebGL failure keeps fallback and truthful accessible caption', async () => {
  const h = harness({ fail: true });
  const dispose = h.initArchitecture(h.root);
  try {
    h.observers[0].enter(true);
    await h.settle();
    assert.equal(h.root.dataset.architectureState, 'fallback');
    assert.match(h.caption.textContent, /unavailable.*concept image/i);
    event(h.buttons[1], 'click');
    assert.match(h.caption.textContent, /^Open the possibilities.*unavailable/i);
    assert.equal(h.callbacks.size, 0);
  } finally { dispose(); h.restore(); }
});

test('context loss and disposal during lazy import are safe', async () => {
  const h = harness();
  let dispose = h.initArchitecture(h.root);
  try {
    h.observers[0].enter(true);
    dispose();
    await h.settle();
    assert.equal(h.renderers.length, 0);
    dispose = h.initArchitecture(h.root);
    h.observers[1].enter(true);
    await h.settle();
    h.flush();
    event(h.renderers[0].domElement, 'webglcontextlost');
    assert.equal(h.root.dataset.architectureState, 'fallback');
    assert.equal(h.callbacks.size, 0);
  } finally { dispose(); h.restore(); }
});

test('scoped styling reserves desktop/mobile size and never fades the whole scene', () => {
  assert.match(css, /height:\s*560px/);
  assert.match(css, /height:\s*400px/);
  assert.match(css, /pan-y pinch-zoom/);
  assert.match(css, /\[data-architecture-state='ready'\] \.architecture-fallback/);
  assert.doesNotMatch(source, /OrbitControls|setInterval|TextureLoader|GLTFLoader|localStorage|fetch\(/);
  assert.doesNotMatch(source, /addEventListener\(['"](?:wheel|touchmove)['"]/);
});
