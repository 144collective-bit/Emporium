/**
 * The Flats' estates (docs/crestmont-plan.md Phase 5, the owner's call: Beverly Hills). DOM-free: what's solid
 * (solids.ts), the planting that keeps off and the garden palms (landscape.ts) and the drawing (estates3d.ts) read it.
 *
 * - **The lots** (`ESTATES`): the Flats' blocks the Drive and the later landmarks don't take (`ESTATE_BLOCKS`; the
 *   grand hotel's block off the boulevard and the metro station's are kept, `KEPT`), cut back to back across the block
 *   so each faces a north-south street (the last column, out to the Flats' edge, one deep lot facing west), and along
 *   it into lots about `LOT_W` wide.
 * - **Each estate** in its own frame (u along its front, v out to the street, its front the lot's street edge): a hedge
 *   round it (`HEDGE`; the front one set in behind the street's palms, a gate in it with stone piers and lamps,
 *   `GATE`), the drive in to a paved forecourt with a fountain (`FOUNTAIN`) and sometimes a car (`ESTATE_CARS`), the
 *   house (`House`: its main block, a wing on some, a villa's tower) in its style (`EstateStyle`: Spanish Colonial,
 *   a Mediterranean villa, Tudor, Georgian, white modern), the garden behind with its pool (`pool`), two date palms
 *   either side of the forecourt (landscape.ts `PALMS`), a garage in the wing with its apron off the forecourt
 *   (`motorCourt()`; the palms and the gardeners keep off it). Its garden is crestgardens.ts's.
 * - `ESTATE_SOLIDS` (in `SOLIDS`): the houses, hedges, piers, fountains, pools and cars.
 *
 * Every top under the Emporium (`TALLEST`). No real homes or people. Fixed world numbers north of the river.
 */
import { CREST_BLOCKS, FLATS_EAST, type Rect } from './crestmont';
import { DRIVE_BLOCKS } from './coral';
import { rng } from './recipes';

type Pt = [number, number];
type Box = [number, number, number, number, number];

/** Kept for later phases: the grand hotel's block off the boulevard (Phase 7) and the metro station's (Phase 9) */
export const KEPT = ['crest-2-0', 'crest-0-0'] as const;
/** The blocks the estates stand on */
export const ESTATE_BLOCKS = CREST_BLOCKS.map((b) => b.id).filter((id) => !(DRIVE_BLOCKS as readonly string[]).includes(id) && !(KEPT as readonly string[]).includes(id));

/** A lot's width along its street, about */
export const LOT_W = 16.5;
/** The hedges: the front one's street face this far in from the lot's edge (behind the street's palms), its thickness, a side's, the height */
export const HEDGE = { front: 1, thick: 0.45, side: 0.24, outer: 1, h: 1.05 } as const;
/** The gate: half the gap, the piers' half side and height */
export const GATE = { half: 1.3, pier: 0.25, h: 1.7 } as const;
/** The forecourt's half width; the fountain's radius and height */
export const COURT_HALF = 4;
export const FOUNTAIN = { r: 0.6, h: 1.1 } as const;
/** Storeys: the ground floor, each one over it */
export const STOREY = { ground: 2, upper: 1.75 } as const;
/** The tallest anything on an estate stands over the slab (the Emporium's roof is 12.5) */
export const TALLEST = 8.5;
export const SLAB_Y = 0.15;

export type EstateStyle = 'spanish' | 'villa' | 'tudor' | 'georgian' | 'modern';
export const STYLES: EstateStyle[] = ['spanish', 'villa', 'tudor', 'georgian', 'modern'];
export type Face = 'e' | 'w';

/** A box of the house in the estate's frame: u0..u1 along the front, v0 (front) down to v1 (back, more negative), its storeys */
export interface Part {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  floors: number;
}
export interface House {
  main: Part;
  wing?: Part;
  /** A villa's tower at a corner of its main block */
  tower?: Part;
}
export interface Estate {
  id: string;
  block: string;
  /** The lot (x0, z0, x1, z1) */
  rect: Rect;
  face: Face;
  /** Along its front (W) and back from it (D) */
  W: number;
  D: number;
  style: EstateStyle;
  house: House;
  /** The middle of the house's main block along the front: the gate, the drive and the forecourt line up on it */
  hc: number;
  /** The forecourt: from the front hedge's back to the house's front (v) */
  court: [number, number];
  /** The pool in the garden behind: u0, v0, u1, v1 */
  pool: [number, number, number, number];
  /** Which of its sides are on the block's edge (a hedge set in) rather than another lot's (a hedge on the line): u-, u+, back */
  outer: [boolean, boolean, boolean];
  /** A car on the forecourt */
  car: boolean;
}

/** A roof's height over its walls, by style (modern: flat, its parapet) */
export const ROOF_H: Record<EstateStyle, number> = { spanish: 1.2, villa: 1.15, tudor: 2.2, georgian: 1.4, modern: 0.3 };
/** A part's walls' top over the slab */
export const wallTop = (p: Part) => STOREY.ground + (p.floors - 1) * STOREY.upper;
/** A part's top, roof and all */
export const partTop = (s: EstateStyle, p: Part) => wallTop(p) + ROOF_H[s] + (s === 'tudor' || s === 'georgian' ? 0.6 : 0);

function lots(): Estate[] {
  const r = rng(5505);
  const out: Estate[] = [];
  let last: EstateStyle | null = null;
  for (const id of ESTATE_BLOCKS) {
    const [x0, z0, x1, z1] = CREST_BLOCKS.find((b) => b.id === id)!.rect;
    // (the last column runs out to the Flats' edge: no street behind it, one deep lot)
    const halves: [number, number, Face][] = x1 >= FLATS_EAST - 1.5 ? [[x0, x1, 'w']] : [[x0, (x0 + x1) / 2, 'w'], [(x0 + x1) / 2, x1, 'e']];
    const n = Math.max(1, Math.round((z1 - z0) / LOT_W));
    for (const [a, b, face] of halves)
      for (let k = 0; k < n; k++) {
        const [za, zb] = [z0 + ((z1 - z0) * k) / n, z0 + ((z1 - z0) * (k + 1)) / n];
        const W = zb - za;
        const D = b - a;
        let style = STYLES[Math.floor(r() * STYLES.length)];
        if (style === last) style = STYLES[(STYLES.indexOf(style) + 1) % STYLES.length];
        last = style;
        // Back from the street: the forecourt, the house, the garden
        const front = Math.min(7.5, Math.max(4.75, D * 0.3));
        const hd = Math.min(7, Math.max(4, D - front - 3.4));
        const side = 1.7;
        const room = W - 2 * side;
        const wing = r() < 0.7 && room > 9.5;
        const ww = wing ? 2.6 + r() * 0.9 : 0;
        const mw = Math.min(room - ww, 6.2 + r() * 2.6);
        const total = mw + ww;
        // (the wing to one side, the whole centred)
        const left = r() < 0.5;
        const start = -total / 2;
        const main: Part = left && wing ? { u0: start + ww, u1: start + total, v0: -front, v1: -front - hd, floors: 2 } : { u0: start, u1: start + mw, v0: -front, v1: -front - hd, floors: 2 };
        const house: House = { main };
        if (wing) house.wing = left ? { u0: start, u1: start + ww - 0.02, v0: -front - 0.6, v1: -front - hd + 0.4, floors: style === 'modern' ? 2 : 1 } : { u0: start + mw + 0.02, u1: start + total, v0: -front - 0.6, v1: -front - hd + 0.4, floors: style === 'modern' ? 2 : 1 };
        if (style === 'villa') {
          // (the tower at the main block's front corner away from the wing)
          const t = 2.3;
          const u = left ? main.u1 - t : main.u0;
          house.tower = { u0: u, u1: u + t, v0: -front + 0.3, v1: -front - t + 0.3, floors: 3 };
        }
        const hc = (main.u0 + main.u1) / 2;
        const g0 = -front - hd;
        const gd = D + g0 - 0.6;
        const pd = Math.min(2.2, Math.max(1.2, gd - 1.6));
        const pl = Math.min(5.4, mw - 0.6);
        // (a deep lot's near the house, its garden past it: crestgardens.ts)
        const pv0 = g0 - (gd > 6 ? 1 : Math.max(0.8, (gd - pd) / 2));
        out.push({
          id: `estate-${out.length}`,
          block: id,
          rect: [a, za, b, zb],
          face,
          W,
          D,
          style,
          house,
          hc,
          court: [-HEDGE.front - HEDGE.thick, -front],
          pool: [hc - pl / 2, pv0, hc + pl / 2, pv0 - pd],
          // (u runs north to south facing west, south to north facing east)
          outer: face === 'w' ? [za === z0, zb === z1, false] : [zb === z1, za === z0, false],
          car: r() < 0.6,
        });
      }
  }
  // (the last column's backs are on the Flats' edge: hedged in)
  for (const e of out) if (e.face === 'w' && e.rect[2] >= FLATS_EAST - 1.5) e.outer[2] = true;
  return out;
}
export const ESTATES: Estate[] = lots();

/* ---------- The estate's frame ---------- */

/** Out from its front (unit) and along it (u, a turn from out, never a mirror: crestmont's frame, coral.ts's) */
export const outOf = (e: Estate): Pt => (e.face === 'e' ? [1, 0] : [-1, 0]);
/** Its front's middle (u 0, v 0) */
export const originOf = (e: Estate): Pt => [e.face === 'e' ? e.rect[2] : e.rect[0], (e.rect[1] + e.rect[3]) / 2];
/** A point in its frame, in the world */
export function toWorld(e: Estate, u: number, v: number): Pt {
  const [ox, oz] = outOf(e);
  const [cx, cz] = originOf(e);
  // (u along (oz, -ox), v along out)
  return [cx + oz * u + ox * v, cz - ox * u + oz * v];
}
/** A box in its frame (u0..u1, v0..v1, any order), in the world */
export function rectToWorld(e: Estate, u0: number, v0: number, u1: number, v1: number): Rect {
  const [a, b] = [toWorld(e, u0, v0), toWorld(e, u1, v1)];
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
}

/** Its hedges in its frame (u0, v0, u1, v1): the front either side of the gate, its sides and back */
export function hedgesOf(e: Estate): [number, number, number, number][] {
  const { W, D, hc } = e;
  const [f0, f1] = [-HEDGE.front, -HEDGE.front - HEDGE.thick];
  const inset = (outer: boolean) => (outer ? HEDGE.outer : 0);
  const [lo, hi] = [-W / 2 + inset(e.outer[0]), W / 2 - inset(e.outer[1])];
  const back = -D + inset(e.outer[2]);
  const out: [number, number, number, number][] = [
    [lo, f0, hc - GATE.half, f1],
    [hc + GATE.half, f0, hi, f1],
    [lo, f1, lo + HEDGE.side, back + HEDGE.side],
    [hi - HEDGE.side, f1, hi, back + HEDGE.side],
    [lo, back + HEDGE.side, hi, back],
  ];
  return out;
}
/** The gate's piers' middles in its frame */
export const piersOf = (e: Estate): Pt[] => [-1, 1].map((s): Pt => [e.hc + s * (GATE.half + GATE.pier), -HEDGE.front - HEDGE.thick / 2]);
/** The fountain's middle in its frame */
export const fountainOf = (e: Estate): Pt => [e.hc, (e.court[0] + e.court[1]) / 2];
/** Which side of the main block its wing is (along u), or 0 */
export const wingSide = (e: Estate) => (e.house.wing ? Math.sign(e.house.wing.u0 + e.house.wing.u1 - 2 * e.hc) : 0);
/** The apron before the wing's garage, off the forecourt (`APRON` deep from the wing's front)  */
export const APRON = 1.9;
/** The apron before the wing's garage (u0, v0, u1, v1: the forecourt carried across to the wing's far side, `APRON` out from its front), or null */
export function motorCourt(e: Estate): [number, number, number, number] | null {
  const w = e.house.wing;
  if (!w) return null;
  const s = wingSide(e);
  return s > 0 ? [e.hc + COURT_HALF, w.v0, w.u1, w.v0 + APRON] : [w.u0, w.v0, e.hc - COURT_HALF, w.v0 + APRON];
}
/** Inside a frame rect (u0, v0, u1, v1), padded `m` */
export const inFrame = (r: readonly number[] | null, u: number, v: number, m = 0) => !!r && u > r[0] - m && u < r[2] + m && v > r[1] - m && v < r[3] + m;
/** The forecourt's date palms in its frame: either side of it where there's room, clear of the house and the motor court */
export const gardenPalmsOf = (e: Estate): Pt[] =>
  [-1, 1]
    .map((s): Pt => [Math.max(-e.W / 2 + 1.3, Math.min(e.W / 2 - 1.3, e.hc + s * (COURT_HALF + 1.1))), -HEDGE.front - HEDGE.thick - 1.6])
    // (where there's room beside the forecourt, not in front of the garage)
    .filter(([u, v]) => Math.abs(u - e.hc) > COURT_HALF + 0.6 && !inFrame(motorCourt(e), u, v, 0.5));

/* ---------- The cars on the forecourts ---------- */

/** A parked car's half length and width */
const CAR_HALF = { l: 1.5, w: 0.6 };
/** [model, x, z, yaw, paint]: beside the fountain, facing the street */
export const ESTATE_CARS: [string, number, number, number, string][] = (() => {
  const r = rng(9191);
  const models = ['super', 'exec', 'suv', 'coupe', 'sedan', 'super'];
  const paints = ['#f3f2f7', '#14121f', '#d9a94a', '#7a1f2e', '#1c3a5c', '#c9b48a', '#2b2d3a'];
  return ESTATES.filter((e) => e.car).map((e) => {
    const [, fv] = fountainOf(e);
    const [x, z] = toWorld(e, e.hc + 2.6, fv);
    const [ox] = outOf(e);
    return [models[Math.floor(r() * models.length)], x, z, ox > 0 ? 0 : Math.PI, paints[Math.floor(r() * paints.length)]];
  });
})();

/* ---------- What's solid, and where the street's planting keeps off ---------- */

export const ESTATE_SOLIDS: Box[] = ESTATES.flatMap((e): Box[] => {
  const box = (u0: number, v0: number, u1: number, v1: number, top: number): Box => [...rectToWorld(e, u0, v0, u1, v1), SLAB_Y + top];
  const { house } = e;
  const parts = [house.main, house.wing, house.tower].filter((p): p is Part => !!p);
  const [fu, fv] = fountainOf(e);
  const [pu0, pv0, pu1, pv1] = e.pool;
  return [
    ...parts.map((p) => box(p.u0, p.v0, p.u1, p.v1, partTop(e.style, p))),
    ...hedgesOf(e).map(([u0, v0, u1, v1]) => box(u0, v0, u1, v1, HEDGE.h)),
    ...piersOf(e).map(([u, v]) => box(u - GATE.pier, v - GATE.pier, u + GATE.pier, v + GATE.pier, GATE.h)),
    box(fu - FOUNTAIN.r, fv - FOUNTAIN.r, fu + FOUNTAIN.r, fv + FOUNTAIN.r, FOUNTAIN.h),
    box(pu0, pv0, pu1, pv1, 0.3),
  ];
}).concat(ESTATE_CARS.map(([, x, z, yaw]): Box => {
  const along = Math.abs(Math.cos(yaw)) > 0.5;
  const [hx, hz] = along ? [CAR_HALF.l, CAR_HALF.w] : [CAR_HALF.w, CAR_HALF.l];
  return [x - hx, z - hz, x + hx, z + hz, 1.2];
}));
/** In an estate's gateway (the drive from its lot edge through the gate, padded `m`): the street's palms keep off */
export function inGateway(x: number, z: number, m = 0) {
  return ESTATES.some((e) => {
    const [a, b, c, d] = rectToWorld(e, e.hc - GATE.half - GATE.pier * 2, 0, e.hc + GATE.half + GATE.pier * 2, e.court[0]);
    return x > a - m && x < c + m && z > b - m && z < d + m;
  });
}
