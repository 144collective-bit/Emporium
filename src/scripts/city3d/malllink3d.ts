/*
 * Starlight Mall's Skywalk on screen (docs/mall-plan.md, "One mall", Phase 1; the numbers are malllink.ts), in the
 * mall's chunk (mall3d.ts calls `registerLink()`). The mall's own look (mallkit.ts): glass curtain walls in black
 * steel, dark cladding bands, white slabs with timber soffits, pale stone floors, warm white light.
 *
 * - **Outside** (sites, seen from afar): the bridge's slab over the avenue with its lit soffit, the long glazed
 *   faces of the bridge and the pavilion as one, a portal in each for the el, dark bands at the floors and the top,
 *   one roof over both with a glass barrel vault on black ribs, the pavilion's front on the promenade (its doors
 *   under a timber canopy, the mall's name and its gold star on a dark band), its door on the avenue's sidewalk.
 * - **Inside** (sites, near only, no shadows): the floors and their slabs, timber soffits with slots of light, glass
 *   balustrades on the edges, the platform screen along the track, the escalators (their steps run with the hall's:
 *   mallinside3d.ts), the corridor through Bright & Co. between its windows, the column round the el's pillar, the
 *   benches, the trees, the coffee kiosk, the board on the platform floor (coming soon), the signs.
 */
import * as THREE from 'three';
import type { Batch } from './kit';
import { site } from './tilework';
import { ANCHORS, MALL_NAME, PAVILION } from './mall';
import { CORRIDOR_IN, CORRIDOR_Z } from './mallinside';
import {
  BALUSTRADE,
  BENCHES,
  BOARD,
  COLUMNS,
  COLUMN_R,
  COMB,
  CORRIDOR_H,
  DOOR_H,
  ESC_G,
  FLIGHTS,
  KIOSK,
  L1,
  L1_T,
  L2,
  L2_T,
  LINK,
  MEZZ_L1,
  MEZZ_L2,
  PAV_DOORS,
  PAV_IN,
  PLANTERS,
  PLATFORM_BENCHES,
  ROOF,
  SCREEN_X,
  SKIN,
  TRACK,
  VAULT,
  type Flight,
} from './malllink';
import { STEPS_DOWN, STEPS_UP } from './mallinside3d';
import { CHARCOAL, CLAD, CLAD_DARK, CURTAIN, DARK, FLOOR, GLASS, GOLD, GREY, LED, LIGHT, MID, PANEL, STEEL, STONE, TIMBER, WHITE, WOOD, Y, box, cyl, face, flat, glassX, glassZ, tree, type Sign } from './mallkit';

const PX: [number, number] = [1, 0];
const NX: [number, number] = [-1, 0];
const PZ: [number, number] = [0, 1];
const NZ: [number, number] = [0, -1];
const [X0, Z0, , Z1] = LINK;
/** The bridge and the pavilion as one, east to the promenade */
const X1 = PAVILION[2];
const ZM = (Z0 + Z1) / 2;
/** The el's portal in each glazed end: round the deck and a train on it */
const PORTAL = { x0: TRACK[0] - 0.35, x1: TRACK[1] + 0.35, y0: L2 - 0.75, y1: L2 + 2.4 };
/** The bands: the lower floor's slab's edge, and the parapet's at the top */
const BAND_LOW = L1 - L1_T - 0.1;
const BAND_TOP = ROOF - 0.7;
/** The barrel vault over the middle of the roof (its half width along z) */
const VR = 2.8;

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
/** A slot of light in a ceiling */
const slot = (b: Batch, x0: number, z0: number, x1: number, z1: number, y: number) => b.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2), PANEL);
/** The mall's gold star, flat on a wall facing +x at x */
function star(b: Batch, x: number, y: number, z: number, r: number) {
  const s = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    const rr = k % 2 ? r * 0.42 : r;
    if (k) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  b.add(new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false }).rotateY(Math.PI / 2).translate(x, y, z), GOLD);
}

/* ---------- Outside ---------- */

/** One glazed end (z, facing): the pavilion's clad storey at street level, the bands, the curtain wall round the el's portal */
function end(b: Batch, z: number, n: [number, number]) {
  const [p0, p1] = [PAVILION[0], PAVILION[2]];
  // The pavilion's street storey: cladding, a long window in a black frame
  face(b, CLAD, p0, z, p1, z, Y, BAND_LOW, n);
  glassZ(b, z, n[1] as 1 | -1, p0 + 1.2, p1 - 1.2, Y + 0.5, Y + 2.3);
  box(b, p0 + 1.1, Y + 2.3, Math.min(z, z + n[1] * 0.1), p1 - 1.1, Y + 2.42, Math.max(z, z + n[1] * 0.1), STEEL);
  // The bands, and the curtain wall between them round the portal
  face(b, CLAD_DARK, X0, z, X1, z, BAND_LOW, L1 + 0.15, n, 0.02);
  face(b, CLAD_DARK, X0, z, X1, z, BAND_TOP, ROOF, n, 0.02);
  face(b, CURTAIN, X0, z, PORTAL.x0, z, L1 + 0.15, BAND_TOP, n);
  face(b, CURTAIN, PORTAL.x1, z, X1, z, L1 + 0.15, BAND_TOP, n);
  face(b, CURTAIN, PORTAL.x0, z, PORTAL.x1, z, L1 + 0.15, PORTAL.y0, n);
  face(b, CLAD_DARK, PORTAL.x0, z, PORTAL.x1, z, PORTAL.y1, BAND_TOP, n, 0.02);
  // The portal's black steel frame, standing proud
  const out = (a: number, c: number) => [Math.min(z + n[1] * a, z + n[1] * c), Math.max(z + n[1] * a, z + n[1] * c)];
  const [fa, fb] = out(-0.1, 0.18);
  box(b, PORTAL.x0 - 0.18, PORTAL.y0, fa, PORTAL.x0, PORTAL.y1 + 0.18, fb, STEEL);
  box(b, PORTAL.x1, PORTAL.y0, fa, PORTAL.x1 + 0.18, PORTAL.y1 + 0.18, fb, STEEL);
  box(b, PORTAL.x0 - 0.18, PORTAL.y1, fa, PORTAL.x1 + 0.18, PORTAL.y1 + 0.18, fb, STEEL);
  // A floor band where the platform floor meets the glass (east of the track), the mullions standing out (near only)
  box(b, PORTAL.x1, L2 - L2_T, fa, X1, L2, fb, CHARCOAL);
  b.detail(() => {
    const [ma, mb] = out(0, 0.16);
    for (let x = X0 + 1.5; x < X1 - 0.3; x += 1.5) if (x < PORTAL.x0 - 0.3 || x > PORTAL.x1 + 0.3) box(b, x - 0.04, L1 + 0.15, ma, x + 0.04, BAND_TOP, mb, STEEL);
  });
}

function shell(b: Batch) {
  // The bridge's slab over the avenue, its soffit lit (slots of light, near only), the lower floor's mezzanine's
  box(b, X0, L1 - L1_T, Z0, LINK[2], L1, Z1, LIGHT);
  under(b, X0 + 0.2, Z0 + 0.2, LINK[2] - 0.2, Z1 - 0.2, L1 - L1_T - 0.006, CLAD);
  b.detail(() => {
    for (let x = X0 + 1.4; x < LINK[2] - 1; x += 2.6) slot(b, x, Z0 + 1.2, x + 0.14, Z1 - 1.2, L1 - L1_T - 0.012);
  });
  // The glazed ends, north and south
  end(b, Z0, NZ);
  end(b, Z1, PZ);
  // The pavilion's front on the promenade: clad piers at the corners, its doors under a timber canopy at street level,
  // the curtain wall over three storeys, the mall's name and star on a dark band at the top
  const x = X1;
  face(b, CLAD, x, Z0, x, Z0 + 1.0, Y, ROOF, PX);
  face(b, CLAD, x, Z1 - 1.0, x, Z1, Y, ROOF, PX);
  const doors = PAV_DOORS.filter((d) => d.x === x).sort((a, c) => a.z0 - c.z0);
  let at = Z0 + 1.0;
  for (const d of doors) {
    glassX(b, x, 1, at + 0.1, d.z0 - 0.1, Y + 0.1, Y + DOOR_H);
    at = d.z1;
  }
  glassX(b, x, 1, at + 0.1, Z1 - 1.1, Y + 0.1, Y + DOOR_H);
  for (const d of doors) {
    // (the doorway: a black frame, open; a canopy over it with a timber soffit and a LED edge)
    box(b, x - 0.05, Y, d.z0 - 0.1, x + 0.12, Y + DOOR_H + 0.1, d.z0, STEEL);
    box(b, x - 0.05, Y, d.z1, x + 0.12, Y + DOOR_H + 0.1, d.z1 + 0.1, STEEL);
    box(b, x - 0.05, Y + DOOR_H, d.z0, x + 0.12, Y + DOOR_H + 0.1, d.z1, STEEL);
    box(b, x, Y + DOOR_H + 0.15, d.z0 - 0.6, x + 1.6, Y + DOOR_H + 0.35, d.z1 + 0.6, STEEL);
    under(b, x + 0.02, d.z0 - 0.58, x + 1.58, d.z1 + 0.58, Y + DOOR_H + 0.145, TIMBER);
    box(b, x + 1.58, Y + DOOR_H + 0.18, d.z0 - 0.6, x + 1.63, Y + DOOR_H + 0.24, d.z1 + 0.6, LED);
  }
  face(b, CLAD_DARK, x, Z0 + 1.0, x, Z1 - 1.0, Y + DOOR_H + 0.1, L1 + 0.15, PX, 0.02);
  face(b, CURTAIN, x, Z0 + 1.0, x, Z1 - 1.0, L1 + 0.15, BAND_TOP - 0.9, PX);
  face(b, CLAD_DARK, x, Z0 + 1.0, x, Z1 - 1.0, BAND_TOP - 0.9, ROOF, PX, 0.02);
  sign(b, MALL_NAME, x + 0.04, BAND_TOP - 0.05, ZM + 0.9, 7.2, 0.8, Math.PI / 2);
  star(b, x + 0.03, BAND_TOP - 0.05, ZM - 3.8, 0.55);
  b.detail(() => {
    for (let z = Z0 + 2.4; z < Z1 - 1.2; z += 1.5) box(b, x, L1 + 0.15, z - 0.04, x + 0.16, BAND_TOP - 0.9, z + 0.04, STEEL);
  });
  // Its door on the avenue's sidewalk (street level: over it the bridge runs in), cladding and a window either side
  const w = PAVILION[0];
  const wd = PAV_DOORS.find((d) => d.x === w)!;
  face(b, CLAD, w, Z0, w, wd.z0 - 0.1, Y, BAND_LOW, NX);
  face(b, CLAD, w, wd.z1 + 0.1, w, Z1, Y, BAND_LOW, NX);
  face(b, CLAD, w, wd.z0 - 0.1, w, wd.z1 + 0.1, Y + DOOR_H + 0.1, BAND_LOW, NX);
  glassX(b, w, -1, wd.z1 + 0.6, Z1 - 0.8, Y + 0.5, Y + 2.3);
  box(b, w - 0.12, Y, wd.z0 - 0.1, w + 0.05, Y + DOOR_H + 0.1, wd.z0, STEEL);
  box(b, w - 0.12, Y, wd.z1, w + 0.05, Y + DOOR_H + 0.1, wd.z1 + 0.1, STEEL);
  box(b, w - 0.12, Y + DOOR_H, wd.z0, w + 0.05, Y + DOOR_H + 0.1, wd.z1, STEEL);
  // (its name beside the door: over it the bridge's slab comes down to the door's head)
  sign(b, MALL_NAME, w - 0.03, Y + 2.3, (Z0 + wd.z0) / 2, 1.5, 0.22, -Math.PI / 2);
  // The pavilion's walls' tops and the slab over the street storey (seen through the glass)
  box(b, PAVILION[0], L1 - L1_T, Z0, PAVILION[0] + SKIN, BAND_LOW, Z1, CLAD);
}

function roof(b: Batch) {
  // One roof over both: a membrane round the vault's opening, the coping, the plant; the vault on its curb, black ribs
  const [x0, x1] = [X0, X1];
  const [vx0, vx1, vz0, vz1] = [x0 + 0.8, x1 - 1.6, ZM - VR, ZM + VR];
  for (const [a0, c0, a1, c1] of [
    [x0, Z0, x1, vz0],
    [x0, vz1, x1, Z1],
    [x0, vz0, vx0, vz1],
    [vx1, vz0, x1, vz1],
  ])
    box(b, a0, ROOF - 0.4, c0, a1, ROOF - 0.006, c1, GREY);
  for (const [a0, c0, a1, c1] of [
    [x0 + 0.04, Z0 - 0.04, x1 + 0.04, Z0 + 0.25],
    [x0 + 0.04, Z1 - 0.25, x1 + 0.04, Z1 + 0.04],
    [x1 - 0.25, Z0 + 0.25, x1 + 0.04, Z1 - 0.25],
  ])
    box(b, a0, ROOF, c0, a1, ROOF + 0.12, c1, MID);
  for (const [a0, c0, a1, c1] of [
    [vx0 - 0.4, vz0 - 0.3, vx1 + 0.4, vz0],
    [vx0 - 0.4, vz1, vx1 + 0.4, vz1 + 0.3],
    [vx0 - 0.4, vz0, vx0, vz1],
    [vx1, vz0, vx1 + 0.4, vz1],
  ])
    box(b, a0, ROOF - 0.006, c0, a1, ROOF + 0.12, c1, GREY);
  const k = VAULT / VR;
  const vault = new THREE.CylinderGeometry(VR, VR, vx1 - vx0, 18, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).scale(1, k, 1);
  b.add(vault.translate((vx0 + vx1) / 2, ROOF + 0.12, ZM), GLASS);
  for (const x of [vx0, vx1]) b.add(new THREE.CircleGeometry(VR, 18, 0, Math.PI).scale(1, k, 1).rotateY(Math.PI / 2).translate(x, ROOF + 0.12, ZM), GLASS);
  b.detail(() => {
    for (let x = vx0; x <= vx1 + 0.01; x += (vx1 - vx0) / 9) {
      const ribs: THREE.Vector3[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = (i / 10) * Math.PI;
        ribs.push(new THREE.Vector3(x, ROOF + 0.12 + Math.sin(t) * VAULT + 0.02, ZM + Math.cos(t) * VR));
      }
      b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribs), 10, 0.04, 4, false), STEEL);
    }
    box(b, vx0, ROOF + 0.12 + VAULT, ZM - 0.04, vx1, ROOF + 0.12 + VAULT + 0.06, ZM + 0.04, STEEL);
    // (rooftop plant over the pavilion's corners, clear of the vault)
    for (const z of [Z0 + 1.1, Z1 - 1.1]) {
      box(b, x1 - 3.4, ROOF, z - 0.5, x1 - 1.6, ROOF + 0.8, z + 0.5, GREY);
      cyl(b, 0.3, 0.02, x1 - 2.5, ROOF + 0.8, z, STEEL, 12);
    }
  });
}

/* ---------- Inside (near only) ---------- */

/** A glass balustrade along a line at floor height y (along x or z), a steel rail on top, posts */
function balustrade(b: Batch, x0: number, z0: number, x1: number, z1: number, y: number) {
  const along = x1 - x0 !== 0;
  const len = Math.hypot(x1 - x0, z1 - z0);
  if (len < 0.05) return;
  const g = new THREE.PlaneGeometry(len, 0.9);
  if (!along) g.rotateY(Math.PI / 2);
  b.add(g.translate((x0 + x1) / 2, y + 0.5, (z0 + z1) / 2), GLASS);
  if (along) box(b, x0, y + 0.95, z0 - 0.035, x1, y + 1.0, z0 + 0.035, STEEL);
  else box(b, x0 - 0.035, y + 0.95, z0, x0 + 0.035, y + 1.0, z1, STEEL);
  const n = Math.max(1, Math.round(len / 1.6));
  for (let i = 0; i <= n; i++) {
    const [x, z] = [x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n];
    box(b, x - 0.025, y, z - 0.025, x + 0.025, y + 0.96, z + 0.025, STEEL);
  }
}

function floors(b: Batch) {
  const [s0, s1] = [Z0 + SKIN, Z1 - SKIN];
  // The lower floor: the corridor (from the hall's strip), the bridge, the pavilion's north mezzanine; its slab there
  flat(b, CORRIDOR_IN[0], CORRIDOR_Z[0], X0, CORRIDOR_Z[1], L1 + 0.006, FLOOR, 8);
  flat(b, X0, s0, LINK[2], s1, L1 + 0.006, FLOOR, 8);
  box(b, MEZZ_L1[0], L1 - L1_T, MEZZ_L1[1], MEZZ_L1[2], L1, MEZZ_L1[3], WHITE);
  flat(b, MEZZ_L1[0], MEZZ_L1[1], MEZZ_L1[2], MEZZ_L1[3], L1 + 0.006, FLOOR, 8);
  // The pavilion's street floor (over Palm Court's paving)
  flat(b, PAV_IN[0], PAV_IN[1], PAV_IN[2], PAV_IN[3], Y + 0.012, FLOOR, 8);
  // The platform floor: along the track, the south mezzanine; their slabs
  for (const [x0, z0, x1, z1] of [
    [SCREEN_X, s0, LINK[2], s1],
    [MEZZ_L2[0], MEZZ_L2[1], MEZZ_L2[2], MEZZ_L2[3]],
  ]) {
    box(b, x0, L2 - L2_T, z0, x1, L2, z1, WHITE);
    flat(b, x0, z0, x1, z1, L2 + 0.006, FLOOR, 8);
    under(b, x0 + 0.2, z0 + 0.2, x1 - 0.2, z1 - 0.2, L2 - L2_T - 0.006, TIMBER);
    for (let z = z0 + 1; z < z1 - 0.8; z += 2.2) slot(b, x0 + 0.5, z, x1 - 0.5, z + 0.12, L2 - L2_T - 0.012);
  }
  under(b, MEZZ_L1[0] + 0.2, MEZZ_L1[1] + 0.2, MEZZ_L1[2] - 0.2, MEZZ_L1[3] - 0.2, L1 - L1_T - 0.006, TIMBER);
  for (let x = MEZZ_L1[0] + 1; x < MEZZ_L1[2] - 0.8; x += 2.2) slot(b, x, MEZZ_L1[1] + 0.6, x + 0.12, MEZZ_L1[3] - 0.6, L1 - L1_T - 0.012);
  // The roof's underside: white, light panels either side of the vault
  under(b, X0, Z0, X1, ZM - VR, ROOF - 0.406, WHITE);
  under(b, X0, ZM + VR, X1, Z1, ROOF - 0.406, WHITE);
  for (let x = X0 + 1.2; x < X1 - 1; x += 3) {
    slot(b, x, Z0 + 0.8, x + 1.4, ZM - VR - 0.6, ROOF - 0.412);
    slot(b, x, ZM + VR + 0.6, x + 1.4, Z1 - 0.8, ROOF - 0.412);
  }
  // A warm LED line along the slabs' edges over the atrium
  const e1 = L1 - 0.16;
  box(b, MEZZ_L1[0], e1, MEZZ_L1[3], MEZZ_L1[2], e1 + 0.05, MEZZ_L1[3] + 0.03, LED);
  box(b, MEZZ_L2[0], L2 - 0.16, MEZZ_L2[1] - 0.03, MEZZ_L2[2], L2 - 0.11, MEZZ_L2[1], LED);
  // The glass inside the ends (their curtain walls are one-sided: this is what you see from in here)
  for (const z of [Z0 + 0.03, Z1 - 0.03]) {
    for (const [x0, x1] of [
      [X0, PORTAL.x0],
      [PORTAL.x1, X1 - SKIN],
    ])
      b.add(new THREE.PlaneGeometry(x1 - x0, BAND_TOP - L1 - 0.15).translate((x0 + x1) / 2, (L1 + 0.15 + BAND_TOP) / 2, z), GLASS);
  }
  b.add(new THREE.PlaneGeometry(Z1 - Z0 - 2, BAND_TOP - 0.9 - L1).rotateY(Math.PI / 2).translate(X1 - 0.03, (BAND_TOP - 0.9 + L1) / 2, ZM), GLASS);
  // The pavilion's walls inside at street level (the outside's faces are one-sided): white, the doorways left open
  const low = L1 - L1_T;
  box(b, PAV_IN[0], Y, PAV_IN[1] - 0.02, PAV_IN[2], low, PAV_IN[1], WHITE);
  box(b, PAV_IN[0], Y, PAV_IN[3], PAV_IN[2], low, PAV_IN[3] + 0.02, WHITE);
  for (const [x, f] of [
    [PAV_IN[0], -1],
    [PAV_IN[2], 1],
  ] as const) {
    const [a, c] = [Math.min(x, x + f * 0.02), Math.max(x, x + f * 0.02)];
    box(b, a, Y + DOOR_H + 0.1, PAV_IN[1], c, low, PAV_IN[3], WHITE);
    let at = PAV_IN[1];
    for (const d of PAV_DOORS.filter((q) => Math.abs(q.x - x) < SKIN + 0.01).sort((p, q) => p.z0 - q.z0)) {
      box(b, a, Y, at, c, Y + DOOR_H + 0.1, d.z0, WHITE);
      at = d.z1;
    }
    box(b, a, Y, at, c, Y + DOOR_H + 0.1, PAV_IN[3], WHITE);
  }
}

function edges(b: Batch) {
  const [s0, s1] = [Z0 + SKIN, Z1 - SKIN];
  // The lower floor: the bridge's east edge over the atrium, the north mezzanine's edge (round the escalators)
  balustrade(b, LINK[2], MEZZ_L1[3], LINK[2], s1, L1);
  const [g0, g1] = [ESC_G.stairs[0].x0 - BALUSTRADE, ESC_G.stairs[1].x1 + BALUSTRADE];
  const up = FLIGHTS[1];
  const [u0, u1] = [up.stairs[0].x0 - BALUSTRADE, up.stairs[1].x1 + BALUSTRADE];
  for (const [x0, x1] of [
    [LINK[2], g0],
    [g1, u0],
    [u1, PAV_IN[2]],
  ])
    balustrade(b, x0, MEZZ_L1[3], x1, MEZZ_L1[3], L1);
  // The platform floor: along the track a glass screen (taller), the strip's edge over the atrium, the south mezzanine's
  const sx = SCREEN_X - 0.04;
  b.add(new THREE.PlaneGeometry(s1 - s0, 2.1).rotateY(Math.PI / 2).translate(sx, L2 + 1.1, ZM), GLASS);
  box(b, sx - 0.04, L2 + 2.15, s0, sx + 0.04, L2 + 2.25, s1, STEEL);
  box(b, sx - 0.03, L2 + 2.1, s0, sx + 0.03, L2 + 2.14, s1, LED);
  for (let z = s0; z <= s1 + 0.01; z += (s1 - s0) / 8) box(b, sx - 0.04, L2, z - 0.04, sx + 0.04, L2 + 2.2, z + 0.04, STEEL);
  balustrade(b, LINK[2], s0, LINK[2], MEZZ_L2[1], L2);
  balustrade(b, LINK[2], MEZZ_L2[1], u0, MEZZ_L2[1], L2);
  balustrade(b, u1, MEZZ_L2[1], PAV_IN[2], MEZZ_L2[1], L2);
}

/** A flight's side from the shape (u along it from its comb, v up), `w` thick from x */
function side(b: Batch, f: Flight, pts: [number, number][], x: number, w: number, mat: THREE.Material) {
  const s = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)));
  const comb = f.foot - f.rise * COMB;
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
  // (u runs the way it rises: north turned a quarter one way, south the other)
  if (f.rise === -1) b.add(g.rotateY(Math.PI / 2).translate(x, f.y0, comb), mat);
  else b.add(g.rotateY(-Math.PI / 2).translate(x + w, f.y0, comb), mat);
}
function escalator(b: Batch, f: Flight) {
  const comb = f.foot - f.rise * COMB;
  const L = Math.abs(f.land - comb);
  const H = f.y1 - f.y0;
  const zAt = (u: number) => comb + f.rise * u;
  const line = (lift: number): [number, number][] => [
    [0, lift],
    [COMB, lift],
    [COMB + f.run, H + lift],
    [L, H + lift],
  ];
  const [a, c] = f.stairs;
  // The trusses: down to the floor on the street; a deep band under the steps where it spans the atrium
  const onFloor = f === ESC_G;
  const truss: [number, number][] = onFloor ? [[0, 0], [L, 0], ...line(0.15).reverse()] : [...line(-0.9), ...line(0.15).reverse()];
  for (const [x0, x1, k] of [
    [a.x0 - BALUSTRADE, a.x0, 0],
    [a.x1, c.x0, 1],
    [c.x1, c.x1 + BALUSTRADE, 2],
  ] as const) {
    side(b, f, truss, x0, x1 - x0, k === 1 ? LIGHT : GREY);
    side(b, f, [...line(0.15), ...line(1.0).reverse()], (x0 + x1) / 2 - 0.02, 0.04, GLASS);
  }
  // (under a spanning flight, its soffit across the three)
  if (!onFloor) side(b, f, [...line(-0.9), ...line(-0.86).reverse()], a.x0 - BALUSTRADE, c.x1 - a.x0 + 2 * BALUSTRADE, LIGHT);
  for (const e of f.stairs) {
    const pts = line(0.01);
    const pos: number[] = [];
    const uv: number[] = [];
    let dist = 0;
    pts.forEach(([u, v], i) => {
      if (i) dist += Math.hypot(u - pts[i - 1][0], v - pts[i - 1][1]);
      for (const x of [e.x0, e.x1]) {
        pos.push(x, f.y0 + v, zAt(u));
        uv.push(x === e.x0 ? 0 : 1, dist / 0.4);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const idx: number[] = [];
    // (wound to face up whichever way it rises)
    for (let i = 0; i < pts.length - 1; i++) idx.push(...(f.rise === -1 ? [i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2] : [i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3]));
    g.setIndex(idx);
    g.computeVertexNormals();
    b.add(g, e.dir === 1 ? STEPS_UP : STEPS_DOWN);
    for (const hx of [e.x0 + 0.04, e.x1 - 0.04]) {
      const rail = line(1.02);
      for (let i = 0; i < rail.length - 1; i++) {
        const p0 = new THREE.Vector3(hx, f.y0 + rail[i][1], zAt(rail[i][0]));
        const p1 = new THREE.Vector3(hx, f.y0 + rail[i + 1][1], zAt(rail[i + 1][0]));
        b.add(new THREE.TubeGeometry(new THREE.LineCurve3(p0, p1), 1, 0.05, 6), DARK);
      }
    }
    const [zc0, zc1] = [zAt(0), zAt(COMB * 0.3)];
    box(b, e.x0, f.y0, Math.min(zc0, zc1), e.x1, f.y0 + 0.03, Math.max(zc0, zc1), STEEL);
    const [zl0, zl1] = [zAt(L - 0.3), zAt(L)];
    box(b, e.x0, f.y1, Math.min(zl0, zl1), e.x1, f.y1 + 0.03, Math.max(zl0, zl1), STEEL);
  }
}

/** A tree in a round white planter */
function indoorTree(b: Batch, x: number, z: number, y: number, r: number) {
  cyl(b, r, 0.6, x, y, z, WHITE, 18);
  cyl(b, r + 0.05, 0.05, x, y + 0.6, z, STEEL, 18);
  b.add(new THREE.CircleGeometry(r - 0.05, 16).rotateX(-Math.PI / 2).translate(x, y + 0.55, z), STONE);
  tree(b, x, z, y + 0.55, 0.85);
}
/** A timber bench on steel, facing `ry` (0 is +z), a back behind */
function bench(b: Batch, x: number, z: number, y: number, ry: number) {
  const across = ry === 0 || ry === Math.PI;
  const back = across ? (ry === 0 ? -1 : 1) : ry > 0 ? -1 : 1;
  if (across) {
    box(b, x - 1.05, y + 0.38, z - 0.24, x + 1.05, y + 0.45, z + 0.24, WOOD);
    box(b, x - 1.05, y + 0.45, z + back * 0.22 - 0.03, x + 1.05, y + 0.85, z + back * 0.22 + 0.03, WOOD);
    for (const s of [-1, 1]) box(b, x + s * 0.9 - 0.04, y, z - 0.2, x + s * 0.9 + 0.04, y + 0.38, z + 0.2, STEEL);
  } else {
    box(b, x - 0.24, y + 0.38, z - 1.05, x + 0.24, y + 0.45, z + 1.05, WOOD);
    box(b, x + back * 0.22 - 0.03, y + 0.45, z - 1.05, x + back * 0.22 + 0.03, y + 0.85, z + 1.05, WOOD);
    for (const s of [-1, 1]) box(b, x - 0.2, y, z + s * 0.9 - 0.04, x + 0.2, y + 0.38, z + s * 0.9 + 0.04, STEEL);
  }
}

function things(b: Batch) {
  // The column round the el's pillar: white, a steel ring at its foot and head
  for (const [x, z] of COLUMNS) {
    cyl(b, COLUMN_R, L2 - L2_T - L1, x, L1, z, WHITE, 16);
    cyl(b, COLUMN_R + 0.04, 0.08, x, L1, z, STEEL, 16);
  }
  for (const s of BENCHES) bench(b, s.x, s.z, L1, s.ry);
  for (const s of PLATFORM_BENCHES) bench(b, s.x, s.z, L2, s.ry);
  for (const [x, z] of PLANTERS) indoorTree(b, x, z, L1, 0.5);
  // The coffee kiosk: a timber counter, a white canopy with its name
  const [kx0, kz0, kx1, kz1] = KIOSK.rect;
  box(b, kx0, L1, kz0, kx1, L1 + 1.05, kz1, WOOD);
  box(b, kx0 - 0.05, L1 + 1.05, kz0 - 0.05, kx1 + 0.05, L1 + 1.12, kz1 + 0.05, STONE);
  for (const [x, z] of [
    [kx0 + 0.1, kz0 + 0.1],
    [kx0 + 0.1, kz1 - 0.1],
  ])
    box(b, x - 0.04, L1 + 1.1, z - 0.04, x + 0.04, L1 + 2.3, z + 0.04, STEEL);
  box(b, kx0 - 0.1, L1 + 2.3, kz0 - 0.1, kx1 + 0.1, L1 + 2.4, kz1 + 0.1, WHITE);
  sign(b, KIOSK.name, kx1 + 0.12, L1 + 2.6, (kz0 + kz1) / 2, 1.9, 0.38, Math.PI / 2);
  box(b, kx1 + 0.08, L1 + 2.4, kz0, kx1 + 0.12, L1 + 2.82, kz1, CHARCOAL);
  b.add(new THREE.CylinderGeometry(0.16, 0.13, 0.3, 10).translate(kx0 + 0.5, L1 + 1.27, kz0 + 0.5), CHARCOAL);
  // The board on the platform floor: what's to come
  box(b, BOARD.x - 1.8, L2 + 1.2, BOARD.z - 0.06, BOARD.x + 1.8, L2 + 2.0, BOARD.z, CHARCOAL);
  sign(b, BOARD.text, BOARD.x, L2 + 1.6, BOARD.z - 0.065, 3.4, 0.62, Math.PI);
  // The way signs: PALM COURT over the escalators down, the mall's name over the corridor's mouth on the bridge,
  // Bright & Co. over its mouth on the hall's gallery
  sign(b, 'PALM COURT', (ESC_G.stairs[0].x0 + ESC_G.stairs[1].x1) / 2, L1 + 2.6, MEZZ_L1[3] - 0.05, 2.6, 0.42, Math.PI);
  box(b, ESC_G.stairs[0].x0 - 0.1, L1 + 2.35, MEZZ_L1[3] - 0.04, ESC_G.stairs[1].x1 + 0.1, L1 + 2.85, MEZZ_L1[3], CHARCOAL);
  sign(b, MALL_NAME, X0 + 0.06, L1 + CORRIDOR_H + 0.45, (CORRIDOR_Z[0] + CORRIDOR_Z[1]) / 2, 3.6, 0.5, Math.PI / 2);
  sign(b, ANCHORS[1].name, CORRIDOR_IN[0] - 0.02, L1 + CORRIDOR_H - 0.35, (CORRIDOR_Z[0] + CORRIDOR_Z[1]) / 2, 3.2, 0.42, -Math.PI / 2);
}

function corridor(b: Batch) {
  const [z0, z1] = CORRIDOR_Z;
  const [x0, x1] = [CORRIDOR_IN[0], X0];
  const top = L1 + CORRIDOR_H;
  // Its mouth on the gallery: a white frame; its ceiling: timber with slots of light; a LED line along each side
  box(b, x0 - 0.02, top - 0.4, z0, x0 + 0.1, top + 0.05, z1, WHITE);
  for (const z of [z0, z1 - 0.3]) box(b, x0 - 0.02, L1, z, x0 + 0.1, top, z + 0.3, WHITE);
  under(b, x0, z0, x1, z1, top, TIMBER);
  for (let x = x0 + 0.8; x < x1 - 0.5; x += 2) slot(b, x, z0 + 0.5, x + 0.12, z1 - 0.5, top - 0.006);
  for (const z of [z0 + 0.02, z1 - 0.05]) box(b, x0, top - 0.06, z, x1, top - 0.02, z + 0.03, LED);
  // Its walls: white in the hall's strip, then Bright & Co.'s windows either side, black steel frames, a timber skirting
  const shop = ANCHORS[1].rect[0] + 0.3;
  for (const [z, f] of [
    [z0, 1],
    [z1, -1],
  ] as const) {
    box(b, x0, L1, Math.min(z, z + f * 0.02), shop, top, Math.max(z, z + f * 0.02), WHITE);
    glassZ(b, z, f, shop + 0.3, x1 - 0.6, L1 + 0.15, top - 0.4);
    box(b, shop, top - 0.4, Math.min(z, z + f * 0.04), x1, top, Math.max(z, z + f * 0.04), CHARCOAL);
    box(b, shop, L1, Math.min(z, z + f * 0.05), x1, L1 + 0.15, Math.max(z, z + f * 0.05), WOOD);
    for (let x = shop; x <= x1 + 0.01; x += (x1 - shop) / 4) box(b, x - 0.05, L1, Math.min(z, z + f * 0.08), x + 0.05, top - 0.4, Math.max(z, z + f * 0.08), STEEL);
  }
  sign(b, ANCHORS[1].name, (shop + x1) / 2, top - 0.2, z0 + 0.05, 3.4, 0.32, 0);
  sign(b, ANCHORS[1].name, (shop + x1) / 2, top - 0.2, z1 - 0.05, 3.4, 0.32, Math.PI);
}

/* ---------- Registering ---------- */

/** The outside's sign atlas (mall3d.ts's: the Skywalk's words are in it) */
let sign: Sign = () => {};

/** The Skywalk's sites: outside (from afar, with shadows) and inside (near only) */
export function registerLink({ build, signs }: { build: (draw: (b: Batch) => void, cast?: boolean) => (into: THREE.Object3D) => void; signs: Sign }) {
  sign = signs;
  const area: [number, number, number, number] = [X0, Z0, X1, Z1];
  site('mall link shell', [X0, Z0 - 0.5, X1, Z1 + 0.5], build(shell));
  site('mall link roof', area, build(roof));
  const near = (draw: (b: Batch) => void) => build((b) => b.detail(() => draw(b)), false);
  site('mall link floors', area, near(floors));
  site('mall link edges', area, near(edges));
  site('mall link escalators', [PAV_IN[0], PAV_IN[1], PAV_IN[2], PAV_IN[3]], near((b) => FLIGHTS.forEach((f) => escalator(b, f))));
  site('mall link things', area, near(things));
  site('mall link corridor', [CORRIDOR_IN[0], CORRIDOR_Z[0], X0, CORRIDOR_Z[1]], near(corridor));
}
