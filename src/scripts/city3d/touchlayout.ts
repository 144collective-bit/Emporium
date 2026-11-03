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
  /** The hotbar: a right-anchored row (`right` from the right edge, `bottom`), its slots `slot` square */
  hotbar: { right: number; bottom: number; slot: number };
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

/** The controls on foot for a screen `w` x `h` (CSS pixels, inside the safe areas) in mode `mode` */
export function footLayout(w: number, h: number, mode: FootMode): Layout {
  return layoutFor(w, h, mode);
}

/** The controls in any mode (on foot it's footLayout's: Crouch, the hotbar and the prompt with them) */
export function layoutFor(w: number, h: number, mode: Mode): Layout {
  const shape = shapeOf(w, h);
  const r = RINGS[shape];
  const buttons: Partial<Record<Action, Spot>> = {};
  for (const [slot, action] of Object.entries(LAYOUTS[mode]) as [Slot, Action][]) buttons[action] = slotSpot(r, slot);
  const wheel = mode === 'drive' || mode === 'kart';
  if (ON_FOOT(mode)) buttons.crouch = { side: 'l', x: r.crouchAt[0], y: r.crouchAt[1], d: r.crouch };
  const stick: Spot = wheel ? { side: 'l', x: r.wheelAt[0], y: r.wheelAt[1], d: r.wheel } : { side: 'l', x: r.stickAt[0], y: r.stickAt[1], d: r.stick };
  const top = clusterTop(r);
  let hotbar: Layout['hotbar'];
  let prompt: Layout['prompt'];
  if (shape === 'side') {
    // On its side: low, left of Jump; the prompt over the middle of the gap between the stick and the arc
    const a1 = slotSpot(r, 'a1');
    const right = a1.x + a1.d / 2 + 12;
    hotbar = { right, bottom: 10, slot: r.hotSlot };
    const leftEdge = Math.max(r.stickAt[0] + r.stick / 2, r.crouchAt[0] + r.crouch / 2);
    prompt = { cx: round((leftEdge + (w - clusterLeft(r))) / 2), bottom: 10 + r.hotSlot + 12 };
  } else {
    // Upright: the hotbar over the arc, the prompt over the hotbar
    hotbar = { right: 12, bottom: round(top + 12), slot: r.hotSlot };
    prompt = { cx: round(w / 2), bottom: round(top + 12 + r.hotSlot + 14) };
  }
  return { shape, buttons, stick, hotbar, prompt };
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
