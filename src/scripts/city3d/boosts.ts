/*
 * What the consumables do (docs/inventory-plan.md Phase 5, "things worth carrying"): the energy drink, the
 * nitro can and the flyers, each for a while. DOM-free and tiny (walk mode, driving and the economy read it;
 * the rules for using one are inventory.ts's `useItem()`), tested in tests/boosts.test.ts.
 *
 * - **The energy drink**: on foot, his run and sprint `ENERGY.speed` times as fast and his fists never out of
 *   breath, for `ENERGY.seconds`.
 * - **The nitro can**: in your own car or motorbike, `NITRO.seconds` of more top speed and pick-up
 *   (drive-sim.ts `DriveInput.boost`), well under what the game server lets a car go (protocol.ts `SPEEDS`).
 * - **The flyers**: handed out at your stall, its customers `FLYERS.customers` times as many for
 *   `FLYERS.minutes` (the save's `flyers`, when they run out: tycoon.ts `advance()`), on top of serving it.
 *
 * Nothing here hurts or heals: nothing outside the ring hurts Degen (the owner's call).
 */
import type { ItemId } from './catalog';

export const ENERGY = { seconds: 30, speed: 1.15 } as const;
export const NITRO = { seconds: 4, top: 1.35, accel: 2.2 } as const;
export const FLYERS = { minutes: 5, customers: 2 } as const;

/** The consumables that last a while on Degen himself (the flyers' time is the save's, the snack's none) */
export type BoostId = Extract<ItemId, 'energy' | 'nitro'>;
export const BOOST_SECONDS: Record<BoostId, number> = { energy: ENERGY.seconds, nitro: NITRO.seconds };

/** The boosts on now: when each runs out (seconds on the caller's clock) */
export function createBoosts() {
  const until: Partial<Record<BoostId, number>> = {};
  return {
    /** Start one (one at a time of each: a second while one's on is refused by `useItem()`) */
    start(id: BoostId, now: number) {
      until[id] = now + BOOST_SECONDS[id];
    },
    /** Seconds left on one (0 when it's off) */
    left(id: BoostId, now: number) {
      return Math.max(0, (until[id] ?? 0) - now);
    },
    on(id: BoostId, now: number) {
      return (until[id] ?? 0) > now;
    },
    /** How far through it is (1 just started, 0 run out): the HUD's ring */
    share(id: BoostId, now: number) {
      return Math.min(1, Math.max(0, ((until[id] ?? 0) - now) / BOOST_SECONDS[id]));
    },
    /** All off (walk mode ending) */
    clear() {
      for (const k of Object.keys(until) as BoostId[]) delete until[k];
    },
  };
}
export type Boosts = ReturnType<typeof createBoosts>;

/** The nitro's push on a car's top speed and pick-up while `boost` (0..1) is on */
export const nitroTop = (top: number, boost: number) => top * (1 + (NITRO.top - 1) * boost);
export const nitroAccel = (accel: number, boost: number) => accel * (1 + (NITRO.accel - 1) * boost);

/**
 * The share of the time from `from` to `to` (ms) the flyers were out (they ran out at `until`; handed out
 * `FLYERS.minutes` before that): how much of a sales tick gets their extra customers
 */
export function flyersShare(until: number, from: number, to: number) {
  if (!(to > from) || !(until > from)) return 0;
  const start = until - FLYERS.minutes * 60000;
  const a = Math.max(from, start);
  const b = Math.min(to, until);
  return b > a ? (b - a) / (to - from) : 0;
}
