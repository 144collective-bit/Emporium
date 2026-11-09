/*
 * The raised highway's signs and what's round it (docs/highway-plan.md Phase 4, the owner's picks; DOM-free, tested in
 * tests/viaduct.test.ts). Made-up names only (the exits' own), no numbers but the exits'.
 *
 * - `GANTRIES`: green gantries over the carriageway before every off-ramp: one well ahead (`advance`), one where it
 *   leaves (`exit`), each over its side's two lanes, kept clear of the metro where it rides over the deck and of the
 *   deck's lamps. `RAMP_SIGNS`: a sign by every on-ramp's foot.
 * - `SOUND_WALLS`: panels on the deck's parapet past homes (Sunridge, The Trenches, Lot 9, Uptown North), on the side
 *   facing them, broken where a ramp runs alongside or tapers in, and under the metro.
 * - Under the deck (`UNDER`): car parks off the arterials in town (`park`: bays either side of the piers' line, cars in
 *   most, `UNDER_CARS`), storage lock-ups by the industrial land (`store`), basketball courts in The Trenches and by
 *   Lot 9 (`court`), murals on the piers there (`MURALS`), and lights under the deck wherever a street passes under it
 *   (`UNDER_LIGHTS`, their pools at the boot).
 * - `RAMP_LAMPS`: street lamps up each ramp on its outer side, at its height.
 * - `exitBadge()`: where the world map puts an exit's number.
 */
import type { CarId } from './carspec';
import type { Box } from './solids';
import { fromHighway } from './highway';
import { PLAN, RING_MEETS, distToStreet, raised } from './streetplan';
import { TRACKS } from './metro';
import { inChannel } from './river';
import { TUNNEL, LOT9_RECT } from './lot9';
import { WALK as STADIUM_WALK } from './stadium';
import { SUNRIDGE_RECT } from './sunridge';
import { TRENCH_RECT } from './trenches';
import { NORTH_RECT } from './uptownnorth';
import { YARDS_RECT } from './southfield';
import { DOCKS_RECT } from './docks';
import { onHills } from './terrain';
import { BESIDE, DECK_HALF, DECK_Y, EXITS, GIRDER, OUTER_LANE, RAMPS, RAMP_HALF, RING_LEN, exitS, ringAt, ringPoint, ringS, sGap, wrapS, type Exit, type Pt } from './viaduct';
import { DECK_LAMPS, PIERS } from './viapiers';
import { RAMP_PARAPET, deckGap, rampAt, rampSegs } from './viaground';
import { ROAD } from './palette';

type Rect = [number, number, number, number];
const inRect = (r: Rect, x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;

/** Where along the ring the metro rides over the deck (gantries and sound walls keep clear) */
export const METRO_S: number[] = (() => {
  const out: number[] = [];
  for (const t of Object.values(TRACKS)) {
    let inside = false;
    for (let i = 0; i <= Math.ceil(t.len); i++) {
      const k = Math.min(i, t.len);
      let p: Pt = t.pts[0];
      for (let j = 1; j < t.pts.length; j++)
        if (t.cum[j] >= k) {
          const f = (k - t.cum[j - 1]) / (t.cum[j] - t.cum[j - 1] || 1);
          p = [t.pts[j - 1][0] + (t.pts[j][0] - t.pts[j - 1][0]) * f, t.pts[j - 1][1] + (t.pts[j][1] - t.pts[j - 1][1]) * f];
          break;
        }
      const on = fromHighway(p[0], p[1]) < DECK_HALF + 1;
      if (on && !inside) out.push(ringS(p[0], p[1]).s);
      inside = on;
    }
  }
  return out;
})();
const nearMetro = (s: number, m: number) => METRO_S.some((ms) => Math.abs(sGap(s, ms)) < m);

/* ---------- Gantries ---------- */

/** A gantry's beam (its underside over the deck), the panel's size, the clear it keeps round the metro and the lamps */
export const GANTRY = { under: 3.1, top: 4.5, panel: { w: 3.6, h: 1.15 }, metro: 18, lamp: 3 };
export interface Gantry {
  id: string;
  exit: number;
  /** The carriageway it's over: inside (-1, clockwise) or outside (+1, anticlockwise) */
  q: 1 | -1;
  s: number;
  kind: 'advance' | 'exit';
  /** The way its traffic runs along the ring (its panel faces it) */
  dir: 1 | -1;
}
/** The exits' names (the signs read them), their made-up copy */
export const EXIT_SIGNS: { n: number; name: string }[] = EXITS.map((e) => ({ n: e.n, name: e.name }));
export const GANTRIES: Gantry[] = RAMPS.filter((r) => r.kind === 'off').flatMap((r): Gantry[] => {
  const dir = r.q < 0 ? 1 : -1;
  const sd = ringS(r.pts[0][0], r.pts[0][1]).s;
  const place = (want: number) => {
    // (nudged up or down the road off the metro and the deck's lamps, the nearest clear spot)
    for (let k = 0; k < 40; k++)
      for (const sg of k ? [-1, 1] : [1]) {
        const s = wrapS(want - dir * k * sg);
        const lamp = DECK_LAMPS.some(([x, z]) => Math.abs(sGap(ringS(x, z).s, s)) < GANTRY.lamp);
        if (!nearMetro(s, GANTRY.metro) && !lamp) return s;
      }
    return null;
  };
  const out: Gantry[] = [];
  for (const [kind, back] of [
    ['advance', 60],
    ['exit', 5],
  ] as const) {
    const s = place(sd - dir * back);
    if (s !== null) out.push({ id: `${r.id}-${kind}`, exit: r.exit, q: r.q, s, kind, dir });
  }
  return out;
});

/** A sign by each on-ramp's foot, outside its parapet a few tiles up it (x, z, the way it faces, its exit) */
export const RAMP_SIGNS: { exit: number; at: Pt; face: Pt }[] = RAMPS.filter((r) => r.kind === 'on').map((r) => {
  const k = Math.min(r.pts.length - 2, 8);
  const [a, b] = [r.pts[k], r.pts[k + 1]];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const [ux, uz] = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  // (on its side away from the ring, facing the traffic coming up from its foot)
  let n: Pt = [-uz, ux];
  if (fromHighway(a[0] + n[0], a[1] + n[1]) < fromHighway(a[0], a[1])) n = [-n[0], -n[1]];
  const w = RAMP_PARAPET.out + 0.7;
  return { exit: r.exit, at: [a[0] + n[0] * w, a[1] + n[1] * w], face: [-ux, -uz] };
});

/* ---------- Sound walls ---------- */

/** The panels over the parapet (their top over the deck) and the shortest run worth one */
export const SOUND_WALL = { top: 2.6, min: 16 };
/** The homes the walls face: Sunridge, The Trenches, Lot 9, Uptown North */
const HOMES: Rect[] = [SUNRIDGE_RECT, TRENCH_RECT, LOT9_RECT, NORTH_RECT];
export const SOUND_WALLS: { q: 1 | -1; s0: number; s1: number }[] = (() => {
  const out: { q: 1 | -1; s0: number; s1: number }[] = [];
  for (const q of [-1, 1] as const) {
    let from: number | null = null;
    const STEP = 2;
    for (let s = 0; s <= RING_LEN; s += STEP) {
      const home = [10, 20, 32].some((d) => HOMES.some((r) => inRect(r, ...ringPoint(s, q * (DECK_HALF + d)))));
      const along = rampAt(...ringPoint(s, q * BESIDE));
      const ok = home && !nearMetro(s, 8) && ![-6, 0, 6].some((d) => deckGap(q, wrapS(s + d))) && !(along && along.d < RAMP_HALF + 0.5);
      if (ok && from === null) from = s;
      if ((!ok || s + STEP > RING_LEN) && from !== null) {
        if (s - from >= SOUND_WALL.min) out.push({ q, s0: from, s1: s });
        from = null;
      }
    }
  }
  return out;
})();
/** Is there a sound wall on side q at s */
export const soundWall = (q: 1 | -1, s: number) => SOUND_WALLS.some((w) => w.q === q && s >= w.s0 && s <= w.s1);

/* ---------- Under the deck ---------- */

/** What's under the deck between two piers (s0 to s1 along the ring) */
export type UnderKind = 'park' | 'store' | 'court';
export interface Under {
  kind: UnderKind;
  s0: number;
  s1: number;
}
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
const besideIn = (s: number, rs: Rect[]) => [-1, 1].some((q) => [12, 25, 40].some((d) => rs.some((r) => inRect(r, ...ringPoint(s, q * d)))));
export const UNDER: Under[] = (() => {
  const out: Under[] = [];
  const parks = new Set<string>();
  let courts = 0;
  for (const [s0, s1] of WINDOWS) {
    const mid = (s0 + s1) / 2;
    if (!clearUnder(s0, s1)) continue;
    // Courts under the deck by The Trenches and Lot 9 (every third stretch there)
    if (besideIn(mid, [TRENCH_RECT, LOT9_RECT])) {
      if (courts++ % 3 === 0 && s1 - s0 >= 10) out.push({ kind: 'court', s0, s1 });
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
/** A car park's bays along each side of the piers' line (o across, each `BAY` along) */
export const BAY = { len: 5.4, at: 2.85 };
/** The parked cars under the deck: [model, x, z, yaw, paint] (most bays taken, seeded) */
const MODELS: CarId[] = ['hatch', 'sedan', 'coupe', 'pickup', 'van', 'suv'];
const PAINTS = ['#c8c4d4', '#2a2838', '#7a2d3a', '#24507a', ROAD.zebra, '#3c6b4a', '#b8862e'];
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
  ...UNDER.filter((u) => u.kind === 'court').map((u): Box => {
    const [x, z] = ringPoint(u.s1 - 0.6, 0);
    return [x - 0.15, z - 0.15, x + 0.15, z + 0.15, 2.4];
  }),
];
/** Made-up words for the murals (nothing for sale, never a real name) */
export const MURAL_ART = ['UNDER THE DECK', 'TRENCH LIFE', 'LOT 9 FOREVER', 'BLOCK LOVE', 'RISE UP', 'SECTOR 7 SOUL', 'GOOD DAYS', 'NIGHT SHIFT'];
/** The murals: on both faces along the ring of every pier by The Trenches and Lot 9 (the pier, which face, which picture) */
export const MURALS: { s: number; at: Pt; face: 1 | -1; art: number }[] = PIERS.flatMap((p, i) => {
  if (!besideIn(p.s, [TRENCH_RECT, LOT9_RECT]) || inChannel(p.at[0], p.at[1], 2)) return [];
  return ([-1, 1] as const).map((face, k) => ({ s: p.s, at: p.at, face, art: (i * 2 + k) % MURAL_ART.length }));
});

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
/** A gantry's panel's middle (x, z, y) over its side's lanes */
export const gantryPanel = (g: Gantry) => {
  const [x, z] = ringPoint(g.s, g.q * (OUTER_LANE - 0.8));
  return { x, z, y: DECK_Y + GANTRY.under + GANTRY.panel.h / 2 };
};
