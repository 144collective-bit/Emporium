/*
 * The river's life (river plan step 4a, the owner's pick: more boats), as
 * data: DOM-free, tested in tests/riverlife.test.ts. Everything here is a
 * function of the clock, the same for everyone, like the tall ship
 * (liberty.ts), and keeps to a line of its own on the water, clear of the
 * boats' three lanes (life.ts, waterfront.ts `boatZ()`), the tall ship's
 * line through Liberty Bridge's middle span, the bridges' piers, the decks
 * and what's moored:
 *
 * - **The cruise boat** (`CRUISE`): a sightseeing boat round the town's
 *   reach, eastward north of Liberty Bridge's north pier, westward south of
 *   its south pier, turning wide at each end, outside the tall ship's
 *   passage (it crosses the middle lane at its turns).
 * - **The rowing eight** (`CREW`): out and back along a line west of the
 *   river bus's crossing, between the middle lane and the cruise's line.
 * - **The dinghies** (`DINGHIES`): sailing round in the wide reach out west,
 *   past the ring highway's bridge, between the lanes.
 *
 * x east, z south; world tiles (1 = about 1.8 m). A heading (`yaw`) is 0
 * with the bow to +x, as the boats in life.ts.
 */
import { laneAt } from './river';
import { BOAT_LANES } from './liberty';

export type Pt = [number, number];

/** A closed line on the water: its points, the distance along it at each, its length */
export interface Loop {
  pts: Pt[];
  cum: number[];
  len: number;
}
export function loopOf(pts: Pt[]): Loop {
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i % pts.length]];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return { pts, cum, len: cum[pts.length] };
}
/** Where `s` along a loop is (it wraps), and the way it runs there */
export function pointAlong(l: Loop, s: number): { at: Pt; dir: Pt } {
  const u = ((s % l.len) + l.len) % l.len;
  let lo = 0;
  let hi = l.pts.length;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (l.cum[mid] <= u) lo = mid;
    else hi = mid;
  }
  const [a, b] = [l.pts[lo], l.pts[(lo + 1) % l.pts.length]];
  const seg = l.cum[lo + 1] - l.cum[lo] || 1;
  const f = (u - l.cum[lo]) / seg;
  return { at: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], dir: [(b[0] - a[0]) / seg, (b[1] - a[1]) / seg] };
}
/** A heading (0: bow to +x) from a direction on the water */
export const yawOf = (dir: Pt) => Math.atan2(-dir[1], dir[0]);

/**
 * A long loop with round ends: eastward along `zn` from x0 to x1, round the east end, westward along `zs`, round
 * the west end (both ends half circles, `step` apart along it)
 */
export function stadium(x0: number, x1: number, zn: number, zs: number, step = 0.5): Pt[] {
  const r = (zs - zn) / 2;
  const mid = (zn + zs) / 2;
  const pts: Pt[] = [];
  const line = (xa: number, xb: number, z: number) => {
    const n = Math.max(1, Math.ceil(Math.abs(xb - xa) / step));
    for (let i = 0; i < n; i++) pts.push([xa + ((xb - xa) * i) / n, z]);
  };
  const arc = (cx: number, from: number, to: number) => {
    const n = Math.max(4, Math.ceil((Math.abs(to - from) * r) / step));
    for (let i = 0; i < n; i++) {
      const a = from + ((to - from) * i) / n;
      pts.push([cx + r * Math.cos(a), mid + r * Math.sin(a)]);
    }
  };
  line(x0, x1, zn);
  arc(x1, -Math.PI / 2, Math.PI / 2);
  line(x1, x0, zs);
  arc(x0, Math.PI / 2, (3 * Math.PI) / 2);
  return pts;
}

/** The ring highway's bridges' piers across the river (z): half way between the boats' lanes; and their half depth (world.ts draws them) */
export const BRIDGE_PIERS = [0, 1].map((k) => (BOAT_LANES[k] + BOAT_LANES[k + 1]) / 2);
export const PIER_HALF = 0.9;

/** A boat's size: its length, beam and how high its top stands over the water */
export interface Hull {
  len: number;
  beam: number;
  top: number;
}

/** The cruise boat: round the town's reach (eastward on the north line), its hull, its pace */
export const CRUISE = { loop: loopOf(stadium(-105, 26, 87.7, 114.3)), hull: { len: 5.6, beam: 1.7, top: 1.65 } as Hull, v: 2.0, offset: 40 };
/** The rowing eight: out and back west of the river bus's crossing */
export const CREW = { loop: loopOf(stadium(-184, -140, 106.8, 109.2)), hull: { len: 5.2, beam: 0.5, top: 0.75 } as Hull, v: 1.7, offset: 0 };
/** The dinghies: each round its own circle in the wide reach out west, its pace and way round, its sail's colour */
export const DINGHIES: { c: Pt; r: number; v: number; way: 1 | -1; sail: string }[] = (
  [
    [-300, 0, 5.5, 1.3, 1, '#ff5a8c'],
    [-262, 0, 4.5, 1.1, -1, '#2aabee'],
    [-318, 1, 5, 1.2, -1, '#ffd23f'],
    [-276, 1, 5.5, 1.4, 1, '#f3f2f7'],
  ] as [number, 0 | 1, number, number, 1 | -1, string][]
).map(([x, gap, r, v, way, sail]) => {
  // (half way between two lanes there: the lanes keep their place across the water as the banks wander, river.ts)
  const z = (laneAt(BOAT_LANES[gap], x) + laneAt(BOAT_LANES[gap + 1], x)) / 2;
  return { c: [x, z] as Pt, r, v, way, sail };
});
export const DINGHY: Hull = { len: 1.8, beam: 0.7, top: 2.2 };

/** Where a boat on a loop at pace v is at time t (seconds; `offset` along it at 0) */
export function onLoop(l: Loop, v: number, offset: number, t: number) {
  const p = pointAlong(l, offset + v * t);
  return { x: p.at[0], z: p.at[1], yaw: yawOf(p.dir) };
}
export const cruiseAt = (t: number) => onLoop(CRUISE.loop, CRUISE.v, CRUISE.offset, t);
export const crewAt = (t: number) => onLoop(CREW.loop, CREW.v, CREW.offset, t);
/** Dinghy i at time t: round its circle, heeling into it (`heel`, radians) */
export function dinghyAt(i: number, t: number) {
  const d = DINGHIES[i];
  const a = (d.v / d.r) * t * d.way + i * 1.7;
  const x = d.c[0] + d.r * Math.cos(a);
  const z = d.c[1] + d.r * Math.sin(a);
  // (the way round: the derivative of the circle, by the way it goes)
  const dir: Pt = [-Math.sin(a) * d.way, Math.cos(a) * d.way];
  return { x, z, yaw: yawOf(dir), heel: 0.12 + 0.06 * Math.sin(t * 0.3 + i) };
}

/** Everything here at time t, with its hull (the tests check them against everything else on the water) */
export function riverMovers(t: number): { id: string; x: number; z: number; yaw: number; hull: Hull }[] {
  return [
    { id: 'cruise', ...cruiseAt(t), hull: CRUISE.hull },
    { id: 'crew', ...crewAt(t), hull: CREW.hull },
    ...DINGHIES.map((_, i) => ({ id: `dinghy${i}`, ...dinghyAt(i, t), hull: DINGHY })),
  ];
}
/** A hull's corners on the water (bow and stern either side) */
export function hullCorners(x: number, z: number, yaw: number, h: Hull): Pt[] {
  const [c, s] = [Math.cos(yaw), -Math.sin(yaw)];
  const out: Pt[] = [];
  for (const u of [-h.len / 2, 0, h.len / 2]) for (const w of [-h.beam / 2, h.beam / 2]) out.push([x + u * c - w * s, z + u * s + w * c]);
  return out;
}
