/*
 * The karts: which models there are, how each one handles, and the player's
 * pick (model and paint), kept in the tycoon save (tycoon.ts `karts`). The
 * Pocket Rocket is free; the other three are bought at the kart hut for
 * Dorras (catalog.ts has the prices and levels, tycoon.ts the purchase and
 * the mods that raise these numbers). Karts are only for the kart park:
 * never real money, never tied to the store or the token.
 *
 * Kept free of the DOM and of scene code (karts.ts draws them), like the
 * other shared data.
 */
import { CAR_PAINTS, type PaintId } from './mycar';

export const PLAYER_KARTS = ['rocket', 'bigwheel', 'zip', 'tank'] as const;
export type KartId = (typeof PLAYER_KARTS)[number];

/** What the hut says about each one, and how it drives (0..1: the stat bars and the handling) */
export const KART_SPECS: Record<KartId, { name: string; kind: string; blurb: string; speed: number; accel: number; handling: number; weight: number }> = {
  rocket: { name: 'Pocket Rocket', kind: 'All-rounder', blurb: 'The park\'s own kart: quick, nimble, honest. Yours from day one.', speed: 0.6, accel: 0.7, handling: 0.7, weight: 0.5 },
  bigwheel: { name: 'Big Wheel', kind: 'Heavy', blurb: 'Fat tyres, a big motor and a long top end. Slow to wake up, hard to shove.', speed: 0.95, accel: 0.45, handling: 0.5, weight: 1 },
  zip: { name: 'Zip', kind: 'Light', blurb: 'A feather with a motor. Off the line like a shot and drifts on a coin, but a bump sends it flying.', speed: 0.7, accel: 1, handling: 1, weight: 0.2 },
  tank: { name: 'Tank Kart', kind: 'Armoured', blurb: 'Plated all round. Shrugs off bumps and gets back up from a spin twice as fast.', speed: 0.8, accel: 0.6, handling: 0.6, weight: 0.9 },
};

export interface MyKart {
  model: KartId;
  paint: PaintId;
}
export const DEFAULT_KART: MyKart = { model: 'rocket', paint: 'magenta' };

/** A saved or sent kart pick, made safe */
export function cleanKart(v: unknown): MyKart {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const model = PLAYER_KARTS.find((m) => m === o.model) ?? DEFAULT_KART.model;
  const paint = CAR_PAINTS.find((p) => p.id === o.paint)?.id ?? DEFAULT_KART.paint;
  return { model, paint };
}
