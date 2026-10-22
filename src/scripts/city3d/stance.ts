/*
 * Third person: Degen with his gun (the player and other players). DOM-free,
 * so the tests can check the hands land on every gun.
 *
 * The gun is in `pivot` (a child of his torso frame) and both hands are put
 * on it with reachArm(): the shooting hand on the pistol grip, the other on
 * the front (`hold` in gunfit.ts: the handguard, the SMG's foregrip, the
 * shotgun's pump, the revolver's grip), wherever the reload clip
 * (`reloadAt()`) sends it. On top of the walk or run, only the upper body:
 *
 * - **Aiming** (`aim` 1): up level with where he looks, the spine bending a
 *   share of the way so the gun isn't only the arms; **ready** (`ready` 1):
 *   low and ready; **relaxed** (`ready` 0): a long gun carried low across his
 *   body, the revolver hanging in one hand at his side.
 * - Longer guns turn him side-on just far enough for the front hand to reach
 *   (his collarbone brings the shoulder forward first).
 * - **Recoil** pushes the gun back and up and shoves the shooting shoulder
 *   and the chest back.
 * - **Drawing and putting away** (`draw` 1 in hand .. 0 away): the hand goes
 *   to where the gun is put away (slung on his back, or the revolver on his
 *   hip), then the gun swings round to his hands; backwards to put it away.
 */
import * as THREE from 'three';
import { ARM_REACH, REACH_GAIN, reachArm, shoulderTo, type Limb, type Pose } from './skeleton';
import type { WeaponId } from './combat-sim';
import { FIT, GRIP, newReloadFrame, reloadAt, type ReloadFrame } from './gunfit';

/** The front hand doesn't stretch all the way: a slight bend at the elbow (his collarbone lends a little reach) */
const FRONT_REACH = ARM_REACH - 0.045 + REACH_GAIN * 0.75;
/** Both hands closed round the gun (the front one a little looser on the handguard); open, at rest */
const GUN_GRIP: [number, number] = [0.86, 0.72];
const OPEN = 0.2;
/** Most he turns side-on (radians) */
const MAX_TURN = 1.1;

/** Where the gun goes, in the torso frame: a pose for the pivot */
interface Place {
  pos: THREE.Vector3;
  q: THREE.Quaternion;
}
const basis = (x: number[], z: number[]) => {
  const X = new THREE.Vector3(...x).normalize();
  const Z = new THREE.Vector3(...z).normalize();
  const Y = Z.clone().cross(X);
  X.copy(Y).cross(Z);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
};
/** Put away: a long gun slung across his back (muzzle up over the left shoulder), the revolver in its holster on his right hip */
export const STOWED: Record<'long' | 'pistol', Place> = {
  long: { pos: new THREE.Vector3(-0.1, 0.15, -0.175), q: basis([0, 0, -1], [0.55, 0.83, 0]) },
  pistol: { pos: new THREE.Vector3(-0.205, 0.03, 0.035), q: basis([1, 0, 0], [0, -1, 0.12]) },
};
/** The pouch on his belt the front hand goes to on a reload, in the torso frame */
export const POUCH = new THREE.Vector3(0.13, 0.04, 0.11);

/** Per figure: how far he's turned side-on, eased between frames, and scratch for the reload */
export interface Stance {
  turn: number;
  frame: ReloadFrame;
  grip: [number, number];
}
export const newStance = (): Stance => ({ turn: 0, frame: newReloadFrame(), grip: [OPEN, OPEN] });

/** What's needed of the gun in his hands (guns.ts's Gun): which one, and its magazine to move */
export interface HeldGun {
  id: WeaponId;
  mag: THREE.Object3D;
}

export interface HoldState {
  /** 0 low and ready, 1 up and aiming */
  aim: number;
  /** 0 relaxed (carried low; the revolver in one hand), 1 ready. Aiming and reloading make him ready whatever this says */
  ready?: number;
  /** 1 in his hands, 0 put away (slung or holstered); in between he's drawing or putting it away */
  draw?: number;
  /** Where he looks: positive is down */
  pitch: number;
  /** Kick from the last shots (pushes the gun back and up) */
  recoil: number;
  /** 0..1 through a reload, 0 when not reloading */
  reload: number;
  /** Seconds since the last frame (0 snaps straight to the stance) */
  dt: number;
}

const ease = (x: number) => x * x * (3 - 2 * x);
const seg = (r: number, a: number, b: number) => ease(THREE.MathUtils.clamp((r - a) / (b - a), 0, 1));
const L = THREE.MathUtils.lerp;

const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const grip = new THREE.Vector3();
const front = new THREE.Vector3();
const rest = new THREE.Vector3();
const reach = new THREE.Vector3();
const held = { pos: new THREE.Vector3(), q: new THREE.Quaternion() };
const inv = new THREE.Matrix4();
const saved: [Limb, Limb] = [
  { fwd: 0, out: 0, bend: 0 },
  { fwd: 0, out: 0, bend: 0 },
];

const keep = (l: Limb, to: Limb) => {
  to.fwd = l.fwd;
  to.out = l.out;
  to.bend = l.bend;
  to.twist = l.twist ?? 0;
  to.reach = l.reach ?? 0;
};
/** The arm `w` of the way from how it was (walking) to how the reach left it */
const blend = (l: Limb, from: Limb, w: number) => {
  if (w >= 1) return;
  l.fwd = L(from.fwd, l.fwd, w);
  l.out = L(from.out, l.out, w);
  l.bend = L(from.bend, l.bend, w);
  l.twist = L(from.twist ?? 0, l.twist ?? 0, w);
  l.reach = L(from.reach ?? 0, l.reach ?? 0, w);
  if (w <= 0) l.wrist = undefined;
};

/** The gun's pivot in his hands for this frame (before the side-on turn) */
function inHands(p: Pose, s: HoldState, carry: 'long' | 'pistol', f: ReloadFrame, ready: number, kick: number) {
  const aim = s.aim;
  const rec = s.recoil * kick;
  // Ready: low, or level with where he looks; the chest's lean is taken back out
  const rp = L(0.45, s.pitch, aim) - p.lean - f.pitch - rec * 2;
  held.pos.set(-0.02, 0.32 + aim * 0.08, 0.16 + aim * 0.02 - rec * 0.4 - f.pull);
  let pitch = rp;
  let yaw = 0;
  let roll = -f.roll;
  if (ready < 1) {
    // Relaxed: a long gun low across his body, muzzle down; the revolver hanging in his hand at his side
    const k = 1 - ready;
    if (carry === 'long') {
      held.pos.lerp(rest.set(0.0, 0.22, 0.17), k);
      pitch = L(rp, 0.72 - p.lean, k);
      yaw = 0.5 * k;
      roll = L(roll, 0.25, k);
    } else {
      held.pos.lerp(rest.set(-0.2, -0.03, 0.1), k);
      pitch = L(rp, 1.25 - p.lean, k);
    }
  }
  return euler.set(pitch, yaw, roll);
}

/**
 * Pose the gun in `pivot` (a child of Degen's torso frame) and put his hands
 * on it. Call after the rest of the pose (walk, jump) so the arms aren't
 * overwritten; the walking arms are kept for any hand the gun doesn't need.
 */
export function holdGun(p: Pose, st: Stance, pivot: THREE.Object3D, gun: HeldGun, s: HoldState) {
  const fit = FIT[gun.id];
  const f = reloadAt(gun.id, s.reload, st.frame);
  const draw = s.draw ?? 1;
  const ready = Math.max(s.ready ?? 1, s.aim, s.reload > 0 ? 1 : 0);
  // Drawing: the hand reaches for the gun, then the gun comes round to his hands
  const lift = seg(draw, 0.35, 1);
  const toGun = seg(draw, 0, 0.35);
  // The front hand comes on last; the revolver is held in one hand when relaxed
  const two = fit.carry === 'long' ? 1 : seg(ready, 0.2, 0.8);
  const frontW = two * seg(draw, 0.65, 1);
  for (let i = 0; i < 2; i++) keep(p.arms[i], saved[i]);

  // The aim shared down the spine, and the recoil shoving the chest back
  const rec = s.recoil * fit.kick;
  const bend = (s.pitch * 0.3 * s.aim - rec * 2.2) * lift;
  p.lean += bend;
  p.headPitch -= bend;

  // Side-on just enough for the front hand to reach (the gun turns back the
  // other way inside the chest, so it still points where he faces)
  const e = inHands(p, s, fit.carry, f, ready, fit.kick);
  const [ex, yaw, ez] = [e.x, e.y, e.z];
  let want = 0;
  if (frontW > 0)
    for (; want < MAX_TURN; want += 0.05) {
      pivot.quaternion.setFromEuler(euler.set(ex, yaw + want, ez));
      front.copy(fit.hold).applyQuaternion(pivot.quaternion).add(held.pos);
      if (shoulderTo(1, front) <= FRONT_REACH) break;
    }
  want *= lift * frontW;
  st.turn = s.dt > 0 ? st.turn + (want - st.turn) * Math.min(1, s.dt * 10) : want;
  held.q.setFromEuler(euler.set(ex, yaw + st.turn, ez));
  p.twist -= (p.twist * 0.7 + st.turn) * lift;

  // From where it's put away to his hands, swinging out round his right side
  const away = STOWED[fit.carry];
  pivot.position.lerpVectors(away.pos, held.pos, lift);
  const arc = Math.sin(lift * Math.PI);
  pivot.position.x -= arc * (fit.carry === 'long' ? 0.12 : 0.04);
  pivot.position.z += arc * 0.06;
  pivot.quaternion.slerpQuaternions(away.q, held.q, lift);
  pivot.updateMatrix();

  // The shooting hand on the grip, its shoulder shoved back by a shot
  grip.copy(GRIP).applyMatrix4(pivot.matrix);
  reachArm(p, 0, grip, toGun >= 1 && lift > 0 ? -Math.min(0.25, rec * 6) * lift : undefined);
  blend(p.arms[0], saved[0], toGun);

  // The front hand on its spot, or wherever the reload has it (the pouch on his belt)
  rest.copy(fit.hold);
  rest.z += f.slide;
  front.copy(f.at).add(f.mag);
  front.lerpVectors(rest, front, f.hand).applyMatrix4(pivot.matrix);
  front.lerp(POUCH, f.away);
  if (frontW > 0) {
    reachArm(p, 1, front);
    blend(p.arms[1], saved[1], frontW);
  }

  // The magazine: rides in the front hand while it's carried, otherwise where the clip has it
  if (f.carried) {
    inv.copy(pivot.matrix).invert();
    reach.copy(front).applyMatrix4(inv).sub(rest.copy(fit.fore).add(fit.magAt));
    gun.mag.position.copy(reach);
  } else gun.mag.position.copy(f.mag);
  gun.mag.rotation.z = f.magRoll;
  gun.mag.visible = f.magShown;

  // (put away, his hands are his own: whatever he holds keeps its grip)
  if (toGun <= 0) return;
  st.grip[0] = L(OPEN, GUN_GRIP[0], toGun);
  st.grip[1] = L(OPEN, f.away > 0.5 ? 0.8 : GUN_GRIP[1], frontW);
  p.grip = st.grip;
}
