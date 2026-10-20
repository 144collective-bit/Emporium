/*
 * Degen, built once and dressed many ways.
 *
 * One body after the brand art (balaclava with the eye opening, red cap with
 * the diamond patch, green shades on a gold chain, collar, tie and a lapelled
 * suit) with knees and elbows, so walks and runs can bend. Outfits swap the
 * clothes on that body: suits, hoodies and joggers, soldier fatigues.
 *
 * Two ways to build it:
 * - createDegen(): one figure as a hierarchy of meshes (the player, the
 *   rooftop hologram). Hands carry sockets for things to hold later.
 * - createCrowd(): many figures as instanced parts, a draw call per part
 *   whatever the head count (pedestrians, soldiers).
 * Both are posed with the same Pose, from the pose helpers below.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rifleGeometry } from './guns';
import type { Look } from '../net/profile-data';
import { canvasTex, lit, toon } from './kit';

/* ---------- Outfits ---------- */

export type OutfitKind = 'suit' | 'hoodie' | 'track' | 'soldier';
export interface Outfit {
  kind: OutfitKind;
  /** Jacket, hoodie, track jacket or fatigues */
  top: string;
  /** Trousers or joggers */
  bottom: string;
  shoes: string;
  tie?: string;
  /** Cap colour; leave out for no cap */
  cap?: string;
  /** The cap worn backwards */
  capBack?: boolean;
  /** Beanie or bucket hat colour (instead of a cap) */
  beanie?: string;
  bucket?: string;
  crown?: boolean;
  /** Colour of the shades' lenses (green as in the art) */
  lens?: string;
  /** Hoodie with the hood up (no cap) */
  hood?: boolean;
  backpack?: string;
  crossbody?: string;
  /** Skate deck on the back */
  board?: string;
  headphones?: string;
  /** Gold chain on the shades */
  chain?: boolean;
  /** Gold chain with a diamond round the neck */
  necklace?: boolean;
  /** In the right hand: the Gas Fee Gummy Bears bag, an iced coffee or a boombox */
  held?: 'gummy' | 'coffee' | 'boombox';
  /** Which hand carries a rifle (soldiers) */
  rifle?: 'left' | 'right';
  /** Width and height multipliers, for a bit of variety in build */
  build?: number;
  height?: number;
}

/** Degen as he is in the art. */
export const PLAYER: Outfit = {
  kind: 'suit',
  top: '#16141f',
  bottom: '#16141f',
  shoes: '#1b1830',
  tie: '#1f9d55',
  cap: '#d8312f',
  chain: true,
  held: 'gummy',
};
export const SOLDIER: Outfit = {
  kind: 'soldier',
  top: '#5a6b3a',
  bottom: '#465530',
  shoes: '#2b2a33',
  rifle: 'right',
};

/* ---------- The rig ---------- */

type Joint = 'pelvis' | 'torso' | 'head' | 'armL' | 'armR' | 'foreL' | 'foreR' | 'legL' | 'legR' | 'shinL' | 'shinR' | 'handL' | 'handR';

export interface Rig {
  root: THREE.Object3D;
  hips: THREE.Object3D;
  j: Record<Joint, THREE.Object3D>;
}

/*
 * Proportions: about 1.25 tall to the crown at scale 1 (Degen's height in
 * the city comes from each caller's scale), about six and a half heads, a
 * touch more head than real life so the balaclava, shades and cap still
 * read from the street. Hips at 0.62, knees at 0.33, shoulders at 0.98.
 */
const HIP_Y = 0.62;
/** Hip height (for seating figures on benches) */
export const HIP_HEIGHT = HIP_Y;
/** Bones: the neck and shoulders in the chest's space, then the limbs */
const NECK = 0.41;
const SHOULDER_X = 0.158;
const SHOULDER_Y = 0.36;
const UPPER_ARM = 0.215;
/** The middle of the palm in the forearm's space (the hand's centre) */
const PALM_Y = 0.24;
const PALM_Z = 0.006;
const LEG_X = 0.08;
const THIGH = 0.29;

function makeRig(): Rig {
  const node = (parent: THREE.Object3D, x: number, y: number, z = 0) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const root = new THREE.Object3D();
  const hips = node(root, 0, HIP_Y);
  const torso = node(hips, 0, 0);
  const head = node(torso, 0, NECK);
  const armL = node(torso, -SHOULDER_X, SHOULDER_Y);
  const armR = node(torso, SHOULDER_X, SHOULDER_Y);
  const foreL = node(armL, 0, -UPPER_ARM);
  const foreR = node(armR, 0, -UPPER_ARM);
  const handL = node(foreL, 0, -PALM_Y - 0.01, 0.015);
  const handR = node(foreR, 0, -PALM_Y - 0.01, 0.015);
  const legL = node(hips, -LEG_X, 0);
  const legR = node(hips, LEG_X, 0);
  const shinL = node(legL, 0, -THIGH);
  const shinR = node(legR, 0, -THIGH);
  return {
    root,
    hips,
    j: {
      pelvis: hips,
      torso,
      head,
      armL,
      armR,
      foreL,
      foreR,
      legL,
      legR,
      shinL,
      shinR,
      handL,
      handR,
    },
  };
}

/* ---------- Poses ---------- */

export interface Limb {
  /** Swing forward (radians); negative swings back */
  fwd: number;
  /** Away from the body, to the side */
  out: number;
  /** Elbow or knee bend */
  bend: number;
  /** Arms only: the upper arm turned about its own length (set by reachArm) */
  twist?: number;
}
export interface Pose {
  bob: number;
  lean: number;
  twist: number;
  /** Weight shift, a sideways tilt of the hips */
  side: number;
  headYaw: number;
  headPitch: number;
  arms: [Limb, Limb];
  legs: [Limb, Limb];
}

export const newPose = (): Pose => ({
  bob: 0,
  lean: 0,
  twist: 0,
  side: 0,
  headYaw: 0,
  headPitch: 0,
  arms: [
    { fwd: 0, out: 0.08, bend: 0.15 },
    { fwd: 0, out: 0.08, bend: 0.15 },
  ],
  legs: [
    { fwd: 0, out: 0.02, bend: 0.04 },
    { fwd: 0, out: 0.02, bend: 0.04 },
  ],
});

function applyPose(r: Rig, p: Pose) {
  r.hips.position.y = HIP_Y + p.bob;
  r.hips.rotation.z = p.side;
  r.j.torso.rotation.set(p.lean, p.twist, -p.side * 0.6);
  r.j.head.rotation.set(-p.headPitch - p.lean * 0.6, p.headYaw - p.twist * 0.8, p.side * 0.4);
  for (let i = 0; i < 2; i++) {
    const s = i === 0 ? -1 : 1;
    const a = p.arms[i];
    (i === 0 ? r.j.armL : r.j.armR).rotation.set(-a.fwd, a.twist ?? 0, s * a.out);
    (i === 0 ? r.j.foreL : r.j.foreR).rotation.set(-a.bend, 0, 0);
    const l = p.legs[i];
    (i === 0 ? r.j.legL : r.j.legR).rotation.set(-l.fwd, 0, s * l.out - p.side);
    (i === 0 ? r.j.shinL : r.j.shinR).rotation.set(l.bend, 0, 0);
  }
}

const set = (l: Limb, fwd: number, out: number, bend: number) => {
  l.fwd = fwd;
  l.out = out;
  l.bend = bend;
  l.twist = 0;
};

/**
 * Walking and running. `phase` advances with distance covered, `stride`
 * 0..1 scales the whole cycle (0 = standing), `run` 0..1 blends to a run.
 */
export function walkPose(p: Pose, phase: number, stride: number, run: number, armSwing = 1) {
  const A = (0.42 + run * 0.36) * stride;
  for (let i = 0; i < 2; i++) {
    const ph = phase + i * Math.PI;
    const s = Math.sin(ph);
    const c = Math.cos(ph);
    // Knees bend most while the leg swings through, a little at the heel strike
    set(p.legs[i], A * s, 0.02, 0.06 + stride * (0.5 + run * 0.85) * Math.max(0, c) + stride * 0.12 * Math.max(0, -s));
    // Arms swing against the legs, elbows tighten as you speed up
    set(p.arms[1 - i], A * 0.95 * s * armSwing + run * 0.15, 0.08 + run * 0.06, 0.2 + run * 1.05 + 0.15 * stride * Math.max(0, s));
  }
  p.bob = (Math.abs(Math.cos(phase)) - 0.6) * 0.03 * stride * (1 + run * 1.2);
  p.lean = 0.03 * stride + run * 0.24;
  p.twist = Math.sin(phase) * 0.08 * stride;
  p.side = Math.sin(phase) * 0.025 * stride;
  p.headYaw = 0;
  p.headPitch = 0;
}

/** Standing: breathing, a slow weight shift. */
export function idlePose(p: Pose, t: number, seed = 0) {
  const sh = Math.sin(t * 0.35 + seed);
  p.bob = Math.sin(t * 1.6 + seed) * 0.003 - Math.abs(sh) * 0.008;
  p.lean = 0.01;
  p.twist = 0;
  p.side = sh * 0.035;
  set(p.arms[0], 0.03, 0.09 + Math.sin(t * 1.6 + seed) * 0.01, 0.18);
  set(p.arms[1], 0.03, 0.09, 0.18);
  set(p.legs[0], 0, 0.04, 0.04 + Math.max(0, -sh) * 0.1);
  set(p.legs[1], 0, 0.04, 0.04 + Math.max(0, sh) * 0.1);
  p.headYaw = 0;
  p.headPitch = 0;
}

/** Looking around while standing. */
export function lookPose(p: Pose, t: number, seed = 0) {
  idlePose(p, t, seed);
  p.headYaw = Math.sin(t * 0.37 + seed * 2) * 0.55 + Math.sin(t * 0.13 + seed) * 0.3;
  p.headPitch = Math.sin(t * 0.21 + seed) * 0.12;
}

/** Talking with a group: gestures with one hand, nods, now and then both hands. */
export function chatPose(p: Pose, t: number, seed = 0) {
  idlePose(p, t, seed);
  const talk = Math.sin(t * 0.5 + seed * 3) > -0.2;
  if (talk) {
    set(p.arms[1], 0.55 + Math.sin(t * 2.3 + seed) * 0.3, 0.16, 1.25 + Math.sin(t * 3.1 + seed) * 0.35);
    if (Math.sin(t * 0.9 + seed) > 0.4) set(p.arms[0], 0.45 + Math.sin(t * 2.0 + seed) * 0.2, 0.14, 1.1);
    p.headPitch = Math.sin(t * 2.6 + seed) * 0.06;
  } else {
    // Listening: hands in pockets, the odd nod
    set(p.arms[0], -0.05, 0.1, 0.45);
    set(p.arms[1], -0.05, 0.1, 0.45);
    p.headPitch = Math.max(0, Math.sin(t * 1.4 + seed)) * -0.12;
  }
  p.headYaw = Math.sin(t * 0.3 + seed) * 0.25;
}

/** Sitting on a bench: thighs level, hands on the knees. Hips sit HIP_HEIGHT - 0.03 above the feet's root. */
export function sitPose(p: Pose, t: number, seed = 0) {
  p.bob = -0.03;
  p.lean = -0.08 + Math.sin(t * 0.3 + seed) * 0.03;
  p.twist = 0;
  p.side = 0;
  set(p.legs[0], 1.5, 0.08, 1.45);
  set(p.legs[1], 1.5, 0.08, 1.45);
  set(p.arms[0], 0.55, 0.12, 0.7);
  set(p.arms[1], 0.55, 0.12, 0.7);
  p.headYaw = Math.sin(t * 0.25 + seed) * 0.5;
  p.headPitch = 0.05;
}

/** In the air: knees up, arms out for balance. `a` 0..1 blends it over whatever pose is set. */
export function airPose(p: Pose, a: number) {
  if (a <= 0) return;
  const mix = (l: Limb, fwd: number, out: number, bend: number) => {
    l.fwd += (fwd - l.fwd) * a;
    l.out += (out - l.out) * a;
    l.bend += (bend - l.bend) * a;
  };
  mix(p.legs[0], 0.7, 0.06, 1.1);
  mix(p.legs[1], -0.1, 0.06, 0.55);
  mix(p.arms[0], 0.5, 0.7, 0.6);
  mix(p.arms[1], 0.3, 0.75, 0.5);
  p.lean += (0.1 - p.lean) * a;
  p.bob *= 1 - a;
}

/** Soldier on parade: a crisp march, arms straighter, the rifle hand still. */
export function marchPose(p: Pose, phase: number, rifle: 'left' | 'right') {
  walkPose(p, phase, 1, 0.15, 1.1);
  for (const l of p.legs) l.bend *= 1.25;
  for (const a of p.arms) a.bend = 0.12;
  const r = p.arms[rifle === 'left' ? 0 : 1];
  set(r, 0.05, 0.1, 0.35);
  p.lean = 0.02;
  p.twist *= 0.4;
}

/** Standing to attention, `salute` 0..1 brings the free hand to the brow. */
export function attentionPose(p: Pose, salute: number, rifle: 'left' | 'right') {
  idlePose(p, 0, 0);
  p.side = 0;
  for (const l of p.legs) set(l, 0, 0.02, 0.03);
  const held = p.arms[rifle === 'left' ? 0 : 1];
  set(held, 0.05, 0.1, 0.35);
  const free = p.arms[rifle === 'left' ? 1 : 0];
  set(free, 0.02 + salute * 2.0, 0.07 + salute * 0.45, 0.12 + salute * 2.0);
  p.headPitch = salute * 0.05;
}

/** A dance for the rooftop hologram, on a two-beats-a-second groove. */
export function dancePose(p: Pose, t: number) {
  const b = t * Math.PI * 2;
  const beat = Math.pow(1 - ((t * 2) % 1), 3);
  p.bob = -beat * 0.05;
  p.lean = 0.05 + beat * 0.06;
  p.twist = Math.sin(b * 0.5) * 0.35;
  p.side = Math.sin(b * 0.5) * 0.06;
  set(p.arms[0], 2.4 + Math.sin(b) * 0.4, 0.4, 0.4);
  set(p.arms[1], 2.4 - Math.sin(b) * 0.4, 0.4, 0.4);
  set(p.legs[0], 0.1 + Math.max(0, Math.sin(b)) * 0.4, 0.12, 0.25 + beat * 0.3 + Math.max(0, Math.sin(b)) * 0.6);
  set(p.legs[1], 0.1 + Math.max(0, -Math.sin(b)) * 0.4, 0.12, 0.25 + beat * 0.3 + Math.max(0, -Math.sin(b)) * 0.6);
  p.headPitch = -beat * 0.15;
  p.headYaw = Math.sin(b * 0.5) * 0.2;
}

/* ---------- Reaching (hands on a gun) ---------- */

const PALM_R = Math.hypot(PALM_Y, PALM_Z);
const PALM_TILT = Math.atan2(PALM_Z, PALM_Y);
/** Shoulders in the chest's space (arms[0] is the rig's -x arm, arms[1] the +x one) */
const SHOULDERS = [new THREE.Vector3(-SHOULDER_X, SHOULDER_Y, 0), new THREE.Vector3(SHOULDER_X, SHOULDER_Y, 0)] as const;

/** How far a palm can be from its shoulder */
export const ARM_REACH = UPPER_ARM + PALM_R;

/** Distance from arm `i`'s shoulder to a point in the chest's space */
export const shoulderTo = (i: 0 | 1, at: THREE.Vector3) => SHOULDERS[i].distanceTo(at);

const rN = new THREE.Vector3();
const rM = new THREE.Vector3();
const rE = new THREE.Vector3();
const rX = new THREE.Vector3();
const rY = new THREE.Vector3();
const rZ = new THREE.Vector3();
const rMat = new THREE.Matrix4();
const rEuler = new THREE.Euler();

/**
 * Two-bone reach: swing, turn and bend arm `i` so the middle of its palm
 * lands on `target` (in the chest's space). The elbow hangs down, a little
 * out and back, like holding a gun. Out of reach, the arm points at it fully
 * stretched.
 */
export function reachArm(p: Pose, i: 0 | 1, target: THREE.Vector3) {
  const s = i === 0 ? -1 : 1;
  const S = SHOULDERS[i];
  rN.subVectors(target, S);
  const len = rN.length() || 1e-6;
  rN.divideScalar(len);
  const d = THREE.MathUtils.clamp(len, Math.abs(UPPER_ARM - PALM_R) + 0.03, ARM_REACH - 0.002);
  // The triangle shoulder, elbow, palm: the elbow's bend and the angle at the shoulder
  const cosElbow = THREE.MathUtils.clamp((UPPER_ARM * UPPER_ARM + PALM_R * PALM_R - d * d) / (2 * UPPER_ARM * PALM_R), -1, 1);
  const bend = Math.max(0, Math.PI - Math.acos(cosElbow) - PALM_TILT);
  const cosShoulder = THREE.MathUtils.clamp((UPPER_ARM * UPPER_ARM + d * d - PALM_R * PALM_R) / (2 * UPPER_ARM * d), -1, 1);
  // Where the elbow goes: off the shoulder-to-hand line, towards down, out and back
  rM.set(s * 0.45, -1, -0.35).normalize();
  rM.addScaledVector(rN, -rM.dot(rN));
  if (rM.lengthSq() < 1e-6) rM.set(0, 0, -1).addScaledVector(rN, -rN.z);
  rM.normalize();
  rE.copy(S)
    .addScaledVector(rN, UPPER_ARM * cosShoulder)
    .addScaledVector(rM, UPPER_ARM * Math.sqrt(1 - cosShoulder * cosShoulder));
  // The upper arm's frame: +y up the arm, +z the way the forearm bends
  rY.subVectors(S, rE).normalize();
  rZ.copy(S).addScaledVector(rN, d).sub(rE);
  rZ.addScaledVector(rY, -rZ.dot(rY)).normalize();
  rX.crossVectors(rY, rZ);
  rEuler.setFromRotationMatrix(rMat.makeBasis(rX, rY, rZ), 'XYZ');
  const l = p.arms[i];
  l.fwd = -rEuler.x;
  l.twist = rEuler.y;
  l.out = s * rEuler.z;
  l.bend = bend;
}

/** Multiplayer emotes (ids from EMOTES in profile-data.ts); `t` is seconds since it started */
export function emotePose(p: Pose, id: string, t: number) {
  if (id === 'dance') return dancePose(p, t);
  if (id === 'salute') return attentionPose(p, Math.min(1, t * 4), 'right');
  idlePose(p, t);
  if (id === 'wave') {
    set(p.arms[0], 2.55, 0.3 + Math.sin(t * 10) * 0.28, 0.55);
    p.headPitch = -0.08;
  } else if (id === 'cheer') {
    const hop = Math.abs(Math.sin(t * 7));
    p.bob = hop * 0.04;
    set(p.arms[0], 2.75, 0.32, 0.25 + hop * 0.3);
    set(p.arms[1], 2.75, 0.32, 0.25 + hop * 0.3);
    p.headPitch = -0.15;
  }
}

/** A player's wardrobe choices as a Degen outfit */
export function lookOutfit(l: Look): Outfit {
  const hat = l.kind === 'hoodie' && l.hood ? null : l.hat;
  const bag = (k: Look['bag']) => (l.bag === k ? l.bagColor : undefined);
  return {
    kind: l.kind,
    top: l.top,
    bottom: l.bottom,
    shoes: l.shoes,
    tie: l.kind === 'suit' ? l.tie : undefined,
    cap: hat === 'cap' || hat === 'backcap' ? l.hatColor : undefined,
    capBack: hat === 'backcap',
    beanie: hat === 'beanie' ? l.hatColor : undefined,
    bucket: hat === 'bucket' ? l.hatColor : undefined,
    crown: hat === 'crown',
    hood: l.kind === 'hoodie' && l.hood,
    lens: l.lens,
    headphones: l.headphones ?? undefined,
    backpack: bag('backpack'),
    crossbody: bag('crossbody'),
    board: bag('board'),
    chain: l.chain,
    necklace: l.necklace,
    held: l.held ?? undefined,
  };
}

/* ---------- Shapes ---------- */

/** Detail level: 0 the light (phone) crowd, 1 the crowd, 2 a single figure (the player, the hologram) */
export type Detail = 0 | 1 | 2;

/** A cross-section: height, half-width, half-depth and how far forward its middle sits */
type Sec = [y: number, hw: number, hd: number, z?: number];

const sorted = (secs: Sec[]) => [...secs].sort((a, b) => a[0] - b[0]);

/**
 * A smooth closed body through cross-sections up y: superellipse rings
 * (`n` 2 is an ellipse, higher is boxier), each end closed on its middle.
 * Ending on a tiny section makes a dome.
 */
function loft(secs: Sec[], seg: number, n = 2) {
  const ss = sorted(secs);
  const R = ss.length;
  const pos: number[] = [];
  const idx: number[] = [];
  const e = 2 / n;
  for (const [y, hw, hd, z = 0] of ss)
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      pos.push(Math.sign(c) * Math.abs(c) ** e * hw, y, z + Math.sign(s) * Math.abs(s) ** e * hd);
    }
  for (let i = 0; i < R - 1; i++)
    for (let k = 0; k < seg; k++) {
      const a = i * seg + k;
      const b = i * seg + ((k + 1) % seg);
      idx.push(a, a + seg, b, b, a + seg, b + seg);
    }
  const lo = R * seg;
  pos.push(0, ss[0][0], ss[0][3] ?? 0, 0, ss[R - 1][0], ss[R - 1][3] ?? 0);
  for (let k = 0; k < seg; k++) {
    const k1 = (k + 1) % seg;
    idx.push(lo, k, k1, lo + 1, (R - 1) * seg + k1, (R - 1) * seg + k);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Where a loft's surface is at (x, y): its front (side 1) or back (side -1) */
function surface(secs: Sec[], n = 2, side = 1) {
  const ss = sorted(secs);
  return (x: number, y: number) => {
    let i = 0;
    while (i < ss.length - 2 && y > ss[i + 1][0]) i++;
    const [y0, w0, d0, z0 = 0] = ss[i];
    const [y1, w1, d1, z1 = 0] = ss[i + 1];
    const f = THREE.MathUtils.clamp((y - y0) / (y1 - y0 || 1), 0, 1);
    const hw = w0 + (w1 - w0) * f;
    const hd = d0 + (d1 - d0) * f;
    const u = Math.min(0.995, Math.abs(x) / hw);
    return z0 + (z1 - z0) * f + side * hd * (1 - u ** n) ** (1 / n);
  };
}

/** How finely flat pieces are split to follow a curved body: single figures only (a crowd's are lifted a touch instead) */
let bend = 0;
/** A flat shape (x, y) with a little thickness, lying on a surface `lift` above it */
function onBody(pts: [number, number][] | THREE.Shape, depth: number, surf: (x: number, y: number) => number, lift: number, side = 1) {
  const shape = Array.isArray(pts) ? new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))) : pts;
  const flatG = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 });
  const g = bend ? tessellate(flatG, bend) : flatG;
  if (!bend) lift += 0.003;
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, surf(x, y) + side * (lift + p.getZ(i)));
  }
  if (side < 0) flipFaces(g);
  g.computeVertexNormals();
  return g;
}
/** Split a geometry's triangles across their longest edges until none is longer than `max` (so a flat piece can bend over a body) */
function tessellate(g: THREE.BufferGeometry, max: number) {
  const src = (g.index ? g.toNonIndexed() : g).attributes.position.array as ArrayLike<number>;
  const out: number[] = [];
  const v = (i: number) => [src[i], src[i + 1], src[i + 2]];
  const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const len = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const split = (a: number[], b: number[], c: number[]): void => {
    const ab = len(a, b);
    const bc = len(b, c);
    const ca = len(c, a);
    const top = Math.max(ab, bc, ca);
    if (top <= max) {
      out.push(...a, ...b, ...c);
      return;
    }
    if (top === ab) {
      const m = mid(a, b);
      split(a, m, c);
      split(m, b, c);
    } else if (top === bc) {
      const m = mid(b, c);
      split(a, b, m);
      split(a, m, c);
    } else {
      const m = mid(c, a);
      split(a, b, m);
      split(m, b, c);
    }
  };
  for (let i = 0; i < src.length; i += 9) split(v(i), v(i + 3), v(i + 6));
  g.dispose();
  const t = new THREE.BufferGeometry();
  t.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  t.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((out.length / 3) * 2), 2));
  return t;
}
/** Turn a non-indexed geometry's faces inside out (after mirroring it front to back) */
function flipFaces(g: THREE.BufferGeometry) {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i += 3) {
    for (let k = 0; k < 3; k++) {
      const t = p.getComponent(i + 1, k);
      p.setComponent(i + 1, k, p.getComponent(i + 2, k));
      p.setComponent(i + 2, k, t);
    }
  }
}

/** A rounded rectangle (or superellipse, `n` higher is squarer) centred on the origin */
function roundRect(w: number, h: number, n = 4, pts = 24, squeeze = 0, cy = 0) {
  const s = new THREE.Shape();
  for (let k = 0; k < pts; k++) {
    const a = (k / pts) * Math.PI * 2;
    const c = Math.cos(a);
    const si = Math.sin(a);
    const y = Math.sign(si) * Math.abs(si) ** (2 / n) * (h / 2);
    // `squeeze` narrows the bottom (the shades' lenses)
    const x = Math.sign(c) * Math.abs(c) ** (2 / n) * (w / 2) * (1 - squeeze * Math.max(0, -y / (h / 2)));
    if (k === 0) s.moveTo(x, y + cy);
    else s.lineTo(x, y + cy);
  }
  s.closePath();
  return s;
}

/**
 * A side profile (forward, up) turned into a solid `w` wide, rounded at the
 * edges (shoes). The first two points are the flat bottom; the rest is a
 * smooth curve over the toe, the top and the heel.
 */
function profile(pts: [number, number][], w: number, round: number, curve = 6) {
  const v = pts.map(([u, y]) => new THREE.Vector2(u, y));
  const s = new THREE.Shape().moveTo(v[0].x, v[0].y).lineTo(v[1].x, v[1].y);
  s.splineThru(v.slice(2).concat([v[0]]));
  const g = new THREE.ExtrudeGeometry(s, {
    depth: w - round * 2,
    bevelEnabled: round > 0,
    bevelThickness: round,
    bevelSize: round,
    bevelOffset: -round,
    bevelSegments: 2,
    curveSegments: curve,
  });
  g.translate(0, 0, -(w - round * 2) / 2);
  return g.rotateY(-Math.PI / 2);
}

const tube = (pts: [number, number, number][], r: number, seg: number, rad = 5) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))), seg, r, rad);

/** A seam line over a loft's surface at angle `a` (0 is +x, PI/2 the front) */
function meridian(secs: Sec[], n: number, a: number, from: number, r: number, lift = 1.012) {
  const e = 2 / n;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const pts = sorted(secs)
    .filter(([y]) => y >= from)
    .map(([y, hw, hd, z = 0]): [number, number, number] => [Math.sign(c) * Math.abs(c) ** e * hw * lift, y, z + Math.sign(s) * Math.abs(s) ** e * hd * lift]);
  return tube(pts, r, pts.length * 3, 4);
}

const rbox = (w: number, h: number, d: number, r: number, x = 0, y = 0, z = 0) => new RoundedBoxGeometry(w, h, d, 2, r).translate(x, y, z);
const flat = (pts: [number, number][], z: number, depth: number) => {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false });
  g.translate(0, 0, z);
  return g;
};
const mirror = (pts: [number, number][]) => pts.map(([x, y]) => [-x, y] as [number, number]).reverse();
/** Wider or narrower everywhere, for looser clothes on the same body */
const grow = (secs: Sec[], k: number, dz = 0): Sec[] => secs.map(([y, hw, hd, z = 0]) => [y, hw * k, hd * k, z + dz]);

/** Strip a geometry to what merging needs: no index, position, normal, uv */
function plain(g: THREE.BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g.clone();
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
  if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
  if (!n.attributes.normal) n.computeVertexNormals();
  return n;
}
/** Merge geometries, each painted one colour per vertex */
function paintMerge(list: { geo: THREE.BufferGeometry; color: THREE.Color }[]) {
  return mergeGeometries(
    list.map(({ geo, color }) => {
      const n = plain(geo);
      const c = new Float32Array(n.attributes.position.count * 3);
      for (let i = 0; i < c.length; i += 3) {
        c[i] = color.r;
        c[i + 1] = color.g;
        c[i + 2] = color.b;
      }
      n.setAttribute('color', new THREE.BufferAttribute(c, 3));
      return n;
    })
  )!;
}

/* ---------- The wardrobe: items, each a set of pieces on the rig's joints ---------- */

type ColorKey = 'top' | 'bottom' | 'shoes' | 'tie' | 'cap' | 'beanie' | 'bucket' | 'backpack' | 'crossbody' | 'board' | 'headphones';
/** Pieces with a material of their own: the shades' lenses, the cap patch, the gummy bag, the raised hood (both sides drawn) */
type Mat = 'lens' | 'patch' | 'gummy' | 'double';
interface Piece {
  joint: Joint;
  geo: THREE.BufferGeometry;
  /** A fixed colour, or the outfit colour it takes */
  color: string | ColorKey;
  /** Darker or lighter than the outfit colour (lapels, ribbing) */
  shade?: number;
  mat?: Mat;
  /** Small details left out of the light (phone) crowd */
  detail?: boolean;
}
interface Item {
  id: string;
  when: (o: Outfit) => boolean;
  pieces: Piece[];
  /** Carried in the right hand (put away while Degen holds a gun) */
  held?: boolean;
}

const SKIN = '#e8c39e';
const BLACK = '#16141f';
const WHITE = '#f3f2f7';
/** Shirts a shade under white, so the key light doesn't bloom them */
const SHIRT = '#cfcedb';
const GOLD = '#e2b04a';

const itemsCache: Partial<Record<Detail, Item[]>> = {};
const texCache: { patch?: THREE.Texture; gummy?: THREE.Texture } = {};

function items(q: Detail): Item[] {
  if (itemsCache[q]) return itemsCache[q]!;
  /** Ring segments at this detail level */
  const R = (n: number) => Math.max(6, Math.round(n * [0.5, 0.7, 1][q]));
  const L = (s: number) => (q === 2 ? s : Math.max(2, Math.round(s * 0.6)));
  bend = q === 2 ? 0.03 : 0;
  const P = (joint: Joint, geo: THREE.BufferGeometry, color: string | ColorKey, extra: Partial<Piece> = {}): Piece => ({ joint, geo, color, ...extra });
  /** The same piece on both sides (one geometry, or one per side for things that sit on the outside) */
  const both = (
    kind: 'arm' | 'fore' | 'leg' | 'shin' | 'hand',
    geo: THREE.BufferGeometry | THREE.BufferGeometry[],
    color: string | ColorKey,
    extra: Partial<Piece> = {}
  ): Piece[] => (['L', 'R'] as const).map((s, i) => P(`${kind}${s}`, Array.isArray(geo) ? geo[i] : geo, color, extra));

  const suit = (o: Outfit) => o.kind === 'suit';
  const hoodie = (o: Outfit) => o.kind === 'hoodie';
  const track = (o: Outfit) => o.kind === 'track';
  const soldier = (o: Outfit) => o.kind === 'soldier';
  const casual = (o: Outfit) => o.kind === 'hoodie' || o.kind === 'track';
  const bare = (o: Outfit) => !o.hood && o.kind !== 'soldier';
  const hasCap = (o: Outfit) => !!o.cap && !o.beanie && !o.bucket && !o.crown && bare(o);

  /* ----- Head: the balaclava over a real head shape, the eye opening, the shades ----- */
  const HEAD: Sec[] = [
    [-0.045, 0.045, 0.048, -0.008],
    [0.028, 0.047, 0.05, -0.006],
    [0.048, 0.062, 0.074, 0.008],
    [0.07, 0.076, 0.09, 0.008],
    [0.1, 0.086, 0.098, 0.004],
    [0.138, 0.09, 0.1, 0],
    [0.178, 0.085, 0.095, -0.004],
    [0.204, 0.069, 0.079, -0.007],
    [0.221, 0.044, 0.052, -0.008],
    [0.23, 0.012, 0.015, -0.008],
  ];
  const HN = 2.5;
  const face = surface(HEAD, HN);
  const EYE_Y = 0.126;
  const skull = loft(HEAD, R(20), HN);
  const nose = new THREE.SphereGeometry(0.016, R(10), R(8)).scale(0.75, 1.25, 0.9).translate(0, 0.094, face(0, 0.094) - 0.009);
  const ears = [-1, 1].map((s) => new THREE.SphereGeometry(0.022, R(10), R(8)).scale(0.45, 1, 0.75).translate(s * 0.086, 0.125, 0.004));
  // The balaclava bunches where it meets the collar
  const folds = [0.014, 0.034].map((y, k) =>
    new THREE.TorusGeometry(0.048 + k * 0.002, 0.006, 5, R(18))
      .rotateX(Math.PI / 2)
      .scale(1, 1, 1.06)
      .translate(0, y, -0.006)
  );
  const eyesSkin = onBody(roundRect(0.15, 0.058, 5, R(28), 0, EYE_Y + 0.003), 0.004, face, 0.0005);
  // Shades: two rounded lenses in thick black frames, a bridge and arms back to the ears
  const lensShape = () => roundRect(0.064, 0.038, 4, R(24), 0.18);
  const frameShape = () => {
    const s = roundRect(0.078, 0.05, 4, R(24), 0.16);
    s.holes.push(new THREE.Path(lensShape().getPoints().reverse()));
    return s;
  };
  const lensZ = face(0, EYE_Y) + 0.012;
  const atEye = (g: THREE.BufferGeometry, s: number, dz: number) => g.rotateY(s * 0.24).translate(s * 0.043, EYE_Y, lensZ + dz - Math.abs(s) * 0.004);
  const frames = [
    ...[-1, 1].map((s) =>
      atEye(
        new THREE.ExtrudeGeometry(frameShape(), {
          depth: 0.011,
          bevelEnabled: false,
          curveSegments: 4,
        }),
        s,
        0
      )
    ),
    new THREE.BoxGeometry(0.018, 0.009, 0.01).translate(0, EYE_Y + 0.008, lensZ + 0.006),
    ...[-1, 1].map((s) => new THREE.BoxGeometry(0.008, 0.009, 0.115).rotateY(s * 0.08).translate(s * 0.088, EYE_Y + 0.01, 0.04)),
  ];
  const lenses = [-1, 1].map((s) =>
    atEye(
      new THREE.ExtrudeGeometry(lensShape(), {
        depth: 0.006,
        bevelEnabled: false,
        curveSegments: 4,
      }),
      s,
      0.003
    )
  );
  // The gold chain from the shades' arms, under the chin and round the neck
  const chain = tube(
    [
      [-0.094, EYE_Y + 0.006, 0.03],
      [-0.1, 0.06, 0.04],
      [-0.085, -0.02, 0.07],
      [-0.045, -0.07, 0.1],
      [0, -0.085, 0.112],
      [0.045, -0.07, 0.1],
      [0.085, -0.02, 0.07],
      [0.1, 0.06, 0.04],
      [0.094, EYE_Y + 0.006, 0.03],
    ],
    0.0035,
    R(36),
    4
  );

  /* ----- Hats ----- */
  const CAP: Sec[] = [
    [0.168, 0.095, 0.105, -0.004],
    [0.198, 0.094, 0.103, -0.005],
    [0.228, 0.083, 0.091, -0.007],
    [0.25, 0.06, 0.066, -0.008],
    [0.262, 0.03, 0.033, -0.008],
    [0.266, 0.004, 0.004, -0.008],
  ];
  const capFront = surface(CAP);
  const brim = (() => {
    const s = new THREE.Shape();
    const n = R(20);
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * Math.PI;
      const x = Math.cos(a) * 0.1;
      const z = Math.sin(a) * 0.18;
      if (k === 0) s.moveTo(x, z);
      else s.lineTo(x, z);
    }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 1,
      curveSegments: 4,
    });
    g.rotateX(Math.PI / 2);
    // Curved down at the sides, pitched down at the front
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) - p.getX(i) ** 2 * 2.0);
    g.computeVertexNormals();
    return g.rotateX(0.07).translate(0, 0.177, -0.006);
  })();
  const capParts = (flip: boolean) => {
    const turn = (g: THREE.BufferGeometry) => (flip ? g.rotateY(Math.PI) : g);
    return {
      crown: [loft(CAP, R(20)), brim.clone(), new THREE.SphereGeometry(0.011, R(8), R(6)).translate(0, 0.267, -0.008)].map(turn),
      // Six panels: seams over the crown, darker than the cap
      seams: [Math.PI / 6, (Math.PI * 5) / 6, (Math.PI * 7) / 6, (Math.PI * 11) / 6, (Math.PI * 3) / 2].map((a) => turn(meridian(CAP, 2, a, 0.18, 0.0022))),
      patch: turn(new THREE.PlaneGeometry(0.044, 0.03).rotateX(-0.5).translate(0, 0.214, capFront(0, 0.214) + 0.004)),
    };
  };
  const cap = capParts(false);
  const capBack = capParts(true);
  const BEANIE: Sec[] = [
    [0.19, 0.094, 0.103, -0.005],
    [0.215, 0.087, 0.096, -0.006],
    [0.245, 0.068, 0.075, -0.007],
    [0.266, 0.038, 0.042, -0.008],
    [0.273, 0.004, 0.004, -0.008],
  ];
  const beanie = [loft(BEANIE, R(20)), new THREE.SphereGeometry(0.022, R(10), R(8)).translate(0, 0.285, -0.008)];
  // The turned-up cuff, a shade darker
  const beanieCuff = loft(
    [
      [0.158, 0.097, 0.107, -0.004],
      [0.198, 0.098, 0.108, -0.004],
    ],
    R(20)
  );
  const beaniePatch = new THREE.PlaneGeometry(0.042, 0.026).translate(0, 0.178, 0.107);
  const bucket = [
    loft(
      [
        [0.158, 0.097, 0.107, -0.004],
        [0.235, 0.085, 0.094, -0.006],
        [0.245, 0.06, 0.066, -0.006],
        [0.248, 0.001, 0.001, -0.006],
      ],
      R(20)
    ),
    new THREE.LatheGeometry(
      [
        [0.098, 0.17],
        [0.16, 0.134],
        [0.16, 0.126],
        [0.098, 0.16],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      R(24)
    )
      .scale(1, 1, 1.07)
      .translate(0, 0, -0.005),
  ];
  const bucketBand = loft(
    [
      [0.165, 0.099, 0.109, -0.004],
      [0.185, 0.097, 0.107, -0.004],
    ],
    R(20)
  );
  const crown = [
    new THREE.CylinderGeometry(0.074, 0.068, 0.05, R(18), 1, true).translate(0, 0.225, -0.006),
    new THREE.CylinderGeometry(0.068, 0.068, 0.006, R(18)).translate(0, 0.203, -0.006),
    ...[0, 1, 2, 3, 4].flatMap((k) => {
      const a = (k / 5) * Math.PI * 2;
      const x = Math.sin(a) * 0.07;
      const z = Math.cos(a) * 0.07 - 0.006;
      return [new THREE.ConeGeometry(0.022, 0.05, R(6)).translate(x, 0.272, z), new THREE.SphereGeometry(0.013, R(8), R(6)).translate(x, 0.3, z)];
    }),
  ];
  const crownGem = new THREE.SphereGeometry(0.013, R(8), R(6)).scale(1, 1.2, 0.6).translate(0, 0.225, 0.07);
  const hoodUp = new THREE.SphereGeometry(0.112, R(18), R(12), Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0, Math.PI * 0.74).scale(1, 1.16, 1.12).translate(0, 0.12, -0.012);
  const HELMET: Sec[] = [
    [0.152, 0.101, 0.112, -0.004],
    [0.2, 0.096, 0.106, -0.005],
    [0.238, 0.074, 0.082, -0.007],
    [0.26, 0.036, 0.04, -0.008],
    [0.265, 0.004, 0.004, -0.008],
  ];
  const helmet = [
    loft(HELMET, R(20)),
    new THREE.TorusGeometry(0.104, 0.01, 5, R(24))
      .rotateX(Math.PI / 2)
      .scale(1, 1, 1.1)
      .translate(0, 0.153, -0.004),
  ];

  /* ----- Torsos ----- */
  const SUIT: Sec[] = [
    [-0.085, 0.142, 0.094, 0],
    [-0.02, 0.138, 0.092, 0],
    [0.1, 0.127, 0.088, 0.002],
    [0.2, 0.148, 0.1, 0.006],
    [0.29, 0.165, 0.1, 0.004],
    [0.345, 0.172, 0.09, 0],
    [0.38, 0.152, 0.076, -0.004],
    [0.405, 0.098, 0.066, -0.006],
    [0.418, 0.058, 0.054, -0.006],
  ];
  const SN = 2.6;
  const suitFront = surface(SUIT, SN);
  const lapelPts: [number, number][] = [
    [-0.062, 0.41],
    [-0.002, 0.198],
    [-0.012, 0.168],
    [-0.088, 0.25],
    [-0.106, 0.318],
    [-0.128, 0.326],
    [-0.12, 0.372],
  ];
  const jacket = loft(SUIT, R(22), SN);
  const lapels = [onBody(lapelPts, 0.009, suitFront, 0.003), onBody(mirror(lapelPts), 0.009, suitFront, 0.003)];
  const flaps = [-1, 1].map((s) =>
    onBody(
      [
        [s * 0.042, 0.052],
        [s * 0.112, 0.05],
        [s * 0.112, 0.03],
        [s * 0.042, 0.032],
      ] as [number, number][],
      0.005,
      suitFront,
      0.001
    )
  );
  const shirtFront = onBody(
    [
      [-0.064, 0.412],
      [0, 0.19],
      [0.064, 0.412],
    ],
    0.004,
    suitFront,
    0.001
  );
  const collarBand = new THREE.CylinderGeometry(0.056, 0.06, 0.034, R(16), 1, true).translate(0, 0.414, -0.004);
  const collarPts: [number, number][] = [
    [-0.054, 0.428],
    [-0.01, 0.396],
    [-0.046, 0.382],
  ];
  const collars = [onBody(collarPts, 0.004, suitFront, 0.008), onBody(mirror(collarPts), 0.004, suitFront, 0.008)];
  const pocketSquare = onBody(
    [
      [0.084, 0.272],
      [0.118, 0.272],
      [0.108, 0.292],
      [0.096, 0.284],
      [0.09, 0.294],
    ],
    0.004,
    suitFront,
    0.002
  );
  const button = new THREE.CylinderGeometry(0.008, 0.008, 0.005, R(10)).rotateX(Math.PI / 2).translate(0, 0.15, suitFront(0, 0.15) + 0.003);
  const tieKnot = onBody(
    [
      [-0.016, 0.398],
      [0.016, 0.398],
      [0.011, 0.372],
      [-0.011, 0.372],
    ],
    0.01,
    suitFront,
    0.004
  );
  const tieBlade = onBody(
    [
      [-0.01, 0.374],
      [0.01, 0.374],
      [0.024, 0.236],
      [0, 0.21],
      [-0.024, 0.236],
    ],
    0.006,
    suitFront,
    0.005
  );

  const HOODIE: Sec[] = [
    [-0.085, 0.148, 0.1, 0],
    [0.0, 0.15, 0.102, 0],
    [0.12, 0.148, 0.1, 0.002],
    [0.23, 0.162, 0.108, 0.006],
    [0.31, 0.177, 0.104, 0.004],
    [0.355, 0.18, 0.094, 0],
    [0.385, 0.155, 0.08, -0.004],
    [0.41, 0.085, 0.068, -0.006],
    [0.42, 0.06, 0.056, -0.006],
  ];
  const HN2 = 2.2;
  const hoodieFront = surface(HOODIE, HN2);
  const hoodieBody = loft(HOODIE, R(22), HN2);
  const hem = loft(
    [
      [-0.095, 0.152, 0.104, 0],
      [-0.05, 0.155, 0.106, 0],
    ],
    R(22),
    HN2
  );
  const pouch = onBody(
    [
      [-0.088, -0.03],
      [0.088, -0.03],
      [0.068, 0.1],
      [-0.068, 0.1],
    ],
    0.008,
    hoodieFront,
    0.001
  );
  const hoodDown = new THREE.TorusGeometry(0.08, 0.03, R(8), R(16), Math.PI * 1.2)
    .rotateZ(-Math.PI * 0.1)
    .rotateX(Math.PI / 2 + 0.45)
    .rotateZ(Math.PI)
    .translate(0, 0.405, -0.035);
  const strings = [-1, 1].map((s) =>
    tube(
      [
        [s * 0.03, 0.4, hoodieFront(s * 0.03, 0.4) - 0.01],
        [s * 0.032, 0.36, hoodieFront(s * 0.032, 0.36) + 0.006],
        [s * 0.034, 0.3, hoodieFront(s * 0.034, 0.3) + 0.006],
      ],
      0.004,
      R(8),
      4
    )
  );
  const TRACK = grow(HOODIE, 0.96);
  const trackFront = surface(TRACK, HN2);
  const trackBody = loft(TRACK, R(22), HN2);
  const trackCollar = new THREE.CylinderGeometry(0.06, 0.066, 0.05, R(16), 1, true).translate(0, 0.42, -0.004);
  const zip = [
    onBody(
      [
        [-0.005, -0.08],
        [0.005, -0.08],
        [0.005, 0.41],
        [-0.005, 0.41],
      ],
      0.004,
      trackFront,
      0.001
    ),
    new THREE.BoxGeometry(0.018, 0.026, 0.008).translate(0, 0.37, trackFront(0, 0.37) + 0.006),
  ];

  const FATIGUES = grow(SUIT, 1.03);
  const fatiguesFront = surface(FATIGUES, 2.8);
  const fatigues = loft(FATIGUES, R(22), 2.8);
  const VEST: Sec[] = [
    [0.05, 0.155, 0.11, 0],
    [0.2, 0.168, 0.118, 0.006],
    [0.33, 0.184, 0.11, 0.004],
    [0.37, 0.165, 0.094, 0],
    [0.38, 0.12, 0.08, 0],
  ];
  const vestFront = surface(VEST, 3);
  const vest = loft(VEST, R(22), 3);
  const pouches = [-0.09, -0.03, 0.03, 0.09].map((x) => rbox(0.05, 0.06, 0.03, 0.008, x, 0.13, vestFront(x, 0.13) + 0.01));
  const collarFat = new THREE.CylinderGeometry(0.06, 0.066, 0.04, R(16), 1, true).translate(0, 0.415, -0.004);

  /* ----- Neck and back: necklace, headphones, backpack, crossbody, board ----- */
  const necklace = tube(
    [
      [-0.058, 0.415, -0.01],
      [-0.06, 0.38, suitFront(-0.06, 0.38) + 0.01],
      [-0.03, 0.31, suitFront(-0.03, 0.31) + 0.012],
      [0, 0.29, suitFront(0, 0.29) + 0.014],
      [0.03, 0.31, suitFront(0.03, 0.31) + 0.012],
      [0.06, 0.38, suitFront(0.06, 0.38) + 0.01],
      [0.058, 0.415, -0.01],
    ],
    0.007,
    R(24),
    5
  );
  const pendant = new THREE.OctahedronGeometry(0.024).scale(0.9, 1.25, 0.5).translate(0, 0.265, suitFront(0, 0.265) + 0.018);
  const headphones = [
    new THREE.TorusGeometry(0.07, 0.012, R(6), R(16), Math.PI * 1.1)
      .rotateX(Math.PI / 2)
      .rotateY(Math.PI * 0.45)
      .translate(0, 0.43, -0.01),
    ...[-1, 1].map((s) => new THREE.CylinderGeometry(0.03, 0.03, 0.024, R(12)).rotateZ(Math.PI / 2).translate(s * 0.074, 0.425, 0.03)),
  ];
  const BACK = surface(HOODIE, HN2, -1);
  const backpack = [
    rbox(0.21, 0.25, 0.09, 0.03, 0, 0.24, BACK(0, 0.24) - 0.04),
    rbox(0.15, 0.08, 0.03, 0.012, 0, 0.17, BACK(0, 0.17) - 0.09),
    ...[-1, 1].map((s) =>
      tube(
        [
          [s * 0.08, 0.36, BACK(s * 0.08, 0.36) - 0.01],
          [s * 0.085, 0.395, 0],
          [s * 0.085, 0.36, hoodieFront(s * 0.085, 0.36) + 0.005],
          [s * 0.09, 0.22, hoodieFront(s * 0.09, 0.22) + 0.005],
          [s * 0.1, 0.12, hoodieFront(s * 0.1, 0.12)],
        ],
        0.009,
        R(12),
        4
      )
    ),
  ];
  const crossbody = [
    rbox(0.12, 0.09, 0.045, 0.016, 0.105, 0.03, hoodieFront(0.105, 0.03) + 0.022),
    tube(
      [
        [0.1, 0.07, hoodieFront(0.1, 0.07) + 0.01],
        [0.0, 0.2, hoodieFront(0, 0.2) + 0.008],
        [-0.12, 0.36, hoodieFront(-0.12, 0.36) + 0.006],
        [-0.13, 0.4, 0],
        [-0.1, 0.33, BACK(-0.1, 0.33) - 0.006],
        [0.06, 0.12, BACK(0.06, 0.12) - 0.008],
      ],
      0.008,
      R(24),
      4
    ),
  ];
  const deck = new THREE.CapsuleGeometry(0.08, 0.4, 4, R(12)).scale(1, 1, 0.13).translate(0, 0.2, BACK(0, 0.2) - 0.04);
  const trucks = [0.42, 0.0].map((y) => new THREE.BoxGeometry(0.13, 0.018, 0.018).translate(0, y, BACK(0, 0.2) - 0.064));
  const wheels = [0.42, 0.0].flatMap((y) =>
    [-0.065, 0.065].map((x) => new THREE.CylinderGeometry(0.02, 0.02, 0.022, R(10)).rotateZ(Math.PI / 2).translate(x, y, BACK(0, 0.2) - 0.078))
  );

  /* ----- Hips and legs ----- */
  const PELVIS: Sec[] = [
    [-0.1, 0.085, 0.07, 0],
    [-0.07, 0.122, 0.086, 0],
    [0.0, 0.134, 0.09, 0],
    [0.1, 0.126, 0.086, 0],
    [0.15, 0.11, 0.075, 0],
  ];
  const pelvis = loft(PELVIS, R(20), 2.2);
  const THIGH_S: Sec[] = [
    [0.04, 0.066, 0.07, 0],
    [-0.03, 0.066, 0.07, 0],
    [-0.15, 0.058, 0.062, 0.002],
    [-0.26, 0.05, 0.054, 0],
    [-0.3, 0.042, 0.046, 0],
    [-0.318, 0.02, 0.024, 0],
  ];
  const SHIN_S: Sec[] = [
    [0.03, 0.024, 0.026, 0],
    [0.012, 0.046, 0.05, 0],
    [-0.02, 0.049, 0.053, 0],
    [-0.11, 0.05, 0.055, -0.004],
    [-0.21, 0.046, 0.05, 0],
    [-0.27, 0.051, 0.057, 0.004],
    [-0.285, 0.051, 0.057, 0.004],
  ];
  const trouserThigh = loft(THIGH_S, R(16));
  const trouserShin = loft(SHIN_S, R(16));
  const crease =
    q === 2
      ? onBody(
          [
            [-0.002, -0.27],
            [0.002, -0.27],
            [0.002, 0.0],
            [-0.002, 0.0],
          ],
          0.002,
          surface(SHIN_S),
          0.0005
        )
      : null;
  const joggerThigh = loft(grow(THIGH_S, 1.1), R(16));
  const joggerShin = loft(
    [
      [0.03, 0.026, 0.028, 0],
      [0.012, 0.05, 0.054, 0],
      [-0.02, 0.053, 0.057, 0],
      [-0.11, 0.052, 0.056, -0.004],
      [-0.2, 0.043, 0.046, 0],
      [-0.235, 0.039, 0.042, 0],
    ],
    R(16)
  );
  const joggerCuff = loft(
    [
      [-0.258, 0.042, 0.045, 0.002],
      [-0.224, 0.043, 0.046, 0.002],
    ],
    R(16)
  );
  const cargoThigh = loft(grow(THIGH_S, 1.14), R(16));
  const cargoShin = loft(
    [
      [0.03, 0.027, 0.03, 0],
      [0.012, 0.052, 0.056, 0],
      [-0.02, 0.056, 0.06, 0],
      [-0.12, 0.054, 0.058, -0.004],
      [-0.2, 0.05, 0.054, 0],
    ],
    R(16)
  );
  // Cargo pockets on the outside of each thigh
  const cargoPockets = [-1, 1].map((s) => rbox(0.02, 0.07, 0.06, 0.008, s * 0.07, -0.16, 0.004));
  const kneePads = q === 0 ? [] : [rbox(0.06, 0.06, 0.025, 0.01, 0, -0.01, 0.054)];

  /* ----- Arms and hands ----- */
  const UPPER_S: Sec[] = [
    [0.036, 0.02, 0.022, 0],
    [0.024, 0.045, 0.048, 0],
    [0.0, 0.054, 0.056, 0],
    [-0.07, 0.05, 0.052, 0],
    [-0.16, 0.044, 0.046, 0],
    [-0.215, 0.04, 0.042, 0],
    [-0.236, 0.024, 0.026, 0],
  ];
  const FORE_S: Sec[] = [
    [0.03, 0.02, 0.022, 0],
    [0.015, 0.04, 0.042, 0],
    [-0.04, 0.043, 0.045, 0.002],
    [-0.12, 0.039, 0.041, 0],
    [-0.185, 0.036, 0.038, 0],
    [-0.192, 0.034, 0.036, 0],
  ];
  const suitUpper = loft(UPPER_S, R(14));
  const suitFore = loft(FORE_S, R(14));
  const shirtCuff = loft(
    [
      [-0.202, 0.031, 0.033, 0.001],
      [-0.184, 0.033, 0.035, 0.001],
    ],
    R(14)
  );
  const looseUpper = loft(grow(UPPER_S, 1.14), R(14));
  const looseFore = loft(grow(FORE_S, 1.14), R(14));
  const ribCuff = loft(
    [
      [-0.208, 0.033, 0.035, 0.001],
      [-0.18, 0.037, 0.039, 0.001],
    ],
    R(14)
  );
  // Two stripes down the outside of each sleeve and trouser leg (track suits)
  const stripe = (secs: Sec[], s: number, from: number, to: number) => {
    const w = 0.009;
    const pts = sorted(secs).filter(([y]) => y <= from + 1e-6 && y >= to - 1e-6);
    return [-w, w].map((dz) =>
      tube(
        pts.map(([y, hw]): [number, number, number] => [s * (hw + 0.002), y, dz]),
        0.0045,
        pts.length * 2,
        4
      )
    );
  };
  const sleeveStripes = (secs: Sec[]) => [-1, 1].map((s) => mergeGeometries(stripe(grow(secs, 1.14), s, 0.0, -0.2).map(plain))!);
  const upperStripes = sleeveStripes(UPPER_S);
  const foreStripes = sleeveStripes(FORE_S);
  const thighStripes = [-1, 1].map((s) => mergeGeometries(stripe(grow(THIGH_S, 1.1), s, -0.03, -0.3).map(plain))!);
  const shinStripes = [-1, 1].map(
    (s) =>
      mergeGeometries(
        stripe(
          [
            [0.012, 0.05, 0.054, 0],
            [-0.11, 0.052, 0.056, 0],
            [-0.2, 0.043, 0.046, 0],
          ],
          s,
          0.012,
          -0.2
        ).map(plain)
      )!
  );
  // A hand at rest: palm towards the leg, fingers curled, the thumb along the front
  const hand = [
    new THREE.CylinderGeometry(0.026, 0.028, 0.03, R(10)).translate(0, -0.2, 0.004),
    rbox(0.044, 0.072, 0.07, 0.019, 0, -0.236, 0.004),
    rbox(0.046, 0.046, 0.062, 0.019, 0, -0.28, 0.012),
    new THREE.CapsuleGeometry(0.013, 0.03, 2, R(8)).rotateX(-0.45).translate(0, -0.238, 0.045),
  ];

  /* ----- Shoes (in the shin's space: the sole is on the ground at -0.33) ----- */
  const G = -(HIP_Y - THIGH);
  const sneaker = profile(
    [
      [-0.062, G + 0.012],
      [0.15, G + 0.012],
      [0.172, G + 0.03],
      [0.15, G + 0.052],
      [0.08, G + 0.068],
      [0.03, G + 0.098],
      [-0.03, G + 0.1],
      [-0.066, G + 0.06],
    ],
    0.088,
    0.014,
    L(6)
  );
  const sneakerSole = profile(
    [
      [-0.064, G],
      [0.146, G],
      [0.166, G + 0.012],
      [0.158, G + 0.022],
      [-0.066, G + 0.022],
    ],
    0.09,
    0.008,
    L(4)
  );
  const laces = q === 0 ? [] : [0.03, 0.06, 0.09].map((u) => new THREE.BoxGeometry(0.05, 0.005, 0.008).rotateX(0.5).translate(0, G + 0.098 - u * 0.33, 0.035 + u * 0.55));
  const swoop = [-1, 1].map((s) => new THREE.BoxGeometry(0.004, 0.012, 0.11).rotateX(-0.2).translate(s * 0.046, G + 0.05, 0.05));
  const dress = profile(
    [
      [-0.058, G + 0.01],
      [0.15, G + 0.01],
      [0.172, G + 0.03],
      [0.13, G + 0.058],
      [0.05, G + 0.075],
      [-0.035, G + 0.078],
      [-0.062, G + 0.045],
    ],
    0.078,
    0.012,
    L(6)
  );
  const dressSole = profile(
    [
      [-0.062, G],
      [0.152, G],
      [0.176, G + 0.012],
      [0.12, G + 0.013],
      [-0.064, G + 0.012],
    ],
    0.08,
    0.004,
    L(4)
  );
  const boot = profile(
    [
      [-0.064, G + 0.02],
      [0.15, G + 0.02],
      [0.168, G + 0.045],
      [0.11, G + 0.07],
      [0.055, G + 0.1],
      [0.05, G + 0.15],
      [-0.06, G + 0.15],
      [-0.068, G + 0.06],
    ],
    0.094,
    0.014,
    L(6)
  );
  const bootSole = profile(
    [
      [-0.072, G],
      [0.168, G],
      [0.18, G + 0.016],
      [0.175, G + 0.026],
      [-0.074, G + 0.026],
    ],
    0.1,
    0.006,
    L(4)
  );

  /* ----- Held things ----- */
  // In the hand's own space (the socket in the palm)
  const gummy = rbox(0.1, 0.13, 0.04, 0.012, 0, -0.03, 0.04);
  const cup = new THREE.CylinderGeometry(0.034, 0.027, 0.11, R(14)).translate(0, -0.03, 0.05);
  const cupSleeve = new THREE.CylinderGeometry(0.0335, 0.0305, 0.04, R(14)).translate(0, -0.035, 0.05);
  const cupTop = [
    new THREE.SphereGeometry(0.035, R(12), R(6), 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1).translate(0, 0.025, 0.05),
    new THREE.CylinderGeometry(0.004, 0.004, 0.07, 6).rotateZ(0.2).translate(0.006, 0.06, 0.05),
  ];
  const boombox = [rbox(0.085, 0.15, 0.27, 0.018, 0, -0.11, 0.03), new THREE.TorusGeometry(0.06, 0.009, 6, R(12), Math.PI).rotateY(Math.PI / 2).translate(0, -0.035, 0.03)];
  const speakers = [-0.045, 0.045].flatMap((x) => [-0.045, 0.105].map((z) => new THREE.CylinderGeometry(0.046, 0.046, 0.012, R(16)).rotateZ(Math.PI / 2).translate(x, -0.115, z)));
  // The same assault rifle the player carries, held upright on parade
  const rifle = rifleGeometry()
    .rotateX(-Math.PI / 2)
    .translate(0, 0, 0.03);

  const one = (geos: THREE.BufferGeometry[]) => (geos.length === 1 ? geos[0] : mergeGeometries(geos.map(plain))!);
  const all: Item[] = [
    {
      id: 'head',
      when: () => true,
      pieces: [
        P('head', one([skull, nose, ...ears]), BLACK),
        ...(q > 0 ? [P('head', one(folds), BLACK, { detail: true })] : []),
        P('head', eyesSkin, SKIN),
        P('head', one(frames), '#0d0c14'),
        P('head', one(lenses), '#ffffff', { mat: 'lens' }),
      ],
    },
    {
      id: 'chain',
      when: (o) => !!o.chain,
      pieces: [P('head', chain, GOLD, { detail: true })],
    },
    {
      id: 'cap',
      when: (o) => hasCap(o) && !o.capBack,
      pieces: [P('head', one(cap.crown), 'cap'), P('head', one(cap.seams), 'cap', { shade: 0.62, detail: true }), P('head', cap.patch, '#ffffff', { mat: 'patch', detail: true })],
    },
    {
      id: 'capBack',
      when: (o) => hasCap(o) && !!o.capBack,
      pieces: [
        P('head', one(capBack.crown), 'cap'),
        P('head', one(capBack.seams), 'cap', { shade: 0.62, detail: true }),
        P('head', capBack.patch, '#ffffff', { mat: 'patch', detail: true }),
      ],
    },
    {
      id: 'bucket',
      when: (o) => !!o.bucket && bare(o),
      pieces: [P('head', one(bucket), 'bucket'), P('head', bucketBand, BLACK, { detail: true })],
    },
    {
      id: 'crown',
      when: (o) => !!o.crown && bare(o),
      pieces: [P('head', one(crown), GOLD), P('head', crownGem, '#d8312f', { detail: true })],
    },
    {
      id: 'beanie',
      when: (o) => !!o.beanie && bare(o),
      pieces: [P('head', one(beanie), 'beanie'), P('head', beanieCuff, 'beanie', { shade: 0.82 }), P('head', beaniePatch, '#ffffff', { mat: 'patch', detail: true })],
    },
    {
      id: 'hoodUp',
      when: (o) => hoodie(o) && !!o.hood,
      pieces: [P('head', hoodUp, 'top', { mat: 'double' })],
    },
    {
      id: 'helmet',
      when: soldier,
      pieces: [P('head', one(helmet), '#3e4a26')],
    },
    {
      id: 'suit',
      when: suit,
      pieces: [
        P('torso', jacket, 'top'),
        P('torso', one([...lapels, ...flaps]), 'top', { shade: 1.45 }),
        P('torso', one([shirtFront, collarBand, ...collars, pocketSquare]), SHIRT),
        P('torso', button, BLACK, { detail: true }),
        P('torso', one([tieKnot, tieBlade]), 'tie'),
        ...both('arm', suitUpper, 'top'),
        ...both('fore', suitFore, 'top'),
        ...both('fore', shirtCuff, SHIRT, { detail: true }),
      ],
    },
    {
      id: 'hoodie',
      when: hoodie,
      pieces: [
        P('torso', hoodieBody, 'top'),
        P('torso', one([hem, pouch]), 'top', { shade: 0.8 }),
        P('torso', one(strings), SHIRT, { detail: true }),
        ...both('arm', looseUpper, 'top'),
        ...both('fore', looseFore, 'top'),
        ...both('fore', ribCuff, 'top', { shade: 0.8 }),
      ],
    },
    {
      id: 'hoodDown',
      when: (o) => hoodie(o) && !o.hood,
      pieces: [P('torso', hoodDown, 'top')],
    },
    {
      id: 'track',
      when: track,
      pieces: [
        P('torso', one([trackBody, trackCollar]), 'top'),
        P('torso', one(zip), SHIRT, { detail: true }),
        ...both('arm', looseUpper, 'top'),
        ...both('fore', looseFore, 'top'),
        ...both('fore', ribCuff, 'top', { shade: 0.8 }),
        ...both('arm', upperStripes, SHIRT, { detail: true }),
        ...both('fore', foreStripes, SHIRT, { detail: true }),
        ...both('leg', thighStripes, SHIRT, { detail: true }),
        ...both('shin', shinStripes, SHIRT, { detail: true }),
      ],
    },
    {
      id: 'soldier',
      when: soldier,
      pieces: [
        P('torso', one([fatigues, collarFat]), 'top'),
        P('torso', one([vest, ...pouches]), '#3a4422'),
        ...both('arm', looseUpper, 'top'),
        ...both('fore', looseFore, 'top'),
        ...both('fore', one(hand), '#2b2a33'),
        P('pelvis', pelvis, 'bottom'),
        ...both('leg', cargoThigh, 'bottom'),
        ...both('leg', cargoPockets, 'bottom', { shade: 0.82, detail: true }),
        ...both('shin', cargoShin, 'bottom'),
        ...(kneePads.length ? both('shin', one(kneePads), '#3a4422', { detail: true }) : []),
        ...both('shin', boot, 'shoes'),
        ...both('shin', bootSole, '#14121a'),
      ],
    },
    // Hands, trousers and shoes for everyone but soldiers
    {
      id: 'hands',
      when: (o) => !soldier(o),
      pieces: both('fore', one(hand), SKIN),
    },
    {
      id: 'trousers',
      when: suit,
      pieces: [
        P('pelvis', pelvis, 'bottom'),
        ...both('leg', trouserThigh, 'bottom'),
        ...both('shin', trouserShin, 'bottom'),
        ...(crease ? both('shin', crease, 'bottom', { shade: 0.75, detail: true }) : []),
        ...both('shin', dress, 'shoes'),
        ...both('shin', dressSole, '#14121a'),
      ],
    },
    {
      id: 'joggers',
      when: casual,
      pieces: [
        P('pelvis', pelvis, 'bottom'),
        ...both('leg', joggerThigh, 'bottom'),
        ...both('shin', joggerShin, 'bottom'),
        ...both('shin', joggerCuff, 'bottom', { shade: 0.8 }),
        ...both('shin', sneaker, 'shoes'),
        ...both('shin', sneakerSole, SHIRT),
        ...(laces.length ? both('shin', one(laces), SHIRT, { detail: true }) : []),
        ...both('shin', one(swoop), 'shoes', { shade: 0.6, detail: true }),
      ],
    },
    {
      id: 'necklace',
      when: (o) => !!o.necklace,
      pieces: [P('torso', necklace, GOLD), P('torso', pendant, '#9ff8ff')],
    },
    {
      id: 'headphones',
      when: (o) => !!o.headphones,
      pieces: [P('torso', one(headphones), 'headphones', { detail: true })],
    },
    {
      id: 'backpack',
      when: (o) => !!o.backpack,
      pieces: [P('torso', one(backpack), 'backpack')],
    },
    {
      id: 'crossbody',
      when: (o) => !!o.crossbody,
      pieces: [P('torso', one(crossbody), 'crossbody')],
    },
    {
      id: 'board',
      when: (o) => !!o.board,
      pieces: [P('torso', deck, 'board'), P('torso', one(trucks), '#8b889c', { detail: true }), P('torso', one(wheels), WHITE, { detail: true })],
    },
    {
      id: 'rifleL',
      when: (o) => o.rifle === 'left',
      pieces: [P('handL', rifle, '#2b2a33')],
    },
    {
      id: 'rifleR',
      when: (o) => o.rifle === 'right',
      pieces: [P('handR', rifle, '#2b2a33')],
    },
    {
      id: 'gummy',
      held: true,
      when: (o) => o.held === 'gummy',
      pieces: [P('handR', gummy, '#ffffff', { mat: 'gummy' })],
    },
    {
      id: 'coffee',
      held: true,
      when: (o) => o.held === 'coffee',
      pieces: [P('handR', cup, WHITE), P('handR', cupSleeve, '#ff6ad5'), P('handR', one(cupTop), WHITE)],
    },
    {
      id: 'boombox',
      held: true,
      when: (o) => o.held === 'boombox',
      pieces: [P('handR', one(boombox), '#2b2a33'), P('handR', one(speakers), '#00d8ff')],
    },
  ];
  itemsCache[q] = all;
  return all;
}

const tmp = new THREE.Color();
/** A piece's colour on an outfit */
function colorOf(p: Piece, o: Outfit, out = new THREE.Color()) {
  if (p.color.startsWith('#')) return out.set(p.color);
  out.set((o[p.color as ColorKey] as string | undefined) ?? '#ff00ff');
  return p.shade ? out.multiplyScalar(p.shade) : out;
}

/* ---------- Materials ---------- */

let plainMat: THREE.Material | null = null;
let doubleMat: THREE.Material | null = null;
function textures() {
  texCache.patch ??= canvasTex(128, 84, (c) => {
    c.fillStyle = '#dedce8';
    c.fillRect(0, 0, 128, 84);
    c.fillStyle = '#16c7b5';
    c.beginPath();
    c.moveTo(42, 22);
    c.lineTo(86, 22);
    c.lineTo(100, 36);
    c.lineTo(64, 72);
    c.lineTo(28, 36);
    c.closePath();
    c.fill();
    c.strokeStyle = '#0a5c56';
    c.lineWidth = 4;
    c.stroke();
    c.beginPath();
    c.moveTo(28, 36);
    c.lineTo(100, 36);
    c.moveTo(52, 22);
    c.lineTo(64, 72);
    c.lineTo(76, 22);
    c.stroke();
  });
  texCache.gummy ??= canvasTex(128, 160, (c) => {
    c.fillStyle = '#d8312f';
    c.fillRect(0, 0, 128, 160);
    c.fillStyle = '#c99a4a';
    c.fillRect(0, 0, 128, 22);
    c.font = '900 34px Impact, "Arial Narrow", sans-serif';
    c.textAlign = 'center';
    c.fillStyle = '#ffffff';
    c.fillText('GAS FEE', 64, 82);
    c.font = '900 22px Impact, "Arial Narrow", sans-serif';
    c.fillText('GUMMY BEARS', 64, 112);
  });
  return texCache as Required<typeof texCache>;
}
/** The material for a piece: plain pieces are coloured per vertex (and per instance in a crowd) */
function material(m: Mat | undefined, o?: Outfit): THREE.Material {
  if (m === 'lens') {
    const c = new THREE.Color(o?.lens ?? '#22d07a');
    return lit(
      new THREE.MeshToonMaterial({
        color: c.clone().multiplyScalar(0.42),
        emissive: c,
      }),
      0.12,
      0.7
    );
  }
  if (m === 'patch') return new THREE.MeshToonMaterial({ map: textures().patch });
  if (m === 'gummy') return new THREE.MeshToonMaterial({ map: textures().gummy });
  if (m === 'double')
    return (doubleMat ??= toon('#ffffff', {
      side: THREE.DoubleSide,
      vertexColors: true,
    }));
  return (plainMat ??= toon('#ffffff', { vertexColors: true }));
}

/* ---------- One figure ---------- */

export interface Degen {
  g: THREE.Object3D;
  pose: Pose;
  /** Apply `pose` to the figure */
  update(): void;
  hands: [THREE.Object3D, THREE.Object3D];
  /** The chest, for things carried at the shoulder (the rifle) */
  torso: THREE.Object3D;
  /** What he holds in his right hand, if anything (put away while he holds the rifle) */
  held?: THREE.Object3D;
}

/**
 * One figure, in full detail: everything worn on a joint is one mesh
 * coloured per vertex, plus the lenses, patches and printed bag, so a
 * figure is about 15 draw calls whatever he wears.
 */
export function createDegen(o: Outfit = PLAYER, q: Detail = 2): Degen {
  const rig = makeRig();
  let held: THREE.Group | undefined;
  const buckets = new Map<
    string,
    {
      joint: Joint;
      held: boolean;
      mat?: Mat;
      list: { geo: THREE.BufferGeometry; color: THREE.Color }[];
    }
  >();
  for (const it of items(q)) {
    if (!it.when(o)) continue;
    for (const p of it.pieces) {
      const key = `${p.joint}|${it.held ? 1 : 0}|${p.mat ?? ''}`;
      if (!buckets.has(key))
        buckets.set(key, {
          joint: p.joint,
          held: !!it.held,
          mat: p.mat,
          list: [],
        });
      buckets.get(key)!.list.push({ geo: p.geo, color: colorOf(p, o) });
    }
  }
  for (const b of buckets.values()) {
    const mesh = new THREE.Mesh(paintMerge(b.list), material(b.mat, o));
    mesh.castShadow = true;
    if (b.held) {
      if (!held) rig.j[b.joint].add((held = new THREE.Group()));
      held.add(mesh);
    } else rig.j[b.joint].add(mesh);
  }
  const pose = newPose();
  applyPose(rig, pose);
  return {
    g: rig.root,
    pose,
    update: () => applyPose(rig, pose),
    hands: [rig.j.handL, rig.j.handR],
    torso: rig.j.torso,
    held,
  };
}

/* ---------- A crowd ---------- */

export interface Crowd {
  /** Pose figure `i` standing at (x, y, z) facing `yaw` (0 = +z) */
  set(i: number, x: number, y: number, z: number, yaw: number, scale: number, pose: Pose): void;
  /** Call once a frame after setting everyone */
  commit(): void;
  meshes: THREE.InstancedMesh[];
}

/** Merged pieces shared between crowds (and between left and right limbs) */
const crowdGeo = new Map<string, THREE.BufferGeometry>();

/**
 * Many figures as instanced pieces. An item's pieces on one joint merge into
 * one geometry per outfit colour (lapels are the jacket's colour, shaded per
 * vertex), left and right limbs share it, and each figure only takes
 * instances of what it wears, so a crowd costs a draw call per kind of
 * piece and nothing for clothes nobody has on.
 */
export function createCrowd(parent: THREE.Object3D, outfits: Outfit[], opts: { light?: boolean } = {}): Crowd {
  const q: Detail = opts.light ? 0 : 1;
  const rig = makeRig();
  // Groups: one instanced mesh per merged geometry, colour key and material
  const groups = new Map<
    string,
    {
      geo: THREE.BufferGeometry;
      key: string;
      mat?: Mat;
      uses: { joint: Joint; item: Item }[];
    }
  >();
  for (const it of items(q)) {
    if (!outfits.some(it.when)) continue;
    const sub = new Map<string, Piece[]>();
    for (const p of it.pieces) {
      if (q === 0 && p.detail) continue;
      const k = `${p.joint}|${p.color.startsWith('#') ? '#' : p.color}|${p.mat ?? ''}`;
      if (!sub.has(k)) sub.set(k, []);
      sub.get(k)!.push(p);
    }
    for (const list of sub.values()) {
      const fixed = list[0].color.startsWith('#');
      const id = `${q}|` + list.map((p) => `${p.geo.uuid}:${fixed ? p.color : (p.shade ?? 1)}`).join(',');
      let geo = crowdGeo.get(id);
      if (!geo) {
        geo = paintMerge(
          list.map((p) => ({
            geo: p.geo,
            color: fixed ? new THREE.Color(p.color) : new THREE.Color().setScalar(p.shade ?? 1),
          }))
        );
        crowdGeo.set(id, geo);
      }
      const gk = `${geo.uuid}|${fixed ? '#' : list[0].color}|${list[0].mat ?? ''}`;
      if (!groups.has(gk))
        groups.set(gk, {
          geo,
          key: fixed ? '#' : list[0].color,
          mat: list[0].mat,
          uses: [],
        });
      groups.get(gk)!.uses.push({ joint: list[0].joint, item: it });
    }
  }
  // Each figure's instances: [mesh, instance, joint]
  const slots: [THREE.InstancedMesh, number, Joint][][] = outfits.map(() => []);
  const meshes: THREE.InstancedMesh[] = [];
  for (const g of groups.values()) {
    let count = 0;
    outfits.forEach((o) => g.uses.forEach((u) => (count += u.item.when(o) ? 1 : 0)));
    if (!count) continue;
    const m = new THREE.InstancedMesh(g.geo, material(g.mat), count);
    m.castShadow = true;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    let k = 0;
    outfits.forEach((o, i) =>
      g.uses.forEach((u) => {
        if (!u.item.when(o)) return;
        m.setColorAt(k, g.key === '#' || g.mat === 'lens' ? tmp.set('#ffffff') : tmp.set((o[g.key as ColorKey] as string | undefined) ?? '#ff00ff'));
        slots[i].push([m, k++, u.joint]);
      })
    );
    parent.add(m);
    meshes.push(m);
  }
  return {
    meshes,
    set(i, x, y, z, yaw, scale, pose) {
      const o = outfits[i];
      rig.root.position.set(x, y, z);
      rig.root.rotation.set(0, yaw, 0);
      rig.root.scale.set(scale * (o.build ?? 1), scale * (o.height ?? 1), scale * (o.build ?? 1));
      applyPose(rig, pose);
      rig.root.updateMatrixWorld(true);
      for (const [m, k, j] of slots[i]) m.setMatrixAt(k, rig.j[j].matrixWorld);
    },
    commit() {
      for (const m of meshes) m.instanceMatrix.needsUpdate = true;
    },
  };
}

/* ---------- A varied city crowd ---------- */

/** Suits and hoodies in a spread of colours, some with bags or headphones. */
export function cityOutfit(r: () => number): Outfit {
  const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
  const extras = {
    backpack: r() < 0.2 ? pick(['#14121f', '#2a2350', '#d8312f', '#1f9d6a', '#f3f2f7']) : undefined,
    crossbody: r() < 0.15 ? pick(['#14121f', '#8f3dff', '#c99a4a']) : undefined,
    headphones: r() < 0.22 ? pick(['#14121f', '#f3f2f7', '#ff6ad5', '#00b8d8']) : undefined,
    build: 0.92 + r() * 0.2,
    height: 0.95 + r() * 0.1,
  };
  if (r() < 0.55) {
    const top = pick(['#16141f', '#16141f', '#16141f', '#1d2550', '#3b2a6a', '#f3f2f7', '#4a4a5a']);
    return {
      kind: 'suit',
      top,
      bottom: top === '#f3f2f7' && r() < 0.5 ? '#16141f' : top,
      shoes: pick(['#1b1830', '#3a2418', '#16141f']),
      tie: pick(['#1f9d55', '#1f9d55', '#e219e5', '#00b8d8', '#d8312f', '#c99a4a']),
      cap: r() < 0.85 ? pick(['#d8312f', '#d8312f', '#d8312f', '#16141f', '#f3f2f7']) : undefined,
      chain: r() < 0.3,
      ...extras,
      backpack: undefined,
    };
  }
  const hood = r() < 0.4;
  return {
    kind: 'hoodie',
    top: pick(['#16141f', '#2a2350', '#e219e5', '#00a8d8', '#f3f2f7', '#ff6a3d', '#1f9d6a', '#8f3dff']),
    bottom: pick(['#3a3a48', '#16141f', '#4a4a5a']),
    shoes: pick(['#f3f2f7', '#f3f2f7', '#16141f', '#ff6ad5', '#00b8d8']),
    hood,
    cap: hood ? undefined : r() < 0.7 ? pick(['#d8312f', '#16141f', '#f3f2f7', '#d8312f']) : undefined,
    ...extras,
  };
}
