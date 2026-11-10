// The tile pieces as you go (tilebatch.ts, growth plan Phase 3): sites built after the boot join the same batched
// meshes (growing them when full), a far tile lets its sites' near pieces go and is drawn far until they're
// built again, and nothing else is touched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PACKED, compact, tileBatch } from '../src/scripts/city3d/tilebatch';

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

test('vertices are packed smaller: normals as bytes, the paint\'s colours as 16-bit shares', () => {
  const box = () => {
    const g = new THREE.BoxGeometry(1, 2, 3);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([0.0123, 0.5, 1], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  };
  const size = (g: THREE.BufferGeometry) => Object.values(g.attributes).reduce((n, a) => n + (a as THREE.BufferAttribute).array.byteLength, 0) / g.attributes.position.count;
  const before = box();
  const g = compact(box(), true);
  // 44 bytes a vertex (position, normal, uv, colour as floats) down to 29
  assert.equal(size(before), 44);
  assert.equal(size(g), 29);
  const n = g.attributes.normal as THREE.BufferAttribute;
  const c = g.attributes.color as THREE.BufferAttribute;
  assert.ok(n.array instanceof Int8Array && n.normalized);
  assert.ok(c.array instanceof Uint16Array && c.normalized);
  // The shaders read the same numbers back (three's getters undo `normalized`)
  for (let i = 0; i < n.count; i++) {
    assert.ok(Math.abs(n.getX(i) - before.attributes.normal.getX(i)) < 1 / 127);
    assert.ok(Math.abs(n.getY(i) - before.attributes.normal.getY(i)) < 1 / 127);
    assert.ok(Math.abs(n.getZ(i) - before.attributes.normal.getZ(i)) < 1 / 127);
    assert.ok(Math.abs(c.getX(i) - 0.0123) < 1 / 65535);
    assert.ok(Math.abs(c.getY(i) - 0.5) < 1 / 65535);
    assert.equal(c.getZ(i), 1);
  }
  assert.equal(PACKED.clamped, 0);
  // Another material's colours (they may pass 1) stay as they are, its normals still packed
  const other = compact(box(), false);
  assert.ok(other.attributes.color.array instanceof Float32Array);
  assert.ok(other.attributes.normal.array instanceof Int8Array);
  // Packing twice changes nothing more
  assert.equal(size(compact(g, true)), 29);
});

test('a tile past the haze lets everything its sites drew go, and gets it back in two steps', () => {
  const scene = new THREE.Scene();
  const tiled = tileBatch(scene, [scene]);
  tiled.update(0, 10, 0, 100);
  const draw = () => {
    const g = new THREE.Group();
    scene.add(g);
    piece(g, 905, 905, 'near');
    piece(g, 906, 905, 'far');
    piece(g, 907, 905);
    piece(g, 908, 905, 'near', own);
    return g;
  };
  tiled.add([draw()], { site: 'block' });
  const [shared] = tiled.meshes;
  assert.equal(visible(shared), 2);
  const [h] = tiled.held(0, 10, 0);
  assert.ok(h.all > h.bytes && !h.gone);
  // Gone: the shared material's pieces at every level (the one in its own texture stays)
  const pieces = tiled.pieces();
  assert.equal(tiled.vanish('30,30'), h.all);
  assert.equal(visible(shared), 0);
  assert.deepEqual(tiled.lostSites('30,30'), ['block']);
  const [g] = tiled.held(0, 10, 0);
  assert.ok(g.gone && g.released && g.all === 0);
  // (twice does nothing)
  assert.equal(tiled.vanish('30,30'), 0);
  // Inside the haze again: the walls and the far stand-in are built again, the near details not yet
  tiled.add([draw()], { site: 'block', keep: (t, lod) => t === '30,30' && lod !== 'near' });
  tiled.regained('30,30');
  assert.equal(visible(shared), 2);
  const [back] = tiled.held(0, 10, 0);
  assert.ok(!back.gone && back.released && back.all === h.all - h.bytes);
  // Close to: the near details too, as for a tile that only let those go
  tiled.add([draw()], { site: 'block', keep: (t, lod) => t === '30,30' && lod === 'near' });
  tiled.restored('30,30');
  tiled.update(905, 2, 905, 100);
  assert.equal(visible(shared), 2);
  assert.equal(tiled.held(905, 2, 905)[0].all, h.all);
  assert.equal(tiled.pieces(), pieces);
  // A tile drawn near is never let go, nor the boot's own pieces
  assert.equal(tiled.vanish('30,30'), 0);
});

test('the room tiles let go is given back: the meshes are made smaller, and still take new pieces', () => {
  const scene = new THREE.Scene();
  const tiled = tileBatch(scene, [scene]);
  tiled.update(0, 10, 0, 100);
  // Twenty tiles' worth of walls from one site each
  const draw = (n: number) => {
    const g = new THREE.Group();
    scene.add(g);
    for (let k = 0; k < 6; k++) piece(g, 600 + n * 30 + 5 + k, 905);
    return g;
  };
  for (let n = 0; n < 20; n++) tiled.add([draw(n)], { site: `s${n}` });
  const [bm] = tiled.meshes;
  const bytes = () => Object.values(bm.geometry.attributes).reduce((n, a) => n + (a as THREE.BufferAttribute).array.byteLength, 0) + (bm.geometry.index!.array as Uint32Array).byteLength;
  const full = bytes();
  assert.equal(visible(bm), 20);
  // Nothing let go: nothing to give back
  assert.equal(tiled.trim(), 0);
  // Fifteen of them go past the haze
  for (let n = 5; n < 20; n++) assert.ok(tiled.vanish(`${20 + n},30`) > 0);
  assert.equal(bytes(), full);
  const back = tiled.trim();
  assert.ok(back > full * 0.5, `${back} of ${full}`);
  assert.equal(bytes(), full - back);
  // What's left is still drawn, and a tile coming back fits again (the mesh grows for it)
  assert.equal(visible(bm), 5);
  tiled.add([draw(7)], { site: 's7', keep: (t) => t === '27,30' });
  tiled.regained('27,30');
  assert.equal(visible(bm), 6);
  assert.equal(tiled.trim(), 0);
});
