/**
 * Sunridge's lots (docs/suburb-plan.md Phase 1; the houses on them are Phase 2's): DOM-free, kept out of the boot (the
 * drawing's chunk and the tests read it). Along every street front of every block (sunridge.ts `SUN_BLOCKS`' runs,
 * but the entrances': their corner lots face the loop), lots `LOT_W` wide and `LOT_D` deep (13 x 23 m), their sides
 * square to the street where it bends (fanned round a turning circle, closer at the back on the inside of a bend),
 * shallower where the land runs out (to `MIN_D`); the loop's first, then the cul-de-sacs', then Mesa Drive's, none
 * over another, the amenities' land (`ZONES`) or the footpath (`PATH`).
 */
import { LOT_D, PATH, SUN_BLOCKS, ZONES, distTo, inside, type Pt, type Rect } from './sunridge';

/** A lot's width along the street (about 12.6 m), and the shallowest a lot may be */
export const LOT_W = 6.6;
export const MIN_D = 10.5;
/** How far a lot keeps from a run's ends (the corners) */
const END = 1.2;

export interface Lot {
  id: string;
  block: string;
  street: string;
  /** Its corners: the front's two along the street, then the back's (back of the first, back of the second) */
  front: [Pt, Pt];
  back: [Pt, Pt];
  depth: number;
}

const ORDER = (s: string) => (s === 'sun-court-2' ? 0 : s.startsWith('sun-court') ? 2 : s === 'sun-mesa' ? 3 : 1);

/** Do two convex outlines overlap (more than touching) */
function overlap(a: Pt[], b: Pt[]) {
  for (const poly of [a, b])
    for (let i = 0; i < poly.length; i++) {
      const [p, q] = [poly[i], poly[(i + 1) % poly.length]];
      const [nx, nz] = [-(q[1] - p[1]), q[0] - p[0]];
      const span = (s: Pt[]) => s.map(([x, z]) => x * nx + z * nz);
      const [sa, sb] = [span(a), span(b)];
      const l = Math.hypot(nx, nz) || 1;
      if (Math.max(...sa) <= Math.min(...sb) + 0.05 * l || Math.max(...sb) <= Math.min(...sa) + 0.05 * l) return false;
    }
  return true;
}
const rectPoly = (r: Rect): Pt[] => [
  [r[0], r[1]],
  [r[0], r[3]],
  [r[2], r[3]],
  [r[2], r[1]],
];
export const outline = (l: Lot): Pt[] => [l.front[0], l.back[0], l.back[1], l.front[1]];

/** A run's point and its direction at a distance along it */
function along(pts: Pt[], cum: number[], d: number): { p: Pt; u: Pt } {
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const [a, b] = [pts[i - 1], pts[i]];
  const l = cum[i] - cum[i - 1] || 1;
  const f = Math.max(0, Math.min(1, (d - cum[i - 1]) / l));
  return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], u: [(b[0] - a[0]) / l, (b[1] - a[1]) / l] };
}

/** The narrowest a lot's front may be (round a turning circle), and the widest its back */
export const MIN_W = 4.6;
const BACK_MOST = LOT_W * 2.5;
const BACK_LEAST = 4.4;
/** How far a lot's back may swing sideways off its front's middle (round the end of a turning circle's stem) */
const SKEW = 2.2;

/** A lot from `s0` along a run, `w` wide (narrower if its back would fan out too wide), if one fits there */
function fit(b: (typeof SUN_BLOCKS)[number], street: string, pts: Pt[], cum: number[], s0: number, w: number, placed: Lot[], keep: Pt[][]): Omit<Lot, 'id'> | null {
  const inner = (p: Pt) => inside(b.poly, p) && distTo(b.poly, p, true) > 0.1;
  for (const depth of [LOT_D, 12, 11, MIN_D])
    for (let ww = w; ww >= MIN_W - 1e-9; ww -= 0.6) {
      const [A, B] = [along(pts, cum, s0), along(pts, cum, s0 + ww)];
      // (the block's inside is left of the way its edge runs)
      const [n0, n1]: Pt[] = [
        [A.u[1], -A.u[0]],
        [B.u[1], -B.u[0]],
      ];
      const back: [Pt, Pt] = [
        [A.p[0] + n0[0] * depth, A.p[1] + n0[1] * depth],
        [B.p[0] + n1[0] * depth, B.p[1] + n1[1] * depth],
      ];
      const bw = Math.hypot(back[1][0] - back[0][0], back[1][1] - back[0][1]);
      if (bw > BACK_MOST) continue;
      // (nor narrowing to nothing at the back, on the inside of a tight bend: no house would fit)
      if (bw < BACK_LEAST) break;
      {
        const [ux, uz] = [(B.p[0] - A.p[0]) / ww, (B.p[1] - A.p[1]) / ww];
        const mb: Pt = [(back[0][0] + back[1][0]) / 2 - (A.p[0] + B.p[0]) / 2, (back[0][1] + back[1][1]) / 2 - (A.p[1] + B.p[1]) / 2];
        if (Math.abs(mb[0] * ux + mb[1] * uz) > SKEW) continue;
      }
      const lot = { block: b.id, street, front: [A.p, B.p] as [Pt, Pt], back, depth };
      const o = outline({ ...lot, id: '' });
      const mid: Pt = [(back[0][0] + back[1][0]) / 2, (back[0][1] + back[1][1]) / 2];
      // (its back corners pulled in a hair: they may lie on the land's edge)
      const backIn = back.map((p): Pt => [p[0] + (mid[0] - p[0]) * 0.02 + (A.p[0] - p[0]) * 0.01, p[1] + (mid[1] - p[1]) * 0.02 + (A.p[1] - p[1]) * 0.01]);
      // (narrower only where its back fans out too wide: a lot on a straight keeps its width)
      if (![...backIn, mid].every(inner) || placed.some((q) => overlap(o, outline(q))) || keep.some((z) => overlap(o, z))) break;
      return lot;
    }
  return null;
}

function lay(): Lot[] {
  const out: Lot[] = [];
  const keep = [...ZONES.map((z) => rectPoly(z.rect)), rectPoly(PATH)];
  const runs = SUN_BLOCKS.flatMap((b) => b.runs.filter((r) => r.street && !r.street.startsWith('sun-entry')).map((r) => ({ b, r, street: r.street! })));
  runs.sort((p, q) => ORDER(p.street) - ORDER(q.street));
  for (const { b, r, street } of runs) {
    const cum = [0];
    for (let i = 1; i < r.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
    const L = cum[cum.length - 1];
    // Greedy along the run: a lot wherever one fits, narrower at the front where the street bends round (a turning
    // circle's pie-shaped lots), sliding on a little where none does
    for (let s0 = END; s0 + MIN_W < L - END; ) {
      const lot = fit(b, street, r.pts, cum, s0, Math.min(LOT_W, L - END - s0), out, keep);
      if (lot) {
        out.push({ ...lot, id: `sun-lot-${out.length}` });
        s0 += Math.hypot(lot.front[1][0] - lot.front[0][0], lot.front[1][1] - lot.front[0][1]);
      } else s0 += 0.5;
    }
  }
  return out;
}
export const LOTS: Lot[] = lay();
