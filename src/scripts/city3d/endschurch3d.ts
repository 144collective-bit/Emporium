/*
 * St Aldwyn's drawn (docs/estate-plan.md Phase 4; the data is endsstreet.ts), sites in Endswood's chunk: an old
 * Victorian Gothic church in soot-dark stone, older than the estate pressing in round it. The nave under a steep slate
 * roof, its big window over the west door facing Endswood Road, the aisles' lean-to roofs, buttresses down every wall,
 * lancets between them, the chancel with its east window; the tower at the south-east corner with its angle
 * buttresses, string courses, belfry louvres, a clock, battlements and pinnacles, and the octagonal spire with its
 * lucarnes and a gilded cross. The windows glow at night (stained glass, one small atlas, `ends-church`). Round it the
 * churchyard: worn grass, the flagged paths, the railings on their dwarf wall with stone gate piers, the lychgate, the
 * yews, the old headstones leaning every way, two chest tombs, the cross and the noticeboard. Near only: the railings'
 * bars, the clock's hands. Phones leave out the finest.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, lit, rng, shadeHex, siteMat, toon } from './kit';
import { site } from './tilework';
import { COVER, KERB } from './palette';
import { SLAB_Y, type Pt, type Rect } from './endswood';
import {
  CHEST_TOMBS,
  CHURCH,
  CHURCHYARD,
  CHURCHYARD_RUNS,
  CHURCH_NAME,
  CROSS,
  HEADSTONE,
  HEADSTONES,
  LYCHGATE,
  NOTICEBOARD,
  PATHS,
  RAIL,
  RAIL_GATES,
  SPIRE_TOP,
  TOMB,
  YEW,
  YEWS,
  type ChurchPart,
} from './endsstreet';

/* ---------- Paint ---------- */

const STONE = '#5f594f';
const WALL = toon(STONE);
const DRESS = toon('#857d6f');
const PLINTH = toon('#4a453e');
const SLATE = toon('#3a3f4c');
const SPIRE = toon('#434958');
const LEAD = toon('#55595f');
const GILT = toon('#c9a23a');
const IRON = toon('#1d1e24');
const OAK = toon('#5a3d28');
const TILE = toon('#6e3a2c');
const YEW_C = toon('#1f4630');
const YEW_D = toon('#18392a');
const TRUNK = toon('#4a3326');
const STONES = ['#8d8b86', '#7d7a72', '#9a958a'].map((c) => toon(c));
const LICHEN = toon('#7c8466');
const CLOCK = toon('#e6e0cc');
const GRASS = toon(COVER.wornLawn);
const FLAGS = toon(KERB.grit);
const BOARD_FRAME = toon('#2a3c5a');

/* ---------- The windows' atlas: a lancet, the big window, the belfry's louvres, a door, the noticeboard ---------- */

const CELLS = { lancet: [0, 128], big: [128, 384], belfry: [384, 512], door: [512, 640], notice: [640, 768] } as const;
type Cell = keyof typeof CELLS;
const AW = 768;
const AH = 256;
const GLASS = ['#b8322c', '#2d4f8a', '#d9b43a', '#2f6a3e', '#6a3d7a', '#c86a2a'];
/** A pointed arch's outline in a box (x, y its top-left, w by h): the arch springs at `spring` of the way down */
function archPath(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, spring = 0.32) {
  const sy = y + h * spring;
  c.beginPath();
  c.moveTo(x, y + h);
  c.lineTo(x, sy);
  c.quadraticCurveTo(x, y + h * 0.05, x + w / 2, y);
  c.quadraticCurveTo(x + w, y + h * 0.05, x + w, sy);
  c.lineTo(x + w, y + h);
  c.closePath();
}
/** Leaded glass in a box: little panes of colour (or their glow), the leading dark */
function glass(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, glow: boolean, r: () => number) {
  for (let py = y; py < y + h; py += 9)
    for (let px = x; px < x + w; px += 8) {
      const col = GLASS[Math.floor(r() * GLASS.length)];
      c.fillStyle = glow ? col : shadeHex(col, -0.86);
      c.fillRect(px, py, 8, 9);
    }
  if (!glow) {
    c.fillStyle = 'rgba(15,14,22,0.8)';
    for (let py = y; py < y + h; py += 9) c.fillRect(x, py, w, 1);
    for (let px = x; px < x + w; px += 8) c.fillRect(px, y, 1, h);
  }
}
function drawCell(c: CanvasRenderingContext2D, cell: Cell, glow: boolean) {
  const [x0, x1] = CELLS[cell];
  const w = x1 - x0;
  const r = rng(x0 + 7);
  if (!glow) {
    c.fillStyle = STONE;
    c.fillRect(x0, 0, w, AH);
    // (soot down the stone, a few lighter blocks)
    for (let k = 0; k < 14; k++) {
      c.fillStyle = r() < 0.5 ? 'rgba(25,22,20,0.14)' : 'rgba(150,140,125,0.12)';
      c.fillRect(x0 + r() * w, r() * AH, 6 + r() * 20, 4 + r() * 10);
    }
  } else {
    c.fillStyle = '#000';
    c.fillRect(x0, 0, w, AH);
  }
  const frame = (x: number, y: number, ww: number, hh: number, spring?: number) => {
    if (glow) return;
    c.save();
    c.translate(-6, -6);
    archPath(c, x, y, ww + 12, hh + 12, spring);
    c.restore();
    c.fillStyle = '#857d6f';
    c.fill();
  };
  const light = (x: number, y: number, ww: number, hh: number, spring?: number) => {
    c.save();
    archPath(c, x, y, ww, hh, spring);
    c.clip();
    glass(c, x, y, ww, hh, glow, r);
    c.restore();
  };
  if (cell === 'lancet') {
    frame(x0 + 26, 14, w - 52, AH - 28);
    light(x0 + 26, 14, w - 52, AH - 28);
    return;
  }
  if (cell === 'big') {
    // Three lights under the arch, a rose of tracery over them, the stone mullions between
    frame(x0 + 14, 10, w - 28, AH - 18, 0.42);
    c.save();
    archPath(c, x0 + 14, 10, w - 28, AH - 18, 0.42);
    c.clip();
    glass(c, x0 + 14, 10, w - 28, AH - 18, glow, r);
    c.restore();
    if (!glow) {
      c.fillStyle = '#857d6f';
      for (const k of [1, 2]) c.fillRect(x0 + 14 + ((w - 28) * k) / 3 - 4, 110, 8, AH - 118);
      c.fillRect(x0 + 24, 106, w - 48, 8);
      c.strokeStyle = '#857d6f';
      c.lineWidth = 8;
      c.beginPath();
      c.arc(x0 + w / 2, 66, 34, 0, Math.PI * 2);
      c.stroke();
      c.lineWidth = 5;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        c.beginPath();
        c.moveTo(x0 + w / 2, 66);
        c.lineTo(x0 + w / 2 + Math.cos(a) * 34, 66 + Math.sin(a) * 34);
        c.stroke();
      }
    }
    return;
  }
  if (cell === 'belfry') {
    // Twin openings with timber louvres, dark behind
    for (const k of [0, 1]) {
      const x = x0 + 14 + k * 54;
      frame(x, 20, 46, AH - 40);
      if (glow) continue;
      c.save();
      archPath(c, x, 20, 46, AH - 40);
      c.clip();
      c.fillStyle = '#15141a';
      c.fillRect(x, 20, 46, AH - 40);
      c.fillStyle = '#4a3a2c';
      for (let y = 60; y < AH - 20; y += 14) c.fillRect(x, y, 46, 7);
      c.restore();
    }
    return;
  }
  if (cell === 'door') {
    frame(x0 + 14, 18, w - 28, AH - 18, 0.4);
    if (glow) return;
    c.save();
    archPath(c, x0 + 14, 18, w - 28, AH - 18, 0.4);
    c.clip();
    c.fillStyle = '#4a2e1e';
    c.fillRect(x0 + 14, 18, w - 28, AH - 18);
    c.fillStyle = '#3a2416';
    for (let x = x0 + 22; x < x1 - 14; x += 14) c.fillRect(x, 18, 2, AH);
    c.fillStyle = '#1d1e24';
    for (const y of [110, 190]) c.fillRect(x0 + 18, y, w - 36, 6);
    c.fillRect(x0 + w / 2 - 1, 30, 2, AH);
    c.restore();
    return;
  }
  // The noticeboard: the church's name, ALL WELCOME, a few pinned notices (fixed copy)
  if (glow) return;
  c.fillStyle = '#2a3c5a';
  c.fillRect(x0, 0, w, 96);
  c.fillStyle = '#efe9d6';
  c.textAlign = 'center';
  c.font = `900 22px ${FONT_DISPLAY}`;
  c.fillText(CHURCH_NAME.toUpperCase(), x0 + w / 2, 26);
  c.font = `700 13px ${FONT_DISPLAY}`;
  c.fillText('ALL WELCOME', x0 + w / 2, 44);
  for (const [px, py, pw] of [
    [x0 + 10, 54, 34],
    [x0 + 50, 52, 30],
    [x0 + 86, 56, 32],
  ]) {
    c.fillStyle = '#e8e2d2';
    c.fillRect(px, py, pw, 34);
    c.fillStyle = PAL.ink;
    for (let y = py + 6; y < py + 30; y += 6) c.fillRect(px + 4, y, pw - 8, 1.5);
  }
}
const GLASSES = (() => {
  const all = (glow: boolean) => (c: CanvasRenderingContext2D) => (Object.keys(CELLS) as Cell[]).forEach((k) => drawCell(c, k, glow));
  const map = canvasTex(AW, AH, all(false));
  const emissiveMap = canvasTex(AW / 2, AH / 2, (c) => {
    c.scale(0.5, 0.5);
    all(true)(c);
  });
  return siteMat('ends-church', lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff' }), 0.05, 0.95));
})();
/** A quad on a wall, its middle at (x, y, z), facing n, w by h, a cell of the atlas on it (`v1` of the cell's height) */
function pane(b: Batch, cell: Cell, x: number, y: number, z: number, n: Pt, w: number, h: number, v1 = 1) {
  const [u0, u1] = CELLS[cell].map((u) => u / AW);
  const g = new THREE.PlaneGeometry(w, h);
  // (a canvas's top row is v 1: the cell's top `v1` of the atlas)
  g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, 1, u1, 1, u0, 1 - v1, u1, 1 - v1], 2));
  b.add(g.rotateY(Math.atan2(n[0], n[1])).translate(x, y, z), GLASSES);
}

/* ---------- Helpers ---------- */

const SPAN = 9;
const pieces = (a: number, c: number) => {
  const n = Math.max(1, Math.ceil(Math.abs(c - a) / SPAN));
  return Array.from({ length: n }, (_, k): [number, number] => [a + ((c - a) * k) / n, a + ((c - a) * (k + 1)) / n]);
};
/** A box from rect, y0 to y1, in pieces along its long side */
function block(b: Batch, [x0, z0, x1, z1]: Rect, y0: number, y1: number, m: THREE.Material) {
  if (x1 - x0 >= z1 - z0) for (const [a, c] of pieces(x0, x1)) b.box(a, y0, z0, c - a, y1 - y0, z1 - z0, m);
  else for (const [a, c] of pieces(z0, z1)) b.box(x0, y0, a, x1 - x0, y1 - y0, c - a, m);
}
type V3 = [number, number, number];
/** A flat polygon (a triangle or a quad, corners in order, either way round) facing `n` */
function poly(b: Batch, pts: V3[], m: THREE.Material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
  g.setIndex(pts.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  b.add(g, m);
  // (and its back: the slopes are seen from under their eaves too)
  const back = new THREE.BufferGeometry();
  back.setAttribute('position', new THREE.Float32BufferAttribute([...pts].reverse().flat(), 3));
  back.setIndex(pts.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3]);
  back.computeVertexNormals();
  b.add(back, m);
}
/** A gable roof along z over rect, its slopes from the eaves (out `over`) to the ridge, in pieces, a lead ridge */
function gableRoof(b: Batch, [x0, z0, x1, z1]: Rect, eaves: number, ridge: number, over = 0.3) {
  const cx = (x0 + x1) / 2;
  const half = (x1 - x0) / 2;
  const drop = (over * (ridge - eaves)) / half;
  for (const [a, c] of pieces(z0 - 0.15, z1 + 0.15)) {
    poly(b, [[x0 - over, eaves - drop, a], [x0 - over, eaves - drop, c], [cx, ridge, c], [cx, ridge, a]], SLATE);
    poly(b, [[x1 + over, eaves - drop, c], [x1 + over, eaves - drop, a], [cx, ridge, a], [cx, ridge, c]], SLATE);
    b.box(cx - 0.08, ridge - 0.04, a, 0.16, 0.14, c - a, LEAD);
  }
}
/** A gable's triangle on the wall at z, facing `nz` (-1 north, 1 south), and the coping along its slopes */
function gable(b: Batch, x0: number, x1: number, z: number, eaves: number, ridge: number, nz: number) {
  const cx = (x0 + x1) / 2;
  const o = nz * 0.005;
  poly(b, [[x0, eaves, z + o], [x1, eaves, z + o], [cx, ridge, z + o]], WALL);
}
/** A lean-to roof along z, from the top against the nave (at `inner` x) down to the eaves at the outer wall */
function leanTo(b: Batch, p: ChurchPart, over = 0.3) {
  const [x0, z0, x1, z1] = p.rect;
  const [inner, outer, dir] = p.roof === 'w' ? [x1, x0, -1] : [x0, x1, 1];
  const run = Math.abs(outer - inner);
  const drop = (over * (p.ridge - p.eaves)) / run;
  for (const [a, c] of pieces(z0 - 0.15, z1 + 0.15)) poly(b, [[inner, p.ridge, a], [inner, p.ridge, c], [outer + dir * over, p.eaves - drop, c], [outer + dir * over, p.eaves - drop, a]], SLATE);
  // (the end walls' triangles over the eaves, against the nave)
  for (const [z, nz] of [
    [z0, -1],
    [z1, 1],
  ] as const)
    poly(b, [[outer, p.eaves, z + nz * 0.005], [inner, p.eaves, z + nz * 0.005], [inner, p.ridge, z + nz * 0.005]], WALL);
}
/** A buttress against a wall: out from the wall at (x, z) along n, `w` wide, to `h`, a weathered cap */
function buttress(b: Batch, x: number, z: number, n: Pt, w: number, out: number, h: number) {
  const [sx, sz] = n[0] ? [out, w] : [w, out];
  const [bx, bz] = [x + (n[0] ? (n[0] > 0 ? 0 : -out) : -w / 2), z + (n[1] ? (n[1] > 0 ? 0 : -out) : -w / 2)];
  b.box(bx, SLAB_Y, bz, sx, h * 0.55, sz, WALL);
  // (stepped in a little over the lower stage, a cap of dressed stone)
  const [ix, iz] = [n[0] ? sx * 0.65 : sx, n[1] ? sz * 0.65 : sz];
  b.box(n[0] < 0 ? bx + sx - ix : bx, SLAB_Y + h * 0.55, n[1] < 0 ? bz + sz - iz : bz, ix, h * 0.45, iz, WALL);
  b.box((n[0] < 0 ? bx + sx - ix : bx) - 0.03, SLAB_Y + h, (n[1] < 0 ? bz + sz - iz : bz) - 0.03, ix + 0.06, 0.12, iz + 0.06, DRESS);
}
/** A small cross (a gable's finial, the spire's), its foot at (x, y, z), facing along z */
function finial(b: Batch, x: number, y: number, z: number, h: number, m: THREE.Material, alongX = true) {
  b.box(x - h * 0.06, y, z - h * 0.06, h * 0.12, h, h * 0.12, m);
  if (alongX) b.box(x - h * 0.3, y + h * 0.6, z - h * 0.05, h * 0.6, h * 0.1, h * 0.1, m);
  else b.box(x - h * 0.05, y + h * 0.6, z - h * 0.3, h * 0.1, h * 0.1, h * 0.6, m);
}

/* ---------- The church ---------- */

function church(b: Batch, low: boolean) {
  const { nave, aisles, chancel, tower, window: win } = CHURCH;
  const y0 = SLAB_Y;
  // The walls (to the eaves), the plinth round their foot
  for (const p of [nave, ...aisles, chancel]) {
    block(b, p.rect, y0, p.eaves, WALL);
    const [x0, z0, x1, z1] = p.rect;
    block(b, [x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05], y0, y0 + 0.4, PLINTH);
  }
  // The nave's and the chancel's roofs and gables; the aisles' lean-tos
  gableRoof(b, nave.rect, nave.eaves, nave.ridge);
  gableRoof(b, chancel.rect, chancel.eaves, chancel.ridge);
  gable(b, nave.rect[0], nave.rect[2], nave.rect[3], nave.eaves, nave.ridge, 1);
  gable(b, nave.rect[0], nave.rect[2], nave.rect[1], nave.eaves, nave.ridge, -1);
  gable(b, chancel.rect[0], chancel.rect[2], chancel.rect[1], chancel.eaves, chancel.ridge, -1);
  for (const a of aisles) leanTo(b, a);
  // Crosses on the gables' apexes
  finial(b, (nave.rect[0] + nave.rect[2]) / 2, nave.ridge - 0.05, nave.rect[3] + 0.05, 0.9, DRESS);
  finial(b, (chancel.rect[0] + chancel.rect[2]) / 2, chancel.ridge - 0.05, chancel.rect[1] - 0.05, 0.75, DRESS);
  // The west front: the big window over the door, buttresses either side, a string course under the window
  const fz = nave.rect[3];
  pane(b, 'big', (win.x0 + win.x1) / 2, (win.y0 + win.y1) / 2, fz + 0.012, [0, 1], win.x1 - win.x0, win.y1 - win.y0);
  pane(b, 'door', CHURCH.door[0], y0 + 1.15, fz + 0.012, [0, 1], 1.5, 2.2);
  b.box(nave.rect[0], win.y0 - 0.25, fz, nave.rect[2] - nave.rect[0], 0.14, 0.08, DRESS);
  for (const x of [nave.rect[0] + 0.35, nave.rect[2] - 0.35]) buttress(b, x, fz, [0, 1], 0.5, 0.65, 5.4);
  // The chancel's east window, its corner buttresses and side lancets
  const cz = chancel.rect[1];
  pane(b, 'big', (chancel.rect[0] + chancel.rect[2]) / 2, y0 + 3.2, cz - 0.012, [0, -1], 3, 3.4);
  for (const x of [chancel.rect[0] + 0.3, chancel.rect[2] - 0.3]) buttress(b, x, cz, [0, -1], 0.45, 0.55, 4.4);
  for (const [x, nx] of [
    [chancel.rect[0], -1],
    [chancel.rect[2], 1],
  ] as const)
    for (const z of [cz + 1.6, cz + 3.8]) pane(b, 'lancet', x + nx * 0.012, y0 + 2.6, z, [nx, 0], 0.75, 2.2);
  // The aisles: buttresses down their outer walls, a lancet between each pair; the side door in the west aisle
  for (const a of aisles) {
    const [x0, z0, x1, z1] = a.rect;
    const [x, nx] = a.roof === 'w' ? [x0, -1] : [x1, 1];
    for (let z = z0 + 0.6; z <= z1 - 0.4; z += 3) buttress(b, x, z, [nx, 0], 0.35, 0.5, a.eaves - 0.7);
    for (let z = z0 + 2.1; z < z1 - 1; z += 3) {
      if (a.roof === 'w' && Math.abs(z - CHURCH.side[1]) < 1.2) continue;
      pane(b, 'lancet', x + nx * 0.012, y0 + 1.85, z, [nx, 0], 0.7, 1.9);
    }
    // (the aisle's front: a lancet in its end wall)
    pane(b, 'lancet', (x0 + x1) / 2, y0 + 1.9, z1 + 0.012, [0, 1], 0.6, 1.7);
  }
  pane(b, 'door', CHURCH.side[0] - 0.012, y0 + 1, CHURCH.side[1], [-1, 0], 1.1, 1.9);
  // The clerestory over the aisles: small lancets in the nave's walls
  for (const [x, nx] of [
    [nave.rect[0], -1],
    [nave.rect[2], 1],
  ] as const)
    for (let z = nave.rect[1] + 3.5; z < nave.rect[3] - 1.5; z += 3) {
      if (nx > 0 && z > tower.rect[1] - 0.6) continue;
      pane(b, 'lancet', x + nx * 0.012, 5.85, z, [nx, 0], 0.4, 0.62);
    }

  // The tower: the shaft, its angle buttresses, string courses, belfry, clock, battlements and pinnacles
  const [tx0, tz0, tx1, tz1] = tower.rect;
  const [tcx, tcz] = [(tx0 + tx1) / 2, (tz0 + tz1) / 2];
  block(b, tower.rect, y0, tower.top, WALL);
  block(b, [tx0 - 0.05, tz0 - 0.05, tx1 + 0.05, tz1 + 0.05], y0, y0 + 0.4, PLINTH);
  for (const [x, z, n] of [
    [tx1 - 0.3, tz1, [0, 1]],
    [tx1, tz1 - 0.3, [1, 0]],
    [tx1, tz0 + 0.3, [1, 0]],
    [tx0 + 0.9, tz1, [0, 1]],
  ] as [number, number, Pt][])
    buttress(b, x, z, n, 0.5, 0.6, 8.6);
  for (const y of [4.6, 8.6]) {
    b.box(tx0 - 0.06, y, tz0 - 0.06, tx1 - tx0 + 0.12, 0.14, tz1 - tz0 + 0.12, DRESS);
  }
  const faces: [Pt, number, number][] = [
    [[0, 1], tcx, tz1 + 0.012],
    [[0, -1], tcx, tz0 - 0.012],
    [[1, 0], tx1 + 0.012, tcz],
    [[-1, 0], tx0 - 0.012, tcz],
  ];
  for (const [n, x, z] of faces) {
    pane(b, 'belfry', x, 10.3, z, n, 1.9, 2.6);
    // (a lancet lower down on the faces you see from the street)
    if (n[1] > 0 || n[0] > 0) pane(b, 'lancet', x, 6.4, z, n, 0.6, 1.6);
  }
  pane(b, 'door', 35.2, y0 + 1, tz1 + 0.012, [0, 1], 1.1, 1.9);
  // The clock on the south and east faces
  for (const [n, x, z] of faces.slice(0, 1).concat(faces.slice(2, 3))) {
    const disc = new THREE.CircleGeometry(0.72, low ? 12 : 20);
    b.add(disc.rotateY(Math.atan2(n[0], n[1])).translate(x + n[0] * 0.01, 7.6, z + n[1] * 0.01), CLOCK);
    const ring = new THREE.RingGeometry(0.72, 0.84, low ? 12 : 20);
    b.add(ring.rotateY(Math.atan2(n[0], n[1])).translate(x + n[0] * 0.012, 7.6, z + n[1] * 0.012), GILT);
    b.detail(() => {
      // (its hands: ten to two, as clocks are drawn)
      for (const [len, a] of [
        [0.55, -0.9],
        [0.4, 1.2],
      ]) {
        const h = new THREE.PlaneGeometry(0.06, len).translate(0, len / 2, 0).rotateZ(a);
        b.add(h.rotateY(Math.atan2(n[0], n[1])).translate(x + n[0] * 0.02, 7.6, z + n[1] * 0.02), IRON);
      }
    });
  }
  // Battlements: a parapet round the top, merlons on it
  const top = tower.top;
  const t = 0.3;
  for (const r of [
    [tx0, tz0, tx1, tz0 + t],
    [tx0, tz1 - t, tx1, tz1],
    [tx0, tz0 + t, tx0 + t, tz1 - t],
    [tx1 - t, tz0 + t, tx1, tz1 - t],
  ] as Rect[])
    block(b, r, top, top + 0.45, DRESS);
  for (let u = 0.35; u < tx1 - tx0 - 0.3; u += 0.8)
    for (const [x, z, w, d] of [
      [tx0 + u, tz0, 0.4, t],
      [tx0 + u, tz1 - t, 0.4, t],
      [tx0, tz0 + u, t, 0.4],
      [tx1 - t, tz0 + u, t, 0.4],
    ])
      b.box(x, top + 0.45, z, w, 0.35, d, DRESS);
  // Pinnacles at the corners
  for (const [x, z] of [
    [tx0 + 0.2, tz0 + 0.2],
    [tx1 - 0.2, tz0 + 0.2],
    [tx0 + 0.2, tz1 - 0.2],
    [tx1 - 0.2, tz1 - 0.2],
  ]) {
    b.box(x - 0.22, top, z - 0.22, 0.44, 0.95, 0.44, DRESS);
    b.add(new THREE.ConeGeometry(0.28, tower.pinnacle - top - 0.95, 4, 1, true).rotateY(Math.PI / 4).translate(x, top + 0.95 + (tower.pinnacle - top - 0.95) / 2, z), DRESS);
  }
  // The spire: an octagon to its point, its lucarnes, the gilded cross on top
  const R = tower.spire / Math.cos(Math.PI / 8);
  const sh = SPIRE_TOP - 0.8 - top;
  b.add(new THREE.ConeGeometry(R, sh, 8, 1, true).rotateY(Math.PI / 8).translate(tcx, top + sh / 2, tcz), SPIRE);
  for (const [n] of faces) {
    const [lx, lz] = [tcx + n[0] * (tower.spire - 0.45), tcz + n[1] * (tower.spire - 0.45)];
    const along = n[0] !== 0;
    b.box(lx - (along ? 0.35 : 0.3), top + 0.9, lz - (along ? 0.3 : 0.35), along ? 0.7 : 0.6, 0.9, along ? 0.6 : 0.7, WALL);
    pane(b, 'belfry', lx + n[0] * 0.355, top + 1.3, lz + n[1] * 0.355, n, 0.5, 0.7);
    b.add(new THREE.ConeGeometry(0.45, 0.5, 4, 1, true).rotateY(Math.PI / 4).translate(lx, top + 2.05, lz), SPIRE);
  }
  b.box(tcx - 0.05, SPIRE_TOP - 0.9, tcz - 0.05, 0.1, 0.25, 0.1, GILT);
  finial(b, tcx, SPIRE_TOP - 0.7, tcz, 0.7, GILT);
}

/* ---------- The churchyard ---------- */

function churchyard(b: Batch, low: boolean) {
  const [x0, z0, x1, z1] = CHURCHYARD;
  const y0 = SLAB_Y;
  // Worn grass over the block, the flagged paths over it
  for (const [a, c] of pieces(x0, x1)) for (const [p, q] of pieces(z0, z1)) b.add(new THREE.PlaneGeometry(c - a, q - p).rotateX(-Math.PI / 2).translate((a + c) / 2, y0 + 0.006, (p + q) / 2), GRASS);
  for (const [px0, pz0, px1, pz1] of PATHS) for (const [p, q] of pieces(pz0, pz1)) b.add(new THREE.PlaneGeometry(px1 - px0, q - p).rotateX(-Math.PI / 2).translate((px0 + px1) / 2, y0 + 0.012, (p + q) / 2), FLAGS);
  // The railings: their dwarf wall, rails along it, bars (near only), stone piers at the gates
  for (const r of CHURCHYARD_RUNS) {
    block(b, r, y0, y0 + RAIL.wall, DRESS);
    const [rx0, rz0, rx1, rz1] = r;
    const alongX = rx1 - rx0 > rz1 - rz0;
    const mid = alongX ? (rz0 + rz1) / 2 : (rx0 + rx1) / 2;
    const rail = (y: number) => (alongX ? block(b, [rx0, mid - 0.025, rx1, mid + 0.025], y, y + 0.05, IRON) : block(b, [mid - 0.025, rz0, mid + 0.025, rz1], y, y + 0.05, IRON));
    rail(y0 + RAIL.h - 0.08);
    b.detail(() => {
      rail(y0 + RAIL.wall + 0.08);
      if (low) return;
      const [a, c] = alongX ? [rx0, rx1] : [rz0, rz1];
      for (let u = a + 0.12; u < c - 0.05; u += 0.24) {
        const [bx, bz] = alongX ? [u, mid] : [mid, u];
        b.box(bx - 0.016, y0 + RAIL.wall, bz - 0.016, 0.032, RAIL.h - RAIL.wall + 0.1, 0.032, IRON);
      }
    });
  }
  const piers: Pt[] = [
    [RAIL_GATES.lych.a - 0.25, z1 - RAIL.t / 2],
    [RAIL_GATES.lych.b + 0.25, z1 - RAIL.t / 2],
    [x0 + RAIL.t / 2, RAIL_GATES.side.a - 0.25],
    [x0 + RAIL.t / 2, RAIL_GATES.side.b + 0.25],
  ];
  for (const [x, z] of piers) {
    b.box(x - 0.24, y0, z - 0.24, 0.48, 1.45, 0.48, DRESS);
    b.box(x - 0.3, y0 + 1.45, z - 0.3, 0.6, 0.1, 0.6, WALL);
  }
  // The lychgate: oak posts and beams, a tiled gable roof along the road
  const L = LYCHGATE;
  for (const x of [L.x0 + 0.1, L.x1 - 0.1]) for (const z of [L.z0 + 0.1, L.z1 - 0.1]) b.box(x - 0.09, y0, z - 0.09, 0.18, L.eaves - y0, 0.18, OAK);
  for (const z of [L.z0 + 0.1, L.z1 - 0.1]) b.box(L.x0, L.eaves - 0.12, z - 0.07, L.x1 - L.x0, 0.12, 0.14, OAK);
  const lzc = (L.z0 + L.z1) / 2;
  poly(b, [[L.x0 - 0.2, L.eaves, L.z0 - 0.25], [L.x1 + 0.2, L.eaves, L.z0 - 0.25], [L.x1 + 0.2, L.ridge, lzc], [L.x0 - 0.2, L.ridge, lzc]], TILE);
  poly(b, [[L.x1 + 0.2, L.eaves, L.z1 + 0.25], [L.x0 - 0.2, L.eaves, L.z1 + 0.25], [L.x0 - 0.2, L.ridge, lzc], [L.x1 + 0.2, L.ridge, lzc]], TILE);
  for (const x of [L.x0 - 0.005, L.x1 + 0.005]) poly(b, [[x, L.eaves, L.z0], [x, L.eaves, L.z1], [x, L.ridge - 0.1, lzc]], OAK);
  // The yews: dark and dense, their trunks gnarled
  YEWS.forEach(([x, z], i) => {
    b.add(new THREE.CylinderGeometry(YEW.trunk * 0.8, YEW.trunk, 1, 6, 1, true).translate(x, y0 + 0.5, z), TRUNK);
    b.add(new THREE.ConeGeometry(YEW.r, YEW.h * 0.8, low ? 6 : 8).translate(x, y0 + 0.7 + YEW.h * 0.4, z), i % 2 ? YEW_C : YEW_D);
    b.add(new THREE.IcosahedronGeometry(YEW.r * 0.85, 0).scale(1, 0.8, 1).translate(x + 0.15, y0 + 1.3, z - 0.1), i % 2 ? YEW_D : YEW_C);
  });
  // The headstones: rounded, cross-topped or plain, leaning every way, some lichened
  HEADSTONES.forEach(([x, z, lean], i) => {
    const m = i % 7 === 0 ? LICHEN : STONES[i % STONES.length];
    const kind = i % 3;
    const g: THREE.BufferGeometry[] = [new THREE.BoxGeometry(HEADSTONE.w, HEADSTONE.h - (kind === 0 ? HEADSTONE.w / 2 : 0), HEADSTONE.d).translate(0, (HEADSTONE.h - (kind === 0 ? HEADSTONE.w / 2 : 0)) / 2, 0)];
    if (kind === 0)
      g.push(
        new THREE.CylinderGeometry(HEADSTONE.w / 2, HEADSTONE.w / 2, HEADSTONE.d, low ? 6 : 8, 1, false, -Math.PI / 2, Math.PI)
          .rotateX(-Math.PI / 2)
          .translate(0, HEADSTONE.h - HEADSTONE.w / 2, 0)
      );
    if (kind === 1) g.push(new THREE.BoxGeometry(0.12, 0.34, HEADSTONE.d).translate(0, HEADSTONE.h + 0.12, 0), new THREE.BoxGeometry(0.34, 0.1, HEADSTONE.d).translate(0, HEADSTONE.h + 0.16, 0));
    const mat = new THREE.Matrix4().makeRotationX(lean).premultiply(new THREE.Matrix4().makeRotationZ(lean * 0.6)).premultiply(new THREE.Matrix4().makeTranslation(x, y0, z));
    for (const p of g) b.add(p.applyMatrix4(mat), m);
  });
  // The chest tombs, the cross on its steps
  for (const [x, z] of CHEST_TOMBS) {
    b.box(x - TOMB.w / 2 + 0.06, y0, z - TOMB.d / 2 + 0.06, TOMB.w - 0.12, TOMB.h - 0.1, TOMB.d - 0.12, STONES[1]);
    b.box(x - TOMB.w / 2, y0 + TOMB.h - 0.1, z - TOMB.d / 2, TOMB.w, 0.1, TOMB.d, STONES[2]);
  }
  const [cx, cz] = CROSS;
  b.box(cx - 0.45, y0, cz - 0.45, 0.9, 0.22, 0.9, STONES[1]);
  b.box(cx - 0.3, y0 + 0.22, cz - 0.3, 0.6, 0.22, 0.6, STONES[2]);
  b.box(cx - 0.08, y0 + 0.44, cz - 0.08, 0.16, 1.7, 0.16, STONES[0]);
  b.box(cx - 0.36, y0 + 1.6, cz - 0.07, 0.72, 0.14, 0.14, STONES[0]);
  // The noticeboard: two posts, the board under a little roof, facing the road
  const [nx, nz] = NOTICEBOARD;
  for (const o of [-0.62, 0.62]) b.box(nx + o - 0.05, y0, nz - 0.05, 0.1, 1.85, 0.1, OAK);
  b.box(nx - 0.72, y0 + 0.75, nz - 0.06, 1.44, 1.06, 0.06, BOARD_FRAME);
  pane(b, 'notice', nx, y0 + 1.28, nz + 0.006, [0, 1], 1.36, 1.02, 96 / AH);
  b.box(nx - 0.82, y0 + 1.83, nz - 0.2, 1.64, 0.08, 0.32, SLATE);
}

export function registerChurch(low: boolean) {
  // The church (its walls, roofs, tower and spire) and the churchyard round it, a site each
  site('ends church', CHURCHYARD, (into) => {
    const b = new Batch();
    church(b, low);
    b.build(into, { cast: true, receive: true });
  });
  site('ends churchyard', [CHURCHYARD[0] - 0.5, CHURCHYARD[1] - 0.5, CHURCHYARD[2] + 0.5, CHURCHYARD[3] + 0.5], (into) => {
    const b = new Batch();
    churchyard(b, low);
    b.build(into, { cast: true, receive: true });
  });
}
