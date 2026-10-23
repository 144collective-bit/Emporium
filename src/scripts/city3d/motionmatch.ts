/*
 * Motion matching (DOM-free, tested in tests/motionmatch.test.ts): every
 * frame of the clips (mocap.ts, and each clip's mirror image) described by
 * a few numbers, and the frame nearest a query found by looking at them
 * all (a few thousand frames: well under a millisecond).
 *
 * A frame's features (Holden's, in the root's frame, rig numbers):
 *   0-5    the feet (ankles): where they are
 *   6-11   their velocities
 *   12-14  the hips' velocity
 *   15-20  where the root will be 1/3, 2/3 and 1 s on (x, z)
 *   21-26  which way it will face then (x, z)
 * Each group is scaled by its spread over the database and weighted
 * (`WEIGHTS`), so feet, speed and trajectory pull in proportion. The
 * query is the playing frame's own pose features with the trajectory
 * the movement springs predict (movesim.ts) in place of the clip's.
 */
import * as THREE from 'three';
import { FOOT_BONES, MOCAP_FPS, type MoClip, type MoData, contacts, mirrorClip, newPosed, posedFrame } from './mocap';

export const FEATURES = 27;
/** The trajectory's points ahead (frames at MOCAP_FPS) */
export const AHEAD = [10, 20, 30];
/** Where each group starts, how many numbers it has, and its weight */
export const GROUPS = [
  { at: 0, n: 6, w: 0.75 },
  { at: 6, n: 6, w: 1 },
  { at: 12, n: 3, w: 1 },
  { at: 15, n: 6, w: 1 },
  { at: 21, n: 6, w: 1.5 },
];
/** Frames at the end of each clip a search never lands on (room to play on) */
const TAIL = 4;
/**
 * ...and a cost on the frames before them, up to `cost` at the last open
 * one: a long stretch of the right motion (the idle when standing) wins
 * over a few frames that end in a jump
 */
export const ENDING = { frames: 20, cost: 0.3 };

export interface Database {
  clips: MoClip[];
  /** Each clip's foot contacts (mocap.ts `contacts()`) */
  contacts: Uint8Array[];
  /** Where each clip's frames start in the frame list */
  start: number[];
  count: number;
  clipOf: Int32Array;
  frameOf: Int32Array;
  /** The features, scaled and weighted, FEATURES a frame */
  feat: Float32Array;
  mean: Float32Array;
  scale: Float32Array;
  /** Whether a search may land on the frame */
  open: Uint8Array;
  /** The cost of landing on it, near its clip's end */
  bias: Float32Array;
  /** How fast the root moves at each frame (rig numbers a second) */
  speed: Float32Array;
}

const up = new THREE.Vector3(0, 1, 0);
const qy = new THREE.Quaternion();

/** Where the root is `k` frames on from `f` (straight on at its last speed past the end) */
function rootAhead(c: MoClip, f: number, k: number, out: { x: number; z: number; yaw: number }) {
  const g = f + k;
  const last = c.frames - 1;
  if (g <= last) {
    out.x = c.root[g * 3];
    out.z = c.root[g * 3 + 1];
    out.yaw = c.root[g * 3 + 2];
    return out;
  }
  const p = Math.max(0, last - 3);
  const span = Math.max(1, last - p);
  const over = g - last;
  out.x = c.root[last * 3] + ((c.root[last * 3] - c.root[p * 3]) / span) * over;
  out.z = c.root[last * 3 + 1] + ((c.root[last * 3 + 1] - c.root[p * 3 + 1]) / span) * over;
  out.yaw = c.root[last * 3 + 2];
  return out;
}

/** A clip's raw features, frame by frame */
function rawFeatures(c: MoClip): Float32Array {
  const n = c.frames;
  const out = new Float32Array(n * FEATURES);
  const P = newPosed();
  // Everything in the clip's own world first
  const feet: THREE.Vector3[][] = [[], []];
  const hips: THREE.Vector3[] = [];
  for (let f = 0; f < n; f++) {
    posedFrame(c, f, P);
    qy.setFromAxisAngle(up, c.root[f * 3 + 2]);
    const rx = c.root[f * 3];
    const rz = c.root[f * 3 + 1];
    for (let s = 0; s < 2; s++) feet[s].push(P.pos[FOOT_BONES[s]].clone().applyQuaternion(qy).add(new THREE.Vector3(rx, 0, rz)));
    hips.push(P.pos[0].clone().applyQuaternion(qy).add(new THREE.Vector3(rx, 0, rz)));
  }
  const vel = (list: THREE.Vector3[], f: number, o: THREE.Vector3) => {
    const a = Math.max(0, f - 1);
    const b = Math.min(n - 1, f + 1);
    return o.copy(list[b]).sub(list[a]).multiplyScalar(MOCAP_FPS / Math.max(1, b - a));
  };
  const v = new THREE.Vector3();
  const r = { x: 0, z: 0, yaw: 0 };
  for (let f = 0; f < n; f++) {
    const o = f * FEATURES;
    const yaw = c.root[f * 3 + 2];
    const rx = c.root[f * 3];
    const rz = c.root[f * 3 + 1];
    qy.setFromAxisAngle(up, -yaw);
    for (let s = 0; s < 2; s++) {
      v.copy(feet[s][f]).sub(new THREE.Vector3(rx, 0, rz)).applyQuaternion(qy);
      out[o + s * 3] = v.x;
      out[o + s * 3 + 1] = v.y;
      out[o + s * 3 + 2] = v.z;
      vel(feet[s], f, v).applyQuaternion(qy);
      out[o + 6 + s * 3] = v.x;
      out[o + 6 + s * 3 + 1] = v.y;
      out[o + 6 + s * 3 + 2] = v.z;
    }
    vel(hips, f, v).applyQuaternion(qy);
    out[o + 12] = v.x;
    out[o + 13] = v.y;
    out[o + 14] = v.z;
    for (let k = 0; k < AHEAD.length; k++) {
      rootAhead(c, f, AHEAD[k], r);
      v.set(r.x - rx, 0, r.z - rz).applyQuaternion(qy);
      out[o + 15 + k * 2] = v.x;
      out[o + 15 + k * 2 + 1] = v.z;
      const d = r.yaw - yaw;
      out[o + 21 + k * 2] = Math.sin(d);
      out[o + 21 + k * 2 + 1] = Math.cos(d);
    }
  }
  return out;
}

/** The database: every clip and its mirror image, their features scaled and weighted */
export function buildDatabase(data: MoData, mirror = true): Database {
  const clips = mirror ? data.clips.flatMap((c) => [c, mirrorClip(c)]) : data.clips.slice();
  const start: number[] = [];
  let count = 0;
  for (const c of clips) {
    start.push(count);
    count += c.frames;
  }
  const raw = new Float32Array(count * FEATURES);
  const clipOf = new Int32Array(count);
  const frameOf = new Int32Array(count);
  const open = new Uint8Array(count);
  const bias = new Float32Array(count);
  const speed = new Float32Array(count);
  clips.forEach((c, ci) => {
    raw.set(rawFeatures(c), start[ci] * FEATURES);
    for (let f = 0; f < c.frames; f++) {
      const g = start[ci] + f;
      clipOf[g] = ci;
      frameOf[g] = f;
      open[g] = f < c.frames - TAIL ? 1 : 0;
      const soon = THREE.MathUtils.clamp(1 - (c.frames - TAIL - f) / ENDING.frames, 0, 1);
      bias[g] = ENDING.cost * soon * soon;
      const a = Math.max(0, f - 1);
      const b = Math.min(c.frames - 1, f + 1);
      speed[g] = (Math.hypot(c.root[b * 3] - c.root[a * 3], c.root[b * 3 + 1] - c.root[a * 3 + 1]) * MOCAP_FPS) / Math.max(1, b - a);
    }
  });
  // Each number's mean; each group's spread (one for the group, so its numbers keep their proportions)
  const mean = new Float32Array(FEATURES);
  const scale = new Float32Array(FEATURES);
  for (let i = 0; i < count; i++) for (let k = 0; k < FEATURES; k++) mean[k] += raw[i * FEATURES + k] / count;
  for (const g of GROUPS) {
    let s = 0;
    for (let i = 0; i < count; i++) for (let k = g.at; k < g.at + g.n; k++) s += (raw[i * FEATURES + k] - mean[k]) ** 2;
    const sd = Math.sqrt(s / (count * g.n)) || 1;
    for (let k = g.at; k < g.at + g.n; k++) scale[k] = g.w / sd;
  }
  const feat = new Float32Array(count * FEATURES);
  for (let i = 0; i < count; i++) for (let k = 0; k < FEATURES; k++) feat[i * FEATURES + k] = (raw[i * FEATURES + k] - mean[k]) * scale[k];
  return { clips, contacts: clips.map(contacts), start, count, clipOf, frameOf, feat, mean, scale, open, bias, speed };
}

/**
 * The query's trajectory (in place, scaled like the database's): points
 * ahead relative to him in his own frame (rig numbers) and the way he'll
 * face then relative to now
 */
export function setTrajectory(db: Database, q: Float32Array, pts: { x: number; z: number; face: number }[]) {
  for (let k = 0; k < AHEAD.length; k++) {
    q[15 + k * 2] = (pts[k].x - db.mean[15 + k * 2]) * db.scale[15 + k * 2];
    q[15 + k * 2 + 1] = (pts[k].z - db.mean[15 + k * 2 + 1]) * db.scale[15 + k * 2 + 1];
    q[21 + k * 2] = (Math.sin(pts[k].face) - db.mean[21 + k * 2]) * db.scale[21 + k * 2];
    q[21 + k * 2 + 1] = (Math.cos(pts[k].face) - db.mean[21 + k * 2 + 1]) * db.scale[21 + k * 2 + 1];
  }
}

/** The cost of frame `g` for query `q` */
export function cost(db: Database, q: Float32Array, g: number) {
  let s = db.bias[g];
  const o = g * FEATURES;
  for (let k = 0; k < FEATURES; k++) {
    const d = db.feat[o + k] - q[k];
    s += d * d;
  }
  return s;
}

/** The nearest open frame to `q`, and its cost (only in the clips `only` allows, when it's given) */
export function search(db: Database, q: Float32Array, only?: Uint8Array) {
  let best = -1;
  let bestCost = Infinity;
  const F = db.feat;
  for (let g = 0; g < db.count; g++) {
    if (!db.open[g] || (only && !only[db.clipOf[g]])) continue;
    let s = db.bias[g];
    const o = g * FEATURES;
    for (let k = 0; k < FEATURES && s < bestCost; k++) {
      const d = F[o + k] - q[k];
      s += d * d;
    }
    if (s < bestCost) {
      bestCost = s;
      best = g;
    }
  }
  return { g: best, cost: bestCost };
}
