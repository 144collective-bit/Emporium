// Uptown's skyline at night (skyline.ts, docs/finance-plan.md Phase 6): the offices' lights by the hour, switched in
// sections by a hash the shader shares, and the warning lights flashing together.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BEACON, OFFICE, OFFICE_GLSL, beaconOn, officeHash, officeShare } from '../src/scripts/city3d/skyline';

test('the offices: all on through the day and evening, thinning out late, a few through the small hours, back on by seven', () => {
  for (let h = 7; h <= 19; h += 0.5) assert.equal(officeShare(h), 1);
  assert.ok(officeShare(21) > 0.85 && officeShare(21) < 1);
  assert.ok(officeShare(23.5) < officeShare(22) && officeShare(0.5) < officeShare(23.5));
  for (const h of [1.5, 2, 3, 4, 4.9]) assert.ok(officeShare(h) >= 0.25 && officeShare(h) <= 0.32, `a few still lit at ${h}`);
  assert.ok(officeShare(6) > 0.5 && officeShare(6) < 1);
  // Smooth: no hour jumps more than a tenth from the hour a minute before; and the day wraps
  for (let m = 0; m < 24 * 60; m++) assert.ok(Math.abs(officeShare(m / 60) - officeShare((m - 1) / 60)) < 0.1);
  assert.equal(officeShare(24), officeShare(0));
  assert.equal(officeShare(-1), officeShare(23));
});

test('the sections: a few bays wide and a floor high, each its own number, spread evenly', () => {
  assert.ok(OFFICE.w >= 2 && OFFICE.w <= 4.5 && OFFICE.h === 1);
  const n = 4000;
  let on = 0;
  for (let i = 0; i < n; i++) {
    const v = officeHash(-70 + (i % 40), Math.floor(i / 40), 10 + (i % 7));
    assert.ok(v >= 0 && v < 1);
    if (v < 0.3) on++;
  }
  // (a share of 0.3 leaves about three in ten on)
  assert.ok(Math.abs(on / n - 0.3) < 0.05, `${on / n}`);
  // The shader's sum is this one's
  assert.match(OFFICE_GLSL, /12\.9898.*78\.233.*37\.719.*43758\.5453/);
});

test('the warning lights flash together, on a third of each period', () => {
  let on = 0;
  for (let t = 0; t < BEACON.period * 100; t += 0.01) if (beaconOn(t)) on++;
  assert.ok(Math.abs(on / (BEACON.period * 100 * 100) - BEACON.on / BEACON.period) < 0.01);
  assert.equal(beaconOn(0.1), beaconOn(0.1 + BEACON.period * 7));
});
