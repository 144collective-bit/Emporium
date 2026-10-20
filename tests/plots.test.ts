// The builder's plots (src/data/plots.ts, shared with the server): sixteen district
// plots at the owner's price, and designs from anywhere cleaned against the lists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDINGS, DISTRICTS, NEON_COLORS, PLOT_IDS, SIGNS, WALL_COLORS, cleanDesign } from '../src/data/plots';
import { PLOT_DORRAS, PLOT_LEVEL } from '../src/scripts/city3d/catalog';
import { RIVER } from '../src/scripts/city3d/layout';

test('plots are Dorras property: a six-figure price and a level to reach first', () => {
  assert.ok(PLOT_DORRAS >= 100_000 && PLOT_LEVEL >= 5);
});

test('sixteen districts: North 1-5, West 1-3, East 1-3, South 1-5', () => {
  assert.equal(DISTRICTS.length, 16);
  assert.equal(new Set(PLOT_IDS).size, 16);
  for (const p of ['N', 'W', 'E', 'S']) assert.ok(PLOT_IDS.some((id) => id.startsWith(p)));
  // The south row is across the river
  for (const d of DISTRICTS.filter((d) => d.id.startsWith('S'))) assert.ok(d.oz > RIVER[1]);
  for (const d of DISTRICTS.filter((d) => !d.id.startsWith('S'))) assert.ok(d.oz + 9 < RIVER[0]);
});

test('designs are cleaned: unknown types refused, everything else snapped to the lists', () => {
  for (const bad of [null, undefined, 42, 'tower', {}, { type: 'castle' }]) assert.equal(cleanDesign(bad), null);
  const d = cleanDesign({ type: 'tower', color: '#123456', neon: 'pink', floors: 999, sign: 'MY TEXT', rot: -5 })!;
  assert.equal(d.type, 'tower');
  assert.ok(WALL_COLORS.includes(d.color));
  assert.ok(NEON_COLORS.includes(d.neon));
  assert.ok(SIGNS.includes(d.sign), 'free text never reaches a sign');
  assert.ok(d.rot >= 0 && d.rot <= 3);
  const tower = BUILDINGS.find((b) => b.type === 'tower')!;
  assert.equal(d.floors, tower.floors![1]);
});

test('towers stay shorter than the Emporium (8 floors at most)', () => {
  for (const b of BUILDINGS) if (b.floors) assert.ok(b.floors[1] <= 8, `${b.type} can reach ${b.floors[1]} floors`);
});
