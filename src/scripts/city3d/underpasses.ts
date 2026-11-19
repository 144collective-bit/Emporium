/*
 * The south's underpasses under its avenue crossings (docs/south-plan.md Phase 4, step 4c; the owner's calls,
 * 2026-11-19): a subway under the wide south avenue between Marsh Lane and Lot 9's road, and one each under Endswood
 * Road and Marsh Lane on their bends in from the avenues. Plainer than the Circus's (the owner's call: concrete and
 * strip lights, no murals or neon, the Circus the showpiece). Each a straight passage of the underground kit
 * (underground.ts `straight()`): a ramp down on one side, roofed under the road and its sidewalks, a ramp up the
 * other. With the Circus's (circus.ts), what's cut out of the blocks' slabs, the junctions' asphalt and the grass
 * (`SLAB_CUTS`, `GROUND_HOLES`). DOM-free, tested in tests/underpasses.test.ts; drawn by underpass3d.ts.
 */
import { ENDSWOOD_ROAD, MARSH_LANE, type Pt } from './south';
import { CEIL, CIRCUS_CUTS, CIRCUS_HOLE, FLOOR } from './circus';
import { cutOf, openOf, pointOf, straight, type Passage, type Rect } from './underground';
import { boundsOf } from './holes';
import { STAIR_CUTS } from './southline';
import { PLAN } from './streetplan';
import { inside, nearestIndex } from './streetfaces';

/** A ramp's length (about one in four, as the Circus's and Lot 9's), the passage's half width, its walls */
export const RAMP = 7.6;
const HALF = 1.3;
const WALL = 0.25;
/** How far past a road's sidewalk its roof reaches either side */
const PAST = 0.6;
/** The south avenue (layout.ts `NS_ROADS` ns0s: its middle and asphalt's half), a sidewalk's width */
const AVENUE = { x: -4.5, half: 3.7 };
const WALK = 0.8;

/** A crossing: where it goes under its road, which way it runs, how far its roof reaches either side of the road's middle */
export interface Crossing {
  id: 'avenue' | 'endswood' | 'marsh';
  /** What it goes under */
  under: string;
  at: Pt;
  deg: number;
  roof: number;
}
/** Under a road on its bend, near `near`: across it there, square to it */
function onBend(id: Crossing['id'], road: { name: string; pts: Pt[]; half: number }, near: Pt): Crossing {
  const i = Math.max(1, Math.min(road.pts.length - 2, nearestIndex(road.pts, near)));
  const [a, b] = [road.pts[i - 1], road.pts[i + 1]];
  const deg = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI + 90;
  return { id, under: road.name, at: road.pts[i], deg, roof: road.half + WALK + PAST };
}
export const CROSSINGS: Crossing[] = [
  // (along x under the avenue, between Marsh Lane's junction and Lot 9's road: open land both sides)
  { id: 'avenue', under: 'the south avenue', at: [AVENUE.x, 458], deg: 0, roof: AVENUE.half + WALK + PAST },
  onBend('endswood', ENDSWOOD_ROAD, [12.6, 380.1]),
  onBend('marsh', MARSH_LANE, [38.9, 402.3]),
];

export const UNDERPASSES: Passage[] = CROSSINGS.map((c) =>
  straight(`under-${c.id}`, c.at[0], c.at[1], c.deg, { a0: -(c.roof + RAMP), ramp0: -c.roof, roof0: -c.roof, roof1: c.roof, ramp1: c.roof, a1: c.roof + RAMP, half: HALF, wall: WALL, floor: FLOOR, ceil: CEIL, rail: 0.9 })
);
export const underpassOf = (id: Crossing['id']) => UNDERPASSES[CROSSINGS.findIndex((c) => c.id === id)];

/** Each underpass's two open cuttings (its ramps, walls and all) as their four corners: first the way down, then up */
export const UNDER_CUTTINGS: Pt[][][] = UNDERPASSES.map((p) => openOf(p).map(([s0, s1]) => cutOf(p, s0, s1)));
/** Each ramp's top (its mouth's middle), both ends */
export const UNDER_MOUTHS: [Pt, Pt][] = UNDERPASSES.map((p) => [pointOf(p, p.a0), pointOf(p, p.a1)]);

/** Whether each mouth comes up on a block's slab (a step up on to it, over the ramp's top) or on open ground */
export const MOUTH_ON_SLAB: [boolean, boolean][] = UNDER_MOUTHS.map((pair) => pair.map((p) => PLAN.slabs.some((slab) => inside(slab as Pt[], p))) as [boolean, boolean]);

/** What's cut out of the blocks' slabs and the junctions' asphalt (holes.ts): the Circus's, every underpass's ramps and
 * the built underground stations' stairs (southline.ts) */
export const SLAB_CUTS: Pt[][] = [...CIRCUS_CUTS, ...UNDER_CUTTINGS.flat(), ...STAIR_CUTS];
/** The grass cut away under them (the streets and the slabs, holed, cover the rest) */
export const GROUND_HOLES: Rect[] = [CIRCUS_HOLE, ...[...UNDER_CUTTINGS.flat(), ...STAIR_CUTS].map((c): Rect => boundsOf(c))];
