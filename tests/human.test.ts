// The rubric (the revamp's Phase 1, human.ts; docs/animation-revamp-plan.md): what "realistically
// human" means, as numbers, held over every clip of the capture and over the animator running each
// of the lab's programs. A row that fails today and belongs to a later phase is listed in HELD_BACK
// with the phase that owns it (the audit in the plan says why); the test holds that it still fails,
// so the entry comes out when the phase fixes it. HUMAN_REPORT=1 prints every row.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createAnimator } from '../src/scripts/city3d/animator';
import { BANDS, bandAt, clipRows, createRubric, froudeRate, froudeSpeed, type Row } from '../src/scripts/city3d/human';
import { contacts, decodeMocap, mirrorClip, tagged } from '../src/scripts/city3d/mocap';
import { GAITS, newMove, stepMove } from '../src/scripts/city3d/movesim';

const data = decodeMocap(readFileSync('src/data/mocap/clips.bin'));
const SCALE = 0.85;
const DT = 1 / 60;
const report = !!process.env.HUMAN_REPORT;

/**
 * Rows that fail today, by clip or program, and the phase of the revamp plan that owns the fix
 * (the audit, in the plan). A row listed here must still fail: when it passes, take it out.
 */
const HELD_BACK: Record<string, Record<string, string>> = {
  // Subject 9's run (09_01): the one take whose shoulders don't turn against the pelvis (every other is -0.5 to -0.9)
  'the capture: run-long-2': { counter: 'Phase 5: another run, or this take dropped' },
  // At a small scale the animator stretches the strides instead of quickening the steps (WARP keeps the clip's turnover)
  'the animator: run at scale 0.6': { cadence: 'Phase 5: the scale rule' },
};

const print = (what: string, rows: Row[], skip: Set<string>) => {
  if (!report) return;
  console.log(`\n== ${what}`);
  for (const r of rows) console.log(`  ${skip.has(r.id) ? 'skip' : r.ok === null ? '  --' : r.ok ? '  ok' : 'FAIL'}  ${r.name}: ${r.value}`);
};
/**
 * Rows that don't apply: the steady rows are written for walking and running straight (a strafe, a
 * crouched walk, a turn on the spot and a jump have gaits of their own), and the feet on the ground
 * is the lock's to keep (a clip has none: the capture's feet sink, the audit's Phase 5 item)
 */
const STEADY = ['cadence', 'stride', 'support', 'bob', 'sway', 'counter', 'arms', 'elbows'];
const SKIP: Record<string, string[]> = { jump: STEADY, strafe: STEADY, crouch: STEADY, spot: STEADY, clip: ['ground'] };
const skipFor = (tags: string[]) => new Set(tags.flatMap((t) => SKIP[t] ?? []));

/** Every row inside its band, but those held back (which must still fail) */
function check(what: string, rows: Row[], skip = new Set<string>()) {
  print(what, rows, skip);
  const held = HELD_BACK[what] ?? {};
  for (const r of rows) {
    if (r.ok === null || skip.has(r.id)) continue;
    if (held[r.id]) assert.equal(r.ok, false, `${what}: ${r.name} passes now (${r.value}): take it out of HELD_BACK (${held[r.id]})`);
    else assert.ok(r.ok, `${what}: ${r.name}: ${r.value}`);
  }
  for (const id of Object.keys(held)) assert.ok(rows.some((r) => r.id === id), `${what}: HELD_BACK names a row that isn't measured: ${id}`);
}

test('the bands: between the table\'s rows in proportion, scaled the way dynamics scale', () => {
  assert.deepEqual(bandAt(BANDS.cadence, 1.4), [1.55, 2.15]);
  assert.deepEqual(bandAt(BANDS.cadence, 7.5), [3.4, 3.9]);
  assert.deepEqual(bandAt(BANDS.cadence, 9), [3.4, 3.9]);
  assert.deepEqual(bandAt(BANDS.cadence, 0.5), [1.3, 1.7]);
  const [lo, hi] = bandAt(BANDS.cadence, 3.8);
  assert.ok(lo > 2.5 && lo < 2.7 && hi > 3.1 && hi < 3.4, `${lo} ${hi}`);
  // A smaller figure at the same speed is going faster for its legs, and steps quicker
  assert.ok(froudeSpeed(1, 0.6) > 1 && Math.abs(froudeSpeed(1, SCALE) - 1) < 1e-9);
  assert.ok(froudeRate(2, 0.6) < 2);
});

// Every clip, measured as itself (its own contacts, its root's motion, scale 1)
for (const c of data.clips)
  test(`the capture: ${c.name}`, () => {
    const gait = tagged(c, 'walk') && !tagged(c, 'run') ? 'walk' : tagged(c, 'run') ? 'run' : undefined;
    check(`the capture: ${c.name}`, clipRows(c, contacts(c), data.fps, gait, tagged(c, 'stand')), skipFor([...c.tags, 'clip']));
  });

test('a mirrored clip measures as its original', () => {
  const c = data.clips.find((k) => k.name === 'run-loop')!;
  const a = clipRows(c, contacts(c), data.fps);
  const m = mirrorClip(c);
  const b = clipRows(m, contacts(m), data.fps);
  for (let i = 0; i < a.length; i++) assert.equal(b[i].ok, a[i].ok, `${a[i].name}: ${a[i].value} / ${b[i].value}`);
});

/* ---------- The animator on the lab's programs ---------- */

type Prog = (t: number) => [number, number];
type Gait = 'walk' | 'run';
const PROGS: Record<string, { go: Prog; seconds: number; gait?: Gait }> = {
  run: { go: () => [0, GAITS.run], seconds: 10, gait: 'run' },
  walk: { go: () => [0, GAITS.walk], seconds: 12, gait: 'walk' },
  sprint: { go: () => [0, GAITS.sprint], seconds: 10, gait: 'run' },
  circle: { go: (t) => [Math.sin(t * 0.8) * GAITS.run, Math.cos(t * 0.8) * GAITS.run], seconds: 10, gait: 'run' },
  stopAndGo: { go: (t) => (t % 3 < 1.6 ? [0, GAITS.run] : [0, 0]), seconds: 12, gait: 'run' },
  sprintStop: { go: (t) => (t % 3 < 1.6 ? [0, GAITS.sprint] : [0, 0]), seconds: 12, gait: 'run' },
  turnBack: { go: (t) => (t % 4 < 2 ? [0, GAITS.run] : [0, -GAITS.run]), seconds: 12, gait: 'run' },
  startBack: { go: (t) => (t % 4 < 1 ? [0, 0] : t % 8 < 4 ? [0, -GAITS.run] : [0, GAITS.run]), seconds: 16, gait: 'run' },
  stand: { go: (t) => (t < 1 ? [0, GAITS.run] : [0, 0]), seconds: 40 },
};

/** The animator through a program, every frame measured by the rubric */
function measure(go: Prog, seconds: number, scale = SCALE, gait?: Gait) {
  const an = createAnimator(data);
  const m = newMove(0);
  const rb = createRubric(scale, { gait });
  let x = 0;
  let z = 0;
  for (let i = 0; i < seconds * 60; i++) {
    const [gx, gz] = go(i * DT);
    stepMove(m, gx, gz, true, DT);
    x += m.vx * DT;
    z += m.vz * DT;
    const sprint = THREE.MathUtils.clamp((Math.hypot(m.vx, m.vz) - GAITS.run) / (GAITS.sprint - GAITS.run), 0, 1);
    an.update({ dt: DT, x, y: 0, z, move: m, gx, gz, scale, ground: () => 0, sprint });
    // (the first second is the start-up: the rubric measures from there)
    if (i < 60) continue;
    const goal = Math.hypot(gx, gz);
    rb.push({ dt: DT, rot: an.rot, hips: an.hips, x, y: 0, z, yaw: an.face, scale, speed: Math.hypot(m.vx, m.vz), goal, goalDir: goal > 0.3 ? Math.atan2(gx, gz) : null, down: [an.feet[0].locked, an.feet[1].locked], drift: [an.feet[0].drift, an.feet[1].drift], ground: () => 0 });
  }
  return rb.rows();
}

for (const [name, p] of Object.entries(PROGS))
  test(`the animator: ${name}`, () => {
    check(`the animator: ${name}`, measure(p.go, p.seconds, SCALE, p.gait));
  });

test('the same rules hold at another scale: a kid-sized figure running keeps a person\'s cadence and stride for its legs', () => {
  const rows = measure(PROGS.run.go, 10, 0.6, 'run');
  check('the animator: run at scale 0.6', rows);
  for (const id of ['cadence', 'stride', 'slide', 'pops']) {
    const r = rows.find((k) => k.id === id)!;
    assert.ok(r.ok !== null, `${id} measured`);
  }
});

test('the crowd: at least three idles to take turns (Phase 5 until then)', () => {
  // (the crowd's rows are crowdclips.ts's; the capture's idles are what they'll be baked from)
  const idles = data.clips.filter((c) => tagged(c, 'stand')).length;
  assert.ok(idles >= 3, `${idles} idles in the capture`);
});
