/*
 * The weather's and the evening's small reactions (city life plan, Phase 4).
 * DOM-free: world.ts, sky.ts and life.ts draw them, tests/dusk.test.ts
 * checks them.
 *
 * - Lamps that come on one by one at dusk (`lampGlow()`): each lamp has
 *   its own moment in the dusk (by its seed) and a flicker as it strikes.
 * - Thunder now and then in heavy rain (`stormStep()`): a soft brighten of
 *   the sky, and a rumble a few seconds after. Never a hard flash.
 * - Steam from the vents in The Trenches (`VENTS`, `puff()`): the few
 *   nearest the camera, at night.
 * - The wind in the trees (`windStrength()`): stronger in the rain; the
 *   canopies' sway is written into their uv (`SWAY`, `Batch.instances()`
 *   in kit.ts: the shared paint has no texture) and read back by its
 *   shader, so it costs no memory at all.
 */
import { LANE } from './layout';
import { pointAt, streetLength, type Pt } from './streetplan';
import { TRENCH_CROSSINGS, TRENCH_STREETS } from './trenches';

/* ---------- Lamps at dusk ---------- */

/** The night level (sky.ts, 0 by day to 1 at night) at which the first and the last lamps come on */
export const SWITCH_FROM = 0.08;
export const SWITCH_TO = 0.55;
/** A lamp's own delay after its moment (seconds), so a dusk that comes in a jump still trickles on */
export const TRICKLE = 25;
/** How long a lamp flickers as it strikes */
export const FLICKER_ON = 0.9;

/** A lamp's switch: when it comes on (or -1, off) */
export interface Lamp {
  on: number;
}
export const newLamp = (): Lamp => ({ on: -1 });

const frac = (x: number) => x - Math.floor(x);

/** The flicker as a lamp strikes, `s` seconds in (0..1; 1 once it's settled) */
export function flickerOn(s: number, seed: number) {
  if (s >= FLICKER_ON) return 1;
  if (s <= 0) return 0;
  const k = Math.sin(s * 37 + seed * 50) + Math.sin(s * 59 + seed * 20) * 0.7;
  const struck = k > -0.2 ? 1 : 0.1;
  return Math.min(1, 0.35 + (s / FLICKER_ON) * 0.65) * struck;
}

/**
 * How bright a lamp's glow is (0..1 of its night brightness) at this night
 * level and time: off until the dusk reaches its moment, then on after its
 * own delay (none when `trickle` is false: reduced motion) with a flicker.
 */
export function lampGlow(l: Lamp, night: number, seed: number, t: number, trickle = true): number {
  const moment = SWITCH_FROM + seed * (SWITCH_TO - SWITCH_FROM);
  if (night < moment) {
    l.on = -1;
    return 0;
  }
  if (!trickle) return 1;
  if (l.on < 0) l.on = t + frac(seed * 7.13) * TRICKLE;
  return flickerOn(t - l.on, seed);
}

/* ---------- Thunder ---------- */

/** How hard it has to rain for thunder */
export const STORM_RAIN = 0.65;
/** Seconds between strikes, the shortest and the longest */
export const STRIKE_GAP: [number, number] = [18, 55];
/** How much the sky brightens at most (a soft brighten, never a hard flash), and how long it lasts */
export const FLASH_PEAK = 0.4;
export const FLASH_LEN = 0.7;
/** The rumble follows the flash by this long (seconds), the shortest and the longest */
export const RUMBLE_DELAY: [number, number] = [1.2, 4];

export interface Storm {
  /** Seconds of heavy rain to the next strike */
  next: number;
  /** Seconds into the flash, or -1 */
  flash: number;
  /** Seconds to the rumble, or -1 */
  rumble: number;
  seed: number;
}
export const newStorm = (seed = 0.37): Storm => ({ next: STRIKE_GAP[0] + seed * (STRIKE_GAP[1] - STRIKE_GAP[0]), flash: -1, rumble: -1, seed });

/** One frame of the storm: the sky's brighten this frame (0..FLASH_PEAK) and the rumble's gain when it's due (else 0) */
export function stormStep(s: Storm, rain: number, dt: number): { flash: number; rumble: number } {
  let rumble = 0;
  if (rain >= STORM_RAIN) {
    s.next -= dt;
    if (s.next <= 0) {
      s.seed = frac(Math.sin(s.seed * 12.9898 + 78.233) * 43758.5453);
      s.next = STRIKE_GAP[0] + s.seed * (STRIKE_GAP[1] - STRIKE_GAP[0]);
      s.flash = 0;
      s.rumble = RUMBLE_DELAY[0] + frac(s.seed * 3.7) * (RUMBLE_DELAY[1] - RUMBLE_DELAY[0]);
    }
  } else s.next = Math.max(s.next, 6);
  let flash = 0;
  if (s.flash >= 0) {
    s.flash += dt;
    const rise = 0.08;
    flash = s.flash < rise ? (FLASH_PEAK * s.flash) / rise : FLASH_PEAK * Math.max(0, 1 - (s.flash - rise) / (FLASH_LEN - rise));
    if (s.flash >= FLASH_LEN) s.flash = -1;
  }
  if (s.rumble >= 0) {
    s.rumble -= dt;
    if (s.rumble <= 0) {
      s.rumble = -1;
      rumble = 0.6 + 0.4 * s.seed;
    }
  }
  return { flash, rumble };
}

/* ---------- Steam from the vents ---------- */

/** How many vents steam at once (the nearest), and a puff's life and rise */
export const VENT_N = 6;
export const PUFF_LEN = 2.6;
export const PUFF_RISE = 1.3;

/** The vents in The Trenches' streets: two to a street, in the right-hand lane, clear of the junctions */
export const VENTS: Pt[] = TRENCH_STREETS.flatMap((s) => {
  const len = streetLength(s);
  const crossings = TRENCH_CROSSINGS.filter((c) => c.streets.includes(s.id)).map((c) => c.at);
  const out: Pt[] = [];
  for (const f of [0.3, 0.72]) {
    for (let d = len * f; d < len - 4; d += 4) {
      const { at, dir } = pointAt(s, d);
      if (crossings.some((c) => Math.hypot(c[0] - at[0], c[1] - at[1]) < 5)) continue;
      // In the right-hand lane going the street's way (just off the lane's middle, where a cover would be)
      const lane = s.kind === 'avenue' ? s.half - LANE / 2 : LANE / 2;
      out.push([at[0] - dir[1] * lane, at[1] + dir[0] * lane]);
      break;
    }
  }
  return out;
});

/** The `n` vents nearest a point, nearest first (their indices in `VENTS`) */
export function ventsNear(x: number, z: number, n = VENT_N): number[] {
  return VENTS.map((v, i) => ({ i, d: Math.hypot(v[0] - x, v[1] - z) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((v) => v.i);
}

/** A vent's puff at time t: how high it has risen, how big it is and how faint (0..1) */
export function puff(t: number, seed: number) {
  const life = frac(t / PUFF_LEN + seed);
  return { y: life * PUFF_RISE, size: 0.5 + life * 1.1, alpha: (1 - life) * Math.min(1, life * 5) };
}

/* ---------- The wind in the trees ---------- */

/** How far a canopy's top sways (tiles): calm, and in the rain */
export const windStrength = (rain: number) => 0.05 + rain * 0.09;
/** The sway a canopy carries (in its uv, kit.ts): SWAY at its top, 0.4 of that at its foot */
export const SWAY = 0.08;

/** Does a vent steam: at night, with the camera close enough */
export const VENT_REACH = 60;
export const ventsOn = (night: number, dist: number) => night > 0.3 && dist < VENT_REACH;
