/**
 * The Drive, Crestmont's shopping street (docs/crestmont-plan.md Phase 4, the owner's call: in the style of Beverly
 * Hills). DOM-free: the street plan's bays (crestmont.ts `CORAL_BAYS`), what's solid (solids.ts), the planting that
 * keeps off it (landscape.ts) and the drawing (coral3d.ts) read it.
 *
 * - **The boutiques** (`BOUTIQUES`): low and polished, two or three storeys, in a row along both sides of Coral Drive
 *   between the avenue (ew0) and the second cross street (ew2), their shopfronts set back `FRONT` from the lot's edge
 *   behind a strip of planters and café tables, each in its style (`Style`: white stone, glass in bronze, white
 *   render), an awning (black or gold) or none, its name on its fascia (made up, `NAMES`), window displays lit at
 *   night, flags on the grander ones.
 * - **Via Coral** (`VIA`): a short walk-only lane through the west block of the second row, cobbled, under an arch at
 *   its mouth (`ARCH`), a small fountain in it and a piazza at its far end with a bigger one (`FOUNTAINS`), two small
 *   shops facing across it (`LANE_SHOPS`), open to Alder Way behind.
 * - **The kerbside:** the bays off Coral Drive (crestmont.ts), the valets' with their stands (`VALET_STANDS`) and
 *   supercars and town cars waiting, the others parking (`CORAL_CARS`).
 * - `CORAL_SOLIDS` (in `SOLIDS`): the buildings, the arch's piers, the fountains, the planters, the stands, the cars.
 *
 * Every top well under the Emporium (`TALLEST`). Names and signs are made up. Fixed world numbers north of the river.
 */
import { BAY_DEPTH, CORAL, CORAL_BAYS, CREST_BLOCKS, FLATS_X, bayRect, flatsHalf, type Rect } from './crestmont';
import { rng } from './recipes';

type Pt = [number, number];
type Box = [number, number, number, number, number];

/** The blocks along the Drive: west of Coral Drive (its east side the front) and east of it (its west side) */
export const DRIVE_BLOCKS = ['crest-0-1', 'crest-0-2', 'crest-1-1', 'crest-1-2'] as const;
const rectOf = (id: string): Rect => CREST_BLOCKS.find((b) => b.id === id)!.rect;
const westOf = (id: string) => rectOf(id)[2] < FLATS_X[CORAL];

/** The shopfronts stand this far back from the lot's edge on Coral Drive (behind the bays, the planters and tables) */
export const FRONT = 3.4;
/** How deep a boutique is, from its shopfront back */
export const DEPTH = 8;
/** Kept off a block's north and south edges (the cross streets' trees) */
const END = 1.2;
/** The ground floor's height (tall: the shop), each storey over it, the parapet */
export const STOREY = { ground: 2.5, upper: 1.8, parapet: 0.35 } as const;
/** The tallest anything on the Drive stands (the Emporium's roof is 12.5) */
export const TALLEST = 7;
/** The ground the boutiques stand on (the lots' slab, world.ts `SLAB`) */
export const SLAB_Y = 0.15;

export type Style = 'stone' | 'glass' | 'render';
export type Awning = 'black' | 'gold' | 'none';
export type Face = 'n' | 's' | 'e' | 'w';
export interface Boutique {
  id: string;
  name: string;
  /** Its footprint (x0, z0, x1, z1) */
  rect: Rect;
  /** The side its shopfront is on */
  face: Face;
  /** Another side with windows on it (the arcade's corners) */
  side?: Face;
  floors: 2 | 3;
  style: Style;
  awning: Awning;
  /** A café: tables out on the strip in front */
  cafe: boolean;
  /** Flags out from its upper floor */
  flags: boolean;
}
/** Its height over the slab, parapet and all */
export const heightOf = (b: Boutique) => STOREY.ground + (b.floors - 1) * STOREY.upper + STOREY.parapet;
/** Along its face: its middle (the door) */
export const doorOf = (b: Boutique): Pt => {
  const [x0, z0, x1, z1] = b.rect;
  return b.face === 'e' ? [x1, (z0 + z1) / 2] : b.face === 'w' ? [x0, (z0 + z1) / 2] : b.face === 's' ? [(x0 + x1) / 2, z1] : [(x0 + x1) / 2, z0];
};
/** Out from a face (unit) */
export const outOf = (f: Face): Pt => (f === 'e' ? [1, 0] : f === 'w' ? [-1, 0] : f === 's' ? [0, 1] : [0, -1]);

/** The boutiques' names, made up (the sign atlas's cells: the lane's and the cafés' among them) */
export const NAMES = [
  'MAISON VERE',
  'HALCYON',
  'CASSIEN',
  'ODETTE ROW',
  'SOLENNE',
  'IVORY HALL',
  'VESPERINE',
  'AMBRE',
  'ROSELAND',
  'PALOMA HOUSE',
  'NOIR ET OR',
  'GILDED FIG',
  'SABLE & SILK',
  'BELCOURT',
  'LUMEN',
  'VELLARO',
  'ALCOVE',
  'MARIGOLD',
] as const;
/** The cafés' names, and the arcade's, and the valets' boards */
export const CAFES = ['CAFÉ ROSA', 'THE PEARL ROOM'] as const;
export const VIA_NAME = 'VIA CORAL';
export const VALET = 'VALET';

/* ---------- Via Coral ---------- */

const VIA_BLOCK = 'crest-0-2';
/** The lane (its middle z, half its width) from Coral Drive's lot edge back to the piazza, and the piazza out to Alder Way */
export const VIA = (() => {
  const [x0, , x1] = rectOf(VIA_BLOCK);
  const z = 30;
  const half = 2.5;
  // (the lane shops' back from the Coral row's, the piazza beyond them)
  const lane: Rect = [x0 + 7.1, z - half, x1, z + half];
  const piazza: Rect = [x0, z - 7, x0 + 7.1, z + 7];
  return { z, half, lane, piazza };
})();
/** The arch over the lane's mouth: its piers' middles (x, z), their half side, height; the lintel's top */
export const ARCH = { x: VIA.lane[2] - 1.4, piers: [VIA.z - VIA.half + 0.35, VIA.z + VIA.half - 0.35], half: 0.32, h: 3.4, top: 4.1 } as const;
/** The fountains: the lane's small one and the piazza's (x, z, the basin's radius, its rim's height, tiers) */
export const FOUNTAINS: { x: number; z: number; r: number; rim: number; tiers: number }[] = [
  { x: VIA.lane[0] + 10.5, z: VIA.z, r: 0.7, rim: 0.45, tiers: 1 },
  { x: (VIA.piazza[0] + VIA.piazza[2]) / 2 + 0.3, z: VIA.z, r: 1.7, rim: 0.5, tiers: 2 },
];
/** The cobbles: the lane and the piazza */
export const COBBLES: Rect[] = [VIA.lane, VIA.piazza];

/* ---------- The boutiques ---------- */

/** Widths a boutique can be along its front */
const WIDE = [4.6, 7.4] as const;

function lay(): Boutique[] {
  const r = rng(4404);
  const out: Boutique[] = [];
  const styles: Style[] = ['stone', 'glass', 'render', 'stone'];
  const awnings: Awning[] = ['black', 'gold', 'none', 'black', 'gold'];
  let n = 0;
  const name = () => NAMES[n++ % NAMES.length];
  for (const id of DRIVE_BLOCKS) {
    const [x0, z0, x1, z1] = rectOf(id);
    const west = westOf(id);
    const front = west ? x1 - FRONT : x0 + FRONT;
    const [bx0, bx1] = west ? [front - DEPTH, front] : [front, front + DEPTH];
    // The runs along the front: the whole block, or either side of the lane's mouth
    const runs: [number, number][] = id === VIA_BLOCK ? [[z0 + END, VIA.z - VIA.half], [VIA.z + VIA.half, z1 - END]] : [[z0 + END, z1 - END]];
    for (const [a, b] of runs) {
      let z = a;
      while (b - z > 0.1) {
        let w = WIDE[0] + r() * (WIDE[1] - WIDE[0]);
        // (the last takes what's left; never a sliver)
        if (b - z - w < WIDE[0]) w = b - z;
        const floors = r() < 0.4 ? 3 : 2;
        const style = styles[Math.floor(r() * styles.length)];
        // (next to the lane, its side on the lane carries windows)
        const side: Face | undefined = id === VIA_BLOCK ? (Math.abs(z + w - (VIA.z - VIA.half)) < 1e-6 ? 's' : Math.abs(z - (VIA.z + VIA.half)) < 1e-6 ? 'n' : undefined) : undefined;
        out.push({ id: `drive-${out.length}`, name: name(), rect: [bx0, z, bx1, z + w], face: west ? 'e' : 'w', side, floors, style, awning: awnings[Math.floor(r() * awnings.length)], cafe: false, flags: floors === 3 || style === 'stone' });
        // (a hair between neighbours: never two walls in one plane)
        z += w + 0.02;
      }
    }
  }
  // The cafés: the two widest fronts with no bay in front of them, one on each side of the street
  for (const west of [true, false]) {
    // (a bay may reach a little way along its front: its tables stop short of it)
    const free = out.filter((b) => (b.face === 'e') === west && !b.side && b.rect[3] - b.rect[1] - CORAL_BAYS.filter((y) => westOf(y.block) === west).reduce((m, y) => m + Math.max(0, Math.min(b.rect[3], y.to + 1) - Math.max(b.rect[1], y.from - 1)), 0) > 4);
    const best = free.sort((p, q) => q.rect[3] - q.rect[1] - (p.rect[3] - p.rect[1]))[0];
    if (best) {
      best.cafe = true;
      best.name = CAFES[west ? 0 : 1];
      best.awning = west ? 'gold' : 'black';
    }
  }
  return out;
}
/** The boutiques along Coral Drive */
export const BOUTIQUES: Boutique[] = lay();
/** Two small shops facing each other across the lane, between the Coral row and the piazza */
export const LANE_SHOPS: Boutique[] = (() => {
  const [x0, x1] = [VIA.piazza[2], VIA.piazza[2] + 6];
  return [
    { id: 'via-n', name: 'ALCOVE', rect: [x0, VIA.z - VIA.half - 5.2, x1, VIA.z - VIA.half], face: 's' as Face, floors: 2 as const, style: 'render' as Style, awning: 'gold' as Awning, cafe: false, flags: false },
    { id: 'via-s', name: 'MARIGOLD', rect: [x0, VIA.z + VIA.half, x1, VIA.z + VIA.half + 5.2], face: 'n' as Face, floors: 2 as const, style: 'stone' as Style, awning: 'black' as Awning, cafe: false, flags: false },
  ];
})();
/** Every shop on the Drive */
export const SHOPS: Boutique[] = [...BOUTIQUES, ...LANE_SHOPS];

/* ---------- The strip in front ---------- */

/** A planter's half side and height */
export const PLANTER = { half: 0.26, h: 0.55 } as const;
/** Planters either side of every door, a little out from the shopfront */
export const PLANTERS: Pt[] = SHOPS.flatMap((b) => {
  const [dx, dz] = doorOf(b);
  const [ox, oz] = outOf(b.face);
  const along: Pt = [oz !== 0 ? 1 : 0, ox !== 0 ? 1 : 0];
  return [-1, 1].map((s): Pt => [dx + ox * 0.55 + along[0] * s * 1.15, dz + oz * 0.55 + along[1] * s * 1.15]);
});
/** The cafés' tables (x, z): a row along the strip in front, clear of the planters and the door */
export const TABLES: Pt[] = BOUTIQUES.filter((b) => b.cafe).flatMap((b) => {
  const [ox] = outOf(b.face);
  const x = (ox > 0 ? b.rect[2] : b.rect[0]) + ox * 1.75;
  const out: Pt[] = [];
  const [dz] = [doorOf(b)[1]];
  const bays = CORAL_BAYS.filter((y) => westOf(y.block) === ox > 0);
  for (let z = b.rect[1] + 0.75; z < b.rect[3] - 0.6; z += 1.45) if (Math.abs(z - dz) > 1.45 && bays.every((y) => z < y.from - 1.4 || z > y.to + 1.4)) out.push([x, z]);
  return out;
});
/** A table's radius with its chairs round it */
export const TABLE_R = 0.62;

/* ---------- The kerbside ---------- */

/** A space in a bay, a car in each */
export const SPACE = 3.2;
/** A parked car's half length and width */
const CAR_HALF = { l: 1.5, w: 0.6 };
/** The valets' stands: on the strip behind each valet's bay, at its middle (x, z) */
export const VALET_STANDS: Pt[] = CORAL_BAYS.filter((b) => b.kind === 'valet').map((b): Pt => {
  const r = rectOf(b.block);
  const west = b.side === 'e';
  // (between the sidewalk round behind the bay and the shopfronts)
  const x = west ? r[2] - BAY_DEPTH - 0.6 : r[0] + BAY_DEPTH + 0.6;
  return [x, (b.from + b.to) / 2];
});
/** A stand's half side and height */
export const STAND = { half: 0.28, h: 1.05 } as const;
/** The cars in the bays: [model, x, z, yaw, paint], facing the way the kerb's traffic runs (keep right) */
export const CORAL_CARS: [string, number, number, number, string][] = (() => {
  const r = rng(6161);
  const out: [string, number, number, number, string][] = [];
  const valets = ['super', 'exec', 'super', 'coupe', 'exec'];
  const vPaint = ['#f3f2f7', '#14121f', '#d9a94a', '#c21d3a', '#1c1d2e'];
  const parking = ['suv', 'coupe', 'sedan', 'super', 'exec'];
  const pPaint = ['#f3f2f7', '#2b2d3a', '#9a96b8', '#7a1f2e', '#14121f', '#c9b48a'];
  let v = 0;
  for (const b of CORAL_BAYS) {
    const [x0, , x1] = bayRect(b);
    const n = Math.floor((b.to - b.from) / SPACE);
    const start = b.from + (b.to - b.from - n * SPACE) / 2;
    // (a bay on a block's east side is on the street's west kerb: its traffic heads south, +z)
    const yaw = b.side === 'e' ? -Math.PI / 2 : Math.PI / 2;
    for (let i = 0; i < n; i++) {
      if (b.kind === 'valet' ? i === n - 1 && n > 2 : r() > 0.7) continue;
      const [model, paint] = b.kind === 'valet' ? [valets[v % valets.length], vPaint[v++ % vPaint.length]] : [parking[Math.floor(r() * parking.length)], pPaint[Math.floor(r() * pPaint.length)]];
      out.push([model, (x0 + x1) / 2, start + (i + 0.5) * SPACE, yaw, paint]);
    }
  }
  return out;
})();

/* ---------- What's solid, and what the planting keeps off ---------- */

const sq = (x: number, z: number, h: number, top: number): Box => [x - h, z - h, x + h, z + h, top];
export const CORAL_SOLIDS: Box[] = [
  ...SHOPS.map((b): Box => [...b.rect, SLAB_Y + heightOf(b)]),
  ...ARCH.piers.map((z) => sq(ARCH.x, z, ARCH.half, SLAB_Y + ARCH.h)),
  ...FOUNTAINS.map((f) => sq(f.x, f.z, f.r * 0.8, SLAB_Y + f.rim + 0.9 * f.tiers)),
  ...PLANTERS.map(([x, z]) => sq(x, z, PLANTER.half, SLAB_Y + PLANTER.h)),
  ...VALET_STANDS.map(([x, z]) => sq(x, z, STAND.half, SLAB_Y + STAND.h)),
  ...CORAL_CARS.map(([, x, z]): Box => [x - CAR_HALF.w, z - CAR_HALF.l, x + CAR_HALF.w, z + CAR_HALF.l, 1.2]),
];
/** On the Drive's buildings, the lane, the piazza, the strip in front of the shops or a bay (padded `m`): where nothing grows */
export function onDrive(x: number, z: number, m = 0) {
  const inR = (r: Rect, p = m) => x > r[0] - p && x < r[2] + p && z > r[1] - p && z < r[3] + p;
  if (SHOPS.some((b) => inR(b.rect)) || COBBLES.some((c) => inR(c)) || CORAL_BAYS.some((b) => inR(bayRect(b)))) return true;
  // (the strip between a row's shopfronts and the sidewalk behind a bay)
  return BOUTIQUES.some((b) => {
    const [ox] = outOf(b.face);
    const strip: Rect = ox > 0 ? [b.rect[2], b.rect[1], b.rect[2] + FRONT - 0.95, b.rect[3]] : [b.rect[0] - FRONT + 0.95, b.rect[1], b.rect[0], b.rect[3]];
    return inR(strip);
  });
}
/** Coral Drive's kerb either side (x): the drawing's and the tests' */
export const KERBS = [FLATS_X[CORAL] - flatsHalf(CORAL), FLATS_X[CORAL] + flatsHalf(CORAL)] as const;
