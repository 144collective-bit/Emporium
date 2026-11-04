/*
 * The turn lanes painted (docs/highway-plan.md Phase 6; the numbers are turnlanes.ts), a district loaded as you
 * approach (districts.ts `LAZY_DISTRICTS` id `turnlanes`): a site a junction, its arrows in the lanes on each way in
 * (left from the inner lane, ahead and right from the outer: the shapes are roads3d.ts's, Uptown's too) and the stop
 * bar across both lanes, flat on the asphalt over its dashes.
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';
import { site } from './tilework';
import { arrowShape } from './roads3d';
import { ARROW_LEN, STOP_BARS, TURN_ARROWS, TURN_JUNCTIONS } from './turnlanes';

/** This module's address, for the site worker (districts.ts) */
export const SELF = import.meta.url;

/** The paint's height: over the lane dashes' tops (world.ts) and clear of the zebras' */
const PAINT_Y = 0.0435;

export function register(_: { low: boolean }) {
  const white = toon('#e8e4f8');
  TURN_JUNCTIONS.forEach((j, i) => {
    const mine = TURN_ARROWS.filter((a) => Math.hypot(a.x - j.at[0], a.z - j.at[1]) < 30);
    const bars = STOP_BARS.filter((s) => Math.hypot(s.x - j.at[0], s.z - j.at[1]) < 30);
    const xs = [...mine.map((a) => a.x), ...bars.map((s) => s.x)];
    const zs = [...mine.map((a) => a.z), ...bars.map((s) => s.z)];
    site(`turn lanes ${i}`, [Math.min(...xs) - 2, Math.min(...zs) - 2, Math.max(...xs) + 2, Math.max(...zs) + 2], (into) => {
      const b = new Batch();
      for (const a of mine) {
        const ry = Math.atan2(-a.uz, a.ux);
        b.add(new THREE.ShapeGeometry(arrowShape(a.kind, ARROW_LEN)).rotateX(-Math.PI / 2).rotateY(ry).translate(a.x, PAINT_Y, a.z), white);
        // (ahead and right: an ahead arrow along the same shaft)
        if (a.kind === 'right') b.add(new THREE.ShapeGeometry(arrowShape('straight', ARROW_LEN)).rotateX(-Math.PI / 2).rotateY(ry).translate(a.x, PAINT_Y + 0.001, a.z), white);
      }
      for (const s of bars) b.add(new THREE.PlaneGeometry(0.28, s.w).rotateX(-Math.PI / 2).rotateY(Math.atan2(-s.uz, s.ux)).translate(s.x, PAINT_Y, s.z), white);
      b.build(into, { cast: false, receive: true });
    });
  });
}
