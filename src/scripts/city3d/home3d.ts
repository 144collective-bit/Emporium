/*
 * Degen's home, drawn (docs/home-plan.md Phase 1; the numbers are home.ts's): a site in Endswood carried west's chunk
 * (endswest3d.ts registers it, in the worker too). The house is the terrace's own (endsterraces3d.ts); this is what
 * makes it his:
 *
 * - **The garage** in the back garden, hollow: brick walls, a flat felt roof behind a coping, the up-and-over door in
 *   its west wall up under the ceiling (the car stands inside: garage.ts's home stand), a concrete lintel, a side
 *   door onto the yard, a caged lamp over the big door; inside a strip light, a workbench, shelves and tyres.
 * - **The driveway**: concrete in bays with joints between, an oil stain where a car has stood, the dropped kerb
 *   down to the Close as a ramp, a drain by the garage's door.
 * - **The yard** between the house and the garage in flags, and a mat at the front door.
 *
 * - **Inside** (Phase 3): the room on the ground floor, behind the house's own walls: its four walls' inner faces
 *   with a window front and back and the two doors, a laminate floor, the ceiling and its light, and what stands in
 *   it (home.ts `FURNITURE`): the boxed-in stairs, a sofa, a low table, the telly, the kitchen's counter and fridge,
 *   a table and stools, the wardrobe, a trunk. Drawn without shadows, cast or taken (the house over it would put it
 *   all in the dark), so it's evenly lit, as the mall's hall is.
 *
 * All in the shared paint (plain colours), the walls, roof, door and driveway at every distance, the rest near only;
 * phones leave out the finest (the shelves, the joints).
 */
import * as THREE from 'three';
import { Batch, PAL, toon } from './kit';
import { site } from './tilework';
import { KERB } from './palette';
import { glow, METAL } from './infill';
import { CEIL, FURNITURE, HOME, HOME_HOUSE, HOME_LAND, HOME_SLAB, ROOM, WALL, type Furniture } from './home';
import { HOUSES } from './endsterraces';
import type { Rect } from './endswood';

const S = HOME_SLAB;
/** On the block: what lies on its ground 12 mm over the slab (the grass and asphalt are at 6), what lies on that 6 more */
const ON = S + 0.012;
const OVER = ON + 0.006;
const BRICK = toon('#7a4337');
const BRICK_DARK = toon('#57302a');
const COPING = toon('#a9a5ad');
const FELT = toon('#2e2b36');
const CONCRETE = toon('#9a96a0');
const JOINT = toon('#6a6772');
const STAIN = toon('#57545f');
const FLAGS = toon(KERB.grit);
const DOOR = toon('#4a3270');
const SIDE_DOOR = toon('#2f2540');
const MAT = toon('#2a2622');
const LINTEL = toon('#8b8791');
const FLOOR = toon('#8a8791');
const CEILING = toon('#c9c5cc');
const BENCH = toon('#7a5a3a');
const TOOLBOX = toon('#b8322c');
const TYRE = toon('#1f1e25');

const cube = (b: Batch, [x0, z0, x1, z1]: Rect, y0: number, y1: number, m: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, m);
function flat(b: Batch, [x0, z0, x1, z1]: Rect, y: number, m: THREE.Material) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2);
  g.deleteAttribute('uv');
  b.add(g.translate((x0 + x1) / 2, y, (z0 + z1) / 2), m);
}

export function registerHome(low: boolean) {
  const [gx0, gz0, gx1, gz1] = HOME.garage;
  const { garageH: H, garageTop: TOP, garageDoor: D, drive, kerb } = HOME;
  site('home', [HOME_LAND[0] - 1, HOME_LAND[1] - 1, HOME_LAND[2] + 1, kerb[3] + 1], (into) => {
    const b = new Batch();
    // The garage, hollow: its four walls (the west one either side of the door and over it), the floor inside, the
    // ceiling, the felt roof a hair inside the walls under a coping
    const W = WALL;
    cube(b, [gx0, gz0, gx1, gz0 + W], S, S + H, BRICK);
    cube(b, [gx0, gz1 - W, gx1, gz1], S, S + H, BRICK);
    cube(b, [gx1 - W, gz0 + W, gx1, gz1 - W], S, S + H, BRICK);
    cube(b, [gx0, gz0 + W, gx0 + W, D.z0], S, S + H, BRICK);
    cube(b, [gx0, D.z1, gx0 + W, gz1 - W], S, S + H, BRICK);
    cube(b, [gx0, D.z0, gx0 + W, D.z1], S + D.h, S + H, LINTEL);
    flat(b, [gx0 + W, gz0 + W, gx1 - W, gz1 - W], ON, FLOOR);
    {
      const g = new THREE.PlaneGeometry(gx1 - gx0 - W * 2, gz1 - gz0 - W * 2).rotateX(Math.PI / 2);
      g.deleteAttribute('uv');
      b.add(g.translate((gx0 + gx1) / 2, S + H - 0.004, (gz0 + gz1) / 2), CEILING);
    }
    cube(b, [gx0 - 0.04, gz0 - 0.04, gx1 + 0.04, gz1 + 0.04], S + H, S + TOP, COPING);
    cube(b, [gx0 + 0.1, gz0 + 0.1, gx1 - 0.1, gz1 - 0.1], S + TOP, S + TOP + 0.012, FELT);
    // The up-and-over door, up: its panel under the ceiling just inside, its edge showing in the opening
    cube(b, [gx0 + 0.02, D.z0 + 0.03, gx0 + 0.02 + D.h * 0.92, D.z1 - 0.03], S + D.h + 0.03, S + D.h + 0.07, DOOR);
    // The driveway: concrete from the lane to the row's end, and the dropped kerb down to the Close
    flat(b, drive, ON, CONCRETE);
    {
      const [kx0, kz0, kx1, kz1] = kerb;
      // (a ramp: the slab's height at the block's edge, the road's at its foot, a little way out onto it)
      const g = new THREE.BufferGeometry();
      const y0 = ON;
      const y1 = 0.03;
      const zf = kz1 + 0.3;
      g.setAttribute('position', new THREE.Float32BufferAttribute([kx0, y0, kz0, kx1, y0, kz0, kx1, y1, zf, kx0, y1, zf], 3));
      g.setIndex([0, 2, 1, 0, 3, 2]);
      g.computeVertexNormals();
      b.add(g, CONCRETE);
    }
    // The yard between the house and the garage, in flags
    flat(b, [HOME.garden[0] + 0.05, HOME.garden[1] + 0.02, HOME.garden[2] - 0.05, gz0 - 0.02], ON, FLAGS);
    b.detail(() => {
      // A caged lamp over the door, a drain at its foot; inside, a strip light, a workbench and shelves along the
      // back wall, a stack of tyres and a jack in the corner
      b.add(new THREE.SphereGeometry(0.06, 6, 4).translate(D.x - 0.1, S + H - 0.08, (D.z0 + D.z1) / 2), glow(PAL.warm));
      cube(b, [D.x - 0.12, (D.z0 + D.z1) / 2 - 0.02, D.x - 0.006, (D.z0 + D.z1) / 2 + 0.02], S + H - 0.12, S + H - 0.1, METAL);
      flat(b, [D.x - 0.34, D.z0 + 0.1, D.x - 0.1, D.z1 - 0.1], OVER, JOINT);
      cube(b, [(gx0 + gx1) / 2 - 0.9, (gz0 + gz1) / 2 - 0.03, (gx0 + gx1) / 2 + 0.9, (gz0 + gz1) / 2 + 0.03], S + H - 0.06, S + H - 0.03, glow(PAL.warm));
      const bx = gx1 - W;
      cube(b, [bx - 0.5, gz0 + W + 0.1, bx - 0.02, gz0 + W + 1.5], S + 0.5, S + 0.56, BENCH);
      for (const z of [gz0 + W + 0.14, gz0 + W + 1.42]) cube(b, [bx - 0.46, z, bx - 0.4, z + 0.05], S, S + 0.5, METAL);
      if (!low) {
        cube(b, [bx - 0.3, gz0 + W + 0.25, bx - 0.06, gz0 + W + 0.55], S + 0.56, S + 0.72, TOOLBOX);
        for (const y of [0.95, 1.25]) cube(b, [bx - 0.26, gz1 - W - 1.5, bx - 0.02, gz1 - W - 0.15], S + y, S + y + 0.03, BENCH);
        for (const [z, c] of [[gz1 - W - 1.35, TOOLBOX], [gz1 - W - 0.95, JOINT], [gz1 - W - 0.55, DOOR]] as [number, THREE.Material][]) cube(b, [bx - 0.22, z, bx - 0.05, z + 0.25], S + 0.98, S + 1.14, c);
      }
      for (let k = 0; k < 3; k++) b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 12).translate(gx1 - W - 0.4, S + 0.09 + k * 0.17, gz1 - W - 0.4), TYRE);
      // A darker course at the walls' foot, and the side door onto the yard
      cube(b, [gx0 - 0.012, gz0 - 0.012, gx1 + 0.012, gz1 + 0.012], S, S + 0.12, BRICK_DARK);
      cube(b, [gx0 + 0.6, gz0 - 0.03, gx0 + 1.2, gz0 - 0.006], S, S + 1.1, SIDE_DOOR);
      cube(b, [gx0 + 1.1, gz0 - 0.045, gx0 + 1.14, gz0 - 0.03], S + 0.5, S + 0.56, METAL);
      // The driveway's bays: a joint across it every couple of tiles and one down its middle; an oil stain by the lane
      if (!low) {
        const [x0, z0, x1, z1] = drive;
        for (let z = z0 + 2.2; z < z1 - 0.5; z += 2.2) flat(b, [x0 + 0.02, z - 0.02, x1 - 0.02, z + 0.02], OVER, JOINT);
        flat(b, [(x0 + x1) / 2 - 0.02, z0 + 0.02, (x0 + x1) / 2 + 0.02, z1 - 0.02], OVER, JOINT);
      }
      const stain = new THREE.CircleGeometry(0.34, 10).rotateX(-Math.PI / 2);
      stain.deleteAttribute('uv');
      b.add(stain.scale(1, 1, 1.5).translate(drive[0] + 0.95, OVER + 0.004, drive[3] - 2.3), STAIN);
      // A mat at the front door
      flat(b, [HOME.door[0] - 0.3, HOME.door[1] - 0.52, HOME.door[0] + 0.3, HOME.door[1] - 0.16], OVER, MAT);
    });
    // The yard's gate onto the driveway, standing open against the garage's wall
    b.detail(() => cube(b, [HOME.house[0] - 0.72, gz0 - 0.07, HOME.house[0] - 0.02, gz0 - 0.02], S + 0.04, S + 0.9, GATE));
    b.build(into, { cast: true, receive: true });
    inside(into, low);
  });
}

const WALLS_IN = toon('#d9d0c2');
const SKIRT = toon('#b7ad9e');
const LAMINATE = toon('#8c6c4c');
const CEILING_IN = toon('#e8e4dc');
const WINDOW = toon('#bfe3f2');
const FRAME = toon('#f1eee8');
const SOFA = toon('#3f3a5a');
const CUSHION = toon('#b0307a');
const RUG = toon('#2f7f88');
const WOOD = toon('#6b4a30');
const WOOD_DARK = toon('#4a3322');
const SCREEN = toon('#15141c');
const UNIT = toon('#4a5a6a');
const WORKTOP = toon('#cfcac4');
const FRIDGE = toon('#dcdce0');
const TRUNK = toon('#2e663c');
const GATE = toon('#7a5a3a');

/** A wall's inner face: a plane from a to c along the wall (x or z), from y0 to y1, facing the way `turn` turns it */
function face(b: Batch, cx: number, cz: number, w: number, y0: number, y1: number, turn: number, m: THREE.Material) {
  const g = new THREE.PlaneGeometry(w, y1 - y0).rotateY(turn);
  g.deleteAttribute('uv');
  b.add(g.translate(cx, (y0 + y1) / 2, cz), m);
}

/** The room inside (home.ts `ROOM`, `FURNITURE`) */
function inside(into: THREE.Object3D, low: boolean) {
  const b = new Batch();
  const [x0, z0, x1, z1] = ROOM;
  const [cx, cz, w, d] = [(x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0];
  const top = S + CEIL;
  // The four walls' inner faces (north faces south into the room, and so on), the floor and the ceiling
  face(b, cx, z0, w, S, top, 0, WALLS_IN);
  face(b, cx, z1, w, S, top, Math.PI, WALLS_IN);
  face(b, x0, cz, d, S, top, Math.PI / 2, WALLS_IN);
  face(b, x1, cz, d, S, top, -Math.PI / 2, WALLS_IN);
  flat(b, ROOM, ON, LAMINATE);
  {
    const g = new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2);
    g.deleteAttribute('uv');
    b.add(g.translate(cx, top, cz), CEILING_IN);
  }
  // The two doors (his own colour on the front one) and a window front and back, a hair off the walls
  const door = toon(HOUSES.find((h) => h.id === HOME_HOUSE)?.colour ?? '#2b4c86');
  const dx = HOME.door[0];
  cube(b, [dx - 0.3, z0 + 0.006, dx + 0.3, z0 + 0.04], S, S + 1.08, door);
  cube(b, [dx - 0.28, z1 - 0.04, dx + 0.28, z1 - 0.006], S, S + 1.05, WOOD_DARK);
  for (const [z, s] of [[z0, 1], [z1, -1]] as [number, number][]) {
    const [wa, wb] = [x0 + 1.75, x1 - 1.2];
    cube(b, [wa, Math.min(z + s * 0.006, z + s * 0.02), wb, Math.max(z + s * 0.006, z + s * 0.02)], S + 0.6, S + 1.02, WINDOW);
    b.detail(() => {
      cube(b, [wa - 0.04, Math.min(z + s * 0.006, z + s * 0.035), wb + 0.04, Math.max(z + s * 0.006, z + s * 0.035)], S + 0.56, S + 0.6, FRAME);
      cube(b, [wa - 0.04, Math.min(z + s * 0.006, z + s * 0.035), wb + 0.04, Math.max(z + s * 0.006, z + s * 0.035)], S + 1.02, S + 1.06, FRAME);
      cube(b, [(wa + wb) / 2 - 0.02, Math.min(z + s * 0.021, z + s * 0.035), (wa + wb) / 2 + 0.02, Math.max(z + s * 0.021, z + s * 0.035)], S + 0.6, S + 1.02, FRAME);
    });
  }
  for (const f of FURNITURE) furnish(b, f, low);
  b.detail(() => {
    // The ceiling's light, a rug under the low table, the skirting along the west wall
    b.add(new THREE.SphereGeometry(0.09, 8, 6).translate(cx - 0.3, top - 0.12, z0 + 1.7), glow(PAL.warm));
    b.add(new THREE.SphereGeometry(0.08, 8, 6).translate(cx + 0.4, top - 0.12, z1 - 1.4), glow(PAL.warm));
    const t = FURNITURE.find((f) => f.kind === 'table')!.rect;
    flat(b, [t[0] - 0.45, t[1] - 0.3, t[2] + 0.45, t[3] + 0.35], OVER, RUG);
    cube(b, [x0, z0, x0 + 0.02, z1], S, S + 0.07, SKIRT);
  });
  // (no shadows: the house over it would put the whole room in the dark)
  b.build(into, { cast: false, receive: false });
}

/** One thing in the room, by its kind */
function furnish(b: Batch, { kind, rect, h }: Furniture, low: boolean) {
  const [x0, z0, x1, z1] = rect;
  const y = S + 0.012;
  if (kind === 'stairs') {
    // Boxed in: a wall the room's colour, the cupboard's door under them on the room's side
    cube(b, rect, S, S + h - 0.004, WALLS_IN);
    b.detail(() => cube(b, [x0 - 0.02, z1 - 0.9, x0 - 0.004, z1 - 0.35], S, S + 0.85, WOOD_DARK));
  } else if (kind === 'sofa') {
    cube(b, [x0, z0 + 0.22, x1, z1], y, S + 0.22, SOFA);
    cube(b, [x0, z0, x1, z0 + 0.22], y, S + h, SOFA);
    for (const x of [x0, x1 - 0.14]) cube(b, [x, z0, x + 0.14, z1], y, S + 0.32, SOFA);
    b.detail(() => {
      for (const x of [x0 + 0.2, x1 - 0.52]) cube(b, [x, z0 + 0.2, x + 0.32, z0 + 0.3], S + 0.22, S + 0.4, CUSHION);
    });
  } else if (kind === 'table') {
    cube(b, [x0, z0, x1, z1], S + h - 0.04, S + h, WOOD);
    b.detail(() => {
      for (const [x, z] of [[x0, z0], [x1 - 0.05, z0], [x0, z1 - 0.05], [x1 - 0.05, z1 - 0.05]]) cube(b, [x, z, x + 0.05, z + 0.05], y, S + h - 0.04, WOOD_DARK);
    });
  } else if (kind === 'tv') {
    cube(b, rect, y, S + h, WOOD_DARK);
    const m = (x0 + x1) / 2;
    cube(b, [m - 0.55, z0 + 0.12, m + 0.55, z0 + 0.17], S + h + 0.06, S + h + 0.7, SCREEN);
    b.detail(() => {
      cube(b, [m - 0.08, z0 + 0.1, m + 0.08, z0 + 0.2], S + h, S + h + 0.06, SCREEN);
      // (a standby light: small, so it glows without lighting the room)
      b.add(new THREE.SphereGeometry(0.015, 5, 4).translate(m + 0.5, S + h + 0.09, z0 + 0.11), glow(PAL.cyan));
    });
  } else if (kind === 'counter') {
    cube(b, [x0, z0 + 0.04, x1, z1], y, S + h - 0.04, UNIT);
    cube(b, [x0 - 0.02, z0, x1, z1], S + h - 0.04, S + h, WORKTOP);
    b.detail(() => {
      // A sink, a hob, the cupboards' doors and a kettle
      cube(b, [x0 + 0.5, z0 + 0.14, x0 + 1.0, z1 - 0.12], S + h, S + h + 0.006, UNIT);
      cube(b, [x1 - 0.85, z0 + 0.14, x1 - 0.35, z1 - 0.12], S + h, S + h + 0.012, SCREEN);
      if (!low) for (let x = x0 + 0.5; x < x1 - 0.2; x += 0.55) cube(b, [x - 0.01, z0 + 0.025, x + 0.01, z0 + 0.04], S + 0.06, S + h - 0.08, WORKTOP);
      b.add(new THREE.CylinderGeometry(0.07, 0.08, 0.16, 8).translate(x0 + 0.25, S + h + 0.08, z0 + 0.3), FRIDGE);
    });
  } else if (kind === 'fridge') {
    cube(b, rect, y, S + h, FRIDGE);
    b.detail(() => cube(b, [x0 + 0.06, z0 - 0.02, x0 + 0.09, z0 - 0.004], S + 0.35, S + 0.75, UNIT));
  } else if (kind === 'dining') {
    cube(b, [x0, z0, x1, z1], S + h - 0.04, S + h, WOOD);
    cube(b, [(x0 + x1) / 2 - 0.05, (z0 + z1) / 2 - 0.05, (x0 + x1) / 2 + 0.05, (z0 + z1) / 2 + 0.05], y, S + h - 0.04, WOOD_DARK);
    b.detail(() => {
      for (const x of [x0 - 0.02, x1 - 0.24]) b.add(new THREE.CylinderGeometry(0.13, 0.11, 0.3, 8).translate(x + 0.13, S + 0.16, z1 + 0.22), WOOD_DARK);
    });
  } else if (kind === 'wardrobe') {
    cube(b, rect, y, S + h, WOOD);
    b.detail(() => {
      const m = (z0 + z1) / 2;
      cube(b, [x0 - 0.012, m - 0.008, x0 - 0.002, m + 0.008], S + 0.05, S + h - 0.05, WOOD_DARK);
      for (const z of [m - 0.07, m + 0.05]) cube(b, [x0 - 0.03, z, x0 - 0.004, z + 0.02], S + 0.5, S + 0.62, METAL);
    });
  } else {
    // The stash: a trunk, a band round its lid
    cube(b, rect, y, S + h, TRUNK);
    b.detail(() => cube(b, [x0 - 0.008, z0 - 0.008, x1 + 0.008, z1 + 0.008], S + h - 0.09, S + h - 0.06, METAL));
  }
}
