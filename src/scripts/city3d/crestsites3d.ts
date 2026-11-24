/*
 * Crestmont's landmarks drawn (docs/crestmont-plan.md Phase 7; the numbers are crestsites.ts's), in Crestmont's chunk
 * (crestmont3d.ts `register()`), as sites: the grand hotel (its pink storeys and tower, white cornices, balconies,
 * the porte-cochère, the drive round its fountain, its name in script on the roof, the pool garden with cabanas), the
 * civic hall (white, a colonnade, the tower and its tiled dome, the park in front with its walk and fountains), the
 * overlook (paving, a stone balustrade where the
 * ground falls away, benches, coin viewers, lamps) and the reservoir (its dams, its fence, the valve tower; the water
 * on the main thread, the city's water shader).
 */
import * as THREE from 'three';
import { Batch, canvasTex, lit, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import { waterMat } from './world';
import { heightAt } from './terrain';
import { drawnAt } from './drawn';
import { OVERLOOK_PATH, lineMesh } from './crestdrape';
import { meshGeometry } from './mansions3d';
import { ASTERLY, ASTERLY_NAME, HIGHCREST_NAME, CIVIC, FENCE, HOTEL, HOTEL_NAME, OVERLOOK, RESERVOIR, SLAB_Y } from './crestsites';
import { WINDOW, poolOf } from './estates3d';
import { BULB, LED, PAVING, SPRAY, WATER, flat } from './mallkit';
import { COVER } from './palette';
import { UPLIGHT as UPLIGHT_AT, alongWall } from './crestnight';
import { windowOf } from './estates3d';

type Rect = [number, number, number, number];
type Pt = [number, number];

const PINK = toon('#f2b8b0');
const WHITE = toon('#f6f3ec');
const STONE = toon('#d9cfbb');
const STONE_SHADE = toon('#c4b99f');
const TILE = toon('#c0603f');
const DOME = toon('#2f7f9e');
const GOLD = toon('#d9a94a');
const WOOD = toon('#5a3a26');
const IRON = toon('#1e1d22');
const GLASS_RAIL = toon('#a9dcef');
const CONCRETE = toon('#b9b4aa');
const CONCRETE_TOP = toon('#cfcac0');
const ISLAND = toon(COVER.planted);
const CABANA = toon('#f4ead2');
const STRIPE = toon('#2f7f9e');
const LAMP = neon('#ffe2a8', 0.2, 1.3);
/**
 * The landmarks floodlit at night (the premium upgrade's Phase 1, "Glamorous"): their main walls warm a little (an
 * emissive well under the bloom's threshold), the small uplights at their feet the only bright things
 */
const flood = (key: string, c: string, night = 0.26) => siteMat(key, lit(toon(c, { emissive: '#ffd2a0' }), 0, night));
const PINK_LIT = flood('crest-flood-pink', '#f2b8b0');
const PINK_DEEP_LIT = flood('crest-flood-pink-deep', '#e79a92');
const WHITE_LIT = flood('crest-flood-white', '#f6f3ec', 0.22);
const UPLIGHT = neon('#fff0d0', 0.1, 1.5);
/** Uplights along the foot of each wall of a box (x0, z0, x1, z1) at `y`, out from it, but where `skip` says */
function uplights(b: Batch, r: Rect, y: number, skip?: (x: number, z: number) => boolean) {
  const [x0, z0, x1, z1] = r;
  const o = UPLIGHT_AT.out;
  for (const [a, c, n] of [
    [[x0, z0], [x1, z0], [0, -1]],
    [[x0, z1], [x1, z1], [0, 1]],
    [[x0, z0], [x0, z1], [-1, 0]],
    [[x1, z0], [x1, z1], [1, 0]],
  ] as [Pt, Pt, Pt][])
    for (const [x, z] of alongWall(a, c)) {
      if (skip?.(x, z)) continue;
      const [px, pz] = [x + n[0] * o, z + n[1] * o];
      b.box(px - 0.06, y, pz - 0.06, 0.12, 0.05, 0.12, UPLIGHT);
    }
}

/** THE ASTERLY's name, thin gold capitals on black, lit at night (the premium upgrade's Phase 4) */
const ASTERLY_SIGN = siteMat(
  'crest-asterly-name',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(512, 80, (c) => {
        c.fillStyle = '#121216';
        c.fillRect(0, 0, 512, 80);
        c.fillStyle = '#e8c97e';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = '300 46px "Didot", "Bodoni 72", Georgia, "Times New Roman", serif';
        (c as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '10px';
        c.fillText(ASTERLY_NAME, 256, 42);
      }),
    }),
    0.95,
    1.2
  )
);
/** Highcrest's name, cut in a bronze plaque on its marker stone by the overlook's way in */
const HIGHCREST_SIGN = siteMat(
  'crest-highcrest-name',
  new THREE.MeshBasicMaterial({
    map: canvasTex(256, 64, (c) => {
      c.fillStyle = '#7a5a32';
      c.fillRect(0, 0, 256, 64);
      c.strokeStyle = '#c9a75a';
      c.lineWidth = 3;
      c.strokeRect(5, 5, 246, 54);
      c.fillStyle = '#f0d9a0';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = '600 30px Georgia, "Times New Roman", serif';
      (c as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '6px';
      c.fillText(HIGHCREST_NAME, 128, 34);
    }),
  })
);

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
function windowsRound(b: Batch, r: Rect, y0: number, floors: number, ground: number, upper: number, step = 1.7, skip?: (x: number, z: number, f: number) => boolean, seed = '', low = false) {
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
        pane(b, x, z, n, 0.8, y, h, seed ? windowOf(seed, x, y, z, low) : WINDOW);
      }
    }
  }
}
/** A strip along a line on the ground, `w` either side: dense, on the grass as drawn (crestdrape.ts) */
const strip = (a: Pt, c: Pt, w: number, off: number) => meshGeometry(lineMesh([a, c], w, off));

export function registerSites(low: boolean, scene: THREE.Scene | null) {
  /* ---------- The grand hotel ---------- */
  const H = HOTEL;
  site('crestmont hotel', [H.block[0] - 1, H.block[1] - 1, H.block[2] + 1, H.block[3] + 1], (into) => {
    const b = new Batch();
    const y0 = SLAB_Y;
    const { ground, upper } = H.storey;
    const bodyTop = y0 + ground + (H.floors - 1) * upper;
    // The body: pink storeys over a white ground floor, a white cornice a storey, a parapet
    box(b, H.body[0], y0, H.body[1], H.body[2], y0 + ground, H.body[3], WHITE_LIT);
    box(b, H.body[0] + 0.05, y0 + ground, H.body[1] + 0.05, H.body[2] - 0.05, bodyTop, H.body[3] - 0.05, PINK_LIT);
    for (let f = 1; f < H.floors; f++) box(b, H.body[0] - 0.08, y0 + ground + (f - 1) * upper - 0.1, H.body[1] - 0.08, H.body[2] + 0.08, y0 + ground + (f - 1) * upper + 0.05, H.body[3] + 0.08, WHITE);
    box(b, H.body[0] - 0.12, bodyTop, H.body[1] - 0.12, H.body[2] + 0.12, bodyTop + 0.4, H.body[3] + 0.12, WHITE);
    const door = (x: number, z: number, f: number) => f === 0 && x < H.body[0] + 0.1 && z > H.porte[1] && z < H.porte[3];
    windowsRound(b, H.body, y0, H.floors, ground, upper, 1.6, door, 'hotel', low);
    uplights(b, H.body, y0, (x, z) => x < H.body[0] + 0.1 && z > H.porte[1] - 0.5 && z < H.porte[3] + 0.5);
    // The tower: two storeys more, deeper pink, its crown stepped in, the name on its front
    const T = H.tower;
    const towerTop = y0 + ground + (H.towerFloors - 1) * upper;
    box(b, T[0], bodyTop, T[1], T[2], towerTop, T[3], PINK_DEEP_LIT);
    windowsRound(b, T, y0, H.towerFloors, ground, upper, 1.6, (_x, _z, f) => f < H.floors, 'hotel-tower', low);
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
    flat(p, H.pool[0], H.pool[1], H.pool[2], H.pool[3], y0 + 0.02, poolOf(low), 8);
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
    box(b, hx0, y0 + 0.35, hz0, hx1, top, hz1, WHITE_LIT);
    box(b, hx0 - 0.15, top, hz0 - 0.15, hx1 + 0.15, top + 0.5, hz1 + 0.15, STONE_SHADE);
    const axis = (hx0 + hx1) / 2;
    windowsRound(b, C.hall, y0 + 0.35, 2, ground, upper, 1.7, (x, z, f) => f === 0 && Math.abs(x - axis) < 1.2 && z > hz1 - 0.1, 'civic', low);
    // (its uplights on the plinth, none in front under the colonnade)
    uplights(b, [hx0 - 0.4, hz0 - 0.4, hx1 + 0.4, hz1 + 0.4], y0 + 0.35, (_x, z) => z > hz1);
    pane(b, axis, hz1, [0, 1], 1.8, y0 + 0.35, 2.3, WOOD);
    // The colonnade along its front: columns under an entablature, steps
    const cz = C.colonnade.z;
    for (let i = 0; i < C.colonnade.n; i++) cyl(b, 0.2, ground + upper - 0.4, hx0 + 0.8 + (i * (hx1 - hx0 - 1.6)) / (C.colonnade.n - 1), y0 + 0.35, cz, WHITE_LIT, 12);
    box(b, hx0 + 0.3, top - 0.05, hz1, hx1 - 0.3, top + 0.45, cz + 0.4, WHITE);
    box(b, hx0 + 0.3, y0, hz1, hx1 - 0.3, y0 + 0.35, cz + 0.7, STONE);
    // The tower, a drum and the tiled dome, a gold finial
    const [tx0, tz0, tx1, tz1] = C.tower;
    const [tcx, tcz] = [(tx0 + tx1) / 2, (tz0 + tz1) / 2];
    box(b, tx0, top, tz0, tx1, y0 + C.towerTop, tz1, WHITE_LIT);
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

  // (the country club and its six holes were here till they were retired: docs/golf-plan.md Phase 4)

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
        // (and open to THE ASTERLY's bridge: Phase 4)
        const g = ASTERLY.bridge;
        if (mx > g[0] - 0.3 && mx < g[2] + 0.3 && mz > g[1] - 0.6 && mz < g[3] + 0.6) continue;
        const out = heightAt(mx + n[0] * 2, mz + n[1] * 2) - y;
        const [lx0, lz0, lx1, lz1] = [Math.min(sx, ex) - (n[0] ? 0.15 : 0), Math.min(sz, ez) - (n[1] ? 0.15 : 0), Math.max(sx, ex) + (n[0] ? 0.15 : 0), Math.max(sz, ez) + (n[1] ? 0.15 : 0)];
        // (a retaining wall topped just over the ground it holds back, not standing proud of the bank)
        if (out > 0.4) box(b, lx0, y - 0.3, lz0, lx1, Math.max(y + 0.45, drawnAt(mx + n[0] * 0.45, mz + n[1] * 0.45) + 0.28), lz1, STONE_SHADE);
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
    p.add(strip(pa, pb, OVERLOOK_PATH.half, OVERLOOK_PATH.lift), STONE);
    p.build(into, { cast: false, receive: true });
  });

  /* ---------- THE ASTERLY on Highcrest (the premium upgrade's Phase 4) ---------- */
  const A = ASTERLY;
  const all: Rect = [Math.min(A.body[0], A.bridge[0]), Math.min(A.body[1], A.terrace[1], A.bridge[1]), Math.max(A.body[2], A.terrace[2]), Math.max(A.body[3], A.terrace[3], A.bridge[3])];
  site('crestmont asterly', [all[0] - 2, all[1] - 2, all[2] + 2, all[3] + 2], (into) => {
    const b = new Batch();
    const y = A.y;
    const [x0, z0, x1, z1] = A.body;
    const [tx0, tz0, tx1, tz1] = A.terrace;
    const top = y + A.h;
    // The legs: slim white steel columns from under the floor down into the slope, a grid under the body and terrace
    const leg = (x: number, z: number) => {
      const g = Math.min(heightAt(x, z), drawnAt(x, z)) - 0.3;
      if (y - 0.35 - g > 0.05) cyl(b, 0.12, y - 0.35 - g, x, g, z, WHITE, 8);
    };
    for (const [a0, b0, a1, b1] of [A.body, A.terrace])
      for (let x = a0 + 0.6; x <= a1 - 0.5; x += (a1 - a0 - 1.2) / Math.max(1, Math.round((a1 - a0 - 1.2) / 3.2))) for (let z = b0 + 0.5; z <= b1 - 0.4; z += Math.max(1, (b1 - b0 - 1) / Math.max(1, Math.round((b1 - b0 - 1) / 3.2)))) leg(x, z);
    // The floor slab, the terrace's deck, the bridge
    box(b, x0 - 0.1, y - 0.35, z0 - 0.1, x1 + 0.1, y, z1 + 0.1, WHITE);
    box(b, tx0, y - 0.3, tz0, tx1, y - 0.02, tz1, WHITE);
    b.add(new THREE.PlaneGeometry(tx1 - tx0 - 0.1, tz1 - tz0 - 0.1).rotateX(-Math.PI / 2).translate((tx0 + tx1) / 2, y, (tz0 + tz1) / 2), WOOD);
    const [gx0, gz0, gx1, gz1] = A.bridge;
    box(b, gx0, y - 0.25, gz0, gx1, y - 0.02, gz1, STONE);
    for (const x of [gx0, gx1 - 0.05]) box(b, x, y, gz0 + 0.2, x + 0.05, y + 1.0, gz1, GLASS_RAIL);
    // The pavilion: glass all round between slim white mullions, warm at night, the roof slab overhanging, its edge lit
    const glass = (ax: number, az: number, bx: number, bz: number, n: Pt) => {
      const L = Math.hypot(bx - ax, bz - az);
      const k = Math.max(1, Math.round(L / 1.6));
      for (let i = 0; i < k; i++) {
        const t = (i + 0.5) / k;
        const [x, z] = [ax + (bx - ax) * t, az + (bz - az) * t];
        // (its door, on the side facing the overlook, at the bridge)
        if (n[1] === -A.out && Math.abs(x - (gx0 + gx1) / 2) < 0.9) {
          pane(b, x, z, n, 1.2, y, 2.3, IRON);
          continue;
        }
        pane(b, x, z, n, L / k - 0.12, y + 0.1, A.h - 0.3, windowOf('asterly', x, y, z, low));
      }
      for (let i = 0; i <= k; i++) {
        const [x, z] = [ax + ((bx - ax) * i) / k, az + ((bz - az) * i) / k];
        box(b, x - 0.05, y, z - 0.05, x + 0.05, top, z + 0.05, WHITE);
      }
    };
    glass(x0, z0, x1, z0, [0, -1]);
    glass(x0, z1, x1, z1, [0, 1]);
    glass(x0, z0, x0, z1, [-1, 0]);
    glass(x1, z0, x1, z1, [1, 0]);
    box(b, x0 + 0.05, y, z0 + 0.05, x1 - 0.05, y + 0.08, z1 - 0.05, WOOD);
    box(b, x0 - 0.7, top, z0 - 0.7, x1 + 0.7, top + A.roof, z1 + 0.7, WHITE);
    box(b, x0 - 0.72, top + 0.08, z0 - 0.72, x1 + 0.72, top + 0.14, z0 - 0.7, LED);
    box(b, x0 - 0.72, top + 0.08, z1 + 0.7, x1 + 0.72, top + 0.14, z1 + 0.72, LED);
    // Its name on the roof's edge over the door, facing the overlook
    const nz = A.out > 0 ? z0 - 0.72 : z1 + 0.72;
    b.add(new THREE.PlaneGeometry(4.2, 0.55).rotateY(A.out > 0 ? Math.PI : 0).translate((x0 + x1) / 2, top + A.roof + 0.45, nz - A.out * 0.01), ASTERLY_SIGN);
    box(b, (x0 + x1) / 2 - 2.2, top + A.roof, nz - 0.06, (x0 + x1) / 2 + 2.2, top + A.roof + 0.75, nz + 0.06, IRON);
    // The terrace: a glass balustrade round its three open sides, its tables, each with a candle and a parasol furled
    for (const [a, c, d, e] of [
      [tx0, tz0, tx0 + 0.05, tz1],
      [tx1 - 0.05, tz0, tx1, tz1],
      A.out > 0 ? [tx0, tz1 - 0.05, tx1, tz1] : [tx0, tz0, tx1, tz0 + 0.05],
    ])
      box(b, a, y, c, d, y + 1.05, e, GLASS_RAIL);
    b.detail(() => {
      const tz = (tz0 + tz1) / 2;
      for (let x = tx0 + 1.3; x < tx1 - 1; x += 2.4) {
        cyl(b, 0.42, 0.05, x, y + 0.72, tz, WHITE, 10);
        cyl(b, 0.05, 0.72, x, y, tz, IRON, 5);
        for (const s of [-1, 1]) box(b, x + s * 0.7 - 0.2, y + 0.44, tz - 0.2, x + s * 0.7 + 0.2, y + 0.49, tz + 0.2, IRON);
        b.add(new THREE.SphereGeometry(0.05, 6, 4).translate(x, y + 0.82, tz), LAMP);
      }
    });
    b.build(into, { cast: true, receive: true });
  });
  /* ---------- Highcrest's marker at the overlook's way in ---------- */
  {
    const [pa, pb] = OVERLOOK.path;
    const [dx, dz] = [pb[0] - pa[0], pb[1] - pa[1]];
    const l = Math.hypot(dx, dz) || 1;
    const [nx, nz] = [-dz / l, dx / l];
    const [mx, mz] = [pb[0] + nx * 1.9, pb[1] + nz * 1.9];
    site('crestmont highcrest', [mx - 2, mz - 2, mx + 2, mz + 2], (into) => {
      const b = new Batch();
      const g = Math.min(heightAt(mx, mz), drawnAt(mx, mz));
      const turn = Math.atan2(dx, dz);
      b.add(new THREE.BoxGeometry(1.6, 1.1, 0.35).translate(0, 0.55, 0).rotateY(turn).translate(mx, g - 0.1, mz), STONE);
      b.add(new THREE.BoxGeometry(1.7, 0.1, 0.42).translate(0, 1.05, 0).rotateY(turn).translate(mx, g - 0.1, mz), STONE_SHADE);
      // (its name cut in a bronze plaque on its face to the road)
      b.add(new THREE.PlaneGeometry(1.3, 0.34).translate(0, 0.6, -0.18).rotateY(turn + Math.PI).translate(mx, g - 0.1, mz), HIGHCREST_SIGN);
      b.build(into, { cast: true, receive: true });
    });
  }

  /* ---------- The reservoir: the dams, the fence, the valve tower ---------- */
  const R = RESERVOIR;
  site('crestmont reservoir', [FENCE[0] - 4, FENCE[1] - 4, FENCE[2] + 4, FENCE[3] + 4], (into) => {
    const b = new Batch();
    const [x0, z0, x1, z1] = R.rect;
    const crest = R.crest;
    // The coping round the basin: stone from under the floor to a little over the apron, the water just under it
    // (the owner's call, 2026-11-19: the water held in a stone-edged basin, not spread up its banks)
    const c = R.coping / 2;
    for (const r of [
      [x0 - c, z0 - c, x1 + c, z0 + c],
      [x0 - c, z1 - c, x1 + c, z1 + c],
      [x0 - c, z0 + c, x0 + c, z1 - c],
      [x1 - c, z0 + c, x1 + c, z1 - c],
    ] as Rect[]) {
      box(b, r[0], R.floor - 0.15, r[1], r[2], crest + 0.1, r[3], CONCRETE);
      box(b, r[0] - 0.03, crest + 0.1, r[1] - 0.03, r[2] + 0.03, crest + 0.16, r[3] + 0.03, CONCRETE_TOP);
    }
    // The valve tower: concrete from the floor, a little roof
    const { x, z, r, h } = R.tower;
    cyl(b, r, R.y + h - R.floor, x, R.floor, z, CONCRETE, 16);
    cyl(b, r + 0.25, 0.25, x, R.y + h, z, CONCRETE_TOP, 16);
    b.add(new THREE.ConeGeometry(r + 0.2, 0.7, 16).translate(x, R.y + h + 0.6, z), TILE);
    // The fence: iron posts and two rails, following the ground (on a dam, its crest)
    const [fx0, fz0, fx1, fz1] = FENCE;
    // (on the ground as it's drawn: the apron, or the bank eased past it)
    const ground = (px: number, pz: number) => drawnAt(px, pz);
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
    // (the basin only: its coping all round)
    const [a, c, e, d] = R.rect;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(e - a, d - c).rotateX(-Math.PI / 2).translate((a + e) / 2, R.y, (c + d) / 2), waterMat);
    water.name = 'crestmont reservoir water';
    scene.add(water);
  }
}

