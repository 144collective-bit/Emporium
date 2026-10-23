/*
 * The kart park's site and the track-line maths, free of the DOM and of
 * scene code. The circuit itself (its centre line, kerbs, run-off, pits and
 * buildings) is kartcircuit.ts; kart-sim.ts races on it, kartpark3d.ts draws
 * it, kart.ts is the race's view.
 *
 * - The site is a 112 x 120 rectangle of open land north of the ring
 *   highway, east of the east ring avenue (ns3) past it (the north side's
 *   stage 2, docs/north-plan.md: it was north of the Parkway's top before,
 *   that land is open again), fenced, with its gate on its south side on
 *   Kart Road (`ROAD`), which runs east off ns3 past the car park's one-way
 *   loop (`LOOP`). The circuit is drawn in local numbers: u east, v south
 *   from the same corner of it as before the move (world x = X0 + u,
 *   z = Z0 + v), so it's the same circuit to the last sample; the site
 *   reaches past it on every side for the stands, banks and paddock.
 * - A `Line` is a centre line sampled every half tile from control points
 *   (`sampleLine()`, centripetal Catmull-Rom, heights cosine-eased): x, z,
 *   height, tangent, curvature, banking, grip and flags per sample.
 *   `frame(line, s)` gives the point a distance s along with its left
 *   normal; `locate(line, x, z, hint)` finds a kart's s and sideways offset
 *   from a position, keeping to the layer (the deck or the ground under it)
 *   its last s was on.
 */

export type Pt = [number, number];

/** The local frame's corner (world x, z): the circuit's numbers start here */
const X0 = 127;
const Z0 = -295.5;
/** The site, in world units: x0, z0, x1, z1 (its fence) */
export const KART_PARK = { x0: X0 - 14, z0: Z0 - 16, x1: X0 + 98, z1: Z0 + 104 } as const;
/** Local numbers: u east, v south */
export const toWorld = ([u, v]: Pt): Pt => [X0 + u, Z0 + v];
export const toLocal = ([x, z]: Pt): Pt => [x - X0, z - Z0];
/** The circuit's frame (its run-off, the pits and the hut inside it); the site reaches past it */
export const SITE_U = 84;
export const SITE_V = 86;

/** A kart's radius (for bumping), length and width (the models in karts.ts keep to these) */
export const KART_R = 0.5;
export const KART_L = 1.25;
export const KART_W = 0.95;
/** The least headroom a deck leaves over the lane it crosses */
export const BRIDGE_H = 2.4;
/** Samples every half tile along a centre line */
export const STEP = 0.5;

/** Per-sample flags (a bitmask): a deck (open underneath), the tunnel, a banked bend */
export const F = { deck: 1, tunnel: 2, bank: 16 } as const;
/** How much grip a surface has (1 = dry asphalt) */
export const GRIP = { dry: 1 } as const;

/** A control point: where, and what the track does there (the flags and grip hold until the next point) */
export interface CPt {
  u: number;
  v: number;
  /** Height (cosine-interpolated along to the next point) */
  h?: number;
  /** The height glides through this point: one cosine from the point before to the point after that set theirs (a long ramp round a bend) */
  glide?: boolean;
  /** Banking in radians, the right side up when positive (linear along) */
  roll?: number;
  grip?: number;
  f?: number;
}

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
    // The height: a cosine between the nearest points either side that set theirs (gliding points are passed through)
    const wrap = (k: number) => (closed ? ((k % n) + n) % n : Math.max(0, Math.min(n - 1, k)));
    const pos = (k: number) => (closed ? at[wrap(k)] + Math.floor(k / n) * L : at[wrap(k)]);
    let lo = c;
    while (pts[wrap(lo)].glide && (closed ? lo > c - n : lo > 0)) lo--;
    let hi = c + 1;
    while (pts[wrap(hi)].glide && (closed ? hi < c + 1 + n : hi < n - 1)) hi++;
    const sa = pos(lo);
    const sb = pos(hi);
    const ha = pts[wrap(lo)].h ?? 0;
    const hb = pts[wrap(hi)].h ?? 0;
    const th = sb > sa ? Math.min(1, Math.max(0, (s - sa) / (sb - sa))) : 0;
    y[i] = ha + (hb - ha) * 0.5 * (1 - Math.cos(Math.PI * th));
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

/* ---------- The site: Kart Road, the car park's loop, the gate, where you walk in ---------- */

/** The east ring avenue past the highway (ns3), where Kart Road comes off */
const NS3 = 64.5;
/** Kart Road: east off ns3 along the site's south side, past the gate (a street, a lane each way) */
export const ROAD = { z: -188, x0: NS3, x1: KART_PARK.x0 + 26, half: 1.7 } as const;
/** The car park's one-way loop off it, between ns3 and the site (its west and east sides, its north side's z) */
export const LOOP = { x0: 76, x1: 108, z1: -234, half: 1.7 } as const;
/** Kart Road and the loop in the street plan (the loop driven against its points: north up its east side, west, south down its west side) */
export const KART_STREETS: { id: string; pts: Pt[]; half: number; oneway?: -1 }[] = [
  { id: 'kart-road', pts: [[ROAD.x0, ROAD.z], [ROAD.x1, ROAD.z]], half: ROAD.half },
  { id: 'kart-loop', pts: [[LOOP.x0, ROAD.z], [LOOP.x0, LOOP.z1], [LOOP.x1, LOOP.z1], [LOOP.x1, ROAD.z]], half: LOOP.half, oneway: -1 },
];
/** Where they meet ns3 and each other (no lights) */
export const KART_CROSSINGS: { id: string; at: Pt; streets: string[] }[] = [
  { id: 'kart-in', at: [ROAD.x0, ROAD.z], streets: ['ns3', 'kart-road'] },
  { id: 'kart-loop-w', at: [LOOP.x0, ROAD.z], streets: ['kart-road', 'kart-loop'] },
  { id: 'kart-loop-e', at: [LOOP.x1, ROAD.z], streets: ['kart-road', 'kart-loop'] },
];

/** The gate in the south fence (local u and its width), on Kart Road */
const GATE_U = 6;
const GATE_W = 5;
/** The gate's world x range, the fence line it's in, and where Degen stands just inside it */
export const GATE = (() => {
  const [gx] = toWorld([GATE_U, 0]);
  return { x0: gx - GATE_W / 2, x1: gx + GATE_W / 2, z: KART_PARK.z1, inside: [gx, KART_PARK.z1 - 2] as Pt };
})();
/** Where you spawn when you walk in from the city panel: inside the gate, looking north at the track (walk.ts looks along -z at yaw 0) */
export const KART_SPAWN = { x: GATE.inside[0], z: GATE.inside[1], yaw: 0 };
