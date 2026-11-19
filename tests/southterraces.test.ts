// Aldwyn's Green's terraces as data (southterraces.ts; docs/south-plan.md Phase 3a, the owner's photo and calls): rows
// of two-storey houses along the village's streets, each in its block, off the streets and footpaths, none in another,
// facing its street; mostly red brick with a few painted, yellow and pebble-dashed; a dormer on about one in four;
// a row facing Degen's gates; no row longer than twelve before a ginnel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALLEYS, DOOR_U, GINNELS, HOUSES, OUTRIGGERS, TERRACE, houseFoot, outriggerFoot, plotOf, rearOf, rearWalls } from '../src/scripts/city3d/southterraces';
import { southLift } from '../src/scripts/city3d/southground';
import { CHURCHYARD, COMPOUND_GATES, FOOTPATHS, PATH_HALF, SOUTH_BLOCKS, SOUTH_STREETS, type Pt } from '../src/scripts/city3d/south';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { distTo, inside } from '../src/scripts/city3d/streetfaces';

const STREETS = PLAN.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp');
const offStreet = (p: Pt) => Math.min(...STREETS.map((s) => distToStreet(s, p) - s.half - 0.8));

test('rows of houses in the village: each in its block, off the streets and footpaths, none in another', () => {
  assert.ok(HOUSES.length >= 200, `${HOUSES.length} houses`);
  for (const h of HOUSES) {
    const b = SOUTH_BLOCKS.find((q) => q.id === h.block)!;
    assert.ok(b.zone === 'village' || b.zone === 'council', `${h.id} in a ${b.zone} block`);
    for (const p of plotOf(h)) assert.ok(inside(b.poly, [p[0] + (h.at[0] - p[0]) * 0.02, p[1] + (h.at[1] - p[1]) * 0.02]) || distTo(b.poly, p, true) < 0.3, `${h.id}'s plot out of its block`);
    for (const p of houseFoot(h)) {
      // (an end house's back corner may come near a side street: never onto its sidewalk)
      assert.ok(offStreet(p) > 0.3, `${h.id} by a street`);
      for (const f of FOOTPATHS) assert.ok(distTo(f.pts, p) > PATH_HALF + 0.3, `${h.id} on ${f.id}`);
      assert.ok(!inside(CHURCHYARD, p), `${h.id} in the churchyard`);
    }
    assert.ok(h.w >= TERRACE.w[0] && h.w <= TERRACE.w[1]);
    assert.notEqual(h.street, 'south-high', "the High Road's frontage is 3c's");
  }
  const shrunk = (h: (typeof HOUSES)[number]) => houseFoot(h).map((p): Pt => [p[0] + (h.at[0] - h.face[0] * TERRACE.depth / 2 - p[0]) * 0.1, p[1] + (h.at[1] - h.face[1] * TERRACE.depth / 2 - p[1]) * 0.1]);
  for (let i = 0; i < HOUSES.length; i++)
    for (let j = i + 1; j < HOUSES.length; j++) {
      const [a, b] = [HOUSES[i], HOUSES[j]];
      if (Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]) > 10) continue;
      assert.ok(!shrunk(a).some((p) => inside(houseFoot(b), p)), `${a.id} in ${b.id}`);
    }
});

test('each faces its street: its front a yard back from the sidewalk, its back away from it', () => {
  // (its front corners a yard back from its own street's sidewalk)
  for (const h of HOUSES) {
    const st = STREETS.find((q) => q.id === h.street);
    if (st) for (const p of houseFoot(h).slice(0, 2)) assert.ok(distToStreet(st, p) - st.half - 0.8 > TERRACE.yard - 0.35, `${h.id}'s front on its sidewalk`);
  }
  for (const h of HOUSES) {
    const s = SOUTH_STREETS.find((q) => q.id === h.street)!;
    const front = distTo(s.pts, h.at);
    const back = distTo(s.pts, [h.at[0] - h.face[0] * TERRACE.depth, h.at[1] - h.face[1] * TERRACE.depth]);
    assert.ok(back > front + TERRACE.depth * 0.6, `${h.id} faces away from ${h.street}`);
    // (round a close's turning circle the kerb is the circle's: further from the street's line)
    assert.ok(front < s.half + 0.8 + TERRACE.yard + 4.5, `${h.id} far back from ${h.street}`);
  }
});

test('as the photo, mostly: red brick on most, a few painted, yellow and pebble-dashed; dormers on about one in four', () => {
  const share = (f: string) => HOUSES.filter((h) => h.front === f).length / HOUSES.length;
  assert.ok(share('red') > 0.65 && share('red') < 0.85, `red ${share('red')}`);
  for (const f of ['yellow', 'painted', 'pebbledash']) assert.ok(share(f) > 0, `no ${f}`);
  const dormers = HOUSES.filter((h) => h.dormer).length / HOUSES.length;
  assert.ok(dormers > 0.15 && dormers < 0.35, `dormers ${dormers}`);
  assert.ok(HOUSES.some((h) => h.endL) && HOUSES.some((h) => h.endR), 'rows end somewhere');
});

test("a row facing Degen's gates; and no row longer than twelve without a ginnel", () => {
  const gate: Pt = [COMPOUND_GATES.x, (COMPOUND_GATES.z0 + COMPOUND_GATES.z1) / 2];
  assert.ok(HOUSES.some((h) => h.street === COMPOUND_GATES.on && Math.hypot(h.at[0] - gate[0], h.at[1] - gate[1]) < 35), "no houses across from the gates");
  // (walk along each street's houses in order: a run of touching neighbours is a row)
  for (const s of new Set(HOUSES.map((h) => `${h.block}|${h.street}`))) {
    const row = HOUSES.filter((h) => `${h.block}|${h.street}` === s);
    let n = 1;
    for (let i = 1; i < row.length; i++) {
      const gap = Math.hypot(row[i].at[0] - row[i - 1].at[0], row[i].at[1] - row[i - 1].at[1]) - (row[i].w + row[i - 1].w) / 2;
      n = gap < 0.4 ? n + 1 : 1;
      assert.ok(n <= TERRACE.most, `a row of ${n} on ${s}`);
    }
  }
});

test('behind the rows: a back alley behind most houses, in no one else\'s plot; level houses on the hill', () => {
  assert.ok(ALLEYS.length / HOUSES.length > 0.8, `alleys behind ${ALLEYS.length} of ${HOUSES.length}`);
  for (const a of ALLEYS) {
    const h = HOUSES.find((q) => q.id === a.house)!;
    assert.ok(a.rear >= 0.9, `${h.id}'s rear yard all alley`);
    for (const p of a.poly) assert.ok(offStreet(p) > -0.9, `${h.id}'s alley on a street`);
    for (const o of HOUSES) if (o !== h && Math.hypot(o.at[0] - h.at[0], o.at[1] - h.at[1]) < 14) for (const p of houseFoot(o)) assert.ok(!inside(a.poly, p), `${h.id}'s alley through ${o.id}`);
  }
  assert.ok(GINNELS.length >= 1, 'a ginnel through a long row');
  for (const h of HOUSES) {
    assert.ok(h.base >= h.low && h.base - h.low < 0.8, `${h.id} on a steep plot`);
    for (const p of houseFoot(h)) assert.ok(h.base - 0.15 >= southLift(p[0], p[1]) - 1e-6, `${h.id} under the ground`);
  }
  assert.ok(Math.max(...HOUSES.map((h) => h.base)) > 1, "some up the village's hill");
});

test("the backs (the map polish plan's Phase 2): a back kitchen on most deep yards, in its own yard; the yard walled round, a gate by the back door", () => {
  const deep = HOUSES.filter((h) => rearOf(h) >= 1.9);
  assert.ok(OUTRIGGERS.size > deep.length * 0.6 && OUTRIGGERS.size < deep.length * 0.9, `${OUTRIGGERS.size} back kitchens of ${deep.length} deep yards`);
  const plots = new Map(HOUSES.map((h) => [h.id, plotOf(h)]));
  for (const h of HOUSES) {
    const foot = outriggerFoot(h);
    if (!OUTRIGGERS.has(h.id)) {
      assert.equal(foot.length, 0);
      continue;
    }
    // (inside its own plot, behind the house, short of the yard's end; in no other house, plot or alley)
    const c: Pt = [foot.reduce((s, p) => s + p[0], 0) / 4, foot.reduce((s, p) => s + p[1], 0) / 4];
    assert.ok(inside(plots.get(h.id)!, c), `${h.id}'s back kitchen off its plot`);
    // (its corners pulled in 2%: a corner on a neighbour's party line touches it, it isn't in it)
    const inner = foot.map((p): Pt => [p[0] * 0.98 + c[0] * 0.02, p[1] * 0.98 + c[1] * 0.02]);
    for (const o of HOUSES) if (o !== h) for (const p of inner) assert.ok(!inside(houseFoot(o), p), `${h.id}'s back kitchen in ${o.id}`);
    for (const a of ALLEYS) if (a.house !== h.id) for (const p of inner) assert.ok(!inside(a.poly, p), `${h.id}'s back kitchen in an alley`);
  }
  let clipped = HOUSES.length;
  for (const h of HOUSES) {
    const walls = rearWalls(h);
    assert.equal(walls.length, h.endR ? 4 : 3);
    // (no wall through a house: a run stops where the next row's house stands in the yard)
    for (const [a, b] of walls.flat())
      for (const o of HOUSES)
        for (const f of [0.25, 0.5, 0.75]) assert.ok(!inside(houseFoot(o), [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]), `${h.id}'s yard wall through ${o.id}`);
    // (the gate's gap behind the back door: the back wall's two runs either side of it, where nothing cut them)
    if (walls[1].length !== 1 || walls[2].length !== 1) continue;
    clipped--;
    const [r0, r1] = [walls[1][0], walls[2][0]];
    const gap = Math.hypot(r1[0][0] - r0[1][0], r1[0][1] - r0[1][1]);
    assert.ok(Math.abs(gap - 0.8) < 1e-6, `${h.id}'s gate ${gap}`);
    const mid: Pt = [(r0[1][0] + r1[0][0]) / 2, (r0[1][1] + r1[0][1]) / 2];
    const door: Pt = [h.at[0] - h.face[1] * DOOR_U, h.at[1] + h.face[0] * DOOR_U];
    assert.ok(Math.abs(Math.hypot(mid[0] - door[0], mid[1] - door[1]) - (TERRACE.depth + rearOf(h) - 0.05)) < 1e-6, `${h.id}'s gate not behind its door`);
  }
  // (only the corners cut: nearly every back wall whole)
  assert.ok(clipped < HOUSES.length * 0.1, `${clipped} back walls cut`);
});
