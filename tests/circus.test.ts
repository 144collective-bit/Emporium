// The Circus below ground (circus.ts, docs/south-plan.md Phase 4a; the owner's calls, 2026-11-18): the sunken plaza
// inside its island and four subways out under the carriageway, each up a ramp into a clear corner between its spokes.
// The kit takes a passage at any angle the same as along x or z; the cuttings keep off every street's sidewalk, every
// solid, lamp, tree, bay, shed, path and bollard; the ground there is level; each mouth has a path on to a sidewalk;
// and you can walk down from a mouth, under the road, into the plaza and up its seats.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CEIL, CIRCUS_CUTS, CIRCUS_HOLE, CIRCUS_SOLIDS, CUTTINGS, FLOOR, ISLAND_R, MOUTHS, MOUTH_PATHS, OUTER_R, PATH_HALF, PLANTERS, PLAZA, PLAZA_LAMPS, SUBWAYS, SUBWAY, SUBWAY_WAYS, fromSidewalks, inCircusOpen, subwayOf,
} from '../src/scripts/city3d/circus';
import { DOWN, GROUND_Y, acrossOf, alongOf, floorOf, pointOf, radial, underworld, wellFloor, type Passage } from '../src/scripts/city3d/underground';
import { CIRCUS, FOOTPATHS, PATH_HALF as FOOT_HALF, SOUTH_STREETS, type Pt } from '../src/scripts/city3d/south';
import { distTo, inside } from '../src/scripts/city3d/streetfaces';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { ENDS_LAMPS, PATH_BOLLARDS } from '../src/scripts/city3d/endswood';
import { BAYS, BIKE_SHEDS, BIN_STORES, DECK_COLUMNS, YARD_TREES, bayCorners, thingCorners } from '../src/scripts/city3d/southyard';
import { DECKS, COURTS } from '../src/scripts/city3d/southblocks';
import { southLift } from '../src/scripts/city3d/southground';
import { ENDS_SPAWNS } from '../src/scripts/city3d/endsplaces';
import { LOT9_PASSAGE, TUNNEL } from '../src/scripts/city3d/lot9';
import { SLAB, UNDER, createGroundHeight } from '../src/scripts/city3d/groundheight';

/** Points over a cutting (its corners, edges and inside), `m` out past its walls */
function over(c: Pt[], m = 0): Pt[] {
  const mid: Pt = [(c[0][0] + c[2][0]) / 2, (c[0][1] + c[2][1]) / 2];
  const grow = (p: Pt): Pt => {
    const [dx, dz] = [p[0] - mid[0], p[1] - mid[1]];
    const l = Math.hypot(dx, dz) || 1;
    return [p[0] + (dx / l) * m * 1.42, p[1] + (dz / l) * m * 1.42];
  };
  const g = c.map(grow);
  const out: Pt[] = [];
  for (let i = 0; i <= 12; i++)
    for (let j = 0; j <= 4; j++) {
      const [s, t] = [i / 12, j / 4];
      const a: Pt = [g[0][0] + (g[1][0] - g[0][0]) * s, g[0][1] + (g[1][1] - g[0][1]) * s];
      const b: Pt = [g[3][0] + (g[2][0] - g[3][0]) * s, g[3][1] + (g[2][1] - g[3][1]) * s];
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  return out;
}
const inBox = (b: readonly number[], [x, z]: Pt, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;

test('the kit takes a passage at any angle, as it takes one along x or z', () => {
  // (a passage at 90 degrees runs along +z as a z one does, its across the other way)
  const p = radial('t', 10, 20, 90, { from: 1, roof0: 3, roof1: 5, rampAt: 5, to: 9, half: 1, wall: 0.2, floor: -2, ceil: -0.3, rail: 0.9 });
  const [x, z] = pointOf(p, alongOf(p, 10, 26), 0);
  assert.ok(Math.abs(x - 10) < 1e-9 && Math.abs(z - 26) < 1e-9);
  assert.ok(Math.abs(acrossOf(p, 10.5, 26) + 0.5) < 1e-9, 'across a passage at 90 degrees is -x');
  for (const deg of [0, 35, 160, 235, 300]) {
    const q = radial('t', -82, 418, deg, { from: 2, roof0: 3, roof1: 5, rampAt: 5, to: 9, half: 1, wall: 0.2, floor: -2, ceil: -0.3, rail: 0.9 });
    const a = (deg * Math.PI) / 180;
    const pt: Pt = [-82 + 6 * Math.cos(a), 418 + 6 * Math.sin(a)];
    assert.ok(Math.abs(alongOf(q, ...pt) - q.a0 - 4) < 1e-9, `${deg}: 6 out is 4 along from its end 2 out`);
    assert.ok(Math.abs(acrossOf(q, ...pt)) < 1e-9, `${deg}: on its centre line`);
    const back = pointOf(q, alongOf(q, ...pt), acrossOf(q, ...pt));
    assert.ok(Math.hypot(back[0] - pt[0], back[1] - pt[1]) < 1e-9);
  }
  // (and Lot 9's tunnel, along z, is where it always was)
  assert.equal(LOT9_PASSAGE.axis, 'z');
  assert.deepEqual(pointOf(LOT9_PASSAGE, 320, 0.5), [TUNNEL.x + 0.5, 320]);
  assert.equal(alongOf(LOT9_PASSAGE, TUNNEL.x, 320), 320);
  assert.ok(Math.abs(acrossOf(LOT9_PASSAGE, TUNNEL.x + 0.4, 320) - 0.4) < 1e-9);
});

test("the plaza sits inside the Circus's island, its seats three steps up round its edge", () => {
  assert.ok(PLAZA.x === CIRCUS.x && PLAZA.z === CIRCUS.z);
  assert.ok(PLAZA.r + PLAZA.wall < ISLAND_R - 1, 'a verge of the island left round its wall, inside the kerb');
  assert.equal(wellFloor(PLAZA, 0), FLOOR);
  assert.equal(wellFloor(PLAZA, PLAZA.tiers!.r0 - 0.01), FLOOR);
  const t = PLAZA.tiers!;
  const step = (PLAZA.r - t.r0) / t.n;
  for (let k = 1; k <= t.n; k++) assert.ok(Math.abs(wellFloor(PLAZA, t.r0 + step * (k - 0.5)) - (FLOOR + t.rise * k)) < 1e-9, `seat ${k}`);
  assert.ok(t.rise <= 0.25, 'each seat a step you can walk up');
  assert.ok(FLOOR + t.rise * t.n < GROUND_Y - 1, 'the top seat well below the street');
});

test('four subways, into the clear corners: the west and south-west corners are crossed at street level', () => {
  assert.deepEqual(Object.keys(SUBWAY_WAYS).sort(), ['ne', 'nw', 's', 'se']);
  assert.equal(SUBWAYS.length, 4);
  for (const p of SUBWAYS) {
    assert.ok(CEIL - FLOOR >= TUNNEL.ceil - TUNNEL.floor - 1e-9, `${p.id}: Lot 9's tunnel's headroom at least`);
    assert.equal(p.ramp0, p.a0, `${p.id}: opening flat into the plaza`);
    const s0 = alongOf(p, CIRCUS.x, CIRCUS.z);
    assert.ok(p.roofs[0][0] - s0 <= PLAZA.r + PLAZA.wall + 1e-9 && p.roofs[0][1] - s0 >= OUTER_R + 0.5, `${p.id}: roofed from the plaza's wall to past the sidewalk`);
    const rise = (GROUND_Y - FLOOR) / (p.a1 - p.ramp1);
    assert.ok(rise <= 0.26, `${p.id}: its ramp about one in four (${rise.toFixed(3)})`);
  }
  // (spread round: each well apart from the next, none down a spoke)
  const ways = Object.values(SUBWAY_WAYS).sort((a, b) => a - b);
  ways.forEach((w, i) => assert.ok((ways[(i + 1) % ways.length] - w + 360) % 360 >= 25, `${w}: apart from the next`));
});

test("the cuttings keep off every street's sidewalk, the Circus's too", () => {
  for (const [i, c] of CUTTINGS.entries())
    for (const p of over(c)) assert.ok(fromSidewalks(p) > 0.3, `${SUBWAYS[i].id}: ${p.map((v) => v.toFixed(1))} on a sidewalk (${fromSidewalks(p).toFixed(2)})`);
});

test('the cuttings keep off every solid, lamp, tree, parking bay, bin store, bike shed and column', () => {
  for (const [i, c] of CUTTINGS.entries()) {
    const id = SUBWAYS[i].id;
    const pts = over(c, 0.3);
    for (const b of SOLIDS) assert.ok(!pts.some((p) => inBox(b, p)), `${id}: into a solid ${b.map((v) => v.toFixed(1))}`);
    for (const [x, z] of ENDS_LAMPS) assert.ok(!inside(c, [x, z]) && distTo(c, [x, z], true) > 0.5, `${id}: a lamp at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    for (const [x, z] of YARD_TREES) assert.ok(!inside(c, [x, z]) && distTo(c, [x, z], true) > 1.2, `${id}: a tree at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    for (const b of BAYS) assert.ok(!bayCorners(b).some((p) => inside(c, p)) && !c.some((p) => inside(bayCorners(b), p)), `${id}: a parking bay`);
    for (const t of [...BIN_STORES, ...BIKE_SHEDS]) assert.ok(!thingCorners(t).some((p) => inside(c, p)) && !c.some((p) => inside(thingCorners(t), p)), `${id}: a ${t.kind}`);
    for (const p of DECK_COLUMNS) assert.ok(distTo(c, p, true) > 1, `${id}: a deck's column`);
    for (const d of DECKS) assert.ok(!c.some((p) => inside(d.poly, p)), `${id}: under a deck`);
    for (const k of COURTS) assert.ok(!c.some((p) => inside(k.poly, p)), `${id}: into a court`);
    for (const p of PATH_BOLLARDS) assert.ok(distTo(c, p, true) > 0.5, `${id}: a bollard`);
    for (const f of FOOTPATHS) assert.ok(pts.every((p) => distTo(f.pts, p) > FOOT_HALF), `${id}: across the footpath ${f.id}`);
  }
});

test('the ground is level over the plaza and the cuttings (the rolling ground eases out well before the Circus)', () => {
  for (const c of CUTTINGS) for (const [x, z] of over(c, 1)) assert.ok(Math.abs(southLift(x, z)) < 0.01, `lifted at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  for (let a = 0; a < 360; a += 15) {
    const [x, z] = [PLAZA.x + (PLAZA.r + 1) * Math.cos((a * Math.PI) / 180), PLAZA.z + (PLAZA.r + 1) * Math.sin((a * Math.PI) / 180)];
    assert.ok(Math.abs(southLift(x, z)) < 0.01);
  }
});

test("each mouth has a short paved path on to the nearest sidewalk, clear of what's solid", () => {
  assert.equal(MOUTH_PATHS.length, SUBWAYS.length);
  for (const [i, path] of MOUTH_PATHS.entries()) {
    const id = SUBWAYS[i].id;
    const [a, b] = [path[0], path.at(-1)!];
    assert.ok(Math.hypot(a[0] - MOUTHS[i][0], a[1] - MOUTHS[i][1]) < 0.5, `${id}: from its mouth`);
    const onPath = MOUTH_PATHS.some((o) => o !== path && o.length === 3 && distTo(o, b) < 0.05);
    assert.ok(Math.abs(fromSidewalks(b)) < 0.05 || onPath, `${id}: on to a sidewalk's edge, or another mouth's path`);
    let len = 0;
    for (let k = 0; k + 1 < path.length; k++) {
      const [p0, p1] = [path[k], path[k + 1]];
      len += Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      for (let t = 0; t <= 1; t += 0.05) {
        const p: Pt = [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
        for (const s of SOLIDS) assert.ok(!inBox(s, p, PATH_HALF * 0.6), `${id}: its path through a solid ${s.map((v) => v.toFixed(1))}`);
        assert.ok(!inCircusOpen(p[0], p[1], 0.05) || (k === 0 && t === 0) || (onPath && k === path.length - 2 && t === 1), `${id}: its path back into a cutting`);
      }
    }
    assert.ok(len < 19, `${id}: a short path (${len.toFixed(1)})`);
  }
});

test("the estate's arrival on the Circus's sidewalk is on firm ground, out of the cuttings", () => {
  const s = ENDS_SPAWNS.endswood;
  assert.ok(!inCircusOpen(s.x, s.z, 0.8));
});

test("the plaza's planters and lamps stand on its floor, out of the subways' way and off its seats", () => {
  for (const { at, r } of PLANTERS) {
    assert.ok(Math.hypot(at[0] - PLAZA.x, at[1] - PLAZA.z) + r < PLAZA.tiers!.r0 - 0.4, 'on the floor, a way round it before the seats');
    for (const p of SUBWAYS) assert.ok(!(Math.abs(acrossOf(p, ...at)) < p.half + r + 0.3 && alongOf(p, ...at) > p.a0 - r - 0.3), `${p.id}: a planter in its way`);
  }
  for (const at of PLAZA_LAMPS) for (const p of SUBWAYS) assert.ok(!(Math.abs(acrossOf(p, ...at)) < p.half + 0.4 && alongOf(p, ...at) > p.a0 - 0.4), `${p.id}: a lamp in its way`);
  for (const b of CIRCUS_SOLIDS.slice(0, PLANTERS.length)) assert.ok(b[4] < GROUND_Y, 'a planter down on the floor, under the street');
});

test('you walk down from a mouth, under the road, into the plaza and up its seats; the walls stop you down there', () => {
  const U = underworld(SUBWAYS, [PLAZA]);
  const p = subwayOf('ne');
  const along = (s: number): Pt => pointOf(p, s);
  // (at the mouth, street level; halfway down the ramp, halfway down; under the road, the floor only when down there)
  assert.ok(Math.abs(U.y(...along(p.a1 - 0.01), 0)! - GROUND_Y) < 0.01);
  const mid = (p.a1 + p.ramp1) / 2;
  assert.ok(Math.abs(U.y(...along(mid), 0)! - floorOf(p, mid)) < 1e-9);
  const under = (p.roofs[0][0] + p.roofs[0][1]) / 2;
  assert.equal(U.y(...along(under), 0.1), null, 'on the road over it: not its');
  assert.equal(U.y(...along(under), FLOOR), FLOOR, 'down in it: its floor');
  assert.ok(U.roofed(...along(under)));
  // (into the plaza, its floor open to the sky; up its seats away from the subways)
  assert.equal(U.y(CIRCUS.x, CIRCUS.z, FLOOR), FLOOR);
  assert.ok(!U.roofed(CIRCUS.x, CIRCUS.z));
  const seat: Pt = [CIRCUS.x + 6.9 * Math.cos(Math.PI), CIRCUS.z + 6.9 * Math.sin(Math.PI)];
  assert.ok(Math.abs(U.y(...seat, FLOOR)! - (FLOOR + 0.66)) < 1e-9, 'the top seat (west, away from every subway)');
  // (down there, the walls stop you: out of the subway's side under the road; not along it)
  assert.ok(U.wall(...pointOf(p, under, p.half + 0.2), FLOOR, 0.3));
  assert.ok(!U.wall(...along(under), FLOOR, 0.3));
  // (at street level, the cutting's edge stops you: you don't fall in; on the roof over it you walk on)
  assert.ok(U.wall(...pointOf(p, p.ramp1 + 1, p.half + 0.1), 0.15, 0.3));
  assert.ok(!U.wall(...along(under), 0.15, 0.3));
  assert.ok(FLOOR < DOWN);
});

test("the ground's hole covers the plaza and every cutting, and stays round the Circus", () => {
  for (const c of CUTTINGS) for (const p of c) assert.ok(inBox(CIRCUS_HOLE, p, -0.1), 'a cutting inside the hole');
  assert.ok(CIRCUS_HOLE[2] - CIRCUS_HOLE[0] < 2 * (SUBWAY.to + 3));
  assert.ok(Math.abs((CIRCUS_HOLE[0] + CIRCUS_HOLE[2]) / 2 - CIRCUS.x) < 1e-9);
});

test("the subways don't cross each other or the Circus's spokes' carriageways in the open", () => {
  for (const [i, c] of CUTTINGS.entries()) {
    for (const [j, d] of CUTTINGS.entries()) if (i !== j) assert.ok(!c.some((p) => inside(d, p)), 'two cuttings meet');
    for (const s of SOUTH_STREETS) assert.ok(over(c).every((p) => distTo(s.pts, p) > s.half + 0.8), `${SUBWAYS[i].id}: over ${s.name}`);
  }
  const _: Passage[] = SUBWAYS;
  assert.ok(_.every((p) => typeof p.axis === 'number'));
});

test("walked in the city (groundheight.ts): down the ramp, under the road, the plaza's floor and seats; the street over it all", () => {
  const ground = createGroundHeight({ leavesOpen: () => true });
  const p = subwayOf('nw');
  // (the slab at the mouth's top, the ramp halfway down, the floor under the road from down there, the street from up)
  const top = pointOf(p, p.a1 + 0.6);
  assert.ok(Math.abs(ground(top[0], top[1], 0.2) - SLAB) < 0.01, 'on the slab past the mouth');
  const mid = (p.ramp1 + p.a1) / 2;
  assert.ok(Math.abs(ground(...pointOf(p, mid), 0) - floorOf(p, mid)) < 1e-9, 'halfway down the ramp');
  const under = (p.roofs[0][0] + p.roofs[0][1]) / 2;
  assert.equal(ground(...pointOf(p, under), FLOOR), FLOOR, 'down in it under the road');
  assert.ok(ground(...pointOf(p, under), 0.1) > 0, 'up on the road over it');
  assert.equal(ground(CIRCUS.x, CIRCUS.z, FLOOR), FLOOR, "the plaza's floor");
  assert.ok(Math.abs(ground(CIRCUS.x - 6.9, CIRCUS.z, FLOOR + 0.5) - (FLOOR + 0.66)) < 1e-9, 'its top seat');
});

test("down there the planters and lamps stop you, as its walls do (the kit's boxes: walking's solids don't reach down there)", () => {
  for (const { at: [x, z] } of PLANTERS) {
    assert.ok(UNDER.wall(x, z, FLOOR, 0.3), 'a planter');
    assert.ok(!UNDER.wall(x, z, SLAB, 0.3) || inCircusOpen(x, z), 'nothing of it at street level');
  }
  for (const [x, z] of PLAZA_LAMPS) assert.ok(UNDER.wall(x, z, FLOOR, 0.3), 'a lamp');
  assert.ok(!UNDER.wall(CIRCUS.x, CIRCUS.z, FLOOR, 0.3), "the plaza's middle is clear");
});

test("the slabs' and junctions' holes (holes.ts) are the plaza, round its wall, and each cutting", () => {
  assert.equal(CIRCUS_CUTS.length, 1 + CUTTINGS.length);
  const [round, ...cuts] = CIRCUS_CUTS;
  for (const [x, z] of round) assert.ok(Math.hypot(x - PLAZA.x, z - PLAZA.z) >= PLAZA.r + PLAZA.wall - 1e-9);
  // (its edges outside the wall's round outside, inside the coping's reach)
  for (let i = 0; i < round.length; i++) {
    const [a, b] = [round[i], round[(i + 1) % round.length]];
    const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const d = Math.hypot(m[0] - PLAZA.x, m[1] - PLAZA.z);
    assert.ok(d >= PLAZA.r + PLAZA.wall - 1e-6 && d < PLAZA.r + PLAZA.wall + 0.1);
  }
  assert.deepEqual(cuts, CUTTINGS);
});
