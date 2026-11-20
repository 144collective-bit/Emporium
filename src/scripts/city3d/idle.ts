/**
 * A person standing about at a place (the landmarks' crowds, the districts' idle people). DOM-free: only the type, so the
 * rules files and the game server (which type-checks what it bundles) can name it without reaching the drawing code;
 * landmarks.ts re-exports it.
 */
import type { IdleAct } from './crowdclips';

export interface Idle {
  x: number;
  z: number;
  /** Facing: 0 is +z, PI / 2 is +x */
  ry: number;
  /** Standing height, or for `sit` the seat height */
  y?: number;
  /** What they're doing: looking around (default), chatting, sitting, queueing, reading their phone, or at work (crowdclips.ts `IdleAct`) */
  act?: IdleAct;
  /** How big (a grown-up by default; kids at play are smaller) */
  scale?: number;
  /** Only sometimes there (the stadium's queue on match night, the civic square's by day: given the city's hour):
   * out of the world while this says no (life.ts) */
  when?: (hour: number) => boolean;
}
