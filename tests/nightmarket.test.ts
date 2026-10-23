// The Night Market (nightmarket.ts, the owner's call): its deck out over the water in front of Harbor Stores, open
// to the boardwalk; the stalls along its water side, their counters facing the city, the tables between, the gantry
// over the boardwalk; walkable round it all, the boardwalk's strollers past it, the boats clear, its solids in
// SOLIDS, and a place to walk in at.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DINERS,
  GANTRY,
  HEATERS,
  MARKET_RAILS,
  MARKET_SPAWN,
  NIGHT_MARKET_SOLIDS,
  POLES,
  QUEUE,
  STALLS,
  STALL_NAMES,
  STRINGS,
  TABLES,
  VENDORS,
  WALK_FROM,
} from '../src/scripts/city3d/nightmarket';
import { BENCHES, BOARDWALK, BOLLARDS, LAMPS, MARKET_DECK, PLANTERS, RAIL_GAPS, STROLL, boatZ, onDeck } from '../src/scripts/city3d/waterfront';
import { RIVER } from '../src/scripts/city3d/layout';
import { STORES } from '../src/scripts/city3d/riverside';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLACES } from '../src/scripts/city3d/places';
import { outset } from '../src/scripts/city3d/streetplan';
import { overlaps } from '../src/scripts/city3d/commons';
import type { Rect } from '../src/scripts/city3d/downtown';

const [MX0, MZ0, MX1, MZ1] = MARKET_DECK;
const [, BZ0, , BZ1] = BOARDWALK;
const R = 0.3;
const BEAM = 0.3;
const inside = (x: number, z: number, b: Rect, m = 0) => x > b[0] + m && x < b[2] - m && z > b[1] + m && z < b[3] - m;
const solidAt = (x: number, z: number, m: number) => SOLIDS.some((s) => s[4] > 0.3 && inside(x, z, [s[0], s[1], s[2], s[3]], -m));

test('the deck: out over the water in front of Harbor Stores, joining the boardwalk along its whole length', () => {
  assert.ok(MZ1 === BZ0 && MZ0 < BZ0 - 4 && MZ0 > RIVER[0] + 3, 'out over the water, clear of the north bank');
  assert.ok(MX0 >= STORES.lot[0] && MX1 - MX0 > 24, "along Harbor Stores' front");
  assert.deepEqual(RAIL_GAPS[1], [MX0, MX1]);
  // the railing round its water sides
  assert.ok(MARKET_RAILS.length === 3 && MARKET_RAILS.every((r) => r[1] === MZ0));
  // the boardwalk's dressing keeps off its length
  for (const [x] of [...LAMPS, ...BENCHES, ...PLANTERS]) assert.ok(x < MX0 - 0.5 || x > MX1 + 0.5, `${x}`);
  for (const x of BOLLARDS) assert.ok(x < MX0 || x > MX1);
});

test('the stalls: containers, trucks and a cart on the deck, each named, counters facing the city, under the Emporium', () => {
  assert.ok(STALLS.filter((s) => s.kind === 'container').length === 4 && STALLS.filter((s) => s.kind === 'truck').length === 2 && STALLS.some((s) => s.kind === 'cart'));
  assert.deepEqual(
    STALLS.map((s) => s.name),
    [...STALL_NAMES],
  );
  for (const s of STALLS) {
    assert.ok(inside(s.rect[0], s.rect[1], MARKET_DECK, -1e-6) && inside(s.rect[2], s.rect[3], MARKET_DECK, -1e-6), s.name);
    assert.ok(s.rect[1] > MZ0 + 0.2, 'off the railing');
    assert.ok(Math.abs(s.front - s.rect[3]) < 1e-6 && s.h < 2.5);
  }
  for (let i = 1; i < STALLS.length; i++) assert.ok(STALLS[i].rect[0] > STALLS[i - 1].rect[2] + 0.5, 'apart');
});

test('the tables between the queues and the boardwalk, apart; the walk clear behind them', () => {
  assert.ok(TABLES.length >= 12);
  const queueZ = Math.max(...QUEUE.map((q) => q.z));
  for (const t of TABLES) {
    assert.ok(onDeck(t.rect[0], t.rect[1]) && onDeck(t.rect[2], t.rect[3]) && t.rect[0] > MX0 && t.rect[2] < MX1);
    assert.ok(t.rect[1] > queueZ + R, 'past the queue');
    for (const o of TABLES) if (o !== t) assert.ok(!overlaps(t.rect, o.rect));
  }
  assert.ok(WALK_FROM < BZ0 + 1.5, "most of the boardwalk's width left");
  // walkable along the deck between the queues and the tables, and along the boardwalk behind them
  for (let x = MX0 + 0.5; x < MX1 - 0.5; x += 0.2) {
    assert.ok(onDeck(x, WALK_FROM + 0.4, R) && !solidAt(x, WALK_FROM + 0.4, R), `the walk at ${x}`);
  }
});

test("the gantry over the boardwalk: its posts clear of the strollers' lanes, the string lights from the stalls to the poles", () => {
  assert.ok(GANTRY.z > BZ0 + 1 && GANTRY.z < BZ1 && GANTRY.half * 2 > GANTRY.board.w && GANTRY.h < 12 && GANTRY.board.y + GANTRY.board.h / 2 < GANTRY.h);
  for (const inset of [0.16, 0.62]) {
    const loop = outset(STROLL, inset);
    for (const [x, z] of loop) for (const p of POLES) if (Math.abs(x - p[0]) < 1) assert.ok(Math.abs(z - p[1]) > 0.5);
    // the long sides of the loop (z) clear of the tables and the posts
    const zs = loop.map(([, z]) => z);
    assert.ok(Math.min(...zs) > WALK_FROM - 0.2 + R && Math.max(...zs) < GANTRY.z - GANTRY.post / 2 - R);
  }
  assert.ok(STRINGS.length === STALLS.length * 2);
  for (const [a, b] of STRINGS) assert.ok(POLES.some((p) => p[0] === b[0] && p[1] === b[1]) && onDeck(a[0], a[1]));
  for (const [x, z] of HEATERS) assert.ok(onDeck(x, z, 0.3));
});

test('its people: cooks in the stalls, queues at the counters, diners on the benches, all on the deck', () => {
  assert.equal(VENDORS.length, STALLS.length);
  STALLS.forEach((s, i) => assert.ok(VENDORS[i].x > s.rect[0] && VENDORS[i].x < s.rect[2]));
  assert.ok(QUEUE.length >= 8 && DINERS.length >= 15);
  for (const p of [...VENDORS, ...QUEUE, ...DINERS]) assert.ok(onDeck(p.x, p.z, 0.15), `${p.x}, ${p.z}`);
  for (const q of QUEUE) assert.ok(!solidAt(q.x, q.z, 0.15), 'a queue in a stall');
});

test('the boats keep clear: the middle lane swings north round the deck', () => {
  for (let x = MX0 - 2; x <= MX1 + 2; x += 0.25) assert.ok(boatZ(1, x) + BEAM < MZ0 - 0.5, `${x}`);
});

test("what's solid is in SOLIDS, on the deck; Walk in on the boardwalk, clear, a place on the map", () => {
  for (const s of NIGHT_MARKET_SOLIDS) {
    assert.ok(SOLIDS.includes(s) && s[0] < s[2] && s[1] < s[3] && s[4] < 12);
    assert.ok(onDeck((s[0] + s[2]) / 2, (s[1] + s[3]) / 2));
    for (const o of SOLIDS) if (!NIGHT_MARKET_SOLIDS.includes(o)) assert.ok(!overlaps([s[0], s[1], s[2], s[3]], [o[0], o[1], o[2], o[3]]), `${s.join()} in ${o.join()}`);
  }
  assert.ok(onDeck(MARKET_SPAWN.x, MARKET_SPAWN.z, R) && !solidAt(MARKET_SPAWN.x, MARKET_SPAWN.z, R));
  const pl = PLACES.find((p) => p.id === 'nightmarket')!;
  assert.equal(pl.spot, 'nightmarket');
  assert.deepEqual(pl.at, MARKET_SPAWN);
});
