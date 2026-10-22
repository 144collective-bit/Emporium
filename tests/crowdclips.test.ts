// The crowd's moves baked into bone matrices (character rebuild Phase 5): every clip's rows are finite and
// in their place, the loops have no seam, the walk keeps a planted foot planted when played at its stride,
// and the salute runs from attention to the hand at the brow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CLIP_DEFS, CLIP_IDS, CLIP_ROWS, CROWD_BONES, CROWD_ROWS, MARCH_STRIDE, WALK_STRIDE, bakeCrowdClips, crowdFrame, type CrowdClip } from '../src/scripts/city3d/crowdclips';
import { BONE_INDEX, makeSkeleton } from '../src/scripts/city3d/skeleton';

const data = bakeCrowdClips();
const mat = (row: number, bone: number) => new THREE.Matrix4().fromArray(data, (row * CROWD_BONES + bone) * 16);
/** Where a bone's joint is in a row (the bind pose's joint carried by the row's matrix) */
const sk = makeSkeleton();
sk.root.updateMatrixWorld(true);
const rest = sk.list.map((b) => new THREE.Vector3().setFromMatrixPosition(b.matrixWorld));
const joint = (row: number, bone: number) => rest[bone].clone().applyMatrix4(mat(row, bone));
/** How far apart two rows are: the most any joint moves between them */
const gap = (a: number, b: number) => Math.max(...rest.map((_, i) => joint(a, i).distanceTo(joint(b, i))));

test('the clips sit one after another in the texture, every number finite', () => {
  assert.equal(data.length, CROWD_ROWS * CROWD_BONES * 16);
  let row = 0;
  for (const id of CLIP_IDS) {
    assert.equal(CLIP_ROWS[id], row, id);
    row += CLIP_DEFS[id].frames;
  }
  assert.equal(row, CROWD_ROWS);
  assert.ok(data.every(Number.isFinite));
  // A pose of rest is no rotation at all: the hips' matrix is a translation (the bob) only
  const hips = mat(CLIP_ROWS.idle, BONE_INDEX.hips);
  const q = new THREE.Quaternion();
  hips.decompose(new THREE.Vector3(), q, new THREE.Vector3());
  assert.ok(q.angleTo(new THREE.Quaternion()) < 0.1);
});

test('the loops have no seam: the last frame runs into the first like any two frames', () => {
  for (const id of CLIP_IDS) {
    const d = CLIP_DEFS[id];
    if (!d.loop) continue;
    const r = CLIP_ROWS[id];
    let most = 0;
    for (let f = 0; f + 1 < d.frames; f++) most = Math.max(most, gap(r + f, r + f + 1));
    const seam = gap(r + d.frames - 1, r);
    assert.ok(seam <= most * 1.5 + 1e-3, `${id}: the seam moves ${seam.toFixed(4)}, frames at most ${most.toFixed(4)}`);
  }
});

test('crowdFrame: rows and blend for a loop (wrapping) and for the salute (held at its ends)', () => {
  const w = CLIP_DEFS.walk.frames;
  assert.deepEqual(crowdFrame('walk', 0), [CLIP_ROWS.walk, CLIP_ROWS.walk + 1, 0]);
  const [a, b, k] = crowdFrame('walk', 1 - 0.25 / w);
  assert.equal(a, CLIP_ROWS.walk + w - 1);
  assert.equal(b, CLIP_ROWS.walk);
  assert.ok(Math.abs(k - 0.75) < 1e-9);
  assert.deepEqual(crowdFrame('walk', 2.5), crowdFrame('walk', 0.5));
  const s = CLIP_DEFS.salute.frames;
  assert.deepEqual(crowdFrame('salute', -1), [CLIP_ROWS.salute, CLIP_ROWS.salute + 1, 0]);
  assert.deepEqual(crowdFrame('salute', 1), [CLIP_ROWS.salute + s - 2, CLIP_ROWS.salute + s - 1, 1]);
});

test('played at its stride, the walk keeps a planted foot planted (and so does the march)', () => {
  for (const [id, stride] of [
    ['walk', WALK_STRIDE],
    ['march', MARCH_STRIDE],
  ] as [CrowdClip, number][]) {
    assert.ok(stride > 0.2 && stride < 1.5, `${id} stride ${stride}`);
    const n = CLIP_DEFS[id].frames;
    const r = CLIP_ROWS[id];
    for (const foot of [BONE_INDEX.footL, BONE_INDEX.footR]) {
      // Where the ankle is on the ground as the body moves forward a stride a cycle
      const at = Array.from({ length: n + 1 }, (_, f) => joint(r + (f % n), foot).add(new THREE.Vector3(0, 0, (f / n) * stride)));
      const low = Math.min(...at.map((p) => p.y));
      let planted = 0;
      for (let f = 0; f < n; f++) {
        // Both ends of the step down on the ground: it shouldn't move along it
        if (at[f].y > low + 0.01 || at[f + 1].y > low + 0.01) continue;
        planted++;
        const slide = Math.hypot(at[f + 1].x - at[f].x, at[f + 1].z - at[f].z);
        assert.ok(slide < 0.012, `${id} foot ${foot} slides ${slide.toFixed(4)} at frame ${f}`);
      }
      assert.ok(planted >= n * 0.2, `${id}: planted for ${planted} of ${n} frames`);
    }
  }
});

test('the salute goes from attention to the free hand up at the brow', () => {
  const r = CLIP_ROWS.salute;
  const n = CLIP_DEFS.salute.frames;
  const hand = (row: number) => joint(row, BONE_INDEX.handR);
  const head = joint(r + n - 1, BONE_INDEX.head);
  assert.ok(hand(r).y < 0.7, 'down at the side');
  assert.ok(hand(r + n - 1).distanceTo(head) < 0.2, 'at the brow');
});
