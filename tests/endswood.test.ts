// Endswood Estate (endswood.ts, docs/estate-plan.md Phase 2): its land between the highway and Lot 9, its streets in
// the street plan (Endswood Road lit at the avenues, the Circus one way round), its blocks off every street and clear of
// what's below ground, and the subways: from the spine down a ramp, under the Circus, into the well open to the sky and
// out the other side, the walls stopping you down there and the cuttings' and the well's edges at street level.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CIRCUS, CIRCUS_OUT, CLOSE_BOLLARDS, ENDS_BLOCKS, ENDS_CROSSINGS, ENDS_LAMPS, ENDS_SOLIDS, ENDS_STREETS, ENDSWOOD_RECT, ISLAND_R, NORTH_Z, RAIL_POSTS, ROAD_Z, SOUTH_Z, SPINE,
  SUBWAYS, SUBWAY_BOLLARDS, SUBWAY_HOLES, WELL, WEST_X, inEndswood, subwayEnds,
} from '../src/scripts/city3d/endswood';
import { LINK_BLOCKS, WEST_BLOCKS } from '../src/scripts/city3d/endswest';
import { DOWN, GROUND_Y, floorOf, underworld } from '../src/scripts/city3d/underground';
import { FENCE as LOT9_FENCE, FOOTPATH, LOT9_PASSAGE, TUNNEL } from '../src/scripts/city3d/lot9';
import { PLAN, distToStreet, inPoly, type Pt } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { HIGHWAY_HALF, fromHighway, insideHighway } from '../src/scripts/city3d/highway';
import { rampLand, EXITS } from '../src/scripts/city3d/viaduct';
import { AIRPORT_AREAS } from '../src/scripts/city3d/airfield';
import { TRACKS } from '../src/scripts/city3d/metro';
import { ROUTES, pointOn } from '../src/scripts/city3d/routes';
import { BUS_STOPS } from '../src/scripts/city3d/transit';
import { KEEPS } from '../src/scripts/city3d/landuse';
import { lampTone } from '../src/scripts/city3d/lampmix';
import { AREAS } from '../src/scripts/city3d/areas';
import { WORLD_BOUNDS } from '../src/scripts/city3d/layout';

const UNDER = underworld([LOT9_PASSAGE, ...SUBWAYS], [WELL]);
const R = 0.22;
const inRect = (r: readonly number[], x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
const overlap = (a: readonly number[], b: readonly number[], m = 0) => a[0] < b[2] - m && a[2] > b[0] + m && a[1] < b[3] - m && a[3] > b[1] + m;
// (the old estate's: the extension west is tests/endswest.test.ts's)
const WEST_IDS = new Set([...WEST_BLOCKS, ...LINK_BLOCKS].map((b) => b.id));
const blocks = PLAN.blocks.map((b, i) => ({ b, slab: PLAN.slabs[i] })).filter(({ b }) => b.ref === 'endswood' && !WEST_IDS.has(b.id));
const [N, S] = [SUBWAYS.find((p) => p.id.endsWith('-n'))!, SUBWAYS.find((p) => p.id.endsWith('-s'))!];

test('its land: outside the highway between it and Lot 9, clear of the exit ramps, the airport and the metro, in the world', () => {
  for (const [x, z] of [
    [ENDSWOOD_RECT[0], ENDSWOOD_RECT[1]],
    [ENDSWOOD_RECT[2], ENDSWOOD_RECT[3]],
  ])
    assert.ok(!insideHighway(x, z) && fromHighway(x, z) > HIGHWAY_HALF, `${x}, ${z}`);
  assert.ok(ENDSWOOD_RECT[3] < LOT9_FENCE[1] - 30, 'the common between it and Lot 9');
  assert.ok(ENDSWOOD_RECT[0] > WORLD_BOUNDS[0] && ENDSWOOD_RECT[2] < WORLD_BOUNDS[2] && ENDSWOOD_RECT[3] < WORLD_BOUNDS[3]);
  for (const a of AIRPORT_AREAS) assert.ok(!overlap(a, ENDSWOOD_RECT), 'off the airport');
  // (nothing of it on the ramps' land, every block and the spine past it)
  for (let x = WEST_X; x < ENDSWOOD_RECT[2]; x += 1) for (let z = NORTH_Z - 1; z < SOUTH_Z; z += 1) assert.ok(!rampLand(x, z), `ramp land at ${x}, ${z}`);
  for (const t of Object.values(TRACKS))
    for (let i = 1; i < t.pts.length; i++)
      for (let k = 0; k <= 20; k++) {
        const [a, c] = [t.pts[i - 1], t.pts[i]];
        assert.ok(!inEndswood(a[0] + ((c[0] - a[0]) * k) / 20, a[1] + ((c[1] - a[1]) * k) / 20, 10), 'no metro over it');
      }
  assert.ok(AREAS.some((a) => a.id === 'endswood' && a.character === 'grit'));
  assert.ok(KEEPS.some((k) => k.id === 'endswood'), 'the trees keep off it');
  // Exit 6's signs read it
  assert.equal(EXITS.find((e) => e.n === 6)!.name, 'Endswood · The Trenches');
});

test('its streets join the plan: Endswood Road lit at the avenues, the Circus one way round, the Close a dead end', () => {
  for (const t of ENDS_STREETS) assert.ok(PLAN.streets.some((s) => s.id === t.id), t.id);
  const circus = PLAN.streets.find((s) => s.id === 'ends-circus')!;
  assert.ok(circus.loop && circus.oneway === 1);
  for (const p of circus.pts) assert.ok(Math.abs(Math.hypot(p[0] - CIRCUS.x, p[1] - CIRCUS.z) - CIRCUS.r) < 1e-9);
  for (const c of ENDS_CROSSINGS) {
    const k = PLAN.crossings.find((q) => q.id === c.id)!;
    for (const id of k.streets) assert.ok(distToStreet(PLAN.streets.find((s) => s.id === id)!, k.at) < 1e-6, `${id} at ${c.id}`);
  }
  assert.ok(ENDS_CROSSINGS.filter((c) => c.lights).every((c) => c.streets.some((id) => id === 'ns0s' || id === 'ns3')));
  // The traffic drives Endswood Road both ways and round the Circus
  const along = ROUTES.flatMap((r) => Array.from({ length: Math.ceil(r.len) }, (_, k) => pointOn(r, k, 0).at));
  const near = (q: Pt, m: number) => along.some((p) => Math.hypot(p[0] - q[0], p[1] - q[1]) < m);
  for (const x of [-30, 8, 30, 52]) assert.ok(near([x, ROAD_Z], 2), `nobody drives Endswood Road at ${x}`);
  assert.ok(near([CIRCUS.x, CIRCUS.z - CIRCUS.r], 1.5) && near([CIRCUS.x, CIRCUS.z + CIRCUS.r], 1.5), 'nobody drives round the Circus');
  // A bus stop each way on the south avenue by the estate
  const stops = BUS_STOPS.filter((s) => s.street === 'ns0s' && inEndswood(s.at[0], s.at[1]));
  assert.ok(stops.some((s) => s.dir[1] > 0) && stops.some((s) => s.dir[1] < 0), 'a stop each way');
});

test('its blocks: on its land, off every street, round the Circus, clear of the spine, the subways, the well and the path to Lot 9', () => {
  assert.equal(blocks.length, ENDS_BLOCKS.length);
  for (const { b, slab } of blocks) {
    for (const q of b.poly) assert.ok(inRect(ENDSWOOD_RECT, q[0], q[1]), `${b.id} off its land at ${q}`);
    // (round the Circus: every corner its outer kerb and sidewalk away)
    for (const q of b.poly) assert.ok(Math.hypot(q[0] - CIRCUS.x, q[1] - CIRCUS.z) >= CIRCUS_OUT - 1e-6, `${b.id} in the Circus at ${q}`);
    // (nothing below ground under a slab: the cuttings, the well; the path down to Lot 9 west of them)
    for (const h of SUBWAY_HOLES) for (const q of slab) assert.ok(!inRect(h, q[0], q[1], 0.1), `${b.id} over a hole at ${q}`);
    for (const p of SUBWAYS) for (let s = p.a0; s <= p.a1; s += 0.5) for (const u of [-1, 0, 1]) assert.ok(!inPoly(slab, [p.c + u * (p.half + p.wall), s]), `${b.id} over ${p.id}`);
    for (const p of FOOTPATH) assert.ok(!inPoly(slab, p), `${b.id} on the path at ${p}`);
  }
  // The spine either side of the Circus is no block's
  for (let z = NORTH_Z; z < SOUTH_Z; z += 1) assert.ok(!blocks.some(({ slab }) => inPoly(slab, [CIRCUS.x + SPINE - 0.9, z])), `the spine at ${z}`);
});

test('down a subway from the spine, under the Circus, through the well and up the other: never blocked, every step small', () => {
  const x = CIRCUS.x;
  let y = GROUND_Y;
  let low = Infinity;
  for (let z = N.a0 - 1.5; z <= S.a1 + 1.5; z += 0.05) {
    const g = UNDER.y(x, z, y) ?? GROUND_Y;
    assert.ok(Math.abs(g - y) < 0.06, `a step at ${z}: ${y} to ${g}`);
    assert.ok(!UNDER.wall(x, z, y, R), `stopped at ${z}`);
    y = g;
    low = Math.min(low, y);
  }
  assert.ok(Math.abs(y - GROUND_Y) < 1e-6 && Math.abs(low - WELL.floor) < 1e-6);
  // The ramps no steeper than one in three, the subways a walker stands up in
  for (const p of SUBWAYS) {
    const { top, ramp } = subwayEnds(p);
    assert.ok((GROUND_Y - p.floor) / Math.abs(ramp - top) < 1 / 3, p.id);
    assert.ok(p.ceil - p.floor > 1.5);
    assert.equal(floorOf(p, (p.roofs[0][0] + p.roofs[0][1]) / 2), WELL.floor);
  }
  // ...and round the well's floor, wall to wall
  for (let a = 0; a < Math.PI * 2; a += 0.2) assert.ok(!UNDER.wall(WELL.x + (WELL.r - 0.5) * Math.cos(a), WELL.z + (WELL.r - 0.5) * Math.sin(a), WELL.floor, R));
});

test('down there the walls stop you; at street level the cuttings and the well do; over the roofs, ordinary ground', () => {
  const mid = (N.roofs[0][0] + N.roofs[0][1]) / 2;
  // In the subway: its walls
  assert.ok(UNDER.wall(N.c + N.half, mid, N.floor, R) && UNDER.wall(N.c - N.half, mid, N.floor, R));
  assert.ok(!UNDER.wall(N.c, mid, N.floor, R));
  // In the well: its wall, but not its mouths
  assert.ok(UNDER.wall(WELL.x + WELL.r, WELL.z, WELL.floor, R) && UNDER.wall(WELL.x - WELL.r, WELL.z, WELL.floor, R));
  assert.ok(!UNDER.wall(WELL.x, WELL.z - WELL.r, WELL.floor, R) && !UNDER.wall(WELL.x, WELL.z + WELL.r, WELL.floor, R));
  // Over the roof (the Circus, its island): no floor here at street level, nothing stops you
  assert.equal(UNDER.y(N.c, mid, GROUND_Y), null);
  assert.ok(!UNDER.wall(N.c, mid, GROUND_Y, R));
  assert.ok(!UNDER.roofed(WELL.x, WELL.z) && UNDER.roofed(N.c, mid));
  // At street level you can't step off into a cutting or the well
  const { top, portal } = subwayEnds(N);
  assert.ok(UNDER.wall(N.c + N.half - 0.1, (top + portal) / 2, GROUND_Y, R), 'into the north cutting');
  assert.ok(UNDER.wall(WELL.x + WELL.r - 0.1, WELL.z, GROUND_Y, R), 'into the well');
  // The highway's tunnel still the same with them all together
  assert.ok(!UNDER.wall(TUNNEL.x, 320, TUNNEL.floor, R) && UNDER.wall(TUNNEL.x + TUNNEL.half, 320, TUNNEL.floor, R));
  assert.equal(UNDER.y(TUNNEL.x, 320, GROUND_Y), null);
  assert.equal(UNDER.y(TUNNEL.x, 320, -1), TUNNEL.floor);
  // Far off, nothing
  assert.equal(UNDER.y(CIRCUS.x + 30, CIRCUS.z, -1), null);
  assert.ok(DOWN > WELL.floor);
});

test('the walk camera down there keeps to the air: under the roofs, up out of the well', () => {
  const mid = (S.roofs[0][0] + S.roofs[0][1]) / 2;
  // In the subway, up: stopped by the ceiling
  const up = UNDER.room(S.c, S.floor + 0.8, mid, 0, 1, 0, 5);
  assert.ok(Math.abs(S.floor + 0.8 + up - S.ceil) < 0.2, `up ${up}`);
  // Along it: far; sideways: the wall
  assert.ok(UNDER.room(S.c, S.floor + 0.8, mid, 0, 0, 1, 2) >= 1.9);
  assert.ok(UNDER.room(S.c, S.floor + 0.8, mid, 1, 0, 0, 5) < S.half);
  // In the well, up: out into the sky
  assert.equal(UNDER.room(WELL.x, WELL.floor + 0.8, WELL.z, 0, 1, 0, 5), 5);
});

test('what is solid: the parapets and headwalls, the bollards a walker passes and no car does, the well\'s railing', () => {
  for (const b of ENDS_SOLIDS) assert.ok(SOLIDS.includes(b));
  // The parapets along each cutting, outside its floor
  for (const p of SUBWAYS) {
    const { top, portal } = subwayEnds(p);
    const s = (top + portal) / 2;
    for (const k of [-1, 1]) assert.ok(ENDS_SOLIDS.some((b) => inRect(b, p.c + k * (p.half + p.wall / 2), s)), `${p.id}'s parapet`);
    assert.ok(!ENDS_SOLIDS.some((b) => inRect(b, p.c, s, -0.01)), `${p.id}'s floor clear`);
  }
  // Bollards: a walker gets between them, a car doesn't
  for (const set of [SUBWAY_BOLLARDS.slice(0, 2), SUBWAY_BOLLARDS.slice(2), CLOSE_BOLLARDS]) {
    const gaps = set.slice(1).map((p, i) => Math.hypot(p[0] - set[i][0], p[1] - set[i][1]) - 0.28);
    assert.ok(gaps.every((g) => g > R * 2 + 0.2 && g < 1.4), `gaps ${gaps}`);
  }
  // The well's railing round its rim, nothing getting between its posts
  for (let i = 0; i < RAIL_POSTS.length; i++) {
    const [a, c] = [RAIL_POSTS[i], RAIL_POSTS[(i + 1) % RAIL_POSTS.length]];
    assert.ok(Math.hypot(c[0] - a[0], c[1] - a[1]) - 0.32 < R * 2);
  }
  // Nothing of it on a street but the Close's bollards at its end
  for (const b of ENDS_SOLIDS.filter((b) => !CLOSE_BOLLARDS.some(([x, z]) => inRect(b, x, z))))
    for (const s of PLAN.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp'))
      assert.ok(distToStreet(s, [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]) > s.half, `${b} on ${s.id}`);
  // No street over a hole but over the roofs
  for (const h of SUBWAY_HOLES)
    for (const s of PLAN.streets.filter((s) => s.kind !== 'highway'))
      for (let x = h[0]; x <= h[2]; x += 0.5) for (let z = h[1]; z <= h[3]; z += 0.5) if (!UNDER.roofed(x, z) && Math.hypot(x - WELL.x, z - WELL.z) > ISLAND_R) assert.ok(distToStreet(s, [x, z]) > s.half, `${s.id} over a hole at ${x}, ${z}`);
});

test('its lamps: sodium, clear of everything solid, off the streets', () => {
  const tones = ENDS_LAMPS.map(([x, z]) => lampTone(x, z));
  assert.ok(tones.filter((t) => t !== 'white').length >= tones.length * 0.8);
  for (const [x, z] of ENDS_LAMPS) {
    assert.ok(!SOLIDS.some((b) => inRect(b, x, z, 0.1)), `lamp ${x}, ${z} in something`);
    for (const s of PLAN.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp')) assert.ok(distToStreet(s, [x, z]) > s.half + 0.2, `lamp ${x}, ${z} on ${s.id}`);
    assert.equal(UNDER.y(x, z, GROUND_Y), null, `lamp ${x}, ${z} over a hole`);
  }
});
