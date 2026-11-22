/*
 * Stadium Road and the walk north of the ring highway (the numbers are stadiumroad.ts; what was left when the stadium
 * was removed, 2026-11-22, the owner's call): the road, and the walk from Westlake Park's north gate under the raised
 * ring highway to a zebra over it (the footbridge was retired with the highway's rise, docs/highway-plan.md Phase 2),
 * all sites. Part of Westlake Park's chunk, loaded as you approach (`LAZY_DISTRICTS` in districts.ts); the site worker
 * loads it too.
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { site } from './tilework';
import { IN, ROAD, ROAD_LINE, WALK, ZEBRA } from './stadiumroad';
import { along, pieces as runs, ribbon } from './roads3d';
import { ROAD as PAL_ROAD } from './palette';

const ASPHALT = toon('#2c2a44');
const PAINT = toon(PAL_ROAD.zebra);
const CONC = toon('#9893b4');
/** The open ground's asphalt (as the slip lanes', world.ts), the walk a hair over it, the paint over that */
const ROAD_Y = 0.036;
const GROUND_Y = 0.04;
const PAINT_Y = 0.046;

/** A flat strip on the ground from x0..x1 by z0..z1 at y, cut into pieces no longer than `len` (a tile's triangles stay in it) */
function flatRect(b: Batch, x0: number, z0: number, x1: number, z1: number, y: number, mat: THREE.Material, len = 14) {
  const nx = Math.max(1, Math.ceil((x1 - x0) / len));
  const nz = Math.max(1, Math.ceil((z1 - z0) / len));
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const [a0, a1] = [x0 + ((x1 - x0) * i) / nx, x0 + ((x1 - x0) * (i + 1)) / nx];
      const [c0, c1] = [z0 + ((z1 - z0) * j) / nz, z0 + ((z1 - z0) * (j + 1)) / nz];
      b.add(new THREE.PlaneGeometry(a1 - a0, c1 - c0).rotateX(-Math.PI / 2).translate((a0 + a1) / 2, y, (c0 + c1) / 2), mat);
    }
}

export function register() {
  // Stadium Road's way in, from the north road's west edge west and round the bend (in pieces), and a dashed centre line
  const [, bendTop] = ROAD_LINE;
  const inLine = [...along([IN.x0 - 3.7, IN.z], bendTop, 4), ...along(bendTop, [ROAD.x0, ROAD.z], 3).slice(1)];
  runs(inLine, ROAD.half + 0.5).forEach((pc, k) =>
    site(`stadium road in ${k}`, pc.rect, (into) => {
      const b = new Batch();
      b.add(ribbon(pc.pts, -ROAD.half, ROAD.half, () => ROAD_Y), ASPHALT);
      for (let i = 1; i < pc.pts.length; i++) {
        const [a, c] = [pc.pts[i - 1], pc.pts[i]];
        const n = Math.floor(Math.hypot(c[0] - a[0], c[1] - a[1]) / 1.1);
        for (let k2 = 0; k2 < n; k2++) {
          const [x, z] = [a[0] + ((c[0] - a[0]) * (k2 + 0.5)) / n, a[1] + ((c[1] - a[1]) * (k2 + 0.5)) / n];
          b.add(new THREE.PlaneGeometry(0.55, 0.07).rotateX(-Math.PI / 2).rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0])).translate(x, PAINT_Y, z), neon(PAL_ROAD.yellow, 0.9, 1.1));
        }
      }
      b.build(into, { cast: false, receive: true });
    })
  );
  // Stadium Road's stretch west, in stretches, from the bend's foot to its end; a dashed centre line
  const xEast = ROAD.x0;
  for (let x = xEast; x > ROAD.x1; x -= 30) {
    const x0 = Math.max(ROAD.x1, x - 30);
    site(`stadium road ${Math.round(x)}`, [x0, ROAD.z - ROAD.half, x, ROAD.z + ROAD.half], (into) => {
      const b = new Batch();
      flatRect(b, x0, ROAD.z - ROAD.half, x, ROAD.z + ROAD.half, ROAD_Y, ASPHALT);
      for (let p = x - 0.8; p > x0 + 0.4; p -= 1.1) {
        // (none across the zebra)
        if (Math.abs(p - ZEBRA.x) < ZEBRA.half + 0.5) continue;
        b.add(new THREE.PlaneGeometry(0.55, 0.07).rotateX(-Math.PI / 2).translate(p, PAINT_Y, ROAD.z), neon(PAL_ROAD.yellow, 0.9, 1.1));
      }
      b.build(into, { cast: false, receive: true });
    });
  }
  // The walk from the park's north gate under the highway's deck to Stadium Road (paved, a kerb either side), and the
  // zebra over the road onto the open land
  for (let z = WALK.z0; z > WALK.z1 + 0.01; z -= 14) {
    const z1 = Math.max(WALK.z1, z - 14);
    site(`stadium walk ${Math.round(z)}`, [WALK.x - WALK.half - 0.3, z1, WALK.x + WALK.half + 0.3, z], (into) => {
      const b = new Batch();
      flatRect(b, WALK.x - WALK.half, z1, WALK.x + WALK.half, z, GROUND_Y, toon('#b9b4cc'));
      for (const sx of [-1, 1]) b.box(WALK.x + sx * (WALK.half + 0.06) - 0.06, 0, z1, 0.12, 0.09, z - z1, CONC);
      b.build(into, { cast: false, receive: true });
    });
  }
  site('stadium zebra', [ZEBRA.x - ZEBRA.half, ZEBRA.z0, ZEBRA.x + ZEBRA.half, ZEBRA.z1], (into) => {
    const b = new Batch();
    for (let z = ZEBRA.z0 + 0.16; z < ZEBRA.z1 - 0.1; z += 0.32) b.add(new THREE.PlaneGeometry(ZEBRA.half * 2, 0.17).rotateX(-Math.PI / 2).translate(ZEBRA.x, PAINT_Y, z), PAINT);
    b.build(into, { cast: false, receive: true });
  });
}
