/*
 * The city's collision boxes, shared by walk mode (and its camera) and the
 * multiplayer game server (shots and movement checks). Keep this file free of
 * the DOM and of scene code so the server can bundle it.
 *
 * They mirror landmarks.ts: when a landmark moves or changes size, update here.
 * Like the landmarks they're written on the landmarks' drawing grid and moved
 * onto today's streets with `designBox()` (layout.ts).
 */
import { DUMMIES } from './combat-sim';
import { GARAGE, design, designBox } from './layout';

/** x0, z0, x1, z1, height */
export type Box = [number, number, number, number, number];

/** Training dummies: Degen walks round them */
export const DUMMY_SOLIDS = DUMMIES.map(([x, z]): Box => [x - 0.3, z - 0.3, x + 0.3, z + 0.3, 1.3]);

/** Everything you can't walk through, matching landmarks.ts (on its drawing grid). Height is for the camera. */
const DRAWN: Box[] = [
  // Emporium arcade: the podium with its street corner cut off (in steps); the tower stands on it
  [11.8, 11.8, 18.0, 16.0, 2.6],
  [11.8, 16.0, 16.0, 18.0, 2.6],
  ...[0, 1, 2, 3].map((k): Box => [16.0 + k * 0.5, 16.0, 16.5 + k * 0.5, 34 - (16.25 + k * 0.5), 2.6]),
  [15.75, 18.35, 16.4, 19.05, 1.4], // claw machines either side of the doors
  [18.35, 15.75, 19.05, 16.4, 1.4],
  [18.4, 14.15, 19.35, 15.25, 1.6], // prize booth
  [0.8, 11.9, 7.8, 17.05, 5.6], // vault body and rear steps
  [1.2, 17.1, 7.4, 17.75, 4.4], // vault columns
  [7.6, 13.3, 8.0, 15.3, 2.4], // vault door
  [22.7, 12.3, 29.5, 16.85, 5.6], // Drop 001 shop
  [24.25, 18.15, 24.95, 18.45, 1], // its sidewalk sign
  [23.5, 11.16, 25.7, 12.14, 0.9], // the two cars parked behind it
  [26.1, 11.16, 28.3, 12.14, 0.9],
  [11.8, 22.8, 18.8, 27.6, 3.7], // workshop
  [12.3, 28.5, 18.1, 29.4, 1], // tool crates
  [18.3, 28.1, 19.4, 30.1, 1.2], // drums and forklift
  [11.7, 4.5, 15.7, 8.05, 2.6], // signal studio
  [16.0, 2.2, 18.4, 4.6, 13.5], // signal tower
  [1.1, 23.1, 6.1, 27.1, 3.3], // post office
  [6.4, 27.3, 7.0, 27.85, 0.9], // mailbox
  [5.05, 27.85, 7.75, 30.55, 0], // pond
  // The Armoury compound: blast walls (open at the checkpoint), watchtowers, the checkpoint,
  // the gun store and its counter, vehicles, supplies
  [22.55, 22.475, 30.45, 22.975, 1.6],
  [22.475, 22.55, 22.975, 30.45, 1.6],
  [30.025, 22.55, 30.525, 30.45, 1.6],
  [22.55, 30.025, 24.9, 30.525, 1.6],
  [28.3, 30.025, 30.45, 30.525, 1.6],
  [22.5, 22.5, 23.4, 23.4, 2.6], // watchtowers
  [29.6, 22.5, 30.5, 23.4, 2.6],
  [22.5, 29.6, 23.4, 30.5, 2.6],
  [29.6, 29.6, 30.5, 30.5, 2.6],
  [24.95, 29.75, 25.85, 30.45, 1.4], // checkpoint booth
  [25.78, 30.18, 26.14, 30.4, 2.4], // gantry post and barrier post
  [28.06, 30.18, 28.4, 30.4, 2.4], // gantry post and barrier rest
  [23.3, 23.3, 27.9, 26.9, 2.8], // the gun store
  [23.85, 27.1, 25.55, 27.55, 0.7], // its counter
  [28.62, 24.55, 29.68, 26.25, 1.0], // tank
  [28.95, 28.05, 29.65, 29.15, 0.9], // jeep
  [28.1, 22.95, 30.05, 24.35, 1.4], // supply crates under the netting
  [23.05, 29.35, 23.8, 29.85, 0.6], // drums
  [23.3, 27.95, 23.55, 28.95, 0.7], // helmet rack
  [22.7, 0.9, 26.1, 4.3, 7.6], // apartments A
  [26.9, 1.5, 30.3, 5.3, 8.4], // apartments B and billboard
  [1.7, 1.7, 3.5, 3.5, 6.6], // water tower
  [18.55, 11.95, 19.45, 12.85, 1.4], // planters
  [11.95, 18.55, 12.85, 19.45, 1.4],
];
/**
 * The garage on the south bank (garage.ts draws it; it's outside the core, so no drawing grid):
 * the workshop building, the showroom turntable on the forecourt with your car on it, and the
 * office door where its menu opens.
 */
export const GARAGE_SITE = {
  building: [GARAGE.ox + 0.4, GARAGE.oz + 3.7, GARAGE.ox + 8.6, GARAGE.oz + 8.6, 2.9] as Box,
  turntable: { x: GARAGE.ox + 2.9, z: GARAGE.oz + 1.85, r: 1.55 },
  door: { x: GARAGE.ox + 7.4, z: GARAGE.oz + 3.1 },
  tyres: { x: GARAGE.ox + 5.5, z: GARAGE.oz + 3.25 },
};
const T = GARAGE_SITE.turntable;
/** The turntable with your car on it (your own car ignores it: it drives off from there) */
export const TURNTABLE_BOX: Box = [T.x - 1.45, T.z - 1.45, T.x + 1.45, T.z + 1.45, 1.1];
const GARAGE_SOLIDS: Box[] = [
  GARAGE_SITE.building,
  TURNTABLE_BOX,
  [GARAGE_SITE.tyres.x - 0.3, GARAGE_SITE.tyres.z - 0.3, GARAGE_SITE.tyres.x + 0.3, GARAGE_SITE.tyres.z + 0.3, 0.8],
];
export const SOLIDS: Box[] = [...DRAWN.map(designBox), ...GARAGE_SOLIDS, ...DUMMY_SOLIDS];
/** What bullets stop on: everything solid except the dummies' footprints (they test their own shape) */
export const SHOT_SOLIDS = SOLIDS.filter((b) => !DUMMY_SOLIDS.includes(b));

/** Things to do with E besides doors: the gun store counter in the Armoury (stand in front of it to gear up) */
export const RACK = (([x, z]) => ({ x, z }))(design(24.7, 27.95));
/** Only the camera bumps into these (tall parts above a walkable footprint) */
export const CAMERA_ONLY: Box[] = [
  [11.9, 11.9, 17.5, 17.5, 12.6], // the Emporium's glass tower
].map((b) => designBox(b as Box));

/**
 * Distance along a ray to the first solid box or the ground (y 0.1), up to
 * `max`. Boxes the ray starts inside or very near (the shooter's own
 * surroundings) are ignored. `extra` adds more boxes (placed buildings).
 */
export function rayBoxes(from: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, max: number, extra: Box[] = []) {
  let t = max;
  if (dir.y < 0) t = Math.min(t, (from.y - 0.1) / -dir.y);
  const o = [from.x, from.y, from.z];
  const v = [dir.x, dir.y, dir.z];
  for (const list of [SHOT_SOLIDS, CAMERA_ONLY, extra]) {
    for (const b of list) {
      if (b[4] < 0.3) continue;
      const lo = [b[0], 0, b[1]];
      const hi = [b[2], b[4], b[3]];
      let t0 = 0;
      let t1 = t;
      let hit = true;
      for (let k = 0; k < 3 && hit; k++) {
        if (Math.abs(v[k]) < 1e-6) {
          if (o[k] < lo[k] || o[k] > hi[k]) hit = false;
          continue;
        }
        let a = (lo[k] - o[k]) / v[k];
        let c = (hi[k] - o[k]) / v[k];
        if (a > c) [a, c] = [c, a];
        t0 = Math.max(t0, a);
        t1 = Math.min(t1, c);
        if (t0 > t1) hit = false;
      }
      if (hit && t0 > 0.6) t = Math.min(t, t0);
    }
  }
  return t;
}
