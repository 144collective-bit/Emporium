/*
 * The kart park as data: the site filling the north-east beyond the Parkway,
 * the track network and the courses assembled from it, the start grid, the
 * item boxes and boost pads, the hut, the gate and the slip road, and the
 * footprints for walking. Free of the DOM and of scene code (kartpark3d.ts
 * draws it, kart-sim.ts races on it, kart.ts is the view), so the rules can
 * be tested and a server could run them.
 *
 * - The site is a 140 x 144 rectangle of open land north of the Parkway's
 *   top, out to the world's edge, fenced, with a gate on its south side and
 *   a slip road down to the Parkway. Everything inside is drawn in local
 *   numbers: u east from the site's west edge, v south from its north edge
 *   (world x = X0 + u, z = Z0 + v).
 * - The track is a network of sectors (`SECTORS`), each a run of tagged
 *   control points (height, banking, grip, a deck or a tunnel, a box row, a
 *   boost pad) between nodes where sectors meet. The core is the Neon Loop,
 *   a figure of eight: the start straight down the west side (the stand
 *   beside it), the west lobe's bottom, a diagonal across the middle at
 *   ground level, the east lobe with its hairpin and a wet stretch, back
 *   over the middle on a flyover, the hump (a jump) on the west lobe's top.
 *   North of it the Summit sectors: a banked bowl in the north-east corner,
 *   a hill climb along the north edge with a tunnel on the way down, a
 *   second banked bowl in the north-west, and a return east along the
 *   middle over a bridge into the hairpin. A dirt shortcut cuts the
 *   north-west corner (slow unless you're boosting).
 * - A course (`COURSES`) is a list of sectors, sampled every half tile as
 *   one closed centre line (`Course`: x, z, height, tangent, curvature,
 *   banking, grip and flags per sample, and the length), plus its
 *   shortcut if the course runs through both ends of one. The track is
 *   TRACK_HALF either side, walled. Reverse courses run the same sectors
 *   the other way. `PIECES` are the sectors sampled on their own, for
 *   drawing the one physical track.
 * - `frame(course, s)` gives the point on the centre line at a distance s
 *   round the loop; `locate(course, x, z, hint)` finds a kart's s and
 *   sideways offset from a position, keeping to the layer (ground or
 *   bridge) its last s was on.
 */

export type Pt = [number, number];

/** The site, in world units: x0, z0, x1, z1 (to the world's edge north and east) */
export const KART_PARK = { x0: 92, z0: -192, x1: 232, z1: -48 } as const;
const X0 = KART_PARK.x0 + 2;
const Z0 = KART_PARK.z0 + 2;
/** Local numbers: u east, v south, inside a 2-wide margin */
export const toWorld = ([u, v]: Pt): Pt => [X0 + u, Z0 + v];
export const toLocal = ([x, z]: Pt): Pt => [x - X0, z - Z0];
/** The local frame's size (the site inside its margins) */
export const SITE_U = 136;
export const SITE_V = 140;
/** The core loop was drawn in a 44 x 46 frame; it's blown up this much and sits CORE_U / CORE_V into the site */
export const LOOP_SCALE = 3;
const CORE_U = -5;
const CORE_V = 33;

/** The track's half width (the walls stand just outside), a shortcut's, and a kart's radius for the walls */
export const TRACK_HALF = 5.2;
export const SHORTCUT_HALF = 3.2;
export const KART_R = 0.5;
/** A bridge deck's height over what it crosses */
export const BRIDGE_H = 2.4;
/** The bowls' banking (the roll, radians-ish: the surface's slope across the track) and the centre line's lift so the low edge rests on the ground */
export const BANK = 0.28;
export const BANK_H = BANK * TRACK_HALF;
/** Samples every half tile along the centre line */
export const STEP = 0.5;

/* ---------- Flags, grip and tags ---------- */

/** Per-sample flags (a bitmask) */
export const F = { deck: 1, tunnel: 2, wet: 4, dirt: 8, bank: 16 } as const;
/** How much grip a surface has (1 = dry asphalt); dirt also caps speed (kart-sim.ts) */
export const GRIP = { dry: 1, wet: 0.62, dirt: 0.5 } as const;
export type Tag = 'line' | 'box' | 'pad' | 'hump' | 'sc-out' | 'sc-in';

/** A control point: where, and what the track does there (the flags and grip hold until the next point) */
export interface CPt {
  u: number;
  v: number;
  /** Height (cosine-interpolated along to the next point) */
  h?: number;
  /** Banking in radians, the right side up when positive (linear along) */
  roll?: number;
  grip?: number;
  f?: number;
  tags?: Tag[];
}
const P = (u: number, v: number, o: Omit<CPt, 'u' | 'v'> = {}): CPt => ({ u, v, ...o });
/** A core point from the small frame */
const C = (u: number, v: number, o: Omit<CPt, 'u' | 'v'> = {}): CPt => P(u * LOOP_SCALE + CORE_U, v * LOOP_SCALE + CORE_V, o);

/* ---------- The network ---------- */

/** The nodes: where sectors meet (every sector starts and ends on one) */
const NODE = {
  /** The west straight's top, where the north descent comes in */
  W: C(5, 9.6),
  /** The east lobe's top, where the north sectors leave */
  E: C(39.5, 8),
  /** The hairpin's exit, where the return comes in down the east edge */
  H: C(40.8, 24.5),
  /** The north-west bowl's west side, where the descent peels off */
  N: P(13, 24, { roll: BANK, h: BANK_H, f: F.bank }),
} as const;
export type SectorId = 'west' | 'link' | 'hairpin' | 'north' | 'return' | 'descent';
export interface Sector {
  id: SectorId;
  pts: CPt[];
  /** Points past each end on the physical track (how the sector is padded when drawn on its own) */
  before: CPt;
  after: CPt;
}
const SECTOR_PTS: Record<SectorId, CPt[]> = {
  // The start straight down the west side, the west lobe's bottom, the diagonal across the middle (at ground), the east lobe's top
  west: [NODE.W, C(5.5, 13.2), C(5.8, 16), C(6.3, 21, { tags: ['pad'] }), C(8, 25.5), C(11, 28, { tags: ['box'] }), C(14.5, 27.5), C(18, 23.5), C(23.5, 18), C(29, 12.5), C(32.5, 9), C(36, 7, { tags: ['box'] }), NODE.E],
  // Straight on down the hairpin's straight and round its apex
  link: [NODE.E, C(41.5, 12.5), C(41.5, 19.5), NODE.H],
  // Out of the hairpin: the east lobe's wet bottom, up over the flyover, the hump, the west lobe's top
  hairpin: [
    NODE.H,
    C(38.5, 28.3, { grip: GRIP.wet, f: F.wet, tags: ['pad'] }),
    C(34.8, 29.6, { grip: GRIP.wet, f: F.wet }),
    C(31.5, 27.8),
    C(29.3, 24.3, { tags: ['box'], f: F.deck }),
    C(25.4, 20.1, { h: BRIDGE_H, f: F.deck }),
    C(23.5, 18, { h: BRIDGE_H, f: F.deck }),
    C(21.6, 15.9, { h: BRIDGE_H, f: F.deck }),
    C(18, 12.5, { f: F.deck, tags: ['pad'] }),
    C(14.5, 9, { tags: ['box'] }),
    C(11, 6.3, { h: 1.3, tags: ['hump'] }),
    C(7.4, 6.6),
    NODE.W,
  ],
  // North: the banked bowl in the north-east, the hill climb west along the north edge, the tunnel on the way down, the north-west bowl
  north: [
    NODE.E,
    P(121, 58),
    P(127, 53.5),
    P(130.5, 45, { roll: BANK / 2, h: BANK_H / 2, f: F.bank }),
    P(131, 34, { roll: BANK, h: BANK_H, f: F.bank }),
    P(128, 22, { roll: BANK, h: BANK_H, f: F.bank, tags: ['box'] }),
    P(120, 11),
    P(110, 6, { tags: ['pad'] }),
    P(98, 5, { h: 1.6 }),
    P(86, 5, { h: 3.2 }),
    P(74, 5, { h: 1.6, tags: ['box'] }),
    P(62, 6, { tags: ['sc-out'] }),
    P(54, 7, { f: F.tunnel }),
    P(40, 10),
    P(26, 11),
    P(16.8, 14.8, { roll: BANK, h: BANK_H, f: F.bank }),
    NODE.N,
  ],
  // The return: out of the bowl, east along the middle, over the bridge, down the east edge into the hairpin's exit
  return: [
    NODE.N,
    P(16.8, 33.2, { roll: BANK, h: BANK_H, f: F.bank }),
    P(22, 37, { h: 0.7 }),
    P(33, 38, { tags: ['sc-in', 'pad'] }),
    P(50, 38, { tags: ['box'] }),
    P(76, 38),
    P(92, 38, { f: F.deck }),
    P(104, 40, { h: 1.2, f: F.deck }),
    P(113, 46, { h: BRIDGE_H, f: F.deck }),
    P(121, 51, { h: BRIDGE_H, f: F.deck }),
    P(128.5, 58, { h: BRIDGE_H, f: F.deck }),
    P(131.5, 70, { h: 1.9, f: F.deck }),
    P(131.5, 82, { h: 0.5, tags: ['box'] }),
    P(130, 94),
    P(125, 103),
    NODE.H,
  ],
  // The descent: straight down from the north-west bowl into the start straight
  descent: [NODE.N, P(9, 36), P(9.5, 50), NODE.W],
};
const pad = (id: SectorId): { before: CPt; after: CPt } => {
  const prev: Record<SectorId, CPt> = { west: SECTOR_PTS.hairpin.at(-2)!, link: SECTOR_PTS.west.at(-2)!, hairpin: SECTOR_PTS.link.at(-2)!, north: SECTOR_PTS.west.at(-2)!, return: SECTOR_PTS.north.at(-2)!, descent: SECTOR_PTS.north.at(-2)! };
  const next: Record<SectorId, CPt> = { west: SECTOR_PTS.link[1], link: SECTOR_PTS.hairpin[1], hairpin: SECTOR_PTS.west[1], north: SECTOR_PTS.return[1], return: SECTOR_PTS.hairpin[1], descent: SECTOR_PTS.west[1] };
  return { before: prev[id], after: next[id] };
};
export const SECTORS: Record<SectorId, Sector> = Object.fromEntries((Object.keys(SECTOR_PTS) as SectorId[]).map((id) => [id, { id, pts: SECTOR_PTS[id], ...pad(id) }])) as Record<SectorId, Sector>;
export const SECTOR_IDS = Object.keys(SECTORS) as SectorId[];

/** The dirt shortcut across the north-west corner, between its two tags on the north and return sectors */
export const SHORTCUT: { pts: CPt[]; half: number } = {
  pts: [P(62, 6, { grip: GRIP.dirt, f: F.dirt }), P(50, 20, { grip: GRIP.dirt, f: F.dirt }), P(40, 30, { grip: GRIP.dirt, f: F.dirt }), P(33, 38)],
  half: SHORTCUT_HALF,
};

/** The start line: on the west straight, at this v (the same line both ways round) */
const START_V = 19 * LOOP_SCALE + CORE_V;
/** Where the item boxes sit across the track (five abreast) */
export const BOX_LATERALS = [-3.6, -1.8, 0, 1.8, 3.6];
/** A boost pad's length */
export const PAD_LEN = 5;

/* ---------- Sampling ---------- */

export interface Line {
  x: Float64Array;
  z: Float64Array;
  y: Float64Array;
  tx: Float64Array;
  tz: Float64Array;
  k: Float64Array;
  roll: Float64Array;
  grip: Float64Array;
  flags: Uint8Array;
  /** How long it is (tiles), and the samples' spacing */
  L: number;
  step: number;
  /** Where each control point landed (s) */
  at: number[];
  closed: boolean;
}

/**
 * Centripetal Catmull-Rom through control points (no overshoot at uneven spacing), sampled
 * every `step` tiles: closed round a loop, or open with `before` / `after` padding the ends.
 */
export function sampleLine(pts: CPt[], step: number, closed: boolean, before?: CPt, after?: CPt): Line {
  const n = pts.length;
  const P = (i: number): CPt => {
    if (closed) return pts[((i % n) + n) % n];
    if (i < 0) return before ?? pts[0];
    if (i >= n) return after ?? pts[n - 1];
    return pts[i];
  };
  const dense: { u: number; v: number; seg: number; t: number }[] = [];
  const per = 24;
  const knot = (a: CPt, b: CPt) => Math.sqrt(Math.hypot(b.u - a.u, b.v - a.v)) || 1e-3;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
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
      const q = (p: CPt): Pt => [p.u, p.v];
      const a1 = mix(q(p0), q(p1), t0, t1);
      const a2 = mix(q(p1), q(p2), t1, t2);
      const a3 = mix(q(p2), q(p3), t2, t3);
      const b1 = mix(a1, a2, t0, t2);
      const b2 = mix(a2, a3, t1, t3);
      const [u, v] = mix(b1, b2, t1, t2);
      dense.push({ u, v, seg: i, t: j / per });
    }
  }
  if (!closed) dense.push({ u: pts[n - 1].u, v: pts[n - 1].v, seg: n - 1, t: 0 });
  // Resample by arc length
  const cum = [0];
  const last = closed ? dense.length : dense.length - 1;
  for (let i = 1; i <= last; i++) {
    const a = dense[i - 1];
    const b = dense[i % dense.length];
    cum.push(cum[i - 1] + Math.hypot(b.u - a.u, b.v - a.v));
  }
  const L = cum[last];
  const count = Math.max(2, Math.round(L / step));
  const samples = closed ? count : count + 1;
  const stepL = L / count;
  const x = new Float64Array(samples);
  const z = new Float64Array(samples);
  const y = new Float64Array(samples);
  const tx = new Float64Array(samples);
  const tz = new Float64Array(samples);
  const k = new Float64Array(samples);
  const roll = new Float64Array(samples);
  const grip = new Float64Array(samples);
  const flags = new Uint8Array(samples);
  const at = pts.map((_, i) => cum[Math.min(last, i * per)]);
  if (closed) at.push(L);
  let j = 0;
  for (let i = 0; i < samples; i++) {
    const s = Math.min(L, i * stepL);
    while (j < last - 1 && cum[j + 1] < s) j++;
    const a = dense[j];
    const b = dense[(j + 1) % dense.length];
    const f = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    const [wx, wz] = toWorld([a.u + (b.u - a.u) * f, a.v + (b.v - a.v) * f]);
    x[i] = wx;
    z[i] = wz;
    // The control points either side (by s) give the height (cosine), the banking (linear), the grip and the flags (held)
    let c = 0;
    while (c < pts.length - 1 && at[c + 1] <= s) c++;
    const p0 = pts[c];
    const p1 = closed ? pts[(c + 1) % n] : pts[Math.min(n - 1, c + 1)];
    const s0 = at[c];
    const s1 = closed && c === n - 1 ? L : at[Math.min(at.length - 1, c + 1)];
    const t = s1 > s0 ? Math.min(1, Math.max(0, (s - s0) / (s1 - s0))) : 0;
    const h0 = p0.h ?? 0;
    const h1 = p1.h ?? 0;
    y[i] = h0 + (h1 - h0) * 0.5 * (1 - Math.cos(Math.PI * t));
    roll[i] = (p0.roll ?? 0) + ((p1.roll ?? 0) - (p0.roll ?? 0)) * t;
    grip[i] = p0.grip ?? GRIP.dry;
    flags[i] = p0.f ?? 0;
  }
  for (let i = 0; i < samples; i++) {
    const a = closed ? (i - 1 + samples) % samples : Math.max(0, i - 1);
    const b = closed ? (i + 1) % samples : Math.min(samples - 1, i + 1);
    const dx = x[b] - x[a];
    const dz = z[b] - z[a];
    const d = Math.hypot(dx, dz) || 1;
    tx[i] = dx / d;
    tz[i] = dz / d;
  }
  for (let i = 0; i < samples; i++) {
    const a = closed ? (i - 1 + samples) % samples : Math.max(0, i - 1);
    const b = closed ? (i + 1) % samples : Math.min(samples - 1, i + 1);
    // Turning left (yaw up) is a positive cross of the tangents in this frame (x east, z south)
    const cross = tx[a] * tz[b] - tz[a] * tx[b];
    const span = closed ? 2 : b - a;
    k[i] = span ? -cross / (span * stepL) : 0;
  }
  return { x, z, y, tx, tz, k, roll, grip, flags, L, step: stepL, at, closed };
}

/** The physical track: each sector sampled on its own (for drawing); the shortcut too */
export interface Piece extends Line {
  id: SectorId | 'shortcut';
  half: number;
  /** Tags along it: s of each */
  tags: { tag: Tag; s: number }[];
}
const tagsOf = (pts: CPt[], at: number[]) => pts.flatMap((p, i) => (p.tags ?? []).map((tag) => ({ tag, s: at[i] })));
export const PIECES: Piece[] = [
  ...SECTOR_IDS.map((id): Piece => {
    const sec = SECTORS[id];
    const line = sampleLine(sec.pts, STEP, false, sec.before, sec.after);
    return { ...line, id, half: TRACK_HALF, tags: tagsOf(sec.pts, line.at) };
  }),
  (() => {
    const line = sampleLine(SHORTCUT.pts, STEP, false, SECTORS.north.pts.at(-7), SECTORS.return.pts[4]);
    return { ...line, id: 'shortcut' as const, half: SHORTCUT.half, tags: [] };
  })(),
];

/* ---------- Courses ---------- */

export type CourseId = 'neon-loop' | 'neon-reverse' | 'grand' | 'grand-reverse' | 'summit' | 'summit-reverse';
export const COURSE_IDS: CourseId[] = ['neon-loop', 'neon-reverse', 'summit', 'summit-reverse', 'grand', 'grand-reverse'];
export interface Shortcut extends Line {
  half: number;
  /** Where it leaves and rejoins the main line (s on the course, in the course's direction) */
  out: number;
  in: number;
}
export interface Course extends Line {
  id: CourseId;
  name: string;
  blurb: string;
  reverse: boolean;
  sectors: SectorId[];
  /** Where the start line crosses it (s), and the hump's top (or -1) */
  start: number;
  hump: number;
  /** Where the items and the boost pads are (s), and the pads' lengths */
  boxes: number[];
  pads: { s: number; len: number }[];
  /** The dirt shortcut, if the course passes both its ends */
  shortcut: Shortcut | null;
  /** Lap count for a race */
  laps: number;
}
const COURSE_DEFS: Record<CourseId, { name: string; blurb: string; sectors: SectorId[]; reverse: boolean; laps: number }> = {
  'neon-loop': { name: 'Neon Loop', blurb: 'The figure of eight: the hairpin, the wet bend, the flyover, the jump. Learn it by heart.', sectors: ['west', 'link', 'hairpin'], reverse: false, laps: 3 },
  'neon-reverse': { name: 'Neon Loop · reverse', blurb: 'The loop the other way round: every turn flipped, the flyover before the hairpin.', sectors: ['west', 'link', 'hairpin'], reverse: true, laps: 3 },
  summit: { name: 'Summit Run', blurb: 'Out of the east lobe into the banked bowl, up the hill, through the tunnel, round the north-west bowl and straight down to the line.', sectors: ['west', 'north', 'descent'], reverse: false, laps: 3 },
  'summit-reverse': { name: 'Summit Run · reverse', blurb: 'Up the descent first, the bowls the other way, the hill from the tunnel side.', sectors: ['west', 'north', 'descent'], reverse: true, laps: 3 },
  grand: { name: 'Grand Circuit', blurb: 'Everything: the diagonal, both bowls, the hill and the tunnel, the bridge into the hairpin, the wet bend, the flyover, the jump.', sectors: ['west', 'north', 'return', 'hairpin'], reverse: false, laps: 2 },
  'grand-reverse': { name: 'Grand Circuit · reverse', blurb: 'The whole park the other way round. The longest lap there is.', sectors: ['west', 'north', 'return', 'hairpin'], reverse: true, laps: 2 },
};

function makeCourse(id: CourseId): Course {
  const def = COURSE_DEFS[id];
  // Join the sectors into one closed list (each starts where the last ended; the last ends where the first starts)
  let pts: CPt[] = [];
  for (const sid of def.sectors) {
    const sp = SECTORS[sid].pts;
    pts.push(...(pts.length ? sp.slice(1) : sp));
  }
  pts.pop();
  if (def.reverse) pts = [pts[0], ...pts.slice(1).reverse()];
  const line = sampleLine(pts, STEP, true);
  const n = line.x.length;
  const L = line.L;
  const w = (v: number) => ((v % L) + L) % L;
  // Tags by s, in this course's direction
  const tagAt = (tag: Tag) => pts.flatMap((p, i) => (p.tags?.includes(tag) ? [line.at[i]] : []));
  // The start line: where the west straight passes START_V
  let start = 0;
  for (let i = 0; i < n; i++) {
    const [u0, v0] = toLocal([line.x[i], line.z[i]]);
    const [, v1] = toLocal([line.x[(i + 1) % n], line.z[(i + 1) % n]]);
    if (u0 < 8 * LOOP_SCALE + CORE_U && ((v0 <= START_V && v1 > START_V) || (v0 >= START_V && v1 < START_V))) {
      start = (i + (START_V - v0) / (v1 - v0)) * line.step;
      break;
    }
  }
  const hump = tagAt('hump')[0] ?? -1;
  const boxes = tagAt('box').map((s) => w(s + 3));
  const pads = tagAt('pad').map((s) => ({ s: w(s + 2), len: PAD_LEN }));
  // The shortcut: only when the course passes its out then its in (reversed: in then out, the shortcut run backwards)
  let shortcut: Shortcut | null = null;
  const so = tagAt(def.reverse ? 'sc-in' : 'sc-out')[0];
  const si = tagAt(def.reverse ? 'sc-out' : 'sc-in')[0];
  if (so !== undefined && si !== undefined) {
    const scPts = def.reverse ? [...SHORTCUT.pts].reverse() : SHORTCUT.pts;
    const oi = pts.findIndex((p) => p.tags?.includes(def.reverse ? 'sc-in' : 'sc-out'));
    const ii = pts.findIndex((p) => p.tags?.includes(def.reverse ? 'sc-out' : 'sc-in'));
    const sl = sampleLine(scPts, STEP, false, pts[(oi - 1 + pts.length) % pts.length], pts[(ii + 1) % pts.length]);
    shortcut = { ...sl, half: SHORTCUT.half, out: so, in: si };
  }
  return { ...line, id, name: def.name, blurb: def.blurb, reverse: def.reverse, sectors: def.sectors, start, hump, boxes, pads, shortcut, laps: def.laps };
}

export const COURSES: Record<CourseId, Course> = Object.fromEntries(COURSE_IDS.map((id) => [id, makeCourse(id)])) as Record<CourseId, Course>;
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
    out.push({ s: c.start - 2.6 - row * 3.2 - (i % 2) * 1.4, lateral: side * 2.2 });
  }
  return out;
}

/** s wrapped round the loop */
export const wrapS = (c: Line, s: number) => (c.closed ? ((s % c.L) + c.L) % c.L : Math.max(0, Math.min(c.L, s)));
/** The signed distance along the loop from a to b (the short way) */
export function along(c: Line, a: number, b: number) {
  let d = wrapS(c, b) - wrapS(c, a);
  if (c.closed) {
    if (d > c.L / 2) d -= c.L;
    if (d < -c.L / 2) d += c.L;
  }
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
  /** Banking (radians, the right side up when positive), grip (1 = dry) and flags (F) */
  roll: number;
  grip: number;
  flags: number;
}
/** The centre line at a distance s along (interpolated), with the left normal */
export function frame(c: Line, s: number): Frame {
  const n = c.x.length;
  const f = wrapS(c, s) / c.step;
  const i = Math.min(n - 1, Math.floor(f)) % n;
  const j = c.closed ? (i + 1) % n : Math.min(n - 1, i + 1);
  const t = Math.min(1, f - Math.floor(f));
  const lerp = (a: Float64Array) => a[i] + (a[j] - a[i]) * t;
  const tx = lerp(c.tx);
  const tz = lerp(c.tz);
  const d = Math.hypot(tx, tz) || 1;
  // Left of the tangent (yaw up): in this frame left is (tz, -tx)
  return {
    x: lerp(c.x),
    z: lerp(c.z),
    y: lerp(c.y),
    tx: tx / d,
    tz: tz / d,
    nx: tz / d,
    nz: -tx / d,
    k: lerp(c.k),
    slope: j === i ? 0 : (c.y[j] - c.y[i]) / c.step,
    roll: lerp(c.roll),
    grip: c.grip[i],
    flags: c.flags[i],
  };
}
/** The way a kart faces when it sits on the line at s (yaw: 0 faces +x, left raises it) */
export const yawAt = (c: Line, s: number) => {
  const f = frame(c, s);
  return Math.atan2(-f.tz, f.tx);
};
/** The surface's height across the track: the banking lifts the right side (lateral < 0) */
export const heightAt = (f: Frame, lateral: number) => f.y - f.roll * lateral;
/** A point on the track: s along, lateral across (left positive) */
export function at(c: Line, s: number, lateral = 0) {
  const f = frame(c, s);
  return { x: f.x + f.nx * lateral, z: f.z + f.nz * lateral, y: heightAt(f, lateral), yaw: Math.atan2(-f.tz, f.tx) };
}

/**
 * Where a position is on a line: the nearest point of the centre line (searching near `hint`,
 * so a bridge and the ground under it stay apart), its s, the sideways offset (left positive)
 * and the surface's height there.
 */
export function locate(c: Line, x: number, z: number, hint: number | null = null, reach = 12) {
  const n = c.x.length;
  let best = -1;
  let bestD = Infinity;
  const test = (i: number) => {
    const ii = c.closed ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i));
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
  const prev = c.closed ? (i - 1 + n) % n : Math.max(0, i - 1);
  const next = c.closed ? (i + 1) % n : Math.min(n - 1, i + 1);
  const f = refine(i, next);
  const g = refine(prev, i);
  const s = f.d <= g.d ? (i + f.t) * c.step : (prev + g.t) * c.step;
  const fr = frame(c, s);
  const lateral = (x - fr.x) * fr.nx + (z - fr.z) * fr.nz;
  return { s: wrapS(c, s), lateral, y: heightAt(fr, lateral), frame: fr };
}

/* ---------- The site: the hut, the gate, the slip road, the stands ---------- */

/** Where things stand on the site (local u, v) */
export const SITE = {
  /** The kart hut: its box, its door (where you stand for the menu) and its neon sign */
  hut: { u0: 60, v0: 130, u1: 70, v1: 137, door: [65, 137.6] as Pt },
  /** The gate in the south fence, and the slip road down to the Parkway */
  gate: { u: 6, w: 5 },
  /** The grandstand along the west straight, facing east over the track */
  stand: { u0: 1, v0: 81, u1: 6.6, v1: 113 },
  /** The big screen, facing north over the east lobe's bottom bend */
  screen: { u: 95, v: 136, w: 10 },
  /** The pit lane: where the karts wait between races (parked, behind the west lobe's bottom) */
  pits: { u0: 25, v0: 130, u1: 45, v1: 137 },
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
/** Where you spawn when you walk in from the city panel: inside the gate, looking north at the track (walk.ts looks along -z at yaw 0) */
export const KART_SPAWN = { x: GATE.inside[0], z: GATE.inside[1], yaw: 0 };

/** The shortcut's rope posts stand this often along it (kartpark3d.ts draws them; nothing is solid) */
export const WALL_EVERY = 3;
/** x0, z0, x1, z1, height (solids.ts Box) */
type Box = [number, number, number, number, number];
const box = (u0: number, v0: number, u1: number, v1: number, h: number): Box => {
  const [x0, z0] = toWorld([u0, v0]);
  const [x1, z1] = toWorld([u1, v1]);
  return [x0, z0, x1, z1, h];
};
/** The gantry's posts, either side of the start line */
export const GANTRY = (() => {
  const c = COURSES['neon-loop'];
  const f = frame(c, c.start);
  const reach = TRACK_HALF + 0.7;
  return { x: f.x, z: f.z, tx: f.tx, tz: f.tz, posts: [1, -1].map((side) => ({ x: f.x + f.nx * reach * side, z: f.z + f.nz * reach * side })), h: 5.5, half: reach };
})();
/**
 * The bridges' pillars (world x, z, and the deck's height there): every six tiles along a deck, both
 * sides, never standing in the lane the deck crosses (nor in any other piece's lane at ground level).
 */
export const PILLARS: { x: number; z: number; h: number }[] = (() => {
  const out: { x: number; z: number; h: number }[] = [];
  const inLane = (x: number, z: number, own: Piece) =>
    PIECES.some((q) => {
      if (q === own) return false;
      for (let i = 0; i < q.x.length; i += 2) if (q.y[i] < 0.6 && Math.hypot(q.x[i] - x, q.z[i] - z) < q.half + 0.9) return true;
      return false;
    });
  for (const p of PIECES) {
    if (p.id === 'shortcut') continue;
    for (let s = 3; s < p.L; s += 6) {
      const f = frame(p, s);
      if (!(f.flags & F.deck) || f.y < 0.6) continue;
      for (const side of [1, -1]) {
        const x = f.x + f.nx * (TRACK_HALF + 0.2) * side;
        const z = f.z + f.nz * (TRACK_HALF + 0.2) * side;
        if (!inLane(x, z, p)) out.push({ x, z, h: f.y });
      }
    }
  }
  return out;
})();
/** The junctions: within this reach of a node the walls are left out (the track widens into a Y there) */
export const NODES: { id: keyof typeof NODE; x: number; z: number }[] = (Object.keys(NODE) as (keyof typeof NODE)[]).map((id) => {
  const [x, z] = toWorld([NODE[id].u, NODE[id].v]);
  return { id, x, z };
});
export const NODE_REACH = 16;
export const nearNode = (x: number, z: number) => NODES.some((n) => Math.hypot(n.x - x, n.z - z) < NODE_REACH);

/**
 * Footprints for walking and driving round the park (solids.ts adds them to SOLIDS): the fence (with the
 * gate's gap), the hut, the stand, the screen, the gantry's posts and the bridges' pillars. The track and
 * its kerbs are open (the owner's call): Degen walks across it and a kart or car drives on and off it
 * anywhere; only a race's karts are kept in by the sim's own walls.
 */
export const KART_SOLIDS: Box[] = (() => {
  const P = KART_PARK;
  const F_ = 0.25;
  const out: Box[] = [
    // The fence, 1.2 high, the gate left open
    [P.x0 - F_, P.z0 - F_, P.x1 + F_, P.z0 + F_, 1.2],
    [P.x0 - F_, P.z0 - F_, P.x0 + F_, P.z1 + F_, 1.2],
    [P.x1 - F_, P.z0 - F_, P.x1 + F_, P.z1 + F_, 1.2],
    [P.x0 - F_, P.z1 - F_, GATE.x0, P.z1 + F_, 1.2],
    [GATE.x1, P.z1 - F_, P.x1 + F_, P.z1 + F_, 1.2],
    box(SITE.hut.u0, SITE.hut.v0, SITE.hut.u1, SITE.hut.v1, 3.2),
    box(SITE.stand.u0, SITE.stand.v0, SITE.stand.u1, SITE.stand.v1, 4.5),
    box(SITE.screen.u - SITE.screen.w / 2, SITE.screen.v - 0.3, SITE.screen.u + SITE.screen.w / 2, SITE.screen.v + 0.3, 5),
  ];
  for (const p of GANTRY.posts) out.push([p.x - 0.22, p.z - 0.22, p.x + 0.22, p.z + 0.22, GANTRY.h]);
  for (const { x, z, h } of PILLARS) out.push([x - 0.2, z - 0.2, x + 0.2, z + 0.2, h]);
  return out;
})();

/**
 * The track's surface under a point, for driving on it off a race (drive.ts): the height and the
 * banking of the nearest piece whose lane covers the point and whose height is near `yNow` (so a
 * kart under a bridge stays under it, and one on the deck stays up). Null off the track.
 */
export function trackSurfaceAt(x: number, z: number, yNow: number): { y: number; roll: number } | null {
  const P = KART_PARK;
  if (x < P.x0 || x > P.x1 || z < P.z0 || z > P.z1) return null;
  let best: { y: number; roll: number } | null = null;
  let bestDy = Infinity;
  for (const p of PIECES) {
    const reach = p.half + 0.6;
    let bi = -1;
    let bd = reach * reach;
    for (let i = 0; i < p.x.length; i += 2) {
      const dd = (p.x[i] - x) ** 2 + (p.z[i] - z) ** 2;
      if (dd < bd) {
        bd = dd;
        bi = i;
      }
    }
    if (bi < 0) continue;
    const f = frame(p, bi * p.step);
    const lat = (x - f.x) * f.nx + (z - f.z) * f.nz;
    if (Math.abs(lat) > reach) continue;
    const y = heightAt(f, Math.max(-p.half, Math.min(p.half, lat)));
    const dy = Math.abs(y - yNow);
    if (dy > 1.8 || dy >= bestDy) continue;
    bestDy = dy;
    best = { y, roll: f.roll };
  }
  return best;
}
