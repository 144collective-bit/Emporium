/*
 * What a frame draws, draw by draw (`window.__draws()` under ?fps; docs/phone-far-plan.md Phase 1): one frame drawn with
 * the renderer's draw (`renderBufferDirect`, every draw call three makes goes through it) watched, each draw put down to
 * what made it (its mesh's name, or its nearest named parent's), the pass it's in and how far off it is. Its own chunk,
 * loaded only with ?fps (index.ts), so the start-up code doesn't carry it. For finding what to draw in fewer calls, not
 * for the game. Tested in tests/drawrows.test.ts.
 */
import * as THREE from 'three';

/** Which of the frame's passes a draw is in */
export type DrawPass = 'main' | 'outline' | 'shadow' | 'post';

/** What made a set of draws, in one pass */
export interface DrawRow {
  /** The mesh's name, or its nearest named parent's (`?` and its material when nothing up the tree has one) */
  what: string;
  pass: DrawPass;
  draws: number;
  /** Separate meshes (a batch or an instanced mesh is one) */
  meshes: number;
  /** The nearest of them to the camera, in metres (from its bounding sphere's centre) */
  near: number;
  /** Where the first of them stands (x, z), for finding it */
  at: [number, number];
}

export interface DrawBreakdown {
  /** Every draw of the frame (what three draws: an instanced mesh with none to show, or a batch with nothing in view, is none) */
  total: number;
  /** The renderer's own count of the frame's draw calls, to check `total` against (null if it isn't kept: it is under ?fps) */
  calls: number | null;
  byPass: Record<DrawPass, number>;
  /** The main pass's draws of things past the tier's `far` (their nearest point), the far view's share */
  far: number;
  /** Biggest first */
  rows: DrawRow[];
}

type Draw = (camera: THREE.Camera, scene: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, object: THREE.Object3D, group: unknown) => void;

/** The name a draw goes down to: the mesh's own, or its nearest named parent's; else (under ?made) the code that added
 * it; else `?` and what it's drawn with */
export function drawName(object: THREE.Object3D, material: THREE.Material) {
  for (let o: THREE.Object3D | null = object; o; o = o.parent) if (o.name) return o.name;
  for (let o: THREE.Object3D | null = object; o; o = o.parent) if (o.userData.made) return `@${o.userData.made as string}`;
  const c = (material as THREE.MeshBasicMaterial).color;
  return `?${material.name || material.type}${c?.isColor ? ` #${c.getHexString()}` : ''}`;
}

/**
 * Draw one frame (`render`) and say what each of its draws was: `camera` is the view's own camera (the main pass),
 * `scene` the city's (draws of other scenes are the post passes'); `far` the tier's near-and-far line
 */
/** Whether three will draw `obj` at all (it skips an instanced mesh with no copies to show and a batch with nothing in view) */
export function drawsAnything(obj: THREE.Object3D) {
  if ((obj as THREE.InstancedMesh).isInstancedMesh) return (obj as THREE.InstancedMesh).count > 0;
  if ((obj as THREE.BatchedMesh).isBatchedMesh) return ((obj as unknown as { _multiDrawCount?: number })._multiDrawCount ?? 1) > 0;
  return true;
}

const IM = new THREE.Matrix4();
const IP = new THREE.Vector3();
/** How far an instanced mesh's nearest copy (that's drawn) is from `eye`, its geometry's size off; `at` set to it */
export function nearestCopy(m: THREE.InstancedMesh, eye: THREE.Vector3, at: THREE.Sphere) {
  if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
  const r = m.geometry.boundingSphere?.radius ?? 0;
  let best = Infinity;
  for (let i = 0; i < m.count; i++) {
    m.getMatrixAt(i, IM);
    IM.premultiply(m.matrixWorld);
    // (a hidden copy is scaled to nothing)
    if (IM.determinant() === 0) continue;
    IP.setFromMatrixPosition(IM);
    const d = eye.distanceTo(IP);
    if (d < best) {
      best = d;
      at.center.copy(IP);
    }
  }
  return best === Infinity ? Infinity : Math.max(0, best - r);
}

export function captureDraws(renderer: { renderBufferDirect: Draw; info?: { render: { calls: number } } }, scene: THREE.Object3D, camera: THREE.Camera, render: () => void, far: number): DrawBreakdown {
  const rows = new Map<string, DrawRow & { seen: Set<THREE.Object3D> }>();
  const byPass: Record<DrawPass, number> = { main: 0, outline: 0, shadow: 0, post: 0 };
  let total = 0;
  let farDraws = 0;
  const eye = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
  const sphere = new THREE.Sphere();
  const own = renderer.renderBufferDirect;
  const watch: Draw = function (this: unknown, cam, sc, geo, mat, obj, group) {
    if (!drawsAnything(obj)) return own.call(this, cam, sc, geo, mat, obj, group);
    const pass: DrawPass = sc !== scene ? 'post' : cam === camera ? 'main' : (cam as THREE.OrthographicCamera).isOrthographicCamera ? 'shadow' : 'outline';
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    sphere.copy(geo.boundingSphere ?? sphere.set(new THREE.Vector3(), 0)).applyMatrix4(obj.matrixWorld);
    // (an instanced mesh: how far its nearest copy is, not its bounds, which can span the city)
    const d = (obj as THREE.InstancedMesh).isInstancedMesh ? nearestCopy(obj as THREE.InstancedMesh, eye, sphere) : Math.max(0, eye.distanceTo(sphere.center) - sphere.radius);
    const what = drawName(obj, mat);
    const key = `${pass}|${what}`;
    let row = rows.get(key);
    if (!row) rows.set(key, (row = { what, pass, draws: 0, meshes: 0, near: Infinity, at: [Math.round(sphere.center.x), Math.round(sphere.center.z)], seen: new Set() }));
    row.draws++;
    if (!row.seen.has(obj)) {
      row.seen.add(obj);
      row.meshes++;
    }
    row.near = Math.min(row.near, Math.round(d));
    byPass[pass]++;
    total++;
    if (pass === 'main' && d > far) farDraws++;
    return own.call(this, cam, sc, geo, mat, obj, group);
  };
  renderer.renderBufferDirect = watch;
  const before = renderer.info?.render.calls ?? 0;
  try {
    render();
  } finally {
    renderer.renderBufferDirect = own;
  }
  const calls = renderer.info ? renderer.info.render.calls - before : null;
  const out = [...rows.values()].map(({ seen: _, ...r }) => r).sort((a, b) => b.draws - a.draws || a.what.localeCompare(b.what));
  return { total, calls, byPass, far: farDraws, rows: out };
}

/** The files (and lines) in a stack that aren't three's or this one's: what made a thing */
export function makerOf(stack: string, depth = 2) {
  const out: string[] = [];
  for (const line of stack.split('\n')) {
    const m = line.match(/(\/_astro)?\/([\w.-]+?)((?:\.[\w-]{8})?\.(?:ts|js|mjs))(?:\?[^:)]*)?:(\d+):?(\d*)/);
    if (!m || /^(three|drawrows|chunk|BufferGeometryUtils)/.test(m[2])) continue;
    // (a built chunk: its whole file name, line and column, to look up in its source map)
    out.push(m[1] && m[5] ? `${m[2]}${m[3]}:${m[4]}:${m[5]}` : `${m[2]}:${m[4]}`);
    if (out.length >= depth) break;
  }
  return out.join('<');
}

/**
 * ?made (with ?fps; docs/phone-far-plan.md Phase 1): from here on, each thing added to the scene with no name of its own
 * is tagged with the code that added it (`userData.made`, read by `drawName()`), so the breakdown can say what made it.
 * For measuring only: it reads a stack on every add
 */
export function tagMakers() {
  const add = THREE.Object3D.prototype.add;
  THREE.Object3D.prototype.add = function (this: THREE.Object3D, ...objs: THREE.Object3D[]) {
    let made = '';
    for (const o of objs) {
      if (o.name || o.userData.made) continue;
      made ||= makerOf(new Error().stack ?? '');
      o.userData.made = made;
    }
    return add.apply(this, objs);
  };
}
