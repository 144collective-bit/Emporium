/**
 * Sunridge's three places (docs/suburb-plan.md Phase 4, the owner's picks: a park with a playground, a school, a
 * community pool and clubhouse): what the boot needs of them, DOM-free: their footprints on the amenities' land south
 * of Mesa Drive (sunridge.ts `ZONES`), the buildings' heights and solids (in `SOLIDS`), where you arrive at each
 * (`SUN_SPAWNS`: on the loop's sidewalk in front, facing it) and their pick boxes; everything in them is
 * sunamenities.ts's (the chunk's). Names are made up: **Sunridge Club**, **Sunridge Park**, **Sunridge Elementary**.
 */
import { PARKWAY_LOOP, type Rect } from './sunridge';

/** The lots' ground (world.ts SLAB) */
export const SLAB_Y = 0.15;

/** Sunridge Club: the clubhouse by the main entrance, its pool behind, the courts and the car park beside */
export const CLUB_LAND: Rect = [142.5, -58, 171.5, -32];
export const CLUBHOUSE = { rect: [144, -41.5, 157, -34] as Rect, h: 2.1 } as const;
/** Sunridge Park: the playground, the ramada, the field and the walk round them */
export const PARK_LAND: Rect = [172.5, -61, 199.5, -32];
/** Sunridge Elementary: its classroom wings, the multipurpose room, the field and the playground */
export const SCHOOL_LAND: Rect = [200.5, -63.5, 231.5, -32];
export const SCHOOL = {
  wings: [
    [202, -40.5, 222, -34],
    [202, -58, 208, -40.5],
  ] as Rect[],
  h: 1.9,
  hall: { rect: [213, -50, 222, -42] as Rect, h: 3.2 },
} as const;

/** The loop's middle at x on its south side (where the places front it) */
const loopZ = (x: number) => PARKWAY_LOOP.filter((p) => p[1] > -45).reduce((a, b) => (Math.abs(b[0] - x) < Math.abs(a[0] - x) ? b : a))[1];
/** Where you arrive at each: on the loop's inner sidewalk in front of it, facing it (north) */
export const SUN_SPAWNS = {
  sunclub: { x: 150.5, z: loopZ(150.5) - 2.1, yaw: Math.PI },
  sunpark: { x: 186, z: loopZ(186) - 2.1, yaw: Math.PI },
  sunschool: { x: 212, z: loopZ(212) - 2.1, yaw: Math.PI },
} as const;

/** The front doors (a walk prompt opens the place's panel): the clubhouse's under its portico, the school's in the middle of its front */
export const SUN_DOORS = [
  { id: 'sunclub' as const, x: 150.5, z: CLUBHOUSE.rect[3] + 0.4 },
  { id: 'sunschool' as const, x: 212, z: SCHOOL.wings[0][3] + 0.4 },
];

type Box = [number, number, number, number, number];
/** The buildings, solid (in `SOLIDS`): the clubhouse, the school's wings and its hall; the rest is the chunk's */
export const SUNPLACE_SOLIDS: Box[] = [
  [...CLUBHOUSE.rect, SLAB_Y + CLUBHOUSE.h + 1.2],
  ...SCHOOL.wings.map((r): Box => [...r, SLAB_Y + SCHOOL.h + 0.3]),
  [...SCHOOL.hall.rect, SLAB_Y + SCHOOL.hall.h + 0.3],
];
