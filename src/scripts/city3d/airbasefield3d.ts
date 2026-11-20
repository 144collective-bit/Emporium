/*
 * Northgate Air Base's airfield drawn (docs/military-plan.md Phase 2; the numbers are airbase.ts), a district loaded as
 * you approach (districts.ts `airbase-field`), in strips 30 across, west to east (`STRIP`), each drawing what of the
 * field stands there, in the airport's colours and kit (airportkit.ts):
 *
 * - the runway: asphalt and shoulders, the edge lines, the centre line's dashes, the threshold bars and the touchdown
 *   zone's (no numbers: nothing in the city carries one), the edge lights white, the threshold's green, the ends' red;
 *   the approach lights on their poles out past each end;
 * - the parallel taxiway and its connectors, the north taxiway and its links, the shelters' stubs: yellow centre lines,
 *   blue edge lights (near only);
 * - the main apron (concrete, its joints) out to the hangars' doors, and its road from the parade avenue.
 *
 * The lights are `light()`s: small and bright, under the bloom's threshold but for their cores (visual-rules.md).
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';
import { createFleet } from './aircraft';
import { poseAt } from './airfield';
import { BASE_FLIGHTS } from './airbaseflights';
import { nearGate } from './nearby';
import type { Tick } from './world';
import { site } from './tilework';
import { ROAD } from './palette';
import { MARK, G, TOP, box, cyl, light, mark } from './airportkit';
import { AIRFIELD_RECT as FIELD, APPROACH, APRON, APRON_ROAD, BUND_H, CONNECTORS, APRON_MASTS, MAST_H, FIRE_H, FIRE_STATION, FUEL_FARM, FUEL_TANKS, HANGARS, HANGAR_H, NORTH_LINKS, NORTH_TAXI, OPEN_HANGAR, RUNWAY, SHELTER, SHELTERS, TAXIWAY, TOWER, TOWER_BASE, TOWER_SHAFT, TOWER_TOP } from './airbase';
import { APRON_VEHICLES, baseGrey, PARKED, WINDSOCK } from './airbasedress';
import type { Rect } from './tiles';

/** This module's address, for the site worker (districts.ts) */
export const SELF = import.meta.url;

/** A site's strip across the field (x) */
const STRIP = 30;

const ASPHALT = toon('#2a2840');
const SHOULDER = toon('#34314d');
const TAXI_ASPHALT = toon('#302d48');
const CONCRETE = toon('#8a85aa');
const JOINT = toon('#7a7598');
const WHITE = toon('#e6e3f2');
const YELLOW = toon('#ffd23f');
const ROADWAY = toon(ROAD.asphalt);
const POLE = toon('#4b4766');

/** A flat box from x0 to x1 (clipped to the strip), z0 to z1, y0 to y1: in pieces no longer than 15 */
function slab(b: Batch, sx0: number, sx1: number, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, m: Parameters<Batch['add']>[1]) {
  const [a0, a1] = [Math.max(x0, sx0), Math.min(x1, sx1)];
  for (let a = a0; a < a1 - 1e-6; a += 15) box(b, a, y0, z0, Math.min(a + 15, a1), y1, z1, m);
}
/** A painted line along x from x0 to x1 (clipped), z0 to z1 */
function line(b: Batch, sx0: number, sx1: number, x0: number, x1: number, z0: number, z1: number, m: Parameters<Batch['add']>[1], y = MARK) {
  const [a0, a1] = [Math.max(x0, sx0), Math.min(x1, sx1)];
  for (let a = a0; a < a1 - 1e-6; a += 15) mark(b, a, z0, Math.min(a + 15, a1), z1, m, y);
}
const inS = (x: number, sx0: number, sx1: number) => x >= sx0 && x < sx1;

function runway(b: Batch, sx0: number, sx1: number, low: boolean) {
  const { x0, x1, z, half } = RUNWAY;
  slab(b, sx0, sx1, x0 - 2, x1 + 2, z - half - 1.6, z + half + 1.6, 0.002, 0.022, SHOULDER);
  slab(b, sx0, sx1, x0, x1, z - half, z + half, G, TOP, ASPHALT);
  for (const s of [-1, 1]) line(b, sx0, sx1, x0 + 0.5, x1 - 0.5, z + s * (half - 0.4) - 0.14, z + s * (half - 0.4) + 0.14, WHITE);
  for (let x = x0 + 30; x < x1 - 30; x += 8) if (inS(x, sx0, sx1)) mark(b, x, z - 0.18, x + 4.4, z + 0.18, WHITE);
  for (const [end, dir] of [
    [x0, 1],
    [x1, -1],
  ] as const) {
    // Threshold bars, and the touchdown zone's pairs: three, two, one
    if (inS(end + dir * 3, sx0, sx1))
      for (const s of [-1, 1])
        for (let k = 0; k < 7; k++) {
          const zz = z + s * (0.7 + k * 0.7);
          mark(b, Math.min(end + dir, end + dir * 8), zz, Math.max(end + dir, end + dir * 8), zz + s * 0.4, WHITE);
        }
    for (const [d, n] of [
      [24, 3],
      [42, 2],
      [66, 1],
    ] as const) {
      if (!inS(end + dir * d, sx0, sx1)) continue;
      for (const s of [-1, 1])
        for (let k = 0; k < n; k++) {
          const zz = z + s * (1.4 + k * 0.7);
          mark(b, Math.min(end + dir * d, end + dir * (d + 5)), zz, Math.max(end + dir * d, end + dir * (d + 5)), zz + s * 0.36, WHITE);
        }
    }
  }
  // Edge lights: white along it, green at the threshold, red at the end (each end both, for each way it's flown)
  const gap = low ? 60 : 30;
  for (let x = x0; x <= x1 + 1e-6; x += gap) {
    if (!inS(x, sx0, sx1)) continue;
    const c = x === x0 || x === x1 ? '#3dff7a' : '#fff6e0';
    for (const s of [-1, 1]) box(b, x - 0.1, 0.18, z + s * (half + 0.8) - 0.1, x + 0.1, 0.3, z + s * (half + 0.8) + 0.1, light(c));
  }
  for (const end of [x0, x1])
    if (inS(end, sx0, sx1)) for (let k = -half + 0.6; k <= half - 0.5; k += 1.6) box(b, end - 0.1, 0.12, z + k - 0.1, end + 0.1, 0.22, z + k + 0.1, light('#ff2b2b'));
}

/** The approach lights: a pole every 15 out past each end, its crossbar of lamps */
function approach(b: Batch, sx0: number, sx1: number, low: boolean) {
  const { z } = RUNWAY;
  for (const [a, c] of APPROACH) {
    const [from, dir] = Math.abs(a - RUNWAY.x0) < Math.abs(c - RUNWAY.x0) ? [c, -1] : [a, 1];
    const n = Math.floor(Math.abs(c - a) / 15);
    for (let k = 0; k <= n; k++) {
      const x = from + dir * k * 15;
      if (!inS(x, sx0, sx1)) continue;
      const tall = 1.2 + k * 0.08;
      box(b, x - 0.06, 0, z - 0.06, x + 0.06, tall, z + 0.06, POLE);
      const w = k % 3 === 2 && !low ? 5 : 2.4;
      box(b, x - 0.05, tall - 0.04, z - w / 2, x + 0.05, tall + 0.04, z + w / 2, POLE);
      for (let q = -w / 2 + 0.2; q <= w / 2 - 0.1; q += low ? 0.8 : 0.4) box(b, x - 0.08, tall + 0.05, z + q - 0.07, x + 0.08, tall + 0.16, z + q + 0.07, light('#fff6c8'));
    }
  }
}

/** A taxiway's piece along x (its asphalt, its yellow centre line, near only its blue edge lights) */
function taxiAlong(b: Batch, sx0: number, sx1: number, x0: number, x1: number, z: number, half: number, low: boolean) {
  slab(b, sx0, sx1, x0, x1, z - half, z + half, G, TOP - 0.002, TAXI_ASPHALT);
  line(b, sx0, sx1, x0 + 1, x1 - 1, z - 0.1, z + 0.1, YELLOW);
  if (low) return;
  b.detail(() => {
    for (let x = Math.ceil(x0 / 24) * 24; x <= x1; x += 24) if (inS(x, sx0, sx1)) for (const s of [-1, 1]) box(b, x - 0.08, 0.12, z + s * (half + 0.4) - 0.08, x + 0.08, 0.24, z + s * (half + 0.4) + 0.08, light('#3d8bff'));
  });
}
/** A taxiway's piece across z, x its middle, from z0 to z1 (where its x is in the strip) */
function taxiAcross(b: Batch, sx0: number, sx1: number, x: number, z0: number, z1: number, half: number) {
  if (x + half <= sx0 || x - half > sx1) return;
  if (!inS(x, sx0, sx1)) return;
  box(b, x - half, G, Math.min(z0, z1), x + half, TOP - 0.002, Math.max(z0, z1), TAXI_ASPHALT);
  mark(b, x - 0.1, Math.min(z0, z1) + 0.6, x + 0.1, Math.max(z0, z1) - 0.6, YELLOW);
}

function taxiways(b: Batch, sx0: number, sx1: number, low: boolean) {
  const T = TAXIWAY;
  const N = NORTH_TAXI;
  taxiAlong(b, sx0, sx1, T.x0, T.x1, T.z, T.half, low);
  taxiAlong(b, sx0, sx1, N.x0 - N.half, N.x1 + N.half, N.z, N.half, low);
  // The connectors from the taxiway to the runway, the links from the runway to the north taxiway
  for (const x of CONNECTORS) taxiAcross(b, sx0, sx1, x, RUNWAY.z + RUNWAY.half, T.z - T.half, 4);
  for (const x of NORTH_LINKS) taxiAcross(b, sx0, sx1, x, N.z + N.half, RUNWAY.z - RUNWAY.half, 3.5);
  // Each shelter's stub off the north taxiway, up to its doors
  for (const [x, z] of SHELTERS) taxiAcross(b, sx0, sx1, x, z, N.z - N.half, SHELTER.w / 2 - 3);
}

/** The main apron, out to the hangars' doors, its joints; its road from the parade avenue */
function apron(b: Batch, sx0: number, sx1: number) {
  const [x0, z0, x1] = APRON;
  // (from the taxiway's edge to the hangars' fronts: one slab, the hangars standing on its south edge)
  const zTop = TAXIWAY.z + TAXIWAY.half;
  const zEnd = Math.max(...HANGARS.map((h) => h[1])) + 1;
  slab(b, sx0, sx1, x0, x1, zTop, zEnd, G, TOP - 0.006, CONCRETE);
  for (let z = z0 + 10; z < zEnd - 1; z += 10) line(b, sx0, sx1, x0, x1, z - 0.06, z + 0.06, JOINT, TOP - 0.006 + 0.004);
  for (let x = Math.ceil(x0 / 15) * 15; x < x1; x += 15) if (inS(x, sx0, sx1)) mark(b, x - 0.06, zTop, x + 0.06, zEnd, JOINT, TOP - 0.006 + 0.004);
  // The road in: from the avenue's west edge along z to the apron's east side
  const [[ax, az], [bx]] = APRON_ROAD;
  slab(b, sx0, sx1, Math.min(ax, bx), Math.max(ax, bx), az - 3.5, az + 3.5, G, TOP - 0.004, ROADWAY);
  line(b, sx0, sx1, Math.min(ax, bx) + 1, Math.max(ax, bx) - 1, az - 0.08, az + 0.08, WHITE);
}

/* ---------- The buildings (Phase 2) ---------- */

const CLAD = toon('#5d6b86');
const CLAD_DARK = toon('#46516a');
const HANGAR_ROOF = toon('#7b7f95');
const DOORS = toon('#8f97ad');
const DARK = toon('#191a28');
const CONCRETE_WALL = toon('#a8a3bd');
const SHELTER_SKIN = toon('#7d7f74');
const SHELTER_DOOR = toon('#5c5f57');
const GLASS = toon('#2f4a6e');
const FIRE_RED = toon('#c2352e');
const TANK = toon('#d9d6e4');
const PIPE = toon('#8a8aa0');

/** A hangar: clad walls, a low arched roof in three slabs, its doors on the apron side (north): shut, or slid open on a
 * dark hall */
function hangar(b: Batch, r: Rect, open: boolean, low: boolean) {
  const [x0, z0, x1, z1] = r;
  const wall = HANGAR_H - 2.2;
  // (shut: one block; open: a shell you see into, its back and sides, dark inside, a ceiling and a floor)
  if (!open) box(b, x0, 0, z0 + 0.4, x1, wall, z1, CLAD);
  else {
    box(b, x0, 0, z1 - 0.4, x1, wall, z1, CLAD);
    for (const x of [x0, x1 - 0.4]) box(b, x, 0, z0 + 0.4, x + 0.4, wall, z1 - 0.4, CLAD);
    box(b, x0 + 0.4, 0.006, z1 - 0.45, x1 - 0.4, wall - 0.05, z1 - 0.4, DARK);
    for (const x of [x0 + 0.4, x1 - 0.45]) box(b, x, 0.006, z0 + 0.45, x + 0.05, wall - 0.05, z1 - 0.45, DARK);
    box(b, x0 + 0.4, wall - 0.3, z0 + 0.4, x1 - 0.4, wall, z1 - 0.4, DARK);
    box(b, x0 + 0.4, 0, z0 + 0.4, x1 - 0.4, 0.03, z1 - 0.4, CONCRETE_WALL);
  }
  // (the roof: a flat crown between two sloping halves, the gable ends filled)
  const w = z1 - z0;
  // (each half falling to its eave: the north one to the north, -x about x lowers +z)
  const slope = new THREE.BoxGeometry(x1 - x0 + 0.2, 0.3, w * 0.36);
  b.add(slope.clone().rotateX(-0.32).translate((x0 + x1) / 2, wall + 0.95, z0 + w * 0.17), HANGAR_ROOF);
  b.add(slope.rotateX(0.32).translate((x0 + x1) / 2, wall + 0.95, z1 - w * 0.17), HANGAR_ROOF);
  box(b, x0 - 0.3, HANGAR_H - 0.35, z0 + w * 0.33, x1 + 0.3, HANGAR_H, z1 - w * 0.33, HANGAR_ROOF);
  // (the gable ends: the roof's own line, from each eave up to the crown and down again; drawn in z, y and set
  // across x: a shape's x is -z once turned a quarter about y)
  const gable = new THREE.Shape([
    new THREE.Vector2(-z0, wall),
    new THREE.Vector2(-(z0 + w * 0.33), HANGAR_H - 0.35),
    new THREE.Vector2(-(z1 - w * 0.33), HANGAR_H - 0.35),
    new THREE.Vector2(-z1, wall),
  ]);
  const end = new THREE.ExtrudeGeometry(gable, { depth: 0.4, bevelEnabled: false }).rotateY(Math.PI / 2);
  for (const x of [x0, x1 - 0.4]) b.add(end.clone().translate(x, 0, 0), CLAD_DARK);
  // The doors' face: panels shut, or the hall open between the stacked panels at each side
  const dw = (x1 - x0 - 2) / 6;
  if (open) {
    // (the door panels slid aside, stacked at each end of the opening)
    for (const x of [x0 + 0.4, x1 - 0.4 - dw]) box(b, x, 0, z0 + 0.1, x + dw, wall - 0.5, z0 + 0.4, DOORS);
  } else for (let k = 0; k < 6; k++) box(b, x0 + 1 + k * dw + 0.05, 0, z0 + 0.1, x0 + 1 + (k + 1) * dw - 0.05, wall - 0.5, z0 + 0.4, DOORS);
  box(b, x0 + 0.8, wall - 0.5, z0 + 0.05, x1 - 0.8, wall, z0 + 0.4, CLAD_DARK);
  if (!low) b.detail(() => {
    // (a band of high windows along each side, the door tracks, a light over each door)
    box(b, x0 + 2, wall - 2.2, z1 + 0.02, x1 - 2, wall - 1.4, z1 + 0.06, GLASS);
    box(b, x0 + 0.5, 0, z0 - 0.4, x1 - 0.5, 0.06, z0 + 0.1, DOORS);
    for (let k = 0; k < 3; k++) box(b, x0 + 4 + k * ((x1 - x0 - 8) / 2) - 0.25, wall + 0.05, z0 - 0.2, x0 + 4 + k * ((x1 - x0 - 8) / 2) + 0.25, wall + 0.25, z0 + 0.05, light('#fff1d0'));
  });
}

/** The control tower: its base building, the shaft, the glass cab, the roof, its mast and beacon (top `TOWER_TOP`) */
function tower(b: Batch, low: boolean) {
  const [bx0, bz0, bx1, bz1] = TOWER_BASE;
  box(b, bx0, 0, bz0, bx1, 3.4, bz1, CONCRETE_WALL);
  box(b, bx0 - 0.2, 3.4, bz0 - 0.2, bx1 + 0.2, 3.6, bz1 + 0.2, CLAD_DARK);
  const [sx0, sz0, sx1, sz1] = TOWER_SHAFT;
  box(b, sx0, 3.6, sz0, sx1, 8.4, sz1, CONCRETE_WALL);
  const [x, z] = TOWER;
  // (the cab: wider than the shaft, glass all round, its roof overhanging)
  box(b, x - 2.6, 8.4, z - 2.6, x + 2.6, 8.7, z + 2.6, CLAD_DARK);
  box(b, x - 2.5, 8.7, z - 2.5, x + 2.5, 10.4, z + 2.5, GLASS);
  box(b, x - 2.9, 10.4, z - 2.9, x + 2.9, 10.75, z + 2.9, CLAD_DARK);
  cyl(b, 0.06, TOWER_TOP - 10.75 - 0.15, x + 1.6, 10.75, z + 1.6, CLAD_DARK, 6);
  box(b, x + 1.5, TOWER_TOP - 0.15, z + 1.5, x + 1.7, TOWER_TOP, z + 1.7, light('#ff2b2b'));
  if (!low) b.detail(() => {
    // (the cab's mullions, a door to the apron)
    for (const k of [-1.25, 0, 1.25]) for (const s of [-1, 1]) {
      box(b, x + k - 0.05, 8.7, z + s * 2.52 - 0.03, x + k + 0.05, 10.4, z + s * 2.52 + 0.03, CLAD_DARK);
      box(b, x + s * 2.52 - 0.03, 8.7, z + k - 0.05, x + s * 2.52 + 0.03, 10.4, z + k + 0.05, CLAD_DARK);
    }
    box(b, x - 0.8, 0, bz0 - 0.05, x + 0.8, 2.3, bz0, DARK);
  });
}

/** The fire station: three red doors on the apron, its name-less lamp over them */
function fireStation(b: Batch) {
  const [x0, z0, x1, z1] = FIRE_STATION;
  box(b, x0, 0, z0, x1, FIRE_H, z1, CONCRETE_WALL);
  box(b, x0 - 0.2, FIRE_H, z0 - 0.2, x1 + 0.2, FIRE_H + 0.25, z1 + 0.2, CLAD_DARK);
  const dw = (x1 - x0 - 3) / 3;
  for (let k = 0; k < 3; k++) box(b, x0 + 1 + k * (dw + 0.5), 0, z0 - 0.05, x0 + 1 + k * (dw + 0.5) + dw, 4, z0, FIRE_RED);
}

/** The fuel farm: its tanks inside a low bund wall, the pipes between */
function fuelFarm(b: Batch, low: boolean) {
  const [x0, z0, x1, z1] = FUEL_FARM;
  for (const [a, c] of [
    [[x0, z0], [x1, z0 + 0.4]],
    [[x0, z1 - 0.4], [x1, z1]],
    [[x0, z0], [x0 + 0.4, z1]],
    [[x1 - 0.4, z0], [x1, z1]],
  ] as [[number, number], [number, number]][])
    box(b, a[0], 0, a[1], c[0], BUND_H, c[1], CONCRETE_WALL);
  for (const [x, z, r, h] of FUEL_TANKS) {
    // (cyl's y is its foot: the shell, then its low cone of a roof)
    cyl(b, r, h, x, 0, z, TANK, low ? 12 : 20);
    cyl(b, r * 0.6, 0.4, x, h, z, PIPE, low ? 12 : 20, r * 0.98);
  }
  if (!low) b.detail(() => box(b, FUEL_TANKS[0][0], 0.6, FUEL_TANKS[0][1] - 0.15, FUEL_TANKS[4][0], 0.9, FUEL_TANKS[0][1] + 0.15, PIPE));
}

/** A hardened shelter: a low concrete arch, its back wall, its doors (south, onto its stub) */
function shelter(b: Batch, x: number, z: number, low: boolean) {
  const { w, d, h } = SHELTER;
  // (a half cylinder along z, flattened to its height)
  // (its half round +z, tipped back about x so that half stands up and its length runs along z)
  const arch = new THREE.CylinderGeometry(w / 2, w / 2, d, low ? 10 : 16, 1, true, -Math.PI / 2, Math.PI);
  arch.rotateX(-Math.PI / 2);
  arch.scale(1, h / (w / 2), 1);
  b.add(arch.translate(x, 0, z - d / 2), SHELTER_SKIN);
  // The back wall and the door's face: flat half-discs
  const face = new THREE.CircleGeometry(w / 2, low ? 10 : 16, 0, Math.PI).scale(1, h / (w / 2), 1);
  b.add(face.clone().rotateY(Math.PI).translate(x, 0, z - d + 0.05), SHELTER_SKIN);
  b.add(face.translate(x, 0, z - 0.05), SHELTER_DOOR);
  if (!low) b.detail(() => {
    for (const k of [-1, 1]) box(b, x + k * w * 0.02 - 0.06, 0, z - 0.03, x + k * w * 0.02 + 0.06, h * 0.92, z + 0.02, SHELTER_SKIN);
  });
}

/* ---------- What's parked (Phase 2) ---------- */

const ORANGE = toon('#ff8a3d');
const TYRE = toon('#1d1c26');
/** An apron vehicle: a tug (low, a cab at one end) or a fuel bowser (a cab and its tank), its nose along +x turned by yaw */
function vehicle(b: Batch, kind: 'tug' | 'bowser', x: number, z: number, yaw: number) {
  const g = new Batch();
  const [len, w] = kind === 'tug' ? [4.2, 2.2] : [7.5, 2.4];
  box(g, -len / 2, 0.45, -w / 2, len / 2, 1.2, w / 2, YELLOW);
  if (kind === 'tug') box(g, len / 2 - 1.4, 1.2, -w / 2 + 0.2, len / 2 - 0.1, 2.3, w / 2 - 0.2, GLASS);
  else {
    box(g, len / 2 - 2, 1.2, -w / 2 + 0.1, len / 2 - 0.1, 2.6, w / 2 - 0.1, YELLOW);
    box(g, len / 2 - 1.9, 1.9, -w / 2 + 0.05, len / 2 - 0.05, 2.5, w / 2 - 0.05, GLASS);
    cyl(g, 1.05, len - 2.6, 0, 0, 0, TANK, 14);
  }
  for (const [wx, wz] of [
    [-len / 2 + 0.9, -w / 2],
    [len / 2 - 0.9, -w / 2],
    [-len / 2 + 0.9, w / 2],
    [len / 2 - 0.9, w / 2],
  ])
    cyl(g, 0.45, 0.3, wx, 0, wz, TYRE, 10);
  // (the tank lies along x: turned from upright once its own cylinder's in, the rest as drawn)
  const grp = new THREE.Group();
  g.build(grp);
  grp.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const geo = m.geometry.clone();
    geo.rotateY(yaw).translate(x, 0, z);
    b.add(geo, m.material as THREE.Material);
  });
}
/** The windsock: a striped pole and its cone, blown out a little */
function windsock(b: Batch) {
  const [x, z] = WINDSOCK;
  cyl(b, 0.07, 4.2, x, 0, z, WHITE, 8);
  const cone = new THREE.CylinderGeometry(0.42, 0.18, 2.4, 10, 1, true).rotateZ(Math.PI / 2 - 0.25);
  b.add(cone.translate(x + 1.2, 3.85, z), ORANGE);
}

export function register({ low, scene, tick }: { low: boolean; scene?: THREE.Scene | null; tick?: (f: Tick) => void }) {
  for (let sx0 = FIELD[0]; sx0 < FIELD[2]; sx0 += STRIP) {
    const sx1 = sx0 + STRIP;
    site(`airbase field ${sx0}`, [sx0, FIELD[1], sx1, FIELD[3]], (into) => {
      const b = new Batch();
      runway(b, sx0, sx1, low);
      approach(b, sx0, sx1, low);
      taxiways(b, sx0, sx1, low);
      apron(b, sx0, sx1);
      b.build(into, { cast: false, receive: true });
    });
  }
  // The buildings, a site each (the shelters in their threes)
  HANGARS.forEach((r, i) =>
    site(`airbase hangar ${i}`, [r[0] - 1, r[1] - 1, r[2] + 1, r[3] + 1], (into) => {
      const b = new Batch();
      hangar(b, r, i === OPEN_HANGAR, low);
      b.build(into, { cast: true, receive: true });
    })
  );
  site('airbase tower', [TOWER_BASE[0] - 1, TOWER_BASE[1] - 1, TOWER_BASE[2] + 1, TOWER_BASE[3] + 1], (into) => {
    const b = new Batch();
    tower(b, low);
    b.build(into, { cast: true, receive: true });
  });
  site('airbase fire station', [FIRE_STATION[0] - 1, FIRE_STATION[1] - 1, FIRE_STATION[2] + 1, FIRE_STATION[3] + 1], (into) => {
    const b = new Batch();
    fireStation(b);
    b.build(into, { cast: true, receive: true });
  });
  site('airbase fuel farm', [FUEL_FARM[0] - 1, FUEL_FARM[1] - 1, FUEL_FARM[2] + 1, FUEL_FARM[3] + 1], (into) => {
    const b = new Batch();
    fuelFarm(b, low);
    b.build(into, { cast: true, receive: true });
  });
  site('airbase masts', [Math.min(...APRON_MASTS.map((p) => p[0])) - 3, Math.min(...APRON_MASTS.map((p) => p[1])) - 2, Math.max(...APRON_MASTS.map((p) => p[0])) + 3, Math.max(...APRON_MASTS.map((p) => p[1])) + 2], (into) => {
    const b = new Batch();
    // (a pole, a crossbar at its top, three lamps on it facing the apron, north)
    for (const [x, z] of APRON_MASTS) {
      cyl(b, 0.16, MAST_H - 0.6, x, 0, z, POLE, 8, 0.24);
      box(b, x - 2.2, MAST_H - 0.6, z - 0.15, x + 2.2, MAST_H - 0.35, z + 0.15, POLE);
      for (const dx of [-1.5, 0, 1.5]) box(b, x + dx - 0.45, MAST_H - 0.35, z - 0.35, x + dx + 0.45, MAST_H, z - 0.05, light('#fff1d0'));
    }
    b.build(into, { cast: true, receive: false });
  });
  site('airbase apron kit', [-480, -540, -200, -470], (into) => {
    const b = new Batch();
    for (const v of APRON_VEHICLES) vehicle(b, v.kind, ...v.at);
    windsock(b);
    b.build(into, { cast: true, receive: true });
  });
  for (let i = 0; i < SHELTERS.length; i += 3) {
    const three = SHELTERS.slice(i, i + 3);
    const xs = three.map((p) => p[0]);
    site(`airbase shelters ${i}`, [Math.min(...xs) - SHELTER.w / 2 - 1, Math.min(...three.map((p) => p[1])) - SHELTER.d - 1, Math.max(...xs) + SHELTER.w / 2 + 1, Math.max(...three.map((p) => p[1])) + 1], (into) => {
      const b = new Batch();
      for (const [x, z] of three) shelter(b, x, z, low);
      b.build(into, { cast: true, receive: true });
    });
  }
  // The parked aircraft, and the flying ones after them in the same fleets (Phase 4: no more draw calls): the airport's
  // fleets of each kind, in the base's greys, their titles left off (main thread only). On phones only the trainer flies
  if (!scene) return;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const moving: { fleet: ReturnType<typeof createFleet>; i: number; f: (typeof BASE_FLIGHTS)[number] }[] = [];
  const fleets: ReturnType<typeof createFleet>[] = [];
  for (const kind of ['freighter', 'prop', 'heli'] as const) {
    const mine = PARKED.filter((p) => p.kind === kind);
    const flying = BASE_FLIGHTS.filter((f) => f.kind === kind && !(low && kind === 'heli'));
    const f = createFleet(kind, [...mine.map((p) => p.livery), ...flying.map(() => '#7b8494')]);
    f.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if ((m.material as THREE.MeshToonMaterial).map && (m.material as THREE.Material).alphaTest > 0) m.visible = false;
      // (the painted parts all grey, the owner's call: the base's own copy of each, the airport's left as they are)
      const c = m.geometry.getAttribute('color');
      if (!c) return;
      const g = m.geometry.clone();
      const col = g.getAttribute('color') as THREE.BufferAttribute;
      for (let i = 0; i < col.count; i++) col.setXYZ(i, ...baseGrey(col.getX(i), col.getY(i), col.getZ(i)));
      col.needsUpdate = true;
      m.geometry = g;
    });
    mine.forEach(({ at: [x, z, yaw] }, i) => f.set(i, { x, y: 0, z, yaw, pitch: 0, roll: 0, v: 0, ground: true, gear: true, power: 0 }));
    flying.forEach((fl, k) => {
      moving.push({ fleet: f, i: mine.length + k, f: fl });
      f.set(mine.length + k, fl.parked);
    });
    f.update(0, 0);
    f.group.name = `airbase-${kind}`;
    scene.add(f.group);
    fleets.push(f);
  }
  // The flights on the clock (the same for everyone), while the camera's near; still at their stands under reduced motion
  if (reduced || !moving.length) return;
  const near = nearGate(500);
  tick?.(({ dt }) => {
    if (!near(...FIELD)) return;
    const t = Date.now() / 1000;
    for (const m of moving) m.fleet.set(m.i, poseAt(m.f, t));
    for (const f of fleets) f.update(t, dt);
  });
}
