/*
 * Degen's compound, drawn (docs/ends-far-west-plan.md Phase 2; the numbers are home.ts's): a site in the far west's
 * chunk (endsfar3d.ts registers it, in the worker too), on the plot's paving (endsfar3d.ts lays that):
 *
 * - **Done up** (docs/compound-plan.md Phase 1, the owner's pick: made good, with his neon): black steel (the gates,
 *   the canopy, the window frames, the garage's fascia, the workshop's door frame) and his neon, thin magenta tubes
 *   only (along the gates' tops, under the roof's edge on the yard and Close sides, the canopy's lip, the fascia's
 *   foot), all one paint so it costs no draw call of its own; his mark, a D (`mark()`), in neon on the gate pier's
 *   plaque and in stone in the paving before the garage; the yard's bollards with lit caps and the planters by the
 *   front door (home.ts `BOLLARDS`, `PLANTERS`); a hoop on the garage's pier; a pegboard of tools in the garage.
 * - **The wall** round the plot in the estate's brick under a pale coping, a taller pier each side of the gates with
 *   a cap and a small lamp, the black plaque with his D on one; **the gates** (two leaves of black steel, a kick
 *   plate and bars) standing open along the drive's edges, the back gate open against the wall.
 * - **The double garage**, hollow: brick walls, a flat felt roof behind a coping, its two up-and-over doors in the
 *   east wall up under the ceiling (the car and the bike stand inside: garage.ts's home stands), a concrete lintel
 *   over each, the fascia over them with a downlight over each door; inside a strip light, a workbench, shelves, a
 *   pegboard and tyres.
 * - **The house**: brick, its front on the yard in painted render (the one bold colour: made good, not flash), the
 *   front door under a canopy with a mat, big windows on both floors (the ground floor's tall), a side door onto the lawn; a flat roof behind
 *   a parapet with the terrace's rail, two chairs and a string of lights on it (Phase 3 climbs up to it).
 * - **The workshop**: a brick lean-to against the north wall, its roller door half up, a bench and a stack of tyres
 *   seen under it.
 * - **The lawns**: a tree and a bench in the north-west corner, a washing line on the east one; a path of flags
 *   from the front door to the gates' side.
 * - **Inside**: the room on the ground floor, behind the house's own walls: its four walls' inner faces with a
 *   window front and back and the two doors, a laminate floor, the ceiling and its lights, and what stands in it
 *   (home.ts `FURNITURE`). Drawn without shadows and lit from inside (the shared neon paint, `DAY` / `NIGHT`, each
 *   box's faces in three shades), so it's a lit room by day and at night.
 *
 * All in the shared paint (plain colours), the walls, roofs, doors and lawns at every distance, the rest near only;
 * phones leave out the finest (the shelves, the rail's bars, the string lights).
 */
import * as THREE from 'three';
import { Batch, PAL, neon, toon } from './kit';
import { site } from './tilework';
import { COVER, KERB, TREE, VERGE } from './palette';
import { glow, METAL } from './infill';
import { SHELF, type TrophySlot } from './hometrophies';
import { BOLLARD, BOLLARDS, CEIL, FURNITURE, HOME, HOME_LAND, HOME_SLAB, PIER, PLANTER_H, PLANTERS, ROOF_THINGS, ROOF_Y, ROOM, SHELL, WALL, WALL_H, WALL_T, type Furniture } from './home';
import type { Rect } from './endswood';

const S = HOME_SLAB;
/** The ground floor's front windows (over the slab): taller since the upgrade, inside and out */
const FRONT_SILL = 0.4;
const FRONT_HEAD = 1.08;
/** On the plot: what lies on its ground 24 mm over the slab (the paving is at 6 and its darker courses at 12:
 * endsfar3d.ts; nothing flush), what lies on that 6 more */
const ON = S + 0.024;
const OVER = ON + 0.006;
const BRICK = toon('#7a4337');
const BRICK_DARK = toon('#57302a');
const COPING = toon('#a9a5ad');
const FELT = toon('#2e2b36');
const JOINT = toon('#6a6772');
const FLAGS = toon(KERB.grit);
const DOOR = toon('#4a3270');
const SIDE_DOOR = toon('#2f2540');
const MAT = toon('#2a2622');
const LINTEL = toon('#8b8791');
const GATE = toon('#24222b');
const GARAGE_FLOOR = '#8a8791';
const GARAGE_CEILING = '#c9c5cc';
const GARAGE_BRICK = '#7a4337';
const BENCH = toon('#7a5a3a');
const TOOLBOX = toon('#b8322c');
const TYRE = toon('#1f1e25');
/** The house's front: the one bold colour, and its trim */
const RENDER = toon('#e8a23a');
const TRIM = toon('#f1eee8');
const GLASS = toon('#22304a');
/** A window with a lamp on behind it (Phase 5): dark by day, warm at night, under the bloom's threshold */
const LIT_GLASS = neon('#ffd58a', 0.14, 0.95);
const HIS_DOOR = toon('#e0563a');
const LAWN = toon(COVER.lawn);
const TRUNK_M = toon(TREE.trunk);
const CROWN = toon(TREE.crowns[1]);
const SHUTTER = toon('#6f737c');
const DARK = toon('#16151b');
const CHAIR = toon('#3f7f88');
const CLOTHES = ['#ecebe6', '#2b4c86', '#c9302b', '#e6c13c'].map((c) => toon(c));
/**
 * Done up (docs/compound-plan.md Phase 1): black steel for the gates, the canopy, the window frames, the garage's
 * fascia and the workshop's door frame; his neon (PulseChain magenta) as thin tubes only (about 36 mm across, so a line holds together from the
 * Close and the terrace, not breaking into dashes), the same paint everywhere
 * so a Batch folds it into its one shared neon; the bollards' caps soft, under the bloom's threshold
 */
const STEEL_BLACK = toon('#17161c');
const HIS_NEON = neon(PAL.magenta, 0.6, 2.4);
const CAP = neon('#fff1d6', 0.4, 1.3);
const PLANTER = toon('#1d1c22');
const SHRUB = toon(VERGE.hedge);
const BACKBOARD = toon('#ecebe6');
const RIM = toon('#e0563a');
const PEGBOARD = toon('#6b5a44');

/**
 * His mark, a D, as neon tubes (`tube`: a stem and a bowl) or laid flat (`tube` 0: a stem and a half ring, `t` wide),
 * `h` tall; built in the letter's own frame (x to its right, y up it, z out of it) and turned into the world by the
 * three directions given, its middle at `at`
 */
function mark(b: Batch, m: THREE.Material, h: number, at: THREE.Vector3, right: THREE.Vector3, up: THREE.Vector3, out: THREE.Vector3, opts: { tube?: number; t?: number } = {}) {
  const R = h / 2;
  const sx = -R * 0.55;
  const parts: THREE.BufferGeometry[] = [];
  if (opts.tube) {
    parts.push(new THREE.CylinderGeometry(opts.tube, opts.tube, h, 5).translate(sx, 0, 0));
    parts.push(new THREE.TorusGeometry(R, opts.tube, 5, 14, Math.PI).rotateZ(-Math.PI / 2).scale(1.15, 1, 1).translate(sx, 0, 0));
  } else {
    const t = opts.t ?? h * 0.18;
    parts.push(new THREE.PlaneGeometry(t, h).translate(sx + t / 2, 0, 0));
    parts.push(new THREE.RingGeometry(R - t, R, 20, 1, -Math.PI / 2, Math.PI).scale(1.15, 1, 1).translate(sx + t, 0, 0));
  }
  const place = new THREE.Matrix4().makeBasis(right, up, out).setPosition(at);
  for (const g of parts) {
    g.deleteAttribute('uv');
    b.add(g.applyMatrix4(place), m);
  }
}
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** A darker course round a rect's foot, `h` high: four strips a hair proud of the walls (never a slab across the floor) */
function course(b: Batch, [x0, z0, x1, z1]: Rect, h: number, m: THREE.Material) {
  const [P, T] = [0.012, 0.03];
  cube(b, [x0 - P, z0 - P, x1 + P, z0 - P + T], S, S + h, m);
  cube(b, [x0 - P, z1 + P - T, x1 + P, z1 + P], S, S + h, m);
  cube(b, [x0 - P, z0 - P + T, x0 - P + T, z1 + P - T], S, S + h, m);
  cube(b, [x1 + P - T, z0 - P + T, x1 + P, z1 + P - T], S, S + h, m);
}
const cube = (b: Batch, [x0, z0, x1, z1]: Rect, y0: number, y1: number, m: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, m);
function flat(b: Batch, [x0, z0, x1, z1]: Rect, y: number, m: THREE.Material) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2);
  g.deleteAttribute('uv');
  b.add(g.translate((x0 + x1) / 2, y, (z0 + z1) / 2), m);
}

/** The wall round the plot, the gates' piers and the gates themselves */
function wall(b: Batch, low: boolean) {
  const [x0, z0, x1, z1] = HOME.plot;
  const { gates: G, backGate: B } = HOME;
  const runs: Rect[] = [
    [x0, z0, x1, z0 + WALL_T],
    [x0, z1 - WALL_T, x1, z1],
    [x0, z0 + WALL_T, x0 + WALL_T, B.z0],
    [x0, B.z1, x0 + WALL_T, z1 - WALL_T],
    [x1 - WALL_T, z0 + WALL_T, x1, G.z0 - PIER.w],
    [x1 - WALL_T, G.z1 + PIER.w, x1, z1 - WALL_T],
  ];
  for (const r of runs) {
    cube(b, r, S, S + WALL_H - 0.08, BRICK);
    cube(b, [r[0] - 0.03, r[1] - 0.03, r[2] + 0.03, r[3] + 0.03], S + WALL_H - 0.08, S + WALL_H, COPING);
  }
  for (const z of [G.z0 - PIER.w, G.z1]) {
    cube(b, [x1 - PIER.w, z, x1, z + PIER.w], S, S + PIER.h - 0.1, BRICK);
    cube(b, [x1 - PIER.w - 0.04, z - 0.04, x1 + 0.04, z + PIER.w + 0.04], S + PIER.h - 0.1, S + PIER.h, COPING);
  }
  b.detail(() => {
    // A lamp on each pier, a plain lit plaque on the south one's face to the lane, a darker course at the wall's foot
    for (const z of [G.z0 - PIER.w / 2, G.z1 + PIER.w / 2]) b.add(new THREE.SphereGeometry(0.09, 8, 6).translate(x1 - PIER.w / 2, S + PIER.h + 0.09, z), glow(PAL.warm));
    // (the plaque: black, his D on it in neon, facing the lane)
    cube(b, [x1 + 0.006, G.z1 + 0.06, x1 + 0.03, G.z1 + PIER.w - 0.06], S + 0.82, S + 1.28, STEEL_BLACK);
    mark(b, HIS_NEON, 0.3, V(x1 + 0.05, S + 1.05, G.z1 + PIER.w / 2 + 0.02), V(0, 0, -1), V(0, 1, 0), V(1, 0, 0), { tube: 0.012 });
    for (const r of runs) course(b, r, 0.14, BRICK_DARK);
    // The gates: two leaves standing open along the drive's edges, a frame and bars each (phones: the frame and a sheet)
    for (const z of [G.z0 - 0.07, G.z1 + 0.01]) {
      const [gx0, gx1] = [x1 - PIER.w - 1.95, x1 - PIER.w - 0.02];
      // (black steel: a solid kick plate along the foot, bars over it, a neon tube along the top rail)
      cube(b, [gx0, z, gx1, z + 0.06], S + 0.06, S + 0.12, STEEL_BLACK);
      cube(b, [gx0, z, gx1, z + 0.06], S + 1.24, S + 1.3, STEEL_BLACK);
      for (const x of [gx0, gx1 - 0.06]) cube(b, [x, z, x + 0.06, z + 0.06], S + 0.06, S + 1.3, STEEL_BLACK);
      cube(b, [gx0 + 0.06, z + 0.01, gx1 - 0.06, z + 0.05], S + 0.12, S + 0.46, STEEL_BLACK);
      cube(b, [gx0 + 0.02, z + 0.012, gx1 - 0.02, z + 0.048], S + 1.3, S + 1.336, HIS_NEON);
      if (!low) for (let x = gx0 + 0.22; x < gx1 - 0.1; x += 0.16) cube(b, [x, z + 0.015, x + 0.03, z + 0.045], S + 0.46, S + 1.24, STEEL_BLACK);
    }
    // The back gate, open against the wall inside
    cube(b, [x0 + WALL_T + 0.02, B.z1, x0 + WALL_T + 0.07, B.z1 + 0.95], S + 0.05, S + 1.1, BENCH);
  });
}

/** The double garage */
function garage(b: Batch, low: boolean) {
  const [gx0, gz0, gx1, gz1] = HOME.garage;
  const { garageH: H, garageTop: TOP, carDoor: C, bikeDoor: K } = HOME;
  const W = WALL;
  cube(b, [gx0, gz0, gx1, gz0 + W], S, S + H, BRICK);
  cube(b, [gx0, gz1 - W, gx1, gz1], S, S + H, BRICK);
  cube(b, [gx0, gz0 + W, gx0 + W, gz1 - W], S, S + H, BRICK);
  // (the east wall: its two ends and the pier between the doors, a lintel over each)
  cube(b, [gx1 - W, gz0 + W, gx1, C.z0], S, S + H, BRICK);
  cube(b, [gx1 - W, C.z1, gx1, K.z0], S, S + H, BRICK);
  cube(b, [gx1 - W, K.z1, gx1, gz1 - W], S, S + H, BRICK);
  for (const D of [C, K]) cube(b, [gx1 - W, D.z0, gx1, D.z1], S + D.h, S + H, LINTEL);
  // (inside it's lit as the room is: the floor, the ceiling and the three walls' inner faces in the shared neon paint)
  {
    const [ix0, iz0, ix1, iz1] = [gx0 + W, gz0 + W, gx1 - W, gz1 - W];
    const [mx, mz, iw, id] = [(ix0 + ix1) / 2, (iz0 + iz1) / 2, ix1 - ix0, iz1 - iz0];
    sheet(b, iw, id, -Math.PI / 2, 0, mx, ON, mz, paint(GARAGE_FLOOR));
    sheet(b, iw, id, Math.PI / 2, 0, mx, S + H - 0.004, mz, paint(GARAGE_CEILING, 0.9));
    sheet(b, iw, H, 0, 0, mx, S + H / 2, iz0 + 0.006, paint(GARAGE_BRICK, 0.9));
    sheet(b, iw, H, 0, Math.PI, mx, S + H / 2, iz1 - 0.006, paint(GARAGE_BRICK, 0.9));
    sheet(b, id, H, 0, Math.PI / 2, ix0 + 0.006, S + H / 2, mz, paint(GARAGE_BRICK, 0.78));
  }
  cube(b, [gx0 - 0.04, gz0 - 0.04, gx1 + 0.04, gz1 + 0.04], S + H, S + TOP, COPING);
  cube(b, [gx0 + 0.1, gz0 + 0.1, gx1 - 0.1, gz1 - 0.1], S + TOP, S + TOP + 0.012, FELT);
  // The up-and-over doors, up: each panel under the ceiling just inside, its edge showing in the opening
  for (const D of [C, K]) cube(b, [gx1 - 0.02 - D.h * 0.92, D.z0 + 0.03, gx1 - 0.02, D.z1 - 0.03], S + D.h + 0.03, S + D.h + 0.07, DOOR);
  // A black steel fascia across the front over the doors, his neon along its foot, facing down the Close
  cube(b, [gx1 + 0.006, gz0 - 0.02, gx1 + 0.05, gz1 + 0.02], S + 1.5, S + TOP - 0.02, STEEL_BLACK);
  cube(b, [gx1 + 0.05, gz0 + 0.04, gx1 + 0.086, gz1 - 0.04], S + 1.51, S + 1.546, HIS_NEON);
  b.detail(() => {
    // A caged lamp on the pier between the doors, a drain at each door's foot; inside, a strip light over each bay,
    // a workbench and shelves along the back wall, a stack of tyres in the corner
    const pz = (C.z1 + K.z0) / 2;
    // (a downlight under the fascia over each door, where the caged lamp was: the yard's pool stays)
    for (const D of [C, K]) b.add(new THREE.SphereGeometry(0.035, 6, 4).translate(gx1 + 0.06, S + 1.49, (D.z0 + D.z1) / 2), glow(PAL.warm));
    // The hoop on the pier between the doors (the owner's pick): a backboard, the rim and its net
    cube(b, [gx1 + 0.006, pz - 0.3, gx1 + 0.03, pz + 0.3], S + 0.92, S + 1.38, BACKBOARD);
    cube(b, [gx1 + 0.03, pz - 0.1, gx1 + 0.036, pz + 0.1], S + 1.0, S + 1.012, RIM);
    cube(b, [gx1 + 0.03, pz - 0.015, gx1 + 0.06, pz + 0.015], S + 0.995, S + 1.01, RIM);
    b.add(new THREE.TorusGeometry(0.085, 0.007, 4, 14).rotateX(Math.PI / 2).translate(gx1 + 0.14, S + 1.0, pz), RIM);
    if (!low) b.add(new THREE.CylinderGeometry(0.085, 0.055, 0.13, 10, 1, true).translate(gx1 + 0.14, S + 0.93, pz), BACKBOARD);
    // A pegboard of tools on the back wall between the bench and the shelves
    cube(b, [gx0 + W + 0.006, gz0 + 2.1, gx0 + W + 0.03, gz1 - 2.1], S + 0.62, S + 1.28, PEGBOARD);
    if (!low) for (let z = gz0 + 2.3; z < gz1 - 2.2; z += 0.42) cube(b, [gx0 + W + 0.03, z, gx0 + W + 0.06, z + 0.06], S + 0.78 + ((z * 7) % 3) * 0.08, S + 1.12, METAL);
    for (const D of [C, K]) {
      flat(b, [gx1 + 0.1, D.z0 + 0.1, gx1 + 0.34, D.z1 - 0.1], OVER, JOINT);
      cube(b, [(gx0 + gx1) / 2 - 0.9, (D.z0 + D.z1) / 2 - 0.03, (gx0 + gx1) / 2 + 0.9, (D.z0 + D.z1) / 2 + 0.03], S + H - 0.06, S + H - 0.03, glow(PAL.warm));
    }
    const bx = gx0 + W;
    cube(b, [bx + 0.02, gz0 + W + 0.1, bx + 0.5, gz0 + W + 1.5], S + 0.5, S + 0.56, BENCH);
    for (const z of [gz0 + W + 0.14, gz0 + W + 1.42]) cube(b, [bx + 0.4, z, bx + 0.46, z + 0.05], S, S + 0.5, METAL);
    if (!low) {
      cube(b, [bx + 0.06, gz0 + W + 0.25, bx + 0.3, gz0 + W + 0.55], S + 0.56, S + 0.72, TOOLBOX);
      for (const y of [0.95, 1.25]) cube(b, [bx + 0.02, gz1 - W - 1.5, bx + 0.26, gz1 - W - 0.15], S + y, S + y + 0.03, BENCH);
    }
    for (let k = 0; k < 3; k++) b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 12).translate(bx + 0.4, S + 0.09 + k * 0.17, gz1 - W - 0.4), TYRE);
    // (the course at the walls' foot: on the three walls without doors)
    cube(b, [gx0 - 0.012, gz0 - 0.012, gx1, gz0 + 0.018], S, S + 0.12, BRICK_DARK);
    cube(b, [gx0 - 0.012, gz1 - 0.018, gx1, gz1 + 0.012], S, S + 0.12, BRICK_DARK);
    cube(b, [gx0 - 0.012, gz0 + 0.018, gx0 + 0.018, gz1 - 0.018], S, S + 0.12, BRICK_DARK);
  });
}

/** The house's outside: its shell, the roof and its terrace, the doors and windows */
function house(b: Batch, low: boolean) {
  const [x0, z0, x1, z1] = HOME.house;
  const { eaves: E, ridge: R } = HOME;
  const T = SHELL;
  // The shell: the front in render, the rest in brick; the upper floor's slab and the roof's
  cube(b, [x0, z0, x1, z0 + T], S, S + E, RENDER);
  cube(b, [x0, z1 - T, x1, z1], S, S + E, BRICK);
  cube(b, [x0, z0 + T, x0 + T, z1 - T], S, S + E, BRICK);
  cube(b, [x1 - T, z0 + T, x1, z1 - T], S, S + E, BRICK);
  cube(b, [x0 + T, z0 + T, x1 - T, z1 - T], S + CEIL + 0.004, S + CEIL + 0.1, COPING);
  cube(b, [x0, z0, x1, z1], S + E, S + E + 0.06, FELT);
  // The parapet round the roof, under a coping
  for (const r of [
    [x0, z0, x1, z0 + T],
    [x0, z1 - T, x1, z1],
    [x0, z0 + T, x0 + T, z1 - T],
    [x1 - T, z0 + T, x1, z1 - T],
  ] as Rect[]) {
    cube(b, r, S + E + 0.06, S + R - 0.05, r[1] === z0 && r[3] === z0 + T ? RENDER : BRICK);
    cube(b, [r[0] - 0.03, r[1] - 0.03, r[2] + 0.03, r[3] + 0.03], S + R - 0.05, S + R, COPING);
  }
  // His neon under the roof's edge, along the front (the yard) and the east side (the Close), a hair off the wall
  cube(b, [x0 + 0.1, z0 - 0.046, x1 - 0.1, z0 - 0.01], S + E - 0.09, S + E - 0.054, HIS_NEON);
  cube(b, [x1 + 0.01, z0 + 0.1, x1 + 0.046, z1 - 0.1], S + E - 0.09, S + E - 0.054, HIS_NEON);
  // The front: the door under its black steel canopy (his neon along its lip, a downlight under it), a wide window
  // each side of it, three upstairs; a hair off the wall
  const dx = HOME.door[0];
  const F = z0 - 0.02;
  cube(b, [dx - 0.34, F, dx + 0.34, z0 - 0.004], S, S + 1.12, HIS_DOOR);
  cube(b, [dx - 0.7, z0 - 0.75, dx + 0.7, z0], S + 1.22, S + 1.3, STEEL_BLACK);
  cube(b, [dx - 0.68, z0 - 0.774, dx + 0.68, z0 - 0.75], S + 1.25, S + 1.274, HIS_NEON);
  b.add(new THREE.SphereGeometry(0.035, 6, 4).translate(dx, S + 1.21, z0 - 0.4), glow(PAL.warm));
  const win = (wa: number, wb: number, y0: number, y1: number, on = true) => {
    cube(b, [wa, F, wb, z0 - 0.004], S + y0, S + y1, on ? LIT_GLASS : GLASS);
    b.detail(() => {
      cube(b, [wa - 0.05, F - 0.012, wb + 0.05, z0 - 0.004], S + y0 - 0.05, S + y0, STEEL_BLACK);
      cube(b, [wa - 0.05, F - 0.012, wb + 0.05, z0 - 0.004], S + y1, S + y1 + 0.05, STEEL_BLACK);
      for (const x of [wa - 0.05, wb]) cube(b, [x, F - 0.012, x + 0.05, z0 - 0.004], S + y0, S + y1, STEEL_BLACK);
      if (!low) cube(b, [(wa + wb) / 2 - 0.02, F - 0.012, (wa + wb) / 2 + 0.02, z0 - 0.004], S + y0, S + y1, STEEL_BLACK);
    });
  };
  // (the ground floor's two made taller, nearly to the canopy)
  win(x0 + 0.65, dx - 0.9, FRONT_SILL, FRONT_HEAD);
  win(dx + 0.9, x1 - 0.65, FRONT_SILL, FRONT_HEAD);
  // (upstairs: the middle one's lamp is off)
  [[x0 + 0.65, x0 + 2.65], [dx - 1.0, dx + 1.0], [x1 - 2.65, x1 - 0.65]].forEach(([wa, wb], k) => win(wa, wb, 1.55, 2.15, k !== 1));
  // The side door onto the lawn, and a window in the back wall
  const sz = HOME.sideDoor[1];
  cube(b, [x1 + 0.004, sz - 0.3, x1 + 0.02, sz + 0.3], S, S + 1.08, SIDE_DOOR);
  b.detail(() => {
    course(b, HOME.house, 0.14, BRICK_DARK);
    // A mat at the front door, the canopy's two brackets
    flat(b, [dx - 0.3, z0 - 0.52, dx + 0.3, z0 - 0.16], OVER + 0.004, MAT);
    for (const x of [dx - 0.62, dx + 0.56]) cube(b, [x, z0 - 0.5, x + 0.06, z0 - 0.004], S + 1.12, S + 1.22, STEEL_BLACK);
    // The terrace: a rail on the parapet's inside (posts and a top rail; phones: the top rail only), two chairs and a
    // low table, a string of lights across it from the front to the back
    const [tx0, tz0, tx1, tz1] = [x0 + T + 0.05, z0 + T + 0.05, x1 - T - 0.05, z1 - T - 0.05];
    const top = S + R + 0.42;
    for (const r of [
      [tx0, tz0, tx1, tz0 + 0.04],
      [tx0, tz1 - 0.04, tx1, tz1],
      [tx0, tz0, tx0 + 0.04, tz1],
      [tx1 - 0.04, tz0, tx1, tz1],
    ] as Rect[])
      cube(b, r, top - 0.04, top, GATE);
    if (!low) {
      for (let x = tx0; x <= tx1 + 1e-6; x += (tx1 - tx0) / 6) for (const z of [tz0, tz1 - 0.04]) cube(b, [x - 0.02, z, x + 0.02, z + 0.04], S + R - 0.05, top - 0.04, GATE);
      for (let z = tz0 + (tz1 - tz0) / 4; z < tz1 - 0.5; z += (tz1 - tz0) / 4) for (const x of [tx0, tx1 - 0.04]) cube(b, [x, z - 0.02, x + 0.04, z + 0.02], S + R - 0.05, top - 0.04, GATE);
      for (let k = 0; k <= 8; k++) b.add(new THREE.SphereGeometry(0.035, 5, 4).translate(tx0 + 1.2 + k * 0.02, S + R + 0.75 - Math.sin((k / 8) * Math.PI) * 0.2, tz0 + ((tz1 - tz0) * k) / 8), glow(PAL.warm));
    }
    // What stands on the terrace (home.ts `ROOF_THINGS`): the stairs' hatch with its lid up, two chairs and a low
    // table at the front rail, a planter in each back corner
    const y = S + ROOF_Y;
    for (const t of ROOF_THINGS) {
      const [a0, c0, a1, c1] = t.rect;
      if (t.kind === 'hatch') {
        // (a kerb round the opening, the dark of the stairs in it, the lid stood open on its east side)
        const K = 0.08;
        cube(b, [a0, c0, a1, c0 + K], y, y + 0.18, COPING);
        cube(b, [a0, c1 - K, a1, c1], y, y + 0.18, COPING);
        cube(b, [a0, c0 + K, a0 + K, c1 - K], y, y + 0.18, COPING);
        cube(b, [a1 - K, c0 + K, a1, c1 - K], y, y + 0.18, COPING);
        flat(b, [a0 + K, c0 + K, a1 - K, c1 - K], y + 0.02, DARK);
        cube(b, [a1 - 0.05, c0, a1, c1], y + 0.18, y + t.h + 0.5, GATE);
      } else if (t.kind === 'chair') {
        cube(b, [a0, c0, a1, c1], y, y + 0.22, CHAIR);
        cube(b, [a0, c1 - 0.06, a1, c1], y + 0.22, y + t.h, CHAIR);
      } else if (t.kind === 'table') cube(b, [a0, c0, a1, c1], y + t.h - 0.04, y + t.h, BENCH);
      else {
        cube(b, [a0, c0, a1, c1], y, y + t.h, BENCH);
        cube(b, [a0 + 0.05, c0 + 0.05, a1 - 0.05, c1 - 0.05], y + t.h, y + t.h + 0.16, CROWN);
      }
    }
  });
}

/** The workshop against the north wall, its roller door half up */
function workshop(b: Batch, low: boolean) {
  const [x0, z0, x1, z1] = HOME.workshop;
  const { workshopH: H, workshopDoor: D } = HOME;
  const W = WALL;
  cube(b, [x0, z0, x1, z0 + W], S, S + H, BRICK);
  cube(b, [x0, z0 + W, x0 + W, z1], S, S + H, BRICK);
  cube(b, [x1 - W, z0 + W, x1, z1], S, S + H, BRICK);
  cube(b, [x0 + W, z1 - W, D.x0, z1], S, S + H, BRICK);
  cube(b, [D.x1, z1 - W, x1 - W, z1], S, S + H, BRICK);
  cube(b, [D.x0, z1 - W, D.x1, z1], S + D.h, S + H, LINTEL);
  // The roller door half up: the shutter over the opening's top half, the dark of the workshop behind the bottom
  cube(b, [D.x0, z1 - 0.07, D.x1, z1 - 0.03], S + D.h * 0.5, S + D.h, SHUTTER);
  cube(b, [D.x0, z1 - W - 0.9, D.x1, z1 - W - 0.86], S, S + D.h * 0.5, DARK);
  cube(b, [x0 - 0.04, z0 - 0.04, x1 + 0.04, z1 + 0.04], S + H, S + H + 0.12, COPING);
  cube(b, [x0 + 0.1, z0 + 0.1, x1 - 0.1, z1 - 0.1], S + H + 0.12, S + H + 0.132, FELT);
  b.detail(() => {
    // Seen under the door: a bench across the opening inside, a toolbox on it, a stack of tyres; the shutter's slats
    cube(b, [D.x0 + 0.1, z1 - W - 0.7, D.x1 - 0.9, z1 - W - 0.25], S + 0.44, S + 0.5, BENCH);
    for (const x of [D.x0 + 0.14, D.x1 - 1.0]) cube(b, [x, z1 - W - 0.66, x + 0.06, z1 - W - 0.3], S, S + 0.44, METAL);
    for (let k = 0; k < 2; k++) b.add(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 12).translate(D.x1 - 0.45, S + 0.09 + k * 0.17, z1 - W - 0.45), TYRE);
    if (!low) {
      cube(b, [D.x0 + 0.3, z1 - W - 0.62, D.x0 + 0.62, z1 - W - 0.36], S + 0.5, S + 0.62, TOOLBOX);
      for (let y = D.h * 0.5 + 0.1; y < D.h - 0.04; y += 0.12) cube(b, [D.x0, z1 - 0.026, D.x1, z1 - 0.018], S + y, S + y + 0.02, JOINT);
    }
    course(b, HOME.workshop, 0.12, BRICK_DARK);
    flat(b, [D.x0 + 0.1, z1 + 0.1, D.x1 - 0.1, z1 + 0.34], OVER, JOINT);
    // The door's frame in black steel, and a plain lightbox over it (no sign on it)
    for (const x of [D.x0 - 0.06, D.x1]) cube(b, [x, z1 + 0.004, x + 0.06, z1 + 0.04], S, S + D.h + 0.06, STEEL_BLACK);
    cube(b, [D.x0 - 0.06, z1 + 0.004, D.x1 + 0.06, z1 + 0.04], S + D.h, S + D.h + 0.06, STEEL_BLACK);
    cube(b, [D.x0 + 0.4, z1 + 0.004, D.x1 - 0.4, z1 + 0.05], S + D.h + 0.09, S + D.h + 0.22, CAP);
  });
}

/** The lawns and what's on them, and the path from the front door */
function gardens(b: Batch, low: boolean) {
  const [nw, east] = HOME.lawns;
  for (const r of HOME.lawns) flat(b, [r[0] + 0.05, r[1] + 0.05, r[2] - 0.05, r[3] - 0.05], ON, LAWN);
  // A path of flags from the front door out into the yard
  flat(b, [HOME.door[0] - 0.6, HOME.door[1] - 2.2, HOME.door[0] + 0.6, HOME.door[1] - 0.02], ON, FLAGS);
  // His D set in the paving in front of the garage, in the coping's stone, read from the gates (at every distance: it's seen
  // from the terrace and the Close)
  mark(b, COPING, 1.5, V(HOME.garage[2] + 1.9, OVER, (HOME.carDoor.z1 + HOME.bikeDoor.z0) / 2), V(0, 0, -1), V(-1, 0, 0), V(0, 1, 0), { t: 0.26 });
  // The planters by the front door, black steel with a clipped shrub in each
  for (const r of PLANTERS) {
    cube(b, r, S, S + PLANTER_H, PLANTER);
    b.add(new THREE.SphereGeometry(0.2, low ? 6 : 8, low ? 4 : 6).scale(0.8, 1.1, 1.2).translate((r[0] + r[2]) / 2, S + PLANTER_H + 0.15, (r[1] + r[3]) / 2), SHRUB);
  }
  // The yard's bollards: black posts, their caps lit
  for (const [x, z] of BOLLARDS) {
    // (phones: six sides, not eight)
    const n = low ? 6 : 8;
    b.add(new THREE.CylinderGeometry(BOLLARD.r, BOLLARD.r, BOLLARD.h - 0.06, n).translate(x, S + (BOLLARD.h - 0.06) / 2, z), STEEL_BLACK);
    b.add(new THREE.CylinderGeometry(BOLLARD.r * 0.9, BOLLARD.r * 0.9, 0.06, n).translate(x, S + BOLLARD.h - 0.03, z), CAP);
  }
  // The tree in the north-west corner (at every distance: it shows over the wall)
  const [tx, tz] = [nw[0] + 2.2, nw[1] + 2.4];
  b.add(new THREE.CylinderGeometry(0.14, 0.18, 1.3, 7).translate(tx, S + 0.65, tz), TRUNK_M);
  b.add(new THREE.SphereGeometry(1.25, low ? 7 : 10, low ? 5 : 7).scale(1, 0.85, 1).translate(tx, S + 2.1, tz), CROWN);
  b.detail(() => {
    // A bench under it, facing the yard; on the east lawn two posts and a line with the washing out
    cube(b, [tx + 1.6, tz - 0.7, tx + 2.0, tz + 0.7], S + 0.22, S + 0.27, BENCH);
    cube(b, [tx + 1.6, tz - 0.7, tx + 1.65, tz + 0.7], S + 0.27, S + 0.5, BENCH);
    for (const z of [tz - 0.6, tz + 0.55]) cube(b, [tx + 1.62, z, tx + 1.98, z + 0.05], S, S + 0.22, METAL);
    const lx = (east[0] + east[2]) / 2;
    const [la, lb] = [east[1] + 1.2, east[3] - 1.2];
    for (const z of [la, lb]) b.add(new THREE.CylinderGeometry(0.035, 0.04, 1.3, 5, 1, true).translate(lx, S + 0.65, z), TRIM);
    cube(b, [lx - 0.006, la, lx + 0.006, lb], S + 1.2, S + 1.21, METAL);
    if (!low) for (let k = 0, z = la + 0.3; z < lb - 0.4; k++, z += 0.42) cube(b, [lx - 0.01, z, lx + 0.01, z + 0.3], S + 0.9 - (k % 3) * 0.06, S + 1.19, CLOTHES[k % CLOTHES.length]);
  });
}

export function registerHome(low: boolean) {
  site('home', [HOME_LAND[0] - 1, HOME_LAND[1] - 1, HOME_LAND[2] + 1, HOME_LAND[3] + 1], (into) => {
    const b = new Batch();
    wall(b, low);
    garage(b, low);
    house(b, low);
    workshop(b, low);
    gardens(b, low);
    b.build(into, { cast: true, receive: true });
    inside(into, low);
  });
}

const WALLS_IN = '#d9d0c2';
const SKIRT = '#b7ad9e';
const LAMINATE = '#8c6c4c';
const CEILING_IN = '#e8e4dc';
const WINDOW = '#bfe3f2';
const FRAME = '#f1eee8';
const SOFA = '#3f3a5a';
const CUSHION = '#b0307a';
const RUG = '#2f7f88';
const WOOD = '#6b4a30';
const WOOD_DARK = '#4a3322';
const SCREEN = '#15141c';
const UNIT = '#4a5a6a';
const FRIDGE = '#dcdce0';
const TRUNK = '#2e663c';
const FRONT_DOOR = '#e0563a';

/**
 * The room is lit from inside (Phase 5): its surfaces are in the shared neon paint, which takes no light from the
 * sky, at `DAY` of their colour by day and `NIGHT` at night (the lamps on), so it's never as dark as the street
 * outside. Unlit paint has no shading of its own, so each box's top, its sides across the room and its sides along
 * it take three shades of its colour (`TOP`, `SIDE_Z`, `SIDE_X`): the shapes still read. All under the bloom's
 * threshold: a lit room, not a glowing one.
 */
const DAY = 0.95;
const NIGHT = 0.8;
const [TOP, SIDE_Z, SIDE_X] = [1, 0.86, 0.74];
const shades = new Map<string, THREE.Material>();
function paint(hex: string, k = 1) {
  const key = `${hex}:${k}`;
  let m = shades.get(key);
  if (!m) shades.set(key, (m = neon(new THREE.Color(hex).multiplyScalar(k), DAY, NIGHT)));
  return m;
}
/** A plane w by h turned to face the way (`rx`, `ry`) turn it, its middle at x, y, z */
function sheet(b: Batch, w: number, h: number, rx: number, ry: number, x: number, y: number, z: number, m: THREE.Material) {
  const g = new THREE.PlaneGeometry(w, h).rotateX(rx).rotateY(ry);
  g.deleteAttribute('uv');
  b.add(g.translate(x, y, z), m);
}
/** A box in the room: its top and four sides, each in its shade (no bottom: it stands on something) */
function icube(b: Batch, [x0, z0, x1, z1]: Rect, y0: number, y1: number, hex: string) {
  const [cx, cz, cy, w, d, h] = [(x0 + x1) / 2, (z0 + z1) / 2, (y0 + y1) / 2, x1 - x0, z1 - z0, y1 - y0];
  sheet(b, w, d, -Math.PI / 2, 0, cx, y1, cz, paint(hex, TOP));
  sheet(b, w, h, 0, 0, cx, cy, z1, paint(hex, SIDE_Z));
  sheet(b, w, h, 0, Math.PI, cx, cy, z0, paint(hex, SIDE_Z));
  sheet(b, d, h, 0, Math.PI / 2, x1, cy, cz, paint(hex, SIDE_X));
  sheet(b, d, h, 0, -Math.PI / 2, x0, cy, cz, paint(hex, SIDE_X));
}
const iflat = (b: Batch, [x0, z0, x1, z1]: Rect, y: number, hex: string) => sheet(b, x1 - x0, z1 - z0, -Math.PI / 2, 0, (x0 + x1) / 2, y, (z0 + z1) / 2, paint(hex));
/** A wall's inner face: w wide from y0 to y1, its middle at cx, cz, turned by `turn` to face into the room */
const face = (b: Batch, cx: number, cz: number, w: number, y0: number, y1: number, turn: number, hex: string, k = 1) => sheet(b, w, y1 - y0, 0, turn, cx, (y0 + y1) / 2, cz, paint(hex, k));

const STEEL = '#8a8d96';
/** The refit's colours (docs/compound-plan.md Phase 2): black steel and dark units, a pale worktop, his magenta */
const INK = '#1d1c22';
const DARK_UNIT = '#24222b';
const PALE_TOP = '#e9e6e1';
const SHADE = '#efe2c4';
const LEAF = TREE.crowns[0];
const SHELF_BACK = '#2a2733';
const PRINT_PAPER = '#f1eee8';
const CONSOLE_BOX = '#e8e6ea';
/** A glow inside, softer than the street's neon: the telly's backlight and the island's strip, his magenta */
const BACKLIGHT = neon(PAL.magenta, 1.2, 1.4);

/** A rod from a to c, `r` thick (the stairs' rail and stringer, the pendant's cord) */
function rod(b: Batch, a: THREE.Vector3, c: THREE.Vector3, r: number, m: THREE.Material) {
  const d = c.clone().sub(a);
  const g = new THREE.CylinderGeometry(r, r, d.length(), 5);
  g.deleteAttribute('uv');
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  b.add(g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2), m);
}
/** A small round thing in the room's paint: a cylinder `r0` at the top, `r1` at the foot, from y0 to y1 */
const drum = (b: Batch, x: number, z: number, r0: number, r1: number, y0: number, y1: number, hex: string, n = 8) => {
  const g = new THREE.CylinderGeometry(r0, r1, y1 - y0, n);
  g.deleteAttribute('uv');
  b.add(g.translate(x, (y0 + y1) / 2, z), paint(hex));
};

/** The room inside (home.ts `ROOM`, `FURNITURE`) */
function inside(into: THREE.Object3D, low: boolean) {
  const b = new Batch();
  // (a hair inside the shell's inner faces, which the house's own walls draw: nothing flush)
  const G = 0.006;
  const [x0, z0, x1, z1] = [ROOM[0] + G, ROOM[1] + G, ROOM[2] - G, ROOM[3] - G];
  const [cx, cz, w, d] = [(x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0];
  const top = S + CEIL;
  // The four walls' inner faces (north faces south into the room, and so on), the floor and the ceiling
  face(b, cx, z0, w, S, top, 0, WALLS_IN, 0.94);
  face(b, cx, z1, w, S, top, Math.PI, WALLS_IN, 0.9);
  face(b, x0, cz, d, S, top, Math.PI / 2, WALLS_IN, 0.82);
  face(b, x1, cz, d, S, top, -Math.PI / 2, WALLS_IN, 0.82);
  iflat(b, ROOM, ON, LAMINATE);
  sheet(b, w, d, Math.PI / 2, 0, cx, top, cz, paint(CEILING_IN));
  // The front door (his own colour) in the north wall and the side door in the east one, a hair off the walls
  const dx = HOME.door[0];
  const sz = HOME.sideDoor[1];
  icube(b, [dx - 0.3, z0 + 0.006, dx + 0.3, z0 + 0.04], S, S + 1.08, FRONT_DOOR);
  icube(b, [x1 - 0.04, sz - 0.28, x1 - 0.006, sz + 0.28], S, S + 1.05, WOOD_DARK);
  // The front windows either side of the door (as tall as outside, FRONT_SILL to FRONT_HEAD; the east one up to the
  // stairs), and one over the counter in the back
  const stairs = FURNITURE.find((f) => f.kind === 'stairs')!.rect;
  for (const [z, s, wa, wb, y0, y1] of [
    [z0, 1, x0 + 0.5, dx - 0.75, FRONT_SILL, FRONT_HEAD],
    [z0, 1, dx + 0.9, stairs[0] - 0.1, FRONT_SILL, FRONT_HEAD],
    [z1, -1, x0 + 0.8, x0 + 4.2, 0.6, 1.02],
  ] as [number, number, number, number, number, number][]) {
    icube(b, [wa, Math.min(z + s * 0.006, z + s * 0.02), wb, Math.max(z + s * 0.006, z + s * 0.02)], S + y0, S + y1, WINDOW);
    b.detail(() => {
      icube(b, [wa - 0.04, Math.min(z + s * 0.006, z + s * 0.035), wb + 0.04, Math.max(z + s * 0.006, z + s * 0.035)], S + y0 - 0.04, S + y0, FRAME);
      icube(b, [wa - 0.04, Math.min(z + s * 0.006, z + s * 0.035), wb + 0.04, Math.max(z + s * 0.006, z + s * 0.035)], S + y1, S + y1 + 0.04, FRAME);
      icube(b, [(wa + wb) / 2 - 0.02, Math.min(z + s * 0.021, z + s * 0.035), (wa + wb) / 2 + 0.02, Math.max(z + s * 0.021, z + s * 0.035)], S + y0, S + y1, FRAME);
    });
  }
  for (const f of FURNITURE) furnish(b, f, low);
  b.detail(() => {
    // The lounge's and the hall's ceiling lights, flat discs (a round one hung in front of the trophy wall's top shelf
    // and read as a trophy; the kitchen's is the pendant over the island), the rug under the coffee table, the skirting
    // along the west wall
    for (const [lx, lz] of [[x0 + 2.0, z0 + 1.7], [dx + 1.2, cz]]) b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 12).translate(lx, top - 0.016, lz), glow(PAL.warm));
    const t = FURNITURE.find((f) => f.kind === 'table')!.rect;
    iflat(b, [t[0] - 0.5, t[1] - 0.35, t[2] + 0.24, t[3] + 0.35], OVER, RUG);
    icube(b, [x0, z0, x0 + 0.02, z1], S, S + 0.07, SKIRT);
    // Two prints of his own (made-up: blocks of his colours on paper, black frames): on the back wall in the hall, on
    // the east wall past the side door
    print(b, [dx + 1.4, z1 - 0.03, dx + 2.3, z1 - 0.006], 0.45, 0.95, 'z');
    print(b, [x1 - 0.03, sz + 0.55, x1 - 0.006, sz + 1.2], 0.45, 0.9, 'x');
  });
  // (no shadows, and lit from inside: the shared neon paint takes no light from the sky)
  b.build(into, { cast: false, receive: false });
}

/**
 * A framed print on a wall, facing into the room (-x or -z: the back and east walls): its frame's box (thin across
 * the wall), from y0 to y1, and the axis it runs along; the paper and two blocks of his colours a few mm in front
 */
function print(b: Batch, r: Rect, y0: number, y1: number, along: 'x' | 'z') {
  icube(b, r, S + y0, S + y1, INK);
  const [x0, z0, x1, z1] = r;
  const [lo, hi, front] = along === 'x' ? [x0, x1, z0] : [z0, z1, x0];
  const box = (a: number, c: number, ya: number, yc: number, k: number, hex: string) => {
    const [f0, f1] = [front - 0.006 - k * 0.005, front - 0.002 - k * 0.005];
    const [p, q] = [lo + a * (hi - lo), lo + c * (hi - lo)];
    icube(b, along === 'x' ? [p, f0, q, f1] : [f0, p, f1, q], S + ya, S + yc, hex);
  };
  box(0.08, 0.92, y0 + 0.04, y1 - 0.04, 0, PRINT_PAPER);
  box(0.18, 0.62, y0 + 0.1, y1 - 0.18, 1, PAL.magenta);
  box(0.45, 0.82, y0 + 0.2, y1 - 0.1, 2, PAL.cyan);
}

/** One thing in the room, by its kind */
function furnish(b: Batch, { kind, rect, h }: Furniture, low: boolean) {
  const [x0, z0, x1, z1] = rect;
  const y = S + 0.012;
  if (kind === 'stairs') {
    // Open stairs (the refit): treads rising north along the east wall to the opening in the ceiling over their top
    // (the way up is the fade, home.ts `HOME_PORTALS`), a black steel stringer and handrail on the room's side, posts
    const n = 9;
    const run = (z1 - z0) / n;
    const rise = h / n;
    for (let k = 0; k < n; k++) {
      const [za, zb] = [z1 - (k + 1) * run, z1 - k * run];
      icube(b, [x0 + 0.04, za, x1 - 0.006, zb + 0.004], S + (k + 1) * rise - 0.05, S + (k + 1) * rise, WOOD);
    }
    const rail = 0.42;
    rod(b, V(x0 + 0.03, S + 0.02, z1), V(x0 + 0.03, S + h - 0.02, z0 + 0.15), 0.025, paint(INK));
    b.detail(() => {
      rod(b, V(x0 + 0.03, S + rail, z1), V(x0 + 0.03, S + h + rail - 0.1, z0 + 0.35), 0.014, paint(INK));
      if (!low)
        for (let k = 1; k < n; k += 2) {
          const z = z1 - (k + 0.5) * run;
          rod(b, V(x0 + 0.03, S + (k + 1) * rise, z), V(x0 + 0.03, S + (k + 1) * rise + rail, z), 0.008, paint(INK));
        }
      // (the opening in the ceiling over the stairs' top: dark, a hair under the ceiling)
      sheet(b, x1 - x0, 1.4, Math.PI / 2, 0, (x0 + x1) / 2, S + CEIL - 0.006, z0 + 0.75, paint(SHELF_BACK));
    });
  } else if (kind === 'sofa') {
    // The corner sofa's long run under the front window (its arm at the west end: the chaise turns the east corner)
    icube(b, [x0, z0 + 0.22, x1, z1], y, S + 0.22, SOFA);
    icube(b, [x0, z0, x1, z0 + 0.22], y, S + h, SOFA);
    icube(b, [x0, z0, x0 + 0.14, z1], y, S + 0.32, SOFA);
    b.detail(() => {
      for (const x of [x0 + 0.2, x1 - 1.1]) icube(b, [x, z0 + 0.2, x + 0.32, z0 + 0.3], S + 0.22, S + 0.4, CUSHION);
    });
  } else if (kind === 'chaise') {
    // Its back along the east side (the hall's), its arm at the south end
    icube(b, [x0, z0, x1 - 0.22, z1], y, S + 0.22, SOFA);
    icube(b, [x1 - 0.22, z0, x1, z1], y, S + h, SOFA);
    icube(b, [x0, z1 - 0.14, x1 - 0.22, z1], y, S + 0.32, SOFA);
    b.detail(() => icube(b, [x1 - 0.32, z0 + 0.25, x1 - 0.22, z0 + 0.57], S + 0.22, S + 0.4, CUSHION));
  } else if (kind === 'table') {
    // The coffee table: a dark top on a plinth, a controller on it
    icube(b, [x0, z0, x1, z1], S + h - 0.04, S + h, DARK_UNIT);
    icube(b, [x0 + 0.08, z0 + 0.08, x1 - 0.08, z1 - 0.08], y, S + h - 0.04, INK);
    b.detail(() => icube(b, [x0 + 0.2, z0 + 0.25, x0 + 0.32, z0 + 0.32], S + h, S + h + 0.02, INK));
  } else if (kind === 'tv') {
    // The long low media unit across the room, the wide telly on it facing the sofa (north), his magenta glowing
    // round it from behind, the console on the unit with its light
    icube(b, rect, y, S + h, DARK_UNIT);
    const m = (x0 + x1) / 2;
    const [sy0, sy1] = [S + h + 0.08, S + h + 0.74];
    icube(b, [m - 0.8, z0 + 0.12, m + 0.8, z0 + 0.16], sy0, sy1, SCREEN);
    icube(b, [m - 0.84, z0 + 0.165, m + 0.84, z0 + 0.175], sy0 - 0.04, sy1 + 0.04, '#000000');
    b.add(new THREE.BoxGeometry(1.72, sy1 - sy0 + 0.07, 0.006).translate(m, (sy0 + sy1) / 2 + 0.01, z0 + 0.182), BACKLIGHT);
    icube(b, [m - 0.08, z0 + 0.1, m + 0.08, z0 + 0.2], S + h, sy0, SCREEN);
    b.detail(() => {
      icube(b, [x1 - 0.42, z0 + 0.08, x1 - 0.14, z0 + 0.24], S + h, S + h + 0.05, CONSOLE_BOX);
      b.add(new THREE.SphereGeometry(0.012, 5, 4).translate(x1 - 0.2, S + h + 0.03, z0 + 0.075), glow(PAL.cyan));
      // (the unit's doors: dark lines down its front)
      if (!low) for (let x = x0 + 0.65; x < x1 - 0.3; x += 0.65) icube(b, [x - 0.008, z0 - 0.006, x + 0.008, z0], S + 0.04, S + h - 0.04, INK);
    });
  } else if (kind === 'trophies') {
    // The trophy wall's shelving (what stands on it is drawn from the save: `trophyWall()`): a dark back panel on the
    // west wall, three shelves, a warm strip under each
    icube(b, [x0 + 0.006, z0, x0 + 0.026, z1], S + 0.32, S + h, SHELF_BACK);
    for (const sy of TROPHY_SHELVES) {
      icube(b, [x0 + 0.026, z0 + 0.03, x1, z1 - 0.03], S + sy - 0.025, S + sy, WOOD_DARK);
      b.detail(() => icube(b, [x0 + 0.03, z0 + 0.06, x0 + 0.05, z1 - 0.06], S + sy - 0.035, S + sy - 0.025, '#ffd58a'));
    }
  } else if (kind === 'lamp') {
    const [mx, mz] = [(x0 + x1) / 2, (z0 + z1) / 2];
    drum(b, mx, mz, 0.1, 0.11, S + 0.006, S + 0.03, INK);
    drum(b, mx, mz, 0.012, 0.012, S + 0.03, S + h - 0.2, INK, 5);
    drum(b, mx, mz, 0.09, 0.12, S + h - 0.2, S + h, SHADE);
    b.detail(() => b.add(new THREE.SphereGeometry(0.04, 6, 4).translate(mx, S + h - 0.22, mz), glow(PAL.warm)));
  } else if (kind === 'plant') {
    const [mx, mz] = [(x0 + x1) / 2, (z0 + z1) / 2];
    icube(b, [x0 + 0.02, z0 + 0.02, x1 - 0.02, z1 - 0.02], y, S + 0.24, INK);
    const g = new THREE.SphereGeometry((x1 - x0) * 0.75, low ? 6 : 8, low ? 4 : 6).scale(1, (h - 0.2) / ((x1 - x0) * 1.5), 1);
    g.deleteAttribute('uv');
    b.add(g.translate(mx, S + 0.2 + (h - 0.2) / 2, mz), paint(LEAF));
  } else if (kind === 'console') {
    // The hall's console table under the window east of the door: a top, two legs, a bowl for his keys
    icube(b, [x0, z0, x1, z1], S + h - 0.03, S + h, WOOD);
    for (const x of [x0 + 0.04, x1 - 0.08]) icube(b, [x, z0 + 0.04, x + 0.04, z1 - 0.04], y, S + h - 0.03, INK);
    b.detail(() => drum(b, x0 + 0.3, (z0 + z1) / 2, 0.08, 0.05, S + h, S + h + 0.04, PAL.magenta));
  } else if (kind === 'counter') {
    icube(b, [x0, z0 + 0.04, x1, z1], y, S + h - 0.04, DARK_UNIT);
    icube(b, [x0 - 0.02, z0, x1, z1], S + h - 0.04, S + h, PALE_TOP);
    b.detail(() => {
      // A sink, a hob, the cupboards' doors and a kettle
      icube(b, [x0 + 0.5, z0 + 0.14, x0 + 1.0, z1 - 0.12], S + h, S + h + 0.006, STEEL);
      icube(b, [x1 - 0.85, z0 + 0.14, x1 - 0.35, z1 - 0.12], S + h, S + h + 0.012, SCREEN);
      if (!low) for (let x = x0 + 0.5; x < x1 - 0.2; x += 0.55) icube(b, [x - 0.01, z0 + 0.025, x + 0.01, z0 + 0.04], S + 0.06, S + h - 0.08, STEEL);
      drum(b, x0 + 0.25, z0 + 0.3, 0.07, 0.08, S + h, S + h + 0.16, FRIDGE);
    });
  } else if (kind === 'fridge') {
    icube(b, rect, y, S + h, FRIDGE);
    b.detail(() => icube(b, [x0 + 0.06, z0 - 0.02, x0 + 0.09, z0 - 0.004], S + 0.35, S + 0.75, UNIT));
  } else if (kind === 'island') {
    // The island: a dark base set back from the stools' side, a pale top over it, his glow under the overhang, a bowl;
    // the pendant over it on its cord
    icube(b, [x0 + 0.08, z0 + 0.16, x1 - 0.08, z1], y, S + h - 0.04, DARK_UNIT);
    icube(b, [x0, z0, x1, z1], S + h - 0.04, S + h, PALE_TOP);
    const [mx, mz] = [(x0 + x1) / 2, (z0 + z1) / 2];
    b.detail(() => {
      b.add(new THREE.BoxGeometry(x1 - x0 - 0.3, 0.012, 0.012).translate(mx, S + h - 0.052, z0 + 0.175), BACKLIGHT);
      drum(b, mx + 0.5, mz, 0.1, 0.06, S + h, S + h + 0.06, CONSOLE_BOX);
      rod(b, V(mx, S + CEIL - 0.006, mz), V(mx, S + 0.98, mz), 0.006, paint(INK));
      drum(b, mx, mz, 0.035, 0.14, S + 0.86, S + 0.98, INK, 10);
      b.add(new THREE.SphereGeometry(0.045, 6, 4).translate(mx, S + 0.86, mz), glow(PAL.warm));
    });
  } else if (kind === 'stools') {
    // Three stools along the island's lounge side: a seat in his magenta on a steel leg and a foot ring
    for (let k = 0; k < 3; k++) {
      const sx = x0 + ((x1 - x0) * (k + 0.5)) / 3;
      const sz = (z0 + z1) / 2;
      drum(b, sx, sz, 0.11, 0.1, S + h - 0.04, S + h, CUSHION);
      drum(b, sx, sz, 0.015, 0.015, S + 0.02, S + h - 0.04, STEEL, 5);
      drum(b, sx, sz, 0.09, 0.09, S + 0.006, S + 0.02, STEEL);
      b.detail(() => drum(b, sx, sz, 0.08, 0.08, S + 0.12, S + 0.13, STEEL));
    }
  } else if (kind === 'wardrobe') {
    icube(b, rect, y, S + h, WOOD);
    b.detail(() => {
      const m = (z0 + z1) / 2;
      icube(b, [x0 - 0.012, m - 0.008, x0 - 0.002, m + 0.008], S + 0.05, S + h - 0.05, WOOD_DARK);
      for (const z of [m - 0.07, m + 0.05]) icube(b, [x0 - 0.03, z, x0 - 0.004, z + 0.02], S + 0.5, S + 0.62, STEEL);
    });
  } else {
    // The stash: a trunk, a band round its lid
    icube(b, rect, y, S + h, TRUNK);
    b.detail(() => icube(b, [x0 - 0.008, z0 - 0.008, x1 + 0.008, z1 + 0.008], S + h - 0.09, S + h - 0.06, STEEL));
  }
}

/* ---------- The trophy wall (docs/compound-plan.md Phase 2): what's on its shelves, from the save ---------- */

/** The shelves' tops over the slab, the top one first (hometrophies.ts `shelf` 0, 1, 2) */
const TROPHY_SHELVES = [0.99, 0.72, 0.45];
const METALS: Record<1 | 2 | 3, string> = { 1: '#f2c94c', 2: '#c9ccd6', 3: '#c07a3a' };
const PLINTH = '#3a3640';
const GLOVE = '#c9302b';

/** One slot on the wall: what's won, or an empty stand where it will go */
function trophy(b: Batch, t: TrophySlot, low: boolean) {
  const [x0, z0, , z1] = FURNITURE.find((f) => f.kind === 'trophies')!.rect;
  const sy = S + TROPHY_SHELVES[t.shelf];
  // (from the south end: facing the wall from the room, west, that's the left, so the shelves read left to right)
  const z = z1 - 0.06 - t.along * (z1 - z0 - 0.12);
  const x = x0 + 0.12;
  if (!t.won) {
    icube(b, [x - 0.035, z - 0.035, x + 0.035, z + 0.035], sy, sy + 0.02, PLINTH);
    return;
  }
  const n = low ? 6 : 10;
  if (t.kind === 'cup') {
    const c = METALS[t.metal];
    icube(b, [x - 0.035, z - 0.035, x + 0.035, z + 0.035], sy, sy + 0.025, INK);
    drum(b, x, z, 0.012, 0.016, sy + 0.025, sy + 0.07, c, 6);
    drum(b, x, z, 0.05, 0.026, sy + 0.07, sy + 0.15, c, n);
    for (const s of [-1, 1]) icube(b, [x - 0.006, z + s * 0.05, x + 0.006, z + s * 0.066], sy + 0.09, sy + 0.135, c);
  } else if (t.kind === 'belt') {
    // (the strap stood up against the back panel, the gold plate on it)
    icube(b, [x0 + 0.03, z - 0.17, x0 + 0.045, z + 0.17], sy + 0.03, sy + 0.08, INK);
    icube(b, [x0 + 0.045, z - 0.065, x0 + 0.055, z + 0.065], sy + 0.015, sy + 0.095, METALS[1]);
    icube(b, [x0 + 0.055, z - 0.025, x0 + 0.06, z + 0.025], sy + 0.04, sy + 0.07, PAL.magenta);
  } else if (t.kind === 'glove') {
    const g = new THREE.SphereGeometry(0.05, n, low ? 4 : 6).scale(0.8, 1, 0.9);
    g.deleteAttribute('uv');
    b.add(g.translate(x, sy + 0.07, z), paint(GLOVE));
    drum(b, x, z, 0.03, 0.032, sy, sy + 0.035, PALE_TOP, n);
  } else {
    // A framed milestone leaning on the back panel: a gold frame, his magenta in it
    icube(b, [x0 + 0.03, z - 0.06, x0 + 0.045, z + 0.06], sy, sy + 0.16, METALS[1]);
    icube(b, [x0 + 0.045, z - 0.045, x0 + 0.05, z + 0.045], sy + 0.015, sy + 0.145, PRINT_PAPER);
    icube(b, [x0 + 0.05, z - 0.025, x0 + 0.055, z + 0.025], sy + 0.05, sy + 0.11, PAL.magenta);
  }
}

/**
 * What's on the trophy wall, drawn on the main thread (south3d.ts adds it; the house's site may be built in the site
 * worker, which has no save): one small batch in the room's shared paint, built again whenever the save changes what
 * the wall shows (hometrophies.ts `SHELF`), so it costs a draw call or two and nothing between changes
 */
export function trophyWall(scene: THREE.Scene, low: boolean) {
  const group = new THREE.Group();
  group.name = 'home-trophies';
  scene.add(group);
  return SHELF.on((slots) => {
    for (const c of [...group.children]) {
      group.remove(c);
      (c as THREE.Mesh).geometry?.dispose();
    }
    const b = new Batch();
    for (const t of slots) trophy(b, t, low);
    b.build(group, { cast: false, receive: false });
  });
}
