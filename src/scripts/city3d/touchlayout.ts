/*
 * Where the touch controls stand (docs/controls-plan.md Phases 1 and 2): the same slots in every mode, a big
 * main button in the bottom-right corner and the rest in an arc round it (an inner ring straight left, up-left
 * and straight up, an outer ring between), the stick bottom-left (with Crouch over it on foot; bigger at the
 * wheel), and on foot the hotbar and the door prompt kept clear of them. On foot, at the wheel (the car, the
 * bike, the boat, the aircraft, your own kart), in a kart race and in the Fight Club's ring. DOM-free (tested in tests/touchlayout.test.ts); controls.ts puts it on the
 * page as CSS variables.
 *
 * Phase 6 (moving the buttons): the player can drag a family's buttons (on foot, at the wheel, in the ring) where
 * they like, per screen shape; `TouchPrefs.arrange` holds where each slot's centre went, as a share of the screen,
 * in the right hand's frame (left-handed mirrors it as it mirrors the rest), and a layout that would clash on
 * this screen falls back to the slots.
 *
 * Every number is CSS pixels. A button is its centre and its diameter: `x` from the right edge for the right
 * cluster (from the left edge for the left one), `y` from the bottom edge; the page adds the safe areas.
 */

export type Action =
  | 'jump' | 'sprint' | 'crouch' | 'punch' | 'block' | 'kick' | 'fire' | 'aim' | 'reload' | 'swap'
  | 'gas' | 'brake' | 'horn' | 'view' | 'drift' | 'dodge' | 'item';
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
  // (the item button only shows in an items race, kart.ts `has-items`)
  kart: { main: 'gas', a1: 'brake', a2: 'drift', a3: 'view', b2: 'item' },
  ring: { main: 'punch', a1: 'dodge', a2: 'block', a3: 'view', b2: 'kick' },
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
  /** Buttons moved by hand (Phase 6): by `arrangeKey()`, each item's centre as [share of the width from the
   *  left, share of the height from the top], in the right hand's frame */
  arrange: Arrangement;
}
export type Arrangement = Partial<Record<string, Partial<Record<Item, [number, number]>>>>;
export const DEFAULT_TOUCH: TouchPrefs = { size: 'medium', alpha: 1, left: false, arrange: {} };

/* ---------- Moving the buttons (Phase 6) ---------- */
/** The families of modes arranged together: on foot (empty hands and a gun out share the slots), at the wheel
 *  (driving, riding, boating, flying and a kart race), the Fight Club's ring */
export type Family = 'foot' | 'wheel' | 'ring';
export const FAMILIES: Family[] = ['foot', 'wheel', 'ring'];
export const familyOf = (m: Mode): Family => (ON_FOOT(m) ? 'foot' : m === 'ring' ? 'ring' : 'wheel');
/** What can be moved: the slots, the stick and (on foot) Crouch */
export type Item = Slot | 'stick' | 'crouch';
const SLOTS: Slot[] = ['main', 'a1', 'a2', 'a3', 'b1', 'b2'];
/** The mode the arranging screen shows for a family: the one using the most of its slots */
export const SHOWN: Record<Family, Mode> = { foot: 'armed', wheel: 'kart', ring: 'ring' };
/** A family's items, in the order the arranging screen lists them */
export function itemsOf(f: Family): Item[] {
  const slots = SLOTS.filter((s) => LAYOUTS[SHOWN[f]][s]);
  return f === 'foot' ? [...slots, 'crouch', 'stick'] : [...slots, 'stick'];
}
/** Where an arrangement is kept: per family and per screen shape (upright and narrow share one) */
export const arrangeKey = (f: Family, shape: Shape) => `${f}:${shape === 'side' ? 'side' : 'up'}`;
const ARRANGE_KEYS = FAMILIES.flatMap((f) => [arrangeKey(f, 'up'), arrangeKey(f, 'side')]);

/** Anything saved, made sound (an older save has none: the defaults) */
export function cleanTouch(v: unknown): TouchPrefs {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const size = TOUCH_SIZES.includes(o.size as TouchSize) ? (o.size as TouchSize) : DEFAULT_TOUCH.size;
  const a = typeof o.alpha === 'number' && Number.isFinite(o.alpha) ? o.alpha : DEFAULT_TOUCH.alpha;
  const arrange: Arrangement = {};
  const ar = (o.arrange && typeof o.arrange === 'object' ? o.arrange : {}) as Record<string, unknown>;
  for (const key of ARRANGE_KEYS) {
    const got = ar[key];
    if (!got || typeof got !== 'object') continue;
    const fam = key.split(':')[0] as Family;
    const out: Partial<Record<Item, [number, number]>> = {};
    for (const item of itemsOf(fam)) {
      const p = (got as Record<string, unknown>)[item];
      if (Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1))
        out[item] = [Math.round(p[0] * 1e4) / 1e4, Math.round(p[1] * 1e4) / 1e4];
    }
    if (Object.keys(out).length) arrange[key] = out;
  }
  return { size, alpha: Math.round(Math.min(1, Math.max(ALPHA_MIN, a)) * 100) / 100, left: o.left === true, arrange };
}

/** The controls on foot for a screen `w` x `h` (CSS pixels, inside the safe areas) in mode `mode` */
export function footLayout(w: number, h: number, mode: FootMode, prefs: TouchPrefs = DEFAULT_TOUCH): Layout {
  return layoutFor(w, h, mode, prefs);
}

/** The controls in any mode, at the player's size and hand: a size that won't fit the screen steps down
 *  until it does (never under medium; small always fits), and left-handed mirrors everything */
export function layoutFor(w: number, h: number, mode: Mode, prefs: TouchPrefs = DEFAULT_TOUCH): Layout {
  // (buttons the player moved, if they still fit this screen at this size; the slots otherwise)
  const moved = prefs.arrange?.[arrangeKey(familyOf(mode), shapeOf(w, h))];
  let L = moved ? sized(w, h, mode, prefs.size, prefs.left, moved) : null;
  if (!L || clash(L, w, h)) L = sized(w, h, mode, prefs.size, prefs.left);
  return L;
}

/** The layout at `size`, stepped down towards medium until it fits; in the hand it's for (the readouts it must
 *  clear stay put while the buttons change sides) */
function sized(w: number, h: number, mode: Mode, size: TouchSize, left: boolean, moved?: Partial<Record<Item, [number, number]>>): Layout {
  const make = (s: number) => {
    const L = build(w, h, mode, s, moved);
    return left ? mirror(L, w) : L;
  };
  let s = SIZES[size];
  let L = make(s);
  while (s > 1 && clash(L, w, h)) {
    s = Math.max(1, Math.round((s - 0.05) * 100) / 100);
    L = make(s);
  }
  return L;
}

/** A spot of diameter `d` with its centre at (`cx`, `cy`) from the screen's top-left, anchored to the nearer side */
export function spotAt(cx: number, cy: number, d: number, w: number, h: number): Spot {
  const side = cx > w / 2 ? 'r' : 'l';
  return { side, x: round(side === 'r' ? w - cx : cx), y: round(h - cy), d };
}

/** The layout with one item moved to (`cx`, `cy`) on the screen, or null where it wouldn't fit there (off screen,
 *  under the header, touching another button, the stick, the hotbar or the prompt): the arranging screen's
 *  check as a button is dragged. `mode` is the family's shown mode (`SHOWN`). */
export function moveItem(L: Layout, mode: Mode, item: Item, cx: number, cy: number, w: number, h: number): Layout | null {
  const next: Layout = { ...L, buttons: { ...L.buttons } };
  if (item === 'stick') next.stick = spotAt(cx, cy, L.stick.d, w, h);
  else {
    const action = item === 'crouch' ? 'crouch' : LAYOUTS[mode][item];
    const was = action && L.buttons[action];
    if (!action || !was) return null;
    next.buttons[action] = spotAt(cx, cy, was.d, w, h);
  }
  return clash(next, w, h) ? null : next;
}

/** Where each of a family's items stands on a layout, as shares of the screen in the right hand's frame (what
 *  `TouchPrefs.arrange` keeps; `left` un-mirrors a left-handed screen's) */
export function arrangementOf(L: Layout, f: Family, w: number, h: number, left: boolean): Partial<Record<Item, [number, number]>> {
  const out: Partial<Record<Item, [number, number]>> = {};
  for (const item of itemsOf(f)) {
    const s = item === 'stick' ? L.stick : L.buttons[item === 'crouch' ? 'crouch' : LAYOUTS[SHOWN[f]][item]!];
    if (!s) continue;
    const [cx, cy] = centreOf(s, w, h);
    out[item] = [Math.round(((left ? w - cx : cx) / w) * 1e4) / 1e4, Math.round((cy / h) * 1e4) / 1e4];
  }
  return out;
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

function build(w: number, h: number, mode: Mode, scale: number, moved?: Partial<Record<Item, [number, number]>>): Layout {
  const shape = shapeOf(w, h);
  const r = scaled(RINGS[shape], scale);
  const buttons: Partial<Record<Action, Spot>> = {};
  for (const [slot, action] of Object.entries(LAYOUTS[mode]) as [Slot, Action][]) buttons[action] = slotSpot(r, slot);
  const wheel = mode === 'drive' || mode === 'kart';
  if (ON_FOOT(mode)) buttons.crouch = { side: 'l', x: round(r.crouchAt[0]), y: round(r.crouchAt[1]), d: round(r.crouch) };
  const stick: Spot = wheel
    ? { side: 'l', x: round(r.wheelAt[0]), y: round(r.wheelAt[1]), d: round(r.wheel) }
    : { side: 'l', x: round(r.stickAt[0]), y: round(r.stickAt[1]), d: round(r.stick) };
  if (moved) {
    // (the player's places: the centres they chose, at this size)
    const at = (p: [number, number], d: number) => spotAt(p[0] * w, p[1] * h, d, w, h);
    for (const [slot, action] of Object.entries(LAYOUTS[mode]) as [Slot, Action][]) {
      const p = moved[slot];
      if (p) buttons[action] = at(p, buttons[action]!.d);
    }
    if (moved.crouch && buttons.crouch) buttons.crouch = at(moved.crouch, buttons.crouch.d);
    if (moved.stick) Object.assign(stick, at(moved.stick, stick.d));
  }
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

/**
 * The readouts pinned under the header on touch screens, as their CSS places them (docs/polish-plan.md Phase 3):
 * on foot the mission tracker's pill (missions.css, top left) and the waypoint's compass (worldmap.css: top right,
 * and on a short screen top centre, clear of the arc); at the wheel the speed or flight readout (walk.css, fly.css,
 * top left); in a kart race and in the ring their HUDs across the top (karts.css, fight.css).
 */
export const HUD = {
  tracker: { left: 12, top: 8, w: 120, h: 32 },
  compass: { right: 16, top: 12, w: 216, h: 40 },
  readout: { left: 12, top: 10, w: 250, h: 44 },
  /** The race's and the ring's HUDs: across the top, and on a short screen ending `arc` in from the buttons' side */
  band: { side: 16, top: 12, h: 60, arc: 136 },
};
/** The readouts a layout's mode shows, as boxes on a `w` x `h` screen, by name */
export function hudBoxes(L: Layout, w: number, h: number): [string, Box][] {
  const top = (b: { top: number; h: number }) => ({ y0: HEAD_ROOM + b.top, y1: HEAD_ROOM + b.top + b.h });
  if (L.buttons.crouch) {
    const c = HUD.compass;
    const x0 = L.shape === 'side' ? Math.round(w / 2 - c.w / 2) : w - c.right - c.w;
    return [
      ['tracker', { x0: HUD.tracker.left, x1: HUD.tracker.left + HUD.tracker.w, ...top(HUD.tracker) }],
      ['compass', { x0, x1: x0 + c.w, ...top(c) }],
    ];
  }
  if (L.buttons.drift || L.buttons.dodge) {
    const b = HUD.band;
    const main = L.buttons.punch ?? L.buttons.gas;
    // (on a short screen the band stops short of the arc, whichever hand it's in: karts.css, fight.css)
    const left = L.shape === 'side' && main?.side === 'l' ? b.arc : b.side;
    const right = L.shape === 'side' && main?.side !== 'l' ? b.arc : b.side;
    return [[L.buttons.drift ? 'kart HUD' : 'fight HUD', { x0: left, x1: w - right, ...top(b) }]];
  }
  if (L.buttons.gas) return [['readout', { x0: HUD.readout.left, x1: HUD.readout.left + HUD.readout.w, ...top(HUD.readout) }]];
  return [];
}

/** What's wrong with a layout on a `w` x `h` screen, or null when it fits: every button and the stick on screen
 *  under the header and `GAP` apart, clear of the mode's readouts (`hudBoxes()`); on foot the hotbar and the
 *  prompt on screen, clear of them and each other */
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
  // (the readouts under the header: a button never comes up under one)
  for (const [name, b] of hudBoxes(L, w, h)) for (const [n, s] of all) if (!circleClear(s, b, w, h, GAP)) return `${n} under the ${name}`;
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
