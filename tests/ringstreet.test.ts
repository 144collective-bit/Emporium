// Downtown's ring avenue as one street both sides (ringstreet.ts, docs/blend-plan.md Phase 6b): the same lamps on both
// sidewalks, by the kerb, evenly spaced, clear of every junction, shelter, alley mouth, door and solid; the planted
// median on the median only, short of every crossing street, round what's solid on it, no tree under the el.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEDGE, JUNCTION_CLEAR, KERB_IN, RING_LAMPS, RING_MEDIAN, RING_SIDES } from '../src/scripts/city3d/ringstreet';
import { PLAN, distToStreet, type Pt } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { BUS_STOPS } from '../src/scripts/city3d/transit';
import { ALLEYS } from '../src/scripts/city3d/downtown';
import { STATIONS, TRACKS } from '../src/scripts/city3d/metro';
import { MEDIAN } from '../src/scripts/city3d/layout';

const inBox = (r: readonly number[], q: Pt, m: number) => q[0] > r[0] - m && q[0] < r[2] + m && q[1] > r[1] - m && q[1] < r[3] + m;
const sideOf = (q: Pt) => RING_SIDES.find((sd) => Math.abs((sd.alongX ? q[1] : q[0]) - sd.c) < sd.street.half + 1)!;
const segDist = (p: Pt, a: Pt, b: Pt) => {
  const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
  const l2 = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / l2));
  return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t);
};

test('the lamps stand by the kerb on both sidewalks, the same spacing both sides', () => {
  assert.ok(RING_LAMPS.length > 30);
  for (const [x, z, ry] of RING_LAMPS) {
    const sd = sideOf([x, z]);
    assert.ok(sd, `lamp at ${x}, ${z} is on no ring side`);
    const off = (sd.alongX ? z : x) - sd.c;
    assert.ok(Math.abs(Math.abs(off) - (sd.street.half + KERB_IN)) < 1e-6, `${x}, ${z}`);
    // (its arm reaches over the road: towards the centre line)
    const arm: Pt = [Math.cos(ry), -Math.sin(ry)];
    const toward = sd.alongX ? -Math.sign(off) * arm[1] : -Math.sign(off) * arm[0];
    assert.ok(toward > 0.99, `lamp at ${x}, ${z} reaches away from the road`);
  }
  // Each side's lamps, by the way they face: the north, west and east on both sidewalks, the south on downtown's only
  for (const sd of RING_SIDES) {
    const mine = RING_LAMPS.filter(([x, z]) => sideOf([x, z]) === sd);
    const sides = new Set(mine.map(([x, z]) => Math.sign((sd.alongX ? z : x) - sd.c)));
    assert.equal(sides.size, sd.lamps.length, sd.street.id);
    for (const s of sides) {
      const at = mine.filter(([x, z]) => Math.sign((sd.alongX ? z : x) - sd.c) === s).map(([x, z]) => (sd.alongX ? x : z)).sort((a, b) => a - b);
      assert.ok(at.length >= 4, `${sd.street.id} ${s}: ${at.length}`);
      for (let i = 1; i < at.length; i++) assert.ok(at[i] - at[i - 1] > 5 && at[i] - at[i - 1] < 25, `${sd.street.id} ${s}: ${at[i - 1]} to ${at[i]}`);
    }
  }
});

test('the lamps keep clear of junctions, other streets, shelters, alley mouths, the metro and anything solid', () => {
  for (const [x, z] of RING_LAMPS) {
    const q: Pt = [x, z];
    const sd = sideOf(q);
    for (const c of PLAN.crossings.filter((c) => c.streets.includes(sd.street.id)))
      if (Math.abs((sd.alongX ? c.at[1] : c.at[0]) - sd.c) < 1) assert.ok(Math.abs((sd.alongX ? c.at[0] : c.at[1]) - (sd.alongX ? x : z)) >= JUNCTION_CLEAR - 1e-6, `${q} by ${c.id}`);
    for (const s of PLAN.streets) if (s !== sd.street && s.kind !== 'highway') assert.ok(distToStreet(s, q) > s.half + 0.3, `${q} on ${s.id}`);
    assert.ok(distToStreet(sd.street, q) > sd.street.half, `${q} on its road`);
    for (const b of BUS_STOPS) assert.ok(Math.hypot(b.kerb[0] - x, b.kerb[1] - z) >= 2.4, `${q} by ${b.id}`);
    for (const a of ALLEYS) assert.ok(!inBox(a.box, q, 1.2), `${q} in an alley's mouth`);
    for (const st of STATIONS) assert.ok(Math.hypot(st.door.x - x, st.door.z - z) >= 2, `${q} by the metro's door`);
    for (const b of SOLIDS) assert.ok(!inBox(b, q, 0.3), `${q} in ${b}`);
  }
});

test("the planted median: on the median only, short of every crossing street, round what's solid, no tree under the el", () => {
  assert.ok(RING_MEDIAN.length >= 12);
  assert.ok(HEDGE.w < MEDIAN - 0.1, 'the hedge sits inside the median');
  for (const r of RING_MEDIAN) {
    assert.ok(r.b > r.a);
    const sd = RING_SIDES.find((s) => s.street.id === r.street)!;
    for (let v = r.a; v <= r.b; v += 0.25) {
      const q: Pt = r.alongX ? [v, r.c] : [r.c, v];
      for (const s of PLAN.streets) if (s !== sd.street && s.kind !== 'highway') assert.ok(distToStreet(s, q) > s.half + 1, `${r.street} at ${v} is on ${s.id}`);
      for (const b of SOLIDS) assert.ok(!inBox(b, q, 0.2), `${r.street} at ${v} meets ${b}`);
    }
    for (const v of r.trees) {
      assert.ok(v > r.a + 1 && v < r.b - 1, `${r.street} tree at ${v}`);
      const q: Pt = r.alongX ? [v, r.c] : [r.c, v];
      for (const t of Object.values(TRACKS) as { pts: Pt[] }[]) for (let i = 1; i < t.pts.length; i++) assert.ok(segDist(q, t.pts[i - 1], t.pts[i]) >= 3, `${r.street} tree at ${v} under the el`);
    }
  }
  // Every side carries some; the east (under the el) its hedge and no trees
  for (const sd of RING_SIDES) assert.ok(RING_MEDIAN.some((r) => r.street === sd.street.id), sd.street.id);
  const east = RING_SIDES.find((sd) => !sd.alongX && sd.c > 30)!;
  assert.equal(RING_MEDIAN.filter((r) => r.street === east.street.id).flatMap((r) => r.trees).length, 0);
  assert.ok(RING_MEDIAN.flatMap((r) => r.trees).length > 15);
});
