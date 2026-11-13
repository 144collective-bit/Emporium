// The rooflines' variety (rooftones.ts, docs/trenches-variety-plan.md Phase 3, the owner's picks: roofs in a mix of tar
// grey, gravel and silver paint with some navy kept; the tenements of 3 to 6 storeys, no two neighbours alike; varied
// clutter): the mixes come out as set, every pick is the same each time, the Trench Houses' roofs aren't all one
// covering, and no tenement stands as tall as the one beside it along its street.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORNICE_MIX, ROOF_MIX, corniceAt, roofTone, tankAt } from '../src/scripts/city3d/rooftones';
import { TOWERS } from '../src/scripts/city3d/projects';
import { TENEMENTS } from '../src/scripts/city3d/streetwall';

const POINTS = Array.from({ length: 2000 }, (_, i) => [(i % 50) * 3.7 - 90, Math.floor(i / 50) * 4.1 + 150] as const);

test('the roofs and cornices come out in their mixes, the same every time', () => {
  for (const [mix, at] of [
    [ROOF_MIX, roofTone],
    [CORNICE_MIX, corniceAt],
  ] as const) {
    for (const [k, w] of mix) {
      const share = POINTS.filter(([x, z]) => (at as (x: number, z: number) => string)(x, z) === k).length / POINTS.length;
      assert.ok(Math.abs(share - w) < 0.05, `${k}: ${(share * 100).toFixed(1)}%`);
    }
  }
  assert.equal(roofTone(-61.25, 213.5), roofTone(-61.25, 213.5));
  assert.ok(POINTS.some(([x, z]) => tankAt(x, z) === 'round') && POINTS.some(([x, z]) => tankAt(x, z) === 'square'));
});

test("the Trench Houses' roofs in at least three coverings, their tanks both kinds", () => {
  assert.ok(new Set(TOWERS.map((t) => roofTone(t.door.x, t.door.z))).size >= 3);
  const tanks = TOWERS.filter((t) => t.tank).map((t) => tankAt(t.door.x, t.door.z));
  assert.ok(tanks.includes('round') && tanks.includes('square'));
});

test('the tenements are 3 to 6 storeys with the shop, and none as tall as the one beside it on its street', () => {
  for (const l of TENEMENTS) assert.ok(l.floors >= 2 && l.floors <= 5, `${l.floors} over the shop`);
  assert.equal(new Set(TENEMENTS.map((l) => l.floors)).size, 4);
  const touching = (a: (typeof TENEMENTS)[number], b: (typeof TENEMENTS)[number]) => {
    if (a.block !== b.block || a.face !== b.face) return false;
    const alongX = a.face === 'n' || a.face === 's';
    return alongX
      ? Math.min(Math.abs(a.box[2] - b.box[0]), Math.abs(a.box[0] - b.box[2])) < 1e-6 && a.box[1] < b.box[3] && b.box[1] < a.box[3]
      : Math.min(Math.abs(a.box[3] - b.box[1]), Math.abs(a.box[1] - b.box[3])) < 1e-6 && a.box[0] < b.box[2] && b.box[0] < a.box[2];
  };
  let pairs = 0;
  for (let i = 0; i < TENEMENTS.length; i++)
    for (let j = i + 1; j < TENEMENTS.length; j++)
      if (touching(TENEMENTS[i], TENEMENTS[j])) {
        pairs++;
        assert.notEqual(TENEMENTS[i].floors, TENEMENTS[j].floors, `two neighbours of ${TENEMENTS[i].floors} over the shop`);
      }
  assert.ok(pairs > 20, `${pairs} pairs side by side`);
});
