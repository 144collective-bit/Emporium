// What covers the ground (ground.ts, docs/blend-plan.md Phase 2): the open land's mix of rough grass, meadow and dry
// grass, each district's ground fading out round it, never a step; the fast colour the same as the mix's; the ground's
// grid as fine as it needs. Runs at both world sizes (npm run test:wide).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRID, INFLUENCES, colourAt, coverAt, groundStep, influenceAt, mixColour, openMix, type Mix } from '../src/scripts/city3d/ground';
import { COVER, type Cover } from '../src/scripts/city3d/palette';
import { EXT } from '../src/scripts/city3d/layout';
import { TRENCH_RECT } from '../src/scripts/city3d/trenches';
import { DOCKS_RECT } from '../src/scripts/city3d/docks';
import { SUNRIDGE_RECT } from '../src/scripts/city3d/sunridge';
import { HIGHWAY_BOX, HIGHWAY_HALF } from '../src/scripts/city3d/highway';

const sum = (m: Mix) => Object.values(m).reduce((a, b) => a + (b ?? 0), 0);
const share = (m: Mix, c: Cover) => m[c] ?? 0;

test('a mix is shares of the palette summing to one, and the fast colour is the mix', () => {
  for (let x = EXT[0]; x < EXT[1]; x += 9.7)
    for (let z = EXT[0]; z < EXT[1]; z += 13.3) {
      const m = coverAt(x, z);
      assert.ok(Math.abs(sum(m) - 1) < 1e-9, `the shares at ${x}, ${z} sum to ${sum(m)}`);
      for (const [c, w] of Object.entries(m)) {
        assert.ok(c in COVER, c);
        assert.ok(w! >= -1e-12 && w! <= 1 + 1e-12);
      }
      const a = mixColour(m);
      const b = colourAt(x, z);
      for (let i = 0; i < 3; i++) assert.ok(Math.abs(a[i] - b[i]) < 1e-9, `the colour at ${x}, ${z}`);
    }
});

test('the open land is mostly rough grass, with patches of meadow and dry grass', () => {
  let [rough, meadow, dry, n] = [0, 0, 0, 0];
  for (let x = EXT[0]; x < EXT[1]; x += 5)
    for (let z = EXT[0]; z < EXT[1]; z += 5) {
      const m = openMix(x, z);
      rough += m.rough ?? 0;
      meadow += m.meadow ?? 0;
      dry += m.dryGrass ?? 0;
      n++;
    }
  assert.ok(rough / n > 0.6, `rough ${rough / n}`);
  assert.ok(meadow / n > 0.04 && meadow / n < 0.3, `meadow ${meadow / n}`);
  assert.ok(dry / n > 0.03 && dry / n < 0.3, `dry ${dry / n}`);
});

test("each district's ground fades out round it, its own cover strongest at its edge", () => {
  const edge = (r: readonly number[], d: number): [number, number] => [(r[0] + r[2]) / 2, r[1] - d];
  // The Trenches' south side runs along the highway: its north-west corner's open side instead
  const cases: [string, Cover, [number, number], [number, number]][] = [
    ['The Trenches', 'worn', [TRENCH_RECT[0] - 1, (TRENCH_RECT[1] + TRENCH_RECT[3]) / 2], [TRENCH_RECT[0] - 40, (TRENCH_RECT[1] + TRENCH_RECT[3]) / 2]],
    ['the Docks', 'gravel', [DOCKS_RECT[0] - 1, DOCKS_RECT[3] - 10], [DOCKS_RECT[0] - 60, DOCKS_RECT[3] - 10]],
    ['Sunridge', 'dryGrass', edge(SUNRIDGE_RECT, 1), edge(SUNRIDGE_RECT, 40)],
  ];
  for (const [name, c, near, far] of cases) {
    const [a, b] = [share(coverAt(...near), c), share(coverAt(...far), c)];
    assert.ok(a > 0.25, `${name}'s ${c} at its edge: ${a}`);
    assert.ok(a > b + 0.15, `${name}'s ${c} fades: ${a} at its edge, ${b} further out`);
  }
  // The highway's verges dry, fading away from it
  const hw = INFLUENCES.find((f) => f.id === 'highway')!;
  const x = (HIGHWAY_BOX[0] + HIGHWAY_BOX[2]) / 2;
  // (d past its edge)
  const at = (d: number) => influenceAt(hw, x, HIGHWAY_BOX[1] - HIGHWAY_HALF - d);
  assert.ok(at(0.5) > 0.4 && at(0.5) > at(5) && at(5) >= at(20) && at(20) === 0, `the verge: ${at(0.5)}, ${at(5)}, ${at(20)}`);
});

test('no step anywhere: neighbouring points half a tile apart differ only a little', () => {
  for (let x = EXT[0]; x < EXT[1]; x += 3.1)
    for (let z = EXT[0]; z < EXT[1]; z += 17.9) {
      const [a, b] = [colourAt(x, z), colourAt(x + 0.5, z)];
      assert.ok(Math.max(...a.map((v, i) => Math.abs(v - b[i]))) < 0.03, `a step at ${x}, ${z}`);
    }
  // Each influence eases to nothing at its reach
  for (const f of INFLUENCES.slice(0, 40)) {
    const [x, z] = [(f.box[0] + f.box[2]) / 2, (f.box[1] + f.box[3]) / 2];
    assert.ok(influenceAt(f, x, z) <= f.strength + 1e-12);
  }
});

test("the ground's grid: one quad under a district, coarse far out, fine near the city (coarser on phones)", () => {
  assert.equal(groundStep(10, 10, 40, 40, false), Infinity, 'downtown');
  assert.equal(groundStep(EXT[0], EXT[0], EXT[0] + 30, EXT[0] + 30, false), GRID.far, "the world's corner");
  const near: [number, number, number, number] = [150, 210, 180, 240];
  assert.equal(groundStep(...near, false), GRID.near, 'the south band');
  assert.equal(groundStep(...near, true), GRID.near * 2);
});
