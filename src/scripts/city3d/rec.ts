/*
 * Aldwyn's Green Rec (docs/south-plan.md Phase 3, step 3e; the owner's calls, 2026-11-18): the rec ground on the brook's
 * south bank (south.ts `REC`), a place (endsplaces.ts `rec`): a football pitch, the pavilion at its east end (its veranda
 * facing the pitch), the skate park past it, a playground and benches at the west end and along the path, and a
 * footbridge over the brook from Brookside's sidewalk to its gate. DOM-free, tested in tests/rec.test.ts; drawn by
 * village3d.ts (`drawRec()`).
 */
import { BROOK, BROOKSIDE, REC, type Pt } from './south';
import { distTo, inside } from './streetfaces';
import { southLift } from './southground';
import type { Box } from './southblocks';

type Rect = [number, number, number, number];
const SLAB = 0.15;
const corners = (r: Rect): Pt[] => [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];

/** The pitch (its touchlines), its goals (their mouths' middles, their width and height) */
export const PITCH: Rect = [-267, 549, -235, 567];
export const GOALS: { at: Pt; w: number; h: number }[] = [
  { at: [PITCH[0], (PITCH[1] + PITCH[3]) / 2], w: 4, h: 1.2 },
  { at: [PITCH[2], (PITCH[1] + PITCH[3]) / 2], w: 4, h: 1.2 },
];
/** The pavilion: single storey, a pitched roof, its veranda on its west side facing the pitch */
export const PAVILION: Rect = [-228.5, 549.5, -219, 555.5];
export const VERANDA: Rect = [-230.6, 549.5, -228.5, 555.5];
export const PAVILION_H = { eaves: 2.3, ridge: 1.1 };
/** The skate park past the pavilion: its bowl, a quarter pipe, a funbox, a rail */
export const SKATE: Rect = [-213.5, 551, -202.5, 564];
export const BOWL: Rect = [-212, 556.5, -206, 562.5];
export const QUARTER: Rect = [-212.5, 551.8, -204, 553.4];
export const FUNBOX: Rect = [-205, 555.2, -203.3, 559.8];
export const RAIL: [Pt, Pt] = [[-211, 554.6], [-206.5, 554.6]];
/** The playground at the west end: swings, a slide, the bark under them */
export const PLAYGROUND: Rect = [-280, 550, -271.5, 558];
export const SWINGS: Rect = [-279, 551, -275.5, 553.2];
export const SLIDE: Rect = [-275, 554.5, -272.2, 556.3];

/** The gate in the rec's north edge, the footbridge over the brook to it from Brookside's sidewalk, the path on to the
 * pavilion */
export const GATE: Pt = [-240, 545.9];
const SIDEWALK_Z = (() => {
  const near = BROOKSIDE.pts.reduce((b, p) => (Math.abs(p[0] - GATE[0]) < Math.abs(b[0] - GATE[0]) ? p : b));
  return near[1] + BROOKSIDE.half + 0.6;
})();
export const FOOTPATH: Pt[] = [[GATE[0], SIDEWALK_Z], [GATE[0], GATE[1] + 0.6]];
export const PATH_W = 1.4;
/** The footbridge's deck: over the brook's valley, from bank to bank (its ends on the ground there), a gentle hump */
export const BRIDGE = (() => {
  const brookZ = BROOK.reduce((b, p) => (Math.abs(p[0] - GATE[0]) < Math.abs(b[0] - GATE[0]) ? p : b))[1];
  const [z0, z1] = [brookZ - 4, brookZ + 4];
  return { x: GATE[0], z0, z1, half: 0.85, y0: SLAB + southLift(GATE[0], z0), y1: SLAB + southLift(GATE[0], z1), hump: 0.35 };
})();
/** The deck's level at a point on it (null off it) */
export function recBridgeY(x: number, z: number): number | null {
  const b = BRIDGE;
  if (Math.abs(x - b.x) > b.half || z < b.z0 || z > b.z1) return null;
  const t = (z - b.z0) / (b.z1 - b.z0);
  return b.y0 + (b.y1 - b.y0) * t + b.hump * Math.sin(Math.PI * t) + 0.08;
}
export const REC_PATH: Pt[] = [[GATE[0], GATE[1] + 0.6], [-236, 548], [-232, 549.5], [VERANDA[0] - 0.3, (VERANDA[1] + VERANDA[3]) / 2]];
/** Benches along the path and by the playground: each its middle and the way it faces (yaw: 0 north) */
export const BENCHES: { at: Pt; yaw: number }[] = [
  { at: [-237, 550], yaw: Math.PI },
  { at: [-269.5, 549.8], yaw: Math.PI },
  { at: [-245, 569.5], yaw: 0 },
  { at: [-257, 569.5], yaw: 0 },
];

/** The pavilion's door (on its veranda) and where you stand at it; where you arrive (inside the gate, facing in) */
export const PAVILION_DOOR: Pt = [VERANDA[0] + 0.5, (VERANDA[1] + VERANDA[3]) / 2];
export const REC_SPAWN = (() => {
  const [x, z] = [GATE[0], GATE[1] + 1.4];
  // (looking towards the pavilion's door: yaw 0 looks north, -z)
  const [dx, dz] = [PAVILION_DOOR[0] - x, PAVILION_DOOR[1] - z];
  return { x, z, yaw: Math.atan2(-dx, -dz) };
})();

/** The ground's height under the rec's things (it's level there: the valley eases out by its north edge) */
export const REC_BASE = SLAB + Math.max(...[...corners(PAVILION), ...corners(SKATE)].map(([x, z]) => southLift(x, z)));

/* ---------- Solids (on the ground: lifted with it, solids.ts) ---------- */

const box = (r: Rect, h: number): Box => [r[0], r[1], r[2], r[3], h];
export const REC_SOLIDS: Box[] = [
  box([...PAVILION.slice(0, 2), ...PAVILION.slice(2)] as Rect, PAVILION_H.eaves + PAVILION_H.ridge),
  ...GOALS.flatMap(({ at, w, h }): Box[] => [-1, 1].map((s): Box => [at[0] - 0.08, at[1] + (s * w) / 2 - 0.08, at[0] + 0.08, at[1] + (s * w) / 2 + 0.08, h])),
  box(QUARTER, 1.1),
  box(FUNBOX, 0.5),
  [SWINGS[0], SWINGS[1], SWINGS[0] + 0.15, SWINGS[3], 1.6],
  [SWINGS[2] - 0.15, SWINGS[1], SWINGS[2], SWINGS[3], 1.6],
  box(SLIDE, 1.3),
  ...BENCHES.map(({ at }): Box => [at[0] - 0.7, at[1] - 0.25, at[0] + 0.7, at[1] + 0.25, 0.5]),
];
/** Everything the rec's checks and drawing need to know is inside it */
export const insideRec = (p: Pt) => inside(REC, p);
export const offBrook = (p: Pt) => distTo(BROOK, p) > 2;
/** Where the rec stands, its footbridge and path in (the village's chunk covers it) */
export const REC_RECT: Rect = (() => {
  const pts = [...REC, ...FOOTPATH];
  return [Math.min(...pts.map((p) => p[0])) - 3, Math.min(...pts.map((p) => p[1])) - 3, Math.max(...pts.map((p) => p[0])) + 3, Math.max(...pts.map((p) => p[1])) + 3];
})();
