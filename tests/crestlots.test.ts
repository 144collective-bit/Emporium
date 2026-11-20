// Crestmont's new hill mansions (the premium upgrade's Phase 3; the owner's calls, 2026-11-19: four, Art Deco and
// chateau by turns, "deeper terraces + vineyard"): the eight already there as they were, the four new ones after them
// on their lots, clear of the landmarks, the footpaths and the land (the two vineyards they took moved aside, the
// rest where it was laid, but a grove a new drive crosses, moved aside whole), each style's parts as planned, all
// under the houses' height.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUT, MANSARD, MANSIONS, NEW_LOTS, PAD_EASE, TALLEST, TURRET, topOf } from '../src/scripts/city3d/mansions';
import { GROVES, MEADOWS, VINEYARDS, onLand } from '../src/scripts/city3d/crestland';
import { onSite } from '../src/scripts/city3d/crestsites';
import { onTrail } from '../src/scripts/city3d/crestcover';
import { ROOF_DECKS } from '../src/scripts/city3d/crestgrand';

const OLD = 8;
const fresh = MANSIONS.slice(OLD);

test('the eight already there first, as they were; the four new ones after them', () => {
  assert.equal(MANSIONS.length, OLD + NEW_LOTS.length);
  assert.deepEqual(
    MANSIONS.slice(0, OLD).map((m) => m.kind),
    ['summit', 'glass', 'villa', 'glass', 'villa', 'compound', 'glass', 'villa']
  );
  MANSIONS.forEach((m, i) => assert.equal(m.id, `mansion-${i}`));
  assert.deepEqual(
    fresh.map((m) => m.kind),
    NEW_LOTS.map((l) => l[4])
  );
  // (Art Deco and chateau by turns, two of each)
  assert.equal(fresh.filter((m) => m.kind === 'deco').length, 2);
  assert.equal(fresh.filter((m) => m.kind === 'chateau').length, 2);
  for (let i = 1; i < fresh.length; i++) assert.notEqual(fresh[i].kind, fresh[i - 1].kind);
  for (const [m, l] of fresh.map((q, i) => [q, NEW_LOTS[i]] as const)) assert.equal(m.road, l[0]);
});

test('the new lots: clear of the landmarks, the footpaths and the land, pad, yard and bank', () => {
  for (const m of fresh) {
    const [x0, z0, x1, z1] = m.yard;
    for (let x = x0 - PAD_EASE; x <= x1 + PAD_EASE; x += 1)
      for (let z = z0 - PAD_EASE; z <= z1 + PAD_EASE; z += 1) {
        assert.ok(!onSite(x, z), `${m.id} on a landmark at ${x}, ${z}`);
        assert.ok(!onTrail(x, z), `${m.id} on a footpath at ${x}, ${z}`);
        assert.ok(!onLand(x, z), `${m.id} on a vineyard, grove or meadow at ${x}, ${z}`);
      }
  }
});

test('the land: as much of it as before, only the two vineyards and the grove the new lots took moved aside', () => {
  assert.equal(VINEYARDS.length, 3);
  assert.equal(GROVES.length, 3);
  assert.equal(MEADOWS.length, 5);
  const laid = [
    [393, -111, 415, -99],
    [442, -153, 464, -141],
    [400, -244, 422, -232],
  ];
  const moved = VINEYARDS.filter((v, i) => JSON.stringify(v.rect) !== JSON.stringify(laid[i]));
  assert.equal(moved.length, 2, 'two vineyards moved aside');
  assert.deepEqual(VINEYARDS[1].rect, laid[1], 'the third where it was laid');
  // (the groves keep every tree; the first moved aside whole, the lower Art Deco house's drive through its ground)
  for (const g of GROVES) assert.equal(g.length, 14);
  const groves = [
    [428, -118, 444, -106],
    [365, -146, 381, -134],
    [435, -181, 451, -169],
  ];
  const inGrove = (g: { x: number; z: number }[], r: number[]) => g.every((t) => t.x > r[0] && t.x < r[2] && t.z > r[1] && t.z < r[3]);
  assert.ok(!inGrove(GROVES[0], groves[0]) && inGrove(GROVES[1], groves[1]) && inGrove(GROVES[2], groves[2]), 'a grove moved that the lots left');
  assert.deepEqual(
    MEADOWS.map((w) => [w.x, w.z]),
    [
      [456, -204],
      [330, -218],
      [456, -232],
      [330, -246],
      [449, -260],
    ]
  );
});

test("the new houses: each style's parts as planned, under the houses' height", () => {
  for (const m of fresh) {
    const [main, ...rest] = m.parts;
    assert.equal(main.floors, 2);
    if (m.kind === 'deco') {
      assert.ok(main.flat, `${m.id}'s main block not flat-roofed`);
      assert.equal(m.walled, false);
      assert.ok(rest.length === 1 && rest[0].floors === 3 && rest[0].flat, `${m.id} without its stepped tower`);
      assert.equal(ROOF_DECKS[MANSIONS.indexOf(m)].kind, 'flat');
    } else {
      assert.equal(main.roof, 'mansard');
      assert.equal(m.walled, false, `${m.id} walled (its garden needs the room: its gates at its drive)`);
      assert.equal(rest.length, 2, `${m.id} without its two turrets`);
      for (const t of rest) {
        assert.equal(t.roof, 'cone');
        assert.ok(Math.abs(t.u1 - t.u0 - 2 * TURRET.r) < 1e-9);
        assert.ok(Math.abs((t.u0 + t.u1) / 2 - main.u0) < 1e-9 || Math.abs((t.u0 + t.u1) / 2 - main.u1) < 1e-9, `${m.id}'s turret off its corners`);
      }
      assert.equal(ROOF_DECKS[MANSIONS.indexOf(m)].kind, 'mansard');
    }
    for (const p of m.parts) assert.ok(topOf(p) < TALLEST, `${m.id} too tall: ${topOf(p)}`);
    for (const p of m.parts) assert.ok(p.u0 > -m.W / 2 + 1 && p.u1 < m.W / 2 - 1, `${m.id}'s part off its pad`);
  }
  assert.ok(MANSARD.h + 0.1 + 4.1 < TALLEST);
});

test('the new lots: never cut deeper than their terraces allow', () => {
  // (the one terraced a metre deeper: the others within CUT, as the rest)
  const deeper = NEW_LOTS.filter((l) => l[5] > 0);
  assert.equal(deeper.length, 1);
  assert.ok(deeper[0][5] <= 1 && CUT + deeper[0][5] <= 5);
});
