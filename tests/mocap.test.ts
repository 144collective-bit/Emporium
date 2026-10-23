// Degen's motion capture (animation Phase 1: bvh.ts, mocap-build.ts, mocap.ts): the BVH reader, the
// clips file is exactly what the pipeline makes from the takes, the clips stand on the ground with
// their feet, the run loop closes, mirroring, the feet's contacts and the file's size.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { parseBvh, poseBvh, jointIndex } from '../src/scripts/city3d/bvh';
import { buildMocap, type Take } from '../src/scripts/city3d/mocap-build';
import { MB, MOCAP_BONES, MOCAP_FPS, NB, PARENT, contacts, decodeMocap, encodeMocap, mirrorClip, newPosed, posedFrame } from '../src/scripts/city3d/mocap';
import { ANKLE_H, BONES } from '../src/scripts/city3d/skeleton';

const takes: Take[] = JSON.parse(readFileSync('assets/mocap/takes.json', 'utf8'));
const read = (file: string) => parseBvh(readFileSync(`assets/mocap/${file}`, 'utf8'));
const file = readFileSync('src/data/mocap/clips.bin');
const data = decodeMocap(file);
const clip = (name: string) => data.clips.find((c) => c.name === name)!;

test('the BVH reader: the skeleton, the frames, the T-pose first', () => {
  const b = read('cmu/143_01.bvh');
  assert.equal(b.joints.length, 31);
  assert.equal(Math.round(1 / b.frameTime), 120);
  assert.equal(b.frames.length, 101);
  assert.ok(b.joints[jointIndex(b, 'Head')].end, 'the head ends in an End Site');
  // Frame 0 is cgspeed's T-pose: the arms straight out
  const p = poseBvh(b, 0);
  const arm = p.pos[jointIndex(b, 'LeftForeArm')].clone().sub(p.pos[jointIndex(b, 'LeftArm')]).normalize();
  assert.ok(Math.abs(arm.y) < 0.2, `the T-pose's arm is level (${arm.y.toFixed(2)})`);
});

test('the clips file is exactly what the pipeline makes from the takes (npm run mocap)', () => {
  const made = encodeMocap(buildMocap(takes, read));
  assert.equal(made.length, file.length, 'same size');
  assert.ok(Buffer.from(made).equals(file), 'same bytes: run `npm run mocap` after changing a take or the pipeline');
});

test('every clip carries the body bones, parents first, turns kept to their 16 bits', () => {
  assert.equal(NB, 22);
  for (const b of MOCAP_BONES) assert.ok(BONES.includes(b), b);
  PARENT.forEach((p, i) => assert.ok(p < i, `${MOCAP_BONES[i]}'s parent comes first`));
  assert.equal(data.fps, MOCAP_FPS);
  assert.equal(data.clips.length, takes.length);
  // Round trip: what's decoded re-encodes to the same file
  assert.ok(Buffer.from(encodeMocap(data)).equals(file));
  for (const c of data.clips)
    for (let i = 0; i < c.frames * NB; i++) {
      const l = Math.hypot(c.rot[i * 4], c.rot[i * 4 + 1], c.rot[i * 4 + 2], c.rot[i * 4 + 3]);
      assert.ok(Math.abs(l - 1) < 1e-4, `${c.name}: unit turns`);
    }
});

test('the clips stand on the ground: ankles at their height, the balls of the feet on it, the hips at a person\'s', () => {
  const P = newPosed();
  for (const c of data.clips) {
    let ankle = Infinity;
    let ball = Infinity;
    let hips = 0;
    for (let f = 0; f < c.frames; f++) {
      posedFrame(c, f, P);
      ankle = Math.min(ankle, P.pos[MB.footL].y, P.pos[MB.footR].y);
      ball = Math.min(ball, P.pos[MB.toeL].y, P.pos[MB.toeR].y);
      hips += c.hips[f * 3 + 1] / c.frames;
    }
    assert.ok(Math.abs(ankle - ANKLE_H) < 0.02, `${c.name}: the lowest ankle ${ankle.toFixed(3)}`);
    assert.ok(ball > -0.035 && ball < 0.02, `${c.name}: the lowest ball of a foot ${ball.toFixed(3)}`);
    assert.ok(hips > 0.5 && hips < 0.63, `${c.name}: the hips ${hips.toFixed(3)} up on average`);
  }
});

test('the run loop runs straight on +z at a steady speed and closes on itself', () => {
  const c = clip('run-loop');
  const speed = (f: number) => Math.hypot(c.root[(f + 1) * 3] - c.root[f * 3], c.root[(f + 1) * 3 + 1] - c.root[f * 3 + 1]) * MOCAP_FPS;
  const s0 = speed(0);
  assert.ok(s0 > 3.5 && s0 < 4.6, `about the actor's run (${s0.toFixed(2)} rig numbers a second)`);
  for (let f = 0; f < c.frames - 1; f++) {
    assert.ok(Math.abs(speed(f) - s0) < 1e-3, 'steady');
    assert.ok(Math.abs(c.root[f * 3]) < 1e-6 && Math.abs(c.root[f * 3 + 2]) < 1e-6, 'straight on +z');
  }
  // One cycle on, the pose is where it started (the seam is spread over the cycle)
  const cycle = c.frames / 6;
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  let worst = 0;
  for (let b = 0; b < NB; b++) {
    qa.fromArray(c.rot, (0 * NB + b) * 4);
    qb.fromArray(c.rot, (cycle * NB + b) * 4);
    worst = Math.max(worst, qa.angleTo(qb));
  }
  assert.ok(worst < 1e-3, `the cycle closes (${worst.toFixed(4)} rad)`);
});

test('a mirrored clip is left for right, and mirroring twice gives the clip back', () => {
  const c = clip('run-stop');
  const m = mirrorClip(c);
  const back = mirrorClip(m);
  assert.equal(m.name, 'run-stop~');
  for (let f = 0; f < c.frames; f++) {
    assert.equal(m.root[f * 3], -c.root[f * 3]);
    assert.equal(m.root[f * 3 + 2], -c.root[f * 3 + 2]);
  }
  for (let i = 0; i < c.rot.length; i++) assert.equal(back.rot[i], c.rot[i]);
  // The left foot of the mirror is where the right one was, across the middle
  const P = newPosed();
  const Q = newPosed();
  posedFrame(c, 20, P);
  posedFrame(m, 20, Q);
  assert.ok(Math.abs(Q.pos[MB.footL].x + P.pos[MB.footR].x) < 1e-5 && Math.abs(Q.pos[MB.footL].z - P.pos[MB.footR].z) < 1e-5);
});

test('the feet are on the ground about as long as a run and a walk keep them', () => {
  const share = (name: string) => {
    const c = clip(name);
    const ct = contacts(c);
    let down = 0;
    for (let i = 0; i < ct.length; i++) down += ct[i];
    return down / ct.length;
  };
  const run = share('run-loop');
  assert.ok(run > 0.15 && run < 0.42, `running, each foot down ${(run * 100).toFixed(0)}% of the time`);
  const walk = share('walk-eight');
  assert.ok(walk > 0.5 && walk < 0.85, `walking, each foot down ${(walk * 100).toFixed(0)}% of the time`);
  // Standing at the end of a stop: both down
  const c = clip('run-stop');
  const ct = contacts(c);
  assert.equal(ct[(c.frames - 1) * 2], 1);
  assert.equal(ct[(c.frames - 1) * 2 + 1], 1);
});

test('the clips file stays small (it loads when walking starts)', () => {
  assert.ok(file.length < 400 * 1024, `${(file.length / 1024).toFixed(0)} KB`);
});
