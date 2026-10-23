/*
 * Sector 7 Stadium's grounds (the north side's stage 1, docs/north-plan.md;
 * the numbers are stadium.ts): Stadium Road, the car park inside its
 * one-way loop (asphalt, bays, arrows, a P sign) and the footbridge from
 * Westlake Park's Mall over the ring highway (stairs, deck, parapets with a
 * cyan line, lamps, piers), all sites. Part of Westlake Park's chunk,
 * loaded as you approach either (`LAZY_DISTRICTS` in districts.ts); the
 * site worker loads it too.
 * The stadium itself and the car park's cars are built at the boot
 * (stadium3d.ts).
 */
import * as THREE from 'three';
import { Batch, PAL, neon, toon } from './kit';
import { SLAB } from './world';
import { site } from './tilework';
import { BAY, BAYS, BRIDGE, CAR_PARK, LOOP, ROAD } from './stadium';

const IRON = toon('#1b1830');

const ASPHALT = toon('#2c2a44');
const PAINT = toon('#e8e4f8');
const CONC = toon('#9893b4');
const RAIL = toon('#d8d4ec');
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
  // Stadium Road, in stretches, from the north road's west edge to its end past the stadium; a dashed centre line
  const xEast = ROAD.x0 - 3.7;
  for (let x = xEast; x > ROAD.x1; x -= 30) {
    const x0 = Math.max(ROAD.x1, x - 30);
    site(`stadium road ${Math.round(x)}`, [x0, ROAD.z - ROAD.half, x, ROAD.z + ROAD.half], (into) => {
      const b = new Batch();
      flatRect(b, x0, ROAD.z - ROAD.half, x, ROAD.z + ROAD.half, ROAD_Y, ASPHALT);
      for (let p = x - 0.8; p > x0 + 0.4; p -= 1.1) {
        // (no dashes across the loop's ways in)
        if (Math.abs(p - LOOP.x0) < LOOP.half + 0.6 || Math.abs(p - LOOP.x1) < LOOP.half + 0.6) continue;
        b.add(new THREE.PlaneGeometry(0.55, 0.07).rotateX(-Math.PI / 2).translate(p, PAINT_Y, ROAD.z), neon('#f5d76e', 0.9, 1.1));
      }
      b.build(into, { cast: false, receive: true });
    });
  }
  // The loop's three sides and the car park inside it, in pieces; bays and one-way arrows near only
  const [cx0, cz0, cx1, cz1] = CAR_PARK;
  const pieces: [number, number, number, number][] = [
    [LOOP.x0 - LOOP.half, LOOP.z1 - LOOP.half, LOOP.x0 + LOOP.half, ROAD.z - ROAD.half],
    [LOOP.x0 - LOOP.half, LOOP.z1 - LOOP.half, LOOP.x1 + LOOP.half, LOOP.z1 + LOOP.half],
    [LOOP.x1 - LOOP.half, LOOP.z1 - LOOP.half, LOOP.x1 + LOOP.half, ROAD.z - ROAD.half],
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
          if (i === 0) for (let z = ROAD.z - 8; z > LOOP.z1 + 4; z -= 12) arrow(LOOP.x0, z, Math.PI / 2);
          if (i === 1) for (let x = LOOP.x0 + 8; x < LOOP.x1 - 4; x += 14) arrow(x, LOOP.z1, 0);
          if (i === 2) for (let z = LOOP.z1 + 8; z < ROAD.z - 4; z += 12) arrow(LOOP.x1, z, -Math.PI / 2);
        });
      b.build(into, { cast: false, receive: true });
    })
  );
  // A P sign at the loop's way in
  site('stadium car park sign', [LOOP.x1 + 1, ROAD.z - 4, LOOP.x1 + 4, ROAD.z - 1], (into) => {
    const b = new Batch();
    const [x, z] = [LOOP.x1 + LOOP.half + 0.9, ROAD.z - ROAD.half - 1.2];
    b.box(x - 0.06, 0, z - 0.06, 0.12, 2.6, 0.12, IRON);
    b.box(x - 0.5, 2.0, z - 0.05, 1.0, 1.0, 0.1, toon('#1d4fd6'));
    const W = neon('#ffffff', 0.8, 1.4);
    b.box(x - 0.3, 2.2, z + 0.05, 0.16, 0.6, 0.06, W);
    b.box(x - 0.3, 2.62, z + 0.05, 0.42, 0.16, 0.06, W);
    b.box(x + 0.02, 2.4, z + 0.05, 0.12, 0.38, 0.06, W);
    b.box(x - 0.3, 2.36, z + 0.05, 0.42, 0.14, 0.06, W);
    b.build(into, { cast: true, receive: true });
  });

  // The footbridge: the stairs at each end, the deck in short pieces between, parapets with a cyan line, lamps, piers
  const { x, half, y, deck, steps, tread, south, north, piers } = BRIDGE;
  const rise = (y - SLAB) / steps;
  const T = 0.35;
  const stair = (from: number, dir: 1 | -1) => {
    // Steps from the foot (from) towards the deck (dir: -1 north, +1 south), each a block down to the ground
    const b = new Batch();
    for (let k = 0; k < steps; k++) {
      const z0 = from + dir * k * tread;
      const z1 = z0 + dir * tread;
      b.box(x - half, SLAB, Math.min(z0, z1), half * 2, rise * (k + 1), tread, CONC);
    }
    // Its side walls, sloping up with it (a side profile, 0.16 thick), a rail along each
    const zTop = from + dir * steps * tread;
    const wall = new THREE.Shape([
      new THREE.Vector2(from, SLAB),
      new THREE.Vector2(from, SLAB + 0.9),
      new THREE.Vector2(zTop, y + 0.9),
      new THREE.Vector2(zTop, SLAB),
    ]);
    for (const sx of [-1, 1]) {
      // (the profile drawn in z, y; extruded along x)
      const g = new THREE.ExtrudeGeometry(wall, { depth: 0.16, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(x + sx * (half + 0.08) + 0.08, 0, 0);
      b.add(g, CONC);
      const len = Math.hypot(zTop - from, y - SLAB);
      b.add(new THREE.BoxGeometry(0.06, 0.06, len).rotateX(-dir * Math.atan2(y - SLAB, Math.abs(zTop - from))).translate(x + sx * (half + 0.08), (SLAB + y) / 2 + 1.0, (from + zTop) / 2), RAIL);
    }
    return b;
  };
  site('stadium bridge stairs south', [x - half - 0.3, south[1], x + half + 0.3, south[0]], (into) => stair(south[0], -1).build(into, { cast: true, receive: true }));
  site('stadium bridge stairs north', [x - half - 0.3, north[0], x + half + 0.3, north[1]], (into) => stair(north[0], 1).build(into, { cast: true, receive: true }));
  const pieceLen = 9;
  for (let z = deck[0]; z > deck[1] + 0.01; z -= pieceLen) {
    const z1 = Math.max(deck[1], z - pieceLen);
    site(`stadium bridge deck ${Math.round(z)}`, [x - half - 0.3, z1, x + half + 0.3, z], (into) => {
      const b = new Batch();
      b.box(x - half - 0.15, y - T, z1, half * 2 + 0.3, T, z - z1, CONC);
      // A girder edge under each side, and the parapets: a concrete upstand, posts and a rail with a cyan line
      for (const sx of [-1, 1]) {
        b.box(x + sx * (half + 0.05) - 0.1, y - T - 0.35, z1, 0.2, 0.35, z - z1, toon('#6e6a8a'));
        b.box(x + sx * (half + 0.05) - 0.08, y, z1, 0.16, 0.35, z - z1, CONC);
        b.box(x + sx * (half + 0.05) - 0.04, y + 0.95, z1, 0.08, 0.06, z - z1, RAIL);
        b.box(x + sx * (half + 0.12) - 0.02, y + 0.5, z1, 0.03, 0.03, z - z1, neon(PAL.cyan, 0.5, 2.4));
        for (let p = z - 0.6; p > z1; p -= 1.5) b.box(x + sx * (half + 0.05) - 0.03, y + 0.35, p - 0.03, 0.06, 0.6, 0.06, RAIL);
      }
      b.build(into, { cast: true, receive: true });
    });
  }
  site('stadium bridge piers', [x - 1, deck[1], x + 1, deck[0]], (into) => {
    const b = new Batch();
    for (const pz of piers) {
      const foot = pz < -159.8 && pz > -180.5 ? 0.034 : SLAB;
      b.box(x - 0.9, foot, pz - 0.2, 1.8, y - T - 0.35 - foot, 0.4, CONC);
      b.box(x - 1.0, y - T - 0.45, pz - 0.3, 2.0, 0.12, 0.6, CONC);
    }
    // Lamps on the deck, a pair every so often
    b.detail(() => {
      for (let pz = deck[0] - 5; pz > deck[1] + 2; pz -= 10)
        for (const sx of [-1, 1]) {
          b.box(x + sx * (half + 0.05) - 0.04, y + 0.35, pz - 0.04, 0.08, 1.8, 0.08, IRON);
          b.box(x + sx * (half + 0.05) - 0.1, y + 2.1, pz - 0.1, 0.2, 0.18, 0.2, neon('#ffe2a0', 0.6, 2.4));
        }
    });
    b.build(into, { cast: true, receive: true });
  });
}
