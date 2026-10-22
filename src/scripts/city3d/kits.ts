/*
 * Building kits (docs/growth-plan.md Phase 4; DOM-free, tested in
 * tests/recipes.test.ts): every kind of building a district can be filled
 * with, its sizes, heights and what's solid about it. recipes.ts lays them
 * out on a block; kits3d.ts draws them (the six downtown types through
 * infill.ts, the rest its own), each with walls and roofs at every distance
 * and its details near only.
 *
 * - The downtown six (downtown.ts `InfillType`): brownstone, shop, diner,
 *   loft, office, hotel; laid in rows along a street like downtown's.
 * - Rows too: the terrace (a narrow two-storey house with a pitched roof and
 *   a front garden) and the warehouse (wide and low, loading doors on the
 *   street).
 * - The house: detached, in its own yard (rows of them, gaps between).
 * - One to a block: the factory (sheds, a sawtooth roof, a chimney), the
 *   school (a long two-storey block, a yard and a court), the mall (a big
 *   box, its car park in front), the stadium stand (a pitch with a stand
 *   along it, a canopy and floodlights) and the crane (a building going up,
 *   a tower crane over it).
 *
 * Signs are fixed copy from `SIGNS` (made-up names, never the token).
 * Nothing stands taller than `KIT_TALLEST`, well under the Emporium.
 */
import { FLOOR, PARAPET, SHOP_H, bodyOf, stoopOf, type Face, type Footprint, type Infill, type InfillType, type Rect } from './downtown';

export type RowKit = InfillType | 'terrace' | 'warehouse';
export type BigKit = 'factory' | 'school' | 'mall' | 'stand' | 'crane';
export type KitId = RowKit | 'house' | BigKit;

export const ROW_KITS: RowKit[] = ['brownstone', 'shop', 'diner', 'loft', 'office', 'hotel', 'terrace', 'warehouse'];
export const BIG_KITS: BigKit[] = ['factory', 'school', 'mall', 'stand', 'crane'];
export const KIT_IDS: KitId[] = [...ROW_KITS, 'house', ...BIG_KITS];

/** The tallest anything in a kit stands (the crane's mast; the Emporium's roof is about 12.5) */
export const KIT_TALLEST = 11.2;

export interface KitSpec {
  /** Width along the street, smallest and largest (a big kit takes the block's inside) */
  w: [number, number];
  /** Whole floors above the ground floor */
  floors: [number, number];
  /** How far it stands back from its plot's front (a stoop, a garden, tables, a car park) */
  front: number;
}

export const KIT_SPEC: Record<KitId, KitSpec> = {
  brownstone: { w: [2.6, 4.2], floors: [2, 4], front: 0.8 },
  shop: { w: [2.6, 4.2], floors: [1, 4], front: 0.5 },
  diner: { w: [3.5, 4.6], floors: [0, 0], front: 0.9 },
  loft: { w: [3.5, 4.6], floors: [1, 4], front: 0 },
  office: { w: [3.5, 4.6], floors: [5, 9], front: 0.6 },
  hotel: { w: [2.8, 3.6], floors: [5, 8], front: 0.7 },
  terrace: { w: [2.4, 3.0], floors: [1, 1], front: 1.1 },
  warehouse: { w: [5, 7.5], floors: [1, 1], front: 0.9 },
  house: { w: [3.6, 4.6], floors: [0, 1], front: 1.8 },
  factory: { w: [14, 30], floors: [2, 2], front: 2.5 },
  school: { w: [14, 30], floors: [1, 2], front: 2 },
  mall: { w: [14, 30], floors: [2, 2], front: 7 },
  stand: { w: [14, 30], floors: [0, 0], front: 1 },
  crane: { w: [14, 30], floors: [3, 4], front: 1.5 },
};

/** A building a recipe laid: downtown's `Infill` with any kit as its type */
export interface Lot extends Omit<Infill, 'type'> {
  type: KitId;
}

/** A row kit's or a house's roof height over its slab, from its floors */
export function heightOf(type: KitId, floors: number) {
  const r = (h: number) => Math.round(h * 100) / 100;
  if (type === 'diner') return r(SHOP_H + PARAPET + 0.3);
  if (type === 'terrace' || type === 'house') return r(SHOP_H + floors * FLOOR + 0.05);
  if (type === 'warehouse') return r(SHOP_H + 1.5 + PARAPET);
  if (type === 'factory') return r(SHOP_H + floors * FLOOR + 0.6);
  if (type === 'school' || type === 'mall') return r(SHOP_H + floors * 1.2 + PARAPET);
  if (type === 'stand') return 4.2;
  if (type === 'crane') return r(SHOP_H + floors * FLOOR);
  return r(SHOP_H + floors * FLOOR + PARAPET);
}

/** How high a pitched roof's ridge rises over its eaves (terraces and houses) */
export const RIDGE = 1.1;

/* ---------- The big kits' layouts, in the lot's own frame (u along the front, v back from it) ---------- */

/** Where a big kit's parts stand in its lot: the building's own box and whatever else is solid, as (u0, v0, u1, v1, h) */
export function bigParts(type: BigKit, w: number, d: number): { body: [number, number, number, number]; extra: [number, number, number, number, number][] } {
  if (type === 'factory') {
    // Two sheds side by side, a yard between, the chimney behind the left one
    const bw = Math.min(w - 4, 18);
    return { body: [1, 2.5, 1 + bw, Math.min(d - 1, 13)], extra: [[1 + bw * 0.15 - 0.7, Math.min(d - 1, 13) - 1.6, 1 + bw * 0.15 + 0.7, Math.min(d - 1, 13) - 0.2, 8.2]] };
  }
  if (type === 'school') {
    const bw = Math.min(w - 2, 20);
    return { body: [(w - bw) / 2, 2, (w + bw) / 2, Math.min(d * 0.45, 8)], extra: [] };
  }
  if (type === 'mall') {
    const bw = Math.min(w - 2, 22);
    return { body: [(w - bw) / 2, 7, (w + bw) / 2, Math.min(d - 1, 7 + 13)], extra: [] };
  }
  if (type === 'stand') {
    // The stand along the back of the pitch (solid), floodlight masts at its ends
    const sd = 4.5;
    return {
      body: [1.5, d - sd - 0.5, w - 1.5, d - 0.5],
      extra: [
        [0.4, d - 1.2, 0.9, d - 0.7, 8],
        [w - 0.9, d - 1.2, w - 0.4, d - 0.7, 8],
      ],
    };
  }
  // The crane: a frame going up in the middle, the crane's base beside it
  const bw = Math.min(w - 6, 14);
  const bd = Math.min(d - 5, 10);
  const u0 = 2;
  return { body: [u0, 2, u0 + bw, 2 + bd], extra: [[u0 + bw + 1.2, 2 + bd / 2 - 0.9, u0 + bw + 3, 2 + bd / 2 + 0.9, KIT_TALLEST - 0.5]] };
}

/** A lot's own frame: the street-front corner on the left seen from the street, u along the front, v back into the lot */
export function lotFrame(lot: Pick<Lot, 'box' | 'face'>) {
  const [x0, z0, x1, z1] = lot.box;
  const f = lot.face;
  const along = f === 'n' || f === 's';
  const w = along ? x1 - x0 : z1 - z0;
  const d = along ? z1 - z0 : x1 - x0;
  /** World x, z of (u, v) */
  const at = (u: number, v: number): [number, number] =>
    f === 's' ? [x0 + u, z1 - v] : f === 'n' ? [x1 - u, z0 + v] : f === 'w' ? [x0 + v, z0 + u] : [x1 - v, z1 - u];
  /** A rectangle in the frame as a world rectangle */
  const rect = (u0: number, v0: number, u1: number, v1: number): Rect => {
    const [ax, az] = at(u0, v0);
    const [bx, bz] = at(u1, v1);
    return [Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)];
  };
  return { w, d, at, rect };
}

/** What's solid about a lot: its building (and a stoop), or a big kit's parts */
export function lotSolids(lot: Lot): Footprint[] {
  if ((BIG_KITS as KitId[]).includes(lot.type)) {
    const F = lotFrame(lot);
    const { body, extra } = bigParts(lot.type as BigKit, F.w, F.d);
    const h = lot.type === 'stand' ? 4.2 : lot.h;
    return [[...F.rect(...body), h], ...extra.map(([u0, v0, u1, v1, eh]): Footprint => [...F.rect(u0, v0, u1, v1), eh])];
  }
  const roof = lot.type === 'terrace' || lot.type === 'house' ? RIDGE : 0;
  const out: Footprint[] = [[...bodyOf(lot as unknown as Infill), Math.round((lot.h + roof) * 100) / 100]];
  if (lot.type === 'brownstone') out.push([...stoopOf(lot as unknown as Infill), 0.45]);
  return out;
}

/** The face looking the other way */
export const opposite = (f: Face): Face => (f === 'n' ? 's' : f === 's' ? 'n' : f === 'e' ? 'w' : 'e');
