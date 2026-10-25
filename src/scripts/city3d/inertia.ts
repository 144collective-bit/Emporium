/*
 * Springs and inertialization (DOM-free, tested in tests/inertia.test.ts),
 * after Daniel Holden's "Spring-It-On" and his inertialization notes:
 *
 * - Critically damped springs given by their half-life (the time to close
 *   half the gap): `decay()` eases an offset and its velocity to nothing,
 *   `springVel()` takes a velocity towards a goal (and `springAhead()`
 *   says where that leaves you `t` from now, for the trajectory), and
 *   `springAngle()` does the same for a heading.
 * - Inertialization: when an animation jumps to another frame, the
 *   difference between what was showing and the new frame (each bone's
 *   turn and the hips' place, with their velocities) becomes an offset
 *   that decays to nothing. Nothing pops, and there's no cross-fade to
 *   pay for: only the new animation is sampled.
 */
import * as THREE from 'three';

const LN2 = Math.log(2);
/** The spring's rate (half its damping) for a half-life */
export const rate = (halflife: number) => (2 * LN2) / Math.max(halflife, 1e-5);

/** An offset `x` with velocity `v` decayed over `dt`: returns [x, v] in place on a vector or a number */
export function decay(x: number, v: number, halflife: number, dt: number): [number, number] {
  const y = rate(halflife);
  const j1 = v + x * y;
  const e = Math.exp(-y * dt);
  return [e * (x + j1 * dt), e * (v - j1 * y * dt)];
}

/** A velocity `v` (and its acceleration `a`) after `dt` heading for `goal` */
export function springVel(v: number, a: number, goal: number, halflife: number, dt: number): [number, number] {
  const y = rate(halflife);
  const j0 = v - goal;
  const j1 = a + j0 * y;
  const e = Math.exp(-y * dt);
  return [e * (j0 + j1 * dt) + goal, e * (a - j1 * y * dt)];
}

/** How far that velocity spring carries you in the next `t` seconds */
export function springAhead(v: number, a: number, goal: number, halflife: number, t: number) {
  const y = rate(halflife);
  const j0 = v - goal;
  const j1 = a + j0 * y;
  const e = Math.exp(-y * t);
  return e * (-j1 / (y * y) + (-j0 - j1 * t) / y) + j1 / (y * y) + j0 / y + goal * t;
}

export const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** A heading `yaw` (with its turn rate `w`) after `dt` heading for `goal`; [yaw, w] */
export function springAngle(yaw: number, w: number, goal: number, halflife: number, dt: number): [number, number] {
  const y = rate(halflife);
  const j0 = wrap(yaw - goal);
  const j1 = w + j0 * y;
  const e = Math.exp(-y * dt);
  return [goal + e * (j0 + j1 * dt), e * (w - j1 * y * dt)];
}

/* ---------- Turns as vectors ---------- */

/** A turn as a vector: its axis times its angle (the short way round) */
export function logQ(q: THREE.Quaternion, out: THREE.Vector3) {
  let { x, y, z, w } = q;
  if (w < 0) {
    x = -x;
    y = -y;
    z = -z;
    w = -w;
  }
  const s = Math.hypot(x, y, z);
  if (s < 1e-8) return out.set(2 * x, 2 * y, 2 * z);
  const angle = 2 * Math.atan2(s, w);
  return out.set((x / s) * angle, (y / s) * angle, (z / s) * angle);
}
export function expQ(v: THREE.Vector3, out: THREE.Quaternion) {
  const angle = v.length();
  if (angle < 1e-8) return out.set(v.x / 2, v.y / 2, v.z / 2, 1).normalize();
  const s = Math.sin(angle / 2) / angle;
  return out.set(v.x * s, v.y * s, v.z * s, Math.cos(angle / 2));
}

/* ---------- Inertialization ---------- */

const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();

/**
 * Offsets for `n` bones and the hips' place, decaying with `halflife`
 * (a bone's own times `slow[b]`: the head and neck take longer, so a cut
 * never whips the head). `jump()` when the animation changes frame;
 * `step()` each frame; `apply()` puts the offsets on the animation's pose.
 */
export function createInertia(n: number, halflife = 0.1) {
  const rot = Array.from({ length: n }, () => new THREE.Vector3());
  const av = Array.from({ length: n }, () => new THREE.Vector3());
  const pos = new THREE.Vector3();
  const vel = new THREE.Vector3();
  const slow = new Float32Array(n).fill(1);
  return {
    halflife,
    slow,
    rot,
    pos,
    /**
     * From `src` (the pose that was showing before its offsets, turns as
     * x, y, z, w per bone, with each bone's angular velocity and the hips'
     * place and velocity) to `dst` (the new frame's)
     */
    jump(src: ArrayLike<number>, srcAv: THREE.Vector3[], srcHips: THREE.Vector3, srcHipsVel: THREE.Vector3, dst: ArrayLike<number>, dstAv: THREE.Vector3[], dstHips: THREE.Vector3, dstHipsVel: THREE.Vector3) {
      for (let b = 0; b < n; b++) {
        // What was showing: the old offset on the old pose, then what's left for the new one
        expQ(rot[b], qa).multiply(qb.set(src[b * 4], src[b * 4 + 1], src[b * 4 + 2], src[b * 4 + 3]));
        qa.multiply(qb.set(dst[b * 4], dst[b * 4 + 1], dst[b * 4 + 2], dst[b * 4 + 3]).invert());
        logQ(qa, rot[b]);
        av[b].add(srcAv[b]).sub(dstAv[b]);
      }
      pos.add(srcHips).sub(dstHips);
      vel.add(srcHipsVel).sub(dstHipsVel);
    },
    step(dt: number) {
      const h0 = this.halflife;
      for (let b = 0; b < n; b++) {
        const r = rot[b];
        const w = av[b];
        const h = h0 * slow[b];
        let x: number;
        let v: number;
        [x, v] = decay(r.x, w.x, h, dt);
        r.x = x;
        w.x = v;
        [x, v] = decay(r.y, w.y, h, dt);
        r.y = x;
        w.y = v;
        [x, v] = decay(r.z, w.z, h, dt);
        r.z = x;
        w.z = v;
      }
      for (const k of ['x', 'y', 'z'] as const) {
        const [x, v] = decay(pos[k], vel[k], h0, dt);
        pos[k] = x;
        vel[k] = v;
      }
    },
    /** The offsets on a pose, in place */
    apply(turns: Float32Array, hips: THREE.Vector3) {
      for (let b = 0; b < n; b++) {
        if (rot[b].lengthSq() < 1e-12) continue;
        expQ(rot[b], qa).multiply(qb.set(turns[b * 4], turns[b * 4 + 1], turns[b * 4 + 2], turns[b * 4 + 3]));
        qa.normalize().toArray(turns, b * 4);
      }
      hips.add(pos);
    },
    /** Everything back to nothing (a fresh start) */
    reset() {
      for (const r of rot) r.set(0, 0, 0);
      for (const w of av) w.set(0, 0, 0);
      pos.set(0, 0, 0);
      vel.set(0, 0, 0);
    },
    /** The biggest turn still to make up (radians), for the lab */
    get left() {
      let m = 0;
      for (const r of rot) m = Math.max(m, r.length());
      return m;
    },
  };
}
export type Inertia = ReturnType<typeof createInertia>;

/** A turn's angular velocity between two frames `dt` apart (as a vector, in the parent's frame) */
export function angVel(a: ArrayLike<number>, ai: number, b: ArrayLike<number>, bi: number, dt: number, out: THREE.Vector3) {
  qa.set(b[bi], b[bi + 1], b[bi + 2], b[bi + 3]).multiply(qb.set(a[ai], a[ai + 1], a[ai + 2], a[ai + 3]).invert());
  return logQ(qa, out).multiplyScalar(1 / dt);
}
