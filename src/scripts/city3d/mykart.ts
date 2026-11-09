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
import { CAR_PAINTS, PLAYER_KARTS, type KartId, type PaintId } from './vehicleids';
import type { Feel } from './drive-sim';
export { PLAYER_KARTS, type KartId };

/**
 * How your kart feels out on the street (drive.ts, the polish plan's Phase 6; the cars' is mycar.ts `FEEL`): light,
 * so it answers the wheel at once, a quick rack with plenty of lock, the back wheels driving it and a tail a little
 * loose, so power through a bend steps it out. The races keep kart-sim.ts's own handling.
 */
export const KART_FEEL: Feel = { mass: 0.6, loose: 0.45, rwd: true, steerRate: 5.2, lock: 0.72 };

/** What the hut says about each one, and how it drives (0..1: the stat bars and the handling) */
export const KART_SPECS: Record<KartId, { name: string; kind: string; blurb: string; speed: number; accel: number; handling: number; weight: number }> = {
  rocket: { name: 'Pocket Rocket', kind: 'All-rounder', blurb: 'Quick, nimble all-rounder', speed: 0.6, accel: 0.7, handling: 0.7, weight: 0.5 },
  bigwheel: { name: 'Big Wheel', kind: 'Heavy', blurb: 'Fat tyres, hard to shove', speed: 0.95, accel: 0.45, handling: 0.5, weight: 1 },
  zip: { name: 'Zip', kind: 'Light', blurb: 'Quick off the line, easily bumped', speed: 0.7, accel: 1, handling: 1, weight: 0.2 },
  tank: { name: 'Tank Kart', kind: 'Armoured', blurb: 'Plated, quick back from spins', speed: 0.8, accel: 0.6, handling: 0.6, weight: 0.9 },
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

/* ---------- The kart's look (docs/kart-west-plan.md Phase 6: all free, at the clubhouse's Karts tab) ---------- */

/** The decal sets laid on the nose and the pods; the city's own made-up marks among them, never a brand */
export const KART_DECALS = ['none', 'stripes', 'flames', 'checks', 'diamond'] as const;
export type KartDecal = (typeof KART_DECALS)[number];
export const DECAL_NAMES: Record<KartDecal, string> = { none: 'None', stripes: 'Racing stripes', flames: 'Flames', checks: 'Checks', diamond: 'Diamond' };
/** The colours the look picks from (decals, rims, tyre stripes, the helmet, the race suit, the spark trail, the underglow) */
export const LOOK_COLOURS = ['#f3f2f7', '#16141f', '#e23b3b', '#ff8a2a', '#ffd23f', '#1fbf6b', '#00c2ff', '#2a6bff', '#8000ff', '#e219e5', '#c9a227', '#9a9aae'] as const;
export interface KartLook {
  /** Its racing number (1-99) */
  number: number;
  decal: KartDecal;
  decalColour: string;
  rim: string;
  /** The tyres' sidewall stripe, or none */
  tyreStripe: string | null;
  helmet: string;
  suit: string;
  /** The boost flames' and the spark trail's colour */
  trail: string;
  /** The neon under it at night, or none */
  glow: string | null;
}
export const DEFAULT_LOOK: KartLook = { number: 7, decal: 'stripes', decalColour: '#f3f2f7', rim: '#9a9aae', tyreStripe: null, helmet: '#f3f2f7', suit: '#16141f', trail: '#ff8a2a', glow: null };
const colourOr = (v: unknown, d: string) => (typeof v === 'string' && (LOOK_COLOURS as readonly string[]).includes(v) ? v : d);
const colourOrNone = (v: unknown, d: string | null) => (v === null ? null : typeof v === 'string' && (LOOK_COLOURS as readonly string[]).includes(v) ? v : d);
/** A saved or sent kart look, made safe (anything unknown is the stock look's) */
export function cleanKartLook(v: unknown): KartLook {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const n = typeof o.number === 'number' && Number.isFinite(o.number) ? Math.round(o.number) : DEFAULT_LOOK.number;
  return {
    number: Math.max(1, Math.min(99, n)),
    decal: KART_DECALS.find((d) => d === o.decal) ?? DEFAULT_LOOK.decal,
    decalColour: colourOr(o.decalColour, DEFAULT_LOOK.decalColour),
    rim: colourOr(o.rim, DEFAULT_LOOK.rim),
    tyreStripe: colourOrNone(o.tyreStripe, DEFAULT_LOOK.tyreStripe),
    helmet: colourOr(o.helmet, DEFAULT_LOOK.helmet),
    suit: colourOr(o.suit, DEFAULT_LOOK.suit),
    trail: colourOr(o.trail, DEFAULT_LOOK.trail),
    glow: colourOrNone(o.glow, DEFAULT_LOOK.glow),
  };
}
