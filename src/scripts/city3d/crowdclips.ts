/*
 * The crowd's moves, baked (character rebuild Phase 5; DOM-free, tested in
 * tests/crowdclips.test.ts). Every person in a crowd is the skinned body
 * drawn instanced, and the GPU skins them from one texture of bone matrices
 * (crowdskin.ts): each clip below is sampled into rows of it, one row a
 * frame, each row every bone's matrix (posed world x the bind pose's
 * inverse) in the figure's own space at scale 1.
 *
 * - **walk**, **jog** and **march** are the planted-feet walk (locomotion.ts)
 *   recorded over one full cycle at a steady pace: a person plays it at the
 *   rate their own speed calls for (`WALK_STRIDE` / `JOG_STRIDE` /
 *   `MARCH_STRIDE` is the distance one cycle covers at scale 1), so their
 *   feet stay put on the pavement. The jog is Westlake Park's joggers'.
 *   The march keeps the rifle arm still and the free arm swinging straight.
 * - **idle**, **look**, **chat**, **sit** and **picnic** (sitting on the
 *   ground, legs out) are the pose formulas (poses.ts)
 *   over a few seconds, the last part eased into the first so the loop has
 *   no seam.
 * - **salute** isn't a loop: its frames go from attention (0) to the hand at
 *   the brow (1).
 *
 * A person's clip and how far through it they are (`u`, 0..1) is all the
 * CPU works out each frame (`crowdFrame()`); 34 bones each is the GPU's.
 */
import * as THREE from 'three';
import { BONES, makeSkeleton, newPose, poseSkeleton, type Limb, type Pose } from './skeleton';
import { copyPose, createLocomotion } from './locomotion';
import { attentionPose, chatPose, idlePose, lookPose, picnicPose, set, sitPose } from './poses';
import { baked as atBuild, rounded } from './baked';

export type CrowdClip = 'walk' | 'jog' | 'march' | 'idle' | 'look' | 'chat' | 'sit' | 'picnic' | 'salute';

interface ClipDef {
  frames: number;
  loop: boolean;
  /** How closed the hands are (a soldier's round his rifle) */
  grip: number;
  /** The pose `u` (0..1) of the way through */
  sample(u: number, out: Pose): void;
}

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
    // (cut to 3 decimals, within 0.03° and half a millimetre: the page carries them, baked.ts)
    out.push(rounded(p));
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

export const CLIP_DEFS: Record<CrowdClip, ClipDef> = {
  walk: { frames: walk.poses.length, loop: true, grip: RELAXED, sample: recorded(walk.poses) },
  jog: { frames: jog.poses.length, loop: true, grip: 0.5, sample: recorded(jog.poses) },
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
  idle: { frames: 192, loop: true, grip: RELAXED, sample: looped((p, t) => idlePose(p, t)) },
  look: { frames: 192, loop: true, grip: RELAXED, sample: looped((p, t) => lookPose(p, t)) },
  chat: { frames: 192, loop: true, grip: RELAXED, sample: looped((p, t) => chatPose(p, t)) },
  sit: { frames: 144, loop: true, grip: RELAXED, sample: looped((p, t) => sitPose(p, t)) },
  picnic: { frames: 144, loop: true, grip: RELAXED, sample: looped((p, t) => picnicPose(p, t)) },
  // Attention (0) to the free hand at the brow (1), the rifle in the left hand
  salute: { frames: 9, loop: false, grip: RIFLE, sample: (u, p) => attentionPose(p, u, 'left') },
};
export const CLIP_IDS = Object.keys(CLIP_DEFS) as CrowdClip[];

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
/**
 * Every clip's frames as bone matrices: `CROWD_ROWS` rows of `CROWD_BONES`
 * matrices, column by column (RGBA texels, four a bone). Baked once.
 */
export function bakeCrowdClips(): Float32Array {
  if (baked) return baked;
  const sk = makeSkeleton();
  sk.root.updateMatrixWorld(true);
  const bind = sk.list.map((b) => b.matrixWorld.clone().invert());
  const data = new Float32Array(CROWD_ROWS * CROWD_BONES * 16);
  const m = new THREE.Matrix4();
  const p = fresh();
  for (const id of CLIP_IDS) {
    const d = CLIP_DEFS[id];
    for (let f = 0; f < d.frames; f++) {
      clipPose(id, f, p);
      poseSkeleton(sk, p, [d.grip, d.grip]);
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
