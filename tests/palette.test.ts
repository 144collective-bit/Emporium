// The ground palette (palette.ts, docs/blend-plan.md Phase 1): the ground's, the kerbs', the verges', the trees' and
// the street lamps' colours in one place. Every value is a colour, and none of them is written in another of the
// city's files (a district picks from the palette, never a ground colour of its own).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { COVER, KERB, LAMP, TREE } from '../src/scripts/city3d/palette';

const HEX = /^#[0-9a-f]{6}$/;
const all = [...Object.values(COVER), ...Object.values(KERB), ...TREE.crowns, TREE.trunk, TREE.pine, ...Object.values(LAMP).flatMap((l) => Object.values(l))];

test('every colour in the palette is a colour', () => {
  for (const c of all) assert.match(c, HEX);
});

test("the ground's colours are written only in the palette", () => {
  // (the concrete grey, the trees' trunk brown and the first crown green are also plain paint elsewhere: steel, wood,
  // a playing field; the white lamps' warm light is the city's warm light everywhere, lanterns and lit windows; the
  // rest belong to the ground, the kerbs, the trees and the sodium lamps alone)
  const shared = new Set<string>([COVER.concrete, TREE.trunk, TREE.crowns[0], ...Object.values(LAMP.white)]);
  const own = all.filter((c) => !shared.has(c));
  const dir = 'src/scripts/city3d';
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.ts') && n !== 'palette.ts')) {
    const src = readFileSync(join(dir, f), 'utf8').toLowerCase();
    for (const c of own) assert.ok(!src.includes(`'${c}'`), `${f} writes ${c}: take it from palette.ts`);
  }
});
