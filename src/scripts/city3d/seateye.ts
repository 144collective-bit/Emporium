/*
 * From the seat of the bike and the kart (docs/firstperson-plan.md, Phase 4): the eye at the rider's own eyes
 * (fpbody.ts `eyeOf()`, from his head bone as he's posed astride or seated), his head folded away so the camera
 * isn't inside it (the car's seat does the same, carride.ts), looking up the road along the vehicle as you look
 * round, and moving on fpcam.ts's rules: a lurch on the throttle and the brakes, a sway against the turn, the eyes
 * a little into it. drive.ts lays the view on the camera; the near plane comes in for it as it does for the car's
 * seat, so the bars, the grips and the wheel under his hands are in view. Shared by bikes.ts and karts.ts, each a
 * chunk of its own; nothing here is the boot's.
 */
import * as THREE from 'three';
import type { Degen } from './character';
import { eyeOf } from './fpbody';
import { newFpCam, stepFp, type FpMode, type FpView } from './fpcam';

/** What the eye needs of the vehicle's motion (drive-sim.ts's CarState carries both) */
export interface SeatMotion {
  speed: number;
  yawRate: number;
}

const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const FOLDED = 1e-3;

/** One seat's eye: `look()` each frame its view is up, `off()` when it isn't (his head back, the springs at rest) */
export function seatEye(mode: FpMode) {
  const cam = newFpCam();
  const head = new THREE.Vector3();
  const up = new THREE.Vector3();
  const dir = new THREE.Vector3();
  let folded: Degen | null = null;
  let last = NaN;
  const unfold = () => {
    folded?.rig.bones.head.scale.setScalar(1);
    folded = null;
  };
  return {
    /**
     * The eye now: `pos` and `at` set (world), the view's motion returned. `rider` seated at `scale` on `group`, or
     * `fallback` in the vehicle's own numbers when nobody's on it; `down` how far the eyes drop to the road ahead
     */
    look(group: THREE.Object3D, rider: Degen | null, scale: number, fallback: THREE.Vector3, pos: THREE.Vector3, at: THREE.Vector3, yaw: number, pitch: number, dt: number, st: SeatMotion, down = 0.12): FpView {
      group.updateWorldMatrix(true, true);
      if (rider !== folded) unfold();
      if (rider) {
        eyeOf(rider.rig.bones, scale, pos, head, up);
        rider.rig.bones.head.scale.setScalar(FOLDED);
        folded = rider;
      } else pos.copy(fallback).applyMatrix4(group.matrixWorld);
      // (the vehicle's own +x is ahead)
      const a = -down - pitch * 0.7;
      dir.set(Math.cos(a) * Math.cos(yaw), Math.sin(a), -Math.cos(a) * Math.sin(yaw)).transformDirection(group.matrixWorld);
      at.copy(pos).addScaledVector(dir, 5);
      const speed = Math.abs(st.speed);
      const fwd = Number.isFinite(last) && dt > 0 ? (speed - last) / dt : 0;
      last = speed;
      // (no bob of its own and no widening: the vehicle's ride moves the eye already, and drive.ts widens with speed)
      return stepFp(cam, mode, { speed, top: 0, fwd, side: -st.speed * st.yawRate, turn: st.yawRate, bob: 0, reduced }, dt);
    },
    off() {
      unfold();
      last = NaN;
      Object.assign(cam, newFpCam());
    },
  };
}
export type SeatEye = ReturnType<typeof seatEye>;
