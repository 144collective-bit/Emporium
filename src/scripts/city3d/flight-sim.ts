/*
 * How your aircraft flies (Airport Phase 2): arcade handling and soft,
 * safe collisions. Kept free of the DOM and of scene code like the driving
 * rules (fly.ts is the view), so a game server could run it later.
 *
 * Units are tiles (about 1.8 m) and seconds. The aircraft faces +x at yaw
 * 0; turning left raises the yaw; a bank is positive into a right turn
 * (airfield.ts's poses). `y` is the height of its wheels (or skids).
 *
 * - Planes (the prop plane and the small jet): the throttle is a lever
 *   (Faster / Slower move it). On the ground they roll, steer by the nose
 *   wheel and lift off once they're fast enough and the stick comes back
 *   (or on their own a little faster). In the air the stick banks them
 *   into a turn and climbs or dives; let go and they level themselves.
 *   They can't stall: never slower than their slowest flying speed, and
 *   without enough power they sink gently instead of climbing, so cutting
 *   the power and gliding in is a landing. Coming down hard near the ground
 *   eases off on its own; touching down anywhere is a landing.
 * - The helicopter: up and down on the stick, Faster / Slower fly it forward
 *   and back, it turns on the spot and holds its height when you let go. It
 *   lands on the ground or any flat roof.
 * - Collisions are soft and safe: the aircraft is a few spheres; it slides
 *   off buildings, other aircraft and the hangar's roof, turns back at the
 *   edge of the world and levels off at the ceiling. No damage, no crash.
 */
import type { Box } from './solids';
import type { PlaneId } from './myplane';

/** Everything that flies, for the collision shapes: the airport's own traffic and the players' */
export type HullKind = 'jet' | 'prop' | 'heli' | 'bizjet';
/** Each aircraft as spheres: [forward, to the right wing, height over the wheels, radius] */
export const HULLS: Record<HullKind, [number, number, number, number][]> = {
  prop: [
    [1.8, 0, 1.15, 0.6],
    [0.1, 0, 1.3, 0.75],
    [-1.9, 0, 1.45, 0.55],
    [0.25, 2.4, 1.83, 0.6],
    [0.25, -2.4, 1.83, 0.6],
  ],
  bizjet: [
    [3.1, 0, 1.3, 0.65],
    [1, 0, 1.35, 0.72],
    [-1.4, 0, 1.45, 0.75],
    [-3.6, 0, 2.2, 0.75],
    [-1.4, 2.8, 1.15, 0.6],
    [-1.4, -2.8, 1.15, 0.6],
  ],
  heli: [
    [1, 0, 1.25, 0.85],
    [-0.5, 0, 1.4, 0.9],
    [-2.8, 0, 1.6, 0.45],
    [1.9, 0, 2.83, 1.1],
    [-1.9, 0, 2.83, 1.1],
    [0, 1.9, 2.83, 1.1],
    [0, -1.9, 2.83, 1.1],
  ],
  jet: [
    [7, 0, 2.75, 1.5],
    [0, 0, 2.75, 1.5],
    [-7, 0, 3.4, 1.5],
    [-2.6, 6, 2.1, 1.7],
    [-2.6, -6, 2.1, 1.7],
  ],
};

export interface FlyTune {
  kind: 'plane' | 'heli';
  hull: HullKind;
  /** Top speed (a plane's airspeed, the helicopter's forward speed), tiles/s */
  top: number;
  accel: number;
  /** Planes: lift-off speed and the slowest it flies */
  rotate: number;
  minAir: number;
  /** Turn rate at full stick (radians/s) */
  turn: number;
  /** Planes: steepest climb or dive (radians); helicopter: climb rate (tiles/s) */
  pitch: number;
  climb: number;
  /** Steepest bank */
  bank: number;
  /** Wheels to the top of the fin or rotor (for the hangar's roof) */
  tall: number;
  /** Nose to tail and wingtip to wingtip (or across the rotor) */
  L: number;
  span: number;
}

/** How each one flies (the hangar's stat bars read these too) */
export const TUNES: Record<PlaneId, FlyTune> = {
  prop: { kind: 'plane', hull: 'prop', top: 22, accel: 5, rotate: 9, minAir: 7.5, turn: 0.95, pitch: 0.4, climb: 0, bank: 0.6, tall: 2.6, L: 5.4, span: 7.2 },
  bizjet: { kind: 'plane', hull: 'bizjet', top: 34, accel: 6.5, rotate: 13, minAir: 11, turn: 0.72, pitch: 0.34, climb: 0, bank: 0.62, tall: 3.8, L: 9.4, span: 8.4 },
  heli: { kind: 'heli', hull: 'heli', top: 14, accel: 5.5, rotate: 0, minAir: 0, turn: 1.35, pitch: 0, climb: 5, bank: 0.3, tall: 2.95, L: 6.2, span: 6.2 },
};

/** The highest anyone flies: well over the airliners' route, inside the sky */
export const CEILING = 72;
/** How close to the world's edge the aircraft starts turning itself back */
export const EDGE_TURN = 18;
/** A plane left alone after lift-off climbs this high over the floor before levelling off */
export const CLIMB_OUT = 6;
/** Getting out: on the ground and (nearly) stopped */
export const EXIT_SPEED = 1.2;

export interface FlyState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  /** Speed along the nose (a plane's airspeed; negative rolling back) */
  speed: number;
  /** How it's actually moving */
  vx: number;
  vy: number;
  vz: number;
  /** Planes: the throttle lever, 0..1 */
  power: number;
  /** The engine or rotor's spin, 0..1 (for the props, the rotor and the sound) */
  spool: number;
  ground: boolean;
  gear: boolean;
  yawRate: number;
}

export interface FlyInput {
  /** Faster (up to 1) or slower (down to -1): a plane's lever, the helicopter's forward / back */
  throttle: number;
  /** Left (-1) to right (1) */
  turn: number;
  /** Climb (1) or dive / descend (-1) */
  climb: number;
}

export interface FlyWorld {
  /** Solid boxes: x0, z0, x1, z1, height (their tops are landing spots) */
  boxes: Box[];
  /** Roofs to keep under (the hangar's): x0, z0, x1, z1, the roof's underside */
  ceilings: Box[];
  /** Other aircraft (spheres) */
  soft: { x: number; y: number; z: number; r: number }[];
  /** The ground's height (the raised blocks and sidewalks) */
  ground(x: number, z: number): number;
}

/** How far round an aircraft the solid boxes need gathering for a step: its hull's reach (a wing or the tail), how far it goes and a push */
export const flyReach = (s: { speed: number }) => 14 + Math.abs(s.speed) * 0.05;

export const newFlight = (x: number, z: number, yaw: number, y = 0): FlyState => ({
  x,
  y,
  z,
  yaw,
  pitch: 0,
  roll: 0,
  speed: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  power: 0,
  spool: 0,
  ground: true,
  gear: true,
  yawRate: 0,
});

/** An aircraft's spheres where it is (turned with its heading only) */
export function hullAt(p: { x: number; y: number; z: number; yaw: number }, kind: HullKind) {
  const fx = Math.cos(p.yaw);
  const fz = -Math.sin(p.yaw);
  // The right wing is +z in the model: (sin yaw, cos yaw) in the world
  const rx = Math.sin(p.yaw);
  const rz = Math.cos(p.yaw);
  return HULLS[kind].map(([u, v, h, r]) => ({ x: p.x + fx * u + rx * v, y: p.y + h, z: p.z + fz * u + rz * v, r }));
}

/** The floor under a point: the ground, or the top of whatever it's standing on (a box's top a little under its wheels) */
export function floorAt(world: FlyWorld, x: number, z: number, y: number) {
  let f = world.ground(x, z);
  for (const b of world.boxes) if (b[4] > f && b[4] <= y + 0.6 && x > b[0] && x < b[2] && z > b[1] && z < b[3]) f = b[4];
  return f;
}

/** Can Degen climb out? On the ground and stopped */
export const canLeave = (s: FlyState) => s.ground && Math.abs(s.speed) < EXIT_SPEED && Math.abs(s.vx) + Math.abs(s.vz) < EXIT_SPEED * 1.5;

// (One step of flying, `stepFly()`, is flight-step.ts's: it's loaded when you come near an aircraft, fly.ts)
