/*
 * Exit 6A's road in (docs/south-plan.md Phase 5; the owner's calls, 2026-11-19): from The Trenches' south-west corner,
 * where trench-ns0 meets trench-ew1, straight out under the ring's south-west curve, square on to it (its slip ramps'
 * feet on it: viaduct.ts `EXITS`), bending on to the corner of the Docks' ring road (Dock Road into Yard Road); and from
 * there the link down to the south's streets, where its Gate Lane and Field Lane meet. Streets that follow the land and
 * meet the others at angles. DOM-free, in the street plan (streetplan.ts), tested in tests/cornerroad.test.ts.
 */
import { CORNER_FROM, RAMP_HALF, SLIP, ringPoint, ringS, type Pt } from './viaduct';
import { DOCK_X, YARD_Z } from './docks';
import { LANE } from './layout';

/** The roads' half width: the grid's streets' (one lane each way) */
export const CORNER_HALF = LANE;
/** The Docks' ring road's corner (Dock Road into Yard Road), where the road in meets it */
export const DOCKS_CORNER: Pt = [DOCK_X, YARD_Z];
/** Where the link meets the south's streets (south.ts: Gate Lane's top and Field Lane's east end) */
export const SOUTH_HUB: Pt = [-229, 340.5];

/** How far out past the ring's centre line the road stays square on to it: past the outside slip's foot and its kerb */
const SQUARE_OUT = SLIP.at + RAMP_HALF + 5;

/**
 * An even bend from `a`, heading `da` (a unit vector), to `b`: near enough an arc (a cubic whose end heading mirrors its
 * start's across the chord, so it turns the same all the way), every metre or so
 */
function arcTo(a: Pt, da: Pt, b: Pt): Pt[] {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ch = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const h1 = 2 * ch - Math.atan2(da[1], da[0]);
  const k = L / 3;
  const c1: Pt = [a[0] + da[0] * k, a[1] + da[1] * k];
  const c2: Pt = [b[0] - Math.cos(h1) * k, b[1] - Math.sin(h1) * k];
  const n = Math.max(2, Math.ceil(L));
  const out: Pt[] = [];
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const [w0, w1, w2, w3] = [(1 - u) ** 3, 3 * (1 - u) ** 2 * u, 3 * (1 - u) * u * u, u ** 3];
    out.push([w0 * a[0] + w1 * c1[0] + w2 * c2[0] + w3 * b[0], w0 * a[1] + w1 * c1[1] + w2 * c2[1] + w3 * b[1]]);
  }
  out[out.length - 1] = b;
  return out;
}

/** The ring's way out at the corner road: square on to the curve there, outward */
const S0 = ringS(CORNER_FROM[0], CORNER_FROM[1]).s;
const OUT_DIR: Pt = (() => {
  const [a, b] = [ringPoint(S0, 0), ringPoint(S0, 1)];
  return [b[0] - a[0], b[1] - a[1]];
})();
/** The link's way out of the Docks' corner: a little west of straight at the south's streets, bending east in to them */
const LINK_OUT: Pt = (() => {
  const a = Math.atan2(SOUTH_HUB[1] - DOCKS_CORNER[1], SOUTH_HUB[0] - DOCKS_CORNER[0]) + 0.14;
  return [Math.cos(a), Math.sin(a)];
})();

/** The road in: The Trenches' corner, square on under the ring, bending on to the Docks' ring road's corner */
const SQUARE_END = ringPoint(S0, SQUARE_OUT);
export const CORNER_ROAD: Pt[] = [CORNER_FROM, SQUARE_END, ...arcTo(SQUARE_END, OUT_DIR, DOCKS_CORNER)];
/** The link down from the Docks' ring road's corner to the south's streets, a long easy bend in to meet them at an angle */
export const CORNER_LINK: Pt[] = [DOCKS_CORNER, ...arcTo(DOCKS_CORNER, LINK_OUT, SOUTH_HUB)];

export const CORNER_STREETS = [
  { id: 'corner-road', name: 'Corner Road', pts: CORNER_ROAD, half: CORNER_HALF },
  { id: 'corner-link', name: 'Gate Hill', pts: CORNER_LINK, half: CORNER_HALF },
];

/** Between the roads' lamps, and how far out from the asphalt's edge they stand (on the verge: no sidewalk out here) */
export const CORNER_LAMP_GAP = 16;
const LAMP_OUT = 1.0;
/** Where the lamps keep away from: each junction, the ring's deck (its own lights under it), the exit's ramps */
const JUNCTIONS: Pt[] = [CORNER_FROM, DOCKS_CORNER, SOUTH_HUB];
/**
 * The roads' lamps (x, z, the way the arm faces, the foot's height): along Corner Road's south side and Gate Hill's
 * east, about every `CORNER_LAMP_GAP`, clear of the junctions, of the deck and the ramps' land
 */
export const CORNER_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  for (const [pts, side] of [
    [CORNER_ROAD, 1],
    [CORNER_LINK, 1],
  ] as const) {
    let run = CORNER_LAMP_GAP / 2;
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      run += l;
      if (run < CORNER_LAMP_GAP) continue;
      // (to the left of the way it's laid: south of Corner Road heading out, east of Gate Hill heading down)
      const [ux, uz] = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
      const [nx, nz] = [uz * side, -ux * side];
      const o = CORNER_HALF + LAMP_OUT;
      const [x, z] = [b[0] + nx * o, b[1] + nz * o];
      if (JUNCTIONS.some((j) => Math.hypot(j[0] - x, j[1] - z) < 9)) continue;
      if (Math.abs(ringS(x, z).o) < SLIP.at + RAMP_HALF + 3) continue;
      // (the arm out over the road)
      out.push([x, z, Math.atan2(nz, -nx), 0]);
      run = 0;
    }
  }
  return out;
})();
