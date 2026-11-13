// The Trenches' tenements' ground floors (shopfronts.ts, docs/trenches-variety-plan.md Phase 4, the owner's picks: fire
// escapes on about half, mostly the taller ones; a mix of shopfronts; some ground floors painted): the shares come out as
// picked on the tenements themselves, every kind of front is there, and the picks are the same every time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESCAPE, FRONT_MIX, PAINTS, escapeAt, frontAt, paintAt } from '../src/scripts/city3d/shopfronts';
import { TENEMENTS } from '../src/scripts/city3d/streetwall';

test('fire escapes on about half the tenements, the taller ones far more often', () => {
  const share = TENEMENTS.filter((t) => t.escape).length / TENEMENTS.length;
  assert.ok(share > 0.35 && share < 0.65, `${(share * 100).toFixed(0)}% with a fire escape`);
  const tall = TENEMENTS.filter((t) => t.floors >= ESCAPE.from);
  const short = TENEMENTS.filter((t) => t.floors < ESCAPE.from);
  const of = (ls: typeof TENEMENTS) => ls.filter((t) => t.escape).length / ls.length;
  assert.ok(of(tall) > of(short) + 0.3, `tall ${of(tall).toFixed(2)}, short ${of(short).toFixed(2)}`);
});

test('every kind of shopfront on the tenements, about as often as set; some painted, in the paints', () => {
  for (const [k, w] of FRONT_MIX) {
    const share = TENEMENTS.filter((t) => t.shopfront === k).length / TENEMENTS.length;
    assert.ok(share > w * 0.4 && share < w * 1.8, `${k}: ${(share * 100).toFixed(0)}%`);
  }
  const painted = TENEMENTS.filter((t) => t.paint);
  assert.ok(painted.length / TENEMENTS.length > 0.25 && painted.length / TENEMENTS.length < 0.65);
  for (const t of painted) assert.ok(PAINTS.includes(t.paint!));
  assert.equal(frontAt(-71.3, 210.25), frontAt(-71.3, 210.25));
  assert.equal(paintAt(-71.3, 210.25), paintAt(-71.3, 210.25));
  assert.equal(escapeAt(-71.3, 210.25, 5), escapeAt(-71.3, 210.25, 5));
});
