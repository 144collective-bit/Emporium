// Building as you go (tilework.ts, growth plan Phase 3): the boot builds only the sites round the home view,
// the rest are built nearest first, a place asked for is built at once, and a far tile's near pieces are let
// go past the budget and built again (its site run once more) before the camera is back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createTileWork, site } from '../src/scripts/city3d/tilework';
import { tileBatch } from '../src/scripts/city3d/tilebatch';
import { tilesNear } from '../src/scripts/city3d/tiles';

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
