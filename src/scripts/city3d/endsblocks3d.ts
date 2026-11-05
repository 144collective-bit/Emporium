/*
 * Endswood's blocks drawn (docs/estate-plan.md Phase 3; the data is endsblocks.ts), sites in the estate's chunk
 * (endswood3d.ts). Every face comes from one atlas of the estate's own (`ATLAS`, `ends-concrete`): board-marked
 * concrete, its shuttering's grain and precast joints, rain streaks down from every sill and parapet; bands of flats
 * (aluminium windows over faded orange, teal or mustard panels), the barrier's slit windows, the doors and kitchen
 * windows behind a gallery (each door its own colour), plain concrete, windows behind grey steel screens; and the
 * ground floors' garage doors, engineering brick and glazed entrances. Windows lit at night from its light map. The
 * galleries (slab, parapet, the cross walls they hang off), bridges, roofs inside their parapets, plant rooms and the
 * condemned block's hoardings are geometry in the shared paint. Near only: satellite dishes, plants and bikes on the
 * galleries, the terraces' planters. Phones leave out the finest.
 */
import * as THREE from 'three';
import { Batch, PAL, canvasTex, lit, rng, shadeHex, siteMat, toon } from './kit';
import { site } from './tilework';
import { BLOCKS, DECK, GROUND, HOARD, PARAPET, STOREY, deckRect, finTop, finsOf, hoardingRuns, type EstateBlock, type Face, type Ground, type Shell, type Side } from './endsblocks';
import type { Pt, Rect } from './endswood';

/* ---------- The atlas ---------- */

/** A bay's width and a storey's height in the world, and in the atlas; a band is ROWS storeys of COLS bays */
const BAY = 0.75;
const COLS = 8;
const ROWS = 4;
const PX_W = 48;
const PX_H = 64;
const W = COLS * PX_W;
const WALL_PX = ROWS * PX_H;
/** A ground floor's band: one row, as tall in the atlas as it is in the world */
const GROUND_PX = Math.round(PX_H * GROUND);
const TINTS = ['#c9703a', '#3e8a86', '#c9a23a'];
const DOORS = ['#b8322c', '#2d4f8a', '#2f6a3e', '#d9b43a', '#1d1c22', '#6a3d7a', '#e8e2d2', '#c86a2a'];
const CONCRETE = '#9b97a3';
type BandId = 'flats0' | 'flats1' | 'flats2' | 'slits' | 'deck' | 'blank' | 'void' | 'garage' | 'brick' | 'entry';
const WALL_BANDS: BandId[] = ['flats0', 'flats1', 'flats2', 'slits', 'deck', 'blank', 'void'];
const GROUND_BANDS: BandId[] = ['garage', 'brick', 'entry'];
const H = WALL_BANDS.length * WALL_PX + GROUND_BANDS.length * GROUND_PX;

interface Band {
  v0: number;
  vh: number;
  tw: number;
  th: number;
}

/** Board-marked concrete: the shuttering's grain, its joints, a few blemishes */
function concrete(c: CanvasRenderingContext2D, y0: number, h: number, r: () => number, base = CONCRETE) {
  c.fillStyle = base;
  c.fillRect(0, y0, W, h);
  for (let y = y0; y < y0 + h; y += 4) {
    c.fillStyle = `rgba(30,26,40,${0.03 + r() * 0.06})`;
    c.fillRect(0, y, W, 1);
  }
  c.fillStyle = 'rgba(30,26,40,0.1)';
  for (let x = 0; x < W; x += 96) c.fillRect(x, y0, 1, h);
  for (let k = 0; k < (h / 64) * 6; k++) {
    c.fillStyle = `rgba(${r() < 0.5 ? '60,55,70' : '200,196,206'},0.12)`;
    c.fillRect(r() * W, y0 + r() * h, 3 + r() * 10, 2 + r() * 5);
  }
}
/** Rain streaks: dark, down from (x, y), w wide, fading over len */
function streak(c: CanvasRenderingContext2D, x: number, y: number, w: number, len: number, a: number) {
  const g = c.createLinearGradient(0, y, 0, y + len);
  g.addColorStop(0, `rgba(35,32,45,${a})`);
  g.addColorStop(1, 'rgba(35,32,45,0)');
  c.fillStyle = g;
  c.fillRect(x, y, w, len);
}
/** A window: an aluminium frame, glass (or its light), a mullion and a transom; `screen` a grey steel screen over it */
function window_(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, on: string | null, glow: boolean, screen = false, curtain: string | null = null) {
  if (glow) {
    if (on && !screen) {
      c.fillStyle = on;
      c.fillRect(x, y, w, h);
    }
    return;
  }
  c.fillStyle = PAL.ink;
  c.fillRect(x - 3, y - 3, w + 6, h + 6);
  c.fillStyle = '#c4c8d2';
  c.fillRect(x - 2, y - 2, w + 4, h + 4);
  if (screen) {
    c.fillStyle = '#878a93';
    c.fillRect(x, y, w, h);
    c.fillStyle = '#5d6069';
    for (let py = y + 3; py < y + h - 1; py += 4) for (let px = x + 2 + ((py - y) % 8 ? 2 : 0); px < x + w - 1; px += 4) c.fillRect(px, py, 1.5, 1.5);
    c.fillStyle = '#6a6d76';
    for (const [bx, by] of [
      [x + 2, y + 2],
      [x + w - 4, y + 2],
      [x + 2, y + h - 4],
      [x + w - 4, y + h - 4],
    ])
      c.fillRect(bx, by, 2, 2);
    return;
  }
  if (on) c.fillStyle = shadeHex(on, -0.35);
  else {
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#46557f');
    g.addColorStop(0.55, '#1e2444');
    g.addColorStop(1, '#10132c');
    c.fillStyle = g;
  }
  c.fillRect(x, y, w, h);
  if (curtain) {
    c.fillStyle = curtain;
    c.fillRect(x, y, w * 0.3, h);
    c.fillRect(x + w * 0.7, y, w * 0.3, h);
  }
  c.fillStyle = '#c4c8d2';
  c.fillRect(x + w / 2 - 1, y, 2, h);
  c.fillRect(x, y + h * 0.3, w, 2);
}
const LIGHTS = [PAL.warm, PAL.warm, PAL.warm, '#bcd4ff'];

function wallBand(c: CanvasRenderingContext2D, id: BandId, y0: number, glow: boolean, seed: number) {
  const r = rng(seed);
  const lit_ = (p = 0.4) => (r() < p ? LIGHTS[Math.floor(r() * LIGHTS.length)] : null);
  if (glow) {
    c.fillStyle = '#000';
    c.fillRect(0, y0, W, WALL_PX);
  } else concrete(c, y0, WALL_PX, r);
  for (let row = 0; row < ROWS; row++) {
    const y = y0 + row * PX_H;
    // (precast joints at every floor and every second bay)
    if (!glow && id !== 'blank') {
      c.fillStyle = 'rgba(30,26,40,0.28)';
      c.fillRect(0, y, W, 2);
      for (let x = 0; x < W; x += PX_W * 2) c.fillRect(x, y, 2, PX_H);
    }
    if (id === 'blank') {
      if (!glow) {
        // (a floor's line in the shuttering, streaks down from the top)
        c.fillStyle = 'rgba(30,26,40,0.12)';
        c.fillRect(0, y + PX_H - 3, W, 3);
        for (let k = 0; k < 3; k++) streak(c, r() * W, y, 6 + r() * 14, 30 + r() * 40, 0.18);
      }
      continue;
    }
    for (let col = 0; col < COLS; col++) {
      const x = col * PX_W;
      if (id === 'slits') {
        // The barrier: a narrow window high in each bay, streaks under it
        const on = lit_(0.3);
        window_(c, x + 8, y + 16, 32, 9, on, glow);
        if (!glow) streak(c, x + 10, y + 28, 28, 34, 0.32);
        continue;
      }
      if (id === 'deck') {
        // Behind a gallery: a front door every second bay (its own colour, a letterbox, a light over it), a kitchen
        // window between; the floor's edge dark where the gallery's slab meets it
        if (col % 2 === 0) {
          const door = DOORS[Math.floor(r() * DOORS.length)];
          const over = lit_(0.55);
          if (glow) {
            if (over) {
              c.fillStyle = over;
              c.fillRect(x + 16, y + 10, 14, 5);
            }
            continue;
          }
          c.fillStyle = PAL.ink;
          c.fillRect(x + 9, y + 17, 28, PX_H - 17);
          c.fillStyle = door;
          c.fillRect(x + 11, y + 19, 24, PX_H - 19);
          c.fillStyle = shadeHex(door, -0.3);
          c.fillRect(x + 14, y + 23, 18, 12);
          c.fillStyle = '#c9c3a0';
          c.fillRect(x + 19, y + 42, 8, 2);
          c.fillRect(x + 31, y + 40, 2, 5);
          c.fillStyle = '#e8e2d2';
          c.fillRect(x + 16, y + 10, 14, 5);
        } else {
          window_(c, x + 6, y + 18, 34, 20, lit_(0.35), glow, false, r() < 0.5 ? '#d8d0c0' : null);
          if (!glow) streak(c, x + 8, y + 42, 30, 18, 0.2);
        }
        if (!glow) {
          c.fillStyle = 'rgba(20,18,28,0.35)';
          c.fillRect(x, y + PX_H - 4, PX_W, 4);
        }
        continue;
      }
      // Flats (or the condemned block's, screened): a window over a coloured panel, streaks down from the sill
      const screen = id === 'void';
      const tint = id === 'flats0' ? TINTS[0] : id === 'flats1' ? TINTS[1] : id === 'flats2' ? TINTS[2] : '#8a8478';
      window_(c, x + 8, y + 10, 32, 30, screen ? null : lit_(), glow, screen, !screen && r() < 0.35 ? (r() < 0.5 ? '#e6e0d0' : '#c9b48a') : null);
      if (glow) continue;
      const panel = screen ? shadeHex(tint, -0.25) : r() < 0.15 ? shadeHex(tint, -0.2) : tint;
      c.fillStyle = PAL.ink;
      c.fillRect(x + 5, y + 45, 38, 14);
      c.fillStyle = panel;
      c.fillRect(x + 6, y + 46, 36, 12);
      // (faded unevenly: paler to the top)
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.fillRect(x + 6, y + 46, 36, 4);
      streak(c, x + 10, y + 58, 26, 22, screen ? 0.4 : 0.26);
      if (screen && r() < 0.25) {
        c.fillStyle = '#c23a3a';
        c.font = 'bold 9px sans-serif';
        c.fillText('X', x + 20, y + 28);
      }
    }
  }
  // Streaks down from the top of the band (the parapet's drips), a few longer ones
  if (!glow) for (let k = 0; k < 8; k++) streak(c, r() * W, y0, 4 + r() * 10, 60 + r() * 120, 0.12);
}

function groundBand(c: CanvasRenderingContext2D, id: BandId, y0: number, glow: boolean, seed: number) {
  const r = rng(seed);
  const h = GROUND_PX;
  if (glow) {
    c.fillStyle = '#000';
    c.fillRect(0, y0, W, h);
  }
  if (id === 'garage') {
    if (!glow) concrete(c, y0, h, r, '#8f8b97');
    // Four garage doors to the band, between concrete piers: council blue and green, a rusty one, one scorched
    for (let k = 0; k < 4; k++) {
      const x = k * 96 + 10;
      if (glow) continue;
      const which = r();
      const door = which < 0.12 ? '#2a2422' : which < 0.3 ? '#8a5a3a' : which < 0.65 ? '#3d5a7a' : '#4a6a52';
      c.fillStyle = PAL.ink;
      c.fillRect(x - 2, y0 + 20, 80, h - 20);
      c.fillStyle = door;
      c.fillRect(x, y0 + 22, 76, h - 22);
      c.fillStyle = shadeHex(door, -0.3);
      for (let yy = y0 + 26; yy < y0 + h; yy += 5) c.fillRect(x, yy, 76, 1.5);
      if (which < 0.12) {
        // (scorched: soot up the pier over it)
        const g = c.createLinearGradient(0, y0 + 22, 0, y0);
        g.addColorStop(0, 'rgba(20,16,16,0.7)');
        g.addColorStop(1, 'rgba(20,16,16,0)');
        c.fillStyle = g;
        c.fillRect(x - 4, y0, 84, 24);
      }
      c.fillStyle = '#c9c3a0';
      c.fillRect(x + 34, y0 + h - 12, 8, 3);
    }
    return;
  }
  if (id === 'brick' || id === 'entry') {
    if (!glow) {
      // Engineering brick: dark, hard, its mortar fine
      c.fillStyle = '#4b3f46';
      c.fillRect(0, y0, W, h);
      c.fillStyle = '#3a3037';
      for (let yy = y0; yy < y0 + h; yy += 7) {
        c.fillRect(0, yy, W, 1);
        for (let x = (yy - y0) % 14 ? 0 : 9; x < W; x += 18) c.fillRect(x, yy, 1, 7);
      }
      c.fillStyle = '#8f8b97';
      c.fillRect(0, y0, W, 5);
    }
    if (id === 'brick') {
      // Small high windows, a steel door, a bin store's louvres
      for (let k = 0; k < 4; k++) window_(c, k * 96 + 30, y0 + 16, 36, 14, k % 2 ? lit_(r, 0.3) : null, glow);
      if (!glow) {
        c.fillStyle = '#5a5d66';
        c.fillRect(150, y0 + 40, 30, h - 40);
        c.fillStyle = '#3d4048';
        for (let yy = y0 + 46; yy < y0 + h - 4; yy += 6) c.fillRect(152, yy, 26, 2);
      }
      return;
    }
    // The entrance: glazed doors in a steel frame (wired glass), a canopy's shadow over them, lit inside at night
    const on = PAL.warm;
    if (glow) {
      c.fillStyle = on;
      c.fillRect(140, y0 + 26, 104, h - 26);
      return;
    }
    c.fillStyle = PAL.ink;
    c.fillRect(136, y0 + 22, 112, h - 22);
    c.fillStyle = '#3a3e48';
    c.fillRect(138, y0 + 24, 108, h - 24);
    c.fillStyle = shadeHex(on, -0.45);
    c.fillRect(142, y0 + 28, 46, h - 30);
    c.fillRect(196, y0 + 28, 46, h - 30);
    c.fillStyle = 'rgba(200,200,210,0.35)';
    for (let yy = y0 + 32; yy < y0 + h; yy += 6) {
      c.fillRect(142, yy, 46, 1);
      c.fillRect(196, yy, 46, 1);
    }
    c.fillStyle = 'rgba(15,12,20,0.5)';
    c.fillRect(130, y0 + 14, 124, 8);
  }
}
const lit_ = (r: () => number, p: number) => (r() < p ? LIGHTS[Math.floor(r() * LIGHTS.length)] : null);

const ATLAS = (() => {
  const draw = (glow: boolean) => (c: CanvasRenderingContext2D) => {
    WALL_BANDS.forEach((id, i) => wallBand(c, id, i * WALL_PX, glow, 300 + i));
    GROUND_BANDS.forEach((id, i) => groundBand(c, id, WALL_BANDS.length * WALL_PX + i * GROUND_PX, glow, 400 + i));
  };
  const map = canvasTex(W, H, draw(false));
  const emissiveMap = canvasTex(W / 2, H / 2, (c) => {
    c.scale(0.5, 0.5);
    draw(true)(c);
  });
  for (const t of [map, emissiveMap]) t.wrapS = THREE.RepeatWrapping;
  // (canvas textures are flipped: the canvas's top row is v = 1; ground bands keep a pixel off each edge)
  const band = (top: number, h: number, tw: number, th: number): Band => ({ v0: 1 - (top + h) / H, vh: h / H, tw, th });
  const bands = {} as Record<BandId, Band>;
  WALL_BANDS.forEach((id, i) => (bands[id] = band(i * WALL_PX, WALL_PX, BAY * COLS, STOREY * ROWS)));
  GROUND_BANDS.forEach((id, i) => (bands[id] = band(WALL_BANDS.length * WALL_PX + i * GROUND_PX + 1, GROUND_PX - 2, BAY * COLS, GROUND)));
  return { mat: siteMat('ends-concrete', lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff' }), 0.15, 1)), bands };
})();
const faceBand = (f: Face, tint: number): BandId => (f === 'flats' ? (`flats${tint}` as BandId) : f);

/* ---------- Paint ---------- */

const SLAB = toon('#a6a2ae');
const SOFFIT = toon('#5e5a68');
const COPING = toon('#b4b0bc');
const ROOF = toon('#3d3b46');
const PLANT = toon('#8c8896');
const LOUVRE = toon('#4c4a56');
const GLAZE = toon('#1e2444');
const HOARDS = ['#2f5a3e', '#3d4a6a', '#6a6a72'].map((c) => toon(c));
const DISH = toon('#d8d8de');
const LEAF = toon('#3d7a48');
const POT = toon('#9a5a3a');
const BIKE = toon('#2a2a33');

/* ---------- Drawing ---------- */

/** The longest a quad runs along (tileBatch files a triangle by its middle: nothing much longer than a tile) */
const SPAN = 10;
/** Cut a..c into pieces no longer than SPAN */
const pieces = (a: number, c: number) => {
  const n = Math.max(1, Math.ceil(Math.abs(c - a) / SPAN));
  return Array.from({ length: n }, (_, k): [number, number] => [a + ((c - a) * k) / n, a + ((c - a) * (k + 1)) / n]);
};
const NORMAL: Record<Side, Pt> = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };
/** A side's line from its left end to its right end as seen from outside */
function sideLine([x0, z0, x1, z1]: Rect, s: Side): [Pt, Pt] {
  return s === 'n' ? [[x1, z0], [x0, z0]] : s === 's' ? [[x0, z1], [x1, z1]] : s === 'w' ? [[x0, z0], [x0, z1]] : [[x1, z1], [x1, z0]];
}
/** A wall from a to c (left to right seen from outside), y0 to y1, facing n, its band laid on (stacked when taller) */
function wall(b: Batch, band: Band, a: Pt, c: Pt, y0: number, y1: number, n: Pt, uFrom: number) {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  for (const [s0, s1] of pieces(0, len)) {
    const p: Pt = [a[0] + ((c[0] - a[0]) * s0) / len, a[1] + ((c[1] - a[1]) * s0) / len];
    const q: Pt = [a[0] + ((c[0] - a[0]) * s1) / len, a[1] + ((c[1] - a[1]) * s1) / len];
    for (let ya = y0; ya < y1 - 0.01; ya += band.th) {
      const yb = Math.min(y1, ya + band.th);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([p[0], ya, p[1], q[0], ya, q[1], q[0], yb, q[1], p[0], yb, p[1]], 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute([n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1]], 3));
      const [u0, u1] = [(uFrom + s0) / band.tw, (uFrom + s1) / band.tw];
      const v1 = band.v0 + ((yb - ya) / band.th) * band.vh;
      g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, band.v0, u1, band.v0, u1, v1, u0, v1], 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      b.add(g, ATLAS.mat);
    }
  }
}
/** A flat rect at y, facing up, in pieces */
function flat(b: Batch, [x0, z0, x1, z1]: Rect, y: number, m: THREE.Material) {
  for (const [a, c] of pieces(x0, x1)) for (const [p, q] of pieces(z0, z1)) b.add(new THREE.PlaneGeometry(c - a, q - p).rotateX(-Math.PI / 2).translate((a + c) / 2, y, (p + q) / 2), m);
}
/** A box from rect, y0 to y1, in pieces along its long side */
function box(b: Batch, [x0, z0, x1, z1]: Rect, y0: number, y1: number, m: THREE.Material) {
  if (x1 - x0 >= z1 - z0) for (const [a, c] of pieces(x0, x1)) b.box(a, y0, z0, c - a, y1 - y0, z1 - z0, m);
  else for (const [a, c] of pieces(z0, z1)) b.box(x0, y0, a, x1 - x0, y1 - y0, c - a, m);
}

function drawShell(b: Batch, s: Shell, seed: number, low: boolean) {
  const r = rng(seed);
  for (const side of ['n', 's', 'e', 'w'] as Side[]) {
    const [a, c] = sideLine(s.rect, side);
    const n = NORMAL[side];
    const ground: Ground = s.ground[side] ?? 'brick';
    const top = s.y0 + GROUND;
    // (each face starts somewhere of its own along its band, so neighbours don't repeat in step)
    const uFrom = Math.floor(r() * 8) * BAY * 2;
    wall(b, ATLAS.bands[ground], a, c, s.y0, Math.min(top, s.y1), n, uFrom);
    if (s.y1 > top + 0.01) wall(b, ATLAS.bands[s.plain ? 'blank' : faceBand(s.faces[side], s.tint)], a, c, top, s.y1, n, uFrom);
  }
  // The roof inside its parapet, the parapet's coping round the rim
  const [x0, z0, x1, z1] = s.rect;
  flat(b, [x0 + 0.006, z0 + 0.006, x1 - 0.006, z1 - 0.006], s.y1 - 0.02, ROOF);
  const t = 0.18;
  box(b, [x0, z0, x1, z0 + t], s.y1, s.y1 + PARAPET, COPING);
  box(b, [x0, z1 - t, x1, z1], s.y1, s.y1 + PARAPET, COPING);
  box(b, [x0, z0 + t, x0 + t, z1 - t], s.y1, s.y1 + PARAPET, COPING);
  box(b, [x1 - t, z0 + t, x1, z1 - t], s.y1, s.y1 + PARAPET, COPING);
  if (s.plain) {
    // A lift house: louvres high on each face (plant rooms are the cores' tops)
    for (const side of ['n', 's', 'e', 'w'] as Side[]) {
      const [a, c] = sideLine(s.rect, side);
      const n = NORMAL[side];
      const mid: Pt = [(a[0] + c[0]) / 2 + n[0] * 0.01, (a[1] + c[1]) / 2 + n[1] * 0.01];
      const along = Math.abs(c[0] - a[0]) > Math.abs(c[1] - a[1]);
      b.box(mid[0] - (along ? 0.5 : 0.01), s.y1 - 0.9, mid[1] - (along ? 0.01 : 0.5), along ? 1 : 0.02, 0.5, along ? 0.02 : 1, LOUVRE);
    }
    return;
  }
  // Satellite dishes on the flats' faces, here and there (near only)
  b.detail(() => {
    if (low) return;
    for (const side of ['n', 's', 'e', 'w'] as Side[]) {
      if (s.faces[side] !== 'flats') continue;
      const [a, c] = sideLine(s.rect, side);
      const n = NORMAL[side];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const floors = Math.floor((s.y1 - s.y0 - GROUND) / STOREY);
      for (let k = 0; k < Math.floor(len / 3); k++) {
        if (r() > 0.45) continue;
        const f = Math.floor(r() * floors);
        const along = (Math.floor(r() * (len / BAY - 1)) + 0.5) * BAY;
        const p: Pt = [a[0] + ((c[0] - a[0]) * along) / len, a[1] + ((c[1] - a[1]) * along) / len];
        const y = s.y0 + GROUND + f * STOREY + 0.8;
        const g = new THREE.CylinderGeometry(0.2, 0.2, 0.04, low ? 6 : 10).rotateX(Math.PI / 2).rotateY(Math.atan2(n[0], n[1]) + 0.4);
        b.add(g.translate(p[0] + n[0] * 0.22, y, p[1] + n[1] * 0.22), DISH);
        b.box(p[0] + n[0] * 0.08 - 0.02, y - 0.02, p[1] + n[1] * 0.08 - 0.02, 0.04 + Math.abs(n[0]) * 0.1, 0.04, 0.04 + Math.abs(n[1]) * 0.1, DISH);
      }
    }
  });
}

/** A gallery off a face: its slab, its solid parapet, the cross walls it hangs off at its ends and every so often */
function drawDeck(b: Batch, block: EstateBlock, k: number, seed: number, low: boolean) {
  const d = block.decks[k];
  const s = block.shells[d.shell];
  const [x0, z0, x1, z1] = deckRect(block, d);
  const alongX = d.side === 'n' || d.side === 's';
  const n = NORMAL[d.side];
  const r = rng(seed);
  for (const y of d.ys) {
    box(b, [x0, z0, x1, z1], y - DECK.slab, y, SLAB);
    // (its underside darker: the soffit)
    flat(b, [x0, z0, x1, z1], y - DECK.slab - 0.004, SOFFIT);
    const t = 0.12;
    const edge: Rect = alongX ? (n[1] < 0 ? [x0, z0, x1, z0 + t] : [x0, z1 - t, x1, z1]) : n[0] < 0 ? [x0, z0, x0 + t, z1] : [x1 - t, z0, x1, z1];
    box(b, edge, y, y + DECK.parapet, SLAB);
    // Near only: pot plants, a bike chained to the parapet, by some doors
    b.detail(() => {
      if (low) return;
      const len = alongX ? x1 - x0 : z1 - z0;
      for (let u = 1; u < len - 1; u += 1.5) {
        const v = r();
        if (v > 0.3) continue;
        const along = alongX ? x0 + u : z0 + u;
        const out = 0.25 + r() * 0.2;
        const [px, pz] = alongX ? [along, n[1] < 0 ? z1 - out : z0 + out] : [n[0] < 0 ? x1 - out : x0 + out, along];
        if (v < 0.2) {
          b.box(px - 0.1, y, pz - 0.1, 0.2, 0.18, 0.2, POT);
          b.add(new THREE.IcosahedronGeometry(0.16, 0).translate(px, y + 0.3, pz), LEAF);
        } else {
          // (a bike against the parapet)
          const [bx, bz] = alongX ? [along, n[1] < 0 ? z0 + 0.25 : z1 - 0.25] : [n[0] < 0 ? x0 + 0.25 : x1 - 0.25, along];
          for (const o of [-0.3, 0.3]) b.add(new THREE.TorusGeometry(0.17, 0.025, 4, 10).rotateY(alongX ? 0 : Math.PI / 2).translate(bx + (alongX ? o : 0), y + 0.18, bz + (alongX ? 0 : o)), BIKE);
          b.box(bx - (alongX ? 0.3 : 0.02), y + 0.3, bz - (alongX ? 0.02 : 0.3), alongX ? 0.6 : 0.04, 0.04, alongX ? 0.04 : 0.6, BIKE);
        }
      }
    });
  }
  // The cross walls it hangs off (endsblocks.ts `finsOf()`), from the slab to the top gallery's parapet
  for (const f of finsOf(block, d)) box(b, f, s.y0, finTop(d), SLAB);
}

function drawBridge(b: Batch, br: { rect: Rect; y0: number; y1: number }) {
  const [x0, z0, x1, z1] = br.rect;
  const alongX = x1 - x0 >= z1 - z0;
  box(b, br.rect, br.y0, br.y1, SLAB);
  // A dark glazed strip along both sides, a coping on top
  const g = 0.012;
  const [y0, y1] = [br.y0 + 0.3, br.y1 - 0.15];
  if (alongX) for (const z of [z0 - g, z1 + g - 0.004]) box(b, [x0 + 0.1, z, x1 - 0.1, z + 0.004], y0, y1, GLAZE);
  else for (const x of [x0 - g, x1 + g - 0.004]) box(b, [x, z0 + 0.1, x + 0.004, z1 - 0.1], y0, y1, GLAZE);
  box(b, [x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05], br.y1, br.y1 + 0.08, COPING);
}

function drawHoarding(b: Batch, r: Rect, seed: number) {
  const rr = rng(seed);
  for (const run of hoardingRuns(r)) {
    const [x0, z0, x1, z1] = run;
    const alongX = x1 - x0 > z1 - z0;
    const [a, c] = alongX ? [x0, x1] : [z0, z1];
    for (let u = a; u < c - 0.01; u += 2.4) {
      const v = Math.min(c, u + 2.4);
      const m = HOARDS[Math.floor(rr() * HOARDS.length)];
      if (alongX) b.box(u + 0.01, 0.15, z0, v - u - 0.02, HOARD.h - 0.15, z1 - z0, m);
      else b.box(x0, 0.15, u + 0.01, x1 - x0, HOARD.h - 0.15, v - u - 0.02, m);
    }
  }
}

/** The terraces' planters along each step's front edge (near only) */
function drawPlanters(b: Batch, block: EstateBlock, low: boolean) {
  b.detail(() => {
    if (low) return;
    block.shells.slice(1).forEach((s) => {
      const [x0, , x1] = s.rect;
      const z = s.rect[3] - 0.5;
      for (let x = x0 + 1; x < x1 - 1; x += 3) {
        b.box(x, s.y1, z - 0.2, 1.8, 0.35, 0.4, PLANT);
        b.add(new THREE.IcosahedronGeometry(0.28, 0).scale(2.2, 0.8, 0.9).translate(x + 0.9, s.y1 + 0.5, z), LEAF);
      }
    });
  });
}

export function registerBlocks(low: boolean) {
  BLOCKS.forEach((block, bi) => {
    block.shells.forEach((s, si) =>
      site(`ends block ${block.id} ${si}`, [s.rect[0] - 2, s.rect[1] - 2, s.rect[2] + 2, s.rect[3] + 2], (into) => {
        const b = new Batch();
        drawShell(b, s, 1000 + bi * 17 + si, low);
        if (si === 0) {
          block.decks.forEach((_, k) => drawDeck(b, block, k, 2000 + bi * 7 + k, low));
          block.bridges.forEach((br) => drawBridge(b, br));
          if (block.hoarding) drawHoarding(b, block.hoarding, 3000 + bi);
          if (block.kind === 'terrace') drawPlanters(b, block, low);
        }
        b.build(into, { cast: true, receive: true });
      })
    );
  });
}
