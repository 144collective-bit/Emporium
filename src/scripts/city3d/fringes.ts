/*
 * The leftover slivers inside the ring highway, dressed by their neighbours (docs/blend-plan.md Phase 5c;
 * DOM-free, tested in tests/fringes.test.ts). They're the land between the districts and the highway's verge, a few
 * tiles to thirty across, so they stay open land: no block, no street, nothing that moves.
 *
 * - **East of Kiln Lane** (Southfield Yards' side): the Kiln Lane substation, a palisade-fenced compound off the lane
 *   with its control house, two transformers, a steel gantry and busbars (`SUBSTATION`), a gravel drive to its gate.
 * - **Sunridge's fringe** (the suburb's side, between its wall and the highway): a dry wash winding the length of it
 *   (`WASH`, a sand and cobble bed, a culvert's headwall at each end, `HEADWALLS`) and a dirt path beside it
 *   (`FRINGE_PATH`) from Sunridge's footpath at Palm Court round to the north ring avenue, with two benches.
 * - **Billboards** facing the highway, one on each side of town (`BILLBOARDS`: fixed made-up copy, the city's own
 *   places, never a price).
 * - **Scrub** on all of them, wherever a tree could stand and a little closer to the highway (fringes3d.ts, which
 *   asks the clearing rule; Sunridge's desert plants on its fringe, brambles and grass elsewhere).
 *
 * Each is drawn by its neighbour's chunk (fringes3d.ts, from southfield3d.ts, sunridge3d.ts and westlake3d.ts); the
 * trees keep off what's built (landuse.ts `KEEPS`), and what's solid is `FRINGE_SOLIDS` (in `SOLIDS`). Every name
 * here is made up.
 */
import { HIGHWAY, fromHighway, insideHighway } from './highway';

export type Pt = [number, number];
export type Rect = [number, number, number, number];
type Box = [number, number, number, number, number];

/** Which sliver: the south band and east of Kiln Lane, Sunridge's fringe, Westlake's west verge, the north verge */
export type FringeId = 'south' | 'sunridge' | 'west' | 'north';
/** The land each one's scrub is scattered over (the clearing rule and the highway decide where, inside it) */
export const REGIONS: Record<FringeId, Rect> = {
  south: [69, 141, 273, 318],
  sunridge: [69, -168, 274, -5],
  west: [-213, -168, -138, -5],
  north: [-138, -168, -5, -154],
};

/** Nothing of the slivers' own comes nearer the highway's centre line than this: its lamps stand at 4.7 */
export const HIGHWAY_KEEP = 6;

/* ---------- East of Kiln Lane: the substation ---------- */

/** Kiln Lane's east edge (Southfield's ring, x 240, half 1.7: no sidewalk on its open side) */
const KILN_EDGE = 241.7;
/**
 * The Kiln Lane substation: the compound inside its palisade (`rect`), its gate in the west side facing the lane
 * (`gate`: z from, to) and the gravel drive to it; the control house in its south-west corner, the transformers, the
 * gantry's two portal frames (`frames`: x of each post pair's line, z of each) and the busbars' rows (`bars`: x of
 * each row, from z to z)
 */
export const SUBSTATION = {
  name: 'KILN LANE SUBSTATION',
  rect: [247, 162, 263, 186] as Rect,
  gate: [168, 172] as [number, number],
  drive: [KILN_EDGE + 0.1, 168.2, 247, 171.8] as Rect,
  fence: { h: 2.4, t: 0.2, post: 2.4 },
  house: { rect: [248.4, 162.8, 254.4, 167.2] as Rect, h: 3, door: 251.4 },
  transformers: [
    [256.6, 163.6, 259.8, 166.4],
    [256.6, 169.4, 259.8, 172.2],
  ] as Rect[],
  /** A transformer's body, its bushings' height over it */
  body: 2,
  bushing: 1.3,
  frames: { x: [249.6, 261.4], z: [176.5, 184.6], h: 6 },
  bars: { x: [252.5, 255.5, 258.5], z: [177.4, 183.7], h: 2.6 },
};

/* ---------- The billboards ---------- */

/** Fixed made-up copy, the city's own places (the atlas's cells, fringes3d.ts) */
export const BOARD_COPY = [
  { head: 'TAKE THE METRO', sub: 'EIGHT STATIONS · ONE CITY', bg: '#2a1440', fg: '#ff4fb4', ink: '#f6ecff' },
  { head: 'WESTLAKE PARK', sub: 'ROW ON THE LAKE', bg: '#173a2c', fg: '#ffd54a', ink: '#effae8' },
  { head: 'THE NEON MILE', sub: 'LIGHTS ALL NIGHT', bg: '#120d2e', fg: '#47e6ff', ink: '#ffe3fb' },
  { head: 'SKY WHEEL', sub: 'UPTOWN · SEE THE WHOLE CITY', bg: '#123158', fg: '#ffc94a', ink: '#f2f6ff' },
] as const;
/** A board's face (tiles: about 14 m by 4) and how high its bottom is */
export const BOARD = { w: 7.6, h: 2.2, y: 3.6, leg: 0.36 };
/** A billboard: its middle (on the ground), the way its face looks (unit, x z) and its copy (`BOARD_COPY`) */
export interface Billboard {
  id: string;
  at: Pt;
  face: Pt;
  copy: number;
}
/** The face turned off square to the highway towards its traffic (radians) */
const turn = (n: Pt, a: number): Pt => [n[0] * Math.cos(a) - n[1] * Math.sin(a), n[0] * Math.sin(a) + n[1] * Math.cos(a)];
export const BILLBOARDS: Billboard[] = [
  // East of Kiln Lane, facing the highway's east side
  { id: 'kiln', at: [266.6, 214], face: turn([1, 0], 0.42), copy: 0 },
  // The south band, on the inside of the highway's south-east bend
  { id: 'bend', at: [205 + 61.4 * Math.SQRT1_2, 250 + 61.4 * Math.SQRT1_2], face: turn([Math.SQRT1_2, Math.SQRT1_2], 0.42), copy: 1 },
  // Sunridge's fringe, facing the highway's north side (squarer: the wash is close behind it)
  { id: 'sunridge', at: [168, -162.4], face: turn([0, -1], 0.26), copy: 2 },
  // Westlake's west verge, facing the highway's west side (squarer: the park's hedge is close behind it)
  { id: 'west', at: [-207.4, -100], face: turn([-1, 0], 0.26), copy: 3 },
];
/** A board's two legs (a quarter of its width in from each end), on the ground */
export function legsOf(b: Billboard): Pt[] {
  const [ax, az] = [-b.face[1], b.face[0]];
  return [-1, 1].map((s) => [b.at[0] + ax * s * BOARD.w * 0.27, b.at[1] + az * s * BOARD.w * 0.27] as Pt);
}
/** A board's face's two ends (on the ground under it) */
export function endsOf(b: Billboard): [Pt, Pt] {
  const [ax, az] = [-b.face[1], b.face[0]];
  const h = BOARD.w / 2;
  return [
    [b.at[0] - ax * h, b.at[1] - az * h],
    [b.at[0] + ax * h, b.at[1] + az * h],
  ];
}

/* ---------- Sunridge's fringe: the wash and the path ---------- */

/** The highway's centre line every `step` tiles, with how far along it each point is and its normal into the town */
function highwaySamples(step: number) {
  const out: { p: Pt; s: number; n: Pt }[] = [];
  let s = 0;
  for (let i = 1; i < HIGHWAY.length; i++) {
    const [a, b] = [HIGHWAY[i - 1], HIGHWAY[i]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-9) continue;
    const [tx, tz] = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    let n: Pt = [-tz, tx];
    if (!insideHighway(a[0] + n[0] * 10, a[1] + n[1] * 10)) n = [tz, -tx];
    for (let d = out.length ? Math.ceil(s / step) * step - s : 0; d < l; d += step) out.push({ p: [a[0] + tx * d, a[1] + tz * d], s: s + d, n });
    s += l;
  }
  return out;
}
const SAMPLES = highwaySamples(2);
/** A line along the highway's inside, `off(s)` in from its centre line, over the stretch `keep` takes */
function along(off: (s: number) => number, keep: (p: Pt) => boolean): Pt[] {
  const out: Pt[] = [];
  for (const { p, s, n } of SAMPLES) {
    const d = off(s);
    const q: Pt = [p[0] + n[0] * d, p[1] + n[1] * d];
    if (keep(q)) out.push(q);
  }
  return out;
}

/** The wash's bed (tiles across) and its centre line: winding 10 to 14.4 in from the highway, from by Palm Court to above the north ring avenue */
export const WASH_W = 2.6;
export const WASH: Pt[] = along(
  (s) => 12.3 + 1.4 * Math.sin(s / 31) + 0.7 * Math.sin(s / 11 + 1),
  ([x, z]) => x >= 112 && z <= -30
);
/** A culvert's headwall at each end of the wash: where it stands and the way it faces (into the wash) */
export const HEADWALLS: { at: Pt; n: Pt }[] = [
  [WASH[0], WASH[1]],
  [WASH[WASH.length - 1], WASH[WASH.length - 2]],
].map(([a, b]) => {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return { at: a, n: [(b[0] - a[0]) / l, (b[1] - a[1]) / l] as Pt };
});
export const HEADWALL = { w: WASH_W + 1, t: 0.5, h: 0.8 };
/** A headwall's four corners on the ground: across the wash's end, its back to the culvert */
export function headwallCorners({ at, n }: { at: Pt; n: Pt }): Pt[] {
  const [ax, az] = [-n[1], n[0]];
  const hw = HEADWALL.w / 2;
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([u, v]) => [at[0] + ax * hw * u - n[0] * HEADWALL.t * (v + 1) * 0.5, at[1] + az * hw * u - n[1] * HEADWALL.t * (v + 1) * 0.5] as Pt);
}
/** The box round a headwall */
export function headwallRect(h: { at: Pt; n: Pt }): Rect {
  const c = headwallCorners(h);
  const xs = c.map((p) => p[0]);
  const zs = c.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
}

/** The path's width and its centre line: from Sunridge's footpath by Palm Court north up the strip between them, east along the fringe, round and down to the north ring avenue */
export const PATH_W = 1.4;
/** The strip between Palm Court's back and Sunridge's wall the path comes up (x), and where it meets the footpath (z) */
const STRIP_X = 103.9;
const FOOT_Z = -114;
/** Where the path squeezes between the end of Palm Court's low wall and Sunridge's corner, worn narrower there */
export const PATH_SQUEEZE: Pt = [104.62, -151.01];
const SQUEEZE_W = 0.9;
/** The path's width at a point on it */
export function pathWidth(x: number, z: number) {
  const d = Math.hypot(x - PATH_SQUEEZE[0], z - PATH_SQUEEZE[1]);
  return d < 1.2 ? SQUEEZE_W : d > 3 ? PATH_W : SQUEEZE_W + ((PATH_W - SQUEEZE_W) * (d - 1.2)) / 1.8;
}
/** How far in from the highway the path keeps (its wall is at about 20) */
const PATH_IN = 17.4;
const AVENUE_KERB = -8.2;
export const FRINGE_PATH: Pt[] = [
  [STRIP_X, FOOT_Z],
  // (up the strip while Sunridge is alongside, then squeezed round the end of Palm Court's low wall, verges.ts,
  // past Sunridge's corner, before turning east)
  [STRIP_X, -149.2],
  [104.62, -151.01],
  [105.4, -152.3],
  [106.6, -152.6],
  ...along(
    (s) => PATH_IN + 0.35 * Math.sin(s / 13),
    ([x, z]) => x >= 108 && z <= AVENUE_KERB - 1.4
  ),
];
// (on to the avenue's kerb, its last stretch straight)
FRINGE_PATH.push([FRINGE_PATH[FRINGE_PATH.length - 1][0], AVENUE_KERB - 0.7]);
/** Two benches beside the path facing the wash (their seat's middle and the way they face), and a bin by each */
export const FRINGE_BENCHES: { at: Pt; face: Pt }[] = [0.36, 0.72].map((t) => {
  const i = Math.round(4 + t * (FRINGE_PATH.length - 8));
  const [a, b] = [FRINGE_PATH[i - 1], FRINGE_PATH[i + 1]];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const p = FRINGE_PATH[i];
  // (towards the highway, where the wash is)
  let n: Pt = [(b[1] - a[1]) / l, -(b[0] - a[0]) / l];
  if (fromHighway(p[0] + n[0], p[1] + n[1]) > fromHighway(p[0], p[1])) n = [-n[0], -n[1]];
  return { at: [p[0] + n[0] * 1.3, p[1] + n[1] * 1.3], face: n };
});

/* ---------- What's solid ---------- */

const rectBox = (r: Rect, h: number): Box => [r[0], r[1], r[2], r[3], h];
/** The substation's palisade (the gate shut), its house; the billboards' legs; the headwalls */
export const FRINGE_SOLIDS: Box[] = (() => {
  const S = SUBSTATION;
  const [x0, z0, x1, z1] = S.rect;
  const t = S.fence.t / 2;
  const h = S.fence.h;
  const out: Box[] = [
    [x0 - t, z0 - t, x1 + t, z0 + t, h],
    [x0 - t, z1 - t, x1 + t, z1 + t, h],
    [x1 - t, z0 - t, x1 + t, z1 + t, h],
    [x0 - t, z0 - t, x0 + t, z1 + t, h],
    rectBox(S.house.rect, S.house.h),
  ];
  for (const b of BILLBOARDS) for (const [x, z] of legsOf(b)) out.push([x - BOARD.leg / 2, z - BOARD.leg / 2, x + BOARD.leg / 2, z + BOARD.leg / 2, BOARD.y + BOARD.h + 0.4]);
  for (const h of HEADWALLS) {
    const [x0, z0, x1, z1] = headwallRect(h);
    out.push([x0, z0, x1, z1, HEADWALL.h]);
  }
  return out;
})();

/** What the outskirts' trees keep off of these (landuse.ts): the compound and its drive, each board, the wash and the path */
export const FRINGE_KEEPS = {
  rects: [
    [SUBSTATION.rect[0], SUBSTATION.rect[1], SUBSTATION.rect[2], SUBSTATION.rect[3]] as Rect,
    SUBSTATION.drive,
    ...BILLBOARDS.map((b) => {
      const [p, q] = endsOf(b);
      return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])] as Rect;
    }),
  ],
  lines: [
    { id: 'wash', pts: WASH, half: WASH_W / 2 },
    { id: 'fringe-path', pts: FRINGE_PATH, half: PATH_W / 2 },
  ],
};

/** The distance from a point to a polyline */
export function lineDist(pts: readonly Pt[], x: number, z: number) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
    const l2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l2));
    best = Math.min(best, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
  }
  return best;
}
/**
 * Whether x, z is on (or within `pad` of) anything of the slivers' own: the compound and its drive, a board, the
 * wash and its headwalls, the path, a bench (the scrub keeps off)
 */
export function onFringe(x: number, z: number, pad = 0) {
  for (const r of FRINGE_KEEPS.rects) if (x > r[0] - pad && x < r[2] + pad && z > r[1] - pad && z < r[3] + pad) return true;
  for (const l of FRINGE_KEEPS.lines) if (lineDist(l.pts, x, z) < l.half + pad) return true;
  for (const h of HEADWALLS) if (Math.hypot(x - h.at[0], z - h.at[1]) < HEADWALL.w / 2 + 0.6 + pad) return true;
  for (const b of FRINGE_BENCHES) if (Math.hypot(x - b.at[0], z - b.at[1]) < 1.6 + pad) return true;
  return false;
}
