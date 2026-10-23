/*
 * The Trenches' corner shops (growth plan Phase 9 step 3; the lots are
 * `CORNER_SHOPS` in projects.ts, the rules `buyCorner()` and the `c0`-`c3`
 * places in tycoon.ts), drawn from your save like Makers' Row's units:
 *
 * - for sale: the shopfront behind a rolled-down shutter, a FOR SALE board
 *   on it, the fascia blank;
 * - yours: its name lit on the fascia, a striped awning, the door open, an
 *   OPEN sign in the window, and crates of what's on its shelves out on the
 *   sidewalk stands (more as the shelves fill);
 * - level 2: a neon trim along the fascia and planters by the door; level 3
 *   its name again on a lit board up on the roof. A plaque by the door shows
 *   its stars.
 *
 * Each is a brick building of its lot's size (the walls from the wall atlas,
 * like the rows round it), drawn in its lot's frame (infill.ts's kit) into one
 * Batch, and rebuilt only when what it shows changes. Its footprint is the
 * lot's, fixed in `PROJECT_SOLIDS` (walking, driving, bullets), so nothing
 * here is solid and nothing stands further out than the front strip.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, lit, liveTex, neon, toon } from './kit';
import { ATLAS, INK, METAL, WOOD, cornice, dress, frameOf, glow, kit, planter, roof, shell, soft, type Frame } from './infill';
import { SLAB as S } from './world';
import { FLOOR, SHOP_H, type Infill } from './downtown';
import { CORNER_SHOPS, type CornerShop } from './projects';
import { CORNER, CORNER_PLACES, capacityMul, good, placeLevel, type Corner, type TycoonSave } from './tycoon';

const FASCIA = 0.45;
const SALE = CORNER_SHOPS.length;

/** The names, one row each, then FOR SALE */
const BOARDS = (() => {
  const W = 512;
  const H = 96;
  const rows = [...CORNER_SHOPS.map((c) => ({ text: c.name, color: c.color })), { text: 'FOR SALE', color: '#ff3b5c' }];
  const tex = liveTex(W, H * rows.length, (c) => {
    rows.forEach(({ text, color }, i) => {
      const y = i * H;
      const sale = i === SALE;
      c.fillStyle = sale ? '#f3f2f7' : '#0d0b1c';
      c.fillRect(0, y, W, H);
      c.strokeStyle = color;
      c.lineWidth = 6;
      c.strokeRect(8, y + 8, W - 16, H - 16);
      c.font = `900 64px ${FONT_DISPLAY}`;
      const size = Math.min(64, (64 * (W - 60)) / c.measureText(text).width);
      c.font = `900 ${size}px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      if (!sale) {
        c.shadowColor = color;
        c.shadowBlur = 14;
      }
      c.fillStyle = color;
      c.fillText(text, W / 2, y + H / 2 + 3);
      c.shadowBlur = 0;
    });
  });
  return { mat: lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.95, 1.25), rows: rows.length };
})();
/** A board facing out of the front (+v in the frame), showing row `row` */
function board(row: number, w: number, h: number, u: number, y: number, v: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const v0 = 1 - (row + 1) / BOARDS.rows;
  const v1 = 1 - row / BOARDS.rows;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) > 0.5 ? v1 - 0.003 : v0 + 0.003);
  return g.translate(u, y, v);
}

const SHUTTER = toon('#6c6a80');
const SHUTTER_LINE = toon('#4f4d63');
const DOOR = toon('#2a2033');
const STAND = toon('#5a3a22');
const PAPER = toon('#f3f2f7');
const OPEN = neon('#ff3b5c', 0.6, 2.4);

/** What a shop shows, as a key: rebuilt only when it changes */
const look = (c: Corner | null, lvl: number, cap: number) =>
  c ? `own:${lvl}:${c.slots.map((s) => `${s.good}${Math.ceil((s.qty / cap) * 3)}`).join(',')}` : 'sale';

function draw(b: Batch, shop: CornerShop, c: Corner | null, lvl: number, cap: number, low: boolean) {
  const F: Frame = frameOf(shop.lot as unknown as Infill);
  const k = kit(b, F);
  const { w } = F;
  const lot = shop.lot;
  const top = S + lot.h;
  const upper = S + SHOP_H + FASCIA;
  const trim = toon('#d8cfc4');
  const uc = w / 2;
  // The building: brick over a lit shopfront, string courses, a cornice, the roof
  shell(k, F, top, ATLAS.wall.brick, ATLAS.ground.shopWarm, upper, 0.3);
  if (lot.floors > 0) dress(k, w, upper, top, Math.round((top - upper) / FLOOR), trim);
  cornice(k, w, top, trim, low);
  roof(k, F, top, toon('#4a2a2a'));
  // The fascia: blank for sale, its name once it's yours
  k.all(() => {
    k.lbox(0, w, S + SHOP_H, upper, 0, 0.08, toon('#141226'));
    if (c) k.put(board(CORNER_SHOPS.indexOf(shop), w - 0.24, FASCIA - 0.1, uc, S + SHOP_H + FASCIA / 2, 0.086), BOARDS.mat);
  });
  if (!c) {
    // For sale: the shutter down over the shopfront, a board on it
    k.all(() => {
      k.lbox(0.05, w - 0.05, S, S + SHOP_H - 0.02, 0.02, 0.07, SHUTTER);
      k.put(board(SALE, Math.min(1.6, w - 0.6), 0.36, uc, S + 0.85, 0.076), BOARDS.mat);
    });
    for (let y = S + 0.12; y < S + SHOP_H - 0.1; y += 0.16) k.lbox(0.05, w - 0.05, y, y + 0.02, 0.07, 0.076, SHUTTER_LINE);
    k.lbox(0.02, w - 0.02, S + SHOP_H - 0.12, S + SHOP_H, 0.02, 0.16, METAL);
    return;
  }
  // Yours: the door open in the middle, an awning in its colours, the OPEN sign, the plaque with its stars
  k.all(() => k.lbox(uc - 0.36, uc + 0.36, S, S + 1.05, 0.006, 0.02, DOOR));
  awning(k, w, S + SHOP_H - 0.02, [shop.color, '#f3f2f7']);
  k.lbox(uc + 0.55, uc + 1.0, S + 0.75, S + 0.95, 0.012, 0.024, OPEN);
  k.lbox(0.18, 0.5, S + 0.7, S + 0.9, 0.012, 0.03, INK);
  for (let i = 0; i < lvl; i++) k.put(new THREE.SphereGeometry(0.025, 6, 4).translate(0.24 + i * 0.12, S + 0.8, 0.035), glow('#ffd23f'));
  // Stands either side of the door, crates of what's on the shelves (fuller shelves, more crates)
  const colours = c.slots.filter((s) => s.qty > 0).map((s) => toon(good(s.good).color));
  const full = c.slots.reduce((n, s) => n + s.qty, 0) / (cap * CORNER.slots);
  const crates = Math.min(6, Math.ceil(full * 6 + (colours.length ? 1 : 0)));
  const v = Math.min(lot.front, 0.5) - 0.14;
  for (const side of [-1, 1]) {
    const u = side < 0 ? Math.max(0.5, uc - 1.1) : Math.min(w - 0.5, uc + 1.1);
    k.lbox(u - 0.36, u + 0.36, S, S + 0.42, v - 0.14, v + 0.14, STAND);
    k.lbox(u - 0.38, u + 0.38, S + 0.42, S + 0.45, v - 0.16, v + 0.16, WOOD);
  }
  // (filling both stands from the door outwards)
  for (let n = 0; n < crates; n++) {
    const side = n % 2 ? 1 : -1;
    const j = Math.floor(n / 2);
    const u = (side < 0 ? Math.max(0.5, uc - 1.1) : Math.min(w - 0.5, uc + 1.1)) - side * (j - 1) * 0.23;
    k.lbox(u - 0.1, u + 0.1, S + 0.45, S + 0.58, v - 0.1, v + 0.1, colours[n % Math.max(1, colours.length)] ?? PAPER);
  }
  if (lvl >= 2) {
    // Neon along the fascia's foot, planters by the door
    k.all(() => k.lbox(0.04, w - 0.04, S + SHOP_H + 0.01, S + SHOP_H + 0.05, 0.09, 0.12, neon(shop.color, 0.6, 2.4)));
    if (!low) {
      planter(k, Math.max(0.25, uc - 0.6), v + 0.05);
      planter(k, Math.min(w - 0.25, uc + 0.6), v + 0.05);
    }
  }
  if (lvl >= 3) {
    // Its name up on the roof, lit, on two posts
    const bw = Math.min(w - 0.3, 2.6);
    for (const s of [-1, 1]) k.lbox(uc + s * (bw / 2 - 0.1) - 0.04, uc + s * (bw / 2 - 0.1) + 0.04, top, top + 0.95, -0.35, -0.27, METAL);
    k.all(() => {
      k.lbox(uc - bw / 2 - 0.04, uc + bw / 2 + 0.04, top + 0.5, top + 1.0, -0.31, -0.26, toon('#141226'));
      k.put(board(CORNER_SHOPS.indexOf(shop), bw, 0.42, uc, top + 0.75, -0.25), BOARDS.mat);
      k.lbox(uc - bw / 2, uc + bw / 2, top + 1.0, top + 1.03, -0.31, -0.24, soft(shop.color));
    });
  }
}

/** A striped awning over the shopfront */
function awning(k: ReturnType<typeof kit>, w: number, y: number, colors: string[]) {
  const depth = 0.55;
  const drop = 0.28;
  const slope = Math.atan2(drop, depth);
  const len = Math.hypot(drop, depth);
  const n = Math.max(2, Math.round((w - 0.3) / 0.3));
  const sw = (w - 0.3) / n;
  for (let i = 0; i < n; i++) {
    const mat = toon(colors[i % colors.length]);
    const u = 0.15 + sw * (i + 0.5);
    k.put(new THREE.BoxGeometry(sw, 0.03, len).rotateX(slope).translate(u, y - drop / 2, depth / 2), mat);
    k.lbox(u - sw / 2, u + sw / 2, y - drop - 0.14, y - drop, depth - 0.02, depth + 0.01, mat);
  }
}

export function buildCornerShops(scene: THREE.Scene, opts: { low: boolean }) {
  const groups = CORNER_SHOPS.map((c) => {
    const g = new THREE.Group();
    g.name = `corner ${c.id}`;
    scene.add(g);
    return g;
  });
  const shown: string[] = CORNER_SHOPS.map(() => '');
  return {
    /** Draw every corner shop as the save has it (only the ones that changed are rebuilt) */
    show(s: TycoonSave) {
      let changed = false;
      CORNER_SHOPS.forEach((shop, i) => {
        const p = CORNER_PLACES[i];
        const c = s.corners[i];
        const lvl = placeLevel(s, p);
        const cap = Math.round(CORNER.capacity * capacityMul(s, p));
        const key = look(c, lvl, cap);
        if (shown[i] === key) return;
        shown[i] = key;
        const g = groups[i];
        for (const child of [...g.children]) {
          g.remove(child);
          child.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
        }
        const b = new Batch();
        draw(b, shop, c, lvl, cap, opts.low);
        b.build(g);
        changed = true;
      });
      return changed;
    },
  };
}
export type CornerShops = ReturnType<typeof buildCornerShops>;
