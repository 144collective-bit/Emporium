/*
 * The raised highway's piers (docs/highway-plan.md Phase 1; DOM-free, tested in tests/viaduct.test.ts): a hammerhead
 * under the median about every `PIER_GAP` along the ring (viaduct.ts), each moved a little along it to keep clear of
 * every street that passes under, the metro's line, Lot 9's tunnel and the ramps; over the river only where the
 * ring highway's bridges have theirs today (between the boats' lanes, waterfront.ts `BRIDGE_PIERS`). Kept out of
 * viaduct.ts so the street plan can read the ramps without the metro and the river.
 */
import { PLAN, distToStreet, raised } from './streetplan';
import { TRACKS, type Track } from './metro';
import { TUNNEL } from './lot9';
import { WALK as STADIUM_WALK } from './stadium';
import { inWater } from './river';
import { BRIDGE_PIERS } from './waterfront';
import { HIGHWAY_BOX } from './highway';
import { DECK_HALF, DECK_Y, GIRDER, PARAPET, PIER, PIER_GAP, RAMPS, RING_LEN, ringAt, ringPoint, ringS, sGap, type Pt } from './viaduct';

/** The median barrier's top over the deck (viaduct3d.ts draws it) */
export const BARRIER_TOP = 0.5;

/** How far a pier keeps from a street's paved edge, the metro's line and the tunnel's walls */
export const PIER_CLEAR = 1.2;
/** How far along the ring a pier may move from its even spacing to find clear ground */
export const PIER_SHIFT = 5;

const segDist = (p: Pt, a: Pt, b: Pt) => {
  const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
  const l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
};
const trackDist = (t: Track, p: Pt) => {
  let d = Infinity;
  for (let i = 1; i < t.pts.length; i++) d = Math.min(d, segDist(p, t.pts[i - 1], t.pts[i]));
  return d;
};
/** What passes under the deck: every street but the highway (and slip lanes, none since Phase 2: the ramps come in Phase 3) */
const UNDER = PLAN.streets.filter((s) => !raised(s));

/** A pier's corners and middle, with its reach across the deck (its head) as the stem's footprint is small */
function footprint(s: number): Pt[] {
  const out: Pt[] = [];
  for (const u of [-PIER.along / 2, 0, PIER.along / 2]) for (const o of [-PIER.across / 2, 0, PIER.across / 2]) out.push(ringPoint(s + u, o));
  return out;
}

/** Is a pier at `s` clear of everything under the deck */
export function pierClear(s: number) {
  const pts = footprint(s);
  const r = Math.hypot(PIER.across, PIER.along) / 2;
  const [x, z] = ringPoint(s, 0);
  for (const st of UNDER) if (distToStreet(st, [x, z]) < st.half + r + PIER_CLEAR) return false;
  for (const t of Object.values(TRACKS)) if (trackDist(t, [x, z]) < r + 2 + PIER_CLEAR) return false;
  if (Math.abs(x - TUNNEL.x) < TUNNEL.half + TUNNEL.wall + r + PIER_CLEAR && z > TUNNEL.z0 && z < TUNNEL.z1) return false;
  // (and the walk from Westlake Park to the stadium under the deck, stadium.ts)
  if (Math.abs(x - STADIUM_WALK.x) < STADIUM_WALK.half + r + PIER_CLEAR && z < STADIUM_WALK.z0 && z > STADIUM_WALK.z1) return false;
  // In the river only on the bridges' pier lines (between the boats' lanes)
  if (pts.some(([px, pz]) => inWater(px, pz))) return BRIDGE_PIERS.some((bz) => Math.abs(z - bz) < 0.5);
  // Clear of the ramps' own lanes (they keep beside the deck, but their tapers come in over the shoulder)
  for (const rp of RAMPS) for (const p of rp.pts) if (Math.hypot(p[0] - x, p[1] - z) < r + 1.3) return false;
  return true;
}

/** The piers: `s` along the ring, where, and the way across (the head's) */
export const PIERS: { s: number; at: Pt; yaw: number }[] = (() => {
  const out: { s: number; at: Pt; yaw: number }[] = [];
  const n = Math.round(RING_LEN / PIER_GAP);
  const gap = RING_LEN / n;
  for (let k = 0; k < n; k++) {
    const s0 = k * gap;
    let s: number | null = null;
    for (let d = 0; d <= PIER_SHIFT && s === null; d += 0.5) for (const sg of d ? [d, -d] : [0]) if (s === null && pierClear(s0 + sg)) s = s0 + sg;
    if (s === null) continue;
    const r = ringAt(s);
    out.push({ s, at: [r.x, r.z], yaw: Math.atan2(r.nx, r.nz) });
  }
  // Over the river: on each of the bridges' pier lines, where the ring crosses them (its east and west sides)
  for (const x of [HIGHWAY_BOX[0], HIGHWAY_BOX[2]])
    for (const bz of BRIDGE_PIERS) {
      const s = ringS(x, bz).s;
      const r = ringAt(s);
      // (in place of an evenly spaced one too near it)
      for (let i = out.length - 1; i >= 0; i--) if (Math.abs(sGap(out[i].s, s)) < PIER_GAP / 2) out.splice(i, 1);
      out.push({ s, at: [r.x, r.z], yaw: Math.atan2(r.nx, r.nz) });
    }
  return out.sort((a, b) => a.s - b.s);
})();

/** An expansion joint across the deck over every this many piers (viaduct3d.ts) */
export const JOINT_EVERY = 3;

/** What's solid of the viaduct: each pier's stem, its bounding box (the deck overhead is out of reach) */
export const PIER_SOLIDS: [number, number, number, number, number][] = PIERS.map((p) => {
  const pts = footprint(p.s);
  const xs = pts.map((q) => q[0]);
  const zs = pts.map((q) => q[1]);
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), DECK_Y];
});

/**
 * What the walk camera can't pass: the deck from its soffit to its parapets' top, in boxes along the ring (a bottom,
 * `[5]`: you walk under it). Only the camera's: bullets and walking pass under it
 */
export const DECK_CAMERA: number[][] = (() => {
  const out: number[][] = [];
  const step = 4;
  const n = Math.ceil(RING_LEN / step);
  for (let k = 0; k < n; k++) {
    const [a, b] = [(k * RING_LEN) / n, ((k + 1) * RING_LEN) / n];
    const pts = [ringPoint(a, -DECK_HALF), ringPoint(a, DECK_HALF), ringPoint(b, -DECK_HALF), ringPoint(b, DECK_HALF)];
    const xs = pts.map((q) => q[0]);
    const zs = pts.map((q) => q[1]);
    out.push([Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), DECK_Y + PARAPET, DECK_Y - GIRDER]);
  }
  return out;
})();

/** Between the deck's lamps along the ring */
export const LAMP_GAP = 28;
/** How far a lamp keeps from the metro where it rides over the deck */
const LAMP_METRO = 9;
/**
 * The deck's lamps (x, z, the way the arm faces, its foot's height): in the median barrier every `LAMP_GAP`, the arm
 * reaching over each carriageway in turn, none under the metro where it rides over
 */
export const DECK_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const n = Math.round(RING_LEN / LAMP_GAP);
  for (let k = 0; k < n; k++) {
    const s = (k + 0.5) * (RING_LEN / n);
    const r = ringAt(s);
    if (Object.values(TRACKS).some((t) => trackDist(t, [r.x, r.z]) < LAMP_METRO)) continue;
    // (the arm over the outer carriageway, then the inner)
    const d = k % 2 ? 1 : -1;
    // (its foot on the deck's asphalt, the pole up through the barrier: its pool lies on the deck)
    out.push([r.x, r.z, Math.atan2(-r.nz * d, r.nx * d), DECK_Y + 0.006]);
  }
  return out;
})();
