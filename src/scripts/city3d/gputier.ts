/*
 * The quality tier a device starts on (docs/stability-plan.md, "The tier by the graphics"). DOM-free, tested in
 * tests/gputier.test.ts; index.ts reads the screen, the memory, the cores and the graphics' name and passes them in.
 *
 * - Phones (a short side under 700) take the low tier; a touch screen (a tablet), little memory or few cores the
 *   medium one, as before.
 * - Graphics built into the processor (Intel's, AMD's Radeon Graphics / Vega in a Ryzen, a plain Apple M chip) share
 *   the computer's own memory with everything else, so a desktop on one takes medium too: the high tier's 2x pixels,
 *   big shadow map and MSAA were what ran them out of graphics memory. A graphics card of its own (NVIDIA, Radeon RX
 *   or Pro, Intel Arc A / B, Apple Pro / Max / Ultra) keeps high. A name the browser hides changes nothing.
 * - The 3D graphics stopped here lately (the GPU's context lost): the next start is one tier below the one that
 *   stopped, for `LOST_DAYS` (a second loss steps down again, to low at the least).
 * - The GPU coming back (`webglcontextrestored`) reloads the city by itself, once a minute at most
 *   (`reloadOnRestore()`): the save is kept, and the tier is a step lower by the rule above.
 */
import type { Tier } from './targets';

export type { Tier };

/** How long a lost context keeps the device a tier lower (days) */
export const LOST_DAYS = 14;
const DAY = 86_400_000;

/** The device's own key (a screen setting, not progress: it stays out of the save's backup) */
export const GPU_KEY = 'degen-city-gpu-v1';

/** The 3D graphics stopped: on which tier, and when (ms since 1970) */
export interface Lost {
  tier: Tier;
  at: number;
}

export interface Device {
  /** The screen's short side is under 700 (a phone) */
  small: boolean;
  /** The main pointer is a finger */
  coarse: boolean;
  /** `navigator.deviceMemory` (GB), when the browser says */
  memory?: number;
  /** `navigator.hardwareConcurrency`, when the browser says */
  cores?: number;
  /** The graphics' name (WebGL's renderer), '' when hidden */
  gpu?: string;
  /** The last lost context, if one was kept */
  lost?: Lost | null;
  /** Now (ms since 1970) */
  now: number;
}

export interface Picked {
  tier: Tier;
  /** Why it isn't high, in a few words ('' on high) */
  why: string;
}

const ORDER: Tier[] = ['low', 'medium', 'high'];
const rank = (t: Tier) => ORDER.indexOf(t);
/** One tier below (low stays low) */
export const below = (t: Tier): Tier => ORDER[Math.max(0, rank(t) - 1)];

/** Graphics built into the processor, sharing the computer's memory, by the name WebGL gives them */
export function sharedGpu(name: string): boolean {
  const n = name.toLowerCase();
  if (!n) return false;
  // AMD's: "Radeon(TM) Graphics" and "Radeon Vega 8 Graphics" (older drivers say "RX Vega 10 Graphics": still built in),
  // the 3-digit M / S ones (680M, 780M, 890M, 8060S), and Linux's chip names
  if (/vega \d+ graphics/.test(n)) return true;
  const card = /\bradeon\b[^,]*\b(rx|pro)\b|\bfirepro\b/.test(n);
  if (/\bradeon(\(tm\))? graphics\b/.test(n)) return true;
  if (!card && /\bradeon(\(tm\))? \d{3,4}[ms]\b/.test(n)) return true;
  if (/\b(renoir|cezanne|lucienne|barcelo|rembrandt|phoenix|raven|picasso|dali|pollock|mendocino|van ?gogh|carrizo|stoney|kaveri|kabini|mullins)\b/.test(n)) return true;
  // Intel's, but for Arc's own cards (A770, B580); "Arc(TM) Graphics" alone is built in
  if (/\bintel\b/.test(n) && !/\barc(\(tm\))? [ab]\d{3}/.test(n)) return true;
  // Apple's plain M chips (M1, M2...); Pro, Max and Ultra keep high
  if (/\bapple m\d+\b(?! (pro|max|ultra))/.test(n)) return true;
  return false;
}

/** A kept lost context, if it's readable and recent (anything else: none) */
export function cleanLost(raw: unknown, now: number): Lost | null {
  if (!raw || typeof raw !== 'object') return null;
  const { tier, at } = raw as Partial<Lost>;
  if (typeof tier !== 'string' || !ORDER.includes(tier as Tier)) return null;
  if (typeof at !== 'number' || !Number.isFinite(at) || at > now || now - at >= LOST_DAYS * DAY) return null;
  return { tier: tier as Tier, at };
}

/** The tier a device starts on, and why */
export function pickTier(d: Device): Picked {
  let picked: Picked;
  if (d.small) picked = { tier: 'low', why: 'phone screen' };
  else if (d.coarse) picked = { tier: 'medium', why: 'touch screen' };
  else if ((d.memory ?? 8) <= 4) picked = { tier: 'medium', why: 'little memory' };
  else if ((d.cores ?? 8) <= 4) picked = { tier: 'medium', why: 'few cores' };
  else if (d.gpu && sharedGpu(d.gpu)) picked = { tier: 'medium', why: 'shared graphics' };
  else picked = { tier: 'high', why: '' };
  const lost = cleanLost(d.lost, d.now);
  if (lost) {
    const cap = below(lost.tier);
    if (rank(cap) < rank(picked.tier)) picked = { tier: cap, why: 'graphics stopped lately' };
  }
  return picked;
}

/** A restored context reloads the city at most once in this long (ms): a GPU that keeps dropping out stays on the card */
export const RELOAD_GAP = 60_000;
/** When the city last reloaded itself on a restored context (sessionStorage: this tab only) */
export const RELOAD_KEY = 'degen-city-gpu-reload-v1';

/** The GPU came back (`webglcontextrestored`): reload by itself, unless it did so under `RELOAD_GAP` ago (`last`, as kept) */
export function reloadOnRestore(last: unknown, now: number): boolean {
  const at = typeof last === 'string' && last.trim() ? Number(last) : NaN;
  return !(Number.isFinite(at) && at <= now && now - at < RELOAD_GAP);
}
