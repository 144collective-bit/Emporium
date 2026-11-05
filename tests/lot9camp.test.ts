// The Field (lot9camp.ts, docs/trailer-plan.md's polish round): Lot 9's camp west of the old park's fence line. Its
// track joins the park's west lane through the old fence's gap; every pitch and the commons stand in the Field, off the
// track and clear of each other, the trees, the lamps and everything else solid; every kind of stay is there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FENCE, FIELD, FIELD_TREES, INNER_GAPS, INNER_RUNS, LANE_HALF, LOOP_W, LOT9_LAMPS, LOT9_SOLIDS, PARK_X0, TRACK_HALF, TRACK_LOOP, TRACK_SPUR, fromTrack, inLoop } from '../src/scripts/city3d/lot9';
import { HOME_SOLIDS, POLE_SOLIDS } from '../src/scripts/city3d/lot9homes';
import {
  CAMP_CARS, CAMP_DOGS, CAMP_PEOPLE, CAMP_SOLIDS, CIRCLE, COMMON_SOLIDS, GATE_SOLIDS, KITCHEN, PITCHES, PITCH_SOLIDS, SHOWERS, aabbOf, cornersOf, crosses, inner, type Item,
} from '../src/scripts/city3d/lot9camp';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { CARS } from '../src/scripts/city3d/carspec';

const overlap = (a: readonly number[], b: readonly number[], m = 0) => a[0] < b[2] - m && a[2] > b[0] + m && a[1] < b[3] - m && a[3] > b[1] + m;
const inRect = (r: readonly number[], x: number, z: number, m = 0) => x > r[0] + m && x < r[2] - m && z > r[1] + m && z < r[3] - m;

test('the Field: inside the fence, west of the old line; its track in from the west lane through the gap, a loop round the commons', () => {
  assert.ok(FIELD[0] > FENCE[0] && FIELD[2] < PARK_X0 && FIELD[1] > FENCE[1] && FIELD[3] < FENCE[3]);
  // (the spur starts on the west lane's gravel and crosses the old line inside the gap)
  assert.ok(Math.abs(TRACK_SPUR[0][0] - LOOP_W) < LANE_HALF);
  const cross = TRACK_SPUR.find((p) => Math.abs(p[0] - PARK_X0) < 1e-6)!;
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
  for (const b of GATE_SOLIDS) assert.ok(inRect(FENCE, (b[0] + b[2]) / 2, (b[1] + b[3]) / 2) && (b[0] + b[2]) / 2 > -30, `${b} by the gate`);
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
