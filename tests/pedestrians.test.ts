// The people on the sidewalks (pedestrians.ts, city life plan Phase 3): the crossings between the walked
// blocks at the lit junctions, the lights' red time, noticing you, the rain and the hour, and the benches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { JUNCTIONS, lightState } from '../src/scripts/city3d/routes';
import { TRENCH_WALKS } from '../src/scripts/city3d/projects';
import { BENCHES, CROSS_PACE, HURRY, HURRY_RAIN, KERB_LOOK, LINK_MAX, NOTICE, NOTICE_HOLD, PHONE, PHONE_GLANCE, crossingLinks, hurry, hurrying, kerbLook, noticing, onPhone, outAtNight, phoneGlance, redLeft, takesCrossing, walkLight } from '../src/scripts/city3d/pedestrians';

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

test('waiting at a kerb: a look to the left, across to the right, a glance back, then ahead, all smoothly', () => {
  assert.equal(kerbLook(0), 0);
  assert.equal(kerbLook(-1), 0);
  let left = 0;
  let right = 0;
  let last = kerbLook(0);
  let tLeft = Infinity;
  let tRight = Infinity;
  for (let f = 1; f <= 6 * 60; f++) {
    const w = f / 60;
    const y = kerbLook(w);
    assert.ok(Math.abs(y - last) < 0.07, `a jump at ${w}: ${last} -> ${y}`);
    last = y;
    if (y > 0.9) (left++, (tLeft = Math.min(tLeft, w)));
    if (y < -0.9) (right++, (tRight = Math.min(tRight, w)));
  }
  assert.ok(left > 20 && right > 20, `held each side: ${left} ${right} frames`);
  assert.ok(tLeft < tRight, 'the traffic\'s side first');
  assert.ok(Math.abs(kerbLook(4)) < 1e-9 && Math.abs(kerbLook(5.2)) < 1e-9, 'ahead again well inside the wait row\'s loop');
  assert.equal(KERB_LOOK[KERB_LOOK.length - 1][1], 0);
  // The hurry: from half rain, the walk with the head down and the arms in
  assert.equal(hurrying(0), false);
  assert.equal(hurrying(HURRY_RAIN - 0.01), false);
  assert.equal(hurrying(HURRY_RAIN), true);
  assert.equal(hurrying(1), true);
  assert.ok(HURRY.headPitch < -0.1 && HURRY.lean > 0.05 && HURRY.arm.bend > 1.2 && HURRY.grip > 0.5);
});

test('on the phone: about one walker in seven, independent of their walk; reading, a glance up once a loop, smoothly', () => {
  let n = 0;
  let firstHalf = 0;
  for (let i = 0; i < 2000; i++) {
    const seed = i / 2000;
    if (!onPhone(seed)) continue;
    n++;
    if (seed < 0.5) firstHalf++;
  }
  assert.ok(Math.abs(n / 2000 - PHONE.share) < 0.02, `${n} of 2000 on their phones`);
  assert.ok(firstHalf > n * 0.4 && firstHalf < n * 0.6, `spread over both walks: ${firstHalf} of ${n} in the first half`);
  assert.ok(PHONE.share > 0.08 && PHONE.share < 0.25);
  // The phone in front of the chest, under the shoulders; the head down at it, less on the move
  const [x, y, z] = PHONE.at;
  assert.ok(z > 0.12 && z < 0.3 && y > 0.15 && y < 0.36 && Math.abs(x) < 0.1);
  assert.ok(PHONE.headPitch < -0.5 && PHONE.walkPitch < -0.3 && PHONE.walkPitch > PHONE.headPitch && PHONE.grip > 0.5);
  // The glance: down at the start, up and held for a moment, down again before the row loops (3.7 s)
  assert.equal(phoneGlance(0), 0);
  let up = 0;
  let last = phoneGlance(0);
  for (let f = 1; f <= 4 * 60; f++) {
    const w = f / 60;
    const g = phoneGlance(w);
    assert.ok(g >= 0 && g <= 1);
    assert.ok(Math.abs(g - last) < 0.07, `a jump at ${w}: ${last} -> ${g}`);
    last = g;
    if (g > 0.9) up++;
  }
  assert.ok(up > 20 && up < 90, `up for ${up} frames`);
  assert.ok(phoneGlance(3.5) < 1e-9 && phoneGlance(3.7) < 1e-9, 'down again inside the loop');
  assert.equal(PHONE_GLANCE[PHONE_GLANCE.length - 1][1], 0);
});

