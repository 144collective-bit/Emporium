/*
 * Which circuit a race is on (docs/kart-harbour-plan.md, Phase 3): today's (kartcircuit.ts) or Riverside Raceway's
 * (kartcourse2.ts), as the course and the track's own numbers kart-sim.ts reads. DOM-free, tested with the sim.
 */
import { COURSES, GRID, KERB, RESET_AT, TRACK_HALF, enclosed, gridSlots, groundAt, type Course, type RaceCourseId } from './kartcircuit';
import { COURSE2_IDS, GRID2, KERB2, TRACK2_HALF, type Course2Id } from './kartcircuit2';
import { BOXES2, RESET2_AT, RIVER_COURSES, enclosed2, gridSlots2Of, groundAt2 } from './kartcourse2';
import { BOXES } from './kartitems';
import type { Frame } from './kartpark';

/** A track's own numbers: its half width and kerbs, where a kart's put back, the grid, the ground across it, its walled stretches, the item boxes */
export interface Track {
  half: number;
  kerb: number;
  resetAt: number;
  grid: number;
  gridSlots(c: Course): { s: number; lateral: number }[];
  groundAt(f: Frame, lateral: number): number;
  enclosed(f: Frame): boolean;
  boxes: { x: number; z: number; y: number; row: number }[];
}
export const TODAY_TRACK: Track = { half: TRACK_HALF, kerb: KERB, resetAt: RESET_AT, grid: GRID, gridSlots, groundAt, enclosed, boxes: BOXES };
export const RIVER_TRACK: Track = { half: TRACK2_HALF, kerb: KERB2, resetAt: RESET2_AT, grid: GRID2, gridSlots: gridSlots2Of, groundAt: groundAt2, enclosed: enclosed2, boxes: BOXES2 };

/** Riverside Raceway's courses */
export const isRiverside = (id: RaceCourseId): id is Course2Id => (COURSE2_IDS as string[]).includes(id);
export const courseOf = (id: RaceCourseId): Course => (isRiverside(id) ? RIVER_COURSES[id] : COURSES[id]);
export const trackOf = (id: RaceCourseId): Track => (isRiverside(id) ? RIVER_TRACK : TODAY_TRACK);
