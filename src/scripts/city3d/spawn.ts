/*
 * Waking up at home (docs/spawn-plan.md, the owner's call: every visit starts in Degen's room, home.ts `HOME_WAKE`,
 * and the rest of the city loads behind its walls). DOM-free, tested in tests/spawn.test.ts. The view (index.ts)
 * asks it, a few times a second, whether the street outside is ready, and until it is the ways out of the room wait
 * (home.ts `HOME_WAITS`: their prompt reads `WAITING`).
 *
 * - **Ready** when every lazy district within `READY_REACH` of the gates has loaded and no site within that reach
 *   is still waiting to be built: the yard, the Close and what's seen from the terrace, not the whole city (which
 *   takes far longer than anyone waits in a room).
 * - **Never stuck**: after `GIVE_UP_MS` the doors open whatever is still loading (a chunk that won't download, a
 *   very slow phone); what's left comes in as you go, as it always has.
 * - Once ready, ready for the rest of the visit (the view keeps the answer).
 */
import { HOME } from './home';
import { rectDistance } from './tileplan';
import type { Rect } from './tiles';

/**
 * The room's curtains (home.ts `CURTAIN`, drawn by home3d.ts): drawn while he waits, open once the street's ready.
 * index.ts sets it, home3d.ts's tick follows it; open unless he's waking
 */
export const curtains = { open: true };

/** How far round the gates the street has to be built before the doors open */
export const READY_REACH = 60;
/** The longest the doors wait (ms since he woke) */
export const GIVE_UP_MS = 25000;
/** Where "round the house" is measured from: the gates on the lane */
export const READY_AT: [number, number] = [HOME.gates.x, (HOME.gates.z0 + HOME.gates.z1) / 2];

/** The districts (lazy chunks, districts.ts `LAZY_DISTRICTS`) within reach of the house that haven't loaded */
export function dueDistricts(list: readonly { id: string; rect: Rect }[], loaded: readonly string[], at = READY_AT, reach = READY_REACH): string[] {
  return list.filter((d) => !loaded.includes(d.id) && rectDistance(at[0], at[1], d.rect) <= reach).map((d) => d.id);
}

/** Is the street outside ready for him to go out? */
export function streetReady(o: { due: number; waiting: number; waitedMs: number }): boolean {
  return (o.due === 0 && o.waiting === 0) || o.waitedMs >= GIVE_UP_MS;
}
