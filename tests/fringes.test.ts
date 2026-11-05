// The slivers by the highway (fringes.ts, docs/blend-plan.md Phase 5c): everything of theirs inside the ring highway
// and clear of its lamps, on open land (no street, block or slab), clear of everything that was there and of the
// metro, under the Emporium; the wash and the path clear of each other, the path joining Sunridge's footpath and the
// north ring avenue; the boards' copy fixed and made up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BILLBOARDS, BOARD, BOARD_COPY, FRINGE_BENCHES, FRINGE_PATH, FRINGE_SOLIDS, HEADWALLS, HEADWALL, HIGHWAY_KEEP, PATH_W, REGIONS, SUBSTATION, WASH, WASH_W,
  endsOf, headwallCorners, legsOf, lineDist, onFringe, pathWidth, type Pt,
} from '../src/scripts/city3d/fringes';
import { PLAN, distToStreet, inPoly, slabOf } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { TRACKS } from '../src/scripts/city3d/metro';
import { fromHighway, insideHighway } from '../src/scripts/city3d/highway';
import { EL_CLEAR, keptOff } from '../src/scripts/city3d/landuse';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { PATH as SUN_PATH } from '../src/scripts/city3d/sunridge';
import { EW_ROADS } from '../src/scripts/city3d/layout';

const mine = new Set(FRINGE_SOLIDS);
const others = SOLIDS.filter((b) => !mine.has(b));
const overlap = (a: readonly number[], b: readonly number[], m = 0) => a[0] < b[2] + m && a[2] > b[0] - m && a[1] < b[3] + m && a[3] > b[1] - m;
const fromTrack = (p: Pt) => Math.min(...Object.values(TRACKS).map((t) => lineDist(t.pts, p[0], p[1])));
const corners = (r: readonly number[]): Pt[] => [
  [r[0], r[1]],
  [r[2], r[1]],
  [r[0], r[3]],
  [r[2], r[3]],
];
const slabs = PLAN.blocks.map(slabOf);
const streets = PLAN.streets.filter((s) => s.kind !== 'highway');
/** Points every half tile along a line, and `half` either side of it (or its width there, halved) */
function band(pts: readonly Pt[], half: number | ((x: number, z: number) => number)): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-9) continue;
    const [nx, nz] = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
    for (let d = 0; d <= l; d += 0.5) {
      const [x, z] = [a[0] + ((b[0] - a[0]) * d) / l, a[1] + ((b[1] - a[1]) * d) / l];
      const h = typeof half === 'number' ? half : half(x, z) / 2;
      for (const s of [-h, 0, h]) out.push([x + nx * s, z + nz * s]);
    }
  }
  return out;
}
/** Everything of theirs on the ground, as points: the compound's and the boards' outlines, the legs, the wash, the path, the headwalls, the benches */
const POINTS: [string, Pt][] = [
  ...corners(SUBSTATION.rect).map((p) => ['substation', p] as [string, Pt]),
  ...corners(SUBSTATION.drive).filter((p) => p[0] > SUBSTATION.drive[0] + 0.05).map((p) => ['drive', p] as [string, Pt]),
  ...BILLBOARDS.flatMap((b) => [...endsOf(b), ...legsOf(b)].map((p) => [`board ${b.id}`, p] as [string, Pt])),
  ...band(WASH, WASH_W / 2).map((p) => ['wash', p] as [string, Pt]),
  ...band(FRINGE_PATH, pathWidth).map((p) => ['path', p] as [string, Pt]),
  ...HEADWALLS.flatMap((h) => headwallCorners(h).map((p) => ['headwall', p] as [string, Pt])),
  ...FRINGE_BENCHES.map((b) => ['bench', b.at] as [string, Pt]),
];

test('all of it inside the ring highway and clear of its lamps', () => {
  for (const [what, p] of POINTS) assert.ok(insideHighway(p[0], p[1]) && fromHighway(p[0], p[1]) >= HIGHWAY_KEEP, `${what} at ${p.map((v) => v.toFixed(1))} is ${fromHighway(p[0], p[1]).toFixed(2)} from the highway`);
  for (const r of Object.values(REGIONS)) for (const p of corners(r)) assert.ok(fromHighway(p[0], p[1]) < 30 || insideHighway(p[0], p[1]), `region corner ${p}`);
});

test('on open land: off every street (the drive meets Kiln Lane), every block and its slab', () => {
  for (const [what, p] of POINTS) {
    for (const s of streets) assert.ok(distToStreet(s, p) > s.half + 0.3, `${what} at ${p.map((v) => v.toFixed(1))} is on ${s.id}`);
    assert.ok(!slabs.some((sl) => inPoly(sl, p)), `${what} at ${p.map((v) => v.toFixed(1))} is on a block`);
  }
  // (the drive runs from Kiln Lane's edge to the gate)
  const kiln = PLAN.streets.find((s) => s.id === 'sy-ring')!;
  assert.ok(Math.abs(distToStreet(kiln, [SUBSTATION.drive[0], (SUBSTATION.drive[1] + SUBSTATION.drive[3]) / 2]) - kiln.half) < 0.3);
  assert.equal(SUBSTATION.drive[2], SUBSTATION.rect[0]);
  assert.ok(SUBSTATION.drive[1] >= SUBSTATION.gate[0] && SUBSTATION.drive[3] <= SUBSTATION.gate[1]);
});

test('what is solid stands clear of everything that was there, of the metro, and under the Emporium', () => {
  for (const b of FRINGE_SOLIDS) {
    for (const o of others) assert.ok(!overlap(b, o, 0.4), `${b.map((v) => v.toFixed(1))} meets ${o.map((v) => v.toFixed(1))}`);
    assert.ok(b[4] < EMPORIUM_ROOF, `${b} is too tall`);
  }
  for (const [what, p] of POINTS) assert.ok(fromTrack(p) > EL_CLEAR, `${what} at ${p} is under the el`);
  const S = SUBSTATION;
  assert.ok(S.frames.h < EMPORIUM_ROOF && BOARD.y + BOARD.h + 0.6 < EMPORIUM_ROOF);
  // (what stands inside the compound stays inside it)
  for (const r of [S.house.rect, ...S.transformers]) assert.ok(r[0] > S.rect[0] && r[1] > S.rect[1] && r[2] < S.rect[2] && r[3] < S.rect[3], `${r}`);
  for (const r of S.transformers) assert.ok(!overlap(r, S.house.rect, 0.5));
  for (const x of [...S.frames.x, ...S.bars.x]) assert.ok(x > S.rect[0] + 0.5 && x < S.rect[2] - 0.5);
  for (const z of [...S.frames.z, ...S.bars.z]) assert.ok(z > S.rect[1] + 0.5 && z < S.rect[3] - 0.5 && z > Math.max(...S.transformers.map((r) => r[3])) + 1);
  // (the house and the transformers clear of the gate's way in)
  for (const r of [S.house.rect, ...S.transformers]) assert.ok(r[1] > S.gate[1] + 0.5 || r[3] < S.gate[0] - 0.5 || r[0] > S.rect[0] + 3, `${r} blocks the gate`);
});

test('the wash and the path: clear of each other, the boards and the wall, the path from Sunridge’s footpath to the avenue', () => {
  // The wash stays inside the fringe, the path between it and Sunridge's wall
  for (const p of WASH) assert.ok(fromHighway(p[0], p[1]) > 9.5 && fromHighway(p[0], p[1]) < 15, `the wash at ${p} is ${fromHighway(p[0], p[1]).toFixed(1)} in`);
  for (const p of band(FRINGE_PATH, pathWidth)) assert.ok(lineDist(WASH, p[0], p[1]) > WASH_W / 2 + 0.4, `the path at ${p} meets the wash`);
  for (const b of BILLBOARDS) for (const p of endsOf(b)) assert.ok(lineDist(WASH, p[0], p[1]) > WASH_W / 2 + 0.4 && lineDist(FRINGE_PATH, p[0], p[1]) > PATH_W / 2 + 1, `board ${b.id}`);
  // ...and every point of it clear of Sunridge's wall (what's solid near it)
  // (0.3 clear; 0.15 where it squeezes past the end of Palm Court's low wall)
  for (const p of band(FRINGE_PATH, pathWidth)) {
    const m = pathWidth(p[0], p[1]) < PATH_W ? 0.15 : 0.3;
    for (const o of others) assert.ok(!(p[0] > o[0] - m && p[0] < o[2] + m && p[1] > o[1] - m && p[1] < o[3] + m), `the path at ${p} meets ${o}`);
  }
  for (const p of band(WASH, WASH_W / 2)) for (const o of others) assert.ok(!(p[0] > o[0] && p[0] < o[2] && p[1] > o[1] && p[1] < o[3]), `the wash at ${p} meets ${o}`);
  // It starts by Sunridge's footpath, west of where the footpath begins, and ends at the north ring avenue's kerb
  const [first, last] = [FRINGE_PATH[0], FRINGE_PATH[FRINGE_PATH.length - 1]];
  assert.ok(first[0] < SUN_PATH[0] && SUN_PATH[0] - first[0] < 2 && first[1] > SUN_PATH[1] - 1 && first[1] < SUN_PATH[3], `${first}`);
  const ave = EW_ROADS[0];
  assert.ok(last[1] < ave.c - ave.half && ave.c - ave.half - last[1] < 2.5, `${last}`);
  // A long walk: round the fringe, a hundred tiles and more each way
  assert.ok(Math.max(...FRINGE_PATH.map((p) => p[0])) - first[0] > 140 && last[1] - Math.min(...FRINGE_PATH.map((p) => p[1])) > 140);
  // The headwalls at its ends, the benches beside the path facing the wash
  assert.equal(HEADWALLS.length, 2);
  for (const b of FRINGE_BENCHES) {
    assert.ok(lineDist(FRINGE_PATH, b.at[0], b.at[1]) > PATH_W / 2 + 0.2 && lineDist(WASH, b.at[0], b.at[1]) > WASH_W / 2 + 0.6, `bench at ${b.at}`);
    assert.ok(fromHighway(b.at[0] + b.face[0], b.at[1] + b.face[1]) < fromHighway(b.at[0], b.at[1]), 'the bench faces the wash');
  }
  assert.ok(HEADWALL.w > WASH_W);
});

test('the trees keep off them; the scrub keeps off them too', () => {
  for (const [what, p] of POINTS) assert.notEqual(keptOff(p[0], p[1]), null, `a tree could stand on the ${what} at ${p}`);
  for (const [what, p] of POINTS) assert.ok(onFringe(p[0], p[1], 0.01) || what === 'bench' || what.startsWith('board'), `${what} at ${p}`);
});

test("the boards' copy: fixed, made up, no prices or numbers", () => {
  assert.equal(new Set(BILLBOARDS.map((b) => b.copy)).size, BILLBOARDS.length);
  for (const b of BILLBOARDS) assert.ok(BOARD_COPY[b.copy]);
  for (const c of BOARD_COPY) assert.ok(!/[0-9$£€%]/.test(c.head + c.sub), c.head);
  for (const b of BILLBOARDS) assert.ok(Math.abs(Math.hypot(...b.face) - 1) < 1e-9);
  // Each faces the highway (its face points at it)
  for (const b of BILLBOARDS) assert.ok(fromHighway(b.at[0] + b.face[0] * 2, b.at[1] + b.face[1] * 2) < fromHighway(b.at[0], b.at[1]), b.id);
});
