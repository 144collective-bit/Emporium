// Northgate Air Base's people (airbaselife.ts, docs/military-plan.md Phase 4): inside its fence, on their feet, clear of
// everything solid and of each other; the drill, the walkers and the patrols on their rounds, never out of the base
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_IDLE, BASE_MOVERS, BEATS, DRILL } from '../src/scripts/city3d/airbaselife';
import { inAirbase } from '../src/scripts/city3d/airbase';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { moment } from '../src/scripts/city3d/parklife';
import { districtAt } from '../src/scripts/city3d/crowdlook';

const R = 0.35;
const inSolid = (x: number, z: number) => SOLIDS.some((b) => x > b[0] - R && x < b[2] + R && z > b[1] - R && z < b[3] + R);

test('standing about: inside the fence, in uniform, clear of everything solid and of each other', () => {
  assert.ok(BASE_IDLE.length >= 12 && BASE_IDLE.length <= 30, `${BASE_IDLE.length} standing`);
  for (const p of BASE_IDLE) {
    assert.ok(inAirbase(p.x, p.z) && districtAt(p.x, p.z) === 'airbase', `${p.x}, ${p.z} outside the base`);
    assert.ok(!inSolid(p.x, p.z), `${p.x.toFixed(1)}, ${p.z.toFixed(1)} in something solid`);
    // (no one as a guard: that's the crowd's bouncers' look)
    assert.notEqual(p.act, 'guard');
  }
  for (let i = 0; i < BASE_IDLE.length; i++) for (let j = i + 1; j < BASE_IDLE.length; j++) assert.ok(Math.hypot(BASE_IDLE[i].x - BASE_IDLE[j].x, BASE_IDLE[i].z - BASE_IDLE[j].z) > 0.9, `two standing on each other at ${BASE_IDLE[i].x}, ${BASE_IDLE[i].z}`);
});

test('the drill, the walkers and the patrols: round and round, never out of the base or into anything solid', () => {
  assert.ok(BASE_MOVERS.length >= DRILL.n + BEATS.length * 2);
  assert.equal(new Set(BASE_MOVERS.map((p) => p.id)).size, BASE_MOVERS.length);
  const m = moment();
  for (let t = 0; t < 600; t += 1.7)
    for (const p of BASE_MOVERS) {
      p.at(t, m);
      assert.ok(Number.isFinite(m.x) && Number.isFinite(m.z) && Number.isFinite(m.ry));
      assert.ok(inAirbase(m.x, m.z), `${p.id} out of the base at ${m.x.toFixed(1)}, ${m.z.toFixed(1)}`);
      assert.ok(!inSolid(m.x, m.z), `${p.id} in something solid at ${m.x.toFixed(1)}, ${m.z.toFixed(1)} (t ${t.toFixed(1)})`);
      assert.equal(m.clip, 'walk');
      assert.ok(m.speed > 0 && m.speed < 1);
    }
  // (phones: about half of them)
  const kept = BASE_MOVERS.filter((p) => !p.trim).length;
  assert.ok(kept >= BASE_MOVERS.length / 2 - 1 && kept < BASE_MOVERS.length);
});
