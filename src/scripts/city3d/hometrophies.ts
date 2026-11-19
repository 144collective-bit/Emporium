/*
 * The trophy wall in Degen's lounge (docs/compound-plan.md Phase 2, the owner's pick: in the lounge): what's on its
 * three shelves, worked out from the save (DOM-free, the boot's, tested in tests/hometrophies.test.ts), drawn by
 * home3d.ts `trophyWall()`.
 *
 * - **The top shelf**: a cup for each of the kart park's cups (kart-cups.ts `CUP_IDS`), in the metal of your best
 *   overall place in its series (the save's `karts.trophies`, as the kart park's own cabinet shows: 1 gold, 2 silver,
 *   3 bronze).
 * - **The middle shelf**: the Fight Club's belt once you've won a bout (`fight.wins`), and a glove for each level of
 *   opponent you've beaten (`fight.bots`, catalog.ts `BOT_LEVELS`).
 * - **The bottom shelf**: a framed milestone for each level in `MILESTONES` you've reached (tycoon.ts `level()`).
 *
 * A slot not yet won stays on the shelf as an empty stand, so there's always something to come home to. The wall only
 * shows what you've done: it gives nothing (rewards are Dorras and XP only).
 *
 * `SHELF` is how the drawing, which loads with the south's chunk, hears of it: tycoon-boot.ts sets it from the save
 * as it loads and on every commit, and it tells its listeners only when what the wall shows has changed.
 */
import { CUP_IDS, type CupId } from './kart-cups';
import { BOT_LEVELS, type BotLevel, levelFor } from './catalog';

/** The levels with a framed milestone on the bottom shelf */
export const MILESTONES = [5, 10, 20, 30, 40] as const;

export type TrophyKind = 'cup' | 'belt' | 'glove' | 'frame';
/** A place on the wall: its shelf (0 the top), how far along it (0 to 1, left to right as you face the wall), what stands there, and whether it's won (and in what metal: 1 gold, 2 silver, 3 bronze) */
export interface TrophySlot {
  id: string;
  kind: TrophyKind;
  shelf: 0 | 1 | 2;
  along: number;
  won: boolean;
  metal: 1 | 2 | 3;
}

/** What of the save the wall reads */
export interface TrophySave {
  xp: number;
  karts: { trophies: Partial<Record<CupId, number>> };
  fight: { wins: number; bots: Partial<Record<BotLevel, { beaten: number }>> };
}

/** Evenly along a shelf: the i-th of n, kept off its ends */
const spread = (i: number, n: number) => (i + 0.5) / n;

/** The wall's slots, from the save */
export function trophies(s: TrophySave): TrophySlot[] {
  const out: TrophySlot[] = [];
  CUP_IDS.forEach((id, i) => {
    const place = s.karts.trophies[id];
    const won = typeof place === 'number' && place >= 1 && place <= 3;
    out.push({ id: `cup:${id}`, kind: 'cup', shelf: 0, along: spread(i, CUP_IDS.length), won, metal: won ? (place as 1 | 2 | 3) : 1 });
  });
  const middle = 1 + BOT_LEVELS.length;
  out.push({ id: 'belt', kind: 'belt', shelf: 1, along: spread(0, middle), won: s.fight.wins > 0, metal: 1 });
  BOT_LEVELS.forEach((b, i) => {
    out.push({ id: `glove:${b}`, kind: 'glove', shelf: 1, along: spread(i + 1, middle), won: (s.fight.bots[b]?.beaten ?? 0) > 0, metal: 1 });
  });
  const level = levelFor(s.xp);
  MILESTONES.forEach((m, i) => {
    out.push({ id: `level:${m}`, kind: 'frame', shelf: 2, along: spread(i, MILESTONES.length), won: level >= m, metal: 1 });
  });
  return out;
}

/** What the wall shows, as one string: the same string, the same wall */
export const trophyKey = (slots: readonly TrophySlot[]) => slots.map((t) => (t.won ? t.metal : 0)).join('');

/** The feed between the save and the drawing: `set()` from the save's side, `on()` from the drawing's */
export function createShelf() {
  let slots: TrophySlot[] = [];
  let key = '';
  const fns = new Set<(slots: readonly TrophySlot[]) => void>();
  return {
    /** The save as it is now; listeners hear only if the wall changed */
    set(s: TrophySave) {
      const next = trophies(s);
      const k = trophyKey(next);
      if (k === key) return;
      slots = next;
      key = k;
      for (const fn of fns) fn(slots);
    },
    get: (): readonly TrophySlot[] => slots,
    /** Hear of changes (and at once of what's there, if the save has been read); returns the way to stop */
    on(fn: (slots: readonly TrophySlot[]) => void) {
      fns.add(fn);
      if (key) fn(slots);
      return () => fns.delete(fn);
    },
  };
}
export const SHELF = createShelf();
