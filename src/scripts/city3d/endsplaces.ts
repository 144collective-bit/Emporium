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
import { DOOR_SPOT as CHURCH_DOOR, PORCH_DOOR } from './aldwyns';
import { SHOPS, doorOf, shopFoot, topOf, type Shop } from './highroad';
import { PAVILION, PAVILION_DOOR, PAVILION_H, REC_SPAWN, VERANDA } from './rec';

import type { Rect } from './endswood';


export type EndsPlaceId = 'endswood' | 'aldwyns' | 'bunker' | 'brook' | 'rosas' | 'kestrel' | 'busgarage' | 'rec';
export const ENDS_PLACE_IDS: EndsPlaceId[] = ['endswood', 'aldwyns', 'bunker', 'brook', 'rosas', 'kestrel', 'busgarage', 'rec'];
/** The High Road's places (highroad.ts, docs/south-plan.md Phase 3c, the owner's big four) */
export const HIGH_ROAD_PLACES = ['brook', 'rosas', 'kestrel', 'busgarage'] as const;

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
/** A High Road place's building (highroad.ts) */
const shopOf = (id: string): Shop => SHOPS.find((q) => q.id === id)!;
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
    // St Aldwyn's: the pin over its porch, clear of the nave's roof (aldwyns.ts)
    id: 'aldwyns',
    boxes: [{ rect: YARD, h: 1.2 }],
    land: YARD,
    pin: [PORCH_DOOR[0], PORCH_DOOR[1]],
    pinH: 12,
  },
  {
    // Bunker Sound: the pin over its door in Teasel House (over the block's roof)
    id: 'bunker',
    boxes: [{ rect: BUNKER, h: 1.2 }],
    land: BUNKER,
    pin: [DX, DZ],
    pinH: 8,
  },
  // The High Road's four: the pin over each building, its ground the building's
  ...HIGH_ROAD_PLACES.map((id): EndsSpot => {
    const sh = shopOf(id);
    const land = box(shopFoot(sh));
    // (its pin over its front, by its door)
    return { id, boxes: [{ rect: land, h: 1.2 }], land, pin: [sh.at[0], sh.at[1]], pinH: topOf(sh) + 3 };
  }),
  // Aldwyn's Green Rec (rec.ts): the pin over its pavilion, its ground the pavilion's
  {
    id: 'rec',
    boxes: [{ rect: [VERANDA[0], PAVILION[1], PAVILION[2], PAVILION[3]], h: 1.2 }],
    land: [VERANDA[0], PAVILION[1], PAVILION[2], PAVILION[3]],
    // (over its veranda's door)
    pin: [PAVILION_DOOR[0], PAVILION_DOOR[1]],
    pinH: PAVILION_H.eaves + PAVILION_H.ridge + 3,
  },
];

/** The doors (walk prompts that open each panel): Bunker Sound's under Teasel House, St Aldwyn's porch (aldwyns.ts);
 * the estate's is its pin */
export const ENDS_DOORS: { id: EndsPlaceId; x: number; z: number; label: string }[] = [
  { id: 'bunker', x: DX + OUT[0] * 0.8, z: DZ + OUT[1] * 0.8, label: 'Bunker Sound' },
  { id: 'aldwyns', x: CHURCH_DOOR[0], z: CHURCH_DOOR[1], label: "St Aldwyn's" },
  ...HIGH_ROAD_PLACES.map((id) => ({ id, x: doorOf(shopOf(id))[0], z: doorOf(shopOf(id))[1], label: shopOf(id).name })),
  { id: 'rec' as const, x: PAVILION_DOOR[0] - 0.6, z: PAVILION_DOOR[1], label: "Aldwyn's Green Rec" },
];

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
  // (the High Road's four: on the sidewalk in front of each door, facing it)
  // (the rec: just inside its gate off the footbridge, facing in)
  rec: REC_SPAWN,
  ...(Object.fromEntries(HIGH_ROAD_PLACES.map((id) => {
    const sh = shopOf(id);
    const [x, z] = doorOf(sh);
    return [id, { x: x + sh.face[0] * 0.15, z: z + sh.face[1] * 0.15, yaw: Math.atan2(sh.face[0], sh.face[1]) }];
  })) as Record<(typeof HIGH_ROAD_PLACES)[number], { x: number; z: number; yaw: number }>),
};
