// The tile pieces as you go (tilebatch.ts, growth plan Phase 3): sites built after the boot join the same batched
// meshes (growing them when full), a far tile lets its sites' near pieces go and is drawn far until they're
// built again, and nothing else is touched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { tileBatch } from '../src/scripts/city3d/tilebatch';

// A plain colour and a neon, as the Batches' shared materials (kit.ts marks them `shared`)
const paint = new THREE.MeshBasicMaterial();
paint.userData.shared = true;
const own = new THREE.MeshBasicMaterial({ map: new THREE.Texture() });

/** A batched mesh as a Batch builds it: a box at x, z */
function piece(parent: THREE.Object3D, x: number, z: number, lod?: 'near' | 'far', mat: THREE.Material = paint) {
  const g = new THREE.BoxGeometry(1, 1, 1).translate(x, 0.5, z);
  const m = new THREE.Mesh(g, mat);
  m.userData.batched = true;
  if (lod) m.userData.lod = lod;
  parent.add(m);
  return m;
}
const visible = (bm: THREE.BatchedMesh) => {
  let n = 0;
  for (let i = 0; i < bm.maxInstanceCount; i++) {
    try {
      if (bm.getVisibleAt(i)) n++;
    } catch {
      // (a deleted instance)
    }
  }
  return n;
};

test('sites built later join the meshes, which grow to take them', () => {
  const scene = new THREE.Scene();
  piece(scene, 5, 5);
  piece(scene, 45, 5);
  const tiled = tileBatch(scene, [scene]);
  assert.equal(tiled.meshes.length, 1);
  assert.equal(tiled.pieces(), 2);
  tiled.update(0, 10, 0, 100);
  // A site a long way off, many boxes in many tiles: same material, same mesh
  const site = new THREE.Group();
  scene.add(site);
  for (let k = 0; k < 40; k++) piece(site, 200 + k * 7, 300);
  const made = tiled.add([site], { site: 'far row' });
  assert.equal(made.length, 0);
  assert.equal(tiled.meshes.length, 1);
  assert.equal(site.children.length, 0);
  assert.ok(tiled.pieces() > 2);
  // A new material makes its own mesh (to compile)
  const other = new THREE.Group();
  piece(other, 10, 10, undefined, own);
  scene.add(other);
  assert.equal(tiled.add([other], { site: 'sign' }).length, 1);
  assert.equal(tiled.meshes.length, 2);
});

test('a far tile lets its near pieces go, is drawn far, and gets them back', () => {
  const scene = new THREE.Scene();
  const tiled = tileBatch(scene, [scene]);
  tiled.update(0, 10, 0, 100);
  const site = new THREE.Group();
  scene.add(site);
  // A tile at 300, 300: near details, a far stand-in, and walls at every distance
  piece(site, 305, 305, 'near');
  piece(site, 306, 305, 'far');
  piece(site, 307, 305);
  // and one detail in a texture of its own (never let go: it's not in a shared material)
  piece(site, 308, 305, 'near', own);
  tiled.add([site], { site: 'block' });
  const [shared] = tiled.meshes;
  // From the origin it's far: the stand-in and the walls show, not the details
  assert.equal(visible(shared), 2);
  const held = tiled.held(0, 10, 0);
  assert.equal(held.length, 1);
  assert.equal(held[0].key, '10,10');
  assert.ok(held[0].bytes > 0 && !held[0].near && !held[0].released);
  assert.equal(tiled.heldBytes(), held[0].bytes);
  // Let go: the shared material's near piece is deleted, the rest stays
  const freed = tiled.release('10,10');
  assert.equal(freed, held[0].bytes);
  assert.equal(tiled.heldBytes(), 0);
  assert.deepEqual(tiled.lostSites('10,10'), ['block']);
  // Walking right up to it, it stays far until its near pieces are built again
  tiled.update(305, 2, 305, 100);
  assert.equal(visible(shared), 2);
  // Built again: the site runs once more, only that tile's near pieces in shared materials kept
  const again = new THREE.Group();
  scene.add(again);
  piece(again, 305, 305, 'near');
  piece(again, 306, 305, 'far');
  piece(again, 307, 305);
  piece(again, 308, 305, 'near', own);
  piece(again, 5, 5, 'near');
  const before = tiled.pieces();
  tiled.add([again], { site: 'block', keep: (t, lod) => t === '10,10' && lod === 'near' });
  assert.equal(tiled.pieces(), before + 1);
  tiled.restored('10,10');
  tiled.update(305, 2, 305, 100);
  // Near: the details and the walls, not the stand-in
  assert.equal(visible(shared), 2);
  assert.ok(tiled.held(305, 2, 305)[0].near);
  assert.equal(tiled.heldBytes(), freed);
  // A tile drawn near is never let go
  assert.equal(tiled.release('10,10'), 0);
  // Pieces from the boot's own builders (no site) are never let go either
  const boot = new THREE.Scene();
  piece(boot, 305, 305, 'near');
  const t2 = tileBatch(boot, [boot]);
  t2.update(0, 10, 0, 100);
  assert.equal(t2.release('10,10'), 0);
  assert.equal(t2.held(0, 10, 0).length, 0);
});

test('room let go is taken back before a mesh grows', () => {
  const scene = new THREE.Scene();
  const tiled = tileBatch(scene, [scene]);
  tiled.update(0, 10, 0, 50);
  const site = () => {
    const g = new THREE.Group();
    scene.add(g);
    for (let k = 0; k < 10; k++) piece(g, 315 + k * 30, 315, 'near');
    return g;
  };
  tiled.add([site()], { site: 'row' });
  const bm = tiled.meshes[0];
  const size = (bm as unknown as { _maxVertexCount: number })._maxVertexCount;
  for (let k = 0; k < 10; k++) tiled.release(`${10 + k},10`);
  // Built again, ten times over: the room let go each time is reused, the mesh never grows
  for (let round = 0; round < 10; round++) {
    tiled.add([site()], { site: 'row', keep: (t, lod) => lod === 'near' && t.endsWith(',10') });
    for (let k = 0; k < 10; k++) {
      tiled.restored(`${10 + k},10`);
      tiled.release(`${10 + k},10`);
    }
  }
  assert.ok((bm as unknown as { _maxVertexCount: number })._maxVertexCount <= size * 1.3);
});
