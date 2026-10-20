/*
 * Downtown round the landmarks (downtown.ts): tight rows of infill buildings
 * with shopfronts, walk-only alleys with bollards at their mouths, the
 * courtyard lanes, three pocket parks and the hangout square (stage, big
 * screen, fountain, kiosks, benches, string lights and a crowd), lamps along
 * the cross streets, and the GM water tower up on a rooftop.
 *
 * The infill comes in six types (downtown.ts `InfillType`): brownstone
 * walk-ups with stoops and bay windows, shops with fascia and blade signs,
 * awnings and fire escapes (Crypto Coffee, Dave's Validator and the Golden
 * Crumpet among them), diners, lofts with sawtooth roofs, offices with glass
 * towers and lit crowns, and hotels with balconies. Rooftops carry water
 * tanks, gardens, huts, masts, dishes and billboards; the street fronts
 * café tables, chalk boards, planters and bikes.
 *
 * Written merge-ready: every wall and ground floor comes from one atlas
 * (UVs in world units, so windows keep their size on any wall), every sign
 * from one sign atlas, every plain colour folds into the shared paint
 * material, neon into the shared neon, and all the string lights are one
 * set of points.
 * Footprints are DOWNTOWN_SOLIDS in solids.ts.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, fx, glowTex, lit, neon, rng, shadeHex, toon } from './kit';
import { ALLEYS, ALLEY_LAMPS, ALLEY_PIPES, ALLEY_PROPS, DIAGONALS, FLOOR, INFILL, LANES, NAMED_SHOPS, PARKS, SHOP_H, SIGNS, SQUARE, WATER_TOWER, bodyOf, stoopOf, type Infill, type Pt, type SignId } from './downtown';
import { CORE_ROADS, DOWNTOWN, LANE } from './layout';
import { SLAB as S, addLamp, addPool, addTree, waterMat, type Tick } from './world';
import type { Idle } from './landmarks';

/* ---------- The wall atlas ---------- */

/**
 * Every infill wall and ground floor is drawn from one atlas, so they all
 * share one material. Wall bands are window grids, COLS bays (CELL_W wide)
 * by ROWS floors; a wall taller than a band is stacked from several quads,
 * so a band never wraps into the next. Ground bands are SHOP_W wide and a
 * ground floor tall. Each band repeats across (u, in world units). The glow
 * map is drawn at half size (it only needs to say which windows are lit).
 */
const CELL_W = 0.75;
const COLS = 8;
const ROWS = 4;
const PX_W = 48;
const PX_H = 64;
const ATLAS_W = COLS * PX_W;
const WALL_PX = ROWS * PX_H;
const SHOP_W = 3.2;
const GROUND_PX = 100;

type WallKind = 'brick' | 'brownstone' | 'stuccoTeal' | 'stuccoPink' | 'stuccoViolet' | 'industrial' | 'glassBlue' | 'glassTeal' | 'hotel';
type GroundKind = 'shopWarm' | 'shopPink' | 'shopCyan' | 'diner' | 'lobby' | 'stoneBase' | 'loading';
const WALL_KINDS: WallKind[] = ['brick', 'brownstone', 'stuccoTeal', 'stuccoPink', 'stuccoViolet', 'industrial', 'glassBlue', 'glassTeal', 'hotel'];
const GROUND_KINDS: GroundKind[] = ['shopWarm', 'shopPink', 'shopCyan', 'diner', 'lobby', 'stoneBase', 'loading'];
/** Each wall's own colour (for its trim and parapet) and the colour of its stone trim */
const WALL_COLOR: Record<WallKind, { wall: string; trim: string }> = {
  brick: { wall: '#7a3b38', trim: '#c9b8a8' },
  brownstone: { wall: '#6b4636', trim: '#d4bf9c' },
  stuccoTeal: { wall: '#2f6b6b', trim: '#d6d0e8' },
  stuccoPink: { wall: '#8c4466', trim: '#d6d0e8' },
  stuccoViolet: { wall: '#4f3d8a', trim: '#d6d0e8' },
  industrial: { wall: '#4a2f35', trim: '#2a2b38' },
  glassBlue: { wall: '#1d3a6b', trim: '#b9c4dc' },
  glassTeal: { wall: '#1d5a5f', trim: '#b9c4dc' },
  hotel: { wall: '#8a5a4a', trim: '#d6c3a5' },
};
const GLOWS = [PAL.warm, PAL.warm, PAL.cyan, PAL.pink];

interface Band {
  v0: number;
  vh: number;
  /** World size of one repeat */
  tw: number;
  th: number;
}

/** A window: dark outline, a frame, glass (or its light) and a cross bar. `glow` draws only the light. */
function pane(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: string, on: string | null, glow: boolean, bars = 1) {
  if (glow) {
    if (on) {
      c.fillStyle = on;
      c.fillRect(x, y, w, h);
    }
    return;
  }
  c.fillStyle = PAL.ink;
  c.fillRect(x - 4, y - 4, w + 8, h + 8);
  c.fillStyle = frame;
  c.fillRect(x - 2, y - 2, w + 4, h + 4);
  if (on) c.fillStyle = shadeHex(on, -0.35);
  else {
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#3e4f8f');
    g.addColorStop(0.5, '#1c2246');
    g.addColorStop(1, '#0d1030');
    c.fillStyle = g;
  }
  c.fillRect(x, y, w, h);
  c.fillStyle = frame;
  for (let k = 1; k <= bars; k++) c.fillRect(x + (w * k) / (bars + 1) - 1, y, 2, h);
  c.fillRect(x, y + h * 0.42, w, 2);
}

/** One wall band: ROWS floors of COLS bays, `glow` for the light map */
function wallBand(c: CanvasRenderingContext2D, kind: WallKind, y0: number, glow: boolean, seed: number) {
  const r = rng(seed);
  const { wall, trim } = WALL_COLOR[kind];
  const lit = () => (r() < 0.4 ? GLOWS[Math.floor(r() * GLOWS.length)] : null);
  if (!glow) {
    c.fillStyle = wall;
    c.fillRect(0, y0, ATLAS_W, WALL_PX);
  } else {
    c.fillStyle = '#000';
    c.fillRect(0, y0, ATLAS_W, WALL_PX);
  }
  const dark = shadeHex(wall, -0.25);
  for (let row = 0; row < ROWS; row++) {
    const y = y0 + row * PX_H;
    // The wall's surface
    if (!glow && (kind === 'brick' || kind === 'industrial')) {
      c.fillStyle = dark;
      for (let k = 0; k < PX_H; k += 8) {
        c.fillRect(0, y + k, ATLAS_W, 1.5);
        for (let x = (k / 8) % 2 ? 0 : 8; x < ATLAS_W; x += 16) c.fillRect(x, y + k, 1.5, 8);
      }
    }
    if (!glow && kind === 'brownstone') {
      c.fillStyle = dark;
      for (let k = 0; k < PX_H; k += 16) c.fillRect(0, y + k, ATLAS_W, 1);
    }
    if (kind === 'glassBlue' || kind === 'glassTeal') {
      // A curtain wall: glass from slab to slab, a dark band at each floor, mullions every half bay
      for (let x = 0; x < ATLAS_W; x += 24) {
        const on = lit();
        if (glow) {
          if (on) {
            c.fillStyle = on;
            c.fillRect(x + 2, y + 10, 20, PX_H - 12);
          }
          continue;
        }
        const g = c.createLinearGradient(x, y, x + 24, y + PX_H);
        g.addColorStop(0, shadeHex(wall, 0.35));
        g.addColorStop(0.6, wall);
        g.addColorStop(1, shadeHex(wall, -0.4));
        c.fillStyle = on ? shadeHex(on, -0.45) : g;
        c.fillRect(x, y + 8, 24, PX_H - 8);
        c.fillStyle = PAL.ink;
        c.fillRect(x, y + 8, 2, PX_H - 8);
      }
      if (!glow) {
        c.fillStyle = '#141a33';
        c.fillRect(0, y, ATLAS_W, 8);
        c.fillStyle = trim;
        c.fillRect(0, y + 7, ATLAS_W, 2);
      }
      continue;
    }
    for (let col = 0; col < COLS; col++) {
      const x = col * PX_W;
      if (kind === 'industrial') {
        // Big steel windows, one for every two bays
        if (col % 2) continue;
        const on = lit();
        pane(c, x + 10, y + 10, PX_W * 2 - 20, 42, '#2a2b38', on, glow, 3);
        if (!glow) {
          c.fillStyle = '#2a2b38';
          c.fillRect(x + 10, y + 24, PX_W * 2 - 20, 2);
          c.fillRect(x + 10, y + 38, PX_W * 2 - 20, 2);
          c.fillStyle = shadeHex(wall, 0.2);
          c.fillRect(x + 6, y + 54, PX_W * 2 - 12, 4);
        }
        continue;
      }
      const on = lit();
      if (kind === 'hotel' && col % 2 === 0) {
        // A balcony door (the balconies are geometry)
        pane(c, x + 12, y + 8, 24, PX_H - 8, trim, on, glow);
        continue;
      }
      const [wx, wy, ww, wh] = kind === 'brownstone' ? [x + 12, y + 10, 24, 42] : [x + 11, y + 13, 26, 36];
      if (!glow && (kind === 'stuccoTeal' || kind === 'stuccoPink' || kind === 'stuccoViolet')) {
        // Shutters either side
        c.fillStyle = shadeHex(wall, -0.4);
        c.fillRect(wx - 9, wy - 1, 6, wh + 2);
        c.fillRect(wx + ww + 3, wy - 1, 6, wh + 2);
      }
      pane(c, wx, wy, ww, wh, kind === 'brick' || kind === 'brownstone' ? '#e8e2f0' : trim, on, glow);
      if (!glow) {
        // Lintel and sill
        c.fillStyle = trim;
        if (kind === 'brownstone') {
          c.beginPath();
          c.ellipse(wx + ww / 2, wy - 3, ww / 2 + 4, 6, 0, Math.PI, 0);
          c.fill();
        } else c.fillRect(wx - 4, wy - 7, ww + 8, 4);
        c.fillRect(wx - 5, wy + wh + 4, ww + 10, 4);
      }
    }
  }
}

/** A shopfront, 256 x 100 drawn into the band (a window, then a door and a window, under a header) */
function shopFront(c: CanvasRenderingContext2D, frame: string, glow: string, lit: boolean) {
  const glass = [
    [10, 16, 108, 62],
    [190, 16, 56, 62],
  ];
  const door = [140, 22, 40, 78];
  c.fillStyle = lit ? '#000' : frame;
  c.fillRect(0, 0, 256, 100);
  if (!lit) {
    c.fillStyle = shadeHex(frame, -0.35);
    c.fillRect(0, 0, 256, 10);
    c.fillRect(0, 84, 256, 16);
  }
  for (const [x, gy, w, h] of [...glass, door]) {
    if (lit) {
      c.fillStyle = glow;
      c.fillRect(x, gy, w, h);
      continue;
    }
    c.fillStyle = PAL.ink;
    c.fillRect(x - 3, gy - 3, w + 6, h + 6);
    const g = c.createLinearGradient(x, gy, x, gy + h);
    g.addColorStop(0, shadeHex(glow, -0.25));
    g.addColorStop(1, shadeHex(glow, -0.65));
    c.fillStyle = g;
    c.fillRect(x, gy, w, h);
  }
  c.fillStyle = lit ? '#000' : PAL.ink;
  c.fillRect(door[0] + door[2] / 2 - 1.5, door[1], 3, door[3]);
  if (!lit) {
    // Goods in the window: shelves and shapes
    c.fillStyle = shadeHex(glow, -0.5);
    c.fillRect(14, 56, 100, 4);
    for (let k = 0; k < 6; k++) c.fillRect(18 + k * 16, 44 - (k % 3) * 6, 10, 12 + (k % 3) * 6);
    c.fillStyle = '#f3f2f7';
    c.fillRect(door[0] + door[2] / 2 + 5, door[1] + 36, 3, 10);
  }
}

/** One ground band, 256 x 100 (scaled to the atlas width) */
function groundBand(c: CanvasRenderingContext2D, kind: GroundKind, lit: boolean) {
  if (kind === 'shopWarm') return shopFront(c, '#2b2550', PAL.warm, lit);
  if (kind === 'shopPink') return shopFront(c, '#3a1f45', PAL.pink, lit);
  if (kind === 'shopCyan') return shopFront(c, '#1c3448', PAL.cyan, lit);
  c.fillStyle = '#000';
  c.fillRect(0, 0, 256, 100);
  if (kind === 'diner') {
    // Chrome below, a red stripe, one long window with thin mullions
    if (!lit) {
      const g = c.createLinearGradient(0, 64, 0, 100);
      g.addColorStop(0, '#e9e6f5');
      g.addColorStop(0.5, '#8f8ab0');
      g.addColorStop(1, '#d6d2ea');
      c.fillStyle = g;
      c.fillRect(0, 64, 256, 36);
      c.fillStyle = '#e23b3b';
      c.fillRect(0, 72, 256, 6);
      c.fillStyle = '#d6d2ea';
      c.fillRect(0, 0, 256, 14);
    }
    c.fillStyle = lit ? PAL.warm : '#5a4a3a';
    c.fillRect(0, 16, 256, 46);
    if (!lit) {
      c.fillStyle = shadeHex(PAL.warm, -0.3);
      c.fillRect(0, 16, 256, 46);
      c.fillStyle = PAL.ink;
      for (let x = 0; x < 256; x += 42) c.fillRect(x, 16, 3, 46);
      c.fillRect(0, 14, 256, 3);
      c.fillRect(0, 61, 256, 3);
    }
    return;
  }
  if (kind === 'lobby') {
    if (!lit) {
      c.fillStyle = '#1b1830';
      c.fillRect(0, 0, 256, 100);
    }
    for (let x = 6; x < 256; x += 64) {
      c.fillStyle = lit ? '#9dbbe0' : '#6f8fc4';
      c.fillRect(x, 10, 52, 86);
      if (!lit) {
        c.fillStyle = '#3e5a8f';
        c.fillRect(x, 10, 52, 40);
        c.fillStyle = '#1b1830';
        c.fillRect(x + 25, 10, 3, 86);
        c.fillStyle = '#d6d2ea';
        c.fillRect(x + 20, 54, 2, 12);
        c.fillRect(x + 31, 54, 2, 12);
      }
    }
    return;
  }
  if (kind === 'stoneBase') {
    if (!lit) {
      c.fillStyle = '#5a4552';
      c.fillRect(0, 0, 256, 100);
      c.fillStyle = '#3e2f3a';
      for (let y = 12; y < 100; y += 14) c.fillRect(0, y, 256, 2);
    }
    for (const x of [28, 156]) pane(c, x, 30, 54, 40, '#d4bf9c', lit ? PAL.warm : x === 28 ? PAL.warm : null, lit);
    return;
  }
  // Loading: a brick base, a roll-up shutter and a small window
  if (!lit) {
    c.fillStyle = '#4a2f35';
    c.fillRect(0, 0, 256, 100);
    c.fillStyle = '#3a2329';
    for (let y = 0; y < 100; y += 8) c.fillRect(0, y, 256, 1.5);
    c.fillStyle = '#2a2b38';
    c.fillRect(20, 12, 132, 88);
    c.fillStyle = '#8f8ab0';
    c.fillRect(26, 18, 120, 82);
    c.fillStyle = '#6e6a8c';
    for (let y = 20; y < 100; y += 6) c.fillRect(26, y, 120, 2);
    c.fillStyle = '#ffd23f';
    c.fillRect(26, 92, 120, 4);
  } else {
    c.fillStyle = PAL.warm;
    c.fillRect(26, 96, 120, 4);
  }
  pane(c, 180, 26, 56, 40, '#2a2b38', PAL.warm, lit, 2);
}

const ATLAS = (() => {
  const H = WALL_KINDS.length * WALL_PX + GROUND_KINDS.length * GROUND_PX;
  const draw = (glow: boolean) => (c: CanvasRenderingContext2D) => {
    WALL_KINDS.forEach((k, i) => wallBand(c, k, i * WALL_PX, glow, 60 + i));
    GROUND_KINDS.forEach((k, i) => {
      c.save();
      c.translate(0, WALL_KINDS.length * WALL_PX + i * GROUND_PX);
      c.scale(ATLAS_W / 256, GROUND_PX / 100);
      groundBand(c, k, glow);
      c.restore();
    });
  };
  const map = canvasTex(ATLAS_W, H, draw(false));
  const emissiveMap = canvasTex(ATLAS_W / 2, H / 2, (c) => {
    c.scale(0.5, 0.5);
    draw(true)(c);
  });
  for (const t of [map, emissiveMap]) t.wrapS = THREE.RepeatWrapping;
  // Canvas textures are flipped: the canvas's top row is v = 1. Ground bands keep a pixel off each edge.
  const band = (top: number, h: number, tw: number, th: number): Band => ({ v0: 1 - (top + h) / H, vh: h / H, tw, th });
  return {
    mat: lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff' }), 0.15, 1.15),
    wall: Object.fromEntries(WALL_KINDS.map((k, i) => [k, band(i * WALL_PX, WALL_PX, CELL_W * COLS, FLOOR * ROWS)])) as Record<WallKind, Band>,
    ground: Object.fromEntries(GROUND_KINDS.map((k, i) => [k, band(WALL_KINDS.length * WALL_PX + i * GROUND_PX + 1, GROUND_PX - 2, SHOP_W, SHOP_H)])) as Record<GroundKind, Band>,
  };
})();

/* ---------- The sign atlas: every shop sign, blade and billboard in one texture ---------- */

const SIGN_IDS = Object.keys(SIGNS) as SignId[];
const SIGN_W = 1024;
const CELL = { w: 512, h: 128 };
const BLADE = { w: 72, h: 256 };
const SIGN_H = Math.ceil(SIGN_IDS.length / 2) * CELL.h + BLADE.h;

/** Neon icons for your three shops: a coffee cup, a chip, a crumpet */
function icon(c: CanvasRenderingContext2D, kind: string, x: number, y: number, s: number, color: string) {
  c.save();
  c.translate(x, y);
  c.scale(s / 100, s / 100);
  c.lineWidth = 7;
  c.strokeStyle = color;
  c.fillStyle = color;
  if (kind === 'cup') {
    c.beginPath();
    c.moveTo(18, 40);
    c.lineTo(72, 40);
    c.lineTo(66, 88);
    c.lineTo(24, 88);
    c.closePath();
    c.stroke();
    c.beginPath();
    c.arc(76, 58, 12, -Math.PI / 2, Math.PI / 2);
    c.stroke();
    c.fillRect(12, 92, 66, 6);
    for (const sx of [32, 46, 60]) {
      c.beginPath();
      c.moveTo(sx, 32);
      c.bezierCurveTo(sx - 8, 22, sx + 8, 16, sx, 6);
      c.stroke();
    }
  } else if (kind === 'chip') {
    c.strokeRect(24, 24, 52, 52);
    c.fillRect(38, 38, 24, 24);
    for (let k = 0; k < 4; k++) {
      const p = 32 + k * 12;
      c.fillRect(p - 2, 8, 4, 14);
      c.fillRect(p - 2, 78, 4, 14);
      c.fillRect(8, p - 2, 14, 4);
      c.fillRect(78, p - 2, 14, 4);
    }
  } else {
    // A golden crumpet: a round cake, its holey top
    c.beginPath();
    c.ellipse(50, 62, 42, 22, 0, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.ellipse(50, 52, 42, 22, 0, 0, Math.PI * 2);
    c.stroke();
    for (const [hx, hy] of [
      [36, 48],
      [52, 44],
      [66, 52],
      [44, 58],
      [58, 60],
    ]) {
      c.beginPath();
      c.arc(hx, hy, 3.5, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}

const SIGN_ATLAS = (() => {
  const tex = canvasTex(SIGN_W, SIGN_H, (c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, SIGN_W, SIGN_H);
    SIGN_IDS.forEach((id, i) => {
      const sg = SIGNS[id] as { name: string; blade: string; color: string; icon?: string };
      const x = (i % 2) * CELL.w;
      const y = Math.floor(i / 2) * CELL.h;
      // A dark board with a neon border, the name in neon, an icon for your shops
      c.fillStyle = '#0d0b1c';
      c.fillRect(x + 4, y + 4, CELL.w - 8, CELL.h - 8);
      c.strokeStyle = sg.color;
      c.lineWidth = 5;
      c.strokeRect(x + 10, y + 10, CELL.w - 20, CELL.h - 20);
      const left = sg.icon ? 110 : 30;
      if (sg.icon) icon(c, sg.icon, x + 22, y + 18, 88, sg.color);
      const room = CELL.w - left - 30;
      c.font = `900 80px ${FONT_DISPLAY}`;
      const size = Math.min(80, (80 * room) / c.measureText(sg.name).width);
      c.font = `900 ${size}px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.shadowColor = sg.color;
      c.shadowBlur = 16;
      c.fillStyle = sg.color;
      c.fillText(sg.name, x + left + room / 2, y + CELL.h / 2 + 3);
      c.shadowBlur = 0;
      c.fillStyle = shadeHex(sg.color, 0.55);
      c.fillText(sg.name, x + left + room / 2, y + CELL.h / 2 + 3);
      // Its blade sign: the short word, letters stacked
      const bx = i * BLADE.w;
      const by = SIGN_H - BLADE.h;
      c.fillStyle = '#0d0b1c';
      c.fillRect(bx + 3, by + 3, BLADE.w - 6, BLADE.h - 6);
      c.strokeStyle = sg.color;
      c.lineWidth = 4;
      c.strokeRect(bx + 8, by + 8, BLADE.w - 16, BLADE.h - 16);
      const letters = [...sg.blade];
      const lh = Math.min(52, 220 / letters.length);
      c.font = `900 ${lh}px ${FONT_DISPLAY}`;
      letters.forEach((ch, k) => {
        const ly = by + BLADE.h / 2 + (k - (letters.length - 1) / 2) * lh;
        c.shadowColor = sg.color;
        c.shadowBlur = 12;
        c.fillStyle = sg.color;
        c.fillText(ch, bx + BLADE.w / 2, ly + 2);
        c.shadowBlur = 0;
        c.fillStyle = shadeHex(sg.color, 0.55);
        c.fillText(ch, bx + BLADE.w / 2, ly + 2);
      });
    });
  });
  const mat = lit(new THREE.MeshBasicMaterial({ map: tex }), 0.95, 1.3);
  const uv = (x: number, y: number, w: number, h: number) => [x / SIGN_W, 1 - (y + h) / SIGN_H, (x + w) / SIGN_W, 1 - y / SIGN_H];
  return {
    mat,
    /** u0, v0, u1, v1 of a sign's board, and of its blade */
    board: (id: SignId) => {
      const i = SIGN_IDS.indexOf(id);
      return uv((i % 2) * CELL.w + 4, Math.floor(i / 2) * CELL.h + 4, CELL.w - 8, CELL.h - 8);
    },
    blade: (id: SignId) => uv(SIGN_IDS.indexOf(id) * BLADE.w + 3, SIGN_H - BLADE.h + 3, BLADE.w - 6, BLADE.h - 6),
  };
})();

const AWNINGS = ['#e23b3b', '#ffd23f', '#00c2ff', '#e219e5', '#1fbf6b', '#ff8a3d', '#8000ff'];
const NEONS = [PAL.cyan, PAL.pink, PAL.warm, PAL.magenta, '#2bff88'];
/** Every neon downtown glows the same (one shared material, its colour per vertex) */
const glow = (color: string) => neon(color, 0.6, 2.4);
/** Lit panels bigger than a neon tube (hatches, counters) glow softer, so they don't flare */
const soft = (color: string) => neon(color, 0.5, 1.3);
const INK = toon('#1b1830');
const STONE = toon('#8f8ab0');
const METAL = toon('#2a2b38');
const ROOF = toon('#2a2547');
const WOOD = toon('#8a5a3c');
const GREEN = toon('#2a8a55');
const LEAF = toon('#36b06c');
const CREAM = toon('#e8e2f0');

const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, mat);
const cyl = (b: Batch, r: number, h: number, x: number, y: number, z: number, mat: THREE.Material, seg = 10, r0 = r) =>
  b.add(new THREE.CylinderGeometry(r, r0, h, seg).translate(x, y + h / 2, z), mat);

/** A bench, the sitter facing `ry` (0 is +z), seat top at S + 0.3 */
function bench(b: Batch, at: Pt, ry: number) {
  const g = (w: number, h: number, d: number, x: number, y: number, z: number) =>
    new THREE.BoxGeometry(w, h, d)
      .translate(x, y + h / 2, z)
      .rotateY(ry)
      .translate(at[0], S, at[1]);
  b.add(g(0.9, 0.06, 0.3, 0, 0.24, 0), WOOD);
  b.add(g(0.9, 0.3, 0.05, 0, 0.32, -0.15), WOOD);
  for (const sx of [-0.36, 0.36]) b.add(g(0.05, 0.26, 0.28, sx, 0, 0), INK);
}
const SEAT = S + 0.3;

/* ---------- A building's own frame: u along its front (left to right, seen from the street), y up, v out of the front wall ---------- */

interface Frame {
  M: THREE.Matrix4;
  /** Front width and depth of the building itself */
  w: number;
  d: number;
  L: Pt;
  t: Pt;
  n: Pt;
}
function frameOf(f: Infill): Frame {
  const [x0, z0, x1, z1] = bodyOf(f);
  const n: Pt = f.face === 'n' ? [0, -1] : f.face === 's' ? [0, 1] : f.face === 'w' ? [-1, 0] : [1, 0];
  const t: Pt = [n[1], -n[0]];
  const alongX = f.face === 'n' || f.face === 's';
  const w = alongX ? x1 - x0 : z1 - z0;
  const d = alongX ? z1 - z0 : x1 - x0;
  const c: Pt = f.face === 'n' ? [(x0 + x1) / 2, z0] : f.face === 's' ? [(x0 + x1) / 2, z1] : f.face === 'w' ? [x0, (z0 + z1) / 2] : [x1, (z0 + z1) / 2];
  const L: Pt = [c[0] - (t[0] * w) / 2, c[1] - (t[1] * w) / 2];
  const M = new THREE.Matrix4().makeBasis(new THREE.Vector3(t[0], 0, t[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(n[0], 0, n[1])).setPosition(L[0], 0, L[1]);
  return { M, w, d, L, t, n };
}
const toWorld = (F: Frame, u: number, v: number): Pt => [F.L[0] + F.t[0] * u + F.n[0] * v, F.L[1] + F.t[1] * u + F.n[1] * v];
const toLocal = (F: Frame, p: Pt): Pt => {
  const dx = p[0] - F.L[0];
  const dz = p[1] - F.L[1];
  return [dx * F.t[0] + dz * F.t[1], dx * F.n[0] + dz * F.n[1]];
};

/** A unit box without its underside (never seen on a building's details): ten triangles, not twelve */
const OPEN_BOX = (() => {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const idx = Array.from(g.index!.array);
  // Faces run +x, -x, +y, -y, +z, -z, six indices each: drop -y
  g.setIndex([...idx.slice(0, 18), ...idx.slice(24)]);
  g.clearGroups();
  return g;
})();

/** Drawing in a building's frame */
function kit(b: Batch, F: Frame) {
  const put = (g: THREE.BufferGeometry, mat: THREE.Material) => b.add(g.applyMatrix4(F.M), mat);
  const lbox = (u0: number, u1: number, y0: number, y1: number, v0: number, v1: number, mat: THREE.Material) => {
    const g = OPEN_BOX.clone().scale(Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(v1 - v0));
    put(g.translate((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2), mat);
  };
  /** An upright wall from a to c (u, v), y0 to y1, facing n (u, v), its atlas band laid on from u0 (stacked when taller than the band) */
  const wall = (band: Band, a: Pt, c: Pt, y0: number, y1: number, n: Pt, u0: number) => {
    if (-(c[1] - a[1]) * n[0] + (c[0] - a[0]) * n[1] < 0) [a, c] = [c, a];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    for (let ya = y0; ya < y1 - 0.01; ya += band.th) {
      const yb = Math.min(y1, ya + band.th);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([a[0], ya, a[1], c[0], ya, c[1], c[0], yb, c[1], a[0], yb, a[1]], 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute([n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1]], 3));
      const u1 = u0 + len / band.tw;
      const v1 = band.v0 + ((yb - ya) / band.th) * band.vh;
      g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, band.v0, u1, band.v0, u1, v1, u0, v1], 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      put(g, ATLAS.mat);
    }
  };
  /** A sign board (or blade) from the sign atlas: centred at (u, y, v), facing out (ry turns it) */
  const sign = (uv: number[], u: number, y: number, v: number, sw: number, sh: number, ry = 0) => {
    const g = new THREE.PlaneGeometry(sw, sh);
    const [u0, v0, u1, v1] = uv;
    g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v1, u1, v1, u0, v0, u1, v0], 2));
    put(g.rotateY(ry).translate(u, y, v), SIGN_ATLAS.mat);
  };
  /** A square bar between two points */
  const beam = (p: THREE.Vector3, q: THREE.Vector3, th: number, mat: THREE.Material) => {
    const dir = q.clone().sub(p);
    const g = new THREE.BoxGeometry(th, dir.length(), th);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
    g.translate((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
    put(g, mat);
  };
  return { put, lbox, wall, sign, beam };
}
type Kit = ReturnType<typeof kit>;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** The four walls: the front's ground floor (if any) and upper floors from `upper`, the sides and back full height */
function shell(k: Kit, F: Frame, top: number, wallBand: Band, ground: Band | null, upper: number, u0: number) {
  const { w, d } = F;
  if (ground) {
    k.wall(ground, [0, 0], [w, 0], S, S + SHOP_H, [0, 1], u0 * 0.37);
    k.wall(wallBand, [0, 0], [w, 0], upper, top, [0, 1], u0);
  } else k.wall(wallBand, [0, 0], [w, 0], S, top, [0, 1], u0);
  k.wall(wallBand, [0, -d], [0, 0], S, top, [-1, 0], u0 + 0.25);
  k.wall(wallBand, [w, 0], [w, -d], S, top, [1, 0], u0 + 0.5);
  k.wall(wallBand, [w, -d], [0, -d], S, top, [0, -1], u0 + 0.75);
}

/** The roof slab and its parapet */
function roof(k: Kit, F: Frame, top: number, par: THREE.Material, ph = 0.22) {
  const { w, d } = F;
  const t = 0.12;
  k.lbox(0, w, top - 0.04, top, -d, 0, ROOF);
  k.lbox(0, w, top, top + ph, -t, 0, par);
  k.lbox(0, w, top, top + ph, -d, -d + t, par);
  k.lbox(0, t, top, top + ph, -d + t, -t, par);
  k.lbox(w - t, w, top, top + ph, -d + t, -t, par);
}

/** A bracketed cornice along the front */
function cornice(k: Kit, w: number, top: number, trim: THREE.Material, low: boolean, brackets = true) {
  k.lbox(-0.06, w + 0.06, top - 0.34, top - 0.14, 0, 0.22, trim);
  if (LOW) return;
  k.lbox(-0.03, w + 0.03, top - 0.14, top - 0.06, 0, 0.12, trim);
  if (brackets && !low) for (let u = 0.25; u < w - 0.15; u += 0.55) k.lbox(u - 0.05, u + 0.05, top - 0.52, top - 0.34, 0, 0.16, trim);
}

/** Phones: the finest details (string courses, pilasters, chairs, chalk boards) are left out */
let LOW = false;

/** A string course at each floor line and pilasters at the ends: the front isn't flat */
function dress(k: Kit, w: number, from: number, top: number, floors: number, trim: THREE.Material) {
  if (LOW) return;
  for (let i = 0; i < floors; i++) {
    const y = from + i * FLOOR;
    k.lbox(-0.02, w + 0.02, y - 0.03, y + 0.03, 0, 0.05, trim);
  }
  for (const u of [0.07, w - 0.07]) k.lbox(u - 0.07, u + 0.07, from, top - 0.3, 0, 0.06, trim);
}

/* ---------- Rooftop and street things ---------- */

function tank(k: Kit, u: number, v: number, base: number) {
  if (LOW) return acUnit(k, u, v, base);
  for (const [du, dv] of [
    [-0.28, -0.28],
    [0.28, -0.28],
    [0.28, 0.28],
    [-0.28, 0.28],
  ])
    k.lbox(u + du - 0.03, u + du + 0.03, base, base + 0.7, v + dv - 0.03, v + dv + 0.03, METAL);
  k.lbox(u - 0.34, u + 0.34, base + 0.68, base + 0.72, v - 0.34, v + 0.34, METAL);
  const seg = LOW ? 8 : 12;
  k.put(new THREE.CylinderGeometry(0.4, 0.4, 0.75, seg).translate(u, base + 1.1, v), toon('#7a5a3c'));
  if (!LOW) for (const y of [0.85, 1.3]) k.put(new THREE.CylinderGeometry(0.415, 0.415, 0.04, seg).translate(u, base + y, v), METAL);
  k.put(new THREE.ConeGeometry(0.46, 0.32, seg).translate(u, base + 1.64, v), toon('#4b3a5a'));
}
function acUnit(k: Kit, u: number, v: number, base: number) {
  k.lbox(u - 0.3, u + 0.3, base, base + 0.36, v - 0.22, v + 0.22, toon('#c9c4e6'));
  k.lbox(u - 0.2, u + 0.2, base + 0.36, base + 0.38, v - 0.12, v + 0.12, INK);
}
function hut(k: Kit, u: number, v: number, base: number, mat: THREE.Material) {
  k.lbox(u - 0.45, u + 0.45, base, base + 0.85, v - 0.4, v + 0.4, mat);
  k.lbox(u - 0.5, u + 0.5, base + 0.85, base + 0.92, v - 0.45, v + 0.45, ROOF);
  k.lbox(u - 0.18, u + 0.18, base, base + 0.7, v + 0.4, v + 0.42, INK);
}
function antenna(k: Kit, u: number, v: number, base: number, h: number) {
  k.put(new THREE.CylinderGeometry(0.025, 0.035, h, 5).translate(u, base + h / 2, v), METAL);
  k.put(new THREE.SphereGeometry(0.06, 6, 4).translate(u, base + h, v), glow('#ff3b3b'));
}
/** A roof garden: planters along two sides, small trees, a bench */
function garden(k: Kit, F: Frame, top: number) {
  const { w, d } = F;
  k.lbox(0.2, w - 0.2, top, top + 0.28, -0.55, -0.2, toon('#6e6a8c'));
  k.lbox(0.2, w - 0.2, top + 0.27, top + 0.3, -0.52, -0.23, toon('#3b2a22'));
  for (let u = 0.5; u < w - 0.3; u += LOW ? 1.6 : 0.9) {
    const [x, z] = toWorld(F, u, -0.38);
    addTree(x, z, 0.45, false, top + 0.28);
  }
  k.lbox(0.2, 0.55, top, top + 0.28, -d + 0.3, -0.7, toon('#6e6a8c'));
  k.put(new THREE.IcosahedronGeometry(0.16, 0).translate(0.37, top + 0.42, -d / 2), LEAF);
}
function planter(k: Kit, u: number, v: number, base = S) {
  k.lbox(u - 0.2, u + 0.2, base, base + 0.32, v - 0.15, v + 0.15, toon('#6e6a8c'));
  k.put(new THREE.IcosahedronGeometry(0.17, 0).translate(u - 0.05, base + 0.45, v), LEAF);
  if (!LOW) k.put(new THREE.IcosahedronGeometry(0.13, 0).translate(u + 0.1, base + 0.43, v + 0.03), GREEN);
}
/** An A-frame chalk board on the sidewalk side of the plot */
function aboard(k: Kit, u: number, v: number) {
  if (LOW) return;
  for (const s of [-1, 1]) k.put(new THREE.BoxGeometry(0.3, 0.46, 0.025).rotateX(s * 0.22).translate(u, S + 0.23, v + s * 0.05), INK);
  k.put(new THREE.BoxGeometry(0.24, 0.3, 0.02).rotateX(0.22).translate(u, S + 0.25, v + 0.064), CREAM);
}
/** A bike leaning on the wall */
function bike(k: Kit, u: number, v: number, color: string) {
  const frame = toon(color);
  for (const du of [-0.3, 0.3]) k.put(new THREE.TorusGeometry(0.17, 0.022, 4, 10).translate(u + du, S + 0.19, v), INK);
  k.beam(V(u - 0.3, S + 0.19, v), V(u, S + 0.42, v), 0.035, frame);
  k.beam(V(u, S + 0.42, v), V(u + 0.3, S + 0.19, v), 0.035, frame);
  k.beam(V(u - 0.3, S + 0.19, v), V(u + 0.05, S + 0.19, v), 0.03, frame);
  k.beam(V(u + 0.22, S + 0.5, v), V(u + 0.3, S + 0.19, v), 0.03, frame);
  k.lbox(u - 0.08, u + 0.04, S + 0.46, S + 0.49, v - 0.05, v + 0.05, INK);
  k.lbox(u + 0.2, u + 0.24, S + 0.5, S + 0.53, v - 0.14, v + 0.14, INK);
}
/** A café table with two chairs, and maybe a parasol */
function table(k: Kit, u: number, v: number, parasol: string | null) {
  k.put(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 10).translate(u, S + 0.45, v), CREAM);
  k.put(new THREE.CylinderGeometry(0.025, 0.025, 0.44, 5).translate(u, S + 0.22, v), METAL);
  for (const s of LOW ? [] : [-1, 1]) {
    k.lbox(u + s * 0.32 - 0.12, u + s * 0.32 + 0.12, S + 0.27, S + 0.3, v - 0.12, v + 0.12, WOOD);
    k.lbox(u + s * 0.44 - 0.02, u + s * 0.44 + 0.02, S + 0.3, S + 0.6, v - 0.12, v + 0.12, WOOD);
    k.lbox(u + s * 0.32 - 0.1, u + s * 0.32 + 0.1, S, S + 0.27, v - 0.02, v + 0.02, METAL);
  }
  if (parasol) {
    k.put(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 5).translate(u, S + 0.75, v), METAL);
    k.put(new THREE.ConeGeometry(0.62, 0.25, 8).translate(u, S + 1.42, v), toon(parasol));
  }
}

/** A striped awning sloping out and down from the wall */
function awning(k: Kit, u0: number, u1: number, y: number, depth: number, colors: string[]) {
  const drop = 0.28;
  const slope = Math.atan2(drop, depth);
  const len = Math.hypot(drop, depth);
  const n = Math.max(2, Math.round((u1 - u0) / (LOW ? 0.6 : 0.3)));
  const sw = (u1 - u0) / n;
  for (let i = 0; i < n; i++) {
    const mat = toon(colors[i % colors.length]);
    const uc = u0 + sw * (i + 0.5);
    k.put(new THREE.BoxGeometry(sw, 0.03, len).rotateX(slope).translate(uc, y - drop / 2, depth / 2), mat);
    k.lbox(uc - sw / 2, uc + sw / 2, y - drop - 0.14, y - drop, depth - 0.02, depth + 0.01, mat);
  }
}

/** A double-sided blade sign standing out from the wall */
function blade(k: Kit, id: SignId, u: number, y0: number, y1: number, out = 0.75, wide = 0.42) {
  const h = y1 - y0;
  const sw = Math.min(wide, h * 0.27);
  const vm = out - sw / 2 - 0.08;
  k.lbox(u - 0.018, u + 0.018, y0 - 0.04, y1 + 0.04, 0.05, out, INK);
  k.lbox(u - 0.04, u + 0.04, y0 + h * 0.15, y0 + h * 0.15 + 0.06, 0, 0.12, METAL);
  k.lbox(u - 0.04, u + 0.04, y1 - h * 0.15, y1 - h * 0.15 + 0.06, 0, 0.12, METAL);
  k.sign(SIGN_ATLAS.blade(id), u + 0.02, (y0 + y1) / 2, vm, sw, h, Math.PI / 2);
  k.sign(SIGN_ATLAS.blade(id), u - 0.02, (y0 + y1) / 2, vm, sw, h, -Math.PI / 2);
}

/** A fascia board over the shop window, the sign on it */
const FASCIA = 0.45;
function fascia(k: Kit, w: number, id: SignId, color: string) {
  const y = S + SHOP_H;
  k.lbox(0, w, y, y + FASCIA, 0, 0.08, toon('#141226'));
  const sh = Math.min(0.4, (w - 0.3) / 4.2);
  k.sign(SIGN_ATLAS.board(id), w / 2, y + FASCIA / 2, 0.082, sh * 4.2, sh);
  k.lbox(0.05, w - 0.05, y - 0.02, y + 0.01, 0, 0.1, glow(color));
}

/** A fire escape up the front: a landing at each floor with a rail, stairs between, a drop ladder under the first */
function fireEscape(k: Kit, u0: number, u1: number, from: number, floors: number, low: boolean) {
  for (let i = 0; i < floors; i++) {
    const y = from + i * FLOOR;
    k.lbox(u0, u1, y - 0.04, y, 0, 0.55, METAL);
    k.lbox(u0, u1, y + 0.42, y + 0.45, 0.52, 0.55, METAL);
    if (!low) for (const u of [u0, u1, (u0 + u1) / 2]) k.lbox(u - 0.015, u + 0.015, y, y + 0.43, 0.52, 0.55, METAL);
    if (i < floors - 1) {
      const [a, c] = i % 2 ? [u1 - 0.2, u0 + 0.35] : [u0 + 0.2, u1 - 0.35];
      const p = V(a, y, 0.28);
      const q = V(c, y + FLOOR, 0.28);
      const dir = q.clone().sub(p);
      k.put(new THREE.BoxGeometry(dir.length(), 0.04, 0.3).rotateZ(Math.atan2(dir.y, dir.x)).translate((p.x + q.x) / 2, (p.y + q.y) / 2, 0.28), METAL);
    }
  }
  for (const u of [u0 + 0.12, u0 + 0.4]) k.lbox(u - 0.015, u + 0.015, from - 0.9, from, 0.46, 0.49, METAL);
  if (!low) for (let y = from - 0.8; y < from; y += 0.25) k.lbox(u0 + 0.12, u0 + 0.4, y, y + 0.02, 0.46, 0.49, METAL);
}

/* ---------- The building types ---------- */

const shopBand = (color: string): GroundKind =>
  color === PAL.cyan || color === '#7cf4ff' || color === '#00eaff' || color === '#2bff88'
    ? 'shopCyan'
    : color === '#ff6ad5' || color === '#e219e5' || color === '#8f7bff'
      ? 'shopPink'
      : 'shopWarm';

function building(b: Batch, f: Infill, crowd: Idle[], low: boolean) {
  const r = rng(f.seed);
  const F = frameOf(f);
  const k = kit(b, F);
  const { w, d } = F;
  const top = S + f.h;
  const u0 = Math.floor(r() * COLS) / COLS;
  const hasTower = f === WATER_TOWER;
  const roofTop = (things: () => void) => {
    if (!hasTower) things();
  };

  if (f.type === 'brownstone') {
    const kind: WallKind = r() < 0.6 ? 'brownstone' : 'brick';
    const { wall, trim } = WALL_COLOR[kind];
    const trimM = toon(trim);
    shell(k, F, top, ATLAS.wall[kind], ATLAS.ground.stoneBase, S + SHOP_H, u0);
    dress(k, w, S + SHOP_H, top, f.floors, trimM);
    cornice(k, w, top, trimM, low);
    roof(k, F, top, toon(shadeHex(wall, -0.25)), 0.12);
    // The stoop up to the door, with its rails; the door in a carved surround
    const [sa, sb] = [toLocal(F, [stoopOf(f)[0], stoopOf(f)[1]]), toLocal(F, [stoopOf(f)[2], stoopOf(f)[3]])];
    const s0 = Math.min(sa[0], sb[0]);
    const s1 = Math.max(sa[0], sb[0]);
    const stone = toon('#8f7a8a');
    for (let i = 0; i < 3; i++) k.lbox(s0, s1, S + i * 0.15, S + (i + 1) * 0.15, 0, 0.75 - i * 0.25, stone);
    for (const u of LOW ? [] : [s0 + 0.03, s1 - 0.03]) {
      k.beam(V(u, S + 0.95, 0.02), V(u, S + 0.5, 0.72), 0.04, METAL);
      k.lbox(u - 0.02, u + 0.02, S, S + 0.5, 0.7, 0.74, METAL);
    }
    const uc = (s0 + s1) / 2;
    k.lbox(uc - 0.3, uc + 0.3, S + 0.45, S + 1.45, -0.02, 0.03, toon('#3a2430'));
    k.lbox(uc - 0.4, uc - 0.3, S + 0.45, S + 1.5, 0, 0.08, trimM);
    k.lbox(uc + 0.3, uc + 0.4, S + 0.45, S + 1.5, 0, 0.08, trimM);
    k.lbox(uc - 0.48, uc + 0.48, S + 1.5, S + 1.62, 0, 0.14, trimM);
    k.put(new THREE.SphereGeometry(0.05, 6, 4).translate(uc - 0.4, S + 1.32, 0.12), glow(PAL.warm));
    // A bay window up the front, if it's wide enough
    if (w >= 3.2 && f.floors >= 2) {
      const b0 = Math.min(w - 1.45, Math.max(s1 + 0.4, w * 0.55));
      const b1 = b0 + 1.2;
      const y0 = S + SHOP_H + 0.08;
      const y1 = top - 0.55;
      k.lbox(b0, b1, y0 - 0.1, y1 + 0.08, 0, 0.36, toon(wall));
      k.wall(ATLAS.wall[kind], [b0 + 0.05, 0.361], [b1 - 0.05, 0.361], y0, y1, [0, 1], 0.06);
      k.lbox(b0 - 0.05, b1 + 0.05, y1 + 0.08, y1 + 0.16, 0, 0.42, trimM);
      k.lbox(b0 - 0.05, b1 + 0.05, y0 - 0.18, y0 - 0.1, 0, 0.42, trimM);
    }
    // Planters either side of the stoop, a bin
    planter(k, Math.max(0.25, s0 - 0.3), 0.5);
    if (s1 + 0.6 < w) planter(k, s1 + 0.3, 0.5);
    roofTop(() => {
      k.lbox(0.3, 0.6, top, top + 0.7, -d + 0.3, -d + 0.6, toon(shadeHex(wall, -0.15)));
      k.lbox(w - 0.7, w - 0.4, top, top + 0.55, -d + 0.4, -d + 0.7, toon(shadeHex(wall, -0.15)));
      const pick = r();
      if (pick < 0.35) tank(k, w / 2, -d / 2, top);
      else if (pick < 0.65) garden(k, F, top);
      else acUnit(k, w * 0.4, -d * 0.5, top);
    });
    return;
  }

  if (f.type === 'shop') {
    const id = f.sign!;
    const sg = SIGNS[id];
    const named = NAMED_SHOPS.includes(id);
    const kind: WallKind =
      id === 'validator'
        ? 'stuccoViolet'
        : id === 'crumpet'
          ? 'brick'
          : id === 'coffee'
            ? 'stuccoTeal'
            : (['brick', 'stuccoTeal', 'stuccoPink', 'stuccoViolet', 'brownstone'] as WallKind[])[Math.floor(r() * 5)];
    const { wall, trim } = WALL_COLOR[kind];
    const trimM = toon(trim);
    const upper = S + SHOP_H + FASCIA;
    shell(k, F, top, ATLAS.wall[kind], ATLAS.ground[shopBand(sg.color)], upper, u0);
    fascia(k, w, id, sg.color);
    if (f.floors > 0) dress(k, w, upper, top, f.floors, trimM);
    cornice(k, w, top, trimM, low, kind === 'brick' || kind === 'brownstone');
    roof(k, F, top, toon(shadeHex(wall, -0.25)));
    // An awning in the shop's colours, a blade sign, a fire escape on taller ones
    const stripes = id === 'crumpet' ? ['#f2c94c', '#f3f2f7'] : id === 'coffee' ? ['#5a3a2a', '#e8d9c0'] : [AWNINGS[Math.floor(r() * AWNINGS.length)], '#f3f2f7'];
    if (named || r() < 0.65) awning(k, 0.15, w - 0.15, S + SHOP_H - 0.02, 0.48, stripes);
    const escape = f.floors >= 2 && w >= 3.1 && !named && r() < 0.55 && !LOW;
    if (f.floors >= 1) blade(k, id, w - 0.3, upper + 0.15, Math.min(top - 0.5, upper + 0.15 + 1.5));
    if (escape) fireEscape(k, 0.3, Math.min(w - 0.8, 1.9), upper, f.floors, low);
    // Out front: café tables (with people), or a chalk board, a planter and a bike
    if (id === 'coffee') {
      for (const [u, p] of [
        [0.9, '#5a3a2a'],
        [w - 1.0, '#e8d9c0'],
      ] as [number, string][]) {
        table(k, u, 0.55, p);
        if (!low) {
          const [x, z] = toWorld(F, u - 0.32, 0.55);
          const ry = Math.atan2(F.t[0], F.t[1]);
          crowd.push({ x, z, y: SEAT, ry, act: 'sit' });
        }
      }
    } else {
      aboard(k, w * 0.35, 0.3);
      planter(k, 0.3, 0.28);
      if (w >= 3 && !low) bike(k, w - 0.75, 0.2, NEONS[Math.floor(r() * NEONS.length)]);
    }
    roofTop(() => {
      if (id === 'validator') {
        // A dish and a mast on the tech store
        // The dish faces up and out over the street, its feed on an arm
        const tilt = 0.9;
        k.put(new THREE.CylinderGeometry(0.42, 0.3, 0.07, 14).rotateX(tilt).translate(w * 0.35, top + 0.62, -d * 0.45), CREAM);
        k.beam(V(w * 0.35, top + 0.62, -d * 0.45), V(w * 0.35, top + 0.62 + Math.cos(tilt) * 0.4, -d * 0.45 + Math.sin(tilt) * 0.4), 0.025, METAL);
        k.put(new THREE.SphereGeometry(0.05, 6, 4).translate(w * 0.35, top + 0.62 + Math.cos(tilt) * 0.4, -d * 0.45 + Math.sin(tilt) * 0.4), METAL);
        k.lbox(w * 0.35 - 0.04, w * 0.35 + 0.04, top, top + 0.42, -d * 0.45 - 0.04, -d * 0.45 + 0.04, METAL);
        antenna(k, w * 0.75, -d * 0.6, top, 1.4);
        return;
      }
      const pick = r();
      if (pick < 0.3) garden(k, F, top);
      else if (pick < 0.55) tank(k, w * 0.6, -d * 0.55, top);
      else {
        acUnit(k, w * 0.3, -d * 0.4, top);
        hut(k, w * 0.72, -d * 0.6, top, toon(shadeHex(wall, -0.1)));
      }
      if (r() < 0.4) antenna(k, 0.4, -d + 0.4, top, 1.0);
    });
    return;
  }

  if (f.type === 'diner') {
    const chrome = toon('#c9c4e6');
    k.wall(ATLAS.ground.diner, [0, 0], [w, 0], S, S + SHOP_H, [0, 1], u0);
    for (const [a, c, n] of [
      [
        [0, -d],
        [0, 0],
        [-1, 0],
      ],
      [
        [w, 0],
        [w, -d],
        [1, 0],
      ],
    ] as [Pt, Pt, Pt][])
      k.wall(ATLAS.ground.diner, a, c, S, S + SHOP_H, n, 0.2);
    k.wall(ATLAS.ground.diner, [w, -d], [0, -d], S, S + SHOP_H, [0, -1], 0.5);
    // The band above the windows, pink neon top and bottom, the roof
    k.lbox(-0.02, w + 0.02, S + SHOP_H, top, -d, 0.02, chrome);
    k.lbox(-0.04, w + 0.04, S + SHOP_H + 0.08, S + SHOP_H + 0.13, -d + 0.1, 0.05, glow('#ff3b8a'));
    k.lbox(-0.04, w + 0.04, top - 0.1, top - 0.05, -d + 0.1, 0.05, glow(PAL.cyan));
    k.lbox(0, w, top, top + 0.06, -d, 0, ROOF);
    // The door: a chrome frame on the front
    k.lbox(w * 0.5 - 0.35, w * 0.5 + 0.35, S, S + 1.15, 0, 0.04, chrome);
    k.lbox(w * 0.5 - 0.27, w * 0.5 + 0.27, S + 0.05, S + 1.08, 0.02, 0.05, toon('#3e5a8f'));
    // The big sign on the roof, both ways
    const sw = Math.min(w - 0.2, 2.6);
    const sy = top + 0.95;
    for (const u of [w / 2 - sw * 0.35, w / 2 + sw * 0.35]) k.lbox(u - 0.04, u + 0.04, top, sy - 0.3, -0.6, -0.52, METAL);
    k.lbox(w / 2 - sw / 2 - 0.04, w / 2 + sw / 2 + 0.04, sy - sw / 8.4 - 0.04, sy + sw / 8.4 + 0.04, -0.6, -0.5, INK);
    k.sign(SIGN_ATLAS.board('diner'), w / 2, sy, -0.498, sw, sw / 4.2);
    k.sign(SIGN_ATLAS.board('diner'), w / 2, sy, -0.602, sw, sw / 4.2, Math.PI);
    acUnit(k, w * 0.25, -d * 0.6, top + 0.06);
    // Tables out front, someone at one
    table(k, 0.8, 0.5, null);
    if (w > 3.4) table(k, w - 0.8, 0.5, null);
    if (!low) {
      const [x, z] = toWorld(F, 0.48, 0.5);
      crowd.push({ x, z, y: SEAT, ry: Math.atan2(F.t[0], F.t[1]), act: 'sit' });
    }
    return;
  }

  if (f.type === 'loft') {
    const { wall } = WALL_COLOR.industrial;
    shell(k, F, top, ATLAS.wall.industrial, ATLAS.ground.loading, S + SHOP_H, u0);
    // A steel lintel over the loading floor, a bracket lamp
    k.lbox(-0.02, w + 0.02, S + SHOP_H - 0.02, S + SHOP_H + 0.1, 0, 0.1, METAL);
    for (const u of [0.07, w - 0.07]) k.lbox(u - 0.08, u + 0.08, S, top - 0.15, 0, 0.07, toon(shadeHex(wall, -0.2)));
    k.put(new THREE.SphereGeometry(0.06, 6, 4).translate(w * 0.62, S + SHOP_H - 0.12, 0.14), glow(PAL.warm));
    const teeth = w >= 3.2 && r() < 0.65 && !hasTower;
    if (teeth) {
      // A sawtooth roof, its glazing to the front
      k.lbox(0, w, top - 0.04, top, -d, 0, ROOF);
      const n = Math.max(2, Math.round(w / 1.4));
      const du = w / n;
      const ht = 0.7;
      for (let i = 0; i < n; i++) {
        const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(du, 0), new THREE.Vector2(du, ht)]);
        k.put(new THREE.ExtrudeGeometry(sh, { depth: d - 0.1, bevelEnabled: false }).translate(i * du, top, -d + 0.05), toon('#3a3466'));
        k.lbox(i * du + du - 0.02, i * du + du + 0.005, top + 0.08, top + ht - 0.06, -d + 0.15, -0.15, toon('#6f8fc4'));
      }
    } else {
      roof(k, F, top, toon(shadeHex(wall, -0.2)));
      roofTop(() => {
        if (r() < 0.5) tank(k, w * 0.35, -d * 0.5, top);
        else {
          // A billboard for one of the shops
          const id = (['records', 'pizza', 'noodles', 'books'] as SignId[])[Math.floor(r() * 4)];
          const bw = Math.min(w - 0.4, 2.4);
          for (const u of [w / 2 - bw * 0.3, w / 2 + bw * 0.3]) k.lbox(u - 0.04, u + 0.04, top, top + 1.1, -d * 0.5 - 0.04, -d * 0.5 + 0.04, METAL);
          k.lbox(w / 2 - bw / 2 - 0.04, w / 2 + bw / 2 + 0.04, top + 0.95, top + 1.6, -d * 0.5 - 0.1, -d * 0.5 - 0.04, INK);
          k.sign(SIGN_ATLAS.board(id), w / 2, top + 1.275, -d * 0.5 + 0.0, bw, 0.57);
        }
      });
    }
    return;
  }

  if (f.type === 'office') {
    // A two-storey podium, the glass tower set back on it, a lit crown and a mast
    const podium = S + SHOP_H + FLOOR;
    const inset = Math.min(0.5, (d - 2.4) / 2);
    const side = Math.min(0.35, (w - 2.6) / 2);
    const podBand = ATLAS.wall.glassTeal;
    k.wall(ATLAS.ground.lobby, [0, 0], [w, 0], S, S + SHOP_H, [0, 1], u0);
    k.wall(podBand, [0, 0], [w, 0], S + SHOP_H, podium, [0, 1], u0);
    k.wall(podBand, [0, -d], [0, 0], S, podium, [-1, 0], u0);
    k.wall(podBand, [w, 0], [w, -d], S, podium, [1, 0], u0);
    k.wall(podBand, [w, -d], [0, -d], S, podium, [0, -1], u0);
    const trimM = toon(WALL_COLOR.glassBlue.trim);
    k.lbox(-0.04, w + 0.04, podium - 0.04, podium + 0.12, -d - 0.04, 0.04, trimM);
    const [a0, a1, c0, c1] = [side, w - side, -d + side, -inset];
    const tb = ATLAS.wall.glassBlue;
    k.wall(tb, [a0, c1], [a1, c1], podium, top, [0, 1], u0);
    k.wall(tb, [a0, c0], [a0, c1], podium, top, [-1, 0], u0);
    k.wall(tb, [a1, c1], [a1, c0], podium, top, [1, 0], u0);
    k.wall(tb, [a1, c0], [a0, c0], podium, top, [0, -1], u0);
    for (const [u, v] of [
      [a0, c1],
      [a1, c1],
      [a0, c0],
      [a1, c0],
    ])
      k.lbox(u - 0.08, u + 0.08, podium, top + 0.1, v - 0.08, v + 0.08, trimM);
    k.lbox(a0, a1, top - 0.04, top + 0.14, c0, c1, ROOF);
    // The crown: a neon line round the top
    const cyan = glow(PAL.cyan);
    k.lbox(a0 - 0.02, a1 + 0.02, top + 0.14, top + 0.19, c1 - 0.02, c1 + 0.02, cyan);
    k.lbox(a0 - 0.02, a1 + 0.02, top + 0.14, top + 0.19, c0 - 0.02, c0 + 0.02, cyan);
    k.lbox(a0 - 0.02, a0 + 0.02, top + 0.14, top + 0.19, c0, c1, cyan);
    k.lbox(a1 - 0.02, a1 + 0.02, top + 0.14, top + 0.19, c0, c1, cyan);
    roofTop(() => {
      antenna(k, (a0 + a1) / 2, (c0 + c1) / 2, top + 0.14, 1.2);
      acUnit(k, a0 + 0.5, c0 + 0.5, top + 0.14);
    });
    // The podium roof: planters along the front; an entrance canopy; bikes and planters out front
    for (let u = 0.4; u < w - 0.3; u += 1.1) planter(k, u, -0.2, podium + 0.12);
    k.lbox(w * 0.3, w * 0.7, S + SHOP_H - 0.12, S + SHOP_H - 0.04, 0, 0.55, METAL);
    k.lbox(w * 0.3, w * 0.7, S + SHOP_H - 0.15, S + SHOP_H - 0.12, 0.5, 0.55, cyan);
    planter(k, 0.35, 0.35);
    planter(k, w - 0.35, 0.35);
    if (!low) bike(k, w * 0.2 + 0.4, 0.3, '#2bff88');
    return;
  }

  // Hotel: a lobby, balconies on every floor, a canopy over the door and a tall sign on the corner
  const { wall, trim } = WALL_COLOR.hotel;
  const trimM = toon(trim);
  shell(k, F, top, ATLAS.wall.hotel, ATLAS.ground.lobby, S + SHOP_H, 0);
  dress(k, w, S + SHOP_H, top, f.floors, trimM);
  cornice(k, w, top, trimM, low, false);
  roof(k, F, top, toon(shadeHex(wall, -0.25)));
  const rail = toon('#d6d2ea');
  for (let i = 1; i < f.floors; i++) {
    const y = S + SHOP_H + i * FLOOR + 0.06;
    for (let col = 0; col * CELL_W + 0.75 < w - 0.6; col += 2) {
      const uc = col * CELL_W + 0.375;
      k.lbox(uc - 0.34, uc + 0.34, y - 0.05, y, 0, 0.42, trimM);
      k.lbox(uc - 0.34, uc + 0.34, y + 0.36, y + 0.4, 0.38, 0.42, rail);
      if (!low) for (const u of [uc - 0.32, uc + 0.32]) k.lbox(u - 0.015, u + 0.015, y, y + 0.38, 0.02, 0.42, rail);
    }
  }
  k.lbox(w * 0.2, w * 0.62, S + SHOP_H - 0.1, S + SHOP_H, 0, 0.66, toon('#3a1f45'));
  k.lbox(w * 0.2, w * 0.62, S + SHOP_H - 0.13, S + SHOP_H - 0.1, 0.62, 0.66, glow(PAL.pink));
  blade(k, 'hotel', w - 0.22, S + SHOP_H + 0.6, top - 0.4, 0.85, 0.6);
  planter(k, w * 0.15, 0.4);
  planter(k, w * 0.68, 0.4);
  roofTop(() => {
    garden(k, F, top);
    hut(k, w * 0.7, -d * 0.65, top, toon(shadeHex(wall, -0.1)));
  });
}

/** The GM water tower, on a rooftop (scaled from the one that stood in the old park) */
function waterTower(b: Batch, f: Infill) {
  const [x0, z0, x1, z1] = f.box;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const base = S + f.h;
  const k = 0.72;
  const legTop = base + 4.2 * k;
  const steel = toon('#3a3466');
  const spread = 0.8 * k;
  const pts: Pt[] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const beam = (a: THREE.Vector3, c: THREE.Vector3, w: number) => {
    const d = c.clone().sub(a);
    const g = new THREE.BoxGeometry(w, d.length(), w);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
    g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2);
    b.add(g, steel);
  };
  for (const [sx, sz] of pts) beam(new THREE.Vector3(cx + sx * spread, base, cz + sz * spread), new THREE.Vector3(cx + sx * spread * 0.6, legTop, cz + sz * spread * 0.6), 0.08);
  for (const y of [0.35, 0.7]) {
    const f2 = 1 - y * 0.4;
    for (let i = 0; i < 4; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[(i + 1) % 4];
      const yy = base + (legTop - base) * y;
      beam(new THREE.Vector3(cx + ax * spread * f2, yy, cz + az * spread * f2), new THREE.Vector3(cx + bx * spread * f2, yy, cz + bz * spread * f2), 0.04);
    }
  }
  const gm = canvasTex(1024, 256, (c) => {
    c.fillStyle = '#5d4f9a';
    c.fillRect(0, 0, 1024, 256);
    c.strokeStyle = 'rgba(0,0,0,.25)';
    c.lineWidth = 4;
    for (let x = 0; x < 1024; x += 64) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 256);
      c.stroke();
    }
    c.font = `900 170px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 16;
    c.strokeStyle = PAL.ink;
    for (const x of [128, 640]) {
      c.strokeText('GM', x, 136);
      c.fillStyle = PAL.pink;
      c.fillText('GM', x, 136);
    }
  });
  const lid = toon('#41377a');
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.05 * k, 1.05 * k, 1.7 * k, 24), [toon('#ffffff', { map: gm }), lid, lid]);
  tank.position.set(cx, legTop + 0.85 * k, cz);
  tank.rotation.y = -Math.PI / 4;
  b.mesh(tank);
  b.add(new THREE.ConeGeometry(1.15 * k, 0.8 * k, 24).translate(cx, legTop + 1.7 * k + 0.4 * k, cz), lid);
}

/* ---------- String lights (all of them one set of points) ---------- */

const bulbs: number[] = [];
function string(a: THREE.Vector3, c: THREE.Vector3, n = 10, sag = 0.25) {
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    bulbs.push(a.x + (c.x - a.x) * t, a.y + (c.y - a.y) * t - Math.sin(t * Math.PI) * sag, a.z + (c.z - a.z) * t);
  }
}
/** Zigzag strings down a lane between two walls, `h` up */
function zigzag(r: [number, number, number, number], h: number, step = 1.6) {
  const [x0, z0, x1, z1] = r;
  const alongX = x1 - x0 > z1 - z0;
  const len = alongX ? x1 - x0 : z1 - z0;
  const n = Math.max(1, Math.round(len / step));
  for (let i = 0; i < n; i++) {
    const p0 = i / n;
    const p1 = (i + 1) / n;
    const side = i % 2;
    const at = (p: number, s: number) => (alongX ? new THREE.Vector3(x0 + len * p, h, s ? z1 - 0.05 : z0 + 0.05) : new THREE.Vector3(s ? x1 - 0.05 : x0 + 0.05, h, z0 + len * p));
    string(at(p0, side), at(p1, 1 - side), 5, 0.12);
  }
}

/* ---------- The scene ---------- */

/** `low`: phones (a smaller crowd on the square) */
export function buildInfill(scene: THREE.Scene, crowd: Idle[], tick: (f: Tick) => void, low = false) {
  const b = new Batch();

  LOW = low;
  for (const f of INFILL) building(b, f, crowd, low);
  waterTower(b, WATER_TOWER);

  // Alleys: bollards at the mouth, string lights overhead, a caged lamp and a drainpipe on one wall,
  // pallets on the other, a bin and stacked crates at the back (ALLEY_PROPS, solid when walking)
  const bin = toon('#2f6b4f');
  const crate = toon('#8a6a3c');
  const crateDark = toon('#6b4f2c');
  const pipeMat = toon('#5a5670');
  const lampGlow = glow(PAL.warm);
  for (const a of ALLEYS) {
    for (const [x, z] of a.bollards) {
      cyl(b, 0.08, 0.6, x, S, z, INK, 8, 0.09);
      cyl(b, 0.085, 0.06, x, S + 0.46, z, glow(PAL.warm), 8);
    }
    zigzag(a.box, S + 2.2);
  }
  for (const p of ALLEY_PROPS) {
    const [x0, z0, x1, z1] = p.box;
    if (p.kind === 'bin') {
      box(b, x0, S, z0, x1, S + p.h - 0.05, z1, bin);
      box(b, x0 - 0.02, S + p.h - 0.05, z0 - 0.02, x1 + 0.02, S + p.h, z1 + 0.02, INK);
    } else if (p.kind === 'crates') {
      box(b, x0, S, z0, x1, S + 0.42, z1, crate);
      box(b, x0 - 0.01, S + 0.19, z0 - 0.01, x1 + 0.01, S + 0.23, z1 + 0.01, crateDark);
      box(b, x0 + 0.05, S + 0.42, z0 + 0.06, x1 - 0.07, S + p.h, z1 - 0.04, crateDark);
    } else {
      // Pallets on their edge against the wall: three boards across, blocks between them
      const alongX = x1 - x0 > z1 - z0;
      for (const y of [0.04, 0.33, 0.62]) box(b, x0, S + y, z0, x1, S + y + 0.12, z1, crate);
      for (const t of [0, 0.5, 1]) {
        if (alongX) {
          const x = x0 + 0.05 + (x1 - x0 - 0.1) * t;
          box(b, x - 0.05, S, z0 + 0.015, x + 0.05, S + p.h, z1 - 0.015, crateDark);
        } else {
          const z = z0 + 0.05 + (z1 - z0 - 0.1) * t;
          box(b, x0 + 0.015, S, z - 0.05, x1 - 0.015, S + p.h, z + 0.05, crateDark);
        }
      }
    }
  }
  // The wall lamps: a backplate, a hood and a warm lamp, its light pooled on the ground below
  for (const l of ALLEY_LAMPS) {
    const [x, z] = l.at;
    const [ox, oz] = l.out;
    const span = (u: number, w: number) => (ox ? [x + ox * u, x + ox * (u + w)] : [x - w / 2, x + w / 2]);
    const spanZ = (u: number, w: number) => (oz ? [z + oz * u, z + oz * (u + w)] : [z - w / 2, z + w / 2]);
    const part = (u: number, du: number, w: number, y0: number, y1: number, mat: THREE.Material) => {
      const [ax, bx] = ox ? span(u, du) : span(0, w);
      const [az, bz] = oz ? spanZ(u, du) : spanZ(0, w);
      box(b, Math.min(ax, bx), S + y0, Math.min(az, bz), Math.max(ax, bx), S + y1, Math.max(az, bz), mat);
    };
    part(0, 0.04, 0.2, l.y - 0.12, l.y + 0.12, INK);
    part(0.04, 0.16, 0.16, l.y + 0.02, l.y + 0.07, INK);
    part(0.06, 0.12, 0.12, l.y - 0.07, l.y + 0.02, lampGlow);
    addPool(x + ox * 0.7, z + oz * 0.7, 1.7);
  }
  for (const [x, z] of ALLEY_PIPES) {
    cyl(b, 0.04, 2.5, x, S, z, pipeMat, 6);
    cyl(b, 0.055, 0.06, x, S + 1.2, z, pipeMat, 6);
  }
  // The courtyard lanes: string lights, planters and a pair chatting
  for (const [i, l] of LANES.entries()) {
    zigzag(l, S + 2.4, 2);
    const [x0, z0, x1, z1] = l;
    const alongX = x1 - x0 > z1 - z0;
    const mid: Pt = [(x0 + x1) / 2, (z0 + z1) / 2];
    if (alongX) {
      for (const x of [x0 + 1.2, x1 - 1.2]) {
        box(b, x - 0.35, S, z0 + 0.15, x + 0.35, S + 0.35, z0 + 0.55, toon('#6e6a8c'));
        addTree(x, z0 + 0.35, 0.55, false, S + 0.35);
      }
    }
    if (i > 0) crowd.push({ x: mid[0] - 0.35, z: mid[1], ry: Math.PI / 2, act: 'chat' }, { x: mid[0] + 0.35, z: mid[1], ry: -Math.PI / 2, act: 'chat' });
  }

  // Pocket parks: a low hedge along the straight sides (open in the middle), trees, benches with people on, a lamp
  const hedge = toon('#2a8a55');
  for (const p of PARKS) {
    const n = p.poly.length;
    for (let i = 0; i < n; i++) {
      const a = p.poly[i];
      const c = p.poly[(i + 1) % n];
      // Straight sides only (the diagonal side stays open to its sidewalk)
      if (a[0] !== c[0] && a[1] !== c[1]) continue;
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const gap = 1.4;
      for (const [t0, t1] of [
        [0.6, len / 2 - gap / 2],
        [len / 2 + gap / 2, len - 0.6],
      ]) {
        if (t1 - t0 < 0.4) continue;
        const ux = (c[0] - a[0]) / len;
        const uz = (c[1] - a[1]) / len;
        // Inward: a counter-clockwise outline's inside is on the left of travel
        const [ix, iz] = [uz, -ux];
        const p0: Pt = [a[0] + ux * t0 + ix * 0.3, a[1] + uz * t0 + iz * 0.3];
        const p1: Pt = [a[0] + ux * t1 + ix * 0.3, a[1] + uz * t1 + iz * 0.3];
        box(b, Math.min(p0[0], p1[0]) - 0.17, S, Math.min(p0[1], p1[1]) - 0.17, Math.max(p0[0], p1[0]) + 0.17, S + 0.4, Math.max(p0[1], p1[1]) + 0.17, hedge);
      }
    }
    for (const t of p.trees) addTree(t[0], t[1]);
    p.benches.forEach((q, k) => {
      bench(b, q.at, q.ry);
      if (k === 0) crowd.push({ x: q.at[0], z: q.at[1], y: SEAT, ry: q.ry, act: 'sit' });
    });
    for (const l of p.lamps) addLamp(l[0], l[1], 0);
  }

  square(scene, b, crowd, tick, low);
  streetLamps();

  b.build(scene);
  // Every string light downtown: one set of points, lit at night
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(bulbs, 3));
  const mat = lit(
    new THREE.PointsMaterial({ color: PAL.warm, map: glowTex, size: 0.24, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    0.25,
    1.4
  );
  scene.add(fx(new THREE.Points(geo, mat)));
}

/** The hangout square: the stage and screen at the north end facing the square, the fountain, kiosks, planters, benches, poles with string lights, and its crowd */
function square(scene: THREE.Scene, b: Batch, crowd: Idle[], tick: (f: Tick) => void, low: boolean) {
  const sq = SQUARE;
  const [x0, z0, x1, z1] = sq.box;
  // A stone ring round the fountain and a dance floor in front of the stage
  b.add(new THREE.RingGeometry(sq.fountain.r + 0.1, sq.fountain.r + 1.1, 32).rotateX(-Math.PI / 2).translate(sq.fountain.at[0], S + 0.008, sq.fountain.at[1]), toon('#6f6a9a'));
  // The stage's back is sz0 (north), its front sz1 faces the square
  const [s0, sz0, s1, sz1] = sq.stage;
  box(b, s0 + 0.5, S, sz1 + 0.4, s1 - 0.5, S + 0.012, sz1 + 4.2, toon('#2c2650'));
  box(b, s0 + 0.5, S, sz1 + 4.1, s1 - 0.5, S + 0.016, sz1 + 4.2, glow(PAL.pink));
  box(b, s0 + 0.5, S, sz1 + 0.4, s1 - 0.5, S + 0.016, sz1 + 0.5, glow(PAL.pink));

  // The stage: a deck with a neon edge, steps either side, a truss over it, speakers at the front
  const H = sq.stageH;
  box(b, s0, S, sz0, s1, S + H, sz1, toon('#1f1b38'));
  box(b, s0, S + H, sz0, s1, S + H + 0.03, sz1, toon('#3a335f'));
  box(b, s0, S + H - 0.08, sz1, s1, S + H - 0.02, sz1 + 0.02, glow(PAL.cyan));
  for (const x of [s0 - 0.5, s1]) box(b, x, S, sz0 + 0.2, x + 0.5, S + H * 0.5, sz1 - 0.6, toon('#3a335f'));
  const truss = toon('#2b2848');
  for (const x of [s0 + 0.15, s1 - 0.35]) box(b, x, S + H, sz0 + 0.15, x + 0.2, S + 5.4, sz0 + 0.35, truss);
  box(b, s0 + 0.15, S + 5.2, sz0 + 0.15, s1 - 0.15, S + 5.4, sz0 + 0.35, truss);
  for (const x of [s0 + 0.2, s1 - 0.8]) {
    box(b, x, S + H, sz1 - 0.65, x + 0.6, S + H + 1.0, sz1 - 0.15, INK);
    cyl(b, 0.16, 0.02, x + 0.3, S + H + 0.55, sz1 - 0.15, toon('#4b4766'), 12);
  }
  // Stage lights hanging off the truss
  for (let k = 0; k < 6; k++) {
    const x = s0 + 1 + k * ((s1 - s0 - 2) / 5);
    box(b, x - 0.1, S + 4.95, sz0 + 0.4, x + 0.1, S + 5.2, sz0 + 0.6, glow([PAL.pink, PAL.cyan, PAL.warm][k % 3]));
  }

  // The big screen at the back of the stage, facing the square: fixed copy only
  const sc = sq.screen;
  const tex = canvasTex(1024, 448, (c) => {
    const g = c.createLinearGradient(0, 0, 1024, 448);
    g.addColorStop(0, '#2a0b52');
    g.addColorStop(1, '#0b1f4a');
    c.fillStyle = g;
    c.fillRect(0, 0, 1024, 448);
    const border = c.createLinearGradient(0, 0, 1024, 0);
    border.addColorStop(0, PAL.violet);
    border.addColorStop(0.5, PAL.magenta);
    border.addColorStop(1, PAL.cyan);
    c.strokeStyle = border;
    c.lineWidth = 18;
    c.strokeRect(9, 9, 1006, 430);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 168px ${FONT_DISPLAY}`;
    c.lineWidth = 14;
    c.strokeStyle = PAL.ink;
    c.strokeText('DEGEN CITY', 512, 190);
    c.fillStyle = '#f3f2f7';
    c.fillText('DEGEN CITY', 512, 190);
    c.font = `800 64px ${FONT_DISPLAY}`;
    c.fillStyle = PAL.cyan;
    c.fillText('GM DEGENS  ·  GAME ON', 512, 340);
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(sc.x1 - sc.x0, sc.y1 - sc.y0), lit(new THREE.MeshBasicMaterial({ map: tex }), 0.95, 1));
  screen.position.set((sc.x0 + sc.x1) / 2, S + (sc.y0 + sc.y1) / 2, sc.z + 0.06);
  scene.add(screen);
  box(b, sc.x0 - 0.12, S + sc.y0 - 0.12, sc.z - 0.12, sc.x1 + 0.12, S + sc.y1 + 0.12, sc.z + 0.05, INK);
  for (const x of [sc.x0 + 0.6, sc.x1 - 0.8]) box(b, x, S + H, sc.z - 0.12, x + 0.2, S + sc.y0, sc.z + 0.02, INK);

  // The fountain: a stone basin, water, a column with a bowl and a jet
  const f = sq.fountain;
  const [fx0, fz0] = f.at;
  cyl(b, f.r, 0.45, fx0, S, fz0, STONE, 28);
  cyl(b, f.r + 0.06, 0.06, fx0, S + 0.45, fz0, toon('#a9a4c9'), 28);
  const water = new THREE.Mesh(new THREE.CircleGeometry(f.r - 0.1, 28).rotateX(-Math.PI / 2), waterMat);
  water.position.set(fx0, S + 0.4, fz0);
  scene.add(water);
  cyl(b, 0.16, 1.0, fx0, S + 0.4, fz0, STONE, 12);
  cyl(b, 0.6, 0.12, fx0, S + 1.3, fz0, STONE, 20, 0.3);
  const jet = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.9, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#bfefff', transparent: true, opacity: 0.45, depthWrite: false }));
  jet.position.set(fx0, S + 1.85, fz0);
  jet.rotation.x = Math.PI;
  scene.add(fx(jet));
  tick(({ t }) => {
    jet.scale.y = 1 + Math.sin(t * 5) * 0.08;
  });

  // Kiosks: a booth with a counter hatch, a canopy and a neon strip; someone queueing at each
  sq.kiosks.forEach((k, i) => {
    const [kx0, kz0, kx1, kz1] = k;
    const col = ['#e219e5', '#00c2ff'][i % 2];
    box(b, kx0, S, kz0, kx1, S + 1.6, kz1, toon('#2b2550'));
    // The hatch faces the middle of the square
    const inward = i === 0 ? 1 : -1;
    const hx = inward > 0 ? kx1 : kx0;
    box(b, Math.min(hx, hx + inward * 0.02), S + 0.7, kz0 + 0.4, Math.max(hx, hx + inward * 0.02), S + 1.3, kz1 - 0.4, soft(PAL.warm));
    box(b, Math.min(hx, hx + inward * 0.3), S + 0.68, kz0 + 0.35, Math.max(hx, hx + inward * 0.3), S + 0.74, kz1 - 0.35, toon('#c9c4e6'));
    box(b, kx0 - 0.2, S + 1.6, kz0 - 0.2, kx1 + 0.2, S + 1.75, kz1 + 0.2, toon(col));
    // A neon trim round the canopy's edge (a whole glowing roof flares from above)
    box(b, kx0 - 0.21, S + 1.64, kz0 - 0.21, kx1 + 0.21, S + 1.7, kz1 + 0.21, glow(col));
    crowd.push({ x: hx + inward * 0.9, z: (kz0 + kz1) / 2, ry: inward > 0 ? -Math.PI / 2 : Math.PI / 2, act: 'queue' });
  });

  // Trees in planters round the edge
  for (const [x, z] of sq.trees) {
    box(b, x - 0.45, S, z - 0.45, x + 0.45, S + 0.5, z + 0.45, toon('#6e6a8c'));
    box(b, x - 0.38, S + 0.5, z - 0.38, x + 0.38, S + 0.52, z + 0.38, toon('#3b2a22'));
    addTree(x, z, 0.95, false, S + 0.52);
  }
  // Benches facing the stage, with people watching
  sq.benches.forEach((q, k) => {
    bench(b, q.at, q.ry);
    if (!low || k % 2) crowd.push({ x: q.at[0] + (k % 2 ? 0.2 : -0.2), z: q.at[1], y: SEAT, ry: q.ry, act: 'sit' });
  });
  // A crowd on the dance floor, facing the stage, and a couple of groups talking
  const r = rng(77);
  for (let i = 0; i < (low ? 4 : 9); i++) {
    const x = s0 + 1.4 + r() * (s1 - s0 - 2.8);
    const z = sz1 + 1.0 + r() * 2.6;
    crowd.push({ x, z, ry: Math.PI + (r() - 0.5) * 0.5, act: 'look' });
  }
  for (const [gx, gz] of (
    [
      [x0 + 3.2, z1 - 6.6],
      [x1 - 3.4, z1 - 6.2],
    ] as Pt[]
  ).slice(0, low ? 1 : 2)) {
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + gx;
      const px = gx + Math.cos(a) * 0.5;
      const pz = gz + Math.sin(a) * 0.5;
      crowd.push({ x: px, z: pz, ry: Math.atan2(gx - px, gz - pz), act: 'chat' });
    }
  }

  // Poles at the corners, strings of lights round the edge and across to the stage truss
  const top = S + 3;
  const poles = sq.poles.map(([x, z]) => {
    cyl(b, 0.06, 3, x, S, z, INK, 6);
    return new THREE.Vector3(x, top, z);
  });
  for (let i = 0; i < 4; i++) string(poles[i], poles[(i + 1) % 4], 16, 0.35);
  const truss0 = new THREE.Vector3(s0 + 0.25, S + 5.2, sz0 + 0.25);
  const truss1 = new THREE.Vector3(s1 - 0.25, S + 5.2, sz0 + 0.25);
  string(poles[3], truss1, 18, 0.6);
  string(poles[2], truss0, 18, 0.6);
}

/** Lamps along downtown's cross streets, both sides, kept off the crossings and the diagonals' mouths */
function streetLamps() {
  const off = LANE + 0.1;
  const nearDiag = (x: number, z: number) =>
    DIAGONALS.some((d) => {
      const [ax, az] = d.from;
      const [bx, bz] = d.to;
      const L = Math.hypot(bx - ax, bz - az);
      const t = Math.max(0, Math.min(L, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / L));
      return Math.hypot(x - (ax + ((bx - ax) * t) / L), z - (az + ((bz - az) * t) / L)) < LANE + 1.8;
    });
  for (const c of CORE_ROADS)
    for (let s = 4; s < DOWNTOWN - 2; s += 8) {
      if (CORE_ROADS.some((k) => Math.abs(s - k) < 4.5)) continue;
      for (const side of [-1, 1]) {
        // Along the north-south street at x = c, then the east-west street at z = c
        const [x, z] = [c + side * off, s];
        if (!nearDiag(x, z)) addLamp(x, z, side < 0 ? 0 : Math.PI);
        const [x2, z2] = [s + 3, c + side * off];
        if (!nearDiag(x2, z2)) addLamp(x2, z2, side < 0 ? -Math.PI / 2 : Math.PI / 2);
      }
    }
}
