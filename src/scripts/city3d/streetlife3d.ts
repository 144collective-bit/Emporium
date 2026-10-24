/*
 * Uptown's street life on screen (docs/finance-plan.md Phase 7 step 4; the
 * numbers are streetlife.ts), part of Uptown's chunk (uptown3d.ts): a site a
 * tower with its screens, its neon blades and the cart in its margin.
 *
 * - **Screens:** a dark frame on the base, the picture from one atlas of the
 *   slides (`SLIDES`, a row each, a scan-line grid over them); the tick steps
 *   every screen on to its next slide together (`SLIDE_SECONDS`). About as
 *   bright as a lit window: never washes out.
 * - **Neon blades:** a dark blade out from the wall with its word down both
 *   faces (one atlas, a column a word) and a neon tube round its edge.
 * - **Carts:** a coffee cart under a canopy, a hot dog cart under a striped
 *   umbrella, a flower stall of buckets on tiers under an awning, a newsstand
 *   with its racks of magazines; their names on one small atlas. The bodies
 *   at every distance, the rest near only.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, siteMat, toon } from './kit';
import { SLAB, type Tick } from './world';
import { site } from './tilework';
import { HIGHRISES } from './highrise';
import { BLADE, BLADES, BLADE_WORDS, CART, CARTS, SCREEN, SCREENS, SLIDES, SLIDE_SECONDS, facing, type Blade, type Cart, type Screen } from './streetlife';

const DARK = toon('#14121f');
const STEEL = toon('#b8bccb');
const IRON = toon('#2a2740');
const WOOD = toon('#8a5a3a');
const WHEEL = toon('#1a1826');
const GREEN = toon('#1f4a3a');
const RED = toon('#c8303c');
const CREAM = toon('#f1ece2');
const YELLOW = toon('#f2c94c');
const NAVY = toon('#1c2a55');
const BLOOMS = ['#ff4fd8', '#ffd23f', '#ff8a3d', '#f3f2f7', '#b07bff', '#e23b3b'].map((c) => toon(c));
const MAGS = ['#e23b3b', '#4fe3ff', '#ffd23f', '#ff4fd8', '#6fcf97', '#f3f2f7'].map((c) => toon(c));
const TUBES = ['#ff4fd8', '#4fe3ff', '#ffd23f', '#7dffb0', '#b46bff'].map((c) => neon(c));

/* ---------- Textures ---------- */

const SLIDE_W = 512;
const SLIDE_H = 256;
/** The screens' slides: a row each, a colour field, shapes and the words, a scan-line grid over it all */
const SCREEN_TEX = (() => {
  const tex = canvasTex(SLIDE_W, SLIDE_H * SLIDES.length, (c) => {
    const fields = [['#2a0a5a', '#ff4fd8'], ['#04122e', '#4fe3ff'], ['#2e1204', '#ffd23f'], ['#1a0420', '#ff5ce0'], ['#04201a', '#7dffb0'], ['#0e0a2a', '#b46bff'], ['#04182a', '#4fe3ff'], ['#200a04', '#ff8a3d']];
    SLIDES.forEach((text, i) => {
      const y = i * SLIDE_H;
      const [bg, fg] = fields[i % fields.length];
      const g = c.createLinearGradient(0, y, SLIDE_W, y + SLIDE_H);
      g.addColorStop(0, bg);
      g.addColorStop(1, '#05040b');
      c.fillStyle = g;
      c.fillRect(0, y, SLIDE_W, SLIDE_H);
      // Shapes behind the words: rings, bars or a diamond, by the slide
      c.strokeStyle = fg;
      c.fillStyle = fg;
      c.globalAlpha = 0.35;
      c.lineWidth = 10;
      if (i % 3 === 0) for (let r = 40; r < 260; r += 40) {
        c.beginPath();
        c.arc(SLIDE_W * 0.8, y + SLIDE_H * 0.5, r, 0, Math.PI * 2);
        c.stroke();
      } else if (i % 3 === 1) for (let k = 0; k < 12; k++) c.fillRect(k * 44, y + SLIDE_H - 30 - ((k * 37) % 120), 30, 200);
      else {
        c.beginPath();
        c.moveTo(SLIDE_W * 0.82, y + 30);
        c.lineTo(SLIDE_W * 0.95, y + SLIDE_H / 2);
        c.lineTo(SLIDE_W * 0.82, y + SLIDE_H - 30);
        c.lineTo(SLIDE_W * 0.69, y + SLIDE_H / 2);
        c.closePath();
        c.fill();
      }
      c.globalAlpha = 1;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#ffffff';
      let size = 76;
      c.font = `800 ${size}px ${FONT_DISPLAY}`;
      while (c.measureText(text).width > SLIDE_W - 60 && size > 30) c.font = `800 ${(size -= 4)}px ${FONT_DISPLAY}`;
      c.shadowColor = fg;
      c.shadowBlur = 18;
      c.fillText(text, SLIDE_W / 2, y + SLIDE_H / 2);
      c.shadowBlur = 0;
      c.fillStyle = fg;
      c.fillRect(SLIDE_W / 2 - 60, y + SLIDE_H / 2 + size * 0.6, 120, 6);
    });
    // The LEDs' grid
    c.fillStyle = 'rgba(0,0,0,0.28)';
    for (let y = 0; y < SLIDE_H * SLIDES.length; y += 4) c.fillRect(0, y, SLIDE_W, 1);
    for (let x = 0; x < SLIDE_W; x += 4) c.fillRect(x, 0, 1, SLIDE_H * SLIDES.length);
  });
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
})();
const SCREEN_MAT = siteMat('uptown-screens', lit(new THREE.MeshBasicMaterial({ map: SCREEN_TEX, color: '#ffffff' }), 0.9, 1.05));
/** The blades' words, a column each, a letter under the next */
const BLADE_COLS = ['#ff4fd8', '#4fe3ff', '#ffd23f', '#7dffb0', '#b46bff'];
const BLADE_MAT = siteMat(
  'uptown-blade-words',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(64 * BLADE_WORDS.length, 512, (c) => {
        c.fillStyle = '#0b0a18';
        c.fillRect(0, 0, 64 * BLADE_WORDS.length, 512);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        BLADE_WORDS.forEach((w, i) => {
          const step = Math.min(84, 480 / w.length);
          c.font = `800 ${Math.min(52, step * 0.9)}px ${FONT_DISPLAY}`;
          c.fillStyle = BLADE_COLS[i % BLADE_COLS.length];
          [...w].forEach((ch, k) => c.fillText(ch, i * 64 + 32, 256 + (k - (w.length - 1) / 2) * step));
        });
      }),
      color: '#ffffff',
    }),
    1,
    1.6
  )
);
const CART_NAMES = ['COFFEE', 'HOT DOGS', 'FLOWERS', 'NEWS'];
const CART_SIGNS = siteMat(
  'uptown-cart-signs',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(256, 64 * CART_NAMES.length, (c) => {
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        CART_NAMES.forEach((w, i) => {
          c.fillStyle = ['#1f4a3a', '#c8303c', '#2f6a3c', '#1c2a55'][i];
          c.fillRect(0, i * 64, 256, 64);
          c.fillStyle = '#ffffff';
          c.font = `800 40px ${FONT_DISPLAY}`;
          c.fillText(w, 128, i * 64 + 34);
        });
      }),
      color: '#ffffff',
    }),
    0.95,
    1.25
  )
);

/** A plane w x h with its UVs over [u0, v0, u1, v1], centred at (x, y, z), facing the way ry turns +z */
function plane(b: Batch, mat: THREE.Material, uv: [number, number, number, number], x: number, y: number, z: number, w: number, h: number, ry: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const a = g.attributes.uv;
  for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1]));
  b.add(g.rotateY(ry).translate(x, y, z), mat);
}

/* ---------- Screens ---------- */

function screen(b: Batch, s: Screen) {
  const ry = facing(s.n);
  const [cx, cz] = [s.x, s.z];
  const yc = SLAB + s.y + s.h / 2;
  // The frame (behind the picture, back to the wall), brackets top and bottom
  const fw = s.w + 2 * SCREEN.frame;
  const fh = s.h + 2 * SCREEN.frame;
  b.add(new THREE.BoxGeometry(fw, fh, SCREEN.off).rotateY(ry).translate(cx - (s.n[0] * SCREEN.off) / 2 + s.n[0] * 0.005, yc, cz - (s.n[1] * SCREEN.off) / 2 + s.n[1] * 0.005), DARK);
  const k = s.slide;
  const n = SLIDES.length;
  plane(b, SCREEN_MAT, [0, 1 - (k + 1) / n, 1, 1 - k / n], cx + s.n[0] * 0.012, yc, cz + s.n[1] * 0.012, s.w, s.h, ry);
}

/* ---------- Blades ---------- */

function blade(b: Batch, d: Blade) {
  const ry = facing(d.n);
  const h = BLADE.y1 - BLADE.y0;
  const yc = SLAB + (BLADE.y0 + BLADE.y1) / 2;
  const [mx, mz] = [d.x + d.n[0] * (BLADE.out / 2 + 0.05), d.z + d.n[1] * (BLADE.out / 2 + 0.05)];
  // The blade lies in the plane of n (across the wall): its long side out from the wall
  const side = ry + Math.PI / 2;
  b.add(new THREE.BoxGeometry(BLADE.thick, h, BLADE.out).rotateY(ry).translate(mx, yc, mz), DARK);
  const u0 = d.word / BLADE_WORDS.length;
  const u1 = (d.word + 1) / BLADE_WORDS.length;
  for (const s of [-1, 1]) {
    const [ox, oz] = [Math.cos(ry) * s * (BLADE.thick / 2 + 0.008), -Math.sin(ry) * s * (BLADE.thick / 2 + 0.008)];
    plane(b, BLADE_MAT, [u0, 0.03, u1, 0.97], mx + ox, yc, mz + oz, BLADE.out - 0.16, h - 0.16, side + (s < 0 ? Math.PI : 0));
  }
  // The tube round its outer edge and over its top
  const tube = TUBES[d.word % TUBES.length];
  const [ex, ez] = [d.x + d.n[0] * (BLADE.out + 0.07), d.z + d.n[1] * (BLADE.out + 0.07)];
  b.add(new THREE.CylinderGeometry(0.03, 0.03, h, 6, 1, true).translate(ex, yc, ez), tube);
  b.add(new THREE.CylinderGeometry(0.03, 0.03, BLADE.out, 6, 1, true).rotateX(Math.PI / 2).rotateY(ry).translate(mx, SLAB + BLADE.y1 + 0.04, mz), tube);
  // Two brackets back to the wall
  for (const y of [BLADE.y0 + 0.3, BLADE.y1 - 0.3]) b.add(new THREE.BoxGeometry(0.05, 0.05, 0.2).rotateY(ry).translate(d.x + d.n[0] * 0.1, SLAB + y, d.z + d.n[1] * 0.1), IRON);
}

/* ---------- Carts ---------- */

/** One cart in its own frame: x along its wall, z out from it (its counter faces the street) */
function cart(b: Batch, c: Cart, i: number) {
  const put = (g: THREE.BufferGeometry, mat: THREE.Material) => b.add(g.rotateY(c.ry).translate(c.x, SLAB, c.z), mat);
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => put(new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z), mat);
  const L = CART.half * 2;
  const D = CART.depth * 2;
  const sign = (row: number, y: number, w: number) =>
    b.detail(() => {
      const g = new THREE.PlaneGeometry(w, 0.26);
      const a = g.attributes.uv;
      const n = CART_NAMES.length;
      for (let k = 0; k < a.count; k++) a.setXY(k, a.getX(k), 1 - (row + 1) / n + a.getY(k) / n);
      put(g.translate(0, y, D / 2 + 0.03), CART_SIGNS);
    });
  const wheels = (r: number) =>
    b.detail(() => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(new THREE.CylinderGeometry(r, r, 0.06, 12).rotateX(Math.PI / 2).translate(sx * (CART.half - 0.3), r, sz * (CART.depth + 0.04)), WHEEL);
    });
  switch (c.kind) {
    case 'coffee': {
      box(L, 0.85, D, 0, 0.12, 0, GREEN);
      box(L + 0.06, 0.05, D + 0.06, 0, 0.97, 0, WOOD);
      wheels(0.14);
      // A canopy on four posts, its name along the front
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.04, 1.0, 0.04, sx * (CART.half - 0.05), 1.02, sz * (CART.depth - 0.05), STEEL);
      box(L + 0.2, 0.08, D + 0.3, 0, 2.02, 0.05, GREEN);
      sign(0, 1.9, L - 0.1);
      b.detail(() => {
        box(0.42, 0.36, 0.3, -0.3, 1.02, -0.05, STEEL);
        box(0.12, 0.05, 0.12, -0.3, 1.38, -0.05, DARK);
        for (let k = 0; k < 3; k++) put(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 8).translate(0.2 + k * 0.14, 1.08, 0.12), CREAM);
      });
      return;
    }
    case 'hotdog': {
      box(L, 0.75, D, 0, 0.25, 0, STEEL);
      box(L, 0.08, D, 0, 1.0, 0, DARK);
      wheels(0.26);
      // The umbrella on its pole, striped red and yellow
      put(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 6, 1, true).translate(0, 1.7, 0), STEEL);
      for (let k = 0; k < 8; k++) put(new THREE.ConeGeometry(1.0, 0.35, 8, 1, true, (k * Math.PI) / 4, Math.PI / 4).translate(0, 2.45, 0), k % 2 ? RED : YELLOW);
      sign(1, 0.62, L - 0.2);
      b.detail(() => {
        box(0.5, 0.12, 0.36, 0.3, 1.08, 0, STEEL);
        for (const s of [-1, 1]) put(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 8).translate(-0.35 + s * 0.08, 1.19, 0), s < 0 ? RED : YELLOW);
      });
      return;
    }
    case 'flowers': {
      // Three tiers stepping back to the wall, buckets of flowers along each, an awning over them
      for (let t = 0; t < 3; t++) box(L, 0.3 + t * 0.32, 0.22, 0, 0, 0.22 - t * 0.22, WOOD);
      for (const s of [-1, 1]) box(0.04, 1.9, 0.04, s * (CART.half - 0.03), 0, -CART.depth + 0.03, IRON);
      put(new THREE.BoxGeometry(L + 0.2, 0.05, D + 0.4).rotateX(0.3).translate(0, 1.95, 0.1), GREEN);
      sign(2, 1.62, L - 0.1);
      b.detail(() => {
        for (let t = 0; t < 3; t++)
          for (let k = 0; k < 5; k++) {
            const [bx, bz, by] = [-0.56 + k * 0.28, 0.22 - t * 0.22, 0.3 + t * 0.32];
            put(new THREE.CylinderGeometry(0.09, 0.07, 0.2, 8, 1, true).translate(bx, by + 0.1, bz), IRON);
            put(new THREE.IcosahedronGeometry(0.12, 0).translate(bx, by + 0.28, bz), BLOOMS[(i + t * 5 + k) % BLOOMS.length]);
          }
      });
      return;
    }
    case 'news': {
      // A kiosk: its body, a roof overhanging the front, racks of magazines on the front, the vendor's hatch
      box(L, 2.0, D, 0, 0, 0, NAVY);
      box(L + 0.24, 0.1, D + 0.5, 0, 2.0, 0.12, DARK);
      sign(3, 1.78, L - 0.1);
      b.detail(() => {
        box(L - 0.5, 0.5, 0.02, 0, 1.15, D / 2 + 0.006, DARK);
        for (let row = 0; row < 3; row++)
          for (let k = 0; k < 5; k++) box(0.2, 0.26, 0.02, -0.56 + k * 0.28, 0.12 + row * 0.32, D / 2 + 0.02 + row * 0.01, MAGS[(i + row * 5 + k) % MAGS.length]);
      });
      return;
    }
  }
}

/* ---------- Registering ---------- */

export function registerStreetLife(tick?: (f: Tick) => void) {
  // A site a tower: its screens, its blades, its cart
  for (const t of HIGHRISES) {
    const [x0, z0, x1, z1] = t.lot;
    const screens = SCREENS.filter((s) => s.tower === t.id);
    const blades = BLADES.filter((d) => d.tower === t.id);
    const carts = CARTS.filter((c) => c.tower === t.id);
    if (!screens.length && !blades.length && !carts.length) continue;
    site(`uptown street life ${t.id}`, [x0 - 3, z0 - 3, x1 + 3, z1 + 3], (into) => {
      const b = new Batch();
      for (const s of screens) screen(b, s);
      for (const d of blades) blade(b, d);
      for (const c of carts) cart(b, c, CARTS.indexOf(c));
      b.build(into, { cast: true, receive: true });
    });
  }
  // On the main thread: every screen on to its next slide together
  tick?.(({ t }) => {
    const step = Math.floor(t / SLIDE_SECONDS) % SLIDES.length;
    SCREEN_TEX.offset.y = -step / SLIDES.length;
  });
}
