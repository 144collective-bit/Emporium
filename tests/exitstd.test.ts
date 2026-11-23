// The motorway exits' standard (exitstd.ts; docs/exits-plan.md Phase 1): its numbers as the plan's table has them, and
// the checks catching each breach on hand-made ramps and interchanges.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXIT_STD, checkInterchanges, checkRamp, radiusThrough, rampWidth, type Interchange, type Pt, type Ramp } from '../src/scripts/city3d/exitstd';

/** A straight off-ramp, 80 long, climbing down 4 from the deck: one that meets every rule */
function good(over: Partial<Ramp> = {}): Ramp {
  const pts: Pt[] = Array.from({ length: 9 }, (_, i) => [0, i * 10]);
  return { id: 'r', kind: 'off', pts, y: pts.map((_, i) => 4 - i * 0.45), lanes: 2, width: rampWidth(2), speedLane: 55, taper: 15, ...over };
}

test("the standard's numbers are the plan's table", () => {
  assert.equal(EXIT_STD.lane, 1.7);
  assert.ok(Math.abs(rampWidth(2) - 4.4) < 1e-9, 'a two-lane ramp 4.4 across its parapets');
  assert.ok(Math.abs(rampWidth(1) - 2.7) < 1e-9);
  assert.equal(EXIT_STD.grade, 0.05);
  assert.equal(EXIT_STD.clearance, 2.8);
  assert.deepEqual([EXIT_STD.decel, EXIT_STD.decelTaper, EXIT_STD.accel, EXIT_STD.accelTaper], [55, 15, 80, 25]);
  assert.deepEqual([EXIT_STD.loopRadius, EXIT_STD.deckRadius], [25, 60]);
});

test('a ramp built to the standard has no breaches', () => {
  assert.deepEqual(checkRamp(good()), []);
  assert.deepEqual(checkRamp(good({ kind: 'on', speedLane: 80, taper: 25 })), []);
});

test('each rule is caught on its own', () => {
  const rules = (r: Ramp) => [...new Set(checkRamp(r).map((b) => b.rule))];
  assert.deepEqual(rules(good({ width: 2.6 })), ['width']);
  assert.deepEqual(rules(good({ y: good().pts.map((_, i) => 6 - i * 0.7) })), ['grade']);
  assert.deepEqual(rules(good({ speedLane: 30 })), ['speedLane']);
  assert.deepEqual(rules(good({ taper: 5 })), ['taper']);
  assert.deepEqual(rules(good({ kind: 'on' })), ['speedLane', 'taper'], 'an on-ramp needs the longer lane');
  // A tight bend near the deck end (radius about 14): breaks the deck's 60; the same bend further down only a loop's 25
  const bent: Pt[] = [[0, 0], [0, 10], [5, 18], [14, 22], [24, 23], [34, 23], [44, 23], [54, 23], [64, 23]];
  assert.deepEqual(rules(good({ pts: bent, y: bent.map(() => 0) })), ['radius']);
  assert.ok(radiusThrough([0, 0], [10, 0], [20, 0]) === Infinity);
  assert.ok(Math.abs(radiusThrough([10, 0], [0, 10], [-10, 0]) - 10) < 1e-9);
});

test('a ramp keeps clear of solids, other streets and pillars, but may meet its own street', () => {
  const r = good({ street: 'foot' });
  const near = { solids: [[2.4, 30, 6, 34]] as [number, number, number, number][] };
  assert.ok(checkRamp(r, near).some((b) => b.rule === 'solid'));
  assert.deepEqual(checkRamp(r, { solids: [[20, 30, 24, 34]] }), []);
  const cross = { id: 'cross', pts: [[-20, 50], [20, 50]] as Pt[], half: 1.7 };
  assert.ok(checkRamp(r, { streets: [cross] }).some((b) => b.rule === 'street'));
  assert.deepEqual(checkRamp(r, { streets: [{ ...cross, id: 'foot' }] }), []);
  assert.ok(checkRamp(r, { pillars: [[2.5, 40]] }).some((b) => b.rule === 'pillar'));
  assert.deepEqual(checkRamp(r, { pillars: [[4, 40]] }), []);
});

test('interchanges: clearance under the deck, and one a side round the ring', () => {
  const x = (id: string, at: number, clearance = 2.8): Interchange => ({ id, at, ramps: [good({ id: `${id}-r` })], clearance });
  // Four, a side each round a 1,840 ring: none
  assert.deepEqual(checkInterchanges([x('n', 0), x('e', 460), x('s', 920), x('w', 1380)], 1840), []);
  // Too close (and across the ring's start), and too low
  const b = checkInterchanges([x('n', 1800), x('e', 60), x('s', 920, 2.5)], 1840);
  assert.deepEqual([...new Set(b.map((q) => q.rule))].sort(), ['clearance', 'spacing']);
  assert.ok(b.some((q) => q.id === 'n-e' && q.note.startsWith('100 apart')));
});

test("a ramp's foot meets its own street near square", () => {
  const square = { id: 'foot', pts: [[-20, 80], [20, 80]] as Pt[], half: 1.7 };
  const slant = { id: 'foot', pts: [[-20, 60], [20, 100]] as Pt[], half: 1.7 };
  assert.deepEqual(checkRamp(good({ street: 'foot' }), { streets: [square] }), []);
  assert.ok(checkRamp(good({ street: 'foot' }), { streets: [slant] }).some((b) => b.rule === 'angle' && b.note.includes('45 degrees')));
});
