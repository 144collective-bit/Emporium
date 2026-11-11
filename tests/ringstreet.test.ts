// Downtown's ring avenue as one street both sides (ringstreet.ts, docs/blend-plan.md Phase 6b): the same lamps on both
// sidewalks, by the kerb, evenly spaced, clear of every junction, shelter, alley mouth, door and solid; the planted
// median on the median only, short of every crossing street, round what's solid on it, no tree under the el.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EDGE_TREE_GAP, HEDGE, JUNCTION_CLEAR, KERB_IN, MALL_SIDE_LAMPS, MALL_STRETCH, PARK_EDGE_TREES, PARK_SIDE_LAMPS, RING_LAMPS, RING_MEDIAN, RING_SIDES, STRIP_TREES, STRIP_TREE_GAP } from '../src/scripts/city3d/ringstreet';
import { LOOP, MALL_LAMPS, ZEBRA as COURT_ZEBRA } from '../src/scripts/city3d/mall';
import { vergeY } from '../src/scripts/city3d/verges';
import { onSlab } from '../src/scripts/city3d/streetplan';
import { AXIS_X, LANE_HALF, UPTOWN_LAMPS, E as UPTOWN_E, W as UPTOWN_W } from '../src/scripts/city3d/uptown';
import { GATES, PARK_LAMPS, PARK_TREES, ZS, inPark, onPath } from '../src/scripts/city3d/westlake';
import { PLANTERS } from '../src/scripts/city3d/gardens';
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

// Uptown and Westlake Park across the north avenue (docs/blend-plan.md Phase 6c): lamps on the park's sidewalk across
// from Uptown's, the median planted on west to Uptown's edge, a row of trees just inside the park's wall.
const north = RING_SIDES[0];

test("the park's sidewalk is lit across from Uptown's lamps, flanking the gates, clear of the zebras", () => {
  assert.ok(PARK_SIDE_LAMPS.length >= 6);
  const uptown = UPTOWN_LAMPS.filter(([, z]) => z > north.c && z < north.c + north.street.half + 1);
  for (const [x, z, ry] of PARK_SIDE_LAMPS) {
    // (on the park's sidewalk, as far from the centre line as Uptown's)
    assert.ok(Math.abs(z - (2 * north.c - uptown[0][1])) < 1e-6, `${x}, ${z}`);
    assert.ok(z < north.c - north.street.half && z > ZS, `${x}, ${z} is off the sidewalk`);
    assert.ok(Math.abs(Math.cos(ry)) < 1e-6 && Math.sin(ry) > 0.99, `${x}: the arm reaches over the road`);
    // (across from one of Uptown's, or beside a gate it stands aside for)
    const across = uptown.some(([ux]) => Math.abs(ux - x) < 1e-6);
    const gate = GATES.find((g) => Math.abs(g.at[1] - ZS) < 1 && Math.abs(g.at[0] - x) < g.half + 3);
    assert.ok(across || gate, `${x} is across from nothing`);
    for (const g of GATES) if (Math.abs(g.at[1] - ZS) < 1) assert.ok(Math.abs(g.at[0] - x) >= g.half + 2 - 1e-6, `${x} in front of ${g.id}`);
    assert.ok(Math.abs(x - AXIS_X) >= LANE_HALF + 1.5, `${x} on the axis's zebra`);
    for (const c of PLAN.crossings.filter((c) => c.streets.includes(north.street.id))) if (Math.abs(c.at[1] - north.c) < 1) assert.ok(Math.abs(c.at[0] - x) >= JUNCTION_CLEAR - 1e-6, `${x} by ${c.id}`);
    for (const b of SOLIDS) assert.ok(!inBox(b, [x, z], 0.3), `${x} in ${b}`);
  }
  // Every gap between them no wider than three of Uptown's
  const xs = PARK_SIDE_LAMPS.map(([x]) => x).sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] > 5 && xs[i] - xs[i - 1] <= 36 + 1e-6, `${xs[i - 1]} to ${xs[i]}`);
});

test("the median is planted on west to Uptown's edge, broken at the axis's zebra", () => {
  const runs = RING_MEDIAN.filter((r) => r.street === north.street.id && r.b < -4.5);
  assert.ok(runs.length >= 6);
  assert.ok(Math.min(...runs.map((r) => r.a)) < UPTOWN_W + 12, "it reaches Uptown's west edge");
  assert.ok(Math.min(...runs.map((r) => r.a)) >= UPTOWN_W - 1e-6, "it stops at Uptown's west edge");
  for (const r of runs) assert.ok(r.b < AXIS_X - LANE_HALF - 1 || r.a > AXIS_X + LANE_HALF + 1, `${r.a} to ${r.b} crosses the axis's zebra`);
  assert.ok(runs.flatMap((r) => r.trees).length >= 15);
});

test("the park's edge row stands just inside its wall, clear of its walks, gates, planters, lamps and trees", () => {
  // (none across the civic square's mouth, civic.ts: it opens onto the avenue)
  assert.ok(PARK_EDGE_TREES.length >= 8);
  const xs: number[] = [];
  for (const [x, z] of PARK_EDGE_TREES) {
    assert.ok(z < ZS - 1.5 && z > ZS - 4, `${x}, ${z}`);
    assert.ok(x > UPTOWN_W && x < UPTOWN_E, `${x} is past Uptown`);
    assert.ok(inPark([x, z], 1.4) && !onPath([x, z], 1.3), `${x}, ${z} on a walk`);
    for (const g of GATES) assert.ok(Math.hypot(g.at[0] - x, g.at[1] - z) > 4, `${x} by ${g.id}`);
    for (const p of PLANTERS) assert.ok(Math.hypot(p.at[0] - x, p.at[1] - z) > p.r + 1, `${x} by a planter`);
    for (const [lx, lz] of PARK_LAMPS) assert.ok(Math.hypot(lx - x, lz - z) > 1.4, `${x} by a lamp`);
    for (const t of PARK_TREES) assert.ok(Math.hypot(t.x - x, t.z - z) > 2.1, `${x} by a tree`);
    xs.push(x);
  }
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] > EDGE_TREE_GAP - 0.5, `${xs[i - 1]} to ${xs[i]}`);
});

// Starlight Mall and Palm Court across the east avenue (docs/blend-plan.md Phase 6d): lamps on both sides, the median
// planted on north under the el, a row of trees down the grass strip by the mall's loop.
const east = RING_SIDES[3];

test('the east avenue is lit on both sides from the mall to the Parkway, clear of the zebra, the verges and the el', () => {
  for (const s of [-1, 1]) {
    const mine = MALL_SIDE_LAMPS.filter(([x]) => Math.sign(x - east.c) === s).map(([, z]) => z).sort((a, b) => a - b);
    assert.ok(mine.length >= 8, `side ${s}: ${mine.length}`);
    for (let i = 1; i < mine.length; i++) assert.ok(mine[i] - mine[i - 1] > 5 && mine[i] - mine[i - 1] < 16, `side ${s}: ${mine[i - 1]} to ${mine[i]}`);
  }
  for (const [x, z, ry, slab] of MALL_SIDE_LAMPS) {
    assert.ok(Math.abs(Math.abs(x - east.c) - (east.street.half + KERB_IN)) < 1e-6, `${x}, ${z}`);
    assert.ok(z >= MALL_STRETCH[0] - 1e-6 && z <= MALL_STRETCH[1] + 1e-6);
    // (the arm reaches over the road)
    assert.ok(Math.cos(ry) * Math.sign(east.c - x) > 0.99, `${x}, ${z}`);
    assert.equal(slab, onSlab(PLAN, [x, z]));
    if (!slab) assert.ok(vergeY(x, z) < 0.005, `${x}, ${z} on a verge's bank`);
    assert.ok(Math.abs(z - COURT_ZEBRA.z) >= COURT_ZEBRA.half + 2 - 1e-6, `${z} on the zebra`);
    for (const b of SOLIDS) assert.ok(!inBox(b, [x, z], 0.3), `${x}, ${z} in ${b}`);
    for (const [mx, mz] of MALL_LAMPS) assert.ok(Math.hypot(mx - x, mz - z) >= 2.5, `${x}, ${z} by the mall's lamp`);
  }
  // The median runs on north to the mall, cut at the zebra, no trees under the el
  const runs = RING_MEDIAN.filter((r) => r.street === east.street.id && r.b < -40);
  assert.ok(runs.length >= 6 && Math.min(...runs.map((r) => r.a)) < -150);
  for (const r of runs) {
    assert.ok(r.b < COURT_ZEBRA.z - COURT_ZEBRA.half - 1 || r.a > COURT_ZEBRA.z + COURT_ZEBRA.half + 1, `${r.a} to ${r.b} on the zebra`);
    assert.equal(r.trees.length, 0);
  }
});

test("the grass strip by the mall's loop carries a row of trees, off the verges and clear of the lamps", () => {
  assert.ok(STRIP_TREES.length >= 5);
  const zs: number[] = [];
  for (const [x, z] of STRIP_TREES) {
    assert.ok(x > LOOP.xE + LOOP.half + 1 && x < east.c - east.street.half - 1, `${x}`);
    assert.ok(!onSlab(PLAN, [x, z]) && vergeY(x, z) < 0.005, `${x}, ${z}`);
    for (const s of PLAN.streets) if (s.kind !== 'highway') assert.ok(distToStreet(s, [x, z]) > s.half + 0.7, `${z} on ${s.id}`);
    for (const [lx, lz] of [...MALL_LAMPS, ...MALL_SIDE_LAMPS]) assert.ok(Math.hypot(lx - x, lz - z) >= 2.2 - 1e-6, `${z} by a lamp`);
    for (const b of SOLIDS) assert.ok(!inBox(b, [x, z], 0.9), `${z} in ${b}`);
    zs.push(z);
  }
  zs.sort((a, b) => a - b);
  for (let i = 1; i < zs.length; i++) assert.ok(zs[i] - zs[i - 1] >= STRIP_TREE_GAP / 2, `${zs[i - 1]} to ${zs[i]}`);
});
