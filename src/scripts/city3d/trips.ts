/*
 * A trip on the city's two lines (docs/south-plan.md Phase 4h; the owner's calls, 2026-11-19): the raised metro
 * (metro.ts) and the south's tube (southline.ts, southtrains.ts) meet at The Trenches, so every station's card lists
 * every stop on both, and a stop on the other line is one trip: the first line's ride to The Trenches, the change there
 * made for you, the other line's ride on. DOM-free, tested in tests/trips.test.ts; ridden by tube-ui.ts.
 */
import { STATIONS, rideAt as metroRide } from './metro';
import { SOUTH_STATIONS, type StationId } from './southline';
import { rideAt as tubeRide } from './southtrains';

export type LineId = 'metro' | 'tube';
/** A stop on one of the lines: its line and its station's id there */
export interface Stop {
  line: LineId;
  id: string;
}
/** One ride of a trip: on a line, from one of its stations to another */
export interface Leg {
  line: LineId;
  from: string;
  to: string;
}
/** Where the lines meet: each one's station at The Trenches */
export const CHANGE_AT = { metro: 'trenches', tube: 'trenches' } as const;
/** The change between them at The Trenches, the stairs between the raised station and the tube's (seconds) */
export const CHANGE_S = 4;

/** Every stop on both lines, the metro's first, each in its line's order */
export const ALL_STOPS: (Stop & { name: string })[] = [
  ...STATIONS.map((s) => ({ line: 'metro' as const, id: s.id, name: s.name })),
  ...SOUTH_STATIONS.map((s) => ({ line: 'tube' as const, id: s.id, name: s.name })),
];
export const sameStop = (a: Stop, b: Stop) => a.line === b.line && a.id === b.id;

/**
 * A trip's rides from one stop to another: one on the same line; on the other, to The Trenches on the first and on
 * from The Trenches on the second (a ride left out where you're already there: from either Trenches station to the
 * other line's is the change alone, no ride). None from a stop to itself.
 */
export function tripOf(a: Stop, b: Stop): Leg[] {
  if (sameStop(a, b)) return [];
  if (a.line === b.line) return [{ line: a.line, from: a.id, to: b.id }];
  const legs: Leg[] = [];
  if (a.id !== CHANGE_AT[a.line]) legs.push({ line: a.line, from: a.id, to: CHANGE_AT[a.line] });
  if (b.id !== CHANGE_AT[b.line]) legs.push({ line: b.line, from: CHANGE_AT[b.line], to: b.id });
  return legs;
}
/** Whether a trip changes lines (at The Trenches) */
export const changes = (a: Stop, b: Stop) => a.line !== b.line;

/** How long a leg's ride takes (seconds) */
export const legTime = (l: Leg) => (l.line === 'metro' ? metroRide(l.from, l.to, 0).total : tubeRide(l.from as StationId, l.to as StationId, 0).total);
/** How long a trip takes, its rides and the change (seconds) */
export const tripTime = (a: Stop, b: Stop) => tripOf(a, b).reduce((t, l) => t + legTime(l), changes(a, b) ? CHANGE_S : 0);
