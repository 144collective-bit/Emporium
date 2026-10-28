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
/** Every car model (cars.ts draws them; here so the shared, DOM-free code can name them) */
export type CarId = 'hatch' | 'sedan' | 'coupe' | 'pickup' | 'van' | 'bus' | 'muscle' | 'suv' | 'super' | 'exec';

/** The cars a player can pick (the bus is for the city only): the five starters, then the ones the garage sells (catalog.ts) */
export const PLAYER_CARS = ['hatch', 'sedan', 'coupe', 'pickup', 'van', 'muscle', 'suv', 'super'] as const satisfies readonly CarId[];
export type PlayerCar = (typeof PLAYER_CARS)[number];

/** What the garage says about each one, and how it drives (0..1, for the stat bars and the handling) */
export const DRIVE: Record<PlayerCar, { kind: string; blurb: string; speed: number; accel: number; grip: number }> = {
  hatch: { kind: 'Compact', blurb: 'Small, quick off the line and easy to park anywhere in the city.', speed: 0.55, accel: 0.75, grip: 0.7 },
  sedan: { kind: 'Saloon', blurb: 'Smooth and steady: the comfy all-rounder for cruising the avenues.', speed: 0.7, accel: 0.6, grip: 0.65 },
  coupe: { kind: 'Sports', blurb: 'Low, loud and fast. Sticks to the road through every corner.', speed: 0.95, accel: 0.9, grip: 0.9 },
  pickup: { kind: 'Pickup', blurb: 'Big wheels, high seat and a bed for hauling. Slow to turn.', speed: 0.6, accel: 0.5, grip: 0.5 },
  van: { kind: 'Van', blurb: 'Room for the whole crew and all their gear. Takes its time.', speed: 0.45, accel: 0.4, grip: 0.45 },
  muscle: { kind: 'Muscle', blurb: 'A big block up front and fat tyres at the back. Fast in a straight line, lively in the corners.', speed: 0.85, accel: 0.95, grip: 0.6 },
  suv: { kind: 'SUV', blurb: 'Tall and tough with a huge boot. Shrugs off kerbs, leans in the bends.', speed: 0.65, accel: 0.55, grip: 0.75 },
  super: { kind: 'Supercar', blurb: 'Low, wide and savage. The fastest thing on the city\'s streets, and it sticks like glue.', speed: 1, accel: 1, grip: 0.95 },
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
};

/** How many goods each model carries in its boot or bed (more with the garage's roof rack) */
export const CARGO: Record<PlayerCar, number> = { hatch: 16, sedan: 20, coupe: 8, pickup: 40, van: 80, muscle: 12, suv: 60, super: 6 };

/** Paint colours on offer */
export const CAR_PAINTS = [
  { id: 'red', name: 'Rocket red', hex: '#e23b3b' },
  { id: 'orange', name: 'Sunset orange', hex: '#ff8a3d' },
  { id: 'yellow', name: 'Taxi yellow', hex: '#ffd23f' },
  { id: 'green', name: 'Mint green', hex: '#1fbf6b' },
  { id: 'cyan', name: 'Electric cyan', hex: '#00c2ff' },
  { id: 'navy', name: 'Night blue', hex: '#2a3b66' },
  { id: 'violet', name: 'Ultra violet', hex: '#8000ff' },
  { id: 'magenta', name: 'Neon magenta', hex: '#e219e5' },
  { id: 'pink', name: 'Bubblegum', hex: '#ff6ad5' },
  { id: 'white', name: 'Pearl white', hex: '#f3f2f7' },
  { id: 'silver', name: 'Silver', hex: '#9a96b8' },
  { id: 'black', name: 'Midnight', hex: '#14121f' },
] as const;
export type PaintId = (typeof CAR_PAINTS)[number]['id'];

export interface MyCar {
  model: PlayerCar;
  paint: PaintId;
}
export const DEFAULT_CAR: MyCar = { model: 'hatch', paint: 'cyan' };

/** A saved or sent car, made safe: unknown models or paints fall back to the default */
export function cleanCar(v: unknown): MyCar {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const model = PLAYER_CARS.find((m) => m === o.model) ?? DEFAULT_CAR.model;
  const paint = CAR_PAINTS.find((p) => p.id === o.paint)?.id ?? DEFAULT_CAR.paint;
  return { model, paint };
}

export const paintHex = (id: PaintId) => CAR_PAINTS.find((p) => p.id === id)!.hex;

/** Where the browser keeps it (backup.ts lists the key too) */
export const CAR_KEY = 'degen-city-car-v1';
/** Your saved car (or the default); garage-ui.ts saves it */
export function loadCar(): MyCar {
  try {
    return cleanCar(JSON.parse(localStorage.getItem(CAR_KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_CAR };
  }
}
