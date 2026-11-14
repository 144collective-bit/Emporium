// The Field (lot9camp.ts, docs/trailer-plan.md's polish round): Lot 9's camp, moved as a block (the owner's call,
// 2026-11-14) from west of the park to the land just south of it. Its track comes in off the park's south lane through
// the gap in the park's old south side and down the strip, through the camp's east side's gap; every pitch and the
// commons stand in the Field, off the track and clear of each other, the trees, the lamps and everything else solid;
// every kind of stay is there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMP_C, CAMP_SHIFT, CAMP_X1, FIELD, FIELD_TREES, INNER_GAPS, INNER_RUNS, LANE_HALF, LANE_S, LOOP_E, LOT9_LAMPS, LOT9_SOLIDS, MOVED, PARK, PARK_GAPS, TRACK_HALF, TRACK_LOOP, TRACK_SPUR, fromTrack, inField, inLoop, inLot9Fence,
} from '../src/scripts/city3d/lot9';
import { HOME_SOLIDS, POLE_SOLIDS } from '../src/scripts/city3d/lot9homes';
import {
  BEDS, CAMP_CARS, CAMP_DOGS, CAMP_PEOPLE, CAMP_SOLIDS, CIRCLE, COMMON_SOLIDS, COOP, COOP_RUN, CORRAL, DUMPSTERS, FIELD_ARCH, GARDEN, GATE_SOLIDS, GRILL, KITCHEN, LOGS, NOTICE, PITCHES, PITCH_SOLIDS, POTTIES, SHOWERS,
  SHOWER_DOORS, SINK, STANDPIPE, TROUGH, WASHING, WOODPILE, aabbOf, cornersOf, crosses, inner, type Item,
} from '../src/scripts/city3d/lot9camp';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { CARS } from '../src/scripts/city3d/carspec';

const overlap = (a: readonly number[], b: readonly number[], m = 0) => a[0] < b[2] - m && a[2] > b[0] + m && a[1] < b[3] - m && a[3] > b[1] + m;
const inRect = (r: readonly number[], x: number, z: number, m = 0) => x > r[0] + m && x < r[2] - m && z > r[1] + m && z < r[3] - m;

test("the Field: inside the fence, south of the park; its track in off the park's south lane, down the strip and through the gap, a loop round the commons", () => {
  for (const [x, z] of [[FIELD[0], FIELD[1]], [FIELD[2], FIELD[1]], [FIELD[0], FIELD[3]], [FIELD[2], FIELD[3]]]) assert.ok(inLot9Fence(x, z, -0.5), `${x}, ${z}`);
  assert.ok(FIELD[1] > PARK[3] + 5 && FIELD[2] < CAMP_X1 && FIELD[0] > PARK[0]);
  // (the spur starts on the south lane's gravel at the park's south-east loop corner, south through the gap in the
  // park's old south side, down the strip east of the camp, and crosses the camp's east side inside its gap)
  assert.ok(Math.abs(TRACK_SPUR[0][0] - LOOP_E) < LANE_HALF && Math.abs(TRACK_SPUR[0][1] - LANE_S) < LANE_HALF);
  const south = TRACK_SPUR.find((p) => p[1] === PARK[3])!;
  assert.ok(PARK_GAPS.some(([g0, g1]) => south[0] - TRACK_HALF > g0 && south[0] + TRACK_HALF < g1), 'through the park side gap');
  for (const p of TRACK_SPUR) if (p[1] > PARK[3]) assert.ok(inField(p[0], p[1]) || (p[0] > CAMP_X1 - 1e-6 && p[0] < PARK[2] - TRACK_HALF - 1), `the spur at ${p} off the strip`);
  for (let i = 1; i < TRACK_SPUR.length; i++) assert.ok(TRACK_SPUR[i][1] > TRACK_SPUR[i - 1][1] || TRACK_SPUR[i][0] < TRACK_SPUR[i - 1][0], 'south, then west');
  const cross = TRACK_SPUR.find((p) => Math.abs(p[0] - CAMP_X1) < 1e-6)!;
  assert.ok(cross[1] - TRACK_HALF > INNER_GAPS[1][0] && cross[1] + TRACK_HALF < INNER_GAPS[1][1], 'through the gap');
  // The old line's runs leave both gaps open
  for (const [a, c] of INNER_RUNS) for (const [g0, g1] of INNER_GAPS) assert.ok(Math.max(a[1], c[1]) <= g0 + 1e-6 || Math.min(a[1], c[1]) >= g1 - 1e-6);
  // The loop stays in the Field with room for pitches outside it, closed
  for (const [x, z] of TRACK_LOOP) assert.ok(inRect(FIELD, x, z, 9), `${x}, ${z}`);
  assert.deepEqual(TRACK_LOOP[0], TRACK_LOOP[TRACK_LOOP.length - 1]);
  assert.ok(inLoop(SHOWERS.rect[0], SHOWERS.rect[1]) && inLoop(CIRCLE.x, CIRCLE.z) && inLoop(KITCHEN[2], KITCHEN[3]), 'the commons inside the loop');
});

test('the pitches: many, every kind of stay, each in the Field, off the track and clear of the trees and lamps', () => {
  assert.ok(PITCHES.length >= 30, `${PITCHES.length} pitches`);
  const kinds = new Set(PITCHES.map((p) => p.kind));
  for (const k of ['dome', 'ridge', 'cabin', 'trailer', 'teardrop', 'shack', 'bus', 'van'] as const) assert.ok(kinds.has(k), k);
  const things = new Set(PITCHES.flatMap((p) => p.items.map((i) => i.kind)));
  for (const k of ['fire', 'chair', 'canopy', 'table', 'line', 'cooler', 'jerry', 'generator', 'wood', 'lantern', 'solar', 'pallets', 'flag', 'stake', 'awning'] as const) assert.ok(things.has(k), k);
  assert.ok(PITCHES.flatMap((p) => p.items).filter((i) => i.kind === 'fire' && i.lit).length >= 6, 'fires burning');
  for (const p of PITCHES)
    for (const it of p.items) {
      for (const [x, z] of cornersOf(it)) {
        assert.ok(inRect(FIELD, x, z, 0.5), `${p.id} ${it.kind} out of the Field`);
        assert.ok(fromTrack(x, z) > TRACK_HALF + 0.1, `${p.id} ${it.kind} on the track`);
      }
      const box = aabbOf(it);
      for (const [x, z] of FIELD_TREES) assert.ok(!inRect(box, x, z, -0.5), `${p.id} ${it.kind} on a tree`);
      for (const [x, z] of LOT9_LAMPS) assert.ok(!inRect(box, x, z, -0.5), `${p.id} ${it.kind} on a lamp`);
      assert.ok(it.h < EMPORIUM_ROOF);
    }
});

test("a pitch's things keep clear of each other (but what stands on or under another), and of the other pitches'", () => {
  const stacks = (a: Item, b: Item) => {
    const k = new Set([a.kind, b.kind]);
    return (k.has('canopy') && (k.has('table') || k.has('stove'))) || (k.has('table') && k.has('stove'));
  };
  for (const p of PITCHES)
    for (let i = 0; i < p.items.length; i++)
      for (let j = i + 1; j < p.items.length; j++) {
        const [a, b] = [p.items[i], p.items[j]];
        if (stacks(a, b)) continue;
        assert.ok(!crosses(a, b), `${p.id}: ${a.kind} / ${b.kind}`);
      }
  for (let i = 0; i < PITCHES.length; i++)
    for (let j = i + 1; j < PITCHES.length; j++)
      for (const a of PITCHES[i].items) for (const b of PITCHES[j].items) assert.ok(!crosses(a, b), `${PITCHES[i].id} ${a.kind} / ${PITCHES[j].id} ${b.kind}`);
  // The cars: each clear of every pitch's things and every other car
  const cars = CAMP_CARS.map(([id, x, z, ry]) => ({ x, z, ry, w: CARS[id].L, d: CARS[id].W }));
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) assert.ok(!crosses(cars[i], cars[j]), `car ${i} / car ${j}`);
    for (const p of PITCHES) for (const it of p.items) assert.ok(!crosses(cars[i], it) || it.kind === 'awning', `car ${i} / ${p.id} ${it.kind}`);
    for (const [x, z] of cornersOf(cars[i])) assert.ok(fromTrack(x, z) > TRACK_HALF, `car ${i} on the track`);
  }
});

test("its solids: the commons', the pitches', the cars', the gate's; under the Emporium, clear of everything else solid, never solid where nothing is", () => {
  for (const b of CAMP_SOLIDS) {
    assert.ok(b[4] < EMPORIUM_ROOF);
    for (const o of [...SOLIDS, ...HOME_SOLIDS, ...POLE_SOLIDS]) assert.ok(!overlap(b, o, 0.02), `${b} / ${o}`);
    assert.ok(!SOLIDS.includes(b), 'joined with the chunk, not the boot');
  }
  for (const b of [...COMMON_SOLIDS, ...PITCH_SOLIDS]) assert.ok(inRect(FIELD, (b[0] + b[2]) / 2, (b[1] + b[3]) / 2), `${b} in the Field`);
  for (const b of GATE_SOLIDS) assert.ok(inRect(PARK, (b[0] + b[2]) / 2, (b[1] + b[3]) / 2) && (b[0] + b[2]) / 2 > -30, `${b} by the gate`);
  // (each pitch thing's solid squares are inside the thing itself)
  for (const p of PITCHES)
    for (const it of p.items)
      for (const q of inner(it)) for (const c of [[q[0], q[1]], [q[2], q[1]], [q[0], q[3]], [q[2], q[3]]] as [number, number][]) {
        const small = { ...it, w: it.w + 0.002, d: it.d + 0.002 };
        assert.ok(crosses({ x: c[0], z: c[1], ry: 0, w: 0.001, d: 0.001 }, small), `${p.id} ${it.kind}'s solid outside it`);
      }
  // (nothing of the Field is solid on the track)
  for (const b of [...COMMON_SOLIDS, ...PITCH_SOLIDS]) assert.ok(fromTrack((b[0] + b[2]) / 2, (b[1] + b[3]) / 2) > TRACK_HALF, `${b} on the track`);
  void LOT9_SOLIDS;
});

test('its people sit at the fires and about the commons, its dogs tied at their pitches', () => {
  const solid = [...SOLIDS, ...HOME_SOLIDS, ...POLE_SOLIDS, ...CAMP_SOLIDS];
  assert.ok(CAMP_PEOPLE.length >= 20, `${CAMP_PEOPLE.length} people`);
  for (const p of CAMP_PEOPLE) {
    assert.ok(inRect(FIELD, p.x, p.z), `${p.act} at ${p.x}, ${p.z}`);
    if (p.act !== 'lounge' && p.act !== 'eat') assert.ok(!solid.some((b) => inRect(b, p.x, p.z, -0.05)), `${p.act} in something at ${p.x}, ${p.z}`);
    assert.ok(fromTrack(p.x, p.z) > TRACK_HALF - 0.2, `${p.act} on the track`);
  }
  assert.ok(CAMP_DOGS.length >= 2, 'dogs');
  for (const d of CAMP_DOGS) assert.ok(inRect(FIELD, d.x, d.z));
});

test("the camp moved whole (the owner's call, 2026-11-14): by CAMP_SHIFT, unturned, everything of it in the new Field", () => {
  const { dx, dz } = CAMP_SHIFT;
  assert.deepEqual([dx, dz], [88, 76.5]);
  // The Field is the old one (x -204.5 to -128.5, z 342.5 to 411.5 plus MOVED) moved, the loop's middle with it
  const old = [-204.5, 342.5 + MOVED, -128.5, 411.5 + MOVED];
  for (let i = 0; i < 4; i++) assert.ok(Math.abs(FIELD[i] - (old[i] + (i % 2 ? dz : dx))) < 1e-9, `FIELD[${i}]`);
  assert.ok(Math.abs(CAMP_C[0] - (-166 + dx)) < 1e-9 && Math.abs(CAMP_C[1] - (377 + MOVED + dz)) < 1e-9);
  // (its east side the park's old west line moved, THE FIELD on it over the track's gap)
  assert.equal(CAMP_X1, PARK[0] + dx);
  for (const [x, z] of FIELD_ARCH) assert.ok(Math.abs(x - CAMP_X1) < 0.5 && z > INNER_GAPS[1][0] && z < INNER_GAPS[1][1]);
  // Everything of the camp's inside the Field: the commons, the loop, the trees, its three lamps, the pitches, the cars,
  // the people and the dogs
  const rects = [SHOWERS.rect, ...POTTIES, TROUGH, KITCHEN, GRILL, SINK, WOODPILE, CORRAL, ...DUMPSTERS, GARDEN, ...BEDS, COOP, COOP_RUN];
  for (const r of rects) for (const [x, z] of [[r[0], r[1]], [r[2], r[3]]]) assert.ok(inField(x, z), `the commons at ${x}, ${z}`);
  for (const [x, z] of [...SHOWER_DOORS, STANDPIPE, NOTICE, ...WASHING, [CIRCLE.x, CIRCLE.z] as [number, number], ...LOGS.map((l): [number, number] => [l.x, l.z])])
    assert.ok(inField(x, z, -0.01), `the commons at ${x}, ${z}`);
  for (const [x, z] of TRACK_LOOP) assert.ok(inField(x, z), `the loop at ${x}, ${z}`);
  for (const [x, z] of FIELD_TREES) assert.ok(inField(x, z), `a tree at ${x}, ${z}`);
  assert.equal(LOT9_LAMPS.filter(([x, z]) => inField(x, z)).length, 3, "the Field's three lamps");
  for (const p of PITCHES) for (const it of p.items) assert.ok(inField(it.x, it.z), `${p.id} ${it.kind}`);
  for (const [, x, z] of CAMP_CARS) assert.ok(inField(x, z), `a car at ${x}, ${z}`);
  for (const p of [...CAMP_PEOPLE, ...CAMP_DOGS]) assert.ok(inField(p.x, p.z), `someone at ${p.x}, ${p.z}`);
  // (and the camp's east side runs on its line, the park's gate things stay by the park's gate)
  for (const [a, b] of INNER_RUNS) assert.ok(a[0] === CAMP_X1 && b[0] === CAMP_X1);
  for (const b of GATE_SOLIDS) assert.ok(!inField((b[0] + b[2]) / 2, (b[1] + b[3]) / 2));
});
