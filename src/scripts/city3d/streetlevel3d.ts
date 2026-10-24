/*
 * Uptown's sidewalks on screen (docs/finance-plan.md Phase 7; the numbers are
 * streetlevel.ts), part of Uptown's chunk (uptown3d.ts): the dressing in the
 * margins by each tower's walls (café tables and umbrellas, menu boards,
 * planters, a florist's buckets, crates of fruit, newspaper boxes, bike
 * racks), the grand lobbies' sculptures and the galleria over the axis's
 * lanes, a site a tower and a site a lane. Near only but the umbrellas, the
 * sculptures and the galleria's roof.
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { SLAB } from './world';
import { site } from './tilework';
import { HIGHRISES } from './highrise';
import { DRESSING, GALLERIAS, GALLERY, SCULPTURES, type Dress } from './streetlevel';
import { table } from './plaza3d';

const IRON = toon('#2a2740');
const WOOD = toon('#8a5a3a');
const BOARD = toon('#1c2a2a');
const CHALK = toon('#e8e4da');
const PLANTER = toon('#3a364c');
const STONE = toon('#d8ccb0');
const SHRUB = toon('#2f6a3c');
const BRONZE = toon('#a8743a');
const GOLD = toon('#c9a24a');
const GLASS = toon('#bfe3f2');
/** The galleria's glass seen from below (its own faces turned down) */
const GLASS_UNDER = toon('#a9d2e6');
const RIB = toon('#5a5478');
const LAMP = neon('#ffe2a8', 0.2, 1.6);
const UMBRELLAS = [toon('#f1ece2'), toon('#5a1f2e'), toon('#1f4a3a'), toon('#1c2a55')];
const BLOOMS = ['#ff4fd8', '#ffd23f', '#ff8a3d', '#f3f2f7', '#b07bff', '#e23b3b'].map((c) => toon(c));
const FRUIT = ['#e23b3b', '#ffb000', '#6fcf97', '#f2994a', '#bb6bd9'].map((c) => toon(c));
const NEWSBOX = [toon('#1c5aa8'), toon('#a8303c'), toon('#2f8a5a')];

/** One piece of dressing, in its own frame: x across its wall (along the wall), z out from it */
function dress(b: Batch, d: Dress, i: number) {
  const { x, z, ry } = d;
  const put = (g: THREE.BufferGeometry, mat: THREE.Material) => b.add(g.rotateY(ry).translate(x, SLAB, z), mat);
  const box = (w: number, h: number, dd: number, ox: number, oy: number, oz: number, mat: THREE.Material) => put(new THREE.BoxGeometry(w, h, dd).translate(ox, oy + h / 2, oz), mat);
  // (a wall facing along z: its tables' chairs go along x)
  const alongX = Math.abs(Math.cos(ry)) > 0.5;
  switch (d.kind) {
    case 'table':
    case 'umbrella':
      table(b, [x, z], d.kind === 'umbrella' ? UMBRELLAS[i % UMBRELLAS.length] : null, SLAB, alongX);
      return;
    case 'aboard':
      // A chalk menu board: two leaves leaning together
      b.detail(() => {
        for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.5, 0.75, 0.03).translate(0, 0.36, 0).rotateX(s * 0.16).translate(0, 0, s * 0.07), WOOD);
        for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.42, 0.6, 0.01).translate(0, 0.38, 0).rotateX(s * 0.16).translate(0, 0, s * 0.088), s > 0 ? BOARD : BOARD);
        box(0.3, 0.02, 0.012, 0, 0.5, 0.09, CHALK);
        box(0.24, 0.02, 0.012, 0, 0.4, 0.09, CHALK);
      });
      return;
    case 'planter':
      box(0.6, 0.48, 0.6, 0, 0, 0, PLANTER);
      b.detail(() => put(new THREE.IcosahedronGeometry(0.36, 0).scale(1, 1.2, 1).translate(0, 0.86, 0), SHRUB));
      return;
    case 'buckets':
      b.detail(() => {
        // A florist's stand: buckets in two rows, flowers in each
        box(1.0, 0.25, 0.5, 0, 0, 0, WOOD);
        for (let k = 0; k < 6; k++) {
          const [bx, bz] = [-0.4 + (k % 3) * 0.4, (k < 3 ? -0.12 : 0.12)];
          const y = k < 3 ? 0.25 : 0;
          put(new THREE.CylinderGeometry(0.11, 0.09, 0.24, 8, 1, true).translate(bx, y + 0.12, bz), IRON);
          put(new THREE.IcosahedronGeometry(0.13, 0).translate(bx, y + 0.32, bz), BLOOMS[(i + k) % BLOOMS.length]);
        }
      });
      return;
    case 'crates':
      // A grocer's stand: a sloping table of crates of fruit under the window
      box(1.2, 0.5, 0.6, 0, 0, 0, WOOD);
      b.detail(() => {
        for (let k = 0; k < 3; k++) {
          box(0.36, 0.14, 0.5, -0.4 + k * 0.4, 0.5, 0, WOOD);
          box(0.32, 0.04, 0.44, -0.4 + k * 0.4, 0.62, 0, FRUIT[(i + k) % FRUIT.length]);
        }
      });
      return;
    case 'newsbox':
      box(0.4, 0.85, 0.4, 0, 0.08, 0, NEWSBOX[i % NEWSBOX.length]);
      b.detail(() => {
        box(0.04, 0.08, 0.04, -0.15, 0, -0.15, IRON);
        box(0.04, 0.08, 0.04, 0.15, 0, 0.15, IRON);
        box(0.3, 0.22, 0.01, 0, 0.6, 0.205, GLASS);
      });
      return;
    case 'bikes':
      b.detail(() => {
        // Three hoops along the wall, two bikes in them
        for (let k = -1; k <= 1; k++) put(new THREE.TorusGeometry(0.3, 0.025, 4, 10, Math.PI).translate(k * 0.6, 0.12, 0), IRON);
        for (const k of [-0.6, 0.6]) {
          for (const s of [-0.38, 0.38]) put(new THREE.TorusGeometry(0.28, 0.025, 4, 12).rotateY(Math.PI / 2).translate(k + 0.06, 0.3, s * 0.75 + 0.15), IRON);
          put(new THREE.BoxGeometry(0.04, 0.04, 0.62).rotateX(-0.25).translate(k + 0.06, 0.48, 0.15), BLOOMS[i % BLOOMS.length]);
        }
      });
  }
}

/** A grand lobby's sculpture: a stone plinth, a bronze knot over it, a gold plaque */
function sculpture(b: Batch, x: number, z: number, half: number) {
  b.box(x - half, SLAB, z - half, half * 2, 0.6, half * 2, STONE);
  b.box(x - half - 0.05, SLAB, z - half - 0.05, half * 2 + 0.1, 0.12, half * 2 + 0.1, PLANTER);
  b.add(new THREE.TorusKnotGeometry(0.38, 0.1, 48, 6, 2, 3).rotateX(0.4).translate(x, SLAB + 1.25, z), BRONZE);
  b.detail(() => b.box(x - 0.18, SLAB + 0.32, z + half, 0.36, 0.14, 0.01, GOLD));
}

/** The galleria: slim columns along both sides of the lane, steel arches across, a glass barrel between, lamps hung under it */
function galleria(b: Batch, g: (typeof GALLERIAS)[number]) {
  const [x0, z0, x1, z1] = g.rect;
  const Y = SLAB + GALLERY.y;
  const cx = (x0 + x1) / 2;
  const half = (x1 - x0) / 2 - 0.15;
  for (const [x, z] of g.columns) b.add(new THREE.CylinderGeometry(0.06, 0.08, GALLERY.y, 8, 1, true).translate(x, SLAB + GALLERY.y / 2, z), RIB);
  // The barrel: six facets across, arching 0.8 over the columns' tops, ribs at each pair of columns
  const N = 6;
  const arc = (k: number): [number, number] => {
    const a = Math.PI - (Math.PI * k) / N;
    return [cx + Math.cos(a) * half, Y + Math.sin(a) * 0.8];
  };
  for (let k = 0; k < N; k++) {
    const [ax, ay] = arc(k);
    const [bx, by] = arc(k + 1);
    const w = Math.hypot(bx - ax, by - ay);
    const g2 = new THREE.PlaneGeometry(w, z1 - z0 - 0.2).rotateX(-Math.PI / 2).rotateZ(Math.atan2(by - ay, bx - ax)).translate((ax + bx) / 2, (ay + by) / 2, (z0 + z1) / 2);
    b.add(g2, GLASS);
    // (and its underside, a hair below, seen from the lane)
    b.add(new THREE.PlaneGeometry(w, z1 - z0 - 0.2).rotateX(Math.PI / 2).rotateZ(Math.atan2(by - ay, bx - ax)).translate((ax + bx) / 2, (ay + by) / 2 - 0.006, (z0 + z1) / 2), GLASS_UNDER);
  }
  const zs = [...new Set(g.columns.map((c) => c[1]))];
  for (const z of zs)
    for (let k = 0; k < N; k++) {
      const [ax, ay] = arc(k);
      const [bx, by] = arc(k + 1);
      b.add(new THREE.BoxGeometry(Math.hypot(bx - ax, by - ay) + 0.04, 0.07, 0.07).rotateZ(Math.atan2(by - ay, bx - ax)).translate((ax + bx) / 2, (ay + by) / 2 - 0.04, z), RIB);
    }
  for (const x of [x0 + 0.15, x1 - 0.15]) b.box(x - 0.06, Y - 0.12, z0 + 0.2, 0.12, 0.12, z1 - z0 - 0.4, RIB);
  b.detail(() => {
    for (const z of zs.slice(0, -1)) {
      const zm = z + 1.6;
      b.add(new THREE.CylinderGeometry(0.01, 0.01, 0.7, 4, 1, true).translate(cx, Y + 0.45, zm), IRON);
      b.add(new THREE.SphereGeometry(0.12, 8, 6).translate(cx, Y + 0.05, zm), LAMP);
    }
  });
}

export function registerStreetLevel() {
  // A site a tower: the dressing in the margins round its base
  for (const t of HIGHRISES) {
    const [x0, z0, x1, z1] = t.lot;
    const near = DRESSING.filter((d) => d.x > x0 - 3 && d.x < x1 + 3 && d.z > z0 - 3 && d.z < z1 + 3);
    const sculpt = SCULPTURES.filter((s) => s.tower === t.id);
    if (!near.length && !sculpt.length) continue;
    site(`uptown street ${t.id}`, [x0 - 3, z0 - 3, x1 + 3, z1 + 3], (into) => {
      const b = new Batch();
      near.forEach((d, i) => dress(b, d, i));
      for (const s of sculpt) sculpture(b, s.x, s.z, s.half);
      b.build(into, { cast: true, receive: true });
    });
  }
  GALLERIAS.forEach((g, i) =>
    site(`uptown galleria ${i}`, g.rect, (into) => {
      const b = new Batch();
      galleria(b, g);
      b.build(into, { cast: true, receive: true });
    })
  );
}
