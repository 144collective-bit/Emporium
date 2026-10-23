/*
 * BVH motion capture files (DOM-free): read a file's skeleton and frames,
 * and pose any frame (forward kinematics) into each joint's place and turn
 * in the world. Used at build time by the mocap pipeline (`mocap-build.ts`,
 * `scripts/mocap.mjs`) and by its tests; nothing in the browser reads BVH.
 */
import * as THREE from 'three';

export interface BvhJoint {
  name: string;
  parent: number;
  /** Where it sits in its parent's frame at rest */
  offset: THREE.Vector3;
  /** Its channels, in the file's order (e.g. Xposition, Zrotation...) */
  channels: string[];
  /** Where its channels start in a frame's numbers */
  at: number;
  /** An End Site's offset, when it ends a chain */
  end?: THREE.Vector3;
}

export interface Bvh {
  joints: BvhJoint[];
  /** Seconds a frame */
  frameTime: number;
  /** Each frame's numbers */
  frames: Float32Array[];
}

export function parseBvh(text: string): Bvh {
  const tok = text.split(/\s+/).filter(Boolean);
  let i = 0;
  const joints: BvhJoint[] = [];
  let at = 0;
  const stack: number[] = [];
  const num = () => parseFloat(tok[i++]);
  if (tok[i++] !== 'HIERARCHY') throw new Error('Not a BVH file');
  while (i < tok.length && tok[i] !== 'MOTION') {
    const t = tok[i++];
    if (t === 'ROOT' || t === 'JOINT') {
      const name = tok[i++];
      joints.push({ name, parent: stack.length ? stack[stack.length - 1] : -1, offset: new THREE.Vector3(), channels: [], at: 0 });
    } else if (t === '{') {
      stack.push(joints.length - 1);
    } else if (t === '}') {
      stack.pop();
    } else if (t === 'OFFSET') {
      const v = new THREE.Vector3(num(), num(), num());
      // An offset straight after "End Site {" belongs to the end, not the joint
      if (tok[i - 6] === 'Site') joints[stack[stack.length - 1]].end = v;
      else joints[joints.length - 1].offset.copy(v);
    } else if (t === 'CHANNELS') {
      const n = parseInt(tok[i++], 10);
      const j = joints[joints.length - 1];
      j.channels = tok.slice(i, i + n);
      j.at = at;
      at += n;
      i += n;
    } else if (t === 'End') {
      // "End Site {": the brace opens a block that belongs to the joint above
      i++;
      if (tok[i++] !== '{') throw new Error('Bad End Site');
      stack.push(stack[stack.length - 1]);
    }
  }
  i++; // MOTION
  if (tok[i++] !== 'Frames:') throw new Error('No frame count');
  const count = parseInt(tok[i++], 10);
  if (tok[i++] !== 'Frame' || tok[i++] !== 'Time:') throw new Error('No frame time');
  const frameTime = num();
  const frames: Float32Array[] = [];
  for (let f = 0; f < count && i < tok.length; f++) {
    const row = new Float32Array(at);
    for (let c = 0; c < at; c++) row[c] = num();
    frames.push(row);
  }
  return { joints, frameTime, frames };
}

const AXES: Record<string, THREE.Vector3> = { X: new THREE.Vector3(1, 0, 0), Y: new THREE.Vector3(0, 1, 0), Z: new THREE.Vector3(0, 0, 1) };
const qa = new THREE.Quaternion();

/** A joint's turn in its parent's frame at a frame (the channels in their order, each applied in turn) */
export function localTurn(j: BvhJoint, row: Float32Array, out: THREE.Quaternion) {
  out.identity();
  for (let c = 0; c < j.channels.length; c++) {
    const ch = j.channels[c];
    if (!ch.endsWith('rotation')) continue;
    out.multiply(qa.setFromAxisAngle(AXES[ch[0]], THREE.MathUtils.degToRad(row[j.at + c])));
  }
  return out;
}

/** The root's position channels at a frame (the offset where there are none) */
export function rootPosition(j: BvhJoint, row: Float32Array, out: THREE.Vector3) {
  out.copy(j.offset);
  for (let c = 0; c < j.channels.length; c++) {
    const ch = j.channels[c];
    if (ch === 'Xposition') out.x = row[j.at + c];
    else if (ch === 'Yposition') out.y = row[j.at + c];
    else if (ch === 'Zposition') out.z = row[j.at + c];
  }
  return out;
}

/** Every joint's place and turn in the world at a frame */
export interface BvhPose {
  pos: THREE.Vector3[];
  rot: THREE.Quaternion[];
}

export function poseBvh(b: Bvh, f: number, out?: BvhPose): BvhPose {
  const pose = out ?? { pos: b.joints.map(() => new THREE.Vector3()), rot: b.joints.map(() => new THREE.Quaternion()) };
  const row = b.frames[f];
  for (let k = 0; k < b.joints.length; k++) {
    const j = b.joints[k];
    const local = localTurn(j, row, pose.rot[k]);
    if (j.parent < 0) {
      rootPosition(j, row, pose.pos[k]);
    } else {
      pose.pos[k].copy(j.offset).applyQuaternion(pose.rot[j.parent]).add(pose.pos[j.parent]);
      local.premultiply(pose.rot[j.parent]);
    }
  }
  return pose;
}

export const jointIndex = (b: Bvh, name: string) => {
  const k = b.joints.findIndex((j) => j.name === name);
  if (k < 0) throw new Error(`No joint ${name}`);
  return k;
};
