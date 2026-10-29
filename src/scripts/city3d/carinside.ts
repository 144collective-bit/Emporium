/*
 * What's inside each car (vehicle plan Phase 0; DOM-free, tested in
 * tests/carspec.test.ts): the driver's seat, the steering wheel, the dash,
 * the floor and the pedals, the rear seats and the driver's door
 * (`INTERIORS`), worked out from each model's body (carspec.ts) for Degen
 * seated at walk mode's size (`SITTER`). Kept out of the boot: the drawing
 * of an interior loads it when it's first wanted.
 *
 * Car space, as carspec.ts: +x the front, y up, +z the car's right. The
 * driver sits on the left (-z), the side Degen gets in and out (drive.ts).
 */
import { ARM_REACH, HIP_Y, SHIN_GROUND, SHOULDER_X, SHOULDER_Y, THIGH } from './skeleton';
import { CARS, type CarId, type CarSpec } from './carspec';

type V2 = [number, number];
/** Degen's crown over the ground at scale 1 (skeleton.ts) */
const CROWN = 1.28;

/** The driver's size: Degen at walk mode's scale (walk.ts `SCALE`, karts.ts `DRIVER_SCALE`) */
export const DRIVER_SCALE = 0.85;
/**
 * Degen seated, in tiles at `DRIVER_SCALE`, measured up his back from the hip point: his crown (skeleton.ts: about
 * 1.28 to the crown), his eyes, his shoulders (and their spread), his arm's reach from the shoulder, and his thigh
 * and shin
 */
export const SITTER = {
  crown: (CROWN - HIP_Y) * DRIVER_SCALE,
  eye: (CROWN - 0.11 - HIP_Y) * DRIVER_SCALE,
  shoulder: SHOULDER_Y * DRIVER_SCALE,
  shoulderX: SHOULDER_X * DRIVER_SCALE,
  reach: ARM_REACH * DRIVER_SCALE,
  thigh: THIGH * DRIVER_SCALE,
  shin: -SHIN_GROUND * DRIVER_SCALE,
};

export type V3 = [number, number, number];

export interface Interior {
  /** The driver's hip point (on the cushion, car space) and how far his back leans back (radians from upright) */
  hip: V3;
  recline: number;
  /** His eyes (the driver's eye camera's spot) and his shoulders (left, right) */
  eye: V3;
  shoulders: [V3, V3];
  /** The steering wheel: its centre, its radius and its tilt back from upright */
  wheel: V3;
  wheelR: number;
  wheelTilt: number;
  /** The dash: its top's front edge (x, y), the wheel's side of it about a hand nearer */
  dash: [number, number];
  /** The floor his feet rest on, and how far forward they reach (the pedals) */
  floor: number;
  pedals: number;
  /** The rear seats' hip point x and their recline, if it has any (two-seaters and the cabs have none) */
  rear?: { x: number; recline: number };
  /**
   * The driver's door (the bus has none you use): its hinge at the front seam, its back edge at the seam behind,
   * its bottom and top (the window line's frame up to the roof), how far it swings open (radians) and its handle
   * (x along the car, y over the ground: where cars.ts lays it on the side). The passenger's door is its mirror.
   */
  door?: { hinge: number; back: number; y0: number; y1: number; open: number; handle: [number, number] };
}

/** Each model's seat: the hip point's x and height, the recline, the rear seats, a raised cab floor (the bus's) (the rest is worked out from the body) */
const SEATS: Record<CarId, { x: number; y: number; recline: number; rear?: { x: number; recline: number }; floor?: number; door?: false }> = {
  hatch: { x: -0.06, y: 0.27, recline: 0.3, rear: { x: -0.68, recline: 0.24 } },
  sedan: { x: 0.04, y: 0.26, recline: 0.32, rear: { x: -0.42, recline: 0.15 } },
  coupe: { x: -0.22, y: 0.2, recline: 0.45 },
  pickup: { x: 0.08, y: 0.42, recline: 0.26 },
  van: { x: 0.44, y: 0.4, recline: 0.2 },
  bus: { x: 2.25, y: 0.62, recline: 0.12, floor: 0.36, door: false },
  muscle: { x: -0.2, y: 0.24, recline: 0.38 },
  suv: { x: 0.3, y: 0.46, recline: 0.26, rear: { x: -0.36, recline: 0.2 } },
  super: { x: -0.14, y: 0.21, recline: 0.48 },
  exec: { x: 0.26, y: 0.27, recline: 0.3, rear: { x: -0.5, recline: 0.2 } },
  classic: { x: 0.08, y: 0.28, recline: 0.28, rear: { x: -0.46, recline: 0.18 } },
  offroad: { x: 0.27, y: 0.52, recline: 0.22, rear: { x: -0.4, recline: 0.18 } },
  ev: { x: -0.04, y: 0.27, recline: 0.3, rear: { x: -0.66, recline: 0.24 } },
  police: { x: 0.04, y: 0.26, recline: 0.32, rear: { x: -0.42, recline: 0.15 } },
  truck: { x: 1.16, y: 0.94, recline: 0.14, floor: 0.66 },
  rig: { x: 0.0, y: 1.06, recline: 0.14, floor: 0.78 },
};

/** The roof's height over x: the cabin's top edge (rear glass, roof, windscreen) */
export function roofAt(s: CarSpec, x: number) {
  const [b0, r0, r1, b1] = s.cabin;
  const lerp = (a: V2, b: V2) => a[1] + ((x - a[0]) / (b[0] - a[0] || 1)) * (b[1] - a[1]);
  if (x <= r0[0]) return lerp(b0, r0);
  if (x >= r1[0]) return lerp(r1, b1);
  return lerp(r0, r1);
}
/** The lower body's top line over x (cars.ts `topAt()`, which the boot's drawing has: kept here DOM-free) */
export function topLine(s: CarSpec, x: number) {
  const t = s.top;
  if (x >= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    const [x0, y0] = t[i - 1];
    const [x1, y1] = t[i];
    if (x <= x0 && x >= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
  }
  return t[t.length - 1][1];
}
/** The window line over x: where the cabin meets the body (or the sill) */
export function beltAt(s: CarSpec, x: number) {
  const [b0, , , b1] = s.cabin;
  return Math.max(s.sill ?? 0, b0[1] + ((x - b0[0]) / (b1[0] - b0[0])) * (b1[1] - b0[1]));
}

/** A point `up` along his back (leant back by the recline) and `fwd` ahead of it, from the hip point */
const alongBack = (hip: V3, recline: number, up: number, fwd = 0, z = 0): V3 => [
  hip[0] - Math.sin(recline) * up + Math.cos(recline) * fwd,
  hip[1] + Math.cos(recline) * up + Math.sin(recline) * fwd,
  hip[2] + z,
];

function interior(s: CarSpec): Interior {
  const seat = SEATS[s.id];
  // The driver on the left, a little in from the middle of his half of the cabin
  const half = (s.W * s.cabinW) / 2;
  const hip: V3 = [seat.x, seat.y, -half * 0.5];
  const shoulders: [V3, V3] = [alongBack(hip, seat.recline, SITTER.shoulder, 0, -SITTER.shoulderX), alongBack(hip, seat.recline, SITTER.shoulder, 0, SITTER.shoulderX)];
  // The wheel four-fifths of his reach out from the shoulders, a little under them, tilted back towards him
  const sh = alongBack(hip, seat.recline, SITTER.shoulder);
  const wheelTilt = 0.35 + seat.recline * 0.5;
  const out = SITTER.reach * 0.8;
  const wheel: V3 = [sh[0] + out * 0.92, sh[1] - out * 0.39, hip[2]];
  const wheelR = 0.095;
  const seams = s.seams ?? [];
  const [back, hinge] = seams.slice(-2);
  // (the handle cars.ts lays on the door, else one a little in from its back edge)
  const hx = s.handles?.find((x) => x > back && x < hinge) ?? back + 0.12;
  return {
    hip,
    recline: seat.recline,
    eye: alongBack(hip, seat.recline, SITTER.eye, 0.04),
    shoulders,
    wheel,
    wheelR,
    wheelTilt,
    dash: [wheel[0] + 0.14, wheel[1] + 0.07],
    floor: seat.floor ?? s.clr + 0.04,
    pedals: hip[0] + SITTER.thigh + 0.16,
    rear: seat.rear,
    door:
      seat.door === false || seams.length < 2
        ? undefined
        : { hinge, back, y0: s.clr + 0.04, y1: roofAt(s, back) - 0.03, open: 1.15, handle: [hx, topLine(s, hx) - 0.08] },
  };
}

/** What's inside each model */
export const INTERIORS = Object.fromEntries(Object.values(CARS).map((s) => [s.id, interior(s)])) as Record<CarId, Interior>;

/**
 * Where your own car is hollow (carcabin.ts cuts it open there): from the back of the cabin where there's a rear
 * window, else from just behind the seats (a van's load space, a pickup's bed stay solid), to the windscreen's foot
 */
export function hollowFrom(s: CarSpec, n: Interior) {
  return s.rearGlass ? s.cabin[0][0] : Math.max(s.cabin[0][0], n.hip[0] - 0.42);
}
export const hollowTo = (s: CarSpec) => s.cabin[3][0];
