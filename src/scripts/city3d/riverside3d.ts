/*
 * The Trenches' riverside on screen (the numbers are riverside.ts): the
 * three landmarks that aren't places, each a site, drawn with the riverside's
 * kit and sign atlas (riversidekit.ts). Part of The Trenches' chunk
 * (trenches3d.ts), loaded as you approach; `placeTrenches()` keeps the
 * outskirts' trees off their blocks at the boot.
 *
 * - **The Wharf**: a glass lobby with a roof terrace out front, and over it
 *   four stacks of glass floors, each shifted off the one under it, white
 *   floor plates edging each, glass rails round the ledges they leave, a lit
 *   crown and a mast.
 * - **The Refinery**: red brick, tall arched windows between brick piers
 *   (lit at night, some loft balconies on them), a corbelled cornice, the
 *   monitor roof down the middle with its clerestory, the round brick
 *   chimney with its stone bands, and REFINERY in yellow neon on a steel
 *   lattice on the roof's front.
 * - **Harbor Stores**: dark brick over a ground floor of round arches (shop
 *   windows lit behind them), hoist beams at the eaves, a ghost sign on the
 *   brick, and the glass penthouse set back on the roof with its thin roof
 *   reaching out over a terrace.
 *
 * Walls with windows come from the city's wall atlas (lit at night with the
 * rest); arches are flat shapes laid a hair proud of the walls, their frames
 * thin extrusions. Fine details are near only; phones leave out the finest.
 */
import * as THREE from 'three';
import { WORLD, archFrame, archPane, box, SIGNS, signPlane } from './riversidekit';
import { Batch, neon, toon } from './kit';
import { ATLAS, INK, METAL, ROOF, kit, glow, soft, type Band, type Kit } from './infill';
import { SLAB as S } from './world';
import { site } from './tilework';
import type { Pt, Rect } from './downtown';
import { REFINERY, STORES, WHARF } from './riverside';

/** Drawing in world numbers with the infill's kit: u is x, v is z */
/** Four walls round a rect from one atlas band (the front is z0, facing north) */
export function walls(k: Kit, band: Band, r: Rect, y0: number, y1: number, off = 0) {
  const [x0, z0, x1, z1] = r;
  k.wall(band, [x0, z0], [x1, z0], y0, y1, [0, -1], off);
  k.wall(band, [x1, z0], [x1, z1], y0, y1, [1, 0], off + 0.25);
  k.wall(band, [x1, z1], [x0, z1], y0, y1, [0, 1], off + 0.5);
  k.wall(band, [x0, z1], [x0, z0], y0, y1, [-1, 0], off + 0.75);
}
/** A flat roof: the slab tucked just inside the walls and a parapet round it */
export function flatRoof(b: Batch, r: Rect, y: number, par: THREE.Material, ph = 0.24, t = 0.12) {
  const [x0, z0, x1, z1] = r;
  box(b, x0 + 0.006, y - 0.04, z0 + 0.006, x1 - 0.006, y, z1 - 0.006, ROOF);
  box(b, x0, y, z0, x1, y + ph, z0 + t, par);
  box(b, x0, y, z1 - t, x1, y + ph, z1, par);
  box(b, x0, y, z0 + t, x0 + t, y + ph, z1 - t, par);
  box(b, x1 - t, y, z0 + t, x1, y + ph, z1 - t, par);
}

/** An arch's outline: w wide, h to its crown, standing on y 0, facing +z */
/* ---------- Materials ---------- */

const PLATE = toon('#dcd8ec');
const RAIL = toon('#c9c4e6');
const BRICK = toon('#7a3b38');
const BRICK_DK = toon('#4f2d30');
const STONE_TRIM = toon('#cdbfa8');
const STEEL = toon('#3a3b4a');
const GLASS = toon('#141a36');
const PLANTER = toon('#6e6a8c');
const SOIL = toon('#3b2a22');
/** Windows that light up at night (dark glass by day) */
const WARM = neon('#ffb867', 0.1, 1.05);

/* ---------- The Wharf ---------- */

function drawWharf(b: Batch, low: boolean) {
  const k = kit(b, WORLD);
  const W = WHARF;
  const lobbyTop = S + W.lobbyH;
  // The lobby: glass all round, its roof a terrace with planters and a rail at the front
  k.all(() => {
    const [x0, z0, x1, z1] = W.lobby;
    k.wall(ATLAS.ground.lobby, [x0, z0], [x1, z0], S, lobbyTop, [0, -1], 0);
    k.wall(ATLAS.ground.lobby, [x1, z0], [x1, z1], S, lobbyTop, [1, 0], 0.3);
    k.wall(ATLAS.wall.glassTeal, [x1, z1], [x0, z1], S, lobbyTop, [0, 1], 0.5);
    k.wall(ATLAS.ground.lobby, [x0, z1], [x0, z0], S, lobbyTop, [-1, 0], 0.7);
  });
  flatRoof(b, W.lobby, lobbyTop, PLATE, 0.12, 0.1);
  const [lx0, lz0, lx1] = W.lobby;
  const terraceEnd = Math.min(...W.stacks.map((s) => s.rect[1]));
  // A canopy over the door, the name over it
  const cx = (lx0 + lx1) / 2;
  box(b, cx - 2, S + 1.05, lz0 - 1.1, cx + 2, S + 1.12, lz0, PLATE);
  box(b, cx - 2.02, S + 1.0, lz0 - 1.12, cx + 2.02, S + 1.05, lz0 - 1.06, soft('#7ff6ff'));
  b.add(signPlane(0, 3.4, 0.42, cx, S + 1.5 - 0.2, lz0 - 0.07), SIGNS);
  b.detail(() => {
    for (let x = lx0 + 0.5; x < lx1 - 0.3; x += low ? 1.6 : 0.8) box(b, x - 0.02, lobbyTop + 0.12, lz0 + 0.06, x + 0.02, lobbyTop + 0.62, lz0 + 0.1, RAIL);
    box(b, lx0 + 0.1, lobbyTop + 0.6, lz0 + 0.05, lx1 - 0.1, lobbyTop + 0.65, lz0 + 0.11, RAIL);
    // Planters with small trees along the terrace's sides, loungers between
    for (const x of [lx0 + 0.6, lx1 - 0.6]) {
      box(b, x - 0.35, lobbyTop, lz0 + 0.5, x + 0.35, lobbyTop + 0.4, terraceEnd - 0.3, PLANTER);
      box(b, x - 0.31, lobbyTop + 0.4, lz0 + 0.54, x + 0.31, lobbyTop + 0.42, terraceEnd - 0.34, SOIL);
      for (let z = lz0 + 0.9; z < terraceEnd - 0.5; z += 1.3) b.add(new THREE.IcosahedronGeometry(0.32, 0).translate(x, lobbyTop + 0.75, z), toon('#36b06c'));
    }
    for (const x of [cx - 1.6, cx + 1.6]) box(b, x - 0.3, lobbyTop, lz0 + 1.2, x + 0.3, lobbyTop + 0.22, lz0 + 2.4, toon('#f3f2f7'));
  });
  // The stacks: glass walls, a white plate at each one's foot reaching past both it and the one under it
  const bands = [ATLAS.wall.glassTeal, ATLAS.wall.glassBlue];
  W.stacks.forEach((st, i) => {
    k.all(() => walls(k, bands[i % 2], st.rect, S + st.y0, S + st.y1, i * 0.37));
    const [x0, z0, x1, z1] = st.rect;
    box(b, x0 - 0.14, S + st.y0 - 0.04, z0 - 0.14, x1 + 0.14, S + st.y0 + 0.1, z1 + 0.14, PLATE);
    // White fins up the corners
    b.detail(() => {
      for (const [x, z] of [
        [x0, z0],
        [x1, z0],
        [x1, z1],
        [x0, z1],
      ] as Pt[])
        box(b, x - 0.07, S + st.y0 + 0.1, z - 0.07, x + 0.07, S + st.y1, z + 0.07, PLATE);
    });
    // The ledge each leaves on the one under it: glass rail along its exposed edge (near)
    const under = W.stacks[i - 1];
    if (under)
      b.detail(() => {
        const [ux0, uz0, ux1, uz1] = under.rect;
        const y = S + st.y0 + 0.1;
        const rails: [number, number, number, number][] = [];
        if (ux0 < x0 - 0.3) rails.push([ux0, uz0, ux0 + 0.05, uz1]);
        if (ux1 > x1 + 0.3) rails.push([ux1 - 0.05, uz0, ux1, uz1]);
        if (uz0 < z0 - 0.3) rails.push([ux0, uz0, ux1, uz0 + 0.05]);
        if (uz1 > z1 + 0.3) rails.push([ux0, uz1 - 0.05, ux1, uz1]);
        for (const [a, c, d, e] of rails) box(b, a, y, c, d, y + 0.55, e, toon('#8fd8e8'));
      });
  });
  const lastStack = W.stacks[W.stacks.length - 1];
  flatRoof(b, lastStack.rect, S + lastStack.y1, PLATE, 0.18, 0.1);
  // The crown: a lit band round a smaller box, a mast on it
  const cr = W.crown;
  k.all(() => walls(k, ATLAS.wall.glassTeal, cr.rect, S + cr.y0, S + cr.y1 - 0.25, 0.6));
  box(b, cr.rect[0] - 0.04, S + cr.y1 - 0.25, cr.rect[1] - 0.04, cr.rect[2] + 0.04, S + cr.y1, cr.rect[3] + 0.04, PLATE);
  box(b, cr.rect[0] - 0.06, S + cr.y1 - 0.4, cr.rect[1] - 0.06, cr.rect[2] + 0.06, S + cr.y1 - 0.34, cr.rect[3] + 0.06, glow('#7ff6ff'));
  const [mx, mz] = [(cr.rect[0] + cr.rect[2]) / 2, (cr.rect[1] + cr.rect[3]) / 2];
  b.add(new THREE.CylinderGeometry(0.03, 0.05, 0.9, 6).translate(mx, S + cr.y1 + 0.45, mz), METAL);
  b.add(new THREE.SphereGeometry(0.06, 6, 4).translate(mx, S + cr.y1 + 0.92, mz), glow('#ff3b3b'));
}

/* ---------- The Refinery ---------- */

function drawRefinery(b: Batch, low: boolean) {
  const k = kit(b, WORLD);
  const R = REFINERY;
  const [x0, z0, x1, z1] = R.hall;
  const top = S + R.h;
  // The brick: the atlas's walls (their windows lit at night), behind the arches on the front
  k.all(() => {
    k.wall(ATLAS.wall.brick, [x1, z0], [x1, z1], S, top, [1, 0], 0.2);
    k.wall(ATLAS.wall.brick, [x1, z1], [x0, z1], S, top, [0, 1], 0.45);
    k.wall(ATLAS.wall.brick, [x0, z1], [x0, z0], S, top, [-1, 0], 0.7);
  });
  // The front: plain brick, tall arched windows in bays between piers, a stone base
  box(b, x0, S, z0, x1, top, z0 + 0.3, BRICK);
  box(b, x0 - 0.05, S, z0 - 0.05, x1 + 0.05, S + 0.55, z0 + 0.3, STONE_TRIM);
  const bays = 8;
  const bw = (x1 - x0) / bays;
  for (let i = 0; i < bays; i++) {
    const cx = x0 + bw * (i + 0.5);
    // Piers between the bays, from the base to the cornice
    if (i > 0) box(b, x0 + bw * i - 0.16, S + 0.55, z0 - 0.14, x0 + bw * i + 0.16, top - 0.55, z0, BRICK);
    const entrance = i === 3 || i === 4;
    const w = bw * 0.58;
    if (entrance) {
      // The way in: one big arch over two bays (drawn at i 3), lit inside, THE REFINERY over it
      if (i === 3) {
        const ex = x0 + bw * 4;
        const ew = bw * 1.25;
        b.add(archPane(ew, 3.4, ex, S + 0.55, z0 - 0.005, 14), WARM);
        b.add(archFrame(ew, 3.4, 0.22, 0.12, ex, S + 0.55, z0, 14), STONE_TRIM);
        box(b, ex - ew / 2 + 0.2, S + 0.55, z0 - 0.03, ex + ew / 2 - 0.2, S + 2.2, z0 - 0.02, GLASS);
        box(b, ex - 0.02, S + 0.55, z0 - 0.04, ex + 0.02, S + 2.2, z0 - 0.03, METAL);
        box(b, ex - 1.9, S + 2.45, z0 - 0.18, ex + 1.9, S + 2.95, z0 - 0.12, INK);
        b.add(signPlane(2, 3.6, 0.42, ex, S + 2.7, z0 - 0.185), SIGNS);
        // Lamps either side of the arch
        for (const o of [-1, 1]) {
          box(b, ex + o * (ew / 2 + 0.45) - 0.05, S + 1.6, z0 - 0.3, ex + o * (ew / 2 + 0.45) + 0.05, S + 1.7, z0, METAL);
          b.add(new THREE.SphereGeometry(0.09, 8, 6).translate(ex + o * (ew / 2 + 0.45), S + 1.58, z0 - 0.3), glow('#ffd27a'));
        }
      }
      // Above the way in, two shorter arches
      b.add(archPane(w, 2.4, cx, S + 4.1, z0 - 0.005), i === 3 ? WARM : GLASS);
      b.add(archFrame(w, 2.4, 0.14, 0.08, cx, S + 4.1, z0), STONE_TRIM);
      continue;
    }
    // A tall arch through two storeys, a sill under it; every other lit at night
    const wh = 4.9;
    b.add(archPane(w, wh, cx, S + 1.0, z0 - 0.005), i % 2 ? WARM : GLASS);
    b.add(archFrame(w, wh, 0.14, 0.08, cx, S + 1.0, z0), STONE_TRIM);
    box(b, cx - w / 2 - 0.2, S + 0.88, z0 - 0.16, cx + w / 2 + 0.2, S + 1.0, z0, STONE_TRIM);
    b.detail(() => {
      // The mullions and a transom across each
      box(b, cx - 0.02, S + 1.0, z0 - 0.02, cx + 0.02, S + 1 + wh - 0.2, z0 - 0.012, METAL);
      for (const y of [S + 2.6, S + 4.2]) box(b, cx - w / 2, y - 0.02, z0 - 0.02, cx + w / 2, y + 0.02, z0 - 0.012, METAL);
      // A loft's balcony on some, at the second storey
      if (!low && (i === 1 || i === 6)) {
        const by = S + 2.62;
        box(b, cx - w / 2 - 0.15, by - 0.05, z0 - 0.55, cx + w / 2 + 0.15, by, z0, STEEL);
        for (let x = cx - w / 2 - 0.12; x <= cx + w / 2 + 0.13; x += 0.16) box(b, x - 0.012, by, z0 - 0.54, x + 0.012, by + 0.5, z0 - 0.52, STEEL);
        box(b, cx - w / 2 - 0.15, by + 0.5, z0 - 0.56, cx + w / 2 + 0.15, by + 0.54, z0 - 0.5, STEEL);
      }
    });
  }
  // The corbelled cornice: a stone band, brick dentils, a deep top course
  box(b, x0 - 0.12, top - 0.55, z0 - 0.22, x1 + 0.12, top - 0.45, z0 + 0.3, STONE_TRIM);
  b.detail(() => {
    for (let x = x0 + 0.1; x < x1 - 0.05; x += low ? 0.6 : 0.3) box(b, x - 0.07, top - 0.45, z0 - 0.2, x + 0.07, top - 0.28, z0, BRICK);
  });
  box(b, x0 - 0.18, top - 0.28, z0 - 0.3, x1 + 0.18, top, z1 + 0.06, BRICK_DK);
  flatRoof(b, R.hall, top, BRICK_DK, 0.3, 0.16);
  // The monitor roof: the clerestory's windows lit at night, a low pitched roof over it
  const mt = S + R.monitorH;
  k.all(() => walls(k, ATLAS.wall.industrial, R.monitor, top, mt, 0.1));
  const [mx0, mz0, mx1, mz1] = R.monitor;
  const pitch = new THREE.CylinderGeometry(0, 1, 1, 4, 1).rotateY(Math.PI / 4);
  pitch.scale((mx1 - mx0 + 0.4) * Math.SQRT1_2, 0.7, (mz1 - mz0 + 0.4) * Math.SQRT1_2);
  b.add(pitch.translate((mx0 + mx1) / 2, mt + 0.35, (mz0 + mz1) / 2), toon('#3c3a52'));
  // The chimney: its plinth, the round brick stack tapering up, stone bands, the cap
  const c = R.chimney;
  box(b, R.plinth[0], S, R.plinth[1], R.plinth[2], S + 1.4, R.plinth[3], BRICK_DK);
  box(b, R.plinth[0] - 0.06, S + 1.4, R.plinth[1] - 0.06, R.plinth[2] + 0.06, S + 1.55, R.plinth[3] + 0.06, STONE_TRIM);
  const ch = c.top - 1.55;
  b.add(new THREE.CylinderGeometry(c.r * 0.72, c.r, ch, low ? 10 : 16, 1, true).translate(c.c[0], S + 1.55 + ch / 2, c.c[1]), BRICK);
  for (const t of [0.35, 0.62, 0.86]) {
    const r = c.r - (c.r * 0.28 * t) + 0.04;
    b.add(new THREE.CylinderGeometry(r, r, 0.18, low ? 10 : 16, 1, true).translate(c.c[0], S + 1.55 + ch * t, c.c[1]), STONE_TRIM);
  }
  b.add(new THREE.CylinderGeometry(c.r * 0.8, c.r * 0.74, 0.3, low ? 10 : 16).translate(c.c[0], S + c.top - 0.15, c.c[1]), INK);
  // REFINERY on a steel lattice on the roof's front: two chords, posts, diagonals, struts back to the roof
  const sg = R.sign;
  const [sy0, sy1] = [S + sg.y0, S + sg.y1];
  for (const y of [sy0, sy0 + 0.14, sy1 - 0.14, sy1]) box(b, sg.x0, y - 0.05, sg.z - 0.05, sg.x1, y + 0.05, sg.z + 0.05, STEEL);
  const step = (sg.x1 - sg.x0) / 10;
  for (let i = 0; i <= 10; i++) {
    const x = sg.x0 + step * i;
    box(b, x - 0.05, top, sg.z - 0.05, x + 0.05, sy1, sg.z + 0.05, STEEL);
    // The struts back to the roof (near)
    b.detail(() => {
      const strut = new THREE.BoxGeometry(0.06, Math.hypot(sy1 - top, 1.6), 0.06).rotateX(Math.atan2(1.6, sy1 - top));
      b.add(strut.translate(x, (sy1 + top) / 2, sg.z + 0.8), STEEL);
      if (i < 10) {
        const d = new THREE.BoxGeometry(0.04, Math.hypot(step, sy1 - sy0), 0.04).rotateZ((i % 2 ? 1 : -1) * Math.atan2(step, sy1 - sy0));
        b.add(d.translate(x + step / 2, (sy0 + sy1) / 2, sg.z + 0.06), STEEL);
      }
    });
  }
  // The letters on their board in front of the lattice, a yellow tube along top and bottom
  b.add(signPlane(1, sg.x1 - sg.x0 - 0.4, sy1 - sy0 - 0.4, (sg.x0 + sg.x1) / 2, (sy0 + sy1) / 2, sg.z - 0.08), SIGNS);
  for (const y of [sy0 + 0.1, sy1 - 0.1]) box(b, sg.x0 + 0.1, y - 0.025, sg.z - 0.12, sg.x1 - 0.1, y + 0.025, sg.z - 0.09, glow('#ffd23f'));
  b.detail(() => {
    // Plant on the roof behind
    for (const u of [0.2, 0.8]) box(b, x0 + (x1 - x0) * u - 0.6, top, z1 - 2.6, x0 + (x1 - x0) * u + 0.6, top + 0.7, z1 - 1.6, METAL);
  });
}

/* ---------- Harbor Stores ---------- */

function drawStores(b: Batch, low: boolean) {
  const k = kit(b, WORLD);
  const H = STORES;
  const [x0, z0, x1, z1] = H.body;
  const top = S + H.h;
  const ground = S + 2.4;
  // Dark brick: the atlas's walls above the arcade and round the back
  k.all(() => {
    k.wall(ATLAS.wall.brickDark, [x0, z0], [x1, z0], ground, top, [0, -1], 0.15);
    k.wall(ATLAS.wall.brickDark, [x1, z0], [x1, z1], S, top, [1, 0], 0.4);
    k.wall(ATLAS.wall.brickDark, [x1, z1], [x0, z1], S, top, [0, 1], 0.65);
    k.wall(ATLAS.wall.brickDark, [x0, z1], [x0, z0], S, top, [-1, 0], 0.9);
  });
  // The arcade: round arches between brick piers, shopfronts lit behind them
  box(b, x0, S, z0, x1, ground, z0 + 0.4, BRICK_DK);
  const n = H.arches;
  const aw = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const cx = x0 + aw * (i + 0.5);
    const w = aw - 0.7;
    b.add(archPane(w, 2.1, cx, S, z0 - 0.005, 12), i % 3 === 1 ? GLASS : WARM);
    b.add(archFrame(w, 2.1, 0.16, 0.1, cx, S, z0, 12), STONE_TRIM);
    b.detail(() => {
      // The shopfront's frame inside the arch: a door and a transom
      box(b, cx - w / 2, S + 1.55, z0 - 0.02, cx + w / 2, S + 1.6, z0 - 0.012, METAL);
      box(b, cx - 0.02, S, z0 - 0.02, cx + 0.02, S + 1.55, z0 - 0.012, METAL);
      // A lamp on each pier
      if (i > 0 && !low) b.add(new THREE.SphereGeometry(0.07, 8, 6).translate(x0 + aw * i, S + 1.75, z0 - 0.22), glow('#ffd27a'));
    });
  }
  box(b, x0 - 0.06, ground - 0.1, z0 - 0.12, x1 + 0.06, ground + 0.04, z0 + 0.4, STONE_TRIM);
  // The corbelled eaves, hoist beams sticking out over the street at every third bay
  box(b, x0 - 0.12, top - 0.3, z0 - 0.2, x1 + 0.12, top, z0 + 0.3, BRICK_DK);
  box(b, x0 - 0.08, top - 0.42, z0 - 0.14, x1 + 0.08, top - 0.3, z0, BRICK);
  b.detail(() => {
    // (not the middle bay: the ghost sign is there)
    for (let i = 1; i < n; i += 3) {
      if (i === Math.floor(n / 2)) continue;
      const cx = x0 + aw * (i + 0.5);
      box(b, cx - 0.07, top - 0.55, z0 - 0.9, cx + 0.07, top - 0.41, z0, toon('#5a3a22'));
      box(b, cx - 0.01, top - 1.4, z0 - 0.86, cx + 0.01, top - 0.55, z0 - 0.84, METAL);
      box(b, cx - 0.06, top - 1.5, z0 - 0.9, cx + 0.06, top - 1.4, z0 - 0.8, METAL);
      // The loading door under it (shut, dark wood)
      box(b, cx - 0.58, top - 2.38, z0 - 0.04, cx + 0.58, top - 0.68, z0 - 0.012, STONE_TRIM);
      box(b, cx - 0.5, top - 2.3, z0 - 0.06, cx + 0.5, top - 0.75, z0 - 0.04, toon('#6a4428'));
      box(b, cx - 0.015, top - 2.3, z0 - 0.07, cx + 0.015, top - 0.75, z0 - 0.06, toon('#3b2418'));
    }
  });
  // The ghost sign painted on the brick, high on the front
  b.add(signPlane(3, 7.6, 0.75, (x0 + x1) / 2, top - 1.05, z0 - 0.008), SIGNS);
  flatRoof(b, H.body, top, BRICK_DK, 0.28, 0.14);
  // The penthouse: glass walls, a white frame, its thin roof reaching out over the terrace in front
  const pt = S + H.penthouseH;
  const [px0, pz0, px1, pz1] = H.penthouse;
  k.all(() => walls(k, ATLAS.wall.glassBlue, H.penthouse, top, pt - 0.12, 0.3));
  // (a dark roof, its white edge a thin fascia: no slab of white to glare)
  box(b, px0 - 0.4, pt - 0.12, pz0 - 1.1, px1 + 0.4, pt, pz1 + 0.3, ROOF);
  box(b, px0 - 0.42, pt - 0.14, pz0 - 1.12, px1 + 0.42, pt + 0.02, pz0 - 1.08, PLATE);
  for (const x of [px0 - 0.42, px1 + 0.38]) box(b, x, pt - 0.14, pz0 - 1.12, x + 0.04, pt + 0.02, pz1 + 0.32, PLATE);
  box(b, px0 - 0.44, pt - 0.18, pz0 - 1.14, px1 + 0.44, pt - 0.14, pz0 - 1.1, soft('#7ff6ff'));
  b.detail(() => {
    for (let x = px0; x <= px1 + 1e-6; x += (px1 - px0) / 8) box(b, x - 0.05, top, pz0 - 0.05, x + 0.05, pt - 0.12, pz0 + 0.02, PLATE);
    // Thin posts holding the roof's edge, the terrace's rail at the parapet, planters and loungers
    for (const x of [px0 - 0.3, px1 + 0.3]) box(b, x - 0.04, top, pz0 - 1.0, x + 0.04, pt - 0.12, pz0 - 0.92, PLATE);
    box(b, x0 + 0.2, top + 0.6, z0 + 0.15, x1 - 0.2, top + 0.65, z0 + 0.2, RAIL);
    for (const x of [px0 + 1.5, (px0 + px1) / 2, px1 - 1.5]) {
      box(b, x - 0.5, top, pz0 - 2.4, x + 0.5, top + 0.4, pz0 - 1.8, PLANTER);
      b.add(new THREE.IcosahedronGeometry(0.42, 0).translate(x, top + 0.85, pz0 - 2.1), toon('#36b06c'));
    }
    for (const x of [px0 + 3.2, px1 - 3.2]) box(b, x - 0.3, top, pz0 - 1.6, x + 0.3, top + 0.22, pz0 - 0.5, toon('#f3f2f7'));
  });
}

/* ---------- The riverside ---------- */

/** The riverside's three landmarks as sites */
export function registerRiverside(low: boolean) {
  const builds: [string, Rect, (b: Batch) => void][] = [
    ['riverside wharf', WHARF.lot, (b) => drawWharf(b, low)],
    ['riverside refinery', REFINERY.lot, (b) => drawRefinery(b, low)],
    ['riverside stores', STORES.lot, (b) => drawStores(b, low)],
  ];
  for (const [id, rect, draw] of builds)
    site(id, rect, (into) => {
      const b = new Batch();
      draw(b);
      b.build(into);
    });
}
