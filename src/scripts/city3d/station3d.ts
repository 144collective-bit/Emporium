/*
 * Sector 7 Central on screen (docs/station-plan.md step 1; the numbers are
 * station.ts), a district loaded as you approach (`LAZY_DISTRICTS` id
 * `station` in districts.ts); the site worker loads it too.
 *
 * - **The hall** (sites): a glass hall under one sweeping vault, its front a
 *   great arched glass gable on the forecourt with the doors cut into its
 *   foot and SECTOR 7 CENTRAL over them, the roof running out over the
 *   pavement, steel ribs over it, a cyan line along its front edge; inside,
 *   the concourse up its ramp, the departures board (platforms and made-up
 *   places, no times), the ticket counter, the kiosks and the café, benches,
 *   pendant lights.
 * - **The shed** (sites, a bay of arches each): its glazed sides, the vault on
 *   steel arches, the glass lunette at its west end, the island platforms with
 *   their white and yellow edges and numbered signs, the tracks to the world's
 *   edge with their ballast, rails and (near) sleepers, the buffers.
 * - **The forecourt** (sites): the loop's asphalt with its centre line, the
 *   zebras to the doors, the fountains, benches and tree grates, the taxi rank
 *   and the bus bays with their shelters, the car park's bays and P sign.
 * - **On the main thread:** the hall's clock's hands (the visitor's time), the
 *   cabs and the parked cars.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, FONT_MONO, canvasTex, lit, neon, siteMat, toon } from './kit';
import type { Tick } from './world';
import { SLAB } from './world';
import { site } from './tilework';
import { EXT } from './layout';
import { parkedCars, type CarId } from './cars';
import { TAXI_YELLOW } from './kerbside';
import {
  BAY,
  BAYS,
  BENCHES,
  BENCH_LEN,
  BOARD,
  BUFFERS_X,
  BUS_BAYS,
  BUS_SHELTERS,
  CAFE_TABLES,
  CAR_PARK,
  CLOCK,
  COUNTERS,
  DESTINATIONS,
  DOORS,
  FOUNTAINS,
  HALL,
  ISLANDS,
  LOOP,
  PARKED,
  PLAT_Y,
  PLAZA_BENCHES,
  PLAZA_TREES,
  RAIL,
  RAMP,
  RANK,
  RANK_CABS,
  SHED,
  SHOPS,
  STATION_BLOCK,
  STATION_NAME,
  TRACKS,
  ARCHES,
} from './station';

export const SELF = import.meta.url;

/* ---------- Paint ---------- */

const STEEL = toon('#e9ecf4');
const DARK = toon('#2a2740');
const INK = toon('#1b1830');
const STONE = toon('#d8d4e2');
const FLOOR = toon('#c9c3d6');
const CONCRETE = toon('#a9a4bd');
const EDGE = toon('#efedf5');
const YELLOW = toon('#ffd23f');
const BALLAST = toon('#5a5466');
const SLEEPER = toon('#3d3647');
const RAILS = toon('#9a97a8');
const RED = toon('#e23b3b');
const WOOD = toon('#a8743f');
const ASPHALT = toon('#2c2a44');
const PAINT = toon('#e8e4f8');
const WATER = toon('#62c6ea');
const SPRAY = toon('#dff6ff');
const NAVY = toon('#1c2a55');
const GRATE = toon('#3a3550');
const CYAN = neon('#4fe3ff', 0.3, 2.4);
const BULB = neon('#ffe2a8', 0.25, 2.4);
const SHOP_PAINT: Record<string, THREE.Material> = { cafe: toon('#6b3f2a'), news: toon('#1f4e8c'), bakery: toon('#c98a3a'), flowers: toon('#3f8a52') };

/** The glass of the hall's and the shed's walls: tall panes and white mullions, lit warm inside at night; seen from both sides */
const GLASS = (() => {
  // (the pattern is 4 x 6 tiles: two panes across, two up)
  const draw = (on: boolean) => (c: CanvasRenderingContext2D) => {
    c.fillStyle = on ? '#000' : '#e9ecf4';
    c.fillRect(0, 0, 256, 256);
    for (const x of [6, 134])
      for (const y of [6, 134]) {
        if (on) {
          c.fillStyle = y < 128 ? '#7a6a48' : '#ffd99a';
          c.fillRect(x, y, 116, 116);
          continue;
        }
        const g = c.createLinearGradient(x, y, x + 116, y + 116);
        g.addColorStop(0, '#9fd2e6');
        g.addColorStop(0.55, '#5c8fb8');
        g.addColorStop(1, '#3d5f93');
        c.fillStyle = g;
        c.fillRect(x, y, 116, 116);
      }
  };
  const map = canvasTex(256, 256, draw(false));
  const emissiveMap = canvasTex(128, 128, (c) => {
    c.scale(0.5, 0.5);
    draw(true)(c);
  });
  for (const t of [map, emissiveMap]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return siteMat('station-glass', lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff', side: THREE.DoubleSide }), 0.06, 1.0));
})();
const GLASS_TILE: [number, number] = [4, 6];

/** The roofs' glazing: square panels in a white frame (8 x 8 tiles to the pattern), faintly lit at night; seen from both sides */
const ROOF = (() => {
  const draw = (on: boolean) => (c: CanvasRenderingContext2D) => {
    c.fillStyle = on ? '#000' : '#f3f4f8';
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        if (on) {
          c.fillStyle = '#5b5040';
          c.fillRect(i * 64 + 5, j * 64 + 5, 54, 54);
          continue;
        }
        c.fillStyle = (i + j) % 2 ? '#a9d4e6' : '#93c3dc';
        c.fillRect(i * 64 + 5, j * 64 + 5, 54, 54);
      }
  };
  const map = canvasTex(256, 256, draw(false));
  const emissiveMap = canvasTex(64, 64, (c) => {
    c.scale(0.25, 0.25);
    draw(true)(c);
  });
  for (const t of [map, emissiveMap]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return siteMat('station-roof', lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff', side: THREE.DoubleSide }), 0.05, 0.7));
})();
const ROOF_TILE = 8;

/** The name over the doors */
const NAME = siteMat(
  'station-name',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(1024, 128, (c) => {
        c.fillStyle = '#101a3a';
        c.fillRect(0, 0, 1024, 128);
        c.fillStyle = '#4fe3ff';
        c.fillRect(0, 118, 1024, 4);
        c.fillStyle = '#ffffff';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '14px';
        c.font = `800 84px ${FONT_DISPLAY}`;
        c.fillText(STATION_NAME, 512, 64);
      }),
    }),
    0.95,
    1.3
  )
);

/** The departures board: two columns of five platforms (platform, made-up place, status), no times */
const BOARD_MAT = siteMat(
  'station-board',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(1024, 256, (c) => {
        c.fillStyle = '#0c1024';
        c.fillRect(0, 0, 1024, 256);
        c.fillStyle = '#ffb43d';
        c.font = `700 30px ${FONT_MONO}`;
        c.textBaseline = 'middle';
        c.textAlign = 'center';
        c.fillText('DEPARTURES', 512, 26);
        c.fillStyle = '#2a3366';
        c.fillRect(20, 50, 984, 2);
        c.fillRect(511, 60, 2, 186);
        c.textAlign = 'left';
        c.font = `600 24px ${FONT_MONO}`;
        DESTINATIONS.forEach((place, i) => {
          const [x, y] = [i < 5 ? 30 : 542, 80 + (i % 5) * 38];
          c.fillStyle = '#ffffff';
          c.fillText(String(i + 1).padStart(2, ' '), x, y);
          c.fillStyle = '#ffb43d';
          c.fillText(place, x + 60, y);
          c.fillStyle = i % 3 === 1 ? '#5cf08c' : '#9aa3d6';
          c.textAlign = 'right';
          c.fillText(i % 3 === 1 ? 'BOARDING' : 'ON TIME', x + 452, y);
          c.textAlign = 'left';
        });
      }),
    }),
    0.95,
    1.1
  )
);

/**
 * One atlas for the station's small signs, two columns of 256 x 64: the platforms' signs (rows 0-9: island i's seen
 * from the east, then from the west), then TICKETS, TAXI, BUS, P and the shops' names
 */
const SIGN_CELLS = [
  ...ISLANDS.flatMap((_, i) => [`${2 * i + 1}   ${2 * i + 2}`, `${2 * i + 2}   ${2 * i + 1}`]),
  'TICKETS',
  'TAXI',
  'BUS',
  'P',
  ...SHOPS.map((s) => s.name),
];
const SIGNS = siteMat(
  'station-signs',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(512, 1024, (c) => {
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        SIGN_CELLS.forEach((text, k) => {
          const [x, y] = [(k % 2) * 256, Math.floor(k / 2) * 64];
          const shop = SHOPS.find((s) => s.name === text);
          c.fillStyle = shop ? { cafe: '#6b3f2a', news: '#1f4e8c', bakery: '#c98a3a', flowers: '#3f8a52' }[shop.kind] : text === 'TAXI' ? '#ffc23d' : text === 'P' ? '#2a62d8' : '#1c2a55';
          c.fillRect(x + 2, y + 2, 252, 60);
          c.fillStyle = text === 'TAXI' ? '#1b1830' : '#ffffff';
          c.font = `800 ${shop ? 30 : 40}px ${FONT_DISPLAY}`;
          if (k < ISLANDS.length * 2) {
            // (the island's two platforms either side of a bar)
            c.fillText(text, x + 128, y + 34);
            c.fillStyle = '#ffd23f';
            c.fillRect(x + 125, y + 14, 6, 38);
          } else c.fillText(text, x + 128, y + 34);
        });
      }),
    }),
    0.95,
    1.2
  )
);
/** A sign from the atlas: w x h, its middle at (x, y, z), facing the way `ry` turns +z */
function sign(b: Batch, text: string, x: number, y: number, z: number, w: number, h: number, ry: number) {
  const k = SIGN_CELLS.indexOf(text);
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  // (its cell, a hair inside it so the neighbours never bleed in)
  const [u0, v1] = [(k % 2) / 2 + 0.004, 1 - Math.floor(k / 2) / 16 - 0.003];
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (0.5 - 0.008), v1 - (1 - uv.getY(i)) * (1 / 16 - 0.006));
  b.add(g.rotateY(ry).translate(x, y, z), SIGNS);
}

/* ---------- Shapes ---------- */

const zm = (r: { z0: number; z1: number }) => (r.z0 + r.z1) / 2;
/** A vault's height over the ground across z: from `eave` at its sides to `crown` in the middle */
const vault = (r: { z0: number; z1: number; eave: number; crown: number }) => (z: number) => {
  const u = (z - zm(r)) / ((r.z1 - r.z0) / 2);
  return SLAB + r.eave + (r.crown - r.eave) * (1 - u * u);
};
const hallY = vault(HALL);
const shedY = vault(SHED);

/** Scale a geometry's uv (in world units) to a pattern `su` x `sv` tiles */
function scaleUv(g: THREE.BufferGeometry, su: number, sv: number) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / su, uv.getY(i) / sv);
  return g;
}
/** A glazed wall along x at z (from x0 to x1, y0 to y1), in pieces no longer than 15 */
function glassX(b: Batch, x0: number, x1: number, z: number, y0: number, y1: number) {
  const n = Math.max(1, Math.ceil((x1 - x0) / 15));
  for (let i = 0; i < n; i++) {
    const [a, c] = [x0 + ((x1 - x0) * i) / n, x0 + ((x1 - x0) * (i + 1)) / n];
    const g = new THREE.PlaneGeometry(c - a, y1 - y0);
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (a + uv.getX(k) * (c - a)) / GLASS_TILE[0], (y0 + uv.getY(k) * (y1 - y0)) / GLASS_TILE[1]);
    b.add(g.translate((a + c) / 2, (y0 + y1) / 2, z), GLASS);
  }
}
/** A glazed gable at x: the outline (z, y) as a shape, facing along x */
function gable(b: Batch, x: number, pts: [number, number][]) {
  const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(-z, y)));
  const g = new THREE.ShapeGeometry(shape);
  scaleUv(g, GLASS_TILE[0], GLASS_TILE[1]);
  b.add(g.rotateY(Math.PI / 2).translate(x, 0, 0), GLASS);
}
/** The points along a vault's line from z0 to z1 (n steps) */
const along = (f: (z: number) => number, z0: number, z1: number, n: number): [number, number][] => Array.from({ length: n + 1 }, (_, i) => [z0 + ((z1 - z0) * i) / n, f(z0 + ((z1 - z0) * i) / n)]);
/** A vaulted roof from x0 to x1 over z0..z1 on the line f, its glazing's pattern in world units */
function roof(b: Batch, x0: number, x1: number, z0: number, z1: number, f: (z: number) => number) {
  const nx = Math.max(1, Math.ceil((x1 - x0) / 4));
  const nz = Math.max(2, Math.ceil((z1 - z0) / 2.5));
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, f(pos.getZ(i)));
    uv.setXY(i, pos.getX(i) / ROOF_TILE, pos.getZ(i) / ROOF_TILE);
  }
  g.computeVertexNormals();
  b.add(g, ROOF);
}
/** A steel rib along a vault's line at x, `lift` over it */
function rib(b: Batch, x: number, z0: number, z1: number, f: (z: number) => number, lift: number, r: number, mat = STEEL) {
  const pts = along(f, z0, z1, 16).map(([z, y]) => new THREE.Vector3(x, y + lift, z));
  b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 4, false), mat);
}
/** A flat rectangle on the ground at y */
function flat(b: Batch, x0: number, z0: number, x1: number, z1: number, y: number, mat: THREE.Material, len = 14) {
  const nx = Math.max(1, Math.ceil((x1 - x0) / len));
  const nz = Math.max(1, Math.ceil((z1 - z0) / len));
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const [a0, a1] = [x0 + ((x1 - x0) * i) / nx, x0 + ((x1 - x0) * (i + 1)) / nx];
      const [c0, c1] = [z0 + ((z1 - z0) * j) / nz, z0 + ((z1 - z0) * (j + 1)) / nz];
      b.add(new THREE.PlaneGeometry(a1 - a0, c1 - c0).rotateX(-Math.PI / 2).translate((a0 + a1) / 2, y, (c0 + c1) / 2), mat);
    }
}
const cyl = (b: Batch, r: number, h: number, x: number, y: number, z: number, mat: THREE.Material, seg = 10, r0 = r, open = false) => b.add(new THREE.CylinderGeometry(r, r0, h, seg, 1, open).translate(x, y + h / 2, z), mat);

/* ---------- The hall ---------- */

/** Its roof running out over the pavement in front */
const OVERHANG = 2.2;

function hallShell(b: Batch) {
  const { x0, x1, z0, z1 } = HALL;
  // The north and south walls, glazed to the eaves
  glassX(b, x0, x1, z0, SLAB, hallY(z0));
  glassX(b, x0, x1, z1, SLAB, hallY(z1));
  // The front: one great arched gable, the doors cut into its foot
  const front: [number, number][] = [[z0, SLAB]];
  for (const dz of DOORS.z) front.push([dz - DOORS.half, SLAB], [dz - DOORS.half, SLAB + DOORS.h], [dz + DOORS.half, SLAB + DOORS.h], [dz + DOORS.half, SLAB]);
  front.push([z1, SLAB], ...along(hallY, z1, z0, 24));
  gable(b, x1, front);
  // ...the doors' frames, and their dark thresholds
  for (const dz of DOORS.z) {
    for (const s of [-1, 1]) b.box(x1 - 0.1, SLAB, dz + s * DOORS.half - 0.1, 0.2, DOORS.h, 0.2, DARK);
    b.box(x1 - 0.1, SLAB + DOORS.h, dz - DOORS.half - 0.1, 0.2, 0.2, DOORS.half * 2 + 0.2, DARK);
  }
  // The back: the strips beside the shed, and the gable between the shed's vault and the hall's
  gable(b, x0, [[z0, SLAB], [SHED.z0, SLAB], ...along(shedY, SHED.z0, SHED.z1, 20), [SHED.z1, SLAB], [z1, SLAB], ...along(hallY, z1, z0, 24)]);
  // The roof, out over the pavement, with its eaves a little past the walls; ribs over it, the cyan line along its front
  roof(b, x0, x1 + OVERHANG, z0 - 0.4, z1 + 0.4, hallY);
  for (let x = x0 + 1; x <= x1 + OVERHANG - 0.2; x += 3.5) rib(b, x, z0 - 0.4, z1 + 0.4, hallY, 0.18, 0.12);
  const edge = along(hallY, z0 - 0.4, z1 + 0.4, 24).map(([z, y]) => new THREE.Vector3(x1 + OVERHANG, y + 0.05, z));
  b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 40, 0.06, 4, false), CYAN);
  // Its feet: a plinth round the walls
  b.box(x0 - 0.05, SLAB, z0 - 0.05, x1 - x0 + 0.1, 0.25, 0.3, STONE);
  b.box(x0 - 0.05, SLAB, z1 - 0.25, x1 - x0 + 0.1, 0.25, 0.3, STONE);
  // The name over the middle doors
  b.add(new THREE.PlaneGeometry(14, 1.75).rotateY(Math.PI / 2).translate(x1 + 0.04, SLAB + DOORS.h + 1.6, zm(HALL)), NAME);
  b.box(x1 + 0.005, SLAB + DOORS.h + 0.6, zm(HALL) - 7.1, 0.03, 2, 14.2, INK);
}

function hallInside(b: Batch, low: boolean) {
  const { x0, x1, z0, z1, wall } = HALL;
  const zi0 = z0 + wall;
  const zi1 = z1 - wall;
  // The concourse's floor at the platforms' height, the ramp down to the doors
  b.box(x0, SLAB, zi0, RAMP.x0 - x0, PLAT_Y - SLAB, zi1 - zi0, FLOOR);
  const xr = x1 - wall;
  const g = new THREE.PlaneGeometry(xr - RAMP.x0, zi1 - zi0, 2, 4).rotateX(-Math.PI / 2).translate((RAMP.x0 + xr) / 2, 0, (zi0 + zi1) / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, Math.max(SLAB + 0.005, PLAT_Y * (1 - (pos.getX(i) - RAMP.x0) / (xr - RAMP.x0))));
  g.computeVertexNormals();
  b.add(g, FLOOR);
  // Dark inlays across the floor, in line with the doors
  for (const dz of DOORS.z) b.add(new THREE.PlaneGeometry(RAMP.x0 - x0 - 1, 0.3).rotateX(-Math.PI / 2).translate((x0 + RAMP.x0) / 2, PLAT_Y + 0.006, dz), NAVY);
  // The departures board, hung from the roof over the platforms' ends, facing the doors
  const { w, y0, y1 } = BOARD;
  b.box(BOARD.x - 0.3, y0 - 0.1, BOARD.z - w / 2 - 0.1, 0.3, y1 - y0 + 0.2, w + 0.2, INK);
  b.add(new THREE.PlaneGeometry(w, y1 - y0).rotateY(Math.PI / 2).translate(BOARD.x + 0.01, (y0 + y1) / 2, BOARD.z), BOARD_MAT);
  for (const s of [-1, 1]) b.box(BOARD.x - 0.18, y1 + 0.1, BOARD.z + s * (w / 2 - 1) - 0.03, 0.06, hallY(BOARD.z + s * (w / 2 - 1)) - y1 - 0.1, 0.06, STEEL);
  // The ticket hall: the counter, glass screens between its windows, TICKETS over it
  const cx0 = COUNTERS.xs[0] - 1.6;
  const cx1 = COUNTERS.xs[COUNTERS.xs.length - 1] + 1.6;
  const cz = COUNTERS.z + COUNTERS.depth;
  b.box(cx0, PLAT_Y, COUNTERS.z, cx1 - cx0, COUNTERS.h, COUNTERS.depth, NAVY);
  b.box(cx0 - 0.05, PLAT_Y + COUNTERS.h, COUNTERS.z, cx1 - cx0 + 0.1, 0.06, COUNTERS.depth + 0.08, WOOD);
  b.box(cx0, PLAT_Y + 2.4, COUNTERS.z, cx1 - cx0, 0.7, COUNTERS.depth, NAVY);
  for (let k = 0; k <= COUNTERS.xs.length; k++) {
    const x = k === 0 ? cx0 : k === COUNTERS.xs.length ? cx1 - 0.1 : (COUNTERS.xs[k - 1] + COUNTERS.xs[k]) / 2 - 0.05;
    b.box(x, PLAT_Y + COUNTERS.h, cz - 0.2, 0.1, 2.4 - COUNTERS.h, 0.1, STEEL);
  }
  sign(b, 'TICKETS', (cx0 + cx1) / 2, PLAT_Y + 2.75, cz + 0.01, 2.6, 0.62, 0);
  // The kiosks and the café along the south wall: their walls, a lit front, the name over it
  for (const s of SHOPS) {
    const zf = zi1 - s.depth;
    b.box(s.x0, PLAT_Y, zf, s.x1 - s.x0, 2.8, s.depth, SHOP_PAINT[s.kind]);
    b.box(s.x0 + 0.3, PLAT_Y + 0.9, zf - 0.006, s.x1 - s.x0 - 0.6, 1.2, 0.01, BULB);
    b.box(s.x0 + 0.2, PLAT_Y, zf - 0.5, s.x1 - s.x0 - 0.4, 0.95, 0.45, STONE);
    sign(b, s.name, (s.x0 + s.x1) / 2, PLAT_Y + 2.45, zf - 0.01, Math.min(2.8, s.x1 - s.x0 - 0.2), 0.55, Math.PI);
  }
  // The café's tables and chairs
  for (const [x, z] of CAFE_TABLES) {
    cyl(b, 0.35, 0.05, x, PLAT_Y + 0.72, z, WOOD, 12);
    cyl(b, 0.05, 0.72, x, PLAT_Y, z, DARK, 6);
    b.detail(() => {
      for (const s of [-1, 1]) {
        b.box(x + s * 0.6 - 0.2, PLAT_Y + 0.42, z - 0.2, 0.4, 0.06, 0.4, WOOD);
        b.box(x + s * 0.78 - 0.03, PLAT_Y + 0.42, z - 0.2, 0.06, 0.45, 0.4, WOOD);
        b.box(x + s * 0.6 - 0.02, PLAT_Y, z - 0.02, 0.04, 0.42, 0.04, DARK);
      }
    });
  }
  // Benches back to back across the concourse
  for (const bench of BENCHES) {
    const back = bench.ry === 0 ? -1 : 1;
    b.box(bench.x - BENCH_LEN / 2, PLAT_Y + 0.38, bench.z - 0.22, BENCH_LEN, 0.07, 0.44, WOOD);
    b.box(bench.x - BENCH_LEN / 2, PLAT_Y + 0.45, bench.z + back * 0.2 - 0.03, BENCH_LEN, 0.45, 0.06, WOOD);
    for (const s of [-1, 1]) b.box(bench.x + s * (BENCH_LEN / 2 - 0.15) - 0.04, PLAT_Y, bench.z - 0.18, 0.08, 0.38, 0.36, DARK);
  }
  // Pendant lights in rows under the roof
  if (!low)
    b.detail(() => {
      for (let x = x0 + 4; x < x1 - 3; x += 6)
        for (const z of [zm(HALL) - 14, zm(HALL), zm(HALL) + 14]) {
          if (Math.hypot(x - CLOCK.x, z - CLOCK.z) < 3) continue;
          const top = hallY(z);
          b.box(x - 0.015, 6.4, z - 0.015, 0.03, top - 6.4, 0.03, DARK);
          cyl(b, 0.32, 0.25, x, 6.15, z, DARK, 10, 0.08, true);
          b.add(new THREE.SphereGeometry(0.12, 8, 6).translate(x, 6.12, z), BULB);
        }
    });
}

/* ---------- The shed ---------- */

/** Shed bay i: from arch i to arch i + 1 (the sides, the roof, the platforms, the tracks, the arches over it) */
function shedBay(b: Batch, i: number, low: boolean) {
  const [a, c] = [ARCHES[i], ARCHES[i + 1]];
  glassX(b, a, c, SHED.z0, SLAB, shedY(SHED.z0));
  glassX(b, a, c, SHED.z1, SLAB, shedY(SHED.z1));
  roof(b, a, c, SHED.z0 - 0.4, SHED.z1 + 0.4, shedY);
  // The arch at its east end (and at the west end of the first), over the roof, on columns down the sides
  for (const x of i === 0 ? [a, c] : [c]) {
    if (x >= SHED.x1 - 0.1) continue;
    rib(b, x, SHED.z0 - 0.4, SHED.z1 + 0.4, shedY, 0.2, 0.16);
    for (const z of [SHED.z0 - 0.25, SHED.z1 + 0.05]) b.box(x - 0.2, SLAB, z, 0.4, shedY(SHED.z0) - SLAB + 0.2, 0.2, STEEL);
  }
  // The west end's lunette over the tracks
  if (i === 0) {
    const half = ((SHED.z1 - SHED.z0) / 2) * Math.sqrt(1 - (6 - SHED.eave) / (SHED.crown - SHED.eave));
    gable(b, a, [[zm(SHED) - half, SLAB + 6], [zm(SHED) + half, SLAB + 6], ...along(shedY, zm(SHED) + half, zm(SHED) - half, 16).slice(1, -1)]);
    b.box(a - 0.15, SLAB + 5.8, zm(SHED) - half, 0.3, 0.25, half * 2, STEEL);
  }
  // The platforms: concrete, white coping along each edge with the yellow line in from it
  for (const [z0, z1] of ISLANDS) {
    b.box(a, SLAB, z0, c - a, PLAT_Y - SLAB, z1 - z0, CONCRETE);
    for (const [e, s] of [[z0, 1], [z1, -1]] as const) {
      b.add(new THREE.PlaneGeometry(c - a, 0.3).rotateX(-Math.PI / 2).translate((a + c) / 2, PLAT_Y + 0.006, e + s * 0.15), EDGE);
      b.add(new THREE.PlaneGeometry(c - a, 0.1).rotateX(-Math.PI / 2).translate((a + c) / 2, PLAT_Y + 0.006, e + s * 0.55), YELLOW);
    }
  }
  // ...the far ends' railings
  if (i === 0)
    for (const [z0, z1] of ISLANDS) {
      b.box(SHED.x0 + 0.1, PLAT_Y + 1.0, z0 + 0.1, 0.08, 0.06, z1 - z0 - 0.2, YELLOW);
      for (let z = z0 + 0.15; z < z1; z += 0.75) b.box(SHED.x0 + 0.11, PLAT_Y, z, 0.06, 1.0, 0.06, YELLOW);
    }
  // Numbered signs hanging over each platform, every other bay
  if (i % 2 === 1)
    ISLANDS.forEach(([z0, z1], k) => {
      const z = (z0 + z1) / 2;
      const x = (a + c) / 2;
      b.box(x - 0.08, 3.2, z - 0.85, 0.16, 0.66, 1.7, INK);
      for (const s of [-1, 1]) b.box(x - 0.015, 3.86, z + s * 0.6 - 0.015, 0.03, shedY(z) - 3.86, 0.03, DARK);
      sign(b, SIGN_CELLS[2 * k], x + 0.085, 3.53, z, 1.6, 0.6, Math.PI / 2);
      sign(b, SIGN_CELLS[2 * k + 1], x - 0.085, 3.53, z, 1.6, 0.6, -Math.PI / 2);
    });
  tracks(b, a, c, SLAB, low);
}

/** The tracks from x0 to x1 on ground at y: ballast, two rails, near only the sleepers */
function tracks(b: Batch, x0: number, x1: number, y: number, low: boolean) {
  const n = Math.max(1, Math.ceil((x1 - x0) / 15));
  for (let i = 0; i < n; i++) {
    const [a, c] = [x0 + ((x1 - x0) * i) / n, x0 + ((x1 - x0) * (i + 1)) / n];
    for (const t of TRACKS) {
      b.box(a, y, t - 1.0, c - a, 0.06, 2.0, BALLAST);
      for (const s of [-1, 1]) b.box(a, y + 0.06, t + (s * RAIL.gauge) / 2 - 0.035, c - a, 0.1, 0.07, RAILS);
    }
  }
  if (low) return;
  b.detail(() => {
    const geo = new THREE.BoxGeometry(0.22, 0.05, RAIL.gauge + 0.5);
    const m: THREE.Matrix4[] = [];
    for (const t of TRACKS) for (let x = x0 + 0.35; x < x1; x += 0.7) m.push(new THREE.Matrix4().makeTranslation(x, y + 0.085, t));
    b.instances(geo, SLEEPER, m);
  });
}

function buffers(b: Batch) {
  for (const t of TRACKS) {
    b.box(BUFFERS_X - 0.2, SLAB, t - 0.8, 0.5, 0.75, 1.6, RED);
    b.box(BUFFERS_X - 0.21, SLAB + 0.75, t - 0.8, 0.52, 0.12, 1.6, YELLOW);
    for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 10).rotateZ(Math.PI / 2).translate(BUFFERS_X - 0.35, SLAB + 0.5, t + s * 0.5), DARK);
  }
}

/* ---------- The forecourt ---------- */

const ROAD_Y = 0.036;
const PAINT_Y = 0.046;
/** The avenue's north kerb (the loop's legs run from it) */
const KERB = STATION_BLOCK[3] + 0.8;

function loopRoad(b: Batch) {
  const { x0, x1, z1, half } = LOOP;
  flat(b, x0 - half, z1 - half, x0 + half, KERB, ROAD_Y, ASPHALT);
  flat(b, x1 - half, z1 - half, x1 + half, KERB, ROAD_Y, ASPHALT);
  flat(b, x0 + half, z1 - half, x1 - half, z1 + half, ROAD_Y, ASPHALT);
  b.detail(() => {
    // A dashed centre line round it (two-way)
    const dash = (x: number, z: number, along: 'x' | 'z') => b.add(new THREE.PlaneGeometry(along === 'x' ? 0.6 : 0.08, along === 'x' ? 0.08 : 0.6).rotateX(-Math.PI / 2).translate(x, PAINT_Y, z), YELLOW);
    for (const x of [x0, x1]) for (let z = KERB - 1.5; z > z1 + half; z -= 1.3) if (!DOORS.z.some((d) => x === x0 && Math.abs(z - d) < 1.9)) dash(x, z, 'z');
    for (let x = x0 + half + 0.6; x < x1 - half - 0.3; x += 1.3) dash(x, z1, 'x');
    // Zebras over the west leg to the doors
    for (const d of DOORS.z) for (let x = x0 - half + 0.3; x < x0 + half - 0.2; x += 0.85) b.add(new THREE.PlaneGeometry(0.45, 3).rotateX(-Math.PI / 2).translate(x + 0.22, PAINT_Y, d), PAINT);
  });
}

function plaza(b: Batch) {
  const Y = SLAB;
  // The fountains: a stone basin, its water, a bowl on a column and the jet
  for (const f of FOUNTAINS) {
    cyl(b, f.r, 0.5, f.x, Y, f.z, STONE, 32);
    b.add(new THREE.CircleGeometry(f.r - 0.25, 32).rotateX(-Math.PI / 2).translate(f.x, Y + 0.42, f.z), WATER);
    cyl(b, 0.25, 1.2, f.x, Y + 0.4, f.z, STONE, 12);
    cyl(b, 1.0, 0.2, f.x, Y + 1.5, f.z, STONE, 20, 0.35);
    b.add(new THREE.CircleGeometry(0.9, 20).rotateX(-Math.PI / 2).translate(f.x, Y + 1.69, f.z), WATER);
    cyl(b, 0.05, 1.3, f.x, Y + 1.7, f.z, SPRAY, 6, 0.12);
    b.add(new THREE.ConeGeometry(0.8, 0.9, 12, 1, true).rotateX(Math.PI).translate(f.x, Y + 2.65, f.z), SPRAY);
  }
  // Benches facing them, grates under the trees
  for (const p of PLAZA_BENCHES) {
    const back = p.ry === 0 ? -1 : 1;
    b.box(p.x - 1.1, Y + 0.38, p.z - 0.22, 2.2, 0.07, 0.44, WOOD);
    b.box(p.x - 1.1, Y + 0.45, p.z + back * 0.2 - 0.03, 2.2, 0.45, 0.06, WOOD);
    for (const s of [-1, 1]) b.box(p.x + s * 0.95 - 0.04, Y, p.z - 0.18, 0.08, 0.38, 0.36, DARK);
  }
  for (const [x, z] of PLAZA_TREES) b.box(x - 0.7, Y + 0.002, z - 0.7, 1.4, 0.01, 1.4, GRATE);
  // The taxi rank: its lay-by, its bays and TAXI on a post
  const [rx0, rz0, rx1, rz1] = RANK;
  flat(b, rx0, rz0, rx1, rz1, Y + 0.006, ASPHALT);
  b.detail(() => {
    for (const z of [rz0 + 0.3, ...RANK_CABS.map((c) => c + 1.8)]) b.add(new THREE.PlaneGeometry(rx1 - rx0 - 0.3, 0.08).rotateX(-Math.PI / 2).translate((rx0 + rx1) / 2 + 0.15, Y + 0.012, z), YELLOW);
  });
  b.box(rx1 + 0.2, Y, rz0 + 0.3, 0.08, 2.4, 0.08, DARK);
  sign(b, 'TAXI', rx1 + 0.19, Y + 2.2, rz0 + 0.34, 1.0, 0.25, -Math.PI / 2);
  sign(b, 'TAXI', rx1 + 0.33, Y + 2.2, rz0 + 0.34, 1.0, 0.25, Math.PI / 2);
  // The bus bays: their lay-by, BUS painted in each, a shelter by each
  const [bx0, bz0, bx1, bz1] = BUS_BAYS;
  flat(b, bx0, bz0, bx1, bz1, Y + 0.006, ASPHALT);
  b.detail(() => {
    b.add(new THREE.PlaneGeometry(0.1, bz1 - bz0).rotateX(-Math.PI / 2).translate(bx0 + 0.1, Y + 0.012, (bz0 + bz1) / 2), YELLOW);
  });
  for (const z of BUS_SHELTERS) {
    // (its glass back to the plaza, posts at its corners, the roof, a seat)
    const sx = bx0 - 1.4;
    const g = new THREE.PlaneGeometry(3.1, 2.0).rotateY(Math.PI / 2);
    b.add(scaleUv(g, GLASS_TILE[0] / 4, GLASS_TILE[1] / 4).translate(sx + 0.05, Y + 1.15, z), GLASS);
    for (const dz of [-1.55, 1.55]) for (const dx of [0, 0.85]) b.box(sx + dx, Y, z + dz - 0.04, 0.08, 2.2, 0.08, STEEL);
    b.box(sx - 0.1, Y + 2.2, z - 1.7, 1.2, 0.12, 3.4, NAVY);
    b.box(sx + 0.1, Y + 0.4, z - 1.3, 0.4, 0.06, 2.6, WOOD);
    b.box(sx + 0.95, Y, z + 1.55, 0.06, 2.5, 0.06, DARK);
    sign(b, 'BUS', sx + 0.95, Y + 2.65, z + 1.58, 0.6, 0.3, 0);
    sign(b, 'BUS', sx + 0.95, Y + 2.65, z + 1.52, 0.6, 0.3, Math.PI);
  }
}

function carPark(b: Batch, x0: number, x1: number) {
  b.detail(() => {
    for (const bay of BAYS) {
      if (bay.x < x0 || bay.x >= x1) continue;
      for (const s of [-1, 1]) b.add(new THREE.PlaneGeometry(0.08, BAY.d).rotateX(-Math.PI / 2).translate(bay.x + (s * BAY.w) / 2, SLAB + 0.006, bay.z), PAINT);
    }
  });
  if (x0 > CAR_PARK[0] + 1) return;
  // The P sign by its corner on the loop
  const [px, pz] = [CAR_PARK[0] + 0.6, CAR_PARK[3] - 0.6];
  b.box(px - 0.05, SLAB, pz - 0.05, 0.1, 2.6, 0.1, DARK);
  sign(b, 'P', px, SLAB + 2.3, pz + 0.07, 1.2, 0.3, 0);
  sign(b, 'P', px, SLAB + 2.3, pz - 0.07, 1.2, 0.3, Math.PI);
}

/* ---------- Registering ---------- */

export function register({ low, scene, tick }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  const build = (draw: (b: Batch) => void, cast = true) => (into: THREE.Object3D) => {
    const b = new Batch();
    draw(b);
    b.build(into, { cast, receive: true });
  };
  site('station hall', [HALL.x0 - 1, HALL.z0 - 1, HALL.x1 + OVERHANG + 0.5, HALL.z1 + 1], build(hallShell));
  site('station concourse', [HALL.x0, HALL.z0, HALL.x1, HALL.z1], build((b) => hallInside(b, low)));
  for (let i = 0; i < ARCHES.length - 1; i++) site(`station shed ${i}`, [ARCHES[i], SHED.z0 - 1, ARCHES[i + 1], SHED.z1 + 1], build((b) => (shedBay(b, i, low), i === ARCHES.length - 2 && buffers(b))));
  // The tracks on west of the shed: on the station's slab to its edge, then on the open ground to the world's edge
  const blockW = STATION_BLOCK[0] - 0.8;
  site('station tracks west', [blockW, SHED.z0, SHED.x0, SHED.z1], build((b) => tracks(b, blockW, SHED.x0, SLAB, low), false));
  for (let x = blockW; x > EXT[0] + 0.01; x -= 30) {
    const x0 = Math.max(EXT[0], x - 30);
    site(`station tracks ${Math.round(x)}`, [x0, SHED.z0, x, SHED.z1], build((b) => tracks(b, x0, x, 0.04, low), false));
  }
  site('station loop', [LOOP.x0 - LOOP.half, LOOP.z1 - LOOP.half, LOOP.x1 + LOOP.half, KERB], build(loopRoad, false));
  site('station plaza', [LOOP.x0 + LOOP.half, LOOP.z1 + LOOP.half, LOOP.x1 - LOOP.half, KERB], build(plaza));
  for (let x = CAR_PARK[0]; x < CAR_PARK[2] - 0.01; x += 24) {
    const x1 = Math.min(CAR_PARK[2], x + 24);
    site(`station car park ${Math.round(x)}`, [x, CAR_PARK[1], x1, CAR_PARK[3]], build((b) => carPark(b, x, x1), false));
  }
  if (!scene) return;
  // The cabs at the rank and the cars in the car park
  parkedCars(scene, SLAB, [...RANK_CABS.map((z): [CarId, number, number, number, string] => ['sedan', RANK[0] + 1.2, z, 0, TAXI_YELLOW]), ...(PARKED as [CarId, number, number, number, string][])]);
  // The clock hung over the concourse: four faces, its hands on the visitor's time
  scene.add(clock(tick));
}

/* ---------- The clock ---------- */

function clock(tick?: (f: Tick) => void) {
  const g = new THREE.Group();
  g.name = 'station-clock';
  g.userData.keep = true;
  const { r } = CLOCK;
  const face = canvasTex(256, 256, (c) => {
    c.fillStyle = '#fbfaf5';
    c.beginPath();
    c.arc(128, 128, 124, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#1b1830';
    c.lineWidth = 10;
    c.stroke();
    c.fillStyle = '#1b1830';
    for (let i = 0; i < 12; i++) {
      c.save();
      c.translate(128, 128);
      c.rotate((i / 12) * Math.PI * 2);
      c.fillRect(-5, -110, 10, i % 3 ? 18 : 30);
      c.restore();
    }
  });
  const faceMat = lit(new THREE.MeshBasicMaterial({ map: face }), 0.95, 1.1);
  const caseMat = toon('#1b1830');
  const handMat = toon('#1b1830');
  const red = toon('#e23b3b');
  // The case: a drum hung from a rod
  const body = new THREE.Mesh(new THREE.BoxGeometry(r * 2.15, r * 2.15, r * 2.15), caseMat);
  g.add(body);
  const rod = new THREE.Mesh(new THREE.BoxGeometry(0.06, hallY(CLOCK.z) - CLOCK.y - r, 0.06), caseMat);
  rod.position.y = (hallY(CLOCK.z) - CLOCK.y + r) / 2;
  g.add(rod);
  const hands: { h: THREE.Object3D; m: THREE.Object3D; s: THREE.Object3D }[] = [];
  for (let k = 0; k < 4; k++) {
    const side = new THREE.Group();
    side.rotation.y = (k * Math.PI) / 2;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 32), faceMat);
    disc.position.z = r * 1.08 + 0.005;
    side.add(disc);
    const hand = (len: number, w: number, mat: THREE.Material, dz: number) => {
      const pivot = new THREE.Group();
      pivot.position.z = r * 1.08 + dz;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.02), mat);
      m.position.y = len / 2 - 0.06;
      pivot.add(m);
      side.add(pivot);
      return pivot;
    };
    hands.push({ h: hand(r * 0.55, 0.09, handMat, 0.02), m: hand(r * 0.82, 0.06, handMat, 0.04), s: hand(r * 0.88, 0.02, red, 0.06) });
    g.add(side);
  }
  g.position.set(CLOCK.x, CLOCK.y, CLOCK.z);
  const set = () => {
    const d = new Date();
    const s = d.getSeconds();
    const m = d.getMinutes() + s / 60;
    const h = (d.getHours() % 12) + m / 60;
    for (const t of hands) {
      t.h.rotation.z = -(h / 12) * Math.PI * 2;
      t.m.rotation.z = -(m / 60) * Math.PI * 2;
      t.s.rotation.z = -(s / 60) * Math.PI * 2;
    }
  };
  set();
  let last = -1;
  tick?.(() => {
    const s = new Date().getSeconds();
    if (s === last) return;
    last = s;
    set();
  });
  return g;
}
