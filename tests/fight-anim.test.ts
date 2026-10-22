// The fight animations (fight-anim.ts): every move's clip is as long as the move
// in fight-sim.ts, every one-shot clip starts and ends on the guard (so the view
// can cut between them), the knockdown ends lying with the hips on the canvas
// (pivoting at the hips) and the get-up starts there, the striking limb is at
// full reach on the frame the sim lands the hit, the wrists turn the hook and
// the uppercut over, sampling interpolates, clamps, wraps and mirrors (the
// wrists' roll with it), blending is linear (the wrists and the pivot too), and
// nothing is NaN.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLIPS, CLIP_IDS, KNOCKDOWN_LIE, PELVIS, blendPose, hipHeight, hurtClip, hurtMirror, moveClip, newFightPose, rootShift, sampleClip, type ClipId, type FightPose } from '../src/scripts/city3d/fight-anim';
import { MOVES, MOVE_IDS, T, moveFrames } from '../src/scripts/city3d/fight-sim';

const sample = (id: ClipId, frame: number, mirror = false) => sampleClip(id, frame, newFightPose(), { mirror });
/** Every number of a pose, named */
function numbers(p: FightPose): [string, number][] {
  const out: [string, number][] = [
    ['bob', p.bob],
    ['lean', p.lean],
    ['twist', p.twist],
    ['side', p.side],
    ['turn', p.turn],
    ['sway', p.sway],
    ['headYaw', p.headYaw],
    ['headPitch', p.headPitch],
    ['root.y', p.root.y],
    ['root.pitch', p.root.pitch],
    ['root.pivot', p.root.pivot],
  ];
  for (let i = 0; i < 2; i++) {
    for (const [name, l] of [
      [`arms[${i}]`, p.arms[i]],
      [`legs[${i}]`, p.legs[i]],
    ] as const) {
      out.push([`${name}.fwd`, l.fwd], [`${name}.out`, l.out], [`${name}.bend`, l.bend], [`${name}.twist`, l.twist ?? 0]);
    }
    out.push([`arms[${i}].wrist.roll`, p.arms[i].wrist?.roll ?? 0], [`arms[${i}].wrist.bend`, p.arms[i].wrist?.bend ?? 0]);
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

test('the fall and the get-up pivot at the hips: the hips drop to the canvas and come back up', () => {
  // Standing, the hips are at PELVIS; the pivot there changes nothing until the body tips
  assert.equal(hipHeight(GUARD), PELVIS);
  assert.deepEqual(rootShift({ y: 0, pitch: 0, pivot: PELVIS }), { dy: 0, dz: 0 });
  assert.deepEqual(rootShift({ y: -0.1, pitch: 0, pivot: 0 }), { dy: -0.1, dz: 0 });
  // Tipped flat about the hips, the feet come up and forward and the hips stay put
  const flat = rootShift({ y: -0.52, pitch: -1.5, pivot: PELVIS });
  assert.ok(flat.dz > 0.5 && flat.dz < PELVIS + 1e-9, `the feet swing forward (${flat.dz})`);
  assert.ok(Math.abs(hipHeight({ ...GUARD, root: { y: -0.52, pitch: -1.5, pivot: PELVIS } }) - 0.1) < 1e-9);
  // The knockdown: the hips start standing, only ever drop, and end on the canvas
  let last = hipHeight(sample('knockdown', 0));
  assert.ok(Math.abs(last - PELVIS) < 0.05, 'the knockdown starts standing');
  for (let f = 0; f < CLIPS.knockdown.frames; f++) {
    const h = hipHeight(sample('knockdown', f));
    assert.ok(h <= last + 0.04, `knockdown frame ${f}: the hips keep dropping (${h} after ${last})`);
    last = h;
  }
  assert.ok(last < 0.2, `the knockdown ends with the hips on the canvas (${last})`);
  assert.equal(sample('knockdown', CLIPS.knockdown.frames - 1).root.pivot, PELVIS);
  for (let f = 0; f <= 120; f += 10) assert.ok(hipHeight(sample('down', f)) < 0.2, `down frame ${f}: hips on the canvas`);
  // The get-up starts there and rises to the guard; the feet are back under the body at the end
  assert.ok(hipHeight(sample('getup', 0)) < 0.2, 'the get-up starts with the hips on the canvas');
  const end = sample('getup', CLIPS.getup.frames - 1);
  assert.ok(Math.abs(hipHeight(end) - PELVIS) < 0.05, 'and ends standing');
  assert.deepEqual(rootShift(end.root), { dy: 0, dz: 0 });
  // The pivot interpolates like everything else
  const a = sample('getup', 31);
  const b = sample('getup', 36);
  const mid = sample('getup', 33.5);
  assert.ok(mid.root.pivot > Math.min(a.root.pivot, b.root.pivot) && mid.root.pivot < Math.max(a.root.pivot, b.root.pivot), `pivot ${a.root.pivot} → ${mid.root.pivot} → ${b.root.pivot}`);
});

test('the wrists: the hook turns the lead fist over, the uppercut comes up palm-in, the jab and cross stay vertical', () => {
  const W = (p: FightPose, i: 0 | 1) => p.arms[i].wrist ?? { roll: 0, bend: 0 };
  // The guard holds the wrists straight, and every clip's arms carry a wrist to sample into
  for (const a of GUARD.arms) assert.deepEqual(a.wrist, { roll: 0, bend: 0 });
  for (const id of CLIP_IDS) for (const a of sample(id, 5).arms) assert.ok(a.wrist, `${id} arms carry wrists`);
  // The hook: cocked back and still vertical on the wind-up, rolled over (palm down) on the hit
  const hookWind = W(sample('hook', Math.round(MOVES.hook.startup * 0.55)), 0);
  const hookHit = W(sample('hook', MOVES.hook.startup), 0);
  assert.ok(hookWind.roll < -0.3 && hookWind.bend < -0.2, `hook wind-up ${JSON.stringify(hookWind)}`);
  assert.ok(hookHit.roll > 0.3, `hook hit rolls the fist over (${hookHit.roll})`);
  assert.ok(hookHit.roll - hookWind.roll > 0.7, 'the fist turns through the swing');
  // The uppercut: the rear fist cocked at the dip, rolled palm-in by the top
  const upWind = W(sample('uppercut', Math.round(MOVES.uppercut.startup * 0.55)), 1);
  const upHit = W(sample('uppercut', MOVES.uppercut.startup), 1);
  const upHeld = W(sample('uppercut', MOVES.uppercut.startup + MOVES.uppercut.active - 1), 1);
  assert.ok(upWind.bend < -0.3, `uppercut dip cocks the wrist (${upWind.bend})`);
  assert.ok(upHit.roll > 0.8 && upHeld.roll >= upHit.roll, `uppercut rolls palm-in (${upHit.roll}, ${upHeld.roll})`);
  // The straight punches: a vertical fist (no roll) at the hit, cocked back on the way
  for (const [id, i] of [['jab', 0], ['cross', 1]] as const) {
    assert.equal(W(sample(id, MOVES[id].startup), i).roll, 0, `${id} keeps a vertical fist`);
    assert.ok(W(sample(id, Math.round(MOVES[id].startup * 0.55)), i).bend < -0.2, `${id} cocks the wrist in the wind-up`);
    assert.ok(Math.abs(W(sample(id, MOVES[id].startup), i).bend) < 0.2, `${id} snaps the wrist straight`);
  }
  // Every strike comes back to straight wrists in the guard
  for (const m of MOVE_IDS) {
    const end = sample(moveClip(m), moveFrames(m) - 1);
    for (const a of end.arms) assert.ok(Math.abs(W(end, 0).roll) < 1e-9 && Math.abs(a.wrist!.bend) < 1e-9, `${m} ends with straight wrists`);
  }
  // The wrists interpolate between keys
  const w0 = W(sample('hook', 6), 0);
  const w1 = W(sample('hook', 10), 0);
  const wm = W(sample('hook', 8), 0);
  assert.ok(wm.roll > Math.min(w0.roll, w1.roll) && wm.roll < Math.max(w0.roll, w1.roll), 'the roll eases between keys');
  assert.ok(wm.bend > Math.min(w0.bend, w1.bend) && wm.bend < Math.max(w0.bend, w1.bend), 'the bend eases between keys');
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
  const flip = (l: FightPose['arms'][0]) => ({ ...l, twist: -(l.twist ?? 0), ...(l.wrist ? { wrist: { roll: -l.wrist.roll, bend: l.wrist.bend } } : {}) });
  assert.deepEqual(m.arms[1], flip(jab.arms[0]));
  assert.deepEqual(m.arms[0], flip(jab.arms[1]));
  assert.deepEqual(m.legs[1], flip(jab.legs[0]));
  assert.equal(m.side, -jab.side);
  assert.equal(m.twist, -jab.twist);
  assert.equal(m.headYaw, -jab.headYaw);
  assert.equal(m.headPitch, jab.headPitch);
  assert.equal(m.lean, jab.lean);
  assert.deepEqual(m.root, jab.root);
  // A mirrored hook is a right hook: the other hand rolls the other way over, the bend as it was
  const hook = sample('hook', MOVES.hook.startup);
  const rh = sample('hook', MOVES.hook.startup, true);
  assert.equal(rh.arms[1].wrist!.roll, -hook.arms[0].wrist!.roll);
  assert.equal(rh.arms[1].wrist!.bend, hook.arms[0].wrist!.bend);
  assert.ok(Math.abs(rh.arms[1].wrist!.roll) > 0.3);
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
  assert.equal(newFightPose().root.pivot, 0);
  // The wrists and the pivot blend too (the hook's rolled fist into the lying pose's straight one, the feet pivot into the hips)
  assert.ok(Math.abs(a.arms[0].wrist!.roll) > 0.1 && b.arms[0].wrist!.roll === 0 && a.root.pivot === 0 && b.root.pivot === PELVIS);
  blendPose(a, b, 0.5, out);
  assert.ok(Math.abs(out.arms[0].wrist!.roll - a.arms[0].wrist!.roll / 2) < 1e-12);
  assert.ok(Math.abs(out.root.pivot - PELVIS / 2) < 1e-12);
  // Blending into a pose whose arms have no wrist objects gives them one; `out` never shares them with `a` or `b`
  const bare = newFightPose();
  for (const arm of bare.arms) delete arm.wrist;
  blendPose(a, b, 0.5, bare);
  assert.ok(bare.arms[0].wrist && bare.arms[0].wrist !== a.arms[0].wrist && bare.arms[0].wrist !== b.arms[0].wrist);
  assert.ok(Math.abs(bare.arms[0].wrist!.roll - a.arms[0].wrist!.roll / 2) < 1e-12);
});

test('every sampled number is finite for every clip at every frame (and between)', () => {
  for (const id of CLIP_IDS) {
    const c = CLIPS[id];
    for (let f = 0; f <= c.frames + 1; f += 0.5) {
      for (const mirror of [false, true]) {
        for (const [name, v] of numbers(sample(id, f, mirror))) assert.ok(Number.isFinite(v), `${id} frame ${f}${mirror ? ' mirrored' : ''}: ${name}`);
      }
    }
    // Sane sizes: nothing wild; the root only lifts a little and drops at most to the hips, which pivot at the feet or the hips
    for (let f = 0; f < c.frames; f++) {
      const p = sample(id, f);
      for (const [name, v] of numbers(p)) assert.ok(Math.abs(v) <= Math.PI, `${id} frame ${f}: ${name} = ${v}`);
      assert.ok(p.root.y <= 0.2 && p.root.y >= -PELVIS && p.root.pitch <= 0 && p.root.pitch >= -1.6, `${id} frame ${f}: root`);
      assert.ok(p.root.pivot >= 0 && p.root.pivot <= PELVIS, `${id} frame ${f}: pivot`);
      const h = hipHeight(p);
      assert.ok(h > 0.05 && h <= PELVIS + 0.1, `${id} frame ${f}: hips ${h} off the ground and no higher than standing`);
      for (const a of p.arms) assert.ok(Math.abs(a.wrist!.roll) <= 1.6 && Math.abs(a.wrist!.bend) <= 0.8, `${id} frame ${f}: wrist`);
    }
  }
  assert.ok(Number.isFinite(sample('jab', NaN).bob));
});

test('the hips and shoulders turn into every punch and kick, and the weight moves', () => {
  for (const id of MOVE_IDS) {
    const m = MOVES[id];
    if (m.kind === 'dodge') continue;
    const wind = sample(moveClip(id), Math.round(m.startup * 0.55));
    const hit = sample(moveClip(id), m.startup);
    const hips = Math.abs(hit.turn - wind.turn);
    const shoulders = Math.abs(hit.turn + hit.twist - (wind.turn + wind.twist));
    assert.ok(hips >= 0.15, `${id}: the hips turn ${hips.toFixed(2)}`);
    assert.ok(shoulders >= 0.2, `${id}: the shoulders turn ${shoulders.toFixed(2)}`);
    // Through the strike: the rear-hand punches and kicks turn the hips the right way round (positive
    // brings the left hip forward), the left-hand ones the other way after loading
    assert.ok(hit.turn < wind.turn, `${id}: turns through`);
    assert.ok(Math.abs(hit.sway - GUARD.sway) > 0.015 || Math.abs(wind.sway - GUARD.sway) > 0.015, `${id}: the weight shifts`);
  }
  // The kicks stand on the left foot: the hips go over it
  for (const id of ['frontKick', 'roundhouse'] as const) assert.ok(sample(id, MOVES[id].startup).sway < -0.03);
});

test('the recoveries settle back into the guard (no snap at the end)', () => {
  for (const id of MOVE_IDS) {
    const c = CLIPS[moveClip(id)];
    const a = sample(c.id, c.frames - 3);
    const b = sample(c.id, c.frames - 1);
    for (const [k, v] of numbers(a)) {
      const w = numbers(b).find(([n]) => n === k)![1];
      assert.ok(Math.abs(v - w) < 0.35, `${id}: ${k} still ${(v - w).toFixed(2)} off two frames from the end`);
    }
  }
});

test('hit reactions play off the side the blow came from', () => {
  // Keyed for a blow from the right: the head snaps away (to the +x side), the left shoulder goes back
  const head = sample('hitHead', 3);
  assert.ok(head.headYaw > 0.3 && head.twist < GUARD.twist && head.turn < GUARD.turn && head.sway > 0);
  assert.equal(hurtMirror('cross'), false);
  assert.equal(hurtMirror('frontKick'), false);
  assert.equal(hurtMirror('roundhouse'), false);
  assert.equal(hurtMirror('jab'), true);
  assert.equal(hurtMirror('hook'), true);
  assert.equal(hurtMirror(null), false);
  // Mirrored for a blow from the left
  for (const hurt of ['head', 'body', 'stagger'] as const) {
    const id = hurtClip(hurt);
    const r = sample(id, 4);
    const l = sample(id, 4, true);
    assert.ok(Math.abs(r.headYaw + l.headYaw) < 1e-9 && Math.abs(r.turn + l.turn) < 1e-9 && Math.abs(r.sway + l.sway) < 1e-9, id);
    assert.ok(r.sway > 0 && r.turn < 0, `${id}: knocked to the right, the left hip back`);
  }
});

test('the knockdown and the get-up use the whole body: the hips and shoulders turn as he falls and rolls up', () => {
  const turnOf = (id: ClipId) => Array.from({ length: CLIPS[id].frames }, (_, f) => Math.abs(sample(id, f).turn - (id === 'getup' ? 0 : GUARD.turn)));
  assert.ok(Math.max(...turnOf('knockdown')) > 0.15);
  assert.ok(Math.max(...turnOf('getup')) > 0.25);
});
