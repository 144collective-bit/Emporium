// How Degen moves (animation Phase 1, movesim.ts): the springs start, stop and turn him in the
// Spider-Man middle (quick, with weight), never overshoot, and `ahead()` says where they'll take him.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAITS, ahead, newMove, stepMove } from '../src/scripts/city3d/movesim';
import { wrap } from '../src/scripts/city3d/inertia';

const DT = 1 / 60;
const speed = (s: { vx: number; vz: number }) => Math.hypot(s.vx, s.vz);

test('the speeds: a walk, the run he goes at and a faster sprint', () => {
  assert.ok(GAITS.walk < GAITS.run && GAITS.run < GAITS.sprint);
  // (about 1.4, 5 and 7.5 m/s: a tile is about 1.8 m)
  assert.ok(Math.abs(GAITS.walk * 1.8 - 1.4) < 0.15 && Math.abs(GAITS.run * 1.8 - 5) < 0.3 && Math.abs(GAITS.sprint * 1.8 - 7.5) < 0.3, 'a walk, a quick run and a sprint');
});

test('from standing he reaches his run in about a quarter of a second, and never overshoots', () => {
  const s = newMove();
  let t = 0;
  let top = 0;
  let reached = -1;
  for (let i = 0; i < 120; i++) {
    stepMove(s, 0, GAITS.run, true, DT);
    t += DT;
    top = Math.max(top, speed(s));
    if (reached < 0 && speed(s) > GAITS.run * 0.9) reached = t;
  }
  assert.ok(reached > 0.18 && reached < 0.38, `90% of his run at ${reached.toFixed(2)} s`);
  assert.ok(top < GAITS.run * 1.005, 'no overshoot');
});

test('stopping from a run takes a short distance, not none', () => {
  const s = newMove();
  for (let i = 0; i < 120; i++) stepMove(s, 0, GAITS.run, true, DT);
  let d = 0;
  let t = 0;
  while (speed(s) > 0.05 && t < 2) {
    stepMove(s, 0, 0, true, DT);
    d += speed(s) * DT;
    t += DT;
  }
  assert.ok(t < 0.45, `stopped in ${t.toFixed(2)} s`);
  assert.ok(d > 0.3 && d < 1.2, `${d.toFixed(2)} tiles to stop`);
});

test('he turns round to face the other way in about a third of a second', () => {
  const s = newMove(0);
  let t = 0;
  while (Math.abs(wrap(s.face - Math.PI)) > 0.1 && t < 2) {
    stepMove(s, 0, -GAITS.run, true, DT);
    t += DT;
  }
  assert.ok(t < 0.4, `turned in ${t.toFixed(2)} s`);
});

test('ahead() is where the springs then take him', () => {
  for (const [vx, vz, gx, gz] of [
    [0, 0, 0, GAITS.run],
    [0, GAITS.run, GAITS.run, 0],
    [1, 2, 0, 0],
    [0, GAITS.sprint, 0, -GAITS.run],
  ]) {
    const s = newMove(Math.atan2(vx, vz));
    s.vx = vx;
    s.vz = vz;
    const pred = ahead(s, gx, gz, 1, { x: 0, z: 0, face: 0 });
    let x = 0;
    let z = 0;
    for (let i = 0; i < 600; i++) {
      stepMove(s, gx, gz, true, 1 / 600);
      x += s.vx / 600;
      z += s.vz / 600;
    }
    // (turning straight round, the spring changes half-life on the way, slowing then speeding up: a little apart)
    const reverses = vx * gx + vz * gz < 0;
    assert.ok(Math.hypot(pred.x - x, pred.z - z) < (reverses ? 0.08 : 0.02), `predicted (${pred.x.toFixed(2)}, ${pred.z.toFixed(2)}), went (${x.toFixed(2)}, ${z.toFixed(2)})`);
    assert.ok(Math.abs(wrap(pred.face - s.face)) < 0.02, 'facing as predicted');
  }
});

test('in the air there is hardly any control', () => {
  const s = newMove();
  for (let i = 0; i < 15; i++) stepMove(s, 0, GAITS.run, false, DT);
  assert.ok(speed(s) < GAITS.run * 0.4, `${speed(s).toFixed(2)} after a quarter second in the air`);
});
