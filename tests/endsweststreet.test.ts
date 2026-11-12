// Endswood carried west, the estate round the terraces (endsweststreet.ts, docs/ends-west-plan.md Phase 3, the
// owner's picks: a parade of shops with flats over, a fenced playground and a kickabout green with goals, lock-up
// garages with a few doors up): all of it on the blocks' east ends Phase 1 kept, the parade fronting the Close, the
// playground's gate open onto the cross path, the goals facing each other, the garages onto their apron off the Close,
// nothing solid on a path, a lane, a court, a green, a row or a lamp, every name made up and under the Emporium.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COURTS, CROSS_PATHS, GARDENS, GREENS, LANES, N_EDGE, PATHS, RESERVE, ROWS, S_EDGE, WEST_LAMPS } from '../src/scripts/city3d/endswest';
import { CORNER_SHOPS, PARADE_UNITS } from '../src/scripts/city3d/endsstreet';
import { TERRACE_SOLIDS } from '../src/scripts/city3d/endsterraces';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import {
  APRON,
  BENCHES_W,
  BIN_STORES_W,
  BOARD_W,
  CANOPY_W,
  CCTV_W,
  FLATS,
  GARAGES,
  GARAGE_N,
  GARAGE_W,
  GOAL,
  GOALS,
  KICKABOUT,
  PARADE_STAIR,
  PARADE_W,
  PLAY_FENCE,
  PLAY_W,
  ROUNDABOUT,
  SLIDE,
  SPRINGERS,
  STREET_W_SOLIDS,
  SWINGS,
  UNITS_W,
  unitAt,
} from '../src/scripts/city3d/endsweststreet';

type Rect = readonly number[];
const within = (r: Rect, o: Rect, m = 1e-6) => r[0] >= o[0] - m && r[1] >= o[1] - m && r[2] <= o[2] + m && r[3] <= o[3] + m;
const inside = (r: Rect, x: number, z: number, m = 0) => x >= r[0] - m && x <= r[2] + m && z >= r[1] - m && z <= r[3] + m;
const overlap = (a: Rect, b: Rect, m = 0) => a[0] < b[2] - m && a[2] > b[0] + m && a[1] < b[3] - m && a[3] > b[1] + m;
const [NR, SR] = RESERVE;
// (the south reserve reaches up to the Close's block edge for the apron and the bin store by it)
const SOUTH: Rect = [SR[0], S_EDGE, SR[2], SR[3]];

test('the parade: four units on the Close, flats over them, made-up names, the fourth to let', () => {
  assert.ok(within(PARADE_W.rect, NR));
  assert.ok(N_EDGE - PARADE_W.front <= 2, 'the parade fronts the Close');
  assert.equal(UNITS_W.length, 4);
  assert.equal(UNITS_W.filter((u) => u.shut).length, 1);
  const old = new Set([...PARADE_UNITS.map((u) => u.name), ...CORNER_SHOPS.map((s) => s.name)]);
  assert.equal(new Set(UNITS_W.map((u) => u.name)).size, UNITS_W.length);
  for (const u of UNITS_W) assert.ok(!old.has(u.name), `${u.name} is the old parade's`);
  for (let k = 0; k < UNITS_W.length; k++) {
    const [a, c] = unitAt(k);
    assert.ok(c - a > 2.2, 'a unit wide enough for a shop');
  }
  assert.ok(FLATS >= 1);
  assert.ok(PARADE_W.top > CANOPY_W.y + 1.5 && PARADE_W.top < EMPORIUM_ROOF);
  assert.ok(CANOPY_W.y > 1.1, 'the canopy over a walker');
  assert.ok(PARADE_W.front + CANOPY_W.out < N_EDGE, 'the canopy over the forecourt, short of the sidewalk');
  assert.ok(!overlap(PARADE_STAIR, PARADE_W.rect));
});

test('the playground: fenced on the north reserve, its gate open onto the cross path, the kit inside', () => {
  assert.ok(within(PLAY_W.rect, NR));
  // (the gate: a gap in the west fence facing the cross path)
  const west = PLAY_FENCE.filter((r) => r[2] - r[0] < 0.2 && Math.abs(r[0] - PLAY_W.rect[0] + 0.04) < 1e-6);
  assert.equal(west.length, 2);
  const gap = Math.min(...west.map((r) => r[1]).filter((z) => z > PLAY_W.gate.z)) - Math.max(...west.map((r) => r[3]).filter((z) => z < PLAY_W.gate.z));
  assert.ok(gap >= 1.2, `the gate ${gap} wide`);
  assert.ok(CROSS_PATHS.some((p) => p[0] < PLAY_W.rect[0] && PLAY_W.gate.z > p[1] && PLAY_W.gate.z < p[3]), 'the gate onto the cross path');
  for (const r of [SWINGS, SLIDE]) assert.ok(within(r, PLAY_W.rect, -0.3), 'the kit inside the fence');
  for (const [x, z] of [ROUNDABOUT.c, ...SPRINGERS]) assert.ok(inside(PLAY_W.rect, x, z, -0.8));
  assert.ok(!overlap(PLAY_W.rect, PARADE_W.rect));
});

test('the green: on the south reserve, a goal at each end facing the other, room to play between', () => {
  assert.ok(within(KICKABOUT, SOUTH));
  assert.equal(GOALS.length, 2);
  const [a, c] = [...GOALS].sort((p, q) => p.at[1] - q.at[1]);
  assert.ok(a.faces > 0 && c.faces < 0, 'facing each other');
  assert.ok(c.at[1] - a.at[1] > 20);
  for (const g of GOALS) assert.ok(inside(KICKABOUT, g.at[0] - GOAL.w / 2, g.at[1] - g.faces * GOAL.d, -0.5) && inside(KICKABOUT, g.at[0] + GOAL.w / 2, g.at[1], -0.5));
  assert.ok(!overlap(KICKABOUT, APRON) && !overlap(KICKABOUT, GARAGES.rect));
});

test('the garages: a row of lock-ups facing their apron, the apron off the Close, a few doors up', () => {
  assert.ok(within(GARAGES.rect, SOUTH));
  assert.ok(Math.abs(GARAGES.rect[3] - GARAGES.rect[1] - GARAGE_N * GARAGE_W) < 1e-6);
  assert.ok(GARAGE_N >= 6);
  assert.ok(GARAGES.open.length >= 2 && GARAGES.open.length <= GARAGE_N / 2);
  for (const i of GARAGES.open) assert.ok(i >= 0 && i < GARAGE_N);
  assert.ok(Math.abs(APRON[2] - GARAGES.rect[0]) < 1e-6, 'the doors onto the apron');
  assert.ok(APRON[1] - S_EDGE < 0.5 && APRON[3] >= GARAGES.rect[3], 'the apron from the Close past the last door');
  assert.ok(GARAGES.h < 2 && GARAGES.h > 1.1);
});

test('the bin stores, the board, the CCTV and the benches: on the reserves, by what they serve', () => {
  for (const s of BIN_STORES_W) assert.ok(within(s.rect, NR) || within(s.rect, SOUTH));
  assert.ok(Math.abs(BOARD_W.at[1] - N_EDGE) < 1.2, 'the board by the Close');
  assert.ok(CCTV_W.length >= 2);
  for (const { at: [x, z] } of BENCHES_W) assert.ok(inside(NR, x, z) || inside(SOUTH, x, z));
});

test('what is solid: off every path, lane, court, green, row, garden and the terraces, clear of every lamp', () => {
  for (const b of STREET_W_SOLIDS) {
    assert.ok(b[2] > b[0] && b[3] > b[1] && b[4] > 0.3 && b[4] < EMPORIUM_ROOF);
    for (const r of [...PATHS, ...CROSS_PATHS, ...LANES, ...COURTS, ...GREENS, ...GARDENS, ...ROWS.map((r) => r.rect)]) assert.ok(!overlap(b, r, 0.01), `a solid at ${b.slice(0, 4)} on ${r}`);
    for (const t of TERRACE_SOLIDS) assert.ok(!overlap(b, t), `a solid at ${b.slice(0, 4)} on a terrace's at ${t.slice(0, 4)}`);
    for (const [x, z] of WEST_LAMPS) assert.ok(!inside(b, x, z, 0.3), `a lamp at ${x}, ${z} in a solid`);
  }
});
