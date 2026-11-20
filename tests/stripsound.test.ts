/*
 * The Neon Mile's moving sounds (stripsound.ts, docs/strip-plan.md Phase 7): the coaster heard where it's drawn
 * (its rattle by its speed, the chain's clatter only climbing, screams only down a drop), the monorail's hum where its
 * train is (softer standing at a station), and nothing of either far off.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COASTER_LAP, coasterAt } from '../src/scripts/city3d/resorts';
import { MONO, monoAt } from '../src/scripts/city3d/monorail';
import { CLIMB, DROP, stripNoise } from '../src/scripts/city3d/stripsound';

const times = (n: number, step = 0.1) => Array.from({ length: Math.ceil(n / step) }, (_, i) => i * step);
/** The coaster's lead car and how fast it climbs at t */
function coaster(t: number) {
  const u = (t / COASTER_LAP) % 1;
  const a = coasterAt(u);
  const b = coasterAt(u + 0.1 / COASTER_LAP);
  return { x: a[0], z: a[2], vy: (b[1] - a[1]) / 0.1 };
}

test('the coaster: heard by its train, the chain only climbing, screams only down a drop, all of it between 0 and 1', () => {
  let climbs = 0;
  let drops = 0;
  for (const t of times(COASTER_LAP)) {
    const c = coaster(t);
    const n = stripNoise(c.x, c.z, t);
    for (const v of Object.values(n)) assert.ok(v >= 0 && v <= 1, `${v} at ${t}`);
    assert.ok(n.rattle > 0.05, `its rattle by the train (quieter slowing over a crest) at ${t.toFixed(1)}`);
    if (n.clatter > 0) (climbs++, assert.ok(c.vy > CLIMB));
    if (n.scream > 0) (drops++, assert.ok(c.vy < -DROP));
  }
  assert.ok(climbs > 10 && drops > 3, `it climbs (${climbs}) and drops (${drops}) every lap`);
  // Far off, nothing
  const far = stripNoise(0, -200, 5);
  assert.equal(far.rattle + far.clatter + far.scream, 0);
});

test('the monorail: its hum where the train is, softer standing at a station, nothing far off', () => {
  let running = 0;
  let standing = 0;
  for (const t of times(240, 0.5)) {
    const m = monoAt(t);
    const n = stripNoise(m.x, MONO.z, t);
    assert.ok(n.mono > 0 && n.mono <= 1);
    if (m.stopped) (standing++, assert.ok(n.mono < 0.4, `softer at a station at ${t}`));
    else (running++, assert.ok(n.mono > 0.8, `loud running by at ${t}`));
  }
  assert.ok(running > 10 && standing > 10);
  assert.equal(stripNoise(0, -200, 5).mono, 0);
});
