// Building as you go (tilework.ts, growth plan Phase 3): the boot builds only the sites round the home view,
// the rest are built nearest first, a place asked for is built at once, and a far tile's near pieces are let
// go past the budget and built again (its site run once more) before the camera is back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createTileWork, site } from '../src/scripts/city3d/tilework';
import { tileBatch } from '../src/scripts/city3d/tilebatch';
import { tilesNear } from '../src/scripts/city3d/tiles';
import { SLOW_SITE_MS } from '../src/scripts/city3d/tileplan';

const paint = new THREE.MeshBasicMaterial();
paint.userData.shared = true;

test('sites are built round the home view first, the rest nearest first, and asked-for places at once', () => {
  const runs: string[] = [];
  /** A site: a building of a box (all distances) and its details (near only) at x, z */
  const block = (id: string, x: number, z: number) =>
    site(id, [x - 2, z - 2, x + 2, z + 2], (into) => {
      runs.push(id);
      for (const lod of ['all', 'near'] as const) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2).translate(x, 1, z), paint);
        m.userData.batched = true;
        if (lod === 'near') m.userData.lod = 'near';
        into.add(m);
      }
    });
  block('home', 15, 15);
  block('mid', 100, 15);
  block('far', 400, 15);
  block('farther', 600, 15);
  block('north', 15, -300);
  const scene = new THREE.Scene();
  const works = createTileWork(scene, { budget: 0, compile: () => {} });
  const groups = works.boot(tilesNear(15, 15, 40));
  assert.deepEqual(runs, ['home']);
  const tiled = tileBatch(scene, [scene, ...groups]);
  works.attach(tiled);
  assert.equal(works.stats().waiting, 4);
  // Nearest first from the home view
  works.step(1e6, 15, 30, 15, 0, 100);
  assert.deepEqual(runs, ['home', 'mid', 'north', 'far', 'farther']);
  assert.equal(works.stats().waiting, 0);
  assert.equal(works.stats().built, 5);
  // Every site's pieces joined the one mesh
  assert.equal(tiled.meshes.length, 1);
});

test('a place asked for is built before it is shown, and near forms come back after being let go', () => {
  const runs: string[] = [];
  const block = (id: string, x: number, z: number) =>
    site(id, [x - 2, z - 2, x + 2, z + 2], (into) => {
      runs.push(id);
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(x, 0.5, z), paint);
      m.userData.batched = true;
      m.userData.lod = 'near';
      into.add(m);
    });
  block('a', 15, 15);
  block('b', 315, 15);
  block('c', 615, 15);
  const scene = new THREE.Scene();
  // No room for near forms at all
  const works = createTileWork(scene, { budget: 0, compile: () => {} });
  const tiled = tileBatch(scene, [scene, ...works.boot(tilesNear(15, 15, 40))]);
  works.attach(tiled);
  // A fly-in to c builds it now, ahead of b (which is nearer the camera)
  works.want(615, 15, 30);
  assert.deepEqual(runs, ['a', 'c']);
  // Building nothing this frame (no time), but checking the budget: from the home view c is far, so it lets go
  tiled.update(15, 30, 15, 100);
  works.step(0, 15, 30, 15, 0.016, 100);
  assert.equal(works.stats().released, 1);
  assert.equal(works.stats().held, tiled.heldBytes());
  // Flying over to c: it's built again before it's near (its site runs once more)
  works.step(0, 615 - 100 - 20, 30, 15, 0.016, 100);
  assert.deepEqual(runs, ['a', 'c', 'c']);
  assert.equal(works.stats().rebuilt, 1);
  assert.equal(works.stats().released, 0);
  // b, never built and never asked for, still waits
  assert.equal(works.stats().waiting, 1);
});

test("tiles that let go come back a tile at a frame when the frame's time is short, together when there's time", () => {
  const runs: string[] = [];
  const block = (id: string, x: number, z: number) =>
    site(id, [x - 2, z - 2, x + 2, z + 2], (into) => {
      runs.push(id);
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(x, 0.5, z), paint);
      m.userData.batched = true;
      m.userData.lod = 'near';
      into.add(m);
    });
  block('home', 15, 15);
  // Three sites on three tiles side by side, far east
  for (const [i, x] of [615, 645, 675].entries()) block(`east${i}`, x, 15);
  const scene = new THREE.Scene();
  const works = createTileWork(scene, { budget: 0, compile: () => {} });
  const tiled = tileBatch(scene, [scene, ...works.boot(tilesNear(15, 15, 40))]);
  works.attach(tiled);
  works.want(645, 15, 60);
  assert.equal(runs.length, 4);
  // From home they're far: all three let go
  tiled.update(15, 30, 15, 100);
  works.step(0, 15, 30, 15, 0.016, 100);
  assert.equal(works.stats().released, 3);
  // A jump to them with no time in the frame: one comes back now, the next the frame after, nearest first
  works.step(0, 650, 30, 15, 0.016, 100);
  assert.equal(works.stats().rebuilt, 1);
  works.step(0, 650, 30, 15, 0.016, 100);
  assert.equal(works.stats().rebuilt, 2);
  // With time to spare the rest come back in one frame
  works.step(1e6, 650, 30, 15, 0.016, 100);
  assert.equal(works.stats().rebuilt, 3);
  assert.equal(works.stats().released, 0);
});

test('a site across tiles that let go runs once for them all, and a tile shows again once every one of its sites is back', () => {
  const runs: string[] = [];
  const at = (into: THREE.Object3D, x: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(x, 0.5, 15), paint);
    m.userData.batched = true;
    m.userData.lod = 'near';
    into.add(m);
  };
  site('home', [13, 13, 17, 17], (into) => {
    runs.push('home');
    at(into, 15);
  });
  // A wide site with a piece on each of three tiles side by side, far east, and a small one on the middle tile
  site('wide', [610, 13, 680, 17], (into) => {
    runs.push('wide');
    for (const x of [615, 645, 675]) at(into, x);
  });
  site('small', [643, 13, 647, 17], (into) => {
    runs.push('small');
    at(into, 646);
  });
  const scene = new THREE.Scene();
  const works = createTileWork(scene, { budget: 0, compile: () => {} });
  const tiled = tileBatch(scene, [scene, ...works.boot(tilesNear(15, 15, 40))]);
  works.attach(tiled);
  works.want(645, 15, 60);
  assert.deepEqual(runs.sort(), ['home', 'small', 'wide']);
  tiled.update(15, 30, 15, 100);
  works.step(0, 15, 30, 15, 0.016, 100);
  assert.equal(works.stats().released, 3);
  // No time in the frame: the wide site comes back on all three tiles in one run; the middle tile waits on the small one
  works.step(0, 650, 30, 15, 0.016, 100);
  assert.equal(runs.filter((r) => r === 'wide').length, 2);
  assert.equal(works.stats().rebuilt, 2);
  assert.equal(works.stats().released, 1);
  works.step(0, 650, 30, 15, 0.016, 100);
  assert.equal(runs.filter((r) => r === 'wide').length, 2);
  assert.equal(runs.filter((r) => r === 'small').length, 2);
  assert.equal(works.stats().rebuilt, 3);
  assert.equal(works.stats().released, 0);
});

test('a slow site keeps its near pieces when its tile is far; a quick one beside it lets go and is built again', () => {
  const runs: string[] = [];
  const at = (into: THREE.Object3D, x: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(x, 0.5, 15), paint);
    m.userData.batched = true;
    m.userData.lod = 'near';
    into.add(m);
  };
  site('home', [13, 13, 17, 17], (into) => {
    runs.push('home');
    at(into, 15);
  });
  // Far east, on two tiles: one site slow to build (past SLOW_SITE_MS), one quick
  site('slow', [613, 13, 617, 17], (into) => {
    runs.push('slow');
    const t = performance.now();
    while (performance.now() - t < SLOW_SITE_MS + 10);
    at(into, 615);
  });
  site('quick', [633, 13, 657, 17], (into) => {
    runs.push('quick');
    for (let k = 0; k < 20; k++) at(into, 635 + k);
  });
  // (a box's near piece, in bytes: the budget's share fits the slow site's one box, the quick site's twenty are over it)
  const probe = new THREE.Scene();
  const g = new THREE.Group();
  probe.add(g);
  at(g, 15);
  const box = tileBatch(probe, [probe]);
  box.add([g], { site: 'probe' });
  const B = box.nearBytesOf('probe');
  assert.ok(B > 0);
  const scene = new THREE.Scene();
  const works = createTileWork(scene, { budget: 4 * B + 1, compile: () => {} });
  const tiled = tileBatch(scene, [scene, ...works.boot(tilesNear(15, 15, 40))]);
  works.attach(tiled);
  works.want(630, 15, 60);
  assert.ok(works.stats().kept > 0);
  tiled.update(15, 30, 15, 100);
  works.step(0, 15, 30, 15, 0.016, 100);
  // Only the quick site's tile let go; coming back, only it runs again
  assert.equal(works.stats().released, 1);
  works.step(1e6, 630, 30, 15, 0.016, 100);
  assert.equal(works.stats().released, 0);
  assert.equal(runs.filter((r) => r === 'slow').length, 1);
  assert.equal(runs.filter((r) => r === 'quick').length, 2);
});
