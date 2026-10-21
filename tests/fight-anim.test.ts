// The fight animations (fight-anim.ts): every move's clip is as long as the move
// in fight-sim.ts, every one-shot clip starts and ends on the guard (so the view
// can cut between them), the knockdown ends lying and the get-up starts there, the
// striking limb is at full reach on the frame the sim lands the hit, sampling
// interpolates, clamps, wraps and mirrors, blending is linear, and nothing is NaN.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLIPS, CLIP_IDS, KNOCKDOWN_LIE, blendPose, hurtClip, moveClip, newFightPose, sampleClip, type ClipId, type FightPose } from '../src/scripts/city3d/fight-anim';
import { MOVES, MOVE_IDS, T, moveFrames } from '../src/scripts/city3d/fight-sim';

const sample = (id: ClipId, frame: number, mirror = false) => sampleClip(id, frame, newFightPose(), { mirror });
/** Every number of a pose, named */
function numbers(p: FightPose): [string, number][] {
  const out: [string, number][] = [
    ['bob', p.bob],
    ['lean', p.lean],
    ['twist', p.twist],
    ['side', p.side],
    ['headYaw', p.headYaw],
    ['headPitch', p.headPitch],
    ['root.y', p.root.y],
    ['root.pitch', p.root.pitch],
  ];
  for (let i = 0; i < 2; i++) {
    for (const [name, l] of [
      [`arms[${i}]`, p.arms[i]],
      [`legs[${i}]`, p.legs[i]],
    ] as const) {
      out.push([`${name}.fwd`, l.fwd], [`${name}.out`, l.out], [`${name}.bend`, l.bend], [`${name}.twist`, l.twist ?? 0]);
    }
  }
  return out;
}
/** Every number of `a` within `tol` of `b`'s */
function closePose(a: FightPose, b: FightPose, tol: number, what: string) {
  const na = numbers(a);
  const nb = numbers(b);
  for (let i = 0; i < na.length; i++) assert.ok(Math.abs(na[i][1] - nb[i][1]) <= tol, `${what}: ${na[i][0]} is ${na[i][1]}, expected about ${nb[i][1]}`);
}
const GUARD = sample('guard', 0);
const LIMB_OF = { armL: (p: FightPose) => p.arms[0], armR: (p: FightPose) => p.arms[1], legL: (p: FightPose) => p.legs[0], legR: (p: FightPose) => p.legs[1] } as const;

test('every clip in CLIPS is listed once, with keys inside its frames in order', () => {
  assert.deepEqual([...CLIP_IDS].sort(), Object.keys(CLIPS).sort());
  assert.equal(new Set(CLIP_IDS).size, CLIP_IDS.length);
  for (const id of CLIP_IDS) {
    const c = CLIPS[id];
    assert.equal(c.id, id);
    assert.ok(c.frames > 0 && Number.isInteger(c.frames), `${id} frames`);
    assert.ok(c.keys.length >= 2, `${id} has keys`);
    assert.equal(c.keys[0].t, 0, `${id} starts at frame 0`);
    const last = c.keys[c.keys.length - 1].t;
    assert.equal(last, c.loop ? c.frames : c.frames - 1, `${id}'s last key is on its last frame`);
    for (let i = 1; i < c.keys.length; i++) assert.ok(c.keys[i].t > c.keys[i - 1].t, `${id} keys in order`);
    if (c.loopFrom !== undefined) assert.ok(c.loop && c.loopFrom >= 0 && c.loopFrom < c.frames, `${id} loopFrom`);
  }
});

test("every move's clip is exactly as long as the move in the sim", () => {
  for (const m of MOVE_IDS) {
    const id = moveClip(m);
    assert.equal(CLIPS[id].frames, moveFrames(m), `${m} → ${id}`);
    assert.equal(CLIPS[id].loop, false);
  }
  assert.equal(CLIPS.getup.frames, T.getupFrames);
  assert.equal(CLIPS.dodge.frames, 22);
  assert.equal(hurtClip('head'), 'hitHead');
  assert.equal(hurtClip('body'), 'hitBody');
  assert.equal(hurtClip('stagger'), 'stagger');
});

test('every one-shot clip starts and ends on the guard; the block flinch on the block', () => {
  const guardClips: ClipId[] = ['jab', 'cross', 'hook', 'uppercut', 'frontKick', 'roundhouse', 'dodge', 'hitHead', 'hitBody', 'stagger', 'taunt'];
  for (const id of guardClips) {
    const c = CLIPS[id];
    closePose(sample(id, 0), GUARD, 0.15, `${id} frame 0`);
    closePose(sample(id, c.frames - 1), GUARD, 0.15, `${id} last frame`);
    // Something happens in between
    let moved = false;
    for (let f = 1; f < c.frames - 1 && !moved; f++) {
      const p = sample(id, f);
      moved = numbers(p).some(([, v], i) => Math.abs(v - numbers(GUARD)[i][1]) > 0.15);
    }
    assert.ok(moved, `${id} does something`);
  }
  // Loops start on their base and the block's raise starts from the guard
  closePose(sample('victory', 0), GUARD, 0.15, 'victory frame 0');
  closePose(sample('block', 0), GUARD, 0.15, 'block frame 0');
  const hold = sample('block', 8);
  closePose(sample('blockHit', 0), hold, 0.15, 'blockHit frame 0');
  closePose(sample('blockHit', 11), hold, 0.15, 'blockHit last frame');
  closePose(sample('block', 1000), sample('block', 8 + ((1000 - 8) % 40)), 1e-9, 'the block hold loops');
  assert.ok(Math.abs(sample('block', 200).root.pitch) < 1e-9);
});

test('the knockdown ends lying, down lies, and the get-up starts lying and ends in guard', () => {
  const fallen = sample('knockdown', CLIPS.knockdown.frames - 1);
  assert.ok(fallen.root.pitch < -1.2, `knockdown ends tipped back (${fallen.root.pitch})`);
  assert.equal(sample('knockdown', 0).root.pitch, 0);
  // Monotonic: the body tips back and never rights itself on the way down
  let last = 0;
  for (let f = 0; f < CLIPS.knockdown.frames; f++) {
    const pitch = sample('knockdown', f).root.pitch;
    assert.ok(pitch <= last + 0.05, `knockdown frame ${f} keeps tipping back`);
    last = pitch;
  }
  for (let f = 0; f <= 120; f += 10) assert.ok(sample('down', f).root.pitch < -1.2, `down frame ${f} lies`);
  closePose(sample('down', 0), fallen, 0.15, 'down starts where the knockdown ended');
  assert.equal(sample('down', 0).root.pitch, KNOCKDOWN_LIE.root.pitch);
  const up = sample('getup', 0);
  assert.ok(up.root.pitch < -1.2, 'getup starts lying');
  closePose(up, fallen, 0.15, 'getup starts where the knockdown ended');
  closePose(sample('getup', CLIPS.getup.frames - 1), GUARD, 0.15, 'getup ends in guard');
  assert.equal(sample('getup', 100).root.pitch, 0, 'and holds the guard');
});

test("on the first active frame the striking limb leads, at full reach", () => {
  for (const m of MOVE_IDS) {
    const spec = MOVES[m];
    if (spec.kind === 'dodge') continue;
    const id = moveClip(m);
    const at = sample(id, spec.startup);
    const rest = sample(id, 0);
    const limb = LIMB_OF[spec.limb](at);
    const fwds = [...at.arms, ...at.legs].map((l) => l.fwd);
    assert.equal(Math.max(...fwds), limb.fwd, `${m}: ${spec.limb} is the most forward limb`);
    if (spec.kind === 'punch') assert.ok(limb.fwd - LIMB_OF[spec.limb](rest).fwd >= 1.0, `${m}: the arm swings at least a radian past the guard (${limb.fwd})`);
    else assert.ok(limb.fwd > 1.0, `${m}: the leg comes up past a radian (${limb.fwd})`);
    // Still out there on the last active frame, and nothing before the first
    const held = sample(id, spec.startup + spec.active - 1);
    assert.ok(LIMB_OF[spec.limb](held).fwd >= limb.fwd - 0.15, `${m} holds the strike through its active frames`);
    const before = sample(id, spec.startup - 1);
    assert.ok(LIMB_OF[spec.limb](before).fwd < limb.fwd, `${m} is still winding up a frame before`);
  }
  // Punches go out straight-ish, kicks snap the shin out
  assert.ok(sample('jab', MOVES.jab.startup).arms[0].bend < 0.3);
  assert.ok(sample('cross', MOVES.cross.startup).arms[1].bend < 0.3);
  assert.ok(sample('frontKick', MOVES.frontKick.startup).legs[1].bend < 0.3);
  // The guard hand stays up on every punch
  assert.ok(sample('jab', MOVES.jab.startup).arms[1].bend > 2);
  assert.ok(sample('cross', MOVES.cross.startup).arms[0].bend > 2);
});

test('sampling interpolates fractional frames, clamps a one-shot, wraps a loop and mirrors', () => {
  const a = sample('jab', 2);
  const b = sample('jab', 3);
  const mid = sample('jab', 2.5);
  for (const [[, x], [, y], [, z]] of numbers(a).map((v, i) => [v, numbers(b)[i], numbers(mid)[i]] as const)) {
    assert.ok(z >= Math.min(x, y) - 1e-9 && z <= Math.max(x, y) + 1e-9);
  }
  assert.notDeepEqual(numbers(a), numbers(b));
  closePose(sample('jab', 100), sample('jab', CLIPS.jab.frames - 1), 1e-9, 'a one-shot clamps');
  closePose(sample('jab', -5), sample('jab', 0), 1e-9, 'and never goes before its start');
  closePose(sample('guard', 90 + 7.5), sample('guard', 7.5), 1e-9, 'a loop wraps');
  closePose(sample('guard', 90), sample('guard', 0), 1e-9, 'and is seamless');
  closePose(sample('victory', 90), sample('victory', 0), 1e-9, 'victory too');
  // Mirror: the jab becomes a right-hand jab
  const jab = sample('jab', MOVES.jab.startup);
  const m = sample('jab', MOVES.jab.startup, true);
  assert.deepEqual(m.arms[1], { ...jab.arms[0], twist: -(jab.arms[0].twist ?? 0) });
  assert.deepEqual(m.arms[0], { ...jab.arms[1], twist: -(jab.arms[1].twist ?? 0) });
  assert.deepEqual(m.legs[1], { ...jab.legs[0], twist: -(jab.legs[0].twist ?? 0) });
  assert.equal(m.side, -jab.side);
  assert.equal(m.twist, -jab.twist);
  assert.equal(m.headYaw, -jab.headYaw);
  assert.equal(m.headPitch, jab.headPitch);
  assert.equal(m.lean, jab.lean);
  assert.deepEqual(m.root, jab.root);
  // Sampling writes into `out` and returns it
  const out = newFightPose();
  assert.equal(sampleClip('cross', 5, out), out);
});

test('blendPose is linear and reproduces a and b at its ends', () => {
  const a = sample('hook', 10);
  const b = sample('knockdown', 25);
  const out = newFightPose();
  closePose(blendPose(a, b, 0, out), a, 1e-12, 'k 0');
  closePose(blendPose(a, b, 1, out), b, 1e-12, 'k 1');
  blendPose(a, b, 0.25, out);
  const na = numbers(a);
  const nb = numbers(b);
  numbers(out).forEach(([name, v], i) => assert.ok(Math.abs(v - (na[i][1] + (nb[i][1] - na[i][1]) * 0.25)) < 1e-12, name));
  assert.equal(blendPose(a, b, 0.5, out), out);
  assert.equal(newFightPose().root.pitch, 0);
});

test('every sampled number is finite for every clip at every frame (and between)', () => {
  for (const id of CLIP_IDS) {
    const c = CLIPS[id];
    for (let f = 0; f <= c.frames + 1; f += 0.5) {
      for (const mirror of [false, true]) {
        for (const [name, v] of numbers(sample(id, f, mirror))) assert.ok(Number.isFinite(v), `${id} frame ${f}${mirror ? ' mirrored' : ''}: ${name}`);
      }
    }
    // Sane sizes: nothing wild, and the root only drops or lifts a little
    for (let f = 0; f < c.frames; f++) {
      const p = sample(id, f);
      for (const [name, v] of numbers(p)) assert.ok(Math.abs(v) <= Math.PI, `${id} frame ${f}: ${name} = ${v}`);
      assert.ok(Math.abs(p.root.y) <= 0.2 && p.root.pitch <= 0 && p.root.pitch >= -1.6, `${id} frame ${f}: root`);
    }
  }
  assert.ok(Number.isFinite(sample('jab', NaN).bob));
});
