/*
 * The sparring partners on the street (docs/inventory-plan.md Phase 3): three
 * fighters waiting in the guard at fixed spots, each a "Spar" prompt that
 * starts a street spar with health against them (fight.ts, kind 'street').
 * DOM-free, tested in tests/brawlsite.test.ts; walk.ts finds the prompt,
 * brawl.ts draws them idle, fight.ts runs the spar in the partner's arena.
 *
 * - A partner stands at (x, z) looking along `yaw` (the fight's frame: it
 *   faces (sin yaw, cos yaw)), the way people come up to it. A spar puts you
 *   `GAP` in front of it, the two facing each other, in a ring of `r` round
 *   the point between you (`arenaOf()`): the sim keeps both inside it, so
 *   the ring is clear of everything solid, of the lawns' walks, beds and
 *   furniture, and of anyone standing about (the test holds it).
 * - Big Duke on the south bank's lawn behind the Fight Club (its pocket park
 *   east of it is all trees and benches), Tash on The
 *   Block's plaza between its chatting groups and its gantry, Old Sal on Pier
 *   7's head between the fishers and the binoculars (the deck's height comes
 *   from walk mode's ground when the spar starts). Made-up names, a crew look
 *   each (crew.ts `crewOutfit()`, numbers past the gym's three), and a bot
 *   each, easy to hard, in the three styles.
 * - Solid where they stand (`PARTNER_SOLIDS`, added to the grids by walk
 *   mode's chunk, not the city's `SOLIDS`: the lawns' walks are routed round
 *   those when the city loads).
 */
import type { Box } from './solids';
import type { BotTraits } from './fight-sim';
import { PARTNER_NAMES, type PartnerId, type StyleId } from './fight-moves';

export { PARTNER_IDS, type PartnerId } from './fight-moves';
export interface Partner {
  id: PartnerId;
  name: string;
  /** Where they wait, as the trainer says it */
  where: string;
  x: number;
  z: number;
  yaw: number;
  /** The spar's ring (tiles) */
  r: number;
  /** How the bot fights (fight-sim.ts botTraits()) */
  skill: number;
  style: StyleId;
  traits: Partial<BotTraits>;
  /** Which crew look they wear */
  look: number;
}

/** How far in front of a partner you start a spar */
export const GAP = 1.7;
/** How close the "Spar" prompt shows */
export const PROMPT_R = 1.5;
/** A partner's footprint while waiting (half a side) and height */
const HALF = 0.28;
const HEIGHT = 1.3;

const E = Math.PI / 2;
// (every ring is held clear of the solids, the lawns' walks, beds and furniture, the pocket parks and squares, the benches and the people about: tests/brawlsite.test.ts)
export const PARTNERS: Partner[] = [
  {
    id: 'duke',
    name: PARTNER_NAMES.duke,
    where: 'the lawn behind the Fight Club',
    x: 105.95,
    z: 156.6,
    yaw: E,
    r: 2.3,
    skill: 0.35,
    style: 'brawler',
    traits: { block: 0.2, dodge: 0.05, kicks: 0.2, pace: 70 },
    look: 3,
  },
  {
    id: 'tash',
    name: PARTNER_NAMES.tash,
    where: "The Block's plaza",
    x: -99,
    z: 183.3,
    yaw: E,
    r: 2.2,
    skill: 0.55,
    style: 'kickboxer',
    traits: { block: 0.45, dodge: 0.12, kicks: 0.5, pace: 52, backOff: 18 },
    look: 4,
  },
  {
    id: 'sal',
    name: PARTNER_NAMES.sal,
    where: "Pier 7's head",
    x: -97.45,
    z: 123.65,
    yaw: E,
    r: 1.45,
    skill: 0.75,
    style: 'street',
    traits: { block: 0.55, dodge: 0.12, parry: 0.35, kicks: 0.25, finisher: true, telegraph: 8, backOff: 40, pace: 46 },
    look: 5,
  },
];
export const partner = (id: string) => PARTNERS.find((p) => p.id === id) ?? null;

const fwd = (yaw: number) => [Math.sin(yaw), Math.cos(yaw)] as const;
/** Where you start a spar: in front of them, facing them */
export function startOf(p: Partner) {
  const [fx, fz] = fwd(p.yaw);
  return { x: p.x + fx * GAP, z: p.z + fz * GAP, yaw: p.yaw + Math.PI };
}
/** The spar's ring: round the point between you */
export function arenaOf(p: Partner) {
  const [fx, fz] = fwd(p.yaw);
  return { x: p.x + (fx * GAP) / 2, z: p.z + (fz * GAP) / 2, r: p.r };
}
/** Where you stand after a spar: where you started it, facing them */
export const afterOf = startOf;
/** The partner whose prompt shows here, if any (the nearest) */
export function partnerNear(x: number, z: number) {
  let best: Partner | null = null;
  let d = PROMPT_R;
  for (const p of PARTNERS) {
    const e = Math.hypot(p.x - x, p.z - z);
    if (e < d) {
      d = e;
      best = p;
    }
  }
  return best;
}
/** Where they stand, solid while they wait */
export const PARTNER_SOLIDS: Box[] = PARTNERS.map((p) => [p.x - HALF, p.z - HALF, p.x + HALF, p.z + HALF, HEIGHT]);
