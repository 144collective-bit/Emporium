// Exit 6A's road in (cornerroad.ts, docs/south-plan.md Phase 5): from The Trenches' south-west corner square on under
// the ring's south-west curve to the Docks' ring road's corner, and the link down to the south's streets; joined at
// every end, gently bent, clear of everything solid and of the other streets between its ends.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORNER_LINK, CORNER_ROAD, DOCKS_CORNER, SOUTH_HUB } from '../src/scripts/city3d/cornerroad';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { CORNER_FROM, EXITS, RAMPS, ringPoint, ringS } from '../src/scripts/city3d/viaduct';
import { SOLIDS } from '../src/scripts/city3d/solids';

const road = PLAN.streets.find((s) => s.id === 'corner-road')!;
const link = PLAN.streets.find((s) => s.id === 'corner-link')!;

test('the road in and the link: in the plan, joined at every end', () => {
  assert.ok(road && link);
  assert.deepEqual(CORNER_ROAD[0], CORNER_FROM);
  assert.deepEqual(CORNER_ROAD.at(-1), DOCKS_CORNER);
  assert.deepEqual(CORNER_LINK[0], DOCKS_CORNER);
  assert.deepEqual(CORNER_LINK.at(-1), SOUTH_HUB);
  const at = (p: [number, number], ...ids: string[]) =>
    PLAN.crossings.some((c) => Math.hypot(c.at[0] - p[0], c.at[1] - p[1]) < 0.01 && ids.every((id) => c.streets.includes(id)));
  assert.ok(at(CORNER_FROM, 'trench-ns0', 'trench-ew1', 'corner-road'), 'at The Trenches');
  assert.ok(at(DOCKS_CORNER, 'docks-ring', 'corner-road', 'corner-link'), "at the Docks' corner");
  assert.ok(at(SOUTH_HUB, 'south-gate', 'south-field', 'corner-link'), "at the south's Gate Lane and Field Lane");
});

test("square on under the ring's curve, where exit 6A is, its ramps' feet on it", () => {
  const e = EXITS.find((x) => x.label === '6A')!;
  const s0 = ringS(e.at[0], e.at[1]).s;
  for (const o of [-20, -8, 0, 8, 12]) assert.ok(distToStreet(road, ringPoint(s0, o)) < 0.05, `on it ${o} across the ring`);
  for (const r of RAMPS.filter((r) => r.exit === e.n)) assert.ok(distToStreet(road, r.terminal) < 0.05, `${r.id}'s foot`);
});

test('gently bent, clear of everything solid and of the other streets between its ends', () => {
  for (const pts of [CORNER_ROAD, CORNER_LINK]) {
    // (no sharper than a radius of 20 anywhere: the turn over each metre or so)
    for (let i = 2; i < pts.length; i++) {
      const [a, b, c] = [pts[i - 2], pts[i - 1], pts[i]];
      const h0 = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const h1 = Math.atan2(c[1] - b[1], c[0] - b[0]);
      let d = Math.abs(h1 - h0);
      if (d > Math.PI) d = 2 * Math.PI - d;
      const l = (Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(c[0] - b[0], c[1] - b[1])) / 2;
      assert.ok(d / l < 1 / 20 + 1e-6, `bends at ${b.map((v) => v.toFixed(1))}`);
    }
  }
  const others = PLAN.streets.filter((s) => !s.id.startsWith('corner-') && s.kind !== 'highway' && s.kind !== 'ramp' && !['trench-ns0', 'trench-ew1', 'docks-ring', 'south-gate', 'south-field'].includes(s.id));
  for (const s of [road, link]) {
    for (let i = 1; i < s.pts.length; i++) {
      const [a, b] = [s.pts[i - 1], s.pts[i]];
      for (let t = 0; t <= 1; t += 0.25) {
        const p: [number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        for (const o of others) assert.ok(distToStreet(o, p) > o.half + s.half, `${s.id} runs into ${o.id} at ${p.map((v) => v.toFixed(1))}`);
        for (const box of SOLIDS) assert.ok(!(p[0] > box[0] - s.half && p[0] < box[2] + s.half && p[1] > box[1] - s.half && p[1] < box[3] + s.half && box[4] > 0.3), `${s.id} into a solid at ${p.map((v) => v.toFixed(1))}`);
      }
    }
  }
});
