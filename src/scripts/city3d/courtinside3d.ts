/*
 * Palm Court indoors on screen (docs/mall-plan.md "One mall" Phase 3; the numbers are courtinside.ts and mall.ts), in
 * the mall's chunk (mall3d.ts calls `registerCourt()`). The mall's own fit-out (mallkit.ts, as mallinside3d.ts): white
 * slabs with timber soffits and slots of light, pale stone floors, white and black-steel shopfronts, glass balustrades,
 * a glass barrel vault on black ribs.
 *
 * - **Outside** (sites, seen from afar): the two rows, two storeys, cladding with a ribbon of glass upstairs and a dark
 *   band at the top, rooftop plant; the vault over the promenade, its glass gables at the ends; the entrances (the
 *   south end's glass front with PALM COURT over its doors under a canopy, the passages' on the avenue and the open
 *   land); the stone floor indoors.
 * - **Inside** (sites, near only, no shadows): the shopfronts downstairs (each its shop's `style` in its fascia and
 *   frame) and upstairs (their names from `court-signs`), the food hall's stalls and its tables, the slabs of the
 *   galleries, the terrace and the bridges, the balustrades, the escalators (malllink3d.ts's, their steps the hall's),
 *   the trees in their white planters, the cinema's doors upstairs, FOOD HALL over the terrace.
 */
import * as THREE from 'three';
import type { Batch } from './kit';
import { site } from './tilework';
import { CINEMA, EAST_GAP, FIT, PAVILION, PROM, PROM_X, ROW_H, SHOPS, ZEBRA, type Shop } from './mall';
import { FLOOR_T } from './mallinside';
import {
  BALUSTRADE,
  BRIDGES,
  CINEMA_DOORS,
  CONNECTOR,
  COURT_PLANTERS,
  EAST_X,
  ENTRANCES,
  ESCALATORS,
  FOOD_NAMES,
  FOOD_STALLS,
  FOOT_Z,
  INSIDE,
  L1,
  LAND_Z,
  NORTH,
  PLANTER_R,
  RUN,
  SOUTH,
  TABLES,
  TABLE_R,
  TERRACE_Z,
  UPPER,
  UPPER_NAMES,
  UPPER_UNITS,
  VAULT_RISE,
  VOID,
  WEST_X,
  type UpperUnit,
} from './courtinside';
import type { Flight } from './malllink';
import { escalator } from './malllink3d';
import { CHARCOAL, CLAD, CLAD_DARK, CURTAIN, DARK, FLOOR, GLASS, GREY, LED, LIGHT, MID, PANEL, STEEL, STONE, TIMBER, WHITE, WOOD, Y, box, cyl, face, flat, glassX, glassZ, signAtlas, tree, type Sign } from './mallkit';

/** Upstairs' signs: the units, the food hall's stalls, FOOD HALL (fixed made-up words) */
const signIn = signAtlas('court-signs', [...UPPER_NAMES, ...FOOD_NAMES, 'FOOD HALL'], new Set(UPPER_NAMES.filter((_, k) => k % 2)));

const PX: [number, number] = [1, 0];
const NX: [number, number] = [-1, 0];
const PZ: [number, number] = [0, 1];
/** The rows' parapet's top; the upper floor's slabs' underside; the units' ceiling upstairs */
const TOP = Y + ROW_H;
const LOW = L1 - FLOOR_T;
const CEIL_UP = TOP - 0.5;
/** The vault: its half width over the promenade, how much it's flattened */
const VR = (PROM[1] - PROM[0]) / 2;
const FLAT = VAULT_RISE / VR;

/** A ceiling or soffit facing down at y */
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
const slot = (b: Batch, x0: number, z0: number, x1: number, z1: number, y: number) => b.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2), PANEL);

/* ---------- Outside ---------- */

/** A shop's row's body, its outer face (cladding, a ribbon of glass upstairs, the dark band at the top), its roof's coping */
function rowOutside(b: Batch, s: Shop) {
  const [x0, z0, x1, z1] = s.rect;
  // (to the next shop's: the rows read as one building)
  const [za, zb] = [z0 - 0.1, z1 + 0.1];
  box(b, x0, Y, za, x1, TOP, zb, LIGHT);
  const ox = s.face === 1 ? x0 : x1;
  const n = s.face === 1 ? NX : PX;
  face(b, CLAD, ox, za, ox, zb, Y, L1 + 0.3, n);
  face(b, CURTAIN, ox, za, ox, zb, L1 + 0.3, L1 + 2.5, n);
  face(b, CLAD, ox, za, ox, zb, L1 + 2.5, TOP - 0.55, n);
  face(b, CLAD_DARK, ox, za, ox, zb, TOP - 0.55, TOP, n, 0.02);
  // (the coping along the outer edge and the promenade's, where the vault's curb sits)
  const [ix0, ix1] = s.face === 1 ? [x0 - 0.04, x0 + 0.25] : [x1 - 0.25, x1 + 0.04];
  box(b, ix0, TOP, za, ix1, TOP + 0.12, zb, MID);
  // (its plant, solar arrays and rooflights: mallroofs3d.ts)
}
/** The rows' south ends and the square's corners and the passages: their roofs and outer faces */
function ends(b: Batch) {
  // (the south ends of the rows, facing south)
  for (const [x0, x1] of [
    [WEST_X, PROM[0]],
    [PROM[1], EAST_X],
  ]) {
    face(b, CLAD, x0, SOUTH, x1, SOUTH, Y, TOP - 0.55, PZ);
    face(b, CLAD_DARK, x0, SOUTH, x1, SOUTH, TOP - 0.55, TOP, PZ, 0.02);
  }
  // The square in front of the cinema, by the rows' north ends, and the passages: roofed over at the rows' height
  const roofs: [number, number, number, number][] = [
    [WEST_X, NORTH, PROM[0], PAVILION[1]],
    [PROM[1], NORTH, EAST_X, NORTH + 4],
    [WEST_X, ZEBRA.z - 3, PROM[0], ZEBRA.z + 3],
    [PROM[1], EAST_GAP[0], EAST_X, EAST_GAP[1]],
  ];
  for (const [x0, z0, x1, z1] of roofs) {
    box(b, x0, TOP - 0.4, z0, x1, TOP, z1, LIGHT);
    under(b, x0, z0, x1, z1, TOP - 0.406, WHITE);
  }
  face(b, CLAD, WEST_X, NORTH, WEST_X, PAVILION[1], Y, TOP - 0.55, NX);
  face(b, CLAD_DARK, WEST_X, NORTH, WEST_X, PAVILION[1], TOP - 0.55, TOP, NX, 0.02);
  face(b, CLAD, EAST_X, NORTH, EAST_X, NORTH + 4, Y, TOP - 0.55, PX);
  face(b, CLAD_DARK, EAST_X, NORTH, EAST_X, NORTH + 4, TOP - 0.55, TOP, PX, 0.02);
}
/** An entrance's front: glass either side and over its doors (open), a dark band with PALM COURT, a canopy out over them */
function entrance(b: Batch, e: (typeof ENTRANCES)[number], sign: Sign) {
  const n: [number, number] = e.id === 'south' ? PZ : e.id === 'west' ? NX : PX;
  const pt = (u: number): [number, number] => (e.along === 'x' ? [u, e.at] : [e.at, u]);
  const span = (u0: number, u1: number, y0: number, y1: number, mat: THREE.Material, off?: number) => {
    const [a, c] = [pt(u0), pt(u1)];
    face(b, mat, a[0], a[1], c[0], c[1], y0, y1, n, off);
  };
  const [d0, d1] = e.door;
  // (its doors in scale with the people, mall.ts `FIT`: the glass on up over them)
  const head = Y + FIT.entrance;
  span(e.from, d0, Y, TOP - 0.6, CURTAIN);
  span(d1, e.to, Y, TOP - 0.6, CURTAIN);
  span(d0, d1, head, TOP - 0.6, CURTAIN);
  span(e.from, e.to, TOP - 0.6, TOP, CLAD_DARK, 0.02);
  // The doorway's black frame; the canopy out over it (steel, a timber soffit, a LED edge); the name on the band
  const out = (k: number) => [n[0] * k, n[1] * k] as const;
  const bx = (u0: number, u1: number, y0: number, y1: number, k0: number, k1: number, mat: THREE.Material) => {
    const [a, c] = [pt(u0), pt(u1)];
    const [o0, o1] = [out(k0), out(k1)];
    box(b, Math.min(a[0] + o0[0], c[0] + o1[0]), y0, Math.min(a[1] + o0[1], c[1] + o1[1]), Math.max(a[0] + o0[0], c[0] + o1[0]), y1, Math.max(a[1] + o0[1], c[1] + o1[1]), mat);
  };
  bx(d0 - 0.12, d0, Y, head + 0.1, -0.08, 0.1, STEEL);
  bx(d1, d1 + 0.12, Y, head + 0.1, -0.08, 0.1, STEEL);
  bx(d0 - 0.12, d1 + 0.12, head, head + 0.12, -0.08, 0.1, STEEL);
  bx(d0 - 1.0, d1 + 1.0, head + 0.3, head + 0.5, 0, 2.0, STEEL);
  bx(d0 - 1.0, d1 + 1.0, head + 0.52, head + 0.56, 1.96, 2.0, LED);
  const [m0, m1] = [pt((d0 + d1) / 2), out(0.03)];
  const ry = e.id === 'south' ? 0 : e.id === 'west' ? -Math.PI / 2 : Math.PI / 2;
  sign(b, 'PALM COURT', m0[0] + m1[0], TOP - 0.3, m0[1] + m1[1], Math.min(5, d1 - d0 + 1.6), 0.42, ry);
}
/** The vault over the promenade between z0 and z1: glass on its curbs along the rows' inner edges, black steel ribs (near only) */
function vault(b: Batch, z0: number, z1: number) {
  const xm = (PROM[0] + PROM[1]) / 2;
  // (the half from a quarter turn to three quarters: once turned onto its side, the half over the springing, not under it)
  const v = new THREE.CylinderGeometry(VR, VR, z1 - z0, 18, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).scale(1, FLAT, 1);
  b.add(v.translate(xm, TOP + 0.12, (z0 + z1) / 2), GLASS);
  for (const x of [PROM[0] - 0.25, PROM[1] - 0.15]) box(b, x, TOP, z0, x + 0.4, TOP + 0.12, z1, GREY);
  b.detail(() => {
    for (let z = Math.ceil(z0 / 3) * 3; z < z1; z += 3) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 10; k++) {
        const t = (k / 10) * Math.PI;
        pts.push(new THREE.Vector3(xm + Math.cos(t) * VR, TOP + 0.12 + Math.sin(t) * VAULT_RISE + 0.03, z));
      }
      b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.05, 4, false), STEEL);
    }
    box(b, xm - 0.05, TOP + 0.12 + VAULT_RISE, z0, xm + 0.05, TOP + 0.2 + VAULT_RISE, z1, STEEL);
  });
}
/** The vault's gable over the south entrance, glass (its north end is Paradise Cinema's front, taller than its crown) */
function gables(b: Batch) {
  const xm = (PROM[0] + PROM[1]) / 2;
  b.add(new THREE.CircleGeometry(VR, 18, 0, Math.PI).scale(1, FLAT, 1).translate(xm, TOP + 0.12, SOUTH), GLASS);
}
function floorOf(b: Batch) {
  for (const r of INSIDE) if (r !== CONNECTOR) flat(b, r[0], r[1], r[2], r[3], Y + 0.012, FLOOR, 8);
}

/* ---------- Inside (near only) ---------- */

/** A shopfront at x facing f (+1 east), z0 to z1, y0 to top: white piers, black steel, glass, the door, a fascia with its name and a LED line under it */
function front(b: Batch, x: number, f: 1 | -1, z0: number, z1: number, y0: number, top: number, fascia: THREE.Material, name: () => void) {
  const zm = (z0 + z1) / 2;
  const at = (d: number) => x + f * d;
  const bx = (d0: number, d1: number, ya: number, yb: number, za: number, zb: number, mat: THREE.Material) => box(b, Math.min(at(d0), at(d1)), ya, za, Math.max(at(d0), at(d1)), yb, zb, mat);
  bx(0, 0.06, y0, top, z0, z0 + 0.35, WHITE);
  bx(0, 0.06, y0, top, z1 - 0.35, z1, WHITE);
  bx(0, 0.1, y0, top - 0.7, z0 + 0.32, z0 + 0.42, STEEL);
  bx(0, 0.1, y0, top - 0.7, z1 - 0.42, z1 - 0.32, STEEL);
  bx(0, 0.1, y0 + 0.08, y0 + 0.14, z0 + 0.42, z1 - 0.42, STEEL);
  glassX(b, x, f, z0 + 0.42, z1 - 0.42, y0 + 0.14, top - 0.75);
  // (the door in scale with the people, mall.ts `FIT`: a steel head over it, the glass on up)
  const dt = y0 + FIT.door;
  bx(0.015, 0.03, y0, dt, zm - 0.42, zm + 0.42, DARK);
  bx(0.03, 0.08, y0, dt + 0.05, zm - 0.47, zm - 0.42, STEEL);
  bx(0.03, 0.08, y0, dt + 0.05, zm + 0.42, zm + 0.47, STEEL);
  bx(0.03, 0.08, dt, dt + 0.05, zm - 0.42, zm + 0.42, STEEL);
  bx(0, 0.12, top - 0.7, top - 0.04, z0 + 0.3, z1 - 0.3, fascia);
  name();
  bx(0.1, 0.13, top - 0.74, top - 0.71, z0 + 0.4, z1 - 0.4, LED);
}
function shopsDown(b: Batch, z0: number, z1: number, sign: Sign) {
  for (const s of SHOPS) {
    if (s.rect[1] < z0 || s.rect[1] >= z1) continue;
    const x = s.face === 1 ? s.rect[2] : s.rect[0];
    const top = LOW - 0.02;
    const zm = (s.rect[1] + s.rect[3]) / 2;
    // (its fascia its style's: white render and timber with charcoal letters, glass and cladding dark with warm ones)
    const fascia = s.style === 'render' ? WHITE : s.style === 'timber' ? WOOD : s.style === 'clad' ? CLAD_DARK : CHARCOAL;
    front(b, x, s.face, s.rect[1], s.rect[3], Y, top, fascia, () => sign(b, s.name, x + s.face * 0.13, top - 0.37, zm, Math.min(3.6, s.rect[3] - s.rect[1] - 1.2), 0.42, s.face * (Math.PI / 2)));
  }
}
function shopsUp(b: Batch, z0: number, z1: number) {
  for (const u of UPPER_UNITS as UpperUnit[]) {
    if (u.rect[1] < z0 || u.rect[1] >= z1) continue;
    const x = u.face === 1 ? u.rect[2] : u.rect[0];
    const zm = (u.rect[1] + u.rect[3]) / 2;
    front(b, x, u.face, u.rect[1], u.rect[3], L1, CEIL_UP, u.k % 2 ? WHITE : CHARCOAL, () => signIn(b, u.name, x + u.face * 0.13, CEIL_UP - 0.37, zm, Math.min(3.6, u.rect[3] - u.rect[1] - 1.2), 0.42, u.face * (Math.PI / 2)));
  }
}
/** The food hall's stalls upstairs in the east row's north end: a timber counter out on the gallery, the kitchen behind, dark menu boards (no prices), the name */
function foodHall(b: Batch) {
  const x = PROM[1];
  for (const s of FOOD_STALLS) {
    const zm = (s.z0 + s.z1) / 2;
    box(b, x - 0.06, L1, s.z0, x, CEIL_UP, s.z0 + 0.2, WHITE);
    // (at the people's scale, mall.ts `FIT`: the counter, the kitchen behind, the boards over a cook's head)
    const ct = L1 + FIT.counter;
    box(b, x - 0.6, L1, s.z0 + 0.3, x - 0.05, ct, s.z1 - 0.3, WOOD);
    box(b, x - 0.65, ct, s.z0 + 0.25, x - 0.02, ct + 0.05, s.z1 - 0.25, STONE);
    box(b, x - 0.04, L1, s.z0 + 0.3, x, L1 + FIT.door + 0.1, s.z1 - 0.3, STEEL);
    box(b, x - 0.06, L1 + 0.8, s.z0 + 0.5, x - 0.04, L1 + 1.3, s.z1 - 0.5, DARK);
    box(b, x - 0.12, CEIL_UP - 0.7, s.z0 + 0.25, x, CEIL_UP - 0.04, s.z1 - 0.25, CHARCOAL);
    signIn(b, s.name, x - 0.13, CEIL_UP - 0.37, zm, Math.min(3.4, s.z1 - s.z0 - 1), 0.42, -Math.PI / 2);
    box(b, x - 0.13, CEIL_UP - 0.74, s.z0 + 0.35, x - 0.1, CEIL_UP - 0.71, s.z1 - 0.35, LED);
  }
  // FOOD HALL hung over the terrace, facing south down the promenade
  const fh = L1 + FIT.door + 0.35;
  box(b, PROM_X - 1.8, fh, TERRACE_Z - 0.1, PROM_X + 1.8, fh + 0.46, TERRACE_Z, CHARCOAL);
  signIn(b, 'FOOD HALL', PROM_X, fh + 0.23, TERRACE_Z + 0.006, 3.2, 0.36, 0);
  for (const dx of [-1.4, 1.4]) box(b, PROM_X + dx - 0.02, fh + 0.46, TERRACE_Z - 0.07, PROM_X + dx + 0.02, TOP + 0.6, TERRACE_Z - 0.03, STEEL);
  // The tables: round timber tops on a steel stem, two stools each
  for (const [x, z] of TABLES) {
    cyl(b, TABLE_R, 0.05, x, L1 + FIT.table - 0.05, z, WOOD, 16);
    cyl(b, 0.05, FIT.table - 0.05, x, L1, z, STEEL, 6);
    for (const s of [-1, 1]) {
      cyl(b, 0.17, 0.05, x + s * (TABLE_R + 0.3), L1 + FIT.seat - 0.05, z, CHARCOAL, 10);
      cyl(b, 0.03, FIT.seat - 0.05, x + s * (TABLE_R + 0.3), L1, z, STEEL, 6);
    }
  }
  // Paradise Cinema's doors up here on its glazed front: a black frame, the glass doors
  const [c0, c1] = CINEMA_DOORS;
  const z = CINEMA.rect[3] + 0.02;
  const cd = L1 + FIT.entrance;
  box(b, c0 - 0.12, L1, z, c0, cd + 0.12, z + 0.1, STEEL);
  box(b, c1, L1, z, c1 + 0.12, cd + 0.12, z + 0.1, STEEL);
  box(b, c0 - 0.12, cd, z, c1 + 0.12, cd + 0.12, z + 0.1, STEEL);
  glassZ(b, z + 0.03, 1, c0, c1, L1, cd, GLASS);
}
/** The upper floor's slabs (the way into the pavilion's too), their stone floors, timber soffits with slots of light, a LED line along the void */
function slabs(b: Batch) {
  for (const r of UPPER) {
    const [x0, z0, x1, z1] = r;
    box(b, x0, LOW, z0, x1, L1, z1, WHITE);
    flat(b, x0, z0, x1, z1, L1 + 0.006, FLOOR, 8);
    if (r === CONNECTOR) continue;
    under(b, x0 + 0.15, z0 + 0.15, x1 - 0.15, z1 - 0.15, LOW - 0.006, TIMBER);
    const along = z1 - z0 > x1 - x0;
    if (along) for (let z = z0 + 1.2; z < z1 - 0.8; z += 2.4) slot(b, x0 + 0.5, z, x1 - 0.5, z + 0.12, LOW - 0.012);
    else for (let x = x0 + 1; x < x1 - 0.8; x += 2.2) slot(b, x, z0 + 0.5, x + 0.12, z1 - 0.5, LOW - 0.012);
  }
  const e = L1 - 0.16;
  box(b, VOID[0], e, TERRACE_Z, VOID[0] + 0.03, e + 0.05, SOUTH, LED);
  box(b, VOID[2] - 0.03, e, TERRACE_Z, VOID[2], e + 0.05, SOUTH, LED);
  box(b, VOID[0], e, TERRACE_Z, VOID[2], e + 0.05, TERRACE_Z + 0.03, LED);
}
/** A glass balustrade along a line on the upper floor, a steel rail along its top, posts */
function balustrade(b: Batch, x0: number, z0: number, x1: number, z1: number) {
  const y = L1;
  const along = x1 - x0 !== 0;
  const len = Math.hypot(x1 - x0, z1 - z0);
  if (len < 0.05) return;
  const r = FIT.rail;
  const g = new THREE.PlaneGeometry(len, r - 0.08);
  if (!along) g.rotateY(Math.PI / 2);
  b.add(g.translate((x0 + x1) / 2, y + (r - 0.08) / 2 + 0.02, (z0 + z1) / 2), GLASS);
  if (along) box(b, x0, y + r - 0.05, z0 - 0.03, x1, y + r, z0 + 0.03, STEEL);
  else box(b, x0 - 0.03, y + r - 0.05, z0, x0 + 0.03, y + r, z1, STEEL);
  const n = Math.max(1, Math.round(len / 1.6));
  for (let i = 0; i <= n; i++) {
    const [x, z] = [x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n];
    box(b, x - 0.02, y, z - 0.02, x + 0.02, y + FIT.rail - 0.04, z + 0.02, STEEL);
  }
}
function edges(b: Batch) {
  // Along the galleries' void edges, broken where the bridges meet them; the terrace's edge; the bridges' sides
  const cuts = [TERRACE_Z, ...BRIDGES.flat(), SOUTH].sort((p, q) => p - q);
  for (let i = 0; i + 1 < cuts.length; i += 2) {
    balustrade(b, VOID[0], cuts[i], VOID[0], cuts[i + 1]);
    balustrade(b, VOID[2], cuts[i], VOID[2], cuts[i + 1]);
  }
  balustrade(b, VOID[0], TERRACE_Z, VOID[2], TERRACE_Z);
  const [ex0, ex1] = [ESCALATORS[0].x0 - BALUSTRADE, ESCALATORS[1].x1 + BALUSTRADE];
  BRIDGES.forEach(([z0, z1]) => {
    balustrade(b, VOID[0], z0, VOID[2], z0);
    // (the south bridge's south side open where the escalators land on it)
    if (z1 === LAND_Z) {
      balustrade(b, VOID[0], z1, ex0, z1);
      balustrade(b, ex1, z1, VOID[2], z1);
    } else balustrade(b, VOID[0], z1, VOID[2], z1);
  });
}
/** A tree in a round white planter */
function planted(b: Batch, x: number, z: number) {
  cyl(b, PLANTER_R, 0.4, x, Y, z, WHITE, 18);
  cyl(b, PLANTER_R + 0.04, 0.04, x, Y + 0.4, z, STEEL, 18);
  b.add(new THREE.CircleGeometry(PLANTER_R - 0.05, 16).rotateX(-Math.PI / 2).translate(x, Y + 0.37, z), STONE);
  tree(b, x, z, Y + 0.37, 0.8);
}
/** Palm Court's escalators, as the Skywalk's (malllink3d.ts `escalator()`) */
const FLIGHT: Flight = { id: 'court', stairs: ESCALATORS, y0: Y, y1: L1, foot: FOOT_Z, run: RUN, rise: -1, land: LAND_Z };

/* ---------- Registering ---------- */

/** Palm Court's sites: outside in stretches along it (from afar, with shadows), inside near only */
export function registerCourt({ build, signs }: { build: (draw: (b: Batch) => void, cast?: boolean) => (into: THREE.Object3D) => void; signs: Sign }) {
  const STRETCH = 24;
  const near = (draw: (b: Batch) => void) => build((b) => b.detail(() => draw(b)), false);
  for (let z = NORTH; z < SOUTH; z += STRETCH) {
    const z1 = Math.min(SOUTH, z + STRETCH);
    site(`court rows ${Math.round(z)}`, [WEST_X, z, EAST_X, z1], build((b) => SHOPS.forEach((s) => s.rect[1] >= z && s.rect[1] < z1 && rowOutside(b, s))));
    site(`court vault ${Math.round(z)}`, [PROM[0], z, PROM[1], z1], build((b) => vault(b, z, z1), false));
    site(`court fronts ${Math.round(z)}`, [WEST_X, z, EAST_X, z1], near((b) => (shopsDown(b, z, z1, signs), shopsUp(b, z, z1))));
  }
  site('court ends', [WEST_X, NORTH, EAST_X, SOUTH + 0.5], build((b) => (ends(b), gables(b), ENTRANCES.forEach((e) => entrance(b, e, signs)))));
  site('court floor', [WEST_X, NORTH, EAST_X, SOUTH], build(floorOf, false));
  site('court upstairs', [PROM[0] - 0.3, NORTH, PROM[1], SOUTH], near((b) => (slabs(b), edges(b))));
  site('court food hall', [PROM[0], NORTH, PROM[1] + 0.2, ZEBRA.z], near(foodHall));
  site('court escalators', [ESCALATORS[0].x0 - 1, LAND_Z, ESCALATORS[1].x1 + 1, FOOT_Z + 1], near((b) => escalator(b, FLIGHT)));
  site('court trees', [VOID[0], TERRACE_Z, VOID[2], SOUTH], near((b) => COURT_PLANTERS.forEach(([x, z]) => planted(b, x, z))));
}
