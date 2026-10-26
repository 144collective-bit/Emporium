// Degen's motion capture (animation Phase 1: bvh.ts, mocap-build.ts, mocap.ts): the BVH reader, the
// clips file is exactly what the pipeline makes from the takes, the clips stand on the ground with
// their feet, the run loop closes, mirroring, the feet's contacts and the file's size.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { parseBvh, poseBvh, jointIndex } from '../src/scripts/city3d/bvh';
import { buildMocap, packs, type Take } from '../src/scripts/city3d/mocap-build';
import { CORE_PACK, MB, MOCAP_BONES, MOCAP_FPS, NB, PARENT, contacts, decodeMocap, encodeMocap, mirrorClip, newPosed, posedFrame, tagged } from '../src/scripts/city3d/mocap';
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
    let down = 0;
    // (the hips' height while a foot is down: the jumps' flights are higher)
    const on = contacts(c);
    for (let f = 0; f < c.frames; f++) {
      posedFrame(c, f, P);
      ankle = Math.min(ankle, P.pos[MB.footL].y, P.pos[MB.footR].y);
      ball = Math.min(ball, P.pos[MB.toeL].y, P.pos[MB.toeR].y);
      if (!on[f * 2] && !on[f * 2 + 1]) continue;
      hips += c.hips[f * 3 + 1];
      down++;
    }
    hips /= down;
    // (a stairs clip's hips are kept over a line through its steps: a planted foot sits up to half a step either side)
    const stairs = tagged(c, 'stairs');
    assert.ok(stairs ? ankle > ANKLE_H - 0.08 && ankle < ANKLE_H + 0.02 : Math.abs(ankle - ANKLE_H) < 0.02, `${c.name}: the lowest ankle ${ankle.toFixed(3)}`);
    assert.ok(ball > (stairs ? -0.09 : -0.035) && ball < 0.02, `${c.name}: the lowest ball of a foot ${ball.toFixed(3)}`);
    // (lower crouched: subject 136's crouched walks)
    const [lo, hi] = c.name.startsWith('crouch') ? [0.44, 0.56] : [0.5, 0.63];
    assert.ok(hips > lo && hips < hi, `${c.name}: the hips ${hips.toFixed(3)} up on average`);
  }
});

test('the run loop runs straight on +z at a steady speed and closes on itself', () => {
  const c = clip('run-loop');
  const speed = (f: number) => Math.hypot(c.root[(f + 1) * 3] - c.root[f * 3], c.root[(f + 1) * 3 + 1] - c.root[f * 3 + 1]) * MOCAP_FPS;
  const s0 = speed(0);
  // (subject 143's run at its real 60 frames a second: a jog of about 3.4 m/s at his size)
  assert.ok(s0 > 1.9 && s0 < 2.6, `about the actor's run (${s0.toFixed(2)} rig numbers a second)`);
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
  // (subject 143's takes at their real speed are twice as long as when they played at double speed;
  // delta-coded since the revamp's Phase 1: 495 KB where plain 16-bit numbers made 703)  // (the revamp's Phase 2: three standing takes, a fast walk and the climb in, the three looped idles out, 558 KB; the
  // limit raised on purpose)
  assert.ok(file.length < 640 * 1024, `${(file.length / 1024).toFixed(0)} KB`);
});

test('every clip carries its tags, marks and pack, through the file and its mirror image', () => {
  for (const c of data.clips) {
    const t = takes.find((k) => k.name === c.name)!;
    assert.deepEqual(c.tags, t.tags ?? [], `${c.name}: its tags`);
    assert.equal(c.pack, t.pack ?? CORE_PACK);
    assert.deepEqual(mirrorClip(c).tags, c.tags);
  }
  assert.ok(data.clips.filter((c) => tagged(c, 'stand')).length >= 3, 'the idles are tagged stand');
  assert.ok(data.clips.filter((c) => tagged(c, 'crouch')).length === 3, 'the crouched walks are tagged crouch');
  // A mark survives the file, mirrored across the middle
  const d = { fps: data.fps, clips: [{ ...data.clips[0], marks: [{ name: 'hand', frame: 12, at: [0.25, 0.5, 0.375] as [number, number, number] }] }] };
  const back = decodeMocap(encodeMocap(d));
  assert.deepEqual(back.clips[0].marks, d.clips[0].marks);
  assert.deepEqual(mirrorClip(back.clips[0]).marks[0].at, [-0.25, 0.5, 0.375]);
  // A stairs take's floor and contacts survive the file; mirrored, the floor is the floor and the contacts swap sides
  const st = data.clips.find((c) => tagged(c, 'stairs'))!;
  assert.ok(st.floor && st.contact, 'a stairs clip carries its floor and contacts');
  const sb = decodeMocap(encodeMocap({ fps: data.fps, clips: [st] })).clips[0];
  assert.deepEqual(Array.from(sb.floor!), Array.from(st.floor!));
  assert.deepEqual(Array.from(sb.contact!), Array.from(st.contact!));
  const sm = mirrorClip(st);
  assert.deepEqual(Array.from(sm.floor!), Array.from(st.floor!));
  assert.ok(Array.from(st.contact!).every((b, f) => sm.contact![f] === (((b & 1) << 1) | ((b >> 1) & 1))), 'the mirror\'s contacts swap sides');
  assert.equal(data.clips.find((c) => !tagged(c, 'stairs'))!.floor, undefined, 'a flat clip has no floor of its own');
  // The packs: everything is the core's today (one file)
  assert.deepEqual(packs(data).map((p) => [p.pack, p.file, p.data.clips.length]), [[CORE_PACK, 'clips.bin', data.clips.length]]);
});

test('the collarbones sit level, as Degen\'s do at rest (the capture\'s own shoulder joint sits at the neck and would shrug them)', () => {
  const q = new THREE.Quaternion();
  for (const c of data.clips)
    for (const b of [MB.clavL, MB.clavR]) {
      let most = 0;
      for (let f = 0; f < c.frames; f++) most = Math.max(most, q.fromArray(c.rot, (f * NB + b) * 4).angleTo(new THREE.Quaternion()));
      assert.ok(most < 0.35, `${c.name}: a collarbone turned ${most.toFixed(2)} rad`);
    }
});

test('the hands carry on from the forearms, calm (the capture\'s finger base sits on the wrist, so the hand is aimed at the index knuckle)', () => {
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (const c of data.clips)
    for (const b of [MB.handL, MB.handR]) {
      let side = 0;
      let most = 0;
      let step = 0;
      const prev = new THREE.Quaternion();
      for (let f = 0; f < c.frames; f++) {
        q.fromArray(c.rot, (f * NB + b) * 4);
        if (f) step = Math.max(step, prev.angleTo(q));
        prev.copy(q);
        e.setFromQuaternion(q, 'YXZ');
        side = Math.max(side, Math.abs(e.z));
        most = Math.max(most, q.angleTo(new THREE.Quaternion()));
      }
      // (a wrist bends sideways about 20-30 degrees at most; the hand once stood out 80 degrees from every forearm)
      assert.ok(side < 0.45, `${c.name}: a hand bent ${(side * 57.3).toFixed(0)}° sideways at the wrist`);
      assert.ok(most < 0.6, `${c.name}: a hand turned ${(most * 57.3).toFixed(0)}° from its forearm`);
      // (calmed: the capture's hand once jumped 40° in a frame)
      assert.ok(step < 0.07, `${c.name}: a hand jumped ${(step * 57.3).toFixed(1)}° in a frame`);
    }
});

test('no bone jumps away for a frame and straight back (the capture\'s glitches are put back between their neighbours)', () => {
  const a = new THREE.Quaternion();
  const b = new THREE.Quaternion();
  const c = new THREE.Quaternion();
  for (const clip of data.clips)
    for (let k = 0; k < NB; k++)
      for (let f = 1; f < clip.frames - 1; f++) {
        a.fromArray(clip.rot, ((f - 1) * NB + k) * 4);
        b.fromArray(clip.rot, (f * NB + k) * 4);
        c.fromArray(clip.rot, ((f + 1) * NB + k) * 4);
        const there = a.angleTo(b);
        const back = b.angleTo(c);
        // (walk-eight's spine, chest and neck once threw 24-49° for a single frame)
        assert.ok(!(there > 0.14 && back > 0.14 && a.angleTo(c) < 0.5 * Math.min(there, back)), `${clip.name}: bone ${k} jumps away and back at frame ${f}`);
      }
});

test('the stairs take: the floor climbs three steps, the hips stay level over it, the feet take turns on the steps', () => {
  // (one take, 122_32: 122_31 and 122_35 flipped an ankle for two frames each, a marker swap, and went)
  const st = data.clips.filter((c) => tagged(c, 'stairs'));
  assert.equal(st.length, 1);
  for (const c of st) {
    const floor = c.floor!;
    const rise = floor[c.frames - 1] - floor[0];
    assert.ok(rise > 0.3 && rise < 0.42, `${c.name}: climbs ${rise.toFixed(3)} (three steps of about 0.12)`);
    assert.ok(floor.every((y, f) => f === 0 || y >= floor[f - 1] - 0.02), `${c.name}: the floor never drops`);
    // (the hips over the floor as a level walk's: never the climb's 0.35 in them)
    let lo = Infinity;
    let hi = 0;
    for (let f = 0; f < c.frames; f++) {
      lo = Math.min(lo, c.hips[f * 3 + 1]);
      hi = Math.max(hi, c.hips[f * 3 + 1]);
    }
    assert.ok(hi - lo < 0.12 && lo > 0.5, `${c.name}: the hips ${lo.toFixed(3)}..${hi.toFixed(3)} over the floor`);
    // The contacts: planted stretches that take turns, at least five of them through the climb
    const on = contacts(c);
    let stretches = 0;
    let last = -1;
    for (let f = 1; f < c.frames; f++)
      for (let s = 0; s < 2; s++)
        if (on[f * 2 + s] && !on[(f - 1) * 2 + s]) {
          assert.notEqual(s, last, `${c.name}: the feet take turns (frame ${f})`);
          last = s;
          stretches++;
        }
    assert.ok(stretches >= 5, `${c.name}: ${stretches} steps`);
  }
});
