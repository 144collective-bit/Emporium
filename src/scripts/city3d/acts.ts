/*
 * The crowd's acts that suit the city (the animation revamp's Phase 6,
 * step 3: the workers' rows), DOM-free and tested through
 * tests/crowdclips.test.ts. Each is keyed on the `Pose` rig and baked into
 * a crowd row (crowdclips.ts): the standing ones laid over a captured idle
 * (the arms and head replacing the take's, its weight shifts kept), the
 * seated ones formulas over the sit pose, each on its own loop
 * (`seconds`). Hands go to spots in the torso frame through `reachArm()`
 * (x to the rig's +x, arms[1]'s side; y up from the hips; z forward).
 *
 * - `serve`: a trader or vendor behind a counter at waist height, hands
 *   resting on it, handing something over once a loop with a nod.
 * - `cook`: at the counter, the left hand holding the pan, the right
 *   stirring and chopping, the head down at the work.
 * - `fish`: holding a rod out over the water, a cast once a loop (both
 *   hands up over the right shoulder, whipped forward, the head following).
 * - `guard`: a bouncer, arms folded across the chest, a slow look each way.
 * - `eat`: at a table, hands on it, a bite every few seconds (the right
 *   hand to the mouth, the head down to meet it), chewing after.
 * - `chess`: leaning in over the board, the chin on the left hand, the
 *   right reaching out to move a piece once a loop, a glance up after.
 * - `lounge`: a folding chair by the boombox: leant back, legs out, a hand
 *   on the knee, the head nodding to the beat.
 * - `row`: a rowing boat's stroke: leaning forward to the catch with the
 *   arms out, back to the finish with the hands at the chest.
 * - `pedal`: a swan pedalo: hands on the bar, the knees pumping in turn.
 * Nothing threatening, nothing explicit (the content rules).
 */
import * as THREE from 'three';
import { ANKLE_H, HIP_HEIGHT, LEG_X, reachArm, reachLeg, torsoFrame, type Pose } from './skeleton';
import { BIKES, steeringHead, type BikeId } from './mybike';
import { DRIVER_SCALE } from './carinside';
import { set, sitPose } from './poses';

/** Keys [second, value] eased smoothly from one to the next, held at either end */
export function keyed(k: readonly (readonly [number, number])[], w: number): number {
  if (w <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (w <= k[i][0]) {
      const u = (w - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
      const e = u * u * (3 - 2 * u);
      return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * e;
    }
  }
  return k[k.length - 1][1];
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
/** A hand to a spot `a` blended `k` of the way to `b` */
function hand(p: Pose, i: 0 | 1, a: THREE.Vector3, b: THREE.Vector3, k: number) {
  reachArm(p, i, tmp.copy(a).lerp(b, k));
}

/* ---------- Standing, over a captured idle ---------- */

/** Behind a counter at waist height: the hands on it, the right handing over once a loop (`HAND_OVER`: 0 resting, 1 out), a nod to the customer */
export const SERVE = { rest: [V(-0.14, -0.04, 0.27), V(0.14, -0.04, 0.27)], out: V(0.1, 0.12, 0.36), headPitch: -0.2, nod: -0.12, grip: 0.4 };
export const HAND_OVER: [number, number][] = [
  [0, 0],
  [1.1, 0],
  [1.6, 1],
  [2.3, 1],
  [2.9, 0],
];
export function serveOver(sec: number, p: Pose) {
  const k = keyed(HAND_OVER, sec);
  hand(p, 0, SERVE.rest[0], SERVE.rest[0], 0);
  hand(p, 1, SERVE.rest[1], SERVE.out, k);
  // Looking at the goods, up at the customer as the hand goes out, a nod as it lands
  p.headPitch = SERVE.headPitch * (1 - k) + SERVE.nod * Math.max(0, Math.sin((sec - 1.6) * 4.5)) * (k > 0.5 ? 1 : 0);
  p.headYaw = 0;
  p.lean += 0.04 * k;
}

/** At the counter: the left hand steady on the pan, the right stirring (a small circle) and chopping (quick dips), the head down at it */
export const COOK = { left: V(-0.13, -0.02, 0.3), right: V(0.1, 0.0, 0.3), stir: 0.05, chop: 0.06, headPitch: -0.38, grip: 0.55 };
export function cookOver(sec: number, p: Pose) {
  hand(p, 0, COOK.left, COOK.left, 0);
  // Stirring for the first part of the loop, chopping for the rest
  const chopping = sec % 3.73 > 2.0;
  const a = sec * Math.PI * 2 * 1.3;
  tmp.copy(COOK.right);
  if (chopping) tmp.y += COOK.chop * Math.max(0, Math.sin(sec * Math.PI * 2 * 2.2));
  else tmp.x += Math.cos(a) * COOK.stir, (tmp.z += Math.sin(a) * COOK.stir);
  reachArm(p, 1, tmp);
  p.headPitch = COOK.headPitch;
  p.headYaw = Math.sin(sec * 0.9) * 0.08;
  p.lean += 0.06;
}

/** Fishing: the rod held out over the water, the right hand at the hip and the left up the rod; a cast once a loop (`CAST`: 0 holding, 1 back over the shoulder, 2 whipped forward, 3 settled back to holding) */
export const FISH = {
  hold: [V(-0.06, 0.1, 0.34), V(0.14, -0.08, 0.18)],
  back: [V(0.04, 0.48, -0.02), V(0.2, 0.4, -0.12)],
  fore: [V(-0.02, 0.33, 0.4), V(0.16, 0.22, 0.32)],
  grip: 0.7,
};
export const CAST: [number, number][] = [
  [0, 0],
  [3.0, 0],
  [3.5, 1],
  [3.75, 1],
  [4.05, 2],
  [4.3, 2],
  [5.2, 3],
];
export function fishOver(sec: number, p: Pose) {
  const c = keyed(CAST, sec);
  for (const i of [0, 1] as const) {
    if (c <= 1) hand(p, i, FISH.hold[i], FISH.back[i], c);
    else if (c <= 2) hand(p, i, FISH.back[i], FISH.fore[i], c - 1);
    else hand(p, i, FISH.fore[i], FISH.hold[i], c - 2);
  }
  // Watching the water, up as the rod comes back, down the line as it goes out, back to level
  p.headPitch = c <= 1 ? 0.28 * c : c <= 2 ? 0.28 - 0.38 * (c - 1) : -0.1 * (3 - c);
  p.headYaw = 0;
  p.lean += c <= 1 ? -0.06 * c : c <= 2 ? -0.06 + 0.18 * (c - 1) : 0.12 * (3 - c);
}

/** A bouncer: arms folded across the chest (each hand to the other arm), a slow look each way (`GUARD_LOOK`, the head's yaw), the chin up a touch */
export const GUARD = { hands: [V(0.12, 0.18, 0.13), V(-0.11, 0.21, 0.14)], headPitch: 0.04, lean: -0.03, grip: 0.35 };
export const GUARD_LOOK: [number, number][] = [
  [0, 0],
  [0.6, 0],
  [1.3, 0.55],
  [2.2, 0.55],
  [3.1, -0.45],
  [3.9, -0.45],
  [4.6, 0],
];
export function guardOver(sec: number, p: Pose) {
  hand(p, 0, GUARD.hands[0], GUARD.hands[0], 0);
  hand(p, 1, GUARD.hands[1], GUARD.hands[1], 0);
  p.headYaw = keyed(GUARD_LOOK, sec);
  p.headPitch = GUARD.headPitch;
  p.lean += GUARD.lean;
}

/* ---------- Seated, formulas over the sit pose ---------- */

export const EAT_SECONDS = 12;
/** At a table: the hands on it (`table`), a bite every `BITE.every` seconds: the right hand to the mouth, the head down to meet it, chewing after */
export const EAT = { table: [V(-0.13, 0.2, 0.27), V(0.13, 0.2, 0.27)], mouth: V(0.03, 0.42, 0.1), lean: 0.1, headPitch: -0.22, grip: 0.55 };
export const BITE: [number, number][] = [
  [0, 0],
  [0.8, 0],
  [1.25, 1],
  [1.65, 1],
  [2.15, 0],
];
export const BITE_EVERY = 4;
export function eatPose(p: Pose, t: number) {
  const w = t % EAT_SECONDS;
  sitPose(p, w);
  const k = keyed(BITE, w % BITE_EVERY);
  hand(p, 0, EAT.table[0], EAT.table[0], 0);
  hand(p, 1, EAT.table[1], EAT.mouth, k);
  p.lean += EAT.lean;
  // Chewing: a small working of the jaw as a head nod, for a couple of seconds after the bite
  const since = (w % BITE_EVERY) - 1.65;
  const chew = since > 0 && since < 2 ? Math.sin(since * Math.PI * 2 * 1.8) * 0.02 : 0;
  p.headPitch = EAT.headPitch * k - 0.04 + chew;
  p.headYaw = Math.sin((w * Math.PI * 2) / EAT_SECONDS) * 0.25;
}

export const CHESS_SECONDS = 12;
/** Over the board: leaning in, the chin on the left hand, the right on the table, out over the board to move a piece once a loop (`MOVE`), a glance up at the opponent after */
export const CHESS = { chin: V(-0.04, 0.4, 0.11), rest: V(0.15, 0.32, 0.28), piece: V(0.0, 0.3, 0.46), lean: 0.22, headPitch: -0.32, grip: 0.45 };
export const MOVE: [number, number][] = [
  [0, 0],
  [5.6, 0],
  [6.3, 1],
  [6.9, 1],
  [7.6, 0],
];
export function chessPose(p: Pose, t: number) {
  const w = t % CHESS_SECONDS;
  sitPose(p, w);
  const k = keyed(MOVE, w);
  hand(p, 0, CHESS.chin, CHESS.chin, 0);
  hand(p, 1, CHESS.rest, CHESS.piece, k);
  p.lean += CHESS.lean + 0.06 * k;
  // Down at the board; a look up at the opponent for a moment after the move
  const up = keyed(
    [
      [0, 0],
      [8.4, 0],
      [8.8, 1],
      [9.6, 1],
      [10.1, 0],
    ],
    w
  );
  p.headPitch = CHESS.headPitch * (1 - up);
  p.headYaw = 0.1 * up;
}

export const LOUNGE_SECONDS = 8;
/** A folding chair: leant back with the legs out, the left arm along the armrest, the right hand on the knee, the head nodding to the beat (`BEAT` a minute) and looking round */
export const LOUNGE = { lean: -0.26, legs: { fwd: 1.2, out: 0.14, bend: 0.5 }, nod: -0.07, beat: 90 };
export function loungePose(p: Pose, t: number) {
  const w = t % LOUNGE_SECONDS;
  sitPose(p, w);
  p.lean = LOUNGE.lean;
  set(p.legs[0], LOUNGE.legs.fwd, LOUNGE.legs.out, LOUNGE.legs.bend);
  set(p.legs[1], LOUNGE.legs.fwd - 0.08, LOUNGE.legs.out, LOUNGE.legs.bend + 0.1);
  set(p.arms[0], 0.2, 0.3, 0.55);
  set(p.arms[1], 0.75, 0.12, 0.45);
  const beat = (w * LOUNGE.beat) / 60;
  p.headPitch = 0.03 + LOUNGE.nod * Math.max(0, Math.sin(beat * Math.PI * 2));
  p.headYaw = Math.sin((w * Math.PI * 2) / LOUNGE_SECONDS) * 0.4;
}

export const ROW_SECONDS = 2.4;
/** The stroke: at the catch leant forward with the arms out to the handles, at the finish leant back with the hands pulled to the chest; the knees bent up, the head up looking the way the boat goes */
export const ROW = { catch: [V(-0.18, 0.12, 0.42), V(0.18, 0.12, 0.42)], finish: [V(-0.18, 0.16, 0.1), V(0.18, 0.16, 0.1)], lean: [0.3, -0.22], legs: { fwd: 1.3, out: 0.12, bend: 1.3 }, grip: 0.8 };
export function rowPose(p: Pose, t: number) {
  const w = t % ROW_SECONDS;
  sitPose(p, 0);
  // The drive (catch to finish) a little quicker than the recovery
  const u = w / ROW_SECONDS;
  const k = u < 0.45 ? 0.5 - 0.5 * Math.cos((u / 0.45) * Math.PI) : 0.5 + 0.5 * Math.cos(((u - 0.45) / 0.55) * Math.PI);
  for (const i of [0, 1] as const) hand(p, i, ROW.catch[i], ROW.finish[i], k);
  set(p.legs[0], ROW.legs.fwd, ROW.legs.out, ROW.legs.bend);
  set(p.legs[1], ROW.legs.fwd, ROW.legs.out, ROW.legs.bend);
  p.lean = ROW.lean[0] + (ROW.lean[1] - ROW.lean[0]) * k;
  p.headPitch = 0.08;
  p.headYaw = 0;
}

export const PEDAL_SECONDS = 1.2;
/** The pedalo: hands on the bar in front, the knees pumping in turn (a leg's thigh rising as its foot comes up and forward), looking about */
export const PEDAL = { bar: [V(-0.15, 0.14, 0.3), V(0.15, 0.14, 0.3)], legs: { fwd: 1.25, swing: 0.28, out: 0.1, bend: 1.2, knee: 0.3 }, grip: 0.7 };
export function pedalPose(p: Pose, t: number) {
  const w = t % PEDAL_SECONDS;
  sitPose(p, 0);
  for (const i of [0, 1] as const) hand(p, i, PEDAL.bar[i], PEDAL.bar[i], 0);
  const a = (w / PEDAL_SECONDS) * Math.PI * 2;
  for (const i of [0, 1] as const) {
    const s = Math.sin(a + i * Math.PI);
    const c = Math.cos(a + i * Math.PI);
    set(p.legs[i], PEDAL.legs.fwd + PEDAL.legs.swing * s, PEDAL.legs.out, PEDAL.legs.bend + PEDAL.legs.knee * c);
  }
  p.lean = 0.02;
  p.headPitch = 0.04;
  p.headYaw = Math.sin(t * 0.3) * 0.3;
}

/* ---------- Kids at play (step 4) ---------- */

/** A set shot at the hoop: the ball held at the chest, brought up over the head and let go with the arms following it (`SHOT`: 0 at the chest, 1 over the head, 2 released and following), looking up at the hoop */
export const SHOOT = {
  chest: [V(-0.1, 0.2, 0.22), V(0.1, 0.2, 0.22)],
  up: [V(-0.08, 0.5, 0.12), V(0.08, 0.5, 0.12)],
  release: [V(-0.07, 0.56, 0.26), V(0.07, 0.56, 0.26)],
  headPitch: 0.3,
  grip: 0.5,
};
export const SHOT: [number, number][] = [
  [0, 0],
  [0.8, 0],
  [1.3, 1],
  [1.45, 1],
  [1.65, 2],
  [2.2, 2],
  [2.9, 0],
];
export function shootOver(sec: number, p: Pose) {
  const c = keyed(SHOT, sec);
  for (const i of [0, 1] as const) {
    if (c <= 1) hand(p, i, SHOOT.chest[i], SHOOT.up[i], c);
    else hand(p, i, SHOOT.up[i], SHOOT.release[i], c - 1);
  }
  // Eyes on the hoop throughout, the chin up more as the ball goes up
  p.headPitch = SHOOT.headPitch * (0.5 + 0.5 * Math.min(1, c));
  p.headYaw = 0;
  p.lean += 0.04 * Math.min(1, c);
}

export const SWING_SECONDS = 2.6;
/** On a swing: the hands up on the chains, the legs pumping together (out in front as the body leans back, tucked under as it comes forward); the seat stays put, so it's a gentle swing */
export const SWING = { chains: [V(-0.17, 0.3, 0.02), V(0.17, 0.3, 0.02)], legs: { fwd: 1.25, swing: 0.3, out: 0.1, bend: 0.9, kick: 0.75 }, lean: -0.08, rock: 0.14, grip: 0.8 };
export function swingPose(p: Pose, t: number) {
  const w = t % SWING_SECONDS;
  sitPose(p, 0);
  const a = (w / SWING_SECONDS) * Math.PI * 2;
  const s = Math.sin(a);
  for (const i of [0, 1] as const) {
    hand(p, i, SWING.chains[i], SWING.chains[i], 0);
    set(p.legs[i], SWING.legs.fwd + SWING.legs.swing * s, SWING.legs.out, SWING.legs.bend - SWING.legs.kick * Math.max(0, s));
  }
  p.lean = SWING.lean - SWING.rock * s;
  p.headPitch = 0.08 + 0.1 * s;
  p.headYaw = 0;
}

/* ---------- On a motorbike (vehicle plan Phases 7 and 8) ---------- */

/** Where a rider's root goes on a bike (bike space: his hips on the seat), at the riders' size (`DRIVER_SCALE`) */
export function riderRoot(id: BikeId): [number, number] {
  const [sx, sy] = BIKES[id].seat;
  return [sx, sy - HIP_HEIGHT * DRIVER_SCALE + 0.01];
}
const RM = new THREE.Matrix4();
const RC = new THREE.Matrix4();
const RQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
const RP = new THREE.Vector3();
const RS = new THREE.Vector3();
const RUP = new THREE.Vector3(0, 1, 0);
const RH = new THREE.Vector3();
const RE = new THREE.Euler();
/** How far his hips roll onto the foot that's down, stopped */
const SIDE_DOWN = -0.14;
/**
 * Astride a bike (your own, bikes.ts, and the traffic's riders, the crowd's `scoot` / `ride` / `tuck` rows): his hips
 * on the seat, leant forward by its `tuck` with his head back up, his feet on the pegs (or the floorboard), the left
 * coming `foot` of the way down to the ground (0 riding, 1 stopped), his hands on the grips turned `steer` (radians)
 * with the bars about the steering head. Worked out in bike space for the figure sat at `riderRoot()`, facing +x
 */
export function ridePose(p: Pose, id: BikeId, foot: number, steer = 0) {
  const s = BIKES[id];
  const S = DRIVER_SCALE;
  const [sx, sy] = s.seat;
  const [bx, by, bh] = s.bars;
  p.bob = p.twist = p.sway = p.turn = 0;
  // (stopped, he sits over onto the foot that's down: the hips roll that way)
  p.side = SIDE_DOWN * foot;
  p.lean = s.tuck;
  p.headYaw = 0;
  // (his head back up from the tuck, eyes on the road)
  p.headPitch = -s.tuck * 0.6;
  // His feet (the hips' space, his own size: x across with his right at -x, y up, z ahead)
  for (const [i, l] of p.legs.entries()) {
    const side = i === 0 ? -1 : 1;
    const down = i === 1 ? foot : 0;
    const out = s.pegs[2] + down * 0.08;
    const y = s.pegs[1] * (1 - down) + 0.04 * down;
    // (the foot down comes beside the seat; from the leg's own hip joint, as emotes.ts `hipSpace()`: the hips sit
    // 0.01 over the seat)
    const x = s.pegs[0] * (1 - down) + (sx + 0.1) * down;
    RP.set((side * out) / S, (y + ANKLE_H * S - sy - 0.01) / S, (x - sx) / S).applyEuler(RE.set(0, 0, -p.side));
    RP.x -= side * LEG_X;
    reachLeg(l, side, RP, p.side);
    l.foot = down * 0.1;
  }
  // His hands on the grips, turned with the bars
  const [rx, ry] = riderRoot(id);
  RC.compose(RP.set(rx, ry, 0), RQ, RS.setScalar(S)).multiply(torsoFrame(p, RM)).invert();
  const [hx, hy] = steeringHead(id);
  RH.set(hx, hy, 0);
  for (const i of [0, 1] as const) {
    tmp
      .set(bx, by, i === 0 ? bh - 0.05 : -(bh - 0.05))
      .sub(RH)
      .applyAxisAngle(RUP, steer)
      .add(RH)
      .applyMatrix4(RC);
    reachArm(p, i, tmp);
  }
}
