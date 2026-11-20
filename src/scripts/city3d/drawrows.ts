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
  /** Every draw of the frame */
  total: number;
  byPass: Record<DrawPass, number>;
  /** The main pass's draws of things past the tier's `far` (their nearest point), the far view's share */
  far: number;
  /** Biggest first */
  rows: DrawRow[];
}

type Draw = (camera: THREE.Camera, scene: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, object: THREE.Object3D, group: unknown) => void;

/** The name a draw goes down to: the mesh's own, or its nearest named parent's; else `?` and what it's drawn with */
export function drawName(object: THREE.Object3D, material: THREE.Material) {
  for (let o: THREE.Object3D | null = object; o; o = o.parent) if (o.name) return o.name;
  const c = (material as THREE.MeshBasicMaterial).color;
  return `?${material.name || material.type}${c?.isColor ? ` #${c.getHexString()}` : ''}`;
}

/**
 * Draw one frame (`render`) and say what each of its draws was: `camera` is the view's own camera (the main pass),
 * `scene` the city's (draws of other scenes are the post passes'); `far` the tier's near-and-far line
 */
export function captureDraws(renderer: { renderBufferDirect: Draw }, scene: THREE.Object3D, camera: THREE.Camera, render: () => void, far: number): DrawBreakdown {
  const rows = new Map<string, DrawRow & { seen: Set<THREE.Object3D> }>();
  const byPass: Record<DrawPass, number> = { main: 0, outline: 0, shadow: 0, post: 0 };
  let total = 0;
  let farDraws = 0;
  const eye = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
  const sphere = new THREE.Sphere();
  const own = renderer.renderBufferDirect;
  const watch: Draw = function (this: unknown, cam, sc, geo, mat, obj, group) {
    const pass: DrawPass = sc !== scene ? 'post' : cam === camera ? 'main' : (cam as THREE.OrthographicCamera).isOrthographicCamera ? 'shadow' : 'outline';
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    sphere.copy(geo.boundingSphere ?? sphere.set(new THREE.Vector3(), 0)).applyMatrix4(obj.matrixWorld);
    const d = Math.max(0, eye.distanceTo(sphere.center) - sphere.radius);
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
  try {
    render();
  } finally {
    renderer.renderBufferDirect = own;
  }
  const out = [...rows.values()].map(({ seen: _, ...r }) => r).sort((a, b) => b.draws - a.draws || a.what.localeCompare(b.what));
  return { total, byPass, far: farDraws, rows: out };
}
