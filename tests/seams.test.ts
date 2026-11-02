// The seam map (seams.ts, docs/blend-plan.md Phase 0): the world as a grid of what's there, the seams where the
// city's areas meet and the open land inside the ring highway in named gaps. The plan's later phases read it, so it
// must find every district, the seams the owner named and every gap, at both world sizes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AREAS, AREA_IDS, C, CELL, GAP_MIN, GAP_NAMES, gaps, landMap, openShare, seams, type Seam } from '../src/scripts/city3d/seams';
import { CENTER_XZ, EXT } from '../src/scripts/city3d/layout';
import { insideHighway } from '../src/scripts/city3d/highway';
import { LAKE_C } from '../src/scripts/city3d/westlake';
import { PLACES } from '../src/scripts/city3d/places';

const map = landMap();
const cellAt = (x: number, z: number) => map.get(Math.floor((x - map.x0) / CELL), Math.floor((z - map.z0) / CELL));
const area = (id: string) => AREA_IDS.indexOf(id);
const S = seams(map);
const G = gaps(map);
const has = (a: string, b: string, between?: Seam['between']) => S.some((s) => ((s.a === a && s.b === b) || (s.a === b && s.b === a)) && (!between || s.between === between));

test('the map covers the world, edge to edge', () => {
  assert.equal(map.x0, EXT[0]);
  assert.ok(map.x0 + map.nx * CELL >= EXT[1]);
  assert.equal(map.cells.length, map.nx * map.nz);
});

test('what a few known points are', () => {
  assert.equal(cellAt(CENTER_XZ.x + 5, CENTER_XZ.z - 5), area('downtown'), "downtown's middle");
  assert.equal(cellAt(30, 100), C.water, 'the river by downtown');
  assert.equal(cellAt(LAKE_C[0], LAKE_C[1]), area('westlake'), "Westlake's lake is the park's");
  assert.equal(cellAt(EXT[0] + 3, EXT[0] + 3), C.outside, "the world's corner");
  assert.equal(cellAt(-215, 75), C.water, 'the river where the highway crosses it, west');
  assert.equal(cellAt(-215, 30), C.highway, 'the ring highway, west side');
});

test('every area holds land, and nothing stands where the map says open', () => {
  for (const [i, a] of AREAS.entries()) assert.ok(map.cells.includes(i), `${a.name} is on the map`);
  // (where you arrive at every place is on something: a district, a street, a walk, the water's decks; never open land inside the highway)
  for (const p of PLACES) {
    const c = cellAt(p.at.x, p.at.z);
    assert.notEqual(c, C.open, `${p.id} arrives on open land inside the highway (${p.at.x}, ${p.at.z})`);
  }
});

test('every district meets something, and the seams the plan names are there', () => {
  for (const a of AREA_IDS) assert.ok(S.some((s) => s.a === a || s.b === a), `${a} has a seam`);
  assert.ok(has('downtown', 'town', 'avenue'), 'downtown and the town across the ring avenue');
  assert.ok(has('uptown', 'westlake', 'avenue'), 'Uptown and Westlake Park across the ring avenue');
  assert.ok(has('uptown-north', 'westlake'), 'Uptown North and the park');
  assert.ok(has('uptown-north', 'mall', 'avenue'), 'Uptown North and the mall across the north avenue');
  assert.ok(has('mall', 'palm-court', 'avenue'), 'the mall and Palm Court across the east ring avenue');
  assert.ok(has('town', 'trenches'), 'the south row and The Trenches');
  assert.ok(has('town', 'uptown'), 'the town and Uptown');
  assert.ok(has('sunridge', 'open'), "Sunridge's wall on open land");
});

test('the seams are ranked, each a stretch of its own with its point on it', () => {
  for (let i = 1; i < S.length; i++) assert.ok(S[i - 1].rank >= S[i].rank, 'ranked');
  for (const s of S) {
    assert.ok(s.length >= 6 * CELL, `${s.a}|${s.b} long enough to count`);
    assert.ok(AREA_IDS.includes(s.a), `${s.a} is a district`);
    assert.ok(AREA_IDS.includes(s.b) || ['open', 'outside', 'water'].includes(s.b), `${s.b} is a district, open land or water`);
    const [x0, z0, x1, z1] = s.box;
    assert.ok(s.at[0] >= x0 - CELL && s.at[0] <= x1 + CELL && s.at[1] >= z0 - CELL && s.at[1] <= z1 + CELL, `${s.a}|${s.b}'s point in its box`);
  }
});

test('the gaps: every patch of open land inside the highway is named, and every name finds its patch', () => {
  for (const g of G) {
    assert.ok(g.area >= GAP_MIN);
    assert.notEqual(g.name, 'Unnamed', `a gap of ${g.area} sq tiles at ${g.at.join(', ')} has no name in GAP_NAMES`);
    assert.equal(cellAt(g.at[0], g.at[1]), C.open, `${g.id}'s point is in it`);
    assert.ok(insideHighway(g.at[0], g.at[1]), `${g.id} is inside the highway`);
  }
  for (const n of GAP_NAMES) assert.ok(G.some((g) => g.id === n.id), `${n.name} (${n.at.join(', ')}) is on a gap`);
  assert.equal(new Set(G.map((g) => g.id)).size, G.length, 'one name a gap');
  // The airport's old land is the biggest
  assert.equal(G[0].id, 'south-band');
});

test('some of the land inside the highway is open, not most', () => {
  const share = openShare(map);
  assert.ok(share > 0.05 && share < 0.5, `open share ${share.toFixed(2)}`);
});
