/*
 * Sunridge's street lamps, clear of the driveways (DOM-free; the map polish plan's Phase 0). The stride along each
 * sidewalk (sunridge.ts `SUN_LAMP_STATIONS`) is laid before the lots, so about one lamp in four stood in a drive's
 * mouth. Each such lamp slides along the kerb past the nearer edge of that drive; one that then lands in another
 * drive, or on another lamp, is left out. Baked (baked.ts): the houses are worked out when the site is built, not in
 * the boot, which needs only the lamps.
 */
import { BUILT, baked } from './baked';
import type { House } from './sunhouses';
import { SUN_LAMP_STATIONS } from './sunridge';

/**
 * The houses, only where the lamps are worked out (the tests, the bake): the site's own build has the lamps baked, and
 * this folds away with the houses (a static import kept them in the boot: 2.5 KB over its budget)
 */
declare const __CITY_BUILT__: boolean | undefined;
const HOUSES: House[] = typeof __CITY_BUILT__ !== 'undefined' && __CITY_BUILT__ === true ? [] : (await import('./sunhouses')).HOUSES;

export type Lamp = [number, number, number, number];

/** How far clear of a drive's edge a lamp stands, and how far out in front of the lot a drive's mouth reaches */
export const DRIVE_CLEAR = 0.6;
const MOUTH = 3;

/** A point in a house's frame: u along the street, v in from the lot's front (out over the sidewalk is v < 0) */
const local = (h: House, x: number, z: number): [number, number] => {
  const [dx, dz] = [x - h.o[0], z - h.o[1]];
  return [dx * h.u[0] + dz * h.u[1], dx * h.v[0] + dz * h.v[1]];
};

/** The house whose drive's mouth (with `clear` either side) a point stands in, if any */
export function inDriveMouth(x: number, z: number, clear = DRIVE_CLEAR - 0.05, houses: House[] = HOUSES): House | undefined {
  return houses.find((h) => {
    const [u, v] = local(h, x, z);
    return v > -MOUTH && v < 0.5 && u > h.drive[0] - clear && u < h.drive[1] + clear;
  });
}

/** The lamps slid clear of the drives (and those that can't be, left out) */
export function clearOfDrives(stations: Lamp[], houses: House[] = HOUSES): Lamp[] {
  const out: Lamp[] = [];
  const free = (x: number, z: number) => !inDriveMouth(x, z, DRIVE_CLEAR - 0.05, houses) && out.every(([ox, oz]) => Math.hypot(ox - x, oz - z) > 3);
  for (const [x, z, ry, y] of stations) {
    const h = inDriveMouth(x, z, DRIVE_CLEAR - 0.05, houses);
    if (!h) {
      if (free(x, z)) out.push([x, z, ry, y]);
      continue;
    }
    // (along the kerb, the lot's u, to the nearer side of the drive first)
    const [u] = local(h, x, z);
    const sides = [h.drive[0] - DRIVE_CLEAR, h.drive[1] + DRIVE_CLEAR].sort((a, b) => Math.abs(a - u) - Math.abs(b - u));
    for (const to of sides) {
      const [nx, nz] = [x + h.u[0] * (to - u), z + h.u[1] * (to - u)];
      if (free(nx, nz)) {
        out.push([nx, nz, ry, y]);
        break;
      }
    }
  }
  return out;
}

/** Sunridge's lamps: x, z, the way the arm reaches, the ground's height */
export const SUN_LAMPS: Lamp[] = baked('sunlamps', BUILT ? undefined : () => clearOfDrives(SUN_LAMP_STATIONS));
