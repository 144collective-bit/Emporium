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

export const HOUSES: House[] = (() => {
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
          // (an end house's back corner kept off a side street's sidewalk)
          foot.every((q) => SOUTH_STREETS.every((st) => distTo(st.pts, q, st.loop) - st.half - 0.8 > 0.4)) &&
          FOOTPATHS.every((f) => foot.every((q) => distTo(f.pts, q) > PATH_HALF + 0.4)) &&
          !plots.some((o) => overlaps(shrink(plot, 0.15), o)) &&
          // (and no house in another, at a bend's back corners: each pulled a tenth in towards its middle)
          !feet.some((o) => overlaps(shrink(foot, 0.1), o));
        // (a ginnel through a long row: a house's gap)
        if (fits && inRow >= TERRACE.most) {
          inRow = 0;
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
  }
  return out;
})();

/* ---------- The back alleys and ginnels ---------- */

/** A house's back: the line its rear yard ends on (where the alley runs) */
export const backOf = (h: House): [Pt, Pt] => {
  const p = plotOf(h);
  return [p[2], p[3]];
};
