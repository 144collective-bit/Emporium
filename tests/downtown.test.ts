// Downtown as data (downtown.ts): the infill and its alleys stay on their blocks and
// off the landmarks' lots, bollards keep cars (not people) out of the alleys, the
// parks and the hangout square hold what they say, and every landmark is near a
// street a car can use.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALLEYS, BLOCKS_DT, BOLLARD_R, DIAGONAL_LAMPS, INFILL, LANDMARK_LOTS, LANES, PARKS, PRACTICE, SQUARE, insideBy, type Rect } from '../src/scripts/city3d/downtown';
import { DOORS, SOLIDS } from '../src/scripts/city3d/solids';
import { PLAN, distToStreet, inPoly, onSlab } from '../src/scripts/city3d/streetplan';
import { DUMMIES } from '../src/scripts/city3d/combat-sim';
import { overlaps, pointIn } from './world';

const corners = (b: Rect): [number, number][] => [
  [b[0] + 1e-6, b[1] + 1e-6],
  [b[2] - 1e-6, b[1] + 1e-6],
  [b[2] - 1e-6, b[3] - 1e-6],
  [b[0] + 1e-6, b[3] - 1e-6],
];
const onBlock = (b: Rect) => BLOCKS_DT.some((k) => corners(b).every((p) => inPoly(k.poly, p)));

test("infill: on its blocks, off the landmarks' lots, the lanes and each other, never near the Emporium's height", () => {
  assert.ok(INFILL.length >= 30, 'downtown is packed');
  for (const f of INFILL) {
    assert.ok(f.box[0] < f.box[2] && f.box[1] < f.box[3], 'well formed');
    assert.ok(onBlock(f.box), `infill at ${f.box} is off its block`);
    for (const l of [...LANDMARK_LOTS, ...LANES]) assert.ok(!overlaps(f.box, l), `infill at ${f.box} is on a landmark's lot or a lane`);
    assert.ok(f.h >= 2.4 && f.h <= 7.5, `infill at ${f.box} is ${f.h} tall`);
    // A shop front wide and deep enough for a door
    assert.ok(f.box[2] - f.box[0] >= 2.3 && f.box[3] - f.box[1] >= 2.3, `infill at ${f.box} is too small`);
  }
  for (let i = 0; i < INFILL.length; i++) for (let j = i + 1; j < INFILL.length; j++) assert.ok(!overlaps(INFILL[i].box, INFILL[j].box), `infill ${i} and ${j} overlap`);
});

test('alleys run between buildings, walkable, with bollards that stop a car', () => {
  assert.ok(ALLEYS.length >= 3);
  // The narrowest car you can drive (cars.ts: the City Hatch, 0.98 wide)
  const narrowest = 0.98;
  for (const a of ALLEYS) {
    assert.ok(onBlock(a.box), `alley at ${a.box} is off its block`);
    for (const f of INFILL) assert.ok(!overlaps(a.box, f.box), `alley at ${a.box} runs through a building`);
    // Walk it from end to end down the middle: nothing solid
    const alongX = a.box[2] - a.box[0] > a.box[3] - a.box[1];
    const [m, lo, hi] = alongX ? [(a.box[1] + a.box[3]) / 2, a.box[0], a.box[2]] : [(a.box[0] + a.box[2]) / 2, a.box[1], a.box[3]];
    for (let t = lo; t <= hi; t += 0.1) {
      const [x, z] = alongX ? [t, m] : [m, t];
      const hit = SOLIDS.filter((b) => pointIn(x, z, b, 0.22));
      // Only the bollards, and Degen fits between them
      assert.ok(
        hit.every((b) => b[2] - b[0] <= BOLLARD_R * 2 + 1e-9),
        `alley at ${a.box} is blocked at ${x.toFixed(1)}, ${z.toFixed(1)}`
      );
    }
    // Across the mouth: the gaps between the bollards and the walls are narrower than any car, wider than Degen
    const w = alongX ? a.box[3] - a.box[1] : a.box[2] - a.box[0];
    const across = a.bollards.map((p) => (alongX ? p[1] - a.box[1] : p[0] - a.box[0])).sort((p, q) => p - q);
    const gaps = [across[0] - BOLLARD_R, ...across.slice(1).map((v, i) => v - across[i] - BOLLARD_R * 2), w - across.at(-1)! - BOLLARD_R];
    assert.ok(Math.max(...gaps) < narrowest, `a car fits past the bollards at ${a.box}`);
    assert.ok(Math.max(...gaps) > 0.44, `Degen can't get past the bollards at ${a.box}`);
  }
});

test('pocket parks: trees, benches and a lamp inside, the practice dummies among them', () => {
  assert.equal(PARKS.length, 3);
  for (const p of PARKS) {
    assert.ok(p.trees.length >= 4, `${p.id} has trees`);
    for (const q of [...p.trees, ...p.benches.map((b) => b.at), ...p.lamps]) assert.ok(insideBy(p.poly, q, 0.3), `${p.id}: ${q} is off the park`);
  }
  const nw = PARKS.find((p) => p.id === 'nw-b')!;
  for (const q of PRACTICE) {
    assert.ok(insideBy(nw.poly, q, 0.5), `practice spot ${q} is off the park`);
    assert.ok(
      DUMMIES.some(([x, z]) => x === q[0] && z === q[1]),
      'a dummy stands there'
    );
    for (const t of nw.trees) assert.ok(Math.hypot(t[0] - q[0], t[1] - q[1]) > 1, 'a tree on the range');
  }
});

test('the hangout square: stage, screen, fountain, kiosks and benches inside it, a clear way up to the stage', () => {
  const sq = SQUARE.box;
  const inSq = (b: Rect) => b[0] >= sq[0] && b[2] <= sq[2] && b[1] >= sq[1] && b[3] <= sq[3];
  assert.ok(inSq(SQUARE.stage));
  for (const k of SQUARE.kiosks) assert.ok(inSq(k) && !overlaps(k, SQUARE.stage));
  const f = SQUARE.fountain;
  assert.ok(inSq([f.at[0] - f.r, f.at[1] - f.r, f.at[0] + f.r, f.at[1] + f.r]));
  for (const b of SQUARE.benches) assert.ok(pointIn(b.at[0], b.at[1], sq));
  assert.ok(SQUARE.screen.x0 >= SQUARE.stage[0] && SQUARE.screen.x1 <= SQUARE.stage[2]);
  // From the south edge up to the front of the stage, beside the fountain, nothing solid
  const x = f.at[0] + f.r + 0.8;
  for (let z = sq[3] - 0.3; z > SQUARE.stage[3] + 0.3; z -= 0.1) assert.ok(!SOLIDS.some((b) => pointIn(x, z, b, 0.22)), `the way to the stage is blocked at z ${z.toFixed(1)}`);
});

test('lamps along the diagonals stand on the sidewalk', () => {
  assert.ok(DIAGONAL_LAMPS.length >= 12);
  const diags = PLAN.streets.filter((s) => s.id.startsWith('diag'));
  for (const l of DIAGONAL_LAMPS) {
    assert.ok(onSlab(PLAN, l.at), `lamp at ${l.at} is off the sidewalk`);
    const d = Math.min(...diags.map((s) => distToStreet(s, l.at)));
    assert.ok(d > diags[0].half && d < diags[0].half + 0.8, `lamp at ${l.at} is ${d.toFixed(2)} from its diagonal`);
  }
});

test("every landmark's door is near a street a car can use (deliveries reach 9)", () => {
  const roads = PLAN.streets.filter((s) => s.lanes > 0);
  for (const d of DOORS)
    assert.ok(
      roads.some((s) => distToStreet(s, [d.x, d.z]) < 9),
      `${d.id} is too far from a street`
    );
});
