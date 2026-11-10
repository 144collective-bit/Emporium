// The civic quarter (civic.ts, docs/civic-plan.md Phase 1): the square at Westlake Park's south end on the axis, open
// to the avenue; City Hall's, the police headquarters' and the courthouse's lots round it; the walks round City Hall
// joining the park's; nothing on the lake; the park's own trees, lamps, benches and beds kept off it; one line from
// City Hall's door over the zebra and down Uptown's lane to the plaza's cross.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AXIS,
  AXIS_HALF,
  COURT,
  EDGE_XS,
  HALL,
  LOTS,
  PARK_EDGE,
  POLICE,
  SQUARE,
  SQUARE_BENCHES,
  SQUARE_LAMPS,
  SQUARE_TREES,
  inCivic,
  inSquare,
  onLot,
  type Pt,
  type Rect,
} from '../src/scripts/city3d/civic';
import { BENCHES, BIG, GATES, LOOP_OUT, MALL, PARK_LAMPS, PARK_TREES, PATHS, ZS, distToLine, inLake, inPark, onPath } from '../src/scripts/city3d/westlake';
import { MALL_BEDS, PLANTERS, WALLS, WALL } from '../src/scripts/city3d/gardens';
import { PARK_EDGE_TREES } from '../src/scripts/city3d/ringstreet';
import { AXIS_X, AXIS_ZEBRAS, UPTOWN_LANES } from '../src/scripts/city3d/uptown';
import { CENTRE } from '../src/scripts/city3d/plaza';
import { PICNICS } from '../src/scripts/city3d/parklife';
import {
  BANNER,
  BANNER_XS,
  CITYHALL_DOOR,
  CITYHALL_SOLIDS,
  CITYHALL_SPAWN,
  CITYHALL_TIP,
  CITYHALL_TOP,
  FRIEZE_H,
  STAR,
  COLUMN,
  COLUMNS,
  DOOR,
  FRONT_H,
  FRONT_RANGE,
  PODIUM_Y,
  PORTICO,
  STEPS,
  TIERS,
  TOWER_C,
  cityHallY,
} from '../src/scripts/city3d/civic';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { FLIGHTS, PERIOD, REACH, poseAt } from '../src/scripts/city3d/airfield';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { HIGHRISES } from '../src/scripts/city3d/highrise';

/** Every point of a rectangle, `step` apart */
const fill = (r: Rect, step = 0.5): Pt[] => {
  const out: Pt[] = [];
  for (let x = r[0]; x <= r[2] + 1e-9; x += step) for (let z = r[1]; z <= r[3] + 1e-9; z += step) out.push([x, z]);
  return out;
};
const path = (id: string) => PATHS.find((q) => q.id === id)!;
/** How far a point is from a path's edge */
const fromPath = (id: string, p: Pt) => distToLine(path(id).pts, p, path(id).loop) - path(id).half;
const overlap = (a: Rect, b: Rect) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
const lots = LOTS.flatMap((l) => l.rects);

test('the line: City Hall, the square, the zebra, Uptown\'s lane and the plaza\'s cross on one axis', () => {
  assert.equal(PARK_EDGE, ZS, "the square's mouth on the park's edge");
  assert.equal(AXIS, MALL.x);
  assert.equal(AXIS, AXIS_X);
  assert.equal(CENTRE[0], AXIS, "the plaza's cross on the axis");
  assert.equal(HALL.door[0], AXIS);
  assert.equal(HALL.rear[0], AXIS);
  assert.ok(Math.abs((SQUARE[0] + SQUARE[2]) / 2 - AXIS) < 1e-9, 'the square centred on it');
  for (const r of [HALL.front, HALL.back]) assert.ok(Math.abs((r[0] + r[2]) / 2 - AXIS) < 1e-9, 'City Hall centred on it');
  // The zebra over the avenue in front of the square, and Uptown's lane carrying it on to the plaza
  assert.ok(AXIS_ZEBRAS.some((z) => Math.abs(z.z - z.half - PARK_EDGE) < 1.5), 'a zebra over the avenue at the square');
  assert.ok(UPTOWN_LANES.some((l) => l[0] < AXIS && l[2] > AXIS && l[1] < CENTRE[1]), "Uptown's lane on the axis");
  assert.ok(HALL.door[1] === SQUARE[1], "City Hall's door at the square's head");
});

test('the land: on the park, the square open to the avenue, the lots round it and apart, nothing on the lake', () => {
  for (const p of fill(SQUARE)) if (p[1] < PARK_EDGE - 0.01) assert.ok(inPark(p), `the square off the park at ${p}`);
  assert.equal(SQUARE[3], PARK_EDGE, 'the square reaches the avenue');
  for (const r of lots) for (const p of fill(r)) assert.ok(inPark(p, 3), `a lot near the park's edge at ${p}`);
  // Each lot apart from the others and off the square (City Hall's front meets the square's head)
  for (let i = 0; i < lots.length; i++) {
    for (let j = i + 1; j < lots.length; j++) if (!(lots[i] === HALL.front && lots[j] === HALL.back)) assert.ok(!overlap(lots[i], lots[j]), 'lots apart');
    assert.ok(!overlap(lots[i], SQUARE), 'a lot on the square');
  }
  // Flanking it: the police west, the courthouse east, facing across it
  assert.ok(POLICE[2] < SQUARE[0] && COURT[0] > SQUARE[2]);
  assert.deepEqual(LOTS.find((l) => l.id === 'police')!.faces, [1, 0]);
  assert.deepEqual(LOTS.find((l) => l.id === 'courthouse')!.faces, [-1, 0]);
  // The lake and its loop untouched: every lot and the square well off the water and the loop
  for (const r of [SQUARE, ...lots])
    for (const p of fill(r)) {
      assert.ok(!inLake(p[0], p[1], LOOP_OUT + 2), `on the lake at ${p}`);
      assert.ok(fromPath('loop', p) > 1.5, `on the lake loop at ${p}`);
    }
});

test('the walks: the lots off every path; the Mall from City Hall\'s back door; the walks round it joining the park\'s', () => {
  // (but the Mall, which starts at City Hall's back door, and never further in)
  for (const r of lots) for (const p of fill(r)) for (const q of PATHS) if (!(q.id === 'mall' && r === HALL.back)) assert.ok(fromPath(q.id, p) > 0.8, `${q.id} on a lot at ${p}`);
  for (const p of path('mall').pts) assert.ok(p[1] <= HALL.rear[1], 'the Mall into City Hall');
  // The Mall starts at City Hall's back door, the west walk comes round to it, the way to the lake leaves it
  assert.deepEqual(path('mall').pts[0], HALL.rear);
  const w = path('civic-w').pts;
  assert.ok(inSquare(w[0]), 'the west walk from the square');
  assert.ok(fromPath('mall', w.at(-1)!) < 0, 'the west walk to the Mall');
  assert.ok(fromPath('mall', path('mall-lake').pts[0]) < 0, 'the way to the lake from the Mall');
  const e = path('civic-e').pts;
  assert.ok(inSquare(e[0]), 'the east walk from the square');
  assert.ok(fromPath('loop', e.at(-1)!) < 0, 'the east walk to the lake loop');
  // The square open to the avenue: no gate in its mouth, the park's wall broken along it
  for (const g of GATES) assert.ok(!inSquare(g.at, 1), `${g.id} in the square's mouth`);
  for (const run of WALLS) for (const p of run) assert.ok(!inSquare(p, WALL.w / 2), `the park's wall across the square at ${p}`);
  // (and it stands either side of it)
  assert.ok(WALLS.some((r) => r.some((p) => p[0] < SQUARE[0] && p[0] > SQUARE[0] - 3 && Math.abs(p[1] - ZS) < 1)));
  assert.ok(WALLS.some((r) => r.some((p) => p[0] > SQUARE[2] && p[0] < SQUARE[2] + 3 && Math.abs(p[1] - ZS) < 1)));
});

test("the park's own keep off it: trees, lamps, benches, beds, planters, the edge row and picnics", () => {
  for (const t of PARK_TREES) assert.ok(!inCivic([t.x, t.z], 2), `a park tree on the civic quarter at ${t.x}, ${t.z}`);
  for (const [x, z] of PARK_LAMPS) assert.ok(!inCivic([x, z], 0.5), `a park lamp at ${x}, ${z}`);
  for (const b of BENCHES) assert.ok(!inCivic(b.at, 0.5), `a park bench at ${b.at}`);
  for (const r of MALL_BEDS) assert.ok(!inCivic([(r[0] + r[2]) / 2, (r[1] + r[3]) / 2], 1), `a bed at ${r}`);
  for (const p of PLANTERS) assert.ok(!inCivic(p.at, p.r), `a planter at ${p.at}`);
  for (const [x, z] of PARK_EDGE_TREES) assert.ok(!inCivic([x, z], 1), `an edge tree at ${x}, ${z}`);
  for (const p of PICNICS) assert.ok(!inCivic(p.at, 3), `a picnic at ${p.at}`);
});

test("what stands on the square: on it, off the lots, the walks and each other, along its edges", () => {
  const things: Pt[] = [...SQUARE_TREES, ...SQUARE_LAMPS.map(([x, z]): Pt => [x, z]), ...SQUARE_BENCHES.map((b) => b.at)];
  for (const p of things) {
    assert.ok(inSquare(p, -0.5), `off the square at ${p}`);
    assert.ok(!onLot(p, 0.5), `on a lot at ${p}`);
    assert.ok(!onPath(p, 0.5), `on a walk at ${p}`);
    assert.ok(Math.abs(p[0] - AXIS) > AXIS_HALF + 3, `on the axis at ${p}`);
  }
  for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) assert.ok(Math.hypot(things[i][0] - things[j][0], things[i][1] - things[j][1]) > 0.9, 'apart');
  for (const [x] of SQUARE_TREES) assert.ok(EDGE_XS.includes(x));
  // Benches face the axis
  for (const b of SQUARE_BENCHES) assert.ok(Math.sign(Math.sin(b.ry)) === Math.sign(AXIS - b.at[0]), `a bench at ${b.at} facing away`);
  assert.ok(SQUARE_TREES.length >= 6 && SQUARE_LAMPS.length >= 6 && SQUARE_BENCHES.length >= 4);
  // On the park's land
  for (const p of things) assert.ok(inPark(p, 1) || BIG.length === 0);
});

test('City Hall: on its lot, up wide steps from the square, the colonnade on the podium, the door on the axis', () => {
  const inLot = (p: Pt, m = 0) => [HALL.front, HALL.back].some((r) => p[0] > r[0] - m && p[0] < r[2] + m && p[1] > r[1] - m && p[1] < r[3] + m);
  // Everything but the steps on its lot; the steps on the square's head, wide, centred on the axis
  for (const b of CITYHALL_SOLIDS) {
    const c: Pt = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
    assert.ok(inLot(c, 0.01) || inSquare(c), `a solid off its lot at ${c}`);
    for (const s of SOLIDS) if (!CITYHALL_SOLIDS.includes(s)) assert.ok(!(s[0] < b[2] && s[2] > b[0] && s[1] < b[3] && s[3] > b[1]), `something else in City Hall at ${s}`);
  }
  for (const b of CITYHALL_SOLIDS) assert.ok(SOLIDS.includes(b), 'in the city\'s solids');
  assert.ok(STEPS[2] - STEPS[0] > 20 && Math.abs((STEPS[0] + STEPS[2]) / 2 - AXIS) < 1e-9);
  assert.equal(STEPS[1], SQUARE[1]);
  // A walker climbs them as a steady slope, gentle, to the podium; the portico's floor at the podium
  for (let z = STEPS[3] - 0.01; z > STEPS[1]; z -= 0.3) {
    const y = cityHallY(AXIS, z)!;
    const y2 = cityHallY(AXIS, z - 0.3);
    if (y2 !== null) assert.ok(y2 >= y && (y2 - y) / 0.3 < 0.35, `a steep step at ${z}`);
  }
  assert.ok(Math.abs(cityHallY(AXIS, (PORTICO[1] + PORTICO[3]) / 2)! - PODIUM_Y) < 1e-9);
  assert.equal(cityHallY(AXIS, STEPS[3] + 1), null, 'nothing on the square');
  // Nothing solid on the steps' or the portico's walk but the columns, and between them room to pass
  const walkers = SOLIDS.filter((b) => !COLUMNS.some(([x, z]) => Math.abs((b[0] + b[2]) / 2 - x) < 1e-6 && Math.abs((b[1] + b[3]) / 2 - z) < 1e-6));
  for (let x = STEPS[0] + 0.5; x < STEPS[2] - 0.5; x += 0.5)
    for (let z = PORTICO[1] + 0.4; z < STEPS[3]; z += 0.5) assert.ok(!walkers.some((b) => x > b[0] && x < b[2] && z > b[1] && z < b[3]), `blocked at ${x}, ${z}`);
  for (let k = 1; k < COLUMNS.length; k++) assert.ok(COLUMNS[k][0] - COLUMNS[k - 1][0] - COLUMN.w > 1.8, 'room between the columns');
  // The door on the axis in the middle bay, its prompt on the portico, the walk-in on the square facing the steps
  const mid = COLUMNS.findIndex((c) => c[0] > AXIS);
  assert.ok(COLUMNS[mid][0] - COLUMNS[mid - 1][0] - COLUMN.w > DOOR.w, 'the door bay wider than the door');
  assert.equal(CITYHALL_DOOR.x, AXIS);
  assert.ok(CITYHALL_DOOR.z > FRONT_RANGE[3] && CITYHALL_DOOR.z < PORTICO[3] && cityHallY(CITYHALL_DOOR.x, CITYHALL_DOOR.z) === PODIUM_Y);
  assert.ok(inSquare([CITYHALL_SPAWN.x, CITYHALL_SPAWN.z], -1) && CITYHALL_SPAWN.yaw === 0 && CITYHALL_SPAWN.z > STEPS[3]);
  // The banners in the bays, none in the door's, under the portico's roof
  assert.equal(BANNER_XS.length, COLUMNS.length - 2);
  for (const x of BANNER_XS) assert.ok(Math.abs(x - AXIS) > DOOR.w / 2 + BANNER.w / 2, 'a banner over the door');
  assert.ok(BANNER.top < COLUMN.h && PODIUM_Y + COLUMN.h < FRONT_H);
  // The emblem fits the attic over the frieze, and the second tier's faces
  assert.ok(2 * STAR.door + 0.3 < FRONT_H - PODIUM_Y - COLUMN.h - FRIEZE_H);
  assert.ok(2 * STAR.tower + 0.3 < TIERS[1].top - TIERS[0].top && 2 * STAR.tower < 2 * TIERS[1].half - 1);
});

test('its tower: stepped, over the Emporium, under Uptown\'s tallest, every flight well over it', () => {
  for (let k = 1; k < TIERS.length; k++) assert.ok(TIERS[k].half < TIERS[k - 1].half && TIERS[k].top > TIERS[k - 1].top, 'each tier in and up');
  assert.ok(TIERS[0].half * 2 <= HALL.back[2] - HALL.back[0] && TOWER_C[0] === AXIS, 'on the back block, on the axis');
  assert.ok(CITYHALL_TOP > EMPORIUM_ROOF + 8 && CITYHALL_TOP < 26, `its top at ${CITYHALL_TOP}`);
  assert.ok(CITYHALL_TOP < Math.max(...HIGHRISES.map((h) => h.roof)), "under Uptown's tallest");
  const half = TIERS[0].half;
  for (let t = 0; t < PERIOD; t += 0.25)
    for (const f of FLIGHTS) {
      const p = poseAt(f, t);
      const d = Math.hypot(Math.max(TOWER_C[0] - half - p.x, 0, p.x - TOWER_C[0] - half), Math.max(TOWER_C[1] - half - p.z, 0, p.z - TOWER_C[1] - half));
      if (d < REACH[f.kind] + 4) assert.ok(p.y > CITYHALL_TIP + 4, `${f.id} at ${p.y.toFixed(1)} over City Hall at t ${t}`);
    }
});
