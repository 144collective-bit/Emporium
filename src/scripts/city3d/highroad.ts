/*
 * The High Road's places (docs/south-plan.md Phase 3, step 3c; the owner's calls, 2026-11-17): both sides of the High
 * Road, from the Circus west to Degen's gates, patchy as high roads are: Endswood Parade (a 60s parade, two storeys),
 * Victorian rows of three storeys with shops under flats (Rosa's Café among them), the Brook & Lantern on the corner of
 * Bell Street (two storeys under a big gable), a gap site behind a hoarding, Kestrel Fuel, Aldwyn's Green Bus Garage
 * (Victorian brick), the underground station's building (Phase 4e: its stairs down to the line, southline.ts), Sparkle Hand Wash by Degen's gates,
 * and the boarded Duke of Endswood on the estate's edge. Made-up names only, no numbers on any sign. The big four (the
 * pub, the café, the petrol station, the bus garage) are places (endsplaces.ts). DOM-free, tested in
 * tests/highroad.test.ts; drawn by village3d.ts.
 */
import { SOUTH_BLOCKS, type Pt } from './south';
import { inside } from './streetfaces';
import { southLift } from './southground';
import { BUILT, baked } from './baked';
import { cover, type Box } from './southblocks';

export type ShopKind = 'parade' | 'row' | 'pub' | 'gap' | 'petrol' | 'garage' | 'station' | 'carwash' | 'boarded';
export interface Shop {
  id: string;
  /** Its sign (made up; none on a gap site; the station's its name)  */
  name: string;
  kind: ShopKind;
  /** Its front's middle on the sidewalk's edge, the way it faces (out to the High Road), its frontage, its depth */
  at: Pt;
  face: Pt;
  w: number;
  d: number;
  /** Its storeys over the ground (a canopy's or a shed's: its own heights, `HEIGHT`) */
  storeys: number;
  /** Its shopfront's colour */
  colour: string;
  /** Its base: its slab over the highest ground under it, and the lowest (a plinth down to there) */
  base: number;
  low: number;
}

/** Each kind's frontage, depth and storeys (a storey 1, the shop floor 1.4: the terraces' scale) */
export const KINDS: Record<ShopKind, { w: number; d: number; storeys: number }> = {
  parade: { w: 4.2, d: 8, storeys: 2 },
  row: { w: 4.6, d: 7.5, storeys: 3 },
  pub: { w: 10.5, d: 9, storeys: 2 },
  gap: { w: 8, d: 6, storeys: 0 },
  petrol: { w: 12, d: 11, storeys: 0 },
  garage: { w: 15, d: 9, storeys: 0 },
  station: { w: 8, d: 4, storeys: 0 },
  carwash: { w: 13, d: 10, storeys: 0 },
  boarded: { w: 9, d: 7, storeys: 2 },
};
/** The shop floor's height, a storey's, a canopy's (the petrol station's, the car wash's), the bus garage's eaves */
export const HEIGHT = { shop: 1.4, storey: 1, canopy: 2.6, garage: 4.6, garageRidge: 2.2, hoarding: 1.8, station: 2.1 };
/** The underground station's building (docs/south-plan.md Phase 4e): its walls' thickness, its door in its front (along
 * its frontage from its middle, east +), at its east end, on to the landing inside (southline.ts `BUILDING_STAIRS`) */
export const STATION_WALL = 0.15;
export const STATION_DOOR: [number, number] = [1.6, 3.5];

/** What stands along each stretch of the High Road (a block's run on it), in order from the run's start */
type Item = { kind: ShopKind; name: string; colour?: string; id?: string };
const ITEMS: { block: string; from: Pt; items: Item[] }[] = [
  // South side, from the Circus west to Bell Street
  {
    block: 'village-east',
    from: [-96, 417],
    items: [
      ...['Parade Cuts', 'Ends Mini Mart', 'Lucky Star Takeaway', 'Circus Cards', 'Parade Pharmacy'].map((name): Item => ({ kind: 'parade', name })),
      { kind: 'row', name: "Rosa's Café", id: 'rosas', colour: '#d9692e' },
      { kind: 'row', name: 'Golden Wing', colour: '#d6a12a' },
      { kind: 'row', name: 'Sharp Lines', colour: '#2b2d3a' },
      { kind: 'pub', name: 'The Brook & Lantern', id: 'brook', colour: '#2f4a3a' },
    ],
  },
  // South side, from Bell Street west to Degen's gates
  {
    block: 'village-west',
    from: [-155, 395],
    items: [
      { kind: 'row', name: 'Bubbles Launderette', colour: '#2c9a92' },
      { kind: 'row', name: 'Fix-It Phones', colour: '#1f3a5f' },
      { kind: 'row', name: 'Brookside Fish Bar', colour: '#2aabee' },
      { kind: 'row', name: 'Corner Cellar', colour: '#7a1f2b' },
      { kind: 'gap', name: '' },
      { kind: 'row', name: 'Aldwyn Greens', colour: '#2f6a3c' },
      { kind: 'row', name: 'Hilltop Hardware', colour: '#a3804f' },
      { kind: 'row', name: 'Page Turners', colour: '#55697f' },
      { kind: 'row', name: "Mo's Corner Store", colour: '#e23b3b' },
    ],
  },
  // North side: by Degen's gates, then east to the estate's edge
  { block: 'north-gates', from: [-213, 378], items: [{ kind: 'carwash', name: 'Sparkle Hand Wash', colour: '#2aabee' }] },
  { block: 'north-mid', from: [-166, 386], items: [{ kind: 'station', name: 'High Road' }, { kind: 'petrol', name: 'Kestrel Fuel', id: 'kestrel', colour: '#d6a12a' }] },
  // (the small block between the High Road and its close: the bus garage)
  { block: 'north-garage', from: [-128, 399], items: [{ kind: 'garage', name: "Aldwyn's Green Bus Garage", id: 'busgarage', colour: '#7a1f2b' }] },
  { block: 'north-east', from: [-107, 409], items: [{ kind: 'boarded', name: 'The Duke of Endswood', colour: '#3b3846' }] },
];

const SLAB = 0.15;
const overlaps = (a: Pt[], b: Pt[]) => a.some((p) => inside(b, p)) || b.some((p) => inside(a, p));
const shrink = (r: Pt[], k: number): Pt[] => {
  const c: Pt = [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];
  return r.map((p) => [p[0] + (c[0] - p[0]) * k, p[1] + (c[1] - p[1]) * k]);
};
/** Points every half along a ring's edges */
const edgePoints = (r: Pt[]): Pt[] =>
  r.flatMap((a, i) => {
    const c = r[(i + 1) % r.length];
    const n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 0.5));
    return Array.from({ length: n }, (_, k): Pt => [a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n]);
  });
/** A shop's footprint (front wall to back wall) */
export function shopFoot(s: Pick<Shop, 'at' | 'face' | 'w' | 'd'>): Pt[] {
  const [nx, nz] = s.face;
  const [tx, tz] = [-nz, nx];
  const [x, z] = s.at;
  const w = s.w / 2;
  return [
    [x - tx * w, z - tz * w],
    [x + tx * w, z + tz * w],
    [x + tx * w - nx * s.d, z + tz * w - nz * s.d],
    [x - tx * w - nx * s.d, z - tz * w - nz * s.d],
  ];
}

/** The High Road's buildings laid (worked out when the site is built: baked.ts) */
function layShops(): Shop[] {
  return (() => {
  const out: Shop[] = [];
  for (const { from, items } of ITEMS) {
    // (the block whose High Road run starts nearest `from`)
    let best: { run: Pt[]; poly: Pt[]; e: number } | null = null;
    for (const b of SOUTH_BLOCKS)
      for (const r of b.runs) {
        if (r.street !== 'south-high' || r.pts.length < 2) continue;
        const e = Math.hypot(r.pts[0][0] - from[0], r.pts[0][1] - from[1]);
        if (!best || e < best.e) best = { run: r.pts, poly: b.poly, e };
      }
    if (!best || best.e > 6) continue;
    const { run, poly } = best;
    const segs = run.slice(1).map((q, i) => ({ a: run[i], b: q, l: Math.hypot(q[0] - run[i][0], q[1] - run[i][1]) }));
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
      return { p: run[0], t: [1, 0] as Pt };
    };
    let d = 0.8;
    for (const it of items) {
      const k = KINDS[it.kind];
      let placed = false;
      while (!placed && d + k.w < L - 0.4) {
        const { p, t } = at(d + k.w / 2);
        let n: Pt = [-t[1], t[0]];
        if (!inside(poly, [p[0] - n[0] * 2, p[1] - n[1] * 2])) n = [-n[0], -n[1]];
        const front: Pt = [p[0] - n[0] * 0.15, p[1] - n[1] * 0.15];
        const s = { at: front, face: n, w: k.w, d: k.d };
        const foot = shopFoot(s);
        // (every point along its edges in the block, not just its corners: a block's edge can dip in between them)
        const fits = edgePoints(shrink(foot, 0.04)).every((q) => inside(poly, q)) && !out.some((o) => overlaps(shrink(foot, 0.08), shopFoot(o)) || overlaps(foot, shrink(shopFoot(o), 0.08)));
        if (!fits) {
          d += 0.5;
          continue;
        }
        const lifts = foot.map((q) => southLift(q[0], q[1]));
        out.push({ id: it.id ?? `shop-${out.length}`, name: it.name, kind: it.kind, at: front, face: n, w: k.w, d: k.d, storeys: k.storeys, colour: it.colour ?? '#55697f', base: SLAB + Math.max(...lifts), low: SLAB + Math.min(...lifts) });
        // (rows and the parade shoulder to shoulder; a breath between the rest)
        d += k.w + (it.kind === 'row' || it.kind === 'parade' ? 0 : 1.2);
        placed = true;
      }
    }
  }
  return out;
  })();
}
export const SHOPS: Shop[] = baked('highroad', BUILT ? undefined : layShops);

/** A shop's top over its base: its roof (or a shed's ridge, a canopy's top) */
export function topOf(s: Shop) {
  if (s.kind === 'garage') return HEIGHT.garage + HEIGHT.garageRidge;
  if (s.kind === 'petrol' || s.kind === 'carwash') return HEIGHT.canopy + 0.5;
  if (s.kind === 'gap') return HEIGHT.hoarding;
  if (s.kind === 'station') return HEIGHT.station + 0.25;
  const roof = s.kind === 'pub' || s.kind === 'boarded' ? 2.2 : 0.35;
  return HEIGHT.shop + (s.storeys - 1) * HEIGHT.storey + roof;
}
/** How far in from the plot's back the petrol station's kiosk and the car wash's bay stand */
export const BACK_IN = 0.6;
/** Where you stand at a shop's door (on the sidewalk, in front of it) */
export const doorOf = (s: Shop): Pt => [s.at[0] + s.face[0] * 0.6, s.at[1] + s.face[1] * 0.6];

/** The solids: the buildings (their tops over their bases); the forecourts' and the car wash's canopies stand on
 * posts (only the kiosk and the wash bay are solid); a gap site's hoarding along its front; the station building's walls
 * round its landing and stairs, its door left open */
export const SHOP_SOLIDS: Box[] = SHOPS.flatMap((s): Box[] => {
  if (s.kind === 'petrol' || s.kind === 'carwash') {
    // (the kiosk or the bay at the back of the plot)
    // (a little in from the plot's back: it stands on the block's slab)
    const back = shopFoot({ ...s, at: [s.at[0] - s.face[0] * (s.d - 4), s.at[1] - s.face[1] * (s.d - 4)], d: 4 - BACK_IN, w: s.w * 0.45 });
    return cover(shrink(back, 0.04), s.base + 2.2, 0.25);
  }
  if (s.kind === 'gap') return cover(shrink(shopFoot({ ...s, d: 0.3 }), 0.02), s.base + HEIGHT.hoarding, 0.5);
  if (s.kind === 'station') return stationWalls(s).flatMap((w) => cover(w, s.base + topOf(s), 0.25));
  // (in fine strips: a slanted front's strips stand out from it no more than a hand)
  // (pulled a little in, so a strip at a slanted back never stands past the block's edge)
  return cover(shrink(shopFoot(s), 0.02), s.base + topOf(s), 0.25);
});
/** The station building's walls (round its landing and stairs, its door in its front), each as its four corners:
 * local x along its frontage (east +, from its middle), z out of its front (its back at -d) */
export function stationWalls(s: Shop): Pt[][] {
  const [nx, nz] = s.face;
  const t: Pt = nx < 0 ? [-nz, nx] : [nz, -nx];
  const fwd: Pt = t[0] > 0 ? t : [-t[0], -t[1]];
  const p = (x: number, z: number): Pt => [s.at[0] + fwd[0] * x + nx * z, s.at[1] + fwd[1] * x + nz * z];
  const quad = (x0: number, x1: number, z0: number, z1: number): Pt[] => [p(x0, z0), p(x1, z0), p(x1, z1), p(x0, z1)];
  const [w, d, k] = [s.w / 2, s.d, STATION_WALL];
  return [quad(-w, STATION_DOOR[0], -k, 0), quad(STATION_DOOR[1], w, -k, 0), quad(-w, w, -d, -d + k), quad(-w, -w + k, -d, 0), quad(w - k, w, -d, 0)];
}
/** Where the High Road's buildings stand, all of them */
export const HIGHROAD_RECT: [number, number, number, number] = (() => {
  const pts = SHOPS.flatMap((s) => shopFoot(s));
  return [Math.min(...pts.map((p) => p[0])) - 4, Math.min(...pts.map((p) => p[1])) - 4, Math.max(...pts.map((p) => p[0])) + 4, Math.max(...pts.map((p) => p[1])) + 4];
})();
