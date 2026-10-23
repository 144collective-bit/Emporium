/*
 * The river's boats (city life plan, Phase 4). DOM-free: life.ts draws
 * them, tests/boats.test.ts checks them.
 *
 * - A boat sounds its horn coming up to a bridge (`hornDue()`: once a
 *   bridge, `HORN_AHEAD` before it).
 * - It cruises at a speed that eases up and down (`cruise()`), and its
 *   wake trails it by its speed (`wakeOf()`).
 * - The odd boat is moored at a jetty (`MOORED`): alongside the deck's
 *   downstream end, clear of the lanes the others run in.
 */
import { RIVER, WALK_W } from './layout';
import { riverBridges } from './streetplan';
import { JETTIES } from './outer';
import { BOAT_LANES } from './liberty';

/** Every bridge over the river: its centre (x) and how far either side of it a boat counts as under it */
export const BRIDGES: { c: number; half: number }[] = riverBridges().map((b) => ({ c: b.c, half: b.half + WALK_W + 2.5 }));

/** A boat sounds its horn this far before a bridge */
export const HORN_AHEAD = 10;

/** A boat's horn: the bridge it last sounded for */
export interface BoatHorn {
  last: number;
}
export const newBoatHorn = (): BoatHorn => ({ last: -1 });

/** Does the boat at x going v sound its horn this frame (coming up to a bridge it hasn't yet)? */
export function hornDue(h: BoatHorn, x: number, v: number): boolean {
  const way = Math.sign(v) || 1;
  for (let i = 0; i < BRIDGES.length; i++) {
    const b = BRIDGES[i];
    const ahead = (b.c - b.half * way - x) * way;
    if (ahead > 0 && ahead <= HORN_AHEAD) {
      if (h.last === i) return false;
      h.last = i;
      return true;
    }
  }
  // Clear of every bridge's approach: the next one sounds again (a boat going back the other way too)
  if (h.last >= 0 && !BRIDGES.some((b) => Math.abs(x - b.c) < b.half + HORN_AHEAD)) h.last = -1;
  return false;
}

/** A boat's speed this moment: its cruising speed easing up and down, never under 0.55 of it */
export const cruise = (base: number, t: number, ph: number) => base * (0.775 + 0.225 * Math.sin(t * 0.09 + ph));

/** The wake behind a boat, by its speed: how long it trails (tiles), how wide, how bright (0..1) */
export function wakeOf(v: number, vmax: number) {
  const k = Math.min(1, Math.abs(v) / Math.max(0.01, vmax));
  return { len: 1.2 + 2.2 * k, width: 0.7 + 0.4 * k, alpha: 0.5 + 0.5 * k };
}

/** A boat moored at a jetty: where, which way it faces (yaw, +x is 0) and its paint */
export interface Moored {
  x: number;
  z: number;
  yaw: number;
  color: string;
}
/** How far from the bank's edge a moored boat's middle lies */
export const MOOR_OFF = 0.55;
/** The odd boat tied up: alongside a jetty's end, its bow upstream, clear of the lanes the river's boats run in */
export const MOORED: Moored[] = [
  { x: 92, z: 0, yaw: 0, color: '#4fb0ff' },
  { x: -24, z: 0, yaw: Math.PI, color: '#f3f2f7' },
].map((m) => {
  const j = JETTIES.find((q) => q.x === m.x)!;
  // The deck reaches 0.65 out from the promenade's rail (neighbourhoods.ts); the boat lies past its end
  const z = j.bank === 'north' ? RIVER[0] + MOOR_OFF : RIVER[1] - MOOR_OFF;
  return { ...m, x: m.x + 1.9, z };
});

/** The lanes the river's boats run in (liberty.ts): a moored boat keeps clear of them */
export const LANES = BOAT_LANES;
