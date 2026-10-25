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
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, siteMat, toon } from './kit';
import type { Tick } from './world';
import { SLAB } from './world';
import { site } from './tilework';
import { NS_ROADS } from './layout';
import { parkedCars, type CarId } from './cars';
import { TAXI_YELLOW } from './kerbside';
import { FILMS } from './uptownsites';
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
  SHOP_NAMES,
  ZEBRA,
  type Shop,
} from './mall';

export const SELF = import.meta.url;

/* ---------- Paint ---------- */

const CHROME = toon('#d9dee8');
const WHITE = toon('#f6f3fb');
const DARK = toon('#2a2740');
const INK = toon('#1b1830');
const NAVY = toon('#241a4d');
const LILAC = toon('#c7a6ff');
const TEAL = toon('#5fd6c4');
const PEACH = toon('#ffc48c');
const CONCRETE = toon('#b9b4c9');
const ASPHALT = toon('#2c2a44');
const PAINT = toon('#e8e4f8');
const YELLOW = toon('#ffd23f');
const WATER = toon('#62c6ea');
const SPRAY = toon('#dff6ff');
const TRUNK = toon('#9a7350');
const FROND = toon('#2fbf71');
const POT = toon('#ff9ec7');
const WOOD = toon('#a8743f');
const PINK_NEON = neon('#ff4fd8', 0.3, 2.4);
const CYAN_NEON = neon('#4fe3ff', 0.3, 2.4);
const YELLOW_NEON = neon('#ffd23f', 0.3, 2.4);
const PURPLE_NEON = neon('#9d5cff', 0.3, 2.4);
const NEONS = [PINK_NEON, CYAN_NEON, YELLOW_NEON, PURPLE_NEON];
const BULB = neon('#ffe9a8', 0.3, 2.4);
const SKY = lit(toon('#9fd8f0'), 0.15, 1.1);
const pastel = new Map<string, THREE.Material>();
const wallOf = (c: string) => pastel.get(c) ?? (pastel.set(c, toon(c)), pastel.get(c)!);

/** Shop windows: displays behind glass in a chrome frame, lit warm at night (a pattern every 4 tiles) */
const FRONT = (() => {
  const draw = (on: boolean) => (c: CanvasRenderingContext2D) => {
    c.fillStyle = on ? '#000' : '#d9dee8';
    c.fillRect(0, 0, 256, 128);
    for (const x of [6, 134]) {
      if (on) {
        c.fillStyle = '#ffd99a';
        c.fillRect(x, 6, 116, 116);
        c.fillStyle = '#ff9ec7';
        c.fillRect(x + 10, 70, 96, 10);
        continue;
      }
      const g = c.createLinearGradient(x, 6, x + 116, 122);
      g.addColorStop(0, '#9fe8ff');
      g.addColorStop(0.6, '#6a7fd0');
      g.addColorStop(1, '#4b3b8f');
      c.fillStyle = g;
      c.fillRect(x, 6, 116, 116);
      // (shelves and goods behind the glass)
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.fillRect(x + 10, 70, 96, 6);
      c.fillRect(x + 10, 100, 96, 6);
      c.fillStyle = 'rgba(255,158,199,0.55)';
      for (let i = 0; i < 5; i++) c.fillRect(x + 14 + i * 19, 56, 12, 14);
    }
  };
  const map = canvasTex(256, 128, draw(false));
  const emissiveMap = canvasTex(128, 64, (c) => {
    c.scale(0.5, 0.5);
    draw(true)(c);
  });
  for (const t of [map, emissiveMap]) t.wrapS = THREE.RepeatWrapping;
  return siteMat('mall-front', lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff' }), 0.06, 1.05));
})();
/** The promenade's checkered paving (pink and white, a tile a square) */
const TILES = (() => {
  const map = canvasTex(128, 128, (c) => {
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        c.fillStyle = (i + j) % 2 ? '#f6f3fb' : '#ffb3d6';
        c.fillRect(i * 64, j * 64, 64, 64);
      }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return siteMat('mall-tiles', toon('#ffffff', { map }));
})();

/** One atlas for every sign (4 x 8 cells of 256 x 64): the shops, the anchors, the cinema, the mall, the court, and the rest */
const CELLS = [...SHOP_NAMES.map((s) => s.name), ...ANCHORS.map((a) => a.name), CINEMA.name, 'NOW SHOWING', MALL_NAME, 'PALM COURT', 'TAXI', 'BUS', 'P', 'ENTRANCE'];
const CELL_INK = ['#ff4fd8', '#4fe3ff', '#ffd23f', '#9dffb0', '#c7a6ff'];
const SIGNS = siteMat(
  'mall-signs',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(1024, 512, (c) => {
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        CELLS.forEach((text, k) => {
          const [x, y] = [(k % 4) * 256, Math.floor(k / 4) * 64];
          const taxi = text === 'TAXI';
          c.fillStyle = taxi ? '#ffc23d' : text === 'P' ? '#2a62d8' : '#160f2e';
          c.fillRect(x + 2, y + 2, 252, 60);
          const ink = taxi ? '#1b1830' : text === 'P' ? '#ffffff' : CELL_INK[k % CELL_INK.length];
          c.font = `800 ${text.length > 12 ? 30 : 38}px ${FONT_DISPLAY}`;
          c.shadowColor = ink;
          c.shadowBlur = taxi || text === 'P' ? 0 : 12;
          c.fillStyle = ink;
          c.fillText(text, x + 128, y + 34);
          c.shadowBlur = 0;
          c.fillStyle = '#ffffff';
          c.globalAlpha = taxi || text === 'P' ? 0 : 0.55;
          c.fillText(text, x + 128, y + 34);
          c.globalAlpha = 1;
        });
      }),
    }),
    0.95,
    1.4
  )
);
/** A sign from the atlas: w x h, its middle at (x, y, z), facing the way `ry` turns +z */
function sign(b: Batch, text: string, x: number, y: number, z: number, w: number, h: number, ry: number) {
  const k = CELLS.indexOf(text);
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  const [u0, v1] = [(k % 4) / 4 + 0.003, 1 - Math.floor(k / 4) / 8 - 0.004];
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (0.25 - 0.006), v1 - (1 - uv.getY(i)) * (0.125 - 0.008));
  b.add(g.rotateY(ry).translate(x, y, z), SIGNS);
}
/** The cinema's posters for made-up films, four to a row, two rows */
const POSTERS = siteMat(
  'mall-posters',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(512, 512, (c) => {
        const tops = ['#ff4fd8', '#4fe3ff', '#ffd23f', '#9d5cff', '#ff8a3d', '#5fd6c4'];
        FILMS.forEach((name, k) => {
          const [x, y] = [(k % 4) * 128, Math.floor(k / 4) * 256];
          const g = c.createLinearGradient(0, y, 0, y + 256);
          g.addColorStop(0, tops[k % tops.length]);
          g.addColorStop(1, '#160f2e');
          c.fillStyle = g;
          c.fillRect(x + 4, y + 4, 120, 248);
          // (a sun over a horizon, the 80s way)
          c.fillStyle = '#ffd23f';
          c.beginPath();
          c.arc(x + 64, y + 120, 30, Math.PI, 0);
          c.fill();
          c.fillStyle = '#160f2e';
          for (let i = 0; i < 4; i++) c.fillRect(x + 30, y + 100 + i * 6, 68, 2);
          c.fillStyle = '#ffffff';
          c.textAlign = 'center';
          c.font = `800 17px ${FONT_DISPLAY}`;
          const [a, ...rest] = name.split(' ');
          c.fillText(a, x + 64, y + 186);
          c.fillText(rest.join(' '), x + 64, y + 208);
        });
      }),
    }),
    0.95,
    1.2
  )
);
function poster(b: Batch, k: number, x: number, y: number, z: number, ry: number) {
  const g = new THREE.PlaneGeometry(1.1, 2.2);
  const uv = g.attributes.uv;
  const [u0, v1] = [(k % 4) / 4 + 0.004, 1 - Math.floor(k / 4) / 2 - 0.004];
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (0.25 - 0.008), v1 - (1 - uv.getY(i)) * (0.5 - 0.008));
  b.add(g.rotateY(ry).translate(x, y, z), POSTERS);
}
/** The pylon's faces: STARLIGHT MALL down its length */
const PYLON_FACE = siteMat(
  'mall-pylon',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(128, 512, (c) => {
        c.fillStyle = '#160f2e';
        c.fillRect(0, 0, 128, 512);
        c.strokeStyle = '#4fe3ff';
        c.lineWidth = 6;
        c.strokeRect(6, 6, 116, 500);
        c.save();
        c.translate(64, 256);
        c.rotate(-Math.PI / 2);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `800 64px ${FONT_DISPLAY}`;
        c.shadowColor = '#ff4fd8';
        c.shadowBlur = 16;
        c.fillStyle = '#ff4fd8';
        c.fillText(MALL_NAME, 0, 4);
        c.shadowBlur = 0;
        c.fillStyle = '#ffffff';
        c.globalAlpha = 0.55;
        c.fillText(MALL_NAME, 0, 4);
        c.restore();
      }),
    }),
    0.95,
    1.4
  )
);

/* ---------- Helpers ---------- */

const Y = SLAB;
const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, mat);
const cyl = (b: Batch, r: number, h: number, x: number, y: number, z: number, mat: THREE.Material, seg = 10, r0 = r, open = false) => b.add(new THREE.CylinderGeometry(r, r0, h, seg, 1, open).translate(x, y + h / 2, z), mat);
/** A flat rectangle at y, in pieces no longer than `len` */
function flat(b: Batch, x0: number, z0: number, x1: number, z1: number, y: number, mat: THREE.Material, len = 14) {
  const nx = Math.max(1, Math.ceil((x1 - x0) / len));
  const nz = Math.max(1, Math.ceil((z1 - z0) / len));
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const [a0, a1] = [x0 + ((x1 - x0) * i) / nx, x0 + ((x1 - x0) * (i + 1)) / nx];
      const [c0, c1] = [z0 + ((z1 - z0) * j) / nz, z0 + ((z1 - z0) * (j + 1)) / nz];
      const g = new THREE.PlaneGeometry(a1 - a0, c1 - c0).rotateX(-Math.PI / 2).translate((a0 + a1) / 2, y, (c0 + c1) / 2);
      if (mat === TILES) {
        const uv = g.attributes.uv;
        const pos = g.attributes.position;
        for (let k = 0; k < uv.count; k++) uv.setXY(k, pos.getX(k) / 2, pos.getZ(k) / 2);
      }
      b.add(g, mat);
    }
}
/** A shopfront's glass on a wall facing +x (face 1) or -x at x, from z0 to z1, y0 to y1 */
function glassX(b: Batch, x: number, face: 1 | -1, z0: number, z1: number, y0: number, y1: number) {
  const g = new THREE.PlaneGeometry(z1 - z0, y1 - y0);
  const uv = g.attributes.uv;
  for (let k = 0; k < uv.count; k++) uv.setX(k, (uv.getX(k) * (z1 - z0)) / 4);
  b.add(g.rotateY(face * (Math.PI / 2)).translate(x + face * 0.012, (y0 + y1) / 2, (z0 + z1) / 2), FRONT);
}
/** The same facing +z (face 1) or -z */
function glassZ(b: Batch, z: number, face: 1 | -1, x0: number, x1: number, y0: number, y1: number) {
  const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
  const uv = g.attributes.uv;
  for (let k = 0; k < uv.count; k++) uv.setX(k, (uv.getX(k) * (x1 - x0)) / 4);
  b.add(g.rotateY(face === 1 ? 0 : Math.PI).translate((x0 + x1) / 2, (y0 + y1) / 2, z + face * 0.012), FRONT);
}
/** A palm in its planter */
function palm(b: Batch, x: number, z: number, y = Y, s = 1) {
  cyl(b, 0.42 * s, 0.5, x, y, z, POT, 8, 0.5 * s);
  // (the trunk in three leaning pieces)
  let [px, py] = [x, y + 0.45];
  for (let i = 0; i < 3; i++) {
    const nx = px + 0.08 * s;
    cyl(b, 0.09 * s, 1.15 * s, (px + nx) / 2, py, z, TRUNK, 6, 0.12 * s, true);
    [px, py] = [nx, py + 1.12 * s];
  }
  // (fronds drooping all round)
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const g = new THREE.ConeGeometry(0.22 * s, 1.7 * s, 4).scale(1, 1, 0.25).rotateZ(-Math.PI / 2 - 0.45).rotateY(a).translate(px + Math.cos(a) * 0.7 * s, py - 0.25 * s, z - Math.sin(a) * 0.7 * s);
    b.add(g, FROND);
  }
}

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
  box(b, x0, Y, z0, x1, Y + h, z1, LILAC);
  // Neon bands round it, a white cornice, glass-block corners
  box(b, x0, Y + 3.15, z1, x1, Y + 3.25, z1 + 0.06, CYAN_NEON);
  box(b, x0 - 0.06, Y + h, z0 - 0.06, x1 + 0.06, Y + h + 0.3, z1 + 0.06, WHITE);
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
  // The skylit roof: a glass vault along it on a white curb
  box(b, x0 + 3, Y + h + 0.3, (z0 + z1) / 2 - 4.6, x1 - 3, Y + h + 0.6, (z0 + z1) / 2 + 4.6, WHITE);
  const vault = new THREE.CylinderGeometry(4.2, 4.2, x1 - x0 - 7, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 0.45, 1);
  b.add(vault.translate((x0 + x1) / 2, Y + h + 0.6, (z0 + z1) / 2), SKY);
  for (let x = x0 + 4; x < x1 - 3; x += 3.5) {
    const ribs: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) {
      const t = (k / 10) * Math.PI;
      ribs.push(new THREE.Vector3(x, Y + h + 0.6 + Math.sin(t) * 4.2 * 0.45 + 0.03, (z0 + z1) / 2 + Math.cos(t) * 4.2));
    }
    b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribs), 12, 0.05, 4, false), WHITE);
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
  // Its doors at the back, under the canopy
  glassZ(b, z0, 1, x0 + 1, x1 - 1, Y, Y + 3.2);
  sign(b, 'ENTRANCE', xm, Y + 3.6, z0 + 0.03, 2.6, 0.5, 0);
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

export function register({ scene }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
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
  site('mall hall', [HALL.rect[0], HALL.rect[1], HALL.rect[2], HALL.rect[3] + 0.5], build(hall));
  site('mall porch', [PORCH.rect[0], PORCH.rect[1], PORCH.rect[2], PORCH.rect[3]], build((b) => (porch(b), pylon(b), shelter(b))));
  // The loop, the car parks (in pieces), the multi-storey
  site('mall loop', [NS0.c, LOOP.zN - LOOP.half, LOOP.xE + LOOP.half, LOOP.zS + LOOP.half], build(loopRoad, false));
  for (let x = MALL_BLOCK[0]; x < MSCP.rect[0]; x += 18) {
    const x1 = Math.min(MSCP.rect[0], x + 18);
    site(`mall car park ${Math.round(x)}`, [x, LOOP.zN, x1, LOOP.zS], build((b) => carPark(b, x, x1), false));
  }
  site('mall multi-storey', MSCP.rect, build(multiStorey));
  if (!scene) return;
  // The cabs at the rank, the cars in the car park and on the multi-storey's decks
  type Car = [CarId, number, number, number, string];
  parkedCars(scene, Y, [...RANK_CABS.map((c): Car => ['sedan', c.x, c.z, c.yaw, TAXI_YELLOW]), ...(PARKED as Car[])]);
  for (let d = 0; d <= MSCP.decks; d++) {
    const cars = MSCP_CARS.filter((c) => c[5] === d * MSCP.deck).map(([id, x, z, yaw, colour]): Car => [id as CarId, x, z, yaw, colour]);
    if (cars.length) parkedCars(scene, Y + d * MSCP.deck, cars);
  }
}
