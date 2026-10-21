/*
 * Your own aircraft: which one, what paint. Picked at the airport's hangar
 * (hangar-ui.ts) and kept in the browser. All three are free and only for
 * the city (the owner's call): never sold, priced, or tied to the store or
 * the token. How each one flies is flight-sim.ts.
 *
 * Kept free of the DOM and of scene code, like the other shared data.
 */
import { CAR_PAINTS, type PaintId } from './mycar';

/** The aircraft a player can fly: a high-wing prop plane, a small jet and a helicopter */
export const PLAYER_AIRCRAFT = ['prop', 'bizjet', 'heli'] as const;
export type PlaneId = (typeof PLAYER_AIRCRAFT)[number];

/** What the hangar says about each one (made-up names, never a real maker) */
export const FLY: Record<PlaneId, { name: string; kind: string; blurb: string }> = {
  prop: { name: 'Sky Hopper', kind: 'Prop plane', blurb: 'Slow, steady and easy to land. Takes off in a short hop and turns on a coin.' },
  bizjet: { name: 'Neon Dart', kind: 'Small jet', blurb: 'Twin engines at the back and swept wings. Needs a long run, then it flies fast and far.' },
  heli: { name: 'Whirlybird', kind: 'Helicopter', blurb: 'Lifts straight up, hovers, turns on the spot and lands on any flat roof.' },
};

/** The same twelve paints as the garage */
export const PLANE_PAINTS = CAR_PAINTS;

export interface MyPlane {
  model: PlaneId;
  paint: PaintId;
}
export const DEFAULT_PLANE: MyPlane = { model: 'prop', paint: 'magenta' };

/** A saved aircraft, made safe: unknown models or paints fall back to the default */
export function cleanPlane(v: unknown): MyPlane {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const model = PLAYER_AIRCRAFT.find((m) => m === o.model) ?? DEFAULT_PLANE.model;
  const paint = PLANE_PAINTS.find((p) => p.id === o.paint)?.id ?? DEFAULT_PLANE.paint;
  return { model, paint };
}
