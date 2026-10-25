/*
 * Palm Court and Starlight Mall on screen (docs/mall-plan.md; the numbers are
 * mall.ts), a district loaded as you approach (`LAZY_DISTRICTS` id `mall` in
 * districts.ts); the site worker loads it too. A modern mall and lifestyle
 * centre (the owner's call): white and grey cladding, glass curtain walls in
 * black steel, timber soffits, stone paving, warm white light; every name
 * made up, from one sign atlas. The paint and the surfaces are mallkit.ts's.
 *
 * - **Palm Court** (sites): stone paving; the shops, each its own front
 *   (`style`: a glass box in black steel under a timber canopy, white render
 *   round a deep window, cladding with fins over the glass, timber over the
 *   glass), two storeys every third; Paradise Cinema (a dark clad box, a
 *   double-height glazed lobby under a canopy, poster lightboxes); the water
 *   feature with its steel ring, benches, trees in planters (the trees
 *   themselves are the city's, mall.ts `MALL_TREES`), festoon lights across
 *   the promenade and the PALM COURT gateway.
 * - **Starlight Mall** (sites): the hall's curtain wall between clad piers,
 *   the entrance's dark feature wall with the mall's name and its star, the
 *   cantilevered canopy with a timber soffit, the doors open behind bollards;
 *   the glass vault and the rooftop plant; Maxwell's (light panels, black fins,
 *   a glazed ground floor) and Bright & Co. (dark panels, a double-height glass
 *   front, a timber band), each with its loading dock at the back; the totem,
 *   the bus shelter, the forecourt's paving, planters and pay stations; the
 *   loop, its zebras, the car park's islands with trolley shelters, the
 *   multi-storey behind perforated metal screens.
 * - **On the main thread:** the parked cars and the cabs.
 */
import * as THREE from 'three';
import { Batch, canvasTex, lit, siteMat, toon } from './kit';
import type { Tick } from './world';
import { site } from './tilework';
import { NS_ROADS } from './layout';
import { parkedCars, type CarId } from './cars';
import { TAXI_YELLOW } from './kerbside';
import { FILMS } from './uptownsites';
import {
  ASPHALT,
  BULB,
  CHARCOAL,
  CLAD,
  CLAD_DARK,
  CONCRETE,
  CURTAIN,
  DARK,
  GLASS,
  GOLD,
  GREY,
  LED,
  LIGHT,
  MID,
  PAINT,
  PANEL,
  PAVING,
  PERF,
  RENDER,
  SHRUB,
  SOIL,
  SPRAY,
  STEEL,
  STONE,
  TIMBER,
  WATER,
  WHITE,
  WOOD,
  Y,
  box,
  cyl,
  face,
  flat,
  glassX,
  glassZ,
  planter,
  signAtlas,
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
  COURT_TREES,
  FOUNTAIN,
  HALL,
  ISLANDS,
  LOOP,
  LOOP_ZEBRA,
  MALL_BLOCK,
  MALL_NAME,
  MSCP,
  MSCP_CARS,
  PARKED,
  PAY_STATIONS,
  PLANTER,
  PLANTERS,
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
import { BOLLARD, BOLLARDS, DOOR, WALL, WALLS } from './mallinside';
import { registerInside } from './mallinside3d';

export const SELF = import.meta.url;

/* ---------- Signs ---------- */

/** The outside's signs (4 x 8, full): the shops, the anchors, the cinema, the mall, the court, and the rest */
const CELLS = [...SHOP_NAMES.map((s) => s.name), ...ANCHORS.map((a) => a.name), CINEMA.name, 'NOW SHOWING', MALL_NAME, 'PALM COURT', 'TAXI', 'BUS', 'P', 'ENTRANCE'];
/** Charcoal letters on white for the rendered and timber shops' signs and Bright & Co. (on its dark panels) */
const LIGHT_SIGNS = new Set([...SHOPS.filter((s) => s.style === 'render' || s.style === 'timber').map((s) => s.name), ANCHORS[1].name]);
const sign = signAtlas('mall-signs', CELLS, LIGHT_SIGNS);

/** The cinema's poster lightboxes: made-up films, four to a row, two rows */
const POSTERS = siteMat(
  'mall-posters',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(512, 512, (c) => {
        const tops = ['#1f3b57', '#5a2a3c', '#2d4a3a', '#3d2f5c', '#5c3b1f', '#1f4d4f'];
        const marks = ['#f2c12e', '#e4775a', '#9fd3c7', '#c9b6f2', '#f0a14a', '#7fd0e0'];
        FILMS.forEach((name, k) => {
          const [x, y] = [(k % 4) * 128, Math.floor(k / 4) * 256];
          const g = c.createLinearGradient(0, y, 0, y + 256);
          g.addColorStop(0, tops[k % tops.length]);
          g.addColorStop(1, '#111216');
          c.fillStyle = g;
          c.fillRect(x + 4, y + 4, 120, 248);
          // (one bold shape: a disc, a slash or a band)
          c.fillStyle = marks[k % marks.length];
          if (k % 3 === 0) {
            c.beginPath();
            c.arc(x + 64, y + 96, 34, 0, Math.PI * 2);
            c.fill();
          } else if (k % 3 === 1) {
            c.beginPath();
            c.moveTo(x + 24, y + 150);
            c.lineTo(x + 104, y + 40);
            c.lineTo(x + 112, y + 52);
            c.lineTo(x + 32, y + 162);
            c.fill();
          } else c.fillRect(x + 4, y + 84, 120, 22);
          c.fillStyle = '#ffffff';
          c.textAlign = 'center';
          c.font = '700 15px Inter, "Helvetica Neue", Arial, sans-serif';
          const [a, ...rest] = name.split(' ');
          c.fillText(a, x + 64, y + 196);
          c.fillText(rest.join(' '), x + 64, y + 216);
        });
      }),
    }),
    0.95,
    1.15
  )
);
function poster(b: Batch, k: number, x: number, y: number, z: number, ry: number) {
  const g = new THREE.PlaneGeometry(1.1, 2.2);
  const uv = g.attributes.uv;
  const [u0, v1] = [(k % 4) / 4 + 0.004, 1 - Math.floor(k / 4) / 2 - 0.004];
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (0.25 - 0.008), v1 - (1 - uv.getY(i)) * (0.5 - 0.008));
  b.add(g.rotateY(ry).translate(x, y, z), POSTERS);
}
/** The totem's faces: the mall's star and name on a white panel, its tenants on charcoal strips under it */
const TOTEM = siteMat(
  'mall-totem',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(128, 512, (c) => {
        c.fillStyle = '#26282c';
        c.fillRect(0, 0, 128, 512);
        c.fillStyle = '#f1f1ee';
        c.fillRect(8, 8, 112, 150);
        // (the star)
        c.fillStyle = '#d9a94a';
        c.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
          const r = k % 2 ? 11 : 26;
          c.lineTo(64 + Math.cos(a) * r, 52 + Math.sin(a) * r);
        }
        c.fill();
        c.fillStyle = '#26282c';
        c.textAlign = 'center';
        c.font = '700 21px Inter, "Helvetica Neue", Arial, sans-serif';
        c.fillText('STARLIGHT', 64, 112);
        c.font = '600 18px Inter, "Helvetica Neue", Arial, sans-serif';
        c.fillText('MALL', 64, 138);
        const tenants = ["MAXWELL'S", 'BRIGHT & CO.', 'FOOD COURT', 'CINEMA', 'PALM COURT'];
        tenants.forEach((t, i) => {
          const y = 176 + i * 62;
          c.fillStyle = '#3a3d42';
          c.fillRect(8, y, 112, 54);
          c.fillStyle = '#fff3df';
          c.font = '600 14px Inter, "Helvetica Neue", Arial, sans-serif';
          c.fillText(t, 64, y + 32);
        });
      }),
    }),
    0.95,
    1.2
  )
);

/* ---------- Helpers ---------- */

/** The islands' grass */
const LAWN = toon('#6f9a4e');

const PX: [number, number] = [1, 0];
const NX: [number, number] = [-1, 0];
const PZ: [number, number] = [0, 1];
const NZ: [number, number] = [0, -1];
/** A ceiling or soffit facing down at y (a surface laid on in world units keeps its pattern) */
function under(b: Batch, x0: number, z0: number, x1: number, z1: number, y: number, mat: THREE.Material) {
  const rep = mat.userData.worldUV as [number, number] | undefined;
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  if (rep) {
    const uv = g.attributes.uv;
    const pos = g.attributes.position;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, pos.getX(k) / rep[0], pos.getZ(k) / rep[1]);
  }
  b.add(g, mat);
}
/** Rooftop plant: an air handler (a box with a fan grille) and a louvred screen beside it (near only) */
function plant(b: Batch, x: number, z: number, y: number) {
  b.detail(() => {
    box(b, x - 1, y, z - 0.6, x + 1, y + 0.9, z + 0.6, GREY);
    for (const dx of [-0.5, 0.5]) b.add(new THREE.CircleGeometry(0.32, 12).rotateX(-Math.PI / 2).translate(x + dx, y + 0.905, z), STEEL);
    for (let i = 0; i < 6; i++) box(b, x + 1.3 + i * 0.25, y, z - 0.7, x + 1.36 + i * 0.25, y + 1.1, z + 0.7, MID);
  });
}
/** A parapet's metal coping round a roof (x0, z0, x1, z1) at its top y */
function coping(b: Batch, x0: number, z0: number, x1: number, z1: number, y: number) {
  const t = 0.12;
  box(b, x0 - 0.04, y, z0 - 0.04, x1 + 0.04, y + t, z0 + 0.25, MID);
  box(b, x0 - 0.04, y, z1 - 0.25, x1 + 0.04, y + t, z1 + 0.04, MID);
  box(b, x0 - 0.04, y, z0 + 0.25, x0 + 0.25, y + t, z1 - 0.25, MID);
  box(b, x1 - 0.25, y, z0 + 0.25, x1 + 0.04, y + t, z1 - 0.25, MID);
}

/* ---------- Palm Court ---------- */

function shop(b: Batch, s: Shop, i: number) {
  const [x0, z0, x1, z1] = s.rect;
  const f = s.face;
  const fx = f === 1 ? x1 : x0;
  const n: [number, number] = f === 1 ? PX : NX;
  const h = s.h;
  const tall = h > 6;
  const zm = (z0 + z1) / 2;
  const w = z1 - z0;
  /** A box out from the front by d0..d1 */
  const out = (d0: number, d1: number, y0: number, y1: number, za: number, zb: number, mat: THREE.Material) => box(b, Math.min(fx + f * d0, fx + f * d1), y0, za, Math.max(fx + f * d0, fx + f * d1), y1, zb, mat);
  const body = s.style === 'render' ? WHITE : s.style === 'clad' ? LIGHT : CHARCOAL;
  box(b, x0, Y, z0, x1, Y + h, z1, body);
  coping(b, x0, z0, x1, z1, Y + h);
  if (i % 2 === 0) plant(b, (x0 + x1) / 2 - f * 1.5, zm, Y + h);
  // Each style's front (the shop window on the ground floor, its frame, the sign, the door)
  const gw = [z0 + 0.5, z1 - 0.5];
  if (s.style === 'glass') {
    // a glass box in black steel: shop window below, curtain wall above, a timber canopy between with a LED edge
    glassX(b, fx, f, gw[0], gw[1], Y + 0.1, Y + 3.0);
    if (tall) face(b, CURTAIN, fx, z0 + 0.3, fx, z1 - 0.3, Y + 3.7, Y + h - 0.3, n);
    for (const z of [z0 + 0.3, zm - 0.04, z1 - 0.38]) out(0, 0.1, Y, Y + h - 0.2, z, z + 0.08, STEEL);
    out(0, 1.3, Y + 3.0, Y + 3.25, z0 + 0.2, z1 - 0.2, STEEL);
    b.add(new THREE.PlaneGeometry(1.3, w - 0.4).rotateX(Math.PI / 2).translate(fx + f * 0.65, Y + 2.995, zm), WOOD);
    out(1.28, 1.33, Y + 3.05, Y + 3.12, z0 + 0.25, z1 - 0.25, LED);
    out(0.02, 0.06, Y + 3.3, Y + 3.68, z0 + 0.6, z1 - 0.6, DARK);
    sign(b, s.name, fx + f * 0.065, Y + 3.49, zm, Math.min(4.6, w - 1.4), 0.34, f * (Math.PI / 2));
  } else if (s.style === 'render') {
    // white render round a deep window: the frame stands out, the sign on the render over it, lamps either side
    face(b, RENDER, fx, z0, fx, z1, Y, Y + h, n);
    glassX(b, fx, f, gw[0] + 0.3, gw[1] - 0.3, Y + 0.1, Y + 2.9);
    out(0, 0.45, Y + 2.9, Y + 3.2, gw[0], gw[1], WHITE);
    out(0, 0.45, Y, Y + 3.2, gw[0], gw[0] + 0.3, WHITE);
    out(0, 0.45, Y, Y + 3.2, gw[1] - 0.3, gw[1], WHITE);
    sign(b, s.name, fx + f * 0.02, Y + 3.75, zm, Math.min(4.2, w - 1.6), 0.5, f * (Math.PI / 2));
    if (tall) for (const z of [zm - 1.6, zm + 0.4]) glassX(b, fx + f * 0.005, f, z, z + 1.2, Y + 4.6, Y + 6.2, CURTAIN);
    b.detail(() => {
      for (const z of [gw[0] - 0.15, gw[1] + 0.15]) out(0, 0.18, Y + 2.3, Y + 2.6, z - 0.08, z + 0.08, STEEL);
    });
  } else if (s.style === 'clad') {
    // cladding panels, the glass across the ground floor in a black frame, a charcoal fascia, fins upstairs
    face(b, CLAD, fx, z0, fx, z1, Y + 3.4, Y + h, n);
    glassX(b, fx, f, z0 + 0.2, z1 - 0.2, Y + 0.1, Y + 2.85);
    out(0, 0.12, Y + 2.85, Y + 3.4, z0 + 0.1, z1 - 0.1, CHARCOAL);
    sign(b, s.name, fx + f * 0.125, Y + 3.12, zm, Math.min(4.6, w - 1.2), 0.42, f * (Math.PI / 2));
    out(0, 0.08, Y, Y + 2.85, z0 + 0.1, z0 + 0.22, STEEL);
    out(0, 0.08, Y, Y + 2.85, z1 - 0.22, z1 - 0.1, STEEL);
    if (tall) for (let z = z0 + 0.5; z < z1 - 0.3; z += 0.8) out(0, 0.3, Y + 3.6, Y + h - 0.4, z, z + 0.07, STEEL);
  } else {
    // timber over glass: a black steel canopy box, the sign on a white panel on the timber
    face(b, TIMBER, fx, z0, fx, z1, Y + 3.0, Y + h, n);
    glassX(b, fx, f, z0 + 0.25, z1 - 0.25, Y + 0.1, Y + 2.9);
    out(0, 1.1, Y + 2.9, Y + 3.15, z0 + 0.1, z1 - 0.1, STEEL);
    out(1.08, 1.12, Y + 2.95, Y + 3.02, z0 + 0.15, z1 - 0.15, LED);
    sign(b, s.name, fx + f * 0.02, Y + 3.7, zm, Math.min(3.8, w - 1.8), 0.46, f * (Math.PI / 2));
    if (tall) glassX(b, fx + f * 0.005, f, zm - 1.4, zm + 1.4, Y + 4.7, Y + 6.3, CURTAIN);
  }
  // The door in the middle (glass in a black frame, a steel pull)
  out(0.014, 0.03, Y, Y + 2.4, zm - 0.7, zm + 0.7, DARK);
  b.detail(() => out(0.03, 0.08, Y + 0.9, Y + 1.6, zm + 0.45, zm + 0.5, GREY));
}

function court(b: Batch, z0: number, z1: number) {
  // Stone paving across the court, the shops in this stretch, the trees' planters, festoon lights over the promenade
  flat(b, COURT[0], Math.max(z0, CINEMA.rect[3]), COURT[2], Math.min(z1, COURT[3] - 0.2), Y + 0.006, PAVING, 12);
  SHOPS.forEach((s, i) => s.rect[1] >= z0 && s.rect[1] < z1 && shop(b, s, i));
  for (const [x, z] of COURT_TREES) if (z >= z0 && z < z1) planter(b, x, z, Y, 1.4, 0.5);
  b.detail(() => {
    for (let z = CINEMA.rect[3] + 8; z < ARCH.z - 4; z += 12) {
      if (z < z0 || z >= z1 || Math.abs(z - FOUNTAIN.z) < 6) continue;
      const hold = (x: number, zz: number) => SHOPS.some((s) => zz > s.rect[1] && zz < s.rect[3] && (x === PROM[0] ? s.face === 1 : s.face === -1));
      if (!hold(PROM[0], z) || !hold(PROM[1], z + 5)) continue;
      // a sagging line from one row to the other, bulbs along it
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        pts.push(new THREE.Vector3(PROM[0] + (PROM[1] - PROM[0]) * t, Y + 4.4 - Math.sin(Math.PI * t) * 0.9, z + 5 * t));
      }
      b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.012, 3, false), STEEL);
      for (let k = 1; k < 12; k++) b.add(new THREE.SphereGeometry(0.06, 6, 4).translate(pts[k].x, pts[k].y - 0.08, pts[k].z), BULB);
    }
  });
}

function centre(b: Batch) {
  // The water feature: a round pool in a stone rim, a steel ring standing in it, jets round it
  const { x, z, r } = FOUNTAIN;
  cyl(b, r, 0.45, x, Y, z, STONE, 32);
  box(b, x - r + 0.05, Y + 0.45, z - 0.02, x + r - 0.05, Y + 0.46, z + 0.02, STONE);
  b.add(new THREE.CircleGeometry(r - 0.2, 32).rotateX(-Math.PI / 2).translate(x, Y + 0.38, z), WATER);
  box(b, x - 0.3, Y + 0.3, z - 0.3, x + 0.3, Y + 0.55, z + 0.3, CHARCOAL);
  b.add(new THREE.TorusGeometry(0.95, 0.09, 8, 32).translate(x, Y + 1.5, z), LIGHT);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    b.add(new THREE.CylinderGeometry(0.014, 0.035, 1.0, 5, 1, true).translate(0, 0.5, 0).rotateZ(0.35).rotateY(-a).translate(x + Math.cos(a) * (r - 0.6), Y + 0.38, z + Math.sin(a) * (r - 0.6)), SPRAY);
  }
  b.add(new THREE.TorusGeometry(r - 0.02, 0.025, 4, 40).rotateX(Math.PI / 2).translate(x, Y + 0.47, z), LED);
  // Benches: timber slats on concrete plinths
  for (const s of BENCHES) {
    for (const sd of [-1, 1]) box(b, s.x + sd * 0.85 - 0.18, Y, s.z - 0.25, s.x + sd * 0.85 + 0.18, Y + 0.4, s.z + 0.25, CONCRETE);
    box(b, s.x - 1.15, Y + 0.4, s.z - 0.28, s.x + 1.15, Y + 0.48, s.z + 0.28, WOOD);
  }
}

function arch(b: Batch) {
  // The gateway: two stone pylons, a black steel beam across with PALM COURT on a lit panel both ways
  for (const [x0, z0, x1, z1] of ARCH_POSTS) {
    box(b, x0, Y, z0, x1, Y + ARCH.h + 0.4, z1, STONE);
    box(b, x0 - 0.04, Y + ARCH.h + 0.4, z0 - 0.04, x1 + 0.04, Y + ARCH.h + 0.5, z1 + 0.04, MID);
    box(b, x0 - 0.02, Y + 0.3, z1, x1 + 0.02, Y + 0.36, z1 + 0.03, LED);
  }
  const [a, c] = [ARCH_POSTS[0][2], ARCH_POSTS[1][0]];
  box(b, a, Y + ARCH.h - 0.6, ARCH.z - 0.2, c, Y + ARCH.h, ARCH.z + 0.2, STEEL);
  for (const s of [1, -1]) sign(b, 'PALM COURT', (a + c) / 2, Y + ARCH.h - 0.3, ARCH.z + s * 0.205, Math.min(4.4, c - a - 1), 0.42, s === 1 ? 0 : Math.PI);
  box(b, a, Y + ARCH.h - 0.66, ARCH.z - 0.16, c, Y + ARCH.h - 0.6, ARCH.z + 0.16, LED);
}

function cinema(b: Batch) {
  const [x0, z0, x1, z1] = CINEMA.rect;
  const xm = (x0 + x1) / 2;
  const h = CINEMA.h;
  box(b, x0, Y, z0, x1, Y + h, z1, CHARCOAL);
  coping(b, x0, z0, x1, z1, Y + h);
  for (const [ax, az, bx, bz, n] of [
    [x0, z0, x1, z0, NZ],
    [x0, z0, x0, z1, NX],
    [x1, z0, x1, z1, PX],
  ] as const)
    face(b, CLAD_DARK, ax, az, bx, bz, Y, Y + h, n as [number, number]);
  // The front: dark panels either side, the double-height glazed lobby, the canopy over its doors
  face(b, CLAD_DARK, x0, z1, xm - 7, z1, Y, Y + h, PZ);
  face(b, CLAD_DARK, xm + 7, z1, x1, z1, Y, Y + h, PZ);
  face(b, CLAD_DARK, xm - 7, z1, xm + 7, z1, Y + 6.2, Y + h, PZ);
  face(b, CURTAIN, xm - 7, z1, xm + 7, z1, Y, Y + 6.2, PZ);
  for (let x = xm - 7; x <= xm + 7.01; x += 3.5) box(b, x - 0.06, Y, z1, x + 0.06, Y + 6.2, z1 + 0.25, STEEL);
  glassZ(b, z1 + 0.25, 1, xm - 3, xm + 3, Y, Y + 2.6, GLASS);
  // (the canopy: steel, a timber soffit, LED along its edge)
  box(b, xm - 8, Y + 3.9, z1, xm + 8, Y + 4.25, z1 + 3, STEEL);
  under(b, xm - 8, z1, xm + 8, z1 + 3, Y + 3.895, TIMBER);
  box(b, xm - 8, Y + 3.95, z1 + 2.98, xm + 8, Y + 4.05, z1 + 3.03, LED);
  b.detail(() => {
    for (let x = xm - 7; x < xm + 7.5; x += 2) b.add(new THREE.CircleGeometry(0.16, 10).rotateX(Math.PI / 2).translate(x, Y + 3.885, z1 + 1.5), PANEL);
  });
  // The name in lit letters on the band over the glass; NOW SHOWING over the canopy
  sign(b, CINEMA.name, xm, Y + 7.4, z1 + 0.03, 12, 1.1, 0);
  sign(b, 'NOW SHOWING', xm, Y + 4.7, z1 + 0.03, 4.6, 0.55, 0);
  // Poster lightboxes either side of the lobby
  for (let k = 0; k < FILMS.length; k++) {
    const side = k < 3 ? -1 : 1;
    const x = xm + side * (8.4 + (k % 3) * 1.9);
    box(b, x - 0.68, Y + 0.6, z1, x + 0.68, Y + 3.3, z1 + 0.12, STEEL);
    poster(b, k, x, Y + 1.95, z1 + 0.13, 0);
  }
}

/* ---------- Starlight Mall ---------- */

function anchor(b: Batch, k: number) {
  const a = ANCHORS[k];
  const [x0, z0, x1, z1] = a.rect;
  const xm = (x0 + x1) / 2;
  const h = a.h;
  const dark = a.wall === 'dark';
  const clad = dark ? CLAD_DARK : CLAD;
  box(b, x0, Y, z0, x1, Y + h, z1, dark ? CHARCOAL : LIGHT);
  coping(b, x0, z0, x1, z1, Y + h);
  plant(b, xm - 3, (z0 + z1) / 2, Y + h);
  plant(b, xm + 2, z0 + 6, Y + h);
  // The sides: panels all round (above the hall on its inner side), its avenue side with its name
  const outer = k ? x1 : x0;
  const on: [number, number] = k ? PX : NX;
  face(b, clad, outer, z0, outer, z1, Y, Y + h, on);
  face(b, clad, k ? x0 : x1, z0, k ? x0 : x1, z1, Y + HALL.h, Y + h, k ? NX : PX);
  sign(b, a.name, outer + on[0] * 0.03, Y + h - 1.4, (z0 + z1) / 2 + 4, 9, 0.95, on[0] * (Math.PI / 2));
  face(b, CURTAIN, outer, (z0 + z1) / 2 - 8, outer, (z0 + z1) / 2 - 4.8, Y + 0.6, Y + h - 0.8, on, 0.014);
  // The back: panels, the loading dock (two roller doors, bumpers, a canopy)
  face(b, clad, x0, z0, x1, z0, Y, Y + h, NZ);
  for (const dx of [-3.4, 0.6]) {
    box(b, xm + dx, Y, z0 - 0.05, xm + dx + 2.8, Y + 3.2, z0, GREY);
    b.detail(() => {
      for (let y = 0.3; y < 3.1; y += 0.3) box(b, xm + dx, Y + y, z0 - 0.07, xm + dx + 2.8, Y + y + 0.03, z0 - 0.05, MID);
      for (const bx of [xm + dx + 0.2, xm + dx + 2.4]) box(b, bx, Y + 0.6, z0 - 0.25, bx + 0.2, Y + 1.1, z0, DARK);
    });
  }
  box(b, xm - 4, Y + 3.5, z0 - 1.6, xm + 4, Y + 3.7, z0, STEEL);
  // The front
  if (!dark) {
    // Maxwell's: light panels, a glazed ground floor in a black frame, black fins upstairs either side of its name
    face(b, CLAD, x0, z1, x1, z1, Y + 3.9, Y + h, PZ);
    glassZ(b, z1, 1, x0 + 0.5, x1 - 0.5, Y + 0.15, Y + 3.5);
    box(b, x0 + 0.3, Y + 3.5, z1, x1 - 0.3, Y + 3.9, z1 + 0.12, STEEL);
    for (const x of [x0 + 0.3, xm - 3.05, xm + 2.95, x1 - 0.4]) box(b, x, Y, z1, x + 0.1, Y + 3.5, z1 + 0.1, STEEL);
    for (let x = x0 + 0.8; x < x1 - 0.5; x += 0.9) if (Math.abs(x - xm) > 5) box(b, x, Y + 4.2, z1, x + 0.08, Y + h - 0.3, z1 + 0.35, STEEL);
    box(b, xm - 4.8, Y + 4.6, z1, xm + 4.8, Y + 6.4, z1 + 0.1, CHARCOAL);
    sign(b, a.name, xm, Y + 5.5, z1 + 0.11, 8.8, 1.05, 0);
    glassZ(b, z1 + 0.13, 1, xm - 2.8, xm + 2.8, Y, Y + 3.0, GLASS);
    box(b, xm - 3.4, Y + 3.3, z1, xm + 3.4, Y + 3.5, z1 + 1.8, STEEL);
    box(b, xm - 3.4, Y + 3.32, z1 + 1.78, xm + 3.4, Y + 3.38, z1 + 1.82, LED);
  } else {
    // Bright & Co.: dark panels, a double-height glass front in the middle under a timber band, its name on a white panel
    face(b, CLAD_DARK, x0, z1, xm - 4.5, z1, Y, Y + h, PZ);
    face(b, CLAD_DARK, xm + 4.5, z1, x1, z1, Y, Y + h, PZ);
    face(b, CURTAIN, xm - 4.5, z1, xm + 4.5, z1, Y, Y + h - 1.4, PZ);
    face(b, TIMBER, xm - 4.5, z1, xm + 4.5, z1, Y + h - 1.4, Y + h, PZ);
    for (let x = xm - 4.5; x <= xm + 4.51; x += 1.5) box(b, x - 0.05, Y, z1, x + 0.05, Y + h - 1.4, z1 + 0.22, STEEL);
    sign(b, a.name, xm, Y + h - 0.7, z1 + 0.03, 6.4, 0.85, 0);
    for (const sx of [x0 + 0.6, xm + 5.1]) glassZ(b, z1, 1, sx, sx + (xm - 4.5 - x0 - 1.2), Y + 0.15, Y + 3.0);
    glassZ(b, z1 + 0.23, 1, xm - 2.5, xm + 2.5, Y, Y + 3.0, GLASS);
    box(b, xm - 5, Y + 3.4, z1, xm + 5, Y + 3.6, z1 + 2, STEEL);
    under(b, xm - 5, z1, xm + 5, z1 + 2, Y + 3.395, TIMBER);
    box(b, xm - 5, Y + 3.42, z1 + 1.98, xm + 5, Y + 3.48, z1 + 2.02, LED);
  }
}

function hall(b: Batch) {
  const [x0, z0, x1, z1] = HALL.rect;
  const h = HALL.h;
  // Its walls (hollow: mallinside3d.ts draws inside), open at the doors behind the porch, a wall over them
  for (const [a0, c0, a1, c1] of WALLS) box(b, a0, Y, c0, a1, Y + h, c1, LIGHT);
  box(b, DOOR.x0, Y + DOOR.h, z1 - WALL, DOOR.x1, Y + h, z1, LIGHT);
  // The front: clad piers at the ends, the curtain wall between, a floor band across it, a dark band at the top
  const [p0, p1] = [x0 + 2.2, x1 - 2.2];
  face(b, CLAD, x0, z1, p0, z1, Y, Y + h, PZ);
  face(b, CLAD, p1, z1, x1, z1, Y, Y + h, PZ);
  face(b, CURTAIN, p0, z1, DOOR.x0, z1, Y, Y + h - 0.9, PZ);
  face(b, CURTAIN, DOOR.x1, z1, p1, z1, Y, Y + h - 0.9, PZ);
  face(b, CURTAIN, DOOR.x0, z1, DOOR.x1, z1, Y + DOOR.h, Y + h - 0.9, PZ);
  face(b, CLAD_DARK, p0, z1, p1, z1, Y + h - 0.9, Y + h, PZ, 0.02);
  box(b, p0, Y + 3.0, z1, p1, Y + 3.45, z1 + 0.06, LIGHT);
  b.detail(() => {
    for (let x = p0 + 3.2; x < p1 - 0.5; x += 3.2) if (x < DOOR.x0 - 0.2 || x > DOOR.x1 + 0.2) box(b, x - 0.04, Y, z1, x + 0.04, Y + h - 0.9, z1 + 0.22, STEEL);
  });
  // The back: panels, a service door
  face(b, CLAD, x0, z0, x1, z0, Y, Y + h, NZ);
  box(b, (x0 + x1) / 2 - 0.7, Y, z0 - 0.04, (x0 + x1) / 2 + 0.7, Y + 2.3, z0, MID);
  // The roof: a membrane round the skylight's opening, the coping, the plant
  const zc = (z0 + z1) / 2;
  const [vx0, vx1, vz0, vz1] = [x0 + 3.5, x1 - 3.5, zc - 4.2, zc + 4.2];
  const [i0, j0, i1, j1] = [x0 + WALL, z0 + WALL, x1 - WALL, z1 - WALL];
  for (const [a0, c0, a1, c1] of [
    [i0, j0, i1, vz0],
    [i0, vz1, i1, j1],
    [i0, vz0, vx0, vz1],
    [vx1, vz0, i1, vz1],
  ])
    box(b, a0, Y + h - 0.25, c0, a1, Y + h - 0.006, c1, GREY);
  coping(b, x0, z0, x1, z1, Y + h);
  plant(b, x0 + 4, z0 + 2, Y + h);
  plant(b, x1 - 6, z0 + 2, Y + h);
  // The skylight: a glass vault over the opening on a grey curb, black steel ribs over it
  for (const [a0, c0, a1, c1] of [
    [vx0 - 0.5, vz0 - 0.4, vx1 + 0.5, vz0],
    [vx0 - 0.5, vz1, vx1 + 0.5, vz1 + 0.4],
    [vx0 - 0.5, vz0, vx0, vz1],
    [vx1, vz0, vx1 + 0.5, vz1],
  ])
    box(b, a0, Y + h, c0, a1, Y + h + 0.5, c1, GREY);
  const vault = new THREE.CylinderGeometry(4.2, 4.2, vx1 - vx0, 16, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 0.45, 1);
  b.add(vault.translate((x0 + x1) / 2, Y + h + 0.5, zc), GLASS);
  for (let x = vx0; x <= vx1 + 0.01; x += (vx1 - vx0) / 6) {
    const ribs: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) {
      const t = (k / 10) * Math.PI;
      ribs.push(new THREE.Vector3(x, Y + h + 0.5 + Math.sin(t) * 4.2 * 0.45 + 0.03, zc + Math.cos(t) * 4.2));
    }
    b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribs), 12, 0.05, 4, false), STEEL);
  }
  box(b, vx0, Y + h + 0.5 + 4.2 * 0.45, zc - 0.05, vx1, Y + h + 0.5 + 4.2 * 0.45 + 0.08, zc + 0.05, STEEL);
  for (const x of [vx0, vx1]) b.add(new THREE.CircleGeometry(4.2, 16, 0, Math.PI).scale(1, 0.45, 1).rotateY(Math.PI / 2).translate(x, Y + h + 0.5, zc), GLASS);
}

function porch(b: Batch) {
  const [x0, z0, x1, z1] = PORCH.rect;
  const xm = (x0 + x1) / 2;
  // The entrance's feature wall over the porch: dark panels standing proud, the mall's name, its gold star
  const [fx0, fx1] = [x0 - 0.5, x1 + 0.5];
  box(b, fx0, Y + 4.6, z0, fx1, Y + 8, z0 + 0.3, CHARCOAL);
  face(b, CLAD_DARK, fx0, z0 + 0.3, fx1, z0 + 0.3, Y + 4.6, Y + 8, PZ);
  coping(b, fx0, z0, fx1, z0 + 0.3, Y + 8);
  sign(b, MALL_NAME, xm + 0.6, Y + 6.3, z0 + 0.32, 8, 0.95, 0);
  const star = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    const r = k % 2 ? 0.2 : 0.48;
    if (k) star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  b.add(new THREE.ExtrudeGeometry(star, { depth: 0.08, bevelEnabled: false }).translate(xm - 4.3, Y + 6.3, z0 + 0.3), GOLD);
  box(b, fx0, Y + 7.3, z0 + 0.3, fx1, Y + 7.36, z0 + 0.34, LED);
  // The cantilevered canopy: white edges, a timber soffit with downlights, a LED line along its front; two black columns
  box(b, x0 - 1, Y + PORCH.h, z0, x1 + 1, Y + PORCH.h + 0.35, z1, WHITE);
  under(b, x0 - 1, z0, x1 + 1, z1, Y + PORCH.h - 0.005, TIMBER);
  box(b, x0 - 1, Y + PORCH.h + 0.05, z1, x1 + 1, Y + PORCH.h + 0.12, z1 + 0.04, LED);
  for (const x of [x0 + 0.2, x1 - 0.2]) cyl(b, 0.16, PORCH.h, x, Y, z1 - 0.2, STEEL, 12);
  b.detail(() => {
    for (let x = x0; x <= x1; x += 2.5) b.add(new THREE.CircleGeometry(0.14, 10).rotateX(Math.PI / 2).translate(x, Y + PORCH.h - 0.012, (z0 + z1) / 2), PANEL);
  });
  // The doors, open: a black frame, the glass leaves slid aside, ENTRANCE over them
  box(b, DOOR.x0 - 0.15, Y, z0, DOOR.x0, Y + DOOR.h + 0.15, z0 + 0.08, STEEL);
  box(b, DOOR.x1, Y, z0, DOOR.x1 + 0.15, Y + DOOR.h + 0.15, z0 + 0.08, STEEL);
  box(b, DOOR.x0 - 0.15, Y + DOOR.h, z0, DOOR.x1 + 0.15, Y + DOOR.h + 0.15, z0 + 0.08, STEEL);
  for (const [a, c] of [
    [DOOR.x0, DOOR.x0 + 1.1],
    [DOOR.x1 - 1.1, DOOR.x1],
  ])
    b.add(new THREE.PlaneGeometry(c - a, DOOR.h - 0.1).translate((a + c) / 2, Y + DOOR.h / 2, z0 - 0.12), GLASS);
  sign(b, 'ENTRANCE', xm, Y + 3.75, z0 + 0.03, 2.2, 0.42, 0);
  // The bollards across the doors: brushed steel, a LED ring near the top
  for (const [bx, bz] of BOLLARDS) {
    cyl(b, BOLLARD, 0.85, bx, Y, bz, GREY, 12);
    cyl(b, BOLLARD + 0.006, 0.04, bx, Y + 0.72, bz, LED, 12);
  }
}

function forecourt(b: Batch) {
  // Paving along the front and in front of the hall, the planters (their trees are the city's), the pay stations, bike racks
  flat(b, MALL_BLOCK[0], ANCHORS[0].rect[3], MALL_BLOCK[2], MALL_BLOCK[3] - 0.05, Y + 0.006, PAVING, 12);
  flat(b, ANCHORS[0].rect[2], HALL.rect[3], ANCHORS[1].rect[0], ANCHORS[0].rect[3], Y + 0.006, PAVING, 12);
  for (const [x, z] of PLANTERS) planter(b, x, z, Y, PLANTER, 0.55);
  for (const [x, z] of PAY_STATIONS) {
    box(b, x - 0.35, Y, z - 0.25, x + 0.35, Y + 1.6, z + 0.25, STEEL);
    box(b, x - 0.25, Y + 1.05, z + 0.25, x + 0.25, Y + 1.4, z + 0.27, PANEL);
    sign(b, 'P', x, Y + 1.75, z + 0.02, 0.3, 0.3, 0);
    box(b, x - 0.12, Y + 1.6, z - 0.01, x + 0.12, Y + 1.9, z + 0.01, STEEL);
  }
  b.detail(() => {
    for (let i = 0; i < 4; i++) {
      const x = PORCH.rect[0] - 6.5 + i * 0.8;
      const z = MALL_BLOCK[3] - 1.3;
      b.add(new THREE.TorusGeometry(0.32, 0.025, 4, 12, Math.PI).translate(x, Y + 0.02, z), STEEL);
    }
  });
}

function pylon(b: Batch) {
  const { x, z, w, d, h } = PYLON;
  box(b, x - w / 2 - 0.2, Y, z - d / 2 - 0.2, x + w / 2 + 0.2, Y + 0.4, z + d / 2 + 0.2, STONE);
  box(b, x - w / 2, Y + 0.4, z - d / 2, x + w / 2, Y + h, z + d / 2, CHARCOAL);
  for (const s of [-1, 1]) b.add(new THREE.PlaneGeometry(w - 0.2, h - 1.2).rotateY(s === 1 ? 0 : Math.PI).translate(x, Y + 0.4 + (h - 0.4) / 2 + 0.2, z + s * (d / 2 + 0.01)), TOTEM);
  for (const sx of [-1, 1]) box(b, x + sx * (w / 2) - 0.02, Y + 0.4, z - d / 2 - 0.02, x + sx * (w / 2) + 0.02, Y + h, z + d / 2 + 0.02, LED);
  box(b, x - w / 2 - 0.05, Y + h, z - d / 2 - 0.05, x + w / 2 + 0.05, Y + h + 0.12, z + d / 2 + 0.05, MID);
}

function shelter(b: Batch) {
  const [x0, z0, x1, z1] = SHELTER;
  // A black steel frame, glass back and roof, a timber bench, a lit ad panel at its end, the BUS sign on a post
  for (const x of [x0, x1 - 0.08]) box(b, x, Y, z0, x + 0.08, Y + 2.3, z1, STEEL);
  b.add(new THREE.PlaneGeometry(x1 - x0, 2.1).translate((x0 + x1) / 2, Y + 1.1, z0 + 0.04), GLASS);
  box(b, x0 - 0.1, Y + 2.3, z0 - 0.1, x1 + 0.1, Y + 2.38, z1 + 0.15, STEEL);
  box(b, x0 + 0.2, Y + 0.42, z0 + 0.1, x1 - 0.2, Y + 0.48, z0 + 0.5, WOOD);
  box(b, x1 - 0.06, Y + 0.3, z0 + 0.1, x1 - 0.02, Y + 2.1, z1 - 0.1, PANEL);
  box(b, x1 + 0.3, Y, z1 - 0.05, x1 + 0.38, Y + 2.5, z1 + 0.03, STEEL);
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
    // A dashed white centre line round it (two-way)
    for (let x = xw + 1; x < xE - half - 0.4; x += 1.3) for (const z of [zN, zS]) if (Math.abs(x - LOOP_ZEBRA.x) > LOOP_ZEBRA.half + 0.4) box(b, x, PAINT_Y - 0.002, z - 0.04, x + 0.6, PAINT_Y, z + 0.04, PAINT);
    for (let z = zN + half + 0.6; z < zS - half - 0.4; z += 1.3) box(b, xE - 0.04, PAINT_Y - 0.002, z, xE + 0.04, PAINT_Y, z + 0.6, PAINT);
    // The zebras: over the north avenue from Palm Court's passage, and over the loop from the car park to the porch
    for (let x = NS0.c - NS0.half + 0.3; x < NS0.c + NS0.half - 0.2; x += 0.85) b.add(new THREE.PlaneGeometry(0.45, ZEBRA.half * 2).rotateX(-Math.PI / 2).translate(x + 0.22, PAINT_Y, ZEBRA.z), PAINT);
    for (let z = zN - half + 0.2; z < zN + half - 0.2; z += 0.85) b.add(new THREE.PlaneGeometry(LOOP_ZEBRA.half * 2, 0.45).rotateX(-Math.PI / 2).translate(LOOP_ZEBRA.x, PAINT_Y, z + 0.22), PAINT);
  });
}

function carPark(b: Batch, x0: number, x1: number) {
  // Asphalt over the car park in this stretch, the bays' lines, the islands (a kerb, planting, a trolley shelter on some)
  const [, cz0, , cz1] = [0, BAYS[0].z - BAY.d / 2 - 0.4, 0, BAYS[BAYS.length - 1].z + BAY.d / 2 + 0.4];
  flat(b, x0, cz0, x1, cz1, Y + 0.006, ASPHALT, 12);
  b.detail(() => {
    for (const bay of BAYS) {
      if (bay.x < x0 || bay.x >= x1) continue;
      for (const s of [-1, 1]) b.add(new THREE.PlaneGeometry(0.08, BAY.d).rotateX(-Math.PI / 2).translate(bay.x + (s * BAY.w) / 2, Y + 0.012, bay.z), PAINT);
    }
  });
  ISLANDS.forEach(([ix0, iz0, ix1, iz1], i) => {
    const xm = (ix0 + ix1) / 2;
    if (xm < x0 || xm >= x1) return;
    box(b, ix0, Y, iz0, ix1, Y + 0.22, iz1, CONCRETE);
    b.add(new THREE.PlaneGeometry(ix1 - ix0 - 0.3, iz1 - iz0 - 0.3).rotateX(-Math.PI / 2).translate(xm, Y + 0.225, (iz0 + iz1) / 2), LAWN);
    // (a bed of shrubs along its middle, mulch under them)
    b.add(new THREE.PlaneGeometry(Math.min(1.2, ix1 - ix0 - 0.8), iz1 - iz0 - 1.2).rotateX(-Math.PI / 2).translate(xm, Y + 0.23, (iz0 + iz1) / 2), SOIL);
    b.detail(() => {
      for (let z = iz0 + 0.8; z < iz1 - 0.5; z += 0.7) b.add(new THREE.IcosahedronGeometry(0.28, 0).scale(1, 0.7, 1).translate(xm + (Math.round(z / 0.7) % 2 ? 0.22 : -0.22), Y + 0.33, z), SHRUB);
      if (i % 3 === 1) {
        // a trolley shelter: a steel frame, a glass roof, the trolleys
        const z = (iz0 + iz1) / 2 + 2.2;
        for (const dx of [-0.6, 0.6]) box(b, xm + dx - 0.04, Y + 0.22, z - 1, xm + dx + 0.04, Y + 2, z - 0.92, STEEL);
        box(b, xm - 0.7, Y + 2, z - 1.2, xm + 0.7, Y + 2.06, z + 1.2, STEEL);
        b.add(new THREE.PlaneGeometry(1.4, 2.4).rotateX(-Math.PI / 2).translate(xm, Y + 2.07, z), GLASS);
        for (let t = 0; t < 4; t++) box(b, xm - 0.3, Y + 0.3, z - 0.6 + t * 0.35, xm + 0.3, Y + 1.0, z - 0.45 + t * 0.35, GREY);
      }
    });
  });
  // The rank's board by its bays
  const cab = RANK_CABS.find((c) => c.x >= x0 && c.x < x1);
  if (cab) {
    const [rx, rz] = [Math.min(...RANK_CABS.map((c) => c.x)) - BAY.w / 2 - 0.3, cab.z - BAY.d / 2 - 0.2];
    box(b, rx - 0.05, Y, rz - 0.05, rx + 0.05, Y + 2.4, rz + 0.05, STEEL);
    sign(b, 'TAXI', rx, Y + 2.25, rz - 0.06, 1, 0.25, Math.PI);
    sign(b, 'TAXI', rx, Y + 2.25, rz + 0.06, 1, 0.25, 0);
  }
}

function multiStorey(b: Batch) {
  const [x0, z0, x1, z1] = MSCP.rect;
  const { deck, decks } = MSCP;
  const top = Y + deck * (decks + 1);
  // Its decks on columns, a barrier round the roof, perforated metal screens in panels round each level
  for (let d = 1; d <= decks + 1; d++) box(b, x0, Y + d * deck - 0.3, z0, x1, Y + d * deck, z1, CONCRETE);
  box(b, x0, top, z0, x1, top + 0.9, z0 + 0.12, MID);
  box(b, x0, top, z1 - 0.12, x1, top + 0.9, z1, MID);
  box(b, x0, top, z0, x0 + 0.12, top + 0.9, z1, MID);
  box(b, x1 - 0.12, top, z0, x1, top + 0.9, z1, MID);
  for (let x = x0 + 0.2; x < x1; x += (x1 - x0 - 0.6) / 3) for (let z = z0 + 0.2; z < z1; z += (z1 - z0 - 0.6) / 5) box(b, x, Y, z, x + 0.4, top - 0.3, z + 0.4, CONCRETE);
  for (let d = 0; d <= decks; d++) {
    const [ya, yb] = [Y + d * deck + 0.5, Y + (d + 1) * deck - 0.35];
    for (let x = x0 + 0.4; x + 2.4 < x1; x += 3.4) {
      face(b, PERF, x, z1, x + 2.4, z1, ya, yb, PZ, 0.2);
      face(b, PERF, x, z0, x + 2.4, z0, ya, yb, NZ, 0.2);
    }
    for (let z = z0 + 0.4; z + 2.4 < z1; z += 3.4) {
      face(b, PERF, x1, z, x1, z + 2.4, ya, yb, PX, 0.2);
      if (z < z1 - 3.4) face(b, PERF, x0, z, x0, z + 2.4, ya, yb, NX, 0.2);
    }
  }
  // The stair and lift core, glazed, the P sign on it
  const [cx0, cz0, cx1, cz1] = [x0 - 0.3, z1 - 3.2, x0 + 2.4, z1 - 0.2];
  box(b, cx0, Y, cz0, cx1, top + 1.4, cz1, CHARCOAL);
  face(b, CURTAIN, cx0, cz1, cx1, cz1, Y, top + 1.4, PZ);
  face(b, CURTAIN, cx0, cz0, cx0, cz1, Y, top + 1.4, NX);
  coping(b, cx0, cz0, cx1, cz1, top + 1.4);
  box(b, cx0 - 0.04, top + 0.1, cz0 + 0.4, cx0, top + 1.2, cz1 - 0.4, STEEL);
  sign(b, 'P', cx0 - 0.05, top + 0.65, (cz0 + cz1) / 2, 1, 1, -Math.PI / 2);
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
  // Palm Court: the cinema, the rows in stretches, the water feature and the gateway
  site('mall cinema', [CINEMA.rect[0] - 1, CINEMA.rect[1] - 1, CINEMA.rect[2] + 1, CINEMA.rect[3] + 3], build(cinema));
  for (let z = CINEMA.rect[3]; z < COURT[3]; z += 24) {
    const z1 = Math.min(COURT[3], z + 24);
    site(`mall court ${Math.round(z)}`, [COURT[0], z, COURT[2], z1], build((b) => court(b, z, z1)));
  }
  site('mall fountain', [FOUNTAIN.x - 4, FOUNTAIN.z - 5, FOUNTAIN.x + 4, FOUNTAIN.z + 5], build(centre));
  site('mall arch', [PROM[0], ARCH.z - 1, PROM[1], ARCH.z + 1], build(arch));
  // Starlight Mall: each anchor, the hall, the porch, the forecourt, the totem and the shelter
  ANCHORS.forEach((a, k) => site(`mall anchor ${k}`, [a.rect[0] - 0.5, a.rect[1] - 2, a.rect[2] + 0.5, a.rect[3] + 2], build((b) => anchor(b, k))));
  // (its shell casts no shadow: inside, the day comes in as through the skylight)
  site('mall hall', [HALL.rect[0], HALL.rect[1], HALL.rect[2], HALL.rect[3] + 0.5], build(hall, false));
  site('mall porch', [PORCH.rect[0], PORCH.rect[1], PORCH.rect[2], PORCH.rect[3]], build((b) => (porch(b), pylon(b), shelter(b))));
  site('mall forecourt', [MALL_BLOCK[0], HALL.rect[3], MALL_BLOCK[2], MALL_BLOCK[3]], build(forecourt, false));
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
