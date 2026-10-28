/*
 * Degen on his feet (character Phase 2, docs/character-plan.md): walking,
 * jogging and running with the feet planted on the ground, starts, stops,
 * turns, strafing, stairs, jumps and landings, and the idle. DOM-free like
 * skeleton.ts, so the tests drive it in Node and check that a planted foot
 * never slides.
 *
 * Lower body, the feet in the world:
 * - Each foot is planted where it lands and stays there (world numbers)
 *   while the body moves over it; the other swings to where the body will
 *   be when it lands (`predict`: the position and facing then, ahead along
 *   the way he's going by half the stride). So nothing slides, whichever
 *   way he moves (backwards and sideways while aiming, round a bend) and
 *   whatever the ground does: every plant takes the ground's height there
 *   (kerbs, Liberty Bridge's stairs, the kart park's banks).
 * - The gait comes from the speed in leg lengths a second (`gait()`): the
 *   steps a second, how much of the cycle a foot is down (a walk has both
 *   down at once, a run has both up), the lift, how low the hips ride, the
 *   lean and the arms. Degen's walking speed is a jog for his legs; his run
 *   is a sprint.
 * - A planted foot rolls heel to toe: it lands toes up on the heel, goes
 *   flat, then the heel lifts and it turns on the ball of the foot with the
 *   toes flat on the ground, and it pushes off.
 * - Two-bone leg IK (`reachLeg()`) puts each ankle where its foot needs it;
 *   the hips drop when a foot would be out of reach (a step down, a long
 *   stride).
 * - Standing still, the feet stay put; if he turns or drifts so a foot is
 *   off its spot, he steps it back under him (turning on the spot).
 *
 * Upper body: the arms swing against the legs (each with the other foot),
 * the pelvis turns with the forward leg and the shoulders against it, the
 * hips sway over the foot taking the weight, the body leans into its speed,
 * into a start (and back into a stop) and into a bend.
 *
 * Clips (keyframed, eased, added on top): the landings, soft, a crouch, or
 * a forward roll after a big drop; and the idle's breathing and weight shift.
 *
 * `update()` writes a Pose (with `sway`, `turn`, each leg's `foot` and
 * `toe`) and `root` (the figure's roll into a bend, the roll's pitch, its
 * pivot); `placeRoot()` puts the figure's group where the IK assumed it.
 */
import * as THREE from 'three';
import { ANKLE_H, BALL_Z, HIP_Y, LEG_REACH, LEG_X, newPose, reachLeg, step, type Limb, type Pose } from './skeleton';

/* ---------- The leg ---------- */

/** The heel behind the ankle; the ball of the foot (where the toes bend) ahead of it */
const HEEL_Z = -0.06;
/** How far apart the feet stand: each this far out from the middle */
export const FOOT_X = LEG_X * 1.12;

// (the leg's two-bone reach is skeleton.ts's, beside the arm's; walking, the emotes and your car's seat use it)
export { LEG_REACH, reachLeg };

/* ---------- The gait ---------- */

/** A value along `pts` ([x, y] in order of x), straight between them and held past the ends */
const curve = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++)
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  return pts[pts.length - 1][1];
};

export interface Gait {
  /** Steps a second (two a cycle) */
  cadence: number;
  /** How much of the cycle a foot is on the ground */
  duty: number;
  /** How high a swinging foot lifts (the figure's numbers) */
  lift: number;
  /** How low the hips ride, and how much they rise and fall with each step */
  drop: number;
  bob: number;
  lean: number;
  /** The arms' swing and their elbows' bend */
  arms: number;
  elbows: number;
  /** 0 a walk, 1 a run: the heel strike fades, the hips dip mid-stride instead of rising */
  run: number;
  /** How the landing foot meets the ground (toes up), and how far it tips onto its toes pushing off */
  heel: number;
  toeOff: number;
  /** How much of the stance is ahead of the hips (the foot lands this far along it) */
  fore: number;
}

/**
 * The gait at `w` leg lengths a second (a person's walk is about 1.5, a
 * jog about 4.5, a sprint about 10). Degen's walk (2.4 tiles a second at
 * his scale) is about 4.5: a jog; his run (5.4) about 10.
 */
const DUTY: [number, number][] = [[0, 0.66], [1.5, 0.6], [4.55, 0.33], [10.2, 0.22]];
const DROP: [number, number][] = [[0, 0.004], [0.8, 0.02], [1.5, 0.035], [4.55, 0.058], [10.2, 0.075]];
/** How much of a stance is ahead of the hips (a walk lands as far ahead as it leaves behind; a run lands close under him and pushes off far behind) */
const FORE: [number, number][] = [[0, 0.5], [1.5, 0.48], [4.55, 0.38], [10.2, 0.33]];
const runOf = (w: number) => THREE.MathUtils.clamp((w - 2.5) / 4, 0, 1);
/** How far the foot tips onto its toes pushing off */
const toeOffOf = (w: number) => 0.55 + 0.35 * runOf(w);
/**
 * Steps a second by speed: at least a person's, and enough that the stance stays in the leg's
 * reach from hips that low, ahead (landing, the knee soft when running, a walk's heel strike
 * helping a little) and behind (the push-off up on the ball of the foot carries the ankle up and
 * along), never fewer at a higher speed (worked out once, every 0.1 leg lengths a second)
 */
const CADENCE: [number, number][] = (() => {
  const out: [number, number][] = [];
  let top = 0;
  for (let w = 0; w <= 14; w += 0.1) {
    const v = HIP_Y - curve(DROP, w) - ANKLE_H;
    const run = runOf(w);
    const r = LEG_REACH * (1 - 0.04 * run);
    const ahead = Math.sqrt(Math.max(0, r * r - v * v)) + 0.02 * (1 - run);
    const th = toeOffOf(w);
    const rise = ANKLE_H * Math.cos(th) + BALL_Z * Math.sin(th) - ANKLE_H;
    const along = BALL_Z + ANKLE_H * Math.sin(th) - BALL_Z * Math.cos(th);
    const behind = Math.sqrt(Math.max(0, LEG_REACH * LEG_REACH - (v - rise) ** 2)) + along;
    const fore = curve(FORE, w);
    const stance = Math.min(ahead / fore, behind / (1 - fore));
    top = Math.max(top, curve([[0, 1.7], [1.5, 1.85], [4.55, 2.95], [10.2, 4.6]], w), (2 * w * HIP_Y * curve(DUTY, w)) / stance);
    out.push([w, top]);
  }
  return out;
})();

export function gait(w: number): Gait {
  const run = runOf(w);
  const duty = curve(DUTY, w);
  const drop = curve(DROP, w);
  return {
    cadence: curve(CADENCE, w),
    duty,
    lift: curve([[0, 0.04], [1.5, 0.05], [4.55, 0.085], [10.2, 0.13]], w),
    drop,
    bob: curve([[0, 0], [1.5, 0.01], [4.55, 0.018], [10.2, 0.025]], w),
    lean: curve([[0, 0.02], [1.5, 0.04], [4.55, 0.1], [10.2, 0.22]], w),
    arms: curve([[0, 0.1], [1.5, 0.28], [4.55, 0.45], [10.2, 0.7]], w),
    elbows: curve([[0, 0.2], [1.5, 0.3], [4.55, 1.15], [10.2, 1.5]], w),
    run,
    heel: -0.28 * (1 - run) - 0.04,
    toeOff: toeOffOf(w),
    fore: curve(FORE, w),
  };
}

/* ---------- Clips ---------- */

/** A keyframed track: [seconds, value] in order, eased (smoothstep) between keys, held past the ends */
type Track = [number, number][];
const sample = (keys: Track, t: number) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++)
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1];
      const [t1, v1] = keys[i];
      const u = (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * u * u * (3 - 2 * u);
    }
  return keys[keys.length - 1][1];
};
/** A clip: tracks by what they move (added to the pose), and how long it runs */
interface Clip {
  length: number;
  tracks: Partial<Record<'drop' | 'lean' | 'arms' | 'elbows' | 'head' | 'pitch' | 'tuck', Track>>;
}
/** The landings: a soft step, a crouch that soaks up a bigger drop, a forward roll after a big one */
export const LANDINGS: Record<'soft' | 'crouch' | 'roll', Clip> = {
  soft: {
    length: 0.26,
    tracks: {
      drop: [[0, 0], [0.06, 0.045], [0.26, 0]],
      lean: [[0, 0], [0.07, 0.05], [0.26, 0]],
    },
  },
  crouch: {
    length: 0.5,
    tracks: {
      drop: [[0, 0], [0.09, 0.17], [0.2, 0.15], [0.5, 0]],
      lean: [[0, 0], [0.1, 0.22], [0.5, 0]],
      arms: [[0, 0], [0.1, 0.45], [0.5, 0]],
      elbows: [[0, 0], [0.1, 0.5], [0.5, 0]],
      head: [[0, 0], [0.1, -0.12], [0.5, 0]],
    },
  },
  roll: {
    length: 0.75,
    tracks: {
      // The whole figure tips forward right over (the root's pitch, about the hips), tucked up tight
      pitch: [[0, 0], [0.08, 0.5], [0.55, Math.PI * 2 - 0.35], [0.75, Math.PI * 2]],
      tuck: [[0, 0], [0.08, 1], [0.5, 1], [0.75, 0]],
      drop: [[0, 0], [0.08, 0.22], [0.55, 0.22], [0.75, 0]],
      lean: [[0, 0], [0.08, 0.5], [0.55, 0.5], [0.75, 0]],
      head: [[0, 0], [0.08, -0.45], [0.55, -0.45], [0.75, 0]],
    },
  },
};
/** How hard a landing is (falling speed, tiles a second) before it's a crouch, then a roll */
export const LAND_CROUCH = 5.5;
export const LAND_ROLL = 9.5;

/* ---------- Locomotion ---------- */

export interface LocoInput {
  dt: number;
  /** Seconds, for the idle */
  t: number;
  /** The body: where its feet are (the ground under its middle), how it's moving and where it faces (0 faces +z) */
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  face: number;
  grounded: boolean;
  /** Falling speed (negative down) */
  vy: number;
  /** The figure's scale in the world */
  scale: number;
  /** The ground's height at (x, z), for a body at height y */
  ground(x: number, z: number, y: number): number;
  /** Holding a gun: the pelvis keeps square so the hold stays on target */
  armed?: boolean;
}

/** Where the figure's group goes: its roll into a bend and the forward roll's pitch about a height up the body */
export interface Root {
  roll: number;
  pitch: number;
  pivot: number;
}

export interface Foot {
  /** On the ground (stance) or swinging */
  stance: boolean;
  /** Its own phase through the cycle: down from 0, up at the gait's duty (a swing then runs to its end) */
  q: number;
  /** 0..1 through the stance or the swing */
  u: number;
  /** Where it's planted (or will be): the ground under the ankle with the foot flat, and its facing */
  plant: THREE.Vector3;
  yaw: number;
  /** The ankle now, in the world, and the foot's pitch and toes */
  ankle: THREE.Vector3;
  pitch: number;
  toe: number;
  /** Where a swing started from */
  from: THREE.Vector3;
  fromPitch: number;
  fromYaw: number;
  /** The foot's heading now (a swinging foot turns from its old heading to its new one) */
  heading: number;
}

const V = () => new THREE.Vector3();
const m4 = new THREE.Matrix4();
const inv = new THREE.Matrix4();
const qa = new THREE.Quaternion();
const eu = new THREE.Euler(0, 0, 0, 'YXZ');
const ex = new THREE.Euler();
const qp = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const tv = new THREE.Vector3();
const one = new THREE.Vector3(1, 1, 1);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);

/** The figure's group's matrix: at (x, y, z) facing `face`, rolled and pitched about `root.pivot` up its axis, at `scale` */
export function rootMatrix(x: number, y: number, z: number, face: number, scale: number, root: Root, out: THREE.Matrix4) {
  qa.setFromEuler(eu.set(root.pitch, face, root.roll, 'YXZ'));
  // Turn about the pivot: the origin moves so the pivot stays put
  tv.set(0, root.pivot * scale, 0).applyQuaternion(qa);
  out.compose(new THREE.Vector3(x, y + root.pivot * scale - tv.y, z).sub(tv.setY(0)), qa, one.set(scale, scale, scale));
  return out;
}
/** Put a figure's group where `rootMatrix()` says */
export function placeRoot(g: THREE.Object3D, x: number, y: number, z: number, face: number, scale: number, root: Root) {
  rootMatrix(x, y, z, face, scale, root, g.matrix);
  g.matrix.decompose(g.position, g.quaternion, g.scale);
}

/** The most the hips come down to keep both planted feet in reach (a big step down; the figure's numbers) */
const HIP_DROP = 0.2;
/** Two feet planted at once and both near their spots: the walk can stop */
const SETTLE = 0.05;
/** How far a standing foot may drift from under him (tiles), or turn from his facing, before he steps it back */
const DRIFT = 0.13;
const TWIST = 0.55;

export interface Locomotion {
  /** The pose written by `update()` (copy it onto a figure's) */
  pose: Pose;
  root: Root;
  feet: [Foot, Foot];
  /** The walk cycle (0..1), and as an angle for the camera's bob */
  cycle: number;
  readonly phase: number;
  /** Walking at all (false: standing, the feet planted) */
  readonly stepping: boolean;
  /** Seconds standing still, and a slow look round that goes with it */
  readonly idle: number;
  readonly look: number;
  /** The gait it's in */
  readonly gait: Gait;
  /** The last landing's clip */
  readonly landed: keyof typeof LANDINGS | null;
  update(inp: LocoInput): void;
  /** Teleported: stand with both feet planted under him */
  reset(x: number, y: number, z: number, face: number, scale: number, ground: LocoInput['ground']): void;
}

export function createLocomotion(): Locomotion {
  const pose = newPose();
  pose.sway = 0;
  pose.turn = 0;
  for (const l of pose.legs) {
    l.foot = l.toe = l.footYaw = l.footRoll = 0;
  }
  const root: Root = { roll: 0, pitch: 0, pivot: 0.45 };
  const foot = (): Foot => ({ stance: true, q: 0, u: 0, plant: V(), yaw: 0, ankle: V(), pitch: 0, toe: 0, from: V(), fromPitch: 0, fromYaw: 0, heading: 0 });
  const feet: [Foot, Foot] = [foot(), foot()];
  let cycle = 0;
  let stepping = false;
  let idle = 0;
  let look = 0;
  let g = gait(0);
  let air = 0;
  let wasGrounded = true;
  let fallSpeed = 0;
  let landing: { clip: Clip; t: number } | null = null;
  let lastFace = 0;
  let turnRate = 0;
  let fwdSpeed = 0;
  let accel = 0;
  let roll = 0;
  let settle = 0;
  let steep = 0;
  let walkS = 0;
  let reachDrop = 0;
  let gaitW = 0;
  let lastLanding: keyof typeof LANDINGS | null = null;
  const last = new THREE.Vector3(NaN, 0, NaN);
  const home = V();
  const tmp = V();

  /** Where foot i stands (the ground under the ankle, flat) with the body at (x, z) facing `f`, `ahead` tiles along (dx, dz) */
  function spot(out: THREE.Vector3, i: number, x: number, z: number, f: number, s: number, ahead: number, dx: number, dz: number) {
    const side = (i === 0 ? -1 : 1) * FOOT_X * s;
    return out.set(x + Math.cos(f) * side + dx * ahead, 0, z - Math.sin(f) * side + dz * ahead);
  }
  /** The ankle over a foot planted at `p` facing `yaw`, tipped `pitch` (heel down rolls on the heel, toes down on the ball), at scale `s` */
  function ankleOn(out: THREE.Vector3, p: THREE.Vector3, yaw: number, pitch: number, s: number) {
    // In the foot's own numbers (z forward): the pivot, then the ankle turned about it
    const pz = pitch < 0 ? HEEL_Z : pitch > 0 ? BALL_Z : 0;
    const ry = ANKLE_H;
    const rz = -pz;
    const c = Math.cos(pitch);
    const sn = Math.sin(pitch);
    const y = ry * c - rz * sn;
    const zz = pz + ry * sn + rz * c;
    return out.set(p.x + Math.sin(yaw) * zz * s, p.y + y * s, p.z + Math.cos(yaw) * zz * s);
  }

  function reset(x: number, y: number, z: number, face: number, scale: number, ground: LocoInput['ground']) {
    for (let i = 0; i < 2; i++) {
      const f = feet[i];
      spot(f.plant, i, x, z, face, scale, 0, 0, 0);
      f.plant.y = ground(f.plant.x, f.plant.z, y + 0.3);
      f.yaw = f.heading = face;
      f.stance = true;
      f.u = 0;
      f.pitch = f.toe = 0;
      ankleOn(f.ankle, f.plant, f.yaw, 0, scale);
    }
    // Both feet down (the walk's double support), the first ready to step
    feet[0].q = 0.6;
    feet[1].q = 0.1;
    cycle = 0.6;
    stepping = false;
    landing = null;
    air = 0;
    wasGrounded = true;
    lastFace = face;
    turnRate = fwdSpeed = accel = roll = 0;
    last.set(x, y, z);
  }

  function update(inp: LocoInput) {
    const { dt, scale: S } = inp;
    // Teleported (a spawn, out of a car): stand where he is
    if (!Number.isFinite(last.x) || Math.hypot(inp.x - last.x, inp.z - last.z) > 1.5) reset(inp.x, inp.y, inp.z, inp.face, S, inp.ground);
    // In the air the feet go with him (the legs are the air pose's), and nothing is planted
    if (!inp.grounded) for (const f of feet) f.ankle.add(tmp.set(inp.x - last.x, inp.y - last.y, inp.z - last.z));
    last.set(inp.x, inp.y, inp.z);
    const speed = Math.hypot(inp.vx, inp.vz);
    const w = speed / S / HIP_Y;
    // (the gait follows the speed: quickly speeding up, over a few steps slowing down, so a stop doesn't change it mid-stride)
    gaitW += (w - gaitW) * damp(w > gaitW ? 14 : 5, dt);
    g = gait(gaitW);
    const dirX = speed > 1e-3 ? inp.vx / speed : 0;
    const dirZ = speed > 1e-3 ? inp.vz / speed : 0;
    // How fast he's turning and speeding up (for the leans)
    turnRate += (wrap(inp.face - lastFace) / Math.max(dt, 1e-4) - turnRate) * damp(10, dt);
    lastFace = inp.face;
    const fwd = inp.vx * Math.sin(inp.face) + inp.vz * Math.cos(inp.face);
    accel += ((fwd - fwdSpeed) / Math.max(dt, 1e-4) - accel) * damp(8, dt);
    fwdSpeed = fwd;

    // In the air, and landing
    if (!inp.grounded) fallSpeed = inp.vy;
    if (inp.grounded && !wasGrounded) land(inp, speed, dirX, dirZ);
    wasGrounded = inp.grounded;
    air += ((inp.grounded ? 0 : 1) - air) * damp(inp.grounded ? 22 : 14, dt);

    // Stepping: start when moving, or when a standing foot has drifted from under him. Sideways and
    // backwards he takes shorter, quicker steps
    const lat = Math.abs(dirX * Math.cos(inp.face) - dirZ * Math.sin(inp.face));
    const back = Math.max(0, -(dirX * Math.sin(inp.face) + dirZ * Math.cos(inp.face)));
    // Up or down a slope or stairs (the ground ahead), shorter quicker steps too
    const ahead = 0.35 * S;
    const slope = speed > 0.05 ? Math.abs(inp.ground(inp.x + dirX * ahead, inp.z + dirZ * ahead, inp.y + 0.3) - inp.y) / ahead : 0;
    steep += (Math.min(2, slope) - steep) * damp(8, dt);
    const T = 2 / (g.cadence * (1 + 0.55 * lat + 0.2 * back + 1.1 * steep));
    let drift = false;
    for (let i = 0; i < 2; i++) {
      spot(home, i, inp.x, inp.z, inp.face, S, 0, 0, 0);
      const f = feet[i];
      if (Math.hypot(f.plant.x - home.x, f.plant.z - home.z) > DRIFT * S || Math.abs(wrap(f.yaw - inp.face)) > TWIST) drift = true;
    }
    if (!stepping && inp.grounded && (speed > 0.12 || drift)) {
      stepping = true;
      // Setting off: each planted foot picks up its roll from where its phase is
      for (const f of feet) if (f.stance) f.u = Math.min(1, f.q / g.duty);
    }
    // Stop once he's still with both feet down near their spots
    if (stepping && inp.grounded && speed < 0.08 && feet.every((f) => f.stance) && !drift && feet.every((f, i) => near(f, i, inp, S))) {
      stepping = false;
      settle = 0.25;
    }
    if (!stepping) idle += dt;
    else idle = 0;
    settle = Math.max(0, settle - dt);

    // Each foot: planted, or swinging to where the body will be when it lands. Each keeps its own
    // phase, half a cycle from the other's (eased back to it when a change of gait puts them out);
    // a swing always finishes, and a walking foot never lifts while the other is in the air
    const stride = speed * g.duty * T;
    const apart = wrap((feet[1].q - feet[0].q - 0.5) * Math.PI * 2) / (Math.PI * 2);
    for (let i = 0; i < 2 && inp.grounded; i++) {
      const f = feet[i];
      const other = feet[1 - i];
      if (stepping) f.q += (dt / T) * (1 + (i === 0 ? 0.5 : -0.5) * apart);
      // (a foot left far behind, slowing down, steps up early)
      const behind = f.stance && stepping && other.stance && f.u > 0.3 && Math.hypot(f.plant.x - inp.x, f.plant.z - inp.z) > 0.4 * S && speed < 1;
      // (and one out of the leg's reach goes whatever the other is doing)
      const lost = f.stance && stepping && f.u > 0.4 && Math.hypot(f.plant.x - inp.x, f.plant.z - inp.z) > 0.33 * S;
      if (f.stance && stepping && (((f.q >= g.duty || behind) && (other.stance || g.duty < 0.5)) || lost)) {
        // Lifting off: the swing starts from here
        f.stance = false;
        f.u = 0;
        f.from.copy(f.ankle);
        f.fromPitch = f.pitch;
        f.fromYaw = f.yaw;
      }
      if (f.stance) {
        // (only ever onwards through the roll, though slowing down lengthens the stance)
        f.u = stepping ? Math.max(f.u, Math.min(1, f.q / g.duty)) : 1;
        // Heel strike, flat, then up onto the ball of the foot
        const heelEnd = 0.16 * (1 - g.run);
        const toeFrom = 0.58 - 0.16 * g.run;
        let pitch = 0;
        if (!stepping) pitch = 0;
        else if (f.u < heelEnd) pitch = g.heel * (1 - step(0, heelEnd, f.u));
        else if (f.u > toeFrom) pitch = g.toeOff * step(toeFrom, 1, f.u) * Math.min(1, w / 1.2);
        // (a foot starting mid-roll as he sets off tips over a few frames, still planted; then it follows)
        if (Math.abs(pitch - f.pitch) > 0.25) f.pitch += (pitch - f.pitch) * damp(28, dt);
        else f.pitch = pitch;
        f.toe = -Math.max(0, f.pitch);
        f.heading = f.yaw;
        ankleOn(f.ankle, f.plant, f.yaw, f.pitch, S);
        continue;
      }
      const swingT = (1 - g.duty) * T;
      f.u = Math.min(1, f.u + dt / swingT);
      const sw = f.u;
      // Where the body will be when this foot lands, and where the foot goes then
      const tau = (1 - sw) * swingT;
      const face = inp.face + THREE.MathUtils.clamp(turnRate, -6, 6) * tau;
      spot(f.plant, i, inp.x + inp.vx * tau, inp.z + inp.vz * tau, face, S, stride * g.fore, dirX, dirZ);
      f.plant.y = inp.ground(f.plant.x, f.plant.z, inp.y + 0.3);
      f.yaw = face;
      ankleOn(tmp, f.plant, f.yaw, g.heel, S);
      if (sw >= 1) {
        // Down: planted where it was heading, heel first
        f.stance = true;
        f.q = 0;
        f.u = 0;
        f.ankle.copy(tmp);
        f.pitch = g.heel;
        f.toe = 0;
        f.heading = f.yaw;
        continue;
      }
      // Close to even: under the moving body the foot then comes through steadily from behind to in
      // front (an eased path would race ahead and wait), softened at each end
      const e = 0.7 * sw + 0.3 * sw * sw * sw * (sw * (sw * 6 - 15) + 10);
      f.ankle.lerpVectors(f.from, tmp, e);
      // Up and over: higher stepping up or down
      const rise = Math.sin(Math.PI * sw);
      f.ankle.y += (g.lift * S + Math.abs(tmp.y - f.from.y) * 0.6) * rise;
      // Running, the leg folds up under him as it comes through (the heel up towards the seat)
      if (g.run > 0) {
        const fold = g.run * 0.7 * Math.sin(Math.PI * sw) ** 1.5;
        const side = (i === 0 ? -1 : 1) * FOOT_X;
        const tz = -0.12;
        const ty = 0.3 + Math.min(inp.y, f.ankle.y) / S - inp.y / S;
        tmp.set(inp.x + (Math.cos(inp.face) * side + Math.sin(inp.face) * tz) * S, inp.y + ty * S, inp.z + (-Math.sin(inp.face) * side + Math.cos(inp.face) * tz) * S);
        f.ankle.lerp(tmp, fold);
      }
      f.pitch = f.fromPitch + (g.heel - f.fromPitch) * step(0, 1, sw) - 0.25 * rise * g.run;
      f.toe = f.fromPitch > 0 ? -f.fromPitch * (1 - step(0, 0.5, sw)) : 0;
      f.heading = f.fromYaw + wrap(f.yaw - f.fromYaw) * e;
    }
    cycle = ((feet[0].q % 1) + 1) % 1;

    /* ----- The hips and legs ----- */
    const p = pose;
    // How much of the walk's swing and bob the body takes: eased, so starting and stopping never snap
    walkS += (Math.min(1, w / 1.2) * (stepping ? 1 : 0) - walkS) * damp(10, dt);
    const walkness = walkS;
    const c2 = Math.cos(cycle * Math.PI * 4);
    // A walk rises over the planted foot (lowest with both down); a run dips onto it
    const bobWalk = -g.bob * c2;
    const bobRun = -g.bob * Math.cos((cycle - g.duty / 2) * Math.PI * 4);
    p.bob = -g.drop * walkness + (bobWalk * (1 - g.run) + bobRun * g.run) * walkness;
    p.side = -0.035 * Math.sin(cycle * Math.PI * 2) * walkness * (1 - g.run * 0.5);
    p.sway = -0.012 * Math.sin(cycle * Math.PI * 2) * walkness * (1 - g.run);
    // Standing: breathe, and shift the weight from foot to foot now and then
    const still = 1 - Math.min(1, speed / 0.4);
    const shift = Math.sin((inp.t * Math.PI * 2) / 8.5);
    p.sway += 0.02 * shift * still;
    p.side += 0.028 * shift * still;
    p.bob += (Math.sin((inp.t * Math.PI * 2) / 3.8) * 0.004 - Math.abs(shift) * 0.008) * still - 0.02 * Math.sin((Math.PI * settle) / 0.25);

    // The feet in the body's numbers: how far forward each is (for the arms and the pelvis)
    const halfStride = Math.max(0.05, stride / S / 2);
    const fz = [0, 0];
    for (let i = 0; i < 2; i++) {
      const a = feet[i].ankle;
      fz[i] = ((a.x - inp.x) * Math.sin(inp.face) + (a.z - inp.z) * Math.cos(inp.face)) / S;
    }
    const legsFwd = THREE.MathUtils.clamp((fz[0] - fz[1]) / (2 * halfStride), -1.2, 1.2);
    p.turn = 0.12 * legsFwd * walkness * (inp.armed ? 0.3 : 1);

    // Landing clips, and the air
    let clipDrop = 0;
    let clipLean = 0;
    let clipArms = 0;
    let clipElbows = 0;
    let clipHead = 0;
    let tuck = 0;
    root.pitch = 0;
    if (landing) {
      landing.t += dt;
      const tr = landing.clip.tracks;
      const at = landing.t;
      clipDrop = tr.drop ? sample(tr.drop, at) : 0;
      clipLean = tr.lean ? sample(tr.lean, at) : 0;
      clipArms = tr.arms ? sample(tr.arms, at) : 0;
      clipElbows = tr.elbows ? sample(tr.elbows, at) : 0;
      clipHead = tr.head ? sample(tr.head, at) : 0;
      tuck = tr.tuck ? sample(tr.tuck, at) : 0;
      root.pitch = tr.pitch ? sample(tr.pitch, at) % (Math.PI * 2) : 0;
      if (landing.t >= landing.clip.length) landing = null;
    }
    p.bob -= clipDrop;

    // Out of reach: the hips come down until both ankles can be reached
    roll += (THREE.MathUtils.clamp(-turnRate * speed * 0.045, -0.22, 0.22) * (inp.grounded ? 1 : 0) - roll) * damp(6, dt);
    root.roll = roll;
    // A lean into a bend turns about the feet; the roll about the middle of the body
    root.pivot = root.pitch ? 0.45 : 0;
    rootMatrix(inp.x, inp.y, inp.z, inp.face, S, root, m4);
    inv.copy(m4).invert();
    // (only feet on the ground, or about to be, pull the hips down: a swinging foot just reaches as far as it can)
    const bob0 = p.bob;
    // (they rise back up gently once a foot has moved in, never in one jump)
    reachDrop *= 1 - damp(9, dt);
    p.bob -= reachDrop;
    for (let pass = 0; pass < 2; pass++) {
      let need = 0;
      for (let i = 0; i < 2; i++) {
        // (a landing foot counts more the nearer it is to touching down)
        const k = feet[i].stance ? 1 : step(0.55, 1, feet[i].u);
        if (k <= 0) continue;
        hipSpace(feet[i].ankle, i, tmp);
        const r2 = tmp.x * tmp.x + tmp.z * tmp.z;
        const reach = Math.sqrt(Math.max(0, LEG_REACH * LEG_REACH - r2));
        need = Math.max(need, (-tmp.y - reach) * k);
      }
      if (need <= 1e-5) break;
      p.bob = Math.max(bob0 - HIP_DROP, p.bob - need);
    }
    reachDrop = bob0 - p.bob;
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? -1 : 1;
      const l = p.legs[i];
      hipSpace(feet[i].ankle, i, tmp);
      reachLeg(l, s, tmp, p.side);
      // The foot keeps its own heading and pitch in the world, whatever the leg above it does
      qp.setFromEuler(eu.set(root.pitch, inp.face, root.roll, 'YXZ'))
        .multiply(qb.setFromEuler(ex.set(0, p.turn ?? 0, p.side, 'XYZ')))
        .multiply(qb.setFromEuler(ex.set(-l.fwd, 0, s * l.out - p.side, 'XYZ')))
        .multiply(qb.setFromEuler(ex.set(l.bend, 0, 0, 'XYZ')));
      qb.setFromEuler(eu.set(feet[i].pitch, feet[i].heading, 0, 'YXZ'));
      ex.setFromQuaternion(qp.invert().multiply(qb), 'YXZ');
      l.foot = ex.x;
      l.footYaw = ex.y;
      l.footRoll = ex.z;
      l.toe = feet[i].toe;
    }

    // In the air the legs tuck (the leading knee up rising, both reaching down falling); a roll tucks right up
    const rising = THREE.MathUtils.clamp(inp.vy / 4, 0, 1);
    const lead = fz[0] > fz[1] ? 0 : 1;
    const airLegs: [number, number, number][] = [
      [0.35 + 0.45 * rising, 0.05, 0.45 + 0.85 * rising],
      [0.08 - 0.2 * rising, 0.05, 0.35 + 0.3 * rising],
    ];
    const blendLeg = (l: Limb, [fw, o, b]: [number, number, number], k: number, footTo: number) => {
      if (k <= 0) return;
      l.fwd += (fw - l.fwd) * k;
      l.out += (o - l.out) * k;
      l.bend += (b - l.bend) * k;
      l.foot! += (footTo - l.foot!) * k;
      l.toe! += (0 - l.toe!) * k;
      l.footYaw! += (0 - l.footYaw!) * k;
      l.footRoll! += (0 - l.footRoll!) * k;
    };
    for (let i = 0; i < 2; i++) {
      blendLeg(p.legs[i], airLegs[i === lead ? 0 : 1], air, 0.25);
      blendLeg(p.legs[i], [1.9, 0.1, 2.3], tuck, 0.3);
    }
    p.bob = p.bob * (1 - air) + 0.02 * air;

    /* ----- The upper body ----- */
    const armAmp = g.arms * walkness;
    for (let i = 0; i < 2; i++) {
      const a = p.arms[i];
      // Each arm swings with the other foot
      const swing = THREE.MathUtils.clamp(fz[1 - i] / halfStride, -1.2, 1.2) * armAmp;
      a.fwd = 0.03 + g.run * 0.12 * walkness + swing + clipArms;
      a.out = 0.09 + 0.04 * g.run * walkness + 0.45 * air + 0.03 * Math.sin((inp.t * Math.PI * 2) / 3.8) * still;
      a.bend = (0.18 + (g.elbows - 0.18) * walkness) * (1 - air * 0.3) + 0.25 * Math.max(0, swing) + clipElbows + air * 0.35;
      a.twist = 0;
      if (a.wrist) a.wrist = undefined;
      a.fwd += air * (0.3 + 0.5 * rising) * (1 - tuck);
      a.fwd += tuck * (1.2 - a.fwd);
      a.bend += tuck * (1.6 - a.bend);
    }
    const lean = g.lean * Math.min(1, w / 1.2) * Math.sign(fwd || 1) * (fwd < 0 ? 0.4 : 1);
    p.lean = lean + THREE.MathUtils.clamp(accel * 0.03, -0.18, 0.22) * Math.min(1, w + 0.3) + clipLean + 0.012 * Math.sin((inp.t * Math.PI * 2) / 3.8) * still;
    p.twist = -p.turn * 1.3;
    // The head keeps level and looking ahead while the body turns and leans under it (the walk adds where you look)
    p.headYaw = -(p.turn + 0.2 * p.twist);
    p.headPitch = p.lean * 0.3 + clipHead;

    // A slow look round after standing a while
    look = idle > 5 ? (Math.sin(inp.t * 0.31) * 0.5 + Math.sin(inp.t * 0.13 + 1) * 0.25) * Math.min(1, (idle - 5) / 2) : look * (1 - damp(3, dt));

    function hipSpace(worldAnkle: THREE.Vector3, i: number, out: THREE.Vector3) {
      // The world into the figure's numbers, then into the hips' (turned and tilted), from the hip joint
      out.copy(worldAnkle).applyMatrix4(inv);
      out.x -= p.sway ?? 0;
      out.y -= HIP_Y + p.bob;
      out.applyEuler(eu.set(0, -(p.turn ?? 0), 0, 'XYZ'));
      out.applyEuler(eu.set(0, 0, -p.side, 'XYZ'));
      out.x -= (i === 0 ? -1 : 1) * LEG_X;
      return out;
    }
  }

  function near(f: Foot, i: number, inp: LocoInput, S: number) {
    spot(home, i, inp.x, inp.z, inp.face, S, 0, 0, 0);
    return Math.hypot(f.plant.x - home.x, f.plant.z - home.z) < SETTLE * S * 3 && Math.abs(wrap(f.yaw - inp.face)) < TWIST * 0.6;
  }

  /** Touching down: the landing clip by how hard, and both feet planted (or one landing mid-stride on the run) */
  function land(inp: LocoInput, speed: number, dx: number, dz: number) {
    const hit = -fallSpeed;
    const kind = hit > LAND_ROLL && speed > 1.5 ? 'roll' : hit > LAND_CROUCH ? 'crouch' : 'soft';
    landing = { clip: LANDINGS[kind], t: 0 };
    lastLanding = kind;
    const S = inp.scale;
    const T = 2 / g.cadence;
    const stride = speed * g.duty * T;
    for (let i = 0; i < 2; i++) {
      const f = feet[i];
      spot(f.plant, i, inp.x, inp.z, inp.face, S, i === 0 ? stride * g.fore : -stride * (1 - g.fore), dx, dz);
      f.plant.y = inp.ground(f.plant.x, f.plant.z, inp.y + 0.3);
      f.yaw = f.heading = inp.face;
      f.stance = true;
      f.q = i * 0.5;
      f.u = 0;
      f.pitch = f.toe = 0;
      ankleOn(f.ankle, f.plant, f.yaw, 0, S);
    }
    // Foot 0 has just landed; on the run foot 1 pushes off next
    cycle = 0;
    stepping = speed > 0.12;
  }

  return {
    pose,
    root,
    feet,
    get cycle() {
      return cycle;
    },
    set cycle(v: number) {
      cycle = v;
    },
    get phase() {
      return cycle * Math.PI * 2;
    },
    get stepping() {
      return stepping;
    },
    get idle() {
      return idle;
    },
    get look() {
      return look;
    },
    get gait() {
      return g;
    },
    get landed() {
      return lastLanding;
    },
    update,
    reset,
  };
}

/** Copy a pose onto another (a figure's own), every field the locomotion sets */
export function copyPose(from: Pose, to: Pose) {
  to.bob = from.bob;
  to.lean = from.lean;
  to.twist = from.twist;
  to.side = from.side;
  to.sway = from.sway;
  to.turn = from.turn;
  to.headYaw = from.headYaw;
  to.headPitch = from.headPitch;
  to.headRoll = from.headRoll;
  for (let i = 0; i < 2; i++) {
    const a = from.arms[i];
    const b = to.arms[i];
    b.fwd = a.fwd;
    b.out = a.out;
    b.bend = a.bend;
    b.twist = a.twist ?? 0;
    b.wrist = undefined;
    b.reach = undefined;
    copyLeg(from.legs[i], to.legs[i]);
  }
}
/** A leg, with its planted foot */
export function copyLeg(a: Limb, b: Limb) {
  b.fwd = a.fwd;
  b.out = a.out;
  b.bend = a.bend;
  b.twist = 0;
  b.foot = a.foot;
  b.toe = a.toe;
  b.footYaw = a.footYaw;
  b.footRoll = a.footRoll;
}
