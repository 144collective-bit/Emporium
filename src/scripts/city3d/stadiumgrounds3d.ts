/*
 * Sector 7 Stadium's grounds (the north side's stage 1, docs/north-plan.md;
 * the numbers are stadium.ts): Stadium Road, the car park inside its
 * one-way loop (asphalt, bays, arrows, a P sign) and the walk from
 * Westlake Park's north gate under the raised ring highway to a zebra over
 * Stadium Road (the footbridge was retired with the highway's rise,
 * docs/highway-plan.md Phase 2), all sites. Part of Westlake Park's chunk,
 * loaded as you approach either (`LAZY_DISTRICTS` in districts.ts); the
 * site worker loads it too.
 * The stadium itself and the car park's cars are built at the boot
 * (stadium3d.ts).
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { site } from './tilework';
import { BAY, BAYS, CAR_PARK, IN, LOOP, ROAD, ROAD_LINE, WALK, ZEBRA } from './stadium';
import { along, pieces as runs, ribbon } from './roads3d';

const IRON = toon('#1b1830');

const ASPHALT = toon('#2c2a44');
const PAINT = toon('#e8e4f8');
const CONC = toon('#9893b4');
/** The open ground's asphalt (as the slip lanes', world.ts), the car park's a hair over it, their paint over that */
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
  // Stadium Road's way in, from the north road's west edge west and round the bend (in pieces), and a dashed centre
  // line but across the loop's ways in
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
          if (Math.abs(z - IN.z) < 0.1 && (Math.abs(x - LOOP.x0) < LOOP.half + 0.6 || Math.abs(x - LOOP.x1) < LOOP.half + 0.6)) continue;
          b.add(new THREE.PlaneGeometry(0.55, 0.07).rotateX(-Math.PI / 2).rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0])).translate(x, PAINT_Y, z), neon('#f5d76e', 0.9, 1.1));
        }
      }
      b.build(into, { cast: false, receive: true });
    })
  );
  // Stadium Road past the stadium's front, in stretches, from the bend's foot to its end; a dashed centre line
  const xEast = ROAD.x0;
  for (let x = xEast; x > ROAD.x1; x -= 30) {
    const x0 = Math.max(ROAD.x1, x - 30);
    site(`stadium road ${Math.round(x)}`, [x0, ROAD.z - ROAD.half, x, ROAD.z + ROAD.half], (into) => {
      const b = new Batch();
      flatRect(b, x0, ROAD.z - ROAD.half, x, ROAD.z + ROAD.half, ROAD_Y, ASPHALT);
      for (let p = x - 0.8; p > x0 + 0.4; p -= 1.1) {
        // (none across the zebra)
        if (Math.abs(p - ZEBRA.x) < ZEBRA.half + 0.5) continue;
        b.add(new THREE.PlaneGeometry(0.55, 0.07).rotateX(-Math.PI / 2).translate(p, PAINT_Y, ROAD.z), neon('#f5d76e', 0.9, 1.1));
      }
      b.build(into, { cast: false, receive: true });
    });
  }
  // The loop's three sides and the car park inside it, in pieces; bays and one-way arrows near only
  const [cx0, cz0, cx1, cz1] = CAR_PARK;
  const pieces: [number, number, number, number][] = [
    [LOOP.x0 - LOOP.half, LOOP.z1 - LOOP.half, LOOP.x0 + LOOP.half, IN.z - ROAD.half],
    [LOOP.x0 - LOOP.half, LOOP.z1 - LOOP.half, LOOP.x1 + LOOP.half, LOOP.z1 + LOOP.half],
    [LOOP.x1 - LOOP.half, LOOP.z1 - LOOP.half, LOOP.x1 + LOOP.half, IN.z - ROAD.half],
  ];
  for (let x = cx0; x < cx1 - 0.01; x += 22) pieces.push([x, cz0, Math.min(cx1, x + 22), cz1]);
  pieces.forEach((r, i) =>
    site(`stadium car park ${i}`, r, (into) => {
      const b = new Batch();
      // (the loop's own asphalt, and the car park's a hair over it, filling the gap between)
      flatRect(b, r[0], r[1], r[2], r[3], i < 3 ? ROAD_Y : GROUND_Y, ASPHALT);
      if (i >= 3) {
        flatRect(b, r[0], Math.min(r[1], LOOP.z1 + LOOP.half), r[2], cz0 + 0.01, ROAD_Y + 0.001, ASPHALT);
        b.detail(() => {
          for (const bay of BAYS) {
            if (bay.x < r[0] || bay.x >= r[2]) continue;
            for (const sx of [-1, 1]) b.add(new THREE.PlaneGeometry(0.08, BAY.d).rotateX(-Math.PI / 2).translate(bay.x + (sx * BAY.w) / 2, PAINT_Y, bay.z), PAINT);
          }
        });
      } else
        b.detail(() => {
          // One-way arrows round the loop (driven north up its west side, east, south down its east side)
          const arrow = (x: number, z: number, ry: number) => {
            b.add(new THREE.PlaneGeometry(1.4, 0.18).rotateX(-Math.PI / 2).rotateY(ry).translate(x, PAINT_Y, z), PAINT);
            for (const s of [-1, 1]) b.add(new THREE.PlaneGeometry(0.7, 0.18).rotateX(-Math.PI / 2).rotateY(ry + s * 0.7).translate(x + Math.cos(ry) * 0.5 - Math.cos(ry + s * 0.7) * 0.3, PAINT_Y, z - Math.sin(ry) * 0.5 + Math.sin(ry + s * 0.7) * 0.3), PAINT);
          };
          if (i === 0) for (let z = IN.z - 8; z > LOOP.z1 + 4; z -= 12) arrow(LOOP.x0, z, Math.PI / 2);
          if (i === 1) for (let x = LOOP.x0 + 8; x < LOOP.x1 - 4; x += 14) arrow(x, LOOP.z1, 0);
          if (i === 2) for (let z = LOOP.z1 + 8; z < IN.z - 4; z += 12) arrow(LOOP.x1, z, -Math.PI / 2);
        });
      b.build(into, { cast: false, receive: true });
    })
  );
  // A P sign at the loop's way in
  site('stadium car park sign', [LOOP.x1 + 1, IN.z - 4, LOOP.x1 + 4, IN.z - 1], (into) => {
    const b = new Batch();
    const [x, z] = [LOOP.x1 + LOOP.half + 0.9, IN.z - ROAD.half - 1.2];
    b.box(x - 0.06, 0, z - 0.06, 0.12, 2.6, 0.12, IRON);
    b.box(x - 0.5, 2.0, z - 0.05, 1.0, 1.0, 0.1, toon('#1d4fd6'));
    const W = neon('#ffffff', 0.8, 1.4);
    b.box(x - 0.3, 2.2, z + 0.05, 0.16, 0.6, 0.06, W);
    b.box(x - 0.3, 2.62, z + 0.05, 0.42, 0.16, 0.06, W);
    b.box(x + 0.02, 2.4, z + 0.05, 0.12, 0.38, 0.06, W);
    b.box(x - 0.3, 2.36, z + 0.05, 0.42, 0.14, 0.06, W);
    b.build(into, { cast: true, receive: true });
  });

  // The walk from the park's north gate under the highway's deck to Stadium Road (paved, a kerb either side), and the
  // zebra over the road to the forecourt
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
