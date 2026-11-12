/*
 * Sector 7 Stadium (Westlake Park's step 2, docs/growth-plan.md Phase 9b;
 * moved north of the ring highway in the north side's stage 1,
 * docs/north-plan.md, the owner's call; DOM-free, tested in
 * tests/stadium.test.ts), drawn by stadium3d.ts. An oval bowl on its own
 * block north of the highway (`BLOCK`), in line with Westlake Park's Mall,
 * its front to the south, where the Mall comes out of the park's north gate,
 * under the raised ring highway and over Stadium Road on a zebra onto its
 * forecourt (`WALK`, `ZEBRA`; its footbridge was retired with the highway's
 * rise, docs/highway-plan.md Phase 2, the owner's call).
 *
 * - **The bowl** is a soft-cornered oval (a superellipse, `ovalAt()`): the
 *   facade round the outside (`FACADE`, to `FACADE.h`), the stands stepping
 *   down from it to the pitch in two tiers with a concourse between
 *   (`TIERS`), a roof ring over the upper tier (`ROOF`), open over the
 *   pitch.
 * - **The pitch** (`PITCH`) in the middle, its lines and a running track
 *   round it.
 * - **Floodlights** on four masts outside the corners (`MASTS`) and a big
 *   screen over the north stand (`SCREEN`).
 * - **The main gate** in the middle of the south facade (`GATE`): its
 *   door prompt opens the stadium's panel (events coming soon), and Walk in
 *   stands you on the forecourt in front (`STADIUM_SPAWN`).
 * - **Stadium Road** (`ROAD`) runs west off the north road past the highway
 *   (ns0) along the block's south side; the car park (`CAR_PARK`, with cars
 *   in most of its bays, `PARKED`) is inside the one-way loop off it east of
 *   the stadium (`LOOP`), as the airport's is. The street plan's
 *   `STADIUM_STREETS` and `STADIUM_CROSSINGS`; traffic drives them.
 * - **The walk** (`WALK`): the Mall carried on from the park's north gate
 *   under the highway's deck to Stadium Road, a zebra over it (`ZEBRA`).
 *
 * Everything stays under the Emporium (`TALLEST`). What's solid is
 * `STADIUM_SOLIDS`: the facade all the way round (the gates are shut until
 * there's an event), the masts and the parked cars.
 *
 * **Fixtures and match night** (the polish plan's Phase 7): the fixture
 * board reads the next match from the visitor's clock (`fixtureAt()`: the
 * home side `HOME` against `VISITORS` in turn, Wednesdays and Saturdays at
 * half past seven, `FIXTURE`; the same for everyone in a time zone), and
 * on a match evening (`matchOn()`, `MATCH`) the floodlights are on, the
 * screen plays, the crowd is heard round the ground and a few people queue
 * at the gate. Nothing moves and the gates stay shut: no match is played.
 */
import { WALK_W } from './layout';
import { MALL, Z0 as PARK_EDGE } from './westlake';
import { CAR_SCALE } from './carspec';

export type Pt = [number, number];
export type Box = [number, number, number, number, number];

export type Rect = [number, number, number, number];

/* ---------- Where: north of the ring highway, in line with the Mall ---------- */

/**
 * Stadium Road's way in (docs/highway-plan.md Phase 1b: the raised highway's exit 1 took its old line by the highway):
 * west along `z` from the north road (ns0, at x = -4.5, past the highway) to the car park loop's west side, then a
 * bend down to the stretch past the stadium's front (`ROAD`)
 */
export const IN = { z: -211, x0: -4.5 };
/** Stadium Road past the stadium's front: its centre line (z), from the bend's foot (`x0`) west to `x1`; a street's half width */
export const ROAD = { z: -188, x0: -100, x1: -182, half: 1.7 };
/** The car park's one-way loop off Stadium Road's way in (its south side is the road): x0..x1, north to z1 */
export const LOOP = { x0: -92, x1: -24, z1: IN.z - 40, half: 1.7 };
/** Stadium Road's centre line, from the north road to its end past the stadium */
export const ROAD_LINE: Pt[] = [[IN.x0, IN.z], [LOOP.x0 - 5, IN.z], [ROAD.x0, ROAD.z], [ROAD.x1, ROAD.z]];
/** The stadium's block (lawn on a slab, a sidewalk round it): north of Stadium Road, west of its bend */
export const BLOCK: Rect = [-184, -262, -106, ROAD.z - ROAD.half - WALK_W];
/** The bowl's middle: in line with the Mall */
export const CENTRE: Pt = [MALL.x, -228];
/** How square the oval's corners are (2 an ellipse; higher, squarer) */
export const ROUNDNESS = 3;

/** A point on an oval of half sizes a (x) and b (z) round the middle, at angle t (0 east, +π/2 south) */
export function ovalAt(a: number, b: number, t: number): Pt {
  const c = Math.cos(t);
  const s = Math.sin(t);
  const e = 2 / ROUNDNESS;
  return [CENTRE[0] + a * Math.sign(c) * Math.abs(c) ** e, CENTRE[1] + b * Math.sign(s) * Math.abs(s) ** e];
}
/** An oval's outline, `n` points round */
export const oval = (a: number, b: number, n = 96): Pt[] => Array.from({ length: n }, (_, k) => ovalAt(a, b, (2 * Math.PI * k) / n));
/** Is a point inside an oval of half sizes a, b (m beyond it) */
export const inOval = (a: number, b: number, x: number, z: number, m = 0) =>
  (Math.abs(x - CENTRE[0]) / (a + m)) ** ROUNDNESS + (Math.abs(z - CENTRE[1]) / (b + m)) ** ROUNDNESS < 1;

/** The facade round the outside: its half sizes and height */
export const FACADE = { a: 31, b: 25, h: 7.2 };
/** The roof ring over the upper tier: from its inner edge out past the facade, its height (sloping a little up to the outside) */
export const ROOF = { a0: 23.4, b0: 17.8, a1: 31.6, b1: 25.6, y0: 8.3, y1: 8.7 };
/** The pitch (half sizes) and the running track round it (its outer half sizes) */
export const PITCH = { hx: 15, hz: 9.5 };
export const TRACK = { a: 19, b: 13.4 };

/** A tier of seats: from its front edge (half sizes) up and back, steps of a rise and a depth */
export interface Tier {
  a: number;
  b: number;
  /** The front edge's height */
  y: number;
  steps: number;
  rise: number;
  depth: number;
}
/** The lower tier from the track's edge, then the concourse (`GANGWAY` deep), then the upper tier up to the facade */
const GANGWAY = 1.2;
const lower: Tier = { a: TRACK.a + 0.4, b: TRACK.b + 0.4, y: 0.6, steps: 6, rise: 0.42, depth: 0.75 };
export const TIERS: Tier[] = [lower, { a: lower.a + lower.steps * lower.depth + GANGWAY, b: lower.b + lower.steps * lower.depth + GANGWAY, y: 3.6, steps: 6, rise: 0.48, depth: 0.75 }];
/** The concourse between the tiers: its inner and outer half sizes and its height */
export const CONCOURSE = { a0: lower.a + lower.steps * lower.depth, b0: lower.b + lower.steps * lower.depth, a1: TIERS[1].a, b1: TIERS[1].b, y: lower.y + lower.steps * lower.rise };

/** The four floodlight masts, outside the bowl's corners: where, how tall (the lamps at the top) */
export const MASTS: { x: number; z: number }[] = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map((t) => {
  const [x, z] = ovalAt(FACADE.a + 1.6, FACADE.b + 1.6, t);
  return { x, z };
});
export const MAST = { h: 10.6, r: 0.22, head: { w: 2.6, h: 1.2 } };
/** The big screen over the north stand, facing the pitch: its middle, size and how high its foot stands */
export const SCREEN = { x: CENTRE[0], z: CENTRE[1] - FACADE.b + 0.8, w: 9, h: 3.2, y: FACADE.h + 0.3 };

/** The main gate: the middle of the south facade (its z), its width and height; where you stand at it */
export const GATE = (() => {
  const [, z] = ovalAt(FACADE.a, FACADE.b, Math.PI / 2);
  return { x: CENTRE[0], z, w: 5, h: 4.2, spot: { x: CENTRE[0], z: z + 1.3 } };
})();
/** The stadium's name over the main gate (fixed made-up copy) */
export const NAME = 'SECTOR 7 STADIUM';
/** Where Walk in and fast travel stand you: on the forecourt, facing the gate (north: walk.ts's yaw 0) */
export const STADIUM_SPAWN = { x: CENTRE[0] + 2.8, z: GATE.z + 2.6, yaw: 0 };

/** The tallest anything stands (the masts' lamps), under the Emporium's roof (about 12.5) */
export const TALLEST = MAST.h + MAST.head.h / 2;

/* ---------- The car park ---------- */

/** Inside the loop, clear of its asphalt (x0, z0, x1, z1) */
export const CAR_PARK: Rect = [LOOP.x0 + LOOP.half + 0.3, LOOP.z1 + LOOP.half + 0.3, LOOP.x1 - LOOP.half - 0.3, IN.z - ROAD.half - 0.3];
/** A bay's width along the row, and how deep it is */
export const BAY = { w: 2.6, d: 4.4 };
/** Four rows of bays: one along the north edge, two back to back in the middle, one by the road; each row's bays' z and facing */
export const BAY_ROWS: { z: number; yaw: number }[] = (() => {
  const [, z0, , z1] = CAR_PARK;
  // (cars.ts's yaw: 0 points +x; noses in, towards the bay's back)
  return [
    { z: z0 + BAY.d / 2, yaw: Math.PI / 2 },
    { z: z0 + BAY.d * 1.5 + 5, yaw: -Math.PI / 2 },
    { z: z0 + BAY.d * 2.5 + 5, yaw: Math.PI / 2 },
    { z: z1 - BAY.d / 2, yaw: -Math.PI / 2 },
  ];
})();
export const BAYS: { x: number; z: number; yaw: number }[] = (() => {
  const [x0, , x1] = CAR_PARK;
  const out: { x: number; z: number; yaw: number }[] = [];
  const n = Math.floor((x1 - x0 - 1) / BAY.w);
  for (const row of BAY_ROWS) for (let i = 0; i < n; i++) out.push({ x: x0 + 0.5 + (i + 0.5) * BAY.w, z: row.z, yaw: row.yaw });
  return out;
})();
/** The cars parked: model, x, z, yaw, colour; about three bays in five taken, seeded */
export const PARKED: [string, number, number, number, string][] = (() => {
  const models = ['hatch', 'sedan', 'pickup', 'van', 'coupe', 'suv'];
  const colours = ['#e23b3b', '#2aabee', '#ffd23f', '#f3f2f7', '#8000ff', '#1fbf6b', '#ff8a3d', '#2b2d3a', '#e219e5'];
  let s = 707;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const out: [string, number, number, number, string][] = [];
  for (const b of BAYS) {
    if (r() > 0.6) continue;
    out.push([models[Math.floor(r() * models.length)], b.x, b.z, b.yaw + (r() < 0.15 ? Math.PI : 0), colours[Math.floor(r() * colours.length)]]);
  }
  return out;
})();
/** A parked car's footprint, half its length and width (the longest model) */
const CAR_HALF = { l: 1.5 * CAR_SCALE, w: 0.62 * CAR_SCALE };

/* ---------- The streets ---------- */

/** Stadium Road and the car park's loop (one-way, driven against its points: north up its west side, east, south down its east side) */
export const STADIUM_STREETS: { id: string; pts: Pt[]; half: number; oneway?: -1 }[] = [
  { id: 'stadium-road', pts: ROAD_LINE, half: ROAD.half },
  { id: 'stadium-loop', pts: [[LOOP.x1, IN.z], [LOOP.x1, LOOP.z1], [LOOP.x0, LOOP.z1], [LOOP.x0, IN.z]], half: LOOP.half, oneway: -1 },
];
/** Where they meet the north road and each other (no lights) */
export const STADIUM_CROSSINGS: { id: string; at: Pt; streets: string[] }[] = [
  { id: 'stadium-in', at: [IN.x0, IN.z], streets: ['ns0', 'stadium-road'] },
  { id: 'stadium-loop-e', at: [LOOP.x1, IN.z], streets: ['stadium-road', 'stadium-loop'] },
  { id: 'stadium-loop-w', at: [LOOP.x0, IN.z], streets: ['stadium-road', 'stadium-loop'] },
];
/**
 * Lamps along Stadium Road's north side and round the loop's outside: x, z, which way the arm reaches (ry turns +x
 * towards it) and the ground's height (the block's sidewalk is on its slab, the rest is open ground)
 */
export const STADIUM_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const north = ROAD.z - ROAD.half - 0.45;
  for (let x = ROAD.x1 + 4; x < ROAD.x0 - 3; x += 14) if (Math.abs(x - MALL.x) > 4) out.push([x, north, -Math.PI / 2, 0.15]);
  for (let x = LOOP.x1 + 6; x < IN.x0 - 5; x += 12) out.push([x, IN.z - ROAD.half - 0.45, -Math.PI / 2, 0.02]);
  for (let z = IN.z - 10; z > LOOP.z1 + 3; z -= 14) out.push([LOOP.x1 + LOOP.half + 0.45, z, Math.PI, 0.02]);
  // (a lamp's arm reaches along cos ry, -sin ry: world.ts buildLamps())
  for (let x = LOOP.x1 - 6; x > LOOP.x0 + 3; x -= 14) out.push([x, LOOP.z1 - LOOP.half - 0.45, -Math.PI / 2, 0.02]);
  return out;
})();

/* ---------- The way over from the park ---------- */

/**
 * The Mall carried on north from the park's north gate (westlake.ts `GATES`, `gate-n`) under the raised highway's
 * deck to Stadium Road's south kerb (x, its half width, from z0 to z1), and the zebra over the road from it to the
 * forecourt (docs/highway-plan.md Phase 2: in place of the footbridge)
 */
export const WALK = { x: MALL.x, half: MALL.half, z0: PARK_EDGE, z1: ROAD.z + ROAD.half };
export const ZEBRA = { x: MALL.x, half: 1.4, z0: ROAD.z - ROAD.half, z1: ROAD.z + ROAD.half };
/** What the walk covers (the outskirts' trees and the deck's piers keep off) */
export const WALK_RECT: Rect = [WALK.x - WALK.half - 0.5, WALK.z1, WALK.x + WALK.half + 0.5, WALK.z0];

/* ---------- What's solid ---------- */

/** The facade as boxes along its outline (every few tiles round, each a box over its stretch), to its height */
const facadeBoxes = (): Box[] => {
  const pts = oval(FACADE.a, FACADE.b, 120);
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return [Math.min(p[0], q[0]) - 0.3, Math.min(p[1], q[1]) - 0.3, Math.max(p[0], q[0]) + 0.3, Math.max(p[1], q[1]) + 0.3, FACADE.h];
  });
};
export const STADIUM_SOLIDS: Box[] = [
  ...facadeBoxes(),
  ...MASTS.map(({ x, z }): Box => [x - 0.45, z - 0.45, x + 0.45, z + 0.45, MAST.h]),
  ...PARKED.map(([, x, z, yaw]): Box => {
    const along = Math.abs(Math.cos(yaw)) > 0.5;
    const [hx, hz] = along ? [CAR_HALF.l, CAR_HALF.w] : [CAR_HALF.w, CAR_HALF.l];
    return [x - hx, z - hz, x + hx, z + hz, 1.3];
  }),
];
/** What the outskirts' trees keep off: the block, the road and the loop with its car park, and the walk from the park */
export const STADIUM_RECTS: Rect[] = [
  BLOCK,
  [ROAD.x1 - 1, ROAD.z - ROAD.half - 1, ROAD.x0, ROAD.z + ROAD.half + 1],
  [LOOP.x1, IN.z - ROAD.half - 1, IN.x0, IN.z + ROAD.half + 1],
  [ROAD.x0 - ROAD.half - 1, IN.z - ROAD.half - 1, LOOP.x0 + ROAD.half + 1, ROAD.z + ROAD.half + 1],
  [LOOP.x0 - LOOP.half - 1, LOOP.z1 - LOOP.half - 1, LOOP.x1 + LOOP.half + 1, IN.z],
  WALK_RECT,
];
/** All of it, for loading its grounds as you approach (districts.ts) */
export const STADIUM_AREA: Rect = [Math.min(...STADIUM_RECTS.map((r) => r[0])), Math.min(...STADIUM_RECTS.map((r) => r[1])), Math.max(...STADIUM_RECTS.map((r) => r[2])), Math.max(...STADIUM_RECTS.map((r) => r[3]))];

/* ---------- Fixtures and match night (the polish plan's Phase 7, docs/polish-plan.md) ---------- */

/** The home side and the visitors, in turn by the day (made-up names, never a real club) */
export const HOME = 'SECTOR 7 FC';
export const VISITORS = ['WESTLAKE ROVERS', 'UPTOWN ATHLETIC', 'TRENCH TOWN', 'CRESTMONT ROYALS', 'HARBOUR CITY', 'NEON MILE STARS', 'SUNRIDGE UNITED', 'SOUTHFIELD WANDERERS'];
/** Match days (the visitor's local weekday, 0 Sunday: Wednesdays and Saturdays), the kick-off and how long a match runs (local hours) */
export const FIXTURE = { days: [3, 6], kickoff: 19.5, length: 2 };
/**
 * Match night: from `from` to `until` (local hours) on a match day the floodlights are on, the screen plays, the
 * crowd's roar is heard round the ground (ambience.ts `stadium`) and a few people queue at the gate; the gates stay
 * shut and nothing moves (no match is played yet)
 */
export const MATCH = { from: 17.5, until: 22.5 };
export const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** The visitor's clock at t (ms): the local day's count (days since the epoch, local), its weekday and the hour (fractional) */
export interface Clock {
  day: number;
  dow: number;
  hour: number;
}
export function clockAt(t: number): Clock {
  const d = new Date(t);
  return { day: Math.floor((t - d.getTimezoneOffset() * 60000) / 86400000), dow: d.getDay(), hour: d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600 };
}

export interface Fixture {
  home: string;
  away: string;
  /** The match day's count and weekday, the kick-off (local hours) */
  day: number;
  dow: number;
  kickoff: number;
  /** How many days off it is (0 today), and whether it's being played now */
  daysAway: number;
  on: boolean;
}
/**
 * The next fixture at t (ms), or the one on now: the next match day whose match hasn't ended, the visitors picked by
 * the day's count, so everyone in a time zone sees the same board
 */
export function fixtureAt(t: number): Fixture {
  const c = clockAt(t);
  for (let k = 0; k < 8; k++) {
    const dow = (c.dow + k) % 7;
    if (!FIXTURE.days.includes(dow)) continue;
    if (k === 0 && c.hour >= FIXTURE.kickoff + FIXTURE.length) continue;
    const day = c.day + k;
    return { home: HOME, away: VISITORS[((day % VISITORS.length) + VISITORS.length) % VISITORS.length], day, dow, kickoff: FIXTURE.kickoff, daysAway: k, on: k === 0 && c.hour >= FIXTURE.kickoff };
  }
  throw new Error('no match day in the week');
}
/** Is it match night at t (ms): a match day between `MATCH.from` and `MATCH.until` */
export function matchOn(t: number): boolean {
  const c = clockAt(t);
  return FIXTURE.days.includes(c.dow) && c.hour >= MATCH.from && c.hour < MATCH.until;
}
/** The fixture board's two lines: the sides, and when ("WED 7:30 PM"; "TONIGHT", or "KICKED OFF" while it's on) */
export function fixtureLines(f: Fixture): [string, string] {
  return [`${f.home} v ${f.away}`, `${f.daysAway === 0 ? (f.on ? 'KICKED OFF' : 'TONIGHT') : DAY_NAMES[f.dow]} ${clockText(f.kickoff).toUpperCase()}`];
}
/** An hour (fractional, local) as a clock reads it: 7:30 pm, 9 am */
export function clockText(hour: number): string {
  const whole = Math.floor(hour);
  let m = Math.round((hour - whole) * 60);
  let h = whole;
  if (m === 60) {
    m = 0;
    h++;
  }
  h = ((h % 24) + 24) % 24;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`;
}
