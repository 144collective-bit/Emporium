/*
 * The ground round Endswood's blocks (docs/south-plan.md Phase 2, step 2d; the owner's calls, 2026-11-14: parking
 * courts with cars, bins and bike sheds; grass with desire lines and a few trees; a 70s concrete play area; planters
 * and benches on the podium deck). DOM-free, tested in tests/southyard.test.ts; the courts', grass's and play area's
 * outlines are southblocks.ts's, drawn by southblocks3d.ts, the cars by cars.ts `parkedCars()`, the trees at the boot.
 */
import { BRIDGES, COURTS, DECKS, DESIRE_LINES, GRASS, PLAY, inBlock, outward, type Box, type Pt } from './southblocks';
import { distTo, inside } from './streetfaces';
import { carBox } from './lot9';
import type { CarId } from './carspec';

/* ---------- The parking bays and the cars in them ---------- */

/** A bay: its middle, the way a car in it faces (yaw: 0 faces east, π/2 north), and its court */
export interface Bay {
  x: number;
  z: number;
  yaw: number;
  court: string;
}
export const BAY = { w: 2.5, d: 4.4 };
/** A row of bays: from its first bay's middle `n` bays on along `step` (x, z), the cars facing `yaw` */
const row = (court: string, from: Pt, step: Pt, n: number, yaw: number): Bay[] => Array.from({ length: n }, (_, i) => ({ x: from[0] + step[0] * i, z: from[1] + step[1] * i, yaw, court }));
/** A bay's four corners */
export function bayCorners(b: Bay): Pt[] {
  const [c, s] = [Math.cos(b.yaw), -Math.sin(b.yaw)];
  const [l, w] = [BAY.d / 2, BAY.w / 2];
  return [[l, w], [-l, w], [-l, -w], [l, -w]].map(([u, v]): Pt => [b.x + u * c - v * s, b.z + u * s + v * c]);
}
const CANDIDATES: Bay[] = [
  // Behind the Rampart: a row along the court's north side, nosed in (north), the aisle south of them
  ...row('court-rampart', [-96, 355.2], [2.5, 0], 28, Math.PI / 2),
  // North of Sorrel: a row each side of the aisle, nosed west and east
  ...row('court-sorrel', [6.1, 399.5], [0, 2.5], 7, Math.PI),
  ...row('court-sorrel', [13.4, 395], [0, 2.5], 5, 0),
  // Between Teasel and Fennel: a row along the way in off Marsh Lane, nosed east
  ...row('court-podium', [-22.2, 419], [0, 2.5], 8, 0),
];
/** Is a bay wholly inside its court, a hand's breadth in from its edge, clear of the blocks and the deck's columns */
const fits = (b: Bay) => {
  const poly = COURTS.find((c) => c.id === b.court)!.poly;
  return bayCorners(b).every((p) => inside(poly, p) && distTo(poly, p, true) > 0.15 && !inBlock(p, 0.3));
};
export const BAYS: Bay[] = CANDIDATES.filter(fits);

const MODELS: CarId[] = ['hatch', 'sedan', 'pickup', 'van', 'coupe', 'suv'];
const COLOURS = ['#e23b3b', '#2aabee', '#ffd23f', '#f3f2f7', '#8000ff', '#1fbf6b', '#ff8a3d', '#2b2d3a', '#7fe0d0', '#a3804f'];
const seeded = (seed: number) => {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};
/** The cars parked: about two bays in three, seeded (the same every time) */
export const YARD_CARS: [CarId, number, number, number, string, string][] = (() => {
  const r = seeded(141126);
  return BAYS.flatMap((b): [CarId, number, number, number, string, string][] => (r() > 0.66 ? [] : [[MODELS[Math.floor(r() * MODELS.length)], b.x, b.z, b.yaw + (r() < 0.15 ? Math.PI : 0), COLOURS[Math.floor(r() * COLOURS.length)], b.court]]));
})();

/* ---------- Bins, bike sheds ---------- */

/** A thing on the ground: its middle, its turn (radians, from +x towards +z), its size along and across, its height */
export interface Thing {
  kind: 'bins' | 'shed' | 'frame' | 'sandpit' | 'court' | 'planter' | 'bench';
  at: Pt;
  rot: number;
  w: number;
  d: number;
  h: number;
}
const thing = (kind: Thing['kind'], at: Pt, w: number, d: number, h: number, rot = 0): Thing => ({ kind, at, rot, w, d, h });
/** A thing's four corners */
export function thingCorners(t: Thing): Pt[] {
  const [c, s] = [Math.cos(t.rot), Math.sin(t.rot)];
  return [[t.w / 2, t.d / 2], [-t.w / 2, t.d / 2], [-t.w / 2, -t.d / 2], [t.w / 2, -t.d / 2]].map(([u, v]): Pt => [t.at[0] + u * c - v * s, t.at[1] + u * s + v * c]);
}
/** The bin stores (a low concrete pen, wheelie bins in it) by each court, and the bike sheds (a curved roof on posts) */
export const BIN_STORES: Thing[] = [thing('bins', [-98.6, 362.4], 2.4, 1.4, 1.1), thing('bins', [20, 401.5], 1.4, 2.4, 1.1), thing('bins', [-23, 415.7], 2.4, 1.3, 1.1)];
export const BIKE_SHEDS: Thing[] = [thing('shed', [-34, 362.9], 3.2, 1.5, 1.7), thing('shed', [-30.4, 424.6], 3.2, 1.5, 1.7, -0.5)];

/* ---------- The play area ---------- */

/** The play area: a climbing frame, a sandpit, a ball court fenced round (a gap in its west side) */
export const FRAME = thing('frame', [-16.6, 366.2], 3, 2.6, 2.1);
export const SANDPIT = thing('sandpit', [-21.3, 366.2], 2.4, 2.4, 0.3);
export const BALL_COURT = thing('court', [-18.5, 376.4], 9, 9.6, 1.4);
/** The ball court's fence: its four sides, the west one with a gap to walk in by */
export const COURT_GAP = 1.6;
export function courtFence(): [Pt, Pt][] {
  const [a, b, c, d] = thingCorners(BALL_COURT);
  // (corners: +x+z, -x+z, -x-z, +x-z: the west side runs from -x-z to -x+z)
  const west = [c, b] as const;
  const mid: Pt = [(west[0][0] + west[1][0]) / 2, (west[0][1] + west[1][1]) / 2];
  const l = Math.hypot(west[1][0] - west[0][0], west[1][1] - west[0][1]);
  const t: Pt = [(west[1][0] - west[0][0]) / l, (west[1][1] - west[0][1]) / l];
  const g = COURT_GAP / 2;
  return [
    [a, b],
    [d, a],
    [c, d],
    [west[0], [mid[0] - t[0] * g, mid[1] - t[1] * g]],
    [[mid[0] + t[0] * g, mid[1] + t[1] * g], west[1]],
  ];
}

/* ---------- The grass's trees ---------- */

/** A few trees on the grass: seeded, apart, off the desire lines, clear of the blocks, the bridges' line, the play area */
export const YARD_TREES: [number, number, number][] = (() => {
  const r = seeded(20261114);
  const grass = GRASS[0];
  const xs = grass.map((p) => p[0]);
  const zs = grass.map((p) => p[1]);
  const out: [number, number, number][] = [];
  const clear = (p: Pt) =>
    inside(grass, p) &&
    distTo(grass, p, true) > 2 &&
    !inBlock(p, 3.5) &&
    DESIRE_LINES.every((l) => distTo(l, p) > 2.2) &&
    !inside(PLAY, p) &&
    // (under no bridge: a tree's crown would reach it)
    BRIDGES.every((br) => distTo(br.pts, p) > 2.8) &&
    [...BIN_STORES, ...BIKE_SHEDS].every((t) => Math.hypot(t.at[0] - p[0], t.at[1] - p[1]) > 3) &&
    out.every(([x, z]) => Math.hypot(x - p[0], z - p[1]) > 6.5);
  for (let k = 0; k < 4000 && out.length < 11; k++) {
    const p: Pt = [Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs)), Math.min(...zs) + r() * (Math.max(...zs) - Math.min(...zs))];
    if (clear(p)) out.push([p[0], p[1], 0.85 + r() * 0.35]);
  }
  return out;
})();

/* ---------- The podium deck: its planters and benches, its columns ---------- */

/** Along the deck's open edges (its balustrade, away from the galleries): a planter, a bench, a planter... */
export const DECK_PROPS: (Thing & { y: number })[] = (() => {
  const out: (Thing & { y: number })[] = [];
  for (const d of DECKS) {
    d.poly.forEach((a, j) => {
      const c = d.poly[(j + 1) % d.poly.length];
      const mid: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
      const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (inBlock(mid, 2.4) || l < 2) return;
      const n = outward(d.poly, j);
      const t: Pt = [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
      const rot = Math.atan2(t[1], t[0]);
      for (let s = 1.2, k = 0; s < l - 1.2; s += 2.4, k++) {
        const kind = k % 2 ? 'bench' : 'planter';
        const inset = kind === 'planter' ? 0.55 : 0.6;
        const at: Pt = [a[0] + t[0] * s - n[0] * inset, a[1] + t[1] * s - n[1] * inset];
        out.push({ ...thing(kind, at, kind === 'planter' ? 1.4 : 1.3, kind === 'planter' ? 0.6 : 0.45, kind === 'planter' ? 0.5 : 0.45, rot), y: d.y });
      }
    });
  }
  return out;
})();
/** The deck's columns down to the court: on a grid inside it, clear of the blocks */
export const DECK_COLUMNS: Pt[] = (() => {
  const out: Pt[] = [];
  for (const d of DECKS) {
    const xs = d.poly.map((p) => p[0]);
    const zs = d.poly.map((p) => p[1]);
    for (let x = Math.min(...xs) + 2; x < Math.max(...xs); x += 5)
      for (let z = Math.min(...zs) + 2; z < Math.max(...zs); z += 5) if (inside(d.poly, [x, z]) && !inBlock([x, z], 3)) out.push([x, z]);
  }
  return out;
})();
export const COLUMN_R = 0.26;

/* ---------- Solids (on the ground; solids.ts lifts them onto it) ---------- */

const boxOf = (t: Thing): Box => {
  const cs = thingCorners(t);
  return [Math.min(...cs.map((p) => p[0])), Math.min(...cs.map((p) => p[1])), Math.max(...cs.map((p) => p[0])), Math.max(...cs.map((p) => p[1])), t.h];
};
/** A fence's run as thin boxes (a box each 1.2 along it, so a slanted run doesn't fill the court) */
const fenceBoxes = ([a, c]: [Pt, Pt], h: number): Box[] => {
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const n = Math.max(1, Math.ceil(l / 1.2));
  return Array.from({ length: n }, (_, i): Box => {
    const [p, q] = [i / n, (i + 1) / n].map((f): Pt => [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f]);
    return [Math.min(p[0], q[0]) - 0.06, Math.min(p[1], q[1]) - 0.06, Math.max(p[0], q[0]) + 0.06, Math.max(p[1], q[1]) + 0.06, h];
  });
};
export const YARD_SOLIDS: Box[] = [
  ...YARD_CARS.map(([id, x, z, yaw]) => carBox(id, x, z, yaw)),
  ...[...BIN_STORES, ...BIKE_SHEDS, FRAME].map(boxOf),
  ...courtFence().flatMap((run) => fenceBoxes(run, BALL_COURT.h)),
  ...DECK_COLUMNS.map(([x, z]): Box => [x - COLUMN_R, z - COLUMN_R, x + COLUMN_R, z + COLUMN_R, DECKS[0].y]),
];
/** Is a point up on the deck inside one of its planters or benches (southsky.ts: they stop you up there) */
export function onDeckProp(x: number, z: number, m = 0) {
  return DECK_PROPS.some((t) => {
    const [c, s] = [Math.cos(t.rot), Math.sin(t.rot)];
    const [dx, dz] = [x - t.at[0], z - t.at[1]];
    const [u, v] = [dx * c + dz * s, -dx * s + dz * c];
    return Math.abs(u) < t.w / 2 + m && Math.abs(v) < t.d / 2 + m;
  });
}
