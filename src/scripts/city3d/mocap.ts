/*
 * Degen's motion capture as data (DOM-free, tested in tests/mocap.test.ts):
 * the clips the mocap pipeline (`mocap-build.ts`, `npm run mocap`) makes
 * from the captured takes in assets/mocap/, retargeted onto his bones.
 *
 * - A clip is frames at `MOCAP_FPS`: where the root is on the ground (x, z
 *   and the way it faces, in rig numbers: scale 1, the hips 0.62 up), the
 *   hips in the root's frame, and every body bone's turn in its parent's
 *   frame (`MOCAP_BONES`, 22 of the skeleton's 34: the fingers and thumbs
 *   stay the figure's own grip).
 * - The file (`src/data/mocap/clips.bin`, made by `encodeMocap()`, read by
 *   `decodeMocap()`): turns as three 16-bit numbers (the fourth, kept
 *   positive, is worked out), the hips' place in 16 bits, the root in
 *   32-bit floats.
 * - `mirrorClip()` makes a clip's mirror image (left for right), so every
 *   turn is in the data both ways at no cost to the download.
 * - `posed()` runs a frame through the skeleton (forward kinematics) for
 *   the feet, hips and anything else a caller needs; `contacts()` finds
 *   when each foot is on the ground (low and still), for the foot lock.
 */
import * as THREE from 'three';
import { makeSkeleton, type BoneName } from './skeleton';

export const MOCAP_FPS = 30;
/** The bones the clips carry, in their order: each one's parent comes before it */
export const MOCAP_BONES: BoneName[] = [
  'hips',
  'spine1',
  'spine2',
  'chest',
  'neck',
  'head',
  'clavL',
  'armL',
  'foreL',
  'handL',
  'clavR',
  'armR',
  'foreR',
  'handR',
  'legL',
  'shinL',
  'footL',
  'toeL',
  'legR',
  'shinR',
  'footR',
  'toeR',
];
export const NB = MOCAP_BONES.length;
export const MB = Object.fromEntries(MOCAP_BONES.map((b, i) => [b, i])) as Record<(typeof MOCAP_BONES)[number], number>;

/** Each bone's parent in MOCAP_BONES (-1 for the hips, whose parent is the root) */
export const PARENT: number[] = (() => {
  const sk = makeSkeleton();
  return MOCAP_BONES.map((n) => {
    const p = sk.bones[n].parent as THREE.Bone;
    return n === 'hips' ? -1 : MOCAP_BONES.indexOf(p.name as BoneName);
  });
})();
/** Each bone's place in its parent's frame at rest (the hips': over the root) */
export const REST: THREE.Vector3[] = (() => {
  const sk = makeSkeleton();
  return MOCAP_BONES.map((n) => sk.bones[n].position.clone());
})();
/** The mirror image of each bone (L for R) */
export const MIRROR: number[] = MOCAP_BONES.map((n) => MOCAP_BONES.indexOf((n.endsWith('L') ? `${n.slice(0, -1)}R` : n.endsWith('R') ? `${n.slice(0, -1)}L` : n) as BoneName));

export interface MoClip {
  name: string;
  frames: number;
  /** x, z and the way it faces (0 = +z), a frame at a time */
  root: Float32Array;
  /** The hips' place in the root's frame (x, y, z), a frame at a time */
  hips: Float32Array;
  /** Every bone's turn (x, y, z, w) in its parent's frame (the hips' in the root's), a frame at a time */
  rot: Float32Array;
  /** Whether it's the mirror image of the take */
  mirrored?: boolean;
}

export interface MoData {
  fps: number;
  clips: MoClip[];
}

/* ---------- The file ---------- */

const MAGIC = 0x434d3753; // "S7MC"
const VERSION = 1;
/** The hips' place is kept to 1/8192 of a rig unit (±4) */
const HIPS_Q = 8192;
const ROT_Q = 32767;

export function encodeMocap(d: MoData): Uint8Array {
  let size = 12;
  for (const c of d.clips) size += 1 + c.name.length + 4 + c.frames * (12 + 6 + NB * 6);
  const buf = new ArrayBuffer(size);
  const v = new DataView(buf);
  let o = 0;
  v.setUint32(o, MAGIC, true);
  v.setUint16(o + 4, VERSION, true);
  v.setUint16(o + 6, d.fps, true);
  v.setUint16(o + 8, NB, true);
  v.setUint16(o + 10, d.clips.length, true);
  o = 12;
  for (const c of d.clips) {
    v.setUint8(o++, c.name.length);
    for (let i = 0; i < c.name.length; i++) v.setUint8(o++, c.name.charCodeAt(i));
    v.setUint32(o, c.frames, true);
    o += 4;
    for (let f = 0; f < c.frames; f++) {
      for (let k = 0; k < 3; k++, o += 4) v.setFloat32(o, c.root[f * 3 + k], true);
      for (let k = 0; k < 3; k++, o += 2) v.setInt16(o, Math.round(THREE.MathUtils.clamp(c.hips[f * 3 + k] * HIPS_Q, -32767, 32767)), true);
      for (let b = 0; b < NB; b++) {
        const q = f * NB * 4 + b * 4;
        const s = c.rot[q + 3] < 0 ? -1 : 1;
        for (let k = 0; k < 3; k++, o += 2) v.setInt16(o, Math.round(THREE.MathUtils.clamp(c.rot[q + k] * s, -1, 1) * ROT_Q), true);
      }
    }
  }
  return new Uint8Array(buf);
}

export function decodeMocap(buf: ArrayBuffer | Uint8Array): MoData {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (v.getUint32(0, true) !== MAGIC) throw new Error('Not a mocap file');
  if (v.getUint16(4, true) !== VERSION) throw new Error('Unknown mocap version');
  const fps = v.getUint16(6, true);
  if (v.getUint16(8, true) !== NB) throw new Error('Mocap bones changed');
  const count = v.getUint16(10, true);
  let o = 12;
  const clips: MoClip[] = [];
  for (let n = 0; n < count; n++) {
    const len = v.getUint8(o++);
    let name = '';
    for (let i = 0; i < len; i++) name += String.fromCharCode(v.getUint8(o++));
    const frames = v.getUint32(o, true);
    o += 4;
    const root = new Float32Array(frames * 3);
    const hips = new Float32Array(frames * 3);
    const rot = new Float32Array(frames * NB * 4);
    for (let f = 0; f < frames; f++) {
      for (let k = 0; k < 3; k++, o += 4) root[f * 3 + k] = v.getFloat32(o, true);
      for (let k = 0; k < 3; k++, o += 2) hips[f * 3 + k] = v.getInt16(o, true) / HIPS_Q;
      for (let b = 0; b < NB; b++) {
        const q = f * NB * 4 + b * 4;
        let ss = 0;
        for (let k = 0; k < 3; k++, o += 2) {
          const x = v.getInt16(o, true) / ROT_Q;
          rot[q + k] = x;
          ss += x * x;
        }
        rot[q + 3] = Math.sqrt(Math.max(0, 1 - ss));
        // (renormalise: the three kept numbers are rounded)
        const l = Math.hypot(rot[q], rot[q + 1], rot[q + 2], rot[q + 3]) || 1;
        for (let k = 0; k < 4; k++) rot[q + k] /= l;
      }
    }
    clips.push({ name, frames, root, hips, rot });
  }
  return { fps, clips };
}

/** The clip's mirror image: left for right, across the figure's middle (x) */
export function mirrorClip(c: MoClip): MoClip {
  const root = new Float32Array(c.root.length);
  const hips = new Float32Array(c.hips.length);
  const rot = new Float32Array(c.rot.length);
  for (let f = 0; f < c.frames; f++) {
    root[f * 3] = -c.root[f * 3];
    root[f * 3 + 1] = c.root[f * 3 + 1];
    root[f * 3 + 2] = -c.root[f * 3 + 2];
    hips[f * 3] = -c.hips[f * 3];
    hips[f * 3 + 1] = c.hips[f * 3 + 1];
    hips[f * 3 + 2] = c.hips[f * 3 + 2];
    for (let b = 0; b < NB; b++) {
      const from = f * NB * 4 + MIRROR[b] * 4;
      const to = f * NB * 4 + b * 4;
      // A turn mirrored across the x = 0 plane: (x, -y, -z, w)
      rot[to] = c.rot[from];
      rot[to + 1] = -c.rot[from + 1];
      rot[to + 2] = -c.rot[from + 2];
      rot[to + 3] = c.rot[from + 3];
    }
  }
  return { name: `${c.name}~`, frames: c.frames, root, hips, rot, mirrored: !c.mirrored };
}

/* ---------- Posing a frame ---------- */

/** Every bone's place and turn in the root's frame */
export interface Posed {
  pos: THREE.Vector3[];
  rot: THREE.Quaternion[];
}
export const newPosed = (): Posed => ({ pos: MOCAP_BONES.map(() => new THREE.Vector3()), rot: MOCAP_BONES.map(() => new THREE.Quaternion()) });

const qt = new THREE.Quaternion();
/** Forward kinematics of local turns `rot` (NB × 4 from `at`) and the hips' place, in the root's frame */
export function posed(rot: ArrayLike<number>, at: number, hx: number, hy: number, hz: number, out: Posed): Posed {
  for (let b = 0; b < NB; b++) {
    const q = at + b * 4;
    qt.set(rot[q], rot[q + 1], rot[q + 2], rot[q + 3]);
    const p = PARENT[b];
    if (p < 0) {
      out.pos[b].set(hx, hy, hz);
      out.rot[b].copy(qt);
    } else {
      out.pos[b].copy(REST[b]).applyQuaternion(out.rot[p]).add(out.pos[p]);
      out.rot[b].copy(out.rot[p]).multiply(qt);
    }
  }
  return out;
}
/** A clip's frame posed */
export const posedFrame = (c: MoClip, f: number, out: Posed) => posed(c.rot, f * NB * 4, c.hips[f * 3], c.hips[f * 3 + 1], c.hips[f * 3 + 2], out);

/** The ball of the foot (the toe bone's root) and the heel's height off it, at rest */
export const FOOT_BONES = [MB.footL, MB.footR] as const;
export const TOE_BONES = [MB.toeL, MB.toeR] as const;

/** Where a frame's root is in the clip, as a turn and place */
export function rootAt(c: MoClip, f: number) {
  return { x: c.root[f * 3], z: c.root[f * 3 + 1], yaw: c.root[f * 3 + 2] };
}

/**
 * When each foot is on the ground: its heel (the ankle) or ball low and
 * nearly still, in the clip's own world (root and all). [left, right] per
 * frame, 1 on the ground. A foot's contact is held through blips shorter
 * than two frames.
 */
export const CONTACT = { heelY: 0.1, ballY: 0.04, heelSpeed: 0.8, ballSpeed: 1.3 };
export function contacts(c: MoClip): Uint8Array {
  const out = new Uint8Array(c.frames * 2);
  const P = newPosed();
  const heel: THREE.Vector3[][] = [[], []];
  const ball: THREE.Vector3[][] = [[], []];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let f = 0; f < c.frames; f++) {
    posedFrame(c, f, P);
    const r = rootAt(c, f);
    m.compose(new THREE.Vector3(r.x, 0, r.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r.yaw), new THREE.Vector3(1, 1, 1));
    for (let s = 0; s < 2; s++) {
      heel[s].push(P.pos[FOOT_BONES[s]].clone().applyMatrix4(m));
      ball[s].push(P.pos[TOE_BONES[s]].clone().applyMatrix4(m));
    }
  }
  const fps = MOCAP_FPS;
  for (let s = 0; s < 2; s++)
    for (let f = 0; f < c.frames; f++) {
      const a = Math.max(0, f - 1);
      const b = Math.min(c.frames - 1, f + 1);
      const dt = (b - a) / fps || 1;
      const hs = Math.hypot(heel[s][b].x - heel[s][a].x, heel[s][b].z - heel[s][a].z) / dt;
      const bs = Math.hypot(ball[s][b].x - ball[s][a].x, ball[s][b].z - ball[s][a].z) / dt;
      const down = (heel[s][f].y < CONTACT.heelY && hs < CONTACT.heelSpeed) || (ball[s][f].y < CONTACT.ballY && bs < CONTACT.ballSpeed);
      out[f * 2 + s] = down ? 1 : 0;
    }
  // Close one-frame gaps and drop one-frame touches
  for (let s = 0; s < 2; s++)
    for (let f = 1; f < c.frames - 1; f++) {
      const p = out[(f - 1) * 2 + s];
      const n = out[(f + 1) * 2 + s];
      if (p === n && out[f * 2 + s] !== p) out[f * 2 + s] = p;
    }
  return out;
}
