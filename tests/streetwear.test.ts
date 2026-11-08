// The concrete-era look on the town's streets (streetwear.ts; docs/highway-plan.md Phase 8): gutters along the kerbs
// only, drains in them, patches each inside its lane, manholes and cracks on the asphalt, stop lines into the lit
// junctions and give-way dashes into the others, all clear of the junctions and nowhere the look doesn't go.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANE, MEDIAN } from '../src/scripts/city3d/layout';
import { PLAN, distToStreet, onSlab } from '../src/scripts/city3d/streetplan';
import { CRACKS, DRAINS, GUTTERS, MANHOLES, PATCHES, STOP_LINES, WEAR, WORN_STREETS, wornAt } from '../src/scripts/city3d/streetwear';
import { STOP_BARS, TURN_JUNCTIONS } from '../src/scripts/city3d/turnlanes';
import { UPTOWN_RECT } from '../src/scripts/city3d/uptown';

const byId = new Map(PLAN.streets.map((s) => [s.id, s]));
/** How far off its street's centre line a point is, to its right (+) or left */
const offOf = (id: string, x: number, z: number) => {
  const s = byId.get(id)!;
  const [a, b] = s.pts;
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [ux, uz] = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  return (x - a[0]) * -uz + (z - a[1]) * ux;
};

test('it all lies on its own street, where the look goes, clear of the junctions', () => {
  assert.ok(WORN_STREETS.length >= 12);
  const all = [...GUTTERS, ...DRAINS, ...PATCHES, ...CRACKS, ...MANHOLES.map((m) => ({ ...m, len: 0, wid: 0 }))];
  assert.ok(GUTTERS.length > 100 && DRAINS.length > 50 && PATCHES.length > 30 && MANHOLES.length > 20);
  for (const it of all) {
    const s = byId.get(it.street)!;
    assert.ok(distToStreet(s, [it.x, it.z]) < s.half, `off ${s.id} at ${it.x.toFixed(1)}, ${it.z.toFixed(1)}`);
    assert.ok(wornAt(it.x, it.z), `where the look doesn't go at ${it.x.toFixed(1)}, ${it.z.toFixed(1)}`);
    assert.ok(!(it.x > UPTOWN_RECT[0] && it.x < UPTOWN_RECT[2] && it.z > UPTOWN_RECT[1] && it.z < UPTOWN_RECT[3]), 'Uptown kept clean');
    // (outside every junction on its street)
    for (const c of PLAN.crossings.filter((k) => k.streets.includes(s.id))) {
      const reach = Math.max(...c.streets.filter((id) => id !== s.id).map((id) => byId.get(id)!.half));
      assert.ok(Math.hypot(it.x - c.at[0], it.z - c.at[1]) > reach + 1, `in the junction ${c.id}`);
    }
  }
});

test('gutters run along the kerbs only, a drain in them now and then', () => {
  for (const g of GUTTERS) {
    const s = byId.get(g.street)!;
    const o = offOf(g.street, g.x, g.z);
    assert.ok(Math.abs(Math.abs(o) - (s.half - WEAR.gutter / 2)) < 1e-6);
    const k = Math.sign(o) * (s.half + 0.35);
    const [a, b] = s.pts;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    assert.ok(onSlab(PLAN, [g.x + (-(b[1] - a[1]) / l) * (k - o), g.z + ((b[0] - a[0]) / l) * (k - o)]), `a gutter with no kerb at ${g.x.toFixed(1)}, ${g.z.toFixed(1)}`);
  }
  for (const d of DRAINS) assert.ok(GUTTERS.some((g) => g.street === d.street && Math.hypot(g.x - d.x, g.z - d.z) < g.len / 2 + 0.6 && Math.abs(offOf(d.street, d.x, d.z) - offOf(g.street, g.x, g.z)) < 1e-6), 'a drain out of its gutter');
});

test('every patch inside its lane, never across a line', () => {
  for (const p of PATCHES) {
    const s = byId.get(p.street)!;
    const o = offOf(p.street, p.x, p.z);
    const lanes = s.lanes === 2 ? [-(MEDIAN / 2 + LANE * 1.5), -(MEDIAN / 2 + LANE / 2), MEDIAN / 2 + LANE / 2, MEDIAN / 2 + LANE * 1.5] : [-LANE / 2, LANE / 2];
    const lane = lanes.reduce((m, c) => (Math.abs(c - o) < Math.abs(m - o) ? c : m));
    assert.ok(Math.abs(o - lane) + p.wid / 2 < LANE / 2, `a patch across a line on ${s.id}`);
  }
});

test('stop lines into the lit junctions, give-way dashes into the rest, on the side coming in; the turn lanes keep their own', () => {
  assert.ok(STOP_LINES.some((s) => !s.give) && STOP_LINES.some((s) => s.give));
  for (const s of STOP_LINES) {
    const st = byId.get(s.street)!;
    const c = PLAN.crossings.filter((k) => k.streets.includes(st.id)).sort((p, q) => Math.hypot(p.at[0] - s.x, p.at[1] - s.z) - Math.hypot(q.at[0] - s.x, q.at[1] - s.z))[0];
    assert.equal(s.give, !c.lights, `${c.id}`);
    assert.ok(!TURN_JUNCTIONS.some((j) => j.at[0] === c.at[0] && j.at[1] === c.at[1]));
    // (across the lanes on the right of the way coming in: from before it along the street, the right; from after it, the left)
    const [a, b] = st.pts;
    const v = (s.x - a[0]) * (b[0] - a[0]) + (s.z - a[1]) * (b[1] - a[1]);
    const vc = (c.at[0] - a[0]) * (b[0] - a[0]) + (c.at[1] - a[1]) * (b[1] - a[1]);
    assert.ok(Math.sign(offOf(st.id, s.x, s.z)) === (v < vc ? 1 : -1), 'a stop line on the side going out');
  }
  // (the turn lanes' stop bars stay theirs)
  assert.ok(STOP_BARS.length > 0);
});
