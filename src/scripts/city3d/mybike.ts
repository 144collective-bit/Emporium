/*
 * Your own motorbike (vehicle plan Phase 7): which model, what paint, and
 * each model's numbers. Picked at the garage on the south bank (garage-ui.ts,
 * its Bikes) and kept in the browser beside your car (mycar.ts); bought and
 * tuned there like the cars (catalog.ts `BIKE_CATALOG`, the save's garage
 * shared with them: tycoon.ts). The scooter is free; the street bike and the
 * sport bike cost Dorras and a level. Only for the city: never real money,
 * never tied to the store or the token.
 *
 * DOM-free like mycar.ts: the rules (bike-sim.ts), the drawing (bikes.ts),
 * getting on (moments.ts) and the tests all read these numbers.
 *
 * Bike space as the cars': +x the front, y up, +z the bike's right; the
 * origin on the ground under its middle.
 */
import { CAR_PAINTS, type PaintId } from './mycar';

export const PLAYER_BIKES = ['scooter', 'streetbike', 'sportbike'] as const;
export type BikeId = (typeof PLAYER_BIKES)[number];

export interface BikeSpec {
  id: BikeId;
  /** What the garage calls it (made-up names, never a real make) */
  name: string;
  /** Length and width (the bars' span) */
  L: number;
  W: number;
  /** Wheel radius and tyre width; the rear and front axles (x) */
  r: number;
  tw: number;
  axles: [number, number];
  /** The seat's top where the rider's hips go (x, y) */
  seat: [number, number];
  /** The grips: x, y and how far either side of the middle */
  bars: [number, number, number];
  /** Where the feet go: the pegs (or the scooter's floorboard), x, y and how far out */
  pegs: [number, number, number];
  /** How far forward the rider leans (radians from upright): upright on the scooter, tucked on the sport bike */
  tuck: number;
}

export const BIKES: Record<BikeId, BikeSpec> = {
  // A step-through scooter: small wheels, a floorboard, a leg shield and a top box
  scooter: { id: 'scooter', name: 'Hop Scoot', L: 1.45, W: 0.46, r: 0.15, tw: 0.09, axles: [-0.5, 0.5], seat: [-0.2, 0.5], bars: [0.12, 0.66, 0.2], pegs: [0.12, 0.17, 0.12], tuck: 0.05 },
  // A naked street bike: a round lamp, a tank, a flat bench, pegs under the rider
  streetbike: { id: 'streetbike', name: 'Alley Cat', L: 1.75, W: 0.5, r: 0.22, tw: 0.11, axles: [-0.62, 0.6], seat: [-0.18, 0.58], bars: [0.18, 0.72, 0.22], pegs: [-0.08, 0.25, 0.14], tuck: 0.22 },
  // A sport bike: a full fairing, a screen, clip-ons low, rear-set pegs, a tail hump
  sportbike: { id: 'sportbike', name: 'Neon Blade', L: 1.85, W: 0.44, r: 0.23, tw: 0.13, axles: [-0.66, 0.64], seat: [-0.22, 0.6], bars: [0.22, 0.66, 0.18], pegs: [-0.2, 0.3, 0.14], tuck: 0.55 },
};

/** The steering head (x, y): where the fork turns (the bars about it), the drawing's and the rider's pose's */
export function steeringHead(id: BikeId): [number, number] {
  const s = BIKES[id];
  return id === 'scooter' ? [0.3, 0.5] : [s.axles[1] - 0.16, s.bars[1] - 0.04];
}

/** What the garage says about each, and how it rides (0..1, the stat bars and the handling) */
export const BIKE_DRIVE: Record<BikeId, { kind: string; blurb: string; speed: number; accel: number; grip: number }> = {
  scooter: { kind: 'Scooter', blurb: 'Nippy and easy: slips through the traffic, parks anywhere, a top box for the shopping.', speed: 0.42, accel: 0.62, grip: 0.62 },
  streetbike: { kind: 'Street bike', blurb: 'Light, punchy and upright. Leans into every corner of the old town.', speed: 0.72, accel: 0.85, grip: 0.75 },
  sportbike: { kind: 'Sport bike', blurb: 'Tucked in behind the screen, flat out. Corners on its knee.', speed: 0.97, accel: 1, grip: 0.9 },
};

/** How many goods each carries (a top box adds more: the garage's fourth mod) */
export const BIKE_CARGO: Record<BikeId, number> = { scooter: 5, streetbike: 4, sportbike: 2 };

export interface MyBike {
  model: BikeId;
  paint: PaintId;
}
export const DEFAULT_BIKE: MyBike = { model: 'scooter', paint: 'magenta' };

/** A saved bike, made safe: unknown models or paints fall back to the default */
export function cleanBike(v: unknown): MyBike {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const model = PLAYER_BIKES.find((m) => m === o.model) ?? DEFAULT_BIKE.model;
  const paint = CAR_PAINTS.find((p) => p.id === o.paint)?.id ?? DEFAULT_BIKE.paint;
  return { model, paint };
}

/** Where the browser keeps it (backup.ts lists the key too) */
export const BIKE_KEY = 'degen-city-bike-v1';
/** Your saved bike (or the scooter); garage-ui.ts saves it */
export function loadBike(): MyBike {
  try {
    return cleanBike(JSON.parse(localStorage.getItem(BIKE_KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_BIKE };
  }
}
