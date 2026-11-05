/*
 * Lot 9's homes (docs/trailer-plan.md; DOM-free, the chunk's, tested in tests/lot9.test.ts): the lots in their rows
 * along the lanes (lot9.ts's grid) and the home on each, seeded: its kind (single-wide, double-wide, caravan, camper,
 * the bus conversion), its condition (kept, worn, rough, condemned, the burnt-out shell) and its add-ons (deck, car,
 * carport, shed, lean-to, dog run, junk, KEEP OUT, dish, AC, tarp, boarded windows, flower boxes, skirting, the porch
 * bulb, the TV's glow). The chunk (lot9-3d.ts) draws them, joins their solids to the grids (`HOME_SOLIDS`,
 * `addSolids()`), parks the residents' cars (`HOME_CARS`) and fills the crowd's spare slots with the porch sitters
 * (`PORCH_SITTERS`); the boot never carries any of it.
 */
import { CARS, type CarId } from './carspec';
import { COL0, COLS, FENCE, FIRE_COLS, HOLE, LANE_HALF, LANE_N, LANE_S, LOT_W, ROAD_HALF, ROAD_Z, boxOf, carBox, rng, type Box, type Pt, type Rect } from './lot9';
import type { Idle } from './landmarks';


/** A lot's frame: u across it from its west edge (east), v back from its front on the lane */
export type Face = 'n' | 's';
export type HomeKind = 'single' | 'double' | 'caravan' | 'rv' | 'bus';
export type Condition = 'kept' | 'worn' | 'rough' | 'condemned' | 'burnt';
export interface Home {
  /** The lot it stands on */
  lot: Lot;
  kind: HomeKind;
  cond: Condition;
  /** Its body (world), the bottom of its walls (on blocks or wheels) and its top */
  body: Rect;
  y0: number;
  h: number;
  /** Its long side runs along z (every home stands end on to its lane) */
  /** The side its door and yard are on: +1 east, -1 west */
  side: 1 | -1;
  /** The door's foot outside it (world), and the deck or steps up to it */
  door: Pt;
  porch: Rect;
  /** The deck's top */
  porchY: number;
  /** Add-ons, each where it stands (world) */
  car?: { id: CarId; x: number; z: number; ry: number; paint: string };
  carport?: Rect;
  shed?: Rect;
  leanTo?: Rect;
  /** A dog's run behind the home (its chain-link pen), with the dog in it */
  dogRun?: Rect;
  keepOut?: Pt;
  junk?: Rect;
  dish: boolean;
  ac: boolean;
  tarp: boolean;
  boarded: boolean;
  flowers: boolean;
  skirting: boolean;
  /** A bulb on over the door at night, the TV's glow in a window */
  bulb: boolean;
  tv: boolean;
  /** Lawn chairs on the deck, and whether someone's in one */
  chairs: number;
  sitter: boolean;
  /** The yard's life (the polish round): what stands round it, each where there's room on its lot */
  yard: YardThing[];
  /** The hookup pedestal at the front (power and water; still there, unplugged, at a dead home) */
  hookup: Pt;
  /** Christmas lights left up along the roof's edge */
  xmas: boolean;
  seed: number;
}
export type YardKind = 'bins' | 'propane' | 'line' | 'pool' | 'trampoline' | 'kiddiepool' | 'grill' | 'table' | 'flamingos' | 'gnome' | 'toys' | 'woodpile' | 'bed' | 'flag';
export interface YardThing {
  kind: YardKind;
  rect: Rect;
  /** Its long side runs along z */
  alongZ: boolean;
}
/** What of the yard is solid, and how high */
export const YARD_SOLID: Partial<Record<YardKind, number>> = { pool: 0.9, trampoline: 0.75, grill: 0.95, table: 0.75, woodpile: 0.7, bed: 0.32, propane: 0.95, bins: 1.0 };
export interface Lot {
  id: string;
  rect: Rect;
  face: Face;
  row: number;
  col: number;
  use: 'home' | 'vacant' | 'firepit';
  home?: Home;
}


/** The rows: their fronts (on a lane), backs and the way they face (their lane: 'n' north of them, 's' south) */
const ROWS: { front: number; back: number; face: Face }[] = [
  // R0: between the fence and the north lane, facing it (south)
  { front: LANE_N - LANE_HALF - 0.2, back: FENCE[1] + 0.4, face: 's' },
  // R1, R2: back to back between the north lane and the middle
  { front: LANE_N + LANE_HALF + 0.2, back: (LANE_N + ROAD_Z) / 2, face: 'n' },
  { front: ROAD_Z - ROAD_HALF - 0.2, back: (LANE_N + ROAD_Z) / 2, face: 's' },
  // R3, R4: between the middle and the south lane
  { front: ROAD_Z + ROAD_HALF + 0.2, back: (ROAD_Z + LANE_S) / 2, face: 'n' },
  { front: LANE_S - LANE_HALF - 0.2, back: (ROAD_Z + LANE_S) / 2, face: 's' },
  // R5: between the south lane and the fence
  { front: LANE_S + LANE_HALF + 0.2, back: FENCE[3] - 0.4, face: 'n' },
];
/** The burnt-out shell and the two condemned units (row, col), set by hand; and the vacant pads */
const BURNT: [number, number] = [4, 8];
const CONDEMNED: [number, number][] = [
  [1, 2],
  [5, 9],
];
const VACANT: [number, number][] = [
  [0, 3],
  [2, 9],
  [4, 1],
  [5, 4],
  [1, 7],
];
const isAt = (list: [number, number][], r: number, c: number) => list.some(([a, b]) => a === r && b === c);

/** A point in a lot's frame (u across from its west edge, v back from its front), in the world */
export function toWorld(lot: { rect: Rect; face: Face }, u: number, v: number): Pt {
  const [x0, z0, , z1] = lot.rect;
  return [x0 + u, lot.face === 'n' ? z0 + v : z1 - v];
}
/** A rectangle in a lot's frame, in the world */
export function rectToWorld(lot: { rect: Rect; face: Face }, u0: number, v0: number, u1: number, v1: number): Rect {
  const [a, b] = [toWorld(lot, u0, v0), toWorld(lot, u1, v1)];
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
}
/** The way a lot's front faces (ry: 0 is +z): towards its lane */
export const frontRy = (face: Face) => (face === 'n' ? Math.PI : 0);

/** The homes' sizes (u across, v along), their walls' bottom and top */
const SIZE: Record<HomeKind, { w: number; l: number; v0: number; y0: number; h: number }> = {
  single: { w: 2.4, l: 7.6, v0: 1.4, y0: 0.38, h: 1.82 },
  double: { w: 4.2, l: 7.8, v0: 1.2, y0: 0.38, h: 1.86 },
  caravan: { w: 1.9, l: 4.2, v0: 3.4, y0: 0.32, h: 1.48 },
  rv: { w: 2.1, l: 5.8, v0: 2.6, y0: 0.32, h: 1.7 },
  bus: { w: 2.2, l: 7.2, v0: 1.8, y0: 0.3, h: 1.62 },
};
/** The residents' cars: worn models and faded paints */
const CAR_MODELS: CarId[] = ['hatch', 'sedan', 'pickup', 'van', 'suv', 'classic', 'muscle', 'pickup', 'sedan'];
const PAINTS = ['#7a4b3a', '#5b6a73', '#a29a86', '#3d4a5c', '#8a2e2e', '#c9b77b', '#2f3b2f', '#6b5a7a', '#b9b3a6', '#4d3b2c'];

function homeOf(lot: Lot, r: () => number, cond: Condition): Home {
  // The kind: mostly single-wides; doubles on a few lots; the old caravans, campers and the bus conversion
  const roll = r();
  const kind: HomeKind = cond === 'burnt' ? 'single' : roll < 0.58 ? 'single' : roll < 0.74 ? 'double' : roll < 0.86 ? 'caravan' : roll < 0.96 ? 'rv' : 'bus';
  const W = lot.rect[2] - lot.rect[0];
  const deep0 = lot.rect[3] - lot.rect[1];
  // (no two alike: set a little in or back, a single-wide a little shorter or longer)
  const S0 = SIZE[kind];
  const l = kind === 'single' ? S0.l - r() * 1.3 : S0.l;
  const vj = Math.max(0.9, Math.min(S0.v0 + (r() - 0.5) * 0.9, deep0 - 0.3 - l));
  const S = { ...S0, l, v0: vj };
  const side: 1 | -1 = r() < 0.5 ? 1 : -1;
  const inset = 0.55 + r() * 0.45;
  // The home against one side of the lot, its yard on the other
  const u0 = side === 1 ? inset : W - inset - S.w;
  const u1 = u0 + S.w;
  const body = rectToWorld(lot, u0, S.v0, u1, S.v0 + S.l);
  // The yard strip: from the home's side to the lot's other edge
  const [ya, yb] = side === 1 ? [u1 + 0.25, W - 0.35] : [0.35, u0 - 0.25];
  const hookup = toWorld(lot, side === 1 ? u0 + 0.2 : u1 - 0.2, Math.max(0.3, S.v0 - 0.45));
  const strip = yb - ya;
  const rough = cond === 'rough' || cond === 'condemned' || cond === 'burnt';
  const lived = cond !== 'condemned' && cond !== 'burnt';
  // A car nosed in at the front of the yard strip (lived-in homes, about half): the deck goes in behind it
  const carId = lived && strip >= 1.5 && r() < 0.55 ? CAR_MODELS[Math.floor(r() * CAR_MODELS.length)] : null;
  const carL = carId ? CARS[carId].L : 0;
  // The deck by the door, a little way back from the front (behind the car's tail)
  const dv = Math.max(S.v0 + Math.min(2.2, S.l * 0.35), carId ? 0.3 + carL + 1.25 : 0);
  const porchW = Math.min(1.5, strip);
  const pu0 = side === 1 ? ya : yb - porchW;
  const porch = rectToWorld(lot, pu0, dv - 0.9, pu0 + porchW, dv + 0.9);
  const door = toWorld(lot, side === 1 ? u1 + 0.1 : u0 - 0.1, dv);
  const home: Home = {
    lot,
    kind,
    cond,
    body,
    y0: S.y0,
    h: S.h,
    side,
    door,
    porch,
    porchY: Math.min(S.y0, 0.42),
    dish: lived && kind !== 'caravan' && r() < 0.45,
    ac: lived && (kind === 'single' || kind === 'double') && r() < 0.55,
    tarp: (rough || cond === 'worn') && kind !== 'bus' && r() < (rough ? 0.65 : 0.12),
    boarded: cond === 'condemned' || (cond === 'rough' && r() < 0.5),
    flowers: cond === 'kept',
    skirting: cond === 'kept' || (cond === 'worn' && r() < 0.6),
    bulb: lived && r() < 0.7,
    tv: lived && r() < 0.6,
    chairs: lived ? (r() < 0.75 ? 1 + Math.floor(r() * 2) : 0) : 0,
    sitter: false,
    yard: [],
    hookup,
    xmas: lived && r() < 0.22,
    seed: Math.floor(r() * 1e6),
  };
  // The car, sometimes under a tarp carport
  if (carId) {
    const cu = side === 1 ? yb - 0.85 : ya + 0.85;
    const [x, z] = toWorld(lot, cu, 0.3 + carL / 2);
    // (nose in: away from the lane)
    home.car = { id: carId, x, z, ry: lot.face === 'n' ? -Math.PI / 2 : Math.PI / 2, paint: PAINTS[Math.floor(r() * PAINTS.length)] };
    if (r() < 0.3) home.carport = rectToWorld(lot, cu - 0.8, 0.2, cu + 0.8, 0.4 + carL);
  }
  // Out the back: a shed, a lean-to against the home, or a dog's run; a junk heap on the rough ones
  const back = S.v0 + S.l;
  const deep = lot.rect[3] - lot.rect[1];
  const room = deep - 0.3 - (dv + 1.2);
  if (room > 2.2 && strip > 1.6) {
    const pick = r();
    const [su0, su1] = side === 1 ? [yb - 1.6, yb] : [ya, ya + 1.6];
    if (pick < 0.3) home.shed = rectToWorld(lot, su0, deep - 2.0, su1, deep - 0.4);
    else if (pick < 0.5 && lived) home.leanTo = rectToWorld(lot, side === 1 ? ya : ya + Math.max(0, strip - 1.6), back - 2.4, side === 1 ? ya + Math.min(1.6, strip) : yb, back - 0.2);
    else if (pick < 0.62 && lived && cond !== 'kept') home.dogRun = rectToWorld(lot, su0, deep - 2.6, su1, deep - 0.4);
    else if (rough) home.junk = rectToWorld(lot, su0 + 0.1, deep - 2.2, su1 - 0.1, deep - 0.5);
  }
  if (cond === 'condemned' || (rough && r() < 0.4) || home.dogRun) home.keepOut = toWorld(lot, side === 1 ? W - 0.3 : 0.3, 0.25);
  yardOf(home, r, { u0, u1, ya, yb, dv, deep, back, lived, rough });
  return home;
}

/** The yard's life: each thing tried at a few spots in the lot's frame (u across, v back), kept where it fits clear of
 * the home, its deck, car, carport, shed, lean-to, run, junk and sign, and of each other */
function yardOf(h: Home, r: () => number, f: { u0: number; u1: number; ya: number; yb: number; dv: number; deep: number; back: number; lived: boolean; rough: boolean }) {
  const lot = h.lot;
  const W = lot.rect[2] - lot.rect[0];
  const taken: Rect[] = [h.body, h.porch, h.shed, h.leanTo, h.dogRun, h.junk, h.carport, h.car ? carRect(h.car) : undefined].filter((q): q is Rect => !!q);
  if (h.keepOut) taken.push([h.keepOut[0] - 0.2, h.keepOut[1] - 0.2, h.keepOut[0] + 0.2, h.keepOut[1] + 0.2]);
  taken.push([h.hookup[0] - 0.2, h.hookup[1] - 0.2, h.hookup[0] + 0.2, h.hookup[1] + 0.2]);
  const inLot = (q: Rect) => q[0] > lot.rect[0] + 0.08 && q[2] < lot.rect[2] - 0.08 && q[1] > lot.rect[1] + 0.08 && q[3] < lot.rect[3] - 0.08;
  const free = (q: Rect, m: number) => inLot(q) && !taken.some((t) => q[0] < t[2] + m && q[2] > t[0] - m && q[1] < t[3] + m && q[3] > t[1] - m);
  /** Try it at each spot (its middle u, v) and size (across u, back v), keep the first that fits */
  const put = (kind: YardKind, w: number, d: number, spots: Pt[], m = 0.15) => {
    for (const [u, v] of spots) {
      const q = rectToWorld(lot, u - w / 2, v - d / 2, u + w / 2, v + d / 2);
      if (!free(q, m)) continue;
      h.yard.push({ kind, rect: q, alongZ: d > w });
      taken.push(q);
      return true;
    }
    return false;
  };
  const { u0, u1, ya, yb, dv, deep } = f;
  const ym = (ya + yb) / 2;
  const away = h.side === 1 ? u0 / 2 : (u1 + W) / 2;
  const backV = [deep - 1.0, deep - 1.6, dv + 2.2, dv + 3.0, dv + 3.8];
  // The bins at the front by the home's end (every home that's lived in, and most that aren't)
  if (f.lived || r() < 0.5) put('bins', 1.05, 0.55, [[h.side === 1 ? u0 + 0.6 : u1 - 0.6, 0.45], [ym, 0.4]], 0.08);
  if (!f.lived) return;
  // Propane by the home's back end or along its far side
  if (r() < 0.85) put('propane', 0.45, 0.45, [[away, f.back - 0.6], [away, f.back - 1.6], [h.side === 1 ? u1 + 0.4 : u0 - 0.4, f.back - 0.5]], 0.05);
  const pick = (p: number) => r() < p;
  const kept = h.cond === 'kept';
  // The big things in the yard strip behind the deck: a pool or a trampoline, a garden bed, a picnic table
  if (kept ? pick(0.4) : h.cond === 'worn' ? pick(0.15) : false) put('pool', 2.5, 2.5, backV.map((v): Pt => [ym, v]));
  else if (!kept && pick(0.3)) put('trampoline', 2.2, 2.2, backV.map((v): Pt => [ym, v]));
  if (pick(kept ? 0.55 : 0.25)) put('table', 1.5, 1.3, [[ym, dv + 2.1], [ym, dv + 3.2], [ym, deep - 1.2]]);
  if (pick(0.55)) put('grill', 0.55, 0.45, [[h.side === 1 ? ya + 0.4 : yb - 0.4, dv + 1.35], [ym, dv + 1.4], [ym, dv - 1.4]], 0.08);
  if (pick(kept ? 0.5 : 0.15)) put('bed', 0.8, 1.8, [[h.side === 1 ? yb - 0.5 : ya + 0.5, deep - 1.4], [h.side === 1 ? yb - 0.5 : ya + 0.5, dv + 2.6]]);
  if (pick(f.rough ? 0.6 : 0.25)) put('woodpile', 0.9, 0.5, [[away, f.back - 1.1], [ym, deep - 0.6]], 0.05);
  // The washing line along the yard strip, the kids' things
  if (pick(h.cond === 'worn' ? 0.6 : 0.4)) put('line', 0.3, 3.2, [[ym, dv + 3.2], [ym, deep - 2.0]], 0.1);
  if (!kept && pick(0.35)) put('kiddiepool', 1.1, 1.1, [[ym, dv + 1.9], [ym, deep - 1.0]], 0.1);
  if (pick(kept ? 0.15 : 0.4)) put('toys', 1.0, 1.0, [[ym, dv - 1.6], [ym, dv + 2.0], [ym, deep - 1.3]], 0.05);
  // Out front: the flamingos, a gnome, a flag by the deck
  if (pick(kept ? 0.6 : 0.2)) put('flamingos', 0.7, 0.3, [[ym, 0.5], [ym, 1.0]], 0.05);
  if (pick(kept ? 0.5 : 0.15)) put('gnome', 0.3, 0.3, [[h.side === 1 ? ya + 0.3 : yb - 0.3, dv - 1.1], [ym, 1.4]], 0.04);
  if (pick(0.2)) put('flag', 0.3, 0.3, [[h.side === 1 ? ya + 0.2 : yb - 0.2, dv + 1.15]], 0.04);
}
/** A parked car's footprint, turned to its heading */
function carRect(c: { id: CarId; x: number; z: number; ry: number }): Rect {
  const b = carBox(c.id, c.x, c.z, c.ry);
  return [b[0], b[1], b[2], b[3]];
}

/** Every lot in Lot 9, row by row, west to east */
export const LOTS: Lot[] = (() => {
  const out: Lot[] = [];
  ROWS.forEach((row, ri) => {
    for (let c = 0; c < COLS; c++) {
      const x0 = COL0 + c * LOT_W;
      const rect: Rect = [x0, Math.min(row.front, row.back), x0 + LOT_W, Math.max(row.front, row.back)];
      // (the north row leaves the footpath's way in clear, from the hole in the fence)
      if (ri === 0 && x0 < HOLE.x + 3 && x0 + LOT_W > HOLE.x - 3) continue;
      const lot: Lot = { id: `lot9-${ri}-${c}`, rect, face: row.face, row: ri, col: c, use: 'home' };
      if (ri === 3 && FIRE_COLS.includes(c)) lot.use = 'firepit';
      else if (isAt(VACANT, ri, c)) lot.use = 'vacant';
      else {
        const r = rng(9000 + ri * 97 + c * 13);
        const cond: Condition = BURNT[0] === ri && BURNT[1] === c ? 'burnt' : isAt(CONDEMNED, ri, c) ? 'condemned' : (() => {
          const k = r();
          return k < 0.2 ? 'kept' : k < 0.78 ? 'worn' : 'rough';
        })();
        lot.home = homeOf(lot, r, cond);
      }
      out.push(lot);
    }
  });
  return out;
})();
export const HOMES: Home[] = LOTS.filter((l) => l.home).map((l) => l.home!);


/* ---------- Their solids, cars, sitters and dogs ---------- */

/** The residents' cars on their lots */
export const HOME_CARS: [CarId, number, number, number, string][] = HOMES.filter((h) => h.car).map((h): [CarId, number, number, number, string] => [h.car!.id, h.car!.x, h.car!.z, h.car!.ry, h.car!.paint]);
/** What's solid: each home, its shed, dog run and junk, the yard's bigger things, and its car */
export const HOME_SOLIDS: Box[] = [
  ...HOMES.flatMap((h): Box[] => [
    boxOf(h.body, h.h + 0.15),
    ...(h.shed ? [boxOf(h.shed, 1.35)] : []),
    ...(h.dogRun ? [boxOf(h.dogRun, 1.1)] : []),
    ...(h.junk ? [boxOf(h.junk, 0.7)] : []),
    ...h.yard.filter((y) => YARD_SOLID[y.kind]).map((y) => boxOf(y.rect, YARD_SOLID[y.kind]!)),
  ]),
  ...HOME_CARS.map(([id, x, z, ry]) => carBox(id, x, z, ry)),
];
/** On their decks, in their lawn chairs: about one deck in four with chairs */
export const PORCH_SITTERS: Idle[] = (() => {
  const out: Idle[] = [];
  let k = 0;
  for (const h of HOMES)
    if (h.chairs && k++ % 4 === 1) {
      h.sitter = true;
      const [px0, pz0, px1, pz1] = h.porch;
      out.push({ x: (px0 + px1) / 2, z: (pz0 + pz1) / 2, y: h.porchY + 0.3, ry: frontRy(h.lot.face), act: 'lounge' });
    }
  return out;
})();
/** The chained dogs, in their runs (x, z, facing ry, coat) */
export const CHAINED_DOGS: { x: number; z: number; ry: number; coat: string }[] = HOMES.filter((h) => h.dogRun).map((h, i) => {
  const [x0, z0, x1, z1] = h.dogRun!;
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, ry: frontRy(h.lot.face) + (i % 2 ? 0.4 : -0.3), coat: ['#3b2f26', '#8a6a48', '#2a2622', '#b8a58a'][i % 4] };
});


/* ---------- The power: poles along the lanes, the lines between them, a drop to each home ---------- */

/** A pole's height, its crossarm's, and its footprint's half */
export const POLE = { h: 4.4, arm: 4.05, r: 0.13 };
/** The poles: along each lane on the side its lamps aren't, at every other lot's corner (x, z), lane by lane */
export const POLE_LINES: Pt[][] = [
  { z: LANE_N - LANE_HALF - 0.1 },
  { z: ROAD_Z + ROAD_HALF + 0.1 },
  { z: LANE_S + LANE_HALF + 0.1 },
].map(({ z }) => Array.from({ length: Math.floor(COLS / 2) + 1 }, (_, k): Pt => [COL0 + k * 2 * LOT_W, z]));
export const POLES: Pt[] = POLE_LINES.flat();
export const POLE_SOLIDS: Box[] = POLES.map(([x, z]): Box => [x - POLE.r, z - POLE.r, x + POLE.r, z + POLE.r, POLE.h]);
/** Each home with its power on: the drop from the nearest pole to its meter, up on the front of its yard side */
export const DROPS: { from: Pt; to: [number, number, number] }[] = HOMES.filter((h) => h.cond !== 'burnt').map((h) => {
  const front = h.lot.face === 'n' ? h.body[1] + 0.15 : h.body[3] - 0.15;
  const x = h.side === 1 ? h.body[2] : h.body[0];
  const from = POLES.reduce((a, p) => (Math.hypot(p[0] - x, p[1] - front) < Math.hypot(a[0] - x, a[1] - front) ? p : a));
  return { from, to: [x, h.y0 + h.h - 0.1, front] };
});
