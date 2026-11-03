/*
 * Downtown's ring avenue as one street both sides (docs/blend-plan.md Phase 6b; DOM-free, tested in
 * tests/ringstreet.test.ts). Before this the four avenues round downtown had no lamps and no street trees: downtown's
 * fronts on one side, the town's lawns and pads on the other, a bare kerb between. Now the same white lamp stands on
 * both sidewalks at the same spacing, by the kerb, its arm over the road (`RING_LAMPS`; on the river side of the
 * south avenue the promenade's lamps stand already), and the avenues' median carries Uptown's planting on round
 * downtown (`RING_MEDIAN`: the bank avenue's clipped hedge and slim columnar trees, boulevarddress.ts), so both sides
 * look across the same street. There's no room for street trees by the sidewalks: downtown is built to its sidewalk,
 * and the town's frontage is its pads and the flower beds between them.
 *
 * Everything keeps clear of the junctions and their zebras, the diagonals' mouths, the bus shelters, the alleys'
 * mouths, the metro's door and pillars, and anything solid.
 */
import { CORE_ROADS, EW_ROADS, MEDIAN, NS_ROADS } from './layout';
import { PLAN, distToStreet, type Pt, type Street } from './streetplan';
import { SOLIDS } from './solids';
import { BUS_STOPS } from './transit';
import { ALLEYS } from './downtown';
import { STATIONS, TRACKS } from './metro';

/** A ring side: its street, along x (an east-west avenue) or z, its centre line, which sides of it are dressed (+1 the larger coordinate) */
interface Side {
  street: Street;
  alongX: boolean;
  c: number;
  /** The sides that get lamps, and the one that's the town's (trees), if any */
  lamps: (1 | -1)[];
  town: 1 | -1 | null;
}
const RING_LO = CORE_ROADS[0] - 21.5;
const RING_HI = CORE_ROADS[1] + 21.5;
const street = (id: string) => PLAN.streets.find((s) => s.id === id)!;
/** The four avenues round downtown: the north, west and east have the town outside them; the south has the river's promenade */
export const RING_SIDES: Side[] = [
  { street: street(`ew${EW_ROADS.findIndex((r) => r.c === RING_LO)}`), alongX: true, c: RING_LO, lamps: [-1, 1], town: -1 },
  { street: street(`ew${EW_ROADS.findIndex((r) => r.c === RING_HI)}`), alongX: true, c: RING_HI, lamps: [-1], town: null },
  { street: street(`ns${NS_ROADS.findIndex((r) => r.c === RING_LO)}`), alongX: false, c: RING_LO, lamps: [-1, 1], town: -1 },
  { street: street(`ns${NS_ROADS.findIndex((r) => r.c === RING_HI)}`), alongX: false, c: RING_HI, lamps: [-1, 1], town: 1 },
];

/** Lamps about every `LAMP_GAP` along a side, spread evenly over each stretch between junctions, `KERB_IN` in from the kerb so the walkers pass inside them */
export const LAMP_GAP = 10;
export const KERB_IN = 0.15;
/** Nothing of it nearer a junction than this along the street (its zebras stand at the cross street's half and a little) */
export const JUNCTION_CLEAR = 5.5;

const crossingsOn = (s: Street) => PLAN.crossings.filter((c) => c.streets.includes(s.id)).map((c) => c.at);
const point = (sd: Side, p: number, off: number): Pt => (sd.alongX ? [p, sd.c + off] : [sd.c + off, p]);
/** Within `m` of any street but this one (a diagonal's mouth, a cross street) */
const onOtherStreet = (sd: Side, q: Pt, m: number) => PLAN.streets.some((s) => s !== sd.street && s.kind !== 'highway' && distToStreet(s, q) < s.half + m);
const inBox = (r: readonly number[], q: Pt, m: number) => q[0] > r[0] - m && q[0] < r[2] + m && q[1] > r[1] - m && q[1] < r[3] + m;
const solidAt = (q: Pt, m: number) => SOLIDS.some((b) => inBox(b, q, m));
const metroDoors: Pt[] = STATIONS.map((s) => [s.door.x, s.door.z] as Pt);

/** A lamp: where its pole stands and the way its arm reaches (`ry`, as `addLamp()` takes it) */
/** Where along a side its lamps go: each stretch between its junctions (beside downtown) spread evenly, `JUNCTION_CLEAR` from each end */
function lampSpots(sd: Side): number[] {
  const at = [...new Set(crossingsOn(sd.street).filter((q) => Math.abs((sd.alongX ? q[1] : q[0]) - sd.c) < 1).map((q) => (sd.alongX ? q[0] : q[1])))]
    .filter((v) => v >= RING_LO - 1e-6 && v <= RING_HI + 1e-6)
    .sort((a, b) => a - b);
  const out: number[] = [];
  for (let i = 1; i < at.length; i++) {
    const [v0, v1] = [at[i - 1] + JUNCTION_CLEAR, at[i] - JUNCTION_CLEAR];
    if (v1 < v0) continue;
    const n = Math.max(1, Math.round((v1 - v0) / LAMP_GAP));
    for (let k = 0; k <= n; k++) out.push(v0 + ((v1 - v0) * k) / n);
  }
  return out;
}

/** A lamp: where its pole stands and the way its arm reaches (`ry`, as `addLamp()` takes it) */
export const RING_LAMPS: [number, number, number][] = RING_SIDES.flatMap((sd) => {
  const out: [number, number, number][] = [];
  for (const side of sd.lamps)
    for (const p of lampSpots(sd)) {
      const q = point(sd, p, side * (sd.street.half + KERB_IN));
      if (onOtherStreet(sd, q, 1.2)) continue;
      if (BUS_STOPS.some((b) => Math.hypot(b.kerb[0] - q[0], b.kerb[1] - q[1]) < 2.4)) continue;
      if (ALLEYS.some((a) => inBox(a.box, q, 1.2))) continue;
      if (metroDoors.some((d) => Math.hypot(d[0] - q[0], d[1] - q[1]) < 2)) continue;
      if (solidAt(q, 0.3)) continue;
      // (the arm reaches over the road: towards the centre line)
      const [nx, nz] = sd.alongX ? [0, side] : [side, 0];
      out.push([q[0], q[1], Math.atan2(nz, -nx)]);
    }
  return out;
});

/* ---------- The planted median ---------- */

/** The hedge along the median (Uptown's: boulevarddress.ts `HEDGE`): its width and height over the median's top */
export const HEDGE = { w: MEDIAN - 0.22, h: 0.36 };
/** How far short of a crossing street's asphalt the hedge stops (its zebras and a little) */
export const HEDGE_CLEAR = 1.6;
/** Slim columnar trees along the hedge about every `TREE_GAP`, spread evenly `TREE_IN` in from each run's ends; none under the el */
export const TREE_GAP = 6;
export const TREE_IN = 2;
const segDist = (p: Pt, a: Pt, b: Pt) => {
  const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
  const l2 = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / l2));
  return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t);
};
const underEl = (q: Pt) => (Object.values(TRACKS) as { pts: Pt[] }[]).some((t) => t.pts.slice(1).some((b, i) => segDist(q, t.pts[i], b) < 3));
/** How far along a side a crossing street's asphalt reaches from the junction (a diagonal slants across the avenue) */
function reachOf(sd: Side, at: Pt, s: Street) {
  const k = s.pts.findIndex((p) => Math.hypot(p[0] - at[0], p[1] - at[1]) < 1e-6);
  const [a, b] = k < 0 ? [s.pts[0], s.pts[1]] : k < s.pts.length - 1 ? [s.pts[k], s.pts[k + 1]] : [s.pts[k - 1], s.pts[k]];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const [along, cross] = sd.alongX ? [Math.abs(b[0] - a[0]) / l, Math.abs(b[1] - a[1]) / l] : [Math.abs(b[1] - a[1]) / l, Math.abs(b[0] - a[0]) / l];
  return s.half / Math.max(0.35, cross) + (sd.street.half * along) / Math.max(0.35, cross);
}

export interface MedianRun {
  street: string;
  alongX: boolean;
  /** The median's centre line */
  c: number;
  /** From, to along it */
  a: number;
  b: number;
  /** Where along it its trees stand */
  trees: number[];
}
/** The ring's planted median in runs: the stretches beside downtown, cut short of every crossing street and round anything solid on it */
export const RING_MEDIAN: MedianRun[] = RING_SIDES.flatMap((sd) => {
  const cuts: [number, number][] = [];
  for (const c of PLAN.crossings) {
    if (!c.streets.includes(sd.street.id) || Math.abs((sd.alongX ? c.at[1] : c.at[0]) - sd.c) > 1) continue;
    const v = sd.alongX ? c.at[0] : c.at[1];
    for (const id of c.streets) {
      if (id === sd.street.id) continue;
      const r = reachOf(sd, c.at, PLAN.streets.find((q) => q.id === id)!) + HEDGE_CLEAR;
      cuts.push([v - r, v + r]);
    }
  }
  // (anything solid standing on the median: the el's pillars)
  for (const b of SOLIDS) {
    const [m0, m1, l0, l1] = sd.alongX ? [b[1], b[3], b[0], b[2]] : [b[0], b[2], b[1], b[3]];
    if (m1 > sd.c - MEDIAN / 2 && m0 < sd.c + MEDIAN / 2) cuts.push([l0 - 0.35, l1 + 0.35]);
  }
  cuts.sort((p, q) => p[0] - q[0]);
  const out: MedianRun[] = [];
  let at = RING_LO;
  const push = (a: number, b: number) => {
    if (b - a < 2) return;
    const trees: number[] = [];
    const [t0, t1] = [a + TREE_IN, b - TREE_IN];
    const n = Math.floor((t1 - t0) / TREE_GAP);
    for (let k = 0; k <= n; k++) {
      const v = n === 0 ? (t0 + t1) / 2 : t0 + ((t1 - t0) * k) / n;
      if (!underEl(point(sd, v, 0))) trees.push(v);
    }
    out.push({ street: sd.street.id, alongX: sd.alongX, c: sd.c, a, b, trees });
  };
  for (const [c0, c1] of cuts) {
    if (c0 > at) push(at, Math.min(c0, RING_HI));
    at = Math.max(at, c1);
  }
  if (at < RING_HI) push(at, RING_HI);
  return out;
});
