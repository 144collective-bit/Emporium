/*
 * The concrete-era look on the town's streets (docs/highway-plan.md Phase 8, the owner's call; DOM-free, tested in
 * tests/streetwear.test.ts; read by streetwear3d.ts, the drawing's chunk only): on the grid's avenues and streets
 * inside the highway and downtown's diagonals, between their junctions:
 *
 * - `GUTTERS`: a concrete gutter along every kerb (where a block's sidewalk meets the street), with a drain grate in it
 *   every `WEAR.drainGap` and just before each junction (`DRAINS`).
 * - `PATCHES` (newer and older asphalt, each inside its lane, never across a line), `CRACKS` and `MANHOLES`, seeded.
 * - `STOP_LINES`: a white bar across the lanes coming into every lit junction (the turn lanes' own have theirs,
 *   turnlanes.ts), and give-way dashes coming into the unlit ones.
 *
 * Not on Uptown's streets (kept clean), The Trenches' (worn their own way: streets3d.ts), Harbour Bridge or Kestrel
 * Bridge, over the river, or under the raised highway.
 */
import { LANE, MEDIAN, RIVER } from './layout';
import { PLAN, onSlab, type Pt, type Street } from './streetplan';
import { rightOf } from './routes';
import { fromHighway, insideHighway } from './highway';
import { UPTOWN_RECT } from './uptown';
import { TRENCH_RECT } from './trenches';
import { HARBOUR_RECT } from './harbour';
import { SWING_RECT } from './swingbridge';
import { TURN_JUNCTIONS } from './turnlanes';

type Rect = [number, number, number, number];
/** The look's numbers: the gutter's width, between drains and manholes, the stop bar's and the give-way dashes' sizes */
export const WEAR = { gutter: 0.32, drainGap: 16, manholeGap: 28, bar: 0.3, dash: 0.5 };

/** The streets that get it: the grid's town pieces and the diagonals (layout.ts, downtown.ts) */
export const WORN_STREETS: Street[] = PLAN.streets.filter((s) => (/^(ns|ew)\d+[es]?$/.test(s.id) || s.id.startsWith('diag')) && s.pts.length === 2);
const OUT: Rect[] = [UPTOWN_RECT, TRENCH_RECT, HARBOUR_RECT, SWING_RECT];
const inRect = (r: Rect, x: number, z: number, m: number) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
/** Is x, z somewhere the look goes: inside the highway, clear of its deck, the river, and the places with their own */
export const wornAt = (x: number, z: number) =>
  insideHighway(x, z) && fromHighway(x, z) > 9 && !(z > RIVER[0] - 0.5 && z < RIVER[1] + 0.5) && !OUT.some((r) => inRect(r, x, z, 1));

/** A street's line: where it starts, the way it runs, its length, its right-hand side */
interface Line {
  s: Street;
  a: Pt;
  u: Pt;
  n: Pt;
  len: number;
}
const lineOf = (s: Street): Line => {
  const [a, b] = s.pts;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u: Pt = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  return { s, a, u, n: rightOf(...u), len };
};
const at = (l: Line, v: number, o: number): Pt => [l.a[0] + l.u[0] * v + l.n[0] * o, l.a[1] + l.u[1] * v + l.n[1] * o];
/** Its lanes' centres across it (right of its line +) */
const lanesOf = (s: Street) => (s.lanes === 2 ? [-(MEDIAN / 2 + LANE * 1.5), -(MEDIAN / 2 + LANE / 2), MEDIAN / 2 + LANE / 2, MEDIAN / 2 + LANE * 1.5] : [-LANE / 2, LANE / 2]);

/** Each crossing on a street: how far along, how far either side of it the junction (and its zebras) reaches, lit */
function cutsOf(l: Line) {
  return PLAN.crossings
    .filter((c) => c.streets.includes(l.s.id))
    .map((c) => {
      const v = (c.at[0] - l.a[0]) * l.u[0] + (c.at[1] - l.a[1]) * l.u[1];
      const others = c.streets.filter((id) => id !== l.s.id).map((id) => PLAN.streets.find((q) => q.id === id)!);
      const reach = Math.max(0, ...others.map((o) => o.half)) + 1.6;
      return { v, reach, lit: c.lights, j: c };
    });
}
/** A street's runs between its junctions where the look goes (along it: from, to) */
function runsOf(l: Line): [number, number][] {
  const cuts = cutsOf(l).map((c): [number, number] => [c.v - c.reach, c.v + c.reach]).sort((p, q) => p[0] - q[0]);
  const out: [number, number][] = [];
  let from: number | null = null;
  const clear = (v: number) => [-l.s.half, 0, l.s.half].every((o) => wornAt(...at(l, v, o))) && !cuts.some(([a, b]) => v > a && v < b);
  for (let v = 0; v <= l.len; v += 0.5) {
    const ok = clear(v);
    if (ok && from === null) from = v;
    if ((!ok || v + 0.5 > l.len) && from !== null) {
      if (v - from > 4) out.push([from, v]);
      from = null;
    }
  }
  return out;
}
/** A seeded random number from a street's id and how far along it */
const seeded = (id: string, v: number) => {
  let h = 2166136261;
  for (const ch of `${id}:${Math.round(v * 10)}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10007) / 10007;
};

export interface Strip {
  /** Which street, its middle, its yaw (along the street), length and width */
  street: string;
  x: number;
  z: number;
  yaw: number;
  len: number;
  wid: number;
}
export const GUTTERS: Strip[] = [];
export const DRAINS: Strip[] = [];
export const PATCHES: (Strip & { tone: 0 | 1 })[] = [];
export const CRACKS: Strip[] = [];
export const MANHOLES: { street: string; x: number; z: number }[] = [];
export const STOP_LINES: (Strip & { give: boolean })[] = [];

const yawOf = (u: Pt) => Math.atan2(-u[1], u[0]);
for (const s of WORN_STREETS) {
  const l = lineOf(s);
  const yaw = yawOf(l.u);
  const runs = runsOf(l);
  for (const [v0, v1] of runs) {
    // The gutters, each side where a block's sidewalk meets it (in pieces of 2, run together)
    for (const side of [-1, 1]) {
      const o = side * (s.half - WEAR.gutter / 2);
      const kerb = (v: number) => onSlab(PLAN, at(l, v, side * (s.half + 0.35)));
      let from: number | null = null;
      for (let v = v0; v <= v1 + 1e-6; v += 2) {
        const ok = v < v1 && kerb(Math.min(v + 1, v1));
        if (ok && from === null) from = v;
        if ((!ok || v + 2 > v1) && from !== null) {
          const to = Math.min(v1, ok ? v + 2 : v);
          for (let p = from; p < to - 0.2; p += 6) {
            const q = Math.min(to, p + 6);
            const [x, z] = at(l, (p + q) / 2, o);
            GUTTERS.push({ street: s.id, x, z, yaw, len: q - p, wid: WEAR.gutter });
          }
          // Drains along it, and one at each end (by the junction)
          for (let p = from + 1.2; p < to - 1; p += WEAR.drainGap) DRAINS.push({ street: s.id, ...xz(at(l, p, o)), yaw, len: 0.6, wid: 0.28 });
          if (to - from > 4) DRAINS.push({ street: s.id, ...xz(at(l, to - 1.2, o)), yaw, len: 0.6, wid: 0.28 });
          from = null;
        }
      }
    }
    // Patches, cracks and manholes down the lanes
    const lanes = lanesOf(s);
    let k = 0;
    for (let p = v0 + 2 + seeded(s.id, v0) * 5, len = 0; p < v1 - 2; p += len + 2 + seeded(s.id, p + 1) * 7, k++) {
      const r = seeded(s.id, p);
      const lane = lanes[Math.floor(seeded(s.id, p + 0.3) * lanes.length)];
      len = 1.2 + seeded(s.id, p + 0.6) * 2.6;
      if (p + len > v1 - 0.6) break;
      const wid = Math.min(LANE - 0.4, 0.6 + seeded(s.id, p + 0.9) * 0.6);
      const [x, z] = at(l, p + len / 2, lane);
      if (r < 0.45) PATCHES.push({ street: s.id, x, z, yaw, len, wid, tone: r < 0.25 ? 0 : 1 });
      else if (r < 0.7) for (let q = 0; q < 3; q++) CRACKS.push({ street: s.id, ...xz(at(l, p + q * 0.5, lane + (seeded(s.id, p + q) - 0.5) * 0.7)), yaw: yaw + (seeded(s.id, p + q + 0.5) - 0.5) * 0.6, len: 0.5, wid: 0.03 });
    }
    for (let p = v0 + WEAR.manholeGap / 2, i = 0; p < v1 - 1.5; p += WEAR.manholeGap, i++) MANHOLES.push({ street: s.id, ...xz(at(l, p, lanes[(i * 3) % lanes.length])) });
  }
  // Stop lines (lit junctions) and give-way dashes (unlit) across the lanes coming in, just outside each junction
  for (const c of cutsOf(l)) {
    if (TURN_JUNCTIONS.some((j) => j.at[0] === c.j.at[0] && j.at[1] === c.j.at[1])) continue;
    for (const dir of [-1, 1]) {
      // (coming in from before it along the street, dir 1, its lanes on the right; from after it, on the left)
      const v = c.v - dir * (c.reach + 0.2);
      if (v < 0.5 || v > l.len - 0.5 || ![-s.half, 0, s.half].every((o) => wornAt(...at(l, v, o)))) continue;
      const side = dir;
      const o0 = s.lanes === 2 ? MEDIAN / 2 : 0.1;
      const o1 = s.half - WEAR.gutter - 0.05;
      const [x, z] = at(l, v, side * (o0 + o1) / 2);
      STOP_LINES.push({ street: s.id, x, z, yaw, len: WEAR.bar, wid: o1 - o0, give: !c.lit });
    }
  }
}
function xz(p: Pt) {
  return { x: p[0], z: p[1] };
}
