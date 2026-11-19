/*
 * Aldwyn's Green's terraces (docs/south-plan.md Phase 3, step 3a; the owner's photo and calls, 2026-11-16): rows of
 * two-storey red-brick houses along the village's streets, each with a two-storey white bay, a slate roof, a chimney on
 * every other party wall, a dormer on about one in four, a small front yard behind a low wall; a few painted fronts,
 * some yellow brick, the odd pebble-dashed house. Behind each row its rear yards and a back alley; a ginnel through
 * every long row. Also the rows across Gate Lane from Degen's gates (the owner's first ask). DOM-free, tested in
 * tests/southterraces.test.ts; drawn in 3a's second half.
 *
 * Laid block by block (south.ts `SOUTH_BLOCKS`): along each of a block's kerb runs (but the High Road's, whose
 * frontage is 3c's shops), a house at a time, its front a yard back from the sidewalk, kept where it fits in the block,
 * clear of the footpaths, the churchyard and the houses already laid.
 */
import { CHURCHYARD, COMPOUND_GATES, FOOTPATHS, PATH_HALF, SOUTH_BLOCKS, SOUTH_STREETS, type Pt } from './south';
import { distTo, inside, seeded } from './streetfaces';
import { southLift } from './southground';
import { BUILT, baked } from './baked';
import { cover, type Box } from './southblocks';
import { CHURCH_PATH, PATH_W } from './aldwyns';
import { SHOPS, shopFoot } from './highroad';

/** Degen's gates' middle (endsfar.ts `GATES`: on Gate Lane, its plot's east edge) */
const GATE_AT: Pt = [COMPOUND_GATES.x, (COMPOUND_GATES.z0 + COMPOUND_GATES.z1) / 2];

/* ---------- The measures (the city's terrace kit's scale, kits.ts: a storey 1, the ground floor 1.25) ---------- */

export const TERRACE = {
  /** A house's frontage, least and most */
  w: [2.6, 3.0] as const,
  /** Its depth front to back (the main house), its front yard, its rear yard */
  depth: 4.6,
  yard: 1.2,
  rear: 2.4,
  /** The back alley's width, a ginnel's (a gap through the row) */
  alley: 1.6,
  ginnel: 1.4,
  /** Its eaves over its slab (ground floor 1.25, the first floor 1), its ridge over the eaves */
  eaves: 2.3,
  ridge: 1.0,
  /** The bay: how far it stands out into the yard, how wide */
  bayOut: 0.55,
  bayW: 1.5,
  /** A row runs this many houses at most before a ginnel cuts through it */
  most: 12,
};

export type Front = 'red' | 'yellow' | 'painted' | 'pebbledash';
export interface House {
  id: string;
  /** Its front's middle (on its front wall's line), the way it faces (its front's outward normal, x, z), its frontage */
  at: Pt;
  face: Pt;
  w: number;
  /** The street it fronts, and its block */
  street: string;
  block: string;
  front: Front;
  /** Its paint (painted fronts) or door colour, a dormer, a chimney on its left party wall */
  paint: string;
  door: string;
  dormer: boolean;
  chimney: boolean;
  /** Which of its rooms are lit at night (a bit each: ground bay, ground door side, first bay, first other) */
  lit: number;
  /** Where its row ends: a gable to its left (looking at its front), to its right */
  endL: boolean;
  endR: boolean;
  /** Its ground floor's level (its slab over the highest ground under it), and the lowest ground under it (its plinth
   * goes down to there) */
  base: number;
  low: number;
}
/** A ginnel: a gap through a long row, from the street to the alley behind */
export interface Ginnel {
  at: Pt;
  face: Pt;
  w: number;
  block: string;
}

const PAINTS = ['#e9d9b8', '#cfe0d8', '#e8c9c3', '#f2ecd9', '#c9d4e8', '#e7dfa6'];
const DOORS = ['#1f3a5f', '#2f6a3c', '#7a1f2b', '#2b2d3a', '#d6a12a', '#2c9a92'];

/* ---------- Laying the rows ---------- */

/** A house's footprint (the main house, front wall to back wall) */
export function houseFoot(h: Pick<House, 'at' | 'face' | 'w'>, depth = TERRACE.depth): Pt[] {
  const [nx, nz] = h.face;
  const [tx, tz] = [-nz, nx];
  const [x, z] = h.at;
  const w = h.w / 2;
  return [
    [x - tx * w, z - tz * w],
    [x + tx * w, z + tz * w],
    [x + tx * w - nx * depth, z + tz * w - nz * depth],
    [x - tx * w - nx * depth, z - tz * w - nz * depth],
  ];
}
/** Its whole plot: from the sidewalk (its yard in front) to the end of its rear yard */
export const plotOf = (h: Pick<House, 'at' | 'face' | 'w'>): Pt[] => {
  const f = houseFoot({ ...h, at: [h.at[0] + h.face[0] * TERRACE.yard, h.at[1] + h.face[1] * TERRACE.yard] }, TERRACE.yard + TERRACE.depth + TERRACE.rear);
  return f;
};
const overlaps = (a: Pt[], b: Pt[]) => a.some((p) => inside(b, p)) || b.some((p) => inside(a, p));
/** A ring pulled in towards its middle (so neighbours that touch don't count as overlapping) */
const shrink = (r: Pt[], k: number): Pt[] => {
  const c: Pt = [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];
  return r.map((p) => [p[0] + (c[0] - p[0]) * k, p[1] + (c[1] - p[1]) * k]);
};
/** Which blocks get rows, and along which of their runs: all the village's (but the High Road's frontage), and across
 * Gate Lane from Degen's gates only that frontage (the council's block there: its closes are 3d's) */
const GATE_NEAR = 34;
const gateRun = (r: { street?: string; pts: Pt[] }) =>
  r.street === COMPOUND_GATES.on && r.pts.length > 1 && r.pts.every((p) => p[0] > GATE_AT[0]) && r.pts.some((p) => Math.hypot(p[0] - GATE_AT[0], p[1] - GATE_AT[1]) < GATE_NEAR);
const terraced = SOUTH_BLOCKS.filter((b) => b.zone === 'village' || (b.zone === 'council' && b.runs.some(gateRun)));
const runsOf = (b: (typeof SOUTH_BLOCKS)[number]) => (b.zone === 'village' ? b.runs : b.runs.filter(gateRun));
/** The streets whose frontage isn't the terraces' (the High Road's shops, 3c) */
const NOT_TERRACED = new Set(['south-high']);

/** The block's slab (world.ts `SLAB`) */
const SLAB = 0.15;
/** Every house laid, and the ginnels left through long rows (worked out when the site is built: baked.ts) */
function layTerraces(): { houses: House[]; ginnels: Ginnel[] } {
  const GINNEL_LIST: Ginnel[] = [];
  const houses = (() => {
  const r = seeded(16112026);
  const out: House[] = [];
  const plots: Pt[][] = [];
  const feet: Pt[][] = [];
  for (const b of terraced) {
    for (const run of runsOf(b)) {
      if (!run.street || NOT_TERRACED.has(run.street) || run.pts.length < 2) continue;
      // Along the run, a house at a time
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
      let d = 1.2;
      let inRow = 0;
      while (d < L - 1.2) {
        const w = TERRACE.w[0] + r() * (TERRACE.w[1] - TERRACE.w[0]);
        const { p, t } = at(d + w / 2);
        // (not round a tight curve, a turning circle's: a row there would fan out, house by house)
        const [t0, t1] = [at(d).t, at(d + w).t];
        const bend = Math.acos(Math.max(-1, Math.min(1, t0[0] * t1[0] + t0[1] * t1[1])));
        // (the face: square to the kerb, out of the block)
        let n: Pt = [-t[1], t[0]];
        const probe: Pt = [p[0] - n[0] * 2, p[1] - n[1] * 2];
        if (!inside(b.poly, probe)) n = [-n[0], -n[1]];
        const front: Pt = [p[0] - n[0] * TERRACE.yard, p[1] - n[1] * TERRACE.yard];
        const h = { at: front, face: n, w };
        const plot = plotOf(h);
        const foot = houseFoot(h);
        const fits =
          bend < 0.3 &&
          shrink(plot, 0.06).every((q) => inside(b.poly, q)) &&
          !foot.some((q) => inside(CHURCHYARD, q)) &&
          // (a gap for the path up to St Aldwyn's, aldwyns.ts)
          plot.every((q) => distTo(CHURCH_PATH, q) > PATH_W / 2 + 0.4) &&
          distTo(plot, CHURCH_PATH[0], true) > PATH_W / 2 + 0.4 &&
          !inside(plot, [(CHURCH_PATH[0][0] + CHURCH_PATH[1][0]) / 2, Math.min(CHURCH_PATH[0][1] + 3, CHURCH_PATH[1][1])]) &&
          // (an end house's back corner kept off a side street's sidewalk)
          foot.every((q) => SOUTH_STREETS.every((st) => distTo(st.pts, q, st.loop) - st.half - 0.8 > 0.4)) &&
          FOOTPATHS.every((f) => foot.every((q) => distTo(f.pts, q) > PATH_HALF + 0.4)) &&
          !plots.some((o) => overlaps(shrink(plot, 0.15), o)) &&
          // (the High Road's buildings first, highroad.ts: a house's plot keeps out of theirs)
          !SHOPS.some((sh) => overlaps(shrink(plot, 0.1), shopFoot(sh))) &&
          // (and no house in another, at a bend's back corners: each pulled a tenth in towards its middle)
          !feet.some((o) => overlaps(shrink(foot, 0.1), o) || overlaps(foot, shrink(o, 0.1)));
        // (a ginnel through a long row: a house's gap)
        if (fits && inRow >= TERRACE.most) {
          inRow = 0;
          const g = at(d + TERRACE.ginnel / 2);
          GINNEL_LIST.push({ at: [g.p[0] - n[0] * TERRACE.yard, g.p[1] - n[1] * TERRACE.yard], face: n, w: TERRACE.ginnel, block: b.id });
          d += TERRACE.ginnel;
          continue;
        }
        if (!fits) {
          inRow = 0;
          d += 0.6;
          continue;
        }
        plots.push(shrink(plot, 0.02));
        feet.push(foot);
        const roll = r();
        const kind: Front = roll < 0.75 ? 'red' : roll < 0.85 ? 'yellow' : roll < 0.95 ? 'painted' : 'pebbledash';
        out.push({
          id: `house-${out.length}`,
          at: front,
          face: n,
          w,
          street: run.street,
          block: b.id,
          front: kind,
          paint: PAINTS[Math.floor(r() * PAINTS.length)],
          door: DOORS[Math.floor(r() * DOORS.length)],
          dormer: r() < 0.25,
          chimney: out.length % 2 === 0,
          lit: Math.floor(r() * 16),
          endL: false,
          endR: false,
          base: 0,
          low: 0,
        });
        inRow++;
        d += w;
      }
    }
  }
  // Where each row ends: no neighbour against its side
  for (const h of out) {
    const [tx, tz] = [-h.face[1], h.face[0]];
    const side = (s: number) => [h.at[0] + tx * s * (h.w / 2 + 0.3) - h.face[0] * 2, h.at[1] + tz * s * (h.w / 2 + 0.3) - h.face[1] * 2] as Pt;
    const has = (q: Pt) => out.some((o) => o !== h && inside(houseFoot(o), q));
    h.endL = !has(side(-1));
    h.endR = !has(side(1));
    const lifts = houseFoot(h).map((q) => southLift(q[0], q[1]));
    h.base = SLAB + Math.max(...lifts);
    h.low = SLAB + Math.min(...lifts);
  }
  return out;
  })();
  return { houses, ginnels: GINNEL_LIST };
}
const LAID = baked('terraces', BUILT ? undefined : layTerraces);
export const HOUSES: House[] = LAID.houses;

/* ---------- The back alleys and ginnels ---------- */

/** A house's back: the line its rear yard ends on (where the alley runs) */
export const backOf = (h: House): [Pt, Pt] => {
  const p = plotOf(h);
  return [p[2], p[3]];
};
export const GINNELS: Ginnel[] = LAID.ginnels;

/**
 * A strip behind a house's rear yard, the alley's width: kept where it's in the block and in no one else's plot; where
 * rows back onto each other close, the alley takes some of the rear yard (`rear`: how deep the yard is left)
 */
/** Each house's reach (its plot and its foot together, in a box): another's alley can only meet it within it */
const REACH = HOUSES.map((o) => {
  const pts = [...plotOf(o), ...houseFoot(o)];
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
});
export const ALLEYS: { house: string; poly: Pt[]; rear: number }[] = HOUSES.flatMap((h) => {
  const [a0, c0] = backOf(h);
  const [nx, nz] = h.face;
  const w = TERRACE.alley;
  const b = SOUTH_BLOCKS.find((q) => q.id === h.block)!;
  for (const into of [0, 0.8, 1.4]) {
    const [a, c]: Pt[] = [[a0[0] + nx * into, a0[1] + nz * into], [c0[0] + nx * into, c0[1] + nz * into]];
    const poly: Pt[] = [a, c, [c[0] - nx * w, c[1] - nz * w], [a[0] - nx * w, a[1] - nz * w]];
    const ok =
      shrink(poly, 0.1).every((q) => inside(b.poly, q)) &&
      !HOUSES.some((o, i) => {
        if (o === h) return false;
        // (a box clear of its reach can't meet it: shrinking keeps an outline in its box)
        const r = REACH[i];
        if (poly.every((p) => p[0] < r[0]) || poly.every((p) => p[0] > r[2]) || poly.every((p) => p[1] < r[1]) || poly.every((p) => p[1] > r[3])) return false;
        return overlaps(shrink(poly, 0.15), shrink(plotOf(o), 0.05)) || overlaps(poly, houseFoot(o));
      });
    if (ok) return [{ house: h.id, poly, rear: TERRACE.rear - into }];
  }
  return [];
});

/* ---------- The front walls, the solids ---------- */

/** Where the door is along the front (from the middle, along t): the bay to the other side */
export const DOOR_U = 0.75;
export const GATE_W = 0.8;
/** A house's front wall (a low brick wall along its yard's front, at the sidewalk), in two runs either side of its gate */
export function frontWalls(h: House): [Pt, Pt][] {
  const [nx, nz] = h.face;
  const [tx, tz] = [-nz, nx];
  // (a little in from the sidewalk's edge: clear of the lamps along it)
  const f: Pt = [h.at[0] + nx * (TERRACE.yard - 0.4), h.at[1] + nz * (TERRACE.yard - 0.4)];
  const p = (u: number): Pt => [f[0] + tx * u, f[1] + tz * u];
  const [g0, g1] = [DOOR_U - GATE_W / 2, DOOR_U + GATE_W / 2];
  return [
    [p(-h.w / 2), p(g0)],
    [p(g1), p(h.w / 2)],
  ];
}
export const WALL_H = 0.32;
/** The houses (their tops over their bases: not lifted again) and their front walls (on the ground: lifted, solids.ts) */
export const TERRACE_SOLIDS: Box[] = HOUSES.flatMap((h) => cover(houseFoot(h), h.base + TERRACE.eaves + TERRACE.ridge, 0.6));
export const TERRACE_GROUND_SOLIDS: Box[] = HOUSES.flatMap((h) =>
  frontWalls(h).flatMap(([a, c]) => {
    // (in short pieces, so a slanting wall's boxes don't fill the yard behind it)
    const n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 0.5));
    return Array.from({ length: n }, (_, i): Box => {
      const [p, q] = [i / n, (i + 1) / n].map((f): Pt => [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f]);
      return [Math.min(p[0], q[0]) - 0.07, Math.min(p[1], q[1]) - 0.07, Math.max(p[0], q[0]) + 0.07, Math.max(p[1], q[1]) + 0.07, WALL_H];
    });
  })
);
/** Where the terraces stand, all of them (districts.ts loads their drawing within reach of it) */
export const TERRACES_RECT: [number, number, number, number] = (() => {
  const pts = HOUSES.flatMap((h) => plotOf(h));
  return [Math.min(...pts.map((p) => p[0])) - 4, Math.min(...pts.map((p) => p[1])) - 4, Math.max(...pts.map((p) => p[0])) + 4, Math.max(...pts.map((p) => p[1])) + 4];
})();
