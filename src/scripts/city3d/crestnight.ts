/**
 * Crestmont by night (docs/crestmont-plan.md, the premium upgrade's Phase 1; the owner's call, 2026-11-19:
 * "Glamorous": most windows lit, bright turquoise pools, festoon lights everywhere, the landmarks strongly floodlit,
 * all under the bloom's threshold). DOM-free, the rules only: which windows are lit and how, where the festoon strings
 * run and where their bulbs hang, where the lights under a pool's water sit. Drawn by estates3d.ts, mansions3d.ts,
 * crestgardens3d.ts and crestsites3d.ts; tested in tests/crestnight.test.ts.
 */
type Pt = [number, number];
export type V3 = [number, number, number];

/** A window's light at night: a warm room, a softer one further in, or dark */
export type Glow = 'warm' | 'soft' | 'dark';
/** The shares of windows lit warm and soft (the rest dark); phones light fewer (the owner's call: "fewer lit windows") */
export const WINDOW_SHARE = { warm: 0.58, soft: 0.24 } as const;
export const WINDOW_SHARE_LOW = { warm: 0.42, soft: 0.2 } as const;

/** A number in [0, 1) from a string and a place, the same every time (FNV-1a, then mixed) */
export function hash01(seed: string, x: number, y: number, z: number): number {
  let h = 2166136261;
  const s = `${seed}|${Math.round(x * 20)}|${Math.round(y * 20)}|${Math.round(z * 20)}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** How a window at (x, y, z) on the house `seed` is lit at night */
export function windowGlow(seed: string, x: number, y: number, z: number, low: boolean): Glow {
  const share = low ? WINDOW_SHARE_LOW : WINDOW_SHARE;
  const r = hash01(seed, x, y, z);
  return r < share.warm ? 'warm' : r < share.warm + share.soft ? 'soft' : 'dark';
}

/** Festoon lights: the height their ends hang at over the ground (its sag still over a parasol's top), the sag in the middle, a bulb every `step` (phones `stepLow`), the longest run */
export const FESTOON = { h: 2.65, sag: 0.25, step: 0.42, stepLow: 0.84, run: 9, bulb: 0.036 } as const;

/** The bulbs of a string hung from `a` to `b`, sagging `sag` in its middle (a parabola), one every `step` or so, its ends kept off the hooks */
export function festoon(a: V3, b: V3, sag: number = FESTOON.sag, step: number = FESTOON.step): V3[] {
  const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const n = Math.max(2, Math.round(L / step));
  const out: V3[] = [];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 4 * sag * t * (1 - t), a[2] + (b[2] - a[2]) * t]);
  }
  return out;
}

/**
 * The runs strung between a garden's lamps (crestgardens.ts: the pair at the pool deck's back corners, the pair at the
 * forecourt's, the pair at a drive's mouth): each lamp to its nearest partner level with it (the same `v` in the
 * garden's frame, within `level`), none longer than `FESTOON.run`, none twice; a lamp on its own has none
 */
export function pairRuns(posts: Pt[], run: number = FESTOON.run, level = 0.3): [number, number][] {
  const out: [number, number][] = [];
  const used = new Set<number>();
  posts.forEach((p, i) => {
    if (used.has(i)) return;
    let best = -1;
    let bd = Infinity;
    posts.forEach((q, j) => {
      if (j === i || used.has(j) || Math.abs(q[1] - p[1]) > level) return;
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d < bd && d <= run) [best, bd] = [j, d];
    });
    if (best < 0) return;
    used.add(i).add(best);
    out.push([i, best]);
  });
  return out;
}

/** The lights under a pool's water: along both its longer sides, `IN` in from the wall, about every `step` */
export const POOL_LIGHTS = { in: 0.2, step: 2.2, r: 0.07 } as const;
export function poolLights(u0: number, v0: number, u1: number, v1: number, step: number = POOL_LIGHTS.step): Pt[] {
  const [a0, a1, b0, b1] = [Math.min(u0, u1), Math.max(u0, u1), Math.min(v0, v1), Math.max(v0, v1)];
  const alongU = a1 - a0 >= b1 - b0;
  const [lo, hi] = alongU ? [a0, a1] : [b0, b1];
  const sides = alongU ? [b0 + POOL_LIGHTS.in, b1 - POOL_LIGHTS.in] : [a0 + POOL_LIGHTS.in, a1 - POOL_LIGHTS.in];
  const n = Math.max(1, Math.round((hi - lo) / step));
  const out: Pt[] = [];
  for (const s of sides)
    for (let i = 0; i < n; i++) {
      const t = lo + ((i + 0.5) * (hi - lo)) / n;
      out.push(alongU ? [t, s] : [s, t]);
    }
  return out;
}

/** The landmarks' uplights along a facade: one every `step` along a wall from `a` to `b`, kept `end` off its corners */
export const UPLIGHT = { step: 2.6, end: 0.8, out: 0.35 } as const;
export function alongWall(a: Pt, b: Pt, step: number = UPLIGHT.step, end: number = UPLIGHT.end): Pt[] {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (L < 2 * end) return [];
  const n = Math.max(1, Math.floor((L - 2 * end) / step) + 1);
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : (end + (i * (L - 2 * end)) / (n - 1)) / L;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}
