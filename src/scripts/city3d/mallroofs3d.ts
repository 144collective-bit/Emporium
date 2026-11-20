/*
 * The joined mall's roofs dressed on screen (docs/mall-plan.md "One mall" Phase 4; the numbers are mallroofs.ts), in
 * the mall's chunk (mall3d.ts calls `registerRoofs()`): three sites (Palm Court's rows, the mall's anchors and hall,
 * the cinema) so the roofs add few draws.
 *
 * - The grey membrane over the light roofs (mallkit.ts `ROOF`).
 * - The solar arrays: each a tilted face of panels (`SOLAR`) on a steel rail, facing south.
 * - Near only: the rooflights over Palm Court's upper floor (a grey curb, glazed), and the rows' and the cinema's
 *   plant (an air handler with its fans, a louvred screen beside it, as mall3d.ts's).
 */
import * as THREE from 'three';
import type { Batch } from './kit';
import { site } from './tilework';
import { ANCHORS, CINEMA, HALL } from './mall';
import { PANELS, PANEL_RISE, ROOFLIGHTS, ROOFS, type Roof } from './mallroofs';
import { CURTAIN, GREY, MID, ROOF, SOLAR, STEEL, box, flat } from './mallkit';

/** How high a panel's low front edge stands off the roof */
const LIFT = 0.25;

/** An array of panels: its face tilted from its back edge (z0, high) down to its front (z1), the panels laid on along it */
function panels(b: Batch, [x0, z0, x1, z1]: [number, number, number, number], y: number) {
  const [yb, yf] = [y + LIFT + PANEL_RISE, y + LIFT];
  const u = (x1 - x0) / 1.6;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([x0, yb, z0, x1, yb, z0, x1, yf, z1, x0, yf, z1], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, u, 1, u, 0, 0, 0], 2));
  // (wound to face up and south)
  g.setIndex([0, 3, 2, 0, 2, 1]);
  g.computeVertexNormals();
  b.add(g, SOLAR);
  // Its rails under it: front and back (near only)
  b.detail(() => {
    box(b, x0, y, z0 + 0.05, x1, yb - 0.02, z0 + 0.1, STEEL);
    box(b, x0, y, z1 - 0.1, x1, yf - 0.02, z1 - 0.05, STEEL);
  });
}
/** An air handler: a grey box (seen from afar, so the patch the solar arrays keep clear for it isn't bare), its fans
 * and a louvred screen east of it near only (as mall3d.ts's) */
function plant(b: Batch, x: number, z: number, y: number) {
  box(b, x - 1, y, z - 0.6, x + 1, y + 0.9, z + 0.6, GREY);
  b.detail(() => {
    for (const dx of [-0.5, 0.5]) b.add(new THREE.CircleGeometry(0.32, 12).rotateX(-Math.PI / 2).translate(x + dx, y + 0.905, z), STEEL);
    for (let i = 0; i < 6; i++) box(b, x + 1.3 + i * 0.25, y, z - 0.7, x + 1.36 + i * 0.25, y + 1.1, z + 0.7, MID);
  });
}
function roof(b: Batch, r: Roof) {
  if (r.membrane) flat(b, r.rect[0], r.rect[1], r.rect[2], r.rect[3], r.y + 0.006, ROOF, 12);
  for (const p of PANELS) if (p.roof === r.id) panels(b, p.rect, p.y);
  for (const [x, z] of r.plant) plant(b, x, z, r.y);
  b.detail(() => {
    // (the rooflights over Palm Court's upper floor: a curb, glass on it)
    if (!r.id.startsWith('court-')) return;
    for (const l of ROOFLIGHTS) {
      const [x0, z0, x1, z1] = l.rect;
      if (x0 < r.rect[0] || x1 > r.rect[2] || z0 < r.rect[1] || z1 > r.rect[3]) continue;
      box(b, x0, l.y, z0, x1, l.y + 0.3, z1, GREY);
      flat(b, x0 + 0.08, z0 + 0.08, x1 - 0.08, z1 - 0.08, l.y + 0.306, CURTAIN, 4);
    }
  });
}

/** The roofs' sites: Palm Court's rows together, the mall's anchors and hall together, the cinema */
export function registerRoofs(build: (draw: (b: Batch) => void, cast?: boolean) => (into: THREE.Object3D) => void) {
  const group = (id: string, rect: [number, number, number, number], which: (r: Roof) => boolean) => site(id, rect, build((b) => ROOFS.filter(which).forEach((r) => roof(b, r)), false));
  const court = ROOFS.filter((r) => r.id.startsWith('court-'));
  group('mall roofs court', [Math.min(...court.map((r) => r.rect[0])), Math.min(...court.map((r) => r.rect[1])), Math.max(...court.map((r) => r.rect[2])), Math.max(...court.map((r) => r.rect[3]))], (r) => r.id.startsWith('court-'));
  group('mall roofs mall', [ANCHORS[0].rect[0], HALL.rect[1] - 4, ANCHORS[1].rect[2], HALL.rect[3]], (r) => r.id.startsWith('anchor-') || r.id === 'hall');
  group('mall roofs cinema', [CINEMA.rect[0], CINEMA.rect[1], CINEMA.rect[2], CINEMA.rect[3]], (r) => r.id === 'cinema');
}
