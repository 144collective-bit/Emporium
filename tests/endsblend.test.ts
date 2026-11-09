// Endswood blended into its neighbours (endsblend.ts, docs/estate-plan.md Phase 6): the common down to Lot 9 (the
// footpath and the desire line clear, the ditch crossed only at the plank, the tipping and the broken chain-link off
// the paths, sodium all the way), the trees kept off it but its own; a skate spot and lock-ups under the viaduct by
// the estate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRAMBLES, CHAIN_RUNS, COMMON, COMMON_LAMPS, COMMON_SOLIDS, COMMON_TREES, DESIRE, DESIRE_HALF, DITCH, DITCH_SOLIDS, PATH_HALF, PLANK, TIPPED, chainBox, ditchZ, inCommon, pathX, tipBox } from '../src/scripts/city3d/endsblend';
import { FENCE as LOT9_FENCE, FOOTPATH } from '../src/scripts/city3d/lot9';
import { ENDS_BLOCKS, SOUTH_Z, type Pt } from '../src/scripts/city3d/endswood';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { treeSpot } from '../src/scripts/city3d/outskirts';
import { sodiumShare } from '../src/scripts/city3d/lampmix';
import { PLAN, distToStreet, inPoly } from '../src/scripts/city3d/streetplan';
import { SKATE_MIN, UNDER, UNDER_SOLIDS, besideIn, skateParts } from '../src/scripts/city3d/viadress';
import { ENDSWOOD_RECT } from '../src/scripts/city3d/endswood';
import { PIERS } from '../src/scripts/city3d/viapiers';
import { ringPoint } from '../src/scripts/city3d/viaduct';

const inBox = (b: readonly number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;
const overlap = (a: readonly number[], b: readonly number[], m = 0) => a[0] < b[2] + m && a[2] > b[0] - m && a[1] < b[3] + m && a[3] > b[1] - m;
/** Points every half tile along a line */
const along = (pts: readonly Pt[]) =>
  pts.slice(1).flatMap((c, i) => {
    const a = pts[i];
    const n = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 0.5);
    return Array.from({ length: n }, (_, k): Pt => [a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n]);
  });

test("the common lies between the estate's south edge and Lot 9's fence, off the streets and the blocks", () => {
  assert.ok(COMMON[1] > SOUTH_Z && COMMON[3] < LOT9_FENCE[1]);
  for (const s of PLAN.streets) for (const [x, z] of [[COMMON[0], COMMON[1]], [COMMON[2], COMMON[1]], [COMMON[2], COMMON[3]], [COMMON[0], COMMON[3]]] as Pt[]) assert.ok(distToStreet(s, [x, z]) > s.half + 0.8 || !inCommon(x, z, -0.01), `the common on ${s.id}`);
  for (const b of ENDS_BLOCKS) for (const p of b.poly) assert.ok(!inCommon(p[0], p[1], -0.5), `${b.id} on the common`);
  // (the footpath crosses it, the desire line comes off the estate's south edge to it)
  assert.ok(FOOTPATH.some((p) => inCommon(p[0], p[1])));
  assert.ok(Math.abs(DESIRE[0][1] - SOUTH_Z) < 2);
  const end = DESIRE[DESIRE.length - 1];
  assert.ok(Math.abs(pathX(end[1]) - end[0]) < 3, 'the desire line meets the path');
});

test('the footpath and the desire line are clear: nothing solid on them but at the plank, the ditch crossed there only', () => {
  const walks = [...along(FOOTPATH.filter((p) => inCommon(p[0], p[1], 2))), ...along(DESIRE)];
  for (const [x, z] of walks) for (const b of COMMON_SOLIDS) assert.ok(!inBox(b, x, z, PATH_HALF * 0.5), `${b.slice(0, 4).map((v) => v.toFixed(1))} on the path at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  // The plank is where the path meets the ditch, and the ditch is solid either side of it, from end to end
  assert.ok(Math.abs(PLANK.z - ditchZ(PLANK.x)) < 0.05 && Math.abs(PLANK.x - pathX(PLANK.z)) < 0.05);
  for (let x = COMMON[0] + 3; x < COMMON[2] - 4; x += 0.5) {
    const solid = DITCH_SOLIDS.some((b) => inBox(b, x, ditchZ(x), 0.01));
    const dx = Math.abs(x - PLANK.x);
    if (dx > 1.6 || dx < 1.2) assert.equal(solid, dx > 1.6, `the ditch at ${x}`);
  }
  assert.ok(DITCH.bank < 0.4);
});

test('the tipping, the chain-link, the brambles and the trees keep apart and on the common; the lamps are sodium, clear of everything', () => {
  const boxes = [...TIPPED.map(tipBox), ...CHAIN_RUNS.map(chainBox)];
  for (const b of boxes) {
    assert.ok(inCommon(b[0], b[1]) && inCommon(b[2], b[3]), `${b} off the common`);
    for (const d of DITCH_SOLIDS) assert.ok(!overlap(b, d, 0.5), `${b} in the ditch`);
  }
  // (the tipping apart from each other and the fence; the fence's runs follow on from each other)
  for (let i = 0; i < TIPPED.length; i++) for (let j = i + 1; j < boxes.length; j++) assert.ok(!overlap(boxes[i], boxes[j], 0.8), `${i} and ${j}`);
  for (const [x, z, r] of BRAMBLES) {
    assert.ok(inCommon(x, z, -r));
    for (const b of [...boxes, ...DITCH_SOLIDS]) assert.ok(!inBox(b, x, z, r), `a bramble on ${b}`);
    assert.ok(Math.abs(x - pathX(z)) > r + PATH_HALF);
  }
  for (const [x, z] of COMMON_TREES) {
    assert.ok(inCommon(x, z, -1));
    for (const b of SOLIDS) assert.ok(!inBox(b, x, z, 0.6));
    assert.ok(Math.abs(x - pathX(z)) > 2);
  }
  // (the outskirts' trees keep off the common: it carries its own)
  for (let x = COMMON[0] + 1; x < COMMON[2]; x += 4) for (let z = COMMON[1] + 1; z < COMMON[3]; z += 4) assert.ok(!treeSpot(x, z), `an outskirts tree at ${x}, ${z}`);
  assert.ok(COMMON_LAMPS.length >= 4);
  for (const [x, z] of COMMON_LAMPS) {
    assert.ok(inCommon(x, z));
    assert.ok(!SOLIDS.some((b) => inBox(b, x, z, 0.3)), `a lamp in something at ${x}, ${z}`);
    assert.ok(sodiumShare(x, z) > 0.99, `a white lamp at ${x}, ${z}`);
  }
  for (const [x, z] of [...COMMON_LAMPS]) for (const [dx, dz] of DESIRE) assert.ok(Math.hypot(x - dx, z - dz) > DESIRE_HALF + 0.3);
  for (const b of COMMON_SOLIDS) assert.ok(SOLIDS.includes(b));
});

test('under the viaduct by Endswood: a skate spot and lock-ups', () => {
  const by = UNDER.filter((u) => besideIn((u.s0 + u.s1) / 2, [ENDSWOOD_RECT]));
  const kinds = new Set(by.map((u) => u.kind));
  assert.ok(kinds.has('skate') && kinds.has('store'), [...kinds].join());
  for (const u of UNDER.filter((u) => u.kind === 'skate')) {
    assert.ok(u.s1 - u.s0 >= SKATE_MIN);
    for (const p of skateParts(u)) {
      assert.ok(p.s0 >= u.s0 && p.s1 <= u.s1 && p.s0 < p.s1 && p.o0 < p.o1);
      // (off the piers and their heads: the stretch is between them)
      for (const pr of PIERS) {
        const [x, z] = ringPoint((p.s0 + p.s1) / 2, (p.o0 + p.o1) / 2);
        assert.ok(Math.hypot(x - pr.at[0], z - pr.at[1]) > 1, 'a skate piece on a pier');
      }
    }
  }
  // (their pieces solid; nothing under the deck on the estate's own blocks)
  const skateBoxes = UNDER_SOLIDS.length;
  assert.ok(skateBoxes > 0);
  for (const b of ENDS_BLOCKS) for (const u of UNDER.filter((u) => u.kind === 'skate')) for (const p of skateParts(u)) assert.ok(!inPoly(b.poly, ringPoint((p.s0 + p.s1) / 2, (p.o0 + p.o1) / 2)));
});
