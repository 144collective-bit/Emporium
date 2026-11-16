// Aldwyn's Green's terraces as data (southterraces.ts; docs/south-plan.md Phase 3a, the owner's photo and calls): rows
// of two-storey houses along the village's streets, each in its block, off the streets and footpaths, none in another,
// facing its street; mostly red brick with a few painted, yellow and pebble-dashed; a dormer on about one in four;
// a row facing Degen's gates; no row longer than twelve before a ginnel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOUSES, TERRACE, houseFoot, plotOf } from '../src/scripts/city3d/southterraces';
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
