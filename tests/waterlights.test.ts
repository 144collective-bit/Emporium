// The lights in the water (waterlights.ts, docs/water-plan.md step 2): which lights reflect, in which water, the
// landmarks' lights by the water, and the moving lights each drawing hands over.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REACH, TINT, boatLamp, fromLake, fromRiver, landmarkLights, movingLights, onBoat, setMovingLights, waterUnder, type WaterLight } from '../src/scripts/city3d/waterlights';
import { WATER_Y, edgesAt } from '../src/scripts/city3d/river';
import { LAKE_Y } from '../src/scripts/city3d/riverwater';
import { LAKE_C, lakeR } from '../src/scripts/city3d/westlake';
import { RIVER } from '../src/scripts/city3d/layout';
import { CLUB } from '../src/scripts/city3d/avenue';
import { WHEEL } from '../src/scripts/city3d/wheel';

const at = (x: number, y: number, z: number): WaterLight => ({ x, y, z, color: TINT.white, size: 0.2 });

test('a lamp on a promenade shows in the river, one downtown does not', () => {
  // (the town's promenades east of the cove: a lamp just back from each quay, 1.6 up)
  for (const z of [RIVER[0] - 0.4, RIVER[1] + 0.4]) {
    const r = waterUnder(at(80, 1.6, z));
    assert.ok(r && r.lake === 0 && r.w === WATER_Y, `no reflection at z ${z}`);
  }
  assert.equal(waterUnder(at(30, 1.6, 30)), null);
  // Further back the higher it is, but never past REACH.most
  const back = RIVER[0] - 10;
  assert.equal(waterUnder(at(30, 1.6, back)), null);
  assert.ok(waterUnder(at(30, 12, back)));
  assert.equal(waterUnder(at(30, 500, RIVER[0] - REACH.most - 1)), null);
});

test('a lamp by the lake shows in the lake, at its height', () => {
  const a = 0.7;
  const r = lakeR(a);
  const l = at(LAKE_C[0] + Math.cos(a) * (r + 1.5), 1.7, LAKE_C[1] + Math.sin(a) * (r + 1.5));
  const w = waterUnder(l);
  assert.ok(w && w.lake === 1 && w.w === LAKE_Y);
  // (nothing under the water shows)
  assert.equal(waterUnder(at(30, WATER_Y - 0.1, (RIVER[0] + RIVER[1]) / 2)), null);
});

test('the distances to the water are 0 over it and grow away from it', () => {
  const [n, s] = edgesAt(10);
  assert.equal(fromRiver(10, (n + s) / 2), 0);
  assert.ok(Math.abs(fromRiver(10, n - 3) - 3) < 1e-9 && Math.abs(fromRiver(10, s + 2) - 2) < 1e-9);
  assert.equal(fromLake(LAKE_C[0], LAKE_C[1]), 0);
  assert.ok(Math.abs(fromLake(LAKE_C[0] + lakeR(0) + 4, LAKE_C[1]) - 4) < 1e-9);
});

test("the landmarks' lights by the water all show in it, none twice", () => {
  const all = landmarkLights();
  const keys = new Set(all.map((l) => `${l.x.toFixed(3)},${l.y.toFixed(3)},${l.z.toFixed(3)}`));
  assert.equal(keys.size, all.length, 'a light listed twice');
  // Club PULSE, the Night Market, the Sky Wheel, the moored boats: by the water, every one
  const near = all.filter((l) => fromRiver(l.x, l.z) < 30 && fromLake(l.x, l.z) > 0);
  const shown = near.filter((l) => waterUnder(l));
  assert.ok(shown.length >= CLUB.fins.length + 12, `too few show (${shown.length})`);
  for (const l of all.filter((m) => m.z === WHEEL.z)) assert.ok(waterUnder(l), 'a wheel light out of the water');
  for (const l of all) {
    assert.ok(Number.isFinite(l.x + l.y + l.z) && l.size > 0 && l.size < 1);
    assert.ok(l.color >= 0 && l.color <= 0xffffff);
  }
});

test('a boat carries its lights with it, turned with it', () => {
  const p = onBoat(10, 100, 0, 2, 1, TINT.warm, 0.3);
  assert.deepEqual([p.x, p.y, p.z], [12, WATER_Y + 1, 100]);
  const q = onBoat(10, 100, Math.PI / 2, 2, 1, TINT.warm, 0.3);
  assert.ok(Math.abs(q.x - 10) < 1e-9 && Math.abs(q.z - 98) < 1e-9);
  // (a traffic boat's cabin lamp is over the water)
  assert.ok(waterUnder(boatLamp(10, (RIVER[0] + RIVER[1]) / 2, 0)));
});

test("each drawing's moving lights replace what it said before, and there are never more than asked for", () => {
  const into: WaterLight[] = [];
  setMovingLights('a', [at(1, 1, 1), at(2, 1, 1)]);
  setMovingLights('b', [at(3, 1, 1)]);
  assert.equal(movingLights(into, 10).length, 3);
  setMovingLights('a', []);
  assert.deepEqual(movingLights(into, 10).map((l) => l.x), [3]);
  setMovingLights('a', Array.from({ length: 20 }, (_, i) => at(i, 1, 1)));
  assert.equal(movingLights(into, 8).length, 8);
});
