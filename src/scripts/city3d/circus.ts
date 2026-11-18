/*
 * The Circus below ground (docs/south-plan.md Phase 4, step 4a; the owner's calls, 2026-11-18): its sunken plaza in
 * the middle of the roundabout (a paved floor, stepped seats round it you can walk up, planters with trees, lamps) and
 * four subways out from it under the carriageway, each coming up by a ramp into a corner between its spokes: the
 * north-west (between Underhill Lane and the High Road), the north-east (Underhill Lane and Endswood Road), and two on
 * the wide side between Endswood Road and Southfold Lane: the south-east (towards the blocks) and the south (towards
 * Lot 9). The west and south-west corners are built up to the
 * Circus's sidewalk (the parade's back, Church Road's end house) and keep their zebra crossings (the owner's call).
 * Murals and strip lights inside (the drawing's, Phase 4b). All of it in the underground kit (underground.ts): what
 * walking, the walk camera and the ground's holes ask about it. DOM-free, tested in tests/circus.test.ts.
 */
import { CIRCUS, SOUTH_STREETS, type Pt } from './south';
import { BLOCKS, CORES } from './southblocks';
import { distTo, inside } from './streetfaces';
import { cutOf, openOf, pointOf, radial, wellHole, type Box, type Passage, type Rect, type Well } from './underground';

/** The floor down there, the subways' ceiling (a tunnel's headroom, as Lot 9's), the walls' thickness */
export const FLOOR = -1.9;
export const CEIL = -0.25;
const WALL = 0.25;
/** The island's edge (inside the carriageway) and the sidewalk's outer edge round the Circus */
export const ISLAND_R = CIRCUS.r - CIRCUS.half;
export const OUTER_R = CIRCUS.r + CIRCUS.half + 0.8;

/** The sunken plaza: its floor's radius, its seats (three steps up round its edge, from `r0` out), its wall, its rail */
export const PLAZA: Well = { id: 'circus-plaza', x: CIRCUS.x, z: CIRCUS.z, r: 7.2, floor: FLOOR, wall: 0.3, rail: 0.9, tiers: { r0: 5, n: 3, rise: 0.22 } };

/** The subways: which way each runs out from the plaza (degrees from +x towards +z, as the Circus's spokes are laid) */
export const SUBWAY_WAYS = { nw: 235, ne: 285, se: 50, s: 78 } as const;
export type SubwayId = keyof typeof SUBWAY_WAYS;
/** Out from the Circus's middle: opening flat into the plaza, roofed under the island's edge, the carriageway and the
 * sidewalk, then a ramp up (about one in four, as Lot 9's) to its mouth */
export const SUBWAY = { from: 4.6, roof0: PLAZA.r + PLAZA.wall, roof1: OUTER_R + 0.6, to: OUTER_R + 0.6 + 7.6, half: 1.3 };
export const SUBWAYS: Passage[] = (Object.keys(SUBWAY_WAYS) as SubwayId[]).map((id) =>
  radial(`circus-${id}`, CIRCUS.x, CIRCUS.z, SUBWAY_WAYS[id], { from: SUBWAY.from, roof0: SUBWAY.roof0, roof1: SUBWAY.roof1, rampAt: SUBWAY.roof1, to: SUBWAY.to, half: SUBWAY.half, wall: WALL, floor: FLOOR, ceil: CEIL, rail: 0.9 }),
);
export const subwayOf = (id: SubwayId) => SUBWAYS.find((p) => p.id === `circus-${id}`)!;

/** Each subway's open cutting (its ramp up, walls and all) as its four corners */
const rampOf = (p: Passage) => openOf(p).at(-1)!;
export const CUTTINGS: Pt[][] = SUBWAYS.map((p) => cutOf(p, ...rampOf(p)));
/** Each subway's mouth: the middle of its ramp's top */
export const MOUTHS: Pt[] = SUBWAYS.map((p) => pointOf(p, p.a1));

/** From each mouth on to the nearest sidewalk (paved; nowhere a dead end on foot): straight out of the mouth a way,
 * then to the sidewalk's outer edge of the nearest street it can reach crossing no block (not the Circus: a subway
 * comes up away from it), or, boxed in by blocks, on to the nearest other mouth's path */
export const PATH_HALF = 0.9;
const OUT = 2.5;
/** How far a path goes to a sidewalk at most */
const REACH = 15;
export const MOUTH_PATHS: Pt[][] = SUBWAYS.map((p) => {
  const [start, out] = [pointOf(p, p.a1 + 0.2), pointOf(p, p.a1 + OUT)];
  // (each street's nearest sidewalk edge to the turn, nearest first: the first the way to which crosses no block nor cutting)
  const ends: { d: number; to: Pt }[] = [];
  for (const s of SOUTH_STREETS) {
    if (s.loop) continue;
    let best: { d: number; to: Pt } = { d: Infinity, to: out };
    for (let i = 0; i + 1 < s.pts.length; i++) {
      const [a, b] = [s.pts[i], s.pts[i + 1]];
      const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
      const l2 = vx * vx + vz * vz || 1;
      const t = Math.max(0, Math.min(1, ((out[0] - a[0]) * vx + (out[1] - a[1]) * vz) / l2));
      const q: Pt = [a[0] + vx * t, a[1] + vz * t];
      const d = Math.hypot(out[0] - q[0], out[1] - q[1]);
      // (to the sidewalk's outer edge, on the line from the street to the turn)
      const k = (s.half + 0.8) / (d || 1);
      if (d < best.d) best = { d, to: [q[0] + (out[0] - q[0]) * k, q[1] + (out[1] - q[1]) * k] };
    }
    ends.push(best);
  }
  const feet = [...BLOCKS.map((b) => b.foot), ...CORES.map((c) => c.foot)];
  const clear = (to: Pt) => {
    for (let t = 0; t <= 1; t += 0.02) {
      const q: Pt = [out[0] + (to[0] - out[0]) * t, out[1] + (to[1] - out[1]) * t];
      if (feet.some((f) => inside(f, q) || distTo(f, q, true) < PATH_HALF + 0.5)) return false;
      // (nor back over another subway's cutting)
      if (CUTTINGS.some((c) => inside(c, q) || distTo(c, q, true) < PATH_HALF)) return false;
    }
    return true;
  };
  const end = ends.sort((a, b) => a.d - b.d).find((e) => e.d < REACH && clear(e.to));
  return end ? [start, out, end.to] : [start, out];
});
// (a mouth boxed in by blocks, no sidewalk near: its path joins the nearest other mouth's path instead)
for (const path of MOUTH_PATHS)
  if (path.length === 2) {
    const out = path[1];
    let best: { d: number; at: Pt } = { d: Infinity, at: out };
    for (const other of MOUTH_PATHS)
      if (other !== path && other.length === 3)
        for (let i = 0; i + 1 < other.length; i++) {
          const [a, b] = [other[i], other[i + 1]];
          const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
          const t = Math.max(0, Math.min(1, ((out[0] - a[0]) * vx + (out[1] - a[1]) * vz) / (vx * vx + vz * vz || 1)));
          const q: Pt = [a[0] + vx * t, a[1] + vz * t];
          const d = Math.hypot(out[0] - q[0], out[1] - q[1]);
          if (d < best.d) best = { d, at: q };
        }
    path.push(best.at);
  }

/* ---------- The plaza's things ---------- */

/** Round planters on its floor, a tree in each: their middles and radii */
export const PLANTERS: { at: Pt; r: number }[] = [100, 205, 335].map((deg) => ({ at: at(deg, 2.7), r: 0.75 }));
export const PLANTER_H = 0.5;
/** Lamps on its floor by the seats, between the subways' mouths */
export const PLAZA_LAMPS: Pt[] = [10, 160, 260].map((deg) => at(deg, 4.4));
function at(deg: number, r: number): Pt {
  const a = (deg * Math.PI) / 180;
  return [CIRCUS.x + r * Math.cos(a), CIRCUS.z + r * Math.sin(a)];
}

/** The planters and lamps as solids (down on the plaza's floor: under street level, absolute heights) */
export const CIRCUS_SOLIDS: Box[] = [
  ...PLANTERS.map(({ at: [x, z], r }): Box => [x - r * 0.85, z - r * 0.85, x + r * 0.85, z + r * 0.85, FLOOR + PLANTER_H]),
  ...PLAZA_LAMPS.map(([x, z]): Box => [x - 0.12, z - 0.12, x + 0.12, z + 0.12, FLOOR + 3]),
];

/* ---------- The ground cut away ---------- */

/** The ground cut away round it all: one square over the plaza and the cuttings (what draws the Circus lays the ground
 * back over the rest of it, round the plaza and the cuttings: Phase 4b) */
export const CIRCUS_HOLE: Rect = (() => {
  const pts = [...CUTTINGS.flat(), ...((): Pt[] => {
    const h = wellHole(PLAZA);
    return [[h[0], h[1]], [h[2], h[3]]];
  })()];
  const e = Math.max(...pts.map(([x, z]) => Math.max(Math.abs(x - CIRCUS.x), Math.abs(z - CIRCUS.z)))) + 0.2;
  return [CIRCUS.x - e, CIRCUS.z - e, CIRCUS.x + e, CIRCUS.z + e];
})();

/** Is x, z in an open cutting or the plaza (`m` out past their walls) */
export function inCircusOpen(x: number, z: number, m = 0) {
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + PLAZA.wall + m) return true;
  return SUBWAYS.some((p) => {
    const [s0, s1] = rampOf(p);
    const [nx, nz] = [Math.cos(p.axis as number), Math.sin(p.axis as number)];
    const s = x * nx + z * nz;
    const u = -x * nz + z * nx - p.c;
    return s > s0 - m && s < s1 + m && Math.abs(u) < p.half + p.wall + m;
  });
}
/** How far x, z is from every street's sidewalk's outer edge (the Circus's own too) */
export const fromSidewalks = (p: Pt) => Math.min(...SOUTH_STREETS.map((s) => distTo(s.pts, p) - s.half - 0.8));
