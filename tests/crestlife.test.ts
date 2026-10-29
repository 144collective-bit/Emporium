// Crestmont's life (crestlife.ts, docs/crestmont-plan.md Phase 8): the joggers and dog walkers on the hill roads'
// shoulders, at the bed's height, clear of the asphalt's lanes, the lamps and anything solid, nobody running through
// anybody; the dogs on their leads; the people standing about on their own ground, out of the pools and clear of
// what's solid; the gardeners and their barrows in the front gardens; the traffic's own cars from the town's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CREST_DOGS, CREST_IDLE, CREST_MIX, CREST_PEOPLE, GARDENERS, LANES, LEAD, SHOULDER } from '../src/scripts/city3d/crestlife';
import { CREST_LAMPS, CREST_RECT, HILL_ROADS } from '../src/scripts/city3d/crestmont';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { heightAt } from '../src/scripts/city3d/terrain';
import { ESTATES, rectToWorld } from '../src/scripts/city3d/estates';
import { MANSIONS, rectToWorld as mansionRect } from '../src/scripts/city3d/mansions';
import { HOTEL } from '../src/scripts/city3d/crestsites';
import { PALMS } from '../src/scripts/city3d/landscape';
import { moment } from '../src/scripts/city3d/parklife';
import { CARS } from '../src/scripts/city3d/carspec';

type Rect = [number, number, number, number];
const inside = (r: Rect, x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
/** What a person standing at x, z (feet at y) would walk into: a solid box over their knees, within `r` */
const solidAt = (x: number, z: number, y: number, r = 0.15) => SOLIDS.find((b) => x > b[0] - r && x < b[2] + r && z > b[1] - r && z < b[3] + r && b[4] > y + 0.3);
const distToLine = (pts: [number, number][], x: number, z: number) => {
  let d = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1)));
    d = Math.min(d, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
  }
  return d;
};

test('the hill roads: on the shoulders at the bed, off the lanes and the lamps, nothing solid in the way', () => {
  assert.equal(LANES.length, 2);
  for (const l of LANES)
    for (let i = 0; i < l.pts.length; i++) {
      const [x, z] = l.pts[i];
      const roads = HILL_ROADS.filter((r) => distToLine(r.pts, x, z) < r.half + 1.5);
      assert.ok(roads.length, `${l.id} off its road at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      // (off the traffic: a car's outside is 1.45 out from the centre line; but over a side road's mouth where it comes in)
      const mouth = (r: (typeof HILL_ROADS)[number]) => [r.pts[0], r.pts[r.pts.length - 1]].some((q) => Math.hypot(q[0] - x, q[1] - z) < 7);
      for (const r of roads) if (r.id === l.road || !mouth(r)) assert.ok(distToLine(r.pts, x, z) > 1.6, `${l.id} in a lane at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      assert.ok(Math.abs(heightAt(x, z) - l.ys[i]) < 0.12, `${l.id} off the ground at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      for (const [lx, lz] of CREST_LAMPS) assert.ok(Math.hypot(lx - x, lz - z) > 0.3, `${l.id} through a lamp at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      assert.ok(!solidAt(x, z, l.ys[i]), `${l.id} into something solid at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
  assert.ok(SHOULDER.left > 0 && SHOULDER.right > 0);
});

test('nobody runs through anybody; the dogs ahead of their walkers on the lead', () => {
  const m = moment();
  const n = moment();
  assert.ok(CREST_PEOPLE.length >= 8);
  for (let t = 0; t < 400; t += 3.7) {
    const at = CREST_PEOPLE.map((p) => ({ ...p.at(t, m) }));
    for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) assert.ok(Math.hypot(at[i].x - at[j].x, at[i].z - at[j].z) > 0.45, `two people meet at ${t}`);
    for (const d of CREST_DOGS) {
      const w = CREST_PEOPLE[d.walker].at(t, n);
      d.at(t, m);
      assert.ok(Math.abs(Math.hypot(m.x - w.x, m.z - w.z) - Math.hypot(LEAD.ahead, LEAD.side)) < 0.4);
      assert.ok(Math.abs(m.y - w.y) < 0.4);
    }
  }
  assert.ok(CREST_DOGS.length >= 2);
});

test('standing about: on their ground, out of the pools, clear of what is solid', () => {
  const pools: Rect[] = [...ESTATES.map((e) => rectToWorld(e, ...e.pool)), ...MANSIONS.map((m) => mansionRect(m, ...m.pool)), HOTEL.pool];
  const acts = new Set(CREST_IDLE.map((p) => p.act));
  for (const a of ['serve', 'eat', 'lounge', 'look', 'chat']) assert.ok(acts.has(a as never), `nobody at ${a}`);
  for (const p of CREST_IDLE) {
    assert.ok(inside(CREST_RECT, p.x, p.z), `someone out of town at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
    const seated = p.act === 'lounge' || p.act === 'eat';
    // (a seat's height over the ground, a standing person's feet on it)
    const ground = heightAt(p.x, p.z);
    const over = p.y! - ground;
    assert.ok(seated ? over > 0.2 && over < 0.7 : over > -0.05 && over < 0.25, `${p.act} at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}: ${over.toFixed(2)} over the ground`);
    for (const r of pools) assert.ok(!inside(r, p.x, p.z, -0.05), `${p.act} in a pool at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
    if (!seated) assert.ok(!solidAt(p.x, p.z, p.y!), `${p.act} in something solid at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}: ${solidAt(p.x, p.z, p.y!)}`);
  }
});

test('the gardeners in the front gardens, their barrows beside them, off the palms', () => {
  assert.ok(GARDENERS.length >= 6);
  for (const g of GARDENERS) {
    const e = ESTATES.find((s) => inside(s.rect, g.x, g.z))!;
    assert.ok(e && inside(e.rect, ...g.barrow, -0.6), 'a gardener off an estate');
    for (const [x, z] of [[g.x, g.z], g.barrow]) {
      assert.ok(!solidAt(x, z, 0.15, 0.35), `a gardener's in a hedge at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      for (const p of PALMS) assert.ok(Math.hypot(p.x - x, p.z - z) > 0.7, `on a palm at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
  }
});

test("the traffic's own: real models, none of yours only", () => {
  for (const id of CREST_MIX) assert.ok(CARS[id] && !['classic', 'offroad', 'ev'].includes(id));
});
