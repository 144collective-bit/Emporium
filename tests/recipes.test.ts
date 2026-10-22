// Building kits and recipes for blocks (kits.ts, recipes.ts, growth plan Phase 4): a recipe lays the same block the
// same way every time, every building inside its block and clear of the others and of the alleys, under the
// Emporium, its footprints from the same layout; and the test district holds about 300 of them on open land.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIG_KITS, KIT_IDS, KIT_SPEC, KIT_TALLEST, bigParts, heightOf, lotFrame, lotSolids, type KitId } from '../src/scripts/city3d/kits';
import { RECIPES, layBlock, rowsOf, kitsOf, type RecipeId } from '../src/scripts/city3d/recipes';
import { DISTRICT_BLOCKS, DISTRICT_RECT, DISTRICT_STREETS, districtSolids, inDistrict, testDistrict } from '../src/scripts/city3d/testdistrict';
import { SIGNS, bodyOf, insideBy, type Infill, type Pt, type Rect } from '../src/scripts/city3d/downtown';
import { EW_ROADS, NS_ROADS, RIVER, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { inTown } from '../src/scripts/city3d/outer';
import { SITE } from '../src/scripts/city3d/airfield';
import { KART_PARK } from '../src/scripts/city3d/kartpark';

const EMPORIUM_ROOF = 12.5;
const overlap = (a: Rect, b: Rect) => Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > 1e-6 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > 1e-6;
const within = (poly: Pt[], [x0, z0, x1, z1]: Rect) =>
  ([[x0, z0], [x1, z0], [x1, z1], [x0, z1]] as Pt[]).every((p) => {
    const cx = poly.reduce((n, q) => n + q[0], 0) / poly.length;
    const cz = poly.reduce((n, q) => n + q[1], 0) / poly.length;
    return insideBy(poly, [p[0] + Math.sign(cx - p[0]) * 1e-4, p[1] + Math.sign(cz - p[1]) * 1e-4]);
  });
const rect = (x0: number, z0: number, x1: number, z1: number): Pt[] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];

test('every kit stands well under the Emporium, the tallest office and the crane included', () => {
  for (const id of KIT_IDS) {
    const [, most] = KIT_SPEC[id].floors;
    assert.ok(heightOf(id, most) < EMPORIUM_ROOF - 1, id);
  }
  assert.ok(KIT_TALLEST < EMPORIUM_ROOF - 1);
  for (const id of BIG_KITS) for (const [, , , , h] of bigParts(id, 30, 26).extra) assert.ok(h <= KIT_TALLEST, id);
});

test('a lot frame turns (u, v) into the world the way the drawing does, for every face', () => {
  for (const face of ['n', 's', 'e', 'w'] as const) {
    const F = lotFrame({ box: [10, 20, 18, 26], face });
    const [w, d] = face === 'n' || face === 's' ? [8, 6] : [6, 8];
    assert.equal(F.w, w);
    assert.equal(F.d, d);
    // The front's corners lie on the street side; the back on the other
    const front = face === 'n' ? 20 : face === 's' ? 26 : face === 'w' ? 10 : 18;
    const [fx, fz] = F.at(w / 2, 0);
    assert.equal(face === 'n' || face === 's' ? fz : fx, front);
    assert.deepEqual(F.rect(0, 0, w, d), [10, 20, 18, 26]);
  }
});

test('a recipe lays a block inside its outline, nothing overlapping, the same every time', () => {
  const blocks: Pt[][] = [
    rect(0, 0, 28, 26),
    rect(0, 0, 22, 40),
    // A cut corner: a slanted side takes no row, and the rows stop short of it
    [
      [0, 0],
      [30, 0],
      [30, 18],
      [18, 30],
      [0, 30],
    ],
  ];
  for (const id of Object.keys(RECIPES) as RecipeId[]) {
    const recipe = RECIPES[id];
    for (const [n, poly] of blocks.entries()) {
      const laid = layBlock(poly, recipe, 11 + n);
      assert.deepEqual(laid, layBlock(poly, recipe, 11 + n), 'seeded');
      assert.ok(laid.lots.length > 0, `${id} lays something`);
      const boxes = [...laid.lots.map((l) => l.box), ...laid.alleys.map((a) => a.box)];
      for (const b of boxes) assert.ok(within(poly, b), `${id}: ${b} inside the block`);
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) assert.ok(!overlap(boxes[i], boxes[j]), `${id}: ${boxes[i]} clear of ${boxes[j]}`);
      for (const l of laid.lots) {
        assert.ok(kitsOf(recipe).includes(l.type) || (l.type === 'brownstone' && !!recipe.mix?.shop), `${id} lays only its own kits (${l.type})`);
        if (l.sign) assert.ok(l.sign in SIGNS);
        if (l.type === 'shop') assert.ok(l.sign, 'every shop has its sign');
        assert.deepEqual(l.solids, lotSolids(l));
        // Footprints stay on the lot
        for (const s of l.solids) assert.ok(s[0] >= l.box[0] - 1e-6 && s[2] <= l.box[2] + 1e-6 && s[1] >= l.box[1] - 1e-6 && s[3] <= l.box[3] + 1e-6, `${l.type} solid on its lot`);
        assert.ok(Math.max(...l.solids.map((s) => s[4])) <= KIT_TALLEST + 1e-6);
      }
      // A different seed lays it differently (for the row recipes)
      if (!recipe.big) assert.notDeepEqual(laid, layBlock(poly, recipe, 99));
    }
  }
});

test('rows fill a street front: widths in their kit\'s range, alleys between, few towers', () => {
  const poly = rect(0, 0, 30, 28);
  const laid = layBlock(poly, RECIPES.midtown, 5);
  const rows = rowsOf(poly, RECIPES.midtown.depth);
  assert.equal(rows.length, 4);
  // How much of the street fronts is built on (the rest is alleys and the odd set-back)
  const front = rows.reduce((n, r) => n + r.a1 - r.a0, 0);
  const built = laid.lots.reduce((n, l) => n + Math.max(l.box[2] - l.box[0], l.box[3] - l.box[1]) * 0 + (l.face === 'n' || l.face === 's' ? l.box[2] - l.box[0] : l.box[3] - l.box[1]), 0);
  assert.ok(built / front > 0.75, `${built} of ${front}`);
  assert.ok(laid.lots.filter((l) => l.type === 'office' || l.type === 'hotel').length <= RECIPES.midtown.towers);
  for (const l of laid.lots) {
    const w = l.face === 'n' || l.face === 's' ? l.box[2] - l.box[0] : l.box[3] - l.box[1];
    assert.ok(w >= 2.4 - 1e-6, `${l.type} ${w}`);
  }
  // Houses stand apart, yards between
  const sub = layBlock(poly, RECIPES.suburb, 5).lots;
  assert.ok(sub.every((l) => l.type === 'house'));
  for (let i = 0; i < sub.length; i++)
    for (let j = i + 1; j < sub.length; j++) {
      const [a, b] = [bodyOf(sub[i] as unknown as Infill), bodyOf(sub[j] as unknown as Infill)];
      const gap = Math.max(b[0] - a[2], a[0] - b[2], b[1] - a[3], a[1] - b[3]);
      assert.ok(gap > 1, 'yards between houses');
    }
});

test('the test district: about 300 buildings on open land, clear of the town, roads, river, airport and kart park', () => {
  const d = testDistrict();
  assert.ok(d.lots.length >= 270 && d.lots.length <= 340, `${d.lots.length} buildings`);
  // Every kit is in it
  const kinds = new Set<KitId>(d.lots.map((l) => l.type));
  for (const id of KIT_IDS) assert.ok(kinds.has(id), `a ${id}`);
  const [x0, z0, x1, z1] = DISTRICT_RECT;
  assert.ok(x0 > WORLD_BOUNDS[0] && x1 < WORLD_BOUNDS[2] && z0 > WORLD_BOUNDS[1] && z1 < WORLD_BOUNDS[3]);
  assert.ok(z0 > RIVER[1]);
  for (const r of NS_ROADS) assert.ok(r.c + r.half < x0 || r.c - r.half > x1);
  for (const r of EW_ROADS) assert.ok(r.c + r.half < z0 || r.c - r.half > z1);
  assert.ok(x1 < SITE[0] && !(KART_PARK.z1 > z0 && KART_PARK.x0 < x1));
  for (let x = x0; x <= x1; x += 4) for (let z = z0; z <= z1; z += 4) assert.ok(!inTown([x, z], 0), `${x}, ${z} out of town`);
  // Blocks clear of the streets, buildings on their blocks
  for (const b of DISTRICT_BLOCKS) for (const s of DISTRICT_STREETS) assert.ok(!overlap(b.slab, s));
  for (const [n, laid] of d.byBlock.entries()) for (const l of laid.lots) assert.ok(within(DISTRICT_BLOCKS[n].poly, l.box));
  const solids = districtSolids();
  assert.ok(solids.length >= d.lots.length);
  assert.ok(solids.every(([a, b, c, e]) => inDistrict((a + c) / 2, (b + e) / 2)));
});
