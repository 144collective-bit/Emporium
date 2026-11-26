/*
 * Aldwyn's Green's back gardens (the improvement loop's J6, R3's garden rule): behind each terraced house its rear yard
 * closed as a plot, the side fences meeting the house's back corners and the back wall at the yard's end, a patio
 * against the house's back wall, a shed in a back corner of about one in three. Drawing-only data (village3d.ts, the
 * village's lazy chunk), DOM-free and kept out of the boot; tested in tests/southgardens.test.ts. Not solid, as the back
 * walls along the alleys weren't.
 *
 * A fence a pair of neighbours share is drawn once, by the house it's the left side of (looking at its front), as long
 * as the deeper of the two yards; a row's last house draws its right side too.
 */
import { ALLEYS, HOUSES, TERRACE, houseFoot, type House } from './southterraces';
import { inside, seeded } from './streetfaces';

type Pt = [number, number];

export const GARDEN = {
  /** A fence's height and thickness, the back wall's height */
  fenceH: 0.9,
  fenceT: 0.06,
  wallH: 1.0,
  /** The patio's depth from the house's back wall */
  patio: 0.8,
  /** A shed: across, deep, to its eaves; the least yard it goes in */
  shed: { w: 0.8, d: 0.7, h: 1.0 },
  shedYard: 1.7,
} as const;

export interface Garden {
  house: string;
  /** The yard: the house's back wall left and right, then the yard's end right and left */
  yard: Pt[];
  /** Its depth, back wall to the yard's end */
  rear: number;
  /** The fences this house draws (a from the house's back wall, c at the yard's end) */
  fences: [Pt, Pt][];
  /** The wall along the yard's end, left to right */
  back: [Pt, Pt];
  patio: Pt[];
  /** The shed's footprint, its door facing the house */
  shed: Pt[] | null;
}

const lerp = (a: Pt, c: Pt, f: number): Pt => [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f];
const near = (a: Pt, c: Pt) => Math.hypot(a[0] - c[0], a[1] - c[1]) < 0.3;

const rearOf = (h: House) => ALLEYS.find((q) => q.house === h.id)?.rear ?? TERRACE.rear;
const backOf = (h: House) => {
  const f = houseFoot(h);
  return { l: f[3], r: f[2] };
};

export const GARDENS: Garden[] = (() => {
  const backs = HOUSES.map(backOf);
  const rears = HOUSES.map(rearOf);
  const feet = HOUSES.map((h) => houseFoot(h));
  const rnd = seeded(20261126);
  return HOUSES.map((h, i) => {
    const [nx, nz] = h.face;
    const [tx, tz] = [-nz, nx];
    const rear = rears[i];
    const { l, r } = backs[i];
    const out = (p: Pt, d: number): Pt => [p[0] - nx * d, p[1] - nz * d];
    const yard: Pt[] = [l, r, out(r, rear), out(l, rear)];
    // (the neighbour to its left: its right back corner on this house's left; to its right likewise)
    const left = HOUSES.findIndex((o, j) => j !== i && o.block === h.block && near(backs[j].r, l));
    const right = HOUSES.findIndex((o, j) => j !== i && o.block === h.block && near(backs[j].l, r));
    const fences: [Pt, Pt][] = [[l, out(l, Math.max(rear, left >= 0 ? rears[left] : 0))]];
    if (right < 0) fences.push([r, out(r, rear)]);
    const t = GARDEN.fenceT;
    // (the patio: off the fences by their thickness)
    const pl: Pt = [l[0] + tx * t, l[1] + tz * t];
    const pr: Pt = [r[0] - tx * t, r[1] - tz * t];
    const patio: Pt[] = [pl, pr, out(pr, GARDEN.patio), out(pl, GARDEN.patio)];
    let shed: Pt[] | null = null;
    const roll = rnd();
    const side = rnd() < 0.5 ? 0 : 1;
    if (roll < 1 / 3 && rear >= GARDEN.shedYard) {
      const { w, d } = GARDEN.shed;
      const k = 0.08;
      const s0 = side === 0 ? t + k : h.w - t - k - w;
      const a = lerp(l, r, s0 / h.w);
      const c = lerp(l, r, (s0 + w) / h.w);
      const s: Pt[] = [out(a, rear - k - d), out(c, rear - k - d), out(c, rear - k), out(a, rear - k)];
      // (where rows back onto each other at a bend, kept out of the houses there)
      if (!feet.some((f) => s.some((p) => inside(f, p)) || f.some((p) => inside(s, p)))) shed = s;
    }
    return { house: h.id, yard, rear, fences, back: [out(l, rear), out(r, rear)], patio, shed };
  });
})();
