/*
 * Exit 6A's road in drawn (docs/south-plan.md Phase 5b; cornerroad.ts the data): Corner Road from The Trenches'
 * south-west corner under the ring's curve to the Docks' corner, and Gate Hill down to the south's streets, as sites
 * (tilework.ts): asphalt along each, a dashed centre line, white edge lines (no sidewalks out here: verges), and the
 * junctions' mouths filled at The Trenches' corner and the Docks' (the south's own junction disc is south3d.ts's). Its
 * lamps are the boot's (`CORNER_LAMPS`, index.ts); the ramps, gantries and signs are viaduct3d.ts's as every exit's.
 * Registered by viaduct3d.ts (the ring's chunk, loaded wherever the ring is near).
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';
import { site } from './tilework';
import { dashes, pieces, ribbon, unit } from './roads3d';
import { ROAD } from './palette';
import { CORNER_STREETS, DOCKS_CORNER, SOUTH_HUB } from './cornerroad';
import { CORNER_FROM, type Pt } from './viaduct';

/** Over the district streets' asphalt where they meet (theirs at 0.031, the grid's at 0.03): 5 mm apart, never flush */
const Y = 0.036;
const LINE_Y = 0.042;
/** The junctions' fill, under every street's asphalt */
const FILL_Y = 0.024;
const ASPHALT = toon(ROAD.asphalt);
const LINE = toon(ROAD.line);

/** How far from a junction the painted lines stop */
const CLEAR = 5;
const nearEnd = (x: number, z: number) => [CORNER_FROM, DOCKS_CORNER, SOUTH_HUB].some((j: Pt) => Math.hypot(j[0] - x, j[1] - z) < CLEAR);

export function registerCorner(low: boolean) {
  for (const s of CORNER_STREETS)
    pieces(s.pts, s.half + 0.5).forEach((pc, k) =>
      site(`corner ${s.id} ${k}`, pc.rect, (into) => {
        const b = new Batch();
        b.add(ribbon(pc.pts, -s.half, s.half, () => Y), ASPHALT);
        const ds: THREE.Matrix4[] = [];
        // (a dashed centre line; the edges' lines dashed so finely they read as solid, both stopping short of the junctions)
        dashes(ds, pc.pts, 0, 1.6, 1.2, 0.09, () => LINE_Y, nearEnd);
        if (!low) for (const off of [-s.half + 0.18, s.half - 0.18]) dashes(ds, pc.pts, off, 0.05, 1, 0.07, () => LINE_Y, nearEnd);
        b.instances(unit, LINE, ds);
        b.build(into, { cast: false, receive: true });
      })
    );
  // The junctions' mouths: where the road leaves The Trenches' corner at an angle, and at the Docks' corner
  for (const [id, at, r] of [
    ['trenches', CORNER_FROM, 4.2],
    ['docks', DOCKS_CORNER, 4.6],
  ] as const)
    site(`corner junction ${id}`, [at[0] - r - 0.5, at[1] - r - 0.5, at[0] + r + 0.5, at[1] + r + 0.5], (into) => {
      const b = new Batch();
      b.add(new THREE.CircleGeometry(r, low ? 16 : 24).rotateX(-Math.PI / 2).translate(at[0], FILL_Y, at[1]), ASPHALT);
      b.build(into, { cast: false, receive: true });
    });
}
