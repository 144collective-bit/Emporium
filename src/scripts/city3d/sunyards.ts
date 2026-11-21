/**
 * Sunridge's yards (docs/suburb-plan.md Phase 3, the owner's call: a desert-and-green mix, block-walled back yards with
 * pools). DOM-free, the chunk's (sunyards3d.ts draws them; tests/sunyards.test.ts), each in its house's frame
 * (sunhouses.ts `toWorld()`: u along the street, v in from it):
 *
 * - **The front yard** (`front`): desert (decomposed granite, `GROUNDS`, with agave, barrel cactus, prickly pear,
 *   ocotillo, a saguaro now and then, a palo verde and boulders) or lawn (with a palm or a shade tree, shrubs along the
 *   house, a flower bed), about half each, never the same as both neighbours; the pieces of ground either side of the
 *   driveway (`ground`), the plants on them (`plants`), the bins by the garage (`bins`).
 * - **The block walls** (`WALLS`, world numbers): along every lot's sides from a little behind the house's front to its
 *   back and along its back, one wall where two lots meet (the one on the right of the pair draws it), none where the
 *   perimeter wall already stands; a return from the house to the side line each side, with a gate (`gates`).
 * - **The back yard** (`back`): a patio off the house, a ramada over it on some (`ramada`), a grill, a pool on about
 *   one in three with its coping and loungers (`pool`), a trampoline, a swing set or a shed on some (`extras`).
 *
 * `YARD_SOLIDS`: the walls (cells along them) and the sheds, joined to the grids when the chunk loads.
 */
import { HOUSES, across, depthAt, frameOf, toWorld, type House } from './sunhouses';
import { LOTS, type Lot } from './sunridgelots';
import { SUN_BLOCKS, WALL_RUNS, distTo, inside as inBlock, type Pt } from './sunridge';
import { rng } from './recipes';

/** The block walls: their height over the lot (about 1.8 m), their thickness */
export const BLOCK = { h: 1.0, t: 0.16 } as const;
/** How far behind the house's front the side walls start (where the return walls meet the house) */
export const RETURN_BACK = 1.2;
/** The desert yards' ground: decomposed granite, tan, rose or gold */
export const GROUNDS = ['#b8956a', '#b58a73', '#c2a36c'] as const;

export type PlantKind = 'agave' | 'barrel' | 'pear' | 'ocotillo' | 'saguaro' | 'paloverde' | 'boulder' | 'palm' | 'shade' | 'shrub' | 'bed';
export interface Plant {
  kind: PlantKind;
  u: number;
  v: number;
  s: number;
}
export type Extra = 'trampoline' | 'swing' | 'shed';
export interface Yard {
  house: string;
  front: 'desert' | 'lawn';
  groundTone: number;
  /** The front ground's pieces: quads in the frame (u, v) */
  ground: Pt[][];
  /** The driveway: its outline in the frame (u, v), from the garage door to the sidewalk, its street end following
   * the sidewalk's edge and flared out to it with rounded corners (Phase 7: no gap of bare ground, nothing on the
   * sidewalk) */
  drive: Pt[];
  /** A lawn's turf, an island on each piece with room for one (Phase 7: soft wandering edges, the piece's gravel round it); none for a desert front */
  islands: Pt[][];
  plants: Plant[];
  bins: { u: number; v: number };
  /** The back yard: across (u0..u1) and from the house (v0) to the back wall (v1) */
  back: [number, number, number, number];
  patio: [number, number, number, number];
  ramada: boolean;
  grill: { u: number; v: number };
  pool?: { u0: number; u1: number; v0: number; v1: number };
  extras: { kind: Extra; u: number; v: number }[];
  /** The return walls' gates: where (u, v) and how wide */
  gates: { u0: number; u1: number; v: number }[];
}

/** The parts' outer edges across at a depth (the house's sides there) */
function sidesAt(h: House, v: number): [number, number] | null {
  const ps = h.parts.filter((p) => v >= p.v0 - 1e-9 && v <= p.v1 + 1e-9);
  if (!ps.length) return null;
  return [Math.min(...ps.map((p) => p.u0)), Math.max(...ps.map((p) => p.u1))];
}
/** The house's front across a span of u: the nearest face to the street over it (or where the side walls start) */
function frontOver(h: House, u0: number, u1: number, side: number) {
  const ps = h.parts.filter((p) => p.u1 > u0 + 0.05 && p.u0 < u1 - 0.05);
  return ps.length ? Math.min(...ps.map((p) => p.v0)) : side;
}

const houseOf = new Map(HOUSES.map((h) => [h.lot, h]));
const lotOf = new Map(LOTS.map((l) => [l.id, l]));
/** Where a house's side walls start: a little behind its main front */
const sideStart = (h: House) => h.parts.find((p) => p.kind === 'main')!.v0 + RETURN_BACK;

/* ---------- The front's edges (docs/suburb-plan.md Phase 7: no hard rectangles of lawn) ---------- */

/** How far a lawn's turf keeps in from its piece's edges: the sidewalk's, the lot lines' and the driveway's, the house's */
export const ISLAND_IN = { street: 0.16, side: 0.34, house: 0.3 } as const;
/** How far its edge wanders further in, at most */
export const WANDER = 0.13;
/** Where two lines cross (each a point and a direction) */
function cross(p: Pt, d: Pt, q: Pt, e: Pt): Pt {
  const den = d[0] * e[1] - d[1] * e[0];
  const t = Math.abs(den) < 1e-9 ? 0 : ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den;
  return [p[0] + d[0] * t, p[1] + d[1] * t];
}
/**
 * A lawn's turf on a piece of the front (a quad: the street's edge, a side, the house's edge, the other side): the
 * piece moved in from each edge (`ISLAND_IN`), its edges wandering a little further in and its corners rounded, so the
 * turf reads as a lawn laid in its gravel, not a rectangle of colour. Inside the piece, every point.
 */
export function islandOf(q: Pt[], seed: number): Pt[] {
  // (the quad's edges in order: [0]-[1] the street's (v the least), [1]-[2] a side, [2]-[3] the house's, [3]-[0] a side)
  const ins = [ISLAND_IN.street, ISLAND_IN.side, ISLAND_IN.house, ISLAND_IN.side];
  const cx = q.reduce((a, p) => a + p[0], 0) / 4;
  const cz = q.reduce((a, p) => a + p[1], 0) / 4;
  const lines = q.map((a, i) => {
    const b = q[(i + 1) % 4];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const d: Pt = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    let n: Pt = [-d[1], d[0]];
    if ((cx - a[0]) * n[0] + (cz - a[1]) * n[1] < 0) n = [d[1], -d[0]];
    return { p: [a[0] + n[0] * ins[i], a[1] + n[1] * ins[i]] as Pt, d, n };
  });
  const corners = lines.map((L, i) => cross(lines[(i + 3) % 4].p, lines[(i + 3) % 4].d, L.p, L.d));
  // Each edge in short steps, each step pushed in by a wander (never out: it stays inside)
  let pts: Pt[] = [];
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % 4];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(2, Math.round(l / 0.3));
    const { n: nn } = lines[i];
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const w = WANDER * 0.5 * (1 + Math.sin(seed * 1.7 + i * 2.3 + t * l * 1.9)) * Math.sin(Math.PI * t);
      pts.push([a[0] + (b[0] - a[0]) * t + nn[0] * w, a[1] + (b[1] - a[1]) * t + nn[1] * w]);
    }
  });
  // Rounded corners (Chaikin's cutting, twice: each cut a quarter in, so the shape only shrinks)
  for (let r = 0; r < 2; r++)
    pts = pts.flatMap((a, i) => {
      const b = pts[(i + 1) % pts.length];
      return [
        [a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25],
        [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75],
      ] as Pt[];
    });
  return pts;
}

/** Whether an island lies inside its piece with some turf to it (a sliver's would cross itself) */
function fits(isl: Pt[], piece: Pt[]) {
  const a = isl.reduce((t, p, i) => t + p[0] * isl[(i + 1) % isl.length][1] - isl[(i + 1) % isl.length][0] * p[1], 0) / 2;
  const b = piece.reduce((t, p, i) => t + p[0] * piece[(i + 1) % piece.length][1] - piece[(i + 1) % piece.length][0] * p[1], 0) / 2;
  // (wound the piece's way, a fair share of it, every point inside)
  return Math.sign(a) === Math.sign(b) && Math.abs(a) > 0.6 && isl.every((p) => inside(piece, p));
}
/* ---------- The driveway and the front out to the sidewalk (Phase 7) ---------- */

const blockOf = new Map(SUN_BLOCKS.map((b) => [b.id, b.poly]));
/** How far out the driveway flares at the sidewalk, each side, its corners rounded (at most: never past the lot's sides) */
export const FLARE = 0.32;
/**
 * Where the sidewalk's edge is across a lot's front at u, as v (0 on the front; less where the edge bows out past it,
 * round a turning circle; more where it bows in): along the frame's v from the front to where the block's own ground
 * (its outline, the sidewalk's inner edge) ends
 */
export function streetV(h: House, block: Pt[], u: number): number {
  const [px, pz] = toWorld(h, u, 0);
  const [qx, qz] = toWorld(h, u, -1);
  const [dx, dz] = [qx - px, qz - pz];
  const at = (t: number): Pt => [px + dx * t, pz + dz * t];
  if (inBlock(block, at(0))) {
    let t = 0;
    while (t < 2 && inBlock(block, at(t + 0.01))) t += 0.01;
    return -t;
  }
  let t = 0;
  while (t < 2 && !inBlock(block, at(-t - 0.01))) t += 0.01;
  return t + 0.01;
}
/** Points along the street edge from u0 to u1 (v at each from `edge`), a step about a fifth of a tile */
function along(u0: number, u1: number, edge: (u: number) => number): Pt[] {
  const n = Math.max(1, Math.ceil(Math.abs(u1 - u0) / 0.2));
  return Array.from({ length: n + 1 }, (_, k) => {
    const u = u0 + ((u1 - u0) * k) / n;
    return [u, edge(u)] as Pt;
  });
}
/**
 * The driveway's outline: up its sides from the garage door, each flaring out at the sidewalk in a quarter round
 * (`fl`, `fr`: its reach each side), along the sidewalk's edge between
 */
function driveOf(h: House, d0: number, d1: number, fl: number, fr: number, edge: (u: number) => number): Pt[] {
  const top = h.garageDoor.v;
  const N = 6;
  // (a quarter round from the side down to the sidewalk's edge, set off from the edge where it is)
  const flare = (side: number, x: number, r: number): Pt[] =>
    r < 1e-6
      ? [[x, edge(x)]]
      : Array.from({ length: N + 1 }, (_, k) => {
      const a = ((side < 0 ? k : N - k) / N) * (Math.PI / 2);
      const u = x + side * (r - r * Math.cos(a));
      const v = r - r * Math.sin(a);
          return [u, v + edge(u)] as Pt;
        });
  return [[d0, top], ...flare(-1, d0, fl), ...along(d0 - fl, d1 + fr, edge).slice(1, -1), ...flare(1, d1, fr), [d1, top]];
}

function lay(): Yard[] {
  const out: Yard[] = [];
  const rand = rng(9431);
  let prev: Yard['front'] | null = null;
  let prev2: Yard['front'] | null = null;
  for (const h of HOUSES) {
    const f = frameOf(lotOf.get(h.lot)!);
    let front: Yard['front'] = rand() < 0.55 ? 'desert' : 'lawn';
    if (prev === front && prev2 === front) front = front === 'desert' ? 'lawn' : 'desert';
    [prev2, prev] = [prev, front];
    const garage = h.parts.find((p) => p.kind === 'garage')!;
    const main = h.parts.find((p) => p.kind === 'main')!;
    const ss = sideStart(h);
    const [d0, d1] = h.drive;
    // The front ground either side of the driveway: from the lot's side line to the driveway, and from it to the other side
    const quad = (ua: (v: number) => number, ub: (v: number) => number, v0: number, v1: number): Pt[] => [
      [ua(v0), v0],
      [ub(v0), v0],
      [ub(v1), v1],
      [ua(v1), v1],
    ];
    const L = (v: number) => across(f, v)[0] + 0.02;
    const R = (v: number) => across(f, v)[1] - 0.02;
    const ground: Pt[][] = [];
    const leftFront = frontOver(h, L(0), d0, ss);
    const rightFront = frontOver(h, d1, R(0), ss);
    if (d0 - L(0) > 0.3) ground.push(quad(L, () => d0, 0, Math.min(leftFront, ss)));
    if (R(0) - d1 > 0.3) ground.push(quad(() => d1, R, 0, Math.min(rightFront, ss)));
    // (and the side yards in front of the return walls)
    for (const side of [-1, 1]) {
      const s = sidesAt(h, ss - 0.01) ?? [main.u0, main.u1];
      const edge = side < 0 ? L : R;
      const wall = side < 0 ? s[0] : s[1];
      const fr = frontOver(h, Math.min(edge(ss), wall), Math.max(edge(ss), wall), ss);
      if (Math.abs(edge(ss) - wall) > 0.15 && fr < ss - 0.05) ground.push(side < 0 ? quad(L, () => wall, fr, ss) : quad(() => wall, R, fr, ss));
    }
    // The plants on it: clear of the driveway, the walk, the house's front and each other
    const plants: Plant[] = [];
    const [, , wv0, wv1] = h.walk;
    const clear = (u: number, v: number, r: number) =>
      u > L(v) + r &&
      u < R(v) - r &&
      v > r + 0.1 &&
      !(u > d0 - r && u < d1 + r && v < h.garageDoor.v + r) &&
      !(Math.abs(u - h.door.u) < 0.35 + r && v > wv0 - r && v < wv1 + r) &&
      !(v > wv0 - r && v < wv0 + 0.7 + r && u > Math.min(h.door.u, d0, d1) - r && u < Math.max(h.door.u, d0, d1) + r) &&
      !h.parts.some((p) => u > p.u0 - r - 0.15 && u < p.u1 + r + 0.15 && v > p.v0 - r - 0.15) &&
      plants.every((q) => Math.hypot(q.u - u, q.v - v) > r + 0.35 * q.s + 0.15);
    const place = (kind: PlantKind, r: number, s: number, tries = 30) => {
      for (let k = 0; k < tries; k++) {
        const v = 0.3 + rand() * (Math.max(leftFront, rightFront) - 0.6);
        const [a, b] = [L(v), R(v)];
        const u = a + rand() * (b - a);
        if (clear(u, v, r)) {
          plants.push({ kind, u, v, s });
          return true;
        }
      }
      return false;
    };
    if (front === 'desert') {
      const tree = rand() < 0.75 ? 'paloverde' : 'saguaro';
      // (a smaller one where a front's too tight for a full-grown one)
      if (!place(tree, 0.5, 0.9 + rand() * 0.3, 40)) place(tree, 0.32, 0.75, 40);
      const n = 4 + Math.floor(rand() * 4);
      const kinds: PlantKind[] = ['agave', 'barrel', 'pear', 'ocotillo', 'boulder', 'agave', 'boulder'];
      for (let k = 0; k < n; k++) place(kinds[Math.floor(rand() * kinds.length)], 0.22, 0.8 + rand() * 0.5);
    } else {
      const tree = rand() < 0.5 ? 'palm' : 'shade';
      if (!place(tree, 0.45, 0.9 + rand() * 0.3, 40)) place(tree, 0.3, 0.75, 40);
      // Shrubs along the rooms' front, a flower bed
      const [ru0, ru1] = h.mirror ? [garage.u1, main.u1] : [main.u0, garage.u0];
      for (let u = ru0 + 0.35; u < ru1 - 0.3; u += 0.7) {
        const v = main.v0 - 0.45;
        if (clear(u, v, 0.18)) plants.push({ kind: 'shrub', u, v, s: 0.8 + rand() * 0.4 });
      }
      place('bed', 0.4, 1);
    }
    // The bins beside the garage, on the driveway's edge by the house
    const gs = h.mirror ? -1 : 1;
    const bins = { u: gs < 0 ? garage.u0 + 0.35 : garage.u1 - 0.35, v: garage.v0 - 0.35 };
    // The back yard: across between the side walls, from the house's back to the lot's back
    const vb = Math.max(...h.parts.map((p) => p.v1));
    const backV = Math.min(depthAt(f, across(f, vb)[0] + 0.3), depthAt(f, across(f, vb)[1] - 0.3)) - 0.15;
    const [bu0, bu1] = [across(f, vb)[0] + 0.15, across(f, vb)[1] - 0.15];
    const back: Yard['back'] = [bu0, vb, bu1, backV];
    const depth = backV - vb;
    const patio: Yard['patio'] = [main.u0 + 0.2, main.v1, Math.min(main.u1 - 0.2, main.u0 + 3.4), main.v1 + Math.min(1.3, depth * 0.45)];
    const ramada = rand() < 0.55;
    const grill = { u: patio[2] - 0.35, v: patio[3] - 0.3 };
    let pool: Yard['pool'];
    if (depth > 2.5 && bu1 - bu0 > 4 && rand() < 0.42) {
      const pd = Math.min(1.9, depth - 1.6);
      const pw = Math.min(3.6, bu1 - bu0 - 1.4);
      if (pd > 1.1) {
        const pu = (bu0 + bu1) / 2 + (rand() - 0.5) * (bu1 - bu0 - pw - 1.4);
        pool = { u0: pu - pw / 2, u1: pu + pw / 2, v0: backV - 0.5 - pd, v1: backV - 0.5 };
      }
    }
    const extras: Yard['extras'] = [];
    const room = (u: number, v: number, r: number) => u > bu0 + r && u < bu1 - r && v > patio[3] + r && v < backV - r && !(pool && u > pool.u0 - r - 0.3 && u < pool.u1 + r + 0.3 && v > pool.v0 - r - 0.3);
    for (const kind of ['shed', 'trampoline', 'swing'] as const) {
      if (rand() > (kind === 'shed' ? 0.3 : kind === 'trampoline' ? 0.2 : 0.15)) continue;
      const r = kind === 'trampoline' ? 0.75 : kind === 'swing' ? 0.8 : 0.55;
      const u = rand() < 0.5 ? bu0 + r + 0.05 : bu1 - r - 0.05;
      const v = backV - r - 0.05;
      if (room(u, v, r - 0.01) && extras.every((e) => Math.hypot(e.u - u, e.v - v) > r + 0.9)) extras.push({ kind, u, v });
    }
    // The gates in the return walls: in the side yard on the rooms' side, and on the garage's
    const gates: Yard['gates'] = [];
    const s = sidesAt(h, ss - 0.01) ?? [main.u0, main.u1];
    for (const [a, b] of [
      [L(ss), s[0]],
      [s[1], R(ss)],
    ]) {
      const w = b - a;
      if (w > 0.45) gates.push({ u0: a + Math.max(0.05, (w - 0.75) / 2), u1: b - Math.max(0.05, (w - 0.75) / 2), v: ss });
    }
    // (a sliver too narrow for turf stays gravel: its island would turn inside out)
    // The front's street edge out to the sidewalk's (Phase 7): round a turning circle or a bend the lot's front is a
    // chord and the sidewalk's edge an arc, so the ground and the driveway are carried to it
    const block = blockOf.get(lotOf.get(h.lot)!.block)!;
    const edge = (u: number) => streetV(h, block, u);
    const toEdge = (g: Pt[]) => (g[0][1] === 0 && g[1][1] === 0 ? [...along(g[0][0], g[1][0], edge), ...g.slice(2)] : g);
    // (the turf on a piece's quad, its street side moved in past where the sidewalk's edge bows into the lot)
    const inFrom = (g: Pt[]): Pt[] => {
      if (g[0][1] !== 0 || g[1][1] !== 0) return g;
      const v = Math.max(0, ...along(g[0][0], g[1][0], edge).map((p) => p[1]));
      return [[g[0][0], v], [g[1][0], v], g[2], g[3]];
    };
    const islands =
      front === 'lawn'
        ? ground
            .map(inFrom)
            .map((g, k) => islandOf(g, out.length * 7 + k))
            .filter((isl, k) => fits(isl, inFrom(ground[k])))
        : [];
    const drive = driveOf(h, d0, d1, Math.max(0, Math.min(FLARE, d0 - L(0) - 0.05)), Math.max(0, Math.min(FLARE, R(0) - d1 - 0.05)), edge);
    out.push({ house: h.id, front, groundTone: Math.floor(rand() * GROUNDS.length), ground: ground.map(toEdge), drive, islands, plants, bins, back, patio, ramada, grill, pool, extras, gates });
  }
  return out;
}
export const YARDS: Yard[] = lay();

/* ---------- The walls ---------- */

export interface WallSeg {
  a: Pt;
  b: Pt;
  /** A gate across part of it (from and to, along it, 0-1) */
  gate?: [number, number];
}
const near = (p: Pt, q: Pt, m: number) => Math.hypot(p[0] - q[0], p[1] - q[1]) < m;
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** Where along a lot's side (front to back) a house's side walls start */
const sideT = (l: Lot, h: House | undefined, side: 0 | 1) => {
  if (!h) return 0.35;
  const f = frameOf(l);
  const back = side === 0 ? f.bl : f.br;
  return Math.min(0.9, sideStart(h) / Math.max(1, back[1]));
};

function walls(): WallSeg[] {
  const out: WallSeg[] = [];
  const onPerimeter = (a: Pt, b: Pt) => [a, b, lerp(a, b, 0.5)].every((p) => WALL_RUNS.some((r) => distTo(r, p) < 0.8));
  const rears: [Pt, Pt][] = [];
  for (const l of LOTS) {
    const h = houseOf.get(l.id);
    // Its right side, always (from where the walls start, behind the house's front, to the back); its left side
    // only where no lot's right side is there already
    const right = LOTS.find((q) => q !== l && near(q.front[0], l.front[1], 0.05));
    const left = LOTS.find((q) => q !== l && near(q.front[1], l.front[0], 0.05));
    const tR = Math.min(sideT(l, h, 1), right ? sideT(right, houseOf.get(right.id), 0) : 1);
    const segR: [Pt, Pt] = [lerp(l.front[1], l.back[1], tR), l.back[1]];
    if (!onPerimeter(...segR)) out.push({ a: segR[0], b: segR[1] });
    if (!left) {
      const segL: [Pt, Pt] = [lerp(l.front[0], l.back[0], sideT(l, h, 0)), l.back[0]];
      if (!onPerimeter(...segL)) out.push({ a: segL[0], b: segL[1] });
    }
    // Its back, unless the perimeter wall stands there or a lot before it walled the same line
    const rear: [Pt, Pt] = [l.back[0], l.back[1]];
    const mid = lerp(...rear, 0.5);
    if (!onPerimeter(...rear) && !rears.some(([a, b]) => distTo([a, b], mid) < 0.45)) out.push({ a: rear[0], b: rear[1] });
    rears.push(rear);
    // The returns from the house's sides to the lot's side lines, each with its gate
    if (h) {
      const y = YARDS.find((q) => q.house === h.id)!;
      for (const g of y.gates) {
        const f = frameOf(l);
        const [a0, a1] = across(f, g.v);
        // (which side: the gate nearer the lot's left or right line)
        const leftSide = Math.abs(g.u0 - (a0 + 0.02)) < Math.abs(g.u1 - (a1 - 0.02));
        const [ua, ub] = leftSide ? [a0, h.parts.reduce((m, p) => (g.v >= p.v0 && g.v <= p.v1 ? Math.min(m, p.u0) : m), Infinity)] : [h.parts.reduce((m, p) => (g.v >= p.v0 && g.v <= p.v1 ? Math.max(m, p.u1) : m), -Infinity), a1];
        if (!Number.isFinite(ua) || !Number.isFinite(ub) || ub - ua < 0.2) continue;
        const span = ub - ua;
        out.push({ a: toWorld(h, ua, g.v), b: toWorld(h, ub, g.v), gate: [(g.u0 - ua) / span, (g.u1 - ua) / span] });
      }
    }
  }
  return out;
}
export const WALLS: WallSeg[] = walls();

type Box = [number, number, number, number, number];
/** What of the yards is solid: the walls (cells a tile long along them) and the sheds; the lots' ground is world.ts SLAB, 0.15 */
export const YARD_SOLIDS: Box[] = (() => {
  const out: Box[] = [];
  const t = BLOCK.t / 2;
  for (const w of WALLS) {
    const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
    const n = Math.max(1, Math.ceil(L));
    const axis = Math.abs(w.b[0] - w.a[0]) < 1e-6 || Math.abs(w.b[1] - w.a[1]) < 1e-6;
    for (let k = 0; k < (axis ? 1 : n); k++) {
      const [p, q] = axis ? [w.a, w.b] : [lerp(w.a, w.b, k / n), lerp(w.a, w.b, (k + 1) / n)];
      out.push([Math.min(p[0], q[0]) - t, Math.min(p[1], q[1]) - t, Math.max(p[0], q[0]) + t, Math.max(p[1], q[1]) + t, 0.15 + BLOCK.h]);
    }
  }
  for (const y of YARDS) {
    const h = HOUSES.find((q) => q.id === y.house)!;
    for (const e of y.extras)
      if (e.kind === 'shed') {
        const c = [toWorld(h, e.u - 0.5, e.v - 0.4), toWorld(h, e.u + 0.5, e.v + 0.4), toWorld(h, e.u - 0.5, e.v + 0.4), toWorld(h, e.u + 0.5, e.v - 0.4)];
        out.push([Math.min(...c.map((p) => p[0])), Math.min(...c.map((p) => p[1])), Math.max(...c.map((p) => p[0])), Math.max(...c.map((p) => p[1])), 0.15 + 1.2]);
      }
  }
  return out;
})();

/* ---------- The lawns' sprinklers (docs/suburb-plan.md Phase 7) ---------- */

/**
 * A front lawn's sprinkler: a pop-up rotor on the lawn's biggest turf island, the spot on it furthest from its edges and
 * its plants (world x, z), and how far its spray reaches (inside the lawn, about). `phase` sets it apart from its
 * neighbours. sunyards3d.ts draws the spray turning while it's on: by day, not in the rain, as the sprinklers are
 * heard (sound.ts), each on for `SPRINKLE.on` of every `SPRINKLE.period`, on the clock, the same for everyone.
 */
export interface Sprinkler {
  house: string;
  x: number;
  z: number;
  r: number;
  phase: number;
}
/** Each on for three minutes in every nine (about a third of them at once), its spray round once in six seconds */
export const SPRINKLE = { period: 540, on: 180, turn: 6 } as const;

/** Whether p is inside a polygon (u, v) */
function inside(poly: Pt[], p: Pt) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [a, b] = [poly[i], poly[j]];
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
/** How far p is from a polygon's edges */
function edgeDist(poly: Pt[], p: Pt) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [a, b] = [poly[i], poly[(i + 1) % poly.length]];
    const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
    const k = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(p[0] - a[0] - dx * k, p[1] - a[1] - dz * k));
  }
  return best;
}
const area = (poly: Pt[]) => Math.abs(poly.reduce((s, p, i) => s + p[0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * p[1], 0)) / 2;
/** How far a sprinkler's head keeps from a plant's middle, and the spray's reach either way */
export const HEAD_CLEAR = 0.6;
export const REACH = [0.6, 1.8] as const;

export const SPRINKLERS: Sprinkler[] = (() => {
  const out: Sprinkler[] = [];
  YARDS.forEach((y, i) => {
    if (y.front !== 'lawn' || !y.islands.length) return;
    const h = HOUSES.find((q) => q.id === y.house)!;
    // (on the lawn's biggest turf island, so its spray lands on the grass)
    const piece = [...y.islands].sort((a, b) => area(b) - area(a))[0];
    const us = piece.map((p) => p[0]);
    const vs = piece.map((p) => p[1]);
    // (the spot furthest from the edges and the plants, on a grid over the piece)
    let best: { p: Pt; score: number } | null = null;
    for (let u = Math.min(...us); u <= Math.max(...us); u += 0.2)
      for (let v = Math.min(...vs); v <= Math.max(...vs); v += 0.2) {
        const p: Pt = [u, v];
        if (!inside(piece, p)) continue;
        const plant = Math.min(Infinity, ...y.plants.map((q) => Math.hypot(q.u - u, q.v - v)));
        if (plant < HEAD_CLEAR) continue;
        const score = Math.min(edgeDist(piece, p), plant);
        if (!best || score > best.score) best = { p, score };
      }
    if (!best) return;
    const [x, z] = toWorld(h, best.p[0], best.p[1]);
    out.push({ house: y.house, x, z, r: Math.min(REACH[1], Math.max(REACH[0], edgeDist(piece, best.p) - 0.1)), phase: (i * 97) % SPRINKLE.period });
  });
  return out;
})();
/** Whether a sprinkler's on at t (seconds, the clock's) */
export const sprinklerOn = (s: Sprinkler, t: number) => (((t + s.phase) % SPRINKLE.period) + SPRINKLE.period) % SPRINKLE.period < SPRINKLE.on;
/** Which way its spray points at t (radians about y) */
export const sprayAt = (s: Sprinkler, t: number) => (((t + s.phase) / SPRINKLE.turn) % 1) * Math.PI * 2;
