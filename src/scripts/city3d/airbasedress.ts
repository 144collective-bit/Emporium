/*
 * Northgate Air Base's drawing-only data (docs/military-plan.md; DOM-free, on `DOM_FREE`): what only its chunks
 * (airbase3d.ts, airbasefield3d.ts) and the tests read, kept out of the boot (airbase.ts is the boot's: its lines, solids,
 * lamps and keep): what's parked on the airfield, the apron's kit, the aircraft's grey, the searchlights' sweep and the
 * range's lanes.
 */
import { FENCE_RUNS, GATES, HANGARS, OPEN_HANGAR, PIER, WALL_PANEL, inAirbase, piersOf, toRun } from './airbase';
import type { Pt } from './streetplan';

/** How many lanes the range has (scenery) */
export const RANGE_LANES = 6;

/**
 * What's parked on the airfield (Phase 2): made-up, unarmed aircraft in the base's greys (the airport's models, its
 * titles left off), each [x, z, yaw] (yaw π/2: the nose north, to the taxiway); a transport in the open hangar
 */
export const PARKED: { kind: 'freighter' | 'prop' | 'heli'; livery: string; at: [number, number, number] }[] = [
  { kind: 'freighter', livery: '#6f7a8c', at: [(HANGARS[OPEN_HANGAR][0] + HANGARS[OPEN_HANGAR][2]) / 2, -444, Math.PI / 2] },
  { kind: 'freighter', livery: '#5d6b52', at: [-290, -488, Math.PI / 2] },
  { kind: 'freighter', livery: '#6f7a8c', at: [-250, -488, Math.PI / 2] },
  ...[-462, -448, -434, -420].map((x) => ({ kind: 'prop' as const, livery: '#8a93a3', at: [x, -496, Math.PI / 2] as [number, number, number] })),
  { kind: 'heli', livery: '#5d6b52', at: [-340, -496, Math.PI / 2] },
  { kind: 'heli', livery: '#6f7a8c', at: [-318, -496, Math.PI / 2] },
];
/** The apron's vehicles: a tug and a fuel bowser (x, z, yaw), and the windsock between the runway and the taxiway */
export const APRON_VEHICLES: { kind: 'tug' | 'bowser'; at: [number, number, number] }[] = [
  { kind: 'tug', at: [-274, -480, 0] },
  { kind: 'bowser', at: [-392, -482, Math.PI / 2] },
];
export const WINDSOCK: Pt = [-420, -526];

/** The base's aircraft's grey (the owner's call: all grey): a colour as light as it was, in the base's cool grey */
export const BASE_GREY = [0.62, 0.66, 0.7] as const;
export function baseGrey(r: number, g: number, b: number): [number, number, number] {
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // (the lights' and the glass's darks stay dark; the body's white comes down to the grey)
  const v = 0.12 + l * 0.88;
  return [v * BASE_GREY[0], v * BASE_GREY[1], v * BASE_GREY[2]];
}

/** A watchtower's searchlight: its sweep about the way into the base (radians either side) and its beam's length */
export const SWEEP = 0.8;
export const BEAM_L = 26;
/** Where a watchtower's searchlight looks at rest: straight in from the run of fence it stands by (its yaw about y,
 * from +x, as `Math.atan2(-dz, dx)`), so its sweep stays over the base whatever the world's size */
export function searchRest([x, z]: Pt): number {
  let best: [Pt, Pt] = FENCE_RUNS[0];
  for (const r of FENCE_RUNS) if (toRun(x, z, r) < toRun(x, z, best)) best = r;
  const [a, b] = best;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  let [nx, nz] = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
  if (!inAirbase(x + nx * 8, z + nz * 8)) [nx, nz] = [-nx, -nz];
  return Math.atan2(-nz, nx);
}

/** The wall's lights (Phase 6, the owner's call: on its top, facing out, lighting its outer face and the grass at
 * night): every `WALL_LIGHT_GAP` along each run, each at a point on the line and facing out (nx, nz: away from the base) */
export const WALL_LIGHT_GAP = 15;
export const WALL_LIGHTS: { x: number; z: number; nx: number; nz: number }[] = FENCE_RUNS.flatMap(([a, c]) => {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const n = Math.floor(len / WALL_LIGHT_GAP);
  if (n < 1) return [];
  const [ux, uz] = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
  // (out: the side of the line the base isn't on)
  const mid: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
  const s = inAirbase(mid[0] - uz, mid[1] + ux) ? 1 : -1;
  const [nx, nz] = [uz * s, -ux * s];
  // (spread evenly along the run, half a gap in from each end, each moved to the middle of its panel: clear of the
  // panels' joints, which stand every `WALL_PANEL` as the drawing spreads them)
  const panels = Math.max(1, Math.round(len / WALL_PANEL));
  return Array.from({ length: n }, (_, k) => {
    const t = (Math.min(panels - 1, Math.floor(((k + 0.5) / n) * panels)) + 0.5) / panels;
    return { x: a[0] + (c[0] - a[0]) * t, z: a[1] + (c[1] - a[1]) * t, nx, nz };
  });
});
/** A lamp on the outer face of each gate's piers (Phase 6's polish), facing out of the base as the wall's lights do */
export const PIER_LIGHTS: { x: number; z: number; nx: number; nz: number }[] = GATES.flatMap((g) => {
  const nz = inAirbase(g.x, g.z + 3) ? -1 : 1;
  return piersOf(g).map(([x, z]) => ({ x, z: z + (nz * PIER) / 2, nx: 0, nz }));
});
