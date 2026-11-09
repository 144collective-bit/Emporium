// Endswood's street level (endsstreet.ts, docs/estate-plan.md Phase 4): everything on the estate's blocks, off the
// streets and sidewalks, clear of the blocks, the subways and each other; under the Emporium but the church's spire,
// which every flight clears; every way in open; the road's paint clear of the junctions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AERIAL,
  BEACONS,
  BIN_STORES,
  BOARDS,
  CCTV,
  CENTRE,
  CHURCH,
  CHURCHYARD,
  CHURCH_PARTS,
  CORNER_SHOPS,
  ENDS_TREES,
  FORECOURT_BOLLARDS,
  GREEN,
  HEADSTONES,
  HUMPS,
  JUNCTIONS,
  JUNCTION_GAP,
  LYCHGATE,
  PARADE_UNITS,
  PATHS,
  PITCH,
  PLAYGROUND,
  PUB,
  RAIL_GATES,
  SPIRE_TOP,
  STREET_SOLIDS,
  STUDIO,
  YEWS,
  ZEBRAS,
  ZEBRA_W,
  ZIGZAG,
} from '../src/scripts/city3d/endsstreet';
import { BLOCKS, BLOCK_SOLIDS, TALLEST } from '../src/scripts/city3d/endsblocks';
import { CIRCUS, CIRCUS_OUT, ENDS_LAMPS, ENDS_SOLIDS, ROAD_HALF, ROAD_Z, SUBWAY_HOLES, type Pt, type Rect } from '../src/scripts/city3d/endswood';
import { PLAN, distToStreet, inPoly } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { FLIGHTS, PERIOD, REACH, poseAt } from '../src/scripts/city3d/airfield';

const estate = PLAN.blocks.filter((b) => b.ref === 'endswood');
const overlap = (a: readonly number[], b: readonly number[], m = 0) => a[0] < b[2] + m && a[2] > b[0] - m && a[1] < b[3] + m && a[3] > b[1] - m;
const corners = (r: Rect): Pt[] => [
  [r[0], r[1]],
  [r[2], r[1]],
  [r[2], r[3]],
  [r[0], r[3]],
];
const onEstate = (p: Pt) => estate.some((e) => inPoly(e.poly, p));
const square = ([x, z]: Pt, r: number): Rect => [x - r, z - r, x + r, z + r];
/** Every footprint: the church and its tower, the churchyard, the shops, the pub, the centre, the green, the pitch, the
 * playground, the bin stores, the studio's sofa and amp */
const FEATURES: [string, Rect][] = [
  ['churchyard', CHURCHYARD],
  ...CORNER_SHOPS.map((s): [string, Rect] => [s.id, s.rect]),
  ['pub', PUB.rect],
  ['centre', CENTRE.rect],
  ['green', GREEN.rect],
  ['pitch', PITCH.rect],
  ['playground', PLAYGROUND.rect],
  ...BIN_STORES.map((r, i): [string, Rect] => [`bins ${i}`, r]),
  ['sofa', STUDIO.sofa],
  ['amp', STUDIO.amp],
];
const streets = PLAN.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp');

test("everything stands on the estate's blocks, off the streets and their sidewalks, out of the Circus", () => {
  for (const [id, r] of FEATURES)
    for (const p of corners(r)) {
      assert.ok(onEstate(p), `${id} off the estate at ${p}`);
      assert.ok(Math.hypot(p[0] - CIRCUS.x, p[1] - CIRCUS.z) > CIRCUS_OUT, `${id} in the Circus`);
      for (const s of streets) assert.ok(distToStreet(s, p) > s.half + 0.8 - 1e-6, `${id} on ${s.id}`);
    }
  for (const p of [...ENDS_TREES.map(([x, z]): Pt => [x, z]), ...CCTV.map(([x, z]): Pt => [x, z]), ...BOARDS.map((b) => b.at), ...FORECOURT_BOLLARDS]) assert.ok(onEstate(p), `${p} off the estate`);
  // (the beacons stand on the sidewalks either side of the road, off its asphalt)
  for (const [x, z] of BEACONS) assert.ok(Math.abs(z - ROAD_Z) > ROAD_HALF + 0.2 && Math.abs(z - ROAD_Z) < ROAD_HALF + 0.8, `a beacon at ${x}, ${z}`);
});

test('clear of the blocks, the subways, the lamps and each other', () => {
  for (const [id, r] of FEATURES) {
    for (const b of [...BLOCK_SOLIDS, ...ENDS_SOLIDS]) assert.ok(!overlap(r, b, 0.3), `${id} in a block at ${b}`);
    for (const h of SUBWAY_HOLES) assert.ok(!overlap(r, h, 0.5), `${id} over a subway`);
    for (const [x, z] of ENDS_LAMPS) assert.ok(!overlap(r, square([x, z], 0), 0.4), `a lamp in ${id}`);
  }
  for (let i = 0; i < FEATURES.length; i++) for (let j = i + 1; j < FEATURES.length; j++) assert.ok(!overlap(FEATURES[i][1], FEATURES[j][1], 0.4), `${FEATURES[i][0]} and ${FEATURES[j][0]}`);
  // The church inside its churchyard, the paths, yews and headstones in it
  for (const p of [...CHURCH_PARTS.map((c) => c.rect), CHURCH.tower.rect]) assert.ok(p[0] > CHURCHYARD[0] + 1 && p[1] > CHURCHYARD[1] + 1 && p[2] < CHURCHYARD[2] - 1 && p[3] < CHURCHYARD[3] - 1);
  for (const [x, z] of [...YEWS, ...HEADSTONES.map(([x, z]): Pt => [x, z])]) assert.ok(x > CHURCHYARD[0] + 0.3 && x < CHURCHYARD[2] - 0.3 && z > CHURCHYARD[1] + 0.3 && z < CHURCHYARD[3] - 0.3);
  assert.ok(HEADSTONES.length >= 30, `${HEADSTONES.length} headstones`);
  for (const [x, z] of HEADSTONES) for (const p of PATHS) assert.ok(!(x > p[0] - 0.5 && x < p[2] + 0.5 && z > p[1] - 0.5 && z < p[3] + 0.5), 'a headstone on a path');
  // The trees clear of everything solid
  for (const [x, z] of ENDS_TREES) assert.ok(!SOLIDS.some((b) => x > b[0] - 0.3 && x < b[2] + 0.3 && z > b[1] - 0.3 && z < b[3] + 0.3), `a tree in something at ${x}, ${z}`);
});

test("every way in is open: the church's doors and gates, the gates, the studio's door, the ways round the back", () => {
  const open = ([x, z]: Pt, m = 0.25) => !SOLIDS.some((b) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m);
  const door: Pt = [CHURCH.door[0], CHURCH.door[1] + 0.5];
  const side: Pt = [CHURCH.side[0] - 0.5, CHURCH.side[1]];
  const lych: Pt = [(RAIL_GATES.lych.a + RAIL_GATES.lych.b) / 2, CHURCHYARD[3]];
  const sideGate: Pt = [CHURCHYARD[0], (RAIL_GATES.side.a + RAIL_GATES.side.b) / 2];
  for (const p of [door, side, lych, sideGate]) assert.ok(open(p), `the church's way in at ${p}`);
  // (a walker under the lychgate's roof)
  assert.ok(lych[0] > LYCHGATE.x0 + 0.3 && lych[0] < LYCHGATE.x1 - 0.3 && LYCHGATE.eaves > 1.5);
  const pitchGate: Pt = [(PITCH.gate[0] + PITCH.gate[1]) / 2, PITCH.rect[3]];
  const playGate: Pt = [(PLAYGROUND.gate[0] + PLAYGROUND.gate[1]) / 2, PLAYGROUND.rect[1]];
  for (const p of [pitchGate, playGate, STUDIO.door, PUB.back, CENTRE.back, CENTRE.front]) assert.ok(open(p), `shut at ${p}`);
  for (const [side, g] of Object.entries(GREEN.gaps)) {
    if (!g) continue;
    const [x0, z0, x1, z1] = GREEN.rect;
    const mid = (g[0] + g[1]) / 2;
    const p: Pt = side === 'n' ? [mid, z0] : side === 's' ? [mid, z1] : side === 'w' ? [x0, mid] : [x1, mid];
    assert.ok(open(p, 0.2), `the green's ${side} gap`);
  }
  for (const s of CORNER_SHOPS) {
    // (each shop's door on the road: its south face's middle)
    assert.ok(open([(s.rect[0] + s.rect[2]) / 2, s.rect[3] + 0.4]), `${s.name}'s door`);
  }
  // The parade's units: seven shops and the tenants' hall, one shut
  assert.equal(PARADE_UNITS.length, 8);
  assert.equal(PARADE_UNITS.filter((u) => u.kind === 'hall').length, 1);
  assert.ok(PARADE_UNITS.some((u) => u.shut));
  for (const n of [...PARADE_UNITS.map((u) => u.name), ...CORNER_SHOPS.map((s) => s.name), PUB.name, CENTRE.name, STUDIO.name]) assert.match(n, /^[A-Z0-9 &'.]+$/, n);
  // (the parade is a block on the road, its shopfronts facing it)
  const parade = BLOCKS.find((b) => b.kind === 'parade')!;
  assert.equal(parade.shells[0].ground.n, 'shops');
});

test("under the Emporium but St Aldwyn's spire; every flight well over it", () => {
  for (const p of CHURCH_PARTS) assert.ok(p.ridge < EMPORIUM_ROOF - 0.5);
  assert.ok(CHURCH.tower.top < EMPORIUM_ROOF && CHURCH.tower.pinnacle < SPIRE_TOP);
  assert.ok(SPIRE_TOP > EMPORIUM_ROOF + 5 && SPIRE_TOP < 26, `the spire at ${SPIRE_TOP}`);
  for (const s of CORNER_SHOPS) assert.ok(s.h < TALLEST);
  assert.ok(PUB.ridge < TALLEST && CENTRE.hallH < TALLEST && AERIAL.top < EMPORIUM_ROOF - 0.3);
  // (the aerial on Harrier Point's roof)
  const harrier = BLOCKS.find((b) => b.id === 'harrier')!.shells[0];
  assert.ok(AERIAL.x > harrier.rect[0] && AERIAL.x < harrier.rect[2] && AERIAL.z > harrier.rect[1] && AERIAL.z < harrier.rect[3] && Math.abs(AERIAL.foot - harrier.y1) < 1e-6);
  for (const b of STREET_SOLIDS) assert.ok(b[4] < EMPORIUM_ROOF);
  const [x0, z0, x1, z1] = CHURCH.tower.rect;
  for (let t = 0; t < PERIOD; t += 0.25)
    for (const f of FLIGHTS) {
      const p = poseAt(f, t);
      const d = Math.hypot(Math.max(x0 - p.x, 0, p.x - x1), Math.max(z0 - p.z, 0, p.z - z1));
      if (d < REACH[f.kind] + 4) assert.ok(p.y > SPIRE_TOP + 4, `${f.id} at ${p.y.toFixed(1)} over the spire at t ${t}`);
    }
});

test("the road's crossings and humps clear of its junctions, of each other and of the Circus", () => {
  for (const x of ZEBRAS) {
    for (const j of JUNCTIONS) assert.ok(Math.abs(x - j) > JUNCTION_GAP + ZIGZAG, `a zebra at ${x} by a junction`);
    for (const [lx, lz] of ENDS_LAMPS) assert.ok(Math.hypot(lx - x, lz - ROAD_Z) > ZEBRA_W / 2 + 0.6 || Math.abs(lz - ROAD_Z) > ROAD_HALF, 'a lamp on a zebra');
  }
  for (const x of HUMPS) {
    for (const j of JUNCTIONS) assert.ok(Math.abs(x - j) > JUNCTION_GAP, `a hump at ${x} by a junction`);
    for (const z of ZEBRAS) assert.ok(Math.abs(x - z) > ZIGZAG + 1, `a hump on a zebra's zigzags`);
  }
  for (const [x, z] of BEACONS) for (const [lx, lz] of ENDS_LAMPS) assert.ok(Math.hypot(lx - x, lz - z) > 1, 'a beacon by a lamp');
  for (const b of STREET_SOLIDS) for (const s of streets) for (const p of corners([b[0], b[1], b[2], b[3]])) assert.ok(distToStreet(s, p) > s.half, `${b} in ${s.id}`);
});
