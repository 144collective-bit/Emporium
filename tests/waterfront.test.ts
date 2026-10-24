// The Trenches' waterfront (waterfront.ts, the owner's pick): the boardwalk from the bank avenue's kerb out over
// the water, Pier 7 out from it, the old docks; walkable end to end (a walker's middle always on a deck), the boats
// clear of it all, its dressing on the deck, its solids in SOLIDS, and a place to walk in at.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCH,
  BARGE,
  BENCHES,
  BINOCULARS,
  BOARDWALK,
  BOLLARDS,
  CRANE,
  DECKS,
  DECK_Y,
  FISHERS,
  KIOSK,
  LAMPS,
  MARKET_DECK,
  OUT,
  PIER,
  PIER_SPAWN,
  PLANTERS,
  STROLL,
  WATERFRONT_SOLIDS,
  boatZ,
  onDeck,
} from '../src/scripts/city3d/waterfront';
import { EW_ROADS, RIVER } from '../src/scripts/city3d/layout';
import { inWater } from '../src/scripts/city3d/river';
import { BOAT_LANES, LIBERTY_RECTS } from '../src/scripts/city3d/liberty';
import { PROMENADE } from '../src/scripts/city3d/outer';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLACES } from '../src/scripts/city3d/places';
import { PLAN, distToStreet, outset } from '../src/scripts/city3d/streetplan';
import { overlaps } from '../src/scripts/city3d/commons';
import type { Rect } from '../src/scripts/city3d/downtown';

const BANK = EW_ROADS[EW_ROADS.length - 1];
const roads = PLAN.streets.filter((s) => s.kind !== 'alley');
const [BX0, BZ0, BX1, BZ1] = BOARDWALK;
/** Degen's radius in walk mode (walk.ts RADIUS, padded) and a boat's half beam and half length (life.ts) */
const R = 0.3;
const BEAM = 0.3;
const inside = (x: number, z: number, b: Rect, m = 0) => x > b[0] + m && x < b[2] - m && z > b[1] + m && z < b[3] - m;

test('the boardwalk: from the kerb out over the water, from the slip lanes to the promenade, off every street', () => {
  assert.ok(Math.abs(BZ1 - (BANK.c - BANK.half)) < 1e-6, 'from the kerb');
  assert.ok(Math.abs(BZ0 - (RIVER[1] - OUT)) < 1e-6 && OUT >= 2, 'out over the water');
  assert.ok(Math.abs(BX1 - PROMENADE.x[0]) < 1e-6, 'meeting the promenade');
  assert.ok(BX1 - BX0 > 140);
  for (const s of roads)
    for (let x = BX0; x <= BX1; x += 2) for (const z of [BZ0, BZ1 - 0.01]) assert.ok(distToStreet(s, [x, z]) > s.half - 1e-6, `the boardwalk on ${s.id} at ${x}`);
  for (const r of LIBERTY_RECTS) assert.ok(r[0] > BX1, 'clear of Liberty Bridge');
});

test('Pier 7: out from the boardwalk into the river, its head across the neck, clear of the north bank', () => {
  const { neck, head } = PIER;
  assert.ok(Math.abs(neck[3] - BZ0) < 1e-6 && Math.abs(head[3] - neck[1]) < 1e-6);
  assert.ok(head[0] < neck[0] && head[2] > neck[2] && head[1] > RIVER[0] + 3);
  assert.ok((neck[0] + neck[2]) / 2 === PIER.x && (head[0] + head[2]) / 2 === PIER.x);
  // The arch's posts either side of the neck's mouth, on the boardwalk; the kiosk on the head
  assert.ok(ARCH.x0 < neck[0] && ARCH.x1 > neck[2] && ARCH.z > BZ0 && ARCH.z < BZ0 + 1);
  assert.ok(inside(KIOSK.c[0], KIOSK.c[1], head, KIOSK.r - 0.01));
  for (const f of FISHERS) assert.ok(inside(f.x, f.z, head, 0.3), 'fishing from the head');
});

test('walkable end to end: along the boardwalk, out along the pier, round its head (a walker always on a deck)', () => {
  for (let x = BX0 + 0.5; x < BX1 - 0.5; x += 0.25) for (const z of [BZ0 + 0.4, (BZ0 + BZ1) / 2, BZ1 - 0.4]) assert.ok(onDeck(x, z, R), `on the boardwalk at ${x}, ${z}`);
  for (let z = BZ1 - 0.5; z > PIER.head[1] + 0.5; z -= 0.1) assert.ok(onDeck(PIER.x, z, R), `out along the pier at ${z}`);
  for (let x = PIER.head[0] + 0.5; x < PIER.head[2] - 0.5; x += 0.1) assert.ok(onDeck(x, PIER.head[1] + 0.5, R), `round the head at ${x}`);
  // ...and nowhere off them over the water
  assert.ok(!onDeck(PIER.x, PIER.head[1] - 0.2) && !onDeck(PIER.neck[0] - 0.5, BZ0 - 1) && !onDeck(BX1 + 1, BZ0 + 0.5));
  assert.ok(DECKS.length === 4 && DECK_Y > 0.035 && DECK_Y < 0.2);
});

test('the boats keep clear: every lane in the water, the lanes apart, the south lane round the head and the market, off the boardwalk', () => {
  for (let x = -420; x <= 460; x += 0.5) {
    const z = [0, 1, 2].map((l) => boatZ(l, x));
    for (const q of z) assert.ok(inWater(x, q, BEAM + 0.5), `a lane out of the water at ${x}`);
    assert.ok(z[1] - z[0] > 2 * BEAM + 1 && z[2] - z[1] > 2 * BEAM + 1, `the lanes on each other at ${x}`);
    if (x > BX0 - 2 && x < BX1 + 2) {
      assert.ok(z[2] + BEAM < BZ0 - 1, `the south lane on the boardwalk at ${x}`);
      if (x > PIER.head[0] - 2 && x < PIER.head[2] + 2) assert.ok(z[2] + BEAM < PIER.head[1] - 0.5, `the south lane on the pier at ${x}`);
      if (x > BARGE[0] - 2 && x < BARGE[2] + 2) assert.ok(z[2] + BEAM < BARGE[1] - 0.5, `the south lane on the barge at ${x}`);
      if (x > MARKET_DECK[0] - 2 && x < MARKET_DECK[2] + 2) assert.ok(z[2] + BEAM < MARKET_DECK[1] - 0.5, `the south lane on the market at ${x}`);
    }
    // (straight under Liberty Bridge, through its arches)
    if (x > -40 && x < -13) assert.deepEqual(z, BOAT_LANES, "through Liberty Bridge's arches");
  }
});

test("the dressing: lamps, benches, binoculars, planters and bollards on the deck, none in the pier's mouth or under the crane", () => {
  const clear = (x: number) => (x < ARCH.x0 - 0.5 || x > ARCH.x1 + 0.5) && (x < CRANE.portal[0] - 0.2 || x > CRANE.portal[2] + 0.2);
  for (const [x, z] of [...LAMPS, ...BENCHES, ...PLANTERS]) {
    assert.ok(inside(x, z, BOARDWALK, 0.3) && clear(x), `${x}, ${z}`);
  }
  for (const x of BOLLARDS) assert.ok(clear(x) && x > BX0 && x < BX1);
  for (const [x, z] of BINOCULARS) assert.ok(onDeck(x, z, 0.2));
  assert.ok(LAMPS.length > 10 && BENCHES.length > 10);
});

test("the old docks: the crane's legs on the boardwalk (you walk through its portal), its jib over the water and the barge", () => {
  for (const l of CRANE.legs) assert.ok(inside(l[0], l[1], BOARDWALK, -1e-6) && inside(l[2], l[3], BOARDWALK, -1e-6));
  assert.ok(CRANE.portal[3] - CRANE.portal[1] > 2.5, 'room to walk through');
  assert.ok(CRANE.jib.to < BZ0 && CRANE.jib.to > BARGE[1] && CRANE.jib.to < BARGE[3]);
  assert.ok(BARGE[3] < BZ0 && BARGE[1] > RIVER[0] + 3 && CRANE.cx > BARGE[0] && CRANE.cx < BARGE[2]);
  assert.ok(CRANE.top < 12);
});

test('people stroll it: their lanes round the loop stay on the deck and clear of the crane', () => {
  for (const inset of [0.16, 0.62]) {
    const loop = outset(STROLL, inset);
    for (const [x, z] of loop) assert.ok(onDeck(x, z, 0.2), `a stroll at ${x}, ${z}`);
    for (const l of CRANE.legs) for (const [, z] of loop) assert.ok(z < l[1] - 0.2 || z > l[3] + 0.2, 'past the crane');
  }
});

test("what's solid is in SOLIDS, off the streets; Walk in on the deck, clear, a place on the map", () => {
  for (const s of WATERFRONT_SOLIDS) {
    assert.ok(SOLIDS.includes(s) && s[0] < s[2] && s[1] < s[3] && s[4] < 12);
    assert.ok(onDeck((s[0] + s[2]) / 2, (s[1] + s[3]) / 2));
    for (const r of roads) for (const p of [[s[0], s[1]] as [number, number], [s[2], s[3]] as [number, number]]) assert.ok(distToStreet(r, p) > r.half - 1e-6);
    for (const o of SOLIDS) if (!WATERFRONT_SOLIDS.includes(o)) assert.ok(!overlaps([s[0], s[1], s[2], s[3]], [o[0], o[1], o[2], o[3]]), `${s.join()} in ${o.join()}`);
  }
  assert.ok(onDeck(PIER_SPAWN.x, PIER_SPAWN.z, R));
  for (const s of SOLIDS) if (s[4] > 0.3) assert.ok(!inside(PIER_SPAWN.x, PIER_SPAWN.z, [s[0], s[1], s[2], s[3]], -R), `the spawn in ${s.join()}`);
  const pl = PLACES.find((p) => p.id === 'pier')!;
  assert.equal(pl.spot, 'pier');
  assert.deepEqual(pl.at, PIER_SPAWN);
});
