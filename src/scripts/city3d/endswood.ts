/*
 * Endswood Estate, "the Ends" (docs/estate-plan.md, the owner's call; DOM-free, the boot's): a rough London council
 * estate, a brutalist concrete jungle with subways, underpasses and abandoned buildings, on the land south of the ring
 * highway under The Trenches where Lot 9 stood until it moved south (lot9.ts `MOVED`).
 *
 * Phase 1 (Lot 9 moved south) only holds its land as Lot 9 left it, so what stood by it stays as it was: the highway's
 * sound walls, the courts and murals under its deck (viadress.ts), the outskirts' trees and the rolls kept off
 * (landuse.ts), the sodium lamps and the hood's sound round it (lampmix.ts, ambience.ts). Nothing's built on it yet.
 */
import { HIGHWAY_BOX, HIGHWAY_HALF } from './highway';
import { NS_ROADS } from './layout';

export type Rect = [number, number, number, number];

export const ENDSWOOD_NAME = 'Endswood Estate';

/** The south avenue (ns0s), the estate's east edge for now */
const AVE = NS_ROADS[0];
/**
 * The estate's land: from the highway's south edge to Lot 9's old south fence, from its old west fence to the south
 * avenue's west kerb (exactly Lot 9's old land with its tunnel's ramp: Phase 2 widens it, docs/estate-plan.md)
 */
export const ENDSWOOD_RECT: Rect = [-130, HIGHWAY_BOX[3] + HIGHWAY_HALF + 2, AVE.c - AVE.half, 414];
export const inEndswood = (x: number, z: number, m = 0) => x > ENDSWOOD_RECT[0] - m && x < ENDSWOOD_RECT[2] + m && z > ENDSWOOD_RECT[1] - m && z < ENDSWOOD_RECT[3] + m;
