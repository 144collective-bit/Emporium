// The tile grid (tiles.ts, growth plan Phase 1): every point is in one tile, the tiles near a point
// and in a view are found exactly as three.js would find them, and nothing in view is ever left out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TILE, WORLD_TILES, boxInView, tileOf, tileRect, tilesIn, tilesInView, tilesNear, type Plane } from '../src/scripts/city3d/tiles';
import { EXT } from '../src/scripts/city3d/layout';

let seed = 3;
const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

test('every point is in exactly one tile, and the tiles cover the world edge to edge', () => {
  for (let k = 0; k < 5000; k++) {
    const x = EXT[0] + r() * (EXT[1] - EXT[0]);
    const z = EXT[0] + r() * (EXT[1] - EXT[0]);
    const [i, j] = tileOf(x, z);
    const [x0, z0, x1, z1] = tileRect(i, j);
    assert.ok(x >= x0 && x < x1 && z >= z0 && z < z1);
    assert.ok(WORLD_TILES.some(([a, b]) => a === i && b === j));
  }
  // An edge belongs to the tile it starts
  assert.deepEqual(tileOf(TILE, -TILE), [1, -1]);
  assert.equal(new Set(WORLD_TILES.map(([i, j]) => `${i},${j}`)).size, WORLD_TILES.length);
  assert.equal(tilesIn(0, 0, TILE * 2 - 1, TILE - 1).length, 2);
});

test('the tiles near a point are exactly the ones within reach', () => {
  for (let k = 0; k < 500; k++) {
    const x = EXT[0] + r() * (EXT[1] - EXT[0]);
    const z = EXT[0] + r() * (EXT[1] - EXT[0]);
    const rad = r() * 70;
    const got = new Set(tilesNear(x, z, rad).map(([i, j]) => `${i},${j}`));
    for (const [i, j] of tilesIn(x - 100, z - 100, x + 100, z + 100)) {
      const [x0, z0, x1, z1] = tileRect(i, j);
      const dx = Math.max(x0 - x, 0, x - x1);
      const dz = Math.max(z0 - z, 0, z - z1);
      assert.equal(got.has(`${i},${j}`), Math.hypot(dx, dz) <= rad);
    }
  }
});

const planesOf = (f: THREE.Frustum): Plane[] => f.planes.map((p) => [p.normal.x, p.normal.y, p.normal.z, p.constant]);

test('a tile is in view exactly when three.js says its box is, and nothing in view is left out', () => {
  const cam = new THREE.PerspectiveCamera(34, 1.6, 0.5, 440);
  const f = new THREE.Frustum();
  const m = new THREE.Matrix4();
  const box = new THREE.Box3();
  const p = new THREE.Vector3();
  for (let k = 0; k < 200; k++) {
    cam.position.set(EXT[0] + r() * 440, 1 + r() * 120, EXT[0] + r() * 440);
    cam.lookAt(EXT[0] + r() * 440, 0, EXT[0] + r() * 440);
    cam.updateMatrixWorld();
    f.setFromProjectionMatrix(m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const planes = planesOf(f);
    const seen = new Set(tilesInView(planes, 0, 14).map(([i, j]) => `${i},${j}`));
    for (const [i, j] of WORLD_TILES) {
      const [x0, z0, x1, z1] = tileRect(i, j);
      box.min.set(x0, 0, z0);
      box.max.set(x1, 14, z1);
      assert.equal(seen.has(`${i},${j}`), f.intersectsBox(box));
      assert.equal(boxInView(planes, x0, 0, z0, x1, 14, z1), f.intersectsBox(box));
    }
    // Any point the camera can see is in a tile it keeps
    for (let n = 0; n < 200; n++) {
      p.set(EXT[0] + r() * 440, r() * 14, EXT[0] + r() * 440);
      if (f.containsPoint(p)) {
        const [i, j] = tileOf(p.x, p.z);
        assert.ok(seen.has(`${i},${j}`));
      }
    }
  }
});
