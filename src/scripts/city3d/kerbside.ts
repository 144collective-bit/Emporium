/*
 * Uptown's kerbside (docs/finance-plan.md Phase 5, the owner's picks; DOM-free,
 * tested in tests/kerbside.test.ts): what the boot needs of the lay-bys, the
 * service alleys and the circle's monument (the parked cars, what's solid);
 * what only the drawing needs (the porte-cochères, the docks, the signs and
 * paint) is kerbside3d.ts's, in Uptown's chunk.
 *
 * - **Cars in the lay-bys** (`LAYBY_CARS`, uptown.ts `LAYBYS`): parked along
 *   them facing the traffic's way (keep right), two in three of the parking
 *   bays taken, the taxi rank's Cruisers in taxi yellow, the valets' long
 *   black saloons and coupes, a box van at the loading bay.
 * - **Service alleys** (`SERVICE_ALLEYS`): the way between two towers on a
 *   block, through from street to street, two bollards at each mouth (no car
 *   gets in), a dumpster against a podium (`ALLEY_DUMPSTERS`).
 * - **The monument** (`MONUMENT`): a granite column on the circle's island, a
 *   gilded globe on top (fixed, made up: no person, no mark).
 * - `KERBSIDE_SOLIDS` (in `SOLIDS`): the parked cars, the bollards, the
 *   dumpsters, the monument's plinth.
 */
import { CIRCLE, LAYBYS, UPTOWN_BLOCKS, laybyRect, type Layby, type Pt, type Rect } from './uptown';
import { HIGHRISES, PODIUM } from './highrise';

/** A space along a lay-by: this long, a car in each */
export const SPACE = 3.3;
/** A parked car's footprint: half its length and width (the longest model) */
export const CAR_HALF = { l: 1.5, w: 0.6 };

/** Which way the traffic runs along the kerb a lay-by opens off (keep right): the yaw a car parked in it faces */
function yawOf(l: Layby): number {
  // A lay-by on a block's east side is on the west kerb of the street east of it: that kerb's traffic heads south (+z);
  // on its west side, north; on its south side (the north kerb of the street south of it), west; on its north side, east
  return l.side === 'e' ? -Math.PI / 2 : l.side === 'w' ? Math.PI / 2 : l.side === 's' ? Math.PI : 0;
}
/** The one-way pair's east street runs south only: the bays on either kerb face that way */
const ONE_WAY: Record<string, number> = { taxi: -Math.PI / 2, 'loading-m2': -Math.PI / 2 };

/** A small seeded generator (the same cars for everyone) */
function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Taxi yellow (taxi.ts's Cruiser) */
export const TAXI_YELLOW = '#ffc23d';
export const LAYBY_CARS: { layby: string; car: [string, number, number, number, string] }[] = (() => {
  const out: { layby: string; car: [string, number, number, number, string] }[] = [];
  const r = rng(5150);
  const parking = ['hatch', 'sedan', 'coupe', 'suv', 'pickup'];
  const paints = ['#e23b3b', '#2aabee', '#f3f2f7', '#8000ff', '#1fbf6b', '#2b2d3a', '#9a96b8', '#ff8a3d'];
  const valet = ['exec', 'super', 'exec', 'coupe', 'exec'];
  const dark = ['#14121f', '#1c1d2e', '#f3f2f7', '#2b2d3a', '#14121f'];
  for (const l of LAYBYS) {
    const [x0, z0, x1, z1] = laybyRect(l);
    const alongX = l.side === 'n' || l.side === 's';
    const len = alongX ? x1 - x0 : z1 - z0;
    const n = l.kind === 'loading' ? 1 : Math.floor(len / SPACE);
    const start = (alongX ? x0 : z0) + (len - n * SPACE) / 2;
    const yaw = ONE_WAY[l.id] ?? yawOf(l);
    for (let i = 0; i < n; i++) {
      // (two in three of the parking bays taken; the rank and the valets full but one)
      if (l.kind === 'parking' ? r() > 0.68 : l.kind !== 'loading' && i === n - 1) continue;
      const a = start + (i + 0.5) * SPACE;
      // (a hand's width off the bay's back, nearer the kerb than the sidewalk)
      const [x, z] = alongX ? [a, (z0 + z1) / 2] : [(x0 + x1) / 2, a];
      const [model, paint] =
        l.kind === 'parking' ? [parking[Math.floor(r() * parking.length)], paints[Math.floor(r() * paints.length)]] : l.kind === 'taxi' ? ['sedan', TAXI_YELLOW] : l.kind === 'valet' ? [valet[i % valet.length], dark[i % dark.length]] : ['van', '#f3f2f7'];
      out.push({ layby: l.id, car: [model, x, z, yaw, paint] });
    }
  }
  return out;
})();

/* ---------- Service alleys ---------- */

export interface ServiceAlley {
  id: string;
  block: string;
  /** Between the two towers' lots, through the block from street to street (x0, z0, x1, z1) */
  rect: Rect;
  /** Along z (north to south) or along x */
  alongZ: boolean;
  /** The two towers either side */
  towers: [string, string];
}
/** Where a block's outline crosses x (its north and south edges there: the lay-bys cut in) */
function edgesAt(poly: Pt[], x: number): [number, number] {
  const zs: number[] = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    if ((a[0] - x) * (b[0] - x) < 0) zs.push(a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]));
  });
  return [Math.min(...zs), Math.max(...zs)];
}
/** Every pair of towers side by side on a block, their lots apart along x: the way between them, through the block */
export const SERVICE_ALLEYS: ServiceAlley[] = UPTOWN_BLOCKS.flatMap((b) => {
  const ts = HIGHRISES.filter((t) => t.block === b.id && t.parts[0].skin === 'podium').sort((p, q) => p.lot[0] - q.lot[0]);
  const out: ServiceAlley[] = [];
  for (let i = 1; i < ts.length; i++) {
    const [a, c] = [ts[i - 1], ts[i]];
    // (side by side: their lots overlapping along z, apart along x)
    if (a.lot[2] > c.lot[0] || Math.min(a.lot[3], c.lot[3]) - Math.max(a.lot[1], c.lot[1]) < 6) continue;
    const [z0, z1] = edgesAt(b.poly, (a.lot[2] + c.lot[0]) / 2);
    out.push({ id: `${a.id}-${c.id}`, block: b.id, rect: [a.lot[2], z0, c.lot[0], z1], alongZ: true, towers: [a.id, c.id] });
  }
  return out;
});
/** The bollards at an alley's mouths (x, z), two at each, its way in a walker's width either side */
export const BOLLARD_R = 0.12;
export const ALLEY_BOLLARDS: Pt[] = SERVICE_ALLEYS.flatMap((a) => {
  const cx = (a.rect[0] + a.rect[2]) / 2;
  return [a.rect[1] + 0.35, a.rect[3] - 0.35].flatMap((z): Pt[] => [
    [cx - 0.55, z],
    [cx + 0.55, z],
  ]);
});
/** A dumpster against the west tower's podium in each alley, a little past its middle (x0, z0, x1, z1) */
export const DUMPSTER = { l: 1.5, d: 0.9, h: 1.0 };
export const ALLEY_DUMPSTERS: Rect[] = SERVICE_ALLEYS.map((a) => {
  const pod = HIGHRISES.find((t) => t.id === a.towers[0])!.parts[0].rect;
  const z = (pod[1] + pod[3]) / 2 + 1.2;
  return [pod[2] + 0.04, z - DUMPSTER.l / 2, pod[2] + 0.04 + DUMPSTER.d, z + DUMPSTER.l / 2];
});

/* ---------- The monument ---------- */

/** On the circle's island: a stepped granite plinth (half its side, height), the column (radius, top), the globe (radius) */
export const MONUMENT = { x: CIRCLE.x, z: CIRCLE.z, plinth: [[1.3, 0.35], [1.0, 0.75]] as [number, number][], column: { r: 0.32, top: 7.4 }, globe: 0.55 };

/* ---------- What's solid ---------- */

type Box = [number, number, number, number, number];
export const KERBSIDE_SOLIDS: Box[] = [
  ...LAYBY_CARS.map(({ car: [, x, z, yaw] }): Box => {
    const along = Math.abs(Math.cos(yaw)) > 0.5;
    const [hx, hz] = along ? [CAR_HALF.l, CAR_HALF.w] : [CAR_HALF.w, CAR_HALF.l];
    return [x - hx, z - hz, x + hx, z + hz, 1.2];
  }),
  ...ALLEY_BOLLARDS.map(([x, z]): Box => [x - BOLLARD_R, z - BOLLARD_R, x + BOLLARD_R, z + BOLLARD_R, 0.85]),
  ...ALLEY_DUMPSTERS.map(([x0, z0, x1, z1]): Box => [x0, z0, x1, z1, DUMPSTER.h]),
  // (the plinth: the island's planting round it stays walkable)
  [MONUMENT.x - MONUMENT.plinth[0][0], MONUMENT.z - MONUMENT.plinth[0][0], MONUMENT.x + MONUMENT.plinth[0][0], MONUMENT.z + MONUMENT.plinth[0][0], MONUMENT.column.top],
];
/** The docks' roll-up doors' height, under the podium's top (kerbside3d.ts) */
export const DOCK_H = Math.min(2.4, PODIUM.h - 0.4);
