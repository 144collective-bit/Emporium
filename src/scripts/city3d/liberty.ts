/*
 * Liberty Bridge as data (DOM-free like layout.ts, so the scene, walking,
 * collisions, the tests and the game server read one layout): a
 * one-of-a-kind stone footbridge, built up and over the water, just west of
 * the West 3 and South 1 plots (layout.ts `FOOTBRIDGE_X`).
 *
 * - A gate tower on each bank's lawn, in the old style: a ground storey with
 *   an arch through it (walk through underneath), an upper storey, a
 *   crenellated parapet, four domed corner turrets, and the Liberty flame
 *   spiralling up from the roof.
 * - Stairs up both sides of each tower, climbing towards the river to a
 *   landing in front of its river face, as high as the walkway.
 * - The walkway between the landings, raised on stone arches high over the
 *   north bank avenue, the river and the south bank avenue: pairs of
 *   pillars on the lawns and the promenades (walk between them), two piers
 *   in the water, boats passing under the arches.
 *
 * Walking reads `footbridgeY()` (the stairs, landings and walkway as ground)
 * and `footbridgeWall()` (its parapets, up there); `LIBERTY_SOLIDS` is what
 * stands on the ground. libertybridge.ts draws it.
 *
 * x east, z south, y up; world tiles (1 = about 1.8 m).
 */
import { BLOCKS, BS, EW_ROADS, FOOTBRIDGE_X, RIVER, RIVER_W, RING_HI, SOUTH_ROAD, SOUTH_ROW, WALK_W } from './layout';
import type { Box } from './solids';

export type Rect = [number, number, number, number];

/** The bridge's centre line (x) */
export const BX = FOOTBRIDGE_X;
/** The towers (z), level with the middle of West 3 and of South 1 */
export const TOWERS: [number, number] = [BLOCKS[2] + BS / 2, SOUTH_ROW + BS / 2];
/** Which way the river is from each tower (+1: south) */
export const TO_RIVER: [1, -1] = [1, -1];

/** A gate tower: half its size, the arch through its ground storey, its storeys, parapet, turrets and the flame on top */
export const TOWER = {
  hx: 2.4,
  hz: 2.0,
  arch: { half: 1.2, spring: 2.0 },
  /** The ground storey's top (the walkway's level) and the roof's */
  storey: 3.6,
  roof: 7.35,
  parapet: 0.6,
  turret: { s: 1.0, top: 8.7, dome: 1.05 },
  /** The flame's foot (on its drum) and height: its tip stays under the Emporium's roof (~12.5) */
  flame: { base: 7.95, h: 3.5 },
};

/** The walkway: its level, the underside of its slab, its outer half width and the walk between the parapets */
export const DECK_Y = TOWER.storey;
export const DECK_UNDER = 3.15;
export const DECK_HALF = 1.3;
export const WALK_HALF = 1.1;
export const PARAPET_H = 0.9;
/** The stairs beside each tower: full width (with its outer wall), the treads' width, how far past the tower's back they start */
export const STAIR = { w: 1.4, tread: 1.2, back: 0.6, steps: 15 };
/** The landing in front of each tower's river face: how deep */
export const LANDING = 1.8;

const north = EW_ROADS.find((r) => r.c === RING_HI)!;
const south = EW_ROADS.find((r) => r.c === SOUTH_ROAD)!;

/** Tower i's stairs: from the ground (`z0`) up to the walkway's level (`z1`, at the tower's river face) */
export const stairsOf = (i: 0 | 1) => {
  const s = TO_RIVER[i];
  return { z0: TOWERS[i] - s * (TOWER.hz + STAIR.back), z1: TOWERS[i] + s * TOWER.hz };
};
/** Tower i's landing: from its river face to where the walkway leaves it */
export const landingOf = (i: 0 | 1) => {
  const s = TO_RIVER[i];
  return { z0: TOWERS[i] + s * TOWER.hz, z1: TOWERS[i] + s * (TOWER.hz + LANDING) };
};
/** The walkway proper, landing to landing */
export const WALKWAY: [number, number] = [landingOf(0).z1, landingOf(1).z1];

/**
 * What holds the walkway up: pairs of pillars where it leaves each landing,
 * on the north lawn and on both promenades (walk between them), and two
 * piers in the river. `y` is where the arches spring from.
 */
export interface Support {
  z: number;
  kind: 'pillars' | 'pier';
  y: number;
}
export const SUPPORTS: Support[] = [
  { z: WALKWAY[0] - 0.3, kind: 'pillars', y: 2.2 },
  { z: north.c - north.half - WALK_W - 0.6, kind: 'pillars', y: 2.2 },
  { z: (north.c + north.half + RIVER[0]) / 2, kind: 'pillars', y: 2.2 },
  { z: RIVER[0] + RIVER_W / 3, kind: 'pier', y: 1.3 },
  { z: RIVER[1] - RIVER_W / 3, kind: 'pier', y: 1.3 },
  { z: (RIVER[1] + south.c - south.half) / 2, kind: 'pillars', y: 2.2 },
  { z: WALKWAY[1] + 0.3, kind: 'pillars', y: 2.2 },
];
/** The pillars: either side of the centre line, this far out, this big (half) */
export const PILLAR = { x: 0.95, half: 0.25 };
/** A river pier's half depth (z) */
export const PIER_HALF = 0.5;
/** The arches between the supports: where each springs (z, y) and the crown just under the walkway's slab */
export const ARCH_CROWN = DECK_UNDER - 0.3;
export const SPANS = SUPPORTS.slice(1).map((b, i) => ({ a: SUPPORTS[i], b }));
/** The underside of the arch over z (between its supports), or null off the spans */
export function archY(z: number) {
  for (const { a, b } of SPANS) {
    if (z < a.z || z > b.z) continue;
    const f = (z - a.z) / (b.z - a.z);
    const chord = a.y + (b.y - a.y) * f;
    // A round-topped arch: steep at the springing, flat at the crown
    return chord + (ARCH_CROWN - (a.y + b.y) / 2) * Math.sqrt(Math.max(0, Math.sin(Math.PI * f)));
  }
  return null;
}
/** Where boats pass: down the middle of the three arches over the water */
export const BOAT_LANES: number[] = (() => {
  const piers = SUPPORTS.filter((s) => s.kind === 'pier').map((s) => s.z);
  const edges = [RIVER[0], ...piers.flatMap((z) => [z - PIER_HALF, z + PIER_HALF]), RIVER[1]];
  return [0, 2, 4].map((k) => (edges[k] + edges[k + 1]) / 2);
})();

/* ---------- Walking on it ---------- */

/** How high a step up walking takes onto the stairs (and how far under the walkway you stay on the ground) */
const STEP = 0.75;
/**
 * The bridge's ground under a point at height `y`: on the stairs, a landing
 * or the walkway (null when not on it, or well below it: walking under the
 * walkway or a landing stays on the ground). `m` keeps that far in from its
 * walls and the tower (walking passes Degen's radius, so he never leans into
 * a parapet).
 */
export function footbridgeY(x: number, z: number, y: number, m = 0): number | null {
  const ax = Math.abs(x - BX);
  for (const i of [0, 1] as const) {
    // The stairs, alongside the tower: rising evenly towards the river
    const st = stairsOf(i);
    if (z >= Math.min(st.z0, st.z1) && z <= Math.max(st.z0, st.z1) && ax >= TOWER.hx + m && ax <= TOWER.hx + STAIR.tread - m) {
      const h = (DECK_Y * (z - st.z0)) / (st.z1 - st.z0);
      return y >= h - STEP ? Math.max(0, h) : null;
    }
    // The landing, the whole width of the tower and its stairs (clear of the tower's face)
    const la = landingOf(i);
    const off = (z - la.z0) * TO_RIVER[i];
    if (off >= 0 && off <= LANDING && ax <= TOWER.hx + STAIR.tread - m && (off >= m || ax >= TOWER.hx + m)) return y >= DECK_Y - STEP ? DECK_Y : null;
  }
  if (z >= WALKWAY[0] && z <= WALKWAY[1] && ax <= WALK_HALF - m) return y >= DECK_Y - STEP ? DECK_Y : null;
  return null;
}
/** Everything the bridge covers, from above: the towers with their stairs and landings, and the walkway */
export const LIBERTY_RECTS: Rect[] = [
  ...([0, 1] as const).map((i): Rect => {
    const st = stairsOf(i);
    const la = landingOf(i);
    const zs = [st.z0, st.z1, la.z0, la.z1, TOWERS[i] - TOWER.hz, TOWERS[i] + TOWER.hz];
    return [BX - TOWER.hx - STAIR.w, Math.min(...zs), BX + TOWER.hx + STAIR.w, Math.max(...zs)];
  }),
  [BX - DECK_HALF, WALKWAY[0], BX + DECK_HALF, WALKWAY[1]],
];
const inRects = (x: number, z: number, m: number) => LIBERTY_RECTS.some((r) => x >= r[0] - m && x <= r[2] + m && z >= r[1] - m && z <= r[3] + m);
/** Up on the bridge, off its walking surface (or `m` short of its edge): a parapet, a stair wall or the tower (you can't step or fall off) */
export const footbridgeWall = (x: number, z: number, y: number, m = 0) => y > 1.2 && inRects(x, z, m + 0.05) && footbridgeY(x, z, y, m) === null;

/** Walk in from the panel: at the foot of the north tower's east stairs, looking up them (walk.ts: yaw 0 faces -z) */
export const LIBERTY_SPAWN = { x: BX + TOWER.hx + STAIR.tread / 2, z: stairsOf(0).z0 - 1.4, yaw: Math.PI };

/** People strolling on the walkway (life.ts walks them up one side of this line and back down the other, at `DECK_Y`) */
export const DECK_STROLLS: [number, number][][] = [
  [
    [BX - 0.01, WALKWAY[0] + 0.8],
    [BX - 0.01, WALKWAY[1] - 0.8],
    [BX + 0.01, WALKWAY[1] - 0.8],
    [BX + 0.01, WALKWAY[0] + 0.8],
  ],
];

/**
 * What stands on the ground: the towers' ground storeys either side of the
 * arch (walk through it), the stairs, the landings' corner posts, the
 * pillars and the piers. Heights are for the camera.
 */
export const LIBERTY_SOLIDS: Box[] = [
  ...TOWERS.flatMap((z) =>
    [-1, 1].map((s): Box => {
      const [a, b] = [BX + s * TOWER.arch.half, BX + s * TOWER.hx];
      return [Math.min(a, b), z - TOWER.hz, Math.max(a, b), z + TOWER.hz, TOWER.roof];
    })
  ),
  ...([0, 1] as const).flatMap((i) => {
    const st = stairsOf(i);
    const la = landingOf(i);
    return [-1, 1].flatMap((s): Box[] => {
      const [a, b] = [BX + s * TOWER.hx, BX + s * (TOWER.hx + STAIR.w)];
      const post = BX + s * (TOWER.hx + STAIR.w - 0.25);
      const pz = la.z1 - TO_RIVER[i] * 0.25;
      // (The stairs' first steps aren't solid, so walking can reach them: from there you're on the stairs)
      const foot = st.z0 + TO_RIVER[i] * 0.45;
      return [
        [Math.min(a, b), Math.min(foot, st.z1), Math.max(a, b), Math.max(foot, st.z1), DECK_Y + PARAPET_H],
        [post - 0.25, pz - 0.25, post + 0.25, pz + 0.25, DECK_Y],
      ];
    });
  }),
  ...SUPPORTS.flatMap((p): Box[] =>
    p.kind === 'pier'
      ? [[BX - DECK_HALF, p.z - PIER_HALF, BX + DECK_HALF, p.z + PIER_HALF, p.y]]
      : [-1, 1].map((s): Box => [BX + s * PILLAR.x - PILLAR.half, p.z - PILLAR.half, BX + s * PILLAR.x + PILLAR.half, p.z + PILLAR.half, p.y])
  ),
];
