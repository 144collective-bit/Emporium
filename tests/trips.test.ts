// A trip on the city's two lines (trips.ts, docs/south-plan.md Phase 4h): every stop on both, one ride on the same line,
// the change at The Trenches between them (no ride where you're there already), how long it all takes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_STOPS, CHANGE_AT, CHANGE_S, changes, legTime, sameStop, tripOf, tripTime, type Stop } from '../src/scripts/city3d/trips';
import { STATIONS } from '../src/scripts/city3d/metro';
import { SOUTH_STATIONS } from '../src/scripts/city3d/southline';

test('every stop on both lines, once each, the two Trenches stations where they meet', () => {
  assert.equal(ALL_STOPS.length, STATIONS.length + SOUTH_STATIONS.length);
  assert.equal(new Set(ALL_STOPS.map((s) => `${s.line}:${s.id}`)).size, ALL_STOPS.length);
  for (const line of ['metro', 'tube'] as const) assert.ok(ALL_STOPS.some((s) => s.line === line && s.id === CHANGE_AT[line]), `${line} stops at The Trenches`);
});

test('a trip: one ride on its line, or to The Trenches and on from it on the other, ending where it was going', () => {
  for (const a of ALL_STOPS)
    for (const b of ALL_STOPS) {
      const legs = tripOf(a, b);
      if (sameStop(a, b)) {
        assert.deepEqual(legs, []);
        continue;
      }
      if (!changes(a, b)) {
        assert.deepEqual(legs, [{ line: a.line, from: a.id, to: b.id }]);
        continue;
      }
      // (end to end: each ride starts where the last ended, or across the change at The Trenches)
      let at: Stop = a;
      for (const l of legs) {
        if (l.line !== at.line) {
          assert.equal(at.id, CHANGE_AT[at.line], 'the change is at The Trenches');
          at = { line: l.line, id: CHANGE_AT[l.line] };
        }
        assert.equal(l.from, at.id);
        assert.notEqual(l.from, l.to, 'no ride to where you are');
        at = { line: l.line, id: l.to };
      }
      if (at.line !== b.line) at = { line: b.line, id: CHANGE_AT[b.line] };
      assert.ok(sameStop(at, b), `${a.line}:${a.id} to ${b.line}:${b.id} ends there`);
      assert.ok(legs.length <= 2);
    }
  // (between the two Trenches stations: the change alone)
  assert.deepEqual(tripOf({ line: 'metro', id: 'trenches' }, { line: 'tube', id: 'trenches' }), []);
});

test("a trip's time: its rides and the change, a few minutes at most", () => {
  const up: Stop = { line: 'metro', id: 'downtown' };
  const down: Stop = { line: 'tube', id: 'highroad' };
  assert.ok(Math.abs(tripTime(up, down) - (tripOf(up, down).reduce((t, l) => t + legTime(l), 0) + CHANGE_S)) < 1e-9);
  assert.equal(tripTime({ line: 'metro', id: 'trenches' }, { line: 'tube', id: 'trenches' }), CHANGE_S);
  for (const a of ALL_STOPS) for (const b of ALL_STOPS) assert.ok(tripTime(a, b) < 300, `${a.id} to ${b.id}: ${tripTime(a, b).toFixed(0)} s`);
});
