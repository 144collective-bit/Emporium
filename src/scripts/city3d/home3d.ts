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
import { Batch, PAL, canvasTex, fx, lit, moving, neon, rng, toon } from './kit';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CROWD_VIEW } from './character';
import type { Tick } from './world';
import { site } from './tilework';
import { crown, trunk } from './palms3d';
import { SWAY } from './dusk';
import { COVER, KERB, TREE, VERGE } from './palette';
import { glow, METAL } from './infill';
import { SHELF, type TrophySlot } from './hometrophies';
import {
  BASE_CEIL, BASE_Y, BOLLARD, BOLLARDS, CEIL, CURTAIN, CABANA, CABANA_H, HELIPAD, CABANA_POSTS, CABANA_SOFA, FIRE_ESCAPE, FOUNTAIN, LOUNGERS, POOL, POOL_EDGE, GATE_LEAF, GATE_LEAF_H, GATEHOUSE, GATEHOUSE_H, PALM_PLANTER, PALMS, HOME, HOME_LAND, HOME_SLAB, PIER, PLANTER_H, PLANTERS, ROOF_THINGS, ROOF_Y, ROOM, ROOM_WINDOWS, SHELL, UP_CEIL, UP_Y, WALL, WALL_H, WALL_T,
  HOUSE_GEO, curtainPanels,
} from './home';
import { houseRooms, type BaseThing, type Furniture, type UpThing } from './homerooms';
import { curtains } from './spawn';
import type { Rect } from './endswood';

const { FURNITURE, UPSTAIRS, BASEMENT } = houseRooms(HOUSE_GEO);

const S = HOME_SLAB;
/** On the plot: what lies on its ground 24 mm over the slab (the paving is at 6 and its darker courses at 12:
 * endsfar3d.ts; nothing flush), what lies on that 6 more */
const ON = S + 0.024;
const OVER = ON + 0.006;
const COPING = toon('#a9a5ad');
const FELT = toon('#2e2b36');
const JOINT = toon('#6a6772');
const FLAGS = toon(KERB.grit);
const DOOR = toon('#4a3270');
const MAT = toon('#2a2622');
const LINTEL = toon('#8b8791');
const GATE = toon('#24222b');
const GARAGE_FLOOR = '#8a8791';
const GARAGE_CEILING = '#c9c5cc';
const GARAGE_BRICK = '#7a4337';
const BENCH = toon('#7a5a3a');
const TOOLBOX = toon('#b8322c');
const TYRE = toon('#1f1e25');
const LAWN = toon(COVER.lawn);
const TRUNK_M = toon(TREE.trunk);
const CROWN = toon(TREE.crowns[1]);
const SHUTTER = toon('#6f737c');
const DARK = toon('#16151b');
const CHAIR = toon('#3f7f88');
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
  // The wall in the loft's black brick under a stone coping (Phase 6b: taller, the kingpin's compound)
  for (const r of runs) {
    cube(b, r, S, S + WALL_H - 0.08, LOFT_BRICK);
    cube(b, [r[0] - 0.03, r[1] - 0.03, r[2] + 0.03, r[3] + 0.03], S + WALL_H - 0.08, S + WALL_H, LOFT_STONE);
  }
  for (const z of [G.z0 - PIER.w, G.z1]) {
    cube(b, [x1 - PIER.w, z, x1, z + PIER.w], S, S + PIER.h - 0.1, LOFT_BRICK);
    cube(b, [x1 - PIER.w - 0.04, z - 0.04, x1 + 0.04, z + PIER.w + 0.04], S + PIER.h - 0.1, S + PIER.h, LOFT_STONE);
  }
  // Over the gates, from pier to pier: a black steel beam and his crest on it facing down the Close, a gold ring
  // round a black disc with his D in neon (at every distance: it's what you see coming down the road)
  {
    const [za, zb] = [G.z0 - PIER.w + 0.05, G.z1 + PIER.w - 0.05];
    const bx = x1 - PIER.w / 2;
    cube(b, [bx - 0.12, za, bx + 0.12, zb], S + PIER.h, S + PIER.h + 0.22, STEEL_BLACK);
    const mz = (G.z0 + G.z1) / 2;
    const cy = S + PIER.h + 0.62;
    const disc = new THREE.CylinderGeometry(0.4, 0.4, 0.05, low ? 16 : 28).rotateZ(Math.PI / 2);
    disc.deleteAttribute('uv');
    b.add(disc.translate(bx, cy, mz), STEEL_BLACK);
    const ring = new THREE.TorusGeometry(0.4, 0.04, 6, low ? 16 : 28).rotateY(Math.PI / 2);
    ring.deleteAttribute('uv');
    b.add(ring.translate(bx, cy, mz), GOLD);
    for (const z of [mz - 0.2, mz + 0.16]) cube(b, [bx - 0.02, z, bx + 0.02, z + 0.04], S + PIER.h + 0.22, cy - 0.38, GOLD);
    mark(b, HIS_NEON, 0.4, V(bx + 0.05, cy, mz + 0.03), V(0, 0, -1), V(0, 1, 0), V(1, 0, 0), { tube: 0.018 });
    // (and on its back, read from the yard)
    mark(b, HIS_NEON, 0.4, V(bx - 0.05, cy, mz - 0.03), V(0, 0, 1), V(0, 1, 0), V(-1, 0, 0), { tube: 0.018 });
  }
  // The gate: one black steel leaf slid open along the inside of the wall north of the gates (home.ts `GATE_LEAF`),
  // on its track: a frame, a solid lower half, bars over it, his neon along the top rail
  {
    const [lx0, lz0, lx1, lz1] = GATE_LEAF;
    const H = GATE_LEAF_H;
    flat(b, [lx0 - 0.02, lz0, lx1 + 0.02, G.z0 - 0.1], OVER, JOINT);
    cube(b, [lx0, lz0, lx1, lz1], S + 0.04, S + 0.1, STEEL_BLACK);
    cube(b, [lx0, lz0, lx1, lz1], S + H - 0.06, S + H, STEEL_BLACK);
    for (const z of [lz0, lz1 - 0.06]) cube(b, [lx0, z, lx1, z + 0.06], S + 0.04, S + H, STEEL_BLACK);
    cube(b, [lx0 + 0.01, lz0 + 0.06, lx1 - 0.01, lz1 - 0.06], S + 0.1, S + 0.8, STEEL_BLACK);
    cube(b, [lx0 + 0.012, lz0 + 0.02, lx1 - 0.012, lz1 - 0.02], S + H, S + H + 0.036, HIS_NEON);
    if (!low) for (let z = lz0 + 0.2; z < lz1 - 0.1; z += 0.16) cube(b, [lx0 + 0.02, z, lx1 - 0.02, z + 0.03], S + 0.8, S + H - 0.06, STEEL_BLACK);
  }
  b.detail(() => {
    // A lamp on each pier, the black plaque with his neon D on the south one, a darker course at the wall's foot
    for (const z of [G.z0 - PIER.w / 2, G.z1 + PIER.w / 2]) b.add(new THREE.SphereGeometry(0.09, 8, 6).translate(x1 - PIER.w / 2, S + PIER.h + 0.09, z), glow(PAL.warm));
    cube(b, [x1 + 0.006, G.z1 + 0.06, x1 + 0.03, G.z1 + PIER.w - 0.06], S + 0.82, S + 1.28, STEEL_BLACK);
    mark(b, HIS_NEON, 0.3, V(x1 + 0.05, S + 1.05, G.z1 + PIER.w / 2 + 0.02), V(0, 0, -1), V(0, 1, 0), V(1, 0, 0), { tube: 0.012 });
    for (const r of runs) course(b, r, 0.14, LOFT_BRICK_DARK);
    // A camera on each pier's outer corner, turned to the lane (looks only)
    for (const z of [G.z0 - PIER.w + 0.05, G.z1 + PIER.w - 0.12]) {
      cube(b, [x1 + 0.004, z, x1 + 0.06, z + 0.07], S + PIER.h - 0.32, S + PIER.h - 0.26, STEEL_BLACK);
      cube(b, [x1 + 0.06, z - 0.02, x1 + 0.22, z + 0.09], S + PIER.h - 0.36, S + PIER.h - 0.24, PALE_CAM);
      b.add(new THREE.SphereGeometry(0.012, 5, 4).translate(x1 + 0.225, S + PIER.h - 0.3, z + 0.035), glow(PAL.red));
    }
    // Lights on the wall's outer faces (the lane's side and the bungalows'), and a small lit cap on its coping, along
    // every run (phones: every other one)
    const every = low ? 6 : 3;
    const lamp = (x: number, z: number, nx: number, nz: number) => {
      cube(b, [x - 0.05 + nx * 0.03, z - 0.05 + nz * 0.03, x + 0.05 + nx * 0.03, z + 0.05 + nz * 0.03], S + WALL_H - 0.42, S + WALL_H - 0.3, STEEL_BLACK);
      b.add(new THREE.SphereGeometry(0.03, 5, 4).translate(x + nx * 0.08, S + WALL_H - 0.38, z + nz * 0.08), glow(PAL.warm));
    };
    for (let z = z0 + 1.5; z < z1 - 1; z += every) if (z < G.z0 - PIER.w - 0.6 || z > G.z1 + PIER.w + 0.6) lamp(x1, z, 1, 0);
    for (let x = x0 + 1.5; x < x1 - 1; x += every) {
      lamp(x, z0, 0, -1);
      lamp(x, z1, 0, 1);
    }
    for (const r of runs) {
      const along = r[2] - r[0] > r[3] - r[1];
      const [a, c] = along ? [r[0], r[2]] : [r[1], r[3]];
      for (let t = a + 1.2; t < c - 0.6; t += every) {
        const [cx, cz] = along ? [t, (r[1] + r[3]) / 2] : [(r[0] + r[2]) / 2, t];
        cube(b, [cx - 0.06, cz - 0.06, cx + 0.06, cz + 0.06], S + WALL_H, S + WALL_H + 0.04, CAP);
      }
    }
    // The back gate, open against the wall inside
    cube(b, [x0 + WALL_T + 0.02, B.z1, x0 + WALL_T + 0.07, B.z1 + 0.95], S + 0.05, S + 1.6, BENCH);
  });
  gatehouse(b, low);
}

/**
 * The gatehouse inside the gates (home.ts `GATEHOUSE`, Phase 6b): black brick under a black steel roof that overhangs
 * it, his neon under the roof's edge, a wide window on the gates (lit at night: `houseLights()`), its door on the yard,
 * a lamp by it, a camera on its corner
 */
function gatehouse(b: Batch, low: boolean) {
  const [gx0, gz0, gx1, gz1] = GATEHOUSE;
  const H = GATEHOUSE_H;
  cube(b, [gx0, gz0, gx1, gz1], S, S + H, LOFT_BRICK);
  cube(b, [gx0 - 0.12, gz0 - 0.12, gx1 + 0.06, gz1 + 0.06], S + H, S + H + 0.1, STEEL_BLACK);
  cube(b, [gx0 - 0.1, gz0 - 0.144, gx1 + 0.02, gz0 - 0.12], S + H + 0.02, S + H + 0.044, HIS_NEON);
  // (the window on the gates, its glass and steel frame; the door on the west, onto the yard)
  const [wa, wb] = [gx0 + 0.2, gx1 - 0.25];
  cube(b, [wa, gz0 - 0.02, wb, gz0 - 0.004], S + 0.6, S + 1.1, LOFT_GLASS);
  for (const [a, c, y0, y1] of [[wa - 0.03, wb + 0.03, 0.57, 0.6], [wa - 0.03, wb + 0.03, 1.1, 1.13], [wa - 0.03, wa, 0.6, 1.1], [wb, wb + 0.03, 0.6, 1.1], [(wa + wb) / 2 - 0.012, (wa + wb) / 2 + 0.012, 0.6, 1.1]] as [number, number, number, number][])
    cube(b, [a, gz0 - 0.034, c, gz0 - 0.004], S + y0, S + y1, STEEL_BLACK);
  cube(b, [gx0 - 0.02, gz0 + 0.45, gx0 - 0.004, gz0 + 0.95], S, S + 1.05, STEEL_BLACK);
  b.detail(() => {
    course(b, GATEHOUSE, 0.12, LOFT_BRICK_DARK);
    b.add(new THREE.SphereGeometry(0.03, 5, 4).translate(gx0 - 0.08, S + 1.1, gz0 + 0.35), glow(PAL.warm));
    cube(b, [gx1 - 0.1, gz0 - 0.08, gx1 + 0.06, gz0 + 0.02], S + H - 0.16, S + H - 0.06, PALE_CAM);
    if (!low) cube(b, [gx0 + 0.3, gz0 + 0.3, gx0 + 0.34, gz0 + 0.34], S + H + 0.1, S + H + 0.5, STEEL_BLACK);
  });
}

/* ---------- The yard as a showpiece (docs/compound-plan.md Phase 6c): the fountain, the palms, the lit lines ---------- */

const WATER = toon('#3a8fd0');
/** The fountain's falling water: a pale blue sheet lit a little at night */
const FALL = neon('#9fe0ff', 0.75, 0.95);
const PALM_TRUNK = toon(TREE.trunk);
const PALM_FRONDS = toon(TREE.crowns[2]);

/** The fountain, the palms in their planters with their uplights, and the two lit lines along the drive's edges */
function showpiece(b: Batch, low: boolean) {
  const { x, z, r, h } = FOUNTAIN;
  const n = low ? 10 : 16;
  const ring = (rr: number, y0: number, y1: number, m: THREE.Material, r1 = rr, open = false) => {
    const g = new THREE.CylinderGeometry(rr, r1, y1 - y0, n, 1, open);
    g.deleteAttribute('uv');
    b.add(g.translate(x, (y0 + y1) / 2, z), m);
  };
  // The basin: a stone rim, the water in it a hair under the rim's top
  ring(r, S, S + h, LOFT_STONE);
  ring(r - 0.08, S + h - 0.06, S + h - 0.04, WATER);
  // The pedestal and its two bowls, the water falling from each in a sheet, a gold finial on top
  ring(0.12, S + h - 0.04, S + 1.0, LOFT_STONE, 0.16);
  ring(0.5, S + 0.62, S + 0.7, LOFT_STONE, 0.3);
  ring(0.46, S + 0.7, S + 0.705, WATER);

  ring(0.28, S + 0.98, S + 1.04, LOFT_STONE, 0.16);
  ring(0.26, S + 1.04, S + 1.045, WATER);
  // (the water falling from each bowl's rim in thin streams round it)
  const streams = (rr: number, k: number, y0: number, y1: number) => {
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2;
      const g = new THREE.BoxGeometry(0.035, y1 - y0, 0.012).rotateY(-a + Math.PI / 2);
      g.deleteAttribute('uv');
      b.add(g.translate(x + Math.cos(a) * rr, (y0 + y1) / 2, z + Math.sin(a) * rr), FALL);
    }
  };
  streams(0.5, low ? 6 : 12, S + h - 0.05, S + 0.62);
  streams(0.29, low ? 4 : 8, S + 0.7, S + 0.98);
  b.add(new THREE.SphereGeometry(0.07, 10, 8).translate(x, S + 1.12, z), GOLD);
  // Lights in the basin turned up at the water, his magenta and cyan in turn
  b.detail(() => {
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      b.add(new THREE.SphereGeometry(0.03, 5, 4).translate(x + Math.cos(a) * (r - 0.2), S + h - 0.04, z + Math.sin(a) * (r - 0.2)), glow(k % 2 ? PAL.cyan : PAL.magenta));
    }
  });
  // The palms: a round stone planter each, the trunk leaning a little, the crown, an uplight at its foot
  const palmTrunk = trunk(0.11, 0.08, 0.25, low ? 5 : 7);
  const palmCrown = crown(low ? 9 : 13, 0.8, 0.28, 0.35, 0.65, 0.05);
  const ts: THREE.Matrix4[] = [];
  const cs: THREE.Matrix4[] = [];
  PALMS.forEach(([px, pz], k) => {
    const P = PALM_PLANTER;
    const pl = new THREE.CylinderGeometry(P.r, P.r * 0.9, P.h, low ? 8 : 12);
    pl.deleteAttribute('uv');
    b.add(pl.translate(px, S + P.h / 2, pz), LOFT_STONE);
    flat(b, [px - P.r * 0.7, pz - P.r * 0.7, px + P.r * 0.7, pz + P.r * 0.7], S + P.h + 0.004, LOFT_BRICK_DARK);
    const hh = 3.2 + (k % 2) * 0.4;
    const turn = k * 1.9;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn);
    ts.push(new THREE.Matrix4().compose(new THREE.Vector3(px, S + P.h - 0.02, pz), q, new THREE.Vector3(1, hh, 1)));
    cs.push(new THREE.Matrix4().compose(new THREE.Vector3(px + Math.cos(turn) * 0.25, S + P.h + hh, pz - Math.sin(turn) * 0.25), q, new THREE.Vector3(1, 1, 1)));
    b.detail(() => b.add(new THREE.SphereGeometry(0.035, 5, 4).translate(px + P.r * 0.55, S + P.h + 0.03, pz), glow(PAL.warm)));
  });
  b.instances(palmTrunk, PALM_TRUNK, ts);
  b.instances(palmCrown, PALM_FRONDS, cs, low ? 0 : SWAY);
  // Two lit lines set in the paving along the drive's edges, from the garage's side to the gates' (clear of the palms
  // and the gatehouse), a hair over the paving
  const [gx1, px1] = [HOME.garage[2], HOME.plot[2]];
  const AX = (HOME.gates.z0 + HOME.gates.z1) / 2;
  flat(b, [gx1 + 0.6, AX - 3.3 - 0.025, px1 - WALL_T - 0.7, AX - 3.3 + 0.025], OVER + 0.006, CAP);
  flat(b, [HOME.house[0] + 0.8, AX + 3.6 - 0.025, px1 - WALL_T - 3.2, AX + 3.6 + 0.025], OVER + 0.006, CAP);
}

/* ---------- The helipad on the garage's roof (docs/compound-plan.md Phase 6e) ---------- */

const PAD = toon('#3a3840');
const PAD_PAINT = toon('#f1eee8');
const PAD_MARK = toon('#f2c94c');
const SOCK = toon('#ff7a1a');

/** The helipad (home.ts `HELIPAD`): a round deck on the garage's roof, a white ring and his D in yellow painted on it (read from the Close), lights round its edge, a windsock at the roof's corner */
function helipad(b: Batch, low: boolean) {
  const { x, z, r } = HELIPAD;
  const y = S + HOME.garageTop + 0.012;
  const n = low ? 16 : 32;
  const deck = new THREE.CylinderGeometry(r, r, 0.06, n);
  deck.deleteAttribute('uv');
  b.add(deck.translate(x, y + 0.03, z), PAD);
  const ring = new THREE.RingGeometry(r - 0.35, r - 0.22, n).rotateX(-Math.PI / 2);
  ring.deleteAttribute('uv');
  b.add(ring.translate(x, y + 0.066, z), PAD_PAINT);
  mark(b, PAD_MARK, 1.9, V(x, y + 0.066, z), V(0, 0, -1), V(-1, 0, 0), V(0, 1, 0), { t: 0.3 });
  // The edge lights, green, and a windsock on its pole at the roof's north-west corner (looks only)
  b.detail(() => {
    const k = low ? 8 : 12;
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2;
      b.add(new THREE.SphereGeometry(0.065, 6, 4).translate(x + Math.cos(a) * (r - 0.1), y + 0.12, z + Math.sin(a) * (r - 0.1)), glow('#7dff9a'));
    }
    const [px, pz] = [HOME.garage[0] + 0.25, HOME.garage[1] + 0.25];
    rod(b, V(px, y, pz), V(px, y + 0.95, pz), 0.015, STEEL_BLACK);
    const sock = new THREE.ConeGeometry(0.09, 0.45, low ? 6 : 8, 1, true).rotateZ(Math.PI / 2);
    sock.deleteAttribute('uv');
    b.add(sock.translate(px + 0.24, y + 0.9, pz), SOCK);
  });
}

/** The double garage */
function garage(b: Batch, low: boolean) {
  const [gx0, gz0, gx1, gz1] = HOME.garage;
  const { garageH: H, garageTop: TOP, carDoor: C, bikeDoor: K } = HOME;
  const W = WALL;
  cube(b, [gx0, gz0, gx1, gz0 + W], S, S + H, LOFT_BRICK);
  cube(b, [gx0, gz1 - W, gx1, gz1], S, S + H, LOFT_BRICK);
  cube(b, [gx0, gz0 + W, gx0 + W, gz1 - W], S, S + H, LOFT_BRICK);
  // (the east wall: its two ends and the pier between the doors, a lintel over each)
  cube(b, [gx1 - W, gz0 + W, gx1, C.z0], S, S + H, LOFT_BRICK);
  cube(b, [gx1 - W, C.z1, gx1, K.z0], S, S + H, LOFT_BRICK);
  cube(b, [gx1 - W, K.z1, gx1, gz1 - W], S, S + H, LOFT_BRICK);
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
    cube(b, [gx0 - 0.012, gz0 - 0.012, gx1, gz0 + 0.018], S, S + 0.12, LOFT_BRICK_DARK);
    cube(b, [gx0 - 0.012, gz1 - 0.018, gx1, gz1 + 0.012], S, S + 0.12, LOFT_BRICK_DARK);
    cube(b, [gx0 - 0.012, gz0 + 0.018, gx0 + 0.018, gz1 - 0.018], S, S + 0.12, LOFT_BRICK_DARK);
  });
}

/* ---------- The house as a black brick loft (docs/compound-plan.md Phase 6, the owner's pick: a kingpin's base) ---------- */

/**
 * Black-painted brick, a charcoal light enough to keep its detail on the side in shade (a true black read as a hole
 * there), its mortar lines a step lighter; the plinth darker
 */
const LOFT_BRICK = toon('#423e4a');
const LOFT_MORTAR = toon('#5b5664');
const LOFT_BRICK_DARK = toon('#26232c');
/** The soldier courses, the lintels and sills, the coping: a pale stone against the black */
const LOFT_STONE = toon('#8a8592');
/** Factory glass by day (slate blue: his windows read as glass, not boards); at night lit from inside: `houseLights()` */
const LOFT_GLASS = toon('#4f6178');
const GOLD = toon('#c9a23a');
/** The cameras' bodies (looks only) */
const PALE_CAM = toon('#d9d6de');

/** The house's front bays: its piers' middles along x (the corners, either side of the door's bay) */
const BAY = 3.05;
/**
 * The house's factory windows, each a pane of glass in its steel grid: along the front (`n`: x from a0 to a1, over the
 * slab from y0 to y1) and up the east side over the fire escape (`e`: z from a0 to a1); `houseLights()` lights them
 */
export function houseWindows(): { face: 'n' | 'e'; a0: number; a1: number; y0: number; y1: number }[] {
  const [x0, z0, x1] = HOME.house;
  const dx = HOME.door[0];
  return [
    // (ground floor: the two big bays, and a narrow light either side of the door)
    { face: 'n', a0: x0 + 0.45, a1: x0 + BAY - 0.3, y0: 0.3, y1: 1.12 },
    { face: 'n', a0: x1 - BAY + 0.3, a1: x1 - 0.45, y0: 0.3, y1: 1.12 },
    { face: 'n', a0: x0 + BAY + 0.3, a1: dx - 0.5, y0: 0.3, y1: 1.12 },
    { face: 'n', a0: dx + 0.5, a1: x1 - BAY - 0.3, y0: 0.3, y1: 1.12 },
    // (upstairs: three tall ones, a bay each)
    { face: 'n', a0: x0 + 0.45, a1: x0 + BAY - 0.3, y0: 1.45, y1: 2.3 },
    { face: 'n', a0: x0 + BAY + 0.3, a1: x1 - BAY - 0.3, y0: 1.45, y1: 2.3 },
    { face: 'n', a0: x1 - BAY + 0.3, a1: x1 - 0.45, y0: 1.45, y1: 2.3 },
    // (the east side, over the fire escape's landing)
    { face: 'e', a0: z0 + 0.9, a1: z0 + 3.0, y0: 1.45, y1: 2.3 },
  ];
}

/**
 * The house's windows lit at night (Phase 6): a warm pane over each window's glass, behind its steel grid, its light
 * added to what's under it, so by day (none added) the slate glass shows and at night the windows glow warm, under the
 * bloom's threshold. Drawn on the main thread (south3d.ts adds it, as the yard's pools): one mesh in the FX layer
 */
export function houseLights(scene: THREE.Scene) {
  const [, z0, x1] = HOME.house;
  const parts = houseWindows().map((w) => {
    const g = new THREE.PlaneGeometry(w.a1 - w.a0, w.y1 - w.y0);
    g.deleteAttribute('uv');
    const [mid, my] = [(w.a0 + w.a1) / 2, S + (w.y0 + w.y1) / 2];
    return w.face === 'n' ? g.rotateY(Math.PI).translate(mid, my, z0 - 0.024) : g.rotateY(Math.PI / 2).translate(x1 + 0.024, my, mid);
  });
  // (and the gatehouse's window on the gates, Phase 6b)
  const [gx0, gz0, gx1] = GATEHOUSE;
  parts.push(new THREE.PlaneGeometry(gx1 - 0.25 - (gx0 + 0.2), 0.5).rotateY(Math.PI).translate((gx0 + 0.2 + gx1 - 0.25) / 2, S + 0.85, gz0 - 0.024));
  parts[parts.length - 1].deleteAttribute('uv');
  const mat = lit(new THREE.MeshBasicMaterial({ color: '#ffcf8a', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), 0, 0.6);
  const mesh = new THREE.Mesh(mergeGeometries(parts, false)!, mat);
  mesh.name = 'home-window-light';
  mesh.castShadow = mesh.receiveShadow = false;
  scene.add(fx(mesh));
}

/** The house's outside: its shell, the roof and its terrace, the doors and windows */
function house(b: Batch, low: boolean) {
  const [x0, z0, x1, z1] = HOME.house;
  const { eaves: E, ridge: R } = HOME;
  const T = SHELL;
  // The shell in black brick; the upper floor's slab and the roof's
  cube(b, [x0, z0, x1, z0 + T], S, S + E, LOFT_BRICK);
  cube(b, [x0, z1 - T, x1, z1], S, S + E, LOFT_BRICK);
  cube(b, [x0, z0 + T, x0 + T, z1 - T], S, S + E, LOFT_BRICK);
  cube(b, [x1 - T, z0 + T, x1, z1 - T], S, S + E, LOFT_BRICK);
  cube(b, [x0 + T, z0 + T, x1 - T, z1 - T], S + CEIL + 0.004, S + CEIL + 0.1, COPING);
  cube(b, [x0, z0, x1, z1], S + E, S + E + 0.06, FELT);
  // The parapet round the roof under a stone coping; over the door's bay on the front it steps up
  const dx = HOME.door[0];
  for (const r of [
    [x0, z0, x1, z0 + T],
    [x0, z1 - T, x1, z1],
    [x0, z0 + T, x0 + T, z1 - T],
    [x1 - T, z0 + T, x1, z1 - T],
  ] as Rect[]) {
    cube(b, r, S + E + 0.06, S + R - 0.05, LOFT_BRICK);
    cube(b, [r[0] - 0.03, r[1] - 0.03, r[2] + 0.03, r[3] + 0.03], S + R - 0.05, S + R, LOFT_STONE);
  }
  cube(b, [x0 + BAY, z0, x1 - BAY, z0 + T], S + R, S + R + 0.24, LOFT_BRICK);
  cube(b, [x0 + BAY - 0.03, z0 - 0.03, x1 - BAY + 0.03, z0 + T + 0.03], S + R + 0.24, S + R + 0.29, LOFT_STONE);
  // Piers a hair proud of the front, full height: the corners and either side of the door's bay
  const P = 0.045;
  for (const [a, w] of [[x0, 0.24], [x1 - 0.24, 0.24], [x0 + BAY - 0.12, 0.24], [x1 - BAY - 0.12, 0.24]] as [number, number][]) cube(b, [a, z0 - P, a + w, z0], S, S + R - 0.05, LOFT_BRICK);
  // The soldier course between the floors, and his neon along the top under the coping (front and the Close's side)
  cube(b, [x0 + 0.24, z0 - 0.02, x1 - 0.24, z0], S + CEIL + 0.02, S + CEIL + 0.13, LOFT_STONE);
  cube(b, [x0 + 0.1, z0 - 0.08, x1 - 0.1, z0 - 0.044], S + R - 0.12, S + R - 0.084, HIS_NEON);
  cube(b, [x1 + 0.044, z0 + 0.1, x1 + 0.08, z1 - 0.1], S + R - 0.12, S + R - 0.084, HIS_NEON);
  // The door: a tall black pivot door with a gold bar, under a deep steel canopy (his neon on its lip, a downlight)
  const F = z0 - 0.02;
  cube(b, [dx - 0.36, F, dx + 0.36, z0 - 0.004], S, S + 1.16, STEEL_BLACK);
  cube(b, [dx + 0.2, F - 0.02, dx + 0.24, F], S + 0.3, S + 0.95, GOLD);
  cube(b, [dx - 0.8, z0 - 0.85, dx + 0.8, z0], S + 1.22, S + 1.32, STEEL_BLACK);
  cube(b, [dx - 0.78, z0 - 0.874, dx + 0.78, z0 - 0.85], S + 1.25, S + 1.274, HIS_NEON);
  b.add(new THREE.SphereGeometry(0.035, 6, 4).translate(dx, S + 1.21, z0 - 0.45), glow(PAL.warm));
  // The factory windows: slate glass in a black steel grid, a stone lintel over each and a sill under it
  for (const w of houseWindows()) {
    const n = w.face === 'n';
    const box = (a: number, c: number, out0: number, out1: number, y0: number, y1: number, m: THREE.Material) =>
      n ? cube(b, [a, z0 - out1, c, z0 - out0], y0, y1, m) : cube(b, [x1 + out0, a, x1 + out1, c], y0, y1, m);
    box(w.a0, w.a1, 0.004, 0.02, S + w.y0, S + w.y1, LOFT_GLASS);
    box(w.a0 - 0.06, w.a1 + 0.06, 0.004, 0.05, S + w.y1, S + w.y1 + 0.07, LOFT_STONE);
    box(w.a0 - 0.04, w.a1 + 0.04, 0.004, 0.06, S + w.y0 - 0.05, S + w.y0, LOFT_STONE);
    // (the grid: its frame, mullions about 0.45 apart, two transoms; phones: the frame and one transom)
    const fr = (a: number, c: number, y0: number, y1: number) => box(a, c, 0.004, 0.034, y0, y1, STEEL_BLACK);
    fr(w.a0 - 0.03, w.a1 + 0.03, S + w.y0, S + w.y0 + 0.03);
    fr(w.a0 - 0.03, w.a1 + 0.03, S + w.y1 - 0.03, S + w.y1);
    fr(w.a0 - 0.03, w.a0, S + w.y0, S + w.y1);
    fr(w.a1, w.a1 + 0.03, S + w.y0, S + w.y1);
    const span = w.a1 - w.a0;
    const cols = low ? 1 : Math.max(1, Math.round(span / 0.45));
    for (let k = 1; k < cols; k++) {
      const a = w.a0 + (span * k) / cols;
      fr(a - 0.012, a + 0.012, S + w.y0, S + w.y1);
    }
    const rows = low ? 2 : 3;
    for (let k = 1; k < rows; k++) {
      const y = S + w.y0 + ((w.y1 - w.y0) * k) / rows;
      fr(w.a0, w.a1, y - 0.012, y + 0.012);
    }
  }
  // The side door onto the lawn
  const sz = HOME.sideDoor[1];
  cube(b, [x1 + 0.004, sz - 0.3, x1 + 0.02, sz + 0.3], S, S + 1.08, STEEL_BLACK);
  // The fire escape up the east side, facing the gates (home.ts `FIRE_ESCAPE`): a landing at the upper floor on
  // brackets, a flight down to the ground under it, a ladder on up to the parapet; black steel
  {
    const [fx0, fz0, fx1, fz1] = FIRE_ESCAPE;
    const fy = S + UP_Y;
    cube(b, [fx0 + 0.004, fz0, fx1, fz1], fy - 0.04, fy, STEEL_BLACK);
    for (const z of [fz0 + 0.1, fz1 - 0.14]) cube(b, [fx0 + 0.004, z, fx1, z + 0.04], fy - 0.3, fy - 0.04, STEEL_BLACK);
    // (its rail along the outside and the ends)
    cube(b, [fx1 - 0.03, fz0, fx1, fz1], fy + 0.42, fy + 0.45, STEEL_BLACK);
    for (let z = fz0; z <= fz1 - 0.02; z += (fz1 - fz0) / 6) cube(b, [fx1 - 0.03, z, fx1, z + 0.025], fy, fy + 0.42, STEEL_BLACK);
    for (const z of [fz0, fz1 - 0.03]) cube(b, [fx0 + 0.004, z, fx1, z + 0.03], fy + 0.42, fy + 0.45, STEEL_BLACK);
    // (the flight: from the landing's south end down to the ground at its north end, treads and two stringers)
    const n = low ? 6 : 10;
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const z = fz1 - 0.15 - t * (fz1 - fz0 - 0.4);
      const yy = fy - t * (fy - S);
      cube(b, [fx0 + 0.04, z - 0.05, fx1 - 0.04, z + 0.05], yy - 0.02, yy, STEEL_BLACK);
    }
    for (const x of [fx0 + 0.03, fx1 - 0.03]) rod(b, V(x, fy - 0.02, fz1 - 0.15), V(x, S + 0.02, fz0 + 0.25), 0.015, STEEL_BLACK);
    // (the ladder up to the parapet)
    for (const z of [fz0 + 0.15, fz0 + 0.45]) cube(b, [fx1 - 0.06, z, fx1 - 0.03, z + 0.03], fy, S + R + 0.3, STEEL_BLACK);
    if (!low) for (let yy = fy + 0.12; yy < S + R + 0.25; yy += 0.12) cube(b, [fx1 - 0.06, fz0 + 0.15, fx1 - 0.03, fz0 + 0.48], yy, yy + 0.015, STEEL_BLACK);
  }
  b.detail(() => {
    course(b, HOME.house, 0.14, LOFT_BRICK_DARK);
    // The brick's mortar courses on the front and the Close's side (near only; phones: every other one), a hair proud
    const step = low ? 0.3 : 0.15;
    for (let y = S + 0.2; y < S + E; y += step) {
      cube(b, [x0 + 0.24, z0 - 0.008, x1 - 0.24, z0 - 0.002], y, y + 0.01, LOFT_MORTAR);
      cube(b, [x1 + 0.002, z0 + 0.05, x1 + 0.008, z1 - 0.05], y, y + 0.01, LOFT_MORTAR);
    }
    // A mat at the front door, the canopy's two brackets, a wall light either side of the door
    flat(b, [dx - 0.3, z0 - 0.52, dx + 0.3, z0 - 0.16], OVER + 0.004, MAT);
    for (const x of [dx - 0.72, dx + 0.66]) cube(b, [x, z0 - 0.6, x + 0.06, z0 - 0.004], S + 1.12, S + 1.22, STEEL_BLACK);
    for (const x of [dx - 0.43, dx + 0.43]) {
      cube(b, [x - 0.03, z0 - 0.06, x + 0.03, z0 - 0.004], S + 0.9, S + 1.02, STEEL_BLACK);
      b.add(new THREE.SphereGeometry(0.03, 6, 4).translate(x, S + 0.96, z0 - 0.08), glow(PAL.warm));
    }
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
    // What stands on the terrace (home.ts `ROOF_THINGS`): the stairs' hatch with its lid up, the outdoor sofa and the
    // low table before it at the front rail, the telescope, the planters (his sign is drawn at every distance, below)
    const y = S + ROOF_Y;
    for (const t of ROOF_THINGS) {
      const [a0, c0, a1, c1] = t.rect;
      if (t.kind === 'sign') continue;
      if (t.kind === 'hatch') {
        // (a kerb round the opening, the dark of the stairs in it, the lid stood open on its east side)
        const K = 0.08;
        cube(b, [a0, c0, a1, c0 + K], y, y + 0.18, COPING);
        cube(b, [a0, c1 - K, a1, c1], y, y + 0.18, COPING);
        cube(b, [a0, c0 + K, a0 + K, c1 - K], y, y + 0.18, COPING);
        cube(b, [a1 - K, c0 + K, a1, c1 - K], y, y + 0.18, COPING);
        flat(b, [a0 + K, c0 + K, a1 - K, c1 - K], y + 0.02, DARK);
        cube(b, [a1 - 0.05, c0, a1, c1], y + 0.18, y + t.h + 0.5, GATE);
      } else if (t.kind === 'sofa') {
        // An outdoor sofa facing the front rail: its seat, its back on the south, arms, two cushions in his magenta
        cube(b, [a0, c0, a1, c1 - 0.12], y, y + 0.2, CHAIR);
        cube(b, [a0, c1 - 0.12, a1, c1], y, y + t.h, CHAIR);
        for (const x of [a0, a1 - 0.1]) cube(b, [x, c0, x + 0.1, c1], y + 0.2, y + 0.28, CHAIR);
        if (!low) for (const x of [a0 + 0.3, a1 - 0.6]) cube(b, [x, c1 - 0.2, x + 0.3, c1 - 0.12], y + 0.2, y + 0.36, toon(PAL.magenta));
      } else if (t.kind === 'telescope') {
        // A telescope on its tripod, turned to the Emporium downtown (north-east, over the city; looks only)
        const [mx, mz] = [(a0 + a1) / 2, (c0 + c1) / 2];
        const head = V(mx, y + t.h - 0.08, mz);
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2;
          rod(b, head, V(mx + Math.cos(a) * 0.16, y + 0.004, mz + Math.sin(a) * 0.16), 0.008, GATE);
        }
        const aim = V(30 - mx, 0, 38 - mz).normalize();
        aim.y = 0.25;
        aim.normalize();
        rod(b, head.clone().addScaledVector(aim, -0.12), head.clone().addScaledVector(aim, 0.26), 0.028, METAL);
        rod(b, head.clone().addScaledVector(aim, 0.24), head.clone().addScaledVector(aim, 0.28), 0.034, GATE);
      } else if (t.kind === 'table') cube(b, [a0, c0, a1, c1], y + t.h - 0.04, y + t.h, BENCH);
      else {
        cube(b, [a0, c0, a1, c1], y, y + t.h, BENCH);
        cube(b, [a0 + 0.05, c0 + 0.05, a1 - 0.05, c1 - 0.05], y + t.h, y + t.h + 0.16, CROWN);
      }
    }
  });
  // His sign on the roof at the east rail, facing down the Close (Phase 5; Phase 6 made it the loft's big sign): a
  // black panel on two steel legs over the rail, a neon border round it and his D in neon on it; at every distance
  const sign = ROOF_THINGS.find((t) => t.kind === 'sign')!;
  {
    const [, c0, a1, c1] = sign.rect;
    const y = S + ROOF_Y;
    const px = a1 - 0.08;
    const mz = (c0 + c1) / 2;
    const [bot, top] = [y + 0.5, y + 1.4];
    for (const z of [mz - 0.5, mz + 0.46]) cube(b, [px - 0.025, z, px + 0.025, z + 0.04], y, top, STEEL_BLACK);
    cube(b, [px - 0.015, mz - 0.55, px + 0.015, mz + 0.55], bot, top, STEEL_BLACK);
    const nx = px + 0.022;
    cube(b, [nx, mz - 0.52, nx + 0.018, mz + 0.52], top - 0.05, top - 0.032, HIS_NEON);
    cube(b, [nx, mz - 0.52, nx + 0.018, mz + 0.52], bot + 0.032, bot + 0.05, HIS_NEON);
    for (const z of [mz - 0.52, mz + 0.502]) cube(b, [nx, z, nx + 0.018, z + 0.018], bot + 0.032, top - 0.032, HIS_NEON);
    mark(b, HIS_NEON, 0.62, V(nx + 0.03, (bot + top) / 2, mz + 0.04), V(0, 0, -1), V(0, 1, 0), V(1, 0, 0), { tube: 0.02 });
  }
  // A steel frame over the terrace (Phase 6): a post in each corner inside the rail, beams round the top and across
  {
    const [tx0, tz0, tx1, tz1] = [x0 + T + 0.08, z0 + T + 0.08, x1 - T - 0.08, z1 - T - 0.08];
    const [y0, y1] = [S + R - 0.05, S + R + 1.05];
    for (const [px, pz] of [[tx0, tz0], [tx1 - 0.06, tz0], [tx0, tz1 - 0.06], [tx1 - 0.06, tz1 - 0.06]]) cube(b, [px, pz, px + 0.06, pz + 0.06], y0, y1, STEEL_BLACK);
    cube(b, [tx0, tz0, tx1, tz0 + 0.06], y1 - 0.06, y1, STEEL_BLACK);
    cube(b, [tx0, tz1 - 0.06, tx1, tz1], y1 - 0.06, y1, STEEL_BLACK);
    for (let x = tx0; x <= tx1 - 0.05; x += (tx1 - tx0 - 0.05) / (low ? 3 : 7)) cube(b, [x, tz0, x + 0.05, tz1], y1 - 0.05, y1 - 0.01, STEEL_BLACK);
  }
}

/** The workshop against the north wall, its roller door half up */
function workshop(b: Batch, low: boolean) {
  const [x0, z0, x1, z1] = HOME.workshop;
  const { workshopH: H, workshopDoor: D } = HOME;
  const W = WALL;
  cube(b, [x0, z0, x1, z0 + W], S, S + H, LOFT_BRICK);
  cube(b, [x0, z0 + W, x0 + W, z1], S, S + H, LOFT_BRICK);
  cube(b, [x1 - W, z0 + W, x1, z1], S, S + H, LOFT_BRICK);
  cube(b, [x0 + W, z1 - W, D.x0, z1], S, S + H, LOFT_BRICK);
  cube(b, [D.x1, z1 - W, x1 - W, z1], S, S + H, LOFT_BRICK);
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
    course(b, HOME.workshop, 0.12, LOFT_BRICK_DARK);
    flat(b, [D.x0 + 0.1, z1 + 0.1, D.x1 - 0.1, z1 + 0.34], OVER, JOINT);
    // The door's frame in black steel, and a plain lightbox over it (no sign on it)
    for (const x of [D.x0 - 0.06, D.x1]) cube(b, [x, z1 + 0.004, x + 0.06, z1 + 0.04], S, S + D.h + 0.06, STEEL_BLACK);
    cube(b, [D.x0 - 0.06, z1 + 0.004, D.x1 + 0.06, z1 + 0.04], S + D.h, S + D.h + 0.06, STEEL_BLACK);
    cube(b, [D.x0 + 0.4, z1 + 0.004, D.x1 - 0.4, z1 + 0.05], S + D.h + 0.09, S + D.h + 0.22, CAP);
  });
}

/** The lawns and what's on them, and the path from the front door */
function gardens(b: Batch, low: boolean) {
  const [nw] = HOME.lawns;
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
    // A bench under it, facing the yard (the east lawn's washing line made way for the pool, Phase 6d)
    cube(b, [tx + 1.6, tz - 0.7, tx + 2.0, tz + 0.7], S + 0.22, S + 0.27, BENCH);
    cube(b, [tx + 1.6, tz - 0.7, tx + 1.65, tz + 0.7], S + 0.27, S + 0.5, BENCH);
    for (const z of [tz - 0.6, tz + 0.55]) cube(b, [tx + 1.62, z, tx + 1.98, z + 0.05], S, S + 0.22, METAL);
  });
}

/* ---------- The pool and the cabana on the east lawn (docs/compound-plan.md Phase 6d) ---------- */

/** The pool's water lit from under it: its own colour by day, glowing softly at night (under the bloom's threshold) */
const POOL_WATER = neon('#2bb8d8', 0.95, 0.75);
const POOL_DEEP = neon('#1f8fb8', 0.95, 0.7);
const LINEN = toon('#ecebe6');
const DRAPE = toon('#f3efe6');

/** The pool (its stone edge, the water, lights under it), the loungers and an umbrella, the cabana */
function poolside(b: Batch, low: boolean) {
  const [x0, z0, x1, z1] = POOL;
  const E = POOL_EDGE;
  // The edge: stone, a hair proud of the lawn; the water inside it a little lower, darker at its deep end
  for (const r of [[x0, z0, x1, z0 + E], [x0, z1 - E, x1, z1], [x0, z0 + E, x0 + E, z1 - E], [x1 - E, z0 + E, x1, z1 - E]] as Rect[]) cube(b, r, S, S + 0.06, LOFT_STONE);
  flat(b, [x0 + E, z0 + E, x1 - E, z1 - E], S + 0.03, POOL_WATER);
  flat(b, [x1 - E - 1.6, z0 + E, x1 - E, z1 - E], S + 0.034, POOL_DEEP);
  // (a lane line down it, and lights along its sides under the water, cyan)
  flat(b, [x0 + E + 0.3, (z0 + z1) / 2 - 0.02, x1 - E - 0.3, (z0 + z1) / 2 + 0.02], S + 0.038, POOL_DEEP);
  b.detail(() => {
    for (let x = x0 + 0.8; x < x1 - 0.5; x += 1.4)
      for (const z of [z0 + E + 0.02, z1 - E - 0.02]) b.add(new THREE.SphereGeometry(0.03, 5, 4).translate(x, S + 0.035, z), glow(PAL.cyan));
  });
  // The loungers: a white frame, a cushion, the back raised at the pool's side
  for (const [a0, c0, a1, c1] of LOUNGERS) {
    cube(b, [a0, c0, a1, c1], S + 0.12, S + 0.18, LINEN);
    cube(b, [a0 + 0.03, c0 + 0.03, a1 - 0.03, c1 - 0.25], S + 0.18, S + 0.22, toon(PAL.magenta));
    cube(b, [a0 + 0.03, c1 - 0.25, a1 - 0.03, c1 - 0.03], S + 0.18, S + 0.42, LINEN);
    if (!low) for (const [x, z] of [[a0 + 0.02, c0 + 0.02], [a1 - 0.06, c0 + 0.02], [a0 + 0.02, c1 - 0.06], [a1 - 0.06, c1 - 0.06]]) cube(b, [x, z, x + 0.04, z + 0.04], S, S + 0.12, STEEL_BLACK);
  }
  // An umbrella between the first two loungers, his magenta
  const [ux, uz] = [(LOUNGERS[0][2] + LOUNGERS[1][0]) / 2, (LOUNGERS[0][1] + LOUNGERS[0][3]) / 2];
  rod(b, V(ux, S, uz), V(ux, S + 1.25, uz), 0.02, STEEL_BLACK);
  const um = new THREE.ConeGeometry(0.75, 0.3, low ? 6 : 8);
  um.deleteAttribute('uv');
  b.add(um.translate(ux, S + 1.3, uz), toon(PAL.magenta));
  // The cabana: black steel posts and a flat roof with a fascia, its back in the loft's brick, his neon along the
  // roof's front edge, white drapes tied back at the front posts, a sofa under it, a string of lights
  const [cx0, cz0, cx1, cz1] = CABANA;
  const H = CABANA_H;
  for (const [px, pz] of CABANA_POSTS) cube(b, [px - 0.05, pz - 0.05, px + 0.05, pz + 0.05], S, S + H, STEEL_BLACK);
  cube(b, [cx0 - 0.1, cz0 - 0.1, cx1 + 0.1, cz1 + 0.1], S + H, S + H + 0.12, STEEL_BLACK);
  cube(b, [cx0 - 0.08, cz0 - 0.124, cx1 + 0.08, cz0 - 0.1], S + H + 0.03, S + H + 0.054, HIS_NEON);
  cube(b, [cx0 + 0.12, cz1 - 0.1, cx1 - 0.12, cz1 - 0.02], S, S + 1.0, LOFT_BRICK);
  const [sx0, sz0, sx1, sz1] = CABANA_SOFA;
  cube(b, [sx0, sz0, sx1, sz1 - 0.18], S, S + 0.22, CHAIR);
  cube(b, [sx0, sz1 - 0.18, sx1, sz1], S, S + 0.42, CHAIR);
  for (const x of [sx0, sx1 - 0.12]) cube(b, [x, sz0, x + 0.12, sz1], S + 0.22, S + 0.3, CHAIR);
  b.detail(() => {
    for (const x of [sx0 + 0.3, sx1 - 0.7]) cube(b, [x, sz1 - 0.28, x + 0.36, sz1 - 0.18], S + 0.22, S + 0.4, toon(PAL.magenta));
    for (const [px, pz] of CABANA_POSTS.slice(0, 2)) {
      const g = new THREE.CylinderGeometry(0.1, 0.16, H - 0.15, low ? 5 : 7);
      g.deleteAttribute('uv');
      b.add(g.translate(px, S + (H - 0.15) / 2 + 0.08, pz + 0.12), DRAPE);
    }
    if (!low) for (let k = 0; k <= 8; k++) b.add(new THREE.SphereGeometry(0.03, 5, 4).translate(cx0 + 0.2 + ((cx1 - cx0 - 0.4) * k) / 8, S + H - 0.12 - Math.sin((k / 8) * Math.PI) * 0.15, cz0 + 0.1), glow(PAL.warm));
  });
}

/** The curtains' cloth: a deep red, lit from inside as the room is (docs/spawn-plan.md Phase 2) */
const CURTAIN_RED = '#8e2333';
/** How long they take to draw back (s) */
const DRAW_BACK = 1.4;

/**
 * The room's curtains (home.ts `CURTAIN`, `curtainPanels()`; docs/spawn-plan.md Phase 2): a pair a window in one instanced
 * mesh on the main thread, drawn while he wakes and the street outside loads, drawn back once it's ready
 * (spawn.ts `curtains`); under reduced motion they're simply open or shut
 */
export function addCurtains(scene: THREE.Scene, tick: (f: Tick) => void) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const g = new THREE.BoxGeometry(1, CURTAIN.y1 - CURTAIN.y0, 1);
  g.deleteAttribute('uv');
  const mesh = moving(new THREE.InstancedMesh(g, neon(new THREE.Color(CURTAIN_RED).multiplyScalar(SIDE_Z), DAY, NIGHT), ROOM_WINDOWS.length * 2));
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = mesh.receiveShadow = false;
  mesh.name = 'home-curtains';
  const m4 = new THREE.Matrix4();
  const y = S + (CURTAIN.y0 + CURTAIN.y1) / 2;
  let k = curtains.open ? 1 : 0;
  const place = () => {
    curtainPanels(k).forEach(([x0, z0, x1, z1], i) => mesh.setMatrixAt(i, m4.makeScale(x1 - x0, 1, z1 - z0).setPosition((x0 + x1) / 2, y, (z0 + z1) / 2)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  };
  place();
  scene.add(mesh);
  tick(({ dt }) => {
    const want = curtains.open ? 1 : 0;
    if (k === want) return;
    k = reduced ? want : want > k ? Math.min(want, k + dt / DRAW_BACK) : Math.max(want, k - dt / DRAW_BACK);
    place();
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
    showpiece(b, low);
    poolside(b, low);
    helipad(b, low);
    b.build(into, { cast: true, receive: true });
    inside(into, low);
  });
}

/**
 * The house's palette (docs/interior-plan.md, the owner's pick: dark luxe): warm charcoal walls and a deep green on
 * the feature walls, walnut boards and joinery, black marble, brushed brass, emerald velvet and cognac leather; his
 * magenta only as an accent
 */
const WALLS_IN = '#5a5560';
const FEATURE = '#2f5546';
const SKIRT = '#2a2830';
const LAMINATE = '#76503a';
const BOARD_LINE = '#5a3a28';
const CEILING_IN = '#625d68';
const WINDOW = '#bfe3f2';
const FRAME = '#1d1c22';
const SOFA = '#1f6b52';
const CUSHION = '#b0307a';
const RUG = '#2f7f88';
const RUG_EDGE = '#7a7068';
const RUG_FIELD = '#a39a8f';
const WOOD = '#7a5236';
const WOOD_DARK = '#4a2f1d';
const MARBLE = '#24232a';
const VEIN = '#cfc9bf';
const BRASS = '#c9a24a';
const COGNAC = '#a0602f';
const CREAM = '#e9e1d2';
/** The fire's flame along the media wall: small and bright, a line, not a lit panel */
const FLAME = neon('#ffa24a', 1.1, 1.35);
const SCREEN = '#15141c';
const UNIT = '#4a5a6a';
const FRIDGE = '#dcdce0';

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
  // (the walnut's boards: fine darker lines along the room, a hair over the floor)
  b.detail(() => {
    if (!low) for (let z = z0 + 0.3; z < z1 - 0.1; z += 0.3) iflat(b, [x0, z - 0.006, x1, z + 0.006], ON + 0.003, BOARD_LINE);
  });
  // The front door (his own colour) in the north wall and the side door in the east one, a hair off the walls
  const dx = HOME.door[0];
  const sz = HOME.sideDoor[1];
  icube(b, [dx - 0.3, z0 + 0.006, dx + 0.3, z0 + 0.04], S, S + 1.08, INK);
  icube(b, [dx + 0.18, z0 + 0.04, dx + 0.21, z0 + 0.07], S + 0.3, S + 0.8, BRASS);
  icube(b, [x1 - 0.04, sz - 0.28, x1 - 0.006, sz + 0.28], S, S + 1.05, WOOD_DARK);
  // The room's windows (home.ts `ROOM_WINDOWS`): over the sofa and east of the front door in the front wall, over the
  // counter in the back; their sills over the sofa's back, for the curtains that hang in front of them
  for (const [z, s, wa, wb, y0, y1] of ROOM_WINDOWS.map((w) => [w.into > 0 ? z0 : z1, w.into, w.x0, w.x1, 0.6, 1.02]) as [number, number, number, number, number, number][]) {
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
    for (const [lx, lz] of [[x0 + 1.65, z0 + 2.15], [dx + 1.2, cz]]) b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 12).translate(lx, top - 0.016, lz), glow(PAL.warm));
    // (the rug under the coffee table, a border round its field, from the media wall's foot to the sofa's front)
    const t = FURNITURE.find((f) => f.kind === 'table')!.rect;
    const so = FURNITURE.find((f) => f.kind === 'sofa')!.rect;
    iflat(b, [t[0] - 0.55, t[1] - 0.75, so[0] - 0.02, t[3] + 0.55], OVER, RUG_EDGE);
    iflat(b, [t[0] - 0.47, t[1] - 0.67, so[0] - 0.1, t[3] + 0.47], OVER + 0.004, RUG_FIELD);
    // (skirting round the walls, dark)
    for (const [r, a] of [[[x0, z0, x0 + 0.02, z1], 0], [[x1 - 0.02, z0, x1, z1], 0], [[x0, z1 - 0.02, x1, z1], 0]] as [Rect, number][]) icube(b, r, S, S + 0.07 + a, SKIRT);
    // Two prints of his own (made-up: blocks of his colours on paper, black frames): on the back wall in the hall, on
    // the east wall past the side door
    print(b, [dx + 1.4, z1 - 0.03, dx + 2.3, z1 - 0.006], 0.45, 0.95, 'z');
    print(b, [x1 - 0.03, sz + 0.55, x1 - 0.006, sz + 1.2], 0.45, 0.9, 'x');
  });
  // Upstairs and below (Phases 3 and 4), in the same batch: the house's insides cost the room's draw calls only
  upstairs(b, low);
  basement(b, low);
  // (the way down to the basement under the open stairs' high end: dark, a hair over the floor)
  const st = FURNITURE.find((f) => f.kind === 'stairs')!.rect;
  iflat(b, [st[0] + 0.05, st[1] + 0.05, st[2] - 0.05, st[1] + 0.9], OVER + 0.004, SHELF_BACK);
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
    // The corner sofa's long run, in emerald velvet, facing west at the media wall: its back along the hall's side, an
    // arm at its north end (the chaise turns its south end), on a dark plinth; cushions in cognac and cream
    const B = 0.2;
    icube(b, [x0, z0, x1, z1], y, S + 0.06, INK);
    icube(b, [x0, z0, x1 - B, z1], S + 0.06, S + 0.22, SOFA);
    icube(b, [x1 - B, z0, x1, z1], S + 0.06, S + h, SOFA);
    icube(b, [x0, z0, x1 - B, z0 + 0.13], S + 0.06, S + 0.32, SOFA);
    b.detail(() => {
      // (the seat's cushions split in three, fine dark lines between them)
      for (let k = 1; k < 3; k++) {
        const z = z0 + 0.13 + ((z1 - z0 - 0.13) * k) / 3;
        icube(b, [x0 + 0.02, z - 0.004, x1 - B, z + 0.004], S + 0.22, S + 0.223, INK);
      }
      for (const [z, hex] of [[z0 + 0.35, COGNAC], [z0 + 0.72, CREAM], [z1 - 0.55, COGNAC]] as [number, string][])
        icube(b, [x1 - B - 0.1, z - 0.16, x1 - B, z + 0.16], S + 0.22, S + 0.4, hex);
    });
  } else if (kind === 'chaise') {
    // The chaise at the run's south end, reaching toward the media wall: its back along the south side, an arm at its
    // west end, a cream throw over it
    const B = 0.2;
    icube(b, [x0, z0, x1, z1], y, S + 0.06, INK);
    icube(b, [x0, z0, x1, z1 - B], S + 0.06, S + 0.22, SOFA);
    icube(b, [x0, z1 - B, x1, z1], S + 0.06, S + h, SOFA);
    icube(b, [x0, z0, x0 + 0.13, z1 - B], S + 0.06, S + 0.32, SOFA);
    b.detail(() => icube(b, [x0 + 0.25, z0 + 0.02, x0 + 0.55, z1 - B], S + 0.22, S + 0.232, CREAM));
  } else if (kind === 'armchair') {
    // A cognac leather armchair under the front window, turned to the room: its back to the window, arms, brass feet
    icube(b, [x0 + 0.08, z0 + 0.16, x1 - 0.08, z1], S + 0.07, S + 0.24, COGNAC);
    icube(b, [x0, z0, x1, z0 + 0.16], S + 0.07, S + h, COGNAC);
    for (const xa of [x0, x1 - 0.08]) icube(b, [xa, z0, xa + 0.08, z1], S + 0.07, S + 0.33, COGNAC);
    for (const [fx, fz] of [[x0 + 0.04, z0 + 0.04], [x1 - 0.04, z0 + 0.04], [x0 + 0.04, z1 - 0.04], [x1 - 0.04, z1 - 0.04]]) drum(b, fx, fz, 0.018, 0.012, S + 0.006, S + 0.07, BRASS, 5);
    b.detail(() => icube(b, [x0 + 0.2, z0 + 0.16, x1 - 0.2, z0 + 0.25], S + 0.24, S + 0.4, CREAM));
  } else if (kind === 'table') {
    // The coffee table: a black marble top, pale veins across it, on a brass-edged plinth set back; a tray and a book
    icube(b, [x0, z0, x1, z1], S + h - 0.04, S + h, MARBLE);
    icube(b, [x0 + 0.1, z0 + 0.1, x1 - 0.1, z1 - 0.1], y, S + h - 0.04, INK);
    b.detail(() => {
      icube(b, [x0 + 0.1, z0 + 0.1, x1 - 0.1, z0 + 0.11], y, S + h - 0.04, BRASS);
      for (const [a, c] of [[0.1, 0.55], [0.35, 0.95], [0.6, 0.8]]) {
        const g = new THREE.PlaneGeometry(0.008, Math.hypot(x1 - x0, (z1 - z0) * (c - a)) * 0.9).rotateX(-Math.PI / 2).rotateY(Math.atan2(x1 - x0, (z1 - z0) * (c - a)));
        g.deleteAttribute('uv');
        b.add(g.translate((x0 + x1) / 2, S + h + 0.002, z0 + ((a + c) / 2) * (z1 - z0)), paint(VEIN));
      }
      icube(b, [x0 + 0.15, z0 + 0.2, x0 + 0.4, z0 + 0.5], S + h, S + h + 0.012, BRASS);
      icube(b, [x1 - 0.35, z1 - 0.4, x1 - 0.12, z1 - 0.12], S + h, S + h + 0.03, CREAM);
      icube(b, [x0 + 0.22, z0 + 0.28, x0 + 0.32, z0 + 0.34], S + h + 0.012, S + h + 0.03, INK);
    });
  } else if (kind === 'media') {
    media(b, rect, low);
  } else if (kind === 'trophies') {
    // The trophy wall's shelving (what stands on it is drawn from the save: `trophyWall()`): a dark back panel on the
    // west wall, three shelves, a warm strip under each
    icube(b, [x0 + 0.006, z0, x0 + 0.026, z1], S + 0.32, S + h, SHELF_BACK);
    for (const sy of TROPHY_SHELVES) {
      icube(b, [x0 + 0.026, z0 + 0.03, x1, z1 - 0.03], S + sy - 0.025, S + sy, WOOD_DARK);
      b.detail(() => icube(b, [x0 + 0.03, z0 + 0.06, x0 + 0.05, z1 - 0.06], S + sy - 0.035, S + sy - 0.025, '#ffd58a'));
    }
  } else if (kind === 'lamp') {
    // A brass arc lamp: a marble foot by the armchair, its pole up and arcing out over the coffee table's corner, a
    // brass dome hung at its end with the bulb's glow under it
    const [mx, mz] = [(x0 + x1) / 2, (z0 + z1) / 2];
    drum(b, mx, mz, 0.11, 0.12, S + 0.006, S + 0.05, MARBLE);
    const end = V(mx + 0.62, S + 0.86, mz + 1.0);
    const pts = [V(mx, S + 0.05, mz), V(mx, S + 0.7, mz), V(mx + 0.12, S + 0.98, mz + 0.2), V(mx + 0.35, S + h, mz + 0.58), V(end.x, S + h - 0.04, end.z), end];
    for (let k = 0; k < pts.length - 1; k++) rod(b, pts[k], pts[k + 1], 0.012, paint(BRASS));
    drum(b, end.x, end.z, 0.03, 0.14, end.y - 0.12, end.y, BRASS, 12);
    b.detail(() => b.add(new THREE.SphereGeometry(0.04, 6, 4).translate(end.x, end.y - 0.12, end.z), glow(PAL.warm)));
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
  }
}

/**
 * The media wall on the lounge's west wall (docs/interior-plan.md Phase 1, the owner's pick): a deep green panel in
 * the middle with the telly mounted on it, a long low fire under it behind glass in a brass trim; a walnut niche at
 * each end, its shelves lit warm from under, books and brass on them; downlights washing it from the ceiling
 */
function media(b: Batch, [x0, z0, x1, z1]: Rect, low: boolean) {
  const N = 0.5;
  const [c0, c1] = [z0 + N, z1 - N];
  const mz = (c0 + c1) / 2;
  const top = S + CEIL - 0.006;
  const f = x1;
  // The green panel, full height, and the walnut niches either side (their backs set in, sides, shelves, a cap)
  icube(b, [x0 + 0.006, c0, f, c1], S + 0.012, top, FEATURE);
  for (const [a, c] of [[z0, c0], [c1, z1]]) {
    icube(b, [x0 + 0.006, a, x0 + 0.05, c], S + 0.012, top, WOOD_DARK);
    for (const e of [a, c - 0.03]) icube(b, [x0 + 0.05, e, f, e + 0.03], S + 0.012, top, WOOD);
    icube(b, [x0 + 0.05, a + 0.03, f, c - 0.03], S + 0.012, S + 0.1, WOOD);
    icube(b, [x0 + 0.05, a + 0.03, f, c - 0.03], top - 0.07, top, WOOD);
    for (const sy of [0.38, 0.66, 0.94]) {
      icube(b, [x0 + 0.05, a + 0.03, f, c - 0.03], S + sy - 0.02, S + sy, WOOD);
      b.detail(() => icube(b, [x0 + 0.06, a + 0.05, x0 + 0.08, c - 0.05], S + sy - 0.03, S + sy - 0.02, '#ffd58a'));
    }
    // (on the shelves: a brass vase, a stack of books, a small dark bowl; a tall vase on the bottom one)
    b.detail(() => {
      const m = (a + c) / 2;
      drum(b, x0 + 0.1, m - 0.08, 0.025, 0.035, S + 0.94, S + 1.05, BRASS, low ? 6 : 8);
      for (const [k, hex] of [[0, CREAM], [1, WOOD_DARK], [2, COGNAC]] as [number, string][]) icube(b, [x0 + 0.06, m - 0.1, x0 + 0.13, m + 0.08], S + 0.66 + k * 0.022, S + 0.68 + k * 0.022, hex);
      drum(b, x0 + 0.1, m + 0.06, 0.05, 0.03, S + 0.38, S + 0.42, MARBLE, low ? 6 : 10);
      drum(b, x0 + 0.1, m, 0.03, 0.045, S + 0.1, S + 0.3, CREAM, low ? 6 : 8);
    });
  }
  // The fire: a black firebox a hair proud of the panel, a brass trim round it, the flame in a line along its bed
  const [fa, fc] = [c0 + 0.12, c1 - 0.12];
  icube(b, [f, fa, f + 0.012, fc], S + 0.1, S + 0.27, INK);
  for (const [ya, yc] of [[0.085, 0.1], [0.27, 0.285]]) icube(b, [f, fa - 0.015, f + 0.018, fc + 0.015], S + ya, S + yc, BRASS);
  b.add(new THREE.BoxGeometry(0.008, 0.028, fc - fa - 0.1).translate(f + 0.016, S + 0.155, mz), FLAME);
  b.detail(() => icube(b, [f + 0.012, fa + 0.04, f + 0.016, fc - 0.04], S + 0.11, S + 0.13, '#5a2a1a'));
  // The telly, mounted: a thin black bezel standing a little off the panel, the screen dark glass in it
  const [tw, ty0, ty1] = [1.24, 0.38, 1.08];
  icube(b, [f + 0.004, mz - tw / 2 - 0.012, f + 0.03, mz + tw / 2 + 0.012], S + ty0 - 0.012, S + ty1 + 0.012, '#0b0a10');
  sheet(b, tw, ty1 - ty0, 0, Math.PI / 2, f + 0.032, S + (ty0 + ty1) / 2, mz, paint(SCREEN));
  // (a sheen across the glass, and the standby light under it)
  b.detail(() => {
    const g = new THREE.PlaneGeometry(0.14, (ty1 - ty0) * 1.05).rotateZ(0.5).rotateY(Math.PI / 2);
    g.deleteAttribute('uv');
    b.add(g.translate(f + 0.035, S + (ty0 + ty1) / 2, mz - tw * 0.22), paint('#2c2b36'));
    b.add(new THREE.SphereGeometry(0.008, 4, 3).translate(f + 0.034, S + ty0 - 0.006, mz + tw / 2 - 0.05), glow(PAL.red));
  });
  // The downlights over it, washing the wall: one over each niche, two over the panel
  b.detail(() => {
    for (const z of [z0 + N / 2, mz - 0.55, mz + 0.55, z1 - N / 2]) b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 8).translate(f + 0.2, S + CEIL - 0.012, z), glow(PAL.warm));
  });
}

/* ---------- Upstairs (docs/compound-plan.md Phase 3) ---------- */

const SCREEN_GLOW = neon(PAL.cyan, 0.9, 1.05);
const CAP_COLOURS = ['#d42b2b', INK, PRINT_PAPER, PAL.magenta];
const BOOKS = ['#c9302b', '#2b4c86', '#e6c13c', '#3f7f88', PRINT_PAPER];

/** A plant in a pot: the pot from y0, the leaves to y0 + h */
function potted(b: Batch, [x0, z0, x1, z1]: Rect, y0: number, h: number, low: boolean) {
  icube(b, [x0 + 0.02, z0 + 0.02, x1 - 0.02, z1 - 0.02], y0, y0 + 0.24, INK);
  const g = new THREE.SphereGeometry((x1 - x0) * 0.75, low ? 6 : 8, low ? 4 : 6).scale(1, (h - 0.2) / ((x1 - x0) * 1.5), 1);
  g.deleteAttribute('uv');
  b.add(g.translate((x0 + x1) / 2, y0 + 0.2 + (h - 0.2) / 2, (z0 + z1) / 2), paint(LEAF));
}

/** Upstairs (home.ts `UPSTAIRS`): its walls' inner faces, floor and ceiling, the front windows, and what stands on it */
function upstairs(b: Batch, low: boolean) {
  const G = 0.006;
  const [x0, z0, x1, z1] = [ROOM[0] + G, ROOM[1] + G, ROOM[2] - G, ROOM[3] - G];
  const [cx, cz, w, d] = [(x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0];
  const fy = S + UP_Y;
  const top = S + UP_CEIL - G;
  face(b, cx, z0, w, fy, top, 0, WALLS_IN, 0.94);
  face(b, cx, z1, w, fy, top, Math.PI, WALLS_IN, 0.9);
  face(b, x0, cz, d, fy, top, Math.PI / 2, WALLS_IN, 0.82);
  face(b, x1, cz, d, fy, top, -Math.PI / 2, WALLS_IN, 0.82);
  iflat(b, ROOM, fy + G, LAMINATE);
  sheet(b, w, d, Math.PI / 2, 0, cx, top, cz, paint(CEILING_IN));
  // The three front windows, where they are outside (home3d.ts `house()`), a hair off the wall
  const [hx0, , hx1] = HOME.house;
  const dx = HOME.door[0];
  for (const [wa, wb] of [[hx0 + 0.65, hx0 + 2.65], [dx - 1.0, dx + 1.0], [hx1 - 2.65, hx1 - 0.65]]) {
    icube(b, [wa, z0 + G, wb, z0 + 0.02], S + 1.55, S + 2.15, WINDOW);
    b.detail(() => {
      for (const y of [1.51, 2.15]) icube(b, [wa - 0.04, z0 + G, wb + 0.04, z0 + 0.035], S + y, S + y + 0.04, FRAME);
      icube(b, [(wa + wb) / 2 - 0.02, z0 + 0.021, (wa + wb) / 2 + 0.02, z0 + 0.035], S + 1.55, S + 2.15, FRAME);
    });
  }
  for (const u of UPSTAIRS) upFurnish(b, u, fy, low);
  b.detail(() => {
    // Ceiling lights, flat discs: the bedroom's, the office's, the landing's
    const lights: [number, number][] = [[x0 + 3.0, z0 + 1.5], [x0 + 3.0, z1 - 1.6], [x1 - 1.3, z0 + 3.4]];
    for (const [lx, lz] of lights) b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 12).translate(lx, top - 0.01, lz), glow(PAL.warm));
    // A rug by the bed
    const bed = UPSTAIRS.find((u) => u.kind === 'bed')!.rect;
    iflat(b, [bed[2], bed[1] - 0.15, bed[2] + 1.0, bed[3] + 0.15], fy + G + 0.006, RUG);
  });
}

/** One thing upstairs, by its kind, standing on the floor at `fy` */
function upFurnish(b: Batch, { kind, rect, h }: UpThing, fy: number, low: boolean) {
  const [x0, z0, x1, z1] = rect;
  const y = fy + 0.012;
  const [mx, mz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  if (kind === 'wall') icube(b, rect, fy, fy + h, WALLS_IN);
  else if (kind === 'bathdoor') {
    // The bathroom's door, shut (there's nothing behind it to go into), a handle
    icube(b, rect, fy, fy + h, WOOD_DARK);
    b.detail(() => icube(b, [x1 - 0.12, z0 - 0.02, x1 - 0.08, z0], fy + 0.48, fy + 0.52, STEEL));
  } else if (kind === 'well') {
    // The stairwell: the opening over the flight below (dark), railed on its two open sides; in its north end the
    // steep steps up to the roof's hatch, and the hatch's opening in the ceiling over them
    iflat(b, [x0, z0 + 0.9, x1, z1], fy + 0.008, SHELF_BACK);
    const rail = fy + h;
    icube(b, [x0, z0, x0 + 0.04, z1], rail - 0.03, rail, INK);
    icube(b, [x0, z1 - 0.04, x1, z1], rail - 0.03, rail, INK);
    for (let z = z0 + 0.1; z < z1; z += 0.45) icube(b, [x0, z, x0 + 0.03, z + 0.03], fy, rail - 0.03, INK);
    for (const x of [x0 + 0.3, x0 + 0.62]) icube(b, [x, z1 - 0.04, x + 0.03, z1 - 0.01], fy, rail - 0.03, INK);
    const n = 6;
    const rise = (S + UP_CEIL - fy) / n;
    const run = 0.85 / n;
    for (let k = 0; k < n; k++) icube(b, [x0 + 0.08, z0 + 0.9 - (k + 1) * run, x1 - 0.02, z0 + 0.9 - k * run + 0.004], fy + (k + 1) * rise - 0.04, fy + (k + 1) * rise, WOOD);
    rod(b, V(x0 + 0.08, fy + 0.45, z0 + 0.9), V(x0 + 0.08, S + UP_CEIL + 0.2, z0 + 0.05), 0.012, paint(INK));
    sheet(b, x1 - x0, 0.9, Math.PI / 2, 0, mx, S + UP_CEIL - 0.012, z0 + 0.45, paint(SHELF_BACK));
  } else if (kind === 'bed') {
    // A big low bed, its head against the west wall: the frame, the mattress, the duvet in his purple, two pillows
    icube(b, rect, y, fy + 0.16, INK);
    icube(b, [x0 + 0.04, z0 + 0.04, x1 - 0.04, z1 - 0.04], fy + 0.16, fy + 0.24, PALE_TOP);
    icube(b, [x0 + 0.42, z0 + 0.02, x1 - 0.02, z1 - 0.02], fy + 0.24, fy + h, SOFA);
    icube(b, [x0, z0, x0 + 0.06, z1], y, fy + 0.62, INK);
    b.detail(() => {
      for (const z of [z0 + 0.12, mz + 0.06]) icube(b, [x0 + 0.08, z, x0 + 0.36, z + (z1 - z0) / 2 - 0.18], fy + 0.24, fy + 0.32, PRINT_PAPER);
      icube(b, [x0 + 0.42, z0 + 0.02, x0 + 0.5, z1 - 0.02], fy + h, fy + h + 0.006, CUSHION);
    });
  } else if (kind === 'bedside') {
    icube(b, rect, y, fy + h, WOOD_DARK);
    drum(b, mx, mz, 0.05, 0.07, fy + h + 0.14, fy + h + 0.24, SHADE);
    drum(b, mx, mz, 0.01, 0.01, fy + h, fy + h + 0.14, INK, 5);
    b.detail(() => b.add(new THREE.SphereGeometry(0.025, 5, 4).translate(mx, fy + h + 0.15, mz), glow(PAL.warm)));
  } else if (kind === 'dresser') {
    icube(b, rect, y, fy + h, WOOD);
    b.detail(() => {
      for (const t of [0.14, 0.28]) icube(b, [x0 + 0.04, z0 - 0.006, x1 - 0.04, z0], fy + t, fy + t + 0.012, WOOD_DARK);
      icube(b, [x0 + 0.2, z0 + 0.1, x0 + 0.42, z0 + 0.28], fy + h, fy + h + 0.2, INK);
    });
  } else if (kind === 'caps') {
    // His caps on a rail on the wall (his red one first)
    icube(b, [x0, z1 - 0.03, x1, z1 - 0.006], fy + 0.78, fy + 0.8, INK);
    CAP_COLOURS.forEach((c, k) => {
      const cx = x0 + ((x1 - x0) * (k + 0.5)) / CAP_COLOURS.length;
      const g = new THREE.SphereGeometry(0.09, low ? 6 : 8, low ? 3 : 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 0.8);
      g.deleteAttribute('uv');
      b.add(g.translate(cx, fy + 0.68, z1 - 0.1), paint(c));
      icube(b, [cx - 0.08, z1 - 0.26, cx + 0.08, z1 - 0.1], fy + 0.675, fy + 0.69, c);
    });
  } else if (kind === 'desk') {
    // The office's desk against the back wall: two screens glowing (lines of light, nothing to read), the keyboard,
    // the tower under it with its lit side
    icube(b, [x0, z0, x1, z1], fy + h - 0.03, fy + h, DARK_UNIT);
    for (const x of [x0 + 0.04, x1 - 0.08]) icube(b, [x, z0 + 0.04, x + 0.04, z1 - 0.04], y, fy + h - 0.03, INK);
    for (const s of [-1, 1]) {
      const c = mx + s * 0.36;
      icube(b, [c - 0.32, z1 - 0.2, c + 0.32, z1 - 0.16], fy + h + 0.1, fy + h + 0.48, SCREEN);
      b.add(new THREE.PlaneGeometry(0.58, 0.32).rotateY(Math.PI).translate(c, fy + h + 0.29, z1 - 0.204), SCREEN_GLOW);
      icube(b, [c - 0.04, z1 - 0.18, c + 0.04, z1 - 0.1], fy + h, fy + h + 0.1, INK);
    }
    b.detail(() => {
      icube(b, [mx - 0.25, z0 + 0.12, mx + 0.25, z0 + 0.22], fy + h, fy + h + 0.015, INK);
      icube(b, [x1 - 0.42, z1 - 0.5, x1 - 0.16, z1 - 0.06], y, fy + 0.34, INK);
      b.add(new THREE.BoxGeometry(0.006, 0.2, 0.3).translate(x1 - 0.425, fy + 0.18, z1 - 0.28), BACKLIGHT);
    });
  } else if (kind === 'chair') {
    // His chair, turned to the desk (its back to the room): black, his magenta in its seat
    drum(b, mx, mz, 0.2, 0.2, fy + 0.22, fy + 0.27, INK, low ? 6 : 10);
    icube(b, [mx - 0.16, mz - 0.12, mx + 0.16, mz + 0.12], fy + 0.27, fy + 0.29, CUSHION);
    icube(b, [mx - 0.18, z0, mx + 0.18, z0 + 0.06], fy + 0.27, fy + h + 0.12, INK);
    drum(b, mx, mz, 0.02, 0.02, fy + 0.04, fy + 0.22, STEEL, 5);
    drum(b, mx, mz, 0.18, 0.18, fy + 0.01, fy + 0.04, INK, 5);
  } else if (kind === 'shelf') {
    // A bookshelf on the west wall, books on its shelves
    icube(b, rect, y, fy + h, WOOD_DARK);
    if (!low)
      b.detail(() => {
        for (const sy of [0.2, 0.5, 0.8])
          for (let z = z0 + 0.06, k = 0; z < z1 - 0.1; z += 0.09, k++) icube(b, [x1, z, x1 + 0.006, z + 0.07], fy + sy, fy + sy + 0.14 + (k % 3) * 0.02, BOOKS[k % BOOKS.length]);
      });
  } else potted(b, rect, fy + 0.012, h, low);
}

/* ---------- The basement, his trading den (docs/compound-plan.md Phase 4) ---------- */

const DEN_WALL = '#3a3448';
const DEN_FLOOR = '#4a4652';
const DEN_CEIL = '#2a2733';
const LED_MAGENTA = neon(PAL.magenta, 1.2, 1.4);
const LED_CYAN = neon(PAL.cyan, 1.1, 1.3);
const BOTTLES = ['#2fae6e', '#c07a3a', '#e6c13c', '#8fd3ff', '#c9302b', PRINT_PAPER];

/** The trading desk's six screens (three across, two high, the outer ones turned to his chair): middle, size and turn */
export function denScreens() {
  const [x0, , x1, z1] = BASEMENT.find((u) => u.kind === 'desk')!.rect;
  const fy = S + BASE_Y;
  const mx = (x0 + x1) / 2;
  const out: { x: number; y: number; z: number; w: number; h: number; ry: number; col: number; row: number }[] = [];
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 3; col++) {
      const ry = (col - 1) * 0.3;
      out.push({ x: mx + (col - 1) * 0.55, y: fy + 0.66 + row * 0.33, z: z1 - 0.3 - Math.abs(col - 1) * 0.06, w: 0.52, h: 0.3, ry, col, row });
    }
  return out;
}

/** The basement (home.ts `BASEMENT`): its walls, floor and ceiling, the LED strips, and what stands in it */
function basement(b: Batch, low: boolean) {
  const G = 0.006;
  const [x0, z0, x1, z1] = [ROOM[0] + G, ROOM[1] + G, ROOM[2] - G, ROOM[3] - G];
  const [cx, cz, w, d] = [(x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0];
  const fy = S + BASE_Y;
  const top = S + BASE_CEIL;
  face(b, cx, z0, w, fy, top, 0, DEN_WALL, 0.94);
  face(b, cx, z1, w, fy, top, Math.PI, DEN_WALL, 0.9);
  face(b, x0, cz, d, fy, top, Math.PI / 2, DEN_WALL, 0.82);
  face(b, x1, cz, d, fy, top, -Math.PI / 2, DEN_WALL, 0.82);
  iflat(b, ROOM, fy + G, DEN_FLOOR);
  sheet(b, w, d, Math.PI / 2, 0, cx, top, cz, paint(DEN_CEIL));
  // LED strips round the ceiling's edge, his magenta along the front and back, cyan down the sides
  const L = 0.02;
  b.add(new THREE.BoxGeometry(w - 0.1, L, L).translate(cx, top - 0.03, z0 + 0.02), LED_MAGENTA);
  b.add(new THREE.BoxGeometry(w - 0.1, L, L).translate(cx, top - 0.03, z1 - 0.02), LED_MAGENTA);
  b.add(new THREE.BoxGeometry(L, L, d - 0.1).translate(x0 + 0.02, top - 0.03, cz), LED_CYAN);
  b.add(new THREE.BoxGeometry(L, L, d - 0.1).translate(x1 - 0.02, top - 0.03, cz), LED_CYAN);
  for (const u of BASEMENT) denFurnish(b, u, fy, low);
  b.detail(() => {
    // His mark in neon on the west wall over the sofa's end, a rug under the table, two ceiling lights (dim, warm)
    mark(b, LED_MAGENTA, 0.36, V(x0 + 0.02, fy + 0.75, z0 + 2.05), V(0, 0, -1), V(0, 1, 0), V(1, 0, 0), { tube: 0.014 });
    const t = BASEMENT.find((u) => u.kind === 'table')!.rect;
    iflat(b, [t[0] - 0.6, t[1] - 0.25, t[2] + 0.6, t[3] + 1.3], fy + G + 0.006, RUG);
    for (const [lx, lz] of [[x0 + 2.2, z0 + 1.4], [x0 + 3.2, z1 - 1.6]]) b.add(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 10).translate(lx, top - 0.01, lz), glow(PAL.warm));
  });
}

/** One thing in the basement, by its kind, standing on its floor at `fy` */
function denFurnish(b: Batch, { kind, rect, h }: BaseThing, fy: number, low: boolean) {
  const [x0, z0, x1, z1] = rect;
  const y = fy + 0.012;
  const [mx, mz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  if (kind === 'vault') {
    // The stash's vault (docs/interior-plan.md Phase 1, the owner's pick): set in the north wall, a steel frame and a
    // round steel door in it, bolts round its rim, a spoked wheel on its hub, a keypad by it (a small green light, no
    // numbers)
    const fz = z1 - 0.06;
    icube(b, [x0, z0 + 0.006, x1, fz], y, fy + h, '#3a3a42');
    const [cy, r] = [fy + h / 2 + 0.02, Math.min(x1 - x0, h) / 2 - 0.06];
    const disc = (rr: number, t: number, z: number, hex: string, n = low ? 12 : 20) => {
      const g = new THREE.CylinderGeometry(rr, rr, t, n).rotateX(Math.PI / 2);
      g.deleteAttribute('uv');
      b.add(g.translate(mx, cy, z + t / 2), paint(hex));
    };
    disc(r + 0.03, 0.02, fz, '#55555f');
    disc(r, 0.04, fz + 0.02, STEEL);
    disc(0.06, 0.03, fz + 0.06, '#55555f');
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3 + 0.3;
      rod(b, V(mx, cy, fz + 0.08), V(mx + Math.cos(a) * 0.2, cy + Math.sin(a) * 0.2, fz + 0.08), 0.012, paint('#c9ccd6'));
    }
    b.detail(() => {
      for (let k = 0; k < 12; k++) {
        const a = (k * Math.PI * 2) / 12;
        b.add(new THREE.SphereGeometry(0.014, 5, 3).translate(mx + Math.cos(a) * (r - 0.04), cy + Math.sin(a) * (r - 0.04), fz + 0.06), paint('#c9ccd6'));
      }
      icube(b, [x1 + 0.03, z0 + 0.006, x1 + 0.13, z0 + 0.03], fy + 0.5, fy + 0.66, INK);
      b.add(new THREE.SphereGeometry(0.01, 4, 3).translate(x1 + 0.08, fy + 0.63, z0 + 0.035), glow('#7dff9a'));
    });
  } else if (kind === 'steps') {
    // The steps down from under the stairs: treads rising north to the room's floor, a black steel rail on the open side
    const n = 9;
    const run = (z1 - z0) / n;
    const rise = (S - fy) / n;
    for (let k = 0; k < n; k++) icube(b, [x0 + 0.04, z1 - (k + 1) * run, x1 - 0.006, z1 - k * run + 0.004], fy + (k + 1) * rise - 0.05, fy + (k + 1) * rise, WOOD);
    // (its rail ends under the room's floor: it mustn't show up there)
    rod(b, V(x0 + 0.03, fy + 0.45, z1), V(x0 + 0.03, S + BASE_CEIL - 0.04, z0 + 0.45), 0.014, paint(INK));
    rod(b, V(x0 + 0.03, fy + 0.02, z1), V(x0 + 0.03, S - 0.02, z0 + 0.05), 0.025, paint(INK));
  } else if (kind === 'tv') {
    // Wall-hung on the front wall, cyan glowing round it from behind, a standby light
    icube(b, [x0, z1 - 0.06, x1, z1], fy + 0.3, fy + h, SCREEN);
    b.add(new THREE.BoxGeometry(x1 - x0 + 0.06, h - 0.3 + 0.06, 0.006).translate(mx, fy + (0.3 + h) / 2, z0 + 0.01), LED_CYAN);
    b.detail(() => b.add(new THREE.SphereGeometry(0.012, 5, 4).translate(x1 - 0.06, fy + 0.33, z1 + 0.004), glow(PAL.cyan)));
  } else if (kind === 'table') {
    icube(b, rect, fy + h - 0.03, fy + h, DARK_UNIT);
    icube(b, [x0 + 0.1, z0 + 0.08, x1 - 0.1, z1 - 0.08], y, fy + h - 0.03, INK);
    b.detail(() => {
      icube(b, [x0 + 0.2, z0 + 0.15, x0 + 0.32, z0 + 0.22], fy + h, fy + h + 0.02, INK);
      drum(b, x1 - 0.2, mz, 0.03, 0.03, fy + h, fy + h + 0.08, PAL.magenta, 6);
    });
  } else if (kind === 'sofa') {
    // A low sofa facing the telly (north): its back on its south side, arms at the ends, cushions
    icube(b, [x0, z0, x1, z1 - 0.22], y, fy + 0.22, SOFA);
    icube(b, [x0, z1 - 0.22, x1, z1], y, fy + h, SOFA);
    for (const x of [x0, x1 - 0.14]) icube(b, [x, z0, x + 0.14, z1], y, fy + 0.32, SOFA);
    b.detail(() => {
      for (const x of [x0 + 0.25, x1 - 0.6]) icube(b, [x, z1 - 0.3, x + 0.32, z1 - 0.2], fy + 0.22, fy + 0.4, CUSHION);
    });
  } else if (kind === 'beanbag') {
    const g = new THREE.SphereGeometry((x1 - x0) / 2, low ? 6 : 10, low ? 4 : 6).scale(1, 0.55, 1);
    g.deleteAttribute('uv');
    b.add(g.translate(mx, y + (h * 0.5), mz), paint('#3f7f88'));
  } else if (kind === 'arcade') {
    // An arcade cabinet facing into the room (east): his colours down its sides, the screen lit, the marquee lit, no words
    icube(b, rect, y, fy + h, INK);
    for (const z of [z0 - 0.004, z1]) icube(b, [x0 + 0.05, z, x1 - 0.05, z + 0.004], fy + 0.15, fy + h - 0.05, z === z1 ? PAL.cyan : PAL.magenta);
    b.add(new THREE.PlaneGeometry(z1 - z0 - 0.12, 0.26).rotateY(Math.PI / 2).translate(x1 + 0.004, fy + 0.68, mz), SCREEN_GLOW);
    b.add(new THREE.PlaneGeometry(z1 - z0 - 0.08, 0.08).rotateY(Math.PI / 2).translate(x1 + 0.004, fy + h - 0.07, mz), LED_MAGENTA);
    icube(b, [x1, z0 + 0.04, x1 + 0.12, z1 - 0.04], fy + 0.45, fy + 0.5, DARK_UNIT);
    b.detail(() => {
      for (const [dz, c] of [[-0.1, PAL.red], [0.04, PAL.cyan], [0.12, PAL.gold]] as [number, string][]) drum(b, x1 + 0.07, mz + dz, 0.018, 0.018, fy + 0.5, fy + 0.515, c, 6);
    });
  } else if (kind === 'desk') {
    // The trading desk: a long dark top, legs; the screens' frames on their arms (what's on them is `denCharts()`,
    // drawn with the page's own texture); keyboards and a mouse
    icube(b, rect, fy + h - 0.03, fy + h, DARK_UNIT);
    for (const x of [x0 + 0.04, mx - 0.02, x1 - 0.08]) icube(b, [x, z0 + 0.04, x + 0.04, z1 - 0.04], y, fy + h - 0.03, INK);
    rod(b, V(mx, fy + h, z1 - 0.12), V(mx, fy + 1.12, z1 - 0.12), 0.02, paint(INK));
    for (const sc of denScreens()) {
      const g = new THREE.BoxGeometry(sc.w + 0.03, sc.h + 0.03, 0.025).rotateY(sc.ry);
      g.deleteAttribute('uv');
      b.add(g.translate(sc.x + Math.sin(sc.ry) * 0.012, sc.y, sc.z + Math.cos(sc.ry) * 0.012), paint(SCREEN));
      rod(b, V(mx, sc.y, z1 - 0.12), V(sc.x, sc.y, sc.z + 0.03), 0.008, paint(INK));
    }
    b.detail(() => {
      for (const dx of [-0.45, 0.25]) icube(b, [mx + dx - 0.2, z0 + 0.1, mx + dx + 0.2, z0 + 0.2], fy + h, fy + h + 0.015, INK);
      b.add(new THREE.BoxGeometry(0.36, 0.006, 0.006).translate(mx - 0.45, fy + h + 0.018, z0 + 0.1), LED_MAGENTA);
      icube(b, [mx + 0.55, z0 + 0.12, mx + 0.6, z0 + 0.2], fy + h, fy + h + 0.015, INK);
    });
  } else if (kind === 'chair') {
    // His gaming chair, turned to the desk: black with his magenta down its tall back
    drum(b, mx, mz, 0.22, 0.22, fy + 0.22, fy + 0.27, INK, low ? 6 : 10);
    icube(b, [mx - 0.17, mz - 0.13, mx + 0.17, mz + 0.13], fy + 0.27, fy + 0.29, CUSHION);
    icube(b, [mx - 0.2, z0, mx + 0.2, z0 + 0.07], fy + 0.27, fy + h + 0.25, INK);
    icube(b, [mx - 0.06, z0 - 0.004, mx + 0.06, z0], fy + 0.35, fy + h + 0.2, PAL.magenta);
    drum(b, mx, mz, 0.02, 0.02, fy + 0.04, fy + 0.22, STEEL, 5);
    drum(b, mx, mz, 0.2, 0.2, fy + 0.01, fy + 0.04, INK, 5);
  } else if (kind === 'tower') {
    icube(b, rect, y, fy + h, INK);
    b.add(new THREE.BoxGeometry(0.006, h - 0.08, z1 - z0 - 0.08).translate(x0 - 0.004, fy + h / 2, mz), LED_CYAN);
  } else if (kind === 'bar') {
    // The bar's counter facing into the room (west): dark, a pale top, his magenta along its foot
    icube(b, [x0 + 0.06, z0, x1, z1], y, fy + h - 0.03, DARK_UNIT);
    icube(b, [x0, z0, x1, z1], fy + h - 0.03, fy + h, PALE_TOP);
    b.add(new THREE.BoxGeometry(0.012, 0.012, z1 - z0 - 0.1).translate(x0 + 0.05, fy + 0.04, mz), LED_MAGENTA);
  } else if (kind === 'barshelf') {
    // The lit shelf behind the bar: dark, three shelves with a warm strip under each, bottles of made-up drinks (no labels)
    icube(b, rect, y, fy + h, SHELF_BACK);
    const rows = [0.55, 0.78, 1.0];
    rows.forEach((sy, r) => {
      icube(b, [x0 - 0.06, z0 + 0.04, x0, z1 - 0.04], fy + sy - 0.02, fy + sy, WOOD_DARK);
      b.add(new THREE.BoxGeometry(0.01, 0.008, z1 - z0 - 0.12).translate(x0 - 0.03, fy + sy - 0.025, mz), glow(PAL.warm));
      if (!low || r === 0)
        for (let z = z0 + 0.1, k = r; z < z1 - 0.08; z += 0.13, k++) drum(b, x0 - 0.03, z, 0.018, 0.024, fy + sy, fy + sy + 0.1 + (k % 2) * 0.03, BOTTLES[k % BOTTLES.length], 6);
    });
  } else if (kind === 'stools') {
    for (let k = 0; k < 3; k++) {
      const sz = z0 + ((z1 - z0) * (k + 0.5)) / 3;
      drum(b, mx, sz, 0.1, 0.09, fy + h - 0.04, fy + h, CUSHION);
      drum(b, mx, sz, 0.015, 0.015, fy + 0.02, fy + h - 0.04, STEEL, 5);
      drum(b, mx, sz, 0.08, 0.08, fy + 0.006, fy + 0.02, STEEL);
    }
  } else if (kind === 'fridge') {
    icube(b, rect, y, fy + h, INK);
    b.add(new THREE.PlaneGeometry(z1 - z0 - 0.1, h - 0.12).rotateY(-Math.PI / 2).translate(x0 - 0.004, fy + h / 2, mz), LED_CYAN);
  } else potted(b, rect, fy + 0.012, h, low);
}

/**
 * What's on the trading desk's screens, drawn on the main thread (south3d.ts adds it): one mesh, the six screens' faces
 * sharing one baked texture of made-up candle charts in green and red with depth bars and a line, **no words, numbers,
 * tickers, coin names or logos** (the content guardrails), each screen showing its own part of it. The charts creep
 * along slowly (the texture's offset, not a redraw); under reduced motion they hold still. Shown only while the
 * camera is down in the basement, so it costs nothing anywhere else
 */
export function denCharts(scene: THREE.Scene, tick: ((f: Tick) => void) | undefined, low: boolean) {
  const tex = canvasTex(low ? 256 : 512, low ? 128 : 256, (c, w, h) => {
    const r = rng(144);
    c.fillStyle = '#0b0a12';
    c.fillRect(0, 0, w, h);
    // (a faint grid)
    c.strokeStyle = '#1d1b2a';
    c.lineWidth = 1;
    for (let x = 0; x < w; x += w / 16) c.strokeRect(x, 0, 0, h);
    for (let y = 0; y < h; y += h / 8) c.strokeRect(0, y, w, 0);
    // Each half of the texture (the screens' two rows) its own chart: candles on a random walk, depth bars under them,
    // a line over them
    for (const [y0, y1] of [[0, h / 2], [h / 2, h]]) {
      const n = 48;
      const cw = w / n;
      let p = 0.5;
      const pts: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const o = p;
        p = Math.max(0.15, Math.min(0.85, p + (r() - 0.48) * 0.12));
        const hi = Math.max(o, p) + r() * 0.05;
        const lo = Math.min(o, p) - r() * 0.05;
        const Y = (v: number) => y0 + (y1 - y0) * (0.08 + (1 - v) * 0.62);
        const up = p >= o;
        c.fillStyle = c.strokeStyle = up ? '#2fd47a' : '#e2445a';
        c.lineWidth = Math.max(1, cw * 0.12);
        c.beginPath();
        c.moveTo(i * cw + cw / 2, Y(hi));
        c.lineTo(i * cw + cw / 2, Y(lo));
        c.stroke();
        c.fillRect(i * cw + cw * 0.2, Math.min(Y(o), Y(p)), cw * 0.6, Math.max(2, Math.abs(Y(o) - Y(p))));
        // (the depth bars along the bottom, dim)
        c.globalAlpha = 0.45;
        const bh = (y1 - y0) * (0.05 + r() * 0.16);
        c.fillRect(i * cw + cw * 0.2, y1 - bh - 2, cw * 0.6, bh);
        c.globalAlpha = 1;
        pts.push([i * cw + cw / 2, Y((o + p) / 2)]);
      }
      c.strokeStyle = PAL.magenta;
      c.lineWidth = Math.max(1.5, w / 256);
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  const parts = denScreens().map((sc) => {
    const g = new THREE.PlaneGeometry(sc.w, sc.h).rotateY(Math.PI + sc.ry);
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (sc.col + uv.getX(i)) / 3, (sc.row + uv.getY(i)) / 2);
    // (a hair in front of its frame's face, toward his chair)
    return g.translate(sc.x - Math.sin(sc.ry) * 0.004, sc.y, sc.z - Math.cos(sc.ry) * 0.004);
  });
  const mesh = new THREE.Mesh(mergeGeometries(parts, false)!, new THREE.MeshBasicMaterial({ map: tex, color: '#eeeeee' }));
  mesh.name = 'home-den-charts';
  mesh.visible = false;
  scene.add(mesh);
  const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [hx0, hz0, hx1, hz1] = HOME.house;
  tick?.(({ dt }) => {
    const e = CROWD_VIEW.eye;
    mesh.visible = e.y < S && e.x > hx0 && e.x < hx1 && e.z > hz0 && e.z < hz1;
    if (mesh.visible && !still) tex.offset.x = (tex.offset.x + dt * 0.004) % 1;
  });
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
