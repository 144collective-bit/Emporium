// The thing in his hand behaving (the polish plan's Phase 8, heldpose.ts): the coffee comes up for a sip now and
// then and the hand lands at the lips, the phone is read standing still (the head down, a glance up) and glanced at
// on the walk, the briefcase swings and settles, nothing plays while something else has him, and the accessories
// test still holds the held things clear of the fingers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { HELD, applyHeld, createHeldLife } from '../src/scripts/city3d/heldpose';
import { MB, NB, newPosed, posed } from '../src/scripts/city3d/mocap';
import { lazyPack } from './mocapdata';

/** A standing frame of the captured idle: the bone turns and hips the animator would hand over */
const idle = lazyPack('crowd').clips.find((c) => c.name === 'crowd-idle')!;
const frameOf = (f: number) => {
  const rot = new Float32Array(NB * 4);
  rot.set(idle.rot.subarray(f * NB * 4, (f + 1) * NB * 4));
  const hips = new THREE.Vector3(idle.hips[f * 3], idle.hips[f * 3 + 1], idle.hips[f * 3 + 2]);
  return { rot, hips };
};
const P = newPosed();
const DT = 1 / 60;

test('the coffee: a sip every so often standing or walking, never at a sprint, the hand at the lips at its top', () => {
  const life = createHeldLife(0.3);
  let sips = 0;
  let inSip = false;
  let t = 0;
  let topReach = 0;
  const { rot, hips } = frameOf(30);
  let handAtLips = Infinity;
  for (; t < 120; t += DT) {
    const L = life.update(DT, 'coffee', 0.6, true);
    if (L.kind === 'sip' && !inSip) sips++;
    inSip = L.kind === 'sip';
    topReach = Math.max(topReach, L.reach);
    if (L.reach > 0.99) {
      const r = rot.slice();
      applyHeld(r, hips, life, DT);
      posed(r, 0, hips.x, hips.y, hips.z, P);
      // (the spot in front of the mouth the cup is brought to, in the head's frame)
      const lips = new THREE.Vector3(...HELD.sip.at).applyQuaternion(P.rot[MB.head]).add(P.pos[MB.head]);
      handAtLips = Math.min(handAtLips, P.pos[MB.handR].distanceTo(lips));
      assert.ok(L.head < 0, 'the head tips back at the top of a sip');
    }
  }
  // (every 14 to 26 s: four to eight in two minutes)
  assert.ok(sips >= 4 && sips <= 9, `${sips} sips in two minutes`);
  assert.equal(topReach, 1);
  assert.ok(handAtLips < 0.02, `the hand within 2 cm of the lips (${(handAtLips * 100).toFixed(1)} cm)`);
  // At a sprint none start
  const run = createHeldLife(0.3);
  let any = false;
  for (let k = 0; k < 60 * 60; k++) if (run.update(DT, 'coffee', 4, true).kind) any = true;
  assert.ok(!any, 'no sip at a sprint');
});

test('the phone: read standing still with the head down and a glance up now and then, glanced at on the walk, away when he moves off', () => {
  const life = createHeldLife(0.7);
  // Standing: within a couple of seconds the phone is up and the head down
  let L = life.layer;
  for (let t = 0; t < 4; t += DT) L = life.update(DT, 'phone', 0, true);
  assert.equal(L.kind, 'phone');
  assert.ok(L.reach > 0.95, `the phone up (${L.reach.toFixed(2)})`);
  assert.ok(L.head > 0.5, `the head down (${L.head.toFixed(2)})`);
  // The hand in front of the chest under the eyes
  const { rot, hips } = frameOf(60);
  const r = rot.slice();
  applyHeld(r, hips, life, DT);
  posed(r, 0, hips.x, hips.y, hips.z, P);
  const head = P.pos[MB.head];
  const hand = P.pos[MB.handR];
  assert.ok(hand.y < head.y - 0.12 && hand.y > head.y - 0.32, `the hand under the chin (${(head.y - hand.y).toFixed(2)} down)`);
  assert.ok(hand.z > head.z + 0.1, 'the hand out in front');
  // The head's forward tips down
  const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(P.rot[MB.head]);
  posed(rot, 0, hips.x, hips.y, hips.z, P);
  const was = new THREE.Vector3(0, 0, 1).applyQuaternion(P.rot[MB.head]);
  assert.ok(fwd.y < was.y - 0.3, `the head looks down at it (${was.y.toFixed(2)} → ${fwd.y.toFixed(2)})`);
  // A glance up now and then: the head comes back up while the phone stays
  let glances = 0;
  let up = false;
  for (let t = 0; t < 60; t += DT) {
    L = life.update(DT, 'phone', 0, true);
    const now = L.head < 0.1;
    if (now && !up) glances++;
    up = now;
    assert.ok(L.reach > 0.9, 'the phone stays up through a glance');
  }
  assert.ok(glances >= 3 && glances <= 9, `${glances} glances in a minute`);
  // Moving off: away within a second
  for (let t = 0; t < 1.2; t += DT) L = life.update(DT, 'phone', 1.5, true);
  assert.ok(L.reach < 0.05 || L.kind === 'phone', 'away, or a look on the walk');
  // On the walk: a look at it now and then, part of the way up
  let looks = 0;
  let looking = false;
  let most = 0;
  for (let t = 0; t < 90; t += DT) {
    L = life.update(DT, 'phone', 1.5, true);
    const now = L.reach > 0.3;
    if (now && !looking) looks++;
    looking = now;
    most = Math.max(most, L.reach);
  }
  assert.ok(looks >= 4 && looks <= 11, `${looks} looks at the phone in a minute and a half`);
  assert.ok(most <= HELD.phone.walkW + 1e-6 && most > 0.6, `a look brings it part of the way (${most.toFixed(2)})`);
});

test('the briefcase swings with a shove and settles; nothing plays while something else has him, or with empty hands', () => {
  const life = createHeldLife(0.1);
  const { rot, hips } = frameOf(10);
  // Standing still: no swing
  for (let t = 0; t < 2; t += DT) {
    life.update(DT, 'briefcase', 0, true);
    applyHeld(rot.slice(), hips, life, DT);
  }
  assert.ok(Math.abs(life.layer.swing) < 1e-3, 'still at rest');
  // A hard start: it swings back, then settles within a few seconds
  let most = 0;
  for (let t = 0; t < 0.3; t += DT) {
    life.update(DT, 'briefcase', t < 0.1 ? 0 : 2.8, true);
    applyHeld(rot.slice(), hips, life, DT);
    most = Math.max(most, Math.abs(life.layer.swing));
  }
  assert.ok(most > 0.1 && most <= HELD.briefcase.most, `a swing of ${most.toFixed(2)} rad`);
  for (let t = 0; t < 4; t += DT) {
    life.update(DT, 'briefcase', 2.8, true);
    applyHeld(rot.slice(), hips, life, DT);
  }
  assert.ok(Math.abs(life.layer.swing) < 0.03, `settled (${life.layer.swing.toFixed(3)})`);
  // The hand's turn carries the swing: the hand bone turned by it, the arm as it was
  const r = rot.slice();
  for (let t = 0; t < 0.2; t += DT) life.update(DT, 'briefcase', t < 0.1 ? 0 : 3, true);
  applyHeld(r, hips, life, DT);
  const q0 = new THREE.Quaternion().fromArray(rot, MB.handR * 4);
  const q1 = new THREE.Quaternion().fromArray(r, MB.handR * 4);
  assert.ok(Math.abs(q0.angleTo(q1) - Math.abs(life.layer.swing)) < 0.02, 'the hand turned by the swing');
  for (let b = 0; b < NB; b++) if (b !== MB.handR) assert.ok(new THREE.Quaternion().fromArray(rot, b * 4).angleTo(new THREE.Quaternion().fromArray(r, b * 4)) < 1e-3, `bone ${b} as it was`);
  // Not allowed (an emote, a slide, a moment, the fists up): a sip in progress comes down, nothing new starts
  const busy = createHeldLife(0.3);
  for (let t = 0; t < 30; t += DT) busy.update(DT, 'coffee', 0.5, true);
  for (let t = 0; t < 2; t += DT) busy.update(DT, 'coffee', 0.5, false);
  assert.equal(busy.layer.reach, 0);
  for (let t = 0; t < 60; t += DT) assert.equal(busy.update(DT, 'coffee', 0.5, false).reach, 0);
  // Empty hands: nothing
  assert.equal(busy.update(DT, null, 0.5, true).kind, null);
  // The boombox hangs as it did
  assert.equal(busy.update(DT, 'boombox', 0.5, true).kind, null);
});
