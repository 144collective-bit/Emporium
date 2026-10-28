// The emotes (emotes.ts, the revamp's Phase 5 step 3): the wave, the cheer, the salute and the dance as keyed clips on
// the Pose rig, measured on the real skeleton: each one-shot starts and ends at rest, nothing pops, the hands land where
// the emote says, and the dance's planted feet stay put on the ground while its hips bounce and sway.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ANKLE_H, makeSkeleton, newPose, poseSkeleton, type Pose } from '../src/scripts/city3d/skeleton';
import { DANCE_SECONDS, EMOTE_CLIPS, EMOTE_IDS, REST, emoteFeet, emoteOver, emotePose, emoteSeconds, emoteUpper, type EmoteId } from '../src/scripts/city3d/emotes';
import { idlePose } from '../src/scripts/city3d/poses';

const sk = makeSkeleton();
const v = new THREE.Vector3();
/** A bone's world position after posing the skeleton with `p` */
function at(p: Pose, bone: string) {
  poseSkeleton(sk, p);
  sk.root.updateMatrixWorld(true);
  return (sk.bones as Record<string, THREE.Object3D>)[bone].getWorldPosition(v.clone());
}
/** Every number a pose carries (the bob scaled up with the rest) */
const numbers = (p: Pose) => [p.bob * 10, p.lean, p.twist, p.side, p.turn ?? 0, p.sway ?? 0, p.headYaw, p.headPitch, p.headRoll ?? 0, ...[...p.arms, ...p.legs].flatMap((l) => [l.fwd, l.out, l.bend, l.twist ?? 0])];
const FPS = 60;
const close = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);

test('the clips: keys in order from 0 to the end, the one-shots upper-body and at rest at both ends', () => {
  for (const id of EMOTE_IDS) {
    const c = EMOTE_CLIPS[id];
    assert.equal(c.keys[0].t, 0, id);
    assert.equal(c.keys[c.keys.length - 1].t, c.seconds, id);
    for (let i = 1; i < c.keys.length; i++) assert.ok(c.keys[i].t > c.keys[i - 1].t, `${id}: key ${i}`);
    assert.equal(c.upper, id !== 'dance', id);
    assert.equal(emoteUpper(id), c.upper);
    if (c.upper) {
      for (const t of [0, c.seconds, c.seconds + 5]) {
        const p = newPose();
        emotePose(p, id, t);
        for (const [i, k] of (['armR', 'armL'] as const).entries()) {
          const a = p.arms[i];
          const r = REST[k];
          close(a.fwd, r.fwd, 1e-9, `${id} at ${t}: arm ${k} fwd`);
          close(a.out, r.out, 1e-9, `${id} at ${t}: arm ${k} out`);
          close(a.bend, r.bend, 1e-9, `${id} at ${t}: arm ${k} bend`);
        }
        close(p.headPitch, 0, 1e-9, `${id} at ${t}: the head`);
        close(p.lean, REST.lean, 1e-9, `${id} at ${t}: the lean`);
      }
    }
  }
  assert.equal(emoteSeconds('wave'), EMOTE_CLIPS.wave.seconds);
  assert.equal(emoteSeconds('dance'), DANCE_SECONDS);
  assert.equal(emoteSeconds('nope'), 0);
  assert.ok(!emoteOver('wave', 1) && emoteOver('wave', EMOTE_CLIPS.wave.seconds) && emoteOver('dance', DANCE_SECONDS));
});

test('an upper-body emote leaves the legs and hips alone; the dance loops seamlessly', () => {
  for (const id of ['wave', 'cheer', 'salute'] as const) {
    const p = newPose();
    idlePose(p, 2.3);
    p.sway = 0.07;
    p.turn = -0.1;
    const legs = JSON.stringify(p.legs);
    for (let f = 0; f < EMOTE_CLIPS[id].seconds * FPS; f++) emotePose(p, id, f / FPS);
    assert.equal(JSON.stringify(p.legs), legs, id);
    assert.equal(p.sway, 0.07);
    assert.equal(p.turn, -0.1);
  }
  const a = newPose();
  const b = newPose();
  emotePose(a, 'dance', 0);
  emotePose(b, 'dance', EMOTE_CLIPS.dance.seconds);
  const same = (x: number[], y: number[]) => x.forEach((n, i) => close(n, y[i], 1e-6, `number ${i}`));
  same(numbers(a), numbers(b));
  emotePose(b, 'dance', EMOTE_CLIPS.dance.seconds * 3 + 0.4);
  emotePose(a, 'dance', 0.4);
  same(numbers(a), numbers(b));
});

test('nothing pops: no number of the pose moves more than a snap in a frame', () => {
  for (const id of EMOTE_IDS) {
    const p = newPose();
    let last: number[] | null = null;
    for (let f = 0; f <= emoteSeconds(id) * FPS + 1; f++) {
      emotePose(p, id, f / FPS, 1, true);
      const cur = numbers(p);
      if (last) for (let i = 0; i < cur.length; i++) assert.ok(Math.abs(cur[i] - last[i]) < 0.5, `${id} at ${f / FPS}: number ${i} jumped ${last[i]} -> ${cur[i]}`);
      last = cur;
    }
  }
});

test('the hands: the wave above his head on his right, the cheer both high, the salute at his brow', () => {
  const p = newPose();
  emotePose(p, 'wave', 1.0, 1, true);
  const head = at(p, 'head');
  const hand = at(p, 'handL'); // (the rig's L is his right)
  assert.ok(hand.y > head.y + 0.15 && hand.x < -0.25 && hand.z > 0, `wave: ${hand.toArray()} head ${head.toArray()}`);
  // ...and it waves: the hand swings side to side from the elbow
  const xs: number[] = [];
  for (let t = 0.5; t <= 1.6; t += 0.05) {
    emotePose(p, 'wave', t, 1, true);
    xs.push(at(p, 'handL').x);
  }
  let swings = 0;
  for (let i = 2; i < xs.length; i++) if ((xs[i] - xs[i - 1]) * (xs[i - 1] - xs[i - 2]) < 0) swings++;
  assert.ok(swings >= 4, `wave: ${swings} swings`);
  emotePose(p, 'cheer', 0.8, 1, true);
  assert.ok(p.headPitch > 0.15, `the cheer looks up (${p.headPitch})`);
  const h2 = at(p, 'head');
  for (const b of ['handL', 'handR']) assert.ok(at(p, b).y > h2.y + 0.25, `cheer: ${b}`);
  emotePose(p, 'salute', 1.0, 1, true);
  const h3 = at(p, 'head');
  const s = at(p, 'handL');
  // (the brow: over the head bone, ahead of it, a little to his right)
  assert.ok(s.y > h3.y + 0.08 && s.y < h3.y + 0.2 && s.z > h3.z + 0.06 && s.x < h3.x && s.x > h3.x - 0.12, `salute: ${s.toArray()} head ${h3.toArray()}`);
});

test('the dance: planted feet stay put on the ground, flat, nothing under it, and a foot lifts off the beat', () => {
  const p = newPose();
  const plant: [THREE.Vector3 | null, THREE.Vector3 | null] = [null, null];
  let lifted = [0, 0];
  for (let f = 0; f <= EMOTE_CLIPS.dance.seconds * FPS; f++) {
    const t = f / FPS;
    emotePose(p, 'dance', t);
    const feet = emoteFeet('dance', t);
    for (let i = 0; i < 2; i++) {
      const S = i === 0 ? 'L' : 'R';
      const ankle = at(p, `foot${S}`);
      const toe = at(p, `toe${S}`);
      assert.ok(toe.y > -0.006 && ankle.y - ANKLE_H > -0.006, `at ${t}: foot ${i} under the ground (${toe.y}, ${ankle.y - ANKLE_H})`);
      const spot = feet[i];
      if (spot) {
        close(ankle.x, spot.x, 0.004, `at ${t}: foot ${i} off its spot`);
        close(ankle.z, spot.z, 0.004, `at ${t}: foot ${i} off its spot`);
        close(ankle.y, ANKLE_H, 0.004, `at ${t}: foot ${i} off the ground`);
        if (plant[i]) assert.ok(plant[i]!.distanceTo(ankle) < 0.002, `at ${t}: foot ${i} slid ${plant[i]!.distanceTo(ankle)}`);
        plant[i] = ankle;
      } else {
        plant[i] = null;
        if (ankle.y > ANKLE_H + 0.03) lifted[i]++;
      }
      assert.ok(p.legs[i].bend > 0.05, `at ${t}: leg ${i} locked straight`);
    }
  }
  assert.ok(lifted[0] > 10 && lifted[1] > 10, `lifts: ${lifted}`);
  // The weight moves: the hips sway with the beat, and bounce down on it
  const sways: number[] = [];
  const bobs: number[] = [];
  for (let t = 0; t < 2; t += 0.25) {
    emotePose(p, 'dance', t);
    sways.push(p.sway!);
    bobs.push(p.bob);
  }
  assert.ok(Math.max(...sways) - Math.min(...sways) > 0.15, `sway ${sways}`);
  for (let i = 0; i < bobs.length; i += 2) assert.ok(bobs[i] < bobs[i + 1], `the beat: ${bobs}`);
});

test('blended in by an amount: half way between what the pose held and the emote', () => {
  const a = newPose();
  const b = newPose();
  idlePose(a, 1);
  idlePose(b, 1);
  emotePose(b, 'cheer', 0.8);
  const h = newPose();
  idlePose(h, 1);
  emotePose(h, 'cheer', 0.8, 0.5);
  close(h.arms[0].fwd, (a.arms[0].fwd + b.arms[0].fwd) / 2, 1e-9, 'the arm');
  close(h.headPitch, (a.headPitch + b.headPitch) / 2, 1e-9, 'the head');
  emotePose(h, 'nope' as EmoteId, 1);
  close(h.headPitch, (a.headPitch + b.headPitch) / 2, 1e-9, 'an unknown emote does nothing');
});
