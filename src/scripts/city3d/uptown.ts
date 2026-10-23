/*
 * Uptown, the financial centre (docs/finance-plan.md, the owner's call;
 * DOM-free, tested in tests/uptown.test.ts): the land west of town between
 * the west ring avenue and the river, from the ring highway to the Parkway
 * (Westlake Park's three strips until Phase 1), becoming a waterfront
 * boulevard and a financial centre with skyscrapers and a plaza. Phase 1 is
 * the land and its streets (this file); the towers, the plaza, the boulevard
 * and the life come in the next phases.
 *
 * - **Its streets** (`UPTOWN_STREETS`): three north-south streets (one lane
 *   each way) from the west ring avenue down to the north bank avenue, in
 *   line with The Trenches' cross streets across the river (`NS_X`), lit
 *   junctions wherever they meet the avenues and the cross streets
 *   (`UPTOWN_CROSSINGS`).
 * - **Its blocks** (`UPTOWN_BLOCKS`): the land between them, in three rows
 *   (n: by the ring avenue, m: the middle, s: on the river), four to a row;
 *   `PLAZA_BLOCK` is set aside for the plaza (Phase 3).
 * - **The axis** (`AXIS_X`): Westlake Park's Mall carried on south from its
 *   gate through Uptown to the river, a walk-only lane through the blocks
 *   either side of the plaza (`UPTOWN_LANES`) and zebra crossings over the
 *   streets (`AXIS_ZEBRAS`).
 * - **The open lots** (`OPEN_LOTS`): the plaza's block (Phase 3) and the
 *   slivers west of the axis's lanes stay behind hoardings (`HOARDINGS`,
 *   open at the axis's gates, `HOARDING_GATES`), solid (`UPTOWN_SOLIDS`);
 *   every other lot is a tower's (highrise.ts, Phase 2).
 * - **The boulevard's line** (`BOULEVARD_X`): the town's promenade carried
 *   on west along the north bank to the highway.
 */
import { EW_ROADS, LANE, RIVER, WALK_W } from './layout';
import { NS_X as TRENCH_X } from './trenches';
import { MALL, X0 as WEST, X1 as EAST } from './westlake';
import { PROMENADE } from './outer';

export type Pt = [number, number];
export type Rect = [number, number, number, number];

/** The avenues and cross streets west of town, north to south: the west ring avenue, the cross streets at 17 and 43, the north bank avenue */
export const ROWS_Z = EW_ROADS.filter((r) => r.c < RIVER[0]);
/** Its west and east edges (inside the sidewalks): clear of the highway's slip lanes, and the Parkway's west leg */
export const W = WEST;
export const E = EAST;

/** The north-south streets (x), west to east: The Trenches' cross streets carried on north of the river, those well inside the land */
export const NS_X = TRENCH_X.filter((x) => x > W + 20 && x < E - 20);
export const STREET_HALF = LANE;

export interface UptownStreet {
  id: string;
  kind: 'street';
  pts: Pt[];
  half: number;
  lanes: 1;
}
export const UPTOWN_STREETS: UptownStreet[] = NS_X.map((x, i) => ({
  id: `uptown-ns${i}`,
  kind: 'street',
  pts: [
    [x, ROWS_Z[0].c],
    [x, ROWS_Z.at(-1)!.c],
  ],
  half: STREET_HALF,
  lanes: 1,
}));

export interface UptownCrossing {
  id: string;
  at: Pt;
  streets: string[];
  lights: boolean;
}
/** Every junction lit: where each street meets the ring avenue, the cross streets and the bank avenue */
export const UPTOWN_CROSSINGS: UptownCrossing[] = UPTOWN_STREETS.flatMap((s, i) =>
  ROWS_Z.map((r) => {
    const j = EW_ROADS.indexOf(r);
    return { id: `${s.id}-ew${j}`, at: [NS_X[i], r.c] as Pt, streets: [`ew${j}`, s.id], lights: true };
  })
);

/* ---------- The blocks ---------- */

export type UptownRow = 'n' | 'm' | 's';
export interface UptownBlock {
  id: string;
  row: UptownRow;
  /** Its column, west to east */
  col: number;
  /** Inside its sidewalk, counter-clockwise seen from above */
  poly: Pt[];
  rect: Rect;
}
const rectPoly = ([x0, z0, x1, z1]: Rect): Pt[] => [
  [x0, z0],
  [x0, z1],
  [x1, z1],
  [x1, z0],
];
const IN = STREET_HALF + WALK_W;
export const UPTOWN_BLOCKS: UptownBlock[] = (['n', 'm', 's'] as UptownRow[]).flatMap((row, j) => {
  const [a, b] = [ROWS_Z[j], ROWS_Z[j + 1]];
  const z0 = a.c + a.half + WALK_W;
  const z1 = b.c - b.half - WALK_W;
  const cols = [W, ...NS_X, E];
  return cols.slice(0, -1).map((x, i): UptownBlock => {
    const rect: Rect = [i === 0 ? x : x + IN, z0, i === cols.length - 2 ? cols[i + 1] : cols[i + 1] - IN, z1];
    return { id: `uptown-${row}${i}`, row, col: i, poly: rectPoly(rect), rect };
  });
});
/** The plaza's block (Phase 3): the middle row's, on the Mall's axis */
export const PLAZA_BLOCK = 'uptown-m1';

/* ---------- The axis: the Mall carried on to the river ---------- */

/** Westlake Park's Mall, carried on south from its gate on the ring avenue */
export const AXIS_X = MALL.x;
/** The walk-only lanes along it through the blocks either side of the plaza (the plaza is open), half its width */
export const LANE_HALF = 1.6;
export const UPTOWN_LANES: Rect[] = UPTOWN_BLOCKS.filter((b) => b.rect[0] < AXIS_X && b.rect[2] > AXIS_X && b.id !== PLAZA_BLOCK).map((b) => [AXIS_X - LANE_HALF, b.rect[1], AXIS_X + LANE_HALF, b.rect[3]]);
/** Zebra crossings where the axis crosses each avenue and cross street: the road's centre line (z) and half width */
export const AXIS_ZEBRAS: { z: number; half: number }[] = ROWS_Z.map((r) => ({ z: r.c, half: r.half }));

/* ---------- The open lots: hoarded until their phase ---------- */

/**
 * The land that stays open until its phase, behind hoardings: the plaza's block (Phase 3; the spire stands in it,
 * highrise.ts) and the slivers west of the axis's lanes; each with its gates (where the axis comes in)
 */
export interface OpenLot {
  id: string;
  rect: Rect;
  gates: Pt[];
}
/** The hoardings: how far in from the lot's edge, how tall, how thick; a gate's half width */
export const HOARDING = { in: 0.5, h: 2.2, t: 0.12, gate: 2.2 };
export const OPEN_LOTS: OpenLot[] = [
  (() => {
    const [x0, z0, x1, z1] = UPTOWN_BLOCKS.find((b) => b.id === PLAZA_BLOCK)!.rect;
    return { id: 'plaza', rect: [x0, z0, x1, z1] as Rect, gates: [[AXIS_X, z0 + HOARDING.in], [AXIS_X, z1 - HOARDING.in]] as Pt[] };
  })(),
  ...UPTOWN_LANES.map((l): OpenLot => {
    const b = UPTOWN_BLOCKS.find((q) => q.rect[1] === l[1] && q.rect[0] < l[0] && q.rect[2] > l[2])!;
    return { id: `${b.id}-west`, rect: [b.rect[0], b.rect[1], l[0], b.rect[3]], gates: [] };
  }),
];
export const HOARDING_GATES: Pt[] = OPEN_LOTS.flatMap((o) => o.gates);
/** The hoardings' runs, straight lines along each open lot's edges `HOARDING.in` inside it, broken at its gates; [x0, z0, x1, z1] */
export const HOARDINGS: Rect[] = OPEN_LOTS.flatMap((o) => {
  const [x0, z0, x1, z1] = o.rect;
  const m = HOARDING.in;
  /** A side along x at z, cut by its gates */
  const along = (z: number): Rect[] => {
    const out: Rect[] = [];
    let at = x0 + m;
    for (const [gx] of o.gates.filter((g) => Math.abs(g[1] - z) < 0.01).sort((p, q) => p[0] - q[0])) {
      if (gx - HOARDING.gate > at + 0.3) out.push([at, z, gx - HOARDING.gate, z]);
      at = gx + HOARDING.gate;
    }
    if (x1 - m > at + 0.3) out.push([at, z, x1 - m, z]);
    return out;
  };
  return [...along(z0 + m), ...along(z1 - m), [x0 + m, z0 + m, x0 + m, z1 - m], [x1 - m, z0 + m, x1 - m, z1 - m]];
});
/** What's solid: the hoardings, a thin box each */
export const UPTOWN_SOLIDS: [number, number, number, number, number][] = HOARDINGS.map(([x0, z0, x1, z1]) => {
  const t = HOARDING.t / 2;
  return [Math.min(x0, x1) - t, Math.min(z0, z1) - t, Math.max(x0, x1) + t, Math.max(z0, z1) + t, 0.15 + HOARDING.h];
});

/* ---------- Its lamps and the boulevard's line ---------- */

/** The town's promenade carried on west along the north bank: from Uptown's west edge to where the town's begins */
export const BOULEVARD_X: [number, number] = [W, PROMENADE.x[0]];

/**
 * Street lamps along the avenues and cross streets through Uptown (its own streets' are drawn with them): both sides
 * every 12 (the ring avenue's park side and the bank avenue's river side have their own), clear of the junctions and
 * the axis's zebras; [x, z, ry], the arm reaching over the road
 */
export const UPTOWN_LAMPS: [number, number, number][] = ROWS_Z.flatMap((r, j) =>
  [-1, 1].flatMap((side) => {
    // (the ring avenue's north side is the park's; the bank avenue's south side the promenade's)
    if ((j === 0 && side < 0) || (j === ROWS_Z.length - 1 && side > 0)) return [];
    const z = r.c + side * (r.half + 0.45);
    const out: [number, number, number][] = [];
    for (let x = W + 4; x < E - 3; x += 12) {
      if (NS_X.some((c) => Math.abs(x - c) < STREET_HALF + WALK_W + 1.5) || Math.abs(x - AXIS_X) < LANE_HALF + 1.5) continue;
      out.push([x, z, Math.atan2(side, 0)]);
    }
    return out;
  })
);

/** Its land, for the outskirts' trees to keep off (x0, z0, x1, z1): the blocks, their streets, and the bank down to the water */
export const UPTOWN_RECT: Rect = [W - WALK_W, ROWS_Z[0].c - ROWS_Z[0].half, E + WALK_W, RIVER[0]];
/** Is a point on Uptown's land */
export const inUptown = (x: number, z: number, m = 0) => x > UPTOWN_RECT[0] - m && x < UPTOWN_RECT[2] + m && z > UPTOWN_RECT[1] - m && z < UPTOWN_RECT[3] + m;
