/*
 * The mocap pipeline (DOM-free; run at build time by `npm run mocap`,
 * scripts/mocap.mjs, and by tests/mocap.test.ts): captured takes (BVH, in
 * assets/mocap/) retargeted onto Degen's bones as clips (mocap.ts).
 *
 * - The source's first frame is its T-pose. Turned so it faces +z (its
 *   left side, +x, onto the rig's R side: `x is the figure's right` is the
 *   rig's naming, the geometry is what's matched), each target bone is
 *   swung once to lie along its source segment in that pose (`REF`).
 * - Each frame, every target bone takes its source joint's turn since the
 *   T-pose, in the world: G = R(f) R(ref)⁻¹ G(ref). Its local turn is
 *   then its parent's world turn undone. So the motion carries over joint
 *   by joint whatever the two skeletons' proportions.
 * - The hips go where the source's hip joints are (between the thighs),
 *   scaled by the legs' lengths, the floor found from the balls of the
 *   feet; the root is the hips on the ground, smoothed, facing where the
 *   hips face, smoothed more (the pelvis's swing each step stays in the
 *   hips).
 * - Resampled to MOCAP_FPS.
 */
import * as THREE from 'three';
import { type Bvh, type BvhPose, poseBvh, jointIndex } from './bvh';
import { MOCAP_FPS, NB, PARENT, type MoClip, type MoData } from './mocap';
import { ANKLE_H, SHIN_GROUND, THIGH, WRIST_Y, WRIST_Z } from './skeleton';

/** A take to use: the file, what to call the clip, and the seconds of it (after the T-pose) */
export interface Take {
  file: string;
  name: string;
  from?: number;
  to?: number;
  /** Made into a seamless loop of the take's best cycle, this many times round (`loopClip()`) */
  loop?: number;
}

const UP = new THREE.Vector3(0, 1, 0);
/** The rig's legs, hip to ankle, at scale 1 */
const LEG = THIGH + Math.abs(SHIN_GROUND + ANKLE_H);

/**
 * Each body bone: its source joint (cgspeed's CMU names), the joint its
 * segment runs to ('' for the joint's end site, '-' for none: the hips
 * keep the source's own frame; '=' before it: the bone stays level, only
 * turned to the segment's heading, as the feet do: the two skeletons'
 * ankles sit differently over the soles, so a flat foot maps to a flat
 * foot), and which way the bone runs at rest
 */
type Link = [string, string, THREE.Vector3];
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize();
function mapping(): Link[] {
  const out: Link[] = [
    ['Hips', '-', UP],
    ['LowerBack', 'Spine', UP],
    ['Spine', 'Spine1', UP],
    ['Spine1', 'Neck1', UP],
    ['Neck', 'Neck1', UP],
    ['Head', '', UP],
  ];
  // The rig's L side is -x: the source's right
  for (const [src, s] of [
    ['Right', -1],
    ['Left', 1],
  ] as const)
    out.push([`${src}Shoulder`, `${src}Arm`, v(s, 0, 0)], [`${src}Arm`, `${src}ForeArm`, v(0, -1, 0)], [`${src}ForeArm`, `${src}Hand`, v(0, WRIST_Y, WRIST_Z)], [`${src}Hand`, `${src}FingerBase`, v(0, -1, 0)]);
  for (const [src] of [['Right'], ['Left']] as const)
    out.push([`${src}UpLeg`, `${src}Leg`, v(0, -1, 0)], [`${src}Leg`, `${src}Foot`, v(0, -1, 0)], [`${src}Foot`, `=${src}ToeBase`, v(0, 0, 1)], [`${src}ToeBase`, '', v(0, 0, 1)]);
  return out;
}
// (the order above must be MOCAP_BONES': hips, spine, neck, head, the arms L then R, the legs L then R)

const gauss = (xs: number[], sigma: number) => {
  const r = Math.ceil(sigma * 3);
  const w: number[] = [];
  for (let k = -r; k <= r; k++) w.push(Math.exp(-(k * k) / (2 * sigma * sigma)));
  return xs.map((_, i) => {
    let s = 0;
    let sw = 0;
    for (let k = -r; k <= r; k++) {
      const j = Math.min(xs.length - 1, Math.max(0, i + k));
      s += xs[j] * w[k + r];
      sw += w[k + r];
    }
    return s / sw;
  });
};

/** One take retargeted */
export function retarget(b: Bvh, take: Take): MoClip {
  const map = mapping();
  if (map.length !== NB) throw new Error('Mapping and MOCAP_BONES differ');
  const J = map.map(([j]) => jointIndex(b, j));
  const to = map.map(([, c]) => (c === '' || c === '-' ? -1 : jointIndex(b, c.replace('=', ''))));
  const ul = [jointIndex(b, 'LeftUpLeg'), jointIndex(b, 'RightUpLeg')];
  const ankles = [jointIndex(b, 'LeftFoot'), jointIndex(b, 'RightFoot')];

  // The T-pose, turned to face +z (the source's left hip on +x)
  const ref = poseBvh(b, 0);
  const lr = ref.pos[ul[0]].clone().sub(ref.pos[ul[1]]);
  const W = new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(lr.z, lr.x));
  const turn = (p: BvhPose) => {
    for (const x of p.pos) x.applyQuaternion(W);
    for (const q of p.rot) q.premultiply(W);
    return p;
  };
  turn(ref);
  // Each bone's constant: R(ref)⁻¹ G(ref), G(ref) the swing from the bone's rest line onto its source segment
  const C = map.map(([, c, rest], i) => {
    const R = ref.rot[J[i]];
    if (c === '-') return R.clone().invert();
    const j = b.joints[J[i]];
    const dir = c === '' ? (j.end ?? new THREE.Vector3(0, 1, 0)).clone().applyQuaternion(R) : ref.pos[to[i]].clone().sub(ref.pos[J[i]]);
    if (c.startsWith('=')) dir.y = 0;
    const G = new THREE.Quaternion().setFromUnitVectors(rest, dir.normalize());
    return R.clone().invert().multiply(G);
  });
  // The scale: the rig's legs over the source's
  const seg = (a: string, c: string) => ref.pos[jointIndex(b, c)].distanceTo(ref.pos[jointIndex(b, a)]);
  const k = LEG / ((seg('LeftUpLeg', 'LeftLeg') + seg('LeftLeg', 'LeftFoot') + seg('RightUpLeg', 'RightLeg') + seg('RightLeg', 'RightFoot')) / 2);

  // The frames to keep (after the T-pose), at MOCAP_FPS
  const src = 1 / b.frameTime;
  const first = 1 + Math.round((take.from ?? 0) * src);
  const last = Math.min(b.frames.length - 1, take.to === undefined ? b.frames.length - 1 : 1 + Math.round(take.to * src));
  const picks: number[] = [];
  for (let t = 0; first + Math.round(t * src) <= last; t += 1 / MOCAP_FPS) picks.push(first + Math.round(t * src));
  const n = picks.length;

  // Every source frame we keep, posed and turned
  const poses = picks.map((f) => turn(poseBvh(b, f)));
  // The floor: low down among the ankles, where the rig's ankles stand ANKLE_H over the ground
  const lows = poses.map((p) => Math.min(p.pos[ankles[0]].y, p.pos[ankles[1]].y)).sort((a, c) => a - c);
  const floor = lows[Math.floor(lows.length * 0.03)];

  const G = map.map(() => new THREE.Quaternion());
  const hipsW: THREE.Vector3[] = [];
  const hipsR: THREE.Quaternion[] = [];
  const locals: Float32Array = new Float32Array(n * NB * 4);
  for (let f = 0; f < n; f++) {
    const p = poses[f];
    for (let i = 0; i < NB; i++) G[i].copy(p.rot[J[i]]).multiply(C[i]);
    for (let i = 1; i < NB; i++) {
      const l = G[PARENT[i]].clone().invert().multiply(G[i]);
      l.toArray(locals, f * NB * 4 + i * 4);
    }
    hipsR.push(G[0].clone());
    const mid = p.pos[ul[0]].clone().add(p.pos[ul[1]]).multiplyScalar(0.5);
    hipsW.push(new THREE.Vector3(mid.x * k, (mid.y - floor) * k + ANKLE_H, mid.z * k));
  }
  // The root: the hips on the ground, smoothed; facing where the hips face, smoothed more
  const sig = (s: number) => s * MOCAP_FPS;
  const rx = gauss(hipsW.map((h) => h.x), sig(0.12));
  const rz = gauss(hipsW.map((h) => h.z), sig(0.12));
  const fwd = new THREE.Vector3();
  const yaws: number[] = [];
  for (let f = 0; f < n; f++) {
    fwd.set(0, 0, 1).applyQuaternion(hipsR[f]);
    let y = Math.atan2(fwd.x, fwd.z);
    // (unwrapped, so the smoothing never averages across ±π)
    if (f) while (y - yaws[f - 1] > Math.PI) y -= Math.PI * 2;
    if (f) while (y - yaws[f - 1] < -Math.PI) y += Math.PI * 2;
    yaws.push(y);
  }
  const ry = gauss(yaws, sig(0.2));

  const root = new Float32Array(n * 3);
  const hips = new Float32Array(n * 3);
  const qy = new THREE.Quaternion();
  const d = new THREE.Vector3();
  for (let f = 0; f < n; f++) {
    root[f * 3] = rx[f];
    root[f * 3 + 1] = rz[f];
    root[f * 3 + 2] = ry[f];
    qy.setFromAxisAngle(UP, -ry[f]);
    d.set(hipsW[f].x - rx[f], hipsW[f].y, hipsW[f].z - rz[f]).applyQuaternion(qy);
    d.toArray(hips, f * 3);
    qy.multiply(hipsR[f]).toArray(locals, f * NB * 4);
  }
  const clip = { name: take.name, frames: n, root, hips, rot: locals };
  return take.loop ? loopClip(clip, take.loop) : clip;
}

const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
/** How far apart two frames' poses are: every bone's turn (radians²) and the hips' height */
function poseGap(c: MoClip, a: number, b: number) {
  let s = 0;
  for (let i = 0; i < NB; i++) {
    qa.fromArray(c.rot, (a * NB + i) * 4);
    qb.fromArray(c.rot, (b * NB + i) * 4);
    s += qa.angleTo(qb) ** 2;
  }
  return s + 100 * (c.hips[a * 3 + 1] - c.hips[b * 3 + 1]) ** 2;
}

/**
 * The clip's best cycle (a and b alike, and the frames after them, so the
 * velocities match too; 0.5 to 1 s long), straightened onto +z at its
 * average speed, the seam's difference spread over the cycle, `times` round
 */
export function loopClip(c: MoClip, times: number): MoClip {
  const minLen = Math.round(0.5 * MOCAP_FPS);
  const maxLen = Math.round(1 * MOCAP_FPS);
  let best = [0, 0];
  let bestGap = Infinity;
  for (let a = 0; a + minLen < c.frames - 1; a++)
    for (let b = a + minLen; b <= Math.min(c.frames - 2, a + maxLen); b++) {
      const g = poseGap(c, a, b) + poseGap(c, a + 1, b + 1);
      if (g < bestGap) {
        bestGap = g;
        best = [a, b];
      }
    }
  const [a, b] = best;
  const L = b - a;
  // Everything in the clip's world, then turned so the cycle runs along +z from 0
  const R = (y: number) => qa.setFromAxisAngle(UP, y);
  const ra = new THREE.Vector3(c.root[a * 3], 0, c.root[a * 3 + 1]);
  const along = new THREE.Vector3(c.root[b * 3], 0, c.root[b * 3 + 1]).sub(ra);
  const theta = Math.atan2(along.x, along.z);
  const speed = along.length() / L;
  const turnBack = new THREE.Quaternion().setFromAxisAngle(UP, -theta);
  const hipsAt: THREE.Vector3[] = [];
  const hipsRot: THREE.Quaternion[] = [];
  for (let i = a; i <= b; i++) {
    const w = new THREE.Vector3(c.hips[i * 3], c.hips[i * 3 + 1], c.hips[i * 3 + 2]).applyQuaternion(R(c.root[i * 3 + 2]));
    w.x += c.root[i * 3] - ra.x;
    w.z += c.root[i * 3 + 1] - ra.z;
    w.applyQuaternion(turnBack);
    w.z -= speed * (i - a);
    hipsAt.push(w);
    hipsRot.push(turnBack.clone().multiply(R(c.root[i * 3 + 2]).clone().multiply(qb.fromArray(c.rot, i * NB * 4))));
  }
  // The seam: what frame b differs from frame a by, taken out a share at a time
  const gaps = Array.from({ length: NB }, (_, i) => {
    const qa0 = i === 0 ? hipsRot[0].clone() : new THREE.Quaternion().fromArray(c.rot, (a * NB + i) * 4);
    const qb0 = i === 0 ? hipsRot[L].clone() : new THREE.Quaternion().fromArray(c.rot, (b * NB + i) * 4);
    return qb0.multiply(qa0.invert());
  });
  const hipGap = hipsAt[L].clone().sub(hipsAt[0]);
  const frames = L * times;
  const root = new Float32Array(frames * 3);
  const hips = new Float32Array(frames * 3);
  const rot = new Float32Array(frames * NB * 4);
  const id = new THREE.Quaternion();
  const ramp = new THREE.Quaternion();
  for (let k = 0; k < frames; k++) {
    const i = k % L;
    const u = i / L;
    root[k * 3 + 1] = speed * k;
    hipsAt[i].clone().addScaledVector(hipGap, -u).toArray(hips, k * 3);
    for (let n = 0; n < NB; n++) {
      const q = n === 0 ? hipsRot[i].clone() : new THREE.Quaternion().fromArray(c.rot, ((a + i) * NB + n) * 4);
      ramp.copy(id).slerp(gaps[n].clone().invert(), u);
      ramp.multiply(q).normalize().toArray(rot, (k * NB + n) * 4);
    }
  }
  return { name: c.name, frames, root, hips, rot };
}

/** Every take, read by `read(file)` */
export function buildMocap(takes: Take[], read: (file: string) => Bvh): MoData {
  return { fps: MOCAP_FPS, clips: takes.map((t) => retarget(read(t.file), t)) };
}
