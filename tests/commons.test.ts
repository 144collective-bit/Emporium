// The Trenches' communal areas (commons.ts, the redesign's step B): every block of the projects its own mix of
// amenities on the open lawn, clear of the towers and the ways in; the rec block; parking bays behind the sidewalk with
// cars in them; railings and hedges open at every way in; hydrants on the sidewalk; what's solid; who's out there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AMENITIES,
  AMENITY_SIZE,
  BAYS,
  BAY_CARS,
  BAY_DEPTH,
  COMMONS_SOLIDS,
  HYDRANTS,
  MIX,
  REC,
  REC_DOORS,
  SPACE,
  amenitySolids,
  amenityWay,
  commonsPeople,
  doorWay,
  overlaps,
  towerRects,
} from '../src/scripts/city3d/commons';
import { TOWERS, THE_BLOCK } from '../src/scripts/city3d/projects';
import { EDGES } from '../src/scripts/city3d/streetwall';
import { TRENCH_BLOCKS } from '../src/scripts/city3d/trenches';
import { PLAN, distToStreet, inPoly, outset } from '../src/scripts/city3d/streetplan';
import { WALK_W } from '../src/scripts/city3d/layout';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { METRO_SOLIDS } from '../src/scripts/city3d/metro';
import type { Pt, Rect } from '../src/scripts/city3d/downtown';

const blockRect = (id: string): Rect => {
  const p = TRENCH_BLOCKS.find((b) => b.id === id)!.poly;
  return [Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))];
};
const within = (r: Rect, b: Rect, m = 0) => r[0] >= b[0] + m - 1e-6 && r[1] >= b[1] + m - 1e-6 && r[2] <= b[2] - m + 1e-6 && r[3] <= b[3] - m + 1e-6;
const roads = PLAN.streets.filter((s) => s.kind !== 'alley');

test('the amenities: every block its whole mix, no two blocks alike, on the open lawn', () => {
  for (const [block, mix] of Object.entries(MIX)) {
    const got = AMENITIES.filter((a) => a.block === block);
    assert.deepEqual(
      got.map((a) => a.kind),
      mix,
      `${block} gets all of its mix`
    );
  }
  assert.equal(new Set(Object.values(MIX).map((m) => [...m].sort().join())).size, Object.keys(MIX).length, 'no two blocks alike');
  for (const kind of Object.keys(AMENITY_SIZE)) assert.ok(AMENITIES.some((a) => a.kind === kind), `a ${kind} somewhere`);
  for (const a of AMENITIES) {
    const b = blockRect(a.block);
    assert.ok(within(a.rect, b, 1.2), `${a.id} on its lawn`);
    const towers = TOWERS.filter((t) => t.block === a.block);
    for (const t of towers) {
      for (const r of towerRects(t)) assert.ok(!overlaps(a.rect, [r[0] - 1.2, r[1] - 1.2, r[2] + 1.2, r[3] + 1.2]), `${a.id} clear of ${t.id}`);
      assert.ok(!overlaps(a.rect, doorWay(t, b)), `${a.id} clear of ${t.id}'s way in`);
    }
    for (const o of AMENITIES) if (o !== a && o.block === a.block) assert.ok(!overlaps(a.rect, o.rect), `${a.id} clear of ${o.id}`);
    // Its way out to the edge crosses no tower
    for (const t of towers) for (const r of towerRects(t)) assert.ok(!overlaps(amenityWay(a), r), `${a.id}'s way out past ${t.id}`);
    // Fenced ones have a gate on the side they open to, on that way out
    const way = amenityWay(a, 0.6);
    for (const s of amenitySolids(a)) assert.ok(!overlaps(way, [s[0], s[1], s[2], s[3]]), `${a.id}'s gate`);
  }
  assert.ok(!AMENITIES.some((a) => a.block === THE_BLOCK.block || a.block === REC.block));
});

test('the rec block: the rec centre, the laundromat and the pavilion on it, their doors on the path', () => {
  const b = REC.rect;
  for (const r of [REC.centre, REC.laundry, REC.pavilion]) {
    assert.ok(within(r, b, 1.5));
    assert.ok(!overlaps(r, REC.path));
  }
  assert.ok(!overlaps(REC.centre, REC.laundry) && !overlaps(REC.centre, REC.pavilion) && !overlaps(REC.laundry, REC.pavilion));
  for (const d of Object.values(REC_DOORS)) {
    assert.ok(![REC.centre, REC.laundry].some((r) => d.x > r[0] && d.x < r[2] && d.z > r[1] && d.z < r[3]), 'a door outside its building');
    assert.ok(!SOLIDS.some((s) => d.x > s[0] - 0.3 && d.x < s[2] + 0.3 && d.z > s[1] - 0.3 && d.z < s[3] + 0.3), 'a door clear');
  }
  assert.ok(!TOWERS.some((t) => t.block === REC.block), 'its towers are gone');
});

test('parking bays: behind the sidewalk on the projects\' blocks, clear of every way in, cars inside them', () => {
  assert.ok(BAYS.length >= 15);
  for (const y of BAYS) {
    const b = blockRect(y.block);
    assert.ok(within(y.rect, b), `${y.id} on its block`);
    const alongX = y.face === 'n' || y.face === 's';
    const [len, dep] = alongX ? [y.rect[2] - y.rect[0], y.rect[3] - y.rect[1]] : [y.rect[3] - y.rect[1], y.rect[2] - y.rect[0]];
    assert.ok(Math.abs(dep - BAY_DEPTH) < 1e-6 && Math.abs(len / SPACE - Math.round(len / SPACE)) < 1e-6 && len >= 2 * SPACE);
    // Against its block's edge, the street just past the sidewalk
    const edge = y.face === 'n' ? y.rect[1] === b[1] : y.face === 's' ? y.rect[3] === b[3] : y.face === 'w' ? y.rect[0] === b[0] : y.rect[2] === b[2];
    assert.ok(edge, `${y.id} at the edge`);
    for (const t of TOWERS.filter((o) => o.block === y.block)) {
      assert.ok(!overlaps(y.rect, doorWay(t, b)), `${y.id} clear of ${t.id}'s way in`);
      for (const r of towerRects(t)) assert.ok(!overlaps(y.rect, r));
    }
    for (const a of AMENITIES.filter((o) => o.block === y.block)) assert.ok(!overlaps(y.rect, amenityWay(a)) && !overlaps(y.rect, a.rect), `${y.id} clear of ${a.id}`);
    assert.notEqual(y.block, THE_BLOCK.block);
  }
  assert.ok(BAY_CARS.length >= 20);
  for (const { bay, car } of BAY_CARS) {
    const y = BAYS.find((o) => o.id === bay)!;
    assert.ok(car[1] > y.rect[0] && car[1] < y.rect[2] && car[2] > y.rect[1] && car[2] < y.rect[3]);
  }
});

test('railings and hedges: inside the lawns, open at every way in; hydrants on the sidewalk', () => {
  assert.ok(EDGES.length > 40);
  for (const e of EDGES) {
    const b = blockRect(e.block);
    const r: Rect = [Math.min(e.a[0], e.c[0]), Math.min(e.a[1], e.c[1]), Math.max(e.a[0], e.c[0]), Math.max(e.a[1], e.c[1])];
    assert.ok(within(r, b), 'inside its block');
    const thin: Rect = [r[0] - 0.02, r[1] - 0.02, r[2] + 0.02, r[3] + 0.02];
    for (const t of TOWERS.filter((o) => o.block === e.block)) assert.ok(!overlaps(thin, doorWay(t, b, 1.2)), `a railing across ${t.id}'s way in`);
    for (const a of AMENITIES.filter((o) => o.block === e.block)) assert.ok(!overlaps(thin, amenityWay(a, 0.8)), `a railing across ${a.id}'s way out`);
  }
  for (const [x, z] of HYDRANTS) {
    const blk = TRENCH_BLOCKS.find((b) => inPoly(outset(b.poly, WALK_W), [x, z]));
    assert.ok(blk && !inPoly(blk.poly, [x, z]), 'on a sidewalk');
    for (const s of roads) assert.ok(distToStreet(s, [x, z]) > s.half, `off ${s.id}`);
  }
});

test('what\'s solid is in SOLIDS, off the streets and the metro; nobody stands inside it', () => {
  for (const s of COMMONS_SOLIDS) {
    assert.ok(SOLIDS.includes(s));
    assert.ok(s[0] < s[2] && s[1] < s[3] && s[4] > 0);
    for (const p of [
      [s[0], s[1]],
      [s[2], s[3]],
    ] as Pt[])
      for (const r of roads) assert.ok(distToStreet(r, p) > r.half - 1e-6, `${s.join()} on ${r.id}`);
    for (const m of METRO_SOLIDS) assert.ok(!overlaps([s[0], s[1], s[2], s[3]], [m[0], m[1], m[2], m[3]]));
  }
  for (const low of [false, true]) {
    const people = commonsPeople(low);
    assert.ok(people.length > (low ? 20 : 60));
    assert.ok(people.some((p) => p.kid) && people.some((p) => !p.kid));
    for (const p of people) {
      assert.ok(TRENCH_BLOCKS.some((b) => inPoly(b.poly, [p.x, p.z])), 'on a lawn');
      assert.ok(!SOLIDS.some((s) => p.x > s[0] - 0.15 && p.x < s[2] + 0.15 && p.z > s[1] - 0.15 && p.z < s[3] + 0.15), `nobody inside a solid at ${p.x}, ${p.z}`);
    }
  }
});
