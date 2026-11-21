/**
 * The cover on Crestmont's open slopes (the owner's call, 2026-11: "improve the area and the grounds around the
 * houses"): what grows and lies between the mansions, the roads and the land round them (crestland.ts), so the slopes
 * aren't bare grass. DOM-free, in Crestmont's chunk only: drawn by crestgardens3d.ts (`registerCover()`), tested in
 * tests/crestcover.test.ts. Nothing of it is solid; every height is the ground's (terrain.ts `heightAt()`, drawn at
 * `drawnAt()`).
 *
 * - **Drifts** (`DRIFTS`): masses of the hills' own shrubs in loose clumps (`DriftKind`: lilac, sage, the dark
 *   red-stemmed bush, poppies in the grass), on the open slopes off everything there.
 * - **Outcrops** (`OUTCROPS`): boulders in groups on the steeper ground.
 * - **Footpaths** (`TRAILS`): gravel paths across the slopes where a hill road doubles back on itself or runs past
 *   another, a short way on foot between them (the owner's rule: nowhere is a dead end on foot), never steeper than
 *   `TRAIL.grade`, off the roads' shoulders, the pads, the landmarks and the land; a pair of bollards at each end.
 */
import { BED, HILL_ROADS, nearHillRoad } from './crestmont';
import { HILLS, TERRAIN_RECT, heightAt, slopeAt } from './terrain';
import { MANSIONS, PAD_EASE, onMansion, outOf, toWorld, type Mansion } from './mansions';
import { onSite } from './crestsites';
import { underSpur } from './metro';
import { onLand } from './crestland';
import { onWalk } from './crestwalk';
import { hillPlanting } from './landscape';
import { rng } from './recipes';
import { BUILT, baked } from './baked';

type Pt = [number, number];

export type DriftKind = 'lilac' | 'sage' | 'redbush' | 'poppy';
export const DRIFT_KINDS: DriftKind[] = ['lilac', 'sage', 'redbush', 'poppy'];
export interface Clump {
  x: number;
  z: number;
  y: number;
  s: number;
}
export interface Drift {
  x: number;
  z: number;
  r: number;
  kind: DriftKind;
  clumps: Clump[];
}
export interface Rock {
  x: number;
  z: number;
  y: number;
  s: number;
  turn: number;
}
export interface Trail {
  /** Its line, a point about every `TRAIL.step`, each at the ground's height */
  pts: [number, number, number][];
  /** The road each end meets */
  from: string;
  to: string;
}

/** On the hills, off the roads and their shoulders, the pads, the landmarks, the spur and the land round the houses */
export function open(x: number, z: number, m = 0) {
  return (
    x > TERRAIN_RECT[0] + 6 &&
    x < 468 &&
    z < HILLS.foot.z - 6 &&
    z > -432 &&
    heightAt(x, z) > 1.5 &&
    !nearHillRoad(x, z, BED.shoulder + 1 + m) &&
    !onMansion(x, z, 1.5 + m) &&
    !onSite(x, z, 1 + m) &&
    !underSpur(x, z) &&
    !onLand(x, z, 1 + m)
  );
}
/** Clear of the hills' oaks' trunks */
const offOaks = (x: number, z: number, m: number) => hillPlanting().oaks.every((o) => Math.abs(o.x - x) > m || Math.abs(o.z - z) > m);

/* ---------- Drifts and outcrops ---------- */

/** A drift's spacing over the hills (a jittered grid), its radius, its clumps */
export const DRIFT = { grid: 16, r: 3.4, clumps: 11 } as const;
export const OUTCROP = { grid: 17, rocks: 5 } as const;

/**
 * The slopes' drifts and outcrops, laid the first time they're asked for: by the sites that draw them (crestgardens3d.ts
 * `registerCover()`, in the site worker), never as the chunk loads on the main thread
 */
export function cover(): { drifts: Drift[]; outcrops: Rock[][] } {
  return (COVER ??= layCover());
}
let COVER: { drifts: Drift[]; outcrops: Rock[][] } | null = null;
function layCover() {
  const r = rng(9090);
  const DRIFTS: Drift[] = [];
  const OUTCROPS: Rock[][] = [];
  for (let gz = TERRAIN_RECT[1]; gz < TERRAIN_RECT[3]; gz += DRIFT.grid)
    for (let gx = TERRAIN_RECT[0]; gx < TERRAIN_RECT[2]; gx += DRIFT.grid) {
      const [x, z] = [gx + r() * DRIFT.grid, gz + r() * DRIFT.grid];
      const kind = DRIFT_KINDS[Math.floor(r() * DRIFT_KINDS.length)];
      if (!open(x, z, DRIFT.r) || slopeAt(x, z) > 0.9) continue;
      const clumps: Clump[] = [];
      for (let k = 0; k < DRIFT.clumps; k++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * DRIFT.r;
        // (stretched along the contour a little, as the hills' own cover runs)
        const [cx, cz] = [x + Math.cos(a) * d * 1.3, z + Math.sin(a) * d * 0.8];
        if (!open(cx, cz) || !offOaks(cx, cz, 1)) continue;
        clumps.push({ x: cx, z: cz, y: heightAt(cx, cz), s: 0.7 + r() * 0.6 });
      }
      if (clumps.length >= 6) DRIFTS.push({ x, z, r: DRIFT.r * 1.3, kind, clumps });
    }
  for (let gz = TERRAIN_RECT[1] + 5; gz < TERRAIN_RECT[3]; gz += OUTCROP.grid)
    for (let gx = TERRAIN_RECT[0] + 5; gx < TERRAIN_RECT[2]; gx += OUTCROP.grid) {
      const [x, z] = [gx + r() * OUTCROP.grid, gz + r() * OUTCROP.grid];
      // (on the steeper ground, clear of the drifts)
      if (!open(x, z, 2) || slopeAt(x, z) < 0.35 || DRIFTS.some((d) => Math.hypot(d.x - x, d.z - z) < d.r + 2)) continue;
      const rocks: Rock[] = [];
      for (let k = 0; k < OUTCROP.rocks; k++) {
        const [rx, rz] = [x + (r() - 0.5) * 3.2, z + (r() - 0.5) * 2.4];
        if (!open(rx, rz) || !offOaks(rx, rz, 1)) continue;
        rocks.push({ x: rx, z: rz, y: heightAt(rx, rz), s: (k === 0 ? 1.4 : 0.6) + r() * 0.7, turn: r() * Math.PI * 2 });
      }
      if (rocks.length >= 3) OUTCROPS.push(rocks);
    }
  // (off the footpaths and the Ridgeline Walk)
  for (const d of DRIFTS) d.clumps = d.clumps.filter((c) => !onTrail(c.x, c.z, 0.4) && !onGardenPath(c.x, c.z, 0.4) && !onWalk(c.x, c.z, 0.4));
  for (const [k, o] of OUTCROPS.entries()) OUTCROPS[k] = o.filter((c) => !onTrail(c.x, c.z, 0.6) && !onGardenPath(c.x, c.z, 0.6) && !onWalk(c.x, c.z, 0.6 + c.s * 0.5));
  return { drifts: DRIFTS, outcrops: OUTCROPS };
}

/* ---------- Footpaths between the roads ---------- */

/** A footpath's half width, its points' spacing, the steepest it climbs (rise over run), how far it may run */
export const TRAIL = { half: 0.45, step: 0.75, grade: 0.32, min: 14, max: 48, apart: 30 } as const;
/** Where a footpath may leave a road: just past its shoulder, each side, every few tiles */
const MOUTHS = HILL_ROADS.flatMap((road) => {
  const out: { road: string; d: number; p: Pt }[] = [];
  for (let i = 2; i < road.pts.length - 2; i += 3) {
    const [a, b] = [road.pts[i - 1], road.pts[i + 1]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const n: Pt = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
    const off = road.half + BED.shoulder + 1.4;
    for (const s of [1, -1]) out.push({ road: road.id, d: road.cum[i], p: [road.pts[i][0] + n[0] * s * off, road.pts[i][1] + n[1] * s * off] });
  }
  return out;
});
/** A footpath from a to b, wandering a little: its points, or null where it can't go */
function trailBetween(a: Pt, b: Pt, seed: number): [number, number, number][] | null {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  // (a quick look first: no steeper than it may climb end to end, its middle and quarters open)
  if (Math.abs(heightAt(b[0], b[1]) - heightAt(a[0], a[1])) > TRAIL.grade * L) return null;
  if ([0.5, 0.25, 0.75].some((t) => !open(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))) return null;
  const [ux, uz] = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  const n = Math.max(2, Math.round(L / TRAIL.step));
  const pts: [number, number, number][] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    // (a gentle wander, none at its ends)
    const w = Math.sin(t * Math.PI) * Math.sin(t * Math.PI * 2 + seed) * 1.2;
    const [x, z] = [a[0] + (b[0] - a[0]) * t - uz * w, a[1] + (b[1] - a[1]) * t + ux * w];
    // (its ends at the road's verge; the rest clear of everything)
    const end = t * L < 1.6 || (1 - t) * L < 1.6;
    if (!end && !open(x, z, TRAIL.half)) return null;
    if (end && (nearHillRoad(x, z, BED.shoulder + 0.2) || onMansion(x, z, 1) || onSite(x, z, 0.5))) return null;
    pts.push([x, z, heightAt(x, z)]);
  }
  for (let k = 1; k < pts.length; k++) {
    const run = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    if (Math.abs(pts[k][2] - pts[k - 1][2]) > TRAIL.grade * run) return null;
  }
  return pts;
}
function findTrails(): Trail[] {
  const found: (Trail & { gain: number })[] = [];
  for (const [i, m] of MOUTHS.entries())
    for (const q of MOUTHS.slice(i + 1)) {
      const L = Math.hypot(q.p[0] - m.p[0], q.p[1] - m.p[1]);
      if (L < TRAIL.min || L > TRAIL.max) continue;
      // (only where walking it saves a long way round: a switchback, or another road)
      const gain = m.road === q.road ? Math.abs(q.d - m.d) / L : 3;
      if (gain < 2.5) continue;
      const pts = trailBetween(m.p, q.p, i * 0.37);
      if (pts) found.push({ pts, from: m.road, to: q.road, gain });
    }
  // The best few, apart from each other
  found.sort((a, b) => b.gain - a.gain || a.pts.length - b.pts.length);
  const out: Trail[] = [];
  const mid = (t: Trail) => t.pts[Math.floor(t.pts.length / 2)];
  for (const t of found) {
    if (out.length >= 4) break;
    if (out.every((o) => Math.hypot(mid(o)[0] - mid(t)[0], mid(o)[1] - mid(t)[1]) > TRAIL.apart && o.pts.every((p) => t.pts.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > 3))))
      out.push({ pts: t.pts, from: t.from, to: t.to });
  }
  return out;
}
/** On one of these footpaths (padded `m`) */
const onTrailIn = (trails: Trail[], x: number, z: number, m: number) => trails.some((t) => t.pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < TRAIL.half + TRAIL.step / 2 + m));
/** On a footpath across the slopes (padded `m`) */
export function onTrail(x: number, z: number, m = 0) {
  return onTrailIn(TRAILS, x, z, m);
}
/* ---------- Footpaths from the mansions' gardens ---------- */

/** A gate in a pad's edge where a garden path leaves it: the mansion, where in its frame (u, v), the way out */
export interface Gate {
  m: string;
  u: number;
  v: number;
  out: Pt;
}
export interface GardenPath extends Trail {
  /** The gate at its start, and at its end if it runs to another garden (else it ends at a road's verge) */
  gates: Gate[];
}
/** How far apart two neighbours' pads may be for a path between them; how far a path to a road may run */
export const GARDEN_PATH = { neighbours: 52, road: 34, perHouse: 2, driveGap: 2.6 } as const;
/** A walled pad (a compound, the summit) keeps its walls whole: no gates */
const gatesOf = (m: Mansion): Gate[] => {
  if (m.walled) return [];
  const sides: Gate[] = [
    { m: m.id, u: -m.W / 2, v: -m.D * 0.55, out: [-1, 0] },
    { m: m.id, u: m.W / 2, v: -m.D * 0.55, out: [1, 0] },
  ];
  // (and its back, where nothing stands past it: not a villa's terraces nor a glass house's cantilever)
  if (!m.terraces.length && !m.reach) sides.push({ m: m.id, u: 0, v: -m.D, out: [0, -1] });
  return sides;
};
/** A gate's point in the world, `d` out past the pad's edge */
function gateAt(m: Mansion, g: Gate, d: number): Pt {
  const [x, z] = toWorld(m, g.u, g.v);
  const [ox, oz] = outOf(m.face);
  // (the frame's u runs along (oz, -ox), v along out)
  const [wx, wz] = [oz * g.out[0] + ox * g.out[1], -ox * g.out[0] + oz * g.out[1]];
  return [x + wx * d, z + wz * d];
}
const inPad = (m: Mansion, x: number, z: number, e = 0) => x > m.rect[0] - e && x < m.rect[2] + e && z > m.rect[1] - e && z < m.rect[3] + e;
const inYard = (m: Mansion, x: number, z: number, e = 0) => x > m.yard[0] - e && x < m.yard[2] + e && z > m.yard[1] - e && z < m.yard[3] + e;
const toSeg = (x: number, z: number, [a, b]: [Pt, Pt]) => {
  const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t);
};
/**
 * A garden path from a (a gate) to b (a gate, or a road's verge), wandering a little: its points, or null where it
 * can't go. Over its own pads' banks near its ends; elsewhere clear of every pad and its bank, every drive and its
 * cypresses, the roads' shoulders, the landmarks, the land round the houses, the spur and the hills' footpaths; never
 * steeper than `TRAIL.grade`
 */
function gardenPathBetween(a: Pt, b: Pt, own: Mansion[], toRoad: boolean, seed: number, trails: Trail[]): [number, number, number][] | null {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (L < 4 || Math.abs(heightAt(b[0], b[1]) - heightAt(a[0], a[1])) > TRAIL.grade * L) return null;
  const [ux, uz] = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  const n = Math.max(2, Math.round(L / TRAIL.step));
  const pts: [number, number, number][] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const w = Math.sin(t * Math.PI) * Math.sin(t * Math.PI * 2 + seed) * 0.9;
    const [x, z] = [a[0] + (b[0] - a[0]) * t - uz * w, a[1] + (b[1] - a[1]) * t + ux * w];
    const roadEnd = toRoad && (1 - t) * L < 1.6;
    for (const m of MANSIONS) {
      const mine = own.includes(m);
      // (never across a pad; over a bank only its own, near its gate)
      if (mine ? inPad(m, x, z, -0.05) : inYard(m, x, z, PAD_EASE + 1)) return null;
      if (toSeg(x, z, m.drive) < GARDEN_PATH.driveGap) return null;
    }
    if (!roadEnd && nearHillRoad(x, z, BED.shoulder + 1)) return null;
    if (roadEnd && nearHillRoad(x, z, BED.shoulder + 0.2)) return null;
    if (onSite(x, z, 1) || underSpur(x, z) || onLand(x, z, 0.5) || onTrailIn(trails, x, z, 1.5)) return null;
    if (x <= TERRAIN_RECT[0] + 6 || x >= 468 || z <= -432 || z >= HILLS.foot.z - 6) return null;
    pts.push([x, z, heightAt(x, z)]);
  }
  for (let k = 1; k < pts.length; k++) {
    const run = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    if (Math.abs(pts[k][2] - pts[k - 1][2]) > TRAIL.grade * run) return null;
  }
  return pts;
}
function findGardenPaths(trails: Trail[]): GardenPath[] {
  const out: GardenPath[] = [];
  const count = new Map<string, number>();
  const used = new Set<string>();
  const key = (g: Gate) => `${g.m} ${g.u} ${g.v}`;
  const free = (g: Gate) => !used.has(key(g)) && (count.get(g.m) ?? 0) < GARDEN_PATH.perHouse;
  const take = (p: GardenPath) => {
    out.push(p);
    for (const g of p.gates) {
      used.add(key(g));
      count.set(g.m, (count.get(g.m) ?? 0) + 1);
    }
  };
  const apartFromPaths = (pts: [number, number, number][]) => out.every((o) => o.pts.every((p) => pts.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > 2.5)));
  // Neighbours: the shortest path between any two gates, closest pairs first
  const pairs: { a: Mansion; b: Mansion; d: number }[] = [];
  for (const [i, a] of MANSIONS.entries())
    for (const b of MANSIONS.slice(i + 1)) {
      const d = Math.hypot((a.rect[0] + a.rect[2] - b.rect[0] - b.rect[2]) / 2, (a.rect[1] + a.rect[3] - b.rect[1] - b.rect[3]) / 2);
      if (d < GARDEN_PATH.neighbours) pairs.push({ a, b, d });
    }
  pairs.sort((p, q) => p.d - q.d);
  for (const [k, { a, b }] of pairs.entries()) {
    let best: GardenPath | null = null;
    for (const ga of gatesOf(a).filter(free))
      for (const gb of gatesOf(b).filter(free)) {
        const pts = gardenPathBetween(gateAt(a, ga, 0.3), gateAt(b, gb, 0.3), [a, b], false, k * 0.53, trails);
        if (pts && apartFromPaths(pts) && (!best || pts.length < best.pts.length)) best = { pts, from: a.id, to: b.id, gates: [ga, gb] };
      }
    if (best) take(best);
  }
  // A house with no path yet: one down to the nearest road it can reach, off its own drive's mouth
  for (const [k, m] of MANSIONS.entries()) {
    if ((count.get(m.id) ?? 0) > 0) continue;
    let best: GardenPath | null = null;
    for (const g of gatesOf(m).filter(free)) {
      const a = gateAt(m, g, 0.3);
      for (const mouth of MOUTHS) {
        const L = Math.hypot(mouth.p[0] - a[0], mouth.p[1] - a[1]);
        if (L > GARDEN_PATH.road || Math.hypot(mouth.p[0] - m.drive[0][0], mouth.p[1] - m.drive[0][1]) < 6) continue;
        if (best && L > Math.hypot(best.pts[best.pts.length - 1][0] - best.pts[0][0], best.pts[best.pts.length - 1][1] - best.pts[0][1])) continue;
        const pts = gardenPathBetween(a, mouth.p, [m], true, k * 0.71, trails);
        if (pts && apartFromPaths(pts)) best = { pts, from: m.id, to: mouth.road, gates: [g] };
      }
    }
    if (best) take(best);
  }
  return out;
}
/**
 * The footpaths across the slopes and from the gardens, searched for when the site is built (baked.ts; scripts/bake.mjs:
 * the search tries every pair of mouths and gates, about a tenth of a second a load), not as the chunk loads
 */
const PATHS: { trails: Trail[]; paths: GardenPath[] } = baked('crest-paths', BUILT ? undefined : () => {
  const trails = findTrails();
  return { trails, paths: findGardenPaths(trails) };
});
export const TRAILS: Trail[] = PATHS.trails;
/** A footpath's bollards: a pair at each end, either side of it, a little in from the road */
export const BOLLARDS: Pt[] = TRAILS.flatMap((t) =>
  [
    [t.pts[1], t.pts[2]],
    [t.pts[t.pts.length - 2], t.pts[t.pts.length - 3]],
  ].flatMap(([p, q]) => {
    const [dx, dz] = [q[0] - p[0], q[1] - p[1]];
    const l = Math.hypot(dx, dz) || 1;
    return [1, -1].map((s): Pt => [p[0] - (dz / l) * s * (TRAIL.half + 0.25), p[1] + (dx / l) * s * (TRAIL.half + 0.25)]);
  })
);
export const GARDEN_PATHS: GardenPath[] = PATHS.paths;
/** The gates garden paths leave from, all of them */
export const GATES: Gate[] = GARDEN_PATHS.flatMap((p) => p.gates);
/** A garden path's bollards where it meets a road (a pair either side, a little in from the verge) */
export const PATH_BOLLARDS: Pt[] = GARDEN_PATHS.filter((p) => p.gates.length === 1).flatMap((t) => {
  const [p, q] = [t.pts[t.pts.length - 2], t.pts[t.pts.length - 3]];
  const [dx, dz] = [q[0] - p[0], q[1] - p[1]];
  const l = Math.hypot(dx, dz) || 1;
  return [1, -1].map((s): Pt => [p[0] - (dz / l) * s * (TRAIL.half + 0.25), p[1] + (dx / l) * s * (TRAIL.half + 0.25)]);
});
/** On a garden path (padded `m`) */
export function onGardenPath(x: number, z: number, m = 0) {
  return GARDEN_PATHS.some((t) => t.pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < TRAIL.half + TRAIL.step / 2 + m));
}


/* ---------- Lights along the footpaths ---------- */

/** A footpath's low lights: this far out from its middle, every so many of its points, by turns each side */
export const PATH_LIGHT = { off: TRAIL.half + 0.35, every: 7 } as const;
/** The footpaths across the slopes and from the gardens lit at night: low lights by turns either side, none by their ends */
export const PATH_LIGHTS: [number, number, number][] = [...TRAILS, ...GARDEN_PATHS].flatMap((t) => {
  const out: [number, number, number][] = [];
  let side = 1;
  for (let k = 3; k < t.pts.length - 3; k += PATH_LIGHT.every, side = -side) {
    const [p, q] = [t.pts[k - 1], t.pts[k + 1]];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const [x, z] = [t.pts[k][0] - ((q[1] - p[1]) / l) * side * PATH_LIGHT.off, t.pts[k][1] + ((q[0] - p[0]) / l) * side * PATH_LIGHT.off];
    if (nearHillRoad(x, z, BED.shoulder + 0.5)) continue;
    out.push([x, z, heightAt(x, z)]);
  }
  return out;
});
