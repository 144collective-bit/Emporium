// The Trenches built up (streetwall.ts, the grit's step 2): tenement street walls round the yards, never in a way in or
// against a tower; two vacant lots; lock-ups along Bottom Street and the low commercial strip by the highway; the yards'
// chain-link only where nothing's built; everything solid in SOLIDS and off the streets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BACK_CLEAR,
  EDGES,
  LOCKUP_DEPTH,
  LOWRISE,
  LOW_CARS,
  STREETWALL_SOLIDS,
  TENEMENTS,
  TRENCH_SIGNS,
  VACANT,
  WALL_DEPTH,
  built,
  carSolid,
  lowSolids,
} from '../src/scripts/city3d/streetwall';
import { AMENITIES, BAYS, COMMONS_SOLIDS, REC, amenityWay, doorWay, overlaps } from '../src/scripts/city3d/commons';
import { PROJECT_SOLIDS, THE_BLOCK, TOWERS } from '../src/scripts/city3d/projects';
import { GRIT_SOLIDS } from '../src/scripts/city3d/grit';
import { TRENCH_BLOCKS } from '../src/scripts/city3d/trenches';
import { METRO_SOLIDS } from '../src/scripts/city3d/metro';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import type { Rect } from '../src/scripts/city3d/downtown';

const blockRect = (id: string): Rect => {
  const p = TRENCH_BLOCKS.find((b) => b.id === id)!.poly;
  return [Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))];
};
const within = (r: Rect, b: Rect) => r[0] >= b[0] - 1e-6 && r[1] >= b[1] - 1e-6 && r[2] <= b[2] + 1e-6 && r[3] <= b[3] + 1e-6;
const grow = (r: Rect, m: number): Rect => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
const roads = PLAN.streets.filter((s) => s.kind !== 'alley');
/** Against its block's edge on the side it faces */
const fronting = (r: Rect, face: string, b: Rect) => (face === 'n' ? Math.abs(r[1] - b[1]) < 1e-6 : face === 's' ? Math.abs(r[3] - b[3]) < 1e-6 : face === 'w' ? Math.abs(r[0] - b[0]) < 1e-6 : Math.abs(r[2] - b[2]) < 1e-6);
const EMPORIUM_TOP = 12;

test('the street walls: tenements round the yards, shops below, fire escapes, 4 to 6 storeys, made-up names', () => {
  assert.ok(TENEMENTS.length >= 40, `${TENEMENTS.length} tenements`);
  assert.ok(new Set(TENEMENTS.map((t) => t.block)).size >= 8, 'round most of the yards');
  for (const t of TENEMENTS) {
    const blk = TRENCH_BLOCKS.find((b) => b.id === t.block)!;
    assert.equal(blk.row, 'B');
    assert.notEqual(t.block, THE_BLOCK.block);
    const b = blockRect(t.block);
    assert.ok(within(t.box, b), `${t.seed} on its yard`);
    assert.ok(fronting(t.box, t.face, b), `${t.seed} on the street front`);
    const [w, d] = t.face === 'n' || t.face === 's' ? [t.box[2] - t.box[0], t.box[3] - t.box[1]] : [t.box[3] - t.box[1], t.box[2] - t.box[0]];
    assert.ok(Math.abs(d - WALL_DEPTH) < 1e-6 && w >= 3.1 - 1e-6 && w <= 6 + 1e-6, `${t.seed} ${w.toFixed(2)} wide`);
    assert.equal(t.type, 'shop');
    assert.ok(t.escape, 'a fire escape up the front');
    assert.ok(t.floors >= 3 && t.floors <= 5, '4 to 6 storeys');
    assert.ok(t.h < EMPORIUM_TOP, 'under the Emporium');
    assert.ok(t.sign && TRENCH_SIGNS.includes(t.sign));
    assert.ok(t.solids.length >= 1);
    // Clear of the towers (light between), every way in, the amenities, the bays, the rec block
    for (const o of TOWERS.filter((q) => q.block === t.block)) {
      for (const p of o.parts) assert.ok(!overlaps(t.box, grow(p.rect, BACK_CLEAR - 0.01)), `${t.seed} against ${o.id}`);
      assert.ok(!overlaps(t.box, doorWay(o, b, 1.6)), `${t.seed} in ${o.id}'s way in`);
    }
    for (const a of AMENITIES.filter((q) => q.block === t.block)) assert.ok(!overlaps(t.box, amenityWay(a, 1.3)) && !overlaps(t.box, a.rect), `${t.seed} in ${a.id}'s way`);
    for (const y of BAYS.filter((q) => q.block === t.block)) assert.ok(!overlaps(t.box, y.rect), `${t.seed} on ${y.id}`);
    if (t.block === REC.block) for (const r of [REC.centre, REC.laundry, REC.pavilion, REC.path]) assert.ok(!overlaps(t.box, r));
  }
  for (const a of TENEMENTS) for (const c of TENEMENTS) if (a !== c) assert.ok(!overlaps(a.box, c.box), 'shoulder to shoulder, never on top');
  // Their storeys vary
  assert.equal(new Set(TENEMENTS.map((t) => t.floors)).size, 3);
});

test('two vacant lots in the walls, a building either side', () => {
  assert.equal(VACANT.length, 2);
  assert.notEqual(VACANT[0].block, VACANT[1].block);
  for (const v of VACANT) {
    const b = blockRect(v.block);
    assert.ok(within(v.rect, b) && fronting(v.rect, v.face, b));
    const alongX = v.face === 'n' || v.face === 's';
    const sides = TENEMENTS.filter((t) => t.block === v.block && t.face === v.face && (alongX ? Math.abs(t.box[2] - v.rect[0]) < 1e-6 || Math.abs(t.box[0] - v.rect[2]) < 1e-6 : Math.abs(t.box[3] - v.rect[1]) < 1e-6 || Math.abs(t.box[1] - v.rect[3]) < 1e-6));
    assert.equal(sides.length, 2, `${v.id} between two tenements`);
    for (const t of TENEMENTS) assert.ok(!overlaps(t.box, v.rect));
  }
});

test('low commercial: lock-ups on Bottom Street, and the strip by the highway', () => {
  const kinds = new Set(LOWRISE.map((l) => l.kind));
  for (const k of ['lockups', 'auto', 'tyres', 'carwash', 'scrap', 'body', 'warehouse']) assert.ok(kinds.has(k as never), `a ${k}`);
  const strip = TRENCH_BLOCKS.find((b) => b.row === 'W')!;
  assert.ok(LOWRISE.filter((l) => l.block === strip.id).length >= 7);
  for (const l of LOWRISE) {
    const b = blockRect(l.block);
    assert.ok(within(l.rect, b) && fronting(l.rect, l.face, b), `${l.id} on its block, on the street`);
    if (l.block !== strip.id) {
      assert.ok(l.kind === 'lockups' && l.face === 's' && l.block.startsWith('trench-b2-'), `${l.id}: lock-ups along Bottom Street`);
      assert.ok(Math.abs(Math.abs(l.rect[3] - l.rect[1]) - LOCKUP_DEPTH) < 1e-6);
    } else assert.equal(l.face, 'e', 'facing West Street');
    assert.ok(within(l.body, l.rect), `${l.id}'s building on its lot`);
    for (const s of lowSolids(l)) assert.ok(within([s[0], s[1], s[2], s[3]], l.rect), `${l.id}'s solid on its lot`);
    assert.ok(l.h < 4, 'low');
    for (const o of LOWRISE) if (o !== l) assert.ok(!overlaps(o.rect, l.rect), 'lots apart');
    for (const t of TOWERS.filter((q) => q.block === l.block)) {
      assert.ok(!overlaps(l.rect, doorWay(t, b, 1.6)), `${l.id} in ${t.id}'s way in`);
      for (const p of t.parts) assert.ok(!overlaps(l.rect, p.rect));
    }
  }
  // The cars on the aprons and in the car wash, clear of the buildings
  assert.ok(LOW_CARS.length >= 4);
  for (const c of LOW_CARS) {
    const s = carSolid(c);
    const lot = LOWRISE.find((l) => within([s[0], s[1], s[2], s[3]], l.rect));
    assert.ok(lot, 'a car on its lot');
    for (const k of lowSolids(lot!)) assert.ok(!overlaps([s[0], s[1], s[2], s[3]], [k[0], k[1], k[2], k[3]]), `a car in ${lot!.id}'s ${k.join()}`);
  }
});

test('the chain-link only where nothing\'s built; every tower still reached', () => {
  for (const e of EDGES) {
    const r: Rect = [Math.min(e.a[0], e.c[0]) - 0.05, Math.min(e.a[1], e.c[1]) - 0.05, Math.max(e.a[0], e.c[0]) + 0.05, Math.max(e.a[1], e.c[1]) + 0.05];
    for (const k of built(e.block)) assert.ok(!overlaps(r, k), `chain-link through a building on ${e.block}`);
  }
  for (const t of TOWERS) {
    if (t.block === THE_BLOCK.block) continue;
    const way = doorWay(t, blockRect(t.block), 1.2);
    for (const s of STREETWALL_SOLIDS) assert.ok(!overlaps(way, [s[0], s[1], s[2], s[3]]), `${t.id}'s way in blocked by ${s.join()}`);
  }
});

test("what's solid is in SOLIDS, off the streets, clear of everything else", () => {
  const others = [...PROJECT_SOLIDS, ...COMMONS_SOLIDS, ...GRIT_SOLIDS, ...METRO_SOLIDS];
  for (const s of STREETWALL_SOLIDS) {
    assert.ok(SOLIDS.includes(s) && s[0] < s[2] && s[1] < s[3] && s[4] > 0);
    for (const p of [
      [s[0], s[1]],
      [s[2], s[3]],
    ] as [number, number][])
      for (const r of roads) assert.ok(distToStreet(r, p) > r.half - 1e-6, `${s.join()} on ${r.id}`);
    for (const o of others) assert.ok(!overlaps([s[0], s[1], s[2], s[3]], [o[0], o[1], o[2], o[3]]), `${s.join()} in ${o.join()}`);
  }
});
