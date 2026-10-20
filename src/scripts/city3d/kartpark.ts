/*
 * The kart park as data: the site outside the Parkway in the north-east, the
 * two courses (the Neon Loop and its reverse), the start grid, the item boxes
 * and boost pads, the hut, the gate and the slip road, and the footprints
 * for walking. Free of the DOM and of scene code (kartpark3d.ts draws it,
 * kart-sim.ts races on it, kart.ts is the view), so the rules can be tested
 * and a server could run them.
 *
 * - The site is a 48 x 46 rectangle of open land north of the Parkway's top,
 *   fenced, with a gate on its south side and a slip road down to the
 *   Parkway. Everything inside is drawn in local numbers: u east from the
 *   site's west edge, v south from its north edge (world x = X0 + u,
 *   z = Z0 + v).
 * - A course is a closed centre line sampled every half tile (`Course`:
 *   x, z, height, tangent and curvature per sample, and the length). The
 *   track is TRACK_HALF either side of it, walled. The Neon Loop is a
 *   figure of eight: the start straight down the west side (the grandstand
 *   beside it), round the bottom of the west lobe, a diagonal across the
 *   middle at ground level, the east lobe with its hairpin, back over the
 *   middle on a flyover (the crossing), and the west lobe's top with a hump
 *   (a jump) back round to the line. The reverse course is the same loop
 *   the other way round, so every turn goes the other way and the flyover
 *   comes before the hairpin.
 * - `frame(course, s)` gives the point on the centre line at a distance s
 *   round the loop; `locate(course, x, z, hint)` finds a kart's s and
 *   sideways offset from a position, keeping to the layer (ground or
 *   flyover) its last s was on.
 */

export type Pt = [number, number];

/** The site, in world units: x0, z0, x1, z1 */
export const KART_PARK = { x0: 92, z0: -94, x1: 140, z1: -48 } as const;
const X0 = KART_PARK.x0 + 2;
const Z0 = KART_PARK.z0 + 2;
/** Local numbers: u east, v south, inside a 2-wide margin */
export const toWorld = ([u, v]: Pt): Pt => [X0 + u, Z0 + v];
/** The local frame's width (the site inside its margins) */
export const SITE_U = 44;

/** The track's half width (the walls stand just outside), and a kart's radius for the walls */
export const TRACK_HALF = 2.6;
export const KART_R = 0.5;
/** The flyover's height at the crossing and the half length of its ramps; the hump's height, its steep side and its long side */
export const FLYOVER_H = 2.4;
export const FLYOVER_W = 14;
export const HUMP_H = 0.9;
export const HUMP_UP = 2.5;
export const HUMP_DOWN = 4;
/** Samples every half tile along the centre line */
const STEP = 0.5;

/** The Neon Loop's control points (local u, v), from the west straight heading south */
const LOOP: Pt[] = [
  [5.8, 16],
  [6.3, 21],
  [8, 25.5],
  [11, 28],
  [14.5, 27.5],
  [18, 23.5],
  [23.5, 18], // the crossing, at ground
  [29, 12.5],
  [32.5, 9],
  [36, 7],
  [39.5, 8],
  [41.5, 12.5],
  [41.5, 19.5], // the hairpin
  [40.8, 24.5],
  [38.5, 28.3],
  [34.8, 29.6],
  [31.5, 27.8],
  [29.3, 24.3],
  [23.5, 18], // the crossing, on the flyover
  [18, 12.5],
  [14.5, 9], // the hump is on the straight after this
  [11, 6.3],
  [7.4, 6.6],
  [5, 9.6],
  [5.5, 13.2],
];
/** The crossing's second pass (the flyover) and the hump's straight, as control point indices (forward) */
const CROSSING_AT = 18;
const HUMP_AT = 20;
/** The start line: on the west straight, at this v (the same line both ways round) */
const START_V = 19;

export type CourseId = 'neon-loop' | 'neon-reverse';
export const COURSE_IDS: CourseId[] = ['neon-loop', 'neon-reverse'];
export interface Course {
  id: CourseId;
  name: string;
  blurb: string;
  reverse: boolean;
  /** Samples round the loop (world x, z), their heights, tangents (unit, world) and curvatures (1/tiles, left positive) */
  x: Float64Array;
  z: Float64Array;
  y: Float64Array;
  tx: Float64Array;
  tz: Float64Array;
  k: Float64Array;
  /** How long the loop is (tiles), and the samples' spacing */
  L: number;
  step: number;
  /** Where the start line crosses it (s), the flyover's crossing and the hump's top */
  start: number;
  crossing: number;
  hump: number;
  /** Where the items and the boost pads are (s), and the pads' lengths */
  boxes: number[];
  pads: { s: number; len: number }[];
}

/** Centripetal Catmull-Rom through closed control points (no overshoot at uneven spacing), sampled every `step` tiles */
function sampleLoop(pts: Pt[], step: number) {
  const n = pts.length;
  const P = (i: number) => pts[((i % n) + n) % n];
  const dense: Pt[] = [];
  const per = 24;
  const knot = (a: Pt, b: Pt) => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])) || 1e-3;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    const t0 = 0;
    const t1 = t0 + knot(p0, p1);
    const t2 = t1 + knot(p1, p2);
    const t3 = t2 + knot(p2, p3);
    for (let j = 0; j < per; j++) {
      const t = t1 + ((t2 - t1) * j) / per;
      const mix = (a: Pt, b: Pt, ta: number, tb: number): Pt => {
        const f = (t - ta) / (tb - ta);
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      };
      const a1 = mix(p0, p1, t0, t1);
      const a2 = mix(p1, p2, t1, t2);
      const a3 = mix(p2, p3, t2, t3);
      const b1 = mix(a1, a2, t0, t2);
      const b2 = mix(a2, a3, t1, t3);
      dense.push(mix(b1, b2, t1, t2));
    }
  }
  // Resample by arc length
  const cum = [0];
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1];
    const b = dense[i % dense.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const L = cum[dense.length];
  const count = Math.round(L / step);
  const out: Pt[] = [];
  let j = 0;
  for (let i = 0; i < count; i++) {
    const s = (i * L) / count;
    while (j < dense.length - 1 && cum[j + 1] < s) j++;
    const a = dense[j];
    const b = dense[(j + 1) % dense.length];
    const f = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  /** The distance along the loop of each control point */
  const at = pts.map((_, i) => cum[i * per]);
  return { pts: out, L, at, step: L / count };
}

function makeCourse(id: CourseId, name: string, blurb: string, reverse: boolean): Course {
  const ctrl = reverse ? [LOOP[0], ...LOOP.slice(1).reverse()] : LOOP;
  const { pts, L, at, step } = sampleLoop(ctrl, STEP);
  const n = pts.length;
  const x = new Float64Array(n);
  const z = new Float64Array(n);
  const y = new Float64Array(n);
  const tx = new Float64Array(n);
  const tz = new Float64Array(n);
  const k = new Float64Array(n);
  /** The distance along of a forward control point (the reversed loop's run the other way from the same first point) */
  const atF = (i: number) => (reverse ? (i === 0 ? 0 : at[LOOP.length - i]) : at[i]);
  const crossing = atF(CROSSING_AT);
  // The hump's top: halfway along the straight after the forward loop's HUMP_AT
  const hump = (atF(HUMP_AT) + atF(HUMP_AT + 1)) / 2;
  const dist = (s: number, c: number) => {
    let d = s - c;
    if (d > L / 2) d -= L;
    if (d < -L / 2) d += L;
    return d;
  };
  for (let i = 0; i < n; i++) {
    const [u, v] = pts[i];
    [x[i], z[i]] = toWorld([u, v]);
    const s = i * step;
    const dc = dist(s, crossing);
    let h = Math.abs(dc) < FLYOVER_W ? FLYOVER_H * 0.5 * (1 + Math.cos((Math.PI * dc) / FLYOVER_W)) : 0;
    // The hump: steep up, long down (the other way round when reversed)
    const dh = dist(s, hump);
    const up = reverse ? HUMP_DOWN : HUMP_UP;
    const down = reverse ? HUMP_UP : HUMP_DOWN;
    if (dh > -up && dh < 0) h = Math.max(h, HUMP_H * 0.5 * (1 + Math.cos((Math.PI * dh) / up)));
    else if (dh >= 0 && dh < down) h = Math.max(h, HUMP_H * 0.5 * (1 + Math.cos((Math.PI * dh) / down)));
    y[i] = h;
  }
  for (let i = 0; i < n; i++) {
    const a = (i - 1 + n) % n;
    const b = (i + 1) % n;
    const dx = x[b] - x[a];
    const dz = z[b] - z[a];
    const d = Math.hypot(dx, dz) || 1;
    tx[i] = dx / d;
    tz[i] = dz / d;
  }
  for (let i = 0; i < n; i++) {
    const a = (i - 1 + n) % n;
    const b = (i + 1) % n;
    // Turning left (yaw up) is a positive cross of the tangents in this frame (x east, z south)
    const cross = tx[a] * tz[b] - tz[a] * tx[b];
    k[i] = -cross / (2 * step);
  }
  // The start line: where the west straight passes START_V
  let start = 0;
  for (let i = 0; i < n; i++) {
    const [u0, v0] = pts[i];
    const v1 = pts[(i + 1) % n][1];
    if (u0 < 8 && ((v0 <= START_V && v1 > START_V) || (v0 >= START_V && v1 < START_V))) {
      start = (i + (START_V - v0) / (v1 - v0)) * step;
      break;
    }
  }
  const w = (v: number) => ((v % L) + L) % L;
  // Item boxes: on the west lobe's bottom, the east lobe's top, before the flyover's ramp and the west lobe's top
  const boxes = (reverse ? [atF(22) + 1, atF(13) + 1, atF(10) + 1, atF(4) + 1] : [atF(3) + 1, atF(9) + 1, atF(14) + 1, atF(21) + 1]).map(w);
  // Boost pads: out of the hairpin, down the flyover, and after the line
  const pads = [reverse ? atF(11) + 1 : atF(13) + 1, crossing + 7, start + 4].map((s) => ({ s: w(s), len: 3 }));
  return { id, name, blurb, reverse, x, z, y, tx, tz, k, L, step, start, crossing, hump, boxes, pads };
}

export const COURSES: Record<CourseId, Course> = {
  'neon-loop': makeCourse('neon-loop', 'Neon Loop', 'A figure of eight: the hairpin, the flyover, the jump. Learn it by heart.', false),
  'neon-reverse': makeCourse('neon-reverse', 'Neon Loop · reverse', 'The loop the other way round: every turn flipped, the flyover before the hairpin.', true),
};
export const course = (id: string) => COURSES[id as CourseId] ?? null;

/** A kart's length and width (the models in karts.ts keep to these) */
export const KART_L = 1.25;
export const KART_W = 0.95;
/** How many race in a grid */
export const GRID = 8;
/** The grid: slots behind the line, two abreast and staggered; slot 0 is pole, on the inside */
export function gridSlots(c: Course): { s: number; lateral: number }[] {
  const out: { s: number; lateral: number }[] = [];
  for (let i = 0; i < GRID; i++) {
    const row = Math.floor(i / 2);
    const side = i % 2 ? -1 : 1;
    out.push({ s: c.start - 2.2 - row * 2.6 - (i % 2) * 1.1, lateral: side * 1.2 });
  }
  return out;
}

/** s wrapped round the loop */
export const wrapS = (c: Course, s: number) => ((s % c.L) + c.L) % c.L;
/** The signed distance along the loop from a to b (the short way) */
export function along(c: Course, a: number, b: number) {
  let d = wrapS(c, b) - wrapS(c, a);
  if (d > c.L / 2) d -= c.L;
  if (d < -c.L / 2) d += c.L;
  return d;
}

export interface Frame {
  x: number;
  z: number;
  y: number;
  /** The tangent (unit) and the left normal (unit, in the x / z plane) */
  tx: number;
  tz: number;
  nx: number;
  nz: number;
  /** Curvature (1/tiles, left positive) and the slope (height per tile along) */
  k: number;
  slope: number;
}
/** The centre line at a distance s round the loop (interpolated), with the left normal */
export function frame(c: Course, s: number): Frame {
  const n = c.x.length;
  const f = wrapS(c, s) / c.step;
  const i = Math.floor(f) % n;
  const j = (i + 1) % n;
  const t = f - Math.floor(f);
  const lerp = (a: Float64Array) => a[i] + (a[j] - a[i]) * t;
  const tx = lerp(c.tx);
  const tz = lerp(c.tz);
  const d = Math.hypot(tx, tz) || 1;
  // Left of the tangent (yaw up): in this frame left is (tz, -tx)
  return { x: lerp(c.x), z: lerp(c.z), y: lerp(c.y), tx: tx / d, tz: tz / d, nx: tz / d, nz: -tx / d, k: lerp(c.k), slope: (c.y[j] - c.y[i]) / c.step };
}
/** The way a kart faces when it sits on the line at s (yaw: 0 faces +x, left raises it) */
export const yawAt = (c: Course, s: number) => {
  const f = frame(c, s);
  return Math.atan2(-f.tz, f.tx);
};
/** A point on the track: s along, lateral across (left positive) */
export function at(c: Course, s: number, lateral = 0) {
  const f = frame(c, s);
  return { x: f.x + f.nx * lateral, z: f.z + f.nz * lateral, y: f.y, yaw: Math.atan2(-f.tz, f.tx) };
}

/**
 * Where a position is on the track: the nearest point of the centre line
 * (searching near `hint`, so the flyover and the ground under it stay
 * apart), its s, the sideways offset (left positive) and the height there.
 */
export function locate(c: Course, x: number, z: number, hint: number | null = null, reach = 12) {
  const n = c.x.length;
  let best = -1;
  let bestD = Infinity;
  const test = (i: number) => {
    const ii = ((i % n) + n) % n;
    const d = (c.x[ii] - x) ** 2 + (c.z[ii] - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = ii;
    }
  };
  if (hint === null) for (let i = 0; i < n; i++) test(i);
  else {
    const h = Math.round(wrapS(c, hint) / c.step);
    const r = Math.ceil(reach / c.step);
    for (let i = h - r; i <= h + r; i++) test(i);
  }
  // Refine between the nearest sample and its neighbours
  const i = best;
  const refine = (a: number, b: number) => {
    const ax = c.x[a];
    const az = c.z[a];
    const bx = c.x[b];
    const bz = c.z[b];
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
    const px = ax + dx * t;
    const pz = az + dz * t;
    return { t, d: Math.hypot(px - x, pz - z) };
  };
  const prev = (i - 1 + n) % n;
  const next = (i + 1) % n;
  const f = refine(i, next);
  const g = refine(prev, i);
  const s = f.d <= g.d ? (i + f.t) * c.step : (prev + g.t) * c.step;
  const fr = frame(c, s);
  const lateral = (x - fr.x) * fr.nx + (z - fr.z) * fr.nz;
  return { s: wrapS(c, s), lateral, y: fr.y, frame: fr };
}

/* ---------- The site: the hut, the gate, the slip road, the stands ---------- */

/** Where things stand on the site (local u, v); `yaw` is which way a door faces (0: +x, left raises it) */
export const SITE = {
  /** The kart hut: its box, its door (where you stand for the menu) and its neon sign */
  hut: { u0: 24, v0: 34.5, u1: 32, v1: 39.5, door: [28, 40.1] as Pt },
  /** The gate in the south fence, and the slip road down to the Parkway */
  gate: { u: 6, w: 4 },
  /** The grandstand along the west straight, facing east over the track */
  stand: { u0: 0.3, v0: 12.5, u1: 2.6, v1: 25 },
  /** The big screen, facing north over the east lobe's bottom bend */
  screen: { u: 36, v: 34, w: 6 },
  /** The pit lane: where the karts wait between races (parked, behind the west lobe's bottom) */
  pits: { u0: 10, v0: 33.5, u1: 20, v1: 36.5 },
} as const;
/** The site's edges in world numbers */
export const SITE_WORLD = { x0: KART_PARK.x0, z0: KART_PARK.z0, x1: KART_PARK.x1, z1: KART_PARK.z1 };
/** The gate in the south fence (world x range), and where Degen stands inside it */
export const GATE = (() => {
  const [gx] = toWorld([SITE.gate.u, 0]);
  return { x0: gx - SITE.gate.w / 2, x1: gx + SITE.gate.w / 2, z: KART_PARK.z1, inside: [gx, KART_PARK.z1 - 2] as Pt };
})();
/** The slip road: from the gate straight south to the Parkway (its end is on the Parkway's asphalt) */
export const SLIP_ROAD = { x: (GATE.x0 + GATE.x1) / 2, z0: KART_PARK.z1, z1: -32.5, half: 1.7 } as const;
/** The hut's door, in world numbers, and which way it faces (south, towards the gate path) */
export const HUT_DOOR = (() => {
  const [x, z] = toWorld(SITE.hut.door);
  return { x, z, yaw: -Math.PI / 2 };
})();
/** Where you spawn when you walk in from the city panel: inside the gate, facing the track */
export const KART_SPAWN = { x: GATE.inside[0], z: GATE.inside[1], yaw: Math.PI / 2 };

/** x0, z0, x1, z1, height (solids.ts Box) */
type Box = [number, number, number, number, number];
const box = (u0: number, v0: number, u1: number, v1: number, h: number): Box => {
  const [x0, z0] = toWorld([u0, v0]);
  const [x1, z1] = toWorld([u1, v1]);
  return [x0, z0, x1, z1, h];
};
/** The gantry's posts, either side of the start line, and the flyover's pillars (world) */
export const GANTRY = (() => {
  const c = COURSES['neon-loop'];
  const f = frame(c, c.start);
  const reach = TRACK_HALF + 0.7;
  return { x: f.x, z: f.z, tx: f.tx, tz: f.tz, posts: [1, -1].map((side) => ({ x: f.x + f.nx * reach * side, z: f.z + f.nz * reach * side })), h: 4.2, half: reach };
})();
export const PILLARS: Pt[] = (() => {
  const c = COURSES['neon-loop'];
  const out: Pt[] = [];
  for (const ds of [-7, -3.5, 3.5, 7]) {
    const f = frame(c, c.crossing + ds);
    for (const side of [1, -1]) out.push([f.x + f.nx * (TRACK_HALF + 0.2) * side, f.z + f.nz * (TRACK_HALF + 0.2) * side]);
  }
  return out;
})();

/**
 * Footprints for walking round the park (solids.ts adds them to SOLIDS): the fence (with the gate's gap),
 * the hut, the stand, the screen, the gantry's posts and the flyover's pillars. The track itself is open:
 * Degen can walk across it, between the walls' gaps... except that the walls are solid too, every two
 * tiles along both edges of the loop (the ground layer only: under the flyover there's room to walk).
 */
export const KART_SOLIDS: Box[] = (() => {
  const P = KART_PARK;
  const F = 0.25;
  const out: Box[] = [
    // The fence, 1.2 high, the gate left open
    [P.x0 - F, P.z0 - F, P.x1 + F, P.z0 + F, 1.2],
    [P.x0 - F, P.z0 - F, P.x0 + F, P.z1 + F, 1.2],
    [P.x1 - F, P.z0 - F, P.x1 + F, P.z1 + F, 1.2],
    [P.x0 - F, P.z1 - F, GATE.x0, P.z1 + F, 1.2],
    [GATE.x1, P.z1 - F, P.x1 + F, P.z1 + F, 1.2],
    box(SITE.hut.u0, SITE.hut.v0, SITE.hut.u1, SITE.hut.v1, 3.2),
    box(SITE.stand.u0, SITE.stand.v0, SITE.stand.u1, SITE.stand.v1, 3.6),
    box(SITE.screen.u - SITE.screen.w / 2, SITE.screen.v - 0.3, SITE.screen.u + SITE.screen.w / 2, SITE.screen.v + 0.3, 5),
  ];
  for (const p of GANTRY.posts) out.push([p.x - 0.22, p.z - 0.22, p.x + 0.22, p.z + 0.22, GANTRY.h]);
  for (const [x, z] of PILLARS) out.push([x - 0.2, z - 0.2, x + 0.2, z + 0.2, FLYOVER_H]);
  // The walls along the loop, at ground level (the flyover's own walls are above head height)
  const c = COURSES['neon-loop'];
  for (let s = 0; s < c.L; s += 2) {
    const f = frame(c, s);
    if (f.y > 1.0) continue;
    for (const side of [1, -1]) {
      const x = f.x + f.nx * (TRACK_HALF + 0.3) * side;
      const z = f.z + f.nz * (TRACK_HALF + 0.3) * side;
      out.push([x - 0.5, z - 0.5, x + 0.5, z + 0.5, 0.55]);
    }
  }
  return out;
})();
