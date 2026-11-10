/*
 * The civic quarter on screen, Phase 1 (docs/civic-plan.md; the numbers are civic.ts): the civic square, a site
 * in Westlake Park's chunk (registered by westlake3d.ts). Uptown's granite (plaza3d.ts) over the whole square, so
 * the axis reads as one walk from City Hall's door over the avenue to the plaza's cross; the axis inlaid down its
 * middle in a darker stone, a border of it round the square's three park sides, a pale ring round its middle
 * where the axis crosses the line between the two flanking lots, grates round its trees, and benches facing the
 * axis (near only). Its trees and lamps are the city's, placed at the boot (index.ts). The lots are lawn until
 * their buildings come (Phases 2 and 3).
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';
import { site } from './tilework';
import { GRANITE_TILE, bench, granite, quad } from './plaza3d';
import { PAVE_Y } from './gardens3d';
import { AXIS, AXIS_HALF, BORDER, COURT, GRATE, HALL, POLICE, SQUARE, SQUARE_BENCHES, SQUARE_TREES, type Rect } from './civic';

/** The square's granite: over the park's paved walks where they cross it (nothing flush) */
export const TOP = PAVE_Y + 0.008;
/** The inlays over the granite, and what lies on them over that */
const INLAY_Y = TOP + 0.006;
const OVER_Y = INLAY_Y + 0.006;
const INLAY = toon('#6f6a86');
const PALE = toon('#e0dacb');
const IRON = toon('#2b2838');

/** A rect cut into pieces no longer than about `most` either way (a fixed triangle never much longer than a tile) */
function pieces([x0, z0, x1, z1]: Rect, most = 16): Rect[] {
  const [nx, nz] = [Math.ceil((x1 - x0) / most), Math.ceil((z1 - z0) / most)];
  const out: Rect[] = [];
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) out.push([x0 + ((x1 - x0) * i) / nx, z0 + ((z1 - z0) * j) / nz, x0 + ((x1 - x0) * (i + 1)) / nx, z0 + ((z1 - z0) * (j + 1)) / nz]);
  return out;
}

/** The ring's middle: on the axis, level with the middle of the flanking lots */
export const RING_C: [number, number] = [AXIS, (Math.max(POLICE[1], COURT[1]) + Math.min(POLICE[3], COURT[3])) / 2];
export const RING_R = 5.2;

export function registerCivic() {
  const [x0, z0, x1, z1] = SQUARE;
  site('civic square', [x0, z0, x1, z1], (into) => {
    const b = new Batch();
    for (const p of pieces(SQUARE)) b.add(quad(p, TOP, GRANITE_TILE), granite);
    // The axis, from the avenue to City Hall's door, broken by the ring round the middle
    const [rx, rz] = RING_C;
    for (const [za, zb] of [
      [HALL.door[1], rz - RING_R - 0.3],
      [rz + RING_R + 0.3, z1],
    ])
      for (const p of pieces([AXIS - AXIS_HALF, za, AXIS + AXIS_HALF, zb])) b.add(quad(p, INLAY_Y), INLAY);
    // A pale ring round the middle, the axis's two lines carried round inside it, a dark disc at its heart
    b.add(new THREE.RingGeometry(RING_R - 0.6, RING_R + 0.3, 64).rotateX(-Math.PI / 2).translate(rx, INLAY_Y, rz), PALE);
    b.add(new THREE.CircleGeometry(1.4, 32).rotateX(-Math.PI / 2).translate(rx, INLAY_Y, rz), INLAY);
    // (the lines stop short of the ring's inside edge: nothing flush)
    const reach = Math.sqrt((RING_R - 0.6) ** 2 - (AXIS_HALF + 0.15) ** 2) - 0.1;
    for (const s of [-1, 1]) {
      const [lx0, lx1] = [AXIS + s * AXIS_HALF - 0.15, AXIS + s * AXIS_HALF + 0.15];
      b.add(quad([lx0, rz - reach, lx1, rz - 1.6], INLAY_Y), INLAY);
      b.add(quad([lx0, rz + 1.6, lx1, rz + reach], INLAY_Y), INLAY);
    }
    // The border round its park sides (the avenue's side is open)
    for (const r of [
      [x0, z0, x1, z0 + BORDER],
      [x0, z0 + BORDER, x0 + BORDER, z1],
      [x1 - BORDER, z0 + BORDER, x1, z1],
    ] as Rect[])
      for (const p of pieces(r)) b.add(quad(p, INLAY_Y), INLAY);
    // Grates round the trees (their bars near only)
    for (const [tx, tz] of SQUARE_TREES) {
      b.add(quad([tx - GRATE, tz - GRATE, tx + GRATE, tz + GRATE], INLAY_Y), IRON);
      b.detail(() => {
        for (let k = -2; k <= 2; k++) b.add(quad([tx - GRATE + 0.06, tz + k * 0.28 - 0.03, tx + GRATE - 0.06, tz + k * 0.28 + 0.03], OVER_Y), INLAY);
      });
    }
    // Benches facing the axis
    for (const s of SQUARE_BENCHES) bench(b, s.at, s.ry, TOP);
    b.build(into, { cast: true, receive: true });
  });
}
