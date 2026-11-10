/*
 * The civic quarter's flanking buildings on screen (docs/civic-plan.md Phase 3; the numbers are civic.ts): two
 * sites in Westlake Park's chunk (registered by civic3d.ts), in City Hall's pale stone, plainer and lower (the
 * owner's pick), and the patrol cars in the police yard on the main thread.
 *
 * - **Sector 7 Police:** a three-storey block over a darker base, tall windows in rows lit at night, a string
 *   course and a cornice; its entrance on the east face (a bronze door, a canopy, SECTOR 7 POLICE in carved
 *   letters over it and the blue lamp); a radio mast on the roof with a red light; the yard behind it walled in
 *   stone with a coping, its asphalt marked out in bays, the gate's posts with lamps either side of its gap.
 * - **The Sector 7 Courthouse:** four steps up from the square between cheeks with torchères, a portico of four
 *   square columns between antae, SECTOR 7 COURTHOUSE on its frieze, a low pediment with the emblem's gold star,
 *   the body behind with tall windows, a bronze door on the portico.
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { site } from './tilework';
import { parkedCars, type CarId } from './cars';
import { ROAD } from './palette';
import { BRONZE, BULB, DARK, GOLD, SHADE, STONE, WIN, carvedMat, pane, starGeometry, windows } from './cityhall3d';
import {
  COURT,
  COURT_BODY,
  COURT_COLUMN,
  COURT_COLUMNS,
  COURT_GROUND,
  COURT_H,
  COURT_PODIUM,
  COURT_PORTICO,
  COURT_STEPS,
  COURT_STEP_N,
  HALL_GROUND as G,
  HQ,
  PEDIMENT_H,
  POLICE_HQ,
  POLICE_YARD,
  YARD_CARS,
  YARD_GATE,
  YARD_WALL,
  type Pt,
} from './civic';

const ASPHALT = toon(ROAD.asphalt);
const LINE = toon(ROAD.line);
/** The blue lamp over the police's door, and the mast's red light: small, so bright at night */
const BLUE = neon('#4f8dff', 0.6, 2.4);
const RED = neon('#ff3b3b', 0.4, 2.4);
const POLICE_SIGN = carvedMat('civic-police', 'SECTOR 7 POLICE', '#1d2747');
const COURT_FRIEZE = carvedMat('civic-court', 'SECTOR 7 COURTHOUSE');

/** A flat quad over a rect at y, facing up */
function flat([x0, z0, x1, z1]: [number, number, number, number], y: number) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2);
  g.deleteAttribute('uv');
  return g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
}

/** A lamp on a post (a bronze post, a cap, a bulb), its foot at (x, y, z) */
function torch(b: Batch, x: number, y: number, z: number, h = 2) {
  b.detail(() => {
    b.box(x - 0.07, y, z - 0.07, 0.14, h, 0.14, BRONZE);
    b.box(x - 0.2, y + h, z - 0.2, 0.4, 0.08, 0.4, BRONZE);
  });
  b.add(new THREE.SphereGeometry(0.22, 10, 6).translate(x, y + h + 0.3, z), BULB);
}

/** Sector 7 Police: the building, its entrance, its mast; the yard's ground, walls and gate */
function police(b: Batch) {
  const [x0, z0, x1, z1] = POLICE_HQ;
  b.box(x0, G, z0, x1 - x0, HQ.h - G, z1 - z0, STONE);
  b.box(x0 - 0.06, G, z0 - 0.06, x1 - x0 + 0.12, 0.9, z1 - z0 + 0.12, DARK);
  // A string course over the ground floor, the cornice over the top
  b.box(x0 - 0.1, G + 3.2, z0 - 0.1, x1 - x0 + 0.2, 0.18, z1 - z0 + 0.2, SHADE);
  b.box(x0 - 0.3, HQ.h, z0 - 0.3, x1 - x0 + 0.6, 0.25, z1 - z0 + 0.6, SHADE);
  const rows: [number, number][] = [
    [G + 1.3, G + 2.9],
    [G + 3.9, G + 5.4],
    [G + 6.1, G + 7.6],
  ];
  // Windows on the north, west and south faces; on the east (the front) either side of the entrance
  windows(b, 'z', z0, -1, x0 + 0.4, x1 - 0.4, 2.2, rows);
  windows(b, 'x', x0, -1, z0 + 0.4, z1 - 0.4, 2.2, rows);
  windows(b, 'z', z1, 1, x0 + 0.4, x1 - 0.4, 2.2, rows.slice(1));
  const d = HQ.door;
  windows(b, 'x', x1, 1, z0 + 0.4, d.z - 2, 2.2, rows);
  windows(b, 'x', x1, 1, d.z + 2, z1 - 0.4, 2.2, rows);
  // (over the entrance only the top row: the canopy, the name and the lamp below it)
  windows(b, 'x', x1, 1, d.z - 2, d.z + 2, 2.2, rows.slice(2));
  // The entrance: a stone surround, the bronze door, a canopy, the carved name over it, the blue lamp
  b.box(x1, G, d.z - d.w / 2 - 0.35, 0.08, d.h + 0.4, d.w + 0.7, SHADE);
  b.box(x1 + 0.04, G, d.z - d.w / 2, 0.08, d.h, d.w, BRONZE);
  b.box(x1, G + d.h + 0.55, d.z - 1.6, 0.9, 0.16, 3.2, SHADE);
  // (as wide as the entrance bay: read from across the square)
  b.add(pane(x1 + 0.03, G + d.h + 1.25, d.z, 4, (4 * 52) / 1024, 'x', 1, true), POLICE_SIGN);
  b.detail(() => b.box(x1 + 0.9, G + d.h + 0.71, d.z + 1.36, 0.08, 0.3, 0.08, BRONZE));
  b.add(new THREE.BoxGeometry(0.26, 0.3, 0.26).translate(x1 + 0.94, G + d.h + 1.16, d.z + 1.4), BLUE);
  // The radio mast on the roof
  const [mx, mz] = [x0 + 2, z0 + 2];
  b.box(mx - 0.06, HQ.h + 0.25, mz - 0.06, 0.12, HQ.mast - 0.3, 0.12, SHADE);
  b.detail(() => {
    for (const y of [HQ.h + 1.2, HQ.h + 2]) b.box(mx - 0.5, y, mz - 0.03, 1, 0.06, 0.06, SHADE);
  });
  b.add(new THREE.SphereGeometry(0.1, 8, 6).translate(mx, HQ.h + HQ.mast, mz), RED);

  // The yard: asphalt with its bays marked, the stone wall with a coping, the gate's posts and lamps
  const [yx0, yz0, yx1, yz1] = POLICE_YARD;
  const w = YARD_WALL.w;
  b.add(flat([yx0 + w, yz0, yx1 - w, yz1 - w], G + 0.012), ASPHALT);
  b.detail(() => {
    for (let k = 0; k <= YARD_CARS.length; k++) {
      const x = YARD_CARS[0][1] - 1 + 2 * k;
      b.add(flat([x - 0.05, yz0 + 0.2, x + 0.05, yz0 + 3.6], G + 0.018), LINE);
    }
  });
  for (const r of [
    [yx0, yz0, yx0 + w, yz1],
    [yx1 - w, yz0, yx1, yz1],
    [yx0 + w, yz1 - w, YARD_GATE.x0, yz1],
    [YARD_GATE.x1, yz1 - w, yx1 - w, yz1],
  ] as [number, number, number, number][]) {
    b.box(r[0], G, r[1], r[2] - r[0], YARD_WALL.h - 0.1, r[3] - r[1], STONE);
    b.box(r[0] - 0.05, G + YARD_WALL.h - 0.1, r[1] - 0.05, r[2] - r[0] + 0.1, 0.12, r[3] - r[1] + 0.1, SHADE);
  }
  for (const gx of [YARD_GATE.x0, YARD_GATE.x1]) {
    const px = gx < (YARD_GATE.x0 + YARD_GATE.x1) / 2 ? gx - 0.45 : gx;
    // (a little proud of the wall's face: nothing flush)
    b.box(px, G, yz1 - 0.5, 0.45, YARD_WALL.h + 0.5, 0.55, SHADE);
    torch(b, px + 0.225, G + YARD_WALL.h + 0.5, yz1 - 0.225, 0.3);
  }
}

/** The Sector 7 Courthouse: steps, podium, cheeks, columns, antae, entablature, pediment, body */
function courthouse(b: Batch) {
  const [s0, sz0, s1, sz1] = COURT_STEPS;
  const [p0, pz0, p1, pz1] = COURT_PORTICO;
  const rise = (COURT_PODIUM - COURT_GROUND) / COURT_STEP_N;
  const tread = (s1 - s0) / COURT_STEP_N;
  for (let k = 0; k < COURT_STEP_N; k++) b.box(s0 + k * tread, G, sz0, tread, (k + 1) * rise, sz1 - sz0, k % 2 ? SHADE : STONE);
  b.box(p0, G, pz0, p1 - p0, COURT_PODIUM - G, pz1 - pz0, DARK);
  // The cheeks either side of the steps, each with a torchère
  for (const [c0, c1] of [
    [pz0, sz0],
    [sz1, pz1],
  ]) {
    b.box(s0, G, c0, s1 - s0, COURT_PODIUM + 0.3 - G, c1 - c0, DARK);
    b.box(s0 - 0.06, COURT_PODIUM + 0.3, c0 - 0.06, s1 - s0 + 0.12, 0.1, c1 - c0 + 0.12, SHADE);
    torch(b, s0 + 0.6, COURT_PODIUM + 0.4, (c0 + c1) / 2, 1.6);
  }
  // The columns: base, shaft, capital
  const cw = COURT_COLUMN.w;
  const top = COURT_PODIUM + COURT_COLUMN.h;
  for (const [cx, cz] of COURT_COLUMNS as Pt[]) {
    b.box(cx - cw / 2 - 0.1, COURT_PODIUM, cz - cw / 2 - 0.1, cw + 0.2, 0.25, cw + 0.2, SHADE);
    b.box(cx - cw / 2, COURT_PODIUM + 0.25, cz - cw / 2, cw, COURT_COLUMN.h - 0.55, cw, STONE);
    b.box(cx - cw / 2 - 0.12, top - 0.3, cz - cw / 2 - 0.12, cw + 0.24, 0.3, cw + 0.24, SHADE);
  }
  // The antae closing the portico's ends
  b.box(p0, COURT_PODIUM, pz0, p1 - p0, COURT_COLUMN.h, 0.4, STONE);
  b.box(p0, COURT_PODIUM, pz1 - 0.4, p1 - p0, COURT_COLUMN.h, 0.4, STONE);
  // The entablature with the name, a cornice, the pediment with the gold star in it
  b.box(p0 + 0.05, top, pz0, p1 - p0 - 0.05, 1, pz1 - pz0, STONE);
  b.add(pane(p0 + 0.05 - 0.02, top + 0.5, (pz0 + pz1) / 2, 9.4, (9.4 * 52) / 1024, 'x', -1, true), COURT_FRIEZE);
  const ey = top + 1;
  b.box(p0 - 0.05, ey, pz0 - 0.2, p1 - p0 + 0.3, 0.18, pz1 - pz0 + 0.4, SHADE);
  {
    const half = (pz1 - pz0) / 2 + 0.2;
    const s = new THREE.Shape([new THREE.Vector2(-half, 0), new THREE.Vector2(half, 0), new THREE.Vector2(0, PEDIMENT_H)]);
    const depth = p1 - p0 + 0.25;
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    g.deleteAttribute('uv');
    // (its shape in z and y, run back along x: rotated a quarter turn, then set over the portico)
    g.rotateY(-Math.PI / 2).translate(p1 + 0.25 - 0.05, ey + 0.18, (pz0 + pz1) / 2);
    b.add(g, STONE);
    b.add(starGeometry(0.45, 0.06).rotateY(-Math.PI / 2).translate(p0 - 0.06, ey + 0.18 + 0.55, (pz0 + pz1) / 2), GOLD);
  }
  // The body behind, its base course and cornice, windows in its sides and back, the door on the portico
  const [b0, bz0, b1, bz1] = COURT_BODY;
  b.box(b0, G, bz0, b1 - b0, COURT_H - G, bz1 - bz0, STONE);
  b.box(b0 - 0.06, G, bz0 - 0.06, b1 - b0 + 0.12, 0.9, bz1 - bz0 + 0.12, DARK);
  b.box(b0 - 0.3, COURT_H, bz0 - 0.3, b1 - b0 + 0.6, 0.25, bz1 - bz0 + 0.6, SHADE);
  const rows: [number, number][] = [
    [G + 1.5, G + 3.4],
    [G + 4.3, G + 6.2],
  ];
  windows(b, 'z', bz0, -1, b0 + 0.4, b1 - 0.4, 2.2, rows);
  windows(b, 'z', bz1, 1, b0 + 0.4, b1 - 0.4, 2.2, rows);
  windows(b, 'x', b1, 1, bz0 + 0.4, bz1 - 0.4, 2.4, rows);
  const dz = (bz0 + bz1) / 2;
  b.box(b0 - 0.08, COURT_PODIUM, dz - 1.15, 0.08, 3.5, 2.3, SHADE);
  b.box(b0 - 0.12, COURT_PODIUM, dz - 0.8, 0.08, 3.1, 1.6, BRONZE);
  // Tall windows either side of the door on the portico wall
  for (const s of [-1, 1]) b.add(pane(b0 - 0.02, COURT_PODIUM + 2.2, dz + s * 2.9, 1, 3, 'x', -1), WIN);
}

export function registerFlanks(scene: THREE.Scene | null) {
  site('civic police', [POLICE_HQ[0] - 0.5, POLICE_HQ[1] - 0.5, POLICE_YARD[2] + 1.2, POLICE_YARD[3] + 0.1], (into) => {
    const b = new Batch();
    police(b);
    b.build(into, { cast: true, receive: true });
  });
  site('civic courthouse', [COURT[0] - 0.4, COURT[1] - 0.4, COURT[2] + 0.4, COURT[3] + 0.4], (into) => {
    const b = new Batch();
    courthouse(b);
    b.build(into, { cast: true, receive: true });
  });
  // The patrol cars in the yard (on the main thread: instanced, with far forms)
  if (scene) parkedCars(scene, G + 0.012, YARD_CARS.map(([id, x, z, yaw, c]) => [id as CarId, x, z, yaw, c]));
}
