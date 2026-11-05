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
import { PLAN, distToStreet, onSlab, type Pt, type Street, raised } from './streetplan';
import { SOLIDS } from './solids';
import { BUS_STOPS } from './transit';
import { ALLEYS } from './downtown';
import { STATIONS, TRACKS } from './metro';
import { AXIS_X, LANE_HALF, UPTOWN_LAMPS, E as UPTOWN_E, W as UPTOWN_W } from './uptown';
import { BENCHES as PARK_BENCHES, GATES, PARK_LAMPS, PARK_TREES, ZS as PARK_EDGE, treeFree } from './westlake';
import { GARDEN_SOLIDS, MALL_BEDS, PLANTERS } from './gardens';
import { LOOP, MALL_LAMPS, NORTH_Z as MALL_NORTH, ZEBRA as COURT_ZEBRA } from './mall';
import { vergeY } from './verges';

/** A ring side: its street, along x (an east-west avenue) or z, its centre line, which sides of it are dressed (+1 the larger coordinate) */
interface Side {
  street: Street;
  alongX: boolean;
  c: number;
  /** The sides that get lamps, and the one that's the town's (trees), if any */
  lamps: (1 | -1)[];
  town: 1 | -1 | null;
  /** Where along it the planted median runs (from, to) */
  median: [number, number];
}
const RING_LO = CORE_ROADS[0] - 21.5;
const RING_HI = CORE_ROADS[1] + 21.5;
const street = (id: string) => PLAN.streets.find((s) => s.id === id)!;
/** The four avenues round downtown: the north, west and east have the town outside them; the south has the river's promenade */
export const RING_SIDES: Side[] = [
  // (the north avenue's median planted on west past Uptown and Westlake Park to Uptown's west edge: Phase 6c)
  { street: street(`ew${EW_ROADS.findIndex((r) => r.c === RING_LO)}`), alongX: true, c: RING_LO, lamps: [-1, 1], town: -1, median: [UPTOWN_W, RING_HI] },
  { street: street(`ew${EW_ROADS.findIndex((r) => r.c === RING_HI)}`), alongX: true, c: RING_HI, lamps: [-1], town: null, median: [RING_LO, RING_HI] },
  { street: street(`ns${NS_ROADS.findIndex((r) => r.c === RING_LO)}`), alongX: false, c: RING_LO, lamps: [-1, 1], town: -1, median: [RING_LO, RING_HI] },
  // (the east avenue's median planted on north past Starlight Mall and Palm Court: Phase 6d)
  { street: street(`ns${NS_ROADS.findIndex((r) => r.c === RING_HI)}`), alongX: false, c: RING_HI, lamps: [-1, 1], town: 1, median: [MALL_NORTH, RING_HI] },
];

/** Lamps about every `LAMP_GAP` along a side, spread evenly over each stretch between junctions, `KERB_IN` in from the kerb so the walkers pass inside them */
export const LAMP_GAP = 10;
export const KERB_IN = 0.15;
/** Nothing of it nearer a junction than this along the street (its zebras stand at the cross street's half and a little) */
export const JUNCTION_CLEAR = 5.5;

const crossingsOn = (s: Street) => PLAN.crossings.filter((c) => c.streets.includes(s.id)).map((c) => c.at);
const point = (sd: Side, p: number, off: number): Pt => (sd.alongX ? [p, sd.c + off] : [sd.c + off, p]);
/** Within `m` of any street but this one (a diagonal's mouth, a cross street) */
const onOtherStreet = (sd: Side, q: Pt, m: number) => PLAN.streets.some((s) => s !== sd.street && !raised(s) && distToStreet(s, q) < s.half + m);
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
  // (Uptown's axis crosses the north avenue on a zebra: the median breaks there)
  if (sd.alongX && sd.c === RING_LO) cuts.push([AXIS_X - LANE_HALF - HEDGE_CLEAR, AXIS_X + LANE_HALF + HEDGE_CLEAR]);
  // (and Palm Court's zebra over the east avenue to the mall)
  if (!sd.alongX && sd.c === RING_HI) cuts.push([COURT_ZEBRA.z - COURT_ZEBRA.half - HEDGE_CLEAR, COURT_ZEBRA.z + COURT_ZEBRA.half + HEDGE_CLEAR]);
  // (anything solid standing on the median: the el's pillars)
  for (const b of SOLIDS) {
    const [m0, m1, l0, l1] = sd.alongX ? [b[1], b[3], b[0], b[2]] : [b[0], b[2], b[1], b[3]];
    if (m1 > sd.c - MEDIAN / 2 && m0 < sd.c + MEDIAN / 2) cuts.push([l0 - 0.35, l1 + 0.35]);
  }
  cuts.sort((p, q) => p[0] - q[0]);
  const out: MedianRun[] = [];
  const [lo, hi] = sd.median;
  let at = lo;
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
    if (c1 < lo) continue;
    if (c0 > at) push(at, Math.min(c0, hi));
    at = Math.max(at, c1);
  }
  if (at < hi) push(at, hi);
  return out;
});

/* ---------- Uptown and Westlake Park across the north avenue (Phase 6c) ---------- */

/**
 * The park's side of the avenue had no lamps (Uptown's stand on its own sidewalk every 12) and only the park's low wall
 * along a bare sidewalk. Now the same lamp stands across from each of Uptown's on the park's sidewalk, wherever there's
 * room (`PARK_SIDE_LAMPS`: on Uptown's spacing, clear of the junctions' zebras, the axis's zebra and the gates), and a
 * row of street trees stands just inside the park's wall (`PARK_EDGE_TREES`: about every `EDGE_TREE_GAP`, `EDGE_TREE_IN`
 * in from the edge, clear of the ring walk, the gates' ways in, the planters, benches, lamps and the park's own trees),
 * so Uptown's towers look across a tree-lined avenue.
 */
const NORTH = RING_SIDES[0];
/** The lamps' offset from the avenue's centre line: Uptown's (uptown.ts `UPTOWN_LAMPS`) */
const UPTOWN_OFF = NORTH.street.half + 0.45;
/** How far from a gate's middle the lamps keep (its piers stand at its half and a little) */
export const GATE_CLEAR = 2.2;
const edgeGates = GATES.filter((g) => Math.abs(g.at[1] - PARK_EDGE) < 1);
export const PARK_SIDE_LAMPS: [number, number, number][] = UPTOWN_LAMPS.filter(([, z]) => Math.abs(z - (NORTH.c + UPTOWN_OFF)) < 1e-6).flatMap(([x0]) => {
  // (one in front of a gate stands aside to flank it)
  const g = edgeGates.find((g) => Math.abs(g.at[0] - x0) < g.half + GATE_CLEAR);
  const x = g ? g.at[0] + Math.sign(x0 - g.at[0] || 1) * (g.half + GATE_CLEAR) : x0;
  const q: Pt = [x, NORTH.c - UPTOWN_OFF];
  if (crossingsOn(NORTH.street).some((c) => Math.abs(c[1] - NORTH.c) < 1 && Math.abs(c[0] - x) < JUNCTION_CLEAR)) return [];
  if (Math.abs(x - AXIS_X) < LANE_HALF + 1.5) return [];
  if (edgeGates.some((g) => Math.abs(g.at[0] - x) < g.half + GATE_CLEAR - 1e-6)) return [];
  if (solidAt(q, 0.3) || onOtherStreet(NORTH, q, 1.2)) return [];
  // (the arm reaches south over the road)
  return [[x, q[1], Math.atan2(1, 0)] as [number, number, number]];
});

/** The park's edge row: how far apart, how far in from the park's edge (the wall stands just inside it), and its size */
export const EDGE_TREE_GAP = 8;
export const EDGE_TREE_IN = 2.6;
export const EDGE_TREE_S = 1.05;
const clearOfPark = (q: Pt) =>
  treeFree(q) &&
  PARK_TREES.every((t) => Math.hypot(t.x - q[0], t.z - q[1]) > 2.2) &&
  PARK_LAMPS.every(([x, z]) => Math.hypot(x - q[0], z - q[1]) > 1.5) &&
  PARK_BENCHES.every((b) => Math.hypot(b.at[0] - q[0], b.at[1] - q[1]) > 1.6) &&
  PLANTERS.every((p) => Math.hypot(p.at[0] - q[0], p.at[1] - q[1]) > p.r + 1.2) &&
  !MALL_BEDS.some((r) => inBox(r, q, 1.2)) &&
  !GARDEN_SOLIDS.some((b) => inBox(b, q, 0.6));
export const PARK_EDGE_TREES: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  const z = PARK_EDGE - EDGE_TREE_IN;
  const n = Math.round((UPTOWN_E - UPTOWN_W - 4) / EDGE_TREE_GAP);
  for (let k = 0; k <= n; k++) {
    const x = UPTOWN_W + 2 + ((UPTOWN_E - UPTOWN_W - 4) * k) / n;
    if (clearOfPark([x, z])) out.push([x, z, EDGE_TREE_S]);
  }
  return out;
})();

/* ---------- Starlight Mall and Palm Court across the east avenue (Phase 6d) ---------- */

/**
 * Between the mall and Palm Court the east avenue had no lamps at all: the mall's anchor and then a bare strip of
 * grass between the mall's loop road and the avenue on one side, Palm Court's backs on the other, the el overhead.
 * Now the same lamp stands on both sides about every `LAMP_GAP` from the mall's north edge to the Parkway's
 * crossing, broken at Palm Court's zebra (`MALL_SIDE_LAMPS`: on the sidewalks, or on the strip's grass where there's
 * no sidewalk, never on a verge's bank), the median's hedge runs on under the el (the east side's `median` span, cut
 * at the zebra and round the pillars, no trees under the el), and the strip carries a row of street trees
 * (`STRIP_TREES`, about every `STRIP_TREE_GAP` down its middle, clear of the lamps and the verges).
 */
const EAST_SIDE = RING_SIDES[3];
/** The Parkway's crossing of the east avenue, north of the ring */
const PARKWAY_Z = PLAN.crossings.find((c) => c.streets.includes(EAST_SIDE.street.id) && c.streets.includes('parkway') && c.at[1] < RING_LO)!.at[1];
/** The stretch the lamps run along, north to south, and the zebra they keep off */
export const MALL_STRETCH: [number, number] = [MALL_NORTH + 2, PARKWAY_Z - JUNCTION_CLEAR];
const ZEBRA_CLEAR = COURT_ZEBRA.half + 2;
const mallLamps: Pt[] = MALL_LAMPS.map(([x, z]) => [x, z] as Pt);
/** A lamp: x, z, the arm's facing, and whether it stands on a slab (else on the ground) */
export const MALL_SIDE_LAMPS: [number, number, number, boolean][] = (() => {
  const out: [number, number, number, boolean][] = [];
  const spans: [number, number][] = [
    [MALL_STRETCH[0], COURT_ZEBRA.z - ZEBRA_CLEAR],
    [COURT_ZEBRA.z + ZEBRA_CLEAR, MALL_STRETCH[1]],
  ];
  for (const side of [-1, 1] as const)
    for (const [v0, v1] of spans) {
      const n = Math.max(1, Math.round((v1 - v0) / LAMP_GAP));
      for (let k = 0; k <= n; k++) {
        const q: Pt = [EAST_SIDE.c + side * (EAST_SIDE.street.half + KERB_IN), v0 + ((v1 - v0) * k) / n];
        const slab = onSlab(PLAN, q);
        // (never on a verge's bank: the slab eases down to the grass there)
        if (!slab && [-1.2, 0, 1.2].some((d) => vergeY(q[0], q[1] + d) > 0.005)) continue;
        if (solidAt(q, 0.3) || onOtherStreet(EAST_SIDE, q, 1.2) || mallLamps.some((m) => Math.hypot(m[0] - q[0], m[1] - q[1]) < 2.5)) continue;
        out.push([q[0], q[1], Math.atan2(0, -side), slab]);
      }
    }
  return out;
})();

/** The strip of grass between the mall's loop and the avenue: its middle line, and its trees' spacing and size */
export const STRIP_X = (LOOP.xE + LOOP.half + EAST_SIDE.c - EAST_SIDE.street.half) / 2;
export const STRIP_TREE_GAP = 8;
export const STRIP_TREE_S = 1;
export const STRIP_TREES: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  const [z0, z1] = [LOOP.zN - LOOP.half, LOOP.zS + LOOP.half];
  const n = Math.round((z1 - z0) / STRIP_TREE_GAP);
  const lamps: Pt[] = [...mallLamps, ...MALL_SIDE_LAMPS.map(([x, z]) => [x, z] as Pt)];
  for (let k = 0; k <= n; k++) {
    const q: Pt = [STRIP_X, z0 + ((z1 - z0) * k) / n];
    if (onSlab(PLAN, q) || [-1.5, 0, 1.5].some((d) => vergeY(q[0], q[1] + d) > 0.005)) continue;
    if (solidAt(q, 1) || PLAN.streets.some((s) => !raised(s) && distToStreet(s, q) < s.half + 0.8)) continue;
    // (a lamp beside it moves it along a little rather than losing it)
    const near = lamps.find((l) => Math.hypot(l[0] - q[0], l[1] - q[1]) < 2.2);
    if (near) q[1] = near[1] + Math.sign(q[1] - near[1] || 1) * 2.4;
    if (lamps.some((l) => Math.hypot(l[0] - q[0], l[1] - q[1]) < 2.2) || out.some((t) => Math.abs(t[1] - q[1]) < STRIP_TREE_GAP / 2)) continue;
    out.push([q[0], q[1], STRIP_TREE_S]);
  }
  return out;
})();
