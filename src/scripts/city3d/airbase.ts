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

/** The base's name on a low wall outside the main gate, east of the road past its fence, facing the way in (x0, z0,
 * x1, z1), and its height */
export const SIGN_WALL: Rect = [MAIN_GATE.x + MAIN_GATE.half + 2, MAIN_GATE.z + 4.6, MAIN_GATE.x + MAIN_GATE.half + 12, MAIN_GATE.z + 5.1];
export const SIGN_WALL_H = 1.5;

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
  [...SIGN_WALL, SIGN_WALL_H],
];

/** The nearest a point is to a run */
function toRun(x: number, z: number, [a, b]: [Pt, Pt]) {
  const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
}
const inR = (r: Rect, x: number, z: number, m: number) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
/** How far trees keep from the fence (its belt either side), and from the parade avenue's middle */
export const FENCE_CLEAR = 4;
export const AVENUE_CLEAR = AVENUE_HALF + 4;
/**
 * The base's land kept clear of trees (landuse.ts `KEEPS`), `m` further: the fence's line, the gates, the visitors'
 * area and its drive, the avenue and the lots kept for later. The rest of it keeps its woods (the plan's: round the
 * shelters, along the avenue, the north-east), today's open ground as it is till its phase builds on it
 */
export function airbaseKeep(x: number, z: number, m = 0): boolean {
  if (FENCE_RUNS.some((r) => toRun(x, z, r) < FENCE_CLEAR + m)) return true;
  if (GATES.some((g) => Math.abs(x - g.x) < g.half + 8 + m && z > g.z - 10 - m && z < g.z + 4 + m)) return true;
  for (let i = 1; i < AVENUE.length; i++) if (toRun(x, z, [AVENUE[i - 1], AVENUE[i]]) < AVENUE_CLEAR + m) return true;
  // (the airfield's road in from the avenue, and the approach lights past the runway's east end, outside its lot)
  if (APRON_ROAD.length && Math.abs(z - APRON_ROAD[0][1]) < 3.5 + 3 + m && x > APRON_ROAD[1][0] - m && x < APRON_ROAD[0][0] + m) return true;
  if (Math.abs(z - RUNWAY.z) < 4 + m && x > APPROACH[1][0] - 2 - m && x < APPROACH[1][1] + 2 + m) return true;
  return [VISITORS, VISITORS_DRIVE, WALL_GATE, ...KEPT.map((k) => k.rect)].some((r) => inR(r, x, z, 2 + m));
}

/** How far x, z is from the fence's line (any run of it) */
export const fromFence = (x: number, z: number) => Math.min(...FENCE_RUNS.map((r) => toRun(x, z, r)));

/** The lamps' spacing along the south fence (inside it, reaching to it: the side the town sees), and their foot (on the
 * open ground, as the country roads' are) */
export const FENCE_LAMP_GAP = 90;
const LAMP_Y = 0.02;
/**
 * The base's lamps (x, z, ry, y; world.ts `addLamp()`: ry 0 reaches east, a half turn up north): along the inside of
 * the south fence, every `FENCE_LAMP_GAP` and clear of the gates; one outside each gate, by its barrier's post, over
 * the way in; and round the visitors' car park
 */
export const AIRBASE_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  for (let x = FENCE[0][0] + FENCE_LAMP_GAP / 2; x < FENCE[SOUTH_RUNS][0]; x += FENCE_LAMP_GAP) {
    if (GATES.some((g) => Math.abs(x - g.x) < 20)) continue;
    out.push([x, southFenceZ(x) - 2.5, -Math.PI / 2, LAMP_Y]);
  }
  for (const g of GATES) out.push([g.x - g.half - 2.2, g.z + 3, 0, LAMP_Y]);
  for (const x of [VISITORS[0] + 8, (VISITORS[0] + VISITORS[2]) / 2, VISITORS[2] - 8]) out.push([x, VISITORS[3] - 2, Math.PI / 2, LAMP_Y]);
  return out;
})();

/* ---------- The airfield (docs/military-plan.md Phase 2): the plan's signed-off layout ---------- */

/** The runway: west to east at z, its half width; the approach lights out past each end */
export const RUNWAY = { x0: -620, x1: -120, z: -540, half: 6 };
export const APPROACH: [number, number][] = [
  [-680, RUNWAY.x0 - 3],
  [RUNWAY.x1 + 3, -60],
];
/** The parallel taxiway south of the runway, its connectors to it (x), and the north taxiway with its links */
export const TAXIWAY = { x0: -610, x1: -130, z: -516, half: 3.5 };
export const CONNECTORS = [-600, -480, -370, -250, -140];
export const NORTH_TAXI = { x0: -580, x1: -140, z: -578, half: 3 };
export const NORTH_LINKS = [-580, -360, -140];
/** The nine hardened shelters in threes on stubs north of the north taxiway (their middles; each 16 wide, 20 deep) */
export const SHELTER = { w: 16, d: 20, h: 6.5 };
export const SHELTERS: Pt[] = [-560, -520, -480, -380, -340, -300, -220, -180, -140].map((x, i) => [x, i % 2 ? -612 : -606] as Pt);
/** The main apron, the three hangars along its south side (each 40 by 26), the control tower, the fire station, the fuel farm */
export const APRON: Rect = [-470, -508, -200, -462];
export const HANGARS: Rect[] = [
  [-460, -458, -420, -432],
  [-400, -458, -360, -432],
  [-340, -458, -300, -432],
];
export const HANGAR_H = 11;
export const TOWER: Pt = [-262, -452];
/** The tower's cab's top (under the Emporium's roof, 12.5) */
export const TOWER_TOP = 11.6;
export const FIRE_STATION: Rect = [-238, -462, -214, -446];
export const FUEL_FARM: Rect = [-575, -490, -520, -450];
/** Where the apron's road from the avenue comes in (from the parade avenue along z, to the apron's east side) */
export const APRON_ROAD: Pt[] = [
  [MAIN_GATE.x - AVENUE_HALF, -470],
  [APRON[2], -470],
];
/** The airfield's chunk's land (districts.ts `airbase-field`: airbasefield3d.ts draws it in strips across it) */
export const AIRFIELD_RECT: Rect = [-700, -640, 0, -440];


/** The fire station's height, the fuel farm's tanks (x, z middles, radius, height) and its bund wall's height */
export const FIRE_H = 5.2;
export const FUEL_TANKS: [number, number, number, number][] = [
  [-562, -478, 4.6, 6],
  [-547, -478, 4.6, 6],
  [-562, -462, 4.6, 6],
  [-547, -462, 4.6, 6],
  [-530, -470, 3.2, 4.4],
];
export const BUND_H = 1.1;
/** Which hangar stands open, a transport inside (Phase 2's parked aircraft) */
export const OPEN_HANGAR = 1;
/** The tower's footprint (its base building) and its shaft's (x0, z0, x1, z1) */
export const TOWER_BASE: Rect = [TOWER[0] - 6, TOWER[1] - 4, TOWER[0] + 6, TOWER[1] + 4];
export const TOWER_SHAFT: Rect = [TOWER[0] - 1.8, TOWER[1] - 1.8, TOWER[0] + 1.8, TOWER[1] + 1.8];

/** The airfield's buildings' solids (in `AIRBASE_SOLIDS`): for flying, the camera and anything that reaches them */
export const AIRFIELD_SOLIDS: Box[] = [
  ...HANGARS.map((h): Box => [...h, HANGAR_H]),
  [...TOWER_BASE, 3.6],
  [...TOWER_SHAFT, TOWER_TOP],
  [...FIRE_STATION, FIRE_H],
  ...FUEL_TANKS.map(([x, z, r, h]): Box => [x - r, z - r, x + r, z + r, h]),
  ...SHELTERS.map(([x, z]): Box => [x - SHELTER.w / 2, z - SHELTER.d, x + SHELTER.w / 2, z, SHELTER.h]),
];

/**
 * What's parked on the airfield (Phase 2): made-up, unarmed aircraft in the base's greys (the airport's models, its
 * titles left off), each [x, z, yaw] (yaw π/2: the nose north, to the taxiway); a transport in the open hangar
 */
export const PARKED: { kind: 'freighter' | 'prop' | 'heli'; livery: string; at: [number, number, number] }[] = [
  { kind: 'freighter', livery: '#6f7a8c', at: [(HANGARS[OPEN_HANGAR][0] + HANGARS[OPEN_HANGAR][2]) / 2, -444, Math.PI / 2] },
  { kind: 'freighter', livery: '#5d6b52', at: [-290, -488, Math.PI / 2] },
  { kind: 'freighter', livery: '#6f7a8c', at: [-250, -488, Math.PI / 2] },
  ...[-462, -448, -434, -420].map((x) => ({ kind: 'prop' as const, livery: '#8a93a3', at: [x, -496, Math.PI / 2] as [number, number, number] })),
  { kind: 'heli', livery: '#5d6b52', at: [-340, -496, Math.PI / 2] },
  { kind: 'heli', livery: '#6f7a8c', at: [-318, -496, Math.PI / 2] },
];
/** The apron's vehicles: a tug and a fuel bowser (x, z, yaw), and the windsock between the runway and the taxiway */
export const APRON_VEHICLES: { kind: 'tug' | 'bowser'; at: [number, number, number] }[] = [
  { kind: 'tug', at: [-274, -480, 0] },
  { kind: 'bowser', at: [-392, -482, Math.PI / 2] },
];
export const WINDSOCK: Pt = [-420, -526];
