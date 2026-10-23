/*
 * Getting started: a short chain of first steps for a new player, one at a
 * time, each pointing at where to go next (a beam of light over it, and a
 * way there from the City view). Free of the DOM and of scene code; the
 * save's counters (tycoon.ts) are what the steps are checked against.
 *
 * - The steps run in order. A step is done the moment the save shows it
 *   (lifetime counters, so a player who's already done it moves straight
 *   on); it pays a small reward of Dorras and XP and the next one starts.
 * - The last step backs your save up at the Vault (the save lives in this
 *   browser only), so everyone learns early where that is.
 * - Hiding the guide only hides it (the beam and the cards); the steps still
 *   count, and it can be shown again from the Signal tower's board.
 *
 * Rewards are Dorras and XP for the city's game, nothing more.
 */
import { DOORS, GARAGE_SITE, RACK, STALL_SPOT } from './solids';
import { design } from './layout';
import { HUT_DOOR } from './kartcircuit';
import { GUIDE_STEPS, addXp, book, type TycoonSave } from './tycoon';

type At = { x: number; z: number };
/** Where walking starts for a step taken from the City view: a spot to stand on, facing what it's about */
export interface GuideWalk {
  x: number;
  z: number;
  yaw: number;
}
export interface GuideStep {
  id: string;
  name: string;
  /** What to do, in a line */
  hint: string;
  /** Where the beam stands */
  at: At;
  /** From the City view: open a building's panel, or start walking there */
  go: { open: string } | { walk: GuideWalk };
  /** Done when the save shows it */
  met(s: TycoonSave): boolean;
  reward: number;
  xp: number;
}

const door = (id: string) => DOORS.find((d) => d.id === id)!;
/** Stand at `from`, facing `to` (walk.ts's yaw: 0 faces -z) */
const facing = (from: At, to: At): GuideWalk => ({ x: from.x, z: from.z, yaw: Math.atan2(-(to.x - from.x), -(to.z - from.z)) });
const COUNTER = (([x, z]) => ({ x, z }))(design(24.7, 27.1));

export const GUIDE: GuideStep[] = [
  {
    id: 'stock',
    name: 'Stock your stall',
    hint: "Open the Emporium's market hall and buy goods for your stall.",
    at: door('emporium'),
    go: { open: 'emporium' },
    met: (s) => (s.ledger.totals.bought ?? 0) > 0 || s.counters.sold > 0,
    reward: 200,
    xp: 40,
  },
  {
    id: 'sell',
    name: 'Make some sales',
    hint: 'Sell 5 things. Your stall sells by itself; stand at it in the market square and it sells faster.',
    at: STALL_SPOT,
    go: { walk: facing(STALL_SPOT, { x: STALL_SPOT.x, z: STALL_SPOT.z - 1 }) },
    met: (s) => s.counters.sold >= 5,
    reward: 200,
    xp: 40,
  },
  {
    id: 'drive',
    name: 'Take your car out',
    hint: 'Your car waits on the turntable at the garage, south of the river. Get in and drive 100 tiles.',
    at: GARAGE_SITE.turntable,
    go: { walk: facing(GARAGE_SITE.door, GARAGE_SITE.turntable) },
    met: (s) => s.counters.driven >= 100,
    reward: 250,
    xp: 50,
  },
  {
    id: 'contract',
    name: 'Deliver a contract',
    hint: 'Take a contract at the Signal tower, load the goods into your car and drive them to the beam.',
    at: door('signal'),
    go: { open: 'signal' },
    met: (s) => s.counters.contracts >= 1,
    reward: 300,
    xp: 60,
  },
  {
    id: 'practice',
    name: 'Target practice',
    hint: "Gear up at the Armoury's counter, then knock down 3 dummies in the north-west park or patrol drones.",
    at: RACK,
    go: { walk: facing(RACK, COUNTER) },
    met: (s) => s.counters.dummies + s.counters.drones >= 3,
    reward: 250,
    xp: 50,
  },
  {
    id: 'race',
    name: 'Race at the kart park',
    hint: "Walk in at the kart park's gate, north-east past the ring highway, and finish a race from the kart hut.",
    at: HUT_DOOR,
    go: { walk: facing({ x: HUT_DOOR.x, z: HUT_DOOR.z + 1.5 }, HUT_DOOR) },
    met: (s) => s.counters.kartRaces >= 1,
    reward: 400,
    xp: 80,
  },
  {
    id: 'backup',
    name: 'Back up your save',
    hint: 'Your progress lives in this browser only. Download a backup at the Vault to keep it safe.',
    at: door('vault'),
    go: { open: 'vault' },
    met: (s) => s.backup > 0,
    reward: 300,
    xp: 60,
  },
];

/** The step you're on, or null once the guide's done */
export const guideStep = (s: TycoonSave): GuideStep | null => GUIDE[s.guide.step] ?? null;
export const guideDone = (s: TycoonSave) => s.guide.step >= GUIDE_STEPS;
/** Where the guide's beam stands (null when it's done or hidden) */
export function guideAt(s: TycoonSave): At | null {
  const g = guideStep(s);
  return g && !s.guide.hidden ? { x: g.at.x, z: g.at.z } : null;
}
/** Finish every step the save already shows, in order: their rewards and XP. Returns the steps just done */
export function advanceGuide(s: TycoonSave): GuideStep[] {
  const done: GuideStep[] = [];
  for (let g = guideStep(s); g && g.met(s); g = guideStep(s)) {
    s.guide.step++;
    s.dorras += g.reward;
    book(s, 'missions', g.reward);
    addXp(s, g.xp);
    done.push(g);
  }
  return done;
}
/** Hide the guide (its beam and cards), or show it again */
export function hideGuide(s: TycoonSave, hidden: boolean) {
  s.guide.hidden = hidden;
}
