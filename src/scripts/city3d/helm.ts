/*
 * The hire boat's helm (docs/firstperson-plan.md, Phase 5): DOM-free, tested in tests/helm.test.ts, read by
 * riverlife3d.ts (`hireBoat()` draws the console from these numbers) and boat.ts (the driver and the view).
 *
 * Boat space: +x the bow, y up from the waterline, +z starboard (the boat's right).
 *
 * - `HELM`: the bench his hips sit on, the wheel on the console's aft face (tilted, turning with the rudder), the
 *   throttle's lever on its side pod by his right hand (forward for ahead, back for astern), the dash's sloping panel
 *   with its two gauges (speed, revs), the compass on its top and the windscreen.
 * - `helmPose()`: seated, knees bent, leant a touch forward, his left hand on the wheel's rim (turned with it), his
 *   right on the throttle's knob (`reachArm()`), his head with the turn and where he looks.
 */
import * as THREE from 'three';
import { HIP_HEIGHT, reachArm, torsoFrame, type Pose } from './skeleton';

/** The driver's size at the helm (walk mode's Degen) */
export const DRIVER_SCALE = 0.85;

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const HELM = {
  /** Where his hips go, on the bench */
  seat: V(-0.3, 0.58, 0),
  /** The cockpit's sole (his feet on it) */
  sole: 0.3,
  /** The wheel's middle (on its pod off the console's aft face), its radius, its tilt (about z), how far it turns */
  wheel: V(0.07, 0.78, 0),
  /** (negative: the wheel's top leans forward, its face up towards him, as a car's) */
  /** The pod the wheel's column comes out of (x0, y0, z0, x1, y1, z1) */
  wheelPod: [0.13, 0.6, -0.07, 0.2, 0.76, 0.07] as const,
  wheelR: 0.095,
  tilt: -0.6,
  turn: 0.8,
  /** Where his left hand holds the rim, round from its top (radians, towards port) */
  hold: 1.15,
  /** The throttle: its lever's pivot on the side pod, its length to the knob, its throw each way (radians) */
  lever: { at: V(0.03, 0.665, 0.25), len: 0.15, most: 0.5 },
  /** The side pod the lever stands on, out from the console's starboard edge by his right hand (x0, y0, z0, x1, y1, z1) */
  leverBox: [-0.03, 0.56, 0.21, 0.2, 0.66, 0.29] as const,
  /** The dash: its panel's middle, its slope (the face leaning back towards him, about z), its size (up the slope, across) */
  dash: { at: V(0.32, 0.79, -0.03), slope: 0.75, h: 0.14, w: 0.34 },
  /** The gauges across the dash (from its middle, towards starboard), their radius: speed, then revs */
  gauges: [-0.07, 0.08],
  gaugeR: 0.04,
  /** From the helm: how far the eyes look down from level, the field of view (vertical degrees) */
  view: { down: 0.2, fov: 68 },
  /** The windscreen: its middle, height, width, rake (about z) */
  screen: { at: V(0.6, 0.83, 0), h: 0.26, w: 0.6, rake: -0.5 },
};

/** The dash's face: a point `up` the slope and `across` it (z), `off` out from its face, in boat space */
export function onDash(up: number, across: number, off: number, out = new THREE.Vector3()) {
  const { at, slope } = HELM.dash;
  // (the panel's own +y is up its slope, its -x the face towards him)
  return out.set(at.x + Math.sin(slope) * up - Math.cos(slope) * off, at.y + Math.cos(slope) * up + Math.sin(slope) * off, at.z + across);
}
/** The wheel's axis (its column's line: forward and down, into the pod) */
export const WHEEL_AXIS = new THREE.Vector3(Math.cos(HELM.tilt), Math.sin(HELM.tilt), 0);
/** A point on the wheel's rim at angle `a` (0 starboard, pi/2 the top) as it's turned `steer` (-1..1) */
export function rimAt(a: number, steer: number, out = new THREE.Vector3()) {
  const b = a - steer * HELM.turn;
  const r = HELM.wheelR;
  const { wheel, tilt } = HELM;
  return out.set(wheel.x - Math.sin(tilt) * Math.sin(b) * r, wheel.y + Math.cos(tilt) * Math.sin(b) * r, Math.cos(b) * r);
}
/** The lever's angle for the throttle (`power` -1 astern .. 1 ahead; forward is a turn about -z) */
export const leverAngle = (power: number) => 0 - THREE.MathUtils.clamp(power, -1, 1) * HELM.lever.most;
/** The knob's middle for the throttle */
export function knobAt(power: number, out = new THREE.Vector3()) {
  const a = leverAngle(power);
  const { at, len } = HELM.lever;
  return out.set(at.x - Math.sin(a) * len, at.y + Math.cos(a) * len, at.z);
}
/** Where the figure stands in the boat (its root: facing the bow, its hips on the bench) */
export const driverRoot = () => V(HELM.seat.x, HELM.seat.y - HIP_HEIGHT * DRIVER_SCALE + 0.02, 0);
/** Where his left hand's palm goes: on the rim, a touch in from its middle line */
export const wheelHand = (steer: number, out = new THREE.Vector3()) => rimAt(Math.PI / 2 + HELM.hold, steer, out);
/** Where his right hand's palm goes: over the knob, the fingers round it */
export function throttleHand(power: number, out = new THREE.Vector3()) {
  return knobAt(power, out).add(GRIP_OFF);
}
const GRIP_OFF = new THREE.Vector3(-0.02, 0.025, 0.005);

const C = new THREE.Matrix4();
const M = new THREE.Matrix4();
const Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
const S = new THREE.Vector3();
const T = new THREE.Vector3();
/**
 * The driver at the helm: on the bench, knees bent, leant a touch forward, his left hand on the wheel (turned
 * `steer`, -1..1), his right on the throttle (`power`, -1..1), his head with the turn and `look` (radians, left
 * positive). Worked out for the figure at `driverRoot()`, facing the bow, at `DRIVER_SCALE`
 */
export function helmPose(p: Pose, steer: number, power: number, look = 0) {
  p.bob = 0;
  p.sway = p.turn = 0;
  p.lean = 0.14;
  p.twist = 0;
  p.side = -steer * 0.06;
  p.headYaw = -steer * 0.25 + look;
  p.headPitch = 0.04;
  for (const l of p.legs) {
    l.fwd = 1.45;
    l.out = 0.12;
    l.bend = 1.3;
    l.twist = 0;
  }
  C.compose(driverRoot(), Q, S.setScalar(DRIVER_SCALE)).multiply(torsoFrame(p, M)).invert();
  // (arm 0, the rig's -x and his right hand, is on the boat's starboard side)
  reachArm(p, 0, throttleHand(power, T).applyMatrix4(C));
  reachArm(p, 1, wheelHand(steer, T).applyMatrix4(C));
}
