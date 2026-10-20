/*
 * Third person: Degen holding his gun (the player and other players).
 *
 * The gun sits in front of his chest, pointing where he faces, and both
 * hands are put on it with reachArm(): the shooting hand on the pistol grip,
 * the other on the front (`hold` in guns.ts: the handguard, the SMG's
 * foregrip, the shotgun's pump), or on the magazine during a reload. His
 * arms are short, so longer guns turn his body side-on (a bladed stance)
 * just far enough for the front hand to reach.
 */
import * as THREE from 'three';
import { ARM_REACH, reachArm, shoulderTo, type Pose } from './character';
import { gunSpec, type Gun } from './guns';

/** The middle of the palm on the pistol grip: every gun's grip is at its origin */
const GRIP = new THREE.Vector3(-0.012, -0.05, -0.025);
/** The front hand doesn't stretch all the way: a slight bend at the elbow */
const FRONT_REACH = ARM_REACH - 0.045;
/** Most he turns side-on (radians) */
const MAX_TURN = 1.1;

/** Per figure: how far he's turned side-on, eased between frames */
export interface Stance {
  turn: number;
}
export const newStance = (): Stance => ({ turn: 0 });

const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const grip = new THREE.Vector3();
const front = new THREE.Vector3();
const mag = new THREE.Vector3();

export interface HoldState {
  /** 0 low and ready, 1 up and aiming */
  aim: number;
  /** Where he looks: positive is down */
  pitch: number;
  /** Kick from the last shots (pushes the gun back and up) */
  recoil: number;
  /** 0..1 through a reload, 0 when not reloading */
  reload: number;
  /** Seconds since the last frame (0 snaps straight to the stance) */
  dt: number;
}

/**
 * Pose the gun in `pivot` (a child of Degen's chest) and put his hands on it.
 * Call after the rest of the pose (walk, jump) so the arms aren't overwritten.
 */
export function holdGun(p: Pose, st: Stance, pivot: THREE.Object3D, gun: Gun, s: HoldState) {
  const spec = gunSpec(gun.id);
  const rl = s.reload ? Math.sin(s.reload * Math.PI) : 0;
  // Low and ready, or level with where he looks; the chest's lean is taken back out
  const pitch = THREE.MathUtils.lerp(0.45, s.pitch, s.aim) - p.lean + rl * 0.35 - s.recoil * 2;
  const roll = -rl * 0.5;
  // Grip just right of the middle of his chest, far enough out that the hand clears his jacket
  pivot.position.set(-0.02, 0.32 + s.aim * 0.08, 0.16 + s.aim * 0.02 - s.recoil * 0.4);

  // Side-on just enough for the front hand to reach (the gun turns back the
  // other way inside the chest, so it still points where he faces)
  let want = 0;
  for (; want < MAX_TURN; want += 0.05) {
    pivot.quaternion.setFromEuler(euler.set(pitch, want, roll));
    front.copy(spec.hold).applyQuaternion(pivot.quaternion).add(pivot.position);
    if (shoulderTo(1, front) <= FRONT_REACH) break;
  }
  st.turn = s.dt > 0 ? st.turn + (want - st.turn) * Math.min(1, s.dt * 10) : want;
  pivot.quaternion.setFromEuler(euler.set(pitch, st.turn, roll));
  pivot.updateMatrix();
  p.twist = p.twist * 0.3 - st.turn;

  // The magazine drops out and goes back in during a reload; the front hand follows it
  gun.mag.position.y = -Math.sin(Math.min(1, rl * 1.4) * Math.PI) * 0.12;
  grip.copy(GRIP).applyMatrix4(pivot.matrix);
  front.copy(spec.hold);
  if (rl) front.lerp(mag.copy(spec.fore).add(spec.magAt).add(gun.mag.position), Math.min(1, rl * 1.6));
  front.applyMatrix4(pivot.matrix);
  reachArm(p, 0, grip);
  reachArm(p, 1, front);
}
