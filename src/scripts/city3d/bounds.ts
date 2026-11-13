/*
 * What the camera works out from the city rather than the world's edge
 * (docs/growth-plan.md Phase 5; DOM-free, tested in tests/outskirts.test.ts):
 * the built-up area (the town, the airport, the kart park), and how far City
 * view may go: up to the wall.
 * A bigger world doesn't stretch them; more city does. And how far the camera
 * sees: the wall round the city stays in front of the sky from town
 * (docs/wall-plan.md).
 */
import { CITY_EXT } from './layout';
import { WALL_CORNERS, WALL_INNER } from './wall';
import { SITE } from './airfield';
import { KART_PARK } from './kartpark';
import type { Rect } from './downtown';

const union = (rs: Rect[]): Rect => [Math.min(...rs.map((r) => r[0])), Math.min(...rs.map((r) => r[1])), Math.max(...rs.map((r) => r[2])), Math.max(...rs.map((r) => r[3]))];

/** The built-up area: the town with its traffic loops, the airport and the kart park (x0, z0, x1, z1) */
export const BUILT_UP: Rect = union([[CITY_EXT[0], CITY_EXT[0], CITY_EXT[1], CITY_EXT[1]], SITE, [KART_PARK.x0, KART_PARK.z0, KART_PARK.x1, KART_PARK.z1]]);

/** How far in from the wall's inner face City view's camera and its target stay (freecam.ts) */
export const PAN_PAD = 1.5;
/**
 * Where City view's camera and its target may go: anywhere inside the wall, up to `PAN_PAD` from its inner face (the
 * owner's call, 2026-11: the free camera near the wall; it panned round the built-up area before)
 */
export const PAN_BOUNDS: Rect = [WALL_INNER[0] + PAN_PAD, WALL_INNER[1] + PAN_PAD, WALL_INNER[2] - PAN_PAD, WALL_INNER[3] - PAN_PAD];

/** The middle of downtown, where the wall is seen from */
const TOWN: [number, number] = [30, 30];
/**
 * How far off the sky dome travels round the camera (sky.ts): far enough that the wall round the city
 * (wall.ts, docs/wall-plan.md; the skyline ring of towers it replaced was retired, the owner's call) and the
 * land past it stand in front of it seen from town, out to the land's corners (at -680 to 720 about 1,300),
 * and never nearer than it always was (400)
 */
export const SKY_RADIUS = (() => {
  const corner = Math.max(...WALL_CORNERS.map(([x, z]) => Math.hypot(x - TOWN[0], z - TOWN[1])));
  return Math.max(400, Math.ceil(corner / 10) * 10);
})();
/** The camera's far plane: just past the sky dome, so the dome is always drawn */
export const CAMERA_FAR = SKY_RADIUS + 40;
