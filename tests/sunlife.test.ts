// Sunridge's life (sunlife.ts, docs/suburb-plan.md Phase 5): the walkers, joggers and dog walkers along the sidewalks'
// kerbs, off the asphalt and the lamps, nobody through anybody; the park's people on its walk; the kids on the lawns
// and the swings; the dogs on their leads; everyone standing about on their own ground, out of the pools and clear of
// what's solid; the residents' cars on their driveways, nosed up to the garage, inside the lot and clear of the house;
// the collector's bus stops; the boot's lamps on the land; the traffic's own from the town's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIVEWAY_CARS, DRIVEWAY_SOLIDS, KERB_IN, LANES, LEAD, SUN_DOGS, SUN_IDLE, SUN_PEOPLE, SWING_SEATS } from '../src/scripts/city3d/sunlife';
import { MESA, PARKWAY_LOOP, SCHOOL_BUS_PAINT, SUN_LAMPS, SUN_MIX, SUN_STREETS, distTo, inSunridge, inside, type Pt } from '../src/scripts/city3d/sunridge';
import { SUN_PLACE_LAMPS } from '../src/scripts/city3d/sunplaces';
import { HOUSES, HOUSE_SOLIDS, toWorld } from '../src/scripts/city3d/sunhouses';
import { YARDS, YARD_SOLIDS } from '../src/scripts/city3d/sunyards';
import { AMENITY_SOLIDS, LAP_POOL, PARK_TREES, PARK_WALK, PLAY, SPLASH, WALK_W as PARK_WALK_W } from '../src/scripts/city3d/sunamenities';
import { LOTS, outline } from '../src/scripts/city3d/sunridgelots';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { BUS_STOPS, SUN_STOP_GAP } from '../src/scripts/city3d/transit';
import { moment } from '../src/scripts/city3d/parklife';
import { KID } from '../src/scripts/city3d/play';
import { CARS } from '../src/scripts/city3d/carspec';
import { WALK_W } from '../src/scripts/city3d/layout';
import { ROUTES, SPOTS } from '../src/scripts/city3d/routes';
import { SUNRIDGE_RECT } from '../src/scripts/city3d/sunridge';

type Rect = [number, number, number, number];
type Box = [number, number, number, number, number];
const ALL_SOLIDS: Box[] = [...SOLIDS, ...HOUSE_SOLIDS, ...YARD_SOLIDS, ...AMENITY_SOLIDS, ...DRIVEWAY_SOLIDS];
const inRect = (r: Rect, x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
/** What a person standing at x, z (feet at y) would walk into: a solid box over their knees, within `r` */
const solidAt = (x: number, z: number, y: number, r = 0.15, boxes = ALL_SOLIDS) => boxes.find((b) => x > b[0] - r && x < b[2] + r && z > b[1] - r && z < b[3] + r && b[4] > y + 0.3);
const lots = new Map(LOTS.map((l) => [l.id, l]));
const local = (h: (typeof HOUSES)[number], p: Pt): Pt => [(p[0] - h.o[0]) * h.u[0] + (p[1] - h.o[1]) * h.u[1], (p[0] - h.o[0]) * h.v[0] + (p[1] - h.o[1]) * h.v[1]];
const inHouse = (h: (typeof HOUSES)[number], p: Pt, m = 0) => h.parts.some((q) => local(h, p)[0] > q.u0 - m && local(h, p)[0] < q.u1 + m && local(h, p)[1] > q.v0 - m && local(h, p)[1] < q.v1 + m);

test('the sidewalks: along the kerbs, off the asphalt and the lamps, clear of the junctions, nothing solid in the way', () => {
  assert.equal(LANES.length, 4);
  for (const l of LANES.slice(0, 2)) {
    const street = l.id.startsWith('loop') ? PARKWAY_LOOP : MESA.pts;
    for (const [x, z] of l.pts) {
      // On the sidewalk's kerb: just off its own street's asphalt (the lamps stand at + 0.45)
      const d = distTo(street, [x, z], l.id.startsWith('loop'));
      assert.ok(Math.abs(d - (1.7 + KERB_IN)) < 0.08, `${l.id} off the kerb at ${x.toFixed(1)}, ${z.toFixed(1)}: ${d.toFixed(2)}`);
      // ...and off every other street's asphalt and its junctions' mouths
      for (const s of SUN_STREETS) if (s.pts !== street) assert.ok(distTo(s.pts, [x, z], !!s.loop) > s.half + 1.5, `${l.id} on ${s.id} at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      for (const [lx, lz] of SUN_LAMPS) assert.ok(Math.hypot(lx - x, lz - z) > 0.3, `${l.id} through a lamp at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      assert.ok(!solidAt(x, z, 0.15), `${l.id} into something solid at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
  }
  // The park's lanes: on its walk, either side of its middle
  for (const l of LANES.slice(2)) for (const [x, z] of l.pts) assert.ok(distTo(PARK_WALK, [x, z], true) < PARK_WALK_W / 2, `${l.id} off the walk at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  assert.ok(KERB_IN > 0 && KERB_IN < WALK_W / 2);
});

test('nobody runs through anybody; the kids at their size; the dogs ahead of their walkers on the lead', () => {
  const m = moment();
  const n = moment();
  assert.ok(SUN_PEOPLE.length >= 24);
  for (let t = 0; t < 500; t += 3.7) {
    const at = SUN_PEOPLE.map((p) => ({ ...p.at(t, m), scale: p.scale }));
    for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) assert.ok(Math.hypot(at[i].x - at[j].x, at[i].z - at[j].z) > 0.45, `${SUN_PEOPLE[i].id} meets ${SUN_PEOPLE[j].id} at ${t}`);
    for (const a of at) {
      assert.ok(inSunridge(a.x, a.z, 0), `someone out of Sunridge at ${a.x.toFixed(1)}, ${a.z.toFixed(1)}`);
      if (a.clip === 'jog' || a.clip === 'walk') assert.ok(!solidAt(a.x, a.z, a.y, 0.1), `a runner into something solid at ${a.x.toFixed(1)}, ${a.z.toFixed(1)}`);
    }
    for (const d of SUN_DOGS) {
      const w = SUN_PEOPLE[d.walker].at(t, n);
      d.at(t, m);
      // (ahead on the lead; round a turn the lead shortens, over a kerb-to-kerb turn it stretches a little)
      const gap = Math.hypot(m.x - w.x, m.z - w.z);
      assert.ok(gap > 0.35 && gap < Math.hypot(LEAD.ahead, LEAD.side) + 0.5, `a dog ${gap.toFixed(2)} from its walker at ${t}`);
    }
  }
  assert.ok(SUN_DOGS.length >= 3);
  const kids = SUN_PEOPLE.filter((p) => p.scale === KID);
  assert.ok(kids.length >= 6, 'kids about');
  // The swings' seats are on the bar, inside the playground
  for (const [x, z] of SWING_SEATS) assert.ok(x > PLAY.swings.x0 && x < PLAY.swings.x1 && z === PLAY.swings.z);
});

test('standing about: on their ground, out of the pools, clear of what is solid', () => {
  const pools: Rect[] = [LAP_POOL, [SPLASH.x - SPLASH.r, SPLASH.z - SPLASH.r, SPLASH.x + SPLASH.r, SPLASH.z + SPLASH.r]];
  const acts = new Set(SUN_IDLE.map((p) => p.act));
  for (const a of ['lounge', 'sit', 'chat', 'look', 'eat', 'cook', 'phone']) assert.ok(acts.has(a as never), `nobody at ${a}`);
  assert.ok(SUN_IDLE.length >= 50 && SUN_IDLE.length + SUN_PEOPLE.length <= 128, `${SUN_IDLE.length} standing about and ${SUN_PEOPLE.length} moving (the crowd keeps 128 slots)`);
  for (const p of SUN_IDLE) {
    assert.ok(inSunridge(p.x, p.z, 0), `someone out of Sunridge at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
    const seated = p.act === 'lounge' || p.act === 'eat' || p.act === 'sit';
    const over = p.y! - 0.15;
    assert.ok(seated ? over > 0.2 && over < 1.6 : over > -0.05 && over < 0.25, `${p.act} at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}: ${over.toFixed(2)} over the ground`);
    for (const r of pools) assert.ok(!inRect(r, p.x, p.z, -0.05), `${p.act} in a pool at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
    // (the residents' pools, in their houses' frames)
    HOUSES.forEach((h, i) => {
      const pool = YARDS[i].pool;
      if (!pool) return;
      const [u, v] = local(h, [p.x, p.z]);
      assert.ok(!(u > pool.u0 && u < pool.u1 && v > pool.v0 && v < pool.v1), `${p.act} in a pool at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
    });
    if (!seated) {
      // (someone on a porch stands at its floor's height, in front of the house's wall: a turned house's solid cells
      // overshoot its outline, so they're held to the cells themselves, the rest to a margin)
      const porch = p.y! > 0.2;
      assert.ok(!solidAt(p.x, p.z, p.y!, porch ? 0 : 0.15), `${p.act} in something solid at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}: ${solidAt(p.x, p.z, p.y!, porch ? 0 : 0.15)}`);
      for (const h of HOUSES) assert.ok(!inHouse(h, [p.x, p.z], porch ? 0.3 : 0.1), `${p.act} in a house at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
    }
  }
});

test("the residents' cars on their driveways, nosed up to the garage, inside the lot, clear of the house and solid", () => {
  assert.ok(DRIVEWAY_CARS.length >= 20, `${DRIVEWAY_CARS.length} cars`);
  for (const [id, x, z, yaw, paint] of DRIVEWAY_CARS) {
    assert.ok(CARS[id] && !['classic', 'offroad', 'ev'].includes(id), `${id} is yours only`);
    assert.match(paint, /^#[0-9a-f]{6}$/);
    const h = HOUSES.find((q) => inRect([Math.min(...outline(lots.get(q.lot)!).map((p) => p[0])), Math.min(...outline(lots.get(q.lot)!).map((p) => p[1])), Math.max(...outline(lots.get(q.lot)!).map((p) => p[0])), Math.max(...outline(lots.get(q.lot)!).map((p) => p[1]))], x, z) && inside(outline(lots.get(q.lot)!), [x, z]))!;
    assert.ok(h, `a car off every lot at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    const [u, v] = local(h, [x, z]);
    const { L, W } = CARS[id];
    // On the driveway, between its edges, its nose short of the garage door, its tail on the lot
    assert.ok(u - W / 2 > h.drive[0] - 0.05 && u + W / 2 < h.drive[1] + 0.05, `${id} off the driveway at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    assert.ok(v + L / 2 < h.garageDoor.v - 0.1 && v - L / 2 > 0.2, `${id} through the garage at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    for (const [cu, cv] of [
      [u - W / 2, v + L / 2],
      [u + W / 2, v + L / 2],
      [u - W / 2, v - L / 2],
      [u + W / 2, v - L / 2],
    ])
      assert.ok(!inHouse(h, toWorld(h, cu, cv)), `${id} in the house at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    // Facing the garage: yaw turns +x onto the house's +v
    assert.ok(Math.abs(Math.cos(yaw) - h.v[0]) < 1e-6 && Math.abs(-Math.sin(yaw) - h.v[1]) < 1e-6, `${id} not facing the garage`);
    assert.ok(DRIVEWAY_SOLIDS.some((b) => inRect([b[0], b[1], b[2], b[3]], x, z, 0.3)), `${id} isn't solid at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  }
  // Nobody stands in one
  for (const p of SUN_IDLE) assert.ok(!solidAt(p.x, p.z, p.y!, 0.1, DRIVEWAY_SOLIDS), `someone in a car at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
});

test("the collector's bus stops: a few round the loop, both ways, well apart", () => {
  const stops = BUS_STOPS.filter((b) => b.street === 'sun-parkway');
  assert.ok(stops.length >= 4 && stops.length <= 10, `${stops.length} stops on the loop`);
  assert.ok(stops.some((b) => b.id.includes(':a')) && stops.some((b) => b.id.includes(':b')), 'both ways');
  for (const b of stops) assert.ok(inSunridge(b.at[0], b.at[1], 0));
  for (let i = 0; i < stops.length; i++) for (let j = i + 1; j < stops.length; j++) if (stops[i].dir[0] * stops[j].dir[0] + stops[i].dir[1] * stops[j].dir[1] > 0.9) assert.ok(Math.hypot(stops[i].at[0] - stops[j].at[0], stops[i].at[1] - stops[j].at[1]) > SUN_STOP_GAP * 0.4, 'two stops close together');
});

test("the boot's lamps on the land, off the walk's people, the trees and what's solid; the traffic's own real models", () => {
  for (const [x, z] of SUN_PLACE_LAMPS) {
    assert.ok(inSunridge(x, z, 0), `a lamp off the land at ${x}, ${z}`);
    assert.ok(!solidAt(x, z, 0.15, 0.3), `a lamp in something solid at ${x}, ${z}`);
    for (const t of PARK_TREES) assert.ok(Math.hypot(t.x - x, t.z - z) > 1.5, `a lamp on a tree at ${x}, ${z}`);
    for (const l of LANES) for (const p of l.pts) assert.ok(Math.hypot(p[0] - x, p[1] - z) > 0.3, `a lamp in the walk's way at ${x}, ${z}`);
    for (const [lx, lz] of SUN_LAMPS) assert.ok(Math.hypot(lx - x, lz - z) > 3, `a lamp on a lamp at ${x}, ${z}`);
  }
  for (const id of SUN_MIX) assert.ok(CARS[id] && !['classic', 'offroad', 'ev'].includes(id));
  assert.match(SCHOOL_BUS_PAINT, /^#[0-9a-f]{6}$/);
});

test("the traffic's own have streets of their own to be put on: routes that keep to Sunridge at least half the way round", () => {
  const share = ROUTES.map((r) => r.pts.filter(([x, z]) => inRect(SUNRIDGE_RECT, x, z)).length / Math.max(1, r.pts.length));
  const spots = SPOTS.filter((s) => inRect(SUNRIDGE_RECT, s.x, s.z) && share[s.r] >= 0.5);
  assert.ok(spots.length >= 10, `${spots.length} spots`);
});
