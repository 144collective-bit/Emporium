/*
 * Ground below street level for walking (DOM-free; docs/estate-plan.md Phase 2, the kit Lot 9's tunnel was built on
 * made general): passages (straight, along x or z: a ramp down from an end, a floor, roofed stretches where something
 * passes over them) and wells (a round sunken place open to the sky, passages opening into it). What's below ground
 * goes through the same three: `y()` (the ground under you, the floor under a roof only when you're down there),
 * `wall()` (down there only their walls stop you; at street level an open cutting's edge does) and `room()` (the walk
 * camera's room down there); `holesOf()` / `wellHole()` are the ground cut away over the open parts (world.ts).
 */

export type Pt = [number, number];
export type Rect = [number, number, number, number];
/** A solid box: x0, z0, x1, z1, its top */
export type Box = [number, number, number, number, number];

/** The open ground's height (the ground plane, world.ts) */
export const GROUND_Y = 0.035;
/** Under this, a walker is down below ground (walk.ts: only the walls stop him there) */
export const DOWN = -0.5;
/** How far down a step can be before it's a drop (an open cutting's edge, at street level) */
const STEP = 0.35;

/**
 * A straight passage: along `axis` (its ends `a0` < `a1` along it), its centre line at `c` across, its walkable width
 * `half` either side, its walls' thickness, its floor and ceiling (under the ground), the floor's ramps (down from `a0`
 * to `ramp0`, up from `ramp1` to `a1`: an end with no ramp has its ramp at the end, opening flat into a well), the
 * stretches roofed over (`roofs`) and the parapets' height over the ground
 */
export interface Passage {
  id: string;
  axis: 'x' | 'z';
  c: number;
  half: number;
  wall: number;
  floor: number;
  ceil: number;
  a0: number;
  ramp0: number;
  ramp1: number;
  a1: number;
  roofs: [number, number][];
  rail: number;
}
/** A well: round, sunken to `floor`, open to the sky, its retaining wall `wall` thick round it, a railing on its rim */
export interface Well {
  id: string;
  x: number;
  z: number;
  r: number;
  floor: number;
  wall: number;
  rail: number;
}

/** Where x, z is along a passage, and across it from its centre line */
export const alongOf = (p: Passage, x: number, z: number) => (p.axis === 'z' ? z : x);
export const acrossOf = (p: Passage, x: number, z: number) => (p.axis === 'z' ? x : z) - p.c;
/** A point along it (s), across it (u) */
export const pointOf = (p: Passage, s: number, u = 0): Pt => (p.axis === 'z' ? [p.c + u, s] : [s, p.c + u]);

/** The floor along a passage: its ramps, the flat between */
export function floorOf(p: Passage, s: number) {
  if (s <= p.a0 || s >= p.a1) return GROUND_Y;
  if (s < p.ramp0) return GROUND_Y + (p.floor - GROUND_Y) * ((s - p.a0) / (p.ramp0 - p.a0));
  if (s <= p.ramp1) return p.floor;
  return p.floor + (GROUND_Y - p.floor) * ((s - p.ramp1) / (p.a1 - p.ramp1));
}
/** Is x, z on a passage's floor (its walkable width, `m` in from its walls), ramps and all */
export const inPassage = (p: Passage, x: number, z: number, m = 0) => {
  const s = alongOf(p, x, z);
  return Math.abs(acrossOf(p, x, z)) < p.half - m && s > p.a0 && s < p.a1;
};
/** Is `s` along it under a roof */
export const roofedAt = (p: Passage, s: number) => p.roofs.some(([r0, r1]) => s > r0 && s < r1);
/** Is x, z in a well (`m` in from its wall) */
export const inWell = (w: Well, x: number, z: number, m = 0) => Math.hypot(x - w.x, z - w.z) < w.r - m;

/** The box round a passage, its walls and a margin: what walking and the camera ask about it first */
export const passageZone = (p: Passage): Rect => {
  const e = p.half + p.wall + 0.6;
  const [a, b] = [pointOf(p, p.a0 - 0.6, -e), pointOf(p, p.a1 + 0.6, e)];
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
};
export const wellZone = (w: Well): Rect => {
  const e = w.r + w.wall + 0.6;
  return [w.x - e, w.z - e, w.x + e, w.z + e];
};

/** The ground cut away over a passage's open stretches (its walls go down to its floor) */
export function holesOf(p: Passage): Rect[] {
  const cuts = [...p.roofs].sort((a, b) => a[0] - b[0]);
  const open: [number, number][] = [];
  let at = p.a0;
  for (const [r0, r1] of cuts) {
    if (r0 > at) open.push([at, r0]);
    at = Math.max(at, r1);
  }
  if (at < p.a1) open.push([at, p.a1]);
  const e = p.half + p.wall;
  return open.map(([s0, s1]) => {
    const [a, b] = [pointOf(p, s0, -e), pointOf(p, s1, e)];
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
  });
}
/** The ground cut away over a well: the square round it and its wall (what draws round it covers the corners) */
export const wellHole = (w: Well): Rect => {
  const e = w.r + w.wall;
  return [w.x - e, w.z - e, w.x + e, w.z + e];
};

/** What's below ground in one place: its passages and wells together, as walking and the walk camera ask about it */
export function underworld(passages: readonly Passage[], wells: readonly Well[] = []) {
  const zones = [...passages.map(passageZone), ...wells.map(wellZone)];
  const inZone = (x: number, z: number) => zones.some((r) => x > r[0] && x < r[2] && z > r[1] && z < r[3]);
  /** The floor under x, z (null: on none of it) and whether that's under a roof */
  const under = (x: number, z: number): { floor: number; roofed: boolean } | null => {
    let hit: { floor: number; roofed: boolean } | null = null;
    for (const p of passages)
      if (inPassage(p, x, z)) {
        const s = alongOf(p, x, z);
        if (roofedAt(p, s)) return { floor: floorOf(p, s), roofed: true };
        hit ??= { floor: floorOf(p, s), roofed: false };
      }
    if (hit) return hit;
    for (const w of wells) if (inWell(w, x, z)) return { floor: w.floor, roofed: false };
    return null;
  };
  /** Does a walker `r` round, centred at x, z, fit down there (in one piece of it, or each side of him in some piece) */
  const fits = (x: number, z: number, r: number) => {
    for (const p of passages) {
      const s = alongOf(p, x, z);
      if (Math.abs(acrossOf(p, x, z)) <= p.half - r && s >= p.a0 && s <= p.a1) return true;
    }
    for (const w of wells) if (Math.hypot(x - w.x, z - w.z) <= w.r - r) return true;
    const pts: Pt[] = [
      [x - r, z],
      [x + r, z],
      [x, z - r],
      [x, z + r],
    ];
    return pts.every(([px, pz]) => passages.some((p) => inPassage(p, px, pz)) || wells.some((w) => inWell(w, px, pz)));
  };
  /** Is (x, y, z) open air down there, `m` in from its faces */
  const air = (x: number, y: number, z: number, m: number) => {
    if (y > GROUND_Y + 0.05) return true;
    for (const p of passages) {
      const s = alongOf(p, x, z);
      if (Math.abs(acrossOf(p, x, z)) > p.half - m || s < p.a0 || s > p.a1) continue;
      if (y < floorOf(p, s) + m) continue;
      if (!roofedAt(p, s) || y < p.ceil - m) return true;
    }
    for (const w of wells) if (Math.hypot(x - w.x, z - w.z) <= w.r - m && y >= w.floor + m) return true;
    return false;
  };
  return {
    inZone,
    /** Is x, z under a roof down here (a passage's roofed stretch; the wells and the cuttings are open to the sky) */
    roofed: (x: number, z: number) => under(x, z)?.roofed ?? false,
    /** The ground under x, z down here: ramps, open floors wherever; under a roof only when `yNow` is down there (null: not here's) */
    y(x: number, z: number, yNow: number): number | null {
      const u = under(x, z);
      if (!u) return null;
      if (u.roofed) return yNow < DOWN ? u.floor : null;
      return u.floor;
    },
    /**
     * Whether a walker `r` round at x, z (his feet at `y`) is stopped: down there, by the walls (he keeps to the
     * floor); at street level, by an open cutting's or a well's edge where the floor is more than a step under him
     */
    wall(x: number, z: number, y: number, r: number) {
      if (!inZone(x, z)) return false;
      if (y < DOWN) return !fits(x, z, r);
      for (const [px, pz] of [
        [x, z],
        [x - r, z],
        [x + r, z],
        [x, z - r],
        [x, z + r],
      ]) {
        const u = under(px, pz);
        if (u && !u.roofed && u.floor < y - STEP) return true;
      }
      return false;
    },
    /** How far the walk camera can go from (ox, oy, oz) along (dx, dy, dz), at most `t`, before it leaves the air down there */
    room(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, t: number) {
      if (oy > GROUND_Y + 0.6 || !inZone(ox, oz)) return t;
      const STEP_T = 0.05;
      for (let s = STEP_T; s <= t; s += STEP_T) if (!air(ox + dx * s, oy + dy * s, oz + dz * s, 0.12)) return Math.max(0, s - STEP_T);
      return t;
    },
  };
}
export type Underworld = ReturnType<typeof underworld>;
