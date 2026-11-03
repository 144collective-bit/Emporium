/*
 * Where the touch controls stand (docs/controls-plan.md Phases 1 and 2): the same slots in every mode, a big
 * main button in the bottom-right corner and the rest in an arc round it (an inner ring straight left, up-left
 * and straight up, an outer ring between), the stick bottom-left (with Crouch over it on foot; bigger at the
 * wheel), and on foot the hotbar and the door prompt kept clear of them. On foot, at the wheel (the car, the
 * bike, the boat, the aircraft, your own kart), in a kart race and in the Fight Club's ring. DOM-free (tested in tests/touchlayout.test.ts); controls.ts puts it on the
 * page as CSS variables.
 *
 * Every number is CSS pixels. A button is its centre and its diameter: `x` from the right edge for the right
 * cluster (from the left edge for the left one), `y` from the bottom edge; the page adds the safe areas.
 */

export type Action =
  | 'jump' | 'sprint' | 'crouch' | 'punch' | 'block' | 'kick' | 'fire' | 'aim' | 'reload' | 'swap'
  | 'gas' | 'brake' | 'horn' | 'view' | 'drift' | 'dodge';
/** On foot with empty hands (the fists) or a gun out */
export type FootMode = 'fists' | 'armed';
/** Every mode: on foot, at the wheel of anything drive.ts / fly.ts / boat.ts runs, a kart race, the ring */
export type Mode = FootMode | 'drive' | 'kart' | 'ring';
export type Slot = 'main' | 'a1' | 'a2' | 'a3' | 'b1' | 'b2';
/** upright, on its side (a short screen), or upright and narrow */
export type Shape = 'up' | 'side' | 'narrow';

export interface Spot {
  side: 'r' | 'l';
  x: number;
  y: number;
  d: number;
}
export interface Layout {
  shape: Shape;
  buttons: Partial<Record<Action, Spot>>;
  stick: Spot;
  /** The hotbar: a row anchored to the right edge (the left, left-handed: `side`), `edge` in from it,
   *  `bottom` up, its slots `slot` square */
  hotbar: { side: 'r' | 'l'; edge: number; bottom: number; slot: number };
  /** The size the buttons came out at (the player's, or smaller where theirs wouldn't fit) */
  scale: number;
  /** The door prompt: its centre from the left edge, its bottom */
  prompt: { cx: number; bottom: number };
}

/** Which action takes which slot: the same slots in every mode (Jump, Brake or Dodge beside the main one) */
export const LAYOUTS: Record<Mode, Partial<Record<Slot, Action>>> = {
  fists: { main: 'punch', a1: 'jump', a2: 'block', a3: 'sprint', b2: 'kick' },
  armed: { main: 'fire', a1: 'jump', a2: 'reload', a3: 'sprint', b1: 'swap', b2: 'aim' },
  drive: { main: 'gas', a1: 'brake', a2: 'view', a3: 'horn' },
  kart: { main: 'gas', a1: 'brake', a2: 'drift' },
  ring: { main: 'punch', a1: 'dodge', a2: 'block', b2: 'kick' },
};
const ON_FOOT = (m: Mode): m is FootMode => m === 'fists' || m === 'armed';

interface Ring {
  /** the main button's centre from the corner, and its diameter */
  mx: number;
  my: number;
  main: number;
  /** the other buttons' diameter, the inner and outer rings' distance from the main one's centre */
  small: number;
  inner: number;
  outer: number;
  stick: number;
  stickAt: [number, number];
  crouch: number;
  crouchAt: [number, number];
  hotSlot: number;
  /** The stick at the wheel and in a kart race: bigger, for steering */
  wheel: number;
  wheelAt: [number, number];
}
/** Angles from the main button's centre, 0 straight left (into the screen), 90 straight up */
const INNER = { a1: 0, a2: 45, a3: 90 } as const;
const OUTER = { b1: 30, b2: 70 } as const;

const RINGS: Record<Shape, Ring> = {
  up: { mx: 60, my: 72, main: 84, small: 58, inner: 92, outer: 158, stick: 120, stickAt: [82, 88], crouch: 54, crouchAt: [82, 196], hotSlot: 44, wheel: 136, wheelAt: [86, 96] },
  narrow: { mx: 54, my: 66, main: 76, small: 52, inner: 84, outer: 142, stick: 104, stickAt: [66, 78], crouch: 50, crouchAt: [66, 172], hotSlot: 42, wheel: 118, wheelAt: [70, 84] },
  side: { mx: 58, my: 52, main: 70, small: 52, inner: 78, outer: 134, stick: 108, stickAt: [76, 70], crouch: 52, crouchAt: [76, 158], hotSlot: 42, wheel: 118, wheelAt: [80, 74] },
};

/** The screen's shape: on its side when it's short (a phone held sideways), narrow upright under 361 wide */
export function shapeOf(w: number, h: number): Shape {
  if (h <= 500 && w > h) return 'side';
  return w <= 360 ? 'narrow' : 'up';
}

function slotSpot(r: Ring, slot: Slot): Spot {
  if (slot === 'main') return { side: 'r', x: r.mx, y: r.my, d: r.main };
  const inner = slot in INNER;
  const a = ((inner ? INNER[slot as keyof typeof INNER] : OUTER[slot as keyof typeof OUTER]) * Math.PI) / 180;
  const dist = inner ? r.inner : r.outer;
  return { side: 'r', x: round(r.mx + Math.cos(a) * dist), y: round(r.my + Math.sin(a) * dist), d: r.small };
}
const round = (v: number) => Math.round(v * 10) / 10;

/* ---------- The player's choices (docs/controls-plan.md Phase 4): saved with walk mode's settings ---------- */
export type TouchSize = 'small' | 'medium' | 'large';
export const SIZES: Record<TouchSize, number> = { small: 0.85, medium: 1, large: 1.15 };
export const TOUCH_SIZES = Object.keys(SIZES) as TouchSize[];
/** How see-through the buttons are while not held: 1 solid, down to `ALPHA_MIN` */
export const ALPHA_MIN = 0.4;
export interface TouchPrefs {
  size: TouchSize;
  alpha: number;
  /** Left-handed: the stick on the right, the buttons on the left */
  left: boolean;
}
export const DEFAULT_TOUCH: TouchPrefs = { size: 'medium', alpha: 1, left: false };
/** Anything saved, made sound (an older save has none: the defaults) */
export function cleanTouch(v: unknown): TouchPrefs {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const size = TOUCH_SIZES.includes(o.size as TouchSize) ? (o.size as TouchSize) : DEFAULT_TOUCH.size;
  const a = typeof o.alpha === 'number' && Number.isFinite(o.alpha) ? o.alpha : DEFAULT_TOUCH.alpha;
  return { size, alpha: Math.round(Math.min(1, Math.max(ALPHA_MIN, a)) * 100) / 100, left: o.left === true };
}

/** The controls on foot for a screen `w` x `h` (CSS pixels, inside the safe areas) in mode `mode` */
export function footLayout(w: number, h: number, mode: FootMode, prefs: TouchPrefs = DEFAULT_TOUCH): Layout {
  return layoutFor(w, h, mode, prefs);
}

/** The controls in any mode, at the player's size and hand: a size that won't fit the screen steps down
 *  until it does (never under medium; small always fits), and left-handed mirrors everything */
export function layoutFor(w: number, h: number, mode: Mode, prefs: TouchPrefs = DEFAULT_TOUCH): Layout {
  let s = SIZES[prefs.size];
  let L = build(w, h, mode, s);
  while (s > 1 && clash(L, w, h)) {
    s = Math.max(1, Math.round((s - 0.05) * 100) / 100);
    L = build(w, h, mode, s);
  }
  return prefs.left ? mirror(L, w) : L;
}

const scaled = (r: Ring, s: number): Ring => ({
  mx: r.mx * s,
  my: r.my * s,
  main: r.main * s,
  small: r.small * s,
  inner: r.inner * s,
  outer: r.outer * s,
  stick: r.stick * s,
  stickAt: [r.stickAt[0] * s, r.stickAt[1] * s],
  crouch: r.crouch * s,
  crouchAt: [r.crouchAt[0] * s, r.crouchAt[1] * s],
  hotSlot: r.hotSlot,
  wheel: r.wheel * s,
  wheelAt: [r.wheelAt[0] * s, r.wheelAt[1] * s],
});

function build(w: number, h: number, mode: Mode, scale: number): Layout {
  const shape = shapeOf(w, h);
  const r = scaled(RINGS[shape], scale);
  const buttons: Partial<Record<Action, Spot>> = {};
  for (const [slot, action] of Object.entries(LAYOUTS[mode]) as [Slot, Action][]) buttons[action] = slotSpot(r, slot);
  const wheel = mode === 'drive' || mode === 'kart';
  if (ON_FOOT(mode)) buttons.crouch = { side: 'l', x: round(r.crouchAt[0]), y: round(r.crouchAt[1]), d: round(r.crouch) };
  const stick: Spot = wheel
    ? { side: 'l', x: round(r.wheelAt[0]), y: round(r.wheelAt[1]), d: round(r.wheel) }
    : { side: 'l', x: round(r.stickAt[0]), y: round(r.stickAt[1]), d: round(r.stick) };
  const top = clusterTop(r);
  let hotbar: Layout['hotbar'];
  let prompt: Layout['prompt'];
  if (shape === 'side') {
    // On its side: low, left of Jump; the prompt over the middle of the gap between the stick and the arc
    const a1 = slotSpot(r, 'a1');
    const edge = round(a1.x + a1.d / 2 + 12);
    hotbar = { side: 'r', edge, bottom: 10, slot: r.hotSlot };
    const leftEdge = Math.max(r.stickAt[0] + r.stick / 2, r.crouchAt[0] + r.crouch / 2);
    prompt = { cx: round((leftEdge + (w - clusterLeft(r))) / 2), bottom: 10 + r.hotSlot + 12 };
  } else {
    // Upright: the hotbar over the arc, the prompt over the hotbar
    hotbar = { side: 'r', edge: 12, bottom: round(top + 12), slot: r.hotSlot };
    prompt = { cx: round(w / 2), bottom: round(top + 12 + r.hotSlot + 14) };
  }
  return { shape, buttons, stick, hotbar, prompt, scale };
}

/** Left-handed: every spot to the other side, the hotbar to the left edge, the prompt's centre mirrored */
function mirror(L: Layout, w: number): Layout {
  const flip = (s: Spot): Spot => ({ ...s, side: s.side === 'r' ? 'l' : 'r' });
  const buttons: Partial<Record<Action, Spot>> = {};
  for (const [a, s] of Object.entries(L.buttons) as [Action, Spot][]) buttons[a] = flip(s);
  return { ...L, buttons, stick: flip(L.stick), hotbar: { ...L.hotbar, side: L.hotbar.side === 'r' ? 'l' : 'r' }, prompt: { ...L.prompt, cx: round(w - L.prompt.cx) } };
}

/* ---------- Checking a layout fits (the size's step-down, and the tests) ---------- */
/** The header's height on a phone (one row: docs/controls-plan.md Phase 3) */
export const HEAD_ROOM = 64;
/** At least this between any two buttons, the stick and the rest */
export const GAP = 6;
/** The hotbar at its fullest in practice: two weapons, the thing in his hand and a snack */
export const HOT_SLOTS = 4;
/** The door prompt's box at its usual widest */
export const PROMPT_BOX = { w: 210, h: 42 };

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
export function hotbarBox(L: Layout, w: number, h: number): Box {
  const s = L.hotbar.slot;
  const hw = HOT_SLOTS * s + (HOT_SLOTS - 1) * 4;
  const x0 = L.hotbar.side === 'r' ? w - L.hotbar.edge - hw : L.hotbar.edge;
  return { x0, x1: x0 + hw, y0: h - L.hotbar.bottom - s, y1: h - L.hotbar.bottom };
}
export function promptBox(L: Layout, h: number): Box {
  return { x0: L.prompt.cx - PROMPT_BOX.w / 2, x1: L.prompt.cx + PROMPT_BOX.w / 2, y0: h - L.prompt.bottom - PROMPT_BOX.h, y1: h - L.prompt.bottom };
}
/** A circle and a box at least `gap` apart */
function circleClear(s: Spot, b: Box, w: number, h: number, gap: number) {
  const [cx, cy] = centreOf(s, w, h);
  const nx = Math.max(b.x0, Math.min(cx, b.x1));
  const ny = Math.max(b.y0, Math.min(cy, b.y1));
  return Math.hypot(cx - nx, cy - ny) >= s.d / 2 + gap;
}
const inside = (b: Box, w: number, h: number) => b.x0 >= 0 && b.x1 <= w && b.y0 >= HEAD_ROOM && b.y1 <= h;
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** What's wrong with a layout on a `w` x `h` screen, or null when it fits: every button and the stick on screen
 *  under the header and `GAP` apart; on foot the hotbar and the prompt on screen, clear of them and each other */
export function clash(L: Layout, w: number, h: number): string | null {
  const all = [...Object.entries(L.buttons), ['stick', L.stick] as const] as [string, Spot][];
  for (const [name, s] of all) {
    const [cx, cy] = centreOf(s, w, h);
    if (!inside({ x0: cx - s.d / 2, x1: cx + s.d / 2, y0: cy - s.d / 2, y1: cy + s.d / 2 }, w, h)) return `${name} off screen`;
  }
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) {
      const [n1, s1] = all[i];
      const [n2, s2] = all[j];
      const [x1, y1] = centreOf(s1, w, h);
      const [x2, y2] = centreOf(s2, w, h);
      if (Math.hypot(x1 - x2, y1 - y2) - (s1.d + s2.d) / 2 < GAP) return `${n1} and ${n2} touch`;
    }
  if (!L.buttons.crouch) return null;
  // (on foot: the hotbar and the prompt)
  const hot = hotbarBox(L, w, h);
  const pr = promptBox(L, h);
  for (const [name, b] of [['hotbar', hot], ['prompt', pr]] as const) {
    if (!inside(b, w, h)) return `${name} off screen`;
    for (const [n, s] of all) if (!circleClear(s, b, w, h, 4)) return `${name} over ${n}`;
  }
  return overlaps(hot, pr) ? 'hotbar under the prompt' : null;
}

/** How high the arc reaches (any slot's top) */
function clusterTop(r: Ring): number {
  let top = 0;
  for (const s of ['main', 'a1', 'a2', 'a3', 'b1', 'b2'] as Slot[]) {
    const p = slotSpot(r, s);
    top = Math.max(top, p.y + p.d / 2);
  }
  return top;
}

/** How far in from the right edge the arc reaches (any slot's left side) */
function clusterLeft(r: Ring): number {
  let left = 0;
  for (const s of ['main', 'a1', 'a2', 'a3', 'b1', 'b2'] as Slot[]) {
    const p = slotSpot(r, s);
    left = Math.max(left, p.x + p.d / 2);
  }
  return left;
}

/** A spot's centre on the screen, from its top-left corner (for the tests and the page) */
export function centreOf(s: Spot, w: number, h: number): [number, number] {
  return [s.side === 'r' ? w - s.x : s.x, h - s.y];
}
