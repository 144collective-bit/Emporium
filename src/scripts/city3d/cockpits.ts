/*
 * The cockpits of your own aircraft (docs/firstperson-plan.md, Phase 6): DOM-free, tested in tests/cockpits.test.ts,
 * read by cockpit3d.ts (the drawing, a chunk of its own) and fly.ts (the view).
 *
 * Model space as aircraft.ts's: +x the nose, y up, +z the right wing, the origin on the ground under the middle.
 * Angles round a body (`a`) are in turns, 0 on the right side, 0.25 on top, as aircraft.ts's `loft()`.
 *
 * - `COCKPITS`: each aircraft's cabin (its body's stations and the stretch that's lined inside, `liner`), the
 *   windows cut in the lining (`holes`: the windscreen, the side windows, the helicopter's canopy and chin bubbles),
 *   the floor and the raised foot well, the seat (where his hips go), the panel (its place, its glare shield, the
 *   gauges or screens on its face), the controls (the Sky Hopper's yoke, the Neon Dart's stick, the Whirlybird's
 *   cyclic; a throttle quadrant or the collective), the pedals and the view from his eyes.
 * - `controlsOf()`: where each control stands for the sim's input (eased in fly.ts), `handsOf()` / `feetOf()` where
 *   his hands and feet go on them, `pilotPose()` the seated pilot with his hands on them (`reachArm()`) and his feet
 *   on the pedals (`reachLeg()`).
 */
import * as THREE from 'three';
import { ANKLE_H, HIP_HEIGHT, LEG_X, reachArm, reachLeg, torsoFrame, type Pose } from './skeleton';
import { BIZ_BODY, HELI_BODY, PROP_BODY, type Station } from './airframe';
import type { PlaneId } from './myplane';

/** The pilot's size (walk mode's Degen) */
export const PILOT_SCALE = 0.85;

type V3 = [number, number, number];
/** A window cut in the lining: from x0 to x1 along the body, from a0 to a1 round it (turns) */
export interface Hole {
  x0: number;
  x1: number;
  a0: number;
  a1: number;
}
/** A round gauge (or a screen, `w` by `h`) on the panel's face: across it (z), up it (y) */
export interface Gauge {
  kind: 'speed' | 'attitude' | 'altitude' | 'turn' | 'heading' | 'climb' | 'revs' | 'pfd' | 'mfd';
  z: number;
  y: number;
  r: number;
  w?: number;
  h?: number;
}
export type StickKind = 'yoke' | 'stick' | 'cyclic';
export type LeverKind = 'quadrant' | 'collective';
export interface Cockpit {
  body: Station[];
  /** The lined stretch of the body (x), and the lining's colour */
  liner: [number, number];
  holes: Hole[];
  /** The cabin's floor, and the raised well the pedals stand on (its top, and from where along) */
  floor: number;
  well: { y: number; x0: number; x1: number };
  /** Where his hips go */
  seat: V3;
  /** The panel: its aft face's x, its foot and its top (the glare shield's), how far the shield reaches aft, and (a
   * pedestal's) its half-width */
  panel: { x: number; y0: number; y1: number; shield: number; half?: number };
  gauges: Gauge[];
  /** The stick, yoke or cyclic: its pivot (the yoke's: its hub's place at rest), its length up to the grip */
  stick: { kind: StickKind; at: V3; len: number; travel: number };
  /** The throttle quadrant (its levers' pivot, their length, their throw) or the collective (pivot, arm, lift) */
  lever: { kind: LeverKind; at: V3; len: number; travel: number; twin?: boolean };
  /** The pedals: their faces at rest (the right foot's; the left's mirrored), how far they move */
  pedals: { at: V3; travel: number };
  /** From his eyes: how far they look down from level, the field of view (vertical degrees) */
  view: { down: number; fov: number };
}

export const COCKPITS: Record<PlaneId, Cockpit> = {
  // The Sky Hopper: a high-wing cabin, the yoke in his left hand and the throttle quadrant by his right, the classic
  // six round gauges and a rev counter, side windows under the wing
  prop: {
    body: PROP_BODY,
    liner: [-0.62, 1.55],
    holes: [
      { x0: 1.0, x1: 1.55, a0: 0.05, a1: 0.45 },
      { x0: -0.32, x1: 0.92, a0: -0.07, a1: 0.135 },
      { x0: -0.32, x1: 0.92, a0: 0.365, a1: 0.57 },
    ],
    floor: 0.56,
    well: { y: 0.86, x0: 0.42, x1: 1.0 },
    seat: [0.25, 1.17, 0],
    panel: { x: 1.0, y0: 0.88, y1: 1.49, shield: 0.12 },
    gauges: [
      { kind: 'speed', z: -0.25, y: 1.36, r: 0.058 },
      { kind: 'attitude', z: -0.1, y: 1.36, r: 0.058 },
      { kind: 'altitude', z: 0.05, y: 1.36, r: 0.058 },
      { kind: 'turn', z: -0.25, y: 1.215, r: 0.058 },
      { kind: 'heading', z: -0.1, y: 1.215, r: 0.058 },
      { kind: 'climb', z: 0.05, y: 1.215, r: 0.058 },
      { kind: 'revs', z: 0.22, y: 1.29, r: 0.055 },
    ],
    stick: { kind: 'yoke', at: [0.63, 1.4, -0.12], len: 0.13, travel: 0.05 },
    lever: { kind: 'quadrant', at: [0.5, 1.12, 0.23], len: 0.16, travel: 0.45 },
    pedals: { at: [0.5, 0.92, 0.1], travel: 0.04 },
    view: { down: 0.2, fov: 74 },
  },
  // The Neon Dart: a jet's cockpit, two screens (the attitude with its speed and height tapes, the map), the stick
  // on its console by his right hand, twin throttles by his left, the gear and flaps' levers
  bizjet: {
    body: BIZ_BODY,
    liner: [2.3, 3.95],
    holes: [
      { x0: 3.3, x1: 3.95, a0: 0.04, a1: 0.46 },
      { x0: 2.52, x1: 3.22, a0: -0.02, a1: 0.13 },
      { x0: 2.52, x1: 3.22, a0: 0.37, a1: 0.52 },
    ],
    floor: 0.76,
    well: { y: 1.0, x0: 2.9, x1: 3.3 },
    seat: [2.75, 1.32, 0],
    panel: { x: 3.3, y0: 1.06, y1: 1.5, shield: 0.12 },
    gauges: [
      { kind: 'pfd', z: -0.16, y: 1.37, r: 0.1, w: 0.27, h: 0.2 },
      { kind: 'mfd', z: 0.16, y: 1.37, r: 0.1, w: 0.27, h: 0.2 },
    ],
    stick: { kind: 'stick', at: [2.93, 1.22, 0.3], len: 0.15, travel: 0.25 },
    lever: { kind: 'quadrant', at: [2.76, 1.24, -0.31], len: 0.14, travel: 0.42, twin: true },
    pedals: { at: [3.06, 1.08, 0.1], travel: 0.04 },
    view: { down: 0.24, fov: 72 },
  },
  // The Whirlybird: a bubble canopy, chin windows at his feet, the cyclic between his knees in his right hand, the
  // collective by his left, a small panel on its pedestal
  heli: {
    body: HELI_BODY,
    liner: [-0.75, 1.82],
    holes: [
      { x0: 0.7, x1: 1.82, a0: -0.12, a1: 0.62 },
      { x0: 1.0, x1: 1.66, a0: 0.665, a1: 0.735 },
      { x0: 1.0, x1: 1.66, a0: 0.765, a1: 0.835 },
      { x0: -0.22, x1: 0.62, a0: -0.08, a1: 0.18 },
      { x0: -0.22, x1: 0.62, a0: 0.32, a1: 0.58 },
    ],
    floor: 0.42,
    well: { y: 0.6, x0: 0.42, x1: 0.8 },
    seat: [0.25, 0.95, 0],
    panel: { x: 1.02, y0: 0.42, y1: 1.12, shield: 0.1, half: 0.25 },
    gauges: [
      { kind: 'speed', z: -0.13, y: 1.0, r: 0.05 },
      { kind: 'attitude', z: 0, y: 1.0, r: 0.05 },
      { kind: 'altitude', z: 0.13, y: 1.0, r: 0.05 },
      { kind: 'revs', z: -0.07, y: 0.87, r: 0.045 },
      { kind: 'climb', z: 0.07, y: 0.87, r: 0.045 },
    ],
    stick: { kind: 'cyclic', at: [0.56, 0.7, 0], len: 0.38, travel: 0.1 },
    lever: { kind: 'collective', at: [0.04, 0.93, -0.29], len: 0.38, travel: 0.3 },
    pedals: { at: [0.55, 0.66, 0.1], travel: 0.04 },
    view: { down: 0.22, fov: 74 },
  },
};

/** The body's round section at x: radius, centre height, height scale */
export function sectionAt(st: Station[], x: number): [number, number, number] {
  let i = 0;
  while (i < st.length - 2 && st[i + 1][0] > x) i++;
  const [a, b] = [st[i], st[i + 1]];
  const f = THREE.MathUtils.clamp((x - a[0]) / (b[0] - a[0] || 1), 0, 1);
  return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, (a[3] ?? 1) + ((b[3] ?? 1) - (a[3] ?? 1)) * f];
}
/** The body's top at x */
export function topAt(st: Station[], x: number) {
  const [r, cy, sy] = sectionAt(st, x);
  return cy + r * sy;
}
/** Is (x, a) in one of the holes (a in turns, any turn) */
export function inHole(holes: Hole[], x: number, a: number) {
  return holes.some((h) => x >= h.x0 && x <= h.x1 && ((((a - h.a0) % 1) + 1) % 1) <= h.a1 - h.a0);
}

/** What the controls are doing (fly.ts eases them from the sim's input): -1..1, power 0..1, the gear 0 up .. 1 down */
export interface Controls {
  turn: number;
  climb: number;
  /** Forward / back: a plane's lever moves with `power`; the helicopter's cyclic tilts with it */
  fore: number;
  power: number;
  gear: number;
}
export const atRest = (): Controls => ({ turn: 0, climb: 0, fore: 0, power: 0, gear: 1 });

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);
/**
 * Where each control is: the stick's grip (the yoke's left horn), the lever's knob (or the collective's grip), the
 * yoke's hub and how far it's turned, the lever's angle
 */
export function controlsOf(id: PlaneId, c: Controls) {
  const k = COCKPITS[id];
  const s = k.stick;
  const grip = new THREE.Vector3();
  let hub: THREE.Vector3 | null = null;
  let roll = 0;
  if (s.kind === 'yoke') {
    // (pulled back to climb; turned about the column for the turn, the left horn round with it)
    hub = new THREE.Vector3(s.at[0] - c.climb * s.travel, s.at[1], 0);
    roll = c.turn * 0.6;
    grip.set(0, 0.02, s.at[2]).applyAxisAngle(X, roll).add(hub);
  } else {
    // A stick back for climb (the cyclic forward for forward), over for the turn
    const pitch = s.kind === 'cyclic' ? -c.fore * s.travel : c.climb * s.travel;
    const tilt = c.turn * s.travel;
    grip.set(0, s.len, 0).applyAxisAngle(Z, pitch).applyAxisAngle(X, tilt).add(new THREE.Vector3(...s.at));
  }
  const l = k.lever;
  let angle: number;
  const knob = new THREE.Vector3();
  if (l.kind === 'quadrant') {
    // Forward for power (about z: forward is a turn towards +x)
    angle = -l.travel + c.power * 2 * l.travel;
    knob.set(l.at[0] + Math.sin(angle) * l.len, l.at[1] + Math.cos(angle) * l.len, l.at[2]);
  } else {
    // The collective raised to climb: an arm forward from its pivot by his seat, lifted about z
    angle = 0.06 + ((c.climb + 1) / 2) * l.travel;
    knob.set(l.at[0] + Math.cos(angle) * l.len, l.at[1] + Math.sin(angle) * l.len, l.at[2]);
  }
  return { grip, hub, roll, knob, angle };
}

/** Where his hands go: his right (on the stick or cyclic, or the Sky Hopper's throttle) and his left */
export function handsOf(id: PlaneId, c: Controls): [THREE.Vector3, THREE.Vector3] {
  const k = COCKPITS[id];
  const { grip, knob } = controlsOf(id, c);
  // (a palm over a knob: a touch behind and over it; on a grip, round it)
  const onKnob = knob.clone().add(new THREE.Vector3(-0.02, 0.03, 0));
  if (k.stick.kind === 'yoke') return [onKnob, grip.clone().add(new THREE.Vector3(-0.015, 0.01, 0))];
  return [grip.clone().add(new THREE.Vector3(-0.015, -0.02, 0)), k.lever.kind === 'collective' ? knob.clone().add(new THREE.Vector3(0, 0.02, 0)) : onKnob];
}
/** Where his feet go (the ankles, the pedals' faces just ahead of them): right then left, the right pedal forward for a right turn */
export function feetOf(id: PlaneId, c: Controls): [THREE.Vector3, THREE.Vector3] {
  const p = COCKPITS[id].pedals;
  const k = PILOT_SCALE;
  const at = (side: 1 | -1) => new THREE.Vector3(p.at[0] + side * c.turn * p.travel, p.at[1] + ANKLE_H * k, side * p.at[2]);
  return [at(1), at(-1)];
}
/** Where the pilot's root goes (facing the nose, his hips on the seat) */
export function pilotRoot(id: PlaneId) {
  const [x, y, z] = COCKPITS[id].seat;
  return new THREE.Vector3(x, y - HIP_HEIGHT * PILOT_SCALE + 0.02, z);
}

const C = new THREE.Matrix4();
const M = new THREE.Matrix4();
const Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
const S = new THREE.Vector3();
const P = new THREE.Vector3();
const E = new THREE.Euler();
/** The pilot: seated, leant a touch forward, his feet on the pedals and his hands on the controls; his head turned `look` */
export function pilotPose(p: Pose, id: PlaneId, c: Controls, look = 0) {
  const k = PILOT_SCALE;
  const [sx, sy] = COCKPITS[id].seat;
  p.bob = 0;
  p.sway = p.turn = 0;
  p.lean = 0.12;
  p.twist = 0;
  p.side = 0;
  p.headYaw = look;
  p.headPitch = 0.02;
  // His feet on the pedals (the hips' space, his size: x across with his right at -x, y up, z ahead)
  const feet = feetOf(id, c);
  for (const [i, l] of p.legs.entries()) {
    const side = i === 0 ? -1 : 1;
    const f = feet[i === 0 ? 0 : 1];
    P.set((side * Math.abs(f.z)) / k, (f.y - sy - 0.02) / k, (f.x - sx) / k).applyEuler(E.set(0, 0, -p.side));
    P.x -= side * LEG_X;
    reachLeg(l, side, P, p.side);
    l.foot = undefined;
  }
  // His hands: arm 0 (the rig's -x) is his right, on the aircraft's +z side
  C.compose(pilotRoot(id), Q, S.setScalar(k)).multiply(torsoFrame(p, M)).invert();
  const hands = handsOf(id, c);
  for (const i of [0, 1] as const) reachArm(p, i, hands[i].clone().applyMatrix4(C));
}
