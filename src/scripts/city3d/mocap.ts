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
 *   positive, is worked out), the hips' place in 16 bits, each frame's as
 *   the difference from the frame before in varints (version 2), the root
 *   in 32-bit floats; each clip's `tags` (what a search may reach, what
 *   the rubric measures it as), `marks` and `pack` (the file it comes in:
 *   `CORE_PACK` with walking, the rest on first use).
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

/**
 * A mark in a clip (the revamp's Phase 4, the moments): the frame a hand
 * meets the thing, and where the thing is in the clip's frame (rig numbers)
 */
export interface Mark {
  name: string;
  frame: number;
  at: [number, number, number];
}

export interface MoClip {
  name: string;
  /**
   * What it is, for the searches that may reach it (`tagged()`): `stand`
   * (the idles), `crouch` (the crouched walks), `jumps-only` (a take that's
   * only its jump: shut to the ground's searches), and the rest for the
   * rubric and the lab (walk, run, start, stop, turn, strafe, jump...)
   */
  tags: string[];
  marks: Mark[];
  /** The pack it's in (`CORE_PACK` fetched when walking starts; others on first use) */
  pack?: string;
  frames: number;
  /** x, z and the way it faces (0 = +z), a frame at a time */
  root: Float32Array;
  /** The hips' place in the root's frame (x, y, z), a frame at a time */
  hips: Float32Array;
  /** Every bone's turn (x, y, z, w) in its parent's frame (the hips' in the root's), a frame at a time */
  rot: Float32Array;
  /**
   * How far the hands close through the take (0 open, 1 a fist; the
   * capture has no fingers): loosely curled running, hanging open standing
   * (the revamp's Phase 8; `GRIP` in animator.ts where a take doesn't say)
   */
  grip?: number;
  /**
   * A stairs take (the revamp's Phase 2): the take's floor under the hips, a frame at a time, from where it
   * started (rig numbers; the hips are kept relative to it, so the clip reads as level ground), and which
   * feet the pipeline found planted (bit 0 the left, bit 1 the right: `contacts()` reads it instead of looking)
   */
  floor?: Float32Array;
  contact?: Uint8Array;
  /** Whether it's the mirror image of the take */
  mirrored?: boolean;
}

export interface MoData {
  fps: number;
  clips: MoClip[];
}

/* ---------- The file ---------- */

const MAGIC = 0x434d3753; // "S7MC"
/** Version 2 (the revamp's Phase 1): tags, marks and packs, the numbers delta-coded; 3 (Phase 2): a stairs take's floor and contacts; 4 (Phase 8): a take's grip */
const VERSION = 4;
/** The hips' place is kept to 1/8192 of a rig unit (±4) */
const HIPS_Q = 8192;
const ROT_Q = 32767;
/** The pack a take is in when it doesn't say */
export const CORE_PACK = 'core';

/** Each frame's quantised numbers: the hips (3) and the turns (3 a bone, the fourth worked out) */
const INTS = 3 + NB * 3;
function quantise(c: MoClip, f: number, out: Int32Array) {
  for (let k = 0; k < 3; k++) out[k] = Math.round(THREE.MathUtils.clamp(c.hips[f * 3 + k] * HIPS_Q, -32767, 32767));
  for (let b = 0; b < NB; b++) {
    const q = f * NB * 4 + b * 4;
    const s = c.rot[q + 3] < 0 ? -1 : 1;
    for (let k = 0; k < 3; k++) out[3 + b * 3 + k] = Math.round(THREE.MathUtils.clamp(c.rot[q + k] * s, -1, 1) * ROT_Q);
  }
}

/** A growing byte buffer with varints (zigzag, seven bits a byte: a small difference is one byte) */
class Bytes {
  buf = new Uint8Array(1 << 16);
  n = 0;
  private room(k: number) {
    if (this.n + k <= this.buf.length) return;
    const b = new Uint8Array(Math.max(this.buf.length * 2, this.n + k));
    b.set(this.buf);
    this.buf = b;
  }
  u8(x: number) {
    this.room(1);
    this.buf[this.n++] = x & 255;
  }
  u16(x: number) {
    this.u8(x);
    this.u8(x >>> 8);
  }
  u32(x: number) {
    this.u16(x & 0xffff);
    this.u16(x >>> 16);
  }
  f32(x: number) {
    this.room(4);
    new DataView(this.buf.buffer).setFloat32(this.n, x, true);
    this.n += 4;
  }
  str(s: string) {
    if (s.length > 255) throw new Error(`Too long: ${s}`);
    this.u8(s.length);
    for (let i = 0; i < s.length; i++) this.u8(s.charCodeAt(i));
  }
  /** A signed number as a varint */
  int(x: number) {
    let z = ((x << 1) ^ (x >> 31)) >>> 0;
    this.room(5);
    while (z >= 128) {
      this.buf[this.n++] = (z & 127) | 128;
      z >>>= 7;
    }
    this.buf[this.n++] = z;
  }
  out() {
    return this.buf.slice(0, this.n);
  }
}
class Reader {
  o = 0;
  v: DataView;
  constructor(public u8: Uint8Array) {
    this.v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  }
  byte() {
    return this.u8[this.o++];
  }
  u16() {
    const x = this.v.getUint16(this.o, true);
    this.o += 2;
    return x;
  }
  u32() {
    const x = this.v.getUint32(this.o, true);
    this.o += 4;
    return x;
  }
  f32() {
    const x = this.v.getFloat32(this.o, true);
    this.o += 4;
    return x;
  }
  str() {
    const n = this.byte();
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(this.byte());
    return s;
  }
  int() {
    let z = 0;
    let shift = 0;
    for (;;) {
      const b = this.byte();
      z |= (b & 127) << shift;
      if (b < 128) break;
      shift += 7;
    }
    z >>>= 0;
    return (z >>> 1) ^ -(z & 1);
  }
}

/**
 * The clips as bytes: the header (with the pack's name), then each clip's
 * name, tags, marks and frame count, its root (floats), and its hips and turns quantised, each
 * frame's as the difference from the frame before, as varints (most
 * differences are a byte: the file is about half what plain 16-bit numbers
 * made, and gzip takes it down again)
 */
export function encodeMocap(d: MoData): Uint8Array {
  const w = new Bytes();
  w.u32(MAGIC);
  w.u16(VERSION);
  w.u16(d.fps);
  w.u16(NB);
  w.u16(d.clips.length);
  // (a file is one pack: its clips' own, or the core's)
  const pack = d.clips[0]?.pack ?? CORE_PACK;
  if (d.clips.some((c) => (c.pack ?? CORE_PACK) !== pack)) throw new Error('A mocap file holds one pack');
  w.str(pack);
  const now = new Int32Array(INTS);
  const prev = new Int32Array(INTS);
  for (const c of d.clips) {
    w.str(c.name);
    w.u8(c.tags.length);
    for (const t of c.tags) w.str(t);
    w.u8(c.marks.length);
    for (const m of c.marks) {
      w.str(m.name);
      w.u32(m.frame);
      for (const x of m.at) w.f32(x);
    }
    // (the grip in a byte: 255 where the take doesn't say)
    w.u8(c.grip === undefined ? 255 : Math.round(Math.min(1, Math.max(0, c.grip)) * 254));
    w.u32(c.frames);
    for (let f = 0; f < c.frames; f++) for (let k = 0; k < 3; k++) w.f32(c.root[f * 3 + k]);
    // (a stairs take: its floor and its contacts)
    w.u8((c.floor ? 1 : 0) | (c.contact ? 2 : 0));
    if (c.floor) for (let f = 0; f < c.frames; f++) w.f32(c.floor[f]);
    if (c.contact) for (let f = 0; f < c.frames; f++) w.u8(c.contact[f]);
    prev.fill(0);
    for (let f = 0; f < c.frames; f++) {
      quantise(c, f, now);
      for (let k = 0; k < INTS; k++) w.int(now[k] - prev[k]);
      prev.set(now);
    }
  }
  return w.out();
}

export function decodeMocap(buf: ArrayBuffer | Uint8Array): MoData {
  const r = new Reader(buf instanceof Uint8Array ? buf : new Uint8Array(buf));
  if (r.u32() !== MAGIC) throw new Error('Not a mocap file');
  if (r.u16() !== VERSION) throw new Error('Unknown mocap version');
  const fps = r.u16();
  if (r.u16() !== NB) throw new Error('Mocap bones changed');
  const count = r.u16();
  const pack = r.str();
  const clips: MoClip[] = [];
  const now = new Int32Array(INTS);
  for (let n = 0; n < count; n++) {
    const name = r.str();
    const tags: string[] = [];
    for (let i = r.byte(); i > 0; i--) tags.push(r.str());
    const marks: Mark[] = [];
    for (let i = r.byte(); i > 0; i--) marks.push({ name: r.str(), frame: r.u32(), at: [r.f32(), r.f32(), r.f32()] });
    const g = r.byte();
    const frames = r.u32();
    const root = new Float32Array(frames * 3);
    const hips = new Float32Array(frames * 3);
    const rot = new Float32Array(frames * NB * 4);
    for (let i = 0; i < frames * 3; i++) root[i] = r.f32();
    const flags = r.byte();
    const floor = flags & 1 ? new Float32Array(frames) : undefined;
    if (floor) for (let f = 0; f < frames; f++) floor[f] = r.f32();
    const contact = flags & 2 ? new Uint8Array(frames) : undefined;
    if (contact) for (let f = 0; f < frames; f++) contact[f] = r.byte();
    now.fill(0);
    for (let f = 0; f < frames; f++) {
      for (let k = 0; k < INTS; k++) now[k] += r.int();
      for (let k = 0; k < 3; k++) hips[f * 3 + k] = now[k] / HIPS_Q;
      for (let b = 0; b < NB; b++) {
        const q = f * NB * 4 + b * 4;
        let ss = 0;
        for (let k = 0; k < 3; k++) {
          const x = now[3 + b * 3 + k] / ROT_Q;
          rot[q + k] = x;
          ss += x * x;
        }
        rot[q + 3] = Math.sqrt(Math.max(0, 1 - ss));
        // (renormalise: the three kept numbers are rounded)
        const l = Math.hypot(rot[q], rot[q + 1], rot[q + 2], rot[q + 3]) || 1;
        for (let k = 0; k < 4; k++) rot[q + k] /= l;
      }
    }
    clips.push({ name, tags, marks, pack, frames, root, hips, rot, ...(floor ? { floor } : {}), ...(contact ? { contact } : {}), ...(g < 255 ? { grip: g / 254 } : {}) });
  }
  return { fps, clips };
}

/** Whether a clip (or its mirror) carries a tag */
export const tagged = (c: MoClip, tag: string) => c.tags.includes(tag);

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
  // (the floor is the floor; the contacts swap sides)
  const contact = c.contact ? c.contact.map((b) => ((b & 1) << 1) | ((b >> 1) & 1)) : undefined;
  return { name: `${c.name}~`, tags: c.tags, marks: c.marks.map((m) => ({ ...m, at: [-m.at[0], m.at[1], m.at[2]] })), pack: c.pack, frames: c.frames, root, hips, rot, ...(c.floor ? { floor: c.floor } : {}), ...(contact ? { contact } : {}), mirrored: !c.mirrored, ...(c.grip !== undefined ? { grip: c.grip } : {}) };
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
  // (a stairs take: the pipeline's, found on its steps)
  if (c.contact) {
    for (let f = 0; f < c.frames; f++) {
      out[f * 2] = c.contact[f] & 1;
      out[f * 2 + 1] = (c.contact[f] >> 1) & 1;
    }
    return out;
  }
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
