/*
 * What the city fills in for the hub's tabs (docs/header-plan.md), as settings-store.ts `actions` does for Settings:
 * the hub is the page's and opens before the city is up, so its tabs (hubtabs-ui.ts) ask here and find nothing until
 * then.
 */
import type { GoAct, TravelState } from './maptab';

export interface MapHooks {
  /** The City view, on foot, or busy (at a wheel, on a ride) */
  state(): TravelState;
  /** The places walked to (fast travel's) */
  visited(): readonly string[];
  /** Where you are: walking, where you stand; in the City view, where it looks */
  here(): { x: number; z: number };
  /** Go to a place the way Go says (maptab.ts `goAct()`) */
  go(spot: string, act: GoAct): void;
  /** A waypoint at a place */
  pin(spot: string): void;
}

export const hubHooks: { map?: MapHooks } = {};
