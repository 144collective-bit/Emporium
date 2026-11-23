/**
 * The motorway exits' standard (docs/exits-plan.md, Phase 1): the numbers every ramp and interchange is built to, and
 * the checks that report each breach. DOM-free, read by the exits' data and tests (Phase 2 on); nothing in the city
 * reads it yet, so nothing changes.
 *
 * The cross-section, radii and grades stay close to real motorways (AASHTO's Green Book, DMRB CD 122); the lengths
 * along the road are about half real, since the ring is small and the game's cars pick up and stop fast
 * (the plan's table, "What real motorways do").
 */

export type Pt = [number, number];
/** A box on the ground: x0, z0, x1, z1 */
export type Rect = [number, number, number, number];

export const EXIT_STD = {
  /** A lane, the deck's and the streets' */
  lane: 1.7,
  /** A ramp's shoulders: outside (its right) and inside */
  shoulderOut: 0.5,
  shoulderIn: 0.3,
  /** A parapet's thickness each side */
  parapet: 0.1,
  /** A loop's least radius (the plan has none; any later one keeps to it) */
  loopRadius: 25,
  /** A ramp's least radius where it leaves or meets the deck, over `nearDeck` of its length at that end */
  deckRadius: 60,
  nearDeck: 25,
  /** A deceleration lane (an off-ramp's) and its taper; an acceleration lane (an on-ramp's) and its taper */
  decel: 55,
  decelTaper: 15,
  accel: 80,
  accelTaper: 25,
  /** The steepest grade a ramp climbs (rise over run) */
  grade: 0.05,
  /** Clear height under the deck */
  clearance: 2.8,
  /** How far apart two interchanges stand at least (centre to centre, along the ring: one a side) */
  spacing: 300,
  /** How far a ramp keeps from a solid, a street's edge (unless it meets that street) and a pillar */
  clearSolid: 0.5,
  clearStreet: 0.5,
  clearPillar: 0.6,
  /** The least angle (degrees) a ramp's foot meets its street at: near square, as a ramp's terminal should */
  footAngle: 60,
  /** Banking on a ramp's curves, and at the ring's tight corners */
  bankRamp: 0.04,
  bankCorner: 0.06,
} as const;

/** A ramp's width across its parapets: its lanes, both shoulders and a parapet each side */
export const rampWidth = (lanes: 1 | 2) => lanes * EXIT_STD.lane + EXIT_STD.shoulderOut + EXIT_STD.shoulderIn + 2 * EXIT_STD.parapet;

/** A ramp as built: its middle line from the deck end to the street end, the height at each point, its lanes and width */
export interface Ramp {
  id: string;
  kind: 'off' | 'on';
  /** Its middle line, its first point where it leaves (or joins) the deck */
  pts: Pt[];
  /** The road's height at each point */
  y: number[];
  lanes: 1 | 2;
  /** Across its parapets */
  width: number;
  /** Its lane alongside the deck (deceleration for an off-ramp, acceleration for an on-ramp) and that lane's taper */
  speedLane: number;
  taper: number;
  /** The street it meets at its foot, which it may touch */
  street?: string;
}

/** What a ramp keeps clear of */
export interface Surroundings {
  solids?: Rect[];
  streets?: { id: string; pts: Pt[]; half: number }[];
  pillars?: Pt[];
}

/** A breach of the standard: which rule, where, and by how much */
export interface Breach {
  id: string;
  rule: 'width' | 'grade' | 'radius' | 'speedLane' | 'taper' | 'solid' | 'street' | 'pillar' | 'spacing' | 'clearance' | 'angle';
  note: string;
}

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
/** The radius of the circle through three points (Infinity on a straight) */
export function radiusThrough(a: Pt, b: Pt, c: Pt): number {
  const [ab, bc, ca] = [dist(a, b), dist(b, c), dist(c, a)];
  const cross = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  return cross < 1e-9 ? Infinity : (ab * bc * ca) / (2 * cross);
}
/** How far a point is from a line of points */
export function distToLine(pts: Pt[], p: Pt): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / (vx * vx + vz * vz || 1)));
    best = Math.min(best, Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t));
  }
  return best;
}

/** Every breach of the standard on one ramp (none: it meets it) */
export function checkRamp(r: Ramp, around: Surroundings = {}): Breach[] {
  const out: Breach[] = [];
  const S = EXIT_STD;
  const add = (rule: Breach['rule'], note: string) => out.push({ id: r.id, rule, note });
  const need = rampWidth(r.lanes);
  if (r.width < need - 1e-6) add('width', `${r.width.toFixed(2)} across, ${need.toFixed(2)} needed for ${r.lanes} lane${r.lanes > 1 ? 's' : ''}`);
  // Grade, piece by piece
  for (let i = 1; i < r.pts.length; i++) {
    const run = dist(r.pts[i - 1], r.pts[i]);
    if (run > 1e-6 && Math.abs(r.y[i] - r.y[i - 1]) / run > S.grade + 1e-6) add('grade', `${((Math.abs(r.y[i] - r.y[i - 1]) / run) * 100).toFixed(1)}% at point ${i}`);
  }
  // Radius: the deck's standard near the deck end, a loop's anywhere else
  let along = 0;
  for (let i = 1; i + 1 < r.pts.length; i++) {
    along += dist(r.pts[i - 1], r.pts[i]);
    const rad = radiusThrough(r.pts[i - 1], r.pts[i], r.pts[i + 1]);
    const least = along <= S.nearDeck ? S.deckRadius : S.loopRadius;
    if (rad < least - 1e-6) add('radius', `${rad.toFixed(1)} at point ${i}, ${least} needed`);
  }
  // Its lane alongside the deck
  const [lane, taper] = r.kind === 'off' ? [S.decel, S.decelTaper] : [S.accel, S.accelTaper];
  if (r.speedLane < lane - 1e-6) add('speedLane', `${r.kind === 'off' ? 'deceleration' : 'acceleration'} lane ${r.speedLane}, ${lane} needed`);
  if (r.taper < taper - 1e-6) add('taper', `taper ${r.taper}, ${taper} needed`);
  // Its foot meets its own street near square
  const own = (around.streets ?? []).find((s) => s.id === r.street);
  if (own && r.pts.length >= 2) {
    const [a, b] = [r.pts[r.pts.length - 2], r.pts[r.pts.length - 1]];
    let [best, k] = [Infinity, 1];
    for (let i = 1; i < own.pts.length; i++) {
      const d = distToLine([own.pts[i - 1], own.pts[i]], b);
      if (d < best) [best, k] = [d, i];
    }
    const [u, v] = [own.pts[k - 1], own.pts[k]];
    const [rx, rz, sx, sz] = [b[0] - a[0], b[1] - a[1], v[0] - u[0], v[1] - u[1]];
    const cos = Math.abs(rx * sx + rz * sz) / ((Math.hypot(rx, rz) * Math.hypot(sx, sz)) || 1);
    const deg = (Math.acos(Math.min(1, cos)) * 180) / Math.PI;
    if (deg < S.footAngle - 1e-6) add('angle', `meets ${own.id} at ${deg.toFixed(0)} degrees, ${S.footAngle} needed`);
  }
  // Clear of what's around it (its edge: half its width out from its middle)
  const half = r.width / 2;
  for (const p of r.pts) {
    for (const b of around.solids ?? []) {
      const dx = Math.max(b[0] - p[0], 0, p[0] - b[2]);
      const dz = Math.max(b[1] - p[1], 0, p[1] - b[3]);
      if (Math.hypot(dx, dz) < half + S.clearSolid) add('solid', `within ${(Math.hypot(dx, dz) - half).toFixed(2)} of a solid at ${p[0].toFixed(1)}, ${p[1].toFixed(1)}`);
    }
    for (const s of around.streets ?? []) {
      if (s.id === r.street) continue;
      const d = distToLine(s.pts, p) - s.half;
      if (d < half + S.clearStreet) add('street', `within ${(d - half).toFixed(2)} of ${s.id}`);
    }
    for (const q of around.pillars ?? []) if (dist(p, q) < half + S.clearPillar) add('pillar', `within ${(dist(p, q) - half).toFixed(2)} of a pillar at ${q[0].toFixed(1)}, ${q[1].toFixed(1)}`);
  }
  return out;
}

/** An interchange: its ramps, where it stands along the ring (its centre), and the clear height under the deck there */
export interface Interchange {
  id: string;
  /** How far round the ring its centre is */
  at: number;
  ramps: Ramp[];
  clearance: number;
}

/** Every breach across a set of interchanges: each ramp's, the clearance under the deck, and the spacing between them
 * round a ring `ringLength` long */
export function checkInterchanges(list: Interchange[], ringLength: number, around: Surroundings = {}): Breach[] {
  const out: Breach[] = [];
  for (const x of list) {
    for (const r of x.ramps) out.push(...checkRamp(r, around));
    if (x.clearance < EXIT_STD.clearance - 1e-6) out.push({ id: x.id, rule: 'clearance', note: `${x.clearance.toFixed(2)} under the deck, ${EXIT_STD.clearance} needed` });
  }
  const sorted = [...list].sort((a, b) => a.at - b.at);
  for (let i = 0; i < sorted.length && sorted.length > 1; i++) {
    const [a, b] = [sorted[i], sorted[(i + 1) % sorted.length]];
    const gap = (((b.at - a.at) % ringLength) + ringLength) % ringLength || ringLength;
    if (gap < EXIT_STD.spacing - 1e-6) out.push({ id: `${a.id}-${b.id}`, rule: 'spacing', note: `${gap.toFixed(0)} apart, ${EXIT_STD.spacing} needed` });
  }
  return out;
}
