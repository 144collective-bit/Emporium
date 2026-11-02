/*
 * The Neon Mile's resorts drawn (docs/strip-plan.md Phase 2; the data is resorts.ts), in the Strip's chunk
 * (strip3d.ts's `register()`): each resort two sites, its shell (walls from the Strip's own curtain-wall atlas, roofs,
 * the pyramid's slopes, cones, the saucer) and its dressing (the pylon with its LED screen and its name in neon, the
 * porte-cochère, the pool deck, the trims, the theme's own pieces); Big City's rollercoaster a site; and on the main
 * thread the water, the cars under the porte-cochères, the coaster's train, the cowboy's arm, the chasing bulbs, the
 * pyramid's beam and the LED screens' slides.
 *
 * Paint: the atlas `strip-glass` (a band a skin, four floors to a band for the hotels, lit windows from its light map
 * at night), the signs `strip-signs` (fixed made-up copy: the names, VALET, THE SPHERE), the LED faces `strip-led`
 * (made-up slides: the names, stars, card suits, shows; never a number, never a real brand), and the shared toon and
 * neon. Details near only; phones leave out the finest (loungers, flags, rocks, bulbs on the walls).
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, fx, lit, moving, neon, rng, siteMat, toon } from './kit';
import { site } from './tilework';
import { SLAB, waterMat, type Tick } from './world';
import { parkedCars } from './cars';
import { crown, trunk } from './palms3d';
import { SWAY } from './dusk';
import {
  BIG_CITY,
  COASTER_SAMPLES,
  DRAWBRIDGE,
  GONDOLIER,
  LAGOON,
  ORBIT,
  RESORTS,
  RIM,
  SCARAB,
  WILD_ACE,
  coasterAt,
  portePosts,
  POST,
  type Part,
  type Resort,
  type Skin,
} from './resorts';
import type { Rect } from './strip';

type Pt = [number, number];
type V3 = [number, number, number];

/* ---------- The curtain-wall atlas ---------- */

/** A band's height in pixels and the floors it holds (the hotels'), its width in bays */
const W_PX = 512;
const BAND_PX = 128;
const ROWS = 4;
const BAY = 1;
const COLS = 8;
/** A skin's band: where it lies in the atlas (v), and how much wall one repeat of it covers (tw across, th up) */
interface Band {
  v0: number;
  vh: number;
  tw: number;
  th: number;
}
/** Every band: a skin with lit windows (`<skin>`) or plain (`<skin>-p`), and the wall a repeat covers */
const BANDS: { key: string; tw: number; th: number }[] = [
  { key: 'gold', tw: BAY * COLS, th: ROWS },
  { key: 'blue', tw: BAY * COLS, th: ROWS },
  { key: 'dark', tw: BAY * COLS, th: ROWS },
  { key: 'silver', tw: BAY * COLS, th: ROWS },
  { key: 'cream', tw: BAY * COLS, th: ROWS },
  { key: 'brick', tw: BAY * COLS, th: ROWS },
  { key: 'red-p', tw: 6, th: 4.5 },
  { key: 'white-p', tw: 8, th: 5 },
  { key: 'castle-p', tw: 6, th: 3 },
  { key: 'brick-p', tw: 8, th: 5 },
  { key: 'silver-p', tw: 4, th: 2.5 },
  { key: 'ochre-p', tw: 8, th: 7 },
  { key: 'bronze-p', tw: 8, th: 5 },
];
const GLASS: Record<string, [string, string, string]> = {
  // (glass, its frames, the spandrels between floors)
  gold: ['#c9993c', '#7a5a1e', '#e8c56a'],
  blue: ['#3a6ea8', '#1f3554', '#8fb4dd'],
  dark: ['#232035', '#0f0d18', '#3a3452'],
  silver: ['#8d97ab', '#4f5668', '#d4d9e4'],
};
const WARM = ['#ffd9a0', '#ffe8c2', '#fff3d6', '#ffcf8a'];
function windowBand(c: CanvasRenderingContext2D, key: string, y0: number, glow: boolean, seed: number) {
  const r = rng(seed);
  const fy = BAND_PX / ROWS;
  const fx = W_PX / COLS;
  if (GLASS[key]) {
    const [glass, frame, spandrel] = GLASS[key];
    c.fillStyle = glow ? '#000' : glass;
    c.fillRect(0, y0, W_PX, BAND_PX);
    for (let row = 0; row < ROWS; row++) {
      const y = y0 + row * fy;
      for (let col = 0; col < COLS; col++) {
        const x = col * fx;
        if (glow) {
          // (about two windows in three lit, warm)
          if (r() < 0.62) {
            c.fillStyle = WARM[Math.floor(r() * WARM.length)];
            c.fillRect(x + 3, y + 5, fx - 6, fy - 11);
          }
          continue;
        }
        // A pale glint down one side of each pane
        c.fillStyle = 'rgba(255,255,255,0.12)';
        c.fillRect(x + 4, y + 5, 6, fy - 11);
        c.fillStyle = frame;
        c.fillRect(x, y, 2, fy);
      }
      if (!glow) {
        c.fillStyle = spandrel;
        c.fillRect(0, y + fy - 6, W_PX, 5);
      }
    }
    return;
  }
  // Stucco or brick with punched windows
  const wall = key === 'cream' ? '#efe2c4' : '#9a4a36';
  c.fillStyle = glow ? '#000' : wall;
  c.fillRect(0, y0, W_PX, BAND_PX);
  if (!glow && key === 'brick') {
    c.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = y0; y < y0 + BAND_PX; y += 6) c.fillRect(0, y, W_PX, 1);
  }
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++) {
      const [x, y] = [col * fx + 14, y0 + row * fy + 7];
      const [w, h] = [fx - 28, fy - 14];
      if (glow) {
        if (r() < 0.6) {
          c.fillStyle = WARM[Math.floor(r() * WARM.length)];
          c.fillRect(x, y, w, h);
        }
        continue;
      }
      c.fillStyle = key === 'cream' ? '#c9b48a' : '#6e3326';
      c.fillRect(x - 3, y - 3, w + 6, h + 6);
      c.fillStyle = '#2c3348';
      c.fillRect(x, y, w, h);
      c.fillStyle = 'rgba(255,255,255,0.14)';
      c.fillRect(x + 2, y + 2, 5, h - 4);
    }
}
function plainBand(c: CanvasRenderingContext2D, key: string, y0: number, glow: boolean) {
  const H = BAND_PX;
  const fill = (col: string) => {
    c.fillStyle = glow ? '#000' : col;
    c.fillRect(0, y0, W_PX, H);
  };
  if (key === 'red-p') {
    // Wild Ace's walls: red panels between gold pilasters, a frieze of diamonds at the top
    fill('#b8243a');
    if (glow) return;
    for (let x = 0; x < W_PX; x += 128) {
      c.fillStyle = '#e8b83a';
      c.fillRect(x, y0, 10, H);
      c.fillStyle = '#9a1c30';
      c.fillRect(x + 22, y0 + 24, 84, H - 44);
    }
    c.fillStyle = '#ffd25a';
    for (let x = 16; x < W_PX; x += 32) {
      c.beginPath();
      c.moveTo(x, y0 + 4);
      c.lineTo(x + 8, y0 + 12);
      c.lineTo(x, y0 + 20);
      c.lineTo(x - 8, y0 + 12);
      c.fill();
    }
    return;
  }
  if (key === 'white-p') {
    // Orbit's podium: white panels and a ribbon of glass round it, lit at night
    fill('#eef0f6');
    c.fillStyle = glow ? '#bfe8ff' : '#3b5a7e';
    c.fillRect(0, y0 + 50, W_PX, 34);
    if (glow) return;
    c.fillStyle = 'rgba(0,0,0,0.08)';
    for (let x = 0; x < W_PX; x += 64) c.fillRect(x, y0, 2, H);
    return;
  }
  if (key === 'castle-p') {
    // Dragonspire's stone: courses of pale blocks, arrow slits
    fill('#e9dfe8');
    if (glow) {
      c.fillStyle = '#ffcf8a';
      for (let x = 60; x < W_PX; x += 170) c.fillRect(x, y0 + 46, 8, 30);
      return;
    }
    c.fillStyle = 'rgba(80,60,100,0.18)';
    for (let row = 0; row < 8; row++) {
      const y = y0 + row * 16;
      c.fillRect(0, y, W_PX, 2);
      for (let x = (row % 2) * 24; x < W_PX; x += 48) c.fillRect(x, y, 2, 16);
    }
    c.fillStyle = '#3b3550';
    for (let x = 60; x < W_PX; x += 170) c.fillRect(x, y0 + 46, 8, 30);
    return;
  }
  if (key === 'brick-p') {
    fill('#9a4a36');
    if (glow) {
      c.fillStyle = '#ffd9a0';
      for (let x = 20; x < W_PX; x += 64) c.fillRect(x, y0 + 40, 24, 60);
      return;
    }
    c.fillStyle = 'rgba(0,0,0,0.13)';
    for (let y = y0; y < y0 + H; y += 6) c.fillRect(0, y, W_PX, 1);
    // Arched shop windows along the ground
    for (let x = 20; x < W_PX; x += 64) {
      c.fillStyle = '#e8d6b0';
      c.fillRect(x - 4, y0 + 36, 32, 68);
      c.fillStyle = '#2c3348';
      c.beginPath();
      c.moveTo(x, y0 + 100);
      c.lineTo(x, y0 + 52);
      c.arc(x + 12, y0 + 52, 12, Math.PI, 0);
      c.lineTo(x + 24, y0 + 100);
      c.fill();
    }
    return;
  }
  if (key === 'silver-p') {
    fill('#c8ccd8');
    if (glow) return;
    c.fillStyle = '#8d93a6';
    for (let x = 0; x < W_PX; x += 32) c.fillRect(x, y0, 4, H);
    return;
  }
  if (key === 'ochre-p') {
    // The Gondolier's palace front: an arcade of round arches on columns, a loggia of pointed arches over it, and a
    // diamond pattern in pink and white above, under a white cornice
    fill('#e7c9a4');
    const arches = 4;
    const bay = W_PX / arches;
    if (glow) {
      c.fillStyle = '#ffcf8a';
      for (let k = 0; k < arches; k++) {
        c.fillRect(k * bay + 20, y0 + 84, bay - 40, 40);
        c.fillRect(k * bay + 30, y0 + 52, 14, 22);
        c.fillRect(k * bay + bay - 44, y0 + 52, 14, 22);
      }
      return;
    }
    // (the diamonds)
    for (let x = 0; x < W_PX; x += 24)
      for (let y = y0 + 10; y < y0 + 44; y += 12) {
        c.fillStyle = (x / 24 + (y - y0) / 12) % 2 ? '#f3dfc6' : '#d9a98a';
        c.beginPath();
        c.moveTo(x + 12, y);
        c.lineTo(x + 24, y + 6);
        c.lineTo(x + 12, y + 12);
        c.lineTo(x, y + 6);
        c.fill();
      }
    c.fillStyle = '#fbf6ee';
    c.fillRect(0, y0, W_PX, 6);
    c.fillRect(0, y0 + 46, W_PX, 4);
    c.fillRect(0, y0 + 80, W_PX, 4);
    for (let k = 0; k < arches; k++) {
      const x = k * bay;
      // The loggia's pointed windows
      c.fillStyle = '#3a3048';
      for (const wx of [x + 30, x + bay - 44]) {
        c.beginPath();
        c.moveTo(wx, y0 + 76);
        c.lineTo(wx, y0 + 60);
        c.lineTo(wx + 7, y0 + 52);
        c.lineTo(wx + 14, y0 + 60);
        c.lineTo(wx + 14, y0 + 76);
        c.fill();
      }
      // The arcade
      c.fillStyle = '#fbf6ee';
      c.fillRect(x + 6, y0 + 84, 12, 44);
      c.fillStyle = '#4a3a3a';
      c.beginPath();
      c.moveTo(x + 22, y0 + 128);
      c.lineTo(x + 22, y0 + 108);
      c.arc(x + bay / 2 + 2, y0 + 108, bay / 2 - 20, Math.PI, 0);
      c.lineTo(x + bay - 18, y0 + 128);
      c.fill();
    }
    return;
  }
  // bronze-p: Lava Lagoon's podium, bronze glass ribbons between stone bands
  fill('#d8c3a0');
  c.fillStyle = glow ? '#ffcf8a' : '#6b4a26';
  c.fillRect(0, y0 + 24, W_PX, 36);
  c.fillRect(0, y0 + 76, W_PX, 36);
  if (glow) return;
  c.fillStyle = '#4a321a';
  for (let x = 0; x < W_PX; x += 32) {
    c.fillRect(x, y0 + 24, 2, 36);
    c.fillRect(x, y0 + 76, 2, 36);
  }
}
const ATLAS = (() => {
  const H = BANDS.length * BAND_PX;
  const draw = (glow: boolean) => (c: CanvasRenderingContext2D) => {
    BANDS.forEach((b, i) => {
      const y0 = i * BAND_PX;
      if (b.key.endsWith('-p')) plainBand(c, b.key, y0, glow);
      else windowBand(c, b.key, y0, glow, 700 + i);
    });
  };
  const map = canvasTex(W_PX, H, draw(false));
  const emissiveMap = canvasTex(W_PX / 2, H / 2, (c) => {
    c.scale(0.5, 0.5);
    draw(true)(c);
  });
  for (const t of [map, emissiveMap]) t.wrapS = THREE.RepeatWrapping;
  const mat = siteMat('strip-glass', lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff' }), 0.1, 1));
  // (canvas textures are flipped: the canvas's top row is v = 1; each band keeps a pixel off its edges)
  const bands: Record<string, Band> = {};
  BANDS.forEach((b, i) => (bands[b.key] = { v0: 1 - (i * BAND_PX + BAND_PX - 1) / H, vh: (BAND_PX - 2) / H, tw: b.tw, th: b.th }));
  return { mat, bands };
})();
const bandOf = (p: Part): Band => ATLAS.bands[p.windows ? p.skin : `${p.skin}-p`] ?? ATLAS.bands['white-p'];

/* ---------- The signs: fixed made-up copy, 32 cells of 512 x 64 ---------- */

const SIGN_CELLS: { text: string; fg: string; bg?: string }[] = [
  ...RESORTS.map((r) => ({ text: r.name.toUpperCase(), fg: r.neon[0] })),
  { text: 'VALET', fg: '#ffffff', bg: '#16141f' },
  { text: 'HOTEL', fg: '#ffd23a' },
  { text: 'THE SPHERE', fg: '#ffffff', bg: '#1a1240' },
  { text: 'THE NEON MILE', fg: '#2ef2ff' },
  { text: 'MONORAIL', fg: '#ffb21e' },
  { text: 'DOWNTOWN LINK', fg: '#ffffff', bg: '#2a1a08' },
  { text: 'NEON MILE WEST', fg: '#ffffff', bg: '#2a1a08' },
  { text: 'NEON MILE CENTRAL', fg: '#ffffff', bg: '#2a1a08' },
  { text: 'THE SPHERE · MONORAIL', fg: '#ffffff', bg: '#2a1a08' },
];
const SIGN_TEX = canvasTex(1024, 1024, (c) => {
  c.fillStyle = '#07060c';
  c.fillRect(0, 0, 1024, 1024);
  SIGN_CELLS.forEach((cell, i) => {
    const [x, y] = [(i % 2) * 512, Math.floor(i / 2) * 64];
    c.fillStyle = cell.bg ?? '#07060c';
    c.fillRect(x, y, 512, 64);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    let size = 48;
    c.font = `800 ${size}px ${FONT_DISPLAY}`;
    const w = c.measureText(cell.text).width;
    if (w > 470) {
      size = Math.floor((size * 470) / w);
      c.font = `800 ${size}px ${FONT_DISPLAY}`;
    }
    // (a glow behind the letters, then the tube)
    c.shadowColor = cell.fg;
    c.shadowBlur = 14;
    c.fillStyle = cell.fg;
    c.fillText(cell.text, x + 256, y + 34);
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.font = `800 ${size}px ${FONT_DISPLAY}`;
    c.fillText(cell.text, x + 256, y + 34);
  });
});
const SIGN = siteMat('strip-signs', lit(new THREE.MeshBasicMaterial({ map: SIGN_TEX }), 0.9, 1.5));
const cellOf = (text: string) => SIGN_CELLS.findIndex((c) => c.text === text);
const cellUV = (i: number): [number, number, number, number] => {
  const [x, y] = [(i % 2) * 512, Math.floor(i / 2) * 64];
  return [x / 1024, 1 - (y + 64) / 1024, (x + 512) / 1024, 1 - y / 1024];
};

/* ---------- The LED faces: a column of made-up slides a resort, stepped on together ---------- */

const LED_COLS = 8;
/** Slides a column: each a quarter of its height; the screens show one at a time */
const SLIDES = 4;
const SLIDE_SECONDS = 4;
const SUITS = ['♠', '♥', '♦', '♣'];
const SHOWS = ['LIVE SHOWS', 'POOL PARTY', 'GRAND BUFFET', 'STAR LOUNGE', 'MAGIC NIGHT', 'COMEDY CLUB', 'DANCE REVUE'];
const LED_TEX = canvasTex(1024, 1024, (c) => {
  const cw = 1024 / LED_COLS;
  const sh = 1024 / SLIDES;
  c.fillStyle = '#05040a';
  c.fillRect(0, 0, 1024, 1024);
  RESORTS.forEach((r, i) => {
    const x = i * cw;
    const [a, b] = r.neon;
    const words = r.name.toUpperCase().replace(/^THE /, '').split(' ');
    // 1: the name, a word a line
    let y = 0;
    const g = c.createLinearGradient(0, y, 0, y + sh);
    g.addColorStop(0, '#120a24');
    g.addColorStop(1, '#2a0e3a');
    c.fillStyle = g;
    c.fillRect(x, y, cw, sh);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    words.forEach((w, k) => {
      let size = 34;
      c.font = `800 ${size}px ${FONT_DISPLAY}`;
      const tw = c.measureText(w).width;
      if (tw > cw - 12) {
        size = Math.floor((size * (cw - 12)) / tw);
        c.font = `800 ${size}px ${FONT_DISPLAY}`;
      }
      c.fillStyle = k % 2 ? b : a;
      c.fillText(w, x + cw / 2, y + sh / 2 + (k - (words.length - 1) / 2) * 38);
    });
    // 2: card suits and stars in the resort's colours
    y = sh;
    c.fillStyle = '#0a0614';
    c.fillRect(x, y, cw, sh);
    c.font = `700 40px ${FONT_DISPLAY}`;
    SUITS.forEach((s, k) => {
      c.fillStyle = k % 2 ? a : b;
      c.fillText(s, x + (k % 2 ? cw * 0.72 : cw * 0.28), y + 50 + Math.floor(k / 2) * 80);
    });
    c.fillStyle = '#ffffff';
    c.font = `800 26px ${FONT_DISPLAY}`;
    c.fillText('★ ★ ★', x + cw / 2, y + sh - 40);
    // 3: a show
    y = sh * 2;
    c.fillStyle = a;
    c.fillRect(x, y, cw, sh);
    c.fillStyle = '#0a0614';
    c.fillRect(x + 6, y + 6, cw - 12, sh - 12);
    const show = SHOWS[i % SHOWS.length].split(' ');
    c.fillStyle = b;
    show.forEach((w, k) => {
      c.font = `800 30px ${FONT_DISPLAY}`;
      c.fillText(w, x + cw / 2, y + sh / 2 + (k - (show.length - 1) / 2) * 36 - 14);
    });
    c.fillStyle = '#ffffff';
    c.font = `700 20px ${FONT_DISPLAY}`;
    c.fillText('NIGHTLY', x + cw / 2, y + sh - 40);
    // 4: a starburst
    y = sh * 3;
    c.fillStyle = '#05040a';
    c.fillRect(x, y, cw, sh);
    for (let k = 0; k < 16; k++) {
      const t = (k / 16) * Math.PI * 2;
      c.strokeStyle = k % 2 ? a : b;
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(x + cw / 2 + Math.cos(t) * 14, y + sh / 2 + Math.sin(t) * 14);
      c.lineTo(x + cw / 2 + Math.cos(t) * (k % 2 ? 54 : 40), y + sh / 2 + Math.sin(t) * (k % 2 ? 54 : 40));
      c.stroke();
    }
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(x + cw / 2, y + sh / 2, 10, 0, Math.PI * 2);
    c.fill();
  });
});
LED_TEX.wrapT = THREE.RepeatWrapping;
const LED = siteMat('strip-led', lit(new THREE.MeshBasicMaterial({ map: LED_TEX }), 0.95, 1.05));

/* ---------- Paint ---------- */

const ROOF = toon('#4a4658');
const ROOF_LIGHT = toon('#8a8698');
const PAVING = toon('#cfc6b4');
const DRIVE = toon('#4a4752');
const STONE = toon('#e6dccb');
const DARK = toon('#16141f');
const GOLD = toon('#e2b43c');
const WHITE = toon('#f1f0f6');
const SAND = toon('#d9b97a');
const WOOD = toon('#7a5233');
const CHAIN = toon('#2b2a33');
const POOL = siteMat('strip-pool', lit(toon('#3fc7e0', { emissive: '#3fc7e0' }), 0.05, 0.55));
const RIM_MAT = toon('#ece4d6');
const LOUNGER = toon('#ffffff');
const CONE: Partial<Record<Skin, THREE.Material>> = { blue: toon('#3a7bd8'), red: toon('#d8344a'), gold: toon('#e2b43c'), teal: toon('#3fa89a') };
const SOFFIT = neon('#fff1d6', 0.35, 1.25);
const RED_LIGHT = neon('#ff2d3a', 0.8, 2.4);
/** The resorts' neon, shared per colour */
const NEON = new Map<string, THREE.Material>();
const neonOf = (c: string) => NEON.get(c) ?? (NEON.set(c, neon(c, 0.55, 2.2)), NEON.get(c)!);
/** Wild Ace's bulbs: three sets lit in turn (a chase), set by the tick */
const BULBS = [0, 1, 2].map((k) => siteMat(`strip-bulb-${k}`, new THREE.MeshBasicMaterial({ color: '#ffe9a8', toneMapped: true })));
const BULB = new THREE.IcosahedronGeometry(0.075, 0);
/** Lava Lagoon's waterfalls: a streaked texture the tick scrolls down */
const FALLS_TEX = canvasTex(64, 128, (c) => {
  c.fillStyle = '#9fe3f2';
  c.fillRect(0, 0, 64, 128);
  const r = rng(77);
  for (let k = 0; k < 40; k++) {
    c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.8)' : 'rgba(60,150,190,0.5)';
    c.fillRect(Math.floor(r() * 64), Math.floor(r() * 128), 2 + Math.floor(r() * 3), 18 + Math.floor(r() * 40));
  }
});
FALLS_TEX.wrapT = THREE.RepeatWrapping;
const FALLS = siteMat('strip-falls', lit(new THREE.MeshBasicMaterial({ map: FALLS_TEX, transparent: true, opacity: 0.9 }), 0.85, 0.9));

/* ---------- Helpers ---------- */

const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: THREE.Material) =>
  b.box(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), m);
const rectBox = (b: Batch, [x0, z0, x1, z1]: Rect, y0: number, y1: number, m: THREE.Material) => box(b, x0, y0, z0, x1, y1, z1, m);
const cyl = (b: Batch, r: number, h: number, x: number, y: number, z: number, m: THREE.Material, seg = 12, r0 = r, open = false) =>
  b.add(new THREE.CylinderGeometry(r, r0, h, seg, 1, open).translate(x, y + h / 2, z), m);
/** A square bar between two points */
function beam(b: Batch, p: V3, q: V3, th: number, m: THREE.Material) {
  const d = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
  const len = d.length();
  if (len < 1e-4) return;
  const g = new THREE.BoxGeometry(th, len, th);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  b.add(g.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2), m);
}
/** A flat plane facing n, its middle at (x, y, z) */
function pane(b: Batch, x: number, y: number, z: number, n: Pt, w: number, h: number, m: THREE.Material, off = 0.01) {
  b.add(new THREE.PlaneGeometry(w, h).rotateY(Math.atan2(n[0], n[1])).translate(x + n[0] * off, y, z + n[1] * off), m);
}
/** A sign from the atlas facing n */
function sign(b: Batch, text: string, x: number, y: number, z: number, n: Pt, w: number, h: number, off = 0.015) {
  const g = new THREE.PlaneGeometry(w, h);
  const [u0, v0, u1, v1] = cellUV(cellOf(text));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v1, u1, v1, u0, v0, u1, v0], 2));
  b.add(g.rotateY(Math.atan2(n[0], n[1])).translate(x + n[0] * off, y, z + n[1] * off), SIGN);
}
/** An LED screen facing n, showing column `col` */
function screen(b: Batch, col: number, x: number, y: number, z: number, n: Pt, w: number, h: number, off = 0.02) {
  const g = new THREE.PlaneGeometry(w, h);
  const [u0, u1] = [col / LED_COLS + 0.002, (col + 1) / LED_COLS - 0.002];
  // (a slide's height: the tick steps the texture's offset a slide at a time)
  const [v0, v1] = [1 - 1 / SLIDES, 1];
  g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v1, u1, v1, u0, v0, u1, v0], 2));
  b.add(g.rotateY(Math.atan2(n[0], n[1])).translate(x + n[0] * off, y, z + n[1] * off), LED);
}
const mat4 = (x: number, y: number, z: number, yaw = 0, s = 1, sy = s, sz = s) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(s, sy, sz));

/** A part's outline, counter-clockwise from above: wound ((x0, z0), (x0, z1), (x1, z1), ...), the inside on the right */
const SIDES = 20;
function outline(p: Part, sides = SIDES): Pt[] {
  if (p.poly) {
    // (the data's outlines run counter-clockwise in x and z: the walls want them the other way round)
    return [...p.poly].reverse();
  }
  const [x0, z0, x1, z1] = p.rect;
  if (p.shape === 'drum') {
    const [cx, cz, r] = [(x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2];
    return Array.from({ length: sides }, (_, k) => {
      const a = (-2 * Math.PI * k) / sides;
      return [cx + Math.cos(a) * r, cz + Math.sin(a) * r] as Pt;
    });
  }
  return [
    [x0, z0],
    [x0, z1],
    [x1, z1],
    [x1, z0],
  ];
}

/** The longest a wall piece runs (nothing fixed much longer than a tile) */
const SPAN = 12;
/** An upright wall from a to c, y0 to y1, its band laid on from u0, facing out of an outline wound as `outline()`'s */
function wall(b: Batch, band: Band, a: Pt, c: Pt, y0: number, y1: number, u0: number) {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (len < 1e-4) return;
  const n: Pt = [-(c[1] - a[1]) / len, (c[0] - a[0]) / len];
  const pieces = Math.max(1, Math.ceil(len / SPAN));
  for (let k = 0; k < pieces; k++) {
    const [t0, t1] = [k / pieces, (k + 1) / pieces];
    const p: Pt = [a[0] + (c[0] - a[0]) * t0, a[1] + (c[1] - a[1]) * t0];
    const q: Pt = [a[0] + (c[0] - a[0]) * t1, a[1] + (c[1] - a[1]) * t1];
    const [ua, ub] = [u0 + (len * t0) / band.tw, u0 + (len * t1) / band.tw];
    for (let ya = y0; ya < y1 - 0.01; ya += band.th) {
      const yb = Math.min(y1, ya + band.th);
      const vb = band.v0 + ((yb - ya) / band.th) * band.vh;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([p[0], ya, p[1], q[0], ya, q[1], q[0], yb, q[1], p[0], yb, p[1]], 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute([n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1]], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([ua, band.v0, ub, band.v0, ub, vb, ua, vb], 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      b.add(g, ATLAS.mat);
    }
  }
}
function walls(b: Batch, band: Band, line: Pt[], y0: number, y1: number, u0 = 0) {
  let u = u0;
  line.forEach((a, i) => {
    const c = line[(i + 1) % line.length];
    wall(b, band, a, c, y0, y1, u);
    u += Math.hypot(c[0] - a[0], c[1] - a[1]) / band.tw;
  });
}
/** A flat roof over an outline (convex), at y */
function roof(b: Batch, line: Pt[], y: number, m: THREE.Material) {
  const pos: number[] = [];
  for (let i = 1; i < line.length - 1; i++) for (const p of [line[0], line[i + 1], line[i]]) pos.push(p[0], y, p[1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // (wound to face up whichever way the outline runs)
  if (g.attributes.normal.getY(0) < 0) {
    const flip: number[] = [];
    for (let i = 0; i < pos.length; i += 9) flip.push(...pos.slice(i, i + 3), ...pos.slice(i + 6, i + 9), ...pos.slice(i + 3, i + 6));
    g.setAttribute('position', new THREE.Float32BufferAttribute(flip, 3));
    g.computeVertexNormals();
  }
  b.add(g, m);
}
/** A neon tube along an outline's top edges */
function trim(b: Batch, line: Pt[], y: number, m: THREE.Material, t = 0.07) {
  line.forEach((a, i) => {
    const c = line[(i + 1) % line.length];
    beam(b, [a[0], y, a[1]], [c[0], y, c[1]], t, m);
  });
}
/** A pyramid's four slopes from the atlas's band, in strips a band high so the band never wraps */
function pyramid(b: Batch, [x0, z0, x1, z1]: Rect, y0: number, y1: number, band: Band | null, m: THREE.Material) {
  const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  const H = y1 - y0;
  // (each slope from its base edge a to c, up to the apex: wound to face out)
  const sides: [Pt, Pt][] = [
    [
      [x0, z1],
      [x1, z1],
    ],
    [
      [x1, z1],
      [x1, z0],
    ],
    [
      [x1, z0],
      [x0, z0],
    ],
    [
      [x0, z0],
      [x0, z1],
    ],
  ];
  const at = (p: Pt, f: number): V3 => [p[0] + (cx - p[0]) * f, y0 + H * f, p[1] + (cz - p[1]) * f];
  for (const [a, c] of sides) {
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const steps = band ? Math.max(1, Math.ceil(H / band.th)) : 1;
    for (let k = 0; k < steps; k++) {
      const [fa, fb] = [k / steps, (k + 1) / steps];
      const [p0, p1, p2, p3] = [at(a, fa), at(c, fa), at(c, fb), at(a, fb)];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([...p0, ...p1, ...p2, ...p3], 3));
      if (band) {
        const [w0, w1] = [(len * (1 - fa)) / band.tw, (len * (1 - fb)) / band.tw];
        const vb = band.v0 + Math.min(1, (H * (fb - fa)) / band.th) * band.vh;
        g.setAttribute('uv', new THREE.Float32BufferAttribute([0, band.v0, w0, band.v0, (w0 + w1) / 2 + (w0 - w1) / 2, vb, (w0 - w1) / 2, vb], 2));
      }
      g.setIndex([0, 2, 1, 0, 3, 2]);
      g.computeVertexNormals();
      // (wound so its normal points out: away from the middle)
      const n = g.attributes.normal;
      const mid = [(p0[0] + p2[0]) / 2 - cx, (p0[2] + p2[2]) / 2 - cz];
      if (n.getX(0) * mid[0] + n.getZ(0) * mid[1] < 0) {
        g.setIndex([0, 1, 2, 0, 2, 3]);
        g.computeVertexNormals();
      }
      b.add(g, band ? ATLAS.mat : m);
    }
  }
}

/* ---------- The shell: every part ---------- */

function shell(b: Batch, r: Resort, low: boolean) {
  for (const p of r.parts) {
    const [x0, z0, x1, z1] = p.rect;
    const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
    const y0 = SLAB + p.y0;
    const y1 = SLAB + p.y1;
    if (p.shape === 'pyramid') {
      pyramid(b, p.rect, y0, y1, p.skin === 'dark' ? ATLAS.bands.dark : null, CONE[p.skin] ?? GOLD);
      continue;
    }
    if (p.shape === 'cone') {
      const rad = (x1 - x0) / 2;
      b.add(new THREE.ConeGeometry(rad, y1 - y0, low ? 10 : 16, 1, true).translate(cx, (y0 + y1) / 2, cz), CONE[p.skin] ?? GOLD);
      // (a gold finial)
      cyl(b, 0.05, 0.9, cx, y1 - 0.05, cz, GOLD, 6);
      continue;
    }
    if (p.shape === 'dome') {
      const rad = (x1 - x0) / 2;
      b.add(new THREE.SphereGeometry(rad, low ? 12 : 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, (y1 - y0) / rad, 1).translate(cx, y0, cz), CONE[p.skin] ?? GOLD);
      continue;
    }
    if (p.shape === 'saucer') {
      const R = (x1 - x0) / 2;
      const h = y1 - y0;
      const prof = [
        new THREE.Vector2(ORBIT.shaft * 0.95, 0),
        new THREE.Vector2(R * 0.82, h * 0.28),
        new THREE.Vector2(R, h * 0.42),
        new THREE.Vector2(R, h * 0.56),
        new THREE.Vector2(R * 0.8, h * 0.86),
        new THREE.Vector2(R * 0.42, h),
        new THREE.Vector2(0.01, h),
      ];
      b.add(new THREE.LatheGeometry(prof, low ? 24 : 40).translate(cx, y0, cz), WHITE);
      continue;
    }
    const line = outline(p);
    walls(b, bandOf(p), line, y0, y1);
    roof(b, line, y1, p.y1 > 15 ? ROOF : ROOF_LIGHT);
  }
}

/* ---------- Out front: the pylon, the porte-cochère, the pool deck, the paving ---------- */

/** The way a resort faces (towards the boulevard) */
const out = (r: Resort): Pt => [0, r.face];

function front(b: Batch, r: Resort, low: boolean) {
  const n = out(r);
  const [nc0, nc1] = [neonOf(r.neon[0]), neonOf(r.neon[1])];
  // The forecourt's paving over the lot, and the drop-off's asphalt under the porte-cochère (in two pieces: under a tile each)
  const [lx0, lz0, lx1, lz1] = r.land;
  const mx = (lx0 + lx1) / 2;
  box(b, lx0, SLAB, lz0, mx, SLAB + 0.008, lz1, PAVING);
  box(b, mx, SLAB, lz0, lx1, SLAB + 0.008, lz1, PAVING);
  rectBox(b, r.porte.rect, SLAB, SLAB + 0.016, DRIVE);

  // The pylon: a dark column with its LED screen and its name over it, both faces, neon up its edges and a crown
  if (r.id !== 'scarab') {
    const [x0, z0, x1, z1] = r.pylon.rect;
    const cx = (x0 + x1) / 2;
    const w = x1 - x0;
    const top = SLAB + r.pylon.h;
    rectBox(b, r.pylon.rect, SLAB, top - 1.4, DARK);
    // (a gold base and the name board, a little wider)
    rectBox(b, [x0 - 0.15, z0 - 0.15, x1 + 0.15, z1 + 0.15], SLAB, SLAB + 0.6, GOLD);
    rectBox(b, [x0 - 0.2, z0 - 0.1, x1 + 0.2, z1 + 0.1], top - 1.4, top, DARK);
    const [s0, s1] = r.pylon.screen;
    for (const side of [1, -1] as const) {
      const nn: Pt = [0, side];
      const fz = side > 0 ? z1 : z0;
      screen(b, r.pylon.row, cx, SLAB + (s0 + s1) / 2, fz, nn, w - 0.3, s1 - s0);
      sign(b, r.name.toUpperCase(), cx, top - 0.7, side > 0 ? z1 + 0.1 : z0 - 0.1, nn, w + 0.3, 1.1);
    }
    trim(b, [[x0 - 0.2, z0 - 0.1], [x0 - 0.2, z1 + 0.1], [x1 + 0.2, z1 + 0.1], [x1 + 0.2, z0 - 0.1]], top + 0.04, nc0);
    for (const [ex, ez] of [
      [x0, z0],
      [x0, z1],
      [x1, z1],
      [x1, z0],
    ])
      beam(b, [ex, SLAB + 0.6, ez], [ex, top - 1.4, ez], 0.06, nc1);
  }

  // The porte-cochère: a canopy on four posts, neon along its fascia, its soffit lit
  const [px0, pz0, px1, pz1] = r.porte.rect;
  const py = SLAB + r.porte.y;
  for (const [x, z] of portePosts(r.porte)) cyl(b, POST, py - SLAB, x, SLAB, z, GOLD, 10);
  box(b, px0 - 0.3, py, pz0 - 0.3, px1 + 0.3, py + 0.35, pz1 + 0.3, WHITE);
  trim(b, [[px0 - 0.32, pz0 - 0.32], [px0 - 0.32, pz1 + 0.32], [px1 + 0.32, pz1 + 0.32], [px1 + 0.32, pz0 - 0.32]], py + 0.18, nc0, 0.06);
  b.detail(() => {
    // (the soffit's light, a hair under the canopy)
    box(b, px0 + 0.2, py - 0.012, pz0 + 0.2, px1 - 0.2, py - 0.004, pz1 - 0.2, SOFFIT);
    // The valet's stand by the boulevard end of the drop-off
    const [vx, vz] = [px0 + 0.6, r.face > 0 ? pz1 - 0.6 : pz0 + 0.6];
    box(b, vx - 0.25, SLAB, vz - 0.18, vx + 0.25, SLAB + 0.95, vz + 0.18, DARK);
    sign(b, 'VALET', vx, SLAB + 0.75, vz + n[1] * 0.18, n, 0.5, 0.18);
  });

  // The pool deck on the podium's roof: paving, the pool, loungers and umbrellas
  if (r.pool) {
    const [x0, z0, x1, z1] = r.pool.rect;
    const y = SLAB + r.pool.y;
    box(b, x0 - 0.6, y, z0 - 0.6, x1 + 0.6, y + 0.02, z1 + 0.6, PAVING);
    box(b, x0, y + 0.02, z0, x1, y + 0.03, z1, POOL);
    if (!low)
      b.detail(() => {
        const ls: THREE.Matrix4[] = [];
        for (let x = x0 + 0.6; x < x1 - 0.4; x += 1.1) ls.push(mat4(x, y + 0.02, r.face > 0 ? z1 + 0.35 : z0 - 0.35));
        b.instances(new THREE.BoxGeometry(0.42, 0.14, 0.9).translate(0, 0.12, 0), LOUNGER, ls);
        for (let x = x0 + 1.1; x < x1 - 0.4; x += 2.2) {
          const z = r.face > 0 ? z1 + 0.35 : z0 - 0.35;
          cyl(b, 0.025, 1.2, x + 0.55, y, z, WHITE, 5);
          b.add(new THREE.ConeGeometry(0.6, 0.3, 8, 1, true).translate(x + 0.55, y + 1.25, z), CONE.red ?? GOLD);
        }
      });
  }

  // A name over the tower's front, high up, facing the boulevard (but Wild Ace's: its star and cowboy)
  const tower = r.parts.filter((p) => p.windows && p.shape === 'box' && p.solid !== false).sort((a, b2) => b2.y1 - a.y1)[0];
  if (tower) {
    const [x0, z0, x1, z1] = tower.rect;
    const w = Math.min(x1 - x0 - 1, 10);
    sign(b, r.name.toUpperCase(), (x0 + x1) / 2, SLAB + tower.y1 - 1.1, r.face > 0 ? z1 : z0, n, w, w / 8);
  }
  // And neon along the podium's roofline
  const podium = r.parts[0];
  if (podium.shape === 'box') trim(b, outline(podium), SLAB + podium.y1 + 0.05, nc1);
  // The door: a dark doorway with a gold frame, and its canopy light
  const { x: dx, z: dz } = r.door;
  // (the door's spot is a little in front of the wall: the doorway on the wall itself)
  pane(b, dx, SLAB + 1.1, dz - n[1] * 0.35, n, 1.6, 2.2, DARK, 0.02);
  beam(b, [dx - 0.85, SLAB + 2.25, dz - n[1] * 0.3], [dx + 0.85, SLAB + 2.25, dz - n[1] * 0.3], 0.08, GOLD);
}

/* ---------- Each resort's own ---------- */

/** A flat shape (x across, y up) standing at (x, y, z) facing n, `d` thick */
function cutout(b: Batch, pts: Pt[], x: number, y: number, z: number, n: Pt, m: THREE.Material, d = 0.06, s = 1) {
  const shape = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u * s, v * s)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2);
  b.add(g.rotateY(Math.atan2(n[0], n[1])).translate(x, y, z), m);
}
/** A star of `k` points, radius r, its inner r * f */
const starPts = (k: number, r: number, f = 0.45): Pt[] => Array.from({ length: k * 2 }, (_, i) => {
  const a = (i / (k * 2)) * Math.PI * 2 + Math.PI / 2;
  const rr = i % 2 ? r * f : r;
  return [Math.cos(a) * rr, Math.sin(a) * rr] as Pt;
});
/** Bulbs along a line every `gap`, in the three chasing sets */
function bulbs(list: THREE.Matrix4[][], p: V3, q: V3, gap = 0.32) {
  const len = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
  const n = Math.max(1, Math.round(len / gap));
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    list[k % 3].push(mat4(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t));
  }
}

/** The cowboy, a flat neon sign (x across, y up from his boots): his outline, his arm apart (it waves, on the main thread) */
const COWBOY: Pt[] = [
  [-0.55, 0],
  [-0.2, 0],
  [-0.12, 1.9],
  [0.12, 1.9],
  [0.2, 0],
  [0.55, 0],
  [0.48, 2.2],
  [0.62, 3.3],
  [0.25, 3.55],
  [0.22, 3.85],
  [0.9, 3.95],
  [0.95, 4.1],
  [0.45, 4.15],
  [0.4, 4.6],
  [-0.4, 4.6],
  [-0.45, 4.15],
  [-0.95, 4.1],
  [-0.9, 3.95],
  [-0.22, 3.85],
  [-0.25, 3.55],
  [-0.62, 3.3],
  [-0.9, 2.2],
  [-0.75, 2.1],
  [-0.48, 2.2],
];
const ARM: Pt[] = [
  [-0.12, 0],
  [0.12, 0],
  [0.14, 1.15],
  [0.3, 1.35],
  [0.1, 1.6],
  [-0.15, 1.4],
  [-0.14, 1.15],
];
const shrink = (pts: Pt[], f: number): Pt[] => {
  const [mx, my] = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  return pts.map(([x, y]) => [mx + (x - mx) * f, my + (y - my) * f]);
};

function wildAce(b: Batch, r: Resort, low: boolean, chase: THREE.Matrix4[][]) {
  const n = out(r);
  const casino = r.parts[0];
  const [x0, z0, x1, z1] = casino.rect;
  const fz = r.face > 0 ? z1 : z0;
  const top = SLAB + casino.y1;
  // The marquee over the doors: a deep red box with bulbs round its face
  const M = WILD_ACE.marquee;
  rectBox(b, M.rect, SLAB + M.y0, SLAB + M.y1, toon('#c41f3a'));
  const mz = r.face > 0 ? M.rect[3] + 0.06 : M.rect[1] - 0.06;
  bulbs(chase, [M.rect[0], SLAB + M.y0 + 0.1, mz], [M.rect[2], SLAB + M.y0 + 0.1, mz]);
  bulbs(chase, [M.rect[0], SLAB + M.y1 - 0.1, mz], [M.rect[2], SLAB + M.y1 - 0.1, mz]);
  sign(b, 'WILD ACE', (M.rect[0] + M.rect[2]) / 2, SLAB + (M.y0 + M.y1) / 2, mz, n, 7, 0.9);
  // Bulbs along the casino's roofline and up its front corners
  if (!low) {
    bulbs(chase, [x0, top + 0.1, fz + n[1] * 0.06], [x1, top + 0.1, fz + n[1] * 0.06]);
    bulbs(chase, [x0 - 0.06, SLAB + 0.4, fz], [x0 - 0.06, top, fz]);
    bulbs(chase, [x1 + 0.06, SLAB + 0.4, fz], [x1 + 0.06, top, fz]);
  }
  // Starbursts across the front
  const nc = [neonOf(r.neon[0]), neonOf(r.neon[1]), neonOf('#2ef2ff')];
  b.detail(() => {
    for (let k = 0; k < 5; k++) {
      const x = x0 + 1.4 + k * ((x1 - x0 - 2.8) / 4);
      if (Math.abs(x - r.door.x) < 2.6) continue;
      cutout(b, starPts(8, 0.55, 0.3), x, SLAB + 1.9, fz + n[1] * 0.05, n, nc[k % 3], 0.04);
    }
  });
  // The star on the roof: on a post, neon, bulbs round it
  const S = WILD_ACE.star;
  cyl(b, 0.09, S.y - S.r * 0.6 - (top - SLAB), S.at[0], top, S.at[1], DARK, 8);
  cutout(b, starPts(5, S.r, 0.42), S.at[0], SLAB + S.y, S.at[1], n, neonOf('#ffd23a'), 0.12);
  cutout(b, shrink(starPts(5, S.r, 0.42), 0.78), S.at[0], SLAB + S.y, S.at[1] + n[1] * 0.07, n, toon('#c41f3a'), 0.04);
  if (!low) {
    const pts = starPts(5, S.r * 1.04, 0.42);
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length];
      bulbs(chase, [S.at[0] + p[0], SLAB + S.y + p[1], S.at[1] + n[1] * 0.1], [S.at[0] + q[0], SLAB + S.y + q[1], S.at[1] + n[1] * 0.1], 0.4);
    });
  }
  // The cowboy (but his waving arm): on the roof's front edge, his board behind him
  const C = WILD_ACE.cowboy;
  const s = C.h / 4.6;
  const cy = SLAB + C.y;
  cutout(b, COWBOY, C.at[0], cy, C.at[1], n, neonOf('#ffd23a'), 0.1, s);
  cutout(b, shrink(COWBOY, 0.86), C.at[0], cy + 0.15, C.at[1] + n[1] * 0.06, n, toon('#3b2a5a'), 0.04, s);
  // (his hat band and boots in another colour)
  cutout(b, [[-0.4, 4.15], [0.4, 4.15], [0.4, 4.27], [-0.4, 4.27]], C.at[0], cy, C.at[1] + n[1] * 0.09, n, neonOf('#ff3a6e'), 0.02, s);
  // (the frame behind him)
  box(b, C.at[0] - 0.08, top, C.at[1] - n[1] * 0.25 - 0.08, C.at[0] + 0.08, cy + C.h * 0.7, C.at[1] - n[1] * 0.25 + 0.08, DARK);
}

function dragonspire(b: Batch, r: Resort, low: boolean) {
  const n = out(r);
  // Crenellations along the castle walls' tops and the gatehouse's
  const merlons: THREE.Matrix4[] = [];
  for (const p of r.parts) {
    if (p.shape !== 'box' || p.skin !== 'castle') continue;
    const line = outline(p);
    line.forEach((a, i) => {
      const c = line[(i + 1) % line.length];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      for (let d = 0.35; d < len - 0.2; d += 0.9) {
        const t = d / len;
        merlons.push(mat4(a[0] + (c[0] - a[0]) * t, SLAB + p.y1, a[1] + (c[1] - a[1]) * t, Math.atan2(c[0] - a[0], c[1] - a[1])));
      }
    });
  }
  b.instances(new THREE.BoxGeometry(0.4, 0.55, 0.4).translate(0, 0.27, 0), toon('#e9dfe8'), merlons);
  // The gatehouse's arch, dark, and the drawbridge over the moat on its chains
  const gate = r.parts[1];
  const fz = r.face > 0 ? gate.rect[3] : gate.rect[1];
  const gx = (gate.rect[0] + gate.rect[2]) / 2;
  const arch: Pt[] = [[-1.1, 0], [1.1, 0], [1.1, 2.2]];
  for (let k = 1; k < 12; k++) {
    const a = (k / 12) * Math.PI;
    arch.push([Math.cos(a) * 1.1, 2.2 + Math.sin(a) * 1.1]);
  }
  arch.push([-1.1, 2.2]);
  cutout(b, arch, gx, SLAB, fz + n[1] * 0.02, n, DARK, 0.02);
  const D = DRAWBRIDGE;
  rectBox(b, D.rect, SLAB + D.y - 0.1, SLAB + D.y, WOOD);
  for (const dx of [D.rect[0] + 0.1, D.rect[2] - 0.1]) beam(b, [dx, SLAB + D.y, r.face > 0 ? D.rect[3] : D.rect[1]], [dx, SLAB + 4.2, fz], 0.06, CHAIN);
  sign(b, 'DRAGONSPIRE', gx, SLAB + 4.4 + 0.6, fz, n, 6, 0.8);
  // Flags on the cones' tips and banners down the walls
  if (!low)
    b.detail(() => {
      const flagMats = [toon('#ff3fd2'), toon('#2ef2ff'), toon('#ffd23a')];
      r.parts
        .filter((p) => p.shape === 'cone')
        .forEach((p, i) => {
          const [cx, cz] = [(p.rect[0] + p.rect[2]) / 2, (p.rect[1] + p.rect[3]) / 2];
          const y = SLAB + p.y1 + 0.85;
          cutout(b, [[0, 0], [0.7, -0.18], [0, -0.36]], cx, y, cz, [1, 0], flagMats[i % 3], 0.02);
        });
      const wall = r.parts[0];
      const wz = r.face > 0 ? wall.rect[3] : wall.rect[1];
      for (const u of [0.25, 0.75]) {
        const x = wall.rect[0] + (wall.rect[2] - wall.rect[0]) * u;
        pane(b, x, SLAB + 3.6, wz, n, 1, 2.6, toon(u < 0.5 ? '#8a2a8a' : '#2a5aa8'), 0.03);
        cutout(b, starPts(4, 0.3, 0.4), x, SLAB + 3.9, wz + n[1] * 0.05, n, GOLD, 0.02);
      }
    });
}

function scarab(b: Batch, r: Resort, low: boolean) {
  const n = out(r);
  const pyr = r.parts[0];
  const [x0, z0, x1, z1] = pyr.rect;
  const [ax, az, ay] = SCARAB.apex;
  // Gold neon up the pyramid's four ridges, a gold capstone
  const gold = neonOf('#ffd23a');
  for (const [x, z] of [
    [x0, z0],
    [x0, z1],
    [x1, z1],
    [x1, z0],
  ])
    beam(b, [x, SLAB + 0.05, z], [ax, ay - 0.6, az], 0.09, gold);
  const cap = 0.9;
  pyramid(b, [ax - cap, az - cap, ax + cap, az + cap], ay - 1.1, ay + 0.3, null, GOLD);
  // The portal at its foot: a stone frame with a dark doorway
  const P = SCARAB.portal;
  rectBox(b, P.rect, SLAB, SLAB + P.h, SAND);
  const pz = r.face > 0 ? P.rect[3] : P.rect[1];
  pane(b, (P.rect[0] + P.rect[2]) / 2, SLAB + (P.h - 0.6) / 2, pz, n, P.rect[2] - P.rect[0] - 1.1, P.h - 0.6, DARK, 0.02);
  box(b, P.rect[0] - 0.2, SLAB + P.h, P.rect[1] - 0.1, P.rect[2] + 0.2, SLAB + P.h + 0.4, P.rect[3] + 0.1, GOLD);
  sign(b, 'THE GOLDEN SCARAB', (x0 + x1) / 2, SLAB + P.h + 1.3, pz - n[1] * 0.05, n, 7, 0.9);
  // The stepped towers' terraces in neon
  for (const p of r.parts.slice(1)) trim(b, outline(p), SLAB + p.y1 + 0.04, neonOf('#2ef2ff'), 0.05);
  // The sphinx: crouched facing the boulevard, sandstone
  const [sx0, sz0, sx1, sz1] = SCARAB.sphinx.rect;
  const sh = SCARAB.sphinx.h;
  const along = (f: number) => (r.face > 0 ? sz0 + (sz1 - sz0) * f : sz1 - (sz1 - sz0) * f);
  const [mxs, wid] = [(sx0 + sx1) / 2, sx1 - sx0];
  // (body from the back, haunches, paws reaching to the front, the chest and the head with its headdress)
  box(b, mxs - wid * 0.3, SLAB, along(0), mxs + wid * 0.3, SLAB + sh * 0.45, along(0.62), SAND);
  box(b, mxs - wid * 0.34, SLAB, along(0), mxs + wid * 0.34, SLAB + sh * 0.36, along(0.3), SAND);
  for (const s of [-1, 1]) box(b, mxs + s * wid * 0.2 - wid * 0.1, SLAB, along(0.55), mxs + s * wid * 0.2 + wid * 0.1, SLAB + sh * 0.18, along(1), SAND);
  box(b, mxs - wid * 0.22, SLAB, along(0.5), mxs + wid * 0.22, SLAB + sh * 0.62, along(0.72), SAND);
  box(b, mxs - wid * 0.2, SLAB + sh * 0.55, along(0.52), mxs + wid * 0.2, SLAB + sh * 0.95, along(0.78), toon('#d2b06a'));
  box(b, mxs - wid * 0.12, SLAB + sh * 0.58, along(0.76), mxs + wid * 0.12, SLAB + sh * 0.9, along(0.84), SAND);
  // (the headdress's stripes in blue and gold)
  box(b, mxs - wid * 0.21, SLAB + sh * 0.95, along(0.52), mxs + wid * 0.21, SLAB + sh, along(0.78), toon('#2a4aa8'));
  // The obelisk: the resort's sign, a tapered shaft on a plinth, a gold tip, its screen on the boulevard face
  const [ox, oz] = SCARAB.obelisk.at;
  const ob = SCARAB.obelisk.base;
  const oh = SCARAB.obelisk.h;
  box(b, ox - ob / 2 - 0.2, SLAB, oz - ob / 2 - 0.2, ox + ob / 2 + 0.2, SLAB + 0.8, oz + ob / 2 + 0.2, SAND);
  // (a four-sided cylinder turned 45 degrees: radius r makes a square r * sqrt 2 across; the shaft from ob across at its
  // foot to a third of that at its top, under the gold tip)
  const [half0, half1] = [ob / 2, ob * 0.16];
  const shaft = oh - 2;
  b.add(new THREE.CylinderGeometry(half1 * Math.SQRT2, half0 * Math.SQRT2, shaft, 4, 1).rotateY(Math.PI / 4).translate(ox, SLAB + 0.8 + shaft / 2, oz), DARK);
  b.add(new THREE.ConeGeometry(half1 * Math.SQRT2, 1.2, 4).rotateY(Math.PI / 4).translate(ox, SLAB + 0.8 + shaft + 0.6, oz), GOLD);
  // (the screen on the boulevard face, where the taper has brought that face in to at the screen's middle)
  const ym = (r.pylon.screen[0] + r.pylon.screen[1]) / 2;
  const zf = oz + n[1] * (half0 - ((half0 - half1) * (ym - 0.8)) / shaft + 0.03);
  screen(b, r.pylon.row, ox, SLAB + (r.pylon.screen[0] + r.pylon.screen[1]) / 2, zf, n, ob * 0.62, r.pylon.screen[1] - r.pylon.screen[0], 0.12);
  sign(b, 'THE GOLDEN SCARAB', ox, SLAB + 0.45, oz + n[1] * (ob / 2 + 0.2), n, ob + 0.3, 0.32);
  if (!low)
    b.detail(() => {
      for (const s of [-1, 1]) cyl(b, 0.12, 2.2, (x0 + x1) / 2 + s * 2.2, SLAB, (r.face > 0 ? z1 : z0) + n[1] * 1.2, SAND, 8);
    });
}

function bigCity(b: Batch, r: Resort) {
  const n = out(r);
  // The crowns: a stepped deco crown on the west tower, a pointed one on the silver, the spire on the tall one
  const [c0, c1] = BIG_CITY.crowns;
  const [a0, b0, a1, b1] = c0.rect;
  box(b, a0 + 0.4, SLAB + c0.y, b0 + 0.4, a1 - 0.4, SLAB + c0.y + 1, b1 - 0.4, toon('#c8ccd8'));
  box(b, a0 + 0.9, SLAB + c0.y + 1, b0 + 0.9, a1 - 0.9, SLAB + c0.y + 1.8, b1 - 0.9, toon('#c8ccd8'));
  pyramid(b, [a0 + 1.3, b0 + 1.3, a1 - 1.3, b1 - 1.3], SLAB + c0.y + 1.8, SLAB + c0.y + c0.h + 1.2, null, GOLD);
  pyramid(b, c1.rect, SLAB + c1.y, SLAB + c1.y + c1.h, null, toon('#c8ccd8'));
  const S = BIG_CITY.spire;
  cyl(b, 0.06, S.y1 - S.y0, S.at[0], SLAB + S.y0, S.at[1], toon('#c8ccd8'), 6, 0.3);
  // Neon up the towers' corners facing the boulevard, and their roofs' edges
  const nc = neonOf(r.neon[1]);
  for (const p of r.parts.filter((q) => q.windows)) {
    const [x0, z0, x1, z1] = p.rect;
    const fz = r.face > 0 ? z1 : z0;
    for (const x of [x0, x1]) beam(b, [x, SLAB + 5.2, fz], [x, SLAB + p.y1, fz], 0.05, nc);
    trim(b, outline(p), SLAB + p.y1 + 0.04, neonOf(r.neon[0]), 0.05);
  }
  // The pool out front with its bridge: two little towers and their cables, the deck between
  const B = BIG_CITY.bridge;
  const yD = SLAB + B.deck;
  box(b, B.a[0], yD - 0.12, B.a[1] - 0.45, B.b[0], yD, B.a[1] + 0.45, STONE);
  for (const [x, z] of [B.a, B.b]) {
    for (const s of [-1, 1]) box(b, x - 0.25, SLAB, z + s * 0.45 - 0.12, x + 0.25, SLAB + B.towers, z + s * 0.45 + 0.12, toon('#9a7a5a'));
    box(b, x - 0.3, SLAB + B.towers - 0.5, z - 0.6, x + 0.3, SLAB + B.towers - 0.3, z + 0.6, toon('#9a7a5a'));
  }
  const mid: Pt = [(B.a[0] + B.b[0]) / 2, B.a[1]];
  for (const s of [-1, 1])
    for (const [x, z] of [B.a, B.b]) beam(b, [x, SLAB + B.towers, z + s * 0.45], [mid[0], yD + 0.3, mid[1] + s * 0.45], 0.04, toon('#3b3a46'));
  sign(b, 'BIG CITY', r.door.x, SLAB + 4.1, (r.face > 0 ? r.parts[0].rect[3] : r.parts[0].rect[1]) + n[1] * 0.02, n, 6, 0.75);
}

function coaster(b: Batch, r: Resort, low: boolean) {
  const N = COASTER_SAMPLES;
  const pts = Array.from({ length: N }, (_, k) => coasterAt(k / N));
  const red = toon('#e23b3b');
  const tie = toon('#2b2a33');
  const support = toon('#e8e6ee');
  const podium = r.parts[0];
  const onPodium = (x: number, z: number) => x > podium.rect[0] && x < podium.rect[2] && z > podium.rect[1] && z < podium.rect[3];
  const up = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k < N; k++) {
    const p = pts[k];
    const q = pts[(k + 1) % N];
    const t = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]).normalize();
    const side = new THREE.Vector3().crossVectors(t, up);
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    side.normalize().multiplyScalar(0.32);
    const qn = pts[(k + 2) % N];
    const t2 = new THREE.Vector3(qn[0] - q[0], qn[1] - q[1], qn[2] - q[2]).normalize();
    const side2 = new THREE.Vector3().crossVectors(t2, up);
    if (side2.lengthSq() < 1e-4) side2.set(1, 0, 0);
    side2.normalize().multiplyScalar(0.32);
    for (const s of [1, -1]) beam(b, [p[0] + side.x * s, SLAB + p[1], p[2] + side.z * s], [q[0] + side2.x * s, SLAB + q[1], q[2] + side2.z * s], 0.09, red);
    if (k % (low ? 4 : 2) === 0) beam(b, [p[0] + side.x, SLAB + p[1] - 0.06, p[2] + side.z], [p[0] - side.x, SLAB + p[1] - 0.06, p[2] - side.z], 0.07, tie);
    // Supports down to the ground, or the podium's roof
    if (k % 14 === 0) {
      const base = onPodium(p[0], p[2]) ? podium.y1 : 0;
      beam(b, [p[0], SLAB + base, p[2]], [p[0], SLAB + p[1] - 0.1, p[2]], 0.14, support);
    }
  }
}

function gondolier(b: Batch, r: Resort, low: boolean) {
  const n = out(r);
  const palace = r.parts[0];
  // Merlons along the palace's roofline, white, as the old palaces' are
  const merlons: THREE.Matrix4[] = [];
  const line = outline(palace);
  line.forEach((a, i) => {
    const c = line[(i + 1) % line.length];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    for (let d = 0.3; d < len - 0.2; d += 0.7) {
      const t = d / len;
      merlons.push(mat4(a[0] + (c[0] - a[0]) * t, SLAB + palace.y1, a[1] + (c[1] - a[1]) * t, Math.atan2(c[0] - a[0], c[1] - a[1])));
    }
  });
  b.instances(new THREE.BoxGeometry(0.28, 0.5, 0.18).translate(0, 0.25, 0), WHITE, merlons);
  // The bell tower's belfry: arches dark on each face, and its gold angel's post on the cap
  const belfry = r.parts[5];
  const [bx0, bz0, bx1, bz1] = belfry.rect;
  const [bcx, bcz] = [(bx0 + bx1) / 2, (bz0 + bz1) / 2];
  for (const [nn, x, z] of [
    [[0, 1], bcx, bz1],
    [[0, -1], bcx, bz0],
    [[1, 0], bx1, bcz],
    [[-1, 0], bx0, bcz],
  ] as [Pt, number, number][])
    pane(b, x, SLAB + (belfry.y0 + belfry.y1) / 2, z, nn, 1.2, 1.2, DARK, 0.02);
  const cap = r.parts[6];
  cyl(b, 0.05, 1.1, bcx, SLAB + cap.y1, bcz, GOLD, 6);
  // The bridge over the canal to the door: an arched deck and its balustrade
  const B = GONDOLIER.bridge;
  const [rx0, rz0, rx1, rz1] = B.rect;
  const zm = (rz0 + rz1) / 2;
  for (const [za, zb] of [
    [rz0, zm],
    [zm, rz1],
  ]) {
    const ya = SLAB + (Math.abs(za - zm) < 1e-6 ? B.rise : 0.02);
    const yb = SLAB + (Math.abs(zb - zm) < 1e-6 ? B.rise : 0.02);
    for (const x of [rx0, rx1]) beam(b, [x, ya + 0.5, za], [x, yb + 0.5, zb], 0.1, WHITE);
    beam(b, [(rx0 + rx1) / 2, ya, za], [(rx0 + rx1) / 2, yb, zb], rx1 - rx0 - 0.1, STONE);
  }
  // The gondolas at the steps and their striped mooring poles
  const black = toon('#16141f');
  for (const [gx, gz] of GONDOLIER.gondolas) {
    const y = SLAB + 0.3;
    box(b, gx - 1.3, y, gz - 0.22, gx + 1.3, y + 0.22, gz + 0.22, black);
    beam(b, [gx + 1.3, y + 0.15, gz], [gx + 1.75, y + 0.65, gz], 0.12, black);
    beam(b, [gx - 1.3, y + 0.15, gz], [gx - 1.65, y + 0.45, gz], 0.12, black);
    if (!low)
      b.detail(() => {
        box(b, gx - 0.3, y + 0.22, gz - 0.18, gx + 0.3, y + 0.38, gz + 0.18, toon('#c41f3a'));
        for (const s of [-1, 1]) {
          const x = gx + s * 1.8;
          cyl(b, 0.06, 1.6, x, SLAB + 0.2, gz - n[1] * 0.45, toon('#2a4aa8'), 6);
          cyl(b, 0.065, 0.3, x, SLAB + 0.7, gz - n[1] * 0.45, WHITE, 6);
          cyl(b, 0.065, 0.3, x, SLAB + 1.2, gz - n[1] * 0.45, WHITE, 6);
          cyl(b, 0.08, 0.12, x, SLAB + 1.8, gz - n[1] * 0.45, GOLD, 6);
        }
      });
  }
  // Lanterns along the lake's rim, and the name over the palace's door
  const fz = r.face > 0 ? palace.rect[3] : palace.rect[1];
  sign(b, 'THE GONDOLIER', r.door.x, SLAB + 3.9, fz, n, 7.5, 0.95);
  b.detail(() => {
    const lake = r.water[0];
    for (let x = lake[0] + 1; x < lake[2]; x += 3) {
      // (on the rim's walk side, towards the palace)
      const z = r.face > 0 ? lake[1] - 0.125 : lake[3] + 0.125;
      cyl(b, 0.05, 1.4, x, SLAB + RIM, z, DARK, 6);
      box(b, x - 0.12, SLAB + RIM + 1.4, z - 0.12, x + 0.12, SLAB + RIM + 1.7, z + 0.12, neonOf('#ffe0a0'));
    }
  });
}

function lagoon(b: Batch, r: Resort, low: boolean) {
  const n = out(r);
  // Gold neon along the crescent's tops, a lit crown on its middle
  for (const p of r.parts.slice(1)) trim(b, outline(p), SLAB + p.y1 + 0.05, neonOf('#ffd23a'), 0.06);
  // The islet where the volcano will stand: a mound of rock
  const I = LAGOON.islet;
  const rock = toon('#6b5a52');
  const rock2 = toon('#8a7466');
  b.add(new THREE.ConeGeometry(I.r, I.h + 0.6, 9, 1).translate(I.at[0], SLAB + (I.h + 0.6) / 2, I.at[1]), rock);
  // Rocks round the lagoon's back and its waterfalls coming down them from the podium
  const lagoonR = r.water[0];
  const backZ = r.face > 0 ? lagoonR[1] + 0.6 : lagoonR[3] - 0.6;
  const rocks: THREE.Matrix4[][] = [[], []];
  const rr = rng(311);
  for (let x = lagoonR[0] + 0.8; x < lagoonR[2] - 0.6; x += 1.1) rocks[x % 2 < 1 ? 0 : 1].push(mat4(x, SLAB + 0.2, backZ + (rr() - 0.5) * 0.5, rr() * 6, 0.55 + rr() * 0.5, 0.5 + rr() * 0.6));
  for (const x of [lagoonR[0] + 6, lagoonR[0] + 13]) {
    // (a pile of rock up to the podium's roof, the fall down its front)
    for (let k = 0; k < 5; k++) rocks[k % 2].push(mat4(x + (rr() - 0.5) * 1.6, SLAB + 0.6 + k * 0.85, backZ - n[1] * (0.4 + k * 0.1), rr() * 6, 0.9 - k * 0.08, 0.8));
    pane(b, x, SLAB + 2.4, backZ + n[1] * 0.25, n, 1.4, 4.6, FALLS, 0.02);
  }
  b.instances(new THREE.DodecahedronGeometry(1, 0), rock, rocks[0]);
  b.instances(new THREE.DodecahedronGeometry(1, 0), rock2, rocks[1]);
  // Palms round the lagoon
  const ps: THREE.Matrix4[] = [];
  const cs: THREE.Matrix4[] = [];
  LAGOON.palms.forEach(([x, z], k) => {
    const s = 0.95 + (k % 3) * 0.06;
    const h = 5.6 + (k % 4) * 0.5;
    const turn = k * 1.3;
    ps.push(mat4(x, SLAB - 0.02, z, turn, s, h, s));
    cs.push(mat4(x + Math.cos(turn) * 0.3, SLAB + h, z - Math.sin(turn) * 0.3, turn, s));
  });
  b.instances(trunk(0.19, 0.13, 0.35, low ? 5 : 7), toon('#8f7458'), ps);
  b.instances(crown(low ? 9 : 14, 1.05, 0.34, 0.45, 0.85, 0.05), toon('#3d9a4c'), cs, low ? 0 : SWAY);
  sign(b, 'LAVA LAGOON', (r.parts[0].rect[0] + r.parts[0].rect[2]) / 2, SLAB + 4.2, (r.face > 0 ? r.parts[0].rect[3] : r.parts[0].rect[1]) + n[1] * 0.02, n, 7, 0.9);
}

function orbit(b: Batch, r: Resort, low: boolean) {
  const [x, z] = ORBIT.at;
  const S = ORBIT.saucer;
  // The fins sweeping up the shaft from the podium's roof to under the saucer, a neon edge down each
  const white = WHITE;
  const ring0 = neonOf('#ff3fd2');
  const ring1 = neonOf('#2ef2ff');
  for (let k = 0; k < ORBIT.fins; k++) {
    const a = (k / ORBIT.fins) * Math.PI * 2 + Math.PI / 2;
    const [cx, cz] = [Math.cos(a), Math.sin(a)];
    const prof = new THREE.Shape([new THREE.Vector2(ORBIT.shaft - 0.1, 5), new THREE.Vector2(ORBIT.shaft + 3.4, 5), new THREE.Vector2(ORBIT.shaft + 0.6, S.y0 - 0.4), new THREE.Vector2(ORBIT.shaft - 0.1, S.y0 - 0.4)]);
    const g = new THREE.ExtrudeGeometry(prof, { depth: 0.36, bevelEnabled: false }).translate(0, 0, -0.18);
    // (in the fin's own plane: x out from the shaft, y up; turned round to face a)
    g.rotateY(-a).translate(x, SLAB, z);
    b.add(g, white);
    beam(b, [x + cx * (ORBIT.shaft + 3.42), SLAB + 5, z + cz * (ORBIT.shaft + 3.42)], [x + cx * (ORBIT.shaft + 0.62), SLAB + S.y0 - 0.4, z + cz * (ORBIT.shaft + 0.62)], 0.08, k % 2 ? ring0 : ring1);
  }
  // Rings of neon round the saucer's rim and its top, a band of lit windows between
  const h = S.y1 - S.y0;
  b.add(new THREE.TorusGeometry(S.r + 0.08, 0.08, 6, low ? 32 : 56).rotateX(Math.PI / 2).translate(x, SLAB + S.y0 + h * 0.42, z), ring0);
  b.add(new THREE.TorusGeometry(S.r * 0.8 + 0.06, 0.07, 6, low ? 28 : 48).rotateX(Math.PI / 2).translate(x, SLAB + S.y0 + h * 0.86, z), ring1);
  b.add(new THREE.CylinderGeometry(S.r + 0.012, S.r + 0.012, h * 0.12, low ? 32 : 56, 1, true).translate(x, SLAB + S.y0 + h * 0.49, z), neonOf('#fff1d6'));
  // The mast and its red light
  cyl(b, 0.08, ORBIT.mast.y1 - ORBIT.mast.y0, x, SLAB + ORBIT.mast.y0, z, toon('#c8ccd8'), 6, 0.2);
  b.add(new THREE.SphereGeometry(0.18, 8, 6).translate(x, SLAB + ORBIT.mast.y1, z), RED_LIGHT);
  // The name round the podium's front
  const pod = r.parts[0];
  const n = out(r);
  sign(b, 'ORBIT', (pod.rect[0] + pod.rect[2]) / 2, SLAB + 4.1, (r.face > 0 ? pod.rect[3] : pod.rect[1]) + n[1] * 0.02, n, 6, 0.75);
}

/* ---------- Register: the sites, and on the main thread what moves ---------- */

const THEMES: Record<string, (b: Batch, r: Resort, low: boolean) => void> = { dragonspire, scarab, bigcity: bigCity, gondolier, lagoon, orbit };

export function registerResorts({ low, scene, tick }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  for (const r of RESORTS) {
    site(`strip resort ${r.id}`, r.land, (into) => {
      const b = new Batch();
      shell(b, r, low);
      b.build(into, { cast: true, receive: true });
    });
    site(`strip resort ${r.id} front`, r.land, (into) => {
      const b = new Batch();
      front(b, r, low);
      if (r.id === 'wildace') {
        const sets: THREE.Matrix4[][] = [[], [], []];
        wildAce(b, r, low, sets);
        sets.forEach((list, k) => b.instances(BULB, BULBS[k], list));
      } else THEMES[r.id]?.(b, r, low);
      b.build(into, { cast: true, receive: true });
    });
    if (r.id === 'bigcity')
      site('strip resort bigcity coaster', r.land, (into) => {
        const b = new Batch();
        coaster(b, r, low);
        b.build(into, { cast: true, receive: true });
      });
  }
  if (!scene) return;

  // The water: the lake, the lagoon, the canal, the moat, Big City's pool, under their rims (the rims themselves too)
  const wb = new Batch();
  const rims = new Batch();
  for (const r of RESORTS)
    for (const [x0, z0, x1, z1] of r.water) {
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, SLAB + 0.26, (z0 + z1) / 2);
      wb.add(g, waterMat);
      const t = 0.25;
      const y = SLAB + RIM;
      box(rims, x0 - t, SLAB, z0 - t, x1 + t, y, z0, RIM_MAT);
      box(rims, x0 - t, SLAB, z1, x1 + t, y, z1 + t, RIM_MAT);
      box(rims, x0 - t, SLAB, z0, x0, y, z1, RIM_MAT);
      box(rims, x1, SLAB, z0, x1 + t, y, z1, RIM_MAT);
      // (the basin's floor, dark under the water)
      box(rims, x0, SLAB, z0, x1, SLAB + 0.02, z1, toon('#1d3a58'));
    }
  const water = new THREE.Group();
  wb.build(water, { cast: false, receive: false });
  rims.build(water, { cast: true, receive: true });
  scene.add(water);

  // The cars under the porte-cochères
  parkedCars(scene, SLAB, RESORTS.flatMap((r) => r.cars));

  // The cowboy's waving arm, from his shoulder
  const C = WILD_ACE.cowboy;
  const ace = RESORTS[0];
  const s = C.h / 4.6;
  const arm = new THREE.Group();
  {
    const ab = new Batch();
    cutout(ab, ARM, 0, 0, 0, [0, 1], neonOf('#ffd23a'), 0.1, s);
    cutout(ab, shrink(ARM, 0.7), 0, 0.05 * s, 0.06, [0, 1], toon('#3b2a5a'), 0.04, s);
    ab.build(arm, { cast: false, receive: false });
  }
  arm.position.set(C.at[0] + 0.62 * s, SLAB + C.y + 3.25 * s, C.at[1] + ace.face * 0.12);
  arm.rotation.y = Math.atan2(0, ace.face);
  arm.userData.keep = true;
  scene.add(moving(arm));

  // The pyramid's beam: a soft column of light from its tip into the sky at night
  const beamMat = new THREE.MeshBasicMaterial({ color: '#fff4cf', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true });
  const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 1.4, 90, 16, 1, true).translate(0, 45, 0), beamMat);
  ray.position.set(SCARAB.apex[0], SCARAB.apex[2], SCARAB.apex[1]);
  ray.userData.keep = true;
  ray.visible = false;
  scene.add(fx(ray));

  // Big City's coaster train: four cars round the track on the clock
  const train = new THREE.Group();
  const cars: THREE.Object3D[] = [];
  {
    const cb = new Batch();
    cb.box(-0.45, 0, -0.33, 0.9, 0.3, 0.66, toon('#ffd23a'));
    cb.box(-0.4, 0.3, -0.3, 0.12, 0.18, 0.6, toon('#2b2a33'));
    const geoGroup = cb.build(new THREE.Group(), { cast: true, receive: false });
    for (let k = 0; k < 4; k++) {
      const car = geoGroup.clone();
      train.add(car);
      cars.push(car);
    }
  }
  train.userData.keep = true;
  scene.add(moving(train));
  const LAP = 26;
  const GAP = 0.0042;
  const fwd = new THREE.Vector3();
  const place = (t: number) => {
    const u = (t / LAP) % 1;
    cars.forEach((car, k) => {
      const a = coasterAt(u - k * GAP);
      const b2 = coasterAt(u - k * GAP + 0.002);
      car.position.set(a[0], SLAB + a[1] + 0.05, a[2]);
      fwd.set(b2[0] - a[0], b2[1] - a[1], b2[2] - a[2]).normalize();
      car.lookAt(car.position.x + fwd.x, car.position.y + fwd.y, car.position.z + fwd.z);
      car.rotateY(-Math.PI / 2);
    });
  };
  const now = () => Date.now() / 1000;
  place(now());
  // The chase and everything else that moves, on the city's tick
  const ON = new THREE.Color('#ffe9a8');
  const OFF = new THREE.Color('#5a4a2a');
  tick?.((env) => {
    const t = now();
    place(t);
    arm.rotation.z = -0.35 + Math.sin(t * 3.2) * 0.45;
    // (one set of bulbs dim in turn, the other two lit: the chase runs along every line)
    const k = Math.floor(t * 6) % 3;
    const glow = 0.7 + env.night * 1.7;
    BULBS.forEach((m, i) => m.color.copy(i === k ? OFF : ON).multiplyScalar(i === k ? 1 : glow));
    beamMat.opacity = 0.16 * env.night;
    ray.visible = env.night > 0.05;
    // The LED faces step on a slide together, sliding over in the last fifth of each
    const ph = t / SLIDE_SECONDS;
    const f = Math.min(1, Math.max(0, (ph - Math.floor(ph) - 0.8) / 0.2));
    // (kept to one turn of the slides: a clock's worth of offset loses every bit of precision in the shader)
    LED_TEX.offset.y = -(((Math.floor(ph) % SLIDES) + f * f * (3 - 2 * f)) / SLIDES);
    FALLS_TEX.offset.y = (t * 0.9) % 1;
  });
}

/** For the landmarks (stripmarks3d.ts): the same paint, signs and bulbs (the welcome sign's chase with Wild Ace's) */
export { BULB, BULBS, beam, box, bulbs, cutout, cyl, mat4, neonOf, pane, sign, starPts };
