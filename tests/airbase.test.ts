// Northgate Air Base (docs/military-plan.md Phase 1): its land, its fence and its gates, where the plan's signed-off
// lines put them (docs/military-map.png)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AIRBASE_RECT, AIRBASE_SOLIDS, AVENUE, FENCE, FENCE_H, FENCE_RUNS, GATES, GATE_ROAD_ENDS, KEPT, LOOP_SHORT, MAIN_GATE, VISITORS, VISITORS_DRIVE, VISITOR_CENTRE, VISITOR_SPAWN, WALL_GATE, barrierOf, guardhouseOf, inAirbase, southFenceZ } from '../src/scripts/city3d/airbase';
import { CAMERAS, FLOODS, WALL_INNER } from '../src/scripts/city3d/wall';
import { RURAL, RURAL_RUNS } from '../src/scripts/city3d/rural';
import { PLAN, distToStreet, type Pt } from '../src/scripts/city3d/streetplan';
import { STADIUM_RECTS } from '../src/scripts/city3d/stadium';
import { FENCES } from '../src/scripts/city3d/ruralfence';

const inRect = (r: readonly number[], x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
const distSeg = ([px, pz]: Pt, [a, b]: [Pt, Pt]) => {
  const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (a[0] + dx * t), pz - (a[1] + dz * t));
};
const fenceDist = (p: Pt) => Math.min(...FENCE_RUNS.map((r) => distSeg(p, r)));

test('the fence: a closed line that wanders, across the whole north, inside the wall and clear of its floodlights', () => {
  // (its runs never square to each other along a side: no straight rectangle of land)
  let square = 0;
  for (let i = 0; i < FENCE.length; i++) {
    const [a, b] = [FENCE[i], FENCE[(i + 1) % FENCE.length]];
    if (a[0] === b[0] || a[1] === b[1]) square++;
  }
  // (the wall gate's yard is square to the wall: its two sides and its face; everything else slants)
  assert.ok(square <= 3, `${square} runs square to the axes`);
  // From the west wall to Crestmont's hills, north of the stadium
  assert.ok(AIRBASE_RECT[0] < -720 && AIRBASE_RECT[2] < 285 && AIRBASE_RECT[2] > 260);
  const stadiumN = Math.min(...STADIUM_RECTS.map((r) => r[1]));
  for (let x = FENCE[0][0]; x <= 262; x += 4) assert.ok(southFenceZ(x) < stadiumN - 40, `the fence at x ${x} is too near the stadium`);
  // About the size of the whole built city: a sixth of the land inside the wall
  let n = 0;
  for (let x = AIRBASE_RECT[0]; x < AIRBASE_RECT[2]; x += 2) for (let z = AIRBASE_RECT[1]; z < AIRBASE_RECT[3]; z += 2) if (inAirbase(x, z)) n += 4;
  // (on the site's own world: a wider one's wall is further off, and the wall gate's yard runs on to it)
  assert.ok(n > 400000 && (WALL_INNER[1] !== -760 || n < 430000), `${n} square tiles`);
  // Inside the wall, with grass to its foot all round (but the yard, which meets it)
  for (const p of FENCE) {
    assert.ok(p[0] > WALL_INNER[0] + 20 && p[0] < WALL_INNER[2] && p[1] >= WALL_INNER[1]);
    if (p[1] > WALL_INNER[1]) assert.ok(p[1] > WALL_INNER[1] + 20 || (p[0] >= WALL_GATE[0] - 25 && p[0] <= WALL_GATE[2] + 25), `the fence at ${p} by the wall`);
  }
  for (const f of FLOODS) assert.ok(fenceDist([f.x, f.z]) > 15 || inRect(WALL_GATE, f.x, f.z, 25), `a floodlight at ${f.x}, ${f.z} by the fence`);
});

test('the wall gate stands in a gap between the floodlights, with no camera on it, and the parade avenue reaches it', () => {
  // (on the site's own world, where the owner signed it off)
  if (WALL_INNER[1] === -760) assert.deepEqual(WALL_GATE, [-49, -758, -19, -746]);
  for (const f of FLOODS.filter((q) => q.side === 'n')) assert.ok(f.x < WALL_GATE[0] || f.x > WALL_GATE[2], `a floodlight at x ${f.x} on the gate`);
  for (const c of CAMERAS.filter((q) => q.side === 'n')) assert.ok(c.x < WALL_GATE[0] || c.x > WALL_GATE[2], `a camera at x ${c.x} on the gate`);
  assert.equal(WALL_GATE[1], WALL_INNER[1] + 2);
  // The avenue: straight north from the main gate in line with the road, then bending to the wall gate
  assert.deepEqual(AVENUE[0], [MAIN_GATE.x, MAIN_GATE.z]);
  assert.equal(AVENUE[1][0], MAIN_GATE.x);
  const end = AVENUE[AVENUE.length - 1];
  assert.ok(inRect(WALL_GATE, end[0], end[1], 0.01));
  for (let i = 1; i < AVENUE.length; i++) for (let k = 0; k <= 10; k++) {
    const [a, b] = [AVENUE[i - 1], AVENUE[i]];
    const p: Pt = [a[0] + ((b[0] - a[0]) * k) / 10, a[1] + ((b[1] - a[1]) * k) / 10];
    assert.ok(inAirbase(p[0], p[1] - 0.5) || p[1] < -735, `the avenue outside the fence at ${p}`);
  }
});

test('both country roads end at their gates: a turning loop in front of each shut gate, open toward it', () => {
  assert.equal(GATES.length, 2);
  const want: Record<string, Pt> = { 'ns0-n': [-4.5, -292], 'ns3-n': [64.5, -294] };
  for (const g of GATES) {
    // On the fence's line, on its road's line
    assert.ok(fenceDist([g.x - g.half - 0.01, g.z]) < 0.5 && fenceDist([g.x + g.half + 0.01, g.z]) < 0.5);
    const r = RURAL_RUNS.find((q) => q.id === g.road);
    assert.ok(r && r.gated && r.c === g.x, `${g.road} doesn't end at the ${g.name}`);
    assert.equal(r.to, GATE_ROAD_ENDS[g.road]);
    // Its loop where the plan put it, its far side and its fence short of the barrier
    assert.ok(Math.hypot(r.centre[0] - want[g.road][0], r.centre[1] - want[g.road][1]) < 0.5, `${g.road}'s loop at ${r.centre}`);
    assert.ok(Math.abs(r.centre[1] - (g.z + LOOP_SHORT)) < 1e-9);
    const [, bz] = barrierOf(g)[0];
    assert.ok(r.centre[1] - RURAL.turn - RURAL.half > bz + 2);
    // The loop's fence: two arcs, open to the road and to the gate
    const rings = FENCES.filter((f) => f.run === g.road && f.pts.length > 2);
    assert.equal(rings.length, 2);
    for (const f of rings) for (const p of f.pts) assert.ok(Math.abs(p[0] - g.x) > RURAL.half + 0.5, `${g.road}'s loop's fence across its way at ${p}`);
    // The guardhouse inside the fence, the barrier outside it
    const gh = guardhouseOf(g);
    assert.ok(inAirbase(gh[0], gh[1]) && inAirbase(gh[2], gh[3]));
    for (const p of barrierOf(g)) assert.ok(!inAirbase(...p));
  }
  // Nothing else of the north's country roads left past the gates: the town's pieces end where they did
  for (const id of ['ns0', 'ns3']) for (const p of PLAN.streets.find((s) => s.id === id)!.pts) assert.ok(p[1] > -250, `${id} runs on to ${p}`);
  for (const s of PLAN.streets) for (const p of s.pts) assert.ok(!inAirbase(...p), `${s.id} inside the base at ${p}`);
});

test('the fence and its shut gates are solid, too high to climb; nothing in town stands on it', () => {
  const fence = AIRBASE_SOLIDS.filter((b) => b[4] === FENCE_H);
  assert.ok(fence.length > 500);
  // (thin: a slanting run's pieces at most 0.3 wider than the fence, as Lot 9's)
  for (const b of fence) assert.ok(Math.min(b[2] - b[0], b[3] - b[1]) < 0.41 && Math.max(b[2] - b[0], b[3] - b[1]) > 0.09, `a fence box ${b}`);
  // Each gate's opening is closed (a box across it at the fence's height)
  for (const g of GATES) assert.ok(fence.some((b) => b[0] <= g.x && b[2] >= g.x && b[1] <= g.z && b[3] >= g.z), `the ${g.name} open`);
  // A walk along every country road keeps off the fence
  for (const r of RURAL_RUNS) for (let v = Math.min(r.from, r.to); v <= Math.max(r.from, r.to); v += 2) {
    const p: Pt = r.axis === 'x' ? [v, r.c] : [r.c, v];
    assert.ok(fenceDist(p) > RURAL.half + 1, `${r.id} on the fence at ${p}`);
  }
  for (const s of PLAN.streets.filter((q) => q.kind !== 'rural')) for (const p of s.pts) assert.ok(fenceDist(p) > s.half + 1, `${s.id} on the fence at ${p}`);
});

test("the visitors' car park and centre outside the main gate, off the road, clear of the stadium's car park", () => {
  for (const r of [VISITORS, VISITOR_CENTRE, VISITORS_DRIVE]) for (const [x, z] of [[r[0], r[1]], [r[2], r[3]], [r[0], r[3]], [r[2], r[1]]] as Pt[]) assert.ok(!inAirbase(x, z) && fenceDist([x, z]) > 5);
  assert.ok(inRect(VISITORS, VISITOR_CENTRE[0], VISITOR_CENTRE[1], 0.01) && inRect(VISITORS, VISITOR_CENTRE[2], VISITOR_CENTRE[3], 0.01));
  // (the stadium's car park's loop reaches z -251)
  assert.ok(VISITORS[3] < -255);
  for (const s of PLAN.streets) for (let x = VISITORS[0]; x <= VISITORS[2]; x += 2) for (let z = VISITORS[1]; z <= VISITORS[3]; z += 2) assert.ok(distToStreet(s, [x, z]) > s.half, `${s.id} through the car park at ${x}, ${z}`);
  // Its drive meets the north avenue's road, south of its loop
  const ns0n = PLAN.streets.find((s) => s.id === 'ns0-n')!;
  assert.ok(distToStreet(ns0n, [VISITORS_DRIVE[2] + 0.1, (VISITORS_DRIVE[1] + VISITORS_DRIVE[3]) / 2]) < ns0n.half + 0.1);
  assert.ok(!inRect(VISITOR_CENTRE, VISITOR_SPAWN.x, VISITOR_SPAWN.z, 0.5) && inRect(VISITORS, VISITOR_SPAWN.x, VISITOR_SPAWN.z));
});

test('the lots kept for the airfield and the base are inside the fence', () => {
  for (const k of KEPT) for (const [x, z] of [[k.rect[0], k.rect[1]], [k.rect[2], k.rect[3]], [k.rect[0], k.rect[3]], [k.rect[2], k.rect[1]]] as Pt[]) assert.ok(inAirbase(x, z), `${k.id} outside at ${x}, ${z}`);
});

test("the airfield (Phase 2): the runway, taxiways, apron and buildings inside the fence, clear of each other, under the Emporium", async () => {
  const { APPROACH, APRON, APRON_ROAD, CONNECTORS, FIRE_STATION, FUEL_FARM, HANGARS, HANGAR_H, NORTH_LINKS, NORTH_TAXI, RUNWAY, SHELTER, SHELTERS, TAXIWAY, TOWER, TOWER_TOP } = ({ ...(await import('../src/scripts/city3d/airbase')), ...(await import('../src/scripts/city3d/airbasedress')) });
  const corners = (r: readonly number[]): Pt[] => [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
  const runway = [RUNWAY.x0, RUNWAY.z - RUNWAY.half, RUNWAY.x1, RUNWAY.z + RUNWAY.half];
  const taxi = [TAXIWAY.x0, TAXIWAY.z - TAXIWAY.half, TAXIWAY.x1, TAXIWAY.z + TAXIWAY.half];
  const north = [NORTH_TAXI.x0, NORTH_TAXI.z - NORTH_TAXI.half, NORTH_TAXI.x1, NORTH_TAXI.z + NORTH_TAXI.half];
  const shelters = SHELTERS.map(([x, z]) => [x - SHELTER.w / 2, z - SHELTER.d, x + SHELTER.w / 2, z]);
  const parts: [string, readonly number[]][] = [['runway', runway], ['taxiway', taxi], ['north taxiway', north], ['apron', APRON], ['fire station', FIRE_STATION], ['fuel farm', FUEL_FARM], ...HANGARS.map((h, i): [string, readonly number[]] => [`hangar ${i}`, h]), ...shelters.map((s, i): [string, readonly number[]] => [`shelter ${i}`, s])];
  // Inside the fence, 15 or more from it (the approach lights too)
  for (const [id, r] of parts) for (const p of corners(r)) assert.ok(inAirbase(...p) && fenceDist(p) > 15, `${id} at ${p}`);
  for (const [x0, x1] of APPROACH) for (const x of [x0, x1]) assert.ok(inAirbase(x, RUNWAY.z) && fenceDist([x, RUNWAY.z]) > 10);
  // The runway's west end 140 from the wall (the base's flights come and go over the east)
  assert.ok(RUNWAY.x0 - WALL_INNER[0] >= 140);
  // Nothing built overlaps anything else (the hangars face the apron, the shelters the north taxiway)
  const overlap = (a: readonly number[], b: readonly number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) assert.ok(!overlap(parts[i][1], parts[j][1]), `${parts[i][0]} on ${parts[j][0]}`);
  // The connectors and links run between the taxiways and the runway
  for (const x of CONNECTORS) assert.ok(x > TAXIWAY.x0 && x < TAXIWAY.x1 && x > RUNWAY.x0 && x < RUNWAY.x1);
  for (const x of NORTH_LINKS) assert.ok(x >= NORTH_TAXI.x0 && x <= NORTH_TAXI.x1);
  // The tower on its own, its top under the Emporium's roof (12.5); the hangars too
  assert.ok(TOWER_TOP < 12.5 && HANGAR_H < 12.5);
  for (const [id, r] of parts) assert.ok(!inRect(r, TOWER[0], TOWER[1], 3), `the tower in the ${id}`);
  // The apron's road from the avenue: inside the fence, clear of the kept lots of Phase 3
  for (const p of APRON_ROAD) assert.ok(inAirbase(...p));
  for (const k of KEPT.filter((q) => q.phase === 3)) assert.ok(APRON_ROAD[0][1] < k.rect[1] - 5 || APRON_ROAD[0][1] > k.rect[3] + 5, `the apron road through ${k.id}`);
});

test("what's parked (Phase 2): on the apron or in the open hangar, clear of each other and of the buildings", async () => {
  const { APRON, APRON_VEHICLES, AIRFIELD_SOLIDS, HANGARS, OPEN_HANGAR, PARKED, RUNWAY, TAXIWAY, WINDSOCK } = ({ ...(await import('../src/scripts/city3d/airbase')), ...(await import('../src/scripts/city3d/airbasedress')) });
  // (each one's reach: an airliner-sized transport 11, a trainer 4, a helicopter 4)
  const reach = { freighter: 11, prop: 4, heli: 4 } as const;
  const hangar = HANGARS[OPEN_HANGAR];
  for (const p of PARKED) {
    const [x, z] = p.at;
    const inHangar = inRect(hangar, x, z);
    assert.ok(inHangar || (x - reach[p.kind] > APRON[0] && x + reach[p.kind] < APRON[2] && z - reach[p.kind] > TAXIWAY.z + TAXIWAY.half && z + reach[p.kind] < HANGARS[0][1]), `a ${p.kind} off the apron at ${x}, ${z}`);
    for (const b of AIRFIELD_SOLIDS) if (!(inHangar && b[0] === hangar[0] && b[1] === hangar[1])) assert.ok(!inRect(b, x, z, reach[p.kind] - 2), `a ${p.kind} in a building at ${x}, ${z}`);
  }
  for (let i = 0; i < PARKED.length; i++)
    for (let j = i + 1; j < PARKED.length; j++) {
      const [a, b] = [PARKED[i], PARKED[j]];
      assert.ok(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]) > Math.max(reach[a.kind], reach[b.kind]) + 2, `${a.kind} on ${b.kind}`);
    }
  for (const v of APRON_VEHICLES) assert.ok(inRect(APRON, v.at[0], v.at[1], -4));
  // The windsock between the runway's lights and the taxiway
  assert.ok(WINDSOCK[1] > RUNWAY.z + RUNWAY.half + 2 && WINDSOCK[1] < TAXIWAY.z - TAXIWAY.half - 2);
});

test("the base's aircraft all grey (the owner's call): as light as they were, no colour left", async () => {
  const { baseGrey, BASE_GREY } = ({ ...(await import('../src/scripts/city3d/airbase')), ...(await import('../src/scripts/city3d/airbasedress')) });
  const ratio = (c: [number, number, number]) => c.map((v, i) => v / BASE_GREY[i]);
  for (const c of [[1, 1, 1], [0.9, 0.1, 0.4], [0.1, 0.5, 0.9], [0.05, 0.05, 0.08], [0.95, 0.42, 0.24]] as [number, number, number][]) {
    const g = baseGrey(...c);
    // (one grey: each channel the same share of the base's grey)
    const r = ratio(g);
    assert.ok(Math.abs(r[0] - r[1]) < 1e-9 && Math.abs(r[1] - r[2]) < 1e-9);
    assert.ok(g.every((v) => v >= 0 && v <= 1));
  }
  // (lighter stays lighter: the white body over the dark glass)
  assert.ok(baseGrey(1, 1, 1)[0] > baseGrey(0.1, 0.1, 0.15)[0] * 3);
});

test('the base itself (Phase 3): inside the fence, clear of each other, the airfield and the roads, under the Emporium', async () => {
  const A = ({ ...(await import('../src/scripts/city3d/airbase')), ...(await import('../src/scripts/city3d/airbasedress')) });
  const parts: [string, readonly number[]][] = [
    ['parade', A.PARADE],
    ['hq', A.HQ],
    ...A.BARRACKS.map((r, i): [string, readonly number[]] => [`barracks ${i}`, r]),
    ...A.SERVICES.map((s): [string, readonly number[]] => [s.id, s.rect]),
    ['motor pool', A.MOTOR_POOL],
    ...A.HELI_PADS.map(([x, z, r], i): [string, readonly number[]] => [`pad ${i}`, [x - r, z - r, x + r, z + r]]),
    ['heli hut', A.HELI_HUT],
    ['radar', [A.RADAR.x - A.RADAR.mound, A.RADAR.z - A.RADAR.mound, A.RADAR.x + A.RADAR.mound, A.RADAR.z + A.RADAR.mound]],
    ['water tower', [A.WATER_TOWER.x - A.WATER_TOWER.r, A.WATER_TOWER.z - A.WATER_TOWER.r, A.WATER_TOWER.x + A.WATER_TOWER.r, A.WATER_TOWER.z + A.WATER_TOWER.r]],
    ['range', A.RANGE],
    ...A.WATCHTOWERS.map(([x, z], i): [string, readonly number[]] => [`watchtower ${i}`, [x - 1.6, z - 1.6, x + 1.6, z + 1.6]]),
  ];
  const airfield: [string, readonly number[]][] = [
    ['runway', [A.RUNWAY.x0, A.RUNWAY.z - A.RUNWAY.half, A.RUNWAY.x1, A.RUNWAY.z + A.RUNWAY.half]],
    ['taxiway', [A.TAXIWAY.x0, A.TAXIWAY.z - A.TAXIWAY.half, A.TAXIWAY.x1, A.TAXIWAY.z + A.TAXIWAY.half]],
    ['apron', A.APRON],
    ['fire station', A.FIRE_STATION],
    ['fuel farm', A.FUEL_FARM],
    ...A.HANGARS.map((h, i): [string, readonly number[]] => [`hangar ${i}`, h]),
    ['apron road', [A.APRON_ROAD[1][0], A.APRON_ROAD[0][1] - 3.5, A.APRON_ROAD[0][0], A.APRON_ROAD[0][1] + 3.5]],
    ['avenue', [A.MAIN_GATE.x - A.AVENUE_HALF, -700, A.MAIN_GATE.x + A.AVENUE_HALF, A.MAIN_GATE.z]],
  ];
  const overlap = (a: readonly number[], b: readonly number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  for (const [id, r] of parts) {
    for (const p of [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]] as Pt[]) assert.ok(inAirbase(...p) && fenceDist(p) > 4, `${id} at ${p}`);
    for (const [other, q] of airfield) assert.ok(!overlap(r, q), `${id} on the ${other}`);
  }
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) assert.ok(!overlap(parts[i][1], parts[j][1]), `${parts[i][0]} on ${parts[j][0]}`);
  // Each in the plan's kept lot for it (Phase 3's)
  const kept = (id: string) => A.KEPT.find((k) => k.id === id)!.rect;
  assert.ok(inRect(kept('parade'), A.PARADE[0] + 0.5, A.PARADE[1] + 0.5) && inRect(kept('hq'), A.HQ[0] + 0.5, A.HQ[1] + 0.5));
  for (const b of A.BARRACKS) assert.ok(inRect(kept('barracks'), b[0] + 0.1, b[1] + 0.1, 0.01) && inRect(kept('barracks'), b[2] - 0.1, b[3] - 0.1, 0.01));
  // Under the Emporium (12.5): the water tower, the radar dome, the HQ, the flags
  assert.ok(A.WATER_TOWER.top < 12.5 && A.RADAR.moundH + A.RADAR.plinth + A.RADAR.r < 12.5 && A.HQ_H < 12.5 && A.FLAG_H < 12.5 && A.GATEHOUSE_H < 12.5);
  for (const b of A.BASE_SOLIDS) assert.ok(b[4] < 12.5 && b[0] < b[2] && b[1] < b[3]);
  // The watchtowers round the fence, a handful, none by a gate
  assert.ok(A.WATCHTOWERS.length >= 6 && A.WATCHTOWERS.length <= 12);
  for (const [x, z] of A.WATCHTOWERS) assert.ok(fenceDist([x, z]) > 5 && fenceDist([x, z]) < 7 && A.GATES.every((g) => Math.hypot(x - g.x, z - g.z) > 25));
  // The avenue's lamps beside it, clear of everything built
  for (const [x, z] of A.AVENUE_LAMPS) {
    assert.ok(Math.abs(x - A.MAIN_GATE.x) > A.AVENUE_HALF && Math.abs(x - A.MAIN_GATE.x) < A.AVENUE_HALF + 2);
    for (const [id, r] of parts) assert.ok(!inRect(r, x, z, 0.5), `an avenue lamp in the ${id}`);
  }
  // The service road from the gate to the motor pool, inside the fence
  for (const p of A.SERVICE_ROAD) assert.ok(inAirbase(...p));
});

test('at night (Phase 4): the apron\'s masts and their pools, the searchlights turned in towards the base', async () => {
  const A = ({ ...(await import('../src/scripts/city3d/airbase')), ...(await import('../src/scripts/city3d/airbasedress')) });
  for (const [x, z] of A.APRON_MASTS) {
    // (at the apron's south edge, between the hangars, clear of what's parked, under the Emporium)
    assert.ok(z > A.APRON[3] - 8 && z < A.HANGARS[0][1] && A.HANGARS.every((h) => x < h[0] - 1 || x > h[2] + 1), `a mast at ${x}, ${z}`);
    for (const p of A.PARKED) assert.ok(Math.hypot(x - p.at[0], z - p.at[1]) > 12, `a mast on a parked ${p.kind}`);
  }
  assert.ok(A.MAST_H < 12.5);
  for (const [x, z] of A.BASE_POOLS) assert.ok(inRect(A.APRON, x, z), `a pool off the apron at ${x}, ${z}`);
  // Each searchlight at rest looks in: 15 along its way, and all its sweep, inside the fence
  for (const w of A.WATCHTOWERS)
    for (const d of [-A.SWEEP, 0, A.SWEEP]) {
      const a = A.searchRest(w) + d;
      const p: Pt = [w[0] + Math.cos(a) * 15, w[1] - Math.sin(a) * 15];
      assert.ok(inAirbase(...p), `the searchlight at ${w} looks out at ${p}`);
    }
});
