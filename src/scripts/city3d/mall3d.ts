/*
 * Palm Court and Starlight Mall on screen (docs/mall-plan.md step 1; the
 * numbers are mall.ts), a district loaded as you approach (`LAZY_DISTRICTS`
 * id `mall` in districts.ts); the site worker loads it too. Retro neon 80s:
 * pastel walls, chrome trim, neon tubes along the rooflines, checkered
 * paving, palms in planters; every name made up, from one sign atlas.
 *
 * - **Palm Court** (sites): the promenade's checkered paving, the shops (a
 *   pastel box each, a lit shopfront, a fascia with its name, a neon line
 *   along the roof, a striped awning near only; the taller ones with an upper
 *   window band and a triangle on the parapet), Paradise Cinema (its marquee
 *   with bulbs, its name and the posters for made-up films), the fountain,
 *   benches, palms and the PALM COURT arch.
 * - **Starlight Mall** (sites): the hall (glass-block corners, neon bands,
 *   the skylit roof), its porch (chrome posts under a triangle with the
 *   mall's name), the two anchors with their names, the pylon, the bus
 *   shelter; the loop's asphalt and lines, the zebra over the north avenue,
 *   the car park's bays and TAXI board, the multi-storey's decks.
 * - **On the main thread:** the parked cars and the cabs.
 */
import * as THREE from 'three';
import { Batch } from './kit';
import type { Tick } from './world';
import { site } from './tilework';
import { NS_ROADS } from './layout';
import { parkedCars, type CarId } from './cars';
import { TAXI_YELLOW } from './kerbside';
import { FILMS } from './uptownsites';
import {
  ASPHALT,
  BULB,
  CHROME,
  CONCRETE,
  CYAN_NEON,
  DARK,
  GLASS,
  INK,
  LILAC,
  NAVY,
  NEONS,
  PAINT,
  PEACH,
  PINK_NEON,
  PYLON_FACE,
  SKY,
  SPRAY,
  TEAL,
  TILES,
  WATER,
  WHITE,
  WOOD,
  Y,
  YELLOW,
  YELLOW_NEON,
  box,
  cyl,
  flat,
  glassX,
  glassZ,
  palm,
  poster,
  sign,
  wallOf,
} from './mallkit';
import {
  ANCHORS,
  ARCH,
  ARCH_POSTS,
  BAY,
  BAYS,
  BENCHES,
  CINEMA,
  COURT,
  FOUNTAIN,
  HALL,
  LOOP,
  MALL_BLOCK,
  MALL_NAME,
  MSCP,
  MSCP_CARS,
  PALMS,
  PARKED,
  PORCH,
  PROM,
  PYLON,
  RANK_CABS,
  SHELTER,
  SHOPS,
  ZEBRA,
  type Shop,
} from './mall';
import { BOLLARD, BOLLARDS, DOOR, WALL, WALLS } from './mallinside';
import { registerInside } from './mallinside3d';

export const SELF = import.meta.url;

/* ---------- Palm Court ---------- */

function shop(b: Batch, s: Shop, i: number) {
  const [x0, z0, x1, z1] = s.rect;
  const fx = s.face === 1 ? x1 : x0;
  const wall = wallOf(s.wall);
  box(b, x0, Y, z0, x1, Y + s.h, z1, wall);
  // A white cornice over the roof's edge, a neon line along the front
  box(b, x0 - 0.06, Y + s.h, z0 - 0.06, x1 + 0.06, Y + s.h + 0.25, z1 + 0.06, WHITE);
  box(b, fx - (s.face === 1 ? 0.02 : -0.02) - 0.04, Y + s.h - 0.12, z0 + 0.2, fx - (s.face === 1 ? 0.02 : -0.02) + 0.04, Y + s.h - 0.04, z1 - 0.2, NEONS[i % NEONS.length]);
  // The shopfront: chrome frame, the glass, a dark door in the middle, the fascia with its name
  box(b, fx - 0.08, Y, z0 + 0.3, fx + 0.08, Y + 3.05, z1 - 0.3, CHROME);
  glassX(b, fx + s.face * 0.08, s.face, z0 + 0.45, z1 - 0.45, Y + 0.35, Y + 2.6);
  const zm = (z0 + z1) / 2;
  box(b, fx + s.face * 0.085 - 0.01, Y, zm - 0.6, fx + s.face * 0.085 + 0.01, Y + 2.3, zm + 0.6, DARK);
  box(b, fx - 0.1 + s.face * 0.06, Y + 2.75, z0 + 0.25, fx + 0.1 + s.face * 0.06, Y + 3.45, z1 - 0.25, NAVY);
  sign(b, s.name, fx + s.face * 0.17, Y + 3.1, zm, Math.min(4.2, z1 - z0 - 0.8), 0.62, s.face * (Math.PI / 2));
  // The taller ones: a band of windows upstairs and a triangle on the parapet
  if (s.h > 5) {
    glassX(b, fx + s.face * 0.005, s.face, z0 + 0.6, z1 - 0.6, Y + 4.1, Y + 5.4);
    const tri = new THREE.CylinderGeometry(0.01, 1.1, 1.0, 3).rotateY(Math.PI / 2).translate(fx - s.face * 0.6, Y + s.h + 0.75, zm);
    b.add(tri, i % 2 ? TEAL : PEACH);
  }
  // A striped awning over the window (near only)
  b.detail(() => {
    const n = Math.max(3, Math.round((z1 - z0 - 1) / 0.55));
    for (let k = 0; k < n; k++) {
      const [a, c] = [z0 + 0.5 + ((z1 - z0 - 1) * k) / n, z0 + 0.5 + ((z1 - z0 - 1) * (k + 1)) / n];
      const g = new THREE.BoxGeometry(1.1, 0.05, c - a).rotateZ(s.face * -0.35).translate(fx + s.face * 0.55, Y + 2.62, (a + c) / 2);
      b.add(g, k % 2 ? WHITE : wallOf(s.wall === '#f7e27a' ? '#ff9ec7' : '#ff4f8b'));
    }
  });
}

function cinema(b: Batch) {
  const [x0, z0, x1, z1] = CINEMA.rect;
  const xm = (x0 + x1) / 2;
  box(b, x0, Y, z0, x1, Y + CINEMA.h, z1, NAVY);
  // Pastel bands across its front and a neon line along its roof
  box(b, x0 - 0.04, Y + 6.2, z1 - 0.02, x1 + 0.04, Y + 6.6, z1 + 0.04, wallOf('#ff9ec7'));
  box(b, x0 - 0.04, Y + 6.8, z1 - 0.02, x1 + 0.04, Y + 7.0, z1 + 0.04, TEAL);
  box(b, x0 - 0.04, Y + CINEMA.h, z0 - 0.04, x1 + 0.04, Y + CINEMA.h + 0.3, z1 + 0.04, WHITE);
  box(b, x0, Y + CINEMA.h - 0.15, z1 + 0.05, x1, Y + CINEMA.h - 0.07, z1 + 0.12, PINK_NEON);
  // The name, big over the marquee
  box(b, xm - 7.6, Y + 4.7, z1, xm + 7.6, Y + 6.1, z1 + 0.12, INK);
  sign(b, CINEMA.name, xm, Y + 5.4, z1 + 0.13, 14.6, 1.2, 0);
  // The marquee out over the square: its box, NOW SHOWING both ways, a row of bulbs round its edge
  box(b, xm - 6, Y + 3.3, z1, xm + 6, Y + 4.3, z1 + 2.6, WHITE);
  sign(b, 'NOW SHOWING', xm, Y + 3.8, z1 + 2.61, 6, 0.75, 0);
  for (let x = xm - 5.8; x <= xm + 5.8; x += 0.5) b.add(new THREE.SphereGeometry(0.07, 6, 4).translate(x, Y + 3.3, z1 + 2.64), BULB);
  for (let x = xm - 5.8; x <= xm + 5.8; x += 0.5) b.add(new THREE.SphereGeometry(0.07, 6, 4).translate(x, Y + 4.3, z1 + 2.64), BULB);
  // Glass doors under it, posters either side
  glassZ(b, z1, 1, xm - 4.5, xm + 4.5, Y, Y + 3.0);
  for (let k = 0; k < FILMS.length; k++) {
    const side = k < 3 ? -1 : 1;
    const x = xm + side * (6.6 + (k % 3) * 2.2);
    box(b, x - 0.68, Y + 0.6, z1, x + 0.68, Y + 3.4, z1 + 0.08, CHROME);
    poster(b, k, x, Y + 2.0, z1 + 0.09, 0);
  }
}

function court(b: Batch, z0: number, z1: number) {
  // The promenade's checkered paving, the rows' shops in this stretch
  flat(b, PROM[0], Math.max(z0, CINEMA.rect[3]), PROM[1], Math.min(z1, COURT[3] - 0.2), Y + 0.006, TILES, 10);
  SHOPS.forEach((s, i) => s.rect[1] >= z0 && s.rect[1] < z1 && shop(b, s, i));
  for (const [x, z] of PALMS) if (z >= z0 && z < z1) palm(b, x, z);
}

function centre(b: Batch) {
  // The fountain: a pastel basin, its water, a column with a bowl and the jet
  const { x, z, r } = FOUNTAIN;
  cyl(b, r, 0.55, x, Y, z, wallOf('#7fe0d0'), 28);
  box(b, x - r, Y + 0.55, z - 0.04, x + r, Y + 0.6, z + 0.04, PINK_NEON);
  b.add(new THREE.CircleGeometry(r - 0.25, 28).rotateX(-Math.PI / 2).translate(x, Y + 0.47, z), WATER);
  cyl(b, 0.22, 1.3, x, Y + 0.4, z, WHITE, 10);
  cyl(b, 0.9, 0.18, x, Y + 1.6, z, wallOf('#ff9ec7'), 18, 0.3);
  b.add(new THREE.CircleGeometry(0.8, 18).rotateX(-Math.PI / 2).translate(x, Y + 1.77, z), WATER);
  cyl(b, 0.05, 1.2, x, Y + 1.78, z, SPRAY, 6, 0.1);
  b.add(new THREE.ConeGeometry(0.75, 0.8, 12, 1, true).rotateX(Math.PI).translate(x, Y + 2.6, z), SPRAY);
  for (const s of BENCHES) {
    const back = s.ry === 0 ? -1 : 1;
    box(b, s.x - 1.1, Y + 0.38, s.z - 0.22, s.x + 1.1, Y + 0.45, s.z + 0.22, WOOD);
    box(b, s.x - 1.1, Y + 0.45, s.z + back * 0.2 - 0.03, s.x + 1.1, Y + 0.9, s.z + back * 0.2 + 0.03, wallOf('#ff9ec7'));
    for (const sd of [-1, 1]) box(b, s.x + sd * 0.95 - 0.04, Y, s.z - 0.18, s.x + sd * 0.95 + 0.04, Y + 0.38, s.z + 0.18, CHROME);
  }
}

function arch(b: Batch) {
  // Two chrome posts, the beam between them with PALM COURT both ways, a neon arc over it
  for (const [x0, z0, x1, z1] of ARCH_POSTS) {
    box(b, x0, Y, z0, x1, Y + ARCH.h, z1, CHROME);
    box(b, x0 - 0.05, Y + ARCH.h, z0 - 0.05, x1 + 0.05, Y + ARCH.h + 0.12, z1 + 0.05, PINK_NEON);
  }
  const [a, c] = [ARCH_POSTS[0][2], ARCH_POSTS[1][0]];
  box(b, a, Y + ARCH.h - 1.3, ARCH.z - 0.25, c, Y + ARCH.h - 0.3, ARCH.z + 0.25, NAVY);
  sign(b, 'PALM COURT', (a + c) / 2, Y + ARCH.h - 0.8, ARCH.z + 0.26, Math.min(8, c - a - 0.4), 0.85, 0);
  sign(b, 'PALM COURT', (a + c) / 2, Y + ARCH.h - 0.8, ARCH.z - 0.26, Math.min(8, c - a - 0.4), 0.85, Math.PI);
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k <= 16; k++) {
    const t = k / 16;
    pts.push(new THREE.Vector3(a + (c - a) * t, Y + ARCH.h + Math.sin(Math.PI * t) * 1.4, ARCH.z));
  }
  b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.06, 4, false), CYAN_NEON);
}

/* ---------- Starlight Mall ---------- */

function anchor(b: Batch, k: number) {
  const a = ANCHORS[k];
  const [x0, z0, x1, z1] = a.rect;
  const xm = (x0 + x1) / 2;
  box(b, x0, Y, z0, x1, Y + a.h, z1, wallOf(a.wall));
  // A white band at the top, a neon line under it, chrome stripes down the front
  box(b, x0 - 0.06, Y + a.h - 0.9, z0 - 0.06, x1 + 0.06, Y + a.h + 0.2, z1 + 0.06, WHITE);
  box(b, x0, Y + a.h - 1.05, z1 + 0.06, x1, Y + a.h - 0.97, z1 + 0.12, k ? CYAN_NEON : PINK_NEON);
  for (const sx of [x0 + 1.2, x1 - 1.4]) box(b, sx, Y, z1, sx + 0.2, Y + a.h - 1.1, z1 + 0.06, CHROME);
  // The name, big, on its front and on the side it shows to its avenue
  box(b, xm - 5.6, Y + 4.4, z1, xm + 5.6, Y + 5.8, z1 + 0.1, INK);
  sign(b, a.name, xm, Y + 5.1, z1 + 0.11, 10.8, 1.25, 0);
  const sideX = k ? x1 : x0;
  const sd = k ? 1 : -1;
  box(b, sideX + (k ? 0 : -0.1), Y + 4.4, (z0 + z1) / 2 - 8, sideX + (k ? 0.1 : 0), Y + 5.8, (z0 + z1) / 2 + 8, INK);
  sign(b, a.name, sideX + sd * 0.11, Y + 5.1, (z0 + z1) / 2, 15.6, 1.25, sd * (Math.PI / 2));
  // Its doors under a canopy, glass either side
  glassZ(b, z1, 1, xm - 3, xm + 3, Y, Y + 3);
  box(b, xm - 3.5, Y + 3.1, z1, xm + 3.5, Y + 3.35, z1 + 1.6, CHROME);
  glassZ(b, z1, 1, x0 + 1.6, xm - 3.4, Y + 0.6, Y + 2.8);
  glassZ(b, z1, 1, xm + 3.4, x1 - 1.6, Y + 0.6, Y + 2.8);
}

function hall(b: Batch) {
  const [x0, z0, x1, z1] = HALL.rect;
  const h = HALL.h;
  // Its walls (hollow since step 2: mallinside3d.ts draws inside), open at the doors behind the porch, a wall over them
  for (const [a0, c0, a1, c1] of WALLS) box(b, a0, Y, c0, a1, Y + h, c1, LILAC);
  box(b, DOOR.x0, Y + DOOR.h, z1 - WALL, DOOR.x1, Y + h, z1, LILAC);
  // Neon bands round it, a white cornice, glass-block corners
  box(b, x0, Y + 3.15, z1, x1, Y + 3.25, z1 + 0.06, CYAN_NEON);
  const zc = (z0 + z1) / 2;
  const [vx0, vx1, vz0, vz1] = [x0 + 3.5, x1 - 3.5, zc - 4.2, zc + 4.2];
  // The roof: a slab round the skylight's opening, the cornice round its edge
  // (between the walls, not flush with their faces)
  const [i0, j0, i1, j1] = [x0 + WALL, z0 + WALL, x1 - WALL, z1 - WALL];
  for (const [a0, c0, a1, c1] of [
    [i0, j0, i1, vz0],
    [i0, vz1, i1, j1],
    [i0, vz0, vx0, vz1],
    [vx1, vz0, i1, vz1],
  ])
    box(b, a0, Y + h - 0.25, c0, a1, Y + h, c1, WHITE);
  for (const [a0, c0, a1, c1] of [
    [x0 - 0.06, z0 - 0.06, x1 + 0.06, z0 + 0.5],
    [x0 - 0.06, z1 - 0.5, x1 + 0.06, z1 + 0.06],
    [x0 - 0.06, z0 + 0.5, x0 + 0.5, z1 - 0.5],
    [x1 - 0.5, z0 + 0.5, x1 + 0.06, z1 - 0.5],
  ])
    box(b, a0, Y + h, c0, a1, Y + h + 0.3, c1, WHITE);
  box(b, x0, Y + h - 0.15, z1 + 0.06, x1, Y + h - 0.07, z1 + 0.12, PINK_NEON);
  for (const cx of [x0 + 0.4, x1 - 2.4]) box(b, cx, Y, z1, cx + 2, Y + h - 0.4, z1 + 0.05, SKY);
  // Windows along the front, both storeys
  const [p0, p1] = [PORCH.rect[0], PORCH.rect[2]];
  for (const [a, c] of [
    [x0 + 2.8, p0 - 0.6],
    [p1 + 0.6, x1 - 2.8],
  ]) {
    glassZ(b, z1, 1, a, c, Y + 0.4, Y + 2.7);
    glassZ(b, z1, 1, a, c, Y + 3.6, Y + 5.6);
  }
  // The skylight: a glass vault over the opening on a white curb, white ribs over it
  for (const [a0, c0, a1, c1] of [
    [vx0 - 0.5, vz0 - 0.4, vx1 + 0.5, vz0],
    [vx0 - 0.5, vz1, vx1 + 0.5, vz1 + 0.4],
    [vx0 - 0.5, vz0, vx0, vz1],
    [vx1, vz0, vx1 + 0.5, vz1],
  ])
    box(b, a0, Y + h, c0, a1, Y + h + 0.6, c1, WHITE);
  const vault = new THREE.CylinderGeometry(4.2, 4.2, vx1 - vx0, 16, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 0.45, 1);
  b.add(vault.translate((x0 + x1) / 2, Y + h + 0.6, zc), GLASS);
  for (let x = x0 + 4; x < x1 - 3; x += 3.5) {
    const ribs: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) {
      const t = (k / 10) * Math.PI;
      ribs.push(new THREE.Vector3(x, Y + h + 0.6 + Math.sin(t) * 4.2 * 0.45 + 0.03, zc + Math.cos(t) * 4.2));
    }
    b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribs), 12, 0.05, 4, false), WHITE);
  }
  // The vault's two gable ends, glass too
  for (const x of [vx0, vx1]) {
    const g = new THREE.CircleGeometry(4.2, 16, 0, Math.PI).scale(1, 0.45, 1).rotateY(Math.PI / 2);
    b.add(g.translate(x, Y + h + 0.6, zc), GLASS);
  }
}

function porch(b: Batch) {
  const [x0, z0, x1, z1] = PORCH.rect;
  const xm = (x0 + x1) / 2;
  // Chrome posts at the front corners, the canopy, the triangle over it with the mall's name
  for (const x of [x0 + 0.2, x1 - 0.2]) cyl(b, 0.2, PORCH.h, x, Y, z1 - 0.2, CHROME, 10);
  box(b, x0, Y + PORCH.h, z0, x1, Y + PORCH.h + 0.35, z1, WHITE);
  box(b, x0, Y + PORCH.h - 0.08, z1 - 0.02, x1, Y + PORCH.h, z1 + 0.04, YELLOW_NEON);
  const tri = new THREE.Shape([new THREE.Vector2(-5, 0), new THREE.Vector2(5, 0), new THREE.Vector2(0, 2.6)]);
  b.add(new THREE.ExtrudeGeometry(tri, { depth: 0.3, bevelEnabled: false }).translate(xm, Y + PORCH.h + 0.35, z1 - 0.3), wallOf('#ff9ec7'));
  box(b, xm - 3.6, Y + PORCH.h + 0.55, z1 + 0.01, xm + 3.6, Y + PORCH.h + 1.35, z1 + 0.05, INK);
  sign(b, MALL_NAME, xm, Y + PORCH.h + 0.95, z1 + 0.06, 7, 0.75, 0);
  // The doors at its back, open: a chrome frame, the glass leaves slid aside, ENTRANCE over them
  box(b, DOOR.x0 - 0.15, Y, z0, DOOR.x0, Y + DOOR.h + 0.15, z0 + 0.08, CHROME);
  box(b, DOOR.x1, Y, z0, DOOR.x1 + 0.15, Y + DOOR.h + 0.15, z0 + 0.08, CHROME);
  box(b, DOOR.x0 - 0.15, Y + DOOR.h, z0, DOOR.x1 + 0.15, Y + DOOR.h + 0.15, z0 + 0.08, CHROME);
  for (const [a, c] of [
    [DOOR.x0, DOOR.x0 + 1.1],
    [DOOR.x1 - 1.1, DOOR.x1],
  ])
    b.add(new THREE.PlaneGeometry(c - a, DOOR.h - 0.1).translate((a + c) / 2, Y + DOOR.h / 2, z0 - 0.12), GLASS);
  sign(b, 'ENTRANCE', xm, Y + 3.6, z0 + 0.03, 2.6, 0.5, 0);
  // The bollards across the doors (a walker gets through, no car does): chrome, a neon cap
  for (const [bx, bz] of BOLLARDS) {
    cyl(b, BOLLARD, 0.85, bx, Y, bz, CHROME, 10);
    cyl(b, BOLLARD + 0.01, 0.06, bx, Y + 0.85, bz, PINK_NEON, 10);
  }
}

function pylon(b: Batch) {
  const { x, z, w, d, h } = PYLON;
  box(b, x - w / 2 - 0.2, Y, z - d / 2 - 0.2, x + w / 2 + 0.2, Y + 0.8, z + d / 2 + 0.2, CHROME);
  box(b, x - w / 2, Y + 0.8, z - d / 2, x + w / 2, Y + h, z + d / 2, INK);
  for (const s of [-1, 1]) b.add(new THREE.PlaneGeometry(w - 0.2, h - 1.4).rotateY(s === 1 ? 0 : Math.PI).translate(x, Y + 0.8 + (h - 0.8) / 2, z + s * (d / 2 + 0.01)), PYLON_FACE);
  // The star on top
  const star = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    const r = k % 2 ? 0.28 : 0.65;
    if (k) star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  b.add(new THREE.ExtrudeGeometry(star, { depth: 0.16, bevelEnabled: false }).translate(x, Y + h - 0.05, z - 0.08), YELLOW_NEON);
}

function shelter(b: Batch) {
  const [x0, z0, x1, z1] = SHELTER;
  box(b, x0, Y, z0, x1, Y + 2.2, z0 + 0.06, SKY);
  for (const x of [x0, x1 - 0.08]) box(b, x, Y, z0, x + 0.08, Y + 2.3, z1, CHROME);
  box(b, x0 - 0.1, Y + 2.3, z0 - 0.1, x1 + 0.1, Y + 2.42, z1 + 0.15, TEAL);
  box(b, x0 + 0.2, Y + 0.42, z0 + 0.1, x1 - 0.2, Y + 0.48, z0 + 0.5, WOOD);
  box(b, x1 + 0.3, Y, z1 - 0.05, x1 + 0.38, Y + 2.5, z1 + 0.03, DARK);
  sign(b, 'BUS', x1 + 0.34, Y + 2.65, z1 + 0.04, 0.6, 0.3, 0);
}

/* ---------- The loop, the car parks ---------- */

const ROAD_Y = 0.036;
const PAINT_Y = 0.046;
const NS0 = NS_ROADS[0];

function loopRoad(b: Batch) {
  const { zN, zS, xE, half } = LOOP;
  const xw = NS0.c + NS0.half;
  flat(b, xw, zN - half, xE + half, zN + half, ROAD_Y, ASPHALT);
  flat(b, xw, zS - half, xE + half, zS + half, ROAD_Y, ASPHALT);
  flat(b, xE - half, zN + half, xE + half, zS - half, ROAD_Y, ASPHALT);
  b.detail(() => {
    // A dashed centre line round it (two-way)
    for (let x = xw + 1; x < xE - half - 0.4; x += 1.3) for (const z of [zN, zS]) box(b, x, PAINT_Y - 0.002, z - 0.04, x + 0.6, PAINT_Y, z + 0.04, YELLOW);
    for (let z = zN + half + 0.6; z < zS - half - 0.4; z += 1.3) box(b, xE - 0.04, PAINT_Y - 0.002, z, xE + 0.04, PAINT_Y, z + 0.6, YELLOW);
    // The zebra over the north avenue from Palm Court's passage
    for (let x = NS0.c - NS0.half + 0.3; x < NS0.c + NS0.half - 0.2; x += 0.85) b.add(new THREE.PlaneGeometry(0.45, ZEBRA.half * 2).rotateX(-Math.PI / 2).translate(x + 0.22, PAINT_Y, ZEBRA.z), PAINT);
  });
}

function carPark(b: Batch, x0: number, x1: number) {
  b.detail(() => {
    for (const bay of BAYS) {
      if (bay.x < x0 || bay.x >= x1) continue;
      for (const s of [-1, 1]) b.add(new THREE.PlaneGeometry(0.08, BAY.d).rotateX(-Math.PI / 2).translate(bay.x + (s * BAY.w) / 2, Y + 0.006, bay.z), PAINT);
    }
  });
  // The rank's board by its bays
  const cab = RANK_CABS.find((c) => c.x >= x0 && c.x < x1);
  if (cab) {
    const [rx, rz] = [Math.min(...RANK_CABS.map((c) => c.x)) - BAY.w / 2 - 0.3, cab.z - BAY.d / 2 - 0.2];
    box(b, rx - 0.05, Y, rz - 0.05, rx + 0.05, Y + 2.4, rz + 0.05, DARK);
    sign(b, 'TAXI', rx, Y + 2.25, rz - 0.06, 1, 0.25, Math.PI);
    sign(b, 'TAXI', rx, Y + 2.25, rz + 0.06, 1, 0.25, 0);
  }
}

function multiStorey(b: Batch) {
  const [x0, z0, x1, z1] = MSCP.rect;
  const { deck, decks } = MSCP;
  // Its decks on columns, an open parapet round each with a neon line, the stair tower with the P sign
  for (let d = 1; d <= decks + 1; d++) {
    const y = Y + d * deck;
    box(b, x0, y - 0.3, z0, x1, y, z1, CONCRETE);
    box(b, x0 - 0.02, y, z0 - 0.02, x1 + 0.02, y + 0.75, z0 + 0.15, wallOf('#ffc48c'));
    box(b, x0 - 0.02, y, z1 - 0.15, x1 + 0.02, y + 0.75, z1 + 0.02, wallOf('#ffc48c'));
    box(b, x0 - 0.02, y, z0, x0 + 0.15, y + 0.75, z1, wallOf('#ffc48c'));
    box(b, x1 - 0.15, y, z0, x1 + 0.02, y + 0.75, z1, wallOf('#ffc48c'));
    box(b, x0 - 0.06, y + 0.6, z0, x0 - 0.02, y + 0.68, z1, d % 2 ? CYAN_NEON : PINK_NEON);
  }
  for (let x = x0 + 0.2; x < x1; x += (x1 - x0 - 0.6) / 3) for (let z = z0 + 0.2; z < z1; z += (z1 - z0 - 0.6) / 5) box(b, x, Y, z, x + 0.4, Y + deck * (decks + 1) - 0.3, z + 0.4, CONCRETE);
  box(b, x0 - 0.3, Y, z1 - 3.2, x0 + 2.4, Y + deck * (decks + 1) + 1.1, z1 - 0.2, TEAL);
  box(b, x0 - 0.32, Y + deck * (decks + 1) - 0.2, z1 - 2.6, x0 - 0.3, Y + deck * (decks + 1) + 0.8, z1 - 0.8, wallOf('#2a62d8'));
  sign(b, 'P', x0 - 0.34, Y + deck * (decks + 1) + 0.3, z1 - 1.7, 1.4, 0.35, -Math.PI / 2);
  // The ground's bays' lines
  b.detail(() => {
    for (const x of [x0 + 0.4, x1 - 4.4]) for (let z = z0 + 0.7; z < z1 - 1; z += BAY.w) box(b, x, Y + 0.004, z, x + 4, Y + 0.01, z + 0.08, PAINT);
  });
}

/* ---------- Registering ---------- */

export function register({ scene, tick }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  const build = (draw: (b: Batch) => void, cast = true) => (into: THREE.Object3D) => {
    const b = new Batch();
    draw(b);
    b.build(into, { cast, receive: true });
  };
  // Palm Court: the cinema, the rows in stretches, the fountain and the arch
  site('mall cinema', [CINEMA.rect[0] - 1, CINEMA.rect[1] - 1, CINEMA.rect[2] + 1, CINEMA.rect[3] + 3], build(cinema));
  for (let z = CINEMA.rect[3]; z < COURT[3]; z += 24) {
    const z1 = Math.min(COURT[3], z + 24);
    site(`mall court ${Math.round(z)}`, [COURT[0], z, COURT[2], z1], build((b) => court(b, z, z1)));
  }
  site('mall fountain', [FOUNTAIN.x - 4, FOUNTAIN.z - 5, FOUNTAIN.x + 4, FOUNTAIN.z + 5], build(centre));
  site('mall arch', [PROM[0], ARCH.z - 1, PROM[1], ARCH.z + 1], build(arch));
  // Starlight Mall: each anchor, the hall, the porch, the pylon and the shelter
  ANCHORS.forEach((a, k) => site(`mall anchor ${k}`, [a.rect[0] - 0.5, a.rect[1], a.rect[2] + 0.5, a.rect[3] + 2], build((b) => anchor(b, k))));
  // (its shell casts no shadow: inside, the day comes in as through the skylight)
  site('mall hall', [HALL.rect[0], HALL.rect[1], HALL.rect[2], HALL.rect[3] + 0.5], build(hall, false));
  site('mall porch', [PORCH.rect[0], PORCH.rect[1], PORCH.rect[2], PORCH.rect[3]], build((b) => (porch(b), pylon(b), shelter(b))));
  // The loop, the car parks (in pieces), the multi-storey
  site('mall loop', [NS0.c, LOOP.zN - LOOP.half, LOOP.xE + LOOP.half, LOOP.zS + LOOP.half], build(loopRoad, false));
  for (let x = MALL_BLOCK[0]; x < MSCP.rect[0]; x += 18) {
    const x1 = Math.min(MSCP.rect[0], x + 18);
    site(`mall car park ${Math.round(x)}`, [x, LOOP.zN, x1, LOOP.zS], build((b) => carPark(b, x, x1), false));
  }
  site('mall multi-storey', MSCP.rect, build(multiStorey));
  // Inside the hall (step 2: near only)
  registerInside({ tick });
  if (!scene) return;
  // The cabs at the rank, the cars in the car park and on the multi-storey's decks
  type Car = [CarId, number, number, number, string];
  parkedCars(scene, Y, [...RANK_CABS.map((c): Car => ['sedan', c.x, c.z, c.yaw, TAXI_YELLOW]), ...(PARKED as Car[])]);
  for (let d = 0; d <= MSCP.decks; d++) {
    const cars = MSCP_CARS.filter((c) => c[5] === d * MSCP.deck).map(([id, x, z, yaw, colour]): Car => [id as CarId, x, z, yaw, colour]);
    if (cars.length) parkedCars(scene, Y + d * MSCP.deck, cars);
  }
}
