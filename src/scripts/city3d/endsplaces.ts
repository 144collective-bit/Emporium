/*
 * Endswood's places (docs/estate-plan.md Phase 8; DOM-free, the boot's, tested in tests/endsplaces.test.ts): the
 * estate itself (its spot on the tenants' hall at the parade's east end), St Aldwyn's and Bunker Sound. Each has a
 * pin, a panel with Walk in (CityMap.astro), its pick boxes (index.ts, through crestspots.ts `spot()`; the drawing is
 * the chunk's), a door that opens its panel (walk.ts `ALL_DOORS`, `ENDS_DOORS`) and where you arrive (`ENDS_SPAWNS`:
 * the panel's Walk in, places.ts). The storyline starts at Lot 9; these say "coming soon".
 */
import { BLOCKS, topOf } from './endsblocks';
import { CHURCH, CHURCHYARD, CHURCH_PARTS, PARADE, PARADE_UNITS, SPIRE_TOP, STUDIO, unitX } from './endsstreet';
import { SLAB_Y, type Rect } from './endswood';

export type EndsPlaceId = 'endswood' | 'aldwyns' | 'bunker';
export const ENDS_PLACE_IDS: EndsPlaceId[] = ['endswood', 'aldwyns', 'bunker'];

const parade = BLOCKS.find((b) => b.id === 'parade')!;
const HALL = PARADE_UNITS.findIndex((u) => u.kind === 'hall');
const [hx0, hx1] = unitX(HALL);

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
export const ENDS_SPOTS: EndsSpot[] = [
  {
    // The estate: the parade, the pin over the tenants' hall (it faces the road, north)
    id: 'endswood',
    boxes: [{ rect: [PARADE.x0, PARADE.z, PARADE.x1, PARADE.back], h: topOf(PARADE.storeys) - SLAB_Y }],
    land: [PARADE.x0, PARADE.z, PARADE.x1, PARADE.back],
    pin: [(hx0 + hx1) / 2, (PARADE.z + PARADE.back) / 2],
    pinH: topOf(PARADE.storeys) - SLAB_Y + 2.4,
    faces: 'n',
  },
  {
    // St Aldwyn's: the nave, aisles, chancel and the tower; the pin over the spire (its west door faces the road, south)
    id: 'aldwyns',
    boxes: [...CHURCH_PARTS.map((p) => ({ rect: p.rect, h: p.ridge })), { rect: CHURCH.tower.rect, h: CHURCH.tower.pinnacle }],
    land: CHURCHYARD,
    pin: [(CHURCH.tower.rect[0] + CHURCH.tower.rect[2]) / 2, (CHURCH.tower.rect[1] + CHURCH.tower.rect[3]) / 2],
    pinH: SPIRE_TOP + 1.8,
  },
  {
    // Bunker Sound: its two garages in Linnet Court's north face, the pin over them (they face north, the yard)
    id: 'bunker',
    boxes: [{ rect: [STUDIO.x0, STUDIO.z, STUDIO.x1, STUDIO.z + 1.6], h: topOf(0) - SLAB_Y }],
    land: [STUDIO.x0 - 1.5, STUDIO.z - 4.4, STUDIO.x1 + 1.5, STUDIO.z + 1],
    pin: [(STUDIO.x0 + STUDIO.x1) / 2, STUDIO.z + 0.8],
    // (over Linnet Court's roof, its four storeys over the garages)
    pinH: topOf(4) - SLAB_Y + 1.8,
    faces: 'n',
  },
];

/** The doors (walk prompts that open each panel): the tenants' hall's, the church's west door, the studio's */
export const ENDS_DOORS: { id: EndsPlaceId; x: number; z: number; label: string }[] = [
  { id: 'endswood', x: parade.door[0], z: parade.door[1], label: "Tenants' Hall" },
  { id: 'aldwyns', x: CHURCH.door[0], z: CHURCH.door[1] + 0.4, label: "St Aldwyn's" },
  { id: 'bunker', x: STUDIO.door[0], z: STUDIO.door[1], label: 'Bunker Sound' },
];

/** Where you arrive (the panels' Walk in, places.ts): in front of each door, facing it (yaw 0 faces north, π south) */
export const ENDS_SPAWNS: Record<EndsPlaceId, { x: number; z: number; yaw: number }> = {
  endswood: { x: parade.door[0], z: parade.door[1] - 1.3, yaw: Math.PI },
  aldwyns: { x: CHURCH.door[0], z: CHURCH.door[1] + 3.4, yaw: 0 },
  bunker: { x: STUDIO.door[0] + 0.5, z: STUDIO.door[1] - 2.8, yaw: Math.PI },
};
