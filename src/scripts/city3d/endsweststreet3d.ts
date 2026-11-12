/*
 * Endswood carried west, the estate round the terraces drawn (docs/ends-west-plan.md Phase 3; the numbers are
 * endsweststreet.ts), sites in the extension's chunk (endswest3d.ts):
 *
 * - **The parade:** four shopfronts from an atlas of their own (`ends-west-shops`, painted the old parade's way,
 *   endsshopfront.ts; lit at night) under a concrete canopy, two storeys of flats over them from the city's wall atlas
 *   (infill.ts), a flat roof inside its parapet, the flats' door and a stair at its west end, the forecourt's flags.
 * - **The playground:** rubber inside a green fence with its gate, swings, a slide, a roundabout, two springers.
 * - **The garages:** the lock-ups' block under a felt roof, their up-and-over doors in faded colours (three left up, the
 *   dark inside showing), the apron's asphalt, a lamp over them.
 * - **The green:** worn grass, bare goalmouths, two goals.
 * - The bin stores, the estate's board (in the atlas), CCTV on its poles, benches.
 *
 * Near only: the fence's bars, the playground's chains and springs, the canopy's brackets, the bins' lids. Phones leave
 * out the finest.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, lit, siteMat, toon } from './kit';
import { site } from './tilework';
import { COVER, KERB } from './palette';
import { ATLAS, INK, METAL, glow, kit, roof, type Frame } from './infill';
import { shopfront, text, type Cell } from './endsshopfront';
import { SLAB_Y, type Pt, type Rect } from './endswood';
import { N_EDGE, RESERVE } from './endswest';
import {
  APRON,
  BENCHES_W,
  BIN_STORES_W,
  BIN_WALL,
  BOARD_W,
  CANOPY_W,
  CCTV_H,
  CCTV_W,
  FLATS_DOOR,
  GARAGES,
  GARAGE_N,
  GARAGE_W,
  GOAL,
  GOALS,
  KICKABOUT,
  PARADE_PARAPET,
  PARADE_W,
  PLAY_FENCE,
  PLAY_W,
  ROUNDABOUT,
  SHOP_H,
  SLIDE,
  SPRINGERS,
  PARADE_STAIR,
  SWINGS,
  UNITS_W,
  unitAt,
  type BinStore,
} from './endsweststreet';

const S = SLAB_Y;
/** On the blocks: the grass and asphalt at the slab's top and 6 mm (as endswest3d.ts's), what lies on them 6 mm more */
const ON = S + 0.006;
const OVER = ON + 0.006;
const CONCRETE = toon('#9c98a2');
const CONCRETE_DARK = toon('#6d6a78');
const SOFFIT = toon('#4c4956');
const ENG_BRICK = toon('#4b3f46');
const BRICK = toon('#6a3a34');
const FELT = toon('#2e2b36');
const ASPHALT = toon('#35323f');
const FLAGS = toon(KERB.grit);
const LAWN = toon(COVER.wornLawn);
const BARE = toon(COVER.bare);
const RUBBER = toon('#5a3f48');
const RAIL = toon('#2f5a3e');
const TIMBER = toon('#7a5a3a');
const STEEL = toon('#6a6d76');
const WHITE = toon('#e8e4d8');
const BLACK = toon('#1c1b22');
const PLAY_RED = toon('#b8322c');
const PLAY_YELLOW = toon('#d9b43a');
const PLAY_BLUE = toon('#2d4f8a');
const DARK = toon('#141319');
const GARAGE_DOORS = ['#4f6a52', '#3f5a7a', '#c9c4b2', '#8a4a32', '#5a5866', '#4f6a52', '#a8a294', '#3f5a7a'].map((c) => toon(c));
const EURO_BIN = toon('#5d6069');

/* ---------- The atlas: the four units and the estate's board ---------- */

const AW = 512;
const UNIT_H = 200;
const CELLS: Record<string, Cell> = {};
let cy = 0;
UNITS_W.forEach((_, k) => {
  CELLS[`unit${k}`] = [0, cy, AW, UNIT_H];
  cy += UNIT_H;
});
CELLS.board = [0, cy, AW, 320];
cy += 320;
const AH = cy;

function drawAtlas(c: CanvasRenderingContext2D, glow_: boolean) {
  c.clearRect(0, 0, AW, AH);
  UNITS_W.forEach((u, k) => shopfront(c, CELLS[`unit${k}`], u.name, u.kind, !!u.shut, glow_, 140 + k));
  const [x, y, w, h] = CELLS.board;
  if (glow_) {
    c.fillStyle = '#000';
    c.fillRect(x, y, w, h);
    return;
  }
  c.fillStyle = '#1f3a5a';
  c.fillRect(x, y, w, h);
  c.strokeStyle = '#e8e2d2';
  c.lineWidth = 6;
  c.strokeRect(x + 10, y + 10, w - 20, h - 20);
  text(c, 'ENDSWOOD ESTATE', x + w / 2, y + 62, w - 60, 54, '#e8e2d2');
  text(c, 'WEST ROWS', x + w / 2, y + 116, w - 120, 34, '#f2c94c');
  const lines = ['Rows 1 - 6 · Footpaths only', 'Parade · Garages · Play area', 'Please take your litter home'];
  lines.forEach((l, i) => text(c, l, x + w / 2, y + 170 + i * 40, w - 70, 26, '#e8e2d2', 700, FONT_DISPLAY));
}
const SHOPS = (() => {
  const map = canvasTex(AW, AH, (c) => drawAtlas(c, false));
  const emissiveMap = canvasTex(AW / 2, Math.ceil(AH / 2), (c) => {
    c.scale(0.5, 0.5);
    drawAtlas(c, true);
  });
  return siteMat('ends-west-shops', lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff' }), 0.08, 0.95));
})();
/** A quad, its middle at (x, y, z), facing n, w by h, a cell of the atlas on it */
function pane(b: Batch, cell: string, x: number, y: number, z: number, n: Pt, w: number, h: number) {
  const [cx, cyy, cw, ch] = CELLS[cell];
  const [u0, u1] = [cx / AW, (cx + cw) / AW];
  const [v1, v0] = [1 - cyy / AH, 1 - (cyy + ch) / AH];
  const g = new THREE.PlaneGeometry(w, h);
  g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v1, u1, v1, u0, v0, u1, v0], 2));
  b.add(g.rotateY(Math.atan2(n[0], n[1])).translate(x, y, z), SHOPS);
}

/* ---------- Helpers ---------- */

/** A rect cut into pieces no longer than about `most` either way */
function pieces([x0, z0, x1, z1]: Rect, most = 15): Rect[] {
  const [nx, nz] = [Math.max(1, Math.ceil((x1 - x0) / most)), Math.max(1, Math.ceil((z1 - z0) / most))];
  const out: Rect[] = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) out.push([x0 + ((x1 - x0) * i) / nx, z0 + ((z1 - z0) * j) / nz, x0 + ((x1 - x0) * (i + 1)) / nx, z0 + ((z1 - z0) * (j + 1)) / nz]);
  return out;
}
function flat(b: Batch, r: Rect, y: number, m: THREE.Material) {
  for (const [x0, z0, x1, z1] of pieces(r)) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2);
    g.deleteAttribute('uv');
    b.add(g.translate((x0 + x1) / 2, y, (z0 + z1) / 2), m);
  }
}
const cube = (b: Batch, [x0, z0, x1, z1]: Rect, y0: number, y1: number, m: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, m);
type V3 = [number, number, number];
/** A thin bar between two points */
function bar(b: Batch, p: V3, q: V3, r: number, m: THREE.Material, seg = 5) {
  const d = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
  const len = d.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  b.add(g.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2), m);
}
const grow = ([x0, z0, x1, z1]: Rect, m: number): Rect => [x0 - m, z0 - m, x1 + m, z1 + m];

/* ---------- The parade ---------- */

function registerParade(low: boolean) {
  const [x0, z0, x1, z1] = PARADE_W.rect;
  site('endswest parade', grow(PARADE_W.rect, 2.2), (into) => {
    const b = new Batch();
    const w = x1 - x0;
    const d = z1 - z0;
    const F: Frame = { M: new THREE.Matrix4().makeTranslation(x0, 0, z1), w, d, L: [x0, z1], t: [1, 0], n: [0, 1] };
    const k = kit(b, F);
    const band = ATLAS.wall.brickDark;
    const top = PARADE_W.top;
    k.all(() => {
      // The flats over the shops on the front, the sides and back full height; the shops' fronts from the atlas
      k.wall(band, [0, 0], [w, 0], S + SHOP_H, top, [0, 1], 0.3);
      k.wall(band, [0, -d], [0, 0], S, top, [-1, 0], 0.55);
      k.wall(band, [w, 0], [w, -d], S, top, [1, 0], 0.8);
      k.wall(band, [w, -d], [0, -d], S, top, [0, -1], 0.05);
      UNITS_W.forEach((_, i) => {
        const [a, c] = unitAt(i);
        pane(b, `unit${i}`, (a + c) / 2, S + SHOP_H / 2, z1 + 0.008, [0, 1], c - a, SHOP_H);
      });
    });
    roof(k, F, top, toon('#3f3036'), PARADE_PARAPET);
    b.detail(() => {
      // The piers between the units, the canopy (its soffit, its lip), its brackets
      for (let i = 0; i <= UNITS_W.length; i++) {
        const u = unitAt(Math.min(i, UNITS_W.length - 1))[i === UNITS_W.length ? 1 : 0] - x0;
        k.lbox(u - 0.07, u + 0.07, S, S + SHOP_H, 0, 0.09, ENG_BRICK);
      }
      const out = CANOPY_W.out;
      k.lbox(-0.2, w + 0.2, CANOPY_W.y, CANOPY_W.y + CANOPY_W.t, 0.005, out, CONCRETE);
      k.lbox(-0.2, w + 0.2, CANOPY_W.y - 0.07, CANOPY_W.y + CANOPY_W.t + 0.07, out, out + 0.08, CONCRETE_DARK);
      const g = new THREE.PlaneGeometry(w + 0.4, out - 0.005).rotateX(Math.PI / 2);
      g.deleteAttribute('uv');
      k.put(g.translate(w / 2, CANOPY_W.y - 0.004, (out + 0.005) / 2), SOFFIT);
      if (!low) for (let u = 0.6; u < w; u += 2.6) k.lbox(u - 0.04, u + 0.04, CANOPY_W.y - 0.25, CANOPY_W.y, 0.005, out - 0.1, CONCRETE_DARK);
      // A string course between the flats' floors, their lit doorway and the stair up the west end
      if (!low) k.lbox(0, w, S + SHOP_H + 1 - 0.03, S + SHOP_H + 1 + 0.03, 0.005, 0.035, CONCRETE);
      const [fx, fz] = FLATS_DOOR;
      cube(b, [fx - 0.05, fz - 0.32, fx - 0.006, fz + 0.32], S, S + 1.1, toon('#2d4f8a'));
      b.add(new THREE.SphereGeometry(0.05, 6, 4).translate(fx - 0.09, S + 1.22, fz), glow(PAL.warm));
      // (the steel stair up the back to the flats' landing: its steps climbing west to east, the landing, a rail)
      const [sx0, sz0, sx1, sz1] = PARADE_STAIR;
      for (let i = 0; i < 8; i++) {
        const a = sx0 + ((sx1 - sx0) * i) / 8;
        cube(b, [a, sz0, a + (sx1 - sx0) / 8 + 0.02, sz1], S + (i + 1) * (SHOP_H / 9), S + (i + 1) * (SHOP_H / 9) + 0.05, STEEL);
      }
      cube(b, [sx1, sz0, sx1 + 1.4, z0 - 0.005], S + SHOP_H - 0.06, S + SHOP_H, STEEL);
      if (!low) bar(b, [sx0, S + 0.9, sz0], [sx1 + 1.4, S + SHOP_H + 0.9, sz0], 0.025, STEEL);
      // The forecourt's flags along the front
      flat(b, [RESERVE[0][0], z1, RESERVE[0][2], N_EDGE - 0.002], ON, FLAGS);
    });
    b.build(into, { cast: true, receive: true });
  });
}

/* ---------- The playground ---------- */

function registerPlay(low: boolean) {
  site('endswest playground', grow(PLAY_W.rect, 1.5), (into) => {
    const b = new Batch();
    flat(b, PLAY_W.rect, OVER, RUBBER);
    b.detail(() => {
      // The fence: posts, a top and bottom rail, bars near only
      for (const [x0, z0, x1, z1] of PLAY_FENCE) {
        const alongX = x1 - x0 > z1 - z0;
        const [a, c] = alongX ? [x0, x1] : [z0, z1];
        const m = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2;
        const at = (u: number, y: number): V3 => (alongX ? [u, y, m] : [m, y, u]);
        for (const y of [S + PLAY_W.fence - 0.04, S + 0.12]) bar(b, at(a, y), at(c, y), 0.025, RAIL);
        const n = Math.max(1, Math.round((c - a) / 1.6));
        for (let i = 0; i <= n; i++) {
          const [px, , pz] = at(a + ((c - a) * i) / n, 0);
          b.box(px - 0.035, S, pz - 0.035, 0.07, PLAY_W.fence, 0.07, RAIL);
        }
        if (!low) for (let u = a + 0.12; u < c; u += 0.12) {
          const [px, , pz] = at(u, 0);
          b.box(px - 0.01, S + 0.12, pz - 0.01, 0.02, PLAY_W.fence - 0.16, 0.02, RAIL);
        }
      }
      // The swings: an A-frame each end, the top bar, two seats on their chains
      const [sx0, sz0, sx1, sz1] = SWINGS;
      const sm = (sz0 + sz1) / 2;
      for (const x of [sx0, sx1]) {
        bar(b, [x, S, sz0], [x, S + 1.4, sm], 0.04, PLAY_RED);
        bar(b, [x, S, sz1], [x, S + 1.4, sm], 0.04, PLAY_RED);
      }
      bar(b, [sx0, S + 1.4, sm], [sx1, S + 1.4, sm], 0.045, PLAY_RED);
      for (const x of [sx0 + (sx1 - sx0) * 0.3, sx0 + (sx1 - sx0) * 0.7]) {
        cube(b, [x - 0.22, sm - 0.1, x + 0.22, sm + 0.1], S + 0.42, S + 0.46, BLACK);
        if (!low) for (const dx of [-0.2, 0.2]) bar(b, [x + dx, S + 0.46, sm], [x + dx, S + 1.4, sm], 0.008, STEEL, 3);
      }
      // The slide: the ladder up to a platform, the chute down
      const [lx0, lz0, lx1, lz1] = SLIDE;
      cube(b, [lx0, lz0, lx1, lz0 + 0.8], S + 0.9, S + 0.98, PLAY_YELLOW);
      for (const x of [lx0 + 0.05, lx1 - 0.05]) for (const z of [lz0 + 0.05, lz0 + 0.75]) bar(b, [x, S, z], [x, S + 1.3, z], 0.035, PLAY_BLUE);
      for (let i = 1; i < 5; i++) cube(b, [lx0 + 0.1, lz0 - 0.02, lx1 - 0.1, lz0 + 0.02], S + i * 0.2, S + i * 0.2 + 0.03, PLAY_BLUE);
      const chute = new THREE.BoxGeometry(lx1 - lx0 - 0.3, 0.05, lz1 - lz0 - 0.8);
      chute.rotateX(Math.atan2(0.9, lz1 - lz0 - 0.8));
      b.add(chute.translate((lx0 + lx1) / 2, S + 0.47, (lz0 + 0.8 + lz1) / 2), PLAY_RED);
      // The roundabout, the springers
      const [rx, rz] = ROUNDABOUT.c;
      b.add(new THREE.CylinderGeometry(ROUNDABOUT.r, ROUNDABOUT.r, 0.08, low ? 12 : 20).translate(rx, S + 0.24, rz), PLAY_BLUE);
      b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6).translate(rx, S + 0.5, rz), PLAY_YELLOW);
      for (const a of [0, 1, 2, 3]) {
        const [cx, cz] = [Math.cos((a * Math.PI) / 2) * 0.55, Math.sin((a * Math.PI) / 2) * 0.55];
        bar(b, [rx + cx, S + 0.28, rz + cz], [rx + cx * 0.3, S + 0.75, rz + cz * 0.3], 0.025, PLAY_YELLOW);
      }
      SPRINGERS.forEach(([x, z], i) => {
        b.add(new THREE.CylinderGeometry(0.1, 0.1, 0.32, low ? 6 : 10, 1, true).translate(x, S + 0.16, z), STEEL);
        cube(b, [x - 0.3, z - 0.12, x + 0.3, z + 0.12], S + 0.32, S + 0.56, i ? PLAY_YELLOW : PLAY_RED);
      });
    });
    b.build(into, { cast: true, receive: true });
  });
}

/* ---------- The garages, the apron and the green ---------- */

function registerGarages(low: boolean) {
  const [gx0, gz0, gx1, gz1] = GARAGES.rect;
  site('endswest garages', grow([APRON[0], APRON[1], gx1, APRON[3]], 1), (into) => {
    const b = new Batch();
    flat(b, APRON, ON, ASPHALT);
    b.detail(() => {
      cube(b, GARAGES.rect, S, S + GARAGES.h, CONCRETE);
      cube(b, [gx0 - 0.08, gz0 - 0.08, gx1 + 0.08, gz1 + 0.08], S + GARAGES.h, S + GARAGES.h + 0.1, FELT);
      for (let i = 0; i < GARAGE_N; i++) {
        const z = gz0 + i * GARAGE_W;
        // The piers either side, the door up or down
        cube(b, [gx0 - 0.06, z, gx0, z + 0.14], S, S + GARAGES.h, CONCRETE_DARK);
        if (GARAGES.open.includes(i)) {
          cube(b, [gx0 - 0.015, z + 0.2, gx0 - 0.005, z + GARAGE_W - 0.06], S, S + 1.12, DARK);
          cube(b, [gx0 - 0.75, z + 0.2, gx0 - 0.02, z + GARAGE_W - 0.06], S + 1.14, S + 1.18, GARAGE_DOORS[i]);
        } else {
          cube(b, [gx0 - 0.04, z + 0.2, gx0 - 0.006, z + GARAGE_W - 0.06], S, S + 1.12, GARAGE_DOORS[i]);
          if (!low) cube(b, [gx0 - 0.055, z + GARAGE_W / 2 - 0.1, gx0 - 0.04, z + GARAGE_W / 2 + 0.1], S + 0.5, S + 0.56, METAL);
        }
      }
      cube(b, [gx0 - 0.06, gz1 - 0.14, gx0, gz1], S, S + GARAGES.h, CONCRETE_DARK);
      // A lamp over the middle door, its glow at night
      b.add(new THREE.SphereGeometry(0.07, 6, 4).translate(gx0 - 0.12, S + 1.32, (gz0 + gz1) / 2), glow(PAL.warm));
    });
    b.build(into, { cast: true, receive: true });
  });
  site('endswest green', grow(KICKABOUT, 0.5), (into) => {
    const b = new Batch();
    flat(b, KICKABOUT, ON, LAWN);
    b.detail(() => {
      for (const { at: [x, z], faces } of GOALS) {
        // A bare goalmouth, the posts, the crossbar, the back frame
        flat(b, [x - 1.6, z + (faces > 0 ? 0 : -2.6), x + 1.6, z + (faces > 0 ? 2.6 : 0)], OVER, BARE);
        for (const s of [-1, 1]) {
          const px = x + (s * GOAL.w) / 2;
          bar(b, [px, S, z], [px, S + GOAL.h, z], 0.04, WHITE, 8);
          bar(b, [px, S + GOAL.h, z], [px, S, z - faces * GOAL.d], 0.02, WHITE);
        }
        bar(b, [x - GOAL.w / 2, S + GOAL.h, z], [x + GOAL.w / 2, S + GOAL.h, z], 0.04, WHITE, 8);
        bar(b, [x - GOAL.w / 2, S + 0.02, z - faces * GOAL.d], [x + GOAL.w / 2, S + 0.02, z - faces * GOAL.d], 0.02, WHITE);
      }
    });
    b.build(into, { cast: true, receive: true });
  });
}

/* ---------- The north reserve's lawn, the bin stores, the board, CCTV, benches ---------- */

function binStore(b: Batch, { rect: [x0, z0, x1, z1], open }: BinStore) {
  const t = BIN_WALL.t;
  const walls: Record<string, Rect> = { n: [x0, z0, x1, z0 + t], s: [x0, z1 - t, x1, z1], w: [x0, z0, x0 + t, z1], e: [x1 - t, z0, x1, z1] };
  for (const [k, r] of Object.entries(walls)) if (k !== open) cube(b, r, S, S + BIN_WALL.h, BRICK);
  // Three big bins inside, their lids
  const alongX = x1 - x0 > z1 - z0;
  for (let i = 0; i < 3; i++) {
    const f = (i + 0.5) / 3;
    const [cx, cz] = alongX ? [x0 + (x1 - x0) * f, (z0 + z1) / 2] : [(x0 + x1) / 2, z0 + (z1 - z0) * f];
    const [hw, hd] = alongX ? [0.32, 0.45] : [0.45, 0.32];
    cube(b, [cx - hw, cz - hd, cx + hw, cz + hd], S, S + 0.8, EURO_BIN);
    cube(b, [cx - hw - 0.02, cz - hd - 0.02, cx + hw + 0.02, cz + hd + 0.02], S + 0.8, S + 0.86, BLACK);
  }
}
function registerBits(low: boolean) {
  const [nx0, nz0, nx1] = RESERVE[0];
  site('endswest reserve north', [nx0 - 1, nz0 - 1, nx1 + 1, PARADE_W.rect[1]], (into) => {
    const b = new Batch();
    flat(b, [nx0, nz0, nx1, PARADE_W.rect[1] - 0.2], ON, LAWN);
    b.detail(() => {
      binStore(b, BIN_STORES_W[0]);
      for (const { at: [x, z], faces: [fx, fz] } of BENCHES_W.slice(0, 2)) bench(b, x, z, fx, fz);
    });
    b.build(into, { cast: true, receive: true });
  });
  site('endswest reserve bits', [BOARD_W.at[0] - 2, N_EDGE - 2, RESERVE[1][2] + 1, KICKABOUT[1] + 30], (into) => {
    const b = new Batch();
    b.detail(() => {
      binStore(b, BIN_STORES_W[1]);
      for (const { at: [x, z], faces: [fx, fz] } of BENCHES_W.slice(2)) bench(b, x, z, fx, fz);
      // The estate's board on its two legs, facing the Close
      const [bx, bz] = BOARD_W.at;
      for (const s of [-1, 1]) cube(b, [bx + (s * BOARD_W.w) / 2 - 0.05, bz - 0.05, bx + (s * BOARD_W.w) / 2 + 0.05, bz + 0.05], S, S + BOARD_W.legs + BOARD_W.h, STEEL);
      cube(b, [bx - BOARD_W.w / 2, bz - 0.04, bx + BOARD_W.w / 2, bz - 0.005], S + BOARD_W.legs, S + BOARD_W.legs + BOARD_W.h, INK);
      pane(b, 'board', bx, S + BOARD_W.legs + BOARD_W.h / 2, bz + 0.004, [0, 1], BOARD_W.w, BOARD_W.h);
      // CCTV: a pole, the camera's arm and its housing looking over its ground
      for (const { at: [x, z], looks } of CCTV_W) {
        b.add(new THREE.CylinderGeometry(0.05, 0.06, CCTV_H, low ? 5 : 8, 1, true).translate(x, S + CCTV_H / 2, z), STEEL);
        const [dx, dz] = [Math.sin(looks), Math.cos(looks)];
        bar(b, [x, S + CCTV_H - 0.1, z], [x + dx * 0.35, S + CCTV_H - 0.1, z + dz * 0.35], 0.025, STEEL);
        const cam = new THREE.BoxGeometry(0.14, 0.14, 0.34).rotateX(0.35).rotateY(looks);
        b.add(cam.translate(x + dx * 0.45, S + CCTV_H - 0.2, z + dz * 0.45), WHITE);
      }
    });
    b.build(into, { cast: true, receive: true });
  });
}
/** A bench at (x, z) facing (fx, fz): concrete legs, a timber seat and back */
function bench(b: Batch, x: number, z: number, fx: number, fz: number) {
  const alongX = fx === 0;
  const [w, d] = alongX ? [1.5, 0.45] : [0.45, 1.5];
  for (const k of [-0.55, 0.55]) b.box(x + (alongX ? k : 0) - 0.08, S, z + (alongX ? 0 : k) - 0.08, 0.16, 0.42, 0.16, CONCRETE);
  b.box(x - w / 2, S + 0.42, z - d / 2, w, 0.06, d, TIMBER);
  const [kx, kz] = [x - fx * 0.2, z - fz * 0.2];
  b.box(kx - (alongX ? w / 2 : 0.03), S + 0.5, kz - (alongX ? 0.03 : w / 2), alongX ? w : 0.06, 0.35, alongX ? 0.06 : w, TIMBER);
}

export function registerStreetWest(low: boolean) {
  registerParade(low);
  registerPlay(low);
  registerGarages(low);
  registerBits(low);
}
