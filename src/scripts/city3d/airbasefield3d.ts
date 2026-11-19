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
import { Batch, toon } from './kit';
import { site } from './tilework';
import { ROAD } from './palette';
import { MARK, G, TOP, box, light, mark } from './airportkit';
import { AIRFIELD_RECT as FIELD, APPROACH, APRON, APRON_ROAD, CONNECTORS, HANGARS, NORTH_LINKS, NORTH_TAXI, RUNWAY, SHELTER, SHELTERS, TAXIWAY } from './airbase';

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

export function register({ low }: { low: boolean }) {
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
}
