/*
 * The Neon Mile, the Strip (docs/strip-plan.md; the owner's call: a strip like Las Vegas, lights and casinos), on the
 * open land between the Parkway's east side and the ring highway's east side, north of the river (the kart park's
 * old land). Phase 1: the boulevard and the land. DOM-free: the street plan (streetplan.ts `cityPlan()`), traffic,
 * the trees, the lamps (index.ts) and the drawing (strip3d.ts, as you approach) read it.
 *
 * - **The boulevard** (`strip-blvd`, layout.ts `STRIP_BLVD`): along z 30 from the Parkway (a lit T) to the east road,
 *   two lanes each way either side of a broad planted median (palms, neon uplights: strip3d.ts).
 * - **The east road** (`strip-east`, x `STRIP_EAST_X`): from the ring's north avenue to the north bank avenue, short of
 *   the highway's slip lanes; the boulevard ends on it at a lit T, and downtown's two small east-west streets start
 *   again from it (`ew1e`, `ew2e`: layout.ts `STRIP_GAP`), so the highway's junctions and Crestmont's streets past
 *   them are as they were.
 * - **The lots** (`STRIP_BLOCKS`, ref `strip`): a north row between the ring's north avenue and the boulevard, a
 *   south row between the boulevard and the north bank avenue, their west sides along the Parkway's outer sidewalk,
 *   a wide sidewalk round each (`STRIP_WALK`). The resorts come in Phase 2.
 * - **Lamps** (`STRIP_LAMPS`) along the boulevard's sidewalks and the east road.
 *
 * Today's world numbers, well inside the world at both sizes. Names are made up.
 */
import { EW_ROADS, LANE, RING_HI, STRIP_BLVD, STRIP_EAST_X, WALK_W } from './layout';
import { BENDS, BEND_REACH } from './outer';
import type { CarId } from './carspec';

type Pt = [number, number];
export type Rect = [number, number, number, number];

/** The Strip's name (the owner's) */
export const STRIP_NAME = 'The Neon Mile';
/** The sidewalk round its lots: wider than the town's */
export const STRIP_WALK = 1.2;

const NORTH = EW_ROADS[0];
const BANK = EW_ROADS.find((r) => r.c === RING_HI)!;
const { z: BZ, half: BH } = STRIP_BLVD;
const PARKWAY = BENDS.find((b) => b.id === 'parkway')!.pts;

/** Where the Parkway's centre line crosses z (on its east leg) */
export function parkwayX(z: number): number {
  let best = -Infinity;
  for (let i = 1; i < PARKWAY.length; i++) {
    const [a, b] = [PARKWAY[i - 1], PARKWAY[i]];
    if ((a[1] - z) * (b[1] - z) > 0 || a[1] === b[1]) continue;
    const x = a[0] + ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]);
    best = Math.max(best, x);
  }
  return best;
}

/** The boulevard's west end, on the Parkway's line */
export const BLVD_WEST = parkwayX(BZ);

/* ---------- The streets ---------- */

export interface StripStreet {
  id: string;
  name: string;
  pts: Pt[];
  kind: 'avenue' | 'street';
  half: number;
  lanes: 1 | 2;
  median?: number;
}
export const STRIP_STREETS: StripStreet[] = [
  { id: 'strip-blvd', name: STRIP_NAME, pts: [[BLVD_WEST, BZ], [STRIP_EAST_X, BZ]], kind: 'avenue', half: BH, lanes: 2, median: STRIP_BLVD.median },
  { id: 'strip-east', name: 'Mile End Road', pts: [[STRIP_EAST_X, NORTH.c], [STRIP_EAST_X, BANK.c]], kind: 'street', half: LANE, lanes: 1 },
];

export interface StripCrossing {
  id: string;
  at: Pt;
  streets: string[];
  lights: boolean;
}
export const STRIP_CROSSINGS: StripCrossing[] = [
  // The boulevard off the Parkway, lit (the welcome sign stands in its median there, Phase 3)
  { id: 'strip-parkway', at: [BLVD_WEST, BZ], streets: ['parkway', 'strip-blvd'], lights: true },
  // The east road: lit at the avenues and the boulevard, the two small streets carrying on east from it
  { id: 'strip-east-ew0', at: [STRIP_EAST_X, NORTH.c], streets: ['ew0', 'strip-east'], lights: true },
  { id: 'strip-east-ew1', at: [STRIP_EAST_X, 17], streets: ['ew1e', 'strip-east'], lights: false },
  { id: 'strip-east-blvd', at: [STRIP_EAST_X, BZ], streets: ['strip-blvd', 'strip-east'], lights: true },
  { id: 'strip-east-ew2', at: [STRIP_EAST_X, 43], streets: ['ew2e', 'strip-east'], lights: false },
  { id: 'strip-east-ew3', at: [STRIP_EAST_X, BANK.c], streets: [`ew${EW_ROADS.indexOf(BANK)}`, 'strip-east'], lights: true },
];

/* ---------- The lots ---------- */

/** The Parkway's outer sidewalk's edge, `d` further out, from z0 to z1 (going south): its own vertices, offset */
function parkwaySide(z0: number, z1: number, d: number): Pt[] {
  const out: Pt[] = [];
  const at = (z: number): Pt => {
    // (the offset of the segment z lies on, along its outward normal: +x on the east leg)
    for (let i = 1; i < PARKWAY.length; i++) {
      const [a, b] = [PARKWAY[i - 1], PARKWAY[i]];
      if ((a[1] - z) * (b[1] - z) > 0 || a[1] === b[1] || Math.max(a[0], b[0]) < 0) continue;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let [nx, nz] = [(b[1] - a[1]) / len, -(b[0] - a[0]) / len];
      if (nx < 0) [nx, nz] = [-nx, -nz];
      const t = (z - a[1]) / (b[1] - a[1]);
      const p: Pt = [a[0] + (b[0] - a[0]) * t + nx * d, a[1] + (b[1] - a[1]) * t + nz * d];
      // (shifted back onto the line z, along the segment)
      const s = (z - p[1]) / ((b[1] - a[1]) / len);
      return [p[0] + ((b[0] - a[0]) / len) * s, z];
    }
    throw new Error(`the Parkway doesn't cross z ${z}`);
  };
  out.push(at(z0));
  // Every Parkway vertex between, offset
  const inner = PARKWAY.filter((p) => p[0] > 0 && p[1] > Math.min(z0, z1) + 0.3 && p[1] < Math.max(z0, z1) - 0.3).sort((p, q) => p[1] - q[1]);
  for (const p of z0 < z1 ? inner : inner.reverse()) out.push(at(p[1]));
  out.push(at(z1));
  return out;
}

export interface StripBlock {
  id: string;
  /** Its outline inside its sidewalk, counter-clockwise from above as streetplan.ts's (west side going south first) */
  poly: Pt[];
  walk: number;
}
const W = STRIP_WALK;
const X1 = STRIP_EAST_X - LANE - W;
/** The rows' edges (z): the north row from the ring's north avenue to the boulevard, the south row to the bank avenue */
export const ROWS = {
  north: [NORTH.c + NORTH.half + W, BZ - BH - W] as [number, number],
  south: [BZ + BH + W, BANK.c - BANK.half - W] as [number, number],
};
const row = (id: string, [z0, z1]: [number, number]): StripBlock => ({
  id,
  poly: [...parkwaySide(z0, z1, BEND_REACH + W), [X1, z1], [X1, z0]],
  walk: W,
});
export const STRIP_BLOCKS: StripBlock[] = [row('strip-north', ROWS.north), row('strip-south', ROWS.south)];

/** The Strip's land (the trees keep off; the drawing's district): from the Parkway's line to the highway's slip lanes */
export const STRIP_RECT: Rect = [parkwayX(NORTH.c) - 1, NORTH.c - NORTH.half - WALK_W, 262, BANK.c + BANK.half];
export const inStrip = (x: number, z: number, m = 0) => x > STRIP_RECT[0] - m && x < STRIP_RECT[2] + m && z > STRIP_RECT[1] - m && z < STRIP_RECT[3] + m;

/* ---------- Lamps ---------- */

/** The sidewalks' top (world.ts SLAB) */
const SLAB_Y = 0.15;
/** Lamps: x, z, the way the arm reaches (over the road), the ground's height */
export const STRIP_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const IN = BH + 0.45;
  // The boulevard's sidewalks, both sides, every 10 (staggered), clear of its ends
  // (their arms over the road: the north side's reach south, +z, the south side's north)
  for (let x = BLVD_WEST + 9; x < STRIP_EAST_X - 6; x += 10) {
    out.push([x, BZ - IN, Math.PI / 2, SLAB_Y]);
    if (x + 5 < STRIP_EAST_X - 6) out.push([x + 5, BZ + IN, -Math.PI / 2, SLAB_Y]);
  }
  // The east road's west sidewalk, clear of the junctions
  for (let z = NORTH.c + 8; z < BANK.c - 6; z += 12) if ([17, BZ, 43].every((c) => Math.abs(z - c) > 6)) out.push([X1 + W - 0.45, z, 0, SLAB_Y]);
  return out;
})();

/* ---------- Its traffic (Phase 5) ---------- */

/**
 * The Strip's own cars (life.ts, as Crestmont's and Sunridge's): the open-top party bus first (`STRIP_LEAD`), then
 * these in turn, put back on its streets when they wander off; its Cruisers in taxi yellow (`STRIP_PAINTS`)
 */
export const STRIP_LEAD: CarId = 'partybus';
export const STRIP_MIX: CarId[] = ['limo', 'sedan', 'super', 'limo', 'exec', 'sedan', 'coupe', 'limo'];
export const STRIP_PAINTS: Partial<Record<CarId, string>> = { sedan: '#ffc23d' };
