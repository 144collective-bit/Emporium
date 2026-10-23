// Degen's animation from motion capture (animation Phase 1, animator.ts): the leg IK reaches what
// it's asked without ever bending a knee backwards; over every kind of running, walking, stopping
// and turning a held foot stays put on the ground, nothing pops from one frame to the next, the hips
// stay at a person's height; up a slope the held feet stand on it; and it's the same every time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createAnimator, twoBone } from '../src/scripts/city3d/animator';
import { MB, NB, TOE_BONES, decodeMocap, newPosed, posed } from '../src/scripts/city3d/mocap';
import { GAITS, newMove, stepMove } from '../src/scripts/city3d/movesim';

const data = decodeMocap(readFileSync('src/data/mocap/clips.bin'));
const SCALE = 0.85;
const DT = 1 / 60;
/** A tile in centimetres */
const CM = 180;

test('the leg IK reaches a target in reach exactly, the knee bending forward and the foot keeping its turn', () => {
  const rot = new Float32Array(NB * 4);
  const P = newPosed();
  const h = new THREE.Vector3(1, 0, 0);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let trial = 0; trial < 300; trial++) {
    for (let b = 0; b < NB; b++) new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 0.3, rnd() * 0.2, rnd() * 0.2)).toArray(rot, b * 4);
    // (some knees a touch past straight: the IK must bend them forward, never further back)
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 0.6 + 0.1, 0, 0)).toArray(rot, MB.shinL * 4);
    posed(rot, 0, 0, 0.6, 0, P);
    const t = P.pos[MB.footL].clone().add(new THREE.Vector3(rnd() * 0.1, rnd() * 0.08, rnd() * 0.1));
    const foot = P.rot[MB.footL].clone();
    const far = P.pos[MB.legL].distanceTo(t) / 0.545;
    twoBone(rot, P, MB.legL, MB.shinL, MB.footL, t);
    posed(rot, 0, 0, 0.6, 0, P);
    if (far < 0.95) assert.ok(P.pos[MB.footL].distanceTo(t) < 1e-4, `reached (${P.pos[MB.footL].distanceTo(t)})`);
    assert.ok(P.rot[MB.footL].angleTo(foot) < 2e-3, 'the foot keeps its turn');
    const ab = P.pos[MB.shinL].clone().sub(P.pos[MB.legL]).normalize();
    const bc = P.pos[MB.footL].clone().sub(P.pos[MB.shinL]).normalize();
    const flex = Math.atan2(ab.clone().cross(bc).dot(h.set(1, 0, 0).applyQuaternion(P.rot[MB.legL])), ab.dot(bc));
    assert.ok(flex > -1e-3, `the knee bends forward (${flex.toFixed(3)})`);
  }
});

type Prog = (t: number) => [number, number];
const PROGS: Record<string, { go: Prog; drift: number }> = {
  run: { go: () => [0, GAITS.run], drift: 1 },
  walk: { go: () => [0, GAITS.walk], drift: 1 },
  sprint: { go: () => [0, GAITS.sprint], drift: 1 },
  weave: {
    go: (t) => {
      const a = Math.sin(t * 1.4) * 0.9;
      return [Math.sin(a) * GAITS.run, Math.cos(a) * GAITS.run];
    },
    drift: 1,
  },
  circle: { go: (t) => [Math.sin(t * 0.8) * GAITS.run, Math.cos(t * 0.8) * GAITS.run], drift: 1 },
  // Hard stops and turning back: a held foot may give a little (the owner's "near-zero", about 1-3 cm)
  stopAndGo: { go: (t) => (t % 3 < 1.6 ? [0, GAITS.run] : [0, 0]), drift: 3 },
  turnBack: { go: (t) => (t % 4 < 2 ? [0, GAITS.run] : [0, -GAITS.run]), drift: 3 },
  sprintStop: { go: (t) => (t % 3 < 1.6 ? [0, GAITS.sprint] : [0, 0]), drift: 3 },
};

function run(go: Prog, seconds: number, ground = (_x: number, _z: number) => 0) {
  const an = createAnimator(data);
  const m = newMove(0);
  let x = 0;
  let z = 0;
  let y = 0;
  const out = { drift: 0, step: 0, hipsLo: Infinity, hipsHi: 0, held: 0, onSlope: 0, frames: [] as Float32Array[] };
  const prev = new Float32Array(NB * 4);
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const P = newPosed();
  for (let i = 0; i < seconds * 60; i++) {
    const [gx, gz] = go(i * DT);
    stepMove(m, gx, gz, true, DT);
    x += m.vx * DT;
    z += m.vz * DT;
    y = ground(x, z);
    const sprint = THREE.MathUtils.clamp((Math.hypot(m.vx, m.vz) - GAITS.run) / (GAITS.sprint - GAITS.run), 0, 1);
    an.update({ dt: DT, x, y, z, move: m, gx, gz, scale: SCALE, ground: (px, pz) => ground(px, pz), sprint });
    out.frames.push(an.rot.slice());
    if (i > 60) {
      for (const f of an.feet)
        if (f.locked) {
          out.drift = Math.max(out.drift, f.drift);
          out.held++;
        }
      for (let b = 0; b < NB; b++) out.step = Math.max(out.step, qa.fromArray(prev, b * 4).angleTo(qb.fromArray(an.rot, b * 4)));
      out.hipsLo = Math.min(out.hipsLo, an.hips.y);
      out.hipsHi = Math.max(out.hipsHi, an.hips.y);
      // Where a held foot's ball is over the ground (after the first second up the slope)
      posed(an.rot, 0, an.hips.x, an.hips.y, an.hips.z, P);
      an.feet.forEach((f, k) => {
        if (!f.locked || z < 3.5) return;
        const p = P.pos[TOE_BONES[k]];
        const c = Math.cos(m.face);
        const s = Math.sin(m.face);
        const wx = x + (p.x * c + p.z * s) * SCALE;
        const wz = z + (-p.x * s + p.z * c) * SCALE;
        out.onSlope = Math.max(out.onSlope, Math.abs(y + p.y * SCALE - ground(wx, wz)));
      });
    }
    prev.set(an.rot);
  }
  return out;
}

for (const [name, p] of Object.entries(PROGS))
  test(`${name}: held feet stay put, nothing pops, the hips stay up`, () => {
    const r = run(p.go, 10);
    assert.ok(r.held > 200, `feet held (${r.held} frames)`);
    assert.ok(r.drift * CM < p.drift, `a held foot moved ${(r.drift * CM).toFixed(2)} cm over the ground (under ${p.drift})`);
    // At 60 frames a second no bone turns more than this between frames (a hard stop's knee at most)
    assert.ok(r.step < 0.7, `the biggest turn between frames ${r.step.toFixed(2)} rad`);
    assert.ok(r.hipsLo > 0.49 && r.hipsHi < 0.64, `the hips between ${r.hipsLo.toFixed(3)} and ${r.hipsHi.toFixed(3)}`);
  });

test('up a slope the held feet stand on it, as they do on the flat', () => {
  // (a foot is held until the ball of it lifts off at the end of the step, a few centimetres up: the same on the flat)
  const slope = (_x: number, z: number) => Math.max(0, z - 2) * 0.12;
  const up = run(() => [0, GAITS.run], 6, slope);
  const flat = run(() => [0, GAITS.run], 6);
  assert.ok(up.onSlope < flat.onSlope + 0.02 / SCALE, `the ball of a held foot ${(up.onSlope * CM).toFixed(1)} cm off the slope, ${(flat.onSlope * CM).toFixed(1)} off the flat`);
});

test('the same movement animates the same every time', () => {
  const a = run(PROGS.weave.go, 3).frames;
  const b = run(PROGS.weave.go, 3).frames;
  a.forEach((f, i) => assert.deepEqual(f, b[i]));
});
