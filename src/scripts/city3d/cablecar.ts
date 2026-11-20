/**
 * Highcrest's cable car (docs/crestmont-plan.md, the premium upgrade's Phase 4b; the owner's calls, 2026-11-20: an
 * aerial cable car, "Foothill Road's east end", "Ride shown, then walk", "Glass gondolas"): glass gondolas on a rope
 * from a station at the Flats' east end, just north of Foothill Road, straight up over the hills and the reservoir to a
 * station beside THE ASTERLY, on slim pylons stood on clear ground (`PYLONS`: no hill house's ground, land, footpath,
 * landmark or road under one). The rope clears the ground and the houses' tops all the way (`ropeY()`, `CLEAR`).
 *
 * DOM-free. Its stations (their doors and where you arrive, walk mode's and the places') are here, in the boot; the
 * line, the rope, the cabins and the ride are cableline.ts, in Crestmont's chunk and the ride's (the rope's supports
 * worked out at the build, `cable-supports`: baked.ts). Drawn by
 * cablecar3d.ts in Crestmont's chunk, ridden through cablecar-ui.ts, tested in tests/cablecar.test.ts. The cabins run on
 * the clock (`cabinsAt()`: the same cabins in the same places for everyone), still under reduced motion.
 */
import { ASTERLY, OVERLOOK } from './crestsites';
import { heightAt } from './terrain';

type Pt = [number, number];
type Rect = [number, number, number, number];

/** The cabins' speed along the rope (m/s), a ride's, how many cabins, the two ropes apart, a cabin's hang under its rope */
export const CABLE = { speed: 5, rideSpeed: 11, cabins: 8, gauge: 2.6, hang: 2.1, sag: 0.015 } as const;
/** The rope's height over its station's floor */
export const ROPE_OVER = 6.2;
/** A cabin's height from its roof (under the hanger) to its foot */
export const CABIN_H = 2.3;
/**
 * The least a cabin's foot keeps over the ground (its trees too), and over a hill house's roof (its pad's height and
 * TALLEST); less by the stations, where the cabins come down to the platforms (`near` of the way in)
 */
export const CLEAR = { ground: 5.5, house: 3, station: 0.6, near: 25 } as const;

export type CableStationId = 'foot' | 'top';
export interface CableStation {
  id: CableStationId;
  name: string;
  /** Its footprint (x0, z0, x1, z1) and its floor's height */
  rect: Rect;
  floor: number;
  /** Where the rope meets it (x, z): its bull wheel's middle */
  rope: Pt;
  /** Its door's walk prompt ("Cable car"), and where you arrive by it (a yaw faces (-sin, -cos)) */
  door: { x: number; z: number };
  at: { x: number; z: number; yaw: number };
}

const FOOT_RECT: Rect = [436.6, -76, 443.4, -67.6];
const FOOT_FLOOR = heightAt((FOOT_RECT[0] + FOOT_RECT[2]) / 2, (FOOT_RECT[1] + FOOT_RECT[3]) / 2) + 0.15;
/** The top station: on legs beside THE ASTERLY's east side, its floor level with the restaurant's */
const TOP_RECT: Rect = [ASTERLY.body[2] + 0.8, ASTERLY.body[1] + 0.4, ASTERLY.body[2] + 6.6, ASTERLY.body[3] - 0.4];
export const CABLE_STATIONS: CableStation[] = [
  {
    id: 'foot',
    name: 'Foothill Road',
    rect: FOOT_RECT,
    floor: FOOT_FLOOR,
    rope: [(FOOT_RECT[0] + FOOT_RECT[2]) / 2, FOOT_RECT[1] + 1.4],
    // (its door on its south side, to Foothill Road)
    door: { x: (FOOT_RECT[0] + FOOT_RECT[2]) / 2, z: FOOT_RECT[3] + 0.5 },
    at: { x: (FOOT_RECT[0] + FOOT_RECT[2]) / 2, z: FOOT_RECT[3] + 2.4, yaw: 0 },
  },
  {
    id: 'top',
    name: 'Highcrest',
    rect: TOP_RECT,
    floor: ASTERLY.y,
    rope: [(TOP_RECT[0] + TOP_RECT[2]) / 2, TOP_RECT[3] - 1.2],
    // (reached through THE ASTERLY: its door's prompt on the overlook by the bridge, where you arrive at the top)
    door: { x: (ASTERLY.bridge[0] + ASTERLY.bridge[2]) / 2 - 1.9, z: ASTERLY.out > 0 ? OVERLOOK.rect[3] - 0.8 : OVERLOOK.rect[1] + 0.8 },
    at: { x: (ASTERLY.bridge[0] + ASTERLY.bridge[2]) / 2 - 1.9, z: ASTERLY.out > 0 ? OVERLOOK.rect[3] - 2.4 : OVERLOOK.rect[1] + 2.4, yaw: ASTERLY.out > 0 ? Math.PI : 0 },
  },
];
export const stationOf = (id: CableStationId) => CABLE_STATIONS.find((s) => s.id === id)!;

/** The stations' doors, for walk mode's prompts */
export const CABLE_DOORS = CABLE_STATIONS.map((s) => ({ id: `cable:${s.id}`, x: s.door.x, z: s.door.z, label: 'Cable car' }));
