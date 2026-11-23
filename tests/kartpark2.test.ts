// Riverside Raceway's site and its ground (kartpark2.ts; docs/kart-harbour-plan.md Phase 2): the open track lies on
// its ground, the hill carries the switchbacks and roofs the tunnel from mouth to mouth, the hill and the bank keep to
// their slopes and their land, the gate reaches the riverside road and the service road the Southfield road.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUTTING_HALF, GATE2, GATE2_PATH, HILL_SIDE, KART2_AREA, KART2_RECTS, SERVICE2, SERVICE2_HALF, TUNNEL2, TUNNEL_COVER, WEST_BANK, kart2Ground, kart2GroundAt } from '../src/scripts/city3d/kartpark2';
import { CIRCUIT2 as C, CLEAR2, HILL_TOP, SITE2, TUNNEL_CLEAR } from '../src/scripts/city3d/kartcircuit2';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { DOCKS_RECT } from '../src/scripts/city3d/docks';

const n = C.u.length;
const inTunnel = new Set(TUNNEL2.samples);
const nearTrack = (u: number, v: number) => {
  let best = Infinity;
  for (let i = 0; i < n; i += 2) best = Math.min(best, Math.hypot(C.u[i] - u, C.v[i] - v));
  return best;
};

test('the open track lies on its ground: the ground under it is the road, level or raised', () => {
  for (let i = 0; i < n; i += 3) {
    if (inTunnel.has(i)) continue;
    assert.ok(Math.abs(kart2Ground(C.u[i], C.v[i]) - C.y[i]) < 1e-6, `at ${C.u[i].toFixed(1)}, ${C.v[i].toFixed(1)}`);
  }
  assert.equal(kart2GroundAt(SITE2.x0 + C.u[0], SITE2.z0 + C.v[0]), C.y[0]);
});

test('one tunnel under the hill, both passes inside it, roofed all along between its mouths', () => {
  const s = TUNNEL2.samples;
  for (let k = 1; k < s.length; k++) assert.equal(s[k], s[k - 1] + 1, 'one run');
  for (const x of C.crossings) assert.ok(inTunnel.has(x.lower), 'a pass under the switchbacks outside the tunnel');
  const len = TUNNEL2.to - TUNNEL2.from;
  assert.ok(len > 20 && len < 60, `the tunnel ${len.toFixed(1)} long`);
  // (away from its mouths, where the cutting meets it)
  const m = Math.ceil(CUTTING_HALF / C.step) + 1;
  for (const i of s.slice(m, -m)) {
    const over = kart2Ground(C.u[i], C.v[i]);
    assert.ok(over >= TUNNEL_CLEAR + TUNNEL_COVER - 1e-6, `only ${over.toFixed(2)} over the tunnel at ${C.u[i].toFixed(1)}, ${C.v[i].toFixed(1)}`);
    assert.equal(C.y[i], 0, 'the tunnel at the level');
  }
});

test("the hill keeps to its slope (but for the cuttings' walls by the track), its top no higher than the road over it", () => {
  let top = 0;
  for (let u = 0; u <= SITE2.x1 - SITE2.x0; u += 1)
    for (let v = 0; v <= SITE2.z1 - SITE2.z0; v += 1) {
      const g = kart2Ground(u, v);
      top = Math.max(top, g);
      if (g < 0.01 || nearTrack(u, v) < CUTTING_HALF + 1.5) continue;
      const slope = Math.max(Math.abs(kart2Ground(u + 0.5, v) - g), Math.abs(kart2Ground(u, v + 0.5) - g)) / 0.5;
      assert.ok(slope <= HILL_SIDE + 0.05, `slope ${slope.toFixed(2)} at ${u}, ${v}`);
    }
  assert.ok(Math.abs(top - HILL_TOP) < 1e-6);
});

test("the raised land stays inside the site, off the grandstand's strip and the buildings along the south", () => {
  for (let u = 0; u <= SITE2.x1 - SITE2.x0; u += 1)
    for (let v = 0; v <= SITE2.z1 - SITE2.z0; v += 1) {
      if (kart2Ground(u, v) < 0.01) continue;
      assert.ok(v > 14 && v < 125, `raised ground at ${u}, ${v}`);
    }
  // Outside the site, nothing
  assert.equal(kart2Ground(-5, 50), 0);
  assert.equal(kart2Ground(200, 50), 0);
});

test("the west bank: a low berm between the esses' run-off and the site's edge", () => {
  assert.ok(WEST_BANK.u1 > WEST_BANK.u0 + 2);
  for (let v = WEST_BANK.v0; v <= WEST_BANK.v1; v += 2) assert.ok(nearTrack(WEST_BANK.u1, v) > CLEAR2, `the bank in the run-off at v ${v}`);
  assert.ok(kart2Ground((WEST_BANK.u0 + WEST_BANK.u1) / 2, (WEST_BANK.v0 + WEST_BANK.v1) / 2) > 0.5);
});

test('the gate path reaches the riverside road; the service road the Southfield road; both clear of the Docks', () => {
  const ew4w = PLAN.streets.find((s) => s.id === 'ew4-w')!;
  assert.ok(distToStreet(ew4w, [GATE2.x, GATE2_PATH[1]]) <= ew4w.half + 0.1, 'the gate path meets the riverside road');
  assert.equal(GATE2_PATH[3], SITE2.z0);
  const south = PLAN.streets.find((s) => s.id === 'south-field')!;
  assert.ok(distToStreet(south, SERVICE2[0]) <= south.half + 0.5, 'the service road meets the Southfield road');
  const last = SERVICE2[SERVICE2.length - 1];
  assert.ok(Math.abs(last[1] - SITE2.z1) < 1e-6 && last[0] > SITE2.x0 && last[0] < SITE2.x1, 'it ends at the site');
  for (const p of SERVICE2) assert.ok(p[0] + SERVICE2_HALF < DOCKS_RECT[0], 'west of the Docks');
  // (along its way, no street but the Southfield road)
  for (let k = 1; k < SERVICE2.length; k++)
    for (let t = 0; t <= 1; t += 0.1) {
      const p: [number, number] = [SERVICE2[k - 1][0] + (SERVICE2[k][0] - SERVICE2[k - 1][0]) * t, SERVICE2[k - 1][1] + (SERVICE2[k][1] - SERVICE2[k - 1][1]) * t];
      for (const s of PLAN.streets) if (s.id !== 'south-field') assert.ok(distToStreet(s, p) > s.half + SERVICE2_HALF, `the service road on ${s.id}`);
    }
});

test("the park's land: its rects hold the site, the gate path and the service road", () => {
  const inAny = (x: number, z: number) => KART2_RECTS.some((r) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]);
  assert.ok(inAny(SITE2.x0 + 1, SITE2.z0 + 1) && inAny(SITE2.x1 - 1, SITE2.z1 - 1));
  assert.ok(inAny(GATE2.x, 140));
  for (const p of SERVICE2) assert.ok(inAny(p[0], p[1]), `the service road at ${p}`);
  for (const r of KART2_RECTS) assert.ok(r[0] >= KART2_AREA[0] && r[1] >= KART2_AREA[1] && r[2] <= KART2_AREA[2] && r[3] <= KART2_AREA[3]);
});
