// The outer districts (outer.ts): the Parkway and the Southside Loop bend gently and
// meet their avenues square; every plot and lot keeps its pad (same place, same price)
// on a landscaped block clear of the streets; the squares, parks, lawns, kerbs and the
// promenade stay where they belong.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BENDS,
  BEND_KERBS,
  BEND_REACH,
  JETTIES,
  LAWN_TREES,
  OUTER_BLOCKS,
  OUTER_PARKS,
  OUTER_SQUARES,
  PADS,
  PROMENADE,
  SQUARE_LAYOUTS,
  edgeDist,
  inTown,
  inside,
  offBridges,
  type Pt,
  type Rect,
} from '../src/scripts/city3d/outer';
import { DISTRICTS, PLOT_PRICE } from '../src/data/plots';
import { EW_ROADS, LANE, NS_ROADS, RIVER, RING_HI, SOUTH_ROAD } from '../src/scripts/city3d/layout';
import { distToStreet, type Street } from '../src/scripts/city3d/streetplan';

const street = (b: (typeof BENDS)[number]): Street => ({ id: b.id, kind: 'street', pts: b.pts, half: LANE, lanes: 1 });
const corners = (r: Rect): Pt[] => [
  [r[0], r[1]],
  [r[2], r[1]],
  [r[2], r[3]],
  [r[0], r[3]],
];
const gap = (a: Rect, b: Rect) => Math.max(a[0] - b[2], b[0] - a[2], a[1] - b[3], b[1] - a[3]);

test('the bends: gentle, convex curves that meet their avenues square at both ends', () => {
  const [park, south] = BENDS;
  for (const [b, avenue] of [
    [park, RING_HI],
    [south, SOUTH_ROAD],
  ] as const) {
    assert.equal(b.pts[0][1], avenue);
    assert.equal(b.pts.at(-1)![1], avenue);
    // Square to the avenue where they meet
    for (const [p, q] of [
      [b.pts[0], b.pts[1]],
      [b.pts.at(-1)!, b.pts.at(-2)!],
    ])
      assert.ok(Math.abs(q[0] - p[0]) < 0.2 * Math.abs(q[1] - p[1]), `${b.id} meets its avenue at an angle`);
    // Points about 2 apart, always turning the same way, and gently (never more than 20 degrees at a point)
    let sign = 0;
    for (let i = 2; i < b.pts.length; i++) {
      const [a, c, d] = [b.pts[i - 2], b.pts[i - 1], b.pts[i]];
      const l = Math.hypot(d[0] - c[0], d[1] - c[1]);
      assert.ok(l > 1.5 && l < 2.5, `${b.id} points ${l.toFixed(2)} apart`);
      const turn = Math.atan2((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0]), (c[0] - a[0]) * (d[0] - c[0]) + (c[1] - a[1]) * (d[1] - c[1]));
      assert.ok(Math.abs(turn) < 0.35, `${b.id} turns sharply at ${c}`);
      if (Math.abs(turn) > 1e-6) {
        if (!sign) sign = Math.sign(turn);
        assert.equal(Math.sign(turn), sign, `${b.id} wiggles at ${c}`);
      }
    }
  }
  // The Parkway stays north of the river, the loop south of it
  assert.ok(park.pts.every((p) => p[1] <= RING_HI + 1e-9));
  assert.ok(south.pts.every((p) => p[1] >= SOUTH_ROAD - 1e-9));
});

test('every plot and lot keeps its pad, on exactly one landscaped block, clear of every street', () => {
  // The plots haven't moved and cost the same
  assert.deepEqual(
    DISTRICTS.find((d) => d.id === 'N1'),
    { id: 'N1', name: 'North 1', ox: -18, oz: -18 }
  );
  assert.equal(PLOT_PRICE, 20_000_000);
  for (const p of PADS) assert.equal(OUTER_BLOCKS.filter((b) => b.pads.includes(p.id)).length, 1, `${p.id} is on one block`);
  const bends = BENDS.map(street);
  for (const b of OUTER_BLOCKS) {
    // Off the bends' asphalt and sidewalks, along every edge
    for (let i = 0; i < b.poly.length; i++) {
      const [p, q] = [b.poly[i], b.poly[(i + 1) % b.poly.length]];
      for (let t = 0; t <= 1; t += 0.1) {
        const pt: Pt = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
        for (const s of bends) assert.ok(distToStreet(s, pt) >= BEND_REACH - 1e-6, `${b.id} reaches onto ${s.id} at ${pt.map((v) => v.toFixed(1))}`);
      }
    }
    // Room round the pads for lawns: every block is much bigger than what stands on it
    const area = b.poly.reduce((a, p, i) => a + (b.poly[(i + 1) % b.poly.length][0] - p[0]) * (b.poly[(i + 1) % b.poly.length][1] + p[1]) * 0.5, 0);
    assert.ok(Math.abs(area) > b.pads.length * 81 * 2, `${b.id} is crowded`);
    for (const id of b.pads) assert.ok(inTown([PADS.find((p) => p.id === id)!.rect[0] + 4.5, PADS.find((p) => p.id === id)!.rect[1] + 4.5]));
  }
});

test('squares and pocket parks sit inside their blocks, clear of the pads', () => {
  const areas = [...OUTER_SQUARES.map((s) => ({ id: s.id, block: s.block, rect: s.rect })), ...OUTER_PARKS.map((p) => ({ id: p.id, block: p.block, rect: p.rect }))];
  for (const a of areas) {
    const b = OUTER_BLOCKS.find((q) => q.id === a.block)!;
    for (const c of corners(a.rect)) assert.ok(inside(b.poly, c) && edgeDist(b.poly, c) >= 0.8, `${a.id} reaches the edge of ${a.block}`);
    for (const p of PADS) assert.ok(gap(a.rect, p.rect) >= 1.5, `${a.id} crowds ${p.id}`);
  }
  for (let i = 0; i < areas.length; i++) for (let j = i + 1; j < areas.length; j++) assert.ok(gap(areas[i].rect, areas[j].rect) > 1, `${areas[i].id} and ${areas[j].id} overlap`);
  // What stands on a square stays on it, and the benches clear the centrepiece, the planters and the kiosk
  for (const l of SQUARE_LAYOUTS) {
    const r = l.square.rect;
    const on = (p: Pt, m = 0) => p[0] > r[0] + m && p[0] < r[2] - m && p[1] > r[1] + m && p[1] < r[3] - m;
    for (const p of [...l.planters, ...l.lamps, ...l.bollards, ...l.uplights, ...l.benches.map((q) => q.at)]) assert.ok(on(p, 0.3), `${l.square.id}: ${p} is off the square`);
    // Uplights between the centrepiece and the benches, bollards clear of everything else
    for (const u of l.uplights) for (const q of l.benches) assert.ok(Math.hypot(u[0] - q.at[0], u[1] - q.at[1]) > 0.6);
    for (const p of l.bollards) for (const q of [...l.planters, ...l.lamps, ...l.benches.map((q) => q.at)]) assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.8, `${l.square.id}: bollard at ${p} crowds ${q}`);
    for (const q of l.benches) {
      assert.ok(Math.hypot(q.at[0] - l.centre[0], q.at[1] - l.centre[1]) > l.feature.half + 0.8);
      for (const p of l.planters) assert.ok(Math.hypot(q.at[0] - p[0], q.at[1] - p[1]) > 1.1);
      if (l.kiosk) assert.ok(gap([q.at[0] - 0.45, q.at[1] - 0.45, q.at[0] + 0.45, q.at[1] + 0.45], l.kiosk) > 0.2);
    }
  }
  assert.deepEqual(OUTER_SQUARES.map((s) => s.feature).sort(), ['bandstand', 'clock', 'fountain', 'statue']);
});

test('lawn trees are on the blocks, off the pads, the squares and the parks', () => {
  assert.ok(LAWN_TREES.length > 80);
  const busy = [...PADS.map((p) => p.rect), ...OUTER_SQUARES.map((s) => s.rect), ...OUTER_PARKS.map((p) => p.rect)];
  for (const t of LAWN_TREES) {
    assert.ok(
      OUTER_BLOCKS.some((b) => inside(b.poly, t) && edgeDist(b.poly, t) > 1),
      `tree at ${t} is off its block`
    );
    assert.ok(
      busy.every((r) => gap([t[0], t[1], t[0], t[1]], r) > 1),
      `tree at ${t} is in the way`
    );
  }
});

test("the bends' outer sidewalks: outside the town, off every straight road", () => {
  assert.ok(BEND_KERBS.length > 100);
  for (const k of BEND_KERBS)
    for (const [x, z] of k) {
      for (const r of NS_ROADS) assert.ok(Math.abs(x - r.c) >= r.half - 1e-6, 'a kerb on a road');
      for (const r of EW_ROADS) assert.ok(Math.abs(z - r.c) >= r.half - 1e-6, 'a kerb on a road');
    }
});

test('the promenade runs along both banks, its decks clear of the bridges', () => {
  assert.ok(PROMENADE.north[1] <= RIVER[0] && PROMENADE.south[0] >= RIVER[1]);
  assert.ok(PROMENADE.north[1] - PROMENADE.north[0] > 2 && PROMENADE.south[1] - PROMENADE.south[0] > 1.5);
  for (const j of JETTIES) {
    assert.ok(offBridges(j.x, 1.5), `deck at ${j.x} on a bridge`);
    assert.ok(j.x > PROMENADE.x[0] + 2 && j.x < PROMENADE.x[1] - 2);
  }
});
