/*
 * Sector 7 Airport (docs/airport-plan.md; since Phase 3 past the ring
 * highway's south-east bend): what's built at the boot, in world numbers.
 * The terminal's hall is the airport's place (its pin, its hover, its
 * panel); Hangar 1 (your aircraft's, the hangar menu's office) and the
 * control tower stand with it, the windsock turns, and the aircraft fly
 * their timetable (airfield.ts), the parked ones at their stands. The rest
 * (the runway and taxiways and their lights, the concourses, the hangars,
 * the fence, the roads) is airportgrounds3d.ts, loaded as you approach.
 */
import * as THREE from 'three';
import { Batch, canvasTex, FONT_DISPLAY, fx, glowMat, lit, moving, neon, PAL, plane, rng, toon } from './kit';
import { INK, PALE, ROOF, STEEL, TOP, YELLOW, box, cyl, glazing, soft } from './airportkit';
import {
  AIRPORT_LAMPS,
  BUS_BAY,
  DECK_LAMPS,
  DEPARTURES,
  FLIGHTS,
  MSCP_CARS,
  RANK,
  HALL,
  HANGAR,
  HANGAR_DOOR,
  HANGAR_OFFICE,
  HOTEL,
  MAST_POOLS,
  CARGO_TREES,
  RABBIT,
  VDGS,
  APPROACH,
  PARKED,
  PARKED_JETS,
  PARKED_FREIGHTERS,
  CARGO_PEOPLE,
  CARGO_ROAD,
  ROAD,
  RUNWAY,
  TOWER,
  WINDSOCK,
  poseAt,
  type AircraftKind,
  type Pose,
} from './airfield';
import { createFleet } from './aircraft';
import { parkedCars, type CarId } from './cars';
import type { Idle, Spot } from './landmarks';
import { addLamp, addPool, addTree, type Tick } from './world';

/** The airport's place in the city: the terminal's hall is its building (its pin, its hover, its panel) */
export interface Airport {
  spot: Spot;
  /** Where the airport's own aircraft are now (your aircraft bumps softly off them) */
  traffic(): { kind: AircraftKind; pose: Pose }[];
}

export function buildAirport(scene: THREE.Scene, crowd: Idle[], tick: (f: Tick) => void, opts: { reduced: boolean; low: boolean }): Airport {
  const group = new THREE.Group();
  group.name = 'airport';
  scene.add(group);
  // The hall: the airport's place (lifted on hover in City view)
  const places = new THREE.Group();
  places.name = 'airport-terminal';
  group.add(places);
  const b = new Batch();
  const hb = new Batch();
  hall(hb, places, crowd, opts.low);
  hb.build(places);
  hangar(b, group);
  tower(b, group, tick);
  b.build(group);
  windsock(group, tick, opts.reduced);
  roadside(group);
  // (the floodlights' pools of light go with the lamps', at the boot)
  for (const [x, z, size] of MAST_POOLS) addPool(x, z, size, 0);
  const traffic = flying(scene, tick, opts.reduced);
  const gb = new Batch();
  guidance(gb, group, tick, traffic);
  gb.build(group);
  rabbit(group, tick, opts.reduced);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.64, 48), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(HANGAR_DOOR.x, 0.05, HANGAR_DOOR.z);
  group.add(fx(ring));
  const spot: Spot = {
    id: 'airport',
    group: places,
    focus: new THREE.Vector3((HALL[0] + HALL[2]) / 2, 0, (HALL[3] + RUNWAY.z) / 2 - 8),
    size: 170,
    pin: new THREE.Vector3((HALL[0] + HALL[2]) / 2, HALL[4] + 4.2, HALL[1] + 2),
    ring,
  };
  return { spot, traffic };
}

/* ---------- The terminal's hall ---------- */

/**
 * The hall: two storeys of glass between pale stone ends and piers, the departures hall's wave roof sweeping out
 * over the kerb as a canopy (lit along its edge), the doors under it, SECTOR 7 AIRPORT over them; on the airside its
 * three gates' glass and the concourses' roofs meeting it (airportgrounds3d.ts)
 */
function hall(b: Batch, group: THREE.Group, crowd: Idle[], low: boolean) {
  const [x0, z0, x1, z1, H] = HALL;
  // The body: a dark core, the stone ends and piers, the floor band between the storeys; glass all round, tucked just
  // inside the ends' outer faces (flush, they'd flicker)
  box(b, x0 + 0.05, 0, z0 + 0.25, x1 - 0.05, H - 0.4, z1 - 0.25, toon('#2b2848'));
  for (const x of [x0, x1 - 1.6]) box(b, x, 0, z0, x + 1.6, H - 0.3, z1, PALE);
  for (let x = x0 + 12; x < x1 - 6; x += 12) {
    box(b, x - 0.3, 0, z0 - 0.06, x + 0.3, H - 0.3, z0 + 0.4, PALE);
    box(b, x - 0.3, 0, z1 - 0.4, x + 0.3, H - 0.3, z1 + 0.06, PALE);
  }
  for (const zz of [z0, z1]) box(b, x0 + 1.6, H / 2 - 0.25, zz - 0.05, x1 - 1.6, H / 2 + 0.15, zz + 0.05, PALE);
  glazing(b, x0 + 1.6, z0 + 0.15, x1 - 1.6, z0 + 0.15, 0.05, H - 0.45, 1);
  glazing(b, x0 + 1.6, z1 - 0.15, x1 - 1.6, z1 - 0.15, 0.05, H - 0.45, -1);
  // Doors on the landside: arrivals down at the street under the departures deck, departures up on it
  for (const y of [0, DEPARTURES.y])
    for (let x = x0 + 8; x < x1 - 6; x += 12) {
      box(b, x - 1.3, y, z0 - 0.1, x + 1.3, y + 2, z0 + 0.05, toon('#14102a'));
      box(b, x - 1.2, y, z0 - 0.12, x + 1.2, y + 1.9, z0 - 0.08, soft('#ffd36b'));
      box(b, x - 0.04, y, z0 - 0.14, x + 0.04, y + 1.9, z0 - 0.1, INK);
    }
  // The wave roof: a long arch over the hall, overhanging the kerb as a canopy
  const roof = new THREE.Shape();
  const profile: [number, number][] = [];
  for (let k = 0; k <= 28; k++) {
    const f = k / 28;
    const zz = z0 - 4.2 + f * (z1 - z0 + 5.4);
    profile.push([zz, H - 0.1 + Math.sin(f * Math.PI) * 2.2 + f * 0.4]);
  }
  roof.moveTo(profile[0][0], profile[0][1]);
  for (const [zz, y] of profile) roof.lineTo(zz, y);
  for (const [zz, y] of [...profile].reverse()) roof.lineTo(zz, y + 0.36);
  // The shape is drawn in (z, y); turned so its depth runs along x
  const rg = new THREE.ExtrudeGeometry(roof, { depth: x1 - x0 + 2, bevelEnabled: false });
  rg.rotateY(-Math.PI / 2).translate(x1 + 1, 0, 0);
  b.add(rg, ROOF);
  // A neon trim under the canopy's edge, and its columns
  box(b, x0 - 1, H - 0.18, z0 - 4.25, x1 + 1, H - 0.12, z0 - 4.15, soft(PAL.cyan));
  for (let x = x0 + 4; x < x1; x += 10) cyl(b, 0.16, H - 0.1, x, 0, z0 - 3.6, PALE, 10);
  // Rooftop plant over the airside half
  for (const x of [x0 + 10, x0 + 34, x1 - 14]) box(b, x, H + 1.6, z1 - 12, x + 3, H + 2.3, z1 - 9.5, STEEL);

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
  const sx = (x0 + x1) / 2;
  box(b, sx - 13.2, H + 0.3, z0 - 3.5, sx + 13.2, H + 2.8, z0 - 3.25, INK);
  for (const x of [sx - 10, sx + 10]) box(b, x - 0.1, H, z0 - 3.45, x + 0.1, H + 0.35, z0 - 3.3, INK);
  const board = plane(26, 2.3, lit(new THREE.MeshBasicMaterial({ map: sign }), 0.95, 1.15));
  board.position.set(sx, H + 1.55, z0 - 3.52);
  board.rotation.y = Math.PI;
  group.add(fx(board));

  // People at the doors: up on the departures kerb, saying goodbye; down at arrivals, waiting and queueing for a taxi
  const r = rng(31);
  const n = low ? 6 : 14;
  for (let i = 0; i < n; i++) {
    const x = x0 + 4 + r() * (x1 - x0 - 8);
    const z = z0 - 1.2 - r() * 1.6;
    const up = i % 2 === 0;
    crowd.push({ x, z, ry: r() < 0.5 ? Math.PI : (r() - 0.5) * 2, y: up ? DEPARTURES.y + 0.02 : TOP + 0.02, act: i % 3 === 0 ? 'chat' : i % 3 === 1 ? 'queue' : 'look' });
  }
  for (let i = 0; i < (low ? 2 : 5); i++) crowd.push({ x: RANK[RANK.length - 1][1] + 2.4 + i * 0.9, z: RANK[0][2] + 1.9, ry: -Math.PI / 2, y: TOP + 0.02, act: 'queue' });
  // At work in the cargo area: at the docks, by the loader and the dollies (step 3)
  CARGO_PEOPLE.forEach(([x, z, ry], i) => {
    if (!low || i % 2 === 0) crowd.push({ x, z, ry, y: TOP + 0.02, act: i % 2 ? 'chat' : 'look' });
  });
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
  // ...the taxi rank and the airport bus under the departures deck, the multi-storey's decks
  parkedCars(group, 0.035, [...RANK, ['bus', BUS_BAY.x, BUS_BAY.z, 0, '#2aabee']].map(([m, x, z, ry, c]) => [m as CarId, x as number, z as number, ry as number, c as string]));
  for (const { y, cars } of MSCP_CARS) parkedCars(group, y + 0.035, cars.map(([m, x, z, ry, c]) => [m as CarId, x, z, ry, c]));
  for (const [x, z, ry] of AIRPORT_LAMPS) addLamp(x, z, ry, 0);
  for (const [x, z, ry] of DECK_LAMPS) addLamp(x, z, ry, DEPARTURES.y);
  for (const [x, z] of CARGO_TREES) addTree(x, z, 0.9, false, 0);
  // An avenue of trees down the drive, behind its lamps
  for (let z = ROAD.z0 + 17; z < ROAD.z1 - 14; z += 14) for (const s of [-1, 1]) if ((s < 0 || z < HOTEL.rect[1] - 3 || z > HOTEL.rect[3] + 3) && Math.abs(z - CARGO_ROAD.z) > 8) addTree(ROAD.x + s * (ROAD.half + 3.2), z, 0.95, false, 0);
}

/* ---------- Night lighting: the stand guidance boards and the approach's rabbit ---------- */

/** The boards' screen: a lead-in line and chevrons pointing in, white on black (tinted per board by what's on its stand) */
const VDGS_TEX = canvasTex(128, 160, (c) => {
  c.fillStyle = '#05040c';
  c.fillRect(0, 0, 128, 160);
  c.fillStyle = '#ffffff';
  c.fillRect(60, 14, 8, 132);
  for (let k = 0; k < 3; k++) {
    const y = 34 + k * 38;
    c.beginPath();
    c.moveTo(18, y);
    c.lineTo(64, y + 26);
    c.lineTo(110, y);
    c.lineTo(110, y + 12);
    c.lineTo(64, y + 38);
    c.lineTo(18, y + 12);
    c.closePath();
    c.fill();
  }
});
/** What a board shows: nothing on its stand (dim), a jet rolling in (amber), parked (green) */
const VDGS_DIM = new THREE.Color(0.1, 0.1, 0.14);
const VDGS_IN = new THREE.Color(1, 0.62, 0.08);
const VDGS_OK = new THREE.Color(0.12, 1, 0.42);
/** How near a jet has to be to its stand for the board to see it, and to count as parked */
const VDGS_SEE = 32;
const VDGS_AT = 1.2;

/**
 * The stand guidance boards (VDGS): a dark box on a bracket off the building's face in line with each stand, its
 * screen one instanced plane tinted per board: amber while a jet closes on the stand, green once it's stopped there
 */
function guidance(b: Batch, group: THREE.Group, tick: (f: Tick) => void, traffic: () => { kind: AircraftKind; pose: Pose }[]) {
  const W = 1.1;
  const H = 1.4;
  for (const { x, z, y } of VDGS) {
    box(b, x - 0.1, y + H / 2 - 0.1, z + 0.08, x + 0.1, y + H / 2 + 0.1, z + 0.3, STEEL);
    box(b, x - W / 2 - 0.08, y - H / 2 - 0.08, z + 0.3, x + W / 2 + 0.08, y + H / 2 + 0.08, z + 0.5, INK);
  }
  const screens = new THREE.InstancedMesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: VDGS_TEX, toneMapped: true }), VDGS.length);
  screens.name = 'vdgs';
  const m = new THREE.Matrix4();
  VDGS.forEach(({ x, z, y }, i) => {
    screens.setMatrixAt(i, m.makeTranslation(x, y, z + 0.506));
    screens.setColorAt(i, VDGS_DIM);
  });
  screens.userData.keep = true;
  group.add(screens);
  const last = VDGS.map(() => Infinity);
  const shown = VDGS.map(() => VDGS_DIM);
  tick(() => {
    const now = traffic();
    let changed = false;
    VDGS.forEach(({ stand: [sx, sz] }, i) => {
      let d = Infinity;
      let still = false;
      for (const { kind, pose } of now) {
        if (kind !== 'jet' || !pose.ground) continue;
        const e = Math.hypot(pose.x - sx, pose.z - sz);
        if (e < d) {
          d = e;
          still = pose.v < 0.05;
        }
      }
      const c = d < VDGS_AT && still ? VDGS_OK : d < VDGS_SEE && d < last[i] - 1e-4 ? VDGS_IN : d < VDGS_AT ? shown[i] : VDGS_DIM;
      last[i] = d;
      if (c !== shown[i]) {
        shown[i] = c;
        screens.setColorAt(i, c);
        changed = true;
      }
    });
    if (changed && screens.instanceColor) screens.instanceColor.needsUpdate = true;
  });
}

/** The approach lights' rabbit: a strobe running in along the crossbars towards the threshold, at night only */
function rabbit(group: THREE.Group, tick: (f: Tick) => void, reduced: boolean) {
  const bars: number[] = [];
  for (let x = RABBIT.x0; x <= RABBIT.x1; x += RABBIT.every) bars.push(x);
  const flash = moving(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.6), neon('#eef6ff', 0, 2.6)));
  flash.name = 'approach-rabbit';
  flash.visible = false;
  group.add(flash);
  tick(({ t, night }) => {
    const on = !reduced && night > 0.25;
    flash.visible = on;
    if (!on) return;
    const k = Math.min(bars.length - 1, Math.floor(((t % RABBIT.period) / RABBIT.period) * bars.length));
    const x = bars[k];
    flash.position.set(x, 0.35 + (APPROACH.x1 - x) * 0.04 + 0.26, APPROACH.z);
  });
}

/* ---------- The flying traffic ---------- */

const LIVERY: Record<AircraftKind | 'freighter', string[]> = {
  // (the four flying airliners, then the parked ones: airfield.ts PARKED_JETS)
  jet: ['#e219e5', '#00c2ff', '#ff3b8a', '#00b8a9', '#8000ff', '#00c2ff', '#e219e5', '#8000ff', '#ffb000'],
  // (the freighter on the timetable, then the one parked at the cargo apron: DEGEN CARGO's orange)
  freighter: ['#ff8a3d', '#ff8a3d'],
  prop: ['#ff3b8a'],
  // (the helicopter round the Emporium, and the executive one to Uptown's helipad in gold)
  heli: ['#00b0ff', '#c9a227'],
};

/** Every aircraft on its timetable (the clock is the same for everyone), parked under reduced motion; the parked airliners at their stands */
function flying(scene: THREE.Scene, tick: (f: Tick) => void, reduced: boolean) {
  const kinds: (AircraftKind | 'freighter')[] = ['jet', 'freighter', 'prop', 'heli'];
  const fleets = kinds.map((k) => {
    const f = createFleet(k, LIVERY[k]);
    scene.add(f.group);
    // (the freighters are airliners on the timetable, drawn as a fleet of their own)
    const kind: AircraftKind = k === 'freighter' ? 'jet' : k;
    const flights = FLIGHTS.filter((x) => x.kind === kind && !!x.freight === (k === 'freighter'));
    return { kind, fleet: f, flights, parked: k === 'jet' ? PARKED_JETS : k === 'freighter' ? PARKED_FREIGHTERS : [] };
  });
  const now = () => Date.now() / 1000;
  const current: { kind: AircraftKind; pose: Pose }[] = [];
  const place = (t: number, dt: number) => {
    current.length = 0;
    for (const { kind, fleet, flights, parked } of fleets) {
      flights.forEach((f, i) => {
        const pose = reduced ? f.parked : poseAt(f, t);
        fleet.set(i, pose);
        current.push({ kind, pose });
      });
      parked.forEach((pose, i) => {
        fleet.set(flights.length + i, pose);
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
