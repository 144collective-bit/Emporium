// The fight clips on the rubric (the animation revamp's Phase 7, fightrubric.ts): planted feet, the hips into every
// punch and kick and ahead of what they drive, the rear heel up, the reactions led by the struck part with the hips
// in them, back in the guard; and the footwork (fightfeet.ts): the feet keep their place on the canvas while the sim
// moves the fighter, and step after it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLIPS, CLIP_IDS, newFightPose, sampleClip } from '../src/scripts/city3d/fight-anim';
import { MOVES, type MoveId } from '../src/scripts/city3d/fight-moves';
import { fightRows } from '../src/scripts/city3d/fightrubric';
import { PLANTS, STANCE, STEP, createFootwork, plantLegs, plantWeight } from '../src/scripts/city3d/fightfeet';

test('every fight clip passes the rubric, keyed and mirrored', () => {
  for (const id of CLIP_IDS)
    for (const mirror of [false, true]) {
      // (only the hit reactions are ever played mirrored: fight-figure.ts's pickClip)
      if (mirror && !['hitHead', 'hitBody', 'stagger'].includes(id)) continue;
      for (const r of fightRows(id, mirror)) assert.notEqual(r.ok, false, `${id}${mirror ? ' mirrored' : ''}: ${r.name} ${r.value}`);
    }
});

test('the strikes are measured on every row they need', () => {
  for (const id of ['jab', 'cross', 'hook', 'uppercut', 'frontKick', 'roundhouse'] as const) {
    const rows = fightRows(id).map((r) => r.id);
    for (const want of ['slideL', 'slideR', 'drive', 'lead', 'recover']) assert.ok(rows.includes(want), `${id} ${want}`);
  }
  for (const id of ['cross', 'uppercut'] as const) assert.ok(fightRows(id).some((r) => r.id === 'heel'));
  for (const id of ['hitHead', 'hitBody'] as const) for (const want of ['lead', 'hips']) assert.ok(fightRows(id).some((r) => r.id === want), `${id} ${want}`);
});

test('a move\'s clip is still exactly its sim frames long', () => {
  for (const id of Object.keys(MOVES) as MoveId[]) {
    const m = MOVES[id];
    assert.equal(CLIPS[id].frames, m.startup + m.active + m.recovery, id);
  }
});

test('the kicking leg leaves the canvas and comes back to its spot; the standing one never does', () => {
  for (const id of ['frontKick', 'roundhouse'] as const) {
    const n = CLIPS[id].frames;
    assert.equal(plantWeight(id, 1, 0), 1);
    assert.equal(plantWeight(id, 1, Math.round(n / 2)), 0);
    assert.equal(plantWeight(id, 1, n - 1), 1);
    for (let f = 0; f < n; f++) assert.equal(plantWeight(id, 0, f), 1);
  }
  // Clips with no planting leave the pose as it is
  assert.equal(PLANTS.down, undefined);
  const p = sampleClip('down', 10, newFightPose());
  const before = JSON.stringify(p);
  plantLegs(p, 'down', 10);
  assert.equal(JSON.stringify(p), before);
});

test('the footwork: a lunge steps in (the feet never slide), a knock back steps back, and the feet settle in the stance', () => {
  const fw = createFootwork();
  const r = { x: 3, z: 4, yaw: 0.7, scale: 0.85 };
  const dt = 1 / 60;
  fw.update(dt, r, [1, 1]);
  const world = () => fw.feet.map((f) => ({ x: f.x, z: f.z }));
  // A lunge forward of 0.5 tiles over 12 frames, then still
  const fx = Math.sin(r.yaw);
  const fz = Math.cos(r.yaw);
  let first: number | null = null;
  let last = world();
  let steps = 0;
  const wasStepping = [false, false];
  for (let f = 0; f < 90; f++) {
    if (f < 12) {
      r.x += (fx * 0.5) / 12;
      r.z += (fz * 0.5) / 12;
    }
    fw.update(dt, r, [1, 1]);
    const now = world();
    for (let i = 0; i < 2; i++) {
      const stepping = !!fw.feet[i].from;
      const moved = Math.hypot(now[i].x - last[i].x, now[i].z - last[i].z);
      // A foot on the canvas doesn't move; only a stepping one does (and lifts)
      if (!stepping && !wasStepping[i]) assert.ok(moved < 1e-9, `frame ${f} foot ${i} slid ${moved}`);
      if (stepping && !wasStepping[i]) {
        steps++;
        first ??= i;
      }
      if (stepping) assert.ok(fw.balls[i].y >= 0 && fw.balls[i].y <= STEP.lift + 1e-9);
      wasStepping[i] = stepping;
    }
    // Never both feet off the canvas at once
    assert.ok(!(fw.feet[0].from && fw.feet[1].from), `frame ${f} both feet up`);
    last = now;
  }
  // The lead (left) foot steps first going forward, and the feet end on their spots
  assert.equal(first, 0, 'the lead foot first');
  assert.ok(steps >= 2, `steps ${steps}`);
  for (let i = 0; i < 2; i++) assert.ok(Math.hypot(fw.balls[i].x - STANCE[i].x, fw.balls[i].z - STANCE[i].z) <= STEP.settle + 1e-6, `foot ${i} in the stance`);
  // Knocked back: the rear foot goes first
  const fw2 = createFootwork();
  const r2 = { x: 0, z: 0, yaw: 0, scale: 0.85 };
  fw2.update(dt, r2, [1, 1]);
  let back: number | null = null;
  for (let f = 0; f < 30 && back === null; f++) {
    if (f < 8) r2.z -= 0.4 / 8;
    fw2.update(dt, r2, [1, 1]);
    for (let i = 0; i < 2; i++) if (fw2.feet[i].from && back === null) back = i;
  }
  assert.equal(back, 1, 'the rear foot first going back');
});

test('a leg off the canvas lands back on its spot', () => {
  const fw = createFootwork();
  const r = { x: 0, z: 0, yaw: 0, scale: 1 };
  fw.update(1 / 60, r, [1, 1]);
  r.z += 0.3;
  fw.update(1 / 60, r, [1, 0]);
  assert.ok(Math.hypot(fw.balls[1].x - STANCE[1].x, fw.balls[1].z - STANCE[1].z) < 1e-9);
});
