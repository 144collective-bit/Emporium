/*
 * What the camera works out from the city rather than the world's edge
 * (docs/growth-plan.md Phase 5; DOM-free, tested in tests/outskirts.test.ts):
 * the built-up area (the town, the airport, the kart park), how far City
 * view may pan round it, and the districts' plots the Build overview frames.
 * A bigger world doesn't stretch them; more city does. And how far the camera
 * sees: the skyline ring past the world's edge stays on the horizon from town,
 * however far out the edge is (Phase 6).
 */
import { DISTRICTS } from '../../data/plots';
import { BS, CITY_EXT, EXT, WORLD_BOUNDS } from './layout';
import { SITE } from './airfield';
import { KART_PARK } from './kartpark';
import type { Rect } from './downtown';

const union = (rs: Rect[]): Rect => [Math.min(...rs.map((r) => r[0])), Math.min(...rs.map((r) => r[1])), Math.max(...rs.map((r) => r[2])), Math.max(...rs.map((r) => r[3]))];

/** The built-up area: the town with its traffic loops, the airport and the kart park (x0, z0, x1, z1) */
export const BUILT_UP: Rect = union([[CITY_EXT[0], CITY_EXT[0], CITY_EXT[1], CITY_EXT[1]], SITE, [KART_PARK.x0, KART_PARK.z0, KART_PARK.x1, KART_PARK.z1]]);

/** How far past the built-up area City view's target may pan */
export const PAN_MARGIN = 160;
/** Where City view's target may go: round the built-up area, and never past 10 in from where you can walk */
export const PAN_BOUNDS: Rect = [
  Math.max(BUILT_UP[0] - PAN_MARGIN, WORLD_BOUNDS[0] + 10),
  Math.max(BUILT_UP[1] - PAN_MARGIN, WORLD_BOUNDS[1] + 10),
  Math.min(BUILT_UP[2] + PAN_MARGIN, WORLD_BOUNDS[2] - 10),
  Math.min(BUILT_UP[3] + PAN_MARGIN, WORLD_BOUNDS[3] - 10),
];

/** Every district plot, as one box */
export const PLOTS_BOX: Rect = union(DISTRICTS.map((d): Rect => [d.ox, d.oz, d.ox + BS, d.oz + BS]));
/** How wide that box is today: the Build overview's distance was set for it */
const PLOTS_SPAN = 123.5;

/**
 * The Build overview: where it looks (a little north-west of the plots'
 * middle, since it looks from the south-east) and how far back it stands
 * (1 for today's plots)
 */
export function overviewFrame() {
  const span = Math.max(PLOTS_BOX[2] - PLOTS_BOX[0], PLOTS_BOX[3] - PLOTS_BOX[1]);
  return { target: [(PLOTS_BOX[0] + PLOTS_BOX[2]) / 2 - 10, (PLOTS_BOX[1] + PLOTS_BOX[3]) / 2 - 9.75] as [number, number], scale: span / PLOTS_SPAN };
}

/** The skyline ring (world.ts `buildSkyline()`): its towers stand `gap` to `gap` + `depth` past the world's edge */
export const SKYLINE = { gap: 18, depth: 40 };
/** The middle of downtown, where the skyline is seen from */
const TOWN: [number, number] = [30, 30];
/**
 * How far off the sky dome travels round the camera (sky.ts): far enough that the
 * skyline ring's far side stands in front of it seen from town, out to the ring's
 * corners (the world is square; at -420 to 460 it's about 720), and never nearer
 * than it always was (400)
 */
export const SKY_RADIUS = (() => {
  const reach = (EXT[1] - EXT[0]) / 2 + SKYLINE.gap + SKYLINE.depth;
  const mid = (EXT[0] + EXT[1]) / 2;
  const corner = Math.max(...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => Math.hypot(mid + sx * reach - TOWN[0], mid + sz * reach - TOWN[1]))));
  return Math.max(400, Math.ceil(corner / 10) * 10);
})();
/** The camera's far plane: just past the sky dome, so the dome is always drawn */
export const CAMERA_FAR = SKY_RADIUS + 40;
