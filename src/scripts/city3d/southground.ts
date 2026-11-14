/*
 * The south's rolling ground (docs/south-plan.md Phase 1c, the owner's calls: rolling under everything in Endswood and
 * its new land, nothing built elsewhere moving; the village's hill about two storeys, St Aldwyn's on top; Degen's
 * compound on a level pad; DOM-free, tested in tests/southground.test.ts). Not in the city yet: Phase 1c's next step
 * puts it under the streets, blocks and footpaths, walking and driving.
 *
 * - **The land's own shape** (`landAt()`): the village's hill round the churchyard, gentle swells in the fields and
 *   under the council rows and the bungalows, the brook's valley a little lower, all eased to 0 (today's ground) where
 *   the south meets what's built and fixed: the ring road's edge, the south avenue and everything east of it, Lot 9's
 *   fence, the tunnel's mouth, Degen's plot, and the edge of the south's land.
 * - **The roads' beds** (`ROAD_BEDS`): each street's height along it, its land smoothed along it and held to a gentle
 *   grade (`GRADE`), level across it; so a road rides over the brook's valley on its bridge rather than dipping in.
 * - **The ground** (`southHeightAt()`): the land, eased onto the beds near the roads (`BED_EASE` past the sidewalk), so
 *   a block's edge meets its kerb, as Crestmont's hill roads' banks do (terrain.ts).
 */
import { BROOK, BROOK_HALF, CHURCHYARD, COMPOUND, EDGE_Z, LOT9_EDGE, SOUTH_STREETS, type Pt } from './south';
import { distTo, inside } from './streetfaces';
import { smooth } from './hills';

type Rect = [number, number, number, number];

/** The village's hill: about two storeys over today's ground (home.ts's two storeys are 2.5) */
export const HILL_H = 2.4;
/** The steepest a road may climb along it (one in ten), and across it none */
export const GRADE = 0.1;
/** A sidewalk's width (layout.ts `WALK_W`) */
const WALK = 0.8;
/** How far past a road's sidewalk the ground eases from its bed back to the land */
export const BED_EASE = 5;
/** Where the south's ground may be anything but 0: its land, west of the south avenue (outside it, 0) */
export const SOUTH_GROUND_RECT: Rect = [-440, EDGE_Z, -8.2, 640];

/** The land's swells: centre, radii (along, across), turn (radians), height (negative a hollow) */
interface Swell {
  at: Pt;
  r: [number, number];
  turn: number;
  h: number;
}
const CHURCH: Pt = [CHURCHYARD.reduce((s, p) => s + p[0], 0) / CHURCHYARD.length, CHURCHYARD.reduce((s, p) => s + p[1], 0) / CHURCHYARD.length];
export const SWELLS: Swell[] = [
  // The village's hill, St Aldwyn's on its top, its long side along Church Road
  { at: CHURCH, r: [82, 62], turn: 0.25, h: HILL_H },
  // Swells in the fields out west and south, under the bungalows, the council rows
  { at: [-372, 418], r: [46, 38], turn: 0.6, h: 1.1 },
  { at: [-338, 574], r: [58, 40], turn: -0.3, h: 0.9 },
  { at: [-262, 352], r: [40, 30], turn: 0.1, h: 0.7 },
  { at: [-160, 372], r: [34, 24], turn: -0.2, h: 0.5 },
  { at: [-222, 598], r: [44, 30], turn: 0.2, h: 0.6 },
];
/** How far a bridge's deck stands over the brook's water */
export const BRIDGE_CLEAR = 0.7;
/** The brook's valley: how deep at the water, and how wide its sides */
export const VALLEY = { depth: 0.7, side: 12 };

/** How much of the land's shape shows at a point: 0 where the south meets what's fixed, easing to 1 away from it */
export function freedom(x: number, z: number) {
  const [x0, z0, x1, z1] = SOUTH_GROUND_RECT;
  if (x <= x0 || x >= x1 || z <= z0 || z >= z1) return 0;
  let f = 1;
  // (the edge of its land, and the ring road's edge: today's ground there)
  f *= smooth(x0, x0 + 24, x) * smooth(z0 + 4, z0 + 26, z) * (1 - smooth(z1 - 24, z1, z));
  // (the south avenue and everything east of it)
  f *= 1 - smooth(-44, -14, x);
  // (Lot 9's fence, and inside it)
  if (inside(LOT9_EDGE, [x, z])) return 0;
  f *= smooth(2, 16, distTo(LOT9_EDGE, [x, z], true));
  // (Degen's plot: level at today's height, eased round its walls)
  const [px0, pz0, px1, pz1] = COMPOUND;
  f *= smooth(1, 14, Math.hypot(Math.max(px0 - x, 0, x - px1), Math.max(pz0 - z, 0, z - pz1)));
  // (the tunnel's mouth under the ring road)
  f *= smooth(6, 20, Math.hypot(x + 112, z - 337));
  return f;
}

/** The land's own shape at a point (before the roads' beds) */
export function landAt(x: number, z: number) {
  const f = freedom(x, z);
  if (f <= 0) return 0;
  let h = 0;
  for (const s of SWELLS) {
    const [dx, dz] = [x - s.at[0], z - s.at[1]];
    const [c, sn] = [Math.cos(s.turn), Math.sin(s.turn)];
    const [u, v] = [(dx * c + dz * sn) / s.r[0], (-dx * sn + dz * c) / s.r[1]];
    const d = Math.hypot(u, v);
    if (d < 1) h += s.h * 0.5 * (1 + Math.cos(Math.PI * d));
  }
  const b = distTo(BROOK, [x, z]);
  if (b < BROOK_HALF + VALLEY.side) h -= VALLEY.depth * (1 - smooth(BROOK_HALF, BROOK_HALF + VALLEY.side, b));
  return h * f;
}

/* ---------- The roads' beds ---------- */

export interface Bed {
  street: string;
  pts: Pt[];
  /** The bed's height at each of the street's points */
  y: number[];
  half: number;
  loop?: true;
}
/** How firmly what's fixed holds a road's bed at today's height: 0 by Lot 9, Degen's plot, the tunnel's mouth, the
 * south avenue and the ring road's edge, easing to 1 within 10 of them */
function pinned(x: number, z: number) {
  const [px0, pz0, px1, pz1] = COMPOUND;
  const d = Math.min(
    inside(LOT9_EDGE, [x, z]) ? 0 : distTo(LOT9_EDGE, [x, z], true),
    Math.hypot(Math.max(px0 - x, 0, x - px1), Math.max(pz0 - z, 0, z - pz1)),
    Math.hypot(x + 112, z - 337),
    Math.max(0, -14 - x),
    Math.max(0, z - SOUTH_GROUND_RECT[1] - 4),
  );
  return smooth(1, 10, d);
}
/** Arc length along a line */
const arcOf = (pts: Pt[]) => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return cum;
};
/** A road's own profile: the land along it averaged over a stretch either way (a road doesn't follow every hollow),
 * held to today's height by what's fixed, lifted over the brook to a bridge's deck */
function profileOf(pts: Pt[]): number[] {
  const n = pts.length;
  const cum = arcOf(pts);
  const raw = pts.map(([x, z]) => landAt(x, z));
  const W = 14;
  return raw.map((_, i) => {
    let [s, w] = [0, 0];
    for (let j = 0; j < n; j++) {
      const d = Math.abs(cum[j] - cum[i]);
      if (d > W) continue;
      const k = 1 - d / W;
      s += raw[j] * k;
      w += k;
    }
    let y = (s / w) * pinned(pts[i][0], pts[i][1]);
    if (distTo(BROOK, pts[i]) < BROOK_HALF + 8) y = Math.max(y, -VALLEY.depth + BRIDGE_CLEAR);
    return y;
  });
}
const keyOf = (p: Pt) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
export const ROAD_BEDS: Bed[] = (() => {
  const beds = SOUTH_STREETS.map((s) => ({ street: s.id, pts: s.pts, y: profileOf(s.pts), half: s.half, ...(s.loop ? { loop: true as const } : {}) }));
  // Where streets meet (a point in two or more), the height they share: the mean of their profiles there
  const shared = new Map<string, number[]>();
  for (const b of beds) for (const [i, p] of b.pts.entries()) shared.set(keyOf(p), [...(shared.get(keyOf(p)) ?? []), b.y[i]]);
  const target = new Map<string, number>();
  for (const [k, ys] of shared) if (ys.length > 1) target.set(k, ys.reduce((a, c) => a + c, 0) / ys.length);
  for (const b of beds) {
    const cum = arcOf(b.pts);
    // (each bed pinned at its junctions, the difference eased along it between them; past its first and last, held)
    const pins = b.pts.map((p, i) => (target.has(keyOf(p)) ? i : -1)).filter((i) => i >= 0);
    if (!pins.length) continue;
    const delta = pins.map((i) => target.get(keyOf(b.pts[i]))! - b.y[i]);
    const at = (i: number) => {
      if (i <= pins[0]) return delta[0];
      if (i >= pins[pins.length - 1]) return delta[delta.length - 1];
      let k = 0;
      while (pins[k + 1] < i) k++;
      const f = (cum[i] - cum[pins[k]]) / (cum[pins[k + 1]] - cum[pins[k]] || 1);
      return delta[k] + (delta[k + 1] - delta[k]) * f;
    };
    const fixed = new Set(pins);
    b.y = b.y.map((y, i) => (fixed.has(i) ? target.get(keyOf(b.pts[i]))! : y + at(i)));
    // (held to its grade between its pins: forwards then back, the pins left where they are)
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < b.y.length; i++) if (!fixed.has(i)) b.y[i] = Math.min(Math.max(b.y[i], b.y[i - 1] - GRADE * (cum[i] - cum[i - 1])), b.y[i - 1] + GRADE * (cum[i] - cum[i - 1]));
      for (let i = b.y.length - 2; i >= 0; i--) if (!fixed.has(i)) b.y[i] = Math.min(Math.max(b.y[i], b.y[i + 1] - GRADE * (cum[i + 1] - cum[i])), b.y[i + 1] + GRADE * (cum[i + 1] - cum[i]));
    }
    if (b.loop) b.y[b.y.length - 1] = b.y[0];
  }
  return beds;
})();

/* ---------- The ground: the land eased onto the beds ---------- */

interface Piece {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  ya: number;
  yb: number;
  core: number;
}
const CELL = 8;
const PIECES = new Map<number, Piece[]>();
const cellKey = (i: number, j: number) => i * 100003 + j;
for (const b of ROAD_BEDS) {
  const core = b.half + WALK;
  const reach = core + BED_EASE;
  for (let k = 1; k < b.pts.length; k++) {
    const [a, c] = [b.pts[k - 1], b.pts[k]];
    const p: Piece = { ax: a[0], az: a[1], bx: c[0], bz: c[1], ya: b.y[k - 1], yb: b.y[k], core };
    for (let i = Math.floor((Math.min(a[0], c[0]) - reach) / CELL); i <= Math.floor((Math.max(a[0], c[0]) + reach) / CELL); i++)
      for (let j = Math.floor((Math.min(a[1], c[1]) - reach) / CELL); j <= Math.floor((Math.max(a[1], c[1]) + reach) / CELL); j++) {
        const key = cellKey(i, j);
        if (!PIECES.has(key)) PIECES.set(key, []);
        PIECES.get(key)!.push(p);
      }
  }
}
/** The beds over a point: their height there (the nearest all but deciding) and how firmly they hold (1 on a road
 * and its sidewalk) */
function bedAt(x: number, z: number): { y: number; w: number } | null {
  const list = PIECES.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (!list) return null;
  let [most, sum, weight] = [0, 0, 0];
  for (const p of list) {
    const [vx, vz] = [p.bx - p.ax, p.bz - p.az];
    const l2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - p.ax) * vx + (z - p.az) * vz) / l2));
    const d = Math.hypot(x - p.ax - vx * t, z - p.az - vz * t);
    const w = 1 - smooth(p.core, p.core + BED_EASE, d);
    if (w <= 0) continue;
    most = Math.max(most, w);
    const k = w ** 6 / (1 + d);
    sum += (p.ya + (p.yb - p.ya) * t) * k;
    weight += k;
  }
  return most > 0 ? { y: sum / weight, w: most } : null;
}

/** The south's ground's height at a point (tiles over today's ground; 0 outside `SOUTH_GROUND_RECT` and wherever
 * the south meets what's fixed) */
export function southHeightAt(x: number, z: number) {
  const [x0, z0, x1, z1] = SOUTH_GROUND_RECT;
  if (x <= x0 || x >= x1 || z <= z0 || z >= z1) return 0;
  let h = landAt(x, z);
  const bed = bedAt(x, z);
  if (bed) h += (bed.y - h) * bed.w;
  // (and right up to Lot 9's fence, today's ground: a road's bank by it eased down to it)
  if (x > -140 && z > 455) h *= smooth(2, 8, inside(LOT9_EDGE, [x, z]) ? 0 : distTo(LOT9_EDGE, [x, z], true));
  // (and Degen's plot level at today's height to its edge, the lane's bank by his gates eased down to it)
  const [px0, pz0, px1, pz1] = COMPOUND;
  if (x > px0 - 8 && x < px1 + 8 && z > pz0 - 8 && z < pz1 + 8) h *= smooth(0, 6, Math.hypot(Math.max(px0 - x, 0, x - px1), Math.max(pz0 - z, 0, z - pz1)));
  return h;
}
