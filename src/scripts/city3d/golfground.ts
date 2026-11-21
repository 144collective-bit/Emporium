/*
 * The golf course's ground (docs/golf-plan.md Phase 1, the owner's call: "we will need to make elevation changes and
 * hills"). DOM-free, tested in tests/golfground.test.ts. Not in the city yet: Phase 2 puts it under the city's ground,
 * walking, driving and the camera, as the south's rolling ground is (southground.ts).
 *
 * Built up in layers, each eased into the one before so nowhere steps:
 * - **The land** (`landAt()`): the course's hills and hollows (`FEATURES`: the Knob in the north-east corner, Beacon
 *   Hill in the north-west, the Spine down the east arm, the clubhouse's rise, the middle swell, a hollow under each
 *   lake and the Hollow by the bottom), and low waves over all of it, eased to today's ground (0) at the club's edge.
 * - **The holes**: each hole's line smoothed along it (`profileOf()`: the land averaged over a stretch either way,
 *   held to `GRADE`) and the ground across its fairway (or a par 3's carry) held to that, its banks eased back into the
 *   land; the tees level (`teeLevel()`: raised over the line's ground), the greens a plane (`greenLevel()`, tilted up
 *   to the back by `GREEN_TILT`, the fringe with it), the clubhouse's grounds level.
 * - **The hazards**: each bunker dug in (`BUNKER_DEPTH`), each lake's basin down under its water (`lakeWater()`: below
 *   the lowest of its shore), the rest of its bed `LAKE_DEPTH` under that.
 */
import { smooth } from './hills';
import {
  CLUB_CENTRE,
  CLUB_GROUNDS,
  COURSE_RECT,
  FIRST_CUT,
  FRINGE,
  HOLES,
  LAKES,
  TEE,
  arcOf,
  bunkersOf,
  ellipseAt,
  fairwayEnd,
  fairwayHalf,
  greenOf,
  insetOf,
  lakeAt,
  lengthOf,
  nearestOn,
  teeOf,
  type Hole,
  type Lake,
  type Pt,
} from './golf';

type Rect = [number, number, number, number];

/** The land's hills and hollows: centre, radii (along, across), turn (radians), height (tiles; negative a hollow) */
export interface Feature {
  id: string;
  name: string;
  at: Pt;
  r: Pt;
  turn: number;
  h: number;
}
export const FEATURES: Feature[] = /* @__PURE__ */ (() => [
  { id: 'knob', name: 'The Knob', at: [714, -664], r: [74, 60], turn: 0.4, h: 13 },
  { id: 'beacon', name: 'Beacon Hill', at: [338, -704], r: [96, 70], turn: -0.6, h: 8 },
  { id: 'spine', name: 'The Spine', at: [650, -318], r: [120, 26], turn: 1.57, h: 6.5 },
  { id: 'rise', name: "The clubhouse's rise", at: [540, -500], r: [62, 50], turn: 0, h: 2.6 },
  { id: 'middle', name: 'The middle swell', at: [522, -656], r: [82, 32], turn: 0.05, h: 5 },
  { id: 'west', name: 'The west swell', at: [440, -545], r: [44, 26], turn: 0.1, h: 2.5 },
  { id: 'east-bank', name: 'The east bank', at: [770, -300], r: [100, 28], turn: 1.57, h: 3.5 },
  { id: 'south-bank', name: 'The south bank', at: [640, -58], r: [110, 24], turn: 0, h: 2 },
  { id: 'hollow', name: 'The Hollow', at: [650, -160], r: [46, 34], turn: 0.2, h: -1.2 },
  ...LAKES.map((l): Feature => ({ id: `${l.id}-hollow`, name: `${l.name}'s hollow`, at: l.at, r: [l.r[0] * 2, l.r[1] * 2], turn: l.turn, h: -1.4 })),
] as Feature[])();
/** The low waves over all of it: amplitude, direction (radians), wavelength, phase */
const WAVES: [number, number, number, number][] = [
  [0.55, 0.5, 130, 0.4],
  [0.35, 2.1, 86, 1.9],
  [0.2, 2.9, 52, 3.7],
];
/** How far in from the club's edge the land takes to rise to its full shape (0, today's ground, at the edge) */
export const EDGE_EASE = 26;

/** The land's own shape at a point (before the holes) */
export function landAt(x: number, z: number) {
  const inset = insetOf(x, z);
  if (inset <= 0) return 0;
  let h = 0;
  for (const f of FEATURES) {
    const [dx, dz] = [x - f.at[0], z - f.at[1]];
    const [c, s] = [Math.cos(f.turn), Math.sin(f.turn)];
    const d = Math.hypot((dx * c + dz * s) / f.r[0], (-dx * s + dz * c) / f.r[1]);
    if (d < 1) h += f.h * 0.5 * (1 + Math.cos(Math.PI * d));
  }
  for (const [a, dir, len, ph] of WAVES) h += a * Math.sin(((Math.cos(dir) * x + Math.sin(dir) * z) / len) * Math.PI * 2 + ph);
  return h * smooth(0, EDGE_EASE, inset);
}

/* ---------- The holes ---------- */

/** The steepest a hole's line may climb along it, sampled every `STEP`, its land averaged over `WINDOW` either way */
export const GRADE = 0.09;
const STEP = 2;
const WINDOW = 26;
/** How much of the land's fall across a fairway it keeps (a fairway tilts as its hillside does, gentler), and at most */
export const CROSS = 0.25;
export const CROSS_MAX = 1;
/** How far past a fairway's first cut its banks ease back into the land */
export const BANK_EASE = 14;

/** A hole's line's height, every `STEP` along it (from the tee to the green's middle), and the land's own there */
function profileOf(h: Hole): { y: number[]; raw: number[] } {
  const L = lengthOf(h);
  const cum = arcOf(h.line);
  const at = (s: number): Pt => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    const [a, b] = [h.line[i - 1], h.line[i]];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const n = Math.ceil(L / STEP) + 1;
  const raw = Array.from({ length: n }, (_, i) => landAt(...at(Math.min(L, i * STEP))));
  const y = raw.map((_, i) => {
    let [sum, w] = [0, 0];
    for (let j = 0; j < n; j++) {
      const d = Math.abs(j - i) * STEP;
      if (d > WINDOW) continue;
      const k = 1 - d / WINDOW;
      sum += raw[j] * k;
      w += k;
    }
    return sum / w;
  });
  // (held to its grade: forwards, then back)
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < n; i++) y[i] = Math.min(Math.max(y[i], y[i - 1] - GRADE * STEP), y[i - 1] + GRADE * STEP);
    for (let i = n - 2; i >= 0; i--) y[i] = Math.min(Math.max(y[i], y[i + 1] - GRADE * STEP), y[i + 1] + GRADE * STEP);
  }
  return { y, raw };
}
let profiles: { y: number[]; raw: number[] }[] | null = null;
const profileAll = () => (profiles ??= HOLES.map(profileOf));
const readAt = (p: number[], s: number) => {
  const u = Math.max(0, Math.min(p.length - 1, s / STEP));
  const i = Math.min(p.length - 2, Math.floor(u));
  return p[i] + (p[i + 1] - p[i]) * (u - i);
};
/** A hole's line's height at `s` along it */
export const lineAt = (h: Hole, s: number) => readAt(profileAll()[h.n - 1].y, s);
/** The land's own height on a hole's line at `s` along it (before it was smoothed) */
const landOnLine = (h: Hole, s: number) => readAt(profileAll()[h.n - 1].raw, s);
/** The land under a tee's box, on the mean (as much cut as filled) */
function landUnderTee(h: Hole) {
  const t = teeOf(h);
  let [sum, n] = [0, 0];
  for (const u of [-1, 0, 1]) for (const v of [-1, 0, 1]) (sum += landAt(t.at[0] + t.dir[0] * u * TEE[0] - t.dir[1] * v * TEE[1], t.at[1] + t.dir[1] * u * TEE[0] + t.dir[0] * v * TEE[1])), n++;
  return sum / n;
}
/** The tee's level: the line's ground there (a par 3's, with no fairway held to its line, the land's under it), raised */
export const teeLevel = (h: Hole) => (h.fairway ? lineAt(h, 0) : landUnderTee(h)) + h.raise;
/** The green's middle's level: its front meeting its approach (the line's ground there, a little over it), or on a par
 * 3 the land's: a green stands up from its approach, and on a hole that climbs to it, it's cut level into the slope */
export const greenLevel = (h: Hole) =>
  (h.fairway ? lineAt(h, lengthOf(h) - h.green[0] - GREEN_HOLD) + GREEN_TILT * (h.green[0] + GREEN_HOLD) : landAt(...h.line.at(-1)!)) + 0.2;
/** How much a green rises from front to back, per tile */
export const GREEN_TILT = 0.018;
/** How far round a green its plane holds (past its fringe), then how far it eases back */
const GREEN_HOLD = FRINGE + 1.2;
const GREEN_EASE = 5;
/** How far round a tee's box it eases back */
const TEE_EASE = 8;
/** How deep a bunker's sand lies under the ground round it (a shallow bowl: on the city's 2-tile grid a deeper, sharper
 * one creased the ground, and the creases were inked) */
export const BUNKER_DEPTH = 0.3;
/** The clubhouse's grounds: level, eased back over this */
const GROUNDS_EASE = 14;

/** Each hole's box, as far as it shapes the ground */
const REACH = 12 + FIRST_CUT + BANK_EASE;
const BOXES: Rect[] = /* @__PURE__ */ HOLES.map((h) => {
  const xs = h.line.map((p) => p[0]);
  const zs = h.line.map((p) => p[1]);
  return [Math.min(...xs) - REACH - 12, Math.min(...zs) - REACH - 12, Math.max(...xs) + REACH + 12, Math.max(...zs) + REACH + 12];
});

/** The ground before its lakes (`dug`: with its bunkers) */
function shapedAt(x: number, z: number, dug = true) {
  const land = landAt(x, z);
  let h = land;
  // The holes' lines, held along their fairways and gentler across them, the nearest all but deciding (a par 3's carry
  // is the land as it lies: only its tee and green are shaped)
  let [most, sum, weight] = [0, 0, 0];
  const near: number[] = [];
  for (const [i, hole] of HOLES.entries()) {
    const b = BOXES[i];
    if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) continue;
    near.push(i);
    if (!hole.fairway) continue;
    const n = nearestOn(hole, x, z);
    const core = fairwayHalf(hole, Math.max(hole.fairway.from, Math.min(fairwayEnd(hole), n.s))) + FIRST_CUT;
    const w = 1 - smooth(core, core + BANK_EASE, n.d);
    if (w <= 0) continue;
    most = Math.max(most, w);
    const k = w ** 6 / (1 + n.d);
    const cross = Math.max(-CROSS_MAX, Math.min(CROSS_MAX, CROSS * (land - landOnLine(hole, n.s))));
    sum += (lineAt(hole, n.s) + cross) * k;
    weight += k;
  }
  if (most > 0) h += (sum / weight - h) * most;
  // The clubhouse's grounds, level at the rise's top
  const [gx0, gz0, gx1, gz1] = CLUB_GROUNDS;
  const dg = Math.hypot(Math.max(gx0 - x, 0, x - gx1), Math.max(gz0 - z, 0, z - gz1));
  if (dg < GROUNDS_EASE) h += (groundsLevel() - h) * (1 - smooth(0, GROUNDS_EASE, dg));
  // The tees, level; the greens, tilted planes
  for (const i of near) {
    const hole = HOLES[i];
    const t = teeOf(hole);
    const [dx, dz] = [x - t.at[0], z - t.at[1]];
    const [u, v] = [Math.abs(dx * t.dir[0] + dz * t.dir[1]) - TEE[0], Math.abs(-dx * t.dir[1] + dz * t.dir[0]) - TEE[1]];
    const dt = Math.hypot(Math.max(u, 0), Math.max(v, 0));
    if (dt < TEE_EASE) h += (teeLevel(hole) - h) * (1 - smooth(0, TEE_EASE, dt));
    const g = greenOf(hole);
    const e = ellipseAt(g.at, g.dir, hole.green, x, z);
    const out = (e - 1) * Math.min(...hole.green);
    if (out < GREEN_HOLD + GREEN_EASE) {
      const along = (x - g.at[0]) * g.dir[0] + (z - g.at[1]) * g.dir[1];
      h += (greenLevel(hole) + GREEN_TILT * along - h) * (1 - smooth(GREEN_HOLD, GREEN_HOLD + GREEN_EASE, out));
    }
  }
  // The bunkers, dug in
  if (dug)
    for (const i of near)
      for (const b of bunkersOf(HOLES[i])) {
        const e = ellipseAt(b.at, b.dir, b.r, x, z);
        if (e < 1) h -= BUNKER_DEPTH * (1 - smooth(0, 1, e));
      }
  return h;
}
let grounds: number | null = null;
/** The clubhouse's grounds' level: the land at their middle */
export const groundsLevel = () => (grounds ??= landAt(...CLUB_CENTRE));

/* ---------- The water ---------- */

/** How far under its lowest shore a lake's water lies, and its bed under that */
export const SHORE_OVER = 0.35;
export const LAKE_DEPTH = 1.2;
const waters = /* @__PURE__ */ new Map<string, number>();
/** A lake's water level: under the lowest of its shore */
export function lakeWater(l: Lake) {
  let w = waters.get(l.id);
  if (w === undefined) {
    w = Infinity;
    const [c, s] = [Math.cos(l.turn), Math.sin(l.turn)];
    for (let k = 0; k < 96; k++) {
      // (walked out from the middle to where the shore is, 1 on lakeAt())
      const a = (k / 96) * Math.PI * 2;
      const [u, v] = [Math.cos(a) * l.r[0], Math.sin(a) * l.r[1]];
      const [dx, dz] = [u * c - v * s, u * s + v * c];
      let r = 1;
      for (let it = 0; it < 30; it++) r *= 1 / lakeAt(l, l.at[0] + dx * r, l.at[1] + dz * r);
      w = Math.min(w, shapedAt(l.at[0] + dx * r, l.at[1] + dz * r));
    }
    w -= SHORE_OVER;
    waters.set(l.id, w);
  }
  return w;
}
/** How far in from a lake's shore its bank takes to fall to its bed (in its own radius: 1 the shore) */
const BANK_IN = 0.45;

/** The course's ground's height at a point (tiles over today's ground; 0 off the course and at its edge; `dug`: with
 * the bunkers dug in, the tests compare) */
export function golfHeightAt(x: number, z: number, dug = true) {
  if (x <= COURSE_RECT[0] || x >= COURSE_RECT[2] || z <= COURSE_RECT[1] || z >= COURSE_RECT[3]) return 0;
  const inset = insetOf(x, z);
  if (inset <= 0) return 0;
  let h = shapedAt(x, z, dug);
  for (const l of LAKES) {
    const e = lakeAt(l, x, z);
    if (e < 1) h += (lakeWater(l) - LAKE_DEPTH - h) * (1 - smooth(BANK_IN, 1, e));
  }
  return h * smooth(0, 6, inset);
}
