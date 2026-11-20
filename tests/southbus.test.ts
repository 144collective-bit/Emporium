// The south's bus route (routes.ts `busLoop()`, docs/south-plan.md Phase 6c): a loop of its own, the last route, from
// outside the bus garage on the High Road to the Circus, the village and back; staying in the south.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, SOUTH_BUS_ROUTE, SOUTH_BUS_WAY, pointOn } from '../src/scripts/city3d/routes';
import { SOUTH_GROUND_RECT } from '../src/scripts/city3d/southground';

test("the south's bus route: the last route, a loop by the garage, the Circus and the village, all in the south", () => {
  assert.equal(SOUTH_BUS_ROUTE, ROUTES.length - 1);
  const r = ROUTES[SOUTH_BUS_ROUTE];
  const pts: [number, number][] = [];
  for (let p = 0; p < r.len; p += 2) pts.push(pointOn(r, p, 0).at);
  for (const w of SOUTH_BUS_WAY) assert.ok(pts.some((q) => Math.hypot(q[0] - w[0], q[1] - w[1]) < 5), `by ${w}`);
  const [x0, z0, x1, z1] = SOUTH_GROUND_RECT;
  for (const q of pts) assert.ok(q[0] > x0 && q[0] < x1 + 4 && q[1] > z0 - 25 && q[1] < z1, `out of the south at ${q.map((v) => v.toFixed(1))}`);
  assert.ok(r.len > 150 && r.len < 1500, `${r.len.toFixed(0)} long`);
});
