// Degen's animation from motion capture (animation Phase 1, animator.ts): the leg IK reaches what
// it's asked without ever bending a knee backwards; over every kind of running, walking, stopping
// and turning a held foot stays put on the ground, nothing pops from one frame to the next, the hips
// stay at a person's height; up a slope the held feet stand on it; and it's the same every time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { FACE, createAnimator, twoBone } from '../src/scripts/city3d/animator';
import { MB, NB, TOE_BONES, decodeMocap, newPosed, posed } from '../src/scripts/city3d/mocap';
import { wrap } from '../src/scripts/city3d/inertia';
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
  // Phase 2: setting off the way he's facing away from, jogging between gaits, changing gait mid-stride
  startBack: { go: (t) => (t % 4 < 1 ? [0, 0] : t % 8 < 4 ? [0, -GAITS.run] : [0, GAITS.run]), drift: 1.5 },
  jog: { go: () => [0, 2], drift: 1 },
  speedChange: { go: (t) => [0, [GAITS.walk, GAITS.run, GAITS.sprint, GAITS.run][Math.floor(t / 2) % 4]], drift: 1 },
};

function run(go: Prog, seconds: number, ground = (_x: number, _z: number) => 0, feetOn?: (x: number, z: number) => number) {
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
    an.update({ dt: DT, x, y, z, move: m, gx, gz, scale: SCALE, ground: (px, pz) => ground(px, pz), feet: feetOn, sprint });
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
        const c = Math.cos(an.face);
        const s = Math.sin(an.face);
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

test('standing still he settles into the idle, and stays in it', () => {
  const an = createAnimator(data);
  const m = newMove(0);
  let z = 0;
  let idle = 0;
  let jumps = 0;
  for (let i = 0; i < 60 * 11; i++) {
    const gz = i < 60 ? GAITS.run : 0;
    stepMove(m, 0, gz, true, DT);
    z += m.vz * DT;
    an.update({ dt: DT, x: 0, y: 0, z, move: m, gx: 0, gz, scale: SCALE, ground: () => 0, sprint: 0 });
    if (i === 60 * 2) jumps = an.debug.jumps;
    if (i > 60 * 2 && an.debug.clip.startsWith('idle')) idle++;
  }
  assert.ok(idle > 60 * 8.5, `in the idle ${(idle / 60).toFixed(1)} s of 9`);
  const rate = (an.debug.jumps - jumps) / 9;
  assert.ok(rate < 1.5, `${rate.toFixed(1)} jumps a second standing`);
});

test('he\'s shown turning as the capture turns, never far from where the springs face', () => {
  const an = createAnimator(data);
  const m = newMove(0);
  let x = 0;
  let z = 0;
  let worst = 0;
  let behind = 0;
  for (let i = 0; i < 60 * 8; i++) {
    const t = i * DT;
    const [gx, gz] = PROGS.startBack.go(t);
    stepMove(m, gx, gz, true, DT);
    x += m.vx * DT;
    z += m.vz * DT;
    an.update({ dt: DT, x, y: 0, z, move: m, gx, gz, scale: SCALE, ground: () => 0, sprint: 0 });
    const off = Math.abs(wrap(an.face - m.face));
    worst = Math.max(worst, off);
    // Half a second into running one way, he faces it
    if (t % 4 > 1.5 && t % 4 < 3.9) behind = Math.max(behind, off);
  }
  assert.ok(worst <= FACE.most + 1e-6, `at most ${worst.toFixed(2)} rad from the springs`);
  assert.ok(behind < 0.08, `settled to within ${behind.toFixed(3)} rad`);
});

test('up and down kerbs the feet stand on the slab and the road, never in them', () => {
  const kerbs = (_x: number, z: number) => (z > 4 && z < 9 ? 0.15 : 0.035);
  for (const speed of [GAITS.walk, GAITS.run, GAITS.sprint]) {
    const an = createAnimator(data);
    const m = newMove(0);
    let z = 0;
    let y = 0.035;
    let into = 0;
    let step = 0;
    const prev = new Float32Array(NB * 4);
    const qa = new THREE.Quaternion();
    const qb = new THREE.Quaternion();
    const P = newPosed();
    for (let i = 0; i < 60 * 4; i++) {
      stepMove(m, 0, speed, true, DT);
      z += m.vz * DT;
      // (his height eased up a kerb, as walk.ts does)
      const g = kerbs(0, z);
      y = y < g - 0.05 ? y + (g - y) * (1 - Math.exp(-20 * DT)) : g;
      an.update({ dt: DT, x: 0, y, z, move: m, gx: 0, gz: speed, scale: SCALE, ground: kerbs, sprint: THREE.MathUtils.clamp((speed - GAITS.run) / (GAITS.sprint - GAITS.run), 0, 1) });
      posed(an.rot, 0, an.hips.x, an.hips.y, an.hips.z, P);
      for (const k of [0, 1]) {
        const p = P.pos[TOE_BONES[k]];
        // (a ball of the foot within a centimetre of a kerb's edge is on its lip, either side)
        const wz = z + (-p.x * Math.sin(an.face) + p.z * Math.cos(an.face)) * SCALE;
        into = Math.max(into, Math.min(kerbs(0, wz - 0.006), kerbs(0, wz + 0.006)) - (y + p.y * SCALE));
      }
      if (i > 30) for (let b = 0; b < NB; b++) step = Math.max(step, qa.fromArray(prev, b * 4).angleTo(qb.fromArray(an.rot, b * 4)));
      prev.set(an.rot);
    }
    assert.ok(into < 0.03, `at ${speed}: the ball of a foot ${(into * CM).toFixed(1)} cm into the ground (its own height is up to 2 cm)`);
    assert.ok(step < 0.9, `at ${speed}: the biggest turn between frames ${step.toFixed(2)} rad`);
  }
});

test('up a flight of Liberty Bridge\'s size the feet climb the treads (he walks up its even ramp)', () => {
  const RISE = 0.23;
  const RUN = 0.31;
  const N = 15;
  const Z0 = 1.5;
  const ramp = (_x: number, z: number) => THREE.MathUtils.clamp(((z - Z0) / (RUN * N)) * RISE * N, 0, RISE * N);
  const tread = (_x: number, z: number) => (z < Z0 ? 0 : z >= Z0 + RUN * N ? RISE * N : (Math.floor((z - Z0) / RUN) + 1) * RISE);
  for (const speed of [GAITS.walk, 1.75]) {
    const an = createAnimator(data);
    const m = newMove(0);
    let z = 0;
    let into = 0;
    let step = 0;
    const off: number[] = [];
    const held = [0, 0];
    const prev = new Float32Array(NB * 4);
    const qa = new THREE.Quaternion();
    const qb = new THREE.Quaternion();
    const P = newPosed();
    for (let i = 0; i < 60 * 5; i++) {
      stepMove(m, 0, speed, true, DT);
      z += m.vz * DT;
      const y = ramp(0, z);
      an.update({ dt: DT, x: 0, y, z, move: m, gx: 0, gz: speed, scale: SCALE, ground: ramp, feet: tread, sprint: 0 });
      const on = z > Z0 + 0.5 && z < Z0 + RUN * N - 0.5;
      if (on) for (let b = 0; b < NB; b++) step = Math.max(step, qa.fromArray(prev, b * 4).angleTo(qb.fromArray(an.rot, b * 4)));
      prev.set(an.rot);
      if (!on) continue;
      posed(an.rot, 0, an.hips.x, an.hips.y, an.hips.z, P);
      for (const k of [0, 1]) {
        const p = P.pos[TOE_BONES[k]];
        const wz = z + (-p.x * Math.sin(an.face) + p.z * Math.cos(an.face)) * SCALE;
        const wy = y + p.y * SCALE;
        into = Math.max(into, tread(0, wz) - wy);
        held[k] = an.feet[k].locked ? held[k] + 1 : 0;
        if (held[k] > 3) off.push(Math.abs(wy - an.feet[k].lockG));
      }
    }
    off.sort((a, b) => a - b);
    assert.ok(off.length > 40, `feet held on the treads (${off.length} frames)`);
    assert.ok(off[Math.floor(off.length * 0.95)] < 0.21 / SCALE, `a held ball within ${(off[Math.floor(off.length * 0.95)] * CM).toFixed(1)} cm of its tread`);
    assert.ok(into < 0.1, `at ${speed}: the ball of a foot ${(into * CM).toFixed(1)} cm into a step`);
    assert.ok(step < 0.8, `at ${speed}: the biggest turn between frames ${step.toFixed(2)} rad`);
  }
});

/* ---------- Phase 3: jumps, falls and landings ---------- */

const JUMP = 3.9;
const GRAVITY = 11.5;
/**
 * walk.ts's jumping: gravity always, Jump pressed at `at` and held `hold`
 * seconds (let go early it pulls down harder), the stick asking for
 * `speed` (none after `stop`), over ground `ground`
 */
function jump(o: { speed: number; at?: number; hold?: number; stop?: number; ground?: (x: number, z: number) => number; seconds?: number }) {
  const an = createAnimator(data);
  const m = newMove(0);
  const ground = o.ground ?? (() => 0);
  const at = o.at ?? 2;
  let z = 0;
  let y = ground(0, 0);
  let vy = 0;
  let grounded = true;
  const P = newPosed();
  const prev = new Float32Array(NB * 4);
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const out = { below: 0, step: 0, heldInAir: 0, airFrames: 0, takeoff: '', landedOn: '', landedAt: -1, upAt: -1, squash: 0, arms: 0, after: 0, frames: [] as Float32Array[] };
  for (let i = 0; i < (o.seconds ?? 4) * 60; i++) {
    const t = i * DT;
    const gz = o.stop !== undefined && t > o.stop ? 0 : o.speed;
    stepMove(m, 0, gz, grounded, DT);
    z += m.vz * DT;
    if (o.at !== undefined || !o.ground) {
      if (Math.abs(t - at) < DT / 2 && grounded) {
        vy = JUMP;
        grounded = false;
      }
    }
    vy -= (GRAVITY + (t > at + (o.hold ?? 1) && vy > 0 ? 16 : 0)) * DT;
    y += vy * DT;
    const fall = vy;
    const g = ground(0, z);
    const was = grounded;
    if (y <= g) {
      y = g;
      vy = 0;
      grounded = true;
    } else if (y > g + 0.04) grounded = false;
    an.update({ dt: DT, x: 0, y, z, move: m, gx: 0, gz, scale: SCALE, ground, sprint: THREE.MathUtils.clamp((o.speed - GAITS.run) / (GAITS.sprint - GAITS.run), 0, 1), grounded, vy: grounded ? fall : vy, jump: JUMP, gravity: GRAVITY });
    const d = an.debug;
    out.frames.push(an.rot.slice());
    if (d.air && out.upAt < 0) {
      out.upAt = t;
      out.takeoff = d.clip;
    }
    if (d.air) {
      out.airFrames++;
      if (an.feet.some((f) => f.locked)) out.heldInAir++;
      out.arms = Math.max(out.arms, d.arms);
    }
    if (grounded && !was && out.landedAt < 0 && out.upAt >= 0) {
      out.landedAt = t;
      out.landedOn = d.clip;
    }
    out.squash = Math.max(out.squash, d.squash);
    // (how fast the clip half a second after landing goes, rig numbers a second)
    if (out.landedAt >= 0 && Math.abs(t - out.landedAt - 0.5) < DT / 2) {
      const ci = an.db.clips.findIndex((c) => c.name === d.clip);
      out.after = an.db.speed[an.db.start[ci] + Math.round(d.frame)];
    }
    // How far the feet (ankles and balls) go into the ground, and the biggest turn between frames
    posed(an.rot, 0, an.hips.x, an.hips.y, an.hips.z, P);
    for (const b of [MB.footL, MB.footR, ...TOE_BONES]) {
      const p = P.pos[b];
      out.below = Math.max(out.below, ground(0, z + (-p.x * Math.sin(an.face) + p.z * Math.cos(an.face)) * SCALE) - (y + p.y * SCALE));
    }
    if (i > 30) for (let b = 0; b < NB; b++) out.step = Math.max(out.step, qa.fromArray(prev, b * 4).angleTo(qb.fromArray(an.rot, b * 4)));
    prev.set(an.rot);
  }
  return out;
}
const flat = jump({ speed: GAITS.run, at: 99 });
const clipOf = (name: string) => name.replace('~', '');

test('a running jump takes off from a running take-off, flies free and lands running on', () => {
  for (const speed of [GAITS.run, GAITS.sprint]) {
    const r = jump({ speed });
    assert.ok(r.upAt >= 2 && r.upAt < 2.05, `into the air at once (${r.upAt.toFixed(2)} s)`);
    assert.ok(clipOf(r.takeoff).startsWith('run-jump'), `from a running jump (${r.takeoff})`);
    assert.equal(r.heldInAir, 0, 'no foot held in the air');
    assert.ok(r.landedAt > 2.5, 'down again');
    assert.ok(r.after > 1.5, `running on after it (the clip half a second after landing goes ${r.after.toFixed(2)})`);
    assert.ok(r.below < flat.below + 0.02 / SCALE, `the feet ${(r.below * CM).toFixed(1)} cm into the ground at most (running on the flat: ${(flat.below * CM).toFixed(1)})`);
    assert.ok(r.step < 0.7, `the biggest turn between frames ${r.step.toFixed(2)} rad`);
  }
});

test('a standing jump takes off from both feet and lands standing, settling back into the idle', () => {
  const an = jump({ speed: 0, seconds: 5 });
  assert.equal(clipOf(an.takeoff), 'jump-high');
  assert.equal(clipOf(an.landedOn), 'jump-high', 'its own landing plays');
  assert.equal(an.heldInAir, 0);
  assert.ok(an.below < flat.below + 0.02 / SCALE, `the feet ${(an.below * CM).toFixed(1)} cm into the ground at most`);
  assert.ok(an.step < 0.7, `the biggest turn between frames ${an.step.toFixed(2)} rad`);
  // ...and is back in the idle a second after
  const r = createAnimator(data);
  const m = newMove(0);
  let y = 0;
  let vy = 0;
  let grounded = true;
  let idle = 0;
  for (let i = 0; i < 60 * 5; i++) {
    stepMove(m, 0, 0, grounded, DT);
    if (i === 120) {
      vy = JUMP;
      grounded = false;
    }
    vy -= GRAVITY * DT;
    y += vy * DT;
    const fall = vy;
    if (y <= 0) {
      y = vy = 0;
      grounded = true;
    }
    r.update({ dt: DT, x: 0, y, z: 0, move: m, gx: 0, gz: 0, scale: SCALE, ground: () => 0, sprint: 0, grounded, vy: grounded ? fall : vy });
    if (i > 60 * 3.7 && r.debug.clip.startsWith('idle')) idle++;
  }
  assert.ok(idle > 60 * 1.2, `in the idle ${(idle / 60).toFixed(1)} s of the last 1.3`);
});

test('let go early, a short hop flies its flight through in time to land', () => {
  const hop = jump({ speed: GAITS.run, hold: 0.06 });
  const full = jump({ speed: GAITS.run });
  assert.ok(hop.landedAt - hop.upAt < (full.landedAt - full.upAt) * 0.75, `a hop ${(hop.landedAt - hop.upAt).toFixed(2)} s up, a jump ${(full.landedAt - full.upAt).toFixed(2)}`);
  assert.equal(hop.heldInAir, 0);
  assert.ok(hop.step < 0.7, `the biggest turn between frames ${hop.step.toFixed(2)} rad`);
});

test('off a ledge he falls without a jump, a long fall raises his arms, and a hard landing squashes him down', () => {
  for (const [h, hard] of [
    [0.6, false],
    [2, true],
    [4, true],
  ] as const) {
    const ledge = (_x: number, z: number) => (z < 6 ? h : 0);
    const r = jump({ speed: GAITS.run, ground: ledge, seconds: 4 });
    assert.ok(r.upAt > 0, `${h}: a fall`);
    assert.ok(r.landedAt > r.upAt, `${h}: down again`);
    assert.equal(r.heldInAir, 0, `${h}: no foot held in the air`);
    // (2 tiles down he lands at about 6.8 tiles a second; 0.6 down, about 3.7: no harder than a jump on the flat)
    if (hard) assert.ok(r.squash > 0.04, `${h}: the hips squashed ${(r.squash * SCALE * CM).toFixed(1)} cm`);
    else assert.ok(r.squash < 1e-3, `${h}: no squash (${r.squash})`);
    if (h === 4) assert.ok(r.arms > 0.2, `a long fall: the arms up ${r.arms.toFixed(2)} rad`);
    assert.ok(r.below < flat.below + 0.02 / SCALE, `${h}: the feet ${(r.below * CM).toFixed(1)} cm into the ground at most`);
    assert.ok(r.step < 0.75, `${h}: the biggest turn between frames ${r.step.toFixed(2)} rad`);
  }
});

test('stepping down a kerb isn\'t a fall', () => {
  const kerb = (_x: number, z: number) => (z < 5 ? 0.15 : 0);
  const r = jump({ speed: GAITS.run, ground: kerb, seconds: 3 });
  assert.ok(r.upAt < 0, 'still on the ground');
});

test('jumps animate the same every time', () => {
  const a = jump({ speed: GAITS.run, hold: 0.3 }).frames;
  const b = jump({ speed: GAITS.run, hold: 0.3 }).frames;
  a.forEach((f, i) => assert.deepEqual(f, b[i]));
});
