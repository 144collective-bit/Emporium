// The people on the sidewalks (pedestrians.ts, city life plan Phase 3): the crossings between the walked
// blocks at the lit junctions, the lights' red time, noticing you, the rain and the hour, and the benches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { JUNCTIONS, lightState } from '../src/scripts/city3d/routes';
import { TRENCH_WALKS } from '../src/scripts/city3d/projects';
import { BENCHES, CROSS_PACE, LINK_MAX, NOTICE, NOTICE_HOLD, crossingLinks, hurry, noticing, outAtNight, redLeft, takesCrossing, walkLight } from '../src/scripts/city3d/pedestrians';

/** The blocks the walkers go round (life.ts: downtown's, the south row's, The Trenches' nearest The Block) */
const walked = PLAN.blocks.filter((b) => b.id.startsWith('dt-') || (b.use === 'district' && b.ref!.startsWith('S')) || TRENCH_WALKS.includes(b.id));
const links = crossingLinks(
  walked.map((b) => b.poly),
  PLAN.streets,
  JUNCTIONS
);

test('downtown has crossings at its lit junctions, each over exactly one street, both ways', () => {
  assert.ok(links.length >= 16, `${links.length} crossings`);
  for (const l of links) {
    assert.notEqual(l.a, l.b);
    assert.ok(l.len > 2.5 && l.len <= LINK_MAX);
    assert.ok(l.j.lit);
    const M = [(l.from[0] + l.to[0]) / 2, (l.from[1] + l.to[1]) / 2] as [number, number];
    const on = PLAN.streets.filter((s) => s.lanes > 0 && distToStreet(s, M) < 0.6);
    assert.equal(on.length, 1, 'the middle of a crossing is on one street');
    assert.ok(l.j.streets.includes(on[0]), 'the junction it waits on is on that street');
    assert.ok(Math.hypot(l.j.at[0] - M[0], l.j.at[1] - M[1]) <= LINK_MAX);
    // Both ways are listed
    assert.ok(links.some((o) => o.a === l.b && o.b === l.a && o.from === l.to && o.to === l.from));
  }
  // Downtown's blocks are all reachable from each other over the crossings
  const dt = walked.map((b, i) => (b.id.startsWith('dt-') ? i : -1)).filter((i) => i >= 0);
  const seen = new Set([dt[0]]);
  for (let grown = true; grown; ) {
    grown = false;
    for (const l of links) if (seen.has(l.a) && !seen.has(l.b) && dt.includes(l.b)) (seen.add(l.b), (grown = true));
  }
  assert.equal(seen.size, dt.length, 'every downtown block joins the others');
});

test('no crossing spans an avenue, and none over the ring to the districts', () => {
  for (const l of links) {
    const M = [(l.from[0] + l.to[0]) / 2, (l.from[1] + l.to[1]) / 2] as [number, number];
    const s = PLAN.streets.find((s) => s.lanes > 0 && distToStreet(s, M) < 0.6)!;
    assert.ok(s.lanes === 1, `${s.id} is a street, not an avenue`);
  }
  // Downtown's blocks never link to the south row's (the river and the avenues are between)
  for (const l of links) assert.equal(walked[l.a].id.startsWith('dt-'), walked[l.b].id.startsWith('dt-'));
});

test('the red time: the seconds the cars stay held, and the walk light needs time to get over', () => {
  const j = JUNCTIONS.find((j) => j.lit && !j.three)!;
  let reds = 0;
  for (let t = 0; t < 44; t += 0.5) {
    const left = redLeft(j, 'x', t);
    if (lightState(j, 'x', t) === 'r') {
      reds++;
      assert.ok(left > 0);
      assert.notEqual(lightState(j, 'x', t + left), 'r', 'the red ends when it says');
      if (left > 0.5) assert.equal(lightState(j, 'x', t + left - 0.5), 'r');
    } else assert.equal(left, 0);
  }
  assert.ok(reds > 0);
  const link = links[0];
  let ok = 0;
  let late = 0;
  for (let t = 0; t < 60; t += 0.25) {
    const go = walkLight(link, t, 0.55);
    if (go) {
      ok++;
      // Whoever steps off now gets over before the cars go
      const over = link.len / (0.55 * CROSS_PACE);
      assert.equal(lightState(link.j, link.phase, t + over), 'r');
    } else if (lightState(link.j, link.phase, t) === 'r') late++;
  }
  assert.ok(ok > 0, 'there is a time to cross');
  assert.ok(late > 0, 'late in the red nobody steps off');
  // Not everyone crosses, and each walker has their own pattern
  const takes = Array.from({ length: 40 }, (_, n) => takesCrossing(0.3, n)).filter(Boolean).length;
  assert.ok(takes > 10 && takes < 30);
  assert.notDeepEqual(
    Array.from({ length: 10 }, (_, n) => takesCrossing(0.3, n)),
    Array.from({ length: 10 }, (_, n) => takesCrossing(0.8, n))
  );
});

test('noticing you: stop and look within reach, a little longer for a car, carry on a moment after', () => {
  const s = { hold: 0 };
  assert.equal(noticing(s, NOTICE + 0.1, 0, true, 1 / 60), false);
  assert.equal(noticing(s, NOTICE - 0.1, 0, true, 1 / 60), true);
  // A car reaches further
  const c = { hold: 0 };
  assert.equal(noticing(c, NOTICE + 0.5, 0.8, true, 1 / 60), true);
  // Gone: looking a moment longer, then on their way
  let t = 0;
  while (noticing(s, 10, 0, true, 1 / 60)) t += 1 / 60;
  assert.ok(t >= NOTICE_HOLD - 1 / 30 && t <= NOTICE_HOLD + 1 / 30);
  // Not walking at all: nobody notices
  assert.equal(noticing({ hold: 0 }, 0.1, 0, false, 1 / 60), false);
});

test('the rain hurries them, the small hours thin them', () => {
  assert.equal(hurry(0), 1);
  assert.ok(Math.abs(hurry(1) - 1.4) < 1e-9);
  assert.ok(hurry(2) <= 1.4 && hurry(-1) === 1);
  assert.equal(outAtNight(1, 3), false);
  assert.equal(outAtNight(2, 3), true);
  assert.equal(outAtNight(1, 12), true);
  assert.equal(outAtNight(1, 0.5), true);
  assert.equal(outAtNight(1, 5), true);
});

test('the benches: plenty, each a real spot with a facing', () => {
  assert.ok(BENCHES.length >= 25, `${BENCHES.length} benches`);
  for (const b of BENCHES) assert.ok([b.x, b.z, b.ry].every(Number.isFinite));
  // No two on the same spot
  const spots = new Set(BENCHES.map((b) => `${b.x.toFixed(2)},${b.z.toFixed(2)}`));
  assert.equal(spots.size, BENCHES.length);
});
