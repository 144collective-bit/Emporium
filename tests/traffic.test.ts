// How the traffic behaves (traffic.ts, city life plan Phase 1): the turns a route indicates for, pulling away
// from a stop in turn, the brake lights, the body's nod and lean, and the horn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, type Pt } from '../src/scripts/city3d/routes';
import { HIGHWAY_R } from '../src/scripts/city3d/highway';
import { PITCH_MAX, ROLL_MAX, TURN_LEAD, TURN_LEN, blinkOn, bodyMotion, braking, hornDue, indicating, newBody, newHorn, pullAway, reactionOf, resetBody, turnsOf, type Mover } from '../src/scripts/city3d/traffic';

/** A polyline's cumulative distances, as a Route carries them */
function cumOf(pts: Pt[]) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return cum;
}
/** A rounded corner: from heading a to heading b round a radius r, in steps */
function arc(cx: number, cz: number, r: number, a: number, b: number, n = 8): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = a + ((b - a) * i) / n;
    return [cx + Math.cos(t) * r, cz + Math.sin(t) * r] as Pt;
  });
}

test('a right-angle corner is a turn, the right way round, and a straight road has none', () => {
  // East along z = 0, then a rounded corner to the south (+z): heading +x to +z is a swing of +90°: a right turn (left is -z)
  const right: Pt[] = [[-20, 0], [-2, 0], ...arc(-2, 2, 2, -Math.PI / 2, 0), [0, 20]];
  const t = turnsOf(right, cumOf(right));
  assert.equal(t.length, 1);
  assert.equal(t[0].dir, 'R');
  assert.ok(t[0].from >= 17.9 && t[0].from <= 18.1, `the turn starts where the straight ends (${t[0].from})`);
  assert.ok(t[0].to > t[0].from && t[0].to - t[0].from < 4);
  const left: Pt[] = [[-20, 0], [-2, 0], ...arc(-2, -2, 2, Math.PI / 2, 0), [0, -20]];
  assert.equal(turnsOf(left, cumOf(left))[0]?.dir, 'L');
  const straight: Pt[] = [[0, 0], [10, 0], [20, 0.1], [30, 0]];
  assert.deepEqual(turnsOf(straight, cumOf(straight)), []);
});

test('a long gentle bend (the highway corner) is not a turn; a 45° diagonal is', () => {
  const bend: Pt[] = [[-50, 0], [0, 0], ...arc(0, HIGHWAY_R, HIGHWAY_R, -Math.PI / 2, 0, 24), [HIGHWAY_R, HIGHWAY_R + 50]];
  assert.deepEqual(turnsOf(bend, cumOf(bend)), []);
  const diag: Pt[] = [[-20, 0], [0, 0], [14, 14], [20, 20]];
  const t = turnsOf(diag, cumOf(diag));
  assert.equal(t.length, 1);
  assert.equal(t[0].dir, 'R');
  assert.ok(t[0].to - t[0].from <= TURN_LEN);
});

test('every route has turns where its lanes meet and none longer than TURN_LEN; a car indicates from TURN_LEAD before one', () => {
  let total = 0;
  for (const r of ROUTES) {
    const turns = turnsOf(r.pts, r.cum);
    total += turns.length;
    for (const t of turns) {
      assert.ok(t.to - t.from <= TURN_LEN && t.to > t.from);
      assert.ok(t.from >= 0 && t.to <= r.len);
      // Leading into it (or still in the turn just before it), and in it
      assert.notEqual(indicating(turns, t.from - TURN_LEAD + 0.01, r.len), null);
      assert.equal(indicating(turns, (t.to + t.from) / 2, r.len), t.dir);
    }
    // Turns don't overlap and come in order
    for (let i = 1; i < turns.length; i++) assert.ok(turns[i].from >= turns[i - 1].to);
  }
  assert.ok(total >= ROUTES.length, `the routes turn somewhere (${total} turns)`);
  // Halfway down a long straight, nobody indicates (the routes start halfway down their longest leg)
  const quiet = ROUTES.filter((r) => indicating(turnsOf(r.pts, r.cum), 0, r.len) === null);
  assert.ok(quiet.length > ROUTES.length / 2);
  // In one turn and leading into the next: the one you're in
  assert.equal(indicating([{ from: 10, to: 14, dir: 'R' }, { from: 16, to: 20, dir: 'L' }], 13, 100), 'R');
  assert.equal(indicating([{ from: 10, to: 14, dir: 'R' }, { from: 16, to: 20, dir: 'L' }], 14.5, 100), 'L');
  // Wrapping round the loop's end
  assert.equal(indicating([{ from: 2, to: 6, dir: 'L' }], 99, 100), 'L');
  assert.equal(indicating([{ from: 2, to: 6, dir: 'L' }], 90, 100), null);
});

test('indicators flash at 1.5 Hz, half on, half off, and not all together', () => {
  assert.equal(blinkOn(0), true);
  assert.equal(blinkOn(1 / 3 + 0.01), false);
  assert.equal(blinkOn(2 / 3 + 0.01), true);
  assert.notEqual(blinkOn(0, 0.5), blinkOn(0, 0));
  assert.equal(blinkOn(-0.1), false);
});

test('a queue peels from the front: each car waits its own reaction time once the way ahead opens', () => {
  const dt = 1 / 60;
  const reacts = Array.from({ length: 8 }, (_, i) => reactionOf(i));
  for (const r of reacts) assert.ok(r >= 0.3 && r <= 0.9);
  assert.ok(new Set(reacts.map((r) => r.toFixed(2))).size === reacts.length, 'all different');
  const m: Mover = { v: 0, held: 0, react: 0.5 };
  // Waiting at a red: nothing to wait for
  for (let i = 0; i < 60; i++) assert.equal(pullAway(m, 0, dt), 0);
  assert.equal(m.held, 0);
  // Green: held for the reaction time, then free to go
  let t = 0;
  let go = -1;
  for (let i = 0; i < 120; i++, t += dt) {
    const want = pullAway(m, 5, dt);
    if (want > 0 && go < 0) go = t;
    if (want > 0) m.v = Math.min(5, m.v + 1.8 * dt);
  }
  assert.ok(go >= 0.5 - dt && go <= 0.5 + dt, `moved off after its reaction time (${go.toFixed(3)})`);
  // Rolling, it follows what it's told at once; the wait is forgotten
  assert.equal(pullAway(m, 2, dt), 2);
  assert.equal(m.held, 0);
  // Stopped again (a red), then green: it waits again
  m.v = 0;
  pullAway(m, 0, dt);
  assert.equal(pullAway(m, 5, dt), 0);
});

test('brake lights: on while slowing or holding at a stop, off cruising or pulling away', () => {
  assert.equal(braking(4, 4), false);
  assert.equal(braking(4, 1), true);
  assert.equal(braking(0, 0), true);
  assert.equal(braking(0, 4), false);
  assert.equal(braking(1, 4), false);
  assert.equal(braking(4, 3.9), false);
});

test('the body nods under braking, leans out of a turn, stays within its limits and settles', () => {
  const dt = 1 / 60;
  const b = newBody(5, 0);
  // Hard braking: nose down (negative pitch), no roll
  for (let i = 0; i < 30; i++) bodyMotion(b, Math.max(0, 5 - 5 * i * dt), 0, dt);
  assert.ok(b.pitch < -0.02 && b.pitch >= -PITCH_MAX, `nose down (${b.pitch})`);
  assert.ok(Math.abs(b.roll) < 1e-6);
  // Standing still a while: level again
  for (let i = 0; i < 120; i++) bodyMotion(b, 0, 0, dt);
  assert.ok(Math.abs(b.pitch) < 0.002);
  // A left turn at speed (yaw rising): the right side goes down (positive roll), never past the limit
  const c = newBody(4, 0);
  for (let i = 1; i <= 60; i++) bodyMotion(c, 4, i * 1.2 * dt, dt);
  assert.ok(c.roll > 0.02 && c.roll <= ROLL_MAX, `leans right out of a left turn (${c.roll})`);
  // Turning right: the other way
  const d = newBody(4, 0);
  for (let i = 1; i <= 60; i++) bodyMotion(d, 4, -i * 1.2 * dt, dt);
  assert.ok(d.roll < -0.02);
  // Put back on the road facing another way: no spike, level
  resetBody(d, 3, Math.PI);
  bodyMotion(d, 3, Math.PI, dt);
  assert.ok(Math.abs(d.roll) < 1e-6 && Math.abs(d.pitch) < 1e-6);
  // A zero dt is ignored
  bodyMotion(d, 9, 0, 0);
  assert.equal(d.lastV, 3);
});

test('the horn: a toot after a couple of seconds held up, again later, nothing once the way is clear', () => {
  const dt = 1 / 60;
  const h = newHorn(0);
  let toots: number[] = [];
  for (let t = 0; t < 12; t += dt) if (hornDue(h, true, dt, 0)) toots.push(t);
  assert.equal(toots.length, 2, `two toots in twelve seconds (${toots.map((t) => t.toFixed(1))})`);
  assert.ok(toots[0] >= 2.2 - dt && toots[0] <= 2.2 + dt);
  assert.ok(toots[1] - toots[0] >= 5 - dt);
  // Moving again: forgotten, and the next hold-up waits the full time again
  assert.equal(hornDue(h, false, dt, 0), false);
  assert.equal(h.held, 0);
  toots = [];
  for (let t = 0; t < 2; t += dt) if (hornDue(h, true, dt, 0)) toots.push(t);
  assert.equal(toots.length, 0);
  // A different car waits a little longer
  const h2 = newHorn(1);
  let first = -1;
  for (let t = 0; t < 5 && first < 0; t += dt) if (hornDue(h2, true, dt, 1)) first = t;
  assert.ok(first > 3.3);
});
