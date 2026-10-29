/*
 * The go-karts' measurements and their driver's pose (vehicle plan Phase 9):
 * DOM-free, tested in tests/kartframe.test.ts, read by karts.ts (the kart
 * race's chunk, so none of it is in the boot).
 *
 * Kart space as the cars': +x the front, y up, +z the kart's right; the
 * origin on the ground under its middle (kartpark.ts `KART_L` long).
 *
 * - `KART_SHAPES`: each model's wheels, frame, seat, pods, engine and nose.
 * - `seatOf()`, `wheelOf()`, `pedalsOf()`: where the driver's hips go, the
 *   steering wheel's middle (tilted back towards him, `WHEEL_TILT`) and the
 *   pedals his feet rest on.
 * - `kartPose()`: the driver seated low, knees up, feet on the pedals
 *   (`reachLeg()`), leant a touch forward with his elbows bent and both
 *   hands on the wheel's grips (`reachArm()`), turned with it; tipping
 *   into a drift, his head turned where he looks.
 */
import * as THREE from 'three';
import { ANKLE_H, HIP_HEIGHT, LEG_X, reachArm, reachLeg, torsoFrame, type Pose } from './skeleton';
import type { KartId } from './mykart';

/** The driver's size in the kart (walk mode's Degen) */
export const DRIVER_SCALE = 0.85;

type V2 = [number, number];
export interface KartShape {
  /** Wheel radius and tyre width; rear and front axle (x); the wheels' half track (z) */
  r: number;
  tw: number;
  axles: V2;
  track: number;
  /** The floor pan's underside, and the seat cushion's top */
  floor: number;
  seat: number;
  /** The side pods: x range, height and how far out they reach (z) */
  pod: { x0: number; x1: number; h: number; z: number };
  /** The engine block (w, h, d) and whether it carries a big air filter */
  engine: [number, number, number];
  filter?: boolean;
  /** What's behind the seat */
  rear: 'wing' | 'hoop' | 'fin';
  armour?: boolean;
  bullbar?: boolean;
  /** How long the nose is */
  nose: number;
}
export const KART_SHAPES: Record<KartId, KartShape> = {
  rocket: { r: 0.14, tw: 0.15, axles: [-0.4, 0.42], track: 0.4, floor: 0.07, seat: 0.24, pod: { x0: -0.28, x1: 0.22, h: 0.15, z: 0.36 }, engine: [0.22, 0.2, 0.26], rear: 'wing', nose: 0.3 },
  bigwheel: { r: 0.19, tw: 0.21, axles: [-0.38, 0.4], track: 0.37, floor: 0.11, seat: 0.3, pod: { x0: -0.26, x1: 0.2, h: 0.16, z: 0.3 }, engine: [0.28, 0.26, 0.3], filter: true, rear: 'hoop', nose: 0.26 },
  zip: { r: 0.11, tw: 0.12, axles: [-0.38, 0.4], track: 0.4, floor: 0.05, seat: 0.19, pod: { x0: -0.26, x1: 0.24, h: 0.1, z: 0.34 }, engine: [0.18, 0.16, 0.22], rear: 'fin', nose: 0.34 },
  tank: { r: 0.15, tw: 0.17, axles: [-0.4, 0.4], track: 0.39, floor: 0.08, seat: 0.25, pod: { x0: -0.3, x1: 0.22, h: 0.18, z: 0.34 }, engine: [0.24, 0.22, 0.28], rear: 'hoop', armour: true, bullbar: true, nose: 0.28 },
};

/** The seat's x (every model's), and how far the wheel's grips are from its middle */
export const SEAT_X = -0.1;
export const WHEEL_R = 0.095;
/** The steering wheel's tilt back from upright (radians) */
export const WHEEL_TILT = 0.55;

/** Where the driver's hips go (the seat's top) */
export const seatOf = (id: KartId): [number, number, number] => [SEAT_X, KART_SHAPES[id].seat, 0];
/** The steering wheel's middle: close in, so his elbows bend */
export const wheelOf = (id: KartId): [number, number, number] => [SEAT_X + 0.34, KART_SHAPES[id].seat + 0.22, 0];
/** The pedals (the brake on his left, the throttle on his right), under the nose: their faces, where his feet rest */
export function pedalsOf(id: KartId): [number, number, number][] {
  const s = KART_SHAPES[id];
  const x = s.axles[1] - 0.08;
  const y = s.floor + 0.06;
  return [
    [x, y, -0.08],
    [x, y, 0.08],
  ];
}
/** A grip on the wheel: 3 o'clock (`side` +1, the kart's right) or 9, turned with the wheel `turn` radians */
export function gripOf(id: KartId, side: 1 | -1, turn: number, out = new THREE.Vector3()) {
  const axis = new THREE.Vector3(Math.cos(WHEEL_TILT), -Math.sin(WHEEL_TILT), 0).normalize();
  const [wx, wy, wz] = wheelOf(id);
  return out.set(0, 0, side * WHEEL_R).applyAxisAngle(axis, turn).add(new THREE.Vector3(wx, wy, wz));
}

const M = new THREE.Matrix4();
const C = new THREE.Matrix4();
const Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
const P = new THREE.Vector3();
const S = new THREE.Vector3();
const G = new THREE.Vector3();
const E = new THREE.Euler();
/** Where the driver's root goes in the kart (his hips on the seat, facing +x) */
export function driverRoot(id: KartId): [number, number, number] {
  const [x, y, z] = seatOf(id);
  return [x, y - HIP_HEIGHT * DRIVER_SCALE + 0.01, z];
}

/**
 * The driver: seated low with his knees up and his feet on the pedals, leant a touch forward, both hands on the
 * wheel's grips turned with it (`turn`, radians), tipped into a drift (`lean` -1 left .. 1 right) and his head
 * turned `look` (radians, left positive). Worked out for the figure at `driverRoot()`, at `DRIVER_SCALE`
 */
export function kartPose(p: Pose, id: KartId, lean = 0, look = 0, turn = 0) {
  const [sx, sy] = seatOf(id);
  const k = DRIVER_SCALE;
  p.bob = 0;
  p.sway = p.turn = 0;
  p.lean = 0.2 + Math.abs(lean) * 0.04;
  p.twist = 0;
  // Tipping into the drift: the hips roll (a positive side tilts him to his right)
  p.side = lean * 0.22;
  p.headYaw = look;
  // (his head up off the lean, eyes down the track)
  p.headPitch = -0.08;
  // His feet on the pedals (the hips' space, his size: x across with his right at -x, y up, z ahead)
  const pedals = pedalsOf(id);
  for (const [i, l] of p.legs.entries()) {
    const side = i === 0 ? -1 : 1;
    const [px, py, pz] = pedals[i === 0 ? 1 : 0];
    // (from the hips, the way they're rolled, then from the leg's own hip joint: emotes.ts `hipSpace()`)
    P.set((side * Math.abs(pz)) / k, (py + ANKLE_H * k - sy - 0.01) / k, (px - 0.04 - sx) / k).applyEuler(E.set(0, 0, -p.side));
    P.x -= side * LEG_X;
    reachLeg(l, side, P, p.side);
    // (the foot level on the pedal: left to ease level by itself)
    l.foot = undefined;
  }
  // His hands on the grips: arm 0 (the rig's -x) on the kart's +z side
  const [rx, ry, rz] = driverRoot(id);
  C.compose(P.set(rx, ry, rz), Q, S.setScalar(k)).multiply(torsoFrame(p, M)).invert();
  for (const i of [0, 1] as const) reachArm(p, i, gripOf(id, i === 0 ? 1 : -1, turn, G).applyMatrix4(C));
}
