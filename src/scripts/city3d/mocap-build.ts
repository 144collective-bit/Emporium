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
import { MB, MOCAP_FPS, NB, PARENT, type MoClip, type MoData } from './mocap';
import { ANKLE_H, SHIN_GROUND, THIGH, WRIST_Y, WRIST_Z } from './skeleton';

/** A take to use: the file, what to call the clip, and the seconds of it (after the T-pose) */
export interface Take {
  file: string;
  name: string;
  from?: number;
  to?: number;
  /** Made into a seamless loop of the take's best cycle, this many times round (`loopClip()`) */
  loop?: number;
  /** The loop's cycle, shortest and longest (seconds; a step's 0.5 to 1 if not said: standing still breathes slower) */
  cycle?: [number, number];
  /**
   * The take's real frame rate, where its file says otherwise: cgspeed's
   * conversion writes 120 for every file, but subject 143 was captured at
   * 60 (played at 120 he walks at 3.3 steps a second and runs at 6)
   */
  fps?: number;
  /**
   * How much lower the take stands than its floor finds it (rig numbers):
   * where the capture's planted feet sit a little high over the ankles'
   * low point (subject 136's), so the feet are found on the ground
   */
  sink?: number;
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
    out.push([`${src}Shoulder`, `=${src}Arm`, v(s, 0, 0)], [`${src}Arm`, `${src}ForeArm`, v(0, -1, 0)], [`${src}ForeArm`, `${src}Hand`, v(0, WRIST_Y, WRIST_Z)], [`${src}Hand`, `${src}HandIndex1`, v(0, -1, 0)]);
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
  const src = take.fps ?? 1 / b.frameTime;
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
    hipsW.push(new THREE.Vector3(mid.x * k, (mid.y - floor) * k + ANKLE_H - (take.sink ?? 0), mid.z * k));
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
  despike(locals, n);
  calmHands(locals, n);
  calmToes(locals, n);
  const clip = { name: take.name, frames: n, root, hips, rot: locals };
  return take.loop ? loopClip(clip, take.loop, take.cycle) : clip;
}

/**
 * The capture's hands: CMU's hand joint has few markers, so its turn about
 * the forearm jumps about (up to 40° in one frame, 75° off the forearm in
 * a walk). Each hand keeps `twist` of it and `bend` of the rest, smoothed
 * over `sigma` seconds and held inside `most` radians: a relaxed hand that
 * follows the forearm.
 */
export const HANDS = { twist: 0.35, bend: 0.6, sigma: 0.12, most: 0.4 };
/**
 * The capture's glitches: a bone that jumps away for a frame and straight
 * back (`walk-eight`'s spine, chest and neck threw 24-49° for one frame) is
 * put back between its neighbours. A frame is one when it's at least `jump`
 * radians from both and they're within `back` of that of each other
 */
export const SPIKE = { jump: 0.14, back: 0.5 };
/** The toes: CMU's toe markers are the noisiest, so the toes are smoothed over `sigma` seconds */
export const TOES = { sigma: 0.03 };
const qs1 = new THREE.Quaternion();
const qs2 = new THREE.Quaternion();
const qs3 = new THREE.Quaternion();
function despike(rot: Float32Array, n: number) {
  for (let pass = 0; pass < 2; pass++)
    for (let b = 0; b < NB; b++)
      for (let f = 1; f < n - 1; f++) {
        qs1.fromArray(rot, ((f - 1) * NB + b) * 4);
        qs2.fromArray(rot, (f * NB + b) * 4);
        qs3.fromArray(rot, ((f + 1) * NB + b) * 4);
        const a = qs1.angleTo(qs2);
        const c = qs2.angleTo(qs3);
        if (a > SPIKE.jump && c > SPIKE.jump && qs1.angleTo(qs3) < SPIKE.back * Math.min(a, c)) qs1.slerp(qs3, 0.5).toArray(rot, (f * NB + b) * 4);
      }
}
function calmToes(rot: Float32Array, n: number) {
  const s = TOES.sigma * MOCAP_FPS;
  const q = new THREE.Quaternion();
  for (const b of [MB.toeL, MB.toeR]) {
    // (each frame's quaternion on the same side as the last, so the averages never cancel)
    const ch = [[], [], [], []] as number[][];
    let px = 0;
    let py = 0;
    let pz = 0;
    let pw = 1;
    for (let f = 0; f < n; f++) {
      q.fromArray(rot, (f * NB + b) * 4);
      if (q.x * px + q.y * py + q.z * pz + q.w * pw < 0) q.set(-q.x, -q.y, -q.z, -q.w);
      ({ x: px, y: py, z: pz, w: pw } = q);
      ch[0].push(q.x);
      ch[1].push(q.y);
      ch[2].push(q.z);
      ch[3].push(q.w);
    }
    const [sx, sy, sz, sw] = ch.map((c) => gauss(c, s));
    for (let f = 0; f < n; f++) q.set(sx[f], sy[f], sz[f], sw[f]).normalize().toArray(rot, (f * NB + b) * 4);
  }
}
const HAND_BONES = [MB.handL, MB.handR];
function calmHands(rot: Float32Array, n: number) {
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (const b of HAND_BONES) {
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    for (let f = 0; f < n; f++) {
      e.setFromQuaternion(q.fromArray(rot, (f * NB + b) * 4), 'YXZ');
      xs.push(e.x);
      // (unwrapped, so the smoothing never averages across ±π)
      let y = e.y;
      if (f) while (y - ys[f - 1] > Math.PI) y -= Math.PI * 2;
      if (f) while (y - ys[f - 1] < -Math.PI) y += Math.PI * 2;
      ys.push(y);
      zs.push(e.z);
    }
    const s = HANDS.sigma * MOCAP_FPS;
    const [sx, sy, sz] = [gauss(xs, s), gauss(ys, s), gauss(zs, s)];
    const clamp = (a: number) => THREE.MathUtils.clamp(a, -HANDS.most, HANDS.most);
    for (let f = 0; f < n; f++) {
      e.set(clamp(sx[f] * HANDS.bend), clamp(sy[f] * HANDS.twist), clamp(sz[f] * HANDS.bend), 'YXZ');
      q.setFromEuler(e).toArray(rot, (f * NB + b) * 4);
    }
  }
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
 * velocities match too; `cycle` seconds long), straightened onto +z at its
 * average speed (standing still: facing +z as at its start), the seam's
 * difference spread over the cycle, `times` round
 */
export function loopClip(c: MoClip, times: number, cycle: [number, number] = [0.5, 1]): MoClip {
  const minLen = Math.round(cycle[0] * MOCAP_FPS);
  const maxLen = Math.round(cycle[1] * MOCAP_FPS);
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
  const speed = along.length() / L;
  // (standing still the way it goes is nowhere: the way it faces)
  const theta = speed * MOCAP_FPS < 0.05 ? c.root[a * 3 + 2] : Math.atan2(along.x, along.z);
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
