/*
 * Your own car: which model, what paint, and how each model drives. Picked
 * at the garage on the south bank (garage-ui.ts) and kept in the browser.
 * Cars are free and only for the city: nothing is sold, nothing is tied to
 * the store or the token.
 *
 * Kept free of the DOM and of scene code, like the other shared data, so a
 * game server can check a car the same way later.
 */
import type { CarId } from './cars';

/** The cars a player can pick (the bus is for the city only) */
export const PLAYER_CARS = ['hatch', 'sedan', 'coupe', 'pickup', 'van'] as const satisfies readonly CarId[];
export type PlayerCar = (typeof PLAYER_CARS)[number];

/** What the garage says about each one, and how it drives (0..1, for the stat bars and the handling) */
export const DRIVE: Record<PlayerCar, { kind: string; blurb: string; speed: number; accel: number; grip: number }> = {
  hatch: { kind: 'Compact', blurb: 'Small, quick off the line and easy to park anywhere in the city.', speed: 0.55, accel: 0.75, grip: 0.7 },
  sedan: { kind: 'Saloon', blurb: 'Smooth and steady: the comfy all-rounder for cruising the avenues.', speed: 0.7, accel: 0.6, grip: 0.65 },
  coupe: { kind: 'Sports', blurb: 'Low, loud and fast. Sticks to the road through every corner.', speed: 0.95, accel: 0.9, grip: 0.9 },
  pickup: { kind: 'Pickup', blurb: 'Big wheels, high seat and a bed for hauling. Slow to turn.', speed: 0.6, accel: 0.5, grip: 0.5 },
  van: { kind: 'Van', blurb: 'Room for the whole crew and all their gear. Takes its time.', speed: 0.45, accel: 0.4, grip: 0.45 },
};

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
