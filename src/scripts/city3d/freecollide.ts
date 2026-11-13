/**
 * City view's free camera bumps into the city (the owner's call, 2026-11: "add collisions so it bumps into
 * buildings"; what walk mode's camera bumps into, sliding along the faces, for every move: WASD, mouse look, the drag,
 * the zoom, the orbit, touch). A move from one point to another is swept a direction at a time (x, then z, then y)
 * against the boxes of `CAMERA_GRID` (solids.ts) grown by the camera's own room `CAM_R`: what it runs into stops it at
 * the face, the rest of the move goes on, so it glides along a wall and round a corner. Boxes with a bottom (the ring
 * highway's deck, the airport's departures deck, Endswood's galleries: `b[5]`) are flown under. Nothing tunnels: the
 * sweep stops at the first face whatever the move's length. A camera that starts inside a box (a place's fly-in can end
 * there) is free to move out: that box doesn't stop it.
 * DOM-free, tested in tests/freecollide.test.ts. Its own chunk (index.ts loads it once the city is up: the boot never
 * carries the solids), so until it comes the camera flies through as before.
 */
import { CAMERA_GRID, type Box } from './solids';
import type { V3 } from './freecam';

/** The camera's room: how near a face it may come (more than its near plane's corners, 0.5 off) */
export const CAM_R = 0.6;

/** A box's bottom: the ground, or under a deck its underside */
const bottomOf = (b: Box) => (b as unknown as number[])[5] ?? -1e9;

/** The move from `from` to `to` against `boxes`, each grown by `r`: stopped at the faces it meets, sliding along them */
export function sweep(from: V3, to: V3, boxes: readonly Box[], r = CAM_R): V3 {
  const p: V3 = [from[0], from[1], from[2]];
  // x, then z, then y: across the ground first, then up and down
  for (const k of [0, 2, 1] as const) {
    let want = to[k];
    if (want === p[k]) continue;
    for (const b of boxes) {
      const lo: V3 = [b[0] - r, bottomOf(b) - r, b[1] - r];
      const hi: V3 = [b[2] + r, b[4] + r, b[3] + r];
      // (only a box the camera is level with on the other two axes can stop it on this one)
      let level = true;
      for (const j of [0, 1, 2] as const) if (j !== k && !(p[j] > lo[j] && p[j] < hi[j])) level = false;
      if (!level) continue;
      if (p[k] <= lo[k] && want > lo[k]) want = lo[k];
      else if (p[k] >= hi[k] && want < hi[k]) want = hi[k];
    }
    p[k] = want;
  }
  return p;
}

/** The boxes a move from `from` to `to` can meet */
function boxesFor(from: V3, to: V3, r: number, out: Box[]) {
  return CAMERA_GRID.query(Math.min(from[0], to[0]) - r, Math.min(from[2], to[2]) - r, Math.max(from[0], to[0]) + r, Math.max(from[2], to[2]) + r, out);
}

const scratch: Box[] = [];
/** A free camera's move from `from` to `to` in the city: where it gets to */
export function bump(from: V3, to: V3, r = CAM_R): V3 {
  if (from[0] === to[0] && from[1] === to[1] && from[2] === to[2]) return [to[0], to[1], to[2]];
  return sweep(from, to, boxesFor(from, to, r, scratch), r);
}

/**
 * How far a point is from the nearest box within `reach` (Infinity with none): the free camera's near plane comes in
 * by it beside a building (lens.ts `nearFor()`, index.ts), for what stands out of its box
 */
export function gap(p: V3, reach = 1.5): number {
  let best = Infinity;
  for (const b of CAMERA_GRID.query(p[0] - reach, p[2] - reach, p[0] + reach, p[2] + reach, scratch)) {
    const dx = Math.max(b[0] - p[0], 0, p[0] - b[2]);
    const dz = Math.max(b[1] - p[2], 0, p[2] - b[3]);
    const dy = Math.max(bottomOf(b) - p[1], 0, p[1] - b[4]);
    best = Math.min(best, Math.hypot(dx, dy, dz));
  }
  return best;
}
