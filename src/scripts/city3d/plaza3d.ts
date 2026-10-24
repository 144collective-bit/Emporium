/*
 * Uptown's plaza on screen (docs/finance-plan.md Phase 3; the numbers are
 * plaza.ts), part of Uptown's chunk (uptown3d.ts), as sites:
 *
 * - **The ground:** granite paving in big slabs (one small texture laid on in
 *   world units), darker inlays along both axes and a ring round the pool,
 *   grates under the trees, planters by the spire.
 * - **The forecourt:** the pool's stone rim and water, its jets (near), the
 *   cross on its stepped plinth in gold that glows softly at night as if
 *   floodlit, uplights at its foot; the water wall's stone steps with water
 *   sheeting down them (`FALLS`, a streaked texture its tick scrolls) into
 *   the trough; the canopies (glass on steel posts, a lit strip under each
 *   edge), the lunch tables under them, string lights between them, benches
 *   facing the pool.
 * - **The terraces:** granite, the café kiosk (its hatch lit, an awning, its
 *   name on a board from one small atlas), tables under umbrellas.
 * - **The LED ribbon** round the podium across the street: made-up words on
 *   one texture its tick scrolls (`RIBBON_TEX`).
 *
 * Moving water and words only on the main thread's tick (nothing moves under
 * reduced motion); everything else is fixed geometry in the shared materials.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, FONT_MONO, canvasTex, lit, neon, siteMat, toon } from './kit';
import { SLAB, type Tick } from './world';
import { site } from './tilework';
import { LAYBYS, PLAZA_BLOCK, UPTOWN_BLOCKS, type Pt, type Rect } from './uptown';
import { SPIRE_LOT } from './highrise';
import {
  BENCHES,
  CENTRE,
  CHAIR,
  CROSS,
  KIOSKS,
  KIOSK_H,
  PLANTERS,
  PLANTER_H,
  POOL,
  SEAT_Y,
  TABLES,
  TERRACES,
  TERRACE_TABLES,
  TERRACE_TREES,
  TREES,
  WALL_RUNS,
  WATER_WALL,
} from './plaza';
import { CANOPIES, CANOPY_H, KIOSK_NAMES, POSTS, RIBBON, RIBBON_TOWER, RIBBON_WORDS } from './plazadress';

/** The paving's top, the inlays' over it, the grates' over them (nothing flush) */
const PAVE = SLAB + 0.012;
const INLAY = PAVE + 0.006;
const GRATE = INLAY + 0.006;

const STONE = toon('#d9d1c2');
const STONE_DARK = toon('#8c8499');
const CAP = toon('#ece6da');
const WATER = toon('#3f9fd2');
const SPRAY = toon('#d4f1ff');
const STEEL = toon('#2a2740');
const GLASS = toon('#a7d8ec');
const WOOD = toon('#8a5a3c');
const IRON = toon('#1b1830');
const SOIL = toon('#5a4436');
const SHRUB = toon('#2f7a45');
const TABLE = toon('#f2efe8');
const KIOSK = toon('#24223a');
const AWNINGS = [toon('#c2347a'), toon('#1f8fa8')];
const UMBRELLAS = [toon('#f4ead6'), toon('#c2347a')];
const UPLIGHT = neon('#ffe2a8', 0.4, 1.3);
const STRIP = neon('#fff0d0', 0.3, 1.3);
const HATCH = neon('#ffd9a0', 0.5, 1.3);
const BULB = neon('#ffd98a', 0.6, 2.4);
/** The cross: gold, glowing softly at night as if floodlit (its own material) */
const GOLD = siteMat('plaza-gold', lit(new THREE.MeshToonMaterial({ color: '#d8ae48', emissive: '#ffcf70' }), 0, 0.32));

/** The granite: big slabs, two to a texture's side, laid on every 4 tiles */
export const GRANITE_TILE = 4;
export const granite = siteMat(
  'plaza-granite',
  (() => {
    const tex = canvasTex(256, 256, (c) => {
      let s = 7;
      const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          c.fillStyle = (i + j) % 2 ? '#c9c2d2' : '#bdb5c8';
          c.fillRect(i * 128, j * 128, 128, 128);
          // Speckle
          for (let k = 0; k < 420; k++) {
            c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(40,30,60,0.22)';
            c.fillRect(i * 128 + r() * 128, j * 128 + r() * 128, 2, 2);
          }
          // The joint
          c.fillStyle = '#8f879e';
          c.fillRect(i * 128, j * 128, 128, 2);
          c.fillRect(i * 128, j * 128, 2, 128);
        }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshToonMaterial({ map: tex });
  })()
);

/** The water wall's falls: streaks running down, scrolled by the tick; glowing a little at night as if lit from below */
const FALLS = (() => {
  const tex = canvasTex(64, 256, (c) => {
    c.fillStyle = '#4aa7d6';
    c.fillRect(0, 0, 64, 256);
    let s = 3;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 40; k++) {
      c.fillStyle = r() < 0.5 ? 'rgba(235,250,255,0.7)' : 'rgba(150,215,245,0.8)';
      c.fillRect(r() * 64, r() * 256, 1 + r() * 2, 30 + r() * 90);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return siteMat('plaza-falls', lit(new THREE.MeshToonMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex }), 0.05, 0.55));
})();

/** The kiosks' names: one small atlas, a row each */
const SIGNS = (() => {
  const tex = canvasTex(512, 128, (c) => {
    KIOSK_NAMES.forEach((name, i) => {
      const y = i * 64;
      c.fillStyle = '#14121f';
      c.fillRect(0, y, 512, 64);
      c.fillStyle = '#ffffff';
      c.font = `800 40px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(name, 256, y + 30);
      const g = c.createLinearGradient(120, 0, 392, 0);
      g.addColorStop(0, '#ff2bd6');
      g.addColorStop(1, '#00e1ff');
      c.fillStyle = g;
      c.fillRect(140, y + 54, 232, 3);
    });
  });
  return siteMat('plaza-signs', lit(new THREE.MeshBasicMaterial({ map: tex, color: '#ffffff' }), 1, 1.4));
})();

/** The LED ribbon's words, one texture `RIBBON_LEN` long, scrolled by the tick */
const RIBBON_LEN = (RIBBON.y1 - RIBBON.y0) * 64;
const RIBBON_TEX = (() => {
  const tex = canvasTex(4096, 64, (c) => {
    c.fillStyle = '#05040b';
    c.fillRect(0, 0, 4096, 64);
    c.font = `700 40px ${FONT_MONO}`;
    c.textBaseline = 'middle';
    const cols = ['#00e1ff', '#ff5ce0', '#ffffff', '#ffd23f'];
    let x = 24;
    // (as many words as fit, each followed by a diamond)
    for (let i = 0; x < 4000; i++) {
      const w = RIBBON_WORDS[i % RIBBON_WORDS.length];
      const width = c.measureText(w).width;
      if (x + width > 4060) break;
      c.fillStyle = cols[i % cols.length];
      c.fillText(w, x, 34);
      x += width + 30;
      c.fillStyle = '#8000ff';
      c.fillText('◆', x, 34);
      x += 70;
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
})();
const RIBBON_MAT = siteMat('plaza-ribbon', lit(new THREE.MeshBasicMaterial({ map: RIBBON_TEX, color: '#ffffff' }), 0.85, 1));

/* ---------- Helpers ---------- */

/** A flat quad over a rect at y, its uv in world units / `scale` (the boulevard's too, boulevard3d.ts) */
export function quad(r: Rect, y: number, scale = 1) {
  const [x0, z0, x1, z1] = r;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([x0 / scale, z0 / scale, x0 / scale, z1 / scale, x1 / scale, z1 / scale, x1 / scale, z0 / scale], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}
export const box = (b: Batch, [x0, z0, x1, z1]: Rect, y0: number, y1: number, mat: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, mat);
/** A thin box from a to b (points in x, y, z, along a line with x fixed or changing) */
export function rod(b: Batch, a: number[], c: number[], w: number, mat: THREE.Material) {
  const [dx, dy, dz] = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const len = Math.hypot(dx, dy, dz);
  const g = new THREE.BoxGeometry(w, w, len);
  g.rotateX(-Math.atan2(dy, Math.hypot(dx, dz)));
  g.rotateY(Math.atan2(dx, dz));
  b.add(g.translate((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2), mat);
}

/** A bench standing at y, the sitter facing ry, its seat SEAT_Y up (near only) */
export function bench(b: Batch, at: Pt, ry: number, y0 = PAVE) {
  const g = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z).rotateY(ry).translate(at[0], y0, at[1]);
  b.detail(() => {
    b.add(g(1.5, 0.06, 0.36, 0, SEAT_Y - 0.06, 0), WOOD);
    b.add(g(1.5, 0.32, 0.05, 0, SEAT_Y + 0.02, -0.18), WOOD);
    for (const sx of [-0.62, 0.62]) b.add(g(0.06, SEAT_Y - 0.06, 0.34, sx, 0, 0), IRON);
  });
}

/** A café table standing at y with a chair either side along z (along x: `alongX`) (near only), an umbrella over it on the terraces */
export function table(b: Batch, [x, z]: Pt, umbrella: THREE.Material | null, y = PAVE, alongX = false) {
  const PAVE = y;
  b.detail(() => {
    b.add(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 14).translate(x, PAVE + 0.55, z), TABLE);
    b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.53, 6, 1, true).translate(x, PAVE + 0.27, z), IRON);
    b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 10).translate(x, PAVE + 0.01, z), IRON);
    for (const s of [-1, 1]) {
      const [cx, cz] = alongX ? [x + s * CHAIR, z] : [x, z + s * CHAIR];
      b.box(cx - 0.2, PAVE + SEAT_Y - 0.04, cz - 0.2, 0.4, 0.04, 0.4, IRON);
      if (alongX) b.box(cx + s * 0.18, PAVE + SEAT_Y, cz - 0.2, 0.04, 0.34, 0.4, IRON);
      else b.box(cx - 0.2, PAVE + SEAT_Y, cz + s * 0.18, 0.4, 0.34, 0.04, IRON);
      for (const [lx, lz] of [
        [-0.17, -0.17],
        [0.17, -0.17],
        [-0.17, 0.17],
        [0.17, 0.17],
      ])
        b.box(cx + lx - 0.015, PAVE, cz + lz - 0.015, 0.03, SEAT_Y - 0.04, 0.03, IRON);
    }
  });
  if (umbrella) {
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 1.9, 6, 1, true).translate(x, PAVE + 0.95, z), IRON);
    b.add(new THREE.ConeGeometry(1.05, 0.38, 8, 1, true).translate(x, PAVE + 1.98, z), umbrella);
  }
}

/* ---------- The ground ---------- */

function ground(b: Batch) {
  const [x0, z0, x1, z1] = UPTOWN_BLOCKS.find((q) => q.id === PLAZA_BLOCK)!.rect;
  // Granite, in two pieces (nothing much longer than a tile), and on the terraces
  const xm = SPIRE_LOT[0];
  // (the taxi rank's bay cut into its east side, behind the spire: uptown.ts LAYBYS)
  const rank = LAYBYS.filter((l) => l.block === PLAZA_BLOCK && l.side === 'e').map((l) => [l.from, l.to, x1 - l.depth] as const)[0];
  const east: Rect[] = rank ? [[xm, z0, x1, rank[0]], [xm, rank[0], rank[2], rank[1]], [xm, rank[1], x1, z1]] : [[xm, z0, x1, z1]];
  for (const r of [[x0, z0, xm, z1], ...east, ...TERRACES] as Rect[]) b.add(quad(r, PAVE, GRANITE_TILE), granite);
  // Darker inlays along both axes and a ring round the pool
  const [cx, cz] = CENTRE;
  const rr = POOL.r + POOL.w;
  b.add(quad([cx - 0.3, z0, cx + 0.3, cz - rr - 1.2], INLAY), STONE_DARK);
  b.add(quad([cx - 0.3, cz + rr + 1.2, cx + 0.3, z1], INLAY), STONE_DARK);
  b.add(quad([WATER_WALL.trough, cz - 0.3, cx - rr - 1.2, cz + 0.3], INLAY), STONE_DARK);
  b.add(quad([cx + rr + 1.2, cz - 0.3, xm, cz + 0.3], INLAY), STONE_DARK);
  b.add(new THREE.RingGeometry(rr + 0.9, rr + 1.2, 40).rotateX(-Math.PI / 2).translate(cx, INLAY, cz), STONE_DARK);
  // Grates under the trees
  for (const [x, z] of [...TREES, ...TERRACE_TREES]) {
    b.add(quad([x - 0.65, z - 0.65, x + 0.65, z + 0.65], GRATE), IRON);
    b.detail(() => b.add(quad([x - 0.5, z - 0.5, x + 0.5, z + 0.5], GRATE + 0.005), SOIL));
  }
  // Planters by the spire: stone, a cap, soil and shrubs (near)
  for (const r of PLANTERS) {
    box(b, r, SLAB, SLAB + PLANTER_H - 0.05, STONE);
    box(b, [r[0] - 0.04, r[1] - 0.04, r[2] + 0.04, r[3] + 0.04], SLAB + PLANTER_H - 0.05, SLAB + PLANTER_H, CAP);
    b.add(quad([r[0] + 0.08, r[1] + 0.08, r[2] - 0.08, r[3] - 0.08], SLAB + PLANTER_H + 0.006), SOIL);
    b.detail(() => {
      for (let x = r[0] + 0.4; x < r[2] - 0.2; x += 0.65)
        b.add(new THREE.IcosahedronGeometry(0.3, 0).scale(1, 0.75, 1).translate(x, SLAB + PLANTER_H + 0.18, (r[1] + r[3]) / 2), SHRUB);
    });
  }
}

/* ---------- The forecourt ---------- */

function pool(b: Batch) {
  const [cx, cz] = CENTRE;
  const { r, rim, w, water } = POOL;
  const top = SLAB + rim;
  b.add(new THREE.CylinderGeometry(r + w, r + w, rim, 40, 1, true).translate(cx, SLAB + rim / 2, cz), STONE);
  b.add(new THREE.CylinderGeometry(r, r, rim, 40, 1, true).translate(cx, SLAB + rim / 2, cz), STONE);
  b.add(new THREE.RingGeometry(r - 0.01, r + w + 0.01, 40).rotateX(-Math.PI / 2).translate(cx, top + 0.004, cz), CAP);
  b.add(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2).translate(cx, SLAB + water, cz), WATER);
  // Jets on the diagonals (near)
  b.detail(() => {
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const [x, z] = [cx + Math.sin(a) * 2.45, cz + Math.cos(a) * 2.45];
      b.add(new THREE.ConeGeometry(0.12, 0.9, 8, 1, true).translate(x, SLAB + water + 0.45, z), SPRAY);
      b.add(new THREE.SphereGeometry(0.11, 8, 6).translate(x, SLAB + water + 0.92, z), SPRAY);
    }
  });
  // The plinth, three steps up out of the water
  let y = SLAB + water;
  for (const [side, t] of CROSS.steps) {
    box(b, [cx - side / 2, cz - side / 2, cx + side / 2, cz + side / 2], y, SLAB + t, STONE);
    box(b, [cx - side / 2 - 0.03, cz - side / 2 - 0.03, cx + side / 2 + 0.03, cz + side / 2 + 0.03], SLAB + t - 0.05, SLAB + t, CAP);
    y = SLAB + t;
  }
  // Uplights on the middle step's corners
  const up = CROSS.steps[1][0] / 2 - 0.16;
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    b.box(cx + sx * up - 0.09, SLAB + CROSS.steps[1][1], cz + sz * up - 0.09, 0.18, 0.1, 0.18, UPLIGHT);
  // Benches facing the pool
  for (const q of BENCHES) bench(b, q.at, q.ry);
}

/**
 * The cross: a collar at its foot, the shaft, the arms across the axis (along x); in a Batch of its own that casts
 * shadows but takes none (the shadow map's steps would stripe its gold)
 */
function cross(b: Batch) {
  const [cx, cz] = CENTRE;
  const base = SLAB + CROSS.steps[2][1];
  const hw = CROSS.w / 2;
  box(b, [cx - hw - 0.12, cz - hw - 0.12, cx + hw + 0.12, cz + hw + 0.12], base, base + 0.32, GOLD);
  box(b, [cx - hw, cz - hw, cx + hw, cz + hw], base + 0.32, SLAB + CROSS.top, GOLD);
  box(b, [cx - CROSS.span / 2, cz - hw, cx - hw, cz + hw], SLAB + CROSS.arm - hw, SLAB + CROSS.arm + hw, GOLD);
  box(b, [cx + hw, cz - hw, cx + CROSS.span / 2, cz + hw], SLAB + CROSS.arm - hw, SLAB + CROSS.arm + hw, GOLD);
  return b;
}

function waterWall(b: Batch) {
  const { x, steps, trough, rim } = WATER_WALL;
  for (const [z0, z1] of WALL_RUNS) {
    let back = x;
    steps.forEach(([front, top], k) => {
      box(b, [back, z0, front, z1], SLAB, SLAB + top, STONE);
      // The water on its tread (the top step's a channel), and falling down its face to the next
      b.add(quad([back + (k ? 0 : 0.08), z0 + 0.1, front - 0.02, z1 - 0.1], SLAB + top + 0.008), WATER);
      const below = k < steps.length - 1 ? steps[k + 1][1] : POOL.water;
      const g = new THREE.PlaneGeometry(z1 - z0 - 0.2, top - below);
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (z0 + uv.getX(i) * (z1 - z0)) / 2, (below + uv.getY(i) * (top - below)) / 1.5);
      b.add(g.rotateY(Math.PI / 2).translate(front + 0.012, SLAB + (top + below) / 2, (z0 + z1) / 2), FALLS);
      back = front;
    });
    // The trough: its walls and water
    const t0 = steps.at(-1)![0];
    box(b, [trough - 0.2, z0, trough, z1], SLAB, SLAB + rim, STONE);
    box(b, [t0, z0 - 0.2, trough, z0], SLAB, SLAB + rim, STONE);
    box(b, [t0, z1, trough, z1 + 0.2], SLAB, SLAB + rim, STONE);
    box(b, [trough - 0.23, z0 - 0.23, trough + 0.03, z1 + 0.23], SLAB + rim, SLAB + rim + 0.04, CAP);
    b.add(quad([t0, z0, trough - 0.2, z1], SLAB + POOL.water), WATER);
    // A cap along the top step
    box(b, [x - 0.04, z0 - 0.04, steps[0][0] + 0.04, z1 + 0.04], SLAB + steps[0][1], SLAB + steps[0][1] + 0.06, CAP);
  }
}

function canopies(b: Batch, low: boolean) {
  for (const c of CANOPIES) {
    const [x0, z0, x1, z1] = c;
    // Posts along both long edges
    for (const x of POSTS) for (const z of [z0 + 0.15, z1 - 0.15]) b.box(x - 0.07, SLAB, z - 0.07, 0.14, CANOPY_H, 0.14, STEEL);
    // The frame and the glass in it, a lit strip under each long edge
    box(b, [x0, z0, x1, z1], SLAB + CANOPY_H, SLAB + CANOPY_H + 0.12, STEEL);
    box(b, [x0 + 0.15, z0 + 0.15, x1 - 0.15, z1 - 0.15], SLAB + CANOPY_H + 0.12, SLAB + CANOPY_H + 0.16, GLASS);
    for (const z of [z0 + 0.1, z1 - 0.16]) b.box(x0 + 0.2, SLAB + CANOPY_H - 0.04, z, x1 - x0 - 0.4, 0.04, 0.06, STRIP);
  }
  for (const t of TABLES) table(b, t, null);
  // String lights across the forecourt from post to post, the north canopy's inner edge to the south's
  const za = CANOPIES[0][3] - 0.15;
  const zb = CANOPIES[1][1] + 0.15;
  const y = SLAB + CANOPY_H - 0.02;
  const N = 16;
  for (const x of POSTS) {
    const pts = Array.from({ length: N + 1 }, (_, i) => {
      const u = i / N;
      return [x, y - 0.6 * 4 * u * (1 - u), za + (zb - za) * u];
    });
    b.detail(() => {
      for (let i = 1; i <= N; i++) rod(b, pts[i - 1], pts[i], 0.02, IRON);
    });
    for (let i = 1; i < N; i += low ? 2 : 1) b.add(new THREE.OctahedronGeometry(0.07, 0).translate(pts[i][0], pts[i][1] - 0.08, pts[i][2]), BULB);
  }
}

/* ---------- The terraces ---------- */

function terrace(b: Batch, i: number) {
  {
    const k = KIOSKS[i];
    const [x0, z0, x1, z1] = k.rect;
    const cz = (z0 + z1) / 2;
    box(b, k.rect, SLAB, SLAB + KIOSK_H - 0.25, KIOSK);
    box(b, [x0 - 0.2, z0 - 0.2, x1 + 0.25, z1 + 0.2], SLAB + KIOSK_H - 0.25, SLAB + KIOSK_H - 0.1, CAP);
    // The hatch lit, a counter under it, an awning over it
    b.box(x1, SLAB + 1.0, cz - 0.9, 0.02, 0.85, 1.8, HATCH);
    b.box(x1, SLAB + 0.95, cz - 1.0, 0.35, 0.06, 2.0, CAP);
    b.add(new THREE.BoxGeometry(0.8, 0.06, 2.2).rotateZ(-0.25).translate(x1 + 0.38, SLAB + 2.0, cz), AWNINGS[i % 2]);
    // Its name on a board on the roof, facing the lane
    const g = new THREE.PlaneGeometry(2.2, 0.55);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let v = 0; v < uv.count; v++) uv.setY(v, 1 - (i + 1 - uv.getY(v)) / KIOSKS.length);
    b.add(g.rotateY(Math.PI / 2).translate(x1 + 0.03, SLAB + KIOSK_H + 0.2, cz), SIGNS);
    b.box(x1 - 0.06, SLAB + KIOSK_H - 0.1, cz - 1.15, 0.08, 0.6, 2.3, KIOSK);
  }
  // Its tables, four to a terrace
  TERRACE_TABLES.slice(i * 4, i * 4 + 4).forEach((t, j) => table(b, t, UMBRELLAS[j % 2]));
}

/* ---------- The LED ribbon ---------- */

function ribbon(b: Batch) {
  const [x0, z0, x1, z1] = RIBBON_TOWER.parts[0].rect;
  const o = RIBBON.out;
  // Round the podium, each face read left to right from outside: up the east face, along the north, down the west, along the south
  const corners: Pt[] = [
    [x1 + o, z1 + o],
    [x1 + o, z0 - o],
    [x0 - o, z0 - o],
    [x0 - o, z1 + o],
    [x1 + o, z1 + o],
  ];
  let s = 0;
  const pos: number[] = [];
  const nor: number[] = [];
  const uvs: number[] = [];
  for (let i = 1; i < corners.length; i++) {
    const [a, c] = [corners[i - 1], corners[i]];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    // (outward: the face's right turned back a quarter)
    const [dx, dz] = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
    const [nx, nz] = [-dz, dx];
    // In pieces no longer than 12
    const n = Math.ceil(len / 12);
    for (let k = 0; k < n; k++) {
      const [p, q] = [k / n, (k + 1) / n].map((f): Pt => [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f]);
      const [u0, u1] = [(s + (len * k) / n) / RIBBON_LEN, (s + (len * (k + 1)) / n) / RIBBON_LEN];
      const [ya, yb] = [SLAB + RIBBON.y0, SLAB + RIBBON.y1];
      for (const [v, u, yy] of [
        [p, u0, ya],
        [q, u1, ya],
        [q, u1, yb],
        [p, u0, ya],
        [q, u1, yb],
        [p, u0, yb],
      ] as [Pt, number, number][]) {
        pos.push(v[0], yy, v[1]);
        nor.push(nx, 0, nz);
        uvs.push(u, yy === ya ? 0 : 1);
      }
    }
    s += len;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  b.add(g, RIBBON_MAT);
}

/* ---------- Registering ---------- */

export function registerPlaza(low: boolean, tick?: (f: Tick) => void) {
  const blk = UPTOWN_BLOCKS.find((q) => q.id === PLAZA_BLOCK)!.rect;
  site('uptown plaza ground', [blk[0] - 1, blk[1] - 1, blk[2] + 1, blk[3] + 1], (into) => {
    const b = new Batch();
    ground(b);
    b.build(into, { cast: false, receive: true });
  });
  site('uptown plaza forecourt', [blk[0] - 1, blk[1] - 1, SPIRE_LOT[0] + 1, blk[3] + 1], (into) => {
    const b = new Batch();
    pool(b);
    waterWall(b);
    canopies(b, low);
    b.build(into, { cast: true, receive: true });
    cross(new Batch()).build(into, { cast: true, receive: false });
  });
  TERRACES.forEach(([x0, z0, x1, z1], i) =>
    site(`uptown plaza terrace ${i}`, [x0 - 1, z0 - 1, x1 + 1, z1 + 1], (into) => {
      const b = new Batch();
      terrace(b, i);
      b.build(into, { cast: true, receive: true });
    })
  );
  const pod = RIBBON_TOWER.parts[0].rect;
  site('uptown plaza ribbon', [pod[0] - 1, pod[1] - 1, pod[2] + 1, pod[3] + 1], (into) => {
    const b = new Batch();
    ribbon(b);
    b.build(into, { cast: false, receive: false });
  });
  // On the main thread: the falls run down and the ribbon's words go round
  tick?.(({ dt }) => {
    FALLS.map!.offset.y = (FALLS.map!.offset.y + dt * 0.6) % 1;
    RIBBON_TEX.offset.x = (RIBBON_TEX.offset.x + dt * 0.035) % 1;
  });
}
