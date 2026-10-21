/*
 * The mission board (the Signal tower) and the badges: things to do around
 * the city for Dorras and XP. Free of the DOM and of scene code; the save's
 * counters (tycoon.ts) are the record missions and badges are checked against.
 *
 * - A mission is a target on one counter (sell 150 things, knock down 15
 *   drones, drive 300 tiles), a race to finish (under par, maybe) or plots to
 *   own. Taking one remembers the counters as they stood, so only what you
 *   do after counts. Up to three at once; claim the reward when it's done.
 * - Badges are lifetime milestones: earned the moment a counter crosses
 *   the line, each with XP. No prizes, no real rewards: Dorras and XP only.
 */
import { levelFor } from './catalog';
import { race } from './races';
import { addXp, book, count, level, newCounters, plotCount, type ActiveMission, type CounterId, type Counters, type TycoonSave } from './tycoon';

export type Goal = { counter: CounterId; n: number } | { race: string; par?: boolean } | { plots: number };
export interface Mission {
  id: string;
  name: string;
  blurb: string;
  /** Level needed to take it */
  level: number;
  goal: Goal;
  reward: number;
  xp: number;
}
export const MISSIONS_MAX = 3;

const counter = (counter: CounterId, n: number): Goal => ({ counter, n });
export const MISSIONS: Mission[] = [
  // Tier 1: getting started
  { id: 'first-sales', name: 'Open for business', blurb: 'Sell 20 things at your stall or shops.', level: 1, goal: counter('sold', 20), reward: 300, xp: 60 },
  { id: 'drone-patrol', name: 'Drone patrol', blurb: 'Knock down 3 patrol drones.', level: 1, goal: counter('drones', 3), reward: 400, xp: 80 },
  { id: 'paper-run', name: 'Paper run', blurb: 'Deliver 1 contract from the Signal tower.', level: 1, goal: counter('contracts', 1), reward: 400, xp: 80 },
  { id: 'joyride', name: 'Joyride', blurb: 'Drive 300 tiles in your own car.', level: 1, goal: counter('driven', 300), reward: 300, xp: 60 },
  { id: 'warm-up', name: 'Warm-up lap', blurb: 'Finish the River Loop at the start line on the south bank.', level: 1, goal: { race: 'river-loop' }, reward: 600, xp: 100 },
  { id: 'first-lap', name: 'First lap', blurb: 'Finish a race at the kart park, north-east past the Parkway.', level: 1, goal: counter('kartRaces', 1), reward: 500, xp: 100 },
  // Tier 2
  { id: 'shopkeeper', name: 'Shopkeeper', blurb: 'Sell 150 things.', level: 3, goal: counter('sold', 150), reward: 900, xp: 150 },
  { id: 'courier-king', name: 'Courier king', blurb: 'Deliver 5 contracts.', level: 3, goal: counter('contracts', 5), reward: 1200, xp: 180 },
  { id: 'drone-hunter', name: 'Drone hunter', blurb: 'Knock down 15 drones.', level: 3, goal: counter('drones', 15), reward: 1000, xp: 150 },
  { id: 'dummy-run', name: 'Dummy run', blurb: 'Knock down 25 training dummies.', level: 3, goal: counter('dummies', 25), reward: 800, xp: 120 },
  { id: 'ring-rookie', name: 'Ring rookie', blurb: 'Finish the Ring Circuit.', level: 3, goal: { race: 'ring-circuit' }, reward: 1200, xp: 160 },
  { id: 'landlord', name: 'Landlord', blurb: 'Buy 2 units, lots or plots.', level: 3, goal: counter('land', 2), reward: 800, xp: 100 },
  { id: 'podium', name: 'Podium', blurb: 'Finish a kart race in the top three.', level: 3, goal: counter('podiums', 1), reward: 1200, xp: 160 },
  { id: 'pigeon-post', name: 'Pigeon post', blurb: 'Land 10 item hits on rivals at the kart park.', level: 3, goal: counter('kartHits', 10), reward: 900, xp: 140 },
  // Tier 3
  { id: 'dash', name: 'Dash', blurb: 'Finish the Downtown Dash.', level: 5, goal: { race: 'downtown-dash' }, reward: 2000, xp: 240 },
  { id: 'under-par', name: 'Under par', blurb: 'Finish the River Loop under par.', level: 5, goal: { race: 'river-loop', par: true }, reward: 1500, xp: 200 },
  { id: 'in-training', name: 'Tycoon in training', blurb: 'Take 25,000 Dorras in sales, contracts and prizes.', level: 5, goal: counter('earned', 25000), reward: 2000, xp: 250 },
  { id: 'tuner', name: 'Tuner', blurb: 'Buy 3 upgrades: mods at the garage or the Armoury, or levels for your places.', level: 5, goal: counter('upgrades', 3), reward: 1200, xp: 150 },
  { id: 'retail-chain', name: 'Retail chain', blurb: 'Sell 600 things.', level: 5, goal: counter('sold', 600), reward: 2500, xp: 300 },
  { id: 'kart-winner', name: 'Chequered flag', blurb: 'Win a kart race.', level: 5, goal: counter('kartWins', 1), reward: 2500, xp: 300 },
  // Tier 4
  { id: 'ring-master', name: 'Ring master', blurb: 'Finish the Ring Circuit under par.', level: 8, goal: { race: 'ring-circuit', par: true }, reward: 4000, xp: 400 },
  { id: 'fleet', name: 'Fleet', blurb: 'Buy 3 things at the garage, the Armoury or Drop 001.', level: 8, goal: counter('bought', 3), reward: 3000, xp: 300 },
  { id: 'haulage', name: 'Haulage', blurb: 'Deliver 20 contracts.', level: 8, goal: counter('contracts', 20), reward: 6000, xp: 600 },
  { id: 'road-trip', name: 'Road trip', blurb: 'Drive 3,000 tiles.', level: 8, goal: counter('driven', 3000), reward: 3000, xp: 300 },
  { id: 'property-mogul', name: 'Property mogul', blurb: 'Own a district plot (the estate agent is in the Vault).', level: 8, goal: { plots: 1 }, reward: 10000, xp: 1000 },
  { id: 'kart-hat-trick', name: 'Hat-trick', blurb: 'Win 3 kart races.', level: 8, goal: counter('kartWins', 3), reward: 5000, xp: 500 },
  // Tier 5
  { id: 'grand-tourist', name: 'Grand tourist', blurb: 'Finish the Grand Tour.', level: 12, goal: { race: 'grand-tour' }, reward: 8000, xp: 800 },
  { id: 'ace', name: 'Ace', blurb: 'Finish 3 races under par.', level: 12, goal: counter('pars', 3), reward: 6000, xp: 600 },
  { id: 'magnate', name: 'Magnate', blurb: 'Take 250,000 Dorras.', level: 12, goal: counter('earned', 250000), reward: 15000, xp: 1500 },
  { id: 'kart-champion', name: 'Kart champion', blurb: 'Win 10 kart races.', level: 12, goal: counter('kartWins', 10), reward: 12000, xp: 1200 },
  // Tier 6
  { id: 'speed-demon', name: 'Speed demon', blurb: 'Finish the Grand Tour under par.', level: 18, goal: { race: 'grand-tour', par: true }, reward: 20000, xp: 2000 },
  { id: 'empire', name: 'Empire', blurb: 'Take 1,000,000 Dorras.', level: 18, goal: counter('earned', 1000000), reward: 50000, xp: 5000 },
  { id: 'master-tuner', name: 'Master tuner', blurb: 'Buy 24 upgrades.', level: 18, goal: counter('upgrades', 24), reward: 20000, xp: 2000 },
];
export const MISSION_IDS = MISSIONS.map((m) => m.id);
export const mission = (id: string) => MISSIONS.find((m) => m.id === id) ?? null;

export type MissionState = 'done' | 'active' | 'open' | 'locked';
export function missionState(s: TycoonSave, id: string): MissionState {
  const m = mission(id);
  if (!m) return 'locked';
  if (s.missions.done.includes(id)) return 'done';
  if (s.missions.active.some((a) => a.id === id)) return 'active';
  return level(s) >= m.level ? 'open' : 'locked';
}
/** The missions you've taken on (unknown ids dropped) */
export const activeMissions = (s: TycoonSave) => s.missions.active.filter((a) => mission(a.id));
/** How far along an active mission is: what's done, what it needs (0..1 when it's a yes-or-no goal) */
export function missionProgress(s: TycoonSave, a: ActiveMission): { done: number; need: number; complete: boolean } {
  const m = mission(a.id);
  if (!m) return { done: 0, need: 1, complete: false };
  const g = m.goal;
  if ('counter' in g) {
    const done = Math.max(0, (s.counters[g.counter] ?? 0) - (a.from[g.counter] ?? 0));
    return { done: Math.min(done, g.n), need: g.n, complete: done >= g.n };
  }
  if ('plots' in g) return { done: Math.min(plotCount(s), g.plots), need: g.plots, complete: plotCount(s) >= g.plots };
  const r = race(g.race);
  const best = s.races[g.race];
  const complete = !!r && best !== undefined && (!g.par || best <= r.par);
  return { done: complete ? 1 : 0, need: 1, complete };
}
export type MissionResult = { ok: true; reward: number; xp: number; levels: number } | { ok: false; why: 'level' | 'max' | 'owned' | 'place' | 'progress' };
export function acceptMission(s: TycoonSave, id: string, now: number): MissionResult {
  const m = mission(id);
  if (!m) return { ok: false, why: 'place' };
  const st = missionState(s, id);
  if (st === 'done' || st === 'active') return { ok: false, why: 'owned' };
  if (st === 'locked') return { ok: false, why: 'level' };
  if (activeMissions(s).length >= MISSIONS_MAX) return { ok: false, why: 'max' };
  s.missions.active.push({ id, from: { ...newCounters(), ...s.counters }, at: now });
  return { ok: true, reward: 0, xp: 0, levels: 0 };
}
export function abandonMission(s: TycoonSave, id: string) {
  const had = s.missions.active.some((a) => a.id === id);
  s.missions.active = s.missions.active.filter((a) => a.id !== id);
  return had;
}
/** Claim a finished mission: the reward and its XP */
export function claimMission(s: TycoonSave, id: string): MissionResult {
  const a = s.missions.active.find((x) => x.id === id);
  const m = mission(id);
  if (!a || !m) return { ok: false, why: 'place' };
  if (!missionProgress(s, a).complete) return { ok: false, why: 'progress' };
  s.missions.active = s.missions.active.filter((x) => x !== a);
  s.missions.done.push(id);
  s.dorras += m.reward;
  book(s, 'missions', m.reward);
  count(s, 'missions', 1);
  const levels = addXp(s, m.xp);
  return { ok: true, reward: m.reward, xp: m.xp, levels };
}
/** Active missions that are ready to claim */
export const claimable = (s: TycoonSave) => activeMissions(s).filter((a) => missionProgress(s, a).complete);

/* ---------- Badges ---------- */

export interface Badge {
  id: string;
  name: string;
  blurb: string;
  xp: number;
  /** A counter threshold, or a level */
  on: { counter: CounterId; n: number } | { level: number };
}
const b = (id: string, name: string, blurb: string, counterId: CounterId, n: number, xp: number): Badge => ({ id, name, blurb, xp, on: { counter: counterId, n } });
export const BADGES: Badge[] = [
  b('seller-100', 'Trader', 'Sold 100 things.', 'sold', 100, 100),
  b('seller-1k', 'Merchant', 'Sold 1,000 things.', 'sold', 1000, 400),
  b('seller-10k', 'Market maker', 'Sold 10,000 things.', 'sold', 10000, 2000),
  b('earned-10k', 'First ten thousand', 'Took 10,000 Dorras.', 'earned', 10000, 150),
  b('earned-100k', 'Six figures', 'Took 100,000 Dorras.', 'earned', 100000, 800),
  b('earned-1m', 'Millionaire', 'Took 1,000,000 Dorras.', 'earned', 1000000, 4000),
  b('contracts-10', 'Reliable', 'Delivered 10 contracts.', 'contracts', 10, 200),
  b('contracts-100', 'Logistics', 'Delivered 100 contracts.', 'contracts', 100, 1500),
  b('drones-10', 'Buzz off', 'Knocked down 10 drones.', 'drones', 10, 100),
  b('drones-100', 'Air defence', 'Knocked down 100 drones.', 'drones', 100, 800),
  b('dummies-50', 'Range day', 'Knocked down 50 dummies.', 'dummies', 50, 150),
  b('races-5', 'Racer', 'Finished 5 races.', 'races', 5, 200),
  b('races-25', 'Road warrior', 'Finished 25 races.', 'races', 25, 1000),
  b('karts-1', 'Karter', 'Finished a kart race.', 'kartRaces', 1, 100),
  b('karts-25', 'Track regular', 'Finished 25 kart races.', 'kartRaces', 25, 800),
  b('podiums-10', 'Podium regular', 'Ten podiums at the kart park.', 'podiums', 10, 500),
  b('kart-wins-25', 'Kart king', 'Won 25 kart races.', 'kartWins', 25, 2500),
  b('hits-50', 'Pigeon fancier', 'Landed 50 item hits.', 'kartHits', 50, 400),
  b('records-3', 'Record breaker', 'Set 3 best times.', 'records', 3, 150),
  b('driven-1k', 'Round the block', 'Drove 1,000 tiles.', 'driven', 1000, 100),
  b('driven-10k', 'High mileage', 'Drove 10,000 tiles.', 'driven', 10000, 800),
  b('land-3', 'Landowner', 'Bought 3 units, lots or plots.', 'land', 3, 200),
  b('land-10', 'Developer', 'Bought 10 units, lots or plots.', 'land', 10, 1200),
  b('upgrades-10', 'Modder', 'Bought 10 upgrades.', 'upgrades', 10, 300),
  b('missions-10', 'Go-getter', 'Finished 10 missions.', 'missions', 10, 400),
  { id: 'level-5', name: 'Level 5', blurb: 'Reached level 5.', xp: 0, on: { level: 5 } },
  { id: 'level-10', name: 'Level 10', blurb: 'Reached level 10.', xp: 0, on: { level: 10 } },
  { id: 'level-20', name: 'Level 20', blurb: 'Reached level 20.', xp: 0, on: { level: 20 } },
  { id: 'level-30', name: 'Level 30', blurb: 'Reached level 30.', xp: 0, on: { level: 30 } },
];
export const BADGE_IDS = BADGES.map((x) => x.id);
export const badge = (id: string) => BADGES.find((x) => x.id === id) ?? null;
export const hasBadge = (s: TycoonSave, id: string) => s.badges.includes(id);
export const badgeMet = (s: TycoonSave, x: Badge) => ('level' in x.on ? levelFor(s.xp) >= x.on.level : (s.counters[x.on.counter] ?? 0) >= x.on.n);
/** Award every badge whose line was just crossed; returns the new ones */
export function checkBadges(s: TycoonSave) {
  const fresh: Badge[] = [];
  for (const x of BADGES) {
    if (hasBadge(s, x.id) || !badgeMet(s, x)) continue;
    s.badges.push(x.id);
    addXp(s, x.xp);
    fresh.push(x);
  }
  return fresh;
}
/** The counters a mission or badge watches, for the board's copy */
export const COUNTER_NAMES: Record<CounterId, string> = {
  sold: 'things sold',
  earned: 'Dorras taken',
  contracts: 'contracts delivered',
  dummies: 'dummies down',
  drones: 'drones down',
  races: 'races finished',
  pars: 'races under par',
  records: 'best times',
  driven: 'tiles driven',
  bought: 'things bought',
  land: 'land bought',
  built: 'buildings built',
  upgrades: 'upgrades',
  missions: 'missions done',
  kartRaces: 'kart races finished',
  podiums: 'kart podiums',
  kartWins: 'kart races won',
  kartHits: 'item hits landed',
  bouts: 'bouts fought',
  fightWins: 'bouts won',
  kos: 'knock-outs',
  chains: 'chains of three',
};
export type { Counters };
