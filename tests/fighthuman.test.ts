// The Fight Club on the rubric (the animation revamp's Phase 7, human.ts; docs/animation-revamp-plan.md): every
// fight clip (fight-anim.ts), each way round, as the figure draws it (fightground.ts: the clip on the figure, its
// feet on the canvas, the lying poses' root), held to a person's limits: no bone turning faster than one can
// (pops), none speeding up or slowing too hard (continuity), the knees and elbows never past straight, the neck
// within its turn, the head steady, the feet on the canvas (no sole through it, none floating in the guard) and
// the hands never through it; the curve through the keys smooth and never past them; and the fighters' legs
// round the ring on the animator, fed from the fight sim's bouts as the view feeds it. FIGHT_REPORT=1 prints
// every row.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createAnimator } from '../src/scripts/city3d/animator';
import { createRubric, TILE_M, type Row } from '../src/scripts/city3d/human';
import { decodeMocap, MOCAP_BONES } from '../src/scripts/city3d/mocap';
import { newMove, stepMove } from '../src/scripts/city3d/movesim';
import { makeSkeleton, newPose, poseSkeleton } from '../src/scripts/city3d/skeleton';
import { CLIPS, CLIP_IDS, SETTLE, clipFor, createFightPoser, newFightPose, rootShift, sampleClip, type ClipId, type FightPose } from '../src/scripts/city3d/fight-anim';
import { FIGHTER_SCALE, PLANT, figurePose, groundFighter, knuckles, soleGoal, soles } from '../src/scripts/city3d/fightground';
import { createFightSim, type Fighter } from '../src/scripts/city3d/fight-sim';

const report = !!process.env.FIGHT_REPORT;
const DT = 1 / 60;
/** Metres in a rig unit at the fighters' scale */
const M = FIGHTER_SCALE * TILE_M;
const print = (what: string, rows: Row[]) => {
  if (!report) return;
  console.log(`\n== ${what}`);
  for (const r of rows) console.log(`  ${r.ok === null ? '  --' : r.ok ? '  ok' : 'FAIL'}  ${r.name}: ${r.value}`);
};

/* ---------- The clips ---------- */

/**
 * The rows a clip is held to: a clip stands on the spot (the sim moves the fighter), so the rows of walking
 * and running, the stick's and standing still's don't apply; the head's steadiness is measured over a
 * clip long enough to (the loops)
 */
const CLIP_ROWS = ['knees', 'elbowBack', 'neck', 'pops', 'continuity', 'ground'];
const IF_MEASURED = ['head'];

const sk = makeSkeleton();
const rot = new Float32Array(MOCAP_BONES.length * 4);
const qr = new THREE.Quaternion();
const X = new THREE.Vector3(1, 0, 0);
/** A clip's frame as the figure draws it: sampled, on the figure, its feet on the canvas */
function drawn(id: ClipId, frame: number, mirror: boolean, fp = newFightPose(), p = newPose()) {
  sampleClip(id, frame, fp, { mirror });
  figurePose(fp, p);
  groundFighter(p, fp.root);
  return { fp, p };
}
const hips = new THREE.Vector3();
const shift = new THREE.Vector3();
/** A figure's pose (and the clip's root, as it's drawn) to the rubric, standing on the spot */
function push(rb: ReturnType<typeof createRubric>, p: ReturnType<typeof newPose>, fp: FightPose) {
  poseSkeleton(sk, p);
  MOCAP_BONES.forEach((b, k) => sk.bones[b].quaternion.toArray(rot, k * 4));
  // (the root's lift and tip as the figure is drawn: on the hips)
  const { dy, dz } = rootShift(fp.root);
  qr.setFromAxisAngle(X, fp.root.pitch);
  hips.copy(sk.bones.hips.position).applyQuaternion(qr).add(shift.set(0, dy, dz));
  qr.multiply(new THREE.Quaternion().fromArray(rot, 0)).toArray(rot, 0);
  rb.push({ dt: DT, rot, hips, x: 0, y: 0, z: 0, yaw: 0, scale: FIGHTER_SCALE, speed: 0, goal: 0, goalDir: null, down: [true, true], ground: () => 0 });
}
/** Every frame of a clip (a loop twice round, so its wrap is measured), from its first, by the rubric */
function measureClip(id: ClipId, mirror: boolean) {
  const c = CLIPS[id];
  const rb = createRubric(FIGHTER_SCALE, {});
  const fp = newFightPose();
  const p = newPose();
  const frames = c.loop ? c.frames * 2 : c.frames + 2;
  for (let f = 0; f < frames; f++) {
    drawn(id, f, mirror, fp, p);
    push(rb, p, fp);
  }
  return rb.rows();
}

for (const id of CLIP_IDS)
  test(`the clip: ${id}, each way round`, () => {
    for (const mirror of [false, true]) {
      const what = `${id}${mirror ? ' (mirrored)' : ''}`;
      const rows = measureClip(id, mirror);
      print(what, rows);
      for (const k of [...CLIP_ROWS, ...IF_MEASURED]) {
        const r = rows.find((x) => x.id === k);
        assert.ok(r && (r.ok !== null || IF_MEASURED.includes(k)), `${what}: ${k} measured`);
        assert.ok(r.ok !== false, `${what}: ${r.name}: ${r.value}`);
      }
    }
  });

test('the feet on the canvas: no sole a centimetre through it, both on it in the guard, a kick at full stretch the clip\'s', () => {
  for (const id of CLIP_IDS)
    for (const mirror of [false, true])
      for (let f = 0; f < CLIPS[id].frames; f += 0.5) {
        const { fp, p } = drawn(id, f, mirror);
        for (const s of soles(p, fp.root)) assert.ok(s * M > -0.01, `${id} at ${f}: a sole ${(s * M * 100).toFixed(1)} cm through the canvas`);
      }
  // The guard's stance stood the rear foot over the canvas: both soles are on it now, the bounce lifting them a touch
  for (let f = 0; f < CLIPS.guard.frames; f++) {
    const { fp, p } = drawn('guard', f, false);
    const s = soles(p, fp.root);
    assert.ok(Math.min(...s) * M < 0.003, `the guard at ${f}: neither foot on the canvas (${s.map((v) => (v * M * 100).toFixed(1))} cm)`);
    assert.ok(Math.max(...s) * M < 0.03, `the guard at ${f}: a foot ${(Math.max(...s) * M * 100).toFixed(1)} cm up`);
  }
  // A foot well off the canvas follows the clip, and the goal eases from on it to following it without a jump
  assert.equal(soleGoal(PLANT.lift + 0.01), PLANT.lift + 0.01);
  assert.equal(soleGoal(0), 0);
  assert.equal(soleGoal(PLANT.lo), 0);
  let last = 0;
  for (let s = 0; s <= PLANT.lift + 0.05; s += 0.001) {
    const g = soleGoal(s);
    assert.ok(g >= last - 1e-12 && g - last <= 0.0017 + 1e-9, `the goal jumps at ${s.toFixed(3)}`);
    last = g;
  }
  const up = newFightPose();
  const p = figurePose(sampleClip('frontKick', CLIPS.frontKick.frames / 2 - 3, up), newPose());
  const before = JSON.stringify(p.legs[1]);
  groundFighter(p, up.root);
  assert.equal(JSON.stringify({ fwd: p.legs[1].fwd, out: p.legs[1].out, bend: p.legs[1].bend }), JSON.stringify((({ fwd, out, bend }) => ({ fwd, out, bend }))(JSON.parse(before))), 'the kicking leg is left alone at full stretch');
});

test('the hands never through the canvas (the get-up pushes off it)', () => {
  for (const id of CLIP_IDS)
    for (let f = 0; f < CLIPS[id].frames; f++) {
      const { fp, p } = drawn(id, f, false);
      for (const h of knuckles(p, fp.root)) assert.ok(h * M > -0.02, `${id} at ${f}: a hand ${(h * M * 100).toFixed(1)} cm through the canvas`);
    }
});

test('the curve through the keys: smooth (no corner at a key) and never past the keys either side', () => {
  const num = (p: FightPose) => [p.bob, p.lean, p.twist, p.side, p.turn, p.sway, p.headYaw, p.headPitch, ...[...p.arms, ...p.legs].flatMap((l) => [l.fwd, l.out, l.bend, l.twist ?? 0])];
  for (const id of CLIP_IDS) {
    const c = CLIPS[id];
    const keys = [...c.keys].map((k) => k.t).sort((a, b) => a - b);
    for (const t of keys) {
      if (t <= 0 || t >= c.frames - 1) continue;
      const e = 1e-3;
      const a = num(sampleClip(id, t - e, newFightPose()));
      const m = num(sampleClip(id, t, newFightPose()));
      const b = num(sampleClip(id, t + e, newFightPose()));
      for (let k = 0; k < m.length; k++) {
        const left = (m[k] - a[k]) / e;
        const right = (b[k] - m[k]) / e;
        assert.ok(Math.abs(left - right) < 0.02, `${id}: a corner at key ${t} (number ${k}: ${left.toFixed(3)} then ${right.toFixed(3)} a frame)`);
      }
    }
    for (let i = 0; i + 1 < keys.length; i++) {
      const lo = num(sampleClip(id, keys[i], newFightPose()));
      const hi = num(sampleClip(id, keys[i + 1], newFightPose()));
      for (let f = keys[i]; f <= keys[i + 1]; f += 0.25) {
        const v = num(sampleClip(id, f, newFightPose()));
        for (let k = 0; k < v.length; k++) assert.ok(v[k] >= Math.min(lo[k], hi[k]) - 1e-9 && v[k] <= Math.max(lo[k], hi[k]) + 1e-9, `${id} at ${f}: number ${k} past the keys`);
      }
    }
  }
});

/* ---------- Whole fights ---------- */

const bout = (seed: number) =>
  createFightSim({
    seed,
    fighters: [
      { id: 'a', name: 'A', style: 'street', x: 0, z: -1.1, yaw: 0, bot: { skill: 0.8 } },
      { id: 'b', name: 'B', style: 'kickboxer', x: 0, z: 1.1, yaw: Math.PI, bot: { skill: 0.5 } },
    ],
    bout: null,
    arena: { x: 0, z: 0, r: 2.4 },
  });

/**
 * A minute of two bots fighting, each drawn as the view draws it (the clip its state calls for, played by its
 * poser: a hit landing mid-kick, a move cut into from the block, a knockdown from a strike): the whole of it
 * held to the clips' rows but the head's (a blow snaps the head round faster than a person turns it, as it
 * should)
 */
test('whole fights, every cut from one clip to the next carried over: nothing pops, nothing jolts', () => {
  for (const seed of [1, 2, 3]) {
    const sim = bout(seed);
    const fighters = sim.fighters.map((f, i) => ({ f, poser: createFightPoser(), p: newPose(), rb: createRubric(FIGHTER_SCALE), seed: i * 37 }));
    for (let i = 0; i < 60 * 60; i++) {
      sim.step(DT);
      for (const x of fighters) {
        const fp = x.poser.play(clipFor(x.f, sim.ticks, x.seed), DT);
        figurePose(fp, x.p);
        groundFighter(x.p, fp.root);
        if (i >= 60) push(x.rb, x.p, fp);
      }
    }
    for (const x of fighters) {
      const rows = x.rb.rows();
      print(`a fight, seed ${seed}, ${x.f.id}`, rows);
      for (const k of CLIP_ROWS) {
        const r = rows.find((y) => y.id === k)!;
        assert.ok(r.ok, `seed ${seed}, ${x.f.id}: ${r.name}: ${r.value}`);
      }
    }
  }
});

test('the poser: a clip as it is once settled, a move all its own by the frame it lands', () => {
  // Cut from the block into a jab: by the jab's first active frame the pose is the jab's
  const poser = createFightPoser();
  for (let f = 0; f < 20; f++) poser.play({ id: 'block', frame: f }, DT);
  const want = sampleClip('jab', 6, newFightPose());
  let got = newFightPose();
  for (let f = 0; f <= 6; f++) got = poser.play({ id: 'jab', frame: f }, DT);
  assert.ok(Math.abs(got.arms[0].bend - want.arms[0].bend) < 1e-9 && Math.abs(got.arms[0].fwd - want.arms[0].fwd) < 1e-9, 'the jab lands as keyed');
  // ...and the frame it cut on, nothing jumped
  const a = createFightPoser();
  for (let f = 0; f < 20; f++) a.play({ id: 'block', frame: f }, DT);
  const before = a.pose.arms[0].bend;
  a.play({ id: 'jab', frame: 0 }, DT);
  assert.ok(Math.abs(a.pose.arms[0].bend - before) < 0.1, `the cut jumps ${(a.pose.arms[0].bend - before).toFixed(3)}`);
  // A hold (the hit-stop) holds the pose
  const held = JSON.stringify(a.pose);
  a.play({ id: 'jab', frame: 1 }, 0);
  assert.equal(JSON.stringify(a.pose), held);
  assert.ok(SETTLE.move <= 6 && SETTLE.other >= SETTLE.move);
});

/* ---------- The fighters round the ring ---------- */

const data = decodeMocap(readFileSync('src/data/mocap/clips.bin'));
/** Where the fighter's legs are the animator's (fight-figure.ts): in the guard, moving or a foot still stepping */
const guarding = (f: Fighter) => !(f.down > 0) && !(f.getup > 0) && !(f.stun > 0 && f.hurt) && !f.move && !f.blocking;
/**
 * Bouts between two bots, each fighter's animator fed as the view feeds it (the velocity over the sim's
 * ticks, facing the opponent), the rubric over every stretch its legs show for at least `MIN` frames
 */
const MIN = 45;
function ring(seeds: number[], seconds: number) {
  const out: Row[][] = [];
  for (const seed of seeds) {
    const sim = bout(seed);
    const st = sim.fighters.map((f) => ({ f, an: createAnimator(data), m: newMove(f.yaw), last: { x: f.x, z: f.z, t: 0 }, vx: 0, vz: 0, rb: null as ReturnType<typeof createRubric> | null, n: 0 }));
    const close = (s: (typeof st)[number]) => {
      if (s.rb && s.n >= MIN) out.push(s.rb.rows());
      s.rb = null;
      s.n = 0;
    };
    for (let i = 0; i < seconds * 60; i++) {
      sim.step(DT);
      for (const s of st) {
        const { f, an, m } = s;
        if (sim.ticks !== s.last.t) {
          const el = (sim.ticks - s.last.t) * DT;
          s.vx = (f.x - s.last.x) / el;
          s.vz = (f.z - s.last.z) / el;
          s.last = { x: f.x, z: f.z, t: sim.ticks };
        }
        stepMove(m, s.vx, s.vz, true, DT, f.yaw);
        an.update({ dt: DT, x: f.x, y: 0, z: f.z, move: m, gx: s.vx, gz: s.vz, scale: FIGHTER_SCALE, ground: () => 0, sprint: 0, grounded: true, vy: 0, faceGoal: f.yaw });
        const shown = i > 60 && guarding(f) && (f.moving > 0.05 || an.feet.some((x) => !x.locked));
        if (!shown) {
          close(s);
          continue;
        }
        s.rb ??= createRubric(FIGHTER_SCALE, {});
        s.n++;
        const goal = Math.hypot(s.vx, s.vz);
        s.rb.push({ dt: DT, rot: an.rot, hips: an.hips, x: f.x, y: 0, z: f.z, yaw: an.face, scale: FIGHTER_SCALE, speed: Math.hypot(m.vx, m.vz), goal, goalDir: goal > 0.3 ? Math.atan2(s.vx, s.vz) : null, down: [an.feet[0].locked, an.feet[1].locked], drift: [an.feet[0].drift, an.feet[1].drift], ground: () => 0 });
      }
    }
    for (const s of st) close(s);
  }
  return out;
}

/**
 * The fighters' legs: the rows that hold in every stretch, and those held to a share of them (the bots turn
 * from a run's pace one way to the other in a tick, faster than anyone's feet can follow: the slide, a foot
 * flicking and the continuity fail now and then, by a little; `RING` is how far, written in the plan's Phase 7
 * with the procedural walk's numbers it replaced, and polish is Phase 8's)
 */
const EVERY = ['ground', 'knees', 'elbowBack', 'reaction'];
const RING = { share: 0.2, slide: 0.025, pops: 60, continuity: 3000 };
test('the fighters\' legs round the ring on the animator: on the ground, the knees never back, the feet held', () => {
  const stretches = ring([1, 2, 3], 60);
  assert.ok(stretches.length >= 30, `${stretches.length} stretches`);
  const worst: Record<string, number> = {};
  const fails: Record<string, number> = {};
  for (const rows of stretches)
    for (const r of rows) {
      if (r.ok === null) continue;
      if (EVERY.includes(r.id)) assert.ok(r.ok, `${r.name}: ${r.value}`);
      if (!r.ok) fails[r.id] = (fails[r.id] ?? 0) + 1;
      worst[r.id] = Math.max(worst[r.id] ?? 0, r.n ?? 0);
    }
  if (report) console.log({ stretches: stretches.length, fails, worst });
  for (const id of ['slide', 'pops', 'continuity'] as const) {
    assert.ok((fails[id] ?? 0) <= stretches.length * RING.share, `${id}: ${fails[id]} of ${stretches.length} stretches fail`);
    assert.ok((worst[id] ?? 0) <= RING[id], `${id}: ${worst[id]} at worst (under ${RING[id]})`);
  }
});
