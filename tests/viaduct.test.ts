// The raised highway's shape (viaduct.ts, viapiers.ts; docs/highway-plan.md Phase 1): the ring worked out exactly,
// the deck high enough for everything that drives under it, eight exits laid as partial cloverleafs on their corner
// sides, their ramps climbing no steeper than they may and meeting the arterial at grade, and the piers clear of
// everything that passes under.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIGHWAY_HALF, fromHighway } from '../src/scripts/city3d/highway';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { CARS, TRAILER } from '../src/scripts/city3d/carspec';
import { TRACKS } from '../src/scripts/city3d/metro';
import { inWater } from '../src/scripts/city3d/river';
import { BRIDGE_PIERS } from '../src/scripts/city3d/waterfront';
import {
  BESIDE,
  CLEARANCE,
  DECK_HALF,
  DECK_Y,
  EXITS,
  OUTER_LANE,
  PIER_GAP,
  RAMPS,
  RAMP_GRADE,
  RAMP_HALF,
  REACH,
  RING_LEN,
  exitS,
  ringAt,
  ringPoint,
  ringS,
  sGap,
  steepest,
} from '../src/scripts/city3d/viaduct';
import { PIERS, PIER_CLEAR } from '../src/scripts/city3d/viapiers';

test('the ring is the highway centre line exactly, and ringS finds any point on it again', () => {
  assert.ok(Math.abs(RING_LEN - (2 * 350 + 2 * 350 + 2 * Math.PI * 70)) < 1e-6);
  for (let s = 0; s < RING_LEN; s += 7.3) {
    const r = ringAt(s);
    assert.ok(fromHighway(r.x, r.z) < 1e-6, `on the box at ${s}`);
    assert.ok(Math.abs(Math.hypot(r.tx, r.tz) - 1) < 1e-9 && Math.abs(r.tx * r.nx + r.tz * r.nz) < 1e-9);
    // Outward is outward: a step out is further from the middle of the box
    const [ox, oz] = ringPoint(s, 5);
    assert.ok(Math.hypot(ox - 30, oz - 75) > Math.hypot(r.x - 30, r.z - 75), `outward at ${s}`);
    for (const o of [-20, -3, 0, 4, 25]) {
      const [x, z] = ringPoint(s, o);
      const back = ringS(x, z);
      assert.ok(Math.abs(sGap(s, back.s)) < 1e-3 && Math.abs(back.o - o) < 1e-3, `ringS at ${s}, ${o}: ${back.s}, ${back.o}`);
    }
  }
});

test('the deck leaves room under it for the tallest thing in the traffic, a rig with its trailer and the bus', () => {
  const tallest = Math.max(...Object.values(CARS).flatMap((c) => [...c.cabin.map((p) => p[1]), ...c.top.map((p) => p[1]), c.box?.[2] ?? 0]), TRAILER.h);
  assert.ok(CLEARANCE > tallest + 0.4, `clearance ${CLEARANCE} over ${tallest}`);
  assert.ok(DECK_HALF > HIGHWAY_HALF);
});

test('eight exits, numbered clockwise from the stadium, each at an arterial junction of today', () => {
  assert.equal(EXITS.length, 8);
  let last = -Infinity;
  const start = exitS(EXITS[0]);
  for (const e of EXITS) {
    const c = PLAN.crossings.find((k) => k.id === e.crossing)!;
    assert.ok(c && c.streets.includes('highway') && c.streets.includes(e.street), e.crossing);
    assert.ok(Math.hypot(c.at[0] - e.at[0], c.at[1] - e.at[1]) < 0.5);
    const s = (exitS(e) - start + RING_LEN) % RING_LEN;
    assert.ok(s > last, `exit ${e.n} after the one before`);
    last = s;
  }
});

test("each exit's ramps keep to its corner side, clear of the next arterial along the ring", () => {
  const meets = PLAN.crossings.filter((c) => c.streets.includes('highway'));
  for (const e of EXITS) {
    const s0 = exitS(e);
    for (const c of meets) {
      if (c.id === e.crossing) continue;
      const d = sGap(s0, ringS(c.at[0], c.at[1]).s) * e.side;
      assert.ok(d < 0 || d > REACH + 4, `exit ${e.n}: ${c.id} is ${d.toFixed(1)} along its side`);
    }
    for (const r of RAMPS.filter((r) => r.exit === e.n))
      for (const p of r.pts) assert.ok(sGap(s0, ringS(p[0], p[1]).s) * e.side > -0.5, `${r.id} strays to the other side`);
  }
});

test("each quadrant's ramps by its form: a loop and a straight ramp round it, a slip ramp, or none; every exit gets off and on", () => {
  for (const e of EXITS) {
    const mine = RAMPS.filter((r) => r.exit === e.n);
    for (const q of [-1, 1] as const) {
      const side = mine.filter((r) => r.q === q);
      const form = q < 0 ? e.inner : e.outer;
      assert.deepEqual(side.map((r) => r.shape).sort(), form === 'full' ? ['loop', 'straight'] : form === 'slip' ? ['slip'] : [], `exit ${e.n} ${q}`);
      if (form === 'full') assert.deepEqual(side.map((r) => r.kind).sort(), ['off', 'on']);
    }
    assert.ok(mine.some((r) => r.kind === 'off') && mine.some((r) => r.kind === 'on'), `exit ${e.n} gets off and on`);
  }
});

test('every ramp meets the arterial at grade at its terminal, climbs no steeper than it may, and joins the outer lane at deck height', () => {
  for (const r of RAMPS) {
    const e = EXITS.find((x) => x.n === r.exit)!;
    const art = PLAN.streets.find((s) => s.id === e.street)!;
    assert.ok(distToStreet(art, r.terminal) < 0.5, `${r.id}: its terminal on ${e.street}`);
    const atTerminal = r.kind === 'off' ? r.pts.length - 1 : 0;
    const atDeck = r.kind === 'off' ? 0 : r.pts.length - 1;
    assert.deepEqual(r.pts[atTerminal], r.terminal);
    assert.equal(r.ys[atTerminal], 0);
    assert.equal(r.ys[atDeck], DECK_Y);
    const deck = ringS(r.pts[atDeck][0], r.pts[atDeck][1]);
    assert.ok(Math.abs(Math.abs(deck.o) - OUTER_LANE) < 0.05, `${r.id} joins the outer lane`);
    // The way it's driven there is the carriageway's own (clockwise inside, anticlockwise outside)
    const next = r.pts[r.kind === 'off' ? 1 : r.pts.length - 2];
    const along = sGap(ringS(next[0], next[1]).s, deck.s) * (r.kind === 'off' ? -1 : 1);
    assert.ok(along * (r.q < 0 ? 1 : -1) > 0, `${r.id} runs the carriageway's way`);
    assert.ok(steepest(r) <= RAMP_GRADE + 1e-6, `${r.id}: ${steepest(r).toFixed(3)}`);
    // Off the deck everywhere but where it joins, and level with it there
    for (let i = 0; i < r.pts.length; i++) {
      const { o } = ringS(r.pts[i][0], r.pts[i][1]);
      if (Math.abs(o) < BESIDE - 0.01) assert.equal(r.ys[i], DECK_Y, `${r.id} over the deck below its height at ${i}`);
    }
  }
});

test("an exit's ramps never run into each other", () => {
  for (const e of EXITS) {
    const mine = RAMPS.filter((r) => r.exit === e.n);
    for (let a = 0; a < mine.length; a++)
      for (let b = a + 1; b < mine.length; b++)
        for (let i = 0; i < mine[a].pts.length; i++)
          for (let j = 0; j < mine[b].pts.length; j++) {
            const [p, q] = [mine[a].pts[i], mine[b].pts[j]];
            // (both up on the deck where they join it is the deck itself)
            if (mine[a].ys[i] === DECK_Y && mine[b].ys[j] === DECK_Y) continue;
            assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1]) > 2 * RAMP_HALF + 0.3, `${mine[a].id} meets ${mine[b].id}`);
          }
  }
});

test('the piers stand clear of every street that passes under, the metro, the boats and each other', () => {
  assert.ok(PIERS.length > 100);
  const under = PLAN.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'slip');
  for (let i = 0; i < PIERS.length; i++) {
    const p = PIERS[i];
    assert.ok(fromHighway(p.at[0], p.at[1]) < 1e-6);
    for (const s of under) assert.ok(distToStreet(s, p.at) > s.half + PIER_CLEAR, `a pier at ${p.s.toFixed(1)} on ${s.id}`);
    for (const t of Object.values(TRACKS))
      for (let k = 1; k < t.pts.length; k++) {
        const [a, b] = [t.pts[k - 1], t.pts[k]];
        const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
        const u = Math.max(0, Math.min(1, ((p.at[0] - a[0]) * dx + (p.at[1] - a[1]) * dz) / (dx * dx + dz * dz)));
        assert.ok(Math.hypot(p.at[0] - a[0] - u * dx, p.at[1] - a[1] - u * dz) > 2, `a pier at ${p.s.toFixed(1)} under the metro`);
      }
    if (inWater(p.at[0], p.at[1])) assert.ok(BRIDGE_PIERS.some((z) => Math.abs(p.at[1] - z) < 0.5), `a pier in a boat lane at ${p.s.toFixed(1)}`);
    const gap = (PIERS[(i + 1) % PIERS.length].s - p.s + RING_LEN) % RING_LEN;
    assert.ok(gap > PIER_GAP / 2 && gap < 3 * PIER_GAP, `piers ${gap.toFixed(1)} apart at ${p.s.toFixed(1)}`);
  }
});
