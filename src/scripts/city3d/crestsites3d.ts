/*
 * Crestmont's landmarks drawn (docs/crestmont-plan.md Phase 7; the numbers are crestsites.ts's), in Crestmont's chunk
 * (crestmont3d.ts `register()`), as sites: the grand hotel (its pink storeys and tower, white cornices, balconies,
 * the porte-cochère, the drive round its fountain, its name in script on the roof, the pool garden with cabanas), the
 * civic hall (white, a colonnade, the tower and its tiled dome, the park in front with its walk and fountains), the
 * country club (the clubhouse under red tiles, its terrace and cart shed, the carts; six holes laid on the ground:
 * tee boxes, fairways, fringes, greens with their flags, bunkers), the overlook (paving, a stone balustrade where the
 * ground falls away, benches, coin viewers, lamps) and the reservoir (its dams, its fence, the valve tower; the water
 * on the main thread, the city's water shader).
 */
import * as THREE from 'three';
import { Batch, canvasTex, lit, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import { waterMat } from './world';
import { heightAt } from './terrain';
import { CIVIC, CLUB, FAIRWAY, FENCE, FRINGE, GREEN_R, BUNKER_R, HOLES, HOTEL, HOTEL_NAME, OVERLOOK, RESERVOIR, SLAB_Y, TEE, bunkersOf, flagOf, type Hole } from './crestsites';
import { WINDOW, hip } from './estates3d';
import { BULB, LED, PAVING, SPRAY, WATER, flat } from './mallkit';

type Rect = [number, number, number, number];
type Pt = [number, number];

const PINK = toon('#f2b8b0');
const PINK_DEEP = toon('#e79a92');
const WHITE = toon('#f6f3ec');
const STONE = toon('#d9cfbb');
const STONE_SHADE = toon('#c4b99f');
const TILE = toon('#c0603f');
const DOME = toon('#2f7f9e');
const GOLD = toon('#d9a94a');
const WOOD = toon('#5a3a26');
const IRON = toon('#1e1d22');
const CONCRETE = toon('#b9b4aa');
const CONCRETE_TOP = toon('#cfcac0');
const FAIR = toon('#6dbb55');
const FRINGE_GREEN = toon('#5fa84b');
const GREEN = toon('#82d46b');
const TEE_GREEN = toon('#77c862');
const SAND = toon('#ead9a2');
const FLAG = toon('#e23b3b');
const ISLAND = toon('#3f7a4a');
const CABANA = toon('#f4ead2');
const STRIPE = toon('#2f7f9e');
const CART = toon('#f1ede2');
const CART_ROOF = toon('#2f6a3a');
const LAMP = neon('#ffe2a8', 0.2, 1.3);

/** The hotel's name in script, gold on deep teal, lit a little at night */
const NAME_SIGN = siteMat(
  'crest-hotel-name',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(512, 128, (c) => {
        c.fillStyle = '#123f4f';
        c.fillRect(0, 0, 512, 128);
        c.strokeStyle = '#d9a94a';
        c.lineWidth = 4;
        c.strokeRect(8, 8, 496, 112);
        c.fillStyle = '#f3d58a';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = 'italic 600 70px "Brush Script MT", "Segoe Script", "Snell Roundhand", Georgia, serif';
        c.fillText(HOTEL_NAME, 256, 68);
      }),
    }),
    0.95,
    1.3
  )
);

const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: THREE.Material) => b.box(Math.min(x0, x1), y0, Math.min(z0, z1), Math.abs(x1 - x0), y1 - y0, Math.abs(z1 - z0), m);
const cyl = (b: Batch, r: number, h: number, x: number, y: number, z: number, m: THREE.Material, seg = 12, r0 = r, open = false) => b.add(new THREE.CylinderGeometry(r, r0, h, seg, 1, open).translate(x, y + h / 2, z), m);
/** A window on a wall facing `n` (a unit x, z), its middle along the wall at (x, z), w x h from y */
function pane(b: Batch, x: number, z: number, n: Pt, w: number, y: number, h: number, m: THREE.Material = WINDOW) {
  b.add(new THREE.PlaneGeometry(w, h).translate(0, y + h / 2, 0).rotateY(Math.atan2(n[0], n[1])).translate(x + n[0] * 0.012, 0, z + n[1] * 0.012), m);
}
/** Windows round a box (x0..x1, z0..z1), a row a storey from `y0`, a window every `step` */
function windowsRound(b: Batch, r: Rect, y0: number, floors: number, ground: number, upper: number, step = 1.7, skip?: (x: number, z: number, f: number) => boolean) {
  const [x0, z0, x1, z1] = r;
  for (let f = 0; f < floors; f++) {
    const y = y0 + (f === 0 ? 0.55 : ground + (f - 1) * upper + 0.4);
    const h = f === 0 ? ground - 0.9 : upper - 0.7;
    for (const [a, c, fixed, n, alongX] of [
      [x0, x1, z0, [0, -1], true],
      [x0, x1, z1, [0, 1], true],
      [z0, z1, x0, [-1, 0], false],
      [z0, z1, x1, [1, 0], false],
    ] as [number, number, number, Pt, boolean][]) {
      const k = Math.max(1, Math.floor((c - a) / step));
      for (let i = 0; i < k; i++) {
        const t = a + ((i + 0.5) * (c - a)) / k;
        const [x, z] = alongX ? [t, fixed] : [fixed, t];
        if (skip?.(x, z, f)) continue;
        pane(b, x, z, n, 0.8, y, h);
      }
    }
  }
}
/** A flat shape laid on the ground (its vertices at the ground's height and `off` over it) */
function drape(g: THREE.BufferGeometry, off: number) {
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)) + off);
  g.computeVertexNormals();
  return g;
}
/** A disc (or an ellipse) on the ground */
const disc = (x: number, z: number, rx: number, rz: number, off: number, seg = 18) => drape(new THREE.CircleGeometry(1, seg).rotateX(-Math.PI / 2).scale(rx, 1, rz).translate(x, 0, z), off);
/** A strip along a line on the ground, `w` either side, in pieces about a tile long */
function strip(a: Pt, c: Pt, w: number, off: number) {
  const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const g = new THREE.PlaneGeometry(2 * w, L, 2, Math.max(1, Math.ceil(L))).rotateX(-Math.PI / 2);
  g.rotateY(Math.atan2(c[0] - a[0], c[1] - a[1])).translate((a[0] + c[0]) / 2, 0, (a[1] + c[1]) / 2);
  return drape(g, off);
}

export function registerSites(low: boolean, scene: THREE.Scene | null) {
  /* ---------- The grand hotel ---------- */
  const H = HOTEL;
  site('crestmont hotel', [H.block[0] - 1, H.block[1] - 1, H.block[2] + 1, H.block[3] + 1], (into) => {
    const b = new Batch();
    const y0 = SLAB_Y;
    const { ground, upper } = H.storey;
    const bodyTop = y0 + ground + (H.floors - 1) * upper;
    // The body: pink storeys over a white ground floor, a white cornice a storey, a parapet
    box(b, H.body[0], y0, H.body[1], H.body[2], y0 + ground, H.body[3], WHITE);
    box(b, H.body[0] + 0.05, y0 + ground, H.body[1] + 0.05, H.body[2] - 0.05, bodyTop, H.body[3] - 0.05, PINK);
    for (let f = 1; f < H.floors; f++) box(b, H.body[0] - 0.08, y0 + ground + (f - 1) * upper - 0.1, H.body[1] - 0.08, H.body[2] + 0.08, y0 + ground + (f - 1) * upper + 0.05, H.body[3] + 0.08, WHITE);
    box(b, H.body[0] - 0.12, bodyTop, H.body[1] - 0.12, H.body[2] + 0.12, bodyTop + 0.4, H.body[3] + 0.12, WHITE);
    const door = (x: number, z: number, f: number) => f === 0 && x < H.body[0] + 0.1 && z > H.porte[1] && z < H.porte[3];
    windowsRound(b, H.body, y0, H.floors, ground, upper, 1.6, door);
    // The tower: two storeys more, deeper pink, its crown stepped in, the name on its front
    const T = H.tower;
    const towerTop = y0 + ground + (H.towerFloors - 1) * upper;
    box(b, T[0], bodyTop, T[1], T[2], towerTop, T[3], PINK_DEEP);
    windowsRound(b, T, y0, H.towerFloors, ground, upper, 1.6, (_x, _z, f) => f < H.floors);
    box(b, T[0] - 0.15, towerTop, T[1] - 0.15, T[2] + 0.15, towerTop + 0.3, T[3] + 0.15, WHITE);
    box(b, T[0] + 0.8, towerTop + 0.3, T[1] + 0.8, T[2] - 0.8, towerTop + 0.8, T[3] - 0.8, PINK);
    cyl(b, 0.08, 0.6, (T[0] + T[2]) / 2, towerTop + 0.8, (T[1] + T[3]) / 2, GOLD, 6);
    // (its name, in script on a board standing on the body's roof in front of the tower, facing the boulevard)
    const nz = (T[1] + T[3]) / 2;
    b.add(new THREE.PlaneGeometry(8, 2).rotateY(-Math.PI / 2).translate(H.body[0] + 0.9 - 0.012, bodyTop + 1.4, nz), NAME_SIGN);
    box(b, H.body[0] + 0.9, bodyTop + 0.4, nz - 4, H.body[0] + 1.0, bodyTop + 2.4, nz + 4, IRON);
    // The balconies (near): a white slab and rail under every other upper window on the front
    b.detail(() => {
      for (let f = 1; f < H.floors; f++)
        for (let z = H.body[1] + 1.2; z < H.body[3] - 1; z += 3.2) {
          if (z > T[1] - 0.5 && z < T[3] + 0.5 && f >= 1) continue;
          const y = y0 + ground + (f - 1) * upper + 0.3;
          box(b, H.body[0] - 0.7, y, z - 0.6, H.body[0], y + 0.08, z + 0.6, WHITE);
          box(b, H.body[0] - 0.72, y + 0.08, z - 0.6, H.body[0] - 0.66, y + 0.85, z + 0.6, IRON);
        }
    });
    // The porte-cochère: a white canopy lit along its edge on two posts, over the drive at the door
    const P = H.porte;
    box(b, P[0], y0 + 2.6, P[1], P[2], y0 + 2.9, P[3], WHITE);
    box(b, P[0] - 0.02, y0 + 2.62, P[1] - 0.02, P[0] + 0.02, y0 + 2.7, P[3] + 0.02, LED);
    for (const z of [P[1] + 0.3, P[3] - 0.3]) cyl(b, 0.16, 2.6, P[0] + 0.3, y0, z, WHITE, 10);
    pane(b, H.body[0], (P[1] + P[3]) / 2, [-1, 0], 2.6, y0 + 0.05, 2.1, WOOD);
    // The drive's island: a lawn, its fountain
    const I = H.island;
    b.add(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2).scale(I.rx, 1, I.rz).translate(I.x, y0 + 0.02, I.z), ISLAND);
    cyl(b, 0.7, 0.4, I.x, y0, I.z, STONE, 16, 0.7, true);
    b.add(new THREE.CircleGeometry(0.58, 16).rotateX(-Math.PI / 2).translate(I.x, y0 + 0.36, I.z), WATER);
    cyl(b, 0.08, 0.7, I.x, y0 + 0.3, I.z, STONE_SHADE, 8);
    b.detail(() => b.add(new THREE.ConeGeometry(0.07, 0.35, 6, 1, true).translate(I.x, y0 + 1.15, I.z), SPRAY));
    // The pool garden's cabanas: white tents with striped tops
    for (const [x, z] of H.cabanas) {
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(b, 0.05, 2, x + dx * 1.1, y0, z + dz * 1.1, WHITE, 5, 0.05, true);
      b.add(new THREE.ConeGeometry(1.7, 0.8, 4, 1, true).rotateY(Math.PI / 4).translate(x, y0 + 2.4, z), STRIPE);
      b.detail(() => box(b, x - 1.1, y0 + 0.3, z + 1.05, x + 1.1, y0 + 2, z + 1.12, CABANA));
      b.detail(() => box(b, x - 0.6, y0, z - 0.4, x + 0.6, y0 + 0.4, z + 0.6, CABANA));
    }
    b.detail(() => {
      // (loungers along the pool's sides)
      for (let x = H.pool[0] + 0.6; x < H.pool[2] - 0.4; x += 1.4)
        for (const z of [H.pool[1] - 1.5, H.pool[3] + 0.4]) box(b, x - 0.3, y0 + 0.012, z, x + 0.3, y0 + 0.28, z + 1.1, WHITE);
    });
    b.build(into, { cast: true, receive: true });
    const p = new Batch();
    flat(p, H.drive[0], H.drive[1], H.drive[2], H.drive[3], y0 + 0.012, PAVING, 8);
    flat(p, H.deck[0], H.deck[1], H.deck[2], H.deck[3], y0 + 0.012, PAVING, 8);
    flat(p, H.pool[0], H.pool[1], H.pool[2], H.pool[3], y0 + 0.02, WATER, 8);
    p.build(into, { cast: false, receive: true });
  });

  /* ---------- The civic hall ---------- */
  const C = CIVIC;
  site('crestmont civic hall', [C.pad[0] - 1, C.pad[1] - 1, C.pad[2] + 1, C.pad[3] + 1], (into) => {
    const b = new Batch();
    const y0 = C.y;
    const { ground, upper } = C.storey;
    const top = y0 + ground + upper;
    const [hx0, hz0, hx1, hz1] = C.hall;
    // The hall on its plinth, a cornice and parapet; tall windows
    box(b, hx0 - 0.4, y0, hz0 - 0.4, hx1 + 0.4, y0 + 0.35, hz1 + 0.4, STONE);
    box(b, hx0, y0 + 0.35, hz0, hx1, top, hz1, WHITE);
    box(b, hx0 - 0.15, top, hz0 - 0.15, hx1 + 0.15, top + 0.5, hz1 + 0.15, STONE_SHADE);
    const axis = (hx0 + hx1) / 2;
    windowsRound(b, C.hall, y0 + 0.35, 2, ground, upper, 1.7, (x, z, f) => f === 0 && Math.abs(x - axis) < 1.2 && z > hz1 - 0.1);
    pane(b, axis, hz1, [0, 1], 1.8, y0 + 0.35, 2.3, WOOD);
    // The colonnade along its front: columns under an entablature, steps
    const cz = C.colonnade.z;
    for (let i = 0; i < C.colonnade.n; i++) cyl(b, 0.2, ground + upper - 0.4, hx0 + 0.8 + (i * (hx1 - hx0 - 1.6)) / (C.colonnade.n - 1), y0 + 0.35, cz, WHITE, 12);
    box(b, hx0 + 0.3, top - 0.05, hz1, hx1 - 0.3, top + 0.45, cz + 0.4, WHITE);
    box(b, hx0 + 0.3, y0, hz1, hx1 - 0.3, y0 + 0.35, cz + 0.7, STONE);
    // The tower, a drum and the tiled dome, a gold finial
    const [tx0, tz0, tx1, tz1] = C.tower;
    const [tcx, tcz] = [(tx0 + tx1) / 2, (tz0 + tz1) / 2];
    box(b, tx0, top, tz0, tx1, y0 + C.towerTop, tz1, WHITE);
    box(b, tx0 - 0.15, y0 + C.towerTop - 0.3, tz0 - 0.15, tx1 + 0.15, y0 + C.towerTop, tz1 + 0.15, STONE_SHADE);
    for (const [n, x, z] of [[[0, 1], tcx, tz1], [[0, -1], tcx, tz0], [[1, 0], tx1, tcz], [[-1, 0], tx0, tcz]] as [Pt, number, number][]) pane(b, x, z, n, 1, top + 1, 2.2, WINDOW);
    cyl(b, C.dome * 0.95, 0.6, tcx, y0 + C.towerTop, tcz, WHITE, 20);
    b.add(new THREE.SphereGeometry(C.dome * 0.9, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(tcx, y0 + C.towerTop + 0.6, tcz), DOME);
    cyl(b, 0.07, 0.7, tcx, y0 + C.towerTop + 0.6 + C.dome * 0.85, tcz, GOLD, 6);
    // The park's fountains and benches
    for (const [x, z] of C.fountains) {
      cyl(b, C.fountainR, 0.45, x, y0, z, STONE, 20, C.fountainR, true);
      b.add(new THREE.RingGeometry(C.fountainR - 0.15, C.fountainR, 20).rotateX(-Math.PI / 2).translate(x, y0 + 0.45, z), STONE_SHADE);
      b.add(new THREE.CircleGeometry(C.fountainR - 0.14, 20).rotateX(-Math.PI / 2).translate(x, y0 + 0.4, z), WATER);
      cyl(b, 0.1, 0.8, x, y0 + 0.3, z, STONE_SHADE, 8);
      cyl(b, 0.5, 0.12, x, y0 + 1.05, z, STONE, 12, 0.3);
      b.detail(() => b.add(new THREE.ConeGeometry(0.1, 0.45, 6, 1, true).translate(x, y0 + 1.4, z), SPRAY));
    }
    b.detail(() => {
      for (const [x, z] of C.benches) {
        const s = x < axis ? 1 : -1;
        box(b, x - 0.25, y0 + 0.35, z - 0.8, x + 0.25, y0 + 0.42, z + 0.8, WOOD);
        box(b, x + s * 0.25, y0 + 0.42, z - 0.8, x + s * 0.3, y0 + 0.85, z + 0.8, WOOD);
      }
    });
    b.build(into, { cast: true, receive: true });
    const p = new Batch();
    flat(p, C.walk[0], C.walk[1], C.walk[2], C.walk[3], y0 + 0.02, PAVING, 8);
    for (const [x, z] of C.fountains) flat(p, x - C.fountainR - 1, z - C.fountainR - 1, x + C.fountainR + 1, z + C.fountainR + 1, y0 + 0.015, PAVING, 8);
    p.build(into, { cast: false, receive: true });
  });

  /* ---------- The country club ---------- */
  const K = CLUB;
  site('crestmont clubhouse', [K.pad[0] - 1, K.pad[1] - 1, K.pad[2] + 1, K.pad[3] + 1], (into) => {
    const b = new Batch();
    const y0 = K.y;
    const { ground, upper } = K.storey;
    const top = y0 + ground + upper;
    box(b, K.house[0], y0, K.house[1], K.house[2], top, K.house[3], WHITE);
    windowsRound(b, K.house, y0, 2, ground, upper, 1.7);
    // (hip() takes its front (v0) before its back (v1): here, the house's south side and north side)
    const [r, soffit] = hip(K.house[0], K.house[3], K.house[2], K.house[1], top, 1.3, 0.4);
    b.add(r, TILE);
    b.add(soffit, WOOD);
    // (the terrace in front: tables under umbrellas, near)
    b.detail(() => {
      for (let x = K.terrace[0] + 1.5; x < K.terrace[2] - 1; x += 3.2) {
        cyl(b, 0.35, 0.05, x, y0 + 0.7, (K.terrace[1] + K.terrace[3]) / 2, WHITE, 10);
        cyl(b, 0.04, 0.7, x, y0, (K.terrace[1] + K.terrace[3]) / 2, IRON, 5, 0.04, true);
        b.add(new THREE.ConeGeometry(1, 0.35, 8, 1, true).translate(x, y0 + 2.3, (K.terrace[1] + K.terrace[3]) / 2), CART_ROOF);
        cyl(b, 0.02, 1.6, x, y0 + 0.75, (K.terrace[1] + K.terrace[3]) / 2, IRON, 4, 0.02, true);
      }
    });
    // The cart shed: a green roof on posts; the carts
    const S = K.shed;
    box(b, S[0], y0 + 2.2, S[1], S[2], y0 + 2.4, S[3], CART_ROOF);
    for (const [x, z] of [[S[0], S[1]], [S[2], S[1]], [S[0], S[3]], [S[2], S[3]]]) box(b, x - 0.08, y0, z - 0.08, x + 0.08, y0 + 2.2, z + 0.08, WOOD);
    for (const [x, z] of K.carts) {
      box(b, x - 0.45, y0 + 0.2, z - 0.85, x + 0.45, y0 + 0.6, z + 0.85, CART);
      box(b, x - 0.45, y0 + 1.4, z - 0.6, x + 0.45, y0 + 1.48, z + 0.85, CART_ROOF);
      for (const dz of [-0.55, 0.8]) for (const dx of [-0.42, 0.42]) box(b, x + dx - 0.02, y0 + 0.6, z + dz - 0.02, x + dx + 0.02, y0 + 1.4, z + dz + 0.02, IRON);
      for (const dz of [-0.6, 0.6]) for (const dx of [-0.45, 0.45]) cyl(b, 0.18, 0.12, x + dx * 1.05, y0 + 0.18, z + dz, IRON, 8);
    }
    b.build(into, { cast: true, receive: true });
    const p = new Batch();
    flat(p, K.terrace[0], K.terrace[1], K.terrace[2], K.terrace[3], y0 + 0.02, PAVING, 8);
    flat(p, K.house[0] - 1, K.terrace[3], K.house[2] + 1, K.pad[3] - 0.5, y0 + 0.015, PAVING, 8);
    p.build(into, { cast: false, receive: true });
  });
  // The holes, a site each
  for (const h of HOLES) {
    const xs = [h.tee[0], h.green[0]];
    const zs = [h.tee[1], h.green[1]];
    site(`crestmont hole ${h.n}`, [Math.min(...xs) - 8, Math.min(...zs) - 8, Math.max(...xs) + 8, Math.max(...zs) + 8], (into) => drawHole(h, into, low));
  }

  /* ---------- The overlook ---------- */
  const O = OVERLOOK;
  site('crestmont overlook', [O.rect[0] - 10, O.rect[1] - 10, O.rect[2] + 10, O.rect[3] + 10], (into) => {
    const b = new Batch();
    const [x0, z0, x1, z1] = O.rect;
    const y = O.y;
    // The balustrade round its edges where the ground falls away (a stone wall where it rises), open to the path
    const [pa, pb] = O.path;
    const edge = (ax: number, az: number, bx: number, bz: number, n: Pt) => {
      const L = Math.hypot(bx - ax, bz - az);
      const k = Math.max(1, Math.round(L / 1.5));
      for (let i = 0; i < k; i++) {
        const [u0, u1] = [i / k, (i + 1) / k];
        const [sx, sz, ex, ez] = [ax + (bx - ax) * u0, az + (bz - az) * u0, ax + (bx - ax) * u1, az + (bz - az) * u1];
        const [mx, mz] = [(sx + ex) / 2, (sz + ez) / 2];
        if (Math.hypot(mx - pb[0], mz - pb[1]) < 1.6) continue;
        const out = heightAt(mx + n[0] * 2, mz + n[1] * 2) - y;
        const [lx0, lz0, lx1, lz1] = [Math.min(sx, ex) - (n[0] ? 0.15 : 0), Math.min(sz, ez) - (n[1] ? 0.15 : 0), Math.max(sx, ex) + (n[0] ? 0.15 : 0), Math.max(sz, ez) + (n[1] ? 0.15 : 0)];
        if (out > 0.4) box(b, lx0, y - 0.3, lz0, lx1, y + Math.min(2.2, out + 0.2), lz1, STONE_SHADE);
        else {
          box(b, lx0, y - 0.4, lz0, lx1, y + 0.2, lz1, STONE);
          box(b, lx0, y + 0.85, lz0, lx1, y + 1.0, lz1, STONE);
          b.detail(() => {
            for (let t = 0.25; t < 1; t += 0.25) cyl(b, 0.07, 0.65, sx + (ex - sx) * t, y + 0.2, sz + (ez - sz) * t, STONE, 6, 0.1);
          });
        }
      }
    };
    edge(x0, z0, x1, z0, [0, -1]);
    edge(x0, z1, x1, z1, [0, 1]);
    edge(x0, z0, x0, z1, [-1, 0]);
    edge(x1, z0, x1, z1, [1, 0]);
    // The coin viewers, the benches, two lamps
    for (const [x, z] of O.viewers) {
      cyl(b, 0.12, 1.0, x, y, z, IRON, 8);
      box(b, x - 0.16, y + 1.0, z - 0.25, x + 0.16, y + 1.3, z + 0.25, GOLD);
    }
    b.detail(() => {
      for (const [x, z] of O.benches) {
        const [ux, uz] = O.look;
        const g = new THREE.BoxGeometry(1.6, 0.08, 0.5).rotateY(Math.atan2(ux, uz) + Math.PI / 2).translate(x, y + 0.42, z);
        b.add(g, WOOD);
      }
    });
    for (const s of [-1, 1]) {
      const [x, z] = [(x0 + x1) / 2 + -O.look[1] * s * 4, (z0 + z1) / 2 + O.look[0] * s * 4];
      cyl(b, 0.06, 2.6, x, y, z, IRON, 6);
      b.add(new THREE.SphereGeometry(0.16, 8, 6).translate(x, y + 2.75, z), BULB);
      b.detail(() => b.add(new THREE.SphereGeometry(0.06, 6, 4).translate(x, y + 2.5, z), LAMP));
    }
    b.build(into, { cast: true, receive: true });
    const p = new Batch();
    flat(p, x0, z0, x1, z1, y + 0.02, PAVING, 8);
    p.add(strip(pa, pb, 1.1, 0.08), STONE);
    p.build(into, { cast: false, receive: true });
  });

  /* ---------- The reservoir: the dams, the fence, the valve tower ---------- */
  const R = RESERVOIR;
  site('crestmont reservoir', [FENCE[0] - 4, FENCE[1] - 4, FENCE[2] + 4, FENCE[3] + 4], (into) => {
    const b = new Batch();
    const [x0, z0, x1, z1] = R.rect;
    const crest = R.y + 0.5;
    const dam = (r: Rect) => {
      const lo = Math.min(heightAt(r[0], r[1]), heightAt(r[2], r[1]), heightAt(r[0], r[3]), heightAt(r[2], r[3]), R.floor) - 0.8;
      box(b, r[0], lo, r[1], r[2], crest, r[3], CONCRETE);
      box(b, r[0] - 0.02, crest, r[1] - 0.02, r[2] + 0.02, crest + 0.06, r[3] + 0.02, CONCRETE_TOP);
    };
    if (R.dams.e) dam([x1, R.water[1], x1 + R.dam, R.water[3] + (R.dams.s ? R.dam : 0)]);
    if (R.dams.w) dam([x0 - R.dam, R.water[1], x0, R.water[3]]);
    if (R.dams.s) dam([R.water[0], z1, x1, z1 + R.dam]);
    if (R.dams.n) dam([R.water[0], z0 - R.dam, R.water[2], z0]);
    // The valve tower: concrete from the floor, a little roof
    const { x, z, r, h } = R.tower;
    cyl(b, r, R.y + h - R.floor, x, R.floor, z, CONCRETE, 16);
    cyl(b, r + 0.25, 0.25, x, R.y + h, z, CONCRETE_TOP, 16);
    b.add(new THREE.ConeGeometry(r + 0.2, 0.7, 16).translate(x, R.y + h + 0.6, z), TILE);
    // The fence: iron posts and two rails, following the ground (on a dam, its crest)
    const [fx0, fz0, fx1, fz1] = FENCE;
    const ground = (px: number, pz: number) => {
      const onDam = (R.dams.e && px > x1 - 0.1) || (R.dams.s && pz > z1 - 0.1) || (R.dams.w && px < x0 + 0.1) || (R.dams.n && pz < z0 + 0.1);
      return onDam ? crest : heightAt(px, pz);
    };
    for (const [ax, az, bx, bz] of [[fx0, fz0, fx1, fz0], [fx0, fz1, fx1, fz1], [fx0, fz0, fx0, fz1], [fx1, fz0, fx1, fz1]]) {
      const L = Math.hypot(bx - ax, bz - az);
      const k = Math.max(1, Math.round(L / 2));
      for (let i = 0; i <= k; i++) {
        const [px, pz] = [ax + ((bx - ax) * i) / k, az + ((bz - az) * i) / k];
        const g = ground(px, pz);
        box(b, px - 0.05, g - 0.2, pz - 0.05, px + 0.05, g + 1.5, pz + 0.05, IRON);
        if (i < k) {
          const [qx, qz] = [ax + ((bx - ax) * (i + 1)) / k, az + ((bz - az) * (i + 1)) / k];
          const gm = (g + ground(qx, qz)) / 2;
          for (const ry of [0.7, 1.4]) box(b, Math.min(px, qx) - 0.03, gm + ry - 0.03, Math.min(pz, qz) - 0.03, Math.max(px, qx) + 0.03, gm + ry + 0.03, Math.max(pz, qz) + 0.03, IRON);
        }
      }
    }
    b.build(into, { cast: true, receive: true });
  });
  // The water itself, on the main thread (the city's water shader)
  if (scene) {
    const [a, c, e, d] = R.water;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(e - a, d - c).rotateX(-Math.PI / 2).translate((a + e) / 2, R.y, (c + d) / 2), waterMat);
    water.name = 'crestmont reservoir water';
    scene.add(water);
  }
}

/** A hole: its tee box, the fairway, the fringe and green with its flag, the bunkers, all laid on the ground */
function drawHole(h: Hole, into: THREE.Object3D, low: boolean) {
  const b = new Batch();
  const [dx, dz] = [h.green[0] - h.tee[0], h.green[1] - h.tee[1]];
  const L = Math.hypot(dx, dz);
  const [ux, uz] = [dx / L, dz / L];
  // (the fairway from just past the tee to the fringe's edge)
  const start: Pt = [h.tee[0] + ux * 3, h.tee[1] + uz * 3];
  const end: Pt = [h.green[0] - ux * (FRINGE - 0.4), h.green[1] - uz * (FRINGE - 0.4)];
  b.add(strip(start, end, FAIRWAY, 0.1), FAIR);
  const tee = new THREE.PlaneGeometry(TEE.half[0] * 2, TEE.half[1] * 2).rotateX(-Math.PI / 2).rotateY(Math.atan2(ux, uz)).translate(h.tee[0], 0, h.tee[1]);
  b.add(drape(tee, 0.12), TEE_GREEN);
  b.add(disc(h.green[0], h.green[1], FRINGE, FRINGE, 0.12), FRINGE_GREEN);
  b.add(disc(h.green[0], h.green[1], GREEN_R, GREEN_R, 0.14), GREEN);
  for (const [x, z] of bunkersOf(h)) b.add(disc(x, z, BUNKER_R, BUNKER_R * 0.75, 0.13, 14), SAND);
  // The flag, the tee's markers
  const [fx, fz] = flagOf(h);
  const gy = heightAt(fx, fz);
  b.add(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 5).translate(fx, gy + 1.1, fz), WHITE);
  b.add(new THREE.BoxGeometry(0.02, 0.4, 0.6).translate(fx, gy + 2.0, fz + 0.3), FLAG);
  if (!low)
    b.detail(() => {
      for (const s of [-1, 1]) {
        const [mx, mz] = [h.tee[0] + -uz * s * 1.2, h.tee[1] + ux * s * 1.2];
        b.add(new THREE.SphereGeometry(0.1, 6, 4).translate(mx, heightAt(mx, mz) + 0.2, mz), WHITE);
      }
    });
  b.build(into, { cast: false, receive: true });
}
