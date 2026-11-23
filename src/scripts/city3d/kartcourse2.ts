/*
 * Riverside Raceway raced (docs/kart-harbour-plan.md, Phase 3): the new circuit's two courses (kartcircuit2.ts) in the
 * shape kart-sim.ts races (`Course`, kartcircuit.ts's), and the track's own numbers the sim reads (`Track`, kart-track.ts):
 * its width and kerbs, where a kart's put back, the grid, the ground across it (kartpark2.ts's hill and cuttings), the
 * tunnel's walls, the item boxes; and the race camera's room in the tunnel and over the hill. DOM-free, tested in
 * tests/kartcourse2.test.ts. Raced behind `?karts=new` until the switch (Phase 8).
 */
import type { Course } from './kartcircuit';
import { COURSES2, CIRCUIT2, CLEAR2, GRID2, GRID2_LATERAL, KERB2, SITE2, TRACK2_HALF, TUNNEL_CLEAR, type Course2Id } from './kartcircuit2';
import { TUNNEL2, hillAt, kart2GroundAt } from './kartpark2';
import { F, KART_W, at, frame, type Frame, type Line } from './kartpark';

/** A flag of the cuttings either side of the tunnel's mouths (walled like the tunnel, open to the sky) */
export const F_CUT = 32;
/** How much higher than the road the hill beside it has to stand for that stretch to be a cutting, walled */
const CUT_RISE = 0.5;
/** Where a kart's put back: its side short of the run-off's edge (as today's RESET_AT is) */
export const RESET2_AT = CLEAR2 - KART_W / 2 - 0.15;
/** The item boxes' rows: shares of the lap past the line, each moved on to the first place clear of the tunnel and the tight bends */
export const BOX2_ROWS = [0.05, 0.38, 0.7];
export const ROW2_LATERALS = [-1.8, -0.6, 0.6, 1.8];

/** The forward circuit's flags at each of its samples: the tunnel, and the cuttings to its mouths */
const FLAGS2: number[] = (() => {
  const n = CIRCUIT2.u.length;
  const flags = new Array<number>(n).fill(0);
  for (const i of TUNNEL2.samples) flags[i] = F.tunnel;
  const edge = TRACK2_HALF + KERB2 + 0.6;
  for (let i = 0; i < n; i++) {
    if (flags[i]) continue;
    const [a, b] = [(i - 1 + n) % n, (i + 1) % n];
    const [tu, tv] = [CIRCUIT2.u[b] - CIRCUIT2.u[a], CIRCUIT2.v[b] - CIRCUIT2.v[a]];
    const l = Math.hypot(tu, tv) || 1;
    const [nu, nv] = [tv / l, -tu / l];
    const rise = Math.max(hillAt(CIRCUIT2.u[i] + nu * edge, CIRCUIT2.v[i] + nv * edge), hillAt(CIRCUIT2.u[i] - nu * edge, CIRCUIT2.v[i] - nv * edge)) - CIRCUIT2.y[i];
    if (rise > CUT_RISE) flags[i] = F.tunnel | F_CUT;
  }
  return flags;
})();

function toCourse(id: Course2Id): Course {
  const c = COURSES2[id];
  const n = c.x.length;
  // (the reverse runs the forward circuit's samples in the order kartcircuit2.ts's makeCourse2() picks them)
  const order = c.reverse ? [0, ...Array.from({ length: n - 1 }, (_, i) => n - 1 - i)] : Array.from({ length: n }, (_, i) => i);
  const x = Float64Array.from(c.x);
  const z = Float64Array.from(c.z);
  const tx = new Float64Array(n);
  const tz = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const [a, b] = [(i - 1 + n) % n, (i + 1) % n];
    const d = Math.hypot(x[b] - x[a], z[b] - z[a]) || 1;
    tx[i] = (x[b] - x[a]) / d;
    tz[i] = (z[b] - z[a]) / d;
  }
  const line: Line = {
    x,
    z,
    y: Float64Array.from(c.y),
    tx,
    tz,
    k: Float64Array.from(c.k),
    roll: new Float64Array(n),
    grip: new Float64Array(n).fill(1),
    flags: Uint8Array.from(order.map((i) => FLAGS2[i])),
    L: c.L,
    step: c.step,
    at: [],
    closed: true,
  };
  return { ...line, id, name: c.name, blurb: c.blurb, reverse: c.reverse, laps: c.laps, start: c.start, jump: -1, pads: [], turns: c.turns.map(({ n, s }) => ({ n, s })) };
}
/** The two courses, in the sim's shape */
export const RIVER_COURSES: Record<Course2Id, Course> = { riverside: toCourse('riverside'), 'riverside-reverse': toCourse('riverside-reverse') };

/** The grid on the pit straight behind the line (kartcircuit2.ts's gridSlots2(), on a raced course) */
export function gridSlots2Of(c: Course): { s: number; lateral: number }[] {
  return Array.from({ length: GRID2 }, (_, i) => ({ s: (c.start - 2 - Math.floor(i / 2) * 2.8 - (i % 2) * 1.3 + c.L) % c.L, lateral: (i % 2 ? -1 : 1) * GRID2_LATERAL }));
}
/** The tunnel and the cuttings: walled, no run-off (off their kerbs a kart scrapes the wall, and is put back past it) */
export const enclosed2 = (f: Frame) => !!(f.flags & F.tunnel);
/** The ground across the track: the asphalt and kerbs at the road's height, the run-off on the park's ground (the hill's sides, the level) */
export function groundAt2(f: Frame, lateral: number) {
  if (Math.abs(lateral) <= TRACK2_HALF + KERB2 || enclosed2(f)) return f.y;
  return kart2GroundAt(f.x + f.nx * lateral, f.z + f.nz * lateral);
}

/** The item boxes (world), each row laid across the forward course where it's clear */
export const BOXES2: { x: number; z: number; y: number; row: number }[] = BOX2_ROWS.flatMap((share, row) => {
  const c = RIVER_COURSES.riverside;
  let s = (c.start + c.L * share) % c.L;
  const clear = (s0: number) => {
    for (let d = -6; d <= 12; d += 1) {
      const f = frame(c, s0 + d);
      if (Math.abs(f.k) > 0.05 || f.flags & F.tunnel || Math.abs(f.slope) > 0.02) return false;
    }
    return true;
  };
  for (let k = 0; k < 200 && !clear(s); k++) s = (s + 1) % c.L;
  return ROW2_LATERALS.map((lat) => {
    const q = at(c, s, lat);
    return { x: q.x, z: q.z, y: q.y, row };
  });
});

/** How far the race camera keeps from the tunnel's walls and roof, and the ground */
export const CAM2_GAP = 0.3;
/** The tunnel's samples on the forward course (where its roof is) */
const ROOFED = TUNNEL2.samples;
/**
 * The race camera's room: with the kart in the tunnel, kept inside it (under its roof, inside its walls); everywhere
 * over the park's ground (the hill, the level), and over the road under it.
 */
export function camRoom2(x: number, y: number, z: number, kx: number, ky: number, kz: number): [number, number, number] {
  const c = RIVER_COURSES.riverside;
  let [cx, cy, cz] = [x, y, z];
  const inside = TRACK2_HALF + KERB2;
  /** The tunnel's stretch a point is in (its frame and the point's place across and along), or null */
  const inTunnel = (px: number, pz: number, py: number) => {
    if (py > TUNNEL_CLEAR + 0.5) return null;
    for (const i of ROOFED) {
      if ((c.x[i] - px) ** 2 + (c.z[i] - pz) ** 2 > (inside + 1.5) ** 2) continue;
      const f = frame(c, i * c.step);
      const lat = (px - f.x) * f.nx + (pz - f.z) * f.nz;
      const ahead = (px - f.x) * f.tx + (pz - f.z) * f.tz;
      if (Math.abs(ahead) <= c.step * 0.6 && Math.abs(lat) <= inside + 1.5) return { f, lat, ahead };
    }
    return null;
  };
  const kartIn = inTunnel(kx, kz, ky);
  if (kartIn) {
    // (the camera's pulled in along the line from the kart, to inside the walls and under the roof)
    const room = inTunnel(cx, cz, Math.min(cy, TUNNEL_CLEAR));
    const f = (room ?? kartIn).f;
    const lat = (cx - f.x) * f.nx + (cz - f.z) * f.nz;
    const most = inside - CAM2_GAP;
    if (Math.abs(lat) > most) {
      const pull = Math.sign(lat) * most - lat;
      cx += f.nx * pull;
      cz += f.nz * pull;
    }
    cy = Math.min(cy, f.y + TUNNEL_CLEAR - CAM2_GAP);
    return [cx, Math.max(cy, f.y + CAM2_GAP), cz];
  }
  return [cx, Math.max(cy, kart2GroundAt(cx, cz) + CAM2_GAP), cz];
}

/**
 * The park's surface under a point off a race (walking, your own kart): the tunnel's floor where it's inside the tunnel
 * and below its roof, else the park's ground (the hill, the road over it, the cuttings). Null off the site.
 */
export function riversideSurfaceAt(x: number, z: number, yNow: number): number | null {
  if (x < SITE2.x0 || x > SITE2.x1 || z < SITE2.z0 || z > SITE2.z1) return null;
  if (yNow < TUNNEL_CLEAR - 0.4) {
    const c = CIRCUIT2;
    for (const i of TUNNEL2.samples) if (Math.hypot(c.x[i] - x, c.z[i] - z) <= TRACK2_HALF + KERB2) return c.y[i];
  }
  return kart2GroundAt(x, z);
}
