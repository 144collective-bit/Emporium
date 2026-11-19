// The south's underpasses under its avenue crossings (underpasses.ts, docs/south-plan.md Phase 4c; the owner's calls,
// 2026-11-19): one under the wide south avenue and one each under Endswood Road and Marsh Lane on their bends. Each
// runs square across its road, roofed under it and its sidewalks, a ramp down and up at each side clear of every other
// street, solid, lamp, tree, bay, shed, deck, court, footpath and bollard, on level ground; walked down one side,
// under the road and up the other; their ramps cut out of the slabs and the grass they open through.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CROSSINGS, GROUND_HOLES, MOUTH_ON_SLAB, RAMP, SLAB_CUTS, UNDERPASSES, UNDER_CUTTINGS, UNDER_MOUTHS, underpassOf } from '../src/scripts/city3d/underpasses';
import { CIRCUS_CUTS, CUTTINGS as CIRCUS_CUTTINGS, FLOOR } from '../src/scripts/city3d/circus';
import { GROUND_Y, acrossOf, alongOf, floorOf, pointOf } from '../src/scripts/city3d/underground';
import { FOOTPATHS, PATH_HALF as FOOT_HALF, SOUTH_STREETS, type Pt } from '../src/scripts/city3d/south';
import { PLAN } from '../src/scripts/city3d/streetplan';
import { distTo, inside } from '../src/scripts/city3d/streetfaces';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { ENDS_LAMPS, PATH_BOLLARDS } from '../src/scripts/city3d/endswood';
import { BAYS, BIKE_SHEDS, BIN_STORES, DECK_COLUMNS, YARD_TREES, bayCorners, thingCorners } from '../src/scripts/city3d/southyard';
import { BLOCKS, CORES, COURTS, DECKS } from '../src/scripts/city3d/southblocks';
import { southLift } from '../src/scripts/city3d/southground';
import { SLAB, UNDER, createGroundHeight } from '../src/scripts/city3d/groundheight';
import { TUNNEL } from '../src/scripts/city3d/lot9';

/** Every street near the south, the street plan's (the avenues) and the south's own */
const STREETS = [
  ...SOUTH_STREETS.map((s) => ({ id: s.id, pts: s.pts as Pt[], half: s.half })),
  ...PLAN.streets
    .filter((s) => {
      const xs = s.pts.map((p) => p[0]);
      const zs = s.pts.map((p) => p[1]);
      return Math.max(...zs) > 300 && Math.min(...zs) < 600 && Math.max(...xs) > -120 && Math.min(...xs) < 90;
    })
    .map((s) => ({ id: s.id, pts: s.pts as Pt[], half: s.half })),
];
/** Points over a cutting (its corners, edges and inside), `m` out past its walls */
function over(c: Pt[], m = 0): Pt[] {
  const mid: Pt = [(c[0][0] + c[2][0]) / 2, (c[0][1] + c[2][1]) / 2];
  const g = c.map(([x, z]): Pt => {
    const [dx, dz] = [x - mid[0], z - mid[1]];
    const l = Math.hypot(dx, dz) || 1;
    return [x + (dx / l) * m * 1.42, z + (dz / l) * m * 1.42];
  });
  const out: Pt[] = [];
  for (let i = 0; i <= 12; i++)
    for (let j = 0; j <= 4; j++) {
      const [s, t] = [i / 12, j / 4];
      const a: Pt = [g[0][0] + (g[1][0] - g[0][0]) * s, g[0][1] + (g[1][1] - g[0][1]) * s];
      const b: Pt = [g[3][0] + (g[2][0] - g[3][0]) * s, g[3][1] + (g[2][1] - g[3][1]) * s];
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  return out;
}
const inBox = (b: readonly number[], [x, z]: Pt, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;
const named = (i: number, e: number) => `${CROSSINGS[i].id} ${e ? 'up' : 'down'}`;

test('three underpasses: under the south avenue, Endswood Road and Marsh Lane, each square across its road', () => {
  assert.deepEqual(CROSSINGS.map((c) => c.id), ['avenue', 'endswood', 'marsh']);
  for (const [i, c] of CROSSINGS.entries()) {
    const p = UNDERPASSES[i];
    const road = STREETS.find((s) => s.id === (c.id === 'avenue' ? 'ns0s' : c.id === 'endswood' ? 'south-endswood' : 'south-marsh'))!;
    assert.ok(distTo(road.pts, c.at) < 0.05, `${c.id}: across its road's middle`);
    // (square across: its road runs across it, so a step along the road keeps it at the same place along the passage)
    const k = road.pts.findIndex((q) => Math.hypot(q[0] - c.at[0], q[1] - c.at[1]) < 0.05);
    const [a, b] = k > 0 ? [road.pts[k - 1], road.pts[k + 1] ?? road.pts[k]] : [road.pts[0], road.pts[1]];
    const t = [b[0] - a[0], b[1] - a[1]];
    const l = Math.hypot(t[0], t[1]);
    assert.ok(Math.abs(alongOf(p, c.at[0] + t[0] / l, c.at[1] + t[1] / l) - alongOf(p, ...c.at)) < 0.05, `${c.id}: square across`);
    assert.ok(p.roofs[0][1] - alongOf(p, ...c.at) >= road.half + 0.8 + 0.5, `${c.id}: roofed past the sidewalks`);
    assert.ok(Math.abs(p.ramp0 - p.a0 - RAMP) < 1e-9 && Math.abs(p.a1 - p.ramp1 - RAMP) < 1e-9, `${c.id}: a ramp each side`);
    assert.ok(p.ceil - p.floor >= TUNNEL.ceil - TUNNEL.floor - 1e-9, `${c.id}: Lot 9's headroom at least`);
  }
});

test("the ramps keep off every other street's sidewalk", () => {
  for (const [i, pair] of UNDER_CUTTINGS.entries())
    for (const [e, c] of pair.entries())
      for (const p of over(c)) for (const s of STREETS) assert.ok(distTo(s.pts, p) > s.half + 0.8 + 0.2, `${named(i, e)}: on ${s.id} at ${p.map((v) => v.toFixed(1))}`);
});

test('the ramps keep off every solid, block, core, deck, court, lamp, tree, bay, bin store, shed, column, footpath and bollard', () => {
  const feet = [...BLOCKS.map((b) => b.foot), ...CORES.map((c) => c.foot), ...DECKS.map((d) => d.poly), ...COURTS.map((c) => c.poly), ...BAYS.map(bayCorners), ...[...BIN_STORES, ...BIKE_SHEDS].map(thingCorners)];
  for (const [i, pair] of UNDER_CUTTINGS.entries())
    for (const [e, c] of pair.entries()) {
      const id = named(i, e);
      const pts = over(c, 0.3);
      for (const b of SOLIDS) assert.ok(!pts.some((p) => inBox(b, p)), `${id}: into a solid ${b.map((v) => v.toFixed(1))}`);
      for (const f of feet) assert.ok(!pts.some((p) => inside(f, p)) && !f.some((p) => inside(c, p)), `${id}: into a block's foot, a deck, a court, a bay or a shed`);
      for (const [x, z] of ENDS_LAMPS) assert.ok(!inside(c, [x, z]) && distTo(c, [x, z], true) > 0.5, `${id}: a lamp at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      for (const [x, z] of YARD_TREES) assert.ok(!inside(c, [x, z]) && distTo(c, [x, z], true) > 1.2, `${id}: a tree`);
      for (const p of [...DECK_COLUMNS, ...PATH_BOLLARDS]) assert.ok(distTo(c, p, true) > 0.5, `${id}: a column or a bollard`);
      for (const f of FOOTPATHS) assert.ok(pts.every((p) => distTo(f.pts, p) > FOOT_HALF), `${id}: across the footpath ${f.id}`);
    }
});

test("the ramps are on level ground, apart from each other and the Circus's", () => {
  for (const pair of UNDER_CUTTINGS) for (const c of pair) for (const [x, z] of over(c, 1)) assert.ok(Math.abs(southLift(x, z)) < 0.01, `lifted at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  const all = [...UNDER_CUTTINGS.flat(), ...CIRCUS_CUTTINGS];
  for (const [i, c] of all.entries()) for (const [j, d] of all.entries()) if (i !== j) assert.ok(!c.some((p) => inside(d, p)), 'two cuttings meet');
});

test('walked: down one side, under the road (its floor from down there, the road from up), up the other', () => {
  const ground = createGroundHeight({ leavesOpen: () => true });
  for (const [i, p] of UNDERPASSES.entries()) {
    const id = CROSSINGS[i].id;
    const mid = (p.roofs[0][0] + p.roofs[0][1]) / 2;
    assert.equal(ground(...pointOf(p, mid), FLOOR), FLOOR, `${id}: down under the road`);
    assert.ok(ground(...pointOf(p, mid), 0.1) > 0, `${id}: up on the road over it`);
    for (const s of [(p.a0 + p.ramp0) / 2, (p.ramp1 + p.a1) / 2]) assert.ok(Math.abs(ground(...pointOf(p, s), 0) - floorOf(p, s)) < 1e-9, `${id}: halfway down a ramp`);
    for (const [e, s] of [p.a0 - 0.6, p.a1 + 0.6].entries()) {
      const want = MOUTH_ON_SLAB[i][e] ? SLAB : GROUND_Y;
      assert.ok(Math.abs(ground(...pointOf(p, s), 0.2) - want) < 0.06, `${id}: past the ${e ? 'up' : 'down'} mouth, on ${MOUTH_ON_SLAB[i][e] ? 'the slab' : 'the ground'}`);
    }
    // (down there its walls stop you; along it they don't; at street level a cutting's edge stops you)
    assert.ok(UNDER.wall(...pointOf(p, mid, p.half + 0.2), FLOOR, 0.3));
    assert.ok(!UNDER.wall(...pointOf(p, mid), FLOOR, 0.3));
    assert.ok(UNDER.wall(...pointOf(p, p.ramp0 - 1, p.half + 0.1), 0.15, 0.3));
  }
});

test('their ramps are cut out of the slabs and the grass, with the Circus\'s', () => {
  assert.deepEqual(SLAB_CUTS, [...CIRCUS_CUTS, ...UNDER_CUTTINGS.flat()]);
  for (const c of UNDER_CUTTINGS.flat()) assert.ok(GROUND_HOLES.some((h) => c.every((p) => inBox(h, p, 0.01))), 'a ramp inside a hole in the grass');
  // (the grass's hole round an angled ramp reaches past it: the slab or a street covers the rest)
  for (const [i, h] of GROUND_HOLES.slice(1).entries()) {
    const c = UNDER_CUTTINGS.flat()[i];
    for (let x = h[0] + 0.05; x < h[2]; x += 0.5)
      for (let z = h[1] + 0.05; z < h[3]; z += 0.5) {
        // (inside the ramp, or under its coping's lip)
        if (inside(c, [x, z]) || distTo(c, [x, z], true) < 0.05) continue;
        const covered = PLAN.slabs.some((s) => inside(s as Pt[], [x, z])) || STREETS.some((s) => distTo(s.pts, [x, z]) < s.half + 0.8);
        assert.ok(covered, `bare at ${x.toFixed(1)}, ${z.toFixed(1)} round a ramp`);
      }
  }
  void acrossOf;
  void underpassOf;
  void UNDER_MOUTHS;
});
