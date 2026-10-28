/**
 * The kart park's cups (kart-sim.ts runs them): which way round, how many laps and in what conditions each
 * race of a series is, how fast the rivals go and what the places pay. On their own so the boot (the save, the
 * walk's hut prompt, the City-view panel's records) reads them without the race's rules, which load with the
 * race (docs/tailoring-plan.md Phase 0).
 */
import type { ClassId } from './catalog';
import type { Cond, CourseId } from './kartcircuit';

export type CupId = 'rookie' | 'pro' | 'neon';
/** One race of a cup: which way round, how many laps, in what conditions */
export interface CupRace {
  course: CourseId;
  laps: number;
  cond: Cond;
}
export interface Cup {
  id: CupId;
  name: string;
  blurb: string;
  /** Level needed to enter */
  level: number;
  /** The engine class it runs at, and the four races of its series */
  cls: ClassId;
  races: CupRace[];
  /** How fast the rivals go (a share of a fully tuned kart's pace) and how hard they race */
  ai: number;
  skill: number;
  /** What each place pays (Dorras), first to last */
  prizes: number[];
}
const R = (course: CourseId, laps: number, cond: Cond = 'day'): CupRace => ({ course, laps, cond });
export const CUPS: Record<CupId, Cup> = {
  rookie: {
    id: 'rookie',
    name: 'Rookie Cup',
    blurb: 'Seven easy-going rivals at Street pace. Learn the circuit both ways, and once by night.',
    level: 1,
    cls: 'street',
    races: [R('circuit', 2), R('circuit-reverse', 2), R('circuit', 2, 'night'), R('circuit-reverse', 3)],
    ai: 0.8,
    skill: 0.5,
    prizes: [1500, 900, 600, 400, 300, 200, 150, 100],
  },
  pro: {
    id: 'pro',
    name: 'Pro Cup',
    blurb: 'Sport pace. The rivals brake later and drift more. A wet race and a night race. Bring a tuned kart.',
    level: 4,
    cls: 'sport',
    races: [R('circuit-reverse', 3), R('circuit', 3, 'rain'), R('circuit-reverse', 3, 'night'), R('circuit', 3)],
    ai: 0.92,
    skill: 0.8,
    prizes: [4000, 2400, 1500, 1000, 700, 500, 350, 250],
  },
  neon: {
    id: 'neon',
    name: 'Neon Cup',
    blurb: 'Neon pace, flat out. The rivals drift every corner, rain or shine, and the last race is four laps.',
    level: 9,
    cls: 'neon',
    races: [R('circuit', 3, 'night'), R('circuit-reverse', 3, 'rain'), R('circuit', 3, 'rain'), R('circuit-reverse', 4, 'night')],
    ai: 1.0,
    skill: 1,
    prizes: [10000, 6000, 3800, 2500, 1800, 1200, 900, 600],
  },
};
export const CUP_IDS = Object.keys(CUPS) as CupId[];
export const cup = (id: string) => CUPS[id as CupId] ?? null;

