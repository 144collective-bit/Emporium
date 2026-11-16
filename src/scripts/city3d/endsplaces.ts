/*
 * Endswood's places (docs/estate-plan.md Phase 8; re-sited with the south, docs/south-plan.md Phase 1b, the owner's
 * call: their pins stand where they're to be built, still "coming soon", no doors until their buildings go up; DOM-free,
 * the boot's, tested in tests/endsplaces.test.ts): the estate itself (its pin over the Circus, the heart), St Aldwyn's
 * (over its churchyard on the village's hilltop) and Bunker Sound (in Teasel House's basement, its door off Endswood
 * Road: docs/south-plan.md Phase 2, southblocks.ts `BUNKER`). Each
 * has a pin, a panel with Walk in (CityMap.astro), its pick boxes (index.ts, through crestspots.ts `spot()`) and where
 * you arrive (`ENDS_SPAWNS`: the panel's Walk in, places.ts).
 */
import { CHURCH_ROAD, CHURCHYARD, CIRCUS } from './south';
import { BUNKER as BUNKER_DOOR } from './southblocks';

import type { Rect } from './endswood';


export type EndsPlaceId = 'endswood' | 'aldwyns' | 'bunker';
export const ENDS_PLACE_IDS: EndsPlaceId[] = ['endswood', 'aldwyns', 'bunker'];

/** Each one's pick boxes (over its ground, `h` tall), the land its hover ring goes round, the pin's spot and height,
 * and the way the fly-in comes from (the side it faces) */
export interface EndsSpot {
  id: EndsPlaceId;
  boxes: { rect: Rect; h: number }[];
  land: Rect;
  pin: [number, number];
  pinH: number;
  faces?: 'n';
}
const box = (pts: [number, number][]): Rect => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
const YARD = box(CHURCHYARD);
/** Bunker Sound's door under Teasel House's hoarded half, the way out of it (to Endswood Road), and its ground round it */
const [DX, DZ] = BUNKER_DOOR.door;
const OUT: [number, number] = [Math.cos(BUNKER_DOOR.face), Math.sin(BUNKER_DOOR.face)];
const BUNKER: Rect = [DX - 2.5, DZ - 2.5, DX + 2.5, DZ + 2.5];
const ISLAND = CIRCUS.r - CIRCUS.half;
export const ENDS_SPOTS: EndsSpot[] = [
  {
    // The estate: the pin over the Circus's island
    id: 'endswood',
    boxes: [{ rect: [CIRCUS.x - ISLAND, CIRCUS.z - ISLAND, CIRCUS.x + ISLAND, CIRCUS.z + ISLAND], h: 1.2 }],
    land: [CIRCUS.x - ISLAND, CIRCUS.z - ISLAND, CIRCUS.x + ISLAND, CIRCUS.z + ISLAND],
    pin: [CIRCUS.x, CIRCUS.z],
    pinH: 6,
  },
  {
    // St Aldwyn's: the pin over its churchyard on the hill (its church is Phase 3's)
    id: 'aldwyns',
    boxes: [{ rect: YARD, h: 1.2 }],
    land: YARD,
    pin: [(YARD[0] + YARD[2]) / 2, (YARD[1] + YARD[3]) / 2],
    pinH: 6,
  },
  {
    // Bunker Sound: the pin over its door in Teasel House (over the block's roof)
    id: 'bunker',
    boxes: [{ rect: BUNKER, h: 1.2 }],
    land: BUNKER,
    pin: [DX, DZ],
    pinH: 8,
  },
];

/** The doors (walk prompts that open each panel): Bunker Sound's, under Teasel House; the others when their buildings
 * stand (Phase 3) */
export const ENDS_DOORS: { id: EndsPlaceId; x: number; z: number; label: string }[] = [{ id: 'bunker', x: DX + OUT[0] * 0.8, z: DZ + OUT[1] * 0.8, label: 'Bunker Sound' }];

/** Church Road's south sidewalk's middle where it passes the churchyard (clear of the terraces' front walls behind it) */
const CHURCH_SIDEWALK = (() => {
  const x = (YARD[0] + YARD[2]) / 2;
  const z = CHURCH_ROAD.pts.reduce((b, p) => (Math.abs(p[0] - x) < Math.abs(b[0] - x) ? p : b))[1];
  return z + CHURCH_ROAD.half + 0.4;
})();
/** Where you arrive (the panels' Walk in, places.ts): on a sidewalk by each, facing it (yaw 0 faces north, π south) */
export const ENDS_SPAWNS: Record<EndsPlaceId, { x: number; z: number; yaw: number }> = {
  // (on the Circus's outer sidewalk between Underhill Lane and Endswood Road, looking over it)
  endswood: { x: CIRCUS.x + (CIRCUS.r + CIRCUS.half + 0.5) * Math.cos((300 * Math.PI) / 180), z: CIRCUS.z + (CIRCUS.r + CIRCUS.half + 0.5) * Math.sin((300 * Math.PI) / 180), yaw: Math.PI },
  // (on Church Road's sidewalk, the churchyard south of it)
  aldwyns: { x: (YARD[0] + YARD[2]) / 2, z: CHURCH_SIDEWALK, yaw: Math.PI },
  // (on Endswood Road's south sidewalk in front of its door, facing it: yaw 0 looks north, -z)
  bunker: { x: DX + OUT[0] * 2.3, z: DZ + OUT[1] * 2.3, yaw: Math.atan2(OUT[0], OUT[1]) },
};
