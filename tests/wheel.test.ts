// The observation wheel on Uptown's esplanade (wheel.ts, docs/finance-plan.md Phase 7): on the esplanade, the walk
// left open on its river side, clear of the overlooks, the gangways, the river bus and the crossings, its capsules
// over the platform at every turn, the boulevard's trees and benches off it, and well under what flies over.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOOTH, CAPSULE, PLATFORM, WALK_PAST, WHEEL, WHEEL_RECT, WHEEL_SOLIDS, WHEEL_TOP, capsuleAt, wheelAngle } from '../src/scripts/city3d/wheel';
import { BENCH_XS, EDGE_LAMPS, ESPLANADE, GANGWAYS, LAND_TREES, OVERLOOKS, WATER_TREES } from '../src/scripts/city3d/boulevard';
import { STOPS } from '../src/scripts/city3d/riverbus';
import { ROWS_Z, STREET_HALF, crossingsOn } from '../src/scripts/city3d/uptown';
import { FLIGHTS, PERIOD, REACH, poseAt } from '../src/scripts/city3d/airfield';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { JOG } from '../src/scripts/city3d/uptownlife';

const [EX0, EZ0, EX1, EZ1] = ESPLANADE;

test('on the esplanade by the water, the walk open on its avenue side', () => {
  for (const [x0, z0, x1, z1] of WHEEL_SOLIDS) assert.ok(x0 > EX0 && x1 < EX1 && z0 >= EZ0 && z1 < EZ1, `${x0.toFixed(1)}, ${z0.toFixed(1)} on the esplanade`);
  assert.ok(WALK_PAST >= 2.4, 'the walk past it');
  // (and the joggers' lanes, uptownlife.ts, clear of all of it)
  for (const b of WHEEL_SOLIDS) for (const z of [JOG.east, JOG.west]) assert.ok(b[1] > z + 0.3 || b[3] < z - 0.3, `the jog lane at ${z}`);
  // (the booth between the planters along the avenue's side)
  for (const [x, z] of LAND_TREES) assert.ok(Math.abs(x - (BOOTH[0] + BOOTH[2]) / 2) > 1.4 || Math.abs(z - BOOTH[1]) > 1.5, `the booth by the planter at ${x}`);
  // (the rim's plane and its capsules over the deck, not the water; the capsules between the rings)
  assert.ok(WHEEL.z + WHEEL.half + 0.1 < EZ1);
  assert.ok(CAPSULE.d / 2 + 0.12 < WHEEL.half);
});

test('clear of the overlooks, the gangways, the river bus and the crossings', () => {
  const [x0, , x1] = WHEEL_RECT;
  for (const o of OVERLOOKS) assert.ok(x1 < o.rect[0] - 1 || x0 > o.rect[2] + 1, `the overlook at ${o.x}`);
  for (const g of GANGWAYS) assert.ok(g < x0 - 1 || g > x1 + 1, `the gangway at ${g}`);
  for (const s of STOPS) assert.ok(s.landing[2] < x0 - 1 || s.landing[0] > x1 + 1 || s.landing[1] > 100, `the ${s.name} landing`);
  for (const c of crossingsOn(ROWS_Z[ROWS_Z.length - 1])) for (const [bx0, , bx1] of WHEEL_SOLIDS) assert.ok(bx1 < c - STREET_HALF - 1 || bx0 > c + STREET_HALF + 1, `the crossing at ${c}`);
});

test('its capsules hang over the platform at every turn, and it turns once a period', () => {
  for (let t = 0; t < WHEEL.period; t += 0.5)
    for (let i = 0; i < WHEEL.capsules; i++) {
      const [, y] = capsuleAt(i, t);
      assert.ok(y - CAPSULE.h / 2 >= PLATFORM[4] + 0.02, `capsule ${i} at ${t}`);
    }
  assert.ok(Math.abs(wheelAngle(WHEEL.period / 4) - Math.PI / 2) < 1e-9);
  assert.deepEqual(capsuleAt(3, 10), capsuleAt(3, 10 + WHEEL.period));
});

test("the boulevard's trees and benches keep off it; its solids clear of everything else's", () => {
  const [x0, z0, x1, z1] = WHEEL_RECT;
  for (const [x, z] of [...LAND_TREES, ...WATER_TREES]) assert.ok(!(x > x0 - 0.5 && x < x1 + 0.5 && z > z0 - 0.5 && z < z1), `a tree at ${x}`);
  for (const x of BENCH_XS) assert.ok(x < x0 || x > x1, `a bench at ${x}`);
  for (const [x] of EDGE_LAMPS) assert.ok(x < x0 || x > x1, `a lamp at ${x}`);
  const own = new Set(WHEEL_SOLIDS.map((b) => b.join()));
  for (const w of WHEEL_SOLIDS) for (const o of SOLIDS) if (!own.has(o.join())) assert.ok(!(w[0] < o[2] && o[0] < w[2] && w[1] < o[3] && o[1] < w[3]), `the wheel hits ${o}`);
});

test('well under what flies over', () => {
  for (let t = 0; t < PERIOD; t += 0.5)
    for (const f of FLIGHTS) {
      const p = poseAt(f, t);
      const r = REACH[f.kind] + 2;
      const near = Math.abs(p.x - WHEEL.x) < WHEEL.r + r && Math.abs(p.z - WHEEL.z) < 1 + r;
      assert.ok(!near || p.y > WHEEL_TOP + r, `${f.id} at ${t}`);
    }
});
