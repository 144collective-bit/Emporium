/**
 * Sunridge's lots (docs/suburb-plan.md Phase 1; the houses on them are Phase 2's): DOM-free, kept out of the boot (the
 * drawing's chunk and the tests read it). Along every street front of every block (sunridge.ts `SUN_BLOCKS`' runs,
 * but the entrances': their corner lots face the loop), lots `LOT_W` wide and `LOT_D` deep (13 x 23 m), their sides
 * square to the street where it bends (fanned round a turning circle, closer at the back on the inside of a bend),
 * shallower where the land runs out (to `MIN_D`); the loop's first, then the cul-de-sacs', then Mesa Drive's, none
 * over another, the amenities' land (`ZONES`) or the footpath (`PATH`).
 */
import { LOT_D, PATH, SUN_BLOCKS, WALL, ZONES, distTo, inside, type Pt, type Rect } from './sunridge';
import { BUILT, baked } from './baked';

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
      // (where the street turns hard between the front's two ends, as round a turning circle into its stem, the
      // normals cross and so would the back's corners: a bow tie no house fits. Its corners the right way round, the
      // back running the way the front does: docs/suburb-plan.md Phase 6, Ocotillo Court's)
      if ((back[1][0] - back[0][0]) * (B.p[0] - A.p[0]) + (back[1][1] - back[0][1]) * (B.p[1] - A.p[1]) < 0) back.reverse();
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
/** The lots, laid when the site is built (baked.ts; scripts/bake.mjs: about half a second as the chunk loaded, a freeze on
 * screen as Sunridge came into reach), not on the visit */
/**
 * The lots laid after all the rest (docs/suburb-plan.md Phase 8, the owner's call: houses on the field east of the
 * school). The amenities' land is drawn as rough rectangles, and the school's reaches across the loop into the block
 * outside it, so no lot was laid along the loop's outer side there. Laid again here along every block's streets, kept
 * off only the amenities' land whose middle is in that block (and the footpath), round every lot laid before: their
 * ids follow on from the rest (`LATE_FROM`), so every lot before keeps its id, house, yard and residents.
 */
function late(placed: Lot[]): Lot[] {
  const out: Lot[] = [];
  for (const b of SUN_BLOCKS) {
    const own = ZONES.filter((z) => inside(b.poly, [(z.rect[0] + z.rect[2]) / 2, (z.rect[1] + z.rect[3]) / 2]));
    // (only a block another's amenity land reaches into)
    const foreign = ZONES.filter((z) => !own.includes(z) && b.poly.some((p) => p[0] > z.rect[0] - 6 && p[0] < z.rect[2] + 6 && p[1] > z.rect[1] - 6 && p[1] < z.rect[3] + 6));
    if (!foreign.length) continue;
    const keep = [...own.map((z) => rectPoly(z.rect)), rectPoly(PATH)];
    for (const r of b.runs.filter((q) => q.street && !q.street.startsWith('sun-entry'))) {
      const cum = [0];
      for (let i = 1; i < r.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
      const L = cum[cum.length - 1];
      for (let s0 = END; s0 + MIN_W < L - END; ) {
        const lot = fit(b, r.street!, r.pts, cum, s0, Math.min(LOT_W, L - END - s0), [...placed, ...out], keep);
        if (lot) {
          out.push({ ...lot, id: `sun-lot-${placed.length + out.length}` });
          s0 += Math.hypot(lot.front[1][0] - lot.front[0][0], lot.front[1][1] - lot.front[0][1]);
        } else s0 += 0.5;
      }
    }
  }
  return out;
}
/** How many lots were laid before the late ones: theirs are the ids from here on */
export const LATE_FROM = 101;
export const LOTS: Lot[] = baked('sun-lots', BUILT ? undefined : () => {
  const first = lay();
  return [...first, ...late(first)];
});


/* ---------- The gardens: each block's land divided among its lots (docs/suburb-plan.md Phase 8) ---------- */

/**
 * The land behind the lots divided among them as a subdivision's is (the owner: "move the fences to suit the wasted
 * space ... take full creative control and do what is needed to make it a realistic design and layout"): every bit of
 * a block goes to the row of the street it's nearest (so back-to-back rows meet on one rear fence along the block's
 * middle, and at a corner the two streets' rows meet on its diagonal), and in that row to the lot it lies behind,
 * square to the street (each lot's side fences straight back from the street, fanned round a curve as a pie-shaped
 * lot's are; a gap between two lots' fronts split down its middle). Kept off: the amenities' land in the lot's own
 * block (with a margin where the lot wasn't laid within it), the footpath, every other street's sidewalk, and the land's
 * edge nearer than the perimeter wall's line (a garden reaching it backs onto that wall); no deeper than `DEEP`. Each
 * lot's own ground is always its own. A garden's outline is traced by walking straight back from points along its
 * frontage until the land is another's (a few corners, its rear fence following the block's middle).
 */
export interface Garden {
  id: string;
  block: string;
  street: string;
  /** Its outline (world x, z): along its frontage, then round the back */
  outline: Pt[];
}
/** How deep a garden reaches from its street at most, how far it keeps from other streets' sidewalks and from the amenities' land */
export const DEEP = 30;
const STREET_CLEAR = 0.6;
const KEEP_CLEAR = 0.6;
/** How far past its first and last lot a row reaches along its street */
const ROW_REACH = 3;

/** A run's length along and the point and inward normal at a distance along it */
interface RunInfo {
  pts: Pt[];
  cum: number[];
  len: number;
  street: string;
  /** Its lots' fronts as distances along it, in order, and their index in `LOTS` */
  lots: { s0: number; s1: number; k: number }[];
}
function project(r: RunInfo, p: Pt) {
  let best = { d: Infinity, s: 0 };
  for (let i = 1; i < r.pts.length; i++) {
    const [a, c] = [r.pts[i - 1], r.pts[i]];
    const [dx, dz] = [c[0] - a[0], c[1] - a[1]];
    const ll = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / ll));
    const d = Math.hypot(a[0] + dx * t - p[0], a[1] + dz * t - p[1]);
    if (d < best.d) best = { d, s: r.cum[i - 1] + t * Math.sqrt(ll) };
  }
  return best;
}

function divide(): Garden[] {
  const blockOf = new Map(SUN_BLOCKS.map((b) => [b.id, b]));
  const pad = (r: Rect): Rect => [r[0] - KEEP_CLEAR, r[1] - KEEP_CLEAR, r[2] + KEEP_CLEAR, r[3] + KEEP_CLEAR];
  const inRect = (r: Rect, p: Pt) => p[0] > r[0] && p[0] < r[2] && p[1] > r[1] && p[1] < r[3];
  const lotPolys = LOTS.map((l) => outline(l));
  const lotBoxes = lotPolys.map((o) => box(o));
  // Each block's rows: its street runs that have lots, their lots in order along them
  const rows = new Map<string, RunInfo[]>();
  for (const b of SUN_BLOCKS) {
    const list: RunInfo[] = [];
    for (const r of b.runs) {
      if (!r.street) continue;
      const cum = [0];
      for (let i = 1; i < r.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
      const info: RunInfo = { pts: r.pts, cum, len: cum[cum.length - 1], street: r.street, lots: [] };
      LOTS.forEach((l, k) => {
        if (l.block !== b.id || l.street !== r.street) return;
        if (distTo(r.pts, l.front[0]) > 0.05 || distTo(r.pts, l.front[1]) > 0.05) return;
        const [a, c] = [project(info, l.front[0]).s, project(info, l.front[1]).s];
        info.lots.push({ s0: Math.min(a, c), s1: Math.max(a, c), k });
      });
      info.lots.sort((p, q) => p.s0 - q.s0);
      if (info.lots.length) list.push(info);
    }
    rows.set(b.id, list);
  }
  // What's kept off, a block at a time and a lot at a time
  const streetRuns = new Map(SUN_BLOCKS.map((b) => [b.id, b.runs.filter((r) => r.street).map((r) => r.pts)]));
  const landRuns = new Map(SUN_BLOCKS.map((b) => [b.id, b.runs.filter((r) => !r.street).map((r) => r.pts)]));
  const keepOf = LOTS.map((l) => {
    const b = blockOf.get(l.block)!;
    const own = ZONES.filter((z) => inside(b.poly, [(z.rect[0] + z.rect[2]) / 2, (z.rect[1] + z.rect[3]) / 2])).map((z) => z.rect);
    return [...own, PATH].map((r) => (overlap(outline(l), rectPoly(pad(r))) ? r : pad(r)));
  });
  /** Whose land a point is (an index in `LOTS`), or -1 */
  const owner = (bid: string, p: Pt): number => {
    const b = blockOf.get(bid)!;
    if (!inside(b.poly, p)) return -1;
    // (a lot's own ground is its own)
    for (let k = 0; k < LOTS.length; k++) {
      const q = lotBoxes[k];
      if (p[0] < q[0] || p[0] > q[2] || p[1] < q[1] || p[1] > q[3]) continue;
      if (inside(lotPolys[k], p)) return k;
    }
    if (landRuns.get(bid)!.some((r) => distTo(r, p) < WALL.in)) return -1;
    // The row of the nearest street with houses there (a row reaches only a little past its first and last lot: the
    // land beside a stretch of street with none goes to the rows behind it), and in it the lot it lies behind (a gap
    // between fronts split down its middle)
    let row: RunInfo | null = null;
    let at = { d: Infinity, s: 0 };
    for (const r of rows.get(bid)!) {
      const pr = project(r, p);
      if (pr.s < r.lots[0].s0 - ROW_REACH || pr.s > r.lots[r.lots.length - 1].s1 + ROW_REACH) continue;
      if (pr.d < at.d) [row, at] = [r, pr];
    }
    if (!row || at.d > DEEP) return -1;
    // (past the row's first and last lot, back from its own street's sidewalk too: no garden runs along a sidewalk)
    if ((at.s < row.lots[0].s0 || at.s > row.lots[row.lots.length - 1].s1) && at.d < STREET_CLEAR) return -1;
    // (other streets' sidewalks kept clear, the ones with no lots too)
    if (streetRuns.get(bid)!.some((r) => r !== row!.pts && distTo(r, p) < STREET_CLEAR)) return -1;
    const L = row.lots;
    let k = L[L.length - 1].k;
    for (let i = 0; i < L.length; i++) {
      const next = L[i + 1];
      if (!next || at.s < (L[i].s1 + next.s0) / 2) {
        k = L[i].k;
        break;
      }
    }
    // (within the row, the nearest of the lots around where it projects: land behind the inside of a bend is shared
    // out among the lots there, not all given to the one at the bend)
    let best = { k, d: Infinity };
    const j = L.findIndex((q) => q.k === k);
    for (let m = Math.max(0, j - 3); m <= Math.min(L.length - 1, j + 3); m++) {
      const q = L[m].k;
      const d = inside(lotPolys[q], p) ? 0 : distTo(lotPolys[q], p, true);
      if (d < best.d - 1e-9) best = { k: q, d };
    }
    k = best.k;
    if (keepOf[k].some((r) => inRect(r, p))) return -1;
    return k;
  };
  // Each block on a grid, every cell's owner; each lot's garden the outline round its cells (the piece holding its
  // own ground), smoothed into straight fence lines
  const out: Garden[] = LOTS.map((l) => ({ id: l.id, block: l.block, street: l.street, outline: outline(l) }));
  for (const b of SUN_BLOCKS) {
    const ks = LOTS.map((l, k) => (l.block === b.id ? k : -1)).filter((k) => k >= 0);
    if (!ks.length) continue;
    const [x0, z0, x1, z1] = box(b.poly);
    const W = Math.ceil((x1 - x0) / RES) + 3;
    const H = Math.ceil((z1 - z0) / RES) + 3;
    const ox = x0 - RES;
    const oz = z0 - RES;
    const cell = new Int32Array(W * H).fill(-1);
    for (let jz = 0; jz < H; jz++) for (let ix = 0; ix < W; ix++) cell[jz * W + ix] = owner(b.id, [ox + ix * RES, oz + jz * RES]);
    for (const k of ks) {
      // (the cells joined to its own ground: flood from its middle)
      const c = outline(LOTS[k]).reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
      const start = Math.round((c[1] - oz) / RES) * W + Math.round((c[0] - ox) / RES);
      if (cell[start] !== k) continue;
      const mine = new Uint8Array(W * H);
      const stack = [start];
      mine[start] = 1;
      while (stack.length) {
        const q = stack.pop()!;
        const ix = q % W;
        const jz = (q - ix) / W;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const [a, e] = [ix + dx, jz + dz];
          if (a < 0 || e < 0 || a >= W || e >= H) continue;
          const t = e * W + a;
          if (!mine[t] && cell[t] === k) {
            mine[t] = 1;
            stack.push(t);
          }
        }
      }
      const ring = contour(mine, W, H).map(([a, e]): Pt => [ox + a * RES, oz + e * RES]);
      if (ring.length < 4) continue;
      // (smoothed into fence lines; a corner the tracing left outside the block brought back onto its edge, a hair in)
      const smooth = holding(simplify(dp(ring, 0.3), 0.1), outline(LOTS[k])).map((q): Pt => (inside(b.poly, q) ? q : pullIn(b.poly, q)));
      out[k] = { id: LOTS[k].id, block: LOTS[k].block, street: LOTS[k].street, outline: smooth.map((q) => [+q[0].toFixed(3), +q[1].toFixed(3)] as Pt) };
    }
  }
  return out;
}
/** An outline with any of the given points the smoothing left outside it put back on it (at its nearest edge): a garden holds its whole lot */
function holding(ring: Pt[], pts: Pt[]): Pt[] {
  let out = ring;
  for (const p of pts) {
    if (inside(out, p) || distTo(out, p, true) < 0.05) continue;
    let [best, at] = [Infinity, 0];
    for (let i = 0; i < out.length; i++) {
      const d = distTo([out[i], out[(i + 1) % out.length]], p);
      if (d < best) [best, at] = [d, i];
    }
    out = [...out.slice(0, at + 1), p, ...out.slice(at + 1)];
  }
  return out;
}
/** A point outside an outline brought onto its nearest edge, a hair inside it */
function pullIn(poly: Pt[], p: Pt): Pt {
  let best = { d: Infinity, q: p, n: [0, 0] as Pt };
  for (let i = 0; i < poly.length; i++) {
    const [a, c] = [poly[i], poly[(i + 1) % poly.length]];
    const [dx, dz] = [c[0] - a[0], c[1] - a[1]];
    const ll = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / ll));
    const q: Pt = [a[0] + dx * t, a[1] + dz * t];
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < best.d) best = { d, q, n: [q[0] - p[0], q[1] - p[1]] };
  }
  const l = Math.hypot(best.n[0], best.n[1]) || 1;
  return [best.q[0] + (best.n[0] / l) * 0.04, best.q[1] + (best.n[1] / l) * 0.04];
}
/** The grid the blocks are divided on (a quarter of a tile) */
const RES = 0.25;
/**
 * The outline round the set cells of a grid (marching squares, through the cells' edges' middles), the longest ring:
 * grid coordinates
 */
function contour(m: Uint8Array, W: number, H: number): Pt[] {
  const at = (x: number, z: number) => (x >= 0 && z >= 0 && x < W && z < H ? m[z * W + x] : 0);
  // Segments between the middles of a square's sides, keyed by their ends
  const next = new Map<string, Pt>();
  const key = (p: Pt) => `${p[0]},${p[1]}`;
  for (let z = -1; z < H; z++)
    for (let x = -1; x < W; x++) {
      const [a, b, c, d] = [at(x, z), at(x + 1, z), at(x + 1, z + 1), at(x, z + 1)];
      const code = a * 8 + b * 4 + c * 2 + d;
      if (code === 0 || code === 15) continue;
      const T: Pt = [x + 0.5, z];
      const R: Pt = [x + 1, z + 0.5];
      const B: Pt = [x + 0.5, z + 1];
      const L: Pt = [x, z + 0.5];
      // (each edge with the set side on its left, so the rings run one way round)
      const table: Record<number, [Pt, Pt][]> = {
        1: [[B, L]], 2: [[R, B]], 3: [[R, L]], 4: [[T, R]], 5: [[T, L], [B, R]], 6: [[T, B]], 7: [[T, L]],
        8: [[L, T]], 9: [[B, T]], 10: [[L, B], [R, T]], 11: [[R, T]], 12: [[L, R]], 13: [[B, R]], 14: [[L, B]],
      };
      const segs = table[code];
      for (const [p, q] of segs) next.set(key(p), q);
    }
  let best: Pt[] = [];
  const used = new Set<string>();
  for (const [k0, q0] of next) {
    if (used.has(k0)) continue;
    const ring: Pt[] = [];
    let k = k0;
    let q: Pt | undefined = q0;
    while (q && !used.has(k)) {
      used.add(k);
      ring.push(q);
      k = key(q);
      q = next.get(k);
    }
    if (ring.length > best.length) best = ring;
  }
  return best;
}
/** A closed outline simplified (Douglas-Peucker, split at its two furthest points) */
function dp(o: Pt[], tol: number): Pt[] {
  const run = (pts: Pt[]): Pt[] => {
    if (pts.length < 3) return pts;
    let [far, at] = [0, 0];
    for (let i = 1; i < pts.length - 1; i++) {
      const d = distTo([pts[0], pts[pts.length - 1]], pts[i]);
      if (d > far) [far, at] = [d, i];
    }
    if (far <= tol) return [pts[0], pts[pts.length - 1]];
    return [...run(pts.slice(0, at + 1)).slice(0, -1), ...run(pts.slice(at))];
  };
  const i0 = 0;
  let i1 = 0;
  let far = 0;
  for (let i = 0; i < o.length; i++) {
    const d = Math.hypot(o[i][0] - o[0][0], o[i][1] - o[0][1]);
    if (d > far) [far, i1] = [d, i];
  }
  const a = run(o.slice(i0, i1 + 1));
  const b = run([...o.slice(i1), o[i0]]);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}
/** A closed outline with the points that hardly bend it left out (within `tol` of the line past them) */
function simplify(o: Pt[], tol: number): Pt[] {
  let pts = o;
  for (let changed = true; changed && pts.length > 4; ) {
    changed = false;
    for (let i = 0; i < pts.length && pts.length > 4; i++) {
      const [a, p, c] = [pts[(i + pts.length - 1) % pts.length], pts[i], pts[(i + 1) % pts.length]];
      // (and a spike: the outline turning back on itself at a point)
      const [ux, uz, vx, vz] = [a[0] - p[0], a[1] - p[1], c[0] - p[0], c[1] - p[1]];
      const spike = (ux * vx + uz * vz) / ((Math.hypot(ux, uz) * Math.hypot(vx, vz)) || 1) > Math.cos((25 * Math.PI) / 180);
      if (distTo([a, c], p) < tol || spike) {
        pts = pts.filter((_, j) => j !== i);
        changed = true;
      }
    }
  }
  return pts;
}
const box = (o: Pt[]): Rect => [Math.min(...o.map((p) => p[0])), Math.min(...o.map((p) => p[1])), Math.max(...o.map((p) => p[0])), Math.max(...o.map((p) => p[1]))];
/** The gardens: each lot's share of its block (baked with the lots) */
export const GARDENS: Garden[] = baked('sun-gardens', BUILT ? undefined : divide);
