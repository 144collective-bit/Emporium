/*
 * When a still city's ticks run again (DOM-free, tested in tests/stillticks.test.ts; read by index.ts). Under
 * prefers-reduced-motion the city stands still: its ticks run on the first frame only, with the time held at 0. But
 * some ticks move nothing and follow the sky instead (the murk past the wall darkening at night, wall3d.ts; the
 * districts' night lights, which read `night`). When the sky's conditions change after the first frame (the menu's
 * time or weather, the live hour going on, the review shots' night), they kept the first frame's: the murk a pale
 * day grey under a night sky. So a still city runs its ticks once more when the sky has settled somewhere that's
 * moved on by a step since they last ran: once a change, not on every step of the sky's glide to it. The time stays
 * at 0, so nothing moves: only the lights and colours catch up.
 */

/** What the ticks read of the sky (world.ts `Env`'s share of it) */
export type SkyState = { night: number; day: number; rain: number; hour: number };

/** How far night, day or rain (each 0 to 1) moves on before the ticks run again */
export const SKY_STEP = 0.02;
/** ... and the hour (0 to 24, round the clock) */
export const HOUR_STEP = 0.25;

/** How little the sky may move in a frame and still count as settled (done gliding to a new time or weather; the hour ten times this, so the live clock's own minutes count as settled) */
export const SETTLED = 1e-4;

/** Whether the sky has moved on by a step since `last` (NaN in `last`: never ran) */
export function skyMoved(last: SkyState, now: SkyState): boolean {
  const off = (a: number, b: number) => !(Math.abs(a - b) < SKY_STEP);
  const h = Math.abs(last.hour - now.hour) % 24;
  return off(last.night, now.night) || off(last.day, now.day) || off(last.rain, now.rain) || !(Math.min(h, 24 - h) < HOUR_STEP);
}

const copy = (to: SkyState, from: SkyState) => {
  to.night = from.night;
  to.day = from.day;
  to.rain = from.rain;
  to.hour = from.hour;
};
const nothing = (): SkyState => ({ night: NaN, day: NaN, rain: NaN, hour: NaN });

/**
 * A still city's ticks: `due(sky)` once a frame says whether to run them. On the first frame, and then once the sky
 * has settled somewhere that's moved on by a step from where they last ran. Not on every step of the sky's glide
 * between times: that ran them (and drew the city) dozens of times on the way, which held a slow renderer's
 * building back for good.
 */
export function createStillTicks() {
  const ran = nothing();
  const prev = nothing();
  return {
    due(now: SkyState): boolean {
      const first = Number.isNaN(ran.night);
      const dh = Math.abs(prev.hour - now.hour) % 24;
      const settled = Math.abs(prev.night - now.night) < SETTLED && Math.abs(prev.day - now.day) < SETTLED && Math.abs(prev.rain - now.rain) < SETTLED && Math.min(dh, 24 - dh) < SETTLED * 10;
      copy(prev, now);
      if (!first && !(settled && skyMoved(ran, now))) return false;
      copy(ran, now);
      return true;
    },
  };
}
