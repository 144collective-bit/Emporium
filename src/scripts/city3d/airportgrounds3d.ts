/*
 * Sector 7 Airport's grounds (docs/airport-plan.md Phase 3), a district
 * loaded as you approach (districts.ts `airport`): everything at the airport
 * but the hall, Hangar 1, the tower and the aircraft (airport.ts, at the
 * boot), drawn from airfield.ts as sites.
 *
 * - The field in strips 30 across, west to east (`STRIP`), each drawing what
 *   of it stands there: the runway (shoulders, edge lines, centre line,
 *   threshold bars, its numbers, the touchdown zone's bars and the aiming
 *   points, edge lights white, threshold green, end red), the approach
 *   lights past its west end, the PAPI, the localizer's aerials past its
 *   east end, the parallel taxiway and connectors A to D (yellow centre
 *   lines, blue edge lights, hold-short bars and their signs), the aprons
 *   (concrete, joints, the stands' lead-in lines, stop bars, safety lines
 *   and numbers, the taxilane), the GA apron's helipads and the prop
 *   plane's line, the floodlight masts, the ground vehicles, the fence.
 * - The concourses (glass, roofs, the gates' numbers) and the airbridges, the
 *   maintenance hangar, the fire station and its engine, the fuel farm.
 * - Landside: Airport Drive and the forecourt's loop at the street, the
 *   short-stay car park; the departures deck (its slab on piers, lanes,
 *   kerb, parapets, ramps) with the arrivals level under it (the taxi rank,
 *   the bus bay and its shelter); the multi-storey car park; the hotel.
 * - The cargo area (step 3): the cargo apron's stands, the shed and its office
 *   on the fence line (docks landside, doors airside), the loader and the
 *   dollies; Cargo Road, the truck yard and its loop, the trucks.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, rng, siteMat, toon } from './kit';
import { site } from './tilework';
import {
  AIRBRIDGES,
  AIRSIDE,
  APPROACH,
  APRON,
  APRON_KIT,
  BUS_BAY,
  CARGO_APRON,
  CARGO_KIT,
  CARGO_OFFICE,
  CARGO_ROAD,
  CARGO_SHED,
  CARGO_STANDS,
  DOCKS,
  RIG,
  RIGS,
  YARD,
  rigRect,
  CAR_PARK,
  DEPARTURES,
  HOTEL,
  LOOP,
  MSCP,
  PIER,
  PIERS,
  RAMP_HALF,
  RANK,
  RANK_Z,
  CONCOURSES,
  CONNECTORS,
  CENTRE_LIGHTS,
  EXEC_PAD,
  FLAGS,
  FLAG_H,
  GATEWAY,
  HEDGES,
  BEDS,
  ROAD_SIGNS,
  SHRUBS,
  type SignText,
  FENCE,
  FENCE_H,
  FIRE,
  FUEL_TANKS,
  GA_APRON,
  GA_CAR_PARK,
  GA_GATE,
  GA_ROAD,
  HALL,
  HELIPAD,
  HOLD,
  LOCALIZER,
  MASTS,
  MRO,
  PAPI,
  PROP_STAND,
  ROAD,
  RUNWAY,
  STANDS,
  TAXILANE,
  TAXIWAY,
  type Pt,
  type Rect,
} from './airfield';
import { G, INK, MARK, PALE, ROOF, STEEL, TOP, WHITE, YELLOW, box, cyl, glazing, light, mark, soft } from './airportkit';
import { buildFx, chainMesh } from './grime';
import type { Tick } from './world';

export const SELF = import.meta.url;

const ASPHALT = toon('#2a2840');
const SHOULDER = toon('#34314d');
const TAXI_ASPHALT = toon('#302d48');
const CONCRETE = toon('#8a85aa');
const JOINT = toon('#7a7598');
const PAVING = toon('#7a7598');
const RED = toon('#e23b3b');
const CLAD = toon('#5a6fa8');
const BRICK = toon('#8a4a52');

/* ---------- Painted numbers, letters and signs: one atlas ---------- */

/**
 * The atlas: 8 cells a row, 128 square, `ROWS` rows. Row 0: the stands' numbers (yellow paint); row 1: the
 * taxiway letters (location signs, yellow on black) A to D, the runway's hold-short sign (white on red, 09-27),
 * the runway's numbers 09 and 27 (white paint), TAXI; rows 2 on: the buildings' and the roads' signs, a row each
 * over the whole width (MAINTENANCE, FIRE STATION, DEPARTURES, ARRIVALS, RUNWAY HOTEL, PARKING, AIRPORT BUS, SECTOR 7
 * CARGO); the last row cells again: the docks' numbers 1 to 6 (white on black) and the cargo stands' C1 and C2 (paint)
 */
const CELL = 1 / 8;
const ROWS = 11;
const ATLAS = (() => {
  const t = canvasTex(1024, ROWS * 128, (c) => {
    c.clearRect(0, 0, 1024, ROWS * 128);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (let k = 0; k < 8; k++) {
      c.font = `900 104px ${FONT_DISPLAY}`;
      c.fillStyle = '#ffd23f';
      c.fillText(String(k + 1), k * 128 + 64, 70);
    }
    const cell = (k: number, bg: string, fg: string, text: string, size: number) => {
      c.fillStyle = bg;
      c.fillRect(k * 128 + 4, 132, 120, 120);
      c.fillStyle = fg;
      c.font = `900 ${size}px ${FONT_DISPLAY}`;
      c.fillText(text, k * 128 + 64, 196);
    };
    ['A', 'B', 'C', 'D'].forEach((l, k) => cell(k, '#0b0a18', '#ffd23f', l, 96));
    cell(4, '#c8102e', '#ffffff', '09-27', 52);
    cell(7, '#0b0a18', '#ffd23f', 'TAXI', 50);
    c.font = `900 112px ${FONT_DISPLAY}`;
    c.fillStyle = '#e6e3f2';
    c.fillText('09', 5 * 128 + 64, 200);
    c.fillText('27', 6 * 128 + 64, 200);
    const row = (r: number, text: string, color: string) => {
      c.fillStyle = '#0b0a18';
      c.fillRect(0, (r + 2) * 128, 1024, 128);
      c.font = `900 96px ${FONT_DISPLAY}`;
      c.fillStyle = color;
      c.fillText(text, 512, (r + 2) * 128 + 70);
    };
    row(0, 'MAINTENANCE', '#00eaff');
    row(1, 'FIRE STATION', '#ff4d4d');
    row(2, 'DEPARTURES', '#ffffff');
    row(3, 'ARRIVALS', '#ffd23f');
    row(4, 'RUNWAY HOTEL', '#ff4fd8');
    row(5, 'P  PARKING', '#00eaff');
    row(6, 'AIRPORT BUS', '#7fe9ff');
    row(7, 'SECTOR 7 CARGO', '#ff8a3d');
    for (let k = 0; k < 8; k++) {
      const y = 10 * 128;
      if (k < 6) {
        c.fillStyle = '#0b0a18';
        c.fillRect(k * 128 + 4, y + 4, 120, 120);
      }
      c.font = `900 ${k < 6 ? 96 : 84}px ${FONT_DISPLAY}`;
      c.fillStyle = k < 6 ? '#ffffff' : '#ffd23f';
      c.fillText(k < 6 ? String(k + 1) : `C${k - 5}`, k * 128 + 64, y + 70);
    }
  });
  return t;
})();
/** Painted on the ground: cut out, lying flat */
const PAINT = siteMat('airport-paint', toon('#ffffff', { map: ATLAS, transparent: true, alphaTest: 0.4 }));
/** On boards and buildings: lit softly at night */
const SIGN = siteMat('airport-signs', lit(new THREE.MeshBasicMaterial({ map: ATLAS }), 0.95, 1.15));
/** A cell's UVs (u0, v0, u1, v1): `col` 0-7, `row` 0-1 (rows 2 on are the signs, whole width: `rowUv()`) */
const cellUv = (col: number, row: number): [number, number, number, number] => [col * CELL, 1 - (row + 1) / ROWS, (col + 1) * CELL, 1 - row / ROWS];
const rowUv = (row: number): [number, number, number, number] => [0, 1 - (row + 1) / ROWS, 1, 1 - row / ROWS];

/** A rectangle w x h with these UVs: lying flat (its top towards -z turned by `yaw`), or standing facing the way `yaw` turns +z */
function decal(b: Batch, mat: THREE.Material, uv: [number, number, number, number], x: number, y: number, z: number, w: number, h: number, yaw: number, lying: boolean) {
  const g = new THREE.PlaneGeometry(w, h);
  const a = g.attributes.uv;
  for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1]));
  if (lying) g.rotateX(-Math.PI / 2);
  g.rotateY(yaw).translate(x, y, z);
  b.add(g, mat);
}

/* ---------- The field, strip by strip ---------- */

/** The strips' width (a tile's), from the approach lights to the east fence */
const STRIP = 30;
const STRIPS_X0 = 66;
const STRIPS_X1 = AIRSIDE[2] + 2;

function alongMark(b: Batch, sx0: number, sx1: number, x0: number, x1: number, z0: number, z1: number, mat: THREE.Material, y = MARK) {
  const a = Math.max(x0, sx0);
  const c = Math.min(x1, sx1);
  if (c - a > 0.01) mark(b, a, z0, c, z1, mat, y);
}

function runway(b: Batch, sx0: number, sx1: number, low: boolean) {
  const { x0, x1, z, half } = RUNWAY;
  const inS = (x: number) => x >= sx0 && x < sx1;
  // Asphalt and its shoulders, in pieces no longer than 15 (each piece's triangles stay in its tile)
  for (let a = Math.max(x0 - 2, sx0); a < Math.min(x1 + 6, sx1); a += 15) {
    const c = Math.min(a + 15, x1 + 6, sx1);
    box(b, a, 0.002, z - half - 1.6, c, 0.022, z + half + 1.6, SHOULDER);
    if (a < x1 && c > x0) box(b, Math.max(a, x0), G, z - half, Math.min(c, x1), TOP, z + half, ASPHALT);
  }
  // Edge lines and the centre line's dashes
  for (const s of [-1, 1]) alongMark(b, sx0, sx1, x0 + 0.5, x1 - 0.5, z + s * (half - 0.4) - 0.14, z + s * (half - 0.4) + 0.14, WHITE);
  for (let x = x0 + 28; x < x1 - 28; x += 7) if (inS(x)) mark(b, x, z - 0.16, x + 3.8, z + 0.16, WHITE);
  for (const [end, dir] of [
    [x0, 1],
    [x1, -1],
  ] as const) {
    // Threshold bars: six either side of the centre line
    if (inS(end + dir * 3))
      for (const s of [-1, 1])
        for (let k = 0; k < 6; k++) {
          const zz = z + s * (0.7 + k * 0.62);
          mark(b, Math.min(end + dir * 1, end + dir * 7), zz, Math.max(end + dir * 1, end + dir * 7), zz + s * 0.36, WHITE);
        }
    // The runway's number, read from the approach: 09 at the west end, 27 at the east
    if (inS(end + dir * 12)) decal(b, PAINT, cellUv(dir === 1 ? 5 : 6, 1), end + dir * 12, MARK + 0.002, z, 6.4, 6.4, dir === 1 ? -Math.PI / 2 : Math.PI / 2, true);
    // The touchdown zone: pairs of bars, three, two, one
    for (const [d, n] of [
      [22, 3],
      [38, 2],
      [62, 1],
    ] as const) {
      if (!inS(end + dir * d)) continue;
      for (const s of [-1, 1])
        for (let k = 0; k < n; k++) {
          const zz = z + s * (1.3 + k * 0.6);
          mark(b, Math.min(end + dir * d, end + dir * (d + 4)), zz, Math.max(end + dir * d, end + dir * (d + 4)), zz + s * 0.32, WHITE);
        }
    }
    // The aiming point: two broad bars
    if (inS(end + dir * 48)) for (const s of [-1, 1]) mark(b, Math.min(end + dir * 46, end + dir * 54), z + s * 1.4 - 0.5, Math.max(end + dir * 46, end + dir * 54), z + s * 1.4 + 0.5, WHITE);
  }
  // Edge lights (white), the threshold's (green) and the end's (red)
  const bulb = (x: number, zz: number, c: string) => {
    box(b, x - 0.06, 0, zz - 0.06, x + 0.06, 0.18, zz + 0.06, STEEL);
    box(b, x - 0.1, 0.18, zz - 0.1, x + 0.1, 0.3, zz + 0.1, light(c));
  };
  for (let x = x0 + 2; x <= x1 - 2; x += low ? 12 : 8) if (inS(x)) for (const s of [-1, 1]) bulb(x, z + s * (half + 0.5), '#fff6c8');
  // Centreline lights set flush in the asphalt, either side of the painted dashes: white, then red and white in turn
  // towards the far (east) end, red over the last stretch
  const C = CENTRE_LIGHTS;
  for (let x = x0 + 6, k = 0; x <= x1 - 4; x += C.runway, k++) {
    if (!inS(x)) continue;
    const left = x1 - x;
    const c = left < C.end ? '#ff2b2b' : left < C.far && k % 2 ? '#ff2b2b' : '#fff6c8';
    flush(b, x, z + 0.42, c);
  }
  for (let k = -half + 0.5; k <= half - 0.5; k += 1) {
    if (inS(x0 - 0.5)) bulb(x0 - 0.5, z + k, '#2bff88');
    if (inS(x1 + 0.5)) bulb(x1 + 0.5, z + k, '#ff2b2b');
  }
  // Approach lights: poles out past the threshold, a crossbar every 6
  for (let x = APPROACH.x0; x <= APPROACH.x1; x += 2) {
    if (!inS(x)) continue;
    const tall = 0.35 + (APPROACH.x1 - x) * 0.04;
    box(b, x - 0.06, 0, z - 0.06, x + 0.06, tall, z + 0.06, STEEL);
    const w = Math.round(x - APPROACH.x0) % 6 === 0 ? 2.8 : 0.6;
    box(b, x - 0.05, tall, z - w / 2, x + 0.05, tall + 0.06, z + w / 2, STEEL);
    for (let k = -w / 2 + 0.15; k <= w / 2 - 0.1; k += 0.4) box(b, x - 0.09, tall + 0.06, z + k - 0.07, x + 0.09, tall + 0.18, z + k + 0.07, light('#fff6c8'));
  }
  // The PAPI: four boxes beside the touchdown zone, two white, two red
  if (inS(PAPI.x))
    for (let k = 0; k < 4; k++) {
      const zz = PAPI.z - k * 1.1;
      box(b, PAPI.x - 0.35, 0, zz - 0.3, PAPI.x + 0.35, 0.45, zz + 0.3, STEEL);
      box(b, PAPI.x + 0.35, 0.15, zz - 0.18, PAPI.x + 0.4, 0.4, zz + 0.18, light(k < 2 ? '#fff6c8' : '#ff2b2b'));
    }
  // The localizer: a row of aerials across the line past the far end, on a frame
  if (inS(LOCALIZER.x)) {
    const { x, z: lz, w, h } = LOCALIZER;
    box(b, x - 0.15, 0, lz - w / 2, x + 0.15, 0.2, lz + w / 2, STEEL);
    for (let k = -w / 2 + 0.5; k <= w / 2 - 0.4; k += 1) {
      box(b, x - 0.04, 0.2, lz + k - 0.04, x + 0.04, h, lz + k + 0.04, PALE);
      box(b, x - 0.04, h - 0.1, lz + k - 0.35, x + 0.04, h - 0.04, lz + k + 0.35, PALE);
    }
    box(b, x - 0.12, h, lz - w / 2, x + 0.12, h + 0.08, lz + w / 2, light('#ff2b2b'));
  }
}

/** A light set flush in the pavement: a low steel rim and the lens */
function flush(b: Batch, x: number, z: number, c: string) {
  box(b, x - 0.1, TOP - 0.004, z - 0.1, x + 0.1, TOP + 0.03, z + 0.1, STEEL);
  box(b, x - 0.06, TOP + 0.03, z - 0.06, x + 0.06, TOP + 0.06, z + 0.06, light(c));
}

function taxiways(b: Batch, sx0: number, sx1: number, low: boolean) {
  const inS = (x: number) => x >= sx0 && x < sx1;
  const T = TAXIWAY;
  const R = RUNWAY;
  // Green centreline lights along the taxiway (just off its painted line), and on the connectors down to the runway
  // green and amber in turn (they cross the runway's protected area); a red stop bar across each at the hold line
  const C = CENTRE_LIGHTS;
  for (let x = T.x0 + 3; x <= T.x1 - 2; x += low ? C.taxi * 2 : C.taxi) if (inS(x)) flush(b, x, T.z + 0.3, '#2bff88');
  CONNECTORS.forEach((cx, i) => {
    if (!inS(cx)) return;
    const from = i === 0 ? TAXILANE.z : T.z;
    let k = 0;
    for (let zz = from + 3; zz < R.z - R.half - 0.5; zz += 3, k++) flush(b, cx + 0.3, zz, k % 2 ? '#ffb000' : '#2bff88');
    for (let dx = -T.half + 0.5; dx <= T.half - 0.4; dx += 0.7) flush(b, cx + dx, R.z - R.half - 4.6, '#ff2b2b');
  });
  for (let a = Math.max(T.x0 - T.half, sx0); a < Math.min(T.x1 + T.half, sx1); a += 15)
    box(b, a, G, T.z - T.half, Math.min(a + 15, T.x1 + T.half, sx1), TOP, T.z + T.half, TAXI_ASPHALT);
  alongMark(b, sx0, sx1, T.x0, T.x1, T.z - 0.08, T.z + 0.08, YELLOW);
  // The taxilane's centre line across the aprons
  alongMark(b, sx0, sx1, TAXILANE.x0, TAXILANE.x1, TAXILANE.z - 0.08, TAXILANE.z + 0.08, YELLOW, TOP + 0.004);
  // Connectors down to the runway: A from the taxilane, the rest from the taxiway; a hold-short bar (two solid, two
  // dashed) and a sign before each, red with the runway's numbers, and its letter in yellow on black
  CONNECTORS.forEach((cx, i) => {
    if (!inS(cx)) return;
    const from = i === 0 ? TAXILANE.z : T.z;
    box(b, cx - T.half, G, from, cx + T.half, TOP, R.z - R.half, TAXI_ASPHALT);
    mark(b, cx - 0.08, from, cx + 0.08, R.z - R.half, YELLOW);
    const hz = R.z - R.half - 4;
    for (const [k, solid] of [
      [0, true],
      [0.45, true],
      [1.1, false],
      [1.55, false],
    ] as const) {
      if (solid) mark(b, cx - T.half + 0.2, hz - k - 0.14, cx + T.half - 0.2, hz - k, YELLOW);
      else for (let x = cx - T.half + 0.2; x < cx + T.half - 0.4; x += 0.9) mark(b, x, hz - k - 0.14, x + 0.5, hz - k, YELLOW);
    }
    // The signs on the connector's west side, facing the way in (north)
    const sz = (i === 0 ? HOLD.z : hz) - 1.6;
    const sx = cx - T.half - 1.4;
    box(b, sx - 1.3, 0, sz - 0.12, sx + 1.3, 0.12, sz + 0.12, STEEL);
    for (const dx of [-0.9, 0.9]) box(b, sx + dx - 0.04, 0.12, sz - 0.04, sx + dx + 0.04, 0.5, sz + 0.04, STEEL);
    box(b, sx - 1.25, 0.5, sz - 0.1, sx + 1.25, 1.15, sz + 0.06, INK);
    decal(b, SIGN, cellUv(4, 1), sx - 0.6, 0.83, sz - 0.11, 1.2, 0.6, Math.PI, false);
    decal(b, SIGN, cellUv(i, 1), sx + 0.6, 0.83, sz - 0.11, 0.6, 0.6, Math.PI, false);
  });
  // Blue edge lights along the taxiway (not across the connectors)
  for (let x = T.x0 + 2; x <= T.x1 - 2; x += low ? 12 : 8) {
    if (!inS(x) || CONNECTORS.some((c) => Math.abs(x - c) < T.half + 1)) continue;
    for (const s of [-1, 1]) {
      const zz = T.z + s * (T.half + 0.3);
      box(b, x - 0.05, 0, zz - 0.05, x + 0.05, 0.16, zz + 0.05, STEEL);
      box(b, x - 0.09, 0.16, zz - 0.09, x + 0.09, 0.27, zz + 0.09, light('#2a8bff'));
    }
  }
}

function aprons(b: Batch, sx0: number, sx1: number) {
  const inS = (x: number) => x >= sx0 && x < sx1;
  for (const [x0, z0, x1, z1] of [APRON, GA_APRON, CARGO_APRON]) {
    for (let a = Math.max(x0, sx0); a < Math.min(x1, sx1); a += 15) box(b, a, G, z0, Math.min(a + 15, x1, sx1), TOP - 0.002, z1, CONCRETE);
    // Expansion joints every 6
    for (let x = Math.ceil(x0 / 6) * 6; x < x1; x += 6) if (inS(x)) mark(b, x - 0.03, z0, x + 0.03, z1, JOINT, TOP);
    for (let zz = z0 + 6; zz < z1; zz += 6) alongMark(b, sx0, sx1, x0, x1, zz - 0.03, zz + 0.03, JOINT, TOP);
  }
  // The stands: a lead-in line from the taxilane to the stop bar, red safety lines, the stand's number
  STANDS.forEach(([sx, sz], k) => {
    if (!inS(sx)) return;
    mark(b, sx - 0.09, sz - 9.5, sx + 0.09, TAXILANE.z, YELLOW);
    mark(b, sx - 1.2, sz - 9.9, sx + 1.2, sz - 9.6, YELLOW);
    for (const s of [-1, 1]) mark(b, sx + s * 10.2 - 0.07, sz - 10.5, sx + s * 10.2 + 0.07, sz + 11, RED);
    decal(b, PAINT, cellUv(k, 0), sx + 3.2, MARK + 0.002, sz + 9, 2.6, 2.6, 0, true);
  });
  // The cargo stands (step 3): the same, their lead-ins in from the taxiway, C1 and C2; the cargo lane the freighter is
  // pushed back onto, across from the passenger apron
  CARGO_STANDS.forEach(([sx, sz], k) => {
    if (!inS(sx)) return;
    for (let z = sz - 9.5; z < TAXIWAY.z - TAXIWAY.half - 0.01; z += 15) mark(b, sx - 0.09, z, sx + 0.09, Math.min(z + 15, TAXIWAY.z - TAXIWAY.half), YELLOW);
    mark(b, sx - 1.2, sz - 9.9, sx + 1.2, sz - 9.6, YELLOW);
    for (const s of [-1, 1]) mark(b, sx + s * 10.2 - 0.07, sz - 10.5, sx + s * 10.2 + 0.07, sz + 11, RED);
    decal(b, PAINT, cellUv(6 + k, 10), sx + 3.2, MARK + 0.002, sz + 9, 2.6, 2.6, 0, true);
  });
  alongMark(b, sx0, sx1, CARGO_APRON[0], CARGO_STANDS[0][0], CARGO_STANDS[0][1] + 24 - 0.08, CARGO_STANDS[0][1] + 24 + 0.08, YELLOW);
  // The prop plane's line in from the taxilane
  if (inS(PROP_STAND[0])) mark(b, PROP_STAND[0] - 0.08, PROP_STAND[1], PROP_STAND[0] + 0.08, TAXILANE.z, YELLOW);
}

/** A pad on the GA apron: the helipad, and the executive helicopter's (finance plan Phase 6) */
function helipad(b: Batch, { x, z, r }: { x: number; z: number; r: number }) {
  b.add(new THREE.CylinderGeometry(r, r, 0.04, 32).translate(x, TOP + 0.01, z), toon('#3a3658'));
  b.add(new THREE.RingGeometry(r - 0.45, r - 0.25, 32).rotateX(-Math.PI / 2).translate(x, TOP + 0.035, z), WHITE);
  for (const s of [-1, 1]) mark(b, x + s * 0.9 - 0.18, z - 1.3, x + s * 0.9 + 0.18, z + 1.3, YELLOW, TOP + 0.036);
  mark(b, x - 0.9, z - 0.18, x + 0.9, z + 0.18, YELLOW, TOP + 0.036);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const [px, pz] = [x + Math.cos(a) * (r + 0.2), z + Math.sin(a) * (r + 0.2)];
    box(b, px - 0.08, 0, pz - 0.08, px + 0.08, 0.16, pz + 0.08, light('#2bff88'));
  }
}

/** Ground vehicles parked between the stands, and the floodlight masts */
function apronKit(b: Batch, sx0: number, sx1: number) {
  const inS = (x: number) => x >= sx0 && x < sx1;
  for (const k of APRON_KIT) {
    const [x, z] = k.at;
    if (!inS(x)) continue;
    const parts: [number, number, number, number, number, number, THREE.Material][] = [];
    if (k.kind === 'fuel') {
      parts.push([0.9, 0.35, -0.5, 1.6, 1.5, 0.5, RED], [-1.6, 0.35, -0.55, 0.9, 1.35, 0.55, WHITE]);
      b.add(new THREE.CylinderGeometry(0.55, 0.55, 2.4, 14).rotateZ(Math.PI / 2).translate(-0.3, 1.0, 0).rotateY(k.yaw).translate(x, 0, z), WHITE);
    } else if (k.kind === 'tug') {
      parts.push([1.4, 0.2, -0.45, 2.3, 0.8, 0.45, YELLOW], [1.6, 0.8, -0.4, 2.1, 1.3, 0.4, INK]);
      for (const c of [0, 1, 2]) parts.push([-0.9 - c * 1.25, 0.25, -0.45, 0.2 - c * 1.25, 0.95, 0.45, toon(['#8a86a8', '#2aabee', '#8a86a8'][c])]);
    } else if (k.kind === 'bus') {
      // An apron bus: long, low, glass all round
      parts.push([-2.6, 0.3, -0.75, 2.6, 1.0, 0.75, toon('#2aabee')], [-2.5, 1.0, -0.72, 2.5, 1.7, 0.72, toon('#26315f')], [-2.6, 1.7, -0.75, 2.6, 1.85, 0.75, WHITE]);
    } else {
      parts.push([0.3, 0.2, -0.5, 1.3, 0.9, 0.5, WHITE], [0.5, 0.9, -0.45, 1.2, 1.45, 0.45, INK]);
      b.add(new THREE.BoxGeometry(2.0, 0.12, 0.9).rotateZ(-0.62).translate(-0.4, 1.3, 0).rotateY(k.yaw).translate(x, 0, z), PALE);
    }
    for (const [a0, y0, c0, a1, y1, c1, m] of parts)
      b.add(
        new THREE.BoxGeometry(a1 - a0, y1 - y0, c1 - c0)
          .translate((a0 + a1) / 2, (y0 + y1) / 2, (c0 + c1) / 2)
          .rotateY(k.yaw)
          .translate(x, 0, z),
        m
      );
    for (const wx of k.kind === 'bus' ? [-1.8, 1.8] : [-1.2, 0.2, 1.4])
      for (const s of [-1, 1])
        b.add(
          new THREE.CylinderGeometry(0.24, 0.24, 0.14, 10)
            .rotateX(Math.PI / 2)
            .translate(wx, 0.24, s * (k.kind === 'bus' ? 0.75 : 0.5))
            .rotateY(k.yaw)
            .translate(x, 0, z),
          toon('#17151f')
        );
  }
  for (const [x, z, f] of MASTS) {
    if (!inS(x)) continue;
    cyl(b, 0.16, 8, x, 0, z, STEEL, 8, 0.22);
    box(b, x - 1.2, 8, z - 0.25, x + 1.2, 8.5, z + 0.25, INK);
    // (the lamps on the side the mast lights)
    for (const dx of [-0.8, 0, 0.8]) box(b, x + dx - 0.22, 7.95, z + Math.min(f * 0.05, f * 0.4), x + dx + 0.22, 8.05, z + Math.max(f * 0.05, f * 0.4), light('#fff6c8'));
  }
}

/** The fence's posts, rail and barbed top in the strip; its mesh in the FX layer */
function fence(b: Batch, fxb: Batch, sx0: number, sx1: number) {
  for (const { a, b: c } of FENCE) {
    const x0 = Math.max(Math.min(a[0], c[0]), sx0);
    const x1 = Math.min(Math.max(a[0], c[0]), sx1);
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (a[0] === c[0]) {
      // A run along z: drawn by the strip it stands in
      if (a[0] < sx0 || a[0] >= sx1) continue;
    } else if (x1 - x0 < 0.01) continue;
    const at = (f: number): Pt => [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f];
    const f0 = a[0] === c[0] ? 0 : (x0 - a[0]) / (c[0] - a[0]);
    const f1 = a[0] === c[0] ? 1 : (x1 - a[0]) / (c[0] - a[0]);
    const [p, q] = [at(Math.min(f0, f1)), at(Math.max(f0, f1))];
    const run = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (run < 0.01 || len < 0.01) continue;
    const n = Math.max(1, Math.round(run / 3));
    for (let k = 0; k <= n; k++) {
      const [x, z] = [p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n];
      box(b, x - 0.05, 0, z - 0.05, x + 0.05, FENCE_H + 0.25, z + 0.05, STEEL);
    }
    // The top rail and the barbed wire leaning out
    const rail = (y: number, w: number) =>
      p[0] === q[0] ? box(b, p[0] - w, y, p[1], p[0] + w, y + 0.05, q[1], STEEL) : box(b, p[0], y, p[1] - w, q[0], y + 0.05, p[1] + w, STEEL);
    rail(FENCE_H - 0.05, 0.03);
    rail(FENCE_H + 0.2, 0.02);
    chainMesh(fxb, p, q, 0.02, FENCE_H - 0.07);
  }
}

/**
 * A shallow barrel roof: an arc `rise` high over a span `W`, running `len` along x or z from its middle, its
 * springing line at `y`, and the ends closed with the arc's segment
 */
function barrel(b: Batch, cx: number, cz: number, along: 'x' | 'z', len: number, W: number, rise: number, y: number, mat: THREE.Material) {
  const R = (W * W) / (8 * rise) + rise / 2;
  const half = Math.asin(W / 2 / R);
  // Around y, centred on +x (the arc's top after the turn), then laid along x or z
  const arc = new THREE.CylinderGeometry(R, R, len, 20, 1, true, Math.PI / 2 - half, 2 * half);
  arc.rotateZ(Math.PI / 2).translate(0, y + rise - R, 0);
  const seg = new THREE.Shape();
  for (let k = 0; k <= 16; k++) {
    const a = -half + (2 * half * k) / 16;
    seg[k ? 'lineTo' : 'moveTo'](Math.sin(a) * R, y + rise - R + Math.cos(a) * R);
  }
  // (the segment in x, y: turned to face along x it spans z)
  const end = (sx: number) => new THREE.ShapeGeometry(seg).rotateY(sx > 0 ? Math.PI / 2 : -Math.PI / 2).translate((sx * len) / 2, 0, 0);
  for (const g of [arc, end(1), end(-1)]) {
    if (along === 'z') g.rotateY(Math.PI / 2);
    b.add(g.translate(cx, 0, cz), mat);
  }
}

/* ---------- The concourses and airbridges ---------- */

function concourses(b: Batch, low: boolean) {
  for (const [x0, z0, x1, z1, H] of CONCOURSES) {
    box(b, x0 + 0.05, 0, z0 + 0.25, x1 - 0.05, H - 0.4, z1 - 0.25, toon('#2b2848'));
    // The landside wall: pale cladding with a band of windows; the airside: glass, two storeys, piers between
    box(b, x0, 0, z0, x1, H - 0.3, z0 + 0.3, PALE);
    glazing(b, x0 + 0.6, z0 - 0.02, x1 - 0.6, z0 - 0.02, H / 2, 1.1, 1);
    glazing(b, x0 + 0.6, z1 - 0.15, x1 - 0.6, z1 - 0.15, 0.05, H - 0.45, -1);
    for (let x = x0; x <= x1; x += 13) box(b, Math.min(x, x1 - 0.6), 0, z1 - 0.4, Math.min(x, x1 - 0.6) + 0.6, H - 0.3, z1 + 0.06, PALE);
    for (const x of [x0, x1 - 0.6]) box(b, x, 0, z0, x + 0.6, H - 0.3, z1, PALE);
    // A shallow barrel roof with a lit edge on the airside
    barrel(b, (x0 + x1) / 2, (z0 + z1) / 2, 'x', x1 - x0 + 0.6, z1 - z0, 1.7, H - 0.4, ROOF);
    box(b, x0 - 0.2, H - 0.42, z1 + 0.05, x1 + 0.2, H - 0.34, z1 + 0.12, soft('#00eaff'));
    if (!low) for (let x = x0 + 6; x < x1 - 4; x += 16) box(b, x, H + 0.6, (z0 + z1) / 2 - 1, x + 2.4, H + 1.2, (z0 + z1) / 2 + 1, STEEL);
  }
  // The gates' numbers over the airside doors (the hall's three too), lit
  STANDS.forEach(([sx], k) => {
    const H = CONCOURSES.some((c) => sx > c[0] && sx < c[2]) ? CONCOURSES[0][4] : HALL[4];
    box(b, sx - 4.6, H - 1.6, HALL[3] + 0.06, sx - 2.6, H - 0.6, HALL[3] + 0.16, INK);
    decal(b, SIGN, cellUv(k, 0), sx - 3.6, H - 1.1, HALL[3] + 0.17, 0.95, 0.95, 0, false);
  });
}

/** Airbridges: a tunnel out from the terminal and a cab turned to the jet's front door, on a wheeled leg */
function airbridges(b: Batch) {
  for (const a of AIRBRIDGES) {
    const y0 = 2.1;
    box(b, a.x - 0.8, y0, a.z0 - 0.1, a.x + 0.8, y0 + 1.9, a.z1 - 0.7, toon('#9a95bb'));
    box(b, a.x - 0.82, y0 + 0.9, a.z0, a.x + 0.82, y0 + 1.5, a.z1 - 0.8, toon('#26315f'));
    box(b, a.x - 0.9, y0 - 0.05, a.z1 - 1.5, a.x + 1.85, y0 + 2.0, a.z1, toon('#7a7598'));
    box(b, a.x + 1.85, y0 + 0.1, a.z1 - 1.3, a.x + 1.95, y0 + 1.9, a.z1 - 0.2, INK);
    box(b, a.x - 0.25, 0, a.z1 - 1.1, a.x + 0.25, y0, a.z1 - 0.5, STEEL);
    for (const s of [-1, 1]) cyl(b, 0.28, 0.2, a.x + s * 0.35, 0.28, a.z1 - 0.8, toon('#17151f'), 12);
  }
}

/* ---------- The maintenance hangar, the fire station, the fuel farm ---------- */

function mro(b: Batch) {
  const [x0, z0, x1, z1, H] = MRO;
  const wallH = H - 2.2;
  box(b, x0, 0, z0, x1, wallH, z1, CLAD);
  // Ribbed cladding: a rib every 2
  for (let z = z0 + 1; z < z1; z += 2) for (const x of [x0 - 0.06, x1 - 0.02]) box(b, x, 0, z - 0.06, x + 0.08, wallH, z + 0.06, toon('#4f6398'));
  // A low curved roof
  barrel(b, (x0 + x1) / 2, (z0 + z1) / 2, 'z', z1 - z0 + 0.6, x1 - x0, 2.4, wallH, toon('#d6d2ea'));
  // The doors on the south: panels with a band of windows, a yellow stripe over them, the sign
  const doorTop = wallH - 0.9;
  box(b, x0 + 1, 0, z1 - 0.02, x1 - 1, doorTop, z1 + 0.12, toon('#8a86a8'));
  for (let x = x0 + 1; x < x1 - 1.1; x += (x1 - x0 - 2) / 6) {
    box(b, x + 0.02, 0, z1 + 0.12, x + 0.1, doorTop, z1 + 0.16, INK);
    box(b, x + 0.6, doorTop - 1.4, z1 + 0.12, x + (x1 - x0 - 2) / 6 - 0.5, doorTop - 0.8, z1 + 0.16, toon('#26315f'));
  }
  box(b, x0 + 1, doorTop, z1 + 0.05, x1 - 1, doorTop + 0.25, z1 + 0.2, YELLOW);
  box(b, (x0 + x1) / 2 - 8.2, doorTop + 0.35, z1 + 0.02, (x0 + x1) / 2 + 8.2, doorTop + 1.6, z1 + 0.14, INK);
  decal(b, SIGN, rowUv(2), (x0 + x1) / 2, doorTop + 0.97, z1 + 0.15, 16, 2, 0, false);
}

function fireStation(b: Batch) {
  const [x0, z0, x1, z1, H] = FIRE;
  box(b, x0, 0, z0, x1, H, z1, BRICK);
  box(b, x0 - 0.1, H, z0 - 0.1, x1 + 0.1, H + 0.3, z1 + 0.1, PALE);
  // Three bays on the runway side, red doors with windows
  const bay = (x1 - x0 - 4) / 3;
  for (let k = 0; k < 3; k++) {
    const x = x0 + 2 + k * bay;
    box(b, x + 0.3, 0, z1 - 0.02, x + bay - 0.3, H - 0.8, z1 + 0.1, RED);
    for (let y = 0.6; y < H - 1; y += 0.75) box(b, x + 0.5, y, z1 + 0.1, x + bay - 0.5, y + 0.06, z1 + 0.14, toon('#a3121f'));
    box(b, x + 0.7, H - 1.9, z1 + 0.1, x + bay - 0.7, H - 1.4, z1 + 0.14, toon('#26315f'));
  }
  // The hose tower at the back, its lantern
  box(b, x1 - 4, 0, z0, x1 - 0.5, H + 3.2, z0 + 3.5, BRICK);
  box(b, x1 - 4.1, H + 3.2, z0 - 0.1, x1 - 0.4, H + 3.5, z0 + 3.6, PALE);
  box(b, x1 - 2.6, H + 3.5, z0 + 1.4, x1 - 1.9, H + 3.9, z0 + 2.1, light('#ff2b2b'));
  // The sign over the doors
  box(b, (x0 + x1) / 2 - 6.2, H - 0.75, z1 + 0.1, (x0 + x1) / 2 + 6.2, H - 0.05, z1 + 0.2, INK);
  decal(b, SIGN, rowUv(3), (x0 + x1) / 2, H - 0.4, z1 + 0.21, 12, 0.66, 0, false);
  // A crash tender on the apron in front: low, red, six wheels, a monitor on its roof
  const [ex, ez] = [x0 + 2 + bay * 0.5, z1 + 5];
  box(b, ex - 1.1, 0.4, ez - 2.6, ex + 1.1, 1.9, ez + 2.4, RED);
  box(b, ex - 1.0, 1.2, ez - 2.65, ex + 1.0, 1.75, ez - 2.55, toon('#26315f'));
  box(b, ex - 1.12, 0.8, ez - 2.0, ex + 1.12, 0.95, ez + 2.0, WHITE);
  box(b, ex - 0.25, 1.9, ez - 1.6, ex + 0.25, 2.25, ez - 0.6, STEEL);
  box(b, ex - 0.6, 1.9, ez - 2.4, ex + 0.6, 2.0, ez - 2.1, light('#2a8bff'));
  for (const zz of [-1.7, 0, 1.7]) for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12).rotateZ(Math.PI / 2).translate(ex + s * 1.1, 0.42, ez + zz), toon('#17151f'));
}

function fuelFarm(b: Batch) {
  for (const { x, z, r, h } of FUEL_TANKS) {
    cyl(b, r, h, x, 0, z, WHITE, 24);
    b.add(new THREE.CylinderGeometry(r - 0.4, r, 0.5, 24).translate(x, h + 0.25, z), PALE);
    for (const y of [h * 0.33, h * 0.66]) b.add(new THREE.TorusGeometry(r + 0.02, 0.05, 4, 24).rotateX(Math.PI / 2).translate(x, y, z), STEEL);
    // A ladder up the side and a red band
    box(b, x - 0.3, 0, z + r - 0.05, x + 0.3, h + 0.5, z + r + 0.15, STEEL);
    b.add(new THREE.CylinderGeometry(r + 0.03, r + 0.03, 0.4, 24, 1, true).translate(x, h - 0.6, z), RED);
  }
  // The bund wall round them, and a pipe run along the front
  const [x0, x1] = [FUEL_TANKS[0].x - FUEL_TANKS[0].r - 1.5, FUEL_TANKS.at(-1)!.x + FUEL_TANKS.at(-1)!.r + 1.2];
  const [z0, z1] = [FUEL_TANKS[0].z - FUEL_TANKS[0].r - 1.5, FUEL_TANKS[0].z + FUEL_TANKS[0].r + 1.5];
  box(b, x0, 0, z0, x1, 0.6, z0 + 0.3, PALE);
  box(b, x0, 0, z1 - 0.3, x1, 0.6, z1, PALE);
  box(b, x0, 0, z0, x0 + 0.3, 0.6, z1, PALE);
  box(b, x0, G, z0, x1, TOP, z1, PAVING);
  box(b, x0, 0.8, z1 + 0.6, x1 - 2, 1.0, z1 + 0.8, STEEL);
}

/* ---------- Landside ---------- */

const TAR = toon('#2a2840');
const DECK = toon('#9d98bd');
const GREEN = toon('#3d7a55');

/** A box cut into pieces no longer than `step` along x and z (each piece's triangles stay in a tile: tileBatch()) */
function boxes(b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material, step = 15) {
  for (let x = x0; x < x1 - 1e-6; x += step) for (let z = z0; z < z1 - 1e-6; z += step) box(b, x, y0, z, Math.min(x + step, x1), y1, Math.min(z + step, z1), mat);
}
/** An arrow painted on the road at x, z (`y` its height), pointing along (dx, dz) */
function arrow(b: Batch, x: number, y: number, z: number, dx: number, dz: number) {
  const s = new THREE.Shape([new THREE.Vector2(-1.1, 0.09), new THREE.Vector2(0.2, 0.09), new THREE.Vector2(0.2, 0.42), new THREE.Vector2(0.95, 0), new THREE.Vector2(0.2, -0.42), new THREE.Vector2(0.2, -0.09), new THREE.Vector2(-1.1, -0.09)]);
  b.add(new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2).rotateY(Math.atan2(-dz, dx)).translate(x, y, z), WHITE);
}
/**
 * A wedge from x0 to x1 across z0 to z1: its top sloping from y0 at x0 to y1 at x1, `dy` thick (from its top down to
 * the ground when `dy` is undefined): a ramp's embankment, its asphalt, its parapets
 */
function wedge(b: Batch, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, mat: THREE.Material, dy?: number) {
  const top = (x: number) => (x === x0 ? y0 : y1);
  const bot = (x: number) => (dy === undefined ? 0 : top(x) - dy);
  const P = (x: number, y: number, z: number) => [x, y, z];
  const quads: number[][][] = [
    [P(x0, top(x0), z0), P(x0, top(x0), z1), P(x1, top(x1), z1), P(x1, top(x1), z0)],
    [P(x0, bot(x0), z0), P(x1, bot(x1), z0), P(x1, bot(x1), z1), P(x0, bot(x0), z1)],
    [P(x0, bot(x0), z0), P(x0, top(x0), z0), P(x1, top(x1), z0), P(x1, bot(x1), z0)],
    [P(x0, bot(x0), z1), P(x1, bot(x1), z1), P(x1, top(x1), z1), P(x0, top(x0), z1)],
    [P(x0, bot(x0), z0), P(x0, bot(x0), z1), P(x0, top(x0), z1), P(x0, top(x0), z0)],
    [P(x1, bot(x1), z0), P(x1, top(x1), z0), P(x1, top(x1), z1), P(x1, bot(x1), z1)],
  ];
  const pos: number[] = [];
  for (const [a, c, d, e] of quads) pos.push(...a, ...c, ...d, ...a, ...d, ...e);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  b.add(g, mat);
}

/** Airport Drive and the forecourt loop's street-level stretches, their lines and arrows; the short-stay car park */
function forecourt(b: Batch) {
  const h = ROAD.half;
  const L = LOOP;
  const D = DEPARTURES;
  // Airport Drive in stretches, its centre line and a sidewalk each side, down to the loop
  for (let z = ROAD.z0 + 3.7; z < L.out - L.half; z += 15) {
    const z1 = Math.min(z + 15, L.out - L.half);
    box(b, ROAD.x - h, G, z, ROAD.x + h, TOP, z1, TAR);
    for (const s of [-1, 1]) box(b, ROAD.x + s * (h + 0.4) - 0.4, G, z, ROAD.x + s * (h + 0.4) + 0.4, TOP + 0.06, z1, PAVING);
    for (let zz = z + 1; zz < z1 - 1; zz += 3) mark(b, ROAD.x - 0.07, zz, ROAD.x + 0.07, zz + 1.6, WHITE);
  }
  box(b, ROAD.x - h, G, L.out - L.half, ROAD.x + h, TOP, L.z0 + L.half, TAR);
  // The loop down at the street: its north side out, its south side in, its east sides, and up to the ramps' feet
  boxes(b, ROAD.x + h, G, L.out - L.half, L.x1 + L.half, TOP, L.out + L.half, TAR);
  boxes(b, ROAD.x + h, G, L.z0 - L.half, L.east + L.half, TOP, L.z0 + L.half, TAR);
  boxes(b, L.east - L.half, G, L.z0 + L.half, L.east + L.half, TOP, L.up + L.half, TAR);
  boxes(b, D.foot, G, L.up - L.half, L.east - L.half, TOP, L.up + L.half, TAR);
  boxes(b, D.foot, G, L.kerb - L.half, L.x1 + L.half, TOP, L.kerb + L.half, TAR);
  boxes(b, L.x1 - L.half, G, L.out + L.half, L.x1 + L.half, TOP, L.kerb - L.half, TAR);
  // Arrows the way it runs
  for (let x = ROAD.x + 10; x < L.east - 6; x += 22) arrow(b, x, MARK, L.z0, 1, 0);
  for (let x = L.x1 - 10; x > ROAD.x + 6; x -= 22) arrow(b, x, MARK, L.out, -1, 0);
  arrow(b, L.east, MARK, (L.z0 + L.up) / 2, 0, 1);
  arrow(b, L.x1, MARK, (L.out + L.kerb) / 2, 0, -1);
  arrow(b, (D.foot + L.east) / 2, MARK, L.up, -1, 0);
  arrow(b, (D.foot + L.x1) / 2, MARK, L.kerb, 1, 0);
  // The car park: asphalt and bay lines
  const [cx0, cz0, cx1, cz1] = CAR_PARK;
  boxes(b, cx0 - 0.6, G, cz0 - 0.4, cx1 + 0.6, TOP - 0.002, cz1 + 0.4, toon('#302d48'));
  for (let x = cx0 + 0.35; x < cx1 - 0.5; x += 1.7)
    for (const [za, zb] of [
      [cz0, cz0 + 3.1],
      [cz1 - 3.1, cz1],
    ])
      mark(b, x - 0.04, za, x + 0.04, zb, WHITE);
  // The DEPARTURES sign over the lane before its ramp up: posts either side, the board facing the traffic coming west
  const gx = D.foot + 6;
  for (const s of [-1, 1]) box(b, gx - 0.12, 0, L.up + s * 2.3 - 0.12, gx + 0.12, 4.1, L.up + s * 2.3 + 0.12, STEEL);
  box(b, gx - 0.15, 3.5, L.up - 2.4, gx + 0.15, 4.2, L.up + 2.4, INK);
  decal(b, SIGN, rowUv(4), gx + 0.16, 3.85, L.up, 4.6, 0.58, Math.PI / 2, false);
}

/** The departures deck: its slab on piers, its lanes and kerb, parapets, lamps' bases, the ramps; under it the arrivals level */
function departures(b: Batch, low: boolean) {
  const D = DEPARTURES;
  const L = LOOP;
  const y = D.y;
  const [ra, rb] = [
    [L.up - RAMP_HALF, L.up + RAMP_HALF],
    [L.kerb - RAMP_HALF, L.kerb + RAMP_HALF],
  ];
  // The slab, its lanes, the hairpin, the planted median, the kerb's paving up to the hall
  boxes(b, D.x0, y - D.slab, D.z0, D.x1, y, D.z1 - 0.02, DECK);
  for (const c of [L.up, L.kerb]) boxes(b, L.west - L.half, y - 0.01, c - L.half, D.x1, y + 0.008, c + L.half, TAR);
  box(b, L.west - L.half, y - 0.01, L.up + L.half, L.west + L.half, y + 0.008, L.kerb - L.half, TAR);
  boxes(b, L.west + L.half + 0.3, y - 0.01, L.up + L.half + 0.3, D.x1 - 0.3, y + 0.05, L.kerb - L.half - 0.3, GREEN);
  boxes(b, D.x0 + 0.2, y - 0.01, L.kerb + L.half, D.x1, y + 0.006, D.z1 - 0.02, PAVING);
  // Lines along the lanes' edges and arrows the way they run (west up the ramp, back east past the hall's doors)
  for (const c of [L.up, L.kerb]) for (const s of [-1, 1]) mark(b, L.west + L.half, c + s * (L.half - 0.15) - 0.06, D.x1, c + s * (L.half - 0.15) + 0.06, WHITE, y + 0.012);
  for (let x = D.x1 - 8; x > L.west + 8; x -= 20) {
    arrow(b, x, y + 0.013, L.up, -1, 0);
    arrow(b, x - 10, y + 0.013, L.kerb, 1, 0);
  }
  // The drop-off: its kerb's edge in yellow, bollards along it
  mark(b, L.west + L.half, L.kerb + L.half + 0.05, D.x1, L.kerb + L.half + 0.2, YELLOW, y + 0.012);
  if (!low) b.detail(() => {
    for (let x = L.west + 4; x < D.x1 - 1; x += 3) cyl(b, 0.08, 0.6, x, y, L.kerb + L.half + 0.45, STEEL, 6);
  });
  // Parapets: a low concrete upstand with a steel rail along the deck's north edge, the hairpin's end and between the ramps
  const parapet = (x0: number, z0: number, x1: number, z1: number) => {
    boxes(b, x0, y, z0, x1, y + 0.4, z1, PALE);
    boxes(b, x0, y + 0.95, z0, x1, y + 1.0, z1, STEEL);
    b.detail(() => {
      const along = x1 - x0 > z1 - z0;
      const n = Math.max(1, Math.round((along ? x1 - x0 : z1 - z0) / 2));
      for (let k = 0; k <= n; k++) {
        const [px, pz] = along ? [x0 + ((x1 - x0) * k) / n, (z0 + z1) / 2] : [(x0 + x1) / 2, z0 + ((z1 - z0) * k) / n];
        box(b, px - 0.03, y + 0.4, pz - 0.03, px + 0.03, y + 0.95, pz + 0.03, STEEL);
      }
    });
  };
  parapet(D.x0, D.z0, D.x1, D.z0 + 0.15);
  parapet(D.x0, D.z0, D.x0 + 0.15, D.z1);
  parapet(D.x1 - 0.15, ra[1], D.x1, rb[0]);
  // Its north face lit along its edge, and ARRIVALS hung under it over the way in to the street level
  box(b, D.x0, y - D.slab + 0.05, D.z0 - 0.04, D.x1, y - D.slab + 0.12, D.z0 - 0.01, soft('#00eaff'));
  const ax = (D.x0 + D.x1) / 2;
  box(b, ax - 2.6, y - D.slab - 0.75, D.z0 + 0.05, ax + 2.6, y - D.slab, D.z0 + 0.25, INK);
  decal(b, SIGN, rowUv(5), ax, y - D.slab - 0.37, D.z0 + 0.03, 5, 0.62, Math.PI, false);
  // The piers, and soffit lights between them
  for (const [x, z] of PIERS) cyl(b, PIER, y - D.slab, x, 0, z, PALE, 12);
  for (let x = D.x0 + 6; x < D.x1 - 2; x += 12) for (const z of [L.up + 0.5, L.kerb + 3.5]) box(b, x - 1.2, y - D.slab - 0.04, z - 0.15, x + 1.2, y - D.slab - 0.01, z + 0.15, soft('#fff1c8'));
  // The ramps: each an embankment under its asphalt, parapets either side, in two pieces (a tile's length each)
  const mid = (D.x1 + D.foot) / 2;
  const at = (x: number) => (y * (D.foot - x)) / (D.foot - D.x1);
  for (const [a, c] of [ra, rb])
    for (const [x0, x1] of [
      [D.x1, mid],
      [mid, D.foot],
    ]) {
      wedge(b, x0, x1, a, c, at(x0) - 0.01, Math.max(0.005, at(x1) - 0.01), DECK);
      wedge(b, x0, x1, a + RAMP_HALF - L.half, c - RAMP_HALF + L.half, at(x0) + 0.008, at(x1) + 0.008, TAR, 0.02);
      for (const [z0, z1] of [
        [a, a + 0.15],
        [c - 0.15, c],
      ]) {
        wedge(b, x0, x1, z0, z1, at(x0) + 0.4, at(x1) + 0.4, PALE, 0.42);
        wedge(b, x0, x1, z0, z1, at(x0) + 1.0, at(x1) + 1.0, STEEL, 0.05);
      }
    }
  // Down at the street under it: paving to the hall's doors, the taxi rank's lane and its bays, the bus bay, a
  // shelter and the signs at their heads
  boxes(b, D.x0, G, D.z0, D.x1, TOP - 0.003, D.z1 - 0.02, PAVING);
  const r0 = RANK[0][1] - 3;
  const r1 = BUS_BAY.x + 4;
  boxes(b, r0, G, RANK_Z - 1.6, r1, TOP, RANK_Z + 1.6, TAR);
  mark(b, r0, RANK_Z + 1.55, r1, RANK_Z + 1.7, YELLOW);
  for (const [, x] of RANK) {
    mark(b, x - 1.9, RANK_Z - 1.3, x + 1.9, RANK_Z - 1.2, YELLOW);
    mark(b, x - 1.9, RANK_Z + 1.2, x + 1.9, RANK_Z + 1.3, YELLOW);
  }
  for (const x of [BUS_BAY.x - 3.3, BUS_BAY.x + 3.3]) mark(b, x - 0.06, RANK_Z - 1.4, x + 0.06, RANK_Z + 1.4, YELLOW);
  const kz = RANK_Z + 2.1;
  // (the taxi rank's head: a post with TAXI; the bus stop: a glass shelter with AIRPORT BUS on its fascia)
  const tx = RANK[RANK.length - 1][1] + 2.2;
  box(b, tx - 0.05, 0, kz - 0.05, tx + 0.05, 2.1, kz + 0.05, STEEL);
  box(b, tx - 0.4, 1.6, kz - 0.06, tx + 0.4, 2.2, kz + 0.06, INK);
  decal(b, SIGN, cellUv(7, 1), tx, 1.9, kz - 0.07, 0.56, 0.56, Math.PI, false);
  const [s0, s1] = [BUS_BAY.x - 2.2, BUS_BAY.x + 2.2];
  box(b, s0, 0, kz + 0.9, s1, 2.0, kz + 0.98, toon('#26315f'));
  for (const x of [s0, s1 - 0.08]) box(b, x, 0, kz, x + 0.08, 2.0, kz + 0.98, STEEL);
  box(b, s0 - 0.1, 2.0, kz - 0.15, s1 + 0.1, 2.12, kz + 1.05, STEEL);
  box(b, s0 + 0.2, 2.12, kz - 0.17, s1 - 0.2, 2.45, kz - 0.09, INK);
  decal(b, SIGN, rowUv(8), BUS_BAY.x, 2.285, kz - 0.18, 3.6, 0.3, Math.PI, false);
  if (!low) b.detail(() => box(b, s0 + 0.3, 0.42, kz + 0.45, s1 - 0.3, 0.5, kz + 0.85, STEEL));
}

/** The multi-storey car park: open decks on columns, spandrels round each, two stair towers, PARKING on its face */
function multiStorey(b: Batch, low: boolean) {
  const [x0, z0, x1, z1] = MSCP.rect;
  const lv = MSCP.levels;
  boxes(b, x0, G, z0, x1, TOP, z1, toon('#302d48'));
  for (let k = 1; k <= MSCP.decks; k++) {
    const y = k * lv;
    boxes(b, x0, y - 0.3, z0, x1, y, z1, DECK);
    // The spandrel round the deck (the roof's is its parapet)
    const top = k === MSCP.decks ? MSCP.top : y + 0.9;
    boxes(b, x0, y, z0, x1, top, z0 + 0.2, PALE);
    boxes(b, x0, y, z1 - 0.2, x1, top, z1, PALE);
    boxes(b, x0, y, z0, x0 + 0.2, top, z1, PALE);
    boxes(b, x1 - 0.2, y, z0, x1, top, z1, PALE);
    // A cyan band along each spandrel, lit softly at night
    boxes(b, x0, y + 0.45, z0 - 0.04, x1, y + 0.55, z0 - 0.01, soft('#00eaff'));
    boxes(b, x0, y + 0.45, z1 + 0.01, x1, y + 0.55, z1 + 0.04, soft('#00eaff'));
  }
  // The ground floor's low wall, open at the entrance on the west
  boxes(b, x0, 0, z0, x1, 0.9, z0 + 0.2, PALE);
  boxes(b, x0, 0, z1 - 0.2, x1, 0.9, z1, PALE);
  boxes(b, x1 - 0.2, 0, z0, x1, 0.9, z1, PALE);
  // Columns through every deck
  for (let x = x0 + 0.2; x < x1; x += 7.2) for (const z of [z0 + 0.2, (z0 + z1) / 2, z1 - 0.6]) box(b, x, 0, z, x + 0.4, MSCP.decks * lv, z + 0.4, PALE);
  // Two stair towers at its corners, glazed, and PARKING high on its west face
  for (const [sx, sz] of [
    [x0 - 1.4, z0 + 1],
    [x1 - 2.2, z1 - 3.6],
  ]) {
    box(b, sx, 0, sz, sx + 3.6, MSCP.top + 0.8, sz + 3, PALE);
    glazing(b, sx - 0.02, sz + 0.4, sx - 0.02, sz + 2.6, 0.5, MSCP.top - 0.4, -1);
  }
  box(b, x0 - 0.3, MSCP.top - 1.9, z0 + 6, x0 - 0.1, MSCP.top - 0.3, z0 + 20, INK);
  decal(b, SIGN, rowUv(7), x0 - 0.32, MSCP.top - 1.1, z0 + 13, 13, 1.55, -Math.PI / 2, false);
  // The way in: a booth and a barrier arm
  const ez = (z0 + z1) / 2;
  box(b, x0 - 0.2, 0, ez - 4, x0 + 1.2, 1.6, ez - 2.8, toon('#2aabee'));
  box(b, x0 - 0.2, 0.95, ez - 2.8, x0, 1.05, ez + 2, YELLOW);
  if (!low) box(b, x0, 0.1, ez - 2.6, x0 + 0.06, 0.12, ez + 2.6, YELLOW);
}

/** The hotel by the drive: a glass lobby and a tower of rooms over it, a canopy over its door, its name on the roof */
function hotel(b: Batch) {
  const [x0, z0, x1, z1] = HOTEL.rect;
  const lobby = 2.1;
  const top = HOTEL.top - 0.4;
  boxes(b, x0 + 0.3, 0, z0 + 0.3, x1 - 0.3, top, z1 - 0.3, toon('#2b2848'));
  // The lobby's glass and its door on the drive (west)
  glazing(b, x0 + 0.02, z0 + 0.5, x0 + 0.02, z1 - 0.5, 0.05, lobby - 0.1, -1);
  const mz = (z0 + z1) / 2;
  box(b, x0 - 0.1, 0, mz - 1.3, x0 + 0.04, 1.9, mz + 1.3, soft('#ffd36b'));
  // The rooms: two floors to each band of glass (the texture's two rows), stone bands between, pale ends
  const bands = Math.ceil((top - lobby) / 1.9);
  for (let k = 0; k < bands; k++) {
    const y = lobby + 0.15 + k * 1.9;
    const h = Math.min(1.75, top - y - 0.05);
    if (h < 0.6) break;
    glazing(b, x0 + 0.02, z0 + 1, x0 + 0.02, z1 - 1, y, h, -1);
    glazing(b, x1 - 0.02, z0 + 1, x1 - 0.02, z1 - 1, y, h, 1);
    glazing(b, x0 + 1, z0 + 0.02, x1 - 1, z0 + 0.02, y, h, 1);
    glazing(b, x0 + 1, z1 - 0.02, x1 - 1, z1 - 0.02, y, h, -1);
    boxes(b, x0, y - 0.15, z0, x1, y, z1, PALE, 16);
  }
  for (const [ax, az] of [
    [x0, z0],
    [x1 - 1, z0],
    [x0, z1 - 1],
    [x1 - 1, z1 - 1],
  ])
    box(b, ax, 0, az, ax + 1, top + 0.4, az + 1, PALE);
  boxes(b, x0, top, z0, x1, top + 0.4, z1, PALE, 16);
  // The canopy over the door, out to the drive's sidewalk, on two posts
  box(b, ROAD.x + ROAD.half + 1.1, 2.2, mz - 4, x0, 2.4, mz + 4, ROOF);
  box(b, ROAD.x + ROAD.half + 1.1, 2.15, mz - 4, ROAD.x + ROAD.half + 1.2, 2.2, mz + 4, soft('#ffd36b'));
  for (const z of [mz - 3.7, mz + 3.7]) cyl(b, 0.08, 2.2, ROAD.x + ROAD.half + 1.3, 0, z, STEEL, 8);
  // RUNWAY HOTEL on the roof, facing the drive
  box(b, x0 + 3, top + 0.4, mz - 7.3, x0 + 3.2, top + 2.5, mz + 7.3, INK);
  decal(b, SIGN, rowUv(6), x0 + 2.98, top + 1.45, mz, 14, 1.75, -Math.PI / 2, false);
}

/** General aviation's road off the east ring avenue, its loop round the little car park, and the path to the gate */
function gaRoad(b: Batch) {
  const g = GA_ROAD;
  const h = g.half;
  const tar = toon('#2a2840');
  // (from the avenue's kerb: its asphalt is the avenue's own)
  box(b, g.x0 + 4.5, G, g.z - h, g.x1 + h, TOP, g.z + h, tar);
  box(b, g.loopX - h, G, g.z + h, g.loopX + h, TOP, g.loopZ + h, tar);
  box(b, g.x1 - h, G, g.z + h, g.x1 + h, TOP, g.loopZ + h, tar);
  box(b, g.loopX + h, G, g.loopZ - h, g.x1 - h, TOP, g.loopZ + h, tar);
  for (let x = g.x0 + 6; x < g.loopX - 1; x += 3) mark(b, x, g.z - 0.07, x + 1.6, g.z + 0.07, WHITE);
  const [cx0, cz0, cx1, cz1] = GA_CAR_PARK;
  box(b, cx0 - 0.6, G, cz0 - 0.4, cx1 + 0.6, TOP - 0.002, cz1 + 0.4, toon('#302d48'));
  for (let x = cx0 + 0.35; x < cx1 - 0.5; x += 1.7)
    for (const [za, zb] of [
      [cz0, cz0 + 3.1],
      [cz1 - 3.1, cz1],
    ])
      mark(b, x - 0.04, za, x + 0.04, zb, WHITE);
  // A paved path from the loop's kerb to the gate, and the gate's posts
  box(b, g.x1 + h, G, GA_GATE.z0 + 0.4, AIRSIDE[0] + 4, TOP + 0.06, GA_GATE.z1 - 0.4, PAVING);
  for (const z of [GA_GATE.z0, GA_GATE.z1]) box(b, AIRSIDE[0] - 0.12, 0, z - 0.12, AIRSIDE[0] + 0.12, FENCE_H + 0.4, z + 0.12, STEEL);
  box(b, AIRSIDE[0] - 0.08, FENCE_H + 0.3, GA_GATE.z0, AIRSIDE[0] + 0.08, FENCE_H + 0.4, GA_GATE.z1, YELLOW);
}

/* ---------- The cargo area (step 3) ---------- */

const SHED = toon('#6b7aa8');
const RIB = toon('#5d6b98');
const SHUTTER = toon('#a8a4c2');
const RUBBER = toon('#17151f');
const YARD_CONCRETE = toon('#5d5a78');

/**
 * The cargo shed on the fence line and its office: ribbed cladding, a flat roof behind a parapet with rooflights and
 * plant, the docks on the landside (each a shutter over a raised sill, its seal, bumpers, a lamp and its number, a
 * canopy along them all), big doors on the airside with hazard-striped jambs, SECTOR 7 CARGO on both faces; the office
 * glazed in bands, its sign facing the yard
 */
function cargoShed(b: Batch, low: boolean) {
  const [x0, z0, x1, z1, H] = CARGO_SHED;
  // (in pieces no longer than a tile: tileBatch())
  boxes(b, x0, 0, z0, x1, H, z1, SHED);
  // The roof (tucked in from the walls) inside a parapet
  boxes(b, x0 + 0.006, H - 0.05, z0 + 0.006, x1 - 0.006, H + 0.04, z1 - 0.006, ROOF);
  for (const [a, c, e, f] of [
    [x0 - 0.1, z0 - 0.1, x1, z0 + 0.15],
    [x0 - 0.1, z1 - 0.15, x1, z1 + 0.1],
    [x0 - 0.1, z0 - 0.1, x0 + 0.15, z1 + 0.1],
  ])
    boxes(b, a, H, c, e, H + 0.5, f, PALE);
  // Ribs down the long walls, every 1.5 (but over the docks' shutters)
  b.detail(() => {
    for (let x = x0 + 0.75; x < x1; x += 1.5)
      for (const [z, d] of [
        [z0, -1],
        [z1, 1],
      ] as const)
        if (d > 0 || DOCKS.every((dx) => Math.abs(x - dx) > 1.45)) box(b, x - 0.06, d < 0 ? 3.4 : 4.9, Math.min(z, z + d * 0.08), x + 0.06, H, Math.max(z, z + d * 0.08), RIB);
    for (let z = z0 + 0.75; z < z1; z += 1.5) box(b, x0 - 0.08, 0.9, z - 0.06, x0, H, z + 0.06, RIB);
  });
  // A plinth along the foot of its west end
  box(b, x0 - 0.04, 0, z0, x0, 0.9, z1, toon('#4b4766'));
  // Rooflights in a row and plant on the roof
  for (let x = x0 + 4; x < x1 - 4; x += 6) box(b, x, H + 0.04, (z0 + z1) / 2 - 2.5, x + 3, H + 0.4, (z0 + z1) / 2 + 2.5, toon('#9fb6e8'));
  if (!low) for (const x of [x0 + 6, x1 - 9]) box(b, x, H + 0.04, z0 + 3, x + 3, H + 1.4, z0 + 5.5, STEEL);
  // The docks, landside (north): a raised sill, the shutter, a black seal round it, two bumpers, a lamp and the number
  DOCKS.forEach((dx, k) => {
    box(b, dx - 1.25, 0, z0 - 0.35, dx + 1.25, 0.7, z0, toon('#3a3658'));
    box(b, dx - 1.0, 0.7, z0 - 0.05, dx + 1.0, 3.0, z0 + 0.02, SHUTTER);
    b.detail(() => {
      for (let y = 0.95; y < 3.0; y += 0.3) box(b, dx - 1.0, y, z0 - 0.07, dx + 1.0, y + 0.04, z0 - 0.05, toon('#8a86a8'));
      box(b, dx - 1.3, 0.7, z0 - 0.3, dx - 1.05, 3.3, z0, RUBBER);
      box(b, dx + 1.05, 0.7, z0 - 0.3, dx + 1.3, 3.3, z0, RUBBER);
      box(b, dx - 1.3, 3.05, z0 - 0.3, dx + 1.3, 3.3, z0, RUBBER);
      for (const s of [-1, 1]) box(b, dx + s * 0.8 - 0.18, 0.3, z0 - 0.5, dx + s * 0.8 + 0.18, 0.65, z0 - 0.35, RUBBER);
    });
    box(b, dx - 0.2, 3.5, z0 - 0.16, dx + 0.2, 3.6, z0 - 0.02, light('#fff1c8'));
    decal(b, SIGN, cellUv(k, 10), dx, 3.95, z0 - 0.03, 0.6, 0.6, Math.PI, false);
  });
  // The canopy over the docks, on brackets, its edge lit
  boxes(b, x0, 4.4, z0 - 2.2, x1, 4.6, z0, ROOF);
  boxes(b, x0, 4.36, z0 - 2.24, x1, 4.4, z0 - 2.16, soft('#ff8a3d'));
  for (let x = x0 + 3; x < x1; x += 6) box(b, x - 0.08, 3.9, z0 - 2.0, x + 0.08, 4.4, z0, STEEL);
  // The airside (south): three big doors with hazard-striped jambs, the sign over them
  const doorW = 7.6;
  for (const cx of [x0 + 7, (x0 + x1) / 2, x1 - 7]) {
    box(b, cx - doorW / 2, 0, z1, cx + doorW / 2, 4.6, z1 + 0.06, SHUTTER);
    b.detail(() => {
      for (let y = 0.3; y < 4.6; y += 0.32) box(b, cx - doorW / 2, y, z1 + 0.06, cx + doorW / 2, y + 0.04, z1 + 0.08, toon('#8a86a8'));
      for (const s of [-1, 1])
        for (let y = 0; y < 4.6; y += 0.6) box(b, cx + s * (doorW / 2 + 0.15) - 0.15, y, z1, cx + s * (doorW / 2 + 0.15) + 0.15, y + 0.3, z1 + 0.1, y % 1.2 < 0.3 ? YELLOW : INK);
    });
    box(b, cx - doorW / 2 - 0.3, 4.6, z1, cx + doorW / 2 + 0.3, 4.8, z1 + 0.12, INK);
  }
  box(b, (x0 + x1) / 2 - 9.4, H - 1.5, z1 + 0.04, (x0 + x1) / 2 + 9.4, H - 0.1, z1 + 0.14, INK);
  decal(b, SIGN, rowUv(9), (x0 + x1) / 2, H - 0.8, z1 + 0.15, 18.4, 2.3, 0, false);
  // The office: glazed bands between pale floor bands, a lit sign over the yard, a door on the yard
  const [ox0, oz0, ox1, oz1, OH] = CARGO_OFFICE;
  box(b, ox0 + 0.2, 0, oz0 + 0.2, ox1 - 0.2, OH, oz1 - 0.2, toon('#2b2848'));
  for (let y = 0.4; y < OH - 1; y += 2.2) {
    glazing(b, ox0 + 0.4, oz0 + 0.02, ox1 - 0.4, oz0 + 0.02, y, 1.7, 1);
    glazing(b, ox1 - 0.02, oz0 + 0.4, ox1 - 0.02, oz1 - 0.4, y, 1.7, 1);
    glazing(b, ox0 + 0.4, oz1 - 0.02, ox1 - 0.4, oz1 - 0.02, y, 1.7, -1);
    box(b, ox0, y + 1.75, oz0, ox1, y + 2.2, oz1, PALE);
  }
  boxes(b, ox0, OH, oz0, ox1, OH + 0.4, oz1, PALE);
  box(b, ox0 + 0.6, OH + 0.4, oz0 + 0.4, ox1 - 0.6, OH + 1.9, oz0 + 0.6, INK);
  decal(b, SIGN, rowUv(9), (ox0 + ox1) / 2, OH + 1.15, oz0 + 0.38, 8.6, 1.08, Math.PI, false);
  box(b, (ox0 + ox1) / 2 - 1, 0, oz0 - 0.06, (ox0 + ox1) / 2 + 1, 2.1, oz0 + 0.01, soft('#ffd36b'));
}

/** A rig, its trailer's back at (x, z), facing along z (`dir`), its tractor in front when it has one */
function rig(b: Batch, r: (typeof RIGS)[number], low: boolean) {
  const { w, trailer, gap, tractor, h } = RIG;
  const d = r.dir;
  const z = (u: number) => r.z + d * u;
  const span = (u0: number, u1: number): [number, number] => [Math.min(z(u0), z(u1)), Math.max(z(u0), z(u1))];
  const part = (x0: number, y0: number, u0: number, x1: number, y1: number, u1: number, m: THREE.Material) => {
    const [a, c] = span(u0, u1);
    box(b, r.x + x0, y0, a, r.x + x1, y1, c, m);
  };
  const hw = w / 2;
  // (a wheel: its axle across the rig, along x)
  const wheel = (x: number, zz: number, rr: number) => b.add(new THREE.CylinderGeometry(rr, rr, 0.24, 10).rotateZ(Math.PI / 2).translate(x, rr, zz), RUBBER);
  // The trailer: its box on a dark chassis, landing legs at the front, three axles at the back
  part(-hw, 0.75, 0.05, hw, h, trailer, toon(r.color));
  part(-hw + 0.1, 0.45, 0.1, hw - 0.1, 0.75, trailer - 0.2, RUBBER);
  part(-hw - 0.01, 0.95, 0.1, hw + 0.01, 1.05, trailer - 0.1, toon('#ff8a3d'));
  if (!low)
    b.detail(() => {
      for (const u of [0.7, 1.5, 2.3]) for (const s of [-1, 1]) wheel(r.x + s * (hw - 0.1), z(u), 0.38);
      for (const s of [-1, 1]) part(s * 0.5 - 0.06, 0, trailer - 1.6, s * 0.5 + 0.06, 0.5, trailer - 1.45, STEEL);
      part(-hw + 0.05, 0.8, 0.0, hw - 0.05, h - 0.05, 0.05, toon('#c9c4e6'));
    });
  if (!r.cab) return;
  // The tractor: the cab high at the front, its windscreen and grille, the chassis and wheels behind it
  const t0 = trailer + gap;
  part(-hw, 0.45, t0, hw, 0.85, t0 + tractor, RUBBER);
  part(-hw, 0.85, t0 + tractor - 1.6, hw, 2.15, t0 + tractor, toon(r.color === '#f3f2f7' ? '#e23b3b' : '#f3f2f7'));
  part(-hw + 0.08, 1.45, t0 + tractor - 0.01, hw - 0.08, 2.0, t0 + tractor + 0.02, toon('#26315f'));
  part(-hw + 0.2, 0.55, t0 + tractor - 0.01, hw - 0.2, 1.3, t0 + tractor + 0.03, STEEL);
  for (const s of [-1, 1]) part(s * (hw - 0.25) - 0.12, 0.9, t0 + tractor + 0.02, s * (hw - 0.25) + 0.12, 1.05, t0 + tractor + 0.05, light('#fff6c8'));
  if (!low)
    b.detail(() => {
      for (const u of [t0 + 0.6, t0 + 1.4, t0 + tractor - 0.7]) for (const s of [-1, 1]) wheel(r.x + s * (hw - 0.1), z(u), 0.4);
      for (const s of [-1, 1]) part(s * (hw + 0.02) - 0.02, 2.15, t0 + tractor - 1.3, s * (hw + 0.02) + 0.02, 2.6, t0 + tractor - 1.1, STEEL);
    });
}

/** Cargo Road, the yard's loop and its paving (the trailers' bays, the docks' apron), the multi-storey's drive, the sign at the way in */
function cargoYard(b: Batch) {
  const { z, x1, loopX, loopZ, half: h } = CARGO_ROAD;
  // The yard's concrete under it all, but the roads
  boxes(b, YARD[0], G, z + h, loopX - h, TOP - 0.006, YARD[3], YARD_CONCRETE);
  boxes(b, loopX + h, G, z + h, x1 - h, TOP - 0.006, loopZ - h, YARD_CONCRETE);
  boxes(b, loopX - h, G, loopZ + h, YARD[2], TOP - 0.006, YARD[3], YARD_CONCRETE);
  boxes(b, x1 + h, G, z + h, YARD[2], TOP - 0.006, loopZ - h, YARD_CONCRETE);
  // Cargo Road from the drive's kerb, its centre line up to the loop; a sidewalk along its north side
  boxes(b, ROAD.x + ROAD.half, G, z - h, x1 + h, TOP, z + h, TAR);
  boxes(b, ROAD.x + ROAD.half, G, z - h - 0.8, x1 + h, TOP + 0.06, z - h, PAVING);
  for (let x = ROAD.x + 6; x < loopX - 3; x += 3) mark(b, x, z - 0.07, x + 1.6, z + 0.07, WHITE);
  // The loop: in at the road's end, south, west past the docks, north and back out
  boxes(b, x1 - h, G, z + h, x1 + h, TOP, loopZ + h, TAR);
  boxes(b, loopX - h, G, loopZ - h, x1 - h, TOP, loopZ + h, TAR);
  boxes(b, loopX - h, G, z + h, loopX + h, TOP, loopZ - h, TAR);
  arrow(b, x1, MARK, (z + loopZ) / 2, 0, 1);
  for (let x = x1 - 10; x > loopX + 6; x -= 14) arrow(b, x, MARK, loopZ, -1, 0);
  arrow(b, loopX, MARK, (z + loopZ) / 2, 0, -1);
  // The trailers' bays inside the loop: a line between each, either row
  for (const [a, c] of [
    [z + h + 0.4, z + h + 8.2],
    [loopZ - h - 8.2, loopZ - h - 0.4],
  ])
    for (let x = loopX + 2.8; x < x1 - 2; x += 2.4) mark(b, x - 0.04, a, x + 0.04, c, WHITE);
  // The docks' apron: a yellow line where the trucks turn in, and each dock's guide lines
  for (let x = loopX - h; x < YARD[2] - 0.6; x += 15) mark(b, x, loopZ + h + 0.3, Math.min(x + 15, YARD[2] - 0.5), loopZ + h + 0.42, YELLOW);
  for (const dx of DOCKS) for (const s of [-1, 1]) mark(b, dx + s * 1.1 - 0.05, loopZ + h + 0.6, dx + s * 1.1 + 0.05, CARGO_SHED[1] - 0.4, YELLOW);
  // The multi-storey's drive, off Cargo Road down its west side to its way in
  const [mx0, , , mz1] = MSCP.rect;
  boxes(b, mx0 - 4.6, G, z + h, mx0 - 1.6, TOP, (MSCP.rect[1] + mz1) / 2 + 2.2, TAR);
  // SECTOR 7 CARGO at the way in, facing the drive
  const gx = ROAD.x + ROAD.half + 3;
  const gz = z - h - 2.2;
  for (const dz of [-2.4, 2.4]) box(b, gx - 0.1, 0, gz + dz - 0.1, gx + 0.1, 2.6, gz + dz + 0.1, STEEL);
  box(b, gx - 0.12, 1.6, gz - 2.7, gx + 0.12, 2.9, gz + 2.7, INK);
  decal(b, SIGN, rowUv(9), gx - 0.13, 2.25, gz, 5.2, 0.65, -Math.PI / 2, false);
}

/** On the cargo apron: the high loader at the parked freighter's door, tugs and their dollies of containers */
function cargoKit(b: Batch) {
  for (const k of CARGO_KIT) {
    const [x, z] = k.at;
    const parts: [number, number, number, number, number, number, THREE.Material][] = [];
    if (k.kind === 'loader') {
      // A low chassis, scissor arms, the platform raised to the main deck door's sill, a cab at the back
      parts.push([-1.8, 0.2, -1.0, 1.8, 0.6, 1.0, YELLOW], [-1.7, 2.3, -0.95, 1.7, 2.5, 0.95, YELLOW], [-1.8, 0.6, -0.9, -1.0, 1.9, 0.9, toon('#26315f')]);
      b.add(new THREE.BoxGeometry(3.0, 0.12, 0.14).rotateZ(0.55).translate(0.2, 1.45, -0.8).rotateY(k.yaw).translate(x, 0, z), STEEL);
      b.add(new THREE.BoxGeometry(3.0, 0.12, 0.14).rotateZ(-0.55).translate(0.2, 1.45, 0.8).rotateY(k.yaw).translate(x, 0, z), STEEL);
    } else {
      // A tug, then three dollies, each with a container (its lower side cut away: the contour that fits a hold)
      parts.push([2.2, 0.2, -0.5, 3.4, 0.8, 0.5, YELLOW], [2.5, 0.8, -0.45, 3.2, 1.35, 0.45, INK]);
      for (let c = 0; c < 3; c++) {
        const u = 1.4 - c * 1.75;
        parts.push([u - 0.75, 0.25, -0.65, u + 0.75, 0.4, 0.65, STEEL], [u - 0.7, 0.4, -0.55, u + 0.7, 1.55, 0.6, toon(['#c9c4e6', '#8a86a8', '#c9c4e6'][c])]);
        b.add(new THREE.BoxGeometry(1.4, 0.5, 0.18).rotateX(-0.6).translate(u, 0.7, -0.62).rotateY(k.yaw).translate(x, 0, z), toon('#c9c4e6'));
      }
    }
    for (const [a0, y0, c0, a1, y1, c1, m] of parts)
      b.add(
        new THREE.BoxGeometry(a1 - a0, y1 - y0, c1 - c0)
          .translate((a0 + a1) / 2, (y0 + y1) / 2, (c0 + c1) / 2)
          .rotateY(k.yaw)
          .translate(x, 0, z),
        m
      );
  }
}

/* ---------- The roadside: signs, the gateway, flags, planting (lighting and signs phase) ---------- */

/**
 * The road signs' atlas, a row each (`SIGN_ROWS`): white on blue with a white border, arrows and the plane drawn as
 * shapes; the gateway's lettering last, white on stone. Fixed made-up copy
 */
type Part = string | 'left' | 'right' | 'up' | 'down' | 'plane';
const SIGN_ROWS: Record<SignText | 'gateway', Part[]> = {
  'airport-r': ['plane', 'AIRPORT', 'right'],
  'airport-l': ['left', 'AIRPORT', 'plane'],
  cargo: ['left', 'CARGO · P', '   ', 'TERMINAL', 'up'],
  terminal: ['left', 'DEPARTURES · ARRIVALS'],
  park: ['P', 'right'],
  ga: ['HANGAR 1 · GA', 'up'],
  gateway: ['SECTOR 7 AIRPORT'],
};
const ROW_KEYS = Object.keys(SIGN_ROWS) as (SignText | 'gateway')[];
const ROAD_ATLAS = canvasTex(1024, ROW_KEYS.length * 128, (c) => {
  c.textBaseline = 'middle';
  ROW_KEYS.forEach((key, r) => {
    const y0 = r * 128;
    const stone = key === 'gateway';
    c.fillStyle = stone ? '#3a3658' : '#1f4fb3';
    c.fillRect(0, y0, 1024, 128);
    if (!stone) {
      c.strokeStyle = '#ffffff';
      c.lineWidth = 6;
      c.strokeRect(8, y0 + 8, 1008, 112);
    }
    c.font = `900 ${stone ? 92 : 78}px ${FONT_DISPLAY}`;
    const parts = SIGN_ROWS[key];
    const glyph = 74;
    const widthOf = (p: Part) => (p === 'left' || p === 'right' || p === 'up' || p === 'down' || p === 'plane' ? glyph : c.measureText(p).width);
    const gap = 22;
    const total = parts.reduce((a, p) => a + widthOf(p), 0) + gap * (parts.length - 1);
    let x = 512 - total / 2;
    const cy = y0 + 66;
    c.fillStyle = '#ffffff';
    for (const p of parts) {
      const w = widthOf(p);
      if (p === 'left' || p === 'right' || p === 'up' || p === 'down') {
        // An arrow: a shaft and a head, turned the way it points
        const a = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[p];
        c.save();
        c.translate(x + w / 2, cy);
        c.rotate(a);
        c.beginPath();
        c.moveTo(-30, -9);
        c.lineTo(6, -9);
        c.lineTo(6, -26);
        c.lineTo(34, 0);
        c.lineTo(6, 26);
        c.lineTo(6, 9);
        c.lineTo(-30, 9);
        c.closePath();
        c.fill();
        c.restore();
      } else if (p === 'plane') {
        // A plane seen from above, nose up
        c.save();
        c.translate(x + w / 2, cy);
        c.beginPath();
        c.ellipse(0, 0, 7, 32, 0, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.moveTo(-34, 6);
        c.lineTo(0, -10);
        c.lineTo(34, 6);
        c.lineTo(34, 13);
        c.lineTo(0, 4);
        c.lineTo(-34, 13);
        c.closePath();
        c.fill();
        c.beginPath();
        c.moveTo(-14, 30);
        c.lineTo(0, 22);
        c.lineTo(14, 30);
        c.lineTo(14, 35);
        c.lineTo(-14, 35);
        c.closePath();
        c.fill();
        c.restore();
      } else {
        c.fillStyle = stone ? '#f3f0ff' : '#ffffff';
        c.fillText(p, x, cy + 4);
      }
      x += w + gap;
    }
  });
});
const ROAD_SIGN = siteMat('airport-road-signs', lit(new THREE.MeshBasicMaterial({ map: ROAD_ATLAS }), 0.95, 1.1));
const roadUv = (key: SignText | 'gateway'): [number, number, number, number] => {
  const r = ROW_KEYS.indexOf(key);
  const n = ROW_KEYS.length;
  return [0, 1 - (r + 1) / n, 1, 1 - r / n];
};

const HEDGE = toon('#2f6b45');
const SOIL = toon('#4a3a32');
const BLOOMS = ['#ff4fd8', '#ffd23f', '#ff8a3d', '#e9e6f5', '#b07bff'].map((c) => toon(c));
const FLAG_COLOURS = ['#e219e5', '#8000ff', '#037dff', '#00eaff', '#ff3b8a'];

/** A bed's planting: a low clipped mound of green and, near only, flowers dotted over it (seeded by where it is) */
function plants(b: Batch, x0: number, z0: number, x1: number, z1: number, y: number, low: boolean) {
  box(b, x0, y - 0.01, z0, x1, y + 0.16, z1, HEDGE);
  b.detail(() => {
    const r = rng(Math.round(x0 * 7 + z0 * 13));
    const n = Math.round(((x1 - x0) * (z1 - z0)) / (low ? 0.5 : 0.2));
    for (let k = 0; k < n; k++) {
      const fx = x0 + 0.08 + r() * (x1 - x0 - 0.16);
      const fz = z0 + 0.08 + r() * (z1 - z0 - 0.16);
      const h = 0.04 + r() * 0.06;
      box(b, fx - 0.07, y + 0.15, fz - 0.07, fx + 0.07, y + 0.16 + h, fz + 0.07, BLOOMS[Math.floor(r() * BLOOMS.length)]);
    }
  });
}

/** The road signs (on a post, or a gantry over the road), the gateway, the flags, the beds, hedges and shrubs */
function roadside(b: Batch, low: boolean) {
  for (const sgn of ROAD_SIGNS) {
    const h = sgn.w / 8;
    const along = Math.abs(Math.sin(sgn.yaw)) < 0.5;
    // (the board's plane runs across its facing; its back a dark box a hair behind the face)
    const [nx, nz] = [Math.sin(sgn.yaw), Math.cos(sgn.yaw)];
    const [hx, hz] = along ? [sgn.w / 2, 0.06] : [0.06, sgn.w / 2];
    box(b, sgn.x - hx - nx * 0.06, sgn.y - h / 2 - 0.05, sgn.z - hz - nz * 0.06, sgn.x + hx - nx * 0.06, sgn.y + h / 2 + 0.05, sgn.z + hz - nz * 0.06, INK);
    decal(b, ROAD_SIGN, roadUv(sgn.text), sgn.x + nx * 0.005, sgn.y, sgn.z + nz * 0.005, sgn.w, h, sgn.yaw, false);
    if (sgn.posts.length) {
      // A gantry: posts either side of the road and a beam across over the board
      for (const px of sgn.posts) box(b, px - 0.1, 0, sgn.z - 0.1, px + 0.1, sgn.y + h / 2 + 0.25, sgn.z + 0.1, STEEL);
      box(b, sgn.posts[0], sgn.y + h / 2 + 0.05, sgn.z - 0.12, sgn.posts[1], sgn.y + h / 2 + 0.25, sgn.z + 0.12, STEEL);
    } else {
      const off = sgn.w / 2 - 0.4;
      for (const s of [-1, 1]) {
        const [px, pz] = along ? [sgn.x + s * off, sgn.z] : [sgn.x, sgn.z + s * off];
        box(b, px - 0.05 - nx * 0.15, 0, pz - 0.05 - nz * 0.15, px + 0.05 - nx * 0.15, sgn.y + h / 2, pz + 0.05 - nz * 0.15, STEEL);
      }
    }
  }
  // The gateway: a low stone wall with a cap, its lettering facing the avenue, a bed of flowers in front of it
  const G0 = GATEWAY;
  box(b, G0.x0, 0, G0.z - 0.35, G0.x1, G0.h, G0.z + 0.35, PALE);
  box(b, G0.x0 - 0.1, G0.h, G0.z - 0.45, G0.x1 + 0.1, G0.h + 0.15, G0.z + 0.45, WHITE);
  // (the row's middle 80%, where the lettering is)
  const [u0, v0, u1, v1] = roadUv('gateway');
  const lw = (G0.x1 - G0.x0) * 0.82;
  decal(b, ROAD_SIGN, [u0 + 0.1, v0, u1 - 0.1, v1], (G0.x1 + G0.x0) / 2, G0.h * 0.6, G0.z - 0.355, lw, (lw / 6.4) * 0.92, Math.PI, false);
  box(b, G0.x0, 0, G0.z - 0.35 - G0.bed, G0.x1, 0.22, G0.z - 0.35, SOIL);
  plants(b, G0.x0 + 0.7, G0.z - 0.35 - G0.bed + 0.6, G0.x1 - 0.7, G0.z - 0.55, 0.22, low);
  b.detail(() => {
    // Uplights at the bed's corners
    for (const x of [G0.x0 + 0.4, G0.x1 - 0.4]) {
      box(b, x - 0.12, 0.22, G0.z - 0.35 - G0.bed + 0.15, x + 0.12, 0.34, G0.z - 0.35 - G0.bed + 0.39, STEEL);
      box(b, x - 0.08, 0.34, G0.z - 0.35 - G0.bed + 0.19, x + 0.08, 0.38, G0.z - 0.35 - G0.bed + 0.35, light('#fff1c8'));
    }
  });
  // The flags across the drive from it: poles, a gilded cap, each flag in one of the brand's colours
  FLAGS.forEach(([x, z], k) => {
    cyl(b, 0.07, FLAG_H, x, 0, z, WHITE, 8, 0.09);
    b.add(new THREE.SphereGeometry(0.12, 8, 6).translate(x, FLAG_H + 0.08, z), YELLOW);
    box(b, x + 0.08, FLAG_H - 1.1, z - 0.02, x + 1.8, FLAG_H - 0.1, z + 0.02, toon(FLAG_COLOURS[k % FLAG_COLOURS.length]));
  });
  // Flower beds along the drive's verges between its trees, clipped hedges round the car parks, shrubs round the
  // hotel and the multi-storey
  for (const [x, z] of BEDS) {
    box(b, x - 0.45, 0, z - 1.1, x + 0.45, 0.16, z + 1.1, SOIL);
    plants(b, x - 0.3, z - 0.95, x + 0.3, z + 0.95, 0.16, low);
  }
  for (const [x0, z0, x1, z1] of HEDGES) boxes(b, x0, 0, z0, x1, 0.7, z1, HEDGE);
  b.detail(() => {
    for (const [x, z] of SHRUBS) b.add(new THREE.DodecahedronGeometry(0.75, 0).translate(x, 0.6, z), HEDGE);
  });
}

/* ---------- Registering ---------- */

const rectOf = (f: readonly number[], m = 1): Rect => [f[0] - m, f[1] - m, f[2] + m, f[3] + m];

export function register({ low }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  // The field in strips west to east, the nearest built first
  for (let sx0 = STRIPS_X0; sx0 < STRIPS_X1; sx0 += STRIP) {
    const sx1 = sx0 + STRIP;
    site(`airport field ${sx0}`, [sx0 - 2, AIRSIDE[1] - 1, sx1 + 2, AIRSIDE[3] + 1], (into) => {
      const b = new Batch();
      const fxb = new Batch();
      runway(b, sx0, sx1, low);
      taxiways(b, sx0, sx1, low);
      aprons(b, sx0, sx1);
      b.detail(() => apronKit(b, sx0, sx1));
      if (HELIPAD.x >= sx0 && HELIPAD.x < sx1) for (const p of [HELIPAD, EXEC_PAD]) helipad(b, p);
      fence(b, fxb, sx0, sx1);
      b.build(into);
      buildFx(fxb, into);
    });
  }
  site('airport concourses', rectOf([CONCOURSES[0][0], CONCOURSES[0][1], CONCOURSES[1][2], AIRBRIDGES[0].z1], 2), (into) => {
    const b = new Batch();
    concourses(b, low);
    airbridges(b);
    b.build(into);
  });
  site('airport maintenance hangar', rectOf(MRO), (into) => {
    const b = new Batch();
    mro(b);
    b.build(into);
  });
  site('airport fire station', rectOf([FIRE[0], FIRE[1], FIRE[2], FIRE[3] + 8]), (into) => {
    const b = new Batch();
    fireStation(b);
    b.build(into);
  });
  site('airport fuel farm', [FUEL_TANKS[0].x - 8, FUEL_TANKS[0].z - 8, FUEL_TANKS.at(-1)!.x + 8, FUEL_TANKS[0].z + 8], (into) => {
    const b = new Batch();
    fuelFarm(b);
    b.build(into);
  });
  site('airport general aviation road', [GA_ROAD.x0, GA_ROAD.z - 3, AIRSIDE[0] + 5, GA_ROAD.loopZ + 3], (into) => {
    const b = new Batch();
    gaRoad(b);
    b.build(into, { cast: false, receive: true });
  });
  site('airport forecourt', [ROAD.x - 4, ROAD.z0, LOOP.x1 + 4, LOOP.kerb + 3], (into) => {
    const b = new Batch();
    forecourt(b);
    b.build(into, { cast: false, receive: true });
  });
  site('airport departures deck', [DEPARTURES.x0 - 1, DEPARTURES.z0 - 2, DEPARTURES.foot + 1, DEPARTURES.z1], (into) => {
    const b = new Batch();
    departures(b, low);
    b.build(into);
  });
  site('airport multi-storey', rectOf(MSCP.rect, 2), (into) => {
    const b = new Batch();
    multiStorey(b, low);
    b.build(into);
  });
  site('airport hotel', [ROAD.x, HOTEL.rect[1] - 1, HOTEL.rect[2] + 1, HOTEL.rect[3] + 1], (into) => {
    const b = new Batch();
    hotel(b);
    b.build(into);
  });
  // The roadside: the signs, the gateway and its flags, the beds, hedges and shrubs (lighting and signs phase)
  site('airport roadside', [GA_ROAD.x0 - 2, ROAD.z0 - 2, CARGO_ROAD.x1, LOOP.kerb], (into) => {
    const b = new Batch();
    roadside(b, low);
    b.build(into);
  });
  // The cargo area (step 3): the shed and its office, the apron's kit; Cargo Road and the yard; the trucks in it, a site a tile
  site('airport cargo shed', [CARGO_SHED[0] - 1, CARGO_SHED[1] - 3, CARGO_OFFICE[2] + 1, CARGO_SHED[3] + 6], (into) => {
    const b = new Batch();
    cargoShed(b, low);
    b.detail(() => cargoKit(b));
    b.build(into);
  });
  site('airport cargo yard', [ROAD.x, CARGO_ROAD.z - 6, YARD[2], YARD[3]], (into) => {
    const b = new Batch();
    cargoYard(b);
    b.build(into, { cast: false, receive: true });
  });
  for (let x = Math.floor(YARD[0] / 30) * 30; x < YARD[2]; x += 30)
    for (let z = Math.floor(YARD[1] / 30) * 30; z < YARD[3]; z += 30) {
      const here = RIGS.filter((r) => r.x >= x && r.x < x + 30 && r.z >= z && r.z < z + 30);
      if (!here.length) continue;
      site(`airport cargo trucks ${x},${z}`, here.map(rigRect).reduce((a, r): Rect => [Math.min(a[0], r[0]), Math.min(a[1], r[1]), Math.max(a[2], r[2]), Math.max(a[3], r[3])]), (into) => {
        const b = new Batch();
        for (const r of here) rig(b, r, low);
        b.build(into);
      });
    }
}
