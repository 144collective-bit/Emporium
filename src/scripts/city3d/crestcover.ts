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
import { onMansion } from './mansions';
import { onSite } from './crestsites';
import { underSpur } from './metro';
import { onLand } from './crestland';
import { OAKS } from './landscape';
import { rng } from './recipes';

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
const offOaks = (x: number, z: number, m: number) => OAKS.every((o) => Math.abs(o.x - x) > m || Math.abs(o.z - z) > m);

/* ---------- Drifts and outcrops ---------- */

/** A drift's spacing over the hills (a jittered grid), its radius, its clumps */
export const DRIFT = { grid: 16, r: 3.4, clumps: 11 } as const;
export const OUTCROP = { grid: 17, rocks: 5 } as const;

const r = rng(9090);
export const DRIFTS: Drift[] = [];
export const OUTCROPS: Rock[][] = [];
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
export const TRAILS: Trail[] = (() => {
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
})();
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
/** On a footpath (padded `m`) */
export function onTrail(x: number, z: number, m = 0) {
  return TRAILS.some((t) => t.pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < TRAIL.half + TRAIL.step / 2 + m));
}
// (the drifts and outcrops off the footpaths)
for (const d of DRIFTS) d.clumps = d.clumps.filter((c) => !onTrail(c.x, c.z, 0.4));
for (const [k, o] of OUTCROPS.entries()) OUTCROPS[k] = o.filter((c) => !onTrail(c.x, c.z, 0.6));
