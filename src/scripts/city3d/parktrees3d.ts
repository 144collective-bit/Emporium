/*
 * Westlake Park's planting drawn (docs/westlake-plan.md Phase 5; the data is parktrees.ts), sites a tile each in the
 * park's chunk: the trees by kind (elms tall with a vase of a crown, oaks broad and low-spreading on a thick trunk,
 * planes round and light, willows leaning out over the water with their curtains falling to it, pines in tiers), the
 * shrub beds along the wall, and the reeds and lily pads in the coves and the arm. Phones leave out every other tree in
 * the groves and the wood (`clump`) and the lilies' flowers.
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';
import { SLAB } from './world';
import { site } from './tilework';
import { TILE, tileOf } from './tiles';
import { LILIES, PARK_TREES, REEDS, SHRUBS, type ParkTree } from './parktrees';
import { WATER_Y, type Pt } from './westlake';
import { PLANT, TREE } from './palette';

const ELM = toon(TREE.elm);
const OAK = toon(TREE.oak);
const PLANE = toon(TREE.plane);
const WILLOW = toon(TREE.willow);
const PINE = toon(TREE.pine);
const BARK = toon(TREE.bark);
const SHRUB = toon(PLANT.shrub);
const SHRUB_DARK = toon(PLANT.shrubDark);
const REED = toon(TREE.reed);
const LILY = toon(TREE.lily);
const LILY_FLOWER = toon(TREE.lilyFlower);

/** A seeded number from a tree's place (its own shape, the same every time) */
const seeded = (x: number, z: number, k: number) => {
  const v = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453;
  return v - Math.floor(v);
};

function tree(b: Batch, t: ParkTree) {
  const { x, z, s } = t;
  const y = SLAB;
  const r = (k: number) => seeded(x, z, k);
  const blob = (cx: number, cy: number, cz: number, rad: number, sy: number, m: THREE.Material) =>
    b.add(new THREE.IcosahedronGeometry(rad, 1).scale(1, sy, 1).rotateY(r(9) * Math.PI).translate(cx, cy, cz), m);
  switch (t.kind) {
    case 'elm': {
      // A tall straight trunk, a crown opening upward like a vase
      b.add(new THREE.CylinderGeometry(0.1 * s, 0.16 * s, 1.9 * s, 7).translate(x, y + 0.95 * s, z), BARK);
      blob(x, y + 2.1 * s, z, 0.75 * s, 1.0, ELM);
      blob(x, y + 2.9 * s, z, 0.95 * s, 0.7, ELM);
      break;
    }
    case 'oak': {
      // A thick short trunk, limbs out, a broad low crown in several masses
      b.add(new THREE.CylinderGeometry(0.16 * s, 0.24 * s, 1.3 * s, 7).translate(x, y + 0.65 * s, z), BARK);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + r(1) * 2;
        const d = (0.55 + r(k + 2) * 0.3) * s;
        blob(x + Math.cos(a) * d, y + (1.7 + r(k + 5) * 0.4) * s, z + Math.sin(a) * d, (0.7 + r(k + 7) * 0.25) * s, 0.7, OAK);
      }
      blob(x, y + 2.2 * s, z, 0.85 * s, 0.75, OAK);
      break;
    }
    case 'plane': {
      b.add(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.5 * s, 7).translate(x, y + 0.75 * s, z), BARK);
      blob(x, y + 2.15 * s, z, 1.05 * s, 0.85, PLANE);
      blob(x + 0.4 * s, y + 2.5 * s, z - 0.3 * s, 0.6 * s, 0.8, PLANE);
      break;
    }
    case 'willow': {
      // The trunk leaning out over the water, a dome of a crown at its top, its curtains falling round to the water
      const [lx, lz] = [Math.cos(t.lean), Math.sin(t.lean)];
      const top: Pt = [x + lx * 0.9 * s, z + lz * 0.9 * s];
      const trunk = new THREE.CylinderGeometry(0.11 * s, 0.17 * s, 1.8 * s, 7).translate(0, 0.9 * s, 0);
      trunk.rotateZ(-0.45).rotateY(-t.lean);
      b.add(trunk.translate(x, y, z), BARK);
      blob(top[0], y + 2.05 * s, top[1], 1.1 * s, 0.5, WILLOW);
      // (the curtain: strands hanging from round the crown's rim, flaring a little as they fall, the longest over the
      // water: thin tapering blades, open between, so it reads as a willow's veil, not a solid)
      const n = 16;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + r(k) * 0.3;
        // (longer on the water's side, where it falls past the lawn towards the water)
        const toward = Math.cos(a - t.lean);
        const fall = (1.3 + 0.9 * Math.max(0, toward) + r(k + 20) * 0.3) * s;
        const rim = 0.95 * s;
        const strand = new THREE.ConeGeometry(0.16 * s, fall, 4, 1, true).rotateX(Math.PI).translate(0, -fall / 2, 0);
        strand.rotateZ(0.12 * (k % 2 ? 1 : -1));
        b.add(strand.rotateY(-a).translate(top[0] + Math.cos(a) * rim, y + 2.0 * s, top[1] + Math.sin(a) * rim), WILLOW);
      }
      break;
    }
    case 'pine': {
      b.add(new THREE.CylinderGeometry(0.08 * s, 0.12 * s, 1.0 * s, 6).translate(x, y + 0.5 * s, z), BARK);
      for (let k = 0; k < 3; k++) b.add(new THREE.ConeGeometry((0.8 - k * 0.22) * s, 1.1 * s, 8).translate(x, y + (1.1 + k * 0.6) * s, z), PINE);
      break;
    }
  }
}

/** The planting, a site a tile */
export function registerParkTrees(low: boolean) {
  type Item = { kind: 'tree'; t: ParkTree; i: number } | { kind: 'shrub'; x: number; z: number; r: number; k: number } | { kind: 'reed'; p: Pt } | { kind: 'lily'; l: (typeof LILIES)[number] };
  const tiles = new Map<string, Item[]>();
  const put = (x: number, z: number, it: Item) => {
    const key = tileOf(x, z).join(',');
    if (!tiles.has(key)) tiles.set(key, []);
    tiles.get(key)!.push(it);
  };
  PARK_TREES.forEach((t, i) => !(low && t.clump && i % 2) && put(t.x, t.z, { kind: 'tree', t, i }));
  SHRUBS.forEach((bed, k) => bed.shrubs.forEach((sh) => put(sh.x, sh.z, { kind: 'shrub', ...sh, k })));
  for (const p of REEDS) put(p[0], p[1], { kind: 'reed', p });
  for (const l of LILIES) put(l.x, l.z, { kind: 'lily', l });
  for (const [key, list] of tiles) {
    const [i, j] = key.split(',').map(Number);
    site(`westlake planting ${key}`, [i * TILE - 6, j * TILE - 6, (i + 1) * TILE + 6, (j + 1) * TILE + 6], (into) => {
      const b = new Batch();
      for (const it of list) {
        if (it.kind === 'tree') tree(b, it.t);
        else if (it.kind === 'shrub') b.add(new THREE.IcosahedronGeometry(it.r, 0).scale(1, 0.75, 1).translate(it.x, SLAB + it.r * 0.6, it.z), it.k % 3 ? SHRUB : SHRUB_DARK);
        else if (it.kind === 'reed') {
          // A clump of reeds rising from the water at the embankment's foot
          const [x, z] = it.p;
          for (let k = 0; k < (low ? 4 : 8); k++) {
            const a = k * 2.4;
            const h = 0.7 + seeded(x, z, k) * 0.5;
            b.add(new THREE.ConeGeometry(0.03, h, 4).translate(x + Math.cos(a) * 0.18, SLAB + WATER_Y + h / 2, z + Math.sin(a) * 0.18), REED);
          }
        } else {
          const { x, z, r, flower } = it.l;
          b.add(new THREE.CircleGeometry(r, 9, 0.4, Math.PI * 2 - 0.4).rotateX(-Math.PI / 2).translate(x, SLAB + WATER_Y + 0.015, z), LILY);
          if (flower && !low) b.add(new THREE.SphereGeometry(0.07, 6, 4).translate(x, SLAB + WATER_Y + 0.06, z), LILY_FLOWER);
        }
      }
      b.build(into, { cast: true, receive: true });
    });
  }
}
