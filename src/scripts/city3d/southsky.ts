/*
 * Endswood's sky network walked (docs/south-plan.md Phase 2, step 2c; the owner's calls, 2026-11-14: lifts in every core
 * with a floor picker, a walked stair up The Core to its first landing, only the railings stop you up there). DOM-free,
 * tested in tests/southsky.test.ts; the blocks themselves are southblocks.ts.
 *
 * - **What you stand on** (`SKY_SHAPES`): the galleries (inside their upstands), the bridges (between their parapets),
 *   the podium deck, each core's open landing at every third floor it serves (galleries run into them, bridges meet
 *   them), The Core's landings, and The Core's stair (a straight flight up its south face to a landing at the third
 *   floor). A bridge to a tower ends at its door.
 * - `skyFloorAt(x, z, yNow)`: the floor under a point for someone `yNow` high (groundheight.ts's `sky` layer);
 *   `skyUp()` whether someone is up there (walk.ts then asks only `skyWall()`: off every shape is a railing).
 * - **The lifts** (`SKY_LIFTS`): a door at the foot of every core and a call point on each of its landings; the floor
 *   picker (skylift-ui.ts) and the ride (index.ts `rideTo()`).
 */
import {
  BLOCKS, BLOCKS_RECT, BRIDGES, BRIDGE_HALF, CORES, DECKS, GALLERY_W, SKY_FLOORS, TWIN_CORE_HALF, blockById, floorY,
  lineLength, outward, pointAt, section, storeysOf, type Block, type Pt,
} from './southblocks';
import { inside, shift } from './streetfaces';
import { onDeckProp } from './southyard';

/** The block's slab (world.ts `SLAB`): walk.ts's heights are over the street, the blocks' bases over today's ground */
const SLAB = 0.15;
/** How far from a floor's level someone still stands on it (a step up, a step down), and how high off the ground
 * someone is up in the network rather than at its foot */
export const REACH = 0.8;
export const UP_FROM = SLAB + 0.9;
/** How far in from a gallery's outer edge its upstand stops you, and from a bridge's side its parapet */
const UPSTAND_IN = 0.2;
const PARAPET_IN = 0.2;
/** A core's open landing: clear this high over each landing's floor (bridges and galleries meet it there) */
export const LANDING_H = 1.4;

export interface SkyShape {
  id: string;
  poly: Pt[];
  /** Its floor's level (a stair's rises along it) */
  y: (x: number, z: number) => number;
  /** Its lowest and highest level (a quick test first) */
  lo: number;
  hi: number;
}
const level = (id: string, poly: Pt[], y: number): SkyShape => ({ id, poly, y: () => y, lo: y, hi: y });

/* ---------- The galleries ---------- */

const sideOf = (b: Block) => (b.galleries === 'right' ? 1 : -1);
/** A line carried on `d` past each end, straight on */
function extend(pts: Pt[], d: number): Pt[] {
  const on = (a: Pt, b: Pt): Pt => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [b[0] + ((b[0] - a[0]) / l) * d, b[1] + ((b[1] - a[1]) / l) * d];
  };
  return [on(pts[1], pts[0]), ...pts, on(pts[pts.length - 2], pts[pts.length - 1])];
}
const galleryShapes = (): SkyShape[] =>
  BLOCKS.filter((b) => b.spine).flatMap((b) =>
    b.steps.flatMap((st, i) =>
      SKY_FLOORS.filter((f) => f < st.storeys).map((f) => {
        const s = sideOf(b);
        // (on a little past each end: over the next step's where two steps meet, no seam to stop at; into the cores at
        // a slab's ends)
        const part = extend(section(b.spine!, st.from, st.to), 0.5);
        const [inner, outer] = [shift(part, s * (b.depth! / 2 - 0.05)), shift(part, s * (b.depth! / 2 + GALLERY_W - UPSTAND_IN))];
        return level(`gallery ${b.id} ${i} ${f}`, [...inner, ...outer.reverse()], floorY(b.base, f));
      })
    )
  );

/* ---------- The cores' landings ---------- */

/** The floors a slab's or the Rampart's core opens onto: each sky floor its block rises past where it stands */
export function coreFloors(id: string): number[] {
  if (id === 'twin-core') {
    const t = blockById('twin-core');
    return SKY_FLOORS.filter((f) => f < storeysOf(t) && BRIDGES.some((br) => br.floor === f && ('block' in br.a ? br.a.block === 'twin-core' : false)));
  }
  const c = CORES.find((q) => q.id === id)!;
  const b = blockById(c.of);
  return SKY_FLOORS.filter((f) => floorY(b.base, f) + LANDING_H + 0.5 < c.top);
}
/** The Rampart's cores stand out from its galleries: at each landing, a way through the gallery's front into it */
export const CORE_GAP = 1.2;
const throughShapes = (): SkyShape[] =>
  CORES.filter((c) => c.of === 'rampart').flatMap((c) => {
    const b = blockById(c.of);
    const s = sideOf(b);
    const { p, dir } = pointAt(b.spine!, nearestAlong(b.spine!, c.at));
    const r: Pt = [-dir[1] * s, dir[0] * s];
    const at = (along: number, out: number): Pt => [p[0] + dir[0] * along + r[0] * out, p[1] + dir[1] * along + r[1] * out];
    const h = CORE_GAP / 2;
    const [o0, o1] = [b.depth! / 2 + GALLERY_W - UPSTAND_IN - 0.3, b.depth! / 2 + GALLERY_W + 0.6];
    return coreFloors(c.id).map((f) => level(`through ${c.id} ${f}`, [at(-h, o0), at(h, o0), at(h, o1), at(-h, o1)], floorY(b.base, f)));
  });
/**
 * The service towers' links (docs/brutalist-plan.md Phase 2): a covered way from the gallery to a tower standing off its
 * block, at each landing it opens onto, on into the gallery and the landing a little each end
 */
const LINK_HALF = 0.62;
const linkShapes = (): SkyShape[] =>
  CORES.filter((c) => c.link).flatMap((c) => {
    const [a, e] = c.link!;
    const l = Math.hypot(e[0] - a[0], e[1] - a[1]);
    const t: Pt = [(e[0] - a[0]) / l, (e[1] - a[1]) / l];
    const r: Pt = [-t[1] * LINK_HALF, t[0] * LINK_HALF];
    const [p0, p1]: Pt[] = [[a[0] - t[0] * 0.6, a[1] - t[1] * 0.6], [e[0] + t[0] * 0.6, e[1] + t[1] * 0.6]];
    const poly: Pt[] = [[p0[0] + r[0], p0[1] + r[1]], [p1[0] + r[0], p1[1] + r[1]], [p1[0] - r[0], p1[1] - r[1]], [p0[0] - r[0], p0[1] - r[1]]];
    return coreFloors(c.id).map((f) => level(`link ${c.id} ${f}`, poly, floorY(blockById(c.of).base, f)));
  });
const landingShapes = (): SkyShape[] => [
  ...throughShapes(),
  ...linkShapes(),
  ...CORES.flatMap((c) => coreFloors(c.id).map((f) => level(`landing ${c.id} ${f}`, c.foot, floorY(blockById(c.of).base, f)))),
  ...coreFloors('twin-core').map((f) => level(`landing twin-core ${f}`, blockById('twin-core').foot, floorY(blockById('twin-core').base, f))),
];

/* ---------- The bridges ---------- */

const bridgeShapes = (): SkyShape[] =>
  BRIDGES.map((br) => {
    const [a, c] = br.pts;
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const t: Pt = [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
    const r: Pt = [-t[1], t[0]];
    const h = BRIDGE_HALF - PARAPET_IN;
    // (on into a core's landing or the deck; at a tower's face, its door: no further)
    const into = (e: (typeof br)['a']) => ('block' in e && e.block !== 'twin-core' ? 0.02 : 0.6);
    const [ea, ec] = [into(br.a), into(br.b)];
    const p0: Pt = [a[0] - t[0] * ea, a[1] - t[1] * ea];
    const p1: Pt = [c[0] + t[0] * ec, c[1] + t[1] * ec];
    const poly: Pt[] = [
      [p0[0] + r[0] * h, p0[1] + r[1] * h], [p1[0] + r[0] * h, p1[1] + r[1] * h],
      [p1[0] - r[0] * h, p1[1] - r[1] * h], [p0[0] - r[0] * h, p0[1] - r[1] * h],
    ];
    const [y0, y1] = br.ys;
    const L = l + ea + ec;
    const y = (x: number, z: number) => {
      const s = Math.max(0, Math.min(1, ((x - p0[0]) * t[0] + (z - p0[1]) * t[1]) / L));
      return y0 + (y1 - y0) * s;
    };
    return { id: `bridge ${br.id}`, poly, y, lo: Math.min(y0, y1), hi: Math.max(y0, y1) };
  });

/* ---------- The Core's stair ---------- */

/** The Core's frame: its middle, its axes (u along the towers' line, v square to it, towards Endswood Road) */
const TWIN = (() => {
  const foot = blockById('twin-core').foot;
  const c: Pt = [foot.reduce((s, p) => s + p[0], 0) / foot.length, foot.reduce((s, p) => s + p[1], 0) / foot.length];
  const h = blockById('harrier').foot;
  const k = blockById('kite').foot;
  const hc: Pt = [h.reduce((s, p) => s + p[0], 0) / h.length, h.reduce((s, p) => s + p[1], 0) / h.length];
  const kc: Pt = [k.reduce((s, p) => s + p[0], 0) / k.length, k.reduce((s, p) => s + p[1], 0) / k.length];
  const l = Math.hypot(kc[0] - hc[0], kc[1] - hc[1]);
  const u: Pt = [(kc[0] - hc[0]) / l, (kc[1] - hc[1]) / l];
  return { c, u, v: [-u[1], u[0]] as Pt };
})();
const at = (s: number, o: number): Pt => [TWIN.c[0] + TWIN.u[0] * s + TWIN.v[0] * o, TWIN.c[1] + TWIN.u[1] * s + TWIN.v[1] * o];
/**
 * The stair: a straight flight along The Core's south face, from the ground at its west foot up to a landing against
 * the face at the third floor (`top`), its width `w`; drawn by southblocks3d.ts, its steps `STAIR.steps`
 */
export const STAIR = (() => {
  const base = blockById('twin-core').base;
  const top = floorY(base, 3);
  const w = 1.4;
  const o0 = TWIN_CORE_HALF + 0.1;
  const run = 6.4;
  const landing = 1.6;
  const s1 = TWIN_CORE_HALF - 0.4 - landing;
  const s0 = s1 - run;
  return { base, top, w, o0, s0, s1, landing, steps: 12, foot: at(s0 + 0.3, o0 + w / 2), head: at(s1 - 0.3, o0 + w / 2) };
})();
const stairShapes = (): SkyShape[] => {
  const { base, top, w, o0, s0, s1, landing } = STAIR;
  const flight: Pt[] = [at(s0, o0), at(s1, o0), at(s1, o0 + w), at(s0, o0 + w)];
  const y = (x: number, z: number) => {
    const s = (x - TWIN.c[0]) * TWIN.u[0] + (z - TWIN.c[1]) * TWIN.u[1];
    return base + (top - base) * Math.max(0, Math.min(1, (s - s0) / (s1 - s0)));
  };
  // (the landing: on from the flight to the face's middle, and on into The Core's landing behind the face)
  const land: Pt[] = [at(s1 - 0.05, o0), at(s1 + landing, o0), at(s1 + landing, o0 + w), at(s1 - 0.05, o0 + w)];
  const door: Pt[] = [at(s1 + 0.2, TWIN_CORE_HALF - 0.6), at(s1 + landing, TWIN_CORE_HALF - 0.6), at(s1 + landing, o0 + 0.2), at(s1 + 0.2, o0 + 0.2)];
  return [
    { id: 'stair twin-core', poly: flight, y, lo: base, hi: top },
    level('stair landing twin-core', land, top),
    level('stair door twin-core', door, top),
  ];
};

/* ---------- Every shape ---------- */

export const SKY_SHAPES: SkyShape[] = [...galleryShapes(), ...landingShapes(), ...bridgeShapes(), ...DECKS.map((d) => level(`deck ${d.id}`, d.poly, d.y)), ...stairShapes()];
const BOX = SKY_SHAPES.map((s) => [Math.min(...s.poly.map((p) => p[0])), Math.min(...s.poly.map((p) => p[1])), Math.max(...s.poly.map((p) => p[0])), Math.max(...s.poly.map((p) => p[1]))]);
const inRect = (x: number, z: number) => x > BLOCKS_RECT[0] && x < BLOCKS_RECT[2] && z > BLOCKS_RECT[1] && z < BLOCKS_RECT[3];

/** The shapes at a point someone `y` high could stand on (within `REACH` of their floor there) */
function standOn(x: number, z: number, y: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < SKY_SHAPES.length; i++) {
    const s = SKY_SHAPES[i];
    const b = BOX[i];
    if (x < b[0] || x > b[2] || z < b[1] || z > b[3] || y < s.lo - REACH || y > s.hi + REACH) continue;
    if (!inside(s.poly, [x, z])) continue;
    // (the podium deck's planters and benches stand on it: not stood in, southyard.ts)
    if (s.id.startsWith('deck') && onDeckProp(x, z)) continue;
    const fy = s.y(x, z);
    if (Math.abs(fy - y) <= REACH) out.push(fy);
  }
  return out;
}

/** The floor under a point for someone `yNow` high (over the street) up in the network, or null (the ground's) */
export function skyFloorAt(x: number, z: number, yNow: number): number | null {
  if (!inRect(x, z)) return null;
  const ys = standOn(x, z, yNow);
  return ys.length ? Math.max(...ys) : null;
}
/** Is someone `y` high at a point up in the network (on a shape, off the ground) */
export const skyUp = (x: number, z: number, y: number) => y > UP_FROM && inRect(x, z) && standOn(x, z, y).length > 0;
/**
 * Up in the network, where someone (radius `m`, feet at `y`) can't step: anywhere off its shapes at their height (the
 * upstands, parapets, balustrades, the stair's rails, the towers' faces)
 */
export function skyWall(x: number, z: number, y: number, m = 0): boolean {
  for (const [dx, dz] of [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m]]) if (!standOn(x + dx, z + dz, y).length) return true;
  return false;
}

/* ---------- The lifts ---------- */

/** How far out from its face a lift's door spot stands (where you stand at its prompt) */
export const DOOR_OUT = 1;
export interface SkyLift {
  id: string;
  name: string;
  /** The core's middle (the call point on each landing) and its ground door's spot, facing out */
  at: Pt;
  door: { x: number; z: number; yaw: number };
  base: number;
  floors: number[];
}
/** The way out of a core at its foot: its face turned furthest from what it serves */
function doorOf(foot: Pt[], centre: Pt, from: Pt[]): { x: number; z: number; yaw: number } {
  let best = { score: -Infinity, n: [0, 1] as Pt, m: centre };
  foot.forEach((a, j) => {
    const c = foot[(j + 1) % foot.length];
    if (Math.hypot(c[0] - a[0], c[1] - a[1]) < 1) return;
    const n = outward(foot, j);
    const score = Math.min(...from.map((f) => ((centre[0] - f[0]) * n[0] + (centre[1] - f[1]) * n[1]) / (Math.hypot(centre[0] - f[0], centre[1] - f[1]) || 1)));
    if (score > best.score) best = { score, n, m: [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2] };
  });
  // (standing a step out from the face, looking away from it: yaw 0 looks north, -z)
  const p: Pt = [best.m[0] + best.n[0] * DOOR_OUT, best.m[1] + best.n[1] * DOOR_OUT];
  return { x: p[0], z: p[1], yaw: Math.atan2(-best.n[0], -best.n[1]) };
}
const centreOf = (poly: Pt[]): Pt => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
export const SKY_LIFTS: SkyLift[] = [
  ...CORES.map((c) => {
    const b = blockById(c.of);
    const near = pointAt(b.spine!, Math.max(0, Math.min(lineLength(b.spine!), nearestAlong(b.spine!, c.at)))).p;
    return { id: c.id, name: b.name, at: c.at, door: doorOf(c.foot, c.at, [near]), base: b.base, floors: coreFloors(c.id) };
  }),
  (() => {
    const t = blockById('twin-core');
    const c = centreOf(t.foot);
    // (its door on the face away from the towers and from its stair: the north, to the Rampart)
    const from = [...BLOCKS.filter((q) => q.kind === 'tower').map((q) => centreOf(q.foot)), at(-1, TWIN_CORE_HALF + 3)];
    return { id: 'twin-core', name: t.name, at: c, door: doorOf(t.foot, c, from), base: t.base, floors: coreFloors('twin-core') };
  })(),
];
function nearestAlong(pts: Pt[], p: Pt) {
  let [best, at, d] = [Infinity, 0, 0];
  for (let i = 1; i < pts.length; i++) {
    const [a, c] = [pts[i - 1], pts[i]];
    const [vx, vz] = [c[0] - a[0], c[1] - a[1]];
    const l2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / l2));
    const e = Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t);
    if (e < best) [best, at] = [e, d + Math.sqrt(l2) * t];
    d += Math.sqrt(l2);
  }
  return at;
}
/** A floor's name in the lift (the ground, or its number: "3rd floor") */
export const floorName = (f: number) => (f === 0 ? 'Ground' : `${f}${f % 10 === 1 && f !== 11 ? 'st' : f % 10 === 2 && f !== 12 ? 'nd' : f % 10 === 3 && f !== 13 ? 'rd' : 'th'} floor`);
/** Which of a lift's floors someone `y` high (over the street) is on, or null if they're nowhere near it */
export function liftFloorOf(l: SkyLift, y: number): number | null {
  if (y < UP_FROM) return 0;
  const f = l.floors.find((q) => Math.abs(floorY(l.base, q) - y) <= REACH);
  return f ?? null;
}
/** Where a lift lets you out on a floor: at its door at the foot, or in its landing's middle (walk.ts `placeAt()`'s
 * height is over the slab) */
export function liftArrival(l: SkyLift, f: number): { x: number; z: number; y?: number; yaw: number } {
  if (f === 0) return { ...l.door };
  return { x: l.at[0], z: l.at[1], y: floorY(l.base, f) - SLAB, yaw: l.door.yaw };
}
/** The lifts' call points walk mode prompts at, for someone `y` high: the doors at the foot, or the landings at their
 * floor */
export function skyLiftDoors(y: number): { id: string; x: number; z: number; label: string }[] {
  return SKY_LIFTS.flatMap((l) => {
    const f = liftFloorOf(l, y);
    if (f === null || (f === 0 && y > UP_FROM)) return [];
    return [f === 0 ? { id: `sky-lift:${l.id}`, x: l.door.x, z: l.door.z, label: 'Lift' } : { id: `sky-lift:${l.id}`, x: l.at[0], z: l.at[1], label: 'Lift' }];
  });
}
