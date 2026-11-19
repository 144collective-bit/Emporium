/*
 * Northgate Air Base (docs/military-plan.md, the owner's call, 2026-11): a very large base and airfield across the
 * whole north, from the west wall to Crestmont's hills. Phase 1 is its land, its fence and its gates; the airfield
 * and the base itself come later. DOM-free (the drawing, walking, the street plan and the tests read it).
 *
 * The numbers are the plan's lines, signed off 2026-11-19 (`docs/military-map.png`), in fixed world numbers; only
 * where the base meets the wall (the wall gate's yard) are they worked out from the wall, so it holds against
 * whatever world a test run sets (`npm run test:wide`).
 *
 * - `FENCE`: the fence's closed line, wandering (no straight rectangle of land meets another). Chain-link with wire
 *   on top, see-through (the owner's pick), solid for walking, driving and the camera (`AIRBASE_SOLIDS`).
 * - `GATES`: the main gate on the north avenue from town (`ns0-n`) and the service gate on `ns3-n`, both shut; each
 *   country road ends in a turning loop in front of its gate (rural.ts `RURAL_ENDS`).
 * - `VISITORS`, `VISITOR_CENTRE`: the visitors' car park and centre outside the main gate (a place, coming soon).
 * - `AVENUE`, `WALL_GATE`: the parade avenue's line north from the main gate, and the wall's gate it ends at (the
 *   wall stays solid behind its doors: docs/wall-plan.md).
 * - `KEPT`: the lots kept for the plan's Phases 2 and 3 (the airfield and the cantonment).
 */
import { CAMERAS, FLOOD, FLOODS, WALL_INNER } from './wall';
import type { Box } from './solids';
import type { Pt } from './streetplan';
import type { Rect } from './tiles';

/** The wall's inside face along the north (from `EXT`: the wall gate's yard meets it wherever the world ends) */
const WALL_N = WALL_INNER[1];

/** How wide the wall gate is, and the yard either side of it inside the fence */
const GATE_W = 30;
const YARD = 21;
/**
 * The wall's gate: in the gap between two of the wall's floodlights (with no camera in it) nearest the parade avenue
 * (x -34 on the site's own world: the floodlights at -52 and -16), so nothing on the wall moves; its gatehouse 12 deep
 * (x0, z0, x1, z1)
 */
export const WALL_GATE: Rect = (() => {
  const want = -34;
  const xs = FLOODS.filter((f) => f.side === 'n')
    .map((f) => f.x)
    .sort((a, b) => a - b);
  let best: Rect | null = null;
  for (let i = 1; i < xs.length; i++) {
    const [a, b] = [xs[i - 1] + FLOOD.w / 2, xs[i] - FLOOD.w / 2];
    const c = (a + b) / 2;
    if (b - a < GATE_W + 2 || CAMERAS.some((k) => k.side === 'n' && k.x > c - GATE_W / 2 - 1 && k.x < c + GATE_W / 2 + 1)) continue;
    if (!best || Math.abs(c - want) < Math.abs((best[0] + best[2]) / 2 - want)) best = [c - GATE_W / 2, WALL_N + 2, c + GATE_W / 2, WALL_N + 14];
  }
  if (!best) throw new Error('no gap in the wall for its gate');
  return best;
})();

/** The fence's height (the chain-link and the wire on top), and how thick it is for walking into */
export const FENCE_H = 2.6;
export const FENCE_T = 0.1;

/**
 * The fence, a closed line, clockwise from the south-west corner: the south side 44 north of the stadium, the east
 * side west of Crestmont's hills (which start at x 285), the north side with the wall gate's yard running up to the
 * wall, the west side clear of the wall's floodlights
 */
export const FENCE: Pt[] = [
  // The south side
  [-730, -330], [-640, -318], [-520, -326], [-400, -312], [-300, -318], [-200, -306], [-110, -312], [-40, -307], [30, -308], [120, -314], [200, -322], [262, -336],
  // The east side
  [272, -420], [266, -500], [276, -600], [266, -690], [258, -730],
  // The north side, the wall gate's yard up to the wall's face
  [150, -736], [40, -734], [WALL_GATE[2] + YARD, -736], [WALL_GATE[2] + YARD, WALL_N], [WALL_GATE[0] - YARD, WALL_N], [WALL_GATE[0] - YARD, -736], [-150, -730], [-300, -738], [-450, -732], [-600, -736], [-700, -730],
  // The west side
  [-722, -650], [-732, -560], [-724, -460], [-732, -380],
];
/** How many of its runs are the south side (its first 12 points) */
const SOUTH_RUNS = 11;
/** Where the yard meets the wall: no fence along the wall itself (the wall closes it) */
const ALONG_WALL = (a: Pt, b: Pt) => a[1] === WALL_N && b[1] === WALL_N;

/** Is x, z inside the base's fence (even-odd) */
export function inAirbase(x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = FENCE.length - 1; i < FENCE.length; j = i++) {
    const [xi, zi] = FENCE[i];
    const [xj, zj] = FENCE[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
/** The fence's box (x0, z0, x1, z1) */
export const AIRBASE_RECT: Rect = [Math.min(...FENCE.map((p) => p[0])), Math.min(...FENCE.map((p) => p[1])), Math.max(...FENCE.map((p) => p[0])), Math.max(...FENCE.map((p) => p[1]))];

/** Where the fence's south side crosses x (its z) */
export function southFenceZ(x: number): number {
  for (let i = 0; i < SOUTH_RUNS; i++) {
    const [a, b] = [FENCE[i], FENCE[i + 1]];
    if (x >= a[0] && x <= b[0]) return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
  }
  throw new Error(`no south fence at x ${x}`);
}

/** A gate in the fence's south side: on its country road's line (x), the opening's half width, shut */
export interface Gate {
  id: 'main' | 'service';
  name: string;
  /** The road's line, and where it meets the fence */
  x: number;
  z: number;
  half: number;
  /** The country road it ends (rural.ts) */
  road: string;
}
const gate = (id: Gate['id'], name: string, x: number, half: number, road: string): Gate => ({ id, name, x, z: southFenceZ(x), half, road });
export const GATES: Gate[] = [gate('main', 'Main gate', -4.5, 5, 'ns0-n'), gate('service', 'Service gate', 64.5, 4.5, 'ns3-n')];
export const MAIN_GATE = GATES[0];

/** How far short of its gate each country road's turning loop's centre stands (the loop, its fence and an apron to
 * the barrier between) */
export const LOOP_SHORT = 16;
/** Where each gated country road ends (rural.ts `ruralSplit()`: its loop's centre a turn's radius, 6, on) */
export const GATE_ROAD_ENDS: Record<string, number> = Object.fromEntries(GATES.map((g) => [g.road, g.z + LOOP_SHORT + 6]));

/** The fence in straight runs (each edge of its line, but along the wall), broken at the gates */
export const FENCE_RUNS: [Pt, Pt][] = (() => {
  const out: [Pt, Pt][] = [];
  for (let i = 0; i < FENCE.length; i++) {
    const [a, b] = [FENCE[i], FENCE[(i + 1) % FENCE.length]];
    if (ALONG_WALL(a, b)) continue;
    // (a gate on this run of the south side: the run in two, either side of its opening)
    const g = i < SOUTH_RUNS ? GATES.find((q) => (q.x - a[0]) * (q.x - b[0]) < 0) : undefined;
    if (!g) {
      out.push([a, b]);
      continue;
    }
    const at = (x: number): Pt => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
    out.push([a, at(g.x - g.half)], [at(g.x + g.half), b]);
  }
  return out;
})();

/** A straight run as thin boxes: one along x or z; a slanting one in pieces barely wider than the fence */
export function runBoxes([a, b]: [Pt, Pt], h = FENCE_H, t = FENCE_T): Box[] {
  const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
  const n = Math.max(1, Math.ceil(Math.min(Math.abs(dx), Math.abs(dz)) / 0.3));
  const out: Box[] = [];
  for (let k = 0; k < n; k++) {
    const [p, q]: [Pt, Pt] = [
      [a[0] + (dx * k) / n, a[1] + (dz * k) / n],
      [a[0] + (dx * (k + 1)) / n, a[1] + (dz * (k + 1)) / n],
    ];
    out.push([Math.min(p[0], q[0]) - t / 2, Math.min(p[1], q[1]) - t / 2, Math.max(p[0], q[0]) + t / 2, Math.max(p[1], q[1]) + t / 2, h]);
  }
  return out;
}

/** Each gate's guardhouse, inside the fence on the east of its opening (x0, z0, x1, z1), and its height */
export const GUARDHOUSE_H = 3.1;
export const guardhouseOf = (g: Gate): Rect => [g.x + g.half + 1.2, g.z - 5.5, g.x + g.half + 5.2, g.z - 1.5];
/** Each gate's barrier arm (down, outside its shut gate), from its post on the west of the opening */
export const BARRIER_Y = 1.0;
export const barrierOf = (g: Gate): [Pt, Pt] => [
  [g.x - g.half - 0.6, g.z + 1.2],
  [g.x + g.half, g.z + 1.2],
];

/** The visitors' car park outside the main gate, west of the road (clear of the stadium's car park's loop, -251) */
export const VISITORS: Rect = [-90, -298, -20, -262];
/** Its drive from the north avenue's loop (x0, z0, x1, z1: across to the road's verge) */
export const VISITORS_DRIVE: Rect = [-20, -284, -6.2, -277];
/** The visitors' centre, along the car park's north edge (a place, coming soon), its roof a viewing terrace */
export const VISITOR_CENTRE: Rect = [-62, -298, -32, -286];
export const VISITOR_CENTRE_H = 4.4;
/** Where you stand in front of the visitors' centre (its door faces the car park, south) */
export const VISITOR_SPAWN = { x: -47, z: -283, yaw: 0 };

/** The parade avenue: north from the main gate in line with the road to z -700, then bending to the wall gate */
export const AVENUE_HALF = 5;
export const AVENUE: Pt[] = [
  [MAIN_GATE.x, MAIN_GATE.z],
  [MAIN_GATE.x, -700],
  [-14, -722],
  [(WALL_GATE[0] + WALL_GATE[2]) / 2, WALL_GATE[3]],
];

/** The lots kept for later phases (the plan's layout): nothing else is built on them */
export const KEPT: { id: string; phase: 2 | 3; rect: Rect }[] = [
  { id: 'airfield', phase: 2, rect: [-690, -640, -110, -420] },
  { id: 'fuel', phase: 2, rect: [-575, -490, -520, -450] },
  { id: 'parade', phase: 3, rect: [-80, -360, -12, -322] },
  { id: 'hq', phase: 3, rect: [-72, -392, -18, -368] },
  { id: 'barracks', phase: 3, rect: [-262, -388, -112, -324] },
  { id: 'services', phase: 3, rect: [10, -400, 50, -320] },
  { id: 'motorpool', phase: 3, rect: [80, -400, 165, -328] },
  { id: 'heliport', phase: 3, rect: [185, -440, 250, -350] },
  { id: 'range', phase: 3, rect: [-716, -420, -600, -340] },
];

/** What's solid from the boot: the fence, its shut gates, the guardhouses, the barriers' posts, the visitors' centre */
export const AIRBASE_SOLIDS: Box[] = [
  ...FENCE_RUNS.flatMap((r) => runBoxes(r)),
  // (each gate shut: a sliding gate of the same chain-link across its opening)
  ...GATES.flatMap((g) => runBoxes([[g.x - g.half, g.z], [g.x + g.half, g.z]])),
  ...GATES.map((g): Box => [...guardhouseOf(g), GUARDHOUSE_H]),
  ...GATES.map((g): Box => {
    const [p] = barrierOf(g);
    return [p[0] - 0.2, p[1] - 0.2, p[0] + 0.2, p[1] + 0.2, BARRIER_Y + 0.2];
  }),
  [...VISITOR_CENTRE, VISITOR_CENTRE_H],
];
