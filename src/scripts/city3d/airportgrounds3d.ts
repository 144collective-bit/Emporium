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
 * - Landside: Airport Drive, the forecourt's road and loop, the kerb, the
 *   short-stay car park.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, siteMat, toon } from './kit';
import { site } from './tilework';
import {
  AIRBRIDGES,
  AIRSIDE,
  APPROACH,
  APRON,
  APRON_KIT,
  CAR_PARK,
  CONCOURSES,
  CONNECTORS,
  EXEC_PAD,
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
 * The atlas: 8 cells a row, 128 square. Row 0: the stands' numbers (yellow paint); row 1: the taxiway letters
 * (location signs, yellow on black) A to D, the runway's hold-short sign (white on red, 09-27), the runway's
 * numbers 09 and 27 (white paint), a blank black cell; rows 2 and 3: the buildings' signs, a row each over the
 * whole width (MAINTENANCE, FIRE STATION)
 */
const CELL = 1 / 8;
const ATLAS = (() => {
  const t = canvasTex(1024, 512, (c) => {
    c.clearRect(0, 0, 1024, 512);
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
    c.font = `900 112px ${FONT_DISPLAY}`;
    c.fillStyle = '#e6e3f2';
    c.fillText('09', 5 * 128 + 64, 200);
    c.fillText('27', 6 * 128 + 64, 200);
    c.fillStyle = '#0b0a18';
    c.fillRect(7 * 128, 128, 128, 128);
    const row = (r: number, text: string, color: string) => {
      c.fillStyle = '#0b0a18';
      c.fillRect(0, 256 + r * 128, 1024, 128);
      c.font = `900 96px ${FONT_DISPLAY}`;
      c.fillStyle = color;
      c.fillText(text, 512, 256 + r * 128 + 70);
    };
    row(0, 'MAINTENANCE', '#00eaff');
    row(1, 'FIRE STATION', '#ff4d4d');
  });
  return t;
})();
/** Painted on the ground: cut out, lying flat */
const PAINT = siteMat('airport-paint', toon('#ffffff', { map: ATLAS, transparent: true, alphaTest: 0.4 }));
/** On boards and buildings: lit softly at night */
const SIGN = siteMat('airport-signs', lit(new THREE.MeshBasicMaterial({ map: ATLAS }), 0.95, 1.15));
/** A cell's UVs (u0, v0, u1, v1): `col` 0-7, `row` 0-1 (rows 2-3 are the buildings' signs, whole width) */
const cellUv = (col: number, row: number): [number, number, number, number] => [col * CELL, 1 - (row + 1) * 0.25, (col + 1) * CELL, 1 - row * 0.25];
const rowUv = (row: number): [number, number, number, number] => [0, 1 - (row + 1) * 0.25, 1, 1 - row * 0.25];

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

function taxiways(b: Batch, sx0: number, sx1: number, low: boolean) {
  const inS = (x: number) => x >= sx0 && x < sx1;
  const T = TAXIWAY;
  const R = RUNWAY;
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
  for (const [x0, z0, x1, z1] of [APRON, GA_APRON]) {
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
  for (const [x, z] of MASTS) {
    if (!inS(x)) continue;
    cyl(b, 0.16, 8, x, 0, z, STEEL, 8, 0.22);
    box(b, x - 1.2, 8, z - 0.25, x + 1.2, 8.5, z + 0.25, INK);
    for (const dx of [-0.8, 0, 0.8]) box(b, x + dx - 0.22, 7.95, z + 0.05, x + dx + 0.22, 8.05, z + 0.4, light('#fff6c8'));
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
    const W = z1 - z0;
    const arch = new THREE.CylinderGeometry(W * 0.75, W * 0.75, x1 - x0 + 0.6, 20, 1, false, -0.73, 1.46);
    arch.rotateZ(Math.PI / 2).translate((x0 + x1) / 2, H - 0.35 - W * 0.75 * Math.cos(0.73), (z0 + z1) / 2);
    b.add(arch, ROOF);
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
  const W = x1 - x0;
  const roof = new THREE.CylinderGeometry(W * 0.9, W * 0.9, z1 - z0 + 0.6, 24, 1, false, -0.59, 1.18).rotateX(Math.PI / 2);
  roof.translate((x0 + x1) / 2, wallH - W * 0.9 * Math.cos(0.59), (z0 + z1) / 2);
  b.add(roof, toon('#d6d2ea'));
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

function landside(b: Batch, low: boolean) {
  const h = ROAD.half;
  // Airport Drive in stretches, its centre line and a sidewalk each side
  for (let z = ROAD.z0 + 3.7; z < ROAD.z1 - h; z += 15) {
    const z1 = Math.min(z + 15, ROAD.z1 - h);
    box(b, ROAD.x - h, G, z, ROAD.x + h, TOP, z1, toon('#2a2840'));
    for (const s of [-1, 1]) box(b, ROAD.x + s * (h + 0.4) - 0.4, G, z, ROAD.x + s * (h + 0.4) + 0.4, TOP + 0.06, z1, PAVING);
    for (let zz = z + 1; zz < z1 - 1; zz += 3) mark(b, ROAD.x - 0.07, zz, ROAD.x + 0.07, zz + 1.6, WHITE);
  }
  // The front road and the loop
  for (let x = ROAD.x0 - h; x < ROAD.x1 + h; x += 15) {
    const x1 = Math.min(x + 15, ROAD.x1 + h);
    box(b, x, G, ROAD.z1 - h, x1, TOP, ROAD.z1 + h, toon('#2a2840'));
    box(b, x, G, ROAD.kerb - h, x1, TOP, ROAD.kerb + h, toon('#2a2840'));
  }
  for (const x of [ROAD.x0, ROAD.x1]) box(b, x - h, G, ROAD.z1 + h, x + h, TOP, ROAD.kerb - h, toon('#2a2840'));
  // Arrows round the one-way loop
  for (const x of [ROAD.x0 + 14, ROAD.x0 + 32, ROAD.x1 - 12]) {
    mark(b, x - 1.2, ROAD.kerb - 0.1, x + 0.4, ROAD.kerb + 0.1, WHITE);
    b.add(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0.45), new THREE.Vector2(0.9, 0), new THREE.Vector2(0, -0.45)])).rotateX(-Math.PI / 2).translate(x + 0.4, MARK, ROAD.kerb), WHITE);
  }
  // The kerb: a raised paved strip in front of the hall, bollards along its edge, zebras over to the car park
  box(b, ROAD.x0 - h - 2, G, ROAD.kerb + h, ROAD.x1 + h + 2, TOP + 0.12, HALL[1], PAVING);
  if (!low) for (let x = ROAD.x0; x <= ROAD.x1; x += 2.5) cyl(b, 0.09, 0.7, x, TOP + 0.12, ROAD.kerb + h + 0.35, STEEL, 6);
  for (const x of [ROAD.x0 + 12, (ROAD.x0 + ROAD.x1) / 2, ROAD.x1 - 12])
    for (let k = 0; k < 6; k++) mark(b, x - 1.6 + k * 0.6, ROAD.kerb - h + 0.2, x - 1.25 + k * 0.6, ROAD.kerb + h - 0.2, WHITE);
  // The car park: asphalt and bay lines
  const [cx0, cz0, cx1, cz1] = CAR_PARK;
  for (let x = cx0 - 0.6; x < cx1 + 0.6; x += 15) box(b, x, G, cz0 - 0.4, Math.min(x + 15, cx1 + 0.6), TOP - 0.002, cz1 + 0.4, toon('#302d48'));
  for (let x = cx0 + 0.35; x < cx1 - 0.5; x += 1.7)
    for (const [za, zb] of [
      [cz0, cz0 + 3.1],
      [cz1 - 3.1, cz1],
    ])
      mark(b, x - 0.04, za, x + 0.04, zb, WHITE);
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
  site('airport landside', [ROAD.x0 - 6, ROAD.z0, ROAD.x1 + 6, HALL[1]], (into) => {
    const b = new Batch();
    landside(b, low);
    b.build(into, { cast: false, receive: true });
  });
}
