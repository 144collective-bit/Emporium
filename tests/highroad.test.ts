// The High Road's places (highroad.ts; docs/south-plan.md Phase 3c, the owner's calls): both sides of the High Road,
// each building on its block facing the street, none in another or in a house; the big four there (the pub, the café,
// the petrol station, the bus garage) and every other kind; made-up names only, no numbers on any sign.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHOPS, SHOP_SOLIDS, doorOf, shopFoot, topOf } from '../src/scripts/city3d/highroad';
import { HOUSES, houseFoot, plotOf } from '../src/scripts/city3d/southterraces';
import { HIGH_ROAD, SOUTH_BLOCKS, type Pt } from '../src/scripts/city3d/south';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { distTo, inside } from '../src/scripts/city3d/streetfaces';

const STREETS = PLAN.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp');
const offStreet = (p: Pt) => Math.min(...STREETS.map((s) => distToStreet(s, p) - s.half - 0.8));
const inBox = (b: readonly number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;

test('both sides of the High Road: each building on a block, facing it, off the street, none in another or in a house', () => {
  const side = (s: (typeof SHOPS)[number]) => {
    const i = HIGH_ROAD.pts.reduce((b, p, k) => (Math.hypot(p[0] - s.at[0], p[1] - s.at[1]) < Math.hypot(HIGH_ROAD.pts[b][0] - s.at[0], HIGH_ROAD.pts[b][1] - s.at[1]) ? k : b), 0);
    const [a, c] = [HIGH_ROAD.pts[Math.max(0, i - 1)], HIGH_ROAD.pts[Math.min(HIGH_ROAD.pts.length - 1, i + 1)]];
    return Math.sign((c[0] - a[0]) * (s.at[1] - a[1]) - (c[1] - a[1]) * (s.at[0] - a[0]));
  };
  assert.ok(new Set(SHOPS.map(side)).size === 2, 'both sides');
  for (const s of SHOPS) {
    const foot = shopFoot(s);
    const c: Pt = [foot.reduce((v, p) => v + p[0], 0) / 4, foot.reduce((v, p) => v + p[1], 0) / 4];
    assert.ok(SOUTH_BLOCKS.some((b) => foot.every((p) => inside(b.poly, [p[0] + (c[0] - p[0]) * 0.05, p[1] + (c[1] - p[1]) * 0.05]))), `${s.id} off its block`);
    for (const p of foot) assert.ok(offStreet(p) > -0.1, `${s.id} on a street`);
    assert.ok(distTo(HIGH_ROAD.pts, s.at) < HIGH_ROAD.half + 0.8 + 0.6, `${s.id} not on the High Road`);
    assert.ok(distTo(HIGH_ROAD.pts, [s.at[0] - s.face[0] * s.d, s.at[1] - s.face[1] * s.d]) > distTo(HIGH_ROAD.pts, s.at) + s.d * 0.7, `${s.id} faces away`);
    // (neighbours in a row share a party wall: pulled a little in towards its middle, none in another)
    const pulled = (q: (typeof SHOPS)[number]) => {
      const f = shopFoot(q);
      const c: Pt = [f.reduce((v, p) => v + p[0], 0) / 4, f.reduce((v, p) => v + p[1], 0) / 4];
      return f.map((p): Pt => [p[0] + (c[0] - p[0]) * 0.08, p[1] + (c[1] - p[1]) * 0.08]);
    };
    for (const o of SHOPS) if (o !== s) assert.ok(!pulled(o).some((p) => inside(foot, p)), `${o.id} in ${s.id}`);
    for (const h of HOUSES) if (Math.hypot(h.at[0] - s.at[0], h.at[1] - s.at[1]) < 30) for (const p of plotOf(h)) assert.ok(!inside(foot, p), `${h.id} in ${s.id}`);
    assert.ok(s.base >= s.low && s.base - s.low < 0.9, `${s.id} on a steep plot`);
    assert.ok(topOf(s) < 7.5, `${s.id} too tall`);
  }
});

test('what stands there: the big four, the parade, the rows, the gap site, the station, the car wash, the boarded pub', () => {
  for (const id of ['brook', 'rosas', 'kestrel', 'busgarage']) assert.ok(SHOPS.some((s) => s.id === id), `${id} isn't on the High Road`);
  for (const k of ['parade', 'row', 'pub', 'gap', 'petrol', 'garage', 'station', 'carwash', 'boarded']) assert.ok(SHOPS.some((s) => s.kind === k), `no ${k}`);
  // (made-up names, no numbers on any sign; a gap site has none, the station its name)
  for (const s of SHOPS) {
    assert.ok(!/\d/.test(s.name), `a number on ${s.name}`);
    assert.equal(s.name === '', s.kind === 'gap');
  }
  assert.equal(new Set(SHOPS.map((s) => s.id)).size, SHOPS.length);
});

test('the way in to each: its door on the sidewalk, clear of anything solid', () => {
  for (const s of SHOPS) {
    const [x, z] = doorOf(s);
    assert.ok(!SHOP_SOLIDS.some((b) => inBox(b, x, z, 0.3)), `${s.id}'s door blocked`);
    assert.ok(offStreet([x, z]) < 0.2, `${s.id}'s door off the sidewalk`);
  }
  // (nothing solid of the High Road's in a house)
  for (const b of SHOP_SOLIDS) for (const h of HOUSES) if (Math.hypot(h.at[0] - b[0], h.at[1] - b[1]) < 20) assert.ok(!houseFoot(h).some((p) => inBox(b, p[0], p[1], -0.2)), `a shop's solid in ${h.id}`);
});

test("the underground station's building: walls round it with its door open at its front's west end, on to the landing inside", async () => {
  const { stationWalls, STATION_DOOR, STATION_WALL } = await import('../src/scripts/city3d/highroad');
  const { stationOf } = await import('../src/scripts/city3d/southline');
  const { inPassage, pointOf } = await import('../src/scripts/city3d/underground');
  const st = SHOPS.find((s) => s.kind === 'station')!;
  assert.equal(st.name, 'High Road');
  const walls = stationWalls(st);
  assert.equal(walls.length, 5);
  const hr = stationOf('highroad');
  // (the door's middle, a step in from the front, is on the landing; the landing and the stairs' top inside the walls)
  const fwd: [number, number] = st.face[0] < 0 ? [-st.face[1], st.face[0]] : [st.face[1], -st.face[0]];
  const f = fwd[0] > 0 ? fwd : ([-fwd[0], -fwd[1]] as [number, number]);
  const door = (STATION_DOOR[0] + STATION_DOOR[1]) / 2;
  const inside: [number, number] = [st.at[0] + f[0] * door - st.face[0] * (STATION_WALL + 0.3), st.at[1] + f[1] * door - st.face[1] * (STATION_WALL + 0.3)];
  assert.ok(hr.landing && inPassage(hr.landing, ...inside), 'in through the door on to the landing');
  const top = pointOf(hr.way, hr.way.a0 + 0.2);
  const back = (x: number, z: number) => -((x - st.at[0]) * st.face[0] + (z - st.at[1]) * st.face[1]);
  assert.ok(back(...top) > STATION_WALL && back(...top) < st.d - STATION_WALL, "the stairs' top inside");
});
