/*
 * The crowd's moves, baked (character rebuild Phase 5; DOM-free, tested in
 * tests/crowdclips.test.ts). Every person in a crowd is the skinned body
 * drawn instanced, and the GPU skins them from one texture of bone matrices
 * (crowdskin.ts): each clip below is sampled into rows of it, one row a
 * frame, each row every bone's matrix (posed world x the bind pose's
 * inverse) in the figure's own space at scale 1.
 *
 * - **walk**, **walk2** and **jog** are captured (the animation revamp's
 *   Phase 5, docs/animation-revamp-plan.md): one seamless cycle each of
 *   subject 143's walk (two different cycles) and run, the crowd pack
 *   (`clips-crowd.bin`, takes.json's `pack: "crowd"`, fetched at the boot:
 *   `setCrowdCapture()`; until it's in, and without it, the planted-feet
 *   walk (locomotion.ts) recorded over one cycle stands in). A person plays
 *   a walk at the rate their own speed calls for (`strideOf()`: the distance
 *   one cycle covers at scale 1), so their feet stay put on the pavement.
 *   **march** is the recorded walk still (no march was captured), the rifle
 *   arm kept still and the free arm swinging straight.
 * - **idle**, **idle2** and **idle3** are three captured stretches of subject
 *   137 waiting (real weight shifts, a look round), each looped with its tail
 *   crossfaded into its head; a person is given one (`idleFor()`) and plays
 *   it at its own length (`secondsOf()`). The formula idle stands in.
 * - **look**, **chat**, **sit** and **picnic** (sitting on the ground, legs
 *   out) are the pose formulas (poses.ts) over a few seconds, the last part
 *   eased into the first so the loop has no seam.
 * - **salute** isn't a loop: its frames go from attention (0) to the hand at
 *   the brow (1).
 *
 * The rows' layout is fixed whatever the capture holds (each clip's frames
 * below), so the texture is swapped in place when the pack arrives.
 *
 * A person's clip and how far through it they are (`u`, 0..1) is all the
 * CPU works out each frame (`crowdFrame()`); 34 bones each is the GPU's.
 */
import * as THREE from 'three';
import { BONES, NECK_SHARE, SPINE_SHARE, makeSkeleton, newPose, poseSkeleton, reachArm, type Limb, type Pose, type Skeleton } from './skeleton';
import { HURRY, PHONE, PHONE_GLANCE_YAW, kerbLook, phoneGlance } from './pedestrians';
import { copyPose, createLocomotion } from './locomotion';
import { attentionPose, chatPose, idlePose, lookPose, picnicPose, set, sitPose } from './poses';
import { baked as atBuild } from './baked';
import { MOCAP_BONES, MOCAP_FPS, NB, type MoClip, type MoData } from './mocap';

export type CrowdClip = 'walk' | 'walk2' | 'jog' | 'march' | 'hurry' | 'phonewalk' | 'idle' | 'idle2' | 'idle3' | 'wait' | 'phone' | 'look' | 'chat' | 'sit' | 'picnic' | 'salute';

interface ClipDef {
  frames: number;
  loop: boolean;
  /** How closed the hands are (a soldier's round his rifle), or each hand's (arms[0]'s, arms[1]'s) */
  grip: number | [number, number];
  /** The pose `u` (0..1) of the way through (the fallback, where there's a capture) */
  sample(u: number, out: Pose): void;
  /** From the crowd pack: the take (a loop take plays whole; an idle's `tail` seconds are crossfaded into its head) */
  capture?: { take: string; tail?: number };
  /**
   * Keyed over the row (the revamp's Phase 6): `sec` seconds into the loop, what the pose adds (the head's yaw and
   * pitch, the spine's lean, and the arms where `arms` is set (both, or the right one, arms[1]): they replace the
   * row's), over the capture's bones as over the formula's; with `head` the pose's head replaces the row's
   * instead of turning it further (someone reading a phone keeps it there whatever the take looked at)
   */
  over?: (sec: number, p: Pose) => void;
  arms?: 'both' | 'right';
  head?: boolean;
}
/** A row's grip for each hand */
const grips = (g: number | [number, number]): [number, number] => (typeof g === 'number' ? [g, g] : g);

/* ---------- The capture ---------- */

/** The crowd pack's clips (mocap-load.ts `loadMocap('crowd')`), once they're in */
let capture: MoData | null = null;
/** The crowd pack arrived (or went): the rows are baked again from it (`bakeCrowdClips()`; crowdskin.ts swaps the texture) */
export function setCrowdCapture(d: MoData | null) {
  capture = d;
  baked = null;
  for (const id of CLIP_IDS) {
    const c = captureOf(id);
    if (!c) continue;
    const d = CLIP_DEFS[id];
    if (d.capture?.tail !== undefined) SECONDS[id] = (c.frames - Math.round(d.capture.tail * MOCAP_FPS)) / MOCAP_FPS;
    else if (id in STRIDE) STRIDE[id as keyof typeof STRIDE] = (c.root[4] - c.root[1]) * c.frames;
  }
}
export const crowdCaptured = () => !!capture;
const captureOf = (id: CrowdClip): MoClip | null => {
  const t = CLIP_DEFS[id].capture?.take;
  return t ? (capture?.clips.find((c) => c.name === t) ?? null) : null;
};

/** Hands at rest, and round a rifle */
const RELAXED = 0.2;
const RIFLE = 0.62;
/** A formula's loop: seconds long, the last share of it eased into its start */
const WINDOW = 24;
/** How long the idle, look, chat and sit loops are: a person plays `t / CLIP_SECONDS` (plus their own offset) */
export const CLIP_SECONDS = WINDOW;
const SEAM = 0.2;

/* ---------- Poses ---------- */

const NAMES = ['bob', 'lean', 'twist', 'side', 'headYaw', 'headPitch', 'sway', 'turn'] as const;
const LIMB = ['fwd', 'out', 'bend', 'twist', 'foot', 'toe', 'footYaw', 'footRoll'] as const;
/** `out` = `a` eased towards `b` by `k`, every number a pose carries */
export function lerpPose(a: Pose, b: Pose, k: number, out: Pose) {
  for (const n of NAMES) (out as unknown as Record<string, number>)[n] = THREE.MathUtils.lerp(a[n] ?? 0, b[n] ?? 0, k);
  const limb = (x: Limb, y: Limb, o: Limb) => {
    for (const n of LIMB) {
      if (x[n] === undefined && y[n] === undefined) {
        if (n !== 'fwd' && n !== 'out' && n !== 'bend') o[n] = undefined;
        continue;
      }
      o[n] = THREE.MathUtils.lerp(x[n] ?? 0, y[n] ?? 0, k);
    }
    o.wrist = undefined;
    o.reach = undefined;
  };
  for (let i = 0; i < 2; i++) {
    limb(a.arms[i], b.arms[i], out.arms[i]);
    limb(a.legs[i], b.legs[i], out.legs[i]);
  }
  return out;
}
const fresh = () => {
  const p = newPose();
  p.sway = p.turn = 0;
  return p;
};

/** A formula over `WINDOW` seconds whose end eases into its start: seamless as a loop */
function looped(f: (p: Pose, t: number) => void): ClipDef['sample'] {
  const a = fresh();
  const b = fresh();
  return (u, out) => {
    const t = u * WINDOW;
    f(a, t);
    const k = THREE.MathUtils.smoothstep(u, 1 - SEAM, 1);
    if (k <= 0) return copyPose(a, out);
    // Towards where the loop starts again: the same formula one window earlier
    f(b, t - WINDOW);
    lerpPose(a, b, k, out);
  };
}

/**
 * The planted-feet walk at a steady `speed` (figure lengths a second, scale
 * 1), recorded over one full cycle (two steps). Returns the frames and how
 * far one cycle goes.
 */
function recordWalk(speed: number, frames: number) {
  const loco = createLocomotion();
  const dt = 1 / 240;
  let z = 0;
  let t = 0;
  const step = () => {
    z += speed * dt;
    t += dt;
    loco.update({ dt, t, x: 0, y: 0, z, vx: 0, vz: speed, face: 0, grounded: true, vy: 0, scale: 1, ground: () => 0, armed: false });
  };
  // Into its stride first, then one full cycle from a wrap of the left foot's phase
  for (let k = 0; k < 240 * 6; k++) step();
  let last = loco.cycle;
  while (!(loco.cycle < last)) {
    last = loco.cycle;
    step();
  }
  const start = z;
  const out: Pose[] = [];
  for (let f = 0; f < frames; f++) {
    // On to this frame's share of the cycle (the cycle only goes forward)
    let guard = 0;
    while (loco.cycle < f / frames && guard++ < 2400) step();
    const p = fresh();
    copyPose(loco.pose, p);
    out.push(p);
  }
  // On round to the next wrap: the whole cycle's distance
  last = loco.cycle;
  while (!(loco.cycle < last)) {
    last = loco.cycle;
    step();
  }
  return { poses: out, stride: z - start };
}

/** Pedestrians stroll at about this (0.55 tiles a second at their 0.66 scale), joggers jog at this (1.7), soldiers march at about this */
const WALK_SPEED = 0.83;
const JOG_SPEED = 2.6;
const MARCH_SPEED = 0.5;
// (recorded when the site is built: baked.ts)
const walk = atBuild('walk-cycle', () => recordWalk(WALK_SPEED, 32));
const jog = atBuild('jog-cycle', () => recordWalk(JOG_SPEED, 24));
const march = atBuild('march-cycle', () => recordWalk(MARCH_SPEED, 32));
/** How far one walk (or march) cycle goes at scale 1: a person at scale s and speed v plays v / (STRIDE s) cycles a second */
export const WALK_STRIDE = walk.stride;
export const JOG_STRIDE = jog.stride;
export const MARCH_STRIDE = march.stride;

/** From a recorded cycle: frame `u` (the recording already loops) */
const recorded = (poses: Pose[], after?: (p: Pose) => void): ClipDef['sample'] => (u, out) => {
  copyPose(poses[Math.min(poses.length - 1, Math.floor(u * poses.length))], out);
  after?.(out);
};

/** A captured idle: its last `IDLE_TAIL` seconds crossfaded into its first, so it loops */
const IDLE_TAIL = 0.8;
/** The hurry over the walk (the chest forward, the head down, the arms held in) */
function hurryOver(_sec: number, p: Pose) {
  p.lean += HURRY.lean;
  p.headPitch += HURRY.headPitch;
  for (const a of p.arms) {
    a.fwd = HURRY.arm.fwd;
    a.out = HURRY.arm.out;
    a.bend = HURRY.arm.bend;
    a.twist = 0;
    a.wrist = undefined;
    a.reach = undefined;
  }
}
/** The phone in the right hand (pedestrians.ts `PHONE`): the hand brought to it, the head down at it; standing, a glance up and round once a loop */
const PHONE_AT = new THREE.Vector3(...PHONE.at);
function phoneOver(sec: number, p: Pose, walking: boolean) {
  const up = walking ? 0 : phoneGlance(sec);
  p.headPitch = (walking ? PHONE.walkPitch : PHONE.headPitch) * (1 - up);
  p.headYaw = PHONE_GLANCE_YAW * up;
  reachArm(p, 1, PHONE_AT);
  p.arms[1].wrist = { ...PHONE.wrist };
}
export const CLIP_DEFS: Record<CrowdClip, ClipDef> = {
  walk: { frames: 30, loop: true, grip: RELAXED, sample: recorded(walk.poses), capture: { take: 'crowd-walk' } },
  walk2: { frames: 30, loop: true, grip: RELAXED, sample: recorded(walk.poses), capture: { take: 'crowd-walk-2' } },
  jog: { frames: 24, loop: true, grip: 0.5, sample: recorded(jog.poses), capture: { take: 'crowd-run' } },
  // On parade: the rifle arm (right) still, the free arm swinging straight
  march: {
    frames: march.poses.length,
    loop: true,
    grip: RIFLE,
    sample: recorded(march.poses, (p) => {
      set(p.arms[1], 0.05, 0.1, 0.35);
      p.arms[0].fwd *= 1.3;
      p.arms[0].bend = 0.12;
      p.turn = (p.turn ?? 0) * 0.4;
    }),
  },
  // The rain's hurry (pedestrians.ts `HURRY`): the walk with the head down, the shoulders in and the arms tucked
  hurry: { frames: 30, loop: true, grip: HURRY.grip, sample: recorded(walk.poses), capture: { take: 'crowd-walk' }, over: hurryOver, arms: 'both' },
  // Walking reading a phone (pedestrians.ts `PHONE`): the walk with the right hand at the phone and the head down at it
  phonewalk: { frames: 30, loop: true, grip: [RELAXED, PHONE.grip], sample: recorded(walk.poses), capture: { take: 'crowd-walk' }, over: (sec, p) => phoneOver(sec, p, true), arms: 'right', head: true },
  idle: { frames: 80, loop: true, grip: RELAXED, sample: looped((p, t) => idlePose(p, t)), capture: { take: 'crowd-idle', tail: IDLE_TAIL } },
  idle2: { frames: 60, loop: true, grip: RELAXED, sample: looped((p, t) => idlePose(p, t + 8)), capture: { take: 'crowd-idle-2', tail: IDLE_TAIL } },
  idle3: { frames: 45, loop: true, grip: RELAXED, sample: looped((p, t) => idlePose(p, t + 16)), capture: { take: 'crowd-idle-3', tail: IDLE_TAIL } },
  // Waiting at a kerb: the second idle with a look both ways keyed over it (pedestrians.ts `kerbLook()`)
  wait: { frames: 60, loop: true, grip: RELAXED, sample: looped((p, t) => idlePose(p, t + 8)), capture: { take: 'crowd-idle-2', tail: IDLE_TAIL }, over: (sec, p) => (p.headYaw += kerbLook(sec)) },
  // Standing reading a phone: the third idle (its hands still) with the phone hand and the head keyed over it, a glance up once a loop
  phone: { frames: 45, loop: true, grip: [RELAXED, PHONE.grip], sample: looped((p, t) => idlePose(p, t + 16)), capture: { take: 'crowd-idle-3', tail: IDLE_TAIL }, over: (sec, p) => phoneOver(sec, p, false), arms: 'right', head: true },
  look: { frames: 192, loop: true, grip: RELAXED, sample: looped((p, t) => lookPose(p, t)) },
  chat: { frames: 192, loop: true, grip: RELAXED, sample: looped((p, t) => chatPose(p, t)) },
  sit: { frames: 144, loop: true, grip: RELAXED, sample: looped((p, t) => sitPose(p, t)) },
  picnic: { frames: 144, loop: true, grip: RELAXED, sample: looped((p, t) => picnicPose(p, t)) },
  // Attention (0) to the free hand at the brow (1), the rifle in the left hand
  salute: { frames: 9, loop: false, grip: RIFLE, sample: (u, p) => attentionPose(p, u, 'left') },
};
export const CLIP_IDS = Object.keys(CLIP_DEFS) as CrowdClip[];

/**
 * How far one cycle of each walk goes at scale 1 (the capture's once it's in, the recording's before): a
 * person at scale s and speed v plays v / (strideOf(c) s) cycles a second, so their feet stay put
 */
export const STRIDE: Record<'walk' | 'walk2' | 'jog' | 'march' | 'hurry' | 'phonewalk', number> = { walk: walk.stride, walk2: walk.stride, jog: jog.stride, march: march.stride, hurry: walk.stride, phonewalk: walk.stride };
export const strideOf = (c: CrowdClip) => (c in STRIDE ? STRIDE[c as keyof typeof STRIDE] : 1);
/** How long each loop is (seconds): a person plays `t / secondsOf(c)` (plus their own offset) */
const SECONDS: Partial<Record<CrowdClip, number>> = {};
export const secondsOf = (c: CrowdClip) => SECONDS[c] ?? CLIP_SECONDS;
/** A person's own walk and idle (by a number of theirs, 0..1), so no two are in step or alike */
export const walkFor = (seed: number): CrowdClip => (seed < 0.5 ? 'walk' : 'walk2');
export const idleFor = (seed: number): CrowdClip => (seed < 1 / 3 ? 'idle' : seed < 2 / 3 ? 'idle2' : 'idle3');

/** Each clip's first row in the texture */
export const CLIP_ROWS = {} as Record<CrowdClip, number>;
export let CROWD_ROWS = 0;
for (const id of CLIP_IDS) {
  CLIP_ROWS[id] = CROWD_ROWS;
  CROWD_ROWS += CLIP_DEFS[id].frames;
}
/** Bones a row, four texels (a matrix's columns) a bone */
export const CROWD_BONES = BONES.length;

/** The pose of `clip` at `u`, sampled at its frames (what a row holds) */
export function clipPose(clip: CrowdClip, frame: number, out = fresh()) {
  const d = CLIP_DEFS[clip];
  d.sample(d.loop ? frame / d.frames : frame / Math.max(1, d.frames - 1), out);
  return out;
}

/**
 * Which rows to blend for a person `u` (0..1, a loop wraps) through `clip`,
 * and by how much: [row, next row, blend]
 */
export function crowdFrame(clip: CrowdClip, u: number, out: [number, number, number] = [0, 0, 0]) {
  const d = CLIP_DEFS[clip];
  const row = CLIP_ROWS[clip];
  if (d.loop) {
    const f = (((u % 1) + 1) % 1) * d.frames;
    const a = Math.floor(f) % d.frames;
    out[0] = row + a;
    out[1] = row + ((a + 1) % d.frames);
    out[2] = f - Math.floor(f);
  } else {
    const f = THREE.MathUtils.clamp(u, 0, 1) * (d.frames - 1);
    const a = Math.min(d.frames - 2, Math.floor(f));
    out[0] = row + a;
    out[1] = row + a + 1;
    out[2] = f - a;
  }
  return out;
}

/* ---------- Baking ---------- */

let baked: Float32Array | null = null;

/** A captured frame: the hips' place and every body bone's turn */
interface Sample {
  hips: THREE.Vector3;
  rot: THREE.Quaternion[];
}
const newSample = (): Sample => ({ hips: new THREE.Vector3(), rot: Array.from({ length: NB }, () => new THREE.Quaternion()) });
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
/** The clip at frame `t` (fractional; a loop wraps), between its two frames */
function sampleAt(c: MoClip, t: number, loop: boolean, out: Sample) {
  const n = c.frames;
  const f0 = Math.floor(t);
  const k = t - f0;
  const a = loop ? ((f0 % n) + n) % n : Math.min(n - 1, Math.max(0, f0));
  const b = loop ? (a + 1) % n : Math.min(n - 1, a + 1);
  out.hips.set(c.hips[a * 3], c.hips[a * 3 + 1], c.hips[a * 3 + 2]).lerp(vb.set(c.hips[b * 3], c.hips[b * 3 + 1], c.hips[b * 3 + 2]), k);
  for (let i = 0; i < NB; i++) {
    qa.fromArray(c.rot, (a * NB + i) * 4);
    qb.fromArray(c.rot, (b * NB + i) * 4);
    out.rot[i].copy(qa).slerp(qb, k);
  }
}
const vb = new THREE.Vector3();
const blendA = newSample();
const blendB = newSample();
/** Row `f` of `frames` of a captured clip: a loop take whole; an idle over its loop with the tail crossfaded into the head */
export function captureRow(c: MoClip, frames: number, f: number, tail: number | undefined, out: Sample) {
  if (tail === undefined) return sampleAt(c, (f / frames) * c.frames, true, out);
  const T = Math.round(tail * MOCAP_FPS);
  const L = c.frames - T;
  const t = (f / frames) * L;
  if (t >= T) return sampleAt(c, t, false, out);
  // (the head: from where the take's tail had got to, into the take's own start)
  sampleAt(c, t + L, false, blendA);
  sampleAt(c, t, false, blendB);
  const k = THREE.MathUtils.smoothstep(t / T, 0, 1);
  out.hips.copy(blendA.hips).lerp(blendB.hips, k);
  for (let i = 0; i < NB; i++) out.rot[i].copy(blendA.rot[i]).slerp(blendB.rot[i], k);
  return out;
}

const qo = new THREE.Quaternion();
const eo = new THREE.Euler();
const ARM_BONES_R = ['clavR', 'armR', 'foreR', 'handR'] as const;
const ARM_BONES = ['clavL', 'armL', 'foreL', 'handL', ...ARM_BONES_R] as const;
/**
 * A pose's additions laid over a captured row (as poseSkeleton() shares them): the head's yaw and pitch down the
 * neck and head (or, `head`, the pose's own head in place of the row's), the lean down the spine, and the arms
 * (`arms`: both, or the right) replaced by the pose's own
 */
function overlay(smp: Sample, o: Pose, d: ClipDef, sk2: Skeleton) {
  // (each turn in its bone's parent's frame, before the bone's own, as a pose's rotation.set() is)
  if (!d.head) {
    const hx = -o.headPitch;
    const hy = o.headYaw;
    smp.rot[MOCAP_BONES.indexOf('neck')].premultiply(qo.setFromEuler(eo.set(hx * NECK_SHARE, hy * NECK_SHARE, 0)));
    smp.rot[MOCAP_BONES.indexOf('head')].premultiply(qo.setFromEuler(eo.set(hx * (1 - NECK_SHARE), hy * (1 - NECK_SHARE), 0)));
  }
  for (const [i, n] of (['spine1', 'spine2', 'chest'] as const).entries()) smp.rot[MOCAP_BONES.indexOf(n)].premultiply(qo.setFromEuler(eo.set(o.lean * SPINE_SHARE[i], 0, 0)));
  if (!d.arms && !d.head) return;
  poseSkeleton(sk2, o, grips(d.grip));
  if (d.head) for (const n of ['neck', 'head'] as const) smp.rot[MOCAP_BONES.indexOf(n)].copy(sk2.bones[n].quaternion);
  if (d.arms) for (const n of d.arms === 'both' ? ARM_BONES : ARM_BONES_R) smp.rot[MOCAP_BONES.indexOf(n)].copy(sk2.bones[n].quaternion);
}

/**
 * Every clip's frames as bone matrices: `CROWD_ROWS` rows of `CROWD_BONES`
 * matrices, column by column (RGBA texels, four a bone). Baked once (again
 * when the crowd pack comes in).
 */
export function bakeCrowdClips(): Float32Array {
  if (baked) return baked;
  const sk = makeSkeleton();
  sk.root.updateMatrixWorld(true);
  const bind = sk.list.map((b) => b.matrixWorld.clone().invert());
  const data = new Float32Array(CROWD_ROWS * CROWD_BONES * 16);
  const m = new THREE.Matrix4();
  const p = fresh();
  const smp = newSample();
  const over = fresh();
  const sk2 = makeSkeleton();
  for (const id of CLIP_IDS) {
    const d = CLIP_DEFS[id];
    const c = captureOf(id);
    for (let f = 0; f < d.frames; f++) {
      const sec = (f / d.frames) * secondsOf(id);
      if (c) {
        // (the body's bones from the capture, over the rest pose's hands)
        poseSkeleton(sk, fresh(), grips(d.grip));
        captureRow(c, d.frames, f, d.capture!.tail, smp);
        if (d.over) {
          // What's keyed over it: the head's turn and the spine's lean on the capture's bones, the arms replaced
          copyPose(fresh(), over);
          d.over(sec, over);
          overlay(smp, over, d, sk2);
        }
        for (let i = 0; i < NB; i++) sk.bones[MOCAP_BONES[i]].quaternion.copy(smp.rot[i]);
        sk.bones.hips.position.copy(smp.hips);
      } else {
        clipPose(id, f, p);
        d.over?.(sec, p);
        poseSkeleton(sk, p, grips(d.grip));
      }
      sk.root.updateMatrixWorld(true);
      const row = CLIP_ROWS[id] + f;
      sk.list.forEach((b, i) => {
        m.multiplyMatrices(b.matrixWorld, bind[i]);
        data.set(m.elements, (row * CROWD_BONES + i) * 16);
      });
    }
  }
  return (baked = data);
}
