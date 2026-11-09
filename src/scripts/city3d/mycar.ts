/*
 * Your own car: which model, what paint, and how each model drives. Picked
 * at the garage on the south bank (garage-ui.ts) and kept in the browser.
 * The five starters are free; the other three are bought there for Dorras
 * (catalog.ts has the prices and levels, tycoon.ts the purchase and the
 * mods that raise these numbers). Cars are only for the city: never real
 * money, never tied to the store or the token.
 *
 * Kept free of the DOM and of scene code, like the other shared data, so a
 * game server can check a car the same way later.
 */
import type { Feel } from './drive-sim';
import { CAR_PAINTS, PLAYER_CARS, readSaved, type CarId, type PaintId, type PlayerCar, type Voice } from './vehicleids';
export { CAR_PAINTS, PLAYER_CARS, type CarId, type PaintId, type PlayerCar, type Voice };

/**
 * Each model's engine voice (sound.ts `engine()`; the polish pass, the owner's call): the hatch small and thin, the
 * saloons and the vans the plain hum, the supercar higher, the muscle car and the classic a V8's lump, the Glow Pod
 * an electric whine; the traffic's own models too (the bus, the trucks and the rig big and lumpy), for anything
 * that voices one later; the Neon Mile's limo a saloon's, its party bus big and lumpy
 */
export const VOICE: Record<CarId, Voice> = {
  hatch: 'small',
  sedan: 'car',
  coupe: 'car',
  pickup: 'car',
  van: 'car',
  bus: 'v8',
  muscle: 'v8',
  suv: 'car',
  super: 'race',
  exec: 'car',
  classic: 'v8',
  offroad: 'car',
  ev: 'whine',
  police: 'car',
  truck: 'v8',
  rig: 'v8',
  limo: 'car',
  partybus: 'v8',
};


/** What the garage says about each one, and how it drives (0..1, for the stat bars and the handling) */
export const DRIVE: Record<PlayerCar, { kind: string; blurb: string; speed: number; accel: number; grip: number; electric?: true }> = {
  hatch: { kind: 'Compact', blurb: 'Small, quick, easy to park', speed: 0.55, accel: 0.75, grip: 0.7 },
  sedan: { kind: 'Saloon', blurb: 'Smooth, steady all-rounder', speed: 0.7, accel: 0.6, grip: 0.65 },
  coupe: { kind: 'Sports', blurb: 'Low, fast, grips every corner', speed: 0.95, accel: 0.9, grip: 0.9 },
  pickup: { kind: 'Pickup', blurb: 'Hauls a lot, slow to turn', speed: 0.6, accel: 0.5, grip: 0.5 },
  van: { kind: 'Van', blurb: 'Roomy and slow', speed: 0.45, accel: 0.4, grip: 0.45 },
  muscle: { kind: 'Muscle', blurb: 'Fast straights, lively corners', speed: 0.85, accel: 0.95, grip: 0.6 },
  suv: { kind: 'SUV', blurb: 'Tough, huge boot, leans in bends', speed: 0.65, accel: 0.55, grip: 0.75 },
  super: { kind: 'Supercar', blurb: 'Low, wide, grips like glue', speed: 1, accel: 1, grip: 0.95 },
  // Vehicle plan Phase 6: three more
  classic: { kind: 'Classic', blurb: 'Chrome, fins, a soft ride', speed: 0.66, accel: 0.5, grip: 0.55 },
  offroad: { kind: 'Off-roader', blurb: 'Lifted, sure-footed on rough ground', speed: 0.6, accel: 0.62, grip: 0.8 },
  ev: { kind: 'Electric', blurb: 'Silent, instant pick-up', speed: 0.78, accel: 0.98, grip: 0.82, electric: true },
};

/**
 * Each model's feel on the road (vehicle plan Phase 4, drive-sim.ts `Feel`; the garage's three bars stay as they
 * are): the hatch nimble, the saloon steady, the coupe darting, the pickup heavy with a tail that wanders, the van
 * wallowing, the muscle car's tail stepping out under power, the SUV planted, the supercar gripping. The back
 * wheels drive the coupe, the pickup, the muscle car and the supercar.
 */
export const FEEL: Record<PlayerCar, Feel> = {
  hatch: { mass: 0.8, loose: 0.25, rwd: false, steerRate: 3.8, lock: 0.66 },
  sedan: { mass: 1, loose: 0.3, rwd: false, steerRate: 3.2, lock: 0.62 },
  coupe: { mass: 0.8, loose: 0.45, rwd: true, steerRate: 4.6, lock: 0.64 },
  pickup: { mass: 1.4, loose: 0.5, rwd: true, steerRate: 2.6, lock: 0.58 },
  van: { mass: 1.7, loose: 0.2, rwd: false, steerRate: 2.3, lock: 0.56 },
  muscle: { mass: 1.2, loose: 0.85, rwd: true, steerRate: 3, lock: 0.6 },
  suv: { mass: 1.4, loose: 0.2, rwd: false, steerRate: 2.8, lock: 0.58 },
  super: { mass: 0.9, loose: 0.2, rwd: true, steerRate: 4.2, lock: 0.62 },
  // The classic wallows and its tail wanders, the off-roader is heavy and sure, the electric hatch is planted and quick to turn
  classic: { mass: 1.3, loose: 0.6, rwd: true, steerRate: 2.4, lock: 0.6 },
  offroad: { mass: 1.6, loose: 0.15, rwd: false, steerRate: 2.6, lock: 0.64 },
  ev: { mass: 1.05, loose: 0.1, rwd: false, steerRate: 4.4, lock: 0.64 },
};

/** How many goods each model carries in its boot or bed (more with the garage's roof rack) */
export const CARGO: Record<PlayerCar, number> = { hatch: 16, sedan: 20, coupe: 8, pickup: 40, van: 80, muscle: 12, suv: 60, super: 6, classic: 24, offroad: 44, ev: 14 };


/*
 * The garage's customisation (vehicle plan Phase 5, all free): what's on offer, as ids (carlook.ts names them and
 * says how each looks; carstyle.ts draws them). `stock` is the model as it comes.
 */
export const RIMS = ['stock', 'five', 'mesh', 'dish', 'turbine', 'split'] as const;
export const RIM_COLOURS = ['stock', 'silver', 'gunmetal', 'black', 'white', 'gold', 'bronze', 'cyan', 'magenta'] as const;
export const RIM_SIZES = ['stock', 'big', 'huge'] as const;
export const SPLITTERS = ['stock', 'lip', 'race'] as const;
export const SKIRTS = ['stock', 'on'] as const;
export const DIFFUSERS = ['stock', 'fins'] as const;
export const SPOILERS = ['stock', 'none', 'lip', 'duck', 'wing'] as const;
export const LIVERIES = ['none', 'twotone', 'stripes', 'side', 'flames'] as const;
/** The city's made-up marks (profile-data.ts `MARKS`), on the doors */
export const CAR_MARKS = ['none', 'diamond', 'seven', 'bolt', 'star', 'heart', 'wave', 'eye', 'mask'] as const;
export const GLOWS = ['off', 'cyan', 'magenta', 'violet', 'pink', 'blue'] as const;
type Of<L extends readonly string[]> = L[number];
export interface CarLook {
  rim: Of<typeof RIMS>;
  rimColour: Of<typeof RIM_COLOURS>;
  rimSize: Of<typeof RIM_SIZES>;
  splitter: Of<typeof SPLITTERS>;
  skirts: Of<typeof SKIRTS>;
  diffuser: Of<typeof DIFFUSERS>;
  spoiler: Of<typeof SPOILERS>;
  livery: Of<typeof LIVERIES>;
  /** The livery's second colour */
  accent: PaintId;
  /** A racing number on the doors (0: none) */
  number: number;
  mark: Of<typeof CAR_MARKS>;
  glow: Of<typeof GLOWS>;
}
export const STOCK_LOOK: CarLook = { rim: 'stock', rimColour: 'stock', rimSize: 'stock', splitter: 'stock', skirts: 'stock', diffuser: 'stock', spoiler: 'stock', livery: 'none', accent: 'white', number: 0, mark: 'none', glow: 'off' };

export interface MyCar {
  model: PlayerCar;
  paint: PaintId;
  look: CarLook;
}
export const DEFAULT_CAR: MyCar = { model: 'hatch', paint: 'cyan', look: STOCK_LOOK };

const one = <L extends readonly string[]>(list: L, v: unknown, d: L[number]): L[number] => list.find((x) => x === v) ?? d;
/** A saved car's look, made safe: anything unknown is the stock part (a car saved before Phase 5 is all stock) */
export function cleanLook(v: unknown): CarLook {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const n = Math.round(Number(o.number));
  const S = STOCK_LOOK;
  return {
    rim: one(RIMS, o.rim, S.rim),
    rimColour: one(RIM_COLOURS, o.rimColour, S.rimColour),
    rimSize: one(RIM_SIZES, o.rimSize, S.rimSize),
    splitter: one(SPLITTERS, o.splitter, S.splitter),
    skirts: one(SKIRTS, o.skirts, S.skirts),
    diffuser: one(DIFFUSERS, o.diffuser, S.diffuser),
    spoiler: one(SPOILERS, o.spoiler, S.spoiler),
    livery: one(LIVERIES, o.livery, S.livery),
    accent: CAR_PAINTS.find((p) => p.id === o.accent)?.id ?? S.accent,
    number: n >= 1 && n <= 99 ? n : 0,
    mark: one(CAR_MARKS, o.mark, S.mark),
    glow: one(GLOWS, o.glow, S.glow),
  };
}

/** A saved or sent car, made safe: unknown models or paints fall back to the default */
export function cleanCar(v: unknown): MyCar {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const model = PLAYER_CARS.find((m) => m === o.model) ?? DEFAULT_CAR.model;
  const paint = CAR_PAINTS.find((p) => p.id === o.paint)?.id ?? DEFAULT_CAR.paint;
  return { model, paint, look: cleanLook(o.look) };
}

export const paintHex = (id: PaintId) => CAR_PAINTS.find((p) => p.id === id)!.hex;

/** Where the browser keeps it (backup.ts lists the key too) */
export const CAR_KEY = 'degen-city-car-v1';
/** Your saved car (or the default); garage-ui.ts saves it */
export function loadCar(): MyCar {
  try {
    return cleanCar(readSaved(CAR_KEY));
  } catch {
    return { ...DEFAULT_CAR };
  }
}
