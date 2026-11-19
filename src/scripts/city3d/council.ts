/*
 * The council rows, the bungalows, the allotments, the corner shops and the community centre (docs/south-plan.md
 * Phase 3, step 3d; the owner's calls, 2026-11-17). DOM-free, tested in tests/council.test.ts; drawn by council3d.ts in
 * the village's chunk.
 *
 * - **The council rows** on the council land north of the High Road: 1950s semis (pairs, and a short row of four now
 *   and then), pale brick or render, hipped roofs, front gardens behind hedges, some porches, some pebble-dash.
 * - **The bungalows** on the land round Degen's compound towards the fields: detached, low hipped roofs, a garage,
 *   a lawn, a caravan on a drive here and there (never in the compound's plot).
 * - **The allotments** on the brook's north bank west of the village: plots in rows, sheds, a path, a fence and gate.
 * - **Corner shops** at a few junctions; **the derelict community centre** on a corner of the council estate.
 *
 * Laid like the terraces (southterraces.ts), along each block's kerb runs, a lot at a time where it fits: in its
 * block (every point of its edges), off the footpaths, clear of the High Road's buildings, the terraces' plots,
 * Degen's compound and what's already laid.
 */
import { BROOK, COMPOUND, FOOTPATHS, PATH_HALF, SOUTH_BLOCKS, SOUTH_STREETS, zoneAt, type Pt, type Zone } from './south';
import { distTo, inside, seeded, shift } from './streetfaces';
import { southLift } from './southground';
import { BLOCKS, CORES, COURTS, cover, type Box } from './southblocks';
import { SHOPS, shopFoot } from './highroad';
import { HOUSES, plotOf } from './southterraces';
import { BUILT, baked } from './baked';

const SLAB = 0.15;

/* ---------- Laying lots along the streets ---------- */

/** A lot laid along a street: its front's middle (the building's front wall), the way it faces, its frontage */
export interface Lot {
  id: string;
  at: Pt;
  face: Pt;
  w: number;
  street: string;
  block: string;
  /** Its ground floor's level (its slab over the highest ground under it), the lowest ground under it */
  base: number;
  low: number;
}
/** A lot's footprint: from `front` before its front wall (its garden) to `back` behind it */
export function lotRing(l: Pick<Lot, 'at' | 'face' | 'w'>, front: number, back: number, wPad = 0): Pt[] {
  const [nx, nz] = l.face;
  const [tx, tz] = [-nz, nx];
  const w = l.w / 2 + wPad;
  const [x, z] = l.at;
  return [
    [x - tx * w + nx * front, z - tz * w + nz * front],
    [x + tx * w + nx * front, z + tz * w + nz * front],
    [x + tx * w - nx * back, z + tz * w - nz * back],
    [x - tx * w - nx * back, z - tz * w - nz * back],
  ];
}
const edgePoints = (r: Pt[]): Pt[] =>
  r.flatMap((a, i) => {
    const c = r[(i + 1) % r.length];
    const n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 0.5));
    return Array.from({ length: n }, (_, k): Pt => [a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n]);
  });
const overlaps = (a: Pt[], b: Pt[]) => a.some((p) => inside(b, p)) || b.some((p) => inside(a, p));
const shrink = (r: Pt[], k: number): Pt[] => {
  const c: Pt = [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];
  return r.map((p) => [p[0] + (c[0] - p[0]) * k, p[1] + (c[1] - p[1]) * k]);
};
const rect = (r: [number, number, number, number]): Pt[] => [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];

/** What's taken before 3d lays anything: the High Road's buildings, the terraces' plots, Degen's compound (with room) */
const TAKEN: Pt[][] = [
  ...SHOPS.map((s) => shopFoot(s)),
  ...HOUSES.map((h) => plotOf(h)),
  rect([COMPOUND[0] - 4, COMPOUND[1] - 4, COMPOUND[2] + 4, COMPOUND[3] + 4]),
  // (the estate's blocks, their cores and courts: the Rampart's west end stands on the council land's edge)
  ...BLOCKS.map((b) => b.foot),
  ...CORES.map((c) => c.foot),
  ...COURTS.map((c) => c.poly),
];

interface Spec {
  zones: Zone[];
  /** Its frontage (least, most), its garden in front, its depth (the house) and the plot's depth behind */
  w: [number, number];
  front: number;
  depth: number;
  rear: number;
  /** The gap left after it (between pairs, between bungalows) */
  gap: number;
  seed: number;
  prefix: string;
  /** How sharp a bend a lot may stand on (radians over its frontage) */
  bend?: number;
}
/** Lay lots of a spec along every run of every block in its zones, where each fits */
function lay(spec: Spec, taken: Pt[][]): Lot[] {
  const r = seeded(spec.seed);
  const out: Lot[] = [];
  for (const b of SOUTH_BLOCKS) {
    for (const run of b.runs) {
      if (!run.street || run.street === 'south-high' || run.pts.length < 2) continue;
      const pts = run.pts;
      const segs = pts.slice(1).map((q, i) => ({ a: pts[i], b: q, l: Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]) }));
      const L = segs.reduce((s, g) => s + g.l, 0);
      const at = (d: number) => {
        let left = d;
        for (const g of segs) {
          if (left <= g.l || g === segs[segs.length - 1]) {
            const t = g.l ? Math.min(1, left / g.l) : 0;
            return { p: [g.a[0] + (g.b[0] - g.a[0]) * t, g.a[1] + (g.b[1] - g.a[1]) * t] as Pt, t: [(g.b[0] - g.a[0]) / (g.l || 1), (g.b[1] - g.a[1]) / (g.l || 1)] as Pt };
          }
          left -= g.l;
        }
        return { p: pts[0], t: [1, 0] as Pt };
      };
      let d = 1.5;
      while (d < L - 1.5) {
        const w = spec.w[0] + r() * (spec.w[1] - spec.w[0]);
        const { p, t } = at(d + w / 2);
        const [t0, t1] = [at(d).t, at(d + w).t];
        const bend = Math.acos(Math.max(-1, Math.min(1, t0[0] * t1[0] + t0[1] * t1[1])));
        let n: Pt = [-t[1], t[0]];
        if (!inside(b.poly, [p[0] - n[0] * 2, p[1] - n[1] * 2])) n = [-n[0], -n[1]];
        const front: Pt = [p[0] - n[0] * spec.front, p[1] - n[1] * spec.front];
        const lot = { at: front, face: n, w };
        const plot = lotRing(lot, spec.front - 0.05, spec.depth + spec.rear);
        const foot = lotRing(lot, 0, spec.depth);
        const fits =
          bend < (spec.bend ?? 0.45) &&
          spec.zones.includes(zoneAt(front[0], front[1])) &&
          edgePoints(shrink(plot, 0.04)).every((q) => inside(b.poly, q)) &&
          FOOTPATHS.every((f) => foot.every((q) => distTo(f.pts, q) > PATH_HALF + 0.4)) &&
          foot.every((q) => SOUTH_STREETS.every((st) => distTo(st.pts, q, st.loop) - st.half - 0.8 > 0.4)) &&
          !taken.some((o) => overlaps(shrink(plot, 0.08), o) || overlaps(plot, shrink(o, 0.08)));
        if (!fits) {
          d += 0.6;
          continue;
        }
        taken.push(shrink(plot, 0.02));
        const lifts = foot.map((q) => southLift(q[0], q[1]));
        out.push({ id: `${spec.prefix}-${out.length}`, at: front, face: n, w, street: run.street, block: b.id, base: SLAB + Math.max(...lifts), low: SLAB + Math.min(...lifts) });
        d += w + spec.gap;
      }
    }
  }
  return out;
}

/* ---------- The council rows: semis ---------- */

export const SEMI = { w: [6.4, 7] as [number, number], front: 2.2, depth: 4.6, rear: 3.4, gap: 1.4, eaves: 2.2, roof: 1.3 };
export type Finish = 'brick' | 'render' | 'pebbledash';
export interface Semi extends Lot {
  /** A pair (two homes) or a row of four (`four`, twice the frontage) */
  four: boolean;
  finish: Finish;
  porch: [boolean, boolean];
  doors: [string, string];
  lit: number;
}
const DOORS = ['#1f3a5f', '#2f6a3c', '#7a1f2b', '#f3f2f7', '#d6a12a', '#2c9a92'];

/* ---------- Corner shops and the community centre ---------- */

export interface CornerShop extends Lot {
  name: string;
  colour: string;
}
const CORNER_NAMES: [string, string][] = [
  ['Daily Needs', '#2f6a3c'],
  ['Corner Dairy', '#1f3a5f'],
  ['Hilltop News', '#7a1f2b'],
];
export const CORNER = { w: [5.2, 5.6] as [number, number], front: 0.3, depth: 6, rear: 2, gap: 0, storeys: 2 };
export const CENTRE = { w: [12, 12] as [number, number], front: 2.5, depth: 7, rear: 1.5, eaves: 3 };

/* ---------- The bungalows ---------- */

export const BUNGALOW = { w: [7.6, 8.4] as [number, number], front: 2.4, depth: 5, rear: 2.6, gap: 1, eaves: 1.9, roof: 1.2, house: 5.4, garage: 2.6 };
export interface Bungalow extends Lot {
  /** Its garage to its left or right (looking at its front), a caravan on its drive */
  garageLeft: boolean;
  caravan: boolean;
  finish: Finish;
  door: string;
  lit: number;
}

/* ---------- All of it laid, in turn (worked out when the site is built: baked.ts) ---------- */

/**
 * The corner shops (a shop on a corner: the first lots that fit, apart), the derelict community centre (the first plot
 * on the council land that fits), the semis on the council land, the bungalows round the compound: each laid where
 * the ones before it left room
 */
function layCouncil(): { corner: CornerShop[]; centre: Lot | null; semis: Semi[]; bungalows: Bungalow[] } {
  const taken = [...TAKEN];
  const all = lay({ zones: ['council', 'village'], w: CORNER.w, front: CORNER.front, depth: CORNER.depth, rear: CORNER.rear, gap: 40, seed: 1990, prefix: 'corner', bend: 0.6 }, taken.map((t) => t));
  const picked: Lot[] = [];
  for (const l of all) if (picked.every((p) => Math.hypot(p.at[0] - l.at[0], p.at[1] - l.at[1]) > 60) && picked.length < CORNER_NAMES.length) picked.push(l);
  const corner = picked.map((l, i) => ({ ...l, name: CORNER_NAMES[i][0], colour: CORNER_NAMES[i][1] }));
  for (const c of corner) taken.push(lotRing(c, CORNER.front, CORNER.depth + CORNER.rear));
  const centre = lay({ zones: ['council'], w: CENTRE.w, front: CENTRE.front, depth: CENTRE.depth, rear: CENTRE.rear, gap: 999, seed: 1971, prefix: 'centre', bend: 0.25 }, [...taken])[0] ?? null;
  if (centre) taken.push(lotRing(centre, CENTRE.front, CENTRE.depth + CENTRE.rear));
  const rs = seeded(1951);
  const semis = lay({ zones: ['council'], w: SEMI.w, front: SEMI.front, depth: SEMI.depth, rear: SEMI.rear, gap: SEMI.gap, seed: 1952, prefix: 'semi', bend: 0.75 }, taken).map((l): Semi => {
    const f = rs();
    return {
      ...l,
      four: false,
      finish: f < 0.55 ? 'brick' : f < 0.85 ? 'render' : 'pebbledash',
      porch: [rs() < 0.5, rs() < 0.5],
      doors: [DOORS[Math.floor(rs() * DOORS.length)], DOORS[Math.floor(rs() * DOORS.length)]],
      lit: Math.floor(rs() * 16),
    };
  });
  const rb = seeded(1966);
  const bungalows = lay({ zones: ['bungalow'], w: BUNGALOW.w, front: BUNGALOW.front, depth: BUNGALOW.depth, rear: BUNGALOW.rear, gap: BUNGALOW.gap, seed: 1967, prefix: 'bungalow', bend: 0.9 }, taken).map((l): Bungalow => ({
    ...l,
    garageLeft: rb() < 0.5,
    caravan: rb() < 0.15,
    finish: rb() < 0.6 ? 'brick' : 'render',
    door: DOORS[Math.floor(rb() * DOORS.length)],
    lit: Math.floor(rb() * 8),
  }));
  return { corner, centre, semis, bungalows };
}
const LAID = baked('council', BUILT ? undefined : layCouncil);
export const CORNER_SHOPS: CornerShop[] = LAID.corner;
export const COMMUNITY_CENTRE: Lot | null = LAID.centre;
export const SEMIS: Semi[] = LAID.semis;
export const BUNGALOWS: Bungalow[] = LAID.bungalows;

/* ---------- The allotments ---------- */

/** The allotments' ground: a strip along the brook's north bank west of the village, between `X` */
const X: [number, number] = [-352, -306];
export const ALLOTMENTS: Pt[] = (() => {
  const line = BROOK.filter((p) => p[0] >= X[0] && p[0] <= X[1]);
  const [near, far] = [shift(line, 0), shift(line, 0)].map((l, k) => l.map((p, i): Pt => {
    // (north of the brook: its bank first, then the plots; the brook runs west to east, its left the north)
    const q = line[Math.min(i + 1, line.length - 1)];
    const o = line[Math.max(i - 1, 0)];
    const t: Pt = [q[0] - o[0], q[1] - o[1]];
    const l2 = Math.hypot(t[0], t[1]) || 1;
    const n: Pt = [t[1] / l2, -t[0] / l2];
    const d = k ? 15 : 3.5;
    return [p[0] + n[0] * d, p[1] + n[1] * d];
  }));
  return [...near, ...far.reverse()];
})();
/** The plots: in rows across the strip, each a bed of soil with a path round it; a shed on about one in three */
export interface Plot {
  ring: Pt[];
  shed: Pt | null;
  rot: number;
}
export const PLOTS: Plot[] = (() => {
  const r = seeded(1919);
  const out: Plot[] = [];
  // (along the brook by distance: its points are closer together than a plot is long)
  const raw = BROOK.filter((p) => p[0] >= X[0] && p[0] <= X[1]);
  const line: Pt[] = [raw[0]];
  for (const p of raw) if (Math.hypot(p[0] - line[line.length - 1][0], p[1] - line[line.length - 1][1]) >= 6.8) line.push(p);
  for (let i = 0; i + 1 < line.length; i++) {
    const [a, c] = [line[i], line[i + 1]];
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const t: Pt = [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
    const n: Pt = [t[1], -t[0]];
    for (let s = 0.4; s + 3 < l; s += 3.4)
      for (const [o0, o1] of [[4.2, 8.8], [9.6, 14.2]]) {
        const p = (u: number, v: number): Pt => [a[0] + t[0] * u + n[0] * v, a[1] + t[1] * u + n[1] * v];
        const ring = [p(s, o0), p(s + 3, o0), p(s + 3, o1), p(s, o1)];
        if (!ring.every((q) => inside(ALLOTMENTS, q))) continue;
        out.push({ ring, shed: r() < 0.33 ? p(s + 1.5, o1 - 0.8) : null, rot: Math.atan2(t[1], t[0]) });
      }
  }
  return out;
})();
/** The allotments' gate: on the side nearest the village's streets (its west end's middle... its east end's middle) */
export const ALLOTMENT_GATE: Pt = (() => {
  const n = ALLOTMENTS.length / 2;
  const [a, b] = [ALLOTMENTS[n - 1], ALLOTMENTS[n]];
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
})();

/* ---------- Solids ---------- */

/** Their buildings (tops over their bases: not lifted again) */
export const COUNCIL_SOLIDS: Box[] = [
  ...SEMIS.flatMap((s) => cover(lotRing(s, 0, SEMI.depth), s.base + SEMI.eaves + SEMI.roof, 0.4)),
  ...BUNGALOWS.flatMap((s) => cover(lotRing(s, 0, BUNGALOW.depth), s.base + BUNGALOW.eaves + BUNGALOW.roof, 0.4)),
  ...CORNER_SHOPS.flatMap((s) => cover(lotRing(s, 0, CORNER.depth), s.base + 2.6, 0.4)),
  ...(COMMUNITY_CENTRE ? cover(lotRing(COMMUNITY_CENTRE, 0, CENTRE.depth), COMMUNITY_CENTRE.base + CENTRE.eaves, 0.4) : []),
];
/** The allotments' sheds (on the ground: lifted with it, solids.ts) */
export const ALLOTMENT_SOLIDS: Box[] = PLOTS.filter((p) => p.shed).map((p): Box => [p.shed![0] - 0.7, p.shed![1] - 0.6, p.shed![0] + 0.7, p.shed![1] + 0.6, 1.6]);
/** Where it all stands (the village's chunk covers it) */
export const COUNCIL_RECT: [number, number, number, number] = (() => {
  const pts = [...SEMIS.flatMap((s) => lotRing(s, SEMI.front, SEMI.depth + SEMI.rear)), ...BUNGALOWS.flatMap((s) => lotRing(s, BUNGALOW.front, BUNGALOW.depth + BUNGALOW.rear)), ...ALLOTMENTS];
  return [Math.min(...pts.map((p) => p[0])) - 4, Math.min(...pts.map((p) => p[1])) - 4, Math.max(...pts.map((p) => p[0])) + 4, Math.max(...pts.map((p) => p[1])) + 4];
})();
