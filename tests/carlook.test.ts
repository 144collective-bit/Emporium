// The garage's customisation (vehicle plan Phase 5; mycar.ts's look, carlook.ts's fit): a saved look made
// safe, the stock parts a kit part takes off, and every part of the kit fitting every model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAR_MARKS, DIFFUSERS, GLOWS, LIVERIES, PLAYER_CARS, RIMS, RIM_COLOURS, RIM_SIZES, SKIRTS, SPLITTERS, SPOILERS, STOCK_LOOK, cleanCar, cleanLook } from '../src/scripts/city3d/mycar';
import {
  DIFFUSER_NAMES,
  GLOW_HEX,
  GLOW_NAMES,
  LIVERY_NAMES,
  MARK_NAMES,
  NUMBERS,
  RIM_COLOUR_NAMES,
  RIM_HEX,
  RIM_NAMES,
  RIM_SIZE,
  RIM_SIZE_NAMES,
  SKIRT_NAMES,
  SPLITTER_NAMES,
  SPOILER_NAMES,
  STOCK_PARTS,
  bareOf,
  doorPanel,
  isStock,
  kitFit,
  sameLook,
  topOf,
} from '../src/scripts/city3d/carlook';
import { CARS } from '../src/scripts/city3d/carspec';
import { INTERIORS } from '../src/scripts/city3d/carinside';
import { MARK_IDS } from '../src/scripts/net/profile-data';

test('a car saved before the look comes back all stock, and a look is cleaned part by part', () => {
  const old = cleanCar({ model: 'coupe', paint: 'red' });
  assert.deepEqual(old.look, STOCK_LOOK);
  assert.ok(isStock(old.look));
  const l = cleanLook({ rim: 'mesh', rimColour: 'gold', rimSize: 'huge', spoiler: 'wing', livery: 'flames', accent: 'black', number: 77, mark: 'bolt', glow: 'cyan', splitter: 'nope', number2: 3 });
  assert.equal(l.rim, 'mesh');
  assert.equal(l.splitter, 'stock', 'unknown: stock');
  assert.equal(l.number, 77);
  assert.equal(cleanLook({ number: 100 }).number, 0);
  assert.equal(cleanLook({ number: -3 }).number, 0);
  assert.equal(cleanLook({ number: '7' }).number, 7);
  assert.equal(cleanLook({ accent: 'tartan' }).accent, STOCK_LOOK.accent);
  assert.ok(!('number2' in l));
  assert.ok(sameLook(l, cleanLook(JSON.parse(JSON.stringify(l)))), 'saved and read back, the same');
  assert.ok(!sameLook(l, STOCK_LOOK));
  for (const bad of [null, 3, 'x', [], { rim: { evil: 1 } }]) assert.deepEqual(cleanLook(bad), STOCK_LOOK);
});

test('every choice has a name for the menu (and every colour a colour)', () => {
  const lists: [readonly string[], Record<string, string>][] = [
    [RIMS, RIM_NAMES],
    [RIM_COLOURS, RIM_COLOUR_NAMES],
    [RIM_SIZES, RIM_SIZE_NAMES],
    [SPLITTERS, SPLITTER_NAMES],
    [SKIRTS, SKIRT_NAMES],
    [DIFFUSERS, DIFFUSER_NAMES],
    [SPOILERS, SPOILER_NAMES],
    [LIVERIES, LIVERY_NAMES],
    [CAR_MARKS, MARK_NAMES],
    [GLOWS, GLOW_NAMES],
  ];
  for (const [ids, names] of lists) {
    assert.deepEqual(Object.keys(names).sort(), [...ids].sort());
    for (const id of ids) assert.ok(names[id].length > 1, id);
  }
  for (const id of RIM_COLOURS) if (id !== 'stock') assert.match(RIM_HEX[id], /^#[0-9a-f]{6}$/);
  for (const id of GLOWS) if (id !== 'off') assert.match(GLOW_HEX[id], /^#[0-9a-f]{6}$/);
  // The marks are the city's made-up ones (profile-data.ts), nothing else
  for (const m of CAR_MARKS) if (m !== 'none') assert.ok((MARK_IDS as string[]).includes(m), m);
  assert.ok(NUMBERS.every((n) => n === 0 || (n >= 1 && n <= 99)) && NUMBERS[0] === 0);
  for (const n of NUMBERS) assert.equal(cleanLook({ number: n }).number, n);
});

test('a kit part over the model’s own takes it off, and only then', () => {
  for (const id of PLAYER_CARS) {
    assert.equal(bareOf(id, STOCK_LOOK), '', id);
    const all = cleanLook({ splitter: 'race', skirts: 'on', diffuser: 'fins', spoiler: 'none' });
    assert.deepEqual(bareOf(id, all).split(' ').filter(Boolean).sort(), [...STOCK_PARTS[id]].sort(), id);
  }
  assert.equal(bareOf('coupe', cleanLook({ spoiler: 'wing' })), 'spoiler');
  assert.equal(bareOf('van', cleanLook({ spoiler: 'wing' })), '', 'the van has no spoiler of its own');
});

test('every part of the kit fits every model', () => {
  for (const id of PLAYER_CARS) {
    const s = CARS[id];
    const f = kitFit(s);
    const half = s.L / 2;
    // The splitter at the nose, under the bumper, no wider than the car and a bit
    assert.ok(Math.abs(f.splitter.x - half) < 0.05 && f.splitter.y > 0.02 && f.splitter.y < s.clr + 0.02, `${id}: splitter`);
    assert.ok(f.splitter.w <= s.W, `${id}: splitter's width`);
    // The skirts between the arches (clear of the tyres), under the doors' bottom edge, over the ground
    const k = f.skirts;
    assert.ok(k.x1 - k.x0 > 0.4, `${id}: skirts long enough`);
    assert.ok(k.x0 > s.axles[0] + s.r + 0.05 && k.x1 < s.axles[1] - s.r - 0.05, `${id}: skirts clear of the wheels`);
    assert.ok(k.y0 > 0.02 && k.y1 > k.y0 + 0.03, `${id}: skirts over the ground`);
    const door = INTERIORS[id].door;
    if (door) assert.ok(k.y1 < door.y0, `${id}: the door swings clear over the skirts`);
    assert.ok(k.z > s.W / 2 && k.z < s.W / 2 + 0.06, `${id}: skirts just proud of the sides`);
    // The diffuser at the tail
    assert.ok(Math.abs(f.diffuser.x + half) < 0.08 && f.diffuser.w < s.W, `${id}: diffuser`);
    // The spoiler on the car's top at its back, inside its width
    const sp = f.spoiler;
    assert.ok(sp.x < 0 && sp.x > -half - 0.01, `${id}: spoiler at the back`);
    assert.ok(sp.w < s.W, `${id}: spoiler inside the width`);
    if (sp.mode === 'deck') assert.ok(Math.abs(sp.y - topOf(s, sp.x)) < 1e-9, `${id}: on the deck`);
    else assert.ok(Math.abs(sp.y - s.cabin[1][1]) < 1e-9, `${id}: on the roof's back edge`);
    // The doors' panel inside the side, under the window line
    const p = doorPanel(s);
    assert.ok(p.h > 0.12 && p.y - p.h / 2 > s.clr && p.y + p.h / 2 < topOf(s, p.x), `${id}: door panel (${p.h.toFixed(2)})`);
  }
  // The hatchbacks and the tall ones take a roof spoiler; the saloons and the coupes one on the deck
  for (const id of ['hatch', 'van', 'suv'] as const) assert.equal(kitFit(CARS[id]).spoiler.mode, 'roof', id);
  for (const id of ['sedan', 'coupe', 'muscle', 'super', 'pickup'] as const) assert.equal(kitFit(CARS[id]).spoiler.mode, 'deck', id);
});

test('a bigger rim stays inside the tyre (the tyre’s outside where it was)', () => {
  const sizes = RIM_SIZES.map((k) => RIM_SIZE[k]);
  assert.ok(sizes.every((k, i) => i === 0 || k > sizes[i - 1]), 'each bigger');
  assert.ok(sizes[sizes.length - 1] < 0.86, 'a sidewall left');
});
