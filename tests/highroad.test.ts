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

test('what stands there: the big four, the parade, the rows, the gap site, the station site, the car wash, the boarded pub', () => {
  for (const id of ['brook', 'rosas', 'kestrel', 'busgarage']) assert.ok(SHOPS.some((s) => s.id === id), `${id} isn't on the High Road`);
  for (const k of ['parade', 'row', 'pub', 'gap', 'petrol', 'garage', 'station', 'carwash', 'boarded']) assert.ok(SHOPS.some((s) => s.kind === k), `no ${k}`);
  // (made-up names, no numbers on any sign; a gap site and the station site have none)
  for (const s of SHOPS) {
    assert.ok(!/\d/.test(s.name), `a number on ${s.name}`);
    assert.equal(s.name === '', s.kind === 'gap' || s.kind === 'station');
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
