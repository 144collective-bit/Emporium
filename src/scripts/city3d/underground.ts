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
 * A straight passage: along `axis` (x, z, or any way: an angle, from +x towards +z, as the Circus's subways run out
 * from its well; its ends `a0` < `a1` along it), its centre line at `c` across, its walkable width
 * `half` either side, its walls' thickness, its floor and ceiling (under the ground), the floor's ramps (down from `a0`
 * to `ramp0`, up from `ramp1` to `a1`: an end with no ramp has its ramp at the end, opening flat into a well), the
 * stretches roofed over (`roofs`) and the parapets' height over the ground
 */
export interface Passage {
  id: string;
  axis: 'x' | 'z' | number;
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
/**
 * A well: round, sunken to `floor`, open to the sky, its retaining wall `wall` thick round it, a railing on its rim;
 * `tiers` steps round its edge (seats you can walk up: from `r0` out to its wall, `n` of them, each `rise` higher)
 */
export interface Well {
  id: string;
  x: number;
  z: number;
  r: number;
  floor: number;
  wall: number;
  rail: number;
  tiers?: { r0: number; n: number; rise: number };
}

/** A passage's way along and its way across (x and z keep their old sides: across a z passage is +x, an x one's +z) */
const along = (p: Passage): Pt => (p.axis === 'z' ? [0, 1] : p.axis === 'x' ? [1, 0] : [Math.cos(p.axis), Math.sin(p.axis)]);
const across = (p: Passage): Pt => (p.axis === 'z' ? [1, 0] : p.axis === 'x' ? [0, 1] : [-Math.sin(p.axis), Math.cos(p.axis)]);

/** Where x, z is along a passage, and across it from its centre line */
export const alongOf = (p: Passage, x: number, z: number) => {
  const [dx, dz] = along(p);
  return x * dx + z * dz;
};
export const acrossOf = (p: Passage, x: number, z: number) => {
  const [nx, nz] = across(p);
  return x * nx + z * nz - p.c;
};
/** A point along it (s), across it (u) */
export const pointOf = (p: Passage, s: number, u = 0): Pt => {
  const [[dx, dz], [nx, nz]] = [along(p), across(p)];
  return [s * dx + (p.c + u) * nx, s * dz + (p.c + u) * nz];
};
/**
 * A passage running out from (x, z) at `deg` (from +x towards +z), its ends `from` and `to` out from there, its ramp
 * up from `rampAt` out, roofed from `roof0` to `roof1` out (opening flat at `from`, into a well)
 */
export function radial(id: string, x: number, z: number, deg: number, o: { from: number; roof0: number; roof1: number; rampAt: number; to: number; half: number; wall: number; floor: number; ceil: number; rail: number }): Passage {
  const a = (deg * Math.PI) / 180;
  const s0 = x * Math.cos(a) + z * Math.sin(a);
  return {
    id,
    axis: a,
    c: -x * Math.sin(a) + z * Math.cos(a),
    half: o.half,
    wall: o.wall,
    floor: o.floor,
    ceil: o.ceil,
    a0: s0 + o.from,
    ramp0: s0 + o.from,
    ramp1: s0 + o.rampAt,
    a1: s0 + o.to,
    roofs: [[s0 + o.roof0, s0 + o.roof1]],
    rail: o.rail,
  };
}

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
/** A well's floor `d` out from its middle: its tiers' steps up round its edge */
export function wellFloor(w: Well, d: number) {
  const t = w.tiers;
  if (!t || d <= t.r0) return w.floor;
  return w.floor + t.rise * Math.min(t.n, Math.ceil(((d - t.r0) / (w.r - t.r0)) * t.n));
}

/** The box round a passage, its walls and a margin: what walking and the camera ask about it first */
export const passageZone = (p: Passage): Rect => {
  const e = p.half + p.wall + 0.6;
  return boundsOf([pointOf(p, p.a0 - 0.6, -e), pointOf(p, p.a1 + 0.6, e), pointOf(p, p.a0 - 0.6, e), pointOf(p, p.a1 + 0.6, -e)]);
};
const boundsOf = (pts: Pt[]): Rect => [Math.min(...pts.map((q) => q[0])), Math.min(...pts.map((q) => q[1])), Math.max(...pts.map((q) => q[0])), Math.max(...pts.map((q) => q[1]))];
/** A passage's open stretch from `s0` to `s1` along it, walls and all, as its four corners */
export const cutOf = (p: Passage, s0: number, s1: number): Pt[] => {
  const e = p.half + p.wall;
  return [pointOf(p, s0, -e), pointOf(p, s1, -e), pointOf(p, s1, e), pointOf(p, s0, e)];
};
/** Its open stretches along it (out of its roofs) */
export function openOf(p: Passage): [number, number][] {
  const cuts = [...p.roofs].sort((a, b) => a[0] - b[0]);
  const open: [number, number][] = [];
  let at = p.a0;
  for (const [r0, r1] of cuts) {
    if (r0 > at) open.push([at, r0]);
    at = Math.max(at, r1);
  }
  if (at < p.a1) open.push([at, p.a1]);
  return open;
}
export const wellZone = (w: Well): Rect => {
  const e = w.r + w.wall + 0.6;
  return [w.x - e, w.z - e, w.x + e, w.z + e];
};

/** The ground cut away over a passage's open stretches (its walls go down to its floor; one at an angle: the box round
 * each, what draws round it covering the rest) */
export function holesOf(p: Passage): Rect[] {
  return openOf(p).map(([s0, s1]) => boundsOf(cutOf(p, s0, s1)));
}
/** The ground cut away over a well: the square round it and its wall (what draws round it covers the corners) */
export const wellHole = (w: Well): Rect => {
  const e = w.r + w.wall;
  return [w.x - e, w.z - e, w.x + e, w.z + e];
};

/** What's below ground in one place: its passages and wells together, as walking and the walk camera ask about it;
 * `boxes` what stands down there (a plaza's planters and lamps: solid to a walker down there, their tops absolute) */
export function underworld(passages: readonly Passage[], wells: readonly Well[] = [], boxes: readonly Box[] = []) {
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
    for (const w of wells) if (inWell(w, x, z)) return { floor: wellFloor(w, Math.hypot(x - w.x, z - w.z)), roofed: false };
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
    for (const w of wells) {
      const d = Math.hypot(x - w.x, z - w.z);
      if (d <= w.r - m && y >= wellFloor(w, d) + m) return true;
    }
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
     * floor) and what stands there; at street level, by an open cutting's or a well's edge where the floor is more than a step under him
     */
    wall(x: number, z: number, y: number, r: number) {
      if (!inZone(x, z)) return false;
      if (y < DOWN) return !fits(x, z, r) || boxes.some((b) => y < b[4] && x > b[0] - r && x < b[2] + r && z > b[1] - r && z < b[3] + r);
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
