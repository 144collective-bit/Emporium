// The crowd pack's idles and walk played onto a figure's bones (the polish plan's Phase 8, captureplay.ts): the
// stage and the hologram idle and walk on the capture. The idles come round seamlessly (no bone jumps at a take's
// end), the walk stays on the spot, a frame lands on the bones exactly, and without the pack nothing happens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BLEND, IDLE_TAKES, WALK_TAKE, applyFrame, createCapturePlayer, sampleClip } from '../src/scripts/city3d/captureplay';
import { MOCAP_BONES, MOCAP_FPS, NB } from '../src/scripts/city3d/mocap';
import { makeSkeleton, newPose, poseSkeleton } from '../src/scripts/city3d/skeleton';
import { lazyPack } from './mocapdata';

const data = lazyPack('crowd');
const player = createCapturePlayer(data);

/** Every body bone's world position, posed */
function joints(sk: ReturnType<typeof makeSkeleton>) {
  sk.root.updateMatrixWorld(true);
  return MOCAP_BONES.map((n) => new THREE.Vector3().setFromMatrixPosition(sk.bones[n].matrixWorld));
}
const most = (a: THREE.Vector3[], b: THREE.Vector3[]) => Math.max(...a.map((p, i) => p.distanceTo(b[i])));

test('the pack holds the takes the player plays, and without it the player does nothing', () => {
  assert.ok(player.ready);
  for (const n of [...IDLE_TAKES, WALK_TAKE]) assert.ok(data.clips.some((c) => c.name === n), n);
  const period = IDLE_TAKES.reduce((s, n) => s + data.clips.find((c) => c.name === n)!.frames / MOCAP_FPS - BLEND, 0);
  assert.ok(Math.abs(player.idlePeriod - period) < 1e-9);
  const none = createCapturePlayer(null);
  assert.ok(!none.ready);
  const sk = makeSkeleton();
  assert.equal(none.idle(sk, 1), false);
  assert.equal(none.walk(sk, 1), false);
});

test('a frame lands on the bones exactly, and part of the way eases from what the pose had', () => {
  const sk = makeSkeleton();
  poseSkeleton(sk, newPose(), [0.3, 0.3]);
  const rot = new Float32Array(NB * 4);
  const hips = new THREE.Vector3();
  const c = data.clips.find((k) => k.name === IDLE_TAKES[0])!;
  sampleClip(c, 12, rot, hips);
  applyFrame(sk, rot, hips);
  const q = new THREE.Quaternion();
  for (let b = 0; b < NB; b++) assert.ok(q.fromArray(rot, b * 4).angleTo(sk.bones[MOCAP_BONES[b]].quaternion) < 2e-3, MOCAP_BONES[b]);
  assert.ok(sk.bones.hips.position.distanceTo(hips) < 1e-9);
  // Halfway: the hips halfway from where they were
  const sk2 = makeSkeleton();
  poseSkeleton(sk2, newPose(), [0.3, 0.3]);
  const was = sk2.bones.hips.position.clone();
  applyFrame(sk2, rot, hips, 0.5);
  assert.ok(Math.abs(sk2.bones.hips.position.y - (was.y + hips.y) / 2) < 1e-9);
  // Between two frames the sample is between them
  const r0 = new Float32Array(NB * 4);
  const r1 = new Float32Array(NB * 4);
  const h = new THREE.Vector3();
  sampleClip(c, 12, r0, h);
  sampleClip(c, 13, r1, h);
  const q0 = new THREE.Quaternion().fromArray(r0, 0);
  const q1 = new THREE.Quaternion().fromArray(r1, 0);
  assert.ok(q.fromArray(rot, 0).angleTo(q0) < 2e-3);
  sampleClip(c, 12.5, rot, h);
  const mid = q.fromArray(rot, 0);
  assert.ok(mid.angleTo(q0) <= q0.angleTo(q1) + 2e-3 && mid.angleTo(q1) <= q0.angleTo(q1) + 2e-3);
});

test('the idles come round with no jump at a take\'s end, and the walk stays on the spot', () => {
  const sk = makeSkeleton();
  poseSkeleton(sk, newPose(), [0.3, 0.3]);
  const dt = 1 / 60;
  let worst = 0;
  let where = 0;
  player.idle(sk, 0);
  let last = joints(sk);
  // Right round the idles and into the second round
  for (let t = dt; t < player.idlePeriod + 2; t += dt) {
    player.idle(sk, t);
    const now = joints(sk);
    const d = most(last, now);
    if (d > worst) [worst, where] = [d, t];
    last = now;
  }
  // (a joint moves under 2 cm in a frame at a standing take's speed: a cut would throw it further)
  assert.ok(worst < 0.02, `the furthest a joint moved in a frame: ${(worst * 100).toFixed(1)} cm at ${where.toFixed(2)} s`);
  // The walk: the hips stay about the middle, never carried off along the way
  let far = 0;
  for (let t = 0; t < 4; t += dt) {
    player.walk(sk, t);
    far = Math.max(far, Math.hypot(sk.bones.hips.position.x, sk.bones.hips.position.z));
  }
  assert.ok(far < 0.1, `the walk's hips stay over the spot (${far.toFixed(3)})`);
});
