/*
 * What's round the raised highway that the boot needs (docs/highway-plan.md Phase 4; DOM-free, tested in
 * tests/viaduct.test.ts): what's solid under its deck, the lamps up its ramps and the lights under it. The signs, the
 * sound walls and the murals are viasigns.ts (the drawing's chunk only, since Phase 9).
 *
 * - Under the deck (`UNDER`): car parks off the arterials in town (`park`: bays either side of the piers' line, cars in
 *   most, `UNDER_CARS`), storage lock-ups by the industrial land (`store`), basketball courts in The Trenches and by
 *   Lot 9 (`court`, `besideIn()`), and lights under the deck wherever a street passes under it (`UNDER_LIGHTS`, their
 *   pools at the boot); `UNDER_SOLIDS`.
 * - `RAMP_LAMPS`: street lamps up each ramp on its outer side, at its height.
 * - `exitBadge()`: where the world map puts an exit's number.
 */
import type { CarId } from './carspec';
import type { Box } from './solids';
import { fromHighway } from './highway';
import { PLAN, RING_MEETS, distToStreet, raised } from './streetplan';
import { TRACKS } from './metro';
import { inChannel } from './river';
import { TUNNEL } from './lot9';
import { ENDSWOOD_RECT } from './endswood';
import { WALK as STADIUM_WALK } from './stadium';

import { TRENCH_RECT } from './trenches';

import { YARDS_RECT } from './southfield';
import { DOCKS_RECT } from './docks';
import { onHills } from './terrain';
import { DECK_HALF, DECK_Y, GIRDER, RAMPS, RING_LEN, exitS, ringAt, ringPoint, ringS, sGap, type Exit, type Pt } from './viaduct';
import { PIERS } from './viapiers';
import { RAMP_PARAPET, rampSegs } from './viaground';

type Rect = [number, number, number, number];
const inRect = (r: Rect, x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;

/* ---------- Under the deck ---------- */

/** What's under the deck between two piers (s0 to s1 along the ring) */
export type UnderKind = 'park' | 'store' | 'court' | 'skate';
export interface Under {
  kind: UnderKind;
  s0: number;
  s1: number;
}
/** The shortest stretch a skate spot takes (docs/estate-plan.md Phase 6) */
export const SKATE_MIN = 11;
/** The ground under the deck kept clear across it (`m` in from its edges) */
const ACROSS = DECK_HALF - 0.4;
const UNDER_STREETS = PLAN.streets.filter((s) => !raised(s) && s.kind !== 'alley');
/** Is the ground under the deck from s0 to s1 clear: no street through it, no water or bank, the tunnel, the stadium's walk, the metro, the hills */
function clearUnder(s0: number, s1: number) {
  for (let s = s0; s <= s1 + 1e-6; s += 1)
    for (const o of [-ACROSS, 0, ACROSS]) {
      const [x, z] = ringPoint(s, o);
      if (inChannel(x, z, 2) || onHills(x, z)) return false;
      if (UNDER_STREETS.some((st) => distToStreet(st, [x, z]) < st.half + 2)) return false;
      if (Math.abs(x - TUNNEL.x) < 8 && z > TUNNEL.z0 - 4 && z < TUNNEL.z1 + 4) return false;
      if (Math.abs(x - STADIUM_WALK.x) < STADIUM_WALK.half + 3 && z > STADIUM_WALK.z1 - 2 && z < STADIUM_WALK.z0 + 2) return false;
      for (const t of Object.values(TRACKS)) for (const p of t.pts) if (Math.hypot(p[0] - x, p[1] - z) < 4) return false;
    }
  return true;
}
/** The stretches between piers, each as far as the next pier's head (a tile in from each) */
const WINDOWS: [number, number][] = PIERS.map((p, i) => {
  const next = PIERS[(i + 1) % PIERS.length];
  const s1 = next.s > p.s ? next.s : next.s + RING_LEN;
  return [p.s + 1.2, s1 - 1.2] as [number, number];
}).filter(([a, b]) => b - a > 6 && b < RING_LEN);
/** The land beside the deck either side at s (inside, -1; outside, 1), within 40 out */
export const besideIn = (s: number, rs: Rect[]) => [-1, 1].some((q) => [12, 25, 40].some((d) => rs.some((r) => inRect(r, ...ringPoint(s, q * d)))));
export const UNDER: Under[] = (() => {
  const out: Under[] = [];
  const parks = new Set<string>();
  let courts = 0;
  let ends = 0;
  for (const [s0, s1] of WINDOWS) {
    const mid = (s0 + s1) / 2;
    if (!clearUnder(s0, s1)) continue;
    // Courts under the deck by The Trenches and Lot 9 (every third stretch there)
    if (besideIn(mid, [TRENCH_RECT, ENDSWOOD_RECT])) {
      if (courts++ % 3 === 0 && s1 - s0 >= 10) out.push({ kind: 'court', s0, s1 });
      // (and between them by Endswood, a skate spot and lock-ups in turn: docs/estate-plan.md Phase 6)
      else if (besideIn(mid, [ENDSWOOD_RECT]) && s1 - s0 >= SKATE_MIN) out.push({ kind: ends++ % 2 === 0 ? 'skate' : 'store', s0, s1 });
      continue;
    }
    // Lock-ups by the industrial land: Southfield Yards, the Docks
    if (besideIn(mid, [YARDS_RECT, DOCKS_RECT])) {
      out.push({ kind: 'store', s0, s1 });
      continue;
    }
    // A car park the first stretch clear past an arterial passing under, in town (one each side of every other one)
    const meet = RING_MEETS.find((m) => Math.abs(sGap(ringS(m.at[0], m.at[1]).s, mid)) < 34);
    if (meet && RING_MEETS.indexOf(meet) % 2 === 0) {
      const side = Math.sign(sGap(ringS(meet.at[0], meet.at[1]).s, mid));
      const key = `${meet.id}:${side}`;
      if (!parks.has(key)) {
        parks.add(key);
        out.push({ kind: 'park', s0, s1 });
      }
    }
  }
  return out;
})();
/** A skate spot's pieces (ring coordinates: `s` along, `o` across from the piers' line): a ledge with a steel edge, a
 * manual pad, a flat rail and a quarter pipe at the far end */
export type SkatePart = { kind: 'ledge' | 'pad' | 'rail' | 'quarter'; s0: number; s1: number; o0: number; o1: number; h: number };
export function skateParts(u: Under): SkatePart[] {
  const { s0, s1 } = u;
  const mid = (s0 + s1) / 2;
  return [
    { kind: 'ledge', s0: s0 + 1, s1: s0 + 5, o0: 1.6, o1: 2.15, h: 0.45 },
    { kind: 'rail', s0: s0 + 1, s1: s0 + 4.5, o0: -2.6, o1: -2.5, h: 0.4 },
    { kind: 'pad', s0: mid - 0.2, s1: mid + 2.6, o0: -2.8, o1: -0.9, h: 0.25 },
    { kind: 'quarter', s0: s1 - 1.9, s1: s1 - 0.1, o0: -3.2, o1: 3.2, h: 1.1 },
  ];
}
/** A rect in ring coordinates as an axis-aligned box */
function ringRect(sa: number, sb: number, oa: number, ob: number, h: number): Box {
  const pts = [ringPoint(sa, oa), ringPoint(sb, oa), ringPoint(sa, ob), ringPoint(sb, ob)];
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1])), h];
}
/** A car park's bays along each side of the piers' line (o across, each `BAY` along) */
export const BAY = { len: 5.4, at: 2.85 };
/** The parked cars under the deck: [model, x, z, yaw, paint] (most bays taken, seeded) */
const MODELS: CarId[] = ['hatch', 'sedan', 'coupe', 'pickup', 'van', 'suv'];
const PAINTS = ['#c8c4d4', '#2a2838', '#7a2d3a', '#24507a', '#e8e4f8', '#3c6b4a', '#b8862e'];
export const UNDER_CARS: [CarId, number, number, number, string][] = UNDER.filter((u) => u.kind === 'park').flatMap((u, ui) => {
  const out: [CarId, number, number, number, string][] = [];
  const n = Math.floor((u.s1 - u.s0) / BAY.len);
  for (let k = 0; k < n; k++)
    for (const q of [-1, 1]) {
      const h = (ui * 31 + k * 7 + (q + 1) * 13) % 10;
      if (h < 3) continue;
      const s = u.s0 + (k + 0.5) * ((u.s1 - u.s0) / n);
      const r = ringAt(s);
      const [x, z] = ringPoint(s, q * BAY.at);
      // (nose along the ring, the way its carriageway overhead runs)
      out.push([MODELS[h % MODELS.length], x, z, Math.atan2(-r.tz * -q, r.tx * -q), PAINTS[(h + k) % PAINTS.length]]);
    }
  return out;
});
/** A lock-up's size: along the ring, across it (from the piers' line out), its height under the girder */
export const LOCKUP = { w: 3, d: 2.5, h: 2.3, from: 1.5 };
/** What's solid under the deck: the lock-ups, the parked cars, the courts' hoop posts */
export const UNDER_SOLIDS: Box[] = [
  ...UNDER.filter((u) => u.kind === 'store').flatMap((u) => {
    const n = Math.floor((u.s1 - u.s0) / (LOCKUP.w + 0.2));
    const out: Box[] = [];
    for (let k = 0; k < n; k++)
      for (const q of [-1, 1]) {
        const s = u.s0 + (k + 0.5) * ((u.s1 - u.s0) / n);
        const pts = [ringPoint(s - LOCKUP.w / 2, q * LOCKUP.from), ringPoint(s + LOCKUP.w / 2, q * LOCKUP.from), ringPoint(s - LOCKUP.w / 2, q * (LOCKUP.from + LOCKUP.d)), ringPoint(s + LOCKUP.w / 2, q * (LOCKUP.from + LOCKUP.d))];
        out.push([Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1])), LOCKUP.h]);
      }
    return out;
  }),
  ...UNDER_CARS.map(([, x, z, yaw]): Box => {
    // (a car's footprint, about 4 by 1.8, turned to its yaw)
    const [hx, hz] = [Math.abs(Math.cos(yaw)) * 2 + Math.abs(Math.sin(yaw)) * 0.9, Math.abs(Math.sin(yaw)) * 2 + Math.abs(Math.cos(yaw)) * 0.9];
    return [x - hx, z - hz, x + hx, z + hz, 1.3];
  }),
  ...UNDER.filter((u) => u.kind === 'skate').flatMap((u) => skateParts(u).map((p) => ringRect(p.s0, p.s1, p.o0, p.o1, p.h))),
  ...UNDER.filter((u) => u.kind === 'court').map((u): Box => {
    const [x, z] = ringPoint(u.s1 - 0.6, 0);
    return [x - 0.15, z - 0.15, x + 0.15, z + 0.15, 2.4];
  }),
];
/** The lights under the deck over every street passing under it (x, z: their pools on the street), on the soffit */
export const UNDER_LIGHTS: Pt[] = RING_MEETS.flatMap((m) => {
  const s = ringS(m.at[0], m.at[1]).s;
  return [-2, 2].map((o) => ringPoint(s, o));
});
/** The soffit's height over the ground (where the lights hang) */
export const SOFFIT_Y = DECK_Y - GIRDER;

/* ---------- Up the ramps: their lamps ---------- */

/** Between a ramp's lamps */
export const RAMP_LAMP_GAP = 22;
/** The ramps' lamps (x, z, the way the arm faces, the foot's height): on the outer side, up the climb, none over the deck or at the foot */
export const RAMP_LAMPS: [number, number, number, number][] = RAMPS.flatMap((r) => {
  const out: [number, number, number, number][] = [];
  let run = RAMP_LAMP_GAP / 2;
  for (const sg of rampSegs(r)) {
    const l = Math.hypot(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1]);
    run += l;
    if (run < RAMP_LAMP_GAP || sg.foot) continue;
    const [nx, nz] = [-(sg.b[1] - sg.a[1]) / l, (sg.b[0] - sg.a[0]) / l];
    // (the side away from the ring, where it has a parapet)
    const out1 = fromHighway(sg.a[0] + nx, sg.a[1] + nz) > fromHighway(sg.a[0], sg.a[1]);
    const sd = out1 ? 1 : -1;
    if (!(sd > 0 ? sg.left : sg.right) || fromHighway(sg.a[0], sg.a[1]) < DECK_HALF + 1) continue;
    run = 0;
    const w = RAMP_PARAPET.out + 0.15;
    const [x, z] = [sg.a[0] + nx * sd * w, sg.a[1] + nz * sd * w];
    // (the arm reaching in over the ramp: towards -n)
    out.push([x, z, Math.atan2(nz * sd, -nx * sd), r.ys[sg.k - 1] + 0.02]);
  }
  return out;
});

/** Where the world map puts an exit's number: by the deck on its ramps' side, a little out */
export const exitBadge = (e: Exit): Pt => ringPoint(exitS(e) + e.side * 22, DECK_HALF + 10);
