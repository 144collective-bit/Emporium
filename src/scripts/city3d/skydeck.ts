/*
 * Sector 7 Tower and its sky deck (docs/finance-plan.md Phase 6, the owner's
 * picks; DOM-free, tested in tests/skydeck.test.ts): Uptown's spire becomes a
 * place, its roof an open deck behind a glass rail, reached by a lift from the
 * glass pavilion at its foot.
 *
 * - **The deck** (`DECK`): the top tier's roof (`y`, over the slab), its
 *   outline an octagon (highrise.ts's `OCT_CUT`), walkable inside the rail
 *   (`RAIL_IN` from the edge); `skyDeckY()` is its floor when you're up
 *   there, `skyDeckWall()` the rail, the lift house and the viewers (you
 *   can't step or fall off).
 * - **The lift house** (`CORE`): a glass box in the deck's middle, its door
 *   on the side the tower fronts (west, to the plaza), the mast rising from
 *   its roof; the crown's steel ribs lean in over the deck to the mast
 *   (`RIBS`, well over a walker's head).
 * - **The viewers** (`VIEWERS`): four free telescopes, one at the middle of
 *   each straight side, looking out over the city, the park and the river.
 * - **The lift** (`LIFT`): a door in the pavilion (`lobby`) and one at the
 *   lift house (`deck`), each with where you step out at the other end
 *   (`up`, `down`); walk mode's prompt at each, a fade between.
 * - `TOWER_SPAWN` (Walk in: on the plaza in front of the pavilion, facing
 *   it), `SKYDECK_SOLIDS` (in `SOLIDS`: the lift house, for the camera and
 *   bullets up there).
 */
import { HIGHRISES, OCT_CUT, TALLEST } from './highrise';
import type { Pt, Rect } from './uptown';

/** The place's name (fixed, made up) */
export const TOWER_NAME = 'SECTOR 7 TOWER';
/** The spire, and the tier the deck is the roof of */
export const SPIRE = HIGHRISES.find((t) => t.design === 'spire')!;
const TOP = SPIRE.parts.at(-1)!;

/** The deck: its floor over the slab, its outline's bounds, half its side and its corners' cut */
export const DECK = (() => {
  const rect = TOP.rect as Rect;
  const half = (rect[2] - rect[0]) / 2;
  return {
    y: TALLEST.roof + 0.06,
    rect,
    x: (rect[0] + rect[2]) / 2,
    z: (rect[1] + rect[3]) / 2,
    half,
    cut: (rect[2] - rect[0]) * OCT_CUT,
    /** The glass rail over the parapet, how high over the floor */
    rail: 0.8,
  };
})();
/** How far in from the deck's edge you can walk (the parapet and the rail's posts) */
export const RAIL_IN = 0.3;

/** Inside the octagon, `d` in from its edge */
export function inOctagon(x: number, z: number, d = 0): boolean {
  const dx = Math.abs(x - DECK.x);
  const dz = Math.abs(z - DECK.z);
  const h = DECK.half - d;
  return dx <= h && dz <= h && dx + dz <= 2 * DECK.half - DECK.cut - d * Math.SQRT2;
}

/** The lift house in the middle of the deck (half its side, its height over the floor), its door on the west */
export const CORE = { half: 0.9, h: 2.7 };
export const CORE_RECT: Rect = [DECK.x - CORE.half, DECK.z - CORE.half, DECK.x + CORE.half, DECK.z + CORE.half];
/** The crown's ribs: from the rail's top at each of the octagon's corners, leaning in to the mast this high over the floor */
export const RIBS = { top: 4.1, r: 0.3 };

/** The viewers (x, z, the way they look: walk.ts's yaw), a free telescope at the middle of each straight side */
export const VIEWER_R = 0.24;
export const VIEWERS: [number, number, number][] = (() => {
  const o = DECK.half - RAIL_IN - 0.42;
  return [
    [DECK.x, DECK.z + o, Math.PI],
    [DECK.x, DECK.z - o, 0],
    [DECK.x + o, DECK.z, -Math.PI / 2],
    [DECK.x - o, DECK.z, Math.PI / 2],
  ];
})();

/** How far below the floor you can be and still step up onto it (you only ever arrive by the lift) */
const STEP = 0.6;
/** The deck's floor (over the slab) when you're up there and on it, else null */
export function skyDeckY(x: number, z: number, y: number, m = 0): number | null {
  if (y < DECK.y - STEP || !inOctagon(x, z, m)) return null;
  return DECK.y;
}
/** Up on the deck: is this spot (a walker `m` round) off it, in the lift house or in a viewer */
export function skyDeckWall(x: number, z: number, m = 0): boolean {
  if (!inOctagon(x, z, RAIL_IN + m)) return true;
  if (x > CORE_RECT[0] - m && x < CORE_RECT[2] + m && z > CORE_RECT[1] - m && z < CORE_RECT[3] + m) return true;
  return VIEWERS.some(([vx, vz]) => Math.hypot(x - vx, z - vz) < VIEWER_R + m);
}
/** Up there at all (over the tower's top tier, high enough) */
export const upOnDeck = (x: number, z: number, y: number) => y > DECK.y - STEP && inOctagon(x, z, -0.6);

/* ---------- The lift ---------- */

/** The pavilion at the spire's foot: how far out from its face (x), and the lift's door inside it */
const FACE_X = SPIRE.parts[0].rect[0];
export const LIFT = {
  /**
   * The pavilion's lift door, and where the lift lets you out on the deck: facing north along it, so the camera has
   * the deck behind you, not the lift house (walk.ts's yaw 0 looks north)
   */
  lobby: { x: FACE_X - 1.0, z: DECK.z },
  up: { x: CORE_RECT[0] - 0.75, z: DECK.z, y: DECK.y, yaw: 0 },
  /** The lift house's door on the deck, and where it lets you out in the pavilion (facing out to the plaza, the tower's face behind) */
  deck: { x: CORE_RECT[0] - 0.4, z: DECK.z },
  down: { x: FACE_X - 1.8, z: DECK.z, y: 0, yaw: Math.PI / 2 },
};
/** How near a lift door you have to stand for its prompt */
export const LIFT_R = 0.9;

/** Walk in (and fast travel): on the plaza in front of the pavilion, facing it (east) */
export const TOWER_SPAWN = { x: FACE_X - 4.6, z: DECK.z, yaw: -Math.PI / 2 };

/** The spire's door spot is the pavilion's (index.ts's prompt): the middle of its front */
export const PAVILION: Pt = [FACE_X - 2.4, DECK.z];

type Box = [number, number, number, number, number];
/** The lift house, to its roof (the spire's own solids stop at the deck's floor) */
export const SKYDECK_SOLIDS: Box[] = [[...CORE_RECT, SPIRE.roof + CORE.h + 0.1] as Box];
