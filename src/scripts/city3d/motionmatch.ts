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
 *
 * The jumps (animation Phase 3): a take's flights (both feet off the ground
 * long enough, the hips well up: `FLIGHT`) are found from its contacts; on
 * the ground a search never lands in one or just before it (as at a clip's
 * end), and the animator plays them itself: from a take-off frame
 * (`takeoff`), through the air, to a touchdown (`touchdown`).
 */
import * as THREE from 'three';
import { FOOT_BONES, MOCAP_FPS, type MoClip, type MoData, contacts, mirrorClip, newPosed, posedFrame, tagged } from './mocap';

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
/** A jump: both feet off the ground at least `frames`, the hips rising at least `rise` (a run's own flights are shorter and flatter) */
export const FLIGHT = { frames: 6, rise: 0.06 };
/** How many frames before leaving the ground a take-off starts (the push off the toes) */
export const TAKEOFF = 3;
/** The tag of a take that's only its jump (a standing jump, its wind-up no way to stand or walk): shut to the ground's searches */
export const JUMPS_ONLY = 'jumps-only';

/** One jump in a clip: the first frame in the air and the first back on the ground */
export interface Flight {
  clip: number;
  from: number;
  to: number;
}

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
  /** The jumps, and each frame's: which (its index, -1 none, from its take-off to its touchdown) */
  flights: Flight[];
  flightOf: Int32Array;
  /** The hips' rise in a flight over the line from take-off to touchdown (rig numbers): the jump itself, which the game does */
  bump: Float32Array;
  /** The frames a jump may start from, and land on */
  takeoff: Uint8Array;
  touchdown: Uint8Array;
}

/** A clip's jumps, from its contacts */
function flightsOf(c: MoClip, con: Uint8Array) {
  const out: [number, number][] = [];
  let from = -1;
  for (let f = 0; f <= c.frames; f++) {
    const air = f < c.frames && !con[f * 2] && !con[f * 2 + 1];
    if (air && from < 0) from = f;
    if (!air && from >= 0) {
      let top = 0;
      for (let k = from; k < f; k++) top = Math.max(top, c.hips[k * 3 + 1]);
      if (f < c.frames && from >= TAKEOFF && f - from >= FLIGHT.frames && top - c.hips[from * 3 + 1] >= FLIGHT.rise) out.push([from, f]);
      from = -1;
    }
  }
  return out;
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
  const con = clips.map(contacts);
  const flights: Flight[] = [];
  const flightOf = new Int32Array(count).fill(-1);
  const bump = new Float32Array(count);
  const takeoff = new Uint8Array(count);
  const touchdown = new Uint8Array(count);
  clips.forEach((c, ci) => {
    raw.set(rawFeatures(c), start[ci] * FEATURES);
    for (let f = 0; f < c.frames; f++) {
      const g = start[ci] + f;
      clipOf[g] = ci;
      frameOf[g] = f;
      open[g] = f < c.frames - TAIL && !tagged(c, JUMPS_ONLY) ? 1 : 0;
      const soon = THREE.MathUtils.clamp(1 - (c.frames - TAIL - f) / ENDING.frames, 0, 1);
      bias[g] = ENDING.cost * soon * soon;
      const a = Math.max(0, f - 1);
      const b = Math.min(c.frames - 1, f + 1);
      speed[g] = (Math.hypot(c.root[b * 3] - c.root[a * 3], c.root[b * 3 + 1] - c.root[a * 3 + 1]) * MOCAP_FPS) / Math.max(1, b - a);
    }
    // Its jumps: shut to the ground's searches like a clip's end (and costly just before), the hips' rise noted
    for (const [from, to] of flightsOf(c, con[ci])) {
      const id = flights.push({ clip: ci, from, to }) - 1;
      const s0 = start[ci];
      const h0 = c.hips[(from - 1) * 3 + 1];
      const h1 = c.hips[to * 3 + 1];
      for (let f = from - TAKEOFF; f < to; f++) {
        flightOf[s0 + f] = id;
        open[s0 + f] = 0;
        if (f >= from) bump[s0 + f] = Math.max(0, c.hips[f * 3 + 1] - THREE.MathUtils.lerp(h0, h1, (f - from + 1) / (to - from + 1)));
      }
      for (let f = Math.max(0, from - TAKEOFF - TAIL - ENDING.frames); f < from - TAKEOFF; f++) {
        if (f >= from - TAKEOFF - TAIL) open[s0 + f] = 0;
        const soon = THREE.MathUtils.clamp(1 - (from - TAKEOFF - TAIL - f) / ENDING.frames, 0, 1);
        bias[s0 + f] = Math.max(bias[s0 + f], ENDING.cost * soon * soon);
      }
      takeoff[s0 + from - TAKEOFF] = 1;
      touchdown[s0 + to] = 1;
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
  return { clips, contacts: con, start, count, clipOf, frameOf, feat, mean, scale, open, bias, speed, flights, flightOf, bump, takeoff, touchdown };
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

/**
 * The nearest open frame to `q`, and its cost (only in the clips `only`
 * allows, when it's given; or only the frames `frames` allows, open or not:
 * the take-offs, the touchdowns)
 */
export function search(db: Database, q: Float32Array, only?: Uint8Array, frames?: Uint8Array) {
  let best = -1;
  let bestCost = Infinity;
  const F = db.feat;
  for (let g = 0; g < db.count; g++) {
    if (frames ? !frames[g] : !db.open[g] || (only && !only[db.clipOf[g]])) continue;
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
