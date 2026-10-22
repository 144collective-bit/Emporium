/*
 * The test district on screen (docs/growth-plan.md Phase 4; only with
 * `?district=test`): its streets and its 20 blocks, each a site
 * (tilework.ts), so it's built as you go like the rest of the fixed city;
 * its buildings drawn from the recipes' layout by the kits (kits3d.ts). Its
 * footprints and raised blocks join walking, driving, flying and bullets
 * (`addSolids()`, `addSlabs()`).
 */
import { Batch } from './kit';
import { drawBlock, drawLot, drawStreet } from './kits3d';
import { RECIPES } from './recipes';
import { DISTRICT_BLOCKS, DISTRICT_STREETS, districtSolids, testDistrict } from './testdistrict';
import { site } from './tilework';
import { addSolids } from './solids';
import type { BenchView } from './bench';
import type { Pt, Rect } from './downtown';

/** How many of a block's buildings one site draws */
const PER_SITE = 4;

/** Register the district's sites (before the boot builds the city's) */
export function buildTestDistrict(low: boolean) {
  const d = testDistrict();
  DISTRICT_STREETS.forEach((s, i) =>
    site(`district street ${i}`, s, (into) => {
      const b = new Batch();
      drawStreet(b, s);
      b.build(into, { cast: false, receive: true });
    })
  );
  // Each block its ground, then its buildings a few at a time: no one site takes long enough to hitch a frame
  DISTRICT_BLOCKS.forEach((blk, i) => {
    const laid = d.byBlock[i];
    site(`district block ${i}`, blk.slab, (into) => {
      const b = new Batch();
      drawBlock(b, blk.slab, blk.poly, RECIPES[blk.recipe].ground, laid.alleys, low);
      b.build(into);
    });
    for (let n = 0; n < laid.lots.length; n += PER_SITE) {
      const lots = laid.lots.slice(n, n + PER_SITE);
      const rect: Rect = [Math.min(...lots.map((l) => l.box[0])), Math.min(...lots.map((l) => l.box[1])), Math.max(...lots.map((l) => l.box[2])), Math.max(...lots.map((l) => l.box[3]))];
      site(`district block ${i} buildings ${n / PER_SITE}`, rect, (into) => {
        const b = new Batch();
        for (const l of lots) drawLot(b, l, low);
        b.build(into);
      });
    }
  });
  addSolids(districtSolids());
  return {
    lots: d.lots.length,
    /** Its raised blocks, for walking on (walk.ts `addSlabs()`) */
    slabs: DISTRICT_BLOCKS.map(({ slab: [x0, z0, x1, z1] }): Pt[] => [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ]),
  };
}

/** The benchmark's views of it: the whole district from above, and down one of its streets */
export const DISTRICT_VIEWS: BenchView[] = [
  { id: 'district', name: 'Test district (300 buildings)', pos: [-24, 42, 116], target: [-118, 0, 166] },
  { id: 'district-street', name: 'Test district, street level', pos: [-48, 2.4, 132.9], target: [-118, 2.6, 132.9] },
];
