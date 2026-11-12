/*
 * Endswood's street level drawn (docs/estate-plan.md Phase 4; the data is endsstreet.ts), sites in the estate's chunk
 * (endswood3d.ts's `register()`), St Aldwyn's being endschurch3d.ts's. One atlas of fixed made-up copy (`ends-shops`,
 * lit at night): the parade's shopfronts under their canopy (the off-licence, the chicken shop bright white, the
 * launderette's machines, the barber's chair, the chippy, the newsagent, the phone repair's shutter, the tenants'
 * hall), the corner shops' fronts and fascias, the Duke of Endswood's boarded ground floor in green tiles and its
 * boarded sashes, its hanging sign, the community centre's sign missing letters, Bunker Sound's converted garage
 * front, the estate board and NO BALL GAMES. Geometry in the shared paint: the corner shops and their flats, the pub
 * under its hipped slate roof, the community centre boarded up, the studio's ON AIR light, sofa, amp and the pirate
 * aerial on Harrier Point; the green's worn grass and desire lines behind green railings, benches; the ball court's
 * red surface, lines, goals and hoops behind its tall fence (the mesh in the FX layer); the playground; the bin
 * stores; CCTV; the forecourt's bollards; on the road the zebras, their zigzags and beacons, the double yellows and
 * the humps. On the main thread the beacons' globes flash (steady under reduced motion). Near only: the railings'
 * bars, the intercoms, crates, tags, weeds. Phones leave out the finest.
 */
import * as THREE from 'three';
import type { Tick } from './world';
import { Batch, FONT_DISPLAY, PAL, canvasTex, lit, neon, rng, siteMat, toon } from './kit';
import { site } from './tilework';
import { buildFx, chainMesh, poster, tag } from './grime';
import { COVER } from './palette';
import { CIRCUS, CLOSE_END, ENDSWOOD_NAME, ROAD_HALF, ROAD_Z, SLAB_Y, type Pt, type Rect } from './endswood';
import { BLOCKS, GROUND } from './endsblocks';
import {
  AERIAL,
  AMP_H,
  BEACON,
  BEACONS,
  BIN_H,
  BIN_STORES,
  BOARD,
  BOARDS,
  BOLLARD,
  CANOPY,
  CCTV,
  CENTRE,
  CORNER_SHOPS,
  FORECOURT_BOLLARDS,
  GREEN,
  GREEN_RUNS,
  HUMPS,
  JUNCTIONS,
  JUNCTION_GAP,
  LOW_RAIL,
  PARADE,
  PARADE_UNITS,
  PITCH,
  PITCH_RUNS,
  PLAYGROUND,
  PLAY_RUNS,
  POLE,
  PUB,
  SOFA_H,
  STUDIO,
  ZEBRAS,
  ZEBRA_W,
  ZIGZAG,
  unitX,
} from './endsstreet';
import { registerChurch } from './endschurch3d';
import { shopfront, text, type Cell } from './endsshopfront';

/* ---------- Paint ---------- */

const CONCRETE = toon('#8b8896');
const CONCRETE_DARK = toon('#6d6a78');
const SOFFIT = toon('#4c4956');
const ENG_BRICK = toon('#4b3f46');
const STOCK = toon('#9c8460');
const STOCK_DARK = toon('#7a6648');
const BROWN_BRICK = toon('#6a4e3e');
const SLATE = toon('#3a3f4c');
const FELT = toon('#2e2c34');
const PLY = toon('#a88a5c');
const PLY_OLD = toon('#8a7350');
const STEEL = toon('#6a6d76');
const STEEL_DARK = toon('#4a4d56');
const SASH = toon('#d8d4c8');
const GLASS = toon('#1e2444');
const GREEN_RAIL = toon('#2f5a3e');
const BLACK = toon('#1c1b22');
const WHITE = toon('#e8e4d8');
const YELLOW = toon('#d9b034');
const HUMP = toon('#3a3846');
const RED_COURT = toon('#8a3a32');
const RUBBER = toon('#6e4a40');
const RUBBER_2 = toon('#3f5f52');
const GRASS = toon(COVER.wornLawn);
const DIRT = toon(COVER.bare);
const TIMBER = toon('#7a5a3a');
const SOFA = toon('#6a2e36');
const SOFA_DARK = toon('#52222a');
const AMP = toon('#22222a');
const PLAY_RED = toon('#b8322c');
const PLAY_YELLOW = toon('#d9b43a');
const PLAY_BLUE = toon('#2d4f8a');
const CRATE = toon('#5a7a3a');
const FRUIT = ['#c23a2a', '#e0a020', '#6a9a2a'].map((c) => toon(c));
const WEED = toon('#4a6a36');
const GLOBE_DULL = toon('#a8551e');
const ON_AIR = neon('#ff2a3a', 0.5, 2.2);
const GRILLE = toon('#3a3a44');
const HOOP = toon('#d0502a');

/* ---------- The atlas: shopfronts, fascias, the pub, the signs (fixed made-up copy) ---------- */

const AW = 512;
const UNIT_H = 200;
const CELLS: Record<string, Cell> = {};
let cy = 0;
const row = (id: string, h: number) => {
  CELLS[id] = [0, cy, AW, h];
  cy += h;
};
PARADE_UNITS.forEach((_, k) => row(`unit${k}`, UNIT_H));
row('lucky', 200);
row('nightday', 140);
row('side', 170);
row('pubG', 114);
row('pubU', 114);
row('centre', 64);
row('studio', 140);
CELLS.pubsign = [0, cy, 128, 128];
CELLS.noball = [128, cy, 192, 128];
CELLS.board = [320, cy, 192, 128];
cy += 128;
const AH = cy;

/** The pub's ground floor: green glazed tiles, its windows and doors boarded, the fascia faded */
function pubGround(c: CanvasRenderingContext2D, [x, y, w, h]: Cell, glow: boolean) {
  if (glow) {
    c.fillStyle = '#000';
    c.fillRect(x, y, w, h);
    return;
  }
  c.fillStyle = '#2f5a48';
  c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(255,255,255,0.1)';
  for (let yy = y; yy < y + h; yy += 12) c.fillRect(x, yy, w, 1);
  for (let xx = x; xx < x + w; xx += 16) c.fillRect(xx, y, 1, h);
  // The fascia, its gilt letters faded
  c.fillStyle = '#3a1e22';
  c.fillRect(x, y, w, 26);
  text(c, PUB.name, x + w / 2, y + 14, w - 30, 18, '#a88a4a');
  // Boarded windows and the boarded doors between
  for (const [bx, bw] of [
    [x + 14, 120],
    [x + 160, 70],
    [x + 250, 120],
    [x + 396, 100],
  ]) {
    c.fillStyle = PAL.ink;
    c.fillRect(bx - 3, y + 32, bw + 6, h - 40);
    c.fillStyle = bw === 70 ? '#8a7350' : '#a88a5c';
    c.fillRect(bx, y + 35, bw, h - 46);
    c.fillStyle = 'rgba(60,40,20,0.35)';
    for (let k = 1; k < 3; k++) c.fillRect(bx + (bw * k) / 3, y + 35, 2, h - 46);
    c.fillStyle = '#c23a3a';
    c.font = `700 10px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    if (bw !== 70) c.fillText('KEEP OUT', bx + bw / 2, y + h / 2 + 8);
  }
}
/** The pub's upper floor: stock brick, sashes boarded */
function pubUpper(c: CanvasRenderingContext2D, [x, y, w, h]: Cell, glow: boolean) {
  if (glow) {
    c.fillStyle = '#000';
    c.fillRect(x, y, w, h);
    return;
  }
  c.fillStyle = '#9c8460';
  c.fillRect(x, y, w, h);
  c.fillStyle = '#7a6648';
  for (let yy = y; yy < y + h; yy += 6) {
    c.fillRect(x, yy, w, 1);
    for (let xx = x + ((yy - y) % 12 ? 0 : 6); xx < x + w; xx += 12) c.fillRect(xx, yy, 1, 6);
  }
  c.fillStyle = 'rgba(25,22,20,0.25)';
  c.fillRect(x, y + h - 14, w, 14);
  for (let k = 0; k < 4; k++) {
    const bx = x + 24 + k * 124;
    c.fillStyle = '#d8d4c8';
    c.fillRect(bx - 4, y + 18, 72, h - 34);
    c.fillStyle = k === 2 ? '#2a2c38' : '#a88a5c';
    c.fillRect(bx, y + 22, 64, h - 42);
    if (k === 2) {
      c.fillStyle = '#4a4d56';
      c.fillRect(bx + 4, y + 26, 56, 4);
    }
  }
}
function drawAtlas(c: CanvasRenderingContext2D, glow: boolean) {
  c.clearRect(0, 0, AW, AH);
  PARADE_UNITS.forEach((u, k) => shopfront(c, CELLS[`unit${k}`], u.name, u.kind, !!u.shut, glow, 50 + k));
  shopfront(c, CELLS.lucky, CORNER_SHOPS[0].name, 'news', false, glow, 70);
  shopfront(c, CELLS.nightday, CORNER_SHOPS[1].name, 'offy', false, glow, 71);
  // The corner shops' side: their fascia and windows full of posters
  {
    const [x, y, w, h] = CELLS.side;
    if (glow) {
      c.fillStyle = '#000';
      c.fillRect(x, y, w, h);
      c.fillStyle = PAL.warm;
      c.fillRect(x + 20, y + 60, w - 40, h - 80);
    } else {
      c.fillStyle = '#9c8460';
      c.fillRect(x, y, w, h);
      c.fillStyle = '#2a3c5a';
      c.fillRect(x, y, w, 44);
      text(c, 'FOOD · WINE · OFF LICENCE', x + w / 2, y + 23, w - 30, 28, '#f2c94c');
      c.fillStyle = PAL.ink;
      c.fillRect(x + 17, y + 57, w - 34, h - 74);
      c.fillStyle = '#4a3a2a';
      c.fillRect(x + 20, y + 60, w - 40, h - 80);
      const r = rng(9);
      for (let k = 0; k < 7; k++) {
        c.fillStyle = ['#e8e2d2', '#f2c94c', '#c23a2a', '#2d6ab0'][k % 4];
        c.fillRect(x + 26 + k * 66 + r() * 8, y + 66 + r() * 20, 50, 40);
      }
    }
  }
  pubGround(c, CELLS.pubG, glow);
  pubUpper(c, CELLS.pubU, glow);
  // The community centre's sign: letters missing, one hanging askew
  {
    const [x, y, w, h] = CELLS.centre;
    if (glow) {
      c.fillStyle = '#000';
      c.fillRect(x, y, w, h);
    } else {
      c.fillStyle = '#e8e2d2';
      c.fillRect(x, y, w, h);
      c.fillStyle = 'rgba(60,50,40,0.25)';
      c.fillRect(x, y + h - 10, w, 10);
      c.font = `900 34px ${FONT_DISPLAY}`;
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      const s = CENTRE.name;
      const step = (w - 30) / s.length;
      for (let k = 0; k < s.length; k++) {
        if ([3, 11, 16, 21].includes(k)) {
          // (a missing letter's ghost)
          c.fillStyle = 'rgba(60,50,40,0.18)';
          c.fillText(s[k], x + 15 + k * step, y + h / 2);
          continue;
        }
        c.save();
        c.translate(x + 15 + k * step, y + h / 2);
        if (k === 7) c.rotate(0.5);
        c.fillStyle = '#2f5a3e';
        c.fillText(s[k], 0, 0);
        c.restore();
      }
    }
  }
  // Bunker Sound: the garage's roller door half up on foam-lined walls, a steel door, the name stencilled
  {
    const [x, y, w, h] = CELLS.studio;
    const dw = w * 0.56;
    if (glow) {
      c.fillStyle = '#000';
      c.fillRect(x, y, w, h);
      c.fillStyle = '#7a2a8a';
      c.fillRect(x + 14, y + h * 0.42, dw, h * 0.58);
    } else {
      c.fillStyle = '#4b3f46';
      c.fillRect(x, y, w, h);
      c.fillStyle = PAL.ink;
      c.fillRect(x + 11, y + 8, dw + 6, h - 8);
      // (the shutter, rolled half up)
      c.fillStyle = '#3d5a7a';
      c.fillRect(x + 14, y + 11, dw, h * 0.42 - 11);
      c.fillStyle = '#2d4a6a';
      for (let yy = y + 14; yy < y + h * 0.42; yy += 5) c.fillRect(x + 14, yy, dw, 1.5);
      // (inside: grey foam in pyramids, a desk's edge, the speakers)
      c.fillStyle = '#3a3640';
      c.fillRect(x + 14, y + h * 0.42, dw, h * 0.58);
      c.fillStyle = '#4a4652';
      for (let fy = y + h * 0.42 + 4; fy < y + h - 10; fy += 10)
        for (let fx = x + 18 + ((fy - y) % 20 ? 5 : 0); fx < x + 14 + dw - 6; fx += 10) {
          c.beginPath();
          c.moveTo(fx, fy + 8);
          c.lineTo(fx + 4, fy);
          c.lineTo(fx + 8, fy + 8);
          c.fill();
        }
      c.fillStyle = '#1d1c22';
      c.fillRect(x + 30, y + h - 26, dw - 40, 10);
      c.fillRect(x + 36, y + h - 50, 18, 24);
      c.fillRect(x + dw - 30, y + h - 50, 18, 24);
      // (the steel door, the name over it)
      const dx = x + dw + 40;
      c.fillStyle = PAL.ink;
      c.fillRect(dx - 3, y + 30, 92, h - 30);
      c.fillStyle = '#5a5d66';
      c.fillRect(dx, y + 33, 86, h - 33);
      c.fillStyle = '#c4c8d2';
      c.fillRect(dx + 70, y + h * 0.6, 8, 6);
      c.font = `900 22px ${FONT_DISPLAY}`;
      c.fillStyle = '#e8e2d2';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(STUDIO.name, dx + 43, y + 16);
    }
  }
  // The pub's hanging sign: a faded duke in a ruff
  {
    const [x, y, w, h] = CELLS.pubsign;
    if (glow) {
      c.fillStyle = '#000';
      c.fillRect(x, y, w, h);
    } else {
      c.fillStyle = '#3a1e22';
      c.fillRect(x, y, w, h);
      c.fillStyle = '#a88a4a';
      c.fillRect(x + 6, y + 6, w - 12, h - 12);
      c.fillStyle = '#5a4a3a';
      c.fillRect(x + 10, y + 10, w - 20, h - 20);
      c.fillStyle = '#c9a88a';
      c.beginPath();
      c.arc(x + w / 2, y + 52, 20, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#e8e2d2';
      c.beginPath();
      c.ellipse(x + w / 2, y + 76, 30, 9, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#6a1e2a';
      c.fillRect(x + w / 2 - 26, y + 82, 52, 30);
      text(c, 'THE DUKE', x + w / 2, y + 22, w - 30, 14, '#a88a4a');
    }
  }
  // NO BALL GAMES
  {
    const [x, y, w, h] = CELLS.noball;
    if (glow) {
      c.fillStyle = '#000';
      c.fillRect(x, y, w, h);
    } else {
      c.fillStyle = '#f0ece0';
      c.fillRect(x, y, w, h);
      c.strokeStyle = '#2f5a3e';
      c.lineWidth = 6;
      c.strokeRect(x + 5, y + 5, w - 10, h - 10);
      text(c, 'NO BALL', x + w / 2, y + 44, w - 30, 40, '#c23a2a');
      text(c, 'GAMES', x + w / 2, y + 84, w - 30, 40, '#c23a2a');
      c.fillStyle = 'rgba(40,36,30,0.35)';
      c.fillRect(x + 8, y + h - 18, w - 16, 10);
    }
  }
  // The estate board: its name, the blocks' names
  {
    const [x, y, w, h] = CELLS.board;
    if (glow) {
      c.fillStyle = '#000';
      c.fillRect(x, y, w, h);
    } else {
      c.fillStyle = '#2f5a3e';
      c.fillRect(x, y, w, h);
      c.strokeStyle = '#e8e2d2';
      c.lineWidth = 3;
      c.strokeRect(x + 4, y + 4, w - 8, h - 8);
      text(c, ENDSWOOD_NAME.toUpperCase(), x + w / 2, y + 22, w - 20, 22, '#e8e2d2');
      const names = [...new Set(BLOCKS.filter((b) => b.kind !== 'garages').map((b) => b.name))];
      c.font = `700 11px ${FONT_DISPLAY}`;
      c.textAlign = 'left';
      names.forEach((n, i) => {
        c.fillStyle = '#e8e2d2';
        c.fillText(`· ${n}`, x + 12 + (i % 2) * 90, y + 48 + Math.floor(i / 2) * 15);
      });
    }
  }
}
const ATLAS = (() => {
  const map = canvasTex(AW, AH, (c) => drawAtlas(c, false));
  const emissiveMap = canvasTex(AW / 2, Math.ceil(AH / 2), (c) => {
    c.scale(0.5, 0.5);
    drawAtlas(c, true);
  });
  return siteMat('ends-shops', lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff' }), 0.08, 0.95));
})();
/** A quad, its middle at (x, y, z), facing n, w by h, a cell of the atlas on it */
function pane(b: Batch, cell: string, x: number, y: number, z: number, n: Pt, w: number, h: number) {
  const [cx, cyy, cw, ch] = CELLS[cell];
  const [u0, u1] = [cx / AW, (cx + cw) / AW];
  const [v1, v0] = [1 - cyy / AH, 1 - (cyy + ch) / AH];
  const g = new THREE.PlaneGeometry(w, h);
  g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v1, u1, v1, u0, v0, u1, v0], 2));
  b.add(g.rotateY(Math.atan2(n[0], n[1])).translate(x, y, z), ATLAS);
}

/* ---------- Helpers ---------- */

const SPAN = 9;
const pieces = (a: number, c: number) => {
  const n = Math.max(1, Math.ceil(Math.abs(c - a) / SPAN));
  return Array.from({ length: n }, (_, k): [number, number] => [a + ((c - a) * k) / n, a + ((c - a) * (k + 1)) / n]);
};
function block(b: Batch, [x0, z0, x1, z1]: Rect, y0: number, y1: number, m: THREE.Material) {
  if (x1 - x0 >= z1 - z0) for (const [a, c] of pieces(x0, x1)) b.box(a, y0, z0, c - a, y1 - y0, z1 - z0, m);
  else for (const [a, c] of pieces(z0, z1)) b.box(x0, y0, a, x1 - x0, y1 - y0, c - a, m);
}
function flat(b: Batch, [x0, z0, x1, z1]: Rect, y: number, m: THREE.Material) {
  for (const [a, c] of pieces(x0, x1)) for (const [p, q] of pieces(z0, z1)) b.add(new THREE.PlaneGeometry(c - a, q - p).rotateX(-Math.PI / 2).translate((a + c) / 2, y, (p + q) / 2), m);
}
/** A flat strip from a to c, w wide, at y */
function strip(b: Batch, a: Pt, c: Pt, w: number, y: number, m: THREE.Material) {
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (l < 1e-3) return;
  b.add(
    new THREE.PlaneGeometry(l, w)
      .rotateX(-Math.PI / 2)
      .rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0]))
      .translate((a[0] + c[0]) / 2, y, (a[1] + c[1]) / 2),
    m
  );
}
type V3 = [number, number, number];
function poly(b: Batch, pts: V3[], m: THREE.Material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
  g.setIndex(pts.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  b.add(g, m);
}
/** A pole from (x, y0, z) up h */
const pole = (b: Batch, x: number, z: number, y0: number, h: number, r: number, m: THREE.Material, seg = 6) => b.add(new THREE.CylinderGeometry(r, r, h, seg, 1, true).translate(x, y0 + h / 2, z), m);
/** A thin bar between two points */
function bar(b: Batch, p: V3, q: V3, r: number, m: THREE.Material) {
  const d = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
  const len = d.length();
  const g = new THREE.CylinderGeometry(r, r, len, 5, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  b.add(g.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2), m);
}
/** Low railings along runs (thin rects): posts every `step`, two rails; near only the bars */
function railings(b: Batch, runs: Rect[], h: number, m: THREE.Material, step: number, low: boolean) {
  for (const [x0, z0, x1, z1] of runs) {
    const alongX = x1 - x0 >= z1 - z0;
    const [a, c] = alongX ? [x0, x1] : [z0, z1];
    const mid = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2;
    const at = (u: number): Pt => (alongX ? [u, mid] : [mid, u]);
    for (const y of [SLAB_Y + h - 0.05, SLAB_Y + 0.2]) {
      const [p, q] = [at(a), at(c)];
      for (const [s0, s1] of pieces(0, 1)) bar(b, [p[0] + (q[0] - p[0]) * s0, y, p[1] + (q[1] - p[1]) * s0], [p[0] + (q[0] - p[0]) * s1, y, p[1] + (q[1] - p[1]) * s1], 0.025, m);
    }
    for (let u = a; u <= c + 1e-6; u += step) {
      const [px, pz] = at(Math.min(u, c));
      b.box(px - 0.035, SLAB_Y, pz - 0.035, 0.07, h, 0.07, m);
    }
    b.detail(() => {
      if (low) return;
      for (let u = a + 0.15; u < c; u += 0.15) {
        const [px, pz] = at(u);
        b.box(px - 0.012, SLAB_Y + 0.2, pz - 0.012, 0.024, h - 0.25, 0.024, m);
      }
    });
  }
}
/** A bench: concrete legs, a timber seat and back, facing n */
function bench(b: Batch, [x, z]: Pt, n: Pt) {
  const alongX = n[0] === 0;
  const [w, d] = alongX ? [1.5, 0.45] : [0.45, 1.5];
  for (const k of [-0.55, 0.55]) b.box(x + (alongX ? k : 0) - 0.08, SLAB_Y, z + (alongX ? 0 : k) - 0.08, 0.16, 0.42, 0.16, CONCRETE);
  b.box(x - w / 2, SLAB_Y + 0.42, z - d / 2, w, 0.06, d, TIMBER);
  const bk: Pt = [x - n[0] * 0.2, z - n[1] * 0.2];
  b.box(bk[0] - (alongX ? w / 2 : 0.03), SLAB_Y + 0.5, bk[1] - (alongX ? 0.03 : w / 2), alongX ? w : 0.06, 0.35, alongX ? 0.06 : w, TIMBER);
}
const litterBin = (b: Batch, x: number, z: number) => b.add(new THREE.CylinderGeometry(0.22, 0.2, 0.75, 8).translate(x, SLAB_Y + 0.375, z), BLACK);

/* ---------- The parade ---------- */

function parade(b: Batch, fx: Batch, low: boolean) {
  const z = PARADE.z;
  const h = CANOPY.y - SLAB_Y;
  PARADE_UNITS.forEach((u, k) => {
    const [a, c] = unitX(k);
    pane(b, `unit${k}`, (a + c) / 2, SLAB_Y + h / 2, z - 0.008, [0, -1], c - a, h);
    // (the piers between the units)
    b.box(a - 0.06, SLAB_Y, z - 0.08, 0.12, h, 0.08, ENG_BRICK);
    if (u.shut) b.detail(() => tag(fx, k * 3 + 1, 1.2, [0, -1], (a + c) / 2, SLAB_Y + 0.6, z - 0.016));
  });
  // The canopy over them, its fascia's lip, its soffit
  const [x0, x1] = [PARADE.x0 - 0.2, PARADE.x1 + 0.2];
  const zc0 = z - CANOPY.out;
  block(b, [x0, zc0, x1, z], CANOPY.y, CANOPY.y + CANOPY.t, CONCRETE);
  flat(b, [x0, zc0, x1, z], CANOPY.y - 0.004, SOFFIT);
  block(b, [x0, zc0 - 0.08, x1, zc0], CANOPY.y - 0.06, CANOPY.y + CANOPY.t + 0.08, CONCRETE_DARK);
  // The forecourt's bollards, a bin or two
  for (const [x, zz] of FORECOURT_BOLLARDS) {
    b.add(new THREE.CylinderGeometry(BOLLARD.r, BOLLARD.r * 1.08, BOLLARD.h, low ? 6 : 10).translate(x, SLAB_Y + BOLLARD.h / 2, zz), CONCRETE);
    b.add(new THREE.CylinderGeometry(BOLLARD.r + 0.01, BOLLARD.r + 0.01, 0.06, low ? 6 : 10, 1, true).translate(x, SLAB_Y + BOLLARD.h - 0.15, zz), CONCRETE_DARK);
  }
  litterBin(b, -33.5, 384.4);
  litterBin(b, -19.8, 384.4);
}

/* ---------- Corner shops, the pub, the community centre ---------- */

function cornerShop(b: Batch, s: (typeof CORNER_SHOPS)[number], cell: string, low: boolean) {
  const [x0, z0, x1, z1] = s.rect;
  const g = GROUND;
  block(b, s.rect, SLAB_Y, s.h, STOCK);
  block(b, [x0 - 0.04, z0 - 0.04, x1 + 0.04, z1 + 0.04], s.h, s.h + 0.25, STOCK_DARK);
  flat(b, [x0 + 0.05, z0 + 0.05, x1 - 0.05, z1 - 0.05], s.h + 0.2, FELT);
  // The shop's front on the road, its side on the side street
  pane(b, cell, (x0 + x1) / 2, SLAB_Y + g / 2, z1 + 0.008, [0, 1], x1 - x0, g);
  const sx = s.side === 'e' ? x1 + 0.008 : x0 - 0.008;
  pane(b, 'side', sx, SLAB_Y + g / 2, (z0 + z1) / 2, [s.side === 'e' ? 1 : -1, 0], z1 - z0, g);
  // The flat over it: sashes on both faces
  for (let x = x0 + 0.7; x < x1 - 0.5; x += 1.4) sash(b, x, SLAB_Y + g + 0.55, z1 + 0.01, [0, 1]);
  for (let zz = z0 + 0.8; zz < z1 - 0.5; zz += 1.5) sash(b, sx + (s.side === 'e' ? 0.002 : -0.002), SLAB_Y + g + 0.55, zz, [s.side === 'e' ? 1 : -1, 0]);
  // Near only: fruit and veg in crates on a stand out front
  b.detail(() => {
    if (low) return;
    const zf = z1 + 0.45;
    for (let k = 0; k < 3; k++) {
      const x = x0 + 0.5 + k * 0.6;
      b.box(x - 0.25, SLAB_Y + 0.4, zf - 0.2, 0.5, 0.14, 0.4, CRATE);
      for (let f = 0; f < 3; f++) b.add(new THREE.IcosahedronGeometry(0.07, 0).translate(x - 0.15 + f * 0.15, SLAB_Y + 0.58, zf), FRUIT[(k + f) % FRUIT.length]);
    }
    b.box(x0 + 0.2, SLAB_Y, zf - 0.22, 1.8, 0.4, 0.04, TIMBER);
  });
}
/** A sash window on a face: its white frame, dark glass, the meeting rail (the middle at x, y, z) */
function sash(b: Batch, x: number, y: number, z: number, n: Pt) {
  const along = n[1] !== 0;
  const [w, h] = [0.6, 0.85];
  const t = 0.02;
  b.box(x - (along ? w / 2 : t), y - h / 2, z - (along ? t : w / 2), along ? w : 2 * t, h, along ? 2 * t : w, SASH);
  b.add(
    new THREE.PlaneGeometry(w - 0.1, h - 0.1)
      .rotateY(Math.atan2(n[0], n[1]))
      .translate(x + n[0] * (t + 0.004), y, z + n[1] * (t + 0.004)),
    GLASS
  );
  b.box(x - (along ? w / 2 : t + 0.006), y - 0.02, z - (along ? t + 0.006 : w / 2), along ? w : 2 * t + 0.012, 0.04, along ? 2 * t + 0.012 : w, SASH);
}
function pub(b: Batch, fx: Batch, low: boolean) {
  const [x0, z0, x1, z1] = PUB.rect;
  const g = 1.7;
  block(b, PUB.rect, SLAB_Y, PUB.eaves, STOCK);
  // Its fronts on the road (north) and the avenue (west): the tiled ground floor, the boarded sashes over it
  pane(b, 'pubG', (x0 + x1) / 2, SLAB_Y + g / 2, z0 - 0.008, [0, -1], x1 - x0, g);
  pane(b, 'pubU', (x0 + x1) / 2, SLAB_Y + g + (PUB.eaves - SLAB_Y - g) / 2, z0 - 0.008, [0, -1], x1 - x0, PUB.eaves - SLAB_Y - g);
  pane(b, 'pubG', x0 - 0.008, SLAB_Y + g / 2, (z0 + z1) / 2, [-1, 0], z1 - z0, g);
  pane(b, 'pubU', x0 - 0.008, SLAB_Y + g + (PUB.eaves - SLAB_Y - g) / 2, (z0 + z1) / 2, [-1, 0], z1 - z0, PUB.eaves - SLAB_Y - g);
  // (a cornice between the floors and under the eaves)
  for (const y of [SLAB_Y + g, PUB.eaves - 0.12]) block(b, [x0 - 0.06, z0 - 0.06, x1 + 0.06, z1 + 0.06], y, y + 0.12, STOCK_DARK);
  // The back and the other side: brick, boarded windows, the back door shut (the way in, later)
  for (let x = x0 + 1.2; x < x1 - 1; x += 2.2) b.box(x - 0.35, SLAB_Y + 2.2, z1, 0.7, 0.85, 0.05, PLY_OLD);
  b.box(PUB.back[0] - 0.45, SLAB_Y, z1, 0.9, 1.35, 0.06, PLY);
  for (let zz = z0 + 1.4; zz < z1 - 1; zz += 2.4) b.box(x1, SLAB_Y + 2.2, zz - 0.35, 0.05, 0.85, 0.7, PLY_OLD);
  // The hipped slate roof, two chimneys
  const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  const o = 0.25;
  const [ex0, ez0, ex1, ez1] = [x0 - o, z0 - o, x1 + o, z1 + o];
  const hr = (ez1 - ez0) / 2;
  const [rx0, rx1] = [cx - Math.max(0.05, (ex1 - ex0) / 2 - hr), cx + Math.max(0.05, (ex1 - ex0) / 2 - hr)];
  const e = PUB.eaves - 0.05;
  poly(b, [[ex0, e, ez0], [rx0, PUB.ridge, cz], [rx1, PUB.ridge, cz], [ex1, e, ez0]], SLATE);
  poly(b, [[ex1, e, ez1], [rx1, PUB.ridge, cz], [rx0, PUB.ridge, cz], [ex0, e, ez1]], SLATE);
  poly(b, [[ex0, e, ez1], [rx0, PUB.ridge, cz], [ex0, e, ez0]], SLATE);
  poly(b, [[ex1, e, ez0], [rx1, PUB.ridge, cz], [ex1, e, ez1]], SLATE);
  for (const x of [x0 + 1.2, x1 - 1.2]) {
    b.box(x - 0.3, PUB.eaves - 0.3, cz - 0.4, 0.6, 2.0, 0.8, STOCK_DARK);
    for (const k of [-0.18, 0.18]) pole(b, x, cz + k, PUB.eaves + 1.7, 0.3, 0.07, PLY_OLD);
  }
  // The hanging sign on its bracket at the corner, both faces
  const [sx, sz] = [x0 - 0.65, z0 - 0.65];
  bar(b, [x0, SLAB_Y + 2.9, z0], [sx, SLAB_Y + 2.9, sz], 0.03, BLACK);
  for (const s of [1, -1]) {
    const n: Pt = [s * Math.SQRT1_2, -s * Math.SQRT1_2];
    pane(b, 'pubsign', sx + n[0] * 0.01, SLAB_Y + 2.45, sz + n[1] * 0.01, n, 0.8, 0.8);
  }
  b.detail(() => {
    if (low) return;
    tag(fx, 4, 1.4, [0, -1], x0 + 2.4, SLAB_Y + 0.7, z0 - 0.016);
    tag(fx, 9, 1.1, [-1, 0], x0 - 0.016, SLAB_Y + 0.8, z0 + 5.2);
    poster(fx, 3, 1, [0, -1], x0 + 5.6, SLAB_Y + 0.85, z0 - 0.014);
  });
}
function centre(b: Batch, fx: Batch, low: boolean) {
  const [x0, z0, x1, z1] = CENTRE.rect;
  const [hx0, , hx1] = CENTRE.hall;
  block(b, [hx1, z0, x1, z1], SLAB_Y, CENTRE.h, BROWN_BRICK);
  block(b, CENTRE.hall, SLAB_Y, CENTRE.hallH, BROWN_BRICK);
  // Flat roofs, their coping
  flat(b, [hx1 + 0.05, z0 + 0.05, x1 - 0.05, z1 - 0.05], CENTRE.h + 0.004, FELT);
  flat(b, [hx0 + 0.05, z0 + 0.05, hx1 - 0.05, z1 - 0.05], CENTRE.hallH + 0.004, FELT);
  for (const [r, y] of [
    [[hx1, z0, x1, z1], CENTRE.h],
    [CENTRE.hall, CENTRE.hallH],
  ] as [Rect, number][]) {
    const [a0, b0, a1, b1] = r;
    for (const e of [
      [a0, b0, a1, b0 + 0.15],
      [a0, b1 - 0.15, a1, b1],
      [a0, b0, a0 + 0.15, b1],
      [a1 - 0.15, b0, a1, b1],
    ] as Rect[])
      block(b, e, y, y + 0.2, CONCRETE);
  }
  // Its front on the avenue's side (east): the sign over the doors' steel shutters; every window boarded
  const [fx0, fz] = CENTRE.front;
  pane(b, 'centre', fx0 - 0.5 + 0.008, CENTRE.h - 0.45, fz, [1, 0], 7.6, 0.85);
  b.box(x1, SLAB_Y, fz - 1.1, 0.06, 1.45, 2.2, STEEL);
  const boards = (n: Pt, at: number, a: number, c: number, y: number, h: number, skip: number[]) => {
    for (let u = a + 1; u < c - 0.8; u += 2.4) {
      if (skip.some((v) => Math.abs(u - v) < 1.6)) continue;
      const m = u % 4.8 < 2.4 ? PLY_OLD : PLY;
      if (n[1]) b.box(u - 0.6, y, at + (n[1] < 0 ? -0.05 : 0), 1.2, h, 0.05, m);
      else b.box(at + (n[0] < 0 ? -0.05 : 0), y, u - 0.6, 0.05, h, 1.2, m);
    }
  };
  boards([0, -1], z0, x0, x1, SLAB_Y + 0.6, 0.9, []);
  boards([0, 1], z1, x0, x1, SLAB_Y + 0.6, 0.9, [CENTRE.back[0]]);
  boards([1, 0], x1, z0, z1, SLAB_Y + 0.6, 0.9, [fz]);
  boards([-1, 0], x0, z0, z1, SLAB_Y + 1.6, 1.2, []);
  // The back door (the way in, later): its steel plate bent at a corner
  b.box(CENTRE.back[0] - 0.5, SLAB_Y, z1, 1, 1.4, 0.05, STEEL_DARK);
  b.detail(() => {
    if (low) return;
    tag(fx, 2, 1.6, [0, -1], -44, SLAB_Y + 0.6, z0 - 0.016);
    tag(fx, 6, 1.3, [1, 0], x1 + 0.016, SLAB_Y + 0.5, z0 + 2.6);
    tag(fx, 11, 1.2, [1, 0], x1 + 0.016, SLAB_Y + 0.55, z1 - 2.8);
    tag(fx, 8, 1.4, [0, 1], -34, SLAB_Y + 0.6, z1 + 0.016);
    poster(fx, 1, 1, [1, 0], x1 + 0.014, SLAB_Y + 1.05, fz + 1.7);
    // (weeds along its foot)
    const r = rng(77);
    for (let k = 0; k < 18; k++) {
      const x = x0 + r() * (x1 - x0);
      const zz = r() < 0.5 ? z0 - 0.25 : z1 + 0.25;
      b.add(new THREE.ConeGeometry(0.12 + r() * 0.1, 0.3 + r() * 0.3, 4).translate(x, SLAB_Y + 0.2, zz), WEED);
    }
  });
}

/* ---------- Bunker Sound ---------- */

function studio(b: Batch, low: boolean) {
  const { x0, x1, z } = STUDIO;
  pane(b, 'studio', (x0 + x1) / 2, SLAB_Y + GROUND / 2, z - 0.008, [0, -1], x1 - x0, GROUND);
  // The ON AIR light over the steel door
  const dx = x0 + ((x1 - x0) * (0.56 * 512 + 40 + 43)) / 512;
  b.box(dx - 0.28, SLAB_Y + GROUND - 0.2, z - 0.1, 0.56, 0.16, 0.1, BLACK);
  b.box(dx - 0.24, SLAB_Y + GROUND - 0.18, z - 0.106, 0.48, 0.12, 0.004, ON_AIR);
  // The sofa out on the yard, the amp, a cable to the door
  const [sx0, sz0, sx1, sz1] = STUDIO.sofa;
  b.box(sx0, SLAB_Y, sz0, sx1 - sx0, SOFA_H * 0.55, sz1 - sz0, SOFA);
  b.box(sx0, SLAB_Y, sz1 - 0.22, sx1 - sx0, SOFA_H * 1.5, 0.22, SOFA_DARK);
  for (const x of [sx0, sx1 - 0.2]) b.box(x, SLAB_Y, sz0, 0.2, SOFA_H * 0.95, sz1 - sz0, SOFA_DARK);
  const [ax0, az0, ax1, az1] = STUDIO.amp;
  b.box(ax0, SLAB_Y, az0, ax1 - ax0, AMP_H, az1 - az0, AMP);
  b.detail(() => {
    if (low) return;
    b.box(ax0 + 0.06, SLAB_Y + 0.08, az0 - 0.004, ax1 - ax0 - 0.12, AMP_H - 0.2, 0.004, GRILLE);
    strip(b, [(ax0 + ax1) / 2, az1], STUDIO.door, 0.03, SLAB_Y + 0.008, BLACK);
    // (a crate for a table, a can on it)
    b.box(-79.8, SLAB_Y, 348.2, 0.45, 0.3, 0.4, CRATE);
  });
}
/** The pirate aerial on Harrier Point's roof: a lattice mast, its dipoles */
function aerial(b: Batch, low: boolean) {
  const { x, z, foot, top } = AERIAL;
  const r = 0.12;
  const legs: Pt[] = [0, 1, 2].map((k): Pt => [x + r * Math.cos((k * 2 * Math.PI) / 3), z + r * Math.sin((k * 2 * Math.PI) / 3)]);
  for (const [lx, lz] of legs) b.box(lx - 0.015, foot, lz - 0.015, 0.03, top - foot, 0.03, STEEL);
  b.detail(() => {
    if (low) return;
    for (let y = foot + 0.2; y < top - 0.1; y += 0.3)
      for (let k = 0; k < 3; k++) {
        const [p, q] = [legs[k], legs[(k + 1) % 3]];
        bar(b, [p[0], y, p[1]], [q[0], y + 0.15, q[1]], 0.008, STEEL);
      }
  });
  for (const [y, w] of [
    [top - 0.15, 0.9],
    [top - 0.5, 0.7],
  ]) {
    b.box(x - w / 2, y, z - 0.012, w, 0.024, 0.024, STEEL_DARK);
    b.box(x - 0.012, y, z - w / 2, 0.024, 0.024, w, STEEL_DARK);
  }
}

/* ---------- The green, the pitch, the playground ---------- */

function green(b: Batch, low: boolean) {
  flat(b, GREEN.rect, SLAB_Y + 0.006, GRASS);
  for (const [p, q] of GREEN.lines) strip(b, p, q, 0.75, SLAB_Y + 0.011, DIRT);
  railings(b, GREEN_RUNS, LOW_RAIL.h, GREEN_RAIL, 1.2, low);
  bench(b, GREEN.benches[0], [0, -1]);
  bench(b, GREEN.benches[1], [1, 0]);
  litterBin(b, -44, 364.7);
  // NO BALL GAMES on its post, facing the road
  const [sx, sz] = GREEN.sign;
  b.box(sx - 0.04, SLAB_Y, sz - 0.04, 0.08, 1.5, 0.08, STEEL);
  b.box(sx - 0.46, SLAB_Y + 1.05, sz - 0.02, 0.92, 0.62, 0.02, STEEL);
  pane(b, 'noball', sx, SLAB_Y + 1.36, sz + 0.006, [0, 1], 0.88, 0.58);
}
function pitch(b: Batch, fx: Batch, low: boolean) {
  const [x0, z0, x1, z1] = PITCH.rect;
  const y = SLAB_Y + 0.008;
  flat(b, PITCH.rect, y, RED_COURT);
  // The lines: the border, the halfway line, the centre circle, the D at each end
  const ly = y + 0.006;
  const i = 0.35;
  for (const [p, q] of [
    [[x0 + i, z0 + i], [x1 - i, z0 + i]],
    [[x0 + i, z1 - i], [x1 - i, z1 - i]],
    [[x0 + i, z0 + i], [x0 + i, z1 - i]],
    [[x1 - i, z0 + i], [x1 - i, z1 - i]],
    [[x0 + i, (z0 + z1) / 2], [x1 - i, (z0 + z1) / 2]],
  ] as [Pt, Pt][])
    strip(b, p, q, 0.07, ly, WHITE);
  const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  b.add(new THREE.RingGeometry(1.4, 1.47, low ? 16 : 28).rotateX(-Math.PI / 2).translate(cx, ly, cz), WHITE);
  for (const [zz, s] of [
    [z0 + i, 1],
    [z1 - i, -1],
  ] as const)
    b.add(
      new THREE.RingGeometry(2, 2.07, low ? 8 : 14, 1, s > 0 ? Math.PI : 0, Math.PI)
        .rotateX(-Math.PI / 2)
        .translate(cx, ly, zz),
      WHITE
    );
  // The goals in the end fences, a hoop over each
  for (const [zz, s] of [
    [z0 + 0.12, 1],
    [z1 - 0.12, -1],
  ] as const) {
    for (const x of [cx - 1, cx + 1]) b.box(x - 0.05, SLAB_Y, zz - 0.05, 0.1, 1.1, 0.1, WHITE);
    b.box(cx - 1.05, SLAB_Y + 1.05, zz - 0.05, 2.1, 0.1, 0.1, WHITE);
    b.box(cx - 0.55, SLAB_Y + 2.1, zz - 0.03 + s * 0.05, 1.1, 0.7, 0.04, WHITE);
    b.add(new THREE.TorusGeometry(0.2, 0.02, 4, low ? 8 : 12).rotateX(Math.PI / 2).translate(cx, SLAB_Y + 2.15, zz + s * 0.3), HOOP);
  }
  // The fence: green posts and rails, kick boards at the foot, the mesh in the FX layer
  for (const [rx0, rz0, rx1, rz1] of PITCH_RUNS) {
    const alongX = rx1 - rx0 >= rz1 - rz0;
    const [a, c] = alongX ? [rx0, rx1] : [rz0, rz1];
    const mid = alongX ? (rz0 + rz1) / 2 : (rx0 + rx1) / 2;
    const at = (u: number): Pt => (alongX ? [u, mid] : [mid, u]);
    for (let u = a; u <= c + 1e-6; u += 2.4) {
      const [px, pz] = at(Math.min(u, c));
      b.box(px - 0.05, SLAB_Y, pz - 0.05, 0.1, PITCH.h, 0.1, GREEN_RAIL);
    }
    for (const [s0, s1] of pieces(a, c)) {
      const [p, q] = [at(s0), at(s1)];
      for (const yy of [PITCH.h - 0.05, 1.2]) bar(b, [p[0], SLAB_Y + yy, p[1]], [q[0], SLAB_Y + yy, q[1]], 0.03, GREEN_RAIL);
      block(b, alongX ? [s0, mid - 0.03, s1, mid + 0.03] : [mid - 0.03, s0, mid + 0.03, s1], SLAB_Y, SLAB_Y + 0.45, GREEN_RAIL);
      chainMesh(fx, p, q, SLAB_Y + 0.45, PITCH.h - 0.5);
    }
  }
}
function playground(b: Batch, low: boolean) {
  const [x0, z0] = PLAYGROUND.rect;
  flat(b, PLAYGROUND.rect, SLAB_Y + 0.006, RUBBER_2);
  flat(b, [x0 + 0.6, z0 + 0.6, x0 + 6.6, z0 + 6], SLAB_Y + 0.011, RUBBER);
  railings(b, PLAY_RUNS, LOW_RAIL.h, GREEN_RAIL, 1.2, low);
  // The swings: an A-frame each end, the bar, two seats on chains
  const { x0: sx0, x1: sx1, z: sz, h } = PLAYGROUND.swings;
  for (const x of [sx0, sx1])
    for (const o of [-0.65, 0.65]) bar(b, [x, SLAB_Y, sz + o], [x, SLAB_Y + h, sz], 0.05, PLAY_BLUE);
  bar(b, [sx0, SLAB_Y + h, sz], [sx1, SLAB_Y + h, sz], 0.05, PLAY_BLUE);
  for (const x of [sx0 + 1.3, sx1 - 1.3]) {
    for (const o of [-0.2, 0.2]) b.box(x + o - 0.01, SLAB_Y + 0.5, sz - 0.01, 0.02, h - 0.5, 0.02, STEEL);
    b.box(x - 0.25, SLAB_Y + 0.45, sz - 0.1, 0.5, 0.05, 0.2, BLACK);
  }
  // The slide: its platform on legs, the ladder, the chute down to the north
  const [lx0, lz0, , lz1] = PLAYGROUND.slide;
  const pz = lz1 - 1;
  const py = SLAB_Y + 1.25;
  for (const x of [lx0 + 0.1, lx0 + 1.1]) for (const zz of [pz - 0.4, pz + 0.4]) b.box(x - 0.05, SLAB_Y, zz - 0.05, 0.1, 1.6, 0.1, PLAY_RED);
  b.box(lx0 + 0.05, py, pz - 0.45, 1.1, 0.08, 0.9, PLAY_YELLOW);
  for (const x of [lx0 + 0.25, lx0 + 0.95]) bar(b, [x, SLAB_Y, lz1], [x, py, pz + 0.45], 0.03, PLAY_RED);
  for (let k = 1; k < 5; k++) {
    const t = k / 5;
    b.box(lx0 + 0.25, SLAB_Y + (py - SLAB_Y) * t, lz1 - (lz1 - pz - 0.45) * t - 0.02, 0.7, 0.04, 0.04, PLAY_RED);
  }
  const [c0, c1] = [lx0 + 0.25, lx0 + 0.95];
  poly(b, [[c0, py, pz - 0.45], [c1, py, pz - 0.45], [c1, SLAB_Y + 0.25, lz0 + 0.3], [c0, SLAB_Y + 0.25, lz0 + 0.3]], PLAY_YELLOW);
  for (const x of [c0, c1]) bar(b, [x, py + 0.2, pz - 0.45], [x, SLAB_Y + 0.45, lz0 + 0.3], 0.03, PLAY_RED);
  // The springers, the roundabout, a bench
  PLAYGROUND.springers.forEach(([x, z], k) => {
    b.add(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 6, 1, true).translate(x, SLAB_Y + 0.17, z), BLACK);
    b.add(new THREE.IcosahedronGeometry(0.28, 0).scale(1.3, 0.8, 0.6).translate(x, SLAB_Y + 0.5, z), k ? PLAY_RED : PLAY_YELLOW);
  });
  const [rx, rz] = PLAYGROUND.roundabout;
  b.add(new THREE.CylinderGeometry(0.9, 0.9, 0.1, low ? 10 : 16).translate(rx, SLAB_Y + 0.25, rz), PLAY_RED);
  b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6, 1, true).translate(rx, SLAB_Y + 0.7, rz), STEEL);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    bar(b, [rx, SLAB_Y + 1.1, rz], [rx + Math.cos(a) * 0.8, SLAB_Y + 0.3, rz + Math.sin(a) * 0.8], 0.02, STEEL);
  }
  bench(b, PLAYGROUND.benches[0], [0, -1]);
}

/* ---------- Street furniture ---------- */

function binStore(b: Batch, r: Rect, low: boolean) {
  const [x0, z0, x1, z1] = r;
  block(b, r, SLAB_Y, BIN_H - 0.12, ENG_BRICK);
  block(b, [x0 - 0.06, z0 - 0.06, x1 + 0.06, z1 + 0.06], BIN_H - 0.12, BIN_H, CONCRETE);
  // Its louvred doors on the long sides
  const alongX = x1 - x0 >= z1 - z0;
  for (const s of [-1, 1]) {
    const [cx, cz] = alongX ? [(x0 + x1) / 2, s < 0 ? z0 : z1] : [s < 0 ? x0 : x1, (z0 + z1) / 2];
    const w = (alongX ? x1 - x0 : z1 - z0) - 0.5;
    b.box(cx - (alongX ? w / 2 : 0.025), SLAB_Y + 0.05, cz - (alongX ? 0.025 : w / 2), alongX ? w : 0.05, BIN_H - 0.3, alongX ? 0.05 : w, STEEL);
    b.detail(() => {
      if (low) return;
      for (let y = SLAB_Y + 0.25; y < BIN_H - 0.3; y += 0.14) b.box(cx - (alongX ? w / 2 - 0.05 : 0.04), y, cz - (alongX ? 0.04 : w / 2 - 0.05), alongX ? w - 0.1 : 0.08, 0.04, alongX ? 0.08 : w - 0.1, STEEL_DARK);
    });
  }
}
function cctv(b: Batch, [x, z, a]: [number, number, number]) {
  pole(b, x, z, SLAB_Y, POLE.h, POLE.r, STEEL);
  const [dx, dz] = [Math.sin(a), Math.cos(a)];
  const top = SLAB_Y + POLE.h;
  bar(b, [x, top - 0.1, z], [x + dx * 0.45, top - 0.1, z + dz * 0.45], 0.03, STEEL);
  const g = new THREE.BoxGeometry(0.16, 0.16, 0.42).rotateX(0.35).rotateY(a).translate(x + dx * 0.5, top - 0.25, z + dz * 0.5);
  b.add(g, WHITE);
}
function board(b: Batch, { at: [x, z], n }: { at: Pt; n: Pt }) {
  const along = n[0] !== 0;
  for (const k of [-1, 1]) {
    const [px, pz] = [x + (along ? 0 : k * (BOARD.w / 2 - 0.1)), z + (along ? k * (BOARD.w / 2 - 0.1) : 0)];
    b.box(px - 0.05, SLAB_Y, pz - 0.05, 0.1, BOARD.foot + BOARD.h, 0.1, BLACK);
  }
  b.box(x - (along ? 0.03 : BOARD.w / 2), SLAB_Y + BOARD.foot, z - (along ? BOARD.w / 2 : 0.03), along ? 0.06 : BOARD.w, BOARD.h, along ? BOARD.w : 0.06, GREEN_RAIL);
  pane(b, 'board', x + n[0] * 0.036, SLAB_Y + BOARD.foot + BOARD.h / 2, z + n[1] * 0.036, n, BOARD.w - 0.06, BOARD.h - 0.06);
}
/** An intercom panel by each block's door, on the wall nearest it (near only) */
function intercoms(b: Batch) {
  for (const blk of BLOCKS) {
    if (blk.kind === 'garages' || blk.kind === 'parade') continue;
    const [dx, dz] = blk.door;
    let best: { d: number; p: Pt; n: Pt } | null = null;
    for (const s of blk.shells) {
      const [x0, z0, x1, z1] = s.rect;
      const cands: { d: number; p: Pt; n: Pt }[] = [
        { d: Math.abs(dz - z0), p: [Math.min(Math.max(dx, x0 + 0.5), x1 - 0.5), z0], n: [0, -1] },
        { d: Math.abs(dz - z1), p: [Math.min(Math.max(dx, x0 + 0.5), x1 - 0.5), z1], n: [0, 1] },
        { d: Math.abs(dx - x0), p: [x0, Math.min(Math.max(dz, z0 + 0.5), z1 - 0.5)], n: [-1, 0] },
        { d: Math.abs(dx - x1), p: [x1, Math.min(Math.max(dz, z0 + 0.5), z1 - 0.5)], n: [1, 0] },
      ];
      for (const c of cands) if (!best || c.d < best.d) best = c;
    }
    if (!best) continue;
    const { p, n } = best;
    const along: Pt = [-n[1], n[0]];
    const [x, z] = [p[0] + along[0] * 0.75 + n[0] * 0.02, p[1] + along[1] * 0.75 + n[1] * 0.02];
    b.box(x - (n[0] ? 0.02 : 0.11), SLAB_Y + 0.95, z - (n[0] ? 0.11 : 0.02), n[0] ? 0.04 : 0.22, 0.32, n[0] ? 0.22 : 0.04, STEEL);
  }
}

/* ---------- The road's paint ---------- */

const PAINT_Y = 0.047;
const ROAD_X0 = CIRCUS.x + CIRCUS.r + CIRCUS.half;
const ROAD_X1 = 64.5 - 3.7;
/** Where along the road nothing's painted but the zebras' zigzags */
const kept = (x: number) => JUNCTIONS.every((j) => Math.abs(x - j) > JUNCTION_GAP) && ZEBRAS.every((z) => Math.abs(x - z) > ZIGZAG);
/** Runs of the road clear of the junctions and zebras, from a to c */
function runs(a: number, c: number): [number, number][] {
  const out: [number, number][] = [];
  let s: number | null = null;
  for (let x = a; x <= c; x += 0.25) {
    if (kept(x)) s ??= x;
    else if (s !== null) {
      if (x - s > 0.5) out.push([s, x - 0.25]);
      s = null;
    }
  }
  if (s !== null && c - s > 0.5) out.push([s, c]);
  return out;
}
function roadPaint(b: Batch) {
  // The double yellow lines along both kerbs (the road and the Close)
  for (const [a, c] of [...runs(ROAD_X0, ROAD_X1), [CLOSE_END + 0.6, CIRCUS.x - CIRCUS.r - CIRCUS.half] as [number, number]])
    for (const [p, q] of pieces(a, c))
      for (const s of [-1, 1])
        for (const o of [0.14, 0.3]) {
          const z = ROAD_Z + s * (ROAD_HALF - o);
          strip(b, [p, z], [q, z], 0.07, PAINT_Y, YELLOW);
        }
  // The zebras: their stripes across, the give-way dashes either side, the zigzags along both kerbs
  for (const x of ZEBRAS) {
    for (const k of [-1.5, -0.5, 0.5, 1.5]) strip(b, [x - ZEBRA_W / 2, ROAD_Z + k * 0.9], [x + ZEBRA_W / 2, ROAD_Z + k * 0.9], 0.5, PAINT_Y + 0.002, WHITE);
    for (const s of [-1, 1]) {
      const gx = x + s * (ZEBRA_W / 2 + 0.6);
      for (let z = ROAD_Z - ROAD_HALF + 0.2; z < ROAD_Z + ROAD_HALF - 0.1; z += 0.6) strip(b, [gx, z], [gx, z + 0.3], 0.12, PAINT_Y, WHITE);
      for (const k of [-1, 1]) {
        const zk = ROAD_Z + k * (ROAD_HALF - 0.3);
        const [a, c] = s < 0 ? [x - ZIGZAG, x - ZEBRA_W / 2 - 1] : [x + ZEBRA_W / 2 + 1, x + ZIGZAG];
        const n = Math.round((c - a) / 0.6);
        for (let i = 0; i < n; i++) {
          const [u, v] = [a + ((c - a) * i) / n, a + ((c - a) * (i + 1)) / n];
          strip(b, [u, zk + (i % 2 ? 0.12 : -0.12)], [v, zk + (i % 2 ? -0.12 : 0.12)], 0.07, PAINT_Y, WHITE);
        }
      }
    }
  }
  // The humps: a low ramp across the road, white triangles on it either way
  for (const x of HUMPS) {
    b.box(x - 0.8, 0.03, ROAD_Z - ROAD_HALF + 0.05, 1.6, 0.04, ROAD_HALF * 2 - 0.1, HUMP);
    for (const [z, s] of [
      [ROAD_Z - ROAD_HALF / 2, 1],
      [ROAD_Z + ROAD_HALF / 2, -1],
    ] as const)
      poly(b, [[x - 0.5 * s, 0.075, z - 0.35], [x - 0.5 * s, 0.075, z + 0.35], [x + 0.55 * s, 0.075, z]], WHITE);
  }
}
/** The beacons' posts in their black and white bands, a dull globe (the lit one is the main thread's) */
function beaconPosts(b: Batch, low: boolean) {
  for (const [x, z] of BEACONS) {
    const n = 8;
    for (let k = 0; k < n; k++) pole(b, x, z, SLAB_Y + (k * (BEACON.h - 0.15)) / n, (BEACON.h - 0.15) / n, BEACON.r, k % 2 ? WHITE : BLACK);
    b.add(new THREE.SphereGeometry(BEACON.globe, low ? 6 : 10, low ? 4 : 8).translate(x, SLAB_Y + BEACON.h, z), GLOBE_DULL);
  }
}

/* ---------- Register ---------- */

export function registerStreet({ low, scene, tick }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  registerChurch(low);
  const one = (id: string, rect: Rect, draw: (b: Batch, fx: Batch) => void) =>
    site(`ends ${id}`, rect, (into) => {
      const b = new Batch();
      const fx = new Batch();
      draw(b, fx);
      b.build(into, { cast: true, receive: true });
      buildFx(fx, into);
    });
  one('parade', [PARADE.x0 - 1, PARADE.z - 4, PARADE.x1 + 1, PARADE.z], (b, fx) => parade(b, fx, low));
  CORNER_SHOPS.forEach((s, i) => one(`corner ${s.id}`, [s.rect[0] - 1, s.rect[1] - 1, s.rect[2] + 1, s.rect[3] + 1], (b) => cornerShop(b, s, i ? 'nightday' : 'lucky', low)));
  one('pub', [PUB.rect[0] - 1.5, PUB.rect[1] - 1.5, PUB.rect[2] + 1, PUB.rect[3] + 1], (b, fx) => pub(b, fx, low));
  one('centre', [CENTRE.rect[0] - 1, CENTRE.rect[1] - 1, CENTRE.rect[2] + 1, CENTRE.rect[3] + 1], (b, fx) => centre(b, fx, low));
  one('studio', [STUDIO.x0 - 1, STUDIO.sofa[1] - 1, STUDIO.x1 + 1, STUDIO.z + 0.5], (b) => studio(b, low));
  one('aerial', [AERIAL.x - 1, AERIAL.z - 1, AERIAL.x + 1, AERIAL.z + 1], (b) => aerial(b, low));
  one('green', GREEN.rect, (b) => green(b, low));
  one('pitch', PITCH.rect, (b, fx) => pitch(b, fx, low));
  one('playground', PLAYGROUND.rect, (b) => playground(b, low));
  one('furniture', [-106, 335, 60, 428], (b) => {
    for (const r of BIN_STORES) binStore(b, r, low);
    for (const c of CCTV) cctv(b, c);
    for (const bd of BOARDS) board(b, bd);
    beaconPosts(b, low);
    b.detail(() => intercoms(b));
  });
  one('road paint', [ROAD_X0, ROAD_Z - 4, ROAD_X1, ROAD_Z + 4], (b) => roadPaint(b));
  // The beacons' globes, flashing (on the main thread)
  if (!scene || !tick) return;
  const GLOBE = neon('#ff9a2a', 1.4, 2.4);
  const geo = new THREE.SphereGeometry(BEACON.globe + 0.012, low ? 6 : 10, low ? 4 : 8);
  const globes = new THREE.Group();
  globes.userData.keep = true;
  for (const [x, z] of BEACONS) {
    const m = new THREE.Mesh(geo, GLOBE);
    m.position.set(x, SLAB_Y + BEACON.h, z);
    globes.add(m);
  }
  scene.add(globes);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  tick(() => {
    globes.visible = reduced || Math.floor(Date.now() / 500) % 2 === 0;
  });
}
