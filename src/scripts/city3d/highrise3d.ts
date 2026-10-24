/*
 * Uptown's towers on screen (docs/finance-plan.md Phase 2; the numbers are
 * highrise.ts), part of Uptown's chunk (uptown3d.ts), a site a tower:
 *
 * - **The walls** from Uptown's own curtain-wall atlas (`ATLAS`: blue, gold,
 *   black and silver glass, a floor to a band's row and a bay to its column,
 *   the deco stone with its window strips and gold spandrels, and the
 *   podium's lobby), laid on in world units, stacked so a band never wraps,
 *   in pieces no longer than `SPAN` (nothing fixed much longer than a tile);
 *   their windows lit at night from its light map (offices: about half lit).
 *   Drums in `SIDES` facets, octagons with their corners cut (`CUT`).
 * - **Roofs** on every part (the setbacks' terraces too), a parapet round
 *   each.
 * - **Crowns:** a slab's lit band round its shaft's top; a deco tower's gold
 *   edges at each setback, its gold pyramid and finial; a drum's neon ring
 *   and cap; the twins' skybridge with a lit strip under it; the spire's lit
 *   lantern and mast. Every tower a red warning light at its tip (the
 *   neon's own: faint by day, bright at night, never flashing: a draw each).
 * - **Lobbies:** the podium's glazing all round, a canopy over the door and a
 *   revolving door (near only).
 *
 * Walls, roofs and crowns are drawn at every distance (the skyline is seen
 * from across town); parapets' caps, plant and the doors near only.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, rng, shadeHex, siteMat, toon } from './kit';
import { SLAB } from './world';
import { site } from './tilework';
import { GROUND, HIGHRISES, PODIUM, type Highrise, type Part, type Skin } from './highrise';
import type { Pt, Rect } from './uptown';
import { ROOF_TERRACES } from './boulevard';

/* ---------- The atlas ---------- */

const COLS = 8;
const ROWS = 4;
const PX_W = 48;
const PX_H = 64;
const W_PX = COLS * PX_W;
const BAND_PX = ROWS * PX_H;
/** A bay's width and a floor's height (world units) */
const BAY = 0.75;
const FLOOR = 1;
const SKINS: Skin[] = ['blue', 'gold', 'black', 'silver', 'stone'];
const GLASS: Record<Skin, { wall: string; mullion: string }> = {
  blue: { wall: '#2a5aa8', mullion: '#c8d4ee' },
  gold: { wall: '#b08a3a', mullion: '#f3e2b0' },
  black: { wall: '#1c1d2e', mullion: '#6a6c88' },
  silver: { wall: '#7d8fb3', mullion: '#e6ecf8' },
  stone: { wall: '#cdbf9f', mullion: '#a8873a' },
};
/** Lights in the offices at night: warm white and cool white */
const LIGHTS = ['#ffe6b0', '#ffe6b0', '#fff3d6', '#dff0ff'];

interface Band {
  v0: number;
  vh: number;
  tw: number;
  th: number;
}

/** One skin's band: ROWS floors of COLS bays, `glow` for the light map */
function skinBand(c: CanvasRenderingContext2D, skin: Skin, y0: number, glow: boolean, seed: number) {
  const r = rng(seed);
  const { wall, mullion } = GLASS[skin];
  c.fillStyle = glow ? '#000' : skin === 'stone' ? wall : shadeHex(wall, -0.2);
  c.fillRect(0, y0, W_PX, BAND_PX);
  for (let row = 0; row < ROWS; row++) {
    const y = y0 + row * PX_H;
    if (skin === 'stone') {
      // Stone piers between tall window strips, a gold spandrel under each window
      for (let col = 0; col < COLS; col++) {
        const x = col * PX_W;
        const on = r() < 0.45 ? LIGHTS[Math.floor(r() * LIGHTS.length)] : null;
        if (glow) {
          if (on) {
            c.fillStyle = on;
            c.fillRect(x + 14, y + 6, 20, 44);
          }
          continue;
        }
        // (by day the windows are all the same dark glass: the lights are the light map's, at night)
        c.fillStyle = shadeHex(wall, 0.12);
        c.fillRect(x, y, 6, PX_H);
        c.fillStyle = '#16131f';
        c.fillRect(x + 12, y + 4, 24, 48);
        const g = c.createLinearGradient(0, y + 6, 0, y + 50);
        g.addColorStop(0, '#5a6f9c');
        g.addColorStop(1, '#26304e');
        c.fillStyle = g;
        c.fillRect(x + 14, y + 6, 20, 44);
        c.fillStyle = mullion;
        c.fillRect(x + 12, y + 52, 24, 8);
      }
      continue;
    }
    // A curtain wall: glass from slab to slab, a dark slab edge at each floor, a mullion at every bay; by day one even
    // tint with the sky's reflection down each floor (the lights are the light map's, at night)
    for (let col = 0; col < COLS; col++) {
      const x = col * PX_W;
      const on = r() < 0.45 ? LIGHTS[Math.floor(r() * LIGHTS.length)] : null;
      if (glow) {
        if (on) {
          c.fillStyle = on;
          c.fillRect(x + 3, y + 9, PX_W - 6, PX_H - 11);
        }
        continue;
      }
      const tint = shadeHex(wall, (r() - 0.5) * 0.08);
      const g = c.createLinearGradient(0, y + 7, 0, y + PX_H);
      g.addColorStop(0, shadeHex(tint, 0.3));
      g.addColorStop(0.5, tint);
      g.addColorStop(1, shadeHex(tint, -0.25));
      c.fillStyle = g;
      c.fillRect(x, y + 7, PX_W, PX_H - 7);
      c.fillStyle = mullion;
      c.fillRect(x, y + 7, 2, PX_H - 7);
      c.fillRect(x + PX_W / 2 - 0.5, y + 7, 1, PX_H - 7);
    }
    if (!glow) {
      c.fillStyle = shadeHex(wall, -0.6);
      c.fillRect(0, y, W_PX, 7);
      c.fillStyle = mullion;
      c.fillRect(0, y + 6, W_PX, 1.5);
    }
  }
}

/** World units across one repeat of the ground floors' bands, and their heights in pixels (the podium's whole height, its ground floor, the storey over it) */
const GROUND_W = 4.8;
const PODIUM_PX = 128;
const GROUND_PX = 92;
const RIBBON_PX = 36;
/** A lit interior behind glass (the light map's): pendant lights, a desk, warm light */
function interior(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, glow: boolean, seed: number) {
  const r = rng(seed);
  if (glow) {
    c.fillStyle = 'rgba(255,226,170,0.55)';
    c.fillRect(x, y, w, h);
    c.fillStyle = '#fff3d6';
    for (let k = 0; k < Math.floor(w / 40); k++) c.fillRect(x + 14 + k * 40 + r() * 6, y + 6, 8, 5);
    return;
  }
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#3a3248');
  g.addColorStop(1, '#2a2436');
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
  // A pale stone floor, the desk, a plant, a couple of people, the pendants
  c.fillStyle = '#6e6880';
  c.fillRect(x, y + h - 6, w, 6);
  c.fillStyle = '#b8a07a';
  const dx = x + w * (0.25 + r() * 0.4);
  c.fillRect(dx, y + h - 22, 44, 16);
  c.fillStyle = '#d9c6a0';
  c.fillRect(dx, y + h - 24, 44, 3);
  c.fillStyle = '#2f6a3c';
  c.beginPath();
  c.arc(x + 12 + r() * 10, y + h - 18, 9, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#1a1626';
  for (let k = 0; k < 2; k++) {
    const px = x + 20 + r() * (w - 40);
    c.fillRect(px, y + h - 30, 6, 24);
    c.beginPath();
    c.arc(px + 3, y + h - 33, 4, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#f3e2b0';
  for (let k = 0; k < Math.floor(w / 40); k++) c.fillRect(x + 14 + k * 40, y + 6, 8, 4);
}
/** Glass over an interior: a pale reflection down it */
function glaze(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const g = c.createLinearGradient(x, y, x + w * 0.6, y + h);
  g.addColorStop(0, 'rgba(170,200,240,0.62)');
  g.addColorStop(0.5, 'rgba(120,155,215,0.36)');
  g.addColorStop(1, 'rgba(90,115,175,0.48)');
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
}
/** A glass atrium, the podium's whole height: slim silver mullions, a transom at the ground floor's head, the lobby inside */
function atriumBand(c: CanvasRenderingContext2D, y0: number, glow: boolean) {
  c.fillStyle = '#000';
  c.fillRect(0, y0, W_PX, PODIUM_PX);
  interior(c, 0, y0, W_PX, PODIUM_PX, glow, 77);
  if (glow) return;
  glaze(c, 0, y0, W_PX, PODIUM_PX);
  c.fillStyle = '#d8deec';
  for (let x = 0; x < W_PX; x += W_PX / 6) c.fillRect(x, y0, 3, PODIUM_PX);
  c.fillRect(0, y0 + PODIUM_PX - GROUND_PX - 2, W_PX, 3);
  c.fillRect(0, y0, W_PX, 4);
  c.fillStyle = '#4a4660';
  c.fillRect(0, y0 + PODIUM_PX - 3, W_PX, 3);
}
/** Bronze doors and glazing, the ground floor's height (behind a colonnade or an arcade) */
function bronzeBand(c: CanvasRenderingContext2D, y0: number, glow: boolean) {
  c.fillStyle = '#000';
  c.fillRect(0, y0, W_PX, GROUND_PX);
  interior(c, 0, y0, W_PX, GROUND_PX, glow, 91);
  if (glow) return;
  glaze(c, 0, y0, W_PX, GROUND_PX);
  c.fillStyle = '#8a6a3c';
  for (let x = 0; x < W_PX; x += W_PX / 4) {
    c.fillRect(x, y0, 6, GROUND_PX);
    c.fillRect(x + W_PX / 8 - 1, y0 + 24, 3, GROUND_PX - 24);
  }
  c.fillRect(0, y0, W_PX, 6);
  c.fillRect(0, y0 + 22, W_PX, 3);
  c.fillRect(0, y0 + GROUND_PX - 4, W_PX, 4);
}
/** Shopfronts, the ground floor's height: two shops to a repeat, each a stone riser, a lit window of things, a door and a dark fascia */
function shopsBand(c: CanvasRenderingContext2D, y0: number, glow: boolean) {
  const r = rng(313);
  const shop = W_PX / 2;
  const goods = ['#e85d75', '#f2c94c', '#6fcf97', '#56ccf2', '#bb6bd9', '#f2994a', '#f3f2f7'];
  c.fillStyle = '#000';
  c.fillRect(0, y0, W_PX, GROUND_PX);
  for (let k = 0; k < 2; k++) {
    const x = k * shop;
    const win: [number, number, number, number] = [x + 10, y0 + 20, shop - 52, GROUND_PX - 34];
    if (glow) {
      c.fillStyle = '#ffe9c2';
      c.fillRect(...win);
      c.fillStyle = 'rgba(255,233,194,0.6)';
      c.fillRect(x + shop - 38, y0 + 22, 26, GROUND_PX - 24);
      continue;
    }
    // The fascia (the sign is laid over it), the pier between shops
    c.fillStyle = '#1e1b2c';
    c.fillRect(x, y0, shop, 18);
    c.fillStyle = '#6e6880';
    c.fillRect(x, y0, 6, GROUND_PX);
    // The window: a lit display, things on stands, the glass over it
    c.fillStyle = '#efe4cf';
    c.fillRect(...win);
    for (let i = 0; i < 6; i++) {
      c.fillStyle = goods[Math.floor(r() * goods.length)];
      const gx = win[0] + 8 + i * ((win[2] - 20) / 6);
      const gh = 10 + r() * 18;
      c.fillRect(gx, win[1] + win[3] - 8 - gh, 12, gh);
    }
    c.fillStyle = '#b8a07a';
    c.fillRect(win[0], win[1] + win[3] - 8, win[2], 8);
    glaze(c, ...win);
    // The riser under it, the door beside it
    c.fillStyle = '#4a4660';
    c.fillRect(x + 6, y0 + GROUND_PX - 14, shop - 44, 14);
    c.fillStyle = '#2a2436';
    c.fillRect(x + shop - 38, y0 + 22, 26, GROUND_PX - 22);
    glaze(c, x + shop - 36, y0 + 24, 22, GROUND_PX - 26);
    c.fillStyle = '#c9b48a';
    c.fillRect(x + shop - 18, y0 + 52, 3, 14);
  }
}
/** A service wall, the podium's whole height: stone panels, louvres, a steel door with a lamp over it */
function serviceBand(c: CanvasRenderingContext2D, y0: number, glow: boolean) {
  c.fillStyle = glow ? '#000' : '#6e6880';
  c.fillRect(0, y0, W_PX, PODIUM_PX);
  if (glow) {
    c.fillStyle = '#ffe2a8';
    c.fillRect(W_PX * 0.62 + 18, y0 + 34, 14, 5);
    return;
  }
  c.fillStyle = '#5e5874';
  for (let x = 0; x < W_PX; x += 64) c.fillRect(x, y0, 2, PODIUM_PX);
  for (let y = y0 + 32; y < y0 + PODIUM_PX; y += 32) c.fillRect(0, y, W_PX, 2);
  // Louvres high up, a steel door and its lamp
  c.fillStyle = '#3a364c';
  c.fillRect(30, y0 + 10, 110, 30);
  c.fillStyle = '#8f8aa3';
  for (let y = y0 + 13; y < y0 + 38; y += 5) c.fillRect(32, y, 106, 2);
  c.fillStyle = '#4a4e66';
  c.fillRect(W_PX * 0.62, y0 + PODIUM_PX - 70, 50, 70);
  c.fillStyle = '#2a2436';
  c.fillRect(W_PX * 0.62 + 24, y0 + PODIUM_PX - 70, 2, 70);
  c.fillStyle = '#ffe2a8';
  c.fillRect(W_PX * 0.62 + 18, y0 + PODIUM_PX - 80, 14, 5);
}
/** The storey over a ground floor: a dark metal band with a ribbon of windows */
function ribbonBand(c: CanvasRenderingContext2D, y0: number, glow: boolean) {
  const r = rng(515);
  c.fillStyle = glow ? '#000' : '#3a364c';
  c.fillRect(0, y0, W_PX, RIBBON_PX);
  for (let x = 4; x < W_PX; x += 48) {
    if (glow) {
      if (r() < 0.5) {
        c.fillStyle = LIGHTS[Math.floor(r() * LIGHTS.length)];
        c.fillRect(x, y0 + 9, 42, 18);
      }
      continue;
    }
    c.fillStyle = '#3c4f7a';
    c.fillRect(x, y0 + 9, 42, 18);
    c.fillStyle = '#8f93ad';
    c.fillRect(x, y0 + 26, 42, 2);
  }
}

const ATLAS = (() => {
  const rows: [string, number][] = [...SKINS.map((k): [string, number] => [k, BAND_PX]), ['atrium', PODIUM_PX], ['bronze', GROUND_PX], ['shops', GROUND_PX], ['service', PODIUM_PX], ['ribbon', RIBBON_PX]];
  const tops: Record<string, number> = {};
  let H = 0;
  for (const [k, h] of rows) {
    tops[k] = H;
    H += h;
  }
  const draw = (glow: boolean) => (c: CanvasRenderingContext2D) => {
    SKINS.forEach((k, i) => skinBand(c, k, tops[k], glow, 900 + i));
    atriumBand(c, tops.atrium, glow);
    bronzeBand(c, tops.bronze, glow);
    shopsBand(c, tops.shops, glow);
    serviceBand(c, tops.service, glow);
    ribbonBand(c, tops.ribbon, glow);
  };
  const map = canvasTex(W_PX, H, draw(false));
  const emissiveMap = canvasTex(W_PX / 2, H / 2, (c) => {
    c.scale(0.5, 0.5);
    draw(true)(c);
  });
  for (const t of [map, emissiveMap]) t.wrapS = THREE.RepeatWrapping;
  // (canvas textures are flipped: the canvas's top row is v = 1; each band keeps a pixel off its edges)
  const band = (top: number, h: number, tw: number, th: number): Band => ({ v0: 1 - (top + h - 1) / H, vh: (h - 2) / H, tw, th });
  return {
    mat: siteMat('uptown-glass', lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff' }), 0.12, 1)),
    skin: Object.fromEntries(SKINS.map((k) => [k, band(tops[k], BAND_PX, BAY * COLS, FLOOR * ROWS)])) as Record<Skin, Band>,
    atrium: band(tops.atrium, PODIUM_PX, GROUND_W, PODIUM.h),
    bronze: band(tops.bronze, GROUND_PX, GROUND_W, GROUND.h),
    shops: band(tops.shops, GROUND_PX, GROUND_W, GROUND.h),
    service: band(tops.service, PODIUM_PX, GROUND_W, PODIUM.h),
    ribbon: band(tops.ribbon, RIBBON_PX, GROUND_W, PODIUM.h - GROUND.h),
  };
})();

/* ---------- Walls, roofs, outlines ---------- */

/** The longest a wall piece runs (nothing fixed much longer than a tile: tilebatch.ts) */
const SPAN = 12;
/** A drum's facets, an octagon's corner cut (a share of its side) */
const SIDES = 20;
const CUT = 0.22;

/** A part's outline, counter-clockwise from above (+y) */
function outline(p: Part, sides = SIDES): Pt[] {
  if (p.poly) return p.poly;
  const [x0, z0, x1, z1] = p.rect;
  if (p.shape === 'box')
    return [
      [x0, z0],
      [x0, z1],
      [x1, z1],
      [x1, z0],
    ];
  if (p.shape === 'drum') {
    const [cx, cz, r] = [(x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2];
    return Array.from({ length: sides }, (_, k) => {
      const a = (-2 * Math.PI * k) / sides;
      return [cx + Math.cos(a) * r, cz + Math.sin(a) * r] as Pt;
    });
  }
  const c = Math.min(x1 - x0, z1 - z0) * CUT;
  return [
    [x0 + c, z0],
    [x0, z0 + c],
    [x0, z1 - c],
    [x0 + c, z1],
    [x1 - c, z1],
    [x1, z1 - c],
    [x1, z0 + c],
    [x1 - c, z0],
  ];
}

/** An upright wall from a to c, y0 to y1, facing out of an outline wound counter-clockwise, its band laid on from u0 */
function wall(b: Batch, band: Band, a: Pt, c: Pt, y0: number, y1: number, u0: number) {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  // Outward: along an outline wound as the blocks are ((x0, z0), (x0, z1), (x1, z1), ...) the inside is on the right
  const n: Pt = [-(c[1] - a[1]) / len, (c[0] - a[0]) / len];
  const pieces = Math.max(1, Math.ceil(len / SPAN));
  for (let k = 0; k < pieces; k++) {
    const t0 = k / pieces;
    const t1 = (k + 1) / pieces;
    const p: Pt = [a[0] + (c[0] - a[0]) * t0, a[1] + (c[1] - a[1]) * t0];
    const q: Pt = [a[0] + (c[0] - a[0]) * t1, a[1] + (c[1] - a[1]) * t1];
    const ua = u0 + (len * t0) / band.tw;
    const ub = u0 + (len * t1) / band.tw;
    for (let ya = y0; ya < y1 - 0.01; ya += band.th) {
      const yb = Math.min(y1, ya + band.th);
      const vb = band.v0 + ((yb - ya) / band.th) * band.vh;
      const g = new THREE.BufferGeometry();
      // (wound to face n: seen from outside, p is on the left of q)
      g.setAttribute('position', new THREE.Float32BufferAttribute([p[0], ya, p[1], q[0], ya, q[1], q[0], yb, q[1], p[0], yb, p[1]], 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute([n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1]], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([ua, band.v0, ub, band.v0, ub, vb, ua, vb], 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      b.add(g, ATLAS.mat);
    }
  }
}
/** Every wall round an outline, the band continuing round the corners */
function walls(b: Batch, band: Band, line: Pt[], y0: number, y1: number, u0 = 0) {
  let u = u0;
  line.forEach((a, i) => {
    const c = line[(i + 1) % line.length];
    wall(b, band, a, c, y0, y1, u);
    u += Math.hypot(c[0] - a[0], c[1] - a[1]) / band.tw;
  });
}
/** A flat polygon at y facing up (a roof) */
function flat(b: Batch, line: Pt[], y: number, mat: THREE.Material) {
  const shape = new THREE.Shape(line.map(([x, z]) => new THREE.Vector2(x, -z)));
  b.add(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, y, 0), mat);
}
/** An outline shrunk towards its middle by d */
function shrink(line: Pt[], d: number): Pt[] {
  const cx = line.reduce((a, p) => a + p[0], 0) / line.length;
  const cz = line.reduce((a, p) => a + p[1], 0) / line.length;
  return line.map(([x, z]) => {
    const l = Math.hypot(x - cx, z - cz) || 1;
    return [x - ((x - cx) / l) * d, z - ((z - cz) / l) * d];
  });
}
/** A thin bar along an outline's edges at y (a parapet's cap, a lit band), `t` thick and `h` high */
function rim(b: Batch, line: Pt[], y: number, t: number, h: number, mat: THREE.Material) {
  line.forEach((a, i) => {
    const c = line[(i + 1) % line.length];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const g = new THREE.BoxGeometry(len + t, h, t)
      .rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0]))
      .translate((a[0] + c[0]) / 2, y + h / 2, (a[1] + c[1]) / 2);
    b.add(g, mat);
  });
}

/* ---------- The towers ---------- */

const ROOF = toon('#3a3550');
const PARAPET = toon('#5a5478');
const GOLD = toon('#b8892e');
const STEEL = toon('#8f93ad');
const DARK = toon('#1b1830');
const CANOPY = toon('#2a2740');
const SOFFIT = toon('#d9d2c2');
const STONE_COL = toon('#d8ccb0');
const STONE_DARK = toon('#8f8576');
const DOWNLIGHT = neon('#fff1d0', 0.4, 1.4);
const LANTERN = neon('#ffd98a', 0.3, 1.4);
const VESTIBULE = toon('#9ec9e6');
const CANOPY_GLASS = toon('#c6e2f2');
const DOOR_GLASS = toon('#7b8fc4');
const PLANTER = toon('#4a4660');
const SHRUB = toon('#2f6a3c');
const FLAGPOLE = toon('#c8cce0');
const FLAGS = [toon('#1c2a55'), toon('#8000ff'), toon('#f3f2f7'), toon('#00a9c8')];
const FIN = toon('#c8cce0');
const LEDGE = toon('#8f93ad');
const PIER = toon('#3a364c');
const PAD = toon('#2a2740');
const PAD_MARK = toon('#f2c94c');
const PAD_LIGHT = neon('#33ff88', 0.2, 1.6);
/** Lit trims: a slab's band, a deco tower's gold edges, a drum's ring, the spire's lantern; warning lights at the tips */
const TRIM: Record<Skin, THREE.Material> = {
  blue: neon('#5fd4ff', 0.15, 2.4),
  gold: neon('#ffd27a', 0.15, 2.4),
  black: neon('#ff4fd8', 0.15, 2.4),
  silver: neon('#b4a8ff', 0.15, 2.4),
  stone: neon('#ffd27a', 0.15, 2.4),
};
const WARNING = neon('#ff2a2a', 0.3, 2.4);

/** A tower: its parts' walls and roofs, its crown, its mast and light, its lobby */
function tower(b: Batch, t: Highrise, low: boolean) {
  const trim = TRIM[t.skin];
  b.detail(() => {
    t.parts.forEach((p, i) => {
      const line = outline(p, low ? 14 : SIDES);
      if (p.skin === 'podium') podium(b, t, p);
      else if (i === 0 && (t.design === 'flatiron' || t.design === 'spire')) {
        // A ground floor of its own: the flatiron's shops (a storey over them in its stone), the spire's glazed foot
        const g = t.design === 'flatiron' ? GROUND.h : PODIUM.h;
        walls(b, t.design === 'flatiron' ? ATLAS.shops : ATLAS.atrium, line, SLAB, SLAB + g);
        walls(b, ATLAS.skin[p.skin as Skin], line, SLAB + g, SLAB + p.y1, i * 0.37);
      } else walls(b, ATLAS.skin[p.skin as Skin], line, SLAB + p.y0, SLAB + p.y1, i * 0.37);
      // The roof tucked just under the parapet's cap, the parapet round it
      flat(b, shrink(line, 0.006), SLAB + p.y1 - 0.02, ROOF);
      // (its outer face a centimetre proud of the wall under it: never flush)
      rim(b, shrink(line, 0.07), SLAB + p.y1 - 0.02, 0.16, 0.3, PARAPET);
    });
    const top = t.parts.filter((p) => p.y1 === t.roof).at(-1)!;
    const [x0, z0, x1, z1] = top.rect;
    // (a prism's middle is its outline's, not its bounds')
    const [cx, cz] = top.poly ? [top.poly.reduce((a, p) => a + p[0], 0) / top.poly.length, top.poly.reduce((a, p) => a + p[1], 0) / top.poly.length] : [(x0 + x1) / 2, (z0 + z1) / 2];
    const R = SLAB + t.roof;
    const shafts = t.parts.filter((p) => p.skin !== 'podium');
    if (t.design === 'slab') {
      // A lit band round the shaft's top, under the plant room
      const shaft = shafts[0];
      rim(b, shrink(outline(shaft), -0.03), SLAB + shaft.y1 - 0.5, 0.08, 0.08, trim);
    }
    if (t.design === 'deco') {
      // Gold edges at each setback, a gold pyramid and a finial
      for (const p of shafts) rim(b, shrink(outline(p), -0.03), SLAB + p.y1 - 0.42, 0.08, 0.08, trim);
      const half = Math.min(x1 - x0, z1 - z0) / 2;
      b.add(new THREE.ConeGeometry(half * Math.SQRT2 * 0.92, 4.4, 4, 1).rotateY(Math.PI / 4).scale((x1 - x0) / (2 * half), 1, (z1 - z0) / (2 * half)).translate(cx, R + 2.2 + 0.28, cz), GOLD);
    }
    if (t.design === 'round') {
      // A neon ring round the top and a low cap
      const r = (x1 - x0) / 2;
      b.add(new THREE.TorusGeometry(r + 0.05, 0.06, 4, low ? 14 : SIDES).rotateX(Math.PI / 2).translate(cx, R - 0.5, cz), trim);
      b.add(new THREE.ConeGeometry(r * 0.75, 1.2, low ? 14 : SIDES, 1).translate(cx, R + 0.6 + 0.28, cz), STEEL);
    }
    if (t.design === 'twin' && t.bridge) {
      // The skybridge: dark glass, a lit strip along its underside
      const { rect, y0, y1 } = t.bridge;
      b.box(rect[0], SLAB + y0, rect[1], rect[2] - rect[0], y1 - y0, rect[3] - rect[1], DARK);
      const long = rect[2] - rect[0] > rect[3] - rect[1];
      if (long) b.box(rect[0], SLAB + y0 - 0.06, (rect[1] + rect[3]) / 2 - 0.05, rect[2] - rect[0], 0.06, 0.1, trim);
      else b.box((rect[0] + rect[2]) / 2 - 0.05, SLAB + y0 - 0.06, rect[1], 0.1, 0.06, rect[3] - rect[1], trim);
      for (const s of shafts) rim(b, shrink(outline(s), -0.03), SLAB + s.y1 - 0.5, 0.08, 0.08, trim);
    }
    if (t.design === 'spire') {
      // A glass lantern on the top tier, lit edges up it, then the mast
      const s = Math.min(x1 - x0, z1 - z0);
      b.add(new THREE.CylinderGeometry(s * 0.18, s * 0.42, 3.2, 8, 1, true).rotateY(Math.PI / 8).translate(cx, R + 1.6 + 0.28, cz), STEEL);
      rim(b, shrink(outline(top), -0.03), R - 0.45, 0.08, 0.08, trim);
      for (const p of shafts) rim(b, shrink(outline(p), -0.03), SLAB + p.y1 - 0.45, 0.08, 0.08, trim);
    }
    if (t.design === 'flatiron') {
      // A gold line under the cornice, and the cornice's heavy lip round the top
      rim(b, shrink(outline(shafts[0]), -0.03), SLAB + shafts[0].y1 - 0.45, 0.08, 0.08, trim);
      rim(b, shrink(outline(shafts[1]), -0.12), SLAB + shafts[1].y1 - 0.3, 0.3, 0.3, PARAPET);
    }
    // The mast to the tip, a red light at its top
    const mastFrom = t.design === 'deco' ? R + 4.5 : t.design === 'spire' ? R + 3.3 : R + 0.28;
    const tip = SLAB + t.tip;
    b.add(new THREE.CylinderGeometry(0.06, 0.14, tip - mastFrom, 6, 1, true).translate(cx, (mastFrom + tip) / 2, cz), STEEL);
    b.add(new THREE.OctahedronGeometry(0.16, 0).translate(cx, tip + 0.08, cz), WARNING);
    // Each tower its own facade: fins, ledges or piers on its glass, a helipad on the tallest slab
    facade(b, t, low);
    if (t === HELIPAD) helipad(b, shafts.at(-1)!);
  }, 'all');

  // The lobby's door and what stands round it; the plant on the podium's roof
  entrance(b, t, low);
  if (low) return;
  b.detail(() => {
    const pod = t.parts[0];
    if (pod.skin !== 'podium') return;
    const r = rng(t.id.charCodeAt(0) * 31 + t.id.charCodeAt(1));
    const [px0, pz0, px1, pz1] = pod.rect;
    const shaftsR = t.parts.slice(1).map((p) => p.rect);
    for (let k = 0; k < 6; k++) {
      const x = px0 + 0.8 + r() * (px1 - px0 - 1.6);
      const z = pz0 + 0.8 + r() * (pz1 - pz0 - 1.6);
      if (shaftsR.some((q) => x > q[0] - 1.2 && x < q[2] + 1.2 && z > q[1] - 1.2 && z < q[3] + 1.2)) continue;
      // (nor on a restaurant terrace: boulevard.ts)
      if (ROOF_TERRACES.some(({ rect: q }) => x > q[0] - 0.8 && x < q[2] + 0.8 && z > q[1] - 0.8 && z < q[3] + 0.8)) continue;
      b.box(x - 0.5, SLAB + PODIUM.h, z - 0.4, 1.0, 0.6, 0.8, STEEL);
    }
  });
}

/* ---------- The podiums and their lobbies ---------- */

type Face = Highrise['front'];
const OPPOSITE: Record<Face, Face> = { n: 's', s: 'n', e: 'w', w: 'e' };
/** A box's four sides as walls, wound as the blocks are (west, south, east, north), each with the way it faces */
function sides([x0, z0, x1, z1]: Rect): { f: Face; a: Pt; c: Pt }[] {
  return [
    { f: 'w', a: [x0, z0], c: [x0, z1] },
    { f: 's', a: [x0, z1], c: [x1, z1] },
    { f: 'e', a: [x1, z1], c: [x1, z0] },
    { f: 'n', a: [x1, z0], c: [x0, z0] },
  ];
}
/** Its outward normal (a side wound as the blocks are) */
const normalOf = (a: Pt, c: Pt): Pt => {
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
  return [-(c[1] - a[1]) / l, (c[0] - a[0]) / l];
};
/** What a podium's side is: its lobby's front, its back (service), or a side (shops, or glass with an atrium) */
function podium(b: Batch, t: Highrise, p: Part) {
  const G = SLAB + GROUND.h;
  const H = SLAB + PODIUM.h;
  for (const { f, a, c } of sides(p.rect)) {
    if (f === OPPOSITE[t.front]) {
      wall(b, ATLAS.service, a, c, SLAB, H, 0);
      continue;
    }
    if (f !== t.front) {
      if (t.lobby === 'atrium' || t.lobby === 'arcade') wall(b, ATLAS.atrium, a, c, SLAB, H, 0);
      else {
        wall(b, ATLAS.shops, a, c, SLAB, G, 0);
        wall(b, ATLAS.ribbon, a, c, G, H, 0);
      }
      continue;
    }
    if (t.lobby === 'atrium') {
      wall(b, ATLAS.atrium, a, c, SLAB, H, 0);
      continue;
    }
    if (t.lobby === 'retail') {
      wall(b, ATLAS.shops, a, c, SLAB, G, 0);
      wall(b, ATLAS.ribbon, a, c, G, H, 0);
      continue;
    }
    // A colonnade or an arcade: the ground floor set back behind its columns, the storey over it on the front's line
    const foot = sides(p.foot!).find((q) => q.f === f)!;
    wall(b, ATLAS.bronze, foot.a, foot.c, SLAB, G, 0);
    wall(b, ATLAS.ribbon, a, c, G, H, 0);
    // The soffit over the walk, lit by downlights
    const [x0, z0, x1, z1] = [Math.min(a[0], c[0], foot.a[0], foot.c[0]), Math.min(a[1], c[1], foot.a[1], foot.c[1]), Math.max(a[0], c[0], foot.a[0], foot.c[0]), Math.max(a[1], c[1], foot.a[1], foot.c[1])];
    b.box(x0, G - 0.06, z0, x1 - x0, 0.06, z1 - z0, SOFFIT);
    // The columns: square stone ones with gold capitals for a colonnade, round ones for an arcade
    for (const [x, z] of t.columns) {
      const w = GROUND.col;
      if (t.lobby === 'colonnade') {
        b.box(x - w / 2, SLAB, z - w / 2, w, GROUND.h - 0.06, w, STONE_COL);
        b.box(x - w / 2 - 0.05, SLAB, z - w / 2 - 0.05, w + 0.1, 0.18, w + 0.1, STONE_DARK);
        b.box(x - w / 2 - 0.06, G - 0.24, z - w / 2 - 0.06, w + 0.12, 0.16, w + 0.12, GOLD);
      } else b.add(new THREE.CylinderGeometry(w / 2, w / 2, GROUND.h - 0.06, 12, 1, true).translate(x, SLAB + (GROUND.h - 0.06) / 2, z), STONE_COL);
    }
    b.detail(() => {
      const n = normalOf(a, c);
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const mid: Pt = [(a[0] + foot.a[0]) / 2, (a[1] + foot.a[1]) / 2];
      for (let d = 0.9; d < len - 0.5; d += 1.7) {
        const u: Pt = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
        const [x, z] = [mid[0] + u[0] * d - n[0] * 0.05, mid[1] + u[1] * d - n[1] * 0.05];
        b.box(x - 0.12, G - 0.075, z - 0.12, 0.24, 0.015, 0.24, DOWNLIGHT);
      }
    });
  }
}

/** The shops' names: one small atlas, a row each (fixed made-up copy) */
const SHOP_NAMES = ['ATELIER NOIR', 'NORTH & PINE', 'GILT', 'MAISON LUNE', 'BREW BAR', 'PAPER & INK', 'BLOOM', 'THE TAILOR', 'OPTIKA', 'TIDE WINES', 'SALT BAKERY', 'CASHMERE CO'];
const SHOP_SIGNS = (() => {
  const tex = canvasTex(256, 32 * SHOP_NAMES.length, (c) => {
    SHOP_NAMES.forEach((n, i) => {
      const y = i * 32;
      c.fillStyle = '#14121f';
      c.fillRect(0, y, 256, 32);
      c.fillStyle = ['#f3e2b0', '#ffffff', '#9fe8ff', '#ffc9e4'][i % 4];
      c.font = `700 20px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(n, 128, y + 17);
    });
  });
  return siteMat('uptown-shops', lit(new THREE.MeshBasicMaterial({ map: tex, color: '#ffffff' }), 0.9, 1.25));
})();
const AWNINGS = [toon('#1c2a55'), toon('#5a1f2e'), toon('#2b4a3a'), toon('#3a364c'), toon('#8a6a3c')];

/** Each shop along a wall of shops (the band's two to a repeat, from the wall's start): its awning and its name over the window (near) */
function shopfronts(b: Batch, a: Pt, c: Pt, seed: number, skip?: Pt) {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const u: Pt = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
  const n = normalOf(a, c);
  const shop = GROUND_W / 2;
  const ry = Math.atan2(n[0], n[1]);
  for (let i = 0; (i + 1) * shop <= len + 0.01; i++) {
    const d = i * shop + 1.0;
    const [x, z] = [a[0] + u[0] * d, a[1] + u[1] * d];
    if (skip && Math.hypot(x - skip[0], z - skip[1]) < 1.9) continue;
    const k = (seed + i * 7) % SHOP_NAMES.length;
    // The name on the fascia
    const g = new THREE.PlaneGeometry(1.7, 0.28);
    const uv = g.attributes.uv;
    for (let v = 0; v < uv.count; v++) uv.setY(v, 1 - (k + 1 - uv.getY(v)) / SHOP_NAMES.length);
    b.add(g.rotateY(ry).translate(x + n[0] * 0.012, SLAB + GROUND.h - 0.2, z + n[1] * 0.012), SHOP_SIGNS);
    // A sloping awning over the window
    b.add(new THREE.BoxGeometry(1.8, 0.035, 0.75).rotateX(0.32).rotateY(ry).translate(x + n[0] * 0.36, SLAB + GROUND.h - 0.48, z + n[1] * 0.36), AWNINGS[(seed + i) % AWNINGS.length]);
  }
}

/** The way in: by its lobby's design, and what stands round it */
function entrance(b: Batch, t: Highrise, low: boolean) {
  const [dx, dz] = t.door;
  const across = t.front === 'n' || t.front === 's';
  const out = t.front === 'n' || t.front === 'w' ? -1 : 1;
  const pod = t.parts[0];
  const face = t.front === 'n' ? pod.rect[1] : t.front === 's' ? pod.rect[3] : t.front === 'w' ? pod.rect[0] : pod.rect[2];
  // (a point `o` out from the front's line, `a` along it from the door)
  const at = (o: number, a = 0): Pt => (across ? [dx + a, face + out * o] : [face + out * o, dz + a]);
  const boxAt = (o0: number, o1: number, a0: number, a1: number, y0: number, y1: number, mat: THREE.Material) => {
    const [p, q] = [at(Math.min(o0, o1), Math.min(a0, a1)), at(Math.max(o0, o1), Math.max(a0, a1))];
    b.box(Math.min(p[0], q[0]), y0, Math.min(p[1], q[1]), Math.abs(q[0] - p[0]) || 0.01, y1 - y0, Math.abs(q[1] - p[1]) || 0.01, mat);
  };
  const revolving = (o: number) => {
    const [rx, rz] = at(o);
    b.add(new THREE.CylinderGeometry(0.62, 0.62, 2.1, 12, 1, true).translate(rx, SLAB + 1.05, rz), DOOR_GLASS);
    b.add(new THREE.CylinderGeometry(0.68, 0.68, 0.12, 12).translate(rx, SLAB + 2.16, rz), GOLD);
  };
  b.detail(() => {
    if (t.lobby === 'atrium') {
      // A glass vestibule out from the atrium under a thin glass canopy on steel
      boxAt(0, 0.7, -1.4, 1.4, SLAB, SLAB + 2.4, VESTIBULE);
      boxAt(0, 0.72, -1.42, 1.42, SLAB + 2.4, SLAB + 2.5, STEEL);
      boxAt(0, 2.2, -2.6, 2.6, SLAB + 2.95, SLAB + 3.0, CANOPY_GLASS);
      boxAt(2.12, 2.2, -2.6, 2.6, SLAB + 2.9, SLAB + 2.95, TRIM[t.skin]);
    } else if (t.lobby === 'retail') {
      // A narrow canopy over the lobby's door between the shops
      boxAt(0, 1.5, -1.4, 1.4, SLAB + 2.38, SLAB + 2.5, CANOPY);
      boxAt(1.44, 1.5, -1.4, 1.4, SLAB + 2.35, SLAB + 2.39, TRIM[t.skin]);
    } else if (t.lobby === 'pavilion') {
      // The spire's glass pavilion out from its foot, a flat roof over it lit along its edge
      const line: Pt[] = [at(0, -2.6), at(2.4, -2.6), at(2.4, 2.6), at(0, 2.6)];
      const ccw = line.slice().reverse();
      // (wound as the blocks are: the inside on the right going round, a negative area)
      const area = line.reduce((s, p, i) => s + p[0] * line[(i + 1) % 4][1] - line[(i + 1) % 4][0] * p[1], 0);
      walls(b, ATLAS.atrium, area < 0 ? line : ccw, SLAB, SLAB + 2.8);
      boxAt(-0.1, 2.6, -2.8, 2.8, SLAB + 2.8, SLAB + 2.95, STEEL);
      boxAt(2.54, 2.6, -2.8, 2.8, SLAB + 2.75, SLAB + 2.8, TRIM[t.skin]);
    }
  }, 'all');
  b.detail(() => {
    // The revolving door: in the vestibule's front, the pavilion's or the shops' door (a colonnade's doors are its bronze ones)
    if (t.lobby !== 'colonnade' && t.lobby !== 'arcade') revolving(t.lobby === 'atrium' ? 0.7 : t.lobby === 'pavilion' ? 2.4 : 0.62);
    // Bronze lanterns either side of a colonnade's doors, on the wall behind the columns
    else for (const s of [-1, 1]) boxAt(-GROUND.recess + 0.01, -GROUND.recess + 0.2, s * 1.2 - 0.1, s * 1.2 + 0.1, SLAB + 1.6, SLAB + 1.95, LANTERN);
    if (low) return;
    // Planters either side of the way in, clipped shrubs in them
    const half = t.lobby === 'pavilion' ? 3.4 : 2.2;
    for (const s of [-1, 1]) {
      const o = t.lobby === 'pavilion' ? 1.2 : 0.9;
      boxAt(o - 0.35, o + 0.35, s * half - 0.45, s * half + 0.45, SLAB, SLAB + 0.5, PLANTER);
      const [px, pz] = at(o, s * half);
      b.add(new THREE.IcosahedronGeometry(0.42, 0).scale(1, 0.8, 1).translate(px, SLAB + 0.78, pz), SHRUB);
    }
    // Flags out front of an atrium tower
    if (t.lobby === 'atrium')
      for (const k of [-1, 0, 1]) {
        const [fx, fz] = at(2.6, 3.6 + k * 0.7);
        b.add(new THREE.CylinderGeometry(0.03, 0.04, 4.2, 6, 1, true).translate(fx, SLAB + 2.1, fz), FLAGPOLE);
        const flag = new THREE.BoxGeometry(0.9, 0.55, 0.02).translate(0.47, 0, 0);
        b.add(flag.rotateY(across ? 0 : Math.PI / 2).translate(fx, SLAB + 3.75, fz), FLAGS[(k + 1 + t.id.length) % FLAGS.length]);
      }
    // Shops: their awnings and names (the podium's sides with shops, and its front if it's retail)
    const pod = t.parts[0];
    if (pod.skin === 'podium' && (t.lobby === 'retail' || t.lobby === 'colonnade'))
      for (const { f, a, c } of sides(pod.rect)) {
        if (f === OPPOSITE[t.front]) continue;
        if (f === t.front && t.lobby !== 'retail') continue;
        shopfronts(b, a, c, t.id.charCodeAt(1) + t.id.charCodeAt(2) * 3 + f.charCodeAt(0), f === t.front ? t.door : undefined);
      }
    // The flatiron's shops all round its foot
    if (t.design === 'flatiron') {
      const line = t.parts[0].poly!;
      line.forEach((a, i) => {
        const c = line[(i + 1) % line.length];
        if (Math.hypot(c[0] - a[0], c[1] - a[1]) > 3) shopfronts(b, a, c, i * 5 + 3, t.door);
      });
    }
  });
}

/* ---------- Each tower its own facade ---------- */

/** The tallest slab carries a helipad on its plant room */
const HELIPAD = HIGHRISES.filter((t) => t.design === 'slab').sort((p, q) => q.roof - p.roof)[0];
/** Fins, ledges or piers on a tower's glass: which, by its name (the deco's stone and the flatiron keep their own) */
function facade(b: Batch, t: Highrise, low: boolean) {
  const kind = (t.id.charCodeAt(1) * 7 + t.id.charCodeAt(2) * 3) % 3;
  for (const p of t.parts) {
    if (p.skin === 'podium' || p.skin === 'stone' || p.y1 - p.y0 < 6) continue;
    const line = outline(p, low ? 14 : SIDES);
    if (p.shape === 'drum' || p.shape === 'oct') {
      // Ledges round it every four floors
      if (kind === 2) continue;
      for (let y = p.y0 + 4; y < p.y1 - 1; y += 4) rim(b, shrink(line, -0.05), SLAB + y - 0.06, 0.12, 0.06, LEDGE);
      continue;
    }
    if (kind === 0) {
      // Vertical fins down every face, a bay and a half apart
      line.forEach((a, i) => {
        const c = line[(i + 1) % line.length];
        const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
        const n = normalOf(a, c);
        const k = Math.max(1, Math.round(len / 1.5));
        for (let j = 1; j < k; j++) {
          const f = j / k;
          const [x, z] = [a[0] + (c[0] - a[0]) * f + n[0] * 0.13, a[1] + (c[1] - a[1]) * f + n[1] * 0.13];
          b.add(new THREE.BoxGeometry(0.06, p.y1 - p.y0 - 0.4, 0.24).rotateY(Math.atan2(n[0], n[1])).translate(x, SLAB + (p.y0 + p.y1) / 2 - 0.1, z), FIN);
        }
      });
    } else if (kind === 1) {
      // Ledges every four floors
      for (let y = p.y0 + 4; y < p.y1 - 1; y += 4) rim(b, shrink(line, -0.05), SLAB + y - 0.06, 0.12, 0.06, LEDGE);
    } else {
      // Piers up the corners, a band at the top
      for (const [x, z] of line) b.box(x - 0.22, SLAB + p.y0, z - 0.22, 0.44, p.y1 - p.y0 - 0.1, 0.44, PIER);
    }
  }
}
/** A helipad on a slab's plant room: a marked square, its lit edge */
function helipad(b: Batch, top: Part) {
  const [x0, z0, x1, z1] = top.rect;
  const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  const s = Math.min(x1 - x0, z1 - z0) / 2 - 0.15;
  const y = SLAB + top.y1 + 0.06;
  b.box(cx - s, y - 0.06, cz - s, s * 2, 0.06, s * 2, PAD);
  b.add(new THREE.RingGeometry(s * 0.62, s * 0.72, 24).rotateX(-Math.PI / 2).translate(cx, y + 0.004, cz), PAD_MARK);
  for (const [w, d, ox] of [[0.14, s * 0.7, -s * 0.22], [0.14, s * 0.7, s * 0.22], [s * 0.44, 0.14, 0]] as [number, number, number][]) b.box(cx + ox - w / 2, y, cz - d / 2, w, 0.005, d, PAD_MARK);
  rim(b, [[cx - s, cz - s], [cx - s, cz + s], [cx + s, cz + s], [cx + s, cz - s]], y - 0.02, 0.06, 0.05, PAD_LIGHT);
}

/** Each tower a site (its lot) */
export function registerHighrises(low: boolean) {
  for (const t of HIGHRISES) {
    const [x0, z0, x1, z1]: Rect = t.lot;
    site(`uptown tower ${t.id}`, [x0 - 1, z0 - 1, x1 + 1, z1 + 1], (into) => {
      const b = new Batch();
      tower(b, t, low);
      b.build(into, { cast: true, receive: true });
    });
  }
}
