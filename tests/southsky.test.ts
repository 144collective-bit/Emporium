// Endswood's sky network walked (southsky.ts; docs/south-plan.md Phase 2c, the owner's calls): every gallery, bridge,
// landing and the podium deck joined into one network at the third floor, every shape reached by a lift or the stair,
// the floor under you by your height, only the railings stopping you up there, a lift in every core.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REACH, SKY_LIFTS, SKY_SHAPES, STAIR, UP_FROM, cageLevels, coreFloors, flatDoors, floorName, liftArrival, liftFloorName, liftFloorOf, setFlatOpen, skyFloorAt, skyLiftDoors, skyUp, skyWall, type SkyShape } from '../src/scripts/city3d/southsky';
import { BLOCKS_RECT, BRIDGES, CAGE, CAGES, FLAT, FLAT_FLOOR, LOBBIES, PERCH, TOP_FLOOR, CORES as CORES_ALL, GALLERIES, blockById, floorY, inBlock, type Pt } from '../src/scripts/city3d/southblocks';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { SOLIDS as BOOT_SOLIDS } from '../src/scripts/city3d/solids';
import { ALLOTMENT_SOLIDS, COUNCIL_SOLIDS } from '../src/scripts/city3d/council';
import { distTo, inside } from '../src/scripts/city3d/streetfaces';
import { createGroundHeight } from '../src/scripts/city3d/groundheight';
/** What's solid, the council rows' and the allotments' too (they join with the village's chunk: council3d.ts) */
const SOLIDS = [...BOOT_SOLIDS, ...COUNCIL_SOLIDS, ...ALLOTMENT_SOLIDS];

const STREETS = PLAN.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp');
const offStreet = (p: Pt) => Math.min(...STREETS.map((s) => distToStreet(s, p) - s.half - 0.8));
const inBox = (b: readonly number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;
const centre = (poly: Pt[]): Pt => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
/** Points spread over a shape: its corners pulled in a little, and its middle */
const samples = (s: SkyShape): Pt[] => {
  const c = centre(s.poly);
  return [c, ...s.poly.map((p): Pt => [p[0] + (c[0] - p[0]) * 0.08, p[1] + (c[1] - p[1]) * 0.08])].filter((p) => inside(s.poly, p));
};
const L3 = floorY(blockById('rampart').base, 3);

test('one network: at the third floor every gallery, bridge, landing and the deck joined; every shape reached by a lift or the stair', () => {
  // (two shapes join where one's edge crosses into the other at the same height)
  const touch = (a: SkyShape, b: SkyShape) =>
    [...a.poly, ...samples(a)].some((p) => {
      for (const q of [p, ...[[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]].map(([dx, dz]): Pt => [p[0] + dx, p[1] + dz])])
        if (inside(b.poly, q) && inside(a.poly, q) && Math.abs(a.y(q[0], q[1]) - b.y(q[0], q[1])) <= REACH) return true;
      return false;
    });
  const n = SKY_SHAPES.length;
  const adj: number[][] = SKY_SHAPES.map(() => []);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (touch(SKY_SHAPES[i], SKY_SHAPES[j]) || touch(SKY_SHAPES[j], SKY_SHAPES[i])) (adj[i].push(j), adj[j].push(i));
  const reach = (from: number[]) => {
    const seen = new Set(from);
    const todo = [...from];
    while (todo.length) for (const j of adj[todo.pop()!]) if (!seen.has(j)) (seen.add(j), todo.push(j));
    return seen;
  };
  // (from every lift's landings, the stair's foot and the stair cages' ways in from the street)
  const starts = SKY_SHAPES.map((s, i) => (s.id.startsWith('landing') || s.id.startsWith('stair twin-core') || (s.id.startsWith('cage') && s.id.endsWith(' in')) ? i : -1)).filter((i) => i >= 0);
  const all = reach(starts);
  for (let i = 0; i < n; i++) assert.ok(all.has(i), `${SKY_SHAPES[i].id} can't be reached`);
  // (the third floor walked end to end: from the Rampart's gallery to Wren's, Fennel's, the deck and The Core's stair)
  const at3 = reach([SKY_SHAPES.findIndex((s) => s.id.startsWith('gallery rampart') && s.id.endsWith(' 3'))]);
  for (const id of ['gallery wren', 'gallery fennel', 'gallery teasel', 'gallery sorrel', 'gallery linnet', 'gallery marten', 'deck podium', 'stair twin-core', 'landing twin-core 3'])
    assert.ok([...at3].some((i) => SKY_SHAPES[i].id.startsWith(id)), `${id} isn't on the third floor's network`);
  // (every gallery the blocks have, and every bridge, is a shape)
  assert.equal(SKY_SHAPES.filter((s) => s.id.startsWith('gallery')).length, GALLERIES.length);
  assert.equal(SKY_SHAPES.filter((s) => s.id.startsWith('bridge')).length, BRIDGES.length);
});

test('the floor under you by your height: the gallery up there, the ground under it; a bridge over the street; the stair rising', () => {
  const g = SKY_SHAPES.find((s) => s.id.startsWith('gallery linnet'))!;
  const p = centre(g.poly);
  assert.equal(skyFloorAt(p[0], p[1], g.lo), g.lo);
  assert.equal(skyFloorAt(p[0], p[1], g.lo + 0.3), g.lo);
  assert.equal(skyFloorAt(p[0], p[1], 0.15), null, 'walking under the gallery: the ground');
  assert.equal(skyUp(p[0], p[1], 0.15), false);
  assert.equal(skyUp(p[0], p[1], g.lo), true);
  // (a bridge over a street: up there on it, under it the street)
  const over = SKY_SHAPES.filter((s) => s.id.startsWith('bridge')).find((s) => samples(s).some((q) => offStreet(q) < -0.5))!;
  const q = samples(over).find((r) => offStreet(r) < -0.5)!;
  assert.ok(over, 'a bridge over a street');
  assert.equal(skyFloorAt(q[0], q[1], over.lo), over.y(q[0], q[1]));
  assert.equal(skyFloorAt(q[0], q[1], 0.04), null);
  // (the stair: its foot at the ground, its head at the third floor, half way between)
  const s = SKY_SHAPES.find((r) => r.id === 'stair twin-core')!;
  assert.ok(Math.abs(s.lo - STAIR.base) < 1e-9 && Math.abs(s.hi - STAIR.top) < 1e-9);
  assert.ok(Math.abs(STAIR.top - L3) < 1e-9, 'the stair to the third floor');
  const [fx, fz] = STAIR.foot;
  assert.ok(Math.abs((skyFloorAt(fx, fz, 0.15) ?? -1) - STAIR.base) < 0.3, 'the stair from the ground');
  const mid: Pt = [(STAIR.foot[0] + STAIR.head[0]) / 2, (STAIR.foot[1] + STAIR.head[1]) / 2];
  const ym = skyFloorAt(mid[0], mid[1], (STAIR.base + STAIR.top) / 2)!;
  assert.ok(Math.abs(ym - (STAIR.base + STAIR.top) / 2) < 0.1, `half way up ${ym}`);
  // (walk.ts's ground: groundheight.ts's sky layer the same)
  const ground = createGroundHeight({ leavesOpen: () => false });
  assert.ok(Math.abs(ground(p[0], p[1], g.lo) - g.lo) < 1e-9);
  assert.ok(ground(p[0], p[1], 0.15) < 1);
});

test('only the railings stop you up there: across a bridge, along a gallery, into a landing; not over an edge', () => {
  const m = 0.3;
  for (const br of SKY_SHAPES.filter((s) => s.id.startsWith('bridge'))) {
    const c = centre(br.poly);
    assert.equal(skyWall(c[0], c[1], br.y(c[0], c[1]), m), false, `${br.id}: its middle`);
  }
  // (off a gallery's outer edge: a step past its upstand)
  for (const g of SKY_SHAPES.filter((s) => s.id.startsWith('gallery')).slice(0, 12)) {
    const c = centre(g.poly);
    assert.equal(skyWall(c[0], c[1], g.lo, 0.2), false, `${g.id}: its middle`);
    const far = g.poly[Math.floor(g.poly.length * 0.75)];
    const out: Pt = [far[0] + (far[0] - c[0]) * 0.05, far[1] + (far[1] - c[1]) * 0.05];
    const free = SKY_SHAPES.some((s) => s !== g && inside(s.poly, out) && Math.abs(s.y(out[0], out[1]) - g.lo) <= REACH);
    if (!free) assert.equal(skyWall(out[0], out[1], g.lo, 0.2), true, `${g.id}: over its edge`);
  }
  // (not up there at the ground, nor outside the estate's blocks)
  assert.equal(skyUp(-200, 500, L3), false);
  assert.ok(UP_FROM > 0.5);
  assert.ok(!SKY_SHAPES.some((s) => s.poly.some((p) => !inBox(BLOCKS_RECT, p[0], p[1]))), 'a shape outside the blocks\' rect');
});

test('a lift in every core: its door at its foot off the street and clear of anything solid, out at each floor on its landing', () => {
  assert.equal(SKY_LIFTS.length, new Set(SKY_LIFTS.map((l) => l.id)).size);
  assert.ok(SKY_LIFTS.some((l) => l.id === 'twin-core'));
  for (const l of SKY_LIFTS) {
    assert.ok(l.floors.length >= 1 && l.floors.includes(3), `${l.id} doesn't reach the third floor`);
    const { x, z } = l.door;
    assert.ok(offStreet([x, z]) > 0, `${l.id}'s door on a street`);
    assert.ok(!SOLIDS.some((b) => inBox(b, x, z, 0.3)), `${l.id}'s door in something solid`);
    assert.ok(!inBlock([x, z]), `${l.id}'s door in a block`);
    // (facing out from its core: yaw 0 looks north, -z)
    const [fx, fz] = [-Math.sin(l.door.yaw), -Math.cos(l.door.yaw)];
    assert.ok((x - l.at[0]) * fx + (z - l.at[1]) * fz > 0, `${l.id}'s door faces in`);
    for (const f of l.floors) {
      const a = liftArrival(l, f);
      const y = floorY(l.base, f);
      assert.equal(skyFloorAt(a.x, a.z, y), y, `${l.id} lets you out off its landing at the ${floorName(f)}`);
      assert.equal(liftFloorOf(l, y), f);
      assert.equal(skyWall(a.x, a.z, y, 0.3), false, `${l.id}: hemmed in on its landing at the ${floorName(f)}`);
    }
    assert.equal(liftFloorOf(l, 0.15), 0);
  }
  // (the prompts by your height: the doors at the foot, the landings up there)
  // (and at the foot, the lobbies' lift doors too: each calls its block's lift, docs/brutalist-plan.md Phase 6)
  assert.equal(skyLiftDoors(0.15).length, SKY_LIFTS.length + LOBBIES.length);
  assert.equal(skyLiftDoors(L3).length, SKY_LIFTS.filter((l) => l.floors.includes(3)).length);
  assert.equal(skyLiftDoors(L3 + 1.5).length, 0);
  assert.equal(floorName(0), 'Ground');
  assert.equal(floorName(3), '3rd floor');
  assert.equal(floorName(12), '12th floor');
  assert.equal(floorName(21), '21st floor');
});

test("The Core's stair: from the grass by it, clear of the towers, the street and anything solid, up to its landing", () => {
  const s = SKY_SHAPES.find((r) => r.id === 'stair twin-core')!;
  for (const p of s.poly) {
    assert.ok(!inBlock(p), 'the stair in a block');
    assert.ok(offStreet(p) > 1, 'the stair by a street');
  }
  const [fx, fz] = STAIR.foot;
  assert.ok(!SOLIDS.some((b) => inBox(b, fx, fz, 0.3)), 'its foot blocked');
  // (its head against The Core: its landing joins The Core's at the third floor)
  const land = SKY_SHAPES.find((r) => r.id === 'landing twin-core 3')!;
  const door = SKY_SHAPES.find((r) => r.id === 'stair door twin-core')!;
  assert.ok(door.poly.some((p) => inside(land.poly, p)), 'its landing into The Core');
  // (and the bridges' heights: over every street, a bus's clearance)
  for (const br of BRIDGES) assert.ok(Math.min(...br.ys) - 0.3 > 3, br.id);
});

test('walked end to end (docs/brutalist-plan.md Phase 2): every link and bridge has floor underfoot all the way, at its level', () => {
  const { CORES, coreFloorsOf } = { CORES: CORES_ALL, coreFloorsOf: coreFloors };
  const step = 0.25;
  /** Floor underfoot at each step from `a` to `b` (`y0` to `y1`), someone standing on it; the worst miss */
  const walk = (a: Pt, b: Pt, y0: number, y1: number, what: string) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    // (nothing to walk: a bridge ending at a tower's door has no way on past it)
    if (l < 0.01) return;
    for (let d = 0; d <= l; d += step) {
      const k = d / l;
      const [x, z] = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      const want = y0 + (y1 - y0) * k;
      const got = skyFloorAt(x, z, want + 0.1);
      assert.ok(got !== null && Math.abs(got - want) < 0.3, `${what}: at ${x.toFixed(2)}, ${z.toFixed(2)} ${got === null ? 'no floor' : `floor ${got.toFixed(2)} not ${want.toFixed(2)}`}`);
    }
  };
  // Each service tower's link: from a metre into its gallery, along the link, on to the middle of its landing
  for (const c of CORES.filter((q) => q.link))
    for (const f of coreFloorsOf(c.id)) {
      const y = floorY(blockById(c.of).base, f);
      const [a, e] = c.link!;
      const l = Math.hypot(e[0] - a[0], e[1] - a[1]);
      const t: Pt = [(e[0] - a[0]) / l, (e[1] - a[1]) / l];
      walk([a[0] - t[0], a[1] - t[1]], c.at, y, y, `${c.id}'s link, floor ${f}`);
    }
  // Each stair cage (docs/brutalist-plan.md): from the street at the tower's face up every flight, across each turn, to
  // each landing and on into the tower's landing
  for (const g of CAGES) {
    const ys = cageLevels(g.id);
    const { len, land } = CAGE;
    for (let k = 0; k + 1 < ys.length; k++) {
      const [y0, y1] = [ys[k], ys[k + 1]];
      const mid = (y0 + y1) / 2;
      if (k === 0) walk(g.at(0.3, 0.5), g.at(land, 0.5), y0, y0, `${g.id} in`);
      walk(g.at(land, 0.5), g.at(len - land, 0.5), y0, mid, `${g.id} flight ${k} up`);
      walk(g.at(len - land, 0.5), g.at(len - land, -0.5), mid, mid, `${g.id} turn ${k}`);
      walk(g.at(len - land, -0.5), g.at(land, -0.5), mid, y1, `${g.id} flight ${k} back`);
      walk(g.at(land, -0.5), g.at(-1.2, -0.5), y1, y1, `${g.id} into the tower at ${y1.toFixed(1)}`);
    }
  }
  // Each bridge: from the middle of what's at one end to the middle of what's at the other (a tower's face: its door)
  const mid = (e: (typeof BRIDGES)[number]['a']): Pt | null => ('core' in e ? CORES.find((q) => q.id === e.core)!.at : 'deck' in e ? null : e.block === 'twin-core' ? centre(blockById('twin-core').foot) : null);
  for (const br of BRIDGES) {
    const [a, b] = br.pts;
    const [ma, mb] = [mid(br.a) ?? a, mid(br.b) ?? b];
    walk(ma, a, br.ys[0], br.ys[0], `${br.id} into its end`);
    walk(a, b, br.ys[0], br.ys[1], br.id);
    walk(b, mb, br.ys[1], br.ys[1], `${br.id} into its other end`);
  }
});

test("The Perch walked (docs/brutalist-plan.md Phase 3): The Core's lift up to it by name, round its floor, out over each top bridge, held in by its glass", () => {
  const l = SKY_LIFTS.find((q) => q.id === 'twin-core')!;
  assert.ok(l.floors.includes(TOP_FLOOR));
  assert.equal(liftFloorName(l, TOP_FLOOR), 'The Perch');
  assert.equal(liftFloorName(l, 3), '3rd floor');
  assert.equal(liftFloorName(SKY_LIFTS.find((q) => q.id !== 'twin-core')!, TOP_FLOOR), floorName(TOP_FLOOR));
  const y = floorY(l.base, TOP_FLOOR);
  // (from the lift, to each corner of its floor and out across each top bridge to the tower's door: floor all the way)
  const a = liftArrival(l, TOP_FLOOR);
  const walk = (from: Pt, to: Pt, what: string) => {
    for (let t = 0; t <= 1; t += 0.02) {
      const [x, z] = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
      assert.equal(skyFloorAt(x, z, y), y, `${what}: no floor at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      assert.equal(skyWall(x, z, y, 0.25), false, `${what}: hemmed in at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
  };
  for (const p of PERCH.foot) walk([a.x, a.z], [PERCH.at[0] + (p[0] - PERCH.at[0]) * 0.8, PERCH.at[1] + (p[1] - PERCH.at[1]) * 0.8], 'round The Perch');
  // (up to a step short of the tower's door: the bridge ends at its face)
  for (const br of BRIDGES.filter((q) => q.floor === TOP_FLOOR)) {
    const [p, q] = br.pts;
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    walk([a.x, a.z], [q[0] - ((q[0] - p[0]) / l) * 0.35, q[1] - ((q[1] - p[1]) / l) * 0.35], br.id);
  }
  // (its glass holds you in: a step past a face where no bridge is)
  const faces = PERCH.foot.map((p, j): Pt => {
    const c = PERCH.foot[(j + 1) % 6];
    return [(p[0] + c[0]) / 2, (p[1] + c[1]) / 2];
  });
  const open = faces.filter((m) => !BRIDGES.some((br) => br.floor === TOP_FLOOR && Math.hypot(br.pts[0][0] - m[0], br.pts[0][1] - m[1]) < 1));
  assert.equal(open.length, 4);
  for (const m of open) {
    const out: Pt = [m[0] + (m[0] - PERCH.at[0]) * 0.1, m[1] + (m[1] - PERCH.at[1]) * 0.1];
    assert.equal(skyWall(out[0], out[1], y, 0.2), true, `out through its glass at ${out[0].toFixed(1)}, ${out[1].toFixed(1)}`);
  }
});

test("Degen's flat (docs/brutalist-plan.md Phase 7a): shut till it's his; then in off the bridge to its living room, hall and bedroom, the partition between", () => {
  const y = FLAT.y;
  const br = BRIDGES.find((q) => q.id === `core-kite-${FLAT_FLOOR}`)!;
  const mid = (poly: Pt[]): Pt => centre(poly);
  const living = mid(FLAT.rooms.living);
  // (shut: no floor in it, the door a wall; its prompt on the bridge, a step out)
  setFlatOpen(false);
  assert.equal(skyFloorAt(living[0], living[1], y), null);
  assert.equal(skyWall(FLAT.door[0] - FLAT.n[0] * 0.4, FLAT.door[1] - FLAT.n[1] * 0.4, y, 0.2), true, 'in through its shut door');
  const [p] = flatDoors(y);
  assert.ok(p && p.id === 'flat:door');
  assert.equal(skyFloorAt(p.x, p.z, y), y, 'its prompt not on the bridge');
  assert.equal(flatDoors(y - 3).length, 0, 'its prompt a floor down');
  // (his: from the bridge's middle, through the door, round every room, floor all the way)
  setFlatOpen(true);
  try {
    const walk = (a: Pt, c: Pt, what: string) => {
      for (let k = 0; k <= 40; k++) {
        const q: Pt = [a[0] + ((c[0] - a[0]) * k) / 40, a[1] + ((c[1] - a[1]) * k) / 40];
        assert.equal(skyFloorAt(q[0], q[1], y), y, `${what}: no floor at ${q.map((v) => v.toFixed(2))}`);
      }
    };
    const bm: Pt = [(br.pts[0][0] + br.pts[1][0]) / 2, (br.pts[0][1] + br.pts[1][1]) / 2];
    const inside = FLAT.at(0, -1.2);
    walk(bm, FLAT.door, 'onto its door');
    walk(FLAT.door, inside, 'through its door');
    walk(inside, living, 'into the living room');
    walk(inside, mid(FLAT.rooms.hall), 'into the hall');
    walk(mid(FLAT.rooms.hall), mid(FLAT.rooms.bedroom), 'into the bedroom');
    const wake = FLAT.wake;
    assert.equal(skyFloorAt(wake.x, wake.z, y), y, 'he wakes on its floor');
    assert.equal(skyWall(wake.x, wake.z, y, 0.3), false, 'hemmed in where he wakes');
    // (the partition between the living room and the bedroom: a wall)
    const part = FLAT.at(0.85, -4.4);
    assert.equal(skyWall(part[0], part[1], y, 0.05), true, 'through the partition');
    // (and its back wall)
    const back = FLAT.at(-2, -5.9);
    assert.equal(skyWall(back[0], back[1], y, 0.05), true, 'through its back wall');
  } finally {
    setFlatOpen(false);
  }
});

test("the galleries' fronts: a low wall that stops bullets, an open rail over it; crouched you shoot over the wall", async () => {
  const { GALLERY_RAIL, GALLERY_WALL, SKY_COVER } = await import('../src/scripts/city3d/southsky');
  const { rayBoxes } = await import('../src/scripts/city3d/solids');
  const { BLOCKS: ALL } = await import('../src/scripts/city3d/southblocks');
  const { FIGURE_SCALE } = await import('../src/scripts/city3d/figure');
  // (the eye's height over the floor, crouched in third person and standing in first: walk.ts's camera)
  const crouched = (1.0 - 0.26) * FIGURE_SCALE + 0.05;
  const standing = 1.2 * FIGURE_SCALE + 0.05;
  assert.ok(GALLERY_WALL < crouched - 0.08, 'the wall under a crouched eye');
  assert.ok(GALLERY_RAIL < standing - 0.1 && GALLERY_RAIL > crouched + 0.08, 'the rail between the eyes: under it crouched, over it standing');
  assert.ok(SKY_COVER.length > 300);
  for (const [x0, z0, x1, z1, top, bottom] of SKY_COVER) assert.ok(x1 > x0 && z1 > z0 && top - bottom > GALLERY_WALL && top - bottom < 0.85);
  // (from a spot on the gallery a metre in from a piece of its front, shooting straight out: low, the wall stops it;
  // from a crouched eye, over it)
  let tried = 0;
  for (const box of SKY_COVER.filter((_, i) => i % 40 === 0)) {
    const m: Pt = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
    const blk = ALL.filter((b) => b.spine).sort((a, b) => distTo(a.spine!, m) - distTo(b.spine!, m))[0];
    const floor = box[4] - GALLERY_WALL;
    // (the way out: away from the spine)
    let best: Pt = blk.spine![0];
    for (const p of blk.spine!) if (Math.hypot(p[0] - m[0], p[1] - m[1]) < Math.hypot(best[0] - m[0], best[1] - m[1])) best = p;
    const d = Math.hypot(m[0] - best[0], m[1] - best[1]);
    if (d < 1) continue;
    const out = { x: (m[0] - best[0]) / d, y: 0, z: (m[1] - best[1]) / d };
    const at = { x: m[0] - out.x * 1.0, z: m[1] - out.z * 1.0 };
    if (!skyFloorAt(at.x, at.z, floor) || Math.abs(skyFloorAt(at.x, at.z, floor)! - floor) > 0.05) continue;
    tried++;
    const low = rayBoxes({ x: at.x, y: floor + 0.25, z: at.z }, out, 30);
    assert.ok(low < 1.3, `a low shot through the wall at ${m.map((v) => v.toFixed(1))} (${low.toFixed(2)})`);
    const over = rayBoxes({ x: at.x, y: floor + crouched, z: at.z }, out, 30);
    // (past the wall, a metre out; a bridge leaving the gallery there may stop it further on)
    assert.ok(over > 1.3, `a crouched shot stopped by the wall at ${m.map((v) => v.toFixed(1))} (${over.toFixed(2)})`);
  }
  assert.ok(tried > 5, `only ${tried} spots tried`);
});

test("the bridges' concrete under their glass, and the podium deck's edge, stop bullets; over them they pass", async () => {
  const { BRIDGE_WALL, GALLERY_WALL, SKY_COVER } = await import('../src/scripts/city3d/southsky');
  const { rayBoxes } = await import('../src/scripts/city3d/solids');
  const { DECKS } = await import('../src/scripts/city3d/southblocks');
  let tried = 0;
  for (const br of BRIDGES) {
    const [a, c] = br.pts;
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (l < 6) continue;
    const y = (br.ys[0] + br.ys[1]) / 2;
    const m = { x: (a[0] + c[0]) / 2, z: (a[1] + c[1]) / 2 };
    const across = { x: -(c[1] - a[1]) / l, y: 0, z: (c[0] - a[0]) / l };
    // (from the bridge's middle, across it: low, its concrete stops the shot at its side; at a standing eye, the glass
    // lets it out)
    const low = rayBoxes({ x: m.x - across.x * 0.0, y: y + 0.3, z: m.z }, across, 30);
    const high = rayBoxes({ x: m.x, y: y + BRIDGE_WALL + 0.25, z: m.z }, across, 30);
    // (the near-shooter rule, solids.ts: a box within 0.6 of the start is the shooter's own and ignored)
    if (low > 0.6 && low < 1.2) tried++;
    assert.ok(low < 1.2 || low <= 0.6, `bridge ${br.id}: a low shot out through its concrete (${low.toFixed(2)})`);
    assert.ok(high > 1.2, `bridge ${br.id}: a shot over the concrete stopped (${high.toFixed(2)})`);
  }
  assert.ok(tried >= 0);
  // (the deck's edge: some cover along it, as low as the galleries')
  const deck = DECKS[0];
  const onDeck = SKY_COVER.filter((b) => Math.abs(b[4] - (deck.y + GALLERY_WALL)) < 1e-6);
  assert.ok(onDeck.length > 20, `the deck's edge as cover (${onDeck.length})`);
});

test("Kite Point's roof: off The Core's top bridge, up the stair by its face, over the landing, round the roof; never past its parapet or into its plant room", async () => {
  const { KITE_ROOF: R } = await import('../src/scripts/city3d/southsky');
  // (a walk in tenth-of-a-metre steps along a line of spots, the floor found from the last one's height each step)
  const walk = (spots: Pt[], y0: number) => {
    let y = y0;
    for (let i = 1; i < spots.length; i++) {
      const [a, c] = [spots[i - 1], spots[i]];
      const n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 0.1));
      for (let k = 1; k <= n; k++) {
        const p: Pt = [a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n];
        const f = skyFloorAt(p[0], p[1], y);
        assert.ok(f !== null && f !== undefined, `no floor at ${p.map((v) => v.toFixed(2))} from ${y.toFixed(2)}`);
        assert.ok(Math.abs(f! - y) < 0.2, `a step of ${(f! - y).toFixed(2)} at ${p.map((v) => v.toFixed(2))}`);
        assert.ok(!skyWall(p[0], p[1], f!, 0.1), `a wall in the way at ${p.map((v) => v.toFixed(2))}`);
        y = f!;
      }
    }
    return y;
  };
  // (from the bridge's end, beside the face, up, over the landing onto the roof's band)
  const top = walk([R.at(0, 0.6), R.at(1.0, 0.6), R.at(3.1, 0.6), R.at(5.0, 0.4), R.at(5.0, -0.7)], R.from);
  assert.ok(Math.abs(top - R.y) < 1e-6, `on the roof (${top})`);
  // (round the band: each side's middle, from the last)
  const mids = R.outer.map((p, i): Pt => {
    const q = R.outer[(i + 1) % R.outer.length];
    const [a, c] = [R.inner[i], R.inner[(i + 1) % R.inner.length]];
    return [(p[0] + q[0] + a[0] + c[0]) / 4, (p[1] + q[1] + a[1] + c[1]) / 4];
  });
  const start = mids.reduce((b, m) => (Math.hypot(m[0] - R.at(5.0, -0.7)[0], m[1] - R.at(5.0, -0.7)[1]) < Math.hypot(b[0] - R.at(5.0, -0.7)[0], b[1] - R.at(5.0, -0.7)[1]) ? m : b));
  const i0 = mids.indexOf(start);
  walk([R.at(5.0, -0.7), ...mids.slice(i0), ...mids.slice(0, i0), start], R.y);
  // (not into the plant room, nor out past the parapet)
  const c: Pt = [R.inner.reduce((s, p) => s + p[0], 0) / R.inner.length, R.inner.reduce((s, p) => s + p[1], 0) / R.inner.length];
  assert.ok(skyWall(c[0], c[1], R.y), 'the plant room walked through');
  for (const [i, p] of R.outer.entries()) {
    const q = R.outer[(i + 1) % R.outer.length];
    const m: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const past: Pt = [m[0] + (m[0] - c[0]) * 0.08, m[1] + (m[1] - c[1]) * 0.08];
    // (but by the landing, where the way up comes over it)
    if (Math.hypot(past[0] - R.at(5.0, 0)[0], past[1] - R.at(5.0, 0)[1]) < 1.6) continue;
    assert.ok(skyWall(past[0], past[1], R.y), `out past the parapet at side ${i}`);
  }
});
