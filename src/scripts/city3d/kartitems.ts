/*
 * The kart park's items mode (docs/kart-west-plan.md Phase 7, the owner's picks): pure racing stays the default; a
 * single race can switch items on. Item boxes stand in rows across the track at three places round the circuit; a
 * kart that drives through one with nothing in hand takes an item, and the box comes back a moment later. Three
 * items, all harmless: a **Boost** (a turbo can), a **Shield** (a few seconds where bumps and slicks can't spin you)
 * and an **Oil slick** (dropped behind; a kart that runs over it spins out briefly). The rivals use them too.
 * Cups, time trials, lap records, ghosts and boards stay pure (tycoon.ts `finishKartRace()`'s `items`).
 *
 * Free of the DOM and of scene code: kart-sim.ts plays it, kart.ts draws it, tested in tests/kartitems.test.ts.
 */
import { CIRCUIT, TRACK_HALF, enclosed } from './kartcircuit';
import { F, frame, at } from './kartpark';

export type ItemId = 'boost' | 'shield' | 'oil';
export const ITEM_IDS: ItemId[] = ['boost', 'shield', 'oil'];
export const ITEM_NAMES: Record<ItemId, string> = { boost: 'Boost', shield: 'Shield', oil: 'Oil slick' };

/** The items' numbers: the boxes' reach and how soon they're back, the boost, the shield, the slicks */
export const ITEM = {
  /** How near a kart's middle has to pass a box to take it, and how long the box is gone after */
  reach: 0.8,
  respawn: 3,
  /** The turbo can: how long, how strong (the drift's top boost is 1.3) */
  boostT: 1.3,
  boostK: 1.35,
  /** The shield's seconds */
  shieldT: 5,
  /** A slick: how far behind the kart it's dropped, its reach, how long it lies, how long its spin is, how many at once */
  drop: 1.3,
  slickR: 0.7,
  slickLife: 25,
  spin: 0.9,
  most: 10,
} as const;

/** The rows of boxes: where round the forward circuit (a share of the lap past the line: the straight after it, the west side past the esses, the east sweeper's exit), clear of the pads, the jump, the deck and the tunnel; and the laterals of a row's boxes */
export const BOX_ROWS = [0.03, 0.218, 0.471];
export const ROW_LATERALS = [-1.5, -0.5, 0.5, 1.5];
/** The boxes (world): each row's laid across the track at its place */
export const BOXES: { x: number; z: number; y: number; row: number }[] = BOX_ROWS.flatMap((share, row) => {
  const c = CIRCUIT;
  const s = (c.start + c.L * share) % c.L;
  return ROW_LATERALS.map((lat) => {
    const q = at(c, s, lat);
    return { x: q.x, z: q.z, y: q.y, row };
  });
});
/** Where each row is (s on the forward circuit), for the tests */
export const ROW_S = BOX_ROWS.map((share) => (CIRCUIT.start + CIRCUIT.L * share) % CIRCUIT.L);

/**
 * What a kart gets from a box, by its place (1 at the front of `of`): the leaders mostly oil to drop behind them, the
 * back markers mostly a boost to catch up, a shield either way; `r` a 0..1 roll
 */
export function drawItem(place: number, of: number, r: number): ItemId {
  const back = of > 1 ? (place - 1) / (of - 1) : 0.5;
  const boost = 0.15 + 0.45 * back;
  const oil = 0.55 - 0.4 * back;
  return r < boost ? 'boost' : r < boost + oil ? 'oil' : 'shield';
}

/** The rivals' sense (kart-sim.ts): use a boost with a clear run ahead, a shield with a kart or a slick close, oil with a kart close behind */
export const AI_USE = { clear: 12, behind: 7, close: 3, slickAhead: 8, hold: 9 } as const;
/** A clear run ahead from s on a course: no tight bend, the deck or the tunnel in the next `ahead` tiles */
export function clearAhead(c: typeof CIRCUIT, s: number, ahead: number = AI_USE.clear) {
  for (let d = 0; d <= ahead; d += 1.5) {
    const f = frame(c, s + d);
    if (Math.abs(f.k) > 0.06 || enclosed(f) || f.flags & F.tunnel) return false;
  }
  return true;
}
/** (the track's half width, for the tests) */
export { TRACK_HALF };
