/*
 * The seam map (docs/blend-plan.md Phase 0; DOM-free, tested in
 * tests/seams.test.ts): where the city's areas meet, worked out from the
 * street plan and the districts' land, for the blending plan's later phases
 * to read (a verge, a buffer, a lamp mix) and as its checklist.
 *
 * The world is laid on a grid of cells `CELL` across (`landMap()`), each one
 * thing: the highway, a street (its kind), water, a district (`AREAS`, by the
 * block it's on or the land it holds), a sidewalk-only strip, or open land
 * (inside the ring highway or out). Then from every cell on a district's edge
 * the map is walked straight out (each of four ways, at most `REACH`) over
 * streets and sidewalks to what's on the far side: another district, open
 * land, water or nothing in reach. Those are the seams (`seams()`): which
 * two, what lies between, how long, where. The open land inside the highway
 * falls into connected patches, the gaps (`gaps()`), each named by a point
 * in it (`GAP_NAMES`).
 *
 * Nothing in the browser reads it yet: it runs in the tests and in
 * `scripts/seams.mjs` (`npm run seams`, the report in the plan).
 */
import { EXT, CENTER_XZ } from './layout';
import { PLAN, slabOf, inPoly, type Block, type Pt, type StreetKind } from './streetplan';
import { HIGHWAY_HALF, fromHighway, insideHighway } from './highway';
import { inWater } from './river';
import { inBasin, DOCKS_RECT } from './docks';
import { inLake } from './westlake';
import { AIRPORT_AREAS } from './airfield';
import { KART_RECTS } from './kartfacility';
import { STADIUM_RECTS } from './stadium';
import { CREST_RECT } from './crestmont';
import { inTrenches } from './trenches';
import { inSunridge } from './sunridge';
import { UPTOWN_RECT } from './uptown';
import { NORTH_RECT } from './uptownnorth';
import { MALL_AREA } from './mall';
import { PROMENADE } from './outer';
import type { Rect } from './tiles';

/** The grid's cell (tiles across) */
export const CELL = 2;
/** How far a seam is looked for across streets and sidewalks (tiles) */
export const REACH = 40;

/** What an area is like: what a seam between two of them needs depends on it */
export type Character = 'core' | 'town' | 'towers' | 'park' | 'retail' | 'homes' | 'estates' | 'grit' | 'industry' | 'airport' | 'sport';

export interface Area {
  id: string;
  name: string;
  character: Character;
}

/** The areas, in the order a cell is given to one (the first that claims it) */
export const AREAS: Area[] = [
  { id: 'downtown', name: 'Downtown', character: 'core' },
  // (the districts' landscaped blocks round downtown, the south row, the squares and the parks: outer.ts)
  { id: 'town', name: 'The town', character: 'town' },
  { id: 'uptown', name: 'Uptown', character: 'towers' },
  { id: 'uptown-north', name: 'Uptown North', character: 'towers' },
  { id: 'westlake', name: 'Westlake Park', character: 'park' },
  { id: 'stadium', name: 'Sector 7 Stadium', character: 'sport' },
  { id: 'mall', name: 'Starlight Mall', character: 'retail' },
  { id: 'palm-court', name: 'Palm Court', character: 'retail' },
  { id: 'sunridge', name: 'Sunridge', character: 'homes' },
  { id: 'crestmont', name: 'Crestmont', character: 'estates' },
  { id: 'trenches', name: 'The Trenches', character: 'grit' },
  { id: 'docks', name: 'Southbank Docks', character: 'industry' },
  { id: 'strip', name: 'The Neon Mile', character: 'retail' },
  { id: 'airport', name: 'Sector 7 Airport', character: 'airport' },
  { id: 'karts', name: 'The kart park', character: 'sport' },
];
export const AREA_IDS = AREAS.map((a) => a.id);
const AREA_IX = new Map(AREA_IDS.map((id, i) => [id, i]));

/** The area a street plan block belongs to (null: a sidewalk-only strip, the bends' kerbs) */
export function areaOfBlock(b: Block): string | null {
  if (b.id.startsWith('kerb')) return null;
  if (b.id.startsWith('dt-')) return 'downtown';
  if (b.id.startsWith('o-')) return 'town';
  if (b.id === 'uptown-north') return 'uptown-north';
  if (b.id === 'palm-court') return 'palm-court';
  if (b.id === 'mall' || b.id === 'mall-park') return 'mall';
  const byRef: Record<string, string> = { uptown: 'uptown', westlake: 'westlake', stadium: 'stadium', sunridge: 'sunridge', crestmont: 'crestmont', trenches: 'trenches', docks: 'docks', strip: 'strip' };
  return (b.ref && byRef[b.ref]) ?? null;
}

/** Land an area holds that isn't a street plan block (the airport, the kart park, the stadium's grounds, Crestmont's hills,
 * Sunridge's club, park and school, Uptown's free sites, The Trenches' land along the highway, the docks' quays), later
 * ones over earlier: the blocks go over all of it */
const inR = (r: Rect) => (x: number, z: number) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];
const anyR = (rs: Rect[]) => (x: number, z: number) => rs.some((r) => inR(r)(x, z));
const LAND: [string, (x: number, z: number) => boolean][] = [
  ['mall', inR(MALL_AREA)],
  ['uptown-north', inR(NORTH_RECT)],
  ['uptown', inR(UPTOWN_RECT)],
  ['trenches', (x, z) => inTrenches(x, z)],
  ['sunridge', (x, z) => inSunridge(x, z)],
  ['crestmont', inR(CREST_RECT)],
  ['airport', anyR(AIRPORT_AREAS)],
  ['karts', anyR(KART_RECTS)],
  ['stadium', anyR(STADIUM_RECTS)],
  ['docks', inR(DOCKS_RECT)],
];

/* ---------- The land map ---------- */

/** What a cell is: an area (its index in AREAS, 0 up), or one of these */
export const C = {
  open: -1,
  /** Open land outside the ring highway */
  outside: -2,
  water: -3,
  highway: -4,
  /** A sidewalk-only strip (the bends' kerbs) */
  walk: -5,
  street: -10,
  avenue: -11,
  slip: -12,
  alley: -13,
} as const;
const STREET_CODE: Record<StreetKind, number> = { street: C.street, avenue: C.avenue, slip: C.slip, alley: C.alley, highway: C.highway };
const isWay = (c: number) => c <= C.walk || c === C.highway;
const isOpen = (c: number) => c === C.open || c === C.outside;

export interface LandMap {
  x0: number;
  z0: number;
  /** Cells across (x) and down (z) */
  nx: number;
  nz: number;
  cells: Int8Array;
  /** The cell's middle */
  at(i: number, j: number): Pt;
  get(i: number, j: number): number;
}

function rasterPoly(poly: Pt[], x0: number, z0: number, nx: number, nz: number, set: (i: number, j: number) => void) {
  let [a, b, c, d] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, z] of poly) [a, b, c, d] = [Math.min(a, x), Math.min(b, z), Math.max(c, x), Math.max(d, z)];
  const i0 = Math.max(0, Math.floor((a - x0) / CELL));
  const i1 = Math.min(nx - 1, Math.floor((c - x0) / CELL));
  const j0 = Math.max(0, Math.floor((b - z0) / CELL));
  const j1 = Math.min(nz - 1, Math.floor((d - z0) / CELL));
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) if (inPoly(poly, [x0 + (i + 0.5) * CELL, z0 + (j + 0.5) * CELL])) set(i, j);
}

function segDist(p: Pt, a: Pt, b: Pt) {
  const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
  const l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
}

let cached: LandMap | null = null;
/** The world as a grid of what's there (worked out once) */
export function landMap(): LandMap {
  if (cached) return cached;
  const x0 = EXT[0];
  const z0 = EXT[0];
  const nx = Math.ceil((EXT[1] - EXT[0]) / CELL);
  const nz = nx;
  const cells = new Int8Array(nx * nz).fill(C.open);
  const at = (i: number, j: number): Pt => [x0 + (i + 0.5) * CELL, z0 + (j + 0.5) * CELL];

  // Lowest first, each layer over the one before: open land, the districts' own land, the blocks (their slabs: the sidewalk is the block's), streets, the highway, water
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const [x, z] = at(i, j);
      if (!insideHighway(x, z)) cells[j * nx + i] = C.outside;
    }
  for (const [id, has] of LAND) {
    const v = AREA_IX.get(id)!;
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const [x, z] = at(i, j);
        if (has(x, z)) cells[j * nx + i] = v;
      }
  }
  PLAN.blocks.forEach((b) => {
    const id = areaOfBlock(b);
    const v = id === null ? C.walk : AREA_IX.get(id)!;
    rasterPoly(slabOf(b), x0, z0, nx, nz, (i, j) => (cells[j * nx + i] = v));
  });
  for (const s of PLAN.streets) {
    if (s.kind === 'highway') continue;
    const code = STREET_CODE[s.kind];
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const [a, b] = [s.pts[k], s.pts[k + 1]];
      const r = s.half;
      const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - r - x0) / CELL));
      const i1 = Math.min(nx - 1, Math.floor((Math.max(a[0], b[0]) + r - x0) / CELL));
      const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - r - z0) / CELL));
      const j1 = Math.min(nz - 1, Math.floor((Math.max(a[1], b[1]) + r - z0) / CELL));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (segDist(at(i, j), a, b) <= r) cells[j * nx + i] = code;
    }
  }
  // Between the bank avenues: the town's promenades are walks; the rest of the banks are the river's (its quay, sand and grass)
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const [x, z] = at(i, j);
      const n = j * nx + i;
      if (z > PROMENADE.north[0] && z < PROMENADE.south[1] && (cells[n] === C.open || cells[n] === C.outside))
        cells[n] = x > PROMENADE.x[0] && x < PROMENADE.x[1] && (z < PROMENADE.north[1] + 0.5 || z > PROMENADE.south[0] - 0.5) ? C.walk : C.water;
    }
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const [x, z] = at(i, j);
      const n = j * nx + i;
      if (fromHighway(x, z) <= HIGHWAY_HALF) cells[n] = C.highway;
      // (Westlake's lake is the park's own: not a seam)
      if (inWater(x, z) || inBasin(x, z)) cells[n] = C.water;
      else if (inLake(x, z)) cells[n] = AREA_IX.get('westlake')!;
    }
  cached = { x0, z0, nx, nz, cells, at, get: (i, j) => (i < 0 || j < 0 || i >= nx || j >= nz ? C.outside : cells[j * nx + i]) };
  return cached;
}

/* ---------- Seams ---------- */

/** What lies between two sides of a seam: the widest way crossed, or nothing */
export type Between = 'none' | 'walk' | 'alley' | 'street' | 'slip' | 'avenue' | 'highway';
const WIDTH_ORDER: Between[] = ['none', 'walk', 'alley', 'street', 'slip', 'avenue', 'highway'];
const betweenOf = (c: number): Between =>
  c === C.highway ? 'highway' : c === C.avenue ? 'avenue' : c === C.slip ? 'slip' : c === C.street ? 'street' : c === C.alley ? 'alley' : 'walk';

/** The far side of a seam that isn't a district */
export type Beyond = 'open' | 'outside' | 'water';

export interface Seam {
  /** One side: always a district */
  a: string;
  /** The other: a district, or open land (inside the highway or out), or water */
  b: string;
  between: Between;
  /** About how long (tiles) */
  length: number;
  /** On it, nearest the middle of where it runs */
  at: Pt;
  /** The box round it */
  box: Rect;
  /** How far its middle is from downtown's (tiles) */
  fromCentre: number;
  /** Ranked by length and nearness to the middle of town (the ones seen most first) */
  rank: number;
}

const DIRS: Pt[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Of some cells, the middle of the one nearest a point */
function nearest(map: LandMap, cells: number[], p: Pt): Pt {
  let best: Pt = p;
  let d = Infinity;
  for (const n of cells) {
    const i = n % map.nx;
    const q = map.at(i, (n - i) / map.nx);
    const e = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (e < d) [best, d] = [q, e];
  }
  return best;
}

/** Every seam, ranked: each stretch where two things meet, cut where it breaks off */
export function seams(map: LandMap = landMap()): Seam[] {
  const { nx, nz, get, at } = map;
  /** The edge cells of each kind of seam (the two sides together, `a|b|between` with a and b in AREAS' order), and how far across it reaches (cells) */
  const groups = new Map<string, { cells: number[]; reach: number; sides: number }>();
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const own = get(i, j);
      if (own < 0) continue;
      for (const [di, dj] of DIRS) {
        if (get(i + di, j + dj) === own) continue; // not an edge this way
        let widest: Between = 'none';
        let far: number | null = null;
        let k = 1;
        for (; k * CELL <= REACH; k++) {
          const c = get(i + di * k, j + dj * k);
          if (isWay(c)) {
            const w = betweenOf(c);
            if (WIDTH_ORDER.indexOf(w) > WIDTH_ORDER.indexOf(widest)) widest = w;
            continue;
          }
          far = c;
          break;
        }
        if (far === own) continue; // a street through its own district
        // (nothing in reach past the streets: open land beyond them; nothing at all: the world's edge)
        const b = far === null ? (widest === 'none' ? null : 'open') : far >= 0 ? AREA_IDS[far] : far === C.water ? 'water' : far === C.outside ? 'outside' : 'open';
        if (b === null) continue;
        const a = AREA_IDS[own];
        const two = AREA_IX.has(b);
        const [p, q] = two && AREA_IX.get(b)! < own ? [b, a] : [a, b];
        const key = `${p}|${q}|${widest}`;
        let g = groups.get(key);
        if (!g) groups.set(key, (g = { cells: [], reach: 0, sides: two ? 2 : 1 }));
        g.cells.push(j * nx + i);
        g.reach = Math.max(g.reach, far === null ? 1 : k);
      }
    }
  const out: Seam[] = [];
  for (const [key, g] of groups) {
    const [a, b, between] = key.split('|') as [string, string, Between];
    // Cut into stretches: cells within reach of each other (across the way between, for the two sides) are one
    const link = g.reach + 2;
    const uniq = [...new Set(g.cells)];
    const bucket = new Map<string, number[]>();
    const bk = (i: number, j: number) => `${Math.floor(i / link)},${Math.floor(j / link)}`;
    for (const n of uniq) {
      const i = n % nx;
      const k = bk(i, (n - i) / nx);
      (bucket.get(k) ?? bucket.set(k, []).get(k)!).push(n);
    }
    const label = new Map<number, number>();
    let next = 0;
    for (const start of uniq) {
      if (label.has(start)) continue;
      const id = next++;
      label.set(start, id);
      const stack = [start];
      const mine: number[] = [];
      let count = 0;
      let [sx, sz] = [0, 0];
      let box: Rect = [Infinity, Infinity, -Infinity, -Infinity];
      while (stack.length) {
        const n = stack.pop()!;
        mine.push(n);
        const i = n % nx;
        const j = (n - i) / nx;
        const [x, z] = at(i, j);
        count++;
        sx += x;
        sz += z;
        box = [Math.min(box[0], x), Math.min(box[1], z), Math.max(box[2], x), Math.max(box[3], z)];
        const [bi, bj] = [Math.floor(i / link), Math.floor(j / link)];
        for (let u = bi - 1; u <= bi + 1; u++)
          for (let v = bj - 1; v <= bj + 1; v++)
            for (const m of bucket.get(`${u},${v}`) ?? []) {
              if (label.has(m)) continue;
              const mi = m % nx;
              const mj = (m - mi) / nx;
              if (Math.max(Math.abs(mi - i), Math.abs(mj - j)) > link) continue;
              label.set(m, id);
              stack.push(m);
            }
      }
      const length = (count / g.sides) * CELL;
      if (length < 6 * CELL) continue; // a corner's worth: not a seam
      const atPt = nearest(map, mine, [sx / count, sz / count]);
      const fromCentre = Math.hypot(atPt[0] - CENTER_XZ.x, atPt[1] - CENTER_XZ.z);
      // (the order for the plan's Phase 6: long seams near the middle of town first)
      const rank = length / (1 + fromCentre / 150);
      out.push({ a, b, between, length: Math.round(length), at: [Math.round(atPt[0]), Math.round(atPt[1])], box: box.map(Math.round) as Rect, fromCentre: Math.round(fromCentre), rank: Math.round(rank) });
    }
  }
  return out.sort((p, q) => q.rank - p.rank || p.at[0] - q.at[0] || p.at[1] - q.at[1]);
}

/* ---------- Gaps ---------- */

/** The open land inside the highway's patches the plan names (a point in each), docs/blend-plan.md Phase 5 */
export const GAP_NAMES: { id: string; name: string; at: Pt }[] = [
  // South of the south row to the highway's south side: the airport's old land, east of the arterials
  { id: 'south-band', name: "The south band (the airport's old land)", at: [171, 229] },
  // ...and between the arterials south of the south row, west to east
  { id: 'south-strip-w', name: 'South strip, west', at: [7, 243] },
  { id: 'south-strip-m', name: 'South strip, middle', at: [29, 241] },
  { id: 'south-strip-e', name: 'South strip, east', at: [53, 243] },
  // (the east strip, east of town north of the river, is the Neon Mile's now: docs/strip-plan.md)
  // Round Sunridge's wall to the highway and the Parkway
  { id: 'sunridge-fringe', name: "Sunridge's fringe", at: [191, -151] },
  // The verges between the park and the highway: the west, and the north (with the stadium's footbridge)
  { id: 'westlake-verge', name: "Westlake's west verge", at: [-203, -93] },
  { id: 'north-verge', name: 'The north verge', at: [-67, -163] },
];

export interface Gap {
  /** Its name's id, or `gap-<n>` where none names it */
  id: string;
  name: string;
  /** Square tiles */
  area: number;
  box: Rect;
  /** In it, nearest the middle of its cells */
  at: Pt;
  /** The districts next to it (across streets and sidewalks, within REACH), most cells first */
  neighbours: string[];
}

/** Patches of open land inside the highway smaller than this (square tiles) are slivers, not gaps */
export const GAP_MIN = 600;

/** The open land inside the highway, in connected patches, biggest first */
export function gaps(map: LandMap = landMap()): Gap[] {
  const { nx, nz, cells, get, at } = map;
  // Each open cell's patch (its number, 1 up; 0 not open)
  const patch = new Int32Array(nx * nz);
  const out: (Omit<Gap, 'id' | 'name'> & { n: number })[] = [];
  let next = 0;
  for (let s = 0; s < nx * nz; s++) {
    if (patch[s] || cells[s] !== C.open) continue;
    const n = ++next;
    const stack = [s];
    const mine: number[] = [];
    patch[s] = n;
    let [count, sx, sz] = [0, 0, 0];
    let box: Rect = [Infinity, Infinity, -Infinity, -Infinity];
    const touch = new Map<string, number>();
    while (stack.length) {
      const m = stack.pop()!;
      mine.push(m);
      const i = m % nx;
      const j = (m - i) / nx;
      const [x, z] = at(i, j);
      count++;
      sx += x;
      sz += z;
      box = [Math.min(box[0], x), Math.min(box[1], z), Math.max(box[2], x), Math.max(box[3], z)];
      for (const [di, dj] of DIRS) {
        const c = get(i + di, j + dj);
        if (c === C.open) {
          const o = (j + dj) * nx + i + di;
          if (!patch[o]) {
            patch[o] = n;
            stack.push(o);
          }
          continue;
        }
        // Across the streets and sidewalks to what's there
        for (let k = 1; k * CELL <= REACH; k++) {
          const f = get(i + di * k, j + dj * k);
          if (isWay(f)) continue;
          if (f >= 0) touch.set(AREA_IDS[f], (touch.get(AREA_IDS[f]) ?? 0) + 1);
          break;
        }
      }
    }
    const area = count * CELL * CELL;
    if (area < GAP_MIN) continue;
    out.push({ n, area, box: box.map(Math.round) as Rect, at: nearest(map, mine, [sx / count, sz / count]), neighbours: [...touch].sort((p, q) => q[1] - p[1]).map(([id]) => id) });
  }
  out.sort((p, q) => q.area - p.area);
  const patchAt = (p: Pt) => {
    const [i, j] = [Math.floor((p[0] - map.x0) / CELL), Math.floor((p[1] - map.z0) / CELL)];
    return i >= 0 && j >= 0 && i < nx && j < nz ? patch[j * nx + i] : 0;
  };
  let unnamed = 0;
  return out.map(({ n, ...g }) => {
    const named = GAP_NAMES.find((k) => patchAt(k.at) === n);
    return named ? { id: named.id, name: named.name, ...g } : { id: `gap-${++unnamed}`, name: 'Unnamed', ...g };
  });
}

/** The share of the land inside the highway that's open (no district, street or water), 0-1 */
export function openShare(map: LandMap = landMap()) {
  let [open, inside] = [0, 0];
  for (let j = 0; j < map.nz; j++)
    for (let i = 0; i < map.nx; i++) {
      const c = map.get(i, j);
      if (c === C.outside) continue;
      const [x, z] = map.at(i, j);
      if (!insideHighway(x, z)) continue;
      inside++;
      if (isOpen(c)) open++;
    }
  return open / Math.max(1, inside);
}
