// Near and far forms (lod.ts): a switch swaps by the camera's distance, and a place's near form is freed on the GPU
// once its far form has shown `FREE_AFTER` (the stability plan's Phase 3, item 6), never while it's near or before
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FREE_AFTER, addLodSwitch, freedNear, updateLods } from '../src/scripts/city3d/lod';

test("a far place's near form is freed after FREE_AFTER far, and held again once near", () => {
  const shown: boolean[] = [];
  let released = 0;
  const box = new THREE.Box3(new THREE.Vector3(1000, 0, 1000), new THREE.Vector3(1010, 10, 1010));
  const sw = addLodSwitch((near) => shown.push(near), box);
  sw.release = () => {
    released++;
    return 4096;
  };
  const far = 100;
  // Near: shown near, nothing freed however long
  updateLods(1005, 5, 1005, far, 0);
  updateLods(1005, 5, 1005, far, FREE_AFTER * 3);
  assert.equal(released, 0);
  // Far: the far form at once, the near form freed only once it has been far FREE_AFTER
  updateLods(0, 5, 0, far, 100000);
  assert.equal(shown.at(-1), false);
  updateLods(0, 5, 0, far, 100000 + FREE_AFTER - 1);
  assert.equal(released, 0);
  updateLods(0, 5, 0, far, 100000 + FREE_AFTER + 1);
  assert.equal(released, 1);
  assert.ok(freedNear().bytes >= 4096 && freedNear().places >= 1);
  // Freed once only, however long it stays far
  updateLods(0, 5, 0, far, 100000 + FREE_AFTER * 10);
  assert.equal(released, 1);
  // Near again: shown near, held again (three uploads it as it's drawn); far again starts the wait over
  updateLods(1005, 5, 1005, far, 300000);
  assert.equal(shown.at(-1), true);
  assert.equal(freedNear().places, 0);
  updateLods(0, 5, 0, far, 400000);
  updateLods(0, 5, 0, far, 400000 + FREE_AFTER - 1);
  assert.equal(released, 1);
  updateLods(0, 5, 0, far, 400000 + FREE_AFTER + 1);
  assert.equal(released, 2);
});
