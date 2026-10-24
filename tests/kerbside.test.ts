// Uptown's kerbside (uptown.ts LAYBYS, kerbside.ts, docs/finance-plan.md Phase 5): the lay-bys cut into the blocks
// off the streets' kerbs, the cars parked in them the traffic's way and clear of its lanes, the porte-cochères' towers
// behind the valets' bays, the service alleys between towers (bollards a walker passes and no car does, a dumpster
// leaving the way open) and the monument on the circle's island.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CIRCLE, ISLAND_R, LAYBYS, UPTOWN_BLOCKS, laybyRect } from '../src/scripts/city3d/uptown';
import { ALLEY_BOLLARDS, ALLEY_DUMPSTERS, BOLLARD_R, CAR_HALF, KERBSIDE_SOLIDS, LAYBY_CARS, MONUMENT, SERVICE_ALLEYS, TAXI_YELLOW } from '../src/scripts/city3d/kerbside';
import { HIGHRISES } from '../src/scripts/city3d/highrise';
import { PLAN, type Street } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { CARS } from '../src/scripts/city3d/cars';
import { WALK_W } from '../src/scripts/city3d/layout';

type Pt = [number, number];
const inRect = (r: readonly number[], p: Pt, m = 0) => p[0] > r[0] + m && p[0] < r[2] - m && p[1] > r[1] + m && p[1] < r[3] - m;
const overlap = (a: readonly number[], b: readonly number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
function distToStreet(s: Street, p: Pt) {
  let best = Infinity;
  for (let i = 1; i < s.pts.length; i++) {
    const [a, b] = [s.pts[i - 1], s.pts[i]];
    const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / (vx * vx + vz * vz || 1)));
    best = Math.min(best, Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t));
  }
  return best;
}
/** Is a point inside an outline */
function inPoly(poly: Pt[], p: Pt) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [u, v] = [poly[i], poly[j]];
    if (u[1] > p[1] !== v[1] > p[1] && p[0] < ((v[0] - u[0]) * (p[1] - u[1])) / (v[1] - u[1]) + u[0]) inside = !inside;
  }
  return inside;
}

test('the lay-bys: every kind, cut into their blocks off a street\'s kerb, their asphalt meeting the street\'s, clear of the towers', () => {
  assert.deepEqual([...new Set(LAYBYS.map((l) => l.kind))].sort(), ['loading', 'parking', 'taxi', 'valet']);
  for (const l of LAYBYS) {
    const r = laybyRect(l);
    const blk = UPTOWN_BLOCKS.find((b) => b.id === l.block)!;
    // Its asphalt off the block (the block's outline goes round behind it, its sidewalk with it)
    for (let k = 0; k < 40; k++) {
      const p: Pt = [r[0] + ((k % 8) + 0.5) * ((r[2] - r[0]) / 8), r[1] + (Math.floor(k / 8) + 0.5) * ((r[3] - r[1]) / 5)];
      assert.ok(!inPoly(blk.poly, p), `${l.id}'s asphalt on its block at ${p}`);
      for (const s of PLAN.streets) if (s.kind !== 'alley') assert.ok(distToStreet(s, p) > s.half - 1e-6 || s.id.startsWith('uptown-') || s.id.startsWith('ew'), `${l.id} on ${s.id}`);
    }
    // Opening off a street: its open side on the street's asphalt edge
    const open: Pt = l.side === 'e' ? [r[2], (r[1] + r[3]) / 2] : l.side === 'w' ? [r[0], (r[1] + r[3]) / 2] : l.side === 's' ? [(r[0] + r[2]) / 2, r[3]] : [(r[0] + r[2]) / 2, r[1]];
    assert.ok(PLAN.streets.some((s) => s.kind !== 'alley' && Math.abs(distToStreet(s, open) - s.half) < 0.05), `${l.id} opens off a street`);
    assert.ok(l.depth >= 1.9 && l.depth <= 2.4, 'a car\'s width and a bit');
    for (const t of HIGHRISES) assert.ok(!overlap(r, t.lot), `${l.id} under ${t.id}`);
    // The sidewalk still runs round behind it
    const behind: Pt = l.side === 'e' ? [r[0] - WALK_W - 0.3, (r[1] + r[3]) / 2] : l.side === 'w' ? [r[2] + WALK_W + 0.3, (r[1] + r[3]) / 2] : l.side === 's' ? [(r[0] + r[2]) / 2, r[1] - WALK_W - 0.3] : [(r[0] + r[2]) / 2, r[3] + WALK_W + 0.3];
    assert.ok(inPoly(blk.poly, behind), `${l.id}: the block behind it`);
  }
});

test('the cars in them: inside their bays, the traffic\'s way, clear of its lanes; taxis at the rank, saloons at the valets, a van at the loading bay', () => {
  for (const { layby, car: [model, x, z, yaw, paint] } of LAYBY_CARS) {
    const l = LAYBYS.find((q) => q.id === layby)!;
    const r = laybyRect(l);
    const along = Math.abs(Math.cos(yaw)) > 0.5;
    assert.equal(along, l.side === 'n' || l.side === 's', `${layby}: parked along its bay`);
    const [hx, hz] = along ? [CAR_HALF.l, CAR_HALF.w] : [CAR_HALF.w, CAR_HALF.l];
    assert.ok(x - hx >= r[0] - 1e-6 && x + hx <= r[2] + 1e-6 && z - hz >= r[1] - 1e-6 && z + hz <= r[3] + 1e-6, `${layby}: a car out of its bay at ${x}, ${z}`);
    assert.ok(model in CARS, model);
    // Nothing of it in a traffic lane: its footprint past every street's asphalt
    for (const s of PLAN.streets) if (s.kind !== 'alley') for (const c of [[x - hx, z - hz], [x + hx, z - hz], [x - hx, z + hz], [x + hx, z + hz]] as Pt[]) assert.ok(distToStreet(s, c) >= s.half - 0.02, `${layby}: a car in ${s.id}`);
    if (l.kind === 'taxi') assert.equal(paint, TAXI_YELLOW);
    if (l.kind === 'loading') assert.equal(model, 'van');
    if (l.kind === 'valet') assert.ok(['exec', 'super', 'coupe'].includes(model));
  }
  for (const kind of ['parking', 'taxi', 'valet', 'loading']) assert.ok(LAYBY_CARS.some((c) => LAYBYS.find((l) => l.id === c.layby)!.kind === kind), `a car at the ${kind} bays`);
  // Apart from each other
  for (const [i, a] of LAYBY_CARS.entries()) for (const b of LAYBY_CARS.slice(i + 1)) assert.ok(Math.hypot(a.car[1] - b.car[1], a.car[2] - b.car[2]) > CAR_HALF.l * 2, 'two cars in one space');
});

test('the porte-cochères: a lobby behind every valets\' bay', () => {
  for (const l of LAYBYS.filter((q) => q.kind === 'valet')) {
    const towers = HIGHRISES.filter((t) => t.block === l.block && t.door[0] > l.from && t.door[0] < l.to);
    assert.ok(towers.length >= 1, `${l.id} at a lobby`);
    for (const t of towers) assert.equal(t.front, l.side, `${t.id}'s lobby faces the bay`);
  }
});

test('the service alleys: between two towers, through the block, bollards a walker passes and no car does, the dumpster leaving the way open', () => {
  assert.ok(SERVICE_ALLEYS.length >= 5);
  for (const a of SERVICE_ALLEYS) {
    const [t0, t1] = a.towers.map((id) => HIGHRISES.find((t) => t.id === id)!);
    assert.ok(t0.lot[2] <= a.rect[0] + 1e-6 && t1.lot[0] >= a.rect[2] - 1e-6, `${a.id} between its towers`);
    assert.ok(a.rect[2] - a.rect[0] >= 1.5);
    for (const t of HIGHRISES) assert.ok(!overlap(a.rect, t.lot) || a.towers.includes(t.id), `${t.id} in ${a.id}`);
    // Through the block: its ends on the block's edges (its sidewalks), the lay-bys cut in
    for (const z of [a.rect[1] - 0.3, a.rect[3] + 0.3]) assert.ok(!inPoly(UPTOWN_BLOCKS.find((b) => b.id === a.block)!.poly, [(a.rect[0] + a.rect[2]) / 2, z]), `${a.id} through to the street at ${z}`);
  }
  // Two bollards at each mouth: the gap between them a walker's width, not a car's
  for (let i = 0; i < ALLEY_BOLLARDS.length; i += 2) {
    const gap = Math.abs(ALLEY_BOLLARDS[i + 1][0] - ALLEY_BOLLARDS[i][0]) - BOLLARD_R * 2;
    assert.ok(gap > 0.32 * 2 + 0.1 && gap < Math.min(...Object.values(CARS).map((c) => c.W)), `a mouth ${gap.toFixed(2)} wide`);
  }
  // The dumpsters against a podium, the rest of the way open (a walker's width and more)
  ALLEY_DUMPSTERS.forEach((d, i) => {
    const a = SERVICE_ALLEYS[i];
    const pod1 = HIGHRISES.find((t) => t.id === a.towers[1])!.parts[0].rect;
    assert.ok(pod1[0] - d[2] > 1.2, `${a.id}'s way past the dumpster`);
  });
});

test('the monument: on the circle\'s island, under the Emporium, its plinth solid', () => {
  assert.deepEqual([MONUMENT.x, MONUMENT.z], [CIRCLE.x, CIRCLE.z]);
  assert.ok(MONUMENT.plinth[0][0] * Math.SQRT2 < ISLAND_R - 0.8, 'its plinth on the island, the flowers round it');
  assert.ok(MONUMENT.column.top + MONUMENT.globe * 2 < EMPORIUM_ROOF);
  assert.ok(SOLIDS.some((b) => inRect(b, [CIRCLE.x, CIRCLE.z]) && b[4] >= MONUMENT.column.top - 1e-6));
});

test('what\'s solid is in SOLIDS', () => {
  for (const b of KERBSIDE_SOLIDS) assert.ok(SOLIDS.includes(b));
  assert.equal(KERBSIDE_SOLIDS.length, LAYBY_CARS.length + ALLEY_BOLLARDS.length + ALLEY_DUMPSTERS.length + 1);
});
