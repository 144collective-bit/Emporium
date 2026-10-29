/**
 * Crestmont's gardens (docs/crestmont-plan.md, the polish pass, the owner's call: "an assortment of luxury garden
 * features suitable for the upper class"). DOM-free, in Crestmont's chunk only (the boot never loads it): drawn by
 * crestgardens3d.ts, its solids joining the grids when the chunk comes in (`GARDEN_SOLIDS`, solids.ts `addSolids()`),
 * tested in tests/crestgardens.test.ts.
 *
 * Each estate's and each mansion's garden is a list of features (`Feat`) in its own frame (estates.ts's and
 * mansions.ts's: u along its front, v out to the street), laid by a planner on a half-tile grid (`Planner`) so nothing
 * stands on anything else, on the paving, in a hedge or on the people who stand about there (crestlife.ts):
 *
 * - **Round the pool:** a spa spilling into its corner, umbrellas over the loungers, lamps at the deck's corners.
 * - **The pool house** in the wider of the lawns beside the pool, against the back hedge, facing the water, and an
 *   outdoor kitchen beside it where there's room.
 * - **Each style's own** in the other lawn: a Spanish house's pergola hung with bougainvillea over a dining table, a
 *   villa's with vines and cypresses, a Tudor's rose border with a bird bath and a bench, a Georgian's statue between
 *   clipped cones, a modern's sunken fire pit and its seats (or grasses and boulders where there's less room).
 * - **The deep lots' formal gardens** past the pool: a gazebo (a Spanish house's tiled fountain, a modern's
 *   reflecting pool and sculpture) on the pool's line, parterres either side (a Spanish house's citrus grove, a
 *   modern's grasses, boulders and olives), a gravel walk to it and benches.
 * - **The front:** flower borders inside the front hedge, a pair at the door (urns with clipped balls, a villa's
 *   cypresses, a Spanish house's lemons, a modern's planters of grass, a Georgian's cones), lamps by the gate,
 *   stepping stones down the side yard, shrubs along the wing.
 * - **The mansions:** the same kit on their pads, by kind: olive trees, a pergola, a fire pit, a pool house on a
 *   compound and the summit, cypresses and statues at the summit, the borders inside a compound's walls; the villas'
 *   terraces are planted as vineyards (`TERRACE_VINES`).
 * - **The lawns** (`lawnOf()`): what's left of each garden's grass, mown in stripes.
 *
 * Nothing taller than the house it's beside. Made-up and generic only.
 */
import { ESTATES, ESTATE_CARS, COURT_HALF, FOUNTAIN, GATE, HEDGE, SLAB_Y, fountainOf, gardenPalmsOf, motorCourt, wingSide, type Estate, type EstateStyle, type Part } from './estates';
import { MANSIONS, MANSION_CARS, WALL, type MPart, type Mansion, type MansionKind } from './mansions';
import { GARDENERS } from './crestlife';
import { CIVIC, CLUB, HOTEL } from './crestsites';

type Pt = [number, number];
/** A box in a frame: u0..u1 along the front, v0..v1 (v0 the further back, more negative) */
export type FR = [number, number, number, number];
type Box = [number, number, number, number, number];

export type FeatKind =
  | 'spa'
  | 'umbrella'
  | 'lamp'
  | 'poolhouse'
  | 'kitchen'
  | 'pergola'
  | 'firepit'
  | 'border'
  | 'roses'
  | 'shrubs'
  | 'birdbath'
  | 'bench'
  | 'statue'
  | 'cone'
  | 'urn'
  | 'lemon'
  | 'planter'
  | 'cypress'
  | 'olive'
  | 'citrus'
  | 'grass'
  | 'boulder'
  | 'gazebo'
  | 'fountain'
  | 'reflect'
  | 'parterre'
  | 'gravel'
  | 'stones'
  | 'hedge'
  | 'flag'
  | 'putting';
export interface Feat {
  kind: FeatKind;
  /** Where it stands in its frame */
  r: FR;
  /** Which way it faces (a unit u, v), where that matters: a pool house's open front, a bench's seat */
  n?: Pt;
  /** Its style's colours (an estate's style, or a mansion's kind) */
  tone?: EstateStyle | MansionKind;
}

/** How tall each is (what's solid stands to this over its ground; the rest is drawn as tall or flat) */
export const HEIGHT: Record<FeatKind, number> = {
  spa: 0.5,
  umbrella: 2.3,
  lamp: 0.75,
  poolhouse: 2.7,
  kitchen: 0.95,
  pergola: 2.35,
  firepit: 0.4,
  border: 0.35,
  roses: 0.55,
  shrubs: 0.6,
  birdbath: 0.95,
  bench: 0.85,
  statue: 2.2,
  cone: 1.4,
  urn: 1.15,
  lemon: 1.25,
  planter: 1.0,
  cypress: 4.2,
  olive: 2.6,
  citrus: 1.9,
  grass: 0.7,
  boulder: 0.55,
  gazebo: 3.3,
  fountain: 1.4,
  reflect: 0.22,
  parterre: 0.45,
  gravel: 0,
  stones: 0,
  hedge: 0.55,
  flag: 4.8,
  putting: 0,
};
/** The planner's cell */
export const CELL = 0.5;
/** The spa's radius */
export const SPA_R = 0.45;
/** A pergola's posts' half side; a gazebo's columns */
export const POST = 0.08;

/** Plants and the flat things aren't solid (the city's trees aren't); these are, to their height (posts only for some) */
const SOLID: Partial<Record<FeatKind, true>> = { hedge: true, spa: true, poolhouse: true, kitchen: true, firepit: true, statue: true, urn: true, cone: true, lemon: true, planter: true, birdbath: true, boulder: true, fountain: true, reflect: true, parterre: true, gazebo: true, pergola: true };

/* ---------- The planner: a half-tile grid over a garden, what's taken ---------- */

export class Planner {
  readonly nu: number;
  readonly nv: number;
  private readonly taken: Uint8Array;
  constructor(
    readonly box: FR,
    taken: FR[]
  ) {
    this.nu = Math.max(1, Math.ceil((box[2] - box[0]) / CELL));
    this.nv = Math.max(1, Math.ceil((box[3] - box[1]) / CELL));
    this.taken = new Uint8Array(this.nu * this.nv);
    // (the cells the box doesn't wholly hold are taken)
    for (let i = 0; i < this.nu; i++) for (let j = 0; j < this.nv; j++) if (box[0] + (i + 1) * CELL > box[2] + 1e-9 || box[1] + (j + 1) * CELL > box[3] + 1e-9) this.taken[i * this.nv + j] = 1;
    for (const r of taken) this.take(r);
  }
  /** The cells a box touches */
  private span(r: FR) {
    const [b0, b1] = [this.box[0], this.box[1]];
    return [Math.max(0, Math.floor((r[0] - b0) / CELL + 1e-9)), Math.max(0, Math.floor((r[1] - b1) / CELL + 1e-9)), Math.min(this.nu - 1, Math.ceil((r[2] - b0) / CELL - 1e-9) - 1), Math.min(this.nv - 1, Math.ceil((r[3] - b1) / CELL - 1e-9) - 1)];
  }
  take(r: FR) {
    const [i0, j0, i1, j1] = this.span(r);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) this.taken[i * this.nv + j] = 1;
  }
  /** Is a box inside the garden, on nothing taken? */
  free(r: FR) {
    if (r[0] < this.box[0] - 1e-9 || r[1] < this.box[1] - 1e-9 || r[2] > this.box[2] + 1e-9 || r[3] > this.box[3] + 1e-9 || r[0] >= r[2] || r[1] >= r[3]) return false;
    const [i0, j0, i1, j1] = this.span(r);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) if (this.taken[i * this.nv + j]) return false;
    return true;
  }
  /** The grass left: runs of free cells along u, a row of cells at a time (v from the front back) */
  lawn(): { r: FR; row: number }[] {
    const out: { r: FR; row: number }[] = [];
    for (let j = this.nv - 1; j >= 0; j--) {
      let start = -1;
      for (let i = 0; i <= this.nu; i++) {
        const open = i < this.nu && !this.taken[i * this.nv + j];
        if (open && start < 0) start = i;
        if (!open && start >= 0) {
          if (i - start >= 2) out.push({ r: [this.box[0] + start * CELL, this.box[1] + j * CELL, this.box[0] + i * CELL, this.box[1] + (j + 1) * CELL], row: j });
          start = -1;
        }
      }
    }
    return out;
  }
}

/** A box of half sides (hu, hv) round a point */
const at = (u: number, v: number, hu: number, hv = hu): FR => [u - hu, v - hv, u + hu, v + hv];
const norm = (u0: number, v0: number, u1: number, v1: number): FR => [Math.min(u0, u1), Math.min(v0, v1), Math.max(u0, u1), Math.max(v0, v1)];

/** Padded */
const pad = (r: FR, m: number): FR => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];

/** A frame's way back from the world: estates.ts's and mansions.ts's frames (u along (oz, -ox), v along out) */
function fromWorld(out: Pt, origin: Pt, x: number, z: number): Pt {
  const [ox, oz] = out;
  const [dx, dz] = [x - origin[0], z - origin[1]];
  return [dx * oz - dz * ox, dx * ox + dz * oz];
}
const estateOut = (e: Estate): Pt => (e.face === 'e' ? [1, 0] : [-1, 0]);
const estateOrigin = (e: Estate): Pt => [e.face === 'e' ? e.rect[2] : e.rect[0], (e.rect[1] + e.rect[3]) / 2];
const mansionOut = (m: Mansion): Pt => (m.face === 'e' ? [1, 0] : m.face === 'w' ? [-1, 0] : m.face === 's' ? [0, 1] : [0, -1]);
function mansionOrigin(m: Mansion): Pt {
  const [x0, z0, x1, z1] = m.rect;
  return m.face === 'e' ? [x1, (z0 + z1) / 2] : m.face === 'w' ? [x0, (z0 + z1) / 2] : m.face === 's' ? [(x0 + x1) / 2, z1] : [(x0 + x1) / 2, z0];
}
/** A parked car's footprint in a frame (world x, z, yaw) */
function carIn(out: Pt, origin: Pt, x: number, z: number, yaw: number): FR {
  const [u, v] = fromWorld(out, origin, x, z);
  // (its length along its yaw, which the frame turns: along u or v)
  const [ox, oz] = out;
  const [fx, fz] = [Math.cos(yaw), -Math.sin(yaw)];
  const alongU = Math.abs(fx * oz - fz * ox) > 0.5;
  return alongU ? at(u, v, 1.6, 0.7) : at(u, v, 0.7, 1.6);
}

/* ---------- The estates ---------- */

/**
 * What a house carries past its walls, in its frame (drawn by estates3d.ts, solid with the gardens): a Tudor's gabled
 * bay out from its front at the end away from the door, a Spanish house's or a villa's arcaded loggia along its back
 */
export interface Extras {
  bay?: FR;
  loggia?: FR;
}
/** A bay's depth out from the front, a loggia's back from the back */
export const BAY_OUT = 0.5;
export const LOGGIA = 0.72;
export function extrasOf(e: Estate): Extras {
  const m = e.house.main;
  const mw = m.u1 - m.u0;
  const out: Extras = {};
  if (e.style === 'tudor') {
    const bw = Math.min(2.2, mw / 2 - 1.7);
    // (at the end away from the wing, or the -u end)
    const s = wingSide(e) < 0 ? 1 : -1;
    if (bw >= 1.2) out.bay = s < 0 ? [m.u0 + 0.25, m.v0, m.u0 + 0.25 + bw, m.v0 + BAY_OUT] : [m.u1 - 0.25 - bw, m.v0, m.u1 - 0.25, m.v0 + BAY_OUT];
  }
  if (e.style === 'spanish' || e.style === 'villa') out.loggia = [m.u0 + 0.35, m.v1 - LOGGIA, m.u1 - 0.35, m.v1];
  return out;
}
/** A loggia's piers along its open side (u), their half side */
export const PIER = 0.13;
export const loggiaPiers = (r: FR): number[] => {
  const n = Math.max(2, Math.round((r[2] - r[0]) / 1.5) + 1);
  return Array.from({ length: n }, (_, k) => r[0] + PIER + ((r[2] - r[0] - 2 * PIER) * k) / (n - 1));
};

export interface Garden {
  feats: Feat[];
  lawn: { r: FR; row: number }[];
}

const partsOf = (e: Estate) => [e.house.main, e.house.wing, e.house.tower].filter((p): p is Part => !!p);
/** An estate's pool deck (u0, v0, u1, v1), estates3d.ts's paving */
export const deckOf = (e: Estate): FR => {
  const [pu0, pv0, pu1, pv1] = e.pool;
  return [pu0 - 1.2, pv1 - 0.7, pu1 + 1.2, pv0 + 0.7];
};
/** The loungers by an estate's pool (estates3d.ts; crestlife.ts's sunbathers lie on the first) */
export const loungersOf = (e: Estate): FR[] => {
  const [pu0, pv0, pu1] = e.pool;
  return [-1, 1].map((s) => {
    const u = s < 0 ? pu0 - 0.75 : pu1 + 0.75;
    return [u - 0.25, pv0 - 1.2, u + 0.25, pv0 - 0.1];
  });
};

function estateGarden(e: Estate): Garden {
  const { W, D, hc, style } = e;
  const inset = (o: boolean) => (o ? HEDGE.outer : 0);
  const [lo, hi] = [-W / 2 + inset(e.outer[0]), W / 2 - inset(e.outer[1])];
  const back = -D + inset(e.outer[2]);
  const f1 = -HEDGE.front - HEDGE.thick;
  const box: FR = [lo + HEDGE.side + 0.1, back + HEDGE.side + 0.1, hi - HEDGE.side - 0.1, f1];
  const parts = partsOf(e);
  const deck = deckOf(e);
  const [pu0, , pu1, pv1] = e.pool;
  const motor = motorCourt(e);
  const [fu, fv] = fountainOf(e);
  const out = estateOut(e);
  const origin = estateOrigin(e);
  const taken: FR[] = [
    ...parts.map((p) => norm(p.u0 - 0.15, p.v1 - 0.15, p.u1 + 0.15, p.v0 + 0.15)),
    deck,
    norm(hc - COURT_HALF, e.court[1] - 0.05, hc + COURT_HALF, e.court[0]),
    norm(hc - GATE.half - GATE.pier * 2, e.court[0], hc + GATE.half + GATE.pier * 2, 0),
    at(fu, fv, FOUNTAIN.r + 0.1),
    ...gardenPalmsOf(e).map(([u, v]) => at(u, v, 0.6)),
    ...ESTATE_CARS.filter(([, x, z]) => x > e.rect[0] && x < e.rect[2] && z > e.rect[1] && z < e.rect[3]).map(([, x, z, yaw]) => carIn(out, origin, x, z, yaw)),
    ...GARDENERS.filter((g) => g.x > e.rect[0] && g.x < e.rect[2] && g.z > e.rect[1] && g.z < e.rect[3]).flatMap((g) => [at(...fromWorld(out, origin, g.x, g.z), 0.45), at(...fromWorld(out, origin, ...g.barrow), 0.6)]),
  ];
  if (motor) taken.push(norm(motor[0], motor[1] - 0.05, motor[2], motor[3]));
  const extras = extrasOf(e);
  if (extras.bay) taken.push(pad(extras.bay, 0.1));
  if (extras.loggia) taken.push(extras.loggia);
  // (the Georgian portico and its steps, a Tudor's porch: estates3d.ts)
  if (style === 'georgian') taken.push(norm(hc - 1.75, e.house.main.v0, hc + 1.75, e.house.main.v0 + 0.8));
  const P = new Planner(box, taken);
  const feats: Feat[] = [];
  const put = (kind: FeatKind, r: FR, n?: Pt, block = true) => {
    if (block && !P.free(r)) return false;
    feats.push({ kind, r, n, tone: style });
    if (block) P.take(r);
    return true;
  };

  /* Round the pool (on the deck, so not through the planner but for the lamps) */
  feats.push({ kind: 'spa', r: at(pu1 - 0.6, pv1 - 0.2, SPA_R), tone: style });
  for (const l of loungersOf(e)) feats.push({ kind: 'umbrella', r: at((l[0] + l[2]) / 2, l[1] - 0.4, 0.06), tone: style });
  for (const [u, v] of [
    [deck[0] + 0.2, deck[1] + 0.2],
    [deck[2] - 0.2, deck[1] + 0.2],
  ] as Pt[])
    feats.push({ kind: 'lamp', r: at(u, v, 0.08), tone: style });

  /* The lawns beside the pool: the pool house in the wider, the style's own in the other */
  const hb = Math.min(...parts.map((p) => p.v1)) - 0.15;
  const bands: FR[] = [
    [box[0], box[1], deck[0] - 0.05, hb],
    [deck[2] + 0.05, box[1], box[2], hb],
  ];
  const widths = bands.map((b) => b[2] - b[0]);
  const wide = widths[0] >= widths[1] ? 0 : 1;
  const depth = hb - box[1];
  const towards = (k: number): Pt => [k === 0 ? 1 : -1, 0];
  let housed = false;
  if (widths[wide] >= 2.7 && depth >= 2.1) {
    const b = bands[wide];
    const pw = Math.min(widths[wide] - 0.4, 3.2);
    const pd = Math.min(depth - 0.6, 2.2);
    // (against the back hedge, at the band's outer side so the kitchen can sit between it and the pool)
    const u0 = wide === 0 ? b[0] + 0.05 : b[2] - 0.05 - pw;
    housed = put('poolhouse', [u0, b[1] + 0.05, u0 + pw, b[1] + 0.05 + pd], towards(wide));
    if (housed) {
      // An outdoor kitchen between it and the deck, or in front of it
      const room = widths[wide] - pw - 0.25;
      const kv = b[1] + 0.25;
      const ku = wide === 0 ? u0 + pw + 0.2 : u0 - 0.2;
      if (room >= 0.95 && (style === 'modern' || style === 'spanish' || style === 'villa')) put('kitchen', wide === 0 ? [ku, kv, ku + 0.6, kv + 1.6] : [ku - 0.6, kv, ku, kv + 1.6], towards(wide));
      else if (room >= 0.9) put('lemon', at(wide === 0 ? ku + 0.35 : ku - 0.35, kv + 0.4, 0.3));
      // (a lamp by its door)
      const front = b[1] + 0.05 + pd;
      if (front + 0.3 < hb) put('lamp', at(wide === 0 ? u0 + pw - 0.3 : u0 + 0.3, front + 0.25, 0.08), undefined, false);
    }
  }
  const own = housed ? 1 - wide : wide;
  {
    const b = bands[own];
    const w = b[2] - b[0];
    const [cu, cv] = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
    const backStrip: FR = [b[0] + 0.05, b[1] + 0.02, b[2] - 0.05, b[1] + 0.5];
    if (style === 'spanish' || style === 'villa') {
      const pw = Math.min(w - 0.2, 2.8);
      const pd = Math.min(depth - 0.3, 2.5);
      if (pw >= 1.9 && pd >= 1.9) put('pergola', at(cu, b[1] + 0.1 + pd / 2, pw / 2, pd / 2), [0, 1]);
      else if (w >= 0.8) put('lemon', at(cu, cv, 0.3));
      if (style === 'villa') for (const u of [b[0] + 0.35, b[2] - 0.35]) put('cypress', at(u, b[1] + 0.35, 0.3));
    } else if (style === 'tudor') {
      if (w >= 1.2) put('roses', backStrip);
      if (w >= 1.4 && depth >= 1.9) put('birdbath', at(cu, cv + 0.25, 0.25));
      if (w >= 1.8) put('bench', at(cu, b[1] + 0.85, 0.75, 0.25), [0, 1]);
    } else if (style === 'georgian') {
      if (w >= 1.2) put('statue', at(cu, b[1] + 0.6, 0.35));
      if (w >= 2.4) for (const s of [-1, 1]) put('cone', at(cu + s * 0.95, b[1] + 0.55, 0.28));
      if (w >= 1.2) put('border', [b[0] + 0.05, cv + 0.35, b[2] - 0.05, cv + 0.75]);
    } else {
      if (w >= 2.3 && depth >= 2.3) put('firepit', at(cu, b[1] + 0.15 + Math.min(1.1, (depth - 0.3) / 2), 1.0, Math.min(1.0, (depth - 0.3) / 2)));
      else {
        if (w >= 1.2) put('grass', backStrip);
        if (w >= 1.0) put('boulder', at(cu, cv + 0.3, 0.3));
      }
    }
  }
  // An outdoor kitchen against the back hedge, where none stands yet and there's room (a modern, Spanish or villa house's)
  if ((style === 'modern' || style === 'spanish' || style === 'villa') && !feats.some((f) => f.kind === 'kitchen'))
    for (const b of bands) {
      const done = [b[0] + 0.05, b[2] - 1.65].some((u) => put('kitchen', [u, b[1] + 0.05, u + 1.6, b[1] + 0.65], [0, 1]));
      if (done) break;
    }
  // (and the pool house's lawn's own back where it wasn't: a border along the hedge)
  if (!housed && style !== 'tudor') put('border', [bands[1 - own][0] + 0.05, box[1] + 0.02, bands[1 - own][2] - 0.05, box[1] + 0.45]);

  /* A deep lot's formal garden past the pool */
  const formal: FR = [box[0], box[1], box[2], deck[1] - 0.15];
  if (formal[3] - formal[1] >= 2.4) {
    const fd = formal[3] - formal[1];
    const cv = formal[1] + fd / 2;
    const axis = (pu0 + pu1) / 2;
    if (style === 'modern') {
      put('reflect', at(axis, cv, 2, 0.5));
      put('statue', at(axis + 2.6, cv, 0.35));
      for (const s of [-1, 1]) put('olive', at(axis + s * 4.6, cv, 0.5));
      for (const s of [-1, 1]) put('grass', at(axis + s * 3.2, formal[1] + 0.35, 1.0, 0.25));
      put('boulder', at(axis - 2.6, cv + 0.35, 0.3));
    } else {
      const piece: FeatKind = style === 'spanish' ? 'fountain' : 'gazebo';
      const r = piece === 'gazebo' ? Math.min(1.25, fd / 2 - 0.3) : Math.min(0.95, fd / 2 - 0.3);
      if (put(piece, at(axis, cv, r))) put('gravel', [axis - 0.4, cv + r, axis + 0.4, formal[3]]);
      for (const s of [-1, 1]) put('bench', at(axis + s * (r + 0.55), formal[3] - 0.3, 0.65, 0.22), [0, -1]);
      // (either side: parterres, or a Spanish house's citrus grove)
      for (const s of [-1, 1]) {
        const [a, c] = s < 0 ? [formal[0] + 0.2, axis - r - 0.7] : [axis + r + 0.7, formal[2] - 0.2];
        if (c - a < 1.2) continue;
        if (style === 'spanish') for (let u = a + 0.5; u < c - 0.3; u += 1.5) for (let v = formal[1] + 0.6; v < formal[3] - 0.4; v += 1.5) put('citrus', at(u, v, 0.4));
        else {
          const n = Math.max(1, Math.floor((c - a) / 2.6));
          const pw = (c - a - (n - 1) * 0.5) / n;
          for (let k = 0; k < n; k++) put('parterre', [a + k * (pw + 0.5), formal[1] + 0.35, a + k * (pw + 0.5) + pw, formal[3] - 0.65]);
        }
      }
    }
  }

  /* The front: borders inside the hedge, the pair at the door, the lamps by the gate */
  for (const [a, c] of [
    [box[0], hc - COURT_HALF - 0.05],
    [hc + COURT_HALF + 0.05, box[2]],
  ] as Pt[])
    if (c - a >= 0.8) put(style === 'tudor' ? 'roses' : 'border', [a + 0.05, f1 - 0.42, c - 0.05, f1 - 0.02]);
  const dv = e.house.main.v0;
  const pair: FeatKind = style === 'villa' ? 'cypress' : style === 'spanish' ? 'lemon' : style === 'modern' ? 'planter' : style === 'georgian' ? 'cone' : 'urn';
  const du = style === 'georgian' ? 2.05 : 1.25;
  for (const s of [-1, 1]) {
    const r = at(hc + s * du, dv + 0.42, pair === 'planter' ? 0.28 : 0.3);
    // (on the forecourt's paving, which the planner holds: these check against the cars and the fountain only)
    if (!overlaps(r, taken.filter((t) => t[3] - t[1] < 3.6 && t[2] - t[0] < 3.6))) feats.push({ kind: pair, r, tone: style });
  }
  for (const s of [-1, 1]) feats.push({ kind: 'lamp', r: at(hc + s * (COURT_HALF - 0.25), f1 - 0.3, 0.08), tone: style });

  /* The side yards: stepping stones down the one away from the wing, shrubs along the wing */
  const ws = wingSide(e);
  const main = e.house.main;
  const side = ws > 0 ? -1 : 1;
  {
    const edge = side < 0 ? Math.min(...parts.map((p) => p.u0)) : Math.max(...parts.map((p) => p.u1));
    const [a, c] = side < 0 ? [box[0], edge - 0.2] : [edge + 0.2, box[2]];
    const mid = (a + c) / 2;
    if (c - a >= 0.6) put('stones', [mid - 0.25, hb + 0.2, mid + 0.25, main.v0 - 0.1]);
  }
  if (ws) {
    const w = e.house.wing!;
    const [a, c] = ws > 0 ? [w.u1 + 0.2, box[2]] : [box[0], w.u0 - 0.2];
    if (c - a >= 0.5) put('shrubs', [a, w.v1 + 0.2, c, Math.min(w.v0, motor ? motor[1] : w.v0) - 0.3]);
  }

  return { feats, lawn: P.lawn() };
}
const overlaps = (r: FR, list: FR[]) => list.some((t) => r[0] < t[2] && t[0] < r[2] && r[1] < t[3] && t[1] < r[3]);

export const ESTATE_GARDENS: Garden[] = ESTATES.map(estateGarden);

/* ---------- The mansions ---------- */

/** A villa's terraces planted as vineyards: rows across them (v of each row, in its terrace's frame) */
export const TERRACE_VINES = 0.75;

function mansionGarden(m: Mansion): Garden {
  const { W, D, kind, du } = m;
  const inner = m.walled ? 0.6 + WALL.t + 0.15 : 0.45;
  const box: FR = [-W / 2 + inner, -D + inner, W / 2 - inner, -0.35];
  const [pu0, pv0, pu1, pv1] = m.pool;
  const out = mansionOut(m);
  const origin = mansionOrigin(m);
  const [cu0, cv0, cu1, cv1] = m.court;
  const taken: FR[] = [
    ...m.parts.map((p: MPart) => norm(p.u0 - 0.2, p.v1 - 0.2, p.u1 + 0.2, p.v0 + 0.2)),
    norm(Math.max(-W / 2 + 1, cu0), Math.min(-1, cv0), Math.min(W / 2 - 1, cu1), cv1),
    norm(pu0 - 1, pv0 + 1.8, pu1 + 1, pv1 - (kind === 'glass' ? 0.4 : 0.8)),
    norm(du - 1.4, -1.6, du + 1.4, 0),
    ...MANSION_CARS.filter(({ car: [, x, z] }) => x > m.rect[0] && x < m.rect[2] && z > m.rect[1] && z < m.rect[3]).map(({ car: [, x, z, yaw] }) => carIn(out, origin, x, z, yaw)),
    // (the lounger by the pool, crestlife.ts's sunbather on it)
    norm(pu0 + 0.3, pv0 + 0.5, pu0 + 1.9, pv0 + 1.8),
  ];
  // (a glass mansion's legs under the cantilever, off the pad: nothing there)
  const P = new Planner(box, taken);
  const feats: Feat[] = [];
  const put = (k: FeatKind, r: FR, n?: Pt) => {
    if (!P.free(r)) return false;
    feats.push({ kind: k, r, n, tone: kind });
    P.take(r);
    return true;
  };
  /** Try a feature at each spot in turn */
  const first = (k: FeatKind, hu: number, hv: number, spots: Pt[], n?: Pt) => spots.some(([u, v]) => put(k, at(u, v, hu, hv), n));
  // Candidate spots: a half-tile grid over the pad, back corners first
  const grid: Pt[] = [];
  for (let v = box[1] + 0.5; v < box[3] - 0.5; v += 0.5) for (let u = box[0] + 0.5; u < box[2] - 0.5; u += 0.5) grid.push([u, v]);
  const corners = (pts: Pt[]) => [...pts].sort((a, b) => a[1] - b[1] + (Math.abs(b[0]) - Math.abs(a[0])) * 0.3);

  feats.push({ kind: 'spa', r: at(pu1 - 0.6, pv1 - 0.2, SPA_R), tone: kind });
  if (kind === 'compound' || kind === 'summit') first('poolhouse', 1.5, 1.05, corners(grid), [0, 1]);
  if (kind === 'villa' || kind === 'compound') first('pergola', 1.3, 1.2, corners(grid), [0, 1]);
  if (kind === 'glass' || kind === 'summit') first('firepit', 1.0, 1.0, corners(grid));
  if (kind === 'summit') {
    for (const s of [-1, 1]) first('statue', 0.35, 0.35, grid.filter(([u, v]) => Math.sign(u) === s && v > -6).sort((a, b) => b[1] - a[1]));
    for (const p of m.parts.slice(0, 1)) for (const [u, v] of [[p.u0 - 0.6, p.v0 - 0.3], [p.u1 + 0.6, p.v0 - 0.3], [p.u0 - 0.6, p.v1 + 0.3], [p.u1 + 0.6, p.v1 + 0.3]] as Pt[]) put('cypress', at(u, v, 0.3));
  }
  if (kind === 'villa') for (const p of m.parts.slice(0, 1)) for (const [u, v] of [[p.u0 - 0.55, p.v0 - 0.3], [p.u1 + 0.55, p.v0 - 0.3]] as Pt[]) put('cypress', at(u, v, 0.3));
  // Olive trees on the lawn, a few to a pad
  const olives = kind === 'glass' ? 2 : 3;
  let n = 0;
  for (const p of corners(grid)) if (n < olives && put('olive', at(p[0], p[1], 0.75))) n++;
  // Borders inside a compound's walls, along its back and sides; a glass mansion's grasses
  if (m.walled) {
    put('border', [box[0], box[1], box[2], box[1] + 0.45]);
    for (const u of [box[0], box[2] - 0.45]) {
      // (in pieces round what's in the way)
      for (let v = box[1] + 0.5; v < box[3] - 1; v += 1.5) put('border', [u, v, u + 0.45, Math.min(box[3] - 0.5, v + 1.45)]);
    }
  } else if (kind === 'glass') for (const p of corners(grid).slice(0, 40)) if (put('grass', at(p[0], p[1], 0.9, 0.3))) break;
  // A pair at the door (on the forecourt's paving: clear of the car only)
  const main = m.parts[0];
  const fu = (main.u0 + main.u1) / 2;
  const pair: FeatKind = kind === 'villa' ? 'lemon' : kind === 'glass' ? 'planter' : kind === 'summit' ? 'cone' : 'urn';
  const cars = taken.slice(m.parts.length + 3, -1);
  for (const s of [-1, 1]) {
    const r = at(fu + s * (kind === 'glass' ? 1.5 : 1.35), main.v0 + 0.45, 0.3);
    if (!overlaps(r, cars)) feats.push({ kind: pair, r, tone: kind });
  }
  // Lamps by the drive's mouth
  for (const s of [-1, 1]) feats.push({ kind: 'lamp', r: at(du + s * 1.6, -0.7, 0.08), tone: kind });
  return { feats, lawn: P.lawn() };
}
export const MANSION_GARDENS: Garden[] = MANSIONS.map(mansionGarden);

/* ---------- The landmarks' gardens (in world numbers: u is x, v is z) ---------- */

/**
 * The grand hotel's pool garden (a formal terrace between the hotel's back and the deck: a tiled fountain on its axis
 * between two parterres, a gravel walk; clipped cones at the deck's corners, umbrellas between the loungers, a border
 * before the cabanas) and the civic hall's park (clipped hedges along the walk, urns at the fountains' outer corners,
 * two flagpoles before the colonnade)
 */
export const SITE_GARDENS: { id: string; y: number; g: Garden }[] = (() => {
  const H = HOTEL;
  const hotel: Feat[] = [];
  const f = (kind: FeatKind, r: FR, tone: Feat['tone'] = 'spanish') => hotel.push({ kind, r, tone });
  const axis = (H.pool[0] + H.pool[2]) / 2;
  const [t0, t1] = [H.body[3] + 0.6, H.deck[1] - 0.6];
  const tm = (t0 + t1) / 2;
  f('fountain', at(axis, tm, 0.95));
  f('gravel', [axis - 0.4, H.body[3] + 0.05, axis + 0.4, tm - 0.95]);
  f('gravel', [axis - 0.4, tm + 0.95, axis + 0.4, H.deck[1]]);
  for (const s of [-1, 1]) f('parterre', s < 0 ? [H.deck[0] + 0.2, t0, axis - 1.6, t1] : [axis + 1.6, t0, H.deck[2] - 0.2, t1], 'georgian');
  for (const [x, z] of [
    [H.deck[0] + 0.4, H.deck[1] + 0.4],
    [H.deck[2] - 0.4, H.deck[1] + 0.4],
    [H.deck[0] + 0.4, H.deck[3] - 0.4],
    [H.deck[2] - 0.4, H.deck[3] - 0.4],
  ] as Pt[])
    f('cone', at(x, z, 0.28), 'georgian');
  for (let x = H.pool[0] + 1.3; x < H.pool[2] - 0.8; x += 2.8) for (const z of [H.pool[1] - 0.95, H.pool[3] + 0.95]) f('umbrella', at(x, z, 0.06), 'georgian');
  f('border', [H.deck[0] + 0.5, H.deck[3] + 0.05, H.deck[2] - 0.5, H.deck[3] + 0.5]);
  const C = CIVIC;
  const ax = (C.walk[0] + C.walk[2]) / 2;
  const civic: Feat[] = [];
  const c = (kind: FeatKind, r: FR) => civic.push({ kind, r, tone: 'georgian' });
  const mid = C.fountains[0][1];
  for (const s of [-1, 1]) {
    const x = ax + s * 3.6;
    c('hedge', [x - 0.15, C.walk[1] + 0.4, x + 0.15, mid - 1.4]);
    c('hedge', [x - 0.15, mid + 1.4, x + 0.15, C.walk[3] - 0.4]);
    const [fx, fz] = C.fountains[s < 0 ? 0 : 1];
    for (const dz of [-1, 1]) c('urn', at(fx + s * (C.fountainR + 1), fz + dz * (C.fountainR + 1), 0.3));
    c('flag', at(ax + s * 10.5, C.colonnade.z + 1.6, 0.1));
  }
  // The country club: a putting green beside the clubhouse, borders along its back, cones at the terrace's ends, flags
  const K = CLUB;
  const club: Feat[] = [];
  const k = (kind: FeatKind, r: FR) => club.push({ kind, r, tone: 'villa' });
  k('putting', at((K.pad[0] + K.house[0]) / 2, (K.house[1] + K.house[3]) / 2, (K.house[0] - K.pad[0]) / 2 - 0.5, 3.2));
  k('border', [K.house[0] + 0.5, K.house[1] - 0.55, K.house[2] - 0.5, K.house[1] - 0.1]);
  for (const x of [K.terrace[0] - 0.45, K.terrace[2] + 0.45]) k('cone', at(x, (K.terrace[1] + K.terrace[3]) / 2, 0.28));
  for (const x of [K.house[0] - 0.8, K.house[2] + 0.8]) k('flag', at(x, K.pad[3] - 1.2, 0.1));
  return [
    { id: 'hotel', y: SLAB_Y, g: { feats: hotel, lawn: [] } },
    { id: 'civic', y: C.y, g: { feats: civic, lawn: [] } },
    { id: 'club', y: K.y, g: { feats: club, lawn: [] } },
  ];
})();

/* ---------- What's solid ---------- */

/** A feature's solid boxes in its frame, with their tops over its ground (posts only for a pergola and a gazebo) */
export function solidsOf(f: Feat): [FR, number][] {
  if (!SOLID[f.kind]) return [];
  const [u0, v0, u1, v1] = f.r;
  const h = HEIGHT[f.kind];
  if (f.kind === 'gazebo') return gazeboColumns(f).map(([u, v]): [FR, number] => [at(u, v, POST + 0.04), h]);
  if (f.kind === 'pergola') {
    const m = 0.1;
    return [
      [u0 + m, v0 + m],
      [u1 - m, v0 + m],
      [u0 + m, v1 - m],
      [u1 - m, v1 - m],
    ].map(([u, v]): [FR, number] => [at(u, v, POST + 0.04), h]);
  }
  if (f.kind === 'firepit') return [[at((u0 + u1) / 2, (v0 + v1) / 2, 0.42), h]];
  if (f.kind === 'statue' || f.kind === 'urn' || f.kind === 'cone' || f.kind === 'lemon' || f.kind === 'birdbath') {
    const [cu, cv] = [(u0 + u1) / 2, (v0 + v1) / 2];
    return [[at(cu, cv, Math.min(0.3, (u1 - u0) / 2)), h]];
  }
  return [[f.r, h]];
}
/** A gazebo's eight columns in its frame, round its middle */
export function gazeboColumns(f: Feat): Pt[] {
  const [cu, cv] = [(f.r[0] + f.r[2]) / 2, (f.r[1] + f.r[3]) / 2];
  const rr = (f.r[2] - f.r[0]) / 2 - 0.18;
  return Array.from({ length: 8 }, (_, k): Pt => [cu + Math.cos(((k + 0.5) * Math.PI) / 4) * rr, cv + Math.sin(((k + 0.5) * Math.PI) / 4) * rr]);
}
/** In world numbers: every garden's solid boxes (x0, z0, x1, z1, top) */
export const GARDEN_SOLIDS: Box[] = [
  ...ESTATES.flatMap((e, i) => {
    const out = estateOut(e);
    const origin = estateOrigin(e);
    return ESTATE_GARDENS[i].feats.flatMap((f) => solidsOf(f).map(([r, h]) => worldBox(out, origin, r, SLAB_Y + h)));
  }),
  ...ESTATES.flatMap((e) => {
    const out = estateOut(e);
    const origin = estateOrigin(e);
    const { bay, loggia } = extrasOf(e);
    const boxes: Box[] = [];
    if (bay) boxes.push(worldBox(out, origin, bay, SLAB_Y + 4));
    if (loggia) for (const u of loggiaPiers(loggia)) boxes.push(worldBox(out, origin, at(u, loggia[1] + PIER, PIER), SLAB_Y + 2));
    return boxes;
  }),
  ...SITE_GARDENS.flatMap(({ y, g }) => g.feats.flatMap((f) => solidsOf(f).map(([r, h]): Box => [r[0], r[1], r[2], r[3], y + h]))),
  ...MANSIONS.flatMap((m, i) => {
    const out = mansionOut(m);
    const origin = mansionOrigin(m);
    return MANSION_GARDENS[i].feats.flatMap((f) => solidsOf(f).map(([r, h]) => worldBox(out, origin, r, m.y + h)));
  }),
];
function worldBox(out: Pt, origin: Pt, r: FR, top: number): Box {
  const [ox, oz] = out;
  const w = (u: number, v: number): Pt => [origin[0] + oz * u + ox * v, origin[1] - ox * u + oz * v];
  const [a, b] = [w(r[0], r[1]), w(r[2], r[3])];
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), top];
}
