/**
 * The Ridgeline Walk (docs/crestmont-plan.md, the premium upgrade's Phase 5; the owner's call, 2026-11-20: "That path,
 * steps where steep"): a gravel footpath from Foothill Road by the cable car's foot station, east round the hills'
 * foot and up the east valley, past the Crestmont Glasshouse and through the Belvedere, then up the last climb to the
 * overlook; the hills walkable both ways (the cable car one way, the walk the other). Its line was found by a search
 * over the hills' clear ground (no hill house's garden, no land, no landmark, no road crossed) and is held here as it
 * was laid (`WALK`); tests/crestwalk.test.ts holds it clear and walkable.
 *
 * DOM-free, in Crestmont's chunk: drawn by crestwalk3d.ts. Stone steps and a handrail where it's steep (`STEPS`),
 * benches (`BENCHES`) and low lamps (`WALK_LAMPS`) along it, two lookouts off it (`LOOKOUTS`).
 */
import { heightAt } from './terrain';
import { BELVEDERE, GLASSHOUSE, OVERLOOK } from './crestsites';
import { CABLE_STATIONS } from './cablecar';

type Pt = [number, number];

/** The path: its half width; steep from this grade (stone steps, a handrail); a bench and a lamp every so far */
export const WALK = { half: 0.85, steep: 0.16, bench: 46, lamp: 15, lift: 0.06 } as const;

/** Its line as laid, from Foothill Road by the cable car's foot to the overlook's east edge */
export const WALK_LINE: Pt[] = [
  // (round the cable car's foot station's west side, then east behind it)
  [434, -65.5],
  [434.6, -78],
  [442, -80.5],
  [450, -83],
  [458, -91],
  [466, -101],
  [466, -115],
  [466, -129],
  [466, -143],
  [466, -157],
  [466, -171],
  [466, -185],
  [466, -199],
  [466, -213],
  [466, -227],
  [464, -235],
  [458, -247],
  [458, -261],
  // (round the meadow's south-east side, then up to the Belvedere)
  [458.5, -268],
  [453, -273],
  // (in between two of its columns, out between two more)
  [BELVEDERE.x + BELVEDERE.r + 1.6, BELVEDERE.z],
  [BELVEDERE.x, BELVEDERE.z],
  [438, -281],
  [436, -283],
  [436, -293],
  [436, -307],
  [426, -313],
  [OVERLOOK.rect[2] - 1, -313],
];
/** A branch off it to the glasshouse's door, through its garden */
export const GLASS_PATH: Pt[] = [
  [458, -261],
  [461.5, -266],
  [GLASSHOUSE.house[0] - 0.3, (GLASSHOUSE.house[1] + GLASSHOUSE.house[3]) / 2],
];

/** The line every half tile: each point's way along (`d`), its place, the ground's height there and its grade (rise over run, up the walk) */
export interface WalkPoint {
  d: number;
  x: number;
  z: number;
  y: number;
  grade: number;
  /** Its way along (unit) */
  u: Pt;
}
export const WALK_POINTS: WalkPoint[] = (() => {
  const out: WalkPoint[] = [];
  let d = 0;
  for (let k = 1; k < WALK_LINE.length; k++) {
    const [a, b] = [WALK_LINE[k - 1], WALK_LINE[k]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const u: Pt = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const n = Math.max(1, Math.ceil(L / 0.5));
    for (let i = k === 1 ? 0 : 1; i <= n; i++) {
      const [x, z] = [a[0] + (b[0] - a[0]) * (i / n), a[1] + (b[1] - a[1]) * (i / n)];
      out.push({ d: d + (L * i) / n, x, z, y: heightAt(x, z), grade: 0, u });
    }
    d += L;
  }
  // (each point's grade over a tile either side, so a step's run is smooth)
  out.forEach((p, i) => {
    const [a, b] = [out[Math.max(0, i - 2)], out[Math.min(out.length - 1, i + 2)]];
    p.grade = (b.y - a.y) / Math.max(0.5, b.d - a.d);
  });
  return out;
})();
export const WALK_L = WALK_POINTS[WALK_POINTS.length - 1].d;

/** The stretches steep enough for steps: from and to (`d`), each step's rise at most */
export const STEP = { rise: 0.17, run: 0.34 } as const;
export const STEPS: [number, number][] = (() => {
  const out: [number, number][] = [];
  let from = -1;
  WALK_POINTS.forEach((p, i) => {
    const steep = Math.abs(p.grade) >= WALK.steep;
    if (steep && from < 0) from = p.d;
    if ((!steep || i === WALK_POINTS.length - 1) && from >= 0) {
      if (p.d - from >= 1) out.push([from, p.d]);
      from = -1;
    }
  });
  return out;
})();
export const onSteps = (d: number) => STEPS.some(([a, b]) => d >= a && d <= b);

/** A point on the walk at `d` along it, `side` across it (its right +) */
export function walkAt(d: number, side = 0): Pt {
  let i = 1;
  while (i < WALK_POINTS.length - 1 && WALK_POINTS[i].d < d) i++;
  const [a, b] = [WALK_POINTS[i - 1], WALK_POINTS[i]];
  const t = Math.max(0, Math.min(1, (d - a.d) / (b.d - a.d || 1)));
  const [x, z] = [a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t];
  return [x - b.u[1] * side, z + b.u[0] * side];
}

/** Where the walk passes through the Belvedere and by the glasshouse (no bench or lamp there) */
const SPOTS: Pt[] = [
  [BELVEDERE.x, BELVEDERE.z],
  [GLASSHOUSE.house[0] - 2, (GLASSHOUSE.house[1] + GLASSHOUSE.house[3]) / 2],
];
const nearSpot = ([x, z]: Pt, r: number) => SPOTS.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < r);

/** Benches beside it (its left, along it, facing across it: `yaw` the way a sitter faces, its seat's length across that), off its steps and its places */
export const BENCHES: { x: number; z: number; yaw: number }[] = (() => {
  const out: { x: number; z: number; yaw: number }[] = [];
  for (let d = WALK.bench / 2; d < WALK_L - 10; d += WALK.bench) {
    if (onSteps(d) || onSteps(d - 1.5) || onSteps(d + 1.5)) continue;
    const at = walkAt(d, -(WALK.half + 0.7));
    if (nearSpot(at, 8)) continue;
    const p = WALK_POINTS.find((q) => q.d >= d)!;
    // (facing the walk: its right, (-u.z, u.x))
    out.push({ x: at[0], z: at[1], yaw: Math.atan2(-p.u[1], p.u[0]) });
  }
  return out;
})();
/** Low lamps along its right, every `WALK.lamp` */
export const WALK_LAMPS: Pt[] = (() => {
  const out: Pt[] = [];
  for (let d = 6; d < WALK_L - 4; d += WALK.lamp) {
    const at = walkAt(d, WALK.half + 0.35);
    if (!nearSpot(at, 5)) out.push(at);
  }
  return out;
})();
/**
 * The two lookouts: a paved bay off the walk's side where the ground falls away, a rail and a coin viewer, looking out
 * that way; at the hills' foot over the Flats and partway up the climb
 */
export const LOOKOUTS: { x: number; z: number; look: Pt }[] = [60, WALK_L - 33].map((at) => {
  const p = WALK_POINTS.find((q) => q.d >= at)!;
  const side = (s: number) => walkAt(at, s * 16);
  const lower = heightAt(...side(1)) < heightAt(...side(-1)) ? 1 : -1;
  const [x, z] = walkAt(at, lower * (WALK.half + 1.6));
  return { x, z, look: [-p.u[1] * lower, p.u[0] * lower] as Pt };
});

/** It starts by the cable car's foot station, on Foothill Road's sidewalk's edge */
export const WALK_FOOT = CABLE_STATIONS[0];

/** A bench's seat: its length and depth (the drawing's, crestwalk3d.ts), its top over the ground as drawn */
export const BENCH = { long: 1.5, deep: 0.45, seat: 0.475 } as const;

/**
 * The Belvedere's two benches inside it, along its back (the side away from its view) east of the walk's way out, each facing in,
 * clear of the walk's way through (in from the east, out to the south-west): an angle round it and the way it faces
 */
export const BELVEDERE_BENCHES: { x: number; z: number; yaw: number }[] = [-Math.PI / 2 + 0.2, -Math.PI / 2 + 0.9].map((a) => {
  const [x, z] = [BELVEDERE.x + Math.cos(a) * (BELVEDERE.r - 0.9), BELVEDERE.z + Math.sin(a) * (BELVEDERE.r - 0.9)];
  return { x, z, yaw: Math.atan2(BELVEDERE.x - x, BELVEDERE.z - z) };
});
/** The Belvedere's benches' seat: length, depth, top over the ground */
export const BELVEDERE_BENCH = { long: 1.3, deep: 0.42, seat: 0.485 } as const;

/** The glasshouse's fountain in its garden's west side, south of its path to the door: its middle and radius */
export const GLASS_FOUNTAIN = { x: (GLASSHOUSE.rect[0] + GLASSHOUSE.house[0]) / 2, z: GLASSHOUSE.dome.z - 1.6, r: 0.8 } as const;
