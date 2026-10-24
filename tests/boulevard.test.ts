// Uptown's waterfront boulevard (boulevard.ts, boulevarddress.ts, docs/finance-plan.md Phase 4): the esplanade from
// Uptown's edge to the town's promenade, out over the water but clear of the boats, its overlooks and marina, the
// yachts moored clear of the middle lane, the trees, lamps and benches, the restaurant terraces on the river row's
// podium roofs, the people, the planted median kept off the junctions and the axis's zebra, and the town car.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BENCH_XS,
  BENCH_Z,
  BOULEVARD_PEOPLE,
  CHAIR_OFF,
  EDGE_LAMPS,
  ESPLANADE,
  ESPLANADE_DECKS,
  GANGWAYS,
  LAND_TREES,
  OVERLOOKS,
  PONTOON,
  ROOF_TERRACES,
  WATER_TREES,
  onEsplanade,
} from '../src/scripts/city3d/boulevard';
import { HEDGE, MEDIAN_RUNS, MEDIAN_TREES, MEDIAN_Z, TENDERS, TERRACE_NAMES, YACHTS } from '../src/scripts/city3d/boulevarddress';
import { AXIS_X, BOULEVARD_X, E, NS_X, ROWS_Z, W } from '../src/scripts/city3d/uptown';
import { HIGHRISES, PODIUM } from '../src/scripts/city3d/highrise';
import { DECKS, boatZ } from '../src/scripts/city3d/waterfront';
import { PROMENADE } from '../src/scripts/city3d/outer';
import { LANE, MEDIAN, RIVER } from '../src/scripts/city3d/layout';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLAN } from '../src/scripts/city3d/streetplan';
import { CARS, PAINTS } from '../src/scripts/city3d/cars';

const [X0, Z0, X1, Z1] = ESPLANADE;
/** A boat's half beam, and the water kept between it and anything moored or built out */
const BOAT_HALF = 0.3;
const GAP = 0.8;
const inRect = (r: readonly number[], x: number, z: number, m = 0) => x > r[0] + m && x < r[2] - m && z > r[1] + m && z < r[3] - m;
/** The furthest south the middle lane's boat comes over x0..x1 */
const laneNorth = (x0: number, x1: number) => {
  let z = Infinity;
  for (let x = x0 - 2; x <= x1 + 2; x += 0.25) z = Math.min(z, boatZ(0, x) - BOAT_HALF);
  return z;
};

test('the esplanade: from Uptown\'s edge to the town\'s promenade, from the avenue\'s kerb out over the water', () => {
  const bank = ROWS_Z[ROWS_Z.length - 1];
  assert.equal(Z0, bank.c + bank.half, 'from the kerb');
  assert.equal(X1, PROMENADE.x[0], 'to where the town\'s promenade begins');
  assert.ok(X0 > W - 1 && X0 < W + 3 && BOULEVARD_X[0] === W);
  assert.ok(Z1 > RIVER[0] + 2 && Z1 < RIVER[0] + 4, 'out over the water');
  // Wide: 5 or more across
  assert.ok(Z1 - Z0 >= 5);
});

test('the boats keep clear: since the river was widened again, the north lane passes outside every deck and yacht', () => {
  for (const d of ESPLANADE_DECKS) assert.ok(d[3] + GAP < laneNorth(d[0], d[2]), `a deck at ${d} in the north lane`);
  for (const y of YACHTS) assert.ok(y.z + y.beam / 2 + GAP < laneNorth(y.x - y.len / 2, y.x + y.len / 2), `a yacht at ${y.x} in the north lane`);
  // And never across the river to the south bank's boardwalk, pier and market: the lanes' water left between them
  for (const d of ESPLANADE_DECKS) for (const s of DECKS) if (d[0] < s[2] && s[0] < d[2]) assert.ok(d[3] < s[1] - 2, `${d} too near ${s}`);
});

test('the decks join up: you can walk along the esplanade, out onto each overlook and down a gangway to the pontoon', () => {
  const R = 0.32;
  for (let x = X0 + 0.5; x < X1 - 0.5; x += 0.5) for (const z of [Z0 + 0.6, (Z0 + Z1) / 2, Z1 - 0.6]) assert.ok(onEsplanade(x, z, R), `off the deck at ${x}, ${z}`);
  for (const o of OVERLOOKS) for (let z = Z1 - 0.6; z < o.rect[3] - 0.4; z += 0.2) assert.ok(onEsplanade(o.x, z, R), `the overlook at ${o.x}`);
  for (const g of GANGWAYS) for (let z = Z1 - 0.6; z < PONTOON[3] - 0.4; z += 0.2) assert.ok(onEsplanade(g, z, R), `the gangway at ${g}`);
  for (let x = PONTOON[0] + 0.5; x < PONTOON[2] - 0.5; x += 0.5) assert.ok(onEsplanade(x, (PONTOON[1] + PONTOON[3]) / 2, R));
  // ...but not off the pontoon's far side into the yachts
  assert.ok(!onEsplanade(YACHTS[0].x, YACHTS[0].z, R));
});

test('the marina: yachts moored along the pontoon, none overlapping, tenders inside it', () => {
  assert.ok(YACHTS.length >= 4);
  YACHTS.forEach((y, i) => {
    assert.ok(y.x - y.len / 2 >= PONTOON[0] - 0.01 && y.x + y.len / 2 <= PONTOON[2] + 0.01, 'alongside the pontoon');
    assert.ok(y.z - y.beam / 2 > PONTOON[3], 'off the pontoon');
    assert.ok(y.len < 6 && y.beam < 1.6);
    if (i) assert.ok(y.x - y.len / 2 > YACHTS[i - 1].x + YACHTS[i - 1].len / 2 + 0.5, 'apart');
  });
  for (const t of TENDERS) {
    assert.ok(t.z - 0.3 > Z1 && t.z + 0.3 < PONTOON[1], 'between the esplanade and the pontoon');
    for (const g of GANGWAYS) assert.ok(Math.abs(t.x - g) > t.len / 2 + 1, 'clear of the gangways');
  }
});

test('the trees, lamps and benches: on the esplanade, in their rows, apart, out of the overlooks\' mouths', () => {
  // (fewer by the water where the observation wheel stands, wheel.test.ts)
  assert.ok(LAND_TREES.length > 15 && WATER_TREES.length > 4 && EDGE_LAMPS.length > 10 && BENCH_XS.length > 15);
  const all: [string, number, number][] = [
    ...LAND_TREES.map(([x, z]): [string, number, number] => ['tree', x, z]),
    ...WATER_TREES.map(([x, z]): [string, number, number] => ['tree', x, z]),
    ...EDGE_LAMPS.map(([x, z]): [string, number, number] => ['lamp', x, z]),
    ...BENCH_XS.map((x): [string, number, number] => ['bench', x, BENCH_Z]),
  ];
  for (const [what, x, z] of all) {
    assert.ok(onEsplanade(x, z, 0.3), `a ${what} off the esplanade at ${x}, ${z}`);
    for (const [, x2, z2] of all) if (x2 !== x || z2 !== z) assert.ok(Math.hypot(x - x2, z - z2) > 1.3, `${what} at ${x}, ${z} crowded`);
    // (the gangways' mouths stay open)
    for (const g of GANGWAYS) assert.ok(!(Math.abs(x - g) < 1 && z > Z1 - 1.2), `a ${what} in a gangway's mouth`);
  }
  // The walk between the rows stays clear: 2 or more across
  const landEdge = Math.max(...LAND_TREES.map(([, z]) => z)) + 0.45;
  const waterEdge = Math.min(...WATER_TREES.map(([, z]) => z), BENCH_Z) - 0.45;
  assert.ok(waterEdge - landEdge >= 2, `${waterEdge - landEdge}`);
});

test('the restaurant terraces: on the river row\'s podium roofs, clear of every shaft, their tables inside, their names made up', () => {
  assert.ok(ROOF_TERRACES.length >= 3);
  assert.equal(TERRACE_NAMES.length, ROOF_TERRACES.length);
  for (const t of ROOF_TERRACES) {
    const tower = HIGHRISES.find((h) => h.id === t.tower)!;
    assert.ok(tower.block.startsWith('uptown-s'), 'the river row');
    const pod = tower.parts[0];
    assert.equal(pod.skin, 'podium');
    assert.ok(t.rect[0] >= pod.rect[0] && t.rect[2] <= pod.rect[2] && t.rect[1] >= pod.rect[1] && t.rect[3] <= pod.rect[3], 'on the podium');
    // (in front of its shafts: the river row's stand at the back of their podiums)
    for (const p of tower.parts.filter((q) => q.y0 === PODIUM.h)) assert.ok(t.rect[1] >= p.rect[3] + 0.5 || t.rect[2] <= p.rect[0] || t.rect[0] >= p.rect[2], `${t.tower}'s terrace under a shaft`);
    assert.ok(t.tables.length >= 2);
    for (const [x, z] of t.tables) assert.ok(inRect(t.rect, x - CHAIR_OFF - 0.25, z, 0) && inRect(t.rect, x + CHAIR_OFF + 0.25, z, 0), 'a table off its terrace');
  }
  for (const n of TERRACE_NAMES) assert.match(n, /^[A-Z &']+$/);
});

test('people: on the decks and the terraces, none in anything solid or in the water', () => {
  assert.ok(BOULEVARD_PEOPLE.length >= 30);
  for (const p of BOULEVARD_PEOPLE) {
    if (p.roof) {
      assert.ok(ROOF_TERRACES.some((t) => inRect(t.rect, p.x, p.z, 0.1)), `a diner off the terraces at ${p.x}, ${p.z}`);
      assert.ok(p.y > PODIUM.h && p.y < PODIUM.h + 0.5);
    } else {
      assert.ok(onEsplanade(p.x, p.z, 0.2), `someone off the decks at ${p.x}, ${p.z}`);
      assert.ok(!SOLIDS.some((s) => inRect(s, p.x, p.z)), `someone in something solid at ${p.x}, ${p.z}`);
    }
  }
});

test('the planted median: along the bank avenue\'s median through Uptown, never into a junction or the axis\'s zebra', () => {
  const bank = ROWS_Z[ROWS_Z.length - 1];
  assert.equal(MEDIAN_Z, bank.c);
  assert.ok(HEDGE.w < MEDIAN && HEDGE.h < 0.6, 'inside the median, low');
  assert.ok(MEDIAN_RUNS.length >= 5);
  for (const [a, b] of MEDIAN_RUNS) {
    assert.ok(a >= W && b <= E && b > a && b - a <= 24.01, `${a}..${b}`);
    for (const x of [...NS_X, AXIS_X]) assert.ok(b < x - LANE - 1.5 || a > x + LANE + 1.5, `a hedge into the crossing at ${x}`);
    // (and off every street crossing it)
    for (const c of PLAN.crossings.filter((q) => q.streets.includes(`ew${ROWS_Z.length - 1}`) || Math.abs(q.at[1] - bank.c) < 0.01))
      assert.ok(b < c.at[0] - 2 || a > c.at[0] + 2, `a hedge into ${c.id}`);
  }
  for (const x of MEDIAN_TREES) assert.ok(MEDIAN_RUNS.some(([a, b]) => x > a + 1 && x < b - 1));
});

test('the town car: a long black saloon inside a lane, in scale with the city\'s cars', () => {
  const s = CARS.exec;
  assert.ok(s.W <= LANE - 0.4 && s.L > CARS.sedan.L && s.L < 3.4);
  assert.ok(PAINTS.exec.every((c) => parseInt(c.slice(1, 3), 16) < 0x30), 'dark paint');
  assert.ok(Math.abs(s.cabin[1][1] - CARS.sedan.cabin[1][1]) < 0.1, 'a saloon\'s roof');
});
