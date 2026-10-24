// Uptown's street life (streetlife.ts, docs/finance-plan.md Phase 7): screens on the street wall's bases over the
// shopfronts and under their cornices, neon blades over the restaurants' margins, the vendors' carts in the margins
// with the sidewalk left clear, clear of everything solid, and only made-up words.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLADE, BLADES, BLADE_WORDS, CART, CARTS, CART_KINDS, SCREEN, SCREENS, SLIDES, STREETLIFE_PEOPLE, STREETLIFE_SOLIDS } from '../src/scripts/city3d/streetlife';
import { FRONTAGES } from '../src/scripts/city3d/streetlevel';
import { HIGHRISES, PODIUM } from '../src/scripts/city3d/highrise';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';

const overlap = (a: number[], b: number[], m = 0) => a[0] < b[2] + m && b[0] < a[2] + m && a[1] < b[3] + m && b[1] < a[3] + m;

test('screens: on a base, over the shopfronts, under the cornice, inside their wall', () => {
  assert.ok(SCREENS.length >= 5);
  for (const s of SCREENS) {
    const t = HIGHRISES.find((h) => h.id === s.tower)!;
    assert.ok(t.base, `${s.tower} has a base`);
    assert.ok(s.y >= PODIUM.h + 0.4, `${s.tower}'s screen over the shopfronts`);
    assert.ok(s.y + s.h <= t.base!.h - 0.5, `${s.tower}'s screen under its cornice`);
    assert.ok(Math.abs(s.w - 2 * s.h) < 1e-6 && s.h > 2, `${s.tower}'s screen two to one and big`);
    const f = FRONTAGES.find((q) => q.tower === s.tower && q.n[0] === s.n[0] && q.n[1] === s.n[1])!;
    assert.ok(Math.hypot(f.c[0] - f.a[0], f.c[1] - f.a[1]) >= s.w + 2 * SCREEN.side - 1e-6, `${s.tower}'s screen inside its wall`);
  }
});

test('neon blades: over a margin deep enough, over head height', () => {
  assert.ok(BLADES.length >= 8);
  for (const b of BLADES) {
    const f = FRONTAGES.find((q) => q.tower === b.tower && q.n[0] === b.n[0] && q.n[1] === b.n[1] && q.char === 'dining')!;
    assert.ok(f.depth >= BLADE.out + 0.2, `${b.tower}'s blade over its margin`);
  }
  assert.ok(BLADE.y0 > 2.6);
});

test('carts: every kind, in a margin, off every street, clear of everything else solid, the sidewalk past them', () => {
  assert.ok(CARTS.length >= 5);
  for (const k of CART_KINDS) assert.ok(CARTS.some((c) => c.kind === k), k);
  const own = new Set(STREETLIFE_SOLIDS.map((b) => b.join()));
  STREETLIFE_SOLIDS.forEach((box, i) => {
    const c = CARTS[i];
    for (const p of [[box[0], box[1]], [box[2], box[3]], [box[0], box[3]], [box[2], box[1]]] as [number, number][])
      for (const s of PLAN.streets) assert.ok(distToStreet(s, p) > s.half + CART.walk - 0.05, `${c.kind} by ${c.tower} near ${s.id}`);
    for (const o of SOLIDS) if (!own.has(o.join())) assert.ok(!overlap(box, o, 0.1), `${c.kind} by ${c.tower} hits ${o.map((v) => v.toFixed(1))}`);
  });
  assert.ok(STREETLIFE_PEOPLE.length >= CARTS.length * 2);
});

test('only made-up words, never a number (but the city\'s name)', () => {
  for (const w of [...SLIDES, ...BLADE_WORDS]) assert.ok(!/\d/.test(w.replace('SECTOR 7', '')), w);
});
