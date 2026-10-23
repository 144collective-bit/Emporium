/*
 * The Fight Club's site (docs/fight-plan.md, Phase 2): the boxing gym on
 * the south bank, east of the garage, fronting the south bank avenue. DOM-
 * free, in world tiles: fightclub.ts draws it, solids.ts takes its
 * footprints, fight.ts runs fights in its ring, walk.ts finds the trainer's
 * counter and the ropes, outer.ts keeps the lawns' trees off it.
 *
 * Layout (x east, z south; the avenue is north of the lot at z 92):
 *   - The lot `FIGHT_CLUB`: 14 x 12, paved. An open-sided shed (a flat
 *     roof on posts, the back and east walls closed) covers the ring; the
 *     yard in front of it (north) holds the trainer's counter, the bags
 *     and the lockers against the west wall.
 *   - The ring `RING`: a square canvas `RING_HALF` either side of its
 *     centre, at ground level (a low painted platform, walkable), corner
 *     posts (solid) and ropes between them (not solid: you step through).
 *     Fights happen inside `RING.r` (the sim's arena); crossing the ropes
 *     (`inRing()`) is what puts a walker in the ring.
 *   - `TRAINER`: where you stand at the counter (the "Trainer" prompt); the
 *     counter itself is `COUNTER`. `CORNERS`: where the two fighters start,
 *     facing each other across the ring; `OUT`: where Degen stands after
 *     leaving the ring. `FIGHT_SPAWN`: where Walk in from the panel starts.
 */
import { SOUTH_SHIFT as D } from './layout';

/* Written before the river was widened: every z here adds `D` (layout.ts SOUTH_SHIFT), so the gym kept its place on the bank */
export const FIGHT_CLUB = { x0: 95, z0: 85 + D, x1: 109, z1: 97 + D };
export const RING = { x: 102, z: 92.3 + D, r: 2.9 };
export const RING_HALF = 3.4;
/** The canvas's lift (a low platform; walkable, the ground's height for anything on it) */
export const RING_H = 0.12;
export const POST_R = 0.12;
export const ROPES = [0.45, 0.8, 1.15];
/** The ring's corner posts */
export const POSTS: [number, number][] = [
  [RING.x - RING_HALF, RING.z - RING_HALF],
  [RING.x + RING_HALF, RING.z - RING_HALF],
  [RING.x - RING_HALF, RING.z + RING_HALF],
  [RING.x + RING_HALF, RING.z + RING_HALF],
];
/** The shed over the ring: its roof's footprint and height, its posts */
export const SHED = { x0: 97.6, z0: 88 + D, x1: 106.4, z1: 96.8 + D, h: 3.6 };
/** The trainer's counter (a kiosk in the yard) and where you stand at it, facing it */
export const COUNTER = { x0: 96.2, z0: 86.2 + D, x1: 98.4, z1: 87.2 + D };
export const TRAINER = { x: 97.3, z: 87.75 + D, yaw: Math.PI };
/** The fighters' corners: you to the south-west, the opponent to the north-east, facing each other */
export const CORNERS: { x: number; z: number; yaw: number }[] = [
  { x: RING.x - 1.3, z: RING.z + 1.3, yaw: Math.atan2(2.6, -2.6) },
  { x: RING.x + 1.3, z: RING.z - 1.3, yaw: Math.atan2(-2.6, 2.6) },
];
/** Where Degen stands up after a fight: outside the ropes on the yard side, looking at the ring */
export const OUT = { x: RING.x - 1.2, z: RING.z - RING_HALF - 0.9, yaw: 0 };
/** Walk in from the panel: on the lot's front, facing the gym */
export const FIGHT_SPAWN = { x: 102, z: 85.6 + D, yaw: Math.PI };
/** The lockers along the west wall, the heavy bag and the speed bag in the yard, the bleachers on the east */
export const LOCKERS = { x0: 95.3, z0: 88.5 + D, x1: 96.1, z1: 95.5 + D };
export const BAGS = { heavy: { x: 100.2, z: 86.4 + D }, speed: { x: 103.2, z: 86.2 + D } };
export const BLEACHERS = { x0: 107.2, z0: 89 + D, x1: 108.8, z1: 96 + D };
/** The neon FIGHT CLUB sign on its gantry over the yard's front */
export const SIGN = { x: 102, z: 85.6 + D, h: 3.8, w: 6 };

/** Inside the ropes */
export const inRing = (x: number, z: number) => Math.abs(x - RING.x) < RING_HALF - 0.1 && Math.abs(z - RING.z) < RING_HALF - 0.1;
