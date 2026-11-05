// Lot 9 (lot9.ts, docs/trailer-plan.md): the trailer park south of the ring highway's south-west corner, south of
// Endswood Estate since it moved (docs/estate-plan.md Phase 1). Its lanes join the plan, everything stands on its land
// off the lanes and clear of each other, outside the highway and under the Emporium; the tunnel under the highway is
// walkable from The Trenches into Endswood's land and stops you everywhere else, its footpath on south to Lot 9.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FENCE, FIRE, FIRE_SEATS, FOOTPATH, GATE, HOLE, KIDS_ON_BIKES, KIDS_RUNNING, LANE_HALF, LOT9_CARS, LOT9_CROSSINGS, LOT9_IDLE, LOT9_LAMPS, LOT9_PEOPLE, LOT9_RECT,
  LOT9_SOLIDS, LOT9_SPAWN, LOT9_TREES, inTunnelZone, LOT9_STREETS, FIRE_LOT, OFFICE, LAUNDRY, TUNNEL, TUNNEL_HOLES, TUNNEL_SOLIDS, DOWN, inTunnel, riderAt, runnerAt, tunnelFloor, tunnelRoom, tunnelWall, tunnelY,
} from '../src/scripts/city3d/lot9';
import { CHAINED_DOGS, HOME_CARS, HOME_SOLIDS, HOMES, LOTS, PORCH_SITTERS } from '../src/scripts/city3d/lot9homes';
import { PLAN, distToStreet, inPoly, type Pt } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLACES } from '../src/scripts/city3d/places';
import { LIVE_PLACES } from '../src/scripts/city3d/live';
import { HIGHWAY_HALF, fromHighway, insideHighway } from '../src/scripts/city3d/highway';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { TRACKS } from '../src/scripts/city3d/metro';
import { BUS_STOPS } from '../src/scripts/city3d/transit';
import { KEEPS } from '../src/scripts/city3d/landuse';
import { lampTone } from '../src/scripts/city3d/lampmix';
import { RUNWAY } from '../src/scripts/city3d/airfield';
import type { Moment } from '../src/scripts/city3d/parklife';

const mine = new Set(LOT9_SOLIDS);
const others = SOLIDS.filter((b) => !mine.has(b));
/** Everything solid in Lot 9 once its chunk has loaded */
const ALL = [...LOT9_SOLIDS, ...HOME_SOLIDS];
const overlap = (a: readonly number[], b: readonly number[], m = 0) => a[0] < b[2] - m && a[2] > b[0] + m && a[1] < b[3] - m && a[3] > b[1] + m;
const inRect = (r: readonly number[], x: number, z: number, m = 0) => x > r[0] + m && x < r[2] - m && z > r[1] + m && z < r[3] - m;
const lanes = PLAN.streets.filter((s) => s.id.startsWith('lot9-'));
const fromLanes = (p: Pt) => Math.min(...lanes.map((s) => distToStreet(s, p) - s.half));
const segDist = (p: Pt, a: Pt, b: Pt) => {
  const vx = b[0] - a[0];
  const vz = b[1] - a[1];
  const l2 = vx * vx + vz * vz;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t);
};
const fromTrack = (p: Pt) => Math.min(...Object.values(TRACKS).flatMap((t) => t.pts.slice(1).map((q, i) => segDist(p, t.pts[i], q))));
const corners = (b: readonly number[]): Pt[] => [
  [b[0], b[1]],
  [b[2], b[1]],
  [b[0], b[3]],
  [b[2], b[3]],
];

test('its lanes and crossings join the street plan, off the avenue past the highway', () => {
  for (const s of LOT9_STREETS) assert.ok(PLAN.streets.some((q) => q.id === s.id), s.id);
  for (const c of LOT9_CROSSINGS) {
    const p = PLAN.crossings.find((q) => q.id === c.id);
    assert.ok(p, c.id);
    for (const id of c.streets) assert.ok(PLAN.streets.some((q) => q.id === id), `${c.id}: ${id}`);
  }
  // (all of it outside the highway, well clear of its asphalt, and far from any metro track)
  for (const s of LOT9_STREETS)
    for (const p of s.pts) {
      assert.ok(!insideHighway(p[0], p[1]), s.id);
      assert.ok(fromHighway(p[0], p[1]) > HIGHWAY_HALF + 20, s.id);
      assert.ok(fromTrack(p) > 30, s.id);
    }
});

test('it stands outside the highway, clear of the airport and well inside the world', () => {
  for (const p of corners(LOT9_RECT)) assert.ok(!insideHighway(p[0], p[1]));
  assert.ok(FENCE[1] - (320 + HIGHWAY_HALF) > 15, 'its fence a way off the highway');
  // (the airliners come in low along the runway's line from the west: well north of the fence since it moved south of
  // Endswood, docs/estate-plan.md Phase 1)
  assert.ok(FENCE[1] - RUNWAY.z > 25);
  assert.ok(LOT9_RECT[2] < -4.5 - 3.6, 'west of the avenue');
});

test('the lots: in the fence, off the lanes, none overlapping, and about 55 homes', () => {
  assert.ok(HOMES.length >= 50 && HOMES.length <= 62, `${HOMES.length} homes`);
  for (const l of LOTS) {
    for (const p of corners(l.rect)) assert.ok(inRect(FENCE, p[0], p[1], -0.01), l.id);
    assert.ok(fromLanes([(l.rect[0] + l.rect[2]) / 2, (l.rect[1] + l.rect[3]) / 2]) > 0, l.id);
    for (const p of corners(l.rect)) assert.ok(fromLanes(p) > 0.1, `${l.id} off the lanes`);
  }
  for (let i = 0; i < LOTS.length; i++) for (let j = i + 1; j < LOTS.length; j++) assert.ok(!overlap(LOTS[i].rect, LOTS[j].rect, 0.01), `${LOTS[i].id} / ${LOTS[j].id}`);
  // Every kind and condition the owner asked for is there: single and double wides, caravans, RVs; worn, rough, a burnt-out shell, condemned units
  const kinds = new Set(HOMES.map((h) => h.kind));
  for (const k of ['single', 'double', 'caravan', 'rv'] as const) assert.ok(kinds.has(k), k);
  const conds = new Set(HOMES.map((h) => h.cond));
  for (const c of ['kept', 'worn', 'rough', 'condemned', 'burnt'] as const) assert.ok(conds.has(c), c);
  assert.ok(HOMES.filter((h) => h.keepOut).length >= 3, 'KEEP OUT signs');
  assert.ok(CHAINED_DOGS.length >= 2, 'chained dogs');
  for (const k of ['dish', 'ac', 'tarp', 'boarded'] as const) assert.ok(HOMES.some((h) => h[k]), k);
  assert.ok(HOMES.some((h) => h.shed) && HOMES.some((h) => h.leanTo) && HOMES.some((h) => h.carport), 'sheds, lean-tos, carports');
});

test("each home's parts stay on its lot and clear of each other", () => {
  for (const h of HOMES) {
    const r = h.lot.rect;
    const parts: [string, readonly number[] | undefined][] = [
      ['body', h.body],
      ['porch', h.porch],
      ['shed', h.shed],
      ['leanTo', h.leanTo],
      ['dogRun', h.dogRun],
      ['junk', h.junk],
      ['car', h.car ? carRect(h.car) : undefined],
    ];
    for (const [k, b] of parts) if (b) for (const p of corners(b)) assert.ok(inRect(r, p[0], p[1], -0.01), `${h.lot.id} ${k}`);
    const solid = parts.filter(([k, b]) => b && k !== 'leanTo');
    for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) assert.ok(!overlap(solid[i][1]!, solid[j][1]!, 0.01), `${h.lot.id}: ${solid[i][0]} / ${solid[j][0]}`);
    // (the door's foot is on the deck or just off the home, on its lot)
    assert.ok(inRect(r, h.door[0], h.door[1]), h.lot.id);
    assert.ok(h.h + 0.2 < EMPORIUM_ROOF, 'under the Emporium');
  }
});
function carRect(c: { id: string; x: number; z: number; ry: number }) {
  return HOME_SOLIDS.find((s) => s[0] < c.x && s[2] > c.x && s[1] < c.z && s[3] > c.z && s[4] === 1.2)!;
}

test("its solids: the boot's in SOLIDS, the homes' joined with the chunk, under the Emporium, clear of everything else that is solid and of each other", () => {
  for (const b of LOT9_SOLIDS) assert.ok(SOLIDS.includes(b));
  for (const b of HOME_SOLIDS) assert.ok(!SOLIDS.includes(b));
  for (const b of ALL) {
    assert.ok(b[4] < EMPORIUM_ROOF);
    for (const o of others) assert.ok(!overlap(b, o, 0.02), `${b} / ${o}`);
  }
  for (const b of HOME_SOLIDS) for (const o of LOT9_SOLIDS) assert.ok(!overlap(b, o, 0.02), `${b} / ${o}`);
  // (nothing solid on a lane)
  for (const b of ALL) if (!TUNNEL_SOLIDS.includes(b)) assert.ok(fromLanes([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]) > 0, `${b} on a lane`);
  // The fire pit's lots are the grid's (lot9homes.ts lays none there)
  const fire = LOTS.filter((l) => l.use === 'firepit');
  assert.equal(fire.length, 2);
  assert.ok(Math.abs(Math.min(...fire.map((l) => l.rect[0])) - FIRE_LOT[0]) < 1e-6 && Math.abs(Math.max(...fire.map((l) => l.rect[2])) - FIRE_LOT[2]) < 1e-6);
  assert.ok(Math.abs(fire[0].rect[1] - FIRE_LOT[1]) < 1e-6 && Math.abs(fire[0].rect[3] - FIRE_LOT[3]) < 1e-6);
  void LOT9_CARS;
  void HOME_CARS;
});

test('the office, the laundry and the fire pit are by the lane, the gate open on it', () => {
  for (const h of [OFFICE, LAUNDRY]) {
    assert.ok(inRect(FENCE, h.door[0], h.door[1]));
    assert.ok(fromLanes(h.door) < 0.8 && fromLanes(h.door) > 0, 'its door on the lane');
  }
  assert.ok(inRect(FENCE, FIRE.x, FIRE.z));
  for (const s of FIRE_SEATS) assert.ok(Math.hypot(s.x - FIRE.x, s.z - FIRE.z) > FIRE.r + 1);
  assert.equal(GATE.x, FENCE[2]);
  assert.ok(Math.abs(GATE.z - LOT9_STREETS[0].pts[0][1]) < 1e-6);
  assert.ok(GATE.half > LANE_HALF + 0.5);
});

test('the tunnel: its ramps and floor, under the highway, between row C and into Endswood, the path on to Lot 9', () => {
  const T = TUNNEL;
  // (the roof covers the highway's asphalt with room either side; the open cuttings stop short of it and its lamps)
  assert.ok(T.roof0 < 320 - HIGHWAY_HALF - 0.8 && T.roof1 > 320 + HIGHWAY_HALF + 0.8);
  // Gentle ramps (no steeper than one in three), a floor a walker stands up in under the roof
  assert.ok((0.035 - T.floor) / (T.ramp0 - T.z0) < 1 / 3);
  assert.ok((0.035 - T.floor) / (T.z1 - T.ramp1) < 1 / 3);
  assert.ok(T.ceil - T.floor > 1.5);
  // Its walls stand clear of every solid but its own, and the footpath reaches the hole in the fence
  const walls: number[] = [T.x - T.half - T.wall, T.z0, T.x + T.half + T.wall, T.z1];
  for (const o of others) assert.ok(!overlap(walls, o, 0.02), `${o} in the tunnel's way`);
  assert.deepEqual(FOOTPATH[0], [T.x, T.z1]);
  const hole = FOOTPATH[FOOTPATH.length - 2];
  assert.ok(Math.abs(hole[0] - HOLE.x) < 1e-6 && hole[1] === FENCE[1]);
  // (south all the way, in short stretches (nothing drawn much longer than a tile), a little either side of the
  // tunnel's line, clear of every solid and of every street but Lot 9's own lanes at its end)
  for (let i = 1; i < FOOTPATH.length; i++) {
    const [a, b] = [FOOTPATH[i - 1], FOOTPATH[i]];
    assert.ok(b[1] > a[1] && Math.hypot(b[0] - a[0], b[1] - a[1]) < 12, `stretch ${i}`);
    assert.ok(Math.abs(b[0] - T.x) < 3.5);
    if (b[1] < FENCE[1]) {
      assert.ok(!SOLIDS.some((o) => inRect(o, b[0], b[1], -0.8)), `path in a solid at ${b}`);
      assert.ok(!PLAN.streets.some((st) => st.kind !== 'highway' && distToStreet(st, b) < st.half + 1), `path on a street at ${b}`);
    }
  }
  // The holes in the ground are over the open cuttings only
  for (const h of TUNNEL_HOLES) assert.ok(h[3] <= T.roof0 + 1e-6 || h[1] >= T.roof1 - 1e-6);
  // ...and no street of the plan crosses the open cuttings but the highway over the roof
  for (const s of PLAN.streets)
    if (s.kind !== 'highway')
      for (const z of [T.z0 + 0.5, T.ramp0, T.roof0 - 0.2, T.roof1 + 0.2, T.ramp1, T.z1 - 0.5]) assert.ok(distToStreet(s, [T.x, z]) > s.half + 0.5, `${s.id} at ${z}`);
  // ...nor any block's slab
  for (const slab of PLAN.slabs) for (const z of [T.z0 + 0.2, T.roof0 - 0.2, T.roof1 + 0.2, T.z1 - 0.2]) for (const x of [T.x - T.half - T.wall, T.x + T.half + T.wall]) assert.ok(!inPoly(slab, [x, z]), `a slab at ${x}, ${z}`);
});

test('walking the tunnel: down the ramp, under the highway, up into Lot 9; its walls stop you', () => {
  const T = TUNNEL;
  const r = 0.22;
  // Walk down it in small steps from Bottom Street's side: never blocked, each step's ground a small change
  let y = 0.035;
  for (let z = T.z0 - 1; z <= T.z1 + 1; z += 0.05) {
    const g = tunnelY(T.x, z, y);
    const ground = g ?? 0.035;
    assert.ok(Math.abs(ground - y) < 0.06, `a step at ${z}: ${y} to ${ground}`);
    assert.ok(!tunnelWall(T.x, z, y, r), `stopped at ${z}`);
    y = ground;
  }
  assert.ok(Math.abs(y - 0.035) < 1e-6);
  // Down there, its walls stop you
  assert.ok(tunnelWall(T.x + T.half, 320, T.floor, r));
  assert.ok(tunnelWall(T.x - T.half, 320, T.floor, r));
  assert.ok(!tunnelWall(T.x, 320, T.floor, r));
  // Up on the highway over the roof: ordinary ground, nothing stops you
  assert.equal(tunnelY(T.x, 320, 0.035), null);
  assert.ok(!tunnelWall(T.x, 320, 0.035, r));
  assert.ok(!tunnelWall(T.x + T.half, 320, 0.035, r));
  // At street level by an open cutting: you can't step off into it
  assert.ok(tunnelWall(T.x + T.half - 0.1, (T.ramp0 + T.roof0) / 2, 0.035, r));
  assert.ok(tunnelWall(T.x, T.roof0 - 0.15, 0.035, r), 'off the roof into the north cutting');
  // Far off it, nothing
  assert.ok(!tunnelWall(T.x + 10, 320, -1, r));
  assert.equal(tunnelY(T.x + 10, 320, -1), null);
  assert.ok(inTunnel(T.x, (T.roof0 + T.roof1) / 2) && tunnelFloor((T.roof0 + T.roof1) / 2) === T.floor);
  assert.ok(DOWN > T.floor && DOWN < 0);
});

test("the walk camera down in the tunnel keeps inside its air", () => {
  const T = TUNNEL;
  // From the pivot (his chest) under the roof, back and up: stopped under the ceiling
  const oy = T.floor + 0.9;
  const d = [0, 0.4, -0.917];
  const t = tunnelRoom(T.x, oy, 320, d[0], d[1], d[2], 4);
  assert.ok(t < 4 && oy + d[1] * t < T.ceil, `${t}`);
  // ...sideways, stopped at the wall
  const s = tunnelRoom(T.x, oy, 320, 1, 0, 0, 4);
  assert.ok(s < T.half);
  // Up out of an open cutting: free to the sky
  assert.equal(tunnelRoom(T.x, oy, (T.ramp0 + T.roof0) / 2, 0, 1, 0, 4), 4);
  // Not down there: no change
  assert.equal(tunnelRoom(T.x, 2, 320, 0, 0.4, -0.9, 4), 4);
});

test('its lamps, people and dogs stand clear of everything solid, its kids ride and run on the lanes', () => {
  const near = (x: number, z: number, m: number) => [...SOLIDS, ...HOME_SOLIDS].some((b) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m);
  for (const [x, z] of LOT9_LAMPS) assert.ok(!near(x, z, 0.12), `lamp ${x}, ${z}`);
  for (const [x, z] of LOT9_LAMPS) assert.ok(fromLanes([x, z]) > 0.2, `lamp ${x}, ${z} on a lane`);
  // (sodium, a few flickering or dead, as The Trenches')
  const tones = LOT9_LAMPS.map(([x, z]) => lampTone(x, z));
  assert.ok(tones.filter((t) => t !== 'white').length >= tones.length * 0.8);
  for (const p of [...LOT9_IDLE, ...PORCH_SITTERS]) assert.ok(!near(p.x, p.z, 0.05) || p.act === 'lounge', `${p.act} at ${p.x}, ${p.z}`);
  for (const p of [...LOT9_IDLE, ...PORCH_SITTERS]) assert.ok(inRect(LOT9_RECT, p.x, p.z), `${p.x}, ${p.z}`);
  assert.ok(PORCH_SITTERS.length >= 8, 'people on their porches');
  assert.equal(LOT9_PEOPLE.length, KIDS_ON_BIKES + KIDS_RUNNING);
  const m: Moment = { x: 0, z: 0, ry: 0, y: 0, clip: 'look', speed: 0 };
  for (let t = 0; t < 200; t += 0.7) {
    for (const p of LOT9_PEOPLE) {
      p.at(t, m);
      assert.ok(fromLanes([m.x, m.z]) < 0, `${p.id} off the lanes at ${t}`);
      assert.ok(!near(m.x, m.z, 0), `${p.id} in something at ${t}`);
    }
    // (the riders apart from each other, the runners too)
    for (let a = 0; a < KIDS_ON_BIKES; a++)
      for (let b = a + 1; b < KIDS_ON_BIKES; b++) {
        const [p, q] = [riderAt(a, t), riderAt(b, t)];
        assert.ok(Math.hypot(p.x - q.x, p.z - q.z) > 2);
      }
    const [p, q] = [runnerAt(0, t), runnerAt(1, t)];
    assert.ok(Math.hypot(p.x - q.x, p.z - q.z) > 2);
  }
  for (const d of CHAINED_DOGS) assert.ok(inRect(LOT9_RECT, d.x, d.z));
  for (const [x, z] of LOT9_TREES) {
    assert.ok(!near(x, z, 0.6), `tree ${x}, ${z}`);
    assert.ok(fromLanes([x, z]) > 0.8 && inRect(LOT9_RECT, x, z) && !inTunnelZone(x, z), `tree ${x}, ${z}`);
    assert.ok(LOT9_LAMPS.every(([lx, lz]) => Math.hypot(lx - x, lz - z) > 1.5));
  }
});

test('a place: its spawn on the lane outside the gate, a map entry, a live switch, a bus stop each way on the avenue by it, the trees off it', () => {
  assert.ok(fromLanes([LOT9_SPAWN.x, LOT9_SPAWN.z]) < 0);
  // (facing in through the gate: walk.ts faces along (-sin yaw, -cos yaw))
  assert.ok(-Math.sin(LOT9_SPAWN.yaw) < -0.99 && LOT9_SPAWN.x > GATE.x);
  assert.ok(!SOLIDS.some((b) => inRect(b, LOT9_SPAWN.x, LOT9_SPAWN.z, -0.3)));
  const p = PLACES.find((q) => q.id === 'lot9');
  assert.ok(p && p.spot === 'lot9');
  assert.ok(LIVE_PLACES.some((q) => q.id === 'lot9'));
  const stops = BUS_STOPS.filter((s) => s.street === 'ns0s' && s.at[1] > 320);
  assert.ok(stops.some((s) => s.dir[1] > 0) && stops.some((s) => s.dir[1] < 0), 'a stop each way');
  for (const id of ['lot9', 'lot9-path', 'endswood']) assert.ok(KEEPS.some((k) => k.id === id), id);
});
