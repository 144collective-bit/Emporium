/*
 * The Neon Mile's streets drawn (docs/strip-plan.md Phase 1; the data is strip.ts), a district loaded as you approach
 * (districts.ts `LAZY_DISTRICTS`), as sites: the boulevard (asphalt, its planted median with a raised kerb, palms down
 * it with a neon uplight at each one's foot, white dashes between each way's lanes, zebras across its ends) and the
 * east road (asphalt, a dashed yellow centre line, zebras where the avenues and the boulevard meet it). The lots'
 * slabs are the boot's (world.ts), the lamps too (index.ts, `STRIP_LAMPS`). Fresh and clean: the Strip is kept up.
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { site } from './tilework';
import { SLAB } from './world';
import { SWAY } from './dusk';
import { EW_ROADS, LANE, MEDIAN, RING_HI, STRIP_BLVD, STRIP_EAST_X } from './layout';
import { BLVD_WEST, type Rect } from './strip';
import { crown, trunk } from './palms3d';

export const SELF = import.meta.url;

/** The streets' asphalt, level with the city's other district streets */
const Y = 0.031;
/** Pieces no longer than this (a site each: nothing much longer than a tile, tileBatch()) */
const PIECE = 24;
const unit = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const UP = new THREE.Vector3(0, 1, 0);
const NORTH = EW_ROADS[0];
const BANK = EW_ROADS.find((r) => r.c === RING_HI)!;
const { z: BZ, half: BH, median: BM } = STRIP_BLVD;

/** The boulevard's x in pieces (west to east) */
const pieces = (x0: number, x1: number): [number, number][] => {
  const n = Math.max(1, Math.ceil((x1 - x0) / PIECE));
  return Array.from({ length: n }, (_, k): [number, number] => [x0 + ((x1 - x0) * k) / n, x0 + ((x1 - x0) * (k + 1)) / n]);
};
/** Palms down the median, every this far, clear of its ends */
const PALM_GAP = 7;
/** Where the median stops short of each end (its noses), so the turns and the crossings are clear */
const MEDIAN_END = 9;

export function register({ low }: { low: boolean; scene: THREE.Scene | null }) {
  const asphalt = toon('#2a2838');
  const white = toon('#eceaf6');
  const yellow = neon('#f5d76e', 0.9, 1.1);
  const zebra = toon('#e8e4f8');
  const kerbTop = toon('#5a5290');
  const grass = toon('#3f7a4a');
  const trunkMat = toon('#8f7458');
  const fronds = [toon('#3d9a4c'), toon('#4aa95a')];
  // (a neon uplight at each palm's foot: magenta and cyan in turn, the Strip's colours)
  const uplights = [neon('#ff3fd2', 0.5, 1.3), neon('#2ef2ff', 0.5, 1.3)];
  const palmTrunk = trunk(0.19, 0.13, 0.35, low ? 5 : 7);
  const palmCrown = crown(low ? 9 : 14, 1.05, 0.34, 0.45, 0.85, 0.05);
  const fixture = new THREE.CylinderGeometry(0.11, 0.13, 0.06, 8).translate(0, 0.03, 0);
  const m = (x: number, y: number, z: number, yaw: number, sx: number, sy = sx, sz = sx) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, yaw), new THREE.Vector3(sx, sy, sz));

  /* ---------- The boulevard ---------- */
  const [mx0, mx1] = [BLVD_WEST + MEDIAN_END, STRIP_EAST_X - MEDIAN_END];
  for (const [x0, x1] of pieces(BLVD_WEST, STRIP_EAST_X)) {
    site(`strip blvd ${x0.toFixed(0)}`, [x0 - 1, BZ - BH - 1, x1 + 1, BZ + BH + 1], (into) => {
      const b = new Batch();
      b.box(x0, 0, BZ - BH, x1 - x0, Y, BH * 2, asphalt);
      // The median, raised behind its kerb, grass on top, between its noses
      const [a0, a1] = [Math.max(x0, mx0), Math.min(x1, mx1)];
      if (a1 > a0) {
        b.box(a0, 0, BZ - BM / 2, a1 - a0, SLAB, BM, kerbTop);
        b.box(a0, SLAB, BZ - BM / 2 + 0.08, a1 - a0, 0.005, BM - 0.16, grass);
      }
      // White dashes between each way's two lanes, and a solid edge line by the median (but at the ends' junctions)
      const whites: THREE.Matrix4[] = [];
      for (const side of [-1, 1]) {
        const off = side * (BM / 2 + LANE);
        for (let x = x0 + 0.55; x < x1; x += 1.1) if (x > BLVD_WEST + 6 && x < STRIP_EAST_X - 6) whites.push(m(x, Y + 0.006, BZ + off, 0, 1, 1, 1).multiply(new THREE.Matrix4().makeScale(0.55, 1, 0.07)));
        if (a1 > a0) whites.push(m((a0 + a1) / 2, Y + 0.006, BZ + side * (BM / 2 + 0.12), 0, 1).multiply(new THREE.Matrix4().makeScale(a1 - a0, 1, 0.07)));
      }
      b.instances(unit, white, whites);
      // Palms down the median, each with its uplight
      const ps: THREE.Matrix4[] = [];
      const cs: THREE.Matrix4[][] = [[], []];
      const ls: THREE.Matrix4[][] = [[], []];
      let k = 0;
      for (let x = mx0 + 3; x <= mx1 - 3; x += PALM_GAP, k++) {
        if (x < x0 || x >= x1) continue;
        const s = 0.95 + ((k * 37) % 7) * 0.03;
        const h = 6.2 + ((k * 53) % 5) * 0.35;
        const turn = (k * 1.7) % (Math.PI * 2);
        ps.push(m(x, SLAB - 0.05, BZ, turn, s, h, s));
        const lean = 0.35 * s;
        cs[k % 2].push(m(x + Math.cos(turn) * lean, SLAB + h, BZ - Math.sin(turn) * lean, turn, s));
        ls[k % 2].push(m(x + 0.4, SLAB + 0.006, BZ, 0, 1));
      }
      b.instances(palmTrunk, trunkMat, ps);
      cs.forEach((list, i) => b.instances(palmCrown, fronds[i], list, low ? 0 : SWAY));
      b.detail(() => ls.forEach((list, i) => b.instances(fixture, uplights[i], list)));
      b.build(into, { cast: true, receive: true });
    });
  }

  /* ---------- The east road ---------- */
  const [ez0, ez1] = [NORTH.c + NORTH.half, BANK.c - BANK.half];
  const junctions = [17, BZ, 43];
  for (const [z0, z1] of pieces(ez0, ez1))
    site(`strip east ${z0.toFixed(0)}`, [STRIP_EAST_X - LANE - 1, z0 - 1, STRIP_EAST_X + LANE + 1, z1 + 1], (into) => {
      const b = new Batch();
      b.box(STRIP_EAST_X - LANE, 0, z0, LANE * 2, Y, z1 - z0, asphalt);
      const ys: THREE.Matrix4[] = [];
      for (let z = z0 + 0.55; z < z1; z += 1.1) {
        if (z < ez0 + 2 || z > ez1 - 2 || junctions.some((c) => Math.abs(z - c) < (c === BZ ? BH : LANE) + 1.2)) continue;
        ys.push(m(STRIP_EAST_X, Y + 0.006, z, 0, 1).multiply(new THREE.Matrix4().makeScale(0.07, 1, 0.55)));
      }
      b.instances(unit, yellow, ys);
      b.build(into, { cast: false, receive: true });
    });

  /* ---------- Zebras ---------- */
  // At the boulevard's ends, across it (west of the east road, east of the Parkway), and at the east road's lit
  // junctions with the avenues, across the east road's end
  const zs: THREE.Matrix4[] = [];
  const stripe = (x: number, z: number, w: number, d: number) => zs.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0.04, z), new THREE.Quaternion(), new THREE.Vector3(w, 1, d)));
  const across = (x: number) => {
    for (let w = -BH + 0.16; w < BH - 0.1; w += 0.32) if (Math.abs(w) > BM / 2 + 0.1) stripe(x, BZ + w, 0.55, 0.17);
  };
  across(BLVD_WEST + LANE + 1.2);
  across(STRIP_EAST_X - LANE - 0.75);
  for (const z of [
    NORTH.c + NORTH.half + 0.75,
    BANK.c - BANK.half - 0.75,
  ])
    for (let w = -LANE + 0.16; w < LANE - 0.1; w += 0.32) stripe(STRIP_EAST_X + w, z, 0.17, 0.55);
  // ...and across the avenues either side of the east road's ends
  for (const r of [NORTH, BANK])
    for (const dir of [-1, 1]) {
      const x = STRIP_EAST_X + dir * (LANE + 0.75);
      for (let w = -r.half + 0.16; w < r.half - 0.1; w += 0.32) if (Math.abs(w) > MEDIAN / 2 + 0.1) stripe(x, r.c + w, 0.55, 0.17);
    }
  const box: Rect = [BLVD_WEST - 2, NORTH.c - NORTH.half - 2, STRIP_EAST_X + 6, BANK.c + BANK.half + 2];
  site('strip zebras', box, (into) => {
    const b = new Batch();
    b.instances(unit, zebra, zs);
    b.build(into, { cast: false, receive: true });
  });
}
