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
export const LOTS: Lot[] = baked('sun-lots', BUILT ? undefined : lay);


/* ---------- The gardens grown into the land behind (docs/suburb-plan.md Phase 8) ---------- */

/**
 * Each lot's garden grown into the land the lots left behind them (the owner: "move the fences to suit the wasted
 * space"): the same front (so the house, its frame and its yard's front don't move), its back corners pushed deeper
 * along its sides and spread out along its back, a little at a time and every lot in turn, as long as the garden stays
 * convex, inside its block, back from every street's sidewalk, off the club's, park's and school's land and the
 * footpath, out of every other garden, and no nearer the land's edge than the perimeter wall's line (a garden that
 * reaches it backs onto that wall). Back-to-back gardens meet on one line, pie-shaped ones fill the wedges between
 * them. The houses read `LOTS`; the yards and their walls these (sunyards.ts).
 */
export const GROW = { deep: 26, spread: 16, front: 10 } as const;
/** How far a garden keeps back from a street's sidewalk (its own street's but at its front) */
const STREET_CLEAR = 0.6;

const segCross = (a: Pt, b: Pt, c: Pt, d: Pt) => {
  const o = (p: Pt, q: Pt, r: Pt) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
};
/** Twice the signed area of an outline */
const signed = (o: Pt[]) => o.reduce((t, p, i) => t + p[0] * o[(i + 1) % o.length][1] - o[(i + 1) % o.length][0] * p[1], 0);
/** Is an outline convex, wound the given way */
function convex(o: Pt[], sign: number) {
  for (let i = 0; i < o.length; i++) {
    const [a, b, c] = [o[i], o[(i + 1) % o.length], o[(i + 2) % o.length]];
    if (((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) * sign < -1e-9) return false;
  }
  return true;
}

/** How far a garden keeps off the club's, park's and school's land and the footpath (their lamps and fences stand at their edges) */
const KEEP_CLEAR = 0.6;
function grow(): Lot[] {
  const lots: Lot[] = LOTS.map((l) => ({ ...l, back: [[...l.back[0]], [...l.back[1]]] as [Pt, Pt] }));
  const pad = (r: Rect): Rect => [r[0] - KEEP_CLEAR, r[1] - KEEP_CLEAR, r[2] + KEEP_CLEAR, r[3] + KEEP_CLEAR];
  // (each lot's: the land kept off with its margin, or without it where the lot was laid within the margin already)
  const raw = [...ZONES.map((z) => z.rect), PATH];
  const keepOf = LOTS.map((l) => raw.map((r) => (overlap(outline(l), rectPoly(pad(r))) ? rectPoly(r) : rectPoly(pad(r)))));
  const blockOf = new Map(SUN_BLOCKS.map((b) => [b.id, b]));
  const landOf = new Map(SUN_BLOCKS.map((b) => [b.id, b.runs.filter((r) => !r.street).map((r) => r.pts)]));
  const streetsOf = new Map(SUN_BLOCKS.map((b) => [b.id, b.runs.filter((r) => r.street).map((r) => r.pts)]));
  const boxes = lots.map((l) => box(outline(l)));
  const sideDir = LOTS.map((l) => [0, 1].map((i) => {
    const [f, b] = [l.front[i], l.back[i]];
    const d = Math.hypot(b[0] - f[0], b[1] - f[1]) || 1;
    return [(b[0] - f[0]) / d, (b[1] - f[1]) / d] as Pt;
  }));
  const used = lots.map(() => ({ deep: [0, 0], spread: [0, 0], front: [0, 0] }));
  // (each front corner's place along its street's run: it slides along the sidewalk's edge, keeping off the run's ends)
  const runOf = LOTS.map((l) => {
    const b = blockOf.get(l.block)!;
    const r = b.runs.find((q) => q.street === l.street && distTo(q.pts, l.front[0]) < 0.05 && distTo(q.pts, l.front[1]) < 0.05)!;
    const cum = [0];
    for (let i = 1; i < r.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
    const sOf = (p: Pt) => {
      let best = { d: Infinity, s: 0 };
      for (let i = 1; i < r.pts.length; i++) {
        const [a, c] = [r.pts[i - 1], r.pts[i]];
        const [dx, dz] = [c[0] - a[0], c[1] - a[1]];
        const ll = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / ll));
        const d = Math.hypot(a[0] + dx * t - p[0], a[1] + dz * t - p[1]);
        if (d < best.d) best = { d, s: cum[i - 1] + t * Math.sqrt(ll) };
      }
      return best.s;
    };
    return { pts: r.pts, cum, s: [sOf(l.front[0]), sOf(l.front[1])], len: cum[cum.length - 1] };
  });
  const sign = LOTS.map((l) => Math.sign(signed(outline(l))));
  const ok = (k: number, cand: Lot) => {
    const o = outline(cand);
    if (!convex(o, sign[k])) return false;
    const b = blockOf.get(cand.block)!;
    const [f0, b0, b1, f1] = o;
    // (its sides and back inside the block: their corners and middles in it, no edge of the block across them)
    // (a front moved along its street: its middle on the block, the whole of its lot still in it, so the house, the
    // driveway and the yard's front stay inside the garden)
    const frontMoved = cand.front.some((p, i) => Math.hypot(p[0] - LOTS[k].front[i][0], p[1] - LOTS[k].front[i][1]) > 1e-9);
    const pts: Pt[] = [b0, b1, mid(b0, b1), mid(f0, b0), mid(f1, b1), ...(frontMoved ? [mid(f0, f1)] : [])];
    if (!pts.every((p) => inside(b.poly, p))) return false;
    if (frontMoved && !outline(LOTS[k]).every((p) => inside(o, p) || distTo(o, p, true) < 0.02)) return false;
    // (the sides from a little in from the front: the front's corners are on the block's edge)
    const inFrom = (a: Pt, c: Pt): Pt => {
      const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
      return [a[0] + ((c[0] - a[0]) / l) * 0.3, a[1] + ((c[1] - a[1]) / l) * 0.3];
    };
    for (const [p, q] of [[inFrom(f0, b0), b0], [b0, b1], [b1, inFrom(f1, b1)], ...(frontMoved ? [[inFrom(f0, f1), inFrom(f1, f0)]] : [])] as [Pt, Pt][])
      for (let i = 0; i < b.poly.length; i++) if (segCross(p, q, b.poly[i], b.poly[(i + 1) % b.poly.length])) return false;
    // (no nearer the land's edge than the wall's line; back from the streets' sidewalks: or, where a lot was laid
    // nearer than that, no nearer than it was)
    const was = outline(lots[k]);
    const back: [Pt, Pt][] = [
      [b0, was[1]],
      [b1, was[2]],
      [mid(b0, b1), mid(was[1], was[2])],
    ];
    const keeps = (runs: Pt[][], clear: number) => runs.every((r) => back.every(([p, q]) => distTo(r, p) >= clear - 1e-6 || distTo(r, p) >= distTo(r, q) - 1e-6));
    if (!keeps(landOf.get(cand.block)!, WALL.in) || !keeps(streetsOf.get(cand.block)!, STREET_CLEAR)) return false;
    // (off the amenities' land and the footpath, out of every other garden)
    if (keepOf[k].some((z) => overlap(o, z))) return false;
    const bx = box(o);
    for (let j = 0; j < lots.length; j++) {
      if (j === k) continue;
      const q = boxes[j];
      if (q[0] > bx[2] || q[2] < bx[0] || q[1] > bx[3] || q[3] < bx[1]) continue;
      if (overlap(o, outline(lots[j]))) return false;
    }
    return true;
  };
  for (const step of [0.4, 0.1, 0.03])
    for (let moved = true; moved; ) {
      moved = false;
      for (let k = 0; k < lots.length; k++) {
        const l = lots[k];
        const tries: { i: 0 | 1; kind: 'deep' | 'spread' | 'front' }[] = [
          { i: 0, kind: 'deep' },
          { i: 1, kind: 'deep' },
          { i: 0, kind: 'spread' },
          { i: 1, kind: 'spread' },
          { i: 0, kind: 'front' },
          { i: 1, kind: 'front' },
        ];
        for (const { i, kind } of tries) {
          if (used[k][kind][i] + step > GROW[kind] + 1e-9) continue;
          if (kind === 'front') {
            // (the front corner along the run, away from the other: the first back, the second on)
            const R = runOf[k];
            const sNew = R.s[i] + (i === 0 ? -1 : 1) * (used[k].front[i] + step);
            if (sNew < END || sNew > R.len - END) continue;
            const front = [...l.front] as [Pt, Pt];
            front[i] = along(R.pts, R.cum, sNew).p;
            const cand = { ...l, front };
            if (!ok(k, cand)) continue;
            lots[k] = cand;
            boxes[k] = box(outline(cand));
            used[k].front[i] += step;
            moved = true;
            continue;
          }
          const p = l.back[i];
          const other = l.back[1 - i];
          let d: Pt;
          if (kind === 'deep') d = sideDir[k][i];
          else {
            const len = Math.hypot(p[0] - other[0], p[1] - other[1]) || 1;
            d = [(p[0] - other[0]) / len, (p[1] - other[1]) / len];
          }
          const back = [...l.back] as [Pt, Pt];
          back[i] = [p[0] + d[0] * step, p[1] + d[1] * step];
          const cand = { ...l, back };
          if (!ok(k, cand)) continue;
          lots[k] = cand;
          boxes[k] = box(outline(cand));
          used[k][kind][i] += step;
          moved = true;
        }
      }
    }
  const r4 = (p: Pt): Pt => [+p[0].toFixed(4), +p[1].toFixed(4)];
  return lots.map((l) => ({ ...l, front: l.front.map(r4) as [Pt, Pt], back: l.back.map(r4) as [Pt, Pt] }));
}
const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const box = (o: Pt[]): Rect => [Math.min(...o.map((p) => p[0])), Math.min(...o.map((p) => p[1])), Math.max(...o.map((p) => p[0])), Math.max(...o.map((p) => p[1]))];
/** The gardens: each lot's front and its back grown (baked with the lots) */
export const GARDENS: Lot[] = baked('sun-gardens', BUILT ? undefined : grow);
