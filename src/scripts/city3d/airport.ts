/*
 * Sector 7 Airport (south-east of the Southside Loop): the runway with its
 * markings and lights, the taxiway and apron, the terminal (glass front, a
 * wave roof, the SECTOR 7 AIRPORT sign, airbridges), the control tower,
 * the hangar, the helipad, floodlight masts, a windsock, ground vehicles,
 * the access road round the car park, and the aircraft flying their
 * timetable (airfield.ts). It's all at ground level, in world numbers.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, fx, glowMat, lit, neon, plane, rng, toon } from './kit';
import {
  AIRBRIDGES,
  APPROACH,
  APRON,
  APRON_KIT,
  CAR_PARK,
  CONNECTORS,
  FLIGHTS,
  HANGAR,
  HANGAR_DOOR,
  HANGAR_OFFICE,
  HELIPAD,
  MASTS,
  PARKED,
  PROP_STAND,
  ROAD,
  RUNWAY,
  STANDS,
  TAXIWAY,
  TERMINAL,
  TOWER,
  WINDSOCK,
  SITE,
  poseAt,
  type AircraftKind,
  type Pose,
} from './airfield';
import { createFleet } from './aircraft';
import { parkedCars, type CarId } from './cars';
import { NS_ROADS } from './layout';
import type { Idle, Spot } from './landmarks';
import { addLamp, addPool, addTree, type Tick } from './world';

/** Ground surfaces sit just under the roads' height, markings just over it */
const G = 0.004;
const TOP = 0.03;
const MARK = 0.032;

const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, mat);
/** A flat marking lying on the ground */
const mark = (b: Batch, x0: number, z0: number, x1: number, z1: number, mat: THREE.Material, y = MARK) =>
  b.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2), mat);
const cyl = (b: Batch, r: number, h: number, x: number, y: number, z: number, mat: THREE.Material, seg = 10, r0 = r) =>
  b.add(new THREE.CylinderGeometry(r, r0, h, seg).translate(x, y + h / 2, z), mat);

const ASPHALT = toon('#2a2840');
const TAXI_ASPHALT = toon('#302d48');
const CONCRETE = toon('#8a85aa');
const PAVING = toon('#7a7598');
const WHITE = toon('#e6e3f2');
const YELLOW = toon('#ffd23f');
const INK = toon('#1b1830');
const STEEL = toon('#4b4766');
const PALE = toon('#c9c4e6');
/** Runway and taxiway lights: tiny, dim by day, glowing at night (only bulbs this small may bloom) */
const light = (c: string) => neon(c, 0.25, 2.4);
/** Bigger lit panels glow softer */
const soft = (c: string) => neon(c, 0.4, 1.3);

/** The airport's place in the city: the hangar is its building (its pin, its hover, its panel) */
export interface Airport {
  spot: Spot;
  /** Where the airport's own aircraft are now (your aircraft bumps softly off them) */
  traffic(): { kind: AircraftKind; pose: Pose }[];
}

export function buildAirport(scene: THREE.Scene, crowd: Idle[], tick: (f: Tick) => void, opts: { reduced: boolean; low: boolean }): Airport {
  const group = new THREE.Group();
  group.name = 'airport';
  scene.add(group);
  // The hangar and its office: the airport's place (lifted on hover in City view)
  const places = new THREE.Group();
  places.name = 'airport-hangar';
  group.add(places);
  const b = new Batch();
  const hb = new Batch();
  surfaces(b);
  runwayLights(b);
  terminal(b, group, crowd, opts.low);
  tower(b, group, tick);
  hangar(hb, places);
  hb.build(places);
  helipad(b);
  apronKit(b);
  windsock(group, tick, opts.reduced);
  roadside(group);
  b.build(group);
  const traffic = flying(scene, tick, opts.reduced);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.64, 48), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(HANGAR_DOOR.x, 0.05, HANGAR_DOOR.z);
  group.add(fx(ring));
  const spot: Spot = {
    id: 'airport',
    group: places,
    focus: new THREE.Vector3((SITE[0] + SITE[2]) / 2, 0, (SITE[1] + SITE[3]) / 2),
    size: 130,
    pin: new THREE.Vector3((HANGAR[0] + HANGAR[2]) / 2, HANGAR[4] + 1.6, (HANGAR[1] + HANGAR[3]) / 2),
    ring,
  };
  return { spot, traffic };
}

/* ---------- Runway, taxiway, apron, road ---------- */

function surfaces(b: Batch) {
  const { x0, x1, z, half } = RUNWAY;
  // The runway: asphalt with shoulders, edge lines, centre dashes, threshold bars, aiming and touchdown marks
  box(b, x0 - 1, 0.002, z - half - 1, x1 + 1, 0.022, z + half + 1, TAXI_ASPHALT);
  box(b, x0, G, z - half, x1, TOP, z + half, ASPHALT);
  for (const s of [-1, 1]) mark(b, x0 + 0.5, z + s * (half - 0.35) - 0.12, x1 - 0.5, z + s * (half - 0.35) + 0.12, WHITE);
  for (let x = x0 + 14; x < x1 - 14; x += 6) mark(b, x, z - 0.14, x + 3.2, z + 0.14, WHITE);
  for (const [end, dir] of [
    [x0, 1],
    [x1, -1],
  ] as const) {
    // Piano keys: four bars either side of the centre line
    for (const s of [-1, 1])
      for (let k = 0; k < 4; k++)
        mark(b, Math.min(end + dir * 1, end + dir * 5.5), z + s * (0.9 + k * 0.75), Math.max(end + dir * 1, end + dir * 5.5), z + s * (0.9 + k * 0.75 + 0.4), WHITE);
    // The aiming point and touchdown zone
    for (const s of [-1, 1]) {
      const a = end + dir * 24;
      mark(b, Math.min(a, a + dir * 5), z + s * 1.6 - 0.45, Math.max(a, a + dir * 5), z + s * 1.6 + 0.45, WHITE);
      for (const d of [34, 42])
        for (const k of [0, 1])
          mark(b, Math.min(end + dir * d, end + dir * (d + 3)), z + s * (1.2 + k * 0.6), Math.max(end + dir * d, end + dir * (d + 3)), z + s * (1.2 + k * 0.6 + 0.3), WHITE);
    }
  }
  // Runway numbers (09 landing east, 27 the other way), painted to read from the approach
  const numbers = canvasTex(256, 128, (c) => {
    c.clearRect(0, 0, 256, 128);
    c.font = `900 118px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#e6e3f2';
    c.fillText('09', 64, 68);
    c.fillText('27', 192, 68);
  });
  const numMat = toon('#ffffff', { map: numbers, transparent: true, alphaTest: 0.4 });
  for (const [x, u0, ry] of [
    [x0 + 10, 0, -Math.PI / 2],
    [x1 - 10, 0.5, Math.PI / 2],
  ] as const) {
    const g = new THREE.PlaneGeometry(5, 4.4);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * 0.5);
    g.rotateX(-Math.PI / 2)
      .rotateY(ry)
      .translate(x, MARK, z);
    b.add(g, numMat);
  }

  // The taxiway and its connectors: yellow centre lines, hold-short bars before the runway
  const T = TAXIWAY;
  box(b, T.x0, G, T.z - T.half, T.x1, TOP, T.z + T.half, TAXI_ASPHALT);
  mark(b, T.x0 + 1, T.z - 0.08, T.x1 - 1, T.z + 0.08, YELLOW);
  for (const cx of CONNECTORS) {
    box(b, cx - T.half, G, T.z, cx + T.half, TOP, z - half, TAXI_ASPHALT);
    mark(b, cx - 0.08, T.z + T.half, cx + 0.08, z - half, YELLOW);
    for (const k of [0, 0.5, 1.4, 1.9]) mark(b, cx - T.half + 0.2, z - half - 3 - k, cx + T.half - 0.2, z - half - 2.8 - k, YELLOW);
  }
  // The apron: concrete with expansion joints; each stand's lead-in line and stop bar
  const [ax0, az0, ax1, az1] = APRON;
  box(b, ax0, G, az0, ax1, TOP - 0.002, az1, CONCRETE);
  const joint = toon('#7a7598');
  for (let x = ax0 + 6; x < ax1; x += 6) mark(b, x - 0.03, az0, x + 0.03, az1, joint, TOP);
  for (let zz = az0 + 6; zz < az1; zz += 6) mark(b, ax0, zz - 0.03, ax1, zz + 0.03, joint, TOP);
  for (const [sx, sz] of STANDS) {
    mark(b, sx - 0.09, sz - 9.5, sx + 0.09, T.z, YELLOW);
    mark(b, sx - 1.2, sz - 9.9, sx + 1.2, sz - 9.6, YELLOW);
    // A red safety line round the stand
    const red = toon('#e23b3b');
    for (const s of [-1, 1]) mark(b, sx + s * 9.8 - 0.07, sz - 10.5, sx + s * 9.8 + 0.07, sz + 10, red);
  }
  mark(b, PROP_STAND[0] - 0.08, PROP_STAND[1], PROP_STAND[0] + 0.08, T.z, YELLOW);

  // The access road off the avenue, and the one-way loop round the car park
  const AV = NS_ROADS.at(-1)!;
  const h = ROAD.half;
  box(b, AV.c + AV.half - 0.2, G, ROAD.z - h, ROAD.x1 + h, TOP, ROAD.z + h, ASPHALT);
  box(b, ROAD.loopX - h, G, ROAD.loopZ - h, ROAD.loopX + h, TOP, ROAD.z - h, ASPHALT);
  box(b, ROAD.x1 - h, G, ROAD.loopZ - h, ROAD.x1 + h, TOP, ROAD.z - h, ASPHALT);
  box(b, ROAD.loopX + h, G, ROAD.loopZ - h, ROAD.x1 - h, TOP, ROAD.loopZ + h, ASPHALT);
  for (let x = AV.c + AV.half + 1; x < ROAD.loopX - 2; x += 2.4) mark(b, x, ROAD.z - 0.06, x + 1.2, ROAD.z + 0.06, YELLOW);
  // Zebra crossing from the car park to the terminal
  for (let k = 0; k < 6; k++) mark(b, 129 + k * 0.6, ROAD.z - h + 0.2, 129.35 + k * 0.6, ROAD.z + h - 0.2, WHITE);
  // The car park: asphalt, bay lines
  const [cx0, cz0, cx1, cz1] = CAR_PARK;
  box(b, cx0 - 0.6, G, cz0 - 0.4, cx1 + 0.6, TOP - 0.002, cz1 + 0.4, TAXI_ASPHALT);
  for (let x = cx0 + 0.35; x < cx1 - 0.5; x += 1.7)
    for (const [za, zb] of [
      [cz0, cz0 + 3.1],
      [cz1 - 3.1, cz1],
    ])
      mark(b, x - 0.04, za, x + 0.04, zb, WHITE);
  // The drop-off kerb in front of the terminal, and a paved walk round it
  box(b, ROAD.loopX, G, ROAD.z + h, ROAD.x1 + 2, TOP + 0.02, TERMINAL[1], PAVING);
  box(b, TERMINAL[0] - 1.5, G, TERMINAL[1], TERMINAL[0], TOP + 0.02, TERMINAL[3], PAVING);
  box(b, TERMINAL[2], G, TERMINAL[1], TOWER.x + 3.5, TOP + 0.02, APRON[1], PAVING);

  // Approach lights: a row of poles out past the threshold, a crossbar every few
  for (let x = APPROACH.x0; x <= APPROACH.x1; x += 2) {
    const tall = 0.35 + (APPROACH.x1 - x) * 0.04;
    box(b, x - 0.06, 0, z - 0.06, x + 0.06, tall, z + 0.06, STEEL);
    const w = (x - APPROACH.x0) % 6 === 0 ? 2.4 : 0.6;
    box(b, x - 0.05, tall, z - w / 2, x + 0.05, tall + 0.06, z + w / 2, STEEL);
    for (let k = -w / 2 + 0.15; k <= w / 2 - 0.1; k += 0.4) box(b, x - 0.09, tall + 0.06, z + k - 0.07, x + 0.09, tall + 0.18, z + k + 0.07, light('#fff6c8'));
  }
}

/** Edge lights along the runway (white, green at the threshold, red at the far end) and the taxiway (blue), and the PAPI */
function runwayLights(b: Batch) {
  const { x0, x1, z, half } = RUNWAY;
  const bulb = (x: number, zz: number, c: string) => {
    box(b, x - 0.06, 0, zz - 0.06, x + 0.06, 0.18, zz + 0.06, STEEL);
    box(b, x - 0.1, 0.18, zz - 0.1, x + 0.1, 0.3, zz + 0.1, light(c));
  };
  for (let x = x0 + 2; x <= x1 - 2; x += 8) for (const s of [-1, 1]) bulb(x, z + s * (half + 0.4), '#fff6c8');
  for (let k = -half + 0.5; k <= half - 0.5; k += 1) {
    bulb(x0 - 0.4, z + k, '#2bff88');
    bulb(x1 + 0.4, z + k, '#ff2b2b');
  }
  const T = TAXIWAY;
  for (let x = T.x0 + 2; x <= T.x1 - 2; x += 8) for (const s of [-1, 1]) if (!CONNECTORS.some((c) => Math.abs(x - c) < T.half + 1)) bulb(x, T.z + s * (T.half + 0.3), '#2a8bff');
  // The PAPI: four lights beside the touchdown zone, two red two white
  for (let k = 0; k < 4; k++) {
    const x = x0 + 26;
    const zz = z + half + 3 + k * 1.1;
    box(b, x - 0.35, 0, zz - 0.3, x + 0.35, 0.45, zz + 0.3, STEEL);
    box(b, x + 0.35, 0.15, zz - 0.18, x + 0.4, 0.4, zz + 0.18, light(k < 2 ? '#fff6c8' : '#ff2b2b'));
  }
}

/* ---------- The terminal ---------- */

/** A glass curtain wall: panes and mullions, lit inside at night (some warm, some cyan) */
const GLASS = (() => {
  const draw = (lit: boolean) => (c: CanvasRenderingContext2D) => {
    const r = rng(9);
    c.fillStyle = lit ? '#000' : '#26315f';
    c.fillRect(0, 0, 512, 256);
    for (let x = 0; x < 512; x += 32)
      for (const [y0, y1] of [
        [8, 120],
        [136, 248],
      ]) {
        if (lit) {
          const k = r();
          c.fillStyle = k < 0.55 ? '#ffd36b' : k < 0.8 ? '#7fe9ff' : '#000';
          c.fillRect(x + 3, y0, 26, y1 - y0);
          continue;
        }
        const g = c.createLinearGradient(x, y0, x + 32, y1);
        g.addColorStop(0, '#5873b8');
        g.addColorStop(0.5, '#2c3a73');
        g.addColorStop(1, '#1a2150');
        c.fillStyle = g;
        c.fillRect(x + 3, y0, 26, y1 - y0);
      }
    if (!lit) {
      c.fillStyle = '#c9c4e6';
      for (let x = 0; x < 512; x += 32) c.fillRect(x, 0, 3, 256);
      c.fillRect(0, 0, 512, 8);
      c.fillRect(0, 120, 512, 16);
      c.fillRect(0, 248, 512, 8);
    }
  };
  const map = canvasTex(512, 256, draw(false));
  const emissiveMap = canvasTex(256, 128, (c) => {
    c.scale(0.5, 0.5);
    draw(true)(c);
  });
  for (const t of [map, emissiveMap]) t.wrapS = THREE.RepeatWrapping;
  return lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff' }), 0.08, 1.05);
})();
/** A glazed wall `w` long and `h` tall, its pattern repeating every 8 tiles */
function glazing(w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * w) / 8);
  return g;
}

function terminal(b: Batch, group: THREE.Group, crowd: Idle[], low: boolean) {
  const [x0, z0, x1, z1, H] = TERMINAL;
  // The body: concrete ends, a dark band at the floor between, glass both long sides
  // (tucked just inside the pale ends: flush with their outer faces, the two flicker)
  box(b, x0 + 0.05, 0, z0 + 0.2, x1 - 0.05, H - 0.4, z1 - 0.2, toon('#2b2848'));
  for (const x of [x0, x1 - 1.2]) box(b, x, 0, z0, x + 1.2, H - 0.3, z1, PALE);
  for (let x = x0 + 9; x < x1 - 4; x += 12) box(b, x, 0, z0 - 0.05, x + 0.5, H - 0.3, z1 + 0.05, PALE);
  const glassMeshes: THREE.Mesh[] = [];
  for (const [zz, ry] of [
    [z0 + 0.15, Math.PI],
    [z1 - 0.15, 0],
  ] as const) {
    const m = new THREE.Mesh(glazing(x1 - x0 - 2.4, H - 0.7), GLASS);
    m.position.set((x0 + x1) / 2, (H - 0.7) / 2 + 0.1, zz + (ry ? -0.01 : 0.01));
    m.rotation.y = ry;
    glassMeshes.push(m);
  }
  // Entrance doors on the landside, under the canopy
  for (const x of [118, 130, 142]) {
    box(b, x - 1.1, 0, z0 - 0.08, x + 1.1, 1.7, z0 + 0.05, toon('#14102a'));
    box(b, x - 1.0, 0, z0 - 0.1, x + 1.0, 1.6, z0 - 0.06, soft('#ffd36b'));
    box(b, x - 0.04, 0, z0 - 0.12, x + 0.04, 1.6, z0 - 0.08, INK);
  }
  // The wave roof: a long arch over the hall, overhanging the kerb as a canopy
  const roof = new THREE.Shape();
  const profile: [number, number][] = [];
  for (let k = 0; k <= 24; k++) {
    const f = k / 24;
    const zz = z0 - 3.2 + f * (z1 - z0 + 4.4);
    profile.push([zz, H - 0.1 + Math.sin(f * Math.PI) * 1.4 + f * 0.3]);
  }
  roof.moveTo(profile[0][0], profile[0][1]);
  for (const [zz, y] of profile) roof.lineTo(zz, y);
  for (const [zz, y] of [...profile].reverse()) roof.lineTo(zz, y + 0.32);
  // The shape is drawn in (z, y); turned so its depth runs along x
  const rg = new THREE.ExtrudeGeometry(roof, { depth: x1 - x0 + 2, bevelEnabled: false });
  rg.rotateY(-Math.PI / 2).translate(x1 + 1, 0, 0);
  b.add(rg, toon('#e9e6f5'));
  // A neon trim under the canopy's edge, and its columns
  box(b, x0 - 1, H - 0.18, z0 - 3.25, x1 + 1, H - 0.12, z0 - 3.15, soft(PAL.cyan));
  for (let x = x0 + 4; x < x1; x += 10) cyl(b, 0.14, H - 0.1, x, 0, z0 - 2.8, PALE, 10);
  // Rooftop plant
  for (const x of [104, 126, 151]) box(b, x, H + 1.0, z0 + 5, x + 2.2, H + 1.6, z0 + 6.6, STEEL);

  // The sign over the entrance
  const sign = canvasTex(1024, 128, (c) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, 1024, 128);
    c.font = `900 92px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const g = c.createLinearGradient(160, 0, 860, 0);
    g.addColorStop(0, PAL.magenta);
    g.addColorStop(0.5, '#8000ff');
    g.addColorStop(1, PAL.cyan);
    c.fillStyle = g;
    c.fillText('SECTOR 7 AIRPORT', 512, 70);
  });
  const sx = 130;
  box(b, sx - 9.2, H + 0.2, z0 - 2.45, sx + 9.2, H + 2.0, z0 - 2.2, INK);
  for (const x of [sx - 7, sx + 7]) box(b, x - 0.1, H, z0 - 2.4, x + 0.1, H + 0.25, z0 - 2.25, INK);
  const board = plane(18, 1.6, lit(new THREE.MeshBasicMaterial({ map: sign }), 0.95, 1.15));
  board.position.set(sx, H + 1.1, z0 - 2.47);
  board.rotation.y = Math.PI;
  group.add(fx(board), ...glassMeshes);

  // Airbridges: a tunnel out from the hall and a cab turned to the jet's front door, on a wheeled leg
  for (const a of AIRBRIDGES) {
    const y0 = 2.1;
    box(b, a.x - 0.8, y0, a.z0 - 0.1, a.x + 0.8, y0 + 1.9, a.z1 - 0.7, toon('#9a95bb'));
    box(b, a.x - 0.82, y0 + 0.9, a.z0, a.x + 0.82, y0 + 1.5, a.z1 - 0.8, toon('#26315f'));
    box(b, a.x - 0.9, y0 - 0.05, a.z1 - 1.5, a.x + 1.85, y0 + 2.0, a.z1, toon('#7a7598'));
    box(b, a.x + 1.85, y0 + 0.1, a.z1 - 1.3, a.x + 1.95, y0 + 1.9, a.z1 - 0.2, INK);
    box(b, a.x - 0.25, 0, a.z1 - 1.1, a.x + 0.25, y0, a.z1 - 0.5, STEEL);
    for (const s of [-1, 1]) cyl(b, 0.28, 0.2, a.x + s * 0.35, 0.28, a.z1 - 0.8, toon('#17151f'), 12);
  }

  // People at the doors: arriving, waiting, chatting
  const r = rng(31);
  const n = low ? 5 : 10;
  for (let i = 0; i < n; i++) {
    const x = 112 + r() * 36;
    const z = z0 - 1.2 - r() * 1.2;
    crowd.push({ x, z, ry: r() < 0.5 ? Math.PI : (r() - 0.5) * 2, y: TOP + 0.02, act: i % 3 === 0 ? 'chat' : i % 3 === 1 ? 'queue' : 'look' });
  }
}

/* ---------- The tower, the hangar, the helipad ---------- */

function tower(b: Batch, group: THREE.Group, tick: (f: Tick) => void) {
  const { x, z, r, cab, top } = TOWER;
  box(b, x - 2.6, 0, z - 2.4, x + 2.6, 2.6, z + 2.4, PALE);
  box(b, x - 2.65, 2.6, z - 2.45, x + 2.65, 2.75, z + 2.45, STEEL);
  cyl(b, r, cab - 0.02, x, 0, z, toon('#d6d2ea'), 16);
  // The cab: a wider deck, sloping glass all round, a roof and a mast
  cyl(b, 2.3, 0.3, x, cab - 0.3, z, STEEL, 10, 1.6);
  const glass = new THREE.CylinderGeometry(2.55, 2.2, 1.7, 10, 1, true).translate(x, cab + 0.85, z);
  b.add(glass, soft('#3fd2ff'));
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    b.add(new THREE.BoxGeometry(0.08, 1.75, 0.08).rotateZ(0).translate(x + Math.cos(a) * 2.42, cab + 0.85, z + Math.sin(a) * 2.42), INK);
  }
  cyl(b, 2.75, 0.25, x, cab + 1.7, z, toon('#e9e6f5'), 10, 2.6);
  cyl(b, 0.05, top - cab - 1.95, x, cab + 1.95, z, STEEL, 6);
  // The beacon on top: green and white in turn, all night
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), neon('#2bff88', 0.4, 2.4));
  beacon.position.set(x, top, z);
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), neon('#fff6c8', 0.4, 2.4));
  white.position.set(x, top, z);
  group.add(fx(beacon), fx(white));
  tick(({ t }) => {
    const on = Math.floor(t * 0.8) % 2 === 0;
    beacon.visible = on;
    white.visible = !on;
  });
}

function hangar(b: Batch, group: THREE.Group) {
  const [x0, z0, x1, z1, H] = HANGAR;
  const W = x1 - x0;
  const wallH = 4.2;
  const wall = toon('#5a6fa8');
  // Side walls and the back
  box(b, x0, 0, z0, x0 + 0.4, wallH, z1, wall);
  box(b, x1 - 0.4, 0, z0, x1, wallH, z1, wall);
  box(b, x0, 0, z0, x1, wallH, z0 + 0.4, wall);
  // The arched roof: a flattened half-cylinder along z, ribbed
  const arch = new THREE.CylinderGeometry(W / 2 + 0.3, W / 2 + 0.3, z1 - z0 + 0.6, 24, 1, true, -Math.PI / 2, Math.PI);
  // Turned so the half above the walls is the one kept (its axis along z)
  arch.rotateX(-Math.PI / 2).scale(1, (H - wallH) / (W / 2 + 0.3), 1);
  arch.translate((x0 + x1) / 2, wallH, (z0 + z1) / 2);
  b.add(arch, toon('#d6d2ea'));
  for (let zz = z0 + 1.5; zz < z1; zz += 3.5) {
    const rib = new THREE.TorusGeometry(W / 2 + 0.32, 0.08, 4, 24, Math.PI).scale(1, (H - wallH) / (W / 2 + 0.3), 1).translate((x0 + x1) / 2, wallH, zz);
    b.add(rib, STEEL);
  }
  // The front: the gable over the doorway, the doors slid open to the sides, a dark hall inside
  const gable = new THREE.Shape();
  gable.moveTo(-W / 2, 0);
  for (let k = 0; k <= 16; k++) {
    const a = Math.PI - (k / 16) * Math.PI;
    gable.lineTo(Math.cos(a) * (W / 2), Math.sin(a) * (H - wallH));
  }
  gable.lineTo(W / 2, -0.4);
  gable.lineTo(-W / 2, -0.4);
  const gg = new THREE.ShapeGeometry(gable).translate((x0 + x1) / 2, wallH, z1 + 0.02);
  b.add(gg, wall);
  // Seen from inside (the hangar menu looks in): the roof's underside, and both gables' inner faces and the back's outer one
  b.add(inward(arch), toon('#8f8aae'));
  b.add(new THREE.ShapeGeometry(gable).rotateY(Math.PI).translate((x0 + x1) / 2, wallH, z1 - 0.02), wall);
  b.add(new THREE.ShapeGeometry(gable).translate((x0 + x1) / 2, wallH, z0 + 0.42), wall);
  b.add(new THREE.ShapeGeometry(gable).rotateY(Math.PI).translate((x0 + x1) / 2, wallH, z0 - 0.02), wall);
  box(b, x0 + 0.42, 0, z0 + 0.5, x1 - 0.42, wallH - 0.4, z0 + 0.6, toon('#0e0c1a'));
  box(b, x0 + 0.4, 0, z0 + 0.4, x1 - 0.4, 0.01, z1, toon('#4b4766'));
  // The doors' outer sides just inside the walls' faces, the yellow strip's ends just past them (flush, they flicker)
  for (const [a, c] of [
    [x0 + 0.03, x0 + 4.2],
    [x1 - 4.2, x1 - 0.03],
  ])
    box(b, a, 0, z1 - 0.3, c, wallH - 0.4, z1 + 0.1, toon('#8a86a8'));
  box(b, x0 - 0.03, wallH - 0.45, z1 - 0.1, x1 + 0.03, wallH - 0.35, z1 + 0.2, YELLOW);
  // A sign over the doorway
  const sign = canvasTex(512, 96, (c) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, 512, 96);
    c.font = `900 70px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = PAL.cyan;
    c.fillText('HANGAR 1', 256, 52);
  });
  box(b, (x0 + x1) / 2 - 3.1, wallH + 0.25, z1 + 0.02, (x0 + x1) / 2 + 3.1, wallH + 1.35, z1 + 0.14, INK);
  const s = plane(6, 1.05, lit(new THREE.MeshBasicMaterial({ map: sign }), 0.95, 1.15));
  s.position.set((x0 + x1) / 2, wallH + 0.8, z1 + 0.15);
  group.add(fx(s));
  // The office on the east side: its door opens the hangar menu
  const [ox0, oz0, ox1, oz1, oh] = HANGAR_OFFICE;
  box(b, ox0, 0, oz0, ox1, oh, oz1, toon('#3d4a6b'));
  box(b, HANGAR_DOOR.x - 0.4, 0, oz1 - 0.05, HANGAR_DOOR.x + 0.4, 1.4, oz1 + 0.05, toon('#14102a'));
  box(b, ox1 - 1.1, 0.6, oz1 - 0.05, ox1 - 0.3, 1.3, oz1 + 0.06, soft('#ffd36b'));
  // A little lit sign over the door
  box(b, HANGAR_DOOR.x - 0.55, 1.55, oz1, HANGAR_DOOR.x + 0.55, 1.85, oz1 + 0.08, soft(PAL.cyan));
}

/** A surface turned to face the other way (its inside): winding reversed, normals flipped */
function inward(g: THREE.BufferGeometry) {
  const n = (g.index ? g.toNonIndexed() : g.clone()) as THREE.BufferGeometry;
  const p = n.attributes.position;
  const nm = n.attributes.normal;
  for (let i = 0; i < p.count; i += 3) {
    for (const a of [p, nm]) {
      const [x, y, z] = [a.getX(i + 1), a.getY(i + 1), a.getZ(i + 1)];
      a.setXYZ(i + 1, a.getX(i + 2), a.getY(i + 2), a.getZ(i + 2));
      a.setXYZ(i + 2, x, y, z);
    }
  }
  for (let i = 0; i < nm.count; i++) nm.setXYZ(i, -nm.getX(i), -nm.getY(i), -nm.getZ(i));
  return n;
}

function helipad(b: Batch) {
  const { x, z, r } = HELIPAD;
  b.add(new THREE.CylinderGeometry(r, r, 0.04, 32).translate(x, TOP + 0.01, z), toon('#3a3658'));
  b.add(new THREE.RingGeometry(r - 0.45, r - 0.25, 32).rotateX(-Math.PI / 2).translate(x, TOP + 0.035, z), WHITE);
  for (const s of [-1, 1]) mark(b, x + s * 0.9 - 0.18, z - 1.3, x + s * 0.9 + 0.18, z + 1.3, YELLOW, TOP + 0.036);
  mark(b, x - 0.9, z - 0.18, x + 0.9, z + 0.18, YELLOW, TOP + 0.036);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    box(
      b,
      x + Math.cos(a) * (r + 0.2) - 0.08,
      0,
      z + Math.sin(a) * (r + 0.2) - 0.08,
      x + Math.cos(a) * (r + 0.2) + 0.08,
      0.16,
      z + Math.sin(a) * (r + 0.2) + 0.08,
      light('#2bff88')
    );
  }
}

/* ---------- Things on the apron ---------- */

function apronKit(b: Batch) {
  for (const k of APRON_KIT) {
    const [x, z] = k.at;
    const g: [number, number, number, number, number, number, THREE.Material][] = [];
    if (k.kind === 'fuel') {
      g.push([0.9, 0.35, -0.5, 1.6, 1.5, 0.5, toon('#e23b3b')], [-1.6, 0.35, -0.55, 0.9, 1.35, 0.55, toon('#e9e6f5')]);
      b.add(
        new THREE.CylinderGeometry(0.55, 0.55, 2.4, 14)
          .rotateZ(Math.PI / 2)
          .translate(-0.3, 1.0, 0)
          .rotateY(k.yaw)
          .translate(x, 0, z),
        toon('#e9e6f5')
      );
    } else if (k.kind === 'tug') {
      g.push([1.4, 0.2, -0.45, 2.3, 0.8, 0.45, toon('#ffd23f')], [1.6, 0.8, -0.4, 2.1, 1.3, 0.4, INK]);
      for (const c of [0, 1, 2]) g.push([-0.9 + -c * 1.25, 0.25, -0.45, 0.2 - c * 1.25, 0.95, 0.45, toon(['#8a86a8', '#2aabee', '#8a86a8'][c])]);
    } else {
      g.push([0.3, 0.2, -0.5, 1.3, 0.9, 0.5, toon('#ffffff')], [0.5, 0.9, -0.45, 1.2, 1.45, 0.45, INK]);
      b.add(new THREE.BoxGeometry(2.0, 0.12, 0.9).rotateZ(-0.62).translate(-0.4, 1.3, 0).rotateY(k.yaw).translate(x, 0, z), toon('#c9c4e6'));
      for (const s of [-1, 1])
        b.add(
          new THREE.BoxGeometry(2.1, 0.08, 0.05)
            .rotateZ(-0.62)
            .translate(-0.4, 1.75, s * 0.45)
            .rotateY(k.yaw)
            .translate(x, 0, z),
          INK
        );
    }
    for (const [a0, y0, c0, a1, y1, c1, m] of g)
      b.add(
        new THREE.BoxGeometry(a1 - a0, y1 - y0, c1 - c0)
          .translate((a0 + a1) / 2, (y0 + y1) / 2, (c0 + c1) / 2)
          .rotateY(k.yaw)
          .translate(x, 0, z),
        m
      );
    // Wheels
    for (const wx of [-1.2, 0.2, 1.4])
      for (const s of [-1, 1])
        b.add(
          new THREE.CylinderGeometry(0.22, 0.22, 0.14, 10)
            .rotateX(Math.PI / 2)
            .translate(wx, 0.22, s * 0.5)
            .rotateY(k.yaw)
            .translate(x, 0, z),
          toon('#17151f')
        );
  }
  // Floodlight masts: a tall pole, a head of lamps aimed at the apron, light pooled below
  for (const [x, z] of MASTS) {
    cyl(b, 0.16, 8, x, 0, z, STEEL, 8, 0.22);
    box(b, x - 1.0, 8, z - 0.25, x + 1.0, 8.5, z + 0.25, INK);
    for (const dx of [-0.6, 0, 0.6]) box(b, x + dx - 0.2, 7.95, z - 0.18, x + dx + 0.2, 8.05, z + 0.18, light('#fff6c8'));
    for (const dz of [4, 11]) addPool(x, z + dz, 13, 0);
  }
}

function windsock(group: THREE.Group, tick: (f: Tick) => void, reduced: boolean) {
  const [x, z] = WINDSOCK;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3, 8).translate(0, 1.5, 0), STEEL);
  const sock = new THREE.Group();
  sock.position.y = 2.9;
  for (let k = 0; k < 4; k++) {
    const r0 = 0.32 - k * 0.06;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(r0 - 0.06, r0, 0.5, 12, 1, true).rotateZ(Math.PI / 2).translate(0.25 + k * 0.5, -k * 0.06, 0),
      toon(k % 2 ? '#f3f2f7' : '#ff8a3d', { side: THREE.DoubleSide })
    );
    sock.add(seg);
  }
  g.add(pole, sock);
  group.add(g);
  tick(({ t }) => {
    if (reduced) return;
    sock.rotation.y = 0.6 + Math.sin(t * 0.3) * 0.25;
    sock.rotation.z = -0.15 + Math.sin(t * 1.3) * 0.05;
  });
}

/* ---------- Roadside: parked cars, lamps, trees ---------- */

function roadside(group: THREE.Group) {
  parkedCars(
    group,
    0.035,
    PARKED.map(([m, x, z, ry, c]) => [m as CarId, x, z, ry, c])
  );
  const AV = NS_ROADS.at(-1)!;
  for (let x = AV.c + AV.half + 3; x < ROAD.x1; x += 9) {
    addLamp(x, ROAD.z - ROAD.half - 0.5, -Math.PI / 2, 0);
    if (x < ROAD.loopX - 2) addLamp(x + 4.5, ROAD.z + ROAD.half + 0.5, Math.PI / 2, 0);
  }
  for (let z = ROAD.loopZ + 4; z < ROAD.z - 2; z += 8) addLamp(ROAD.x1 + ROAD.half + 0.5, z, Math.PI, 0);
  // Trees along the car park's north side and round the terminal's ends
  for (let x = ROAD.loopX + 2; x < ROAD.x1; x += 6.5) addTree(x, ROAD.loopZ - ROAD.half - 1.4, 0.95, false, 0);
  for (const [x, z] of [
    [TERMINAL[0] - 3, TERMINAL[1] + 2],
    [TERMINAL[0] - 3, TERMINAL[3] - 2],
    [AV.c + AV.half + 3, ROAD.z + 6],
    [AV.c + AV.half + 3, ROAD.z - 6],
  ])
    addTree(x, z, 1, false, 0);
}

/* ---------- The flying traffic ---------- */

const LIVERY: Record<AircraftKind, string[]> = {
  jet: ['#e219e5', '#00c2ff', '#8000ff'],
  prop: ['#ff3b8a'],
  heli: ['#00b0ff'],
};

/** Every aircraft on its timetable (the clock is the same for everyone); parked under reduced motion */
function flying(scene: THREE.Scene, tick: (f: Tick) => void, reduced: boolean) {
  const kinds: AircraftKind[] = ['jet', 'prop', 'heli'];
  const fleets = kinds.map((k) => {
    const f = createFleet(k, LIVERY[k]);
    scene.add(f.group);
    return { kind: k, fleet: f, flights: FLIGHTS.filter((x) => x.kind === k) };
  });
  const now = () => Date.now() / 1000;
  const current: { kind: AircraftKind; pose: Pose }[] = [];
  const place = (t: number, dt: number) => {
    current.length = 0;
    for (const { kind, fleet, flights } of fleets) {
      flights.forEach((f, i) => {
        const pose = reduced ? f.parked : poseAt(f, t);
        fleet.set(i, pose);
        current.push({ kind, pose });
      });
      fleet.update(t, dt);
    }
  };
  place(now(), 0);
  tick(({ dt }) => {
    if (!reduced) place(now(), dt);
  });
  return () => current;
}
