/*
 * The underground's south line as data (docs/south-plan.md Phase 4, step 4d; the owner's calls, 2026-11-18 and -19):
 * one line from The Trenches (the change to the raised metro by its Trenches station) under the ring road to the
 * Circus, Lot 9, Aldwyn's Green and the High Road by Degen's gates; twin tracks either side of an island platform at
 * each station, deep under everything else below ground. A station: a ticket hall a flight down (the Circus's
 * subways' level), an escalator from the hall's end down to its platform, and its way in from the street (stairs down
 * from by the sidewalk under a roundel, the High Road's from inside its station building, the Circus's from its sunken
 * plaza). Every piece walkable as a passage of the underground kit (underground.ts: levels, so a hall stands over its
 * line). Free to ride, as the raised metro is. DOM-free, tested in tests/southline.test.ts; drawn from Phase 4e.
 */
import { CIRCUS, type Pt } from './south';
import { CEIL, FLOOR } from './circus';
import { GROUND_Y, cutOf, pointOf, radial, straight, type Passage } from './underground';
import { SHOPS } from './highroad';
import { STATIONS as RAISED } from './metro';
import { southLift } from './southground';
import { SLAB_Y as SLAB_TOP } from './endswood';
import { PLAN } from './streetplan';
import { inside } from './streetfaces';
import { BUILT, baked } from './baked';

/** The levels: the ticket halls' (the Circus's subways' floor and ceiling), the platforms' and the tunnels' crowns */
export const HALL_Y = FLOOR;
export const HALL_CEIL = CEIL;
export const PLAT_Y = -6.4;
export const PLAT_CEIL = -4.0;
/** The tunnels' top (their crown's outside): everything else below ground stays over it */
export const TUNNEL_TOP = PLAT_CEIL + 0.5;
/** Across the line: the island platform's walkable half, each track's middle out from the line, the tunnel's half */
export const PLAT_HALF = 1.5;
export const TRACK_OFF = 2.6;
export const TUNNEL_HALF = TRACK_OFF + 1.4;
/** Along the line: a platform's length, an escalator's run (about 30 degrees down), a hall's length and half width */
export const PLAT_LEN = 26;
export const ESC_RUN = 7.8;
export const ESC_HALF = 1.0;
export const HALL_LEN = 10;
export const HALL_HALF = 2.8;
/** The stairs from the street: their run (steps down a flight) and the walkable half */
export const STAIR_RUN = 3.8;
export const STAIR_HALF = 1.0;
/** The line's colour (its band on the stations' walls, its name boards' edge, the station building's band; on the map later) */
export const LINE_COLOUR = '#2bb3c0';
/** The stairs' slope from the street down a flight to a hall (a rise over a run) */
export const STAIR_SLOPE = (GROUND_Y - FLOOR) / 3.8;
/** The surface at x, z at street level: a block's slab (its top) or the open ground, on the south's rolling ground */
export function surfaceAt(x: number, z: number) {
  const onSlab = PLAN.slabs.some((slab) => inside(slab as Pt[], [x, z]));
  return (onSlab ? SLAB_TOP : GROUND_Y) + southLift(x, z);
}
/** How tight the line may bend (a tube train's) */
export const MIN_R = 20;

export type StationId = 'trenches' | 'circus' | 'lot9' | 'aldwyns' | 'highroad';
/** The raised metro's Trenches station (metro.ts), the High Road's station building (highroad.ts) */
const RAISED_TRENCHES = RAISED.find((s) => s.id === 'trenches')!;
const BUILDING = SHOPS.find((s) => s.kind === 'station')!;
/** Inside the station building: from its west end, half way back from its front, down along its frontage (east) */
const BUILDING_ALONG: Pt = [-BUILDING.face[1], BUILDING.face[0]];
const BUILDING_FWD: Pt = BUILDING_ALONG[0] > 0 ? BUILDING_ALONG : [-BUILDING_ALONG[0], -BUILDING_ALONG[1]];
/** Inside the station building (highroad.ts `STATION_DOOR`): a landing inside its door at its east end, the stairs from
 * `at` (along its frontage from its middle, east +) down west along it, as wide as the building is deep inside, then on
 * level under the street into the hall's far end (clear of its escalator at the other) */
export const BUILDING_STAIRS = { at: 1.0, half: 1.5 };
const local = (x: number, z: number): Pt => [BUILDING.at[0] + BUILDING_FWD[0] * x + BUILDING.face[0] * z, BUILDING.at[1] + BUILDING_FWD[1] * x + BUILDING.face[1] * z];
const BUILDING_TOP: Pt = local(BUILDING_STAIRS.at, -BUILDING.d / 2);
const BUILDING_DEG = (Math.atan2(BUILDING_FWD[1], BUILDING_FWD[0]) * 180) / Math.PI;
/** The High Road's platform on the building's axis, west of it: its hall's far end just west of the building */
const HIGHROAD_AT: Pt = local(-BUILDING.w / 2 - 0.5 - (HALL_LEN + ESC_RUN - 2) - PLAT_LEN / 2, -BUILDING.d / 2);
/** Where each station's stairs start at street level (clear ground: tests/southline.test.ts); they run down towards its hall */
const TOPS: Record<'trenches' | 'lot9' | 'aldwyns', Pt> = { trenches: [-100.5, 181.6], lot9: [-115.5, 472], aldwyns: [-229.5, 458.5] };

/**
 * A station as laid: its platform's middle and the way the line runs through it (degrees, from +x towards +z); its
 * hall at the platform's start or its end; its way in (`kind`): stairs down from `top` heading `deg` into the hall,
 * through the station building, or from the Circus's plaza
 */
interface StationSpec {
  id: StationId;
  name: string;
  at: Pt;
  deg: number;
  hall: 'start' | 'end';
  way: { kind: 'stairs' | 'building' | 'plaza'; top: Pt; deg: number };
}
const SPECS: StationSpec[] = [
  // Under The Trenches' el street and The Block south of it, its hall under The Block; its stairs down in The Block's
  // plaza beside the raised station's stair tower (the change between them, a few steps), clear of its playground
  { id: 'trenches', name: 'The Trenches', at: [RAISED_TRENCHES.door.x, 170], deg: 90, hall: 'end', way: { kind: 'stairs', top: TOPS.trenches, deg: 0 } },
  // Under the Circus's west side, its hall reached from the sunken plaza (west, between its subways)
  { id: 'circus', name: 'Circus', at: [CIRCUS.x - 14, 441], deg: 92, hall: 'start', way: { kind: 'plaza', top: [CIRCUS.x, CIRCUS.z], deg: 180 } },
  // Under Lot 9's north side, its hall by the hole in its fence, its stairs down there
  { id: 'lot9', name: 'Lot 9', at: [-135, 495], deg: 150, hall: 'start', way: { kind: 'stairs', top: TOPS.lot9, deg: 0 } },
  // By St Aldwyn's, its hall under the churchyard's east side; its stairs down off the sidewalk of the street along the
  // churchyard's west side, its way on under the churchyard
  { id: 'aldwyns', name: "Aldwyn's Green", at: [-212, 443], deg: 240, hall: 'start', way: { kind: 'stairs', top: TOPS.aldwyns, deg: 0 } },
  // Under the High Road by Degen's gates, its hall past the station building, its stairs down inside it along its front
  { id: 'highroad', name: 'High Road', at: HIGHROAD_AT, deg: BUILDING_DEG, hall: 'end', way: { kind: 'building', top: BUILDING_TOP, deg: BUILDING_DEG + 180 } },
];

/* ---------- The line ---------- */

const rad = (d: number) => (d * Math.PI) / 180;
const dir = (d: number): Pt => [Math.cos(rad(d)), Math.sin(rad(d))];
const add = (p: Pt, d: Pt, k: number): Pt => [p[0] + d[0] * k, p[1] + d[1] * k];
/** The bends' radius between stations (over the tightest a tube train takes) */
export const BEND_R = MIN_R + 5;
const TAU = Math.PI * 2;
const mod = (a: number) => ((a % TAU) + TAU) % TAU;
/**
 * The shortest way from a (heading da) to b (heading db) turning no tighter than `r` (a Dubins path: an arc, a straight
 * or a third arc, an arc), a point every `step`. Headings in degrees from +x towards +z; a left turn turns from +x
 * towards +z.
 */
export function bend(a: Pt, da: number, b: Pt, db: number, r = BEND_R, step = 1): Pt[] {
  const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
  const d = Math.hypot(dx, dz) / r;
  const th = Math.atan2(dz, dx);
  const al = mod(rad(da) - th);
  const be = mod(rad(db) - th);
  const [sa, sb, ca, cb, cab] = [Math.sin(al), Math.sin(be), Math.cos(al), Math.cos(be), Math.cos(al - be)];
  type Word = { kinds: string; t: number; p: number; q: number };
  const words: Word[] = [];
  let p2 = 2 + d * d - 2 * cab + 2 * d * (sa - sb);
  if (p2 >= 0) {
    const t1 = Math.atan2(cb - ca, d + sa - sb);
    words.push({ kinds: 'LSL', t: mod(-al + t1), p: Math.sqrt(p2), q: mod(be - t1) });
  }
  p2 = 2 + d * d - 2 * cab + 2 * d * (sb - sa);
  if (p2 >= 0) {
    const t1 = Math.atan2(ca - cb, d - sa + sb);
    words.push({ kinds: 'RSR', t: mod(al - t1), p: Math.sqrt(p2), q: mod(-be + t1) });
  }
  p2 = -2 + d * d + 2 * cab + 2 * d * (sa + sb);
  if (p2 >= 0) {
    const p = Math.sqrt(p2);
    const t2 = Math.atan2(-ca - cb, d + sa + sb) - Math.atan2(-2, p);
    words.push({ kinds: 'LSR', t: mod(-al + t2), p, q: mod(-be + t2) });
  }
  p2 = d * d - 2 + 2 * cab - 2 * d * (sa + sb);
  if (p2 >= 0) {
    const p = Math.sqrt(p2);
    const t2 = Math.atan2(ca + cb, d - sa - sb) - Math.atan2(2, p);
    words.push({ kinds: 'RSL', t: mod(al - t2), p, q: mod(be - t2) });
  }
  let k = (6 - d * d + 2 * cab + 2 * d * (sa - sb)) / 8;
  if (Math.abs(k) <= 1) {
    const p = mod(TAU - Math.acos(k));
    const t = mod(al - Math.atan2(ca - cb, d - sa + sb) + p / 2);
    words.push({ kinds: 'RLR', t, p, q: mod(al - be - t + p) });
  }
  k = (6 - d * d + 2 * cab + 2 * d * (sb - sa)) / 8;
  if (Math.abs(k) <= 1) {
    const p = mod(TAU - Math.acos(k));
    const t = mod(-al - Math.atan2(ca - cb, d + sa - sb) + p / 2);
    words.push({ kinds: 'LRL', t, p, q: mod(be - al - t + p) });
  }
  const best = words.reduce((m, w) => (w.t + w.p + w.q < m.t + m.p + m.q ? w : m));
  // (walked out a little at a time: an arc exactly, a straight straight)
  const out: Pt[] = [];
  let [x, z, h] = [a[0], a[1], rad(da)];
  let carry = 0;
  [best.t, best.p, best.q].forEach((len, i) => {
    const kind = best.kinds[i];
    let left = len * r;
    while (left > 1e-9) {
      const ds = Math.min(left, 0.25);
      left -= ds;
      if (kind === 'S') [x, z] = [x + ds * Math.cos(h), z + ds * Math.sin(h)];
      else if (kind === 'L') {
        const nh = h + ds / r;
        [x, z, h] = [x + r * (Math.sin(nh) - Math.sin(h)), z + r * (Math.cos(h) - Math.cos(nh)), nh];
      } else {
        const nh = h - ds / r;
        [x, z, h] = [x + r * (Math.sin(h) - Math.sin(nh)), z + r * (Math.cos(nh) - Math.cos(h)), nh];
      }
      carry += ds;
      if (carry >= step - 1e-9) {
        out.push([x, z]);
        carry = 0;
      }
    }
  });
  out.push([b[0], b[1]]);
  return out;
}
/** Each station's run along its line: before the platform (its hall and escalator, if they're at its start) and after */
const LEAD = HALL_LEN + ESC_RUN - 2;
/** The line from end to end, a point a metre or so: every station's straight (hall, escalator, platform), the bends between */
function layLine(): Pt[] {
  const out: Pt[] = [];
  SPECS.forEach((st, i) => {
    const d = dir(st.deg);
    const [pre, post] = st.hall === 'start' ? [LEAD, 0] : [0, LEAD];
    const a = add(st.at, d, -(PLAT_LEN / 2 + pre));
    const b = add(st.at, d, PLAT_LEN / 2 + post);
    if (i === 0) out.push(a);
    else {
      // (the last point of a bend is the next straight's start: no doubled point)
      const bent = bend(out[out.length - 1], SPECS[i - 1].deg, a, st.deg);
      out.push(...bent.slice(0, -1), a);
    }
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  });
  return out;
}
/** How far along a line each of its points is */
const measure = (line: Pt[]) => line.reduce<number[]>((acc, p, i) => (acc.push(i ? acc[i - 1] + Math.hypot(p[0] - line[i - 1][0], p[1] - line[i - 1][1]) : 0), acc), []);
/** The point `s` along a line (its points measured `ls`), and the way it's heading there */
function lineAtIn(line: Pt[], ls: number[], s: number): { at: Pt; dir: Pt } {
  const t = Math.max(0, Math.min(ls[ls.length - 1], s));
  let i = 1;
  while (i < line.length - 1 && ls[i] < t) i++;
  const [a, b] = [line[i - 1], line[i]];
  const l = ls[i] - ls[i - 1] || 1;
  const k = (t - ls[i - 1]) / l;
  return { at: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], dir: [(b[0] - a[0]) / l, (b[1] - a[1]) / l] };
}
/** How far along a line its nearest point to p is */
function sOnIn(line: Pt[], ls: number[], p: Pt) {
  let best = { d: Infinity, s: 0 };
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]];
    const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
    const l2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / l2));
    const d = Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t);
    if (d < best.d) best = { d, s: ls[i - 1] + Math.sqrt(l2) * t };
  }
  return best.s;
}

/* ---------- The stations ---------- */

export interface Station {
  id: StationId;
  name: string;
  /** Its platform's middle and the line's way through it; how far along the line its platform starts and ends */
  at: Pt;
  deg: number;
  p0: number;
  p1: number;
  /** Its pieces in the kit: the platform, the hall, the escalator between them, and its way in from the street */
  platform: Passage;
  hall: Passage;
  escalator: Passage;
  way: Passage;
  /** The station building's landing inside its door (the High Road's), level at its floor */
  landing: Passage | null;
  /** Its way in's kind and where it starts at street level (the top of the stairs, the building's door, the plaza) */
  entrance: StationSpec['way'];
}
/** Every station laid on the line */
const layStations = (line: Pt[], ls: number[]): Station[] => SPECS.map((st) => {
  const s = sOnIn(line, ls, st.at);
  const [p0, p1] = [s - PLAT_LEN / 2, s + PLAT_LEN / 2];
  const { at } = lineAtIn(line, ls, s);
  // (the passages run along the line's straight through the station: measured from its platform's middle)
  const run = (id: string, a0: number, a1: number, half: number, floor: number, ceil: number, y0 = floor, y1 = floor, ramp0 = a0, ramp1 = a1): Passage => {
    const p = straight(id, at[0], at[1], st.deg, { a0, ramp0, roof0: a0, roof1: a1, ramp1, a1, half, wall: 0.3, floor, ceil, rail: 0 });
    return { ...p, y0, y1 };
  };
  const platform = run(`${st.id}-platform`, -PLAT_LEN / 2, PLAT_LEN / 2, PLAT_HALF, PLAT_Y, PLAT_CEIL);
  // (the hall and the escalator: before the platform's start, the escalator coming down on to it; or after its end)
  const start = st.hall === 'start';
  const sign = start ? -1 : 1;
  const edge = (sign * PLAT_LEN) / 2;
  const escTop = edge + sign * (ESC_RUN - 2);
  const escBottom = edge - sign * 2;
  const escalator = start
    ? run(`${st.id}-escalator`, escTop, escBottom, ESC_HALF, PLAT_Y, HALL_CEIL, HALL_Y, PLAT_Y, escTop + ESC_RUN, escBottom)
    : run(`${st.id}-escalator`, escBottom, escTop, ESC_HALF, PLAT_Y, HALL_CEIL, PLAT_Y, HALL_Y, escBottom, escTop - ESC_RUN);
  const [h0, h1] = start ? [escTop - HALL_LEN, escTop + 0.5] : [escTop - 0.5, escTop + HALL_LEN];
  const hall = run(`${st.id}-hall`, h0, h1, HALL_HALF, HALL_Y, HALL_CEIL);
  // The way in: stairs down from the street, a flight then level into the hall's middle
  const hallMid = pointOf(hall, (hall.a0 + hall.a1) / 2);
  let way: Passage;
  if (st.way.kind === 'plaza') {
    // (out of the Circus's sunken plaza, level, between its subways, under the carriageway to the hall)
    const reach = Math.hypot(hallMid[0] - CIRCUS.x, hallMid[1] - CIRCUS.z);
    way = { ...radial(`${st.id}-way`, CIRCUS.x, CIRCUS.z, st.way.deg, { from: 4.6, roof0: 7.5, roof1: reach + 1, rampAt: reach + 1, to: reach + 1, half: STAIR_HALF + 0.3, wall: 0.25, floor: HALL_Y, ceil: HALL_CEIL, rail: 0.9 }), y0: HALL_Y, y1: HALL_Y };
  } else {
    const [tx, tz] = st.way.top;
    // (stairs aim at the hall's middle; the building's run along its frontage)
    const deg = st.way.kind === 'stairs' ? (Math.atan2(hallMid[1] - tz, hallMid[0] - tx) * 180) / Math.PI : st.way.deg;
    st.way.deg = deg;
    const a = rad(deg);
    const reach = (hallMid[0] - tx) * Math.cos(a) + (hallMid[1] - tz) * Math.sin(a);
    const half = st.way.kind === 'building' ? BUILDING_STAIRS.half : STAIR_HALF;
    // (from the surface at its top: the street's, a block's slab, the south's rolling ground, Aldwyn's Green up on its
    // hill; inside the station building, from its floor, highroad.ts `base`), a flight as long as it takes to keep the
    // stairs' slope, longer from higher up
    const y0 = st.way.kind === 'building' ? BUILDING.base : surfaceAt(tx, tz);
    const run = Math.max(STAIR_RUN, (y0 - HALL_Y) / STAIR_SLOPE);
    const p = straight(`${st.id}-way`, tx, tz, deg, { a0: 0, ramp0: run, roof0: run, roof1: reach + 1, ramp1: reach + 1, a1: reach + 1, half, wall: 0.25, floor: HALL_Y, ceil: HALL_CEIL, rail: 0.9 });
    way = { ...p, y0, y1: HALL_Y };
  }
  // (the station building's landing inside its door, level at its floor, up to the stairs' top)
  const landing =
    st.way.kind === 'building'
      ? (() => {
          const [lx, lz] = local((BUILDING.w / 2 - 0.15 + BUILDING_STAIRS.at) / 2, -BUILDING.d / 2);
          const l = (BUILDING.w / 2 - 0.15 - BUILDING_STAIRS.at) / 2;
          const q = straight(`${st.id}-landing`, lx, lz, st.way.deg, { a0: -l, ramp0: -l, roof0: -l, roof1: -l, ramp1: l + 0.1, a1: l + 0.1, half: BUILDING.d / 2 - 0.25, wall: 0.1, floor: BUILDING.base, ceil: HALL_CEIL, rail: 0 });
          return { ...q, roofs: [] as [number, number][], y0: BUILDING.base, y1: BUILDING.base };
        })()
      : null;
  return { id: st.id, name: st.name, at, deg: st.deg, p0, p1, platform, hall, escalator, way, landing, entrance: { ...st.way } };
});

/** The line and its stations, worked out when the site is built (baked.ts: the bends' and stations' laying stays out
 * of the boot) */
const LAID = baked('southline', BUILT ? undefined : () => {
  const line = layLine();
  return { line, stations: layStations(line, measure(line)) };
});
export const LINE: Pt[] = LAID.line;
/** How far along the line each point is */
export const LINE_S: number[] = measure(LINE);
export const LINE_LENGTH = LINE_S[LINE_S.length - 1];
/** The point `s` along the line, and the way it's heading there */
export const lineAt = (s: number) => lineAtIn(LINE, LINE_S, s);
/** How far along the line its nearest point to p is */
export const sOn = (p: Pt) => sOnIn(LINE, LINE_S, p);
export const SOUTH_STATIONS: Station[] = LAID.stations;
export const stationOf = (id: StationId) => SOUTH_STATIONS.find((s) => s.id === id)!;
/** Every walkable piece of a station */
export const piecesOf = (s: Station): Passage[] => [s.platform, s.hall, s.escalator, s.way, ...(s.landing ? [s.landing] : [])];
export const LINE_PASSAGES: Passage[] = SOUTH_STATIONS.flatMap(piecesOf);
/** The stations built (the south plan's 4e: the High Road's; 4f, the rest): walked (groundheight.ts `UNDER`), drawn
 * (line3d.ts), their stairs cut out of the ground */
export const BUILT_STATIONS: StationId[] = ['trenches', 'circus', 'lot9', 'aldwyns', 'highroad'];
export const BUILT_PASSAGES: Passage[] = SOUTH_STATIONS.filter((s) => BUILT_STATIONS.includes(s.id)).flatMap(piecesOf);
/** Each built station's stairs' opening (from the street: its flight, walls and all), cut out of the slab and the ground */
export const STAIR_CUTS: Pt[][] = SOUTH_STATIONS.filter((s) => BUILT_STATIONS.includes(s.id) && s.entrance.kind !== 'plaza').map((s) => cutOf(s.way, s.way.a0, s.way.ramp0));
/** Where a stairs' opening isn't on a block's slab (Lot 9's, on its open ground): the box round it the grass is cut from
 * (underpasses.ts `GROUND_HOLES`) less the opening, laid back over in the ground's own colour (line3d.ts) */
export const STAIR_INFILL: { box: Pt[]; cut: Pt[] }[] = STAIR_CUTS.filter((c) => !c.every((p) => PLAN.slabs.some((slab) => inside(slab as Pt[], p)))).map((cut) => {
  const xs = cut.map((p) => p[0]);
  const zs = cut.map((p) => p[1]);
  const [x0, z0, x1, z1] = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
  return { box: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], cut };
});
