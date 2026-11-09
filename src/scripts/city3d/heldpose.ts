/*
 * The thing in Degen's hand behaving (the polish plan's Phase 8, the owner's
 * call: "held things with behaviour"), on foot, over the motion capture's
 * pose: the iced coffee comes up for a sip now and then (`HELD.sip`), the
 * phone comes up and is read standing still, with a glance up now and then,
 * and glanced at on the walk (`HELD.phone`), and the briefcase swings on the
 * hand as a pendulum driven by the hand's own motion and his speeding up and
 * slowing (`HELD.briefcase`). The boombox hangs as it did.
 *
 * `createHeldLife()` keeps the schedule and the swing; each frame walk.ts
 * calls `update()` with what he holds and how he's moving, then
 * `applyHeld()` lays the layer on the animator's bone turns before the figure
 * takes them (as contact.ts does): the hand brought to the cup's or the
 * phone's spot by the arm's two-bone IK (`reachArmBones()`), the head tipped,
 * the briefcase's hand swung. Loaded with walk mode's on-foot chunk
 * (onfoot.ts), never in the boot. DOM-free, tested in tests/heldpose.test.ts.
 */
import * as THREE from 'three';
import type { Outfit } from './wardrobe';
import { MB, NB, PARENT, type Posed, newPosed, posed } from './mocap';
import { reachArmBones } from './contact';

/** What can be in his hand (the outfit's: the crowd's shopping bag too, which hangs as it did) */
export type Held = NonNullable<Outfit['held']>;

export const HELD = {
  /** A sip: seconds between (the next drawn between the two), how long one takes, where the hand goes (the head's frame: x his right, y up, z forward) and the head tipped back at the top (radians) */
  sip: { every: [14, 26] as const, seconds: 2.4, at: [0.03, 0.03, 0.1] as const, tilt: 0.16, run: 2.2 },
  /** The phone: standing still this long it comes up to be read (where, in the head's frame but not turned with it; the head down this far), a glance up now and then; on the walk a glance at it now and then */
  phone: { still: 1.4, at: [0.06, -0.21, 0.19] as const, headDown: 0.62, glanceEvery: [7, 13] as const, glance: 2.2, walkEvery: [9, 16] as const, walkLook: 2.4, walkDown: 0.3, walkW: 0.75, wrist: -0.45 },
  /** The briefcase on the hand as a pendulum: its natural rate (rad/s), damping, how hard the hand's acceleration swings it, and the most it swings (radians) */
  briefcase: { omega: 5.5, damping: 2.6, drive: 1.6, most: 0.6 },
  /** How quickly a reach comes and goes (seconds) */
  ease: 0.35,
};

export interface HeldLayer {
  /** What's laid on this frame, if anything */
  kind: 'sip' | 'phone' | 'case' | null;
  /** How far the hand's reach is in (0 none, 1 all): a sip's or the phone's */
  reach: number;
  /** The head's pitch laid on (radians, + down) */
  head: number;
  /** The briefcase's swing (radians about his x, + the case forward) */
  swing: number;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};
const between = (r: () => number, [a, b]: readonly [number, number]) => a + r() * (b - a);

export function createHeldLife(seed = 0.5) {
  let s = (Math.floor(seed * 2147483646) % 2147483646) + 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const layer: HeldLayer = { kind: null, reach: 0, head: 0, swing: 0 };
  let was: Held | null = null;
  /** The coffee: seconds to the next sip, and how far through one (negative: none) */
  let sipIn = between(rnd, HELD.sip.every);
  let sip = -1;
  /** The phone: how long he's stood still, seconds to the next glance, how far through one; on the walk the same for a look at it */
  let still = 0;
  let glanceIn = between(rnd, HELD.phone.glanceEvery);
  let glance = -1;
  let lookIn = between(rnd, HELD.phone.walkEvery);
  let look = -1;
  let reading = 0;
  /** The briefcase's pendulum: angle and rate, and the hand's last place in his frame (for its acceleration) */
  let theta = 0;
  let thetaV = 0;
  const handWas = new THREE.Vector3();
  const handV = new THREE.Vector3();
  let handSeen = false;
  let lastSpeed = 0;

  function reset() {
    sip = -1;
    glance = -1;
    look = -1;
    still = 0;
    reading = 0;
    theta = thetaV = 0;
    handSeen = false;
    layer.kind = null;
    layer.reach = layer.head = layer.swing = 0;
  }

  return {
    layer,
    /**
     * Each frame: what he holds (null for nothing out), his speed (tiles a second), and whether the layer may play
     * (not emoting, sliding, vaulting, fighting or in a moment). Returns the layer to lay on.
     */
    update(dt: number, held: Held | null, speed: number, allowed: boolean): HeldLayer {
      if (held !== was) {
        reset();
        was = held;
      }
      const ease = Math.min(1, dt / HELD.ease);
      layer.kind = null;
      layer.head = 0;
      layer.swing = 0;
      if (!held || !allowed) {
        layer.reach = Math.max(0, layer.reach - ease);
        if (layer.reach > 0) layer.kind = held === 'phone' ? 'phone' : held === 'coffee' ? 'sip' : null;
        reading = 0;
        still = 0;
        return layer;
      }
      if (held === 'coffee') {
        // A sip now and then, not at a sprint: the hand up (eased), a pause at the lips, down again
        if (sip < 0) {
          sipIn -= dt;
          if (sipIn <= 0 && speed < HELD.sip.run) {
            sip = 0;
            sipIn = between(rnd, HELD.sip.every);
          }
        } else {
          sip += dt;
          if (sip >= HELD.sip.seconds || speed >= HELD.sip.run) sip = -1;
        }
        const k = sip < 0 ? 0 : Math.min(1, Math.min(sip / 0.8, (HELD.sip.seconds - sip) / 0.8));
        layer.reach += (smooth(k) - layer.reach) * (sip < 0 ? ease * 1.4 : 1);
        if (sip < 0 && layer.reach < 0.01) layer.reach = 0;
        layer.kind = layer.reach > 0 ? 'sip' : null;
        layer.head = -HELD.sip.tilt * smooth(Math.max(0, (layer.reach - 0.6) / 0.4));
        return layer;
      }
      if (held === 'phone') {
        const moving = speed > 0.3;
        still = moving ? 0 : still + dt;
        // Standing a while: the phone up and read, a glance up now and then; walking, a look at it now and then
        if (!moving && still >= HELD.phone.still) {
          reading = Math.min(1, reading + ease);
          if (glance < 0) {
            glanceIn -= dt;
            if (glanceIn <= 0) {
              glance = 0;
              glanceIn = between(rnd, HELD.phone.glanceEvery);
            }
          } else if ((glance += dt) >= HELD.phone.glance) glance = -1;
          look = -1;
        } else {
          reading = Math.max(0, reading - ease);
          glance = -1;
          if (moving) {
            if (look < 0) {
              lookIn -= dt;
              if (lookIn <= 0 && speed < HELD.sip.run) {
                look = 0;
                lookIn = between(rnd, HELD.phone.walkEvery);
              }
            } else if ((look += dt) >= HELD.phone.walkLook || speed >= HELD.sip.run) look = -1;
          } else look = -1;
        }
        const up = glance < 0 ? 0 : smooth(Math.min(1, Math.min(glance / 0.4, (HELD.phone.glance - glance) / 0.4)));
        const walking = look < 0 ? 0 : smooth(Math.min(1, Math.min(look / 0.6, (HELD.phone.walkLook - look) / 0.6)));
        const want = Math.max(reading, walking * HELD.phone.walkW);
        layer.reach += (want - layer.reach) * (want > layer.reach ? ease : ease * 1.3);
        if (want === 0 && layer.reach < 0.01) layer.reach = 0;
        layer.kind = layer.reach > 0 ? 'phone' : null;
        layer.head = reading > 0 ? HELD.phone.headDown * reading * (1 - up) : HELD.phone.walkDown * walking;
        return layer;
      }
      if (held === 'briefcase') {
        layer.reach = 0;
        layer.kind = 'case';
        layer.swing = theta;
        // (his speeding up and slowing swings it too, as an impulse along his way, so + is forward)
        const dv = THREE.MathUtils.clamp(speed - lastSpeed, -3, 3);
        lastSpeed = speed;
        thetaV -= dv * HELD.briefcase.drive * 0.25;
        return layer;
      }
      layer.reach = 0;
      return layer;
    },
    /** The briefcase's pendulum stepped by the hand's acceleration in his frame (from `applyHeld()`) */
    swing(dt: number, hand: THREE.Vector3) {
      if (dt <= 0) return theta;
      if (handSeen) {
        // (the hand's forward acceleration: its speed's change over the frame, along his z)
        const vz = (hand.z - handWas.z) / dt;
        const az = THREE.MathUtils.clamp((vz - handV.z) / dt, -40, 40);
        handV.set((hand.x - handWas.x) / dt, (hand.y - handWas.y) / dt, vz);
        thetaV -= az * HELD.briefcase.drive * dt;
      } else handV.set(0, 0, 0);
      handWas.copy(hand);
      handSeen = true;
      const w2 = HELD.briefcase.omega * HELD.briefcase.omega;
      thetaV += (-w2 * Math.sin(theta) - HELD.briefcase.damping * thetaV) * dt;
      theta = THREE.MathUtils.clamp(theta + thetaV * dt, -HELD.briefcase.most, HELD.briefcase.most);
      if (Math.abs(theta) >= HELD.briefcase.most) thetaV *= 0.2;
      layer.swing = theta;
      return theta;
    },
    reset,
  };
}
export type HeldLife = ReturnType<typeof createHeldLife>;

const P: Posed = newPosed();
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const X = new THREE.Vector3(1, 0, 0);
const target = new THREE.Vector3();
const off = new THREE.Vector3();
const before = new Float32Array(NB * 4);
/** Turn bone `b` by `pitch` about his x (+ tips forward), in his frame, whatever its parent's turn */
function pitchBone(rot: Float32Array, b: number, pitch: number) {
  const pw = P.rot[PARENT[b]];
  qa.setFromAxisAngle(X, pitch);
  qb.copy(pw).invert().multiply(qa).multiply(pw).multiply(qa.fromArray(rot, b * 4));
  qb.normalize().toArray(rot, b * 4);
}

/**
 * The layer on the animator's bone turns `rot` (its hips at `hips`), in his frame: a sip's or the phone's reach by
 * the right arm (`layer.reach`), the head's pitch, the briefcase's swing on the right hand (stepped here from the
 * hand's motion: `dt`). Nothing when the layer is empty.
 */
export function applyHeld(rot: Float32Array, hips: THREE.Vector3, life: HeldLife, dt: number) {
  const L = life.layer;
  if (!L.kind) return;
  posed(rot, 0, hips.x, hips.y, hips.z, P);
  if (L.kind === 'case') {
    const th = life.swing(dt, P.pos[MB.handR]);
    if (Math.abs(th) > 1e-4) pitchBone(rot, MB.handR, th);
    return;
  }
  if (L.reach > 1e-3) {
    if (L.kind === 'sip') {
      // The cup to the lips: a spot in front of the mouth, turned with the head
      off.set(HELD.sip.at[0], HELD.sip.at[1], HELD.sip.at[2]).applyQuaternion(P.rot[MB.head]);
      target.copy(P.pos[MB.head]).add(off);
    } else {
      // The phone in front of the chest, under the eyes (where the crowd reads theirs)
      target.set(P.pos[MB.head].x + HELD.phone.at[0], P.pos[MB.head].y + HELD.phone.at[1], P.pos[MB.head].z + HELD.phone.at[2]);
    }
    before.set(rot);
    reachArmBones(rot, P, MB.armR, MB.foreR, MB.handR, target);
    if (L.kind === 'phone') pitchBone(rot, MB.handR, HELD.phone.wrist);
    if (L.reach < 1) {
      // (part of the way: the arm's bones eased from what they had)
      for (const b of [MB.clavR, MB.armR, MB.foreR, MB.handR]) {
        qa.fromArray(before, b * 4);
        qb.fromArray(rot, b * 4);
        qa.slerp(qb, L.reach).toArray(rot, b * 4);
      }
    }
  }
  if (Math.abs(L.head) > 1e-4) {
    posed(rot, 0, hips.x, hips.y, hips.z, P);
    pitchBone(rot, MB.head, L.head);
  }
}
