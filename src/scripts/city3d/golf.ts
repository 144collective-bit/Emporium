/*
 * The golf course in the north-east corner (docs/golf-plan.md Phase 1, the owner's call, 2026-11-21: "delete the old club
 * and let's build a new functional golf course", 18 holes, scenery first, a golf game on it later). DOM-free, tested in
 * tests/golf.test.ts. Not in the city yet: Phase 2 puts its ground under the city's (golfground.ts has its heights).
 *
 * The open land past Crestmont's hills, an L between Northgate Air Base's fence, the wall, and the country road east
 * (ew0-e): the north arm across the top of the hills, the east arm down the east side of Crestmont, the clubhouse where
 * they meet, reached by its own drive up from the country road along the hills' east foot.
 *
 * - `COURSE`: the club's land, a closed line wandering round the L (no ruler-straight edge: `wander()`); `inCourse()`.
 * - `HOLES`: the eighteen, each its play line (`line`: the tee, any dogleg's turn, the green's middle), par, the
 *   fairway's stretch along it and its half width, its tee's raise, its green's size and turn, its bunkers in the
 *   hole's own frame (along from the tee, across to the right). The front nine loop the north arm, the back nine the
 *   east, each out from the clubhouse and home to it. Par 72: four par 3s, ten par 4s, four par 5s.
 * - `LAKES`: the water (each an ellipse, its shore wobbled), `inLake()`.
 * - `CLUB_GROUNDS` (the clubhouse, its car park, the putting green and the range's tee, Phase 4), `DRIVE` (the drive in).
 * - `surfaceAt()`: what's underfoot at a point (water, bunker, green, fringe, tee, fairway, first cut, rough, native
 *   grass, the grounds, or off the course): the lie the golf game will read.
 *
 * Distances are tiles (about 1.8 m): the holes about half real length (the city's scale), so a par 4 is 145 to 185.
 */
import { distTo, inside } from './streetfaces';

export type Pt = [number, number];
type Rect = [number, number, number, number];

/* ---------- The land ---------- */

/** A seeded hash in [0, 1) (the same everywhere, whatever the world's size) */
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/**
 * A closed line through `base`'s corners with a point every `step` or so along each side, each pushed out or in by up to
 * `amp` (seeded), so no edge runs ruler-straight (the owner's call); the corners themselves cut a little, rounded
 */
export function wander(base: Pt[], step: number, amp: number, seed: number): Pt[] {
  const out: Pt[] = [];
  const n = base.length;
  for (let i = 0; i < n; i++) {
    const [a, b] = [base[i], base[(i + 1) % n]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const [ux, uz] = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const k = Math.max(2, Math.round(L / step));
    // (a corner cut to two points `cut` along either side of it)
    const cut = Math.min(step * 0.5, L / 4);
    for (let j = 0; j < k; j++) {
      const t = j === 0 ? cut : (L * j) / k;
      const w = j === 0 ? 0 : (hash(seed + i * 97 + j * 13) * 2 - 1) * amp;
      out.push([a[0] + ux * t - uz * w, a[1] + uz * t + ux * w]);
    }
    out.push([b[0] - ux * cut, b[1] - uz * cut]);
  }
  return out;
}

/** The L's corners before it wanders, clockwise from the north arm's south-west: clear of the air base's fence (x 276 at
 * most), the wall (x 800, z -760), the hills' land (x 490, z -450), the drive and the country road (z -4.5) */
export const COURSE_BASE: Pt[] = [
  [304, -458],
  [304, -736],
  [776, -736],
  [776, -36],
  [512, -36],
  [512, -458],
];
/** How far the edge wanders in or out, and how often */
export const EDGE_AMP = 4;
export const EDGE_STEP = 26;
export const COURSE: Pt[] = wander(COURSE_BASE, EDGE_STEP, EDGE_AMP, 7);
/** The course's box (x0, z0, x1, z1) */
export const COURSE_RECT: Rect = [Math.min(...COURSE.map((p) => p[0])), Math.min(...COURSE.map((p) => p[1])), Math.max(...COURSE.map((p) => p[0])), Math.max(...COURSE.map((p) => p[1]))];
/** Is x, z on the club's land */
export const inCourse = (x: number, z: number) => x > COURSE_RECT[0] && x < COURSE_RECT[2] && z > COURSE_RECT[1] && z < COURSE_RECT[3] && inside(COURSE, [x, z]);
/** How far inside the club's land a point is (0 or less outside) */
export const insetOf = (x: number, z: number) => (inCourse(x, z) ? distTo(COURSE, [x, z], true) : -distTo(COURSE, [x, z], true));

/** The clubhouse's grounds where the arms meet (Phase 4: the clubhouse, its car park, the putting green, the range's tee) */
export const CLUB_GROUNDS: Rect = [500, -520, 572, -470];
export const CLUB_CENTRE: Pt = [(CLUB_GROUNDS[0] + CLUB_GROUNDS[2]) / 2, (CLUB_GROUNDS[1] + CLUB_GROUNDS[3]) / 2];
/** The drive in: off the country road east (ew0-e, z -4.5) north along the hills' east foot to the grounds (Phase 3
 * makes it a street; here its line, so the holes keep clear) */
export const DRIVE: Pt[] = [
  [502, -4.5],
  [501, -26],
  [498, -64],
  [503, -110],
  [499, -170],
  [501, -240],
  [498, -310],
  [502, -380],
  [499, -430],
  [503, -470],
];

/* ---------- The holes ---------- */

export type Bunker = [number, number, number, number, 'f' | 'g'];
export interface Hole {
  n: number;
  name: string;
  par: 3 | 4 | 5;
  /** The play line: the tee's middle, any turns, the green's middle */
  line: Pt[];
  /** The fairway along the line (from the tee): where it starts and ends, its half width (none on a par 3) */
  fairway: { from: number; to: number; half: number } | null;
  /** How far the tee stands over the line's ground there (an elevated tee more) */
  raise: number;
  /** The green: its radii along and across the line's last stretch */
  green: [number, number];
  /** Its bunkers in the hole's frame: along the line, across to the right of it, radii along and across, and what the
   * along is from: 'f' the tee (a fairway bunker), 'g' the green's middle (negative short of it, positive past it) */
  bunkers: Bunker[];
}

/** A fairway's half width, and what it narrows to by the green */
export const FAIRWAY_HALF = 10;
export const FAIRWAY_NECK = 7;
/** The tee's half size (along, across), the fringe round a green, the first cut beside a fairway */
export const TEE: Pt = [5, 3.2];
export const FRINGE = 1.8;
export const FIRST_CUT = 2.6;
/** Past this from every hole's line the rough runs to native grass (the woods' land, Phase 5) */
export const NATIVE = 34;
/** Each par's length (tiles, along the line): the city's half scale */
export const PAR_LENGTH: Record<3 | 4 | 5, [number, number]> = { 3: [80, 115], 4: [145, 185], 5: [210, 260] };

const fw = (from: number, toBack: number) => ({ from, to: -toBack, half: FAIRWAY_HALF });
/** Greenside bunkers: either side of the green, a touch short (`short` back from its middle) */
const sides = (short = 3, off = 10.5): Bunker[] => [
  [-short, off, 4, 2.4, 'g'],
  [-short, -off, 4, 2.4, 'g'],
];

/** The eighteen, as laid (the plan's routing, docs/golf-plan.md; `fairway.to` negative is back from the green's middle) */
export const HOLES: Hole[] = [
  // The front nine: the north arm, out west from the clubhouse, up the air base side, east along the wall to the
  // Knob in the corner, and home through the middle
  { n: 1, name: 'First Light', par: 4, line: [[485, -498], [410, -490], [340, -505]], fairway: fw(38, 12), raise: 0.5, green: [7, 5.5], bunkers: [[100, 11, 5, 2.6, 'f'], ...sides()] },
  { n: 2, name: 'Fence Line', par: 4, line: [[346, -530], [345, -610], [343, -690]], fairway: fw(40, 12), raise: 0.4, green: [7, 5.5], bunkers: [[108, -11, 5, 2.6, 'f'], [-4, 10.5, 4, 2.4, 'g']] },
  { n: 3, name: 'Long Wall', par: 5, line: [[368, -700], [470, -706], [578, -694]], fairway: fw(42, 12), raise: 0.9, green: [7.5, 5.5], bunkers: [[112, 11, 5, 2.6, 'f'], [165, -11, 5, 2.6, 'f'], ...sides()] },
  { n: 4, name: 'The Climb', par: 4, line: [[598, -708], [672, -702], [746, -690]], fairway: fw(38, 12), raise: 0.4, green: [7, 6], bunkers: [[-6, -10, 4.5, 2.4, 'g'], [2, 10, 4, 2.4, 'g']] },
  { n: 5, name: 'Knob Drop', par: 3, line: [[736, -664], [698, -590]], fairway: null, raise: 0.3, green: [7.5, 6], bunkers: [...sides(2, 10.5), [11.5, 0, 3, 5, 'g']] },
  { n: 6, name: 'Mid Run', par: 5, line: [[680, -602], [560, -612], [445, -626]], fairway: fw(42, 12), raise: 0.5, green: [7.5, 5.5], bunkers: [[115, -11, 5, 2.6, 'f'], [175, 11, 5, 2.6, 'f'], ...sides()] },
  { n: 7, name: 'Fen Turn', par: 4, line: [[418, -578], [500, -552], [575, -552]], fairway: fw(38, 12), raise: 0.4, green: [7, 5.5], bunkers: [[95, 11, 5, 2.6, 'f'], ...sides()] },
  { n: 8, name: 'The Pond', par: 3, line: [[595, -556], [680, -548]], fairway: null, raise: 0.4, green: [7, 6], bunkers: [[-5, 10, 4, 2.4, 'g'], [10.5, -3, 3.5, 2.2, 'g']] },
  { n: 9, name: 'Homeward', par: 4, line: [[735, -540], [660, -505], [592, -488]], fairway: fw(38, 12), raise: 0.5, green: [7, 5.5], bunkers: [[98, -11, 5, 2.6, 'f'], ...sides()] },
  // The back nine: the east arm, south from the clubhouse down the hills' side, east along the bottom, north up the
  // wall's side, and home up the middle past Clubhouse Lake
  { n: 10, name: 'Hillside', par: 4, line: [[540, -440], [545, -360], [550, -280]], fairway: fw(38, 12), raise: 0.6, green: [7, 5.5], bunkers: [[102, 11, 5, 2.6, 'f'], ...sides()] },
  { n: 11, name: 'Heron', par: 3, line: [[548, -258], [553, -172]], fairway: null, raise: 0.4, green: [7, 5.5], bunkers: [[-4, -10, 4, 2.4, 'g'], [8.5, 7.5, 3.5, 2.2, 'g']] },
  { n: 12, name: 'Country Mile', par: 5, line: [[545, -150], [578, -82], [720, -70]], fairway: fw(42, 12), raise: 0.5, green: [7.5, 5.5], bunkers: [[108, 11, 5, 2.6, 'f'], [160, -11, 5, 2.6, 'f'], ...sides()] },
  { n: 13, name: 'East Wall', par: 4, line: [[750, -88], [749, -168], [748, -248]], fairway: fw(38, 12), raise: 0.5, green: [7, 5.5], bunkers: [[100, -11, 5, 2.6, 'f'], ...sides()] },
  { n: 14, name: 'Long Watch', par: 4, line: [[746, -270], [744, -350], [742, -432]], fairway: fw(38, 12), raise: 0.4, green: [7, 5.5], bunkers: [[105, 11, 5, 2.6, 'f'], ...sides()] },
  { n: 15, name: 'The Spine', par: 5, line: [[702, -428], [696, -320], [690, -215]], fairway: fw(42, 12), raise: 0.5, green: [7.5, 5.5], bunkers: [[110, -11, 5, 2.6, 'f'], [165, 11, 5, 2.6, 'f'], ...sides()] },
  { n: 16, name: 'Reed Carry', par: 3, line: [[675, -192], [625, -125]], fairway: null, raise: 0.5, green: [7, 6], bunkers: [...sides(2, 10)] },
  { n: 17, name: 'The Hollow', par: 4, line: [[602, -140], [604, -215], [606, -290]], fairway: fw(38, 12), raise: 0.4, green: [7, 5.5], bunkers: [[98, -11, 5, 2.6, 'f'], ...sides()] },
  { n: 18, name: 'Clubhouse', par: 4, line: [[610, -310], [616, -405], [588, -455]], fairway: fw(38, 12), raise: 0.5, green: [7.5, 6], bunkers: [[-4, 10.5, 4, 2.4, 'g'], [-2, -11, 4.5, 2.4, 'g']] },
];

/* ---------- A hole's frame ---------- */

/** A line's length along it, point by point */
export const arcOf = (pts: Pt[]) => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return cum;
};
/** A hole's length along its line */
export const lengthOf = (h: Hole) => arcOf(h.line).at(-1)!;
/** The point and way along a hole's line at `s` from the tee (or from the green's middle with `fromGreen`: negative
 * short of it); past either end the line runs on straight */
export function along(h: Hole, s: number, fromGreen = false): { at: Pt; dir: Pt } {
  const cum = arcOf(h.line);
  const L = cum.at(-1)!;
  const v = fromGreen ? L + s : s;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < v) i++;
  const [a, b] = [h.line[i - 1], h.line[i]];
  const seg = cum[i] - cum[i - 1] || 1;
  const t = (v - cum[i - 1]) / seg;
  return { at: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], dir: [(b[0] - a[0]) / seg, (b[1] - a[1]) / seg] };
}
/** A point in the hole's frame: `s` along (from the tee, or the green's middle), `o` across to the right (facing the
 * green) */
export function framePt(h: Hole, s: number, o: number, fromGreen = false): Pt {
  const { at, dir } = along(h, s, fromGreen);
  // (x east, z south: facing north (0, -1) the right is east (1, 0))
  return [at[0] - dir[1] * o, at[1] + dir[0] * o];
}
/** The nearest point on a hole's line to x, z: how far (d), how far along it (s), the way there */
export function nearestOn(h: Hole, x: number, z: number): { d: number; s: number; dir: Pt; side: number } {
  const cum = arcOf(h.line);
  let best = { d: Infinity, s: 0, dir: [0, 1] as Pt, side: 0 };
  for (let i = 1; i < h.line.length; i++) {
    const [a, b] = [h.line[i - 1], h.line[i]];
    const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
    const l2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l2));
    const [px, pz] = [a[0] + vx * t, a[1] + vz * t];
    const d = Math.hypot(x - px, z - pz);
    if (d < best.d) {
      const l = Math.sqrt(l2);
      best = { d, s: cum[i - 1] + t * l, dir: [vx / l, vz / l], side: Math.sign(-(x - a[0]) * vz + (z - a[1]) * vx) };
    }
  }
  return best;
}
/** Where a hole's fairway ends along its line */
export const fairwayEnd = (h: Hole) => (h.fairway ? lengthOf(h) + h.fairway.to : 0);
/** The fairway's half width at `s` along: wandering a little either way (no fairway's a strip), narrowing to its neck
 * over its last 30 */
export function fairwayHalf(h: Hole, s: number) {
  if (!h.fairway) return 0;
  const k = Math.min(1, Math.max(0, (fairwayEnd(h) - s) / 30));
  const wide = h.fairway.half + 1.6 * Math.sin(s / 23 + h.n * 1.7) + 0.9 * Math.sin(s / 9.5 + h.n * 2.9);
  return FAIRWAY_NECK + (wide - FAIRWAY_NECK) * k;
}
/** How far a point is inside a hole's fairway (negative outside it): its width at the nearest point of its line, its
 * ends rounded (the line past them counts its distance on) */
export function fairwayIn(h: Hole, x: number, z: number) {
  if (!h.fairway) return -Infinity;
  const n = nearestOn(h, x, z);
  const [a, b] = [h.fairway.from, fairwayEnd(h)];
  const s = Math.max(a, Math.min(b, n.s));
  const half = fairwayHalf(h, s);
  if (n.s >= a && n.s <= b) return half - n.d;
  // (past an end: from the end's point, its half width a round cap)
  const p = along(h, s).at;
  return half - Math.hypot(x - p[0], z - p[1]);
}
/** A hole's tee's middle and the way it faces, its green's middle and the way its last stretch runs */
export const teeOf = (h: Hole) => ({ at: h.line[0], dir: along(h, 0).dir });
export const greenOf = (h: Hole) => ({ at: h.line.at(-1)!, dir: along(h, -0.01, true).dir });
/** Where a point falls in an ellipse turned along `dir` with radii (along, across): 0 at its middle, 1 on its edge */
export function ellipseAt(c: Pt, dir: Pt, r: Pt, x: number, z: number) {
  const [dx, dz] = [x - c[0], z - c[1]];
  const u = (dx * dir[0] + dz * dir[1]) / r[0];
  const v = (-dx * dir[1] + dz * dir[0]) / r[1];
  return Math.hypot(u, v);
}
/** Where a point falls on a hole's green (its ellipse: 0 middle, 1 edge) */
export function onGreen(h: Hole, x: number, z: number) {
  const g = greenOf(h);
  return ellipseAt(g.at, g.dir, h.green, x, z);
}
/** Each bunker of a hole in the world: its middle, the way it lies, its radii */
export function bunkersOf(h: Hole): { at: Pt; dir: Pt; r: Pt }[] {
  return h.bunkers.map(([s, o, ra, rc, k]) => ({ at: framePt(h, s, o, k === 'g'), dir: along(h, s, k === 'g').dir, r: [ra, rc] as Pt }));
}
/** Whether x, z is on a hole's tee (its box along the tee's way) */
export function onTee(h: Hole, x: number, z: number) {
  const t = teeOf(h);
  const [dx, dz] = [x - t.at[0], z - t.at[1]];
  return Math.abs(dx * t.dir[0] + dz * t.dir[1]) <= TEE[0] && Math.abs(-dx * t.dir[1] + dz * t.dir[0]) <= TEE[1];
}

/* ---------- The water ---------- */

export interface Lake {
  id: string;
  name: string;
  at: Pt;
  /** Radii (x, z) before its turn, its turn (radians) */
  r: Pt;
  turn: number;
}
export const LAKES: Lake[] = [
  { id: 'fen', name: 'Fen Pond', at: [390, -650], r: [15, 21], turn: 0.3 },
  { id: 'pond', name: 'The Pond', at: [640, -560], r: [15, 10], turn: 0.1 },
  { id: 'heron', name: 'Heron Lake', at: [578, -215], r: [11, 26], turn: -0.05 },
  { id: 'reed', name: 'Reed Water', at: [690, -122], r: [15, 11], turn: 0.4 },
  { id: 'clubhouse', name: 'Clubhouse Lake', at: [652, -440], r: [17, 13], turn: -0.3 },
];
/** Where a point falls in a lake (0 middle, 1 on its shore, its shore wobbled round so no lake's an ellipse) */
export function lakeAt(l: Lake, x: number, z: number) {
  const [dx, dz] = [x - l.at[0], z - l.at[1]];
  const [c, s] = [Math.cos(l.turn), Math.sin(l.turn)];
  const [u, v] = [(dx * c + dz * s) / l.r[0], (-dx * s + dz * c) / l.r[1]];
  const a = Math.atan2(v, u);
  const seed = l.at[0] * 0.013 + l.at[1] * 0.007;
  return Math.hypot(u, v) / (1 + 0.1 * Math.sin(3 * a + seed * 7) + 0.06 * Math.sin(5 * a + seed * 13));
}
/** Is x, z in any lake (with its shore pulled in `m` of its radius: 0 its shore) */
export const inLake = (x: number, z: number, m = 0) => LAKES.some((l) => lakeAt(l, x, z) < 1 - m);

/* ---------- What's underfoot ---------- */

export type Surface = 'water' | 'bunker' | 'green' | 'fringe' | 'tee' | 'fairway' | 'cut' | 'rough' | 'native' | 'grounds';
/** Each hole's box (its line, out to `NATIVE`), to skip the far ones fast */
const BOXES: Rect[] = HOLES.map((h) => {
  const xs = h.line.map((p) => p[0]);
  const zs = h.line.map((p) => p[1]);
  return [Math.min(...xs) - NATIVE, Math.min(...zs) - NATIVE, Math.max(...xs) + NATIVE, Math.max(...zs) + NATIVE];
});
const inBox = (b: Rect, x: number, z: number) => x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3];

/** What's underfoot at x, z on the course (null off it): the golf game's lie */
export function surfaceAt(x: number, z: number): Surface | null {
  if (!inCourse(x, z)) return null;
  if (inLake(x, z)) return 'water';
  const [gx0, gz0, gx1, gz1] = CLUB_GROUNDS;
  if (x >= gx0 && x <= gx1 && z >= gz0 && z <= gz1) return 'grounds';
  let near = Infinity;
  let best: Surface | null = null;
  const rank: Surface[] = ['bunker', 'green', 'fringe', 'tee', 'fairway', 'cut'];
  const better = (s: Surface) => best === null || rank.indexOf(s) < rank.indexOf(best);
  for (const [i, h] of HOLES.entries()) {
    if (!inBox(BOXES[i], x, z)) continue;
    const n = nearestOn(h, x, z);
    near = Math.min(near, n.d);
    for (const b of bunkersOf(h)) if (ellipseAt(b.at, b.dir, b.r, x, z) <= 1 && better('bunker')) best = 'bunker';
    const g = onGreen(h, x, z);
    if (g <= 1 && better('green')) best = 'green';
    else if (g <= 1 + FRINGE / Math.min(...h.green) && better('fringe')) best = 'fringe';
    if (onTee(h, x, z) && better('tee')) best = 'tee';
    if (h.fairway) {
      const f = fairwayIn(h, x, z);
      if (f >= 0 && better('fairway')) best = 'fairway';
      else if (f >= -FIRST_CUT && better('cut')) best = 'cut';
    }
  }
  if (best) return best;
  return near <= NATIVE ? 'rough' : 'native';
}

/** Two holes' lines: how close they come (sampled every 2 along the first) */
export function holesApart(a: Hole, b: Hole) {
  const L = lengthOf(a);
  let m = Infinity;
  for (let s = 0; s <= L; s += 2) m = Math.min(m, nearestOn(b, ...along(a, s).at).d);
  m = Math.min(m, nearestOn(b, ...a.line.at(-1)!).d);
  return m;
}
