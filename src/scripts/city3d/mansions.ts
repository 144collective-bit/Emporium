/**
 * The hills' mansions (docs/crestmont-plan.md Phase 6, the owner's call: Beverly Hills). DOM-free: terrain.ts holds the
 * ground level under each (`MANSION_LEVELS` are its `LEVELS`), solids.ts what's solid, landscape.ts keeps the hills'
 * planting off, and mansions3d.ts draws them.
 *
 * - **The pads** (`MANSIONS`): ground held level beside the hill roads (`PAD_EASE` round each, kept off every road's
 *   asphalt and shoulder, off each other, off the overlook at the ridge's end and off the lower slopes, left for the
 *   country club), at the road's height give or take `RISE`, a straight drive up from the road (`drive`). At the
 *   cul-de-sacs' ends, the road carries on through a gate into the summit estate (Summit Lane) and a gated compound
 *   (Vista Lane).
 * - **Each mansion** in its own frame, facing the road (u along its front, v out to the road, a turn and never a
 *   mirror: estates.ts's frame with four faces): its kind (`MansionKind`): **glass** (a cantilevered modern, its upper
 *   floor reaching out past the pad over the slope on steel legs, an infinity pool along the pad's back edge), **villa**
 *   (red tile roofs, tiled terraces stepping down the slope behind, `terraces`), **compound** (a stone wall round
 *   the pad with a gate, the house and a guest house) and **summit** (the summit estate: a compound with a tower);
 *   parts (`MPart`), the forecourt with a car (`MANSION_CARS`), the pool.
 * - `MANSION_SOLIDS` (in `SOLIDS`): their tops are the pad's height and the building's (bullets fly over the hills).
 *
 * Every top under the Emporium's height over its own ground (`TALLEST`). No real homes or people.
 */
import { BED, CREST_LAMPS, HILL_ROADS, nearHillRoad, roadY, type HillRoad, type Rect } from './crestmont';
import { HILLS, TERRAIN_RECT, natural } from './hills';
import { rng } from './recipes';

type Pt = [number, number];
type Box = [number, number, number, number, number];

/** A pad's level eased back into the hills over this */
export const PAD_EASE = 6;
/** A pad stands at its road's height give or take this (the drive up to it stays gentle) */
export const RISE = 2;
/** Kept clear of a road's asphalt (its shoulder and the drive's mouth) before a pad's ease begins */
const ROAD_CLEAR = BED.shoulder + 0.4;
/** The ridge's end is the overlook's (Phase 7) */
const OVERLOOK_R = 34;
/** Below this the hills are the country club's (Phase 7) */
const LOWER = 7;
/** The most a pad is cut into the hills or built up out of them at its corners */
export const CUT = 4;
/** Storeys */
export const STOREY = { ground: 2.2, upper: 1.9 } as const;
/** The tallest anything stands over its pad (the Emporium's roof is 12.5) */
export const TALLEST = 9;

export type MansionKind = 'glass' | 'villa' | 'compound' | 'summit';
export type Face = 'n' | 's' | 'e' | 'w';

/** A box of the house in the mansion's frame (u0..u1, v0 front .. v1 back, more negative), its storeys */
export interface MPart {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  floors: number;
  /** A tower or a flat-roofed glass box rather than a tiled roof */
  flat?: boolean;
}
export interface Mansion {
  id: string;
  kind: MansionKind;
  /** The road it's off, and how far along it */
  road: string;
  /** The pad (x0, z0, x1, z1) and the level it's held at */
  rect: Rect;
  y: number;
  face: Face;
  /** Along its front and back from it */
  W: number;
  D: number;
  /** The drive: from the road's edge to the pad's front, in the world */
  drive: [Pt, Pt];
  /** The drive's line along the front (u) */
  du: number;
  parts: MPart[];
  /** The forecourt (u0, v0, u1, v1) */
  court: [number, number, number, number];
  /** The pool (u0, v0, u1, v1); a glass mansion's runs along the pad's back edge (an infinity edge) */
  pool: [number, number, number, number];
  /** A villa's terraces stepping down behind the pad: v from and to, each a step lower */
  terraces: [number, number][];
  /** A glass mansion's cantilever: how far its upper floor reaches past the pad's back */
  reach: number;
  /** A wall round it (compounds, the summit) */
  walled: boolean;
  car: boolean;
}

/** A road's point, its way along and the left of it, at a distance along it */
function frameAt(r: HillRoad, d: number): { p: Pt; u: Pt; n: Pt } {
  let i = 1;
  while (i < r.cum.length - 1 && r.cum[i] < d) i++;
  const [a, b] = [r.pts[i - 1], r.pts[i]];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const f = Math.min(1, Math.max(0, (d - r.cum[i - 1]) / (r.cum[i] - r.cum[i - 1] || 1)));
  const u: Pt = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], u, n: [-u[1], u[0]] };
}
/** The face nearest a direction (the way out to the road) */
const faceOf = ([x, z]: Pt): Face => (Math.abs(x) > Math.abs(z) ? (x > 0 ? 'e' : 'w') : z > 0 ? 's' : 'n');
export const outOf = (f: Face): Pt => (f === 'e' ? [1, 0] : f === 'w' ? [-1, 0] : f === 's' ? [0, 1] : [0, -1]);

/** Round a pad, its ease and a little more: is every point off the roads? */
function clearOfRoads(r: Rect) {
  const m = PAD_EASE + 0.3;
  for (let x = r[0] - m; x <= r[2] + m + 1e-9; x += 1.5) for (let z = r[1] - m; z <= r[3] + m + 1e-9; z += 1.5) if (nearHillRoad(x, z, ROAD_CLEAR)) return false;
  return true;
}
const apart = (a: Rect, b: Rect, m: number) => a[2] + m < b[0] || b[2] + m < a[0] || a[3] + m < b[1] || b[3] + m < a[1];

function layout(): Mansion[] {
  const r = rng(6606);
  const out: Mansion[] = [];
  const ridge = HILL_ROADS.find((q) => q.id === 'crest-ridge')!;
  const overlook = ridge.pts[ridge.pts.length - 1];
  const fits = (rect: Rect) =>
    rect[0] > TERRAIN_RECT[0] + 8 &&
    rect[2] < 446 &&
    rect[1] > TERRAIN_RECT[1] + 8 &&
    rect[3] < HILLS.foot.z - 8 &&
    clearOfRoads(rect) &&
    out.every((o) => apart(o.rect, rect, 2 * PAD_EASE + 1)) &&
    Math.hypot((rect[0] + rect[2]) / 2 - overlook[0], (rect[1] + rect[3]) / 2 - overlook[1]) > OVERLOOK_R;

  /** Lay a mansion out in its pad: what stands where in its frame */
  const make = (kind: MansionKind, road: HillRoad, rect: Rect, yRoad: number, face: Face, drive: [Pt, Pt], rise = RISE) => {
    const [cx, cz] = [(rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2];
    const corners = [natural(rect[0], rect[1]), natural(rect[2], rect[1]), natural(rect[0], rect[3]), natural(rect[2], rect[3])];
    // (and halfway out through its ease, where the bank is steepest: the corners and the sides' middles)
    const e = PAD_EASE / 2;
    const [ex0, ez0, ex1, ez1] = [rect[0] - e, rect[1] - e, rect[2] + e, rect[3] + e];
    const ring = [ex0, (ex0 + ex1) / 2, ex1].flatMap((x) => [ez0, (ez0 + ez1) / 2, ez1].map((z) => natural(x, z)));
    // (the height that cuts and fills its corners least, near the road's)
    const mid = (Math.min(...corners, natural(cx, cz)) + Math.max(...corners, natural(cx, cz))) / 2;
    const y = yRoad + Math.max(-rise, Math.min(rise, mid - yRoad));
    // (not where the hills fall or rise too far round it: a pad, not a quarry; its banks stay walkable)
    if (corners.some((c) => Math.abs(c - y) > CUT) || ring.some((c) => Math.abs(c - y) > CUT + 0.5)) return null;
    const alongX = face === 'n' || face === 's';
    const [W, D] = alongX ? [rect[2] - rect[0], rect[3] - rect[1]] : [rect[3] - rect[1], rect[2] - rect[0]];
    // The drive's line along the front, in the frame
    const [ox, oz] = outOf(face);
    const du = (drive[1][0] - cx) * oz + (drive[1][1] - cz) * -ox;
    const big = kind === 'summit';
    const mw = Math.min(W - 5, big ? 13 : 9 + r() * 2.5);
    const hd = big ? 7.5 : D >= 16 ? 6 : 5;
    const front = big ? -6.5 : -4.6;
    const hc = Math.max(-W / 2 + 2.5 + mw / 2, Math.min(W / 2 - 2.5 - mw / 2, du * 0.4));
    const main: MPart = { u0: hc - mw / 2, u1: hc + mw / 2, v0: front, v1: front - hd, floors: 2, flat: kind === 'glass' };
    const parts: MPart[] = [main];
    const side = du > hc ? -1 : 1;
    if (kind === 'villa' || kind === 'compound' || kind === 'summit') {
      // A wing or a guest house to the side away from the drive
      const ww = 3.4;
      const u = side < 0 ? main.u0 - ww - (kind === 'villa' ? 0.02 : 1.2) : main.u1 + (kind === 'villa' ? 0.02 : 1.2);
      if (u > -W / 2 + 1.5 && u + ww < W / 2 - 1.5) parts.push({ u0: u, u1: u + ww, v0: front - 0.8, v1: front - hd + 0.8, floors: 1 });
    }
    if (kind === 'summit') parts.push({ u0: hc - 1.5, u1: hc + 1.5, v0: front - 1, v1: front - 4, floors: 3, flat: true });
    // The pool: a glass mansion's along the back edge, the others' in the garden behind
    const back = -D;
    const pl = Math.min(mw - 1, 8);
    const pv0 = front - hd - 0.7;
    const pool: [number, number, number, number] = kind === 'glass' ? [hc - pl / 2, back + 2.6, hc + pl / 2, back + 1.2] : [hc - pl / 2 + side * 0.5, pv0, hc + pl / 2 + side * 0.5, Math.max(back + 0.9, pv0 - 2.2)];
    if (pool[1] - pool[3] < 1.2) return null;
    return {
      id: `mansion-${out.length}`,
      kind,
      road: road.id,
      rect,
      y,
      face,
      W,
      D,
      drive,
      du,
      parts,
      court: [Math.min(du, hc) - 4, -1.5, Math.max(du, hc) + 4, front] as [number, number, number, number],
      pool,
      terraces: kind === 'villa' ? [[back, back - 2.2], [back - 2.2, back - 4.2]] : [],
      reach: kind === 'glass' ? 3 : 0,
      walled: kind === 'compound' || kind === 'summit',
      car: kind !== 'glass' || r() < 0.6,
    } satisfies Mansion;
  };

  // The cul-de-sacs' ends: the summit estate and a compound, the lane carrying on into each
  for (const [id, kind] of [
    ['crest-summit', 'summit'],
    ['crest-vista', 'compound'],
  ] as [string, MansionKind][]) {
    const road = HILL_ROADS.find((q) => q.id === id)!;
    const L = road.cum[road.cum.length - 1];
    const { p, u, n } = frameAt(road, L);
    // Straight on past the lane's end, or to either side of it: the first that sits on the hills without a quarry
    for (const dir of [u, n, [-n[0], -n[1]] as Pt]) {
      const face = faceOf([-dir[0], -dir[1]]);
      const [hw, hd] = kind === 'summit' ? [10.5, 9.5] : [9, 8];
      const half: Pt = face === 'e' || face === 'w' ? [hd, hw] : [hw, hd];
      const [ox, oz] = outOf(face);
      const depth = face === 'e' || face === 'w' ? half[0] : half[1];
      const gap = road.half + ROAD_CLEAR + PAD_EASE + 0.6;
      // (the pad's front past the lane's end, its ease clear of the lane, the drive the lane carried on)
      const c: Pt = [p[0] - ox * (gap + depth), p[1] - oz * (gap + depth)];
      const rect: Rect = [c[0] - half[0], c[1] - half[1], c[0] + half[0], c[1] + half[1]];
      if (!fits(rect)) continue;
      const m = make(kind, road, rect, roadY(road, L), face, [p, [p[0] - ox * gap, p[1] - oz * gap]]);
      if (!m) continue;
      out.push(m);
      break;
    }
  }
  // Along the roads, both sides
  const kinds: MansionKind[] = ['glass', 'villa', 'glass', 'villa', 'compound'];
  let k = 0;
  for (const road of HILL_ROADS) {
    const L = road.cum[road.cum.length - 1];
    for (let d = 18; d < L - 16; d += 5)
      for (const s of [1, -1])
        for (const [extra, big] of [[0, 1], [3, 1], [6, 1], [9, 1], [0, 0], [4, 0], [8, 0]] as [number, number][]) {
        const { p, u, n } = frameAt(road, d);
        if (natural(p[0], p[1]) < LOWER || p[1] > HILLS.foot.z - 12) continue;
        // (no drive where a lamp stands on the verge)
        const mouth: Pt = [p[0] + n[0] * s * (road.half + 0.3), p[1] + n[1] * s * (road.half + 0.3)];
        if (CREST_LAMPS.some(([x, z]) => Math.hypot(x - mouth[0], z - mouth[1]) < 3)) continue;
        const along = Math.abs(u[0]) > Math.abs(u[1]);
        // (a big pad, or a smaller one where it won't fit)
        const [a0, a1] = big ? [8, 7] : [6.8, 6.2];
        const [hx, hz] = along ? [a0, a1] : [a1, a0];
        const depth = hx * Math.abs(n[0]) + hz * Math.abs(n[1]);
        const off = road.half + ROAD_CLEAR + PAD_EASE + 0.6 + depth + extra;
        const c: Pt = [p[0] + n[0] * s * off, p[1] + n[1] * s * off];
        const rect: Rect = [c[0] - hx, c[1] - hz, c[0] + hx, c[1] + hz];
        if (!fits(rect)) continue;
        const face = faceOf([-n[0] * s, -n[1] * s]);
        const [ox, oz] = outOf(face);
        // (the drive straight out from the pad's front to the road, along the face's way)
        const edge: Pt = face === 'e' || face === 'w' ? [face === 'e' ? rect[2] : rect[0], Math.max(rect[1] + 3, Math.min(rect[3] - 3, mouth[1]))] : [Math.max(rect[0] + 3, Math.min(rect[2] - 3, mouth[0])), face === 's' ? rect[3] : rect[1]];
        // (from where that line meets the road's edge)
        let t = 0;
        while (t < 20 && !nearHillRoad(edge[0] + ox * t, edge[1] + oz * t, 0.3)) t += 0.25;
        if (t >= 20) continue;
        const kind = kinds[k % kinds.length];
        const start: Pt = [edge[0] + ox * t, edge[1] + oz * t];
        // (the road's height where the drive meets it)
        let j = 0;
        road.pts.forEach((q, i) => (Math.hypot(q[0] - start[0], q[1] - start[1]) < Math.hypot(road.pts[j][0] - start[0], road.pts[j][1] - start[1]) ? (j = i) : 0));
        const m = make(kind, road, rect, road.y[j], face, [start, edge]);
        if (!m) continue;
        k++;
        out.push(m);
        break;
      }
  }
  return out;
}
export const MANSIONS: Mansion[] = layout();

/** The ground held level under each pad (terrain.ts's `LEVELS`) */
export const MANSION_LEVELS = MANSIONS.map((m) => ({ rect: m.rect, y: m.y, ease: PAD_EASE }));

/* ---------- The mansion's frame ---------- */

/** Its front's middle (u 0, v 0) */
export function originOf(m: Mansion): Pt {
  const [x0, z0, x1, z1] = m.rect;
  return m.face === 'e' ? [x1, (z0 + z1) / 2] : m.face === 'w' ? [x0, (z0 + z1) / 2] : m.face === 's' ? [(x0 + x1) / 2, z1] : [(x0 + x1) / 2, z0];
}
/** A point in its frame, in the world (u along (oz, -ox), v along out) */
export function toWorld(m: Mansion, u: number, v: number): Pt {
  const [ox, oz] = outOf(m.face);
  const [cx, cz] = originOf(m);
  return [cx + oz * u + ox * v, cz - ox * u + oz * v];
}
export function rectToWorld(m: Mansion, u0: number, v0: number, u1: number, v1: number): Rect {
  const [a, b] = [toWorld(m, u0, v0), toWorld(m, u1, v1)];
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
}
/** A part's top over the pad, roof and all */
export const topOf = (p: MPart) => STOREY.ground + (p.floors - 1) * STOREY.upper + (p.flat ? 0.35 : 1.4);
/** The wall round a walled pad: its height and thickness, the gate's half gap */
export const WALL = { h: 1.5, t: 0.4, gate: 1.6 } as const;
/** The wall's runs in the frame (u0, v0, u1, v1): round the pad just inside its edges, the gate on the drive */
export function wallsOf(m: Mansion): [number, number, number, number][] {
  if (!m.walled) return [];
  const [W, D, i, t] = [m.W, m.D, 0.6, WALL.t];
  const [l, rr, f, b] = [-W / 2 + i, W / 2 - i, -i, -D + i];
  return [
    [l, f, m.du - WALL.gate, f - t],
    [m.du + WALL.gate, f, rr, f - t],
    [l, f - t, l + t, b + t],
    [rr - t, f - t, rr, b + t],
    [l, b + t, rr, b],
  ];
}

/* ---------- The cars, what's solid, and where the hills' planting keeps off ---------- */

const CAR_HALF = { l: 1.5, w: 0.6 };
/** [model, x, z, yaw, paint] on each forecourt, by the drive, facing out; and its pad's height */
export const MANSION_CARS: { y: number; car: [string, number, number, number, string] }[] = (() => {
  const r = rng(2727);
  const models = ['super', 'exec', 'super', 'suv', 'coupe'];
  const paints = ['#f3f2f7', '#14121f', '#d9a94a', '#c21d3a', '#1c3a5c', '#2b2d3a'];
  return MANSIONS.filter((m) => m.car).map((m) => {
    const [u0, v0, u1, v1] = m.court;
    const u = m.du + 2.6 < u1 - 0.8 ? m.du + 2.6 : m.du - 2.6;
    const v = (v0 + v1) / 2;
    const [x, z] = toWorld(m, Math.max(u0 + 0.8, u), v);
    const [ox, oz] = outOf(m.face);
    return { y: m.y, car: [models[Math.floor(r() * models.length)], x, z, Math.atan2(-oz, ox), paints[Math.floor(r() * paints.length)]] };
  });
})();

export const MANSION_SOLIDS: Box[] = MANSIONS.flatMap((m): Box[] => {
  const box = (u0: number, v0: number, u1: number, v1: number, top: number): Box => [...rectToWorld(m, u0, v0, u1, v1), m.y + top];
  const [pu0, pv0, pu1, pv1] = m.pool;
  return [
    ...m.parts.map((p) => box(p.u0, p.v0, p.u1, p.v1, topOf(p))),
    ...wallsOf(m).map(([u0, v0, u1, v1]) => box(u0, v0, u1, v1, WALL.h)),
    box(pu0, pv0, pu1, pv1, 0.3),
    // (a villa's terraces, each a step lower)
    ...m.terraces.map(([v0, v1], i) => box(-m.W / 2 + 1, v0, m.W / 2 - 1, v1, -0.9 * (i + 1))),
  ];
}).concat(
  MANSION_CARS.map(({ y, car: [, x, z, yaw] }): Box => {
    const along = Math.abs(Math.cos(yaw)) > 0.5;
    const [hx, hz] = along ? [CAR_HALF.l, CAR_HALF.w] : [CAR_HALF.w, CAR_HALF.l];
    return [x - hx, z - hz, x + hx, z + hz, y + 1.2];
  })
);
/** On a pad (with its ease, padded `m`) or its drive: the hills' oaks, scrub and palms keep off */
export function onMansion(x: number, z: number, m = 0) {
  for (const s of MANSIONS) {
    const e = PAD_EASE + m;
    if (x > s.rect[0] - e && x < s.rect[2] + e && z > s.rect[1] - e && z < s.rect[3] + e) return true;
    // (the villa's terraces and the glass mansion's cantilever stand past the pad's back)
    const [a, b] = s.drive;
    const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1)));
    if (Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t) < 1.8 + m) return true;
  }
  return false;
}
