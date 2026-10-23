/*
 * The Trenches' grit (the owner's call: "more concrete... a gritty urban
 * city feel"; DOM-free, tested in tests/grit.test.ts). What's on the ground
 * and on the walls besides the towers (projects.ts) and the commons
 * (commons.ts), drawn by grit3d.ts:
 *
 * - **The yards** are concrete now (the lots' ground is world.ts's `yard`),
 *   with a few patches of worn grass and bare dirt (`PATCHES`) clear of
 *   everything, and the rec block's lawn worn too; trees stand in pits with
 *   grates along the yards' street sides (`YARD_TREES`), fewer than the
 *   lawns had, and a few on the worn grass.
 * - **Jersey barriers** (`BARRIERS`, in units) along the back of Bottom
 *   Street's car parks.
 * - **Dumpsters** (`DUMPSTERS`) against a side wall of each tower that
 *   isn't a walk-up, clear of its way in; **trash** (`TRASH`): piles of
 *   bags beside each and a little way into the rows' alleys.
 * - **Shutters down** on some of the rows' shops (`shuttered()`), **boarded
 *   windows** on the towers' lower floors (`boarded()`); tags and posters
 *   go on those, the el's pillars, the barriers and the dumpsters.
 * - **The boombox** (`BOOMBOXES`): by the stoops of a few walk-ups,
 *   folding chairs and neighbours round a box playing (sound.ts hears it
 *   through ambience.ts).
 *
 * What's solid (`GRIT_SOLIDS`: the barriers, the dumpsters) joins SOLIDS.
 * Nothing here threatens anyone: it's lived-in and worn, that's all.
 */
import type { Face, Footprint, Pt, Rect } from './downtown';
import { AMENITIES, BAYS, REC, amenityWay, doorWay, overlaps, towerRects } from './commons';
import { built } from './streetwall';
import { THE_BLOCK, TOWERS, isCorner, rows, type Tower } from './projects';
import { RECIPES, rng } from './recipes';
import { TRENCH_BLOCKS, inTrenches } from './trenches';
import { PILLARS, PILLAR_HALF } from './metro';
import type { Lot } from './kits';

const bounds = (poly: Pt[]): Rect => [Math.min(...poly.map((p) => p[0])), Math.min(...poly.map((p) => p[1])), Math.max(...poly.map((p) => p[0])), Math.max(...poly.map((p) => p[1]))];
const grow = ([x0, z0, x1, z1]: Rect, m: number): Rect => [x0 - m, z0 - m, x1 + m, z1 + m];
const within = (r: Rect, b: Rect, m: number) => r[0] >= b[0] + m && r[1] >= b[1] + m && r[2] <= b[2] - m && r[3] <= b[3] - m;
/** A number from 0 to 1 from a few others (the same every time) */
const hash = (...v: number[]) => {
  const h = Math.sin(v.reduce((a, x, i) => a + x * [12.9898, 78.233, 37.719, 4.581][i % 4], 0)) * 43758.5453;
  return h - Math.floor(h);
};

/** The projects' yards (row B but The Block), the rec block among them */
export const YARDS = TRENCH_BLOCKS.filter((b) => b.row === 'B' && b.id !== THE_BLOCK.block);
/** A block's rectangle (each worked out once) */
const RECTS = new Map<string, Rect>();
const rectOf = (id: string): Rect => {
  let r = RECTS.get(id);
  if (!r) RECTS.set(id, (r = bounds(TRENCH_BLOCKS.find((b) => b.id === id)!.poly)));
  return r;
};

/** What's in a yard already and must stay clear: the towers and their ways in, the amenities and theirs, the bays, the rec block's buildings */
export function taken(block: string): Rect[] {
  const b = rectOf(block);
  const towers = TOWERS.filter((t) => t.block === block);
  return [
    ...towers.flatMap(towerRects).map((r) => grow(r, 1)),
    ...towers.map((t) => doorWay(t, b, 1.6)),
    ...AMENITIES.filter((a) => a.block === block).flatMap((a) => [grow(a.rect, 0.8), amenityWay(a, 1.2)]),
    ...BAYS.filter((y) => y.block === block).map((y) => grow(y.rect, 0.6)),
    ...(block === REC.block ? [REC.centre, REC.laundry, REC.pavilion, REC.path].map((r) => grow(r, 1)) : []),
    // (the grit's step 2) the street walls, the vacant lots and the low commercial
    ...built(block).map((r) => grow(r, 0.4)),
  ];
}

/* ---------- The ground ---------- */

/** A patch of worn grass, bare dirt or (the rec block) worn lawn on the concrete: its outline, ragged */
export interface Patch {
  block: string;
  kind: 'grass' | 'dirt' | 'lawn';
  poly: Pt[];
  /** Its bounds */
  rect: Rect;
}
function blob(cx: number, cz: number, rx: number, rz: number, r: () => number): Pt[] {
  const n = 12;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 0.72 + r() * 0.28;
    return [cx + Math.cos(a) * rx * k, cz + Math.sin(a) * rz * k] as Pt;
  });
}
/** A rectangle with its edges a little ragged (pulled in, never out) */
function ragged([x0, z0, x1, z1]: Rect, r: () => number): Pt[] {
  const out: Pt[] = [];
  const step = 2.5;
  const nx = Math.max(1, Math.round((x1 - x0) / step));
  const nz = Math.max(1, Math.round((z1 - z0) / step));
  const j = () => r() * 0.5;
  for (let i = 0; i < nx; i++) out.push([x0 + ((x1 - x0) * i) / nx, z0 + (i ? j() : 0)]);
  for (let i = 0; i < nz; i++) out.push([x1 - (i ? j() : 0), z0 + ((z1 - z0) * i) / nz]);
  for (let i = 0; i < nx; i++) out.push([x1 - ((x1 - x0) * i) / nx, z1 - (i ? j() : 0)]);
  for (let i = 0; i < nz; i++) out.push([x0 + (i ? j() : 0), z1 - ((z1 - z0) * i) / nz]);
  return out;
}
export const PATCHES: Patch[] = (() => {
  const out: Patch[] = [];
  YARDS.forEach((blk, bi) => {
    const b = bounds(blk.poly);
    const r = rng(9100 + bi * 31);
    if (blk.id === REC.block) {
      // The rec block's lawn, worn: either side of the path, south of the buildings
      for (const lawn of [
        [b[0] + 1.5, REC.centre[3] + 2.5, REC.path[0] - 1.2, b[3] - 1.5],
        [REC.path[2] + 1.2, REC.laundry[3] + 2.5, b[2] - 1.5, b[3] - 1.5],
      ] as Rect[]) {
        // (pulled back from the street walls round it: the grit's step 2)
        const rect: Rect = [...lawn];
        for (const k of built(blk.id)) {
          if (!overlaps(grow(k, 0.8), rect)) continue;
          const kx = k[2] - k[0] < k[3] - k[1];
          if (kx && k[0] <= b[0] + 1e-6) rect[0] = Math.max(rect[0], k[2] + 0.8);
          else if (kx) rect[2] = Math.min(rect[2], k[0] - 0.8);
          else if (k[1] <= b[1] + 1e-6) rect[1] = Math.max(rect[1], k[3] + 0.8);
          else rect[3] = Math.min(rect[3], k[1] - 0.8);
        }
        if (rect[2] - rect[0] > 3 && rect[3] - rect[1] > 3) out.push({ block: blk.id, kind: 'lawn', poly: ragged(rect, r), rect });
      }
      return;
    }
    const keep = taken(blk.id);
    const want = 2 + (r() < 0.5 ? 1 : 0);
    let mine = 0;
    for (let k = 0; k < 80 && mine < want; k++) {
      const rx = 1.4 + r() * 1.6;
      const rz = 1.2 + r() * 1.3;
      const cx = b[0] + 1.5 + rx + r() * (b[2] - b[0] - 3 - rx * 2);
      const cz = b[1] + 1.5 + rz + r() * (b[3] - b[1] - 3 - rz * 2);
      const rect: Rect = [cx - rx, cz - rz, cx + rx, cz + rz];
      if (!within(rect, b, 1.5) || keep.some((t) => overlaps(t, rect)) || out.some((p) => overlaps(grow(p.rect, 1), rect))) continue;
      out.push({ block: blk.id, kind: r() < 0.6 ? 'grass' : 'dirt', poly: blob(cx, cz, rx, rz, r), rect });
      mine++;
    }
  });
  return out;
})();

/** A tree: in a pit with a grate on the concrete, or straight on a patch of grass */
export interface YardTree {
  block: string;
  x: number;
  z: number;
  s: number;
  pit: boolean;
}
/** A tree pit's half size */
export const PIT = 0.45;
export const YARD_TREES: YardTree[] = (() => {
  const out: YardTree[] = [];
  YARDS.forEach((blk, bi) => {
    const b = bounds(blk.poly);
    const r = rng(9700 + bi * 17);
    if (blk.id === REC.block) {
      // On the rec block's worn lawn, clear of the buildings, the pavilion and the path
      const keep = [REC.centre, REC.laundry, REC.pavilion, REC.path].map((q) => grow(q, 1.8));
      for (const p of PATCHES.filter((o) => o.block === blk.id))
        for (let x = p.rect[0] + 1.2; x < p.rect[2] - 1; x += 3.6)
          for (let z = p.rect[1] + 1.2; z < p.rect[3] - 1; z += 3.6) {
            if (keep.some((q) => x > q[0] && x < q[2] && z > q[1] && z < q[3]) || r() < 0.45) continue;
            out.push({ block: blk.id, x: x + (r() - 0.5) * 0.8, z: z + (r() - 0.5) * 0.8, s: 0.95 + r() * 0.35, pit: false });
          }
      return;
    }
    const keep = taken(blk.id);
    const clear = (x: number, z: number) => !keep.some((t) => overlaps(t, [x - 0.8, z - 0.8, x + 0.8, z + 0.8]));
    // In pits along each street side, a little in from the chain-link
    const IN = 1.1;
    const sides: [Pt, Pt][] = [
      [[b[0] + 2.5, b[1] + IN], [b[2] - 2.5, b[1] + IN]],
      [[b[0] + 2.5, b[3] - IN], [b[2] - 2.5, b[3] - IN]],
      [[b[0] + IN, b[1] + 2.5], [b[0] + IN, b[3] - 2.5]],
      [[b[2] - IN, b[1] + 2.5], [b[2] - IN, b[3] - 2.5]],
    ];
    for (const [p, q] of sides) {
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const n = Math.max(1, Math.round(len / 6));
      for (let i = 0; i <= n; i++) {
        const [x, z]: Pt = [p[0] + ((q[0] - p[0]) * i) / n, p[1] + ((q[1] - p[1]) * i) / n];
        if (r() < 0.3 || !clear(x, z) || out.some((t) => Math.hypot(t.x - x, t.z - z) < 3)) continue;
        out.push({ block: blk.id, x, z, s: 0.85 + r() * 0.35, pit: true });
      }
    }
    // One on each big enough patch of grass
    for (const p of PATCHES.filter((o) => o.block === blk.id && o.kind === 'grass'))
      if (p.rect[2] - p.rect[0] > 4) out.push({ block: blk.id, x: (p.rect[0] + p.rect[2]) / 2, z: (p.rect[1] + p.rect[3]) / 2, s: 0.9 + r() * 0.3, pit: false });
  });
  return out;
})();

/* ---------- Jersey barriers ---------- */

/** One jersey barrier: its middle, along x or z */
export interface Barrier {
  x: number;
  z: number;
  alongX: boolean;
}
/** A barrier's length, its foot's width and its height */
export const JERSEY = { l: 1.6, w: 0.5, h: 0.55 };
/** Bottom Street's car parks (behind its row), as projects3d.ts draws them */
export const CAR_PARKS: Rect[] = TRENCH_BLOCKS.filter((o) => o.row === 'C').flatMap((blk) => {
  const [x0, z0, x1, z1] = bounds(blk.poly);
  const pz0 = z0 + RECIPES.rowhouses.depth! + 1;
  const pz1 = z1 - 2.6;
  const px0 = x0 + (blk.poly.length > 4 ? 6 : 1);
  return pz1 - pz0 > 3 ? [[px0, pz0, x1 - 1, pz1] as Rect] : [];
});
export const BARRIERS: Barrier[] = CAR_PARKS.flatMap(([x0, , x1, z1]) => {
  // Along the back of the car park, end to end with a hand's width between
  const n = Math.floor((x1 - x0 - 0.4) / (JERSEY.l + 0.06));
  const s0 = x0 + (x1 - x0 - n * (JERSEY.l + 0.06)) / 2;
  return Array.from({ length: n }, (_, i): Barrier => ({ x: s0 + (i + 0.5) * (JERSEY.l + 0.06), z: z1 + 0.45, alongX: true }));
});
export const barrierRect = (j: Barrier): Rect => (j.alongX ? [j.x - JERSEY.l / 2, j.z - JERSEY.w / 2, j.x + JERSEY.l / 2, j.z + JERSEY.w / 2] : [j.x - JERSEY.w / 2, j.z - JERSEY.l / 2, j.x + JERSEY.w / 2, j.z + JERSEY.l / 2]);

/* ---------- Dumpsters and trash ---------- */

/** A dumpster against a wall, `n` the way out of the wall (its lid opens that way) */
export interface Dumpster {
  tower: string;
  rect: Rect;
  n: Pt;
}
export const DUMPSTER = { l: 1.5, d: 0.9, h: 1.0 };
const FACE_N: Record<Face, Pt> = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };
const OPPOSITE: Record<Face, Face> = { n: 's', s: 'n', w: 'e', e: 'w' };
const SIDES: Record<Face, Face[]> = { n: ['w', 'e'], s: ['e', 'w'], w: ['n', 's'], e: ['s', 'n'] };
export const DUMPSTERS: Dumpster[] = (() => {
  const out: Dumpster[] = [];
  for (const t of TOWERS) {
    if (t.design === 'walkup') continue;
    const b = rectOf(t.block);
    const others = TOWERS.filter((o) => o.block === t.block);
    const keep = [
      ...others.filter((o) => o !== t).flatMap(towerRects).map((r) => grow(r, 0.8)),
      ...others.map((o) => doorWay(o, b, 1.6)),
      ...AMENITIES.filter((a) => a.block === t.block).flatMap((a) => [grow(a.rect, 0.6), amenityWay(a, 1.2)]),
      ...BAYS.filter((y) => y.block === t.block).map((y) => grow(y.rect, 0.5)),
      ...towerRects(t),
    ];
    const [x0, z0, x1, z1] = t.parts[t.main].rect;
    for (const f of [OPPOSITE[t.door.face], ...SIDES[t.door.face]]) {
      const n = FACE_N[f];
      // Against the middle of that wall, 0.15 out
      const [cx, cz]: Pt = f === 'n' ? [(x0 + x1) / 2, z0 - 0.15 - DUMPSTER.d / 2] : f === 's' ? [(x0 + x1) / 2, z1 + 0.15 + DUMPSTER.d / 2] : f === 'w' ? [x0 - 0.15 - DUMPSTER.d / 2, (z0 + z1) / 2] : [x1 + 0.15 + DUMPSTER.d / 2, (z0 + z1) / 2];
      const [hx, hz] = n[0] ? [DUMPSTER.d / 2, DUMPSTER.l / 2] : [DUMPSTER.l / 2, DUMPSTER.d / 2];
      const rect: Rect = [cx - hx, cz - hz, cx + hx, cz + hz];
      // (room in front for the trash beside it and to get round it)
      if (!within(rect, b, 1.5) || keep.some((k) => overlaps(k, grow(rect, 0.12)))) continue;
      out.push({ tower: t.id, rect, n });
      break;
    }
  }
  return out;
})();

/** A pile of trash bags: its middle, how many, how far it spreads */
export interface Trash {
  x: number;
  z: number;
  n: number;
  r: number;
}
export const TRASH: Trash[] = (() => {
  const out: Trash[] = [];
  // Beside each dumpster, at its end
  for (const d of DUMPSTERS) {
    const [x0, z0, x1, z1] = d.rect;
    const along: Pt = d.n[0] ? [0, 1] : [1, 0];
    const half = DUMPSTER.l / 2 + 0.45;
    const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
    out.push({ x: cx + along[0] * half, z: cz + along[1] * half, n: 4 + Math.floor(hash(cx, cz) * 3), r: 0.4 });
  }
  // A little way into some of the rows' alleys, against a wall
  const laid = rows();
  for (const a of laid.alleys) {
    const [x0, z0, x1, z1] = a.box;
    if (hash(x0, z0) < 0.35) continue;
    const alongX = x1 - x0 > z1 - z0;
    const [bx, bz] = [a.bollards.reduce((s, p) => s + p[0], 0) / a.bollards.length, a.bollards.reduce((s, p) => s + p[1], 0) / a.bollards.length];
    const w = alongX ? z1 - z0 : x1 - x0;
    if (w < 1) continue;
    // From the end with the bollards (the street), 1.6 in
    const fromLow = alongX ? Math.abs(bx - x0) < Math.abs(bx - x1) : Math.abs(bz - z0) < Math.abs(bz - z1);
    const a0 = alongX ? (fromLow ? x0 + 1.6 : x1 - 1.6) : fromLow ? z0 + 1.6 : z1 - 1.6;
    const side = (alongX ? z0 : x0) + 0.32;
    out.push(alongX ? { x: a0, z: side, n: 3, r: 0.28 } : { x: side, z: a0, n: 3, r: 0.28 });
  }
  return out;
})();

/* ---------- Worn fronts ---------- */

/** Is one of the rows' shops (not a corner shop or one of the avenue's places) shuttered for good: about two in five */
export const shuttered = (lot: Lot) => lot.type === 'shop' && !isCorner(lot) && hash(lot.seed, 3.1) < 0.4;
/** Is a tower's window boarded up (wall, bay along it, floor): a few on the lower floors, the odd one higher */
export const boarded = (t: Tower, wall: number, bay: number, floor: number) => hash(t.no, wall + 0.5, bay, floor) < (floor < 3 ? 0.045 : 0.01);

/** The el's pillars in The Trenches (steel on a concrete plinth, tagged, bills on them: metro3d.ts, grit3d.ts) */
export const EL_PILLARS = PILLARS.filter((p) => inTrenches(p.at[0], p.at[1]));
/** A pillar's plinth there, a touch wider than its steel (and its footprint, `PILLAR_HALF`) */
export const PLINTH = { half: PILLAR_HALF + 0.03, h: 0.9 };
/** The el's spans in The Trenches (between two of its pillars): a sodium lamp under each, its pool of light on the avenue */
export const EL_SPANS: { track: 'main'; s: number; at: Pt }[] = EL_PILLARS.filter((p) => p.track === 'main')
  .sort((p, q) => p.s - q.s)
  .slice(1)
  .map((p, i, all) => {
    const prev = i ? all[i - 1] : EL_PILLARS.filter((o) => o.track === 'main').sort((a, b) => a.s - b.s)[0];
    const s = (p.s + prev.s) / 2;
    return { track: 'main' as const, s, at: [(p.at[0] + prev.at[0]) / 2, (p.at[1] + prev.at[1]) / 2] as Pt };
  });

/* ---------- The boombox ---------- */

/** A boombox by a walk-up's stoop: where it stands, the chairs round it (x, z, facing) and the people standing by */
export interface Boombox {
  x: number;
  z: number;
  ry: number;
  chairs: [number, number, number][];
  standing: [number, number, number][];
  /** All of it, for keeping clear */
  rect: Rect;
}
export const BOOMBOXES: Boombox[] = (() => {
  const out: Boombox[] = [];
  for (const t of TOWERS.filter((o) => o.design === 'walkup')) {
    if (out.length >= 3) break;
    if (out.some((o) => rectOf(t.block)[0] <= o.x && o.x <= rectOf(t.block)[2] && rectOf(t.block)[1] <= o.z && o.z <= rectOf(t.block)[3])) continue;
    const b = rectOf(t.block);
    const towers = TOWERS.filter((o) => o.block === t.block);
    const keep = [
      ...towers.flatMap((o) => o.parts.map((p) => p.rect)),
      ...towers.flatMap((o) => o.stoops).map((r) => grow(r, 0.25)),
      ...towers.map((o) => doorWay(o, b, 1.4)),
      ...AMENITIES.filter((a) => a.block === t.block).flatMap((a) => [grow(a.rect, 0.6), amenityWay(a, 1.2)]),
      ...BAYS.filter((y) => y.block === t.block).map((y) => grow(y.rect, 0.5)),
      ...DUMPSTERS.map((d) => grow(d.rect, 0.4)),
    ];
    const n = FACE_N[t.door.face];
    const tg: Pt = [n[1], -n[0]];
    // The front wall's line and how far along it each stoop is
    const along = (p: Pt) => (p[0] - t.door.x) * tg[0] + (p[1] - t.door.z) * tg[1];
    const st = t.stoops.map((r) => along([(r[0] + r[2]) / 2, (r[1] + r[3]) / 2])).sort((p, q) => p - q);
    const wall: Pt = [t.door.x - n[0] * 0.25, t.door.z - n[1] * 0.25];
    // Between two stoops along the front: the box against the wall, two folding chairs out from it, someone standing
    for (let i = 0; i + 1 < st.length; i++) {
      const mid = (st[i] + st[i + 1]) / 2;
      const at = (u: number, v: number): Pt => [wall[0] + tg[0] * (mid + u) + n[0] * v, wall[1] + tg[1] * (mid + u) + n[1] * v];
      const [x, z] = at(0, 0.3);
      const c1 = at(-0.7, 0.85);
      const c2 = at(0.7, 0.85);
      const s1 = at(0, 1.25);
      const pts = [at(0, 0.3), c1, c2, s1];
      const rect: Rect = [Math.min(...pts.map((p) => p[0])) - 0.25, Math.min(...pts.map((p) => p[1])) - 0.25, Math.max(...pts.map((p) => p[0])) + 0.25, Math.max(...pts.map((p) => p[1])) + 0.25];
      if (!within(rect, b, 0.35) || keep.some((k) => overlaps(k, rect))) continue;
      const toward = (p: Pt, q: Pt) => Math.atan2(q[0] - p[0], q[1] - p[1]);
      // The sitters face out, turned a little to each other; the one standing faces them
      out.push({ x, z, ry: Math.atan2(n[0], n[1]), chairs: [[...c1, toward(c1, at(0.3, 2))], [...c2, toward(c2, at(-0.3, 2))]], standing: [[...s1, toward(s1, at(0, 0.6))]], rect });
      break;
    }
  }
  return out;
})();

/* ---------- What's solid ---------- */

export const GRIT_SOLIDS: Footprint[] = [...BARRIERS.map((j): Footprint => [...barrierRect(j), JERSEY.h]), ...DUMPSTERS.map((d): Footprint => [...d.rect, DUMPSTER.h])];
