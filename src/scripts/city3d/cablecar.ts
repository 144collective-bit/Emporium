/**
 * Highcrest's cable car (docs/crestmont-plan.md, the premium upgrade's Phase 4b; the owner's calls, 2026-11-20: an
 * aerial cable car, "Foothill Road's east end", "Ride shown, then walk", "Glass gondolas"): glass gondolas on a rope
 * from a station at the Flats' east end, just north of Foothill Road, straight up over the hills and the reservoir to a
 * station beside THE ASTERLY, on slim pylons stood on clear ground (`PYLONS`: no hill house's ground, land, footpath,
 * landmark or road under one). The rope clears the ground and the houses' tops all the way (`ropeY()`, `CLEAR`).
 *
 * DOM-free, in the boot (the stations' doors and where you arrive are walk mode's and the places'; the rope's supports
 * worked out at the build, `cable-supports`: baked.ts); drawn by
 * cablecar3d.ts in Crestmont's chunk, ridden through cablecar-ui.ts, tested in tests/cablecar.test.ts. The cabins run on
 * the clock (`cabinsAt()`: the same cabins in the same places for everyone), still under reduced motion.
 */
import { ASTERLY, OVERLOOK } from './crestsites';
import { heightAt } from './terrain';
import { MANSIONS, rectToWorld, topOf } from './mansions';
import { BUILT, baked } from './baked';

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

/* ---------- The line ---------- */

const [A, B] = [CABLE_STATIONS[0].rope, CABLE_STATIONS[1].rope];
/** Its length (in plan) */
export const LINE_L = Math.hypot(B[0] - A[0], B[1] - A[1]);
const U: Pt = [(B[0] - A[0]) / LINE_L, (B[1] - A[1]) / LINE_L];
/** The right of the line (looking up it): the up rope's side */
const N: Pt = [-U[1], U[0]];
/** A point on the line, `d` up it from the foot, `side` across (the up rope +1, the down -1) */
export const lineAt = (d: number, side = 0): Pt => [A[0] + U[0] * d + N[0] * side * (CABLE.gauge / 2), A[1] + U[1] * d + N[1] * side * (CABLE.gauge / 2)];
export const LINE_DIR = U;

/**
 * The pylons: how far up the line each stands (on clear ground: tests/cablecar.test.ts) and how tall, its top the
 * rope's height there. Laid where the hills leave room between the houses' grounds, the land and the footpaths.
 */
export const PYLON_AT = [30, 84, 114] as const;
/** A pylon's cross-arm's height under the rope and its half span */
export const PYLON = { arm: 0.5, half: CABLE.gauge / 2 + 0.6, r: 0.42, top: 0.26 } as const;

/** The hill houses' roofs (`roofs()`), worked out the first time they're asked for */
let roofList: [number, number, number, number, number][] | null = null;
/** The rope's ends' and pylons' heights: each support high enough that every span clears the ground and the houses */
export const SUPPORTS: { d: number; y: number }[] = baked('cable-supports', BUILT ? undefined : () => {
  const ends = [
    { d: 0, y: FOOT_FLOOR + ROPE_OVER },
    ...PYLON_AT.map((d) => ({ d, y: heightAt(...lineAt(d)) + 10.5 })),
    { d: LINE_L, y: ASTERLY.y + ROPE_OVER },
  ];
  // (raised till every span clears what's under it; a station's end stays at its station)
  for (let pass = 0; pass < 40; pass++) {
    let ok = true;
    for (let i = 0; i + 1 < ends.length; i++) {
      const [a, b] = [ends[i], ends[i + 1]];
      let worst = 0;
      let at = 0.5;
      for (let t = 0.02; t < 0.99; t += 0.02) {
        const d = a.d + (b.d - a.d) * t;
        const need = floorUnder(d) - (spanY(a, b, t) - CABLE.hang - CABIN_H);
        if (need > worst) [worst, at] = [need, t];
      }
      if (worst > 0.01) {
        ok = false;
        const lift = worst + 0.3;
        if (i > 0) a.y += lift * (at < 0.5 || i + 1 === ends.length - 1 ? 1 : 0.5);
        if (i + 1 < ends.length - 1) b.y += lift * (at >= 0.5 || i === 0 ? 1 : 0.5);
      }
    }
    if (ok) break;
  }
  return ends;
});
/** The height a span's rope hangs at, `t` of the way from `a` to `b`: the chord, less its sag */
function spanY(a: { d: number; y: number }, b: { d: number; y: number }, t: number) {
  return a.y + (b.y - a.y) * t - 4 * CABLE.sag * (b.d - a.d) * t * (1 - t);
}
/** What the rope must keep over at `d` up the line: the ground (and its trees), or a hill house's roof */
function floorUnder(d: number) {
  const k = Math.min(1, Math.min(d, LINE_L - d) / CLEAR.near);
  const over = CLEAR.station + (CLEAR.ground - CLEAR.station) * k;
  let worst = -Infinity;
  for (const s of [-1, 0, 1]) {
    const [x, z] = lineAt(d, s);
    worst = Math.max(worst, heightAt(x, z) + over);
  }
  return Math.max(worst, houseUnder(d));
}
/** A cabin's foot's clearance needed at `d` up the line (tests/cablecar.test.ts holds the rope to it) */
export const needAt = (d: number) => floorUnder(d);
/** The hill houses' buildings (x0, z0, x1, z1, their roofs' tops), the rope's room kept over each */
function roofs(): [number, number, number, number, number][] {
  return (roofList ??= MANSIONS.flatMap((m) => m.parts.map((p) => [...rectToWorld(m, p.u0, p.v0, p.u1, p.v1), m.y + topOf(p)] as [number, number, number, number, number])));
}
/** A hill house's roof under the line at `d` (with a little round it: its eaves, a chimney), and the rope's room over it */
function houseUnder(d: number) {
  let worst = -Infinity;
  for (const s of [-1, 0, 1]) {
    const [x, z] = lineAt(d, s);
    for (const [x0, z0, x1, z1, top] of roofs()) if (x > x0 - 1.5 && x < x1 + 1.5 && z > z0 - 1.5 && z < z1 + 1.5) worst = Math.max(worst, top + CLEAR.house);
  }
  return worst;
}
/** The rope's height `d` up the line */
export function ropeY(d: number): number {
  const c = Math.max(0, Math.min(LINE_L, d));
  let i = 0;
  while (i < SUPPORTS.length - 2 && SUPPORTS[i + 1].d < c) i++;
  const [a, b] = [SUPPORTS[i], SUPPORTS[i + 1]];
  return spanY(a, b, (c - a.d) / (b.d - a.d || 1));
}

/* ---------- The cabins and the ride ---------- */

export interface CabinAt {
  x: number;
  y: number;
  z: number;
  /** The way it's heading (a yaw: it faces (-sin, -cos)) */
  yaw: number;
  /** Up the line (1) or down (-1) */
  dir: 1 | -1;
}
/** A cabin `s` round the loop (up the up rope, then down the down), hanging under the rope */
export function cabinAt(s: number): CabinAt {
  const loop = 2 * LINE_L;
  const q = ((s % loop) + loop) % loop;
  const up = q < LINE_L;
  const d = up ? q : loop - q;
  const [x, z] = lineAt(d, up ? 1 : -1);
  const dir = up ? 1 : -1;
  return { x, y: ropeY(d) - CABLE.hang, z, yaw: Math.atan2(-U[0] * dir, -U[1] * dir), dir };
}
/** Every cabin at a time (seconds on the clock), evenly round the loop */
export function cabinsAt(t: number): CabinAt[] {
  const gap = (2 * LINE_L) / CABLE.cabins;
  return Array.from({ length: CABLE.cabins }, (_, k) => cabinAt(t * CABLE.speed + k * gap));
}
/** A ride from a station to the other: its cabin `t` seconds in, easing out of the station and into the next; and how long it takes */
export function rideAt(from: CableStationId, t: number): CabinAt & { total: number } {
  const total = LINE_L / CABLE.rideSpeed + 2;
  const f = Math.max(0, Math.min(1, t / total));
  // (smooth at both ends: the cabin leaves and arrives slowly)
  const e = f * f * (3 - 2 * f);
  const d = from === 'foot' ? e * LINE_L : (1 - e) * LINE_L;
  const s = from === 'foot' ? d : 2 * LINE_L - d;
  return { ...cabinAt(s), total };
}
/** The ride's cabin while one's being ridden (cablecar3d.ts draws it there), else null */
export const CABLE_VIEW: { ride: CabinAt | null } = { ride: null };
/** The stations' doors, for walk mode's prompts */
export const CABLE_DOORS = CABLE_STATIONS.map((s) => ({ id: `cable:${s.id}`, x: s.door.x, z: s.door.z, label: 'Cable car' }));

/** What's solid (x0, z0, x1, z1, top): the stations (none walks onto either: the top one's on legs, both reached by their doors) and the pylons' footings and columns; joining the grids with Crestmont's chunk */
export const CABLE_SOLIDS: [number, number, number, number, number][] = [
  ...CABLE_STATIONS.map((s): [number, number, number, number, number] => [...s.rect, s.floor + 3.6]),
  ...PYLON_AT.map((d): [number, number, number, number, number] => {
    const [x, z] = lineAt(d);
    return [x - 0.85, z - 0.85, x + 0.85, z + 0.85, ropeY(d)];
  }),
];
