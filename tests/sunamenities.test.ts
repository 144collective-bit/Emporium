// Sunridge's club, park and school (sunplaces.ts, sunamenities.ts; docs/suburb-plan.md Phase 4): on the amenities'
// block south of Mesa Drive, off every lot, street and sidewalk; each part inside its own place and off the others;
// the pools in their fenced yard, the courts in theirs; arriving on the loop's sidewalk; places in the city's lists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLUBHOUSE, CLUB_LAND, PARK_LAND, SCHOOL, SCHOOL_LAND, SUNPLACE_SOLIDS, SUN_DOORS, SUN_SPAWNS } from '../src/scripts/city3d/sunplaces';
import { AMENITY_SOLIDS, BUS_BAY, CANOPIES, CAR_PARK, COURTS, COURT_FENCE, FIELD, LAP_POOL, PARK_WALK, PLAYGROUND, POOL_YARD, RAMADA, SCHOOL_PLAY, SPLASH } from '../src/scripts/city3d/sunamenities';
import { PARKWAY_LOOP, SUN_BLOCKS, distTo, inside, type Pt, type Rect } from '../src/scripts/city3d/sunridge';
import { LOTS, outline } from '../src/scripts/city3d/sunridgelots';
import { PLACES } from '../src/scripts/city3d/places';
import { LIVE_PLACES } from '../src/scripts/city3d/live';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';

const block = SUN_BLOCKS.find((b) => b.id === 'sun-2')!;
const corners = (r: Rect): Pt[] => [
  [r[0], r[1]],
  [r[2], r[1]],
  [r[0], r[3]],
  [r[2], r[3]],
];
const within = (r: Rect, R: Rect) => r[0] >= R[0] - 1e-9 && r[1] >= R[1] - 1e-9 && r[2] <= R[2] + 1e-9 && r[3] <= R[3] + 1e-9;
const apart = (a: Rect, b: Rect) => a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1];

test("the places' land: on the amenities' block, off every lot", () => {
  for (const land of [CLUB_LAND, PARK_LAND, SCHOOL_LAND])
    for (const p of corners(land)) {
      assert.ok(inside(block.poly, p) || distTo(block.poly, p, true) < 2.5, `land off the block at ${p}`);
      for (const l of LOTS) assert.ok(!inside(outline(l), p), `land on ${l.id} at ${p}`);
    }
  assert.ok(apart(CLUB_LAND, PARK_LAND) && apart(PARK_LAND, SCHOOL_LAND));
});

test('what stands in them: each inside its place, on the block, off the lots and each other', () => {
  const parts: [string, Rect, Rect][] = [
    ['clubhouse', CLUBHOUSE.rect, CLUB_LAND],
    ['pool yard', POOL_YARD, CLUB_LAND],
    ['court fence', COURT_FENCE, CLUB_LAND],
    ['car park', CAR_PARK, CLUB_LAND],
    ['playground', PLAYGROUND, PARK_LAND],
    ['ramada', RAMADA, PARK_LAND],
    ...SCHOOL.wings.map((r, i): [string, Rect, Rect] => [`wing ${i}`, r, SCHOOL_LAND]),
    ['hall', SCHOOL.hall.rect, SCHOOL_LAND],
    ['field', FIELD, SCHOOL_LAND],
    ['school playground', SCHOOL_PLAY, SCHOOL_LAND],
    ['bus bay', BUS_BAY, SCHOOL_LAND],
  ];
  for (const [name, r, land] of parts) {
    assert.ok(within(r, land), `${name} outside its place`);
    for (const p of corners(r)) {
      assert.ok(inside(block.poly, p) && distTo(block.poly, p, true) > 0.3, `${name} off the block at ${p}`);
      for (const l of LOTS) assert.ok(!inside(outline(l), p) && distTo(outline(l), p, true) > 0.3, `${name} on ${l.id}`);
    }
  }
  for (const [i, [a, ra]] of parts.entries()) for (const [b, rb] of parts.slice(i + 1)) assert.ok(apart(ra, rb), `${a} over ${b}`);
  assert.ok(within(LAP_POOL, POOL_YARD) && within([SPLASH.x - SPLASH.r, SPLASH.z - SPLASH.r, SPLASH.x + SPLASH.r, SPLASH.z + SPLASH.r], POOL_YARD), 'the pools in their yard');
  for (const c of COURTS) assert.ok(within(c, COURT_FENCE), 'the courts in their fence');
  for (const c of CANOPIES) assert.ok(within(c, SCHOOL_LAND));
  for (const p of PARK_WALK) assert.ok(p[0] > PARK_LAND[0] && p[0] < PARK_LAND[2] && p[1] > PARK_LAND[1] && p[1] < PARK_LAND[3]);
});

test('arriving: on the loop\'s inner sidewalk in front of each, the doors in front of their buildings; all of it solid and under the Emporium', () => {
  for (const s of Object.values(SUN_SPAWNS)) {
    const d = distTo(PARKWAY_LOOP, [s.x, s.z], true);
    assert.ok(d > 1.75 && d < 2.45, `a spawn ${d.toFixed(2)} off the loop's middle`);
    assert.ok(s.z < -28);
  }
  for (const d of SUN_DOORS) assert.ok(d.z > -34 && d.z < -33, `${d.id}'s door`);
  for (const b of [...SUNPLACE_SOLIDS]) assert.ok(SOLIDS.some((t) => t.every((v, i) => v === b[i])), 'a building missing from SOLIDS');
  for (const b of [...SUNPLACE_SOLIDS, ...AMENITY_SOLIDS]) assert.ok(b[4] < EMPORIUM_ROOF - 4);
  for (const id of ['sunclub', 'sunpark', 'sunschool']) {
    assert.ok(PLACES.some((p) => p.id === id), `${id} not a place`);
    assert.ok(LIVE_PLACES.some((p) => p.id === id), `${id} not in the live settings`);
  }
});
