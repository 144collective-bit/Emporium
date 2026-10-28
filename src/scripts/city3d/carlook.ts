/*
 * The garage's customisation (vehicle plan Phase 5): DOM-free, tested in
 * tests/carlook.test.ts, and kept out of the boot (the garage menu and the
 * cars' fine-detail chunk read it). All of it free, and only for the city.
 *
 * mycar.ts has what can be picked (the ids, `CarLook`, `cleanLook()`); this
 * names them for the menu, says what each looks like, and where each part
 * goes on a model, from its own numbers (`CarSpec`), so every part fits
 * every model:
 *
 * - **Wheels:** a rim style, its colour, and how big the rim is in the tyre
 *   (`RIM_SIZE`: the tyre's outside stays where it is, in the arch, so a
 *   bigger rim is a lower profile tyre).
 * - **The kit:** a front splitter, side skirts (under the doors' bottom
 *   edge, so a door never swings into them), a rear diffuser and a spoiler
 *   (`kitFit()`). A part picked over the model's own (`STOCK_PARTS`: the
 *   coupe's splitter, the supercar's wing) takes the model's own off
 *   (`bareOf()`, cars.ts's `build()`).
 * - **Liveries and decals:** a pattern in a second colour, a number and a
 *   mark on the doors (`DOOR_PANEL`: where they're drawn on the side).
 * - **Underglow:** neon under the car, dark by day, soft at night.
 */
import type { CarSpec } from './carspec';
import { CAR_PAINTS, STOCK_LOOK, type CarLook, type PlayerCar } from './mycar';
import { INTERIORS } from './carinside';

type Names<K extends string> = Record<K, string>;

export const RIM_NAMES: Names<CarLook['rim']> = { stock: 'Stock', five: 'Five spoke', mesh: 'Mesh', dish: 'Dish', turbine: 'Turbine', split: 'Split spoke' };
/** Rim colours (`stock`: the model's own) */
export const RIM_HEX: Record<Exclude<CarLook['rimColour'], 'stock'>, string> = {
  silver: '#c9c4e6',
  gunmetal: '#55506a',
  black: '#24222e',
  white: '#f3f2f7',
  gold: '#ffd23f',
  bronze: '#b8794a',
  cyan: '#00c2ff',
  magenta: '#e219e5',
};
export const RIM_COLOUR_NAMES: Names<CarLook['rimColour']> = { stock: 'Stock', silver: 'Silver', gunmetal: 'Gunmetal', black: 'Black', white: 'White', gold: 'Gold', bronze: 'Bronze', cyan: 'Cyan', magenta: 'Magenta' };
export const RIM_SIZE_NAMES: Names<CarLook['rimSize']> = { stock: 'Stock', big: 'Big rims', huge: 'Low profile' };
/** How far out the rim reaches in the tyre, a share of the wheel's radius (the tyre's outside stays at 1) */
export const RIM_SIZE: Record<CarLook['rimSize'], number> = { stock: 0.62, big: 0.7, huge: 0.78 };

export const SPLITTER_NAMES: Names<CarLook['splitter']> = { stock: 'Stock', lip: 'Lip', race: 'Race' };
export const SKIRT_NAMES: Names<CarLook['skirts']> = { stock: 'Stock', on: 'Skirts' };
export const DIFFUSER_NAMES: Names<CarLook['diffuser']> = { stock: 'Stock', fins: 'Finned' };
export const SPOILER_NAMES: Names<CarLook['spoiler']> = { stock: 'Stock', none: 'None', lip: 'Lip', duck: 'Ducktail', wing: 'Wing' };
export const LIVERY_NAMES: Names<CarLook['livery']> = { none: 'Plain', twotone: 'Two-tone', stripes: 'Racing stripes', side: 'Side stripe', flames: 'Flames' };
export const MARK_NAMES: Names<CarLook['mark']> = { none: 'None', diamond: 'Diamond', seven: 'Sector 7', bolt: 'Bolt', star: 'Star', heart: 'Heart', wave: 'Wave', eye: 'Eye', mask: 'Mask' };
/** The numbers on offer for the doors (0: none) */
export const NUMBERS = [0, 1, 7, 8, 13, 21, 24, 44, 69, 77, 88, 99];

/** Underglow in the PulseChain colours */
export const GLOW_HEX: Record<Exclude<CarLook['glow'], 'off'>, string> = { cyan: '#00c2ff', magenta: '#e219e5', violet: '#8000ff', pink: '#ff6ad5', blue: '#3d6bff' };
export const GLOW_NAMES: Names<CarLook['glow']> = { off: 'Off', cyan: 'Cyan', magenta: 'Magenta', violet: 'Violet', pink: 'Pink', blue: 'Blue' };

export const paintOf = (id: CarLook['accent']) => CAR_PAINTS.find((p) => p.id === id)!.hex;

/** The parts a model comes with of its own (cars.ts's `EXTRAS`): a kit part picked over one takes it off */
export const STOCK_PARTS: Record<PlayerCar, ('spoiler' | 'splitter' | 'diffuser' | 'skirts')[]> = {
  hatch: ['spoiler'],
  sedan: ['spoiler'],
  coupe: ['spoiler', 'splitter', 'diffuser'],
  pickup: [],
  van: [],
  muscle: ['spoiler', 'skirts'],
  suv: ['skirts'],
  super: ['spoiler', 'splitter', 'diffuser'],
  classic: [],
  offroad: ['skirts'],
  ev: [],
};

/** What the model's own build leaves out for this look (cars.ts `build()`'s `bare`): '' when nothing */
export function bareOf(id: PlayerCar, l: CarLook) {
  return STOCK_PARTS[id].filter((k) => l[k] !== 'stock').join(' ');
}

/** Is it the model as it comes? (nothing to draw) */
export const isStock = (l: CarLook) => (Object.keys(STOCK_LOOK) as (keyof CarLook)[]).every((k) => l[k] === STOCK_LOOK[k]);
export const sameLook = (a: CarLook, b: CarLook) => (Object.keys(STOCK_LOOK) as (keyof CarLook)[]).every((k) => a[k] === b[k]);
/** A key for the look's parts that need geometry (the wheels, the kit) */
export const wheelKey = (id: PlayerCar, l: CarLook) => `${id}|${l.rim}|${l.rimColour}|${l.rimSize}`;
export const kitKey = (id: PlayerCar, l: CarLook) => `${id}|${l.splitter}|${l.skirts}|${l.diffuser}|${l.spoiler}`;

/** The body's top at x (cars.ts `topAt()`, kept here DOM-free) */
export function topOf(s: CarSpec, x: number) {
  const t = s.top;
  if (x >= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    const [ax, ay] = t[i - 1];
    const [bx, by] = t[i];
    if (x <= ax && x >= bx) return ay + ((by - ay) * (x - ax)) / (bx - ax || 1);
  }
  return t[t.length - 1][1];
}

export interface KitFit {
  /** The splitter: from the nose's face forward, at the bumper's foot, its width */
  splitter: { x: number; y: number; w: number };
  /** The skirts: along each side between the arches, from under the sill to under the doors' bottom edge */
  skirts: { x0: number; x1: number; y0: number; y1: number; z: number };
  /** The diffuser: under the tail */
  diffuser: { x: number; y: number; w: number };
  /**
   * The spoiler: on the boot's deck at its tail (`deck`), or at the roof's back edge over a hatch or a tail
   * door (`roof`); where it sits and how wide
   */
  spoiler: { mode: 'deck' | 'roof'; x: number; y: number; w: number };
}

/** Where each part of the kit goes on a model */
export function kitFit(s: CarSpec): KitFit {
  const half = s.L / 2;
  const [rb, rr] = s.cabin;
  const door = INTERIORS[s.id]?.door;
  const arch = s.r + 0.1;
  // (a hatch or a tail door: the cabin's back near the tail and near upright; a fastback's slope takes it on the deck)
  const roof = rb[0] < -half + 0.25 && rr[0] - rb[0] < 0.25;
  const deckX = -half + 0.1;
  return {
    splitter: { x: half + 0.02, y: s.clr - 0.005, w: s.W * 0.96 },
    skirts: {
      x0: s.axles[0] + arch,
      x1: s.axles[1] - arch,
      y0: s.clr - 0.03,
      // (under the doors' bottom edge, so the doors clear them as they swing)
      y1: Math.min(s.clr + 0.07, (door?.y0 ?? s.clr + 0.08) - 0.01),
      z: s.W / 2 + 0.03,
    },
    diffuser: { x: -half + 0.04, y: s.clr + 0.02, w: s.W * 0.8 },
    spoiler: roof ? { mode: 'roof', x: Math.max(rr[0] - 0.02, -half + 0.08), y: rr[1], w: s.W * s.cabinW * 0.96 } : { mode: 'deck', x: deckX, y: topOf(s, deckX), w: s.W * 0.92 },
  };
}

/**
 * The doors' panel, where the number and the mark go (in the side's numbers: x along the car, y up): the front
 * door's middle, between the sill and the window line
 */
export function doorPanel(s: CarSpec) {
  const d = INTERIORS[s.id]?.door;
  const x = d ? (d.back + d.hinge) / 2 : 0;
  const y0 = s.clr + 0.08;
  const y1 = topOf(s, x) - 0.04;
  return { x, y: (y0 + y1) / 2, h: y1 - y0 };
}
