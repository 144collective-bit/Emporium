/*
 * Uptown North's square and walks on screen (the numbers are uptownnorth.ts;
 * its towers are highrise3d.ts's): sites in Uptown's chunk. The plaza's
 * granite over the square and the park's gates' walks through the block, a
 * darker band round the pool, the pool in a stone rim with a twisting steel
 * sculpture standing in it and a lit ring, benches facing it and grates
 * round the trees (the trees are the city's, placed at the boot).
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { SLAB } from './world';
import { site } from './tilework';
import { GATE_WALKS, NORTH_SQUARE, POOL, SQUARE_BENCHES, SQUARE_TREES, type Rect } from './uptownnorth';
import { GRANITE_TILE, bench, granite, quad } from './plaza3d';

const PAVE = SLAB + 0.012;
const STONE = toon('#d8d2c4');
const STONE_DARK = toon('#7d7690');
const WATER = toon('#3f9fd2');
const STEEL = toon('#c8cce0');
const IRON = toon('#2b2838');
const RING = neon('#bfe8ff', 0.2, 2.4);

/** A rect cut across x into pieces no longer than a tile (a fixed triangle never much longer than one) */
function pieces([x0, z0, x1, z1]: Rect): Rect[] {
  const n = Math.ceil((x1 - x0) / 16);
  return Array.from({ length: n }, (_, k): Rect => [x0 + ((x1 - x0) * k) / n, z0, x0 + ((x1 - x0) * (k + 1)) / n, z1]);
}

function square(b: Batch) {
  // (a gate's walk inside the square is the square's)
  const walks = GATE_WALKS.filter((w) => w[3] <= NORTH_SQUARE[1] || w[1] >= NORTH_SQUARE[3]);
  for (const r of [NORTH_SQUARE, ...walks]) for (const p of pieces(r)) b.add(quad(p, PAVE, GRANITE_TILE), granite);
  // A darker band round the pool, and out across the square to the park and the avenue
  const { x, z, r } = POOL;
  b.add(new THREE.RingGeometry(r + 1.1, r + 1.6, 40).rotateX(-Math.PI / 2).translate(x, PAVE + 0.004, z), STONE_DARK);
  for (const [a, c] of [
    [NORTH_SQUARE[0], x - r - 1.6],
    [x + r + 1.6, NORTH_SQUARE[2]],
  ])
    b.add(quad([a, z - 0.3, c, z + 0.3], PAVE + 0.004), STONE_DARK);
  // The pool: a stone rim round the water, a lit ring under its lip
  b.add(new THREE.CylinderGeometry(r, r, POOL.h, 40, 1, true).translate(x, SLAB + POOL.h / 2, z), STONE);
  b.add(new THREE.RingGeometry(r - 0.3, r, 40).rotateX(-Math.PI / 2).translate(x, SLAB + POOL.h, z), STONE);
  b.add(new THREE.CylinderGeometry(r - 0.3, r - 0.3, POOL.h - 0.1, 40, 1, true).translate(x, SLAB + (POOL.h - 0.1) / 2, z), STONE_DARK);
  b.add(new THREE.CircleGeometry(r - 0.3, 40).rotateX(-Math.PI / 2).translate(x, SLAB + POOL.h - 0.12, z), WATER);
  b.add(new THREE.TorusGeometry(r - 0.34, 0.03, 4, 48).rotateX(Math.PI / 2).translate(x, SLAB + POOL.h - 0.1, z), RING);
  // The sculpture: a slim steel column of plates, each turned a little on the one below, on a dark plinth
  b.box(x - 0.55, SLAB + POOL.h - 0.14, z - 0.55, 1.1, 0.4, 1.1, IRON);
  const n = 18;
  for (let k = 0; k < n; k++) {
    const h = (POOL.sculpture - 0.3) / n;
    const w = 0.9 - 0.35 * Math.sin((Math.PI * k) / (n - 1));
    b.add(new THREE.BoxGeometry(w, h * 0.82, w * 0.36).rotateY((k / n) * Math.PI * 1.2).translate(x, SLAB + POOL.h + 0.26 + h * (k + 0.5), z), STEEL);
  }
  // Benches facing it, grates round the trees
  for (const s of SQUARE_BENCHES) bench(b, [s.x, s.z], s.ry, PAVE);
  for (const [tx, tz] of SQUARE_TREES) {
    b.box(tx - 0.75, PAVE, tz - 0.75, 1.5, 0.006, 1.5, IRON);
    b.detail(() => {
      for (let k = -2; k <= 2; k++) b.box(tx - 0.7, PAVE + 0.006, tz + k * 0.28 - 0.03, 1.4, 0.004, 0.06, STONE_DARK);
    });
  }
}

export function registerNorth() {
  const [x0, z0, x1, z1] = NORTH_SQUARE;
  site('uptown north square', [x0, z0, x1, z1], (into) => {
    const b = new Batch();
    square(b);
    b.build(into, { cast: true, receive: true });
  });
}
